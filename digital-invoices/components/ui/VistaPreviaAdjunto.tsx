'use client';
// Vista previa de adjuntos y documentos sin descargarlos: facturas
// electrónicas (con su representación impresa), PDF e imágenes subidos en la
// sesión y, para los adjuntos de ejemplo, una vista de muestra.
import { useEffect, useState } from 'react';
import { C, FONT, radius } from '@/components/ui/primitives';
import VistaImpresa from '@/components/pages/facturacion/VistaImpresa';
import type { DocCompleto } from '@/components/pages/facturacion/representacion';
import { tipoDeArchivo, lineasDocumento, montoTexto, xmlDocumento, hojaDocumento, descargarDocumento, type ContextoDocumento } from './documentoEjemplo';

// Datos del asiento u operación para armar la vista de los adjuntos de ejemplo
export type ContextoAdjunto = Omit<ContextoDocumento, 'empresa' | 'identificacion'>;

export interface ArchivoPrevia { nombre: string; documentoId?: string | null }

// Contenido de los archivos subidos en esta sesión (el prototipo solo guarda el nombre)
const contenidos = new Map<string, string>();
export function guardarContenidoArchivo(nombre: string, archivo: File) {
  const lector = new FileReader();
  lector.onload = () => { if (typeof lector.result === 'string') contenidos.set(nombre, lector.result); };
  lector.readAsDataURL(archivo);
}

const extension = (n: string) => (n.split('.').pop() ?? '').toLowerCase();

function DocumentoElectronico({ id }: { id: string }) {
  const [doc, setDoc] = useState<DocCompleto | null | undefined>(undefined);
  useEffect(() => {
    let vivo = true;
    fetch(`/api/documentos/${id.replace('#', '')}`).then(r => (r.ok ? r.json() : null)).then(d => { if (vivo) setDoc(d); }).catch(() => { if (vivo) setDoc(null); });
    return () => { vivo = false; };
  }, [id]);
  if (doc === undefined) return <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p>;
  if (!doc) return <p style={{ fontSize: 12, color: C.n700 }}>No se encontró el documento.</p>;
  return <VistaImpresa doc={doc} formato="carta" />;
}

// Adjunto de ejemplo: con los datos del asiento se arma la página (PDF), el
// XML o la hoja, como en Accounting; sin ellos, una hoja de muestra.
function Muestra({ nombre, c }: { nombre: string; c: ContextoDocumento | null }) {
  const ext = extension(nombre);
  const hoja = { background: '#fff', border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 24, maxWidth: 640, margin: '0 auto', fontSize: 12 };
  const nota = <p style={{ fontSize: 11, color: C.n700, textAlign: 'center', margin: '0 0 12px' }}>Documento de ejemplo: el prototipo no guarda el contenido de los adjuntos.</p>;
  if (c && tipoDeArchivo(nombre) === 'xml') {
    return <>{nota}<pre style={{ ...hoja, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace', fontSize: 11.5, overflowX: 'auto' }}>{xmlDocumento(nombre, c)}</pre></>;
  }
  if (c && tipoDeArchivo(nombre) === 'hoja') {
    const filas = hojaDocumento(c);
    return <>{nota}<div style={hoja}>
      <div style={{ fontWeight: 600, marginBottom: 10 }}>{nombre}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{filas[0].map(h => <th key={h} style={{ border: `1px solid ${C.n500}`, background: C.n200, padding: 6, fontWeight: 500, textAlign: 'left' }}>{h}</th>)}</tr></thead>
        <tbody>{filas.slice(1).map((f, k) => <tr key={k}>{f.map((v, x) => <td key={x} style={{ border: `1px solid ${C.n500}`, padding: 6, textAlign: x === 3 ? 'right' : 'left' }}>{v}</td>)}</tr>)}</tbody>
      </table>
    </div></>;
  }
  if (c && tipoDeArchivo(nombre) === 'pdf') {
    const celda = { padding: '8px 10px', borderBottom: `1px solid ${C.n500}`, fontSize: 12 } as const;
    return <>{nota}<div style={{ ...hoja, padding: '32px 36px', boxShadow: '0 2px 10px rgba(0,0,0,.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderBottom: `2px solid ${C.n900}`, paddingBottom: 12 }}>
        <div><div style={{ fontSize: 15, fontWeight: 600 }}>{c.empresa}</div><div style={{ fontSize: 11, color: C.n700 }}>Identificación {c.identificacion}</div></div>
        <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 600 }}>{nombre}</div><div style={{ fontSize: 11, color: C.n700 }}>Fecha {c.fecha}</div><div style={{ fontSize: 11, color: C.n700 }}>Asiento {c.consecutivo}</div></div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 18 }}>
        <thead><tr><th style={{ ...celda, textAlign: 'left', fontWeight: 500, color: C.n700, fontSize: 11 }}>Descripción</th><th style={{ ...celda, textAlign: 'right', fontWeight: 500, color: C.n700, fontSize: 11 }}>Monto</th></tr></thead>
        <tbody>{lineasDocumento(c).map(l => <tr key={l.linea}><td style={celda}>{l.descripcion}</td><td style={{ ...celda, textAlign: 'right' }}>{montoTexto(c, l.monto)}</td></tr>)}</tbody>
        <tfoot><tr><td style={{ ...celda, fontWeight: 600 }}>Total</td><td style={{ ...celda, textAlign: 'right', fontWeight: 600 }}>{montoTexto(c, c.importe)}</td></tr></tfoot>
      </table>
    </div></>;
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return <>{nota}<div style={{ ...hoja, height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.n200, color: C.n700 }}>{nombre}</div></>;
  }
  return <>{nota}<div style={{ ...hoja, minHeight: 420 }}>
    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>{nombre}</div>
    {[90, 75, 82, 60, 88, 70, 40].map((w, i) => <div key={i} style={{ height: 8, width: `${w}%`, background: C.n200, borderRadius: 4, marginBottom: 12 }} />)}
  </div></>;
}

function bajarDataUrl(nombre: string, url: string) {
  const a = document.createElement('a'); a.href = url; a.download = nombre; a.click();
}

export default function VistaPreviaAdjunto({ titulo, archivos, inicial = 0, onClose, contexto }: {
  titulo: string; archivos: ArchivoPrevia[]; inicial?: number; onClose: () => void; contexto?: ContextoAdjunto;
}) {
  const [empresa, setEmpresa] = useState<{ nombre: string; id: string } | null>(null);
  useEffect(() => {
    if (!contexto) return;
    let vivo = true;
    fetch('/api/empresa').then(r => r.json()).then(d => { if (vivo) setEmpresa({ nombre: d?.datos?.nombreLegal ?? '', id: d?.datos?.numeroId ?? '' }); }).catch(() => {});
    return () => { vivo = false; };
  }, [contexto]);
  const ctx: ContextoDocumento | null = contexto ? { ...contexto, empresa: empresa?.nombre ?? '', identificacion: empresa?.id ?? '' } : null;
  const [i, setI] = useState(Math.min(inicial, Math.max(0, archivos.length - 1)));
  const actual = archivos[i];
  const contenido = actual && !actual.documentoId ? contenidos.get(actual.nombre) : undefined;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label={titulo}
        style={{ background: '#fff', borderRadius: radius.lg, width: '100%', maxWidth: 1080, height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: FONT }}>
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.n500}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</span>
          {actual && (actual.documentoId
            ? <a href={`/facturacion/emitidos/${actual.documentoId.replace('#', '')}`} style={{ fontSize: 12, color: C.brand, fontWeight: 500 }}>Abrir documento</a>
            : (contenido || ctx) && <button onClick={() => { if (contenido) bajarDataUrl(actual.nombre, contenido); else if (ctx) descargarDocumento(actual.nombre, ctx); }}
                style={{ height: 30, padding: '0 12px', border: `1px solid ${C.n500}`, borderRadius: radius.md, background: '#fff', cursor: 'pointer', fontSize: 12, fontFamily: FONT }}>Descargar</button>)}
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, fontSize: 20 }}>×</button>
        </div>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {archivos.length > 1 && (
            <div style={{ width: 240, borderRight: `1px solid ${C.n500}`, overflowY: 'auto', padding: 8, flexShrink: 0 }}>
              {archivos.map((a, k) => (
                <button key={`${a.nombre}-${k}`} onClick={() => setI(k)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 4, border: `1px solid ${k === i ? C.brandBd : 'transparent'}`, background: k === i ? C.brandBg : 'none', borderRadius: radius.md, cursor: 'pointer', fontSize: 12, fontFamily: FONT, color: C.n900 }}>
                  {a.nombre}
                  {a.documentoId && <div style={{ fontSize: 10.5, color: C.n700 }}>Documento electrónico</div>}
                </button>
              ))}
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: C.n200 }}>
            {!actual ? <p style={{ fontSize: 12, color: C.n700 }}>No hay archivos.</p>
              : actual.documentoId ? <DocumentoElectronico id={actual.documentoId} />
              // eslint-disable-next-line @next/next/no-img-element -- imagen local de la sesión (data URL)
              : contenido && contenido.startsWith('data:image') ? <img src={contenido} alt={actual.nombre} style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} />
              : contenido ? <iframe src={contenido} title={actual.nombre} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} />
              : <Muestra nombre={actual.nombre} c={ctx} />}
          </div>
        </div>
      </div>
    </div>
  );
}
