import { GoogleGenAI } from "@google/genai";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Función auxiliar para enviar respuestas a Telegram
async function responderTelegram(chatId, text, token) {
  if (!chatId || !token) return;
  const url = "https://api.telegram.org/bot" + token + "/sendMessage";
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown"
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

  console.log("📥 Update recibido de Telegram:", JSON.stringify(update));

  // 1. Manejo de clics en botones (callback_query)
  if (update.callback_query) {
    const callbackId = update.callback_query.id;
    const data = update.callback_query.data;
    const chatId = update.callback_query.message?.chat?.id;

    if (token) {
      const cbUrl = "https://api.telegram.org/bot" + token + "/answerCallbackQuery";
      await fetch(cbUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackId, text: "Procesando..." }),
      });
      await responderTelegram(chatId, "🔘 Presionaste el botón: `" + data + "`\n_(La integración de publicación automática en Facebook se activará en el Paso 3)_.", token);
    }
    return res.status(200).send("OK");
  }

  const text = update.message?.text;
  const chatId = update.message?.chat?.id;

  if (!chatId) return res.status(200).send("OK");

  // Si envían una imagen, sticker o mensaje de voz en lugar de texto
  if (!text) {
    await responderTelegram(chatId, "📌 Por favor envíame el *texto* de un devocional diario para procesarlo.", token);
    return res.status(200).send("OK");
  }

  if (!token) {
    console.error("❌ BOT_TOKEN no configurado en Vercel.");
    return res.status(200).send("OK");
  }

  try {
    // 2. Feedback inmediato al usuario
    await responderTelegram(chatId, "⏳ *Procesando tu devocional con Inteligencia Artificial...*", token);

    // 3. Procesamiento con Gemini AI
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

    // 4. Guardar en Upstash Redis
    const draftId = "draft_" + Date.now();
    await redis.set(draftId, JSON.stringify(contenido), { ex: 3600 });

    // 5. Construir URL de la imagen generada
    const host = req.headers.host || "devocional-bot-eosin.vercel.app";
    const imageUrl = "https://" + host + "/api/og?titulo=" + encodeURIComponent(contenido.titulo) + "&versiculo=" + encodeURIComponent(contenido.versiculo);

    // 6. Enviar FOTO + CAPTION + BOTONES a Telegram
    const sendPhotoUrl = "[https://api.telegram.org/bot](https://api.telegram.org/bot)" + token + "/sendPhoto";
    const captionText = "📌 *BORRADOR DE PUBLICACIÓN*\n\n✍️ *Texto para Facebook:*\n" + contenido.copy + "\n\n💾 _ID: " + draftId + "_";

    const resTelegram = await fetch(sendPhotoUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: imageUrl,
        caption: captionText,
        parse_mode: "Markdown",
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

    // Respaldos por si Telegram no pudo renderizar la foto automáticamente
    if (!dataTelegram.ok) {
      const fallbackMsg = "⚠️ *No se pudo adjuntar la foto directamente.* (" + dataTelegram.description + ")\n\n" +
        "📌 *" + contenido.titulo + "*\n📖 \"" + contenido.versiculo + "\"\n\n✍️ " + contenido.copy + "\n\n" +
        "🖼️ *Abre tu imagen generada aquí:* " + imageUrl;
      
      await responderTelegram(chatId, fallbackMsg, token);
    }

  } catch (err) {
    console.error("❌ Error en el proceso:", err);
    await responderTelegram(chatId, "🚨 *Error en el servidor:*\n`" + err.message + "`", token);
  }

  return res.status(200).send("OK");
}
