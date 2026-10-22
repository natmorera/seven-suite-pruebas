import { TABLA, C } from '@/components/ui/tokens';

// ── Estilos de tabla del módulo de Catálogo ── Alias del estilo único TABLA, usado por las
// tablas del catálogo como TBL.*.
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
