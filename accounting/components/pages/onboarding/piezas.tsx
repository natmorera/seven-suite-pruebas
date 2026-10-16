'use client';
// Piezas visuales del asistente de onboarding
import { type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/ui/tokens';
import { type Cuenta } from '@/components/pages/catalogo/catalogoData';
import { aplanar } from './datos/plan';

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const p2 = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-01`;
export const fmtFecha = (d: Date) => `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
// El ejercicio va del mes de inicio al cierre del año: se crea un período por mes, abierto
export function periodos(inicio: Date) {
  const r: Date[] = [];
  for (let m = inicio.getMonth(); m < 12; m++) r.push(new Date(inicio.getFullYear(), m, 1));
  return r;
}

export const pasoBtn = (activo: boolean, abierto: boolean) => ({
  display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left' as const, padding: '10px 12px', border: 'none', borderRadius: radius.md,
  background: activo ? C.n000 : 'transparent', boxShadow: activo ? `inset 0 0 0 1px ${C.brandBd}` : 'none',
  cursor: abierto ? 'pointer' : 'not-allowed', opacity: abierto ? 1 : 0.45, fontFamily: FONT,
});

export function Marca({ n, listo, activo }: { n: number; listo: boolean; activo: boolean }) {
  return (
    <span aria-hidden style={{ width: 24, height: 24, borderRadius: 12, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
      background: listo ? C.success : activo ? C.brand : C.n000, color: listo || activo ? C.n000 : C.n700, border: `1.5px solid ${listo ? C.success : activo ? C.brand : C.n500}` }}>
      {listo ? <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={C.n000} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.2l3 3 6-6.4" /></svg> : n}
    </span>
  );
}

export function Aviso({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, color: C.n900, background: C.brandBg, border: `1px solid ${C.brandBd}`, borderRadius: radius.md, padding: '9px 12px' }}>{children}</div>;
}

export function Vista({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div style={{ background: C.n200, border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontSize: 11.5, fontWeight: 500, color: C.n700 }}>{titulo}</span>
      {children}
    </div>
  );
}

export function Opcion({ activo, onClick, titulo, texto }: { activo: boolean; onClick: () => void; titulo: string; texto: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}
      style={{ textAlign: 'left', padding: 14, borderRadius: radius.md, fontFamily: FONT, cursor: 'pointer',
        border: `1.5px solid ${activo ? C.brand : C.n500}`, background: activo ? C.brandBg : C.n000, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span aria-hidden style={{ width: 16, height: 16, borderRadius: 8, flexShrink: 0, marginTop: 1, border: `1.5px solid ${activo ? C.brand : C.n500}`, background: C.n000, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {activo && <span style={{ width: 8, height: 8, borderRadius: 4, background: C.brand }} />}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.n900 }}>{titulo}</span>
        <span style={{ fontSize: 11.5, color: C.n700, lineHeight: 1.45 }}>{texto}</span>
      </span>
    </button>
  );
}

export function Errores({ lista }: { lista: string[] }) {
  return (
    <div role="alert" style={{ fontSize: 12, color: C.error, background: C.errorBg, border: `1px solid ${C.error}`, borderRadius: radius.md, padding: '8px 12px' }}>
      {lista.slice(0, 5).map((e, i) => <div key={i}>{e}</div>)}
      {lista.length > 5 && <div>y {lista.length - 5} más.</div>}
    </div>
  );
}

const SANGRIA: Record<string, number> = { grupo: 0, mayor: 1, submajor: 2, detalle: 3, auxiliar: 4 };

export function TablaPlan({ cuentas, cero }: { cuentas: Cuenta[]; cero: (moneda?: string) => string }) {
  const filas = aplanar(cuentas).filter(c => c.nivel !== 'subgrupo' && c.nivel !== 'subsubgrupo');
  const th = { padding: '8px 12px', fontWeight: 500, color: C.n700, fontSize: 11.5 } as const;
  return (
    <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, maxHeight: 300, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead style={{ position: 'sticky', top: 0, background: C.n200 }}>
          <tr style={{ textAlign: 'left' }}>
            <th style={th}>Código</th><th style={th}>Nombre</th><th style={th}>Moneda</th><th style={{ ...th, textAlign: 'right' }}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(c => (
            <tr key={c.id} style={{ borderTop: `1px solid ${C.n500}` }}>
              <td style={{ padding: '6px 12px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: C.n900 }}>{c.code}</td>
              <td style={{ padding: '6px 12px', paddingLeft: 12 + (SANGRIA[c.nivel] ?? 0) * 14, color: C.n900, fontWeight: c.posteable ? 400 : 600 }}>{c.nombre}</td>
              <td style={{ padding: '6px 12px', color: C.n700 }}>{c.posteable ? c.moneda : ''}</td>
              <td style={{ padding: '6px 12px', textAlign: 'right', color: C.n700, fontVariantNumeric: 'tabular-nums' }}>{c.posteable ? cero(c.moneda) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
