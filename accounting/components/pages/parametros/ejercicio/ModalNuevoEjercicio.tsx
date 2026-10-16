'use client';
import { useState } from 'react';
import { Modal, RowAction } from '../../../ui/primitives';
import { FormField, Input, Select } from '../../../ui/formulario';
import { radius, TABLA } from '../../../ui/tokens';
import { C } from '../../../ui/tokens';
import { IcTrash } from '../../../ui/icons';
import { type Ejercicio, F, type Periodo, diffDiasInclusive, formatDMY, makePeriodos, parseDMY } from './datos';

export function ModalNuevoEjercicio({ ejercicios, onClose, onCrear }: {
  ejercicios: Ejercicio[]; onClose:()=>void; onCrear:(e:Ejercicio)=>void;
}) {
  const sugerido = Math.max(...ejercicios.map(e=>e.anio)) + 1;
  const [anio, setAnio] = useState(sugerido);
  const [modo, setModo] = useState<'copiar'|'manual'>('copiar');
  const [deAnio, setDeAnio] = useState(ejercicios[0]?.anio ?? sugerido-1);
  const [fechaInicio, setFechaInicio] = useState(`01/01/${sugerido}`);
  const yaExiste = ejercicios.some(e=>e.anio===anio);
  const preview = makePeriodos(anio).map(p=>({ ...p, estado: p.orden===0?'Apertura' as const : p.orden===13?'Cierre' as const : 'Pendiente' as const }));

  // ── Constructor de períodos manual (Issue #12) ──────────────────────────
  const [periodosManual, setPeriodosManual] = useState<Periodo[]>([]);
  const [pTitulo, setPTitulo] = useState('');
  const [pDesde, setPDesde] = useState(`1/1/${anio}`);
  const [pHasta, setPHasta] = useState('');
  const pDesdeD = parseDMY(pDesde);
  const pHastaD = parseDMY(pHasta);
  const pValido = !!pTitulo.trim() && !!pDesdeD && !!pHastaD && pHastaD.getTime() >= pDesdeD.getTime();

  function agregarPeriodo() {
    if (!pValido || !pDesdeD || !pHastaD) return;
    const nuevo: Periodo = { orden: periodosManual.length+1, desde:pDesde.trim(), hasta:pHasta.trim(), titulo:pTitulo.trim(), dias:diffDiasInclusive(pDesdeD,pHastaD), estado:'Pendiente' };
    setPeriodosManual(prev => [...prev, nuevo]);
    setPTitulo('');
    // Precarga la fecha de inicio del siguiente período justo después de donde terminó este.
    const siguiente = new Date(pHastaD); siguiente.setDate(siguiente.getDate()+1);
    setPDesde(formatDMY(siguiente));
    setPHasta('');
  }
  function quitarPeriodoManual(orden:number) {
    setPeriodosManual(prev => prev.filter(p=>p.orden!==orden).map((p,i)=>({ ...p, orden:i+1 })));
  }

  const ultimaHastaManual = periodosManual.length ? periodosManual[periodosManual.length-1].hasta : `1/1/${anio}`;
  const previewManual: Periodo[] = [
    { orden:0, desde:`1/1/${anio}`, hasta:`1/1/${anio}`, titulo:'Apertura', dias:0, estado:'Apertura' },
    ...periodosManual,
    { orden:periodosManual.length+1, desde:ultimaHastaManual, hasta:`31/12/${anio}`, titulo:'Cierre', dias:0, estado:'Cierre' },
  ];

  function aceptar() {
    if (yaExiste) return;
    if (modo==='manual' && periodosManual.length===0) return;
    const periodosFinal = modo==='manual' ? previewManual : preview;
    onCrear({ id:Date.now(), anio, empresa: ejercicios[0]?.empresa ?? 'Hotel Fortuna', codigo: ejercicios[0]?.codigo ?? '001',
      nPagCheque: ejercicios[0]?.nPagCheque ?? 1, inicio:`Apertura ${anio-1}`, cierre:`Cierre ${anio}`, estado:'activo', periodos: periodosFinal });
  }

  const bloqueado = yaExiste || (modo==='manual' && periodosManual.length===0);

  return (
    <Modal open title="Nuevo ejercicio fiscal" onClose={onClose} wide
      footer={
        <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:'1px solid #ECECEC', background:'#FFFFFF', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={aceptar} disabled={bloqueado} style={{ height:34, padding:'0 16px', background:bloqueado?'#ECECEC':C.brand, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:bloqueado?'default':'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Aceptar</button>
        </div>
      }>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', gap:20, alignItems:'flex-end', flexWrap:'wrap' }}>
          <FormField label="Ejercicio" required error={yaExiste?'Ya existe un ejercicio para ese año.':undefined}>
            <Input value={String(anio)} onChange={v=>setAnio(parseInt(v,10)||sugerido)} />
          </FormField>
          <div style={{ display:'flex', gap:16, paddingBottom:6 }}>
            {(['copiar','manual'] as const).map(m=>(
              <label key={m} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, fontFamily:F }}>
                <input type="radio" checked={modo===m} onChange={()=>setModo(m)} style={{ accentColor:C.brand }}/>
                {m==='copiar'?'Copiar de otro ejercicio':'Manual'}
              </label>
            ))}
          </div>
        </div>
        {modo==='copiar' && (
          <FormField label="De" hint="Ejercicio del que se toma la estructura de meses.">
            <Select value={String(deAnio)} onChange={v=>setDeAnio(parseInt(v,10))} options={ejercicios.map(e=>({ value:String(e.anio), label:String(e.anio) }))}/>
          </FormField>
        )}
        <FormField label="Fecha inicio">
          <Input value={fechaInicio} onChange={setFechaInicio} placeholder="DD/MM/AAAA" />
        </FormField>

        {modo==='manual' && (
          <div style={{ padding:'10px 12px', background:C.n200, borderRadius:radius.md, display:'flex', flexDirection:'column', gap:10 }}>
            <p style={{ fontSize:11, color:C.n700, margin:0, lineHeight:1.6 }}>
              Agregá los períodos uno por uno. Al agregar uno, la fecha "Desde" del siguiente ya viene precargada justo después de donde terminó el anterior.
            </p>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap' }}>
              <div style={{ flex:'1 1 140px' }}>
                <p style={{ fontSize:10, color:C.n700, margin:'0 0 4px' }}>Título</p>
                <input value={pTitulo} onChange={e=>setPTitulo(e.target.value)} placeholder="Ej. Enero"
                  style={{ width:'100%', height:32, padding:'0 9px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div style={{ flex:'0 0 130px' }}>
                <p style={{ fontSize:10, color:C.n700, margin:'0 0 4px' }}>Desde</p>
                <input value={pDesde} onChange={e=>setPDesde(e.target.value)} placeholder="D/M/AAAA"
                  style={{ width:'100%', height:32, padding:'0 9px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div style={{ flex:'0 0 130px' }}>
                <p style={{ fontSize:10, color:C.n700, margin:'0 0 4px' }}>Hasta</p>
                <input value={pHasta} onChange={e=>setPHasta(e.target.value)} placeholder="D/M/AAAA"
                  style={{ width:'100%', height:32, padding:'0 9px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <button onClick={agregarPeriodo} disabled={!pValido}
                style={{ height:32, padding:'0 14px', border:'none', borderRadius:radius.sm, background:pValido?C.brand:'#ECECEC', color:'#FFFFFF', cursor:pValido?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F }}>
                Agregar período
              </button>
            </div>
            {periodosManual.length===0 && (
              <p style={{ fontSize:11, color:C.error, margin:0 }}>Todavía no agregaste ningún período.</p>
            )}
          </div>
        )}

        <div>
          <p style={{ fontSize:11, fontWeight:600, color:C.n700, margin:'0 0 6px' }}>Períodos que se van a crear</p>
          <div style={{ ...TABLA.wrap, maxHeight:260, overflowY:'auto' }}>
            <table className="tabla" style={TABLA.table}>
              <thead style={{ position:'sticky', top:0, background:'#FFFFFF' }}>
                <tr style={TABLA.headRow}>
                  {['Orden','Desde','Hasta','Título', ...(modo==='manual'?['']:[])].map(h=>(
                    <th key={h} style={TABLA.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(modo==='manual' ? previewManual : preview).map(p=>(
                  <tr key={p.orden} style={{ borderBottom:'1px solid #ECECEC' }}>
                    <td style={{ padding:'8px 12px' }}>{p.orden}</td>
                    <td style={{ padding:'8px 12px' }}>{p.desde}</td>
                    <td style={{ padding:'8px 12px' }}>{p.hasta}</td>
                    <td style={{ padding:'8px 12px' }}>{p.titulo}</td>
                    {modo==='manual' && (
                      <td style={{ padding:'8px 12px', textAlign:'right' }}>
                        {p.estado==='Pendiente' && (
                          <div style={{ display:'flex', justifyContent:'flex-end' }}><RowAction title="Quitar" danger onClick={()=>quitarPeriodoManual(p.orden)}><IcTrash className="w-3.5 h-3.5"/></RowAction></div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
