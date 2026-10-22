// Cupos garantizados: cuántas habitaciones de un tipo se guardan cada día para una tarifa (y su contrato).
// Se guardan en el mapa del tarifario con la vista «Cupos» (`${tipo}|${tarifa}|${dia}|Cupos` → número).
import { clave, sumar, type Mapa } from './tarifario';

export interface TramoCupos { tipo: string; tarifa: string; desde: string; hasta: string; cupos: number; dias: number }

const SUFIJO = '|Cupos';

/** Cupos guardados un día (0 si no hay). */
export const cuposDe = (mapa: Mapa, tipo: string, tarifa: string, dia: string) => {
  const v = mapa[clave(tipo, tarifa, dia, 'Cupos')];
  return typeof v === 'number' ? v : 0;
};

/** Agrupa los días con cupos en tramos continuos (mismo tipo, tarifa y cantidad en días seguidos). */
export function tramosCupos(mapa: Mapa, filtro: { tarifas?: string[]; desde?: string } = {}): TramoCupos[] {
  const porClave = new Map<string, { dia: string; n: number }[]>();
  for (const [k, v] of Object.entries(mapa)) {
    if (!k.endsWith(SUFIJO) || typeof v !== 'number' || v <= 0) continue;
    const [tipo, tarifa, dia] = k.split('|');
    if (filtro.tarifas && !filtro.tarifas.includes(tarifa)) continue;
    if (filtro.desde && dia < filtro.desde) continue;
    const g = `${tipo}|${tarifa}`;
    if (!porClave.has(g)) porClave.set(g, []);
    porClave.get(g)!.push({ dia, n: v });
  }
  const out: TramoCupos[] = [];
  for (const [g, dias] of porClave) {
    const [tipo, tarifa] = g.split('|');
    dias.sort((a, b) => a.dia.localeCompare(b.dia));
    let actual: TramoCupos | null = null;
    for (const { dia, n } of dias) {
      if (actual && actual.cupos === n && sumar(actual.hasta, 1) === dia) { actual.hasta = dia; actual.dias++; continue; }
      if (actual) out.push(actual);
      actual = { tipo, tarifa, desde: dia, hasta: dia, cupos: n, dias: 1 };
    }
    if (actual) out.push(actual);
  }
  return out.sort((a, b) => a.desde.localeCompare(b.desde) || a.tarifa.localeCompare(b.tarifa) || a.tipo.localeCompare(b.tipo));
}

/** Cambios para fijar `n` cupos en esos tipos, tarifas y días (0 quita el cupo). Devuelve el mapa nuevo. */
export function fijarCupos(mapa: Mapa, tipos: string[], tarifas: string[], fechas: string[], n: number): Mapa {
  const m = { ...mapa };
  for (const d of fechas) for (const tp of tipos) for (const ta of tarifas) {
    const k = clave(tp, ta, d, 'Cupos');
    if (n > 0) m[k] = n; else delete m[k];
  }
  return m;
}

/** Días de un tramo (desde–hasta, todos los días). */
export function diasDe(desde: string, hasta: string): string[] {
  const out: string[] = [];
  for (let d = desde; d <= hasta && out.length < 1000; d = sumar(d, 1)) out.push(d);
  return out;
}
