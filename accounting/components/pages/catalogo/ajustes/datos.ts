import { FONT } from '../../../ui/tokens';
import { flattenAll } from '../datos/arbol';
import { EnlaceAjuste } from '../datos/ajustes';
import { CUENTAS_INIT } from '../datos/cuentasIniciales';

export const F = FONT;
export const BRAND = '#A77600';
// ── Grupo de patrimonio ───────────────────────────────────────────────────────
// Issue #6: no export button here

export interface GP { id:string; codigo:string; desc:string; alt:string; activo:boolean; }
export const GP_I: GP[] = [
  {id:'p1',codigo:'001',desc:'Capital social',alt:'Capital Stock',activo:true},
  {id:'p2',codigo:'002',desc:'Reserva legal',alt:'Legal Reserve',activo:true},
  {id:'p3',codigo:'003',desc:'Aporte de socios',alt:'Share capital',activo:true},
  {id:'p4',codigo:'004',desc:'Resultados del período',alt:'Income statement period',activo:true},
  {id:'p5',codigo:'005',desc:'Utilidades acumuladas',alt:'Accumulated profit',activo:true},
];
// ── Movimientos de ajuste ─────────────────────────────────────────────────────
// Enlace de movimiento de ajuste (usado en la línea de ajuste de Cobros, Pagos,
// Depósitos, Transferencias, Gestión de tarjetas y Cheques): a qué cuenta
// contable afecta cada tipo de movimiento, y a qué operaciones bancarias
// aplica. El "Tipo de movimiento" lo escribe la persona que lo crea (no es una
// lista fija) - "Nota administrativa" es la única excepción: no se crea acá
// porque siempre usa la cuenta del cliente/proveedor de la operación.
export const CUENTAS_DETALLE = flattenAll(CUENTAS_INIT).filter(c => c.nivel === 'detalle' || c.nivel === 'auxiliar');
export const BLANK_EA = (): EnlaceAjuste => ({ id:`ea${Date.now()}`, tipoMovimiento:'', aplicaA:[], cuentaCode:undefined, cuentaNombre:undefined, signo:-1, activo:true, porcentaje:undefined });
