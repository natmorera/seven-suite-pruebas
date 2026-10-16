// Datos de la empresa y si emite facturación electrónica. Los datos que
// comparte con el emisor (nombre legal, nombre comercial, identificación,
// teléfono) viven en el emisor cuando existe, para que no haya dos versiones.
import { leerModulos } from '@/lib/modulos';
import type { Client } from '@libsql/client';

export interface DatosEmpresa {
  codigoEmpresa: string; nombreLegal: string; nombreComercial: string; tipoId: string; numeroId: string; pais: string;
  zonaHoraria: string; numeroLegalizacion: string; citasPresentacion: string; direccion: string; telefono: string; email: string; web: string;
}
export type OpcionFE = 'si' | 'no' | '';

export const EMPRESA_INICIAL: DatosEmpresa = {
  codigoEmpresa: 'HTL-FORT-01', nombreLegal: 'Hotel Fortuna S.A.', nombreComercial: 'Hotel Fortuna',
  tipoId: '02', numeroId: '3-101-123456', pais: 'CR', zonaHoraria: 'America/Costa_Rica',
  numeroLegalizacion: '', citasPresentacion: '', direccion: '', telefono: '', email: '', web: '',
};

async function meta(db: Client, clave: string): Promise<string | null> {
  const { rows } = await db.execute({ sql: 'SELECT valor FROM app_meta WHERE clave = ?', args: [clave] });
  return rows[0] ? String(rows[0].valor) : null;
}
async function setMeta(db: Client, clave: string, valor: string) {
  await db.execute({ sql: 'INSERT INTO app_meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor', args: [clave, valor] });
}

export async function emisorPrincipal(db: Client) {
  const { rows } = await db.execute(`SELECT * FROM emisores WHERE activo = 1 ORDER BY id LIMIT 1`);
  return rows[0] as unknown as Record<string, string | number | null> | undefined;
}

export async function leerEmpresa(db: Client): Promise<{ datos: DatosEmpresa; facturacionElectronica: OpcionFE; emisorId: string | null }> {
  let datos: DatosEmpresa = { ...EMPRESA_INICIAL };
  const guardado = await meta(db, 'empresa_datos');
  if (guardado) { try { datos = { ...datos, ...JSON.parse(guardado) }; } catch { /* se usan los iniciales */ } }
  const e = await emisorPrincipal(db);
  if (e) {
    datos = {
      ...datos,
      nombreLegal: String(e.razon_social ?? datos.nombreLegal), nombreComercial: String(e.nombre_comercial ?? datos.nombreComercial),
      tipoId: String(e.tipo_identificacion || datos.tipoId), numeroId: String(e.cedula_juridica ?? datos.numeroId),
      telefono: String(e.telefono || datos.telefono || ''),
    };
  }
  // Solo Accounting: no hay facturación. Solo Digital Invoices: la empresa emite
  // siempre (no se pregunta). Con los dos módulos: lo que respondió la empresa.
  const mods = await leerModulos(db);
  const fe = !mods.facturacion ? 'no' : !mods.contabilidad ? 'si' : ((await meta(db, 'facturacion_electronica')) ?? '');
  return { datos, facturacionElectronica: fe === 'si' || fe === 'no' ? fe : '', emisorId: e ? String(e.id) : null };
}

export async function guardarEmpresa(db: Client, cambios: { datos?: Partial<DatosEmpresa>; facturacionElectronica?: OpcionFE }) {
  const actual = await leerEmpresa(db);
  const datos = { ...actual.datos, ...(cambios.datos ?? {}) };
  await setMeta(db, 'empresa_datos', JSON.stringify(datos));
  // Una vez emisor de facturación electrónica, no se puede volver a «No»
  if (cambios.facturacionElectronica !== undefined && !(cambios.facturacionElectronica !== 'si' && (await meta(db, 'facturacion_electronica')) === 'si')) {
    await setMeta(db, 'facturacion_electronica', cambios.facturacionElectronica);
  }
  const fe = cambios.facturacionElectronica ?? actual.facturacionElectronica;

  let e = await emisorPrincipal(db);
  // Primera vez que se activa sin emisor: se crea con los datos de la
  // empresa, con su sucursal 001 (la única en el MVP).
  if (!e && fe === 'si') {
    const id = 'em-' + Math.random().toString(36).slice(2, 10);
    await db.execute({
      sql: `INSERT INTO emisores (id, razon_social, nombre_comercial, cedula_juridica, tipo_identificacion, actividad_economica, regimen, llave_cargada, activo, telefono, correo_electronico, actividades_json, ambiente)
            VALUES (?, ?, ?, ?, ?, '', 'Tradicional', 0, 1, ?, ?, '[]', 'pruebas')`,
      args: [id, datos.nombreLegal, datos.nombreComercial, datos.numeroId, datos.tipoId, datos.telefono, datos.email],
    });
    await db.execute({
      sql: `INSERT INTO sucursales (id, emisor_id, codigo, nombre, provincia, canton, distrito, otras_senas, telefono, correo, activa) VALUES (?, ?, '001', 'Casa matriz', '', '', '', '', ?, ?, 1)`,
      args: ['suc-' + id, id, datos.telefono, datos.email],
    });
    e = await emisorPrincipal(db);
  } else if (e) {
    await db.execute({
      sql: `UPDATE emisores SET razon_social = ?, nombre_comercial = ?, tipo_identificacion = ?, cedula_juridica = ?, telefono = ? WHERE id = ?`,
      args: [datos.nombreLegal, datos.nombreComercial, datos.tipoId, datos.numeroId, datos.telefono, String(e.id)],
    });
    await db.execute({ sql: `UPDATE sucursales SET telefono = ? WHERE emisor_id = ? AND codigo = '001'`, args: [datos.telefono, String(e.id)] });
  }
  return leerEmpresa(db);
}
