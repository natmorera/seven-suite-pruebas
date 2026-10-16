// Alta automática del proveedor (y su cuenta auxiliar nivel 4) cuando se
// importa una compra de alguien que todavía no está en la base de terceros.
import type { Client } from '@libsql/client';
import type { Perfil } from '@/data/terceros';
import { perfilAColumnas, filaAPerfil, type ClienteDb } from '@/data/terceros';
import { ACTIVIDADES_ECONOMICAS } from '@/data/actividadesEconomicas';
import { DETALLE_PROVEEDORES, DETALLE_CLIENTES, soloDigitos, cuentasTerceros, siguienteAuxiliar, type TerceroFila } from '@/lib/cuentasContables';

export async function asegurarProveedor(db: Client, p: { nombre: string; identificacion?: string; correo?: string; cuentaCode: string; tipoIdentificacion?: string }) {
  const ced = soloDigitos(p.identificacion);
  // ¿Ya existe por cédula o por esa misma cuenta?
  const { rows } = await db.execute({ sql: `SELECT id, numero_identificacion, datos_json FROM clientes WHERE tipo = 'proveedor'`, args: [] });
  for (const r of rows) {
    if (ced && soloDigitos(String(r.numero_identificacion ?? '')) === ced) return String(r.id);
    try {
      const perfil = JSON.parse(String(r.datos_json ?? '{}')) as Partial<Perfil>;
      if (perfil.cuentaCode && `${perfil.cuentaCode}-${perfil.auxId}` === p.cuentaCode) return String(r.id);
    } catch { /* sin perfil */ }
  }
  const partes = p.cuentaCode.split('-');
  const auxId = partes.length === 4 ? partes[3] : '0001';
  const detalle = partes.length === 4 ? partes.slice(0, 3).join('-') : DETALLE_PROVEEDORES.code;
  const id = 'prov-' + Math.random().toString(36).slice(2);
  const perfil: Perfil = {
    id, auxId, tipo: '04', activo: true, nombre: p.nombre, tipoIdentificacion: ced.length === 9 ? 'fisica' : 'juridica',
    numeroIdentificacion: p.identificacion ?? '', pais: 'CR', correo: p.correo ?? '', telefono: '', contacto: '', direccion: '',
    cuentaCode: detalle, cuentaNombre: DETALLE_PROVEEDORES.nombre, bancarias: [], diasCredito: 0,
    tipoIdTributaria: p.tipoIdentificacion || (ced.length === 9 ? '01' : '02'), nombreComercial: '', representanteLegal: '', actividadEconomica: '',
    regimenTributario: '', provincia: '', canton: '', distrito: '', barrioSenas: '', creadoPor: 'importación de compras', creadoEn: new Date().toISOString().slice(0, 10),
  };
  const c = perfilAColumnas(perfil);
  await db.execute({
    sql: `INSERT INTO clientes (id, nombre, tipo, tipo_identificacion, numero_identificacion, email, telefono, direccion_fiscal,
            actividad_economica, dias_credito, nombre_comercial, activo, datos_json, es_receptor, con_cuenta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
    args: [id, c.nombre, c.tipo, c.tipo_identificacion, c.numero_identificacion, c.email, c.telefono, c.direccion_fiscal,
      c.actividad_economica, c.dias_credito, c.nombre_comercial, c.activo, c.datos_json],
  });
  return id;
}

// Crea (si no la tiene) la cuenta auxiliar nivel 4 de un tercero existente:
// clientes bajo 110-001-0001, proveedores bajo 300-001-0001. Devuelve el código.
export async function crearCuentaTercero(db: Client, terceroId: string): Promise<string | null> {
  const { rows } = await db.execute({ sql: 'SELECT * FROM clientes WHERE id = ?', args: [terceroId] });
  const r = rows[0] as unknown as ClienteDb | undefined;
  if (!r) return null;
  const esProv = r.tipo === 'proveedor';
  let perfil: Perfil | null = null;
  try { perfil = r.datos_json ? JSON.parse(String(r.datos_json)) : null; } catch { perfil = null; }
  if (perfil?.cuentaCode && perfil.auxId && Number(r.con_cuenta ?? 1) === 1) return `${perfil.cuentaCode}-${perfil.auxId}`;
  const { rows: todos } = await db.execute({ sql: `SELECT id, nombre, tipo, numero_identificacion, datos_json FROM clientes WHERE tipo = ? AND COALESCE(con_cuenta, 1) = 1`, args: [r.tipo] });
  const existentes = cuentasTerceros(esProv ? 'proveedor' : 'cliente', todos as unknown as TerceroFila[]);
  const detalle = esProv ? DETALLE_PROVEEDORES : DETALLE_CLIENTES;
  const code = siguienteAuxiliar(detalle.code, existentes);
  const base = perfil ?? filaAPerfil(r);
  const nuevo: Perfil = { ...base, id: r.id, tipo: esProv ? '04' : '02', auxId: code.split('-')[3], cuentaCode: detalle.code, cuentaNombre: detalle.nombre };
  await db.execute({ sql: 'UPDATE clientes SET datos_json = ?, con_cuenta = 1 WHERE id = ?', args: [JSON.stringify(nuevo), r.id] });
  return code;
}

// Cuenta auxiliar de un tercero (o null si es solo receptor).
export async function cuentaDeTercero(db: Client, terceroId: string | null | undefined): Promise<string | null> {
  if (!terceroId) return null;
  const { rows } = await db.execute({ sql: 'SELECT datos_json, con_cuenta FROM clientes WHERE id = ?', args: [terceroId] });
  const r = rows[0];
  if (!r || Number(r.con_cuenta ?? 1) !== 1 || !r.datos_json) return null;
  try { const p = JSON.parse(String(r.datos_json)) as Perfil; return p.cuentaCode && p.auxId ? `${p.cuentaCode}-${p.auxId}` : null; } catch { return null; }
}

// Documentos que llegan de PMS/POS con cédula pero sin clienteId: se busca
// el receptor por cédula y, si no existe, se crea como "solo receptor".
export async function buscarOCrearReceptor(db: Client, p: { nombre?: string; tipoIdentificacion?: string; identificacion?: string; email?: string }): Promise<string | null> {
  const ced = soloDigitos(p.identificacion);
  if (!ced || /^0+$/.test(ced)) return null;
  const { rows } = await db.execute(`SELECT id, numero_identificacion FROM clientes WHERE tipo <> 'proveedor' OR es_receptor = 1`);
  const hit = rows.find(x => soloDigitos(String(x.numero_identificacion ?? '')) === ced);
  if (hit) return String(hit.id);
  const id = 'cli-' + Math.random().toString(36).slice(2);
  await db.execute({
    sql: `INSERT INTO clientes (id, nombre, tipo, tipo_identificacion, numero_identificacion, email, es_receptor, con_cuenta) VALUES (?, ?, 'cliente', ?, ?, ?, 1, 0)`,
    args: [id, p.nombre || 'Cliente', p.tipoIdentificacion || '01', p.identificacion ?? '', p.email ?? null],
  });
  return id;
}

// La actividad con la que el proveedor emitió su factura (viene en el XML).
// Si su perfil todavía no la tiene, se le agrega. Devuelve «código - nombre».
export async function registrarActividadProveedor(db: Client, identificacion: string | null | undefined, actividad: string | null | undefined): Promise<string | null> {
  const codigo = String(actividad ?? '').split(' - ')[0].trim();
  if (!codigo) return null;
  const completa = String(actividad).includes(' - ') ? String(actividad) : (() => { const a = ACTIVIDADES_ECONOMICAS.find(x => x.codigo === codigo); return a ? `${codigo} - ${a.nombre}` : codigo; })();
  const ced = soloDigitos(identificacion);
  if (!ced) return completa;
  const { rows } = await db.execute({ sql: `SELECT id, actividades_json, actividad_economica FROM clientes WHERE REPLACE(REPLACE(COALESCE(numero_identificacion,''),'-',''),' ','') = ? LIMIT 1`, args: [ced] });
  const t = rows[0];
  if (!t) return completa;
  let l: string[] = [];
  try { l = t.actividades_json ? JSON.parse(String(t.actividades_json)) : (t.actividad_economica ? [String(t.actividad_economica)] : []); } catch { l = []; }
  if (!l.some(x => String(x).split(' - ')[0] === codigo)) {
    l.push(completa);
    await db.execute({ sql: `UPDATE clientes SET actividades_json = ?, actividad_economica = COALESCE(NULLIF(actividad_economica, ''), ?) WHERE id = ?`, args: [JSON.stringify(l), completa, String(t.id)] });
  }
  return completa;
}

// Mi actividad (hotel) por defecto para una compra: la asociada al proveedor
// si es una de mis actividades inscritas; si no, mi actividad principal.
export async function miActividadPorDefecto(db: Client, identificacion: string | null | undefined): Promise<string | null> {
  const { rows: em } = await db.execute('SELECT actividad_economica, actividades_json FROM emisores ORDER BY activo DESC LIMIT 1');
  let mias: string[] = [];
  try {
    const acts: { codigo: string; nombre: string; principal?: boolean }[] = em[0]?.actividades_json ? JSON.parse(String(em[0].actividades_json)) : [];
    mias = acts.sort((a, b) => Number(Boolean(b.principal)) - Number(Boolean(a.principal))).map(a => `${a.codigo} - ${a.nombre}`);
  } catch { mias = []; }
  if (!mias.length && em[0]?.actividad_economica) mias = [String(em[0].actividad_economica)];
  const ced = soloDigitos(identificacion);
  if (ced) {
    const { rows } = await db.execute({ sql: `SELECT actividad_empresa FROM clientes WHERE REPLACE(REPLACE(COALESCE(numero_identificacion,''),'-',''),' ','') = ? AND COALESCE(actividad_empresa,'') <> '' LIMIT 1`, args: [ced] });
    const asociada = String(rows[0]?.actividad_empresa ?? '');
    const mia = mias.find(a => a.split(' - ')[0] === asociada.split(' - ')[0]);
    if (asociada && mia) return mia;
  }
  return mias[0] ?? null;
}
