// Documentos RECIBIDOS de proveedores (facturas de compra que otros nos
// emiten a nosotros). El flujo es inverso al de "Documentos emitidos": acá
// nosotros somos el receptor y debemos aceptar/rechazar ante Hacienda.

export type EstadoRecepcion = 'Recibido' | 'Emitido' | 'Procesando' | 'Aceptado' | 'Rechazado';

export interface DocumentoRecibido {
  id: string;              // Consecutivo de acuse
  proveedor: string;
  numeroFactura: string;
  fechaEmision: string;     // ISO
  fechaAceptacion: string | null;
  estado: EstadoRecepcion;
  totalFactura: number;
}

export const DOCUMENTOS_RECIBIDOS: DocumentoRecibido[] = [
  { id: '000001000045343', proveedor: 'Hotel Aventura', numeroFactura: '000001000000182', fechaEmision: '2022-10-27T13:01:00', fechaAceptacion: null,                     estado: 'Recibido',   totalFactura: 1000 },
  { id: '000001000045342', proveedor: 'Hotel Aventura', numeroFactura: '000001000000181', fechaEmision: '2022-10-27T10:12:00', fechaAceptacion: null,                     estado: 'Recibido',   totalFactura: 1500 },
  { id: '000001000045341', proveedor: 'Hotel Aventura', numeroFactura: '000001000000180', fechaEmision: '2022-10-27T08:21:00', fechaAceptacion: '2022-10-28T00:00:00',    estado: 'Aceptado',   totalFactura: 850  },
];
