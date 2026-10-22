'use client';
// Piezas visuales del Dashboard: barras, rótulos, KPIs, paginación y gráfico de ingresos.
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { C, FONT, fmtNum, radius, SIZE } from '@/components/suite/tokens';
import { Progreso } from '@/components/hotel/ui';

// ── Piezas visuales comunes ─────────────────────────────────────────────────
// Colores de estado de la suite (tokens): éxito, error, aviso e información, con su tono claro.
export const VERDE = C.success, VERDE_OSC = C.successDk, ROJO = C.error, ROJO_CLARO = '#F9B4AE', MORADO = '#7E57C2', NARANJA = C.warning, AZUL = C.info;
/** Botón de pie de tarjeta, a lo ancho (Check-In →, Mapa de habitaciones ↗…). */
export function Pie({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) {
  const st: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: SIZE.control + 4, border: `1px solid ${C.n500}`, borderRadius: radius.control, background: C.n000, color: C.n900, fontSize: 12.5, fontFamily: FONT, textDecoration: 'none', cursor: 'pointer', width: '100%' };
  return <div style={{ borderTop: `1px solid ${C.n500}`, margin: '0 -20px -20px', padding: '10px 20px 12px' }}>
    {href ? <Link href={href} style={st}>{children}</Link> : <button type="button" onClick={onClick} style={st}>{children}</button>}
  </div>;
}
export const Ext = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>;
export const Bandera = ({ color }: { color: string }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={color} aria-hidden><path d="M5 3h2v18H5zM8 4h11l-2.5 4L19 12H8z" /></svg>;
export const Punto = ({ color, size = 8 }: { color: string; size?: number }) => <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />;
export const Seccion = ({ children }: { children: ReactNode }) => <h2 style={{ margin: '4px 0 -4px', fontSize: 15, fontWeight: 500, color: C.n900 }}>{children}</h2>;
// ── Operativo ───────────────────────────────────────────────────────────────
export function FilaBarra({ label, valor, total, color }: { label: string; valor: number; total: number; color: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px minmax(80px, 1.6fr)', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Punto color={color} />{label}</span>
      <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}><b style={{ fontWeight: 600 }}>{valor}</b><span style={{ color: C.n700 }}> / {total}</span></span>
      <Progreso valor={valor} total={total} color={color} />
    </div>
  );
}
export const Rotulo = ({ children }: { children: ReactNode }) => <span style={{ fontSize: 11, fontWeight: 500, color: C.n700, letterSpacing: '.06em' }}>{children}</span>;
export const TINTE: Record<string, { bg: string; color: string; texto?: string }> = {
  Anulado: { bg: '#F2F2F2', color: '#9E9E9E' },
  Pendiente: { bg: '#F2F2F4', color: '#9DA1AB', texto: '#5F6068' }, 'En proceso': { bg: '#EEF1FA', color: C.brand }, Atrasado: { bg: '#FDEDED', color: ROJO }, Completado: { bg: '#E8F6EF', color: VERDE },
};

/** Pie de tabla del diseño: «1 de 2» a la izquierda y páginas numeradas a la derecha. */
export function Paginas({ pagina, total, onChange }: { pagina: number; total: number; onChange: (p: number) => void }) {
  const t = Math.max(1, total);
  const b = (contenido: ReactNode, destino: number, on: boolean, label: string, off = false) => (
    <button key={label} type="button" aria-label={label} aria-current={on ? 'page' : undefined} disabled={off} onClick={() => onChange(destino)}
      style={{ minWidth: 30, height: 30, border: 'none', borderRadius: radius.control, background: on ? C.brand : 'transparent', color: on ? '#fff' : off ? C.n500 : C.n700, fontSize: 12.5, fontFamily: FONT, cursor: off ? 'default' : 'pointer' }}>{contenido}</button>
  );
  const desde = Math.max(1, Math.min(pagina - 2, t - 4)), nums = Array.from({ length: Math.min(5, t) }, (_, i) => desde + i);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: C.n700 }}>
      <span>{pagina} de {t}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {b('‹', pagina - 1, false, 'Página anterior', pagina <= 1)}
        {nums.map(n => b(n, n, n === pagina, `Página ${n}`))}
        {b('›', pagina + 1, false, 'Página siguiente', pagina >= t)}
      </span>
    </div>
  );
}
export const Carpeta = () => <svg width="16" height="14" viewBox="0 0 24 20" aria-hidden><path d="M1 3a2 2 0 0 1 2-2h6l2 2.5h10a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2z" fill={C.brand} /></svg>;

// ── Financiero ──────────────────────────────────────────────────────────────
export function Kpi({ titulo, valor, delta, sub, grande }: { titulo: string; valor: string; delta?: number; sub?: string; grande?: boolean }) {
  return (
    <div style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, padding: grande ? '18px 20px 22px' : '16px 18px', display: 'flex', flexDirection: 'column', gap: grande ? 18 : 8, minWidth: 0, fontFamily: FONT }}>
      <span style={{ fontSize: 12, color: C.n700 }}>{titulo}</span>
      <b style={{ fontSize: grande ? 28 : 26, fontWeight: 600, color: C.n900, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{valor}</b>
      {delta !== undefined
        ? <span style={{ fontSize: 12, color: delta >= 0 ? VERDE : ROJO }}>{delta >= 0 ? '↑ +' : '↓ '}{fmtNum(delta, 1)}% vs. mes ant.</span>
        : sub && <span style={{ fontSize: 12, color: C.n700 }}>{sub}</span>}
    </div>
  );
}
/** Barras de «Ingresos totales en el tiempo»: eje en USD con 4 tramos y barras anchas. */
export function Grafico({ datos }: { datos: { label: string; valor: number; detalle?: string }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...datos.map(d => d.valor));
  // Cuatro tramos «redondos» (750 · 1.5k · 2.25k · 3k, como el diseño)
  const crudo = max / 4, base = Math.pow(10, Math.floor(Math.log10(crudo)));
  const paso = ([1, 1.5, 2, 2.5, 3, 5, 7.5, 10].find(f => f * base >= crudo) ?? 10) * base;
  const tope = paso * 4;
  const marcas = [0, 0.25, 0.5, 0.75, 1].map(f => tope * f);
  const usd = (n: number) => `USD${n >= 1000 ? `${String(+(n / 1000).toFixed(2))}k` : fmtNum(n, 0)}`;
  const alto = 280;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', columnGap: 8, fontFamily: FONT }}>
      <div style={{ position: 'relative', height: alto }}>
        {marcas.map(m => <span key={m} style={{ position: 'absolute', right: 0, bottom: `${(m / tope) * 100}%`, transform: 'translateY(50%)', fontSize: 11, color: C.n700 }}>{usd(m)}</span>)}
      </div>
      <div style={{ position: 'relative', height: alto, display: 'flex', alignItems: 'flex-end' }}>
        {marcas.map(m => <div key={m} style={{ position: 'absolute', left: 0, right: 0, bottom: `${(m / tope) * 100}%`, borderTop: `1px solid ${C.n500}` }} />)}
        {datos.map((d, i) => (
          <div key={d.label + i} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative' }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            {hover === i && <div style={{ position: 'absolute', bottom: `calc(${(d.valor / tope) * 100}% + 8px)`, background: C.n900, color: '#fff', fontSize: 11, padding: '5px 8px', borderRadius: 6, whiteSpace: 'nowrap', zIndex: 2, textAlign: 'center' }}>
              <div style={{ opacity: 0.7, fontSize: 10 }}>{d.detalle ?? d.label}</div><b>USD {fmtNum(d.valor)}</b></div>}
            <div title={`${d.detalle ?? d.label}: USD ${fmtNum(d.valor)}`} style={{ position: 'relative', width: datos.length > 14 ? '70%' : '40%', height: `${(d.valor / tope) * 100}%`, background: C.brand, opacity: hover === null || hover === i ? 1 : 0.75, borderRadius: '3px 3px 0 0', minHeight: d.valor ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <span />
      <div style={{ display: 'flex', marginTop: 8 }}>
        {datos.map((d, i) => <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: C.n700, whiteSpace: 'nowrap', overflow: 'hidden', visibility: datos.length > 16 && i % Math.ceil(datos.length / 12) ? 'hidden' : 'visible' }}>{d.label}</span>)}
      </div>
    </div>
  );
}
export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
