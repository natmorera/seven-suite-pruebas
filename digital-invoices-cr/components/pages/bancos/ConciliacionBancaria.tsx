'use client';
import React, { useState, useRef, useEffect } from 'react';
import { C, fmtNum, fmtDate, Toast, USUARIO_ACTUAL, Pagination, BotonExportarUnico, ExportListModal, PAGE_PAD, MoneyHeaderCells, MoneyCells, MoneyCellsStack, PresenciaOperacion, FONT, radius, shadow, PageHeader, SearchInput, FilterDropdown } from '../../ui/primitives';

const F = FONT;
const BRAND = C.brand;
function fmt2(n: number) { return fmtNum(n, 2); }
function sym(moneda: string) { return moneda === 'USD' ? '$' : '₡'; }

type EstadoCon = 'En proceso' | 'Sin saldo' | 'Cerrada';
type EstadoMov = 'Conciliado' | 'Pendiente' | 'Futuro';

interface Movimiento {
  id: number; fecha: string; comprobante: string; documento: string;
  descripcion: string; moneda: string; debitos: number; creditos: number;
  importeCRC: number; estado: EstadoMov;
}

interface Conciliacion {
  id: number; consecutivo: string; estado: EstadoCon;
  cuentaBancaria: string; cuentaCode: string; moneda: string;
  desde: string; hasta: string; saldoBanco: number; saldoLibros: number;
  diferencia: number; saldoInicial: number; usuario: string; movimientos: Movimiento[];
  cerradaPor?: string; fechaCierre?: string;
}

const MOVIMIENTOS_MOCK: Movimiento[] = [
  { id:1,  fecha:'05/01/2026', comprobante:'60103736', documento:'25959549', descripcion:'PAGO ANUAL BIENES INMUEBLES 2026/R',         moneda:'CRC', debitos:0,          creditos:442949.96,  importeCRC:442949.96,  estado:'Conciliado' },
  { id:2,  fecha:'05/01/2026', comprobante:'60103737', documento:'25959991', descripcion:'CXC Socios Pago Imp. Municipales Forest',    moneda:'CRC', debitos:0,          creditos:94338.00,   importeCRC:94338.00,   estado:'Conciliado' },
  { id:3,  fecha:'05/01/2026', comprobante:'60103738', documento:'25958967', descripcion:'Pago Impuestos Municipales / 01-2026',        moneda:'CRC', debitos:0,          creditos:1711689.85, importeCRC:1711689.85, estado:'Futuro' },
  { id:4,  fecha:'06/01/2026', comprobante:'60102294', documento:'96501703', descripcion:'Alquiler Soda La Vieja Enero 2026',           moneda:'CRC', debitos:148500.00,  creditos:0,          importeCRC:148500.00,  estado:'Conciliado' },
  { id:5,  fecha:'06/01/2026', comprobante:'60102301', documento:'96499282', descripcion:'Consignación Diciembre Angélica Mayorg',      moneda:'CRC', debitos:1072541.25, creditos:0,          importeCRC:1072541.25, estado:'Pendiente' },
  { id:6,  fecha:'09/01/2026', comprobante:'60100721', documento:'26336023', descripcion:'Pago Luis Rivas ¢1,000,000.00',               moneda:'CRC', debitos:0,          creditos:1000000.00, importeCRC:1000000.00, estado:'Conciliado' },
  { id:7,  fecha:'09/01/2026', comprobante:'60101631', documento:'26286424', descripcion:'Pago Agrícola La Candelaria Limitada',        moneda:'CRC', debitos:3960198.00, creditos:0,          importeCRC:3960198.00, estado:'Conciliado' },
  { id:8,  fecha:'09/01/2026', comprobante:'60101632', documento:'26286425', descripcion:'Comisión bancaria enero 2026',                moneda:'CRC', debitos:3987986.71, creditos:0,          importeCRC:3987986.71, estado:'Pendiente' },
];

const CONCILIACIONES_INIT: Conciliacion[] = [
  { id:1, consecutivo:'CON-004', estado:'En proceso', cuentaBancaria:'BAC San José C…', cuentaCode:'12002003', moneda:'CRC', desde:'01/06/26', hasta:'30/06/26', saldoBanco:47519110.28, saldoLibros:47519110.28, diferencia:0,      saldoInicial:34766025.69, usuario:'jperez',   movimientos:MOVIMIENTOS_MOCK.map(m=>({...m})) },
  { id:2, consecutivo:'CON-005', estado:'En proceso', cuentaBancaria:'BCR 001-02520…', cuentaCode:'12001002', moneda:'CRC', desde:'01/06/26', hasta:'30/06/26', saldoBanco:8247956.66,  saldoLibros:8247534.00,  diferencia:422.66, saldoInicial:7825107.34,  usuario:'sblandon', movimientos:[] },
  { id:3, consecutivo:'CON-006', estado:'Sin saldo',  cuentaBancaria:'BNCR 015-0049…', cuentaCode:'1002001',  moneda:'CRC', desde:'01/06/26', hasta:'30/06/26', saldoBanco:0,           saldoLibros:0,           diferencia:0,      saldoInicial:0,           usuario:'yader',    movimientos:[] },
  { id:4, consecutivo:'CON-007', estado:'Cerrada',    cuentaBancaria:'BNCR 015-0049…', cuentaCode:'1002001',  moneda:'CRC', desde:'01/05/26', hasta:'31/05/26', saldoBanco:43159.84,    saldoLibros:43159.84,    diferencia:0,      saldoInicial:34766025.69, usuario:'yader',    movimientos:[], cerradaPor:'yader', fechaCierre:'01/06/26' },
];



const ESTADO_CON_STYLE: Record<EstadoCon,[string,string]> = {
  'En proceso':['#EF9F27','rgba(239,159,39,.12)'],
  'Sin saldo': ['#EF9F27','rgba(239,159,39,.08)'],
  'Cerrada':   ['#757575','rgba(117,117,117,.1)'],
};
const ESTADO_MOV_ICON: Record<EstadoMov, React.ReactNode> = {
  Conciliado: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="rgba(29,158,117,.15)"/><path d="M5 8l2 2 4-4" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Futuro:     <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="rgba(59,130,246,.15)"/><circle cx="8" cy="8" r="2.5" fill="#3B82F6"/></svg>,
  Pendiente:  <div style={{ width:14, height:14, borderRadius:3, border:`1px solid #D0D0D0`, background:'#fff' }}/>,
};

function Pill({ children, color, bg }: { children:React.ReactNode; color:string; bg:string }) {
  return <span style={{ fontSize:11, padding:'3px 10px', borderRadius:radius.pill, fontWeight:500, color, background:bg, whiteSpace:'nowrap', fontFamily:F }}>{children}</span>;
}

function useEscClose(onClose:()=>void){
  useEffect(()=>{
    function esc(e:KeyboardEvent){if (e.key === 'Escape') { e.preventDefault(); onClose(); }}
    document.addEventListener('keydown',esc);
    return ()=>document.removeEventListener('keydown',esc);
  },[onClose]);
}

function VistaPreviaModal({ con, onClose }: { con:Conciliacion; onClose:()=>void }) {
  useEscClose(onClose);
  const s = sym(con.moneda);
  const movs = con.movimientos.filter(m=>m.estado==='Conciliado');
  const depositos = movs.filter(m=>m.debitos>0).reduce((s,m)=>s+m.debitos,0);
  const cheques    = movs.filter(m=>m.creditos>0).reduce((s,m)=>s+m.creditos,0);
  const depositosPend = con.movimientos.filter(m=>m.estado!=='Conciliado'&&m.debitos>0).reduce((s,m)=>s+m.debitos,0);
  const chequesPend    = con.movimientos.filter(m=>m.estado!=='Conciliado'&&m.creditos>0).reduce((s,m)=>s+m.creditos,0);
  const saldoSegunLibros = con.saldoInicial + depositos - cheques;
  const saldoSegunBanco  = con.saldoBanco;
  const saldoAjustado    = saldoSegunBanco;

  return (
    <div role="dialog" aria-modal="true" aria-label="Vista previa del reporte" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:10, width:'100%', maxWidth:820, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.3)', fontFamily:F }} onClick={e=>e.stopPropagation()}>

        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:600 }}>Vista previa</span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>window.print()} style={{ height:32, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Imprimir / Guardar PDF</button>
            <button onClick={onClose} aria-label="Cerrar" style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:C.n700 }}>×</button>
          </div>
        </div>

        <div style={{ padding:'28px 32px' }}>
          {/* Encabezado del reporte */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, paddingBottom:16, borderBottom:`2px solid ${C.n500}` }}>
            <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{ width:38, height:38, borderRadius:radius.md, background:BRAND, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, flexShrink:0 }}>HF</div>
              <div>
                <p style={{ fontSize:13, fontWeight:600, margin:0 }}>Hotel Fortuna S.A.</p>
                <p style={{ fontSize:11, color:C.n700, margin:'2px 0 0' }}>Empresa 001</p>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
                <p style={{ fontSize:15, fontWeight:600, margin:0 }}>Reporte de conciliación bancaria</p>
                <Pill color={ESTADO_CON_STYLE[con.estado][0]} bg={ESTADO_CON_STYLE[con.estado][1]}>{con.estado}</Pill>
              </div>
            </div>
          </div>

          {/* Datos de la cuenta */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 32px', marginBottom:24, fontSize:12 }}>
            {[
              ['Cuenta', `${con.cuentaCode} ${con.cuentaBancaria}`],
              ['Periodo desde', con.desde],
              ['Moneda', `${con.moneda} – ${con.moneda==='USD'?'Dólar estadounidense':'Colón costarricense'}`],
              ['Periodo hasta', con.hasta],
              ['Estado', `${con.estado}${con.estado==='Cerrada'?` · ${con.fechaCierre??''} por ${con.cerradaPor??'-'}`:''}`],
              ['Acumulado hasta', con.hasta],
            ].map(([l,v])=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:C.n700 }}>{l}:</span>
                <span style={{ fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Movimientos conciliados */}
          <p style={{ fontSize:13, fontWeight:600, margin:'0 0 10px' }}>Movimientos conciliados</p>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, marginBottom:6 }}>
            <thead><tr style={{ background:'#0F0F0F' }}>
              {['','Fecha','Comprobante','Documento','Descripción','Mon.','Débitos','Créditos'].map(h=>(
                <th key={h} style={{ padding:'7px 10px', textAlign:h==='Débitos'||h==='Créditos'?'right':'left', color:'#fff', fontWeight:500, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {movs.length===0 ? (
                <tr><td colSpan={8} style={{ padding:'18px 10px', textAlign:'center', color:C.n700 }}>Sin movimientos conciliados en este período.</td></tr>
              ) : movs.map(m=>(
                <tr key={m.id} style={{ borderBottom:'1px solid #EFEFEF' }}>
                  <td style={{ padding:'7px 10px' }}>{ESTADO_MOV_ICON['Conciliado']}</td>
                  <td style={{ padding:'7px 10px', whiteSpace:'nowrap' }}>{m.fecha}</td>
                  <td style={{ padding:'7px 10px' }}>{m.comprobante}</td>
                  <td style={{ padding:'7px 10px' }}>{m.documento}</td>
                  <td style={{ padding:'7px 10px', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis' }}>{m.descripcion}</td>
                  <td style={{ padding:'7px 10px' }}>{m.moneda}</td>
                  <td style={{ padding:'7px 10px', textAlign:'right' }}>{m.debitos>0?fmt2(m.debitos):'0.00'}</td>
                  <td style={{ padding:'7px 10px', textAlign:'right' }}>{m.creditos>0?fmt2(m.creditos):'0.00'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize:11, color:C.n700, margin:'0 0 24px' }}>
            Depósitos: {s} {fmt2(depositos)} · Pendiente: {s} {fmt2(depositosPend)} &nbsp;·&nbsp; Cheques: {s} {fmt2(cheques)} · Pendiente: {s} {fmt2(chequesPend)}
          </p>

          {/* Notas + cálculo de saldo */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:24, marginBottom:32 }}>
            <div>
              <p style={{ fontSize:12, fontWeight:600, margin:'0 0 6px' }}>Notas</p>
              <div style={{ border:`1px solid ${C.n500}`, borderRadius:radius.md, minHeight:100, padding:'10px 12px', fontSize:11, color:C.n700 }}>-</div>
            </div>
            <div style={{ fontSize:12 }}>
              {[
                ['Saldo inicial', con.saldoInicial, false],
                ['+ Depósitos y débitos conciliados', depositos, false],
                ['– Cheques y créditos conciliados', -cheques, false],
                ['+ Otros en libros', 0, false],
                ['Saldo según libros', saldoSegunLibros, true],
                ['+ Otros en banco', 0, false],
                ['Saldo según banco', saldoSegunBanco, true],
                ['Saldo ajustado banco', saldoAjustado, true],
              ].map(([l,v,bold])=>(
                <div key={l as string} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderTop: bold?`1px solid ${C.n500}`:'none', fontWeight:bold?700:400 }}>
                  <span>{l as string}</span>
                  <span>{s} {fmt2(v as number)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Firmas */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:24, paddingTop:24 }}>
            {[[con.cerradaPor ?? con.usuario,'Confeccionado por'],['','Revisado por'],['','Aprobado por']].map(([name,label])=>(
              <div key={label} style={{ textAlign:'center' }}>
                {name && <p style={{ fontSize:11, margin:'0 0 4px' }}>{name}</p>}
                <div style={{ borderTop:`1px solid ${C.n700}`, paddingTop:6 }}>
                  <p style={{ fontSize:10, color:C.n700, margin:0 }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modales ───────────────────────────────────────────────────────────────────
function NuevaConciliacionModal({ onClose, onCreate }: { onClose:()=>void; onCreate:(c:{cuenta:string;moneda:'CRC'|'USD';desde:string;hasta:string;saldo:number})=>void }) {
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
      <div style={{ background:'#fff', borderRadius:radius.lg, width:380, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
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
            <select value={form.cuenta} onChange={e=>sf('cuenta',e.target.value)} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none' }}>
              {CUENTAS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Período desde <span style={{ color:C.error }}>*</span></label>
              <input type="date" value={form.desde} onChange={e=>{sf('desde',e.target.value);setErrores(p=>({...p,desde:false}));}}
                style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errores.desde?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Período hasta <span style={{ color:C.error }}>*</span></label>
              <input type="date" value={form.hasta} onChange={e=>{sf('hasta',e.target.value);setErrores(p=>({...p,hasta:false}));}}
                style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errores.hasta?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Saldo según banco <span style={{ color:C.error }}>*</span></label>
            <input type="number" step="0.01" value={form.saldo} onChange={e=>{sf('saldo',e.target.value);setErrores(p=>({...p,saldo:false}));}}
              style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errores.saldo?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            <p style={{ fontSize:11, color:C.n700, margin:'5px 0 0' }}>Saldo del estado de cuenta bancario para este período. Se guardará automáticamente y no necesitarás ingresarlo de nuevo.</p>
          </div>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={crear} style={{ height:34, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>
            Crear conciliación
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportarArchivoModal({ con, onClose, onImportar }: { con:Conciliacion; onClose:()=>void; onImportar:()=>void }) {
  const [file,setFile] = useState<string|null>(null);
  useEscClose(onClose);
  return (
    <div role="dialog" aria-modal="true" aria-label="Importar archivo del banco" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:420, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Importar archivo del banco - Compensación automática</p>
          <button onClick={onClose} aria-label="Cerrar" style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.n700 }}>×</button>
        </div>
        <div style={{ padding:'20px' }}>
          <p style={{ fontSize:12, color:C.n700, marginBottom:4 }}>Cuenta bancaria</p>
          <p style={{ fontSize:12, fontWeight:500, color:'#0F0F0F', marginBottom:16 }}>{con.cuentaCode} – {con.cuentaBancaria} ({con.moneda})</p>
          <div onDrop={e=>{e.preventDefault();setFile(e.dataTransfer.files[0]?.name??null);}} onDragOver={e=>e.preventDefault()}
            style={{ border:'1.5px dashed #D0D0D0', borderRadius:10, padding:'28px 20px', textAlign:'center', cursor:'pointer' }}
            onClick={()=>setFile('banco-'+con.consecutivo.toLowerCase()+'.xlsx')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D0D0D0" strokeWidth="1.5" style={{ marginBottom:8 }}><path d="M12 16V4M8 8l4-4 4 4"/><path d="M3 20h18"/></svg>
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
          <button onClick={onClose} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={()=>{onImportar();onClose();}} disabled={!file} style={{ height:34, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F, opacity:file?1:.5 }}>
            Importar y conciliar
          </button>
        </div>
      </div>
    </div>
  );
}

function CerrarConciliacionModal({ con, onClose, onCerrar }: { con:Conciliacion; onClose:()=>void; onCerrar:()=>void }) {
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
      <div style={{ background:'#fff', borderRadius:radius.lg, width:440, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
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
              <button onClick={()=>{ onCerrar(); onClose(); }} style={{ height:34, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Cerrar con diferencia</button>
            </>
          ) : (
            <>
              <button onClick={onClose} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
              <button onClick={()=>{ onCerrar(); onClose(); }} style={{ height:34, padding:'0 14px', background:C.success, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Confirmar cierre</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CorteSaldoModal({ con, onClose, onAplicar }: { con:Conciliacion; onClose:()=>void; onAplicar:(fechaCorte:string, saldo:number)=>void }) {
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
      <div style={{ background:'#fff', borderRadius:radius.lg, width:420, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Corte de saldo</p>
          <button onClick={onClose} aria-label="Cerrar" style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.n700 }}>×</button>
        </div>
        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Cuenta</label>
            <input readOnly value={`${con.cuentaCode} – ${con.cuentaBancaria}`} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', background:C.n200, boxSizing:'border-box' }}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Fecha de corte <span style={{ color:C.error }}>*</span></label>
            <input type="date" value={fecha} onChange={e=>{setFecha(e.target.value);setErrores(p=>({...p,fecha:false}));}} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errores.fecha?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            <button onClick={usarUltimoDia} style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'4px 0', fontFamily:F }}>Usar el último día del período ({con.hasta})</button>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Saldo en banco <span style={{ color:C.error }}>*</span></label>
            <input type="number" step="0.01" value={saldo} onChange={e=>{setSaldo(e.target.value);setErrores(p=>({...p,saldo:false}));}} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errores.saldo?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            <p style={{ fontSize:11, color:C.n700, margin:'4px 0 0' }}>Este saldo se usará como punto de partida. Los movimientos anteriores a esta fecha quedarán marcados como conciliados automáticamente.</p>
          </div>
          <div style={{ padding:'10px 12px', background:C.errorBg, border:`1px solid ${C.errorBorder}`, borderRadius:radius.md }}>
            <p style={{ fontSize:12, color:C.error, margin:0 }}>Esta acción es irreversible. Los movimientos anteriores a la fecha de corte se marcarán como conciliados y no podrán modificarse.</p>
          </div>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={aceptar} style={{ height:34, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Aceptar corte</button>
        </div>
      </div>
    </div>
  );
}

// ── Vista de detalle de conciliación ─────────────────────────────────────────
function DetalleConciliacion({ con, onBack, onCerrar, onUpdate }: {
  con:Conciliacion; onBack:()=>void; onCerrar:()=>void; onUpdate:(patch:Partial<Conciliacion>)=>void;
}) {
  const [showImportar,  setShowImportar]  = useState(false);
  const [showCerrar,    setShowCerrar]    = useState(false);
  const [showCorte,     setShowCorte]     = useState(false);
  const [showVista,     setShowVista]     = useState(false);
  const [toast,         setToast]         = useState<string|null>(null);
  const [cargaSaldo,    setCargaSaldo]    = useState('');
  const [cargaDesde,    setCargaDesde]    = useState('2026-06-01');
  const [cargaHasta,    setCargaHasta]    = useState('2026-06-30');
  const [cargaErr,      setCargaErr]      = useState(false);

  // Los movimientos y el saldo viven en el padre (con.movimientos / con.saldoBanco):
  // así el trabajo de conciliar no se pierde al salir y volver a entrar a esta vista.
  const movs = con.movimientos;
  const saldoBanco = con.saldoBanco;

  const enProceso = con.estado === 'En proceso' || con.estado === 'Sin saldo';
  const cerrada   = con.estado === 'Cerrada';
  const s = sym(con.moneda);

  const chequesConc  = movs.filter(m=>m.estado==='Conciliado'&&m.creditos>0);
  const depositosConc = movs.filter(m=>m.estado==='Conciliado'&&m.debitos>0);
  const chequesNoConc  = movs.filter(m=>m.estado!=='Conciliado'&&m.creditos>0);
  const depositosNoConc = movs.filter(m=>m.estado!=='Conciliado'&&m.debitos>0);

  const totalChequesP  = chequesNoConc.reduce((s,m)=>s+m.creditos,0);
  const totalDepositosP = depositosNoConc.reduce((s,m)=>s+m.debitos,0);
  const saldoLibros    = con.saldoLibros;
  const saldoLibrosConcil = saldoBanco - totalChequesP + totalDepositosP;
  const difNoConcil    = saldoLibrosConcil - saldoLibros;

  function toggleMov(id: number) {
    const m = movs.find(x=>x.id===id);
    if(!m || m.estado==='Futuro') return; // ya conciliado en un período futuro: no se puede revertir desde acá
    const nuevos = movs.map(x=>x.id===id ? { ...x, estado: (x.estado==='Conciliado'?'Pendiente':'Conciliado') as EstadoMov } : x);
    onUpdate({ movimientos: nuevos });
  }

  function cargarMovimientos(){
    const saldoNum = parseFloat(cargaSaldo);
    if(!cargaDesde || !cargaHasta || !cargaSaldo || isNaN(saldoNum)){ setCargaErr(true); return; }
    const fromIso = (iso:string) => { const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?`${m[3]}/${m[2]}/${m[1].slice(2)}`:iso; };
    onUpdate({
      movimientos: MOVIMIENTOS_MOCK.map(m=>({...m})),
      saldoBanco: saldoNum,
      saldoLibros: saldoNum,
      diferencia: 0,
      estado: 'En proceso',
      desde: fromIso(cargaDesde), hasta: fromIso(cargaHasta),
    });
    setToast('Movimientos cargados para el período seleccionado');
  }

  function importar(){
    onUpdate({ movimientos: movs.map(m=> m.estado==='Pendiente' ? { ...m, estado:'Conciliado' as EstadoMov } : m) });
    setToast('Archivo importado: los movimientos que calzaron se marcaron como conciliados');
  }

  function aplicarCorte(fechaCorte:string, saldo:number){
    void fechaCorte;
    onUpdate({
      movimientos: movs.map(m=> m.estado==='Pendiente' ? { ...m, estado:'Conciliado' as EstadoMov } : m),
      saldoBanco: saldo, saldoLibros: saldo, diferencia: 0,
    });
    setToast('Corte de saldo aplicado');
  }

  function cerrarConciliacion(){
    onCerrar();
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', fontFamily:F, background:'#fff' }}>
      {/* Header */}
      <div style={{ padding:'12px 24px 14px', borderBottom:`1px solid ${C.n500}`, flexShrink:0 }}>
        {/* Breadcrumb */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
          <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', padding:0, color:C.n700, display:'flex', alignItems:'center', gap:6, fontSize:12, fontFamily:F }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 12L6 8l4-4"/></svg>
            Conciliación bancaria
          </button>
          <span style={{ fontSize:12, color:C.n500 }}>/</span>
          <span style={{ fontSize:12, color:C.n700, fontWeight:500 }}>{con.consecutivo}</span>
        </div>
        {/* Título + badge + subtítulo, con acciones alineadas a la derecha */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <p style={{ fontSize:17, fontWeight:600, margin:0 }}>{con.cuentaBancaria.includes('BAC')?'BAC San José C.C.':'BNCR 015-004943-0'}</p>
              <Pill color={ESTADO_CON_STYLE[con.estado][0]} bg={ESTADO_CON_STYLE[con.estado][1]}>{con.estado}</Pill>
            </div>
            <span style={{ fontSize:12, color:C.n700 }}>{con.moneda} – {con.moneda==='USD'?'Dólar':'Colón'} · {con.desde} – {con.hasta}</span>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            {cerrada ? (
              <>
                <button onClick={()=>setShowVista(true)} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5 6h6M5 9h4"/></svg> Imprimir reporte
                </button>
                <button disabled title="La conciliación está cerrada; solo lectura" style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#F5F5F5', cursor:'not-allowed', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F, color:'#BCBCBC' }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3"/><path d="M11 6l-3 4-3-4M8 10V2"/></svg> Importar archivo
                </button>
                <button disabled title="La conciliación está cerrada; solo lectura" style={{ height:32, padding:'0 12px', background:'#E0E0E0', color:'#9E9E9E', border:'none', borderRadius:radius.md, cursor:'not-allowed', fontSize:12, fontWeight:500, fontFamily:F }}>
                  Cargar movimientos
                </button>
              </>
            ) : (
              <>
                {enProceso && con.movimientos.length > 0 && (
                  <>
                    <button onClick={()=>setShowVista(true)} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5 6h6M5 9h4"/></svg> Imprimir
                    </button>
                    <button onClick={()=>setShowImportar(true)} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3"/><path d="M8 10V2M5 5l3-3 3 3"/></svg> Importar archivo
                    </button>
                    <button onClick={()=>setShowCorte(true)} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                      Corte de saldo
                    </button>
                    <button onClick={()=>setShowCerrar(true)} style={{ height:32, padding:'0 14px', background:C.success, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>
                      Cerrar conciliación
                    </button>
                  </>
                )}
                {(con.estado === 'Sin saldo' || con.movimientos.length === 0) && (
                  <>
                    <button onClick={()=>setShowImportar(true)} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>Importar archivo</button>
                    <button onClick={cargarMovimientos} style={{ height:32, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Cargar movimientos</button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Banner cerrada */}
      {cerrada && (
        <div style={{ padding:'10px 24px`, background:C.successBg, borderBottom:`1px solid ${C.successBorder}`, display:`flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#1D9E75"/><path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <span style={{ fontSize:12, fontWeight:600, color:C.success, fontFamily:F }}>Conciliación cerrada</span>
          <span style={{ fontSize:12, color:C.success, fontFamily:F }}>Cerrada por {con.cerradaPor ?? '-'} el {con.fechaCierre ?? '-'}. Solo lectura.</span>
        </div>
      )}

      {/* Estado sin saldo */}
      {con.estado === 'Sin saldo' || (enProceso && con.movimientos.length === 0) ? (
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          {/* Saldo según banco input */}
          <div style={{ background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:10, padding:'14px 18px', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div>
                <p style={{ fontSize:12, color:'#0F0F0F', fontWeight:500, margin:'0 0 6px' }}>Saldo según banco</p>
                <input type="number" step="0.01" value={cargaSaldo} onChange={e=>{setCargaSaldo(e.target.value);setCargaErr(false);}}
                  style={{ height:36, padding:'0 10px', border:`1px solid ${cargaErr&&!cargaSaldo?C.error:C.n500}`, borderRadius:radius.md, fontSize:13, fontFamily:F, outline:'none', width:160 }}/>
              </div>
              <p style={{ fontSize:12, color:C.n700, marginTop:22, fontFamily:F }}>Ingresá el saldo del estado de cuenta del banco para este período</p>
            </div>
          </div>
          {/* Filtros de carga */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto auto', gap:12, alignItems:'end', marginBottom:20 }}>
            <div>
              <p style={{ fontSize:11, color:C.n700, margin:'0 0 4px' }}>Cuenta bancaria</p>
              <input readOnly value={`${con.cuentaCode} – ${con.cuentaBancaria}`} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', background:C.n200, boxSizing:'border-box' }}/>
            </div>
            <div>
              <p style={{ fontSize:11, color:C.n700, margin:'0 0 4px' }}>Desde <span style={{ color:C.error }}>*</span></p>
              <input type="date" value={cargaDesde} onChange={e=>{setCargaDesde(e.target.value);setCargaErr(false);}} style={{ height:36, padding:'0 10px', border:`1px solid ${cargaErr&&!cargaDesde?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none' }}/>
            </div>
            <div>
              <p style={{ fontSize:11, color:C.n700, margin:'0 0 4px' }}>Hasta <span style={{ color:C.error }}>*</span></p>
              <input type="date" value={cargaHasta} onChange={e=>{setCargaHasta(e.target.value);setCargaErr(false);}} style={{ height:36, padding:'0 10px', border:`1px solid ${cargaErr&&!cargaHasta?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none' }}/>
            </div>
            <div>
              <p style={{ fontSize:11, color:C.n700, margin:'0 0 4px' }}>Moneda</p>
              <select value={con.moneda} onChange={e=>onUpdate({moneda:e.target.value})} style={{ height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none' }}>
                <option value="CRC">CRC – Colón</option><option value="USD">USD – Dólar</option>
              </select>
            </div>
            <button onClick={cargarMovimientos} style={{ height:36, padding:'0 16px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F }}>
              Cargar movimientos
            </button>
          </div>
          {cargaErr && <p style={{ fontSize:11, color:C.error, margin:'-10px 0 16px' }}>Completa saldo, desde y hasta antes de cargar movimientos.</p>}
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <p style={{ fontSize:14, fontWeight:500, color:'#0F0F0F', marginBottom:8 }}>Sin movimientos en este período</p>
            <p style={{ fontSize:12, color:C.n700, maxWidth:360, margin:'0 auto' }}>Selecciona el rango de fechas y haz clic en "Cargar movimientos", o importá el archivo del banco para conciliar automáticamente.</p>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, overflow:'hidden' }}>
          {/* Resumen de conciliación - largo definido, siempre visible, no crece con los movimientos */}
          <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:24, flexShrink:0 }}>
            {/* Col 1: Transacciones */}
            <div>
              <p style={{ fontSize:11, color:C.n700, margin:'0 0 10px', fontFamily:F }}>Transacciones conciliadas</p>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                <span style={{ color:BRAND, fontSize:12, fontFamily:F }}>Cheques / Créditos</span>
                <span style={{ fontWeight:600, color:BRAND }}>{chequesConc.length}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:12 }}>
                <span style={{ color:BRAND, fontSize:12, fontFamily:F }}>Depósitos / Débitos</span>
                <span style={{ fontWeight:600, color:BRAND }}>{depositosConc.length}</span>
              </div>
              <p style={{ fontSize:11, color:C.n700, margin:'0 0 6px', fontFamily:F }}>Transacciones no conciliadas</p>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                <span style={{ color:'#0F0F0F' }}>Cheques / Créditos</span>
                <span style={{ fontWeight:chequesNoConc.length>0?600:400, color:chequesNoConc.length>0?C.error:'#0F0F0F' }}>{chequesNoConc.length}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                <span style={{ color:'#0F0F0F' }}>Depósitos / Débitos</span>
                <span style={{ fontWeight:depositosNoConc.length>0?600:400, color:depositosNoConc.length>0?C.error:'#0F0F0F' }}>{depositosNoConc.length}</span>
              </div>
            </div>

            {/* Col 2: Saldos */}
            <div style={{ fontSize:12 }}>
              {[
                ['Saldo final según banco', `${s} ${fmt2(saldoBanco)}`,     false],
                ['Cheques pendientes –',   `${s} ${fmt2(totalChequesP)}`,  totalChequesP>0],
                ['Depósitos en tránsito +',`${s} ${fmt2(totalDepositosP)}`,false],
                ['Saldo libros p/concil. –',`${s} ${fmt2(saldoLibrosConcil)}`, false],
                ['Diferencia actual (en vivo)',     `${s} ${fmt2(difNoConcil)}`,    difNoConcil!==0],
              ].map(([l,v,isRed])=>(
                <div key={l as string} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ color: (l as string).includes('pendientes')||(l as string).includes('tránsito') ? BRAND : C.n700 }}>{l as string}</span>
                  <div style={{ display:'flex', alignItems:'baseline', justifyContent:'flex-end', gap:3, minWidth:90 }}>
                    <span style={{ color:'#9E9E9E', fontSize:11 }}>{s}</span>
                    <span style={{ fontWeight:(l as string).includes('Diferencia')?700:500, color:isRed?C.error:'#0F0F0F', fontVariantNumeric:'tabular-nums', textAlign:'right' }}>{(v as string).replace(/^[₡$]\s*/,'')}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Col 3: Libros */}
            <div style={{ fontSize:12 }}>
              {[['Saldo libros',`${s} ${fmt2(saldoLibros)}`],['Diferencial inicial (al crear)',`${s} ${fmt2(con.diferencia)}`],['Saldo inicial',`${s} ${fmt2(con.saldoInicial)}`]].map(([l,v])=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                  <span style={{ color:C.n700 }}>{l}</span>
                  <div style={{ display:'flex', alignItems:'baseline', justifyContent:'flex-end', gap:3, minWidth:90 }}>
                    <span style={{ color:'#9E9E9E', fontSize:11 }}>{s}</span>
                    <span style={{ fontWeight:500, fontVariantNumeric:'tabular-nums', textAlign:'right' }}>{v.replace(/^[₡$]\s*/,'')}</span>
                  </div>
                </div>
              ))}
              <p style={{ fontSize:10, color:C.n700, margin:'6px 0 0' }}>La columna del centro ("Diferencia actual") es la vigente; esta es el valor con el que se creó la conciliación.</p>
            </div>
          </div>

          {/* Saldo según banco */}
          <div style={{ padding:'10px 24px', display:'flex', alignItems:'center', gap:16, borderBottom:`1px solid ${C.n500}`, background:C.brandBg, flexShrink:0 }}>
            <span style={{ fontSize:12, color:C.n700, fontFamily:F }}>Saldo final según banco</span>
            <input type="number" value={saldoBanco} onChange={e=>onUpdate({saldoBanco:+e.target.value})} readOnly={cerrada}
              style={{ height:32, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:7, fontSize:13, fontFamily:F, outline:'none', width:160, fontWeight:600 }}/>
            <span style={{ fontSize:11, color:C.n700, fontFamily:F }}>
              {cerrada ? `Registrado al cerrar · ${con.fechaCierre ?? '-'} por ${con.cerradaPor ?? '-'}` : 'Guardado automáticamente para este periodo'}
            </span>
          </div>

          {/* Tabla movimientos - contenedor propio con scroll, así no se estira toda la pantalla como acordeón cuando hay mucho movimiento */}
          <div style={{ flex:1, minHeight:0, overflowY:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
            <thead style={{ position:'sticky', top:0, background:'#fff', zIndex:2 }}>
              <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
                <th style={{ width:36, padding:'10px 14px', fontWeight:500, color:C.n700, fontSize:11 }}>C</th>
                {['Fecha','N° Asiento','Documento','Descripción','Mon.','Débitos','Créditos','Importe CRC'].map(h=>(
                  <th key={h} style={{ padding:'10px 12px', textAlign:h==='Débitos'||h==='Créditos'||h==='Importe CRC'?'right':'left', fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movs.map(m => {
                const isCon  = m.estado === 'Conciliado';
                const isFut  = m.estado === 'Futuro';
                return (
                  <tr key={m.id}
                    title={isFut?'Ya conciliado en un período futuro: no se puede modificar desde acá':undefined}
                    style={{ borderBottom:`1px solid #F5F5F5`, background:isFut?'#EFF6FF':isCon?'rgba(29,158,117,.06)':'#fff',
                      cursor: (cerrada||isFut)?'default':'pointer' }}
                    onClick={()=>!cerrada&&toggleMov(m.id)}
                    onMouseEnter={e=>!cerrada&&!isFut&&(e.currentTarget.style.background=isCon?'rgba(29,158,117,.12)':C.n200)}
                    onMouseLeave={e=>(e.currentTarget.style.background=isFut?'#EFF6FF':isCon?'rgba(29,158,117,.06)':'#fff')}>
                    <td style={{ padding:'8px 14px', textAlign:'center' }}>
                      {ESTADO_MOV_ICON[m.estado]}
                    </td>
                    <td style={{ padding:'8px 12px', color:isFut?'#3B82F6':'#0F0F0F', fontWeight:isFut?500:400 }}>{m.fecha}</td>
                    <td style={{ padding:'8px 12px', color:isFut?'#3B82F6':BRAND, fontFamily:F, fontWeight:isFut?500:400 }}>{m.comprobante}</td>
                    <td style={{ padding:'8px 12px', color:isFut?'#3B82F6':BRAND, fontFamily:F, fontSize:11 }}>{m.documento}</td>
                    <td style={{ padding:'8px 12px', maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:isFut?'#3B82F6':'#0F0F0F' }}>{m.descripcion}</td>
                    <td style={{ padding:'8px 12px', fontSize:11, color:C.n700 }}>{m.moneda}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right' }}>{m.debitos>0?fmt2(m.debitos):'0.00'}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right' }}>{m.creditos>0?fmt2(m.creditos):'0.00'}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:500, color:isFut?'#3B82F6':'#0F0F0F' }}>{fmt2(m.importeCRC)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop:`2px solid ${C.n500}`, background:'#FAFAFA' }}>
                <td colSpan={6} style={{ padding:'10px 14px', textAlign:'right', fontWeight:600, fontSize:12, fontFamily:F }}>Totalizado</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700, fontSize:12, fontFamily:F }}>{fmt2(movs.reduce((s,m)=>s+m.debitos,0))}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700, fontSize:12, fontFamily:F }}>{fmt2(movs.reduce((s,m)=>s+m.creditos,0))}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700, fontSize:12, fontFamily:F }}>{fmt2(movs.reduce((s,m)=>s+m.importeCRC,0))}</td>
              </tr>
            </tfoot>
          </table>
          </div>

          {/* Leyenda - flexShrink:0, siempre visible debajo del área con scroll */}
          {!cerrada && (
            <div style={{ padding:'10px 24px', borderTop:`1px solid ${C.n500}`, display:'flex', gap:20, fontSize:11, color:C.n700, fontFamily:F, flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>{ESTADO_MOV_ICON['Conciliado']}<span>Conciliado</span></div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>{ESTADO_MOV_ICON['Futuro']}<span>Conciliado en período futuro (no editable)</span></div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>{ESTADO_MOV_ICON['Pendiente']}<span>Pendiente</span></div>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {showImportar && <ImportarArchivoModal con={con} onClose={()=>setShowImportar(false)} onImportar={importar}/>}
      {showCerrar   && <CerrarConciliacionModal con={con} onClose={()=>setShowCerrar(false)} onCerrar={cerrarConciliacion}/>}
      {showCorte    && <CorteSaldoModal con={con} onClose={()=>setShowCorte(false)} onAplicar={aplicarCorte}/>}
      {showVista    && <VistaPreviaModal con={con} onClose={()=>setShowVista(false)}/>}
      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}
    </div>
  );
}

// ── Main: Lista ───────────────────────────────────────────────────────────────
export default function ConciliacionBancaria() {
  const [cons, setCons]     = useState<Conciliacion[]>(CONCILIACIONES_INIT);
  const [selectedId, setSelectedId] = useState<number|null>(null);
  const [showNueva, setShowNueva] = useState(false);
  const [showExportar, setShowExportar] = useState(false);
  const [vistaPreviaFor, setVistaPreviaFor] = useState<Conciliacion|null>(null);
  const [searchQ, setSearch] = useState('');
  const [filtEstado, setFiltEstado] = useState<Set<string>>(new Set());
  const [filtCuenta, setFiltCuenta] = useState<Set<string>>(new Set());
  const [filtMoneda, setFiltMoneda] = useState<Set<string>>(new Set());
  const [filtUsuario, setFiltUsuario] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string|null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const selectedCon = cons.find(c=>c.id===selectedId) ?? null;

  function actualizar(id:number, patch:Partial<Conciliacion>){
    setCons(prev => prev.map(c => c.id===id ? { ...c, ...patch } : c));
  }

  if (selectedCon) {
    return (
      <DetalleConciliacion
        con={selectedCon}
        onBack={()=>setSelectedId(null)}
        onUpdate={patch=>actualizar(selectedCon.id, patch)}
        onCerrar={()=>{
          actualizar(selectedCon.id, { estado:'Cerrada', cerradaPor:USUARIO_ACTUAL, fechaCierre: fmtDate(new Date()) });
        }}
      />
    );
  }

  const filtered = cons.filter(c => {
    if (searchQ && !c.consecutivo.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (filtEstado.size > 0 && !filtEstado.has(c.estado)) return false;
    if (filtCuenta.size > 0 && !filtCuenta.has(c.cuentaBancaria)) return false;
    if (filtMoneda.size > 0 && !filtMoneda.has(c.moneda)) return false;
    if (filtUsuario.size > 0 && !filtUsuario.has(c.usuario)) return false;
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const paginated = filtered.slice((paginaActual-1)*pageSize, paginaActual*pageSize);

  const totalBancoCRC  = filtered.filter(c=>c.moneda!=='USD').reduce((s,c)=>s+c.saldoBanco,0);
  const totalBancoUSD  = filtered.filter(c=>c.moneda==='USD').reduce((s,c)=>s+c.saldoBanco,0);
  const totalLibrosCRC = filtered.filter(c=>c.moneda!=='USD').reduce((s,c)=>s+c.saldoLibros,0);
  const totalLibrosUSD = filtered.filter(c=>c.moneda==='USD').reduce((s,c)=>s+c.saldoLibros,0);

  const IcEdit  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>;
  const IcPrint = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2h8v4"/><rect x="1" y="6" width="14" height="6" rx="1.5"/><path d="M4 9v5h8V9"/></svg>;

  function crearConciliacion(data:{cuenta:string;moneda:'CRC'|'USD';desde:string;hasta:string;saldo:number}){
    const nums = cons.map(c=>parseInt(c.consecutivo.replace('CON-',''))||0);
    const next = Math.max(0,...nums) + 1;
    const fromIso = (iso:string) => { const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?`${m[3]}/${m[2]}/${m[1].slice(2)}`:iso; };
    const nueva: Conciliacion = {
      id: Date.now(), consecutivo:`CON-${String(next).padStart(3,'0')}`, estado:'Sin saldo',
      cuentaBancaria: data.cuenta, cuentaCode: data.moneda==='USD'?'12002004':'10020001', moneda: data.moneda,
      desde: fromIso(data.desde), hasta: fromIso(data.hasta), saldoBanco:data.saldo, saldoLibros:0, diferencia:0,
      saldoInicial:0, usuario:USUARIO_ACTUAL, movimientos:[],
    };
    setCons(p=>[nueva,...p]);
    setToast(`Conciliación ${nueva.consecutivo} creada`);
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>
      <PageHeader title="Conciliaciones bancarias">
        <BotonExportarUnico onClick={()=>setShowExportar(true)}/>
        <button onClick={()=>setShowNueva(true)} style={{ height:34, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
          + Nueva conciliación
        </button>
      </PageHeader>

      {/* Toolbar */}
      <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
        <SearchInput value={searchQ} onChange={setSearch} placeholder="Buscar por consecutivo…" width={220} />
        <FilterDropdown label="Estado" options={['En proceso','Sin saldo','Cerrada']} selected={filtEstado} onApply={setFiltEstado} onClear={()=>setFiltEstado(new Set())}/>
        <FilterDropdown label="Cuenta bancaria" options={[...new Set(cons.map(c=>c.cuentaBancaria))]} selected={filtCuenta} onApply={setFiltCuenta} onClear={()=>setFiltCuenta(new Set())}/>
        <FilterDropdown label="Moneda" options={['CRC','USD']} selected={filtMoneda} onApply={setFiltMoneda} onClear={()=>setFiltMoneda(new Set())}/>
        <FilterDropdown label="Usuario" options={['jperez','sblandon','yader']} selected={filtUsuario} onApply={setFiltUsuario} onClear={()=>setFiltUsuario(new Set())}/>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto', background:'#fff', padding:`0 ${PAGE_PAD-12}px` }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
          <thead style={{ position:'sticky', top:0, background:'#fff', zIndex:2 }}>
            <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
              {['Consecutivo','Estado','Cuenta bancaria','Desde','Hasta','Moneda'].map(h=>(
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
              ))}
              <MoneyHeaderCells label="Saldo banco"/>
              <MoneyHeaderCells label="Saldo libros"/>
              <MoneyHeaderCells label="Diferencia"/>
              {['Usuario','Acciones'].map(h=>(
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map(c => {
              const [stC,stB] = ESTADO_CON_STYLE[c.estado];
              const difColor = c.diferencia === 0 ? C.success : C.error;
              const s = sym(c.moneda);
              return (
                <tr key={c.id} onClick={()=>setSelectedId(c.id)} style={{ borderBottom:`1px solid #F5F5F5`, cursor:'pointer' }}
                  onMouseEnter={e=>(e.currentTarget.style.background=C.n200)}
                  onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                  <td style={{ padding:'10px 12px' }}><span style={{ color:BRAND, fontFamily:F, fontWeight:600, textDecoration:'underline' }}>{c.consecutivo}</span></td>
                  <td style={{ padding:'10px 12px' }}><Pill color={stC} bg={stB}>{c.estado}</Pill></td>
                  <td style={{ padding:'10px 12px', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={`${c.cuentaCode} ${c.cuentaBancaria}`}>{c.cuentaCode} {c.cuentaBancaria}</td>
                  <td style={{ padding:'10px 12px', color:C.n700 }}>{c.desde}</td>
                  <td style={{ padding:'10px 12px', color:C.n700 }}>{c.hasta}</td>
                  <td style={{ padding:'10px 12px' }}><span style={{ fontSize:10, padding:'2px 7px', background:C.n200, borderRadius:4 }}>{c.moneda} {s}</span></td>
                  <MoneyCells sym={s} value={c.saldoBanco > 0 ? fmt2(c.saldoBanco) : '-'}/>
                  <MoneyCells sym={s} value={c.saldoLibros > 0 ? fmt2(c.saldoLibros) : '-'}/>
                  <MoneyCells sym={s} value={c.saldoBanco > 0 ? fmt2(c.diferencia) : '-'} color={c.saldoBanco>0?difColor:undefined}/>
                  <td style={{ padding:'10px 12px', color:C.n700, fontSize:11 }}>{c.usuario}</td>
                  <td onClick={e=>e.stopPropagation()} style={{ padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      <button title="Abrir" onClick={()=>setSelectedId(c.id)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }} onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='none')}><IcEdit/></button>
                      <button title="Vista previa / imprimir" onClick={()=>setVistaPreviaFor(c)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }} onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='none')}><IcPrint/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {/* Totales */}
            <tr style={{ background:'#FAFAFA', borderTop:`2px solid ${C.n500}` }}>
              <td colSpan={6} style={{ padding:'10px 14px' }}/>
              <MoneyCellsStack bold rows={[
                ...(totalBancoCRC>0 ? [{sym:'₡', value:fmt2(totalBancoCRC)}] : []),
                ...(totalBancoUSD>0 ? [{sym:'$', value:fmt2(totalBancoUSD)}] : []),
              ]}/>
              <MoneyCellsStack bold rows={[
                ...(totalLibrosCRC>0 ? [{sym:'₡', value:fmt2(totalLibrosCRC)}] : []),
                ...(totalLibrosUSD>0 ? [{sym:'$', value:fmt2(totalLibrosUSD)}] : []),
              ]}/>
              <td colSpan={2}/>
              <td colSpan={2}/>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ background:'#fff', borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0 }}>
        <Pagination page={paginaActual} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      {showNueva && <NuevaConciliacionModal onClose={()=>setShowNueva(false)} onCreate={crearConciliacion} />}
      {vistaPreviaFor && <VistaPreviaModal con={vistaPreviaFor} onClose={()=>setVistaPreviaFor(null)}/>}
      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}
      {showExportar && (
        <ExportListModal
          title="Conciliaciones bancarias"
          subtitulo={`${filtered.length} conciliación${filtered.length===1?'':'es'}`}
          filename="conciliaciones-bancarias"
          columns={[
            { key:'consecutivo', label:'Consecutivo' }, { key:'cuenta', label:'Cuenta bancaria' }, { key:'periodo', label:'Período' },
            { key:'saldoBanco', label:'Saldo banco', align:'right' }, { key:'saldoLibros', label:'Saldo libros', align:'right' },
            { key:'diferencia', label:'Diferencia', align:'right' }, { key:'estado', label:'Estado' },
          ]}
          rows={filtered.map(c=>({
            consecutivo:c.consecutivo, cuenta:c.cuentaBancaria, periodo:`${c.desde} – ${c.hasta}`,
            saldoBanco:`${c.moneda==='USD'?'$':'₡'} ${fmtNum(c.saldoBanco,2)}`,
            saldoLibros:`${c.moneda==='USD'?'$':'₡'} ${fmtNum(c.saldoLibros,2)}`,
            diferencia:`${c.moneda==='USD'?'$':'₡'} ${fmtNum(c.diferencia,2)}`, estado:c.estado,
          }))}
          onClose={()=>setShowExportar(false)}
        />
      )}
    </div>
  );
}
