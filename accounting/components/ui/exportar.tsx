'use client';
import ExportarDocumento from './documento/ExportarDocumento';
import { filtrosDesdeTexto, type DocumentoReporte } from './documento/documentoEstandar';
import { useEmpresaDoc } from './documento/useEmpresaDoc';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirmasConfig, firmasParaReporte } from '@/components/pages/config/firmasConfig';
import { C } from './tokens';

// ── Exportar/Imprimir unificado ──────────────────────────────────
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
interface ExportColumn { key:string; label:string; align?:'right'|'left' }
export function ExportListModal({ title, subtitulo, columns, rows, filename, onClose, reporteKey, periodo, filtros }: {
  title:string; subtitulo?:string; columns:ExportColumn[]; rows:Record<string,string|number>[]; filename:string; onClose:()=>void;
  reporteKey?: string;
  periodo?: string;                                  // «DD/MM/AAAA al DD/MM/AAAA»
  filtros?: { etiqueta: string; valor: string }[];   // filtros activos, en el orden de la barra
}) {
  // Documento estándar de exportación e impresión (lineamiento de Front Desk)
  const empresa = useEmpresaDoc();
  const router = useRouter();
  const { firmas } = useFirmasConfig();
  const firmasDelReporte = reporteKey ? firmasParaReporte(firmas, reporteKey) : [];
  const [incluirFirmas, setIncluirFirmas] = useState(false);
  const desdeTexto = filtrosDesdeTexto(subtitulo);
  const documento: DocumentoReporte = {
    empresa: empresa.nombre || 'Empresa', titulo: title, periodo: periodo ?? desdeTexto.periodo, filtros: filtros ?? desdeTexto.filtros,
    columnas: columns, filas: rows, firmas: incluirFirmas ? firmasDelReporte.map(f => ({ nombre: f.nombre, cargo: f.puesto })) : undefined,
  };
  const extra = reporteKey ? (firmasDelReporte.length > 0 ? (
    <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:12 }}>
      <input type="checkbox" checked={incluirFirmas} onChange={e=>setIncluirFirmas(e.target.checked)} style={{ accentColor:C.brand }} />
      Incluir firma{firmasDelReporte.length > 1 ? `s (${firmasDelReporte.length})` : ''}
    </label>
  ) : (
    <div style={{ fontSize:11.5, color:C.n700, lineHeight:1.5 }}>
      No hay firmas configuradas para este reporte.{' '}
      <button type="button" onClick={()=>router.push('/parametros?tab=firmas')}
        style={{ background:'none', border:'none', padding:0, color:C.brand, fontWeight:500, cursor:'pointer', fontSize:11.5, textDecoration:'underline' }}>Configúralas</button>
    </div>
  )) : undefined;
  return <ExportarDocumento documento={documento} archivo={filename} onClose={onClose} marca={C.brand} extra={extra} />;
}
