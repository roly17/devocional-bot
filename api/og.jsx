import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);

    // Parámetros dinámicos que enviará el bot
    const titulo = searchParams.get('titulo') || 'DEVOCIONAL DIARIO';
    const versiculo = searchParams.get('versiculo') || '';

    // Dominio dinámico
    const host = req.headers.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const fondoUrl = `${protocol}://${host}/fondo.png`;
    const logoUrl = `${protocol}://${host}/logo.png`;

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
            backgroundImage: `url(${fondoUrl})`,
            backgroundSize: '100% 100%',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Esquina superior izquierda: Logo */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src={logoUrl}
              alt="Logo MMM"
              style={{
                width: '130px',
                height: 'auto',
              }}
            />
          </div>

          {/* Bloque Central: Contenido del Devocional */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '30px',
              borderRadius: '20px',
              backgroundColor: 'rgba(20, 10, 5, 0.45)', // Tarjeta oscura sutil
              border: '1px solid rgba(255, 213, 79, 0.2)',
            }}
          >
            {/* Título en Dorado */}
            <h2
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#FFD54F',
                letterSpacing: '2px',
                marginBottom: '15px',
                textTransform: 'uppercase',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              {titulo}
            </h2>

            {/* Texto del Versículo RVR1960 */}
            <p
              style={{
                fontSize: '26px',
                fontWeight: '500',
                lineHeight: '1.4',
                color: '#FFFFFF',
                fontStyle: 'italic',
                textShadow: '0 2px 6px rgba(0,0,0,0.9)',
              }}
            >
              "{versiculo}"
            </p>
          </div>

          {/* Esquina inferior derecha: Marca Local */}
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
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
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
