// Documento estándar para exportar e imprimir reportes y listados (lineamiento
// de Front Desk, igual en todos los módulos):
//   · Encabezado: identidad (empresa en mayúsculas), título + período a la
//     derecha, línea de filtros («FILTROS: Etiqueta valor | …», o «Ninguno»),
//     divisor y tabla.
//   · Páginas 2 en adelante: encabezado compacto (título · período … Pág. N de M)
//     y títulos de columna repetidos.
//   · Pie: empresa · «Generado DD/MM/AAAA hh:mm» · «Página N de M».
//   · Formatos: PDF (tamaño libre o carta), XLS y CSV, con «Mostrar
//     encabezado» y «Mostrar filtros aplicados». Imprimir usa el mismo PDF.
// Sin dependencias del resto del proyecto: se copia igual en cada módulo.

import type { jsPDF } from 'jspdf';
export interface ColumnaDoc { key: string; label: string; align?: 'left' | 'right' }
export interface FiltroDoc { etiqueta: string; valor: string }
export interface FirmaDoc { nombre: string; cargo?: string }
export interface DocumentoReporte {
  empresa: string;
  titulo: string;
  periodo?: string;            // «DD/MM/AAAA al DD/MM/AAAA»
  filtros: FiltroDoc[];
  columnas: ColumnaDoc[];
  filas: Record<string, string | number>[];
  firmas?: FirmaDoc[];
}
export interface OpcionesDoc { encabezado: boolean; filtros: boolean; tamano: 'libre' | 'carta' }

// Convierte el subtítulo de los listados («Período: Este mes · Estado: todos ·
// 12 cheques») en período y filtros. Lo que no es «Etiqueta: valor» no es un
// filtro (conteos, fecha de generación) y no va en el encabezado.
export function filtrosDesdeTexto(texto?: string): { periodo?: string; filtros: FiltroDoc[] } {
  const filtros: FiltroDoc[] = []; let periodo: string | undefined;
  for (const parte of (texto ?? '').split(/\s+·\s+|\s+\|\s+/)) {
    const i = parte.indexOf(':');
    if (i <= 0) continue;
    const etiqueta = parte.slice(0, i).trim(); const valor = parte.slice(i + 1).trim().replace(/^"|"$/g, '');
    if (!valor || /^generado$/i.test(etiqueta)) continue;
    if (/^per[ií]odo$/i.test(etiqueta)) { periodo = valor; continue; }
    if (/^(todos|todas)\b/i.test(valor)) continue;   // valor por defecto: no es un filtro
    filtros.push({ etiqueta, valor });
  }
  return { periodo, filtros };
}

const dos = (n: number) => String(n).padStart(2, '0');
export const fechaHoraGeneracion = (d = new Date()) => {
  const h = d.getHours(); const h12 = h % 12 || 12;
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} · ${dos(h12)}:${dos(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
};
export const textoFiltros = (f: FiltroDoc[]) => f.length ? f.map(x => `${x.etiqueta} ${x.valor}`).join(' | ') : 'Ninguno (se muestran todos los registros)';

// Las fuentes estándar del PDF no tienen el símbolo del colón (₡): se escribe «CRC».
export function sanearPdf<T extends { text: (...a: never[]) => unknown }>(doc: T): T {
  const original = doc.text.bind(doc) as (t: unknown, ...resto: unknown[]) => unknown;
  const sanear = (t: unknown): unknown => typeof t === 'string' ? t.replace(/₡\s?/g, 'CRC ') : Array.isArray(t) ? t.map(sanear) : t;
  (doc as unknown as { text: (t: unknown, ...resto: unknown[]) => unknown }).text = (t, ...resto) => original(sanear(t), ...resto);
  return doc;
}

function bajar(nombre: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── CSV y XLS ────────────────────────────────────────────────────────────
function filasEncabezado(d: DocumentoReporte, o: OpcionesDoc): string[][] {
  const f: string[][] = [];
  if (o.encabezado) { f.push([d.empresa.toUpperCase()]); f.push([d.titulo, d.periodo ? `Período ${d.periodo}` : '']); }
  if (o.filtros) f.push([`Filtros: ${textoFiltros(d.filtros)}`]);
  if (f.length) f.push([]);
  return f;
}
export function descargarCsv(d: DocumentoReporte, o: OpcionesDoc, archivo: string) {
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lineas = [...filasEncabezado(d, o).map(f => f.map(q).join(',')), d.columnas.map(c => q(c.label)).join(','),
    ...d.filas.map(r => d.columnas.map(c => q(r[c.key])).join(','))];
  bajar(`${archivo}.csv`, new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
}
const xml = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function descargarXls(d: DocumentoReporte, o: OpcionesDoc, archivo: string) {
  const celda = (v: unknown, estilo = '') => {
    const n = typeof v === 'number' ? v : null;
    return `<Cell${estilo ? ` ss:StyleID="${estilo}"` : ''}><Data ss:Type="${n === null ? 'String' : 'Number'}">${xml(v)}</Data></Cell>`;
  };
  const filas = [
    ...filasEncabezado(d, o).map((f, i) => `<Row>${f.map(v => celda(v, i === 1 && o.encabezado ? 'titulo' : 'gris')).join('')}</Row>`),
    `<Row>${d.columnas.map(c => celda(c.label, 'th')).join('')}</Row>`,
    ...d.filas.map(r => `<Row>${d.columnas.map(c => celda(r[c.key])).join('')}</Row>`),
  ];
  const libro = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="th"><Font ss:Bold="1"/><Interior ss:Color="#F5F5F5" ss:Pattern="Solid"/></Style><Style ss:ID="titulo"><Font ss:Bold="1" ss:Size="14"/></Style><Style ss:ID="gris"><Font ss:Color="#757575"/></Style></Styles>
<Worksheet ss:Name="${xml(d.titulo.slice(0, 31))}"><Table>${filas.join('')}</Table></Worksheet></Workbook>`;
  bajar(`${archivo}.xls`, new Blob([libro], { type: 'application/vnd.ms-excel' }));
}

// ── PDF ──────────────────────────────────────────────────────────────────
// Carta: 8.5 × 11 in con márgenes de 0.75 in (en puntos: 612 × 792, margen 54).
// Tamaño libre: el ancho crece para que quepan las columnas sin reducir texto.
type JsPdf = jsPDF;
export async function generarPdf(d: DocumentoReporte, o: OpcionesDoc): Promise<JsPdf> {
  const { jsPDF } = await import('jspdf');
  const M = 54; const tamTexto = o.tamano === 'carta' ? 7.5 : 8.5;
  // Ancho de cada columna según su contenido más largo
  const medir = new jsPDF({ unit: 'pt' }); medir.setFont('helvetica', 'normal'); medir.setFontSize(tamTexto);
  const anchos = d.columnas.map(c => Math.min(220, Math.max(medir.getTextWidth(c.label) + 14,
    ...d.filas.slice(0, 400).map(r => medir.getTextWidth(String(r[c.key] ?? '')) + 14), 40)));
  const necesario = anchos.reduce((a, b) => a + b, 0) + 2 * M;
  const ancho = o.tamano === 'carta' ? 612 : Math.max(612, necesario);
  const alto = o.tamano === 'carta' ? 792 : Math.max(792, Math.round(ancho * 792 / 612));
  const doc = sanearPdf(new jsPDF({ unit: 'pt', format: [ancho, alto], orientation: ancho > alto ? 'landscape' : 'portrait' }));
  const util = ancho - 2 * M;
  // La tabla ocupa todo el ancho útil, igual que el encabezado
  const escala = util / anchos.reduce((a, b) => a + b, 0);
  const cols = anchos.map(a => a * escala);
  const gris = (v: number) => doc.setTextColor(v, v, v);
  const recortar = (t: string, w: number) => { let s = t; while (s.length > 1 && doc.getTextWidth(s) > w - 8) s = s.slice(0, -2) + '…'; return s; };

  let y = M;
  const encabezadoCompleto = () => {
    if (o.encabezado) {
      doc.setFillColor(36, 59, 132); doc.rect(M, y, 9, 9, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); gris(60); doc.text(d.empresa.toUpperCase(), M + 14, y + 7.5, { charSpace: 0.8 });
      y += 30;
      doc.setFontSize(18); gris(15); doc.text(d.titulo, M, y);
      if (d.periodo) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); gris(140); doc.text('Período', ancho - M, y - 12, { align: 'right' });
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); gris(15); doc.text(d.periodo, ancho - M, y, { align: 'right' });
      }
      y += 16;
    }
    if (o.filtros) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); gris(60); doc.text('FILTROS:', M, y);
      let x = M + doc.getTextWidth('FILTROS:') + 6;
      const partes = d.filtros.length ? d.filtros : [{ etiqueta: '', valor: 'Ninguno' }];
      partes.forEach((f, i) => {
        const ancho1 = (f.etiqueta ? doc.setFont('helvetica', 'normal').getTextWidth(f.etiqueta + ' ') : 0) + doc.setFont('helvetica', 'bold').getTextWidth(f.valor) + 14;
        if (x + ancho1 > ancho - M) { x = M; y += 11; }
        if (f.etiqueta) { doc.setFont('helvetica', 'normal'); gris(140); doc.text(f.etiqueta, x, y); x += doc.getTextWidth(f.etiqueta + ' '); }
        doc.setFont('helvetica', 'bold'); gris(15); doc.text(f.valor, x, y); x += doc.getTextWidth(f.valor);
        if (!d.filtros.length) { doc.setFont('helvetica', 'normal'); gris(150); doc.text(' (se muestran todos los registros)', x, y); }
        if (i < partes.length - 1) { gris(190); doc.setFont('helvetica', 'normal'); doc.text('  |  ', x, y); x += doc.getTextWidth('  |  '); }
      });
      y += 10;
    }
    if (o.encabezado || o.filtros) { doc.setDrawColor(225); doc.line(M, y, ancho - M, y); y += 14; }
  };
  const encabezadoCompacto = () => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); gris(15); doc.text(d.titulo, M, y);
    if (d.periodo) { const w = doc.getTextWidth(d.titulo); doc.setFont('helvetica', 'normal'); gris(140); doc.text(`  ·  ${d.periodo}`, M + w, y); }
    y += 8; doc.setDrawColor(225); doc.line(M, y, ancho - M, y); y += 12;
  };
  const tituloColumnas = () => {
    doc.setFillColor(245, 245, 245); doc.rect(M, y - 10, util, 16, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(tamTexto - 0.5); gris(90);
    let x = M;
    d.columnas.forEach((c, i) => { doc.text(recortar(c.label, cols[i]), c.align === 'right' ? x + cols[i] - 5 : x + 5, y, { align: c.align === 'right' ? 'right' : 'left' }); x += cols[i]; });
    y += 14;
  };
  const limite = alto - M - 24;
  encabezadoCompleto(); tituloColumnas();
  doc.setFont('helvetica', 'normal'); doc.setFontSize(tamTexto);
  if (!d.filas.length) { gris(150); doc.text('Sin datos para los filtros aplicados.', M + 5, y); y += 14; }
  d.filas.forEach((r, k) => {
    if (y > limite) {
      doc.addPage([ancho, alto], ancho > alto ? 'landscape' : 'portrait'); y = M;
      encabezadoCompacto(); tituloColumnas(); doc.setFont('helvetica', 'normal'); doc.setFontSize(tamTexto);
    }
    const ultima = k === d.filas.length - 1 && /^total/i.test(String(r[d.columnas[0]?.key] ?? ''));
    doc.setFont('helvetica', ultima ? 'bold' : 'normal'); gris(30);
    let x = M;
    d.columnas.forEach((c, i) => { doc.text(recortar(String(r[c.key] ?? ''), cols[i]), c.align === 'right' ? x + cols[i] - 5 : x + 5, y, { align: c.align === 'right' ? 'right' : 'left' }); x += cols[i]; });
    doc.setDrawColor(238); doc.line(M, y + 5, ancho - M, y + 5);
    y += 15;
  });
  if (d.firmas?.length) {
    if (y + 70 > limite) { doc.addPage([ancho, alto], ancho > alto ? 'landscape' : 'portrait'); y = M; encabezadoCompacto(); }
    y += 50; const w = util / d.firmas.length;
    d.firmas.forEach((f, i) => {
      const cx = M + w * i + w / 2; doc.setDrawColor(120); doc.line(cx - w * 0.35, y, cx + w * 0.35, y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); gris(15); doc.text(f.nombre, cx, y + 11, { align: 'center' });
      if (f.cargo) { doc.setFont('helvetica', 'normal'); gris(120); doc.text(f.cargo, cx, y + 21, { align: 'center' }); }
    });
  }
  // Pie de cada página y total de páginas
  const total = doc.getNumberOfPages(); const generado = `Generado ${fechaHoraGeneracion()}`;
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const yp = alto - M + 6; doc.setDrawColor(225); doc.line(M, yp - 12, ancho - M, yp - 12);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); gris(60); doc.text(d.empresa.toUpperCase(), M, yp, { charSpace: 0.6 });
    doc.setFont('helvetica', 'normal'); gris(140); doc.text(generado, ancho / 2, yp, { align: 'center' });
    doc.text(`Página ${p} de ${total}`, ancho - M, yp, { align: 'right' });
    // Encabezado compacto de las páginas siguientes: «Pág. N de M» a la derecha
    if (p > 1) { doc.setFontSize(8.5); doc.text(`Pág. ${p} de ${total}`, ancho - M, M, { align: 'right' }); }
  }
  return doc;
}

export async function descargarPdf(d: DocumentoReporte, o: OpcionesDoc, archivo: string) {
  (await generarPdf(d, o)).save(`${archivo}.pdf`);
}

// Imprime el PDF en un marco oculto: el diálogo de impresión del navegador
// permite elegir la impresora.
export function imprimirPdfDoc(doc: JsPdf) {
  const url = URL.createObjectURL(doc.output('blob'));
  const marco = document.createElement('iframe');
  marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  marco.src = url;
  marco.onload = () => { setTimeout(() => { marco.contentWindow?.focus(); marco.contentWindow?.print(); }, 200); };
  document.body.appendChild(marco);
  setTimeout(() => { URL.revokeObjectURL(url); marco.remove(); }, 120000);
}
export async function imprimirPdf(d: DocumentoReporte, o: OpcionesDoc) { imprimirPdfDoc(await generarPdf(d, o)); }
