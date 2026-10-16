'use client';
// Constantes y tipos compartidos por las piezas del Mapa de habitaciones.
import { TIPOS, type EstadoHab } from '@/components/hotel/datos';

// ── Estados (lenguaje simple y un color por estado) ─────────────────────────
// La limpieza es un indicador aparte: una habitación puede estar ocupada y sucia.
export const EST: Record<EstadoHab, { label: string; color: string; bg: string }> = {
  libre: { label: 'Libre', color: '#12A877', bg: '#E8F7F1' },
  ocupada: { label: 'Ocupada', color: '#213C89', bg: '#ECEFF8' },
  checkin: { label: 'Llega hoy', color: '#6D4ED8', bg: '#F1EDFC' },
  checkinRL: { label: 'Llega hoy · rooming', color: '#6D4ED8', bg: '#F1EDFC' },
  checkout: { label: 'Sale hoy', color: '#C77700', bg: '#FDF3E3' },
  bloqueada: { label: 'Bloqueada', color: '#6B6B76', bg: '#F1F1F3' },
};
export const LABEL: Record<EstadoHab, string> = { libre: 'Libre', ocupada: 'Ocupada', bloqueada: 'Bloqueada', checkin: 'Llega hoy', checkinRL: 'Llega hoy (rooming)', checkout: 'Sale hoy' };
export const SUCIA = '#C2410C';
export const corta = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
export const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
export const nombreTipo = (id: string) => TIPOS.find(t => t.id === id)?.nombre ?? id;

export type ModalMapa =
  | { tipo: 'panel'; hab: string } | { tipo: 'mover'; reserva: string; destino?: string } | { tipo: 'bloquear'; hab: string } | { tipo: 'reserva'; hab: string }
  | { tipo: 'ver'; reserva: string } | { tipo: 'prepago'; reserva: string } | { tipo: 'checkin'; reserva: string } | { tipo: 'asignar'; hab: string } | null;
/** Lo que se está arrastrando: una reserva (llegada o huésped en casa). */
