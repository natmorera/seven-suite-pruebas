'use client';
// Módulos › Entidades y datos: lista de entidades (hoteles o empresas) y, al abrir una, sus datos y la base de datos
// de cada módulo contratado (DetalleEntidad).
import { useState } from 'react';
import { AccionesEnHeader, FiltrosEnBarra } from '@/components/layout/Pantalla';
import { C } from '@/components/suite/tokens';
import { Button, Checkbox } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Buscador, Celda, Fila, FilaVacia, IcEdit, IconButton, IcTrash, Insignia, LinkButton, Tabla, norm, uid, useConfirmar, Paginacion, usePaginado } from '@/components/kit';
import { useDato, useOperacion } from '../../store';
import type { BaseDatos, Entidad } from '../../tipos';
import { DetalleEntidad, etiquetaFront } from './DetalleEntidad';
import { useCrearEnEscritorio } from '@/components/layout/SoloEscritorio';

export default function Entidades() {
  const enEscritorio = useCrearEnEscritorio();
  const [l, set] = useDato('entidades');
  // El resultado de probar una conexión no queda como cambio pendiente de guardar.
  const operar = useOperacion('entidades');
  const [modulos] = useDato('modulos');
  const [selId, setSelId] = useState('');
  const [q, setQ] = useState('');
  const [inactivas, setInactivas] = useState(false);
  const { pedir, dialogo } = useConfirmar();
  const contratados = modulos.filter(m => m.contratado).map(m => m.codigo);
  const sel = l.find(e => e.id === selId);
  const visibles = l.filter(e => (inactivas || e.activo) && (!q || norm(`${e.descripcion} ${e.bases.map(b => b.base).join(' ')}`).includes(norm(q))));
  const pag = usePaginado(visibles, 10);
  const bases = (e: Entidad) => contratados.map(m => e.bases.find(b => b.modulo === m && b.base)).filter(Boolean) as BaseDatos[];
  const nueva = () => {
    const id = uid();
    set([...l, { id, descripcion: `Nueva entidad ${l.length + 1}`, bitacora: true, frontPrincipal: '', activo: true, bases: [] }]);
    setSelId(id);
  };
  const eliminar = (e: Entidad) => pedir('Eliminar entidad', `¿Eliminar «${e.descripcion}» y sus datos de conexión?`, () => { set(l.filter(x => x.id !== e.id)); setSelId(''); });

  if (sel) return <DetalleEntidad e={sel} contratados={contratados} onVolver={() => setSelId('')} onEliminar={() => eliminar(sel)} dialogo={dialogo}
    onCambiar={p => set(prev => prev.map(x => (x.id === sel.id ? { ...x, ...p } : x)))}
    onEstado={(id, estado) => operar(prev => prev.map(x => ({ ...x, bases: x.bases.map(b => (b.id === id ? { ...b, estado } : b)) })))} />;

  return (
    <>
      <AccionesEnHeader><Button icon={<IcPlus size={12} />} onClick={enEscritorio(nueva)}>Nueva entidad</Button></AccionesEnHeader>
      <FiltrosEnBarra>
        <Buscador value={q} onChange={setQ} placeholder="Entidad o base de datos" width={240} />
        <Checkbox checked={inactivas} onChange={setInactivas} label="Mostrar inactivas" />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.n700 }}>{visibles.length} entidades</span>
      </FiltrosEnBarra>
      <Tabla headers={['Descripción', 'Front Desk principal', 'Bitácora', 'Bases de datos', 'Estado', '']} anchos={{ 2: 90, 4: 100, 5: 70 }} alinearDerecha={[5]}>
        {pag.visibles.length === 0 && <FilaVacia cols={6} />}
        {pag.visibles.map(e => {
          const bs = bases(e);
          const ok = bs.filter(b => b.estado === 'Conectada').length;
          const errores = bs.filter(b => b.estado === 'Error').length;
          return (
            <Fila key={e.id} style={e.activo ? undefined : { color: C.n700 }}>
              <Celda><LinkButton onClick={() => setSelId(e.id)}>{e.descripcion}</LinkButton></Celda>
              <Celda muted>{e.frontPrincipal ? etiquetaFront(l, e.frontPrincipal) : 'Sin asignar'}</Celda>
              <Celda>{e.bitacora ? 'Sí' : 'No'}</Celda>
              <Celda>
                {bs.length} de {contratados.length} configuradas · {ok} conectadas
                {errores > 0 && <span style={{ marginLeft: 8 }}><Insignia label={`${errores} con error`} color="red" /></span>}
              </Celda>
              <Celda><Insignia label={e.activo ? 'Activa' : 'Inactiva'} color={e.activo ? 'green' : 'gray'} /></Celda>
              <Celda derecha>
                <span style={{ display: 'inline-flex', gap: 2 }}>
                  <IconButton label={`Abrir ${e.descripcion}`} onClick={() => setSelId(e.id)}><IcEdit /></IconButton>
                  <IconButton label={`Eliminar ${e.descripcion}`} tono="peligro" onClick={() => eliminar(e)}><IcTrash /></IconButton>
                </span>
              </Celda>
            </Fila>
          );
        })}
      </Tabla>
      <Paginacion pag={pag} />
      {dialogo}
    </>
  );
}

