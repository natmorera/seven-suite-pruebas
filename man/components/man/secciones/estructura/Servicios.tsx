'use client';
// Estructura › Servicios: procesos de cada módulo sobre una base de datos (envío a Hacienda, sincronizaciones,
// integración contable, respaldos…). Aquí se crean; en Servidores se elige qué servidor corre cada uno.
import { useState } from 'react';
import { AccionesEnHeader, FiltrosEnBarra } from '@/components/layout/Pantalla';
import { C } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Select, Switch } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Aviso, Buscador, Campo, Celda, ConfigCard, Fila, FilaVacia, Grid, IcEdit, IconButton, IcTrash, Insignia, LinkButton, ModalBase, OutlineButton, Tabla, norm, uid, useConfirmar, Paginacion, usePaginado } from '@/components/kit';
import { fmtFH } from '@/components/kit/fechas';
import { useDato, useOperacion } from '../../store';
import { nombreModulo } from '../../catalogo';
import { ChipModulo, ahora } from '../../piezas';
import type { ModuloId, Servicio } from '../../tipos';
import { useCrearEnEscritorio } from '@/components/layout/SoloEscritorio';

const FRECUENCIAS = ['Cada minuto', 'Cada 5 minutos', 'Cada 15 minutos', 'Cada hora', 'Diario 02:00', 'Diario 03:00', 'A pedido'];

export default function Servicios() {
  const enEscritorio = useCrearEnEscritorio();
  const [l, set] = useDato('servicios');
  const [servidores, setServidores] = useDato('servidores');
  const [modulos] = useDato('modulos');
  const [entidades] = useDato('entidades');
  const [q, setQ] = useState('');
  const [inactivos, setInactivos] = useState(false);
  const [editando, setEditando] = useState<Servicio | null>(null);
  const { pedir, dialogo } = useConfirmar();
  const disponibles: ModuloId[] = [...modulos.filter(m => m.contratado).map(m => m.codigo), 'MAN'];
  const bases = [...new Set([...entidades.flatMap(e => e.bases.map(b => b.base)).filter(Boolean), ...l.map(s => s.base)])].sort();
  const enServidor = (id: string) => servidores.filter(s => s.servicios.some(a => a.servicio === id));
  const visibles = l.filter(s => (inactivos || s.activo) && (!q || norm(`${s.nombre} ${s.modulo} ${s.base}`).includes(norm(q))));
  const pag = usePaginado(visibles, 10);
  const patch = (id: string, p: Partial<Servicio>) => set(prev => prev.map(x => (x.id === id ? { ...x, ...p } : x)));
  const guardar = (s: Servicio) => { set(l.some(x => x.id === s.id) ? l.map(x => (x.id === s.id ? s : x)) : [...l, s]); setEditando(null); };
  const operar = useOperacion('servicios');
  // Ejecutar es una operación: no queda como cambio pendiente de guardar.
  const ejecutar = (s: Servicio) => pedir('Ejecutar ahora', `Se ejecutará «${s.nombre}» de ${nombreModulo(s.modulo)} (${s.base}) fuera de su horario. ¿Continuar?`,
    () => operar(prev => prev.map(x => (x.id === s.id ? { ...x, ultimaEjecucion: ahora(), estado: 'Correcto', mensaje: '' } : x))), { accion: 'Ejecutar', peligro: false });
  const eliminar = (s: Servicio) => pedir('Eliminar servicio', `¿Eliminar «${s.nombre}»? Se quitará de los servidores que lo corren.`, () => {
    set(l.filter(x => x.id !== s.id));
    setServidores(servidores.map(x => ({ ...x, servicios: x.servicios.filter(a => a.servicio !== s.id) })));
  });

  return (
    <ConfigCard title="Servicios">
      <AccionesEnHeader>
        <Button icon={<IcPlus size={12} />} onClick={enEscritorio(() => setEditando({ id: uid(), nombre: '', modulo: disponibles[0], base: '', frecuencia: 'Cada 5 minutos', ultimaEjecucion: '', estado: 'Sin ejecutar', mensaje: '', activo: true }))}>Nuevo servicio</Button>
      </AccionesEnHeader>
      <FiltrosEnBarra>
        <Buscador value={q} onChange={setQ} placeholder="Servicio, módulo o base" width={240} />
        <Checkbox checked={inactivos} onChange={setInactivos} label="Mostrar inactivos" />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.n700 }}>{visibles.length} servicios</span>
      </FiltrosEnBarra>
      {l.some(s => s.activo && s.estado === 'Con error') && <Aviso tono="warning">Hay servicios con error en la última ejecución. Revisa el mensaje y ejecútalos de nuevo.</Aviso>}
      <Tabla headers={['Servicio', 'Módulo y base de datos', 'Servidor', 'Última ejecución', 'Activo', '']} anchos={{ 3: 170, 4: 64, 5: 150 }} alinearDerecha={[5]}>
        {pag.visibles.length === 0 && <FilaVacia cols={6} />}
        {pag.visibles.map(s => {
          const srv = enServidor(s.id);
          return (
            <Fila key={s.id} style={s.activo ? undefined : { color: C.n700 }}>
              <Celda><LinkButton onClick={() => setEditando(s)}>{s.nombre}</LinkButton><span style={{ display: 'block', fontSize: 11.5, color: C.n700, marginTop: 2 }}>{s.frecuencia}</span></Celda>
              <Celda><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><ChipModulo m={s.modulo} />{s.base}</span></Celda>
              <Celda>{srv.length ? srv.map(x => x.descripcion).join(', ') : <span style={{ color: '#7A5C00' }}>Sin servidor</span>}</Celda>
              <Celda style={{ whiteSpace: 'normal' }}>
                <Insignia label={s.estado} color={s.estado === 'Correcto' ? 'green' : s.estado === 'Con error' ? 'red' : 'gray'} />
                <span style={{ display: 'block', fontSize: 11.5, color: C.n700, marginTop: 4 }}>{s.ultimaEjecucion ? fmtFH(s.ultimaEjecucion) : 'Nunca'}</span>
                {s.mensaje && <span style={{ display: 'block', fontSize: 11.5, color: C.error, marginTop: 2 }}>{s.mensaje}</span>}
              </Celda>
              <Celda><Switch checked={s.activo} onChange={b => patch(s.id, { activo: b })} label={<span className="sr-only">Activo</span>} /></Celda>
              <Celda derecha>
                <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
                  <OutlineButton disabled={!s.activo} onClick={() => ejecutar(s)}>Ejecutar</OutlineButton>
                  <IconButton label={`Editar ${s.nombre}`} onClick={() => setEditando(s)}><IcEdit /></IconButton>
                  <IconButton label={`Eliminar ${s.nombre}`} tono="peligro" onClick={() => eliminar(s)}><IcTrash /></IconButton>
                </span>
              </Celda>
            </Fila>
          );
        })}
      </Tabla>
      <Paginacion pag={pag} />
      {editando && <EditarServicio inicial={editando} modulos={disponibles} bases={bases} onClose={() => setEditando(null)} onGuardar={guardar} />}
      {dialogo}
    </ConfigCard>
  );
}

function EditarServicio({ inicial, modulos, bases, onClose, onGuardar }: { inicial: Servicio; modulos: ModuloId[]; bases: string[]; onClose: () => void; onGuardar: (s: Servicio) => void }) {
  const [s, setS] = useState(inicial);
  const valido = s.nombre.trim() && s.base;
  return (
    <ModalBase titulo={inicial.nombre ? 'Editar servicio' : 'Nuevo servicio'} onClose={onClose} ancho={560}
      pie={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!valido} onClick={() => onGuardar({ ...s, nombre: s.nombre.trim() })}>Guardar</Button></>}>
      <Grid cols={2}>
        <Campo label="Nombre del servicio" required style={{ gridColumn: '1 / -1' }}><Input value={s.nombre} onChange={v => setS({ ...s, nombre: v })} placeholder="Ej: Envío de comprobantes a Hacienda" /></Campo>
        <Campo label="Módulo" required><Select value={s.modulo} onChange={v => setS({ ...s, modulo: v as ModuloId })} options={modulos.map(m => ({ value: m, label: `${m} - ${nombreModulo(m)}` }))} /></Campo>
        <Campo label="Base de datos" required><Select value={s.base} onChange={v => setS({ ...s, base: v })} options={[{ value: '', label: 'Seleccione' }, ...bases.map(b => ({ value: b, label: b }))]} /></Campo>
        <Campo label="Frecuencia" required><Select value={s.frecuencia} onChange={v => setS({ ...s, frecuencia: v })} options={FRECUENCIAS.map(f => ({ value: f, label: f }))} /></Campo>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}><Switch checked={s.activo} onChange={b => setS({ ...s, activo: b })} label="Activo" /></div>
      </Grid>
    </ModalBase>
  );
}
