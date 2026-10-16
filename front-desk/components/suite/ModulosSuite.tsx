'use client';
// «Módulos»: salto entre los módulos de la empresa, con el actual marcado, y
// botón para volver al menú principal de Seven Suite. Igual que en Accounting.
import { useId } from 'react';
import { C, FONT, radius } from './tokens';
import { Modal } from './ui';
import { MODULOS_SUITE, URL_MENU_SUITE, type ModuloSuite } from './modulos';
import { IcModulos } from './icons';

export function Isotipo({ colores, size = 12 }: { colores: [string, string]; size?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={(size * 11) / 12} viewBox="0 0 12 11" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M4.48475 10.3275H0V0H8.77964C6.95357 3.08871 5.38741 6.75999 4.49772 10.2777C4.49254 10.2948 4.48942 10.3109 4.48475 10.3275Z" fill={`url(#a${id})`} />
      <path d="M11.9998 10.3277H8.02295C8.91783 6.83795 10.2256 3.66728 11.9998 0.404785V10.3277Z" fill={`url(#b${id})`} />
      <defs>
        <linearGradient id={`a${id}`} x1="7.64316" y1="-3.88477" x2="-1.21149" y2="-2.42678" gradientUnits="userSpaceOnUse"><stop stopColor={colores[0]} /><stop offset="1" stopColor={colores[1]} /></linearGradient>
        <linearGradient id={`b${id}`} x1="11.485" y1="-3.32777" x2="7.39012" y2="-3.0099" gradientUnits="userSpaceOnUse"><stop stopColor={colores[0]} /><stop offset="1" stopColor={colores[1]} /></linearGradient>
      </defs>
    </svg>
  );
}

export function IsotiposModulo({ m, size = 22 }: { m: ModuloSuite; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {m.colores.map((c, i) => <span key={i} style={{ marginLeft: i ? -size * 0.25 : 0, display: 'inline-flex' }}><Isotipo colores={c} size={size} /></span>)}
    </span>
  );
}

export default function ModulosSuiteModal({ actual, onClose }: { actual: string; onClose: () => void }) {
  const lista = MODULOS_SUITE.filter(m => m.url || m.id === actual);
  return (
    <Modal open title="Módulos" onClose={onClose} width={440}>
      <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {URL_MENU_SUITE && (
          <a href={URL_MENU_SUITE} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, borderRadius: radius.md,
            background: C.n900, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <IcModulos /> Ir al menú principal
          </a>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', border: `1px solid ${C.n500}`, borderRadius: radius.card, overflow: 'hidden' }}>
          {lista.map((m, i) => {
            const esActual = m.id === actual;
            const fila = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', textDecoration: 'none', color: C.n900,
              borderTop: i ? `1px solid ${C.n500}` : 'none', background: esActual ? m.fondo : '#fff' } as const;
            const cuerpo = (
              <>
                <IsotiposModulo m={m} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  {m.sigla && <span style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: m.texto, letterSpacing: '.04em' }}>{m.sigla}</span>}
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{m.nombre}</span>
                </span>
                {esActual
                  ? <span style={{ fontSize: 11.5, fontWeight: 600, color: m.texto }}>Estás aquí</span>
                  : <span aria-hidden style={{ color: C.n700, fontSize: 16 }}>›</span>}
              </>
            );
            return m.url && !esActual
              ? <a key={m.id} href={m.url} style={fila} title={m.descripcion}>{cuerpo}</a>
              : <div key={m.id} style={fila} aria-current={esActual ? 'page' : undefined}>{cuerpo}</div>;
          })}
        </div>
      </div>
    </Modal>
  );
}
