import { GoogleGenAI } from "@google/genai";
import { Redis } from "@upstash/redis";

// Conexión a Redis usando variables de entorno de Upstash o KV de Vercel
const redis = Redis.fromEnv();

async function enviarTelegram(chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (e) {
    console.error("Error enviando mensaje a Telegram:", e);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  const update = req.body || {};
  const text = update.message?.text;
  const chatId = update.message?.chat?.id;

  if (!text || !chatId) return res.status(200).send("OK");

  try {
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

    // ==========================================
    // 🧪 PRUEBA DE MEMORIA EN REDIS
    // ==========================================
    const draftId = `draft_${Date.now()}`;
    
    // Guardar el borrador en Redis por 1 hora (3600 segundos)
    await redis.set(draftId, JSON.stringify(contenido), { ex: 3600 });

    // Leer el borrador recién guardado
    const rawBorrador = await redis.get(draftId);
    
    // Convertir respuesta si viene como string JSON
    const borradorGuardado = typeof rawBorrador === "string" ? JSON.parse(rawBorrador) : rawBorrador;
    // ==========================================

    if (!borradorGuardado || !borradorGuardado.titulo) {
      await enviarTelegram(chatId, "⚠️ Error: No se pudo recuperar el borrador desde Redis. Revisa la conexión de la base de datos.");
      return res.status(200).send("OK");
    }

    const mensajeFinal = `📌 ${borradorGuardado.titulo.toUpperCase()}\n\n📖 "${borradorGuardado.versiculo}"\n\n✍️ ${borradorGuardado.copy}\n\n💾 *(Borrador guardado con éxito en Redis - ID: ${draftId})*`;

    await enviarTelegram(chatId, mensajeFinal);

  } catch (err) {
    console.error("Error en el proceso:", err);
    await enviarTelegram(chatId, `⚠️ Error en la prueba:\n${err.message}`);
  }

  return res.status(200).send("OK");
}
