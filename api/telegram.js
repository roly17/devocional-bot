import { GoogleGenAI } from "@google/genai";
import { Redis } from "@upstash/redis";

export const maxDuration = 60; 

const redis = Redis.fromEnv();
const TG_DOMAIN = "api.telegram.org";
const TG_BASE = "https://" + TG_DOMAIN + "/bot";

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function responderTelegram(chatId, htmlText, token) {
  if (!chatId || !token) return;
  const url = TG_BASE + token + "/sendMessage";
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: "HTML"
      }),
    });
  } catch (e) {
    console.error("Error enviando mensaje a Telegram:", e);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("Bot activo y listo.");
  }

  const token = (process.env.BOT_TOKEN || "").trim();
  const update = req.body || {};

  // --- SISTEMA ANTI-DUPLICADOS ---
  // Telegram a veces reenvía el mismo evento si demoramos en responder.
  if (update.update_id) {
    const isDuplicate = await redis.get(`update_${update.update_id}`);
    if (isDuplicate) {
      // Si ya vimos este update_id, respondemos "OK" a Telegram para que deje de molestar y detenemos el código.
      return res.status(200).send("OK");
    }
    // Guardamos el update_id en Redis por 10 minutos (600 segundos)
    await redis.set(`update_${update.update_id}`, "procesado", { ex: 600 });
  }

  // 1. MANEJO DE BOTONES (Callback Queries)
  if (update.callback_query) {
    const callbackId = update.callback_query.id;
    const data = update.callback_query.data;
    const chatId = update.callback_query.message?.chat?.id;

    if (token) {
      const cbUrl = TG_BASE + token + "/answerCallbackQuery";
      await fetch(cbUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackId, text: "Procesando..." }),
      });

      if (data.startsWith("confirmar:")) {
        const draftId = data.replace("confirmar:", "");
        const rawDraft = await redis.get(draftId);

        if (!rawDraft) {
          await responderTelegram(chatId, "⚠️ <b>El borrador ya no existe o ha expirado.</b>", token);
          return res.status(200).send("OK");
        }

        const contenido = typeof rawDraft === "string" ? JSON.parse(rawDraft) : rawDraft;
        const fbPageId = (process.env.FB_PAGE_ID || "").trim();
        const fbToken = (process.env.FB_PAGE_ACCESS_TOKEN || "").trim();

        if (!fbPageId || !fbToken) {
          await responderTelegram(chatId, "🚨 <b>Error:</b> Faltan las variables <code>FB_PAGE_ID</code> o <code>FB_PAGE_ACCESS_TOKEN</code>.", token);
          return res.status(200).send("OK");
        }

        await responderTelegram(chatId, "🚀 <b>Publicando en Facebook...</b>", token);

        try {
          const host = req.headers.host || "devocional-bot-eosin.vercel.app";
          const protocol = req.headers['x-forwarded-proto'] || 'https';
          const imageUrl = `${protocol}://${host}/api/og?titulo=${encodeURIComponent(contenido.titulo)}&versiculo=${encodeURIComponent(contenido.versiculo)}`;

          const fbUrl = `https://graph.facebook.com/v20.0/${fbPageId}/photos`;
          const fbRes = await fetch(fbUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: imageUrl,
              caption: contenido.copy,
              access_token: fbToken
            }),
          });

          const fbData = await fbRes.json();

          if (fbData.id || fbData.post_id) {
            await redis.del(draftId);
            const postId = fbData.post_id || fbData.id;
            await responderTelegram(chatId, `🎉 <b>¡PUBLICACIÓN EXITOSA!</b>\n\n🆔 <b>Post ID:</b> <code>${postId}</code>`, token);
          } else {
            const fbError = fbData.error ? fbData.error.message : "Error desconocido";
            await responderTelegram(chatId, `🚨 <b>Error de Facebook:</b>\n<code>${escapeHtml(fbError)}</code>`, token);
          }
        } catch (fbErr) {
          await responderTelegram(chatId, `🚨 <b>Error de red al conectar con Facebook:</b>\n<code>${escapeHtml(fbErr.message)}</code>`, token);
        }

      } else if (data.startsWith("cancelar:")) {
        const draftId = data.replace("cancelar:", "");
        await redis.del(draftId);
        await responderTelegram(chatId, "🗑️ <b>Publicación cancelada.</b>", token);
      }
    }
    return res.status(200).send("OK");
  }

  // 2. RECEPCIÓN DE NUEVO DEVOCIONAL
  const text = update.message?.text;
  const chatId = update.message?.chat?.id;

  if (!chatId || !text || !token) return res.status(200).send("OK");

  try {
    await responderTelegram(chatId, "⏳ <b>Procesando tu devocional con Gemini...</b>", token);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Eres el community manager experto de la iglesia cristiana MMM Las Palmas. A partir del siguiente devocional diario, genera un JSON con exactamente estas claves:

- "titulo": título corto y llamativo (máx 6 palabras).
- "versiculo": la cita bíblica principal del texto. OBLIGATORIO: Extraída textualmente de la Biblia versión Reina Valera 1960 (RVR1960).
- "copy": texto para el post de Facebook (3-4 líneas, tono cálido).
Al final del copy, debes incluir EXACTAMENTE 3 hashtags en este orden:
1. Un hashtag sobre el tema principal del devocional (ej. #Fe, #Esperanza).
2. #MMMLasPalmas
3. #MMM

DEVOCIONAL:
"""${text}"""`;

    // --- SISTEMA DE REINTENTOS PARA GEMINI (Evitar Error 503) ---
    let raw = "";
    let intentos = 3;
    let exito = false;
    let ultimoError = null;

    for (let i = 0; i < intentos; i++) {
      try {
        const interaction = await ai.interactions.create({
          model: "gemini-3.8-flash",
          input: prompt,
          response_format: {
            type: "text",
            mime_type: "application/json"
          }
        });
        
        raw = interaction.output_text.trim();
        exito = true;
        break; // Si la petición fue exitosa, rompemos el bucle
      } catch (err) {
        ultimoError = err;
        // Si el error contiene "503", esperamos 2.5 segundos y volvemos a intentar
        if (err.message && err.message.includes("503")) {
          console.warn(`[Intento ${i + 1}] Error 503 de Gemini. Esperando 2.5s para reintentar...`);
          await new Promise(resolve => setTimeout(resolve, 2500));
        } else {
          // Si es otro tipo de error (ej. clave inválida, modelo no encontrado), no reintentamos
          break;
        }
      }
    }

    if (!exito) {
      throw ultimoError; // Lanzamos el error final si fallaron los 3 intentos
    }

    // Limpiamos el texto por si Gemini devolvió el JSON envuelto en Markdown
    raw = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    const contenido = JSON.parse(raw);

    const draftId = "draft_" + Date.now();
    await redis.set(draftId, JSON.stringify(contenido), { ex: 3600 });

    const host = req.headers.host || "devocional-bot-eosin.vercel.app";
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const imageUrl = `${protocol}://${host}/api/og?titulo=${encodeURIComponent(contenido.titulo)}&versiculo=${encodeURIComponent(contenido.versiculo)}`;

    const sendPhotoUrl = TG_BASE + token + "/sendPhoto";
    const captionText = `📌 <b>BORRADOR DE PUBLICACIÓN</b>\n\n✍️ <b>Texto para Facebook:</b>\n${escapeHtml(contenido.copy)}\n\n💾 <i>ID: ${escapeHtml(draftId)}</i>`;

    const resTelegram = await fetch(sendPhotoUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: imageUrl,
        caption: captionText,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Publicar en Facebook", callback_data: "confirmar:" + draftId },
              { text: "❌ Cancelar", callback_data: "cancelar:" + draftId }
            ]
          ]
        }
      }),
    });

    const dataTelegram = await resTelegram.json();

    if (!dataTelegram.ok) {
      const fallbackMsg = `⚠️ <b>No se pudo adjuntar la foto.</b> (${escapeHtml(dataTelegram.description)})\n\n📌 <b>${escapeHtml(contenido.titulo)}</b>\n📖 "${escapeHtml(contenido.versiculo)}"\n\n✍️ ${escapeHtml(contenido.copy)}\n\n🖼️ <a href="${imageUrl}">Abre tu imagen generada aquí</a>`;
      await responderTelegram(chatId, fallbackMsg, token);
    }

  } catch (err) {
    console.error("❌ Error en el proceso:", err);
    await responderTelegram(chatId, `🚨 <b>Error en el servidor:</b>\n<code>${escapeHtml(err.message)}</code>`, token);
  }

  return res.status(200).send("OK");
}
