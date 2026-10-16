'use client';
// Filas de los estados financieros calculadas con los asientos contabilizados
// (lib/libroMayor.ts, /api/contabilidad/saldos) en el período elegido en cada estado.
// Mientras cargan, o si todavía no hay movimientos, se muestran los de ejemplo.
import { useEffect, useState } from 'react';

interface Saldo { code: string; nombre: string; nivel: string; grupo: string; naturaleza: string; saldoIni: number; debe: number; haber: number; saldoFin: number; subgrupo?: string }
const PROFUNDIDAD: Record<string, number> = { mayor: 0, submajor: 1, detalle: 2, auxiliar: 3 };

const cache = new Map<string, Promise<Saldo[]>>();
function cargarSaldos(desde: string, hasta: string, cc: string): Promise<Saldo[]> {
  const k = `${desde}|${hasta}|${cc}`;
  if (!cache.has(k)) cache.set(k, fetch(`/api/contabilidad/saldos?desde=${desde}&hasta=${hasta}&cc=${encodeURIComponent(cc)}`).then(r => r.json()).then(d => (Array.isArray(d) ? d : [])).catch(() => { cache.delete(k); return []; }));
  return cache.get(k)!;
}

// Rango de fechas según el filtro de período de cada estado
export function rangoPeriodo(modo: string, anio: string, desde: string, hasta: string): { desde: string; hasta: string } {
  const hoy = new Date().toISOString().slice(0, 10);
  if (modo === 'Rango de fechas' && desde && hasta) return { desde, hasta };
  if (modo === 'Por período' && desde) return { desde: desde.slice(0, 8) + '01', hasta: hasta || desde };
  const fin = `${anio}-12-31`;
  return { desde: `${anio}-01-01`, hasta: fin < hoy ? fin : hoy };
}

type Tipo = 'balance' | 'resultados' | 'situacion';

function convertir(tipo: Tipo, saldos: Saldo[]): unknown[] {
  const conMovimiento = saldos.filter(s => s.nivel in PROFUNDIDAD && (s.saldoIni || s.debe || s.haber || s.saldoFin));
  if (tipo === 'balance') {
    return conMovimiento.filter(s => PROFUNDIDAD[s.nivel] <= 2).map(s => ({
      code: s.code, cg: '', desc: s.nombre, nivel: PROFUNDIDAD[s.nivel] as 0 | 1 | 2,
      saldoIni: s.saldoIni, debe: s.debe, haber: s.haber, saldoMov: Math.round((s.saldoFin - s.saldoIni) * 100) / 100, saldoFin: s.saldoFin, cc: '',
    }));
  }
  if (tipo === 'resultados') {
    return conMovimiento.filter(s => ['4', '5', '6'].includes(s.grupo)).map(s => {
      const signo = s.grupo === '4' ? 1 : -1;   // ingresos suman, costos y gastos restan
      const periodo = s.grupo === '4' ? s.haber - s.debe : s.debe - s.haber;
      return {
        code: s.code, cg: '', desc: s.nombre, nivel: PROFUNDIDAD[s.nivel] as 0 | 1 | 2 | 3,
        periodo: Math.round(periodo * signo * 100) / 100, acumulado: Math.round(s.saldoFin * signo * 100) / 100,
        tipo: s.grupo === '4' ? 'ingreso' : s.grupo === '5' ? 'costo' : 'gasto', cc: '',
      };
    });
  }
  // Resultado del período (ingresos − costos − gastos) dentro del patrimonio, para que cuadre
  const resultado = saldos.filter(s => s.nivel === 'mayor' && ['4', '5', '6'].includes(s.grupo)).reduce((a, s) => a + (s.grupo === '4' ? s.saldoFin : -s.saldoFin), 0);
  const resultadoIni = saldos.filter(s => s.nivel === 'mayor' && ['4', '5', '6'].includes(s.grupo)).reduce((a, s) => a + (s.grupo === '4' ? s.saldoIni : -s.saldoIni), 0);
  const filas = conMovimiento.filter(s => ['1', '2', '3'].includes(s.grupo) && PROFUNDIDAD[s.nivel] <= 2).map(s => ({
    code: s.code, desc: s.nombre, valor: s.saldoFin, valorAnterior: s.saldoIni, nivel: PROFUNDIDAD[s.nivel] as 0 | 1 | 2,
    // Corriente o no corriente según el subgrupo del catálogo (1.1 / 1.2)
    seccion: s.grupo === '2' ? 'pasivo' : s.grupo === '3' ? 'patrimonio' : s.subgrupo === '1.2' ? 'activo_f' : 'activo_c',
  }));
  if (Math.round(resultado) || Math.round(resultadoIni)) filas.push({ code: 'RES', desc: 'Resultado del período', valor: Math.round(resultado * 100) / 100, valorAnterior: Math.round(resultadoIni * 100) / 100, nivel: 0, seccion: 'patrimonio' });
  return filas;
}

// cc: centro de costo elegido ('Todos' = sin filtro). Con datos reales el filtro
// se aplica en el servidor y las filas traen ese centro de costo.
export function useFilasReales<T>(tipo: Tipo, ejemplo: T[], rango: { desde: string; hasta: string }, cc = 'Todos'): { filas: T[]; reales: boolean } {
  const [filas, setFilas] = useState<T[] | null>(null);
  useEffect(() => {
    let vivo = true;
    const filtroCc = cc === 'Todos' ? '' : cc;
    cargarSaldos(rango.desde, rango.hasta, filtroCc).then(s => { if (vivo) { const f = (convertir(tipo, s) as Record<string, unknown>[]).map(r => ('cc' in r || tipo !== 'situacion') ? { ...r, cc } : r) as T[]; setFilas(f.length || filtroCc ? f : null); } });
    return () => { vivo = false; };
  }, [tipo, rango.desde, rango.hasta, cc]);
  return { filas: filas ?? ejemplo, reales: Boolean(filas) };
}
