'use client';
// Perfiles: base única de clientes, proveedores, receptores y empresas que comparten los módulos. Un perfil se
// identifica por su número de identificación y puede tener varios roles. Cada pestaña muestra un rol con las columnas
// que usa su módulo, y aparece solo si la empresa tiene ese módulo (sin DICR no hay receptores).
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AccionesEnHeader, FiltrosEnBarra } from '@/components/layout/Pantalla';
import { PestanasUrl } from '@/components/layout/Pestanas';
import { C } from '@/components/suite/tokens';
import { Button, Switch } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Buscador, Celda, Fila, FilaVacia, FiltroOpciones, IcEdit, IconButton, Insignia, LinkButton, Paginacion, Tabla, norm, uid, usePaginado } from '@/components/kit';
import { useDato } from '../../store';
import { rolesDisponibles } from '../../catalogo';
import { ChipModulo, opcionesModulos } from '../../piezas';
import type { ModuloId, Perfil, RolPerfil } from '../../tipos';
import { COLUMNAS } from './datosRol';
import { EditarPerfil } from './EditarPerfil';
import { useCrearEnEscritorio } from '@/components/layout/SoloEscritorio';

export default function Perfiles() {
  const [l] = useDato('perfiles');
  const [modulos] = useDato('modulos');
  const roles = rolesDisponibles(modulos);
  return (
    <PestanasUrl tabs={[
      { id: 'todos', label: `Todos (${l.length})`, contenido: () => <Lista roles={roles.map(r => r.rol)} /> },
      ...roles.map(r => ({ id: r.titulo.toLowerCase(), label: `${r.titulo} (${l.filter(p => p.roles.includes(r.rol)).length})`, contenido: () => <Lista rol={r.rol} roles={roles.map(x => x.rol)} /> })),
    ]} />
  );
}

function Lista({ rol, roles }: { rol?: RolPerfil; roles: RolPerfil[] }) {
  const enEscritorio = useCrearEnEscritorio();
  const [l, set] = useDato('perfiles');
  const params = useSearchParams();
  const [q, setQ] = useState('');
  const [modulo, setModulo] = useState(params.get('modulo') ?? '');
  const [estado, setEstado] = useState('activos');
  const [editando, setEditando] = useState<Perfil | null>(null);
  const filtrados = l.filter(p => (!rol || p.roles.includes(rol)) && (!estado || (estado === 'activos') === p.activo)
    && (!modulo || p.modulos.includes(modulo as ModuloId)) && (!q || norm(`${p.nombre} ${p.identificacion} ${p.correo}`).includes(norm(q))))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const pag = usePaginado(filtrados, 10);
  const { setPagina, visibles } = pag;
  const usados = [...new Set(l.flatMap(p => p.modulos))];
  const guardar = (p: Perfil) => { set(l.some(x => x.id === p.id) ? l.map(x => (x.id === p.id ? p : x)) : [...l, p]); setEditando(null); };
  const nuevo = () => setEditando({ id: uid(), tipoId: 'Cédula jurídica', identificacion: '', nombre: '', correo: '', telefono: '', pais: 'Costa Rica', roles: rol ? [rol] : [], modulos: [], activo: true });
  const filtro = (f: (v: string) => void) => (v: string) => { f(v); setPagina(1); };
  const propias = rol ? COLUMNAS[rol] : [];
  // Proveedores, receptores y empresas son de un solo módulo: la columna «Lo usan» solo se muestra donde puede variar.
  const conModulos = !rol || rol === 'Cliente';
  const cols = ['Nombre', 'Identificación', ...(rol ? propias.map(c => c.titulo) : ['Roles']), ...(conModulos ? ['Lo usan'] : []), 'Activo', ''];

  return (
    <>
      <AccionesEnHeader><Button icon={<IcPlus size={12} />} onClick={enEscritorio(nuevo)}>Nuevo perfil</Button></AccionesEnHeader>
      <FiltrosEnBarra>
        <Buscador value={q} onChange={filtro(setQ)} placeholder="Nombre, identificación o correo" width={250} />
        <FiltroOpciones etiqueta="Módulo" value={modulo} onChange={filtro(setModulo)} opciones={opcionesModulos(usados)} />
        <FiltroOpciones etiqueta="Estado" value={estado} onChange={filtro(setEstado)} opciones={[{ value: 'activos', label: 'Activos' }, { value: 'inactivos', label: 'Inactivos' }]} />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.n700 }}>{filtrados.length} perfiles</span>
      </FiltrosEnBarra>
      <Tabla headers={cols} anchos={{ [cols.length - 2]: 64, [cols.length - 1]: 40 }}>
        {visibles.length === 0 && <FilaVacia cols={cols.length} />}
        {visibles.map(p => (
          <Fila key={p.id} style={p.activo ? undefined : { color: C.n700 }}>
            <Celda movil="titulo"><LinkButton onClick={() => setEditando(p)}>{p.nombre}</LinkButton><span style={{ display: 'block', fontSize: 11.5, color: C.n700, marginTop: 2 }}>{p.correo || 'Sin correo'}</span></Celda>
            <Celda>{p.identificacion}<span style={{ display: 'block', fontSize: 11.5, color: C.n700 }}>{p.tipoId}</span></Celda>
            {rol ? propias.map(c => <Celda key={c.titulo} style={{ whiteSpace: 'normal' }}>{c.valor(p)}</Celda>)
              : <Celda><span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{p.roles.map(r => <Insignia key={r} label={r} color="brand" />)}</span></Celda>}
            {conModulos && <Celda><span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{p.modulos.length ? p.modulos.map(m => <ChipModulo key={m} m={m} />) : <span style={{ color: C.n700 }}>Solo MAN</span>}</span></Celda>}
            <Celda><Switch checked={p.activo} onChange={b => set(l.map(x => (x.id === p.id ? { ...x, activo: b } : x)))} label={<span className="sr-only">Activo</span>} /></Celda>
            <Celda><IconButton label={`Editar ${p.nombre}`} onClick={() => setEditando(p)}><IcEdit /></IconButton></Celda>
          </Fila>
        ))}
      </Tabla>
      <Paginacion pag={pag} />
      {editando && <EditarPerfil inicial={editando} roles={roles} otros={l.filter(x => x.id !== editando.id)} onClose={() => setEditando(null)} onGuardar={guardar} />}
    </>
  );
}
