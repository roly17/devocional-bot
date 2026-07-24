import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    const { searchParams, host, protocol } = new URL(req.url);

    // Obtener parámetros dinámicos de la URL
    const titulo = searchParams.get('titulo') || 'Devocional Diario';
    const versiculo = searchParams.get('versiculo') || '';

    // URL absoluta del logo e imagen de fondo alojados en la carpeta /public
    const baseUrl = `${protocol}//${host}`;
    const logoUrl = `${baseUrl}/logo.png`;
    const bgUrl = `${baseUrl}/background.jpg`;

    return new ImageResponse(
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
          {/* 1. Encabezado Superior: LOGO */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            {/* Contenedor con filtro de sombra para resaltar el logo */}
            <img
              src={logoUrl}
              alt="Logo"
              width="140"
              height="140"
              style={{
                objectFit: 'contain',
                filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.4))',
              }}
            />
          </div>

          {/* 2. Cuerpo Central: TÍTULO Y VERSÍCULO */}
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
            {/* Título Principal */}
            <h1
              style={{
                fontSize: '58px',
                fontWeight: '900',
                color: '#FFFFFF',
                margin: '0 0 25px 0',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                lineHeight: '1.2',
                textShadow: '0px 4px 12px rgba(0, 0, 0, 0.7)',
              }}
            >
              {titulo}
            </h1>

            {/* Versículo / Cita Bíblica */}
            {versiculo && (
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
            )}
          </div>

          {/* 3. Firma Inferior Derecha: MMM LAS PALMAS (Efecto Metálico Brillante) */}
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
                // Degradado Metálico Silver/Brillante
                backgroundImage:
                  'linear-gradient(135deg, #E0E0E0 0%, #FFFFFF 25%, #9E9E9E 50%, #FFFFFF 75%, #CCCCCC 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                // Sombra sutil para proyectar volumen 3D
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
        height: 1080, // Formato cuadrado perfecto para Instagram / Facebook
      }
    );
  } catch (e) {
    console.error('Error generando la imagen OG:', e);
    return new Response('Error al generar la imagen', { status: 500 });
  }
}
