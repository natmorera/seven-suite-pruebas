import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { procesarEml } from '@/lib/buzon';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Subir uno o varios correos guardados (.eml): mismo proceso que el buzón.
async function manejarPOST(req: NextRequest) {
  const form = await req.formData();
  const db = await getDb();
  const resultados = [];
  for (const f of form.getAll('archivos')) {
    if (typeof f === 'string') continue;
    const buf = Buffer.from(await f.arrayBuffer());
    resultados.push({ archivo: f.name, ...(await procesarEml(db, buf).catch(e => ({ guardado: false, motivo: String(e?.message ?? e), asunto: f.name }))) });
  }
  return NextResponse.json({ resultados, nuevos: resultados.filter(r => r.guardado).length, automaticos: resultados.filter(r => 'automatico' in r && r.automatico).length });
}

// Cada solicitud corre con el país de la empresa elegida
export const POST = conPaisDeSolicitud(manejarPOST);
