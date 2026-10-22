'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, Pagination, Toast, fechaVencimiento, diasVencidos, FONT, radius, shadow, PageHeader, Radio, Button } from '../../ui/primitives';
import { useFirmasConfig, firmasParaReporte, FirmasBloque } from '../config/firmasConfig';
import { simboloLocal } from '@/lib/paisActual';

const F = FONT;
const BRAND = '#A77600';
const RED = '#F44336';
const GREEN = '#4CAF50';

function fmt(n: number) {
  const abs = Math.abs(n);
  const s = abs.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
  return n < 0 ? `(${s})` : s;
}

// en el histórico solo se debe mostrar el ID auxiliar (último
// segmento del código de cuenta), no el código completo con los prefijos
// de mayor/sub mayor/detalle.
function soloIdAux(id: string): string {
  const partes = id.split('-');
  return partes[partes.length - 1];
}

function fmtFechaHora() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const min = String(d.getMinutes()).padStart(2,'0');
  return `${dd}/${mm}/${yyyy} ${String(h).padStart(2,'0')}:${min} ${ampm}`;
}

// ── Botón de filtro con lista desplegable ──────────────────────────────────────
function FilterBtn({ label, active, children, align='left' }: {
  label:string; active?:boolean; children?:React.ReactNode; align?:'left'|'right';
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(()=>{
    function close(e:MouseEvent){ if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return ()=>document.removeEventListener('mousedown', close);
  },[]);
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ height:32, padding:'0 12px', border:`1px solid ${active?BRAND:C.n500}`, borderRadius:4,
          background:active?'#FFF8EC':'#fff', cursor:'pointer', fontSize:12, fontFamily:F,
          display:'flex', alignItems:'center', gap:5, color:active?BRAND:C.n700, whiteSpace:'nowrap' }}>
        {label}
        <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d={open?"M3 9L7 5L11 9":"M3 5L7 9L11 5"}/>
        </svg>
      </button>
      {open && children && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', [align]:0, zIndex:300, background:'#fff',
          border:`1px solid ${C.n500}`, borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,.12)', padding:16, minWidth:300, width:320 }}>
          {children}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:14 }}>
            <button onClick={()=>setOpen(false)}
              style={{ height:30, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
            <button onClick={()=>setOpen(false)}
              style={{ height:30, padding:'0 14px', border:'none', borderRadius:radius.sm, background:BRAND, color:'#fff', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500 }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function RadioGroup({ name, options, value, onChange }: {
  name:string; options:{label:string;value:string}[]; value:string; onChange:(v:string)=>void;
}) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {options.map(opt=>(
        <Radio key={opt.value} id={`${name}-${opt.value}`} name={name} checked={value===opt.value}
          onChange={()=>onChange(opt.value)} label={opt.label}/>
      ))}
    </div>
  );
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const CLIENTES_EC = [
  { id:'13201009', nombre:'ARA Agencia de Viajes Internacional', periodo:'Mayo 2026', moneda:'COL - Colón',
    saldoPendiente:-3241889.74, ultimaOp:'30/04/2025', diasVencido:398,
    movimientos:[
      { doc:'FE-010000030531',       fecha:'04/01/2022', desc:'RE-11, ARA Agencia de Viajes Internacional (dt)', debe:-178596.45, haber:91364.85,  saldo:-87231.60,    dias:1610, fultOp:'04/01/2022' },
      { doc:'FE-0010005001000004510',fecha:'24/03/2022', desc:'DALSTEIN',                                         debe:92514.30,  haber:0,         saldo:92514.30,     dias:1531, fultOp:'24/03/2022' },
      { doc:'FE-0010005001000013600',fecha:'16/12/2022', desc:'Vogele Reisen CR ID-ARGR166002 RE-43651',          debe:-298279.00,haber:325383.91, saldo:27104.92,     dias:1264, fultOp:'29/06/2023' },
      { doc:'FE-0010005001000042118',fecha:'12/12/2024', desc:'Kultour x11+1TL ID-2129445 RE-152050',             debe:216027.28, haber:0,         saldo:216027.28,    dias:537,  fultOp:'12/12/2024' },
      { doc:'FE-0010005001000045071',fecha:'11/03/2025', desc:'Berge & Meer Baden 04.03.25 ID-ARTS178114',        debe:608022.25, haber:0,         saldo:608022.25,    dias:448,  fultOp:'11/03/2025' },
      { doc:'FE-0010005001000046467',fecha:'27/04/2025', desc:'Familie Favre x4 ID-ARFI176612 RE-149597',         debe:115946.18, haber:0,         saldo:115946.18,    dias:401,  fultOp:'27/04/2025' },
    ]
  },
  { id:'13014006', nombre:'Hotel Heliconia S.A.', periodo:'Mayo 2026', moneda:'COL - Colón',
    saldoPendiente:-640907.47, ultimaOp:'15/03/2025', diasVencido:310,
    movimientos:[
      { doc:'FAV-000000000001',     fecha:'01/01/2022', desc:'Servicio hospedaje anual 2022', debe:-640907.47, haber:0,      saldo:-640907.47, dias:1592, fultOp:'01/01/2022' },
      { doc:'FE-0010005001000038901',fecha:'10/08/2024', desc:'Paquete grupos 2024',           debe:189500.00, haber:0,      saldo:189500.00,  dias:294,  fultOp:'10/08/2024' },
    ]
  },
  { id:'30401001', nombre:'Corporación Tica S.A.', periodo:'Mayo 2026', moneda:'COL - Colón',
    saldoPendiente:-540000.00, ultimaOp:'28/02/2026', diasVencido:115,
    movimientos:[
      { doc:'FE-0010005001000049012',fecha:'15/01/2026', desc:'Servicio habitaciones enero 2026', debe:540000.00, haber:0, saldo:540000.00, dias:158, fultOp:'15/01/2026' },
    ]
  },
];

const PROVEEDORES_EC = [
  { id:'300-001-0001-0001', nombre:'Materiales Occidente S.A.', periodo:'Mayo 2026', moneda:'COL - Colón',
    saldoPendiente:-2000000, ultimaOp:'10/04/2026', diasVencido:135,
    movimientos:[
      { doc:'COM-0000128',fecha:'15/01/2026', desc:'Factura materiales construcción', debe:0, haber:-1200000, saldo:-1200000, dias:144, fultOp:'15/01/2026' },
      { doc:'COM-0000189',fecha:'02/03/2026', desc:'Suministros mantenimiento',       debe:0, haber:-800000,  saldo:-800000,  dias:97,  fultOp:'02/03/2026' },
    ]
  },
  { id:'300-001-0001-0002', nombre:'Ferretero Monteverde S.A.', periodo:'Mayo 2026', moneda:'COL - Colón',
    saldoPendiente:-1800000, ultimaOp:'20/04/2026', diasVencido:110,
    movimientos:[
      { doc:'COM-0000210',fecha:'20/01/2026', desc:'Materiales eléctricos', debe:0, haber:-1800000, saldo:-1800000, dias:139, fultOp:'20/01/2026' },
    ]
  },
];

interface CuentaCP {
  id: string; nombre: string; periodo: string; moneda: string;
  saldoPendiente: number; ultimaOp: string; diasVencido: number;
  movimientos: { doc:string; fecha:string; desc:string; debe:number; haber:number; saldo:number; dias:number; fultOp:string }[];
}
interface RangoCP { desde: string; hasta: string }

// "Hoy" de referencia para todo el módulo de antigüedad de saldos (mock)
const HOY_ANTIGUEDAD = new Date(2026, 5, 2); // 02/06/2026

const AGING_DATA = [
  { id:'13201009', nombre:'ARA Agencia de Viajes Internacional',
    docs:[
      { doc:'FE-010000029402',        fechaFactura:'2025-12-04', diasCredito:30, monto:87231.60 },   // +120 días
      { doc:'FE-010000029423',        fechaFactura:'2026-01-18', diasCredito:30, monto:216027.28 },  // 91–120 días
      { doc:'FE-0010005001000042118', fechaFactura:'2026-02-17', diasCredito:30, monto:608022.25 },  // 61–90 días
      { doc:'FE-0010005001000046467', fechaFactura:'2026-04-18', diasCredito:30, monto:115946.18 },  // 1–30 días
      { doc:'FE-0010005001000049200', fechaFactura:'2026-05-13', diasCredito:30, monto:92514.30 },   // corriente
    ]
  },
  { id:'13014006', nombre:'Hotel Heliconia S.A.',
    docs:[
      { doc:'FAV-000000000001',       fechaFactura:'2026-03-19', diasCredito:30, monto:640907.47 },  // 31–60 días
      { doc:'FE-0010005001000038901', fechaFactura:'2025-12-04', diasCredito:30, monto:189500.00 },  // +120 días
    ]
  },
];

type DocAntiguedad = ReturnType<typeof bucketizeDoc>;
function bucketizeDoc(d: { doc:string; fechaFactura:string; diasCredito:number; monto:number }, hoy: Date = HOY_ANTIGUEDAD) {
  const venceDate = fechaVencimiento(d.fechaFactura, d.diasCredito);
  const vence = `${String(venceDate.getDate()).padStart(2,'0')}/${String(venceDate.getMonth()+1).padStart(2,'0')}/${venceDate.getFullYear()}`;
  const dv = diasVencidos(d.fechaFactura, d.diasCredito, hoy);
  const base = { corr:0, d30:0, d60:0, d90:0, d120:0, mas120:0 };
  if (dv <= 0)       base.corr   = d.monto;
  else if (dv <= 30) base.d30    = d.monto;
  else if (dv <= 60) base.d60    = d.monto;
  else if (dv <= 90) base.d90    = d.monto;
  else if (dv <= 120) base.d120  = d.monto;
  else                base.mas120 = d.monto;
  return { ...base, doc:d.doc, vence, diasVencidos:dv };
}

// ── Estado de cuenta ──────────────────────────────────────────────────────────
function EstadoCuenta({ cuentas }: { cuentas: CuentaCP[] }) {
  if (cuentas.length === 0) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#9E9E9E', fontSize:12, fontFamily:F }}>
        Sin cuentas para los filtros seleccionados.
      </div>
    );
  }

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ flex:1, overflowY:'auto' }}>
          {cuentas.map(cli=>(
            <div key={cli.id} style={{ borderBottom:`8px solid #F5F5F5` }}>
              {/* Encabezado del cliente */}
              <div style={{ padding:'10px 18px', background:'#FAFAFA', borderBottom:`1px solid ${C.n500}`,
                display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, flexWrap:'wrap', gap:8, position:'sticky', top:0, zIndex:1 }}>
                <div>
                  <span style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', fontFamily:F }}>{soloIdAux(cli.id)} / {cli.nombre}</span>
                  <span style={{ fontSize:11, color:'#757575', marginLeft:10, fontFamily:F }}>
                    Período: {cli.periodo} · {cli.moneda}
                  </span>
                </div>
                <div style={{ display:'flex', gap:20 }}>
                  {[
                    {l:'Saldo pendiente',  v:`${simboloLocal()} ${fmt(cli.saldoPendiente)}`, red:false},
                    {l:'Ultima operación', v:cli.ultimaOp,                    red:false},
                    {l:'Días vencido',     v:String(cli.diasVencido),         red:true},
                  ].map(k=>(
                    <div key={k.l} style={{ textAlign:'right' }}>
                      <p style={{ fontSize:10, color:'#757575', margin:'0 0 2px', fontFamily:F }}>{k.l}</p>
                      <p style={{ fontSize:12, fontWeight:600, color:'#0F0F0F',
                        fontVariantNumeric:'tabular-nums', margin:0, fontFamily:F }}>{k.v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabla */}
              <div style={{ padding:'0 24px' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
                  <thead>
                    <tr style={{ background:'#fff', borderBottom:`1px solid ${C.n500}` }}>
                      {['Documento','Fecha','Descripcion','Debe','Haber','Saldo final','Dias','F. Ult. Op.'].map((h,i)=>(
                        <th key={i} style={{ padding:'8px 12px', textAlign:i>=3&&i<=5?'right':'left',
                          fontWeight:500, color:'#888', fontSize:11, whiteSpace:'nowrap', fontFamily:F }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cli.movimientos.map((m,i)=>(
                      <tr key={i} style={{ borderBottom:`1px solid #F0F0F0` }}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#FFFBF2'}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#fff'}>
                        <td style={{ padding:'8px 12px', color:BRAND, fontWeight:500, fontSize:11, fontFamily:F, whiteSpace:'nowrap' }}>{m.doc}</td>
                        <td style={{ padding:'8px 12px', color:'#757575', whiteSpace:'nowrap', fontFamily:F }}>{m.fecha}</td>
                        <td style={{ padding:'8px 12px', color:'#333', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:F }}>{m.desc}</td>
                        <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontFamily:F, color:m.debe<0?RED:'#0F0F0F' }}>
                          {m.debe!==0?<><span style={{color:'#999',marginRight:3}}>{simboloLocal()}</span>{fmt(m.debe)}</>:<span style={{color:'#CCC'}}>0.00</span>}
                        </td>
                        <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontFamily:F }}>
                          {m.haber!==0?<><span style={{color:'#999',marginRight:3}}>{simboloLocal()}</span>{fmt(m.haber)}</>:<span style={{color:'#CCC'}}>0.00</span>}
                        </td>
                        <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:500, fontFamily:F,
                          color:'#0F0F0F' }}>
                          <><span style={{color:'#999',marginRight:3}}>{simboloLocal()}</span>{fmt(m.saldo)}</>
                        </td>
                        <td style={{ padding:'8px 12px', textAlign:'right', fontFamily:F,
                          color:m.dias>120?RED:m.dias>60?'#E07B00':'#333' }}>{m.dias}</td>
                        <td style={{ padding:'8px 12px', color:'#757575', whiteSpace:'nowrap', fontFamily:F }}>{m.fultOp}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop:`2px solid ${C.n500}`, background:'#FAFAFA' }}>
                      <td colSpan={5} style={{ padding:'8px 12px', fontWeight:600, fontFamily:F, textAlign:'right' }}>Total</td>
                      <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, fontVariantNumeric:'tabular-nums', fontFamily:F, color:'#0F0F0F' }}>
                        <span style={{color:'#999',marginRight:3}}>{simboloLocal()}</span>{fmt(cli.saldoPendiente)}
                      </td>
                      <td colSpan={2}/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Antigüedad de saldos ──────────────────────────────────────────────────────
function AntiguedadSaldos({ ids, detallePorDocumento }: { ids: string[]; detallePorDocumento: boolean }) {
  const AGE = [
    {key:'corr',   label:'Corriente',   c:GREEN},
    {key:'d30',    label:'1–30 días',   c:'#333'},
    {key:'d60',    label:'31–60 días',  c:'#E07B00'},
    {key:'d90',    label:'61–90 días',  c:'#E07B00'},
    {key:'d120',   label:'91–120 días', c:RED},
    {key:'mas120', label:'+120 días',   c:RED},
  ] as const;
  const filaData = AGING_DATA.filter(d=>ids.includes(d.id)).map(cl=>({ ...cl, docs: cl.docs.map(d=>bucketizeDoc(d)) }));
  if (filaData.length === 0) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#9E9E9E', fontSize:12, fontFamily:F }}>
        Sin cuentas para los filtros seleccionados.
      </div>
    );
  }
  // Celda de monto: símbolo ₡ siempre a la izquierda, cifra alineada a la derecha
  const Monto = ({ v, color, bold }: { v:number; color?:string; bold?:boolean }) => (
    v === 0
      ? <span style={{ color:'#CCC' }}>-</span>
      : <span style={{ display:'inline-flex', alignItems:'baseline', gap:3, fontWeight:bold?700:400, color }}>
          <span style={{ fontSize:10, color:'#9E9E9E' }}>{simboloLocal()}</span><span>{fmt(v)}</span>
        </span>
  );
  const totalGeneral = AGE.reduce((acc,a)=>{ acc[a.key] = filaData.flatMap(cl=>cl.docs).reduce((s:number,d:DocAntiguedad)=>s+d[a.key],0); return acc; }, {} as Record<string,number>);
  const granTotal = AGE.reduce((s,a)=>s+totalGeneral[a.key],0);
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'0 24px' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F, minWidth:860 }}>
        <thead style={{ position:'sticky', top:0, zIndex:1 }}>
          <tr style={{ background:'#fff', borderBottom:`1px solid ${C.n500}` }}>
            <th style={{ padding:'8px 12px', textAlign:'left', fontWeight:500, color:'#888', minWidth:200, fontFamily:F }}>Cliente / Documento</th>
            <th style={{ padding:'8px 12px', textAlign:'left', fontWeight:500, color:'#888', fontFamily:F }}>Vence</th>
            {AGE.map(a=><th key={a.key} style={{ padding:'8px 12px', textAlign:'right', fontWeight:500, color:a.c, fontSize:11, whiteSpace:'nowrap', fontFamily:F }}>{a.label}</th>)}
            <th style={{ padding:'8px 12px', textAlign:'right', fontWeight:500, color:'#888', fontFamily:F }}>%</th>
          </tr>
        </thead>
        <tbody>
          {filaData.map((cl,ci)=>{
            const totalGrupo = AGE.reduce((s,a)=>s+cl.docs.reduce((ss:number,d:DocAntiguedad)=>ss+d[a.key],0),0);
            const subtotales = AGE.reduce((acc,a)=>{ acc[a.key] = cl.docs.reduce((s:number,d:DocAntiguedad)=>s+d[a.key],0); return acc; }, {} as Record<string,number>);
            return [
              <tr key={`g${ci}`} style={{ background:'#F8F8F8', borderTop:ci>0?`2px solid ${C.n500}`:'none', borderBottom:`1px solid ${C.n500}` }}>
                <td colSpan={9} style={{ padding:'8px 12px', fontWeight:600, fontSize:12, fontFamily:F }}>{soloIdAux(cl.id)} - {cl.nombre}</td>
              </tr>,
              ...(detallePorDocumento ? cl.docs.map((doc:DocAntiguedad,di:number)=>{
                const totalDoc = AGE.reduce((s,a)=>s+doc[a.key],0);
                const pct = totalGrupo!==0 ? (totalDoc/totalGrupo*100) : 0;
                return (
                  <tr key={`d${ci}-${di}`} style={{ borderBottom:`1px solid #F0F0F0` }}>
                    <td style={{ padding:'6px 12px 6px 24px', color:'#757575', fontSize:11, fontFamily:F }}>{doc.doc}</td>
                    <td style={{ padding:'6px 12px', color:'#757575', whiteSpace:'nowrap', fontFamily:F }}>{doc.vence}</td>
                    {AGE.map(a=>(
                      <td key={a.key} style={{ padding:'6px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontFamily:F }}>
                        <Monto v={doc[a.key]} color={doc[a.key]!==0?a.c:undefined}/>
                      </td>
                    ))}
                    <td style={{ padding:'6px 12px', textAlign:'right', color:pct>0?RED:'#757575', fontFamily:F }}>{pct.toFixed(2)}</td>
                  </tr>
                );
              }) : []),
              <tr key={`s${ci}`} style={{ background:'#FAFAFA', borderTop:`1px solid ${C.n500}`, borderBottom:`1px solid ${C.n500}` }}>
                <td colSpan={2} style={{ padding:'7px 12px 7px 24px', fontWeight:600, fontFamily:F }}>Subtotal</td>
                {AGE.map(a=>(
                  <td key={a.key} style={{ padding:'7px 12px', textAlign:'right', fontWeight:600, fontVariantNumeric:'tabular-nums', fontFamily:F }}>
                    <Monto v={subtotales[a.key]} color={a.c} bold/>
                  </td>
                ))}
                <td style={{ padding:'7px 12px', textAlign:'right', fontWeight:600, color:RED, fontFamily:F }}>100.00</td>
              </tr>
            ];
          })}
          <tr style={{ background:'#F5F5F5', borderTop:`2px solid ${C.n500}` }}>
            <td colSpan={2} style={{ padding:'9px 12px', fontWeight:700, fontFamily:F }}>Total general</td>
            {AGE.map(a=>(
              <td key={a.key} style={{ padding:'9px 12px', textAlign:'right', fontWeight:700, fontVariantNumeric:'tabular-nums', fontFamily:F }}>
                <Monto v={totalGeneral[a.key]} color={a.c} bold/>
              </td>
            ))}
            <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:700, color:RED, fontFamily:F }}>{granTotal!==0?'100.00':'0.00'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Vista previa / PDF - replica el reporte impreso (Estado de cuenta y Antigüedad) ──
function csvEscapeHistorico(v: string) { return `"${String(v).replace(/"/g,'""')}"`; }

function VistaPreviaModal({ tipo, vista, cuentas, idsAntiguedad, detallePorDocumento, onClose }: {
  tipo: 'clientes'|'proveedores'; vista: 'estado'|'antiguedad';
  cuentas: CuentaCP[]; idsAntiguedad: string[]; detallePorDocumento: boolean; onClose:()=>void;
}) {
  const entidad = tipo==='clientes' ? 'Clientes' : 'Proveedores';
  const fechaHora = fmtFechaHora();
  const moneda = cuentas[0]?.moneda ?? '';
  const agingData = AGING_DATA.filter(d=>idsAntiguedad.includes(d.id)).map(cl=>({ ...cl, docs: cl.docs.map(d=>bucketizeDoc(d)) }));
  const router = useRouter();
  const { firmas } = useFirmasConfig();
  const firmasDelReporte = firmasParaReporte(firmas, 'historico');
  const [incluirFirmas, setIncluirFirmas] = useState(false);

  function descargarExcel() {
    const headers = vista==='estado'
      ? ['Cuenta','Nombre','Documento','Fecha','Descripción','Debe','Haber','Saldo','Días vencido']
      : ['Cuenta','Nombre','Documento','Vence','Días vencido','Monto'];
    const lines = [headers.map(csvEscapeHistorico).join(',')];
    if (vista==='estado') {
      cuentas.forEach(c=>c.movimientos.forEach(m=>{
        lines.push([c.id, c.nombre, m.doc, m.fecha, m.desc, m.debe, m.haber, m.saldo, m.dias]
          .map(v=>csvEscapeHistorico(String(v))).join(','));
      }));
    } else {
      agingData.forEach(cl=>{
        if (!detallePorDocumento) {
          const AGE_KEYS = ['corr','d30','d60','d90','d120','mas120'] as const;
          const monto = AGE_KEYS.reduce((s,k)=>s+cl.docs.reduce((ss:number,d:DocAntiguedad)=>ss+d[k],0), 0);
          lines.push([cl.id, cl.nombre, '', '', '', monto].map(v=>csvEscapeHistorico(String(v))).join(','));
          return;
        }
        cl.docs.forEach((d:DocAntiguedad)=>{
          const monto = d.corr || d.d30 || d.d60 || d.d90 || d.d120 || d.mas120;
          lines.push([cl.id, cl.nombre, d.doc, d.vence, d.diasVencidos, monto]
            .map(v=>csvEscapeHistorico(String(v))).join(','));
        });
      });
    }
    const blob = new Blob(['\ufeff'+lines.join('\n')], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico-${tipo}-${vista==='estado'?'estado-cuenta':'antiguedad-saldos'}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="export-modal-root" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }} onClick={onClose}>
      {/* Solo el área con id="export-print-area-historico" queda visible al imprimir/Guardar como PDF,
          para que no se corte contenido por el scroll del modal */}
      <style>{`@media print {
        body * { visibility:hidden; }
        #export-print-area-historico, #export-print-area-historico * { visibility:visible; }
        #export-print-area-historico { position:absolute; left:0; top:0; width:100%; padding:24px; }
        /* display:flex en los contenedores del modal rompe la paginación al
           imprimir - se fuerza a block solo en @media print. */
        .export-modal-root, .export-modal-dialog {
          position:static !important; overflow:visible !important; height:auto !important;
          max-height:none !important; width:auto !important; display:block !important; box-shadow:none !important;
        }
        #export-print-area-historico table thead { display: table-header-group; }
        #export-print-area-historico table tr { page-break-inside: avoid; }
      }`}</style>
      <div className="export-modal-dialog" style={{ background:'#fff', borderRadius:10, width:'100%', maxWidth:920, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.3)', fontFamily:F }} onClick={e=>e.stopPropagation()}>

        {/* Barra superior del modal (no se imprime) */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:600 }}>Vista previa</span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={descargarExcel} style={{ height:32, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F, color:'#555' }}>Descargar Excel (CSV)</button>
            <button onClick={()=>window.print()} style={{ height:32, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Imprimir / Guardar como PDF</button>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:C.n700 }}>×</button>
          </div>
        </div>

        {/* Opciones (no se imprime - queda fuera de #export-print-area-historico) */}
        <div style={{ padding:'10px 24px', borderBottom:`1px solid ${C.n500}` }}>
          {firmasDelReporte.length > 0 ? (
            <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, fontFamily:F, color:'#0F0F0F' }}>
              <input type="checkbox" checked={incluirFirmas} onChange={e=>setIncluirFirmas(e.target.checked)} style={{ accentColor:BRAND }} />
              Incluir firma{firmasDelReporte.length > 1 ? `s (${firmasDelReporte.length})` : ''}
            </label>
          ) : (
            <div style={{ fontSize:11.5, color:C.n700, fontFamily:F, lineHeight:1.5 }}>
              No hay firmas configuradas para este reporte.{' '}
              <button type="button" onClick={()=>router.push('/parametros?tab=firmas')}
                style={{ background:'none', border:'none', padding:0, color:BRAND, fontWeight:500, cursor:'pointer', fontSize:11.5, fontFamily:F, textDecoration:'underline' }}>
                Configuralas en Parámetros generales &gt; Firmas
              </button>
            </div>
          )}
        </div>

        <div id="export-print-area-historico" style={{ padding:'26px 32px' }}>
          {/* Encabezado */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:`1px solid #999`, paddingBottom:10, marginBottom:16 }}>
            <div>
              <p style={{ fontSize:17, fontWeight:600, margin:0, color:'#111', letterSpacing:'.3px' }}>Hotel Fortuna S.A.</p>
              <p style={{ fontSize:12, color:'#555', margin:'4px 0 0', lineHeight:1.5, fontWeight:300 }}>
                {vista==='estado' ? `Estado de Cuenta / ${entidad}` : `Antigüedad de Saldos / ${entidad}`}<br/>
                {vista==='estado' ? <>Período: {cuentas[0]?.periodo ?? '-'} &nbsp;·&nbsp; Moneda: {moneda}</> : <>Moneda: {moneda}</>}
              </p>
            </div>
            <div style={{ textAlign:'right', fontSize:'11.5px', color:'#666', fontWeight:300 }}>
              Fecha: {fechaHora}<br/>Pág. 1 / 1
            </div>
          </div>

          {vista === 'estado' ? (
            cuentas.length === 0 ? (
              <p style={{ fontSize:12, color:'#999', textAlign:'center', padding:'30px 0' }}>Sin cuentas para los filtros seleccionados.</p>
            ) : cuentas.map(cliente=>(
              <div key={cliente.id} style={{ marginBottom:24 }}>
                {/* Cliente/proveedor + stats */}
                <div style={{ background:'#f2f2f2', borderTop:'1px solid #ccc', borderBottom:'1px solid #ccc', padding:'10px 12px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap' }}>
                  <div>
                    <span style={{ fontSize:'13.5px', fontWeight:600, color:'#111' }}>{soloIdAux(cliente.id)} / {cliente.nombre}</span>
                    <span style={{ fontSize:'11.5px', color:'#888', marginLeft:8, fontWeight:300 }}>Período: {cliente.periodo} · {cliente.moneda}</span>
                  </div>
                  <div style={{ display:'flex', gap:26, fontSize:12 }}>
                    {[
                      ['Saldo pendiente', `${simboloLocal()} ${fmt(cliente.saldoPendiente)}`, true],
                      ['Última operación', cliente.ultimaOp, false],
                      ['Días vencido', String(cliente.diasVencido), true],
                    ].map(([l,v,neg])=>(
                      <div key={l as string}>
                        <div style={{ color:'#888', fontSize:'10.5px', fontWeight:300 }}>{l as string}</div>
                        <div style={{ fontWeight:600, color: neg?'#a33':'#222' }}>{v as string}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabla movimientos */}
                <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:4 }}>
                  <thead>
                    <tr>
                      {['Documento','Fecha','Descripción','Debe','Haber','Saldo final','Días','F. Ult. Op.'].map((h,i)=>(
                        <th key={h} style={{ textAlign:i>=3&&i<=6?'right':'left', fontSize:11, color:'#444', background:'#eee', borderBottom:'1px solid #bbb', padding:'7px 8px', fontWeight:500, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cliente.movimientos.map((m,i)=>(
                      <tr key={i}>
                        <td style={{ padding:'7px 8px', borderBottom:'1px solid #eee', fontSize:12, color:'#333', fontWeight:500, whiteSpace:'nowrap' }}>{m.doc}</td>
                        <td style={{ padding:'7px 8px', borderBottom:'1px solid #eee', fontSize:12, whiteSpace:'nowrap' }}>{m.fecha}</td>
                        <td style={{ padding:'7px 8px', borderBottom:'1px solid #eee', fontSize:12 }}>{m.desc}</td>
                        <td style={{ padding:'7px 8px', borderBottom:'1px solid #eee', fontSize:12, textAlign:'right', color:m.debe<0?'#a33':undefined, whiteSpace:'nowrap' }}>{simboloLocal()} {fmt(m.debe)}</td>
                        <td style={{ padding:'7px 8px', borderBottom:'1px solid #eee', fontSize:12, textAlign:'right', color:m.haber<0?'#a33':undefined, whiteSpace:'nowrap' }}>{simboloLocal()} {fmt(m.haber)}</td>
                        <td style={{ padding:'7px 8px', borderBottom:'1px solid #eee', fontSize:12, textAlign:'right', color:m.saldo<0?'#a33':undefined, whiteSpace:'nowrap' }}>{simboloLocal()} {fmt(m.saldo)}</td>
                        <td style={{ padding:'7px 8px', borderBottom:'1px solid #eee', fontSize:12, textAlign:'right', whiteSpace:'nowrap' }}>{m.dias.toLocaleString('en-US')}</td>
                        <td style={{ padding:'7px 8px', borderBottom:'1px solid #eee', fontSize:12, whiteSpace:'nowrap' }}>{m.fultOp}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} style={{ textAlign:'right', padding:'9px 8px', fontWeight:600, background:'#f2f2f2', borderTop:'1px solid #444', fontSize:12 }}>Total</td>
                      <td style={{ padding:'9px 8px', fontWeight:600, background:'#f2f2f2', borderTop:'1px solid #444', fontSize:12, textAlign:'right', color:cliente.saldoPendiente<0?'#a33':undefined }}>{fmt(cliente.saldoPendiente)}</td>
                      <td colSpan={2} style={{ background:'#f2f2f2', borderTop:'1px solid #444' }}/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))
          ) : (
            <>
              {/* Tabla antigüedad de saldos - clientes/proveedores según filtro */}
              <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:4 }}>
                <thead>
                  <tr>
                    {['Documento','Vence','Corriente','1-30 días','31-60 días','61-90 días','91-120 días','+120 días','%'].map((h,i)=>(
                      <th key={h} style={{ textAlign:i>=2?'right':'left', fontSize:11, color:'#444', background:'#eee', borderBottom:'1px solid #bbb', padding:'7px 8px', fontWeight:500, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agingData.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding:'30px 8px', textAlign:'center', color:'#999', fontSize:12 }}>Sin cuentas para los filtros seleccionados.</td></tr>
                  ) : agingData.map((cl,ci)=>{
                    const tot = cl.docs.reduce((s,d)=>({
                      corr:s.corr+d.corr, d30:s.d30+d.d30, d60:s.d60+d.d60, d90:s.d90+d.d90, d120:s.d120+d.d120, mas120:s.mas120+d.mas120,
                    }), {corr:0,d30:0,d60:0,d90:0,d120:0,mas120:0});
                    const totalGrupo = tot.corr+tot.d30+tot.d60+tot.d90+tot.d120+tot.mas120;
                    return (
                      <React.Fragment key={ci}>
                        <tr><td colSpan={9} style={{ background:'#eee', borderTop:'1px solid #ccc', borderBottom:'1px solid #ccc', fontWeight:600, padding:'7px 8px', fontSize:12, color:'#222' }}>{soloIdAux(cl.id)} - {cl.nombre}</td></tr>
                        {detallePorDocumento && cl.docs.map((d,di)=>{
                          const totalDoc = d.corr+d.d30+d.d60+d.d90+d.d120+d.mas120;
                          const pct = totalGrupo!==0 ? (totalDoc/totalGrupo*100) : 0;
                          return (
                          <tr key={di}>
                            <td style={{ padding:'7px 8px', borderBottom:'1px solid #eee', fontSize:12, color:'#333', fontWeight:500, whiteSpace:'nowrap' }}>{d.doc}</td>
                            <td style={{ padding:'7px 8px', borderBottom:'1px solid #eee', fontSize:12, whiteSpace:'nowrap' }}>{d.vence}</td>
                            {(['corr','d30','d60','d90','d120','mas120'] as const).map(k=>(
                              <td key={k} style={{ padding:'7px 8px', borderBottom:'1px solid #eee', fontSize:12, textAlign:'right', color:d[k]<0?'#a33':undefined, whiteSpace:'nowrap' }}>{d[k]!==0?<><span style={{color:'#999'}}>{simboloLocal()}</span> {fmt(d[k])}</>:'-'}</td>
                            ))}
                            <td style={{ padding:'7px 8px', borderBottom:'1px solid #eee', fontSize:12, textAlign:'right', color:'#888', fontWeight:300 }}>{pct.toFixed(2)}</td>
                          </tr>
                          );
                        })}
                        <tr>
                          <td colSpan={2} style={{ padding:'9px 8px', fontWeight:600, background:'#f2f2f2', borderTop:'1px solid #ddd' }}>Total {soloIdAux(cl.id)}</td>
                          {(['corr','d30','d60','d90','d120','mas120'] as const).map(k=>(
                            <td key={k} style={{ padding:'9px 8px', fontWeight:600, background:'#f2f2f2', borderTop:'1px solid #ddd', textAlign:'right', color:tot[k]<0?'#a33':undefined }}>{tot[k]!==0?<><span style={{color:'#999'}}>{simboloLocal()}</span> {fmt(tot[k])}</>:'-'}</td>
                          ))}
                          <td style={{ padding:'9px 8px', fontWeight:600, background:'#f2f2f2', borderTop:'1px solid #ddd', textAlign:'right', color:'#888' }}>100.00</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  {agingData.length > 0 && (() => {
                    const gt = agingData.flatMap(cl=>cl.docs).reduce((s,d)=>({
                      corr:s.corr+d.corr, d30:s.d30+d.d30, d60:s.d60+d.d60, d90:s.d90+d.d90, d120:s.d120+d.d120, mas120:s.mas120+d.mas120,
                    }), {corr:0,d30:0,d60:0,d90:0,d120:0,mas120:0});
                    return (
                      <tr>
                        <td colSpan={2} style={{ padding:'9px 8px', fontWeight:600, fontSize:'12.5px', background:'#e6e6e6', borderTop:'1px solid #444', borderBottom:'1px solid #444' }}>Total general</td>
                        {(['corr','d30','d60','d90','d120','mas120'] as const).map(k=>(
                          <td key={k} style={{ padding:'9px 8px', fontWeight:600, fontSize:'12.5px', background:'#e6e6e6', borderTop:'1px solid #444', borderBottom:'1px solid #444', textAlign:'right', color:gt[k]<0?'#a33':undefined }}>{gt[k]!==0?<><span style={{color:'#999'}}>{simboloLocal()}</span> {fmt(gt[k])}</>:'-'}</td>
                        ))}
                        <td style={{ padding:'9px 8px', fontWeight:600, fontSize:'12.5px', background:'#e6e6e6', borderTop:'1px solid #444', borderBottom:'1px solid #444' }}/>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </>
          )}

          {incluirFirmas && <FirmasBloque firmas={firmasDelReporte}/>}

          <div style={{ marginTop:14, fontSize:'10.5px', color:'#999', borderTop:'1px solid #eee', paddingTop:8, display:'flex', justifyContent:'space-between', fontWeight:300 }}>
            <span>Hotel Fortuna S.A. - {vista==='estado' ? 'Estado de cuenta' : 'Antigüedad de saldos'} {entidad}</span>
            <span>Pág. 1 / 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Seleccionar cuenta (una cuenta o rango) ─────────────────
// Sin selector de nivel (Detalle/Auxiliar): en este contexto todas las cuentas
// son auxiliares de clientes o proveedores, ya diferenciados por el radio de arriba.
function ModalSeleccionarCuenta({ tipo, cuentaId, rango, onSelectCuenta, onSelectRango, onClose }: {
  tipo: 'clientes'|'proveedores'; cuentaId: string; rango: RangoCP|null;
  onSelectCuenta:(id:string)=>void; onSelectRango:(r:RangoCP)=>void; onClose:()=>void;
}) {
  const data = tipo==='clientes' ? CLIENTES_EC : PROVEEDORES_EC;
  const ordenado = [...data].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  const [tab, setTab] = useState<'una'|'rango'>(rango ? 'rango' : 'una');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(cuentaId);
  const [rDesde, setRDesde] = useState(rango?.desde ?? '');
  const [rHasta, setRHasta] = useState(rango?.hasta ?? '');

  const filtrado = ordenado.filter(d => !q || d.nombre.toLowerCase().includes(q.toLowerCase()) || d.id.includes(q));

  function confirmar() {
    if (tab === 'una') {
      onSelectCuenta(sel);
    } else if (rDesde && rHasta) {
      onSelectRango({ desde:rDesde, hasta:rHasta });
    }
    onClose();
  }

  const entidadLabel = tipo==='clientes' ? 'cliente' : 'proveedor';

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:480, maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.3)', fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, flexShrink:0 }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Seleccionar {entidadLabel}</p>
        </div>

        <div style={{ padding:'16px 24px 0', flexShrink:0 }}>
          <div style={{ position:'relative', marginBottom:14 }}>
            <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
              width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#9E9E9E" strokeWidth="1.4" strokeLinecap="round">
              <circle cx="6" cy="6" r="4"/><path d="M10.5 10.5L8.5 8.5"/>
            </svg>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder={`Buscar ${entidadLabel}…`}
              style={{ width:'100%', height:36, paddingLeft:32, paddingRight:12, border:`1px solid ${BRAND}`, borderRadius:radius.md,
                fontSize:13, fontFamily:F, outline:'none', boxSizing:'border-box', color:'#333' }}/>
          </div>

          <div style={{ display:'flex', gap:20, borderBottom:`1px solid ${C.n500}`, marginBottom:12 }}>
            {(['una','rango'] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                style={{ padding:'0 0 10px', border:'none', borderBottom:`2px solid ${tab===t?BRAND:'transparent'}`,
                  background:'transparent', cursor:'pointer', fontSize:13, fontFamily:F,
                  fontWeight:tab===t?600:400, color:tab===t?'#0F0F0F':'#757575' }}>
                {t==='una' ? 'Una cuenta' : 'Rango de cuentas'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'0 24px' }}>
          {tab === 'una' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:2, paddingBottom:12 }}>
              <button onClick={()=>setSel('')}
                style={{ display:'flex', justifyContent:'space-between', alignItems:'center', textAlign:'left', padding:'9px 10px',
                  border:'none', borderRadius:radius.sm, background:!sel?C.brandBg:'transparent', fontSize:13, fontFamily:F, cursor:'pointer', color:!sel?BRAND:'#333' }}>
                Todas las cuentas
                {!sel && <span style={{ color:BRAND }}>✓</span>}
              </button>
              {filtrado.map(d=>(
                <button key={d.id} onClick={()=>setSel(d.id)}
                  style={{ display:'flex', justifyContent:'space-between', alignItems:'center', textAlign:'left', padding:'9px 10px',
                    border:'none', borderRadius:radius.sm, background:sel===d.id?C.brandBg:'transparent', fontSize:13, fontFamily:F, cursor:'pointer' }}>
                  <span>
                    <span style={{ color:BRAND, fontWeight:500, marginRight:8 }}>{soloIdAux(d.id)}</span>
                    <span style={{ color:'#333' }}>{d.nombre}</span>
                  </span>
                  {sel===d.id && <span style={{ color:BRAND }}>✓</span>}
                </button>
              ))}
              {filtrado.length===0 && <p style={{ fontSize:12, color:'#9E9E9E', textAlign:'center', padding:'20px 0' }}>Sin resultados.</p>}
            </div>
          ) : (
            <div style={{ paddingBottom:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:8 }}>
                <div>
                  <p style={{ fontSize:11, color:'#888', margin:'0 0 4px', fontFamily:F }}>Desde</p>
                  <select value={rDesde} onChange={e=>setRDesde(e.target.value)}
                    style={{ width:'100%', height:34, border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, padding:'0 8px', outline:'none' }}>
                    <option value="">Seleccionar…</option>
                    {ordenado.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <p style={{ fontSize:11, color:'#888', margin:'0 0 4px', fontFamily:F }}>Hasta</p>
                  <select value={rHasta} onChange={e=>setRHasta(e.target.value)}
                    style={{ width:'100%', height:34, border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, padding:'0 8px', outline:'none' }}>
                    <option value="">Seleccionar…</option>
                    {ordenado.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </div>
              </div>
              <p style={{ fontSize:11, color:'#9E9E9E', margin:0, fontFamily:F }}>El rango se aplica según el orden alfabético del nombre.</p>
            </div>
          )}
        </div>

        <div style={{ padding:'14px 24px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={confirmar} disabled={tab==='rango' && (!rDesde || !rHasta)}
            style={{ height:34, padding:'0 16px', background:(tab==='rango' && (!rDesde||!rHasta))?'#ccc':BRAND, color:'#fff', border:'none', borderRadius:radius.md,
              cursor:(tab==='rango' && (!rDesde||!rHasta))?'default':'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>
            Seleccionar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Enviar por correo ────────────────────────────────────────────
function EnviarCorreoModal({ tipo, vista, cuentaLabel, periodoLabel, onClose, onEnviar }: {
  tipo:'clientes'|'proveedores'; vista:'estado'|'antiguedad'; cuentaLabel:string; periodoLabel:string;
  onClose:()=>void; onEnviar:(correo:string)=>void;
}) {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const reporteLabel = vista==='estado' ? 'Estado de cuenta' : 'Antigüedad de saldos';
  function enviar() {
    if (!correo.trim() || !/^\S+@\S+\.\S+$/.test(correo.trim())) { setError('Ingresá un correo válido'); return; }
    onEnviar(correo.trim());
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1002, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:420, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Enviar por correo</p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#757575' }}>×</button>
        </div>
        <div style={{ padding:'18px 24px' }}>
          <div style={{ background:'#FAFAFA', border:`1px solid ${C.n500}`, borderRadius:radius.md, padding:'10px 12px', marginBottom:14 }}>
            <p style={{ fontSize:10, fontWeight:600, color:'#9E9E9E', textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 6px' }}>Se va a enviar</p>
            <p style={{ fontSize:12, fontWeight:600, color:'#0F0F0F', margin:'0 0 3px' }}>{reporteLabel} · {tipo==='clientes'?'Clientes':'Proveedores'}</p>
            <p style={{ fontSize:11, color:'#757575', margin:0 }}>{cuentaLabel}</p>
            <p style={{ fontSize:11, color:'#757575', margin:'2px 0 0' }}>Período: {periodoLabel}</p>
          </div>
          <p style={{ fontSize:11, color:'#333', margin:'0 0 5px' }}>Correo del destinatario</p>
          <input value={correo} onChange={e=>{setCorreo(e.target.value); setError('');}} placeholder="nombre@empresa.com" autoFocus
            style={{ width:'100%', height:34, padding:'0 10px', border:`1px solid ${error?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          {error && <p style={{ fontSize:10, color:C.error, margin:'5px 0 0' }}>{error}</p>}
        </div>
        <div style={{ padding:'12px 24px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={enviar} style={{ height:34, padding:'0 16px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Enviar</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HistoricoClientesProveedores() {
  const [tipo,   setTipo]   = useState<'clientes'|'proveedores'>('clientes');
  const [cuentaId, setCuentaId] = useState('');
  const [rangoCP, setRangoCP] = useState<RangoCP|null>(null);
  const [vista,  setVista]  = useState<'estado'|'antiguedad'>('estado');
  // por defecto la Antigüedad de saldos consolida cada cliente/proveedor
  // en un solo subtotal - útil cuando se consulta un rango grande. Esta opción
  // permite mantener el detalle de cada documento en vez de que todo quede
  // consolidado, tanto en pantalla como en el PDF/Excel exportado.
  const [detallePorDocumento, setDetallePorDocumento] = useState(true);
  const [ordenar,setOrdenar]= useState('Nombre');
  const [moneda, setMoneda] = useState('COL');
  const [showVista, setShowVista] = useState(false);
  const [showCorreo, setShowCorreo] = useState(false);
  const [toast, setToast] = useState<string|null>(null);
  const [modalCuentaOpen, setModalCuentaOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // Sin período aplicado por defecto: los movimientos de ejemplo abarcan de 2022
  // a 2026, así que forzar un rango por defecto (p. ej. "este mes") los ocultaba
  // todos y solo dejaba ver el Total, sin ninguna fila. Se activa un rango cuando
  // el usuario elige uno explícitamente.
  const [periodoDesde, setPeriodoDesde] = useState('');
  const [periodoHasta, setPeriodoHasta] = useState('');
  const [periodoQuick, setPeriodoQuick] = useState('');

  function aplicarPeriodoRapido(label: string) {
    const hoy = new Date(2026, 5, 2); // "hoy" de referencia del mock de datos (2 jun 2026)
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    let desde: Date, hasta: Date;
    switch (label) {
      case 'Hoy': desde = hasta = hoy; break;
      case 'Esta semana': { const s = new Date(hoy); s.setDate(hoy.getDate()-hoy.getDay()); const e = new Date(s); e.setDate(s.getDate()+6); desde=s; hasta=e; break; }
      case 'Este mes': desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1); hasta = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0); break;
      case 'Mes anterior': desde = new Date(hoy.getFullYear(), hoy.getMonth()-1, 1); hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0); break;
      case 'Este trimestre': { const q = Math.floor(hoy.getMonth()/3); desde = new Date(hoy.getFullYear(), q*3, 1); hasta = new Date(hoy.getFullYear(), q*3+3, 0); break; }
      case 'Este año': desde = new Date(hoy.getFullYear(), 0, 1); hasta = new Date(hoy.getFullYear(), 11, 31); break;
      default: return;
    }
    setPeriodoDesde(iso(desde)); setPeriodoHasta(iso(hasta)); setPeriodoQuick(label);
  }

  // 'DD/MM/YYYY' -> comparable timestamp
  function parseFechaDDMMYYYY(s: string): number {
    const [d, m, y] = s.split('/').map(Number);
    return new Date(y, (m||1)-1, d||1).getTime();
  }
  function dentroDePeriodo(fecha: string): boolean {
    const t = parseFechaDDMMYYYY(fecha);
    const desdeT = periodoDesde ? new Date(periodoDesde+'T00:00:00').getTime() : -Infinity;
    const hastaT = periodoHasta ? new Date(periodoHasta+'T23:59:59').getTime() : Infinity;
    return t >= desdeT && t <= hastaT;
  }

  const dataEC = tipo==='clientes' ? CLIENTES_EC : PROVEEDORES_EC;
  const ordenadoAlpha = [...dataEC].sort((a,b)=>a.nombre.localeCompare(b.nombre));

  // la cuenta filtra por una sola o por rango (alfabético por nombre)
  let cuentasBase: CuentaCP[];
  if (cuentaId) {
    cuentasBase = dataEC.filter(d=>d.id===cuentaId);
  } else if (rangoCP) {
    const iDesde = ordenadoAlpha.findIndex(d=>d.id===rangoCP.desde);
    const iHasta = ordenadoAlpha.findIndex(d=>d.id===rangoCP.hasta);
    const lo = Math.min(iDesde,iHasta), hi = Math.max(iDesde,iHasta);
    cuentasBase = (lo>=0 && hi>=0) ? ordenadoAlpha.slice(lo, hi+1) : dataEC;
  } else {
    cuentasBase = dataEC;
  }
  const cuentasFiltradas = cuentasBase.filter(d =>
    !searchQ || d.nombre.toLowerCase().includes(searchQ.toLowerCase()) || d.id.includes(searchQ));

  const idsAntiguedad = cuentasFiltradas.map(d=>d.id);
  const totalPaginas = Math.max(1, Math.ceil(cuentasFiltradas.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const cuentasPagina = cuentasFiltradas.slice((paginaActual-1)*pageSize, paginaActual*pageSize);
  const idsAntiguedadPagina = cuentasPagina.map(d=>d.id);

  // aplicar el período a los movimientos de cada cuenta (solo afecta
  // la vista "Estado de cuenta"; Antigüedad de saldos se calcula sobre saldos totales)
  const conPeriodoAplicado = (lista: CuentaCP[]) =>
    vista === 'estado'
      ? lista.map(c => ({ ...c, movimientos: c.movimientos.filter(m => dentroDePeriodo(m.fecha)) }))
      : lista;
  const cuentasPaginaVista = conPeriodoAplicado(cuentasPagina);
  const cuentasFiltradasVista = conPeriodoAplicado(cuentasFiltradas);

  const cuentaLabel = cuentaId
    ? (dataEC.find(d=>d.id===cuentaId)?.nombre.slice(0,20) + '…')
    : rangoCP
      ? `${ordenadoAlpha.find(d=>d.id===rangoCP.desde)?.nombre.slice(0,10)}… – ${ordenadoAlpha.find(d=>d.id===rangoCP.hasta)?.nombre.slice(0,10)}…`
      : 'Cuenta';

  // El período solo afecta a "Estado de cuenta"; en "Antigüedad de saldos" se
  // calcula sobre saldos totales, así que mostrarlo ahí sería engañoso.
  const periodoLabel = vista === 'estado'
    ? (periodoDesde || periodoHasta
        ? `${periodoDesde?periodoDesde.split('-').reverse().join('/'):'…'} – ${periodoHasta?periodoHasta.split('-').reverse().join('/'):'…'}${periodoQuick?` (${periodoQuick})`:''}`
        : 'Todo el historial')
    : 'No aplica (saldos totales a la fecha)';

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily:F, background:'#fff', overflow:'hidden' }}>

      {/* ── Header ── */}
      <PageHeader title="Histórico de clientes / proveedores">
        <Button variant="secondary" onClick={()=>setShowCorreo(true)} icon={
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.5 3.5h11a1 1 0 011 1v6a1 1 0 01-1 1h-11a1 1 0 01-1-1v-6a1 1 0 011-1z"/><path d="M1 4l6 4.5L13 4"/>
          </svg>
        }>Enviar por correo</Button>
        <Button onClick={()=>setShowVista(true)} icon={
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1v8M4 6l3 3 3-3M2 10v1.5A1.5 1.5 0 003.5 13h7A1.5 1.5 0 0012 11.5V10"/>
          </svg>
        }>Exportar</Button>
      </PageHeader>

      {showCorreo && (
        <EnviarCorreoModal
          tipo={tipo}
          vista={vista}
          cuentaLabel={cuentaLabel}
          periodoLabel={periodoLabel}
          onClose={()=>setShowCorreo(false)}
          onEnviar={(correo)=>{ setShowCorreo(false); setToast(`${vista==='estado'?'Estado de cuenta':'Antigüedad de saldos'} enviado a ${correo}`); }}
        />
      )}
      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}

      {/* ── Tabs bajo el header ── */}
      <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'0 24px',
        display:'flex', alignItems:'center', gap:0, flexShrink:0, height:42 }}>
        {(['estado','antiguedad'] as const).map(v=>{
          const label = v==='estado' ? 'Estado de cuenta' : 'Antigüedad de saldos';
          const active = vista===v;
          return (
            <button key={v} onClick={()=>setVista(v)}
              style={{ height:42, padding:'0 16px', border:'none', borderBottom:`2px solid ${active?BRAND:'transparent'}`,
                background:'transparent', cursor:'pointer', fontSize:13, fontFamily:F,
                fontWeight:active?500:400, color:active?BRAND:'#757575', whiteSpace:'nowrap' }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Barra de filtros ── */}
      {/* y #3: buscador primero, luego el resto de filtros reordenado
          (Clientes/Proveedores, Cuenta, Período, Moneda, Ordenar por) */}
      <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px',
        display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>

        {/* Buscador */}
        <div style={{ position:'relative' }}>
          <svg style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
            width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#9E9E9E" strokeWidth="1.4" strokeLinecap="round">
            <circle cx="6" cy="6" r="4"/><path d="M10.5 10.5L8.5 8.5"/>
          </svg>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder={tipo==='clientes'?'Buscar cliente…':'Buscar proveedor…'}
            style={{ height:32, paddingLeft:28, paddingRight:10, width:200, border:`1px solid ${C.n500}`,
              borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none' }}/>
        </div>

        <div style={{ width:1, height:20, background:`${C.n500}`, flexShrink:0 }}/>

        {/* Clientes / Proveedores radios */}
        {(['clientes','proveedores'] as const).map(t=>(
          <label key={t} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, fontFamily:F,
            color:tipo===t?BRAND:'#555' }}>
            <span onClick={()=>{ setTipo(t); setCuentaId(''); setRangoCP(null); }} style={{ width:15,height:15,borderRadius:'50%',
              border:`2px solid ${tipo===t?BRAND:'#CCC'}`, background:tipo===t?BRAND:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer' }}>
              {tipo===t&&<span style={{ width:5,height:5,borderRadius:'50%',background:'#fff' }}/>}
            </span>
            {t==='clientes'?'Clientes':'Proveedores'}
          </label>
        ))}

        <div style={{ width:1, height:20, background:`${C.n500}`, flexShrink:0 }}/>

        {/* Cuenta - una o rango, sin selector de nivel */}
        <button onClick={()=>setModalCuentaOpen(true)}
          style={{ height:32, padding:'0 12px', border:`1px solid ${(cuentaId||rangoCP)?BRAND:C.n500}`, borderRadius:4,
            background:(cuentaId||rangoCP)?'#FFF8EC':'#fff', cursor:'pointer', fontSize:12, fontFamily:F,
            display:'flex', alignItems:'center', gap:5, color:(cuentaId||rangoCP)?BRAND:'#555', whiteSpace:'nowrap' }}>
          {cuentaLabel}
          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 5L7 9L11 5"/></svg>
        </button>

        {/* Período */}
        <FilterBtn label="Período" active={!!(periodoDesde || periodoHasta)}>
          <p style={{ fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>Período de fecha</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            {['Hoy','Esta semana','Este mes','Mes anterior','Este trimestre','Este año'].map(p=>(
              <button key={p} onClick={()=>aplicarPeriodoRapido(p)} style={{ height:28, border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:periodoQuick===p?BRAND:'#fff',
                color:periodoQuick===p?'#fff':'#555', fontSize:12, fontFamily:F, cursor:'pointer' }}>{p}</button>
            ))}
          </div>
          <p style={{ fontSize:11, color:'#888', margin:'0 0 6px', fontFamily:F }}>Rango personalizado</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div>
              <p style={{ fontSize:11, color:'#888', margin:'0 0 3px' }}>Desde</p>
              <input type="date" value={periodoDesde} onChange={e=>{setPeriodoDesde(e.target.value); setPeriodoQuick('');}} style={{ width:'100%', height:30, padding:'0 8px', border:`1px solid ${BRAND}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', color:BRAND }}/>
            </div>
            <div>
              <p style={{ fontSize:11, color:'#888', margin:'0 0 3px' }}>Hasta</p>
              <input type="date" value={periodoHasta} onChange={e=>{setPeriodoHasta(e.target.value); setPeriodoQuick('');}} style={{ width:'100%', height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none' }}/>
            </div>
          </div>
        </FilterBtn>

        {/* Moneda */}
        <FilterBtn label="Moneda">
          <p style={{ fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>Moneda</p>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:12, fontFamily:F, color:'#555' }}>Seleccionar todos</span>
            <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Seleccionar todos</button>
          </div>
          {[{v:'USD',l:'USD - Dólar americano',n:3},{v:'COL',l:'CRC - Colón costarricense',n:3}].map(m=>(
            <label key={m.v} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'6px 0',
              borderBottom:`1px solid #F0F0F0`, cursor:'pointer', fontFamily:F }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:15,height:15,borderRadius:3,border:`1.5px solid ${moneda===m.v?BRAND:'#CCC'}`,
                  background:moneda===m.v?BRAND:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}
                  onClick={()=>setMoneda(m.v)}>
                  {moneda===m.v&&<svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </div>
                <span style={{ fontSize:12, color:'#333' }}>{m.l}</span>
              </div>
              <span style={{ fontSize:11, color:'#999' }}>{m.n}</span>
            </label>
          ))}
        </FilterBtn>

        {/* Ordenar por */}
        <FilterBtn label="Ordenar por" align="right">
          <p style={{ fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>Ordenar por</p>
          <RadioGroup name="ordenar" value={ordenar} onChange={setOrdenar}
            options={['Nombre','Código','Saldo','Días vencido'].map(v=>({label:v,value:v}))}/>
        </FilterBtn>

        {/* Mostrar detalle por documento - solo tiene sentido en Antigüedad de saldos;
            en Estado de cuenta el detalle cronológico siempre se muestra completo. */}
        {vista==='antiguedad' && (
          <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, color:'#333', fontFamily:F }}>
            <div onClick={()=>setDetallePorDocumento(v=>!v)}
              style={{ width:15, height:15, borderRadius:3, border:`1.5px solid ${detallePorDocumento?BRAND:'#CCC'}`,
                background:detallePorDocumento?BRAND:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {detallePorDocumento && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            </div>
            <span onClick={()=>setDetallePorDocumento(v=>!v)}>Mostrar detalle por documento</span>
          </label>
        )}
      </div>

      {/* Contenido */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {vista==='estado'
          ? <EstadoCuenta cuentas={cuentasPaginaVista}/>
          : <AntiguedadSaldos ids={idsAntiguedadPagina} detallePorDocumento={detallePorDocumento}/>
        }
      </div>

      {/* Footer paginación */}
      <div style={{ borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0, background:'#fff' }}>
        <Pagination page={paginaActual} pageSize={pageSize} total={cuentasFiltradas.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      {showVista && (
        <VistaPreviaModal tipo={tipo} vista={vista} cuentas={cuentasFiltradasVista} idsAntiguedad={idsAntiguedad} detallePorDocumento={detallePorDocumento} onClose={()=>setShowVista(false)}/>
      )}
      {modalCuentaOpen && (
        <ModalSeleccionarCuenta tipo={tipo} cuentaId={cuentaId} rango={rangoCP}
          onSelectCuenta={id=>{ setCuentaId(id); setRangoCP(null); }}
          onSelectRango={r=>{ setRangoCP(r); setCuentaId(''); }}
          onClose={()=>setModalCuentaOpen(false)}/>
      )}
    </div>
  );
}
