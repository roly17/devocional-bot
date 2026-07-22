import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);

    const titulo = searchParams.get('titulo') || 'DEVOCIONAL DIARIO';
    const versiculo = searchParams.get('versiculo') || '';

    // Construcción de la URL base del sitio
    const host = req.headers.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '40px 50px',
            backgroundImage: `url(${baseUrl}/fondo.png)`,
            backgroundSize: '100% 100%',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Esquina superior izquierda: Logo */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src={`${baseUrl}/logo.png`}
              alt="Logo MMM"
              style={{
                width: '130px',
                height: 'auto',
              }}
            />
          </div>

          {/* Bloque Central: Contenido */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '30px',
              borderRadius: '20px',
              backgroundColor: 'rgba(20, 10, 5, 0.45)',
              border: '1px solid rgba(255, 213, 79, 0.2)',
            }}
          >
            <h2
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#FFD54F',
                letterSpacing: '2px',
                marginBottom: '15px',
                textTransform: 'uppercase',
              }}
            >
              {titulo}
            </h2>

            <p
              style={{
                fontSize: '24px',
                fontWeight: '500',
                lineHeight: '1.4',
                color: '#FFFFFF',
                fontStyle: 'italic',
              }}
            >
              "{versiculo}"
            </p>
          </div>

          {/* Marca inferior */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#FFD54F',
                letterSpacing: '1px',
              }}
            >
              MMM LAS PALMAS
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    return new Response(`Error generando la imagen: ${e.message}`, { status: 500 });
  }
}
