'use client';
import ComprobanteOperacionModal from '@/components/ui/documento/ComprobanteOperacion';
import { armarComprobantes } from '@/components/ui/documento/comprobantes';
import { useEmpresaDoc } from '@/components/ui/documento/useEmpresaDoc';
import { useState } from 'react';
import { PresenciaOperacion } from '@/components/ui/primitives';
import { C, radius, shadow, TABLA } from '@/components/ui/tokens';
import { BANCOS, BRAND, ESTADO_STYLE, F, fmt2 } from './datos';
import { Btn, Pill } from './piezas';

// ── Modal: anticipo ───────────────────────────────────────────────────────────
export function AnticipoModal({ onClose }: { onClose: () => void }) {
  const [tipoDetectado] = useState<'Cliente' | 'Proveedor'>('Cliente');
  const [cuenta, setCuenta] = useState('100-001-0001-CLI0001 - Arara Tours');
  const [lineas] = useState([{ id:1, descripcion:'', documento:'', moneda:'¢ CRC', monto:55000 }]);
  const [showRecibo, setShowRecibo] = useState(false);
  const empresaDoc = useEmpresaDoc();

  const totalAnticipo = lineas.reduce((s,l) => s+l.monto, 0);

  // Recibo estándar del anticipo (se ve, se descarga y se imprime)
  if (showRecibo) {
    const cliente = tipoDetectado === 'Cliente';
    return <ComprobanteOperacionModal titulo={`Recibo · Anticipo de ${cliente ? 'cliente' : 'proveedor'}`} archivo="recibo-anticipo-567" onClose={onClose} marca={C.brand}
      comprobantes={armarComprobantes({ clase: cliente ? 'Anticipo de cliente' : 'Anticipo a proveedor', numero: '567', empresa: empresaDoc,
        tercero: { nombre: cuenta.split(' - ').slice(1).join(' - ') || cuenta, identificacion: cuenta.split(' - ')[0] },
        fecha: new Date().toISOString().slice(0, 10), medioPago: 'Transferencia bancaria · Ref. 20260520-888',
        concepto: `Anticipo de ${cliente ? 'cliente' : 'proveedor'} - ${cuenta.split(' - ').slice(1).join(' - ')} - 567`, simbolo: '₡', importe: totalAnticipo,
        documentos: lineas.filter(l => l.monto > 0).map((l, n) => ({ numero: l.documento || `Anticipo ${n + 1}`, importe: l.monto, aplicado: l.monto })) })} />;
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:'100%', maxWidth:1100, boxShadow:shadow.modal, fontFamily:F, display:'flex', flexDirection:'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Título */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:15, fontWeight:600 }}>Anticipo de clientes/proveedores</span>
          <span style={{ fontSize:13, color:C.n700 }}>48</span>
          <Pill color={ESTADO_STYLE['Pendiente'][0]} bg={ESTADO_STYLE['Pendiente'][1]}>Pendiente</Pill>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:14 }}>
            <PresenciaOperacion/>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, fontSize:20 }}>×</button>
          </div>
        </div>

        <div style={{ display:'flex', flex:1 }}>
          <div style={{ flex:1, padding:'16px 20px', display:'flex', flexDirection:'column', gap:16, overflowY:'auto' }}>
            {/* Info banner */}
            <div style={{ padding:'8px 12px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:radius.md, fontSize:12, color:'#1E40AF' }}>
              {tipoDetectado === 'Cliente'
                ? 'Seleccione la cuenta contable para identificar si es un anticipo de cliente o de proveedor.'
                : 'El proveedor realiza un pago sin que exista una factura específica aún. El sistema registra el ingreso y genera el asiento contable.'}
            </div>

            <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:0 }}>¿DE QUIÉN ES EL ANTICIPO?</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px 16px' }}>
              <div>
                <label style={{ fontSize:11, fontWeight:500, whiteSpace:'nowrap', margin:'0 0 3px', display:'block' }}>Cuenta contable <span style={{ color:C.error }}>*</span></label>
                <select aria-label="Cuenta contable" value={cuenta} onChange={e => setCuenta(e.target.value)} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none' }}>
                  <option>100-001-0001-CLI0001 - Arara Tours</option>
                  <option>100-001-0001-CLI0002 - Distribuidora ABC S.A.</option>
                </select>
                <div style={{ display:'flex', gap:8, marginTop:4 }}>
                  <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer' }}>Cliente</button>
                  <button style={{ fontSize:11, color:C.n700, background:'none', border:'none', cursor:'pointer' }}>Proveedor</button>
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Título / Leyenda</label>
                <input aria-label="Título / Leyenda" defaultValue={`Anticipo de ${tipoDetectado==='Cliente'?'cliente':'proveedor'} - ${tipoDetectado==='Cliente'?'AuraTours S.A.':'Materiales occidente S.A.'} - 90`}
                  style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                <p style={{ fontSize:11, color:BRAND, margin:'3px 0 0' }}>Auto-propuesto.</p>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Flujo (opcional)</label>
                <input placeholder="Anticipo de clientes" aria-label="Anticipo de clientes" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
              </div>
            </div>

            <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:0 }}>DETALLE DE ANTICIPO</p>
            <div style={{ display:'grid', gridTemplateColumns:'160px 170px 1fr 1fr', gap:'8px 14px', alignItems:'flex-start' }}>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Fecha <span style={{ color:C.error }}>*</span></label>
                <input aria-label="Fecha" type="date" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Moneda <span style={{ color:C.error }}>*</span></label>
                <div style={{ display:'flex', gap:5 }}>
                  <button style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500, background:BRAND, color:'#FFFFFF' }}>¢ CRC</button>
                  <button style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, background:C.n200, color:'#0F0F0F' }}>$ USD</button>
                </div>
                <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'3px 0' }}>Tipo de cambio: 1.0000</button>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Banco <span style={{ color:C.error }}>*</span></label>
                <select aria-label="Banco" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none' }}>
                  {BANCOS.map(b => <option key={b}>{b}</option>)}
                </select>
                <span style={{ fontSize:11, color:BRAND }}>Filtrado por moneda CRC</span>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Referencia bancaria</label>
                <input placeholder="Nro. transacción del banco" aria-label="Nro. transacción del banco" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
              </div>
            </div>

            {/* Facturas anticipadas */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>Facturas anticipadas <span style={{ fontSize:11, color:C.n700 }}>({lineas.length} documentos agregado{lineas.length!==1?'s':''})</span></span>
                <button style={{ height:28, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F }}>+ Agregar línea</button>
              </div>
              <div style={TABLA.wrap}><table className="tabla" style={TABLA.table}>
                <thead><tr style={TABLA.headRow}>
                  {['Descripción','Documento','Moneda','Importe anticipado',''].map(h => (
                    <th key={h} style={TABLA.th}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {lineas.map(l => (
                    <tr key={l.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                      <td style={{ padding:'6px 12px' }}><input defaultValue={l.descripcion} placeholder="Ingrese la descripción del anticipo" aria-label="Ingrese la descripción del anticipo" style={{ width:'100%', height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/></td>
                      <td style={{ padding:'6px 12px' }}><input placeholder="Ingrese el documento" aria-label="Ingrese el documento" style={{ width:'100%', height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/></td>
                      <td style={{ padding:'8px 12px' }}><span style={{ fontSize:11, padding:'2px 8px', background:C.n200, borderRadius:4 }}>{l.moneda}</span></td>
                      <td style={{ padding:'6px 12px' }}>
                        <input aria-label="Monto" type="number" defaultValue={l.monto} style={{ width:100, height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', textAlign:'right' }}/>
                      </td>
                      <td style={{ padding:'8px 12px' }}><button style={{ background:'none', border:'none', cursor:'pointer', color:C.error, fontSize:14 }}>×</button></td>
                    </tr>
                  ))}
                  <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
                    <td colSpan={3} style={{ padding:'8px 12px', fontWeight:600, fontSize:12 }}>Total</td>
                    <td style={{ padding:'8px 12px' }}><span style={{ color:C.n700, marginRight:4 }}>₡</span><span style={{ fontWeight:600 }}>{fmt2(totalAnticipo)}</span></td>
                    <td/>
                  </tr>
                </tbody>
              </table></div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ width:210, borderLeft:`1px solid ${C.n500}`, padding:'16px 14px', flexShrink:0 }}>
            <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>
              {tipoDetectado === 'Cliente' ? 'CLIENTE SELECCIONADO' : 'PROVEEDOR SELECCIONADO'}
            </p>
            <p style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', margin:'0 0 3px' }}>Arara Tours</p>
            <p style={{ fontSize:11, color:C.n700, margin:'0 0 3px', fontFamily:F }}>0012 · 200-001-001</p>
            <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:0 }}>1 documento anticipado</button>
            <div style={{ marginTop:14 }}>
              <p style={{ fontSize:13, fontWeight:600, margin:'0 0 8px' }}>Resumen</p>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                <span style={{ color:C.n700 }}>Anticipo</span>
                <span style={{ fontWeight:500 }}>₡ {fmt2(totalAnticipo)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pie */}
        <div style={{ borderTop:`1px solid ${C.n500}`, padding:'12px 24px', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <Btn variant="danger" onClick={onClose}>Descartar</Btn>
          <Btn onClick={() => setShowRecibo(true)}>Aplicar operación</Btn>
        </div>
      </div>
    </div>
  );
}
