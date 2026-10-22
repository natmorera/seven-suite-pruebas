'use client';
import { C, PAGE_PAD, radius, TABLA } from '@/components/ui/tokens';
import { SearchInput, FilterDropdown, BulkActionBar } from '@/components/ui/filtros';
import { PaginationFooter } from './PaginationFooter';
import { BRAND, F, IMPORTE_DEFAULT, IMPORTE_MAX, MONEDAS, MON_SYM, ORIGENES, TIPOS_LABEL, USUARIOS, fmt2 } from './datos';
import { ActBtn, DateFilter, IcBan, IcCheck, IcClip, IcCopy, IcMail, ImporteFilter, TipoPill } from './piezas';
import { type EstadoBandeja } from './useBandeja';

// Pestaña Pendientes de la Bandeja de asientos: filtros, selección masiva y tabla
export function TabPendientes({ e }: { e: EstadoBandeja }) {
  const { searchQ, setSearch, filtTipo, setFiltTipo, filtFecha, setFiltFecha, filtOrigen, setFiltOrigen, filtMoneda, setFiltMoneda, filtImporte, setFiltImporte, filtCC, setFiltCC, filtUsuario, setFiltUsuario, tieneSeleccion, seleccion, setSeleccion, setModalContabilizar, asientos, setModalAnular, pendientes, handleSelectAll, visibles, pendientesVisibles, setDetalle, handleSelectOne, setModalAdjuntosRow, openDuplicar, setModalCorreo, totalCRC, totalUSD, porPagina, setPorPagina, pagina, setPagina } = e;
  return (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Filtros */}
          <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
            <SearchInput value={searchQ} onChange={setSearch} placeholder="Buscar asiento, título, N° documento…" width={300} />
            <FilterDropdown label="Tipo"           options={Object.values(TIPOS_LABEL)}    selected={filtTipo}   onApply={setFiltTipo}   onClear={()=>setFiltTipo(new Set())}/>
            <DateFilter     label="Fechas"         value={filtFecha}                       onChange={setFiltFecha} onClear={()=>setFiltFecha({from:'',to:''})}/>
            <FilterDropdown label="Origen"         options={ORIGENES}                      selected={filtOrigen} onApply={setFiltOrigen} onClear={()=>setFiltOrigen(new Set())}/>
            <FilterDropdown label="Moneda"         options={MONEDAS}                       selected={filtMoneda}  onApply={setFiltMoneda}  onClear={()=>setFiltMoneda(new Set())}/>
            <ImporteFilter  value={filtImporte}    onChange={setFiltImporte}               onClear={()=>setFiltImporte(IMPORTE_DEFAULT)}/>
            <FilterDropdown label="Centro de costos" options={['ADM','RST','SPA','MNT']}  selected={filtCC}  onApply={setFiltCC} onClear={()=>setFiltCC(new Set())}/>
            <FilterDropdown label="Usuario"        options={USUARIOS}                      selected={filtUsuario} onApply={setFiltUsuario} onClear={()=>setFiltUsuario(new Set())}/>

            {(filtMoneda.size||filtTipo.size||filtOrigen.size||filtUsuario.size||filtFecha.from||filtFecha.to||filtImporte.min>0||filtImporte.max<IMPORTE_MAX) ? (
              <button onClick={()=>{ setFiltMoneda(new Set());setFiltTipo(new Set());setFiltOrigen(new Set());setFiltUsuario(new Set());setFiltFecha({from:'',to:''});setFiltImporte(IMPORTE_DEFAULT);setFiltCC(new Set()); }}
                style={{ height:28, padding:'0 10px', border:'none', background:C.errorBg, color:C.error, borderRadius:radius.sm, cursor:'pointer', fontSize:11, fontFamily:F }}>
                × Limpiar filtros
              </button>
            ) : null}
          </div>

          {/* Banner selección masiva - componente compartido BulkActionBar */}
          {tieneSeleccion && (
            <BulkActionBar count={seleccion.size} onClose={()=>setSeleccion(new Set())} actions={[
              { label:'Contabilizar', onClick:()=>{ if(seleccion.size>=1) setModalContabilizar(asientos.filter(a=>seleccion.has(a.id))); } },
              { label:'Anular', variant:'outline', onClick:()=>{ if(seleccion.size>=1) setModalAnular(asientos.filter(a=>seleccion.has(a.id))); } },
            ]}/>
          )}



          {/* Tabla */}
          <div style={{ flex:1, overflowY:'auto', background:'#FFFFFF', padding:`0 ${PAGE_PAD-12}px` }}>
            <table className="tabla" style={TABLA.table}>
              <thead style={{ position:'sticky', top:0, zIndex:2, background:'#FFFFFF' }}>
                <tr style={TABLA.headRow}>
                  <th style={{ ...TABLA.th, width:40 }}>
                    <input type="checkbox" aria-label="Seleccionar" checked={pendientes.length>0&&seleccion.size===pendientes.length} onChange={e=>handleSelectAll(e.target.checked)} style={{ width:14, height:14, accentColor:BRAND }}/>
                  </th>
                  {visibles.map(c=>(
                    <th key={c.id} style={{ ...TABLA.th, textAlign:c.id==='importe'?'right':'left' }}>{c.label}</th>
                  ))}
                  <th style={{ ...TABLA.th, width:140 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.length===0 ? (
                  <tr><td colSpan={visibles.length+2} style={TABLA.empty}>Sin asientos con los filtros actuales.</td></tr>
                ) : pendientesVisibles.map(a=>{
                  const isSel = seleccion.has(a.id);
                  const sym   = MON_SYM[a.moneda];
                  return (
                    <tr key={a.id} onClick={()=>setDetalle({a,anulado:false})}
                      style={{ borderBottom:'1px solid #ECECEC', cursor:'pointer', background:isSel?C.brandBg:'#FFFFFF', transition:'background .1s' }}
                      onMouseEnter={e=>!isSel&&(e.currentTarget.style.background='#F9F9F9')}
                      onMouseLeave={e=>!isSel&&(e.currentTarget.style.background='#FFFFFF')}>
                      <td onClick={e=>e.stopPropagation()} style={{ padding:'8px 12px' }}>
                        <input type="checkbox" aria-label="Seleccionar" checked={isSel} onChange={()=>handleSelectOne(a.id)} style={{ width:14, height:14, accentColor:BRAND }}/>
                      </td>
                      {visibles.map(c=>{
                        if (c.id==='tipo')        return <td key={c.id} style={{ padding:'8px 12px' }}><TipoPill tipo={a.tipo}/></td>;
                        if (c.id==='origen')      return <td key={c.id} style={{ padding:'8px 12px', color:'#0F0F0F' }}>{a.origen}</td>;
                        if (c.id==='fecha')       return <td key={c.id} style={{ padding:'8px 12px', color:'#0F0F0F', whiteSpace:'nowrap' }}>{a.fecha.split('-').reverse().join('/')}</td>;
                        if (c.id==='consecutivo') return <td key={c.id} style={{ padding:'8px 12px' }}><span style={{ color:BRAND, fontFamily:F }}>{a.consecutivo}</span></td>;
                        if (c.id==='titulo')      return <td key={c.id} style={{ padding:'8px 12px', maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.titulo}</td>;
                        if (c.id==='moneda')      return <td key={c.id} style={{ padding:'8px 12px' }}><span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:'#F9F9F9' }}>{a.moneda} {sym}</span></td>;
                        if (c.id==='importe')     return (
                          <td key={c.id} style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', gap:8, minWidth:100 }}>
                              <span style={{ flexShrink:0 }}>{sym}</span>
                              <span style={{ textAlign:'right', flex:1 }}>{fmt2(a.importe)}</span>
                            </div>
                          </td>
                        );
                        if (c.id==='usuario')     return <td key={c.id} style={{ padding:'8px 12px' }}>{a.usuario}</td>;
                        if (c.id==='documento')   return <td key={c.id} style={{ padding:'8px 12px', fontFamily:F }}>{a.documento}</td>;
                        if (c.id==='observacion') return <td key={c.id} style={{ padding:'8px 12px', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.observacion}</td>;
                        return <td key={c.id}/>;
                      })}
                      {/* Acciones rápidas de fila - el detalle/edición completa vive en el drawer de detalle */}
                      <td onClick={e=>e.stopPropagation()} style={{ padding:'10px 12px' }}>
                        <div style={{ display:'flex', gap:2 }}>
                          <ActBtn label="Contabilizar" onClick={e=>{ e.stopPropagation(); setModalContabilizar([a]); }}><IcCheck/></ActBtn>
                          <ActBtn label="Adjuntos" onClick={e=>{ e.stopPropagation(); setModalAdjuntosRow({a,anulado:false}); }}><IcClip/></ActBtn>
                          <ActBtn label="Duplicar" onClick={e=>{ e.stopPropagation(); openDuplicar(a); }}><IcCopy/></ActBtn>
                          <ActBtn label="Enviar por correo" onClick={e=>{ e.stopPropagation(); setModalCorreo(a); }}><IcMail/></ActBtn>
                          <ActBtn label="Anular" danger onClick={e=>{ e.stopPropagation(); setModalAnular([a]); }}><IcBan/></ActBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* 5. Totales al final alineados con columna importe */}
              {pendientes.length > 0 && (
                <tfoot>
                  <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
                    <td/>
                    {visibles.map(col => {
                      if (col.id === 'titulo') return <td key={col.id} style={{ padding:'8px 12px', fontWeight:600, fontSize:12 }}>Totales</td>;
                      if (col.id === 'importe') return (
                        <td key={col.id} style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                            {totalCRC > 0 && <div style={{ display:'flex', justifyContent:'space-between', gap:8, minWidth:100 }}><span style={{ color:'#757575', fontSize:11 }}>₡</span><span style={{ fontWeight:700, fontSize:12 }}>{fmt2(totalCRC)}</span></div>}
                            {totalUSD > 0 && <div style={{ display:'flex', justifyContent:'space-between', gap:8, minWidth:100 }}><span style={{ color:'#757575', fontSize:11 }}>$</span><span style={{ fontWeight:700, fontSize:12 }}>{fmt2(totalUSD)}</span></div>}
                          </div>
                        </td>
                      );
                      return <td key={col.id}/>;
                    })}
                    <td/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {/* Pie */}
          <PaginationFooter total={pendientes.length} porPagina={porPagina} setPorPagina={setPorPagina} pagina={pagina} setPagina={setPagina}/>
        </div>
  );
}
