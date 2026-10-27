import { ImageResponse } from '@vercel/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  try {
    const titulo = req.query?.titulo || 'DEVOCIONAL DIARIO';
    const versiculo = req.query?.versiculo || '';

    // 1. LEER IMÁGENES DIRECTAMENTE DEL DISCO DURO (Sin internet / Sin bloqueos)
    const bgPath = join(process.cwd(), 'public', 'fondo.png');
    const logoPath = join(process.cwd(), 'public', 'logo.png');

    // Convertirlas a código Base64 para inyectarlas directamente en el generador
    const bgBase64 = `data:image/png;base64,${readFileSync(bgPath).toString('base64')}`;
    const logoBase64 = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;

    // 2. Estructura visual en Objetos JS
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
          // LOGO SUPERIOR IZQUIERDO
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
          // CUADRO CENTRAL DE TEXTO (Título + Versículo)
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
          // FIRMA INFERIOR DERECHA
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

    // 3. Crear la respuesta de imagen (Cuadrada 1080x1080)
    const imageResponse = new ImageResponse(element, {
      width: 1080,
      height: 1080,
    });

    // 4. Convertir a Buffer y enviar
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
