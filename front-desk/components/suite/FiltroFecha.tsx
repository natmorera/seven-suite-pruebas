'use client';
// Filtro de fechas estándar de la suite (el mismo de Digital Invoices): botón con la etiqueta o el rango elegido y
// panel «Período de fecha» con Limpiar, atajos en dos columnas, rango personalizado, la fecha de hoy y
// Cancelar / Aplicar. Los atajos se calculan desde la fecha hotelera.
import { useEffect, useRef, useState } from 'react';
import { C, FONT, SIZE, radius, shadow, Z } from './tokens';
import { HOY } from '@/components/hotel/datos';

const d12 = (s: string) => new Date(s + 'T12:00:00');
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmt = (s: string) => (s ? s.split('-').reverse().join('/') : '');
const dias = (a: string, b: string) => Math.round((d12(b).getTime() - d12(a).getTime()) / 86400000) + 1;

/** Atajos relativos a la fecha hotelera. `futuro`: semana, mes y trimestre desde hoy hacia adelante y «Próximo mes». */
export function atajosFecha(hoy = HOY, futuro = false): { label: string; desde: string; hasta: string }[] {
  const n = d12(hoy);
  const lunes = new Date(n); lunes.setDate(n.getDate() - ((n.getDay() + 6) % 7));
  const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
  const q = Math.floor(n.getMonth() / 3);
  const mes = (k: number, fin = false) => iso(new Date(n.getFullYear(), n.getMonth() + k + (fin ? 1 : 0), fin ? 0 : 1));
  return futuro ? [
    { label: 'Hoy', desde: hoy, hasta: hoy },
    { label: 'Esta semana', desde: hoy, hasta: iso(domingo) },
    { label: 'Este mes', desde: hoy, hasta: mes(0, true) },
    { label: 'Próximo mes', desde: mes(1), hasta: mes(1, true) },
    { label: 'Este trimestre', desde: hoy, hasta: iso(new Date(n.getFullYear(), q * 3 + 3, 0)) },
    { label: 'Este año', desde: hoy, hasta: `${hoy.slice(0, 4)}-12-31` },
  ] : [
    { label: 'Hoy', desde: hoy, hasta: hoy },
    { label: 'Esta semana', desde: iso(lunes), hasta: iso(domingo) },
    { label: 'Este mes', desde: mes(0), hasta: mes(0, true) },
    { label: 'Mes anterior', desde: mes(-1), hasta: mes(-1, true) },
    { label: 'Este trimestre', desde: iso(new Date(n.getFullYear(), q * 3, 1)), hasta: iso(new Date(n.getFullYear(), q * 3 + 3, 0)) },
    { label: 'Este año', desde: `${hoy.slice(0, 4)}-01-01`, hasta: `${hoy.slice(0, 4)}-12-31` },
  ];
}

/** Texto del botón: el atajo si coincide, si no el rango. */
export function textoRango(desde: string, hasta: string, futuro = false) {
  const a = atajosFecha(HOY, futuro).find(x => x.desde === desde && x.hasta === hasta);
  if (a) return a.label;
  if (desde && hasta) return desde === hasta ? fmt(desde) : `${fmt(desde)} – ${fmt(hasta)}`;
  return desde ? `Desde ${fmt(desde)}` : hasta ? `Hasta ${fmt(hasta)}` : '';
}

export function FiltroFecha({ label, desde, hasta, onChange, futuro, alinear = 'left', vacio = 'Todas' }: {
  label: string; desde: string; hasta: string; onChange: (desde: string, hasta: string) => void;
  /** Atajos hacia adelante (disponibilidad, llegadas). */
  futuro?: boolean; alinear?: 'left' | 'right';
  /** Texto cuando no hay rango («Todas», «Todo el histórico»). */
  vacio?: string;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState({ d: desde, h: hasta });
  const ref = useRef<HTMLSpanElement>(null);
  const activo = !!(desde || hasta);
  useEffect(() => {
    if (!open) return;
    const fuera = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', fuera); window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fuera); window.removeEventListener('keydown', esc); };
  }, [open]);
  const invalido = !!(local.d && local.h && local.h < local.d);
  const hoyTxt = d12(HOY).toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' });
  const campo = (k: 'd' | 'h', l: string) => (
    <label style={{ display: 'contents' }}>
      <span style={{ fontSize: 12, color: C.n700 }}>{l}</span>
      <input type="date" value={local[k]} onChange={e => setLocal(x => ({ ...x, [k]: e.target.value }))} aria-label={`${label} ${l.toLowerCase()}`} className="suite-campo"
        style={{ height: SIZE.control, padding: '0 8px', border: `1px solid ${C.n500}`, borderRadius: radius.md, fontSize: 12.5, fontFamily: FONT, color: C.n900, outline: 'none', minWidth: 0 }} />
    </label>
  );
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <button type="button" onClick={() => { setLocal({ d: desde, h: hasta }); setOpen(o => !o); }} aria-expanded={open} aria-haspopup="dialog" className="suite-campo"
        style={{ height: SIZE.control, padding: '0 12px', border: `1px solid ${activo || open ? C.brand : C.n500}`, borderRadius: radius.control, background: activo ? C.brandBg : C.n000,
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: FONT, color: activo ? C.brand : C.n900, fontWeight: activo ? 500 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }} title={activo ? textoRango(desde, hasta, futuro) : undefined}>{label}: {activo ? textoRango(desde, hasta, futuro) : vacio}</span>
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden><path d="M3.5 5.25L7 8.75L10.5 5.25" /></svg>
      </button>
      {open && (
        <div role="dialog" aria-label="Período de fecha"
          style={{ position: 'absolute', top: 'calc(100% + 6px)', [alinear]: 0, zIndex: Z.dropdown, width: 300, background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card,
            boxShadow: shadow.panel, fontFamily: FONT, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.n900 }}>Período de fecha</span>
            <button type="button" onClick={() => { setLocal({ d: '', h: '' }); onChange('', ''); setOpen(false); }}
              style={{ border: 'none', background: 'none', padding: 0, fontSize: 12.5, color: C.error, cursor: 'pointer', fontFamily: FONT }}>Limpiar</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {atajosFecha(HOY, futuro).map(a => {
              const on = local.d === a.desde && local.h === a.hasta;
              return <button key={a.label} type="button" aria-pressed={on} onClick={() => setLocal({ d: a.desde, h: a.hasta })}
                style={{ height: 32, border: `1px solid ${on ? C.brand : C.n500}`, borderRadius: radius.md, background: on ? C.brandBg : C.n000, color: on ? C.brand : C.n900, fontWeight: on ? 500 : 400, fontSize: 12.5, fontFamily: FONT, cursor: 'pointer' }}>{a.label}</button>;
            })}
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: C.n700 }}>Rango personalizado</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '8px 12px', alignItems: 'center', marginTop: -4 }}>
            {campo('d', 'Desde')}{campo('h', 'Hasta')}
          </div>
          {local.d && local.h && !invalido && local.d !== local.h && (
            <span style={{ padding: '6px 10px', background: C.brandBg, borderRadius: radius.sm, fontSize: 11.5, color: C.brand }}>{fmt(local.d)} – {fmt(local.h)} · {dias(local.d, local.h)} días</span>
          )}
          {invalido && <span role="alert" style={{ fontSize: 11.5, color: C.error }}>«Hasta» no puede ser anterior a «Desde».</span>}
          <span style={{ fontSize: 11.5, color: C.n700 }}>Hoy · {hoyTxt}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setOpen(false)}
              style={{ flex: 1, height: 34, border: `1px solid ${C.n500}`, borderRadius: radius.md, background: C.n000, color: C.n900, fontSize: 12.5, fontFamily: FONT, cursor: 'pointer' }}>Cancelar</button>
            <button type="button" disabled={invalido} onClick={() => { onChange(local.d, local.h); setOpen(false); }}
              style={{ flex: 1, height: 34, border: 'none', borderRadius: radius.md, background: C.brand, color: '#fff', fontSize: 12.5, fontWeight: 500, fontFamily: FONT, cursor: invalido ? 'not-allowed' : 'pointer', opacity: invalido ? 0.5 : 1 }}>Aplicar</button>
          </div>
        </div>
      )}
    </span>
  );
}
