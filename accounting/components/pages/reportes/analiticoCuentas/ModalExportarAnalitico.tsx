'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, radius, shadow } from '../../../ui/tokens';
import { useFirmasConfig, firmasParaReporte, EncabezadoAlternativoBloque, FirmasBloque } from '../../config/firmasConfig';
import { BRAND, F, type FilaResumen, type Movimiento, TIPO_LIBRO_OPTIONS, type TipoLibro, csvEscapeAnalitico, fmt2 } from './datos';
import { IcPrint } from './piezas';

// ── Modal: Exportar listado del analítico (Issue #18 - reemplaza Libros contables + Exportar/Imprimir) ──
// La vista (Diario general / resumen / por libro) ya no se elige acá - se elige en la
// pantalla principal de Analítico ("Ver como"), y este modal solo exporta lo que esté
// en pantalla en ese momento, en el formato (PDF/Excel) que se elija.
export function ModalExportarAnalitico({ rows, filasResumen, tipoActivo, cuentaLabel, saldoInicial, saldoFinal, sym, filtrosResumen, onClose }: {
  rows: Movimiento[]; filasResumen: FilaResumen[] | null; tipoActivo: TipoLibro;
  cuentaLabel: string|null; saldoInicial: number|null; saldoFinal: number|null; sym: string;
  filtrosResumen: string[]; onClose: () => void;
}) {
  const [formato, setFormato] = useState<'pdf'|'csv'>('pdf');
  const fechaHoy = new Date().toLocaleDateString('es-CR');
  const router = useRouter();
  const totalDebe  = rows.reduce((s,m)=>s+m.debe,  0);
  const totalHaber = rows.reduce((s,m)=>s+m.haber, 0);
  const tituloReporte = TIPO_LIBRO_OPTIONS.find(o => o.value === tipoActivo)?.label ?? 'Diario general';
  const { firmas } = useFirmasConfig();
  const mostrarOpcionEncabezado = true;
  // Issue: se volvió al modelo centralizado - "Incluir firma(s)" muestra
  // TODAS las firmas configuradas para "analitico" en Parámetros generales >
  // Firmas, en el orden que se definió ahí.
  const firmasDelReporte = firmasParaReporte(firmas, 'analitico');
  const mostrarOpcionFirmas = true;
  const [encabezadoAlt, setEncabezadoAlt] = useState(false);
  const [incluirFirmas, setIncluirFirmas] = useState(false);

  function descargarCSV() {
    const lines: string[] = [];
    if (filasResumen) {
      const headers = ['Cuenta','Cantidad de asientos','Debe','Haber'];
      lines.push(headers.map(csvEscapeAnalitico).join(','));
      filasResumen.forEach(f=>{
        lines.push([f.etiqueta, String(f.cantidad), f.debe.toFixed(2), f.haber.toFixed(2)]
          .map(v=>csvEscapeAnalitico(String(v))).join(','));
      });
    } else {
      const headers = cuentaLabel
        ? ['Tipo','Fecha','N.º Asiento','Descripción','Estado','Módulo','Documento','Debe','Haber']
        : ['Tipo','Fecha','N.º Asiento','Cuenta','Descripción','Estado','Módulo','Documento','Debe','Haber'];
      lines.push(headers.map(csvEscapeAnalitico).join(','));
      rows.forEach(m=>{
        const fila = cuentaLabel
          ? [m.tipo, m.fecha, m.consecutivo, m.descripcion, m.estado, m.modulo, m.documento, m.debe.toFixed(2), m.haber.toFixed(2)]
          : [m.tipo, m.fecha, m.consecutivo, m.cuentaCode, m.descripcion, m.estado, m.modulo, m.documento, m.debe.toFixed(2), m.haber.toFixed(2)];
        lines.push(fila.map(v=>csvEscapeAnalitico(String(v))).join(','));
      });
    }
    const blob = new Blob(['﻿'+lines.join('\n')], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analitico-cuentas-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleDescargar() { formato==='csv' ? descargarCSV() : window.print(); }

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    flex:1, height:32, borderRadius:radius.md, border:`1px solid ${active?BRAND:C.n500}`,
    background:active?C.brandBg:'#FFFFFF', color:active?BRAND:'#0F0F0F',
    fontWeight:active?600:400, cursor:'pointer', fontSize:12, fontFamily:F,
    padding:'0 10px', whiteSpace:'nowrap', display:'flex', alignItems:'center', justifyContent:'center',
  });

  return (
    <div className="export-modal-root" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <style>{`@media print {
        body * { visibility:hidden; }
        #export-print-area-analitico, #export-print-area-analitico * { visibility:visible; }
        #export-print-area-analitico { position:absolute; left:0; top:0; width:100%; padding:24px; }
        /* display:flex en los contenedores del modal rompe la paginación al
           imprimir - se fuerza a block solo en @media print. */
        .export-modal-root, .export-modal-dialog, .export-modal-scroll {
          position:static !important; overflow:visible !important; height:auto !important;
          max-height:none !important; width:auto !important; display:block !important; box-shadow:none !important;
        }
        /* Issue: el encabezado de columnas solo salía en la primera página del
           PDF - repetirlo en cada página con display:table-header-group. */
        #export-print-area-analitico table thead { display: table-header-group; }
        #export-print-area-analitico table tr { page-break-inside: avoid; }
      }`}</style>
      <div className="export-modal-dialog" style={{ background:'#FFFFFF', borderRadius:radius.lg, width:'min(1100px, 95vw)', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Exportar analítico de cuentas</p>
            <p style={{ fontSize:11, color:'#757575', margin:'3px 0 0' }}>{rows.length} movimiento{rows.length===1?'':'s'} con los filtros actuales</p>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#757575' }}>×</button>
        </div>

        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', gap:24, flexShrink:0, flexWrap:'wrap' }}>
          <div>
            <p style={{ fontSize:10, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>Formato de descarga</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setFormato('pdf')} style={toggleBtn(formato==='pdf')}>PDF</button>
              <button onClick={()=>setFormato('csv')} style={toggleBtn(formato==='csv')}>Excel (CSV)</button>
            </div>
          </div>
          {filtrosResumen.length > 0 && (
            <div style={{ flex:1, minWidth:220 }}>
              <p style={{ fontSize:10, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>Filtros aplicados</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {filtrosResumen.map((f,i)=>(
                  <span key={i} style={{ fontSize:11, padding:'3px 9px', borderRadius:radius.pill, background:C.brandBg, color:BRAND, border:`1px solid ${C.brandBd}` }}>{f}</span>
                ))}
              </div>
            </div>
          )}
          {(mostrarOpcionEncabezado || mostrarOpcionFirmas) && (
            <div>
              <p style={{ fontSize:10, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>Opciones</p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {mostrarOpcionEncabezado && (
                  <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, fontFamily:F, color:'#0F0F0F' }}>
                    <input type="checkbox" checked={encabezadoAlt} onChange={e=>setEncabezadoAlt(e.target.checked)} style={{ accentColor:BRAND }} />
                    Encabezado alternativo
                  </label>
                )}
                {mostrarOpcionFirmas && (
                  firmasDelReporte.length > 0 ? (
                    <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, fontFamily:F, color:'#0F0F0F' }}>
                      <input type="checkbox" checked={incluirFirmas} onChange={e=>setIncluirFirmas(e.target.checked)} style={{ accentColor:BRAND }} />
                      Incluir firma{firmasDelReporte.length > 1 ? `s (${firmasDelReporte.length})` : ''}
                    </label>
                  ) : (
                    // Issue: todavía no hay ninguna firma configurada para este
                    // reporte en Parámetros generales > Firmas.
                    <div style={{ fontSize:11.5, color:C.n700, fontFamily:F, lineHeight:1.5, maxWidth:260 }}>
                      No hay firmas configuradas para este reporte.{' '}
                      <button type="button" onClick={()=>router.push('/parametros?tab=firmas')}
                        style={{ background:'none', border:'none', padding:0, color:BRAND, fontWeight:500, cursor:'pointer', fontSize:11.5, fontFamily:F, textDecoration:'underline' }}>
                        Configuralas en Parámetros generales &gt; Firmas
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* La elección de "Diario general / resumen / por libro" ahora vive en la
            pantalla de Analítico ("Ver como"), no acá - este modal solo exporta
            lo que ya está en pantalla. */}

        <div className="export-modal-scroll" style={{ flex:1, overflowY:'auto', padding:'16px 24px', background:'#F9F9F9' }}>
          <div id="export-print-area-analitico" style={{ background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:radius.md, padding:24 }}>
            {encabezadoAlt ? (
              <EncabezadoAlternativoBloque titulo={tituloReporte + (cuentaLabel?` · ${cuentaLabel}`:'')} moneda={sym}/>
            ) : (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div>
                <p style={{ fontSize:16, fontWeight:700, margin:0 }}>Hotel Fortuna S.A.</p>
                <p style={{ fontSize:12, color:'#757575', margin:'2px 0 0' }}>{tituloReporte}{cuentaLabel?` · ${cuentaLabel}`:''}</p>
              </div>
              <p style={{ fontSize:11, color:'#757575', margin:0 }}>Generado: {fechaHoy}</p>
            </div>
            )}
            {filtrosResumen.length > 0 && (
              <p style={{ fontSize:11, color:'#757575', margin:'0 0 12px' }}>Filtros: {filtrosResumen.join(' · ')}</p>
            )}
            {saldoInicial !== null && (
              <p style={{ fontSize:11, color:'#757575', margin:'0 0 8px' }}>Saldo inicial: <strong>{sym} {fmt2(saldoInicial)}</strong></p>
            )}
            {filasResumen ? (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead><tr style={{ borderBottom:`2px solid ${C.n500}` }}>
                  {[tipoActivo==='porLibro'?'Cuenta y libro':'Cuenta','Asientos','Debe','Haber'].map((h,i)=>(
                    <th key={h} style={{ padding:'6px 8px', textAlign:i>=2?'right':'left', fontWeight:500, color:'#757575' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filasResumen.length===0 ? (
                    <tr><td colSpan={4} style={{ padding:20, textAlign:'center', color:'#757575' }}>Sin movimientos para exportar.</td></tr>
                  ) : filasResumen.map(f=>(
                    <tr key={f.clave} style={{ borderBottom:'1px solid #ECECEC' }}>
                      <td style={{ padding:'5px 8px', color:BRAND }}>{f.etiqueta}</td>
                      <td style={{ padding:'5px 8px' }}>{f.cantidad}</td>
                      <td style={{ padding:'5px 8px', textAlign:'right', whiteSpace:'nowrap' }}>{f.debe>0?fmt2(f.debe):'-'}</td>
                      <td style={{ padding:'5px 8px', textAlign:'right', whiteSpace:'nowrap' }}>{f.haber>0?fmt2(f.haber):'-'}</td>
                    </tr>
                  ))}
                </tbody>
                {filasResumen.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop:`2px solid ${C.n500}` }}>
                      <td colSpan={2} style={{ padding:'6px 8px', fontWeight:700 }}>Totales</td>
                      <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>{sym} {fmt2(totalDebe)}</td>
                      <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>{sym} {fmt2(totalHaber)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead><tr style={{ borderBottom:`2px solid ${C.n500}` }}>
                  {(cuentaLabel ? ['Tipo','Fecha','N.º Asiento','Descripción','Estado','Módulo','Documento','Debe','Haber'] : ['Tipo','Fecha','N.º Asiento','Cuenta','Descripción','Estado','Módulo','Documento','Debe','Haber']).map(h=>(
                    <th key={h} style={{ padding:'6px 8px', textAlign:(h==='Debe'||h==='Haber')?'right':'left', fontWeight:500, color:'#757575' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rows.length===0 ? (
                    <tr><td colSpan={cuentaLabel?9:10} style={{ padding:20, textAlign:'center', color:'#757575' }}>Sin movimientos para exportar.</td></tr>
                  ) : rows.map(m=>(
                    <tr key={m.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                      <td style={{ padding:'5px 8px' }}>{m.tipo}</td>
                      <td style={{ padding:'5px 8px', whiteSpace:'nowrap' }}>{m.fecha.split('-').reverse().join('/')}</td>
                      <td style={{ padding:'5px 8px', color:BRAND }}>{m.consecutivo}</td>
                      {!cuentaLabel && <td style={{ padding:'5px 8px', whiteSpace:'nowrap' }}>{m.cuentaCode}</td>}
                      <td style={{ padding:'5px 8px' }}>{m.descripcion}</td>
                      <td style={{ padding:'5px 8px' }}>{m.estado}</td>
                      <td style={{ padding:'5px 8px' }}>{m.modulo}</td>
                      <td style={{ padding:'5px 8px' }}>{m.documento}</td>
                      <td style={{ padding:'5px 8px', textAlign:'right', whiteSpace:'nowrap' }}>{m.debe>0?fmt2(m.debe):'-'}</td>
                      <td style={{ padding:'5px 8px', textAlign:'right', whiteSpace:'nowrap' }}>{m.haber>0?fmt2(m.haber):'-'}</td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop:`2px solid ${C.n500}` }}>
                      <td colSpan={cuentaLabel?7:8} style={{ padding:'6px 8px', fontWeight:700 }}>Totales</td>
                      <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>{sym} {fmt2(totalDebe)}</td>
                      <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>{sym} {fmt2(totalHaber)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
            {saldoFinal !== null && (
              <p style={{ fontSize:11, color:'#757575', margin:'12px 0 0', textAlign:'right' }}>Saldo final: <strong>{sym} {fmt2(saldoFinal)}</strong></p>
            )}
            {incluirFirmas && <FirmasBloque firmas={firmasDelReporte}/>}
          </div>
        </div>

        <div style={{ padding:'12px 24px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={handleDescargar} style={{ height:34, padding:'0 16px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
            <IcPrint/> Descargar {formato==='pdf'?'PDF':'Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
