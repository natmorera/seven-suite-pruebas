// CABYS y división territorial guardados en la base de cada cliente. Se
// siembran con los datos que trae el sistema y se actualizan con
// scripts/actualizar-catalogos.mjs cuando Hacienda publica cambios.
import type { Client } from '@libsql/client';
import { CABYS } from '@/data/cabysData';
import { PROVINCIAS, type Provincia } from '@/data/divisionTerritorial';

export async function crearTablasCatalogos(db: Client) {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS cabys_catalogo (codigo TEXT PRIMARY KEY, descripcion TEXT, impuesto REAL, actualizado TEXT)`,
    `CREATE INDEX IF NOT EXISTS idx_cabys_desc ON cabys_catalogo (descripcion)`,
    `CREATE TABLE IF NOT EXISTS ubicaciones (
      provincia TEXT, canton TEXT, distrito TEXT, nombre_provincia TEXT, nombre_canton TEXT, nombre_distrito TEXT, actualizado TEXT,
      PRIMARY KEY (provincia, canton, distrito)
    )`,
    `CREATE TABLE IF NOT EXISTS barrios (provincia TEXT, canton TEXT, distrito TEXT, codigo TEXT, nombre TEXT, PRIMARY KEY (provincia, canton, distrito, codigo))`,
  ], 'write');
  const hoy = new Date().toISOString();
  const { rows: c } = await db.execute('SELECT COUNT(*) AS n FROM cabys_catalogo');
  if (!Number(c[0]?.n)) {
    await db.batch(CABYS.map(x => ({ sql: 'INSERT OR IGNORE INTO cabys_catalogo (codigo, descripcion, impuesto, actualizado) VALUES (?, ?, ?, ?)', args: [x.codigo, x.descripcion, x.impuesto, hoy] })), 'write');
  }
  const { rows: u } = await db.execute('SELECT COUNT(*) AS n FROM ubicaciones');
  if (!Number(u[0]?.n)) {
    const filas: { sql: string; args: string[] }[] = [];
    for (const [p, prov] of Object.entries(PROVINCIAS)) for (const [k, cant] of Object.entries(prov.cantones)) for (const [d, dist] of Object.entries(cant.distritos)) {
      filas.push({ sql: 'INSERT OR IGNORE INTO ubicaciones (provincia, canton, distrito, nombre_provincia, nombre_canton, nombre_distrito, actualizado) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [p, k, d, prov.nombre, cant.nombre, dist, hoy] });
    }
    for (let i = 0; i < filas.length; i += 200) await db.batch(filas.slice(i, i + 200), 'write');
  }
}

// La división territorial en la misma forma que data/divisionTerritorial.ts
export async function leerProvincias(db: Client): Promise<Record<string, Provincia>> {
  const { rows } = await db.execute('SELECT * FROM ubicaciones ORDER BY provincia, canton, distrito');
  const out: Record<string, Provincia> = {};
  for (const r of rows) {
    const p = String(r.provincia), c = String(r.canton);
    out[p] ??= { nombre: String(r.nombre_provincia), cantones: {} };
    out[p].cantones[c] ??= { nombre: String(r.nombre_canton), distritos: {} };
    out[p].cantones[c].distritos[String(r.distrito)] = String(r.nombre_distrito);
  }
  return Object.keys(out).length ? out : PROVINCIAS;
}
