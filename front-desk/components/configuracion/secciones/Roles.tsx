'use client';
// Usuarios y permisos › Roles: plantillas de permisos, edición y «Guardar como rol».
import { useState } from 'react';
import { C, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { BarraSeccion } from '@/components/layout/Pantalla';
import { Alerta, BotonExportar, exportarCSV } from '@/components/hotel/ui';
import { Buscador, Campo, ConfigCard, IcEdit, IcTrash, IconButton, norm, uid } from '../kit';
import { ArbolPermisos } from '../permisos/Arbol';
import { TODAS_LAS_HOJAS, TOTAL, contar, type Rol } from '../permisos/datosPermisos';
import { usePermisos } from '../permisos/store';

export const iguales = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(x => b.has(x));
export const nPerm = (p: Set<string>) => contar(TODAS_LAS_HOJAS, p);
export const IcCopiar = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>;
export const Nota = ({ children }: { children: React.ReactNode }) => <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>{children}</p>;


export function GuardarComoRol({ permisos, onClose, onListo }: { permisos: Set<string>; onClose: () => void; onListo: (r: Rol, asignar: boolean) => void }) {
  const { roles } = usePermisos();
  const [nombre, setNombre] = useState('');
  const [asignar, setAsignar] = useState(true);
  const e = !nombre.trim() ? 'Escribe un nombre' : roles.some(r => norm(r.nombre) === norm(nombre)) ? 'Ya existe un rol con ese nombre' : '';
  return (
    <Modal open title="Guardar como rol" onClose={onClose} width={440}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!!e} onClick={() => onListo({ id: uid(), nombre: nombre.trim(), permisos: new Set(permisos) }, asignar)}>Guardar rol</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Campo label="Nombre del rol" error={nombre ? e || undefined : undefined}><Input value={nombre} onChange={setNombre} placeholder="Ej: Recepción nocturna" /></Campo>
        <Checkbox checked={asignar} onChange={setAsignar} label="Asignar este rol al usuario" />
        <Nota>El rol se crea con los {nPerm(permisos)} permisos marcados.</Nota>
      </div>
    </Modal>
  );
}

// ── Roles ───────────────────────────────────────────────────────────────────
export function Roles({ onEditar, onToast }: { onEditar: (r: Rol) => void; onToast: (t: string) => void }) {
  const { roles, setRoles, usuarios } = usePermisos();
  const [q, setQ] = useState('');
  const [borrar, setBorrar] = useState<Rol | null>(null);
  const cuantos = (r: Rol) => usuarios.filter(u => u.rolId === r.id).length;
  const lista = roles.filter(r => !q || norm(r.nombre).includes(norm(q)));
  const duplicar = (r: Rol) => {
    let n = `${r.nombre} (copia)`; let i = 2;
    while (roles.some(x => x.nombre === n)) n = `${r.nombre} (copia ${i++})`;
    setRoles(rs => [...rs, { id: uid(), nombre: n, permisos: new Set(r.permisos) }]); onToast(`Rol duplicado como «${n}»`);
  };
  return (
    <ConfigCard title="Roles" subtitle="Plantillas de permisos que se asignan a los usuarios.">
      <BarraSeccion
        filtros={<Buscador value={q} onChange={setQ} placeholder="Buscar rol" width={240} />}
        acciones={<>
          <BotonExportar disabled={!lista.length} titulo="Roles de Front Desk" onCSV={() => exportarCSV('roles', ['Rol', 'Permisos', 'Usuarios'], lista.map(r => [r.nombre, `${nPerm(r.permisos)}/${TOTAL}`, cuantos(r)]))} />
          <Button icon={<IcPlus size={12} />} onClick={() => onEditar({ id: '', nombre: '', permisos: new Set() })}>Nuevo rol</Button>
        </>}
        derecha={<span style={{ fontSize: 12, color: C.n700 }}>{lista.length} roles</span>} />
      <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.card }}>
        {!lista.length && <p style={{ textAlign: 'center', color: C.n700, fontSize: 12.5, padding: 30, margin: 0 }}>Ningún rol coincide con la búsqueda.</p>}
        {lista.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', borderTop: i ? `1px solid ${C.n500}` : 'none' }}>
            <span style={{ flex: 1, fontSize: 13.5, color: C.n900 }}>{r.nombre}</span>
            <span style={{ fontSize: 12, color: C.n700 }}>{nPerm(r.permisos)}/{TOTAL} permisos</span>
            <span style={{ fontSize: 12, color: C.n700, width: 80 }}>{cuantos(r)} {cuantos(r) === 1 ? 'usuario' : 'usuarios'}</span>
            <Button variant="secondary" icon={<IcEdit />} onClick={() => onEditar(r)}>Editar</Button>
            <IconButton label={`Duplicar ${r.nombre}`} onClick={() => duplicar(r)}><IcCopiar /></IconButton>
            <IconButton label={`Eliminar ${r.nombre}`} tono="peligro" disabled={r.id === 'r-admin'} onClick={() => setBorrar(r)}><IcTrash /></IconButton>
          </div>
        ))}
      </div>
      <Alerta open={!!borrar} tono="danger" titulo={`¿Eliminar el rol «${borrar?.nombre}»?`} confirmar="Eliminar rol" onClose={() => setBorrar(null)}
        onConfirm={() => { const r = borrar!; setRoles(rs => rs.filter(x => x.id !== r.id)); onToast(`Rol «${r.nombre}» eliminado`); setBorrar(null); }}>
        {borrar && cuantos(borrar) ? `${cuantos(borrar)} usuarios lo tienen asignado: conservan sus permisos actuales y quedan «Sin rol».` : 'Ningún usuario lo tiene asignado.'}
      </Alerta>
    </ConfigCard>
  );
}

export function EditarRol({ rol, onSalir }: { rol: Rol; onSalir: (toast?: string) => void }) {
  const { roles, setRoles, usuarios, setUsuarios } = usePermisos();
  const nuevo = !rol.id;
  const [nombre, setNombre] = useState(rol.nombre);
  const [p, setP] = useState(() => new Set(rol.permisos));
  const [q, setQ] = useState('');
  const [preguntar, setPreguntar] = useState(false);
  const [descartar, setDescartar] = useState(false);
  const con = usuarios.filter(u => u.rolId === rol.id);
  const sucio = nombre !== rol.nombre || !iguales(p, rol.permisos);
  const errNombre = !nombre.trim() ? 'Escribe el nombre del rol' : roles.some(r => r.id !== rol.id && norm(r.nombre) === norm(nombre)) ? 'Ya existe un rol con ese nombre' : '';
  const guardar = (aUsuarios: boolean) => {
    const r: Rol = { id: rol.id || uid(), nombre: nombre.trim(), permisos: new Set(p) };
    setRoles(rs => (nuevo ? [...rs, r] : rs.map(x => (x.id === r.id ? r : x))));
    if (aUsuarios) setUsuarios(us => us.map(u => (u.rolId === r.id ? { ...u, permisos: new Set(p) } : u)));
    onSalir(nuevo ? `Rol «${r.nombre}» creado` : `Rol «${r.nombre}» guardado${aUsuarios ? ` y aplicado a ${con.length} usuarios` : ''}`);
  };
  return (
    <>
      <BarraSeccion
        filtros={<>
          <span style={{ fontSize: 12, color: C.n700 }}>{nuevo ? 'Nuevo rol' : 'Editando el rol'}</span>
          <div style={{ width: 240 }}><Input value={nombre} onChange={setNombre} placeholder="Nombre del rol" aria-label="Nombre del rol" error={sucio && errNombre ? errNombre : undefined} /></div>
          <Buscador value={q} onChange={setQ} placeholder="Buscar sección u opción" width={240} />
        </>}
        acciones={<>
          <Button variant="secondary" onClick={() => (sucio ? setDescartar(true) : onSalir())}>{sucio ? 'Descartar cambios' : 'Volver a roles'}</Button>
          <Button disabled={!sucio || !!errNombre} onClick={() => (con.length && !iguales(p, rol.permisos) ? setPreguntar(true) : guardar(false))}>Guardar rol</Button>
        </>}
        derecha={<span style={{ fontSize: 12, color: C.n700 }}>{con.length} usuarios lo tienen asignado</span>} />
      <ArbolPermisos permisos={p} onChange={setP} busqueda={q}
        cabecera={<Nota>{nuevo ? 'Nuevo rol' : <>Editando el rol <b style={{ color: C.n900, fontWeight: 600 }}>{rol.nombre}</b></>} · <b style={{ color: C.n900 }}>{nPerm(p)}/{TOTAL}</b> permisos activos</Nota>} />
      <Modal open={preguntar} title="¿Aplicar los cambios a los usuarios?" onClose={() => setPreguntar(false)} width={480}
        footer={<><Button variant="secondary" onClick={() => setPreguntar(false)}>Cancelar</Button><Button variant="secondary" onClick={() => guardar(false)}>Solo el rol</Button><Button onClick={() => guardar(true)}>Rol y sus {con.length} usuarios</Button></>}>
        <Nota>{con.length} usuarios tienen este rol ({con.slice(0, 4).map(u => u.usuario).join(', ')}{con.length > 4 ? '…' : ''}). Puedes guardar solo el rol (los usuarios conservan sus permisos actuales) o reemplazar también los permisos de esos usuarios.</Nota>
      </Modal>
      <Alerta open={descartar} titulo="¿Descartar los cambios del rol?" confirmar="Descartar" tono="danger" onClose={() => setDescartar(false)} onConfirm={() => onSalir()}>
        Los cambios que hiciste en este rol se perderán.
      </Alerta>
    </>
  );
}
