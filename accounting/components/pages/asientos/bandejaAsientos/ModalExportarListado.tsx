'use client';
import React, { useState } from 'react';
import { C, radius, shadow } from '../../../ui/tokens';
import { csvEscape } from './csvEscape';
import { type Asiento, BRAND, F, MON_SYM, TIPOS_LABEL, fmt2 } from './datos';
import { IcPrint } from './piezas';

export function ModalExportarListado({ rows, tabLabel, filtrosResumen, onClose }: {
  rows: Asiento[]; tabLabel: string; filtrosResumen: string[]; onClose:()=>void;
}) {
  const [formato, setFormato] = useState<'pdf'|'csv'>('pdf');
  const fechaHoy = new Date().toLocaleDateString('es-CR');
  const totalCRC = rows.filter(a=>a.moneda==='CRC').reduce((s,a)=>s+a.importe,0);
  const totalUSD = rows.filter(a=>a.moneda==='USD').reduce((s,a)=>s+a.importe,0);

  function descargarCSV() {
    const headers = ['Tipo','Origen','Fecha','N.º Asiento','Título','Moneda','Importe','Usuario','Documento'];
    const lines = [headers.map(csvEscape).join(',')];
    rows.forEach(a=>{
      lines.push([TIPOS_LABEL[a.tipo], a.origen, a.fecha, a.consecutivo, a.titulo, a.moneda, a.importe.toFixed(2), a.usuario, a.documento]
        .map(v=>csvEscape(String(v))).join(','));
    });
    const blob = new Blob(['﻿'+lines.join('\n')], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bandeja-asientos-${tabLabel.toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`;
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
      {/* Solo el área con id="export-print-area" queda visible al imprimir/Guardar como PDF */}
      <style>{`@media print {
        body * { visibility:hidden; }
        #export-print-area, #export-print-area * { visibility:visible; }
        #export-print-area { position:absolute; left:0; top:0; width:100%; padding:24px; }
        /* display:flex en los contenedores del modal rompe la paginación al
           imprimir - se fuerza a block solo en @media print. */
        .export-modal-root, .export-modal-dialog, .export-modal-scroll {
          position:static !important; overflow:visible !important; height:auto !important;
          max-height:none !important; width:auto !important; display:block !important; box-shadow:none !important;
        }
        /* Issue: el encabezado de columnas solo salía en la primera página del
           PDF - repetirlo en cada página con display:table-header-group. */
        #export-print-area table thead { display: table-header-group; }
        #export-print-area table tr { page-break-inside: avoid; }
      }`}</style>
      <div className="export-modal-dialog" style={{ background:'#FFFFFF', borderRadius:radius.lg, width:760, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Exportar listado - {tabLabel}</p>
            <p style={{ fontSize:11, color:'#757575', margin:'3px 0 0' }}>{rows.length} asiento{rows.length===1?'':'s'} con los filtros actuales</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#757575' }}>×</button>
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
        </div>

        <div className="export-modal-scroll" style={{ flex:1, overflowY:'auto', padding:'16px 24px', background:'#F9F9F9' }}>
          <div id="export-print-area" style={{ background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:radius.md, padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div>
                <p style={{ fontSize:16, fontWeight:700, margin:0 }}>Hotel Fortuna S.A.</p>
                <p style={{ fontSize:12, color:'#757575', margin:'2px 0 0' }}>Bandeja de asientos · {tabLabel}</p>
              </div>
              <p style={{ fontSize:11, color:'#757575', margin:0 }}>Generado: {fechaHoy}</p>
            </div>
            {filtrosResumen.length > 0 && (
              <p style={{ fontSize:11, color:'#757575', margin:'0 0 12px' }}>Filtros: {filtrosResumen.join(' · ')}</p>
            )}
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead><tr style={{ borderBottom:'2px solid #ECECEC' }}>
                {['Tipo','Origen','Fecha','N.º Asiento','Título','Moneda','Importe','Usuario'].map(h=>(
                  <th key={h} style={{ padding:'6px 8px', textAlign:h==='Importe'?'right':'left', fontWeight:500, color:'#757575' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.length===0 ? (
                  <tr><td colSpan={8} style={{ padding:20, textAlign:'center', color:'#757575' }}>Sin asientos para exportar.</td></tr>
                ) : rows.map(a=>(
                  <tr key={a.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                    <td style={{ padding:'5px 8px' }}>{TIPOS_LABEL[a.tipo]}</td>
                    <td style={{ padding:'5px 8px' }}>{a.origen}</td>
                    <td style={{ padding:'5px 8px', whiteSpace:'nowrap' }}>{a.fecha.split('-').reverse().join('/')}</td>
                    <td style={{ padding:'5px 8px', color:BRAND }}>{a.consecutivo}</td>
                    <td style={{ padding:'5px 8px' }}>{a.titulo}</td>
                    <td style={{ padding:'5px 8px' }}>{a.moneda}</td>
                    <td style={{ padding:'5px 8px', textAlign:'right', whiteSpace:'nowrap' }}>{MON_SYM[a.moneda]} {fmt2(a.importe)}</td>
                    <td style={{ padding:'5px 8px', color:'#757575' }}>{a.usuario}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop:'2px solid #ECECEC' }}>
                    <td colSpan={6} style={{ padding:'6px 8px', fontWeight:700 }}>Totales</td>
                    <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>
                      {totalCRC>0 && <div>₡ {fmt2(totalCRC)}</div>}
                      {totalUSD>0 && <div>$ {fmt2(totalUSD)}</div>}
                    </td>
                    <td/>
                  </tr>
                </tfoot>
              )}
            </table>
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
