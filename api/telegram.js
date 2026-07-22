import { GoogleGenAI } from "@google/genai";

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
    // 1. Inicializamos el nuevo cliente de la Interactions API
    // Asume automáticamente la variable process.env.GEMINI_API_KEY
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

    // 2. Usamos el modelo 3.6 con la nueva estructura que indica tu guía
    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: prompt,
      // La guía indica que podemos forzar el JSON usando response_format
      response_format: {
        type: "text",
        mime_type: "application/json"
      }
    });

    // 3. Obtenemos el texto de salida usando la nueva propiedad
    let raw = interaction.output_text.trim();
    raw = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    
    const contenido = JSON.parse(raw);
    const mensajeFinal = `📌 ${contenido.titulo.toUpperCase()}\n\n📖 "${contenido.versiculo}"\n\n✍️ ${contenido.copy}`;

    await enviarTelegram(chatId, mensajeFinal);

  } catch (err) {
    console.error("Error en el proceso:", err);
    await enviarTelegram(chatId, `⚠️ Error en Gemini 3.6:\n${err.message}`);
  }

  return res.status(200).send("OK");
}
