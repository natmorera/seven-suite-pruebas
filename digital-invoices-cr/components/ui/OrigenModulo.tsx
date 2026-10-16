'use client';
// Módulo de origen de un documento con el isotipo de la suite y sus iniciales:
// FDK (Front Desk), POS (Punto de Venta), ACC (Accounting: creado aquí),
// TO (Tour Operador) e INV (Inventario).
import { useId } from 'react';
import { FONT } from './primitives';
import { useModulos } from '@/lib/modulosCliente';

interface Modulo { sigla: string; nombre: string; degradado: [string, string]; texto: string; fondo: string }

export const MODULOS: Record<string, Modulo> = {
  'Front Desk':           { sigla: 'FDK', nombre: 'Front Desk',     degradado: ['#5B8CF5', '#1D3F9E'], texto: '#2E4FAE', fondo: '#F2F5FC' },
  'Punto de Venta (POS)': { sigla: 'POS', nombre: 'Punto de Venta', degradado: ['#2AB738', '#0D6916'], texto: '#3A9A33', fondo: '#F1F8F0' },
  'Manual':               { sigla: 'ACC', nombre: 'Accounting',     degradado: ['#EFC94C', '#A97A10'], texto: '#9A7316', fondo: '#FBF6EC' },
  'Tour Operador':        { sigla: 'TO',  nombre: 'Tour Operador',  degradado: ['#4E8A66', '#1D4A32'], texto: '#2F5C45', fondo: '#F1F4F2' },
  'Inventario':           { sigla: 'INV', nombre: 'Inventario',     degradado: ['#F2645C', '#A61D17'], texto: '#B3261E', fondo: '#FCF1F0' },
};
// Nombres anteriores que pueden venir guardados o desde las integraciones
const ALIAS: Record<string, string> = { 'Front Desk (PMS)': 'Front Desk', PMS: 'Front Desk', FDK: 'Front Desk', POS: 'Punto de Venta (POS)', Accounting: 'Manual', ACC: 'Manual' };
export const moduloDe = (origen: string | null | undefined): Modulo => MODULOS[ALIAS[String(origen ?? '')] ?? String(origen ?? 'Manual')] ?? MODULOS.Manual;

export function Isotipo({ colores, size = 12 }: { colores: [string, string]; size?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size * 11 / 12} viewBox="0 0 12 11" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M4.48475 10.3275H0V0H8.77964C6.95357 3.08871 5.38741 6.75999 4.49772 10.2777C4.49254 10.2948 4.48942 10.3109 4.48475 10.3275Z" fill={`url(#a${id})`} />
      <path d="M11.9998 10.3277H8.02295C8.91783 6.83795 10.2256 3.66728 11.9998 0.404785V10.3277Z" fill={`url(#b${id})`} />
      <defs>
        <linearGradient id={`a${id}`} x1="7.64316" y1="-3.88477" x2="-1.21149" y2="-2.42678" gradientUnits="userSpaceOnUse">
          <stop stopColor={colores[0]} /><stop offset="1" stopColor={colores[1]} />
        </linearGradient>
        <linearGradient id={`b${id}`} x1="11.485" y1="-3.32777" x2="7.39012" y2="-3.0099" gradientUnits="userSpaceOnUse">
          <stop stopColor={colores[0]} /><stop offset="1" stopColor={colores[1]} />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function OrigenModulo({ origen, referencia, conNombre }: { origen: string | null | undefined; referencia?: string | null; conNombre?: boolean }) {
  // Lo creado aquí: ACC con Contabilidad; DICR en solo Digital Invoices
  const { contabilidad } = useModulos();
  const base = moduloDe(origen);
  const m = base === MODULOS.Manual && !contabilidad ? { ...base, sigla: 'DICR', nombre: 'Digital Invoices' } : base;
  return (
    <span title={`${m.nombre}${referencia ? ` · ${referencia}` : ''}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: m.fondo, color: m.texto,
        fontSize: 11.5, fontWeight: 500, fontFamily: FONT, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>
      <Isotipo colores={m.degradado} />
      {m.sigla}{conNombre ? <span style={{ fontWeight: 400 }}> · {m.nombre}</span> : null}
    </span>
  );
}
