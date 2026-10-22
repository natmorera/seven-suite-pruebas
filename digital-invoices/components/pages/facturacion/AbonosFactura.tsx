'use client';
// Abonos de una factura con recibo electrónico de pago.
//   · PanelAbonos: resumen (total, abonado, saldo, IVA y plazo de 90 días) y
//     la lista de abonos con su recibo. Va en el detalle de la factura.
//   · RegistrarAbonoModal: formulario del abono (fecha, medio, descripción,
//     monto y comprobante). Al guardar se emite el recibo.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { C, FONT, Modal, Button, FormField, Input, Select, StatusBadge, radius } from '@/components/ui/primitives';
import { MEDIOS_PAGO, labelMedioPago } from '@/data/catalogosHacienda';
import { ESTADO_DOC_COLOR } from '@/data/estadosHacienda';
import { simboloLocal } from '@/lib/paisActual';

export interface EstadoCredito {
  facturaId: string; numero: string; cliente: string; moneda: string; fechaFactura: string; total: number; abonado: number; saldo: number;
  ivaTotal: number; ivaCobrado: number; ivaPendiente: number; ivaDeclaradoAl90: number; fechaLimite: string; vencido: boolean; diasRestantes: number;
  abonos: { id: string; numero_factura: string; fecha_emision: string; estado: string; total: number; iva: number; medio: string; descripcion: string; comprobante: string; fechaPago: string; despuesDel90: boolean }[];
}

export const money = (n: number, moneda = 'CRC') => `${moneda === 'USD' ? '$' : simboloLocal()}${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fechaCorta = (iso: string) => iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '') : '';
const hoy = () => new Date().toISOString().slice(0, 10);
// Herramienta de presentación: solo aparece abriendo la página con ?demo=1
const modoDemo = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';

export function useEstadoCredito(facturaId: string, version = 0) {
  const [e, setE] = useState<EstadoCredito | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch(`/api/documentos/${facturaId.replace('#', '')}/recibo-pago`).then(r => r.json()).then((d: EstadoCredito) => { if (vivo) setE(d); }).catch(() => {});
    return () => { vivo = false; };
  }, [facturaId, version]);
  return e;
}

// Texto corto del plazo: «Faltan 12 días para el día 90» / «IVA pendiente declarado el 29 dic»
export function textoPlazo(e: Pick<EstadoCredito, 'saldo' | 'vencido' | 'diasRestantes' | 'fechaLimite'>) {
  if (e.saldo <= 0) return 'Cobrada por completo';
  if (e.vencido) return `Pasó el día 90 (${fechaCorta(e.fechaLimite)}): el IVA pendiente se declaró ese mes`;
  if (e.diasRestantes === 0) return 'Hoy se cumple el día 90';
  return `Faltan ${e.diasRestantes} día${e.diasRestantes === 1 ? '' : 's'} para el día 90 (${fechaCorta(e.fechaLimite)})`;
}

// Mes en que se declara el IVA de un abono: el del cobro, o el del día 90 si se cobró después
const mesAnio = (iso: string) => iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CR', { month: 'long', year: 'numeric' }) : '';
export function periodoIvaAbono(a: { fechaPago: string; despuesDel90: boolean }, fechaLimite: string) {
  return a.despuesDel90 ? `Al día 90 (${mesAnio(fechaLimite)})` : mesAnio(a.fechaPago);
}

export function PanelAbonos({ facturaId, onRegistrar, onSimular, version = 0, resaltar, titulo }: { facturaId: string; onRegistrar?: () => void; onSimular?: () => void; version?: number; resaltar?: string; titulo?: string }) {
  const e = useEstadoCredito(facturaId, version);
  if (!e) return <div style={{ fontSize: 12, color: C.n700 }}>Cargando abonos…</div>;
  const pct = e.total ? Math.min(100, Math.round(e.abonado / e.total * 100)) : 0;
  const alerta = e.saldo > 0 && (e.vencido || e.diasRestantes <= 15);
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.n500}`, borderRadius: radius.lg, padding: 20, fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{titulo ?? 'Abonos · recibo electrónico de pago'}</div>
          <div style={{ fontSize: 12, color: alerta ? C.error : C.n700, marginTop: 4 }}>{textoPlazo(e)}</div>
        </div>
        {onRegistrar && e.saldo > 0 && <Button onClick={onRegistrar}>Registrar abono</Button>}
      </div>

      <div>
        <div style={{ height: 8, background: C.n200, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: e.saldo > 0 ? C.brand : C.success }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 14 }}>
          {[
            ['Total de la factura', money(e.total, e.moneda)],
            ['Abonado', `${money(e.abonado, e.moneda)} · ${pct}%`],
            ['Saldo', money(e.saldo, e.moneda)],
            [e.vencido ? 'IVA declarado al día 90' : 'IVA por declarar', money(e.vencido ? e.ivaDeclaradoAl90 : e.ivaPendiente, e.moneda)],
          ].map(([l, v]) => (
            <div key={l} style={{ background: C.n200, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11.5, color: C.n700, marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {e.abonos.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.n700, padding: '14px 0', textAlign: 'center', border: `1px dashed ${C.n500}`, borderRadius: 8 }}>
          Todavía no hay abonos. Cada abono que registres sale como un recibo electrónico de pago.
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.n500}`, borderRadius: 8, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead><tr style={{ background: C.n200 }}>
              {['#', 'Recibido', 'Recibo', 'Medio', 'Monto', 'IVA', 'IVA se declara en', 'Saldo después', 'Estado'].map((h, i) => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 500, color: C.n700, textAlign: [4, 5, 7].includes(i) ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(() => { let acum = 0; return e.abonos.map((a, i) => {
                if (!['Rechazado', 'Borrador', 'Error'].includes(a.estado)) acum += a.total;
                const saldoDespues = Math.max(0, Math.round((e.total - acum) * 100) / 100);
                return (
                <tr key={a.id} style={{ borderTop: `1px solid ${C.n500}`, background: a.id === resaltar ? C.brandBg : undefined }}>
                  <td style={{ padding: '12px 14px', color: C.n700 }}>{i + 1}</td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>{fechaCorta(a.fechaPago)}</td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <Link href={`/facturacion/emitidos/${a.id.replace('#', '')}`} style={{ color: C.brand, fontWeight: 500 }}>{a.numero_factura}</Link>
                  </td>
                  <td style={{ padding: '12px 14px', color: C.n700 }}>
                    {labelMedioPago(a.medio)}
                    {a.comprobante && <div style={{ fontSize: 11, marginTop: 2 }}>Comprobante {a.comprobante}</div>}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{money(a.total, e.moneda)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: C.n700 }}>
                    {money(a.iva, e.moneda)}
                  </td>
                  <td style={{ padding: '12px 14px', color: a.despuesDel90 ? C.n700 : C.n900, whiteSpace: 'nowrap' }}>
                    {periodoIvaAbono(a, e.fechaLimite)}{a.despuesDel90 && <div style={{ fontSize: 10.5, color: C.n700 }}>Ya declarado · recibo de respaldo</div>}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(saldoDespues, e.moneda)}</td>
                  <td style={{ padding: '12px 14px' }}><StatusBadge label={a.estado} color={ESTADO_DOC_COLOR[a.estado] ?? 'yellow'} /></td>
                </tr>
              ); }); })()}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: 11.5, color: C.n700, lineHeight: 1.5 }}>
          Cada abono lleva su propio recibo y su IVA se declara en el mes en que se cobró. Si al día 90 no se ha cobrado todo, el IVA pendiente se declara ese mes aunque no hayan pagado; los abonos posteriores igual llevan recibo, pero solo de respaldo (no vuelven a declarar IVA). Un abono emitido no se puede anular.
        </p>
        {!e.vencido && e.saldo > 0 && onSimular && modoDemo() && (
          <button onClick={onSimular}
            style={{ background: 'none', border: `1px dashed ${C.n500}`, borderRadius: 6, padding: '4px 10px', color: C.n700, cursor: 'pointer', fontSize: 11.5, fontFamily: FONT }}>
            Simular que pasaron 90 días
          </button>
        )}
      </div>
    </div>
  );
}

export function RegistrarAbonoModal({ facturaId, onClose, onHecho }: { facturaId: string; onClose: () => void; onHecho: (mensaje: string, reciboId?: string) => void }) {
  const e = useEstadoCredito(facturaId);
  const [f, setF] = useState({ fechaPago: hoy(), medio: '04', descripcion: 'Abono', monto: '', comprobante: '' });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const monto = f.monto === '' ? (e?.saldo ?? 0) : Number(f.monto);
  const ivaAbono = e && e.total ? Math.round(monto * e.ivaTotal / e.total * 100) / 100 : 0;

  async function guardar() {
    if (!e) return;
    if (!(monto > 0)) { setError('Indica el monto del abono.'); return; }
    if (monto > e.saldo + 0.01) { setError(`El abono supera el saldo (${money(e.saldo, e.moneda)}).`); return; }
    if (!f.fechaPago || f.fechaPago > hoy()) { setError('La fecha del abono no puede ser futura.'); return; }
    setGuardando(true); setError(null);
    const r = await fetch(`/api/documentos/${facturaId.replace('#', '')}/recibo-pago`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, monto, descripcion: f.descripcion.trim() || 'Abono' }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setGuardando(false); setError(d.error ?? 'No se pudo registrar el abono.'); return; }
    await fetch(`/api/documentos/${String(d.id).replace('#', '')}/estado`, { method: 'POST' }).catch(() => {});
    setGuardando(false);
    onHecho(`Abono de ${money(monto, e.moneda)} registrado. Se emitió el recibo electrónico de pago ${d.consecutivo}.`, String(d.id));
  }

  return (
    <Modal open title="Registrar abono" onClose={onClose} width={620}
      footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar} disabled={guardando || !e || e.saldo <= 0}>{guardando ? 'Emitiendo…' : 'Registrar abono y emitir recibo'}</Button>
      </div>}>
      {!e ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: FONT, fontSize: 12.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '12px 14px', background: C.n200, borderRadius: 8 }}>
            <div><div style={{ fontSize: 11.5, color: C.n700 }}>Factura</div><div style={{ fontWeight: 600 }}>{e.numero} · {e.cliente}</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11.5, color: C.n700 }}>Saldo</div><div style={{ fontWeight: 600, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{money(e.saldo, e.moneda)}</div></div>
          </div>
          <div style={{ fontSize: 12, color: e.vencido || e.diasRestantes <= 15 ? C.error : C.n700 }}>{textoPlazo(e)}</div>
          {error && <div style={{ color: C.error, fontSize: 12 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Fecha en que se recibió" required><Input type="date" value={f.fechaPago} onChange={v => setF(x => ({ ...x, fechaPago: v }))} /></FormField>
            <FormField label="Medio de pago" required>
              <Select value={f.medio} onChange={v => setF(x => ({ ...x, medio: v }))} options={MEDIOS_PAGO.map(m => ({ value: m.value, label: m.label }))} />
            </FormField>
            <FormField label="Monto del abono" required hint={`IVA de este abono: ${money(ivaAbono, e.moneda)}`}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}><Input type="number" value={f.monto === '' ? String(e.saldo) : f.monto} onChange={v => setF(x => ({ ...x, monto: v }))} /></div>
                <Button variant="secondary" onClick={() => setF(x => ({ ...x, monto: String(e.saldo) }))}>Saldo total</Button>
              </div>
            </FormField>
            <FormField label="Descripción" hint="Va como línea del recibo."><Input value={f.descripcion} onChange={v => setF(x => ({ ...x, descripcion: v }))} /></FormField>
          </div>
          <FormField label="N.º de comprobante o transferencia (opcional)"><Input value={f.comprobante} onChange={v => setF(x => ({ ...x, comprobante: v }))} placeholder="Ej. 20261001-00123" /></FormField>
          {e.vencido && <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Como ya pasó el día 90, el IVA de este abono ya se declaró; el recibo se emite igual.</p>}
        </div>
      )}
    </Modal>
  );
}
