'use client';
// Usuarios › Bitácora de seguridad: reporte de los eventos de todos los módulos, con el patrón de reportes de la suite:
// Imprimir y Exportar en el header, una barra de filtros (se aplican al instante), los filtros aplicados como chips,
// contadores, la tabla y la paginación. En el celular se ve el documento (como el PDF) en lugar de la tabla.
// Con `usuario` muestra solo los eventos de ese usuario (sin el filtro ni la columna Usuario).
import { useMemo, useState } from 'react';
import { AccionesEnHeader, BajoFiltros, FiltrosEnBarra } from '@/components/layout/Pantalla';
import { useCelular } from '@/components/layout/SoloEscritorio';
import { C } from '@/components/suite/tokens';
import {
  Buscador, BotonImprimir, Celda, Contadores, Fila, FilaVacia, FiltroFechas, FiltroMulti, FiltrosAplicados, Paginacion, SinResultados, Tabla, VistaDocumento,
  enRango, norm, textoRango, usePaginado, type ChipFiltro, type Rango,
} from '@/components/kit';
import { BotonExportar, HojaReporte, TablaImpresa, exportarCSV, usePrint } from '@/components/kit/exportar';
import { fmtFH, hoy } from '@/components/kit/fechas';
import { useDato } from '../../store';
import { siglaModulo } from '../../catalogo';
import { ChipModulo, opcionesModulos } from '../../piezas';
import type { EventoBitacora, ModuloId } from '../../tipos';

const unicos = <T extends string>(xs: T[]) => [...new Set(xs)].sort();
const opciones = (xs: string[]) => xs.map(x => ({ value: x, label: x }));
type Campo = 'usuario' | 'modulo' | 'aplicacion' | 'base';
const NOMBRES: Record<Campo, string> = { usuario: 'Usuario', modulo: 'Módulo', aplicacion: 'Aplicación', base: 'Base de datos' };
const SIN_FILTROS: Record<Campo, string[]> = { usuario: [], modulo: [], aplicacion: [], base: [] };
const hoyRango = (): Rango => ({ desde: hoy(), hasta: hoy() });

export default function Bitacora({ usuario }: { usuario?: string }) {
  const [todos] = useDato('bitacora');
  const [impresoras] = useDato('impresoras');
  const eventos = useMemo(() => (usuario ? todos.filter(e => e.usuario === usuario) : todos), [todos, usuario]);
  const celular = useCelular();
  // Por defecto, los eventos de hoy.
  const [rango, setRango] = useState<Rango>(hoyRango);
  const [f, setF] = useState(SIN_FILTROS);
  const [q, setQ] = useState('');
  const { imprimir, portal } = usePrint();

  const filtrados = useMemo(() => eventos.filter(e => enRango(e.fecha.slice(0, 10), rango)
    && (Object.keys(f) as Campo[]).every(k => !f[k].length || f[k].includes(e[k]))
    && (!q || norm(`${e.detalle} ${e.usuario} ${e.ip} ${e.opcion}`).includes(norm(q)))).sort((a, b) => b.fecha.localeCompare(a.fecha)), [eventos, rango, f, q]);
  const pag = usePaginado(filtrados, 10);
  const { setPagina, visibles } = pag;
  // Al cambiar cualquier filtro se vuelve a la página 1.
  const cambiar = (k: Campo) => (v: string[]) => { setF({ ...f, [k]: v }); setPagina(1); };
  const limpiar = () => { setF(SIN_FILTROS); setRango(hoyRango()); setQ(''); setPagina(1); };
  const deHoy = rango.desde === hoy() && rango.hasta === hoy();
  const etiqueta = (k: Campo, v: string) => (k === 'modulo' ? siglaModulo(v as ModuloId) : v);
  const chips: ChipFiltro[] = [
    ...(q ? [{ id: 'q', label: `Búsqueda: ${q}`, quitar: () => setQ('') }] : []),
    ...(!deHoy ? [{ id: 'fechas', label: `Fechas: ${textoRango(rango) || 'Todas'}`, quitar: () => setRango(hoyRango()) }] : []),
    ...(Object.keys(f) as Campo[]).flatMap(k => f[k].map(v => ({ id: `${k}-${v}`, label: `${NOMBRES[k]}: ${etiqueta(k, v)}`, quitar: () => cambiar(k)(f[k].filter(x => x !== v)) }))),
  ];

  const titulo = usuario ? `Bitácora de seguridad de ${usuario}` : 'Bitácora de seguridad';
  const cab = ['Fecha', ...(usuario ? [] : ['Usuario']), 'Módulo', 'Aplicación', 'Opción', 'Base de datos', 'Detalle', 'IP'];
  const filas = filtrados.map(e => [fmtFH(e.fecha), ...(usuario ? [] : [e.usuario]), siglaModulo(e.modulo), e.aplicacion, e.opcion, e.base, e.detalle, e.ip]);
  const criterio = [textoRango(rango) || 'Todas las fechas', ...chips.filter(c => c.id !== 'fechas').map(c => c.label)].join(' · ');
  const hoja = (o: { encabezado: boolean; filtros: boolean; carta?: boolean }) => (
    <HojaReporte titulo={titulo} filtros={o.filtros ? criterio : undefined} encabezado={o.encabezado} carta={o.carta}><TablaImpresa headers={cab} filas={filas} /></HojaReporte>
  );
  const columnas = ['Fecha', ...(usuario ? [] : ['Usuario']), 'Módulo', 'Aplicación y opción', 'Base de datos', 'Detalle', 'IP'];
  const contar = (k: keyof EventoBitacora) => new Set(filtrados.map(e => e[k])).size;

  return (
    <>
      <AccionesEnHeader>
        <BotonImprimir titulo={titulo} paginas={Math.max(1, Math.ceil(filtrados.length / 30))} disabled={!filtrados.length}
          impresoras={impresoras.filter(i => i.activa).map(i => i.nombre)} onImprimir={o => imprimir(hoja(o))} />
        <BotonExportar disabled={!filtrados.length} titulo={titulo} criterio={criterio}
          onCSV={() => exportarCSV(usuario ? `bitacora-de-seguridad-${usuario}` : 'bitacora-de-seguridad', cab, filas)}
          onPDF={o => imprimir(hoja(o))} />
      </AccionesEnHeader>
      <FiltrosEnBarra>
        <Buscador value={q} onChange={v => { setQ(v); setPagina(1); }} placeholder={usuario ? 'Buscar por detalle, opción o IP' : 'Buscar por detalle, usuario, opción o IP'} width={260} />
        <FiltroFechas value={rango} onChange={r => { setRango(r); setPagina(1); }} />
        {!usuario && <FiltroMulti etiqueta="Usuario" value={f.usuario} onChange={cambiar('usuario')} opciones={opciones(unicos(eventos.map(e => e.usuario)))} />}
        <FiltroMulti etiqueta="Módulo" value={f.modulo} onChange={cambiar('modulo')} opciones={opcionesModulos(unicos(eventos.map(e => e.modulo)) as ModuloId[])} />
        <FiltroMulti etiqueta="Aplicación" value={f.aplicacion} onChange={cambiar('aplicacion')} opciones={opciones(unicos(eventos.map(e => e.aplicacion)))} />
        <FiltroMulti etiqueta="Base de datos" value={f.base} onChange={cambiar('base')} opciones={opciones(unicos(eventos.map(e => e.base)))} />
      </FiltrosEnBarra>
      <BajoFiltros>
        <FiltrosAplicados chips={chips} onLimpiar={limpiar} />
        <Contadores items={[[filtrados.length, 'Eventos'], ...(usuario ? [] : [[contar('usuario'), 'Usuarios'] as [number, string]]), [contar('modulo'), 'Módulos'], [contar('base'), 'Bases de datos']]} />
      </BajoFiltros>
      {celular ? (
        filtrados.length ? <VistaDocumento>{hoja({ encabezado: true, filtros: true })}</VistaDocumento>
          : <Tabla headers={['Eventos']}><SinResultados cols={1} onLimpiar={chips.length ? limpiar : undefined} /></Tabla>
      ) : (
        <>
          <Tabla headers={columnas} anchos={{ 0: 120, [columnas.length - 1]: 80 }}>
            {visibles.length === 0 && (chips.length ? <SinResultados cols={columnas.length} onLimpiar={limpiar} /> : <FilaVacia cols={columnas.length} texto="No hay eventos hoy." />)}
            {visibles.map(e => (
              <Fila key={e.id}>
                <Celda muted style={{ whiteSpace: 'nowrap' }}>{fmtFH(e.fecha)}</Celda>
                {!usuario && <Celda>{e.usuario}</Celda>}
                <Celda><ChipModulo m={e.modulo} /></Celda>
                <Celda>{e.aplicacion}<span style={{ display: 'block', fontSize: 11.5, color: C.n700 }}>{e.opcion}</span></Celda>
                <Celda muted>{e.base}</Celda>
                <Celda style={{ whiteSpace: 'normal' }}>{e.detalle}</Celda>
                <Celda muted>{e.ip}</Celda>
              </Fila>
            ))}
          </Tabla>
          <Paginacion pag={pag} />
        </>
      )}
      {portal}
    </>
  );
}
