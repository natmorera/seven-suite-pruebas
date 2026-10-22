// Acciones de un documento emitido según su estado. Las usan la tabla de
import { segunPais } from '@/lib/paisActual';
// Ventas (botón de la fila + menú ⋯) y el detalle (botón + «Más acciones»),
// así todas las pantallas se comportan igual:
//   · Una sola acción principal, y solo cuando hay algo pendiente:
//       Borrador ............ ninguna (se elimina desde el menú)
//       Recibido/Procesando . Consultar estado
//       Error ............... Reenviar a Hacienda
//       Rechazado ........... Modificar y refacturar (si aún no se refacturó)
//       Aceptado ............ Emitir siguiente (recurrente vencida) › Registrar
//                             abono (crédito con saldo) › Enviar por correo
//                             (si no se pudo enviar). Si no, ninguna.
//   · El resto va en el menú, siempre en el mismo orden y por grupos.
export interface Accion { id: string; label: string; onClick: () => void; peligro?: boolean }

export interface DocAccionable {
  tipo: string; estado: string; condicion_venta?: string | null;
  reemplazado_por?: string | null; envio_correo?: string | null;
}
export interface ContextoAcciones {
  recurrenteVence?: boolean;      // la recurrencia de esta factura ya toca
  tieneRecurrencia?: boolean;
  saldoCredito?: number | null;   // venta con recibo de pago: saldo pendiente
  tieneAbonos?: boolean;
  enDetalle?: boolean;            // en el detalle no se ofrece «Ver detalle»
}
export interface Manejadores {
  ver: () => void; descargar: () => void; correo: () => void; consultar: () => void;
  verError: () => void; corregir: () => void; refacturar: () => void; nota: (tipo: 'Nota de crédito' | 'Nota de débito') => void;
  recurrencia: () => void; emitirRecurrente: () => void; abono: () => void; verAbonos: () => void; eliminarBorrador: () => void;
}

const CON_RECIBO = ['08', '10'];

export function accionesDocumento(d: DocAccionable, ctx: ContextoAcciones, h: Manejadores): { principal: Accion | null; grupos: Accion[][] } {
  const borrador = d.estado === 'Borrador';
  const aceptado = d.estado === 'Aceptado';
  const enProceso = d.estado === 'Recibido' || d.estado === 'Procesando';
  const conRecibo = d.tipo === 'Factura electrónica' && CON_RECIBO.includes(String(d.condicion_venta ?? ''));
  const saldo = Number(ctx.saldoCredito ?? 0);
  const correoPendiente = d.envio_correo === 'sin_correo' || d.envio_correo === 'error';
  const anulable = ['Factura electrónica', 'Tiquete electrónico', 'Factura de exportación', 'Factura electrónica de compra'].includes(d.tipo);

  const principal: Accion | null =
    borrador ? null
    : enProceso ? { id: 'consultar', label: 'Consultar estado', onClick: h.consultar }
    : d.estado === 'Error' ? { id: 'reenviar', label: segunPais('Reenviar a Hacienda'), onClick: h.verError }
    : d.estado === 'Rechazado' ? (d.reemplazado_por ? null : { id: 'corregir', label: 'Modificar y refacturar', onClick: h.corregir })
    : aceptado && ctx.recurrenteVence ? { id: 'emitir-rec', label: 'Emitir siguiente', onClick: h.emitirRecurrente }
    : aceptado && conRecibo && saldo > 0 ? { id: 'abono', label: 'Registrar abono', onClick: h.abono }
    : aceptado && correoPendiente ? { id: 'correo', label: 'Enviar por correo', onClick: h.correo }
    : null;

  const grupos: Accion[][] = [
    [
      ...(ctx.enDetalle ? [] : [{ id: 'ver', label: 'Ver detalle', onClick: h.ver }]),
      ...(borrador ? [] : [{ id: 'descargar', label: 'Descargar (PDF, XML, respuesta)', onClick: h.descargar }]),
      ...(borrador || principal?.id === 'correo' ? [] : [{ id: 'correo', label: 'Reenviar por correo', onClick: h.correo }]),
    ],
    [
      ...(d.estado === 'Rechazado' ? [{ id: 'motivo', label: 'Ver motivo del rechazo', onClick: h.verError }] : []),
      ...(d.estado === 'Error' && principal?.id !== 'reenviar' ? [{ id: 'error', label: 'Ver error', onClick: h.verError }] : []),
      ...(conRecibo && aceptado ? [principal?.id === 'abono' ? { id: 'ver-abonos', label: 'Ver abonos', onClick: h.verAbonos } : { id: 'ver-abonos', label: saldo > 0 ? 'Registrar abono' : 'Ver abonos', onClick: saldo > 0 ? h.abono : h.verAbonos }] : []),
    ],
    [
      ...(aceptado && d.tipo === 'Factura electrónica' ? [{ id: 'refacturar', label: 'Refacturar (otro receptor)', onClick: h.refacturar }] : []),
      ...(aceptado && d.tipo === 'Tiquete electrónico' ? [{ id: 'refacturar', label: 'Convertir en factura', onClick: h.refacturar }] : []),
      ...(aceptado && anulable && !ctx.tieneAbonos ? [{ id: 'nc', label: 'Generar nota de crédito', onClick: () => h.nota('Nota de crédito') }] : []),
      ...(aceptado && anulable ? [{ id: 'nd', label: 'Generar nota de débito', onClick: () => h.nota('Nota de débito') }] : []),
    ],
    [
      ...(aceptado && d.tipo === 'Factura electrónica' && !conRecibo ? [{ id: 'rec', label: ctx.tieneRecurrencia ? 'Editar recurrencia' : 'Hacer recurrente', onClick: h.recurrencia }] : []),
    ],
    [
      ...(borrador ? [{ id: 'borrar', label: 'Eliminar borrador', onClick: h.eliminarBorrador, peligro: true }] : []),
    ],
  ].filter(g => g.length);
  return { principal, grupos };
}
