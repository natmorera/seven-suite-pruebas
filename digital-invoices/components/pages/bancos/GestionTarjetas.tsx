'use client';
import ComprobanteOperacionModal from '@/components/ui/documento/ComprobanteOperacion';
import { armarComprobantes } from '@/components/ui/documento/comprobantes';
import { useEmpresaDoc } from '@/components/ui/documento/useEmpresaDoc';
import React, { useState, useRef, useEffect } from 'react';
import { C, fmtNum, Pagination, BotonExportarUnico, ExportListModal, PAGE_PAD, MoneyHeaderCells, MoneyCells, MoneyCellsStack, BulkActionBar, PresenciaOperacion, FONT, radius, shadow, PageHeader, Modal, Toast, SearchInput, FilterDropdown } from '../../ui/primitives';
import { simboloLocal } from '@/lib/paisActual';

const F = FONT;
const BRAND = C.brand;
function fmt2(n: number) { return fmtNum(n, 2); }

function FechasFilter({ value, onChange, onClear }: { value:{from:string;to:string}; onChange:(v:{from:string;to:string})=>void; onClear:()=>void; }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);
  const active = !!(value.from||value.to);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(()=>{ function h(e:MouseEvent){if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);} if(open)document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h); },[open]);
  function fmtD(d:string){ if(!d)return''; const[y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>{ setLocal(value); setOpen(v=>!v); }}
        style={{ height:32, padding:'0 12px', border:`1px solid ${active?BRAND:C.n500}`, borderRadius:4,
          background:active?C.brandBg:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center',
          gap:5, color:active?BRAND:'#0F0F0F', fontFamily:F, fontWeight:active?500:400 }}>
        {active?`${fmtD(value.from)} - ${fmtD(value.to)}`:'Fechas'}
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:300, background:'#fff', border:`1px solid ${C.n500}`, borderRadius:10, width:230, boxShadow:shadow.panel, fontFamily:F, padding:'12px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:12, fontWeight:600 }}>Período de fecha</span>
            <button onClick={()=>{ setLocal({from:'',to:''}); onClear(); }} style={{ fontSize:11, color:C.error, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Limpiar</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'4px 8px', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:11, color:C.n700 }}>Desde</span>
            <input type="date" value={local.from} onChange={e=>setLocal(p=>({...p,from:e.target.value}))} style={{ height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none' }}/>
            <span style={{ fontSize:11, color:C.n700 }}>Hasta</span>
            <input type="date" value={local.to} onChange={e=>setLocal(p=>({...p,to:e.target.value}))} style={{ height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none' }}/>
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

// ── Types ─────────────────────────────────────────────────────────────────────
type EstadoLiq = 'Pendiente' | 'Contabilizada' | 'Anulada';

interface Liquidacion {
  id: number;
  consecutivo: string;
  fecha: string;
  afiliado: string;
  afiliadoCode: string;
  cuentaTransito: string;
  referencia: string;
  moneda: 'CRC' | 'USD';
  importe: number;
  usuario: string;
  estado: EstadoLiq;
  nroAsiento?: string | null;
}

interface Voucher {
  id: string;
  codigo: string;
  fecha: string;
  descripcion: string;
  bruto: number;
  neto: number;
}

// ── Mock ──────────────────────────────────────────────────────────────────────
const AFILIADOS = [
  { code:'AFI-001', label:'AFI-001 · BAC Visa/Master - Terminal 4654897', comision:1.85, retFuente:2.0, retIVA:1.0 },
  { code:'AFI-002', label:'AFI-002 · BAC Amex - Terminal 4654898',        comision:2.10, retFuente:2.0, retIVA:1.0 },
  { code:'AFI-003', label:'AFI-003 · BNCR Visa - Terminal 7812300',       comision:1.85, retFuente:2.0, retIVA:1.0 },
];

const CUENTAS_TRANSITO = [
  '100-003-0001 · Datáfono BAC ¢',
  '100-003-0002 · Datáfono BAC $',
  '100-003-0003 · Datáfono BNCR ¢',
];

const BANCOS = ['BAC ¢ - Cta. 4646545466888', 'BNCR ¢ - Cta. 5565545547777'];

const LIQUIDACIONES_INIT: Liquidacion[] = [
  { id:1, consecutivo:'GT-124', fecha:'00/00/00', afiliado:'AFI-001 · BAC Visa/Master', afiliadoCode:'AFI-001', cuentaTransito:'100-003-0001 · Datafono BAC ¢', referencia:'LIQ-00489', moneda:'USD', importe:14309.10, usuario:'jperez', estado:'Pendiente' },
  { id:2, consecutivo:'GT-123', fecha:'00/00/00', afiliado:'AFI-002 · BAC Amex',        afiliadoCode:'AFI-002', cuentaTransito:'100-003-0002 · Datafono BAC ¢', referencia:'-',         moneda:'CRC', importe:450000,  usuario:'sblandon', estado:'Pendiente' },
  { id:3, consecutivo:'GT-122', fecha:'00/00/00', afiliado:'AFI-003 · BNCR Visa',       afiliadoCode:'AFI-003', cuentaTransito:'100-003-0001 · Datafono BAC ¢', referencia:'-',         moneda:'CRC', importe:1450000, usuario:'yader', estado:'Contabilizada' },
  { id:4, consecutivo:'GT-121', fecha:'00/00/00', afiliado:'AFI-003 · BNCR Visa',       afiliadoCode:'AFI-003', cuentaTransito:'100-003-0001 · Datafono BAC ¢', referencia:'-',         moneda:'USD', importe:14309.10, usuario:'yader', estado:'Pendiente' },
];

const VOUCHERS_MOCK: Voucher[] = [
  { id:'v1', codigo:'VC-00021', fecha:'00/00/0000', descripcion:'Habitaciones standard', bruto:380000, neto:372020 },
  { id:'v2', codigo:'VC-00022', fecha:'00/00/0000', descripcion:'Restaurante y bar',      bruto:245000, neto:239855 },
  { id:'v3', codigo:'VC-00023', fecha:'00/00/0000', descripcion:'Servicios de spa',       bruto:195000, neto:190905 },
];

const ESTADO_STYLE: Record<EstadoLiq, [string,string]> = {
  Pendiente:     ['#EF9F27','rgba(239,159,39,.12)'],
  Contabilizada: [C.success,'rgba(29,158,117,.12)'],
  Anulada:       [C.error,'rgba(226,75,74,.12)'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function Pill({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return <span style={{ fontSize:11, padding:'2px 9px', borderRadius:radius.pill, fontWeight:500, color, background:bg, whiteSpace:'nowrap', fontFamily:F }}>{children}</span>;
}
function Btn({ children, onClick, variant='primary', size='md', icon, disabled=false }: {
  children: React.ReactNode; onClick?: ()=>void; variant?: 'primary'|'secondary'|'danger'; size?: 'sm'|'md'; icon?: React.ReactNode; disabled?: boolean;
}) {
  const h = size==='sm'?28:34;
  const vs: Record<string,React.CSSProperties> = {
    primary:   { background:BRAND, color:'#fff', border:`1px solid ${BRAND}` },
    secondary: { background:'#fff', color:'#0F0F0F', border:`1px solid ${C.n500}` },
    danger:    { background:'transparent', color:C.error, border:'none' },
  };
  return <button onClick={onClick} disabled={disabled} style={{ height:h, padding:'0 14px', borderRadius:radius.md, cursor:disabled?'default':'pointer', fontSize:12, fontFamily:F, fontWeight:500, display:'flex', alignItems:'center', gap:6, opacity:disabled?.5:1, ...vs[variant] }}>{icon}{children}</button>;
}

// ── Modal: Selección de vouchers ──────────────────────────────────────────────
function VouchersModal({ onSelect, onClose }: { onSelect: (ids: string[]) => void; onClose: () => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set(['v1','v2','v3']));
  const [q, setQ] = useState('');
  const total = VOUCHERS_MOCK.filter(v=>sel.has(v.id)).reduce((s,v)=>s+v.bruto,0);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:660, boxShadow:shadow.modal, fontFamily:F, display:'flex', flexDirection:'column' }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.n500}` }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Vouchers</p>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.n700 }}>×</button>
          </div>
          <p style={{ fontSize:11, color:C.n700, margin:'3px 0 0' }}>100-001-0001-CLI0001 · Distribuidora ABC S.A. · Moneda: CRC · Total pendiente: {simboloLocal()}1,885,000.00</p>
          <p style={{ fontSize:11, color:C.n700, margin:'2px 0 0' }}>Seleccioná los documentos a aplicar</p>
        </div>
        <div style={{ padding:'10px 18px', borderBottom:`1px solid ${C.n500}`, display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ flex:1 }}>
            <SearchInput value={q} onChange={setQ} placeholder="Buscar por número de documento…" width="100%" />
          </div>
          <span style={{ fontSize:12, color:C.n700 }}>Ordenar:</span>
          {(['Fecha','Monto'] as const).map((o,i) => (
            <button key={o} style={{ height:30, padding:'0 14px', borderRadius:radius.sm, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, background:i===0?BRAND:C.n200, color:i===0?'#fff':'#0F0F0F', fontWeight:i===0?600:400 }}>{o}</button>
          ))}
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
            <thead><tr style={{ borderBottom:`1px solid ${C.n500}` }}>
              <th style={{ width:40, padding:'10px 14px' }}>
                <input type="checkbox" checked={sel.size===VOUCHERS_MOCK.length} onChange={()=>setSel(p=>p.size===VOUCHERS_MOCK.length?new Set():new Set(VOUCHERS_MOCK.map(v=>v.id)))} style={{ accentColor:BRAND }}/>
              </th>
              {['Documento','Fecha','Descripción','Imp. original','Saldo pendiente'].map(h=>(
                <th key={h} style={{ padding:'10px 10px', textAlign:h.includes('Imp')||h.includes('Saldo')?'right':'left', fontWeight:500, color:C.n700, fontSize:11 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {VOUCHERS_MOCK.map(v=>{
                const isSel=sel.has(v.id);
                return (
                  <tr key={v.id} onClick={()=>setSel(p=>{const n=new Set(p);isSel?n.delete(v.id):n.add(v.id);return n;})}
                    style={{ borderBottom:`1px solid #F5F5F5`, cursor:'pointer', background:isSel?C.brandBg:'#fff' }}>
                    <td style={{ padding:'10px 14px' }}><input type="checkbox" checked={isSel} readOnly style={{ accentColor:BRAND }}/></td>
                    <td style={{ padding:'10px 10px', color:BRAND, fontFamily:F, fontWeight:500 }}>{v.codigo}</td>
                    <td style={{ padding:'10px 10px' }}>{v.fecha}</td>
                    <td style={{ padding:'10px 10px', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={v.descripcion}>{v.descripcion}</td>
                    <td style={{ padding:'10px 10px', textAlign:'right' }}>{simboloLocal()}{fmt2(v.bruto)}</td>
                    <td style={{ padding:'10px 10px', textAlign:'right', fontWeight:isSel?600:400, color:isSel?BRAND:'#0F0F0F' }}>{simboloLocal()}{fmt2(v.bruto)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'12px 18px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:C.n700 }}>{sel.size} vouchers seleccionados · Total seleccionado: {simboloLocal()}{fmt2(total)}</span>
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="danger" onClick={onClose}>Descartar</Btn>
            <Btn onClick={()=>{onSelect([...sel]);onClose();}}>Cargar</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Importar vouchers ──────────────────────────────────────────────────
function ImportarVouchersModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<string|null>(null);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:400, boxShadow:shadow.modal, fontFamily:F }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Importar vouchers</p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.n700 }}>×</button>
        </div>
        <div style={{ padding:'20px 18px' }}>
          <div onDrop={e=>{e.preventDefault();setFile(e.dataTransfer.files[0]?.name??null);}} onDragOver={e=>e.preventDefault()}
            style={{ border:'1.5px dashed #ECECEC', borderRadius:10, padding:'30px 20px', textAlign:'center', cursor:'pointer' }}
            onClick={()=>setFile('vouchers.xlsx')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ECECEC" strokeWidth="1.5" style={{ marginBottom:10 }}><path d="M12 16V4M8 8l4-4 4 4"/><path d="M3 20h18"/></svg>
            <p style={{ fontSize:12, color:C.n700, margin:'0 0 8px' }}>{file ? file : 'Arrastrá tu archivo aquí o'}</p>
            {!file && <button style={{ height:28, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:11, fontFamily:F }}>Seleccionar archivo</button>}
            <p style={{ fontSize:10, color:C.n700, margin:'8px 0 0' }}>Formatos soportados: .xlsx, .csv - Máx. 5 MB</p>
          </div>
        </div>
        <div style={{ padding:'12px 18px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <Btn variant="danger" onClick={onClose}>Descartar</Btn>
          <Btn disabled={!file} onClick={onClose}>Importar</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Nueva liquidación ──────────────────────────────────────────────────
function NuevaLiquidacionModal({ onClose, onSave }: { onClose: () => void; onSave: (liq: Liquidacion) => void }) {
  const [afiliado, setAfiliado] = useState(AFILIADOS[0]);
  const [vouchers, setVouchers] = useState<Voucher[]>(VOUCHERS_MOCK);
  const [showVouchers, setShowVouchers] = useState(false);
  const [showImportar, setShowImportar] = useState(false);
  const [vouchersOpen, setVouchersOpen] = useState(true);
  // /#22: línea(s) de ajuste - para cosas que no son comisión ni
  // retención por voucher, como el cobro anual de suscripción del datáfono.
  const [ajustes, setAjustes] = useState<{id:number; descripcion:string; monto:number}[]>([]);
  const [nuevoAjusteDesc, setNuevoAjusteDesc] = useState('');
  const [nuevoAjusteMonto, setNuevoAjusteMonto] = useState('');

  const totalBruto = vouchers.reduce((s,v)=>s+v.bruto,0);
  const comision  = totalBruto * (afiliado.comision/100);
  const retFuente = totalBruto * (afiliado.retFuente/100);
  const retIVA    = totalBruto * (afiliado.retIVA/100);
  const totalAjustes = ajustes.reduce((s,a)=>s+a.monto,0);
  const neto      = totalBruto - comision - retFuente - retIVA + totalAjustes;

  function agregarAjuste() {
    const monto = parseFloat(nuevoAjusteMonto);
    if (!nuevoAjusteDesc.trim() || isNaN(monto) || monto === 0) return;
    setAjustes(p=>[...p, { id:Date.now(), descripcion:nuevoAjusteDesc.trim(), monto }]);
    setNuevoAjusteDesc(''); setNuevoAjusteMonto('');
  }

  const [LIQ_NUM] = useState(() => `GT-${Math.floor(Math.random()*100+100)}`);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:'100%', maxWidth:1480, boxShadow:shadow.modal, fontFamily:F, display:'flex', flexDirection:'column' }}
        onClick={e=>e.stopPropagation()}>

        {/* Title */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:14, fontWeight:600 }}>Nueva liquidación de tarjeta</span>
          <span style={{ fontSize:13, color:C.n700 }}>14</span>
          <Pill color={ESTADO_STYLE['Pendiente'][0]} bg={ESTADO_STYLE['Pendiente'][1]}>Pendiente</Pill>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:14 }}>
            <PresenciaOperacion/>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, fontSize:20 }}>×</button>
          </div>
        </div>

        {/* Info banner */}
        <div style={{ padding:'10px 24px', background:C.n200, borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:8 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#3B82F6" strokeWidth="1.3"><circle cx="8" cy="8" r="6.33"/><path d="M8 5v3M8 10.5h.01"/></svg>
          <span style={{ fontSize:11, color:'#1E40AF' }}>Registra las ventas cobradas por datáfono en el período. El sistema calcula automáticamente la comisión del afiliado y las retenciones según el perfil configurado.</span>
        </div>

        <div style={{ display:'flex', flex:1 }}>
          {/* Main form */}
          <div style={{ flex:1, padding:'16px 20px', overflowY:'auto', display:'flex', flexDirection:'column', gap:16 }}>
            {/* Información general */}
            <div>
              <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>INFORMACIÓN GENERAL</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'8px 14px' }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Cuenta de depósitos en tránsito <span style={{ color:C.error }}>*</span></label>
                  <select style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', appearance:'none' }}>
                    {CUENTAS_TRANSITO.map(c=><option key={c}>{c}</option>)}
                  </select>
                  <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'3px 0' }}>Cuentas de tipo “Depósitos en tránsito”</button>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Afiliado <span style={{ color:C.error }}>*</span></label>
                  <select value={afiliado.code} onChange={e=>setAfiliado(AFILIADOS.find(a=>a.code===e.target.value)??AFILIADOS[0])}
                    style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', appearance:'none' }}>
                    {AFILIADOS.map(a=><option key={a.code} value={a.code}>{a.label}</option>)}
                  </select>
                  <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'3px 0' }}>Afiliados configurados en la cuenta</button>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Título / Leyenda</label>
                  <input defaultValue={`Gestión de tarjetas - Datáfono BAC ¢ - 14`} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                  <p style={{ fontSize:11, color:BRAND, margin:'3px 0 0' }}>Auto-propuesto.</p>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Flujo</label>
                  <input placeholder="Gestión de tarjetas" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
                </div>
              </div>
            </div>

            {/* Detalle del traslado */}
            <div>
              <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>DETALLE DEL TRASLADO</p>
              <div style={{ display:'grid', gridTemplateColumns:'155px 175px 1fr 1fr 1fr', gap:'8px 14px', alignItems:'end' }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Fecha <span style={{ color:C.error }}>*</span></label>
                  <input type="date" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Moneda <span style={{ color:C.error }}>*</span></label>
                  <div style={{ display:'flex', gap:4 }}>
                    <button style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:11, fontFamily:F, fontWeight:500, background:BRAND, color:'#fff' }}>¢ CRC</button>
                    <button style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:11, fontFamily:F, background:C.n200 }}>$ USD</button>
                  </div>
                  <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'3px 0' }}>Tipo de cambio: 1.0000</button>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Banco de acreditación <span style={{ color:C.error }}>*</span></label>
                  <select style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', appearance:'none' }}>
                    {BANCOS.map(b=><option key={b}>{b}</option>)}
                  </select>
                  <span style={{ fontSize:11, color:BRAND }}>Filtrado por moneda CRC</span>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Referencia bancaria</label>
                  <input placeholder="Nro. transacción del banco" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
                </div>
              </div>
              {/* Comision pills */}
              <div style={{ display:'flex', gap:10, marginTop:8, fontSize:11 }}>
                <span style={{ padding:'3px 10px', borderRadius:radius.lg, background:'rgba(239,159,39,.12)', color:'#7A5C00' }}>
                  Comisión afiliado <strong>{afiliado.comision}%</strong>
                </span>
                <span style={{ padding:'3px 10px', borderRadius:radius.lg, background:'rgba(226,75,74,.1)', color:'#C62828' }}>
                  Retención en la fuente <strong>{afiliado.retFuente}%</strong>
                </span>
                <span style={{ padding:'3px 10px', borderRadius:radius.lg, background:'rgba(59,130,246,.1)', color:'#1E3FAF' }}>
                  Retención IVA tarjetas <strong>{afiliado.retIVA}%</strong>
                </span>
                <span style={{ fontSize:10, color:C.n700, alignSelf:'center' }}>Porcentajes del perfil del afiliado. Se aplican automáticamente a cada voucher.</span>
              </div>
            </div>

            {/* Vouchers */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>Vouchers del período <span style={{ fontSize:11, color:C.n700, fontWeight:400 }}>({vouchers.length} vouchers)</span></span>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>setShowImportar(true)} style={{ height:28, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3"/><path d="M8 10V2M5 5l3-3 3 3"/></svg>
                    Importar vouchers
                  </button>
                  <button onClick={()=>setShowVouchers(true)} style={{ height:28, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l-2-2"/></svg>
                    Seleccionar vouchers
                  </button>
                  <button onClick={()=>setVouchersOpen(v=>!v)} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      {vouchersOpen?<path d="M3.5 8.75L7 5.25L10.5 8.75"/>:<path d="M3.5 5.25L7 8.75L10.5 5.25"/>}
                    </svg>
                  </button>
                </div>
              </div>
              {vouchersOpen && (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F, border:`1px solid ${C.n500}`, borderRadius:radius.md, overflow:'hidden' }}>
                  <thead><tr style={{ background:C.n200, borderBottom:`1px solid ${C.n500}` }}>
                    {['Fecha','Documento','Descripción','Bruto','Neto',''].map(h=>(
                      <th key={h} style={{ padding:'7px 10px', textAlign:h==='Bruto'||h==='Neto'?'right':'left', fontWeight:500, color:C.n700, fontSize:11 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {vouchers.map(v=>(
                      <tr key={v.id} style={{ borderBottom:`1px solid #F5F5F5` }}>
                        <td style={{ padding:'7px 10px', fontSize:11 }}>{v.fecha}</td>
                        <td style={{ padding:'7px 10px', color:BRAND, fontFamily:F, fontSize:11 }}>{v.codigo}</td>
                        <td style={{ padding:'7px 10px', fontSize:11 }}>{v.descripcion}</td>
                        <td style={{ padding:'7px 10px', textAlign:'right', fontSize:11 }}>{simboloLocal()} {fmt2(v.bruto)}</td>
                        <td style={{ padding:'7px 10px', textAlign:'right', fontSize:11 }}>{simboloLocal()}{fmt2(v.neto)}</td>
                        <td style={{ padding:'7px 10px' }}><button onClick={()=>setVouchers(p=>p.filter(x=>x.id!==v.id))} style={{ background:'none', border:'none', cursor:'pointer', color:C.error, fontSize:14 }}>×</button></td>
                      </tr>
                    ))}
                    <tr style={{ background:C.n200, borderTop:`2px solid ${C.n500}` }}>
                      <td colSpan={3} style={{ padding:'7px 10px', fontWeight:600, fontSize:12 }}>Total bruto</td>
                      <td style={{ padding:'7px 10px', fontWeight:600 }}>
                        <div style={{ display:'flex', justifyContent:'flex-end', gap:6 }}>
                          <span style={{ color:C.n700 }}>{simboloLocal()}</span>
                          <span>{fmt2(totalBruto)}</span>
                        </div>
                      </td>
                      <td colSpan={2}/>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Ajustes /#22: espacio para cargos que no son comisión ni
                retención por voucher (ej. cobro anual de suscripción del datáfono) */}
            <div>
              <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>
                AJUSTES <span style={{ fontWeight:400, textTransform:'none', letterSpacing:'normal' }}>(opcional)</span>
              </p>
              {ajustes.length > 0 && (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F, border:`1px solid ${C.n500}`, borderRadius:radius.md, overflow:'hidden', marginBottom:8 }}>
                  <tbody>
                    {ajustes.map(a=>(
                      <tr key={a.id} style={{ borderBottom:`1px solid #F5F5F5` }}>
                        <td style={{ padding:'7px 10px', fontSize:11 }}>{a.descripcion}</td>
                        <td style={{ padding:'7px 10px', textAlign:'right', fontSize:11, fontWeight:600, color:a.monto<0?C.error:C.success, whiteSpace:'nowrap' }}>
                          {a.monto<0?'-':'+'}{simboloLocal()} {fmt2(Math.abs(a.monto))}
                        </td>
                        <td style={{ padding:'7px 10px', width:26 }}>
                          <button onClick={()=>setAjustes(p=>p.filter(x=>x.id!==a.id))} style={{ background:'none', border:'none', cursor:'pointer', color:C.error, fontSize:14 }}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3 }}>Descripción del ajuste</label>
                  <input value={nuevoAjusteDesc} onChange={e=>setNuevoAjusteDesc(e.target.value)} placeholder="Ej. Cobro anual de suscripción del datáfono"
                    style={{ width:'100%', height:34, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div style={{ width:150 }}>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3 }}>Monto (+/-)</label>
                  <input type="number" step="0.01" value={nuevoAjusteMonto} onChange={e=>setNuevoAjusteMonto(e.target.value)} placeholder="-15000"
                    style={{ width:'100%', height:34, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <button onClick={agregarAjuste} style={{ height:34, padding:'0 14px', border:`1px solid ${BRAND}`, borderRadius:radius.md, background:'#FFF8EC', color:BRAND, cursor:'pointer', fontSize:11, fontWeight:500, fontFamily:F, whiteSpace:'nowrap' }}>
                  + Agregar ajuste
                </button>
              </div>
              <p style={{ fontSize:10, color:C.n700, margin:'6px 0 0' }}>Usa un monto negativo para cargos (ej. suscripción del datáfono) y positivo para créditos o correcciones a favor.</p>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ width:340, borderLeft:`1px solid ${C.n500}`, padding:'16px 18px', flexShrink:0 }}>
            <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 8px' }}>AFILIADO SELECCIONADO</p>
            <p style={{ fontSize:13, fontWeight:600, margin:'0 0 2px' }}>{afiliado.label.split('·')[1]?.trim() ?? afiliado.label}</p>
            <p style={{ fontSize:11, color:C.n700, margin:'0 0 3px', fontFamily:F }}>{afiliado.code} · Terminal 4654897</p>
            <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:0 }}>3 vouchers</button>

            <div style={{ marginTop:16 }}>
              <p style={{ fontSize:13, fontWeight:600, margin:'0 0 10px' }}>Resumen</p>
              {[
                ['Total bruto',         totalBruto, '#0F0F0F'],
                [`Comisión afiliado (${afiliado.comision}%)`, -comision, C.error],
                [`Comisión en la fuente (${afiliado.retFuente}%)`, -retFuente, C.error],
                [`Ret. IVA tarjetas (${afiliado.retIVA}%)`, -retIVA, C.error],
                ...(ajustes.length>0 ? [['Ajustes', totalAjustes, totalAjustes<0?C.error:C.success] as [string,number,string]] : []),
                ['Neto a acreditar', neto, BRAND],
              ].map(([l,v,color]) => (
                <div key={l as string} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:11 }}>
                  <span style={{ color:C.n700 }}>{l as string}</span>
                  <span style={{ fontWeight: l==='Neto a acreditar'?700:500, color: color as string }}>
                    {(v as number)<0?'-':''}{simboloLocal()} {fmt2(Math.abs(v as number))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop:`1px solid ${C.n500}`, padding:'12px 24px', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <Btn variant="danger" onClick={onClose}>Descartar</Btn>
          <Btn onClick={()=>{ onSave({ id:Date.now(), consecutivo:LIQ_NUM, fecha:'00/00/00', afiliado:afiliado.label, afiliadoCode:afiliado.code, cuentaTransito:CUENTAS_TRANSITO[0], referencia:'LIQ-'+Math.floor(Math.random()*99999), moneda:'CRC', importe:neto, usuario:'jperez', estado:'Pendiente' }); onClose(); }}>
            Aplicar operación
          </Btn>
        </div>

        {showVouchers && <VouchersModal onSelect={()=>{}} onClose={()=>setShowVouchers(false)}/>}
        {showImportar && <ImportarVouchersModal onClose={()=>setShowImportar(false)}/>}
      </div>
    </div>
  );
}

function DetalleLiquidacionModal({ liq, onClose, onAnular }: { liq: Liquidacion; onClose:()=>void; onAnular:()=>void }) {
  const sym = liq.moneda==='USD'?'$':simboloLocal();
  const [stColor, stBg] = ESTADO_STYLE[liq.estado];
  const campos: [string,string][] = [
    ['Consecutivo', liq.consecutivo], ['Estado', liq.estado],
    ['Afiliado', liq.afiliado], ['Fecha', liq.fecha],
    ['Cuenta en tránsito', liq.cuentaTransito], ['Referencia', liq.referencia],
    ['Moneda', `${liq.moneda} ${sym}`], ['Importe', `${sym} ${fmt2(liq.importe)}`],
    ['Usuario', liq.usuario], ['N.º Asiento', liq.nroAsiento || 'Sin asiento asociado'],
  ];
  return (
    <Modal open title={`Liquidación ${liq.consecutivo}`} onClose={onClose}
      footer={
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
          {liq.estado!=='Anulada' && (
            <button onClick={onAnular} style={{ height:34, padding:'0 14px', border:`1px solid ${C.errorBorder}`, background:C.errorBg, color:C.error, borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>Anular</button>
          )}
          <button onClick={onClose} style={{ height:34, padding:'0 16px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Cerrar</button>
        </div>
      }>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <Pill color={stColor} bg={stBg}>{liq.estado}</Pill>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 16px' }}>
        {campos.map(([l,v])=>(
          <div key={l}>
            <p style={{ fontSize:10, color:C.n700, margin:'0 0 2px', fontFamily:F }}>{l}</p>
            <p style={{ fontSize:12, fontWeight:500, color:'#0F0F0F', margin:0, fontFamily:F }}>{v}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Enviar por correo ────────────────────────────────────────────────────────
function CorreoLiquidacionModal({ liq, onClose, onEnviar }: { liq: Liquidacion; onClose:()=>void; onEnviar:(correo:string)=>void }) {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  function enviar() {
    if (!correo.trim() || !/^\S+@\S+\.\S+$/.test(correo.trim())) { setError('Ingresá un correo válido.'); return; }
    onEnviar(correo.trim());
  }
  return (
    <Modal open title={`Enviar liquidación ${liq.consecutivo} por correo`} onClose={onClose}
      footer={
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, background:'#fff', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={enviar} style={{ height:34, padding:'0 16px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Enviar</button>
        </div>
      }>
      <p style={{ fontSize:11, color:C.n700, margin:'0 0 10px', fontFamily:F }}>Correo del destinatario</p>
      <input value={correo} onChange={e=>{setCorreo(e.target.value); setError('');}} placeholder="nombre@empresa.com" autoFocus
        style={{ width:'100%', height:34, padding:'0 10px', border:`1px solid ${error?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
      {error && <p style={{ fontSize:10, color:C.error, margin:'5px 0 0' }}>{error}</p>}
    </Modal>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GestionTarjetas() {
  const [liqs, setLiqs] = useState<Liquidacion[]>(LIQUIDACIONES_INIT);
  const [showNew, setShowNew] = useState(false);
  const [showExportar, setShowExportar] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  function toggleSel(id:number) { setSelected(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }
  function toggleSelAll(ids:number[]) { setSelected(p=> p.size===ids.length ? new Set() : new Set(ids)); }
  const [searchQ, setSearch] = useState('');
  const [filtFecha, setFiltFecha] = useState<{from:string;to:string}>({from:'',to:''});
  const [filtAfiliado, setFiltAfiliado] = useState<Set<string>>(new Set());
  const [filtCuenta, setFiltCuenta] = useState<Set<string>>(new Set());
  const [filtMoneda, setFiltMoneda] = useState<Set<string>>(new Set());
  const [filtUsuario, setFiltUsuario] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<string|null>(null);
  const [detalleLiq, setDetalleLiq] = useState<Liquidacion|null>(null);
  const [correoLiq, setCorreoLiq] = useState<Liquidacion|null>(null);
  const [anularLiq, setAnularLiq] = useState<Liquidacion|null>(null);
  const [imprimirLiq, setImprimirLiq] = useState<Liquidacion|null>(null);
  const empresaDoc = useEmpresaDoc();

  function anular(liq: Liquidacion) {
    setLiqs(p=>p.map(l=>l.id===liq.id?{...l,estado:'Anulada'}:l));
    setAnularLiq(null); setDetalleLiq(null);
    setToast(`Liquidación ${liq.consecutivo} anulada.`);
  }
  // Imprimir abre el comprobante estándar (se ve, se descarga y se imprime)
  function imprimir(liq: Liquidacion) { setImprimirLiq(liq); }

  const filtered = liqs.filter(l => {
    if (searchQ && !l.consecutivo.toLowerCase().includes(searchQ.toLowerCase()) && !l.afiliado.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (filtAfiliado.size > 0 && !filtAfiliado.has(l.afiliadoCode)) return false;
    if (filtCuenta.size > 0 && !filtCuenta.has(l.cuentaTransito)) return false;
    if (filtMoneda.size > 0 && !filtMoneda.has(l.moneda)) return false;
    if (filtUsuario.size > 0 && !filtUsuario.has(l.usuario)) return false;
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const paginated = filtered.slice((paginaActual-1)*pageSize, paginaActual*pageSize);

  const totalCRC = filtered.filter(l=>l.moneda==='CRC').reduce((s,l)=>s+l.importe,0);
  const totalUSD = filtered.filter(l=>l.moneda==='USD').reduce((s,l)=>s+l.importe,0);

  const IcEdit = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>;
  const IcPrint = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2h8v4"/><rect x="1" y="6" width="14" height="6" rx="1.5"/><path d="M4 9v5h8V9"/></svg>;

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>
      {/* Header */}
      <PageHeader title="Gestión de tarjetas">
        <BotonExportarUnico onClick={()=>setShowExportar(true)}/>
        <button onClick={()=>setShowNew(true)} style={{ height:34, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
          + Nueva liquidación
        </button>
      </PageHeader>

      {/* Filtros */}
      <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', gap:10, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
        <SearchInput value={searchQ} onChange={setSearch} placeholder="Buscar por consecutivo…" width={220} />
        <FechasFilter value={filtFecha} onChange={setFiltFecha} onClear={()=>setFiltFecha({from:'',to:''})}/>
        <FilterDropdown label="Afiliado" options={AFILIADOS.map(a=>a.code)} selected={filtAfiliado} onApply={setFiltAfiliado} onClear={()=>setFiltAfiliado(new Set())}/>
        <FilterDropdown label="Cuenta en tránsito" options={CUENTAS_TRANSITO} selected={filtCuenta} onApply={setFiltCuenta} onClear={()=>setFiltCuenta(new Set())}/>
        <FilterDropdown label="Moneda" options={['CRC','USD']} selected={filtMoneda} onApply={setFiltMoneda} onClear={()=>setFiltMoneda(new Set())}/>
        <FilterDropdown label="Usuario" options={['jperez','sblandon','yader','glopez']} selected={filtUsuario} onApply={setFiltUsuario} onClear={()=>setFiltUsuario(new Set())}/>
      </div>

      {/* Barra de acciones masivas */}
      <BulkActionBar count={selected.size} onClose={()=>setSelected(new Set())} actions={[
        { label:'Anular', variant:'outline', onClick:()=>{ setLiqs(p=>p.map(l=>selected.has(l.id)?{...l,estado:'Anulada'}:l)); setSelected(new Set()); } },
        { label:'Contabilizar', onClick:()=>{ setLiqs(p=>p.map(l=>selected.has(l.id)?{...l,estado:'Contabilizada'}:l)); setSelected(new Set()); } },
      ]}/>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto', background:'#fff', padding:`0 ${PAGE_PAD-12}px` }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
          <thead style={{ position:'sticky', top:0, background:'#fff', zIndex:2 }}>
            <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
              <th style={{ width:36, padding:'10px 0 10px 12px' }}>
                <input type="checkbox" checked={selected.size>0 && selected.size===paginated.length} onChange={()=>toggleSelAll(paginated.map(l=>l.id))} style={{ width:14, height:14, accentColor:BRAND, cursor:'pointer' }}/>
              </th>
              {['Consecutivo','Afiliado','Fecha','Cuenta en tránsito','Referencia','Moneda'].map(h=>(
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
              ))}
              <MoneyHeaderCells label="Importe"/>
              {['Usuario','Acciones'].map(h=>(
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map(l=>{
              const sym = l.moneda==='USD'?'$':simboloLocal();
              const [stColor, stBg] = ESTADO_STYLE[l.estado];
              return (
                <tr key={l.id} style={{ borderBottom:`1px solid #F5F5F5`, background:selected.has(l.id)?'#FFFBF0':'#fff', cursor:'pointer' }}
                  onClick={()=>setDetalleLiq(l)}
                  onMouseEnter={e=>{ if(!selected.has(l.id)) e.currentTarget.style.background=C.n200; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background=selected.has(l.id)?'#FFFBF0':'#fff'; }}>
                  <td style={{ padding:'10px 0 10px 12px' }} onClick={e=>e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(l.id)} onChange={()=>toggleSel(l.id)} style={{ width:14, height:14, accentColor:BRAND, cursor:'pointer' }}/>
                  </td>
                  <td style={{ padding:'10px 12px' }}><span style={{ color:BRAND, fontFamily:F, fontWeight:600, cursor:'pointer' }}>{l.consecutivo}</span></td>
                  <td style={{ padding:'10px 12px', fontSize:12, color:'#0F0F0F' }}>{l.afiliado.split('·')[0]?.trim()}</td>
                  <td style={{ padding:'10px 12px', color:C.n700 }}>{l.fecha}</td>
                  <td style={{ padding:'10px 12px', fontSize:11, color:'#0F0F0F', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={l.cuentaTransito}>{l.cuentaTransito}</td>
                  <td style={{ padding:'10px 12px', fontSize:11, color:C.n700 }}>{l.referencia}</td>
                  <td style={{ padding:'10px 12px' }}><span style={{ fontSize:10, padding:'2px 7px', background:C.n200, borderRadius:4 }}>{l.moneda} {sym}</span></td>
                  <MoneyCells sym={sym} value={fmt2(l.importe)}/>
                  <td style={{ padding:'10px 12px', color:C.n700, fontSize:11 }}>{l.usuario}</td>
                  <td onClick={e=>e.stopPropagation()} style={{ padding:'6px 8px', whiteSpace:'nowrap' }}>
                    <div style={{ display:'flex', gap:2 }}>
                      {l.nroAsiento && (
                        <button title="Ver asiento" onClick={()=>setToast(`Asiento ${l.nroAsiento} · consultalo en Bandeja de asientos.`)} style={{ width:26,height:26,borderRadius:5,border:`1px solid ${C.n500}`,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:BRAND }}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 7s2.2-4.5 6-4.5S13 7 13 7s-2.2 4.5-6 4.5S1 7 1 7z"/><circle cx="7" cy="7" r="1.5"/></svg>
                        </button>
                      )}
                      <button title="Editar" onClick={()=>setDetalleLiq(l)} style={{ width:26,height:26,borderRadius:5,border:`1px solid ${C.n500}`,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.n700 }}><IcEdit/></button>
                      <button title="Imprimir" onClick={()=>imprimir(l)} style={{ width:26,height:26,borderRadius:5,border:`1px solid ${C.n500}`,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.n700 }}><IcPrint/></button>
                      <button title="Enviar correo" onClick={()=>setCorreoLiq(l)} style={{ width:26,height:26,borderRadius:5,border:`1px solid ${C.n500}`,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.n700 }}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="1" y="3" width="12" height="8" rx="1.5"/><path d="M1 3l6 5 6-5"/></svg>
                      </button>
                      <button title="Anular" onClick={()=>setAnularLiq(l)} disabled={l.estado==='Anulada'} style={{ width:26,height:26,borderRadius:5,border:`1px solid ${`${C.errorBorder}`}`,background:C.errorBg,cursor:l.estado==='Anulada'?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.error,opacity:l.estado==='Anulada'?.4:1 }}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M4.5 4.5l5 5"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:`2px solid ${C.n500}`, background:'#F9F9F9' }}>
              <td colSpan={7} style={{ padding:'9px 12px', fontWeight:600, fontSize:12, fontFamily:F, textAlign:'right' }}>Totales</td>
              <MoneyCellsStack bold rows={[
                ...(totalCRC>0 ? [{sym:simboloLocal(), value:fmt2(totalCRC)}] : []),
                ...(totalUSD>0 ? [{sym:'$', value:fmt2(totalUSD)}] : []),
              ]}/>
              <td colSpan={2}/>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer */}
      <div style={{ background:'#fff', borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0 }}>
        <Pagination page={paginaActual} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      {showNew && <NuevaLiquidacionModal onClose={()=>setShowNew(false)} onSave={liq=>{setLiqs(p=>[liq,...p]);}}/>}
      {showExportar && (
        <ExportListModal
          title="Gestión de tarjetas - Liquidaciones"
          subtitulo={`${filtered.length} liquidación${filtered.length===1?'':'es'}`}
          filename="liquidaciones-tarjetas"
          columns={[
            { key:'consecutivo', label:'Consecutivo' }, { key:'fecha', label:'Fecha' }, { key:'afiliado', label:'Afiliado' },
            { key:'cuentaTransito', label:'Cuenta de tránsito' }, { key:'referencia', label:'Referencia' },
            { key:'importe', label:'Importe', align:'right' }, { key:'usuario', label:'Usuario' }, { key:'estado', label:'Estado' },
          ]}
          rows={filtered.map(l=>({
            consecutivo:l.consecutivo, fecha:l.fecha, afiliado:l.afiliado, cuentaTransito:l.cuentaTransito,
            referencia:l.referencia, importe:`${l.moneda==='USD'?'$':simboloLocal()} ${fmtNum(l.importe,2)}`, usuario:l.usuario, estado:l.estado,
          }))}
          onClose={()=>setShowExportar(false)}
        />
      )}

      {detalleLiq && (
        <DetalleLiquidacionModal liq={detalleLiq} onClose={()=>setDetalleLiq(null)} onAnular={()=>setAnularLiq(detalleLiq)}/>
      )}
      {correoLiq && (
        <CorreoLiquidacionModal liq={correoLiq} onClose={()=>setCorreoLiq(null)}
          onEnviar={(correo)=>{ setCorreoLiq(null); setToast(`Liquidación ${correoLiq.consecutivo} enviada a ${correo}.`); }}/>
      )}
      {anularLiq && (
        <Modal open title="Anular liquidación" onClose={()=>setAnularLiq(null)}
          footer={
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button onClick={()=>setAnularLiq(null)} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, background:'#fff', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
              <button onClick={()=>anular(anularLiq)} style={{ height:34, padding:'0 16px', background:C.error, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Anular</button>
            </div>
          }>
          <p style={{ fontSize:12, color:'#0F0F0F', margin:0, fontFamily:F }}>
            ¿Anular la liquidación <strong>{anularLiq.consecutivo}</strong> de {anularLiq.afiliado.split('·')[0]?.trim()} por {anularLiq.moneda==='USD'?'$':simboloLocal()} {fmt2(anularLiq.importe)}?
          </p>
        </Modal>
      )}
      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}

      {/* Imprimir liquidación - formato dedicado, sin el resto de la pantalla */}
      <style>{`
        #liq-print-area { display:none; }
        @media print {
          body * { visibility:hidden; }
          #liq-print-area, #liq-print-area * { visibility:visible; }
          #liq-print-area { display:block !important; position:absolute; left:0; top:0; width:100%; padding:32px; }
        }
      `}</style>
      {imprimirLiq && <ComprobanteOperacionModal titulo={`Comprobante · Liquidación ${imprimirLiq.consecutivo}`} archivo={`comprobante-liquidacion-${imprimirLiq.consecutivo}`} marca={C.brand}
        onClose={() => setImprimirLiq(null)} comprobantes={armarComprobantes({ clase: 'Liquidación de tarjetas', numero: imprimirLiq.consecutivo, empresa: empresaDoc,
          tercero: { nombre: imprimirLiq.afiliado, identificacion: imprimirLiq.afiliadoCode }, fecha: imprimirLiq.fecha,
          medioPago: `Liquidación de tarjetas · ${imprimirLiq.cuentaTransito}${imprimirLiq.referencia ? ` · Ref. ${imprimirLiq.referencia}` : ''}`,
          concepto: `Liquidación de vouchers de ${imprimirLiq.afiliado}`, simbolo: imprimirLiq.moneda === 'USD' ? '$' : simboloLocal(), importe: imprimirLiq.importe, documentos: [] })} />}
    </div>
  );
}
