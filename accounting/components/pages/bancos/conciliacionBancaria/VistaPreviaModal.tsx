'use client';
import { C, radius } from '../../../ui/tokens';
import { BRAND, type Conciliacion, ESTADO_CON_STYLE, F, fmt2, sym, useEscClose } from './datos';
import { ESTADO_MOV_ICON, Pill } from './piezas';

export function VistaPreviaModal({ con, onClose }: { con:Conciliacion; onClose:()=>void }) {
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
      <div style={{ background:'#FFFFFF', borderRadius:10, width:'100%', maxWidth:820, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.3)', fontFamily:F }} onClick={e=>e.stopPropagation()}>

        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:600 }}>Vista previa</span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>window.print()} style={{ height:32, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Imprimir / Guardar PDF</button>
            <button onClick={onClose} aria-label="Cerrar" style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:C.n700 }}>×</button>
          </div>
        </div>

        <div style={{ padding:'28px 32px' }}>
          {/* Encabezado del reporte */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, paddingBottom:16, borderBottom:`2px solid ${C.n500}` }}>
            <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{ width:38, height:38, borderRadius:radius.md, background:BRAND, color:'#FFFFFF', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, flexShrink:0 }}>HF</div>
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
                <th key={h} style={{ padding:'7px 10px', textAlign:h==='Débitos'||h==='Créditos'?'right':'left', color:'#FFFFFF', fontWeight:500, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {movs.length===0 ? (
                <tr><td colSpan={8} style={{ padding:'18px 10px', textAlign:'center', color:C.n700 }}>Sin movimientos conciliados en este período.</td></tr>
              ) : movs.map(m=>(
                <tr key={m.id} style={{ borderBottom:'1px solid #ECECEC' }}>
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
