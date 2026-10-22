'use client';
import { useState } from 'react';
import { C, radius, TABLA } from '@/components/ui/tokens';
import { Monto } from '@/components/ui/montos';
import { type AsientoDC, BRAND, F, GREEN, RED, fmt } from './datos';

// ── Detalle del asiento: mostrar claramente qué está en el Debe
// y qué está en el Haber, con el nombre de cada cuenta ──────────────────────
export function ModalDetalleAsiento({ lineas, onClose }: { lineas:AsientoDC[]; onClose:()=>void }) {
  const totalDebe  = lineas.reduce((s,l)=>s+l.debe,0);
  const totalHaber = lineas.reduce((s,l)=>s+l.haber,0);
  const first = lineas[0];
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:560, padding:24, fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <p style={{ fontSize:14, fontWeight:600, color:'#0F0F0F', margin:0, fontFamily:F }}>{first.titulo}</p>
            <p style={{ fontSize:11, color:'#757575', margin:'3px 0 0', fontFamily:F }}>Asiento {first.nroAsiento} · {first.fecha} · Libro {first.libro}</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#757575', fontSize:18, lineHeight:1, padding:0 }}>×</button>
        </div>
        <table className="tabla" style={{ ...TABLA.table, marginBottom:6 }}>
          <thead>
            <tr style={TABLA.headRow}>
              <th style={TABLA.th}>Cuenta</th>
              <th style={{ ...TABLA.th, textAlign:'right' }}>Debe</th>
              <th style={{ ...TABLA.th, textAlign:'right' }}>Haber</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map(l=>(
              <tr key={l.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                <td style={{ padding:'8px 12px' }}>
                  <span style={{ display:'block', fontSize:11, color:BRAND, fontVariantNumeric:'tabular-nums' }}>{l.cuenta}</span>
                  <span style={{ display:'block', fontSize:12, color:'#0F0F0F' }}>{l.cuentaNombre}</span>
                </td>
                <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
                  {l.debe>0 ? <Monto sym="₡" valor={fmt(l.debe)}/> : <span>-</span>}
                </td>
                <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
                  {l.haber>0 ? <Monto sym="₡" valor={fmt(l.haber)}/> : <span>-</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:`2px solid ${C.n500}` }}>
              <td style={{ padding:'8px', fontWeight:700 }}>Total</td>
              <td style={{ padding:'8px', textAlign:'right', fontWeight:700 }}><Monto sym="₡" valor={fmt(totalDebe)}/></td>
              <td style={{ padding:'8px', textAlign:'right', fontWeight:700 }}><Monto sym="₡" valor={fmt(totalHaber)}/></td>
            </tr>
          </tfoot>
        </table>
        <p style={{ fontSize:10.5, color: Math.abs(totalDebe-totalHaber)<0.005?GREEN:RED, margin:0 }}>
          {Math.abs(totalDebe-totalHaber)<0.005 ? '✓ El asiento cuadra (Debe = Haber)' : '⚠ El asiento no cuadra'}
        </p>
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:18 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
// ── Modal para crear o editar un movimiento cambiario ────────────────────────────────
export function ModalCrearMovimiento({ onClose, editar }: { onClose:()=>void; editar?: { fecha:string; tipoCuenta:string; tc:string } }) {
  const [fecha,   setFecha]   = useState(editar?.fecha ?? '');
  const [tipoCta, setTipoCta] = useState(editar?.tipoCuenta ?? 'Cuentas por cobrar');
  const [tc,      setTc]      = useState(editar?.tc ?? '450.80');

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:500,
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:420, padding:24, fontFamily:F,
        boxShadow:'0 8px 40px rgba(0,0,0,.2)' }}>
        {/* Encabezado del modal */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <span style={{ fontSize:14, fontWeight:600, color:'#0F0F0F', fontFamily:F }}>{editar ? 'Editar movimiento cambiario' : 'Crear movimiento cambiario'}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#757575', fontSize:18, lineHeight:1, padding:0 }}>×</button>
        </div>

        {/* Fecha */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:500, color:'#757575', display:'block', marginBottom:5, fontFamily:F }}>
            Fecha del ajuste <span style={{ color:'#F44336' }}>*</span>
          </label>
          <div style={{ position:'relative' }}>
            <input aria-label="Fecha del ajuste" type="date" value={fecha} onChange={e=>setFecha(e.target.value)}
              style={{ width:'100%', height:36, padding:'0 34px 0 10px', border:`1px solid ${C.n500}`,
                borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', color: fecha?'#0F0F0F':'#757575', boxSizing:'border-box' }}/>
            <svg style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
              width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#757575" strokeWidth="1.3" strokeLinecap="round">
              <rect x="1.5" y="2" width="11" height="11" rx="2"/><path d="M5 1v2M9 1v2M1.5 5.5h11"/>
            </svg>
          </div>
        </div>

        {/* Tipo de cuenta */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:500, color:'#757575', display:'block', marginBottom:5, fontFamily:F }}>
            Tipo de cuenta <span style={{ color:'#F44336' }}>*</span>
          </label>
          <div style={{ position:'relative' }}>
            <select aria-label="Tipo de cuenta" value={tipoCta} onChange={e=>setTipoCta(e.target.value)}
              style={{ width:'100%', height:36, padding:'0 30px 0 10px', border:`1px solid ${C.n500}`,
                borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none', background:'#FFFFFF', color:'#0F0F0F' }}>
              <option>Cuentas por cobrar</option>
              <option>Cuentas por pagar</option>
              <option>Cuentas bancarias</option>
            </select>
            <svg style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
              width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#757575" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3.5 5.25L7 8.75L10.5 5.25"/>
            </svg>
          </div>
        </div>

        {/* Tipo de cambio */}
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:11, fontWeight:500, color:'#757575', display:'block', marginBottom:5, fontFamily:F }}>
            Tipo de cambio nuevo <span style={{ color:'#F44336' }}>*</span>
          </label>
          <input aria-label="Tipo de cambio nuevo" value={tc} onChange={e=>setTc(e.target.value)}
            style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`,
              borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', fontVariantNumeric:'tabular-nums', boxSizing:'border-box' }}/>
        </div>

        {/* Pie */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose}
            style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, borderRadius:radius.md,
              background:'#FFFFFF', cursor:'pointer', fontSize:13, fontFamily:F, color:'#757575' }}>Cancelar</button>
          <button onClick={onClose} style={{ height:36, padding:'0 20px', border:'none', borderRadius:radius.md,
            background:BRAND, color:'#FFFFFF', cursor:'pointer', fontSize:13, fontFamily:F, fontWeight:500 }}>{editar ? 'Guardar' : 'Generar'}</button>
        </div>
      </div>
    </div>
  );
}
