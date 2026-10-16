'use client';
import React from 'react';
import { C, radius, TABLA } from '../../../ui/tokens';
import { Radio } from '../../../ui/formulario';
import { Monto } from '../../../ui/montos';
import { AGING_DATA, BRAND, type CuentaCP, F, GREEN, RED, bucketizeDoc, fmt, soloIdAux } from './datos';

// ── Dropdown filter button (Figma style) ──────────────────────────────────────
export function FilterBtn({ label, active, children, align='left' }: {
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
          background:active?'#FFF8EC':'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F,
          display:'flex', alignItems:'center', gap:5, color:active?BRAND:C.n700, whiteSpace:'nowrap' }}>
        {label}
        <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d={open?"M3 9L7 5L11 9":"M3 5L7 9L11 5"}/>
        </svg>
      </button>
      {open && children && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', [align]:0, zIndex:300, background:'#FFFFFF',
          border:`1px solid ${C.n500}`, borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,.12)', padding:16, minWidth:300, width:320 }}>
          {children}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:14 }}>
            <button onClick={()=>setOpen(false)}
              style={{ height:30, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
            <button onClick={()=>setOpen(false)}
              style={{ height:30, padding:'0 14px', border:'none', borderRadius:radius.sm, background:BRAND, color:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500 }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}
export function RadioGroup({ name, options, value, onChange }: {
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
// ── Estado de cuenta ──────────────────────────────────────────────────────────
export function EstadoCuenta({ cuentas }: { cuentas: CuentaCP[] }) {
  if (cuentas.length === 0) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#757575', fontSize:12, fontFamily:F }}>
        Sin cuentas para los filtros seleccionados.
      </div>
    );
  }

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ flex:1, overflowY:'auto' }}>
          {cuentas.map(cli=>(
            <div key={cli.id} style={{ borderBottom:`8px solid #ECECEC` }}>
              {/* Header del cliente - estilo Figma */}
              <div style={{ padding:'10px 18px', background:'#F9F9F9', borderBottom:`1px solid ${C.n500}`,
                display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, flexWrap:'wrap', gap:8, position:'sticky', top:0, zIndex:1 }}>
                <div>
                  <span style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', fontFamily:F }}>{soloIdAux(cli.id)} / {cli.nombre}</span>
                  <span style={{ fontSize:11, color:'#757575', marginLeft:10, fontFamily:F }}>
                    Período: {cli.periodo} · {cli.moneda}
                  </span>
                </div>
                <div style={{ display:'flex', gap:20 }}>
                  {[
                    {l:'Saldo pendiente',  v:`₡ ${fmt(cli.saldoPendiente)}`, red:false},
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
                <table className="tabla" style={TABLA.table}>
                  <thead>
                    <tr style={TABLA.headRow}>
                      {['Documento','Fecha','Descripcion','Debe','Haber','Saldo final','Dias','F. Ult. Op.'].map((h,i)=>(
                        <th key={i} style={{ ...TABLA.th, textAlign:i>=3&&i<=5?'right':'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cli.movimientos.map((m,i)=>(
                      <tr key={i} style={{ borderBottom:'1px solid #ECECEC' }}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#FFFBF2'}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#FFFFFF'}>
                        <td style={{ padding:'8px 12px', color:BRAND, fontFamily:F, whiteSpace:'nowrap' }}>{m.doc}</td>
                        <td style={{ padding:'8px 12px', whiteSpace:'nowrap', fontFamily:F }}>{m.fecha}</td>
                        <td style={{ padding:'8px 12px', color:'#0F0F0F', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:F }}>{m.desc}</td>
                        <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontFamily:F, color:m.debe<0?RED:'#0F0F0F' }}>
                          {m.debe!==0?<Monto sym="₡" valor={fmt(m.debe)}/>:<span>0.00</span>}
                        </td>
                        <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontFamily:F }}>
                          {m.haber!==0?<Monto sym="₡" valor={fmt(m.haber)}/>:<span>0.00</span>}
                        </td>
                        <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontFamily:F, color:'#0F0F0F' }}>
                          <Monto sym="₡" valor={fmt(m.saldo)}/>
                        </td>
                        <td style={{ padding:'8px 12px', textAlign:'right', fontFamily:F, color:m.dias>120?RED:m.dias>60?'#E07B00':'#0F0F0F' }}>{m.dias}</td>
                        <td style={{ padding:'8px 12px', whiteSpace:'nowrap', fontFamily:F }}>{m.fultOp}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop:`2px solid ${C.n500}`, background:'#F9F9F9' }}>
                      <td colSpan={5} style={{ padding:'8px 12px', fontWeight:600, fontFamily:F, textAlign:'right' }}>Total</td>
                      <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, fontVariantNumeric:'tabular-nums', fontFamily:F, color:'#0F0F0F' }}>
                        <Monto sym="₡" valor={fmt(cli.saldoPendiente)}/>
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
export function AntiguedadSaldos({ ids, detallePorDocumento }: { ids: string[]; detallePorDocumento: boolean }) {
  const AGE = [
    {key:'corr',   label:'Corriente',   c:GREEN},
    {key:'d30',    label:'1–30 días',   c:'#0F0F0F'},
    {key:'d60',    label:'31–60 días',  c:'#E07B00'},
    {key:'d90',    label:'61–90 días',  c:'#E07B00'},
    {key:'d120',   label:'91–120 días', c:RED},
    {key:'mas120', label:'+120 días',   c:RED},
  ] as const;
  const filaData = AGING_DATA.filter(d=>ids.includes(d.id)).map(cl=>({ ...cl, docs: cl.docs.map(d=>bucketizeDoc(d)) }));
  if (filaData.length === 0) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#757575', fontSize:12, fontFamily:F }}>
        Sin cuentas para los filtros seleccionados.
      </div>
    );
  }
  // Celda de monto: símbolo ₡ siempre a la izquierda, cifra alineada a la derecha
  const Monto = ({ v, color, bold }: { v:number; color?:string; bold?:boolean }) => (
    v === 0
      ? <span style={{ color:'#757575' }}>-</span>
      : <span style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8, width:'100%', fontWeight:bold?700:400, color, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>
          <span>₡</span><span>{fmt(v)}</span>
        </span>
  );
  const totalGeneral = AGE.reduce((acc,a)=>{ acc[a.key] = filaData.flatMap(cl=>cl.docs).reduce((s:number,d:any)=>s+d[a.key],0); return acc; }, {} as Record<string,number>);
  const granTotal = AGE.reduce((s,a)=>s+totalGeneral[a.key],0);
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'0 24px' }}>
      <table className="tabla" style={{ ...TABLA.table, minWidth:860 }}>
        <thead style={{ position:'sticky', top:0, zIndex:1 }}>
          <tr style={TABLA.headRow}>
            <th style={{ ...TABLA.th, minWidth:200 }}>Cliente / Documento</th>
            <th style={TABLA.th}>Vence</th>
            {AGE.map(a=><th key={a.key} style={{ ...TABLA.th, textAlign:'right' }}>{a.label}</th>)}
            <th style={{ ...TABLA.th, textAlign:'right' }}>%</th>
          </tr>
        </thead>
        <tbody>
          {filaData.map((cl,ci)=>{
            const totalGrupo = AGE.reduce((s,a)=>s+cl.docs.reduce((ss:number,d:any)=>ss+d[a.key],0),0);
            const subtotales = AGE.reduce((acc,a)=>{ acc[a.key] = cl.docs.reduce((s:number,d:any)=>s+d[a.key],0); return acc; }, {} as Record<string,number>);
            return [
              <tr key={`g${ci}`} style={{ background:'#F9F9F9', borderTop:ci>0?`2px solid ${C.n500}`:'none', borderBottom:'1px solid #ECECEC' }}>
                <td colSpan={9} style={{ padding:'8px 12px', fontSize:12, fontFamily:F }}>{soloIdAux(cl.id)} - {cl.nombre}</td>
              </tr>,
              ...(detallePorDocumento ? cl.docs.map((doc:any,di:number)=>{
                const totalDoc = AGE.reduce((s,a)=>s+doc[a.key],0);
                const pct = totalGrupo!==0 ? (totalDoc/totalGrupo*100) : 0;
                return (
                  <tr key={`d${ci}-${di}`} style={{ borderBottom:'1px solid #ECECEC' }}>
                    <td style={{ padding:'6px 12px 6px 24px', fontFamily:F }}>{doc.doc}</td>
                    <td style={{ padding:'8px 12px', whiteSpace:'nowrap', fontFamily:F }}>{doc.vence}</td>
                    {AGE.map(a=>(
                      <td key={a.key} style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontFamily:F }}>
                        <Monto v={doc[a.key]} color={doc[a.key]!==0?a.c:undefined}/>
                      </td>
                    ))}
                    <td style={{ padding:'8px 12px', textAlign:'right', color:pct>0?RED:'#757575', fontFamily:F }}>{pct.toFixed(2)}</td>
                  </tr>
                );
              }) : []),
              <tr key={`s${ci}`} style={{ background:'#F9F9F9', borderTop:'1px solid #ECECEC', borderBottom:'1px solid #ECECEC' }}>
                <td colSpan={2} style={{ padding:'7px 12px 7px 24px', fontFamily:F }}>Subtotal</td>
                {AGE.map(a=>(
                  <td key={a.key} style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontFamily:F }}>
                    <Monto v={subtotales[a.key]} color={a.c} bold/>
                  </td>
                ))}
                <td style={{ padding:'8px 12px', textAlign:'right', color:RED, fontFamily:F }}>100.00</td>
              </tr>
            ];
          })}
          <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
            <td colSpan={2} style={{ padding:'8px 12px', fontWeight:700, fontFamily:F }}>Total general</td>
            {AGE.map(a=>(
              <td key={a.key} style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, fontVariantNumeric:'tabular-nums', fontFamily:F }}>
                <Monto v={totalGeneral[a.key]} color={a.c} bold/>
              </td>
            ))}
            <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, color:RED, fontFamily:F }}>{granTotal!==0?'100.00':'0.00'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
