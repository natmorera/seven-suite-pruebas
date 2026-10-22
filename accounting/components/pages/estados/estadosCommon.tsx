'use client';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, FONT, radius, shadow } from '@/components/ui/tokens';
import { Chip } from '@/components/ui/filtros';
import { useFirmasConfig, firmasParaReporte, EncabezadoAlternativoBloque, FirmasBloque } from '@/components/pages/config/firmasConfig';

export const F = FONT;
export const BRAND = C.brand;
export { Chip };

// ── Nivel de cuenta - consistente con el catálogo de cuentas (corregir opciones) ──
const NIVEL_CUENTA_OPTIONS = ['Mayor', 'Sub mayor', 'Detalle', 'Auxiliar'] as const;
export type NivelCuentaFiltro = typeof NIVEL_CUENTA_OPTIONS[number];

// ── Vista - acompaña al filtro de Nivel de cuenta en los estados financieros ──
const VISTA_OPTIONS = ['Acumulado', 'Período', 'Ambos'] as const;
export type VistaFiltro = typeof VISTA_OPTIONS[number];

// ── Grupo de filtros - solo un panel puede estar abierto a la vez ──────────────
interface FilterGroupCtx { openId: string | null; setOpenId: (id: string | null) => void; }
const Ctx = createContext<FilterGroupCtx | null>(null);

export function FilterBarGroup({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <Ctx.Provider value={{ openId, setOpenId }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
    </Ctx.Provider>
  );
}

export function FilterBtn({ id, label, active, children }: { id: string; label: string; active?: boolean; children?: React.ReactNode }) {
  const ctx = useContext(Ctx);
  const open = !!ctx && ctx.openId === id;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) ctx?.setOpenId(null);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, ctx]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => ctx?.setOpenId(open ? null : id)}
        style={{ height: 32, padding: '0 12px', border: `1px solid ${active ? BRAND : C.n500}`, borderRadius: radius.md,
          background: active ? C.brandBg : '#FFFFFF', cursor: 'pointer', fontSize: 12, fontFamily: F,
          display: 'flex', alignItems: 'center', gap: 5, color: active ? BRAND : '#0F0F0F', whiteSpace: 'nowrap' }}>
        {label}
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3.5 5.25L7 8.75L10.5 5.25" />
        </svg>
      </button>
      {open && children && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 300, background: '#FFFFFF',
          border: `1px solid ${C.n500}`, borderRadius: 10, minWidth: 220, boxShadow: shadow.panel,
          padding: '14px 16px', fontFamily: F }}
          onClick={e => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Lista de opciones de un solo valor - fila resaltada en vez de radio nativo ──
// (coincide con el diseño: texto plano, sin fondo - la seleccionada solo en dorado + negrita)
export function OptionList<T extends string>({ options, value, onChange }: {
  options: readonly T[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {options.map(o => {
        const active = value === o;
        return (
          <button key={o} type="button" onClick={() => onChange(o)}
            style={{ textAlign: 'left', padding: 0, border: 'none', background: 'transparent',
              color: active ? BRAND : '#0F0F0F',
              fontWeight: active ? 600 : 400, cursor: 'pointer', fontSize: 12, fontFamily: F, whiteSpace: 'nowrap' }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ── Lista de opciones con fila resaltada - para Vista (fondo dorado suave en la seleccionada) ──
function HighlightList<T extends string>({ options, value, onChange }: {
  options: readonly T[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {options.map(o => {
        const active = value === o;
        return (
          <button key={o} type="button" onClick={() => onChange(o)}
            style={{ textAlign: 'left', padding: '7px 10px', border: 'none', borderRadius: radius.sm,
              background: active ? C.brandBg : 'transparent',
              color: active ? BRAND : '#0F0F0F',
              fontWeight: active ? 600 : 400, cursor: 'pointer', fontSize: 12, fontFamily: F, whiteSpace: 'nowrap' }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ── Exportar - un solo botón funcional en vez de "Exportar" + "Imprimir" sueltos.
// Abre una vista previa (para imprimir/guardar como PDF con el diálogo del navegador)
// o descarga CSV, con los mismos filtros aplicados en pantalla ────────────────────
export function BotonExportar({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ height:32, padding:'0 13px', border:`1px solid ${C.n500}`, borderRadius:radius.md,
      background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F, color:C.n700,
      display:'flex', alignItems:'center', gap:6 }}>
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 1v8M4 6l3 3 3-3M2 10v1.5A1.5 1.5 0 003.5 13h7A1.5 1.5 0 0012 11.5V10"/>
      </svg>
      Exportar
    </button>
  );
}

function csvEscapeEstado(v: string) { return `"${String(v).replace(/"/g, '""')}"`; }

export function ModalExportarEstado({ titulo, subtitulo, filtrosResumen, filename, csvRows, onClose, children, reporteKey, moneda }: {
  titulo: string; subtitulo?: string; filtrosResumen?: string[]; filename: string;
  csvRows: (string | number)[][]; onClose: () => void; children: React.ReactNode;
  // reporteKey queda por si a futuro algún reporte necesita distinguirse acá -
  // hoy Encabezado alternativo e Incluir firma se ofrecen igual en todos.
  reporteKey?: string; moneda?: string;
}) {
  const [formato, setFormato] = useState<'pdf' | 'csv'>('pdf');
  const fechaHoy = new Date().toLocaleDateString('es-CR');
  const router = useRouter();
  const { firmas } = useFirmasConfig();
  const mostrarOpcionEncabezado = true;
  // se volvió al modelo centralizado - "Incluir firma(s)" muestra
  // TODAS las firmas configuradas para este reporte en Parámetros generales
  // > Firmas, en el orden que se definió ahí (no solo la propia).
  const firmasDelReporte = reporteKey ? firmasParaReporte(firmas, reporteKey) : [];
  const mostrarOpcionFirmas = true;
  const [encabezadoAlt, setEncabezadoAlt] = useState(false);
  const [incluirFirmas, setIncluirFirmas] = useState(false);

  function descargarCSV() {
    const lines = csvRows.map(row => row.map(v => csvEscapeEstado(String(v))).join(','));
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  function handleDescargar() { if (formato === 'csv') descargarCSV(); else window.print(); }

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, height: 32, borderRadius: radius.md, border: `1px solid ${active ? BRAND : C.n500}`,
    background: active ? C.brandBg : '#FFFFFF', color: active ? BRAND : '#0F0F0F',
    fontWeight: active ? 600 : 400, cursor: 'pointer', fontSize: 12, fontFamily: F,
    padding: '0 10px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div className="export-modal-root" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <style>{`@media print {
        body * { visibility:hidden; }
        #export-print-area-estado, #export-print-area-estado * { visibility:visible; }
        /* position:fixed recorta a una sola página - absolute permite que el
           contenido pagine completo cuando el reporte tiene varias páginas */
        #export-print-area-estado { position:absolute; left:0; top:0; width:100%; padding:24px; }
        /* Los contenedores con scroll/alto fijo del modal recortan visualmente el
           contenido al imprimir; se neutralizan solo en @media print */
        .export-modal-root, .export-modal-dialog, .export-modal-scroll {
          position:static !important; overflow:visible !important; height:auto !important;
          max-height:none !important; width:auto !important; display:block !important;
          box-shadow:none !important; padding:0 !important;
        }
        /* el encabezado de columnas solo aparecía en la primera página del
           PDF - de la página 2 en adelante arrancaba directo en los datos, sin
           saber a qué columna corresponde cada número. display:table-header-group
           es lo que le dice al navegador que repita ese <thead> en cada página. */
        #export-print-area-estado table thead { display: table-header-group; }
        #export-print-area-estado table tr { page-break-inside: avoid; }
      }`}</style>
      <div className="export-modal-dialog" style={{ background: '#FFFFFF', borderRadius: radius.lg, width: 'min(1100px, 95vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: shadow.modal, fontFamily: F }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Exportar {titulo.toLowerCase()}</p>
            {subtitulo && <p style={{ fontSize: 11, color: '#757575', margin: '3px 0 0' }}>{subtitulo}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#757575' }}>×</button>
        </div>

        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.n500}`, display: 'flex', gap: 24, flexShrink: 0, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 600, color: '#757575', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 8px' }}>Formato de descarga</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setFormato('pdf')} style={toggleBtn(formato === 'pdf')}>PDF</button>
              <button onClick={() => setFormato('csv')} style={toggleBtn(formato === 'csv')}>Excel (CSV)</button>
            </div>
          </div>
          {filtrosResumen && filtrosResumen.length > 0 && (
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontSize: 10.5, fontWeight: 600, color: '#757575', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 8px' }}>Filtros aplicados</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {filtrosResumen.map((f, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: radius.pill, background: C.brandBg, color: BRAND, border: `1px solid ${C.brandBd}` }}>{f}</span>
                ))}
              </div>
            </div>
          )}
          {/* Encabezado alternativo / Incluir firmas - solo aparecen si el
              parámetro general está activo Y el usuario tiene el permiso
              "Firmar" de este reporte específico (Usuarios y Permisos). */}
          {(mostrarOpcionEncabezado || mostrarOpcionFirmas) && (
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 600, color: '#757575', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 8px' }}>Opciones</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mostrarOpcionEncabezado && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, fontFamily: F, color: '#0F0F0F' }}>
                    <input type="checkbox" aria-label="Seleccionar" checked={encabezadoAlt} onChange={e => setEncabezadoAlt(e.target.checked)} style={{ accentColor: BRAND }} />
                    Encabezado alternativo
                  </label>
                )}
                {mostrarOpcionFirmas && (
                  firmasDelReporte.length > 0 ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, fontFamily: F, color: '#0F0F0F' }}>
                      <input type="checkbox" aria-label="Seleccionar" checked={incluirFirmas} onChange={e => setIncluirFirmas(e.target.checked)} style={{ accentColor: BRAND }} />
                      Incluir firma{firmasDelReporte.length > 1 ? `s (${firmasDelReporte.length})` : ''}
                    </label>
                  ) : (
                    // todavía no hay ninguna firma configurada para este
                    // reporte en Parámetros generales > Firmas - se avisa acá
                    // mismo con el enlace directo para quien tenga acceso.
                    <div style={{ fontSize: 11.5, color: C.n700, fontFamily: F, lineHeight: 1.5, maxWidth: 260 }}>
                      No hay firmas configuradas para este reporte.{' '}
                      <button type="button" onClick={() => router.push('/parametros?tab=firmas')}
                        style={{ background: 'none', border: 'none', padding: 0, color: BRAND, fontWeight:500, cursor: 'pointer', fontSize: 11.5, fontFamily: F, textDecoration: 'underline' }}>
                        Configuralas en Parámetros generales &gt; Firmas
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <div className="export-modal-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', background: '#F9F9F9' }}>
          <div id="export-print-area-estado" style={{ background: '#FFFFFF', border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 24 }}>
            {encabezadoAlt ? (
              <EncabezadoAlternativoBloque titulo={titulo} rangoFecha={subtitulo} moneda={moneda} />
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Hotel Fortuna S.A.</p>
                  <p style={{ fontSize: 12, color: '#757575', margin: '2px 0 0' }}>{titulo}{subtitulo ? ` · ${subtitulo}` : ''}</p>
                </div>
                <p style={{ fontSize: 11, color: '#757575', margin: 0 }}>Generado: {fechaHoy}</p>
              </div>
            )}
            {children}
            {incluirFirmas && <FirmasBloque firmas={firmasDelReporte} />}
          </div>
        </div>

        <div style={{ padding: '12px 24px', borderTop: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ height: 34, padding: '0 16px', border: `1px solid ${C.n500}`, borderRadius: radius.md, background: '#FFFFFF', cursor: 'pointer', fontSize: 12, fontFamily: F }}>Cancelar</button>
          <button onClick={handleDescargar} style={{ height: 34, padding: '0 16px', background: BRAND, color: '#FFFFFF', border: 'none', borderRadius: radius.md, cursor: 'pointer', fontSize: 12, fontWeight:500, fontFamily: F, display: 'flex', alignItems: 'center', gap: 6 }}>
            Descargar {formato === 'pdf' ? 'PDF' : 'Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
export function NivelCuentaPicker({ value, onChange, vista, onVistaChange }: {
  value: NivelCuentaFiltro | null; onChange: (v: NivelCuentaFiltro | null) => void;
  vista?: VistaFiltro; onVistaChange?: (v: VistaFiltro) => void;
}) {
  return (
    <div style={{ width: 272 }}>
      <p style={{ fontSize: 11, color: C.n700, margin: '0 0 8px', fontFamily: F }}>Nivel de cuenta</p>
      <div style={{ display: 'flex', gap: 6 }}>
        {NIVEL_CUENTA_OPTIONS.map(o => {
          const active = value === o;
          return (
            <button key={o} onClick={() => onChange(active ? null : o)}
              style={{ flex: 1, height: 30, padding: '0 4px', borderRadius: radius.sm, border: `1px solid ${active ? BRAND : C.n500}`,
                background: active ? BRAND : '#FFFFFF', color: active ? '#FFFFFF' : '#0F0F0F', cursor: 'pointer', fontSize: 11, fontFamily: F, whiteSpace: 'nowrap' }}>
              {o}
            </button>
          );
        })}
      </div>

      {vista && onVistaChange && (<>
        <div style={{ height: 1, background: C.n500, margin: '14px 0 10px' }}/>
        <p style={{ fontSize: 11, color: C.n700, margin: '0 0 4px', fontFamily: F }}>Vista</p>
        <HighlightList options={VISTA_OPTIONS} value={vista} onChange={onVistaChange}/>
      </>)}
    </div>
  );
}
