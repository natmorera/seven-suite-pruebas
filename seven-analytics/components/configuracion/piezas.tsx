"use client";
// Piezas de las pantallas de Configuración, iguales a las de Accounting y los
// demás módulos de la suite: encabezado de página, pestañas, tarjeta de sección
// y campos de formulario.
import { useId } from "react";

export const FONT = "var(--font-montserrat), sans-serif";
export const C = { brand: "#5900D9", n900: "#0F0F0F", n700: "#757575", n500: "#ECECEC", n200: "#F9F9F9", n000: "#FFFFFF" };

export function PageHeader({ title, onMenu, children }: { title: string; onMenu?: () => void; children?: React.ReactNode }) {
  return (
    <div style={{ height: 52, minHeight: 52, background: C.n000, borderBottom: `1px solid ${C.n500}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {onMenu && (
          <button onClick={onMenu} aria-label="Abrir menú" className="md:hidden"
            style={{ width: 32, height: 32, border: `1px solid ${C.n500}`, borderRadius: 4, background: C.n000, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round"><path d="M2.5 4h11M2.5 8h11M2.5 12h11" /></svg>
          </button>
        )}
        <h1 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: C.n900, whiteSpace: "nowrap" }}>{title}</h1>
      </div>
      {children && <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>{children}</div>}
    </div>
  );
}

export function TabBar({ tabs, active, onChange }: { tabs: string[]; active: number; onChange: (i: number) => void }) {
  return (
    <div role="tablist" style={{ height: 40, minHeight: 40, background: C.n000, borderBottom: `1px solid ${C.n500}`, padding: "0 24px", display: "flex", alignItems: "flex-end", flexShrink: 0 }}>
      {tabs.map((t, i) => (
        <button key={t} role="tab" aria-selected={active === i} onClick={() => onChange(i)}
          style={{ height: "100%", padding: "0 14px", fontSize: 12, fontWeight: active === i ? 600 : 400, color: active === i ? C.brand : C.n700, fontFamily: FONT,
            background: "none", border: "none", borderBottom: active === i ? `2px solid ${C.brand}` : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap" }}>
          {t}
        </button>
      ))}
    </div>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.n000, borderRadius: 10, overflow: "hidden", fontFamily: FONT }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.n500}` }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: C.n900, margin: 0 }}>{title}</p>
        {hint && <p style={{ fontSize: 11, color: C.n700, margin: "2px 0 0" }}>{hint}</p>}
      </div>
      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
    </div>
  );
}

export function FormField({ label, children }: { label: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label htmlFor={id} style={{ fontSize: 11, fontWeight: 500, color: C.n900, fontFamily: FONT }}>{label}</label>
      {children(id)}
    </div>
  );
}

const control = { height: 32, padding: "0 10px", border: `1px solid ${C.n500}`, borderRadius: 4, fontSize: 12, fontFamily: FONT, background: C.n000, outline: "none", width: "100%", color: C.n900 };
export function Input({ id, value, onChange, placeholder, type = "text" }: { id?: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={control}
    onFocus={(e) => { e.target.style.borderColor = C.brand; }} onBlur={(e) => { e.target.style.borderColor = C.n500; }} />;
}
export function Select({ id, value, onChange, options }: { id?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={{ ...control, cursor: "pointer" }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
export function Button({ variant = "primary", onClick, children }: { variant?: "primary" | "secondary"; onClick: () => void; children: React.ReactNode }) {
  const p = variant === "primary";
  return (
    <button onClick={onClick} style={{ height: 32, padding: "0 14px", borderRadius: 4, fontSize: 12, fontWeight: 500, fontFamily: FONT, cursor: "pointer",
      border: p ? "none" : `1px solid ${C.n500}`, background: p ? C.brand : C.n000, color: p ? "#fff" : C.n900, display: "flex", alignItems: "center", gap: 6 }}>{children}</button>
  );
}
