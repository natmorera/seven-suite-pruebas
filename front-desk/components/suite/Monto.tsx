'use client';
// Montos (regla de la suite): siempre 2 decimales, la coma separa los miles y el punto los decimales; el signo de
// la moneda va alineado a la izquierda y el número a la derecha (1,234.56).
import type { ReactNode } from 'react';
import { C } from './tokens';

/** Signo de moneda + número ya formateado («$ 1,234.00», «-₡ 12.50», «USD 9.00»). */
const PATRON = /^\s*([+−-]?)\s*(\$|₡|€|C\$|Q|USD|CRC|EUR|NIO|GTQ)\s?([+−-]?[\d,]+(?:\.\d+)?)\s*$/;

/** Separa un monto escrito como texto en signo de moneda y número (con su signo). `null` si no es un monto. */
export function partirMonto(texto: string): { simbolo: string; numero: string } | null {
  const m = texto.match(PATRON);
  if (!m) return null;
  const negativo = (m[1] && m[1] !== '+') || (m[3].startsWith('-') || m[3].startsWith('−') ? '-' : '');
  return { simbolo: m[2], numero: `${negativo ? '-' : m[1] === '+' ? '+' : ''}${m[3].replace(/^[+−-]/, '')}` };
}

/** Monto en celda: signo a la izquierda y número a la derecha, ocupando todo el ancho. */
export function MontoCelda({ texto, fuerte, color }: { texto: string; fuerte?: boolean; color?: string }) {
  const p = partirMonto(texto);
  if (!p) return <>{texto}</>;
  return (
    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, width: '100%', minWidth: 84, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontWeight: fuerte ? 600 : undefined, color }}>
      <span style={{ color: C.n700, fontWeight: 400 }}>{p.simbolo}</span>
      <span>{p.numero}</span>
    </span>
  );
}

/** Si el contenido de una celda es un monto en texto, lo muestra con el signo a la izquierda y el número a la derecha. */
export function celdaMonto(contenido: ReactNode): ReactNode {
  return typeof contenido === 'string' && partirMonto(contenido) ? <MontoCelda texto={contenido} /> : contenido;
}
