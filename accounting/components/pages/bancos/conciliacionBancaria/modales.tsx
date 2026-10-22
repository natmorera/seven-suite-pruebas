'use client';
import { useState } from 'react';
import { PresenciaOperacion } from '@/components/ui/primitives';
import { C, radius, shadow } from '@/components/ui/tokens';
import { BRAND, type Conciliacion, F, fmt2, sym, useEscClose } from './datos';

// ── Modales ───────────────────────────────────────────────────────────────────
export function NuevaConciliacionModal({ onClose, onCreate }: { onClose:()=>void; onCreate:(c:{cuenta:string;moneda:'CRC'|'USD';desde:string;hasta:string;saldo:number})=>void }) {
  const CUENTAS = ['BNCR 015-004943-0 – CRC','BAC San José C.C. – USD'];
  const [form, setForm] = useState({ cuenta:CUENTAS[0], desde:'2026-06-01', hasta:'2026-06-30', saldo:'' });
  const [errores, setErrores] = useState<Record<string,boolean>>({});
  useEscClose(onClose);

  function sf<K extends keyof typeof form>(k:K, v:typeof form[K]){ setForm(p=>({...p,[k]:v})); }

  function crear(){
    const errs: Record<string,boolean> = {};
    if(!form.desde) errs.desde = true;
    if(!form.hasta) errs.hasta = true;
    if(form.desde && form.hasta && form.hasta < form.desde) errs.hasta = true;
    if(!form.saldo || isNaN(parseFloat(form.saldo))) errs.saldo = true;
    setErrores(errs);
    if(Object.keys(errs).length>0) return;
    onCreate({
      cuenta: form.cuenta,
      moneda: form.cuenta.includes('USD') ? 'USD' : 'CRC',
      desde: form.desde, hasta: form.hasta,
      saldo: parseFloat(form.saldo),
    });
    onClose();
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Nueva conciliación" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:380, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Nueva conciliación</p>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <PresenciaOperacion/>
            <button onClick={onClose} aria-label="Cerrar" style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.n700 }}>×</button>
          </div>
        </div>
        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Cuenta bancaria <span style={{ color:C.error }}>*</span></label>
            <select aria-label="Cuenta bancaria" value={form.cuenta} onChange={e=>sf('cuenta',e.target.value)} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none' }}>
              {CUENTAS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Período desde <span style={{ color:C.error }}>*</span></label>
              <input aria-label="Período desde" type="date" value={form.desde} onChange={e=>{sf('desde',e.target.value);setErrores(p=>({...p,desde:false}));}}
                style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errores.desde?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Período hasta <span style={{ color:C.error }}>*</span></label>
              <input aria-label="Período hasta" type="date" value={form.hasta} onChange={e=>{sf('hasta',e.target.value);setErrores(p=>({...p,hasta:false}));}}
                style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errores.hasta?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Saldo según banco <span style={{ color:C.error }}>*</span></label>
            <input aria-label="Saldo según banco" type="number" step="0.01" value={form.saldo} onChange={e=>{sf('saldo',e.target.value);setErrores(p=>({...p,saldo:false}));}}
              style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errores.saldo?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            <p style={{ fontSize:11, color:C.n700, margin:'5px 0 0' }}>Saldo del estado de cuenta bancario para este período. Se guardará automáticamente y no necesitarás ingresarlo de nuevo.</p>
          </div>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={crear} style={{ height:34, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>
            Crear conciliación
          </button>
        </div>
      </div>
    </div>
  );
}
export function ImportarArchivoModal({ con, onClose, onImportar }: { con:Conciliacion; onClose:()=>void; onImportar:()=>void }) {
  const [file,setFile] = useState<string|null>(null);
  useEscClose(onClose);
  return (
    <div role="dialog" aria-modal="true" aria-label="Importar archivo del banco" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:420, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Importar archivo del banco - Compensación automática</p>
          <button onClick={onClose} aria-label="Cerrar" style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.n700 }}>×</button>
        </div>
        <div style={{ padding:'20px' }}>
          <p style={{ fontSize:12, color:C.n700, marginBottom:4 }}>Cuenta bancaria</p>
          <p style={{ fontSize:12, fontWeight:500, color:'#0F0F0F', marginBottom:16 }}>{con.cuentaCode} – {con.cuentaBancaria} ({con.moneda})</p>
          <div onDrop={e=>{e.preventDefault();setFile(e.dataTransfer.files[0]?.name??null);}} onDragOver={e=>e.preventDefault()}
            style={{ border:'1.5px dashed #ECECEC', borderRadius:10, padding:'28px 20px', textAlign:'center', cursor:'pointer' }}
            onClick={()=>setFile('banco-'+con.consecutivo.toLowerCase()+'.xlsx')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#757575" strokeWidth="1.5" style={{ marginBottom:8 }}><path d="M12 16V4M8 8l4-4 4 4"/><path d="M3 20h18"/></svg>
            <p style={{ fontSize:12, color:C.n700, margin:0 }}>{file || 'Arrastrá el archivo aquí o hacé clic para seleccionar'}</p>
            <p style={{ fontSize:11, color:C.n700, margin:'4px 0 0' }}>Formatos aceptados: .xlsx, .xls, .csv, .txt, .pdf</p>
          </div>
          {file && <p style={{ fontSize:11, color:C.success, margin:'10px 0 0' }}>Se compensarán automáticamente los movimientos pendientes que calcen con el archivo.</p>}
          {file?.toLowerCase().endsWith('.pdf') && (
            <p style={{ fontSize:11, color:'#E07B00', margin:'6px 0 0' }}>
              Si el PDF es un estado de cuenta escaneado (imagen), la lectura puede salir incompleta. Para mejores resultados, preferir el .xlsx o .csv del banco cuando esté disponible.
            </p>
          )}
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={()=>{onImportar();onClose();}} disabled={!file} style={{ height:34, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F, opacity:file?1:.5 }}>
            Importar y conciliar
          </button>
        </div>
      </div>
    </div>
  );
}
export function CerrarConciliacionModal({ con, onClose, onCerrar }: { con:Conciliacion; onClose:()=>void; onCerrar:()=>void }) {
  useEscClose(onClose);
  const mov = con.movimientos;
  const conciliados = mov.filter(m=>m.estado==='Conciliado').length;
  const pendientes  = mov.filter(m=>m.estado==='Pendiente').length;
  const saldoBanco  = con.saldoBanco;
  const saldoLibros = con.saldoLibros;
  const diferencia  = Math.abs(saldoBanco - saldoLibros);
  const hasDif = diferencia > 0 || pendientes > 0;
  void conciliados;

  return (
    <div role="dialog" aria-modal="true" aria-label="Cerrar conciliación" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:440, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Cerrar conciliación</p>
          <button onClick={onClose} aria-label="Cerrar" style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.n700 }}>×</button>
        </div>
        <div style={{ padding:'16px 20px' }}>
          <p style={{ fontSize:12, color:'#0F0F0F', marginBottom:16 }}>
            Estás por cerrar la conciliación <strong>{con.consecutivo} - {con.cuentaBancaria}</strong> para el período <strong>{con.desde} – {con.hasta}</strong>. Una vez cerrada, los movimientos quedarán bloqueados.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
            {[
              ['Saldo según banco',   `${sym(con.moneda)} ${fmt2(saldoBanco)}`,  false],
              ['Saldo según libros',  `${sym(con.moneda)} ${fmt2(saldoLibros)}`, false],
              ['Depósitos conciliados', `${sym(con.moneda)} ${fmt2(mov.filter(m=>m.estado==='Conciliado'&&m.debitos>0).reduce((s,m)=>s+m.debitos,0))}`, false],
              ['Cheques conciliados',  `${sym(con.moneda)} ${fmt2(mov.filter(m=>m.estado==='Conciliado'&&m.creditos>0).reduce((s,m)=>s+m.creditos,0))}`, false],
              ['Movimientos pendientes', pendientes > 0 ? `${pendientes} sin conciliar` : `0 - Todo conciliado`, pendientes > 0],
              ['Diferencia final',    `${sym(con.moneda)} ${fmt2(diferencia)}`, diferencia > 0],
            ].map(([l,v,isRed]) => (
              <div key={l as string} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                <span style={{ color:C.n700 }}>{l as string}</span>
                <span style={{ fontWeight:600, color: isRed ? C.error : '#0F0F0F' }}>{v as string}</span>
              </div>
            ))}
          </div>
          {hasDif ? (
            <div style={{ padding:'10px 12px', background:C.errorBg, border:`1px solid ${C.errorBorder}`, borderRadius:radius.md, fontSize:12, color:'#C62828' }}>
              Hay movimientos sin conciliar y una diferencia pendiente. Puedes cerrar igualmente, pero quedará registrada la diferencia en el reporte.
            </div>
          ) : (
            <div style={{ padding:'10px 12px', background:C.successBg, border:`1px solid ${C.successBorder}`, borderRadius:radius.md, fontSize:12, color:C.success }}>
              La diferencia es {sym(con.moneda)} 0.00. La conciliación está lista para cerrar.
            </div>
          )}
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          {hasDif ? (
            <>
              <button onClick={onClose} style={{ height:34, padding:'0 14px', border:'none', background:'none', color:C.n700, cursor:'pointer', fontSize:12, fontFamily:F }}>Volver y revisar</button>
              <button onClick={()=>{ onCerrar(); onClose(); }} style={{ height:34, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Cerrar con diferencia</button>
            </>
          ) : (
            <>
              <button onClick={onClose} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
              <button onClick={()=>{ onCerrar(); onClose(); }} style={{ height:34, padding:'0 14px', background:C.success, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Confirmar cierre</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
export function CorteSaldoModal({ con, onClose, onAplicar }: { con:Conciliacion; onClose:()=>void; onAplicar:(fechaCorte:string, saldo:number)=>void }) {
  const [fecha, setFecha] = useState(()=>{
    const m = con.hasta.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
    return m ? `20${m[3]}-${m[2]}-${m[1]}` : '';
  });
  const [saldo, setSaldo] = useState(String(con.saldoBanco||''));
  const [errores, setErrores] = useState<{fecha?:boolean;saldo?:boolean}>({});
  useEscClose(onClose);

  function usarUltimoDia(){
    const m = con.hasta.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
    if(m) setFecha(`20${m[3]}-${m[2]}-${m[1]}`);
  }

  function aceptar(){
    const errs: {fecha?:boolean;saldo?:boolean} = {};
    if(!fecha) errs.fecha = true;
    if(!saldo || isNaN(parseFloat(saldo))) errs.saldo = true;
    setErrores(errs);
    if(Object.keys(errs).length>0) return;
    onAplicar(fecha, parseFloat(saldo));
    onClose();
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Corte de saldo" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:420, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Corte de saldo</p>
          <button onClick={onClose} aria-label="Cerrar" style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.n700 }}>×</button>
        </div>
        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Cuenta</label>
            <input aria-label="Cuenta" readOnly value={`${con.cuentaCode} – ${con.cuentaBancaria}`} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', background:C.n200, boxSizing:'border-box' }}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Fecha de corte <span style={{ color:C.error }}>*</span></label>
            <input aria-label="Fecha de corte" type="date" value={fecha} onChange={e=>{setFecha(e.target.value);setErrores(p=>({...p,fecha:false}));}} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errores.fecha?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            <button onClick={usarUltimoDia} style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'4px 0', fontFamily:F }}>Usar el último día del período ({con.hasta})</button>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Saldo en banco <span style={{ color:C.error }}>*</span></label>
            <input aria-label="Saldo en banco" type="number" step="0.01" value={saldo} onChange={e=>{setSaldo(e.target.value);setErrores(p=>({...p,saldo:false}));}} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errores.saldo?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            <p style={{ fontSize:11, color:C.n700, margin:'4px 0 0' }}>Este saldo se usará como punto de partida. Los movimientos anteriores a esta fecha quedarán marcados como conciliados automáticamente.</p>
          </div>
          <div style={{ padding:'10px 12px', background:C.errorBg, border:`1px solid ${C.errorBorder}`, borderRadius:radius.md }}>
            <p style={{ fontSize:12, color:C.error, margin:0 }}>Esta acción es irreversible. Los movimientos anteriores a la fecha de corte se marcarán como conciliados y no podrán modificarse.</p>
          </div>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={aceptar} style={{ height:34, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Aceptar corte</button>
        </div>
      </div>
    </div>
  );
}
