'use client';
import { useState } from 'react';
import { Section, RowAction } from '@/components/ui/primitives';
import { radius, TABLA , C } from '@/components/ui/tokens';
import { IcEdit, IcTrash } from '@/components/ui/icons';
import { useFirmasConfig, REPORTES_FIRMABLES, type Firma } from '@/components/pages/config/firmasConfig';
import { USUARIOS_INIT } from '@/components/pages/config/permissionsData';
import { ModalFirma } from './firmasPersonalizadas/ModalFirma';
import { BLANK_FIRMA, F, compactarOrdenes } from './firmasPersonalizadas/datos';
import { ConfirmDelete, resolverConflictosOrden } from './firmasPersonalizadas/piezas';
import { useSenalAgregar } from '@/components/ui/useSenalAgregar';

export default function FirmasPersonalizadas({ addSignal, onAddHandled }: { addSignal?: number; onAddHandled?: () => void }) {
  const { firmas, setFirmas } = useFirmasConfig();
  const [editando, setEditando] = useState<Firma|null>(null);
  const [creando, setCreando] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Firma|null>(null);

  function guardar(f: Firma) {
    setFirmas(prev => {
      const anterior = prev.find(x => x.id === f.id);
      let base = prev.some(x=>x.id===f.id) ? prev.map(x=>x.id===f.id?f:x) : [...prev, f];
      base = resolverConflictosOrden(base, f);
      // Si se destildó algún reporte que la firma sí tenía antes, hay que
      // recorrer a los demás firmantes de ese reporte para que no queden huecos.
      if (anterior) {
        const reportesQuitados = anterior.reportes
          .filter(r => !f.reportes.some(nr => nr.reporteKey === r.reporteKey))
          .map(r => r.reporteKey);
        for (const key of reportesQuitados) base = compactarOrdenes(base, key);
      }
      return base;
    });
    setEditando(null); setCreando(false);
  }

  function eliminarFirma(f: Firma) {
    setFirmas(prev => {
      let resultado = prev.filter(x => x.id !== f.id);
      for (const r of f.reportes) resultado = compactarOrdenes(resultado, r.reporteKey);
      return resultado;
    });
  }

  // El botón «Nueva firma» está en el encabezado de la página
  useSenalAgregar(addSignal, onAddHandled, () => { setCreando(true); });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <Section title="Firmas personalizadas" hint="Firmantes que pueden aparecer al pie de los libros legales y estados financieros.">
          <div style={TABLA.wrap}><table className="tabla" style={{ ...TABLA.table, tableLayout:'fixed' }}>
            <colgroup>
              <col style={{ width:'15%' }}/>
              <col style={{ width:'13%' }}/>
              <col style={{ width:'12%' }}/>
              <col style={{ width:'12%' }}/>
              <col/>
              <col style={{ width:64 }}/>
            </colgroup>
            <thead><tr style={TABLA.headRow}>
              {['Nombre del firmante','Número de identificación','Puesto','Usuario del sistema','Reportes asociados','Acciones'].map(h=>(
                <th key={h} style={TABLA.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {firmas.length===0 && (
                <tr><td colSpan={6} style={TABLA.empty}>Sin firmas registradas - creá la primera.</td></tr>
              )}
              {firmas.map(f=>(
                <tr key={f.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                  <td style={{ padding:'8px 12px', color:C.n900, verticalAlign:'top' }}>{f.nombre}</td>
                  <td style={{ padding:'8px 12px', fontFamily:F, verticalAlign:'top' }}>{f.documento}</td>
                  <td style={{ padding:'8px 12px', verticalAlign:'top' }}>{f.puesto || <span>-</span>}</td>
                  <td style={{ padding:'8px 12px', verticalAlign:'top' }}>
                    {f.usuarioId ? (USUARIOS_INIT.find(u=>u.id===f.usuarioId)?.descripcion ?? '-') : <span>Sin enlazar</span>}
                  </td>
                  <td style={{ padding:'8px 12px', verticalAlign:'top' }}>
                    {f.reportes.length===0
                      ? <span>Sin reportes</span>
                      : (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {[...f.reportes].sort((a,b)=>a.orden-b.orden).map(r=>(
                            <span key={r.reporteKey} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:radius.pill, background:C.brandBg, border:`1px solid ${C.brandBd}`, color:C.brand, fontSize:10.5, fontWeight:500, whiteSpace:'nowrap' }}>
                              {REPORTES_FIRMABLES.find(x=>x.key===r.reporteKey)?.label ?? r.reporteKey}
                              <span style={{ fontWeight:700 }}>{r.orden}°</span>
                            </span>
                          ))}
                        </div>
                      )}
                  </td>
                  <td style={{ padding:'8px 12px', verticalAlign:'top' }}>
                    <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                      <RowAction title="Editar" onClick={()=>setEditando(f)}><IcEdit className="w-3.5 h-3.5"/></RowAction>
                      <RowAction title="Eliminar" danger onClick={()=>setConfirmDel(f)}><IcTrash className="w-3.5 h-3.5"/></RowAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Section>

      {(creando || editando) && (
        <ModalFirma firma={editando ?? BLANK_FIRMA()} firmas={firmas} onClose={()=>{setEditando(null);setCreando(false);}} onGuardar={guardar}/>
      )}
      {confirmDel && (
        <ConfirmDelete label={confirmDel.nombre} onConfirm={()=>{ eliminarFirma(confirmDel); setConfirmDel(null); }} onCancel={()=>setConfirmDel(null)} />
      )}
    </div>
  );
}
