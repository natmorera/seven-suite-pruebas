'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Componentes base de Seven Suite.
// Copia fiel de Accounting (components/ui/primitives.tsx): mismas medidas,
// mismos pesos, mismos bordes. La única diferencia es que el color de marca
// sale de var(--brand), así que cada módulo se pinta con su color.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import { C, FONT, radius, shadow, overlay, SIZE, PAGE_PAD, Z } from './tokens';
import { IcClose, IcSearch, IcWarning, IcCheck } from './icons';

// ── Button ──────────────────────────────────────────────────────────────────
export type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
const BTN: Record<BtnVariant, CSSProperties> = {
  primary:   { background: C.brand, color: '#fff', border: `1px solid ${C.brand}` },
  secondary: { background: C.n000,  color: C.n900, border: `1px solid ${C.n500}` },
  ghost:     { background: 'transparent', color: C.n700, border: '1px solid transparent' },
  danger:    { background: C.n000,  color: C.error, border: `1px solid ${C.error}` },
};
export function Button({ children, onClick, variant = 'primary', disabled, type = 'button', style, icon, title }: {
  children: ReactNode; onClick?: () => void; variant?: BtnVariant; disabled?: boolean;
  type?: 'button' | 'submit'; style?: CSSProperties; icon?: ReactNode; title?: string;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title}
      style={{ ...BTN[variant], height: SIZE.control, padding: '0 12px', borderRadius: radius.control, fontSize: 12,
        fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap', ...style }}>
      {icon && <span style={{ display: 'flex', alignItems: 'center', width: 16, height: 16, justifyContent: 'center', flexShrink: 0 }}>{icon}</span>}
      {children}
    </button>
  );
}

// ── Barras de página: PageHeader → TabBar → FilterBar → contenido ──────────
export function PageHeader({ title, left, children }: { title: string; left?: ReactNode; children?: ReactNode }) {
  return (
    <div style={{ height: SIZE.header, minHeight: SIZE.header, background: C.n000, borderBottom: `1px solid ${C.n500}`,
      padding: `0 ${PAGE_PAD}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <h1 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: C.n900, whiteSpace: 'nowrap' }}>{title}</h1>
        {left}
      </div>
      {children && <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>{children}</div>}
    </div>
  );
}

export interface TabItem { label: string; count?: number }
export function TabBar({ tabs, active, onChange, actions }: {
  tabs: (string | TabItem)[]; active: number; onChange: (i: number) => void; actions?: ReactNode;
}) {
  const items: TabItem[] = tabs.map(t => (typeof t === 'string' ? { label: t } : t));
  return (
    <div style={{ height: SIZE.tabBar, minHeight: SIZE.tabBar, background: C.n000, borderBottom: `1px solid ${C.n500}`,
      padding: `0 ${PAGE_PAD}px`, display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', flexShrink: 0, gap: 12 }}>
      <div role="tablist" style={{ display: 'flex', height: '100%', alignItems: 'flex-end', overflowX: 'auto', overflowY: 'hidden', minWidth: 0 }}>
        {items.map((item, i) => {
          const on = active === i;
          return (
            <button key={item.label} role="tab" aria-selected={on} onClick={() => onChange(i)}
              style={{ height: '100%', padding: '0 14px', fontSize: 12, fontWeight: on ? 600 : 400, color: on ? C.brand : C.n700, fontFamily: FONT,
                background: 'none', border: 'none', borderBottom: on ? `2px solid ${C.brand}` : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {item.label}
              {item.count !== undefined && (
                <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: on ? C.brand : C.n500, color: on ? '#fff' : C.n900,
                  fontSize: 10, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{item.count}</span>
              )}
            </button>
          );
        })}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}

/** Orden dentro de la barra: búsqueda, dropdowns, radios, checkboxes, toggles. Acciones a la derecha. */
export function FilterBar({ children, right }: { children?: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ background: C.n000, borderBottom: `1px solid ${C.n500}`, padding: `8px ${PAGE_PAD}px`, display: 'flex', alignItems: 'center',
      gap: 8, flexWrap: 'wrap', flexShrink: 0, minHeight: SIZE.filterBarMin, boxSizing: 'border-box' }}>
      {children}
      {right && <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{right}</div>}
    </div>
  );
}

/** Zona de contenido con scroll propio (el header de la página nunca se mueve). */
export function PageBody({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: PAGE_PAD, ...style }}>{children}</div>;
}

/** Página completa: columna que ocupa el alto del <main> del shell. */
export function Page({ children }: { children: ReactNode }) {
  return <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: FONT, minHeight: 0 }}>{children}</div>;
}

// ── Formularios ─────────────────────────────────────────────────────────────
export function FormField({ label, required, error, hint, children }: {
  label?: string; required?: boolean; error?: string; hint?: string; children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: FONT }}>
      {label && <label style={{ fontSize: 11, fontWeight: 500, color: C.n900 }}>{label}{required && <span style={{ color: C.error, marginLeft: 2 }}>*</span>}</label>}
      {children}
      {hint && !error && <p style={{ fontSize: 11, color: C.n700, margin: 0 }}>{hint}</p>}
      {error && <p style={{ fontSize: 11, color: C.error, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><IcWarning />{error}</p>}
    </div>
  );
}

const campo = (error?: string, apagado?: boolean): CSSProperties => ({
  height: SIZE.control, padding: '0 10px', border: `1px solid ${error ? C.error : C.n500}`, borderRadius: radius.control,
  fontSize: 12, fontFamily: FONT, background: apagado ? C.n200 : C.n000, outline: 'none', width: '100%', color: C.n900, boxSizing: 'border-box',
});

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'style'> {
  value: string | number; onChange?: (v: string) => void; error?: string; style?: CSSProperties;
}
export function Input({ value, onChange, error, style, disabled, readOnly, ...rest }: InputProps) {
  return (
    <input value={value} onChange={e => onChange?.(e.target.value)} disabled={disabled} readOnly={readOnly} {...rest}
      className="suite-campo" data-error={error ? '' : undefined}
      style={{ ...campo(error, disabled || readOnly), ...style }} />
  );
}

export function Select({ value, onChange, options, disabled, error }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean; error?: string;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="suite-campo"
      style={{ ...campo(error, disabled), cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…', width = 200 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; width?: number | string;
}) {
  return (
    <div style={{ position: 'relative', width, flexShrink: 0 }}>
      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.n700, display: 'flex', pointerEvents: 'none' }}><IcSearch size={16} /></span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="suite-campo"
        style={{ ...campo(), padding: '0 12px 0 34px' }} />
    </div>
  );
}

export function Checkbox({ label, checked, onChange, id }: { label?: ReactNode; checked: boolean; onChange: (v: boolean) => void; id?: string }) {
  return (
    <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontFamily: FONT, color: C.n900 }}>
      <span style={{ position: 'relative', width: 16, height: 16, flexShrink: 0 }}>
        <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} className="suite-oculto" />
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 5,
          border: `1.5px solid ${checked ? C.brand : C.n500}`, background: checked ? C.brand : C.n000, color: '#fff', transition: 'all .12s' }}>
          {checked && <IcCheck />}
        </span>
      </span>
      {label}
    </label>
  );
}

export function Radio({ label, checked, onChange, name, id }: { label?: ReactNode; checked: boolean; onChange: () => void; name?: string; id?: string }) {
  return (
    <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontFamily: FONT, color: C.n900 }}>
      <span style={{ position: 'relative', width: 16, height: 16, flexShrink: 0 }}>
        <input type="radio" id={id} name={name} checked={checked} onChange={onChange} className="suite-oculto" />
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%',
          border: `1.5px solid ${checked ? C.brand : C.n500}`, background: C.n000 }}>
          {checked && <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.brand }} />}
        </span>
      </span>
      {label}
    </label>
  );
}

/** El switch encendido es verde (success) en todos los módulos, como en Accounting. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean }) {
  return (
    <div onClick={() => !disabled && onChange(!checked)} role="switch" aria-checked={checked} tabIndex={disabled ? -1 : 0}
      onKeyDown={e => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onChange(!checked); } }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ width: 36, height: 20, borderRadius: radius.pill, background: checked ? C.success : C.n500, position: 'relative', transition: 'background .15s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: C.n000, top: 3, left: checked ? 18 : 3, transition: 'left .15s' }} />
      </div>
      {label && <span style={{ fontSize: 12, fontFamily: FONT, color: C.n900 }}>{label}</span>}
    </div>
  );
}

export function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 8px', borderRadius: radius.pill,
      background: C.brandBg, border: `1px solid ${C.brandBd}`, fontSize: 11, color: C.brand, fontFamily: FONT }}>
      {label}
      <button onClick={onClear} aria-label={`Quitar ${label}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.brand, fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
    </span>
  );
}

// ── Contenedores ────────────────────────────────────────────────────────────
export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div style={{ background: C.n000, borderRadius: radius.card, overflow: 'hidden', border: `1px solid ${C.n500}`, fontFamily: FONT }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.n500}` }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: C.n900, margin: 0 }}>{title}</p>
        {hint && <p style={{ fontSize: 11, color: C.n700, margin: '2px 0 0' }}>{hint}</p>}
      </div>
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  );
}

export function InfoBox({ children, variant = 'brand' }: { children: ReactNode; variant?: 'brand' | 'neutral' }) {
  const b = variant === 'brand';
  return (
    <div style={{ padding: '10px 12px', background: b ? C.brandBg : C.n000, border: b ? `1px solid ${C.brandBd}` : 'none', borderRadius: radius.md }}>
      <p style={{ fontSize: 11, color: b ? C.brandDk : C.n700, margin: 0, lineHeight: 1.5, fontFamily: FONT }}>{children}</p>
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div style={{ minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: 24, fontFamily: FONT }}>
      <p style={{ fontSize: 12.5, color: C.n700, margin: 0, maxWidth: 380 }}>{message}</p>
      {action}
    </div>
  );
}

// ── Tabla ───────────────────────────────────────────────────────────────────
export function DataTable({ headers, children, alinearDerecha = [] }: { headers: string[]; children: ReactNode; alinearDerecha?: number[] }) {
  return (
    <div style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT, fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.n200, borderBottom: `1px solid ${C.n500}` }}>
            {headers.map((h, i) => (
              <th key={`${i}-${h}`} style={{ padding: '8px 14px', textAlign: alinearDerecha.includes(i) ? 'right' : 'left', fontSize: 11, fontWeight: 500, color: C.n700, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function DataRow({ children, onClick, selected }: { children: ReactNode; onClick?: () => void; selected?: boolean }) {
  return (
    <tr onClick={onClick} className={selected ? undefined : 'suite-fila'}
      style={{ borderBottom: `1px solid ${C.n500}`, cursor: onClick ? 'pointer' : 'default', background: selected ? C.brandBg : undefined }}>
      {children}
    </tr>
  );
}
export function Td({ children, muted, right, colSpan }: { children: ReactNode; muted?: boolean; right?: boolean; colSpan?: number }) {
  return (
    <td colSpan={colSpan} style={{ padding: '8px 14px', color: muted ? C.n700 : C.n900, fontSize: 12, textAlign: right ? 'right' : 'left',
      fontVariantNumeric: right ? 'tabular-nums' : undefined }}>{children}</td>
  );
}

// ── Estado ──────────────────────────────────────────────────────────────────
export type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'brand' | 'orange';
const BADGE: Record<BadgeColor, { bg: string; color: string; border: string }> = {
  green:  { bg: 'rgba(76,175,80,.08)',  color: '#2E7D32', border: 'rgba(76,175,80,.25)' },
  yellow: { bg: 'rgba(238,179,0,.08)',  color: '#7A5C00', border: 'rgba(238,179,0,.25)' },
  red:    { bg: 'rgba(244,67,54,.08)',  color: '#C62828', border: 'rgba(244,67,54,.25)' },
  blue:   { bg: 'rgba(33,150,243,.08)', color: '#1565C0', border: 'rgba(33,150,243,.25)' },
  orange: { bg: 'rgba(255,112,67,.10)', color: '#BF360C', border: 'rgba(255,112,67,.35)' },
  gray:   { bg: C.n200, color: C.n700, border: C.n500 },
  brand:  { bg: C.brandBg, color: C.brand, border: C.brandBd },
};
export function StatusBadge({ label, color, title }: { label: string; color: BadgeColor; title?: string }) {
  const s = BADGE[color];
  return (
    <span title={title} style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '2px 8px',
      borderRadius: radius.pill, fontSize: 10, fontWeight: 500, fontFamily: FONT, whiteSpace: 'nowrap' }}>{label}</span>
  );
}

// ── Capas ───────────────────────────────────────────────────────────────────
export function Modal({ open, title, onClose, children, footer, width = 520 }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number | string;
}) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: overlay, zIndex: Z.modal, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div role="dialog" aria-modal aria-label={title} onClick={e => e.stopPropagation()}
        style={{ background: C.n000, borderRadius: radius.card, width, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: shadow.modal, fontFamily: FONT }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.n500}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: C.n900 }}>{title}</span>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'flex', padding: 4 }}><IcClose size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>{children}</div>
        {footer && <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.n500}`, flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  const cerrar = useRef(onClose);
  useEffect(() => { cerrar.current = onClose; });
  useEffect(() => { const t = setTimeout(() => cerrar.current(), 3500); return () => clearTimeout(t); }, []);
  return (
    <div role="status" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: Z.toast, background: type === 'success' ? C.success : C.error, color: '#fff',
      padding: '10px 16px', borderRadius: radius.md, fontSize: 12, fontWeight: 500, boxShadow: shadow.toast, display: 'flex', gap: 10, alignItems: 'center', fontFamily: FONT }}>
      {type === 'success' ? <IcCheck size={14} /> : <IcClose size={14} />}
      {message}
      <button onClick={onClose} aria-label="Cerrar aviso" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><IcClose size={12} /></button>
    </div>
  );
}

/**
 * Estilos que no se pueden poner inline (foco, hover, input oculto).
 * El SuiteShell ya lo incluye; solo hace falta si se usan estos componentes fuera de él.
 */
export function EstilosSuite() {
  return (
    <style>{`
      .suite-campo:focus { border-color: var(--brand) !important; }
      .suite-campo[data-error]:focus { border-color: #F44336 !important; }
      .suite-oculto { position: absolute; opacity: 0; width: 16px; height: 16px; margin: 0; cursor: pointer; }
      .suite-oculto:focus-visible + span { outline: 2px solid var(--brand); outline-offset: 2px; }
      .suite-fila:hover { background: #F9F9F9; }
      .suite-shell button:focus-visible, .suite-shell a:focus-visible, [role="switch"]:focus-visible, [role="tab"]:focus-visible {
        outline: 2px solid var(--brand-on-dark, var(--brand)); outline-offset: 1px;
      }
      @media (prefers-reduced-motion: reduce) { .suite-shell * { transition: none !important; } }
    `}</style>
  );
}
