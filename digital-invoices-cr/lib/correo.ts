import nodemailer from 'nodemailer';
import { getDb } from './db';

// Envío real de correo (reenvío de factura al cliente) vía SMTP. Necesita
// las variables de entorno SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
// SMTP_FROM configuradas con una cuenta real (Gmail, SendGrid, el propio
// correo del hotel, etc.). Sin esas variables, el envío se "simula": queda
// registrado en la tabla correos_enviados con estado 'simulado' para que la
// UI pueda mostrarlo igual, pero no sale ningún correo de verdad.

function transporteConfigurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function enviarCorreo(destinatario: string, asunto: string, cuerpoHtml: string, adjunto?: { nombre: string; contenido: string }) {
  const db = await getDb();
  const id = 'ce-' + Math.random().toString(36).slice(2);
  const fecha = new Date().toISOString();

  if (!transporteConfigurado()) {
    await db.execute({
      sql: `INSERT INTO correos_enviados (id, destinatario, asunto, cuerpo, fecha, estado) VALUES (?, ?, ?, ?, ?, 'simulado')`,
      args: [id, destinatario, asunto, cuerpoHtml, fecha],
    });
    return { enviado: false, simulado: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: destinatario,
      subject: asunto,
      html: cuerpoHtml,
      attachments: adjunto ? [{ filename: adjunto.nombre, content: adjunto.contenido }] : [],
    });
    await db.execute({
      sql: `INSERT INTO correos_enviados (id, destinatario, asunto, cuerpo, fecha, estado) VALUES (?, ?, ?, ?, ?, 'enviado')`,
      args: [id, destinatario, asunto, cuerpoHtml, fecha],
    });
    return { enviado: true, simulado: false };
  } catch (e) {
    await db.execute({
      sql: `INSERT INTO correos_enviados (id, destinatario, asunto, cuerpo, fecha, estado) VALUES (?, ?, ?, ?, ?, 'error')`,
      args: [id, destinatario, asunto, cuerpoHtml, fecha],
    });
    throw e;
  }
}

// Enviar (o reenviar) un comprobante emitido por correo, con el XML adjunto.
export async function enviarDocumentoPorCorreo(documentoId: string, para: string[], mensaje = '', adjuntos: string[] = ['xml']) {
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT * FROM documentos_emitidos WHERE id = ?', args: [documentoId] });
  const doc = rows[0];
  if (!doc) return { error: 'No encontrado' as const };
  const escapar = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
  const marcar = (estado: 'enviado' | 'error') => db.execute({ sql: 'UPDATE documentos_emitidos SET envio_correo = ? WHERE id = ?', args: [estado, documentoId] });
  const resultado = await enviarCorreo(
    para.join(', '),
    `${doc.tipo ?? 'Comprobante electrónico'} ${doc.numero_factura}`,
    `${mensaje ? `<p>${escapar(mensaje).replace(/\n/g, '<br>')}</p>` : ''}<p>Adjuntamos el comprobante electrónico ${doc.numero_factura} por un total de ${Number(doc.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.</p>`,
    adjuntos.includes('xml') && doc.xml ? { nombre: `${String(doc.numero_factura || documentoId.replace('#', ''))}.xml`, contenido: String(doc.xml) } : undefined,
  ).catch(async e => { await marcar('error'); throw e; });
  await marcar('enviado');
  return resultado;
}
