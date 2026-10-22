'use client';
import { AccionesMasivas, BarraSeccion, CheckFila, CheckTodos, useSeleccion } from '@/components/layout/Pantalla';
import { BotonExportar, exportarCSV } from '@/components/hotel/ui';
import { useMemo, useState } from 'react';
import { C } from '@/components/suite/tokens';
import { Button, Input, Select, StatusBadge, Switch } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { useDato } from '../store';
import {
  Buscador, Celda, Fila, FilaVacia, IcTrash, IconButton, LinkButton, MultiSelect, Paginacion, Tabla, norm, uid, useConfirmar, usePaginado,
} from '../kit';
import { NUMEROS_HAB } from '../datos';

const ESTADOS = [{ value: '', label: 'Todos los estados' }, { value: 'a', label: 'Activo' }, { value: 'i', label: 'Inactivo' }];

// Camareras y rangos se configuran como pestañas de Alojamiento.
export function Camareras() {
  const [l, set] = useDato('camareras');
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [nueva, setNueva] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { pedir, dialogo } = useConfirmar();
  const filtradas = useMemo(() => l.filter(c => norm(c.nombre).includes(norm(q)) && (!estado || (estado === 'a') === c.activo)), [l, q, estado]);
  const { pagina, total, setPagina, visibles, filas: nFilas, tam } = usePaginado(filtradas);
  const sel = useSeleccion();
  const csv = (xs = filtradas) => exportarCSV('camareras', ['Nombre', 'Estado'], xs.map(c => [c.nombre, c.activo ? 'Activo' : 'Inactivo']));
  const activar = (on: boolean) => { set(l.map(x => (sel.tiene(x.id) ? { ...x, activo: on } : x))); sel.limpiar(); };
  const registrar = () => {
    const n = (nueva ?? '').trim();
    if (!n) return setError('Escribe el nombre.');
    if (l.some(c => norm(c.nombre) === norm(n))) return setError('Ya existe una camarera con ese nombre.');
    set([...l, { id: uid(), nombre: n, activo: true }]); setNueva(null); setError('');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BarraSeccion
        filtros={<><Buscador value={q} onChange={setQ} placeholder="Buscar camarera" width={260} /><div style={{ width: 170 }}><Select value={estado} onChange={setEstado} options={ESTADOS} /></div></>}
        acciones={<><BotonExportar disabled={!filtradas.length} titulo="Camareras / Mucamas" onCSV={() => csv()} /><Button icon={<IcPlus size={12} />} onClick={() => { setNueva(''); setError(''); }} disabled={nueva !== null}>Agregar nueva</Button></>}
        derecha={sel.n ? <AccionesMasivas s={sel}>
          <Button variant="secondary" onClick={() => activar(true)}>Activar</Button><Button variant="secondary" onClick={() => activar(false)}>Desactivar</Button>
          <Button variant="secondary" onClick={() => csv(filtradas.filter(c => sel.tiene(c.id)))}>Exportar selección</Button>
          <Button variant="secondary" style={{ color: C.error }} onClick={() => pedir('Eliminar camareras', `¿Eliminar ${sel.n} camareras seleccionadas?`, () => { set(l.filter(x => !sel.tiene(x.id))); sel.limpiar(); })}>Eliminar</Button>
        </AccionesMasivas> : <span style={{ fontSize: 12, color: C.n700 }}>{filtradas.length} registros</span>} />
      <Tabla headers={[<CheckTodos key="t" s={sel} ids={visibles.map(c => c.id)} />, 'Nombre', 'Estado', '']} anchos={{ 0: 32, 2: 160, 3: 50 }}>
        {visibles.length === 0 && nueva === null && <FilaVacia cols={4} />}
        {visibles.map(c => (
          <Fila key={c.id}>
            <Celda><CheckFila s={sel} id={c.id} label={`Seleccionar ${c.nombre}`} /></Celda>
            <Celda><Input value={c.nombre} onChange={v => set(l.map(x => (x.id === c.id ? { ...x, nombre: v } : x)))} aria-label="Nombre" style={{ border: 'none', background: 'transparent', padding: 0 }} /></Celda>
            <Celda><Switch checked={c.activo} onChange={b => set(l.map(x => (x.id === c.id ? { ...x, activo: b } : x)))} label={c.activo ? 'Activo' : 'Inactivo'} /></Celda>
            <Celda><IconButton label={`Eliminar ${c.nombre}`} tono="peligro" onClick={() => pedir('Eliminar camarera', `¿Eliminar a ${c.nombre}?`, () => set(l.filter(x => x.id !== c.id)))}><IcTrash /></IconButton></Celda>
          </Fila>
        ))}
        {nueva !== null && (
          <tr>
            <Celda colSpan={4}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, maxWidth: 380 }}><Input value={nueva} onChange={setNueva} placeholder="Nombre" autoFocus error={error || undefined}
                  onKeyDown={e => { if (e.key === 'Enter') registrar(); if (e.key === 'Escape') setNueva(null); }} /></div>
                <Button onClick={registrar}>Registrar</Button>
                <Button variant="secondary" onClick={() => { setNueva(null); setError(''); }}>Cancelar</Button>
                {error && <span role="alert" style={{ fontSize: 11, color: C.error }}>{error}</span>}
              </div>
            </Celda>
          </tr>
        )}
      </Tabla>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Paginacion pagina={pagina} total={total} onChange={setPagina} filas={nFilas} porPagina={tam} />
      </div>
      {dialogo}
    </div>
  );
}

export function Rangos() {
  const [l, set] = useDato('rangos');
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [nuevo, setNuevo] = useState<{ codigo: string; descripcion: string; habitaciones: string[] } | null>(null);
  const [error, setError] = useState('');
  const { pedir, dialogo } = useConfirmar();
  const opciones = NUMEROS_HAB.map(n => {
    const de = l.find(r => r.habitaciones.includes(n));
    return { value: n, label: `Habitación ${n}`, detalle: de ? `(${de.codigo})` : undefined };
  });
  const filtradas = l.filter(r => (!q || norm(r.codigo + r.descripcion).includes(norm(q)) || r.habitaciones.includes(q.trim())) && (!estado || (estado === 'a') === r.activo));
  const { pagina, total, setPagina, visibles, filas: nFilas, tam } = usePaginado(filtradas);
  const sel = useSeleccion();
  const csv = (xs = filtradas) => exportarCSV('rangos-habitacion', ['Código', 'Descripción', 'Habitaciones', 'Estado'], xs.map(r => [r.codigo, r.descripcion, r.habitaciones.join(' '), r.activo ? 'Activa' : 'Inactiva']));
  const activar = (on: boolean) => { set(l.map(x => (sel.tiene(x.id) ? { ...x, activo: on } : x))); sel.limpiar(); };
  const nuevoRango = () => setNuevo({ codigo: String(Math.max(0, ...l.map(r => Number(r.codigo) || 0)) + 1).padStart(2, '0'), descripcion: '', habitaciones: [] });
  const enOtro = (habs: string[], id?: string) => habs.filter(h => l.some(r => r.id !== id && r.habitaciones.includes(h)));
  const resumen = (sel: { value: string }[]) => (sel.length > 6 ? `${sel.slice(0, 6).map(s => s.value).join(', ')} y ${sel.length - 6} más` : sel.map(s => s.value).join(', '));
  const registrar = () => {
    if (!nuevo) return;
    if (!nuevo.codigo.trim() || !nuevo.descripcion.trim()) return setError('Código y descripción son obligatorios.');
    if (l.some(r => r.codigo === nuevo.codigo.trim())) return setError('Ya existe un rango con ese código.');
    set([...l, { id: uid(), codigo: nuevo.codigo.trim(), descripcion: nuevo.descripcion.trim(), habitaciones: nuevo.habitaciones.sort(), activo: true }]);
    setNuevo(null); setError('');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BarraSeccion
        filtros={<><Buscador value={q} onChange={setQ} placeholder="Buscar habitación o rango" width={260} /><div style={{ width: 170 }}><Select value={estado} onChange={setEstado} options={[{ value: '', label: 'Todos los estados' }, { value: 'a', label: 'Activa' }, { value: 'i', label: 'Inactiva' }]} /></div></>}
        acciones={<><BotonExportar disabled={!filtradas.length} titulo="Rangos de habitación" onCSV={() => csv()} /><Button icon={<IcPlus size={12} />} disabled={!!nuevo} onClick={nuevoRango}>Agregar nuevo rango</Button></>}
        derecha={sel.n ? <AccionesMasivas s={sel}>
          <Button variant="secondary" onClick={() => activar(true)}>Activar</Button><Button variant="secondary" onClick={() => activar(false)}>Desactivar</Button>
          <Button variant="secondary" onClick={() => csv(filtradas.filter(r => sel.tiene(r.id)))}>Exportar selección</Button>
          <Button variant="secondary" style={{ color: C.error }} onClick={() => pedir('Eliminar rangos', `¿Eliminar ${sel.n} rangos seleccionados?`, () => { set(l.filter(x => !sel.tiene(x.id))); sel.limpiar(); })}>Eliminar</Button>
        </AccionesMasivas> : <span style={{ fontSize: 12, color: C.n700 }}>{filtradas.length} registros</span>} />
      <Tabla headers={[<CheckTodos key="t" s={sel} ids={visibles.map(r => r.id)} />, 'Código', 'Descripción', 'Habitaciones', '', 'Estado', '']} anchos={{ 0: 32, 1: 70, 4: 200, 5: 130, 6: 40 }}>
        {visibles.length === 0 && !nuevo && <FilaVacia cols={7} />}
        {visibles.map(r => {
          const dup = enOtro(r.habitaciones, r.id);
          return (
            <Fila key={r.id}>
              <Celda><CheckFila s={sel} id={r.id} label={`Seleccionar rango ${r.codigo}`} /></Celda>
              <Celda>{r.codigo}</Celda>
              <Celda>{r.descripcion}</Celda>
              <Celda muted>
                <span title={r.habitaciones.join(', ')} style={{ display: 'block', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.habitaciones.join(', ') || '-'}</span>
                {dup.length > 0 && <StatusBadge color="yellow" label={`${dup.join(', ')} también en otro rango`} />}
              </Celda>
              <Celda>
                <div style={{ width: 190 }}>
                  <MultiSelect value={r.habitaciones} onChange={v => set(l.map(x => (x.id === r.id ? { ...x, habitaciones: [...v].sort() } : x)))} opciones={opciones}
                    buscar="Buscar habitación" resumen={() => 'Modificar habitaciones'} placeholder="Modificar habitaciones" />
                </div>
              </Celda>
              <Celda><Switch checked={r.activo} onChange={b => set(l.map(x => (x.id === r.id ? { ...x, activo: b } : x)))} label={r.activo ? 'Activa' : 'Inactiva'} /></Celda>
              <Celda><IconButton label={`Eliminar rango ${r.codigo}`} tono="peligro" onClick={() => pedir('Eliminar rango', `¿Eliminar el rango ${r.codigo} - ${r.descripcion}?`, () => set(l.filter(x => x.id !== r.id)))}><IcTrash /></IconButton></Celda>
            </Fila>
          );
        })}
        {nuevo && (
          <tr>
            <Celda />
            <Celda><Input value={nuevo.codigo} onChange={v => setNuevo({ ...nuevo, codigo: v })} placeholder="Código" aria-label="Código" autoFocus /></Celda>
            <Celda><Input value={nuevo.descripcion} onChange={v => setNuevo({ ...nuevo, descripcion: v })} placeholder="Descripción" aria-label="Descripción" /></Celda>
            <Celda colSpan={2}><MultiSelect value={nuevo.habitaciones} onChange={v => setNuevo({ ...nuevo, habitaciones: v })} opciones={opciones} buscar="Buscar habitación" placeholder="Agregar habitaciones" resumen={resumen} /></Celda>
            <Celda colSpan={2}><div style={{ display: 'flex', gap: 6 }}><Button onClick={registrar}>Registrar</Button><Button variant="secondary" onClick={() => { setNuevo(null); setError(''); }}>Cancelar</Button></div></Celda>
          </tr>
        )}
      </Tabla>
      {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Paginacion pagina={pagina} total={total} onChange={setPagina} filas={nFilas} porPagina={tam} />
      </div>
      <p style={{ fontSize: 11, color: C.n700, margin: 0 }}>Los números entre paréntesis en el selector indican el rango al que ya pertenece cada habitación. <LinkButton onClick={() => setQ('')}>Limpiar búsqueda</LinkButton></p>
      {dialogo}
    </div>
  );
}
