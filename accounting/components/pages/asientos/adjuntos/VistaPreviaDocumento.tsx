'use client';
import { Modal } from '@/components/ui/primitives';
import { C, FONT, radius } from '@/components/ui/tokens';
import { Button } from '@/components/ui/formulario';
import { tipoDeArchivo, lineasDocumento, montoTexto, xmlDocumento, hojaDocumento, descargarDocumento, type ContextoDocumento } from './documentoEjemplo';

function PaginaPdf({ nombre, c }: { nombre: string; c: ContextoDocumento }) {
  const celda = { padding: '8px 10px', borderBottom: `1px solid ${C.n500}`, fontSize: 12, color: C.n900 } as const;
  return (
    <div style={{ background: C.n200, padding: 24, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 620, background: C.n000, boxShadow: '0 2px 10px rgba(0,0,0,.08)', padding: '32px 36px', fontFamily: FONT }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderBottom: `2px solid ${C.n900}`, paddingBottom: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.n900 }}>{c.empresa}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.n700 }}>Identificación {c.identificacion}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.n900 }}>{nombre}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.n700 }}>Fecha {c.fecha}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.n700 }}>Asiento {c.consecutivo}</p>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 18 }}>
          <thead>
            <tr>
              <th style={{ ...celda, textAlign: 'left', fontWeight: 500, color: C.n700, fontSize: 11 }}>Descripción</th>
              <th style={{ ...celda, textAlign: 'right', fontWeight: 500, color: C.n700, fontSize: 11 }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {lineasDocumento(c).map(l => (
              <tr key={l.linea}><td style={celda}>{l.descripcion}</td><td style={{ ...celda, textAlign: 'right', whiteSpace: 'nowrap' }}>{montoTexto(c, l.monto)}</td></tr>
            ))}
            <tr>
              <td style={{ ...celda, fontWeight: 600, borderBottom: 'none' }}>Total</td>
              <td style={{ ...celda, fontWeight: 600, borderBottom: 'none', textAlign: 'right', whiteSpace: 'nowrap' }}>{montoTexto(c, c.importe)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Hoja({ c }: { c: ContextoDocumento }) {
  const [encabezado, ...filas] = hojaDocumento(c);
  const celda = { padding: '6px 10px', border: `1px solid ${C.n500}`, fontSize: 12, color: C.n900 } as const;
  return (
    <div style={{ padding: 16, overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', minWidth: '100%', fontFamily: FONT }}>
        <thead><tr>{encabezado.map(h => <th key={h} style={{ ...celda, background: C.n200, fontWeight: 500, textAlign: 'left' }}>{h}</th>)}</tr></thead>
        <tbody>{filas.map(f => <tr key={f[0]}>{f.map((v, i) => <td key={i} style={{ ...celda, textAlign: i >= 2 ? 'right' : 'left' }}>{v}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function VistaPreviaDocumento({ nombre, contexto, onClose }: { nombre: string; contexto: ContextoDocumento; onClose: () => void }) {
  const tipo = tipoDeArchivo(nombre);
  return (
    <Modal open wide title={nombre} hint="Vista previa del documento adjunto al asiento." onClose={onClose}
      footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        <Button onClick={() => descargarDocumento(nombre, contexto)}>Descargar</Button>
      </div>}>
      <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden', minHeight: 320 }}>
        {tipo === 'pdf' && <PaginaPdf nombre={nombre} c={contexto} />}
        {tipo === 'xml' && (
          <pre style={{ margin: 0, padding: 16, fontSize: 12, lineHeight: 1.55, color: C.n900, background: C.n200, overflow: 'auto', maxHeight: '60vh', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{xmlDocumento(nombre, contexto)}</pre>
        )}
        {tipo === 'hoja' && <Hoja c={contexto} />}
        {(tipo === 'imagen' || tipo === 'otro') && (
          <p style={{ margin: 0, padding: 40, textAlign: 'center', fontSize: 12, color: C.n700 }}>Este tipo de archivo no tiene vista previa. Use «Descargar» para abrirlo.</p>
        )}
      </div>
    </Modal>
  );
}
