// Estados de los comprobantes electrónicos, tal como los informa Hacienda.
import type { BadgeColor } from '@/components/ui/primitives';

export const ESTADOS_DOCUMENTO = ['Borrador', 'Recibido', 'Procesando', 'Aceptado', 'Rechazado', 'Error'] as const;
export type EstadoDocumento = (typeof ESTADOS_DOCUMENTO)[number];

export const ESTADO_DOC_COLOR: Record<string, BadgeColor> = {
  Borrador: 'gray', Recibido: 'blue', Procesando: 'yellow', Aceptado: 'green', Rechazado: 'red', Error: 'orange', Emitido: 'gray',
};

export const ESTADO_DOC_AYUDA: Record<string, string> = {
  Borrador: 'Todavía no se ha enviado a Hacienda.',
  Recibido: 'Hacienda lo recibió y lo tiene en cola para revisarlo.',
  Procesando: 'Hacienda lo está validando. Suele tardar unos minutos.',
  Aceptado: 'Hacienda lo aceptó. Es válido y ya cuenta para tus declaraciones.',
  Rechazado: 'Hacienda lo rechazó. Revisa el motivo y refactúralo.',
  Error: 'No llegó a Hacienda (conexión, credenciales o formato). Revisa el error y reenvíalo.',
};

export const ESTADO_DOC_OPCIONES = ESTADOS_DOCUMENTO.map(e => ({ value: e, label: e }));
