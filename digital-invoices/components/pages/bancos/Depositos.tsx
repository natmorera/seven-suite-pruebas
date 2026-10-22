'use client';
import ComprobanteOperacionModal from '@/components/ui/documento/ComprobanteOperacion';
import { armarComprobantes } from '@/components/ui/documento/comprobantes';
import { useEmpresaDoc } from '@/components/ui/documento/useEmpresaDoc';
import React, { useState, useRef, useEffect } from 'react';
import { C, fmtNum, Pagination, BotonExportarUnico, ExportListModal, PAGE_PAD, MoneyHeaderCells, MoneyCells, MoneyCellsStack, PresenciaOperacion, FONT, radius, shadow, PageHeader, SearchInput, FilterDropdown } from '../../ui/primitives';
import { simboloLocal } from '@/lib/paisActual';

const F = FONT;

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

// ── Modal: Nueva transferencia ─────────────────────────────────────────────────
const BRAND = C.brand;
function fmt2(n: number) { return fmtNum(n, 2); }

type EstadoDep = 'Pendiente' | 'Contabilizada' | 'Anulados';

interface Partida {
  id: string;
  comprobante: string;
  fecha: string;
  descripcion: string;
  importe: number;
  incluida: boolean;
}

interface Deposito {
  id: number;
  consecutivo: string;
  fecha: string;
  estado: EstadoDep;
  cuentaOrigen: string;
  bancoDestino: string;
  referencia: string;
  moneda: 'CRC' | 'USD';
  importe: number;
  usuario: string;
}

const CUENTAS_EFECTIVO = [
  '11020201 – Efectivo CRC Front Selvatura',
  '11020202 – Efectivo USD Front Selvatura',
  '11025251 – Efectivo CRC Rest El Jardín',
  '11020202 – Efectivo USD Front S…',
];

const BANCOS_DESTINO = [
  'BNCR – Cta. 015-004943-0 (CRC)',
  'BAC – Cta. 4646545466888 (CRC)',
  'BCR – 001-0252067-2 (CRC)',
  'BAC – San José 917900144 (USD)',
];

const PARTIDAS_MOCK: Partida[] = [
  { id:'p1', comprobante:'60500214', fecha:'00/00/0000', descripcion:'Depósito de efectivo del 04/05', importe:38000.00,  incluida:true  },
  { id:'p2', comprobante:'60500217', fecha:'00/00/0000', descripcion:'Depósito de efectivo del 04/05', importe:17493.22,  incluida:true  },
  { id:'p3', comprobante:'60500218', fecha:'00/00/0000', descripcion:'Depósito de efectivo del 05/05', importe:193466.99, incluida:false },
];

const DEPOSITOS_INIT: Deposito[] = [
  { id:1, consecutivo:'DEP-4339', fecha:'00/00/00', estado:'Pendiente',     cuentaOrigen:'11020201 – Efectivo CRC Front S…',  bancoDestino:'BNCR 015-004943-0',     referencia:'-',       moneda:'USD', importe:1200,      usuario:'jperez'   },
  { id:2, consecutivo:'DEP-4338', fecha:'00/00/00', estado:'Pendiente',     cuentaOrigen:'11020201 – Efectivo CRC Front S…',  bancoDestino:'BNCR 015-004943-0',     referencia:'89774412',moneda:'CRC', importe:55500,     usuario:'sblandon' },
  { id:3, consecutivo:'DEP-4337', fecha:'00/00/00', estado:'Contabilizada', cuentaOrigen:'11025251 – Efectivo CRC Rest El J…', bancoDestino:'BAC San José 917900144',referencia:'45464545',moneda:'CRC', importe:193466.99, usuario:'yader'    },
  { id:4, consecutivo:'DEP-4335', fecha:'00/00/00', estado:'Anulados',      cuentaOrigen:'11020202 – Efectivo USD Front S…',  bancoDestino:'BCR 001-0252067-2',     referencia:'89774412',moneda:'CRC', importe:0,         usuario:'yader'    },
];

const ESTADO_STYLE: Record<EstadoDep,[string,string]> = {
  Pendiente:     ['#EF9F27','rgba(239,159,39,.12)'],
  Contabilizada: [C.success,'rgba(29,158,117,.12)'],
  Anulados:      [C.error,'rgba(226,75,74,.12)'],
};

function Pill({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return <span style={{ fontSize:11, padding:'2px 9px', borderRadius:radius.pill, fontWeight:500, color, background:bg, whiteSpace:'nowrap', fontFamily:F }}>{children}</span>;
}
function Btn({ children, onClick, variant='primary', disabled=false, icon }: { children: React.ReactNode; onClick?: ()=>void; variant?: 'primary'|'secondary'|'danger'|'ghost'; disabled?: boolean; icon?: React.ReactNode }) {
  const vs: Record<string,React.CSSProperties> = {
    primary:   { background:BRAND, color:'#fff', border:`1px solid ${BRAND}` },
    secondary: { background:'#fff', color:'#0F0F0F', border:`1px solid ${C.n500}` },
    ghost:     { background:'transparent', color:C.success, border:`1px solid #1D9E75` },
    danger:    { background:'transparent', color:C.error, border:'none' },
  };
  return <button onClick={onClick} disabled={disabled} style={{ height:34, padding:'0 16px', borderRadius:radius.md, cursor:disabled?'default':'pointer', fontSize:12, fontFamily:F, fontWeight:500, display:'flex', alignItems:'center', gap:6, opacity:disabled?.5:1, ...vs[variant] }}>{icon}{children}</button>;
}

// ── Modal: Nuevo depósito ─────────────────────────────────────────────────────
function NuevoDepositoModal({ onClose, onSave }: { onClose: ()=>void; onSave: (d: Deposito)=>void }) {
  const [partidas, setPartidas] = useState<Partida[]>(PARTIDAS_MOCK);
  const [partidasOpen, setPartidasOpen] = useState(true);
  const [importe, setImporte] = useState(55500);
  const [guardado, setGuardado] = useState(false); // simula estado contabilizado

  const incluidas    = partidas.filter(p=>p.incluida);
  const totalIncluidas = incluidas.reduce((s,p)=>s+p.importe, 0);
  const diferencia   = importe - totalIncluidas;
  const ajusteDif    = Math.abs(diferencia);

  function togglePartida(id: string) {
    setPartidas(p => p.map(x => x.id===id ? { ...x, incluida:!x.incluida } : x));
  }

  const IcCheck = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5 8l2 2 4-4"/></svg>;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:'100%', maxWidth:1240, boxShadow:shadow.modal, fontFamily:F, display:'flex', flexDirection:'column' }}
        onClick={e=>e.stopPropagation()}>

        {/* Title */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:14, fontWeight:600 }}>Nuevo depósito en efectivo</span>
          <span style={{ fontSize:13, color:C.n700 }}>4340</span>
          <Pill color={ESTADO_STYLE['Pendiente'][0]} bg={ESTADO_STYLE['Pendiente'][1]}>Pendiente</Pill>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:14 }}>
            <PresenciaOperacion/>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, fontSize:20 }}>×</button>
          </div>
        </div>

        <div style={{ display:'flex', flex:1 }}>
          {/* Main */}
          <div style={{ flex:1, padding:'16px 20px', overflowY:'auto', display:'flex', flexDirection:'column', gap:16 }}>
            {/* Origen y destino */}
            <div>
              <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>ORIGEN Y DESTINO</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px 16px' }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Cuenta origen (efectivo) <span style={{ color:C.error }}>*</span></label>
                  <select style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', appearance:'none' }}>
                    {CUENTAS_EFECTIVO.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Banco y cuenta destino <span style={{ color:C.error }}>*</span></label>
                  <select style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', appearance:'none' }}>
                    {BANCOS_DESTINO.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Título / Leyenda</label>
                  <input defaultValue="Depósito en efectivo - 4340" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                  <p style={{ fontSize:11, color:BRAND, margin:'3px 0 0' }}>Auto-propuesto.</p>
                </div>
              </div>
            </div>

            {/* Detalle del pago */}
            <div>
              <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>DETALLE DEL PAGO</p>
              <div style={{ display:'grid', gridTemplateColumns:'155px 155px 140px 190px 1fr', gap:'8px 14px', alignItems:'end' }}>
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
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Tipo de cambio</label>
                  <input defaultValue="1.00" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Importe <span style={{ color:C.error }}>*</span></label>
                  <div style={{ display:'flex', alignItems:'center', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, gap:6 }}>
                    <span style={{ color:C.n700, fontSize:11 }}>{simboloLocal()}</span>
                    <input type="number" value={importe} onChange={e=>setImporte(+e.target.value)} style={{ flex:1, border:'none', outline:'none', fontSize:12, fontFamily:F }}/>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Referencia bancaria</label>
                  <input placeholder="Nro. transacción del banco" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
                </div>
              </div>
            </div>

            {/* Partidas pendientes */}
            <div style={{ border:`1px solid ${C.n500}`, borderRadius:10, overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:C.n200 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>Partidas pendientes de efectivo</span>
                <button onClick={()=>setPartidasOpen(v=>!v)} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    {partidasOpen?<path d="M3.5 8.75L7 5.25L10.5 8.75"/>:<path d="M3.5 5.25L7 8.75L10.5 5.25"/>}
                  </svg>
                </button>
              </div>
              {partidasOpen && (
                <>
                  {/* Summary row */}
                  <div style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr 1fr', gap:'4px 20px', padding:'10px 14px', background:'#FAFAFA', borderBottom:`1px solid ${C.n500}`, fontSize:12 }}>
                    <div>
                      <p style={{ fontSize:10, color:C.n700, margin:'0 0 2px' }}>Partidas</p>
                      <p style={{ fontSize:14, fontWeight:700, color:'#0F0F0F', margin:0 }}>{partidas.length}</p>
                    </div>
                    <div>
                      <p style={{ fontSize:10, color:C.n700, margin:'0 0 2px' }}>Total pendiente</p>
                      <p style={{ fontSize:12, fontWeight:600, color:'#0F0F0F', margin:0 }}>{simboloLocal()} {fmt2(partidas.reduce((s,p)=>s+p.importe,0))}</p>
                    </div>
                    <div>
                      <p style={{ fontSize:10, color:C.n700, margin:'0 0 2px' }}>Incluidas</p>
                      <p style={{ fontSize:12, fontWeight:600, color:BRAND, margin:0 }}>{simboloLocal()} {fmt2(totalIncluidas)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize:10, color:C.n700, margin:'0 0 2px' }}>Diferencia</p>
                      <p style={{ fontSize:12, fontWeight:600, color: ajusteDif>0 ? C.error : C.success, margin:0 }}>{simboloLocal()} {fmt2(ajusteDif)}</p>
                    </div>
                  </div>
                  {/* Rows */}
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
                    <thead><tr style={{ borderBottom:`1px solid ${C.n500}` }}>
                      {['Comprobante','Fecha','Descripción','Importe CRC',''].map(h=>(
                        <th key={h} style={{ padding:'7px 12px', textAlign:h==='Importe CRC'?'right':'left', fontWeight:500, color:C.n700, fontSize:11 }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {partidas.map(p=>(
                        <tr key={p.id} style={{ borderBottom:`1px solid #F5F5F5`, background: p.incluida ? C.brandBg : '#fff' }}>
                          <td style={{ padding:'8px 12px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <input type="checkbox" checked={p.incluida} onChange={()=>togglePartida(p.id)} style={{ width:14, height:14, accentColor:BRAND }}/>
                              <span style={{ color: p.incluida ? BRAND : '#0F0F0F', fontFamily:F, fontWeight: p.incluida ? 600 : 400 }}>{p.comprobante}</span>
                            </div>
                          </td>
                          <td style={{ padding:'8px 12px', color:C.n700 }}>{p.fecha}</td>
                          <td style={{ padding:'8px 12px', color:'#0F0F0F' }}>{p.descripcion}</td>
                          <td style={{ padding:'8px 12px', fontWeight: p.incluida ? 600 : 400 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:100 }}>
                            <span style={{ color:C.n700, fontSize:11 }}>{simboloLocal()}</span>
                            <span>{fmt2(p.importe)}</span>
                          </div>
                        </td>
                          <td style={{ padding:'8px 8px' }}>
                            <button onClick={()=>setPartidas(ps=>ps.filter(x=>x.id!==p.id))} style={{ background:'none', border:'none', cursor:'pointer', color: p.incluida ? C.error : C.n500, fontSize:16 }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>

          {/* Sidebar resumen */}
          <div style={{ width:230, borderLeft:`1px solid ${C.n500}`, padding:'16px 16px', flexShrink:0 }}>
            <p style={{ fontSize:13, fontWeight:600, margin:'0 0 14px' }}>Resumen</p>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:12 }}>
              <span style={{ color:C.n700 }}>Ajuste diferencial</span>
              <span style={{ fontWeight:600, color: ajusteDif>0 ? C.error : C.success }}>{simboloLocal()}{fmt2(ajusteDif)}</span>
            </div>
            <div>
              <p style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, margin:'0 0 6px' }}>Cuenta para depositar el diferencial (opcional)</p>
              <select style={{ width:'100%', height:34, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', appearance:'none', background:'#fff' }}>
                <option>Seleccionar</option>
                <option>600-002-0001 – Diferencias</option>
              </select>
              <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'4px 0', display:'block', fontFamily:F }}>Diferencia de vueltos</button>
            </div>
          </div>
        </div>

        {/* Footer - cambia según estado */}
        <div style={{ borderTop:`1px solid ${C.n500}`, padding:'12px 24px', display:'flex', justifyContent:'flex-end', gap:8 }}>
          {guardado ? (
            <>
              <Btn variant="danger" onClick={onClose}>Anular</Btn>
              <Btn variant="secondary" onClick={()=>{}}>Visualizar asiento</Btn>
              <Btn variant="ghost" icon={<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5 8l2 2 4-4"/></svg>}>
                Contabilizar
              </Btn>
            </>
          ) : (
            <>
              <Btn variant="danger" onClick={onClose}>Descartar</Btn>
              <Btn onClick={()=>{
                onSave({ id:Date.now(), consecutivo:`DEP-${Math.floor(Math.random()*1000+4000)}`, fecha:'00/00/00', estado:'Pendiente', cuentaOrigen:CUENTAS_EFECTIVO[0], bancoDestino:BANCOS_DESTINO[0], referencia:'-', moneda:'CRC', importe, usuario:'jperez' });
                onClose();
              }}>Aplicar operación</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Depositos() {
  const [deps, setDeps]     = useState<Deposito[]>(DEPOSITOS_INIT);
  const [showNew, setShowNew] = useState(false);
  const [comprobante, setComprobante] = useState<Deposito | null>(null);
  const empresaDoc = useEmpresaDoc();
  const [showExportar, setShowExportar] = useState(false);
  const [searchQ, setSearch] = useState('');
  const [filtFecha, setFiltFecha] = useState({from:'',to:''});
  const [filtCuenta, setFiltCuenta] = useState<Set<string>>(new Set());
  const [filtBanco, setFiltBanco] = useState<Set<string>>(new Set());
  const [filtEstado, setFiltEstado] = useState<Set<string>>(new Set());
  const [filtMoneda, setFiltMoneda] = useState<Set<string>>(new Set());
  const [filtUsuario, setFiltUsuario] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = deps.filter(d => {
    if (searchQ && !d.consecutivo.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (filtEstado.size > 0 && !filtEstado.has(d.estado)) return false;
    if (filtCuenta.size > 0 && !filtCuenta.has(d.cuentaOrigen)) return false;
    if (filtBanco.size > 0 && ![...filtBanco].some(b => d.bancoDestino.includes(b))) return false;
    if (filtMoneda.size > 0 && !filtMoneda.has(d.moneda)) return false;
    if (filtUsuario.size > 0 && !filtUsuario.has(d.usuario)) return false;
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const paginated = filtered.slice((paginaActual-1)*pageSize, paginaActual*pageSize);

  const totalCRC = filtered.filter(d=>d.moneda==='CRC').reduce((s,d)=>s+d.importe,0);
  const totalUSD = filtered.filter(d=>d.moneda==='USD').reduce((s,d)=>s+d.importe,0);

  const IcEdit  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>;
  const IcPrint = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2h8v4"/><rect x="1" y="6" width="14" height="6" rx="1.5"/><path d="M4 9v5h8V9"/></svg>;

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>
      {/* Header */}
      <PageHeader title="Depósitos en efectivo">
        <BotonExportarUnico onClick={()=>setShowExportar(true)}/>
        <button onClick={()=>setShowNew(true)} style={{ height:34, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
          + Nuevo depósito
        </button>
      </PageHeader>

      {/* Filtros */}
      <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', gap:10, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
        <SearchInput value={searchQ} onChange={setSearch} placeholder="Buscar por consecutivo…" width={220} />
        <FechasFilter value={filtFecha} onChange={setFiltFecha} onClear={()=>setFiltFecha({from:'',to:''})}/>
        <FilterDropdown label="Estado" options={['Pendiente','Contabilizada','Anulados']} selected={filtEstado} onApply={setFiltEstado} onClear={()=>setFiltEstado(new Set())}/>
        <FilterDropdown label="Cuenta origen" options={CUENTAS_EFECTIVO} selected={filtCuenta} onApply={setFiltCuenta} onClear={()=>setFiltCuenta(new Set())}/>
        <FilterDropdown label="Banco" options={['BNCR','BAC','BCR']} selected={filtBanco} onApply={setFiltBanco} onClear={()=>setFiltBanco(new Set())}/>
        <FilterDropdown label="Moneda" options={['CRC','USD']} selected={filtMoneda} onApply={setFiltMoneda} onClear={()=>setFiltMoneda(new Set())}/>
        <FilterDropdown label="Usuario" options={['jperez','sblandon','yader','glopez']} selected={filtUsuario} onApply={setFiltUsuario} onClear={()=>setFiltUsuario(new Set())}/>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto', background:'#fff', padding:`0 ${PAGE_PAD-12}px` }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
          <thead style={{ position:'sticky', top:0, background:'#fff', zIndex:2 }}>
            <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
              <th style={{ width:16 }}/>
              {['Consecutivo','Fecha','Estado','Cuenta origen','Banco destino','Referencia','Moneda'].map(h=>(
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
              ))}
              <MoneyHeaderCells label="Importe"/>
              {['Usuario','Acciones'].map(h=>(
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map(d=>{
              const sym=d.moneda==='USD'?'$':simboloLocal();
              const [stColor, stBg] = ESTADO_STYLE[d.estado];
              return (
                <tr key={d.id} style={{ borderBottom:`1px solid #F5F5F5` }}
                  onMouseEnter={e=>(e.currentTarget.style.background=C.n200)}
                  onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                  <td/>
                  <td style={{ padding:'10px 12px' }}><span style={{ color:BRAND, fontFamily:F, fontWeight:500, cursor:'pointer' }}>{d.consecutivo}</span></td>
                  <td style={{ padding:'10px 12px', color:C.n700 }}>{d.fecha}</td>
                  <td style={{ padding:'10px 12px' }}><Pill color={stColor} bg={stBg}>{d.estado}</Pill></td>
                  <td style={{ padding:'10px 12px', fontSize:11, color:'#0F0F0F', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={d.cuentaOrigen}>{d.cuentaOrigen}</td>
                  <td style={{ padding:'10px 12px', fontSize:11, color:'#0F0F0F', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={d.bancoDestino}>{d.bancoDestino}</td>
                  <td style={{ padding:'10px 12px', fontSize:11, color:C.n700 }}>{d.referencia}</td>
                  <td style={{ padding:'10px 12px' }}><span style={{ fontSize:10, padding:'2px 7px', background:C.n200, borderRadius:4 }}>{d.moneda} {sym}</span></td>
                  <MoneyCells sym={sym} value={fmt2(d.importe)}/>
                  <td style={{ padding:'10px 12px', color:C.n700, fontSize:11 }}>{d.usuario}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:5 }}>
                      <button title="Ver comprobante" aria-label="Ver comprobante" onClick={()=>setComprobante(d)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }}><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 1.5h6l3 3v10H4z"/><path d="M10 1.5v3h3M6 8h5M6 10.5h5M6 13h3"/></svg></button>
                      <button style={{ width:26, height:26, borderRadius:5, border:`1px solid ${C.n500}`, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.n700 }}><IcEdit/></button>
                      <button style={{ width:26, height:26, borderRadius:5, border:`1px solid ${C.n500}`, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.n700 }}><IcPrint/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:`2px solid ${C.n500}`, background:'#F9F9F9' }}>
              <td colSpan={8} style={{ padding:'9px 12px', fontWeight:600, fontSize:12, fontFamily:F, textAlign:'right' }}>Totales</td>
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

      {comprobante && <ComprobanteOperacionModal titulo={`Comprobante · Depósito ${comprobante.consecutivo}`} archivo={`comprobante-deposito-${comprobante.consecutivo}`} marca={C.brand}
        onClose={() => setComprobante(null)} comprobantes={armarComprobantes({ clase: 'Depósito', numero: comprobante.consecutivo, empresa: empresaDoc,
          tercero: { nombre: comprobante.bancoDestino }, fecha: comprobante.fecha, medioPago: `Depósito en efectivo${comprobante.referencia ? ` · Ref. ${comprobante.referencia}` : ''}`,
          concepto: `Depósito de efectivo desde ${comprobante.cuentaOrigen}`, simbolo: comprobante.moneda === 'USD' ? '$' : simboloLocal(), importe: comprobante.importe, documentos: [] })} />}
      {showNew && <NuevoDepositoModal onClose={()=>setShowNew(false)} onSave={d=>{setDeps(p=>[d,...p]);}}/>}
      {showExportar && (
        <ExportListModal
          title="Depósitos en efectivo"
          subtitulo={`${filtered.length} depósito${filtered.length===1?'':'s'}`}
          filename="depositos"
          columns={[
            { key:'consecutivo', label:'Consecutivo' }, { key:'fecha', label:'Fecha' }, { key:'cuentaOrigen', label:'Cuenta origen' },
            { key:'bancoDestino', label:'Banco destino' }, { key:'referencia', label:'Referencia' },
            { key:'importe', label:'Importe', align:'right' }, { key:'usuario', label:'Usuario' }, { key:'estado', label:'Estado' },
          ]}
          rows={filtered.map(d=>({
            consecutivo:d.consecutivo, fecha:d.fecha, cuentaOrigen:d.cuentaOrigen, bancoDestino:d.bancoDestino,
            referencia:d.referencia, importe:`${d.moneda==='USD'?'$':simboloLocal()} ${fmtNum(d.importe,2)}`, usuario:d.usuario, estado:d.estado,
          }))}
          onClose={()=>setShowExportar(false)}
        />
      )}
    </div>
  );
}
