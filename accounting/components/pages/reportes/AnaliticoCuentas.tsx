'use client';
import { PageHeader } from '@/components/ui/primitives';
import { C, PERMISOS_ACTUAL, radius, TABLA } from '@/components/ui/tokens';
import { Pagination } from '@/components/ui/tabla';
import { SearchInput, FilterDropdown } from '@/components/ui/filtros';
import { Monto } from '@/components/ui/montos';
import ModalDescontabilizar from '@/components/pages/asientos/DescontabilizarModal';
import { CuentaFiltroUnico } from './analiticoCuentas/CuentaFiltroUnico';
import { ModalExportarAnalitico } from './analiticoCuentas/ModalExportarAnalitico';
import { BRAND, type EstadoMov, F, MODULOS, TIPO_OPTIONS, fmt2 } from './analiticoCuentas/datos';
import { ActionIcons, DateRangeFilter, EstadoBadge, IcPrint, RangoImporteFilter, SaldoRow, TipoPill, TotalizadoRow } from './analiticoCuentas/piezas';
import { useAnalitico } from './analiticoCuentas/useAnalitico';
import { ResumenCuenta } from './analiticoCuentas/ResumenCuenta';
import { PanelDetalleAsiento } from './analiticoCuentas/PanelDetalleAsiento';
import { ConfirmarDesmayorizacionMasiva } from './analiticoCuentas/ConfirmarDesmayorizacionMasiva';

export default function AnaliticoCuentas() {
  const e = useAnalitico();
  const { cuentaSel, rangoSel, setCuentaSel, setRangoSel, vistaGlobal, tipoLibroOpciones, setVista, vista, tieneCuenta, tieneRango, mostrarNum, setMostrarNum, setExportarOpen, searchQ, setSearch, filtFecha, setFiltFecha, filtTipo, setFiltTipo, filtOrigen, setFiltOrigen, filtMinimo, filtMaximo, setFiltMin, setFiltMax, filtEstado, setFiltEstado, filtMoneda, setFiltMoneda, filtUsuario, setFiltUsuario, selectedCount, setConfirmDesmayMasivo, setSelected, filasResumenVista, vistaActiva, sym, totalDebe, totalHaber, allSelected, selectableIds, toggleSelectAll, thStyle, mostrarColCuenta, mostrarColAux, thR, movsFiltrados, movsPagina, setDetalleAsiento, selected, toggleSelected, setConfirmDesmay, saldoFinal, paginaActual, pageSize, setPage, setPageSize, detalleAsiento, confirmDesmay, setMovimientos, confirmDesmayMasivo, exportarOpen, saldoInicial, resumenFiltros } = e;
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>

      {/* Encabezado */}
      <PageHeader title="Analítico de cuentas" left={
        <>
          <CuentaFiltroUnico cuenta={cuentaSel} rango={rangoSel}
            onSelectCuenta={c=>{ setCuentaSel(c); setRangoSel(null); }}
            onSelectRango={r=>{ setRangoSel(r); setCuentaSel(null); }}
            onClear={()=>{ setCuentaSel(null); setRangoSel(null); }}/>
          {/* «Ver como» (Diario general / Resumen / Por libro) solo aplica cuando se ven todas
              las cuentas; va junto al selector de cuenta, que es lo que decide si aplica. */}
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
              <input type="checkbox" aria-label="Seleccionar" checked={mostrarNum} onChange={e=>setMostrarNum(e.target.checked)}
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

      {/* Contenido */}
      <div style={{ flex:1, overflowY:'auto', background:'#FFFFFF' }}>

        {/* Encabezado de cuenta - solo cuando hay cuenta seleccionada */}
        {tieneCuenta && cuentaSel && <ResumenCuenta e={e} />}

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
                <input type="checkbox" aria-label="Seleccionar" checked={allSelected} disabled={selectableIds.length===0} onChange={toggleSelectAll}
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
                      <input type="checkbox" aria-label="Seleccionar" checked={selected.has(m.id)} disabled={m.estado!=='Contabilizado'} onChange={()=>toggleSelected(m.id)}
                        style={{ width:13, height:13, accentColor:BRAND, cursor:m.estado!=='Contabilizado'?'default':'pointer', opacity:m.estado!=='Contabilizado'?.35:1 }}/>
                    </td>
                    <td style={{ padding:'8px 12px' }}><TipoPill tipo={m.tipo}/></td>
                    <td style={{ padding:'8px 12px', color:'#0F0F0F', whiteSpace:'nowrap', fontFamily:F }}>
                      {m.fecha.split('-').reverse().join('/')}
                    </td>
                    <td style={{ padding:'8px 12px' }}>
                      <button onClick={e=>{e.stopPropagation();setDetalleAsiento(m);}} style={{ color:BRAND, fontFamily:F, fontSize:12, fontWeight:500, textDecoration:'underline', textUnderlineOffset:2, background:'none', border:'none', cursor:'pointer', padding:0 }}>{m.consecutivo}</button>
                    </td>
                    <td style={{ padding:'8px 12px', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:F }} title={m.descripcion}>{m.descripcion}</td>
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
                    <td style={{ padding:'8px 12px', maxWidth:90, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:F }} title={m.documento}>{m.documento}</td>
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

            {/* Totalizado: siempre visible, con o sin cuenta seleccionada */}
            <TotalizadoRow sym={sym} totalDebe={totalDebe} totalHaber={totalHaber}
              colSpan={6} mostrarColAux={mostrarColAux} mostrarColCuenta={mostrarColCuenta}/>

            {/* Saldo final; el saldo inicial se muestra arriba, junto al encabezado de la
                cuenta. */}
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


      {/* Detalle del asiento con el componente compartido DetalleDrawer */}
      {detalleAsiento && <PanelDetalleAsiento e={e} />}
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
      {/* Modal de confirmación de descontabilización masiva */}
      {confirmDesmayMasivo && <ConfirmarDesmayorizacionMasiva e={e} />}
      {/* Modal para exportar el analítico */}
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
