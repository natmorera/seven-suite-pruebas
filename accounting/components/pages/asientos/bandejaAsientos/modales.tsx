'use client';
import { useState } from 'react';
import { C, radius, shadow, TABLA } from '../../../ui/tokens';
import { type Asiento, BRAND, CONTABILIZAR_GREEN, F, MONEDAS, MON_SYM, type Moneda, type Programado, dmyToIso, fmt2, isoToDmy } from './datos';
import { IcCheck, IcClip, IcMail, IcPlus } from './piezas';

// ── Modal de adjuntos - 2 estados visuales: vacío (dropzone prominente) vs. con archivos (lista compacta + control secundario) ──
export function ModalAdjuntos({ archivos, onSave, onClose, title='Gestionar adjuntos' }: {
  archivos: string[]; onSave:(archivos:string[])=>void; onClose:()=>void; title?:string;
}) {
  const [local, setLocal] = useState<string[]>(archivos);
  function agregarFake() { setLocal(p=>[...p, `adjunto-${Date.now()}.pdf`]); }
  function quitar(f: string) { setLocal(p=>p.filter(x=>x!==f)); }
  const vacio = local.length === 0;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:380, padding:'20px', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>{title}</p>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',color:'#757575',fontSize:18 }}>×</button>
        </div>

        {vacio ? (
          // Estado vacío - dropzone prominente, sin lista debajo
          <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'28px 16px', border:`2px dashed ${C.n500}`, borderRadius:radius.md, cursor:'pointer', background:C.n200, marginBottom:14 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            <span style={{ fontSize:13, fontWeight:500, fontFamily:F }}>Clic o arrastrá para adjuntar</span>
            <span style={{ fontSize:11, color:C.n700, fontFamily:F }}>.pdf .jpg .png .xml .xlsx · 10 MB</span>
            <input type="file" style={{ display:'none' }} onChange={agregarFake}/>
          </label>
        ) : (
          // Estado con archivos - lista compacta arriba + control secundario (no dropzone gigante) para agregar más
          <>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
              {local.map(a=>(
                <div key={a} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F }}>
                  <IcClip/>
                  <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a}</span>
                  <button onClick={()=>quitar(a)} aria-label={`Quitar ${a}`} title={`Quitar ${a}`}
                    style={{ background:'none',border:'none',cursor:'pointer',color:C.error,fontSize:14,padding:0,lineHeight:1 }}>×</button>
                </div>
              ))}
            </div>
            <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, height:34, border:`1px dashed ${C.n500}`, borderRadius:radius.md, cursor:'pointer', fontSize:11, color:C.n700, fontFamily:F, marginBottom:14 }}>
              <IcPlus/> Agregar más archivos
              <input type="file" style={{ display:'none' }} onChange={agregarFake}/>
            </label>
          </>
        )}

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={()=>onSave(local)} style={{ height:34, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
// ── Modal enviar por correo ─────────────────────────────────────────────────────
export function ModalEnviarCorreo({ asiento, onSend, onClose }: {
  asiento: Asiento; onSend:(email:string, mensaje:string)=>void; onClose:()=>void;
}) {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const valido = /\S+@\S+\.\S+/.test(email.trim());

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:420, padding:'20px', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Enviar por correo</p>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',color:'#757575',fontSize:18 }}>×</button>
        </div>
        <p style={{ fontSize:11, color:'#757575', margin:'0 0 16px' }}>Asiento {asiento.consecutivo} · {asiento.titulo}</p>

        <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Correo destino <span style={{ color:C.error }}>*</span></label>
        <input type="email" autoFocus value={email} onChange={e=>setEmail(e.target.value)} placeholder="nombre@empresa.com"
          style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${email && !valido ? C.error : C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', marginBottom:12 }}/>

        <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Mensaje (opcional)</label>
        <textarea value={mensaje} onChange={e=>setMensaje(e.target.value)} rows={3} placeholder="Información adicional para el destinatario…"
          style={{ width:'100%', padding:'8px 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', resize:'vertical', marginBottom:16 }}/>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={()=>valido && onSend(email.trim(), mensaje.trim())} disabled={!valido}
            style={{ height:34, padding:'0 16px', background:valido?BRAND:'#ECECEC', color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:valido?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
            <IcMail/> Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
// ── Confirm modals ─────────────────────────────────────────────────────────────
export function AnularModal({ asientos, onConfirm, onClose }: { asientos:Asiento[]; onConfirm:(m:string)=>void; onClose:()=>void }) {
  const [motivo, setMotivo] = useState('');
  const n = asientos.length;
  const primero = asientos[0];
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:440, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Confirmar anulación</p>
            <p style={{ fontSize:11, color:'#757575', margin:'3px 0 0' }}>
              {n>1 ? `${n} asientos seleccionados` : `${primero.consecutivo} · ${primero.titulo.slice(0,35)}`}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#757575' }}>×</button>
        </div>
        <div style={{ padding:'16px 20px' }}>
          <div style={{ padding:'10px 12px', background:C.errorBg, borderRadius:radius.md, border:`1px solid ${C.errorBorder}`, marginBottom:14 }}>
            <p style={{ fontSize:12, color:C.error, margin:0 }}>
              {n>1
                ? <>Vas a anular <strong style={{ fontFamily:F }}>{n} asientos</strong>. Quedarán en el registro de anulados.</>
                : <>Esta acción anulará el asiento <strong style={{ fontFamily:F }}>{primero.consecutivo}</strong>. Quedará en el registro de anulados.</>}
            </p>
          </div>
          <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Motivo <span style={{ color:C.error }}>*</span></label>
          <textarea value={motivo} onChange={e=>setMotivo(e.target.value)} rows={3} placeholder="Ej. Error en cuenta contable…"
            style={{ width:'100%', padding:'8px 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, resize:'vertical', outline:'none', boxSizing:'border-box' }}/>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={()=>motivo.trim()&&onConfirm(motivo)} disabled={!motivo.trim()}
            style={{ height:34, padding:'0 16px', background:C.error, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F, opacity:motivo.trim()?1:.5 }}>
            {n>1 ? `Anular ${n} asientos` : 'Anular asiento'}
          </button>
        </div>
      </div>
    </div>
  );
}
export function ContabilizarModal({ asientos, onConfirm, onClose }: { asientos:Asiento[]; onConfirm:()=>void; onClose:()=>void }) {
  const n = asientos.length;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:560, maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <p style={{ fontSize:16, fontWeight:600, margin:0 }}>Confirmar contabilización</p>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar"
            style={{ width:28, height:28, border:`1px solid ${C.n500}`, borderRadius:7, background:'#FFFFFF', cursor:'pointer', color:'#757575', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          <table className="tabla" style={TABLA.table}>
            <thead style={{ position:'sticky', top:0, background:'#FFFFFF' }}>
              <tr style={TABLA.headRow}>
                <th style={TABLA.th}>N.º Asiento</th>
                <th style={TABLA.th}>Descripción</th>
                <th style={TABLA.th}>Moneda</th>
                <th style={{ ...TABLA.th, textAlign:'right' }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {asientos.map(a=>{
                const sym = MON_SYM[a.moneda];
                return (
                  <tr key={a.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                    <td style={{ padding:'10px 20px', color:BRAND, fontFamily:F }}>{a.consecutivo}</td>
                    <td style={{ padding:'10px 20px', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.titulo}</td>
                    <td style={{ padding:'10px 20px', color:'#0F0F0F' }}>{a.moneda}</td>
                    <td style={{ padding:'10px 20px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                        <span>{sym}</span>
                        <span>{fmt2(a.importe)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'14px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
          <button onClick={onClose} style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={onConfirm}
            style={{ height:36, padding:'0 18px', background:CONTABILIZAR_GREEN, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
            <IcCheck/> {n>1 ? `Contabilizar ${n} asientos` : 'Contabilizar'}
          </button>
        </div>
      </div>
    </div>
  );
}
// ── Modal de confirmación genérico (Eliminar programación / plantilla) ─────────
export function ConfirmModal({ title, message, onConfirm, onClose, confirmLabel='Eliminar' }: {
  title:string; message:string; onConfirm:()=>void; onClose:()=>void; confirmLabel?:string;
}) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:380, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>{title}</p>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#757575' }}>×</button>
        </div>
        <div style={{ padding:'16px 20px' }}>
          <p style={{ fontSize:12, color:'#0F0F0F', margin:0 }}>{message}</p>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={onConfirm} style={{ height:34, padding:'0 16px', background:C.error, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
export function EditProgramadoModal({ programado, onSave, onClose }: { programado:Programado; onSave:(nombre:string,frecuencia:string,proxima:string,moneda:Moneda)=>void; onClose:()=>void }) {
  const [nombre, setNombre] = useState(programado.nombre);
  const [frecuencia, setFrecuencia] = useState(programado.frecuencia);
  const [proximaIso, setProximaIso] = useState(dmyToIso(programado.proxima));
  const [moneda, setMoneda] = useState<Moneda>(programado.moneda);
  const FRECUENCIAS = ['Diaria','Semanal','Quincenal','Mensual','Bimestral','Trimestral','Semestral','Anual'];
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:400, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Editar programación</p>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#757575' }}>×</button>
        </div>
        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Nombre</label>
            <input value={nombre} onChange={e=>setNombre(e.target.value)} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Frecuencia</label>
              <select value={frecuencia} onChange={e=>setFrecuencia(e.target.value)} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}>
                {FRECUENCIAS.map(f=><option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Próxima ejecución</label>
              <input type="date" value={proximaIso} onChange={e=>setProximaIso(e.target.value)} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Moneda</label>
            <div style={{ display:'flex', gap:4 }}>
              {MONEDAS.map(m=>(
                <button key={m} onClick={()=>setMoneda(m)} style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500, background:moneda===m?BRAND:C.n200, color:moneda===m?'#FFFFFF':'#0F0F0F' }}>
                  {MON_SYM[m]} {m}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={()=>onSave(nombre.trim()||programado.nombre, frecuencia, proximaIso?isoToDmy(proximaIso):programado.proxima, moneda)} style={{ height:34, padding:'0 16px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
