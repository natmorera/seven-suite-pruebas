// Libro mayor a partir de los asientos guardados: movimientos por cuenta y
// saldos (inicial, debe, haber, final). Lo usan el Analítico de cuentas, el
// Balance de comprobación y los estados financieros.
import type { Client } from '@libsql/client';
import { leerAsientos, type AsientoDb } from '@/lib/asientosDb';
import { leerCatalogo } from '@/lib/catalogoCuentas';
import type { Cuenta } from '@/components/pages/catalogo/catalogoData';

export interface MovimientoMayor {
  id: number; asientoId: number; tipo: string; fecha: string; consecutivo: string; descripcion: string;
  estado: 'Contabilizado' | 'Pendiente' | 'Anulado'; idAuxiliar: string; modulo: string; documento: string; moneda: string;
  debe: number; haber: number; cuentaCode: string; cCostos?: string; observacion?: string; archivos?: string[];
  historial?: AsientoDb['historial']; conciliacion?: AsientoDb['conciliacion'];
}

export async function movimientosMayor(db: Client): Promise<MovimientoMayor[]> {
  const [activos, anulados] = await Promise.all([leerAsientos(db), leerAsientos(db, { anulados: true })]);
  const out: MovimientoMayor[] = [];
  for (const [lista, anulado] of [[activos, false], [anulados, true]] as const) {
    for (const a of lista) {
      a.lineas.forEach((l, i) => {
        const partes = l.cuenta.split('-');
        out.push({
          id: a.id * 1000 + i, asientoId: a.id, tipo: ['A', 'M', 'I', 'D'].includes(a.tipo) ? a.tipo : 'M', fecha: a.fecha, consecutivo: a.consecutivo,
          descripcion: l.descripcion || a.titulo, estado: anulado ? 'Anulado' : a.contabilizado ? 'Contabilizado' : 'Pendiente',
          idAuxiliar: partes.length > 3 ? partes.slice(3).join('-') : '', modulo: a.origen || 'Accounting', documento: a.documento, moneda: a.moneda,
          debe: l.debe, haber: l.haber, cuentaCode: l.cuenta, cCostos: l.cCostos, observacion: a.observacion, archivos: a.archivos, historial: a.historial, conciliacion: a.conciliacion,
        });
      });
    }
  }
  return out;
}

export interface CuentaMayor { code: string; nombre: string; nivel: string; grupo: string; naturaleza: string; moneda: string; saldoInicial: number; padre: string | null; posteable: boolean; subgrupo?: string }

// Cuentas del catálogo (más las auxiliares que aparecen en asientos y no están)
export async function cuentasMayor(db: Client, movs?: MovimientoMayor[]): Promise<CuentaMayor[]> {
  const catalogo = await leerCatalogo(db);
  // La jerarquía sale del anidamiento del árbol. El saldo inicial se toma solo
  // de las cuentas hoja; las superiores lo suman de sus hijas.
  const cuentas: CuentaMayor[] = [];
  const NIVELES_CUENTA = new Set(['mayor', 'submajor', 'detalle', 'auxiliar']);
  // subgrupo del catálogo (1.1 activo corriente, 1.2 no corriente, …): lo usa Situación financiera
  const recorrer = (nodos: Cuenta[], padre: string | null, subgrupo = '') => {
    for (const c of nodos) {
      const sg = c.nivel === 'subgrupo' ? c.code : subgrupo;
      const esCuenta = NIVELES_CUENTA.has(c.nivel) && !c.inactiva;
      if (esCuenta) cuentas.push({
        code: c.code, nombre: c.nombre, nivel: c.nivel, grupo: c.grupo, naturaleza: c.naturaleza, moneda: c.moneda ?? 'CRC',
        saldoInicial: c.children?.length ? 0 : Number(c.saldo ?? 0), padre, posteable: Boolean(c.posteable), subgrupo: sg,
      });
      if (c.children?.length) recorrer(c.children, esCuenta ? c.code : padre, sg);
    }
  };
  recorrer(catalogo, null);
  const conocidas = new Set(cuentas.map(c => c.code));
  const { rows: terceros } = await db.execute(`SELECT nombre, cuenta_contable FROM clientes WHERE COALESCE(cuenta_contable, '') <> ''`).catch(() => ({ rows: [] as Record<string, unknown>[] }));
  const nombreTercero = new Map(terceros.map(t => [String(t.cuenta_contable), String(t.nombre)]));
  for (const m of movs ?? await movimientosMayor(db)) {
    if (conocidas.has(m.cuentaCode)) continue;
    conocidas.add(m.cuentaCode);
    const padre = m.cuentaCode.split('-').slice(0, 3).join('-');
    const p = cuentas.find(c => c.code === padre);
    cuentas.push({ code: m.cuentaCode, nombre: nombreTercero.get(m.cuentaCode) ?? m.cuentaCode, nivel: p ? 'auxiliar' : 'detalle', grupo: p?.grupo ?? m.cuentaCode.charAt(0),
      naturaleza: p?.naturaleza ?? 'Deudora', moneda: 'CRC', saldoInicial: 0, padre: p ? padre : null, posteable: true });
  }
  return cuentas;
}

export interface SaldoCuenta extends CuentaMayor { saldoIni: number; debe: number; haber: number; saldoFin: number }

// Saldos por cuenta en un período. Solo asientos contabilizados. Las cuentas
// no posteables suman a sus hijas. Saldo deudor positivo para las de
// naturaleza deudora y acreedor positivo para las acreedoras.
// cc: solo los movimientos de ese centro de costo (vacío = todos)
export async function saldosMayor(db: Client, desde: string, hasta: string, incluirPendientes = false, cc = ''): Promise<SaldoCuenta[]> {
  const movs = (await movimientosMayor(db)).filter(m => (m.estado === 'Contabilizado' || (incluirPendientes && m.estado === 'Pendiente')) && (!cc || (m.cCostos ?? '') === cc));
  const cuentas = await cuentasMayor(db, movs);
  const propio = new Map<string, { ini: number; debe: number; haber: number }>();
  for (const m of movs) {
    const t = propio.get(m.cuentaCode) ?? { ini: 0, debe: 0, haber: 0 };
    if (desde && m.fecha < desde) t.ini += m.debe - m.haber;
    else if (!hasta || m.fecha <= hasta) { t.debe += m.debe; t.haber += m.haber; }
    propio.set(m.cuentaCode, t);
  }
  const hijos = new Map<string, string[]>();
  for (const c of cuentas) if (c.padre) hijos.set(c.padre, [...(hijos.get(c.padre) ?? []), c.code]);
  const memo = new Map<string, { ini: number; debe: number; haber: number }>();
  const total = (code: string): { ini: number; debe: number; haber: number } => {
    if (memo.has(code)) return memo.get(code)!;
    const c = cuentas.find(x => x.code === code);
    const base = propio.get(code) ?? { ini: 0, debe: 0, haber: 0 };
    const r = { ini: base.ini + (c ? (c.naturaleza === 'Acreedora' ? -c.saldoInicial : c.saldoInicial) : 0), debe: base.debe, haber: base.haber };
    for (const h of hijos.get(code) ?? []) { const t = total(h); r.ini += t.ini; r.debe += t.debe; r.haber += t.haber; }
    memo.set(code, r);
    return r;
  };
  return cuentas.map(c => {
    const t = total(c.code);
    const signo = c.naturaleza === 'Acreedora' ? -1 : 1;
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const saldoIni = r2(t.ini * signo);
    return { ...c, saldoIni, debe: r2(t.debe), haber: r2(t.haber), saldoFin: r2((t.ini + t.debe - t.haber) * signo) };
  });
}
