'use client';
import React, { useState, useRef, useEffect } from 'react';
import { C, radius, shadow } from '../../../ui/tokens';
import { GRUPOS_NIIF } from '../../catalogo/catalogoData';
import { BRAND, CUENTAS_LINEA, type DateRange, F, FECHA_PRESETS, IMPORTE_DEFAULT, IMPORTE_MAX, type ImporteRange, MON_SYM, TIPO_BG, type TipoAsiento, computeFechaPreset, detectFechaPreset, fmtDMY, fmtInt } from './datos';

// ── Selector de cuenta para líneas del asiento - nombre visible, búsqueda y filtro por grupo NIIF ──
export function CuentaLineaSelect({ value, onChange }: { value:string; onChange:(code:string)=>void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [gruposSel, setGruposSel] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(''); } }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const seleccionada = CUENTAS_LINEA.find(c=>c.code===value);
  const filtradas = CUENTAS_LINEA.filter(c =>
    (!q || c.code.includes(q) || c.nombre.toLowerCase().includes(q.toLowerCase())) &&
    (gruposSel.size===0 || gruposSel.has(c.grupo)));

  function toggleGrupo(v: string) {
    setGruposSel(p => { const n = new Set(p); n.has(v) ? n.delete(v) : n.add(v); return n; });
  }

  return (
    <div ref={ref} style={{ position:'relative', width:210 }}>
      <button type="button" onClick={()=>setOpen(o=>!o)}
        style={{ width:'100%', height:30, padding:'0 24px 0 7px', border:`1px solid ${value?BRAND:C.n500}`, borderRadius:5,
          fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box', textAlign:'left', background:'#FFFFFF', cursor:'pointer',
          color:value?'#0F0F0F':C.n700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', position:'relative' }}>
        {seleccionada ? <><span style={{ color:BRAND, fontWeight:500 }}>{seleccionada.code}</span> - {seleccionada.nombre}</> : 'Seleccionar…'}
        <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round"
          style={{ position:'absolute', right:7, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:400, background:'#FFFFFF', border:`1px solid #ECECEC`,
          borderRadius:radius.md, boxShadow:shadow.panel, width:300, padding:8 }}>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por código o nombre…"
            style={{ width:'100%', height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box', marginBottom:8 }}/>

          {/* Filtro por grupo NIIF */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
            {GRUPOS_NIIF.map(g=>{
              const active = gruposSel.has(g.value);
              return (
                <button key={g.value} type="button" onClick={()=>toggleGrupo(g.value)}
                  style={{ height:22, padding:'0 8px', border:`1px solid ${active?BRAND:C.n500}`, borderRadius:radius.pill,
                    background:active?C.brandBg:'#FFFFFF', color:active?BRAND:C.n700, fontSize:10, fontFamily:F,
                    cursor:'pointer', whiteSpace:'nowrap' }}>
                  {g.label}
                </button>
              );
            })}
            {gruposSel.size>0 && (
              <button type="button" onClick={()=>setGruposSel(new Set())}
                style={{ height:22, padding:'0 8px', border:'none', borderRadius:radius.pill, background:'none', color:C.error, fontSize:10, fontFamily:F, cursor:'pointer' }}>
                × Limpiar
              </button>
            )}
          </div>

          <div style={{ maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:1, borderTop:`1px solid #ECECEC`, paddingTop:4 }}>
            {filtradas.length===0 && <p style={{ fontSize:11, color:C.n700, textAlign:'center', padding:'10px 0', margin:0 }}>Sin resultados.</p>}
            {filtradas.map(c=>(
              <button key={c.code} type="button" onClick={()=>{ onChange(c.code); setOpen(false); setQ(''); }}
                style={{ display:'block', textAlign:'left', padding:'7px 8px', border:'none', borderRadius:5,
                  background:value===c.code?C.brandBg:'transparent', cursor:'pointer', fontSize:11, fontFamily:F }}>
                <span style={{ color:BRAND, fontWeight:500 }}>{c.code}</span> - <span style={{ color:'#0F0F0F' }}>{c.nombre}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
// ── Icons ──────────────────────────────────────────────────────────────────────
export const IcX     = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>;
export const IcCheck = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5 8l2 2 4-4"/></svg>;
export const IcEdit  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>;
export const IcBan   = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/></svg>;
export const IcCopy  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8"/></svg>;
export const IcPrint = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2h8v4"/><rect x="1" y="6" width="14" height="6" rx="1.5"/><path d="M4 9v5h8V9"/></svg>;
export const IcClip  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M12.5 7.5l-5.5 5.5a4 4 0 01-5.66-5.66l6-6a2.67 2.67 0 013.77 3.77L5 11.23a1.33 1.33 0 01-1.89-1.89l5.5-5.5"/></svg>;
export const IcMail  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="3" width="13" height="10" rx="1.5"/><path d="M2 4l6 5 6-5"/></svg>;
export const IcChev  = ({ up=false }) => <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d={up?"M3.5 8.75L7 5.25L10.5 8.75":"M3.5 5.25L7 8.75L10.5 5.25"}/></svg>;
// Íconos de las acciones de fila de Programados y Plantillas
export const IcEditar   = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>;
export const IcEliminar = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.5 7v4M9.5 7v4"/></svg>;
export const IcUsar     = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M8 5v6M5 8h6"/></svg>;
export const IcRestaurar = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 8a5.5 5.5 0 1 0 1.7-4"/><path d="M2.5 2.5v3h3"/></svg>;
export const IcPlus  = () => <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>;
export function TipoPill({ tipo }: { tipo: TipoAsiento }) {
  return (
    <span style={{ width:22, height:22, borderRadius:radius.sm, display:'inline-flex', alignItems:'center', justifyContent:'center',
      background:TIPO_BG[tipo], color:'#FFFFFF', fontSize:10, fontWeight:700, fontFamily:F, flexShrink:0 }}>
      {tipo}
    </span>
  );
}
// ── Tooltip wrapper ────────────────────────────────────────────────────────────
export function TT({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position:'relative', display:'inline-flex' }}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}
      onFocus={()=>setShow(true)} onBlur={()=>setShow(false)}>
      {children}
      {show && (
        <div style={{ position:'absolute', bottom:'110%', left:'50%', transform:'translateX(-50%)',
          background:'#0F0F0F', color:'#FFFFFF', fontSize:10, fontFamily:F, padding:'4px 8px',
          borderRadius:5, whiteSpace:'nowrap', pointerEvents:'none', zIndex:9999,
          boxShadow:'0 2px 8px rgba(0,0,0,.25)' }}>
          {label}
        </div>
      )}
    </div>
  );
}
// ── Action icon button ─────────────────────────────────────────────────────────
export function ActBtn({ label, onClick, danger=false, children }: { label: string; onClick: (e: React.MouseEvent)=>void; danger?: boolean; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <TT label={label}>
      <button onClick={onClick} aria-label={label} title={label}
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
export function DateFilter({ label, value, onChange, onClear }: { label: string; value: DateRange; onChange: (v:DateRange)=>void; onClear:()=>void }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<DateRange>(value);
  const [preset, setPreset] = useState<string|null>(detectFechaPreset(value));
  const ref = useRef<HTMLDivElement>(null);
  const active = !!(value.from || value.to);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function applyPreset(id: string) { setLocal(computeFechaPreset(id)); setPreset(id); }
  function editManual(field: 'from'|'to', v: string) { setLocal(p=>({...p,[field]:v})); setPreset(null); }

  const days = local.from && local.to ? Math.round((new Date(local.to+'T00:00:00').getTime() - new Date(local.from+'T00:00:00').getTime())/86400000) + 1 : 0;
  const summary = local.from && local.to ? `${fmtDMY(local.from)} - ${fmtDMY(local.to)} · ${days} día${days===1?'':'s'}` : '';

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>{ setLocal(value); setPreset(detectFechaPreset(value)); setOpen(v=>!v); }}
        style={{ height:32, padding:'0 12px', border:`1px solid ${active?BRAND:C.n500}`, borderRadius:4,
          background:active?C.brandBg:'#FFFFFF', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center',
          gap:5, color:active?BRAND:'#0F0F0F', fontFamily:F, fontWeight:active?500:400 }}>
        {label} <IcChev/>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:300,
          background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:10, width:280,
          boxShadow:shadow.panel, fontFamily:F }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderBottom:`1px solid ${C.n500}` }}>
            <span style={{ fontSize:13, fontWeight:600 }}>Período de fecha</span>
            <button onClick={()=>{ setLocal({from:'',to:''}); setPreset(null); onClear(); setOpen(false); }}
              style={{ fontSize:12, color:C.error, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Limpiar</button>
          </div>
          <div style={{ padding:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              {FECHA_PRESETS.map(p=>(
                <button key={p.id} onClick={()=>applyPreset(p.id)}
                  style={{ height:34, borderRadius:radius.md, border:`1px solid ${preset===p.id?BRAND:C.n500}`,
                    background:preset===p.id?C.brandBg:'#FFFFFF', color:preset===p.id?BRAND:'#0F0F0F',
                    fontWeight:preset===p.id?600:400, cursor:'pointer', fontSize:12, fontFamily:F }}>
                  {p.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize:10, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>Rango personalizado</p>
            <div style={{ marginBottom:8 }}>
              <label style={{ fontSize:11, color:'#757575', display:'block', marginBottom:3 }}>Desde</label>
              <input type="date" value={local.from} onChange={e=>editManual('from', e.target.value)}
                style={{ width:'100%', height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:7, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#757575', display:'block', marginBottom:3 }}>Hasta</label>
              <input type="date" value={local.to} onChange={e=>editManual('to', e.target.value)}
                style={{ width:'100%', height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:7, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            </div>
            {summary && (
              <div style={{ padding:'8px 10px', background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:radius.md, fontSize:12, color:BRAND, fontWeight:500 }}>
                {summary}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, padding:'12px 14px', borderTop:`1px solid ${C.n500}` }}>
            <button onClick={()=>setOpen(false)} style={{ flex:1, height:32, border:`1px solid ${C.n500}`, borderRadius:7, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
            <button onClick={()=>{ onChange(local); setOpen(false); }} style={{ flex:1, height:32, border:'none', borderRadius:7, background:BRAND, color:'#FFFFFF', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}
export function ImporteFilter({ value, onChange, onClear }: { value: ImporteRange; onChange: (v:ImporteRange)=>void; onClear:()=>void }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<ImporteRange>(value);
  const ref = useRef<HTMLDivElement>(null);
  const active = value.min > 0 || value.max < IMPORTE_MAX;

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const sym = MON_SYM[local.moneda];
  const pct = Math.min(100, Math.max(0, (local.max / IMPORTE_MAX) * 100));

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>{ setLocal(value); setOpen(v=>!v); }}
        style={{ height:32, padding:'0 12px', border:`1px solid ${active?BRAND:C.n500}`, borderRadius:4,
          background:active?C.brandBg:'#FFFFFF', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center',
          gap:5, color:active?BRAND:'#0F0F0F', fontFamily:F, fontWeight:active?500:400 }}>
        Importe <IcChev/>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:300,
          background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:10, width:300,
          boxShadow:shadow.panel, fontFamily:F }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderBottom:`1px solid ${C.n500}` }}>
            <span style={{ fontSize:13, fontWeight:600 }}>Rango de importe</span>
            <button onClick={()=>{ setLocal(IMPORTE_DEFAULT); onClear(); setOpen(false); }}
              style={{ fontSize:12, color:C.error, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Limpiar</button>
          </div>
          <div style={{ padding:14 }}>
            <p style={{ fontSize:10, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>Moneda de referencia</p>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {(['CRC','USD'] as const).map(mo=>(
                <button key={mo} onClick={()=>setLocal(p=>({...p,moneda:mo}))}
                  style={{ flex:1, height:32, borderRadius:radius.md, border:`1px solid ${local.moneda===mo?BRAND:C.n500}`,
                    background:local.moneda===mo?C.brandBg:'#FFFFFF', color:local.moneda===mo?BRAND:'#0F0F0F',
                    fontWeight:local.moneda===mo?600:400, cursor:'pointer', fontSize:12, fontFamily:F }}>
                  {mo==='CRC'?`${MON_SYM.CRC} CRC`:`${MON_SYM.USD} USD`}
                </button>
              ))}
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:11 }}>
                <span style={{ color:'#757575' }}>{sym} 0</span>
                <span style={{ color:BRAND, fontWeight:600 }}>{sym} {fmtInt(local.max)}</span>
                <span style={{ color:'#757575' }}>{sym} {fmtInt(IMPORTE_MAX)}</span>
              </div>
              <div style={{ position:'relative', height:6, borderRadius:3, background:'#ECECEC' }}>
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${pct}%`, background:BRAND, borderRadius:3 }}/>
              </div>
              <input type="range" min={0} max={IMPORTE_MAX} step={1000} value={local.max}
                onChange={e=>setLocal(p=>({...p, max:Number(e.target.value)}))}
                style={{ width:'100%', marginTop:6, accentColor:BRAND }}/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:11, color:'#757575', display:'block', marginBottom:3 }}>Mínimo</label>
                <input type="number" min={0} value={local.min} onChange={e=>setLocal(p=>({...p,min:Number(e.target.value)||0}))}
                  style={{ width:'100%', height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:7, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#757575', display:'block', marginBottom:3 }}>Máximo</label>
                <input type="number" min={0} value={local.max} onChange={e=>setLocal(p=>({...p,max:Number(e.target.value)||0}))}
                  style={{ width:'100%', height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:7, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, padding:'12px 14px', borderTop:`1px solid ${C.n500}` }}>
            <button onClick={()=>setOpen(false)} style={{ flex:1, height:32, border:`1px solid ${C.n500}`, borderRadius:7, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
            <button onClick={()=>{ onChange(local); setOpen(false); }} style={{ flex:1, height:32, border:'none', borderRadius:7, background:BRAND, color:'#FFFFFF', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}
