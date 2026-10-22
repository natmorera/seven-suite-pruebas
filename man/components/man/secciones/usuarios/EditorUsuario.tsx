'use client';
// Alta y edición de un usuario en pantalla completa: a la izquierda sus datos y la contraseña inicial; a la derecha
// los módulos a los que entra, con el rol que tiene en cada uno.
import { useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Select, Switch } from '@/components/suite/ui';
import { Aviso, Campo, ConfigCard, Grid } from '@/components/kit';
import { ROLES_MODULO, RUTA_PERMISOS, nombreModulo } from '../../catalogo';
import { ChipModulo } from '../../piezas';
import type { ModuloId, Usuario } from '../../tipos';
import { CamposClave } from './CamposClave';
import { errorClave, type ClaveNueva } from './claves';

export function EditorUsuario({ inicial, nuevo, modulos, urls = {}, usados, onCancelar, onGuardar }: {
  inicial: Usuario; nuevo: boolean; modulos: ModuloId[]; urls?: Partial<Record<ModuloId, string>>; usados: string[]; onCancelar: () => void; onGuardar: (u: Usuario) => void;
}) {
  const [u, setU] = useState(inicial);
  const [clave, setClave] = useState<ClaveNueva>({ clave: '', confirmar: '' });
  const rol = (m: ModuloId) => u.accesos.find(a => a.modulo === m)?.rol;
  const roles = (m: ModuloId) => ROLES_MODULO[m] ?? ['Consulta'];
  const alternar = (m: ModuloId, on: boolean) => setU({ ...u, accesos: on ? [...u.accesos, { modulo: m, rol: roles(m).at(-1) ?? '' }] : u.accesos.filter(a => a.modulo !== m) });
  const cambiarRol = (m: ModuloId, r: string) => setU({ ...u, accesos: u.accesos.map(a => (a.modulo === m ? { ...a, rol: r } : a)) });
  const error = !u.usuario.trim() || !u.nombre.trim() ? 'Usuario y nombre son obligatorios.'
    : usados.includes(u.usuario.trim()) ? 'Ese usuario ya existe.'
      : u.correo && !/^\S+@\S+\.\S+$/.test(u.correo) ? 'El correo no es válido.'
        : nuevo ? errorClave(clave) : null;

  return (
    <>
      <div className="editor-usuario" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'start', fontFamily: FONT }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ConfigCard title={nuevo ? 'Nuevo usuario' : 'Datos del usuario'}>
            <Grid cols={2}>
              <Campo label="Nombre de usuario" required hint={nuevo ? 'Sin espacios ni mayúsculas. No se puede cambiar después.' : undefined}>
                <Input value={u.usuario} onChange={v => setU({ ...u, usuario: v.toLowerCase().replace(/\s+/g, '.') })} disabled={!nuevo} autoComplete="off" />
              </Campo>
              <Campo label="Número"><Input value={u.numero} disabled /></Campo>
              <Campo label="Nombre completo" required style={{ gridColumn: '1 / -1' }}><Input value={u.nombre} onChange={v => setU({ ...u, nombre: v })} /></Campo>
              <Campo label="Correo electrónico" style={{ gridColumn: '1 / -1' }}><Input type="email" value={u.correo} onChange={v => setU({ ...u, correo: v })} /></Campo>
            </Grid>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <Switch checked={u.activo} onChange={b => setU({ ...u, activo: b })} label="Activo" />
              <Switch checked={u.admin} onChange={b => setU({ ...u, admin: b })} label="Administrador de la suite" />
            </div>
            {u.admin && <Aviso>Un administrador de la suite entra a todos los módulos con todos los permisos.</Aviso>}
          </ConfigCard>
          {nuevo && (
            <ConfigCard title="Contraseña">
              <CamposClave f={clave} setF={setClave} />
              <Checkbox checked={u.cambiarClave} onChange={b => setU({ ...u, cambiarClave: b })} label="Pedir que la cambie en el próximo ingreso" />
            </ConfigCard>
          )}
        </div>
        <ConfigCard title="Módulos y roles">
          <div style={{ display: 'flex', flexDirection: 'column', border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden' }}>
            {modulos.map((m, i) => {
              const on = !!rol(m);
              return (
                <div key={m} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px 12px', padding: '10px 12px',
                  borderTop: i ? `1px solid ${C.n500}` : 'none', background: C.n000 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minWidth: 0, flex: '1 1 140px' }}>
                    <input type="checkbox" checked={on} onChange={e => alternar(m, e.target.checked)} />
                    <ChipModulo m={m} />
                  </label>
                  {on ? (
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, minWidth: 0, flex: '1 1 200px', maxWidth: 280 }}>
                      <label style={{ width: '100%' }}><span className="sr-only">Rol en {nombreModulo(m)}</span>
                        <Select value={rol(m) ?? ''} onChange={r => cambiarRol(m, r)} options={roles(m).map(r => ({ value: r, label: r }))} />
                      </label>
                      <Permisos m={m} url={urls[m]} usuario={nuevo ? '' : inicial.usuario} />
                    </span>
                  ) : <span style={{ fontSize: 12, color: C.n700 }}>Sin acceso</span>}
                </div>
              );
            })}
          </div>
          <span style={{ fontSize: 12, color: C.n700 }}>{u.accesos.filter(a => modulos.includes(a.modulo)).length} de {modulos.length} módulos · Solo aparecen los módulos conectados al MAN; los demás se agregan al integrarlos en Módulos.</span>
        </ConfigCard>
      </div>
      <div className="editor-pie" style={{ position: 'sticky', bottom: -24, margin: 'auto -24px -24px', padding: '12px 24px', background: C.n000, borderTop: `1px solid ${C.n500}`,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, fontFamily: FONT }}>
        {error && (u.usuario || u.nombre) && <span role="alert" style={{ fontSize: 12, color: C.error, marginRight: 'auto' }}>{error}</span>}
        <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
        <Button disabled={!!error} onClick={() => onGuardar({ ...u, usuario: u.usuario.trim(), nombre: u.nombre.trim() })}>Guardar usuario</Button>
      </div>
    </>
  );
}

/** Abre el módulo con el usuario elegido para personalizar sus permisos (los permisos de cada rol son del módulo). */
function Permisos({ m, url, usuario }: { m: ModuloId; url?: string; usuario: string }) {
  const estilo = { fontSize: 12, fontWeight: 500, fontFamily: FONT, whiteSpace: 'nowrap' } as const;
  if (!url) return null;
  if (!usuario) return <span title="Guarda el usuario para personalizar sus permisos" style={{ ...estilo, color: C.n700 }}>Personalizar permisos</span>;
  return (
    <a href={`${new URL(url).origin}${RUTA_PERMISOS}?usuario=${encodeURIComponent(usuario)}`} target="_blank" rel="noopener noreferrer"
      aria-label={`Personalizar permisos en ${nombreModulo(m)}`} style={{ ...estilo, color: C.brand, textDecoration: 'underline', textUnderlineOffset: 3 }}>Personalizar permisos ↗</a>
  );
}
