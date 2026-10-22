'use client';
import { Select } from '@/components/ui/formulario';
import { radius , C } from '@/components/ui/tokens';
import { IcClose } from '@/components/ui/icons';
import { BRAND, F } from '../datos';
import { type EstadoEditForm } from './useEditForm';

// Opciones de las cuentas de detalle: centros de costo
export function SeccionDetalle({ e }: { e: EstadoEditForm }) {
  const { ccObligatorioBySpec, ccEffective, set, form, CENTROS_COSTO } = e;
  return (
        <div>
          {ccObligatorioBySpec && (
            <div style={{ display:'flex', alignItems:'flex-start', gap:7, padding:'7px 10px', background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:radius.md, marginBottom:7 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={BRAND}><circle cx="7" cy="7" r="5.83"/><path d="M7 4.67v2.33M7 9.33h.01" strokeLinecap="round"/></svg>
              <p style={{ fontSize:10.5, color:'#8A6200', margin:0, fontFamily:F }}>
                Este tipo de cuenta requiere centro de costo.
              </p>
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:9, opacity:ccObligatorioBySpec?0.6:1, pointerEvents:ccObligatorioBySpec?'none':'auto' }}>
            <input type="checkbox" id="cc-obl" checked={ccEffective} onChange={e=>!ccObligatorioBySpec&&set('centroCostoObligatorio',e.target.checked)} style={{ width:12, height:12, accentColor:BRAND, cursor:'pointer' }}/>
            <label htmlFor="cc-obl" style={{ fontSize:11, color:C.n900, cursor:'pointer', fontFamily:F }}>
              Requiere centro de costo
              {ccObligatorioBySpec && <span style={{ marginLeft:5, fontSize:10.5, color:BRAND, background:C.brandBg, padding:'1px 5px', borderRadius:4, fontFamily:F }}>Requerido</span>}
            </label>
          </div>
          <p style={{ fontSize:10.5, color:C.n700, margin:'5px 0 0', fontFamily:F }}>Esta decisión la heredan automáticamente los Auxiliares de esta cuenta.</p>

          {/* Centro de costos - faltaba el selector para elegir cuál(es) centro(s) aplican */}
          {ccEffective && (
            <div style={{ marginTop:10 }}>
              <p style={{ fontSize:10.5, fontWeight:500, color:C.n900, margin:'0 0 5px', fontFamily:F }}>Centro de costos</p>
              <Select ariaLabel="Centro de costos"
                value=""
                onChange={id => { if (id && !form.centrosCostoIds.includes(id)) set('centrosCostoIds', [...form.centrosCostoIds, id]); }}
                options={[
                  { value:'', label:'Selecciona el centro de costos' },
                  ...CENTROS_COSTO.filter(cc=>!form.centrosCostoIds.includes(cc.id)).map(cc=>({ value:cc.id, label:`${cc.codigo} · ${cc.descripcion}` })),
                ]}
              />
              {form.centrosCostoIds.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:7 }}>
                  {form.centrosCostoIds.map(id => {
                    const cc = CENTROS_COSTO.find(c=>c.id===id);
                    if (!cc) return null;
                    return (
                      <div key={id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 9px', borderRadius:radius.sm, border:`1px solid ${C.brandBd}`, background:C.brandBg }}>
                        <span style={{ fontSize:10.5, fontFamily:F, color:'#0F0F0F' }}>{cc.codigo} · {cc.descripcion}</span>
                        <button type="button" onClick={()=>set('centrosCostoIds', form.centrosCostoIds.filter(x=>x!==id))}
                          style={{ display:'flex', alignItems:'center', background:'none', border:'none', cursor:'pointer', color:C.n700 }}>
                          <IcClose className="w-3 h-3"/>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
  );
}
