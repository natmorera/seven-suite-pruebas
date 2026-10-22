// ── Permisos de Front Desk ───────────────────────────────────────────────────
// Mismo modelo que «Usuarios y permisos» de la suite (Digital Invoices):
//   Categoría › Módulo › Grupo › Permiso (hoja)
// Una hoja con `subOpciones` se otorga «por tipo»: se guarda en el Set como
// "clave:opción" (p. ej. "reservas.crear:Agencia") y queda marcada si tiene
// al menos una opción elegida. Las hojas sin sub-opciones se guardan con su
// clave sola.

export interface Hoja { key: string; label: string; desc?: string; subOpciones?: string[] }
export interface Grupo { key: string; label: string; hojas: Hoja[] }
export interface Modulo { key: string; label: string; hojas?: Hoja[]; grupos?: Grupo[] }
export interface Categoria { key: string; label: string; modulos: Modulo[] }

const FORMATOS = ['CSV', 'XLS', 'PDF'];
const h = (key: string, label: string, desc?: string, subOpciones?: string[]): Hoja => ({ key, label, desc, subOpciones });
const ver = (m: string, label = 'Ver pantalla') => h(`${m}.ver`, label);
const exportar = (m: string) => h(`${m}.exportar`, 'Exportar', 'Formatos en los que puede exportar lo que ve en pantalla.', FORMATOS);
const g = (key: string, label: string, hojas: Hoja[]): Grupo => ({ key, label, hojas });
/** Sección de Configuración: ver y editar por pestaña. */
const conf = (key: string, label: string, pestanas: string[], extra: Hoja[] = []): Modulo => ({
  key: `cfg.${key}`, label,
  hojas: [h(`cfg.${key}.ver`, 'Ver sección'), h(`cfg.${key}.editar`, 'Editar', 'Pestañas que puede modificar.', pestanas), ...extra],
});

export const ARBOL: Categoria[] = [
  {
    key: 'operativo', label: 'OPERATIVO',
    modulos: [
      {
        key: 'dashboard', label: 'Dashboard',
        hojas: [
          h('dashboard.financiero', 'Ver dashboard financiero'),
          h('dashboard.operativo', 'Ver dashboard operativo'),
          h('dashboard.reportes', 'Abrir reportes del dashboard'),
          exportar('dashboard'),
        ],
      },
      {
        key: 'hospedaje', label: 'Hospedaje',
        grupos: [
          g('mapa', 'Mapa de habitaciones', [
            ver('mapa'),
            h('mapa.checkin', 'Hacer check-in'),
            h('mapa.checkout', 'Hacer check-out'),
            h('mapa.revertir', 'Revertir o cancelar check-in'),
            h('mapa.limpieza', 'Cambiar estado de limpieza', 'Marcar habitaciones limpias o sucias.'),
            h('mapa.bloquear', 'Bloquear habitaciones'),
            h('mapa.desbloquear', 'Desbloquear habitaciones'),
            h('mapa.mover', 'Mover huésped de habitación'),
            exportar('mapa'),
          ]),
          g('perfiles', 'Perfiles', [
            ver('perfiles'),
            h('perfiles.crear', 'Crear perfil', 'Tipos de perfil que puede crear.', ['Cliente', 'Empresa']),
            h('perfiles.editar', 'Editar perfil'),
            h('perfiles.vip', 'Marcar o quitar VIP'),
            exportar('perfiles'),
          ]),
          g('tareas', 'Tareas', [
            ver('tareas'),
            h('tareas.crear', 'Crear tarea'),
            h('tareas.editar', 'Editar tarea'),
            h('tareas.completar', 'Completar tarea'),
            h('tareas.asignar', 'Asignar responsable'),
            h('tareas.eliminar', 'Eliminar tarea'),
            exportar('tareas'),
          ]),
          g('repHosp', 'Reportes', [
            h('repHosp.ver', 'Ver reportes', 'Reportes de hospedaje que puede abrir.', ['Registros sin perfiles', 'Listado de ocupación', 'Saldos en el pick']),
            h('repHosp.vincular', 'Vincular perfil a un registro'),
            exportar('repHosp'),
          ]),
        ],
      },
      {
        key: 'reservaciones', label: 'Reservaciones',
        grupos: [
          g('planificador', 'Planificador', [ver('planificador'), exportar('planificador')]),
          g('reservas', 'Reservas', [
            ver('reservas'),
            h('reservas.crear', 'Crear reserva', 'Tipos de reserva que puede crear.', ['Directa', 'Agencia']),
            h('reservas.editar', 'Editar reserva'),
            h('reservas.precio', 'Modificar precio de reservas ya creadas'),
            h('reservas.confirmar', 'Confirmar reserva'),
            h('reservas.espera', 'Pasar a lista de espera'),
            h('reservas.anular', 'Anular reserva', 'Estados desde los que puede anular.', ['Solicitada', 'Confirmada', 'Lista de espera']),
            h('reservas.noshow', 'Marcar No-Show'),
            h('reservas.duplicar', 'Duplicar reserva'),
            h('reservas.prorroga', 'Prórroga de estancia'),
            h('reservas.deposito', 'Registrar depósito desde la reserva'),
            h('reservas.tarjeta', 'Tarjeta de registro y Web Check-In'),
            h('reservas.correo', 'Enviar reserva por correo'),
            exportar('reservas'),
          ]),
          g('asignacion', 'Asignación de habitaciones', [
            ver('asignacion'),
            h('asignacion.asignar', 'Asignar o cambiar habitación'),
            h('asignacion.auto', 'Asignar automáticamente en lote'),
            h('asignacion.preasignar', 'Preasignar habitaciones'),
            h('asignacion.quitar', 'Quitar preasignación'),
            exportar('asignacion'),
          ]),
          g('llegadas', 'Llegadas / salidas', [
            h('llegadas.ver', 'Ver listados', 'Listados que puede ver.', ['Llegadas', 'Salidas']),
            exportar('llegadas'),
          ]),
        ],
      },
      {
        key: 'facturacion', label: 'Facturación',
        grupos: [
          g('caja', 'Caja', [
            h('caja.ver', 'Ver caja', 'Qué cajeros puede ver.', ['Propia', 'Todos los cajeros']),
            h('caja.abrirDia', 'Abrir la caja del día'),
            h('caja.abrirTurno', 'Abrir turno', 'De quién puede abrir turno.', ['Propio', 'De otro cajero']),
            h('caja.precierre', 'Precierre de turno'),
            h('caja.cerrarTurno', 'Cerrar turno', 'De quién puede cerrar turno.', ['Propio', 'Forzar cierre de otro cajero']),
            h('caja.cerrarDia', 'Cerrar la caja del día'),
            h('caja.diferencias', 'Justificar diferencias de arqueo'),
            h('caja.alertas', 'Enviar alertas a cajeros'),
            exportar('caja'),
          ]),
          g('canje', 'Canje de divisas', [ver('canje'), h('canje.registrar', 'Registrar canje'), exportar('canje')]),
          g('folios', 'Folios (Reservas)', [
            ver('folios'),
            h('folios.cobrar', 'Cobrar', 'Métodos de pago que puede registrar.', ['Efectivo', 'Tarjeta', 'Transferencia', 'Link de pago']),
            h('folios.cargo', 'Cargar consumos'),
            h('folios.trasladar', 'Trasladar cargos'),
            h('folios.facturar', 'Facturar'),
            h('folios.fiscal', 'Exoneración y referencia'),
            exportar('folios'),
          ]),
          g('externos', 'Folios externos', [
            ver('externos'),
            h('externos.crear', 'Crear folio externo'),
            h('externos.eliminar', 'Eliminar cuenta'),
            h('externos.prefactura', 'Prefactura'),
            exportar('externos'),
          ]),
          g('casa', 'Folios cuenta casa', [
            ver('casa'),
            h('casa.cargo', 'Registrar cargo'),
            h('casa.trasladar', 'Trasladar cargos'),
            h('casa.liquidar', 'Liquidar cuenta'),
            h('casa.correccion', 'Corrección de cargos'),
            exportar('casa'),
          ]),
          g('depositos', 'Depósitos en garantía', [
            ver('depositos'),
            h('depositos.registrar', 'Registrar depósito'),
            h('depositos.editar', 'Editar depósito'),
            h('depositos.anular', 'Anular depósito'),
            exportar('depositos'),
          ]),
          g('consultas', 'Consultas', [
            h('consultas.historico', 'Histórico de folios'),
            h('consultas.transacciones', 'Transacciones diarias'),
            h('consultas.vouchers', 'Vouchers y depósitos', 'Vistas que puede ver.', ['Vouchers y depósitos', 'Vouchers', 'Histórico de tarjetas']),
            exportar('consultas'),
          ]),
        ],
      },
      {
        key: 'pronostico', label: 'Pronóstico y estadísticas',
        hojas: [
          h('pronostico.tipo', 'Pronóstico por tipo de habitación', 'Vistas que puede ver.', ['Disponibilidad', 'Ocupación']),
          h('pronostico.detalle', 'Detalle del tipo de habitación'),
          h('pronostico.reportes', 'Reportes de pronóstico'),
          exportar('pronostico'),
        ],
      },
      {
        key: 'auditoria', label: 'Auditoría',
        hojas: [
          h('auditoria.ver', 'Ver gestión de auditorías'),
          h('auditoria.preauditar', 'Ejecutar preauditoría'),
          h('auditoria.generar', 'Generar auditoría nocturna'),
          h('auditoria.repetir', 'Repetir la auditoría del día', 'Pide contraseña al ejecutarla.'),
          h('auditoria.configurar', 'Configuración de cierre y auditoría automática'),
          h('auditoria.reportes', 'Reportes de auditoría'),
          h('auditoria.sincronizacion', 'Problemas de sincronización'),
          exportar('auditoria'),
        ],
      },
      {
        key: 'amallaves', label: 'Ama de llaves',
        grupos: [
          g('amallaves.estado', 'Estado de las habitaciones', [
            h('amallaves.ver', 'Ver ama de llaves'),
            h('amallaves.estado.limpieza', 'Cambiar estado de limpieza', 'Sucia, Limpia o No requiere (incluye «Limpiar todas las habitaciones»).'),
            h('amallaves.estado.discrepancias', 'Registrar discrepancias'),
            h('amallaves.estado.camarera', 'Vista de camarera (móvil)', 'Solo ve las habitaciones que tiene asignadas.'),
            exportar('amallaves.estado'),
          ]),
          g('amallaves.bloqueo', 'Bloqueo de habitaciones', [
            h('amallaves.bloqueo.crear', 'Crear bloqueo'),
            h('amallaves.bloqueo.editar', 'Editar fechas y motivo'),
            h('amallaves.bloqueo.eliminar', 'Eliminar bloqueo'),
            exportar('amallaves.bloqueo'),
          ]),
          g('amallaves.distribucion', 'Distribución de camareras', [
            h('amallaves.distribucion.asignar', 'Asignar habitaciones a camareras'),
            h('amallaves.distribucion.auto', 'Distribuir automáticamente'),
          ]),
          g('amallaves.sabanas', 'Cambio de sábanas', [
            h('amallaves.sabanas.marcar', 'Marcar cambio de sábanas'),
            h('amallaves.sabanas.politica', 'Cambiar la frecuencia de cambio'),
          ]),
        ],
      },
      {
        key: 'historico', label: 'Histórico',
        hojas: [h('historico.ver', 'Ver histórico', 'Pantallas que puede ver.', ['Estancias y huéspedes', 'Bitácora de cambios', 'No-shows', 'Mensajes'])],
      },
    ],
  },
  {
    key: 'configuracion', label: 'CONFIGURACIÓN',
    modulos: [
      conf('empresa', 'Empresa', ['Datos de empresa', 'Consecutivos de documentos', 'Asignación de impresoras', 'Impresoras', 'Tipos de documento', 'API Key', 'Importar datos']),
      {
        key: 'cfg.usuarios', label: 'Usuarios y Permisos',
        hojas: [
          h('cfg.usuarios.ver', 'Ver usuarios'),
          h('cfg.usuarios.crear', 'Crear usuario'),
          h('cfg.usuarios.permisos', 'Editar permisos de usuarios'),
          h('cfg.usuarios.roles', 'Gestionar roles'),
          h('cfg.usuarios.clave', 'Restablecer contraseñas'),
          h('cfg.usuarios.estado', 'Activar, desactivar y eliminar usuarios'),
          exportar('cfg.usuarios'),
        ],
      },
      conf('parametros', 'Parámetros generales', ['Monedas', 'Tipo de cambio', 'Reservas y habitaciones', 'Folios y cargos', 'Políticas', 'Nacionalidades', 'Tipos de tareas']),
      conf('alojamiento', 'Alojamiento', ['Habitaciones', 'Grupos de disponibilidad', 'Regímenes', 'Camareras / Mucamas', 'Rangos de habitación']),
      conf('tarifas', 'Tarifas / Contratos', ['Empresas', 'Mercados', 'Agentes de ventas', 'Referidores', 'Contratos', 'Tarifario'],
        [h('cfg.tarifas.colectiva', 'Actualización masiva de tarifas')]),
      conf('facturacion', 'Facturación', ['Producción', 'Servicios', 'Tipos de cobro', 'Impuestos', 'Exoneración', 'Descuentos', 'Folios externos']),
      conf('caja', 'Caja y cierre', ['Fondo de caja', 'Seguridad', 'Cierre diario']),
      conf('correo', 'Correo electrónico', ['Cuenta', 'Correos especiales', 'Notificaciones', 'Histórico de correos enviados']),
      conf('integraciones', 'Integraciones', ['Servicios', 'Web Check In', 'Formulario Check-In', 'Errores de sincronización', 'DEGA']),
    ],
  },
];

// ── Utilidades ───────────────────────────────────────────────────────────────
export const hojasDe = (m: Modulo): Hoja[] => [...(m.hojas ?? []), ...(m.grupos ?? []).flatMap(x => x.hojas)];
export const hojasCategoria = (c: Categoria) => c.modulos.flatMap(hojasDe);
export const TODAS_LAS_HOJAS = ARBOL.flatMap(hojasCategoria);
export const TOTAL = TODAS_LAS_HOJAS.length;
/** Claves que otorgan la hoja completa (con todas sus sub-opciones). */
export const clavesDe = (x: Hoja) => (x.subOpciones ? x.subOpciones.map(o => `${x.key}:${o}`) : [x.key]);
export const clavesDeHojas = (hs: Hoja[]) => hs.flatMap(clavesDe);
export const marcada = (x: Hoja, p: Set<string>) => (x.subOpciones ? x.subOpciones.some(o => p.has(`${x.key}:${o}`)) : p.has(x.key));
export const contar = (hs: Hoja[], p: Set<string>) => hs.filter(x => marcada(x, p)).length;
export const TODOS = new Set(clavesDeHojas(TODAS_LAS_HOJAS));

/** Permisos de un usuario agrupados por módulo, para el detalle y la exportación. */
export function detallePermisos(p: Set<string>) {
  return ARBOL.flatMap(c => c.modulos.flatMap(m => {
    const filas = [...(m.hojas?.length ? [{ grupo: '', hojas: m.hojas }] : []), ...(m.grupos ?? []).map(x => ({ grupo: x.label, hojas: x.hojas }))]
      .map(({ grupo, hojas }) => ({ grupo, items: hojas.filter(x => marcada(x, p)).map(x => ({ permiso: x.label, opciones: (x.subOpciones ?? []).filter(o => p.has(`${x.key}:${o}`)) })) }))
      .filter(x => x.items.length);
    return filas.length ? [{ categoria: c.label, modulo: m.label, filas }] : [];
  }));
}

// ── Roles y usuarios de ejemplo ─────────────────────────────────────────────
export interface Rol { id: string; nombre: string; permisos: Set<string> }
export interface UsuarioFD {
  id: string; numero: number; usuario: string; nombre: string; correo: string; rolId: string;
  creado: string; claveCambiada: string; ultimoAcceso: string; activo: boolean; admin: boolean; permisos: Set<string>;
  /** Impresora personal por código de tipo de documento (Mi cuenta › Impresora). */
  impresoras?: Record<string, string>;
}

/** Arma un set con hojas completas por prefijo de clave (p. ej. 'reservas.' o 'caja.ver'). */
const por = (...prefijos: string[]) => new Set(clavesDeHojas(TODAS_LAS_HOJAS.filter(x => prefijos.some(p => x.key === p || x.key.startsWith(p.endsWith('.') ? p : `${p}.`)))));
const unir = (...ss: Set<string>[]) => new Set(ss.flatMap(s => [...s]));
const solo = (clave: string, ...ops: string[]) => new Set(ops.map(o => `${clave}:${o}`));

const LECTURA_OPERATIVA = por('mapa.ver', 'perfiles.ver', 'tareas.ver', 'planificador.ver', 'reservas.ver', 'llegadas.ver', 'dashboard.operativo');

export const ROLES_INIT: Rol[] = [
  { id: 'r-admin', nombre: 'Administrador', permisos: new Set(TODOS) },
  {
    id: 'r-gerente', nombre: 'Gerente de recepción',
    permisos: unir(por('dashboard', 'mapa', 'perfiles', 'tareas', 'repHosp', 'planificador', 'reservas', 'asignacion', 'llegadas', 'pronostico', 'folios', 'externos', 'casa', 'depositos', 'consultas', 'canje'),
      por('caja.ver', 'caja.precierre', 'caja.diferencias', 'caja.alertas', 'caja.exportar', 'auditoria.ver', 'auditoria.reportes'), por('cfg.alojamiento.ver', 'cfg.tarifas.ver')),
  },
  {
    id: 'r-recepcion', nombre: 'Recepcionista',
    permisos: unir(LECTURA_OPERATIVA, por('mapa.checkin', 'mapa.checkout', 'mapa.limpieza', 'perfiles.crear', 'perfiles.editar', 'tareas.crear', 'tareas.completar',
      'reservas.editar', 'reservas.confirmar', 'reservas.tarjeta', 'reservas.correo', 'reservas.prorroga', 'asignacion.ver', 'asignacion.asignar', 'canje', 'folios.ver', 'folios.cargo', 'depositos.ver', 'depositos.registrar'),
    solo('reservas.crear', 'Directa'), solo('folios.cobrar', 'Efectivo', 'Tarjeta'), solo('mapa.exportar', 'PDF'), solo('reservas.exportar', 'PDF')),
  },
  {
    id: 'r-cajero-resp', nombre: 'Cajero responsable',
    permisos: unir(por('caja', 'canje', 'folios', 'externos', 'casa', 'depositos', 'consultas'), por('dashboard.financiero', 'reservas.ver', 'perfiles.ver')),
  },
  {
    id: 'r-cajero', nombre: 'Cajero',
    permisos: unir(solo('caja.ver', 'Propia'), solo('caja.abrirTurno', 'Propio'), solo('caja.cerrarTurno', 'Propio'), por('caja.precierre', 'canje.ver', 'canje.registrar', 'folios.ver', 'folios.cargo', 'depositos.ver', 'depositos.registrar', 'reservas.ver'),
      solo('folios.cobrar', 'Efectivo', 'Tarjeta', 'Transferencia', 'Link de pago'), solo('caja.exportar', 'PDF')),
  },
  {
    id: 'r-reservas', nombre: 'Agente de reservas',
    permisos: unir(por('planificador', 'reservas', 'asignacion', 'llegadas', 'pronostico', 'perfiles'), por('dashboard.operativo', 'depositos.ver', 'depositos.registrar')),
  },
  { id: 'r-auditor', nombre: 'Auditor nocturno', permisos: unir(por('auditoria', 'consultas', 'folios.ver', 'casa.ver', 'externos.ver'), por('caja.ver', 'dashboard')) },
  { id: 'r-ama', nombre: 'Ama de llaves', permisos: unir(por('amallaves', 'tareas'), por('mapa.ver', 'mapa.limpieza', 'mapa.bloquear', 'mapa.desbloquear')) },
];

const rol = (id: string) => ROLES_INIT.find(r => r.id === id)!;
const u = (numero: number, usuario: string, nombre: string, rolId: string, creado: string, ultimoAcceso: string, extra: Partial<UsuarioFD> = {}): UsuarioFD => ({
  id: `u${numero}`, numero, usuario, nombre, correo: `${usuario}@hotelsevensuite.com`, rolId, creado, claveCambiada: creado, ultimoAcceso,
  activo: true, admin: false, permisos: new Set(rol(rolId).permisos), ...extra,
});

export const USUARIOS_INIT: UsuarioFD[] = [
  u(1000, 'admin', 'Superusuario', 'r-admin', '2026-01-01', '2026-10-06', { admin: true }),
  u(1001, 'federico.araya', 'Federico Araya', 'r-admin', '2026-01-05', '2026-10-06', { admin: true }),
  u(1002, 'jperez', 'Juan Pérez', 'r-gerente', '2026-01-10', '2026-10-06'),
  u(1003, 'jose.gil', 'José Gregorio Gil', 'r-cajero-resp', '2026-02-02', '2026-10-06'),
  u(1004, 'maria.rodriguez', 'María Rodríguez', 'r-cajero', '2026-02-14', '2026-10-06'),
  u(1005, 'ana.lopez', 'Ana López', 'r-cajero', '2026-03-01', '2026-10-05'),
  u(1006, 'carlos.mora', 'Carlos Mora', 'r-cajero', '2026-03-01', '2026-10-06'),
  u(1007, 'recepcion1', 'Carlos Rayo', 'r-recepcion', '2026-03-20', '2026-10-06'),
  u(1008, 'recepcion2', 'Ernesto Ríos', 'r-recepcion', '2026-04-11', '2026-10-05'),
  u(1009, 'reservas1', 'María Laura Céspedes Morales', 'r-reservas', '2026-04-18', '2026-10-04'),
  u(1010, 'auditor', 'Daniel Viera', 'r-auditor', '2026-05-02', '2026-10-06'),
  u(1011, 'amallaves', 'Fabián Araya', 'r-ama', '2026-05-15', '2026-10-05'),
  u(1012, 'lduarte', 'Luis Duarte', 'r-recepcion', '2026-06-01', '2026-08-30', { activo: false }),
];
