'use client';
// Comprobante estándar de una operación (cobro, pago, anticipo, gestión,
// depósito, transferencia, cheque…) y de sus constancias de retención. Mismo
// formato en pantalla, al descargarlo (PDF) y al imprimirlo:
//   · Empresa: nombre, identificación, dirección y autorización.
//   · Título en franja gris y «Documento No.».
//   · Datos del tercero (razón social e identificación) y del pago (fecha y medio).
//   · Concepto, tabla de documentos y total.
//   · Franja «FIRMAS» con firma de quien emite y de quien recibe.
// Sin dependencias del resto del proyecto: se copia igual en cada módulo.
import type { jsPDF } from 'jspdf';
import { useState } from 'react';
import { imprimirPdfDoc, sanearPdf } from './documentoEstandar';

export interface ComprobanteDoc {
  empresa: { nombre: string; identificacion: string; direccion?: string; autorizacion?: string };
  titulo: string;                       // p. ej. RECIBO DE COBRO
  numero: string;                       // Documento No.
  rolTercero: string;                   // CLIENTE, PROVEEDOR, RETENIDO, BENEFICIARIO…
  tercero: { nombre: string; identificacion: string };
  fecha: string;                        // «San José, 15 de octubre de 2026»
  medioPago: string;
  seccion: string;                      // DATOS DEL COBRO, DATOS DE RETENCIÓN…
  concepto: string;
  columnas: { label: string; align?: 'left' | 'right' | 'center' }[];
  filas: string[][];
  simbolo: string;                      // ₡, $, Q
  total: number;
  etiquetaTotal: string;                // Total cobrado, Total retenido…
  firmas: [string, string];             // FIRMA DEL EMISOR / FIRMA DEL RECEPTOR
}

const FONT = 'Montserrat, system-ui, sans-serif';
export const montoDoc = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Vista en pantalla ────────────────────────────────────────────────────
export function HojaComprobante({ c }: { c: ComprobanteDoc }) {
  const banda = { background: '#D4D4D4', textAlign: 'center' as const, fontWeight: 700, fontSize: 13, padding: '4px 0', margin: '0 -10px' };
  const sub = { fontSize: 12, fontWeight: 700, textDecoration: 'underline', margin: '22px 0 12px' };
  const celda = { border: '1px solid #000', padding: '3px 8px', fontSize: 11.5 };
  return (
    <div style={{ background: '#fff', border: '3px solid #000', padding: '22px 28px', fontFamily: FONT, color: '#000', width: '100%', maxWidth: 760, margin: '0 auto', minHeight: 900, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.empresa.nombre.toUpperCase()}</div>
      <div style={{ fontSize: 12, marginTop: 6 }}>Identificación: {c.empresa.identificacion}</div>
      {c.empresa.direccion && <div style={{ fontSize: 12, marginTop: 4 }}>{c.empresa.direccion}</div>}
      {c.empresa.autorizacion && <div style={{ fontSize: 12, marginTop: 4 }}>{c.empresa.autorizacion}</div>}
      <div style={{ ...banda, marginTop: 22 }}>{c.titulo}</div>
      <div style={{ textAlign: 'center', fontSize: 13, marginTop: 6 }}>Documento No. {c.numero}</div>
      <div style={sub}>DATOS DEL {c.rolTercero}:</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', rowGap: 6, columnGap: 16, fontSize: 12 }}>
        <div><b>Razón social:</b> {c.tercero.nombre}</div><div><b>Fecha de pago:</b> {c.fecha}</div>
        <div><b>Identificación:</b> {c.tercero.identificacion || '-'}</div><div><b>Medio de pago:</b> {c.medioPago}</div>
      </div>
      <div style={sub}>{c.seccion}:</div>
      <div style={{ fontSize: 12, marginBottom: 14 }}><b>CONCEPTO:</b> {c.concepto}</div>
      <table style={{ width: 'calc(100% + 20px)', margin: '0 -10px', borderCollapse: 'collapse' }}>
        <thead><tr>{c.columnas.map(k => <th key={k.label} style={{ ...celda, fontWeight: 700, textAlign: 'center' }}>{k.label}</th>)}</tr></thead>
        <tbody>{c.filas.map((f, i) => <tr key={i}>{f.map((v, j) => <td key={j} style={{ ...celda, textAlign: c.columnas[j]?.align ?? 'left' }}>{v}</td>)}</tr>)}</tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13.5, marginTop: 18 }}>
        <span>{c.etiquetaTotal}</span><span>{c.simbolo} {montoDoc(c.total)}</span>
      </div>
      <div style={{ ...banda, marginTop: 40, textDecoration: 'underline' }}>FIRMAS</div>
      <div style={{ flex: 1, minHeight: 110 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12 }}><span>{c.firmas[0]}</span><span>{c.firmas[1]}</span></div>
    </div>
  );
}

// ── PDF (carta) ──────────────────────────────────────────────────────────
type JsPdf = jsPDF;
export async function pdfComprobantes(lista: ComprobanteDoc[]): Promise<JsPdf> {
  const { jsPDF } = await import('jspdf');
  const doc = sanearPdf(new jsPDF({ unit: 'pt', format: 'letter' }));
  const W = 612, M = 42;
  lista.forEach((c, n) => {
    if (n > 0) doc.addPage('letter', 'portrait');
    doc.setLineWidth(2.5); doc.setDrawColor(0); doc.rect(M - 12, M - 12, W - 2 * M + 24, 792 - 2 * M + 24);
    let y = M + 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(0); doc.text(c.empresa.nombre.toUpperCase(), M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    y += 16; doc.text(`Identificación: ${c.empresa.identificacion}`, M, y);
    if (c.empresa.direccion) { y += 13; doc.text(c.empresa.direccion, M, y); }
    if (c.empresa.autorizacion) { y += 13; doc.text(c.empresa.autorizacion, M, y); }
    const banda = (t: string, yy: number, sub = false) => {
      doc.setFillColor(212, 212, 212); doc.rect(M - 6, yy - 11, W - 2 * M + 12, 16, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(t, W / 2, yy, { align: 'center' });
      if (sub) { const w = doc.getTextWidth(t); doc.setLineWidth(0.6); doc.line(W / 2 - w / 2, yy + 2, W / 2 + w / 2, yy + 2); }
    };
    y += 28; banda(c.titulo, y);
    y += 18; doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.text(`Documento No. ${c.numero}`, W / 2, y, { align: 'center' });
    const subt = (t: string) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(t, M, y); doc.setLineWidth(0.6); doc.line(M, y + 2, M + doc.getTextWidth(t), y + 2); };
    const par = (et: string, v: string, x: number, yy: number) => { doc.setFont('helvetica', 'bold'); doc.text(et, x, yy); const w = doc.getTextWidth(et + ' '); doc.setFont('helvetica', 'normal'); doc.text(v, x + w, yy); };
    y += 34; subt(`DATOS DEL ${c.rolTercero}:`);
    y += 22; doc.setFontSize(9.5); par('Razón social:', c.tercero.nombre, M, y); par('Fecha de pago:', c.fecha, M + 230, y);
    y += 14; par('Identificación:', c.tercero.identificacion || '-', M, y); par('Medio de pago:', c.medioPago, M + 230, y);
    y += 30; subt(`${c.seccion}:`);
    y += 22; doc.setFontSize(9.5); par('CONCEPTO:', c.concepto, M, y);
    // Tabla con bordes
    y += 18; const ancho = W - 2 * M + 12, x0 = M - 6;
    const pesos = c.columnas.map((_, i) => (i === 2 && c.columnas.length >= 4 ? 1.5 : 1)); const suma = pesos.reduce((a, b) => a + b, 0);
    const cols = pesos.map(p => ancho * p / suma);
    const fila = (vals: string[], negrita: boolean) => {
      doc.setLineWidth(0.8); let x = x0;
      vals.forEach((v, j) => {
        doc.rect(x, y, cols[j], 16);
        doc.setFont('helvetica', negrita ? 'bold' : 'normal'); doc.setFontSize(9);
        const al = negrita ? 'center' : c.columnas[j]?.align ?? 'left';
        doc.text(v, al === 'right' ? x + cols[j] - 5 : al === 'center' ? x + cols[j] / 2 : x + 5, y + 11.5, { align: al });
        x += cols[j];
      });
      y += 16;
    };
    fila(c.columnas.map(k => k.label), true);
    c.filas.forEach(f => fila(f, false));
    y += 26; doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(c.etiquetaTotal, M, y); doc.text(`${c.simbolo} ${montoDoc(c.total)}`, W - M, y, { align: 'right' });
    y += 44; banda('FIRMAS', y, true);
    const yf = 792 - M - 6; doc.setFontSize(9.5); doc.text(c.firmas[0], M, yf); doc.text(c.firmas[1], W - M, yf, { align: 'right' });
  });
  return doc;
}

// ── Modal: ver, descargar e imprimir ─────────────────────────────────────
export default function ComprobanteOperacionModal({ titulo, comprobantes, archivo, onClose, marca = '#243B84' }: {
  titulo: string; comprobantes: ComprobanteDoc[]; archivo: string; onClose: () => void; marca?: string;
}) {
  const [i, setI] = useState(0);
  const [trabajando, setTrabajando] = useState(false);
  const actual = comprobantes[i];
  async function descargar() { setTrabajando(true); try { (await pdfComprobantes(comprobantes)).save(`${archivo}.pdf`); } finally { setTrabajando(false); } }
  async function imprimir() { setTrabajando(true); try { imprimirPdfDoc(await pdfComprobantes(comprobantes)); } finally { setTrabajando(false); } }
  const btn = (primario: boolean) => ({ height: 32, padding: '0 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: FONT, cursor: 'pointer',
    border: primario ? 'none' : '1px solid #ECECEC', background: primario ? marca : '#fff', color: primario ? '#fff' : '#0F0F0F', opacity: trabajando ? 0.6 : 1 });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div role="dialog" aria-label={titulo} onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 980, height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: FONT }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #ECECEC', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</span>
          <button onClick={imprimir} disabled={trabajando} style={btn(false)}>Imprimir</button>
          <button onClick={descargar} disabled={trabajando} style={btn(true)}>Descargar PDF</button>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', fontSize: 20, color: '#757575', cursor: 'pointer', marginLeft: 4 }}>×</button>
        </div>
        {comprobantes.length > 1 && (
          <div style={{ display: 'flex', gap: 4, padding: '8px 20px', borderBottom: '1px solid #ECECEC', flexShrink: 0, flexWrap: 'wrap' }}>
            {comprobantes.map((c, k) => (
              <button key={k} onClick={() => setI(k)} style={{ height: 28, padding: '0 12px', borderRadius: 14, fontSize: 11.5, fontFamily: FONT, cursor: 'pointer',
                border: `1px solid ${k === i ? marca : '#ECECEC'}`, background: k === i ? '#F1F3FA' : '#fff', color: '#0F0F0F' }}>{c.titulo.charAt(0) + c.titulo.slice(1).toLowerCase()}</button>
            ))}
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', background: '#F9F9F9', padding: 24 }}>{actual ? <HojaComprobante c={actual} /> : null}</div>
      </div>
    </div>
  );
}
