import { ImageResponse } from '@vercel/og';

export default async function handler(req, res) {
  try {
    // 1. Obtener parámetros (Vercel Serverless usa req.query)
    const titulo = req.query?.titulo || 'DEVOCIONAL DIARIO';
    const versiculo = req.query?.versiculo || '';

    // Obtener el dominio actual para construir rutas absolutas
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'devocional-bot-eosin.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;

    const bgUrl = `${baseUrl}/fondo.png`;
    const logoUrl = `${baseUrl}/logo.png`;

    // 2. Estructura visual en Objetos JS (Sin JSX para evitar errores)
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
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: 'sans-serif',
          boxSizing: 'border-box',
        },
        children: [
          // LOGO SUPERIOR
          {
            type: 'div',
            props: {
              style: { display: 'flex', width: '100%', justifyContent: 'flex-start', alignItems: 'center' },
              children: [
                {
                  type: 'img',
                  props: { src: logoUrl, alt: 'Logo MMM', style: { width: '140px', height: '140px', objectFit: 'contain' } },
                },
              ],
            },
          },
          // CUADRO CENTRAL
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
          // FIRMA
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

    // 3. Crear imagen nativa
    const imageResponse = new ImageResponse(element, {
      width: 1080,
      height: 1080,
    });

    // 4. Convertirla a Buffer para enviarla mediante Node.js
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
