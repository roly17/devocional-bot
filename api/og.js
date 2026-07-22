import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);

    const titulo = searchParams.get('titulo') || 'DEVOCIONAL DIARIO';
    const versiculo = searchParams.get('versiculo') || '';

    // Dominio público de Vercel para cargar las imágenes estáticas
    const host = req.headers.get('host') || 'devocional-bot-eosin.vercel.app';
    const baseUrl = `https://${host}`;

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
          {/* Logo en la esquina superior izquierda */}
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

          {/* Bloque Central de Texto */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '30px',
              borderRadius: '20px',
              backgroundColor: 'rgba(20, 10, 5, 0.50)',
              border: '1px solid rgba(255, 213, 79, 0.25)',
            }}
          >
            <h2
              style={{
                fontSize: '34px',
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
                fontSize: '26px',
                fontWeight: '500',
                lineHeight: '1.4',
                color: '#FFFFFF',
                fontStyle: 'italic',
              }}
            >
              "{versiculo}"
            </p>
          </div>

          {/* Firma inferior */}
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
