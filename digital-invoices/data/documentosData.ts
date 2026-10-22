// Datos de ejemplo para "Documentos emitidos". En producción, cada fila viene
// de la respuesta de Hacienda (TRIBU-CR) al enviar el XML 4.4: el estado pasa
// de 'Procesando' a 'Aceptado' o 'Rechazado' según el mensaje de Hacienda.

export type EstadoDocumento = 'Procesando' | 'Aceptado' | 'Rechazado';
export type CondicionVenta = 'Contado' | 'Crédito';

export interface DocumentoEmitido {
  id: string;              // ID interno correlativo (#24053)
  numeroFactura: string;   // Clave/consecutivo de Hacienda (50 dígitos en la realidad; se muestra truncado)
  cliente: string;
  fechaEmision: string;    // ISO
  estado: EstadoDocumento;
  recurrente: boolean;
  condicionVenta: CondicionVenta;
  totalFactura: number;
}

export const DOCUMENTOS_EMITIDOS: DocumentoEmitido[] = [
  { id: '#24053', numeroFactura: '000001000000183', cliente: 'Hotel Aventura',   fechaEmision: '2023-03-03T16:10:00', estado: 'Procesando', recurrente: true, condicionVenta: 'Contado', totalFactura: 1000 },
  { id: '#24052', numeroFactura: '000001000000182', cliente: 'Hotel El Valle',   fechaEmision: '2023-03-03T16:00:00', estado: 'Aceptado',   recurrente: true, condicionVenta: 'Contado', totalFactura: 1200 },
  { id: '#24051', numeroFactura: '000001000000181', cliente: 'Hotel El Valle',   fechaEmision: '2023-03-03T15:32:00', estado: 'Aceptado',   recurrente: true, condicionVenta: 'Contado', totalFactura: 500 },
  { id: '#24050', numeroFactura: '000001000000180', cliente: 'Hotel El Faro',    fechaEmision: '2023-03-03T15:14:00', estado: 'Procesando', recurrente: true, condicionVenta: 'Contado', totalFactura: 1000 },
  { id: '#24049', numeroFactura: '000001000000179', cliente: 'Hotel El Valle',   fechaEmision: '2023-03-03T13:50:00', estado: 'Rechazado',  recurrente: true, condicionVenta: 'Contado', totalFactura: 1250 },
  { id: '#24048', numeroFactura: '000001000000178', cliente: 'Hotel Aventura',   fechaEmision: '2023-03-03T13:29:00', estado: 'Aceptado',   recurrente: true, condicionVenta: 'Contado', totalFactura: 2000 },
  { id: '#24047', numeroFactura: '000001000000177', cliente: 'Hotel Lindavista', fechaEmision: '2023-03-03T13:00:00', estado: 'Rechazado',  recurrente: true, condicionVenta: 'Contado', totalFactura: 1500 },
  { id: '#24046', numeroFactura: '000001000000176', cliente: 'Hotel El Valle',   fechaEmision: '2023-03-03T12:51:00', estado: 'Procesando', recurrente: true, condicionVenta: 'Contado', totalFactura: 1000 },
];

