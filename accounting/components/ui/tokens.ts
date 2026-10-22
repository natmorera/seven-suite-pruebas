

// Usuario de la sesión activa. Centralizado aquí para que ningún formulario
// grabe un usuario "de mentira" desconectado de quién realmente opera el
// sistema - cuando exista autenticación real, este es el único punto a cambiar.
export const USUARIO_ACTUAL = 'jperez';
// Permisos del usuario de la sesión activa. Centralizado para que la pantalla
// "Sin permisos" (p.ej. al descontabilizar/descontabilizar) sea consistente en
// toda la app y no cada módulo invente su propia validación. Cuando exista
// un sistema de roles real, este es el único punto a conectar.
export const PERMISOS_ACTUAL = {
  descontabilizarAsientos: true,
  // Mock del permiso "Exportar permisos" (Usuarios y Permisos → Usuarios).
  puedeExportarPermisosUsuarios: true,
  // Las firmas que se incluyen al exportar se definen en Parámetros generales › Firmas
  // (usuario, reportes que puede firmar y orden).
};
// Colores del sistema de diseño: única fuente de verdad para toda la app. Éxito/error
// #4CAF50/#F44336; borde y fondo de marca son el color principal al 8 % y al 4 % de opacidad.
export const C = {
  brand:    '#A77600',
  brandDk:  '#8A6200',
  brandBg:  '#FFF8EC',
  brandBd:  '#EED89A',
  n900:     '#0F0F0F',
  n700:     '#757575',
  n500:     '#ECECEC',
  n200:     '#F9F9F9',
  n000:     '#FFFFFF',
  success:       '#4CAF50',
  successBorder: 'rgba(76,175,80,.08)',
  successBg:     'rgba(76,175,80,.04)',
  successDk:     '#0F6E56',
  error:         '#F44336',
  errorBorder:   'rgba(244,67,54,.08)',
  errorBg:       'rgba(244,67,54,.04)',
  warning:       '#EEB300',
  warningBorder: 'rgba(238,179,0,.08)',
  warningBg:     'rgba(238,179,0,.04)',
  info:          '#2196F3',
  infoBorder:    'rgba(33,150,243,.08)',
  infoBg:        'rgba(33,150,243,.04)',
};
// ── Escala de radios ── sm para inputs y chips pequeños, md para botones y tarjetas, lg para
// modales y paneles, pill para elementos redondeados (tabs tipo cápsula, avatares).
export const radius = { sm: 6, md: 8, lg: 12, pill: 20 };
// ── Sombras estándar ── Modal normal y paneles grandes / drawers laterales.
export const shadow = {
  modal: '0 16px 48px rgba(0,0,0,.2)',
  panel: '0 8px 24px rgba(0,0,0,.14)',
};
// ── Padding estándar de página ── El mismo valor en el encabezado, la barra de filtros y el
// contenedor de la tabla de cada listado, igual al de PageHeader.
export const PAGE_PAD = 24;
// Tipografía de toda la app.
export const FONT = "'Montserrat', sans-serif";
// ── Estilo único de tabla (TABLA) ── Para todas las tablas de pantalla: encabezado gris,
// títulos de columna 11px Neutro/700 y celdas 12px. Las vistas de impresión y exportación a PDF
// (hoja blanca, borde inferior de 2px) tienen su propio estilo de documento.
export const TABLA = {
  // Contenedor tipo tarjeta para tablas embebidas en secciones/tabs/modales.
  // Las tablas de listado a pantalla completa no lo usan (van al ras).
  wrap:     { background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden' as const },
  table:    { width: '100%', borderCollapse: 'collapse' as const, fontSize: 12, fontFamily: FONT },
  thead:    { position: 'sticky' as const, top: 0, background: C.n000, zIndex: 2 },
  headRow:  { background: C.n000, borderBottom: `1px solid ${C.n500}` },
  th:       { padding: '10px 12px', textAlign: 'left' as const, fontSize: 11, fontWeight: 500, color: C.n700, whiteSpace: 'nowrap' as const, fontFamily: FONT },
  row:      { borderBottom: `1px solid ${C.n500}`, background: C.n000 },
  rowGroup: { borderBottom: `1px solid ${C.n500}`, background: C.n200 },
  td:       { padding: '8px 12px', fontSize: 12, fontWeight: 400, color: C.n900, fontFamily: FONT },
  tdMuted:  { padding: '8px 12px', fontSize: 12, fontWeight: 400, color: C.n900, fontFamily: FONT },
  // Altura única de fila del body (la aplica la clase .tabla de globals.css).
  rowHeight: 44,
  empty:    { padding: 40, textAlign: 'center' as const, color: C.n700, fontSize: 12, fontFamily: FONT },
  rowHoverBg:    C.n200,
  rowSelectedBg: C.brandBg,
};
