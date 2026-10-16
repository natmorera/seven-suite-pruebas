// ─────────────────────────────────────────────────────────────────────────────
// Seven Suite · Tokens de diseño
//
// Fuente: Accounting / Digital Invoices (components/ui/primitives.tsx y
// layout/AppShell.tsx). Esta carpeta (components/suite) es IDÉNTICA en todos
// los módulos: si cambias algo aquí, cópialo a los demás.
//
// Lo ÚNICO que cambia entre módulos es el tema (TEMAS). Todo lo demás —
// neutros, semánticos, tipografía, medidas, menú oscuro — es compartido.
//
// Los componentes usan variables CSS (var(--brand)…), no hex fijos, así que
// el color del módulo se define una sola vez en app/globals.css (:root) y
// la página /design-system puede previsualizar cualquier módulo.
// ─────────────────────────────────────────────────────────────────────────────

export type ModuloId = 'ACC' | 'DICR' | 'FDK' | 'POS' | 'MGT' | 'TO' | 'INV' | 'PAY' | 'FA' | 'DSS' | 'ANA';

export interface TemaModulo {
  id: ModuloId;
  sigla: string;
  nombre: string;
  /** Acción primaria, pestaña activa, foco de input, ítem activo del subpanel */
  brand: string;
  /** Hover y texto sobre brandBg */
  brandDk: string;
  /** Fondo de fila seleccionada, chip, InfoBox, ítem activo del subpanel */
  brandBg: string;
  /** Borde de chip, InfoBox e ítem activo del subpanel */
  brandBd: string;
  /**
   * Versión del color para el menú oscuro (#0D0D0D). El azul de Front Desk o
   * el verde del POS no se leen sobre negro, así que el menú usa un tono más
   * claro de la misma familia (contraste ≥ 4.5:1). En Accounting es el mismo
   * dorado de siempre.
   */
  brandOnDark: string;
}

export const TEMAS: Record<ModuloId, TemaModulo> = {
  ACC:  { id: 'ACC',  sigla: 'ACC',  nombre: 'Accounting',       brand: '#A77600', brandDk: '#8A6200', brandBg: '#FFF8EC', brandBd: '#EED89A', brandOnDark: '#A77600' },
  DICR: { id: 'DICR', sigla: 'DICR', nombre: 'Digital Invoices', brand: '#A77600', brandDk: '#8A6200', brandBg: '#FFF8EC', brandBd: '#EED89A', brandOnDark: '#A77600' },
  FDK:  { id: 'FDK',  sigla: 'FDK',  nombre: 'Front Desk',       brand: '#213C89', brandDk: '#1A306E', brandBg: '#F2F3F8', brandBd: '#C1C8DE', brandOnDark: '#4C8FE6' },
  POS:  { id: 'POS',  sigla: 'POS',  nombre: 'Point of Sales',   brand: '#04760F', brandDk: '#035C0C', brandBg: '#E8F4EA', brandBd: '#B4D9B8', brandOnDark: '#5DB34A' },
  MGT:  { id: 'MGT',  sigla: 'MGT',  nombre: 'Management',       brand: '#3D7A2C', brandDk: '#2F6B22', brandBg: '#F0F7EC', brandBd: '#C6DFBC', brandOnDark: '#62A847' },
  TO:   { id: 'TO',   sigla: 'TO',   nombre: 'Tour Operator',    brand: '#2E6A4D', brandDk: '#1F4A39', brandBg: '#EEF4F0', brandBd: '#BFD6C9', brandOnDark: '#5FA37A' },
  INV:  { id: 'INV',  sigla: 'INV',  nombre: 'Inventory',        brand: '#B3261E', brandDk: '#850613', brandBg: '#FBEEEE', brandBd: '#EDBDBA', brandOnDark: '#E25555' },
  PAY:  { id: 'PAY',  sigla: 'PAY',  nombre: 'Payroll',          brand: '#4A52A0', brandDk: '#2E3366', brandBg: '#F1F1F8', brandBd: '#C9CBE6', brandOnDark: '#8C94D6' },
  FA:   { id: 'FA',   sigla: 'FA',   nombre: 'Fixed Assets',     brand: '#2F7F98', brandDk: '#245E73', brandBg: '#EEF8F9', brandBd: '#B8E0E6', brandOnDark: '#69D6DF' },
  DSS:  { id: 'DSS',  sigla: 'DSS',  nombre: 'Decision Support', brand: '#7A5848', brandDk: '#5A3E32', brandBg: '#F6F1EF', brandBd: '#DCCBC3', brandOnDark: '#B58C7A' },
  ANA:  { id: 'ANA',  sigla: 'ANA',  nombre: 'Seven Analytics',  brand: '#6E3FD6', brandDk: '#5A2DBE', brandBg: '#F4EFFD', brandBd: '#D5C6F7', brandOnDark: '#9F75F0' },
};

/** Variables CSS de un tema, para aplicarlas en un style={{…}} (p. ej. el preview del design system). */
export function variablesDe(t: TemaModulo): Record<string, string> {
  return {
    '--brand': t.brand,
    '--brand-dark': t.brandDk,
    '--brand-bg': t.brandBg,
    '--brand-border': t.brandBd,
    '--brand-on-dark': t.brandOnDark,
  };
}

// ── Colores ──────────────────────────────────────────────────────────────────
// La marca va como var(): el valor real sale de :root en app/globals.css.
export const C = {
  brand:   'var(--brand)',
  brandDk: 'var(--brand-dark)',
  brandBg: 'var(--brand-bg)',
  brandBd: 'var(--brand-border)',
  brandOnDark: 'var(--brand-on-dark)',

  // Neutros (iguales en toda la suite)
  n900: '#0F0F0F', // texto principal
  n700: '#757575', // texto secundario, labels de tabla, íconos
  n500: '#ECECEC', // TODOS los bordes y divisores
  n200: '#F9F9F9', // fondo de app, header de tabla, hover de fila
  n000: '#FFFFFF', // superficies: header, filtros, cards, modales

  // Semánticos
  success: '#4CAF50', successDk: '#0F6E56', successBg: 'rgba(76,175,80,.04)',  successBorder: 'rgba(76,175,80,.08)',
  error:   '#F44336',                       errorBg:   'rgba(244,67,54,.04)',  errorBorder:   'rgba(244,67,54,.08)',
  warning: '#EEB300',                       warningBg: 'rgba(238,179,0,.04)',  warningBorder: 'rgba(238,179,0,.08)',
  info:    '#2196F3',                       infoBg:    'rgba(33,150,243,.04)', infoBorder:    'rgba(33,150,243,.08)',
};

// ── Menú lateral oscuro (igual en todos los módulos) ────────────────────────
export const SIDEBAR = {
  bg: '#0D0D0D',
  divider: 'rgba(255,255,255,.06)',
  text: '#C0C0C0',       // ítem normal
  subText: '#909090',    // subítem normal
  muted: '#757575',      // íconos secundarios (idioma, flecha de colapsar)
  chevron: '#606060',
  dropdownBg: '#1A1A1A',
  dropdownBorder: 'rgba(255,255,255,.1)',
  /** Fondo del subítem activo: el color del módulo al 10 % */
  activeBg: 'color-mix(in srgb, var(--brand-on-dark) 10%, transparent)',
};

// ── Tipografía ───────────────────────────────────────────────────────────────
export const FONT = "'Montserrat', sans-serif"; // @fontsource/montserrat 400/500/600/700

export const TYPE = {
  pageTitle:    { fontSize: 16, fontWeight: 500 }, // h1 del PageHeader
  modalTitle:   { fontSize: 14, fontWeight: 500 },
  sectionTitle: { fontSize: 13, fontWeight: 500 }, // título de card / Section
  body:         { fontSize: 12, fontWeight: 400 }, // texto base, inputs, botones, celdas, tabs
  bodyStrong:   { fontSize: 12, fontWeight: 500 },
  small:        { fontSize: 11, fontWeight: 400 }, // hints, footer
  label:        { fontSize: 11, fontWeight: 500 }, // label de FormField, <th>
  badge:        { fontSize: 10, fontWeight: 500 }, // StatusBadge
};

// ── Forma, sombra, medidas ──────────────────────────────────────────────────
export const radius = { control: 4, sm: 6, md: 8, card: 10, lg: 12, pill: 20 };

export const shadow = {
  panel: '0 8px 24px rgba(0,0,0,.14)',
  modal: '0 16px 48px rgba(0,0,0,.2)',
  toast: '0 4px 12px rgba(0,0,0,.2)',
};
export const overlay = 'rgba(0,0,0,.35)';

export const SIZE = {
  control: 32,        // botón, input, select, búsqueda
  controlSm: 28,      // botones dentro de filas y dropdowns
  sidebarOpen: 220,
  sidebarClosed: 48,
  configSubpanel: 200,
  header: 52,         // header del menú, del subpanel y PageHeader: alineados
  tabBar: 44,
  filterBarMin: 48,
  appFooter: 32,
};
export const PAGE_PAD = 24;

export const Z = { sidebar: 20, dropdown: 300, modal: 1000, toast: 2000 };

// ── Formatos (reglas de negocio de Accounting) ──────────────────────────────
/** 1,234,567.00 — "," miles, "." decimales, siempre 2 decimales */
export function fmtNum(n: number, decimals = 2): string {
  const [int, dec = ''] = Math.abs(n).toFixed(decimals).split('.');
  return (n < 0 ? '-' : '') + int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (decimals > 0 ? '.' + dec : '');
}
/** ₡ 1,234,567.00 */
export function fmtMoney(n: number, sym = '₡', decimals = 2): string {
  return sym + '\u00a0' + fmtNum(n, decimals);
}
/** DD/MM/AAAA */
export function fmtDate(input: Date | string): string {
  const d = typeof input === 'string' ? (input.length === 10 ? new Date(input + 'T12:00:00') : new Date(input)) : input;
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
