

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
  // Issue: ya no existe un permiso ".firmar" por reporte en Usuarios y
  // Permisos - qué firmas incluir al exportar se define centralizado en
  // Parámetros generales > Firmas (usuario + reportes que puede firmar +
  // orden), no acá.
};
// Foundation de color - única fuente de verdad para toda la app.
// Corregido (2026-08) con los valores oficiales del sistema de diseño:
// success/error vuelven a #4CAF50/#F44336 (los originales) - el cambio
// anterior a #1D9E75/#E24B4A había sido un error: se tomó "lo que más se
// repetía en el código" como si fuera lo correcto, cuando en realidad esos
// tonos eran una desviación del sistema real en 186+101 lugares, no el
// estándar. Border/Background ya no son hex sueltos inventados por pantalla:
// son el color principal al 8% y 4% de opacidad, como define el sistema.
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
// ── Escala de radios ─────────────────────────────────────────────────────────
// 4 pasos cubren el ~95% de los usos reales del proyecto (antes había 19
// valores distintos de borderRadius sin ningún criterio). sm para inputs/chips
// pequeños, md para botones/tarjetas (el más común), lg para modales/paneles,
// pill para elementos totalmente redondeados (tabs tipo cápsula, avatares).
export const radius = { sm: 6, md: 8, lg: 12, pill: 20 };
// ── Sombras estándar ─────────────────────────────────────────────────────────
// Antes había 19 variantes de boxShadow casi idénticas (cada modal nuevo
// copiaba y ajustaba "a ojo" la de otro). Dos bastan: modal normal y
// paneles grandes / drawers laterales.
export const shadow = {
  modal: '0 16px 48px rgba(0,0,0,.2)',
  panel: '0 8px 24px rgba(0,0,0,.14)',
};
// ── Padding estándar de página - usar SIEMPRE el mismo valor en el header,
// la barra de filtros y el contenedor de la tabla de cada pantalla de listado,
// para que el margen izquierdo no varíe entre pantallas. Antes este valor era
// 22 mientras que PageHeader (más abajo) siempre usó 24 de forma fija - un
// desfase de 2px entre el header y el contenido presente en TODA la app.
// Corregido (2026-08) a 24 para que ambos coincidan exactamente.
export const PAGE_PAD = 24;
// Única fuente de verdad para la tipografía de toda la app. Antes esta misma
// línea estaba copiada a mano en 32 archivos (const F = "'Montserrat',
// sans-serif") - cada pantalla la reinventaba porque esta constante no
// estaba exportada.
export const FONT = "'Montserrat', sans-serif";
// ── Estilo único de tabla (TABLA) ────────────────────────────────────────────
// Fuente única de verdad para TODAS las tablas de pantalla de la app. Antes
// convivían al menos 6 variantes (encabezado blanco vs gris #F9F9F9, títulos de
// columna en 10px/#757575 vs 11px/#757575, paddings 6/8, 7/12, 8/14, 9/12 y 10/12,
// separadores #ECECEC/#ECECEC/#ECECEC/#ECECEC/#F9F9F9...). Se toma como
// estándar el de las pantallas de listado de Bancos (Cheques, Transferencias,
// Depósitos, Tarjetas), que era el mayoritario.
// Excepción deliberada: las vistas de impresión / exportación a PDF (hoja
// blanca, borde inferior de 2px) siguen su propio estilo de "documento".
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
