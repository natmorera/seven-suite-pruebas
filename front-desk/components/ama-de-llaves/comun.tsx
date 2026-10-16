'use client';
// Piezas compartidas de Ama de llaves: disponibilidad (Libre / Ocupada / F/O),
// botones de limpieza excluyentes, celda de texto con guardado automático y
// estilos de tabla. Todo lee y escribe el store del hotel, así que un cambio
// aquí se ve al instante en el Mapa, el Planificador y la vista de camarera.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, radius, Z } from '@/components/suite/tokens';
import { useHotel } from '@/components/hotel/store';
import { segundosLimpieza, type Adjunto, type Cronometro, type EstadoLimpieza, type Habitacion, type Reserva } from '@/components/hotel/datos';

export type Disponibilidad = 'Libre' | 'Ocupada' | 'F/O';
export const DISPONIBILIDADES: Disponibilidad[] = ['Libre', 'Ocupada', 'F/O'];
/** Colores del diseño: Ocupada #E61A1A, Libre #33993A, F/O #808080. */
export const COLOR_DISP: Record<Disponibilidad, string> = { Ocupada: '#E61A1A', Libre: '#33993A', 'F/O': '#808080' };
export const disponibilidad = (h: Habitacion): Disponibilidad => (h.estado === 'bloqueada' ? 'F/O' : h.estado === 'ocupada' || h.estado === 'checkout' ? 'Ocupada' : 'Libre');

export const LIMPIEZA: { id: EstadoLimpieza; label: string; corto: string; color: string; bg: string }[] = [
  { id: 'sucia', label: 'Sucia', corto: 'Sucias', color: '#C62828', bg: '#FDECEA' },
  { id: 'limpia', label: 'Limpia', corto: 'Limpias', color: '#2E7D32', bg: '#E8F5E9' },
  { id: 'noRequiere', label: 'No requiere', corto: 'Sin limpieza', color: '#B45309', bg: '#FFF4E5' },
];
export const infoLimpieza = (e: EstadoLimpieza) => LIMPIEZA.find(x => x.id === e)!;

/** Personas alojadas (0 si está libre). */
export const paxDe = (h: Habitacion, reservas: Reserva[]) => {
  const r = h.reservaId ? reservas.find(x => x.id === h.reservaId) : undefined;
  return r ? r.adultos + r.ninos : 0;
};

export function BadgeDisp({ d }: { d: Disponibilidad }) {
  const c = COLOR_DISP[d];
  return <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 10px', borderRadius: radius.pill, background: c, color: '#fff', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>{d}</span>;
}

/** Tres botones excluyentes: Sucia (rojo), Limpia (verde), No requiere (naranja). Guardan al hacer clic. */
export function BotonesLimpieza({ valor, onChange, hab, compacto }: { valor: EstadoLimpieza; onChange: (e: EstadoLimpieza) => void; hab: string; compacto?: boolean }) {
  return (
    <span role="radiogroup" aria-label={`Estado de limpieza ${hab}`} style={{ display: 'inline-flex', gap: 6 }}>
      {LIMPIEZA.map(o => {
        const on = valor === o.id;
        return (
          <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => !on && onChange(o.id)}
            style={{ height: compacto ? 26 : 28, padding: '0 12px', borderRadius: radius.control, border: `1px solid ${on ? o.color : C.n500}`, background: on ? o.color : C.n000,
              color: on ? '#fff' : C.n700, fontSize: 12, fontFamily: FONT, cursor: on ? 'default' : 'pointer', whiteSpace: 'nowrap', transition: 'background .12s, color .12s' }}>
            {o.label}
          </button>
        );
      })}
    </span>
  );
}

/** Texto editable en la tabla: guarda al salir del campo o con Enter; Escape descarta. */
export function TextoEnLinea({ valor, onGuardar, placeholder, label, ancho = '100%', autoFocus, error }: {
  valor: string; onGuardar: (v: string) => void; placeholder?: string; label: string; ancho?: number | string; autoFocus?: boolean; error?: boolean;
}) {
  const [v, setV] = useState(valor);
  const [prev, setPrev] = useState(valor);
  if (prev !== valor) { setPrev(valor); setV(valor); }
  const [foco, setFoco] = useState(false);
  return (
    <input value={v} onChange={e => setV(e.target.value)} placeholder={placeholder} aria-label={label} autoFocus={autoFocus}
      onFocus={() => setFoco(true)}
      onBlur={() => { setFoco(false); if (v.trim() !== valor) onGuardar(v.trim()); }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setV(valor); setTimeout(() => (e.target as HTMLInputElement).blur()); } }}
      className="suite-campo"
      style={{ width: ancho, height: 30, boxSizing: 'border-box', padding: '0 8px', fontSize: 12, fontFamily: FONT, color: C.n900, borderRadius: radius.control, outline: 'none',
        border: `1px solid ${error ? C.error : foco ? C.brand : 'transparent'}`, background: foco ? C.n000 : 'transparent' }}
      onMouseEnter={e => { if (!foco && !error) e.currentTarget.style.borderColor = C.n500; }}
      onMouseLeave={e => { if (!foco && !error) e.currentTarget.style.borderColor = 'transparent'; }} />
  );
}

export const th: CSSProperties = { padding: '9px 10px', textAlign: 'left', fontSize: 12, fontWeight: 400, color: C.n700, whiteSpace: 'nowrap', background: C.n000, position: 'sticky', top: 0, zIndex: 1 };
export const td: CSSProperties = { padding: '6px 10px', fontSize: 12, borderTop: `1px solid ${C.n500}`, color: C.n900, whiteSpace: 'nowrap', height: 46 };

export function Tarjeta({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <section style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, fontFamily: FONT, ...style }}>{children}</section>;
}

/** Contador clicable (resumen arriba de la tabla): filtra al hacer clic. */
export function Contador({ valor, label, color, activo, onClick }: { valor: number; label: string; color: string; activo?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}
      style={{ flex: '1 1 140px', minWidth: 130, textAlign: 'left', padding: '10px 14px', borderRadius: radius.card, border: `1px solid ${activo ? color : C.n500}`, background: activo ? `${color}12` : C.n000,
        cursor: onClick ? 'pointer' : 'default', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.n700 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />{label}</span>
      <span style={{ fontSize: 20, fontWeight: 600, color: C.n900 }}>{valor}</span>
    </button>
  );
}

export const IcCandado = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
export const IcMovil = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M11 18h2" /></svg>
);

// ── Cronómetro y adjuntos ───────────────────────────────────────────────────
/** Reloj que avanza cada segundo mientras `activo` (para el cronómetro de limpieza). */
export function useReloj(activo: boolean) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!activo) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [activo]);
  return ahora;
}

/** Estado del cronómetro en una línea (tabla de escritorio). */
export function EstadoCrono({ c }: { c?: Cronometro }) {
  const ahora = useReloj(c?.estado === 'enCurso');
  if (!c) return <span style={{ color: C.n700 }}>—</span>;
  const s = segundosLimpieza(c, ahora);
  const color = c.estado === 'enCurso' ? '#2E7D32' : c.estado === 'pausada' ? '#B45309' : C.n700;
  const txt = c.estado === 'enCurso' ? 'En curso' : c.estado === 'pausada' ? 'Pausada' : 'Terminada';
  return <span title={`${c.camarera} · inicio ${c.inicio.slice(11, 16)}${c.pausas ? ` · ${c.pausas} pausa(s)` : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color, fontVariantNumeric: 'tabular-nums' }}>
    {c.estado === 'enCurso' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, animation: 'pulso 1.2s infinite' }} />}{txt} · {Math.round(s / 60)} min
  </span>;
}

/** Fotos y archivos de una discrepancia: miniaturas, agregar (cámara en el teléfono) y quitar. */
export function Adjuntos({ hab, compacto }: { hab: Habitacion; compacto?: boolean }) {
  const h = useHotel();
  const ref = useRef<HTMLInputElement>(null);
  const [ver, setVer] = useState<Adjunto | null>(null);
  const lista = hab.adjuntos ?? [];
  const agregar = (fs: FileList | null) => {
    if (!fs?.length) return;
    const nuevos = Array.from(fs).map((f, i) => ({ id: `adj${Date.now().toString(36)}${i}`, nombre: f.name, tipo: f.type, url: URL.createObjectURL(f), fecha: new Date().toISOString() }));
    h.agregarAdjuntos(hab.numero, nuevos);
  };
  const tam = compacto ? 44 : 64;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {lista.map(a => (
        <span key={a.id} style={{ position: 'relative' }}>
          <button type="button" onClick={() => setVer(a)} title={a.nombre} aria-label={`Ver adjunto ${a.nombre}`}
            style={{ width: tam, height: tam, borderRadius: radius.md, border: `1px solid ${C.n500}`, padding: 0, overflow: 'hidden', cursor: 'pointer', background: C.n200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.n700 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- archivo local del usuario (blob:) */}
            {a.tipo.startsWith('image/') ? <img src={a.url} alt={a.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : a.nombre.split('.').pop()?.toUpperCase()}
          </button>
          <button type="button" aria-label={`Quitar ${a.nombre}`} onClick={() => h.quitarAdjunto(hab.numero, a.id)}
            style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', border: 'none', background: C.n900, color: '#fff', fontSize: 11, lineHeight: '18px', cursor: 'pointer', padding: 0 }}>×</button>
        </span>
      ))}
      <button type="button" onClick={() => ref.current?.click()} aria-label={`Adjuntar foto o archivo a la ${hab.numero}`}
        style={{ height: tam, minWidth: tam, padding: '0 10px', borderRadius: radius.md, border: `1px dashed ${C.n500}`, background: C.n000, color: C.brand, fontSize: 12, fontFamily: FONT, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
        {lista.length ? 'Agregar' : 'Adjuntar foto'}
      </button>
      <input ref={ref} type="file" accept="image/*,application/pdf" capture="environment" multiple hidden aria-label="Archivo adjunto" onChange={e => { agregar(e.target.files); e.target.value = ''; }} />
      {ver && createPortal(
        <div onClick={() => setVer(null)} style={{ position: 'fixed', inset: 0, zIndex: Z.modal + 10, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <figure onClick={e => e.stopPropagation()} style={{ margin: 0, background: C.n000, borderRadius: radius.card, padding: 12, maxWidth: 'min(720px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- archivo local del usuario (blob:) */}
            {ver.tipo.startsWith('image/') ? <img src={ver.url} alt={ver.nombre} style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }} /> : <a href={ver.url} target="_blank" rel="noreferrer" style={{ color: C.brand }}>Abrir {ver.nombre}</a>}
            <figcaption style={{ fontSize: 12, color: C.n700, display: 'flex', justifyContent: 'space-between' }}>{ver.nombre}<button type="button" onClick={() => setVer(null)} style={{ border: 'none', background: 'none', color: C.brand, cursor: 'pointer', fontFamily: FONT }}>Cerrar</button></figcaption>
          </figure>
        </div>, document.body)}
    </div>
  );
}
