'use client';
import ExportarDocumento from './documento/ExportarDocumento';
import { filtrosDesdeTexto, type DocumentoReporte } from './documento/documentoEstandar';
import { useEmpresaDoc } from './documento/useEmpresaDoc';
import { useEffect, useRef, useState, ReactNode, ReactElement, CSSProperties, cloneElement, isValidElement, type InputHTMLAttributes } from 'react';
import { useRouter } from 'next/navigation';
import { IcWarning, IcClose, IcSearch } from './icons';
import { useFirmasConfig, firmasParaReporte } from '../pages/config/firmasConfig';
import { simboloLocal } from '@/lib/paisActual';

// ── Design tokens ─────────────────────────────────────────────────────────────
// ── Formato numérico estándar de toda la app: 1,234,567.00 ───────────────────
// "," separador de miles, "." separador decimal, SIEMPRE 2 decimales (.00),
// sin excepción - regla de negocio explícita.
export function fmtNum(n: number, decimals = 2): string {
  const parts = Math.abs(n).toFixed(decimals).split('.');
  const int   = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const dec   = parts[1] ?? '';
  return (n < 0 ? '-' : '') + int + (decimals > 0 ? '.' + dec : '');
}

// Con símbolo de moneda: ₡ 1,234,567.00  |  $ 50,000.00
export function fmtMoney(n: number, sym = simboloLocal(), decimals = 2): string {
  return sym + '\u00a0' + fmtNum(n, decimals);
}

// Fecha estándar de toda la app: DD/MM/AAAA. Acepta Date, "YYYY-MM-DD" o
// cualquier string parseable, así cada módulo llama a lo mismo en vez de
// inventar su propio toLocaleDateString con opciones distintas.
export function fmtDate(input: Date | string): string {
  const d = typeof input === 'string'
    ? (input.length === 10 ? new Date(input + 'T12:00:00') : new Date(input))
    : input;
  if (isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ── Vencimiento de facturas ───────────────────────────────────────────────────
// Regla de negocio la fecha de vencimiento de una factura es
// fecha de factura + días de crédito del cliente/proveedor. Los "días vencidos"
// se cuentan a partir de esa fecha de vencimiento, no de la fecha de factura.
export function fechaVencimiento(fechaFactura: Date | string, diasCredito: number): Date {
  const d = typeof fechaFactura === 'string'
    ? parseFechaInterna(fechaFactura)
    : new Date(fechaFactura);
  d.setDate(d.getDate() + diasCredito);
  return d;
}
function parseFechaInterna(fecha: string): Date {
  if (fecha.includes('/')) {
    const [dd, mm, yyyy] = fecha.split('/').map(Number);
    return new Date(yyyy, (mm || 1) - 1, dd || 1, 12);
  }
  return fecha.length === 10 ? new Date(fecha + 'T12:00:00') : new Date(fecha);
}
export function diasVencidos(fechaFactura: Date | string, diasCredito: number, hoy: Date = new Date()): number {
  const venc = fechaVencimiento(fechaFactura, diasCredito);
  const diff = Math.round((hoy.getTime() - venc.getTime()) / 86400000);
  return Math.max(0, diff);
}

// ── Celda de monto alineada ───────────────────────────────────────────────────
// Regla transversal (explícita): el símbolo de moneda SIEMPRE a la izquierda,
// fijo; la cifra SIEMPRE alineada a la derecha, aunque el número sea chico.
// Ej.: "$   100.00" - el símbolo no se mueve, la cifra se pega al borde derecho.
export function MoneyCell({
  n, sym = simboloLocal(), decimals = 2, style,
}: { n: number; sym?: string; decimals?: number; style?: CSSProperties }) {
  return (
    <span style={{ display: 'inline-flex', justifyContent: 'space-between', width: '100%', fontVariantNumeric: 'tabular-nums', ...style }}>
      <span style={{ color: C.n700 }}>{sym}</span>
      <span>{fmtNum(n, decimals)}</span>
    </span>
  );
}

// ── Exportar/Imprimir unificado ──────────────────────────────────
// Un solo botón "Exportar" (nunca "Exportar" + "Imprimir" sueltos) que abre una
// vista previa con PDF o Excel/CSV. El área de impresión usa position:absolute
// (no fixed) para que los reportes de varias páginas impriman completos.
export function BotonExportarUnico({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:4,
      background:'#fff', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'Montserrat, sans-serif', color:C.n700,
      display:'flex', alignItems:'center', gap:10 }}>
      <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 1v8M4 6l3 3 3-3M2 10v1.5A1.5 1.5 0 003.5 13h7A1.5 1.5 0 0012 11.5V10"/>
      </svg>
      Exportar
    </button>
  );
}

export interface ExportColumn { key:string; label:string; align?:'right'|'left' }
export function ExportListModal({ title, subtitulo, columns, rows, filename, onClose, reporteKey, periodo, filtros }: {
  title:string; subtitulo?:string; columns:ExportColumn[]; rows:Record<string,string|number>[]; filename:string; onClose:()=>void;
  reporteKey?: string;
  periodo?: string;                                  // «DD/MM/AAAA al DD/MM/AAAA»
  filtros?: { etiqueta: string; valor: string }[];   // filtros activos, en el orden de la barra
}) {
  // Documento estándar de exportación e impresión (lineamiento de Front Desk)
  const empresa = useEmpresaDoc();
  const router = useRouter();
  const { firmas } = useFirmasConfig();
  const firmasDelReporte = reporteKey ? firmasParaReporte(firmas, reporteKey) : [];
  const [incluirFirmas, setIncluirFirmas] = useState(false);
  const desdeTexto = filtrosDesdeTexto(subtitulo);
  const documento: DocumentoReporte = {
    empresa: empresa.nombre || 'Empresa', titulo: title, periodo: periodo ?? desdeTexto.periodo, filtros: filtros ?? desdeTexto.filtros,
    columnas: columns, filas: rows, firmas: incluirFirmas ? firmasDelReporte.map(f => ({ nombre: f.nombre, cargo: f.puesto })) : undefined,
  };
  const extra = reporteKey ? (firmasDelReporte.length > 0 ? (
    <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:12 }}>
      <input type="checkbox" checked={incluirFirmas} onChange={e=>setIncluirFirmas(e.target.checked)} style={{ accentColor:C.brand }} />
      Incluir firma{firmasDelReporte.length > 1 ? `s (${firmasDelReporte.length})` : ''}
    </label>
  ) : (
    <div style={{ fontSize:11.5, color:C.n700, lineHeight:1.5 }}>
      No hay firmas configuradas para este reporte.{' '}
      <button type="button" onClick={()=>router.push('/parametros?tab=firmas')}
        style={{ background:'none', border:'none', padding:0, color:C.brand, fontWeight:500, cursor:'pointer', fontSize:11.5, textDecoration:'underline' }}>Configúralas</button>
    </div>
  )) : undefined;
  return <ExportarDocumento documento={documento} archivo={filename} onClose={onClose} marca={C.brand} extra={extra} />;
}

// Usuario de la sesión activa. Centralizado aquí para que ningún formulario
// grabe un usuario "de mentira" desconectado de quién realmente opera el
// sistema - cuando exista autenticación real, este es el único punto a cambiar.
// Usuario de la sesión: en el prototipo, siempre el superusuario (puede todo)
export const USUARIO_ACTUAL = 'admin';

// Permisos del usuario de la sesión activa. Centralizado para que la pantalla
// "Sin permisos" (p.ej. al descontabilizar/descontabilizar) sea consistente en
// toda la app y no cada módulo invente su propia validación. Cuando exista
// un sistema de roles real, este es el único punto a conectar.
export const PERMISOS_ACTUAL = {
  descontabilizarAsientos: true,
  // Mock del permiso "Exportar permisos" (Usuarios y Permisos → Usuarios).
  puedeExportarPermisosUsuarios: true,
};

export const C = {
  brand:    '#A77600',
  brandDk:  '#8A6200',
  brandBg:  '#FFF8EC',
  brandBd:  '#EED89A',
  n900:     '#0F0F0F',
  n700:     '#757575',
  n500:     '#ECECEC',
  n200:     '#F9F9F9',
  n000:     '#FFFFFF',
  success:       '#4CAF50',
  successBorder: 'rgba(76,175,80,.08)',
  successBg:     'rgba(76,175,80,.04)',
  successDk:     '#0F6E56',
  error:         '#F44336',
  errorBorder:   'rgba(244,67,54,.08)',
  errorBg:       'rgba(244,67,54,.04)',
  warning:       '#EEB300',
  warningBorder: 'rgba(238,179,0,.08)',
  warningBg:     'rgba(238,179,0,.04)',
  info:          '#2196F3',
  infoBorder:    'rgba(33,150,243,.08)',
  infoBg:        'rgba(33,150,243,.04)',
};

export const radius = { sm: 6, md: 8, lg: 12, pill: 20 };

export const shadow = {
  modal: '0 16px 48px rgba(0,0,0,.2)',
  panel: '0 8px 24px rgba(0,0,0,.14)',
};

export const PAGE_PAD = 24;

// ── Columnas de moneda con alineación garantizada ────────────────────────────
// Un <div> con flex/grid propio dentro de una sola <td> no alinea de forma
// confiable con la fila de Totales, porque cada fila calcula su ancho por
// separado. La forma robusta es usar DOS columnas reales de tabla (símbolo +
// cifra): el navegador garantiza que todas las <th>/<td> de la MISMA columna
// de un <table> midan exactamente lo mismo, así que el símbolo y la cifra
// quedan siempre alineados entre encabezado, datos y total.
export function MoneyHeaderCells({ label }: { label:string }) {
  return (
    <>
      <th style={{ width:16, padding:'8px 0 8px 10px' }}/>
      <th style={{ padding:'8px 12px 8px 0', textAlign:'right', fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap' }}>{label}</th>
    </>
  );
}
export function MoneyCells({ sym, value, bold, color }: { sym:string; value:string; bold?:boolean; color?:string }) {
  return (
    <>
      <td style={{ padding:'10px 0 10px 10px', color:C.n700, fontSize:11 }}>{sym}</td>
      <td style={{ padding:'10px 12px 10px 0', textAlign:'right', fontWeight:bold?700:500, color:color??C.n900, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{value}</td>
    </>
  );
}
export function MoneyCellsStack({ rows, bold }: { rows:{sym:string; value:string}[]; bold?:boolean }) {
  return (
    <>
      <td style={{ padding:'10px 0 10px 10px', color:C.n700, fontSize:11, verticalAlign:'top' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>{rows.map((r,i)=><span key={i}>{r.sym}</span>)}</div>
      </td>
      <td style={{ padding:'10px 12px 10px 0', textAlign:'right', fontWeight:bold?700:500, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>{rows.map((r,i)=><span key={i}>{r.value}</span>)}</div>
      </td>
    </>
  );
}

export interface FilterOption { value: string; label: string; icon?: ReactNode; count?: number }
export function FilterDropdown({ label, options, selected, onApply, onClear }: {
  label: string; options: (string | FilterOption)[]; selected: Set<string>;
  onApply: (s: Set<string>) => void; onClear: () => void;
}) {
  const items: FilterOption[] = options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<Set<string>>(new Set(selected));
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const active = selected.size > 0;
  const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visibles = q.trim() ? items.filter(i => sinTildes(i.label).includes(sinTildes(q.trim()))) : items;

  useEffect(() => {
    function onClickFuera(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') { e.preventDefault(); setOpen(false); } }
    if (open) { document.addEventListener('mousedown', onClickFuera); document.addEventListener('keydown', onEsc); }
    return () => { document.removeEventListener('mousedown', onClickFuera); document.removeEventListener('keydown', onEsc); };
  }, [open]);

  function toggle(v: string) { setLocal(s => { const n = new Set(s); n.has(v) ? n.delete(v) : n.add(v); return n; }); }
  function seleccionarTodos() { setLocal(new Set(items.map(i => i.value))); }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button aria-expanded={open} onClick={() => { setLocal(new Set(selected)); setQ(''); setOpen(v => !v); }}
        style={{ height: 32, padding: '0 12px', border: `1px solid ${active ? C.brand : C.n500}`, borderRadius: 4,
          background: active ? C.brandBg : '#fff', cursor: 'pointer', fontSize: 12, fontFamily: FONT,
          display: 'flex', alignItems: 'center', gap: 6, color: active ? C.brand : C.n900,
          fontWeight: active ? 500 : 400, whiteSpace: 'nowrap' }}>
        {label}{active ? ` (${selected.size})` : ''}
        <svg className="w-3 h-3" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 300, background: '#fff',
          border: `1px solid ${C.n500}`, borderRadius: 10, width: 'max-content', minWidth: 220, maxWidth: 380, boxShadow: shadow.panel, overflow: 'hidden', fontFamily: FONT }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: `1px solid ${C.n500}` }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.n900 }}>{label}</span>
            <button onClick={seleccionarTodos} style={{ fontSize: 12, fontWeight: 500, color: C.brand, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: FONT }}>
              Seleccionar todos
            </button>
          </div>
          {items.length > 10 && (
            <div style={{ padding: 8, borderBottom: `1px solid ${C.n500}` }}>
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={`Buscar ${label.toLowerCase()}`}
                style={{ width: '100%', height: 30, border: `1px solid ${C.n500}`, borderRadius: 4, padding: '0 8px', fontSize: 12, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {visibles.length === 0 && <div style={{ padding: 12, fontSize: 12, color: C.n700 }}>Sin resultados.</div>}
            {visibles.map(it => {
              const checked = local.has(it.value);
              return (
                <div key={it.value} onClick={() => toggle(it.value)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 9, padding: '8px 12px',
                    cursor: 'pointer', background: checked ? 'rgba(167,118,0,0.05)' : '#fff', fontSize: 12, color: C.n900, whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, whiteSpace: 'nowrap' }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${checked ? C.brand : '#ECECEC'}`,
                      background: checked ? C.brand : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {checked && <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.33 7L5.25 9.92L11.67 4.08"/></svg>}
                    </span>
                    {it.icon}
                    {it.label}
                  </span>
                  {it.count !== undefined && <span style={{ fontSize: 12, color: C.n700 }}>{it.count}</span>}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderTop: `1px solid ${C.n500}` }}>
            {local.size > 0 ? (
              <button onClick={() => { setLocal(new Set()); onClear(); }} style={{ fontSize: 12, fontWeight: 500, color: C.error, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: FONT, padding: 0 }}>
                Limpiar
              </button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setOpen(false)} style={{ height: 28, padding: '5px 12px', border: `1px solid ${C.n500}`, borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: FONT, color: C.n900 }}>Cancelar</button>
              <button onClick={() => { onApply(local); setOpen(false); }} style={{ height: 28, padding: '5px 12px', border: 'none', borderRadius: 4, background: C.brand, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: FONT }}>Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BulkActionBar({ count, actions, onClose }: {
  count:number; actions:{ label:string; onClick:()=>void; variant?:'primary'|'danger'|'outline'; icon?:ReactNode }[]; onClose:()=>void;
}) {
  if (count === 0) return null;
  const F = FONT;
  return (
    <div style={{ position:'sticky', top:0, zIndex:5, background:'#0D0D0D', color:'#fff',
      padding:`10px ${PAGE_PAD}px`, display:'flex', alignItems:'center', justifyContent:'space-between',
      flexShrink:0, fontFamily:F }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:13, fontWeight:500 }}>{count} seleccionado{count===1?'':'s'}</span>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', opacity:.75, fontSize:12, fontWeight:500, fontFamily:F, textDecoration:'underline', padding:0 }}>Deseleccionar</button>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        {actions.map(a=>(
          <button key={a.label} onClick={a.onClick} style={{
            height:32, padding:'0 16px', borderRadius:4, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F,
            display:'flex', alignItems:'center', gap:6,
            border: a.variant==='outline' ? '1px solid rgba(255,255,255,.4)' : 'none',
            background: a.variant==='danger' ? '#E24B4A' : a.variant==='outline' ? 'transparent' : '#fff',
            color: a.variant==='outline' ? '#fff' : a.variant==='danger' ? '#fff' : '#0D0D0D',
          }}>{a.icon}{a.label}</button>
        ))}
      </div>
    </div>
  );
}
export const FONT = "'Montserrat', sans-serif";

// ── Button ────────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
const BTN: Record<BtnVariant, CSSProperties> = {
  primary:   { background: C.brand,   color: '#fff',      border: `1px solid ${C.brand}`   },
  secondary: { background: C.n000,    color: C.n900,      border: `1px solid ${C.n500}`    },
  ghost:     { background: 'transparent', color: C.n700,  border: '1px solid transparent'  },
  danger:    { background: C.n000,    color: C.error,     border: `1px solid ${C.error}`   },
};

interface ButtonProps {
  children: ReactNode; onClick?: () => void;
  variant?: BtnVariant; disabled?: boolean;
  type?: 'button' | 'submit'; style?: CSSProperties;
  icon?: ReactNode; title?: string;
  form?: string;   // id del formulario que envía (botón fuera del formulario, p. ej. en el encabezado)
}
export function Button({ children, onClick, variant = 'primary', disabled, type = 'button', style, icon, title, form }: ButtonProps) {
  const iconEl = isValidElement(icon) ? cloneElement(icon as ReactElement<{ className?: string }>, { className: 'w-4 h-4' }) : icon;
  return (
    <button form={form} type={type} onClick={onClick} disabled={disabled} title={title}
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

export function SearchInput({ value, onChange, placeholder = 'Buscar…', width, autoFocus, disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; width?: number | string; autoFocus?: boolean; disabled?: boolean;
}) {
  return (
    <div style={{ position: 'relative', width: width ?? 'auto', flexShrink: 0 }}>
      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.n700, display: 'flex', pointerEvents: 'none' }}>
        <IcSearch className="w-4 h-4" />
      </span>
      <input autoFocus={autoFocus} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        style={{ height: 32, width: width ?? 200, padding: '0 12px 0 34px', border: `1px solid ${C.n500}`, borderRadius: 4,
          fontSize: 12, fontFamily: FONT, outline: 'none', boxSizing: 'border-box', background: disabled ? C.n200 : C.n000, color: C.n900 }}
        onFocus={e => { e.target.style.borderColor = C.brand; }}
        onBlur={e => { e.target.style.borderColor = C.n500; }} />
    </div>
  );
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
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
export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div style={{ background: C.n000, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.n500}` }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: C.n900, margin: 0 }}>{title}</p>
        {hint && <p style={{ fontSize: 11, color: C.n700, margin: '2px 0 0' }}>{hint}</p>}
      </div>
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, title, onClose, children, footer, wide, width }: {
  open: boolean; title: string; onClose: () => void;
  children: ReactNode; footer?: ReactNode; wide?: boolean; width?: number;
}) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: C.n000, borderRadius: 10, width: width ?? (wide ? '90vw' : 520), maxWidth: '100%',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,.18)', fontFamily: FONT }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.n500}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: C.n900 }}>{title}</span>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: C.n700, display: 'flex', padding: 4 }}>
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
      color: '#fff', padding: '10px 16px', borderRadius: radius.md, fontSize: 12, fontWeight: 500,
      boxShadow: '0 4px 12px rgba(0,0,0,.2)', display: 'flex', gap: 10, alignItems: 'center', fontFamily: FONT }}>
      <span style={{ display:'flex', flexShrink:0 }}>
        {type === 'success'
          ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.33 7L5.25 9.92L11.67 4.08"/></svg>
          : <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"/></svg>}
      </span>
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
        <IcClose className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
// Barra de filtros: fondo blanco, justo debajo de las pestañas y con el
// mismo borde gris que el encabezado y la barra de pestañas (como en la
// Bandeja de asientos). Orden: búsqueda, dropdowns, radios, checkboxes,
// toggles; las acciones propias de la sección van a la derecha.
export function FilterBar({ children, right, unaFila }: { children?: ReactNode; right?: ReactNode; unaFila?: boolean }) {
  return (
    <div style={{ background: C.n000, borderBottom: `1px solid ${C.n500}`, padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: unaFila ? 'nowrap' : 'wrap', whiteSpace: unaFila ? 'nowrap' : undefined, flexShrink: 0, minHeight: 48, boxSizing: 'border-box' }}>
      {children}
      {right && <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: unaFila ? 'nowrap' : 'wrap', flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

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

export interface TabItem { label: string; count?: number }
export function TabBar({ tabs, active, onChange, actions }: {
  tabs: (string | TabItem)[]; active: number; onChange: (i: number) => void; actions?: ReactNode;
}) {
  const items: TabItem[] = tabs.map(t => typeof t === 'string' ? { label: t } : t);
  return (
    <div style={{ height: 44, minHeight: 44, background: C.n000, borderBottom: `1px solid ${C.n500}`,
      padding: '0 24px', display: 'flex', alignItems: 'stretch', justifyContent: 'space-between',
      flexShrink: 0, gap: 12 }}>
      <div style={{ display: 'flex', height: '100%', alignItems: 'flex-end', overflowX: 'auto', overflowY: 'hidden', minWidth: 0 }}>
        {items.map((item, i) => (
          <button key={item.label} onClick={() => onChange(i)}
            style={{ height: '100%', padding: '0 14px', fontSize: 12, fontWeight: active === i ? 600 : 400,
              color: active === i ? C.brand : C.n700, fontFamily: FONT,
              background: 'none', border: 'none', borderBottom: active === i ? `2px solid ${C.brand}` : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {item.label}
            {item.count !== undefined && (
              <span style={{ minWidth: 18, height: 18, padding: '0 5px', boxSizing: 'border-box', borderRadius: 9, background: active === i ? C.brand : C.n500, color: active === i ? '#fff' : C.n900,
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

// ── DataTable ─────────────────────────────────────────────────────────────────
export function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: 10, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT, fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.n200, borderBottom: `1px solid ${C.n500}` }}>
            {headers.map((h, i) => (
              <th key={`${i}-${h}`} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11,
                fontWeight: 500, color: C.n700, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function DataRow({ children, onClick, selected }: {
  children: ReactNode; onClick?: () => void; selected?: boolean;
}) {
  return (
    <tr onClick={onClick} style={{ borderBottom: `1px solid ${C.n500}`,
      cursor: onClick ? 'pointer' : 'default',
      background: selected ? C.brandBg : 'transparent' }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = C.n200; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
      {children}
    </tr>
  );
}

export function Td({ children, muted, right, mono, width, colSpan }: {
  children: ReactNode; muted?: boolean; right?: boolean; mono?: boolean; width?: string; colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} style={{ padding: '8px 14px', color: muted ? C.n700 : C.n900, fontSize: 12,
      textAlign: right ? 'right' : 'left', fontFamily: FONT,
      ...(width ? { width } : {}) }}>
      {children}
    </td>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div style={{ minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: 24 }}>
      <p style={{ fontSize: 12.5, color: C.n700, margin: 0, maxWidth: 380 }}>{message}</p>
      {action}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
export type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'brand' | 'orange';
const BADGE_COLORS: Record<BadgeColor, { bg: string; color: string; border: string }> = {
  green:  { bg: 'rgba(76,175,80,.08)',   color: '#2e7d32', border: 'rgba(76,175,80,.25)'  },
  yellow: { bg: 'rgba(238,179,0,.08)',   color: '#7a5c00', border: 'rgba(238,179,0,.25)'  },
  red:    { bg: 'rgba(244,67,54,.08)',   color: '#c62828', border: 'rgba(244,67,54,.25)'  },
  blue:   { bg: 'rgba(33,150,243,.08)',  color: '#1565c0', border: 'rgba(33,150,243,.25)' },
  gray:   { bg: C.n200,                  color: C.n700,    border: C.n500                  },
  brand:  { bg: C.brandBg,               color: C.brand,   border: C.brandBd               },
  orange: { bg: 'rgba(255,112,67,.10)',  color: '#bf360c', border: 'rgba(255,112,67,.35)' },
};
export function StatusBadge({ label, color, title }: { label: string; color: BadgeColor; title?: string }) {
  const s = BADGE_COLORS[color];
  return (
    <span title={title} style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: '2px 8px', borderRadius: radius.pill, fontSize: 10, fontWeight: 500, fontFamily: FONT }}>
      {label}
    </span>
  );
}

export function PaginacionPie({ children }: { children: ReactNode }) {
  return <div style={{ flexShrink: 0, padding: '10px 24px', borderTop: `1px solid ${C.n500}`, background: '#fff' }}>{children}</div>;
}

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions = [10, 25, 50] }: {
  page: number; pageSize: number; total: number;
  onPageChange: (p: number) => void; onPageSizeChange?: (n: number) => void; pageSizeOptions?: number[];
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  // Páginas visibles: siempre primera y última, vecinas de la actual, resto colapsado con "…"
  function paginasVisibles(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (current > 3) pages.push('…');
    for (let p = Math.max(2, current - 1); p <= Math.min(totalPages - 1, current + 1); p++) pages.push(p);
    if (current < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  }

  const navBtn = (disabled: boolean): CSSProperties => ({
    height: 28, padding: '0 10px', border: `1px solid ${C.n500}`, borderRadius: radius.sm,
    background: '#fff', fontSize: 12, fontFamily: FONT, color: C.n900,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? .4 : 1, whiteSpace: 'nowrap',
  });
  const pageBtn = (activo: boolean): CSSProperties => ({
    height: 28, minWidth: 28, padding: '0 6px', borderRadius: radius.sm, fontSize: 12, fontFamily: FONT,
    cursor: 'pointer', border: `1px solid ${activo ? C.brand : C.n500}`,
    background: activo ? C.brand : '#fff', color: activo ? '#fff' : C.n900, fontWeight: 500,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 12, fontFamily: FONT, color: C.n700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {onPageSizeChange && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            Filas por página
            <select value={pageSize} onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
              style={{ height: 28, border: `1px solid ${C.n500}`, borderRadius: radius.sm, fontSize: 12, fontFamily: FONT, padding: '0 6px', outline: 'none', cursor: 'pointer' }}>
              {pageSizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </span>
        )}
        <span style={{ whiteSpace: 'nowrap' }}>{total === 0 ? 'Sin resultados' : `${from}–${to} de ${total}`}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <button onClick={() => onPageChange(current - 1)} disabled={current === 1} style={navBtn(current === 1)}>‹ Anterior</button>
        {paginasVisibles().map((p, i) => p === '…'
          ? <span key={`e${i}`} style={{ padding: '0 4px', color: C.n700 }}>…</span>
          : <button key={p} onClick={() => onPageChange(p)} aria-current={p === current ? 'page' : undefined} style={pageBtn(p === current)}>{p}</button>)}
        <button onClick={() => onPageChange(current + 1)} disabled={current === totalPages} style={navBtn(current === totalPages)}>Siguiente ›</button>
      </div>
    </div>
  );
}

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

export function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, height: 24, padding: '0 8px', borderRadius: radius.pill,
      background: C.brandBg, border: `1px solid ${C.brandBd}`, fontSize: 11, color: C.brand, fontFamily: FONT }}>
      {label}
      <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.brand, fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
    </span>
  );
}

// ── Dropdown ──────────────────────────────────────────────────────────────────
// Generaliza el patrón "botón que abre un panel flotante" que cada pantalla
// reimplementaba con su propio position:relative + position:absolute a mano
// (filtros, menú de usuario, selector de idioma, "más opciones"...). Se cierra
// solo al hacer click afuera. El trigger y el contenido del panel quedan
// completamente a cargo de quien lo usa.
export function Dropdown({ trigger, open, onOpenChange, children, align = 'left', width }: {
  trigger: ReactNode; open: boolean; onOpenChange: (v: boolean) => void; children: ReactNode;
  align?: 'left' | 'right'; width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, onOpenChange]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', [align]: 0, zIndex: 300,
          background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.md,
          boxShadow: shadow.panel, minWidth: width ?? 180, overflow: 'hidden', fontFamily: FONT,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
export function DropdownItem({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
      fontSize: 12, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT, color: C.n900 }}>
      {children}
    </button>
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
          width: 16, height: 16, borderRadius: 5,
          border: `1.5px solid ${checked ? C.brand : C.n500}`,
          background: checked ? C.brand : C.n000, transition: 'all .12s',
        }}>
          {checked && (
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.33 7L5.25 9.92L11.67 4.08" />
            </svg>
          )}
        </span>
      </span>
      {label}
    </label>
  );
}

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
            width:24, height:24, borderRadius:'50%', background:u.color, color:'#fff',
            fontSize:9.5, fontWeight:600, fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center',
            border:'2px solid #fff', marginLeft: i===0?0:-8, position:'relative', zIndex:usuarios.length-i,
          }}>{u.iniciales}</div>
        ))}
      </div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, background:'#fff', border:`1px solid ${C.n500}`,
          borderRadius:radius.md, boxShadow:'0 4px 16px rgba(0,0,0,.12)', padding:'10px 12px', zIndex:50, minWidth:190 }}>
          <div style={{ fontSize:10, color:C.n700, fontFamily:F, marginBottom:8, fontWeight:600, letterSpacing:'.04em' }}>
            EN ESTA OPERACIÓN AHORA
          </div>
          {usuarios.map(u=>(
            <div key={u.nombre} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0' }}>
              <div style={{ width:18, height:18, borderRadius:'50%', background:u.color, color:'#fff', fontSize:8, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{u.iniciales}</div>
              <span style={{ fontSize:12, color:C.n900, fontFamily:F }}>{u.nombre}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
