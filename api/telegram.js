import { GoogleGenerativeAI } from "@google/generative-ai";

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
  // Aseguramos responder 200 OK siempre para que Vercel no marque error 500
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  const update = req.body || {};
  const text = update.message?.text;
  const chatId = update.message?.chat?.id;

  if (!text || !chatId) {
    return res.status(200).send("OK");
  }

  // Validación 1: ¿Existe la API Key de Gemini?
  if (!process.env.GEMINI_API_KEY) {
    await enviarTelegram(chatId, "⚠️ Error: No se encontró la variable GEMINI_API_KEY en Vercel.");
    return res.status(200).send("OK");
  }

  // Validación 2: ¿Existe el BOT_TOKEN?
  if (!process.env.BOT_TOKEN) {
    console.error("Falta BOT_TOKEN");
    return res.status(200).send("OK");
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
Eres el community manager de una iglesia cristiana. A partir del siguiente devocional diario, genera un JSON con exactamente estas claves:
- "titulo": título corto y llamativo (máx 6 palabras)
- "versiculo": la cita bíblica principal, corta y textual
- "copy": texto para el post de Facebook (3-4 líneas, cálido, invita a leer/reflexionar, con 2-3 hashtags relevantes)

DEVOCIONAL:
"""${text}"""
`;

    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();
    raw = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    
    const contenido = JSON.parse(raw);
    const mensajeFinal = `📌 ${contenido.titulo.toUpperCase()}\n\n📖 "${contenido.versiculo}"\n\n✍️ ${contenido.copy}`;

    await enviarTelegram(chatId, mensajeFinal);

  } catch (err) {
    console.error("Error en el proceso:", err);
    await enviarTelegram(chatId, `⚠️ Error en Gemini: ${err.message}`);
  }

  return res.status(200).send("OK");
}
