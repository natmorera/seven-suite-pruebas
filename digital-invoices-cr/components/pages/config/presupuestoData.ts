import { CUENTAS_INIT, flattenAll } from '../catalogo/catalogoData';

export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const MESES_CORTOS = ['Enero','Feb.','Mar.','Abr.','Mayo','Jun.','Jul.','Ago.','Set.','Oct.','Nov.','Dic.'];

// ── Tipo (Costos/Gastos/Ingresos) ────────────────────────────────────────────
// Filtro de selección múltiple (toggle, resaltado ámbar el activo) - así lo
// pide la spec, aunque en las capturas se veía como radio de selección única.
export type TipoPL = 'costos' | 'gastos' | 'ingresos';
export const TIPOS_PL: { value: TipoPL; label: string }[] = [
  { value:'costos',   label:'Costos' },
  { value:'gastos',   label:'Gastos' },
  { value:'ingresos', label:'Ingresos' },
];

// ── Catálogo real (para derivar tipos de cuenta y filas) ─────────────────────
const TODAS_LAS_CUENTAS = flattenAll(CUENTAS_INIT);
const MAYORES = TODAS_LAS_CUENTAS.filter(c => c.nivel === 'mayor');
const POSTEABLES = TODAS_LAS_CUENTAS.filter(c => c.posteable);
function mayorDeCodigo(codigo: string) { return codigo.split('-')[0]; }
// Mayor 600 = Ingresos, 700 = Costos, 800 = Gastos en el Catálogo real (ver
// catalogoData.ts). El resto de los mayores (activos, pasivo, patrimonio) no
// tienen equivalente en Costos/Gastos/Ingresos - quedan sin "tipo" (tipoPL).
const TIPO_POR_MAYOR: Record<string, TipoPL> = { '600':'ingresos', '700':'costos', '800':'gastos' };

// ── Tipo de cuenta ────────────────────────────────────────────────────────────
export interface TipoDeCuenta { codigo: string; nombre: string; tipo?: TipoPL; cuentas: number; }
export const TIPOS_DE_CUENTA: TipoDeCuenta[] = MAYORES.map(m => ({
  codigo: m.code,
  nombre: m.nombre,
  tipo: TIPO_POR_MAYOR[m.code],
  cuentas: POSTEABLES.filter(p => mayorDeCodigo(p.code) === m.code).length,
})).filter(t => t.cuentas > 0);
// Selección por defecto al abrir la pantalla: solo los mayores presupuestables
// por P&L (Ingresos, Costos, Gastos) - coincide con el espíritu de "3 de 12
// seleccionados" de la captura, adaptado a los mayores reales del catálogo.
export const TIPOS_DE_CUENTA_DEFAULT = new Set(
  TIPOS_DE_CUENTA.filter(t => t.tipo).map(t => t.codigo)
);

// ── Ejercicios ────────────────────────────────────────────────────────────────
export interface EjercicioPresupuesto { value: string; cerrado: boolean; }
export const EJERCICIOS_PRESUPUESTO: EjercicioPresupuesto[] = [
  { value:'2026', cerrado:false },
  { value:'2025', cerrado:true  },
  { value:'2024', cerrado:true  },
];

// ── Filas de presupuesto ──────────────────────────────────────────────────────
export interface PresRow {
  id: string;
  cuenta: string;
  cg: string;              // código del centro de costo (coincide con CentroCosto.codigo)
  descripcion: string;
  tipoCuentaCodigo: string; // referencia a TipoDeCuenta.codigo (mayor real, p.ej. '600')
  tipo: TipoPL;
  centroCostoId: string;
  valores: number[];       // 12 posiciones, Enero..Diciembre
}

// Centro de costo asignado por cuenta, a mano - el catálogo real permite
// asignar varios centros por cuenta (centrosCostoIds) pero para el ejemplo de
// presupuesto alcanza con uno solo por fila, elegido según el nombre de la
// cuenta (hospedaje/restaurante/spa/etc.). Códigos: cc1 Administración,
// cc2 Restaurante, cc3 Spa, cc4 Mantenimiento, cc5 Marina, cc6 Lavandería.
const CENTRO_POR_CUENTA: Record<string, string> = {
  '600-001-0001': 'cc1', // Ingresos hospedaje
  '600-001-0002': 'cc2', // Ingresos restaurante
  '600-001-0003': 'cc3', // Ingresos spa y bienestar
  '600-001-0004': 'cc1', // Ingresos eventos y banquetes
  '600-002-0001': 'cc1', // Descuentos sobre ventas
  '600-003-0001': 'cc1', // Intereses ganados
  '600-003-0002': 'cc1', // Diferencial cambiario favor
  '700-001-0001': 'cc2', // Costo de alimentos y bebidas
  '700-001-0002': 'cc1', // Costo de servicios hoteleros
  '700-001-0003': 'cc3', // Costo de insumos spa
  '700-001-0004': 'cc1', // Otros costos directos
  '800-001-0001': 'cc1', // Sueldos y salarios
  '800-001-0002': 'cc1', // Cargas sociales
  '800-001-0003': 'cc4', // Servicios públicos
  '800-001-0004': 'cc4', // Mantenimiento y reparaciones
  '800-001-0005': 'cc1', // Otros gastos operativos
  '800-002-0001': 'cc1', // Intereses bancarios
  '800-002-0002': 'cc1', // Diferencial cambiario gasto
  '800-003-0001': 'cc1', // Gastos financieros varios
};

import { CENTROS_COSTO_INIT } from '../catalogo/centrosCostoConfig';

// Reparte un total anual en 12 meses con una variación estacional leve, en vez
// de un monto plano - solo para que los datos de ejemplo se vean creíbles.
const ESTACIONALIDAD = [0.90,0.92,0.98,1.00,1.02,1.06,1.10,1.08,0.98,0.92,0.94,1.10];
function distribuirAnual(total: number): number[] {
  const base = total / 12;
  return ESTACIONALIDAD.map(f => Math.round(base * f / 1000) * 1000);
}

// Cuentas presupuestables = auxiliares/postables reales bajo Ingresos (600),
// Costos (700) y Gastos (800) del Catálogo de cuentas.
export const INIT_ROWS: PresRow[] = POSTEABLES
  .filter(p => TIPO_POR_MAYOR[mayorDeCodigo(p.code)])
  .map((p, i) => {
    const centroCostoId = CENTRO_POR_CUENTA[p.code] ?? 'cc1';
    const centroCodigo = CENTROS_COSTO_INIT.find(c => c.id === centroCostoId)?.codigo ?? centroCostoId;
    return {
      id: String(i + 1),
      cuenta: p.code,
      cg: centroCodigo,
      descripcion: p.nombre,
      tipoCuentaCodigo: mayorDeCodigo(p.code),
      tipo: TIPO_POR_MAYOR[mayorDeCodigo(p.code)],
      centroCostoId,
      valores: distribuirAnual(p.saldo || 0),
    };
  });
