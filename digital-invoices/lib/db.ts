import { createClient, type Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { EMISORES, EMISORES_GT } from '@/data/emisoresData';
import { conPais, paisDeSolicitud, paisEnCurso } from '@/lib/paisServidor';
import type { PerfilPais } from '@/lib/perfilPais';
import { CAJAS } from '@/data/cajasData';
import { DOCUMENTOS_EMITIDOS } from '@/data/documentosData';
import { DOCUMENTOS_RECIBIDOS } from '@/data/recepcionData';
import { CORREOS } from '@/data/buzonData';
import { TERCEROS_SEMILLA, perfilAColumnas } from '@/data/terceros';
import { generarClave } from '@/lib/clave';
import { crearCuentaTercero, miActividadPorDefecto } from '@/lib/tercerosServidor';
import { tiposDocumento, tiposNumeracion } from '@/data/catalogosHacienda';
import { CABYS, CABYS_REEMPLAZO } from '@/data/cabysData';
import { migrarGruposGT } from '@/lib/migracionGruposGT';

// Persistencia con SQLite (libsql). Sin configuración usa un archivo local.
// En producción se apunta a una base de Turso con las variables de entorno
// TURSO_DATABASE_URL y TURSO_AUTH_TOKEN; el resto del código no cambia.
// Cada país tiene su base: las empresas de Guatemala usan
// TURSO_DATABASE_URL_GT y TURSO_AUTH_TOKEN_GT (o el archivo facturacion-gt.db).

// Carpeta de archivos del servidor (base local y certificados). En Vercel
// solo se puede escribir en /tmp, que se borra cuando la función se recicla:
// para guardar datos de verdad allí hay que usar TURSO_DATABASE_URL.
export function carpetaDatos(...partes: string[]): string {
  const base = process.env.VERCEL ? path.join('/tmp', 'data-runtime') : path.join(process.cwd(), 'data-runtime');
  return path.join(base, ...partes);
}

const clientes: Partial<Record<PerfilPais, Client>> = {};
const listas: Partial<Record<PerfilPais, Promise<void>>> = {};

function getClient(pais: PerfilPais): Client {
  if (!clientes[pais]) {
    const gt = pais === 'GT';
    const remota = gt ? process.env.TURSO_DATABASE_URL_GT : process.env.TURSO_DATABASE_URL;
    if (remota) {
      clientes[pais] = createClient({ url: remota, authToken: gt ? process.env.TURSO_AUTH_TOKEN_GT : process.env.TURSO_AUTH_TOKEN });
    } else {
      const dir = carpetaDatos();
      fs.mkdirSync(dir, { recursive: true });
      clientes[pais] = createClient({ url: `file:${path.join(dir, gt ? 'facturacion-gt.db' : 'facturacion.db')}` });
    }
  }
  return clientes[pais]!;
}

async function migrar(db: Client, pais: PerfilPais) {
  // Datos de ejemplo del país de la base: Hotel Fortuna (Costa Rica) o Hotel Guatemala
  const gt = pais === 'GT';
  await db.batch([
    `CREATE TABLE IF NOT EXISTS emisores (
      id TEXT PRIMARY KEY, razon_social TEXT, nombre_comercial TEXT, cedula_juridica TEXT,
      tipo_identificacion TEXT DEFAULT '02',
      actividad_economica TEXT, regimen TEXT, llave_cargada INTEGER DEFAULT 0,
      vigencia_llave TEXT, llave_pin TEXT, llave_pfx_path TEXT, activo INTEGER DEFAULT 1,
      correo_electronico TEXT, telefono TEXT, direccion_fiscal TEXT,
      registro_bebidas_alcoholicas TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS cajas_numeracion (
      id TEXT PRIMARY KEY, caja_id TEXT, tipo_documento TEXT, consecutivo_actual INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS cajas (
      id TEXT PRIMARY KEY, sucursal TEXT, terminal TEXT, nombre TEXT, emisor_id TEXT,
      consecutivo_actual INTEGER DEFAULT 0, activa INTEGER DEFAULT 1,
      numeracion_continuada INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT DEFAULT 'cliente',
      tipo_identificacion TEXT DEFAULT '01', numero_identificacion TEXT, email TEXT,
      telefono TEXT, direccion_fiscal TEXT,
      exonerado INTEGER DEFAULT 0, exoneracion_codigo TEXT, exoneracion_porcentaje REAL,
      exoneracion_articulo TEXT, exoneracion_inciso TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS documentos_emitidos (
      id TEXT PRIMARY KEY, tipo TEXT, numero_factura TEXT, clave TEXT,
      cliente_id TEXT, cliente_nombre TEXT, receptor_email TEXT, emisor_id TEXT, caja_id TEXT,
      fecha_emision TEXT, estado TEXT, recurrente INTEGER DEFAULT 0,
      condicion_venta TEXT DEFAULT '01', medios_pago TEXT DEFAULT '["01"]', es_borrador INTEGER DEFAULT 0,
      moneda TEXT DEFAULT 'CRC', tipo_cambio REAL DEFAULT 1,
      subtotal REAL, iva REAL, total REAL, xml TEXT, respuesta_xml TEXT,
      referencia_documento TEXT, referencia_motivo TEXT,
      origen TEXT DEFAULT 'Manual', origen_referencia TEXT,
      estado_envio TEXT DEFAULT 'pendiente', intentos_envio INTEGER DEFAULT 0, ultimo_error TEXT
    )`,
    // codigo_tarifa: el código real del catálogo de Hacienda (ver
    // data/catalogosHacienda.ts TARIFAS_IVA) — '08' es 13%, '10' es exenta,
    // etc. `impuesto` (el %) se sigue guardando también, calculado a partir
    // de este código, para no romper lo que ya lee ese número (el Reporte
    // de IVA, el asiento automático).
    `CREATE TABLE IF NOT EXISTS documentos_emitidos_lineas (
      id TEXT PRIMARY KEY, documento_id TEXT, codigo_cabys TEXT, descripcion TEXT,
      cantidad REAL, precio_unitario REAL, impuesto REAL, codigo_tarifa TEXT DEFAULT '08'
    )`,
    // origen: 'xml' (subida manual de XML), 'correo' (importado desde la
    // Bandeja de entrada) o 'manual' (digitado a mano, sin XML — para
    // comprobantes que no llegan como factura electrónica).
    // tipo_credito_fiscal: 'pleno' | 'parcial' | 'sin_derecho' — necesario
    // para el reporte de IVA (ver Mapa de requerimientos, sección 5).
    `CREATE TABLE IF NOT EXISTS documentos_recibidos (
      id TEXT PRIMARY KEY, proveedor TEXT, numero_factura TEXT, fecha_emision TEXT,
      fecha_aceptacion TEXT, estado TEXT, total_factura REAL,
      subtotal REAL, iva REAL, tarifa REAL DEFAULT 13,
      tipo_credito_fiscal TEXT DEFAULT 'pleno', origen TEXT DEFAULT 'xml'
    )`,
    `CREATE TABLE IF NOT EXISTS correos (
      id TEXT PRIMARY KEY, remitente TEXT, asunto TEXT, snippet TEXT, fecha TEXT,
      favorito INTEGER DEFAULT 0, leido INTEGER DEFAULT 1, tiene_adjunto_xml INTEGER DEFAULT 0,
      importado INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS correos_enviados (
      id TEXT PRIMARY KEY, destinatario TEXT, asunto TEXT, cuerpo TEXT, fecha TEXT, estado TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS cabys_favoritos (
      id TEXT PRIMARY KEY, actividad_economica TEXT, codigo TEXT, descripcion TEXT, impuesto REAL DEFAULT 13,
      precio_unitario REAL DEFAULT 0, unidad_medida TEXT DEFAULT 'Unid', codigo_interno TEXT DEFAULT '', notas TEXT DEFAULT '',
      nombre TEXT DEFAULT '', tipo_codigo TEXT DEFAULT '', partida_arancelaria TEXT DEFAULT ''
    )`,
    // Integración Facturación → Contabilidad. Estas tres tablas son nuevas y
    // no reemplazan nada de Contabilidad (Bandeja de asientos / Catálogo de
    // cuentas siguen existiendo igual); solo permiten que un documento
    // aceptado ante Hacienda genere un asiento real y persistido, en vez de
    // quedar solo en documentos_emitidos.
    //
    // mapeo_contable_facturacion: qué cuenta del catálogo real (ver
    // components/pages/catalogo/catalogoData.ts) usar para cada pata del
    // asiento automático. Una fila por emisor; si un emisor no tiene fila
    // propia, se usa la fila 'default' (ver seed abajo).
    // cuenta_gastos / cuenta_iva_compras / cuenta_proveedores: la mitad que
    // faltaba de este mapeo — las compras nunca generaban asiento, solo las
    // ventas. cuenta_iva_compras es "acreditable" (activo), no "por pagar"
    // como el de ventas; son cuentas distintas del catálogo real.
    `CREATE TABLE IF NOT EXISTS mapeo_contable_facturacion (
      emisor_id TEXT PRIMARY KEY,
      cuenta_ventas TEXT, cuenta_iva_ventas TEXT, cuenta_cxc TEXT, cuenta_caja TEXT, cuenta_banco TEXT,
      cuenta_gastos TEXT, cuenta_iva_compras TEXT, cuenta_proveedores TEXT
    )`,
    // asientos / asientos_lineas: mismo shape que la interfaz Asiento /
    // LineaAsiento de components/pages/asientos/BandejaAsientos.tsx, para
    // que la Bandeja pueda leerlos y mezclarlos con sus datos de ejemplo sin
    // cambiar su formato. documento_ref_id enlaza al documento emitido que
    // originó el asiento (evita generar el asiento dos veces).
    `CREATE TABLE IF NOT EXISTS asientos (
      id TEXT PRIMARY KEY, tipo TEXT DEFAULT 'A', origen TEXT, fecha TEXT, consecutivo TEXT,
      titulo TEXT, moneda TEXT DEFAULT 'CRC', importe REAL, usuario TEXT DEFAULT 'sistema',
      documento TEXT, observacion TEXT, contabilizado INTEGER DEFAULT 0,
      documento_ref_id TEXT, anulado INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS asientos_lineas (
      id TEXT PRIMARY KEY, asiento_id TEXT, cuenta TEXT, descripcion TEXT, c_costos TEXT DEFAULT '',
      debe REAL DEFAULT 0, haber REAL DEFAULT 0
    )`,
    // Las pantallas de Configuración > Facturación electrónica > Impuestos
    // y Exoneraciones eran solo useState — el botón "Guardar cambios" ni
    // siquiera tenía onClick. Una sola fila ('default') porque hoy es una
    // configuración por cuenta, no por emisor.
    // Impuestos, retenciones y exoneraciones eran una sola fila de
    // "valores por defecto" — pero son catálogos reales (varios registros
    // que se crean, editan y desactivan), como en Alegra. impuesto_acreditable
    // solo aplica a impuestos (si ese IVA genera crédito fiscal en compras).
    `CREATE TABLE IF NOT EXISTS impuestos (
      id TEXT PRIMARY KEY, nombre TEXT NOT NULL, tipo TEXT DEFAULT '', porcentaje REAL DEFAULT 0,
      impuesto_acreditable INTEGER DEFAULT 0, descripcion TEXT DEFAULT '', activo INTEGER DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS retenciones (
      id TEXT PRIMARY KEY, nombre TEXT NOT NULL, tipo TEXT DEFAULT '', porcentaje REAL DEFAULT 0,
      descripcion TEXT DEFAULT '', activo INTEGER DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS exoneraciones (
      id TEXT PRIMARY KEY, nombre TEXT NOT NULL, tipo_documento TEXT DEFAULT '04', numero_documento TEXT DEFAULT '',
      institucion TEXT DEFAULT '01', fecha_emision TEXT DEFAULT '', porcentaje REAL DEFAULT 100,
      articulo TEXT DEFAULT '', inciso TEXT DEFAULT '0', descripcion TEXT DEFAULT '', activo INTEGER DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS parametros_facturacion (
      id TEXT PRIMARY KEY DEFAULT 'default',
      condicion_impuesto_default TEXT DEFAULT '01',
      prorratear_iva INTEGER DEFAULT 0,
      aplica_exoneracion INTEGER DEFAULT 0,
      exoneracion_codigo TEXT DEFAULT '',
      exoneracion_porcentaje REAL DEFAULT 100,
      exoneracion_articulo TEXT DEFAULT '',
      exoneracion_inciso TEXT DEFAULT ''
    )`,
  ]);

  const COLUMNAS_COMPRA: [string, string][] = [
    ['clave', 'TEXT'], ['tipo', "TEXT DEFAULT 'Factura electrónica'"],
    ['proveedor_identificacion', 'TEXT'], ['proveedor_correo', 'TEXT'],
    ['receptor_identificacion', 'TEXT'], ['moneda', "TEXT DEFAULT 'CRC'"], ['tipo_cambio', 'REAL DEFAULT 1'],
    ['total_exento', 'REAL DEFAULT 0'], ['total_descuentos', 'REAL DEFAULT 0'], ['total_otros_cargos', 'REAL DEFAULT 0'],
    ['actividad_economica', 'TEXT'], ['lineas_json', 'TEXT'], ['xml', 'TEXT'], ['correo_id', 'TEXT'],
    ['tipo_acuse', 'TEXT'], ['mensaje_acuse', 'TEXT'], ['ultimo_error', 'TEXT'],
  ];
  const { rows: colsCompra } = await db.execute('PRAGMA table_info(documentos_recibidos)');
  const existentes = new Set(colsCompra.map(c => String(c.name)));
  for (const [col, def] of COLUMNAS_COMPRA) {
    if (!existentes.has(col)) await db.execute(`ALTER TABLE documentos_recibidos ADD COLUMN ${col} ${def}`);
  }
  // El número de los comprobantes emitidos se guarda completo (20 dígitos), como en la clave
  await db.execute(`UPDATE documentos_emitidos SET numero_factura = substr(clave, 22, 20)
    WHERE length(clave) = 50 AND length(COALESCE(numero_factura, '')) < 20`).catch(() => {});
  // ── Clientes / proveedores: una sola base para Contabilidad y Facturación ──
  const COLUMNAS_TERCEROS: [string, string][] = [
    ['actividad_economica', 'TEXT'], ['dias_credito', 'INTEGER DEFAULT 0'], ['nombre_comercial', 'TEXT'],
    ['activo', 'INTEGER DEFAULT 1'], ['datos_json', 'TEXT'],
  ];
  const { rows: colsTer } = await db.execute('PRAGMA table_info(clientes)');
  const colsTerSet = new Set(colsTer.map(c => String(c.name)));
  for (const [col, def] of COLUMNAS_TERCEROS) {
    if (!colsTerSet.has(col)) await db.execute(`ALTER TABLE clientes ADD COLUMN ${col} ${def}`);
  }
  await db.execute(`UPDATE clientes SET nombre = 'SHL SOLUCIONES HOTELERAS DE LATINOAMERICA LIMITADA', tipo = 'cliente' WHERE id = 'cli-1' AND nombre = 'cliente'`);
  await db.execute(`UPDATE clientes SET nombre = 'IRAZÚ STRATEGIC DESIGN STUDIO S.A.', tipo = 'cliente' WHERE id = 'cli-2' AND nombre = 'cliente'`);
  // Datos personales que venían en la semilla vieja: se reemplazan por receptores de ejemplo de hotel
  await db.execute(`DELETE FROM clientes WHERE (id IN ('cli-1', 'cli-2')) OR nombre LIKE 'SHL SOLUCIONES%' OR nombre LIKE 'IRAZ%STRATEGIC%'`);
  const RECEPTORES_HOTEL: [string, string, string, string, string, string, string][] = [
    ['cli-h1', 'Arenal Adventure Tours S.A.', '02', '3101555123', 'facturas@arenaladventure.cr', '2479-1111', 'Alajuela, San Carlos, La Fortuna, frente al parque'],
    ['cli-h2', 'Agencia de Viajes Volcán Tropical S.A.', '02', '3101666234', 'contabilidad@volcantropical.cr', '2222-3344', 'San José, San José, Carmen, avenida 1'],
    ['cli-h3', 'María Fernanda Solano Rojas', '01', '205550777', 'mfsolano@correo.cr', '8888-1234', 'Alajuela, San Carlos, Quesada'],
    ['cli-h4', 'Nature Travel Group LLC', '05', 'US-884521', 'billing@naturetravel.com', '+1 305 555 0101', 'Miami, Florida, Estados Unidos'],
  ];
  for (const [id, nombre, tipoId, num, email, tel, dir] of RECEPTORES_HOTEL) {
    await db.execute({ sql: `INSERT OR IGNORE INTO clientes (id, nombre, tipo, tipo_identificacion, numero_identificacion, email, telefono, direccion_fiscal) VALUES (?, ?, 'cliente', ?, ?, ?, ?, ?)`, args: [id, nombre, tipoId, num, email, tel, dir] });
  }
  // La dirección fiscal del hotel es en La Fortuna, San Carlos
  await db.execute(`UPDATE emisores SET direccion_fiscal = 'Alajuela, San Carlos, La Fortuna, 21007, 400 m oeste de la iglesia católica', telefono = '2479-0000' WHERE direccion_fiscal LIKE '%Montes de Oca%'`);

  // Traer una sola vez los clientes/proveedores que ya existían en Contabilidad.
  const { rows: conPerfil } = await db.execute('SELECT COUNT(*) AS n FROM clientes WHERE datos_json IS NOT NULL');
  if (Number(conPerfil[0].n) === 0) {
    for (const p of TERCEROS_SEMILLA) {
      const c = perfilAColumnas(p);
      await db.execute({
        sql: `INSERT OR IGNORE INTO clientes (id, nombre, tipo, tipo_identificacion, numero_identificacion, email, telefono, direccion_fiscal,
                actividad_economica, dias_credito, nombre_comercial, activo, datos_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: ['ter-' + p.id, c.nombre, c.tipo, c.tipo_identificacion, c.numero_identificacion, c.email, c.telefono, c.direccion_fiscal,
          c.actividad_economica, c.dias_credito, c.nombre_comercial, c.activo, c.datos_json],
      });
    }
  }

  // ── Ventas: campos de TRIBU-CR que faltaban (descuentos, exoneración,
  // otros cargos, referencia, observaciones, actividad del receptor) ─────────
  const COLUMNAS_VENTA: [string, string, string][] = [
    ['documentos_emitidos', 'total_descuentos', 'REAL DEFAULT 0'], ['documentos_emitidos', 'total_otros_cargos', 'REAL DEFAULT 0'],
    ['documentos_emitidos', 'otros_cargos_json', 'TEXT'], ['documentos_emitidos', 'referencia_json', 'TEXT'],
    ['documentos_emitidos', 'observaciones', 'TEXT'], ['documentos_emitidos', 'actividad_receptor', 'TEXT'],
    ['documentos_emitidos', 'receptor_tipo_identificacion', 'TEXT'], ['documentos_emitidos', 'receptor_identificacion', 'TEXT'],
    ['documentos_emitidos_lineas', 'descuento', 'REAL DEFAULT 0'], ['documentos_emitidos_lineas', 'descuento_json', 'TEXT'],
    ['documentos_emitidos_lineas', 'exoneracion_json', 'TEXT'], ['documentos_emitidos_lineas', 'unidad_medida', "TEXT DEFAULT 'Unid'"],
  ];
  for (const tabla of ['documentos_emitidos', 'documentos_emitidos_lineas']) {
    const { rows: cols } = await db.execute(`PRAGMA table_info(${tabla})`);
    const set = new Set(cols.map(c => String(c.name)));
    for (const [t, col, def] of COLUMNAS_VENTA) {
      if (t === tabla && !set.has(col)) await db.execute(`ALTER TABLE ${tabla} ADD COLUMN ${col} ${def}`);
    }
  }

  // Estado 'Recibido' = importada, sin acuse todavía. Los datos viejos usaban
  // 'Emitido'/'Procesando' para lo mismo (el acuse pasa directo a
  // Aceptado/Rechazado), así que se normalizan una sola vez.
  await db.execute(`UPDATE documentos_recibidos SET estado = 'Recibido'
    WHERE estado IN ('Emitido', 'Procesando') AND fecha_aceptacion IS NULL AND tipo_acuse IS NULL`);

  const { rows } = await db.execute('SELECT COUNT(*) as n FROM emisores');
  if (Number(rows[0].n) === 0) {
    for (const e of gt ? EMISORES_GT : EMISORES) {
      await db.execute({
        sql: `INSERT INTO emisores (id, razon_social, nombre_comercial, cedula_juridica, actividad_economica, regimen, llave_cargada, vigencia_llave, activo, correo_electronico, telefono, direccion_fiscal)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [e.id, e.razonSocial, e.nombreComercial, e.cedulaJuridica, e.actividadEconomica, e.regimen, e.llaveCargada ? 1 : 0, e.vigenciaLlave ?? null, e.activo ? 1 : 0,
          ...(gt ? ['facturacion@hotelguatemala.com.gt', '7952-8700', 'Calle 30 de Junio, zona 0, Flores, Petén, 17001']
            : ['facturacion@hotelfortuna.cr', '2479-0000', 'Alajuela, San Carlos, La Fortuna, 21007, 400 m oeste de la iglesia católica'])],
      });
    }
    for (const c of CAJAS) {
      await db.execute({
        sql: `INSERT INTO cajas (id, sucursal, terminal, nombre, emisor_id, consecutivo_actual, activa) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [c.id, c.sucursal, c.terminal, c.nombre, c.emisorId, c.consecutivoActual, c.activa ? 1 : 0],
      });
      // Semilla de numeración por tipo de documento — la de 'Factura
      // electrónica' arranca donde ya estaba la caja (datos de demo);
      // el resto arranca en 0, que es lo normal para una caja nueva.
      for (const tipo of tiposDocumento()) {
        await db.execute({
          sql: `INSERT INTO cajas_numeracion (id, caja_id, tipo_documento, consecutivo_actual) VALUES (?, ?, ?, ?)`,
          args: ['cn-' + Math.random().toString(36).slice(2), c.id, tipo, tipo === 'Factura electrónica' ? c.consecutivoActual : 0],
        });
      }
    }
    const ORIGENES_DEMO = ['Front Desk', 'Punto de Venta (POS)', 'Manual', 'Front Desk', 'Tour Operador', 'Front Desk', 'Punto de Venta (POS)', 'Manual'];
    for (const [i, d] of DOCUMENTOS_EMITIDOS.entries()) {
      await db.execute({
        sql: `INSERT INTO documentos_emitidos (id, tipo, numero_factura, clave, cliente_nombre, fecha_emision, estado, recurrente, condicion_venta, medios_pago, subtotal, iva, total, estado_envio, origen)
              VALUES (?, 'Factura electrónica', ?, '', ?, ?, ?, ?, '01', '["01"]', ?, ?, ?, 'enviado', ?)`,
        args: [d.id, d.numeroFactura, d.cliente, d.fechaEmision, d.estado, d.recurrente ? 1 : 0, d.totalFactura * 0.885, d.totalFactura * 0.115, d.totalFactura, ORIGENES_DEMO[i % ORIGENES_DEMO.length]],
      });
    }
    for (const d of DOCUMENTOS_RECIBIDOS) {
      await db.execute({
        sql: `INSERT INTO documentos_recibidos (id, proveedor, numero_factura, fecha_emision, fecha_aceptacion, estado, total_factura) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [d.id, d.proveedor, d.numeroFactura, d.fechaEmision, d.fechaAceptacion, d.estado, d.totalFactura],
      });
    }
    for (const c of CORREOS) {
      await db.execute({
        sql: `INSERT INTO correos (id, remitente, asunto, snippet, fecha, favorito, leido, tiene_adjunto_xml, importado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [c.id, c.remitente, c.asunto, c.snippet, c.fecha, c.favorito ? 1 : 0, c.leido ? 1 : 0, c.tieneAdjuntoXml ? 1 : 0, c.importado ? 1 : 0],
      });
    }
    const CLIENTES_SEED = [
      { id: 'cli-h1', nombre: 'Arenal Adventure Tours S.A.', tipo_identificacion: '02', numero_identificacion: '3101555123', email: 'facturas@arenaladventure.cr', telefono: '2479-1111', direccion_fiscal: 'Alajuela, San Carlos, La Fortuna, frente al parque' },
      { id: 'cli-h2', nombre: 'Agencia de Viajes Volcán Tropical S.A.', tipo_identificacion: '02', numero_identificacion: '3101666234', email: 'contabilidad@volcantropical.cr', telefono: '2222-3344', direccion_fiscal: 'San José, San José, Carmen, avenida 1' },
      { id: 'cli-h3', nombre: 'María Fernanda Solano Rojas', tipo_identificacion: '01', numero_identificacion: '205550777', email: 'mfsolano@correo.cr', telefono: '8888-1234', direccion_fiscal: 'Alajuela, San Carlos, Quesada' },
    ];
    for (const c of CLIENTES_SEED) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO clientes (id, nombre, tipo, tipo_identificacion, numero_identificacion, email, telefono, direccion_fiscal) VALUES (?, ?, 'cliente', ?, ?, ?, ?, ?)`,
        args: [c.id, c.nombre, c.tipo_identificacion, c.numero_identificacion, c.email, c.telefono, c.direccion_fiscal],
      });
    }
    const CABYS_FAV_SEED = [
      { actividad: '551001 - Servicios de alojamiento', codigo: '6311100000000', descripcion: 'Servicio de alojamiento en hotel', impuesto: 13 },
      { actividad: '551001 - Servicios de alojamiento', codigo: '6331000000000', descripcion: 'Servicio de alimentación - restaurante', impuesto: 13 },
      { actividad: '551001 - Servicios de alojamiento', codigo: '6340002019900', descripcion: 'Servicio de bar / bebidas', impuesto: 13 },
      { actividad: '551001 - Servicios de alojamiento', codigo: '9723000000100', descripcion: 'Servicio de spa / masajes', impuesto: 13 },
    ];
    for (const c of CABYS_FAV_SEED) {
      await db.execute({
        sql: `INSERT INTO cabys_favoritos (id, actividad_economica, codigo, descripcion, impuesto) VALUES (?, ?, ?, ?, ?)`,
        args: ['fav-' + Math.random().toString(36).slice(2), c.actividad, c.codigo, c.descripcion, c.impuesto],
      });
    }
    // Mapeo contable por defecto para el asiento automático de facturación,
    // usando códigos que SÍ existen en el catálogo real (catalogoData.ts):
    // 600-001-0001 Ingresos hospedaje, 300-002-0002 Obligaciones tributarias
    // IVA, 110-001-0001 Clientes nacionales, 100-001-0001 Fondo de caja
    // general, 100-002-0001 BAC ¢ (banco). Un emisor puede tener su propia
    // fila (ver /api/mapeo-contable) que sobrescribe esta por defecto.
    await db.execute({ sql: `INSERT INTO parametros_facturacion (id) VALUES ('default')` });
    const IMPUESTOS_SEED = [
      { nombre: 'IVA', tipo: 'IVA', porcentaje: 13, acreditable: 1 },
      { nombre: 'IVA reducido', tipo: 'IVA', porcentaje: 4, acreditable: 1 },
      { nombre: 'IVA reducido', tipo: 'IVA', porcentaje: 2, acreditable: 1 },
      { nombre: 'IVA reducido', tipo: 'IVA', porcentaje: 1, acreditable: 1 },
      { nombre: 'Ninguno', tipo: '', porcentaje: 0, acreditable: 0 },
    ];
    for (const t of IMPUESTOS_SEED) {
      await db.execute({
        sql: `INSERT INTO impuestos (id, nombre, tipo, porcentaje, impuesto_acreditable) VALUES (?, ?, ?, ?, ?)`,
        args: ['imp-' + Math.random().toString(36).slice(2), t.nombre, t.tipo, t.porcentaje, t.acreditable],
      });
    }
    const RETENCIONES_SEED = [
      { nombre: 'Retención de IVA', tipo: 'IVA', porcentaje: 2 },
      { nombre: 'Retención en la fuente (Renta)', tipo: 'Renta', porcentaje: 2 },
    ];
    for (const r of RETENCIONES_SEED) {
      await db.execute({
        sql: `INSERT INTO retenciones (id, nombre, tipo, porcentaje) VALUES (?, ?, ?, ?)`,
        args: ['ret-' + Math.random().toString(36).slice(2), r.nombre, r.tipo, r.porcentaje],
      });
    }
    await db.execute({
      sql: `INSERT INTO mapeo_contable_facturacion
        (emisor_id, cuenta_ventas, cuenta_iva_ventas, cuenta_cxc, cuenta_caja, cuenta_banco, cuenta_gastos, cuenta_iva_compras, cuenta_proveedores)
        VALUES ('default', '600-001-0001', '300-002-0002', '110-001-0001', '100-001-0001', '100-002-0001', '800-001-0005', '130-001-0004', '300-001-0001')`,
    });
  }

  await db.execute(`CREATE TABLE IF NOT EXISTS app_meta (clave TEXT PRIMARY KEY, valor TEXT)`);
  const { rows: ejemplosHechos } = await db.execute(`SELECT 1 FROM app_meta WHERE clave = 'ejemplos_ventas_v1'`);
  if (!ejemplosHechos.length) {
  const EJEMPLOS_VENTA: [string, string, string, string, string, string, number, number, string, string | null, string][] = [
    ['#24060', 'Nota de crédito', '0000000001', 'Hotel El Valle', '2026-09-18T10:20:00', 'Aceptado', 200, 26, 'Manual', '000001000000182', 'Devolución de una noche no utilizada'],
    ['#24061', 'Nota de débito', '0000000001', 'Hotel Aventura', '2026-09-19T15:05:00', 'Aceptado', 100, 13, 'Front Desk', '000001000000178', 'Cargo por minibar no facturado'],
    ['#24062', 'Tiquete electrónico', '0000000002', 'Consumidor final', '2026-09-21T20:40:00', 'Aceptado', 15000, 1950, 'Punto de Venta (POS)', null, ''],
    ['#24063', 'Tiquete electrónico', '0000000003', 'Consumidor final', '2026-09-22T13:15:00', 'Procesando', 8500, 1105, 'Punto de Venta (POS)', null, ''],
  ];
  for (const [id, tipo, num, cliente, fecha, estado, sub, iva, origen, ref, razon] of EJEMPLOS_VENTA) {
    const r = await db.execute({
      sql: `INSERT OR IGNORE INTO documentos_emitidos (id, tipo, numero_factura, clave, cliente_nombre, fecha_emision, estado, recurrente, condicion_venta, medios_pago,
              subtotal, iva, total, estado_envio, origen, referencia_documento, referencia_motivo, emisor_id, caja_id)
            VALUES (?, ?, ?, '', ?, ?, ?, 0, '01', '["01"]', ?, ?, ?, 'enviado', ?, ?, ?, 'em-1', NULL)`,
      args: [id, tipo, num, cliente, fecha, estado, sub, iva, sub + iva, origen, ref, razon || null],
    });
    if (r.rowsAffected > 0) {
      await db.execute({
        sql: `INSERT INTO documentos_emitidos_lineas (id, documento_id, codigo_cabys, descripcion, cantidad, precio_unitario, impuesto, codigo_tarifa) VALUES (?, ?, ?, ?, 1, ?, 13, '08')`,
        args: ['ln-ej-' + id.replace('#', ''), id, tipo === 'Tiquete electrónico' ? '6340002019900' : '6311100000000',
          tipo === 'Tiquete electrónico' ? 'Consumo en bar' : razon, sub],
      });
    }
  }
  await db.execute({
    sql: `INSERT OR IGNORE INTO documentos_recibidos (id, proveedor, numero_factura, fecha_emision, fecha_aceptacion, estado, total_factura, subtotal, iva, tarifa,
            tipo_credito_fiscal, origen, proveedor_identificacion, tipo_acuse, mensaje_acuse, tipo)
          VALUES ('000001000045340', 'Ferretería El Clavo S.A.', '00100001010000000077', '2026-09-10T09:30:00', '2026-09-11T08:00:00', 'Rechazado',
            5650, 5000, 650, 13, 'pleno', 'xml', '3101555111', 'rechazo', 'La factura no corresponde a una compra del hotel.', 'Factura electrónica')`,
  });
    await db.execute(`INSERT OR IGNORE INTO app_meta (clave, valor) VALUES ('ejemplos_ventas_v1', datetime('now'))`);
  }

  await migrarRonda6(db, gt);
}

async function agregarColumnas(db: Client, tabla: string, columnas: [string, string][]) {
  const { rows } = await db.execute(`PRAGMA table_info(${tabla})`);
  const set = new Set(rows.map(c => String(c.name)));
  for (const [col, def] of columnas) {
    if (!set.has(col)) await db.execute(`ALTER TABLE ${tabla} ADD COLUMN ${col} ${def}`);
  }
}
async function unaVez(db: Client, clave: string, fn: () => Promise<void>) {
  const { rows } = await db.execute({ sql: 'SELECT 1 FROM app_meta WHERE clave = ?', args: [clave] });
  if (rows.length) return;
  await fn();
  await db.execute({ sql: 'INSERT OR IGNORE INTO app_meta (clave, valor) VALUES (?, ?)', args: [clave, new Date().toISOString()] });
}

async function migrarRonda6(db: Client, gt: boolean) {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS app_meta (clave TEXT PRIMARY KEY, valor TEXT)`,
    // Sucursales del emisor (Hacienda: 3 dígitos del consecutivo). Las cajas
    // (terminales) cuelgan de una sucursal por su código.
    `CREATE TABLE IF NOT EXISTS sucursales (
      id TEXT PRIMARY KEY, emisor_id TEXT, codigo TEXT, nombre TEXT, provincia TEXT, canton TEXT, distrito TEXT,
      otras_senas TEXT, telefono TEXT, correo TEXT, activa INTEGER DEFAULT 1
    )`,
    // Lo que se aprende al clasificar compras: para este proveedor y este
    // código/descripción de línea, qué cuenta y qué artículo se usó. La
    // próxima factura del mismo proveedor ya llega sugerida.
    `CREATE TABLE IF NOT EXISTS compras_mapeo (
      clave TEXT PRIMARY KEY, proveedor_identificacion TEXT, codigo TEXT, cuenta TEXT, articulo_id TEXT, actualizado TEXT
    )`,
    // Facturas recurrentes: cada cuánto se repite un documento y cuándo toca
    // la siguiente. Al llegar la fecha se ofrece emitirla (se revisa y se emite).
    `CREATE TABLE IF NOT EXISTS documentos_recurrentes (
      id TEXT PRIMARY KEY, documento_id TEXT NOT NULL, frecuencia TEXT NOT NULL, proxima TEXT NOT NULL, fin TEXT DEFAULT '',
      activa INTEGER DEFAULT 1, creado TEXT, ultima TEXT DEFAULT '', emitidas INTEGER DEFAULT 0
    )`,
    // Comentarios de cada producto/servicio (reemplazan a «notas internas»).
    `CREATE TABLE IF NOT EXISTS productos_comentarios (
      id TEXT PRIMARY KEY, articulo_id TEXT NOT NULL, autor TEXT, texto TEXT, fecha TEXT
    )`,
    // Buzón real de facturas (IMAP). Una sola fila: el buzón del hotel.
    `CREATE TABLE IF NOT EXISTS buzon_config (
      id TEXT PRIMARY KEY, host TEXT DEFAULT '', puerto INTEGER DEFAULT 993, seguro INTEGER DEFAULT 1,
      usuario TEXT DEFAULT '', clave TEXT DEFAULT '', carpeta TEXT DEFAULT 'INBOX', dias INTEGER DEFAULT 30,
      ultimo_uid INTEGER DEFAULT 0, ultima_sync TEXT DEFAULT '', ultimo_error TEXT DEFAULT ''
    )`,
  ]);

  await agregarColumnas(db, 'correos', [
    ['xml', 'TEXT'], ['xml_respuesta', 'TEXT'], ['xml_nombre', "TEXT DEFAULT ''"], ['pdf_nombre', "TEXT DEFAULT ''"],
    ['message_id', "TEXT DEFAULT ''"], ['origen', "TEXT DEFAULT 'ejemplo'"],
  ]);

  await agregarColumnas(db, 'emisores', [
    ['provincia', 'TEXT'], ['canton', 'TEXT'], ['distrito', 'TEXT'], ['barrio', 'TEXT'], ['otras_senas', 'TEXT'],
    ['correos_adicionales', 'TEXT'], ['actividades_json', 'TEXT'], ['alias', 'TEXT'],
    ['registro_bebidas', 'TEXT'], ['registro_bebidas_vence', 'TEXT'],
    ['usuario_hacienda', 'TEXT'], ['clave_hacienda', 'TEXT'], ['certificado_nombre', 'TEXT'], ['certificado_emisor', 'TEXT'],
    ['ambiente', "TEXT DEFAULT 'pruebas'"],
  ]);
  await agregarColumnas(db, 'cabys_favoritos', [
    ['categoria', "TEXT DEFAULT ''"], ['moneda', "TEXT DEFAULT 'CRC'"], ['descripcion_larga', "TEXT DEFAULT ''"],
    ['inventariable', 'INTEGER DEFAULT 0'], ['cantidad_inicial', 'REAL DEFAULT 0'], ['cantidad_minima', 'REAL DEFAULT 0'],
    ['costo_unitario', 'REAL DEFAULT 0'], ['bodega', "TEXT DEFAULT ''"], ['cuenta_ingreso', "TEXT DEFAULT ''"],
    ['cuenta_costo', "TEXT DEFAULT ''"], ['cuenta_inventario', "TEXT DEFAULT ''"], ['imagen', "TEXT DEFAULT ''"],
    ['activo', 'INTEGER DEFAULT 1'],
  ]);
  await agregarColumnas(db, 'exoneraciones', [['tipo_documento_otro', "TEXT DEFAULT ''"], ['nombre_institucion_otros', "TEXT DEFAULT ''"]]);
  await unaVez(db, 'exo_ejemplo_puntos_v1', async () => {
    // La tarifa exonerada son puntos de la tarifa (máx. 13), no un % del impuesto.
    await db.execute(`UPDATE exoneraciones SET porcentaje = 13 WHERE id IN ('exo-ej-1','exo-ej-2','exo-ej-3') AND porcentaje = 100`);
    await db.execute(`UPDATE exoneraciones SET porcentaje = 6.5, descripcion = 'Exoneración parcial (la mitad del 13%). Reemplazar por los datos del documento real.' WHERE id = 'exo-ej-4' AND porcentaje = 50`);
    await db.execute(`UPDATE exoneraciones SET nombre_institucion_otros = 'PROCOMER', institucion = '99' WHERE id = 'exo-ej-2'`);
  });
  await agregarColumnas(db, 'documentos_recibidos', [
    ['cuenta_proveedor', 'TEXT'], ['cuenta_proveedor_nombre', 'TEXT'], ['clasificacion', "TEXT DEFAULT 'gasto'"],
  ]);

  // Los perfiles de terceros apuntaban a cuentas que no son de clientes ni
  // de proveedores (100-002-0001 es un banco y 200-001-0001 son terrenos).
  await db.execute(`UPDATE clientes SET datos_json = REPLACE(REPLACE(datos_json,
      '"cuentaCode":"200-001-0001"', '"cuentaCode":"300-001-0001"'),
      '"cuentaCode":"100-002-0001"', '"cuentaCode":"110-001-0001"')
    WHERE datos_json LIKE '%"cuentaCode":"200-001-0001"%' OR datos_json LIKE '%"cuentaCode":"100-002-0001"%'`);

  // ── Emisor: datos completos del hotel (uno por cuenta) ───────────────────
  await unaVez(db, 'emisor_datos_v1', async () => {
    if (gt) await db.execute({
      sql: `UPDATE emisores SET provincia = COALESCE(provincia, 'GT17'), canton = COALESCE(canton, 'Flores'), distrito = COALESCE(distrito, '17001'),
              barrio = COALESCE(barrio, ''), otras_senas = COALESCE(otras_senas, 'Calle 30 de Junio, zona 0'),
              actividades_json = COALESCE(actividades_json, ?), alias = COALESCE(alias, 'Hotel principal'),
              actividad_economica = CASE WHEN actividades_json IS NULL THEN '551001 - Actividades de alojamiento para estancias cortas (hoteles)' ELSE actividad_economica END,
              correo_electronico = COALESCE(correo_electronico, 'facturacion@hotelguatemala.com.gt'), telefono = COALESCE(telefono, '7952-8700')
            WHERE id = 'em-1'`,
      args: [JSON.stringify([
        { codigo: '551001', nombre: 'Actividades de alojamiento para estancias cortas (hoteles)', principal: true },
      ])],
    });
    else await db.execute({
      sql: `UPDATE emisores SET provincia = COALESCE(provincia, '2'), canton = COALESCE(canton, '10'), distrito = COALESCE(distrito, '07'),
              barrio = COALESCE(barrio, 'La Fortuna centro'), otras_senas = COALESCE(otras_senas, '400 m oeste de la iglesia católica'),
              actividades_json = COALESCE(actividades_json, ?), alias = COALESCE(alias, 'Hotel principal'),
              actividad_economica = CASE WHEN actividades_json IS NULL THEN '551001 - Actividades de alojamiento para estancias cortas (hoteles)' ELSE actividad_economica END,
              correo_electronico = COALESCE(correo_electronico, 'facturacion@hotelfortuna.cr'), telefono = COALESCE(telefono, '2479-0000'),
              usuario_hacienda = COALESCE(usuario_hacienda, 'cpj-3-101-123456@prod.comprobanteselectronicos.go.cr'),
              certificado_nombre = CASE WHEN llave_cargada = 1 THEN COALESCE(certificado_nombre, '310112345603.p12') ELSE certificado_nombre END
            WHERE id = 'em-1'`,
      args: [JSON.stringify([
        { codigo: '551001', nombre: 'Actividades de alojamiento para estancias cortas (hoteles)', principal: true },
      ])],
    });
    const SUCURSALES: [string, string, string, string][] = [
      ['suc-001', '001', 'Casa matriz', 'Recepción, restaurante y bar'],
    ];
    for (const [id, codigo, nombre, senas] of SUCURSALES) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO sucursales (id, emisor_id, codigo, nombre, provincia, canton, distrito, otras_senas, telefono, correo, activa)
              VALUES (?, 'em-1', ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [id, codigo, nombre, ...(gt ? ['GT17', 'Flores', '17001'] : ['2', '10', '07']), senas,
          ...(gt ? ['7952-8700', 'facturacion@hotelguatemala.com.gt'] : ['2479-0000', 'facturacion@hotelfortuna.cr'])],
      });
    }
  });

  // Receptor / cliente contable: un tercero puede ser solo receptor de
  // facturas (sin cuenta auxiliar), solo cliente/proveedor contable, o ambos.
  await agregarColumnas(db, 'clientes', [['es_receptor', 'INTEGER'], ['con_cuenta', 'INTEGER']]);
  await db.execute(`UPDATE clientes SET con_cuenta = CASE WHEN datos_json IS NOT NULL THEN 1 ELSE 0 END WHERE con_cuenta IS NULL`);
  await db.execute(`UPDATE clientes SET es_receptor = CASE WHEN tipo = 'proveedor' THEN 0 ELSE 1 END WHERE es_receptor IS NULL`);
  // Líneas de venta: código del vendedor y artículo del catálogo (para
  // existencias y para la cuenta de ingreso del asiento).
  await agregarColumnas(db, 'documentos_emitidos_lineas', [['codigo_comercial', "TEXT DEFAULT ''"], ['tipo_codigo_comercial', "TEXT DEFAULT ''"], ['articulo_id', 'TEXT']]);
  await agregarColumnas(db, 'documentos_emitidos', [['inventario_aplicado', 'INTEGER DEFAULT 0']]);
  await agregarColumnas(db, 'documentos_recibidos', [['inventario_aplicado', 'INTEGER DEFAULT 0']]);
  await agregarColumnas(db, 'cabys_favoritos', [['grupo_id', "TEXT DEFAULT ''"]]);
  await db.batch([
    `CREATE TABLE IF NOT EXISTS inventario_movimientos (
      id TEXT PRIMARY KEY, articulo_id TEXT, fecha TEXT, tipo TEXT, cantidad REAL, costo_unitario REAL DEFAULT 0,
      documento TEXT, documento_ref_id TEXT
    )`,
    // Grupos de productos: una plantilla (CABYS, IVA, unidad, categoría,
    // cuentas) para crear artículos rápido.
    `CREATE TABLE IF NOT EXISTS grupos_productos (
      id TEXT PRIMARY KEY, nombre TEXT NOT NULL, codigo_cabys TEXT, descripcion_cabys TEXT, impuesto REAL DEFAULT 13,
      unidad TEXT DEFAULT 'Unid', categoria TEXT DEFAULT '', moneda TEXT DEFAULT 'CRC', cuenta_ingreso TEXT DEFAULT '',
      cuenta_costo TEXT DEFAULT '', inventariable INTEGER DEFAULT 0, activo INTEGER DEFAULT 1
    )`,
    // Descuentos: catálogo como el de impuestos (código de Hacienda + % o monto)
    `CREATE TABLE IF NOT EXISTS descuentos (
      id TEXT PRIMARY KEY, nombre TEXT NOT NULL, codigo TEXT DEFAULT '07', naturaleza TEXT DEFAULT '', tipo TEXT DEFAULT 'porcentaje',
      valor REAL DEFAULT 0, descripcion TEXT DEFAULT '', activo INTEGER DEFAULT 1
    )`,
  ]);
  await unaVez(db, 'grupos_descuentos_ejemplo_v1', async () => {
    const GRUPOS: [string, string, string, string, number, string, string, string, string, string, number][] = [
      ['grp-hosp', 'Hospedaje', '6311100000000', 'Servicios de alojamiento para visitantes, en habitaciones o unidades de estancias cortas, con servicio de limpieza diario', 13, 'Noche', 'Hospedaje', 'USD', '600-001-0001', '', 0],
      ['grp-ayb', 'Alimentos (restaurante)', '6331000000000', 'Suministro de comida, servicio de restaurante con mesero', 13, 'Servicio', 'Alimentos y bebidas', 'CRC', '600-001-0002', '700-001-0001', 0],
      ['grp-bar', 'Bebidas (bar)', '6340002019900', 'Bebidas frías, con alcohol, vendidas en restaurantes, bares y establecimientos similares', 13, 'Servicio', 'Alimentos y bebidas', 'CRC', '600-001-0002', '700-001-0001', 0],
      ['grp-mb', 'Minibar (producto)', '2441099000000', 'Agua embotellada, sin edulcorantes o saborizantes, n.c.p.', 13, 'Unid', 'Minibar', 'CRC', '600-001-0002', '700-001-0001', 1],
      ['grp-spa', 'Spa y bienestar', '9723000000100', 'Servicios brindados por estéticas o spa (tratamientos faciales, masajes, entre otros)', 13, 'Servicio', 'Spa', 'USD', '600-001-0003', '700-001-0003', 0],
      ['grp-tour', 'Tours', '8554000000000', 'Servicios de operador turístico', 13, 'Servicio', 'Tours', 'USD', '600-001-0001', '', 0],
      ['grp-trf', 'Transporte / transfer', '6413200000000', 'Servicios de transporte terrestre de turistas, excepto por ferrocarril', 13, 'Servicio', 'Transporte', 'USD', '600-001-0001', '', 0],
      ['grp-tienda', 'Tienda / souvenirs', '2820204990000', 'Camiseta para hombre o niño, n.c.p.', 13, 'Unid', 'Tienda / souvenirs', 'CRC', '600-001-0001', '700-001-0004', 1],
    ];
    for (const [id, nombre, cabys, desc, iva, unidad, cat, mon, ci, cc, inv] of GRUPOS) {
      await db.execute({ sql: `INSERT OR IGNORE INTO grupos_productos (id, nombre, codigo_cabys, descripcion_cabys, impuesto, unidad, categoria, moneda, cuenta_ingreso, cuenta_costo, inventariable)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [id, nombre, cabys, desc, iva, unidad, cat, mon, ci, cc, inv] });
    }
    const DESC: [string, string, string, string, string, number, string][] = [
      ['dsc-agencia', 'Comisión agencia de viajes 15%', '07', '', 'porcentaje', 15, 'Tarifa neta para agencias con contrato.'],
      ['dsc-larga', 'Estadía larga (7+ noches) 10%', '04', '', 'porcentaje', 10, 'Aplica a hospedaje.'],
      ['dsc-empleado', 'Cortesía / empleado 50%', '01', '', 'porcentaje', 50, 'Cortesías autorizadas por gerencia.'],
      ['dsc-promo', 'Promoción temporada verde 20%', '05', '', 'porcentaje', 20, 'Descuento por temporada.'],
      ['dsc-otro', 'Compensación por inconveniente', '99', 'Compensación al huésped por inconveniente en la estadía', 'porcentaje', 15, 'Ejemplo de descuento «Otros» con su naturaleza.'],
      ['dsc-monto', 'Ajuste por queja (monto fijo)', '07', '', 'monto', 10000, gt ? 'Monto fijo en quetzales.' : 'Monto fijo en colones.'],
    ];
    for (const [id, nombre, codigo, nat, tipo, valor, desc] of DESC) {
      await db.execute({ sql: `INSERT OR IGNORE INTO descuentos (id, nombre, codigo, naturaleza, tipo, valor, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?)`, args: [id, nombre, codigo, nat, tipo, valor, desc] });
    }
    await db.execute(`UPDATE cabys_favoritos SET grupo_id = CASE
        WHEN categoria = 'Hospedaje' THEN 'grp-hosp' WHEN categoria = 'Minibar' THEN 'grp-mb' WHEN categoria = 'Spa' THEN 'grp-spa'
        WHEN categoria = 'Tours' THEN 'grp-tour' WHEN categoria = 'Transporte' THEN 'grp-trf' WHEN categoria = 'Tienda / souvenirs' THEN 'grp-tienda'
        WHEN codigo = '6340002019900' THEN 'grp-bar' WHEN categoria = 'Alimentos y bebidas' THEN 'grp-ayb' ELSE '' END
      WHERE COALESCE(grupo_id, '') = ''`);
  });

  // Códigos CABYS de ejemplo de versiones anteriores → códigos oficiales.
  await unaVez(db, 'cabys_oficial_v1', async () => {
    for (const [viejo, nuevo] of Object.entries(CABYS_REEMPLAZO)) {
      const oficial = CABYS.find(c => c.codigo === nuevo);
      if (!oficial) continue;
      await db.execute({ sql: 'UPDATE cabys_favoritos SET codigo = ?, descripcion = ?, impuesto = CASE WHEN impuesto = 4 AND ? = 13 THEN 13 ELSE impuesto END WHERE codigo = ?', args: [nuevo, oficial.descripcion, oficial.impuesto, viejo] });
      await db.execute({ sql: 'UPDATE grupos_productos SET codigo_cabys = ?, descripcion_cabys = ?, impuesto = CASE WHEN impuesto = 4 AND ? = 13 THEN 13 ELSE impuesto END WHERE codigo_cabys = ?', args: [nuevo, oficial.descripcion, oficial.impuesto, viejo] });
    }
  });

  // Un emisor por cuenta: el segundo emisor de la semilla vieja queda inactivo.
  await unaVez(db, 'emisor_unico_v1', async () => {
    const { rows } = await db.execute(`SELECT id FROM emisores WHERE activo = 1 ORDER BY CASE WHEN id = 'em-1' THEN 0 ELSE 1 END, rowid LIMIT 1`);
    if (rows[0]) await db.execute({ sql: 'UPDATE emisores SET activo = 0 WHERE id <> ?', args: [String(rows[0].id)] });
  });

  await unaVez(db, 'inventario_hotel_v1', async () => {
    await db.execute(`DELETE FROM cabys_favoritos WHERE COALESCE(nombre, '') = '' AND COALESCE(precio_unitario, 0) = 0
      AND codigo IN ('6311100000000', '6331000000000', '6340002019900', '9723000000100')`);
    const ALOJ = '551001 - Actividades de alojamiento para estancias cortas (hoteles)';
    const REST = '561001 - Actividades de restaurantes y de servicio móvil de comidas';
    const BAR = '563001 - Actividades de servicio de bebidas (bares, cantinas)';
    const SPA = '960920 - Actividades de spa y balnearios';
    const TOUR = '799001 - Actividades de operadores turísticos (tour operador)';
    // id, nombre, cabys, descripción CABYS, IVA, precio, moneda, unidad, categoría, actividad, cuenta ingreso, inventariable, costo, existencias, código
    const ITEMS: [string, string, string, string, number, number, string, string, string, string, string, number, number, number, string][] = [
      ['inv-h01', 'Hospedaje habitación estándar (noche)', '6311100000000', 'Servicios de alojamiento para visitantes, en habitaciones o unidades de estancias cortas, con servicio de limpieza diario', 13, 85, 'USD', 'Noche', 'Hospedaje', ALOJ, '600-001-0001', 0, 0, 0, 'HAB-STD'],
      ['inv-h02', 'Hospedaje habitación superior vista al volcán (noche)', '6311100000000', 'Servicios de alojamiento para visitantes, en habitaciones o unidades de estancias cortas, con servicio de limpieza diario', 13, 120, 'USD', 'Noche', 'Hospedaje', ALOJ, '600-001-0001', 0, 0, 0, 'HAB-SUP'],
      ['inv-h03', 'Hospedaje junior suite (noche)', '6311100000000', 'Servicios de alojamiento para visitantes, en habitaciones o unidades de estancias cortas, con servicio de limpieza diario', 13, 165, 'USD', 'Noche', 'Hospedaje', ALOJ, '600-001-0001', 0, 0, 0, 'HAB-JRS'],
      ['inv-h04', 'Persona adicional en habitación (noche)', '6311400000000', 'Servicios de alojamiento para visitantes, en habitaciones o unidades de estancias cortas, para ocupación múltiple', 13, 25, 'USD', 'Noche', 'Hospedaje', ALOJ, '600-001-0001', 0, 0, 0, 'PAX-ADI'],
      ['inv-h05', 'Early check-in / late check-out', '6311100000000', 'Servicios de alojamiento para visitantes, en habitaciones o unidades de estancias cortas, con servicio de limpieza diario', 13, 30, 'USD', 'Servicio', 'Hospedaje', ALOJ, '600-001-0001', 0, 0, 0, 'LATE-CO'],
      ['inv-h06', 'Desayuno buffet', '6331000000000', 'Suministro de comida, servicio de restaurante con mesero', 13, 9500, 'CRC', 'Servicio', 'Alimentos y bebidas', REST, '600-001-0002', 0, 0, 0, 'AYB-DES'],
      ['inv-h07', 'Almuerzo / cena a la carta', '6331000000000', 'Suministro de comida, servicio de restaurante con mesero', 13, 14500, 'CRC', 'Servicio', 'Alimentos y bebidas', REST, '600-001-0002', 0, 0, 0, 'AYB-CAR'],
      ['inv-h08', 'Servicio a la habitación (room service)', '6331000000000', 'Suministro de comida, servicio de restaurante con mesero', 13, 4500, 'CRC', 'Servicio', 'Alimentos y bebidas', REST, '600-001-0002', 0, 0, 0, 'AYB-RS'],
      ['inv-h09', 'Consumo de bar', '6340002019900', 'Bebidas frías, con alcohol, vendidas en restaurantes, bares y establecimientos similares', 13, 3500, 'CRC', 'Servicio', 'Alimentos y bebidas', BAR, '600-001-0002', 0, 0, 0, 'BAR-CON'],
      ['inv-h10', 'Minibar: agua embotellada 600 ml', '2441099000000', 'Agua embotellada, sin edulcorantes o saborizantes, n.c.p.', 13, 1500, 'CRC', 'Unid', 'Minibar', BAR, '600-001-0002', 1, 450, 120, 'MB-AGUA'],
      ['inv-h11', 'Minibar: cerveza nacional 350 ml', '2431000000000', 'Cerveza de malta', 13, 2500, 'CRC', 'Unid', 'Minibar', BAR, '600-001-0002', 1, 900, 96, 'MB-CERV'],
      ['inv-h12', 'Minibar: snack (papas o maní)', '2139400000200', 'Papas en rodajas, tostadas', 13, 1800, 'CRC', 'Unid', 'Minibar', BAR, '600-001-0002', 1, 700, 80, 'MB-SNCK'],
      ['inv-h13', 'Masaje relajante 60 min', '9723000000100', 'Servicios brindados por estéticas o spa (tratamientos faciales, masajes, entre otros)', 13, 70, 'USD', 'Servicio', 'Spa', SPA, '600-001-0003', 0, 0, 0, 'SPA-M60'],
      ['inv-h14', 'Acceso a aguas termales (día)', '9723000000100', 'Servicios brindados por estéticas o spa (tratamientos faciales, masajes, entre otros)', 13, 35, 'USD', 'Servicio', 'Spa', SPA, '600-001-0003', 0, 0, 0, 'SPA-TER'],
      ['inv-h15', 'Lavandería por prenda', '9713000000000', 'Servicios de limpieza de productos textiles, n.c.p. (lavandería)', 13, 1500, 'CRC', 'Unid', 'Servicios al huésped', ALOJ, '600-001-0001', 0, 0, 0, 'LAV-PRE'],
      ['inv-h16', 'Tour volcán Arenal y caminata', '8554000000000', 'Servicios de operador turístico', 13, 65, 'USD', 'Servicio', 'Tours', TOUR, '600-001-0001', 0, 0, 0, 'TOUR-ARE'],
      ['inv-h17', 'Transfer aeropuerto – hotel', '6413200000000', 'Servicios de transporte terrestre de turistas, excepto por ferrocarril', 13, 90, 'USD', 'Servicio', 'Transporte', ALOJ, '600-001-0001', 0, 0, 0, 'TRF-AER'],
      ['inv-h18', 'Estacionamiento (noche)', '6743000000000', 'Servicios de estacionamiento (parqueos)', 13, 3000, 'CRC', 'Noche', 'Servicios al huésped', ALOJ, '600-001-0001', 0, 0, 0, 'PARK'],
      ['inv-h19', 'Alquiler de salón de eventos (hora)', '8596100000000', 'Servicios de organización y asistencia de convenciones', 13, 45000, 'CRC', 'Hora', 'Eventos', ALOJ, '600-001-0004', 0, 0, 0, 'EVT-SAL'],
    ];
    for (const [id, nombre, cabys, desc, iva, precio, moneda, unidad, cat, act, cuenta, inv, costo, cant, cod] of ITEMS) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO cabys_favoritos (id, actividad_economica, codigo, descripcion, impuesto, precio_unitario, unidad_medida,
                codigo_interno, notas, nombre, tipo_codigo, partida_arancelaria, categoria, moneda, inventariable, costo_unitario,
                cantidad_inicial, cantidad_minima, cuenta_ingreso, cuenta_costo, cuenta_inventario, activo)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, '04', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [id, act, cabys, desc, iva, precio, unidad, cod, nombre, cat, moneda, inv, costo, cant, inv ? 24 : 0, cuenta,
          inv ? '700-001-0001' : '', inv ? '120-001-0001' : ''],
      });
    }
  });

  // ── Impuestos y exoneraciones de ejemplo ─────────────────────────────────
  await unaVez(db, 'impuestos_ejemplo_v1', async () => {
    const IMPUESTOS: [string, string, string, number, number, string][] = [
      ['imp-ej-13', 'IVA general 13%', 'IVA', 13, 1, 'Tarifa general: hospedaje, restaurante, bar, spa, tours.'],
      ['imp-ej-04', 'IVA reducido 4%', 'IVA', 4, 1, 'Ej.: boletos aéreos, servicios de salud privados.'],
      ['imp-ej-02', 'IVA reducido 2%', 'IVA', 2, 1, 'Ej.: medicamentos, seguros personales.'],
      ['imp-ej-01', 'IVA canasta básica 1%', 'IVA', 1, 1, 'Compras de canasta básica: frutas, verduras, pan.'],
      ['imp-ej-00', 'Exento 0%', 'IVA', 0, 0, 'Ventas exentas o no sujetas (ej. exportaciones de servicios).'],
      ['imp-ej-isc', 'Impuesto selectivo de consumo (código 02)', 'Otro', 0, 0, 'La tarifa la fija la partida arancelaria de cada bien (va de 0% a 100%); se toma del XML del proveedor.'],
      ['imp-ej-alc', 'Impuesto específico bebidas alcohólicas (código 04)', 'Otro', 0, 0, `Monto fijo por mililitro de alcohol absoluto (Ley 7972), actualizado por ${gt ? 'la SAT' : 'Hacienda'}; se toma del XML del proveedor.`],
    ];
    for (const [id, nombre, tipo, pct, acred, desc] of IMPUESTOS) {
      const { rows } = await db.execute({ sql: 'SELECT id FROM impuestos WHERE tipo = ? AND porcentaje = ? AND (nombre = ? OR ? = \'IVA\')', args: [tipo, pct, nombre, tipo] });
      if (rows.length && tipo === 'IVA') {
        // Ya existía la tarifa: solo se le da un nombre y una descripción claros.
        await db.execute({ sql: `UPDATE impuestos SET nombre = ?, descripcion = CASE WHEN COALESCE(descripcion,'') = '' THEN ? ELSE descripcion END WHERE id = ?`, args: [nombre, desc, String(rows[0].id)] });
        continue;
      }
      if (rows.length) continue;
      await db.execute({
        sql: `INSERT OR IGNORE INTO impuestos (id, nombre, tipo, porcentaje, impuesto_acreditable, descripcion, activo) VALUES (?, ?, ?, ?, ?, ?, 1)`,
        args: [id, nombre, tipo, pct, acred, desc],
      });
    }
    // 'Ninguno' (0%, sin tipo) queda duplicado con 'Exento 0%'.
    await db.execute(`DELETE FROM impuestos WHERE nombre = 'Ninguno' AND porcentaje = 0`);

    const EXONERACIONES: [string, string, string, string, string, string, number, string, string, string][] = [
      ['exo-ej-1', 'Embajada, misión diplomática (ejemplo)', '02', 'RE-2026-000145', '02', '2026-01-15', 13, '', '', 'Hospedaje de funcionarios diplomáticos acreditados.'],
      ['exo-ej-2', 'Empresa en Zona Franca (ejemplo)', '08', 'ZF-00012345-2026', '99', '2026-02-01', 13, '20', 'g', 'Hospedaje y alimentación de personal de una empresa en régimen de Zona Franca.'],
      ['exo-ej-3', 'Cruz Roja Costarricense (ejemplo)', '03', 'AL-00098765-26', '05', '2026-03-10', 13, '8', '0', 'Exoneración por ley especial.'],
      ['exo-ej-4', 'Autorización local genérica DGH (ejemplo)', '04', 'AL-00055544-26', '01', '2026-04-20', 6.5, '', '0', 'Exoneración parcial (la mitad del 13%).'],
    ];
    for (const [id, nombre, tipoDoc, num, inst, fechaEm, pct, art, inc, desc] of EXONERACIONES) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO exoneraciones (id, nombre, tipo_documento, numero_documento, institucion, fecha_emision, porcentaje, articulo, inciso, descripcion, activo, nombre_institucion_otros)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        args: [id, nombre, tipoDoc, num, inst, fechaEm, pct, art, inc, desc + ' Reemplazar por los datos del documento real.', inst === '99' ? 'PROCOMER' : ''],
      });
    }
  });
  // Corrige las tarifas ilustrativas de los ejemplos anteriores: el selectivo
  // no tiene una tarifa única (la fija cada partida) y el de bebidas
  // alcohólicas es un monto por mililitro, no un porcentaje.
  await unaVez(db, 'impuestos_ejemplo_v2', async () => {
    const FIX: [string, string, number, string][] = [
      ['imp-ej-isc', 'Impuesto selectivo de consumo (código 02)', 0, 'La tarifa la fija la partida arancelaria de cada bien (va de 0% a 100%); se toma del XML del proveedor.'],
      ['imp-ej-alc', 'Impuesto específico bebidas alcohólicas (código 04)', 0, `Monto fijo por mililitro de alcohol absoluto (Ley 7972), actualizado por ${gt ? 'la SAT' : 'Hacienda'}; se toma del XML del proveedor.`],
      ['imp-ej-04', 'IVA reducido 4%', 4, 'Ej.: boletos aéreos, servicios de salud privados.'],
      ['imp-ej-00', 'Exento 0%', 0, 'Ventas exentas o no sujetas (ej. exportaciones de servicios).'],
    ];
    for (const [id, nombre, pct, desc] of FIX) {
      await db.execute({ sql: 'UPDATE impuestos SET nombre = ?, porcentaje = ?, descripcion = ? WHERE id = ?', args: [nombre, pct, desc, id] });
    }
  });
  // ── Emisor dentro de Empresa (MVP) ─────────────────────────────────────
  // Una sola sucursal (001): las cajas de otras sucursales pasan a la 001 con
  // el siguiente número de terminal libre, y la sucursal toma la dirección
  // del emisor.
  await unaVez(db, 'mvp_sucursal_unica_v1', async () => {
    const { rows: emis } = await db.execute(`SELECT * FROM emisores WHERE activo = 1 ORDER BY id LIMIT 1`);
    const e = emis[0];
    if (!e) return;
    const { rows: cajasOtras } = await db.execute(`SELECT id FROM cajas WHERE sucursal <> '001' ORDER BY id`);
    for (const c of cajasOtras) {
      const { rows: m } = await db.execute(`SELECT MAX(CAST(terminal AS INTEGER)) AS m FROM cajas WHERE sucursal = '001'`);
      await db.execute({ sql: `UPDATE cajas SET sucursal = '001', terminal = ? WHERE id = ?`, args: [String(Number(m[0]?.m ?? 0) + 1).padStart(5, '0'), String(c.id)] });
    }
    await db.execute(`DELETE FROM sucursales WHERE codigo <> '001'`);
    const { rows: s1 } = await db.execute({ sql: `SELECT id FROM sucursales WHERE codigo = '001' AND emisor_id = ?`, args: [String(e.id)] });
    const datos = [String(e.provincia ?? ''), String(e.canton ?? ''), String(e.distrito ?? ''), String(e.otras_senas ?? ''), String(e.telefono ?? ''), String(e.correo_electronico ?? '')];
    if (s1.length) {
      await db.execute({ sql: `UPDATE sucursales SET provincia = ?, canton = ?, distrito = ?, otras_senas = ?, telefono = ?, correo = ? WHERE id = ?`, args: [...datos, String(s1[0].id)] });
    } else {
      await db.execute({ sql: `INSERT INTO sucursales (id, emisor_id, codigo, nombre, provincia, canton, distrito, otras_senas, telefono, correo, activa) VALUES (?, ?, '001', 'Casa matriz', ?, ?, ?, ?, ?, ?, 1)`,
        args: ['suc-' + String(e.id), String(e.id), ...datos] });
    }
  });
  await unaVez(db, 'actividad_unica_ejemplo_v1', async () => {
    const { rows } = await db.execute(`SELECT id, actividades_json FROM emisores WHERE id = 'em-1'`);
    const act = rows[0]?.actividades_json ? JSON.parse(String(rows[0].actividades_json)) as { codigo: string; nombre: string; principal: boolean }[] : [];
    const principal = act.find(a => a.principal) ?? act[0];
    if (!principal) return;
    await db.execute({ sql: `UPDATE emisores SET actividades_json = ?, actividad_economica = ? WHERE id = 'em-1'`,
      args: [JSON.stringify([{ ...principal, principal: true }]), `${principal.codigo} - ${principal.nombre}`] });
    await db.execute({ sql: `UPDATE cabys_favoritos SET actividad_economica = ? WHERE COALESCE(actividad_economica, '') <> '' AND actividad_economica NOT LIKE ?`,
      args: [`${principal.codigo} - ${principal.nombre}`, `${principal.codigo}%`] });
  });
  // Centro de costos por producto y por grupo (para el asiento de ventas).
  await agregarColumnas(db, 'cabys_favoritos', [['centro_costo', "TEXT DEFAULT ''"]]);
  // Datos del artículo que solo usa Guatemala (bien o servicio, unidades gravables, exención)
  await agregarColumnas(db, 'cabys_favoritos', [['datos_pais', "TEXT DEFAULT ''"]]);
  await agregarColumnas(db, 'grupos_productos', [['centro_costo', "TEXT DEFAULT ''"]]);
  // Guatemala: la clasificación de producto de cada grupo
  await agregarColumnas(db, 'grupos_productos', [['datos_pais', "TEXT DEFAULT ''"]]);
  // Los grupos son la categoría: cada producto queda en un grupo y su
  // categoría es el nombre del grupo. Las categorías sin grupo se vuelven grupo.
  await unaVez(db, 'grupos_como_categorias_v1', async () => {
    const { rows: grupos } = await db.execute(`SELECT * FROM grupos_productos`);
    const lista = grupos.map(g => ({ id: String(g.id), nombre: String(g.nombre), categoria: String(g.categoria ?? ''), cabys: String(g.codigo_cabys ?? '') }));
    const { rows: prods } = await db.execute(`SELECT * FROM cabys_favoritos WHERE COALESCE(grupo_id, '') = ''`);
    for (const p of prods) {
      const cat = String(p.categoria || 'Otros');
      const candidatos = lista.filter(g => g.categoria === cat || g.nombre === cat);
      let g = candidatos.find(x => x.cabys === String(p.codigo)) ?? candidatos[0];
      if (!g) {
        g = { id: 'grp-' + Math.random().toString(36).slice(2, 10), nombre: cat, categoria: cat, cabys: String(p.codigo) };
        await db.execute({
          sql: `INSERT INTO grupos_productos (id, nombre, codigo_cabys, descripcion_cabys, impuesto, unidad, categoria, moneda, cuenta_ingreso, cuenta_costo, inventariable, activo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          args: [g.id, cat, String(p.codigo), String(p.descripcion ?? ''), Number(p.impuesto ?? 13), String(p.unidad_medida || 'Unid'), cat, String(p.moneda || 'CRC'),
            String(p.cuenta_ingreso || '600-001-0001'), String(p.cuenta_costo ?? ''), Number(p.inventariable ?? 0)],
        });
        lista.push(g);
      }
      await db.execute({ sql: `UPDATE cabys_favoritos SET grupo_id = ?, categoria = ? WHERE id = ?`, args: [g.id, g.nombre, String(p.id)] });
    }
    await db.execute(`UPDATE grupos_productos SET categoria = nombre`);
    await db.execute(`UPDATE cabys_favoritos SET categoria = (SELECT g.nombre FROM grupos_productos g WHERE g.id = cabys_favoritos.grupo_id) WHERE COALESCE(grupo_id, '') <> ''`);
    // Notas internas → primer comentario
    const { rows: notas } = await db.execute(`SELECT id, notas FROM cabys_favoritos WHERE COALESCE(notas, '') <> ''`);
    for (const n of notas) {
      await db.execute({ sql: `INSERT INTO productos_comentarios (id, articulo_id, autor, texto, fecha) VALUES (?, ?, 'Sistema', ?, ?)`,
        args: ['com-' + Math.random().toString(36).slice(2, 10), String(n.id), String(n.notas), new Date().toISOString()] });
    }
    // Sin guiones largos en los nombres de ejemplo
    await db.execute(`UPDATE cabys_favoritos SET nombre = REPLACE(nombre, ' — ', ': ') WHERE nombre LIKE '% — %'`);
    await db.execute(`UPDATE sucursales SET nombre = 'Casa matriz' WHERE nombre LIKE '%Casa matriz%'`);
    await db.execute(`UPDATE exoneraciones SET nombre = REPLACE(nombre, ' — ', ', ') WHERE nombre LIKE '% — %'`);
    await db.execute(`UPDATE asientos SET titulo = REPLACE(titulo, ' — ', ' · ') WHERE titulo LIKE '% — %'`);
  });

  // Los documentos de ejemplo marcados como recurrentes pasan a tener su
  // programación real (mensual, desde el mes siguiente a su emisión).
  await unaVez(db, 'recurrentes_ejemplo_v1', async () => {
    const { rows } = await db.execute(`SELECT id, fecha_emision FROM documentos_emitidos WHERE recurrente = 1`);
    for (const d of rows) {
      const f = new Date(String(d.fecha_emision || new Date().toISOString()));
      f.setMonth(f.getMonth() + 1);
      while (f < new Date()) f.setMonth(f.getMonth() + 1);
      await db.execute({ sql: `INSERT INTO documentos_recurrentes (id, documento_id, frecuencia, proxima, activa, creado) VALUES (?, ?, 'mensual', ?, 1, ?)`,
        args: ['rec-' + Math.random().toString(36).slice(2, 10), String(d.id), f.toISOString().slice(0, 10), new Date().toISOString()] });
    }
  });

  // Fechas de ejemplo al día: la primera queda para hoy (se ve «por emitir»),
  // las demás en su próximo mes.
  await unaVez(db, 'recurrentes_ejemplo_v2', async () => {
    const { rows } = await db.execute(`SELECT id, proxima FROM documentos_recurrentes WHERE emitidas = 0 ORDER BY id`);
    const hoy = new Date().toISOString().slice(0, 10);
    for (const [i, r] of rows.entries()) {
      const f = new Date(String(r.proxima) + 'T12:00:00');
      while (f.toISOString().slice(0, 10) < hoy) f.setMonth(f.getMonth() + 1);
      await db.execute({ sql: 'UPDATE documentos_recurrentes SET proxima = ? WHERE id = ?', args: [i === 0 ? hoy : f.toISOString().slice(0, 10), String(r.id)] });
    }
  });

  // Ejemplos de ventas: la recurrencia es la excepción. Quedan 2 facturas
  // recurrentes y se agregan facturas normales con sus líneas (para poder
  // refacturarlas, enviarlas o hacerlas recurrentes en la demostración).
  await unaVez(db, 'ejemplos_ventas_v2', async () => {
    const { rows: recs } = await db.execute(`SELECT id, documento_id FROM documentos_recurrentes ORDER BY proxima, documento_id DESC`);
    const quedan = new Set(recs.slice(0, 2).map(r => String(r.id)));
    for (const r of recs) {
      if (quedan.has(String(r.id))) continue;
      await db.execute({ sql: 'DELETE FROM documentos_recurrentes WHERE id = ?', args: [String(r.id)] });
      await db.execute({ sql: 'UPDATE documentos_emitidos SET recurrente = 0 WHERE id = ?', args: [String(r.documento_id)] });
    }
    const { rows: caja } = await db.execute(`SELECT id FROM cajas WHERE id = 'caja-1'`);
    if (!caja.length) return;
    const { rows: num } = await db.execute(`SELECT consecutivo_actual FROM cajas_numeracion WHERE caja_id = 'caja-1' AND tipo_documento = 'Factura electrónica'`);
    let n = Number(num[0]?.consecutivo_actual ?? 0);
    const EJ: { cli: string; nombre: string; email: string; tipoId: string; ced: string; fecha: string; moneda: 'CRC' | 'USD'; tc: number; cond: string; origen: string; lineas: [string, string, number, number, string][] }[] = [
      { cli: 'cli-h1', nombre: 'Arenal Adventure Tours S.A.', email: 'facturas@arenaladventure.cr', tipoId: '02', ced: '3101555123', fecha: '2026-09-10T10:15:00', moneda: 'USD', tc: 510, cond: '02', origen: 'Front Desk',
        lineas: [['6311100000000', 'Hospedaje habitación estándar (noche)', 3, 85, 'Noche'], ['6331000000000', 'Desayuno buffet', 6, 18, 'Servicio']] },
      { cli: 'cli-h3', nombre: 'María Fernanda Solano Rojas', email: 'mfsolano@correo.cr', tipoId: '01', ced: '205550777', fecha: '2026-09-12T12:40:00', moneda: 'CRC', tc: 1, cond: '01', origen: 'Punto de Venta (POS)',
        lineas: [['6331000000000', 'Almuerzo / cena a la carta', 2, 14500, 'Servicio'], ['6340002019900', 'Consumo de bar', 3, 3500, 'Servicio']] },
      { cli: 'cli-h2', nombre: 'Agencia de Viajes Volcán Tropical S.A.', email: 'contabilidad@volcantropical.cr', tipoId: '02', ced: '3101666234', fecha: '2026-09-15T09:05:00', moneda: 'USD', tc: 510, cond: '02', origen: 'Front Desk',
        lineas: [['6311100000000', 'Hospedaje habitación superior vista al volcán (noche)', 2, 120, 'Noche'], ['8554000000000', 'Tour volcán Arenal y caminata', 2, 65, 'Servicio']] },
      { cli: 'cli-h4', nombre: 'Nature Travel Group LLC', email: 'billing@naturetravel.com', tipoId: '05', ced: 'US-884521', fecha: '2026-09-18T16:30:00', moneda: 'USD', tc: 510, cond: '02', origen: 'Manual',
        lineas: [['9723000000100', 'Masaje relajante 60 min', 2, 70, 'Servicio'], ['6413200000000', 'Transfer aeropuerto - hotel', 1, 90, 'Servicio']] },
      { cli: 'cli-h3', nombre: 'María Fernanda Solano Rojas', email: 'mfsolano@correo.cr', tipoId: '01', ced: '205550777', fecha: '2026-09-21T11:20:00', moneda: 'CRC', tc: 1, cond: '01', origen: 'Front Desk',
        lineas: [['6311100000000', 'Hospedaje habitación estándar (noche)', 1, 43350, 'Noche'], ['6743000000000', 'Estacionamiento (noche)', 1, 3000, 'Noche']] },
      { cli: 'cli-h1', nombre: 'Arenal Adventure Tours S.A.', email: 'facturas@arenaladventure.cr', tipoId: '02', ced: '3101555123', fecha: '2026-09-23T08:45:00', moneda: 'CRC', tc: 1, cond: '02', origen: 'Manual',
        lineas: [['8596100000000', 'Alquiler de salón de eventos (hora)', 4, 45000, 'Hora']] },
    ];
    for (const e of EJ) {
      n += 1;
      const id = '#' + (26000 + n);
      const numero = '00100001010' + String(n).padStart(9, '0');
      const sub = e.lineas.reduce((a, l) => a + l[2] * l[3], 0);
      const iva = Math.round(sub * 0.13 * 100) / 100;
      await db.execute({
        sql: `INSERT OR IGNORE INTO documentos_emitidos (id, tipo, numero_factura, clave, cliente_id, cliente_nombre, receptor_email, emisor_id, caja_id, fecha_emision, estado, recurrente,
                condicion_venta, medios_pago, moneda, tipo_cambio, subtotal, iva, total, estado_envio, origen, receptor_tipo_identificacion, receptor_identificacion)
              VALUES (?, 'Factura electrónica', ?, '', ?, ?, ?, 'em-1', 'caja-1', ?, 'Aceptado', 0, ?, ?, ?, ?, ?, ?, ?, 'enviado', ?, ?, ?)`,
        args: [id, numero, e.cli, e.nombre, e.email, e.fecha, e.cond, e.cond === '01' ? '["02"]' : '["04"]', e.moneda, e.tc, sub, iva, Math.round((sub + iva) * 100) / 100, e.origen, e.tipoId, e.ced],
      });
      for (const [k, l] of e.lineas.entries()) {
        await db.execute({
          sql: `INSERT OR IGNORE INTO documentos_emitidos_lineas (id, documento_id, codigo_cabys, descripcion, cantidad, precio_unitario, impuesto, codigo_tarifa, unidad_medida) VALUES (?, ?, ?, ?, ?, ?, 13, '08', ?)`,
          args: [`${id}-l${k + 1}`, id, l[0], l[1], l[2], l[3], l[4]],
        });
      }
    }
    await db.execute({ sql: `UPDATE cajas_numeracion SET consecutivo_actual = ? WHERE caja_id = 'caja-1' AND tipo_documento = 'Factura electrónica'`, args: [n] });
    await db.execute({ sql: `UPDATE cajas SET consecutivo_actual = ? WHERE id = 'caja-1'`, args: [n] });
  });

  // Numeración por caja también para los acuses (mensajes de receptor).
  await unaVez(db, 'numeracion_acuses_v1', async () => {
    const { rows: cajas } = await db.execute(`SELECT id FROM cajas`);
    for (const c of cajas) {
      for (const t of tiposNumeracion()) {
        const { rows: ya } = await db.execute({ sql: `SELECT 1 FROM cajas_numeracion WHERE caja_id = ? AND tipo_documento = ?`, args: [String(c.id), t.tipo] });
        if (!ya.length) await db.execute({ sql: `INSERT INTO cajas_numeracion (id, caja_id, tipo_documento, consecutivo_actual) VALUES (?, ?, ?, 0)`, args: ['cn-' + Math.random().toString(36).slice(2), String(c.id), t.tipo] });
      }
    }
  });

  // Receptores y compras automáticas:
  //  · clientes.compras_auto: 1/0 importar solas las facturas del proveedor
  //    (NULL = sí, una vez que ya se le importó alguna).
  //  · clientes.cuenta_gasto: cuenta por defecto de sus líneas nuevas.
  //  · clientes.correos_compra: otros correos desde los que manda facturas.
  //  · clientes.correos_copia: copias al enviarle comprobantes (receptor).
  //  · correos.auto_importado: se importó solo desde el buzón.
  await agregarColumnas(db, 'clientes', [['compras_auto', 'INTEGER'], ['cuenta_gasto', 'TEXT'], ['correos_compra', 'TEXT'], ['correos_copia', 'TEXT'],
    ['provincia', 'TEXT'], ['canton', 'TEXT'], ['distrito', 'TEXT'], ['otras_senas', 'TEXT']]);
  await agregarColumnas(db, 'correos', [['auto_importado', 'INTEGER']]);
  // Tareas automáticas: revisar el buzón cada cierto tiempo y emitir las
  // recurrentes en modo «automática» (ver lib/tareas.ts).
  await agregarColumnas(db, 'buzon_config', [['auto', 'INTEGER DEFAULT 1'], ['intervalo', 'INTEGER DEFAULT 15']]);
  await agregarColumnas(db, 'documentos_recurrentes', [['modo', "TEXT DEFAULT 'revisar'"], ['ultimo_error', "TEXT DEFAULT ''"]]);
  await agregarColumnas(db, 'clientes', [['regimen', 'TEXT'], ['representante_legal', 'TEXT']]);
  // Facturas que se emitieron solas (recurrentes automáticas): aviso en el
  // Dashboard hasta que se marquen como vistas, y estado del envío por
  // correo al receptor ('enviado', 'sin_correo' o 'error').
  await agregarColumnas(db, 'documentos_emitidos_lineas', [['unidad_comercial', "TEXT DEFAULT ''"], ['tipo_transaccion', "TEXT DEFAULT ''"]]);
  await agregarColumnas(db, 'documentos_emitidos_lineas', [['otro_impuesto_json', 'TEXT']]);
  // Factura electrónica de compra: cuenta de gasto y condición del IVA con que
  // se registra la compra al aceptarse, y el enlace compra ↔ documento emitido.
  await agregarColumnas(db, 'documentos_emitidos', [['compra_cuenta_gasto', 'TEXT'], ['compra_credito_fiscal', 'TEXT'], ['compra_id', 'TEXT']]);
  await agregarColumnas(db, 'documentos_recibidos', [['documento_emitido_id', 'TEXT']]);
  // Condición y medio de pago de la compra: las de contado se pagan desde bancos o caja
  await agregarColumnas(db, 'documentos_recibidos', [['condicion_venta', 'TEXT'], ['medio_pago', 'TEXT']]);
  // Artículos que compra cada proveedor: descripción, IVA acreditable y destino (gasto, servicio o inventario)
  await agregarColumnas(db, 'compras_mapeo', [['descripcion', "TEXT DEFAULT ''"], ['credito_fiscal', "TEXT DEFAULT ''"], ['destino', "TEXT DEFAULT ''"]]);
  // Plan de pago de las ventas a crédito con IVA al cobro: cada cuota se
  // cobra con un recibo electrónico de pago, que se emite al registrar el pago.
  await db.execute(`CREATE TABLE IF NOT EXISTS cuotas_credito (
    id TEXT PRIMARY KEY, factura_id TEXT NOT NULL, numero INTEGER, fecha TEXT, monto REAL, medio TEXT DEFAULT '04',
    estado TEXT DEFAULT 'programada', recibo_id TEXT, pago_json TEXT
  )`);
  // Documento emitido desde una recurrencia (para el resumen del Dashboard)
  await agregarColumnas(db, 'documentos_emitidos', [['recurrencia_id', 'TEXT']]);
  // Guatemala: tipo de DTE, frases y abonos de la factura cambiaria
  await agregarColumnas(db, 'documentos_emitidos', [['tipo_dte', 'TEXT'], ['frases_json', 'TEXT'], ['abonos_json', 'TEXT']]);
  await agregarColumnas(db, 'mapeo_contable_facturacion', [['cuenta_isr_retenido', 'TEXT'], ['cuenta_iva_retenido', 'TEXT']]);
  await agregarColumnas(db, 'documentos_emitidos_lineas', [['escenario_exencion', 'INTEGER']]);
  // Ejemplos de recurrentes automáticas: dos vencen hoy (una sin correo del
  // receptor) y se emiten solas con la primera revisión; una más en 5 días.
  await unaVez(db, 'recurrentes_automaticas_ejemplo_v1', async () => {
    const { rows: base } = await db.execute(`SELECT d.id FROM documentos_emitidos d
      WHERE d.tipo = 'Factura electrónica' AND d.estado = 'Aceptado' AND COALESCE(d.condicion_venta, '01') = '01'
        AND d.id NOT IN (SELECT documento_id FROM documentos_recurrentes)
        AND EXISTS (SELECT 1 FROM documentos_emitidos_lineas l WHERE l.documento_id = d.id)
      ORDER BY d.fecha_emision DESC LIMIT 3`);
    const hoy = new Date().toISOString().slice(0, 10);
    const en5 = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
    for (const [i, d] of base.entries()) {
      if (i === 1) await db.execute({ sql: 'UPDATE documentos_emitidos SET receptor_email = NULL WHERE id = ?', args: [String(d.id)] });
      await db.execute({
        sql: `INSERT INTO documentos_recurrentes (id, documento_id, frecuencia, proxima, activa, creado, modo) VALUES (?, ?, 'mensual', ?, 1, ?, 'automatica')`,
        args: ['rec-' + Math.random().toString(36).slice(2, 10), String(d.id), i < 2 ? hoy : en5, new Date().toISOString()],
      });
    }
  });
  // Recibo electrónico de pago: la factura a crédito que cobra
  await agregarColumnas(db, 'documentos_emitidos', [['abono_json', 'TEXT']]);
  // Comprobantes emitidos con otro sistema e importados para hacerles notas
  await agregarColumnas(db, 'documentos_emitidos', [['importado', 'INTEGER DEFAULT 0']]);
  // Clientes a los que siempre se les da crédito con recibo de pago
  await agregarColumnas(db, 'clientes', [['genera_recibo_pago', 'INTEGER DEFAULT 0']]);
  // Actividades económicas: las del tercero (varias, de Hacienda) y la de la
  // empresa que se le asocia (predeterminada en sus ventas y compras).
  await agregarColumnas(db, 'clientes', [['actividades_json', 'TEXT'], ['actividad_empresa', 'TEXT']]);
  // Actividad de la empresa con que se emitió cada comprobante
  await agregarColumnas(db, 'documentos_emitidos', [['actividad_emisor', 'TEXT']]);
  // Actividad con que el proveedor emitió su factura (CodigoActividadEmisor)
  await agregarColumnas(db, 'documentos_recibidos', [['actividad_proveedor', 'TEXT']]);
  await unaVez(db, 'actividad_proveedor_v1', async () => {
    const { rows } = await db.execute(`SELECT id, xml FROM documentos_recibidos WHERE xml IS NOT NULL AND actividad_proveedor IS NULL`);
    for (const r of rows) {
      const m = String(r.xml).match(/<CodigoActividad(?:Emisor)?>(\d+)<\/CodigoActividad(?:Emisor)?>/);
      if (m) await db.execute({ sql: 'UPDATE documentos_recibidos SET actividad_proveedor = ? WHERE id = ?', args: [m[1], String(r.id)] });
    }
  });
  // Ejemplo: el hotel también tiene inscrito el restaurante (dos actividades)
  await unaVez(db, 'emisor_segunda_actividad_v1', async () => {
    const { rows } = await db.execute(`SELECT id, actividades_json FROM emisores WHERE id = 'em-1'`);
    let acts: { codigo: string; nombre: string; principal?: boolean }[] = [];
    try { acts = rows[0]?.actividades_json ? JSON.parse(String(rows[0].actividades_json)) : []; } catch { acts = []; }
    if (rows[0] && acts.length === 1) {
      acts.push({ codigo: '561001', nombre: 'Actividades de restaurantes y de servicio móvil de comidas' });
      await db.execute({ sql: `UPDATE emisores SET actividades_json = ? WHERE id = 'em-1'`, args: [JSON.stringify(acts)] });
    }
  });
  await agregarColumnas(db, 'documentos_emitidos', [['recibo_de', 'TEXT']]);
  // Cuenta contable propia de los descuentos e impuestos configurados
  await agregarColumnas(db, 'descuentos', [['cuenta', "TEXT DEFAULT ''"], ['codigo_otro', "TEXT DEFAULT ''"]]);
  // Empresa de demostración (Hotel Fortuna, 3-101-123456): sus ventas de restaurante y bar
  // van con la segunda actividad, para que los reportes muestren dos actividades
  {
    const { rows } = await db.execute("SELECT valor FROM app_meta WHERE clave = 'demo_segunda_actividad'");
    if (!rows.length) {
      await db.execute(`UPDATE documentos_emitidos SET actividad_emisor = '561001 - Actividades de restaurantes y de servicio móvil de comidas'
        WHERE COALESCE(actividad_emisor, '') = ''
          AND emisor_id IN (SELECT id FROM emisores WHERE REPLACE(cedula_juridica, '-', '') = '${gt ? '16896963' : '3101123456'}')
          AND id IN (SELECT documento_id FROM documentos_emitidos_lineas
                     WHERE descripcion LIKE 'Almuerzo%' OR descripcion LIKE 'Consumo en bar%' OR descripcion LIKE 'Consumo de bar%')`);
      await db.execute("INSERT INTO app_meta (clave, valor) VALUES ('demo_segunda_actividad', '1')");
    }
  }
  // Una sola vez: los asientos automáticos que quedaron pendientes pasan a contabilizados
  // (desde ahora nacen así al aceptarse el documento)
  {
    const { rows } = await db.execute("SELECT valor FROM app_meta WHERE clave = 'asientos_auto_contabilizados'");
    if (!rows.length) {
      await db.execute("UPDATE asientos SET contabilizado = 1 WHERE origen = 'Facturación electrónica' AND COALESCE(anulado, 0) = 0 AND COALESCE(contabilizado, 0) = 0");
      await db.execute("INSERT INTO app_meta (clave, valor) VALUES ('asientos_auto_contabilizados', '1')");
    }
  }
  await agregarColumnas(db, 'impuestos', [['cuenta', "TEXT DEFAULT ''"], ['codigo_otro', "TEXT DEFAULT ''"]]);
  // Todo impuesto va ligado a una cuenta: el IVA sin cuenta toma la de IVA por pagar de Cuentas de facturación
  if (!gt) await unaVez(db, 'impuestos_con_cuenta_v1', async () => {
    const { rows } = await db.execute("SELECT cuenta_iva_ventas FROM mapeo_contable_facturacion LIMIT 1");
    const cta = String(rows[0]?.cuenta_iva_ventas ?? '300-002-0002');
    await db.execute({ sql: "UPDATE impuestos SET cuenta = ? WHERE tipo = 'IVA' AND COALESCE(cuenta, '') = ''", args: [cta] });
  });
  await agregarColumnas(db, 'documentos_emitidos', [['reemplaza_a', 'TEXT'], ['reemplazado_por', 'TEXT'], ['anular_en_origen', 'INTEGER DEFAULT 0'], ['anulado_en_origen', 'INTEGER DEFAULT 0']]);
  // Los rechazos de ejemplo traen un motivo como el que envía Hacienda
  await unaVez(db, 'motivos_rechazo_ejemplo_v1', async () => {
    const motivos = [
      'El número de identificación del receptor no se encuentra inscrito en el Registro Único Tributario.',
      'El código CABYS 6311100000000 de la línea 1 no existe en el catálogo vigente.',
      'El monto total del comprobante no coincide con la suma de las líneas de detalle.',
      'El código de actividad económica del emisor no está vigente.',
    ];
    const { rows } = await db.execute(`SELECT id FROM documentos_emitidos WHERE estado = 'Rechazado' AND COALESCE(ultimo_error, '') = ''`);
    for (const [i, r] of rows.entries()) await db.execute({ sql: 'UPDATE documentos_emitidos SET ultimo_error = ? WHERE id = ?', args: [motivos[i % motivos.length], String(r.id)] });
  });
  // Catálogos de Hacienda que pueden crecer (medios de pago, etc.). Se
  // siembran con los valores conocidos y se actualizan con
  // scripts/actualizar-catalogos.mjs cuando Hacienda publique códigos nuevos.
  await db.execute(`CREATE TABLE IF NOT EXISTS catalogos_hacienda (
    catalogo TEXT NOT NULL, codigo TEXT NOT NULL, descripcion TEXT, activo INTEGER DEFAULT 1, orden INTEGER DEFAULT 0, actualizado TEXT,
    PRIMARY KEY (catalogo, codigo)
  )`);
  {
    const { MEDIOS_PAGO: medios } = await import('@/data/catalogosHacienda');
    for (const [i, m] of medios.entries()) {
      await db.execute({ sql: `INSERT OR IGNORE INTO catalogos_hacienda (catalogo, codigo, descripcion, activo, orden, actualizado) VALUES ('medios_pago', ?, ?, 1, ?, ?)`, args: [m.value, m.label, i, new Date().toISOString()] });
    }
  }
  {
    const { crearTablasCatalogos } = await import('@/lib/catalogosBase');
    await crearTablasCatalogos(db);
  }
  await agregarColumnas(db, 'asientos', [['motivo_anulacion', 'TEXT'], ['archivos_json', 'TEXT'], ['historial_json', 'TEXT'], ['conciliacion_json', 'TEXT']]);
  await unaVez(db, 'asientos_ejemplo_v1', async () => {
    const { ASIENTOS_EJEMPLO, ANULADOS_EJEMPLO } = await import('@/data/asientosEjemplo');
    const { insertarAsiento } = await import('@/lib/asientosDb');
    for (const a of [...ASIENTOS_EJEMPLO].reverse()) await insertarAsiento(db, { ...a, conciliacion: a.conciliacion ?? null });
    for (const a of ANULADOS_EJEMPLO) await insertarAsiento(db, { ...a, anulado: true, conciliacion: a.conciliacion ?? null });
  });
  await unaVez(db, 'origen_front_desk_v1', async () => {
    await db.execute({ sql: `UPDATE documentos_emitidos SET origen = 'Front Desk' WHERE origen = ?`, args: ['Front Desk (PMS)'] });
    // La bandeja de avisos puede no existir todavía en una base nueva
    await db.execute({ sql: `UPDATE eventos_origen SET origen = 'Front Desk' WHERE origen = ?`, args: ['Front Desk (PMS)'] }).catch(() => {});
  });
  await unaVez(db, 'sin_sandbox_v1', async () => {
    await db.execute(`UPDATE emisores SET ambiente = 'produccion' WHERE COALESCE(ambiente, 'pruebas') <> 'produccion'`);
  });
  await db.execute(`CREATE TABLE IF NOT EXISTS dashboard_tarjetas (usuario TEXT PRIMARY KEY, tarjetas_json TEXT)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS eventos_origen (
    id TEXT PRIMARY KEY, tipo TEXT, documento_id TEXT, origen TEXT, origen_referencia TEXT, documento_nuevo_id TEXT, detalle TEXT, fecha TEXT, leido INTEGER DEFAULT 0
  )`);
  await agregarColumnas(db, 'documentos_emitidos', [['emitida_sola', 'INTEGER DEFAULT 0'], ['aviso_visto', 'INTEGER DEFAULT 0'], ['envio_correo', "TEXT DEFAULT ''"]]);
  // Las facturas base de las recurrentes de ejemplo no tenían líneas
  // guardadas: sin líneas no se pueden repetir (ni emitir solas).
  await unaVez(db, 'recurrentes_lineas_v1', async () => {
    const { rows } = await db.execute(`SELECT d.id, d.subtotal, d.iva, d.total FROM documentos_recurrentes r JOIN documentos_emitidos d ON d.id = r.documento_id
      WHERE NOT EXISTS (SELECT 1 FROM documentos_emitidos_lineas l WHERE l.documento_id = d.id)`);
    for (const d of rows) {
      const total = Number(d.total ?? 0);
      const subtotal = Number(d.subtotal ?? 0) || Math.round(total / 1.13 * 100) / 100;
      await db.execute({
        sql: `INSERT INTO documentos_emitidos_lineas (id, documento_id, codigo_cabys, descripcion, cantidad, precio_unitario, impuesto, codigo_tarifa, unidad_medida)
              VALUES (?, ?, '6743000000000', 'Parqueo mensual (espacio reservado)', 1, ?, 13, '08', 'Sp')`,
        args: ['lin-' + Math.random().toString(36).slice(2, 10), String(d.id), subtotal],
      });
    }
  });
  // Régimen y representante legal pasan del perfil (JSON) a columnas propias
  await unaVez(db, 'terceros_regimen_v1', async () => {
    const { rows } = await db.execute(`SELECT id, datos_json FROM clientes WHERE datos_json IS NOT NULL`);
    for (const r of rows) {
      try {
        const p = JSON.parse(String(r.datos_json));
        await db.execute({ sql: 'UPDATE clientes SET regimen = COALESCE(regimen, ?), representante_legal = COALESCE(representante_legal, ?) WHERE id = ?', args: [p.regimenTributario || null, p.representanteLegal || null, String(r.id)] });
      } catch { /* perfil ilegible */ }
    }
  });
  await unaVez(db, 'compras_automaticas_v1', async () => {
    // Proveedor de ejemplo con la importación encendida y su cuenta de gasto
    await db.execute(`UPDATE clientes SET compras_auto = 1, cuenta_gasto = '800-001-0004', correos_compra = 'facturas@cfm.cr' WHERE id = 'ter-p1'`);
    const xml = (n: string, cedE: string, nombreE: string, correoE: string, lineas: [string, string, number, number][]) => {
      const cons = '00100001010' + n.padStart(9, '0');
      const clave = ('50624092600' + cedE.padStart(12, '0') + cons + '1' + '87654321').slice(0, 50);
      let sub = 0, iva = 0;
      const det = lineas.map(([cod, detalle, cant, precio], i) => {
        const st = cant * precio, im = Math.round(st * 13) / 100; sub += st; iva += im;
        return `<LineaDetalle><NumeroLinea>${i + 1}</NumeroLinea><CodigoCABYS>4299900000000</CodigoCABYS><CodigoComercial><Tipo>01</Tipo><Codigo>${cod}</Codigo></CodigoComercial><Cantidad>${cant}</Cantidad><UnidadMedida>Unid</UnidadMedida><Detalle>${detalle}</Detalle><PrecioUnitario>${precio}</PrecioUnitario><MontoTotal>${st}</MontoTotal><SubTotal>${st}</SubTotal><BaseImponible>${st}</BaseImponible><Impuesto><Codigo>01</Codigo><CodigoTarifaIVA>08</CodigoTarifaIVA><Tarifa>13</Tarifa><Monto>${im}</Monto></Impuesto><MontoTotalLinea>${st + im}</MontoTotalLinea></LineaDetalle>`;
      }).join('');
      return { cons, xml: `<?xml version="1.0" encoding="utf-8"?>\n<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica"><Clave>${clave}</Clave><CodigoActividadEmisor>475201</CodigoActividadEmisor><CodigoActividadReceptor>551001</CodigoActividadReceptor><NumeroConsecutivo>${cons}</NumeroConsecutivo><FechaEmision>2026-09-23T09:30:00-06:00</FechaEmision><Emisor><Nombre>${nombreE}</Nombre><Identificacion><Tipo>02</Tipo><Numero>${cedE}</Numero></Identificacion><CorreoElectronico>${correoE}</CorreoElectronico></Emisor><Receptor><Nombre>Hotel Fortuna S.A.</Nombre><Identificacion><Tipo>02</Tipo><Numero>3101123456</Numero></Identificacion></Receptor><CondicionVenta>02</CondicionVenta><DetalleServicio>${det}</DetalleServicio><ResumenFactura><CodigoTipoMoneda><CodigoMoneda>CRC</CodigoMoneda><TipoCambio>1</TipoCambio></CodigoTipoMoneda><TotalGravado>${sub}</TotalGravado><TotalVentaNeta>${sub}</TotalVentaNeta><TotalImpuesto>${iva}</TotalImpuesto><TotalComprobante>${sub + iva}</TotalComprobante></ResumenFactura></FacturaElectronica>` };
    };
    const correos: [string, string, string, { cons: string; xml: string }][] = [
      ['mail-demo-cfm1', 'Ferretero Monteverde <facturas@cfm.cr>', 'Factura electrónica 4581',
        xml('4581', '3101222333', 'Comercial Ferretero Monteverde', 'facturas@cfm.cr', [['PV-12', 'Tubo PVC 1/2 pulgada', 10, 2350], ['BR-04', 'Brocha de 4 pulgadas', 4, 1900]])],
      ['mail-demo-lav1', 'Lavandería Industrial Arenal <fe@lavanderiaarenal.cr>', 'Comprobante electrónico 1203',
        xml('1203', '3101444555', 'Lavandería Industrial Arenal S.A.', 'fe@lavanderiaarenal.cr', [['LAV-S', 'Lavado de sábanas y toallas (kg)', 120, 850]])],
    ];
    for (const [id, de, asunto, x] of correos) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO correos (id, remitente, asunto, snippet, fecha, favorito, leido, tiene_adjunto_xml, importado, xml, xml_nombre, message_id, origen)
              VALUES (?, ?, ?, ?, ?, 0, 0, 1, 0, ?, ?, ?, 'imap')`,
        args: [id, de, asunto, 'Adjuntamos el comprobante electrónico en XML y PDF.', new Date().toISOString().slice(0, 10), x.xml, x.cons + '.xml', '<' + id + '@demo>'],
      });
    }
    // Lo que ya esté en la bandeja de proveedores conocidos se importa solo
    const { autoImportarPendientes } = await import('@/lib/comprasAuto');
    await autoImportarPendientes(db);
  });

  await unaVez(db, 'acuses_ejemplo_v1', async () => {
    const H = '551001 - Actividades de alojamiento para estancias cortas (hoteles)';
    const R = '561001 - Actividades de restaurantes y de servicio móvil de comidas';
    // Proveedores también como receptores, con sus actividades y la del hotel asociada
    await db.execute({ sql: `UPDATE clientes SET es_receptor = 1, actividad_economica = ?, actividades_json = ?, actividad_empresa = ? WHERE id = 'ter-p1'`,
      args: ['475201 - Venta al por menor de artículos de ferretería', JSON.stringify(['475201 - Venta al por menor de artículos de ferretería']), H] });
    await db.execute({
      sql: `INSERT OR IGNORE INTO clientes (id, nombre, tipo, tipo_identificacion, numero_identificacion, email, telefono, es_receptor, activo, actividad_economica, actividades_json, actividad_empresa)
            VALUES ('ter-p2', 'Distribuidora de Alimentos del Norte S.A.', 'proveedor', '02', '3101777888', 'facturas@alimentosnorte.cr', '2460-5566', 1, 1, ?, ?, ?)`,
      args: ['463001 - Venta al por mayor de alimentos', JSON.stringify(['463001 - Venta al por mayor de alimentos', '472101 - Venta al por menor de frutas y verduras']), R],
    });
    const { guardarCompra } = await import('@/lib/comprasGuardar');
    const compra = (n: string, prov: string, ced: string, fecha: string, act: string, lineas: [string, number, number][]) => {
      const sub = lineas.reduce((a, [, c, p]) => a + c * p, 0), iva = Math.round(sub * 13) / 100;
      return {
        proveedor: prov, proveedorIdentificacion: ced, consecutivo: '00100001010' + n.padStart(9, '0'),
        clave: ('506011026' + ced.padStart(12, '0') + '00100001010' + n.padStart(9, '0') + '1' + '76543210').slice(0, 50),
        fechaEmision: fecha, tipo: 'Factura electrónica', origen: 'xml', moneda: 'CRC', tipoCambio: 1, subtotal: sub, iva, total: sub + iva,
        tipoCreditoFiscal: 'pleno', actividadEmisor: act, emitirAcuse: false, generarAsiento: false,
        lineas: lineas.map(([d, c, p]) => ({ detalle: d, cantidad: c, precioUnitario: p, subtotal: c * p, tarifa: 13 })),
      };
    };
    const lista = [
      compra('4602', 'Comercial Ferretero Monteverde', '3101222333', '2026-10-02T10:00:00-06:00', '475201', [['Pintura blanca (galón)', 3, 14500]]),
      compra('4617', 'Comercial Ferretero Monteverde', '3101222333', '2026-10-05T09:20:00-06:00', '475201', [['Bombillos LED 12 W', 24, 1650]]),
      compra('8801', 'Distribuidora de Alimentos del Norte S.A.', '3101777888', '2026-10-03T07:45:00-06:00', '463001', [['Queso turrialba (kg)', 12, 4200], ['Natilla (litro)', 10, 1850]]),
      // Esta viene con una actividad que el proveedor todavía no tenía registrada
      compra('8815', 'Distribuidora de Alimentos del Norte S.A.', '3101777888', '2026-10-06T07:30:00-06:00', '108001', [['Pan baguette', 60, 450]]),
    ];
    for (const d of lista) await guardarCompra(db, d);
  });

  await unaVez(db, 'impuestos_ejemplo_v3', async () => {
    await db.execute({ sql: `UPDATE impuestos SET descripcion = ? WHERE descripcion LIKE '%transporte de pasajeros (transfer)%'`, args: ['Ej.: boletos aéreos, servicios de salud privados.'] });
    await db.execute({ sql: `UPDATE impuestos SET descripcion = ? WHERE descripcion LIKE '%atención médica de emergencia%'`, args: ['Ventas exentas o no sujetas (ej. exportaciones de servicios).'] });
  });

  // Todo comprobante emitido lleva clave (50 dígitos) y número consecutivo
  // completo (20). Los ejemplos viejos venían sin clave: se les genera.
  await unaVez(db, 'claves_ejemplo_v1', async () => {
    const { rows: ems } = await db.execute('SELECT id, cedula_juridica FROM emisores');
    const cedDe = new Map(ems.map(e => [String(e.id), String(e.cedula_juridica ?? '')]));
    const cedDefecto = String(ems[0]?.cedula_juridica ?? '');
    const { rows } = await db.execute(`SELECT id, tipo, numero_factura, emisor_id, fecha_emision FROM documentos_emitidos
      WHERE estado != 'Borrador' AND COALESCE(clave, '') = '' AND COALESCE(numero_factura, '') != ''`);
    for (const r of rows) {
      const num = String(r.numero_factura).replace(/\D/g, '');
      const clave = generarClave({
        cedulaEmisor: cedDe.get(String(r.emisor_id)) || cedDefecto,
        sucursal: num.length === 20 ? num.slice(0, 3) : '001', terminal: num.length === 20 ? num.slice(3, 8) : '00001',
        tipoDocumento: String(r.tipo), consecutivo: num.length === 20 ? num.slice(-10) : String(Number(num) % 1e9).padStart(10, '0'), fecha: new Date(String(r.fecha_emision)),
      });
      await db.execute({ sql: 'UPDATE documentos_emitidos SET clave = ?, numero_factura = ? WHERE id = ?', args: [clave, clave.slice(21, 41), String(r.id)] });
    }
  });

  // Compras de ejemplo: la clave traía la cédula corrida (14 dígitos en vez de 12)
  await unaVez(db, 'claves_compras_v1', async () => {
    const { rows } = await db.execute(`SELECT id, numero_factura, clave, proveedor_identificacion, fecha_emision FROM documentos_recibidos WHERE length(clave) = 50`);
    for (const r of rows) {
      const k = String(r.clave), num = String(r.numero_factura);
      if (!/^\d{20}$/.test(num) || k.slice(21, 41) === num) continue;
      const f = new Date(String(r.fecha_emision));
      const fecha = String(f.getDate()).padStart(2, '0') + String(f.getMonth() + 1).padStart(2, '0') + String(f.getFullYear()).slice(-2);
      const ced = String(r.proveedor_identificacion ?? '').replace(/\D/g, '').padStart(12, '0').slice(-12);
      const nueva = '506' + fecha + ced + num + '1' + k.slice(-8);
      await db.execute({ sql: 'UPDATE documentos_recibidos SET clave = ? WHERE id = ?', args: [nueva, String(r.id)] });
    }
  });

  // Compras sin MI actividad (hotel): se les asigna la asociada al proveedor o
  // la principal, para que el acuse no tenga que pedirla.
  await unaVez(db, 'compras_mi_actividad_v1', async () => {
    const { rows } = await db.execute(`SELECT id, proveedor_identificacion FROM documentos_recibidos WHERE COALESCE(actividad_economica, '') = '' AND estado NOT IN ('Aceptado', 'Rechazado')`);
    for (const r of rows) {
      const act = await miActividadPorDefecto(db, String(r.proveedor_identificacion ?? ''));
      if (act) await db.execute({ sql: 'UPDATE documentos_recibidos SET actividad_economica = ? WHERE id = ?', args: [act, String(r.id)] });
    }
  });

  // Ejemplos de facturas de exportación (USD, cliente extranjero, IVA 0 %) y
  // de recibos electrónicos de pago (abonos a una factura a crédito con IVA al cobro).
  await unaVez(db, 'ejemplos_exportacion_recibos_v1', async () => {
    const h = await ayudanteEjemplos(db);
    if (!h) return;
    const { insertar, r2 } = h;
    type Linea = LineaEjemplo;
    // Facturas de exportación: servicios a clientes del extranjero, tarifa 0 %
    const nature = { cli: 'cli-h4', nombre: 'Nature Travel Group LLC', email: 'billing@naturetravel.com', tipoId: '05', idRec: 'US-884521' };
    await insertar({ id: '#26901', tipo: 'Factura de exportación', ...nature, fecha: '2026-09-08T14:10:00', moneda: 'USD', tc: 510, cond: '02', medios: ['04'], origen: 'Manual',
      lineas: [['6311100000000', 'Paquete de hospedaje grupo Nature Travel (5 noches)', 5, 240, 'Noche', 0, '01'], ['8554000000000', 'Tour volcán Arenal y caminata', 12, 55, 'Servicio', 0, '01']] });
    await insertar({ id: '#26902', tipo: 'Factura de exportación', cli: '', nombre: 'Viajes Andinos S.A.C.', email: 'pagos@viajesandinos.pe', tipoId: '05', idRec: 'PE-20604412871',
      fecha: '2026-09-25T10:30:00', moneda: 'USD', tc: 510, cond: '01', medios: ['04'], origen: 'Manual',
      lineas: [['6311100000000', 'Bloque de habitaciones para operador (3 noches)', 6, 110, 'Noche', 0, '01'], ['6413200000000', 'Transfer aeropuerto - hotel', 2, 90, 'Servicio', 0, '01']] });

    // Factura a crédito con IVA al cobro (condición 10) y sus dos abonos con recibo de pago
    const arenal = { cli: 'cli-h1', nombre: 'Arenal Adventure Tours S.A.', email: 'facturas@arenaladventure.cr', tipoId: '02', idRec: '3101555123' };
    const lineasCredito: Linea[] = [['8596100000000', 'Alquiler de salón de eventos (hora)', 8, 45000, 'Hora', 13, '08'], ['6331000000000', 'Coffee break para evento', 40, 4500, 'Servicio', 13, '08']];
    const claveFac = await insertar({ id: '#26900', tipo: 'Factura electrónica', ...arenal, fecha: '2026-08-28T09:00:00', moneda: 'CRC', tc: 1, cond: '10', medios: ['04'], origen: 'Manual', lineas: lineasCredito });
    const abonos: [string, string, number, string][] = [['#26903', '2026-09-12T11:00:00', 0.5, 'TRF-778812'], ['#26904', '2026-09-30T15:20:00', 0.3, 'TRF-781540']];
    for (const [id, fecha, prop, comp] of abonos) {
      const base = r2(lineasCredito.reduce((a, l) => a + l[2] * l[3], 0) * prop);
      await insertar({ id, tipo: 'Recibo Electrónico de Pago', ...arenal, fecha, moneda: 'CRC', tc: 1, cond: '11', medios: ['04'], origen: 'Manual',
        ref: { clave: claveFac, motivo: `Abono a la factura ${claveFac.slice(21, 41)}` }, reciboDe: '#26900',
        abono: { fechaPago: fecha.slice(0, 10), medio: '04', descripcion: 'Abono', comprobante: comp },
        lineas: [['', 'Abono', 1, base, 'Unid', 13, '08']] });
    }
  });

  // Ejemplo del día 90: factura a crédito con IVA al cobro de hace más de 90
  // días. Un abono dentro del plazo (IVA en el mes del cobro), el saldo sin
  // cobrar al día 90 (su IVA se declara ese mes) y un abono posterior que
  // lleva recibo solo de respaldo.
  await unaVez(db, 'ejemplo_recibo_dia90_v1', async () => {
    const h = await ayudanteEjemplos(db);
    if (!h) return;
    const { insertar, r2 } = h;
    const volcan = { cli: 'cli-h2', nombre: 'Agencia de Viajes Volcán Tropical S.A.', email: 'contabilidad@volcantropical.cr', tipoId: '02', idRec: '3101666234' };
    const lineas: LineaEjemplo[] = [['6311100000000', 'Hospedaje grupo agencia (10 habitaciones, 3 noches)', 30, 42000, 'Noche', 13, '08']];
    const claveFac = await insertar({ id: '#26905', tipo: 'Factura electrónica', ...volcan, fecha: '2026-06-15T10:00:00', moneda: 'CRC', tc: 1, cond: '10', medios: ['04'], origen: 'Front Desk', lineas });
    const base = lineas.reduce((a, l) => a + l[2] * l[3], 0);
    const abonos: [string, string, number, string][] = [['#26906', '2026-07-20T10:30:00', 0.4, 'TRF-702215'], ['#26907', '2026-09-28T09:10:00', 0.2, 'TRF-779903']];
    for (const [id, fecha, prop, comp] of abonos) {
      await insertar({ id, tipo: 'Recibo Electrónico de Pago', ...volcan, fecha, moneda: 'CRC', tc: 1, cond: '11', medios: ['04'], origen: 'Manual',
        ref: { clave: claveFac, motivo: `Abono a la factura ${claveFac.slice(21, 41)}` }, reciboDe: '#26905',
        abono: { fechaPago: fecha.slice(0, 10), medio: '04', descripcion: 'Abono', comprobante: comp },
        lineas: [['', 'Abono', 1, r2(base * prop), 'Unid', 13, '08']] });
    }
  });

  // Clientes y proveedores de ejemplo: cada uno con su propio código auxiliar
  // (el proveedor de ejemplo repetía el 300-001-0001-0001 de otro proveedor).
  await unaVez(db, 'terceros_auxiliares_v1', async () => {
    const { rows: p1 } = await db.execute(`SELECT datos_json FROM clientes WHERE id = 'ter-p1'`);
    if (p1[0]?.datos_json) {
      try {
        const perfil = JSON.parse(String(p1[0].datos_json));
        if (perfil.auxId === '0001') { perfil.auxId = '0002'; await db.execute({ sql: `UPDATE clientes SET datos_json = ? WHERE id = 'ter-p1'`, args: [JSON.stringify(perfil)] }); }
      } catch { /* perfil ilegible: se deja */ }
    }
    for (const id of ['cli-h1', 'cli-h2', 'cli-h4', 'ter-p2']) await crearCuentaTercero(db, id).catch(() => null);
  });
  // Al final, cuando ya existen todos los grupos
  if (gt) await unaVez(db, 'grupos_clasificacion_gt_v2', () => migrarGruposGT(db));
}

/** Base de la empresa elegida (o la del país indicado, para las tareas automáticas). */
export async function getDb(pais?: PerfilPais): Promise<Client> {
  const p = pais ?? paisEnCurso() ?? await paisDeSolicitud();
  const db = getClient(p);
  // La migración siembra los datos de ejemplo con las reglas de su país
  if (!listas[p]) listas[p] = conPais(p, () => migrar(db, p));
  await listas[p];
  return db;
}

// Ejemplos de comprobantes emitidos con número y clave reales (caja-1)
async function ayudanteEjemplos(db: Client) {
    const { rows: cj } = await db.execute(`SELECT id, sucursal, terminal, emisor_id FROM cajas WHERE id = 'caja-1'`);
    if (!cj.length) return null;
    const suc = String(cj[0].sucursal ?? '001'), term = String(cj[0].terminal ?? '00001');
    const emisorId = String(cj[0].emisor_id ?? 'em-1');
    const { rows: em } = await db.execute({ sql: 'SELECT cedula_juridica FROM emisores WHERE id = ?', args: [emisorId] });
    const ced = String(em[0]?.cedula_juridica ?? '3101000000');
    const siguiente = async (tipo: string) => {
      const { rows } = await db.execute({ sql: `SELECT consecutivo_actual FROM cajas_numeracion WHERE caja_id = 'caja-1' AND tipo_documento = ?`, args: [tipo] });
      const n = Number(rows[0]?.consecutivo_actual ?? 0) + 1;
      if (rows.length) await db.execute({ sql: `UPDATE cajas_numeracion SET consecutivo_actual = ? WHERE caja_id = 'caja-1' AND tipo_documento = ?`, args: [n, tipo] });
      else await db.execute({ sql: `INSERT INTO cajas_numeracion (id, caja_id, tipo_documento, consecutivo_actual) VALUES (?, 'caja-1', ?, ?)`, args: ['cn-' + Math.random().toString(36).slice(2), tipo, n] });
      return n;
    };
    const r2 = (x: number) => Math.round(x * 100) / 100;
    type Linea = [string, string, number, number, string, number, string]; // cabys, desc, cant, precio, unidad, tarifa %, código tarifa
    const insertar = async (d: { id: string; tipo: string; cli: string; nombre: string; email: string; tipoId: string; idRec: string; fecha: string; moneda: 'USD' | 'CRC'; tc: number;
      cond: string; medios: string[]; lineas: Linea[]; origen: string; ref?: { clave: string; motivo: string }; reciboDe?: string; abono?: object }) => {
      const n = await siguiente(d.tipo);
      const clave = generarClave({ cedulaEmisor: ced, sucursal: suc, terminal: term, tipoDocumento: d.tipo, consecutivo: String(n), fecha: new Date(d.fecha) });
      const sub = r2(d.lineas.reduce((a, l) => a + l[2] * l[3], 0));
      const iva = r2(d.lineas.reduce((a, l) => a + l[2] * l[3] * l[5] / 100, 0));
      await db.execute({
        sql: `INSERT OR IGNORE INTO documentos_emitidos (id, tipo, numero_factura, clave, cliente_id, cliente_nombre, receptor_email, emisor_id, caja_id, fecha_emision, estado, recurrente,
                condicion_venta, medios_pago, moneda, tipo_cambio, subtotal, iva, total, estado_envio, origen, receptor_tipo_identificacion, receptor_identificacion,
                referencia_documento, referencia_motivo, recibo_de, abono_json)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'caja-1', ?, 'Aceptado', 0, ?, ?, ?, ?, ?, ?, ?, 'enviado', ?, ?, ?, ?, ?, ?, ?)`,
        args: [d.id, d.tipo, clave.slice(21, 41), clave, d.cli || null, d.nombre, d.email, emisorId, d.fecha, d.cond, JSON.stringify(d.medios), d.moneda, d.tc, sub, iva, r2(sub + iva),
          d.origen, d.tipoId, d.idRec, d.ref?.clave ?? null, d.ref?.motivo ?? null, d.reciboDe ?? null, d.abono ? JSON.stringify(d.abono) : null],
      });
      for (const [k, l] of d.lineas.entries()) {
        await db.execute({
          sql: `INSERT OR IGNORE INTO documentos_emitidos_lineas (id, documento_id, codigo_cabys, descripcion, cantidad, precio_unitario, impuesto, codigo_tarifa, unidad_medida) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [`${d.id}-l${k + 1}`, d.id, l[0], l[1], l[2], l[3], l[5], l[6], l[4]],
        });
      }
      return clave;
    };

  return { insertar, r2 };
}
type LineaEjemplo = [string, string, number, number, string, number, string];
