'use client';
// Módulos › Enlaces: los enlaces creados al verificar y guardar la integración de un módulo (origen → destino), con su
// estado, la última actualización y los datos nuevos que esperan pasar. «Refrescar» trae lo nuevo del origen.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiltrosEnBarra } from '@/components/layout/Pantalla';
import { C } from '@/components/suite/tokens';
import { Toast } from '@/components/suite/ui';
import { Celda, Fila, FilaVacia, FiltroOpciones, Insignia, LinkButton, OutlineButton, Paginacion, Tabla, usePaginado } from '@/components/kit';
import { fmtFH } from '@/components/kit/fechas';
import { useDato, useOperacion } from '../../store';
import { nombreModulo } from '../../catalogo';
import { ChipModulo, ahora, opcionesModulos } from '../../piezas';
import type { Enlace } from '../../tipos';

const COLOR = { 'Al día': 'green', 'Con error': 'red', Nunca: 'gray' } as const;

export default function Enlaces() {
  const router = useRouter();
  const [l] = useDato('enlaces');
  const [modulos] = useDato('modulos');
  const [modulo, setModulo] = useState('');
  const [aviso, setAviso] = useState('');
  const operar = useOperacion('enlaces');
  const contratados = modulos.filter(m => m.contratado).map(m => m.codigo);
  // Solo los enlaces creados: los marcados en una integración aparecen al verificarla y guardarla.
  const creados = l.filter(e => e.activo && !e.pendiente);
  const visibles = creados.filter(e => !modulo || e.origen === modulo || e.destino === modulo);
  const pag = usePaginado(visibles, 10);
  // Refrescar es una operación: no queda como cambio pendiente de guardar.
  const refrescar = (e: Enlace) => {
    operar(prev => prev.map(x => (x.id === e.id ? { ...x, ultimaSync: ahora(), estado: 'Al día', nuevos: 0 } : x)));
    setAviso(e.nuevos ? `Se pasaron ${e.nuevos} registros de ${nombreModulo(e.origen)} a ${nombreModulo(e.destino)}.` : 'No hay datos nuevos.');
  };

  return (
    <>
      <FiltrosEnBarra>
        <FiltroOpciones etiqueta="Módulo" value={modulo} onChange={v => { setModulo(v); pag.setPagina(1); }} opciones={opcionesModulos(contratados)} />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.n700 }}>{creados.length} {creados.length === 1 ? 'enlace' : 'enlaces'}</span>
      </FiltrosEnBarra>
      <Tabla headers={['Origen', 'Destino', 'Estado', 'Última actualización', 'Datos nuevos', '']} anchos={{ 2: 130, 3: 160, 4: 110, 5: 220 }} alinearDerecha={[4, 5]}>
        {pag.visibles.length === 0 && <FilaVacia cols={6} texto="Todavía no hay enlaces. Se crean al integrar un módulo." />}
        {pag.visibles.map(e => (
          <Fila key={e.id}>
            <Celda><ChipModulo m={e.origen} /></Celda>
            <Celda><ChipModulo m={e.destino} /></Celda>
            <Celda><Insignia label={e.estado === 'Nunca' ? 'Sin actualizar' : e.estado} color={COLOR[e.estado]} /></Celda>
            <Celda muted>{e.ultimaSync ? fmtFH(e.ultimaSync) : 'Nunca'}</Celda>
            <Celda derecha>{e.nuevos ?? 0}</Celda>
            <Celda derecha>
              <span style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}>
                <LinkButton onClick={() => router.push(`/modulos?modulo=${e.origen}`)}>Ver integración</LinkButton>
                <OutlineButton onClick={() => refrescar(e)}>Refrescar</OutlineButton>
              </span>
            </Celda>
          </Fila>
        ))}
      </Tabla>
      <Paginacion pag={pag} />
      {aviso && <Toast message={aviso} type="success" onClose={() => setAviso('')} />}
    </>
  );
}
