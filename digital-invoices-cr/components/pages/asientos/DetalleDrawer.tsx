'use client';
import { useState, useRef, useEffect } from 'react';
import { fmtNum, FONT, radius, shadow, FilterDropdown } from '../../ui/primitives';

function fmt2(n: number) { return fmtNum(n, 2); }
import { C, PERMISOS_ACTUAL } from '../../ui/primitives';
import ModalDescontabilizar, { IcDescontabilizar, ConciliacionAfectada } from './DescontabilizarModal';

const F = FONT;
const BRAND = '#A77600';

export type TipoAsiento = 'A' | 'M' | 'I' | 'D' | 'P';

type Moneda = 'CRC' | 'USD';


interface LineaAsiento { id: number; cuenta: string; descripcion: string; cCostos: string; debe: number; haber: number; }

interface Asiento {
  id: number; tipo: TipoAsiento; origen: string; fecha: string; consecutivo: string;
  titulo: string; moneda: Moneda; importe: number; usuario: string; documento: string;
  observacion: string; contabilizado: boolean; lineas: LineaAsiento[];
  archivos?: string[]; historial?: { color: string; texto: string; fecha: string; usuario: string }[];
  motivoAnulacion?: string;
  conciliacion?: ConciliacionAfectada | null;
}

const TIPOS_LABEL: Record<TipoAsiento, string> = { A:'Automático', M:'Manual', I:'Importado', D:'Duplicado', P:'Plantilla' };
const TIPO_BG:    Record<TipoAsiento, string>  = { A:'#3B82F6', M:'#A77600', I:'#7C3AED', D:'#6B7280', P:'#059669' };
const MON_SYM:    Record<Moneda, string>        = { CRC:'₡', USD:'$' };



function ActBtn({ label, onClick, danger=false, children }: { label: string; onClick: (e: React.MouseEvent)=>void; danger?: boolean; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <TT label={label}>
      <button onClick={onClick}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{ width:27, height:27, borderRadius:radius.sm, border:'none', cursor:'pointer', display:'flex',
          alignItems:'center', justifyContent:'center', transition:'all .12s',
          background: hov ? (danger ? C.errorBg : '#F5F5F5') : 'transparent',
          color: hov ? (danger ? C.error : BRAND) : '#9E9E9E' }}>
        {children}
      </button>
    </TT>
  );
}

// ── Filter dropdown generic ────────────────────────────────────────────────────

const IcCheck = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5 8l2 2 4-4"/></svg>;
const IcEdit  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>;
const IcBan   = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/></svg>;
const IcCopy  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8"/></svg>;
const IcClip  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M12.5 7.5l-5.5 5.5a4 4 0 01-5.66-5.66l6-6a2.67 2.67 0 013.77 3.77L5 11.23a1.33 1.33 0 01-1.89-1.89l5.5-5.5"/></svg>;

const IcChev  = ({ up=false }: { up?: boolean }) => <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d={up?"M3.5 8.75L7 5.25L10.5 8.75":"M3.5 5.25L7 8.75L10.5 5.25"}/></svg>;

function TipoPill({ tipo }: { tipo: TipoAsiento }) {
  return (
    <span style={{ width:22, height:22, borderRadius:radius.sm, display:'inline-flex', alignItems:'center', justifyContent:'center',
      background:TIPO_BG[tipo], color:'#fff', fontSize:10, fontWeight:700, fontFamily:F, flexShrink:0 }}>
      {tipo}
    </span>
  );
}

// ── Tooltip wrapper ────────────────────────────────────────────────────────────
function TT({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position:'relative', display:'inline-flex' }}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      {children}
      {show && (
        <div style={{ position:'absolute', bottom:'110%', left:'50%', transform:'translateX(-50%)',
          background:'#0F0F0F', color:'#fff', fontSize:10, fontFamily:F, padding:'4px 8px',
          borderRadius:5, whiteSpace:'nowrap', pointerEvents:'none', zIndex:9999,
          boxShadow:'0 2px 8px rgba(0,0,0,.25)' }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ── Action icon button ─────────────────────────────────────────────────────────
// ── Date range filter ──────────────────────────────────────────────────────────
function DateFilter({ label, value, onChange, onClear }: { label: string; value: {from:string;to:string}; onChange: (v:{from:string;to:string})=>void; onClear:()=>void }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  const active = !!(value.from || value.to);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>{ setLocal(value); setOpen(v=>!v); }}
        style={{ height:32, padding:'0 12px', border:`1px solid ${active?BRAND:C.n500}`, borderRadius:4,
          background:active?C.brandBg:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center',
          gap:5, color:active?BRAND:'#0F0F0F', fontFamily:F, fontWeight:active?500:400 }}>
        {label} <IcChev/>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:300,
          background:'#fff', border:`1px solid ${C.n500}`, borderRadius:10, width:240,
          boxShadow:shadow.panel, padding:12, fontFamily:F }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:11, fontWeight:600 }}>{label}</span>
            <button onClick={()=>{ setLocal({from:'',to:''}); onClear(); setOpen(false); }}
              style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer' }}>Limpiar</button>
          </div>
          <div style={{ marginBottom:8 }}>
            <label style={{ fontSize:11, color:'#757575', display:'block', marginBottom:3 }}>Desde</label>
            <input type="date" value={local.from} onChange={e=>setLocal(p=>({...p,from:e.target.value}))}
              style={{ width:'100%', height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:7, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, color:'#757575', display:'block', marginBottom:3 }}>Hasta</label>
            <input type="date" value={local.to} onChange={e=>setLocal(p=>({...p,to:e.target.value}))}
              style={{ width:'100%', height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:7, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setOpen(false)} style={{ flex:1, height:30, border:`1px solid ${C.n500}`, borderRadius:7, background:'#fff', cursor:'pointer', fontSize:11, fontFamily:F }}>Cancelar</button>
            <button onClick={()=>{ onChange(local); setOpen(false); }} style={{ flex:1, height:30, border:'none', borderRadius:7, background:BRAND, color:'#fff', cursor:'pointer', fontSize:11, fontWeight:500, fontFamily:F }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────
type ToastType = 'success'|'error'|'info'|'warning';
function ToastContainer({ toasts, onDismiss }: { toasts:{id:number;type:ToastType;msg:string}[]; onDismiss:(id:number)=>void }) {
  const COLORS: Record<ToastType,[string,string]> = { success:[C.success,C.successBg], error:[C.error,C.errorBg], info:['#378ADD','#EFF6FF'], warning:['#EF9F27','#FFFBEB'] };
  return (
    <div style={{ position:'fixed', bottom:48, right:20, display:'flex', flexDirection:'column', gap:8, zIndex:9999 }}>
      {toasts.map(t => {
        const [color,bg] = COLORS[t.type];
        return (
          <div key={t.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', background:bg, border:`1px solid ${color}30`, borderRadius:10, maxWidth:340, boxShadow:'0 4px 16px rgba(0,0,0,.12)', fontFamily:F }}>
            <span style={{ width:18,height:18,borderRadius:'50%',background:color,color:'#fff',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>!</span>
            <span style={{ fontSize:12, color:'#0F0F0F', flex:1 }}>{t.msg}</span>
            <button onClick={()=>onDismiss(t.id)} style={{ background:'none',border:'none',cursor:'pointer',color:'#757575',padding:0,fontSize:14 }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

// ── Right drawer: detalle asiento ──────────────────────────────────────────────

function DetalleDrawer({ asiento, anulado=false, onClose, onAnular, onDuplicar, onContabilizar, onRestaurar, tienePermisoDescontabilizar = PERMISOS_ACTUAL.descontabilizarAsientos }: {
  asiento: Asiento; anulado?: boolean; onClose:()=>void;
  onAnular?:()=>void; onDuplicar?:()=>void;
  onContabilizar?:(payload?:{motivo:string; desconciliar:boolean})=>void;
  onRestaurar?:()=>void; tienePermisoDescontabilizar?: boolean;
}) {
  const sym = MON_SYM[asiento.moneda];
  const totalDebe  = asiento.lineas.reduce((s,l)=>s+l.debe,0);
  const totalHaber = asiento.lineas.reduce((s,l)=>s+l.haber,0);
  const [obsOpen,  setObsOpen]  = useState(true);
  const [histOpen, setHistOpen] = useState(true);
  const [filesOpen,setFilesOpen]= useState(true);
  const [showDescontabilizar, setShowDescontabilizar] = useState(false);

  return (
    <>
      {/* Overlay semi-transparente */}
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.2)', zIndex:998 }}/>
      {/* Panel derecho */}
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:640, background:'#fff',
        boxShadow:'-8px 0 32px rgba(0,0,0,.14)', zIndex:999, display:'flex', flexDirection:'column',
        fontFamily:F, overflowY:'auto' }}>

        {/* Header */}
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:16, fontWeight:600, margin:0, color:'#0F0F0F' }}>{asiento.titulo}</p>
              <p style={{ fontSize:12, color:BRAND, margin:'3px 0 0', fontFamily:F }}>{asiento.consecutivo}</p>
            </div>
            <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'#757575',fontSize:22,padding:4,lineHeight:1,marginTop:-4 }}>×</button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
            <TipoPill tipo={asiento.tipo}/>
            <span style={{ fontSize:12, color:'#757575' }}>{TIPOS_LABEL[asiento.tipo]} · {asiento.origen}</span>
            <span style={{ marginLeft:'auto', fontSize:11, padding:'2px 10px', borderRadius:radius.pill, fontWeight:500,
              background: anulado?C.errorBg: asiento.contabilizado?C.successBg:'#FFFBEB',
              color: anulado?C.error: asiento.contabilizado?C.success:'#A07000',
              border: `1px solid ${anulado?`${C.errorBorder}`:asiento.contabilizado?`${C.successBorder}`:'#EEB30030'}` }}>
              {anulado?'Anulado':asiento.contabilizado?'Contabilizado':'Pendiente'}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, flexShrink:0 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px 16px', fontSize:12 }}>
            {[['N.º Asiento',asiento.consecutivo,true],['Fecha',asiento.fecha.split('-').reverse().join('/'),false],
              ['Moneda',`${asiento.moneda} ${sym}`,false],['Tasa','516.54000000',false],['Libro','General',false],['Empresa','Hotel Fortuna S.A.',false]]
              .map(([l,v,mono])=>(
              <div key={l as string}>
                <p style={{ fontSize:10, color:'#757575', margin:'0 0 2px' }}>{l as string}</p>
                <p style={{ fontSize:12, fontWeight:500, color:'#0F0F0F', margin:0, fontFamily: F }}>{v as string}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Líneas */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}` }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', margin:'0 0 10px' }}>Líneas del asiento</p>
          {asiento.lineas.length === 0
            ? <p style={{ fontSize:12, color:'#757575', margin:0 }}>Sin líneas registradas.</p>
            : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
                  {['Cuenta','Descripción','C.C','Debe','Haber'].map(h=>(
                    <th key={h} style={{ padding:'6px 8px', textAlign:h==='Debe'||h==='Haber'?'right':'left', fontSize:11, fontWeight:500, color:'#757575' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {asiento.lineas.map(l=>(
                  <tr key={l.id} style={{ borderBottom:`1px solid #F5F5F5` }}>
                    <td style={{ padding:'6px 8px', color:BRAND, fontFamily:F, fontSize:11 }}>{l.cuenta}</td>
                    <td style={{ padding:'6px 8px', fontSize:11 }}>{l.descripcion}</td>
                    <td style={{ padding:'6px 8px', fontSize:11, color:'#757575' }}>{l.cCostos||'-'}</td>
                    <td style={{ padding:'6px 8px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:90 }}>
                        <span style={{ color:l.debe>0?C.n700:'#D0D0D0' }}>{sym}</span>
                        <span style={{ fontSize:11, color:l.debe>0?'#0F0F0F':'#D0D0D0' }}>{l.debe>0?fmt2(l.debe):'-'}</span>
                      </div>
                    </td>
                    <td style={{ padding:'6px 8px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:90 }}>
                        <span style={{ color:l.haber>0?C.n700:'#D0D0D0' }}>{sym}</span>
                        <span style={{ fontSize:11, color:l.haber>0?'#0F0F0F':'#D0D0D0' }}>{l.haber>0?fmt2(l.haber):'-'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:`2px solid ${C.n500}` }}>
                  <td colSpan={3} style={{ padding:'6px 8px', fontWeight:600, fontSize:12 }}>Totales</td>
                  <td style={{ padding:'6px 8px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:90 }}>
                        <span style={{ color:C.n700, fontWeight:600 }}>{sym}</span>
                        <span style={{ fontWeight:700, fontSize:12 }}>{fmt2(totalDebe)}</span>
                      </div>
                    </td>
                  <td style={{ padding:'6px 8px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:90 }}>
                        <span style={{ color:C.n700, fontWeight:600 }}>{sym}</span>
                        <span style={{ fontWeight:700, fontSize:12 }}>{fmt2(totalHaber)}</span>
                      </div>
                    </td>
                </tr>
                {Math.abs(totalDebe-totalHaber)>0.01 && (
                  <tr><td colSpan={5} style={{ padding:'4px 8px', color:C.error, fontSize:11 }}>⚠ Desbalanceado: {sym} {fmt2(Math.abs(totalDebe-totalHaber))}</td></tr>
                )}
              </tfoot>
            </table>
          )}
        </div>

        {/* Observación */}
        {asiento.observacion && (
          <div style={{ padding:'12px 24px', borderBottom:`1px solid ${C.n500}` }}>
            <button onClick={()=>setObsOpen(v=>!v)} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:12, fontWeight:500, color:'#0F0F0F' }}>
              Observación <IcChev up={obsOpen}/>
            </button>
            {obsOpen && <p style={{ fontSize:12, color:'#0F0F0F', margin:'8px 0 0', lineHeight:1.6 }}>{asiento.observacion}</p>}
          </div>
        )}

        {/* Archivos */}
        {(asiento.archivos?.length ?? 0) > 0 && (
          <div style={{ padding:'12px 24px', borderBottom:`1px solid ${C.n500}` }}>
            <button onClick={()=>setFilesOpen(v=>!v)} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:12, fontWeight:500, color:'#0F0F0F', marginBottom:8 }}>
              Archivos adjuntos ({asiento.archivos!.length}) <IcChev up={filesOpen}/>
            </button>
            {filesOpen && (asiento.archivos!.map(f=>(
              <span key={f} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, padding:'3px 10px', border:`1px solid ${C.n500}`, borderRadius:radius.pill, marginRight:6, marginBottom:4 }}>
                <IcClip/> {f}
              </span>
            )))}
          </div>
        )}

        {/* Historial */}
        {(asiento.historial?.length ?? 0) > 0 && (
          <div style={{ padding:'12px 24px', borderBottom:`1px solid ${C.n500}` }}>
            <button onClick={()=>setHistOpen(v=>!v)} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:12, fontWeight:500, color:'#0F0F0F', marginBottom:8 }}>
              Historial <IcChev up={histOpen}/>
            </button>
            {histOpen && asiento.historial!.map((h,i)=>(
              <div key={i} style={{ display:'flex', gap:8, marginBottom:10 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:h.color, flexShrink:0, marginTop:2 }}/>
                <div>
                  <p style={{ margin:0, fontSize:12, color:'#0F0F0F' }}>{h.texto}</p>
                  <p style={{ margin:0, fontSize:10, color:'#757575' }}>{h.fecha} - {h.usuario}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer actions */}
        <div style={{ borderTop:`1px solid ${C.n500}`, padding:'14px 24px', display:'flex', gap:8, justifyContent:'flex-end', flexShrink:0 }}>
          {anulado ? (
            <button onClick={onRestaurar} style={{ height:34, padding:'0 16px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F }}>
              ↺ Restaurar asiento
            </button>
          ) : asiento.contabilizado ? (
            <>
              <button onClick={()=>setShowDescontabilizar(true)} style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, background:'#fff', color:'#0F0F0F', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F, display:'flex', alignItems:'center', gap:7 }}>
                <IcDescontabilizar/>
                Descontabilizar (enviar pendiente)
              </button>
            </>
          ) : (
            <>
              {onAnular    && <button onClick={onAnular}    style={{ height:34, padding:'0 14px', border:`1px solid ${C.brandBd}`, background:'transparent', color:BRAND, borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>⊘ Anular</button>}
              {onDuplicar  && <button onClick={onDuplicar}  style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, background:'#fff', color:'#0F0F0F', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>Duplicar</button>}
              <button onClick={()=>{}} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, background:'#fff', color:'#0F0F0F', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>Imprimir</button>
              {onContabilizar && (
                <button onClick={()=>onContabilizar()} style={{ height:34, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Contabilizar</button>
              )}
            </>
          )}
        </div>
      </div>

      {showDescontabilizar && (
        <ModalDescontabilizar
          consecutivo={asiento.consecutivo}
          titulo={asiento.titulo}
          conciliacion={asiento.conciliacion}
          tienePermiso={tienePermisoDescontabilizar}
          onClose={()=>setShowDescontabilizar(false)}
          onConfirm={(payload)=>{ setShowDescontabilizar(false); onContabilizar?.(payload); }}
        />
      )}
    </>
  );
}

// ── Crear asiento form ─────────────────────────────────────────────────────────

export default DetalleDrawer;
