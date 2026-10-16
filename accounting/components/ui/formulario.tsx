'use client';
import { ReactNode, ReactElement, CSSProperties, cloneElement, isValidElement } from 'react';
import { IcWarning } from './icons';
import { C, FONT, radius } from './tokens';

// ── Button ────────────────────────────────────────────────────────────────────
export type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export const BTN: Record<BtnVariant, CSSProperties> = {
  primary:   { background: C.brand,   color: '#FFFFFF',      border: `1px solid ${C.brand}`   },
  secondary: { background: C.n000,    color: C.n900,      border: `1px solid ${C.n500}`    },
  ghost:     { background: 'transparent', color: C.n700,  border: '1px solid transparent'  },
  danger:    { background: C.n000,    color: C.error,     border: `1px solid ${C.error}`   },
};
export interface ButtonProps {
  children: ReactNode; onClick?: () => void;
  variant?: BtnVariant; disabled?: boolean;
  type?: 'button' | 'submit'; style?: CSSProperties;
  icon?: ReactNode; title?: string;
}
export function Button({ children, onClick, variant = 'primary', disabled, type = 'button', style, icon, title }: ButtonProps) {
  // Issue: cada pantalla pasaba su propio tamaño de ícono al botón (w-3, w-3.5,
  // w-4...) sin ningún criterio - la spec de diseño pide 16px siempre para el
  // ícono de un botón. En vez de salir a tocar cada uno de los usos de <Button
  // icon={...}> en la app (decenas de archivos), se fuerza acá una sola vez:
  // no importa qué tamaño traiga el ícono que le pasan, siempre se re-renderiza
  // a 16x16 dentro del botón.
  const iconEl = isValidElement(icon) ? cloneElement(icon as ReactElement<{ className?: string }>, { className: 'w-4 h-4' }) : icon;
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title}
      style={{ ...BTN[variant], height: 32, padding: '0 12px', borderRadius: 4, fontSize: 12,
        fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 10,
        whiteSpace: 'nowrap', ...style }}>
      {icon && <span style={{ display: 'flex', alignItems: 'center', width: 16, height: 16, flexShrink: 0 }}>{iconEl}</span>}
      {children}
    </button>
  );
}
// ── FormField ─────────────────────────────────────────────────────────────────
export function FormField({ label, required, error, hint, children }: {
  label?: string; required?: boolean; error?: string; hint?: string; children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 500, color: C.n900, fontFamily: FONT }}>
          {label}{required && <span style={{ color: C.error, marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p style={{ fontSize: 11, color: C.n700, margin: 0 }}>{hint}</p>}
      {error && (
        <p style={{ fontSize: 11, color: C.error, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          <IcWarning className="w-3 h-3" />{error}
        </p>
      )}
    </div>
  );
}
// ── Input ─────────────────────────────────────────────────────────────────────
export interface InputProps {
  value: string | number; onChange?: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean;
  readOnly?: boolean; error?: string; style?: CSSProperties;
  min?: string | number; max?: string | number; step?: string | number;
}
export function Input({ value, onChange, placeholder, type = 'text', disabled, readOnly, error, style, ...rest }: InputProps) {
  return (
    <input type={type} value={value} onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder} disabled={disabled} readOnly={readOnly} {...rest}
      style={{ height: 32, padding: '0 10px', border: `1px solid ${error ? C.error : C.n500}`,
        borderRadius: 4, fontSize: 12, fontFamily: FONT, background: (disabled || readOnly) ? C.n200 : C.n000,
        outline: 'none', width: '100%', color: C.n900, ...style }}
      onFocus={e => { if (!error) e.target.style.borderColor = C.brand; }}
      onBlur={e => { e.target.style.borderColor = error ? C.error : C.n500; }} />
  );
}
// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ value, onChange, options, disabled, error }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean; error?: string;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      style={{ height: 32, padding: '0 10px', border: `1px solid ${error ? C.error : C.n500}`,
        borderRadius: 4, fontSize: 12, fontFamily: FONT, background: disabled ? C.n200 : C.n000,
        outline: 'none', width: '100%', color: C.n900, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
// ── Radio ─────────────────────────────────────────────────────────────────────
// Antes cada pantalla que necesitaba un radio nativo (ej. Analítico de cuentas,
// Presupuesto) le ponía su propio estilo inline a mano. Este átomo replica el
// mismo lenguaje visual del Checkbox (círculo con borde de marca cuando está
// seleccionado) para que ambos controles se vean como parte del mismo sistema.
export function Radio({ label, checked, onChange, name, id }: {
  label?: ReactNode; checked: boolean; onChange: () => void; name?: string; id?: string;
}) {
  return (
    <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontFamily: FONT, color: C.n900 }}>
      <span style={{ position: 'relative', width: 16, height: 16, flexShrink: 0 }}>
        <input type="radio" id={id} name={name} checked={checked} onChange={onChange}
          style={{ position: 'absolute', opacity: 0, width: 16, height: 16, margin: 0, cursor: 'pointer' }} />
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: '50%',
          border: `1.5px solid ${checked ? C.brand : C.n500}`,
          background: C.n000, transition: 'all .12s',
        }}>
          {checked && <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.brand }} />}
        </span>
      </span>
      {label}
    </label>
  );
}
// ── Switch ────────────────────────────────────────────────────────────────────
// Consolidado a partir del toggle que ya existía repetido (con distintos
// tamaños/colores) en Bandeja de asientos, Usuarios y permisos, Config, etc.
export function Switch({ checked, onChange, label, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean;
}) {
  return (
    <div onClick={() => !disabled && onChange(!checked)} role="switch" aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={e => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onChange(!checked); } }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? .5 : 1 }}>
      <div style={{ width: 36, height: 20, borderRadius: radius.pill, background: checked ? C.success : C.n500, position: 'relative', transition: 'background .15s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: C.n000, top: 3, left: checked ? 18 : 3, transition: 'left .15s' }} />
      </div>
      {label && <span style={{ fontSize: 12, fontFamily: FONT, color: C.n900 }}>{label}</span>}
    </div>
  );
}
// ── Checkbox - esquinas levemente redondeadas (#30) ──────────────────────────
export function Checkbox({ label, checked, onChange, id }: {
  label?: string; checked: boolean; onChange: (v: boolean) => void; id?: string;
}) {
  return (
    <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontFamily: FONT, color: C.n900 }}>
      <span style={{ position: 'relative', width: 16, height: 16, flexShrink: 0 }}>
        <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, width: 16, height: 16, margin: 0, cursor: 'pointer' }} />
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: 4,
          border: `1px solid ${checked ? C.brand : C.n500}`,
          background: checked ? C.brand : C.n000, transition: 'all .12s',
        }}>
          {checked && (
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.33 7L5.25 9.92L11.67 4.08" />
            </svg>
          )}
        </span>
      </span>
      {label}
    </label>
  );
}
