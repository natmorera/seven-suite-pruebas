'use client';
// Pie de la integración de un módulo: «Cancelar» descarta los cambios y «Verificar y guardar» comprueba que todo
// funcione (conexión, perfiles, contabilidad y envío de datos). Si todo pasa, pide confirmación para guardar; si no,
// muestra qué falta.
import { useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';
import { ModalBase, useConfirmar } from '@/components/kit';
import { fmtFH } from '@/components/kit/fechas';
import { useConfig } from '../../store';
import { nombreModulo } from '../../catalogo';
import type { ModuloId } from '../../tipos';
import type { useIntegracion } from './integracion';

const Marca = ({ ok }: { ok: boolean }) => (
  <span aria-hidden style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: ok ? C.success : C.error, color: '#fff' }}>
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      {ok ? <path d="m5 12 5 5 9-10" /> : <path d="M6 6l12 12M18 6 6 18" />}
    </svg>
  </span>
);

export function PieIntegracion({ m, it, previosListos, falta, onSalir }: {
  m: ModuloId; it: ReturnType<typeof useIntegracion>; previosListos: boolean; falta: string; onSalir: () => void;
}) {
  const { sucio, guardar, descartar } = useConfig();
  const { pedir, dialogo } = useConfirmar();
  const [verificando, setVerificando] = useState(false);
  const [resultado, setResultado] = useState<boolean | null>(null);
  const c = it.conexion(m);
  const lista = it.comprobaciones(m);
  const verificar = () => {
    setVerificando(true);
    setTimeout(() => { setVerificando(false); setResultado(lista.every(x => x.ok)); }, 900);
  };
  const confirmarGuardar = () => { guardar(); it.verificar(m); setResultado(null); };
  const cancelar = () => (sucio
    ? pedir('Descartar cambios', 'Se perderán los cambios de la integración que no guardaste. ¿Continuar?', () => { descartar(); onSalir(); }, { accion: 'Descartar' })
    : onSalir());

  return (
    <>
      <div className="editor-pie" style={{ position: 'sticky', bottom: -24, margin: 'auto -24px -24px', padding: '12px 24px', background: C.n000, borderTop: `1px solid ${C.n500}`,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, fontFamily: FONT, zIndex: 3 }}>
        <span style={{ marginRight: 'auto', fontSize: 12, color: C.n700 }}>
          {c.verificada && !sucio ? `Verificada y guardada el ${fmtFH(c.verificada)}.` : !previosListos ? `Para verificar falta: ${falta}.` : sucio ? 'Hay cambios sin guardar.' : ''}
        </span>
        <Button variant="secondary" onClick={cancelar}>Cancelar</Button>
        <Button disabled={!previosListos || verificando} onClick={verificar}>{verificando ? 'Verificando…' : 'Verificar y guardar'}</Button>
      </div>
      {resultado !== null && (
        <ModalBase titulo={resultado ? `La integración de ${nombreModulo(m)} funciona` : 'Hay comprobaciones pendientes'} onClose={() => setResultado(null)} ancho={560}
          pie={resultado
            ? <><Button variant="secondary" onClick={() => setResultado(null)}>Volver</Button><Button onClick={confirmarGuardar}>Guardar</Button></>
            : <Button onClick={() => setResultado(null)}>Revisar</Button>}>
          <ul aria-label="Comprobaciones" style={{ listStyle: 'none', margin: 0, padding: 0, border: `1px solid ${C.n500}`, borderRadius: radius.md, fontFamily: FONT }}>
            {lista.map((x, i) => (
              <li key={x.titulo} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: i ? `1px solid ${C.n500}` : 'none', fontSize: 12.5 }}>
                <Marca ok={x.ok} />
                <span style={{ fontWeight: 500, color: C.n900, minWidth: 150 }}>{x.titulo}</span>
                <span style={{ color: C.n700 }}>{x.detalle}</span>
              </li>
            ))}
          </ul>
          {resultado && <p style={{ margin: '12px 0 0', fontSize: 12.5, color: C.n900, fontFamily: FONT }}>¿Guardar la integración? {nombreModulo(m)} quedará listo para operar.</p>}
        </ModalBase>
      )}
      {dialogo}
    </>
  );
}
