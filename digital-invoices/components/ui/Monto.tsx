'use client';
// Montos: el signo de la moneda alineado a la izquierda y el número a la
// derecha, siempre con 2 decimales. La coma separa los miles y el punto los
// decimales (1,234.56).
import { useState, type CSSProperties } from 'react';
import { C, FONT } from './primitives';
import { simboloLocal } from '@/lib/paisActual';

export const simboloMoneda = (moneda?: string | null) => (moneda === 'USD' ? '$' : simboloLocal());

export function fmtMonto(n: number | string | null | undefined) {
  const v = Number(n);
  return (Number.isFinite(v) ? v : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Deja solo dígitos y un punto decimal (máximo 2 decimales).
export function limpiarMonto(texto: string) {
  const t = texto.replace(/,/g, '').replace(/[^\d.]/g, '');
  const [ent, ...resto] = t.split('.');
  return resto.length ? `${ent}.${resto.join('').slice(0, 2)}` : ent;
}

// Celda de tabla: signo a la izquierda, monto a la derecha.
export function MontoCelda({ valor, moneda, simbolo, fuerte, color }: {
  valor: number | string | null | undefined; moneda?: string | null; simbolo?: string; fuerte?: boolean; color?: string;
}) {
  return (
    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, width: '100%', minWidth: 110, fontVariantNumeric: 'tabular-nums', fontWeight: fuerte ? 600 : 400, color: color ?? C.n900 }}>
      <span style={{ color: C.n700, fontWeight: 400 }}>{simbolo ?? simboloMoneda(moneda)}</span>
      <span>{fmtMonto(valor)}</span>
    </span>
  );
}

// Campo de monto: signo fijo a la izquierda, número a la derecha. Mientras se
// escribe se ve el número tal cual; al salir se formatea con 2 decimales.
export function MontoInput({ value, onChange, moneda, simbolo, placeholder = '0.00', error, disabled, readOnly, style, ariaLabel }: {
  value: string; onChange?: (v: string) => void; moneda?: string | null; simbolo?: string; placeholder?: string;
  error?: string | boolean; disabled?: boolean; readOnly?: boolean; style?: CSSProperties; ariaLabel?: string;
}) {
  const [foco, setFoco] = useState(false);
  const bloqueado = disabled || readOnly;
  const mostrado = foco ? value : value === '' ? '' : fmtMonto(value);
  return (
    <div style={{ height: 32, display: 'flex', alignItems: 'center', border: `1px solid ${error ? C.error : foco ? C.brand : C.n500}`, borderRadius: 4,
      background: bloqueado ? C.n200 : C.n000, fontFamily: FONT, boxSizing: 'border-box', width: '100%', ...style }}>
      <span style={{ padding: '0 0 0 10px', fontSize: 12, color: C.n700, flexShrink: 0 }}>{simbolo ?? simboloMoneda(moneda)}</span>
      <input value={mostrado} aria-label={ariaLabel} inputMode="decimal" placeholder={placeholder} disabled={disabled} readOnly={readOnly}
        onFocus={() => setFoco(true)}
        onBlur={() => { setFoco(false); if (value !== '' && onChange) onChange(Number(value).toFixed(2)); }}
        onChange={e => onChange?.(limpiarMonto(e.target.value))}
        style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', background: 'transparent', textAlign: 'right', padding: '0 10px',
          fontSize: 12, fontFamily: FONT, color: C.n900, fontVariantNumeric: 'tabular-nums' }} />
    </div>
  );
}
