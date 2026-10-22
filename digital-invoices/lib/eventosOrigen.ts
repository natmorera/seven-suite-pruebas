import type { Client } from '@libsql/client';

export type TipoEvento = 'anulado' | 'reemplazado' | 'rechazado';

export async function registrarEvento(db: Client, ev: {
  tipo: TipoEvento; documentoId: string; origen: string; origenReferencia: string | null;
  documentoNuevoId?: string | null; detalle?: string;
}) {
  if (!ev.origen || ev.origen === 'Manual') return;
  await db.execute({
    sql: `INSERT INTO eventos_origen (id, tipo, documento_id, origen, origen_referencia, documento_nuevo_id, detalle, fecha, leido)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    args: ['ev-' + Math.random().toString(36).slice(2, 12), ev.tipo, ev.documentoId, ev.origen, ev.origenReferencia, ev.documentoNuevoId ?? null, ev.detalle ?? '', new Date().toISOString()],
  });
}

export async function enlazarDespuesDeEmitir(db: Client, nuevoId: string, op: { reemplazaA?: string | null; anularEnOrigen?: boolean; referenciaNumero?: string | null }) {
  if (op.reemplazaA) {
    const { rows } = await db.execute({ sql: 'SELECT id, origen, origen_referencia FROM documentos_emitidos WHERE id = ?', args: [op.reemplazaA] });
    const orig = rows[0];
    if (orig) {
      await db.execute({ sql: 'UPDATE documentos_emitidos SET reemplazado_por = ? WHERE id = ?', args: [nuevoId, op.reemplazaA] });
      await db.execute({ sql: 'UPDATE documentos_emitidos SET reemplaza_a = ? WHERE id = ?', args: [op.reemplazaA, nuevoId] });
      await registrarEvento(db, { tipo: 'reemplazado', documentoId: op.reemplazaA, origen: String(orig.origen ?? ''), origenReferencia: orig.origen_referencia ? String(orig.origen_referencia) : null, documentoNuevoId: nuevoId });
    }
  }
  if (op.anularEnOrigen && op.referenciaNumero) {
    const { rows } = await db.execute({ sql: 'SELECT id, origen, origen_referencia FROM documentos_emitidos WHERE numero_factura = ? OR clave = ? LIMIT 1', args: [op.referenciaNumero, op.referenciaNumero] });
    const orig = rows[0];
    if (orig) {
      await db.execute({ sql: 'UPDATE documentos_emitidos SET anular_en_origen = 1 WHERE id = ?', args: [nuevoId] });
      await db.execute({ sql: 'UPDATE documentos_emitidos SET anulado_en_origen = 1 WHERE id = ?', args: [String(orig.id)] });
      await registrarEvento(db, { tipo: 'anulado', documentoId: String(orig.id), origen: String(orig.origen ?? ''), origenReferencia: orig.origen_referencia ? String(orig.origen_referencia) : null, documentoNuevoId: nuevoId, detalle: 'Anulado con nota de crédito' });
    }
  }
}
