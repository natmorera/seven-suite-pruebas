'use client';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, fmtNum, radius, SIZE } from '@/components/suite/tokens';
import { Button, Checkbox } from '@/components/suite/ui';
import { IcChevronDown } from '@/components/suite/icons';
import { Confirmacion, Popover, descargarCSV, descargarXLS, norm } from '@/components/configuracion/kit';
import { HOY, fmtF } from './datos';
import { celdaMonto } from '@/components/suite/Monto';
import { FiltroFecha } from '@/components/suite/FiltroFecha';
import { useEmpresa } from '@/components/layout/Shell';

/** Monto con signo de moneda y siempre 2 decimales («$ 1,234.00», «₡ 1,234.00»). */
export const money = (n: number, m: 'USD' | 'CRC' = 'USD') => `${n < 0 ? '-' : ''}${m === 'CRC' ? '₡' : '$'} ${fmtNum(Math.abs(n))}`;

// ── Tarjeta blanca del contenido ────────────────────────────────────────────
export function Panel({ children, style, titulo, acciones, sub }: { children: ReactNode; style?: CSSProperties; titulo?: ReactNode; acciones?: ReactNode; sub?: ReactNode }) {
  return (
    <section style={{ background: C.n000, borderRadius: radius.card, border: `1px solid ${C.n500}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, fontFamily: FONT, ...style }}>
      {(titulo || acciones) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            {titulo && <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.n900 }}>{titulo}</h2>}
            {sub && <span style={{ fontSize: 12, color: C.n700 }}>{sub}</span>}
          </div>
          {acciones && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{acciones}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// ── Botón desplegable con lista de opciones ─────────────────────────────────
export interface OpcionMenu { label: ReactNode; onClick: () => void; disabled?: boolean; peligro?: boolean }
export function MenuBoton({ label, opciones, variant = 'secondary', icon, ancho = 220, align = 'right' }: {
  label: ReactNode; opciones: OpcionMenu[]; variant?: 'primary' | 'secondary'; icon?: ReactNode; ancho?: number; align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <Button variant={variant} icon={icon} onClick={() => setOpen(o => !o)}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{label}<IcChevronDown size={12} /></span>
      </Button>
      <Popover open={open} onClose={() => setOpen(false)} width={ancho} align={align}>
        <div role="menu" style={{ padding: 6, display: 'flex', flexDirection: 'column' }}>
          {opciones.map((o, i) => (
            <button key={i} role="menuitem" type="button" disabled={o.disabled} onClick={() => { setOpen(false); o.onClick(); }} className="suite-fila"
              style={{ textAlign: 'left', padding: '9px 10px', border: 'none', background: 'none', fontSize: 12, fontFamily: FONT, borderRadius: radius.control,
                cursor: o.disabled ? 'not-allowed' : 'pointer', color: o.disabled ? C.n500 : o.peligro ? C.error : C.n900 }}>
              {o.label}
            </button>
          ))}
        </div>
      </Popover>
    </span>
  );
}

// ── Filtro desplegable con checkboxes (Estado, Tipo de habitación…) ─────────
export function FiltroChecks({ label, opciones, value, onChange, buscar, ancho = 230 }: {
  label: string; opciones: { value: string; label: ReactNode }[]; value: string[]; onChange: (v: string[]) => void; buscar?: boolean; ancho?: number;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const visibles = opciones.filter(o => !q || norm(typeof o.label === 'string' ? o.label : o.value).includes(norm(q)));
  const activo = value.length > 0;
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="suite-campo"
        style={{ height: SIZE.control, padding: '0 12px', border: `1px solid ${open || activo ? C.brand : C.n500}`, borderRadius: radius.control, background: activo ? C.brandBg : C.n000,
          display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: FONT, color: activo ? C.brand : C.n900, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {label}{activo && <b style={{ fontWeight: 600 }}>({value.length})</b>}<IcChevronDown size={12} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} width={ancho}>
        {buscar && (
          <div style={{ padding: 10, borderBottom: `1px solid ${C.n500}` }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar" aria-label={`Buscar ${label}`} className="suite-campo" autoFocus
              style={{ width: '100%', height: 30, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 10px', fontSize: 12, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        )}
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
          {visibles.map(o => (
            <Checkbox key={o.value} checked={value.includes(o.value)} onChange={b => onChange(b ? [...value, o.value] : value.filter(x => x !== o.value))} label={o.label} />
          ))}
          {visibles.length === 0 && <span style={{ fontSize: 12, color: C.n700 }}>Sin resultados</span>}
        </div>
        {activo && (
          <div style={{ borderTop: `1px solid ${C.n500}`, padding: 8 }}>
            <button type="button" onClick={() => onChange([])} style={{ border: 'none', background: 'none', color: C.brand, fontSize: 12, cursor: 'pointer', fontFamily: FONT }}>Quitar selección</button>
          </div>
        )}
      </Popover>
    </span>
  );
}

/** Botón con ícono de calendario que es un selector de fecha (Entrada, Salida, Fecha hotelera). */
export function FechaBoton({ label, value, onChange, min }: { label: string; value: string; onChange: (v: string) => void; min?: string }) {
  return (
    <label style={{ position: 'relative', height: SIZE.control, padding: '0 12px', border: `1px solid ${value ? C.brand : C.n500}`, borderRadius: radius.control, background: value ? C.brandBg : C.n000,
      display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: FONT, color: value ? C.brand : C.n900, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {label}{value ? `: ${fmtF(value)}` : ''}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
      <input type="date" value={value} min={min} onChange={e => onChange(e.target.value)} aria-label={label}
        onClick={e => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
    </label>
  );
}

/** Filtro de rango de fechas estándar de la suite (ver suite/FiltroFecha). */
export function RangoBoton({ label, desde, hasta, onChange, futuro }: { label: string; desde: string; hasta: string; onChange: (d: string, h: string) => void; futuro?: boolean }) {
  return <FiltroFecha label={label} desde={desde} hasta={hasta} onChange={onChange} futuro={futuro} />;
}

// ── Confirmación (misma forma que todos los modales) ────────────────────────
export function Alerta({ open, titulo, children, onClose, onConfirm, confirmar = 'Sí, confirmar', cancelar = 'Cancelar', tono = 'brand' }: {
  open: boolean; titulo: string; children?: ReactNode; onClose: () => void; onConfirm: () => void; confirmar?: string; cancelar?: string; tono?: 'brand' | 'danger'; icono?: string;
}) {
  return <Confirmacion open={open} titulo={titulo} onClose={onClose} onConfirm={onConfirm} confirmar={confirmar} cancelar={cancelar} peligro={tono === 'danger'}>{children}</Confirmacion>;
}

// ── Impresión: renderiza el reporte en un portal y abre el diálogo del navegador
export function usePrint() {
  const [contenido, setContenido] = useState<ReactNode>(null);
  useEffect(() => {
    if (!contenido) return;
    document.body.classList.add('imprimiendo');
    const fin = () => { document.body.classList.remove('imprimiendo'); setContenido(null); };
    window.addEventListener('afterprint', fin, { once: true });
    const t = setTimeout(() => window.print(), 60);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', fin); document.body.classList.remove('imprimiendo'); };
  }, [contenido]);
  const portal = contenido && typeof document !== 'undefined' ? createPortal(<div id="area-impresion">{contenido}</div>, document.body) : null;
  return { imprimir: (c: ReactNode) => setContenido(c), portal };
}

/** Plantilla del reporte impreso (encabezado con filtros + pie con hotel y fecha). */
export function HojaReporte({ titulo, filtros, children, resumen }: { titulo: string; filtros?: string; children: ReactNode; resumen?: ReactNode }) {
  const ahora = new Date();
  const empresa = useEmpresa().toUpperCase();
  return (
    <div style={{ fontFamily: FONT, color: C.n900, padding: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{titulo}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: C.n700 }}>Fecha hotelera: {fmtF(HOY)}</p>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, background: C.n500, padding: '4px 8px', borderRadius: 4 }}>{empresa}</span>
      </div>
      {filtros && <div style={{ margin: '12px 0', padding: '8px 12px', background: C.n200, borderRadius: 6, fontSize: 10.5 }}><b>Filtros:</b> {filtros}</div>}
      <div style={{ marginTop: 12 }}>{children}</div>
      {resumen && <div style={{ marginTop: 14, padding: '10px 14px', background: C.n200, borderRadius: 6, fontSize: 11 }}>{resumen}</div>}
      <div style={{ marginTop: 18, paddingTop: 8, borderTop: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: C.n700 }}>
        <span>{empresa} — Generado: {fmtF(HOY)} {ahora.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>Seven Front Desk</span>
      </div>
    </div>
  );
}
export function TablaImpresa({ headers, filas, derecha = [] }: { headers: string[]; filas: ReactNode[][]; derecha?: number[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
      <thead><tr style={{ background: '#EFEFEF' }}>{headers.map((h, i) => <th key={i} style={{ padding: '6px 6px', textAlign: derecha.includes(i) ? 'right' : 'left', fontWeight: 500, color: C.n700 }}>{h}</th>)}</tr></thead>
      <tbody>{filas.map((f, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.n500}` }}>{f.map((c, j) => <td key={j} style={{ padding: '5px 6px', textAlign: derecha.includes(j) ? 'right' : 'left' }}>{celdaMonto(c)}</td>)}</tr>)}</tbody>
    </table>
  );
}

// ── Exportación ─────────────────────────────────────────────────────────────
// Todas las pantallas exportan lo que se está viendo (filtros aplicados) con el
// mismo botón: CSV, XLS (hoja de cálculo) o PDF (impresión del navegador).
let formatoHoja: 'CSV' | 'XLS' = 'CSV';
let encabezadoHoja: (string | number)[][] = [];
export const exportarCSV = (nombre: string, headers: string[], filas: (string | number)[][]) => {
  const todo = [...encabezadoHoja, headers, ...filas];
  // Nombre de archivo seguro (sin tildes ni espacios) para todos los navegadores.
  nombre = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '-').toLowerCase();
  if (formatoHoja === 'XLS') descargarXLS(`${nombre}-${HOY}.xls`, todo); else descargarCSV(`${nombre}-${HOY}.csv`, todo);
};
export function BotonExportar({ onCSV, onPDF, disabled, label = 'Exportar', titulo, criterio, variant = 'secondary', masOpciones }: {
  onCSV?: () => void; onPDF?: () => void; disabled?: boolean; label?: string; titulo?: string; criterio?: string; variant?: 'primary' | 'secondary';
  /** Exportación avanzada (abre un modal con más opciones). */
  masOpciones?: { label: string; onClick: () => void };
}) {
  const [open, setOpen] = useState(false);
  const formatos = [...(onCSV ? ['CSV', 'XLS'] : []), ...(onPDF ? ['PDF'] : [])] as ('CSV' | 'XLS' | 'PDF')[];
  const [fmt, setFmt] = useState<'CSV' | 'XLS' | 'PDF'>(formatos[0] ?? 'PDF');
  const [enc, setEnc] = useState(true);
  const [fil, setFil] = useState(true);
  const exportar = () => {
    setOpen(false);
    if (fmt === 'PDF') return onPDF?.();
    formatoHoja = fmt;
    encabezadoHoja = [...(enc && titulo ? [[titulo], [`Fecha de emisión: ${fmtF(HOY)}`]] : []), ...(fil && criterio ? [[criterio]] : []), ...((enc && titulo) || (fil && criterio) ? [[]] : [])];
    try { onCSV?.(); } finally { formatoHoja = 'CSV'; encabezadoHoja = []; }
  };
  const det: Record<string, string> = { CSV: 'Archivo separado por comas', XLS: 'Hoja de cálculo Excel', PDF: 'Documento PDF (imprimir / guardar)' };
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <Button variant={variant} disabled={disabled || !formatos.length} onClick={() => setOpen(o => !o)}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" /><path d="M12 11v6M9.5 14.5 12 17l2.5-2.5" /></svg>
          {label}<IcChevronDown size={12} /></span>
      </Button>
      <Popover open={open} onClose={() => setOpen(false)} width={260} align="right">
        <div role="menu" aria-label="Formato de exportación" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, fontFamily: FONT }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Formato de exportación</span>
          {formatos.map(v => (
            <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: radius.md, background: fmt === v ? C.brandBg : 'transparent', cursor: 'pointer' }}>
              <input type="radio" name="fmt-export" checked={fmt === v} onChange={() => setFmt(v)} />
              <span><span style={{ display: 'block', fontSize: 12.5, color: fmt === v ? C.brand : C.n900 }}>{v}</span><span style={{ display: 'block', fontSize: 11, color: C.n700 }}>{det[v]}</span></span>
            </label>
          ))}
          {fmt !== 'PDF' && (titulo || criterio) && <div style={{ borderTop: `1px solid ${C.n500}`, margin: '4px 0', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Opciones del documento</span>
            {titulo && <Checkbox checked={enc} onChange={setEnc} label="Mostrar encabezado" />}
            {criterio && <Checkbox checked={fil} onChange={setFil} label="Mostrar filtros aplicados" />}
          </div>}
          <Button onClick={exportar}>Exportar</Button>
          {masOpciones && <button type="button" onClick={() => { setOpen(false); masOpciones.onClick(); }} style={{ border: 'none', background: 'none', color: C.brand, fontSize: 12, cursor: 'pointer', fontFamily: FONT, padding: '4px 0 0', textDecoration: 'underline' }}>{masOpciones.label}</button>}
        </div>
      </Popover>
    </span>
  );
}

// ── Gráficos simples (SVG propio, sin dependencias) ─────────────────────────
/** Dona con tooltip: al pasar el cursor por un tramo muestra su nombre, cantidad y porcentaje. */
export function Dona({ partes, size = 130, grosor = 22, centro }: { partes: { valor: number; color: string; label: string }[]; size?: number; grosor?: number; centro?: ReactNode }) {
  const [sobre, setSobre] = useState<number | null>(null);
  const suma = partes.reduce((s, p) => s + p.valor, 0);
  const total = suma || 1;
  const r = (size - grosor) / 2, c = 2 * Math.PI * r;
  const largos = partes.map(p => (p.valor / total) * c);
  const offsets = largos.map((_, i) => largos.slice(0, i).reduce((a, b) => a + b, 0));
  const p = sobre !== null ? partes[sobre] : null;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }} onMouseLeave={() => setSobre(null)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={partes.map(x => `${x.label}: ${x.valor}`).join(', ')}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.n500} strokeWidth={grosor} />
        {partes.map((x, i) => {
          const largo = largos[i];
          if (!largo) return null;
          return <circle key={x.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={x.color} strokeWidth={sobre === i ? grosor + 4 : grosor}
            strokeDasharray={`${largo} ${c - largo}`} strokeDashoffset={-offsets[i]} transform={`rotate(-90 ${size / 2} ${size / 2})`}
            onMouseEnter={() => setSobre(i)} style={{ cursor: 'default', opacity: sobre === null || sobre === i ? 1 : 0.45, transition: 'opacity .12s, stroke-width .12s' }} />;
        })}
      </svg>
      {centro && <div style={{ position: 'absolute', inset: grosor, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: FONT, pointerEvents: 'none' }}>{centro}</div>}
      {p && (
        <div role="tooltip" style={{ position: 'absolute', left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)', background: C.n900, color: '#fff', borderRadius: 6, padding: '6px 10px',
          fontSize: 11.5, fontFamily: FONT, whiteSpace: 'nowrap', zIndex: 5, pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.18)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />{p.label}: <b style={{ fontWeight: 600 }}>{p.valor}</b>
            <span style={{ opacity: 0.7 }}>({Math.round((p.valor / total) * 100)} %)</span>
          </span>
        </div>
      )}
    </div>
  );
}

export function Barras({ datos, alto = 200, formato }: { datos: { label: string; valor: number; detalle?: string }[]; alto?: number; formato: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...datos.map(d => d.valor));
  const paso = Math.pow(10, Math.floor(Math.log10(max)));
  const tope = Math.ceil(max / paso) * paso;
  const marcas = [0, 0.25, 0.5, 0.75, 1].map(f => tope * f);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 8, fontFamily: FONT }}>
      <div style={{ position: 'relative', height: alto }}>
        {marcas.map(m => <span key={m} style={{ position: 'absolute', right: 0, bottom: `${(m / tope) * 100}%`, transform: 'translateY(50%)', fontSize: 10, color: C.n700 }}>{formato(m)}</span>)}
      </div>
      <div>
        <div style={{ position: 'relative', height: alto, display: 'flex', alignItems: 'flex-end', gap: 8, borderBottom: `1px solid ${C.n500}` }}>
          {marcas.map(m => <div key={m} style={{ position: 'absolute', left: 0, right: 0, bottom: `${(m / tope) * 100}%`, borderTop: `1px dashed ${C.n500}` }} />)}
          {datos.map((d, i) => (
            <div key={d.label + i} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative' }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {hover === i && (
                <div style={{ position: 'absolute', bottom: `calc(${(d.valor / tope) * 100}% + 8px)`, background: C.n900, color: '#fff', fontSize: 11, padding: '5px 8px', borderRadius: 6, whiteSpace: 'nowrap', zIndex: 2, textAlign: 'center' }}>
                  <div style={{ opacity: 0.7, fontSize: 10 }}>{d.detalle ?? d.label}</div><b>{formato(d.valor)}</b>
                </div>
              )}
              <div title={`${d.detalle ?? d.label}: ${formato(d.valor)}`} style={{ width: '70%', maxWidth: 46, height: `${(d.valor / tope) * 100}%`, background: hover === i ? '#5C77C4' : C.brand, borderRadius: '4px 4px 0 0', transition: 'background .12s', minHeight: d.valor ? 2 : 0 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          {datos.map((d, i) => <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: hover === i ? C.n900 : C.n700, fontWeight: hover === i ? 600 : 400 }}>{d.label}</span>)}
        </div>
      </div>
    </div>
  );
}

/** Barra horizontal de progreso (widget Habitaciones). */
export function Progreso({ valor, total, color }: { valor: number; total: number; color: string }) {
  return (
    <div style={{ flex: 1, height: 6, background: C.n500, borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${total ? (valor / total) * 100 : 0}%`, height: '100%', background: color, borderRadius: 3 }} />
    </div>
  );
}

export function Etiqueta({ children, color, bg }: { children: ReactNode; color: string; bg?: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color, background: bg, padding: bg ? '2px 8px' : 0, borderRadius: radius.pill, whiteSpace: 'nowrap' }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />{children}
  </span>;
}
