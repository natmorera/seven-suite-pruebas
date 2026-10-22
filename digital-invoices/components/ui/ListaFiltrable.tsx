'use client';
// Barra de filtros estándar (los mismos controles que el Analítico de cuentas
// y los reportes):
//   - Orden fijo: búsqueda, fecha, listas (dropdown), casillas (checkbox).
//   - Fecha: DateRangeFilter (atajos + rango personalizado, con «Aplicar»).
//   - Listas: FilterDropdown (Seleccionar todos / Limpiar / Aplicar; buscador
//     propio con más de 10 opciones). La búsqueda espera 300 ms y no
//     distingue mayúsculas ni tildes.
//   - Un dato binario que limita registros es una casilla («Solo activos»).
//   - «× Limpiar» en la misma barra cuando hay algún filtro.
//   - Al cambiar un filtro se vuelve a la página 1.
//   - Todo queda en la URL (se puede recargar o compartir la vista filtrada).
// Necesita estar dentro de <Suspense> (usa useSearchParams).
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { C, FONT, Checkbox, EmptyState, Button, FilterBar, FilterDropdown, Pagination, PaginacionPie, SearchInput, radius } from './primitives';
import DateRangeFilter from './DateRangeFilter';

export type DefFiltro<T> =
  | { tipo: 'lista'; clave: string; label: string; opciones: { value: string; label: string }[]; valor: (t: T) => string }
  // check: marcado limita a los que cumplen. Con `oculta`, al revés: sin marcar se ocultan
  // los que cumplen (p. ej. borradores) y al marcarla se muestran también.
  | { tipo: 'check'; clave: string; label: string; cumple: (t: T) => boolean; oculta?: boolean }
  // Fecha: el selector estándar de período (DateRangeFilter)
  | { tipo: 'fecha'; clave: string; label: string; valor: (t: T) => string };

// ── Fechas ──────────────────────────────────────────────────────────────────
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ATAJOS: { id: string; label: string }[] = [
  { id: 'hoy', label: 'Hoy' }, { id: 'semana', label: 'Esta semana' }, { id: 'mes', label: 'Este mes' },
  { id: 'mesant', label: 'Mes anterior' }, { id: 'anio', label: 'Este año' },
];
// Rango [desde, hasta] (YYYY-MM-DD) de un valor de la URL: atajo o «desde~hasta»
export function rangoFecha(v: string): [string, string] | null {
  if (!v) return null;
  const hoy = new Date();
  if (v === 'hoy') return [iso(hoy), iso(hoy)];
  if (v === 'semana') { const d = new Date(hoy); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [iso(d), iso(hoy)]; }
  if (v === 'mes') return [iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), iso(hoy)];
  if (v === 'mesant') return [iso(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)), iso(new Date(hoy.getFullYear(), hoy.getMonth(), 0))];
  if (v === 'anio') return [iso(new Date(hoy.getFullYear(), 0, 1)), iso(hoy)];
  const [a, b] = v.split('~');
  return [a || '0000-00-00', b || '9999-99-99'];
}
const fmtCorta = (d: string) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day: '2-digit', month: 'short' }).replace('.', '') : '…';
export function textoFecha(v: string): string {
  const a = ATAJOS.find(x => x.id === v);
  if (a) return a.label;
  const [d, h] = v.split('~');
  return `${fmtCorta(d)} a ${fmtCorta(h)}`;
}

// Mismo selector de fecha que el Analítico de cuentas y los reportes
// (atajos + rango personalizado con «Aplicar»). En la URL queda «desde~hasta».
function FiltroFecha({ label, valor, onCambiar }: { label: string; valor: string; onCambiar: (v: string) => void }) {
  const r = rangoFecha(valor);
  const value = r ? { from: r[0].startsWith('0000') ? '' : r[0], to: r[1].startsWith('9999') ? '' : r[1] } : { from: '', to: '' };
  return <DateRangeFilter label={label} value={value} onChange={v => onCambiar(v.from || v.to ? `${v.from}~${v.to}` : '')} onClear={() => onCambiar('')} />;
}

export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Mismo desplegable de opciones que el Analítico de cuentas (FilterDropdown).
function FiltroLista({ label, opciones, seleccion, onCambiar }: {
  label: string; opciones: { value: string; label: string }[]; seleccion: Set<string>; onCambiar: (s: Set<string>) => void;
}) {
  return <FilterDropdown label={label} options={opciones} selected={seleccion} onApply={onCambiar} onClear={() => onCambiar(new Set())} />;
}

export function useListaFiltrable<T>({ items, texto, placeholder, defs, derecha, tamanoInicial = 25, prefijo = '', unaFila = false, anchoBusqueda = 240 }: {
  items: T[];
  prefijo?: string;                     // para que dos listas de la misma pantalla no compartan la URL
  texto: (t: T) => string;              // en qué se busca
  placeholder: string;
  defs: DefFiltro<T>[];
  derecha?: ReactNode;                  // acciones propias de la sección en la barra
  tamanoInicial?: number;
  unaFila?: boolean;                    // todos los filtros en una sola fila
  anchoBusqueda?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const K = (k: string) => prefijo + k;
  const cambiarUrl = (mut: (p: URLSearchParams) => void, reiniciarPagina = true) => {
    const p = new URLSearchParams(params.toString());
    mut(p);
    if (reiniciarPagina) p.delete(K('p'));
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Búsqueda: se escribe al instante y se aplica a los 300 ms.
  const qUrl = params.get(K('q')) ?? '';
  const [q, setQ] = useState(qUrl);
  const [qBase, setQBase] = useState(qUrl);
  if (qUrl !== qBase) { setQBase(qUrl); setQ(qUrl); }   // la URL cambió desde afuera (Limpiar todo, atrás)
  useEffect(() => {
    if (q === qUrl) return;
    const t = setTimeout(() => cambiarUrl(p => { if (q.trim()) p.set(K('q'), q); else p.delete(K('q')); }), 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const seleccion = (clave: string) => new Set((params.get(K('f_' + clave)) ?? '').split(',').filter(Boolean));
  const fechaSel = (clave: string) => params.get(K('d_' + clave)) ?? '';
  const marcado = (clave: string) => params.get(K('c_' + clave)) === '1';
  const pagina = Math.max(1, Number(params.get(K('p'))) || 1);
  const tamano = Number(params.get(K('n'))) || tamanoInicial;

  const filtrados = useMemo(() => {
    const t = normalizar(qUrl.trim());
    return items.filter(it => {
      if (t && !normalizar(texto(it)).includes(t)) return false;
      for (const d of defs) {
        if (d.tipo === 'lista') { const s = seleccion(d.clave); if (s.size && !s.has(d.valor(it))) return false; }
        else if (d.tipo === 'fecha') { const r = rangoFecha(fechaSel(d.clave)); if (r) { const f = (d.valor(it) ?? '').slice(0, 10); if (f < r[0] || f > r[1]) return false; } }
        else if (d.oculta ? !marcado(d.clave) && d.cumple(it) : marcado(d.clave) && !d.cumple(it)) return false;
      }
      return true;
    });
  }, [items, params, texto, defs]); // eslint-disable-line react-hooks/exhaustive-deps

  const hayFiltros = Boolean(qUrl) || defs.some(d => d.tipo === 'lista' ? seleccion(d.clave).size > 0 : d.tipo === 'fecha' ? Boolean(fechaSel(d.clave)) : marcado(d.clave));
  const ponerFecha = (clave: string, v: string) => cambiarUrl(p => { if (v) p.set(K('d_' + clave), v); else p.delete(K('d_' + clave)); });
  const limpiar = () => { setQ(''); cambiarUrl(p => { p.delete(K('q')); defs.forEach(d => { p.delete(K('f_' + d.clave)); p.delete(K('c_' + d.clave)); p.delete(K('d_' + d.clave)); }); }); };

  const barra = (
    <FilterBar right={derecha} unaFila={unaFila}>
      <SearchInput value={q} onChange={setQ} placeholder={placeholder} width={anchoBusqueda} />
      {defs.map(d => d.tipo === 'fecha' && <FiltroFecha key={d.clave} label={d.label} valor={fechaSel(d.clave)} onCambiar={v => ponerFecha(d.clave, v)} />)}
      {defs.filter(d => d.tipo === 'lista').map(d => d.tipo === 'lista' && (
        <FiltroLista key={d.clave} label={d.label} opciones={d.opciones} seleccion={seleccion(d.clave)}
          onCambiar={s => cambiarUrl(p => { if (s.size) p.set(K('f_' + d.clave), [...s].join(',')); else p.delete(K('f_' + d.clave)); })} />
      ))}
      {defs.filter(d => d.tipo === 'check').map(d => (
        <Checkbox key={d.clave} checked={marcado(d.clave)} label={d.label}
          onChange={v => cambiarUrl(p => { if (v) p.set(K('c_' + d.clave), '1'); else p.delete(K('c_' + d.clave)); })} />
      ))}
      {hayFiltros && (
        <button onClick={limpiar}
          style={{ height: 28, padding: '0 10px', border: 'none', background: C.errorBg, color: C.error, borderRadius: radius.sm, cursor: 'pointer', fontSize: 11, fontFamily: FONT }}>
          × Limpiar
        </button>
      )}
    </FilterBar>
  );

  // Como en el Analítico: sin fila de chips; «× Limpiar» queda en la misma barra.
  const chips = null;

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / tamano));
  const actual = Math.min(pagina, totalPaginas);
  const filasPagina = filtrados.slice((actual - 1) * tamano, actual * tamano);
  const paginacion = (
    <PaginacionPie>
      <Pagination page={actual} pageSize={tamano} total={filtrados.length} pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={n => cambiarUrl(p => { if (n > 1) p.set(K('p'), String(n)); else p.delete(K('p')); }, false)}
        onPageSizeChange={n => cambiarUrl(p => { p.set(K('n'), String(n)); })} />
    </PaginacionPie>
  );

  // Estado vacío: sin datos, o sin resultados por los filtros.
  const vacio = (sinDatos: string) => items.length === 0
    ? <EmptyState message={sinDatos} />
    : (
      <div style={{ textAlign: 'center', padding: '36px 0 20px', fontFamily: FONT }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.n900 }}>No hay resultados con los filtros aplicados</div>
        <div style={{ fontSize: 12, color: C.n700, margin: '6px 0 12px' }}>Quita algún filtro o límpialos todos para ver más registros.</div>
        <Button variant="secondary" onClick={limpiar}>Limpiar filtros</Button>
      </div>
    );

  // Para fijar un filtro desde afuera (p. ej. un aviso con «Ver solo esas»)
  const ponerLista = (clave: string, valores: string[]) => cambiarUrl(p => { if (valores.length) p.set(K('f_' + clave), valores.join(',')); else p.delete(K('f_' + clave)); });
  return { barra, chips, filtrados, filasPagina, paginacion, vacio, hayFiltros, limpiar, seleccion, ponerLista };
}
