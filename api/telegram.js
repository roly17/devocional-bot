import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generarContenido(devocional) {
  // Usamos gemini-1.5-flash y forzamos a que Gemini entregue JSON puro
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
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
  
  // Limpieza de seguridad por si Gemini incluye marcas de formato markdown ```
  raw = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  
  return JSON.parse(raw);
}

async function enviarTelegram(chatId, text) {
  await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

export default async function handler(req, res) {
  const update = req.body;
  const text = update.message?.text;
  const chatId = update.message?.chat?.id;

  if (text && chatId) {
    try {
      const contenido = await generarContenido(text);
      await enviarTelegram(
        chatId,
        `*${contenido.titulo}*\n\n"${contenido.versiculo}"\n\n${contenido.copy}`
      );
    } catch (err) {
      console.error(err);
      // Si falla, ahora nos dirá la razón exacta en el chat
      await enviarTelegram(chatId, `⚠️ Error: ${err.message}`);
    }
  }

  res.status(200).send("ok");
}
