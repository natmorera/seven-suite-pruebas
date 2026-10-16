'use client';
// Onboarding de contabilidad: un asistente que se hace una sola vez, antes de
// usar la plataforma, y que no se puede saltar. Cada paso depende del anterior
// y casi todo trae valores por defecto:
//   1. Empresa (identificación; el país define la moneda funcional)
//   2. Nomenclatura del código de cuenta (dígitos por nivel y separador)
//   3. Plan de cuentas (al menos dos cuentas posteables con moneda)
//   4. Ejercicio fiscal (los períodos se generan solos y nacen abiertos)
//   5. Consecutivos de documentos (los mismos de Empresa › Consecutivos)
// La empresa de ejemplo ya está configurada; «Ver onboarding» lo vuelve a pedir.
import { type Cuenta } from '@/components/pages/catalogo/catalogoData';
import { crearAlmacen } from '@/components/pages/empresa/datos/almacen';
import { empresaAlmacen, type DatosEmpresa } from '@/components/pages/empresa/datos/empresa';
import { MONEDAS_CONTABLES, monedaPrimariaDePais } from '@/components/pages/empresa/datos/paises';
import { PASOS_ORDEN, NOMENCLATURA_INICIAL, planBase, recodificar, posteablesConMoneda, type PasoId, type Nomenclatura } from './plan';

export interface DatosOnboarding {
  monedaFuncional: string;                 // moneda primaria
  monedasSecundarias: string[];
  nomenclatura: Nomenclatura | null;
  catalogo: '' | 'base' | 'importar' | 'crear';
  ejercicio: { inicio: string; primerPeriodo: string } | null; // YYYY-MM-01; del mes de inicio al cierre del año
  hechos: PasoId[];
  completado: boolean;
  cuentas: Cuenta[];                       // plan de cuentas armado en el asistente
}
export interface EstadoOnboarding {
  datos: DatosOnboarding;
  empresa: DatosEmpresa;
  cuentasPosteables: number;
  listos: Record<PasoId, boolean>;
  completos: number;
}

const INICIAL: DatosOnboarding = { monedaFuncional: '', monedasSecundarias: [], nomenclatura: null, catalogo: '', ejercicio: null, hechos: [], completado: false, cuentas: [] };

export const onboardingAlmacen = crearAlmacen<DatosOnboarding>({ ...INICIAL, completado: true });

const esMonedaContable = (m: string) => MONEDAS_CONTABLES.some(x => x.value === m);

function nomenclaturaValida(n: unknown): n is Nomenclatura {
  const x = n as Nomenclatura | null;
  const l = x?.longitudes;
  const ent = (v: unknown, a: number, b: number) => Number.isInteger(v) && (v as number) >= a && (v as number) <= b;
  return Boolean(l && x && ent(l.mayor, 1, 6) && ent(l.submajor, 1, 6) && ent(l.detalle, 2, 8) && ['-', '.', ''].includes(x.separador) && ['.', ','].includes(x.decimalSep));
}

export function calcularEstado(datos: DatosOnboarding, empresa: DatosEmpresa): EstadoOnboarding {
  const cuentasPosteables = posteablesConMoneda(datos.cuentas);
  const hecho = (p: PasoId) => datos.hechos.includes(p);
  const listos: Record<PasoId, boolean> = {
    empresa: hecho('empresa') && Boolean(empresa.nombreLegal.trim() && empresa.numeroId.trim() && empresa.pais && empresa.zonaHoraria),
    nomenclatura: hecho('nomenclatura') && nomenclaturaValida(datos.nomenclatura),
    catalogo: hecho('catalogo') && cuentasPosteables >= 2,
    ejercicio: hecho('ejercicio') && Boolean(datos.ejercicio?.inicio),
    consecutivos: hecho('consecutivos'),
  };
  return { datos, empresa, cuentasPosteables, listos, completos: PASOS_ORDEN.filter(p => listos[p]).length };
}

// Vuelve a pedir el onboarding (demostración)
export function reiniciarOnboarding() { onboardingAlmacen.guardar({ ...INICIAL }); }

type Valores = Record<string, unknown>;

// Guarda un paso. Devuelve el error, o null si se guardó.
export function guardarPaso(paso: PasoId | 'completar', v: Valores): string | null {
  const datos: DatosOnboarding = { ...onboardingAlmacen.leer() };
  datos.hechos = [...datos.hechos];
  const marcar = (p: PasoId) => { if (!datos.hechos.includes(p)) datos.hechos.push(p); };
  if (paso === 'empresa') {
    const e = v.empresa as Partial<DatosEmpresa> | undefined;
    if (!e?.nombreLegal?.trim() || !e?.numeroId?.trim() || !e?.pais || !e?.zonaHoraria) return 'Completa nombre legal, identificación, país y zona horaria.';
    empresaAlmacen.guardar(anterior => ({
      ...anterior, nombreLegal: e.nombreLegal!.trim(), nombreComercial: (e.nombreComercial ?? '').trim(), tipoId: e.tipoId ?? '02',
      numeroId: e.numeroId!.trim(), pais: e.pais!, zonaHoraria: e.zonaHoraria!,
      numeroLegalizacion: (e.numeroLegalizacion ?? '').trim(), citasPresentacion: (e.citasPresentacion ?? '').trim(),
    }));
    const primaria = typeof v.monedaPrimaria === 'string' && esMonedaContable(v.monedaPrimaria) ? v.monedaPrimaria : monedaPrimariaDePais(e.pais);
    const secundarias = Array.isArray(v.monedasSecundarias) ? (v.monedasSecundarias as unknown[]).map(String).filter(m => esMonedaContable(m) && m !== primaria) : [];
    datos.monedaFuncional = primaria;
    datos.monedasSecundarias = [...new Set(secundarias)];
    marcar('empresa');
  } else if (paso === 'nomenclatura') {
    const n = v.nomenclatura;
    if (!nomenclaturaValida(n)) return 'Revisa los dígitos de cada nivel.';
    const nueva: Nomenclatura = { longitudes: { ...n.longitudes }, separador: n.separador, decimalSep: n.decimalSep };
    // Si ya hay un plan de cuentas, sus códigos se reescriben con la nueva nomenclatura
    if (datos.hechos.includes('catalogo')) {
      const r = recodificar(datos.cuentas, datos.nomenclatura ?? NOMENCLATURA_INICIAL, nueva);
      if (r.error) return r.error;
      datos.cuentas = r.cuentas;
    }
    datos.nomenclatura = nueva; marcar('nomenclatura');
  } else if (paso === 'catalogo') {
    const modo = v.modo === 'importar' || v.modo === 'crear' ? v.modo : 'base';
    if (modo === 'base') {
      const r = planBase(datos.monedaFuncional || 'CRC', datos.nomenclatura ?? NOMENCLATURA_INICIAL);
      if (r.error) return r.error;
      datos.cuentas = r.cuentas;
    } else {
      const cuentas = v.cuentas as Cuenta[] | undefined;
      if (!Array.isArray(cuentas) || !cuentas.length) return modo === 'importar' ? 'Sube el archivo con tu plan de cuentas.' : 'Agrega las cuentas de tu plan.';
      if (posteablesConMoneda(cuentas) < 2) return 'El plan de cuentas necesita al menos dos cuentas posteables con moneda.';
      datos.cuentas = cuentas;
    }
    datos.catalogo = modo; marcar('catalogo');
  } else if (paso === 'ejercicio') {
    const inicio = String(v.inicio ?? ''); const primerPeriodo = String(v.primerPeriodo ?? inicio);
    if (!/^\d{4}-\d{2}-01$/.test(inicio) || !/^\d{4}-\d{2}-01$/.test(primerPeriodo)) return 'El ejercicio empieza el primer día de un mes.';
    const [a, m] = inicio.split('-').map(Number); const fin = `${a + 1}-${String(m).padStart(2, '0')}-01`;
    if (primerPeriodo < inicio || primerPeriodo >= fin) return 'El primer período debe estar dentro del ejercicio.';
    datos.ejercicio = { inicio, primerPeriodo }; marcar('ejercicio');
  } else if (paso === 'consecutivos') {
    // Los formatos se guardan al editarlos (Empresa › Consecutivos); aquí solo se confirman
    marcar('consecutivos');
  } else {
    if (calcularEstado(datos, empresaAlmacen.leer()).completos < PASOS_ORDEN.length) return 'Faltan pasos por completar.';
    datos.completado = true;
  }
  onboardingAlmacen.guardar(datos);
  return null;
}
