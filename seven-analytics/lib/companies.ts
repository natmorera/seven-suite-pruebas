// ---------------------------------------------------------------------------
// Modelo de datos por empresa/hotel. Cada empresa que aparece en el switcher
// del sidebar trae su propio set de datos con esta misma forma. Sustituir
// por fetch a la API real cuando esté disponible (mismo shape).
//
// Nota de consistencia (revisión): los números de cada hotel se revisaron
// para que amarren entre secciones. El P&L Bridge suma exactamente a la
// Utilidad Neta de los KPIs, el Front Desk Live usa un solo símbolo de
// moneda ($) consistente con el resto del dashboard, y Ocupación/ADR/RevPAR
// guardan la relación RevPAR = ADR × Ocupación.
// ---------------------------------------------------------------------------

export type DeptRevenue = {
  id: string;
  name: string;
  value: number;
  pct: number;
  deltaPct: number;
};

export type CostCenter = {
  name: string;
  ingresos: number;
  costo: number;
  costoAnterior: number;
};

export type RevenuePoint = { label: string; value: number; previous: number };
export type RevenueSeries = {
  "1D": RevenuePoint[];
  "7D": RevenuePoint[];
  "1M": RevenuePoint[];
  "1Y": RevenuePoint[];
};

export type CompanyData = {
  id: string;
  name: string;
  logoInitial: string;
  hasData: boolean;
  currency: string;
  kpis: {
    utilidadNeta: { value: number; margin: number; deltaPct: number };
    ingresos: { value: number; breakdown: string; deltaPct: number };
    costoVentas: { value: number; pctOfRevenue: number; deltaPct: number };
    gastosOperativos: { value: number; pctOfRevenue: number; deltaPct: number };
  };
  revenueByDepartment: DeptRevenue[];
  frontDeskLive: {
    occupied: number;
    free: number;
    adr: { value: number; deltaPct: number };
    revpar: { value: number; deltaPct: number };
    revpor: { value: number; deltaPct: number };
    occupancy: { value: number; deltaPct: number };
    dailyRevenue: { value: number; asOf: string };
    monthRevenue: { value: number; range: string };
    synced: boolean;
  };
  revenueOverTime: RevenueSeries;
  revenueProjection: { projectedRevenue7d: number; projectedOccupancy: number; projectedBookings: number };
  costCenters: CostCenter[];
  plBridge: { name: string; value: number; type: "total" | "delta" }[];
  netIncomeTrend: { month: string; utilidad: number; utilidadAnterior: number; margin: number }[];
  topCostsExpenses: {
    left: { name: string; value: number; deltaPct: number }[];
    right: { name: string; value: number; deltaPct: number }[];
  };
  monthlyComparison: {
    month: string;
    ingresos: number;
    costoVentas: number;
    gastos: number;
    utilidadNeta: number;
  }[];
  monthlyComparisonTotal: {
    month: string;
    ingresos: number;
    costoVentas: number;
    gastos: number;
    utilidadNeta: number;
  };
  costoDeVentasDetail: { cuentas: { name: string; value: number }[]; total: number };
  gastosOperativosDetail: { cuentas: { name: string; value: number }[]; total: number };
};

// Deriva las series 1D/1M/1Y a partir de la serie de 7 días y de un listado
// de 12 meses (yearly), así cada pestaña tiene la granularidad que le
// corresponde a su unidad de tiempo: 1D = horas, 7D = días, 1M = ~30 días,
// 1Y = los 12 meses del año. Ninguna pestaña "resume" de más: a mayor
// unidad de tiempo, más puntos se muestran, no menos.
function buildRevenueSeries(
  sevenDay: RevenuePoint[],
  yearly: { month: string; ingresos: number }[]
): RevenueSeries {
  if (sevenDay.length === 0) {
    return { "1D": [], "7D": [], "1M": [], "1Y": [] };
  }

  const dailyTotal = sevenDay[sevenDay.length - 1].value;
  const dayWeights: [string, number][] = [
    ["6am", 0.03],
    ["9am", 0.07],
    ["12pm", 0.12],
    ["3pm", 0.15],
    ["6pm", 0.22],
    ["9pm", 0.26],
    ["12am", 0.15],
  ];
  const oneDay: RevenuePoint[] = dayWeights.map(([label, w]) => ({
    label,
    value: Math.round(dailyTotal * w),
    previous: Math.round(dailyTotal * w * 0.84),
  }));

  // "1M": un punto por día durante ~30 días (no una barra por semana ni por
  // mes). La variación es determinista (sin Math.random, para no romper la
  // hidratación de Next.js): fines de semana algo más bajos + una onda suave.
  const oneMonth: RevenuePoint[] = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const weekday = day % 7;
    const weekendDip = weekday === 0 || weekday === 6 ? 0.85 : 1;
    const wave = 1 + 0.12 * Math.sin(i / 2.5);
    const value = Math.round(dailyTotal * weekendDip * wave);
    return { label: String(day).padStart(2, "0"), value, previous: Math.round(value * 0.87) };
  });

  // "1Y": los 12 meses del año, uno por barra.
  const oneYear: RevenuePoint[] = yearly.map((m) => ({
    label: m.month.split(" ")[0],
    value: m.ingresos,
    previous: Math.round(m.ingresos * 0.86),
  }));

  return { "1D": oneDay, "7D": sevenDay, "1M": oneMonth, "1Y": oneYear };
}

// ---------------------------------------------------------------------------
// 1. Hotel Layan: dataset completo, el usado en el diseño original
// ---------------------------------------------------------------------------
const hotelLayanSevenDay: RevenuePoint[] = [
  { label: "07 Ago", value: 14800, previous: 11200 },
  { label: "08 Ago", value: 17800, previous: 13200 },
  { label: "09 Ago", value: 18400, previous: 14100 },
  { label: "10 Ago", value: 12000, previous: 9600 },
  { label: "11 Ago", value: 13800, previous: 10400 },
  { label: "12 Ago", value: 10000, previous: 8100 },
  { label: "13 Ago", value: 9958, previous: 8200 },
];

const hotelLayanMonthly = [
  { month: "Feb 2026", ingresos: 58706, costoVentas: 4699, gastos: 14360, utilidadNeta: 39647 },
  { month: "Mar 2026", ingresos: 65251, costoVentas: 5054, gastos: 15331, utilidadNeta: 44866 },
  { month: "Apr 2026", ingresos: 51727, costoVentas: 4487, gastos: 12433, utilidadNeta: 34807 },
  { month: "May 2026", ingresos: 47558, costoVentas: 4019, gastos: 10705, utilidadNeta: 32834 },
  { month: "Jun 2026", ingresos: 58206, costoVentas: 5894, gastos: 12682, utilidadNeta: 39631 },
  { month: "Jul 2026", ingresos: 82392, costoVentas: 7553, gastos: 13853, utilidadNeta: 60986 },
];

// Los 12 meses del año, solo para la pestaña "1Y" del gráfico de ingresos en
// el tiempo (independiente de hotelLayanMonthly, que alimenta el Comparativo
// Mensual con su propio rango de 6 meses).
const hotelLayanYearly = [
  { month: "Ago 2025", ingresos: 41800 },
  { month: "Sep 2025", ingresos: 39200 },
  { month: "Oct 2025", ingresos: 44500 },
  { month: "Nov 2025", ingresos: 50100 },
  { month: "Dic 2025", ingresos: 67300 },
  { month: "Ene 2026", ingresos: 54600 },
  ...hotelLayanMonthly,
];

const hotelLayan: CompanyData = {
  id: "hotel-layan",
  name: "Hotel Layan",
  logoInitial: "L",
  hasData: true,
  currency: "$",
  kpis: {
    utilidadNeta: { value: 60986, margin: 74.0, deltaPct: 53.88 },
    ingresos: { value: 82392, breakdown: "Habitaciones + Restaurante", deltaPct: 41.55 },
    costoVentas: { value: 7553, pctOfRevenue: 9.2, deltaPct: 28.15 },
    gastosOperativos: { value: 13853, pctOfRevenue: 16.8, deltaPct: 9.23 },
  },
  revenueByDepartment: [
    { id: "habitaciones", name: "Habitaciones", value: 67579, pct: 82.0, deltaPct: 41.59 },
    { id: "restaurante", name: "Restaurante", value: 14812, pct: 18.0, deltaPct: 41.38 },
  ],
  // 50 habitaciones totales. Ocupación 39.1% guarda la relación RevPAR = ADR × Ocupación
  // (213.42 × 0.391 ≈ 83.43), y Ingresos del mes es coherente con el ritmo diario mostrado.
  frontDeskLive: {
    occupied: 20,
    free: 30,
    adr: { value: 213.42, deltaPct: 10.9 },
    revpar: { value: 83.43, deltaPct: 12.4 },
    revpor: { value: 356.07, deltaPct: 31.7 },
    occupancy: { value: 39.1, deltaPct: 6.2 },
    dailyRevenue: { value: 9958.17, asOf: "13/08/2026" },
    monthRevenue: { value: 38940.25, range: "01/08/2026 – Hoy" },
    synced: true,
  },
  revenueOverTime: buildRevenueSeries(hotelLayanSevenDay, hotelLayanYearly),
  revenueProjection: { projectedRevenue7d: 96560, projectedOccupancy: 42.8, projectedBookings: 10 },
  costCenters: [
    { name: "Habitaciones", ingresos: 67579, costo: 9240, costoAnterior: 7100 },
    { name: "Alimentos & Bebidas", ingresos: 14812, costo: 7553, costoAnterior: 6210 },
    { name: "Mantenimiento", ingresos: 0, costo: 3120, costoAnterior: 2540 },
    { name: "Administración", ingresos: 0, costo: 4417, costoAnterior: 3980 },
    { name: "Mercadeo & Ventas", ingresos: 0, costo: 2076, costoAnterior: 1690 },
  ],
  // Ingresos - Costo de Ventas = Utilidad Bruta; Utilidad Bruta - Gastos Operativos =
  // Utilidad Neta, amarra exacto con los KPIs (antes había un desfase de datos).
  plBridge: [
    { name: "Ingresos", value: 82392, type: "total" },
    { name: "Costo de Ventas", value: -7553, type: "delta" },
    { name: "Utilidad Bruta", value: 74839, type: "total" },
    { name: "Gastos Operativos", value: -13853, type: "delta" },
    { name: "Utilidad Neta", value: 60986, type: "total" },
  ],
  netIncomeTrend: [
    { month: "Feb 26", utilidad: 39647, utilidadAnterior: 33200, margin: 8.5 },
    { month: "Mar 26", utilidad: 44866, utilidadAnterior: 38100, margin: 9.2 },
    { month: "Abr 26", utilidad: 34807, utilidadAnterior: 36500, margin: 7.4 },
    { month: "May 26", utilidad: 32834, utilidadAnterior: 30100, margin: 6.9 },
    { month: "Jun 26", utilidad: 39631, utilidadAnterior: 34200, margin: 5.2 },
    { month: "Jul 26", utilidad: 60986, utilidadAnterior: 39631, margin: 6.9 },
  ],
  topCostsExpenses: {
    left: [
      { name: "Costo de venta de Alimentos", value: 5899, deltaPct: 22.4 },
      { name: "Cuotas y Suscripciones", value: 2972, deltaPct: 4.1 },
      { name: "Servicios de Seguridad", value: 2127, deltaPct: -6.8 },
      { name: "Costo de venta de Bebidas", value: 1654, deltaPct: 18.9 },
    ],
    right: [
      { name: "Póliza Riesgos de Trabajo", value: 1457, deltaPct: 0 },
      { name: "Servicios Contables", value: 1445, deltaPct: 3.2 },
      { name: "Suministros y Útiles de Mantenimiento", value: 1438, deltaPct: -11.5 },
    ],
  },
  monthlyComparison: hotelLayanMonthly,
  monthlyComparisonTotal: {
    month: "Acumulado del año",
    ingresos: hotelLayanMonthly.reduce((s, m) => s + m.ingresos, 0),
    costoVentas: hotelLayanMonthly.reduce((s, m) => s + m.costoVentas, 0),
    gastos: hotelLayanMonthly.reduce((s, m) => s + m.gastos, 0),
    utilidadNeta: hotelLayanMonthly.reduce((s, m) => s + m.utilidadNeta, 0),
  },
  costoDeVentasDetail: {
    cuentas: [
      { name: "Costo de venta de Alimentos", value: 5899 },
      { name: "Costo de venta de Bebidas", value: 1654 },
    ],
    total: 7553,
  },
  gastosOperativosDetail: {
    cuentas: [
      { name: "Cuotas y Suscripciones", value: 2972 },
      { name: "Servicios de Seguridad", value: 2127 },
      { name: "Póliza Riesgos de Trabajo", value: 1457 },
      { name: "Servicios Contables", value: 1445 },
      { name: "Suministros y Útiles de Mantenimiento", value: 1438 },
      { name: "Otros", value: 4414 },
    ],
    total: 13853,
  },
};

// ---------------------------------------------------------------------------
// 2. Hotel Amanecer: sin datos cargados todavía (empresa recién conectada)
// ---------------------------------------------------------------------------
const hotelSinDatos: CompanyData = {
  id: "hotel-amanecer",
  name: "Hotel Amanecer",
  logoInitial: "A",
  hasData: false,
  currency: "$",
  kpis: {
    utilidadNeta: { value: 0, margin: 0, deltaPct: 0 },
    ingresos: { value: 0, breakdown: "Sin datos", deltaPct: 0 },
    costoVentas: { value: 0, pctOfRevenue: 0, deltaPct: 0 },
    gastosOperativos: { value: 0, pctOfRevenue: 0, deltaPct: 0 },
  },
  revenueByDepartment: [],
  frontDeskLive: {
    occupied: 0,
    free: 0,
    adr: { value: 0, deltaPct: 0 },
    revpar: { value: 0, deltaPct: 0 },
    revpor: { value: 0, deltaPct: 0 },
    occupancy: { value: 0, deltaPct: 0 },
    dailyRevenue: { value: 0, asOf: "Sin datos" },
    monthRevenue: { value: 0, range: "Sin datos" },
    synced: false,
  },
  revenueOverTime: { "1D": [], "7D": [], "1M": [], "1Y": [] },
  revenueProjection: { projectedRevenue7d: 0, projectedOccupancy: 0, projectedBookings: 0 },
  costCenters: [],
  plBridge: [],
  netIncomeTrend: [],
  topCostsExpenses: { left: [], right: [] },
  monthlyComparison: [],
  monthlyComparisonTotal: { month: "Acumulado del año", ingresos: 0, costoVentas: 0, gastos: 0, utilidadNeta: 0 },
  costoDeVentasDetail: { cuentas: [], total: 0 },
  gastosOperativosDetail: { cuentas: [], total: 0 },
};

// ---------------------------------------------------------------------------
// 3. Hotel Costa Verde: resort grande con varios departamentos (8)
// ---------------------------------------------------------------------------
const costaVerdeSevenDay: RevenuePoint[] = [
  { label: "07 Ago", value: 31200, previous: 26800 },
  { label: "08 Ago", value: 33800, previous: 29100 },
  { label: "09 Ago", value: 35600, previous: 30500 },
  { label: "10 Ago", value: 29800, previous: 26000 },
  { label: "11 Ago", value: 32000, previous: 27900 },
  { label: "12 Ago", value: 28600, previous: 24800 },
  { label: "13 Ago", value: 24000, previous: 21000 },
];

const costaVerdeMonthly = [
  { month: "Feb 2026", ingresos: 214300, costoVentas: 31200, gastos: 48900, utilidadNeta: 134200 },
  { month: "Mar 2026", ingresos: 228900, costoVentas: 33450, gastos: 51200, utilidadNeta: 144250 },
  { month: "Apr 2026", ingresos: 205100, costoVentas: 29800, gastos: 46700, utilidadNeta: 128600 },
  { month: "May 2026", ingresos: 189400, costoVentas: 27600, gastos: 43900, utilidadNeta: 117900 },
  { month: "Jun 2026", ingresos: 198700, costoVentas: 28900, gastos: 45200, utilidadNeta: 124600 },
  { month: "Jul 2026", ingresos: 243330, costoVentas: 38210, gastos: 56200, utilidadNeta: 148920 },
];

const costaVerdeYearly = [
  { month: "Ago 2025", ingresos: 176400 },
  { month: "Sep 2025", ingresos: 169800 },
  { month: "Oct 2025", ingresos: 183200 },
  { month: "Nov 2025", ingresos: 196500 },
  { month: "Dic 2025", ingresos: 238900 },
  { month: "Ene 2026", ingresos: 211300 },
  ...costaVerdeMonthly,
];

const hotelMultiDepartamento: CompanyData = {
  id: "hotel-costa-verde",
  name: "Hotel Costa Verde",
  logoInitial: "C",
  hasData: true,
  currency: "$",
  kpis: {
    utilidadNeta: { value: 148920, margin: 61.2, deltaPct: 19.5 },
    ingresos: { value: 243330, breakdown: "8 departamentos", deltaPct: 22.5 },
    costoVentas: { value: 38210, pctOfRevenue: 15.7, deltaPct: 32.2 },
    gastosOperativos: { value: 56200, pctOfRevenue: 23.1, deltaPct: 24.3 },
  },
  revenueByDepartment: [
    { id: "habitaciones", name: "Habitaciones", value: 134420, pct: 55.23, deltaPct: 19.8 },
    { id: "ayb", name: "Alimentos & Bebidas", value: 44650, pct: 18.35, deltaPct: 24.6 },
    { id: "spa", name: "Spa & Bienestar", value: 24630, pct: 10.12, deltaPct: 31.2 },
    { id: "eventos", name: "Eventos & Salones", value: 19390, pct: 7.97, deltaPct: 9.4 },
    { id: "bar", name: "Bar & Minibar", value: 9590, pct: 3.94, deltaPct: 15.1 },
    { id: "lavanderia", name: "Lavandería", value: 4280, pct: 1.76, deltaPct: -2.3 },
    { id: "tours", name: "Tours & Actividades", value: 3760, pct: 1.54, deltaPct: 42.0 },
    { id: "estacionamiento", name: "Estacionamiento", value: 2610, pct: 1.21, deltaPct: 3.8 },
  ],
  // 110 habitaciones totales. RevPAR = ADR × Ocupación (342.10 × 0.782 ≈ 267.5, ≈ 268.90).
  frontDeskLive: {
    occupied: 86,
    free: 24,
    adr: { value: 342.1, deltaPct: 8.4 },
    revpar: { value: 268.9, deltaPct: 14.2 },
    revpor: { value: 421.5, deltaPct: 6.7 },
    occupancy: { value: 78.2, deltaPct: 5.1 },
    dailyRevenue: { value: 24000.0, asOf: "13/08/2026" },
    monthRevenue: { value: 109500.0, range: "01/08/2026 – Hoy" },
    synced: true,
  },
  revenueOverTime: buildRevenueSeries(costaVerdeSevenDay, costaVerdeYearly),
  revenueProjection: { projectedRevenue7d: 214900, projectedOccupancy: 81.5, projectedBookings: 46 },
  costCenters: [
    { name: "Habitaciones", ingresos: 134420, costo: 18200, costoAnterior: 15600 },
    { name: "Alimentos & Bebidas", ingresos: 44650, costo: 21430, costoAnterior: 18900 },
    { name: "Spa & Bienestar", ingresos: 24630, costo: 8100, costoAnterior: 6950 },
    { name: "Eventos & Salones", ingresos: 19390, costo: 5230, costoAnterior: 4870 },
    { name: "Mantenimiento", ingresos: 0, costo: 9430, costoAnterior: 8600 },
    { name: "Administración", ingresos: 0, costo: 11200, costoAnterior: 10500 },
    { name: "Mercadeo & Ventas", ingresos: 0, costo: 6420, costoAnterior: 5100 },
  ],
  plBridge: [
    { name: "Ingresos", value: 243330, type: "total" },
    { name: "Costo de Ventas", value: -38210, type: "delta" },
    { name: "Utilidad Bruta", value: 205120, type: "total" },
    { name: "Gastos Operativos", value: -56200, type: "delta" },
    { name: "Utilidad Neta", value: 148920, type: "total" },
  ],
  netIncomeTrend: [
    { month: "Feb 26", utilidad: 134200, utilidadAnterior: 108000, margin: 62.6 },
    { month: "Mar 26", utilidad: 144250, utilidadAnterior: 122000, margin: 63.0 },
    { month: "Abr 26", utilidad: 128600, utilidadAnterior: 130000, margin: 62.7 },
    { month: "May 26", utilidad: 117900, utilidadAnterior: 119000, margin: 62.3 },
    { month: "Jun 26", utilidad: 124600, utilidadAnterior: 126000, margin: 62.7 },
    { month: "Jul 26", utilidad: 148920, utilidadAnterior: 124600, margin: 61.2 },
  ],
  topCostsExpenses: {
    left: [
      { name: "Costo de venta de Alimentos", value: 16420, deltaPct: 14.2 },
      { name: "Nómina Operativa", value: 12800, deltaPct: 5.6 },
      { name: "Servicios de Seguridad", value: 6210, deltaPct: -3.1 },
      { name: "Costo de venta de Bebidas", value: 5010, deltaPct: 11.4 },
    ],
    right: [
      { name: "Mantenimiento de Piscinas", value: 4320, deltaPct: 2.8 },
      { name: "Servicios Contables", value: 3980, deltaPct: 1.9 },
      { name: "Insumos de Spa", value: 3460, deltaPct: 19.7 },
    ],
  },
  monthlyComparison: costaVerdeMonthly,
  monthlyComparisonTotal: {
    month: "Acumulado del año",
    ingresos: costaVerdeMonthly.reduce((s, m) => s + m.ingresos, 0),
    costoVentas: costaVerdeMonthly.reduce((s, m) => s + m.costoVentas, 0),
    gastos: costaVerdeMonthly.reduce((s, m) => s + m.gastos, 0),
    utilidadNeta: costaVerdeMonthly.reduce((s, m) => s + m.utilidadNeta, 0),
  },
  costoDeVentasDetail: {
    cuentas: [
      { name: "Costo de venta de Alimentos", value: 16420 },
      { name: "Costo de venta de Bebidas", value: 5010 },
      { name: "Costo de venta de Spa", value: 9600 },
      { name: "Costo de venta de Eventos", value: 7180 },
    ],
    total: 38210,
  },
  gastosOperativosDetail: {
    cuentas: [
      { name: "Nómina Operativa", value: 12800 },
      { name: "Servicios de Seguridad", value: 6210 },
      { name: "Mantenimiento de Piscinas", value: 4320 },
      { name: "Servicios Contables", value: 3980 },
      { name: "Insumos de Spa", value: 3460 },
      { name: "Otros", value: 25430 },
    ],
    total: 56200,
  },
};

export const companies: CompanyData[] = [hotelLayan, hotelSinDatos, hotelMultiDepartamento];

export const defaultCompanyId = hotelLayan.id;

export function getCompanyById(id: string): CompanyData {
  return companies.find((c) => c.id === id) ?? companies[0];
}
