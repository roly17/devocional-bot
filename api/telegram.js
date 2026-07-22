import { GoogleGenAI } from "@google/genai";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Función auxiliar robusta para enviar respuestas simples por mensaje de texto
async function enviarTelegramBackup(chatId, text) {
  const token = process.env.BOT_TOKEN;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch (e) {
    console.error("Error comunicando con Telegram (Backup):", e);
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

    // 3. Construir enlace de la imagen con codificación robusta
    const host = req.headers.host || "devocional-bot-eosin.vercel.app";
    // Usamos encodeURIComponent para asegurar que los espacios o caracteres especiales no rompan la URL
    const imageUrl = `https://${host}/api/og?titulo=${encodeURIComponent(contenido.titulo)}&versiculo=${encodeURIComponent(contenido.versiculo)}`;

    // 4. Intentar enviar la FOTO + CAPTION + BOTONES a Telegram
    const token = process.env.BOT_TOKEN;
    const resTelegram = await fetch(`[https://api.telegram.org/bot$](https://api.telegram.org/bot$){token}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: imageUrl,
        caption: `📌 *BORRADOR DE PUBLICACIÓN*\n\n✍️ *Texto para Facebook:*\n${contenido.copy}\n\n💾 _ID del borrador: ${draftId}_`,
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

    // ⚠️ CRÍTICO: Si Telegram rechazó la foto (por ejemplo, por tiempo de descarga o URL malformada),
    // enviamos el borrador por texto para no perderlo y diagnosticar el problema de la imagen.
    if (!dataTelegram.ok) {
      await enviarTelegramBackup(
        chatId,
        `⚠️ *No se pudo enviar la imagen generada directamente.* Telegram rechazó la foto.\n\n` +
        `📝 *Detalles del error:* ${dataTelegram.description}\n\n` +
        `📌 *${contenido.titulo}*\n\n📖 "${contenido.versiculo}"\n\n✍️ ${contenido.copy}\n\n` +
        `🔗 *Prueba la imagen generada aquí (clic para abrir):* ${imageUrl}`
      );
    }

  } catch (err) {
    console.error("Error en handler:", err);
    // En caso de un fallo interno en Vercel (IA, Redis), enviamos el error exacto
    await enviarTelegramBackup(chatId, `🚨 *Error de ejecución en Vercel:*\n${err.stack || err.message}`);
  }

  return res.status(200).send("OK");
}
