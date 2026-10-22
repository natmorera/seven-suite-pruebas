'use client';
// Registrar un documento físico de compra (papel): factura, factura
// cambiaria, nota de crédito o de débito. No pasa por un certificador; queda
// en el libro de compras (separado en bienes y servicios) y, con
// Contabilidad, con su asiento.
//   · Pequeño contribuyente: su factura no desglosa IVA ni da crédito fiscal.
//   · Factura cambiaria: lleva vencimiento (queda a crédito).
//   · Notas: llevan el documento que ajustan.
import { useEffect, useState } from 'react';
import { C, Modal, Button, FormField, Input, Select } from '@/components/ui/primitives';
import { CuentaCampo } from './CuentaPicker';
import { conContabilidad } from '@/lib/modulosCliente';
import { COMPRAS_FISICAS, nitValido } from '@/lib/perfilPais';

const r2 = (n: number) => Math.round(n * 100) / 100;
const hoy = () => new Date().toISOString().slice(0, 10);
const masDias = (f: string, d: number) => { const x = new Date(f + 'T12:00:00'); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
// Tipo con que se guarda (el mismo que usan los reportes) según el documento físico
const TIPO_INTERNO: Record<string, string> = { SCOM: 'Factura electrónica', SCCA: 'Factura electrónica', SNCC: 'Nota de crédito', SNDC: 'Nota de débito' };
const AFILIACIONES = [
  { value: 'GEN', label: 'General (desglosa IVA 12 %)' },
  { value: 'PEQ', label: 'Pequeño contribuyente (sin IVA desglosado)' },
  { value: 'EXE', label: 'Exento o no afecto al IVA' },
];
interface Tercero { nombre: string; numero_identificacion: string; tipo: string }

export default function CompraFisicaModal({ onClose, onCreado }: { onClose: () => void; onCreado: (mensaje: string) => void }) {
  const contabilidad = conContabilidad();
  const [f, setF] = useState({
    tipo: COMPRAS_FISICAS[0].codigo, nit: '', proveedor: '', afiliacion: 'GEN', bienServicio: 'B' as 'B' | 'S',
    serie: '', numero: '', fecha: hoy(), vencimiento: masDias(hoy(), 30), refSerie: '', refNumero: '',
    total: '', credito: 'pleno', cuenta: '', detalle: '',
  });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  // Mi empresa es siempre el receptor: se muestra a la derecha, como en todas las compras
  const [empresa, setEmpresa] = useState<{ nombre: string; nit: string } | null>(null);
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  useEffect(() => {
    let vivo = true;
    fetch('/api/empresa').then(r => r.json()).then(d => { if (vivo) setEmpresa({ nombre: d?.datos?.nombreLegal ?? '', nit: d?.datos?.numeroId ?? '' }); }).catch(() => {});
    fetch('/api/clientes').then(r => r.json()).then(d => { if (vivo && Array.isArray(d)) setTerceros(d); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  const set = (p: Partial<typeof f>) => setF(x => ({ ...x, ...p }));
  const limpio = (s: string) => s.replace(/[\s-]/g, '').toUpperCase();
  // Con el NIT de un proveedor conocido se completa su nombre
  function cambiarNit(v: string) {
    const t = terceros.find(x => limpio(String(x.numero_identificacion ?? '')) === limpio(v));
    set({ nit: v, ...(t && !f.proveedor ? { proveedor: t.nombre } : {}) });
  }

  const conIva = f.afiliacion === 'GEN';
  const esNota = f.tipo === 'SNCC' || f.tipo === 'SNDC';
  const cambiaria = f.tipo === 'SCCA';
  const total = Number(f.total) || 0;
  const subtotal = r2(conIva ? total / 1.12 : total);
  const iva = r2(total - subtotal);
  const credito = conIva ? f.credito : 'sin_derecho';

  async function guardar() {
    if (!nitValido(f.nit)) { setError('El NIT del proveedor no es válido: revisa el dígito verificador.'); return; }
    if (!f.proveedor.trim()) { setError('Escribe el nombre del proveedor.'); return; }
    if (!f.numero.trim()) { setError('Escribe el número del documento.'); return; }
    if (!(total > 0)) { setError('Escribe el total del documento.'); return; }
    if (cambiaria && f.vencimiento < f.fecha) { setError('El vencimiento no puede ser antes de la fecha del documento.'); return; }
    if (esNota && !f.refNumero.trim()) { setError('Indica el número del documento que ajusta la nota.'); return; }
    if (contabilidad && !f.cuenta) { setError('Elige la cuenta de gasto o costo.'); return; }
    setError(''); setGuardando(true);
    const nombreTipo = COMPRAS_FISICAS.find(t => t.codigo === f.tipo)?.nombre ?? '';
    const consecutivo = f.serie.trim() ? `${f.serie.trim().toUpperCase()}-${f.numero.trim()}` : f.numero.trim();
    const referencia = esNota ? (f.refSerie.trim() ? `${f.refSerie.trim().toUpperCase()}-${f.refNumero.trim()}` : f.refNumero.trim()) : '';
    const detalle = f.detalle.trim() || nombreTipo;
    const doc = {
      clave: '', tipo: TIPO_INTERNO[f.tipo] ?? 'Factura electrónica', tipoDte: f.tipo, consecutivo, fechaEmision: `${f.fecha}T12:00:00`,
      proveedor: f.proveedor.trim(), proveedorIdentificacion: limpio(f.nit), moneda: 'CRC', tipoCambio: 1,
      subtotal, iva, total: r2(total), totalExento: conIva ? 0 : subtotal, tarifa: conIva ? 12 : 0,
      condicionVenta: cambiaria ? '02' : '01',
      lineas: [{ numero: 1, cabys: f.bienServicio, detalle: referencia ? `${detalle} (ajusta ${referencia})` : detalle, cantidad: 1, unidad: f.bienServicio === 'B' ? 'UNI' : 'SER',
        precioUnitario: total, descuento: 0, subtotal, tarifa: conIva ? 12 : 0, impuesto: iva, total: r2(total), cuenta: f.cuenta || undefined }],
      tipoCreditoFiscal: credito, origen: 'fisica', emitirAcuse: true, generarAsiento: contabilidad,
    };
    const res = await fetch('/api/recepcion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentos: [doc] }) });
    const data = await res.json().catch(() => ({}));
    setGuardando(false);
    const r = (data.resultados ?? [])[0];
    if (!res.ok || !r?.ok) {
      setError(r?.error === 'Ya estaba importado' ? `Ya está registrado el documento ${consecutivo} de este proveedor.` : r?.error ?? 'No se pudo registrar la compra.');
      return;
    }
    // Vencimiento de la factura cambiaria y referencia de la nota, en el detalle del registro
    const notas = [cambiaria ? `Vence el ${f.vencimiento.split('-').reverse().join('/')}` : '', referencia ? `Ajusta el documento ${referencia}` : ''].filter(Boolean).join(' · ');
    if (notas && r.id) await fetch(`/api/recepcion/${encodeURIComponent(r.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensaje: notas }) }).catch(() => {});
    onCreado(`Se registró ${nombreTipo.toLowerCase()} ${consecutivo} de ${f.proveedor.trim()}.`);
    onClose();
  }

  return (
    <Modal open title="Registrar compra física" onClose={onClose} width={660}
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
            <FormField label="NIT del proveedor" required><Input value={f.nit} onChange={cambiarNit} placeholder="Ej. 4567812K" /></FormField>
            <FormField label="Nombre del proveedor" required><Input value={f.proveedor} onChange={v => set({ proveedor: v })} /></FormField>
            <FormField label="Afiliación al IVA del proveedor" required hint={conIva ? undefined : 'La compra queda sin IVA y sin crédito fiscal.'}>
              <Select value={f.afiliacion} onChange={v => set({ afiliacion: v })} options={AFILIACIONES} />
            </FormField>
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
          <FormField label="Fecha" required><Input type="date" value={f.fecha} onChange={v => set({ fecha: v, ...(cambiaria ? {} : { vencimiento: masDias(v, 30) }) })} /></FormField>
          {cambiaria
            ? <FormField label="Vencimiento" required hint="Queda como compra a crédito."><Input type="date" value={f.vencimiento} onChange={v => set({ vencimiento: v })} /></FormField>
            : <FormField label="Bien o servicio" required hint="El libro de compras los separa.">
                <Select value={f.bienServicio} onChange={v => set({ bienServicio: v as 'B' | 'S' })} options={[{ value: 'B', label: 'Bien' }, { value: 'S', label: 'Servicio' }]} />
              </FormField>}
          {cambiaria && <FormField label="Bien o servicio" required hint="El libro de compras los separa.">
            <Select value={f.bienServicio} onChange={v => set({ bienServicio: v as 'B' | 'S' })} options={[{ value: 'B', label: 'Bien' }, { value: 'S', label: 'Servicio' }]} />
          </FormField>}
          {esNota && <>
            <FormField label="Serie del documento que ajusta"><Input value={f.refSerie} onChange={v => set({ refSerie: v })} placeholder="Ej. A" /></FormField>
            <FormField label="Número del documento que ajusta" required><Input value={f.refNumero} onChange={v => set({ refNumero: v })} /></FormField>
          </>}
          <FormField label="Total del documento" required hint={total > 0 ? (conIva ? `Monto gravable Q ${subtotal.toFixed(2)} · IVA Q ${iva.toFixed(2)}` : 'Sin IVA desglosado') : conIva ? 'Con IVA incluido' : 'Sin IVA'}>
            <Input type="number" value={f.total} onChange={v => set({ total: v })} placeholder="0.00" />
          </FormField>
          <FormField label="Crédito fiscal" hint={conIva ? undefined : 'Solo con proveedores de régimen general.'}>
            <Select value={credito} onChange={v => set({ credito: v })} disabled={!conIva}
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
