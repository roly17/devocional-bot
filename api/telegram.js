import { readFileSync } from "fs";
import { join } from "path";

export const maxDuration = 300;

const TG_BASE = "https://api.telegram.org/bot";
const PROJECT_DOMAIN = "devocional-bot-eosin.vercel.app";

let cachedFonts = null;

function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

async function obtenerRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

async function obtenerFuentes() {
  if (cachedFonts) return cachedFonts;
  const [reg, bold, italic] = await Promise.all([
    fetch("https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-400-normal.woff", { signal: AbortSignal.timeout(10000) }).then((r) => r.arrayBuffer()),
    fetch("https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-700-normal.woff", { signal: AbortSignal.timeout(10000) }).then((r) => r.arrayBuffer()),
    fetch("https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-500-italic.woff", { signal: AbortSignal.timeout(10000) }).then((r) => r.arrayBuffer()),
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
    const res = await fetch(`https://${host}/${nombreArchivo}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`No se pudo cargar ${nombreArchivo} (HTTP ${res.status})`);
    const arrayBuffer = await res.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`;
  }
}

async function crearImagenLocal(titulo, versiculo, host, recursosPrecargados = null) {
  const satoriModule = await import("satori");
  const satori = satoriModule.default || satoriModule;
  const resvgModule = await import("@resvg/resvg-js");
  const Resvg = resvgModule.Resvg || resvgModule.default?.Resvg;

  const [fonts, bgBase64, logoBase64] = recursosPrecargados || (await Promise.all([
    obtenerFuentes(),
    cargarImagenBase64("fondo.png", host),
    cargarImagenBase64("logo.png", host),
  ]));

  const element = {
    type: "div",
    props: {
      style: {
        height: "1080px", width: "1080px", display: "flex", flexDirection: "column",
        justifyContent: "space-between", alignItems: "center", padding: "60px 50px",
        fontFamily: "Roboto", position: "relative", boxSizing: "border-box",
      },
      children: [
        { type: "img", props: { src: bgBase64, width: 1080, height: 1080, style: { position: "absolute", top: 0, left: 0, width: "1080px", height: "1080px", objectFit: "cover" } } },
        { type: "div", props: { style: { display: "flex", width: "100%", justifyContent: "flex-start", alignItems: "center" }, children: [{ type: "img", props: { src: logoBase64, width: 140, height: 140, style: { width: "140px", height: "140px", objectFit: "contain" } } }] } },
        {
          type: "div",
          props: {
            style: {
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
              width: "90%", padding: "35px 30px", borderRadius: "24px", backgroundColor: "rgba(0, 0, 0, 0.55)", border: "1px solid rgba(255, 255, 255, 0.25)",
            },
            children: [
              { type: "h1", props: { style: { fontSize: "48px", fontWeight: 700, color: "#FFFFFF", margin: "0 0 18px 0", textTransform: "uppercase" }, children: titulo } },
              versiculo ? { type: "p", props: { style: { fontSize: "28px", fontWeight: 500, color: "#F0F0F0", fontStyle: "italic", margin: "0", lineHeight: "1.4" }, children: `"${versiculo}"` } } : null,
            ].filter(Boolean),
          },
        },
        { type: "div", props: { style: { display: "flex", width: "100%", justifyContent: "flex-end", alignItems: "center" }, children: [{ type: "span", props: { style: { fontSize: "28px", fontWeight: 700, color: "#FFFFFF", letterSpacing: "2px" }, children: "MMM LAS PALMAS" } }] } },
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
  const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;

  try {
    const redis = await obtenerRedis();

    // ANTI-DUPLICADOS
    if (update.update_id) {
      const isDuplicate = await withTimeout(redis.get(`update_${update.update_id}`), 5000, "Redis GET");
      if (isDuplicate) return res.status(200).send("OK");
      await withTimeout(redis.set(`update_${update.update_id}`, "procesado", { ex: 600 }), 5000, "Redis SET");
    }

    // 1. MANEJO DE BOTONES
    if (update.callback_query) {
      const callbackId = update.callback_query.id;
      const data = update.callback_query.data;

      if (token) {
        await fetch(TG_BASE + token + "/answerCallbackQuery", {
          method: "POST", headers: { "Content-Type": "application/json" },
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

          const imgBlob = await withTimeout(crearImagenLocal(contenido.titulo, contenido.versiculo, host), 20000, "Dibujado FB");

          const fbForm = new FormData();
          fbForm.append("access_token", fbToken);
          fbForm.append("caption", contenido.copy);
          fbForm.append("source", imgBlob, "devocional.png");

          const fbRes = await fetch(`https://graph.facebook.com/v20.0/${fbPageId}/photos`, {
            method: "POST", body: fbForm, signal: AbortSignal.timeout(25000),
          });

          const fbData = await fbRes.json();
          if (fbData.id || fbData.post_id) {
            await redis.del(draftId);
            await responderTelegram(chatId, `🎉 <b>¡PUBLICACIÓN EXITOSA!</b>\n\n🆔 <b>Post ID:</b> <code>${fbData.post_id || fbData.id}</code>`, token);
          } else {
            await responderTelegram(chatId, `🚨 <b>Error de Facebook:</b>\n<code>${escapeHtml(fbData.error?.message)}</code>`, token);
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
    if (!chatId || !text || !token) return res.status(200).send("OK");

    await responderTelegram(chatId, "⏳ <b>Procesando tu devocional con Gemini...</b>", token);

    // Precargamos los archivos de diseño en paralelo para ahorrar tiempo
    const promesaRecursos = Promise.all([
      obtenerFuentes(),
      cargarImagenBase64("fondo.png", host),
      cargarImagenBase64("logo.png", host),
    ]);

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

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error("Falta la variable GEMINI_API_KEY en Vercel.");

    // 🚀 LA MAGIA: Petición nativa directa al modelo ultra-estable (gemini-1.5-flash)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
    
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }),
      signal: AbortSignal.timeout(30000) // Le damos 30 segundos justos
    });

    if (!geminiRes.ok) {
      const errorApi = await geminiRes.text();
      throw new Error(`Google API (HTTP ${geminiRes.status}): ${errorApi}`);
    }

    const dataGemini = await geminiRes.json();
    
    if (!dataGemini.candidates || !dataGemini.candidates[0]) {
      throw new Error("Google devolvió una respuesta vacía o inesperada.");
    }

    let raw = dataGemini.candidates[0].content.parts[0].text.trim();
    raw = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    const contenido = JSON.parse(raw);

    const draftId = "draft_" + Date.now();
    await redis.set(draftId, JSON.stringify(contenido), { ex: 3600 });

    const captionText = `📌 <b>BORRADOR DE PUBLICACIÓN</b>\n\n✍️ <b>Texto para Facebook:</b>\n${escapeHtml(contenido.copy)}\n\n💾 <i>ID: ${escapeHtml(draftId)}</i>`;

    const recursosListos = await promesaRecursos;
    const imgBlob = await withTimeout(
      crearImagenLocal(contenido.titulo, contenido.versiculo, host, recursosListos),
      20000,
      "Generación de imagen Satori/Resvg"
    );

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
      method: "POST", body: formData, signal: AbortSignal.timeout(20000),
    });

    const dataTelegram = await resTelegram.json();
    if (!dataTelegram.ok) {
      await responderTelegram(chatId, `⚠️ <b>No se adjuntó la foto:</b> ${escapeHtml(dataTelegram.description)}\n\n📌 <b>${escapeHtml(contenido.titulo)}</b>\n📖 "${escapeHtml(contenido.versiculo)}"`, token);
    }
  } catch (err) {
    console.error("❌ Error:", err);
    await responderTelegram(chatId, `🚨 <b>Error en el servidor:</b>\n<code>${escapeHtml(err.message)}</code>`, token);
  }

  return res.status(200).send("OK");
}
