import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';
import type { Client } from '@libsql/client';
import { autoImportarCorreo } from '@/lib/comprasAuto';

export interface BuzonConfig {
  host: string; puerto: number; seguro: boolean; usuario: string; clave: string; carpeta: string; dias: number;
  ultimo_uid: number; ultima_sync: string; ultimo_error: string;
  auto: boolean; intervalo: number;       // revisar solo cada `intervalo` minutos
}

export async function leerConfig(db: Client): Promise<BuzonConfig> {
  const { rows } = await db.execute(`SELECT * FROM buzon_config WHERE id = 'principal'`);
  const r = rows[0];
  return {
    host: String(r?.host ?? ''), puerto: Number(r?.puerto ?? 993), seguro: Number(r?.seguro ?? 1) === 1,
    usuario: String(r?.usuario ?? ''), clave: String(r?.clave ?? ''), carpeta: String(r?.carpeta || 'INBOX'),
    dias: Number(r?.dias ?? 30), ultimo_uid: Number(r?.ultimo_uid ?? 0), ultima_sync: String(r?.ultima_sync ?? ''), ultimo_error: String(r?.ultimo_error ?? ''),
    auto: Number(r?.auto ?? 1) === 1, intervalo: Number(r?.intervalo ?? 15) || 15,
  };
}

export async function guardarConfig(db: Client, c: Partial<BuzonConfig>) {
  const act = await leerConfig(db);
  const n = { ...act, ...c };
  await db.execute({
    sql: `INSERT INTO buzon_config (id, host, puerto, seguro, usuario, clave, carpeta, dias, ultimo_uid, ultima_sync, ultimo_error, auto, intervalo)
          VALUES ('principal', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET host = excluded.host, puerto = excluded.puerto, seguro = excluded.seguro, usuario = excluded.usuario,
            clave = excluded.clave, carpeta = excluded.carpeta, dias = excluded.dias, ultimo_uid = excluded.ultimo_uid,
            ultima_sync = excluded.ultima_sync, ultimo_error = excluded.ultimo_error, auto = excluded.auto, intervalo = excluded.intervalo`,
    args: [n.host, n.puerto, n.seguro ? 1 : 0, n.usuario, n.clave, n.carpeta, n.dias, n.ultimo_uid, n.ultima_sync, n.ultimo_error, n.auto ? 1 : 0, n.intervalo],
  });
}

const RAIZ_COMPROBANTE = /<\s*(?:\w+:)?(FacturaElectronica|TiqueteElectronico|NotaCreditoElectronica|NotaDebitoElectronica|FacturaElectronicaCompra|FacturaElectronicaExportacion)[\s>]/;
const RAIZ_RESPUESTA = /<\s*(?:\w+:)?MensajeHacienda[\s>]/;

export function clasificarXml(texto: string): 'comprobante' | 'respuesta' | 'otro' {
  if (RAIZ_RESPUESTA.test(texto)) return 'respuesta';
  if (RAIZ_COMPROBANTE.test(texto)) return 'comprobante';
  return 'otro';
}

export interface CorreoProcesado { guardado: boolean; motivo?: string; asunto: string; automatico?: boolean }

// Procesa un correo ya parseado y lo guarda si trae un comprobante.
async function guardarCorreo(db: Client, m: ParsedMail, origen: 'imap' | 'eml'): Promise<CorreoProcesado> {
  const asunto = m.subject || '(sin asunto)';
  const messageId = m.messageId || '';
  if (messageId) {
    const { rows } = await db.execute({ sql: 'SELECT id FROM correos WHERE message_id = ?', args: [messageId] });
    if (rows.length) return { guardado: false, motivo: 'Ya estaba en la bandeja', asunto };
  }
  let xml = '', xmlNombre = '', respuesta = '', pdf = '';
  for (const a of m.attachments ?? []) {
    const nombre = a.filename || '';
    const esXml = /\.xml$/i.test(nombre) || /xml/i.test(a.contentType);
    if (esXml) {
      const texto = a.content.toString('utf8').replace(/^﻿/, '');
      const tipo = clasificarXml(texto);
      if (tipo === 'comprobante' && !xml) { xml = texto; xmlNombre = nombre; }
      else if (tipo === 'respuesta' && !respuesta) respuesta = texto;
    } else if (/\.pdf$/i.test(nombre) || /pdf/i.test(a.contentType)) pdf = pdf || nombre;
  }
  if (!xml) return { guardado: false, motivo: respuesta ? 'Solo trae la respuesta de Hacienda, sin el comprobante' : 'No trae XML de comprobante', asunto };
  // Mismo comprobante reenviado dos veces: se reconoce por la clave.
  const clave = xml.match(/<\s*(?:\w+:)?Clave\s*>\s*(\d{50})\s*</)?.[1];
  if (clave) {
    const { rows } = await db.execute({ sql: `SELECT id FROM correos WHERE xml LIKE ?`, args: [`%${clave}%`] });
    if (rows.length) return { guardado: false, motivo: 'Ese comprobante ya llegó en otro correo', asunto };
  }
  const de = m.from?.value?.[0];
  const remitente = de?.name ? `${de.name} <${de.address}>` : (de?.address ?? 'desconocido');
  const fecha = (m.date ?? new Date()).toISOString().slice(0, 10);
  const snippet = (m.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const idCorreo = 'mail-' + Math.random().toString(36).slice(2, 10);
  await db.execute({
    sql: `INSERT INTO correos (id, remitente, asunto, snippet, fecha, favorito, leido, tiene_adjunto_xml, importado, xml, xml_respuesta, xml_nombre, pdf_nombre, message_id, origen)
          VALUES (?, ?, ?, ?, ?, 0, 0, 1, 0, ?, ?, ?, ?, ?, ?)`,
    args: [idCorreo, remitente, asunto, snippet, fecha, xml, respuesta, xmlNombre, pdf, messageId, origen],
  });
  // Proveedor conocido: se importa solo y queda listo para el acuse
  const auto = await autoImportarCorreo(db, idCorreo).catch(() => ({ importado: false }));
  return { guardado: true, asunto, automatico: auto.importado };
}

export async function procesarEml(db: Client, crudo: Buffer | string): Promise<CorreoProcesado> {
  return guardarCorreo(db, await simpleParser(crudo), 'eml');
}

function cliente(c: BuzonConfig) {
  return new ImapFlow({ host: c.host, port: c.puerto, secure: c.seguro, auth: { user: c.usuario, pass: c.clave }, logger: false, socketTimeout: 30_000 });
}

export async function probarConexion(c: BuzonConfig): Promise<{ ok: boolean; mensaje: string }> {
  if (!c.host || !c.usuario || !c.clave) return { ok: false, mensaje: 'Faltan servidor, usuario o contraseña.' };
  const im = cliente(c);
  try {
    await im.connect();
    const st = await im.status(c.carpeta, { messages: true });
    await im.logout();
    return { ok: true, mensaje: `Conectado. La carpeta ${c.carpeta} tiene ${st.messages ?? 0} correos.` };
  } catch (e) {
    return { ok: false, mensaje: errorLegible(e) };
  }
}

function errorLegible(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if ((e as { authenticationFailed?: boolean })?.authenticationFailed) return 'Usuario o contraseña incorrectos. En Gmail y Outlook se usa una "contraseña de aplicación".';
  if (/auth|login|credentials|invalid/i.test(m)) return 'Usuario o contraseña incorrectos. En Gmail y Outlook se usa una "contraseña de aplicación".';
  if (/ENOTFOUND|EAI_AGAIN/i.test(m)) return 'No se encontró el servidor. Revisa el nombre (ej. imap.gmail.com).';
  if (/ECONNREFUSED|ETIMEDOUT|timeout/i.test(m)) return 'El servidor no respondió. Revisa el puerto (993 con SSL) y la conexión.';
  return m;
}

// Trae los correos nuevos (UID mayor al último leído; la primera vez, los de
// los últimos `dias`). Nunca marca ni borra nada en el buzón.
export async function sincronizar(db: Client): Promise<{ ok: boolean; mensaje: string; nuevos: number; automaticos?: number; revisados: number; omitidos: { asunto: string; motivo: string }[] }> {
  const c = await leerConfig(db);
  if (!c.host || !c.usuario || !c.clave) return { ok: false, mensaje: 'Configura primero el buzón (servidor, usuario y contraseña).', nuevos: 0, revisados: 0, omitidos: [] };
  const im = cliente(c);
  let nuevos = 0, automaticos = 0, revisados = 0, maxUid = c.ultimo_uid;
  const omitidos: { asunto: string; motivo: string }[] = [];
  try {
    await im.connect();
    const lock = await im.getMailboxLock(c.carpeta);
    try {
      const desde = new Date(Date.now() - Math.max(1, c.dias) * 86_400_000);
      const rango = c.ultimo_uid ? { uid: `${c.ultimo_uid + 1}:*` } : { since: desde };
      // Algunos servidores no aceptan SINCE: en ese caso se toman todos y se
      // limita a los 300 más recientes.
      const uids = (await im.search(rango, { uid: true })) || (await im.search({ all: true }, { uid: true })) || [];
      for (const uid of uids.slice(-300)) {
        if (uid <= c.ultimo_uid) continue;
        const msg = await im.fetchOne(String(uid), { source: true }, { uid: true });
        revisados++;
        maxUid = Math.max(maxUid, uid);
        if (!msg || !msg.source) continue;
        const r = await procesarEml(db, msg.source).then(x => x, (e: unknown) => ({ guardado: false, motivo: errorLegible(e), asunto: `UID ${uid}` }));
        if (r.guardado) { nuevos++; if ('automatico' in r && r.automatico) automaticos++; } else if (r.motivo) omitidos.push({ asunto: r.asunto, motivo: r.motivo });
      }
    } finally { lock.release(); }
    await im.logout();
    await guardarConfig(db, { ultimo_uid: maxUid, ultima_sync: new Date().toISOString(), ultimo_error: '' });
    const porRevisar = nuevos - automaticos;
    const mensaje = !nuevos ? 'No hay comprobantes nuevos.'
      : [automaticos ? `${automaticos} importado${automaticos === 1 ? '' : 's'} automáticamente, listo${automaticos === 1 ? '' : 's'} para el acuse` : '',
         porRevisar ? `${porRevisar} por revisar en la bandeja` : ''].filter(Boolean).join(' y ') + '.';
    return { ok: true, mensaje: mensaje.charAt(0).toUpperCase() + mensaje.slice(1), nuevos, automaticos, revisados, omitidos };
  } catch (e) {
    const mensaje = errorLegible(e);
    await guardarConfig(db, { ultimo_error: mensaje, ultima_sync: new Date().toISOString() });
    try { await im.logout(); } catch { /* ya cerrado */ }
    return { ok: false, mensaje, nuevos, automaticos, revisados, omitidos };
  }
}
