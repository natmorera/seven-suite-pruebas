'use client';
import { RowAction } from '@/components/ui/primitives';
import { C, PAGE_PAD, radius, TABLA } from '@/components/ui/tokens';
import { SearchInput, FilterDropdown } from '@/components/ui/filtros';
import { PaginationFooter } from './PaginationFooter';
import { BRAND, F, IMPORTE_DEFAULT, IMPORTE_MAX, MONEDAS, MON_SYM, ORIGENES, TIPOS_LABEL, USUARIOS, fmt2 } from './datos';
import { DateFilter, IcRestaurar, ImporteFilter, TipoPill } from './piezas';
import { type EstadoBandeja } from './useBandeja';

// Pestaña Anulados de la Bandeja de asientos
export function TabAnulados({ e }: { e: EstadoBandeja }) {
  const { searchQA, setSearchA, filtTipoA, setFiltTipoA, filtFechaA, setFiltFechaA, filtOrigenA, setFiltOrigenA, filtMonedaA, setFiltMonedaA, filtImporteA, setFiltImporteA, filtUsuarioA, setFiltUsuarioA, anuladosVisibles, setDetalle, handleRestaurar, anuladosFiltrados, totalCRC_A, porPaginaA, setPorPaginaA, paginaA, setPaginaA } = e;
  return (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Filtros - estado propio e independiente de Pendientes */}
          <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
            <SearchInput value={searchQA} onChange={setSearchA} placeholder="Buscar…" width={200} />
            <FilterDropdown label="Tipo"    options={Object.values(TIPOS_LABEL)} selected={filtTipoA}    onApply={setFiltTipoA}    onClear={()=>setFiltTipoA(new Set())}/>
            <DateFilter     label="Fechas"  value={filtFechaA}                   onChange={setFiltFechaA} onClear={()=>setFiltFechaA({from:'',to:''})}/>
            <FilterDropdown label="Origen"  options={ORIGENES}                   selected={filtOrigenA}  onApply={setFiltOrigenA}  onClear={()=>setFiltOrigenA(new Set())}/>
            <FilterDropdown label="Moneda"  options={MONEDAS}                    selected={filtMonedaA}  onApply={setFiltMonedaA}  onClear={()=>setFiltMonedaA(new Set())}/>
            <ImporteFilter  value={filtImporteA} onChange={setFiltImporteA}      onClear={()=>setFiltImporteA(IMPORTE_DEFAULT)}/>
            <FilterDropdown label="Usuario" options={USUARIOS}                   selected={filtUsuarioA} onApply={setFiltUsuarioA} onClear={()=>setFiltUsuarioA(new Set())}/>

            {(filtTipoA.size||filtOrigenA.size||filtMonedaA.size||filtUsuarioA.size||filtFechaA.from||filtFechaA.to||filtImporteA.min>0||filtImporteA.max<IMPORTE_MAX||searchQA) ? (
              <button onClick={()=>{ setFiltTipoA(new Set());setFiltOrigenA(new Set());setFiltMonedaA(new Set());setFiltUsuarioA(new Set());setFiltFechaA({from:'',to:''});setFiltImporteA(IMPORTE_DEFAULT);setSearchA(''); }}
                style={{ height:28, padding:'0 10px', border:'none', background:C.errorBg, color:C.error, borderRadius:radius.sm, cursor:'pointer', fontSize:11, fontFamily:F }}>
                × Limpiar filtros
              </button>
            ) : null}
          </div>
          <div style={{ flex:1, overflowY:'auto', background:'#FFFFFF', padding:`0 ${PAGE_PAD-12}px` }}>
            <table className="tabla" style={TABLA.table}>
              <thead><tr style={TABLA.headRow}>
                {['Tipo','Origen','Fecha','N.º Asiento','Título','Moneda','Importe','Usuario','Acciones'].map(h=>(
                  <th key={h} style={TABLA.th}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {anuladosVisibles.map(a=>{
                  const sym = MON_SYM[a.moneda];
                  return (
                    <tr key={a.id} onClick={()=>setDetalle({a,anulado:true})} style={{ borderBottom:'1px solid #ECECEC', cursor:'pointer' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='#F9F9F9')} onMouseLeave={e=>(e.currentTarget.style.background='#FFFFFF')}>
                      <td style={{ padding:'8px 12px' }}><TipoPill tipo={a.tipo}/></td>
                      <td style={{ padding:'8px 12px', color:'#0F0F0F' }}>{a.origen}</td>
                      <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>{a.fecha.split('-').reverse().join('/')}</td>
                      <td style={{ padding:'8px 12px' }}><span style={{ color:BRAND, fontFamily:F }}>{a.consecutivo}</span></td>
                      <td style={{ padding:'8px 12px', maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.titulo}</td>
                      <td style={{ padding:'8px 12px' }}><span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:'#F9F9F9' }}>{a.moneda} {sym}</span></td>
                      <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', gap:8, minWidth:100 }}>
                          <span>{sym}</span>
                          <span>{fmt2(a.importe)}</span>
                        </div>
                      </td>
                      <td style={{ padding:'8px 12px' }}>{a.usuario}</td>
                      {/* Acciones - solo Restaurar; el motivo de anulación ya se ve al abrir el drawer con clic en la fila */}
                      <td onClick={e=>e.stopPropagation()} style={{ padding:'10px 12px' }}>
                        <div style={{ display:'flex', gap:4 }}>
                          <RowAction title="Restaurar asiento" onClick={()=>handleRestaurar(a)}><IcRestaurar/></RowAction>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {anuladosFiltrados.length===0 && <tr><td colSpan={9} style={TABLA.empty}>Sin asientos anulados con los filtros actuales.</td></tr>}
              </tbody>
              {anuladosFiltrados.length > 0 && (
                <tfoot>
                  <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
                    <td colSpan={5} style={{ padding:'8px 12px', fontWeight:600, fontSize:12 }}>Totales</td>
                    <td/>
                    <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:8, minWidth:100 }}>
                        <span style={{ color:'#757575', fontSize:11 }}>₡</span>
                        <span style={{ fontWeight:700, fontSize:12 }}>{fmt2(totalCRC_A)}</span>
                      </div>
                    </td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <PaginationFooter total={anuladosFiltrados.length} porPagina={porPaginaA} setPorPagina={setPorPaginaA} pagina={paginaA} setPagina={setPaginaA}/>
        </div>
  );
}
