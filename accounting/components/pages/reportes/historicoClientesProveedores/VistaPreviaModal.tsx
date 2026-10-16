'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, radius, TABLA } from '../../../ui/tokens';
import { Monto } from '../../../ui/montos';
import { useFirmasConfig, firmasParaReporte, FirmasBloque } from '../../config/firmasConfig';
import { AGING_DATA, BRAND, type CuentaCP, F, bucketizeDoc, csvEscapeHistorico, fmt, fmtFechaHora, soloIdAux } from './datos';

export function VistaPreviaModal({ tipo, vista, cuentas, idsAntiguedad, detallePorDocumento, onClose }: {
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

  // Issue: exportar reportes - faltaba la opción de Excel (CSV), solo había PDF.
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
          const monto = AGE_KEYS.reduce((s,k)=>s+cl.docs.reduce((ss:number,d:any)=>ss+d[k],0), 0);
          lines.push([cl.id, cl.nombre, '', '', '', monto].map(v=>csvEscapeHistorico(String(v))).join(','));
          return;
        }
        cl.docs.forEach((d:any)=>{
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
        /* Issue: el encabezado de columnas solo salía en la primera página del
           PDF - repetirlo en cada página con display:table-header-group. */
        #export-print-area-historico table thead { display: table-header-group; }
        #export-print-area-historico table tr { page-break-inside: avoid; }
      }`}</style>
      <div className="export-modal-dialog" style={{ background:'#FFFFFF', borderRadius:10, width:'100%', maxWidth:920, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.3)', fontFamily:F }} onClick={e=>e.stopPropagation()}>

        {/* Barra superior del modal (no se imprime) */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:600 }}>Vista previa</span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={descargarExcel} style={{ height:32, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F, color:'#757575' }}>Descargar Excel (CSV)</button>
            <button onClick={()=>window.print()} style={{ height:32, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Imprimir / Guardar como PDF</button>
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
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:`1px solid #ECECEC`, paddingBottom:10, marginBottom:16 }}>
            <div>
              <p style={{ fontSize:17, fontWeight:600, margin:0, color:'#0F0F0F', letterSpacing:'.3px' }}>Hotel Fortuna S.A.</p>
              <p style={{ fontSize:12, color:'#757575', margin:'4px 0 0', lineHeight:1.5, fontWeight:300 }}>
                {vista==='estado' ? `Estado de Cuenta / ${entidad}` : `Antigüedad de Saldos / ${entidad}`}<br/>
                {vista==='estado' ? <>Período: {cuentas[0]?.periodo ?? '-'} &nbsp;·&nbsp; Moneda: {moneda}</> : <>Moneda: {moneda}</>}
              </p>
            </div>
            <div style={{ textAlign:'right', fontSize:'11.5px', color:'#757575', fontWeight:300 }}>
              Fecha: {fechaHora}<br/>Pág. 1 / 1
            </div>
          </div>

          {vista === 'estado' ? (
            cuentas.length === 0 ? (
              <p style={{ fontSize:12, color:'#757575', textAlign:'center', padding:'30px 0' }}>Sin cuentas para los filtros seleccionados.</p>
            ) : cuentas.map(cliente=>(
              <div key={cliente.id} style={{ marginBottom:24 }}>
                {/* Cliente/proveedor + stats */}
                <div style={{ background:'#F9F9F9', borderTop:'1px solid #ECECEC', borderBottom:'1px solid #ECECEC', padding:'10px 12px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap' }}>
                  <div>
                    <span style={{ fontSize:'13.5px', fontWeight:600, color:'#0F0F0F' }}>{soloIdAux(cliente.id)} / {cliente.nombre}</span>
                    <span style={{ fontSize:'11.5px', color:'#757575', marginLeft:8, fontWeight:300 }}>Período: {cliente.periodo} · {cliente.moneda}</span>
                  </div>
                  <div style={{ display:'flex', gap:26, fontSize:12 }}>
                    {[
                      ['Saldo pendiente', `₡ ${fmt(cliente.saldoPendiente)}`, true],
                      ['Última operación', cliente.ultimaOp, false],
                      ['Días vencido', String(cliente.diasVencido), true],
                    ].map(([l,v,neg])=>(
                      <div key={l as string}>
                        <div style={{ color:'#757575', fontSize:'10.5px', fontWeight:300 }}>{l as string}</div>
                        <div style={{ fontWeight:600, color: neg?'#a33':'#0F0F0F' }}>{v as string}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabla movimientos */}
                <table className="tabla" style={{ ...TABLA.table, marginBottom:4 }}>
                  <thead>
                    <tr style={TABLA.headRow}>
                      {['Documento','Fecha','Descripción','Debe','Haber','Saldo final','Días','F. Ult. Op.'].map((h,i)=>(
                        <th key={h} style={{ ...TABLA.th, textAlign:i>=3&&i<=6?'right':'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cliente.movimientos.map((m,i)=>(
                      <tr key={i}>
                        <td style={{ padding:'8px 12px', borderBottom:'1px solid #ECECEC', fontSize:12, color:'#0F0F0F', whiteSpace:'nowrap' }}>{m.doc}</td>
                        <td style={{ padding:'8px 12px', borderBottom:'1px solid #ECECEC', fontSize:12, whiteSpace:'nowrap' }}>{m.fecha}</td>
                        <td style={{ padding:'8px 12px', borderBottom:'1px solid #ECECEC', fontSize:12 }}>{m.desc}</td>
                        <td style={{ padding:'8px 12px', borderBottom:'1px solid #ECECEC', fontSize:12, textAlign:'right', color:m.debe<0?'#a33':undefined, whiteSpace:'nowrap' }}><Monto sym="₡" valor={fmt(m.debe)}/></td>
                        <td style={{ padding:'8px 12px', borderBottom:'1px solid #ECECEC', fontSize:12, textAlign:'right', color:m.haber<0?'#a33':undefined, whiteSpace:'nowrap' }}><Monto sym="₡" valor={fmt(m.haber)}/></td>
                        <td style={{ padding:'8px 12px', borderBottom:'1px solid #ECECEC', fontSize:12, textAlign:'right', color:m.saldo<0?'#a33':undefined, whiteSpace:'nowrap' }}><Monto sym="₡" valor={fmt(m.saldo)}/></td>
                        <td style={{ padding:'8px 12px', borderBottom:'1px solid #ECECEC', fontSize:12, textAlign:'right', whiteSpace:'nowrap' }}>{m.dias.toLocaleString('en-US')}</td>
                        <td style={{ padding:'8px 12px', borderBottom:'1px solid #ECECEC', fontSize:12, whiteSpace:'nowrap' }}>{m.fultOp}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} style={{ textAlign:'right', padding:'8px 12px', fontWeight:600, background:'#F9F9F9', borderTop:'1px solid #ECECEC', fontSize:12 }}>Total</td>
                      <td style={{ padding:'8px 12px', fontWeight:600, background:'#F9F9F9', borderTop:'1px solid #ECECEC', fontSize:12, textAlign:'right', color:cliente.saldoPendiente<0?'#a33':undefined }}>{fmt(cliente.saldoPendiente)}</td>
                      <td colSpan={2} style={{ background:'#F9F9F9', borderTop:'1px solid #ECECEC' }}/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))
          ) : (
            <>
              {/* Tabla antigüedad de saldos - clientes/proveedores según filtro */}
              <table className="tabla" style={{ ...TABLA.table, marginBottom:4 }}>
                <thead>
                  <tr style={TABLA.headRow}>
                    {['Documento','Vence','Corriente','1-30 días','31-60 días','61-90 días','91-120 días','+120 días','%'].map((h,i)=>(
                      <th key={h} style={{ ...TABLA.th, textAlign:i>=2?'right':'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agingData.length === 0 ? (
                    <tr><td colSpan={9} style={TABLA.empty}>Sin cuentas para los filtros seleccionados.</td></tr>
                  ) : agingData.map((cl,ci)=>{
                    const tot = cl.docs.reduce((s,d)=>({
                      corr:s.corr+d.corr, d30:s.d30+d.d30, d60:s.d60+d.d60, d90:s.d90+d.d90, d120:s.d120+d.d120, mas120:s.mas120+d.mas120,
                    }), {corr:0,d30:0,d60:0,d90:0,d120:0,mas120:0});
                    const totalGrupo = tot.corr+tot.d30+tot.d60+tot.d90+tot.d120+tot.mas120;
                    return (
                      <React.Fragment key={ci}>
                        <tr><td colSpan={9} style={{ background:'#ECECEC', borderTop:'1px solid #ECECEC', borderBottom:'1px solid #ECECEC', padding:'8px 12px', fontSize:12, color:'#0F0F0F' }}>{soloIdAux(cl.id)} - {cl.nombre}</td></tr>
                        {detallePorDocumento && cl.docs.map((d,di)=>{
                          const totalDoc = d.corr+d.d30+d.d60+d.d90+d.d120+d.mas120;
                          const pct = totalGrupo!==0 ? (totalDoc/totalGrupo*100) : 0;
                          return (
                          <tr key={di}>
                            <td style={{ padding:'8px 12px', borderBottom:'1px solid #ECECEC', fontSize:12, color:'#0F0F0F', whiteSpace:'nowrap' }}>{d.doc}</td>
                            <td style={{ padding:'8px 12px', borderBottom:'1px solid #ECECEC', fontSize:12, whiteSpace:'nowrap' }}>{d.vence}</td>
                            {(['corr','d30','d60','d90','d120','mas120'] as const).map(k=>(
                              <td key={k} style={{ padding:'8px 12px', borderBottom:'1px solid #ECECEC', fontSize:12, textAlign:'right', color:d[k]<0?'#a33':undefined, whiteSpace:'nowrap' }}>{d[k]!==0?<Monto sym="₡" valor={fmt(d[k])}/>:'-'}</td>
                            ))}
                            <td style={{ padding:'8px 12px', borderBottom:'1px solid #ECECEC', fontSize:12, textAlign:'right', fontWeight:300 }}>{pct.toFixed(2)}</td>
                          </tr>
                          );
                        })}
                        <tr>
                          <td colSpan={2} style={{ padding:'8px 12px', fontWeight:600, background:'#F9F9F9', borderTop:'1px solid #ECECEC' }}>Total {soloIdAux(cl.id)}</td>
                          {(['corr','d30','d60','d90','d120','mas120'] as const).map(k=>(
                            <td key={k} style={{ padding:'8px 12px', fontWeight:600, background:'#F9F9F9', borderTop:'1px solid #ECECEC', textAlign:'right', color:tot[k]<0?'#a33':undefined }}>{tot[k]!==0?<Monto sym="₡" valor={fmt(tot[k])}/>:'-'}</td>
                          ))}
                          <td style={{ padding:'8px 12px', fontWeight:600, background:'#F9F9F9', borderTop:'1px solid #ECECEC', textAlign:'right', color:'#757575' }}>100.00</td>
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
                        <td colSpan={2} style={{ padding:'8px 12px', fontWeight:600, fontSize:'12.5px', background:'#ECECEC', borderTop:'1px solid #ECECEC', borderBottom:'1px solid #ECECEC' }}>Total general</td>
                        {(['corr','d30','d60','d90','d120','mas120'] as const).map(k=>(
                          <td key={k} style={{ padding:'8px 12px', fontWeight:600, fontSize:'12.5px', background:'#ECECEC', borderTop:'1px solid #ECECEC', borderBottom:'1px solid #ECECEC', textAlign:'right', color:gt[k]<0?'#a33':undefined }}>{gt[k]!==0?<Monto sym="₡" valor={fmt(gt[k])}/>:'-'}</td>
                        ))}
                        <td style={{ padding:'8px 12px', fontWeight:600, fontSize:'12.5px', background:'#ECECEC', borderTop:'1px solid #ECECEC', borderBottom:'1px solid #ECECEC' }}/>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </>
          )}

          {incluirFirmas && <FirmasBloque firmas={firmasDelReporte}/>}

          <div style={{ marginTop:14, fontSize:'10.5px', color:'#757575', borderTop:'1px solid #ECECEC', paddingTop:8, display:'flex', justifyContent:'space-between', fontWeight:300 }}>
            <span>Hotel Fortuna S.A. - {vista==='estado' ? 'Estado de cuenta' : 'Antigüedad de saldos'} {entidad}</span>
            <span>Pág. 1 / 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
