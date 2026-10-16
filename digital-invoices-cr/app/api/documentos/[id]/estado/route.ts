import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { consultarEstado, haciendaEnModoSimulacion, type EstadoHacienda } from '@/lib/hacienda';
import { construirAcuse } from '@/lib/acuse';
import { crearAsientoPorDocumento } from '@/lib/asientoAutomatico';
import { registrarEvento } from '@/lib/eventosOrigen';
import { registrarCompraDeFec, TIPO_FEC } from '@/lib/fec';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = '#' + idParam;
  const db = await getDb();
  const docRes = await db.execute({ sql: 'SELECT * FROM documentos_emitidos WHERE id = ?', args: [id] });
  const doc = docRes.rows[0];
  const clave = doc?.clave as string | undefined;
  const estadoAnterior = doc?.estado as string | undefined;
  // Un borrador no existe ante Hacienda: no se consulta ni cambia de estado.
  if (!doc || Number(doc.es_borrador) === 1 || !doc.numero_factura) {
    return NextResponse.json({ estado: estadoAnterior ?? null, omitido: true });
  }

  // Un documento que no llegó a Hacienda (Error) se queda así hasta reenviarlo.
  if (estadoAnterior === 'Error') return NextResponse.json({ estado: 'Error', error: doc.ultimo_error ?? null });

  let nuevoEstado: EstadoHacienda;
  let consulta: Awaited<ReturnType<typeof consultarEstado>> = null;
  if (haciendaEnModoSimulacion() || !clave) {
    // Sin credenciales reales: se simula que Hacienda aceptó el documento.
    nuevoEstado = 'Aceptado';
  } else {
    consulta = await consultarEstado(clave);
    nuevoEstado = consulta?.estado ?? (estadoAnterior === 'Recibido' ? 'Recibido' : 'Procesando');
  }

  let respuestaXml: string | null = consulta?.respuestaXml ?? null;
  if (!respuestaXml && (nuevoEstado === 'Aceptado' || nuevoEstado === 'Rechazado')) {
    respuestaXml = construirAcuse({
      clave: String(doc.clave ?? ''),
      fechaEmisionDoc: String(doc.fecha_emision),
      cedulaEmisor: '000000000000', // el emisor no se vuelve a consultar aquí; suficiente para la demo
      totalImpuesto: Number(doc.iva ?? 0),
      totalFactura: Number(doc.total ?? 0),
      aceptado: nuevoEstado === 'Aceptado',
    });
  }

  await db.execute({
    sql: 'UPDATE documentos_emitidos SET estado = ?, respuesta_xml = COALESCE(?, respuesta_xml), ultimo_error = COALESCE(?, ultimo_error) WHERE id = ?',
    args: [nuevoEstado, respuestaXml, nuevoEstado === 'Rechazado' ? (consulta?.detalle ?? null) : null, id],
  });

  // Integración con Contabilidad: solo en la TRANSICIÓN hacia 'Aceptado'
  // (nunca si ya estaba Aceptado) se genera el asiento automático. La
  // función además es idempotente por su cuenta (documento_ref_id), como
  // segunda protección si este endpoint se llama más de una vez.
  let asiento: { creado: boolean; asientoId?: string } | null = null;
  let compra: Awaited<ReturnType<typeof registrarCompraDeFec>> | null = null;
  if (nuevoEstado === 'Aceptado' && estadoAnterior !== 'Aceptado') {
    // La factura de compra se registra como compra (asiento de gasto e IVA acreditable)
    if (String(doc.tipo) === TIPO_FEC) compra = await registrarCompraDeFec(db, id);
    else asiento = await crearAsientoPorDocumento(id);
  }

  // Un rechazo se avisa al módulo de origen (Front/POS) para que no lo dé por facturado
  if (nuevoEstado === 'Rechazado' && estadoAnterior !== 'Rechazado') {
    await registrarEvento(db, { tipo: 'rechazado', documentoId: id, origen: String(doc.origen ?? ''), origenReferencia: doc.origen_referencia ? String(doc.origen_referencia) : null, detalle: consulta?.detalle ?? '' });
  }

  return NextResponse.json({ estado: nuevoEstado, asiento, compra });
}
