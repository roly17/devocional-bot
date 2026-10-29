import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler(req) {
  try {
    const { searchParams, protocol, host } = new URL(req.url);
    const titulo = searchParams.get('titulo') || 'DEVOCIONAL DIARIO';
    const versiculo = searchParams.get('versiculo') || '';

    const bgUrl = `${protocol}//${host}/fondo.png`;
    const logoUrl = `${protocol}//${host}/logo.png`;

    const element = {
      type: 'div',
      props: {
        style: {
          height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', alignItems: 'center', padding: '60px 50px',
          backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center',
          fontFamily: 'sans-serif', boxSizing: 'border-box',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', width: '100%', justifyContent: 'flex-start', alignItems: 'center' },
              children: [{ type: 'img', props: { src: logoUrl, style: { width: '140px', height: '140px', objectFit: 'contain' } } }],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                width: '90%', padding: '35px 30px', borderRadius: '24px', backgroundColor: 'rgba(0, 0, 0, 0.55)', border: '1px solid rgba(255, 255, 255, 0.25)',
              },
              children: [
                { type: 'h1', props: { style: { fontSize: '48px', fontWeight: 'bold', color: '#FFFFFF', margin: '0 0 18px 0', textTransform: 'uppercase', textShadow: '0px 4px 10px rgba(0, 0, 0, 0.9)' }, children: titulo } },
                versiculo ? { type: 'p', props: { style: { fontSize: '28px', fontWeight: '500', color: '#F0F0F0', fontStyle: 'italic', margin: '0', lineHeight: '1.4', textShadow: '0px 2px 8px rgba(0, 0, 0, 0.9)' }, children: `"${versiculo}"` } } : null,
              ].filter(Boolean),
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
              children: [{ type: 'span', props: { style: { fontSize: '28px', fontWeight: 'bold', color: '#FFFFFF', letterSpacing: '2px', textShadow: '0px 3px 8px rgba(0, 0, 0, 0.9), 0px 0px 10px rgba(255, 255, 255, 0.7)' }, children: 'MMM LAS PALMAS' } }],
            },
          },
        ],
      },
    };

    return new ImageResponse(element, { width: 1080, height: 1080 });
  } catch (e) {
    console.error('Error OG:', e);
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
}
