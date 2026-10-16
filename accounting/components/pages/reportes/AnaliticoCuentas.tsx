'use client';
import React, { useState } from 'react';
import { PageHeader } from '../../ui/primitives';
import { C, PERMISOS_ACTUAL, radius, shadow, TABLA } from '../../ui/tokens';
import { Pagination } from '../../ui/tabla';
import { SearchInput, FilterDropdown } from '../../ui/filtros';
import { Monto } from '../../ui/montos';
import DetalleDrawer from '../asientos/DetalleDrawer';
import ModalDescontabilizar from '../asientos/DescontabilizarModal';
import { CuentaFiltroUnico } from './analiticoCuentas/CuentaFiltroUnico';
import { ModalExportarAnalitico } from './analiticoCuentas/ModalExportarAnalitico';
import { BRAND, type Cuenta, EMPRESA_PAIS, type EstadoMov, F, MODULOS, MOVIMIENTOS_INIT, type Movimiento, type RangoCuentas, TIPO_LIBRO_OPTIONS, TIPO_OPTIONS, type TipoLibro, agruparPorCuenta, agruparPorLibro, fmt2 } from './analiticoCuentas/datos';
import { ActionIcons, DateRangeFilter, EstadoBadge, IcPrint, RangoImporteFilter, SaldoRow, TipoPill, TotalizadoRow } from './analiticoCuentas/piezas';

export default function AnaliticoCuentas() {
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
  // "Ver como": Diario general / resumen / por libro - antes solo existía escondido
  // dentro del modal de Exportar; ahora se elige acá y se ve en pantalla, y Exportar
  // simplemente descarga lo que ya está viendo.
  const [vista, setVista] = useState<TipoLibro>('general');

  const toggleSelected = (id: number) => {
    setSelected(p => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
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
    // Issue #5: una sola barra de búsqueda cubre descripción, N° asiento, ID auxiliar y documento
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

  // Issue #15: paginación - se deriva de movsFiltrados/pageSize, sin necesidad de un efecto;
  // paginaActual siempre queda acotada al rango válido aunque los filtros reduzcan el total.
  const totalPaginas = Math.max(1, Math.ceil(movsFiltrados.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const movsPagina   = movsFiltrados.slice((paginaActual-1)*pageSize, paginaActual*pageSize);

  // Issue #12: selección masiva - solo filas Contabilizado pueden descontabilizarse en bloque
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

  const thStyle: React.CSSProperties = { padding:'10px 12px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap', fontFamily:F };
  const thR:     React.CSSProperties = { ...thStyle, textAlign:'right' };

  // colspan para SaldoRow (todo menos última col de haber y acciones)
  const colspanSaldo = 3 + (mostrarColCuenta?1:0) + (mostrarColAux?1:0) + 1 + 1; // base cols antes de debe

  // Issue #18: resumen de filtros aplicados, para el modal de exportar
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

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>

      {/* Header */}
      <PageHeader title="Analítico de cuentas" left={
        <>
          <CuentaFiltroUnico cuenta={cuentaSel} rango={rangoSel}
            onSelectCuenta={c=>{ setCuentaSel(c); setRangoSel(null); }}
            onSelectRango={r=>{ setRangoSel(r); setCuentaSel(null); }}
            onClear={()=>{ setCuentaSel(null); setRangoSel(null); }}/>
          {/* Issue: "Ver como" (Diario general / Resumen / Por libro) solo aplica
              cuando se ven todas las cuentas - antes vivía perdido al final de
              la barra de filtros; ahora va junto al selector de cuenta, que es
              lo que realmente determina si aplica o no. */}
          {vistaGlobal && (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:11.5, color:C.n700, fontFamily:F, whiteSpace:'nowrap' }}>Ver como:</span>
              {tipoLibroOpciones.map(o=>(
                <button key={o.value} title={o.desc} onClick={()=>setVista(o.value)}
                  style={{ height:28, padding:'0 10px', borderRadius:radius.sm, cursor:'pointer', fontSize:11.5, fontFamily:F, whiteSpace:'nowrap',
                    border:`1px solid ${vista===o.value?BRAND:C.n500}`, background:vista===o.value?C.brandBg:'#FFFFFF',
                    color:vista===o.value?BRAND:C.n700, fontWeight:vista===o.value?600:400 }}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
          {!tieneCuenta && !tieneRango && (
            <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, color:C.n700, fontFamily:F }}>
              <input type="checkbox" checked={mostrarNum} onChange={e=>setMostrarNum(e.target.checked)}
                style={{ width:14, height:14, accentColor:BRAND }}/>
              Mostrar número de cuenta
            </label>
          )}
        </>
      }>
        <button onClick={()=>setExportarOpen(true)} style={{ height:32, padding:'0 13px', border:`1px solid ${C.n500}`, borderRadius:radius.md,
          background:'#FFFFFF', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:6,
          color:C.n700, fontFamily:F }}>
          <IcPrint/> Exportar
        </button>
      </PageHeader>

      {/* Filtros */}
      <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px',
        display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
        <SearchInput value={searchQ} onChange={setSearch} placeholder="Buscar por descripción, N° asiento, ID auxiliar o documento…" width={300} />
        <DateRangeFilter label="Fecha" value={filtFecha} onChange={setFiltFecha} onClear={()=>setFiltFecha({from:'',to:''})}/>
        <FilterDropdown label="Tipo de asiento" options={TIPO_OPTIONS.map(t=>({ value:t.value, label:t.label, icon:<TipoPill tipo={t.value}/> }))} selected={filtTipo}   onApply={setFiltTipo}   onClear={()=>setFiltTipo(new Set())}/>
        <FilterDropdown label="Módulo"  options={MODULOS}                                   selected={filtOrigen} onApply={setFiltOrigen} onClear={()=>setFiltOrigen(new Set())}/>
        <RangoImporteFilter minimo={filtMinimo} maximo={filtMaximo} onApply={(mn,mx)=>{ setFiltMin(mn); setFiltMax(mx); }} onClear={()=>{ setFiltMin(0); setFiltMax(0); }}/>
        <FilterDropdown label="Estado"  options={['Contabilizado','Pendiente']}                selected={filtEstado} onApply={setFiltEstado} onClear={()=>setFiltEstado(new Set())}/>
        <FilterDropdown label="Moneda"  options={['CRC','USD']}                             selected={filtMoneda} onApply={setFiltMoneda} onClear={()=>setFiltMoneda(new Set())}/>
        <FilterDropdown label="Usuario" options={['jperez','sblandon','yader','glopez']}   selected={filtUsuario} onApply={setFiltUsuario} onClear={()=>setFiltUsuario(new Set())}/>
        {(filtTipo.size+filtOrigen.size+filtEstado.size+filtMoneda.size+(filtFecha.from?1:0)+filtUsuario.size+(searchQ?1:0)+(cuentaSel?1:0)+(rangoSel?1:0))>0 && (
          <button onClick={()=>{ setFiltTipo(new Set()); setFiltOrigen(new Set()); setFiltEstado(new Set()); setFiltMoneda(new Set()); setFiltFecha({from:'',to:''}); setFiltMin(0); setFiltMax(0); setFiltUsuario(new Set()); setSearch(''); setCuentaSel(null); setRangoSel(null); }}
            style={{ height:28, padding:'0 10px', border:'none', background:C.errorBg, color:C.error, borderRadius:radius.sm, cursor:'pointer', fontSize:11, fontFamily:F }}>
            × Limpiar
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', background:'#FFFFFF' }}>

        {/* Encabezado de cuenta - solo cuando hay cuenta seleccionada */}
        {tieneCuenta && cuentaSel && (
          <div style={{ padding:'12px 24px', borderBottom:`1px solid ${C.n500}`,
            background:C.brandBg, display:'flex', gap:32, alignItems:'flex-start', flexShrink:0 }}>
            <div>
              <p style={{ fontSize:10, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 2px', fontFamily:F }}>CUENTA</p>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:13, fontWeight:700, color:BRAND, fontFamily:F }}>{cuentaSel.code}</span>
                {cuentaSel.banco && <span style={{ fontSize:12, color:'#0F0F0F', fontFamily:F }}>{cuentaSel.banco}</span>}
                <span style={{ fontSize:10, padding:'1px 7px', borderRadius:radius.lg, background:esAuxiliar?'rgba(91,33,182,.1)':C.n200,
                  color:esAuxiliar?'#5B21B6':C.n700, fontFamily:F, fontWeight:500 }}>
                  {esAuxiliar ? 'Auxiliar' : 'Detalle'}
                </span>
              </div>
            </div>
            <div>
              <p style={{ fontSize:10, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 2px', fontFamily:F }}>Período</p>
              <p style={{ fontSize:12, color:'#0F0F0F', margin:0, fontFamily:F }}>00/00/000 - 00/00/000</p>
            </div>
            <div>
              <p style={{ fontSize:10, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 2px', fontFamily:F }}>Moneda</p>
              <p style={{ fontSize:12, color:'#0F0F0F', margin:0, fontFamily:F }}>{cuentaSel.moneda} {sym}</p>
            </div>
            {/* Issue: el saldo inicial se veía perdido hasta abajo de la tabla,
                después del Totalizado - ahora va acá arriba junto con el resto
                del encabezado de la cuenta, visible sin tener que hacer scroll. */}
            <div>
              <p style={{ fontSize:10, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 2px', fontFamily:F }}>Saldo inicial</p>
              <p style={{ fontSize:12, color:'#0F0F0F', margin:0, fontFamily:F, fontWeight:600 }}>{sym} {fmt2(saldoInicial)}</p>
            </div>
            <button onClick={()=>setCuentaSel(null)}
              style={{ marginLeft:'auto', height:30, padding:'0 12px', border:`1px solid ${C.brandBd}`, borderRadius:7,
                background:'#FFFFFF', cursor:'pointer', fontSize:11, color:BRAND, fontFamily:F }}>
              × Todas las cuentas
            </button>
          </div>
        )}

        {/* Barra de acciones masivas - mismo estilo oscuro que Bandeja de asientos */}
        {selectedCount > 0 && (
          <div style={{ background:'#2D2A00', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <span style={{ fontSize:12, color:'#FFFFFF', fontWeight:500, fontFamily:F }}>
              {selectedCount} asiento{selectedCount===1?'':'s'} seleccionado{selectedCount===1?'':'s'}
            </span>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setConfirmDesmayMasivo(true)}
                style={{ height:30, padding:'0 12px', border:'none', borderRadius:radius.sm, background:BRAND, color:'#FFFFFF',
                  cursor:'pointer', fontSize:11, fontWeight:500, fontFamily:F }}>
                Descontabilizar
              </button>
              <button onClick={()=>setSelected(new Set())}
                style={{ height:30, padding:'0 12px', border:'1px solid rgba(255,255,255,.3)', borderRadius:radius.sm, background:'transparent',
                  color:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F }}>
                Limpiar selección
              </button>
            </div>
          </div>
        )}

        {/* Tabla */}
        {filasResumenVista ? (
          <div style={{ padding:'0 24px 24px' }}>
            <table className="tabla" style={TABLA.table}>
              <thead style={{ position:'sticky', top:0, zIndex:2, background:'#FFFFFF' }}>
                <tr style={TABLA.headRow}>
                  {[vistaActiva==='porLibro'?'Cuenta y libro':'Cuenta','Asientos','Debe','Haber'].map((h,i)=>(
                    <th key={h} style={{ ...TABLA.th, textAlign:i>=2?'right':'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filasResumenVista.length===0 ? (
                  <tr><td colSpan={4} style={TABLA.empty}>Sin movimientos para los filtros seleccionados.</td></tr>
                ) : filasResumenVista.map(f=>(
                  <tr key={f.clave} style={{ borderBottom:'1px solid #ECECEC' }}>
                    <td style={{ padding:'8px 12px', color:BRAND, fontFamily:F }}>{f.etiqueta}</td>
                    <td style={{ padding:'8px 12px', fontFamily:F }}>{f.cantidad}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right', fontFamily:F, whiteSpace:'nowrap' }}>{f.debe>0?<Monto sym={sym} valor={fmt2(f.debe)}/>:'-'}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right', fontFamily:F, whiteSpace:'nowrap' }}>{f.haber>0?<Monto sym={sym} valor={fmt2(f.haber)}/>:'-'}</td>
                  </tr>
                ))}
              </tbody>
              {filasResumenVista.length > 0 && (
                <tfoot>
                  <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
                    <td colSpan={2} style={{ padding:'8px 12px', fontWeight:600, fontFamily:F }}>Totales</td>
                    <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, fontFamily:F, whiteSpace:'nowrap' }}><Monto sym={sym} valor={fmt2(totalDebe)}/></td>
                    <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, fontFamily:F, whiteSpace:'nowrap' }}><Monto sym={sym} valor={fmt2(totalHaber)}/></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
        <div style={{ padding:'0 24px' }}>
        <table className="tabla" style={TABLA.table}>
          <thead style={{ position:'sticky', top:0, zIndex:2, background:'#FFFFFF' }}>
            <tr style={TABLA.headRow}>
              <th style={{ ...TABLA.th, width:36 }}>
                <input type="checkbox" checked={allSelected} disabled={selectableIds.length===0} onChange={toggleSelectAll}
                  style={{ width:13, height:13, accentColor:BRAND, cursor:selectableIds.length===0?'default':'pointer' }}/>
              </th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Fecha</th>
              <th style={thStyle}>N° Asiento</th>
              <th style={thStyle}>Descripción</th>
              <th style={thStyle}>Estado</th>
              {/* Columna Cuenta: solo escenario A con mostrarNum */}
              {mostrarColCuenta && <th style={thStyle}>Cuenta</th>}
              {/* Columna ID Auxiliar: solo escenario B (detalle) */}
              {mostrarColAux    && <th style={thStyle}>ID Auxiliar</th>}
              <th style={thStyle}>Módulo</th>
              <th style={thStyle}>Doc.</th>
              <th style={thR}>Debe</th>
              <th style={thR}>Haber</th>
              <th style={{ width:130 }}/>
            </tr>
          </thead>
          <tbody>

            {movsFiltrados.length === 0 ? (
              <tr>
                <td colSpan={10 + (mostrarColCuenta?1:0) + (mostrarColAux?1:0)}
                  style={TABLA.empty}>
                  {tieneCuenta
                    ? 'Sin movimientos en esta cuenta para el período seleccionado.'
                    : 'Sin movimientos para los filtros seleccionados.'}
                </td>
              </tr>
            ) : (
              movsPagina.map((m, idx) => {
                const msym = m.moneda === 'USD' ? '$' : '₡';
                const zebra = idx % 2 === 1 ? '#FCFCFA' : '#FFFFFF';
                return (
                  <tr key={m.id} style={{ borderBottom:'1px solid #ECECEC', cursor:'pointer', background:zebra }}
                    onClick={()=>setDetalleAsiento(m)}
                    onMouseEnter={e=>(e.currentTarget.style.background=C.n200)}
                    onMouseLeave={e=>(e.currentTarget.style.background=zebra)}>
                    <td style={{ padding:'8px 12px' }} onClick={e=>e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(m.id)} disabled={m.estado!=='Contabilizado'} onChange={()=>toggleSelected(m.id)}
                        style={{ width:13, height:13, accentColor:BRAND, cursor:m.estado!=='Contabilizado'?'default':'pointer', opacity:m.estado!=='Contabilizado'?.35:1 }}/>
                    </td>
                    <td style={{ padding:'8px 12px' }}><TipoPill tipo={m.tipo}/></td>
                    <td style={{ padding:'8px 12px', color:'#0F0F0F', whiteSpace:'nowrap', fontFamily:F }}>
                      {m.fecha.split('-').reverse().join('/')}
                    </td>
                    <td style={{ padding:'8px 12px' }}>
                      <button onClick={e=>{e.stopPropagation();setDetalleAsiento(m);}} style={{ color:BRAND, fontFamily:F, fontSize:12, fontWeight:500, textDecoration:'underline', textUnderlineOffset:2, background:'none', border:'none', cursor:'pointer', padding:0 }}>{m.consecutivo}</button>
                    </td>
                    <td style={{ padding:'8px 12px', maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:F }}>{m.descripcion}</td>
                    <td style={{ padding:'8px 12px' }}><EstadoBadge estado={m.estado}/></td>

                    {/* Cuenta - solo escenario A con mostrarNum */}
                    {mostrarColCuenta && (
                      <td style={{ padding:'8px 12px' }}>
                        <span style={{ color:BRAND, fontFamily:F }}>{m.cuentaCode}</span>
                      </td>
                    )}
                    {/* ID Auxiliar - solo escenario B */}
                    {mostrarColAux && (
                      <td style={{ padding:'8px 12px', fontFamily:F }}>
                        {m.idAuxiliar || '-'}
                      </td>
                    )}
                    <td style={{ padding:'8px 12px', fontFamily:F }}>{m.modulo}</td>
                    <td style={{ padding:'8px 12px', fontFamily:F }}>{m.documento}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right', whiteSpace:'nowrap' }}>
                      {m.debe > 0
                        ? <Monto sym={msym} valor={fmt2(m.debe)}/>
                        : <span style={{ color:C.n500, fontFamily:F }}>-</span>}
                    </td>
                    <td style={{ padding:'8px 12px', textAlign:'right', whiteSpace:'nowrap' }}>
                      {m.haber > 0
                        ? <Monto sym={msym} valor={fmt2(m.haber)}/>
                        : <span style={{ color:C.n500, fontFamily:F }}>-</span>}
                    </td>
                    <td style={{ padding:'8px 12px' }}><ActionIcons mov={m} onDescontabilizar={setConfirmDesmay}/></td>
                  </tr>
                );
              })
            )}

            {/* Totalizado - Issue #17: siempre visible, con o sin cuenta seleccionada */}
            <TotalizadoRow sym={sym} totalDebe={totalDebe} totalHaber={totalHaber}
              colSpan={6} mostrarColAux={mostrarColAux} mostrarColCuenta={mostrarColCuenta}/>

            {/* Saldo final - el saldo inicial ahora se muestra arriba, junto al
                encabezado de la cuenta (Cuenta/Período/Moneda), en vez de acá
                abajo donde quedaba fuera de vista. */}
            {tieneCuenta && (
              <SaldoRow label="Saldo final" sym={sym} valor={saldoFinal}
                colSpan={6} mostrarColAux={mostrarColAux} mostrarColCuenta={mostrarColCuenta}/>
            )}
          </tbody>
        </table>
        </div>
        )}
      </div>

      {/* Footer - la paginación solo aplica a la vista detalle; los consolidados
          (resumen / por libro) se muestran completos en una sola tabla. */}
      {!filasResumenVista && (
        <div style={{ background:'#FFFFFF', borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0 }}>
          <Pagination page={paginaActual} pageSize={pageSize} total={movsFiltrados.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
        </div>
      )}


      {/* Modal detalle asiento - ahora usa el componente compartido DetalleDrawer */}
      {detalleAsiento && (
        <DetalleDrawer
          asiento={{
            id: detalleAsiento.id,
            tipo: detalleAsiento.tipo,
            origen: detalleAsiento.modulo,
            fecha: detalleAsiento.fecha,
            consecutivo: detalleAsiento.consecutivo,
            titulo: detalleAsiento.descripcion,
            moneda: detalleAsiento.moneda as 'CRC'|'USD',
            importe: detalleAsiento.debe || detalleAsiento.haber,
            usuario: 'sistema',
            documento: detalleAsiento.documento,
            observacion: detalleAsiento.observacion ?? '',
            contabilizado: detalleAsiento.estado === 'Contabilizado',
            archivos: detalleAsiento.archivos ?? [],
            historial: detalleAsiento.historial ?? [],
            conciliacion: detalleAsiento.conciliacion ?? null,
            lineas: [
              { id:1, cuenta:detalleAsiento.cuentaCode, descripcion:detalleAsiento.descripcion, cCostos:'-', debe:detalleAsiento.debe, haber:0 },
              { id:2, cuenta:'400-010-0001', descripcion:'Contrapartida', cCostos:'-', debe:0, haber:detalleAsiento.debe },
            ],
          }}
          onClose={()=>setDetalleAsiento(null)}
          onAnular={()=>{}}
          onDuplicar={()=>{}}
          tienePermisoDescontabilizar={PERMISOS_ACTUAL.descontabilizarAsientos}
          onContabilizar={(payload)=>{
            // La confirmación (motivo, desconciliar, permisos) ya ocurrió dentro del propio drawer.
            if (detalleAsiento.estado === 'Contabilizado') {
              setMovimientos(p => p.map(x => x.id === detalleAsiento.id ? { ...x, estado:'Pendiente' as EstadoMov,
                historial:[...(x.historial??[]), { color:'#EF9F27', texto:`Descontabilizado${payload?.desconciliar?' y desconciliado':''} - ${payload?.motivo ?? ''}`, fecha:new Date().toLocaleString('es-CR'), usuario:'usuario actual' }] } : x));
            } else {
              setMovimientos(p => p.map(x => x.id === detalleAsiento.id ? { ...x, estado:'Contabilizado' as EstadoMov } : x));
            }
            setDetalleAsiento(null);
          }}
        />
      )}
      {/* Modal descontabilizar - disparado desde el ícono de la fila (ActionIcons) */}
      {confirmDesmay && (
        <ModalDescontabilizar
          consecutivo={confirmDesmay.consecutivo}
          titulo={confirmDesmay.descripcion}
          conciliacion={confirmDesmay.conciliacion}
          tienePermiso={PERMISOS_ACTUAL.descontabilizarAsientos}
          onClose={() => setConfirmDesmay(null)}
          onConfirm={({ motivo, desconciliar }) => {
            setMovimientos(p => p.map(m => m.id === confirmDesmay.id ? { ...m, estado:'Pendiente' as EstadoMov,
              historial:[...(m.historial??[]), { color:'#EF9F27', texto:`Descontabilizado${desconciliar?' y desconciliado':''} - ${motivo}`, fecha:new Date().toLocaleString('es-CR'), usuario:'usuario actual' }] } : m));
            setConfirmDesmay(null);
          }}
        />
      )}
      {/* Modal confirmación descontabilización masiva - Issue #12 */}
      {confirmDesmayMasivo && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setConfirmDesmayMasivo(false)}>
          <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:420, boxShadow:shadow.modal, fontFamily:F }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}` }}>
              <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Confirmar descontabilización masiva</p>
            </div>
            <div style={{ padding:'18px 20px' }}>
              <div style={{ display:'flex', gap:10, padding:'12px 14px', background:'#FFF8EC', border:`1px solid ${C.brandBd}`, borderRadius:radius.md }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={BRAND} strokeWidth="1.4" style={{ flexShrink:0, marginTop:1 }}><circle cx="8" cy="8" r="6.33"/><path d="M8 5.33v2.34M8 10h.01" strokeLinecap="round"/></svg>
                <p style={{ fontSize:12, color:'#7a5c00', margin:0, lineHeight:1.5 }}>
                  Los <strong>{selectedCount}</strong> asientos seleccionados regresarán a estado <strong>Pendiente</strong> y quedarán disponibles para modificación o anulación. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button onClick={() => setConfirmDesmayMasivo(false)}
                style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>
                Cancelar
              </button>
              <button onClick={() => {
                  setMovimientos(p => p.map(m => selected.has(m.id) ? { ...m, estado:'Pendiente' } : m));
                  setSelected(new Set());
                  setConfirmDesmayMasivo(false);
                }}
                style={{ height:34, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>
                Confirmar descontabilización
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal exportar analítico - Issue #18 */}
      {exportarOpen && (
        <ModalExportarAnalitico
          rows={movsFiltrados}
          filasResumen={filasResumenVista}
          tipoActivo={vistaActiva}
          cuentaLabel={cuentaSel ? cuentaSel.code : (rangoSel ? `${rangoSel.desde.code} – ${rangoSel.hasta.code}` : null)}
          saldoInicial={tieneCuenta ? saldoInicial : null}
          saldoFinal={tieneCuenta ? saldoFinal : null}
          sym={sym}
          filtrosResumen={resumenFiltros}
          onClose={()=>setExportarOpen(false)}
        />
      )}
    </div>
  );
}
