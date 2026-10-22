// Módulos de Seven Suite que se muestran en «Módulos» del menú lateral. Este
// sitio es Accounting; el enlace de cada uno de los demás sale de su variable
// de entorno y, si no está definida, el módulo no aparece en la lista.
interface ModuloSuite {
  id: string; sigla: string; nombre: string; descripcion: string;
  colores: [string, string];   // isotipo, degradado claro → oscuro
  texto: string; fondo: string; url?: string;
}

// Módulo en el que corre este sitio
export const MODULO_ACTUAL = 'ACC';

export const MODULOS_SUITE: ModuloSuite[] = [
  { id: 'ACC', sigla: 'ACC', nombre: 'Accounting', descripcion: 'Asientos, bancos, catálogo de cuentas y estados financieros.',
    colores: ['#F7D154', '#D9A400'], texto: '#8A6500', fondo: '#FDF8E6' },
  { id: 'ACC_DICR', sigla: 'ACC + DICR', nombre: 'Accounting + Digital Invoices', descripcion: 'Contabilidad con facturación electrónica: cada venta y compra genera su asiento.',
    colores: ['#F7D154', '#D9A400'], texto: '#8A6500', fondo: '#FDF8E6', url: process.env.NEXT_PUBLIC_URL_ACC_DICR },
  { id: 'DICR', sigla: 'DICR', nombre: 'Digital Invoices', descripcion: 'Facturación electrónica ante Hacienda, compras, recibos de pago y reportes de IVA.',
    colores: ['#F7D154', '#D9A400'], texto: '#8A6500', fondo: '#FDF8E6', url: process.env.NEXT_PUBLIC_URL_DICR },
  { id: 'ANA', sigla: '', nombre: 'Seven Analytics', descripcion: 'Reportes y análisis de ocupación, ventas y costos.',
    colores: ['#9461EC', '#5A2DBE'], texto: '#5A2DBE', fondo: '#F4EFFD', url: process.env.NEXT_PUBLIC_URL_ANA },
  { id: 'MGT', sigla: 'MGT', nombre: 'Management', descripcion: 'Empresas, usuarios y configuración común de la suite.',
    colores: ['#62A847', '#2F6B22'], texto: '#2F6B22', fondo: '#F0F7EC', url: process.env.NEXT_PUBLIC_URL_MGT },
  { id: 'FDK', sigla: 'FDK', nombre: 'Front Desk', descripcion: 'Reservas, check-in, check-out y folios de huéspedes.',
    colores: ['#2882DD', '#213C89'], texto: '#213C89', fondo: '#EEF3FB', url: process.env.NEXT_PUBLIC_URL_FDK },
  { id: 'POS', sigla: 'POS', nombre: 'Point of Sales', descripcion: 'Restaurante, bar y tiendas: cuentas, mesas y cobros.',
    colores: ['#5DB34A', '#0D6916'], texto: '#0D6916', fondo: '#EEF7EC', url: process.env.NEXT_PUBLIC_URL_POS },
];

// Menú principal de la suite
export const URL_MENU_SUITE = process.env.NEXT_PUBLIC_URL_MENU;
