import { TABLA, C } from '../../ui/tokens';

// ── Estilos de tabla del módulo de Catálogo ──────────────────────────────────
// Este módulo tenía su propia variante de tabla (títulos 10px #757575, celdas
// 11px, padding 7/12 y 9/12, radio 10) distinta del resto de la app. Ahora es
// solo un alias del estilo único TABLA de primitives, para no tener que tocar
// todos los usos de TBL.* en CatalogoTabs / CatalogoTabs2.
export const TBL = {
  wrap:    TABLA.wrap,
  table:   TABLA.table,
  thead:   TABLA.thead,
  theadTr: TABLA.headRow,
  th:      TABLA.th,
  trGroup: TABLA.rowGroup,
  trRow:   TABLA.row,
  tdCode:  { ...TABLA.td, fontWeight: 600 },
  tdMain:  TABLA.td,
  tdSub:   TABLA.tdMuted,
  tdAlt:   { ...TABLA.td, color: C.n700 },
  empty:   TABLA.empty,
};
