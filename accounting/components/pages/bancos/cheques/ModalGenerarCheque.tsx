'use client';
import { useState } from 'react';
import { Toast } from '../../../ui/primitives';
import { USUARIO_ACTUAL, radius, TABLA } from '../../../ui/tokens';
import { Monto } from '../../../ui/montos';
import { BANCOS_CTA, BRAND, type Cheque, F, RED, type Retencion, fmtN, fromIsoToDDMMYY, inputStyle, selectStyle, toIsoFromDDMMYY } from './datos';
import { ModalBuscarCuenta, ModalRetencionesEditor, ModalShell } from './modales';
import { ChevronSelect, Field } from './piezas';

// ── Modal Generar / Editar cheque ─────────────────────────────────────────────
export function ModalGenerarCheque({ cheque, onClose, onSave }:{ cheque?:Cheque; onClose:()=>void; onSave:(c:Cheque)=>void }) {
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
      <button onClick={aplicar} style={{ height:34,padding:'0 18px',border:'none',borderRadius:7,background:BRAND,color:'#FFFFFF',cursor:'pointer',fontSize:13,fontFamily:F,fontWeight:500 }}>Aplicar operación</button>
    </div>
  );

  return (
    <>
    <ModalShell title="Cheques Bancarios de Compra" onClose={onClose} width={780} footer={footer} presencia>
      <div style={{ padding:20,display:'flex',flexDirection:'column',gap:14 }}>
        {/* Fila 1 */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',gap:10 }}>
          <Field label="Consecutivo"><input readOnly value={cheque?.consec ?? '3636'} style={{ ...inputStyle(),background:'#F9F9F9' }}/></Field>
          <Field label="Cheque nro."><input readOnly value={cheque?.chequeNro ?? '0'} style={{ ...inputStyle(),background:'#F9F9F9',color:'#757575' }}/></Field>
          <Field label="Fecha de emisión" required>
            <div style={{ position:'relative' }}>
              <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={{ ...inputStyle(!!errores.fecha||true), paddingRight:30, borderColor:errores.fecha?RED:BRAND }}/>
            </div>
          </Field>
          <Field label="Moneda">
            <div style={{ position:'relative' }}>
              <select style={selectStyle}><option>$ - Dólares</option><option>₡ - Colones</option></select>
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
              <div style={{ width:12,height:12,borderRadius:'50%',background:cuenta?BRAND:'#757575',flexShrink:0 }}/>
              <input value={cuenta} onChange={e=>setCuenta(e.target.value)} placeholder="Número de cuenta"
                style={{ ...inputStyle(),flex:1, borderColor:errores.cuenta?RED:'#ECECEC' }}/>
            </div>
          </Field>
          <Field label="Flujo de caja (opcional)"><input defaultValue="Ingresar" style={inputStyle()}/></Field>
        </div>
        {/* Beneficiario */}
        <Field label="Beneficiario" required>
          <div style={{ display:'flex',gap:8 }}>
            <input value={beneficiario} onChange={e=>setBeneficiario(e.target.value)} style={{ ...inputStyle(),flex:1, borderColor:errores.beneficiario?RED:'#ECECEC' }}/>
            <button onClick={()=>setShowBuscar(true)}
              style={{ height:34,padding:'0 12px',border:'1px solid #ECECEC',borderRadius:7,background:'#FFFFFF',cursor:'pointer',fontSize:12,fontFamily:F,color:'#757575',whiteSpace:'nowrap' }}>
              Buscar cuenta
            </button>
          </div>
        </Field>
        {/* Leyenda */}
        <label style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:12,fontFamily:F,color:'#0F0F0F' }}>
          <div onClick={()=>setNoNeg(v=>!v)} style={{ width:16, height:16,borderRadius:4,border:`1px solid ${noNeg?BRAND:'#ECECEC'}`,
            background:noNeg?BRAND:'#FFFFFF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            {noNeg&&<svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/></svg>}
          </div>
          Leyenda No Negociable
        </label>
        {/* Observaciones */}
        <Field label="Observaciones">
          <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={2}
            style={{ width:'100%',padding:'7px 10px',border:'1px solid #ECECEC',borderRadius:7,fontSize:12,fontFamily:F,resize:'vertical',outline:'none',boxSizing:'border-box' }}/>
        </Field>
        {/* Facturas */}
        <div>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
            <span style={{ fontSize:12,fontWeight:600,color:'#0F0F0F',fontFamily:F }}>Facturas a pagar</span>
            <div style={{ display:'flex',gap:6 }}>
              <button onClick={eliminarSeleccionadas} style={{ height:28,padding:'0 10px',border:`1px solid #ECECEC`,borderRadius:radius.sm,background:'#FFFFFF',cursor:'pointer',fontSize:11,fontFamily:F,color:RED }}>Eliminar</button>
              <button onClick={adicionar} style={{ height:28,padding:'0 10px',border:`1px solid #ECECEC`,borderRadius:radius.sm,background:'#FFFFFF',cursor:'pointer',fontSize:11,fontFamily:F,color:'#757575' }}>Adicionar</button>
              <button onClick={()=>setShowRet(true)} style={{ height:28,padding:'0 10px',border:`1px solid #ECECEC`,borderRadius:radius.sm,background:'#FFFFFF',cursor:'pointer',fontSize:11,fontFamily:F,color:BRAND }}>Retención{retTotal>0?` (₡ ${fmtN(retTotal)})`:''}</button>
              <button onClick={()=>setToast('Selección de facturas confirmada')} style={{ height:28,padding:'0 12px',border:'none',borderRadius:radius.sm,background:BRAND,color:'#FFFFFF',cursor:'pointer',fontSize:11,fontFamily:F,fontWeight:500 }}>Aceptar</button>
            </div>
          </div>
          <table className="tabla" style={TABLA.table}>
            <thead>
              <tr style={TABLA.headRow}>
                <th style={{ ...TABLA.th, width:28 }}></th>
                {['Factura','Fecha','Imp. inicial','Imp. pendiente','Imp. a pagar'].map((h)=>(
                  <th key={h} style={TABLA.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facturas.map(f=>(
                <tr key={f.id} style={{ background:f.selected?'#FFF8EC':'#FFFFFF', borderBottom:'1px solid #ECECEC' }}>
                  <td style={{ padding:'8px 12px' }}>
                    <div onClick={()=>toggleSel(f.id)} style={{ cursor:'pointer', width:16, height:16,borderRadius:4,border:`1px solid ${f.selected?BRAND:'#ECECEC'}`,background:f.selected?BRAND:'#FFFFFF',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      {f.selected&&<svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                    </div>
                  </td>
                  <td style={{ padding:'8px 12px', color:BRAND }}>{f.factura}</td>
                  <td style={{ padding:'8px 12px' }}>{f.fecha}</td>
                  <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}><Monto sym="₡" valor={fmtN(f.monto)}/></td>
                  <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}><Monto sym="₡" valor={fmtN(f.monto)}/></td>
                  <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}><Monto sym="₡" valor={fmtN(f.selected?f.monto:0)}/></td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Totales */}
          <div style={{ display:'flex',justifyContent:'flex-end',gap:24,padding:'10px 10px 0',fontSize:12,fontFamily:F }}>
            <span style={{ color:'#757575' }}>Total documento <strong style={{ color:'#0F0F0F' }}>₡ {fmtN(totalDoc)}</strong></span>
            <span style={{ color:'#757575' }}>Retención <strong style={{ color:RED }}>₡ {fmtN(retTotal)}</strong></span>
            <span style={{ color:'#757575' }}>Total cheque <strong style={{ color:BRAND }}>₡ {fmtN(totalCheque)}</strong></span>
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
