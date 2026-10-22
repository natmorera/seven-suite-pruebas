'use client';
// Envío de datos de un módulo: por cada módulo contratado, si este le envía datos y si recibe datos de él. Por ahora solo
// se pueden enlazar el producto contable y Front Desk; los demás quedan bloqueados. Un enlace que necesita parámetros
// (Front Desk → Accounting) muestra «Configurar»: ahí se pega el API Key del otro módulo si falta y se completa la
// configuración contable. Los enlaces se crean al «Verificar y guardar».
import { useState } from 'react';
import { C, FONT } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';
import { Celda, Fila, Insignia, Tabla, uid } from '@/components/kit';
import { useDato } from '../../store';
import { nombreModulo, puedeEnviar } from '../../catalogo';
import { ChipModulo } from '../../piezas';
import type { ModuloId } from '../../tipos';
import { ConfigurarEnvio } from './ConfigurarEnvio';
import { llevaContabilidad, type useIntegracion } from './integracion';

export function EnvioDatos({ m, it }: { m: ModuloId; it: ReturnType<typeof useIntegracion> }) {
  const [enlaces, set] = useDato('enlaces');
  const [configurando, setConfigurando] = useState<{ origen: ModuloId; destino: ModuloId } | null>(null);
  const otros = it.contratados.filter(x => x !== m);
  const enlace = (origen: ModuloId, destino: ModuloId) => enlaces.find(e => e.origen === origen && e.destino === destino);
  const marcar = (origen: ModuloId, destino: ModuloId, on: boolean) => set(prev => (prev.some(e => e.origen === origen && e.destino === destino)
    ? prev.map(e => (e.origen === origen && e.destino === destino ? { ...e, activo: on } : e))
    : [...prev, { id: uid(), origen, destino, ultimaSync: '', estado: 'Nunca', activo: on, pendiente: true }]));

  const casilla = (origen: ModuloId, destino: ModuloId, texto: string) => {
    const existe = puedeEnviar(origen, destino);
    return existe
      ? <input type="checkbox" checked={!!enlace(origen, destino)?.activo} onChange={ev => marcar(origen, destino, ev.target.checked)} aria-label={texto} style={{ cursor: 'pointer' }} />
      : <span title="Todavía no hay envío de datos entre estos módulos" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.n700 }}>
          <input type="checkbox" disabled aria-label={texto} style={{ cursor: 'not-allowed' }} />No disponible
        </span>;
  };
  /** Enlace marcado de esta fila que necesita configuración, si lo hay. */
  const porConfigurar = (o: ModuloId) => ([[m, o], [o, m]] as [ModuloId, ModuloId][])
    .find(([a, b]) => llevaContabilidad(a, b) && enlace(a, b)?.activo);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: FONT }}>
      <Tabla headers={['Módulo', `${nombreModulo(m)} le envía`, `${nombreModulo(m)} recibe de él`, 'Configuración']} anchos={{ 1: 190, 2: 190, 3: 230 }}>
        {otros.map(o => {
          const conf = porConfigurar(o);
          const e = conf && enlace(conf[0], conf[1]);
          return (
            <Fila key={o}>
              <Celda><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ChipModulo m={o} /><span style={{ color: C.n700 }}>{nombreModulo(o)}</span></span></Celda>
              <Celda>{casilla(m, o, `Enviar datos de ${nombreModulo(m)} a ${nombreModulo(o)}`)}</Celda>
              <Celda>{casilla(o, m, `Recibir datos de ${nombreModulo(o)} en ${nombreModulo(m)}`)}</Celda>
              <Celda>
                {conf && e ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Button variant="secondary" onClick={() => setConfigurando({ origen: conf[0], destino: conf[1] })}>Configurar</Button>
                    <Insignia label={it.enlaceListo(e) ? 'Configurado' : 'Pendiente'} color={it.enlaceListo(e) ? 'green' : 'yellow'} />
                  </span>
                ) : <span style={{ color: C.n700 }}>—</span>}
              </Celda>
            </Fila>
          );
        })}
      </Tabla>
      {configurando && <ConfigurarEnvio origen={configurando.origen} destino={configurando.destino} actual={m} it={it} onClose={() => setConfigurando(null)} />}
    </section>
  );
}
