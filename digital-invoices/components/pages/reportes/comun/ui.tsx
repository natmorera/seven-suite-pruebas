'use client';

import { ReactNode, CSSProperties } from 'react';
import { PageHeader, TabBar, BotonExportarUnico, SearchInput, FilterDropdown, C, FONT, fmtNum, radius } from '@/components/ui/primitives';
import { ESTADOS, Filtros, rangoPeriodo } from './datos';
import { fmtDate } from '@/components/ui/primitives';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import { usePermisos } from '@/lib/permisosCliente';
import { nombreMonedaLocal, simboloLocal } from '@/lib/paisActual';

// ── Descripción legible de los filtros (encabezado y exportación) ────────────


export function etiquetaPeriodo(f: Filtros): string {
  const r = rangoPeriodo(f);
  if (!r) return 'Todo el historial';
  const d = r.desde.startsWith('0000') ? 'inicio' : fmtDate(r.desde);
  const h = r.hasta.startsWith('9999') ? 'hoy' : fmtDate(r.hasta);
  return `${d} al ${h}`;
}

export function descripcionFiltros(f: Filtros): string {
  // El período va como rango de fechas («DD/MM/AAAA al DD/MM/AAAA»), como pide el documento estándar
  const r = rangoPeriodo(f);
  const dmy = (iso: string) => iso.split('-').reverse().join('/');
  const partes = [`Período: ${r && !r.desde.startsWith('0000') ? `${dmy(r.desde)} al ${dmy(r.hasta)}` : etiquetaPeriodo(f)}`];
  partes.push(`Estado: ${f.estados.size === 0 ? 'todos' : Array.from(f.estados).join(', ')}`);
  partes.push(`Moneda: ${f.moneda === 'todas' ? `todas (expresado en ${nombreMonedaLocal()})` : f.moneda}`);
  if (f.actividad) partes.push(`Actividad: ${f.actividad}`);
  if (f.busq) partes.push(`Búsqueda: "${f.busq}"`);
  return partes.join(' · ');
}

// ── Layout ───────────────────────────────────────────────────────────────────

export function ReporteLayout({ titulo, filtros, onExportar, tabs, tab = 0, onTab, barra, aviso, children, pie, permisoExportar }: {
  titulo: string; filtros: Filtros; onExportar: () => void;
  permisoExportar?: string;   // p. ej. fe.reportes.general.exportar
  tabs?: string[]; tab?: number; onTab?: (i: number) => void;
  barra: ReactNode; aviso?: ReactNode; children: ReactNode; pie?: ReactNode;
}) {
  const { puede } = usePermisos();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT, background: '#fff', overflow: 'hidden' }}>
      <PageHeader title={titulo} left={<span style={{ fontSize: 12, color: C.n700, whiteSpace: 'nowrap' }}>{etiquetaPeriodo(filtros)}</span>}>
        {(!permisoExportar || puede(permisoExportar)) && <BotonExportarUnico onClick={onExportar} />}
      </PageHeader>
      {tabs && onTab && <TabBar tabs={tabs} active={tab} onChange={onTab} />}
      {barra}
      {aviso}
      <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
        <div style={{ padding: '0 24px 24px' }}>{children}</div>
      </div>
      {pie && <div style={{ background: '#fff', borderTop: `1px solid ${C.n500}`, padding: '8px 24px', flexShrink: 0 }}>{pie}</div>}
    </div>
  );
}

// ── Barra de filtros estándar ────────────────────────────────────────────────


function mismosFiltros(a: Filtros, b: Filtros) {
  return a.periodo === b.periodo && a.desde === b.desde && a.hasta === b.hasta && a.moneda === b.moneda &&
    a.actividad === b.actividad && a.busq === b.busq && (a.naturaleza ?? 'todos') === (b.naturaleza ?? 'todos') &&
    a.estados.size === b.estados.size && Array.from(a.estados).every(e => b.estados.has(e));
}

export function BarraFiltros({ filtros, inicial, onChange, placeholder, actividades, conteo, mostrarEstado = true, extra, hayExtraActivo, onLimpiarExtra, sinBusqueda }: {
  filtros: Filtros; inicial: Filtros; onChange: (f: Filtros) => void; placeholder: string;
  actividades?: string[]; conteo?: ReactNode; mostrarEstado?: boolean;
  extra?: ReactNode;           // filtros propios del reporte (tipo de comprobante, origen…)
  hayExtraActivo?: boolean;    // para mostrar "Limpiar filtros" también por los filtros propios
  onLimpiarExtra?: () => void;
  sinBusqueda?: boolean;       // reportes tipo formulario (Reporte de IVA) no buscan por contraparte
}) {
  const set = (p: Partial<Filtros>) => onChange({ ...filtros, ...p });
  return (
    <div style={{ background: '#fff', borderBottom: `1px solid ${C.n500}`, padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
      {!sinBusqueda && <SearchInput value={filtros.busq} onChange={busq => set({ busq })} placeholder={placeholder} width={260} />}

      {/* Mismos controles que el Analítico de cuentas: Fecha con atajos y rango, y listas de opciones */}
      <DateRangeFilter label="Fecha" value={(() => { const r = rangoPeriodo(filtros); return r ? { from: r.desde.startsWith('0000') ? '' : r.desde, to: r.hasta.startsWith('9999') ? '' : r.hasta } : { from: '', to: '' }; })()}
        onChange={v => set({ periodo: v.from || v.to ? 'personalizado' : 'todo', desde: v.from, hasta: v.to })}
        onClear={() => set({ periodo: 'todo', desde: '', hasta: '' })} />

      {mostrarEstado && (
        <FilterDropdown label="Estado" options={[...ESTADOS]} selected={filtros.estados}
          onApply={estados => set({ estados })} onClear={() => set({ estados: new Set() })} />
      )}

      <FilterDropdown label="Moneda" options={[{ value: 'CRC', label: `${nombreMonedaLocal(true)} (${simboloLocal()})` }, { value: 'USD', label: 'Dólares ($)' }]}
        selected={new Set(filtros.moneda === 'todas' ? [] : [filtros.moneda])}
        onApply={x => set({ moneda: x.size === 1 ? ([...x][0] as Filtros['moneda']) : 'todas' })} onClear={() => set({ moneda: 'todas' })} />

      <FilterDropdown label="Bienes o servicios" options={[{ value: 'bienes', label: 'Bienes (mercancías)' }, { value: 'servicios', label: 'Servicios' }]}
        selected={new Set(!filtros.naturaleza || filtros.naturaleza === 'todos' ? [] : [filtros.naturaleza])}
        onApply={x => set({ naturaleza: x.size === 1 ? ([...x][0] as Filtros['naturaleza']) : 'todos' })} onClear={() => set({ naturaleza: 'todos' })} />

      {/* Mismo juego de filtros en todos los reportes fiscales */}
      {actividades && actividades.length > 0 && (
        <FilterDropdown label="Actividad económica" options={actividades}
          selected={new Set(filtros.actividad ? [filtros.actividad] : [])}
          onApply={x => set({ actividad: x.size ? [...x][x.size - 1] : '' })} onClear={() => set({ actividad: '' })} />
      )}

      {extra}

      {(!mismosFiltros(filtros, inicial) || hayExtraActivo) && (
        <button onClick={() => { onChange({ ...inicial, estados: new Set(inicial.estados) }); onLimpiarExtra?.(); }}
          style={{ height: 28, padding: '0 10px', border: 'none', background: C.errorBg, color: C.error, borderRadius: radius.sm, cursor: 'pointer', fontSize: 11, fontFamily: FONT }}>
          × Limpiar
        </button>
      )}

      {conteo && <span style={{ marginLeft: 'auto', fontSize: 12, color: C.n700, whiteSpace: 'nowrap' }}>{conteo}</span>}
    </div>
  );
}

// Aviso de una línea bajo la barra de filtros (reglas del reporte).
export function AvisoReporte({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '8px 24px', fontSize: 11.5, color: C.n700, background: C.n200, borderBottom: `1px solid ${C.n500}`, flexShrink: 0, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

// ── Tabla ────────────────────────────────────────────────────────────────────

export function Tabla({ minWidth = 900, children }: { minWidth?: number; children: ReactNode }) {
  return (
    <table style={{ width: '100%', minWidth, borderCollapse: 'collapse', fontSize: 12, fontFamily: FONT }}>
      {children}
    </table>
  );
}

export function Encabezado({ children }: { children: ReactNode }) {
  return (
    <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#fff' }}>
      <tr style={{ borderBottom: `1px solid ${C.n500}` }}>{children}</tr>
    </thead>
  );
}

export function Th({ children, right, width }: { children?: ReactNode; right?: boolean; width?: number }) {
  return (
    <th style={{ padding: '10px 12px', textAlign: right ? 'right' : 'left', fontWeight: 500, color: C.n700, fontSize: 11, whiteSpace: 'nowrap', width }}>
      {children}
    </th>
  );
}

export function Td({ children, right, bold, muted, indent, nowrap, colSpan, style }: {
  children?: ReactNode; right?: boolean; bold?: boolean; muted?: boolean; indent?: boolean; nowrap?: boolean; colSpan?: number; style?: CSSProperties;
}) {
  return (
    <td colSpan={colSpan} style={{
      padding: indent ? '7px 12px 7px 36px' : '8px 12px', textAlign: right ? 'right' : 'left',
      fontWeight: bold ? 600 : 400, color: muted ? C.n700 : C.n900, whiteSpace: nowrap || right ? 'nowrap' : undefined,
      fontVariantNumeric: right ? 'tabular-nums' : undefined, ...style,
    }}>{children}</td>
  );
}

export function Fila({ children, i, onClick, activa, sub }: { children: ReactNode; i: number; onClick?: () => void; activa?: boolean; sub?: boolean }) {
  return (
    <tr onClick={onClick} style={{
      borderBottom: '1px solid #F5F5F5', cursor: onClick ? 'pointer' : undefined,
      background: activa ? C.brandBg : sub ? C.n200 : (i % 2 === 1 ? '#FCFCFA' : '#fff'),
      fontSize: sub ? 11.5 : 12,
    }}>{children}</tr>
  );
}

// Monto con símbolo; negativos (notas de crédito) en rojo con signo menos.
export function Monto({ n, sym }: { n: number; sym: string }) {
  const neg = n < -0.004;
  return <span style={{ color: neg ? C.error : undefined }}>{neg ? '-' : ''}{sym}{'\u00a0'}{fmtNum(Math.abs(n))}</span>;
}
export function txtMonto(n: number, sym: string) { return `${n < -0.004 ? '-' : ''}${sym} ${fmtNum(Math.abs(n))}`; }

export function FilaTotal({ etiqueta = 'Totalizado', span, children }: { etiqueta?: string; span: number; children: ReactNode }) {
  return (
    <tr style={{ background: '#FAFAFA', borderTop: `2px solid ${C.n500}` }}>
      <td colSpan={span} style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#333' }}>{etiqueta}</td>
      {children}
    </tr>
  );
}
export function TdTotal({ children }: { children: ReactNode }) {
  return <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{children}</td>;
}

export function FilaVacia({ span, texto = 'No hay comprobantes para el período y los filtros seleccionados.' }: { span: number; texto?: string }) {
  return <tr><td colSpan={span} style={{ padding: 40, textAlign: 'center', color: C.n700, fontSize: 12 }}>{texto}</td></tr>;
}

export function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} aria-hidden>
      <path d="M5.25 3.5L8.75 7l-3.5 3.5" />
    </svg>
  );
}

// Enlace de detalle (drill-down): mismo estilo en todos los reportes.
export function Enlace({ children, onClick, abierto }: { children: ReactNode; onClick?: () => void; abierto?: boolean }) {
  return (
    <button onClick={onClick} aria-expanded={abierto}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: C.brand, fontFamily: FONT, fontSize: 12, fontWeight: 500, textAlign: 'left' }}>
      {abierto !== undefined && <Chevron abierto={abierto} />}
      <span style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>{children}</span>
    </button>
  );
}

export function Cargando() {
  return <div style={{ padding: 24, fontSize: 12, color: C.n700, fontFamily: FONT }}>Cargando…</div>;
}

// Tarjetas de resumen (solo donde hay un número que se lee primero, como el neto de IVA).
export function Resumen({ items }: { items: { label: string; valor: ReactNode; nota?: string; destacado?: boolean }[] }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 24px', borderBottom: `1px solid ${C.n500}`, flexWrap: 'wrap', flexShrink: 0 }}>
      {items.map(it => (
        <div key={it.label} style={{ minWidth: 200, padding: '10px 14px', border: `1px solid ${it.destacado ? C.brandBd : C.n500}`,
          background: it.destacado ? C.brandBg : '#fff', borderRadius: radius.md }}>
          <div style={{ fontSize: 11, color: C.n700 }}>{it.label}</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{it.valor}</div>
          {it.nota && <div style={{ fontSize: 10.5, color: C.n700, marginTop: 2 }}>{it.nota}</div>}
        </div>
      ))}
    </div>
  );
}
