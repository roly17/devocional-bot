import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default function handler(request) {
  try {
    const url = new URL(request.url);

    // Parámetros dinámicos
    const titulo = url.searchParams.get('titulo') || 'Devocional Diario';
    const versiculo = url.searchParams.get('versiculo') || '';

    // Rutas absolutas a tus imágenes en /public
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
            fontFamily: 'sans-serif',
          }}
        >
          {/* LOGO SUPERIOR IZQUIERDO */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'flex-start',
            }}
          >
            <img
              src={logoUrl}
              alt="Logo"
              width="140"
              height="140"
              style={{ objectFit: 'contain' }}
            />
          </div>

          {/* TÍTULO Y VERSÍCULO */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              maxWidth: '90%',
              padding: '20px',
            }}
          >
            <h1
              style={{
                fontSize: '56px',
                fontWeight: '900',
                color: '#FFFFFF',
                margin: '0 0 25px 0',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                textShadow: '0px 4px 12px rgba(0, 0, 0, 0.9)',
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
                  textShadow: '0px 2px 8px rgba(0, 0, 0, 0.9)',
                }}
              >
                "{versiculo}"
              </p>
            ) : null}
          </div>

          {/* FIRMA CON EFECTO BRILLANTE (DOBLE SOMBRA) */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              bottom: '45px',
              right: '60px',
            }}
          >
            <span
              style={{
                fontSize: '34px',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: '#FFFFFF',
                textShadow: '0px 3px 8px rgba(0, 0, 0, 0.9), 0px 0px 10px rgba(255, 255, 255, 0.8)',
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
    return new Response(`Error al generar imagen: ${e.message}`, { status: 500 });
  }
}
