import { GoogleGenAI } from "@google/genai";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

async function enviarTelegram(chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (e) {
    console.error("Error enviando mensaje simple:", e);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  const update = req.body || {};
  const text = update.message?.text;
  const chatId = update.message?.chat?.id;

  if (!text || !chatId) return res.status(200).send("OK");

  try {
    // 1. Llamada a Gemini
    const ai = new GoogleGenAI({});
    const prompt = `
Eres el community manager experto de la iglesia cristiana MMM Las Palmas. A partir del siguiente devocional diario, genera un JSON con exactamente estas claves:

- "titulo": título corto y llamativo (máx 6 palabras).
- "versiculo": la cita bíblica principal del texto. OBLIGATORIO: La cita debe ser extraída EXACTAMENTE y textualmente de la Biblia versión Reina Valera 1960 (RVR1960).
- "copy": texto para el post de Facebook (3-4 líneas, tono cálido, que invite a leer y reflexionar). 
Al final del copy, debes incluir EXACTAMENTE 3 hashtags en este orden: 
1. Un hashtag sobre el tema principal del devocional (ej. #Fe, #Esperanza).
2. #MMMLasPalmas
3. #MMM

DEVOCIONAL:
"""${text}"""
`;

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

    // 2. Guardar borrador en Redis
    const draftId = `draft_${Date.now()}`;
    await redis.set(draftId, JSON.stringify(contenido), { ex: 3600 });

    // 3. Crear enlace de la imagen
    const host = req.headers.host || "devocional-bot-eosin.vercel.app";
    const protocol = host.includes("localhost") ? "http" : "https";
    const imageUrl = `${protocol}://${host}/api/og?titulo=${encodeURIComponent(contenido.titulo)}&versiculo=${encodeURIComponent(contenido.versiculo)}`;

    // 4. Intentar enviar foto
    const resTelegram = await fetch(`[https://api.telegram.org/bot$](https://api.telegram.org/bot$){process.env.BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: imageUrl,
        caption: `📌 *BORRADOR DE PUBLICACIÓN*\n\n✍️ *Texto para Facebook:*\n${contenido.copy}\n\n💾 _ID: ${draftId}_`,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Publicar en Facebook", callback_data: `confirmar:${draftId}` },
              { text: "❌ Cancelar", callback_data: `cancelar:${draftId}` }
            ]
          ]
        }
      }),
    });

    const dataTelegram = await resTelegram.json();

    // Si Telegram rechazó la foto (por ejemplo, si la imagen no cargó), enviamos el mensaje por texto con la URL
    if (!dataTelegram.ok) {
      await enviarTelegram(
        chatId,
        `⚠️ Telegram no pudo cargar la imagen directametne.\n\n` +
        `📌 *${contenido.titulo}*\n📖 ${contenido.versiculo}\n\n✍️ ${contenido.copy}\n\n` +
        `🔗 Puedes ver la imagen generada aquí:\n${imageUrl}`
      );
    }

  } catch (err) {
    console.error("Error en handler:", err);
    await enviarTelegram(chatId, `🚨 Error de ejecución en Vercel:\n${err.stack || err.message}`);
  }

  return res.status(200).send("OK");
}
