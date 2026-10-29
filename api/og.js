import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "fs";
import { join } from "path";

let cachedFonts = null;

async function obtenerFuentes() {
  if (cachedFonts) return cachedFonts;
  const [reg, bold, italic] = await Promise.all([
    fetch("https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-400-normal.woff", { signal: AbortSignal.timeout(8000) }).then((r) => r.arrayBuffer()),
    fetch("https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-700-normal.woff", { signal: AbortSignal.timeout(8000) }).then((r) => r.arrayBuffer()),
    fetch("https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-500-italic.woff", { signal: AbortSignal.timeout(8000) }).then((r) => r.arrayBuffer()),
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
    const res = await fetch(`https://${host}/${nombreArchivo}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`No se pudo cargar ${nombreArchivo} (HTTP ${res.status})`);
    const arrayBuffer = await res.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`;
  }
}

export default async function handler(req, res) {
  try {
    const titulo = req.query?.titulo || "DEVOCIONAL DIARIO";
    const versiculo = req.query?.versiculo || "";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "devocional-bot-eosin.vercel.app";

    const [fonts, bgBase64, logoBase64] = await Promise.all([
      obtenerFuentes(),
      cargarImagenBase64("fondo.png", host),
      cargarImagenBase64("logo.png", host),
    ]);

    const element = {
      type: "div",
      props: {
        style: {
          height: "1080px",
          width: "1080px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "60px 50px",
          fontFamily: "Roboto",
          position: "relative",
          boxSizing: "border-box",
        },
        children: [
          // FONDO COMO IMAGEN ABSOLUTA (Evita el bloqueo del parser CSS)
          {
            type: "img",
            props: {
              src: bgBase64,
              width: 1080,
              height: 1080,
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                width: "1080px",
                height: "1080px",
                objectFit: "cover",
              },
            },
          },
          // LOGO SUPERIOR IZQUIERDO
          {
            type: "div",
            props: {
              style: { display: "flex", width: "100%", justifyContent: "flex-start", alignItems: "center" },
              children: [
                {
                  type: "img",
                  props: { src: logoBase64, width: 140, height: 140, style: { width: "140px", height: "140px", objectFit: "contain" } },
                },
              ],
            },
          },
          // CUADRO CENTRAL
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                width: "90%",
                padding: "35px 30px",
                borderRadius: "24px",
                backgroundColor: "rgba(0, 0, 0, 0.55)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
              },
              children: [
                {
                  type: "h1",
                  props: {
                    style: {
                      fontSize: "48px",
                      fontWeight: 700,
                      color: "#FFFFFF",
                      margin: "0 0 18px 0",
                      textTransform: "uppercase",
                      textShadow: "0px 4px 10px rgba(0, 0, 0, 0.9)",
                    },
                    children: titulo,
                  },
                },
                versiculo
                  ? {
                      type: "p",
                      props: {
                        style: {
                          fontSize: "28px",
                          fontWeight: 500,
                          color: "#F0F0F0",
                          fontStyle: "italic",
                          margin: "0",
                          lineHeight: "1.4",
                          textShadow: "0px 2px 8px rgba(0, 0, 0, 0.9)",
                        },
                        children: `"${versiculo}"`,
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
          // FIRMA INFERIOR DERECHA
          {
            type: "div",
            props: {
              style: { display: "flex", width: "100%", justifyContent: "flex-end", alignItems: "center" },
              children: [
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: "28px",
                      fontWeight: 700,
                      color: "#FFFFFF",
                      letterSpacing: "2px",
                      textShadow: "0px 3px 8px rgba(0, 0, 0, 0.9)",
                    },
                    children: "MMM LAS PALMAS",
                  },
                },
              ],
            },
          },
        ],
      },
    };

    const svg = await satori(element, { width: 1080, height: 1080, fonts });
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1080 } });
    const pngBuffer = resvg.render().asPng();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).send(pngBuffer);
  } catch (e) {
    console.error("Error en og.js:", e);
    return res.status(500).send(`Error generando la imagen: ${e.message}`);
  }
}
