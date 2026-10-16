'use client';
import { useState } from 'react';
import { C, fmtNum, BotonExportarUnico, ExportListModal, FONT, radius, PageHeader, SearchInput } from '../../ui/primitives';

const F = FONT;
const BRAND = '#A77600';
const RED = C.error;
const GREEN = C.success;

function fmt(n: number) {
  const abs = Math.abs(n);
  const s = fmtNum(abs, 2);
  return n < 0 ? `(${s})` : s;
}

type TipoCuenta = 'cobrar'|'pagar'|'bancos';
type EstadoDC = 'Pendiente'|'Contabilizado'|'Anulado';

interface AsientoDC {
  id:number; tipo:'G'|'O'; nroAsiento:string; fecha:string; libro:'G'|'O';
  titulo:string; cuenta:string; cuentaNombre:string; descripcion:string;
  debe:number; haber:number; tipoCuenta:TipoCuenta; estado:EstadoDC;
}

// cada tipo de cuenta (cobrar/pagar/bancos) tiene su propio asiento
// balanceado (debe = haber), para que el filtro "Aplicar a cuentas por" tenga
// datos reales que mostrar. cada línea incluye el nombre de la
// cuenta, para que quede claro qué se debita y qué se acredita.
const MOCK: AsientoDC[] = [
  // ── Cuentas por cobrar ──
  { id:1, tipo:'G', nroAsiento:'GP-60102637', fecha:'01/01/2026', libro:'G',
    titulo:'Diferencial cambiario - imp. servicio', cuenta:'120-001-0001', cuentaNombre:'Clientes extranjeros USD',
    descripcion:'Ajuste por diferencial cambiario - revaluación de saldo en USD', debe:335700.43, haber:0,
    tipoCuenta:'cobrar', estado:'Contabilizado' },
  { id:2, tipo:'G', nroAsiento:'GP-60102637', fecha:'01/01/2026', libro:'G',
    titulo:'Diferencial cambiario - imp. servicio', cuenta:'810-001-0001', cuentaNombre:'Ganancia por diferencial cambiario',
    descripcion:'Contrapartida: ganancia cambiaria por revaluación de cuentas por cobrar', debe:0, haber:335700.43,
    tipoCuenta:'cobrar', estado:'Contabilizado' },
  // ── Cuentas por pagar ──
  { id:3, tipo:'O', nroAsiento:'GP-60102638', fecha:'02/01/2026', libro:'O',
    titulo:'Diferencia de tasa al 31-12-2025', cuenta:'200-001-0001', cuentaNombre:'Proveedores extranjeros USD',
    descripcion:'Ajuste por diferencial cambiario - revaluación de saldo por pagar', debe:0, haber:13892.17,
    tipoCuenta:'pagar', estado:'Pendiente' },
  { id:4, tipo:'O', nroAsiento:'GP-60102638', fecha:'02/01/2026', libro:'O',
    titulo:'Diferencia de tasa al 31-12-2025', cuenta:'820-001-0001', cuentaNombre:'Pérdida por diferencial cambiario',
    descripcion:'Contrapartida: pérdida cambiaria por revaluación de cuentas por pagar', debe:13892.17, haber:0,
    tipoCuenta:'pagar', estado:'Pendiente' },
  // ── Cuentas bancarias ──
  { id:5, tipo:'O', nroAsiento:'GP-60102639', fecha:'02/01/2026', libro:'O',
    titulo:'Extra tips - rebajo comisión TC', cuenta:'100-003-0001', cuentaNombre:'BAC $ 4563212454587',
    descripcion:'Ajuste por diferencial cambiario - revaluación de cuenta bancaria en USD', debe:1575050.98, haber:0,
    tipoCuenta:'bancos', estado:'Contabilizado' },
  { id:6, tipo:'O', nroAsiento:'GP-60102639', fecha:'02/01/2026', libro:'O',
    titulo:'Extra tips - rebajo comisión TC', cuenta:'810-001-0001', cuentaNombre:'Ganancia por diferencial cambiario',
    descripcion:'Contrapartida: ganancia cambiaria por revaluación de cuenta bancaria', debe:0, haber:1575050.98,
    tipoCuenta:'bancos', estado:'Contabilizado' },
];

const ESTADO_STYLE: Record<EstadoDC,[string,string]> = {
  Contabilizado: [GREEN, 'rgba(29,158,117,.1)'],
  Pendiente:     [BRAND, '#FFF8EC'],
  Anulado:       [RED,   'rgba(226,75,74,.1)'],
};

// ── Detalle del asiento mostrar claramente qué está en el Debe
// y qué está en el Haber, con el nombre de cada cuenta ──────────────────────
function ModalDetalleAsiento({ lineas, onClose }: { lineas:AsientoDC[]; onClose:()=>void }) {
  const totalDebe  = lineas.reduce((s,l)=>s+l.debe,0);
  const totalHaber = lineas.reduce((s,l)=>s+l.haber,0);
  const first = lineas[0];
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:560, padding:24, fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <p style={{ fontSize:14, fontWeight:600, color:'#0F0F0F', margin:0, fontFamily:F }}>{first.titulo}</p>
            <p style={{ fontSize:11, color:'#757575', margin:'3px 0 0', fontFamily:F }}>Asiento {first.nroAsiento} · {first.fecha} · Libro {first.libro}</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9E9E9E', fontSize:18, lineHeight:1, padding:0 }}>×</button>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F, marginBottom:6 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
              <th style={{ padding:'6px 8px', textAlign:'left', fontWeight:500, color:'#888', fontSize:11 }}>Cuenta</th>
              <th style={{ padding:'6px 8px', textAlign:'right', fontWeight:500, color:'#888', fontSize:11 }}>Debe</th>
              <th style={{ padding:'6px 8px', textAlign:'right', fontWeight:500, color:'#888', fontSize:11 }}>Haber</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map(l=>(
              <tr key={l.id} style={{ borderBottom:'1px solid #F5F5F5' }}>
                <td style={{ padding:'7px 8px' }}>
                  <span style={{ display:'block', fontSize:11, color:BRAND, fontVariantNumeric:'tabular-nums' }}>{l.cuenta}</span>
                  <span style={{ display:'block', fontSize:12, color:'#0F0F0F' }}>{l.cuentaNombre}</span>
                </td>
                <td style={{ padding:'7px 8px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
                  {l.debe>0 ? <><span style={{ color:'#9E9E9E' }}>₡</span> {fmt(l.debe)}</> : <span style={{ color:'#CCC' }}>-</span>}
                </td>
                <td style={{ padding:'7px 8px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
                  {l.haber>0 ? <><span style={{ color:'#9E9E9E' }}>₡</span> {fmt(l.haber)}</> : <span style={{ color:'#CCC' }}>-</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:`2px solid ${C.n500}` }}>
              <td style={{ padding:'8px', fontWeight:700 }}>Total</td>
              <td style={{ padding:'8px', textAlign:'right', fontWeight:700 }}><span style={{ color:'#9E9E9E', fontWeight:400 }}>₡</span> {fmt(totalDebe)}</td>
              <td style={{ padding:'8px', textAlign:'right', fontWeight:700 }}><span style={{ color:'#9E9E9E', fontWeight:400 }}>₡</span> {fmt(totalHaber)}</td>
            </tr>
          </tfoot>
        </table>
        <p style={{ fontSize:10, color: Math.abs(totalDebe-totalHaber)<0.005?GREEN:RED, margin:0 }}>
          {Math.abs(totalDebe-totalHaber)<0.005 ? '✓ El asiento cuadra (Debe = Haber)' : '⚠ El asiento no cuadra'}
        </p>
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:18 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal crear / editar movimiento cambiario ────────────────────────────────
function ModalCrearMovimiento({ onClose, editar }: { onClose:()=>void; editar?: { fecha:string; tipoCuenta:string; tc:string } }) {
  const [fecha,   setFecha]   = useState(editar?.fecha ?? '');
  const [tipoCta, setTipoCta] = useState(editar?.tipoCuenta ?? 'Cuentas por cobrar');
  const [tc,      setTc]      = useState(editar?.tc ?? '450.80');

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:500,
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:420, padding:24, fontFamily:F,
        boxShadow:'0 8px 40px rgba(0,0,0,.2)' }}>
        {/* Header modal */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <span style={{ fontSize:14, fontWeight:600, color:'#0F0F0F', fontFamily:F }}>{editar ? 'Editar movimiento cambiario' : 'Crear movimiento cambiario'}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9E9E9E', fontSize:18, lineHeight:1, padding:0 }}>×</button>
        </div>

        {/* Fecha */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:500, color:'#555', display:'block', marginBottom:5, fontFamily:F }}>
            Fecha del ajuste <span style={{ color:'#F44336' }}>*</span>
          </label>
          <div style={{ position:'relative' }}>
            <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)}
              style={{ width:'100%', height:36, padding:'0 34px 0 10px', border:`1px solid ${C.n500}`,
                borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', color: fecha?'#0F0F0F':'#9E9E9E', boxSizing:'border-box' }}/>
            <svg style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
              width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#9E9E9E" strokeWidth="1.3" strokeLinecap="round">
              <rect x="1.5" y="2" width="11" height="11" rx="2"/><path d="M5 1v2M9 1v2M1.5 5.5h11"/>
            </svg>
          </div>
        </div>

        {/* Tipo de cuenta */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:500, color:'#555', display:'block', marginBottom:5, fontFamily:F }}>
            Tipo de cuenta <span style={{ color:'#F44336' }}>*</span>
          </label>
          <div style={{ position:'relative' }}>
            <select value={tipoCta} onChange={e=>setTipoCta(e.target.value)}
              style={{ width:'100%', height:36, padding:'0 30px 0 10px', border:`1px solid ${C.n500}`,
                borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none', background:'#fff', color:'#0F0F0F' }}>
              <option>Cuentas por cobrar</option>
              <option>Cuentas por pagar</option>
              <option>Cuentas bancarias</option>
            </select>
            <svg style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
              width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#9E9E9E" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3.5 5.25L7 8.75L10.5 5.25"/>
            </svg>
          </div>
        </div>

        {/* Tipo de cambio */}
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:11, fontWeight:500, color:'#555', display:'block', marginBottom:5, fontFamily:F }}>
            Tipo de cambio nuevo <span style={{ color:'#F44336' }}>*</span>
          </label>
          <input value={tc} onChange={e=>setTc(e.target.value)}
            style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`,
              borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', fontVariantNumeric:'tabular-nums', boxSizing:'border-box' }}/>
        </div>

        {/* Footer */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose}
            style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, borderRadius:radius.md,
              background:'#fff', cursor:'pointer', fontSize:13, fontFamily:F, color:'#555' }}>Cancelar</button>
          <button onClick={onClose} style={{ height:36, padding:'0 20px', border:'none', borderRadius:radius.md,
            background:BRAND, color:'#fff', cursor:'pointer', fontSize:13, fontFamily:F, fontWeight:500 }}>{editar ? 'Guardar' : 'Generar'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DiferencialCambiario() {
  const [movs, setMovs] = useState<AsientoDC[]>(MOCK);
  const [tipoCuenta, setTipoCuenta] = useState<TipoCuenta>('cobrar');
  const [libro,   setLibro]   = useState('');
  const [busq,    setBusq]    = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editandoNro, setEditandoNro] = useState<string|null>(null);
  const [detalleNro, setDetalleNro] = useState<string|null>(null);
  const [showExportar, setShowExportar] = useState(false);
  const [toast, setToast] = useState<string|null>(null);

  const TIPOS: {value:TipoCuenta; label:string}[] = [
    {value:'cobrar', label:'Cuentas x Cobrar'},
    {value:'pagar',  label:'Cuentas x Pagar'},
    {value:'bancos', label:'Cuentas Bancarias'},
  ];

  const LIBROS = [
    { value:'', label:'Libros' },
    { value:'O', label:'Operaciones (O)' },
    { value:'G', label:'General (G)' },
  ];

  const filtrados = movs.filter(a =>
    a.tipoCuenta === tipoCuenta &&
    (!libro || a.libro === libro) &&
    (!busq || a.descripcion.toLowerCase().includes(busq.toLowerCase()) || a.titulo.toLowerCase().includes(busq.toLowerCase()))
  );
  const totalDebe  = filtrados.reduce((s,a)=>s+a.debe,0);
  const totalHaber = filtrados.reduce((s,a)=>s+a.haber,0);
  const cuadra = Math.abs(totalDebe-totalHaber) < 0.005;

  // acciones Contabilizar / Anular por asiento completo (todas sus líneas)
  function contabilizarAsiento(nro:string) {
    setMovs(p=>p.map(m=>m.nroAsiento===nro && m.estado==='Pendiente' ? {...m, estado:'Contabilizado'} : m));
    setToast(`Asiento ${nro} contabilizado`);
  }
  function anularAsiento(nro:string) {
    setMovs(p=>p.map(m=>m.nroAsiento===nro && m.estado!=='Anulado' ? {...m, estado:'Anulado'} : m));
    setToast(`Asiento ${nro} anulado`);
  }

  const lineasDetalle = detalleNro ? movs.filter(m=>m.nroAsiento===detalleNro) : [];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily:F, background:'#fff', overflow:'hidden' }}>

      {/* ── Header ── */}
      <PageHeader title="Diferencial cambiario">
        <BotonExportarUnico onClick={()=>setShowExportar(true)}/>
        {/* Crear movimiento */}
        <button onClick={()=>setShowModal(true)}
          style={{ height:32, padding:'0 14px', border:'none', borderRadius:radius.md,
          background:BRAND, cursor:'pointer', fontSize:12, fontFamily:F, color:'#fff', fontWeight:500,
          display:'flex', alignItems:'center', gap:6 }}>
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
            <path d="M7 2v10M2 7h10"/>
          </svg>
          Nuevo ajuste
        </button>
      </PageHeader>

      {/* ── Barra filtros - estilo Figma ── */}
      <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px',
        display:'flex', alignItems:'center', gap:10, flexShrink:0, flexWrap:'wrap' }}>

        {/* Buscar */}
        <SearchInput value={busq} onChange={setBusq} placeholder="Buscar por descripción…" width={200} />

        {/* Libros dropdown */}
        <div style={{ position:'relative' }}>
          <select value={libro} onChange={e=>setLibro(e.target.value)}
            style={{ height:32, padding:'0 28px 0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md,
              fontSize:12, fontFamily:F, outline:'none', appearance:'none', background:'#fff', cursor:'pointer', color:libro?BRAND:'#555' }}>
            {LIBROS.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <svg style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
            width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#9E9E9E" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3.5 5.25L7 8.75L10.5 5.25"/>
          </svg>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:8 }}>
          <span style={{ fontSize:12, color:'#757575', whiteSpace:'nowrap', fontFamily:F }}>Aplicar a cuentas por:</span>
          {TIPOS.map(opt=>(
            <label key={opt.value} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12,
              color:tipoCuenta===opt.value?BRAND:'#555', cursor:'pointer', whiteSpace:'nowrap', fontFamily:F }}>
              <span onClick={()=>setTipoCuenta(opt.value)}
                style={{ width:14,height:14,borderRadius:'50%',border:`2px solid ${tipoCuenta===opt.value?BRAND:'#CCC'}`,
                  background:tipoCuenta===opt.value?BRAND:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer' }}>
                {tipoCuenta===opt.value&&<span style={{ width:4,height:4,borderRadius:'50%',background:'#fff' }}/>}
              </span>
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Tabla ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 24px' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F, tableLayout:'fixed' }}>
          <colgroup>
            <col style={{ width:130 }}/><col style={{ width:90 }}/><col style={{ width:36 }}/><col/>
            <col style={{ width:150 }}/><col/><col style={{ width:110 }}/><col style={{ width:110 }}/>
            <col style={{ width:100 }}/><col style={{ width:110 }}/>
          </colgroup>
          <thead style={{ position:'sticky', top:0, zIndex:1, background:'#fff' }}>
            <tr style={{ background:'#fff', borderBottom:`1px solid ${C.n500}` }}>
              {[['No. Asiento','left'],['Fecha','left'],['L.','left'],['Título','left'],['Cuenta','left'],['Descripcion','left'],['Debe','right'],['Haber','right'],['Estado','left'],['Acciones','left']]
                .map(([h,align],i)=>(
                  <th key={i} style={{ padding:'8px 12px', fontWeight:500, color:'#888', textAlign:align as 'left'|'right',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontSize:11, fontFamily:F }}>{h}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={10} style={{ padding:'30px 12px', textAlign:'center', color:'#9E9E9E', fontSize:12 }}>Sin movimientos para los filtros seleccionados.</td></tr>
            ) : filtrados.map((a,i)=>{
              const [ec, ebg] = ESTADO_STYLE[a.estado];
              return (
              <tr key={a.id} style={{ borderBottom:`1px solid #F0F0F0`, background: i%2===1?'#FCFCFA':'#fff' }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#FFFBF2'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background= i%2===1?'#FCFCFA':'#fff'}>
                <td style={{ padding:'8px 12px', color:BRAND, fontWeight:500, fontVariantNumeric:'tabular-nums', fontFamily:F }}>{a.nroAsiento}</td>
                <td style={{ padding:'8px 12px', color:'#757575', whiteSpace:'nowrap', fontFamily:F }}>{a.fecha}</td>
                <td style={{ padding:'8px 12px', fontFamily:F }}>
                  <span style={{ fontSize:11, padding:'2px 6px', borderRadius:4, fontWeight:600,
                    background:a.tipo==='G'?'#FFF8EC':'#E6F1FB',
                    color:a.tipo==='G'?BRAND:'#185FA5' }}>{a.tipo}</span>
                </td>
                <td title={a.titulo} style={{ padding:'8px 12px', color:'#0F0F0F', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:F }}>{a.titulo}</td>
                <td style={{ padding:'8px 12px', fontFamily:F, fontSize:11, overflow:'hidden' }}>
                  <span style={{ display:'block', color:'#757575', fontVariantNumeric:'tabular-nums' }}>{a.cuenta}</span>
                  <span title={a.cuentaNombre} style={{ display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
                    color:'#0F0F0F', whiteSpace:'normal', lineHeight:1.3 }}>{a.cuentaNombre}</span>
                </td>
                <td title={a.descripcion} style={{ padding:'8px 12px', color:'#757575', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:F }}>{a.descripcion}</td>
                <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontFamily:F, whiteSpace:'nowrap' }}>
                  {a.debe>0
                    ? <><span style={{ color:'#999' }}>₡</span> <span style={{ color:'#0F0F0F' }}>{fmt(a.debe)}</span></>
                    : <span style={{ color:'#CCC' }}>-</span>}
                </td>
                <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontFamily:F, whiteSpace:'nowrap' }}>
                  {a.haber>0
                    ? <><span style={{ color:'#999' }}>₡</span> <span style={{ color:'#0F0F0F' }}>{fmt(a.haber)}</span></>
                    : <span style={{ color:'#CCC' }}>-</span>}
                </td>
                <td style={{ padding:'8px 12px' }}>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:radius.lg, fontWeight:600, background:ebg, color:ec, whiteSpace:'nowrap' }}>{a.estado}</span>
                </td>
                <td style={{ padding:'8px 12px' }}>
                  <div style={{ display:'flex', gap:4 }}>
                    <button title="Ver detalle" onClick={()=>setDetalleNro(a.nroAsiento)}
                      style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:'#757575', display:'flex', alignItems:'center', justifyContent:'center' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='#F0F0F0')} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>
                    </button>
                    {a.estado==='Pendiente' && (
                      <button title="Editar" onClick={()=>setEditandoNro(a.nroAsiento)}
                        style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:'#757575', display:'flex', alignItems:'center', justifyContent:'center' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='#F0F0F0')} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-8 8-3.5 1 1-3.5 7.5-7.5z"/></svg>
                      </button>
                    )}
                    {a.estado==='Pendiente' && (
                      <button title="Contabilizar" onClick={()=>contabilizarAsiento(a.nroAsiento)}
                        style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:GREEN, display:'flex', alignItems:'center', justifyContent:'center' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='rgba(29,158,117,.1)')} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 8.5l3 3 7-7"/></svg>
                      </button>
                    )}
                    {a.estado!=='Anulado' && (
                      <button title="Anular" onClick={()=>anularAsiento(a.nroAsiento)}
                        style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:RED, display:'flex', alignItems:'center', justifyContent:'center' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='rgba(226,75,74,.1)')} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );})}
          </tbody>
          <tfoot>
            <tr style={{ background:'#F8F8F8', borderTop:`2px solid ${C.n500}` }}>
              <td colSpan={6} style={{ padding:'9px 12px', textAlign:'right', fontWeight:600, fontFamily:F, color:'#333' }}>
                Diferencia total {!cuadra && <span style={{ fontWeight:400, color:'#E07B00' }}>· no cuadra</span>}
              </td>
              <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:700, fontVariantNumeric:'tabular-nums', fontFamily:F, whiteSpace:'nowrap' }}>
                <span style={{ color:'#999', fontWeight:400 }}>₡</span> <span style={{ color:BRAND }}>{fmt(totalDebe)}</span>
              </td>
              <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:700, fontVariantNumeric:'tabular-nums', fontFamily:F, whiteSpace:'nowrap' }}>
                <span style={{ color:'#999', fontWeight:400 }}>₡</span> <span style={{ color:'#0F0F0F' }}>{fmt(totalHaber)}</span>
              </td>
              <td colSpan={2}/>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Modales */}
      {showModal && <ModalCrearMovimiento onClose={()=>setShowModal(false)}/>}
      {editandoNro && (()=>{
        const m = movs.find(x=>x.nroAsiento===editandoNro);
        if (!m) return null;
        const tipoLabel = TIPOS.find(t=>t.value===m.tipoCuenta)?.label ?? 'Cuentas por cobrar';
        return (
          <ModalCrearMovimiento onClose={()=>setEditandoNro(null)}
            editar={{ fecha:'', tipoCuenta:tipoLabel, tc:'' }}/>
        );
      })()}
      {detalleNro && <ModalDetalleAsiento lineas={lineasDetalle} onClose={()=>setDetalleNro(null)}/>}
      {showExportar && (
        <ExportListModal
          reporteKey="diferencial"
          title="Diferencial cambiario"
          subtitulo={`${TIPOS.find(t=>t.value===tipoCuenta)?.label} · ${filtrados.length} movimiento${filtrados.length===1?'':'s'}`}
          filename="diferencial-cambiario"
          columns={[
            { key:'nroAsiento', label:'No. Asiento' }, { key:'fecha', label:'Fecha' }, { key:'libro', label:'Libro' },
            { key:'titulo', label:'Título' }, { key:'cuenta', label:'Cuenta' }, { key:'descripcion', label:'Descripción' },
            { key:'debe', label:'Debe', align:'right' }, { key:'haber', label:'Haber', align:'right' }, { key:'estado', label:'Estado' },
          ]}
          rows={filtrados.map(a=>({
            nroAsiento:a.nroAsiento, fecha:a.fecha, libro:a.libro, titulo:a.titulo,
            cuenta:`${a.cuenta} · ${a.cuentaNombre}`, descripcion:a.descripcion,
            debe: a.debe>0?fmt(a.debe):'-', haber: a.haber>0?fmt(a.haber):'-', estado:a.estado,
          }))}
          onClose={()=>setShowExportar(false)}
        />
      )}
      {toast && (
        <div style={{ position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)', background:'#1A1A1A', color:'#fff',
          padding:'10px 18px', borderRadius:radius.md, fontSize:12, fontFamily:F, zIndex:900 }}
          onAnimationEnd={()=>{}}>
          {toast}
          <button onClick={()=>setToast(null)} style={{ marginLeft:10, background:'none', border:'none', color:'#fff', cursor:'pointer', opacity:.7 }}>×</button>
        </div>
      )}
    </div>
  );
}
