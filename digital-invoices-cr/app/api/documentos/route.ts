import { NextRequest, NextResponse } from 'next/server';
import { enlazarDespuesDeEmitir } from '@/lib/eventosOrigen';
import { tieneAbonos } from '@/lib/reciboPago';
import { getDb } from '@/lib/db';
import { crearDocumento } from '@/lib/crearDocumento';

export async function GET() {
  const db = await getDb();
  const { rows } = await db.execute(`
    SELECT d.*, a.consecutivo AS asiento_consecutivo,
      (SELECT c.correos_copia FROM clientes c WHERE c.id = d.cliente_id) AS receptor_copias
    FROM documentos_emitidos d
    LEFT JOIN asientos a ON a.documento_ref_id = d.id
    ORDER BY d.fecha_emision DESC
  `);
  return NextResponse.json(rows);
}

// Creación MANUAL desde esta pantalla (Documentos emitidos → Agregar
// documento). Si el body no trae "origen", queda 'Manual'. Para documentos
// que nacen en Front Desk/POS/Inventario/Tour Operador, ver /api/documentos/externo.
export async function POST(req: NextRequest) {
  const body = await req.json();
  // Nota sobre un comprobante importado de otro sistema: misma sucursal y terminal
  if ((body.tipo === 'Nota de crédito' || body.tipo === 'Nota de débito') && body.referencia?.numero && !body.esBorrador) {
    const db0 = await getDb();
    const { rows: ref } = await db0.execute({ sql: 'SELECT numero_factura, importado FROM documentos_emitidos WHERE clave = ? OR numero_factura = ? LIMIT 1', args: [String(body.referencia.numero), String(body.referencia.numero)] });
    if (ref[0] && Number(ref[0].importado) === 1) {
      const n = String(ref[0].numero_factura);
      const { rows: cj } = await db0.execute({ sql: 'SELECT sucursal, terminal FROM cajas WHERE id = ?', args: [String(body.cajaId ?? '')] });
      if (!cj[0] || String(cj[0].sucursal) !== n.slice(0, 3) || String(cj[0].terminal) !== n.slice(3, 8)) {
        return NextResponse.json({ error: `La nota debe salir con la sucursal ${n.slice(0, 3)} y la terminal ${n.slice(3, 8)} del documento original.` }, { status: 400 });
      }
    }
  }
  if (body.tipo === 'Nota de crédito' && body.referencia?.numero && await tieneAbonos(await getDb(), String(body.referencia.numero))) {
    return NextResponse.json({ error: 'Esa factura ya tiene abonos con recibo electrónico de pago: no se puede anular con nota de crédito.' }, { status: 400 });
  }
  const resultado = await crearDocumento({ ...body, origen: body.origen ?? 'Manual' });
  if ('error' in resultado) return NextResponse.json(resultado, { status: 400 });
  if (!resultado.esBorrador && (body.reemplazaA || body.anularEnOrigen)) {
    await enlazarDespuesDeEmitir(await getDb(), resultado.id, { reemplazaA: body.reemplazaA ?? null, anularEnOrigen: Boolean(body.anularEnOrigen), referenciaNumero: body.referencia?.numero ?? null });
  }
  return NextResponse.json(resultado);
}
