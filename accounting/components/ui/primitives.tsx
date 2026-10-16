'use client';
import { useEffect, useState, ReactNode } from 'react';
import { IcClose } from './icons';
import { C, FONT, radius } from './tokens';

// ── InfoBox - sin ícono (#9), sin borde gris en variante neutra (#11) ─────────
export function InfoBox({ children, variant = 'brand' }: { children: ReactNode; variant?: 'brand' | 'neutral' }) {
  const isBrand = variant === 'brand';
  return (
    <div style={{ padding: '10px 12px', background: isBrand ? C.brandBg : C.n000,
      border: isBrand ? `1px solid ${C.brandBd}` : 'none',
      borderRadius: radius.md }}>
      <p style={{ fontSize: 11, color: isBrand ? '#8A6200' : C.n700, margin: 0, lineHeight: 1.5 }}>{children}</p>
    </div>
  );
}
// ── Section card ──────────────────────────────────────────────────────────────
// ── Section: tarjeta estándar de Configuración ────────────────────────────────
// Modelo: Empresa → Consecutivos de documentos (ver ESTANDAR-CONFIGURACION.md).
// Tarjeta blanca sobre el gris de la página: título + descripción, separador,
// y adentro InfoBox / barra de búsqueda / tabla (DataTable o TABLA.wrap).
// `actions`: acciones propias de la sección, a la derecha del título.
export function Section({ title, hint, actions, children }: { title: string; hint?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ background: C.n000, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.n500}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: C.n900, margin: 0 }}>{title}</p>
          {hint && <p style={{ fontSize: 11, color: C.n700, margin: '2px 0 0' }}>{hint}</p>}
        </div>
        {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{actions}</div>}
      </div>
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  );
}
// ── RowAction: botón de la columna "Acciones" ─────────────────────────────────
// 28px, solo ícono, sin borde. Gris (Neutro/700) salvo acciones destructivas,
// que van en rojo. Siempre con title (tooltip) que diga qué hace.
export function RowAction({ title, onClick, danger, children }: { title: string; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; danger?: boolean; children: ReactNode }) {
  return (
    <button type="button" title={title} onClick={e => { e.stopPropagation(); onClick(e); }}
      style={{ width: 28, height: 28, borderRadius: radius.sm, border: 'none', background: 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, color: danger ? C.error : C.n700 }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? C.errorBg : C.n200; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
      {children}
    </button>
  );
}
// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, title, hint, onClose, children, footer, wide }: {
  open: boolean; title: string; hint?: string; onClose: () => void;
  children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: C.n000, borderRadius: 10, width: wide ? '90vw' : 520, maxWidth: '100%',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,.18)', fontFamily: FONT }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.n500}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 500, color: C.n900 }}>{title}</span>
            {hint && <p style={{ fontSize: 11, color: C.n700, margin: '2px 0 0', lineHeight: 1.5 }}>{hint}</p>}
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: C.n700, display: 'flex', padding: 4, flexShrink: 0 }}>
            <IcClose className="w-4 h-4" />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>{children}</div>
        {footer && (
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.n500}`, flexShrink: 0 }}>{footer}</div>
        )}
      </div>
    </div>
  );
}
// ── Toast ─────────────────────────────────────────────────────────────────────
export function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const bg = type === 'success' ? C.success : C.error;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, background: bg,
      color: '#FFFFFF', padding: '10px 16px', borderRadius: radius.md, fontSize: 12, fontWeight: 500,
      boxShadow: '0 4px 12px rgba(0,0,0,.2)', display: 'flex', gap: 10, alignItems: 'center', fontFamily: FONT }}>
      <span style={{ display:'flex', flexShrink:0 }}>
        {type === 'success'
          ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.33 7L5.25 9.92L11.67 4.08"/></svg>
          : <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"><path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"/></svg>}
      </span>
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}>
        <IcClose className="w-3 h-3" />
      </button>
    </div>
  );
}
// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, left, children }: { title: string; left?: ReactNode; children?: ReactNode }) {
  return (
    <div style={{ height: 52, minHeight: 52, background: C.n000, borderBottom: `1px solid ${C.n500}`,
      padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <h1 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: C.n900, whiteSpace: 'nowrap' }}>{title}</h1>
        {left}
      </div>
      {children && <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>{children}</div>}
    </div>
  );
}
// ── TabBar ────────────────────────────────────────────────────────────────────
// Acepta tabs como string simple o como { label, count } cuando la sección
// necesita mostrar una cantidad (p. ej. "Pendientes 6") - antes cada pantalla
// con contador armaba sus propios tabs a mano (ver Bandeja de asientos), sin
// compartir look con el resto de la app.
export interface TabItem { label: string; count?: number }
export function TabBar({ tabs, active, onChange, actions }: {
  tabs: (string | TabItem)[]; active: number; onChange: (i: number) => void; actions?: ReactNode;
}) {
  const items: TabItem[] = tabs.map(t => typeof t === 'string' ? { label: t } : t);
  return (
    <div style={{ height: actions ? 52 : 40, minHeight: actions ? 52 : 40, background: C.n000, borderBottom: `1px solid ${C.n500}`,
      padding: '0 24px', display: 'flex', alignItems: actions ? 'center' : 'flex-end', justifyContent: 'space-between',
      flexShrink: 0 }}>
      <div style={{ display: 'flex', height: '100%', alignItems: 'flex-end' }}>
        {items.map((item, i) => (
          <button key={item.label} onClick={() => onChange(i)}
            style={{ height: '100%', padding: '0 14px', fontSize: 12, fontWeight: active === i ? 600 : 400,
              color: active === i ? C.brand : C.n700, fontFamily: FONT,
              background: 'none', border: 'none', borderBottom: active === i ? `2px solid ${C.brand}` : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
            {item.label}
            {item.count !== undefined && (
              <span style={{ width: 18, height: 18, borderRadius: 9, background: active === i ? C.brand : C.n500, color: '#FFFFFF',
                fontSize: 10, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}
// ── Presencia por operación ───────────────────────────────────────────────────
// Para formularios de bancos (crear/editar cheque, depósito, transferencia,
// liquidación, conciliación, gestión de cobro/pago): al ser datos sensibles,
// se muestra quién más de la empresa está en ESTA operación específica ahora
// mismo - distinto del widget global "usuarios activos" del Dashboard, que es
// del sistema completo. Placeholder con datos de ejemplo; en producción esto
// vendría de una sesión colaborativa en tiempo real (websocket) atada al id
// del registro que se está editando.
const PRESENCIA_MOCK = [
  { iniciales:'MJ', color:'#2563EB', nombre:'Maria Jimenez' },
  { iniciales:'CN', color:'#1D9E75', nombre:'Cristina Navarro' },
  { iniciales:'SR', color:'#E0642C', nombre:'Sergio Ruíz' },
];
export function PresenciaOperacion({ usuarios = PRESENCIA_MOCK }: { usuarios?: {iniciales:string; color:string; nombre:string}[] }) {
  const [open, setOpen] = useState(false);
  if (usuarios.length === 0) return null;
  const F = FONT;
  return (
    <div style={{ position:'relative', display:'inline-block' }}
      onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
      <div style={{ display:'flex', alignItems:'center', cursor:'default' }}>
        {usuarios.map((u,i)=>(
          <div key={u.nombre} title={u.nombre} style={{
            width:24, height:24, borderRadius:'50%', background:u.color, color:'#FFFFFF',
            fontSize:9.5, fontWeight:600, fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center',
            border:'2px solid #FFFFFF', marginLeft: i===0?0:-8, position:'relative', zIndex:usuarios.length-i,
          }}>{u.iniciales}</div>
        ))}
      </div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, background:'#FFFFFF', border:`1px solid ${C.n500}`,
          borderRadius:radius.md, boxShadow:'0 4px 16px rgba(0,0,0,.12)', padding:'10px 12px', zIndex:50, minWidth:190 }}>
          <div style={{ fontSize:10, color:C.n700, fontFamily:F, marginBottom:8, fontWeight:600, letterSpacing:'.04em' }}>
            EN ESTA OPERACIÓN AHORA
          </div>
          {usuarios.map(u=>(
            <div key={u.nombre} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0' }}>
              <div style={{ width:18, height:18, borderRadius:'50%', background:u.color, color:'#FFFFFF', fontSize:8, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{u.iniciales}</div>
              <span style={{ fontSize:12, color:C.n900, fontFamily:F }}>{u.nombre}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
