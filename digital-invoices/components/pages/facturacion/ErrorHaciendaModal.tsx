'use client';
import { conContabilidad } from '@/lib/modulosCliente';
import { useState } from 'react';
import { C, FONT, Modal, Button } from '@/components/ui/primitives';
import { interpretarError } from '@/lib/erroresHacienda';
import { segunPais } from '@/lib/paisActual';

export default function ErrorHaciendaModal({ doc, onClose, onRefacturar, onReenviar, reenviando }: {
  doc: { tipo: string; numero_factura: string; cliente_nombre: string; estado: string; ultimo_error?: string | null; origen?: string | null };
  onClose: () => void;
  onRefacturar?: () => void;     // abre el formulario ya lleno para corregir
  onReenviar?: () => void;       // solo para «Error»: reenviar el mismo XML
  reenviando?: boolean;
}) {
  const [verDetalle, setVerDetalle] = useState(false);
  const esError = doc.estado === 'Error';
  const casos = interpretarError(doc.ultimo_error);
  const soloConfig = casos.every(c => c.fueraDeLaFactura);
  const deOtroModulo = doc.origen && doc.origen !== 'Manual';

  return (
    <Modal open title={esError ? segunPais('No se pudo enviar a Hacienda') : segunPais('Hacienda rechazó este comprobante')} onClose={onClose} width={560}
      footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        {esError && onReenviar && <Button onClick={onReenviar} disabled={reenviando}>{reenviando ? 'Reenviando…' : segunPais('Reenviar a Hacienda')}</Button>}
        {!esError && onRefacturar && <Button onClick={onRefacturar}>Modificar y refacturar</Button>}
      </div>}>
      <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 12.5 }}>
        <p style={{ margin: 0, color: C.n700 }}>{doc.tipo} {doc.numero_factura} · {doc.cliente_nombre}</p>
        {casos.map(c => (
          <div key={c.id} style={{ border: `1px solid ${C.n500}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.titulo}</div>
            <p style={{ margin: '6px 0 8px', color: C.n900, lineHeight: 1.45 }}>{c.explicacion}</p>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.n700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Cómo resolverlo</div>
            <ol style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>{c.solucion.map(s => <li key={s}>{s}</li>)}</ol>
          </div>
        ))}
        {!esError && (
          <p style={{ margin: 0, color: C.n700, lineHeight: 1.45 }}>
            Un comprobante rechazado no tiene validez{conContabilidad() ? ' y no genera asiento contable' : ''}. Al refacturar se emite uno nuevo con otro número y queda enlazado a este
            {deOtroModulo ? `; también se avisa a ${doc.origen} para que tome el nuevo número.` : '.'}
            {soloConfig ? segunPais(' Corrige primero la configuración indicada; si no, Hacienda lo volverá a rechazar.') : ''}
          </p>
        )}
        <div>
          <button onClick={() => setVerDetalle(v => !v)} style={{ background: 'none', border: 'none', padding: 0, color: C.brand, cursor: 'pointer', fontFamily: FONT, fontSize: 12, textDecoration: 'underline' }}>
            {verDetalle ? segunPais('Ocultar el mensaje de Hacienda') : segunPais('Ver el mensaje de Hacienda')}
          </button>
          {verDetalle && <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, background: C.n200, padding: 10, borderRadius: 6, margin: '8px 0 0' }}>{doc.ultimo_error || segunPais('Hacienda no envió detalle.')}</pre>}
        </div>
      </div>
    </Modal>
  );
}
