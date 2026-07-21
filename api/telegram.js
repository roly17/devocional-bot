import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generarContenido(devocional) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
Eres el community manager de una iglesia cristiana. A partir del siguiente devocional diario,
genera un JSON con exactamente estas claves:
- "titulo": título corto y llamativo (máx 6 palabras)
- "versiculo": la cita bíblica principal, corta y textual
- "copy": texto para el post de Facebook (3-4 líneas, cálido, invita a leer/reflexionar, con 2-3 hashtags relevantes)

Devuelve SOLO el JSON, sin texto adicional ni bloques de código.

DEVOCIONAL:
"""${devocional}"""
`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
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

  // ID permitida
  const idsPermitidos = [5242320644]; 

  if (text && chatId) {
    if (!idsPermitidos.includes(chatId)) {
      await enviarTelegram(chatId, "No tienes permiso para usar este bot.");
      return res.status(200).send("ok");
    }

    try {
      const contenido = await generarContenido(text);
      await enviarTelegram(
        chatId,
        `*${contenido.titulo}*\n\n"${contenido.versiculo}"\n\n${contenido.copy}`
      );
    } catch (err) {
      await enviarTelegram(chatId, "⚠️ Hubo un error generando el contenido. Intenta de nuevo.");
      console.error(err);
    }
  }

  res.status(200).send("ok");
}
