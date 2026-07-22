import { ImageResponse } from '@vercel/og';

export default async function handler(req) {
  try {
    const requestUrl = new URL(req.url, 'https://devocional-bot-eosin.vercel.app');
    const titulo = requestUrl.searchParams.get('titulo') || 'DEVOCIONAL DIARIO';
    const versiculo = requestUrl.searchParams.get('versiculo') || '';

    const host = req.headers?.get ? req.headers.get('host') : (req.headers?.host || 'devocional-bot-eosin.vercel.app');
    const baseUrl = `https://${host}`;

    // Estructura visual definida en JavaScript puro
    const element = {
      type: 'div',
      props: {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '40px 50px',
          backgroundImage: `url(${baseUrl}/fondo.png)`,
          backgroundSize: '100% 100%',
          fontFamily: 'sans-serif',
        },
        children: [
          // Logo superior
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center' },
              children: [
                {
                  type: 'img',
                  props: {
                    src: `${baseUrl}/logo.png`,
                    alt: 'Logo MMM',
                    style: { width: '130px', height: 'auto' },
                  },
                },
              ],
            },
          },
          // Cuadro central de texto
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '30px',
                borderRadius: '20px',
                backgroundColor: 'rgba(20, 10, 5, 0.50)',
                border: '1px solid rgba(255, 213, 79, 0.25)',
              },
              children: [
                {
                  type: 'h2',
                  props: {
                    style: {
                      fontSize: '34px',
                      fontWeight: 'bold',
                      color: '#FFD54F',
                      letterSpacing: '2px',
                      marginBottom: '15px',
                      textTransform: 'uppercase',
                    },
                    children: titulo,
                  },
                },
                {
                  type: 'p',
                  props: {
                    style: {
                      fontSize: '26px',
                      fontWeight: '500',
                      lineHeight: '1.4',
                      color: '#FFFFFF',
                      fontStyle: 'italic',
                    },
                    children: `"${versiculo}"`,
                  },
                },
              ],
            },
          },
          // Pie de imagen
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
              },
              children: [
                {
                  type: 'span',
                  props: {
                    style: {
                      fontSize: '22px',
                      fontWeight: 'bold',
                      color: '#FFD54F',
                      letterSpacing: '1px',
                    },
                    children: 'MMM LAS PALMAS',
                  },
                },
              ],
            },
          },
        ],
      },
    };

    return new ImageResponse(element, {
      width: 1200,
      height: 630,
    });
  } catch (e) {
    return new Response(`Error generando la imagen: ${e.message}`, { status: 500 });
  }
}
