'use client';
// Dashboard › Factura electrónica: ventas a crédito con recibo electrónico de
// pago. Por cobrar, abonos del mes, IVA por declarar y las facturas cuyo día
// 90 está cerca (o ya pasó y su IVA pendiente se declara este mes).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { C, FONT, Button, radius } from '@/components/ui/primitives';
import { RegistrarAbonoModal, money, fechaCorta, type EstadoCredito } from './facturacion/AbonosFactura';

export default function CreditosReciboDashboard() {
  const [lista, setLista] = useState<EstadoCredito[] | null>(null);
  const [version, setVersion] = useState(0);
  const [abonar, setAbonar] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch('/api/recibos-pago/pendientes').then(r => r.json()).then((l: EstadoCredito[]) => { if (vivo) setLista(Array.isArray(l) ? l : []); }).catch(() => {});
    return () => { vivo = false; };
  }, [version]);
  if (!lista || !lista.length) return null;

  const mes = new Date().toISOString().slice(0, 7);
  const abiertas = lista.filter(c => c.saldo > 0);
  const porCobrar = abiertas.reduce((s, c) => s + c.saldo, 0);
  const abonosMes = lista.flatMap(c => c.abonos.filter(a => a.fechaPago.slice(0, 7) === mes && !['Rechazado', 'Error', 'Borrador'].includes(a.estado)));
  const ivaPendiente = abiertas.reduce((s, c) => s + c.ivaPendiente, 0);
  const proximas = abiertas.filter(c => !c.vencido).sort((a, b) => a.diasRestantes - b.diasRestantes).slice(0, 4);
  const vencenEsteMes = lista.filter(c => c.vencido && c.fechaLimite.slice(0, 7) === mes && c.ivaDeclaradoAl90 > 0);

  const kpi = (l: string, v: string, nota?: string, color?: string) => (
    <div style={{ background: C.n200, borderRadius: radius.md, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: C.n700, marginBottom: 6 }}>{l}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: color ?? C.n900, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
      {nota && <div style={{ fontSize: 11.5, color: C.n700, marginTop: 4 }}>{nota}</div>}
    </div>
  );
  const fila = { display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, padding: '10px 0', borderTop: `1px solid ${C.n200}` };

  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEC', borderRadius: 10, padding: '20px 22px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Ventas a crédito con recibo de pago</div>
          <div style={{ fontSize: 12, color: C.n700, marginTop: 2 }}>{abiertas.length} factura{abiertas.length === 1 ? '' : 's'} con saldo. El IVA se declara con cada abono y, al día 90, el pendiente.</div>
        </div>
        <Link href="/facturacion/emitidos" style={{ fontSize: 12.5, color: C.brand, fontWeight: 500 }}>Ir a Ventas</Link>
      </div>
      {msg && <div style={{ fontSize: 12, color: C.n900 }}>{msg}</div>}

      <div className="dash-row-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {kpi('Por cobrar', money(porCobrar), `${abiertas.length} factura${abiertas.length === 1 ? '' : 's'}`)}
        {kpi('Abonos este mes', money(abonosMes.reduce((s, a) => s + a.total, 0)), `${abonosMes.length} recibo${abonosMes.length === 1 ? '' : 's'} · IVA ${money(abonosMes.reduce((s, a) => s + (a.despuesDel90 ? 0 : a.iva), 0))}`, C.success)}
        {kpi('IVA por declarar', money(ivaPendiente), 'Se declara al cobrar o al día 90')}
        {kpi('Día 90 este mes', money(vencenEsteMes.reduce((s, c) => s + c.ivaDeclaradoAl90, 0)), `${vencenEsteMes.length} factura${vencenEsteMes.length === 1 ? '' : 's'}: su IVA pendiente va en esta declaración`, vencenEsteMes.length ? C.error : undefined)}
      </div>

      {proximas.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.n700, marginBottom: 2 }}>Próximas al día 90</div>
          {proximas.map(c => (
            <div key={c.facturaId} style={fila}>
              <Link href={`/facturacion/emitidos/${c.facturaId.replace('#', '')}`} style={{ color: C.brand, fontWeight: 500, minWidth: 120 }}>{c.numero}</Link>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.cliente}</span>
              <span style={{ color: c.diasRestantes <= 15 ? C.error : C.n700, whiteSpace: 'nowrap' }}>{c.diasRestantes === 0 ? 'hoy' : `en ${c.diasRestantes} días`} · {fechaCorta(c.fechaLimite)}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 110, textAlign: 'right' }}>{money(c.saldo, c.moneda)}</span>
              <Button variant="secondary" onClick={() => setAbonar(c.facturaId)}>Registrar abono</Button>
            </div>
          ))}
        </div>
      )}
      {abonar && <RegistrarAbonoModal facturaId={abonar} onClose={() => setAbonar(null)} onHecho={m => { setAbonar(null); setMsg(m); setVersion(v => v + 1); }} />}
    </div>
  );
}
