import { jsPDF } from 'jspdf';

// El "acuse" del lado de Compras es distinto al de Ventas: cuando uno
// RECIBE una factura electrónica, Hacienda exige mandar de vuelta un
// "mensaje receptor" (aceptación o rechazo) — este es ese acuse, no el
// comprobante en sí (eso lo generó el proveedor, no nosotros).
export interface CompraParaAcuse {
  id: string;
  proveedor: string;
  numeroFactura: string;
  fechaEmision: string;
  fechaAceptacion: string | null;
  estado: string;
  totalFactura: number;
}

export function descargarAcuseCompra(c: CompraParaAcuse) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const M = 48;
  let y = M;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('Mensaje receptor: acuse de recepción', M, y); y += 22;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(90);
  pdf.text('Confirmación enviada a Hacienda sobre esta factura de compra. Documento de prueba (datos de ejemplo)', M, y); y += 26;
  pdf.setTextColor(20);

  const rows: [string, string][] = [
    ['ID interno', c.id],
    ['Proveedor', c.proveedor],
    ['# Factura del proveedor', c.numeroFactura],
    ['Fecha de emisión', new Date(c.fechaEmision).toLocaleString('es-CR')],
    ['Estado del mensaje', c.estado],
    ['Fecha del mensaje', c.fechaAceptacion ? new Date(c.fechaAceptacion).toLocaleString('es-CR') : '-'],
    ['Total de la factura', '$' + c.totalFactura.toLocaleString('en-US', { minimumFractionDigits: 2 })],
  ];

  pdf.setFontSize(11);
  for (const [label, value] of rows) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label + ':', M, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, M + 170, y);
    y += 20;
  }

  pdf.save(`acuse-compra-${c.id}.pdf`);
}
