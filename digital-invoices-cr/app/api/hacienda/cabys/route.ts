import { NextRequest, NextResponse } from 'next/server';
import { consultarCabysHacienda } from '@/lib/cabysHacienda';

// Búsqueda en vivo en el catálogo CABYS oficial de Hacienda:
//   ?q=texto      → api.hacienda.go.cr/fe/cabys?q=texto
//   ?codigo=13dig → api.hacienda.go.cr/fe/cabys?codigo=...
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const codigo = req.nextUrl.searchParams.get('codigo') ?? '';
  try {
    return NextResponse.json({ resultados: await consultarCabysHacienda({ q, codigo }) });
  } catch (e) {
    const msg = e instanceof Error && e.message.startsWith('Hacienda') ? e.message : 'Sin conexión con Hacienda: se muestra solo el catálogo local.';
    return NextResponse.json({ resultados: [], error: msg });
  }
}
