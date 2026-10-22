'use client';
// Asiento de una venta o compra (Accounting + Digital Invoices): el número se
// muestra como enlace; al tocarlo se ve el asiento sin salir de la pantalla,
// con un acceso a la Bandeja de asientos.
import { useState } from 'react';
import Link from 'next/link';
import { C, FONT, Button, Modal, StatusBadge, radius } from '@/components/ui/primitives';
import { simboloLocal } from '@/lib/paisActual';

interface LineaVista { cuenta: string; nombreCuenta: string | null; descripcion: string; debe: number; haber: number }
interface AsientoVista { num: number; consecutivo: string; fecha: string; titulo: string; moneda: string; contabilizado: boolean; anulado: boolean; lineas: LineaVista[] }

const fmt = (n: number) => n.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SIMBOLO: Record<string, string> = { get CRC() { return simboloLocal(); }, USD: '$', EUR: '€' };

export const urlAsiento = (consecutivo: string) => `/asientos?asiento=${encodeURIComponent(consecutivo)}`;

export default function AsientoVinculado({ documentoId, consecutivo, compacto = false }: { documentoId: string; consecutivo: string; compacto?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [asiento, setAsiento] = useState<AsientoVista | null | undefined>(undefined);
  function abrir(e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault();
    setAbierto(true);
    if (asiento === undefined) {
      fetch(`/api/asientos/vinculo?documento=${encodeURIComponent(documentoId)}`).then(r => r.json()).then(d => setAsiento(d.asiento ?? null)).catch(() => setAsiento(null));
    }
  }
  return <>
    <button onClick={abrir} title="Ver el asiento" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: compacto ? 12 : 'inherit',
      color: C.brand, fontWeight: compacto ? 500 : 600, fontVariantNumeric: 'tabular-nums', textDecoration: 'underline', textDecorationColor: C.brandBd, textUnderlineOffset: 3 }}>
      {consecutivo}
    </button>
    {abierto && (
      <span onClick={e => e.stopPropagation()}>
        <Modal open title={`Asiento ${consecutivo}`} onClose={() => setAbierto(false)} width={860}
          footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="secondary" onClick={() => setAbierto(false)}>Cerrar</Button>
            <Link href={urlAsiento(consecutivo)}><Button>Abrir en Bandeja de asientos</Button></Link>
          </div>}>
          {asiento === undefined ? <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>Cargando…</p>
            : asiento === null ? <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>No se encontró el asiento.</p>
              : <VistaAsiento a={asiento} />}
        </Modal>
      </span>
    )}
  </>;
}

function VistaAsiento({ a }: { a: AsientoVista }) {
  const s = SIMBOLO[a.moneda] ?? '';
  const debe = a.lineas.reduce((x, l) => x + l.debe, 0), haber = a.lineas.reduce((x, l) => x + l.haber, 0);
  const cuadra = Math.abs(debe - haber) < 0.01;
  const th = { padding: '8px 10px', fontSize: 11, fontWeight: 500, color: C.n700, textAlign: 'left' as const, background: C.n200 };
  const td = { padding: '7px 10px', fontSize: 12, borderTop: `1px solid ${C.n500}`, verticalAlign: 'top' as const };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.n900 }}>{a.titulo}</div>
          <div style={{ fontSize: 12, color: C.n700, marginTop: 2 }}>{a.fecha.split('-').reverse().join('/')}</div>
        </div>
        {a.anulado ? <StatusBadge label="Anulado" color="red" /> : a.contabilizado ? <StatusBadge label="Contabilizado" color="green" /> : <StatusBadge label="Pendiente de contabilizar" color="yellow" />}
      </div>
      <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 640 }}>
          <colgroup><col style={{ width: 190 }} /><col /><col style={{ width: 130 }} /><col style={{ width: 130 }} /></colgroup>
          <thead><tr><th style={th}>Cuenta</th><th style={th}>Descripción</th><th style={{ ...th, textAlign: 'right' }}>Debe</th><th style={{ ...th, textAlign: 'right' }}>Haber</th></tr></thead>
          <tbody>
            {a.lineas.map((l, i) => (
              <tr key={i}>
                <td style={td}>
                  <div style={{ fontVariantNumeric: 'tabular-nums', color: C.brand }}>{l.cuenta}</div>
                  <div style={{ fontSize: 11, color: l.nombreCuenta ? C.n700 : C.error }}>{l.nombreCuenta ?? 'No está en el catálogo'}</div>
                </td>
                <td style={{ ...td, color: C.n700 }}>{l.descripcion}</td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{l.debe ? `${s}${fmt(l.debe)}` : ''}</td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{l.haber ? `${s}${fmt(l.haber)}` : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ ...td, fontWeight: 600, borderTop: `2px solid ${C.n500}` }}>
                Totales {cuadra ? <span style={{ fontWeight: 400, color: C.successDk, marginLeft: 6 }}>· cuadra</span> : <span style={{ fontWeight: 400, color: C.error, marginLeft: 6 }}>· no cuadra</span>}
              </td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 600, borderTop: `2px solid ${C.n500}`, fontVariantNumeric: 'tabular-nums' }}>{s}{fmt(debe)}</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 600, borderTop: `2px solid ${C.n500}`, fontVariantNumeric: 'tabular-nums' }}>{s}{fmt(haber)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
