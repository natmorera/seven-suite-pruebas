// Hacienda numera cada comprobante como Sucursal(3) + Terminal(5) + Tipo(2) +
// Consecutivo(10) = 20 dígitos. Cada "caja" acá representa un punto de venta
// / terminal dentro de una sucursal, con su propio contador de consecutivo.

export interface Caja {
  id: string;
  sucursal: string;     // 3 dígitos
  terminal: string;     // 5 dígitos
  nombre: string;        // etiqueta humana, ej. "Recepción principal"
  emisorId: string;
  consecutivoActual: number;
  activa: boolean;
}

export const CAJAS: Caja[] = [
  { id: 'caja-1', sucursal: '001', terminal: '00001', nombre: 'Recepción principal', emisorId: 'em-1', consecutivoActual: 184, activa: true },
  { id: 'caja-2', sucursal: '001', terminal: '00002', nombre: 'Restaurante',          emisorId: 'em-1', consecutivoActual: 452, activa: true },
  { id: 'caja-3', sucursal: '001', terminal: '00003', nombre: 'Recepción - anexo',    emisorId: 'em-1', consecutivoActual: 12,  activa: false },
];

export function siguienteConsecutivo(caja: Caja): string {
  return String(caja.consecutivoActual + 1).padStart(10, '0');
}
