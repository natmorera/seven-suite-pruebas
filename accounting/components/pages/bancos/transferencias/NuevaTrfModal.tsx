'use client';
import { useState, useEffect } from 'react';
import { Toast } from '../../../ui/primitives';
import { C, USUARIO_ACTUAL, radius, shadow } from '../../../ui/tokens';
import { BRAND, CUENTAS_BANCO, ESTADO_STYLE, F, type Transferencia, fmt2, fromIso, tipoCambio, toIso } from './datos';
import { MonedaToggle, Pill } from './piezas';

// ── Modal: Nueva / editar transferencia ────────────────────────────────────────
export function NuevaTrfModal({ trfs, editing, onClose, onSave }: { trfs:Transferencia[]; editing?:Transferencia; onClose:()=>void; onSave:(t:Transferencia)=>void }) {
  const consec = editing ? editing.consecutivo.replace('TRF-','') : String(5095 + trfs.length);
  const [form, setForm] = useState({
    cuentaOrigen:  editing ? (CUENTAS_BANCO.find(c=>editing.cuentaOrigen.includes(c.label.split(' ')[0]))?.code ?? CUENTAS_BANCO[0].code) : CUENTAS_BANCO[0].code,
    monedaOrigen:  editing?.monedaOrigen ?? 'USD' as 'CRC'|'USD',
    cuentaDestino: editing ? (CUENTAS_BANCO.find(c=>editing.cuentaDestino.includes(c.label.split(' ')[0]))?.code ?? CUENTAS_BANCO[1].code) : CUENTAS_BANCO[1].code,
    monedaDestino: editing?.monedaDestino ?? 'CRC' as 'CRC'|'USD',
    importeOrigen: editing?.importeOrigen ?? 0, importeDestino: editing?.importeDestino ?? 0, comision: editing?.comision ?? 0,
    referOrigen: editing?.referOrigen ?? '', referDestino: editing?.referDestino ?? '',
    fecha: editing ? toIso(editing.fecha) : '',
    titulo: editing?.titulo ?? `Transferencia interbancaria - ${consec}`,
  });
  const [errores, setErrores] = useState<Record<string,boolean>>({});
  const [toast, setToast] = useState<string|null>(null);

  const symO = form.monedaOrigen  === 'USD' ? '$' : '₡';
  const symD = form.monedaDestino === 'USD' ? '$' : '₡';
  const tc = tipoCambio(form.monedaOrigen, form.monedaDestino);

  function sf<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm(p=>({...p,[k]:v})); }

  function tituloAuto() {
    sf('titulo', `Transferencia interbancaria - ${consec}`);
  }

  function validar(): boolean {
    const errs: Record<string,boolean> = {};
    if(!form.fecha) errs.fecha = true;
    if(!form.importeOrigen || form.importeOrigen<=0) errs.importeOrigen = true;
    if(!form.importeDestino || form.importeDestino<=0) errs.importeDestino = true;
    if(!form.referOrigen.trim()) errs.referOrigen = true;
    setErrores(errs);
    return Object.keys(errs).length===0;
  }

  useEffect(()=>{
    function esc(e:KeyboardEvent){if(e.key==='Escape')onClose();}
    document.addEventListener('keydown',esc);
    return ()=>document.removeEventListener('keydown',esc);
  },[onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={editing?'Editar transferencia':'Nueva transferencia interbancaria'}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}
      onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:14, width:'100%', maxWidth:1020, boxShadow:shadow.modal, fontFamily:F }}
        onClick={e=>e.stopPropagation()}>

        {/* Title */}
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:15, fontWeight:600 }}>{editing?'Editar transferencia interbancaria':'Nueva transferencia interbancaria'}</span>
          <span style={{ fontSize:13, color:BRAND, fontWeight:600 }}>{consec}</span>
          <Pill color={ESTADO_STYLE['Pendiente'][0]} bg={ESTADO_STYLE['Pendiente'][1]}>Pendiente</Pill>
          <button onClick={onClose} aria-label="Cerrar" style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:C.n700, fontSize:22, lineHeight:1 }}>×</button>
        </div>

        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 }}>
          {/* Título + fecha */}
          <div>
            <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>ORIGEN Y DESTINO</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 200px', gap:16 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Título / Leyenda</label>
                <input value={form.titulo} onChange={e=>sf('titulo',e.target.value)}
                  style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                <button onClick={tituloAuto} style={{ fontSize:11, color:BRAND, margin:'3px 0 0', cursor:'pointer', background:'none', border:'none', padding:0 }}>Auto-propuesto.</button>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Fecha <span style={{ color:C.error }}>*</span></label>
                <input type="date" value={form.fecha} onChange={e=>{sf('fecha',e.target.value);setErrores(p=>({...p,fecha:false}));}}
                  style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errores.fecha?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
            </div>
          </div>

          {/* ORIGEN */}
          <div>
            <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>ORIGEN</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 155px 165px 165px 1fr', gap:14, alignItems:'flex-start' }}>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Cuenta origen <span style={{ color:C.error }}>*</span></label>
                <select value={form.cuentaOrigen} onChange={e=>sf('cuentaOrigen',e.target.value)}
                  style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none' }}>
                  {CUENTAS_BANCO.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Moneda <span style={{ color:C.error }}>*</span></label>
                <MonedaToggle value={form.monedaOrigen} onChange={m=>sf('monedaOrigen',m)}/>
                <p style={{ fontSize:11, color:BRAND, margin:'3px 0 0' }}>Tipo de cambio: {tc.toFixed(4)}</p>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Importe origen <span style={{ color:C.error }}>*</span></label>
                <div style={{ display:'flex', alignItems:'center', height:36, padding:'0 10px', border:`1px solid ${errores.importeOrigen?C.error:C.n500}`, borderRadius:radius.md, gap:4 }}>
                  <span style={{ color:C.n700, fontSize:12 }}>{symO}</span>
                  <input type="number" min="0" step="0.01" value={form.importeOrigen||''} onChange={e=>{sf('importeOrigen',+e.target.value);setErrores(p=>({...p,importeOrigen:false}));}}
                    style={{ flex:1, border:'none', outline:'none', fontSize:12, fontFamily:F }}/>
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Comisión (opcional)</label>
                <div style={{ display:'flex', alignItems:'center', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, gap:4 }}>
                  <span style={{ color:C.n700, fontSize:12 }}>{symO}</span>
                  <input type="number" min="0" step="0.01" value={form.comision||''} onChange={e=>sf('comision',+e.target.value)}
                    style={{ flex:1, border:'none', outline:'none', fontSize:12, fontFamily:F }}/>
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Referencia bancaria <span style={{ color:C.error }}>*</span></label>
                <input value={form.referOrigen} onChange={e=>{sf('referOrigen',e.target.value);setErrores(p=>({...p,referOrigen:false}));}} placeholder="Nro. transacción del banco"
                  style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errores.referOrigen?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
              </div>
            </div>
          </div>

          {/* DESTINO */}
          <div>
            <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>DESTINO</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 155px 215px 1fr', gap:14, alignItems:'flex-start' }}>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Cuenta destino <span style={{ color:C.error }}>*</span></label>
                <select value={form.cuentaDestino} onChange={e=>sf('cuentaDestino',e.target.value)}
                  style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none' }}>
                  {CUENTAS_BANCO.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Moneda <span style={{ color:C.error }}>*</span></label>
                <MonedaToggle value={form.monedaDestino} onChange={m=>sf('monedaDestino',m)}/>
                <p style={{ fontSize:11, color:BRAND, margin:'3px 0 0' }}>Tipo de cambio: {(1/tc || 1).toFixed(4)}</p>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Importe destino <span style={{ color:C.error }}>*</span></label>
                <div style={{ display:'flex', alignItems:'center', height:36, padding:'0 10px', border:`1px solid ${errores.importeDestino?C.error:C.n500}`, borderRadius:radius.md, gap:4 }}>
                  <span style={{ color:C.n700, fontSize:12 }}>{symD}</span>
                  <input type="number" min="0" step="0.01" value={form.importeDestino||''} onChange={e=>{sf('importeDestino',+e.target.value);setErrores(p=>({...p,importeDestino:false}));}}
                    style={{ flex:1, border:'none', outline:'none', fontSize:12, fontFamily:F }}/>
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Referencia bancaria</label>
                <input value={form.referDestino} onChange={e=>sf('referDestino',e.target.value)} placeholder="Nro. transacción del banco"
                  style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div style={{ border:`1px solid ${C.n500}`, borderRadius:10, padding:'14px 18px' }}>
            <p style={{ fontSize:13, fontWeight:600, margin:'0 0 12px' }}>Resumen</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, fontSize:12 }}>
              <div>
                <span style={{ color:C.n700 }}>Origen</span>
                <p style={{ fontSize:16, fontWeight:700, margin:'4px 0 0', color:'#0F0F0F' }}>
                  {symO} {fmt2(form.importeOrigen)}
                </p>
              </div>
              <div style={{ textAlign:'center' }}>
                <span style={{ color:C.n700 }}>Comisión</span>
                <p style={{ fontSize:16, fontWeight:700, margin:'4px 0 0', color:'#0F0F0F' }}>
                  {fmt2(form.comision)}
                </p>
              </div>
              <div style={{ textAlign:'right' }}>
                <span style={{ color:C.n700 }}>Destino</span>
                <p style={{ fontSize:16, fontWeight:700, margin:'4px 0 0', color:BRAND }}>
                  {symD} {fmt2(form.importeDestino)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop:`1px solid ${C.n500}`, padding:'14px 24px', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:36, padding:'0 16px', border:'none', background:'transparent', color:C.error, cursor:'pointer', fontSize:13, fontFamily:F }}>Descartar</button>
          <button onClick={()=>{
            if(!validar()){ setToast('Completa los campos requeridos antes de continuar'); return; }
            const t: Transferencia = { id:editing?.id ?? Date.now(), consecutivo:editing?.consecutivo ?? `TRF-${consec}`, fecha:fromIso(form.fecha), estado:editing?.estado ?? 'Pendiente',
              cuentaOrigen:CUENTAS_BANCO.find(c=>c.code===form.cuentaOrigen)?.label??form.cuentaOrigen,
              monedaOrigen:form.monedaOrigen, importeOrigen:form.importeOrigen,
              cuentaDestino:CUENTAS_BANCO.find(c=>c.code===form.cuentaDestino)?.label??form.cuentaDestino,
              monedaDestino:form.monedaDestino, importeDestino:form.importeDestino,
              comision:form.comision, usuario:editing?.usuario ?? USUARIO_ACTUAL, referOrigen:form.referOrigen, referDestino:form.referDestino, titulo:form.titulo };
            onSave(t); onClose();
          }} style={{ height:36, padding:'0 20px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F }}>
            Aplicar operación
          </button>
        </div>
      </div>
      {toast && <Toast message={toast} type="error" onClose={()=>setToast(null)}/>}
    </div>
  );
}
