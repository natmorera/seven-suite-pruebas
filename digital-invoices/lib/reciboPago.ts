import type { Client } from '@libsql/client';
import { crearDocumento, type CrearDocumentoResultado } from '@/lib/crearDocumento';
import { autoridad } from '@/lib/paisActual';

export const TIPO_REP = 'Recibo Electrónico de Pago';
export const CONDICIONES_CON_RECIBO: Record<string, string> = { '08': '09', '10': '11' };
export const DIAS_IVA_DIFERIDO = 90;

const r2 = (n: number) => Math.round(n * 100) / 100;
const ESTADOS_VALIDOS = `estado NOT IN ('Rechazado', 'Borrador', 'Error')`;

export function fechaLimiteIva(fechaFactura: string): string {
  const d = new Date(String(fechaFactura).slice(0, 10) + 'T12:00:00');
  d.setDate(d.getDate() + DIAS_IVA_DIFERIDO);
  return d.toISOString().slice(0, 10);
}

export interface Abono {
  id: string; numero_factura: string; fecha_emision: string; estado: string; total: number; iva: number;
  medio: string; descripcion: string; comprobante: string; fechaPago: string; despuesDel90: boolean;
}

// Total, abonado, saldo, IVA cobrado y pendiente, y el plazo de los 90 días
export async function estadoCredito(db: Client, facturaId: string) {
  const { rows: f } = await db.execute({ sql: 'SELECT id, total, iva, fecha_emision, condicion_venta, estado, moneda, numero_factura, cliente_nombre FROM documentos_emitidos WHERE id = ?', args: [facturaId] });
  const fac = f[0];
  const total = Number(fac?.total ?? 0), ivaTotal = Number(fac?.iva ?? 0);
  const limite = fac ? fechaLimiteIva(String(fac.fecha_emision)) : '';
  const { rows } = await db.execute({
    sql: `SELECT id, numero_factura, fecha_emision, estado, total, iva, medios_pago, abono_json FROM documentos_emitidos WHERE recibo_de = ? ORDER BY fecha_emision`, args: [facturaId],
  });
  const abonos: Abono[] = rows.map(r => {
    let a: Partial<Abono> = {};
    try { a = r.abono_json ? JSON.parse(String(r.abono_json)) : {}; } catch { a = {}; }
    let medios: string[] = [];
    try { medios = JSON.parse(String(r.medios_pago ?? '[]')); } catch { medios = []; }
    return {
      id: String(r.id), numero_factura: String(r.numero_factura ?? ''), fecha_emision: String(r.fecha_emision), estado: String(r.estado),
      total: Number(r.total ?? 0), iva: Number(r.iva ?? 0), medio: a.medio ?? medios[0] ?? '', descripcion: a.descripcion ?? 'Abono',
      comprobante: a.comprobante ?? '', fechaPago: a.fechaPago ?? String(r.fecha_emision).slice(0, 10),
      despuesDel90: String(r.fecha_emision).slice(0, 10) > limite,
    };
  });
  const validos = abonos.filter(a => !['Rechazado', 'Borrador', 'Error'].includes(a.estado));
  const abonado = r2(validos.reduce((s, a) => s + a.total, 0));
  const ivaCobrado = r2(validos.filter(a => !a.despuesDel90).reduce((s, a) => s + a.iva, 0));
  const hoy = new Date().toISOString().slice(0, 10);
  const vencido = Boolean(limite) && hoy > limite;
  return {
    facturaId, numero: String(fac?.numero_factura ?? ''), cliente: String(fac?.cliente_nombre ?? ''), moneda: String(fac?.moneda ?? 'CRC'),
    condicion: String(fac?.condicion_venta ?? ''), estadoFactura: String(fac?.estado ?? ''), fechaFactura: String(fac?.fecha_emision ?? ''),
    total, abonado, saldo: r2(Math.max(0, total - abonado)), ivaTotal, ivaCobrado,
    // IVA que aún no se ha declarado: al día 90 se declara aunque no hayan pagado
    ivaPendiente: vencido ? 0 : r2(Math.max(0, ivaTotal - ivaCobrado)),
    ivaDeclaradoAl90: vencido ? r2(Math.max(0, ivaTotal - ivaCobrado)) : 0,
    fechaLimite: limite, vencido,
    diasRestantes: limite ? Math.ceil((new Date(limite + 'T12:00:00').getTime() - new Date(hoy + 'T12:00:00').getTime()) / 86400000) : 0,
    abonos,
  };
}

export async function saldoFactura(db: Client, facturaId: string) {
  const e = await estadoCredito(db, facturaId);
  return { total: e.total, cobrado: e.abonado, saldo: e.saldo, condicion: e.condicion, estado: e.estadoFactura };
}

export async function tieneAbonos(db: Client, referencia: string): Promise<boolean> {
  const { rows } = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM documentos_emitidos WHERE ${ESTADOS_VALIDOS} AND recibo_de IN (SELECT id FROM documentos_emitidos WHERE clave = ? OR numero_factura = ?)`,
    args: [referencia, referencia],
  });
  return Number(rows[0]?.n ?? 0) > 0;
}

// Todas las ventas a crédito con recibo que no están cobradas (Ventas y Dashboard)
export async function creditosAbiertos(db: Client) {
  const { rows } = await db.execute(`SELECT id FROM documentos_emitidos
    WHERE tipo = 'Factura electrónica' AND condicion_venta IN ('08', '10') AND estado = 'Aceptado' ORDER BY fecha_emision`);
  const out = [];
  for (const r of rows) out.push(await estadoCredito(db, String(r.id)));
  return out;
}

export interface DatosAbono { fechaPago: string; monto: number; medio: string; descripcion?: string; comprobante?: string }

export async function registrarAbono(db: Client, facturaId: string, a: DatosAbono): Promise<CrearDocumentoResultado | { error: string }> {
  const hoy = new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(a.fechaPago))) return { error: 'Indica la fecha en que se recibió el abono.' };
  if (a.fechaPago > hoy) return { error: 'La fecha del abono no puede ser futura: el recibo se emite cuando el dinero ya se recibió.' };
  if (!a.medio) return { error: 'Indica el medio de pago del abono.' };
  const { rows } = await db.execute({ sql: 'SELECT * FROM documentos_emitidos WHERE id = ?', args: [facturaId] });
  const doc = rows[0];
  if (!doc) return { error: 'No se encontró la factura.' };
  const condicionRecibo = CONDICIONES_CON_RECIBO[String(doc.condicion_venta)];
  if (doc.tipo !== 'Factura electrónica' || !condicionRecibo) return { error: 'Los abonos con recibo electrónico solo aplican a facturas emitidas con «Generar recibo electrónico de pago».' };
  if (String(doc.estado) !== 'Aceptado') return { error: `La factura tiene que estar aceptada por ${autoridad()}.` };
  const { saldo } = await saldoFactura(db, facturaId);
  const monto = r2(Number(a.monto));
  if (!(monto > 0)) return { error: 'Indica el monto del abono.' };
  if (monto > saldo + 0.01) return { error: `El abono supera el saldo pendiente (${saldo.toFixed(2)}).` };

  // Una línea «Abono» por cada tarifa de IVA de la factura, en proporción (sin CABYS)
  const { rows: lineas } = await db.execute({ sql: 'SELECT * FROM documentos_emitidos_lineas WHERE documento_id = ?', args: [facturaId] });
  const porTarifa = new Map<string, { base: number; tarifa: number }>();
  for (const l of lineas) {
    const k = String(l.codigo_tarifa ?? '08');
    const base = Number(l.cantidad) * Number(l.precio_unitario) - Number(l.descuento ?? 0);
    const t = porTarifa.get(k) ?? { base: 0, tarifa: Number(l.impuesto ?? 0) };
    t.base += base; porTarifa.set(k, t);
  }
  const proporcion = monto / Number(doc.total);
  const descripcion = (a.descripcion || 'Abono').trim().slice(0, 180);
  const grupos = [...porTarifa.entries()];
  const res = await crearDocumento({
    tipo: TIPO_REP,
    emisorId: String(doc.emisor_id ?? ''), cajaId: String(doc.caja_id ?? ''),
    clienteId: doc.cliente_id ? String(doc.cliente_id) : null, receptorNombre: String(doc.cliente_nombre ?? ''),
    receptorTipoIdentificacion: doc.receptor_tipo_identificacion ? String(doc.receptor_tipo_identificacion) : undefined,
    receptorNumeroIdentificacion: doc.receptor_identificacion ? String(doc.receptor_identificacion) : undefined,
    receptorEmail: doc.receptor_email ? String(doc.receptor_email) : undefined,
    condicionVenta: condicionRecibo, medioPago: [a.medio],
    moneda: doc.moneda === 'USD' ? 'USD' : 'CRC', tipoCambio: Number(doc.tipo_cambio ?? 1),
    actividadReceptor: doc.actividad_receptor ? String(doc.actividad_receptor) : undefined,
    // El recibo lleva la misma actividad de la empresa que su factura
    actividadEmisor: doc.actividad_emisor ? String(doc.actividad_emisor) : undefined,
    referencia: { tipoDocumento: String(doc.tipo), numero: String(doc.clave || doc.numero_factura), fecha: String(doc.fecha_emision), codigo: '04', razon: `Abono a la factura ${doc.numero_factura}` },
    lineas: grupos.map(([codigo, g]) => ({
      codigoCabys: '', descripcion: grupos.length > 1 ? `${descripcion} · IVA ${g.tarifa}%` : descripcion, cantidad: 1,
      precioUnitario: Math.round(g.base * proporcion * 100000) / 100000, impuesto: g.tarifa, codigoTarifa: codigo, unidadMedida: 'Unid',
    })),
    observaciones: [`Abono recibido el ${a.fechaPago}`, a.comprobante ? `comprobante ${a.comprobante}` : ''].filter(Boolean).join(' · '),
  });
  if ('error' in res) return res;
  await db.execute({
    sql: 'UPDATE documentos_emitidos SET recibo_de = ?, abono_json = ? WHERE id = ?',
    args: [facturaId, JSON.stringify({ fechaPago: a.fechaPago, medio: a.medio, descripcion, comprobante: a.comprobante ?? '' }), res.id],
  });
  return res;
}
