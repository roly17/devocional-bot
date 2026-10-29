import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "fs";
import { join } from "path";
import { GoogleGenAI } from "@google/genai";
import { Redis } from "@upstash/redis";

export const maxDuration = 60;

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const TG_DOMAIN = "api.telegram.org";
const TG_BASE = "https://" + TG_DOMAIN + "/bot";
const PROJECT_DOMAIN = "devocional-bot-eosin.vercel.app";

let cachedFonts = null;

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function withTimeout(promise, ms, etapa) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Tiempo agotado (${ms / 1000}s) en: ${etapa}`)), ms)
    ),
  ]);
}

async function responderTelegram(chatId, htmlText, token) {
  if (!chatId || !token) return;
  try {
    await fetch(TG_BASE + token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: htmlText, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    console.error("Error enviando mensaje a Telegram:", e);
  }
}

async function obtenerFuentes() {
  if (cachedFonts) return cachedFonts;
  const [reg, bold, italic] = await Promise.all([
    fetch("https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-400-normal.woff", { signal: AbortSignal.timeout(8000) }).then((r) => r.arrayBuffer()),
    fetch("https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-700-normal.woff", { signal: AbortSignal.timeout(8000) }).then((r) => r.arrayBuffer()),
    fetch("https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-500-italic.woff", { signal: AbortSignal.timeout(8000) }).then((r) => r.arrayBuffer()),
  ]);
  cachedFonts = [
    { name: "Roboto", data: reg, weight: 400, style: "normal" },
    { name: "Roboto", data: bold, weight: 700, style: "normal" },
    { name: "Roboto", data: italic, weight: 500, style: "italic" },
  ];
  return cachedFonts;
}

async function cargarImagenBase64(nombreArchivo, host) {
  try {
    const filePath = join(process.cwd(), "public", nombreArchivo);
    return `data:image/png;base64,${readFileSync(filePath).toString("base64")}`;
  } catch {
    const res = await fetch(`https://${host}/${nombreArchivo}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`No se pudo cargar ${nombreArchivo} (HTTP ${res.status})`);
    const arrayBuffer = await res.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`;
  }
}

async function crearImagenLocal(titulo, versiculo, host) {
  const [fonts, bgBase64, logoBase64] = await Promise.all([
    obtenerFuentes(),
    cargarImagenBase64("fondo.png", host),
    cargarImagenBase64("logo.png", host),
  ]);

  const element = {
    type: "div",
    props: {
      style: {
        height: "1080px",
        width: "1080px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "60px 50px",
        fontFamily: "Roboto",
        position: "relative",
        boxSizing: "border-box",
      },
      children: [
        {
          type: "img",
          props: {
            src: bgBase64,
            width: 1080,
            height: 1080,
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: "1080px",
              height: "1080px",
              objectFit: "cover",
            },
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", width: "100%", justifyContent: "flex-start", alignItems: "center" },
            children: [
              {
                type: "img",
                props: { src: logoBase64, width: 140, height: 140, style: { width: "140px", height: "140px", objectFit: "contain" } },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              width: "90%",
              padding: "35px 30px",
              borderRadius: "24px",
              backgroundColor: "rgba(0, 0, 0, 0.55)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
            },
            children: [
              {
                type: "h1",
                props: {
                  style: {
                    fontSize: "48px",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    margin: "0 0 18px 0",
                    textTransform: "uppercase",
                    textShadow: "0px 4px 10px rgba(0, 0, 0, 0.9)",
                  },
                  children: titulo,
                },
              },
              versiculo
                ? {
                    type: "p",
                    props: {
                      style: {
                        fontSize: "28px",
                        fontWeight: 500,
                        color: "#F0F0F0",
                        fontStyle: "italic",
                        margin: "0",
                        lineHeight: "1.4",
                        textShadow: "0px 2px 8px rgba(0, 0, 0, 0.9)",
                      },
                      children: `"${versiculo}"`,
                    },
                  }
                : null,
            ].filter(Boolean),
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", width: "100%", justifyContent: "flex-end", alignItems: "center" },
            children: [
              {
                type: "span",
                props: {
                  style: {
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    letterSpacing: "2px",
                    textShadow: "0px 3px 8px rgba(0, 0, 0, 0.9)",
                  },
                  children: "MMM LAS PALMAS",
                },
              },
            ],
          },
        },
      ],
    },
  };

  const svg = await satori(element, { width: 1080, height: 1080, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1080 } });
  const pngBuffer = resvg.render().asPng();
  return new Blob([pngBuffer], { type: "image/png" });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("Bot activo y listo.");

  const token = (process.env.BOT_TOKEN || "").trim();
  const update = req.body || {};
  const host = req.headers["x-forwarded-host"] || req.headers.host || PROJECT_DOMAIN;

  // ANTI-DUPLICADOS
  if (update.update_id) {
    try {
      const isDuplicate = await withTimeout(redis.get(`update_${update.update_id}`), 5000, "Redis GET");
      if (isDuplicate) return res.status(200).send("OK");
      await withTimeout(redis.set(`update_${update.update_id}`, "procesado", { ex: 600 }), 5000, "Redis SET");
    } catch (e) {
      console.warn("Advertencia Redis:", e.message);
    }
  }

  // 1. MANEJO DE BOTONES (Publicar en FB / Cancelar)
  if (update.callback_query) {
    const callbackId = update.callback_query.id;
    const data = update.callback_query.data;
    const chatId = update.callback_query.message?.chat?.id;

    if (token) {
      await fetch(TG_BASE + token + "/answerCallbackQuery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackId, text: "Procesando..." }),
      });

      if (data.startsWith("confirmar:")) {
        const draftId = data.replace("confirmar:", "");
        const rawDraft = await redis.get(draftId);

        if (!rawDraft) {
          await responderTelegram(chatId, "⚠️ <b>El borrador expiró o ya fue publicado.</b>", token);
          return res.status(200).send("OK");
        }

        const contenido = typeof rawDraft === "string" ? JSON.parse(rawDraft) : rawDraft;
        const fbPageId = (process.env.FB_PAGE_ID || "").trim();
        const fbToken = (process.env.FB_PAGE_ACCESS_TOKEN || "").trim();

        if (!fbPageId || !fbToken) {
          await responderTelegram(chatId, "🚨 Faltan variables de Facebook en Vercel.", token);
          return res.status(200).send("OK");
        }

        await responderTelegram(chatId, "🚀 <b>Publicando en Facebook...</b>", token);

        try {
          const imgBlob = await withTimeout(crearImagenLocal(contenido.titulo, contenido.versiculo, host), 15000, "Dibujado FB");

          const fbForm = new FormData();
          fbForm.append("access_token", fbToken);
          fbForm.append("caption", contenido.copy);
          fbForm.append("source", imgBlob, "devocional.png");

          const fbRes = await fetch(`https://graph.facebook.com/v20.0/${fbPageId}/photos`, {
            method: "POST",
            body: fbForm,
            signal: AbortSignal.timeout(20000),
          });

          const fbData = await fbRes.json();
          if (fbData.id || fbData.post_id) {
            await redis.del(draftId);
            await responderTelegram(chatId, `🎉 <b>¡PUBLICACIÓN EXITOSA!</b>\n\n🆔 <b>Post ID:</b> <code>${fbData.post_id || fbData.id}</code>`, token);
          } else {
            await responderTelegram(chatId, `🚨 <b>Error de Facebook:</b>\n<code>${escapeHtml(fbData.error?.message)}</code>`, token);
          }
        } catch (fbErr) {
          await responderTelegram(chatId, `🚨 <b>Error al publicar en Facebook:</b>\n<code>${escapeHtml(fbErr.message)}</code>`, token);
        }
      } else if (data.startsWith("cancelar:")) {
        await redis.del(data.replace("cancelar:", ""));
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
    console.log("1. Iniciando procesamiento de devocional...");
    await responderTelegram(chatId, "⏳ <b>Procesando tu devocional con Gemini...</b>", token);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Eres el community manager experto de la iglesia cristiana MMM Las Palmas. A partir del siguiente devocional diario, genera un JSON con exactamente estas claves:
- "titulo": título corto y llamativo (máx 6 palabras).
- "versiculo": la cita bíblica principal del texto. OBLIGATORIO: Extraída textualmente de la Biblia versión Reina Valera 1960 (RVR1960).
- "copy": texto para el post de Facebook (3-4 líneas, tono cálido).
Al final del copy, debes incluir EXACTAMENTE 3 hashtags en este orden:
1. Un hashtag sobre el tema principal del devocional (ej. #Fe).
2. #MMMLasPalmas
3. #MMM
DEVOCIONAL:
"""${text}"""`;

    let raw = "", intentos = 2, exito = false, ultimoError = null;

    for (let i = 0; i < intentos; i++) {
      try {
        const interaction = await withTimeout(
          ai.interactions.create({
            model: "gemini-3.8-flash",
            input: prompt,
            response_format: { type: "text", mime_type: "application/json" },
          }),
          25000,
          "Llamada a Gemini API"
        );
        raw = interaction.output_text.trim();
        exito = true;
        break;
      } catch (err) {
        ultimoError = err;
        if (err.message && err.message.includes("503")) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          break;
        }
      }
    }

    if (!exito) throw ultimoError;

    console.log("2. Respuesta de Gemini recibida, generando imagen...");
    raw = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    const contenido = JSON.parse(raw);

    const draftId = "draft_" + Date.now();
    await redis.set(draftId, JSON.stringify(contenido), { ex: 3600 });

    const captionText = `📌 <b>BORRADOR DE PUBLICACIÓN</b>\n\n✍️ <b>Texto para Facebook:</b>\n${escapeHtml(contenido.copy)}\n\n💾 <i>ID: ${escapeHtml(draftId)}</i>`;

    const imgBlob = await withTimeout(
      crearImagenLocal(contenido.titulo, contenido.versiculo, host),
      15000,
      "Generación de imagen Satori/Resvg"
    );

    console.log("3. Imagen generada con éxito, enviando a Telegram...");
    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("photo", imgBlob, "devocional.png");
    formData.append("caption", captionText);
    formData.append("parse_mode", "HTML");
    formData.append(
      "reply_markup",
      JSON.stringify({
        inline_keyboard: [[
          { text: "✅ Publicar en Facebook", callback_data: "confirmar:" + draftId },
          { text: "❌ Cancelar", callback_data: "cancelar:" + draftId },
        ]],
      })
    );

    const resTelegram = await fetch(TG_BASE + token + "/sendPhoto", {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    const dataTelegram = await resTelegram.json();

    if (!dataTelegram.ok) {
      await responderTelegram(chatId, `⚠️ <b>No se adjuntó la foto:</b> ${escapeHtml(dataTelegram.description)}\n\n📌 <b>${escapeHtml(contenido.titulo)}</b>\n📖 "${escapeHtml(contenido.versiculo)}"`, token);
    }

    console.log("4. Proceso completado con éxito.");
  } catch (err) {
    console.error("❌ Error:", err);
    await responderTelegram(chatId, `🚨 <b>Error en el servidor:</b>\n<code>${escapeHtml(err.message)}</code>`, token);
  }

  return res.status(200).send("OK");
}

  return res.status(200).send("OK");
}
