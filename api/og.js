import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join } from 'path';

// Parche crítico para evitar el crash "Dynamic require of fs is not supported"
globalThis.require = createRequire(import.meta.url);

async function cargarImagenBase64(nombreArchivo, host) {
  try {
    const filePath = join(process.cwd(), 'public', nombreArchivo);
    return `data:image/png;base64,${readFileSync(filePath).toString('base64')}`;
  } catch {
    const res = await fetch(`https://${host}/${nombreArchivo}`);
    const arrayBuffer = await res.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
  }
}

export default async function handler(req, res) {
  try {
    const { ImageResponse } = await import('@vercel/og');

    const titulo = req.query?.titulo || 'DEVOCIONAL DIARIO';
    const versiculo = req.query?.versiculo || '';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'devocional-bot-eosin.vercel.app';

    const bgBase64 = await cargarImagenBase64('fondo.png', host);
    const logoBase64 = await cargarImagenBase64('logo.png', host);

    const element = {
      type: 'div',
      props: {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '60px 50px',
          backgroundImage: `url(${bgBase64})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: 'sans-serif',
          boxSizing: 'border-box',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', width: '100%', justifyContent: 'flex-start', alignItems: 'center' },
              children: [
                {
                  type: 'img',
                  props: { src: logoBase64, style: { width: '140px', height: '140px', objectFit: 'contain' } },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                width: '90%', padding: '35px 30px', borderRadius: '24px', backgroundColor: 'rgba(0, 0, 0, 0.55)', border: '1px solid rgba(255, 255, 255, 0.25)',
              },
              children: [
                {
                  type: 'h1',
                  props: { style: { fontSize: '48px', fontWeight: 'bold', color: '#FFFFFF', margin: '0 0 18px 0', textTransform: 'uppercase', textShadow: '0px 4px 10px rgba(0, 0, 0, 0.9)' }, children: titulo },
                },
                versiculo ? {
                  type: 'p',
                  props: { style: { fontSize: '28px', fontWeight: '500', color: '#F0F0F0', fontStyle: 'italic', margin: '0', lineHeight: '1.4', textShadow: '0px 2px 8px rgba(0, 0, 0, 0.9)' }, children: `"${versiculo}"` },
                } : null,
              ].filter(Boolean),
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
              children: [
                {
                  type: 'span',
                  props: { style: { fontSize: '28px', fontWeight: 'bold', color: '#FFFFFF', letterSpacing: '2px', textShadow: '0px 3px 8px rgba(0, 0, 0, 0.9), 0px 0px 10px rgba(255, 255, 255, 0.7)' }, children: 'MMM LAS PALMAS' },
                },
              ],
            },
          },
        ],
      },
    };

    const imageResponse = new ImageResponse(element, { width: 1080, height: 1080 });
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(buffer);
  } catch (e) {
    console.error('Error en og.js:', e);
    return res.status(500).send(`Error generando la imagen: ${e.message}`);
  }
}
