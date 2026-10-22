'use client';
// Guatemala, factura cambiaria: los abonos programados con su vencimiento,
// monto y medio de pago. Cuando el cliente paga, el abono se confirma con la
// fecha del cobro, el medio y, si hay, el número de comprobante.
import { useState } from 'react';
import { C, Button, DataTable, DataRow, Td, StatusBadge, Modal, FormField, Input, Select } from '@/components/ui/primitives';
import { mediosPago, labelMedioPago } from '@/data/catalogosHacienda';
import { type AbonoFcam } from '@/lib/perfilPais';

const fecha = (iso: string) => iso.split('-').reverse().join('/');
const hoy = () => new Date().toISOString().slice(0, 10);

export default function AbonosCambiaria({ documentoId, inicial, moneda, puedeConfirmar }: {
  documentoId: string; inicial: AbonoFcam[]; moneda: (n: number) => string; puedeConfirmar: boolean;
}) {
  const [abonos, setAbonos] = useState<AbonoFcam[]>(inicial);
  const [confirmando, setConfirmando] = useState<{ numero: number; fecha: string; medio: string; comprobante: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cobrado = abonos.filter(a => a.pagado).reduce((s, a) => s + Number(a.monto), 0);
  const total = abonos.reduce((s, a) => s + Number(a.monto), 0);

  async function enviar(cuerpo: Record<string, unknown>) {
    setGuardando(true); setError(null);
    const r = await fetch(`/api/documentos/${documentoId}/abonos`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    const d = await r.json().catch(() => ({}));
    setGuardando(false);
    if (!r.ok) { setError(d.error ?? 'No se pudo guardar.'); return false; }
    setAbonos(d);
    return true;
  }

  const estado = (a: AbonoFcam) => {
    if (a.pagado) return <StatusBadge label={`Cobrado el ${fecha(a.pagado.fecha)}`} color="green" />;
    return a.fechaVencimiento < hoy() ? <StatusBadge label="Vencido" color="red" /> : <StatusBadge label="Pendiente" color="gray" />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12.5 }}>
        <span><span style={{ color: C.n700 }}>Cobrado:</span> <b style={{ fontWeight: 600 }}>{moneda(cobrado)}</b></span>
        <span><span style={{ color: C.n700 }}>Por cobrar:</span> <b style={{ fontWeight: 600 }}>{moneda(total - cobrado)}</b></span>
      </div>
      <DataTable headers={['N.º', 'Vence', 'Monto', 'Medio de pago', 'Estado', '']}>
        {abonos.map(a => (
          <DataRow key={a.numero}>
            <Td mono>{a.numero}</Td>
            <Td>{fecha(a.fechaVencimiento)}</Td>
            <Td mono>{moneda(Number(a.monto))}</Td>
            <Td muted>{a.pagado ? labelMedioPago(a.pagado.medio) : a.medio ? labelMedioPago(a.medio) : 'Sin indicar'}{a.pagado?.comprobante ? ` · ${a.pagado.comprobante}` : ''}</Td>
            <Td>{estado(a)}</Td>
            <Td right>
              {puedeConfirmar && (a.pagado
                ? <Button variant="secondary" onClick={() => enviar({ numero: a.numero, deshacer: true })} disabled={guardando}>Deshacer</Button>
                : <Button onClick={() => { setError(null); setConfirmando({ numero: a.numero, fecha: hoy(), medio: a.medio ?? mediosPago()[0].value, comprobante: '' }); }}>Confirmar pago</Button>)}
            </Td>
          </DataRow>
        ))}
      </DataTable>
      {error && !confirmando && <div style={{ fontSize: 12, color: C.error }}>{error}</div>}

      <Modal open={confirmando !== null} title={confirmando ? `Confirmar pago del abono ${confirmando.numero}` : ''} onClose={() => setConfirmando(null)}
        footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={() => setConfirmando(null)}>Cancelar</Button>
          <Button disabled={guardando} onClick={async () => { if (confirmando && await enviar(confirmando)) setConfirmando(null); }}>{guardando ? 'Guardando…' : 'Confirmar pago'}</Button>
        </div>}>
        {confirmando && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div style={{ fontSize: 12, color: C.error, background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Fecha en que se cobró" required><Input type="date" value={confirmando.fecha} onChange={v => setConfirmando(c => (c ? { ...c, fecha: v } : c))} /></FormField>
              <FormField label="Medio de pago" required>
                <Select value={confirmando.medio} onChange={v => setConfirmando(c => (c ? { ...c, medio: v } : c))} options={mediosPago().map(m => ({ value: m.value, label: m.label }))} />
              </FormField>
            </div>
            <FormField label="N.º de comprobante o autorización" hint="Opcional"><Input value={confirmando.comprobante} onChange={v => setConfirmando(c => (c ? { ...c, comprobante: v } : c))} /></FormField>
          </div>
        )}
      </Modal>
    </div>
  );
}
