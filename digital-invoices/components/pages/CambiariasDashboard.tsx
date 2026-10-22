'use client';
// Dashboard › Facturación electrónica (Guatemala): facturas cambiarias. Cada
// una se emite con sus abonos programados (fecha y monto); aquí se ven los
// que vencen en los próximos 30 días y los que ya vencieron.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { C, FONT, radius } from '@/components/ui/primitives';
import type { AbonoFcam } from '@/lib/perfilPais';

interface Doc { id: string; numero_factura: string; cliente_nombre: string; moneda: string; total: number; estado: string; tipo_dte?: string | null; abonos_json?: string | null }
interface Abono extends AbonoFcam { facturaId: string; numeroFactura: string; cliente: string; moneda: string; dias: number }

const money = (n: number, moneda = 'CRC') => `${moneda === 'USD' ? '$' : 'Q'}${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fecha = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');

export default function CambiariasDashboard() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch('/api/documentos').then(r => r.json()).then((l: Doc[]) => { if (vivo) setDocs(Array.isArray(l) ? l : []); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  if (!docs) return null;
  const hoy = new Date(new Date().toISOString().slice(0, 10) + 'T12:00:00').getTime();
  const cambiarias = docs.filter(d => d.tipo_dte === 'FCAM' && !['Rechazado', 'Borrador', 'Error', 'Anulado'].includes(d.estado));
  if (!cambiarias.length) return null;
  const abonos: Abono[] = cambiarias.flatMap(d => {
    let lista: AbonoFcam[] = [];
    try { lista = d.abonos_json ? JSON.parse(d.abonos_json) : []; } catch { lista = []; }
    // Los abonos ya cobrados no se muestran como pendientes
    return lista.filter(a => !a.pagado).map(a => ({ ...a, facturaId: d.id, numeroFactura: d.numero_factura, cliente: d.cliente_nombre, moneda: d.moneda,
      dias: Math.round((new Date(a.fechaVencimiento + 'T12:00:00').getTime() - hoy) / 86400000) }));
  });
  const proximos = abonos.filter(a => a.dias >= 0 && a.dias <= 30).sort((a, b) => a.dias - b.dias);
  const vencidos = abonos.filter(a => a.dias < 0).sort((a, b) => a.dias - b.dias);
  const suma = (l: Abono[]) => l.reduce((s, a) => s + Number(a.monto), 0);

  const kpi = (l: string, v: string, nota: string, color?: string) => (
    <div style={{ background: C.n200, borderRadius: radius.md, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: C.n700, marginBottom: 6 }}>{l}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: color ?? C.n900, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
      <div style={{ fontSize: 11.5, color: C.n700, marginTop: 4 }}>{nota}</div>
    </div>
  );
  const fila = { display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, padding: '10px 0', borderTop: `1px solid ${C.n200}` };
  const renglon = (a: Abono) => (
    <div key={`${a.facturaId}-${a.numero}`} style={fila}>
      <Link href={`/facturacion/emitidos/${a.facturaId.replace('#', '')}`} style={{ color: C.brand, fontWeight: 500, minWidth: 150 }}>{a.numeroFactura}</Link>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.cliente} · abono {a.numero}</span>
      <span style={{ color: a.dias < 0 ? C.error : a.dias <= 7 ? C.error : C.n700, whiteSpace: 'nowrap' }}>
        {a.dias < 0 ? `venció hace ${-a.dias} días` : a.dias === 0 ? 'vence hoy' : `vence en ${a.dias} días`} · {fecha(a.fechaVencimiento)}
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 110, textAlign: 'right' }}>{money(a.monto, a.moneda)}</span>
    </div>
  );

  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEC', borderRadius: 10, padding: '20px 22px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Facturas cambiarias</div>
          <div style={{ fontSize: 12, color: C.n700, marginTop: 2 }}>Ventas a crédito con sus abonos programados: cuándo vence cada pago y cuánto.</div>
        </div>
        <Link href="/facturacion/emitidos" style={{ fontSize: 12.5, color: C.brand, fontWeight: 500 }}>Ir a Ventas</Link>
      </div>
      <div className="dash-row-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {kpi('Facturas cambiarias', String(cambiarias.length), money(cambiarias.reduce((s, d) => s + Number(d.total), 0)))}
        {kpi('Vencen en 30 días', money(suma(proximos)), `${proximos.length} abono${proximos.length === 1 ? '' : 's'}`)}
        {kpi('Abonos vencidos', money(suma(vencidos)), `${vencidos.length} abono${vencidos.length === 1 ? '' : 's'}: revisa si ya se cobraron`, vencidos.length ? C.error : undefined)}
      </div>
      {(vencidos.length > 0 || proximos.length > 0) && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.n700, marginBottom: 2 }}>Abonos por cobrar</div>
          {[...vencidos, ...proximos].slice(0, 6).map(renglon)}
        </div>
      )}
    </div>
  );
}
