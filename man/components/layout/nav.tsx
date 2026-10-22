// Menú del MAN. Todo el MAN es configuración, así que cada sección vive en el menú principal y sus pantallas
// se despliegan debajo (como Bancos en Accounting), sin subpanel.
import type { NavItem } from '@/components/suite/SuiteShell';
import { BuildingIcon, ContactsIcon, GridIcon, ServerIcon, Setting2Icon, UserIcon } from './iconos';

const i = { width: 14, height: 14 };

export const NAV: NavItem[] = [
  { id: 'empresa', label: 'Empresa', icon: <BuildingIcon {...i} />, href: '/empresa' },
  { id: 'usuarios', label: 'Usuarios', icon: <UserIcon {...i} />, href: '/usuarios' },
  { id: 'parametros', label: 'Parámetros', icon: <Setting2Icon {...i} />, href: '/parametros' },
  { id: 'modulos', label: 'Módulos', icon: <GridIcon {...i} />, hijos: [
    { label: 'Integración y enlaces', href: '/modulos' },
    { label: 'Entidades y datos', href: '/modulos/entidades' },
  ] },
  { id: 'perfiles', label: 'Perfiles', icon: <ContactsIcon {...i} />, href: '/perfiles' },
  { id: 'estructura', label: 'Estructura', icon: <ServerIcon {...i} />, hijos: [
    { label: 'Terminales', href: '/estructura/terminales' },
    { label: 'Terminales PinPad', href: '/estructura/pinpad' },
    { label: 'Servidores', href: '/estructura/servidores' },
    { label: 'Servicios', href: '/estructura/servicios' },
    { label: 'Impresión', href: '/estructura/impresoras' },
  ] },
];

/** Títulos de pantalla distintos del texto del menú. */
const TITULOS: Record<string, string> = { '/modulos': 'Módulos' };

const coincide = (p: string, href: string) => p === href || p.startsWith(href + '/');

/** Título de la pantalla actual: la entrada del menú con la ruta más específica que coincide. */
export function tituloDe(pathname: string) {
  const entradas = NAV.flatMap(n => (n.hijos ?? (n.href ? [{ label: n.label, href: n.href }] : [])));
  const e = entradas.filter(x => coincide(pathname, x.href)).sort((a, b) => b.href.length - a.href.length)[0];
  return e ? TITULOS[e.href] ?? e.label : 'Management';
}
