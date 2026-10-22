'use client';
// Panel de notificaciones que se abre con la campana del menú: lista lo que necesita atención en el MAN, lleva a la
// pantalla donde se resuelve y permite marcar como leídas.
import { useState } from 'react';
import Link from 'next/link';
import { C, FONT, radius } from '@/components/suite/tokens';
import { IcClose } from '@/components/suite/icons';
import { useConfig } from '@/components/man/store';
import { avisosDe } from '@/components/man/avisos';

export function PanelNotificaciones({ onClose }: { onClose: () => void }) {
  const { datos } = useConfig();
  const [leidas, setLeidas] = useState<string[]>([]);
  const avisos = avisosDe(datos);
  const nuevas = avisos.filter(a => !leidas.includes(a.id));
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'rgba(0,0,0,.25)', fontFamily: FONT }}>
      <aside role="dialog" aria-label="Notificaciones" onClick={e => e.stopPropagation()}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(400px, 100vw)', background: C.n000, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', minHeight: 52, borderBottom: `1px solid ${C.n500}` }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: C.n900, marginRight: 'auto' }}>Notificaciones{nuevas.length ? ` (${nuevas.length})` : ''}</span>
          {nuevas.length > 0 && (
            <button type="button" onClick={() => setLeidas(avisos.map(a => a.id))}
              style={{ background: 'none', border: 'none', color: C.brand, fontSize: 12, cursor: 'pointer', fontFamily: FONT, textDecoration: 'underline', textUnderlineOffset: 3 }}>Marcar todas como leídas</button>
          )}
          <button type="button" onClick={onClose} aria-label="Cerrar notificaciones" style={{ background: 'none', border: 'none', color: C.n700, cursor: 'pointer', display: 'flex', padding: 4 }}><IcClose size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {avisos.length === 0 && <p style={{ fontSize: 12.5, color: C.n700, textAlign: 'center', padding: 32, margin: 0 }}>No hay notificaciones.</p>}
          {avisos.map(a => {
            const leida = leidas.includes(a.id);
            return (
              <Link key={a.id} href={a.ruta} onClick={() => { setLeidas(l => [...l, a.id]); onClose(); }}
                style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: radius.md, textDecoration: 'none', background: leida ? 'transparent' : C.n200 }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: leida ? 'transparent' : a.tono === 'error' ? C.error : C.warning }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ fontSize: 12.5, color: C.n900, fontWeight: leida ? 400 : 500 }}>{a.titulo}</span>
                  <span style={{ fontSize: 11.5, color: C.n700 }}>{a.detalle}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
