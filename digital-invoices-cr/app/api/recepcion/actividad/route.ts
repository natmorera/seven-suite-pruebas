import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Cambiar la actividad de la empresa en compras ya importadas (una o varias).
// Con recordar=true también queda como la actividad asociada a sus proveedores.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(b.ids) ? b.ids.map(String) : [];
  const actividad = String(b.actividad ?? '').trim();
  if (!ids.length || !actividad) return NextResponse.json({ error: 'Indica las compras y la actividad.' }, { status: 400 });
  const db = await getDb();
  const marcas = ids.map(() => '?').join(',');
  // Con el acuse emitido la actividad ya se declaró a Hacienda: no se cambia
  const { rows: conAcuse } = await db.execute({ sql: `SELECT numero_factura FROM documentos_recibidos WHERE id IN (${marcas}) AND estado IN ('Aceptado','Rechazado')`, args: ids });
  if (conAcuse.length) return NextResponse.json({ error: `No se puede cambiar la actividad de ${conAcuse.length === 1 ? 'una compra que ya tiene' : `${conAcuse.length} compras que ya tienen`} acuse emitido (${conAcuse.map(r => String(r.numero_factura).slice(-10)).join(', ')}).` }, { status: 409 });
  await db.execute({ sql: `UPDATE documentos_recibidos SET actividad_economica = ? WHERE id IN (${marcas})`, args: [actividad, ...ids] });
  let proveedores = 0;
  if (b.recordar) {
    const { rows } = await db.execute({ sql: `SELECT DISTINCT REPLACE(REPLACE(COALESCE(proveedor_identificacion,''),'-',''),' ','') AS ced FROM documentos_recibidos WHERE id IN (${marcas})`, args: ids });
    for (const r of rows) {
      if (!r.ced) continue;
      const u = await db.execute({ sql: `UPDATE clientes SET actividad_empresa = ? WHERE REPLACE(REPLACE(COALESCE(numero_identificacion,''),'-',''),' ','') = ?`, args: [actividad, String(r.ced)] });
      proveedores += u.rowsAffected;
    }
  }
  return NextResponse.json({ ok: true, compras: ids.length, proveedores });
}
