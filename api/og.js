import { ImageResponse } from '@vercel/og';

export default async function handler(req, res) {
  try {
    // Construcción segura de URLs para Node.js
    const host = req.headers.host || 'devocional-bot-eosin.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const requestUrl = new URL(req.url, `${protocol}://${host}`);

    // Parámetros de la imagen
    const titulo = requestUrl.searchParams.get('titulo') || 'Devocional Diario';
    const versiculo = requestUrl.searchParams.get('versiculo') || '';

    // Rutas absolutas a tus imágenes en /public
    const baseUrl = `${protocol}://${host}`;
    const logoUrl = `${baseUrl}/logo.png`;
    const bgUrl = `${baseUrl}/background.jpg`;

    // Generar la imagen con @vercel/og
    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            padding: '70px 60px',
            boxSizing: 'border-box',
            position: 'relative',
            fontFamily: 'sans-serif',
          }}
        >
          {/* 1. LOGO SUPERIOR IZQUIERDO */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            <img
              src={logoUrl}
              alt="Logo"
              width="140"
              height="140"
              style={{
                objectFit: 'contain',
                filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.5))',
              }}
            />
          </div>

          {/* 2. TÍTULO Y VERSÍCULO */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              maxWidth: '90%',
              padding: '20px',
            }}
          >
            <h1
              style={{
                fontSize: '58px',
                fontWeight: '900',
                color: '#FFFFFF',
                margin: '0 0 25px 0',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                lineHeight: '1.2',
                textShadow: '0px 4px 12px rgba(0, 0, 0, 0.8)',
              }}
            >
              {titulo}
            </h1>

            {versiculo ? (
              <p
                style={{
                  fontSize: '32px',
                  fontWeight: '500',
                  color: '#F0F0F0',
                  fontStyle: 'italic',
                  margin: '0',
                  lineHeight: '1.4',
                  textShadow: '0px 2px 8px rgba(0, 0, 0, 0.8)',
                  maxWidth: '95%',
                }}
              >
                "{versiculo}"
              </p>
            ) : null}
          </div>

          {/* 3. FIRMA METÁLICA BRILLANTE (MMM LAS PALMAS) */}
          <div
            style={{
              position: 'absolute',
              bottom: '45px',
              right: '60px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '32px',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                backgroundImage:
                  'linear-gradient(135deg, #E0E0E0 0%, #FFFFFF 25%, #9E9E9E 50%, #FFFFFF 75%, #CCCCCC 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.8))',
              }}
            >
              MMM Las Palmas
            </span>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1080,
      }
    );

    // Convertir el stream Web a Buffer para responder en Node.js
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(buffer);

  } catch (e) {
    console.error('Error generando la imagen OG:', e);
    return res.status(500).send('Error al generar la imagen: ' + e.message);
  }
}
