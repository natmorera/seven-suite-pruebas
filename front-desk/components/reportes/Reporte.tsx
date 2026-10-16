'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Reporte estándar de la plataforma (guía «Reportes» de la suite).
//
// En el sistema los reportes SIEMPRE se ven como tabla:
//   Header      → nombre del reporte (con selector si la pantalla agrupa varios)
//                 + Imprimir + Exportar
//   FilterBar   → búsqueda, desplegables, radios, checkbox y toggles
//   Chips       → filtros distintos del valor por defecto + «Limpiar todo»
//   Contadores  → «00 Registros | ₡0.00 Ingresos | …»
//   Tabla       → encabezado fijo, grupos, subtotales y fila Total fija abajo
//   Paginación  → « ‹ Pág. [1] de 14 › »
//
// Al imprimir o exportar a PDF se genera el DOCUMENTO: identidad, título +
// período, línea de filtros, divisor, la misma tabla, y en el pie la fecha de
// generación y «Página X de Y». CSV y XLS llevan las mismas filas.
//
// Cada reporte solo arma sus datos (`DatosReporte`) y sus filtros (`useFiltros`).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { C, FONT, PAGE_PAD, SIZE, radius } from '@/components/suite/tokens';
import { Button, Page, FilterBar } from '@/components/suite/ui';
import { IcChevronDown } from '@/components/suite/icons';
import { Popover } from '@/components/configuracion/kit';
import { ChipsFiltros, ControlesFiltros, type Filtros } from './filtros';
import { Cabecera, FilaTotal, FilaVista, TablaConTotal, td } from './Tabla';
import { BotonExportarReporte, BotonImprimir, DocumentoReporte } from './Documento';
import { esDato, registrosDe, type DatosReporte } from './modelo';

export interface Contador { valor: ReactNode; label: string }

const POR_PAGINA = 50;
// ── Pantalla del reporte ────────────────────────────────────────────────────
export interface SelectorReportes { lista: readonly { id: string; label: string }[]; actual: string; onCambiar: (id: string) => void }

export function PantallaReporte({ titulo, reportes, filtros, controles, periodo, contadores = [], datos, vacio = 'No hay registros para mostrar.', archivo, antesDeTabla, tabs }: {
  titulo: string; reportes?: SelectorReportes; filtros: Filtros;
  /** Controles adicionales que no son filtros declarativos (p. ej. un selector de fecha propio). */
  controles?: ReactNode; periodo?: string; contadores?: Contador[]; datos: DatosReporte; vacio?: string; archivo: string;
  /** Contenido solo de pantalla encima de la tabla (avisos). */
  antesDeTabla?: ReactNode;
  tabs?: ReactNode;
}) {
  const [pagina, setPagina] = useState(1);
  const unico = datos.bloques.length === 1 ? datos.bloques[0] : null;
  const conAccion = datos.bloques.some(b => b.filas.some(f => esDato(f) && f.accion));
  const total = registrosDe(datos);
  // Al cambiar cualquier filtro se vuelve a la página 1
  useEffect(() => { setPagina(1); }, [filtros.version, titulo]); // eslint-disable-line react-hooks/set-state-in-effect -- volver a la página 1 al cambiar filtros o reporte
  const paginas = unico ? Math.max(1, Math.ceil(unico.filas.length / POR_PAGINA)) : 1;
  const pag = Math.min(pagina, paginas);
  const visibles = useMemo(() => {
    if (!unico) return [];
    const ini = (pag - 1) * POR_PAGINA;
    const xs = unico.filas.slice(ini, ini + POR_PAGINA);
    // Si la página empieza a mitad de un grupo, se repite su encabezado
    if (xs.length && xs[0].tipo !== 'grupo') {
      const g = [...unico.filas.slice(0, ini)].reverse().find(f => f.tipo === 'grupo');
      if (g && g.tipo === 'grupo') return [{ ...g, texto: `${g.texto} (cont.)` }, ...xs];
    }
    return xs;
  }, [unico, pag]);

  const doc = (enc: boolean, fil: boolean) => <DocumentoReporte titulo={titulo} periodo={periodo} linea={fil ? filtros.linea : null} encabezado={enc} datos={datos} />;
  const vacioFiltrado = total === 0 && filtros.hayActivos;
  return (
    <Page>
      <div style={{ height: SIZE.header, minHeight: SIZE.header, background: C.n000, borderBottom: `1px solid ${C.n500}`, padding: `0 ${PAGE_PAD}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0, fontFamily: FONT }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {reportes ? <TituloSelector titulo={titulo} r={reportes} /> : <h1 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: C.n900, whiteSpace: 'nowrap' }}>{titulo}</h1>}
          {periodo && <span style={{ fontSize: 12, color: C.n700, whiteSpace: 'nowrap' }}>{periodo}</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <BotonImprimir titulo={titulo} paginas={Math.max(1, Math.ceil((unico?.filas.length ?? total) / 32))} doc={doc} disabled={total === 0} />
          <BotonExportarReporte titulo={titulo} periodo={periodo} filtros={filtros} datos={datos} archivo={archivo} doc={doc} disabled={total === 0} />
        </div>
      </div>
      {tabs}
      <FilterBar><ControlesFiltros f={filtros} />{controles}</FilterBar>
      <ChipsFiltros f={filtros} />
      {contadores.length > 0 && (
        <div role="status" aria-label="Totales del reporte" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', padding: `10px ${PAGE_PAD}px`, borderBottom: `1px solid ${C.n500}`, background: C.n000, fontFamily: FONT, flexShrink: 0 }}>
          {contadores.map((x, i) => (
            <span key={x.label} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, padding: '0 22px', paddingLeft: i ? 22 : 0, borderLeft: i ? `1px solid ${C.n500}` : 'none', fontSize: 13, color: C.n700, whiteSpace: 'nowrap' }}>
              <b style={{ fontSize: 14, fontWeight: 600, color: C.n900, fontVariantNumeric: 'tabular-nums' }}>{x.valor}</b>{x.label}
            </span>
          ))}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: C.n000, fontFamily: FONT }}>
        {antesDeTabla && <div style={{ padding: `12px ${PAGE_PAD}px 0` }}>{antesDeTabla}</div>}
        {total === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40, textAlign: 'center' }}>
            <b style={{ fontSize: 15, fontWeight: 600, color: C.n900 }}>{vacioFiltrado ? 'No hay resultados con los filtros aplicados' : vacio}</b>
            {vacioFiltrado && <>
              <span style={{ fontSize: 13, color: C.n700 }}>Quita algún filtro o limpia todos para ver más registros.</span>
              <span style={{ marginTop: 8 }}><Button variant="secondary" onClick={filtros.limpiar}>Limpiar filtros</Button></span>
            </>}
          </div>
        ) : unico ? (
          <TablaConTotal b={unico} filas={visibles} conAccion={conAccion} />
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: `12px ${PAGE_PAD}px 24px`, ...(datos.bloques.every(b => b.columnas.length <= 3)
            ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '22px 32px', alignContent: 'start' } : { display: 'flex', flexDirection: 'column', gap: 22 }) }}>
            {datos.bloques.map((b, k) => (
              <section key={k} aria-label={b.titulo}>
                {b.titulo && <h3 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: C.n900 }}>{b.titulo}</h3>}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <Cabecera b={b} conAccion={conAccion} />
                    <tbody>
                      {!b.filas.length && <tr><td colSpan={b.columnas.length} style={{ ...td(), color: C.n700 }}>Sin registros.</td></tr>}
                      {b.filas.map((f, i) => <FilaVista key={i} f={f} columnas={b.columnas} conAccion={conAccion} />)}
                    </tbody>
                    <FilaTotal b={b} conAccion={conAccion} />
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
        {datos.nota && total > 0 && <p style={{ margin: 0, padding: `8px ${PAGE_PAD}px`, fontSize: 11.5, color: C.n700 }}>{datos.nota}</p>}
        {total > 0 && (
          <div className="no-print" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: `8px ${PAGE_PAD}px`, borderTop: `1px solid ${C.n500}` }}>
            <span style={{ fontSize: 12, color: C.n700 }}>{unico && paginas > 1 ? `Mostrando ${(pag - 1) * POR_PAGINA + 1}–${Math.min(pag * POR_PAGINA, unico.filas.length)} de ${unico.filas.length} filas` : `${total} registro${total === 1 ? '' : 's'}`}</span>
            {unico && paginas > 1 && <Paginador pagina={pag} total={paginas} onChange={setPagina} />}
          </div>
        )}
      </div>
    </Page>
  );
}

function TituloSelector({ titulo, r }: { titulo: string; r: SelectorReportes }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={`Reporte: ${titulo}. Cambiar reporte`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', padding: '4px 6px', margin: '0 -6px', borderRadius: radius.control, cursor: 'pointer', fontFamily: FONT }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: C.n900 }}>{titulo}</h1><IcChevronDown size={14} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} width={320}>
        <div role="listbox" aria-label="Reportes" style={{ padding: '6px 0' }}>
          <span style={{ display: 'block', fontSize: 11.5, color: C.n700, padding: '4px 14px 6px' }}>Reportes</span>
          {r.lista.map(x => {
            const on = x.id === r.actual;
            return <button key={x.id} type="button" role="option" aria-selected={on} onClick={() => { setOpen(false); r.onCambiar(x.id); }} className="suite-fila"
              style={{ display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '9px 14px', border: 'none', background: on ? C.n200 : 'none', fontSize: 12.5, fontFamily: FONT, color: on ? C.brand : C.n900, cursor: 'pointer' }}>
              {x.label}{on && <span aria-hidden>✓</span>}</button>;
          })}
        </div>
      </Popover>
    </span>
  );
}

export function Paginador({ pagina, total, onChange }: { pagina: number; total: number; onChange: (p: number) => void }) {
  const b = (label: string, p: number, txt: string) => (
    <button type="button" aria-label={label} disabled={p < 1 || p > total || p === pagina} onClick={() => onChange(p)}
      style={{ width: 30, height: 30, border: `1px solid ${C.n500}`, borderRadius: radius.control, background: C.n000, color: C.n900, cursor: 'pointer', fontSize: 13, opacity: p < 1 || p > total || p === pagina ? 0.4 : 1 }}>{txt}</button>
  );
  return (
    <nav aria-label="Paginación" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.n700 }}>
      {b('Primera página', 1, '«')}{b('Página anterior', pagina - 1, '‹')}
      <span style={{ margin: '0 4px' }}>Pág.</span>
      <input aria-label="Página" value={pagina} onChange={e => { const n = Number(e.target.value); if (n >= 1 && n <= total) onChange(n); }}
        style={{ width: 38, height: 30, textAlign: 'center', border: `1px solid ${C.n500}`, borderRadius: radius.control, fontSize: 12, fontFamily: FONT }} />
      <span style={{ margin: '0 4px' }}>de {total}</span>
      {b('Página siguiente', pagina + 1, '›')}{b('Última página', total, '»')}
    </nav>
  );
}
