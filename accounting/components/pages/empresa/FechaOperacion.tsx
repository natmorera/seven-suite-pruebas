'use client';
// Sección «Fecha de operación» de Datos de empresa y su modal para ver el
// historial de cambios y fijarla a mano.
import { useState } from 'react';
import { Modal, Section } from '@/components/ui/primitives';
import { C, FONT, radius } from '@/components/ui/tokens';
import { Button, FormField, Input } from '@/components/ui/formulario';
import { fechaOperacionAlmacen, cambiarFechaOperacion, fechaCorta, type FechaOperacion } from './datos/fechaOperacion';
import { useAlmacen } from './datos/almacen';

const DESCRIPCION = 'El día de operación de la empresa. Un sistema integrado (por ejemplo, el cierre de día del PMS o del punto de venta) puede adelantarla; aquí puede fijarla a mano.';

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <>
      <dt style={{ fontSize: 12, color: C.n700 }}>{etiqueta}</dt>
      <dd style={{ margin: 0, fontSize: 12, color: C.n900 }}>{children}</dd>
    </>
  );
}

export default function SeccionFechaOperacion() {
  const fecha = useAlmacen(fechaOperacionAlmacen);
  const [abierto, setAbierto] = useState(false);
  return (
    <Section title="Fecha de operación" hint={DESCRIPCION}
      actions={<Button variant="secondary" onClick={() => setAbierto(true)}>Ver historial o cambiar</Button>}>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 24, rowGap: 6, fontFamily: FONT }}>
        <Dato etiqueta="Fecha actual"><b style={{ fontWeight: 600 }}>{fechaCorta(fecha.fecha)}</b></Dato>
        <Dato etiqueta="Origen">{fecha.origen}</Dato>
      </dl>
      {abierto && <ModalFechaOperacion fecha={fecha} onClose={() => setAbierto(false)} />}
    </Section>
  );
}

function ModalFechaOperacion({ fecha, onClose }: { fecha: FechaOperacion; onClose: () => void }) {
  const [nueva, setNueva] = useState('');
  const [motivo, setMotivo] = useState('');
  const ultimo = fecha.historial[0];
  const igual = nueva === fecha.fecha;
  function guardar() { cambiarFechaOperacion(nueva, motivo); onClose(); }
  return (
    <Modal open title="Fecha de operación" hint={DESCRIPCION} onClose={onClose}
      footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar} disabled={!nueva || igual}>Guardar</Button>
      </div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: FONT }}>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 24, rowGap: 6 }}>
          <Dato etiqueta="Fecha actual"><b style={{ fontWeight: 600 }}>{fechaCorta(fecha.fecha)}</b></Dato>
          <Dato etiqueta="Origen">{fecha.origen}</Dato>
          {ultimo && <Dato etiqueta="Último cambio">{ultimo.usuario}, {ultimo.momento}</Dato>}
        </dl>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 14 }}>
          <FormField label="Nueva fecha" required error={igual ? 'Es la fecha actual.' : undefined}>
            <Input type="date" value={nueva} onChange={setNueva} />
          </FormField>
          <FormField label="Motivo">
            <Input value={motivo} onChange={setMotivo} />
          </FormField>
        </div>
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 500, color: C.n700, letterSpacing: '.04em', textTransform: 'uppercase' }}>Últimos cambios</p>
          <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, maxHeight: 220, overflowY: 'auto' }}>
            {fecha.historial.length === 0 && <p style={{ margin: 0, padding: '12px 14px', fontSize: 12, color: C.n700 }}>Sin cambios registrados.</p>}
            {fecha.historial.map((h, i) => (
              <div key={i} style={{ padding: '10px 14px', borderTop: i ? `1px solid ${C.n500}` : 'none' }}>
                <div style={{ fontSize: 12, color: C.n900 }}>
                  {fechaCorta(h.anterior)} → <b style={{ fontWeight: 600 }}>{fechaCorta(h.nueva)}</b>
                  <span style={{ color: C.n700, marginLeft: 10 }}>{h.origen}</span>
                </div>
                <div style={{ fontSize: 11, color: C.n700, marginTop: 2 }}>{h.usuario}, {h.momento}{h.motivo ? ` · ${h.motivo}` : ''}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
