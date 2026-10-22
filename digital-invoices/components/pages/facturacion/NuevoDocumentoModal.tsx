'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, FormField, Select, Button, C } from '@/components/ui/primitives';
import { RegistrarAbonoModal, money, type EstadoCredito } from './AbonosFactura';
import { usePaisEmpresa } from '@/lib/paisCliente';

// Guatemala: los tipos de DTE que usa un hotel en régimen General
const DTE_NUEVO = [
  { codigo: 'FACT', etiqueta: 'Factura (FACT)', tipo: 'Factura electrónica' },
  { codigo: 'FCAM', etiqueta: 'Factura cambiaria (FCAM) · a crédito con abonos', tipo: 'Factura electrónica' },
  { codigo: 'NCRE', etiqueta: 'Nota de crédito (NCRE)', tipo: 'Nota de crédito' },
  { codigo: 'NDEB', etiqueta: 'Nota de débito (NDEB)', tipo: 'Nota de débito' },
  { codigo: 'RANT', etiqueta: 'Recibo de anticipos (RANT) · depósito de una reserva', tipo: 'Recibo de anticipos' },
];

interface CajaRow { id: string; sucursal: string; terminal: string; nombre: string; emisor_id: string; activa: number; }
interface SucursalRow { codigo: string; nombre: string; emisor_id: string; }

export const TIPO_RECIBO = 'Recibo Electrónico de Pago';
export const TIPOS_NUEVO_DOCUMENTO = ['Factura electrónica', 'Tiquete electrónico', 'Nota de crédito', 'Nota de débito', 'Factura de exportación', TIPO_RECIBO];

// Nuevo comprobante: se elige el tipo de documento y desde dónde se emite
// (primero la sucursal y luego una de sus cajas: de ahí sale el número
// consecutivo). El emisor y sus datos vienen de la caja; no se cambian aquí.
// El recibo electrónico de pago no se emite suelto: es el abono a una factura
// a crédito con IVA al cobro, así que se elige la factura y se registra el
// abono (sale con la sucursal y caja de esa factura).
export default function NuevoDocumentoModal({
  open, tipo, onClose,
}: {
  open: boolean;
  tipo: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [cajas, setCajas] = useState<CajaRow[]>([]);
  const [sucursales, setSucursales] = useState<SucursalRow[]>([]);
  const [creditos, setCreditos] = useState<EstadoCredito[]>([]);
  const [sucursal, setSucursal] = useState('');
  const [cajaId, setCajaId] = useState('');
  const [facturaId, setFacturaId] = useState('');
  const [abonar, setAbonar] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const [abiertoAntes, setAbiertoAntes] = useState(open);
  if (open !== abiertoAntes) { setAbiertoAntes(open); if (!open) setListo(false); }
  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch('/api/cajas').then(r => r.json()),
      fetch('/api/sucursales').then(r => r.json()).catch(() => []),
      fetch('/api/recibos-pago/pendientes').then(r => r.json()).catch(() => []),
    ]).then(([c, s, cr]) => {
      const activas: CajaRow[] = (c as CajaRow[]).filter(x => x.activa);
      setCajas(activas); setSucursales(Array.isArray(s) ? s : []);
      const abiertos = (Array.isArray(cr) ? cr as EstadoCredito[] : []).filter(x => x.saldo > 0);
      setCreditos(abiertos); setFacturaId(abiertos[0]?.facturaId ?? '');
      if (activas.length > 0) { setSucursal(activas[0].sucursal); setCajaId(activas[0].id); }
      setListo(true);
    });
  }, [open]);

  // Guatemala: nombres FEL, sin tiquete; «sucursal» es «establecimiento»
  const { gt } = usePaisEmpresa();
  const [tipoSel, setTipoSel] = useState(tipo);
  const [tipoDe, setTipoDe] = useState(tipo);
  if (tipoDe !== tipo) { setTipoDe(tipo); setTipoSel(tipo); }
  const esRecibo = !gt && tipoSel === TIPO_RECIBO;

  const codigos = [...new Set(cajas.map(c => c.sucursal))].sort();
  const nombreSucursal = (cod: string) => sucursales.find(s => s.codigo === cod)?.nombre;
  const cajasDeSucursal = cajas.filter(c => c.sucursal === sucursal);

  function elegirSucursal(cod: string) {
    setSucursal(cod);
    setCajaId(cajas.find(c => c.sucursal === cod)?.id ?? '');
  }

  function crear() {
    if (esRecibo) { if (facturaId) setAbonar(facturaId); return; }
    if (!cajaId) return;
    if (gt) {
      // El tipo elegido es un código de DTE; la cambiaria es una factura a crédito
      const dte = DTE_NUEVO.find(d => d.codigo === tipoSel) ?? DTE_NUEVO[0];
      router.push(`/facturacion/emitidos/nuevo?tipo=${encodeURIComponent(dte.tipo)}&cajaId=${cajaId}${dte.codigo === 'FCAM' ? '&condicion=02' : ''}`);
    } else router.push(`/facturacion/emitidos/nuevo?tipo=${encodeURIComponent(tipoSel)}&cajaId=${cajaId}`);
    onClose();
  }

  if (abonar) return (
    <RegistrarAbonoModal facturaId={abonar} onClose={() => { setAbonar(null); onClose(); }}
      onHecho={(_m, reciboId) => { setAbonar(null); onClose(); router.push(reciboId ? `/facturacion/emitidos/${reciboId.replace('#', '')}` : `/facturacion/emitidos/${abonar.replace('#', '')}`); }} />
  );

  return (
    <Modal open={open && listo} title={gt ? 'Nuevo documento tributario electrónico' : 'Nuevo comprobante electrónico'} onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={crear} disabled={esRecibo ? !facturaId : !cajaId}>{esRecibo ? 'Continuar con el abono' : 'Crear'}</Button>
        </div>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormField label="Tipo de documento">
          {gt ? <Select value={DTE_NUEVO.some(d => d.codigo === tipoSel) ? tipoSel : 'FACT'} onChange={setTipoSel}
            options={DTE_NUEVO.map(d => ({ value: d.codigo, label: d.etiqueta }))} />
            : <Select value={tipoSel} onChange={setTipoSel} options={TIPOS_NUEVO_DOCUMENTO.map(t => ({ value: t, label: t }))} />}
        </FormField>
        {esRecibo ? (
          creditos.length ? (
            <>
              <FormField label="Factura a crédito que se abona" hint="Solo facturas con IVA al cobro (condición 10) que todavía tienen saldo. El recibo sale con la sucursal y caja de la factura.">
                <Select value={facturaId} onChange={setFacturaId}
                  options={creditos.map(c => ({ value: c.facturaId, label: `${c.numero} · ${c.cliente} · saldo ${money(c.saldo, c.moneda)}` }))} />
              </FormField>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 12.5, color: C.n700, lineHeight: 1.5 }}>
              No hay facturas a crédito con IVA al cobro pendientes de pago. El recibo electrónico de pago solo se emite al cobrar un abono de una de esas facturas.
            </p>
          )
        ) : (
          <>
            <FormField label={gt ? 'Establecimiento' : 'Sucursal'}>
              <Select value={sucursal} onChange={elegirSucursal}
                options={codigos.map(cod => ({ value: cod, label: nombreSucursal(cod) ? `${cod} · ${nombreSucursal(cod)}` : `${gt ? 'Establecimiento' : 'Sucursal'} ${cod}` }))} />
            </FormField>
            <FormField label="Caja">
              <Select value={cajaId} onChange={setCajaId} disabled={!sucursal}
                options={cajasDeSucursal.map(c => ({ value: c.id, label: `${c.terminal} · ${c.nombre}` }))} />
            </FormField>
          </>
        )}
      </div>
    </Modal>
  );
}
