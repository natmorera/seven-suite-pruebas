'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Piezas propias de Configuración, construidas sobre components/suite.
// Card con pestañas, sub-tarjetas, tabla plana, paginación, multiselección,
// selector de color y diálogo de confirmación. Las piezas más grandes están en
// kit/ y se reexportan desde aquí.
// ─────────────────────────────────────────────────────────────────────────────
import { type CSSProperties, type ReactNode, useEffect, useId, useRef } from 'react';
import { C, FONT, radius, SIZE } from '@/components/suite/tokens';
import { IcChevronRight, IcSearch } from '@/components/suite/icons';

// ── Íconos propios (14×14, currentColor) ────────────────────────────────────
type IcP = { size?: number };
export const IcTrash = ({ size = 14 }: IcP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
  </svg>
);
export const IcEdit = ({ size = 14 }: IcP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
  </svg>
);
export const IcPrint = ({ size = 14 }: IcP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z" />
  </svg>
);
export const IcExcel = ({ size = 14 }: IcP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6zM14 3v6h6M9 13l4 5M13 13l-4 5" />
  </svg>
);
export const IcBolt = ({ size = 14 }: IcP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
  </svg>
);
export const IcLink = ({ size = 14 }: IcP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);
export const IcFiltro = ({ size = 14 }: IcP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 5h16l-6 8v5l-4 2v-7L4 5z" />
  </svg>
);
export const IcInfo = ({ size = 14 }: IcP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden>
    <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
  </svg>
);
export const IcUpload = ({ size = 14 }: IcP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </svg>
);
export const IcCheckLine = ({ size = 14 }: IcP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m5 12 5 5 9-10" />
  </svg>
);

// ── Tarjeta principal de cada sección: título + pestañas + contenido ────────
export function ConfigCard({ title, subtitle, actions, children, style }: {
  title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; style?: CSSProperties;
}) {
  // Igual que Accounting: encabezado (título + descripción) separado del cuerpo por una línea.
  return (
    <section style={{ background: C.n000, borderRadius: radius.card, border: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column', fontFamily: FONT, ...style }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '18px 24px 16px', borderBottom: `1px solid ${C.n500}` }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 500, color: C.n900, margin: 0 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 12.5, color: C.n700, margin: '4px 0 0' }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div>}
      </div>
      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>{children}</div>
    </section>
  );
}

/** Pestañas subrayadas dentro de la tarjeta (Habitaciones · Grupos · Regímenes…). */
export function CardTabs<T extends string>({ tabs, active, onChange }: { tabs: readonly T[]; active: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.n500}`, overflowX: 'auto' }}>
      {tabs.map(t => {
        const on = t === active;
        return (
          <button key={t} role="tab" aria-selected={on} onClick={() => onChange(t)}
            style={{ padding: '0 10px 10px', fontSize: 12, fontWeight: on ? 600 : 400, color: on ? C.n900 : C.n700, background: 'none', border: 'none',
              borderBottom: `3px solid ${on ? C.brand : 'transparent'}`, marginBottom: -1, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: FONT }}>
            {t}
          </button>
        );
      })}
    </div>
  );
}

/** Sub-pestañas (nivel 2): mismo control segmentado que `SubTabs` del patrón maestro-detalle. */
export function PillTabs<T extends string>(p: { tabs: readonly T[]; active: T; onChange: (t: T) => void; style?: CSSProperties }) {
  return <SubTabs {...p} />;
}

/** Sub-sección con borde (Consecutivos, Configuración general, Conexión de API…). */
export function SubCard({ title, hint, actions, children, style }: { title?: string; hint?: string; actions?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 14, display: 'flex', flexDirection: 'column', gap: 14, background: C.n000, minWidth: 0, ...style }}>
      {(title || actions) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            {title && <h3 style={{ fontSize: 13, fontWeight: 500, color: C.n900, margin: 0 }}>{title}</h3>}
            {hint && <p style={{ fontSize: 11, color: C.n700, margin: '3px 0 0' }}>{hint}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function Grid({ cols = 2, gap = 12, children, style }: { cols?: number; gap?: number; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap, ...style }}>{children}</div>;
}

/** Etiqueta + control (estilo del diseño: label gris 12 px). */
export function Campo({ label, hint, error, required, children, style }: {
  label?: ReactNode; hint?: string; error?: string; required?: boolean; children: ReactNode; style?: CSSProperties;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  // Los controles de la suite no reciben id: la etiqueta se vincula al primer control nativo del campo.
  useEffect(() => {
    const control = ref.current?.querySelector('input:not([type=checkbox]):not([type=radio]), select, textarea');
    if (label && control && !control.hasAttribute('aria-label') && !control.hasAttribute('aria-labelledby')) control.setAttribute('aria-labelledby', id);
  });
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, fontFamily: FONT, ...style }}>
      {label && <span id={id} style={{ fontSize: 12, color: C.n700 }}>{label}{required && <span style={{ color: C.error, marginLeft: 2 }}>*</span>}</span>}
      {children}
      {hint && !error && <span style={{ fontSize: 11, color: C.n700 }}>{hint}</span>}
      {error && <span role="alert" style={{ fontSize: 11, color: C.error }}>{error}</span>}
    </div>
  );
}

export function Aviso({ children, tono = 'info' }: { children: ReactNode; tono?: 'info' | 'warning' }) {
  const info = tono === 'info';
  return (
    <div style={{ padding: '9px 12px', borderRadius: radius.control, fontSize: 12, lineHeight: 1.5, fontFamily: FONT,
      background: info ? 'var(--brand-bg)' : 'rgba(238,179,0,.10)', color: info ? 'var(--brand)' : '#7A5C00',
      border: `1px solid ${info ? 'var(--brand-border)' : 'rgba(238,179,0,.3)'}` }}>
      {children}
    </div>
  );
}

export function TextArea({ value, onChange, placeholder, rows = 5, disabled, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; disabled?: boolean; style?: CSSProperties;
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} disabled={disabled} className="suite-campo"
      style={{ width: '100%', padding: 10, border: `1px solid ${C.n500}`, borderRadius: radius.control, fontSize: 12, fontFamily: FONT, color: C.n900,
        background: disabled ? C.n200 : C.n000, outline: 'none', resize: 'vertical', lineHeight: 1.55, boxSizing: 'border-box', ...style }} />
  );
}

/** Input con sufijo/prefijo dentro del campo («horas antes», «USD»). */
export function InputAfijo({ value, onChange, prefijo, sufijo, type = 'text', disabled, placeholder, alinear = 'left' }: {
  value: string | number; onChange: (v: string) => void; prefijo?: string; sufijo?: string; type?: string; disabled?: boolean; placeholder?: string; alinear?: 'left' | 'right';
}) {
  return (
    <div className="suite-afijo" style={{ display: 'flex', alignItems: 'center', height: SIZE.control, border: `1px solid ${C.n500}`, borderRadius: radius.control,
      background: disabled ? C.n200 : C.n000, padding: '0 10px', gap: 8, fontFamily: FONT }}>
      {prefijo && <span style={{ fontSize: 12, color: C.n700, flexShrink: 0 }}>{prefijo}</span>}
      <input value={value} onChange={e => onChange(e.target.value)} type={type} disabled={disabled} placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: 12, fontFamily: FONT, background: 'transparent', color: C.n900, textAlign: alinear }} />
      {sufijo && <span style={{ fontSize: 12, color: C.n700, flexShrink: 0 }}>{sufijo}</span>}
    </div>
  );
}

export function IconButton({ label, onClick, children, tono = 'neutro', disabled }: {
  label: string; onClick?: () => void; children: ReactNode; tono?: 'neutro' | 'peligro' | 'marca'; disabled?: boolean;
}) {
  const color = tono === 'peligro' ? C.error : tono === 'marca' ? C.brand : C.n700;
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} disabled={disabled}
      style={{ width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none',
        borderRadius: radius.control, color, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, flexShrink: 0 }}>
      {children}
    </button>
  );
}

export function LinkButton({ children, onClick, style }: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: 'none', border: 'none', padding: 0, color: C.brand, fontWeight: 500, fontSize: 12, fontFamily: FONT, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, ...style }}>
      {children}
    </button>
  );
}

export function Buscador({ value, onChange, placeholder = 'Buscar...', width = '100%' }: { value: string; onChange: (v: string) => void; placeholder?: string; width?: number | string }) {
  return (
    <div style={{ position: 'relative', width }}>
      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.n700, display: 'flex', pointerEvents: 'none' }}><IcSearch size={14} /></span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="suite-campo"
        style={{ width: '100%', height: SIZE.control, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 10px 0 32px', fontSize: 12, fontFamily: FONT, outline: 'none', boxSizing: 'border-box', background: C.n000 }} />
    </div>
  );
}

/** Contador redondo de la lista de grupos de producción. */
export function Contador({ n }: { n: number }) {
  return (
    <span style={{ minWidth: 26, height: 26, borderRadius: '50%', background: C.brandBg, color: C.brand, fontSize: 11, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
  );
}

export function Chevron({ abierto }: { abierto: boolean }) {
  return <span style={{ display: 'inline-flex', transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform .12s', color: C.n700 }}><IcChevronRight size={12} /></span>;
}

export * from './kit/base';
export * from './kit/tabla';
export * from './kit/modales';
export * from './kit/selectores';
export * from './kit/maestro';
import { SubTabs } from './kit/maestro';
