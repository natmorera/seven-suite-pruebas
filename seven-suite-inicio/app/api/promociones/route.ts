import { NextResponse } from 'next/server';
import locales from '@/data/promociones.json';

// Slides de promociones del inicio. Se editan en WordPress, como hoy:
//   PROMOS_WP_URL        sitio de WordPress (https://www.ejemplo.com)
//   PROMOS_WP_CATEGORIA  slug de la categoría con las entradas de los slides
// Cada entrada es un slide: título, extracto, imagen destacada y, si existen
// los campos personalizados «boton» y «enlace» (ACF), el botón. Sin
// WordPress se usan los de data/promociones.json. Se actualiza cada hora.
export const revalidate = 3600;

interface Slide { titulo: string; texto: string; boton: string; enlace: string; imagen: string; fondo: string }
const limpiar = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#8217;/g, '’').replace(/&#8220;|&#8221;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

async function desdeWordPress(): Promise<Slide[] | null> {
  const base = process.env.PROMOS_WP_URL?.replace(/\/$/, '');
  if (!base) return null;
  try {
    let filtro = '';
    if (process.env.PROMOS_WP_CATEGORIA) {
      const cats = await fetch(`${base}/wp-json/wp/v2/categories?slug=${encodeURIComponent(process.env.PROMOS_WP_CATEGORIA)}`, { next: { revalidate } }).then(r => r.json());
      if (Array.isArray(cats) && cats[0]?.id) filtro = `&categories=${cats[0].id}`;
    }
    const posts = await fetch(`${base}/wp-json/wp/v2/posts?per_page=6&_embed=1${filtro}`, { next: { revalidate } }).then(r => r.json());
    if (!Array.isArray(posts) || !posts.length) return null;
    return posts.map((p: Record<string, any>) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      titulo: limpiar(p.title?.rendered ?? ''),
      texto: limpiar(p.excerpt?.rendered ?? '').slice(0, 180),
      boton: String(p.acf?.boton ?? 'Ver más'),
      enlace: String(p.acf?.enlace ?? p.link ?? ''),
      imagen: String(p._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? ''),
      fondo: String(p.acf?.fondo ?? '#1F2A26'),
    }));
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json((await desdeWordPress()) ?? (locales as Slide[]));
}
