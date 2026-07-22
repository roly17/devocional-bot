import { ImageResponse } from '@vercel/og';

export default async function handler(req, res) {
  try {
    // 1. Obtener parámetros. req.query funciona automáticamente en Serverless Functions de Vercel
    const titulo = req.query.titulo || 'DEVOCIONAL DIARIO';
    const versiculo = req.query.versiculo || '';

    const host = req.headers.host || 'devocional-bot-eosin.vercel.app';
    const baseUrl = `https://${host}`;

    // 2. Definir la estructura visual en JavaScript puro (más seguro para Node)
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
                    src: `${baseUrl}/logo.png`, // Asegúrate de tener public/logo.png
                    alt: 'Logo MMM',
                    style: { width: '130px', height: 'auto' },
                  },
                },
              ],
            },
          },
          // Cuadro central de texto - Flex grow para ajustarse
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexGrow: 1, // <--- Importante para ocupar espacio
                textAlign: 'center',
                padding: '30px',
                borderRadius: '20px',
                backgroundColor: 'rgba(20, 10, 5, 0.50)',
                border: '1px solid rgba(255, 213, 79, 0.25)',
                margin: '20px 0',
              },
              children: [
                {
                  type: 'h2',
                  props: {
                    style: {
                      fontSize: '32px', // Ligeramente menor
                      fontWeight: 'bold',
                      color: '#FFD54F',
                      letterSpacing: '2px',
                      marginBottom: '10px',
                      textTransform: 'uppercase',
                    },
                    children: titulo,
                  },
                },
                {
                  type: 'p',
                  props: {
                    style: {
                      fontSize: '22px', // Reducido para versículos largos
                      fontWeight: '500',
                      lineHeight: '1.4',
                      color: '#FFFFFF',
                      fontStyle: 'italic',
                      // wordWrap: 'break-word', // Más seguro si no hay espacios
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

    // 3. Crear la respuesta de imagen
    const imageResponse = new ImageResponse(element, {
      width: 1200,
      height: 630,
    });

    // 4. Convertir la imagen a Buffer y enviarla correctamente por res
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(buffer);

  } catch (e) {
    console.error("Error en og.js:", e);
    // res.status(500) es mejor que Response aquí para el backend tradicional
    return res.status(500).send(`Error generando la imagen: ${e.message}`);
  }
}
