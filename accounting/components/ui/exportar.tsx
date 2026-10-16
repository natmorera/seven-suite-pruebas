'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirmasConfig, firmasParaReporte, FirmasBloque } from '../pages/config/firmasConfig';
import { C, FONT, radius, shadow } from './tokens';

// ── Exportar/Imprimir unificado - Issue #28 ──────────────────────────────────
// Un solo botón "Exportar" (nunca "Exportar" + "Imprimir" sueltos) que abre una
// vista previa con PDF o Excel/CSV. El área de impresión usa position:absolute
// (no fixed) para que los reportes de varias páginas impriman completos.
export function BotonExportarUnico({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:4,
      background:'#FFFFFF', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'Montserrat, sans-serif', color:C.n700,
      display:'flex', alignItems:'center', gap:10 }}>
      <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 1v8M4 6l3 3 3-3M2 10v1.5A1.5 1.5 0 003.5 13h7A1.5 1.5 0 0012 11.5V10"/>
      </svg>
      Exportar
    </button>
  );
}
export interface ExportColumn { key:string; label:string; align?:'right'|'left' }
export function ExportListModal({ title, subtitulo, columns, rows, filename, onClose, reporteKey }: {
  title:string; subtitulo?:string; columns:ExportColumn[]; rows:Record<string,string|number>[]; filename:string; onClose:()=>void;
  // Issue: este modal es genérico y lo comparten pantallas que NO son
  // firmables (Cheques, Depósitos, Transferencias, Conciliación, Cobros/Pagos,
  // Gestión de tarjetas) junto con Diferencial cambiario, que sí lo es. Se
  // deja "reporteKey" opcional: solo si se pasa (coincidiendo con una key de
  // REPORTES_FIRMABLES en Parámetros > Firmas) aparece la opción de incluir
  // firmas - las demás pantallas quedan exactamente igual que antes.
  reporteKey?: string;
}) {
  const [formato, setFormato] = useState<'pdf'|'csv'>('pdf');
  const printAreaId = 'export-print-' + filename.replace(/[^a-zA-Z0-9]/g,'');
  const F = FONT;
  const router = useRouter();
  const { firmas } = useFirmasConfig();
  const firmasDelReporte = reporteKey ? firmasParaReporte(firmas, reporteKey) : [];
  const [incluirFirmas, setIncluirFirmas] = useState(false);

  function descargarCSV() {
    const header = columns.map(c=>`"${c.label}"`).join(',');
    const lines = rows.map(r => columns.map(c => `"${String(r[c.key] ?? '').replace(/"/g,'""')}"`).join(','));
    const csv = [header, ...lines].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename + '.csv'; a.click();
    URL.revokeObjectURL(url);
  }
  function handleDescargar() { formato === 'csv' ? descargarCSV() : window.print(); }

  return (
    <div className="export-modal-root" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <style>{`@media print {
        body * { visibility:hidden; }
        #${printAreaId}, #${printAreaId} * { visibility:visible; }
        #${printAreaId} { position:absolute; left:0; top:0; width:100%; padding:24px; }
        /* display:flex en los contenedores del modal rompe la paginación al
           imprimir - Chrome no reparte bien el contenido de un flex container
           entre páginas, así que se fuerza a block solo en @media print. */
        .export-modal-root, .export-modal-dialog, .export-modal-scroll {
          position:static !important; overflow:visible !important; height:auto !important;
          max-height:none !important; width:auto !important; display:block !important; box-shadow:none !important;
        }
        /* Issue: el encabezado de columnas solo salía en la primera página del
           PDF - de la página 2 en adelante arrancaba directo en los datos, sin
           poder saber a qué columna corresponde cada número. Como este modal lo
           usan Cheques, Depósitos, Transferencias, Conciliación, Cobros/Pagos,
           Gestión de tarjetas y Diferencial cambiario, este único fix repite el
           encabezado en todas esas pantallas a la vez. */
        #${printAreaId} table thead { display: table-header-group; }
        #${printAreaId} table tr { page-break-inside: avoid; }
      }`}</style>
      <div className="export-modal-dialog" style={{ background:'#FFFFFF', borderRadius:radius.lg, width:'min(1000px, 95vw)', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Exportar - {title}</p>
            {subtitulo && <p style={{ fontSize:11, color:C.n700, margin:'2px 0 0' }}>{subtitulo}</p>}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#757575' }}>×</button>
        </div>
        <div style={{ padding:'12px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setFormato('pdf')} style={{ height:30, padding:'0 14px', borderRadius:7, border:`1px solid ${formato==='pdf'?C.brand:C.n500}`, background:formato==='pdf'?C.brandBg:'#FFFFFF', color:formato==='pdf'?C.brand:'#757575', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:formato==='pdf'?600:400, whiteSpace:'nowrap' }}>PDF</button>
            <button onClick={()=>setFormato('csv')} style={{ height:30, padding:'0 14px', borderRadius:7, border:`1px solid ${formato==='csv'?C.brand:C.n500}`, background:formato==='csv'?C.brandBg:'#FFFFFF', color:formato==='csv'?C.brand:'#757575', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:formato==='csv'?600:400, whiteSpace:'nowrap' }}>Excel (CSV)</button>
          </div>
          {reporteKey && (
            firmasDelReporte.length > 0 ? (
              <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, fontFamily:F, color:'#0F0F0F' }}>
                <input type="checkbox" checked={incluirFirmas} onChange={e=>setIncluirFirmas(e.target.checked)} style={{ accentColor:C.brand }} />
                Incluir firma{firmasDelReporte.length > 1 ? `s (${firmasDelReporte.length})` : ''}
              </label>
            ) : (
              <div style={{ fontSize:11.5, color:C.n700, fontFamily:F, lineHeight:1.5 }}>
                No hay firmas configuradas para este reporte.{' '}
                <button type="button" onClick={()=>router.push('/parametros?tab=firmas')}
                  style={{ background:'none', border:'none', padding:0, color:C.brand, fontWeight:500, cursor:'pointer', fontSize:11.5, fontFamily:F, textDecoration:'underline' }}>
                  Configuralas en Parámetros generales &gt; Firmas
                </button>
              </div>
            )
          )}
        </div>
        <div className="export-modal-scroll" style={{ flex:1, overflowY:'auto', padding:'16px 24px', background:'#F9F9F9' }}>
          <div id={printAreaId} style={{ background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:radius.md, padding:20 }}>
            <p style={{ fontSize:14, fontWeight:700, margin:'0 0 3px' }}>{title}</p>
            {subtitulo && <p style={{ fontSize:11, color:'#757575', margin:'0 0 12px' }}>{subtitulo}</p>}
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
                  {columns.map(c=><th key={c.key} style={{ padding:'6px 8px', textAlign:c.align??'left', fontWeight:500, color:'#0F0F0F' }}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.length===0 ? (
                  <tr><td colSpan={columns.length} style={{ padding:'20px 8px', textAlign:'center', color:'#757575' }}>Sin datos para exportar.</td></tr>
                ) : rows.map((r,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid #ECECEC' }}>
                    {columns.map(c=><td key={c.key} style={{ padding:'6px 8px', textAlign:c.align??'left' }}>{r[c.key]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {reporteKey && incluirFirmas && <FirmasBloque firmas={firmasDelReporte}/>}
          </div>
        </div>
        <div style={{ padding:'12px 24px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={handleDescargar} style={{ height:34, padding:'0 16px', background:C.brand, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>
            Descargar {formato==='pdf'?'PDF':'Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
