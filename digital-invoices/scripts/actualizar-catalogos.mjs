#!/usr/bin/env node
// Actualiza los catálogos de Hacienda (CABYS, división territorial y medios
// de pago) en la base de datos de uno o varios clientes.
//
// Uso:
//   node scripts/actualizar-catalogos.mjs --cabys catalogo-cabys.xlsx
//   node scripts/actualizar-catalogos.mjs --ubicaciones division.xlsx --bases bases.txt
//   node scripts/actualizar-catalogos.mjs --medios medios.csv --simular
//
// Archivos (Excel .xlsx o .csv, con encabezados en la primera fila):
//   --cabys        Catálogo CABYS publicado por el BCCR/Hacienda. Se buscan las
//                  columnas de código (13 dígitos), descripción e impuesto.
//   --ubicaciones  Codificación territorial: provincia, cantón y distrito, con
//                  sus códigos y nombres (y el barrio si viene).
//   --medios       Medios de pago: código y descripción.
//
// Bases:
//   --bases archivo.txt  Una base por línea: URL de Turso y su token separados
//                        por un espacio (libsql://cliente.turso.io TOKEN).
//                        Las líneas que empiezan con # se ignoran.
//   Sin --bases se usa TURSO_DATABASE_URL / TURSO_AUTH_TOKEN, o la base local
//   data-runtime/facturacion.db.
//   --simular            Lee los archivos y muestra qué cambiaría, sin escribir.
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const args = process.argv.slice(2);
const opcion = n => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const simular = args.includes('--simular');
const sinTildes = t => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function leerFilas(archivo) {
  if (!fs.existsSync(archivo)) throw new Error(`No existe el archivo ${archivo}`);
  const wb = /\.(csv|txt)$/i.test(archivo)
    ? XLSX.read(fs.readFileSync(archivo, 'utf8').replace(/^\ufeff/, ''), { type: 'string', raw: true })
    : XLSX.read(fs.readFileSync(archivo), { type: 'buffer' });
  // La hoja con más filas es la del catálogo
  const hoja = wb.SheetNames.map(n => wb.Sheets[n]).sort((a, b) => (XLSX.utils.sheet_to_json(b, { header: 1 }).length - XLSX.utils.sheet_to_json(a, { header: 1 }).length))[0];
  const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '' });
  // Encabezado: la primera fila con al menos 2 textos
  const iEnc = matriz.findIndex(f => f.filter(c => String(c).trim()).length >= 2);
  const enc = matriz[iEnc].map(sinTildes);
  return { enc, filas: matriz.slice(iEnc + 1).filter(f => f.some(c => String(c).trim())) };
}
const columna = (enc, ...claves) => enc.findIndex(h => claves.some(k => h.includes(k)));

function leerCabys(archivo) {
  const { enc, filas } = leerFilas(archivo);
  let iCod = enc.findIndex(h => h.includes('codigo') && (h.includes('bien') || h.includes('servicio') || h.includes('cabys')));
  if (iCod < 0) iCod = filas[0]?.findIndex(c => /^\d{13}$/.test(String(c).replace(/\D/g, '')) && String(c).replace(/\D/g, '').length === 13) ?? -1;
  let iDesc = enc.findIndex((h, i) => i !== iCod && h.includes('descripcion') && (h.includes('bien') || h.includes('servicio')));
  if (iDesc < 0) iDesc = columna(enc, 'descripcion');
  const iImp = columna(enc, 'impuesto', 'iva', 'tarifa');
  if (iCod < 0 || iDesc < 0) throw new Error('No encontré las columnas de código y descripción del CABYS.');
  return filas.map(f => ({ codigo: String(f[iCod]).replace(/\D/g, ''), descripcion: String(f[iDesc]).trim(), impuesto: iImp >= 0 ? Number(String(f[iImp]).replace(/[^\d.]/g, '')) || 0 : 13 }))
    .filter(x => x.codigo.length === 13 && x.descripcion);
}

function leerUbicaciones(archivo) {
  const { enc, filas } = leerFilas(archivo);
  const c = {
    cp: enc.findIndex(h => h.includes('cod') && h.includes('prov')), np: enc.findIndex(h => h.includes('provincia') && !h.includes('cod')),
    cc: enc.findIndex(h => h.includes('cod') && h.includes('cant')), nc: enc.findIndex(h => h.includes('canton') && !h.includes('cod')),
    cd: enc.findIndex(h => h.includes('cod') && h.includes('dist')), nd: enc.findIndex(h => h.includes('distrito') && !h.includes('cod')),
    cb: enc.findIndex(h => h.includes('cod') && h.includes('barr')), nb: enc.findIndex(h => h.includes('barrio') && !h.includes('cod')),
  };
  if ([c.cp, c.np, c.cc, c.nc, c.cd, c.nd].some(i => i < 0)) throw new Error('Faltan columnas: se necesitan código y nombre de provincia, cantón y distrito.');
  const pad = (v, n) => String(v).replace(/\D/g, '').slice(-n).padStart(n, '0');
  return filas.map(f => ({
    provincia: pad(f[c.cp], 1), canton: pad(f[c.cc], 2), distrito: pad(f[c.cd], 2),
    nombre_provincia: String(f[c.np]).trim(), nombre_canton: String(f[c.nc]).trim(), nombre_distrito: String(f[c.nd]).trim(),
    barrio: c.cb >= 0 && String(f[c.cb]).trim() ? pad(f[c.cb], 2) : null, nombre_barrio: c.nb >= 0 ? String(f[c.nb]).trim() : '',
  })).filter(x => x.provincia !== '0' && x.nombre_distrito);
}

function leerMedios(archivo) {
  const { enc, filas } = leerFilas(archivo);
  const iCod = columna(enc, 'codigo'), iDesc = columna(enc, 'descripcion', 'nombre', 'medio');
  if (iCod < 0 || iDesc < 0) throw new Error('Faltan las columnas de código y descripción de los medios de pago.');
  return filas.map(f => ({ codigo: String(f[iCod]).replace(/\D/g, '').padStart(2, '0'), descripcion: String(f[iDesc]).trim() })).filter(x => x.codigo !== '00' && x.descripcion);
}

function bases() {
  const archivo = opcion('bases');
  if (archivo) {
    return fs.readFileSync(archivo, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'))
      .map(l => { const [url, authToken] = l.split(/\s+/); return { url, authToken }; });
  }
  if (process.env.TURSO_DATABASE_URL) return [{ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }];
  return [{ url: `file:${path.join(process.cwd(), 'data-runtime', 'facturacion.db')}` }];
}

async function enLotes(db, sentencias) {
  for (let i = 0; i < sentencias.length; i += 300) await db.batch(sentencias.slice(i, i + 300), 'write');
}

async function actualizar(db, datos) {
  const hoy = new Date().toISOString();
  const r = {};
  if (datos.cabys) {
    await db.execute('CREATE TABLE IF NOT EXISTS cabys_catalogo (codigo TEXT PRIMARY KEY, descripcion TEXT, impuesto REAL, actualizado TEXT)');
    const antes = Number((await db.execute('SELECT COUNT(*) AS n FROM cabys_catalogo')).rows[0].n);
    if (!simular) await enLotes(db, datos.cabys.map(x => ({
      sql: `INSERT INTO cabys_catalogo (codigo, descripcion, impuesto, actualizado) VALUES (?, ?, ?, ?)
            ON CONFLICT(codigo) DO UPDATE SET descripcion = excluded.descripcion, impuesto = excluded.impuesto, actualizado = excluded.actualizado`,
      args: [x.codigo, x.descripcion, x.impuesto, hoy],
    })));
    r.cabys = `${datos.cabys.length} códigos (había ${antes})`;
  }
  if (datos.ubicaciones) {
    await db.execute(`CREATE TABLE IF NOT EXISTS ubicaciones (provincia TEXT, canton TEXT, distrito TEXT, nombre_provincia TEXT, nombre_canton TEXT, nombre_distrito TEXT, actualizado TEXT, PRIMARY KEY (provincia, canton, distrito))`);
    await db.execute('CREATE TABLE IF NOT EXISTS barrios (provincia TEXT, canton TEXT, distrito TEXT, codigo TEXT, nombre TEXT, PRIMARY KEY (provincia, canton, distrito, codigo))');
    const distritos = new Map();
    for (const u of datos.ubicaciones) distritos.set(`${u.provincia}-${u.canton}-${u.distrito}`, u);
    if (!simular) {
      await enLotes(db, [...distritos.values()].map(u => ({
        sql: `INSERT INTO ubicaciones (provincia, canton, distrito, nombre_provincia, nombre_canton, nombre_distrito, actualizado) VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(provincia, canton, distrito) DO UPDATE SET nombre_provincia = excluded.nombre_provincia, nombre_canton = excluded.nombre_canton, nombre_distrito = excluded.nombre_distrito, actualizado = excluded.actualizado`,
        args: [u.provincia, u.canton, u.distrito, u.nombre_provincia, u.nombre_canton, u.nombre_distrito, hoy],
      })));
      await enLotes(db, datos.ubicaciones.filter(u => u.barrio).map(u => ({
        sql: 'INSERT INTO barrios (provincia, canton, distrito, codigo, nombre) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO UPDATE SET nombre = excluded.nombre',
        args: [u.provincia, u.canton, u.distrito, u.barrio, u.nombre_barrio],
      })));
    }
    r.ubicaciones = `${distritos.size} distritos, ${datos.ubicaciones.filter(u => u.barrio).length} barrios`;
  }
  if (datos.medios) {
    await db.execute('CREATE TABLE IF NOT EXISTS catalogos_hacienda (catalogo TEXT NOT NULL, codigo TEXT NOT NULL, descripcion TEXT, activo INTEGER DEFAULT 1, orden INTEGER DEFAULT 0, actualizado TEXT, PRIMARY KEY (catalogo, codigo))');
    if (!simular) await enLotes(db, datos.medios.map((m, i) => ({
      sql: `INSERT INTO catalogos_hacienda (catalogo, codigo, descripcion, activo, orden, actualizado) VALUES ('medios_pago', ?, ?, 1, ?, ?)
            ON CONFLICT(catalogo, codigo) DO UPDATE SET descripcion = excluded.descripcion, activo = 1, orden = excluded.orden, actualizado = excluded.actualizado`,
      args: [m.codigo, m.descripcion, i, hoy],
    })));
    r.medios = `${datos.medios.length} medios de pago`;
  }
  return r;
}

async function main() {
  const datos = {};
  if (opcion('cabys')) datos.cabys = leerCabys(opcion('cabys'));
  if (opcion('ubicaciones')) datos.ubicaciones = leerUbicaciones(opcion('ubicaciones'));
  if (opcion('medios')) datos.medios = leerMedios(opcion('medios'));
  if (!Object.keys(datos).length) {
    console.log('Indica al menos un archivo: --cabys, --ubicaciones o --medios. Mira el encabezado de este script para el detalle.');
    process.exit(1);
  }
  const lista = bases();
  console.log(`${simular ? '[simulación] ' : ''}Actualizando ${lista.length} base${lista.length === 1 ? '' : 's'}…`);
  let fallos = 0;
  for (const b of lista) {
    try {
      const db = createClient(b);
      const r = await actualizar(db, datos);
      console.log(`✓ ${b.url}: ${Object.values(r).join(' · ')}`);
      db.close();
    } catch (e) {
      fallos++;
      console.log(`✗ ${b.url}: ${e.message}`);
    }
  }
  process.exit(fallos ? 1 : 0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
