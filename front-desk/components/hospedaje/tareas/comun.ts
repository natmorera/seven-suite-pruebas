'use client';
// Tareas: estados, colores y reglas compartidas (bitácora y anulación).
import { C, FONT } from '@/components/suite/tokens';
import { estadoTarea } from '@/components/hotel/store';
import { HOY, USUARIO_ACTUAL, type Tarea } from '@/components/hotel/datos';

export const COLOR_ESTADO: Record<string, string> = { Pendiente: C.n700, 'En proceso': '#213C89', Completado: '#2E7D32', Atrasado: C.error, Anulado: '#9E9E9E' };
export const CUANDO = ['1 hora antes', '2 horas antes', '1 día antes', '2 días antes', '3 días antes'];
export const selInline = { border: 'none', background: 'transparent', fontSize: 12, fontFamily: FONT, color: C.n900, cursor: 'pointer', outline: 'none', maxWidth: '100%', padding: '4px 0' } as const;

/** Pestañas por estado (plural) + Todas. */
export type TabT = Tarea['estado'] | 'Todas';
export const TABS_T: { id: TabT; label: string }[] = [
  { id: 'Pendiente', label: 'Pendientes' }, { id: 'En proceso', label: 'En proceso' }, { id: 'Atrasado', label: 'Atrasadas' },
  { id: 'Completado', label: 'Completadas' }, { id: 'Anulado', label: 'Anuladas' }, { id: 'Todas', label: 'Todas' },
];
export const ahora = () => { const d = new Date(); return `${HOY}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
/** Agrega una entrada a la bitácora de la tarea. */
export const conLog = (t: Tarea, texto: string): Tarea => ({ ...t, historial: [...(t.historial ?? []), { fecha: ahora(), usuario: USUARIO_ACTUAL, texto }] });
/** Reglas: se anula solo una tarea pendiente (una atrasada ya no: solo se elimina). */
export const puedeAnular = (t: Tarea) => estadoTarea(t) === 'Pendiente';
