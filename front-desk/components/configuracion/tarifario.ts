// Lógica del Tarifario (Configuración → Tarifas / Contratos → Tarifario):
// valor efectivo de cada celda, claves de excepciones por día y pax adicionales
// por escalón. La usan la grilla y la Actualización masiva.
import type { Tarifa, VistaTarifario } from './datos';

export const fecha = (iso: string) => new Date(iso + 'T12:00:00');
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const sumar = (s: string, n: number) => { const d = fecha(s); d.setDate(d.getDate() + n); return iso(d); };
/** Índice en DIAS (Lun = 0) */
export const dow = (s: string) => (fecha(s).getDay() + 6) % 7;
export const BOOL: string[] = ['Cerrar ventas', 'CTA', 'CTD'];
export const r2 = (n: number) => Math.round(n * 100) / 100;

/** Vista de la grilla: las del diseño más «Adulto Extra · Pax 2», «Niño Extra · Pax 3»… para los escalones. */
export type Vista = VistaTarifario | `${'Adulto' | 'Niño'} Extra · Pax ${number}`;
export const vistaPax = (cual: 'adulto' | 'nino', n: number): Vista => (n <= 1 ? (cual === 'adulto' ? 'Adulto Extra' : 'Niño Extra') : `${cual === 'adulto' ? 'Adulto' : 'Niño'} Extra · Pax ${n}`);
const paxDeVista = (v: string): { cual: 'adulto' | 'nino'; n: number } | null => {
  if (!v.startsWith('Adulto Extra') && !v.startsWith('Niño Extra')) return null;
  const m = v.match(/Pax (\d+)$/);
  return { cual: v.startsWith('Adulto') ? 'adulto' : 'nino', n: m ? Number(m[1]) : 1 };
};

export type Mapa = Record<string, number | boolean>;
export const clave = (tipo: string, tarifa: string, dia: string, vista: Vista) => `${tipo}|${tarifa}|${dia}|${vista}`;

/** Precio del pax adicional `n` según la configuración de la tarifa (sin excepciones por día). */
export function paxDeTarifa(t: Tarifa, cual: 'adulto' | 'nino', n: number) {
  if (t.extras.modo === 'escalones' && t.extras.escalones?.length) {
    const e = t.extras.escalones[Math.min(n, t.extras.escalones.length) - 1];
    return e[cual];
  }
  return t.extras[cual];
}

/** Valor efectivo de una celda: excepción guardada, si no el de la tarifa (o el de su tarifa madre). */
export function valor(t: Tarifa, tipo: string, dia: string, vista: Vista, tarifas: Tarifa[], mapa: Mapa, prof = 0): number | boolean | null {
  const k = mapa[clave(tipo, t.id, dia, vista)];
  if (k !== undefined) return k;
  if (BOOL.includes(vista)) return false;
  if (vista === 'Cupos') return 0;
  if (vista === 'Estancia Min') return t.restricciones.estMin;
  if (vista === 'Estancia Max') return t.restricciones.estMax;
  const madre = t.derivaDe && prof < 5 ? tarifas.find(x => x.id === t.derivaDe) : undefined;
  if (vista === 'Tarifas') {
    if (!madre) return t.base[tipo] ?? null;
    const p = valor(madre, tipo, dia, vista, tarifas, mapa, prof + 1);
    if (typeof p !== 'number') return null;
    return r2(t.metodo === 'Porcentaje' ? p * (1 + t.ajustePct / 100) + t.ajusteImporte : p + t.ajusteImporte);
  }
  const pax = paxDeVista(vista);
  if (!pax) return null;
  if (madre && t.extras.derivar) {
    const p = valor(madre, tipo, dia, vista, tarifas, mapa, prof + 1);
    if (typeof p !== 'number') return paxDeTarifa(t, pax.cual, pax.n);
    return r2(t.extras.tipo === 'Porcentaje' ? p * (1 + t.extras.pct / 100) : p + t.extras.importe);
  }
  return paxDeTarifa(t, pax.cual, pax.n);
}

/** Cantidad de pax adicionales que admite un tipo (máximo − incluidos en el precio). */
export const adicionalesDe = (tipo: { base?: number; max?: number }) => Math.max(0, (tipo.max ?? 4) - (tipo.base ?? 2));
