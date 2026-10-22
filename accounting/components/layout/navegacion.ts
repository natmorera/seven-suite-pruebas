// Estructura del menú lateral y del sub-panel de Configuración General
import { IcDashboard, IcRegistro, IcBancos, IcReportes, IcEstados, IcConfig } from '@/components/ui/icons';

export const NAV = [
  { id:'dashboard', label:'Dashboard',           Icon:IcDashboard, href:'/dashboard', children:null },
  { id:'registro',  label:'Bandeja de asientos',  Icon:IcRegistro,  href:'/asientos', children:null },
  { id:'bancos',    label:'Bancos',               Icon:IcBancos,    href:null,
    children:[{ label:'Cobros / Pagos',href:'/cobros-pagos'},{ label:'Gestión de tarjetas',href:'/tarjetas'},{ label:'Depósitos',href:'/depositos'},{ label:'Transferencias bancarias',href:'/transferencias'},{ label:'Conciliación bancaria',href:'/conciliacion'},{ label:'Cheques bancarios',href:'/cheques'}]},
  { id:'reportes',  label:'Reportes',             Icon:IcReportes,  href:null,
    children:[{ label:'Analítico de cuentas',href:'/analitico'},{ label:'Histórico clientes / proveedores',href:'/historico'},{ label:'Diferencial cambiario',href:'/diferencial'}]},
  { id:'estados',   label:'Estados financieros',  Icon:IcEstados,   href:null,
    children:[{ label:'Balance de comprobación',href:'/balance'},{ label:'Estado de resultados',href:'/resultados'},{ label:'Situación financiera',href:'/situacion'},{ label:'Cambio en el patrimonio',href:'/patrimonio'},{ label:'Presupuesto',href:'/presupuesto'}]},
  { id:'config',    label:'Configuración',        Icon:IcConfig,    href:null,
    children:[{ label:'Mi cuenta',href:'/config-usuario'},{ label:'Configuración General',href:'/empresa'}]},
];

export const CONFIG_ITEMS = [
  { label:'Empresa',                href:'/empresa'    },
  { label:'Usuarios y Permisos',    href:'/usuarios-permisos' },
  { label:'Parámetros generales',   href:'/parametros' },
  { label:'Configuración contable', href:'/config-contable' },
  { label:'Catálogo de cuentas',    href:'/catalogo'   },
  { label:'Clientes / Proveedores', href:'/clientes'   },
  { label:'Actividad bancaria',     href:'/config-actividad-bancaria' },
];

export const COMPANIES = ['Hotel Fortuna','Grand Horizon','Hotel San José','Hotel Uvita'];

// /config-usuario (Mi cuenta) no está aquí: no abre el sub-panel de
// Configuración General, es un destino propio del submenú de Configuración.
export const CONFIG_HREFS = new Set(CONFIG_ITEMS.map(x => x.href).concat(['/config-modulo']));

// Sección del menú que contiene la ruta (para expandirla)
export function seccionDeRuta(pathname: string): string {
  for (const n of NAV) {
    if (n.children?.some(c => pathname.startsWith(c.href))) return n.id;
  }
  return '';
}

// Sección marcada como activa en el menú
export function seccionActiva(pathname: string): string {
  for (const n of NAV) {
    if (n.href && pathname.startsWith(n.href)) return n.id;
    if (n.children?.some(c => pathname.startsWith(c.href))) return n.id;
  }
  return CONFIG_HREFS.has(pathname) ? 'config' : '';
}
