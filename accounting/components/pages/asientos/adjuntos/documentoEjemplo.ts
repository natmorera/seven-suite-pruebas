// Contenido de ejemplo de los archivos adjuntos de un asiento. El prototipo no
// guarda archivos reales: la vista previa y la descarga se generan a partir de
// los datos del asiento. Con backend, aquí se pide el archivo al servidor.
export interface ContextoDocumento { titulo: string; consecutivo: string; fecha: string; moneda: 'CRC' | 'USD'; importe: number; empresa: string; identificacion: string }
type TipoArchivo = 'pdf' | 'xml' | 'hoja' | 'imagen' | 'otro';

export function tipoDeArchivo(nombre: string): TipoArchivo {
  const ext = nombre.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'xml') return 'xml';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'hoja';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'imagen';
  return 'otro';
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SIMBOLO = { CRC: '₡', USD: '$' } as const;

// Detalle del comprobante: tres líneas que suman el importe del asiento
export function lineasDocumento(c: ContextoDocumento) {
  const partes = [0.6, 0.3, 0.1];
  return partes.map((p, i) => ({
    linea: i + 1,
    descripcion: [c.titulo, 'Servicios complementarios', 'Cargos administrativos'][i],
    cantidad: 1,
    monto: Math.round(c.importe * p * 100) / 100,
  }));
}

export const montoTexto = (c: ContextoDocumento, n: number) => `${SIMBOLO[c.moneda]} ${fmt(n)}`;

export function xmlDocumento(nombre: string, c: ContextoDocumento): string {
  const lineas = lineasDocumento(c).map(l =>
    `    <LineaDetalle>\n      <NumeroLinea>${l.linea}</NumeroLinea>\n      <Detalle>${l.descripcion}</Detalle>\n      <Cantidad>${l.cantidad}</Cantidad>\n      <MontoTotal>${l.monto.toFixed(2)}</MontoTotal>\n    </LineaDetalle>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<Comprobante archivo="${nombre}">
  <Emisor>
    <Nombre>${c.empresa}</Nombre>
    <Identificacion>${c.identificacion}</Identificacion>
  </Emisor>
  <FechaEmision>${c.fecha}</FechaEmision>
  <Referencia>${c.consecutivo}</Referencia>
  <CodigoMoneda>${c.moneda}</CodigoMoneda>
  <DetalleServicio>
${lineas}
  </DetalleServicio>
  <TotalComprobante>${c.importe.toFixed(2)}</TotalComprobante>
</Comprobante>
`;
}

export function hojaDocumento(c: ContextoDocumento): string[][] {
  return [['Línea', 'Descripción', 'Cantidad', `Monto (${c.moneda})`], ...lineasDocumento(c).map(l => [String(l.linea), l.descripcion, String(l.cantidad), l.monto.toFixed(2)])];
}

function bajar(nombre: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}

export async function descargarDocumento(nombre: string, c: ContextoDocumento) {
  const tipo = tipoDeArchivo(nombre);
  if (tipo === 'xml') { bajar(nombre, new Blob([xmlDocumento(nombre, c)], { type: 'application/xml' })); return; }
  if (tipo === 'hoja') {
    const csv = '\uFEFF' + hojaDocumento(c).map(f => f.join(';')).join('\r\n');
    bajar(nombre.replace(/\.(xlsx|xls)$/i, '.csv'), new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    return;
  }
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.setFontSize(14); doc.text(c.empresa, 20, 20);
  doc.setFontSize(10); doc.text(`Identificación: ${c.identificacion}`, 20, 27);
  doc.text(`Documento: ${nombre}`, 20, 40); doc.text(`Asiento: ${c.consecutivo}   Fecha: ${c.fecha}`, 20, 46);
  let y = 60;
  for (const l of lineasDocumento(c)) { doc.text(`${l.linea}. ${l.descripcion}`, 20, y); doc.text(`${c.moneda} ${fmt(l.monto)}`, 190, y, { align: 'right' }); y += 7; }
  doc.text(`Total: ${c.moneda} ${fmt(c.importe)}`, 190, y + 6, { align: 'right' });
  doc.save(nombre.toLowerCase().endsWith('.pdf') ? nombre : `${nombre}.pdf`);
}
