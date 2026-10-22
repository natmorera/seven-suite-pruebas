'use client';
import ComprobanteOperacionModal from '@/components/ui/documento/ComprobanteOperacion';
import { armarComprobantes } from '@/components/ui/documento/comprobantes';
import { useEmpresaDoc } from '@/components/ui/documento/useEmpresaDoc';
import { useState, useRef, useEffect } from 'react';
import DetalleDrawer from '../asientos/DetalleDrawer';
import { C, Toast, USUARIO_ACTUAL, Pagination, fmtNum, BotonExportarUnico, ExportListModal, PAGE_PAD, MoneyHeaderCells, MoneyCells, MoneyCellsStack, PresenciaOperacion, FONT, radius, shadow, PageHeader, SearchInput, FilterDropdown } from '../../ui/primitives';
import { nombreMonedaLocal, simboloLocal } from '@/lib/paisActual';

const F = FONT;

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
        style={{height:32,padding:'0 12px',border:`1px solid ${active?BRAND:'#E0E0E0'}`,borderRadius:radius.md,background:active?C.brandBg:'#fff',cursor:'pointer',fontSize:12,fontFamily:F,color:active?BRAND:'#555',display:'flex',alignItems:'center',gap:6}}>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="1.5" y="2" width="11" height="11" rx="2"/><path d="M5 1v2M9 1v2M1.5 5.5h11"/></svg>
        Fechas{active?` (${[desde,hasta].filter(Boolean).length})`:''}
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

// ── Modal: Nueva transferencia ─────────────────────────────────────────────────
const BRAND = '#A77600';
const RED = '#F44336';

function fmtN(n: number, dec=2): string {
  return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits:dec, maximumFractionDigits:dec });
}

type Estado = 'Pendiente'|'Emitido'|'Generado'|'Contabilizado'|'Anulado';

const EST_STYLE: Record<Estado,{bg:string;color:string;border:string}> = {
  Pendiente:     { bg:'#FFF8EC', color:BRAND,     border:'#EED89A' },
  Emitido:       { bg:'#E6F1FB', color:'#185FA5', border:'#B5D4F4' },
  Generado:      { bg:'#E8F5E9', color:'#2E7D32', border:'#A5D6A7' },
  Contabilizado: { bg:'#E3F2FD', color:'#1565C0', border:'#90CAF9' },
  Anulado:       { bg:C.errorBg, color:'#B71C1C', border:`${C.errorBorder}` },
};

interface Retencion { tipo:string; imp:number; }

interface Cheque {
  id:string; estado:Estado; consec:string; chequeNro:string|null;
  proveedor:string; cuenta:string; fecha:string; nroAsiento:string|null;
  moneda:'CRC'|'USD'; importe:number; usuario:string;
  totalDoc:number; retencion:number; retenciones:Retencion[];
  banco:string;
}

const MOCK: Cheque[] = [
  { id:'c1',estado:'Pendiente',    consec:'3635',chequeNro:null,       proveedor:'Materiales Occidente...',  cuenta:'100-001-0001-0001',fecha:'02/06/26',nroAsiento:null,      moneda:'CRC',importe:100000,usuario:'jperez',   totalDoc:100000,retencion:0,    retenciones:[], banco:'Banpro CRC'},
  { id:'c2',estado:'Emitido',      consec:'3634',chequeNro:'CK-124',   proveedor:'Ferretero Monteverd...',   cuenta:'100-001-0001-0003',fecha:'01/06/26',nroAsiento:'GP-5520', moneda:'CRC',importe:350000,usuario:'sblandon', totalDoc:350000,retencion:0,    retenciones:[], banco:'BAC CRC'},
  { id:'c3',estado:'Contabilizado',consec:'3633',chequeNro:'CK-125',   proveedor:'Ferretero Monteverd...',   cuenta:'100-001-0001-0004', fecha:'30/05/26',nroAsiento:'GP-5510', moneda:'CRC',importe:100000,usuario:'sblandon', totalDoc:100000,retencion:0,    retenciones:[], banco:'BAC CRC'},
  { id:'c4',estado:'Contabilizado',   consec:'3632',chequeNro:'CK-123',   proveedor:'Insumos del Norte Ltda.', cuenta:'100-001-0001-0002',fecha:'28/05/26',nroAsiento:'GP-5500', moneda:'CRC',importe:820000,usuario:'sblandon', totalDoc:820000,retencion:8200, retenciones:[{tipo:'01 - Retención 2% Compras/Servicios',imp:8200}], banco:'BNCR'},
  { id:'c5',estado:'Anulado',      consec:'3631',chequeNro:'CK-122',   proveedor:'Proveedor General CR S.A.',cuenta:'100-001-0001-0001',fecha:'25/05/26',nroAsiento:null,     moneda:'CRC',importe:0,    usuario:'jperez',   totalDoc:280000,retencion:0,    retenciones:[], banco:'BAC CRC'},
];

// ── Shared modal shell ────────────────────────────────────────────────────────
function ModalShell({ title, subtitle, onClose, children, footer, width=520, presencia }:{
  title:string; subtitle?:string; onClose:()=>void;
  children:React.ReactNode; footer?:React.ReactNode; width?:number; presencia?:boolean;
}) {
  useEffect(()=>{
    function esc(e:KeyboardEvent){if (e.key === 'Escape') { e.preventDefault(); onClose(); }}
    document.addEventListener('keydown',esc);
    return ()=>document.removeEventListener('keydown',esc);
  },[onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose}
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:500,
      display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff',borderRadius:radius.lg,width,maxWidth:'95vw',maxHeight:'92vh',
        display:'flex',flexDirection:'column',boxShadow:shadow.modal,overflow:'hidden',fontFamily:F }}>
        <div style={{ padding:'16px 20px',borderBottom:'1px solid #EBEBEB',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0 }}>
          <div>
            <p style={{ fontSize:14,fontWeight:600,color:'#0F0F0F',margin:0,fontFamily:F }}>{title}</p>
            {subtitle && <p style={{ fontSize:11,color:'#9E9E9E',margin:'2px 0 0',fontFamily:F }}>{subtitle}</p>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            {presencia && <PresenciaOperacion/>}
            <button onClick={onClose} aria-label="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',color:'#9E9E9E',fontSize:20,lineHeight:1,padding:'0 2px' }}>×</button>
          </div>
        </div>
        <div style={{ flex:1,overflowY:'auto' }}>{children}</div>
        {footer && <div style={{ padding:'12px 20px',borderTop:'1px solid #EBEBEB',flexShrink:0 }}>{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, required, children }:{ label:string; required?:boolean; children:React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize:11,fontWeight:500,color:'#555',margin:'0 0 5px',fontFamily:F }}>
        {label}{required&&<span style={{ color:RED }}> *</span>}
      </p>
      {children}
    </div>
  );
}

const inputStyle = (active=false): React.CSSProperties => ({
  width:'100%', height:34, padding:'0 10px',
  border:`1px solid ${active?BRAND:'#E0E0E0'}`,
  borderRadius:7, fontSize:12, fontFamily:F, outline:'none',
  color:'#0F0F0F', background:'#fff', boxSizing:'border-box',
});

const selectStyle: React.CSSProperties = {
  width:'100%', height:34, padding:'0 28px 0 10px',
  border:'1px solid #E0E0E0', borderRadius:7, fontSize:12, fontFamily:F,
  outline:'none', appearance:'none', background:'#fff', color:'#0F0F0F', cursor:'pointer',
};

function ChevronSelect() {
  return <svg style={{ position:'absolute',right:9,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }}
    width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#9E9E9E" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>;
}

const BANCOS_CTA = ['11020101 - Banpro Cta$ 1001000200','100-002-0001 - BAC CRC','100-003-0001 - BNCR CRC'];

// ── Modal Generar / Editar cheque ─────────────────────────────────────────────
function ModalGenerarCheque({ cheque, onClose, onSave }:{ cheque?:Cheque; onClose:()=>void; onSave:(c:Cheque)=>void }) {
  const [beneficiario, setBeneficiario] = useState(cheque?.proveedor??'');
  const [obs, setObs] = useState('Pago de facturas varias.');
  const [noNeg, setNoNeg] = useState(false);
  const [showBuscar, setShowBuscar] = useState(false);
  const [showRet, setShowRet] = useState(false);
  const [fecha, setFecha] = useState(cheque?.fecha ? toIsoFromDDMMYY(cheque.fecha) : '');
  const [banco, setBanco] = useState(cheque ? (BANCOS_CTA.find(b=>b.includes(cheque.banco.split(' ')[0]))??BANCOS_CTA[0]) : BANCOS_CTA[0]);
  const [cuenta, setCuenta] = useState(cheque?.cuenta ?? '');
  const [retenciones, setRetenciones] = useState<Retencion[]>(cheque?.retenciones ?? []);
  const [errores, setErrores] = useState<Record<string,boolean>>({});
  const [toast, setToast] = useState<string|null>(null);

  const [facturas, setFacturas] = useState(()=> cheque
    ? [{ id:'f1', factura:'FE'+cheque.consec.padStart(7,'0'), fecha:cheque.fecha, monto:cheque.totalDoc, selected:true }]
    : [{ id:'f1', factura:'FE0000011', fecha:'28/04/2026', monto:12797.72, selected:true }]
  );

  const totalDoc = facturas.filter(f=>f.selected).reduce((s,f)=>s+f.monto,0);
  const retTotal = retenciones.reduce((s,r)=>s+r.imp,0);
  const totalCheque = totalDoc - retTotal;

  function toggleSel(id:string){ setFacturas(p=>p.map(f=>f.id===id?{...f,selected:!f.selected}:f)); }
  function eliminarSeleccionadas(){
    const quedan = facturas.filter(f=>!f.selected);
    if(quedan.length===facturas.length){ setToast('Selecciona al menos una factura para eliminar'); return; }
    setFacturas(quedan);
  }
  function adicionar(){
    const n = facturas.length+1;
    setFacturas(p=>[...p, { id:'f'+n, factura:'FE'+String(11+n).padStart(7,'0'), fecha:'-', monto:0, selected:true }]);
  }

  function validar(): boolean {
    const errs: Record<string,boolean> = {};
    if(!fecha) errs.fecha = true;
    if(!cuenta.trim()) errs.cuenta = true;
    if(!beneficiario.trim()) errs.beneficiario = true;
    setErrores(errs);
    return Object.keys(errs).length===0;
  }

  function aplicar(){
    if(!validar()){ setToast('Completa los campos requeridos antes de continuar'); return; }
    const nuevo: Cheque = {
      id: cheque?.id ?? 'c'+Date.now(),
      estado: cheque?.estado ?? 'Pendiente',
      consec: cheque?.consec ?? String(3636),
      chequeNro: cheque?.chequeNro ?? null,
      proveedor: beneficiario,
      cuenta,
      fecha: fromIsoToDDMMYY(fecha),
      nroAsiento: cheque?.nroAsiento ?? null,
      moneda: cheque?.moneda ?? 'CRC',
      importe: totalCheque,
      usuario: cheque?.usuario ?? USUARIO_ACTUAL,
      totalDoc,
      retencion: retTotal,
      retenciones,
      banco: banco.split(' - ')[1] ?? banco,
    };
    onSave(nuevo);
  }

  const footer = (
    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
      <button onClick={onClose} style={{ height:34,padding:'0 16px',border:'none',borderRadius:7,background:'none',cursor:'pointer',fontSize:12,fontFamily:F,color:RED }}>Descartar</button>
      <button onClick={aplicar} style={{ height:34,padding:'0 18px',border:'none',borderRadius:7,background:BRAND,color:'#fff',cursor:'pointer',fontSize:13,fontFamily:F,fontWeight:500 }}>Aplicar operación</button>
    </div>
  );

  return (
    <>
    <ModalShell title="Cheques Bancarios de Compra" onClose={onClose} width={780} footer={footer} presencia>
      <div style={{ padding:20,display:'flex',flexDirection:'column',gap:14 }}>
        {/* Fila 1 */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',gap:10 }}>
          <Field label="Consecutivo"><input readOnly value={cheque?.consec ?? '3636'} style={{ ...inputStyle(),background:'#F8F8F8' }}/></Field>
          <Field label="Cheque nro."><input readOnly value={cheque?.chequeNro ?? '0'} style={{ ...inputStyle(),background:'#F8F8F8',color:'#9E9E9E' }}/></Field>
          <Field label="Fecha de emisión" required>
            <div style={{ position:'relative' }}>
              <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={{ ...inputStyle(!!errores.fecha||true), paddingRight:30, borderColor:errores.fecha?RED:BRAND }}/>
            </div>
          </Field>
          <Field label="Moneda">
            <div style={{ position:'relative' }}>
              <select style={selectStyle}><option>$ - Dólares</option><option>{simboloLocal()} - {nombreMonedaLocal(true)}</option></select>
              <ChevronSelect/>
            </div>
          </Field>
          <Field label="Tasa"><input defaultValue="1.00000000" style={inputStyle()}/></Field>
        </div>
        {/* Fila 2 */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10 }}>
          <Field label="Banco">
            <div style={{ position:'relative' }}>
              <select value={banco} onChange={e=>setBanco(e.target.value)} style={selectStyle}>
                {BANCOS_CTA.map(b=><option key={b} value={b}>{b}</option>)}
              </select><ChevronSelect/>
            </div>
          </Field>
          <Field label="Cuenta" required>
            <div style={{ display:'flex',alignItems:'center',gap:6 }}>
              <div style={{ width:12,height:12,borderRadius:'50%',background:cuenta?BRAND:'#9E9E9E',flexShrink:0 }}/>
              <input value={cuenta} onChange={e=>setCuenta(e.target.value)} placeholder="Número de cuenta"
                style={{ ...inputStyle(),flex:1, borderColor:errores.cuenta?RED:'#E0E0E0' }}/>
            </div>
          </Field>
          <Field label="Flujo de caja (opcional)"><input defaultValue="Ingresar" style={inputStyle()}/></Field>
        </div>
        {/* Beneficiario */}
        <Field label="Beneficiario" required>
          <div style={{ display:'flex',gap:8 }}>
            <input value={beneficiario} onChange={e=>setBeneficiario(e.target.value)} style={{ ...inputStyle(),flex:1, borderColor:errores.beneficiario?RED:'#E0E0E0' }}/>
            <button onClick={()=>setShowBuscar(true)}
              style={{ height:34,padding:'0 12px',border:'1px solid #E0E0E0',borderRadius:7,background:'#fff',cursor:'pointer',fontSize:12,fontFamily:F,color:'#555',whiteSpace:'nowrap' }}>
              Buscar cuenta
            </button>
          </div>
        </Field>
        {/* Leyenda */}
        <label style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:12,fontFamily:F,color:'#333' }}>
          <div onClick={()=>setNoNeg(v=>!v)} style={{ width:14,height:14,borderRadius:3,border:`1.5px solid ${noNeg?BRAND:'#CCC'}`,
            background:noNeg?BRAND:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            {noNeg&&<svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
          </div>
          Leyenda No Negociable
        </label>
        {/* Observaciones */}
        <Field label="Observaciones">
          <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={2}
            style={{ width:'100%',padding:'7px 10px',border:'1px solid #E0E0E0',borderRadius:7,fontSize:12,fontFamily:F,resize:'vertical',outline:'none',boxSizing:'border-box' }}/>
        </Field>
        {/* Facturas */}
        <div>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
            <span style={{ fontSize:12,fontWeight:600,color:'#0F0F0F',fontFamily:F }}>Facturas a pagar</span>
            <div style={{ display:'flex',gap:6 }}>
              <button onClick={eliminarSeleccionadas} style={{ height:28,padding:'0 10px',border:`1px solid #E0E0E0`,borderRadius:radius.sm,background:'#fff',cursor:'pointer',fontSize:11,fontFamily:F,color:RED }}>Eliminar</button>
              <button onClick={adicionar} style={{ height:28,padding:'0 10px',border:`1px solid #E0E0E0`,borderRadius:radius.sm,background:'#fff',cursor:'pointer',fontSize:11,fontFamily:F,color:'#555' }}>Adicionar</button>
              <button onClick={()=>setShowRet(true)} style={{ height:28,padding:'0 10px',border:`1px solid #E0E0E0`,borderRadius:radius.sm,background:'#fff',cursor:'pointer',fontSize:11,fontFamily:F,color:BRAND }}>Retención{retTotal>0?` (${simboloLocal()} ${fmtN(retTotal)})`:''}</button>
              <button onClick={()=>setToast('Selección de facturas confirmada')} style={{ height:28,padding:'0 12px',border:'none',borderRadius:radius.sm,background:BRAND,color:'#fff',cursor:'pointer',fontSize:11,fontFamily:F,fontWeight:500 }}>Aceptar</button>
            </div>
          </div>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:11,fontFamily:F }}>
            <thead>
              <tr style={{ background:'#F8F8F8',borderBottom:'1px solid #EBEBEB' }}>
                <th style={{ width:28,padding:'7px 10px' }}></th>
                {['Factura','Fecha','Imp. inicial','Imp. pendiente','Imp. a pagar'].map((h)=>(
                  <th key={h} style={{ padding:'7px 10px',textAlign:'left',fontWeight:500,color:'#888' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facturas.map(f=>(
                <tr key={f.id} style={{ background:f.selected?'#FFF8EC':'#fff',borderBottom:'1px solid #F0F0F0' }}>
                  <td style={{ padding:'8px 10px' }}>
                    <div onClick={()=>toggleSel(f.id)} style={{ cursor:'pointer', width:14,height:14,borderRadius:3,border:`2px solid ${BRAND}`,background:f.selected?BRAND:'#fff',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      {f.selected&&<svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                    </div>
                  </td>
                  <td style={{ padding:'8px 10px',color:BRAND,fontWeight:500 }}>{f.factura}</td>
                  <td style={{ padding:'8px 10px',color:'#555' }}>{f.fecha}</td>
                  <td style={{ padding:'8px 10px',textAlign:'right',fontVariantNumeric:'tabular-nums' }}>{simboloLocal()} {fmtN(f.monto)}</td>
                  <td style={{ padding:'8px 10px',textAlign:'right',fontVariantNumeric:'tabular-nums' }}>{simboloLocal()} {fmtN(f.monto)}</td>
                  <td style={{ padding:'8px 10px',textAlign:'right',fontVariantNumeric:'tabular-nums',fontWeight:500 }}>{simboloLocal()} {fmtN(f.selected?f.monto:0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Totales */}
          <div style={{ display:'flex',justifyContent:'flex-end',gap:24,padding:'10px 10px 0',fontSize:12,fontFamily:F }}>
            <span style={{ color:'#555' }}>Total documento <strong style={{ color:'#0F0F0F' }}>{simboloLocal()} {fmtN(totalDoc)}</strong></span>
            <span style={{ color:'#555' }}>Retención <strong style={{ color:RED }}>{simboloLocal()} {fmtN(retTotal)}</strong></span>
            <span style={{ color:'#555' }}>Total cheque <strong style={{ color:BRAND }}>{simboloLocal()} {fmtN(totalCheque)}</strong></span>
          </div>
        </div>
      </div>
    </ModalShell>
    {showBuscar && <ModalBuscarCuenta onClose={()=>setShowBuscar(false)} onSelect={v=>{setBeneficiario(v);setShowBuscar(false);}}/>}
    {showRet && cheque && (
      <ModalRetencionesEditor cheque={{...cheque, retenciones}} onClose={()=>setShowRet(false)} onSave={r=>{setRetenciones(r);setShowRet(false);}}/>
    )}
    {showRet && !cheque && (
      <ModalRetencionesEditor cheque={{ id:'new',estado:'Pendiente',consec:'3636',chequeNro:null,proveedor:beneficiario,cuenta,fecha:'',nroAsiento:null,moneda:'CRC',importe:0,usuario:'jperez',totalDoc,retencion:retTotal,retenciones,banco } as Cheque}
        onClose={()=>setShowRet(false)} onSave={r=>{setRetenciones(r);setShowRet(false);}}/>
    )}
    {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}
    </>
  );
}

function toIsoFromDDMMYY(s:string): string {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if(!m) return '';
  const [,d,mo,y] = m;
  return `20${y}-${mo}-${d}`;
}
function fromIsoToDDMMYY(s:string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return s;
  const [,y,mo,d] = m;
  return `${d}/${mo}/${y.slice(2)}`;
}

// ── Modal Buscar cuenta ────────────────────────────────────────────────────────
function ModalBuscarCuenta({ onClose, onSelect }:{ onClose:()=>void; onSelect:(v:string)=>void }) {
  const [busq, setBusq] = useState('');
  const [sel, setSel] = useState('2001001000');
  const cuentas = [
    { codigo:'2001001000', cc:'-', titulo:'Compañía Licorera de Nicaragua (CLN)', mon:simboloLocal(), saldo:12797.72 },
    { codigo:'2001002000', cc:'-', titulo:'Optima Industrial S.A.',               mon:simboloLocal(), saldo:0 },
    { codigo:'2001003000', cc:'-', titulo:'FEMSA S.A.',                            mon:simboloLocal(), saldo:0 },
    { codigo:'2001004000', cc:'-', titulo:'Cristopher Martínez',                  mon:simboloLocal(), saldo:2939.50 },
    { codigo:'2001005000', cc:'-', titulo:'Molinos de Nicaragua S.A.',             mon:simboloLocal(), saldo:16008.00 },
  ];
  const filtradas = cuentas.filter(c=>
    !busq || c.titulo.toLowerCase().includes(busq.toLowerCase()) || c.codigo.includes(busq)
  );
  useEffect(()=>{
    function esc(e:KeyboardEvent){if (e.key === 'Escape') { e.preventDefault(); onClose(); }}
    document.addEventListener('keydown',esc);
    return ()=>document.removeEventListener('keydown',esc);
  },[onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Buscar cuenta" onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff',borderRadius:radius.lg,width:700,boxShadow:'0 16px 48px rgba(0,0,0,.25)',fontFamily:F,overflow:'hidden' }}>
        <div style={{ padding:'16px 20px',borderBottom:'1px solid #EBEBEB',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <span style={{ fontSize:14,fontWeight:600,color:'#0F0F0F',fontFamily:F }}>Buscar cuenta</span>
          <button onClick={onClose} aria-label="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',color:'#9E9E9E',fontSize:20 }}>×</button>
        </div>
        <div style={{ padding:'14px 20px 0' }}>
          <div style={{ display:'flex',gap:8,alignItems:'center',marginBottom:12 }}>
            <div style={{ position:'relative',flex:1 }}>
              <svg style={{ position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }} width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#9E9E9E" strokeWidth="1.4" strokeLinecap="round"><circle cx="6" cy="6" r="4"/><path d="M10.5 10.5L8.5 8.5"/></svg>
              <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="Título de cuenta, centro de cotos"
                style={{ width:'100%',height:34,paddingLeft:28,paddingRight:10,border:`1px solid ${BRAND}`,borderRadius:7,fontSize:12,fontFamily:F,outline:'none',boxSizing:'border-box' }}/>
            </div>
            <span style={{ fontSize:12,color:'#555',fontFamily:F,whiteSpace:'nowrap' }}>{filtradas.length} resultado{filtradas.length!==1?'s':''}</span>
          </div>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12,fontFamily:F }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #E8E8E8' }}>
                <th style={{ width:28 }}></th>
                {['Cuenta','C. Costo/Gasto','Título de cuenta','Moneda','Saldo al período'].map((h,i)=>(
                  <th key={h} style={{ padding:'8px 10px',textAlign:i>2?'right':'left',fontWeight:500,color:'#888',fontSize:11,fontFamily:F }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(c=>(
                <tr key={c.codigo} onClick={()=>setSel(c.codigo)}
                  style={{ borderBottom:'1px solid #F0F0F0',background:sel===c.codigo?'#FFF8EC':'#fff',cursor:'pointer' }}>
                  <td style={{ padding:'8px 10px' }}>
                    <div style={{ width:14,height:14,borderRadius:3,border:`1.5px solid ${sel===c.codigo?BRAND:'#CCC'}`,
                      background:sel===c.codigo?BRAND:'#fff',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      {sel===c.codigo&&<svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                    </div>
                  </td>
                  <td style={{ padding:'8px 10px',color:BRAND,fontWeight:500,fontFamily:F }}>{c.codigo}</td>
                  <td style={{ padding:'8px 10px',color:'#555',fontFamily:F }}>{c.cc}</td>
                  <td style={{ padding:'8px 10px',color:'#0F0F0F',fontFamily:F }}>{c.titulo}</td>
                  <td style={{ padding:'8px 10px',textAlign:'right',color:'#555',fontFamily:F }}>{c.mon}</td>
                  <td style={{ padding:'8px 10px',textAlign:'right',fontVariantNumeric:'tabular-nums',fontWeight:500,color:c.saldo>0?BRAND:'#9E9E9E',fontFamily:F }}>{c.saldo>0?fmtN(c.saldo):'0.00'}</td>
                </tr>
              ))}
              {filtradas.length===0 && (
                <tr><td colSpan={6} style={{ padding:24,textAlign:'center',color:'#BCBCBC',fontFamily:F }}>Sin coincidencias</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'12px 20px',borderTop:'1px solid #EBEBEB',display:'flex',justifyContent:'flex-end',gap:8 }}>
          <button onClick={onClose} style={{ height:32,padding:'0 16px',border:'1px solid #E0E0E0',borderRadius:7,background:'#fff',cursor:'pointer',fontSize:12,fontFamily:F,color:'#555' }}>Cerrar</button>
          <button onClick={()=>onSelect(cuentas.find(c=>c.codigo===sel)?.titulo??'')}
            style={{ height:32,padding:'0 16px',border:'none',borderRadius:7,background:BRAND,color:'#fff',cursor:'pointer',fontSize:12,fontFamily:F,fontWeight:500 }}>Seleccionar</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Emitir cheque ────────────────────────────────────────────────────────
function ModalEmitir({ cheque, onClose, onConfirm }:{ cheque:Cheque; onClose:()=>void; onConfirm:(id:string,chequeNro:string,nombre:string)=>void }) {
  const [nombre, setNombre] = useState(cheque.proveedor);
  const [error, setError] = useState(false);
  const importeNeto = cheque.totalDoc - cheque.retencion;
  return (
    <ModalShell title="Emitir e imprimir cheque" subtitle={`Consecutivo ${cheque.consec} · ${cheque.banco} ${cheque.cuenta}`} onClose={onClose} width={380}
      footer={<div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
        <button onClick={onClose} style={{ height:32,padding:'0 14px',border:'1px solid #E0E0E0',borderRadius:7,background:'#fff',cursor:'pointer',fontSize:12,fontFamily:F,color:'#555' }}>Cancelar</button>
        <button onClick={()=>{
          if(!nombre.trim()){setError(true);return;}
          const nro = 'CK-'+Math.floor(20000+Math.random()*9000);
          onConfirm(cheque.id, nro, nombre);
        }} style={{ height:32,padding:'0 16px',border:'none',borderRadius:7,background:'#2E7D32',color:'#fff',cursor:'pointer',fontSize:12,fontFamily:F,fontWeight:500 }}>Confirmar y contabilizar</button>
      </div>}>
      <div style={{ padding:20,display:'flex',flexDirection:'column',gap:14 }}>
        {/* Resumen */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10 }}>
          {[{l:'Consecutivo',v:cheque.consec},{l:'Número de cheque',v:cheque.chequeNro ?? 'Se asignará al confirmar'},{l:'Importe',v:`${simboloLocal()} ${fmtN(importeNeto)}`}].map(({l,v})=>(
            <div key={l}>
              <p style={{ fontSize:10,color:'#9E9E9E',margin:'0 0 3px',fontFamily:F }}>{l}</p>
              <p style={{ fontSize:13,fontWeight:600,color:l==='Importe'?BRAND:'#0F0F0F',margin:0,fontFamily:F }}>{v}</p>
            </div>
          ))}
        </div>
        {/* Nombre */}
        <Field label="Nombre en el cheque" required>
          <input value={nombre} onChange={e=>{setNombre(e.target.value);setError(false);}} style={{...inputStyle(true), borderColor:error?RED:BRAND}}/>
          <p style={{ fontSize:10,color:'#9E9E9E',margin:'4px 0 0',fontFamily:F }}>Puede editarlo solo para efectos del formato impreso, sin modificar el proveedor del sistema.</p>
        </Field>
        {/* Leyenda */}
        <label style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,fontFamily:F,cursor:'pointer' }}>
          <div style={{ width:14,height:14,borderRadius:3,border:`2px solid ${BRAND}`,background:BRAND,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <span>Leyenda “No Negociable” <strong>se imprimirá en el cheque</strong></span>
        </label>
        {/* Impresora */}
        <Field label="Impresora">
          <p style={{ fontSize:13,fontWeight:500,color:'#0F0F0F',margin:'0 0 3px',fontFamily:F }}>Impresora Cheques - Recepción (HP LaserJet Pro)</p>
          <p style={{ fontSize:10,color:'#9E9E9E',margin:0,fontFamily:F }}>Al confirmar, el sistema enviará el cheque directamente a la impresora. El número de cheque se asignará en ese momento.</p>
        </Field>
      </div>
    </ModalShell>
  );
}

// ── Modal Anular cheque ────────────────────────────────────────────────────────
function ModalAnular({ cheque, onClose, onConfirm }:{ cheque:Cheque; onClose:()=>void; onConfirm:(id:string)=>void }) {
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0,10));
  const [errores, setErrores] = useState<{motivo?:boolean;fecha?:boolean}>({});
  const importeNeto = cheque.totalDoc - cheque.retencion;
  const numeroRef = cheque.chequeNro ?? cheque.consec;
  return (
    <ModalShell title="Anular cheque" subtitle="Esta acción no se puede deshacer." onClose={onClose} width={460}
      footer={<div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
        <button onClick={onClose} style={{ height:32,padding:'0 14px',border:'1px solid #E0E0E0',borderRadius:7,background:'#fff',cursor:'pointer',fontSize:12,fontFamily:F,color:'#555' }}>Cancelar</button>
        <button onClick={()=>{
          const errs:{motivo?:boolean;fecha?:boolean} = {};
          if(!motivo.trim()) errs.motivo = true;
          if(!fecha) errs.fecha = true;
          setErrores(errs);
          if(Object.keys(errs).length>0) return;
          onConfirm(cheque.id);
        }} style={{ height:32,padding:'0 16px',border:'none',borderRadius:7,background:RED,color:'#fff',cursor:'pointer',fontSize:12,fontFamily:F,fontWeight:500 }}>Confirmar anulación</button>
      </div>}>
      <div style={{ padding:20,display:'flex',flexDirection:'column',gap:14 }}>
        {/* Datos */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10 }}>
          {[{l:'Consecutivo',v:cheque.consec},{l:'Número de cheque',v:numeroRef},{l:'Importe',v:`${simboloLocal()} ${fmtN(importeNeto)}`}].map(({l,v})=>(
            <div key={l}>
              <p style={{ fontSize:10,color:'#9E9E9E',margin:'0 0 3px',fontFamily:F }}>{l}</p>
              <p style={{ fontSize:13,fontWeight:600,color:l==='Importe'?BRAND:'#0F0F0F',margin:0,fontFamily:F }}>{v}</p>
            </div>
          ))}
        </div>
        <Field label="Proveedor"><input readOnly value={cheque.proveedor} style={{ ...inputStyle(),background:'#F8F8F8' }}/></Field>
        <Field label="Fecha de anulación" required>
          <div style={{ position:'relative' }}>
            <input type="date" value={fecha} onChange={e=>{setFecha(e.target.value);setErrores(p=>({...p,fecha:false}));}} style={{ ...inputStyle(true),paddingRight:30,borderColor:errores.fecha?RED:BRAND }}/>
          </div>
        </Field>
        <Field label="Motivo de anulación" required>
          <textarea value={motivo} onChange={e=>{setMotivo(e.target.value);setErrores(p=>({...p,motivo:false}));}} rows={3}
            placeholder="Describa el motivo..."
            style={{ width:'100%',padding:'8px 10px',border:`1px solid ${errores.motivo?RED:(motivo?BRAND:'#E0E0E0')}`,borderRadius:7,fontSize:12,fontFamily:F,resize:'vertical',outline:'none',boxSizing:'border-box' }}/>
          <p style={{ fontSize:10,color:'#9E9E9E',margin:'4px 0 0',fontFamily:F }}>Obligatorio. Quedará registrado en el historial del cheque.</p>
        </Field>
        {/* Efectos automáticos */}
        <div style={{ padding:'12px 14px',background:C.errorBg,border:`1px solid ${C.errorBorder}`,borderRadius:radius.md }}>
          <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:8 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={RED}><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3.5M7 9.5h.01" strokeLinecap="round"/></svg>
            <span style={{ fontSize:12,fontWeight:600,color:RED,fontFamily:F }}>Efectos automáticos al anular</span>
          </div>
          <ul style={{ margin:0,padding:'0 0 0 16px',fontSize:11,color:'#991B1B',fontFamily:F,lineHeight:1.7 }}>
            <li>El número <strong>{numeroRef}</strong> quedará inutilizable de forma permanente.</li>
            <li>Las facturas asociadas quedarán disponibles para otra operación.</li>
            <li>Si el cheque estaba contabilizado, el asiento se revertirá automáticamente.</li>
          </ul>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalRetencionesEditor({ cheque, onClose, onSave }:{ cheque:Cheque; onClose:()=>void; onSave:(r:Retencion[])=>void }) {
  const [rows, setRows] = useState<Retencion[]>(cheque.retenciones);
  const [nuevoImp, setNuevoImp] = useState('');
  const total = rows.reduce((s,r)=>s+r.imp,0);

  function agregar(){
    const v = parseFloat(nuevoImp);
    if(!v || v<=0) return;
    setRows(p=>[...p,{ tipo:'01 - Retención 2% Compras/Servicios', imp:v }]);
    setNuevoImp('');
  }
  function quitar(i:number){ setRows(p=>p.filter((_,idx)=>idx!==i)); }

  return (
    <ModalShell title="Retenciones" subtitle={`Consecutivo ${cheque.consec} | Total: ${simboloLocal()} ${fmtN(total)}`} onClose={onClose} width={460}
      footer={<div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
        <button onClick={onClose} style={{ height:32,padding:'0 16px',border:'1px solid #E0E0E0',borderRadius:7,background:'#fff',cursor:'pointer',fontSize:12,fontFamily:F,color:'#555' }}>Cancelar</button>
        <button onClick={()=>onSave(rows)} style={{ height:32,padding:'0 16px',border:'none',borderRadius:7,background:BRAND,color:'#fff',cursor:'pointer',fontSize:12,fontFamily:F,fontWeight:500 }}>Guardar</button>
      </div>}>
      <div style={{ padding:20,display:'flex',flexDirection:'column',gap:12 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <span style={{ fontSize:12,fontWeight:500,color:'#0F0F0F',fontFamily:F }}>Retenciones aplicadas</span>
          <span style={{ fontSize:12,fontWeight:600,color:BRAND,fontFamily:F }}>Total: {simboloLocal()} {fmtN(total)}</span>
        </div>
        <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12,fontFamily:F }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #EBEBEB' }}>
              <th style={{ padding:'6px 10px',textAlign:'left',fontWeight:500,color:'#888',fontSize:11 }}>Tipo de retención</th>
              <th style={{ padding:'6px 10px',textAlign:'right',fontWeight:500,color:'#888',fontSize:11 }}>Importe</th>
              <th style={{ width:60 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} style={{ borderBottom:'1px solid #F0F0F0' }}>
                <td style={{ padding:'8px 10px',color:'#333',fontFamily:F }}>{r.tipo}</td>
                <td style={{ padding:'8px 10px',textAlign:'right',fontFamily:F }}>
                  <span style={{ fontVariantNumeric:'tabular-nums',fontWeight:500 }}>{simboloLocal()} {fmtN(r.imp)}</span>
                </td>
                <td style={{ padding:'8px 10px' }}>
                  <button onClick={()=>quitar(i)} style={{ width:24,height:24,border:`1px solid ${C.errorBorder}`,borderRadius:4,background:C.errorBg,cursor:'pointer',color:RED,fontSize:14 }}>×</button>
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ padding:'8px 10px',color:'#9E9E9E',fontFamily:F }}>01 - Retención 2% Compras/Servicios</td>
              <td style={{ padding:'8px 10px',textAlign:'right',fontFamily:F }}>
                <div style={{ display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end' }}>
                  <span style={{ color:'#9E9E9E',fontSize:11 }}>{simboloLocal()}</span>
                  <input value={nuevoImp} onChange={e=>setNuevoImp(e.target.value)} placeholder="0.00"
                    style={{ width:80,height:26,padding:'0 8px',border:'1px solid #E0E0E0',borderRadius:5,fontSize:12,fontFamily:F,textAlign:'right',outline:'none' }}/>
                </div>
              </td>
              <td style={{ padding:'8px 10px' }}>
                <button onClick={agregar} style={{ width:24,height:24,border:'none',borderRadius:4,background:'#E8F5E9',cursor:'pointer',color:'#2E7D32',fontSize:14 }}>✓</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}

// ── Modal Ver cheque (lectura) ──────────────────────────────────────────────────
function ModalVerCheque({ cheque, onClose, onVerRetencion }:{ cheque:Cheque; onClose:()=>void; onVerRetencion:()=>void }) {
  const importeNeto = cheque.totalDoc - cheque.retencion;
  const filas: [string,string][] = [
    ['Estado', cheque.estado],
    ['Consecutivo', cheque.consec],
    ['Número de cheque', cheque.chequeNro ?? '-'],
    ['Proveedor', cheque.proveedor],
    ['Banco / Cuenta', `${cheque.banco} · ${cheque.cuenta}`],
    ['Fecha', cheque.fecha],
    ['N° Asiento', cheque.nroAsiento ?? '-'],
    ['Total documento', `${simboloLocal()} ${fmtN(cheque.totalDoc)}`],
    ['Retención', `${simboloLocal()} ${fmtN(cheque.retencion)}`],
    ['Importe neto', `${simboloLocal()} ${fmtN(importeNeto)}`],
    ['Usuario', cheque.usuario],
  ];
  return (
    <ModalShell title="Detalle del cheque" subtitle={`Consecutivo ${cheque.consec}`} onClose={onClose} width={420}
      footer={<div style={{ display:'flex',justifyContent:'space-between',gap:8 }}>
        {cheque.retencion>0
          ? <button onClick={onVerRetencion} style={{ height:32,padding:'0 14px',border:'1px solid #E0E0E0',borderRadius:7,background:'#fff',cursor:'pointer',fontSize:12,fontFamily:F,color:BRAND }}>Ver detalle de retención</button>
          : <span/>}
        <button onClick={onClose} style={{ height:32,padding:'0 16px',border:'none',borderRadius:7,background:BRAND,color:'#fff',cursor:'pointer',fontSize:12,fontFamily:F,fontWeight:500 }}>Cerrar</button>
      </div>}>
      <div style={{ padding:20,display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
        {filas.map(([l,v])=>(
          <div key={l}>
            <p style={{ fontSize:10,color:'#9E9E9E',margin:'0 0 3px',fontFamily:F }}>{l}</p>
            <p style={{ fontSize:13,fontWeight:500,color:'#0F0F0F',margin:0,fontFamily:F }}>{v}</p>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

// ── Acción icons por estado ────────────────────────────────────────────────────
// Íconos de las acciones de cada cheque
const IcView = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 7C1 7 3.5 2.5 7 2.5S13 7 13 7 10.5 11.5 7 11.5 1 7 1 7z"/><circle cx="7" cy="7" r="2"/></svg>;
const IcPrint = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5V1.5h7V5M1.5 5h11v6h-11z"/></svg>;
const IcMail = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1.5" y="3.5" width="11" height="7" rx="1.5"/><path d="M1.5 3.5L7 7.5L12.5 3.5"/></svg>;
const IcStar = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.5l1.54 3.13L12 5.13l-2.5 2.44.59 3.43L7 9.38 4.91 11 5.5 7.57 3 5.13l3.46-.5z"/></svg>;
const IcCancel = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M9.5 4.5L4.5 9.5M4.5 4.5L9.5 9.5"/></svg>;

function AccionesRow({ ch, onEmitir, onAnular, onVer, onContabilizar, onPrint, onMail }:{
  ch:Cheque; onEmitir:()=>void; onAnular:()=>void; onVer:()=>void; onContabilizar:()=>void; onPrint:()=>void; onMail:()=>void;
  onGen:()=>void;
}) {

  const iconBtn = (onClick:()=>void, icon:React.ReactNode, color='#757575', title='') => (
    <button onClick={e=>{e.stopPropagation();onClick();}} title={title} aria-label={title||'acción'}
      style={{ width:28,height:28,border:`1px solid #EBEBEB`,borderRadius:radius.sm,background:'#fff',
        cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color }}>
      {icon}
    </button>
  );

  if (ch.estado==='Pendiente') return (
    <div style={{ display:'flex',gap:4,alignItems:'center' }}>
      <button onClick={e=>{e.stopPropagation();onEmitir();}}
        style={{ height:26,padding:'0 10px',border:'none',borderRadius:radius.sm,background:BRAND,
          color:'#fff',cursor:'pointer',fontSize:11,fontFamily:F,fontWeight:500 }}>Emitir</button>
      {iconBtn(()=>{}, <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9.5 1.5L12.5 4.5L5 12H2v-3L9.5 1.5z"/></svg>, BRAND, 'Editar')}
      {iconBtn(onAnular, <IcCancel/>, '#BCBCBC', 'Anular')}
    </div>
  );

  if (ch.estado==='Emitido') return (
    <div style={{ display:'flex',gap:4,alignItems:'center' }}>
      <button onClick={e=>{e.stopPropagation();onVer();}} style={{ height:26,padding:'0 10px',border:'1px solid #E0E0E0',borderRadius:radius.sm,background:'#fff',color:'#555',cursor:'pointer',fontSize:11,fontFamily:F }}>
        Ver asiento
      </button>
      {iconBtn(onVer, <IcView/>, '#BCBCBC', 'Ver')}
      {iconBtn(onPrint, <IcPrint/>, '#BCBCBC', 'Imprimir')}
      {iconBtn(onMail, <IcMail/>, '#BCBCBC', 'Enviar por correo')}
      {iconBtn(onAnular, <IcCancel/>, '#BCBCBC', 'Anular')}
    </div>
  );

  if (ch.estado==='Generado') return (
    <div style={{ display:'flex',gap:4,alignItems:'center' }}>
      {iconBtn(onContabilizar, <IcStar/>, BRAND, 'Contabilizar')}
      {iconBtn(onVer, <IcView/>, BRAND, 'Ver')}
      {iconBtn(onPrint, <IcPrint/>, BRAND, 'Imprimir')}
      {iconBtn(onMail, <IcMail/>, BRAND, 'Enviar por correo')}
      {iconBtn(onAnular, <IcCancel/>, RED, 'Anular')}
    </div>
  );

  if (ch.estado==='Contabilizado') return (
    <div style={{ display:'flex',gap:4,alignItems:'center' }}>
      {iconBtn(onVer, <IcView/>, BRAND, 'Ver')}
      {iconBtn(onPrint, <IcPrint/>, BRAND, 'Imprimir')}
      {iconBtn(onMail, <IcMail/>, BRAND, 'Enviar por correo')}
      {iconBtn(onAnular, <IcCancel/>, '#BCBCBC', 'Anular')}
    </div>
  );

  return <span style={{ fontSize:11,color:'#BCBCBC',fontFamily:F }}>-</span>;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Cheques() {
  const [cheques,    setCheques]   = useState<Cheque[]>(MOCK);
  const [busq,       setBusq]       = useState('');
  const [estFilt,    setEstFilt]    = useState('');
  const [bancoFilt,  setBancoFilt]  = useState('');
  const [filtMoneda, setFiltMoneda] = useState<Set<string>>(new Set());
  const [filtUsuario,setFiltUsuario]= useState<Set<string>>(new Set());
  const [fDesde,     setFDesde]     = useState('');
  const [fHasta,     setFHasta]     = useState('');
  const [modGen,     setModGen]     = useState<Cheque|null|'new'>(null);
  const [showExportar, setShowExportar] = useState(false);
  const [modEmitir,  setModEmitir]  = useState<Cheque|null>(null);
  const [modAnular,  setModAnular]  = useState<Cheque|null>(null);
  const [modVer,     setModVer]     = useState<Cheque|null>(null);
  const [comprobante, setComprobante] = useState<Cheque|null>(null);
  const empresaDoc = useEmpresaDoc();
  const [modRet,     setModRet]     = useState<Cheque|null>(null);
  const [modalAsiento, setModalAsiento] = useState<Cheque|null>(null);
  const [toast,      setToast]      = useState<string|null>(null);
  const [pageSize,   setPageSize]   = useState(10);
  const [page,       setPage]       = useState(1);

  const filtered = cheques.filter(ch => {
    if (estFilt && ch.estado !== estFilt) return false;
    if (bancoFilt && !ch.banco.includes(bancoFilt)) return false;
    if (busq && !ch.proveedor.toLowerCase().includes(busq.toLowerCase()) && !ch.consec.includes(busq)) return false;
    if (filtMoneda.size > 0 && !filtMoneda.has(ch.moneda)) return false;
    if (filtUsuario.size > 0 && !filtUsuario.has(ch.usuario)) return false;
    if (fDesde || fHasta) {
      const d = parseFechaDDMMYY(ch.fecha);
      if (!d) return false;
      if (fDesde && d < new Date(fDesde)) return false;
      if (fHasta && d > new Date(fHasta)) return false;
    }
    return true;
  });

  const totalCRC = filtered.filter(c=>c.moneda==='CRC').reduce((s,c)=>s+c.importe,0);
  const totalUSD = filtered.filter(c=>c.moneda==='USD').reduce((s,c)=>s+c.importe,0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const paginated = filtered.slice((pageClamped-1)*pageSize, pageClamped*pageSize);

  function guardarCheque(c: Cheque){
    setCheques(prev => {
      const existe = prev.some(p=>p.id===c.id);
      return existe ? prev.map(p=>p.id===c.id?c:p) : [c, ...prev];
    });
    setModGen(null);
    setToast(modGen==='new' ? 'Cheque generado correctamente' : 'Cheque actualizado correctamente');
  }

  function confirmarEmision(id:string, chequeNro:string, nombre:string){
    setCheques(prev => prev.map(c => c.id===id ? { ...c, estado:'Contabilizado', chequeNro, proveedor: c.proveedor } : c));
    setModEmitir(null);
    setToast(`Cheque ${chequeNro} emitido y contabilizado`);
  }

  function confirmarAnulacion(id:string){
    setCheques(prev => prev.map(c => c.id===id ? { ...c, estado:'Anulado', importe:0 } : c));
    setModAnular(null);
    setToast('Cheque anulado');
  }

  function contabilizar(id:string){
    setCheques(prev => prev.map(c => c.id===id ? { ...c, estado:'Contabilizado' } : c));
    setToast('Cheque contabilizado');
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%',fontFamily:F,background:'#fff',overflow:'hidden' }}>

      {/* ── Header ── */}
      <PageHeader title="Cheques bancarios">
        <BotonExportarUnico onClick={()=>setShowExportar(true)}/>
        <button onClick={()=>setModGen('new')}
          style={{ height:34,padding:'0 16px',border:'none',borderRadius:radius.md,background:BRAND,
            color:'#fff',cursor:'pointer',fontSize:12,fontWeight:500,fontFamily:F,
            display:'flex',alignItems:'center',gap:6 }}>
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>
          Nuevo cheque
        </button>
      </PageHeader>

      {/* ── Barra filtros ── */}
      <div style={{ padding:'8px 24px',display:'flex',gap:8,alignItems:'center',
        borderBottom:'1px solid #EBEBEB',background:'#fff',flexShrink:0,flexWrap:'wrap' }}>
        {/* Buscar */}
        <SearchInput value={busq} onChange={v=>{setBusq(v);setPage(1);}} placeholder="Buscar por título…" width={200} />
        {/* Fechas */}
        <FechaFilterDrop desde={fDesde} hasta={fHasta} onApply={(d,h)=>{setFDesde(d);setFHasta(h);setPage(1);}} onClear={()=>{setFDesde('');setFHasta('');setPage(1);}}/>
        {/* Banco */}
        <div style={{ position:'relative' }}>
          <select value={bancoFilt} onChange={e=>{setBancoFilt(e.target.value);setPage(1);}}
            style={{ ...selectStyle,width:'auto',minWidth:90,height:32,color:bancoFilt?BRAND:'#555' }}>
            <option value="">Banco</option><option value="BAC">BAC</option><option value="BNCR">BNCR</option><option value="Banpro">Banpro</option>
          </select><ChevronSelect/>
        </div>
        {/* Estado */}
        <div style={{ position:'relative' }}>
          <select value={estFilt} onChange={e=>{setEstFilt(e.target.value);setPage(1);}}
            style={{ ...selectStyle,width:'auto',minWidth:90,height:32,color:estFilt?BRAND:'#555' }}>
            <option value="">Estado</option>
            {(['Pendiente','Emitido','Generado','Contabilizado','Anulado'] as Estado[]).map(e=>(
              <option key={e} value={e}>{e}</option>
            ))}
          </select><ChevronSelect/>
        </div>
        <FilterDropdown label="Moneda" options={['CRC','USD']} selected={filtMoneda} onApply={s=>{setFiltMoneda(s);setPage(1);}} onClear={()=>{setFiltMoneda(new Set());setPage(1);}}/>
        <FilterDropdown label="Usuario" options={['jperez','sblandon']} selected={filtUsuario} onApply={s=>{setFiltUsuario(s);setPage(1);}} onClear={()=>{setFiltUsuario(new Set());setPage(1);}}/>
      </div>

      {/* ── Tabla ── */}
      <div style={{ flex:1,overflowY:'auto', padding:`0 ${PAGE_PAD-12}px` }}>
        <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12,fontFamily:F }}>
          <thead style={{ position:'sticky',top:0,zIndex:1 }}>
            <tr style={{ background:'#fff',borderBottom:'1px solid #E8E8E8' }}>
              {['Consecutivo','Estado','Proveedor','Cuenta','Fecha','N° Asiento','Moneda'].map((h,i)=>(
                <th key={i} style={{ padding:'8px 6px',textAlign:'left',fontWeight:500,color:'#888',fontSize:11,whiteSpace:'nowrap',fontFamily:F }}>{h}</th>
              ))}
              <MoneyHeaderCells label="Importe"/>
              {['Usuario','Acciones'].map((h,i)=>(
                <th key={i} style={{ padding:'8px 6px',textAlign:'left',fontWeight:500,color:'#888',fontSize:11,whiteSpace:'nowrap',fontFamily:F }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length===0&&(
              <tr><td colSpan={11} style={{ padding:48,textAlign:'center',color:'#BCBCBC',fontSize:12,fontFamily:F }}>
                No hay cheques para mostrar
              </td></tr>
            )}
            {paginated.map(ch=>{
              const st = EST_STYLE[ch.estado];
              return (
                <tr key={ch.id} style={{ borderBottom:'1px solid #F0F0F0' }}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#FFFBF2'}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#fff'}>
                  {/* Consecutivo / cheque nro */}
                  <td style={{ padding:'8px 6px',fontFamily:F }}>
                    {ch.chequeNro
                      ? <span style={{ color:BRAND,fontWeight:500,fontFamily:F }}>{ch.chequeNro}</span>
                      : <span style={{ color:'#BCBCBC' }}>-</span>}
                  </td>
                  {/* Estado */}
                  <td style={{ padding:'8px 6px' }}>
                    <span style={{ display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:radius.pill,
                      border:`1px solid ${st.border}`,background:st.bg,color:st.color,fontSize:11,fontWeight:500,whiteSpace:'nowrap' }}>
                      {ch.estado}
                    </span>
                  </td>
                  {/* Proveedor */}
                  <td style={{ padding:'8px 6px',color:'#0F0F0F',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:F }} title={ch.proveedor}>{ch.proveedor}</td>
                  {/* Cuenta */}
                  <td style={{ padding:'8px 6px',color:'#757575',fontSize:11,fontFamily:F,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }} title={ch.cuenta}>{ch.cuenta}</td>
                  {/* Fecha */}
                  <td style={{ padding:'8px 6px',color:'#757575',whiteSpace:'nowrap',fontFamily:F }}>{ch.fecha}</td>
                  {/* N° Asiento */}
                  <td style={{ padding:'8px 6px',fontFamily:F }}>
                    {ch.nroAsiento
                      ? <button onClick={e=>{e.stopPropagation(); setModalAsiento(ch);}}
                          style={{ color:BRAND,fontWeight:500,fontFamily:F,background:'none',border:'none',cursor:'pointer',padding:0,fontSize:12,textDecoration:'underline',textDecorationStyle:'dotted',textUnderlineOffset:2 }}>
                          {ch.nroAsiento}
                        </button>
                      : <span style={{ color:'#BCBCBC' }}>-</span>}
                  </td>
                  {/* Moneda */}
                  <td style={{ padding:'8px 6px',fontFamily:F }}>
                    <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                      <span style={{ color:'#555' }}>{ch.moneda}</span>
                      <span style={{ fontSize:11,color:'#9E9E9E' }}>{ch.moneda==='CRC'?simboloLocal():'$'}</span>
                    </div>
                  </td>
                  {/* Importe */}
                  {ch.importe>0
                    ? <MoneyCells sym={ch.moneda==='USD'?'$':simboloLocal()} value={fmtN(ch.importe)}/>
                    : <><td/><td style={{ color:'#BCBCBC' }}>-</td></>}
                  {/* Usuario */}
                  <td style={{ padding:'8px 6px',color:'#757575',fontSize:11,fontFamily:F }}>{ch.usuario}</td>
                  {/* Acciones */}
                  <td style={{ padding:'8px 6px' }}>
                    <AccionesRow ch={ch}
                      onGen={()=>setModGen(ch)}
                      onEmitir={()=>setModEmitir(ch)}
                      onAnular={()=>setModAnular(ch)}
                      onVer={()=>setModVer(ch)}
                      onContabilizar={()=>contabilizar(ch.id)}
                      onPrint={()=>setComprobante(ch)}
                      onMail={()=>setToast(`Cheque ${ch.chequeNro ?? ch.consec} enviado por correo al proveedor`)}
                      />
                  </td>
                </tr>
              );
            })}
          </tbody>
          {(totalCRC>0 || totalUSD>0) && (
            <tfoot>
              <tr style={{ background:'#F9F9F9', borderTop:'2px solid #E0E0E0' }}>
                <td colSpan={7} style={{ padding:'8px 6px', fontWeight:600, fontSize:12, fontFamily:F, textAlign:'right' }}>Total importe</td>
                <MoneyCellsStack bold rows={[
                  ...(totalCRC>0 ? [{sym:simboloLocal(), value:fmtN(totalCRC)}] : []),
                  ...(totalUSD>0 ? [{sym:'$', value:fmtN(totalUSD)}] : []),
                ]}/>
                <td/><td/>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Footer paginación */}
      <div style={{ borderTop:`1px solid ${C.n500}`,padding:'8px 24px',display:'flex',alignItems:'center',flexShrink:0,background:'#fff' }}>
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      {/* Modales */}
      {modGen && <ModalGenerarCheque cheque={modGen==='new'?undefined:modGen} onClose={()=>setModGen(null)} onSave={guardarCheque}/>}
      {modEmitir && <ModalEmitir cheque={modEmitir} onClose={()=>setModEmitir(null)} onConfirm={confirmarEmision}/>}
      {modAnular && <ModalAnular cheque={modAnular} onClose={()=>setModAnular(null)} onConfirm={confirmarAnulacion}/>}
      {comprobante && <ComprobanteOperacionModal titulo={`Comprobante · Cheque ${comprobante.chequeNro ?? comprobante.consec}`} archivo={`comprobante-cheque-${comprobante.chequeNro ?? comprobante.consec}`} marca={C.brand}
        onClose={() => setComprobante(null)} comprobantes={armarComprobantes({ clase: 'Cheque', numero: comprobante.chequeNro ?? comprobante.consec, empresa: empresaDoc,
          tercero: { nombre: comprobante.proveedor }, fecha: comprobante.fecha, medioPago: `Cheque ${comprobante.chequeNro ?? 'por emitir'} · ${comprobante.banco}`,
          concepto: `Pago a ${comprobante.proveedor}`, simbolo: comprobante.moneda === 'USD' ? '$' : simboloLocal(), importe: comprobante.importe,
          documentos: comprobante.totalDoc ? [{ numero: comprobante.consec, importe: comprobante.totalDoc, aplicado: comprobante.importe }] : [],
          retenciones: comprobante.retenciones.filter(r => r.imp > 0).map(r => ({ tipo: r.tipo, documento: comprobante.consec, base: comprobante.totalDoc, monto: r.imp })) })} />}
      {modVer && <ModalVerCheque cheque={modVer} onClose={()=>setModVer(null)} onVerRetencion={()=>{setModRet(modVer);setModVer(null);}}/>}
      {modRet && <ModalRetencionesEditor cheque={modRet} onClose={()=>setModRet(null)} onSave={r=>{
        setCheques(prev=>prev.map(c=>c.id===modRet.id?{...c,retenciones:r,retencion:r.reduce((s,x)=>s+x.imp,0)}:c));
        setModRet(null);
        setToast('Retenciones actualizadas');
      }}/>}
      {/* Modal asiento inline */}
      {modalAsiento && (
        <DetalleDrawer
          asiento={{
            id: parseInt(modalAsiento.nroAsiento?.replace(/\D/g,'') || '0') || 1,
            consecutivo: modalAsiento.nroAsiento ?? '',
            titulo: `Asiento de cheque ${modalAsiento.nroAsiento}`,
            fecha: modalAsiento.fecha,
            tipo: 'A' as const,
            origen: '',
            moneda: modalAsiento.moneda,
            contabilizado: true,
            usuario: modalAsiento.usuario,
            documento: modalAsiento.nroAsiento ?? '',
            importe: modalAsiento.importe,
            observacion: '',
            archivos: [],
            historial: [],
            lineas: [
              { id:1, cuenta:'100200300', descripcion:`${modalAsiento.banco} ${modalAsiento.moneda==='USD'?'Dólares':nombreMonedaLocal(true)} – Pago cheque ${modalAsiento.nroAsiento ?? ''}`, debe:modalAsiento.importe, haber:0, cCostos:'' },
              { id:2, cuenta:'300001001', descripcion:'Cuentas por pagar – Cancelación',              debe:0,        haber:modalAsiento.importe, cCostos:'' },
            ],
          }}
          onClose={()=>setModalAsiento(null)}
          onAnular={()=>{}}
          onDuplicar={()=>{}}
          onContabilizar={()=>{}}
          onRestaurar={()=>{}}
        />
      )}
      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}
      {showExportar && (
        <ExportListModal
          title="Cheques bancarios"
          subtitulo={`${filtered.length} cheque${filtered.length===1?'':'s'}`}
          filename="cheques-bancarios"
          columns={[
            { key:'consec', label:'Consecutivo' }, { key:'chequeNro', label:'N° Cheque' }, { key:'fecha', label:'Fecha' },
            { key:'proveedor', label:'Proveedor' }, { key:'banco', label:'Banco' },
            { key:'importe', label:'Importe', align:'right' }, { key:'usuario', label:'Usuario' }, { key:'estado', label:'Estado' },
          ]}
          rows={filtered.map(ch=>({
            consec:ch.consec, chequeNro:ch.chequeNro ?? '-', fecha:ch.fecha, proveedor:ch.proveedor, banco:ch.banco,
            importe:`${ch.moneda==='USD'?'$':simboloLocal()} ${fmtNum(ch.importe,2)}`, usuario:ch.usuario, estado:ch.estado,
          }))}
          onClose={()=>setShowExportar(false)}
        />
      )}
    </div>
  );
}
