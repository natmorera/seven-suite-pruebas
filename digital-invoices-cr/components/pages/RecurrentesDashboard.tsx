'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { C, FONT, StatusBadge, Button, radius } from '@/components/ui/primitives';
import { useTareasHechas } from '@/lib/tareasCliente';

interface Rec { id: string; documento_id: string; frecuencia: string; proxima: string; modo: string; ultimo_error: string; cliente_nombre: string; total: number; moneda: string }
interface Emitida { id: string; numero_factura: string; cliente_nombre: string; total: number; moneda: string; estado: string; envio_correo: string; automatica: number }
interface Resumen { emitidasHoy: Emitida[]; porEmitir: Rec[]; proximas: Rec[]; activas: number }

const money = (n: number, m: string) => `${m === 'USD' ? '$' : '₡'}${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fecha = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
export const URL_RECURRENTES = '/facturacion/emitidos?tab=recurrentes';

export default function RecurrentesDashboard() {
  const [d, setD] = useState<Resumen | null>(null);
  const [version, setVersion] = useState(0);
  const [emitiendo, setEmitiendo] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useTareasHechas(r => { if (r.recurrentes.emitidas.length) setVersion(v => v + 1); });
  useEffect(() => {
    let vivo = true;
    fetch('/api/recurrentes/resumen').then(r => r.json()).then((x: Resumen) => { if (vivo) setD(x); }).catch(() => {});
    return () => { vivo = false; };
  }, [version]);

  async function emitirAhora(r: Rec) {
    setEmitiendo(r.id); setMsg(null);
    const res = await fetch(`/api/recurrentes/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'emitir' }) });
    const j = await res.json().catch(() => ({}));
    setEmitiendo(null);
    setMsg(res.ok ? `Se emitió ${j.consecutivo} para ${r.cliente_nombre}.` : (j.error ?? 'No se pudo emitir.'));
    setVersion(v => v + 1);
  }

  if (!d) return null;
  const col = { background: C.n200, borderRadius: radius.md, padding: 12, display: 'flex', flexDirection: 'column' as const, gap: 8, minWidth: 0 };
  const titulo = (t: string, n: number, color: string) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: 22, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
      <span style={{ fontSize: 12, color: C.n700 }}>{t}</span>
    </div>
  );
  const fila = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, background: '#fff', borderRadius: 6, padding: '6px 8px' };

  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEC', borderRadius: 10, padding: '18px 20px', fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Facturas recurrentes</div>
          <div style={{ fontSize: 12, color: C.n700 }}>{d.activas} activa{d.activas === 1 ? '' : 's'}</div>
        </div>
        <Link href={URL_RECURRENTES} style={{ fontSize: 12.5, color: C.brand, fontWeight: 500 }}>Ver todas</Link>
      </div>
      {msg && <div style={{ fontSize: 12, marginBottom: 10, color: C.n900 }}>{msg}</div>}
      <div className="dash-row-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <div style={col}>
          {titulo('emitidas hoy', d.emitidasHoy.length, C.success)}
          {d.emitidasHoy.slice(0, 5).map(e => (
            <Link key={e.id} href={`/facturacion/emitidos/${e.id.replace('#', '')}`} style={{ ...fila, color: C.n900, textDecoration: 'none' }}>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.cliente_nombre}</span>
              {e.envio_correo === 'sin_correo' ? <StatusBadge label="Sin enviar" color="orange" title="El receptor no tiene correo" /> : Number(e.automatica) === 1 ? <StatusBadge label="Sola" color="blue" title="Se emitió automáticamente" /> : null}
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(e.total, e.moneda)}</span>
            </Link>
          ))}
          {!d.emitidasHoy.length && <span style={{ fontSize: 12, color: C.n700 }}>Todavía no se ha emitido ninguna hoy.</span>}
        </div>
        <div style={col}>
          {titulo('por emitir', d.porEmitir.length, d.porEmitir.length ? C.error : C.n700)}
          {d.porEmitir.slice(0, 5).map(r => (
            <div key={r.id} style={fila}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.cliente_nombre}</div>
                <div style={{ fontSize: 10.5, color: r.ultimo_error ? C.error : C.n700 }}>
                  {r.ultimo_error ? `No se pudo emitir: ${r.ultimo_error}` : r.modo === 'automatica' ? 'Se emite sola en la próxima revisión' : `Tocaba el ${fecha(r.proxima)}`}
                </div>
              </div>
              {(r.modo !== 'automatica' || r.ultimo_error) && (
                <Button onClick={() => emitirAhora(r)} disabled={emitiendo === r.id} style={{ height: 26, padding: '0 10px', fontSize: 11.5 }}>{emitiendo === r.id ? 'Emitiendo…' : 'Emitir ahora'}</Button>
              )}
            </div>
          ))}
          {!d.porEmitir.length && <span style={{ fontSize: 12, color: C.n700 }}>No hay recurrentes pendientes.</span>}
        </div>
        <div style={col}>
          {titulo('próximos 7 días', d.proximas.length, C.brand)}
          {d.proximas.slice(0, 5).map(r => (
            <div key={r.id} style={fila}>
              <span style={{ width: 78, color: C.n700 }}>{fecha(r.proxima)}</span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.cliente_nombre}</span>
              {r.modo === 'automatica' && <StatusBadge label="Automática" color="blue" />}
            </div>
          ))}
          {!d.proximas.length && <span style={{ fontSize: 12, color: C.n700 }}>Nada en los próximos 7 días.</span>}
        </div>
      </div>
    </div>
  );
}
