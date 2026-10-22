'use client';
// Registrar un documento físico de compra (papel): factura, nota de crédito o
// de débito, o factura cambiaria. No pasa por un certificador; queda en el
// libro de compras y, con Contabilidad, con su asiento.
import { useEffect, useState } from 'react';
import { C, Modal, Button, FormField, Input, Select } from '@/components/ui/primitives';
import { CuentaCampo } from './CuentaPicker';
import { conContabilidad } from '@/lib/modulosCliente';
import { COMPRAS_FISICAS, nitValido } from '@/lib/perfilPais';

const r2 = (n: number) => Math.round(n * 100) / 100;
const hoy = () => new Date().toISOString().slice(0, 10);

export default function CompraFisicaModal({ onClose, onCreado }: { onClose: () => void; onCreado: (mensaje: string) => void }) {
  const contabilidad = conContabilidad();
  const [f, setF] = useState({
    tipo: COMPRAS_FISICAS[0].codigo, nit: '', proveedor: '', serie: '', numero: '', fecha: hoy(),
    total: '', conIva: true, credito: 'pleno', cuenta: '', detalle: '',
  });
  const [error, setError] = useState('');
  // Mi empresa es siempre el receptor: se muestra a la derecha, como en todas las compras
  const [empresa, setEmpresa] = useState<{ nombre: string; nit: string } | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch('/api/empresa').then(r => r.json()).then(d => { if (vivo) setEmpresa({ nombre: d?.datos?.nombreLegal ?? '', nit: d?.datos?.numeroId ?? '' }); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  const [guardando, setGuardando] = useState(false);
  const set = (p: Partial<typeof f>) => setF(x => ({ ...x, ...p }));

  const total = Number(f.total) || 0;
  const subtotal = r2(f.conIva ? total / 1.12 : total);
  const iva = r2(total - subtotal);

  async function guardar() {
    if (!nitValido(f.nit)) { setError('El NIT del proveedor no es válido: revisa el dígito verificador.'); return; }
    if (!f.proveedor.trim()) { setError('Escribe el nombre del proveedor.'); return; }
    if (!f.numero.trim()) { setError('Escribe el número del documento.'); return; }
    if (!(total > 0)) { setError('Escribe el total del documento.'); return; }
    if (contabilidad && !f.cuenta) { setError('Elige la cuenta de gasto o costo.'); return; }
    setError(''); setGuardando(true);
    const nombreTipo = COMPRAS_FISICAS.find(t => t.codigo === f.tipo)?.nombre ?? '';
    const consecutivo = f.serie.trim() ? `${f.serie.trim()}-${f.numero.trim()}` : f.numero.trim();
    const doc = {
      clave: '', tipo: `${f.tipo} · ${nombreTipo}`, consecutivo, fechaEmision: `${f.fecha}T12:00:00`,
      proveedor: f.proveedor.trim(), proveedorIdentificacion: f.nit.replace(/-/g, '').toUpperCase(), moneda: 'CRC', tipoCambio: 1,
      subtotal, iva, total: r2(total), totalExento: f.conIva ? 0 : subtotal, tarifa: f.conIva ? 12 : 0,
      lineas: [{ numero: 1, cabys: 'B', detalle: f.detalle.trim() || nombreTipo, cantidad: 1, unidad: 'UNI', precioUnitario: total, descuento: 0,
        subtotal, tarifa: f.conIva ? 12 : 0, impuesto: iva, total: r2(total), cuenta: f.cuenta || undefined }],
      tipoCreditoFiscal: f.conIva ? f.credito : 'sin_derecho', origen: 'fisica', emitirAcuse: true, generarAsiento: contabilidad,
    };
    const res = await fetch('/api/recepcion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentos: [doc] }) });
    const data = await res.json().catch(() => ({}));
    setGuardando(false);
    const r = (data.resultados ?? [])[0];
    if (!res.ok || !r?.ok) { setError(r?.error ?? 'No se pudo registrar la compra.'); return; }
    onCreado(`Se registró ${f.tipo} ${consecutivo} de ${f.proveedor.trim()}.`);
    onClose();
  }

  return (
    <Modal open title="Registrar compra física" onClose={onClose} width={620}
      footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="secondary" onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button onClick={guardar} disabled={guardando}>{guardando ? 'Registrando…' : 'Registrar compra'}</Button>
      </div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Para documentos en papel: no pasan por un certificador y quedan en el libro de compras.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Tipo de documento" required>
              <Select value={f.tipo} onChange={v => set({ tipo: v })} options={COMPRAS_FISICAS.map(t => ({ value: t.codigo, label: `${t.codigo} · ${t.nombre}` }))} />
            </FormField>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, border: `1px solid ${C.n500}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Proveedor (emisor)</div>
            <FormField label="NIT del proveedor" required><Input value={f.nit} onChange={v => set({ nit: v })} placeholder="Ej. 4567812K" /></FormField>
            <FormField label="Nombre del proveedor" required><Input value={f.proveedor} onChange={v => set({ proveedor: v })} /></FormField>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, border: `1px solid ${C.n500}`, borderRadius: 8, padding: 12, background: C.n200 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Mi empresa (receptor)</div>
            <div style={{ fontSize: 11.5, color: C.n700 }}>Nombre</div>
            <div style={{ fontSize: 12.5 }}>{empresa?.nombre || '—'}</div>
            <div style={{ fontSize: 11.5, color: C.n700 }}>NIT</div>
            <div style={{ fontSize: 12.5 }}>{empresa?.nit || '—'}</div>
          </div>
          <FormField label="Serie"><Input value={f.serie} onChange={v => set({ serie: v })} placeholder="Ej. A" /></FormField>
          <FormField label="Número" required><Input value={f.numero} onChange={v => set({ numero: v })} /></FormField>
          <FormField label="Fecha" required><Input type="date" value={f.fecha} onChange={v => set({ fecha: v })} /></FormField>
          <FormField label="Total del documento" required hint={total > 0 ? `Monto gravable Q ${subtotal.toFixed(2)} · IVA Q ${iva.toFixed(2)}` : 'Con IVA incluido'}>
            <Input type="number" value={f.total} onChange={v => set({ total: v })} placeholder="0.00" />
          </FormField>
          <FormField label="IVA">
            <Select value={f.conIva ? 'si' : 'no'} onChange={v => set({ conIva: v === 'si' })} options={[{ value: 'si', label: 'Incluye IVA 12 %' }, { value: 'no', label: 'Exento o sin IVA' }]} />
          </FormField>
          <FormField label="Crédito fiscal" hint="Las facturas de pequeño contribuyente no dan crédito.">
            <Select value={f.conIva ? f.credito : 'sin_derecho'} onChange={v => set({ credito: v })}
              options={[{ value: 'pleno', label: 'Con derecho a crédito' }, { value: 'sin_derecho', label: 'Sin derecho a crédito' }]} />
          </FormField>
          <div style={{ gridColumn: '1 / -1' }}><FormField label="Descripción"><Input value={f.detalle} onChange={v => set({ detalle: v })} placeholder="Qué se compró" /></FormField></div>
          {contabilidad && <div style={{ gridColumn: '1 / -1' }}><CuentaCampo titulo="Cuenta de gasto o costo" value={f.cuenta} onChange={c => set({ cuenta: c })} grupoInicial="6" /></div>}
        </div>
        {error && <p style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
      </div>
    </Modal>
  );
}
