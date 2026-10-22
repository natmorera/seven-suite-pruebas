'use client';
import { celdaMonto } from '@/components/suite/Monto';
// Reporte estándar: impresión, exportación (CSV / XLS / PDF) y documento con encabezado, filtros y pie paginado.
import { Fragment, useState, type CSSProperties, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Select } from '@/components/suite/ui';
import { Popover, descargarCSV, descargarXLS } from '@/components/configuracion/kit';
import { usePrint } from '@/components/hotel/ui';
import { useEmpresa } from '@/components/layout/Shell';
import { HOY, fmtF } from '@/components/hotel/datos';
import { type Filtros } from './filtros';
import { esDato, type DatosReporte, type Valor } from './modelo';

// ── Imprimir / Exportar ─────────────────────────────────────────────────────
const IcImpresora = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7z" /></svg>;
const IcExport = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" /><path d="M12 11v6M9.5 14.5 12 17l2.5-2.5" /></svg>;
const IcHoja = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 10h16M4 15h16M10 4v16" /></svg>;
const IcDoc = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" /><path d="M14 3v5h5" /></svg>;
const tituloPop: CSSProperties = { fontSize: 14, fontWeight: 600, color: C.n900, margin: 0 };
const sep: CSSProperties = { borderTop: `1px solid ${C.n500}`, margin: '4px -16px' };

function OpcionesDoc({ enc, setEnc, fil, setFil }: { enc: boolean; setEnc: (v: boolean) => void; fil: boolean; setFil: (v: boolean) => void }) {
  const c = (label: string, v: boolean, set: (v: boolean) => void) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: C.n900, cursor: 'pointer', position: 'relative' }}>
      <input type="checkbox" checked={v} onChange={e => set(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: 18, height: 18, margin: 0 }} />
      <span aria-hidden style={{ width: 18, height: 18, borderRadius: 4, boxSizing: 'border-box', border: `1.5px solid ${v ? C.brand : '#D6D6DB'}`, background: v ? C.brand : C.n000, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {v && <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.33 7L5.25 9.92L11.67 4.08" /></svg>}
      </span>{label}
    </label>
  );
  return <>
    <p style={tituloPop}>Opciones del documento</p>
    {c('Mostrar encabezado', enc, setEnc)}
    {c('Mostrar filtros aplicados', fil, setFil)}
  </>;
}

export function BotonImprimir({ titulo, paginas, doc, disabled }: { titulo: string; paginas: number; doc: (enc: boolean, fil: boolean) => ReactNode; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [impresora, setImpresora] = useState('');
  const [enc, setEnc] = useState(true);
  const [fil, setFil] = useState(true);
  const { imprimir, portal } = usePrint();
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <Button variant="secondary" disabled={disabled} onClick={() => setOpen(o => !o)}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><IcImpresora />Imprimir</span></Button>
      <Popover open={open} onClose={() => setOpen(false)} width={320} align="right">
        <div role="dialog" aria-label="Imprimir" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT }}>
          <p style={tituloPop}>Selecciona impresora</p>
          <Select value={impresora} onChange={setImpresora} options={[{ value: '', label: 'Seleccionar impresora' }, { value: 'sistema', label: 'Predeterminada del sistema' }, { value: 'recepcion', label: 'Recepción · HP LaserJet' }, { value: 'pdf', label: 'Guardar como PDF' }]} />
          <span style={{ background: C.brandBg, color: C.n700, borderRadius: radius.md, padding: '8px 12px', fontSize: 12.5 }}>Documento: {titulo} · {paginas} página{paginas === 1 ? '' : 's'}</span>
          <div style={sep} />
          <OpcionesDoc enc={enc} setEnc={setEnc} fil={fil} setFil={setFil} />
          <div style={sep} />
          <Button onClick={() => { setOpen(false); imprimir(doc(enc, fil)); }}>Imprimir</Button>
        </div>
      </Popover>
      {portal}
    </span>
  );
}

/** Filas planas para CSV / XLS. */
export function filasPlanas(d: DatosReporte): Valor[][] {
  return d.bloques.flatMap((b, i) => [
    ...(i ? [[] as Valor[]] : []),
    ...(b.titulo ? [[b.titulo]] : []),
    b.columnas.map(c => c.label),
    ...b.filas.map(f => (f.tipo === 'grupo' ? [f.texto] : f.c)),
    ...(b.total ? [b.total] : []),
  ]);
}

export function BotonExportarReporte({ titulo, periodo, filtros, datos, archivo, doc, disabled }: { titulo: string; periodo?: string; filtros: Filtros; datos: DatosReporte; archivo: string; doc: (enc: boolean, fil: boolean) => ReactNode; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [fmt, setFmt] = useState<'CSV' | 'XLS' | 'PDF'>('CSV');
  const [enc, setEnc] = useState(true);
  const [fil, setFil] = useState(false);
  const empresa = useEmpresa();
  const { imprimir, portal } = usePrint();
  const exportar = () => {
    setOpen(false);
    if (fmt === 'PDF') return imprimir(doc(enc, fil));
    const cab: Valor[][] = [
      ...(enc ? [[empresa.toUpperCase()], [titulo], ...(periodo ? [[`Período: ${periodo}`]] : [])] : []),
      ...(fil ? [[`Filtros: ${filtros.linea.length ? filtros.linea.map(([l, v]) => `${l} ${v}`).join(' | ') : 'Ninguno'}`]] : []),
      ...(enc || fil ? [[]] : []),
    ];
    const nombre = `${archivo}-${HOY}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').toLowerCase();
    const filas = [...cab, ...filasPlanas(datos)];
    if (fmt === 'XLS') descargarXLS(`${nombre}.xls`, filas); else descargarCSV(`${nombre}.csv`, filas);
  };
  const opcion = (v: 'CSV' | 'XLS' | 'PDF', icono: ReactNode, det: string) => (
    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', cursor: 'pointer', position: 'relative' }}>
      <input type="radio" name="fmt-reporte" checked={fmt === v} onChange={() => setFmt(v)} style={{ position: 'absolute', opacity: 0, width: 18, height: 18, margin: 0 }} />
      <span aria-hidden style={{ width: 18, height: 18, borderRadius: '50%', boxSizing: 'border-box', border: `1.5px solid ${fmt === v ? C.brand : '#B8B8BF'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{fmt === v && <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.brand }} />}</span>
      <span style={{ color: C.n700, display: 'inline-flex' }}>{icono}</span>
      <span><span style={{ display: 'block', fontSize: 13, color: C.n900, fontWeight: 500 }}>{v}</span><span style={{ display: 'block', fontSize: 12, color: C.n700 }}>{det}</span></span>
    </label>
  );
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <Button variant="secondary" disabled={disabled} onClick={() => setOpen(o => !o)}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><IcExport />Exportar</span></Button>
      <Popover open={open} onClose={() => setOpen(false)} width={320} align="right">
        <div role="dialog" aria-label="Exportar" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, fontFamily: FONT }}>
          <p style={tituloPop}>Formato de exportación</p>
          {opcion('CSV', <IcHoja />, 'Archivo separado por comas')}
          {opcion('XLS', <IcHoja />, 'Hoja de cálculo Excel')}
          {opcion('PDF', <IcDoc />, 'Documento PDF')}
          <div style={sep} />
          <OpcionesDoc enc={enc} setEnc={setEnc} fil={fil} setFil={setFil} />
          <div style={sep} />
          <Button onClick={exportar}>Exportar</Button>
        </div>
      </Popover>
      {portal}
    </span>
  );
}

// ── Documento (impresión / PDF) ─────────────────────────────────────────────
const cssLit = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

export function DocumentoReporte({ titulo, periodo, linea, encabezado = true, datos }: { titulo: string; periodo?: string; linea: [string, string][] | null; encabezado?: boolean; datos: DatosReporte }) {
  const empresa = useEmpresa().toUpperCase();
  const ahora = new Date();
  const hora = ahora.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  const generado = `Generado: ${fmtF(HOY)} · ${hora}`;
  const thD: CSSProperties = { padding: '8px 10px', background: '#F5F5F5', color: '#555', fontWeight: 500, fontSize: 10.5, textAlign: 'left', whiteSpace: 'nowrap' };
  const tdD: CSSProperties = { padding: '7px 10px', fontSize: 10.5, color: '#333', borderBottom: '1px solid #EEEEEE' };
  return (
    <div style={{ fontFamily: FONT, color: '#222', width: '100%' }}>
      {/* Pie en todas las páginas y encabezado compacto desde la segunda (márgenes de página) */}
      <style>{`
        @page { size: auto; margin: 16mm 12mm 18mm;
          @bottom-left { content: ${cssLit(empresa)}; font: 700 8pt ${FONT.split(',')[0]}, sans-serif; letter-spacing: 1.5px; color: #444; }
          @bottom-center { content: ${cssLit(generado)}; font: 7.5pt ${FONT.split(',')[0]}, sans-serif; color: #777; }
          @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 7.5pt ${FONT.split(',')[0]}, sans-serif; color: #777; }
          @top-left { content: ${cssLit(`${titulo}${periodo ? ` · ${periodo}` : ''}`)}; font: 600 8.5pt ${FONT.split(',')[0]}, sans-serif; color: #333; }
          @top-right { content: "Pág. " counter(page) " de " counter(pages); font: 7.5pt ${FONT.split(',')[0]}, sans-serif; color: #777; }
        }
        @page :first { @top-left { content: none; } @top-right { content: none; } }
        #area-impresion table { break-inside: auto; }
        #area-impresion thead { display: table-header-group; }
        #area-impresion tr { break-inside: avoid; }
      `}</style>
      {encabezado && <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <span aria-hidden style={{ width: 20, height: 20, borderRadius: 5, background: '#223A8C', display: 'inline-block', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 2, color: '#444' }}>{empresa}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#222' }}>{titulo}</h1>
          {periodo && <span style={{ textAlign: 'right', fontSize: 10.5, color: '#777', whiteSpace: 'nowrap' }}>Período<br /><b style={{ color: '#222', fontWeight: 600 }}>{periodo}</b></span>}
        </div>
      </>}
      {linea && (
        <p style={{ margin: encabezado ? '12px 0 0' : 0, fontSize: 9.5, color: '#8A8A8A', lineHeight: 1.7 }}>
          <span style={{ color: '#222', fontWeight: 600, marginRight: 6 }}>FILTROS:</span>
          {linea.length ? linea.map(([l, v], i) => <Fragment key={l}>{i > 0 && <span style={{ margin: '0 8px', color: '#CCC' }}>|</span>}{l} <b style={{ color: '#222', fontWeight: 600 }}>{v}</b></Fragment>)
            : <><b style={{ color: '#222', fontWeight: 600 }}>Ninguno</b> (se muestran todos los registros)</>}
        </p>
      )}
      {(encabezado || linea) && <div style={{ borderTop: '1px solid #DDD', margin: '14px 0 16px' }} />}
      {datos.bloques.map((b, k) => (
        <div key={k} style={{ marginBottom: 18 }}>
          {b.titulo && <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600 }}>{b.titulo}</p>}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              {b.grupos && <tr>{b.grupos.map((g, i) => <th key={i} colSpan={g.span} style={{ ...thD, textAlign: 'center', color: '#222' }}>{g.label}</th>)}</tr>}
              <tr>{b.columnas.map((c, i) => <th key={i} style={{ ...thD, textAlign: c.der ? 'right' : 'left' }}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {!b.filas.length && <tr><td colSpan={b.columnas.length} style={{ ...tdD, color: '#888' }}>Sin registros.</td></tr>}
              {b.filas.map((f, i) => f.tipo === 'grupo'
                ? <tr key={i}><td colSpan={b.columnas.length} style={{ ...tdD, fontWeight: 600, background: '#FAFAFA', paddingLeft: f.sub ? 22 : 10 }}>{f.texto}</td></tr>
                : <tr key={i}>{f.c.map((v, j) => <td key={j} style={{ ...tdD, textAlign: b.columnas[j]?.der ? 'right' : 'left', fontWeight: f.tipo === 'subtotal' || (esDato(f) && f.negrita) ? 600 : 400, fontVariantNumeric: 'tabular-nums' }}>{celdaMonto(v)}</td>)}</tr>)}
            </tbody>
            {b.total && <tfoot style={{ display: 'table-row-group' }}><tr>{b.total.map((v, j) => <td key={j} style={{ ...tdD, fontWeight: 700, background: '#F2F3F5', borderBottom: 'none', textAlign: b.columnas[j]?.der ? 'right' : 'left' }}>{v}</td>)}</tr></tfoot>}
          </table>
        </div>
      ))}
      {datos.nota && <p style={{ fontSize: 9, color: '#777', marginTop: 8 }}>{datos.nota}</p>}
    </div>
  );
}
