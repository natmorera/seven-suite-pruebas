'use client';
// «Módulos»: lista corta de los módulos de la empresa para saltar entre ellos,
// con el actual marcado, y el botón para volver al menú principal de la suite.
import { C, FONT, Modal } from '@/components/ui/primitives';
import { Isotipo } from '@/components/ui/OrigenModulo';
import { MODULOS_SUITE, URL_MENU_SUITE, type ModuloSuite } from '@/components/ui/modulosSuite';
import { useModulos, modoDe, MODO_FIJO } from '@/lib/modulosCliente';

export function IsotiposModulo({ m, size = 26 }: { m: ModuloSuite; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {m.colores.map((c, i) => <span key={i} style={{ marginLeft: i ? -size * 0.25 : 0, display: 'inline-flex' }}><Isotipo colores={c} size={size} /></span>)}
    </span>
  );
}

const ID_DE_MODO = { completo: 'ACC_DICR', dicr: 'DICR', acc: 'ACC' } as const;
export function useModuloActual(): string {
  return ID_DE_MODO[modoDe(useModulos())];
}

export default function ModulosSuiteModal({ onClose }: { onClose: () => void }) {
  const actual = useModuloActual();
  // ACC + DICR y DICR son este mismo sitio: se cambia de versión sin salir
  const enlace = (m: ModuloSuite) => !MODO_FIJO && (m.id === 'ACC_DICR' || m.id === 'DICR') ? `/dashboard?modo=${m.id === 'DICR' ? 'dicr' : 'completo'}` : m.url;
  // Sin versión fija, ACC + DICR y DICR siempre están (son este sitio)
  const lista = MODULOS_SUITE.filter(m => m.url || m.id === actual || (!MODO_FIJO && (m.id === 'ACC_DICR' || m.id === 'DICR')));
  return (
    <Modal open title="Módulos" onClose={onClose} width={440}>
      <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {URL_MENU_SUITE && (
          <a href={URL_MENU_SUITE} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, borderRadius: 8, background: C.n900, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" /><rect x="8" y="1.5" width="4.5" height="4.5" rx="1" /><rect x="1.5" y="8" width="4.5" height="4.5" rx="1" /><rect x="8" y="8" width="4.5" height="4.5" rx="1" /></svg>
            Ir al menú principal
          </a>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', border: `1px solid ${C.n500}`, borderRadius: 10, overflow: 'hidden' }}>
          {lista.map((m, i) => {
            const esActual = m.id === actual;
            const href = enlace(m);
            const fila = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', textDecoration: 'none', color: C.n900,
              borderTop: i ? `1px solid ${C.n500}` : 'none', background: esActual ? m.fondo : '#fff' } as const;
            const cuerpo = <>
              <IsotiposModulo m={m} size={22} />
              <span style={{ flex: 1, minWidth: 0 }}>
                {m.sigla && <span style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: m.texto, letterSpacing: '.04em' }}>{m.sigla}</span>}
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{m.nombre}</span>
              </span>
              {esActual
                ? <span style={{ fontSize: 11.5, fontWeight: 600, color: m.texto }}>Estás aquí</span>
                : <span aria-hidden style={{ color: C.n700, fontSize: 16 }}>→</span>}
            </>;
            return href && !esActual
              ? <a key={m.id} href={href} style={fila} title={m.descripcion}>{cuerpo}</a>
              : <div key={m.id} style={fila} aria-current={esActual ? 'page' : undefined}>{cuerpo}</div>;
          })}
        </div>
      </div>
    </Modal>
  );
}
