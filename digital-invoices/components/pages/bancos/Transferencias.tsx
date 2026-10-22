'use client';
import ComprobanteOperacionModal from '@/components/ui/documento/ComprobanteOperacion';
import { armarComprobantes } from '@/components/ui/documento/comprobantes';
import { useEmpresaDoc } from '@/components/ui/documento/useEmpresaDoc';
import React, { useState, useRef, useEffect } from 'react';
import { C, fmtNum, Toast, USUARIO_ACTUAL, Pagination, PAGE_PAD, BotonExportarUnico, ExportListModal, FONT, radius, shadow, PageHeader, SearchInput, FilterDropdown } from '../../ui/primitives';
import { simboloLocal } from '@/lib/paisActual';

const F = FONT;
const BRAND = C.brand;
function fmt2(n: number) { return fmtNum(n, 2); }

// Tipo de cambio de referencia (mock) usado cuando origen y destino están en monedas distintas.
const FX_USD_CRC = 545.00;
function tipoCambio(monedaOrigen: 'CRC'|'USD', monedaDestino: 'CRC'|'USD'): number {
  if (monedaOrigen === monedaDestino) return 1;
  return monedaOrigen === 'USD' ? FX_USD_CRC : 1 / FX_USD_CRC;
}

type EstadoTrf = 'Pendiente' | 'Contabilizado' | 'Anulados';

interface Transferencia {
  id: number; consecutivo: string; fecha: string; estado: EstadoTrf;
  cuentaOrigen: string; monedaOrigen: 'CRC'|'USD'; importeOrigen: number;
  cuentaDestino: string; monedaDestino: 'CRC'|'USD'; importeDestino: number;
  comision: number; usuario: string; referOrigen: string; referDestino: string;
  titulo: string;
}

const CUENTAS_BANCO = [
  { code:'12002004', label:'BAC San José C.C. – USD (12002004)' },
  { code:'12001003', label:'BAC San José C.C. – CRC (12001003)' },
  { code:'10020001', label:'BNCR CRC 015-004943-0' },
  { code:'10020002', label:'BCR USD 001-04745094' },
  { code:'10020003', label:'BCR CRC 001-0252067-2' },
];

const TRFS_INIT: Transferencia[] = [
  { id:1, consecutivo:'TRF-5095', fecha:'02/06/26', estado:'Pendiente',
    cuentaOrigen:'BAC San José – USD',  monedaOrigen:'USD',  importeOrigen:20000,
    cuentaDestino:'BAC San José – CRC', monedaDestino:'CRC', importeDestino:0,
    comision:0, usuario:'jperez',  referOrigen:'', referDestino:'', titulo:'Transferencia interbancaria - 5095' },
  { id:2, consecutivo:'TRF-5088', fecha:'28/05/26', estado:'Contabilizado',
    cuentaOrigen:'BNCR CRC 015-004943-0', monedaOrigen:'CRC', importeOrigen:20000,
    cuentaDestino:'BAC San José – CRC', monedaDestino:'CRC', importeDestino:10000000,
    comision:0, usuario:'yader',  referOrigen:'REF-88213', referDestino:'REF-88214', titulo:'Transferencia interbancaria - 5088' },
  { id:3, consecutivo:'TRF-5084', fecha:'25/05/26', estado:'Anulados',
    cuentaOrigen:'BCR USD 001-04745094', monedaOrigen:'USD', importeOrigen:200900,
    cuentaDestino:'BCR CRC 001-0252067-2', monedaDestino:'CRC', importeDestino:0,
    comision:0, usuario:'yader',  referOrigen:'REF-84001', referDestino:'', titulo:'Transferencia interbancaria - 5084' },
];

const ESTADO_STYLE: Record<EstadoTrf,[string,string]> = {
  Pendiente:  ['#EF9F27','rgba(239,159,39,.12)'],
  Contabilizado: [C.success,'rgba(29,158,117,.12)'],
  Anulados:   [C.error,'rgba(226,75,74,.12)'],
};

function Pill({ children, color, bg }: { children:React.ReactNode; color:string; bg:string }) {
  return <span style={{ fontSize:11, padding:'2px 9px', borderRadius:radius.pill, fontWeight:500, color, background:bg, whiteSpace:'nowrap', fontFamily:F }}>{children}</span>;
}


function parseFechaDDMMYY(s:string): Date|null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if(!m) return null;
  const [,d,mo,y] = m;
  return new Date(2000+parseInt(y), parseInt(mo)-1, parseInt(d));
}

function FechaFilterDrop({ desde, hasta, onApply, onClear }:{
  desde:string; hasta:string; onApply:(desde:string,hasta:string)=>void; onClear:()=>void;
}) {
  const [open,setOpen] = useState(false);
  const [ld,setLd] = useState(desde);
  const [lh,setLh] = useState(hasta);
  const ref = useRef<HTMLDivElement>(null);
  const active = !!(desde||hasta);
  useEffect(()=>{
    function h(e:MouseEvent){if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);}
    function esc(e:KeyboardEvent){if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }}
    if(open){document.addEventListener('mousedown',h);document.addEventListener('keydown',esc);}
    return ()=>{document.removeEventListener('mousedown',h);document.removeEventListener('keydown',esc);}
  },[open]);
  return (
    <div ref={ref} style={{position:'relative'}}>
      <button aria-expanded={open} onClick={()=>{setLd(desde);setLh(hasta);setOpen(v=>!v);}}
        style={{height:32,padding:'0 12px',border:`1px solid ${active?BRAND:C.n500}`,borderRadius:4,background:active?C.brandBg:'#fff',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',gap:5,fontFamily:F,color:active?BRAND:'#0F0F0F'}}>
        Fechas{active?` (${[desde,hasta].filter(Boolean).length})`:''}&nbsp;<svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
      </button>
      {open&&(
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,zIndex:300,background:'#fff',
          border:`1px solid ${C.n500}`,borderRadius:10,minWidth:220,boxShadow:shadow.panel,overflow:'hidden',fontFamily:F,padding:12}}>
          <p style={{fontSize:11,fontWeight:600,margin:'0 0 8px'}}>Rango de fechas</p>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <label style={{fontSize:11,color:'#555'}}>Desde
              <input type="date" value={ld} onChange={e=>setLd(e.target.value)}
                style={{ width:'100%',height:30,marginTop:3,padding:'0 8px',border:'1px solid #E0E0E0',borderRadius:radius.sm,fontSize:12,fontFamily:F,outline:'none',boxSizing:'border-box' }}/>
            </label>
            <label style={{fontSize:11,color:'#555'}}>Hasta
              <input type="date" value={lh} onChange={e=>setLh(e.target.value)}
                style={{ width:'100%',height:30,marginTop:3,padding:'0 8px',border:'1px solid #E0E0E0',borderRadius:radius.sm,fontSize:12,fontFamily:F,outline:'none',boxSizing:'border-box' }}/>
            </label>
          </div>
          <div style={{display:'flex',gap:8,marginTop:10}}>
            <button onClick={()=>{setLd('');setLh('');onClear();setOpen(false);}} style={{flex:1,height:30,border:`1px solid ${C.n500}`,borderRadius:7,background:'#fff',cursor:'pointer',fontSize:11,fontFamily:F}}>Limpiar</button>
            <button onClick={()=>{onApply(ld,lh);setOpen(false);}} style={{flex:1,height:30,border:'none',borderRadius:7,background:BRAND,color:'#fff',cursor:'pointer',fontSize:11,fontWeight:500,fontFamily:F}}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function toIso(s:string): string {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if(!m) return '';
  const [,d,mo,y] = m;
  return `20${y}-${mo}-${d}`;
}
function fromIso(s:string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return s;
  const [,y,mo,d] = m;
  return `${d}/${mo}/${y.slice(2)}`;
}

function MonedaToggle({ value, onChange }:{ value:'CRC'|'USD'; onChange:(m:'CRC'|'USD')=>void }) {
  return (
    <div style={{ display:'flex', gap:4 }}>
      {(['CRC','USD'] as const).map(m=>(
        <button key={m} onClick={()=>onChange(m)} style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500, background:value===m?BRAND:C.n200, color:value===m?'#fff':'#0F0F0F' }}>
          {m==='CRC'?'¢ CRC':'$ USD'}
        </button>
      ))}
    </div>
  );
}

// ── Modal: Nueva / editar transferencia ────────────────────────────────────────
function NuevaTrfModal({ trfs, editing, onClose, onSave }: { trfs:Transferencia[]; editing?:Transferencia; onClose:()=>void; onSave:(t:Transferencia)=>void }) {
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

  const symO = form.monedaOrigen  === 'USD' ? '$' : simboloLocal();
  const symD = form.monedaDestino === 'USD' ? '$' : simboloLocal();
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
    function esc(e:KeyboardEvent){if (e.key === 'Escape') { e.preventDefault(); onClose(); }}
    document.addEventListener('keydown',esc);
    return ()=>document.removeEventListener('keydown',esc);
  },[onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={editing?'Editar transferencia':'Nueva transferencia interbancaria'}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:1020, boxShadow:shadow.modal, fontFamily:F }}
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
          }} style={{ height:36, padding:'0 20px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F }}>
            Aplicar operación
          </button>
        </div>
      </div>
      {toast && <Toast message={toast} type="error" onClose={()=>setToast(null)}/>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
// Íconos de las acciones de la lista
const IcEdit  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>;
const IcCopy  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8"/></svg>;
const IcCheck = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5 8l2 2 4-4"/></svg>;
const IcBan   = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/></svg>;
const IcPrint = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2h8v4"/><rect x="1" y="6" width="14" height="6" rx="1.5"/><path d="M4 9v5h8V9"/></svg>;
const IcRestore = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8a6 6 0 1 1 1.76 4.24"/><path d="M2 12V8h4"/></svg>;

export default function Transferencias() {
  const [trfs, setTrfs] = useState<Transferencia[]>(TRFS_INIT);
  const [showNew, setShowNew] = useState(false);
  const [comprobante, setComprobante] = useState<Transferencia | null>(null);
  const empresaDoc = useEmpresaDoc();
  const [showExportar, setShowExportar] = useState(false);
  const [editing, setEditing] = useState<Transferencia|null>(null);
  const [searchQ, setSearch] = useState('');
  const [filtEstado, setFiltEstado] = useState<Set<string>>(new Set());
  const [filtMoneda, setFiltMoneda] = useState<Set<string>>(new Set());
  const [filtUsuario, setFiltUsuario] = useState<Set<string>>(new Set());
  const [filtBanco, setFiltBanco] = useState<Set<string>>(new Set());
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [toast, setToast] = useState<string|null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = trfs.filter(t => {
    if (searchQ && !t.consecutivo.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (filtEstado.size > 0 && !filtEstado.has(t.estado)) return false;
    if (filtMoneda.size > 0 && !filtMoneda.has(t.monedaOrigen) && !filtMoneda.has(t.monedaDestino)) return false;
    if (filtUsuario.size > 0 && !filtUsuario.has(t.usuario)) return false;
    if (filtBanco.size > 0 && ![...filtBanco].some(b => t.cuentaOrigen.includes(b) || t.cuentaDestino.includes(b))) return false;
    if (fDesde || fHasta) {
      const d = parseFechaDDMMYY(t.fecha);
      if (!d) return false;
      if (fDesde && d < new Date(fDesde)) return false;
      if (fHasta && d > new Date(fHasta)) return false;
    }
    return true;
  });

  // Los totales no incluyen operaciones anuladas: sumar transferencias sin efecto
  // real distorsionaría el total de la sección.
  const activas = filtered.filter(t => t.estado !== 'Anulados');
  const totalOriCRC = activas.filter(t=>t.monedaOrigen==='CRC').reduce((s,t)=>s+t.importeOrigen,0);
  const totalOriUSD = activas.filter(t=>t.monedaOrigen==='USD').reduce((s,t)=>s+t.importeOrigen,0);
  const totalDesCRC = activas.filter(t=>t.monedaDestino==='CRC').reduce((s,t)=>s+t.importeDestino,0);
  const totalDesUSD = activas.filter(t=>t.monedaDestino==='USD').reduce((s,t)=>s+t.importeDestino,0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const paginated = filtered.slice((pageClamped-1)*pageSize, pageClamped*pageSize);


  function contabilizar(id:number){ setTrfs(p=>p.map(t=>t.id===id?{...t,estado:'Contabilizado'}:t)); setToast('Transferencia contabilizada'); }
  function descontabilizar(id:number){ setTrfs(p=>p.map(t=>t.id===id?{...t,estado:'Pendiente'}:t)); setToast('Transferencia descontabilizada'); }
  function anular(id:number){ setTrfs(p=>p.map(t=>t.id===id?{...t,estado:'Anulados'}:t)); setToast('Transferencia anulada'); }
  function restaurar(id:number){ setTrfs(p=>p.map(t=>t.id===id?{...t,estado:'Pendiente'}:t)); setToast('Transferencia restaurada a Pendiente'); }
  function duplicar(t:Transferencia){
    const nuevoConsec = 5095 + trfs.length;
    const copia: Transferencia = { ...t, id:Date.now(), consecutivo:`TRF-${nuevoConsec}`, estado:'Pendiente', titulo:`Transferencia interbancaria - ${nuevoConsec}` };
    setTrfs(p=>[copia,...p]);
    setToast(`Transferencia ${copia.consecutivo} creada a partir de ${t.consecutivo}`);
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>
      {/* Header */}
      <PageHeader title="Transferencias interbancarias">
        <BotonExportarUnico onClick={()=>setShowExportar(true)}/>
        <button onClick={()=>setToast('Enviando listado a la impresora…')} style={{ height:34, padding:'0 13px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:6, color:C.n700, fontFamily:F }}>
          <IcPrint/> Imprimir
        </button>
        <button onClick={()=>{setEditing(null);setShowNew(true);}} style={{ height:34, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
          + Nueva transferencia
        </button>
      </PageHeader>

      {/* Toolbar */}
      <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', gap:10, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
        <SearchInput value={searchQ} onChange={v=>{setSearch(v);setPage(1);}} placeholder="Buscar por consecutivo…" width={220} />
        <FechaFilterDrop desde={fDesde} hasta={fHasta} onApply={(d,h)=>{setFDesde(d);setFHasta(h);setPage(1);}} onClear={()=>{setFDesde('');setFHasta('');setPage(1);}}/>
        <FilterDropdown label="Estado" options={['Pendiente','Contabilizado','Anulados']} selected={filtEstado} onApply={s=>{setFiltEstado(s);setPage(1);}} onClear={()=>{setFiltEstado(new Set());setPage(1);}}/>
        <FilterDropdown label="Banco" options={['BAC','BNCR','BCR']} selected={filtBanco} onApply={s=>{setFiltBanco(s);setPage(1);}} onClear={()=>{setFiltBanco(new Set());setPage(1);}}/>
        <FilterDropdown label="Moneda" options={['CRC','USD']} selected={filtMoneda} onApply={s=>{setFiltMoneda(s);setPage(1);}} onClear={()=>{setFiltMoneda(new Set());setPage(1);}}/>
        <FilterDropdown label="Usuario" options={['jperez','yader']} selected={filtUsuario} onApply={s=>{setFiltUsuario(s);setPage(1);}} onClear={()=>{setFiltUsuario(new Set());setPage(1);}}/>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflow:'auto', background:'#fff', padding:`0 ${PAGE_PAD-12}px` }}>
        <table style={{ width:'max-content', minWidth:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
          <thead style={{ position:'sticky', top:0, background:'#fff', zIndex:2 }}>
            <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
              <th style={{ width:16 }}/>
              {['Consecutivo','Fecha','Estado','Cuenta origen','Moneda orig.','Importe origen','Cuenta destino','Moneda dest.','Importe destino','Usuario','Acciones'].map(h=>(
                <th key={h} style={{ padding:'10px 12px', textAlign:['Importe origen','Importe destino'].includes(h)?'right':'left', fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length===0 && (
              <tr><td colSpan={12} style={{ padding:48, textAlign:'center', color:'#BCBCBC', fontSize:12, fontFamily:F }}>No hay transferencias para mostrar</td></tr>
            )}
            {paginated.map(t => {
              const [stC,stB] = ESTADO_STYLE[t.estado];
              const symO = t.monedaOrigen  === 'USD' ? '$' : simboloLocal();
              const symD = t.monedaDestino === 'USD' ? '$' : simboloLocal();
              return (
                <tr key={t.id} style={{ borderBottom:`1px solid #F5F5F5` }}
                  onMouseEnter={e=>(e.currentTarget.style.background=C.n200)}
                  onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                  <td/>
                  <td style={{ padding:'10px 12px' }}><span style={{ color:BRAND, fontFamily:F, fontWeight:600, cursor:'pointer' }} onClick={()=>{setEditing(t);setShowNew(true);}}>{t.consecutivo}</span></td>
                  <td style={{ padding:'10px 12px', color:C.n700 }}>{t.fecha}</td>
                  <td style={{ padding:'10px 12px' }}><Pill color={stC} bg={stB}>{t.estado}</Pill></td>
                  <td style={{ padding:'10px 12px', fontSize:11, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={t.cuentaOrigen}>{t.cuentaOrigen}</td>
                  <td style={{ padding:'10px 12px' }}><span style={{ fontSize:10, padding:'2px 7px', background:C.n200, borderRadius:4 }}>{t.monedaOrigen} {symO}</span></td>
                  <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}>
                      <span style={{ color:C.n700 }}>{symO}</span>
                      <span style={{ fontWeight:500, textAlign:'right' }}>{t.importeOrigen > 0 ? fmt2(t.importeOrigen) : '-'}</span>
                    </div>
                  </td>
                  <td style={{ padding:'10px 12px', fontSize:11, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={t.cuentaDestino}>{t.cuentaDestino}</td>
                  <td style={{ padding:'10px 12px' }}><span style={{ fontSize:10, padding:'2px 7px', background:C.n200, borderRadius:4 }}>{t.monedaDestino} {symD}</span></td>
                  <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}>
                      <span style={{ color:C.n700 }}>{symD}</span>
                      <span style={{ fontWeight:500, textAlign:'right' }}>{t.importeDestino > 0 ? fmt2(t.importeDestino) : '-'}</span>
                    </div>
                  </td>
                  <td style={{ padding:'10px 12px', color:C.n700, fontSize:11 }}>{t.usuario}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      <button title="Ver comprobante" aria-label="Ver comprobante" onClick={()=>setComprobante(t)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }}><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 1.5h6l3 3v10H4z"/><path d="M10 1.5v3h3M6 8h5M6 10.5h5M6 13h3"/></svg></button>
                      {t.estado === 'Pendiente' && (
                        <>
                          <button title="Contabilizar" onClick={()=>contabilizar(t.id)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }} onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='none')}><IcCheck/></button>
                          <button title="Editar" onClick={()=>{setEditing(t);setShowNew(true);}} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }} onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='none')}><IcEdit/></button>
                          <button title="Duplicar" onClick={()=>duplicar(t)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }} onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='none')}><IcCopy/></button>
                          <button title="Anular" onClick={()=>anular(t.id)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.error, display:'flex', alignItems:'center', justifyContent:'center' }} onMouseEnter={e=>(e.currentTarget.style.background=C.errorBg)} onMouseLeave={e=>(e.currentTarget.style.background='none')}><IcBan/></button>
                        </>
                      )}
                      {t.estado === 'Contabilizado' && (
                        <>
                          <button title="Descontabilizar" onClick={()=>descontabilizar(t.id)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }}><IcCheck/></button>
                          <button title="Duplicar" onClick={()=>duplicar(t)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }}><IcCopy/></button>
                        </>
                      )}
                      {t.estado === 'Anulados' && (
                        <button title="Restaurar" onClick={()=>restaurar(t.id)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }}><IcRestore/></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
              <td colSpan={5} style={{ padding:'9px 12px', fontWeight:600, fontSize:12, fontFamily:F, textAlign:'right' }}>Totales (excluye anuladas)</td>
              <td/>
              <td style={{ padding:'9px 12px', whiteSpace:'nowrap' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {totalOriCRC > 0 && <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}><span style={{ color:C.n700, fontSize:11 }}>{simboloLocal()}</span><span style={{ fontWeight:700, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt2(totalOriCRC)}</span></div>}
                  {totalOriUSD > 0 && <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}><span style={{ color:C.n700, fontSize:11 }}>$</span><span style={{ fontWeight:700, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt2(totalOriUSD)}</span></div>}
                </div>
              </td>
              <td/>
              <td/>
              <td style={{ padding:'9px 12px', whiteSpace:'nowrap' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {totalDesCRC > 0 && <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}><span style={{ color:C.n700, fontSize:11 }}>{simboloLocal()}</span><span style={{ fontWeight:700, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt2(totalDesCRC)}</span></div>}
                  {totalDesUSD > 0 && <div style={{ display:'grid', gridTemplateColumns:'14px 1fr', gap:4, width:'100%' }}><span style={{ color:C.n700, fontSize:11 }}>$</span><span style={{ fontWeight:700, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt2(totalDesUSD)}</span></div>}
                </div>
              </td>
              <td/><td/>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer */}
      <div style={{ background:'#fff', borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0 }}>
        <Pagination page={pageClamped} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      {comprobante && <ComprobanteOperacionModal titulo={`Comprobante · ${comprobante.titulo}`} archivo={`comprobante-transferencia-${comprobante.consecutivo}`} marca={C.brand}
        onClose={() => setComprobante(null)} comprobantes={armarComprobantes({ clase: 'Transferencia', numero: comprobante.consecutivo, empresa: empresaDoc,
          tercero: { nombre: comprobante.cuentaDestino }, fecha: comprobante.fecha, medioPago: `Transferencia bancaria desde ${comprobante.cuentaOrigen}${comprobante.referOrigen ? ` · Ref. ${comprobante.referOrigen}` : ''}`,
          concepto: comprobante.titulo, simbolo: comprobante.monedaOrigen === 'USD' ? '$' : simboloLocal(), importe: comprobante.importeOrigen, documentos: [] })} />}
      {showNew && <NuevaTrfModal trfs={trfs} editing={editing??undefined} onClose={()=>{setShowNew(false);setEditing(null);}} onSave={t=>{
        setTrfs(p => p.some(x=>x.id===t.id) ? p.map(x=>x.id===t.id?t:x) : [t,...p]);
      }}/>}
      {showExportar && (
        <ExportListModal
          title="Transferencias interbancarias"
          subtitulo={`${filtered.length} transferencia${filtered.length===1?'':'s'}`}
          filename="transferencias"
          columns={[
            { key:'consecutivo', label:'Consecutivo' }, { key:'fecha', label:'Fecha' }, { key:'cuentaOrigen', label:'Cuenta origen' },
            { key:'cuentaDestino', label:'Cuenta destino' }, { key:'importe', label:'Importe', align:'right' },
            { key:'usuario', label:'Usuario' }, { key:'estado', label:'Estado' },
          ]}
          rows={filtered.map(t=>({
            consecutivo:t.consecutivo, fecha:t.fecha, cuentaOrigen:t.cuentaOrigen, cuentaDestino:t.cuentaDestino,
            importe:`${t.monedaOrigen==='USD'?'$':simboloLocal()} ${fmtNum(t.importeOrigen,2)}`, usuario:t.usuario, estado:t.estado,
          }))}
          onClose={()=>setShowExportar(false)}
        />
      )}
      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}
    </div>
  );
}
