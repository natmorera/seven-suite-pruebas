'use client';
// Exportar e imprimir un reporte o listado con el documento estándar
// (lineamiento de Front Desk): vista previa del documento a la izquierda y, a
// la derecha, formato (CSV, XLS o PDF), opciones del documento (encabezado y
// filtros aplicados) y tamaño de página del PDF. «Imprimir» usa el mismo PDF.
import { useState } from 'react';
import {
  descargarCsv, descargarXls, descargarPdf, imprimirPdf, textoFiltros, fechaHoraGeneracion,
  type DocumentoReporte, type OpcionesDoc,
} from './documentoEstandar';

const FONT = 'Montserrat, system-ui, sans-serif';
const N900 = '#0F0F0F', N700 = '#757575', N500 = '#ECECEC', N200 = '#F9F9F9';

type Formato = 'csv' | 'xls' | 'pdf';
const FORMATOS: { id: Formato; nombre: string; detalle: string }[] = [
  { id: 'csv', nombre: 'CSV', detalle: 'Archivo separado por comas' },
  { id: 'xls', nombre: 'XLS', detalle: 'Hoja de cálculo Excel' },
  { id: 'pdf', nombre: 'PDF', detalle: 'Documento PDF' },
];

function VistaPrevia({ d, o }: { d: DocumentoReporte; o: OpcionesDoc }) {
  const max = 18;
  return (
    <div style={{ background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,.08)', padding: '28px 32px', minHeight: 520, display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
      {o.encabezado && <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: '#3C3C3C' }}>
          <span style={{ width: 11, height: 11, background: '#243B84', borderRadius: 2 }} />{d.empresa.toUpperCase()}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginTop: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: N900 }}>{d.titulo}</div>
          {d.periodo && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 9, color: '#8A8A8A' }}>Período</div><div style={{ fontSize: 11, fontWeight: 600 }}>{d.periodo}</div></div>}
        </div>
      </>}
      {o.filtros && (
        <div style={{ fontSize: 9.5, marginTop: 8, color: '#8A8A8A' }}>
          <b style={{ color: '#3C3C3C' }}>FILTROS: </b>
          {d.filtros.length ? d.filtros.map((f, i) => <span key={i}>{i > 0 && <span style={{ color: '#C8C8C8' }}> | </span>}{f.etiqueta} <b style={{ color: N900 }}>{f.valor}</b></span>)
            : <><b style={{ color: N900 }}>Ninguno</b> (se muestran todos los registros)</>}
        </div>
      )}
      {(o.encabezado || o.filtros) && <div style={{ borderTop: `1px solid ${N500}`, margin: '10px 0 12px' }} />}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead><tr style={{ background: '#F5F5F5' }}>{d.columnas.map(c => <th key={c.key} style={{ padding: '5px 6px', textAlign: c.align ?? 'left', fontWeight: 600, color: '#5A5A5A', whiteSpace: 'nowrap' }}>{c.label}</th>)}</tr></thead>
        <tbody>
          {d.filas.length === 0 && <tr><td colSpan={d.columnas.length} style={{ padding: 14, color: N700 }}>Sin datos para los filtros aplicados.</td></tr>}
          {d.filas.slice(0, max).map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #EEE' }}>{d.columnas.map(c => <td key={c.key} style={{ padding: '5px 6px', textAlign: c.align ?? 'left', color: '#1E1E1E' }}>{r[c.key]}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {d.filas.length > max && <div style={{ fontSize: 9.5, color: N700, marginTop: 8 }}>… y {d.filas.length - max} filas más en el documento.</div>}
      {d.firmas?.length ? (
        <div style={{ display: 'flex', gap: 24, marginTop: 40 }}>
          {d.firmas.map((f, i) => <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9.5 }}><div style={{ borderTop: '1px solid #888', margin: '0 16px 4px' }} /><b>{f.nombre}</b>{f.cargo && <div style={{ color: N700 }}>{f.cargo}</div>}</div>)}
        </div>
      ) : null}
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${N500}`, paddingTop: 6, marginTop: 20, fontSize: 8, color: '#8A8A8A' }}>
        <b style={{ letterSpacing: '.1em', color: '#3C3C3C' }}>{d.empresa.toUpperCase()}</b><span>Generado {fechaHoraGeneracion()}</span><span>Página 1 de …</span>
      </div>
    </div>
  );
}

export default function ExportarDocumento({ documento, archivo, onClose, marca = '#243B84', impresoras, extra }: {
  documento: DocumentoReporte; archivo: string; onClose: () => void; marca?: string;
  impresoras?: string[];          // impresoras configuradas en Empresa › Impresoras
  extra?: React.ReactNode;        // opciones propias del reporte (p. ej. incluir firmas)
}) {
  const [formato, setFormato] = useState<Formato>('pdf');
  const [o, setO] = useState<OpcionesDoc>({ encabezado: true, filtros: true, tamano: 'libre' });
  const [impresora, setImpresora] = useState((impresoras ?? [])[0] ?? '');
  const [trabajando, setTrabajando] = useState(false);
  const caja = { border: `1px solid ${N500}`, borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column' as const, gap: 10 };
  const titulo = { fontSize: 12.5, fontWeight: 600, color: N900 };
  const check = (k: 'encabezado' | 'filtros', texto: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
      <input type="checkbox" checked={o[k]} onChange={e => setO({ ...o, [k]: e.target.checked })} style={{ accentColor: marca }} />{texto}
    </label>
  );
  async function exportar() {
    setTrabajando(true);
    try {
      if (formato === 'csv') descargarCsv(documento, o, archivo);
      else if (formato === 'xls') descargarXls(documento, o, archivo);
      else await descargarPdf(documento, o, archivo);
    } finally { setTrabajando(false); }
  }
  async function imprimir() { setTrabajando(true); try { await imprimirPdf(documento, o); } finally { setTrabajando(false); } }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div role="dialog" aria-label={`Exportar ${documento.titulo}`} onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, width: 'min(1120px, 96vw)', height: 'min(760px, 94vh)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: FONT, color: N900 }}>
        <div style={{ padding: '14px 22px', borderBottom: `1px solid ${N500}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Exportar o imprimir</div>
            <div style={{ fontSize: 11.5, color: N700 }}>{documento.titulo} · {documento.filas.length} registro{documento.filas.length === 1 ? '' : 's'} · {textoFiltros(documento.filtros)}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', fontSize: 20, color: N700, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, overflow: 'auto', background: N200, padding: 24 }}><VistaPrevia d={documento} o={o} /></div>
          <div style={{ width: 300, borderLeft: `1px solid ${N500}`, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
            <div style={caja}>
              <div style={titulo}>Formato de exportación</div>
              {FORMATOS.map(f => (
                <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: formato === f.id ? '#F1F3FA' : 'transparent' }}>
                  <input type="radio" name="formato" checked={formato === f.id} onChange={() => setFormato(f.id)} style={{ accentColor: marca }} />
                  <span><span style={{ fontSize: 12, fontWeight: 500, display: 'block' }}>{f.nombre}</span><span style={{ fontSize: 11, color: N700 }}>{f.detalle}</span></span>
                </label>
              ))}
            </div>
            <div style={caja}>
              <div style={titulo}>Opciones del documento</div>
              {check('encabezado', 'Mostrar encabezado')}
              {check('filtros', 'Mostrar filtros aplicados')}
              {extra}
            </div>
            {formato === 'pdf' && (
              <div style={caja}>
                <div style={titulo}>Tamaño de página</div>
                {([['libre', 'Tamaño libre', 'Se ajusta automáticamente al contenido'], ['carta', 'Tamaño carta', 'Formato carta (8.5 × 11 in), texto reducido']] as const).map(([v, n, t]) => (
                  <label key={v} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input type="radio" name="tamano" checked={o.tamano === v} onChange={() => setO({ ...o, tamano: v })} style={{ accentColor: marca, marginTop: 2 }} />
                    <span><span style={{ fontSize: 12, fontWeight: 500, display: 'block' }}>{n}</span><span style={{ fontSize: 11, color: N700 }}>{t}</span></span>
                  </label>
                ))}
              </div>
            )}
            <button onClick={exportar} disabled={trabajando}
              style={{ height: 36, background: marca, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 600, fontFamily: FONT, cursor: 'pointer', opacity: trabajando ? 0.6 : 1 }}>Exportar</button>
            <div style={caja}>
              <div style={titulo}>Imprimir</div>
              <select value={impresora} onChange={e => setImpresora(e.target.value)} aria-label="Impresora"
                style={{ height: 32, border: `1px solid ${N500}`, borderRadius: 4, padding: '0 8px', fontSize: 12, fontFamily: FONT, background: '#fff' }}>
                {(impresoras?.length ? impresoras : ['Impresora del sistema']).map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <div style={{ fontSize: 11, color: N700, background: N200, borderRadius: 4, padding: '6px 8px' }}>Documento: {documento.titulo}</div>
              <button onClick={imprimir} disabled={trabajando}
                style={{ height: 34, background: '#fff', color: N900, border: `1px solid ${N500}`, borderRadius: 6, fontSize: 12.5, fontWeight: 500, fontFamily: FONT, cursor: 'pointer' }}>Imprimir</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
