// Onboarding de contabilidad: un asistente que se hace una sola vez, antes de
// usar la plataforma, y que no se puede saltar. Cada paso depende del anterior
// y casi todo trae valores por defecto:
//   1. Empresa (identificación; el país define la moneda funcional)
//   2. Nomenclatura del código de cuenta (dígitos por nivel y separador)
//   3. Plan de cuentas (al menos dos cuentas posteables con moneda)
//   4. Ejercicio fiscal (los períodos se generan solos y nacen abiertos)
//   5. Consecutivos de documentos (los mismos de Empresa › Consecutivos)
// Sin registro guardado la empresa se considera ya configurada (la empresa de
// demostración); «reiniciar» lo vuelve a pedir.
// Al crear la empresa ya existen la clase de asiento GENERAL y los libros
// GEN/AJU/CIE; no se piden.
import type { Client } from '@libsql/client';
import { leerEmpresa, guardarEmpresa, type DatosEmpresa } from '@/lib/empresa';
import { leerCatalogo, guardarCatalogo } from '@/lib/catalogoCuentas';
import type { Cuenta } from '@/components/pages/catalogo/catalogoData';
import { PASOS_ORDEN, NOMENCLATURA_INICIAL, planBase, recodificar, posteablesConMoneda, type PasoId, type Nomenclatura } from '@/lib/onboardingComun';
import { esMonedaContable, monedaPrimariaDePais } from '@/lib/paises';
import { estadoConfiguracionFE } from '@/lib/configuracionFE';
import { TIPOS_NUMERACION } from '@/data/catalogosHacienda';
export * from '@/lib/onboardingComun';

export interface DatosOnboarding {
  monedaFuncional: string;                 // moneda primaria
  monedasSecundarias: string[];
  nomenclatura: Nomenclatura | null;
  catalogo: '' | 'base' | 'importar' | 'crear' | 'propio';
  ejercicio: { inicio: string; primerPeriodo: string } | null; // YYYY-MM-01; del mes de inicio al cierre del año
  hechos: PasoId[];
  completado: boolean;
}
export interface EstadoOnboarding {
  datos: DatosOnboarding;
  empresa: DatosEmpresa;
  cuentasPosteables: number;
  listos: Record<PasoId, boolean>;
  completos: number;
  facturacion: { actividad: string; ambiente: string; sucursal: string; caja: string };
}

const CLAVE = 'onboarding_contable';
const INICIAL: DatosOnboarding = { monedaFuncional: '', monedasSecundarias: [], nomenclatura: null, catalogo: '', ejercicio: null, hechos: [], completado: false };

async function meta(db: Client, clave: string) {
  const { rows } = await db.execute({ sql: 'SELECT valor FROM app_meta WHERE clave = ?', args: [clave] });
  return rows[0] ? String(rows[0].valor) : null;
}
async function setMeta(db: Client, clave: string, valor: string) {
  await db.execute({ sql: 'INSERT INTO app_meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor', args: [clave, valor] });
}

export function nomenclaturaValida(n: unknown): n is Nomenclatura {
  const x = n as Nomenclatura | null;
  const l = x?.longitudes; const ent = (v: unknown, a: number, b: number) => Number.isInteger(v) && (v as number) >= a && (v as number) <= b;
  return Boolean(l && ent(l.mayor, 1, 6) && ent(l.submajor, 1, 6) && ent(l.detalle, 2, 8) && ['-', '.', ''].includes(x!.separador) && ['.', ','].includes(x!.decimalSep));
}

// El catálogo base con la moneda funcional en las cuentas posteables que no traen moneda
export async function leerDatosOnboarding(db: Client): Promise<DatosOnboarding> {
  const g = await meta(db, CLAVE);
  if (!g) return { ...INICIAL, completado: true };
  try { return { ...INICIAL, ...JSON.parse(g) }; } catch { return { ...INICIAL }; }
}

export async function estadoOnboarding(db: Client): Promise<EstadoOnboarding> {
  const datos = await leerDatosOnboarding(db);
  const { datos: empresa } = await leerEmpresa(db);
  const cuentasPosteables = posteablesConMoneda(await leerCatalogo(db));
  const hecho = (p: PasoId) => datos.hechos.includes(p);
  const listos: Record<PasoId, boolean> = {
    empresa: hecho('empresa') && Boolean(empresa.nombreLegal.trim() && empresa.numeroId.trim() && empresa.pais && empresa.zonaHoraria),
    nomenclatura: hecho('nomenclatura') && nomenclaturaValida(datos.nomenclatura),
    catalogo: hecho('catalogo') && cuentasPosteables >= 2,
    ejercicio: hecho('ejercicio') && Boolean(datos.ejercicio?.inicio),
    consecutivos: hecho('consecutivos'),
    tributaria: false,
    hacienda: false,
  };
  // Facturación electrónica: lo que pide la lista de configuración de Hacienda
  const fe = await estadoConfiguracionFE(db);
  const ok = (id: string) => Boolean(fe.pasos.find(x => x.id === id)?.listo);
  listos.tributaria = hecho('tributaria') && ok('actividad') && ok('ubicacion');
  listos.hacienda = hecho('hacienda') && ok('llave') && ok('credenciales') && ok('sucursal') && ok('caja');
  const { rows } = await db.execute('SELECT actividad_economica, ambiente FROM emisores WHERE activo = 1 ORDER BY id LIMIT 1');
  const { rows: cj } = await db.execute("SELECT sucursal, terminal FROM cajas WHERE COALESCE(activa, 1) = 1 ORDER BY sucursal, terminal LIMIT 1");
  const facturacion = { actividad: String(rows[0]?.actividad_economica ?? ''), ambiente: String(rows[0]?.ambiente ?? 'produccion'),
    sucursal: String(cj[0]?.sucursal ?? '001'), caja: String(cj[0]?.terminal ?? '') };
  return { datos, empresa, cuentasPosteables, listos, completos: PASOS_ORDEN.filter(p => listos[p]).length, facturacion };
}

// Vuelve a pedir el onboarding (demostración)
export async function reiniciarOnboarding(db: Client) {
  await setMeta(db, CLAVE, JSON.stringify(INICIAL));
}

export async function guardarPaso(db: Client, paso: PasoId | 'completar', v: Record<string, unknown>): Promise<string | null> {
  const datos = await leerDatosOnboarding(db);
  const marcar = (p: PasoId) => { if (!datos.hechos.includes(p)) datos.hechos.push(p); };
  if (paso === 'empresa') {
    const e = v.empresa as Partial<DatosEmpresa> | undefined;
    if (!e?.nombreLegal?.trim() || !e?.numeroId?.trim() || !e?.pais || !e?.zonaHoraria) return 'Completa nombre legal, identificación, país y zona horaria.';
    await guardarEmpresa(db, { datos: {
      nombreLegal: e.nombreLegal.trim(), nombreComercial: (e.nombreComercial ?? '').trim(), tipoId: e.tipoId ?? '02', numeroId: e.numeroId.trim(),
      pais: e.pais, zonaHoraria: e.zonaHoraria, numeroLegalizacion: (e.numeroLegalizacion ?? '').trim(), citasPresentacion: (e.citasPresentacion ?? '').trim(),
    }, facturacionElectronica: 'si' });
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
      const r = recodificar(await leerCatalogo(db), datos.nomenclatura ?? NOMENCLATURA_INICIAL, nueva);
      if (r.error) return r.error;
      await guardarCatalogo(db, r.cuentas);
    }
    datos.nomenclatura = nueva; marcar('nomenclatura');
  } else if (paso === 'catalogo') {
    const modo = v.modo === 'importar' || v.modo === 'crear' ? v.modo : 'base';
    if (modo === 'base') {
      const r = planBase(datos.monedaFuncional || 'CRC', datos.nomenclatura ?? NOMENCLATURA_INICIAL);
      if (r.error) return r.error;
      await guardarCatalogo(db, r.cuentas);
    } else {
      const cuentas = v.cuentas as Cuenta[] | undefined;
      if (!Array.isArray(cuentas) || !cuentas.length) return modo === 'importar' ? 'Sube el archivo con tu plan de cuentas.' : 'Agrega las cuentas de tu plan.';
      if (posteablesConMoneda(cuentas) < 2) return 'El plan de cuentas necesita al menos dos cuentas posteables con moneda.';
      await guardarCatalogo(db, cuentas);
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
  } else if (paso === 'tributaria') {
    // Los datos se guardan en el emisor (Información tributaria); aquí se revisan
    const fe = await estadoConfiguracionFE(db);
    const falta = fe.pasos.find(x => (x.id === 'actividad' || x.id === 'ubicacion') && !x.listo);
    if (falta) return falta.id === 'actividad' ? 'Agrega al menos una actividad económica.' : 'Completa la dirección y el correo para comprobantes.';
    // La sucursal 001 nace sin dirección: toma la del emisor
    const { rows: em } = await db.execute('SELECT id, provincia, canton, distrito, otras_senas, correo_electronico FROM emisores WHERE activo = 1 ORDER BY id LIMIT 1');
    const e = em[0];
    if (e) await db.execute({
      sql: "UPDATE sucursales SET provincia = ?, canton = ?, distrito = ?, otras_senas = ?, correo = ? WHERE emisor_id = ? AND codigo = '001' AND COALESCE(provincia, '') = ''",
      args: [e.provincia ?? '', e.canton ?? '', e.distrito ?? '', e.otras_senas ?? '', e.correo_electronico ?? '', String(e.id)],
    });
    marcar('tributaria');
  } else if (paso === 'hacienda') {
    const fe = await estadoConfiguracionFE(db);
    if (!fe.pasos.find(x => x.id === 'llave')?.listo) return 'Sube o genera la llave criptográfica.';
    if (!fe.pasos.find(x => x.id === 'credenciales')?.listo) return 'Escribe el usuario y la contraseña de Hacienda.';
    await asegurarCaja(db);
    marcar('hacienda');
  } else if (paso === 'completar') {
    const est = await estadoOnboarding(db);
    if (est.completos < PASOS_ORDEN.length) return 'Faltan pasos por completar.';
    datos.completado = true;
  }
  await setMeta(db, CLAVE, JSON.stringify(datos));
  return null;
}

// Sucursal 001 y caja 00001 por defecto, para poder emitir sin más configuración
async function asegurarCaja(db: Client) {
  const { rows: em } = await db.execute('SELECT id FROM emisores WHERE activo = 1 ORDER BY id LIMIT 1');
  const emisorId = String(em[0]?.id ?? '');
  if (!emisorId) return;
  const { rows: su } = await db.execute({ sql: "SELECT COUNT(*) AS n FROM sucursales WHERE emisor_id = ? AND COALESCE(activa, 1) = 1", args: [emisorId] });
  if (!Number(su[0]?.n ?? 0)) {
    await db.execute({ sql: "INSERT INTO sucursales (id, emisor_id, codigo, nombre, provincia, canton, distrito, otras_senas, telefono, correo, activa) VALUES (?, ?, '001', 'Casa matriz', '', '', '', '', '', '', 1)",
      args: ['suc-' + Math.random().toString(36).slice(2), emisorId] });
  }
  const { rows: cj } = await db.execute({ sql: "SELECT COUNT(*) AS n FROM cajas WHERE emisor_id = ? AND COALESCE(activa, 1) = 1", args: [emisorId] });
  if (Number(cj[0]?.n ?? 0)) return;
  const id = 'caja-' + Math.random().toString(36).slice(2);
  await db.execute({ sql: "INSERT INTO cajas (id, sucursal, terminal, nombre, emisor_id, consecutivo_actual, activa, numeracion_continuada) VALUES (?, '001', '00001', 'Caja principal', ?, 0, 1, 0)", args: [id, emisorId] });
  for (const t of TIPOS_NUMERACION) {
    await db.execute({ sql: 'INSERT INTO cajas_numeracion (id, caja_id, tipo_documento, consecutivo_actual) VALUES (?, ?, ?, 0)', args: ['cn-' + Math.random().toString(36).slice(2), id, t.tipo] });
  }
}
