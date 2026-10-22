// Arma los comprobantes estándar de una operación bancaria: el recibo o
// comprobante de la operación y una constancia por cada tipo de retención.
import { montoDoc, type ComprobanteDoc } from './ComprobanteOperacion';

export type ClaseOperacion = 'Cobro' | 'Pago' | 'Anticipo de cliente' | 'Anticipo a proveedor' | 'Depósito' | 'Transferencia' | 'Cheque' | 'Liquidación de tarjetas';
export interface DocumentoAplicado { numero: string; fecha?: string; importe: number; aplicado: number }
export interface RetencionAplicada { tipo: string; documento: string; base: number; monto: number; porcentaje?: number }
export interface DatosOperacion {
  clase: ClaseOperacion;
  numero: string;
  empresa: { nombre: string; identificacion: string; direccion?: string };
  tercero: { nombre: string; identificacion?: string };
  fecha: string;                     // AAAA-MM-DD o DD/MM/AAAA
  medioPago: string;
  concepto: string;
  simbolo: string;
  importe: number;
  documentos: DocumentoAplicado[];
  retenciones?: RetencionAplicada[];
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function fechaLarga(f: string, lugar?: string): string {
  const m = f.match(/^(\d{4})-(\d{2})-(\d{2})/) ?? f.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return f || '-';
  const [a, mes, d] = f.includes('-') ? [m[1], m[2], m[3]] : [m[3], m[2], m[1]];
  const texto = `${Number(d)} de ${MESES[Number(mes) - 1]} de ${a}`;
  return lugar ? `${lugar}, ${texto}` : texto;
}

const TITULO: Record<ClaseOperacion, { titulo: string; rol: string; seccion: string; total: string; firmas: [string, string]; prefijo: string }> = {
  'Cobro': { titulo: 'RECIBO DE COBRO', rol: 'CLIENTE', seccion: 'DATOS DEL COBRO', total: 'Total cobrado', firmas: ['FIRMA DE QUIEN RECIBE', 'FIRMA DEL CLIENTE'], prefijo: 'RC' },
  'Pago': { titulo: 'COMPROBANTE DE PAGO', rol: 'PROVEEDOR', seccion: 'DATOS DEL PAGO', total: 'Total pagado', firmas: ['FIRMA DE QUIEN PAGA', 'FIRMA DEL PROVEEDOR'], prefijo: 'CP' },
  'Anticipo de cliente': { titulo: 'RECIBO DE ANTICIPO', rol: 'CLIENTE', seccion: 'DATOS DEL ANTICIPO', total: 'Total recibido', firmas: ['FIRMA DE QUIEN RECIBE', 'FIRMA DEL CLIENTE'], prefijo: 'RA' },
  'Anticipo a proveedor': { titulo: 'COMPROBANTE DE ANTICIPO', rol: 'PROVEEDOR', seccion: 'DATOS DEL ANTICIPO', total: 'Total anticipado', firmas: ['FIRMA DE QUIEN PAGA', 'FIRMA DEL PROVEEDOR'], prefijo: 'CA' },
  'Depósito': { titulo: 'COMPROBANTE DE DEPÓSITO', rol: 'BANCO', seccion: 'DATOS DEL DEPÓSITO', total: 'Total depositado', firmas: ['FIRMA DE QUIEN DEPOSITA', 'FIRMA DE QUIEN AUTORIZA'], prefijo: 'CD' },
  'Transferencia': { titulo: 'COMPROBANTE DE TRANSFERENCIA', rol: 'BENEFICIARIO', seccion: 'DATOS DE LA TRANSFERENCIA', total: 'Total transferido', firmas: ['FIRMA DE QUIEN ELABORA', 'FIRMA DE QUIEN AUTORIZA'], prefijo: 'CT' },
  'Cheque': { titulo: 'COMPROBANTE DE CHEQUE', rol: 'BENEFICIARIO', seccion: 'DATOS DEL CHEQUE', total: 'Total del cheque', firmas: ['FIRMA DE QUIEN EMITE', 'FIRMA DE QUIEN RECIBE'], prefijo: 'CK' },
  'Liquidación de tarjetas': { titulo: 'COMPROBANTE DE LIQUIDACIÓN DE TARJETAS', rol: 'AFILIADO', seccion: 'DATOS DE LA LIQUIDACIÓN', total: 'Total liquidado', firmas: ['FIRMA DE QUIEN ELABORA', 'FIRMA DE QUIEN AUTORIZA'], prefijo: 'CL' },
};

export function armarComprobantes(o: DatosOperacion): ComprobanteDoc[] {
  const t = TITULO[o.clase];
  const lugar = o.empresa.direccion?.split(',').map(x => x.trim()).filter(Boolean).pop();
  const base = {
    empresa: { nombre: o.empresa.nombre, identificacion: o.empresa.identificacion, direccion: o.empresa.direccion },
    tercero: { nombre: o.tercero.nombre, identificacion: o.tercero.identificacion ?? '' },
    fecha: fechaLarga(o.fecha, lugar), medioPago: o.medioPago, concepto: o.concepto, simbolo: o.simbolo,
  };
  const recibo: ComprobanteDoc = {
    ...base, titulo: t.titulo, numero: `${t.prefijo}-${o.numero}`, rolTercero: t.rol, seccion: t.seccion,
    columnas: [{ label: 'No. Documento' }, { label: 'Fecha', align: 'center' }, { label: 'Importe', align: 'right' }, { label: 'Importe aplicado', align: 'right' }],
    filas: o.documentos.length
      ? o.documentos.map(d => [d.numero, d.fecha ?? '', `${o.simbolo} ${montoDoc(d.importe)}`, `${o.simbolo} ${montoDoc(d.aplicado)}`])
      : [[o.concepto, fechaLarga(o.fecha), `${o.simbolo} ${montoDoc(o.importe)}`, `${o.simbolo} ${montoDoc(o.importe)}`]],
    total: o.importe, etiquetaTotal: t.total, firmas: t.firmas,
  };
  // Una constancia por tipo de retención (la emite quien retiene)
  const porTipo = new Map<string, RetencionAplicada[]>();
  for (const r of o.retenciones ?? []) porTipo.set(r.tipo, [...(porTipo.get(r.tipo) ?? []), r]);
  const constancias: ComprobanteDoc[] = [...porTipo.entries()].map(([tipo, lista], k) => ({
    ...base, titulo: `CONSTANCIA DE RETENCIÓN ${tipo.replace(/^retenci[oó]n\s*/i, '').toUpperCase()}`, numero: `CR${k + 1}-${o.numero}`,
    rolTercero: 'RETENIDO', seccion: 'DATOS DE RETENCIÓN',
    columnas: [{ label: 'No. Documento' }, { label: 'Importe', align: 'right' }, { label: '% Retención', align: 'center' }, { label: 'Importe retenido', align: 'right' }],
    filas: lista.map(r => [r.documento || '-', `${o.simbolo} ${montoDoc(r.base)}`,
      r.porcentaje ? `${r.porcentaje}% ${tipo.toLowerCase()}` : tipo.toLowerCase(), `${o.simbolo} ${montoDoc(r.monto)}`]),
    total: lista.reduce((a, r) => a + r.monto, 0), etiquetaTotal: 'Total retenido', firmas: ['FIRMA DEL RETENEDOR', 'FIRMA DEL RETENIDO'],
  }));
  return [recibo, ...constancias];
}
