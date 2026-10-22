'use client';
import { radius , C } from '@/components/ui/tokens';
import { fmt } from '../datos/arbol';
import { F, codeStyle } from './datos';

// ── Indicador de pasos ────────────────────────────────────────────────────────────
export function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Origen y fecha' },
    { n: 2, label: 'Revisión' },
    { n: 3, label: 'Confirmado' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap:0, marginBottom:21 }}>
      {steps.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap:4 }}>
              <div style={{
                width: 24, height:24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? C.brand : active ? C.brand : C.n500,
                color: done || active ? '#FFFFFF' : C.n700,
                fontSize:10.5, fontWeight: 600, fontFamily: F, flexShrink: 0,
              }}>
                {done ? <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg> : s.n}
              </div>
              <span style={{ fontSize:10.5, color: active ? C.brand : done ? C.brand : C.n700, fontFamily: F, whiteSpace: 'nowrap', fontWeight: active ? 600 : 400 }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height:2, background: done ? C.brand : C.n500, margin:'0 7px', marginBottom:16 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
// ── Saldo display pill ────────────────────────────────────────────────────────
export function SaldoPill({ saldo, moneda }: { saldo: number; moneda?: string }) {
  const sym = moneda === 'USD' ? '$' : moneda === 'EUR' ? '€' : '₡';
  const color = saldo > 0 ? C.brand : saldo < 0 ? C.error : C.n700;
  return (
    <span style={{
      fontSize:11, fontWeight: 600, color,
      ...codeStyle,
      background: saldo > 0 ? C.brandBg : saldo < 0 ? 'rgba(244,67,54,.07)' : C.n200,
      border: `1px solid ${saldo > 0 ? C.brandBd : saldo < 0 ? 'rgba(244,67,54,.25)' : C.n500}`,
      borderRadius: radius.sm, padding:'3px 9px', display: 'inline-block',
    }}>
      {sym} {fmt(Math.abs(saldo))}
    </span>
  );
}
