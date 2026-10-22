'use client';
import { useState } from 'react';
import { Section, RowAction } from '@/components/ui/primitives';
import { Button } from '@/components/ui/formulario';
import { radius, TABLA, PAGE_PAD , C } from '@/components/ui/tokens';
import { IcEdit } from '@/components/ui/icons';
import { type EnlaceAjuste, OPERACIONES_AJUSTE } from '../datos/ajustes';
import { TBL } from '../catalogoTableStyles';
import { BLANK_EA, F } from './datos';
import { ModalMovimientoAjuste } from './modales';
import { useSenalAgregar } from '@/components/ui/useSenalAgregar';

export function TabAjustes({ rows, onChange, addSignal, onAddHandled, saveSignal, onSaveHandled }: {
  rows: EnlaceAjuste[];
  onChange: (rows: EnlaceAjuste[]) => void;
  addSignal?: number;
  onAddHandled?: () => void;
  saveSignal?: number;
  onSaveHandled?: () => void;
}) {
  const [delId, setDelId] = useState<string|null>(null);
  const [editing, setEditing] = useState<EnlaceAjuste|null>(null);

  function guardar(e: EnlaceAjuste) {
    onChange(rows.some(r=>r.id===e.id) ? rows.map(r=>r.id===e.id?e:r) : [...rows, e]);
    setEditing(null);
  }

  // "Agregar movimiento" y "Guardar configuración" viven en el
  // header de la página (PageHeader) - esta pestaña reacciona a esas señales
  // por prop, abriendo el modal de alta en vez de insertar una fila vacía.
  useSenalAgregar(addSignal, onAddHandled, () => { setEditing(BLANK_EA()); });
  useSenalAgregar(saveSignal, onSaveHandled, () => {});

  return (
    <div style={{ flex:1, overflowY:'auto', padding:PAGE_PAD }}><Section title="Movimientos de ajuste" hint="Comisiones, retenciones y otros ajustes que se aplican al registrar cobros y pagos.">
      <div style={{ ...TBL.wrap }}>
        <table className="tabla" style={TABLA.table}>
          <thead>
            <tr style={TABLA.headRow}>
              {['Tipo de movimiento','Efecto','Aplica a','Cuenta','%','Acciones'].map(h=>(
                <th key={h} style={{ ...TBL.th }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length===0 && (
              <tr><td colSpan={6} style={{ ...TBL.empty }}>Sin movimientos de ajuste configurados. Agregá el primero.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom:'1px solid #ECECEC', background:'#FFFFFF' }}>
                <td style={{ padding:'8px 12px', color:C.n900 }}>{r.tipoMovimiento || <span style={{ fontWeight:400 }}>Sin nombre</span>}</td>
                <td style={{ padding:'8px 12px' }}>
                  <span style={{ fontSize:10.5, fontWeight:600, padding:'2px 8px', borderRadius:radius.pill, background:r.signo===1?'#E8F5E9':'#FDEAEA', color:r.signo===1?'#1B5E20':'#B71C1C' }}>
                    {r.signo===1 ? 'Suma (+)' : 'Resta (-)'}
                  </span>
                </td>
                <td style={{ padding:'8px 12px', minWidth:150 }}>
                  {r.aplicaA.length===0 ? <span>-</span> : (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {r.aplicaA.map(op=>(
                        <span key={op} style={{ fontSize:10.5, padding:'1px 7px', borderRadius:radius.pill, background:C.n200, border:`1px solid ${C.n500}`, color:C.n700, whiteSpace:'nowrap' }}>
                          {OPERACIONES_AJUSTE.find(o=>o.value===op)?.label ?? op}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td style={{ padding:'8px 12px' }}>
                  {r.cuentaCode ? <>{r.cuentaCode} <span>· {r.cuentaNombre}</span></> : <span>Sin cuenta</span>}
                </td>
                <td style={{ padding:'8px 12px', color:C.n900 }}>
                  {r.porcentaje !== undefined ? `${r.porcentaje}%` : <span style={{ fontWeight:400 }}>-</span>}
                </td>
                <td style={{ padding:'8px 12px', textAlign:'center' }}>
                  <div style={{ display:'flex', gap:5, justifyContent:'center' }}>
                    <RowAction title="Editar" onClick={()=>setEditing(r)}><IcEdit className="w-3.5 h-3.5"/></RowAction>
                    {/* confirmación antes de eliminar */}
                    <button onClick={() => setDelId(r.id)}
                      style={{ width:23, height:23, border:'1px solid #F5A5A5', borderRadius:4, background:C.errorBg, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#B71C1C' }}>
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ModalMovimientoAjuste enlace={editing} onClose={()=>setEditing(null)} onGuardar={guardar}/>
      )}

      {delId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#FFFFFF', borderRadius:10, padding:21, maxWidth:380, width:'90%', fontFamily:F }}>
            <h3 style={{ fontSize:13, fontWeight:500, margin:'0 0 9px' }}>Eliminar movimiento de ajuste</h3>
            <p style={{ fontSize:11, color:C.n700, marginBottom:17 }}>
              ¿Eliminar este movimiento de ajuste{rows.find(r=>r.id===delId)?.tipoMovimiento ? ` ("${rows.find(r=>r.id===delId)?.tipoMovimiento}")` : ''}? Esta acción no se puede deshacer.
            </p>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:7 }}>
              <Button variant="secondary" onClick={()=>setDelId(null)}>Cancelar</Button>
              <Button variant="danger" onClick={()=>{ onChange(rows.filter(r=>r.id!==delId)); setDelId(null); }}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </Section></div>
  );
}
