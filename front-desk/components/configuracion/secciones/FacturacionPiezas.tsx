'use client';
// Configuración › Facturación: el maestro-detalle y la cabecera son los estándar del kit (kit/maestro.tsx).
export { CabeceraDetalle, MaestroDetalle } from '../kit';
export const ops = (xs: string[]) => xs.map(x => ({ value: x, label: x }));
