import { NextRequest, NextResponse } from 'next/server';

// Consulta pública de Hacienda (sin credenciales): nombre, régimen y actividades económicas inscritas de una cédula.
// https://api.hacienda.go.cr/fe/ae?identificacion=3101123456
export async function GET(req: NextRequest) {
  const id = (req.nextUrl.searchParams.get('id') ?? '').replace(/\D/g, '');
  if (id.length < 9) return NextResponse.json({ error: 'Escribe una cédula válida (9 a 12 dígitos).' }, { status: 400 });
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${id}`, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (r.status === 404) return NextResponse.json({ error: 'Hacienda no tiene inscrita esa cédula.' }, { status: 404 });
    if (!r.ok) return NextResponse.json({ error: 'No se pudo consultar Hacienda en este momento. Intenta de nuevo o completa los datos a mano.' }, { status: 502 });
    const d = await r.json();
    const actividades = (Array.isArray(d.actividades) ? d.actividades : [])
      .filter((a: { estado?: string }) => !a.estado || a.estado === 'A')
      .map((a: { codigo: string; descripcion: string }) => ({ codigo: String(a.codigo), nombre: String(a.descripcion ?? '').trim() }));
    return NextResponse.json({ nombre: d.nombre ?? '', regimen: d.regimen?.descripcion ?? '', situacion: d.situacion?.estado ?? '', actividades });
  } catch {
    return NextResponse.json({ error: 'No se pudo consultar Hacienda (sin conexión o el servicio no respondió). Puedes completar los datos a mano.' }, { status: 502 });
  }
}
