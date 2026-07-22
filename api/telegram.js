import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generarContenido(devocional) {
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
"""${devocional}"""
`;

  const result = await model.generateContent(prompt);
  let raw = result.response.text().trim();
  raw = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  return JSON.parse(raw);
}

async function enviarTelegram(chatId, text) {
  // Le quitamos parse_mode para que Telegram acepten hashtags y símbolos sin rechazar el mensaje
  await fetch(`[https://api.telegram.org/bot$](https://api.telegram.org/bot$){process.env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }), 
  });
}

export default async function handler(req, res) {
  const update = req.body;
  const text = update.message?.text;
  const chatId = update.message?.chat?.id;

  if (text && chatId) {
    try {
      const contenido = await generarContenido(text);
      
      const mensajeFinal = `📌 ${contenido.titulo.toUpperCase()}\n\n📖 "${contenido.versiculo}"\n\n✍️ ${contenido.copy}`;
      
      await enviarTelegram(chatId, mensajeFinal);
    } catch (err) {
      console.error(err);
      await enviarTelegram(chatId, `⚠️ Error: ${err.message}`);
    }
  }

  res.status(200).send("ok");
}
