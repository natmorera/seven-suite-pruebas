export interface ModuloSuite {
  id: string; sigla: string; nombre: string; descripcion: string;
  colores: [string, string][];   // uno o dos isotipos (degradado claro → oscuro)
  texto: string; fondo: string; url?: string;
  accesos?: { label: string; ruta: string }[];   // accesos directos dentro del módulo
}

export const MODULOS_SUITE: ModuloSuite[] = [
  { id: 'ACC', sigla: 'ACC', nombre: 'Accounting', descripcion: 'Asientos, bancos, catálogo de cuentas y estados financieros.',
    colores: [['#F7D154', '#D9A400']], texto: '#8A6500', fondo: '#FDF8E6', url: process.env.NEXT_PUBLIC_URL_ACC || 'https://accounting-orpin.vercel.app/dashboard' },
  { id: 'ACC_DICR', sigla: 'ACC + DICR', nombre: 'Accounting + Digital Invoices', descripcion: 'Contabilidad con facturación electrónica: cada venta y compra genera su asiento.',
    colores: [['#F7D154', '#D9A400']], texto: '#8A6500', fondo: '#FDF8E6', url: process.env.NEXT_PUBLIC_URL_ACC_DICR || 'https://digital-invoices.vercel.app/dashboard?modo=completo',
    accesos: [{ label: 'Nueva factura', ruta: '/facturacion/emitidos/nuevo' }, { label: 'Ventas', ruta: '/facturacion/emitidos' }, { label: 'Bandeja de asientos', ruta: '/asientos' }] },
  // Digital Invoices sin Contabilidad: el mismo sitio en modo «solo facturación»
  { id: 'DICR', sigla: 'DICR', nombre: 'Digital Invoices', descripcion: 'Facturación electrónica ante Hacienda, compras, recibos de pago y reportes de IVA.',
    colores: [['#F7D154', '#D9A400']], texto: '#8A6500', fondo: '#FDF8E6', url: process.env.NEXT_PUBLIC_URL_DICR || 'https://digital-invoices.vercel.app/dashboard?modo=dicr',
    accesos: [{ label: 'Nueva factura', ruta: '/facturacion/emitidos/nuevo' }, { label: 'Ventas', ruta: '/facturacion/emitidos' }, { label: 'Compras', ruta: '/facturacion/recepcion' }] },
  { id: 'ANA', sigla: '', nombre: 'Seven Analytics', descripcion: 'Reportes y análisis de ocupación, ventas y costos.',
    colores: [['#9461EC', '#5A2DBE']], texto: '#5A2DBE', fondo: '#F4EFFD', url: process.env.NEXT_PUBLIC_URL_ANA || 'https://seven-analytics.vercel.app/' },
  { id: 'MGT', sigla: 'MGT', nombre: 'Management', descripcion: 'Empresas, usuarios y configuración común de la suite.', colores: [['#62A847', '#2F6B22']], texto: '#2F6B22', fondo: '#F0F7EC', url: process.env.NEXT_PUBLIC_URL_MGT },
  { id: 'FDK', sigla: 'FDK', nombre: 'Front Desk', descripcion: 'Reservas, check-in, check-out y folios de huéspedes.', colores: [['#2882DD', '#213C89']], texto: '#213C89', fondo: '#EEF3FB', url: process.env.NEXT_PUBLIC_URL_FDK },
  { id: 'POS', sigla: 'POS', nombre: 'Point of Sales', descripcion: 'Restaurante, bar y tiendas: cuentas, mesas y cobros.', colores: [['#5DB34A', '#0D6916']], texto: '#0D6916', fondo: '#EEF7EC', url: process.env.NEXT_PUBLIC_URL_POS },
  { id: 'TO', sigla: 'TO', nombre: 'Tour Operator', descripcion: 'Tours, transportes y paquetes para huéspedes y agencias.', colores: [['#3E8259', '#1F4A39']], texto: '#1F4A39', fondo: '#EEF4F0', url: process.env.NEXT_PUBLIC_URL_TO },
  { id: 'INV', sigla: 'INV', nombre: 'Inventory', descripcion: 'Bodegas, existencias, entradas, salidas y traslados.', colores: [['#C62323', '#850613']], texto: '#850613', fondo: '#FBEEEE', url: process.env.NEXT_PUBLIC_URL_INV },
  { id: 'PAY', sigla: 'PAY', nombre: 'Payroll', descripcion: 'Planillas, cargas sociales y pagos al personal.', colores: [['#727BC6', '#0F122C']], texto: '#2E3366', fondo: '#F1F1F8', url: process.env.NEXT_PUBLIC_URL_PAY },
  { id: 'FA', sigla: 'FA', nombre: 'Fixed Assets', descripcion: 'Activos fijos, depreciación y bajas.', colores: [['#69D6DF', '#4692AC']], texto: '#2F6D85', fondo: '#EEF8F9', url: process.env.NEXT_PUBLIC_URL_FA },
  { id: 'DSS', sigla: 'DSS', nombre: 'Decision Support System', descripcion: 'Indicadores y tableros para decidir con datos.', colores: [['#8A6656', '#5A3E32']], texto: '#5A3E32', fondo: '#F6F1EF', url: process.env.NEXT_PUBLIC_URL_DSS },
];

// Módulos que tiene la empresa, en este orden (por defecto ACC, ACC + DICR y
// DICR y Seven Analytics). Se cambia con NEXT_PUBLIC_MODULOS_EMPRESA, separados por coma.
export const MODULOS_EMPRESA = (process.env.NEXT_PUBLIC_MODULOS_EMPRESA || 'ACC,ACC_DICR,DICR,ANA')
  .split(',').map(x => x.trim()).filter(Boolean);

// Enlace de un módulo: su variable propia o, si no, la dirección principal de
// la suite más la sigla (https://suite…/POS), como funciona hoy.
const BASE = process.env.NEXT_PUBLIC_URL_SUITE?.replace(/\/$/, '');
export function enlaceDe(m: ModuloSuite, empresa?: string): string | undefined {
  const url = m.url ?? (BASE && m.sigla && !['ACC_DICR', 'DICR'].includes(m.id) ? `${BASE}/${m.sigla}` : undefined);
  if (!url || !empresa) return url;
  // La empresa elegida en el inicio viaja al módulo (?empresa=…)
  const u = new URL(url); u.searchParams.set('empresa', empresa); return u.href;
}

// Empresas del usuario (el inicio deja elegir con cuál entrar)
export const EMPRESAS = (process.env.NEXT_PUBLIC_EMPRESAS || 'Hotel Fortuna,Grand Horizon,Hotel San José,Hotel Uvita')
  .split(',').map(x => x.trim()).filter(Boolean);

// Menú principal de la suite (este proyecto)
export const URL_MENU_SUITE = process.env.NEXT_PUBLIC_URL_MENU;
