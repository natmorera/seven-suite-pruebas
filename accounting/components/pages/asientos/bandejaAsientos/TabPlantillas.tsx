'use client';
import { RowAction } from '@/components/ui/primitives';
import { C, PAGE_PAD, radius, TABLA } from '@/components/ui/tokens';
import { SearchInput, FilterDropdown } from '@/components/ui/filtros';
import { F, MONEDAS, MON_SYM } from './datos';
import { IcEditar, IcEliminar, IcUsar } from './piezas';
import { type EstadoBandeja } from './useBandeja';

// Pestaña Plantillas de la Bandeja de asientos
export function TabPlantillas({ e }: { e: EstadoBandeja }) {
  const { searchPlant, setSearchPlant, filtMonedaPlant, setFiltMonedaPlant, plantillasFiltradas, handleUsarPlantilla, setEditPlantilla, setDelPlantilla } = e;
  return (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* barra de búsqueda */}
          <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
            <SearchInput value={searchPlant} onChange={setSearchPlant} placeholder="Buscar por nombre de plantilla…" width={300} />
            <FilterDropdown label="Moneda" options={MONEDAS} selected={filtMonedaPlant} onApply={setFiltMonedaPlant} onClear={()=>setFiltMonedaPlant(new Set())}/>
            {(searchPlant || filtMonedaPlant.size>0) && (
              <button onClick={()=>{ setSearchPlant(''); setFiltMonedaPlant(new Set()); }}
                style={{ height:28, padding:'0 10px', border:'none', background:C.errorBg, color:C.error, borderRadius:radius.sm, cursor:'pointer', fontSize:11, fontFamily:F }}>
                × Limpiar
              </button>
            )}
          </div>
          <div style={{ flex:1, overflowY:'auto', background:'#FFFFFF', padding:`0 ${PAGE_PAD-12}px` }}>
          <table className="tabla" style={TABLA.table}>
            <thead><tr style={TABLA.headRow}>
              {['Nombre','N.º cuentas','Moneda','Última modificación','Acciones'].map(h=>(
                <th key={h} style={TABLA.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {plantillasFiltradas.map(t=>(
                <tr key={t.id} style={TABLA.row} onMouseEnter={e=>(e.currentTarget.style.background=TABLA.rowHoverBg)} onMouseLeave={e=>(e.currentTarget.style.background=C.n000)}>
                  <td style={TABLA.td}>{t.nombre}</td>
                  <td style={TABLA.td}>{t.cuentas}</td>
                  <td style={TABLA.td}><span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:C.n200 }}>{t.moneda} {MON_SYM[t.moneda]}</span></td>
                  <td style={TABLA.td}>{t.ultima}</td>
                  <td style={TABLA.td}>
                    <div style={{ display:'flex', gap:4 }}>
                      <RowAction title="Usar plantilla" onClick={()=>handleUsarPlantilla(t)}><IcUsar/></RowAction>
                      <RowAction title="Editar" onClick={()=>setEditPlantilla(t)}><IcEditar/></RowAction>
                      <RowAction title="Eliminar" danger onClick={()=>setDelPlantilla(t)}><IcEliminar/></RowAction>
                    </div>
                  </td>
                </tr>
              ))}
              {plantillasFiltradas.length===0 && (
                <tr><td colSpan={5} style={TABLA.empty}>
                  {searchPlant ? 'Sin resultados para tu búsqueda.' : 'Sin plantillas guardadas.'}
                </td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
  );
}
