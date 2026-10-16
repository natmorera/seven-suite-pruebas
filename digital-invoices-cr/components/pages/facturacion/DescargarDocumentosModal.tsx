'use client';
// Descargar los archivos de un comprobante: PDF (carta, tiquete o formato del
// módulo de origen), XML enviado y respuesta de Hacienda. Si todavía no hay
// respuesta, se consulta a Hacienda en ese momento.
import { useState } from 'react';
import { Modal, C } from '@/components/ui/primitives';
import { descargarComprobantePdf } from './pdfComprobante';
import { descargarTexto } from './descargarTexto';
import { formatosDe, type FormatoImpresion } from './representacion';

export interface DocParaDescarga {
  id: string; numero_factura: string; cliente_nombre: string; fecha_emision: string;
  estado: string; condicion_venta: string; total: number; recurrente?: number | boolean;
  xml: string; respuesta_xml: string | null; origen?: string | null;
}

export default function DescargarDocumentosModal({ open, doc, onClose }: { open: boolean; doc: DocParaDescarga | null; onClose: () => void }) {
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [formato, setFormato] = useState<FormatoImpresion>('carta');
  if (!doc) return null;
  const formatos = formatosDe(doc);
  const idRuta = doc.id.replace('#', '');
  const base = doc.numero_factura || idRuta;

  async function archivos() {
    const r = await fetch(`/api/documentos/${idRuta}/archivos`);
    return r.json() as Promise<{ xml: string; respuesta: string | null; estado: string }>;
  }

  const opciones: { key: string; label: string; ayuda: string; accion: () => Promise<void> }[] = [
    {
      key: 'pdf', label: 'Documento PDF', ayuda: `Representación impresa · ${formatos.find(f => f.value === formato)?.label ?? 'Carta'}`,
      accion: async () => descargarComprobantePdf(doc.id, formato),
    },
    {
      key: 'xml', label: 'XML enviado', ayuda: 'El comprobante electrónico que se envió a Hacienda',
      accion: async () => { const a = await archivos(); descargarTexto(`${base}.xml`, a.xml); },
    },
    {
      key: 'resp', label: 'Respuesta de Hacienda', ayuda: 'XML de aceptación o rechazo',
      accion: async () => {
        let a = await archivos();
        if (!a.respuesta) {
          await fetch(`/api/documentos/${idRuta}/estado`, { method: 'POST' }).catch(() => {});
          a = await archivos();
        }
        if (a.respuesta) descargarTexto(`${base}-respuesta-hacienda.xml`, a.respuesta);
        else setAviso('Hacienda todavía no ha respondido este comprobante. Intenta de nuevo en unos minutos.');
      },
    },
  ];

  return (
    <Modal open={open} title="Descargar documentos" onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: C.n700 }}>Formato del PDF</span>
        {formatos.map(f => (
          <button key={f.value} onClick={() => setFormato(f.value)}
            style={{ height: 28, padding: '0 10px', borderRadius: 14, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
              border: `1px solid ${formato === f.value ? C.brand : C.n500}`, background: formato === f.value ? C.brandBg : '#fff', color: formato === f.value ? C.brand : C.n900 }}>{f.label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {opciones.map(o => (
          <button key={o.key} disabled={trabajando !== null}
            onClick={async () => { setAviso(null); setTrabajando(o.key); try { await o.accion(); } finally { setTrabajando(null); } }}
            style={{
              flex: '1 1 170px', minHeight: 72, border: `1px solid ${C.n500}`, borderRadius: 10, padding: '12px 16px',
              background: '#fff', textAlign: 'left', color: C.n900, cursor: trabajando ? 'wait' : 'pointer', fontFamily: 'inherit',
            }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{trabajando === o.key ? 'Preparando…' : o.label}</div>
            <div style={{ fontSize: 11, color: C.n700, marginTop: 4 }}>{o.ayuda}</div>
          </button>
        ))}
      </div>
      {aviso && <p style={{ fontSize: 12, color: C.n700, margin: '12px 0 0' }}>{aviso}</p>}
    </Modal>
  );
}
