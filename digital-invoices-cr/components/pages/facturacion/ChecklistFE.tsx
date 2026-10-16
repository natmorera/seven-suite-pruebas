'use client';
// «Configura la facturación electrónica»: los pasos que faltan para emitir.
//   · completo: tarjeta con la lista y el avance (Información tributaria,
//     Dashboard). Con `bienvenida`, se presenta como el primer paso después
//     de activar la facturación.
//   · aviso: franja corta en Ventas, la factura y Configuración, que abre la
//     lista en un modal. No aparece si ya está todo lo obligatorio.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { C, FONT, Modal, Button, radius } from '@/components/ui/primitives';
import type { EstadoConfigFE, PasoConfig } from '@/lib/configuracionFE';

const EVENTO_CONFIG = 'config-fe-cambio';
export function useConfiguracionFE(version = 0) {
  const [estado, setEstado] = useState<EstadoConfigFE | null>(null);
  const [local, setLocal] = useState(0);
  useEffect(() => {
    const oir = () => setLocal(v => v + 1);
    window.addEventListener(EVENTO_CONFIG, oir);
    return () => window.removeEventListener(EVENTO_CONFIG, oir);
  }, []);
  useEffect(() => {
    let vivo = true;
    fetch('/api/facturacion/configuracion').then(r => r.json()).then((d: EstadoConfigFE) => { if (vivo) setEstado(d); }).catch(() => {});
    return () => { vivo = false; };
  }, [version, local]);
  return estado;
}

// Marca como listo un paso que lo permite (credenciales en el prototipo)
async function completarManual(paso: string) {
  await fetch('/api/facturacion/configuracion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paso }) }).catch(() => {});
  window.dispatchEvent(new Event(EVENTO_CONFIG));
}

const Check = ({ listo }: { listo: boolean }) => (
  <span aria-hidden style={{ width: 22, height: 22, borderRadius: 11, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: listo ? C.success : '#fff', border: `1.5px solid ${listo ? C.success : C.n500}` }}>
    {listo && <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.2l3 3 6-6.4" /></svg>}
  </span>
);

function ListaPasos({ pasos, onIr }: { pasos: PasoConfig[]; onIr?: () => void }) {
  const siguiente = pasos.find(p => !p.listo && p.obligatorio) ?? pasos.find(p => !p.listo);
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {pasos.map((p, i) => {
        const esSiguiente = p === siguiente;
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderTop: i ? `1px solid ${C.n200}` : 'none',
            background: esSiguiente ? C.brandBg : 'transparent', borderRadius: esSiguiente ? radius.md : 0 }}>
            <Check listo={p.listo} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: esSiguiente ? 600 : 500, color: p.listo ? C.n700 : C.n900, textDecoration: p.listo ? 'line-through' : 'none' }}>
                {p.titulo}{!p.obligatorio && <span style={{ fontWeight: 400, color: C.n700 }}> · recomendado</span>}
              </div>
              {!p.listo && <div style={{ fontSize: 11.5, color: C.n700, marginTop: 2 }}>{p.detalle}</div>}
            </div>
            {!p.listo && p.manual && (
              <button onClick={() => completarManual(p.id)}
                style={{ fontSize: 12, fontWeight: 500, color: esSiguiente ? '#fff' : C.brand, whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: FONT,
                  background: esSiguiente ? C.brand : 'transparent', border: `1px solid ${C.brand}`, borderRadius: radius.md, padding: '5px 12px' }}>
                Completar
              </button>
            )}
            {!p.listo && !p.manual && (
              <Link href={p.href} onClick={onIr} style={{ fontSize: 12, fontWeight: 500, color: esSiguiente ? '#fff' : C.brand, textDecoration: 'none', whiteSpace: 'nowrap',
                background: esSiguiente ? C.brand : 'transparent', border: `1px solid ${C.brand}`, borderRadius: radius.md, padding: '5px 12px' }}>
                {esSiguiente ? 'Completar' : 'Ir'}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ChecklistFE({ variante, bienvenida, version = 0, margen = '12px 24px 0' }: { variante: 'completo' | 'aviso'; bienvenida?: boolean; version?: number; margen?: string }) {
  const estado = useConfiguracionFE(version);
  const [abierto, setAbierto] = useState(false);
  if (!estado || !estado.activa) return null;
  const obligatorios = estado.pasos.filter(p => p.obligatorio);
  const listos = obligatorios.filter(p => p.listo).length;
  const falta = estado.faltanObligatorios;

  if (variante === 'aviso') {
    if (!falta) return null;
    return (
      <>
        <div style={{ margin: margen, padding: '10px 14px', borderRadius: radius.md, background: 'rgba(238,179,0,.08)', border: '1px solid rgba(238,179,0,.35)',
          fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontFamily: FONT }}>
          <span style={{ flex: 1, minWidth: 240 }}>
            <b style={{ fontWeight: 600 }}>Te falta{falta === 1 ? '' : 'n'} {falta} paso{falta === 1 ? '' : 's'} para emitir comprobantes electrónicos.</b>{' '}
            {obligatorios.filter(p => !p.listo).map(p => p.titulo.toLowerCase()).join(', ')}.
          </span>
          <Button variant="secondary" onClick={() => setAbierto(true)}>Ver qué falta</Button>
        </div>
        {abierto && (
          <Modal open title="Configura la facturación electrónica" onClose={() => setAbierto(false)} width={560}>
            <p style={{ fontSize: 12.5, color: C.n700, margin: '0 0 10px' }}>{listos} de {obligatorios.length} pasos obligatorios listos.</p>
            <ListaPasos pasos={estado.pasos} onIr={() => setAbierto(false)} />
          </Modal>
        )}
      </>
    );
  }

  if (!falta && !bienvenida) return null;
  const pct = Math.round(listos / obligatorios.length * 100);
  return (
    <div style={{ background: '#fff', border: `1px solid ${falta ? C.brandBd : C.n500}`, borderRadius: radius.lg, padding: 18, fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            {!falta ? 'Todo listo para facturar' : bienvenida ? 'Activaste la facturación electrónica' : 'Configura la facturación electrónica'}
          </div>
          <div style={{ fontSize: 12.5, color: C.n700, marginTop: 4, lineHeight: 1.45 }}>
            {!falta
              ? 'Ya puedes emitir tu primer comprobante desde Ventas.'
              : bienvenida
                ? 'Antes de emitir tu primer comprobante, completa estos pasos. Puedes hacerlo en el orden que quieras; el sistema te avisa lo que falte.'
                : 'Estos datos son necesarios para que Hacienda acepte tus comprobantes.'}
          </div>
        </div>
        <div style={{ minWidth: 160 }}>
          <div style={{ fontSize: 11.5, color: C.n700, marginBottom: 4, textAlign: 'right' }}>{listos} de {obligatorios.length} pasos</div>
          <div style={{ height: 6, background: C.n200, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: falta ? C.brand : C.success, transition: 'width .3s' }} />
          </div>
        </div>
      </div>
      {falta ? <ListaPasos pasos={estado.pasos} /> : (
        <Link href="/facturacion/emitidos" style={{ fontSize: 12.5, color: C.brand, fontWeight: 500 }}>Ir a Ventas</Link>
      )}
    </div>
  );
}
