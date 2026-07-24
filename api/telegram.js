import { GoogleGenAI } from "@google/genai";
import { Redis } from "@upstash/redis";

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

  // 1. MANEJO DE BOTONES (Callback Queries)
  if (update.callback_query) {
    const callbackId = update.callback_query.id;
    const data = update.callback_query.data;
    const chatId = update.callback_query.message?.chat?.id;

    if (token) {
      // Quitar el spinner de carga del botón en Telegram
      const cbUrl = TG_BASE + token + "/answerCallbackQuery";
      await fetch(cbUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackId, text: "Procesando..." }),
      });

      // ACCIÓN: CONFIRMAR PUBLICACIÓN EN FACEBOOK
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
          await responderTelegram(chatId, "🚨 <b>Error:</b> Faltan las variables <code>FB_PAGE_ID</code> o <code>FB_PAGE_ACCESS_TOKEN</code> en Vercel.", token);
          return res.status(200).send("OK");
        }

        await responderTelegram(chatId, "🚀 <b>Publicando en la página de Facebook de MMM Las Palmas...</b>", token);

        const host = req.headers.host || "devocional-bot-eosin.vercel.app";
        const imageUrl = "https://" + host + "/api/og?titulo=" + encodeURIComponent(contenido.titulo) + "&versiculo=" + encodeURIComponent(contenido.versiculo);

        // Llamada a la Graph API de Meta
        const fbUrl = "https://graph.facebook.com/v20.0/" + fbPageId + "/photos";
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
          // Eliminar el borrador de Redis tras publicar con éxito
          await redis.del(draftId);
          const postId = fbData.post_id || fbData.id;
          await responderTelegram(chatId, "🎉 <b>¡PUBLICACIÓN EXITOSA!</b>\n\nEl devocional ya está visible en la página de Facebook.\n🆔 <b>Post ID:</b> <code>" + postId + "</code>", token);
        } else {
          const fbError = fbData.error ? fbData.error.message : "Error desconocido";
          await responderTelegram(chatId, "🚨 <b>Error al publicar en Facebook:</b>\n<code>" + escapeHtml(fbError) + "</code>", token);
        }

      // ACCIÓN: CANCELAR
      } else if (data.startsWith("cancelar:")) {
        const draftId = data.replace("cancelar:", "");
        await redis.del(draftId);
        await responderTelegram(chatId, "🗑️ <b>Publicación cancelada.</b> El borrador ha sido eliminado.", token);
      }
    }
    return res.status(200).send("OK");
  }

  // 2. RECEPCIÓN DE NUEVO DEVOCIONAL
  const text = update.message?.text;
  const chatId = update.message?.chat?.id;

  if (!chatId) return res.status(200).send("OK");

  if (!text) {
    await responderTelegram(chatId, "📌 Por favor envíame el <b>texto</b> de un devocional diario para procesarlo.", token);
    return res.status(200).send("OK");
  }

  if (!token) return res.status(200).send("OK");

  try {
    await responderTelegram(chatId, "⏳ <b>Procesando tu devocional con Inteligencia Artificial...</b>", token);

    const ai = new GoogleGenAI({});
    const prompt = 'Eres el community manager experto de la iglesia cristiana MMM Las Palmas. A partir del siguiente devocional diario, genera un JSON con exactamente estas claves:\n\n' +
      '- "titulo": título corto y llamativo (máx 6 palabras).\n' +
      '- "versiculo": la cita bíblica principal del texto. OBLIGATORIO: La cita debe ser extraída EXACTAMENTE y textualmente de la Biblia versión Reina Valera 1960 (RVR1960).\n' +
      '- "copy": texto para el post de Facebook (3-4 líneas, tono cálido, que invite a leer y reflexionar).\n' +
      'Al final del copy, debes incluir EXACTAMENTE 3 hashtags en este orden:\n' +
      '1. Un hashtag sobre el tema principal del devocional (ej. #Fe, #Esperanza).\n' +
      '2. #MMMLasPalmas\n' +
      '3. #MMM\n\n' +
      'DEVOCIONAL:\n"""' + text + '"""';

    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json"
      }
    });

    let raw = interaction.output_text.trim();
    raw = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    const contenido = JSON.parse(raw);

    const draftId = "draft_" + Date.now();
    await redis.set(draftId, JSON.stringify(contenido), { ex: 3600 });

    const host = req.headers.host || "devocional-bot-eosin.vercel.app";
    const imageUrl = "https://" + host + "/api/og?titulo=" + encodeURIComponent(contenido.titulo) + "&versiculo=" + encodeURIComponent(contenido.versiculo);

    const sendPhotoUrl = TG_BASE + token + "/sendPhoto";
    const captionText = "📌 <b>BORRADOR DE PUBLICACIÓN</b>\n\n" +
      "✍️ <b>Texto para Facebook:</b>\n" + escapeHtml(contenido.copy) + "\n\n" +
      "💾 <i>ID: " + escapeHtml(draftId) + "</i>";

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
      const fallbackMsg = "⚠️ <b>No se pudo adjuntar la foto directamente.</b> (" + escapeHtml(dataTelegram.description) + ")\n\n" +
        "📌 <b>" + escapeHtml(contenido.titulo) + "</b>\n📖 \"" + escapeHtml(contenido.versiculo) + "\"\n\n✍️ " + escapeHtml(contenido.copy) + "\n\n" +
        "🖼️ <a href=\"" + imageUrl + "\">Abre tu imagen generada aquí</a>";
      
      await responderTelegram(chatId, fallbackMsg, token);
    }

  } catch (err) {
    console.error("❌ Error en el proceso:", err);
    await responderTelegram(chatId, "🚨 <b>Error en el servidor:</b>\n<code>" + escapeHtml(err.message) + "</code>", token);
  }

  return res.status(200).send("OK");
}
