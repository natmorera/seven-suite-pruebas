import { jsPDF } from 'jspdf';
import { datosImpresion, esAngosto, LEYENDA_HACIENDA, type DocCompleto, type FormatoImpresion } from './representacion';

// PDF del comprobante en formato carta, tiquete (80 mm) o el del módulo de
// origen (Front: carta con folio; POS: tiquete con la cuenta).
export async function descargarComprobantePdf(docOId: DocCompleto | string, formato: FormatoImpresion = 'carta') {
  const doc: DocCompleto = typeof docOId === 'string'
    ? await fetch(`/api/documentos/${docOId.replace('#', '')}`).then(r => r.json())
    : docOId.lineas ? docOId : await fetch(`/api/documentos/${String(docOId.id).replace('#', '')}`).then(r => r.json());
  const d = datosImpresion(doc);
  const angosto = esAngosto(doc, formato);
  const nombre = `${d.encabezado.consecutivo || String(doc.id).replace('#', '')}${formato === 'carta' ? '' : '-' + formato}.pdf`;
  if (angosto) tiquete(doc, d).save(nombre);
  else carta(doc, d).save(nombre);
}

type D = ReturnType<typeof datosImpresion>;

function carta(doc: DocCompleto, d: D) {
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), M = 40;
  let y = M;
  const texto = (t: string, x: number, yy: number, o: { b?: boolean; s?: number; c?: number; a?: 'left' | 'right' | 'center'; w?: number } = {}) => {
    pdf.setFont('helvetica', o.b ? 'bold' : 'normal'); pdf.setFontSize(o.s ?? 9); pdf.setTextColor(o.c ?? 20);
    const lineas = o.w ? pdf.splitTextToSize(t, o.w) : [t];
    pdf.text(lineas, x, yy, { align: o.a ?? 'left' });
    return lineas.length * (o.s ?? 9) * 1.25;
  };
  const saltoSiHaceFalta = (alto: number) => { if (y + alto > H - M) { pdf.addPage(); y = M; } };

  texto(d.emisor.nombre, M, y, { b: true, s: 14 });
  texto(d.encabezado.titulo, W - M, y, { b: true, s: 12, a: 'right' }); y += 16;
  texto(`Cédula ${d.emisor.cedula}`, M, y, { c: 80 });
  texto(`N.º ${d.encabezado.consecutivo}`, W - M, y, { a: 'right' }); y += 12;
  y += texto(d.emisor.direccion, M, y, { c: 80, w: 300 });
  texto(`Fecha ${d.encabezado.fecha}`, W - M, y - 12, { a: 'right', c: 80 });
  texto([d.emisor.telefono, d.emisor.correo].filter(Boolean).join(' · '), M, y, { c: 80 }); y += 18;
  texto('Clave', M, y, { c: 110, s: 8 }); y += 10;
  texto(d.encabezado.clave || 'Se genera al emitir', M, y, { s: 8.5 }); y += 18;

  pdf.setDrawColor(210, 210, 210); pdf.roundedRect(M, y, W - 2 * M, 58, 4, 4); y += 14;
  texto(doc.tipo === 'Factura electrónica de compra' ? 'Proveedor (vendedor)' : 'Receptor', M + 10, y, { c: 110, s: 8 }); texto('Condiciones', W / 2 + 10, y, { c: 110, s: 8 }); y += 12;
  texto(d.receptor.nombre, M + 10, y, { b: true, s: 10 }); texto(`${d.encabezado.condicion} · ${d.encabezado.medios || '-'}`, W / 2 + 10, y); y += 12;
  texto([d.receptor.identificacion && `Id. ${d.receptor.identificacion}`, d.receptor.correo].filter(Boolean).join(' · '), M + 10, y, { c: 80 });
  texto(`Moneda: ${d.encabezado.moneda}`, W / 2 + 10, y, { c: 80 }); y += 12;
  y += 26;

  const cols = [M, M + 250, M + 300, M + 380, M + 440, W - M];
  pdf.setFillColor(245, 245, 245); pdf.rect(M, y - 10, W - 2 * M, 16, 'F');
  ['Descripción', 'Cant.', 'Precio', 'Desc.', 'IVA', 'Total'].forEach((h, i) => texto(h, i === 0 ? cols[0] + 4 : cols[i] + (i === 5 ? -4 : 50), y, { b: true, s: 8, a: i === 0 ? 'left' : 'right' }));
  y += 16;
  for (const l of d.lineas) {
    const alto = Math.max(12, pdf.splitTextToSize(l.descripcion, 240).length * 11) + 10;
    saltoSiHaceFalta(alto);
    texto(l.descripcion, cols[0] + 4, y, { w: 240 });
    texto(`CABYS ${l.codigo}`, cols[0] + 4, y + alto - 12, { s: 7, c: 120 });
    texto(String(l.cantidad), cols[1] + 50, y, { a: 'right' });
    texto(d.m(l.precio), cols[2] + 50, y, { a: 'right' });
    texto(l.descuento ? d.m(l.descuento) : '-', cols[3] + 50, y, { a: 'right' });
    texto(`${l.tarifa}%`, cols[4] + 50, y, { a: 'right' });
    texto(d.m(l.total), cols[5] - 4, y, { a: 'right', b: true });
    y += alto; pdf.setDrawColor(235, 235, 235); pdf.line(M, y - 8, W - M, y - 8);
  }
  for (const c of d.cargos) { saltoSiHaceFalta(14); texto(String(c.detalle ?? 'Otro cargo'), cols[0] + 4, y, { c: 80 }); texto(d.m(c.montoCalculado ?? c.monto), cols[5] - 4, y, { a: 'right' }); y += 14; }

  saltoSiHaceFalta(110);
  y += 6;
  const fila = (l: string, v: string, fuerte = false) => { texto(l, W - M - 200, y, { c: fuerte ? 20 : 80, b: fuerte, s: fuerte ? 11 : 9 }); texto(v, W - M, y, { a: 'right', b: fuerte, s: fuerte ? 11 : 9 }); y += fuerte ? 16 : 13; };
  const yTotales = y;
  if (d.totales.descuentos) fila('Descuentos', '- ' + d.m(d.totales.descuentos));
  fila('Subtotal', d.m(d.totales.subtotal));
  fila('Impuestos', d.m(d.totales.iva));
  if (d.totales.otros) fila('Otros cargos', d.m(d.totales.otros));
  fila('Total', d.m(d.totales.total), true);
  if (d.qr) pdf.addImage(d.qr, 'PNG', M, yTotales - 8, 84, 84);
  y = Math.max(y, yTotales + 84) + 10;
  if (d.referencia) y += texto(`Referencia: ${d.referencia}`, M, y, { c: 80, w: W - 2 * M });
  if (d.observaciones) y += texto(`Observaciones: ${d.observaciones}`, M, y, { c: 80, w: W - 2 * M });
  texto(LEYENDA_HACIENDA, W / 2, H - 24, { s: 7.5, c: 120, a: 'center' });
  return pdf;
}

function tiquete(doc: DocCompleto, d: D) {
  const ANCHO = 226; // 80 mm
  const alto = 300 + d.lineas.length * 34 + d.cargos.length * 12 + (d.qr ? 110 : 0);
  const pdf = new jsPDF({ unit: 'pt', format: [ANCHO, alto] });
  const M = 12, C = ANCHO / 2;
  let y = 22;
  const t = (s: string, x: number, o: { b?: boolean; s?: number; a?: 'left' | 'right' | 'center'; w?: number } = {}) => {
    pdf.setFont('courier', o.b ? 'bold' : 'normal'); pdf.setFontSize(o.s ?? 7.5); pdf.setTextColor(20);
    const ls = o.w ? pdf.splitTextToSize(s, o.w) : [s];
    pdf.text(ls, x, y, { align: o.a ?? 'left' });
    y += ls.length * (o.s ?? 7.5) * 1.3;
  };
  const raya = () => { pdf.setDrawColor(150, 150, 150); pdf.setLineDashPattern([2, 2], 0); pdf.line(M, y - 3, ANCHO - M, y - 3); pdf.setLineDashPattern([], 0); y += 6; };
  t(d.emisor.nombre, C, { a: 'center', b: true, s: 9, w: ANCHO - 2 * M });
  t(`Céd. ${d.emisor.cedula}`, C, { a: 'center' });
  if (d.emisor.telefono) t(`Tel. ${d.emisor.telefono}`, C, { a: 'center' });
  t(d.emisor.direccion, C, { a: 'center', w: ANCHO - 2 * M, s: 6.5 });
  raya();
  t(d.encabezado.titulo, C, { a: 'center', b: true });
  t(`N.º ${d.encabezado.consecutivo}`, C, { a: 'center' });
  t(d.encabezado.fecha, C, { a: 'center' });
  t(`Clave: ${d.encabezado.clave}`, M, { s: 5.5, w: ANCHO - 2 * M });
  raya();
  t(`Cliente: ${d.receptor.nombre}`, M, { w: ANCHO - 2 * M });
  if (d.receptor.identificacion) t(`Id.: ${d.receptor.identificacion}`, M);
  t(`${d.encabezado.condicion} · ${d.encabezado.medios || '-'}`, M, { w: ANCHO - 2 * M });
  raya();
  for (const l of d.lineas) {
    t(l.descripcion, M, { w: ANCHO - 2 * M });
    const yy = y;
    t(`${l.cantidad} x ${d.m(l.precio)}  IVA ${l.tarifa}%`, M);
    y = yy; t(d.m(l.total), ANCHO - M, { a: 'right', b: true });
  }
  for (const c of d.cargos) { const yy = y; t(String(c.detalle ?? 'Otro cargo'), M); y = yy; t(d.m(c.montoCalculado ?? c.monto), ANCHO - M, { a: 'right' }); }
  raya();
  const fila = (l: string, v: string, b = false) => { const yy = y; t(l, M, { b }); y = yy; t(v, ANCHO - M, { a: 'right', b }); };
  if (d.totales.descuentos) fila('Descuentos', '- ' + d.m(d.totales.descuentos));
  fila('Subtotal', d.m(d.totales.subtotal));
  fila('Impuestos', d.m(d.totales.iva));
  if (d.totales.otros) fila('Otros cargos', d.m(d.totales.otros));
  fila('TOTAL', d.m(d.totales.total), true);
  raya();
  if (d.qr) { pdf.addImage(d.qr, 'PNG', C - 45, y, 90, 90); y += 98; }
  t(LEYENDA_HACIENDA, C, { a: 'center', s: 5.5, w: ANCHO - 2 * M });
  return pdf;
}
