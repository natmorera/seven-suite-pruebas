// Tarjetas del Dashboard, por pestaña. Qué tarjetas ve cada usuario se define
// en sus PERMISOS (Usuarios y permisos › Permisos › Dashboard), igual que todo
// lo demás: cada tarjeta tiene su clave de permiso.
export type GrupoTarjeta = 'contabilidad' | 'facturacion';
export const TARJETAS_DASHBOARD: { id: string; label: string; grupo: GrupoTarjeta; permiso: string }[] = [
  { id: 'situacion', label: 'Asientos pendientes y situación actual', grupo: 'contabilidad', permiso: 'dashboard.card_asientos' },
  { id: 'usuarios', label: 'Usuarios activos', grupo: 'contabilidad', permiso: 'dashboard.card_usuarios' },
  { id: 'cxc', label: 'Cartera de clientes vencida', grupo: 'contabilidad', permiso: 'dashboard.card_cxc' },
  { id: 'cxp', label: 'Cartera de proveedores vencida', grupo: 'contabilidad', permiso: 'dashboard.card_cxp' },
  { id: 'ingresos', label: 'Ingresos, costos y gastos', grupo: 'contabilidad', permiso: 'dashboard.card_icg' },
  { id: 'conciliaciones', label: 'Estado de conciliaciones', grupo: 'contabilidad', permiso: 'dashboard.card_conciliaciones' },
  { id: 'iva', label: 'Impuestos de ventas (IVA)', grupo: 'contabilidad', permiso: 'dashboard.card_iva' },
  { id: 'fe_avisos', label: 'Avisos de facturas emitidas solas', grupo: 'facturacion', permiso: 'fe.dashboard.card_avisos' },
  { id: 'fe_recurrentes', label: 'Facturas recurrentes', grupo: 'facturacion', permiso: 'fe.dashboard.card_recurrentes' },
  { id: 'fe_creditos', label: 'Ventas a crédito con recibo de pago', grupo: 'facturacion', permiso: 'fe.dashboard.card_creditos' },
  { id: 'fe_indicadores', label: 'Indicadores (aceptados, rechazados, ingresos)', grupo: 'facturacion', permiso: 'fe.dashboard.card_indicadores' },
  { id: 'fe_ultimos', label: 'Últimos documentos', grupo: 'facturacion', permiso: 'fe.dashboard.card_ultimos' },
  { id: 'fe_compras', label: 'Facturas de compra sin acuse', grupo: 'facturacion', permiso: 'fe.dashboard.card_compras' },
  { id: 'fe_no_enviados', label: 'Documentos no enviados por correo', grupo: 'facturacion', permiso: 'fe.dashboard.card_no_enviados' },
];
export const TODAS_LAS_TARJETAS = TARJETAS_DASHBOARD.map(t => t.id);
export const NOMBRE_GRUPO: Record<GrupoTarjeta, string> = { contabilidad: 'Contabilidad', facturacion: 'Factura electrónica' };
