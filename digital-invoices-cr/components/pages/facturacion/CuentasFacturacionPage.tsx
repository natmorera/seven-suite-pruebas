'use client';
// Configuración › Facturación electrónica › Cuentas contables: las cuentas
// que usan los asientos automáticos de ventas y compras cuando el producto,
// el cliente o el proveedor no trae una propia.
import { useEffect, useState } from 'react';
import { C, FONT, PAGE_PAD, Button, Toast, radius } from '@/components/ui/primitives';
import { CuentaCampo } from './CuentaPicker';
import { usePermisos } from '@/lib/permisosCliente';

type Mapeo = Record<'cuentaVentas' | 'cuentaIvaVentas' | 'cuentaCxc' | 'cuentaCaja' | 'cuentaBanco' | 'cuentaGastos' | 'cuentaIvaCompras' | 'cuentaProveedores', string>;

const GRUPOS: { titulo: string; ayuda: string; campos: { k: keyof Mapeo; label: string; ayuda: string; grupo: string }[] }[] = [
  { titulo: 'Ventas', ayuda: 'Al aceptar Hacienda una factura, tiquete o nota.', campos: [
    { k: 'cuentaVentas', label: 'Ingresos por ventas', ayuda: 'Si el producto o servicio no tiene su cuenta de ingreso.', grupo: '4' },
    { k: 'cuentaIvaVentas', label: 'IVA por pagar (débito fiscal)', ayuda: 'El IVA cobrado en las ventas.', grupo: '2' },
    { k: 'cuentaCxc', label: 'Cuentas por cobrar', ayuda: 'Ventas a crédito a clientes sin cuenta auxiliar.', grupo: '1' },
  ] },
  { titulo: 'Cobros', ayuda: 'Ventas de contado y recibos de pago.', campos: [
    { k: 'cuentaCaja', label: 'Caja', ayuda: 'Cobros en efectivo.', grupo: '1' },
    { k: 'cuentaBanco', label: 'Bancos', ayuda: 'Tarjeta, transferencia, SINPE y demás medios.', grupo: '1' },
  ] },
  { titulo: 'Compras', ayuda: 'Al emitir el acuse o aceptarse una factura de compra.', campos: [
    { k: 'cuentaGastos', label: 'Gastos', ayuda: 'Si la línea no tiene cuenta asignada.', grupo: '6' },
    { k: 'cuentaIvaCompras', label: 'IVA acreditable (crédito fiscal)', ayuda: 'El IVA pagado en compras con derecho a crédito.', grupo: '1' },
    { k: 'cuentaProveedores', label: 'Cuentas por pagar', ayuda: 'Proveedores sin cuenta auxiliar.', grupo: '2' },
  ] },
];

export default function CuentasFacturacionPage() {
  const { puede } = usePermisos();
  const [m, setM] = useState<Mapeo | null>(null);
  const [original, setOriginal] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch('/api/facturacion/cuentas').then(r => r.json()).then((d: Mapeo) => { if (vivo) { setM(d); setOriginal(JSON.stringify(d)); } }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  if (!m) return <p style={{ padding: PAGE_PAD, fontSize: 12, color: C.n700 }}>Cargando…</p>;
  const cambiado = JSON.stringify(m) !== original;
  async function guardar() {
    setGuardando(true);
    const r = await fetch('/api/facturacion/cuentas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m) });
    const d = await r.json().catch(() => m);
    setGuardando(false); setM(d); setOriginal(JSON.stringify(d)); setToast('Cuentas guardadas. Se usan en los próximos asientos.');
  }
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: PAGE_PAD, fontFamily: FONT }}>
      <div style={{ maxWidth: 980, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 12.5, color: C.n700, margin: 0 }}>
          Los asientos de ventas y compras se generan solos. Cada producto, cliente o proveedor puede tener su cuenta; estas son las que se usan cuando no la tienen.
        </p>
        <fieldset disabled={!puede('fe.config.cuentas.editar')} style={{ display: 'contents' }}>
        {GRUPOS.map(g => (
          <div key={g.titulo} style={{ background: '#fff', border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{g.titulo}</div>
            <div style={{ fontSize: 12, color: C.n700, margin: '2px 0 12px' }}>{g.ayuda}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {g.campos.map(c => (
                <div key={c.k}>
                  <CuentaCampo titulo={c.label} value={m[c.k]} onChange={v => setM(x => x && ({ ...x, [c.k]: v }))} grupoInicial={c.grupo} />
                  <div style={{ fontSize: 11, color: C.n700, marginTop: 4 }}>{c.ayuda}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        </fieldset>
        {puede('fe.config.cuentas.editar') && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" disabled={!cambiado || guardando} onClick={() => setM(JSON.parse(original))}>Descartar</Button>
          <Button disabled={!cambiado || guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Button>
        </div>}
      </div>
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </div>
  );
}
