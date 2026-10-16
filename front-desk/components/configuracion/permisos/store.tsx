'use client';
// Usuarios y roles de Front Desk. Vive en el layout de /configuracion (como el
// resto de la configuración), pero guarda al instante con sus propios botones,
// igual que «Usuarios y permisos» del resto de la suite.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { ROLES_INIT, USUARIOS_INIT, type Rol, type UsuarioFD } from './datosPermisos';

interface Ctx {
  usuarios: UsuarioFD[]; setUsuarios: (f: (u: UsuarioFD[]) => UsuarioFD[]) => void;
  roles: Rol[]; setRoles: (f: (r: Rol[]) => Rol[]) => void;
}
const PermisosCtx = createContext<Ctx | null>(null);

export function PermisosProvider({ children }: { children: ReactNode }) {
  const [usuarios, setU] = useState(USUARIOS_INIT);
  const [roles, setR] = useState(ROLES_INIT);
  const v = useMemo<Ctx>(() => ({ usuarios, setUsuarios: f => setU(f), roles, setRoles: f => setR(f) }), [usuarios, roles]);
  return <PermisosCtx.Provider value={v}>{children}</PermisosCtx.Provider>;
}

export function usePermisos() {
  const c = useContext(PermisosCtx);
  if (!c) throw new Error('usePermisos debe usarse dentro de <PermisosProvider>');
  return c;
}
