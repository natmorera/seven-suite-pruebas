'use client';
// Programar un documento como recurrente: cada cuánto se repite, cuándo toca
// la siguiente y hasta cuándo. Al llegar la fecha, el documento aparece en
// «Recurrentes por emitir» para revisarlo y emitirlo con un clic.
import { useState } from 'react';
import { C, Button, FormField, Input, Select, Modal, radius } from '@/components/ui/primitives';
import { FRECUENCIAS, siguienteFecha } from '@/lib/recurrencia';

export interface Recurrencia { id: string; documento_id: string; frecuencia: string; proxima: string; fin: string; activa: number; emitidas?: number; ultima?: string; numero_factura?: string; cliente_nombre?: string; creado?: string; modo?: string; ultimo_error?: string }
export type ModoRec = 'automatica' | 'revisar';

// Qué pasa cuando llega la fecha: se pregunta al activar la recurrencia.
export function ModoRecurrencia({ valor, onCambiar }: { valor: ModoRec; onCambiar: (m: ModoRec) => void }) {
  const opcion = (m: ModoRec, titulo: string, texto: string) => (
    <label style={{ flex: '1 1 200px', display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', padding: '10px 12px', borderRadius: radius.md,
      border: `1px solid ${valor === m ? C.brand : C.n500}`, background: valor === m ? C.brandBg : '#fff' }}>
      <input type="radio" checked={valor === m} onChange={() => onCambiar(m)} style={{ accentColor: C.brand, marginTop: 2 }} />
      <span><span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: C.n900 }}>{titulo}</span><span style={{ fontSize: 11.5, color: C.n700 }}>{texto}</span></span>
    </label>
  );
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 500, color: C.n900, marginBottom: 6 }}>Cuando llegue la fecha</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {opcion('revisar', 'Avisarme para revisarla', 'Aparece como «Por emitir» y la emites con un clic.')}
        {opcion('automatica', 'Emitirla automáticamente', 'Se emite y se envía sola, igual a la anterior.')}
      </div>
    </div>
  );
}

export default function RecurrenciaModal({ documento, actual, onClose, onGuardado }: {
  documento: { id: string; numero_factura: string; cliente_nombre: string; fecha_emision: string };
  actual?: Recurrencia | null;
  onClose: () => void;
  onGuardado: (mensaje: string) => void;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [frecuencia, setFrecuencia] = useState(actual?.frecuencia ?? 'mensual');
  const [proxima, setProxima] = useState(actual?.proxima ?? siguienteFecha(documento.fecha_emision.slice(0, 10) > hoy ? documento.fecha_emision.slice(0, 10) : hoy, 'mensual'));
  const [fin, setFin] = useState(actual?.fin ?? '');
  const [modo, setModo] = useState<ModoRec>(actual?.modo === 'automatica' ? 'automatica' : 'revisar');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true); setError(null);
    const r = await fetch('/api/recurrentes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentoId: documento.id, frecuencia, proxima, fin, modo }) });
    setGuardando(false);
    if (!r.ok) { setError((await r.json()).error ?? 'No se pudo guardar.'); return; }
    onGuardado(`La factura ${documento.numero_factura} se repetirá ${FRECUENCIAS.find(f => f.value === frecuencia)?.label.toLowerCase()}.`);
  }
  async function quitar() {
    if (!window.confirm('¿Dejar de repetir esta factura?')) return;
    await fetch(`/api/recurrentes?documento=${encodeURIComponent(documento.id)}`, { method: 'DELETE' });
    onGuardado(`La factura ${documento.numero_factura} ya no se repite.`);
  }

  return (
    <Modal open width={600} title={actual ? 'Editar factura recurrente' : 'Hacer recurrente'} onClose={onClose}
      footer={<div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div>{actual && <Button variant="secondary" onClick={quitar} style={{ color: C.error }}>Dejar de repetir</Button>}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>
          Se repite la factura <b style={{ color: C.n900 }}>{documento.numero_factura}</b> de {documento.cliente_nombre} con las mismas líneas y el mismo cliente.
        </p>
        <FormField label="Frecuencia" required>
          <Select value={frecuencia} onChange={setFrecuencia} options={FRECUENCIAS} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Próxima factura" required><Input type="date" value={proxima} onChange={setProxima} /></FormField>
          <FormField label="Terminar el (opcional)" hint="Déjalo vacío para repetir sin fecha de fin."><Input type="date" value={fin} onChange={setFin} /></FormField>
        </div>
        <ModoRecurrencia valor={modo} onCambiar={setModo} />
        {actual?.emitidas ? <p style={{ fontSize: 11.5, color: C.n700, margin: 0 }}>Ya se emitieron {actual.emitidas} con esta programación.</p> : null}
        {error && <div style={{ fontSize: 12, color: C.error }}>{error}</div>}
      </div>
    </Modal>
  );
}
