'use client';
import { useState, useEffect } from 'react';
import { PresenciaOperacion } from '@/components/ui/primitives';
import { C, radius, shadow, TABLA } from '@/components/ui/tokens';
import { Monto } from '@/components/ui/montos';
import { BRAND, type Cheque, F, RED, type Retencion, fmtN, inputStyle } from './datos';
import { Field } from './piezas';

// ── Estructura común de los modales ────────────────────────────────────────────────────────
export function ModalShell({ title, subtitle, onClose, children, footer, width=520, presencia }:{
  title:string; subtitle?:string; onClose:()=>void;
  children:React.ReactNode; footer?:React.ReactNode; width?:number; presencia?:boolean;
}) {
  useEffect(()=>{
    function esc(e:KeyboardEvent){if(e.key==='Escape')onClose();}
    document.addEventListener('keydown',esc);
    return ()=>document.removeEventListener('keydown',esc);
  },[onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose}
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:500,
      display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#FFFFFF',borderRadius:radius.lg,width,maxWidth:'95vw',maxHeight:'92vh',
        display:'flex',flexDirection:'column',boxShadow:shadow.modal,overflow:'hidden',fontFamily:F }}>
        <div style={{ padding:'16px 20px',borderBottom:'1px solid #ECECEC',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0 }}>
          <div>
            <p style={{ fontSize:14,fontWeight:600,color:'#0F0F0F',margin:0,fontFamily:F }}>{title}</p>
            {subtitle && <p style={{ fontSize:11,color:'#757575',margin:'2px 0 0',fontFamily:F }}>{subtitle}</p>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            {presencia && <PresenciaOperacion/>}
            <button onClick={onClose} aria-label="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',color:'#757575',fontSize:20,lineHeight:1,padding:'0 2px' }}>×</button>
          </div>
        </div>
        <div style={{ flex:1,overflowY:'auto' }}>{children}</div>
        {footer && <div style={{ padding:'12px 20px',borderTop:'1px solid #ECECEC',flexShrink:0 }}>{footer}</div>}
      </div>
    </div>
  );
}
// ── Modal para buscar una cuenta ────────────────────────────────────────────────────────
export function ModalBuscarCuenta({ onClose, onSelect }:{ onClose:()=>void; onSelect:(v:string)=>void }) {
  const [busq, setBusq] = useState('');
  const [sel, setSel] = useState('2001001000');
  const cuentas = [
    { codigo:'2001001000', cc:'-', titulo:'Compañía Licorera de Nicaragua (CLN)', mon:'₡', saldo:12797.72 },
    { codigo:'2001002000', cc:'-', titulo:'Optima Industrial S.A.',               mon:'₡', saldo:0 },
    { codigo:'2001003000', cc:'-', titulo:'FEMSA S.A.',                            mon:'₡', saldo:0 },
    { codigo:'2001004000', cc:'-', titulo:'Cristopher Martínez',                  mon:'₡', saldo:2939.50 },
    { codigo:'2001005000', cc:'-', titulo:'Molinos de Nicaragua S.A.',             mon:'₡', saldo:16008.00 },
  ];
  const filtradas = cuentas.filter(c=>
    !busq || c.titulo.toLowerCase().includes(busq.toLowerCase()) || c.codigo.includes(busq)
  );
  useEffect(()=>{
    function esc(e:KeyboardEvent){if(e.key==='Escape')onClose();}
    document.addEventListener('keydown',esc);
    return ()=>document.removeEventListener('keydown',esc);
  },[onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Buscar cuenta" onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#FFFFFF',borderRadius:radius.lg,width:700,boxShadow:'0 16px 48px rgba(0,0,0,.25)',fontFamily:F,overflow:'hidden' }}>
        <div style={{ padding:'16px 20px',borderBottom:'1px solid #ECECEC',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <span style={{ fontSize:14,fontWeight:600,color:'#0F0F0F',fontFamily:F }}>Buscar cuenta</span>
          <button onClick={onClose} aria-label="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',color:'#757575',fontSize:20 }}>×</button>
        </div>
        <div style={{ padding:'14px 20px 0' }}>
          <div style={{ display:'flex',gap:8,alignItems:'center',marginBottom:12 }}>
            <div style={{ position:'relative',flex:1 }}>
              <svg style={{ position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }} width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#757575" strokeWidth="1.4" strokeLinecap="round"><circle cx="6" cy="6" r="4"/><path d="M10.5 10.5L8.5 8.5"/></svg>
              <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="Título de cuenta, centro de cotos" aria-label="Título de cuenta, centro de cotos"
                style={{ width:'100%',height:34,paddingLeft:28,paddingRight:10,border:`1px solid ${BRAND}`,borderRadius:7,fontSize:12,fontFamily:F,outline:'none',boxSizing:'border-box' }}/>
            </div>
            <span style={{ fontSize:12,color:'#757575',fontFamily:F,whiteSpace:'nowrap' }}>{filtradas.length} resultado{filtradas.length!==1?'s':''}</span>
          </div>
          <table className="tabla" style={TABLA.table}>
            <thead>
              <tr style={TABLA.headRow}>
                <th style={{ width:28 }}></th>
                {['Cuenta','C. Costo/Gasto','Título de cuenta','Moneda','Saldo al período'].map((h,i)=>(
                  <th key={h} style={{ ...TABLA.th, textAlign:i>2?'right':'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(c=>(
                <tr key={c.codigo} onClick={()=>setSel(c.codigo)}
                  style={{ borderBottom:'1px solid #ECECEC', background:sel===c.codigo?'#FFF8EC':'#FFFFFF', cursor:'pointer' }}>
                  <td style={{ padding:'8px 12px' }}>
                    <div style={{ width:16, height:16,borderRadius:4,border:`1px solid ${sel===c.codigo?BRAND:'#ECECEC'}`,
                      background:sel===c.codigo?BRAND:'#FFFFFF',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      {sel===c.codigo&&<svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                    </div>
                  </td>
                  <td style={{ padding:'8px 12px', color:BRAND, fontFamily:F }}>{c.codigo}</td>
                  <td style={{ padding:'8px 12px', fontFamily:F }}>{c.cc}</td>
                  <td style={{ padding:'8px 12px', color:'#0F0F0F', fontFamily:F }}>{c.titulo}</td>
                  <td style={{ padding:'8px 12px', textAlign:'right', fontFamily:F }}>{c.mon}</td>
                  <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:c.saldo>0?BRAND:'#757575', fontFamily:F }}>{c.saldo>0?fmtN(c.saldo):'0.00'}</td>
                </tr>
              ))}
              {filtradas.length===0 && (
                <tr><td colSpan={6} style={TABLA.empty}>Sin coincidencias</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'12px 20px',borderTop:'1px solid #ECECEC',display:'flex',justifyContent:'flex-end',gap:8 }}>
          <button onClick={onClose} style={{ height:32,padding:'0 16px',border:'1px solid #ECECEC',borderRadius:7,background:'#FFFFFF',cursor:'pointer',fontSize:12,fontFamily:F,color:'#757575' }}>Cerrar</button>
          <button onClick={()=>onSelect(cuentas.find(c=>c.codigo===sel)?.titulo??'')}
            style={{ height:32,padding:'0 16px',border:'none',borderRadius:7,background:BRAND,color:'#FFFFFF',cursor:'pointer',fontSize:12,fontFamily:F,fontWeight:500 }}>Seleccionar</button>
        </div>
      </div>
    </div>
  );
}
// ── Modal para emitir un cheque ────────────────────────────────────────────────────────
export function ModalEmitir({ cheque, onClose, onConfirm }:{ cheque:Cheque; onClose:()=>void; onConfirm:(id:string,chequeNro:string,nombre:string)=>void }) {
  const [nombre, setNombre] = useState(cheque.proveedor);
  const [error, setError] = useState(false);
  const importeNeto = cheque.totalDoc - cheque.retencion;
  return (
    <ModalShell title="Emitir e imprimir cheque" subtitle={`Consecutivo ${cheque.consec} · ${cheque.banco} ${cheque.cuenta}`} onClose={onClose} width={380}
      footer={<div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
        <button onClick={onClose} style={{ height:32,padding:'0 14px',border:'1px solid #ECECEC',borderRadius:7,background:'#FFFFFF',cursor:'pointer',fontSize:12,fontFamily:F,color:'#757575' }}>Cancelar</button>
        <button onClick={()=>{
          if(!nombre.trim()){setError(true);return;}
          const nro = 'CK-'+Math.floor(20000+Math.random()*9000);
          onConfirm(cheque.id, nro, nombre);
        }} style={{ height:32,padding:'0 16px',border:'none',borderRadius:7,background:'#2E7D32',color:'#FFFFFF',cursor:'pointer',fontSize:12,fontFamily:F,fontWeight:500 }}>Confirmar y contabilizar</button>
      </div>}>
      <div style={{ padding:20,display:'flex',flexDirection:'column',gap:14 }}>
        {/* Resumen */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10 }}>
          {[{l:'Consecutivo',v:cheque.consec},{l:'Número de cheque',v:cheque.chequeNro ?? 'Se asignará al confirmar'},{l:'Importe',v:`₡ ${fmtN(importeNeto)}`}].map(({l,v})=>(
            <div key={l}>
              <p style={{ fontSize:10.5,color:'#757575',margin:'0 0 3px',fontFamily:F }}>{l}</p>
              <p style={{ fontSize:13,fontWeight:600,color:l==='Importe'?BRAND:'#0F0F0F',margin:0,fontFamily:F }}>{v}</p>
            </div>
          ))}
        </div>
        {/* Nombre */}
        <Field label="Nombre en el cheque" required>
          <input value={nombre} onChange={e=>{setNombre(e.target.value);setError(false);}} style={{...inputStyle(true), borderColor:error?RED:BRAND}}/>
          <p style={{ fontSize:10.5,color:'#757575',margin:'4px 0 0',fontFamily:F }}>Puede editarlo solo para efectos del formato impreso, sin modificar el proveedor del sistema.</p>
        </Field>
        {/* Leyenda */}
        <label style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,fontFamily:F,cursor:'pointer' }}>
          <div style={{ width:16, height:16,borderRadius:4,border:`1px solid ${BRAND}`,background:BRAND,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <span>Leyenda &quot;No Negociable&quot; <strong>se imprimirá en el cheque</strong></span>
        </label>
        {/* Impresora */}
        <Field label="Impresora">
          <p style={{ fontSize:13,fontWeight:500,color:'#0F0F0F',margin:'0 0 3px',fontFamily:F }}>Impresora Cheques - Recepción (HP LaserJet Pro)</p>
          <p style={{ fontSize:10.5,color:'#757575',margin:0,fontFamily:F }}>Al confirmar, el sistema enviará el cheque directamente a la impresora. El número de cheque se asignará en ese momento.</p>
        </Field>
      </div>
    </ModalShell>
  );
}
// ── Modal para anular un cheque ────────────────────────────────────────────────────────
export function ModalAnular({ cheque, onClose, onConfirm }:{ cheque:Cheque; onClose:()=>void; onConfirm:(id:string)=>void }) {
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0,10));
  const [errores, setErrores] = useState<{motivo?:boolean;fecha?:boolean}>({});
  const importeNeto = cheque.totalDoc - cheque.retencion;
  const numeroRef = cheque.chequeNro ?? cheque.consec;
  return (
    <ModalShell title="Anular cheque" subtitle="Esta acción no se puede deshacer." onClose={onClose} width={460}
      footer={<div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
        <button onClick={onClose} style={{ height:32,padding:'0 14px',border:'1px solid #ECECEC',borderRadius:7,background:'#FFFFFF',cursor:'pointer',fontSize:12,fontFamily:F,color:'#757575' }}>Cancelar</button>
        <button onClick={()=>{
          const errs:{motivo?:boolean;fecha?:boolean} = {};
          if(!motivo.trim()) errs.motivo = true;
          if(!fecha) errs.fecha = true;
          setErrores(errs);
          if(Object.keys(errs).length>0) return;
          onConfirm(cheque.id);
        }} style={{ height:32,padding:'0 16px',border:'none',borderRadius:7,background:RED,color:'#FFFFFF',cursor:'pointer',fontSize:12,fontFamily:F,fontWeight:500 }}>Confirmar anulación</button>
      </div>}>
      <div style={{ padding:20,display:'flex',flexDirection:'column',gap:14 }}>
        {/* Datos */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10 }}>
          {[{l:'Consecutivo',v:cheque.consec},{l:'Número de cheque',v:numeroRef},{l:'Importe',v:`₡ ${fmtN(importeNeto)}`}].map(({l,v})=>(
            <div key={l}>
              <p style={{ fontSize:10.5,color:'#757575',margin:'0 0 3px',fontFamily:F }}>{l}</p>
              <p style={{ fontSize:13,fontWeight:600,color:l==='Importe'?BRAND:'#0F0F0F',margin:0,fontFamily:F }}>{v}</p>
            </div>
          ))}
        </div>
        <Field label="Proveedor"><input readOnly value={cheque.proveedor} style={{ ...inputStyle(),background:'#F9F9F9' }}/></Field>
        <Field label="Fecha de anulación" required>
          <div style={{ position:'relative' }}>
            <input type="date" value={fecha} onChange={e=>{setFecha(e.target.value);setErrores(p=>({...p,fecha:false}));}} style={{ ...inputStyle(true),paddingRight:30,borderColor:errores.fecha?RED:BRAND }}/>
          </div>
        </Field>
        <Field label="Motivo de anulación" required>
          <textarea value={motivo} onChange={e=>{setMotivo(e.target.value);setErrores(p=>({...p,motivo:false}));}} rows={3}
            placeholder="Describa el motivo..." aria-label="Describa el motivo..."
            style={{ width:'100%',padding:'8px 10px',border:`1px solid ${errores.motivo?RED:(motivo?BRAND:'#ECECEC')}`,borderRadius:7,fontSize:12,fontFamily:F,resize:'vertical',outline:'none',boxSizing:'border-box' }}/>
          <p style={{ fontSize:10.5,color:'#757575',margin:'4px 0 0',fontFamily:F }}>Obligatorio. Quedará registrado en el historial del cheque.</p>
        </Field>
        {/* Efectos automáticos */}
        <div style={{ padding:'12px 14px',background:C.errorBg,border:`1px solid ${C.errorBorder}`,borderRadius:radius.md }}>
          <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:8 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={RED}><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3.5M7 9.5h.01" strokeLinecap="round"/></svg>
            <span style={{ fontSize:12,fontWeight:600,color:RED,fontFamily:F }}>Efectos automáticos al anular</span>
          </div>
          <ul style={{ margin:0,padding:'0 0 0 16px',fontSize:11,color:'#991B1B',fontFamily:F,lineHeight:1.7 }}>
            <li>El número <strong>{numeroRef}</strong> quedará inutilizable de forma permanente.</li>
            <li>Las facturas asociadas quedarán disponibles para otra operación.</li>
            <li>Si el cheque estaba contabilizado, el asiento se revertirá automáticamente.</li>
          </ul>
        </div>
      </div>
    </ModalShell>
  );
}
// ── Modal Retenciones: editor de las retenciones del cheque ──
export function ModalRetencionesEditor({ cheque, onClose, onSave }:{ cheque:Cheque; onClose:()=>void; onSave:(r:Retencion[])=>void }) {
  const [rows, setRows] = useState<Retencion[]>(cheque.retenciones);
  const [nuevoImp, setNuevoImp] = useState('');
  const total = rows.reduce((s,r)=>s+r.imp,0);

  function agregar(){
    const v = parseFloat(nuevoImp);
    if(!v || v<=0) return;
    setRows(p=>[...p,{ tipo:'01 - Retención 2% Compras/Servicios', imp:v }]);
    setNuevoImp('');
  }
  function quitar(i:number){ setRows(p=>p.filter((_,idx)=>idx!==i)); }

  return (
    <ModalShell title="Retenciones" subtitle={`Consecutivo ${cheque.consec} | Total: ₡ ${fmtN(total)}`} onClose={onClose} width={460}
      footer={<div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
        <button onClick={onClose} style={{ height:32,padding:'0 16px',border:'1px solid #ECECEC',borderRadius:7,background:'#FFFFFF',cursor:'pointer',fontSize:12,fontFamily:F,color:'#757575' }}>Cancelar</button>
        <button onClick={()=>onSave(rows)} style={{ height:32,padding:'0 16px',border:'none',borderRadius:7,background:BRAND,color:'#FFFFFF',cursor:'pointer',fontSize:12,fontFamily:F,fontWeight:500 }}>Guardar</button>
      </div>}>
      <div style={{ padding:20,display:'flex',flexDirection:'column',gap:12 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <span style={{ fontSize:12,fontWeight:500,color:'#0F0F0F',fontFamily:F }}>Retenciones aplicadas</span>
          <span style={{ fontSize:12,fontWeight:600,color:BRAND,fontFamily:F }}>Total: ₡ {fmtN(total)}</span>
        </div>
        <table className="tabla" style={TABLA.table}>
          <thead>
            <tr style={TABLA.headRow}>
              <th style={TABLA.th}>Tipo de retención</th>
              <th style={{ ...TABLA.th, textAlign:'right' }}>Importe</th>
              <th style={{ width:60 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} style={{ borderBottom:'1px solid #ECECEC' }}>
                <td style={{ padding:'8px 12px', color:'#0F0F0F', fontFamily:F }}>{r.tipo}</td>
                <td style={{ padding:'8px 12px', textAlign:'right', fontFamily:F }}>
                  <Monto sym="₡" valor={fmtN(r.imp)}/>
                </td>
                <td style={{ padding:'8px 12px' }}>
                  <button onClick={()=>quitar(i)} style={{ width:24,height:24,border:`1px solid ${C.errorBorder}`,borderRadius:4,background:C.errorBg,cursor:'pointer',color:RED,fontSize:14 }}>×</button>
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ padding:'8px 12px', fontFamily:F }}>01 - Retención 2% Compras/Servicios</td>
              <td style={{ padding:'8px 12px', textAlign:'right', fontFamily:F }}>
                <div style={{ display:'flex',alignItems:'center',gap:4,justifyContent:'space-between' }}>
                  <span>₡</span>
                  <input value={nuevoImp} onChange={e=>setNuevoImp(e.target.value)} placeholder="0.00" aria-label="0.00"
                    style={{ width:80,height:26,padding:'0 8px',border:'1px solid #ECECEC',borderRadius:5,fontSize:12,fontFamily:F,textAlign:'right',outline:'none' }}/>
                </div>
              </td>
              <td style={{ padding:'8px 12px' }}>
                <button onClick={agregar} style={{ width:24,height:24,border:'none',borderRadius:4,background:'#E8F5E9',cursor:'pointer',color:'#2E7D32',fontSize:14 }}>✓</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}
