'use client';
// Piezas compartidas por las pantallas de Facturación: KPIs, visor de
// documentos (imprimir / exportar), plantilla «System Report», búsqueda de
// perfiles, firma en pantalla, filtros de selección única y barra inferior.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { C, FONT, radius, SIZE } from '@/components/suite/tokens';
import { Button, Modal, StatusBadge } from '@/components/suite/ui';
import { Pantalla, type SeleccionPantalla, type TabsPantalla } from '@/components/layout/Pantalla';
import { IcChevronDown, IcSearch } from '@/components/suite/icons';
import { IcPrint, ModalBase, Popover, norm } from '@/components/configuracion/kit';
import { BotonExportar, usePrint } from '@/components/hotel/ui';
import { useEmpresa } from '@/components/layout/Shell';
import { useHotel } from '@/components/hotel/store';
import { HOY, fmtF, type Perfil, type Reserva } from '@/components/hotel/datos';
import { horaReal } from '@/components/hotel/finanzas';

/** Hora hotelera en vivo (fecha hotelera + reloj del equipo). `null` hasta montar, para no romper la hidratación. */
export function useAhora() {
  const [hora, setHora] = useState<string | null>(null);
  useEffect(() => { const t = () => setHora(horaReal()); t(); const i = setInterval(t, 30000); return () => clearInterval(i); }, []);
  return hora ? `${HOY}T${hora}` : null;
}

// ── Página estándar ─────────────────────────────────────────────────────────
export function PaginaFact<T extends string>(p: { titulo: string; izquierda?: ReactNode; acciones?: ReactNode; children: ReactNode; pie?: ReactNode; sinPadding?: boolean;
  tabs?: TabsPantalla<T>; filtros?: ReactNode; filtrosDerecha?: ReactNode; seleccion?: SeleccionPantalla; conRanuras?: boolean }) {
  return <Pantalla {...p} />;
}
export function Tarjeta({ children, style, titulo, acciones }: { children: ReactNode; style?: CSSProperties; titulo?: ReactNode; acciones?: ReactNode }) {
  return (
    <section style={{ background: C.n000, borderRadius: radius.card, border: `1px solid ${C.n500}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, fontFamily: FONT, ...style }}>
      {(titulo || acciones) && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {titulo && <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.n900 }}>{titulo}</h2>}{acciones && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{acciones}</div>}
      </div>}
      {children}
    </section>
  );
}

/** Indicador del encabezado (Estado, Abierta hace, Saldo inicial…). */
export function Kpi({ label, children, color, sub }: { label: string; children: ReactNode; color?: string; sub?: ReactNode }) {
  return (
    <div className="kpi" style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, padding: '0 16px' }}>
      <span style={{ fontSize: 12, color: C.n700 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: color ?? C.n900, whiteSpace: 'nowrap' }}>{children}</span>
      {sub && <span style={{ fontSize: 11, color: C.n700 }}>{sub}</span>}
    </div>
  );
}
/** KPI con contador + etiqueta de color (Folios activos 6 «Externos abiertos»). */
export function KpiChip({ label, n, chip, tono = 'brand' }: { label: string; n: ReactNode; chip: string; tono?: 'brand' | 'red' | 'gray' | 'green' }) {
  const col = tono === 'red' ? { c: C.error, bg: 'rgba(244,67,54,.08)' } : tono === 'gray' ? { c: C.n700, bg: C.n200 } : tono === 'green' ? { c: '#2E7D32', bg: 'rgba(76,175,80,.1)' } : { c: C.brand, bg: C.brandBg };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 12, color: C.n700 }}>{label || ' '}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>{n}<span style={{ fontSize: 12, fontWeight: 400, color: col.c, background: col.bg, padding: '2px 8px', borderRadius: radius.pill, whiteSpace: 'nowrap' }}>{chip}</span></span>
    </div>
  );
}
/** Recuadro gris con valor (Efectivo USD, Saldo inicial…). */
export function Bloque({ label, valor, sub, color, fondo, borde }: { label: string; valor: ReactNode; sub?: ReactNode; color?: string; fondo?: string; borde?: string }) {
  return (
    <div style={{ background: fondo ?? C.n200, borderRadius: radius.md, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, border: borde ? `1px solid ${borde}` : undefined }}>
      <span style={{ fontSize: 12, color: color && fondo ? color : C.n700 }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 600, color: color ?? C.n900 }}>{valor}</span>
      {sub && <span style={{ fontSize: 11, color: C.n700 }}>{sub}</span>}
    </div>
  );
}

/** Aviso en la barra de acciones (pie de la página o del modal): queda a la izquierda de los botones,
 *  siempre a la vista, para que una validación no se pierda al final de un formulario largo. */
export function AvisoPie({ children, tono = 'error' }: { children: ReactNode; tono?: 'error' | 'warn' | 'info' }) {
  const color = tono === 'error' ? C.error : tono === 'warn' ? '#B58900' : C.n700;
  return (
    <span role={tono === 'error' ? 'alert' : 'status'} style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color, lineHeight: 1.4, minWidth: 0, fontFamily: FONT }}>
      {tono !== 'info' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden style={{ flexShrink: 0 }}><path d="M12 3 2 21h20L12 3zM12 10v5M12 18h.01" /></svg>}
      <span>{children}</span>
    </span>
  );
}

/** Banda de aviso (info azul, éxito verde, advertencia amarilla, error roja). */
export function Banda({ tono, children, style }: { tono: 'info' | 'ok' | 'warn' | 'error'; children: ReactNode; style?: CSSProperties }) {
  const t = { info: ['var(--brand)', 'var(--brand-bg)'], ok: ['#2E7D32', 'rgba(76,175,80,.08)'], warn: ['#B58900', 'rgba(238,179,0,.08)'], error: [C.error, 'rgba(244,67,54,.07)'] }[tono];
  return (
    <div role={tono === 'error' ? 'alert' : 'status'} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: radius.md, background: t[1], color: t[0], fontSize: 12, lineHeight: 1.5, fontFamily: FONT, ...style }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden style={{ flexShrink: 0, marginTop: 1 }}>
        {tono === 'error' ? <path d="M12 3 2 21h20L12 3zM12 10v5M12 18h.01" /> : <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>}
      </svg>
      <span>{children}</span>
    </div>
  );
}

/** Chip de tipo de movimiento (Cargo · Corrección · Traslado · Ingreso · Egreso). */
export function ChipTipo({ tipo }: { tipo: string }) {
  const color = tipo === 'Corrección' || tipo === 'Egreso' ? 'red' : tipo === 'Traslado' ? 'yellow' : tipo === 'Ingreso' ? 'green' : 'brand';
  return <StatusBadge label={tipo} color={color} />;
}

// ── Filtros ──────────────────────────────────────────────────────────────────
const botonFiltro = (activo: boolean): CSSProperties => ({
  height: SIZE.control, padding: '0 12px', border: `1px solid ${activo ? C.brand : C.n500}`, borderRadius: radius.control, background: activo ? C.brandBg : C.n000,
  display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: FONT, color: activo ? C.brand : C.n900, cursor: 'pointer', whiteSpace: 'nowrap',
});
/** Desplegable de selección única con aspecto de filtro («Moneda de origen ▾», «Tipo: Ingreso ▾»). */
export function FiltroUno({ label, value, onChange, opciones, todos = 'Todos', ancho = 220, prefijo }: {
  label: string; value: string; onChange: (v: string) => void; opciones: { value: string; label: string }[]; todos?: string | null; ancho?: number; prefijo?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const sel = opciones.find(o => o.value === value);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={label} className="suite-campo" style={botonFiltro(!!sel && todos !== null)}>
        <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }} title={sel?.label}>{sel ? (prefijo === false ? sel.label : `${label}: ${sel.label}`) : label}</span><IcChevronDown size={12} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} width={ancho}>
        <div role="listbox" style={{ padding: 6, display: 'flex', flexDirection: 'column', maxHeight: 300, overflowY: 'auto' }}>
          {todos !== null && <OpcionFiltro on={!value} onClick={() => { onChange(''); setOpen(false); }}>{todos}</OpcionFiltro>}
          {opciones.map(o => <OpcionFiltro key={o.value} on={o.value === value} onClick={() => { onChange(o.value); setOpen(false); }}>{o.label}</OpcionFiltro>)}
        </div>
      </Popover>
    </span>
  );
}
function OpcionFiltro({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" role="option" aria-selected={on} onClick={onClick} className="suite-fila"
    style={{ textAlign: 'left', padding: '8px 10px', border: 'none', background: on ? C.brandBg : 'none', color: on ? C.brand : C.n900, fontWeight: on ? 600 : 400, fontSize: 12, fontFamily: FONT, borderRadius: radius.control, cursor: 'pointer' }}>{children}</button>;
}

// ── Menú Exportar ────────────────────────────────────────────────────────────
export function Exportar(p: Parameters<typeof BotonExportar>[0]) {
  return <BotonExportar {...p} />;
}

// ── Visor de impresión (Imprimir · Exportar · ✕) ────────────────────────────
export function Visor({ titulo, sub, onClose, children, onCSV, ancho = 900, extra }: { titulo: ReactNode; sub?: ReactNode; onClose: () => void; children: ReactNode; onCSV?: () => void; ancho?: number; extra?: ReactNode }) {
  const { imprimir, portal } = usePrint();
  return (
    <ModalBase titulo={<>{titulo}{sub && <span style={{ color: C.brand, marginLeft: 8 }}>{sub}</span>}</>} onClose={onClose} ancho={ancho} capa={10} cuerpoStyle={{ padding: 24, background: C.n200 }}
      pie={<>{extra}<Button variant="secondary" onClick={() => imprimir(children)}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>Imprimir <IcPrint size={15} /></span></Button>
        <Exportar onPDF={() => imprimir(children)} onCSV={onCSV} /><Button variant="secondary" onClick={onClose}>Cerrar</Button></>}>
      <div style={{ background: C.n000, maxWidth: ancho - 80, margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,.08)', borderRadius: 4 }}>{children}</div>
      {portal}
    </ModalBase>
  );
}

// ── Plantilla «System Report» (Grand Horizon | FRONT DESK System Report) ────
export function HojaSistema({ titulo, subtitulo, criterio, children, fecha = HOY, pie }: { titulo: string; subtitulo?: string; criterio?: string; children: ReactNode; fecha?: string; pie?: ReactNode }) {
  const empresa = useEmpresa();
  return (
    <div style={{ fontFamily: FONT, color: C.n900, padding: '28px 32px', fontSize: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: `1px solid ${C.n500}` }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 17 }}>
          <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden><path d="M0 0h10L6 18H0z" fill="#213C89" /><path d="M14 0h8l-4 18h-8z" fill="#213C89" /></svg>{empresa}
        </span>
        <span style={{ fontSize: 11, color: C.n700 }}><b style={{ fontWeight: 600 }}>FRONT DESK</b> | System Report</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, margin: '22px 0 16px' }}>
        <div><h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{titulo}</h1>{subtitulo && <p style={{ margin: '4px 0 0', fontSize: 13, color: C.n700 }}>{subtitulo}</p>}</div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}><div style={{ fontSize: 10, color: C.n700, letterSpacing: '.04em' }}>FECHA DE EMISIÓN</div><div style={{ fontSize: 15, color: C.brand, fontWeight: 600, marginTop: 4 }}>{fmtF(fecha)}</div></div>
      </div>
      {criterio && <div style={{ border: `1px solid ${C.n500}`, background: C.n200, borderRadius: radius.md, padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: 9.5, color: C.n700, letterSpacing: '.04em' }}>CRITERIO DE SELECCIÓN</div><div style={{ fontSize: 12, marginTop: 3 }}>{criterio}</div>
      </div>}
      {children}
      {pie}
      <div style={{ marginTop: 28, paddingTop: 10, borderTop: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.n700 }}>
        <span>Generado por Front Desk — {empresa}</span><b style={{ color: C.n900, fontWeight: 600 }}>Página 1 de 1</b>
      </div>
    </div>
  );
}
/** Tabla del reporte (encabezado gris). */
export function TablaReporte({ headers, derecha = [], children, minWidth }: { headers: ReactNode[]; derecha?: number[]; children: ReactNode; minWidth?: number }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tabla-reporte" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5, minWidth }}>
        <thead><tr style={{ background: '#F5F5F5' }}>{headers.map((h, i) => <th key={i} style={{ padding: '9px 8px', textAlign: derecha.includes(i) ? 'right' : 'left', fontWeight: 400, color: C.n700, whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export const tdR = (der?: boolean, extra?: CSSProperties): CSSProperties => ({ padding: '8px', borderBottom: `1px solid ${C.n500}`, textAlign: der ? 'right' : 'left', fontVariantNumeric: der ? 'tabular-nums' : undefined, ...extra });
// ── Búsqueda de perfil (canje, depósitos, nuevo folio) ──────────────────────
export interface PerfilElegido { perfil: Perfil | null; reserva: Reserva | null; nombre: string }
export function BuscarPerfil({ onClose, onElegir, titulo = 'Buscar perfil', soloInHouse }: { onClose: () => void; onElegir: (p: PerfilElegido) => void; titulo?: string; soloInHouse?: boolean }) {
  const h = useHotel();
  const [q, setQ] = useState('');
  const inHouse = useMemo(() => h.reservas.filter(r => r.estado === 'In-House'), [h.reservas]);
  const filas = useMemo(() => {
    const t = norm(q);
    const perfiles = soloInHouse ? [] : h.perfiles.filter(p => !t || norm(`${p.nombre} ${p.numeroId} ${p.email}`).includes(t)).slice(0, 40);
    const res = inHouse.filter(r => !t || norm(`${r.nombre} ${r.habitacion} ${r.numero} ${h.perfiles.find(p => p.id === r.perfilId)?.nombre ?? ''}`).includes(t)).slice(0, 40);
    return { perfiles, res };
  }, [q, h.perfiles, inHouse, soloInHouse]);
  const th: CSSProperties = { padding: '8px', textAlign: 'left', fontWeight: 400, color: C.n700, fontSize: 12 };
  const td: CSSProperties = { padding: '8px', borderTop: `1px solid ${C.n500}`, fontSize: 12 };
  return (
    <Modal open title={titulo} onClose={onClose} width={720} footer={<Button variant="secondary" onClick={onClose}>Cancelar</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.n700, display: 'flex' }}><IcSearch size={14} /></span>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Nombre, identificación, habitación o N° de reserva" aria-label="Buscar perfil" className="suite-campo"
            style={{ width: '100%', height: SIZE.control, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 10px 0 32px', fontSize: 12, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600 }}>Huéspedes en casa</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Habitación</th><th style={th}>Huésped</th><th style={th}>Reserva</th><th style={th}>Identificación</th><th /></tr></thead>
            <tbody>
              {filas.res.length === 0 && <tr><td colSpan={5} style={{ ...td, color: C.n700, textAlign: 'center' }}>Sin coincidencias</td></tr>}
              {filas.res.map(r => {
                const p = h.perfiles.find(x => x.id === r.perfilId) ?? null;
                return <tr key={r.id} className="suite-fila"><td style={td}>{r.habitacion}</td><td style={td}>{p?.nombre ?? r.nombre}</td><td style={td}>{r.numero}</td><td style={td}>{r.identificacion || '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}><Button variant="secondary" onClick={() => onElegir({ perfil: p, reserva: r, nombre: p?.nombre ?? r.nombre })}>Seleccionar</Button></td></tr>;
              })}
            </tbody>
          </table>
        </div>
        {!soloInHouse && <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600 }}>Perfiles</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Nombre</th><th style={th}>Tipo</th><th style={th}>Identificación</th><th style={th}>Correo</th><th /></tr></thead>
            <tbody>
              {filas.perfiles.length === 0 && <tr><td colSpan={5} style={{ ...td, color: C.n700, textAlign: 'center' }}>Sin coincidencias</td></tr>}
              {filas.perfiles.map(p => (
                <tr key={p.id} className="suite-fila"><td style={td}>{p.nombre}</td><td style={td}>{p.tipo === 'empresa' ? 'Empresa' : 'Cliente'}</td><td style={td}>{p.numeroId || '—'}</td><td style={td}>{p.email || '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}><Button variant="secondary" onClick={() => onElegir({ perfil: p, reserva: h.reservas.find(r => r.perfilId === p.id && r.estado === 'In-House') ?? null, nombre: p.nombre })}>Seleccionar</Button></td></tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>
    </Modal>
  );
}

// ── Firma en pantalla ────────────────────────────────────────────────────────
export function Firma({ onChange, alto = 150, placeholder }: { onChange: (dataUrl: string) => void; alto?: number; placeholder?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const [vacia, setVacia] = useState(true);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const w = c.clientWidth; if (w && c.width !== w) { c.width = w; c.height = alto; }
  }, [alto]);
  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const limpiar = () => { const c = ref.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setVacia(true); onChange(''); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ position: 'relative' }}>
        <canvas ref={ref} height={alto} aria-label="Área de firma" style={{ width: '100%', height: alto, border: `1.5px dashed ${C.n500}`, borderRadius: radius.md, touchAction: 'none', background: C.n200, cursor: 'crosshair', display: 'block' }}
          onPointerDown={e => { dibujando.current = true; const cv = ref.current!; if (vacia && cv.clientWidth && cv.width !== cv.clientWidth) { cv.width = cv.clientWidth; cv.height = alto; } const c = cv.getContext('2d')!; const [x, y] = pos(e); c.beginPath(); c.moveTo(x, y); c.lineWidth = 2.2; c.lineCap = 'round'; c.strokeStyle = C.n900; }}
          onPointerMove={e => { if (!dibujando.current) return; const c = ref.current!.getContext('2d')!; const [x, y] = pos(e); c.lineTo(x, y); c.stroke(); if (vacia) setVacia(false); }}
          onPointerUp={() => { if (dibujando.current) { dibujando.current = false; onChange(ref.current!.toDataURL()); } }}
          onPointerLeave={() => { if (dibujando.current) { dibujando.current = false; onChange(ref.current!.toDataURL()); } }} />
        {vacia && placeholder && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.n700, fontSize: 12, pointerEvents: 'none' }}>{placeholder}</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button variant="secondary" onClick={limpiar}>Limpiar</Button></div>
    </div>
  );
}

/** Ícono de documento con flecha (ver/descargar recibo). */
export const IcDoc = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" /><path d="M14 3v5h5M12 11v6M9.5 14.5 12 17l2.5-2.5" />
  </svg>
);
export function BotonIcono({ label, onClick, children, tono = 'marca' }: { label: string; onClick: () => void; children: ReactNode; tono?: 'marca' | 'peligro' }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: tono === 'marca' ? `1px solid ${C.brandBd}` : 'none', background: tono === 'marca' ? C.n000 : 'none',
        borderRadius: radius.sm, color: tono === 'marca' ? C.brand : C.error, cursor: 'pointer', flexShrink: 0 }}>{children}</button>
  );
}
export const IcRefresh = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden><path d="M20 12a8 8 0 0 1-14.3 4.9M4 12A8 8 0 0 1 18.3 7.1M18 3v4h-4M6 21v-4h4" /></svg>;
export const IcCandado = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
export const IcXCirculo = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></svg>;
