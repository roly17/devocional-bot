import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    const url = new URL(req.url);

    // Parámetros dinámicos
    const titulo = url.searchParams.get('titulo') || 'Devocional Diario';
    const versiculo = url.searchParams.get('versiculo') || '';

    // Rutas de imágenes estáticas en /public
    const logoUrl = `${url.origin}/logo.png`;
    const bgUrl = `${url.origin}/background.jpg`;

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
            {/* Título Principal */}
            <h1
              style={{
                fontSize: '56px',
                fontWeight: '900',
                color: '#FFFFFF',
                margin: '0 0 25px 0',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                lineHeight: '1.2',
                textShadow: '0px 4px 12px rgba(0, 0, 0, 0.9)',
              }}
            >
              {titulo}
            </h1>

            {/* Cita Bíblica */}
            {versiculo ? (
              <p
                style={{
                  fontSize: '32px',
                  fontWeight: '500',
                  color: '#F0F0F0',
                  fontStyle: 'italic',
                  margin: '0',
                  lineHeight: '1.4',
                  textShadow: '0px 2px 8px rgba(0, 0, 0, 0.9)',
                  maxWidth: '95%',
                }}
              >
                "{versiculo}"
              </p>
            ) : null}
          </div>

          {/* 3. FIRMA EN NEGRITA CON EFECTO PLATEADO/BRILLANTE (MMM LAS PALMAS) */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              bottom: '45px',
              right: '60px',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '34px',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: '#FFFFFF',
                // Sombra de volumen + brillo satinado blanco
                textShadow:
                  '0px 3px 8px rgba(0, 0, 0, 0.9), 0px 0px 10px rgba(255, 255, 255, 0.8)',
              }}
            >
              MMM LAS PALMAS
            </span>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1080,
      }
    );
  } catch (e) {
    return new Response(`Error generando la imagen: ${e.message}`, { status: 500 });
  }
}
