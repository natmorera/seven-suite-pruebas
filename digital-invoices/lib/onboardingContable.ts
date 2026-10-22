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
import { CUENTAS_INIT, type Cuenta } from '@/components/pages/catalogo/catalogoData';
import { obtenerMapeo, type MapeoContable } from '@/lib/asientoAutomatico';
import { pasosDe, NOMENCLATURA_INICIAL, planBase, baseEnCero, aplanar, recodificar, posteablesConMoneda, type PasoId, type Nomenclatura } from '@/lib/onboardingComun';
import { esMonedaContable, monedaPrimariaDePais, monedaDePais } from '@/lib/paises';
import { leerModulos, type Modulos } from '@/lib/modulos';
import { estadoConfiguracionFE } from '@/lib/configuracionFE';
import { tiposNumeracion } from '@/data/catalogosHacienda';
import { esGuatemala, nombreAfiliacion } from '@/lib/perfilPais';
import { leerTributariaGT } from '@/lib/tributariaGT';
import { esGuatemalaActual } from '@/lib/paisActual';
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
  modulos: Modulos;
  pasos: PasoId[];                       // los de esta versión, en orden
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
    sucursal: false,
    cuentas: false,
  };
  // Facturación electrónica: lo que pide la lista de configuración de Hacienda
  const fe = await estadoConfiguracionFE(db);
  const ok = (id: string) => Boolean(fe.pasos.find(x => x.id === id)?.listo);
  if (esGuatemala(empresa.pais)) {
    listos.tributaria = hecho('tributaria') && ok('afiliacion') && ok('direccion');
    listos.hacienda = hecho('hacienda') && ok('certificador');
  } else {
    listos.tributaria = hecho('tributaria') && ok('actividad') && ok('ubicacion');
    listos.hacienda = hecho('hacienda') && ok('llave') && ok('credenciales');
  }
  listos.sucursal = hecho('sucursal') && ok('sucursal') && ok('caja');
  listos.cuentas = hecho('cuentas') && (await cuentasFacturacionInvalidas(db)).length === 0;
  const { rows } = await db.execute('SELECT actividad_economica, ambiente FROM emisores WHERE activo = 1 ORDER BY id LIMIT 1');
  const { rows: cj } = await db.execute("SELECT sucursal, terminal FROM cajas WHERE COALESCE(activa, 1) = 1 ORDER BY sucursal, terminal LIMIT 1");
  const gt = esGuatemala(empresa.pais) ? await leerTributariaGT(db) : null;
  const facturacion = { actividad: gt ? `Afiliación al IVA: ${nombreAfiliacion(gt.afiliacionIva)}` : String(rows[0]?.actividad_economica ?? ''),
    ambiente: gt ? 'produccion' : String(rows[0]?.ambiente ?? 'produccion'),
    sucursal: String(cj[0]?.sucursal ?? '001'), caja: String(cj[0]?.terminal ?? '') };
  const modulos = await leerModulos(db);
  const pasos = pasosDe(modulos);
  return { datos, empresa, cuentasPosteables, modulos, pasos, listos, completos: pasos.filter(p => listos[p]).length, facturacion };
}

// Vuelve a pedir el onboarding (demostración). Guarda cómo estaba para
// poder salir de la demostración sin terminarla.
const RESPALDO = `${CLAVE}_respaldo`;
export async function reiniciarOnboarding(db: Client) {
  await setMeta(db, RESPALDO, JSON.stringify(await leerDatosOnboarding(db)));
  await setMeta(db, CLAVE, JSON.stringify(INICIAL));
}

// Sale de la demostración: deja el onboarding como estaba antes de abrirla
export async function salirDeDemostracion(db: Client) {
  const antes = await meta(db, RESPALDO);
  let datos: DatosOnboarding = { ...INICIAL, completado: true };
  try { if (antes) datos = { ...INICIAL, ...JSON.parse(antes), completado: true }; } catch { /* sin respaldo legible */ }
  await setMeta(db, CLAVE, JSON.stringify(datos));
}

export async function guardarPaso(db: Client, paso: PasoId | 'completar', v: Record<string, unknown>): Promise<string | null> {
  const datos = await leerDatosOnboarding(db);
  const marcar = (p: PasoId) => { if (!datos.hechos.includes(p)) datos.hechos.push(p); };
  const modulos = await leerModulos(db);
  if (paso !== 'completar' && !pasosDe(modulos).includes(paso)) return 'Este paso no aplica a tu versión.';
  if (paso === 'empresa') {
    const e = v.empresa as Partial<DatosEmpresa> | undefined;
    if (!e?.nombreLegal?.trim() || !e?.numeroId?.trim() || !e?.pais || !e?.zonaHoraria) return 'Completa nombre legal, identificación, país y zona horaria.';
    await guardarEmpresa(db, { datos: {
      nombreLegal: e.nombreLegal.trim(), nombreComercial: (e.nombreComercial ?? '').trim(), tipoId: e.tipoId ?? '02', numeroId: e.numeroId.trim(),
      pais: e.pais, zonaHoraria: e.zonaHoraria, numeroLegalizacion: (e.numeroLegalizacion ?? '').trim(), citasPresentacion: (e.citasPresentacion ?? '').trim(),
    }, facturacionElectronica: 'si' });
    const primaria = !modulos.contabilidad ? monedaDePais(e.pais) : typeof v.monedaPrimaria === 'string' && esMonedaContable(v.monedaPrimaria) ? v.monedaPrimaria : monedaPrimariaDePais(e.pais);
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
      const antes = await leerCatalogo(db);
      const r = recodificar(antes, datos.nomenclatura ?? NOMENCLATURA_INICIAL, nueva);
      if (r.error) return r.error;
      await guardarCatalogo(db, r.cuentas);
      await recodificarReferencias(db, antes, r.cuentas);
    }
    datos.nomenclatura = nueva; marcar('nomenclatura');
  } else if (paso === 'catalogo') {
    const modo = v.modo === 'importar' || v.modo === 'crear' || v.modo === 'propio' ? v.modo : 'base';
    if (modo === 'propio') {
      // Plan creado en el Catálogo de cuentas: se usa el que ya está guardado
      const cuentas = await leerCatalogo(db);
      if (posteablesConMoneda(cuentas) < 2) return 'Todavía no hay un plan con al menos dos cuentas posteables con moneda. Créalo en el Catálogo de cuentas y vuelve.';
    } else if (modo === 'base') {
      const moneda = datos.monedaFuncional || 'CRC';
      const r = planBase(moneda, datos.nomenclatura ?? NOMENCLATURA_INICIAL);
      if (r.error) return r.error;
      await guardarCatalogo(db, r.cuentas);
      // Las cuentas de facturación por defecto vienen escritas como el plan base (100-001-0001)
      await recodificarReferencias(db, baseEnCero(CUENTAS_INIT, moneda), r.cuentas);
    } else {
      const cuentas = v.cuentas as Cuenta[] | undefined;
      if (!Array.isArray(cuentas) || !cuentas.length) return modo === 'importar' ? 'Sube el archivo con tu plan de cuentas.' : 'Agrega las cuentas de tu plan.';
      if (posteablesConMoneda(cuentas) < 2) return 'El plan de cuentas necesita al menos dos cuentas posteables con moneda.';
      await guardarCatalogo(db, cuentas);
    }
    datos.catalogo = modo; marcar('catalogo');
  } else if (paso === 'cuentas') {
    const m = v.mapeo as Partial<MapeoContable> | undefined;
    if (m) await guardarMapeo(db, m);
    const malas = await cuentasFacturacionInvalidas(db);
    if (malas.length) return `Elige cuentas posteables de tu plan para: ${malas.join(', ')}.`;
    marcar('cuentas');
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
    const gt = esGuatemala((await leerEmpresa(db)).datos.pais);
    const falta = fe.pasos.find(x => (gt ? ['afiliacion', 'direccion'] : ['actividad', 'ubicacion']).includes(x.id) && !x.listo);
    if (falta) return falta.id === 'actividad' ? 'Agrega al menos una actividad económica.'
      : falta.id === 'afiliacion' ? 'Elige la afiliación al IVA y desde cuándo está vigente.'
      : 'Completa la dirección y el correo para comprobantes.';
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
    if (esGuatemala((await leerEmpresa(db)).datos.pais)) {
      if (!fe.pasos.find(x => x.id === 'certificador')?.listo) return 'Agrega el certificador principal con su usuario y contraseña.';
      marcar('hacienda');
      await setMeta(db, CLAVE, JSON.stringify(datos));
      return null;
    }
    if (!fe.pasos.find(x => x.id === 'llave')?.listo) return 'Sube o genera la llave criptográfica.';
    if (!fe.pasos.find(x => x.id === 'credenciales')?.listo) return 'Escribe el usuario y la contraseña de Hacienda.';
    marcar('hacienda');
  } else if (paso === 'sucursal') {
    const error = await guardarSucursalYCaja(db, v);
    if (error) return error;
    marcar('sucursal');
  } else if (paso === 'completar') {
    const est = await estadoOnboarding(db);
    if (est.completos < est.pasos.length) return 'Faltan pasos por completar.';
    datos.completado = true;
  }
  await setMeta(db, CLAVE, JSON.stringify(datos));
  return null;
}

// Primera sucursal (001) y primera caja (00001): se crean o se actualizan
interface DatosSucursal { nombre?: string; provincia?: string; canton?: string; distrito?: string; otrasSenas?: string; telefono?: string; correo?: string }
interface DatosCaja { nombre?: string; terminal?: string; numeracion?: Record<string, string> }
async function guardarSucursalYCaja(db: Client, v: Record<string, unknown>): Promise<string | null> {
  const su = (v.sucursal ?? {}) as DatosSucursal; const cj = (v.caja ?? {}) as DatosCaja;
  const unidad = esGuatemalaActual() ? 'del establecimiento' : 'de la sucursal';
  if (!su.nombre?.trim()) return `Escribe el nombre ${unidad}.`;
  if (!su.provincia || !su.canton || !su.distrito || (su.otrasSenas ?? '').trim().length < 5) return `Completa la dirección ${unidad}.`;
  if (!cj.nombre?.trim()) return 'Escribe el nombre de la caja.';
  const terminal = String(cj.terminal ?? '').replace(/\D/g, '').slice(0, 5).padStart(5, '0');
  if (!Number(terminal)) return 'El número de terminal debe ser mayor que 0.';
  const numeracion = Object.entries(cj.numeracion ?? {}).filter(([, n]) => String(n ?? '').trim() !== '');
  if (numeracion.some(([, n]) => !/^\d{1,10}$/.test(String(n)) || Number(n) < 1)) return 'El próximo número de cada comprobante debe ser un número mayor que 0.';
  const { rows: em } = await db.execute('SELECT id FROM emisores WHERE activo = 1 ORDER BY id LIMIT 1');
  const emisorId = String(em[0]?.id ?? '');
  if (!emisorId) return 'Todavía no hay emisor. Vuelve al paso Empresa y continúa.';
  const campos = [su.nombre.trim(), su.provincia, su.canton, su.distrito, (su.otrasSenas ?? '').trim(), (su.telefono ?? '').trim(), (su.correo ?? '').trim()];
  const { rows: s1 } = await db.execute({ sql: "SELECT id FROM sucursales WHERE emisor_id = ? AND codigo = '001'", args: [emisorId] });
  if (s1[0]) {
    await db.execute({ sql: 'UPDATE sucursales SET nombre = ?, provincia = ?, canton = ?, distrito = ?, otras_senas = ?, telefono = ?, correo = ?, activa = 1 WHERE id = ?', args: [...campos, String(s1[0].id)] });
  } else {
    await db.execute({ sql: "INSERT INTO sucursales (id, emisor_id, codigo, nombre, provincia, canton, distrito, otras_senas, telefono, correo, activa) VALUES (?, ?, '001', ?, ?, ?, ?, ?, ?, ?, 1)",
      args: ['suc-' + Math.random().toString(36).slice(2), emisorId, ...campos] });
  }
  // La primera caja de la sucursal 001 (si ya existe se actualiza, aunque cambie su terminal)
  const { rows: c1 } = await db.execute({ sql: "SELECT id FROM cajas WHERE emisor_id = ? AND sucursal = '001' ORDER BY terminal LIMIT 1", args: [emisorId] });
  let cajaId = c1[0] ? String(c1[0].id) : '';
  if (cajaId) {
    await db.execute({ sql: 'UPDATE cajas SET nombre = ?, terminal = ?, activa = 1 WHERE id = ?', args: [cj.nombre.trim(), terminal, cajaId] });
  } else {
    cajaId = 'caja-' + Math.random().toString(36).slice(2);
    await db.execute({ sql: "INSERT INTO cajas (id, sucursal, terminal, nombre, emisor_id, consecutivo_actual, activa, numeracion_continuada) VALUES (?, '001', ?, ?, ?, 0, 1, 0)", args: [cajaId, terminal, cj.nombre.trim(), emisorId] });
    for (const t of tiposNumeracion()) {
      await db.execute({ sql: 'INSERT INTO cajas_numeracion (id, caja_id, tipo_documento, consecutivo_actual) VALUES (?, ?, ?, 0)', args: ['cn-' + Math.random().toString(36).slice(2), cajaId, t.tipo] });
    }
  }
  // Si la caja ya emitía en otro sistema: el próximo número de cada tipo
  for (const [tipo, n] of numeracion) {
    await db.execute({ sql: 'UPDATE cajas_numeracion SET consecutivo_actual = ? WHERE caja_id = ? AND tipo_documento = ?', args: [Number(n) - 1, cajaId, tipo] });
    if (tipo === 'Factura electrónica') await db.execute({ sql: 'UPDATE cajas SET consecutivo_actual = ? WHERE id = ?', args: [Number(n) - 1, cajaId] });
  }
  if (numeracion.some(([, n]) => Number(n) > 1)) await db.execute({ sql: 'UPDATE cajas SET numeracion_continuada = 1 WHERE id = ?', args: [cajaId] });
  return null;
}

// Al cambiar la nomenclatura, los códigos de cuenta guardados en el resto del
// sistema (cuentas de facturación, productos, descuentos, impuestos, compras y
// líneas de asientos) pasan al código nuevo, para que los asientos de ventas y
// compras sigan apuntando a cuentas del catálogo.
const REFERENCIAS_CUENTA: [string, string][] = [
  ['compras_mapeo', 'cuenta'],
  ['mapeo_contable_facturacion', 'cuenta_ventas'], ['mapeo_contable_facturacion', 'cuenta_iva_ventas'], ['mapeo_contable_facturacion', 'cuenta_cxc'],
  ['mapeo_contable_facturacion', 'cuenta_caja'], ['mapeo_contable_facturacion', 'cuenta_banco'], ['mapeo_contable_facturacion', 'cuenta_gastos'],
  ['mapeo_contable_facturacion', 'cuenta_iva_compras'], ['mapeo_contable_facturacion', 'cuenta_proveedores'],
  ['cabys_favoritos', 'cuenta_ingreso'], ['cabys_favoritos', 'cuenta_costo'], ['cabys_favoritos', 'cuenta_inventario'],
  ['grupos_productos', 'cuenta_ingreso'], ['grupos_productos', 'cuenta_costo'],
  ['descuentos', 'cuenta'], ['impuestos', 'cuenta'], ['clientes', 'cuenta_gasto'],
  ['documentos_recibidos', 'cuenta_proveedor'], ['asientos_lineas', 'cuenta'],
];
async function recodificarReferencias(db: Client, antes: Cuenta[], despues: Cuenta[]) {
  const mapa = new Map<string, string>();
  const emparejar = (a: Cuenta[], b: Cuenta[]) => a.forEach((c, i) => {
    const n = b[i]; if (!n) return;
    if (c.code !== n.code) mapa.set(c.code, n.code);
    emparejar(c.children ?? [], n.children ?? []);
  });
  emparejar(antes, despues);
  if (!mapa.size) return;
  for (const [tabla, col] of REFERENCIAS_CUENTA) {
    try {
      const { rows } = await db.execute(`SELECT DISTINCT ${col} AS c FROM ${tabla} WHERE COALESCE(${col}, '') <> ''`);
      for (const r of rows) {
        const nuevo = mapa.get(String(r.c));
        if (nuevo) await db.execute({ sql: `UPDATE ${tabla} SET ${col} = ? WHERE ${col} = ?`, args: [nuevo, String(r.c)] });
      }
    } catch { /* tabla o columna que no existe en esta base */ }
  }
  // Terceros: la cuenta de detalle de su auxiliar (el número de auxiliar no cambia)
  try {
    const { rows } = await db.execute("SELECT id, datos_json FROM clientes WHERE COALESCE(datos_json, '') <> ''");
    for (const r of rows) {
      let p: { cuentaCode?: string } = {};
      try { p = JSON.parse(String(r.datos_json)); } catch { continue; }
      const nuevo = p.cuentaCode ? mapa.get(p.cuentaCode) : undefined;
      if (nuevo) await db.execute({ sql: 'UPDATE clientes SET datos_json = ? WHERE id = ?', args: [JSON.stringify({ ...p, cuentaCode: nuevo }), String(r.id)] });
    }
  } catch { /* sin terceros */ }
  // Compras importadas que todavía no tienen asiento: la cuenta de cada línea
  try {
    const { rows } = await db.execute("SELECT id, lineas_json FROM documentos_recibidos WHERE COALESCE(lineas_json, '') <> '' AND id NOT IN (SELECT COALESCE(documento_ref_id, '') FROM asientos)");
    for (const r of rows) {
      let lineas: { cuenta?: string }[] = [];
      try { lineas = JSON.parse(String(r.lineas_json)); } catch { continue; }
      if (!Array.isArray(lineas) || !lineas.some(l => l.cuenta && mapa.has(l.cuenta))) continue;
      const nuevas = lineas.map(l => (l.cuenta && mapa.has(l.cuenta) ? { ...l, cuenta: mapa.get(l.cuenta) } : l));
      await db.execute({ sql: 'UPDATE documentos_recibidos SET lineas_json = ? WHERE id = ?', args: [JSON.stringify(nuevas), String(r.id)] });
    }
  } catch { /* sin compras */ }
}

// ── Cuentas de los asientos automáticos de facturación ────────────────────
const NOMBRES_MAPEO: Record<keyof MapeoContable, string> = {
  cuentaVentas: 'Ingresos por ventas', cuentaIvaVentas: 'IVA por pagar', cuentaCxc: 'Cuentas por cobrar', cuentaCaja: 'Caja',
  cuentaBanco: 'Bancos', cuentaGastos: 'Gastos', cuentaIvaCompras: 'IVA acreditable', cuentaProveedores: 'Cuentas por pagar',
  cuentaIsrRetenido: 'ISR retenido por pagar', cuentaIvaRetenido: 'IVA retenido por pagar',
};
const COLUMNAS_MAPEO: Record<keyof MapeoContable, string> = {
  cuentaVentas: 'cuenta_ventas', cuentaIvaVentas: 'cuenta_iva_ventas', cuentaCxc: 'cuenta_cxc', cuentaCaja: 'cuenta_caja',
  cuentaBanco: 'cuenta_banco', cuentaGastos: 'cuenta_gastos', cuentaIvaCompras: 'cuenta_iva_compras', cuentaProveedores: 'cuenta_proveedores',
  cuentaIsrRetenido: 'cuenta_isr_retenido', cuentaIvaRetenido: 'cuenta_iva_retenido',
};
// Las que no existen en el catálogo o no son posteables (por su nombre)
export async function cuentasFacturacionInvalidas(db: Client): Promise<string[]> {
  const m = await obtenerMapeo(db, 'default');
  const posteables = new Set(aplanar(await leerCatalogo(db)).filter(c => c.posteable && !c.inactiva).map(c => c.code));
  // Las cuentas de retenciones solo las usa Guatemala (factura especial)
  const retenciones = new Set<keyof MapeoContable>(['cuentaIsrRetenido', 'cuentaIvaRetenido']);
  return (Object.keys(NOMBRES_MAPEO) as (keyof MapeoContable)[]).filter(k => (esGuatemalaActual() || !retenciones.has(k)) && !posteables.has(m[k])).map(k => NOMBRES_MAPEO[k]);
}
async function guardarMapeo(db: Client, parcial: Partial<MapeoContable>) {
  const m = { ...(await obtenerMapeo(db, 'default')) };
  for (const k of Object.keys(COLUMNAS_MAPEO) as (keyof MapeoContable)[]) if (typeof parcial[k] === 'string' && parcial[k]!.trim()) m[k] = parcial[k]!.trim();
  const cols = Object.values(COLUMNAS_MAPEO);
  await db.execute("DELETE FROM mapeo_contable_facturacion WHERE emisor_id = 'default'");
  await db.execute({ sql: `INSERT INTO mapeo_contable_facturacion (emisor_id, ${cols.join(', ')}) VALUES ('default', ${cols.map(() => '?').join(', ')})`,
    args: (Object.keys(COLUMNAS_MAPEO) as (keyof MapeoContable)[]).map(k => m[k]) });
}
