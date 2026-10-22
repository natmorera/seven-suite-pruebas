// Menú de Front Desk. El shell (components/suite/SuiteShell) es el mismo de
// toda la suite: aquí solo se define QUÉ va en el menú, no cómo se ve.
import type { NavItem, ConfigShell } from '@/components/suite/SuiteShell';
import {
  KanbanIcon, Home2Icon, DollarCircleIcon, CalendarIcon, ChartIcon,
  TickSquareIcon, MoonIcon, SearchNormalIcon, Setting2Icon,
} from '@/components/icons/nav-icons';

const i = { width: 14, height: 14 };

export const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <KanbanIcon {...i} />, href: '/' },
  {
    id: 'hospedaje', label: 'Hospedaje', icon: <Home2Icon {...i} />,
    hijos: [
      { label: 'Mapa de habitaciones', href: '/hospedaje/mapa-de-habitaciones' },
      { label: 'Perfiles', href: '/hospedaje/perfiles' },
      { label: 'Tareas', href: '/hospedaje/tareas' },
      { label: 'Reportes', href: '/hospedaje/reportes' },
    ],
  },
  {
    id: 'facturacion', label: 'Facturación', icon: <DollarCircleIcon {...i} />,
    hijos: [
      { label: 'Canje de divisas', href: '/facturacion/canje-de-divisas' },
      { label: 'Caja', href: '/facturacion/caja' },
      { label: 'Folios cuenta casa', href: '/facturacion/folios-cuenta-casa' },
      { label: 'Folios externos', href: '/facturacion/folios-externos' },
      { label: 'Folios', href: '/facturacion/folios' },
      { label: 'Histórico de folios', href: '/facturacion/historico-de-folios' },
      { label: 'Transacciones diarias', href: '/facturacion/transacciones-diarias' },
      { label: 'Depósitos en garantía', href: '/facturacion/depositos-en-garantia' },
      { label: 'Vouchers y depósitos', href: '/facturacion/vouchers' },
    ],
  },
  {
    id: 'reservaciones', label: 'Reservaciones', icon: <CalendarIcon {...i} />,
    hijos: [
      { label: 'Planificador', href: '/reservaciones/planificador' },
      { label: 'Reservas', href: '/reservaciones/reservas' },
      { label: 'Asignación de habitaciones', href: '/reservaciones/asignacion-de-habitaciones' },
      { label: 'Listado de llegadas / salidas', href: '/reservaciones/llegadas-y-salidas' },
    ],
  },
  {
    id: 'pronostico', label: 'Pronóstico y estadísticas', icon: <ChartIcon {...i} />,
    hijos: [
      { label: 'Pronóstico por tipo de hab.', href: '/pronostico-estadisticas/pronostico-por-tipo-de-hab' },
      { label: 'Detalle del tipo de habitación', href: '/pronostico-estadisticas/detalle-del-tipo-de-habitacion' },
      { label: 'Reportes', href: '/pronostico-estadisticas/reportes', match: '/pronostico-estadisticas/reportes' },
    ],
  },
  {
    id: 'ama-de-llaves', label: 'Ama de llaves', icon: <TickSquareIcon {...i} />,
    hijos: [
      { label: 'Distribución de camareras', href: '/ama-de-llaves/distribucion-de-camareras', match: '/ama-de-llaves/distribucion-de-camareras' },
      { label: 'Estado de las habitaciones', href: '/ama-de-llaves/estado-de-habitaciones', match: '/ama-de-llaves/estado-de-habitaciones' },
      { label: 'Bloqueo de habitaciones', href: '/ama-de-llaves/bloqueo-de-habitaciones' },
      { label: 'Cambio de sábanas', href: '/ama-de-llaves/cambio-de-sabanas' },
    ],
  },
  {
    id: 'auditoria', label: 'Auditoría', icon: <MoonIcon {...i} />,
    hijos: [
      { label: 'Gestión de auditorías', href: '/auditoria/gestion-de-auditorias' },
      { label: 'Problemas de Sincronización', href: '/auditoria/problemas-de-sincronizacion' },
      { label: 'Reportes', href: '/auditoria/reportes', match: '/auditoria/reportes' },
    ],
  },
  {
    id: 'historico', label: 'Histórico', icon: <SearchNormalIcon {...i} />,
    hijos: [
      { label: 'Estancias y huéspedes', href: '/historico/estancias' },
      { label: 'Bitácora de cambios', href: '/historico/bitacora-de-cambios' },
      { label: 'No-shows', href: '/historico/no-shows' },
      { label: 'Mensajes', href: '/historico/mensajes' },
    ],
  },
  {
    id: 'config', label: 'Configuración', icon: <Setting2Icon {...i} />,
    hijos: [
      { label: 'Mi cuenta', href: '/mi-cuenta' },
      { label: 'Configuración General', href: '/configuracion/empresa', match: '/configuracion' },
    ],
  },
];

// Subpanel blanco de Configuración
export const CONFIG: ConfigShell = {
  prefijo: '/configuracion',
  titulo: 'Configuración General',
  navId: 'config',
  grupos: [
    {
      items: [
        { label: 'Empresa', href: '/configuracion/empresa' },
        { label: 'Usuarios y Permisos', href: '/configuracion/usuarios-permisos' },
        { label: 'Parámetros generales', href: '/configuracion/parametros-generales' },
        { label: 'Alojamiento', href: '/configuracion/alojamiento' },
        { label: 'Tarifas / Contratos', href: '/configuracion/tarifas-contratos' },
        { label: 'Facturación', href: '/configuracion/facturacion' },
        { label: 'Caja y cierre', href: '/configuracion/caja' },
        { label: 'Correo electrónico', href: '/configuracion/correo-electronico' },
        { label: 'Integraciones', href: '/configuracion/integraciones' },
      ],
    },
  ],
};
