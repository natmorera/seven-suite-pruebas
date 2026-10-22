'use client';
import { useSyncExternalStore } from 'react';
import { USUARIOS_INIT, CONFIG_FE_VIEJOS } from '@/components/pages/config/permissionsData';
import { USUARIO_ACTUAL } from '@/components/ui/primitives';

interface U { usuario: string; admin?: boolean; permisos: Set<string> | string[] }
let usuarios: U[] = USUARIOS_INIT;
let solicitud = false;
const oyentes = new Set<() => void>();
let version = 0;

function cargar() {
  if (solicitud || typeof window === 'undefined') return;
  solicitud = true;
  fetch('/api/usuarios').then(r => r.json()).then((d: { usuarios?: U[] } | null) => {
    if (d?.usuarios?.length) { usuarios = d.usuarios; version++; oyentes.forEach(f => f()); }
  }).catch(() => {});
}

export function puedeUsuario(clave: string, u: U | undefined): boolean {
  // Sin el usuario en la lista guardada (o el superusuario): puede todo
  if (!u) return true;
  if (u.admin) return true;
  const lista = u.permisos instanceof Set ? [...u.permisos] : (u.permisos ?? []);
  if (clave.startsWith('fe.') && !lista.some(k => k.startsWith('fe.'))) return true;
  // Un permiso general de reportes fiscales da ver/exportar cada reporte
  const reporte = /^fe\.reportes\.\w+\.(view|exportar)$/.exec(clave);
  if (reporte && !lista.some(k => /^fe\.reportes\.\w+\./.test(k)) && lista.includes(`fe.reportes.${reporte[1]}`)) return true;
  // Igual con un permiso general por bloque de configuración de facturación
  const conf = /^fe\.config\.(\w+)\.\w+$/.exec(clave);
  if (conf && !lista.some(k => /^fe\.config\.\w+\.\w+$/.test(k))
    && Object.entries(CONFIG_FE_VIEJOS).some(([viejo, secciones]) => lista.includes(viejo) && secciones.includes(conf[1]))) return true;
  return lista.some(k => k === clave || k.startsWith(clave + ':'));
}

export function usePermisos() {
  useSyncExternalStore(f => { oyentes.add(f); cargar(); return () => { oyentes.delete(f); }; }, () => version, () => 0);
  const nombre = USUARIO_ACTUAL;
  const u = usuarios.find(x => x.usuario === nombre);
  return { puede: (clave: string) => puedeUsuario(clave, u), usuario: nombre };
}
