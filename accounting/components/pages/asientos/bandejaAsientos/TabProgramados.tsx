'use client';
import { RowAction } from '@/components/ui/primitives';
import { C, PAGE_PAD, radius, TABLA } from '@/components/ui/tokens';
import { SearchInput, FilterDropdown } from '@/components/ui/filtros';
import { Checkbox } from '@/components/ui/formulario';
import { BRAND, F, MON_SYM } from './datos';
import { IcEditar, IcEliminar } from './piezas';
import { type EstadoBandeja } from './useBandeja';

// Pestaña Programados de la Bandeja de asientos
export function TabProgramados({ e }: { e: EstadoBandeja }) {
  const { searchProg, setSearchProg, programados, filtFrecuencia, setFiltFrecuencia, soloActivos, setSoloActivos, programadosFiltrados, handleToggleProgramado, setEditProgramado, setDelProgramado } = e;
  return (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* barra de búsqueda */}
          <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
            <SearchInput value={searchProg} onChange={setSearchProg} placeholder="Buscar por nombre o frecuencia…" width={300} />
            <FilterDropdown label="Frecuencia" options={Array.from(new Set(programados.map(p=>p.frecuencia)))} selected={filtFrecuencia} onApply={setFiltFrecuencia} onClear={()=>setFiltFrecuencia(new Set())}/>
            <Checkbox label="Mostrar activos" checked={soloActivos} onChange={setSoloActivos} />
            {(searchProg || filtFrecuencia.size>0 || soloActivos) && (
              <button onClick={()=>{ setSearchProg(''); setFiltFrecuencia(new Set()); setSoloActivos(false); }}
                style={{ height:28, padding:'0 10px', border:'none', background:C.errorBg, color:C.error, borderRadius:radius.sm, cursor:'pointer', fontSize:11, fontFamily:F }}>
                × Limpiar
              </button>
            )}
          </div>
          <div style={{ flex:1, overflowY:'auto', background:'#FFFFFF', padding:`0 ${PAGE_PAD-12}px` }}>
          <table className="tabla" style={TABLA.table}>
            <thead><tr style={TABLA.headRow}>
              {['Nombre','Frecuencia','Próxima ejecución','Moneda','Activo','Acciones'].map(h=>(
                <th key={h} style={TABLA.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {programadosFiltrados.map(p=>(
                <tr key={p.id} style={TABLA.row} onMouseEnter={e=>(e.currentTarget.style.background=TABLA.rowHoverBg)} onMouseLeave={e=>(e.currentTarget.style.background=C.n000)}>
                  <td style={TABLA.td}>{p.nombre}</td>
                  <td style={TABLA.td}>{p.frecuencia}</td>
                  <td style={TABLA.td}>{p.proxima}</td>
                  <td style={TABLA.td}><span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:C.n200 }}>{p.moneda} {MON_SYM[p.moneda]}</span></td>
                  <td style={TABLA.td}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div onClick={()=>handleToggleProgramado(p.id)} role="switch" aria-checked={p.activo}
                        aria-label={`${p.activo?'Desactivar':'Activar'} programación ${p.nombre}`} tabIndex={0}
                        onKeyDown={e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handleToggleProgramado(p.id); } }}
                        style={{ width:36, height:20, borderRadius:10, background:p.activo?BRAND:C.n500, position:'relative', cursor:'pointer' }}>
                        <span style={{ position:'absolute', width:14, height:14, borderRadius:'50%', background:C.n000, top:3, left:p.activo?18:3, transition:'left .15s' }}/>
                      </div>
                      <span style={{ color:p.activo?BRAND:C.n700 }}>{p.activo?'Activo':'Inactivo'}</span>
                    </div>
                  </td>
                  <td style={TABLA.td}>
                    <div style={{ display:'flex', gap:4 }}>
                      <RowAction title="Editar" onClick={()=>setEditProgramado(p)}><IcEditar/></RowAction>
                      <RowAction title="Eliminar" danger onClick={()=>setDelProgramado(p)}><IcEliminar/></RowAction>
                    </div>
                  </td>
                </tr>
              ))}
              {programadosFiltrados.length===0 && (
                <tr><td colSpan={6} style={TABLA.empty}>
                  {searchProg ? 'Sin resultados para tu búsqueda.' : 'Sin asientos programados.'}
                </td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
  );
}
