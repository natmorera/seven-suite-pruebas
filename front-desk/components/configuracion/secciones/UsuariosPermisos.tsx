'use client';
// Usuarios y permisos de Front Desk (mismo patrón que el resto de la suite):
//   Usuarios · Permisos (árbol por usuario) · Roles (plantillas de permisos)
// Guarda con sus propios botones; el header de Configuración no muestra
// «Guardar cambios» en esta sección.
import { useMemo, useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal, Select, Switch, Toast } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { AccionesMasivas, BarraSeccion, CheckFila, CheckTodos, TabsEnBarra, useSeleccion } from '@/components/layout/Pantalla';
import { Alerta, BotonExportar, MenuBoton, exportarCSV } from '@/components/hotel/ui';
import { FiltroUno } from '@/components/facturacion/comun';
import { HOY, fmtF } from '@/components/hotel/datos';
import { Buscador, Campo, Celda, ConfigCard, Fila, FilaVacia, Grid, IcEdit, IcTrash, IconButton, Paginacion, Tabla, norm, uid, usePaginado } from '../kit';
import { ArbolPermisos } from '../permisos/Arbol';
import { TOTAL, detallePermisos, type Rol, type UsuarioFD } from '../permisos/arbol';
import { usePermisos } from '../permisos/store';
import { EditarRol, GuardarComoRol, Nota, Roles, iguales, nPerm } from './Roles';

const TABS = ['Usuarios', 'Permisos', 'Roles'] as const;
type Tab = (typeof TABS)[number];
const IcCandado = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
/** Matriz usuario × permiso (CSV/XLS) con las opciones elegidas de cada permiso. */
function exportarPermisos(us: UsuarioFD[], roles: Rol[]) {
  const filas = us.flatMap(u => detallePermisos(u.permisos).flatMap(m => m.filas.flatMap(f => f.items.map(i =>
    [u.usuario, u.nombre, roles.find(r => r.id === u.rolId)?.nombre ?? 'Sin rol', m.categoria, m.modulo, f.grupo, i.permiso, i.opciones.join(' · ')]))));
  exportarCSV('permisos-por-usuario', ['Usuario', 'Nombre', 'Rol', 'Categoría', 'Módulo', 'Grupo', 'Permiso', 'Opciones'], filas);
}

export default function UsuariosPermisos() {
  const [tab, setTab] = useState<Tab>('Usuarios');
  const [usuarioSel, setUsuarioSel] = useState('');
  const [rolEdit, setRolEdit] = useState<Rol | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const abrirPermisos = (id: string) => { setUsuarioSel(id); setTab('Permisos'); };

  if (rolEdit) return <>
    <EditarRol rol={rolEdit} onSalir={t => { setRolEdit(null); setTab('Roles'); if (t) setToast(t); }} />
    {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
  </>;
  return (
    <>
      <TabsEnBarra items={TABS} activo={tab} onChange={setTab} />
      {tab === 'Usuarios' && <Usuarios onPermisos={abrirPermisos} onToast={setToast} />}
      {tab === 'Permisos' && <Permisos key={usuarioSel} usuarioId={usuarioSel} onUsuario={setUsuarioSel} onToast={setToast} />}
      {tab === 'Roles' && <Roles onEditar={setRolEdit} onToast={setToast} />}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </>
  );
}

// ── Usuarios ────────────────────────────────────────────────────────────────
function Usuarios({ onPermisos, onToast }: { onPermisos: (id: string) => void; onToast: (t: string) => void }) {
  const { usuarios, setUsuarios, roles } = usePermisos();
  const [q, setQ] = useState('');
  const [rol, setRol] = useState('');
  const [inactivos, setInactivos] = useState(false);
  const [nuevo, setNuevo] = useState(false);
  const [clave, setClave] = useState<UsuarioFD | null>(null);
  const [detalle, setDetalle] = useState<UsuarioFD | null>(null);
  const [eliminar, setEliminar] = useState<UsuarioFD[] | null>(null);
  const s = useSeleccion();
  const nombreRol = (id: string) => roles.find(r => r.id === id)?.nombre ?? 'Sin rol';
  const filas = useMemo(() => usuarios.filter(u => (inactivos || u.activo) && (!rol || u.rolId === rol) && (!q || norm(`${u.numero} ${u.usuario} ${u.nombre} ${u.correo}`).includes(norm(q))))
    .sort((a, b) => a.numero - b.numero), [usuarios, inactivos, rol, q]);
  const pag = usePaginado(filas, 15);
  const elegidos = usuarios.filter(u => s.tiene(u.id));
  const patch = (ids: string[], p: Partial<UsuarioFD>) => setUsuarios(us => us.map(u => (ids.includes(u.id) ? { ...u, ...p } : u)));
  const csv = (xs = filas) => exportarCSV('usuarios', ['Nro.', 'Usuario', 'Nombre', 'Correo', 'Rol', 'Creación', 'Último cambio de contraseña', 'Último acceso', 'Activo', 'Admin', 'Permisos'],
    xs.map(u => [u.numero, u.usuario, u.nombre, u.correo, nombreRol(u.rolId), fmtF(u.creado), fmtF(u.claveCambiada), fmtF(u.ultimoAcceso), u.activo ? 'Sí' : 'No', u.admin ? 'Sí' : 'No', `${nPerm(u.permisos)}/${TOTAL}`]));
  const asignarRol = (r: Rol) => { setUsuarios(us => us.map(u => (s.tiene(u.id) ? { ...u, rolId: r.id, permisos: new Set(r.permisos) } : u))); onToast(`Rol «${r.nombre}» asignado a ${s.n} usuarios`); s.limpiar(); };

  return (
    <ConfigCard title="Usuarios" subtitle="Toca una fila para ver el detalle de permisos del usuario.">
      <BarraSeccion
        filtros={<>
          <Buscador value={q} onChange={v => { setQ(v); pag.setPagina(1); }} placeholder="Buscar usuario" width={240} />
          <FiltroUno label="Rol" value={rol} onChange={setRol} opciones={roles.map(r => ({ value: r.id, label: r.nombre }))} />
          <Checkbox checked={inactivos} onChange={setInactivos} label="Mostrar inactivos" />
        </>}
        acciones={<>
          <BotonExportar disabled={!filas.length} titulo="Usuarios de Front Desk" criterio={`Rol: ${rol ? nombreRol(rol) : 'Todos'}${inactivos ? ' · Incluye inactivos' : ''}`} onCSV={() => csv()}
            masOpciones={{ label: 'Exportar permisos por usuario', onClick: () => exportarPermisos(filas, roles) }} />
          <Button icon={<IcPlus size={12} />} onClick={() => setNuevo(true)}>Nuevo usuario</Button>
        </>}
        derecha={s.n ? <AccionesMasivas s={s}>
          <Button variant="secondary" onClick={() => { patch(s.sel, { activo: true }); s.limpiar(); }}>Activar</Button>
          <Button variant="secondary" onClick={() => { patch(s.sel, { activo: false }); s.limpiar(); }}>Desactivar</Button>
          <MenuBoton label="Asignar rol" opciones={roles.map(r => ({ label: r.nombre, onClick: () => asignarRol(r) }))} />
          <Button variant="secondary" onClick={() => csv(elegidos)}>Exportar selección</Button>
          <Button variant="secondary" style={{ color: C.error }} onClick={() => setEliminar(elegidos)}>Eliminar</Button>
        </AccionesMasivas> : <span style={{ fontSize: 12, color: C.n700 }}>{filas.length} usuarios</span>} />
      <Tabla headers={[<CheckTodos key="t" s={s} ids={pag.visibles.map(u => u.id)} />, 'Nro.', 'Usuario', 'Nombre', 'Rol', 'Creación', 'Contraseña', 'Último cambio', 'Último acceso', 'Activo', 'Admin', '']}
        anchos={{ 0: 32, 1: 60, 9: 64, 10: 56, 11: 80 }} minWidth={1120}>
        {!pag.visibles.length && <FilaVacia cols={12} texto="Ningún usuario coincide con los filtros." />}
        {pag.visibles.map(u => (
          <Fila key={u.id} onClick={() => setDetalle(u)} style={{ opacity: u.activo ? 1 : 0.6 }}>
            <Celda><CheckFila s={s} id={u.id} label={`Seleccionar ${u.usuario}`} /></Celda>
            <Celda muted>{u.numero}</Celda>
            <Celda style={{ fontWeight: 500 }}>{u.usuario}</Celda>
            <Celda>{u.nombre}</Celda>
            <Celda><span title={`${nPerm(u.permisos)}/${TOTAL} permisos`}>{nombreRol(u.rolId)}</span></Celda>
            <Celda muted>{fmtF(u.creado)}</Celda>
            <Celda><span onClick={e => e.stopPropagation()}><Button variant="secondary" icon={<IcCandado />} style={{ height: 26 }} onClick={() => setClave(u)}>Restablecer</Button></span></Celda>
            <Celda muted>{fmtF(u.claveCambiada)}</Celda>
            <Celda muted>{u.ultimoAcceso ? fmtF(u.ultimoAcceso) : '-'}</Celda>
            <Celda><span onClick={e => e.stopPropagation()}><Switch checked={u.activo} onChange={b => patch([u.id], { activo: b })} label={<span className="sr-only">Activo</span>} /></span></Celda>
            <Celda><span onClick={e => e.stopPropagation()}><Checkbox checked={u.admin} onChange={b => patch([u.id], { admin: b })} label={<span className="sr-only">Administrador</span>} /></span></Celda>
            <Celda derecha><span onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', gap: 2 }}>
              <IconButton label={`Permisos de ${u.usuario}`} onClick={() => onPermisos(u.id)}><IcEdit /></IconButton>
              <IconButton label={`Eliminar ${u.usuario}`} tono="peligro" onClick={() => setEliminar([u])}><IcTrash /></IconButton>
            </span></Celda>
          </Fila>
        ))}
      </Tabla>
      <Paginacion pagina={pag.pagina} total={pag.total} onChange={pag.setPagina} filas={pag.filas} porPagina={pag.tam} />

      {nuevo && <NuevoUsuario onClose={() => setNuevo(false)} onListo={u => { setNuevo(false); setQ(''); setRol(''); pag.setPagina(Math.ceil((filas.length + 1) / 15)); onToast(`Usuario ${u.usuario} creado`); }} />}
      {clave && <RestablecerClave u={clave} onClose={() => setClave(null)} onListo={() => { patch([clave.id], { claveCambiada: HOY }); onToast(`Contraseña de ${clave.usuario} restablecida`); setClave(null); }} />}
      {detalle && <DetalleUsuario u={detalle} rol={nombreRol(detalle.rolId)} onClose={() => setDetalle(null)} onEditar={() => { const id = detalle.id; setDetalle(null); onPermisos(id); }} />}
      <Alerta open={!!eliminar} tono="danger" titulo={eliminar?.length === 1 ? `¿Eliminar al usuario ${eliminar[0].usuario}?` : `¿Eliminar ${eliminar?.length ?? 0} usuarios?`} confirmar="Eliminar"
        onClose={() => setEliminar(null)} onConfirm={() => { const ids = (eliminar ?? []).map(u => u.id); setUsuarios(us => us.filter(u => !ids.includes(u.id))); s.limpiar(); onToast(ids.length === 1 ? 'Usuario eliminado' : `${ids.length} usuarios eliminados`); setEliminar(null); }}>
        Perderán el acceso a Front Desk. Si solo necesitas quitar el acceso por un tiempo, desactívalos.
      </Alerta>
    </ConfigCard>
  );
}

function DetalleUsuario({ u, rol, onClose, onEditar }: { u: UsuarioFD; rol: string; onClose: () => void; onEditar: () => void }) {
  const det = detallePermisos(u.permisos);
  return (
    <Modal open title={`Permisos de ${u.nombre}`} onClose={onClose} width={680}
      footer={<><Button variant="secondary" onClick={onClose}>Cerrar</Button><Button onClick={onEditar}>Editar permisos</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT, maxHeight: '60vh', overflowY: 'auto' }}>
        <Nota>{u.usuario} · Rol: <b style={{ color: C.n900, fontWeight: 500 }}>{rol}</b> · {nPerm(u.permisos)}/{TOTAL} permisos activos{u.admin ? ' · Administrador' : ''}</Nota>
        {!det.length && <Nota>Este usuario no tiene permisos asignados.</Nota>}
        {det.map(m => (
          <div key={m.modulo} style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '10px 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.modulo} <span style={{ fontSize: 10.5, color: C.n700, fontWeight: 500, letterSpacing: '.05em', marginLeft: 6 }}>{m.categoria}</span></div>
            {m.filas.map(f => (
              <div key={f.grupo} style={{ marginTop: 6 }}>
                {f.grupo && <div style={{ fontSize: 11.5, color: C.n700 }}>{f.grupo}</div>}
                <div style={{ fontSize: 12, color: C.n900, lineHeight: 1.7 }}>{f.items.map(i => i.opciones.length ? `${i.permiso} (${i.opciones.join(', ')})` : i.permiso).join(' · ')}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function NuevoUsuario({ onClose, onListo }: { onClose: () => void; onListo: (u: UsuarioFD) => void }) {
  const { usuarios, setUsuarios, roles } = usePermisos();
  const [f, setF] = useState({ usuario: '', nombre: '', correo: '', rolId: roles[2]?.id ?? roles[0].id, admin: false, clave: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const guardar = () => {
    const e: Record<string, string> = {};
    if (!/^[a-z0-9._-]{3,}$/.test(f.usuario)) e.usuario = 'Mínimo 3 caracteres: minúsculas, números, punto o guion.';
    else if (usuarios.some(u => u.usuario === f.usuario)) e.usuario = 'Ese usuario ya existe.';
    if (!f.nombre.trim()) e.nombre = 'Campo obligatorio';
    if (!/^\S+@\S+\.\S+$/.test(f.correo)) e.correo = 'Correo no válido';
    if (f.clave.length < 8) e.clave = 'Mínimo 8 caracteres';
    setErr(e);
    if (Object.keys(e).length) return;
    const rol = roles.find(r => r.id === f.rolId)!;
    const u: UsuarioFD = { id: uid(), numero: Math.max(999, ...usuarios.map(x => x.numero)) + 1, usuario: f.usuario, nombre: f.nombre.trim(), correo: f.correo, rolId: rol.id,
      creado: HOY, claveCambiada: HOY, ultimoAcceso: '', activo: true, admin: f.admin, permisos: new Set(rol.permisos) };
    setUsuarios(us => [...us, u]);
    onListo(u);
  };
  return (
    <Modal open title="Nuevo usuario" onClose={onClose} width={560} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={guardar}>Crear usuario</Button></>}>
      <Grid cols={2}>
        <Campo label="Usuario" required error={err.usuario}><Input value={f.usuario} onChange={v => setF({ ...f, usuario: v.toLowerCase().trim() })} placeholder="Ej: recepcion3" /></Campo>
        <Campo label="Nombre completo" required error={err.nombre}><Input value={f.nombre} onChange={v => setF({ ...f, nombre: v })} /></Campo>
        <Campo label="Correo" required error={err.correo}><Input type="email" value={f.correo} onChange={v => setF({ ...f, correo: v })} /></Campo>
        <Campo label="Rol" hint="Define los permisos iniciales; luego se pueden ajustar."><Select value={f.rolId} onChange={v => setF({ ...f, rolId: v })} options={roles.map(r => ({ value: r.id, label: r.nombre }))} /></Campo>
        <Campo label="Contraseña temporal" required error={err.clave} hint="Se pedirá cambiarla en el primer ingreso."><Input type="password" value={f.clave} onChange={v => setF({ ...f, clave: v })} autoComplete="new-password" /></Campo>
        <Campo label="Administrador"><Switch checked={f.admin} onChange={b => setF({ ...f, admin: b })} label={f.admin ? 'Sí' : 'No'} /></Campo>
      </Grid>
    </Modal>
  );
}

function RestablecerClave({ u, onClose, onListo }: { u: UsuarioFD; onClose: () => void; onListo: () => void }) {
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [e, setE] = useState('');
  const guardar = () => { if (a.length < 8) return setE('Mínimo 8 caracteres.'); if (a !== b) return setE('Las contraseñas no coinciden.'); onListo(); };
  return (
    <Modal open title={`Restablecer contraseña · ${u.usuario}`} onClose={onClose} width={440} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={guardar}>Restablecer</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Campo label="Nueva contraseña"><Input type="password" value={a} onChange={v => { setA(v); setE(''); }} autoComplete="new-password" /></Campo>
        <Campo label="Confirmar contraseña" error={e || undefined}><Input type="password" value={b} onChange={v => { setB(v); setE(''); }} autoComplete="new-password" /></Campo>
        <Nota>El usuario deberá cambiarla en su próximo ingreso.</Nota>
      </div>
    </Modal>
  );
}

// ── Permisos por usuario ────────────────────────────────────────────────────
function Permisos({ usuarioId, onUsuario, onToast }: { usuarioId: string; onUsuario: (id: string) => void; onToast: (t: string) => void }) {
  const { usuarios, setUsuarios, roles, setRoles } = usePermisos();
  const u = usuarios.find(x => x.id === usuarioId);
  const [borrador, setBorrador] = useState<Set<string>>(() => new Set(u?.permisos ?? []));
  const [rolId, setRolId] = useState(u?.rolId ?? '');
  const [q, setQ] = useState('');
  const [cambiarA, setCambiarA] = useState<string | null>(null);
  const [comoRol, setComoRol] = useState(false);
  const sucio = !!u && (!iguales(borrador, u.permisos) || rolId !== u.rolId);
  const rol = roles.find(r => r.id === rolId);
  const personalizado = !!rol && !iguales(borrador, rol.permisos);
  const opcUsuarios = usuarios.map(x => ({ value: x.id, label: `${x.nombre} · ${x.usuario}` }));
  const elegir = (id: string) => { if (sucio) setCambiarA(id); else onUsuario(id); };
  const guardar = () => { if (!u) return; setUsuarios(us => us.map(x => (x.id === u.id ? { ...x, permisos: new Set(borrador), rolId } : x))); onToast(`Permisos de ${u.usuario} guardados`); onUsuario(u.id); };

  if (!u) return (
    <ConfigCard title="Permisos">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 20px', textAlign: 'center', color: C.n700 }}>
        <span style={{ opacity: .6 }}><IcCandado /></span>
        <b style={{ fontSize: 13, color: C.n900, fontWeight: 600 }}>Selecciona un usuario</b>
        <Nota>Elige un usuario para ver y editar los permisos que tiene asignados en Front Desk.</Nota>
        <div style={{ width: 300, marginTop: 8 }}><Select value="" onChange={onUsuario} options={[{ value: '', label: 'Elige un usuario…' }, ...opcUsuarios]} /></div>
      </div>
      <BarraSeccion filtros={<FiltroUno label="Usuario" value="" onChange={onUsuario} todos={null} ancho={280} opciones={opcUsuarios} />} />
    </ConfigCard>
  );

  return (
    <>
      <BarraSeccion
        filtros={<>
          <FiltroUno label="Usuario" value={u.id} onChange={v => v && elegir(v)} todos={null} ancho={280} opciones={opcUsuarios} />
          <FiltroUno label="Rol" value={rolId} todos={null} onChange={v => { const r = roles.find(x => x.id === v); if (r) { setRolId(r.id); setBorrador(new Set(r.permisos)); } }} opciones={roles.map(r => ({ value: r.id, label: r.nombre }))} />
          <Buscador value={q} onChange={setQ} placeholder="Buscar sección u opción" width={240} />
          <Button variant="ghost" style={{ color: C.error }} onClick={() => setBorrador(new Set())}>Limpiar permisos</Button>
        </>}
        acciones={<>
          <Button variant="secondary" disabled={!sucio} onClick={() => { setBorrador(new Set(u.permisos)); setRolId(u.rolId); }}>Cancelar</Button>
          <Button variant="secondary" onClick={() => setComoRol(true)}>Guardar como rol</Button>
          <Button disabled={!sucio} onClick={guardar}>Guardar</Button>
        </>}
        derecha={sucio ? <span style={{ fontSize: 12, color: '#B58900' }}>Cambios sin guardar</span> : undefined} />
      <ArbolPermisos permisos={borrador} onChange={setBorrador} busqueda={q}
        cabecera={<Nota>{u.nombre} · <b style={{ color: C.n900 }}>{nPerm(borrador)}/{TOTAL}</b> permisos activos · Rol: <b style={{ color: C.n900, fontWeight: 600 }}>{rol?.nombre ?? 'Sin rol'}</b>{personalizado && ' (personalizado)'}</Nota>} />
      <Alerta open={!!cambiarA} titulo="Hay cambios sin guardar" confirmar="Descartar y cambiar" onClose={() => setCambiarA(null)} onConfirm={() => { const id = cambiarA!; setCambiarA(null); onUsuario(id); }}>
        Los permisos de {u.usuario} tienen cambios que no guardaste. ¿Descartarlos y abrir otro usuario?
      </Alerta>
      {comoRol && <GuardarComoRol permisos={borrador} onClose={() => setComoRol(false)}
        onListo={(r, asignar) => {
          setRoles(rs => [...rs, r]);
          if (asignar) { setRolId(r.id); setUsuarios(us => us.map(x => (x.id === u.id ? { ...x, permisos: new Set(borrador), rolId: r.id } : x))); onUsuario(u.id); }
          setComoRol(false); onToast(`Rol «${r.nombre}» creado${asignar ? ` y asignado a ${u.usuario}` : ''}`);
        }} />}
    </>
  );
}
