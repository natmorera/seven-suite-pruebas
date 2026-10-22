'use client';
import { useState, type CSSProperties } from 'react';
import { C } from '@/components/ui/tokens';
import { type Cuenta, EMPRESA_PAIS, F, MODULOS, MOVIMIENTOS_INIT, type Movimiento, type RangoCuentas, TIPO_LIBRO_OPTIONS, TIPO_OPTIONS, type TipoLibro, agruparPorCuenta, agruparPorLibro, fmt2 } from './datos';

export function useAnalitico() {
  const [cuentaSel,  setCuentaSel]  = useState<Cuenta|null>(null);
  const [rangoSel,   setRangoSel]   = useState<RangoCuentas|null>(null);
  const [mostrarNum, setMostrarNum] = useState(false);
  const [searchQ,    setSearch]     = useState('');
  const [movimientos, setMovimientos] = useState<Movimiento[]>(MOVIMIENTOS_INIT);
  const [confirmDesmay, setConfirmDesmay] = useState<Movimiento|null>(null);
  const [detalleAsiento, setDetalleAsiento] = useState<Movimiento|null>(null);
  const [filtTipo,   setFiltTipo]   = useState<Set<string>>(new Set());
  const [filtOrigen, setFiltOrigen] = useState<Set<string>>(new Set());
  const [filtEstado, setFiltEstado] = useState<Set<string>>(new Set(['Contabilizado']));
  const [filtMoneda, setFiltMoneda] = useState<Set<string>>(new Set());
  const [filtMinimo, setFiltMin]    = useState(0);
  const [filtMaximo, setFiltMax]    = useState(0);
  const [filtFecha,  setFiltFecha]  = useState({ from:'', to:'' });
  const [filtUsuario,setFiltUsuario]= useState<Set<string>>(new Set());
  const [selected,   setSelected]   = useState<Set<number>>(new Set());
  const [confirmDesmayMasivo, setConfirmDesmayMasivo] = useState(false);
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exportarOpen, setExportarOpen] = useState(false);
  // «Ver como»: Diario general / resumen / por libro. Se elige acá y se ve en pantalla;
  // Exportar descarga lo que se está viendo.
  const [vista, setVista] = useState<TipoLibro>('general');

  const toggleSelected = (id: number) => {
    setSelected(p => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  // ── Determinar escenario ──────────────────────────────────────────────────
  // Escenario A: ninguna cuenta - mostrar todas
  // Escenario B: cuenta detalle - encabezado, saldo ini/fin, col ID auxiliar
  // Escenario C: cuenta auxiliar - igual que B pero SIN col ID auxiliar
  const esDetalle  = cuentaSel?.nivel === 'detalle';
  const esAuxiliar = cuentaSel?.nivel === 'auxiliar';
  const tieneCuenta = esDetalle || esAuxiliar;
  // Escenario D: rango de cuentas - varias cuentas de un mismo nivel, se comportan como "todas" pero acotadas
  const tieneRango = !!rangoSel;
  // Vista global (todas las cuentas, sin filtrar a una cuenta o rango puntual) es la
  // única donde tiene sentido consolidar por cuenta o por libro; con una cuenta
  // específica seleccionada siempre se ve el detalle.
  const vistaGlobal = !tieneCuenta && !tieneRango;
  const vistaActiva: TipoLibro = vistaGlobal ? vista : 'general';
  const tipoLibroOpciones = TIPO_LIBRO_OPTIONS.filter(o => !o.soloPais || o.soloPais === EMPRESA_PAIS);

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const movsFiltrados = movimientos.filter(m => {
    // 9. Por defecto solo Contabilizados; si usuario activa Pendiente en filtro Estado se incluyen
    // 10. Anulados nunca se muestran
    if (m.estado === 'Anulado') return false;
    // Si no hay filtro de estado activo → solo Contabilizados
    if (filtEstado.size === 0 && m.estado !== 'Contabilizado') return false;
    // Si hay filtro de estado → respetar selección (excepto Anulados)
    if (filtEstado.size > 0 && !filtEstado.has(m.estado)) return false;

    if (tieneCuenta && m.cuentaCode !== cuentaSel!.code) return false;
    if (tieneRango && !(m.cuentaCode >= rangoSel!.desde.code && m.cuentaCode <= rangoSel!.hasta.code)) return false;
    // una sola barra de búsqueda cubre descripción, N° asiento, ID auxiliar y documento
    if (searchQ) {
      const q = searchQ.toLowerCase();
      const matches = m.descripcion.toLowerCase().includes(q)
        || m.documento.toLowerCase().includes(q)
        || m.idAuxiliar.toLowerCase().includes(q)
        || m.consecutivo.includes(searchQ);
      if (!matches) return false;
    }
    if (filtTipo.size   > 0 && !filtTipo.has(m.tipo))     return false;
    if (filtOrigen.size > 0 && !filtOrigen.has(m.modulo)) return false;
    if (filtMoneda.size > 0 && !filtMoneda.has(m.moneda)) return false;
    if (filtFecha.from && m.fecha < filtFecha.from) return false;
    if (filtFecha.to   && m.fecha > filtFecha.to)   return false;
    // Rango importe
    const total = m.debe + m.haber;
    if (filtMinimo > 0  && total < filtMinimo)  return false;
    if (filtMaximo > 0  && total > filtMaximo)  return false;
    return true;
  });

  // paginación - se deriva de movsFiltrados/pageSize, sin necesidad de un efecto;
  // paginaActual siempre queda acotada al rango válido aunque los filtros reduzcan el total.
  const totalPaginas = Math.max(1, Math.ceil(movsFiltrados.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const movsPagina   = movsFiltrados.slice((paginaActual-1)*pageSize, paginaActual*pageSize);

  // selección masiva - solo filas Contabilizado pueden descontabilizarse en bloque
  const selectableIds = movsFiltrados.filter(m=>m.estado==='Contabilizado').map(m=>m.id);
  const allSelected    = selectableIds.length > 0 && selectableIds.every(id=>selected.has(id));
  const selectedCount  = selectableIds.filter(id=>selected.has(id)).length;
  const toggleSelectAll = () => {
    setSelected(p => {
      const n = new Set(p);
      if (allSelected) { selectableIds.forEach(id=>n.delete(id)); }
      else { selectableIds.forEach(id=>n.add(id)); }
      return n;
    });
  };

  const totalDebe    = movsFiltrados.reduce((s,m)=>s+m.debe,  0);
  const totalHaber   = movsFiltrados.reduce((s,m)=>s+m.haber, 0);
  const saldoInicial = cuentaSel?.saldoInicial ?? 0;
  const saldoFinal   = saldoInicial + totalDebe - totalHaber;
  const sym          = cuentaSel?.moneda === 'USD' ? '$' : '₡';

  // Filas consolidadas para la vista "Ver como" activa (null = detalle normal)
  const filasResumenVista = vistaActiva === 'resumen' ? agruparPorCuenta(movsFiltrados)
    : vistaActiva === 'porLibro' ? agruparPorLibro(movsFiltrados)
    : null;

  // ── Columnas según escenario ──────────────────────────────────────────────
  // Escenario A (todas): Tipo | Fecha | N°Asiento | Descripción | Estado | [Cuenta si mostrarNum] | Módulo | Doc | Debe | Haber | Acciones
  // Escenario B (detalle): Tipo | Fecha | N°Asiento | Descripción | Estado | ID Auxiliar | Módulo | Doc | Debe | Haber | Acciones
  // Escenario C (auxiliar): Tipo | Fecha | N°Asiento | Descripción | Estado | Módulo | Doc | Debe | Haber | Acciones

  // Columna "Cuenta" se muestra en escenario A cuando mostrarNum=true, y siempre en un rango (varias cuentas a la vez)
  const mostrarColCuenta = tieneRango || (!tieneCuenta && mostrarNum);
  // Columna "ID Auxiliar" se muestra en Todas las cuentas y en cuenta detalle; se omite solo si la cuenta seleccionada ya es auxiliar
  const mostrarColAux    = !esAuxiliar;

  const thStyle: CSSProperties = { padding:'10px 12px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap', fontFamily:F };
  const thR:     CSSProperties = { ...thStyle, textAlign:'right' };

  // colspan para SaldoRow (todo menos última col de haber y acciones)
  const colspanSaldo = 3 + (mostrarColCuenta?1:0) + (mostrarColAux?1:0) + 1 + 1; // base cols antes de debe

  // resumen de filtros aplicados, para el modal de exportar
  const resumenFiltros: string[] = [];
  if (filtTipo.size)    resumenFiltros.push(`Tipo: ${[...filtTipo].map(v=>TIPO_OPTIONS.find(t=>t.value===v)?.label ?? v).join(', ')}`);
  if (filtOrigen.size)  resumenFiltros.push(`Módulo: ${[...filtOrigen].map(v=>MODULOS.find(m=>m.value===v)?.label ?? v).join(', ')}`);
  if (filtEstado.size)  resumenFiltros.push(`Estado: ${[...filtEstado].join(', ')}`);
  if (filtMoneda.size)  resumenFiltros.push(`Moneda: ${[...filtMoneda].join(', ')}`);
  if (filtUsuario.size) resumenFiltros.push(`Usuario: ${[...filtUsuario].join(', ')}`);
  if (filtFecha.from || filtFecha.to) resumenFiltros.push(`Fecha: ${filtFecha.from?filtFecha.from.split('-').reverse().join('/'):'…'} - ${filtFecha.to?filtFecha.to.split('-').reverse().join('/'):'…'}`);
  if (filtMinimo>0 || filtMaximo>0) resumenFiltros.push(`Importe: ${filtMinimo>0?fmt2(filtMinimo):'0'} – ${filtMaximo>0?fmt2(filtMaximo):'∞'}`);
  if (searchQ)  resumenFiltros.push(`Búsqueda: ${searchQ}`);
  if (cuentaSel) resumenFiltros.push(`Cuenta: ${cuentaSel.code}`);
  if (rangoSel)  resumenFiltros.push(`Rango: ${rangoSel.desde.code} – ${rangoSel.hasta.code}`);
  return { cuentaSel, setCuentaSel, rangoSel, setRangoSel, mostrarNum, setMostrarNum, searchQ, setSearch, movimientos, setMovimientos, confirmDesmay, setConfirmDesmay, detalleAsiento, setDetalleAsiento, filtTipo, setFiltTipo, filtOrigen, setFiltOrigen, filtEstado, setFiltEstado, filtMoneda, setFiltMoneda, filtMinimo, setFiltMin, filtMaximo, setFiltMax, filtFecha, setFiltFecha, filtUsuario, setFiltUsuario, selected, setSelected, confirmDesmayMasivo, setConfirmDesmayMasivo, page, setPage, pageSize, setPageSize, exportarOpen, setExportarOpen, vista, setVista, toggleSelected, esDetalle, esAuxiliar, tieneCuenta, tieneRango, vistaGlobal, vistaActiva, tipoLibroOpciones, movsFiltrados, totalPaginas, paginaActual, movsPagina, selectableIds, allSelected, selectedCount, toggleSelectAll, totalDebe, totalHaber, saldoInicial, saldoFinal, sym, filasResumenVista, mostrarColCuenta, mostrarColAux, thStyle, thR, colspanSaldo, resumenFiltros };
}

export type EstadoAnalitico = ReturnType<typeof useAnalitico>;
