'use client';
import { useState, useRef, useEffect } from 'react';
import { radius, shadow , C } from '@/components/ui/tokens';
import { BRAND, F, TIPO_BG, type TipoAsiento, type ToastType } from './datos';

export function ActBtn({ label, onClick, danger=false, children }: { label: string; onClick: (e: React.MouseEvent)=>void; danger?: boolean; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <TT label={label}>
      <button onClick={onClick}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{ width:27, height:27, borderRadius:radius.sm, border:'none', cursor:'pointer', display:'flex',
          alignItems:'center', justifyContent:'center', transition:'all .12s',
          background: hov ? (danger ? C.errorBg : '#F9F9F9') : 'transparent',
          color: hov ? (danger ? C.error : BRAND) : '#757575' }}>
        {children}
      </button>
    </TT>
  );
}
// ── Desplegable de filtro ────────────────────────────────────────────────────

export const IcCheck = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5 8l2 2 4-4"/></svg>;
export const IcEdit  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>;
export const IcBan   = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/></svg>;
export const IcCopy  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8"/></svg>;
export const IcClip  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M12.5 7.5l-5.5 5.5a4 4 0 01-5.66-5.66l6-6a2.67 2.67 0 013.77 3.77L5 11.23a1.33 1.33 0 01-1.89-1.89l5.5-5.5"/></svg>;
export const IcChev  = ({ up=false }: { up?: boolean }) => <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d={up?"M3.5 8.75L7 5.25L10.5 8.75":"M3.5 5.25L7 8.75L10.5 5.25"}/></svg>;
export function TipoPill({ tipo }: { tipo: TipoAsiento }) {
  return (
    <span style={{ width:22, height:22, borderRadius:radius.sm, display:'inline-flex', alignItems:'center', justifyContent:'center',
      background:TIPO_BG[tipo], color:'#FFFFFF', fontSize:10.5, fontWeight:700, fontFamily:F, flexShrink:0 }}>
      {tipo}
    </span>
  );
}
// ── Contenedor con tooltip ────────────────────────────────────────────────────────────
export function TT({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position:'relative', display:'inline-flex' }}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      {children}
      {show && (
        <div style={{ position:'absolute', bottom:'110%', left:'50%', transform:'translateX(-50%)',
          background:'#0F0F0F', color:'#FFFFFF', fontSize:10.5, fontFamily:F, padding:'4px 8px',
          borderRadius:5, whiteSpace:'nowrap', pointerEvents:'none', zIndex:9999,
          boxShadow:'0 2px 8px rgba(0,0,0,.25)' }}>
          {label}
        </div>
      )}
    </div>
  );
}
// ── Botón de acción con ícono ─────────────────────────────────────────────────────────
// ── Filtro de rango de fechas ──────────────────────────────────────────────────────────
export function DateFilter({ label, value, onChange, onClear }: { label: string; value: {from:string;to:string}; onChange: (v:{from:string;to:string})=>void; onClear:()=>void }) {
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
          background:active?C.brandBg:'#FFFFFF', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center',
          gap:5, color:active?BRAND:'#0F0F0F', fontFamily:F, fontWeight:active?500:400 }}>
        {label} <IcChev/>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:300,
          background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:10, width:240,
          boxShadow:shadow.panel, padding:12, fontFamily:F }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:11, fontWeight:600 }}>{label}</span>
            <button onClick={()=>{ setLocal({from:'',to:''}); onClear(); setOpen(false); }}
              style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer' }}>Limpiar</button>
          </div>
          <div style={{ marginBottom:8 }}>
            <label style={{ fontSize:11, color:'#757575', display:'block', marginBottom:3 }}>Desde</label>
            <input aria-label="Desde" type="date" value={local.from} onChange={e=>setLocal(p=>({...p,from:e.target.value}))}
              style={{ width:'100%', height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:7, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, color:'#757575', display:'block', marginBottom:3 }}>Hasta</label>
            <input aria-label="Hasta" type="date" value={local.to} onChange={e=>setLocal(p=>({...p,to:e.target.value}))}
              style={{ width:'100%', height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:7, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setOpen(false)} style={{ flex:1, height:30, border:`1px solid ${C.n500}`, borderRadius:7, background:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F }}>Cancelar</button>
            <button onClick={()=>{ onChange(local); setOpen(false); }} style={{ flex:1, height:30, border:'none', borderRadius:7, background:BRAND, color:'#FFFFFF', cursor:'pointer', fontSize:11, fontWeight:500, fontFamily:F }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}
export function ToastContainer({ toasts, onDismiss }: { toasts:{id:number;type:ToastType;msg:string}[]; onDismiss:(id:number)=>void }) {
  const COLORS: Record<ToastType,[string,string]> = { success:[C.success,C.successBg], error:[C.error,C.errorBg], info:['#378ADD','#EFF6FF'], warning:['#EF9F27','#FFFBEB'] };
  return (
    <div style={{ position:'fixed', bottom:48, right:20, display:'flex', flexDirection:'column', gap:8, zIndex:9999 }}>
      {toasts.map(t => {
        const [color,bg] = COLORS[t.type];
        return (
          <div key={t.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', background:bg, border:`1px solid ${color}30`, borderRadius:10, maxWidth:340, boxShadow:'0 4px 16px rgba(0,0,0,.12)', fontFamily:F }}>
            <span style={{ width:18,height:18,borderRadius:'50%',background:color,color:'#FFFFFF',fontSize:10.5,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>!</span>
            <span style={{ fontSize:12, color:'#0F0F0F', flex:1 }}>{t.msg}</span>
            <button onClick={()=>onDismiss(t.id)} style={{ background:'none',border:'none',cursor:'pointer',color:'#757575',padding:0,fontSize:14 }}>×</button>
          </div>
        );
      })}
    </div>
  );
}
