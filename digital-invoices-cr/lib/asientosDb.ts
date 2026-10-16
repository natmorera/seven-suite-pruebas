// Asientos contables guardados en la base: los automáticos de facturación y
// los que se crean, importan o duplican en la Bandeja. El `id` que usa la
// Bandeja es el rowid de la tabla (entero y estable).
import type { Client, InValue } from '@libsql/client';

export interface LineaAsientoDb { id: number; cuenta: string; descripcion: string; cCostos: string; debe: number; haber: number }
export interface AsientoDb {
  id: number; tipo: string; origen: string; fecha: string; consecutivo: string; titulo: string; moneda: string; importe: number;
  usuario: string; documento: string; observacion: string; contabilizado: boolean; lineas: LineaAsientoDb[];
  archivos?: string[]; historial?: { color: string; texto: string; fecha: string; usuario: string }[];
  motivoAnulacion?: string; conciliacion?: { id: string; detalle: string } | null; documentoRefId?: string | null;
}

const json = <T,>(t: unknown, def: T): T => { try { return t ? JSON.parse(String(t)) as T : def; } catch { return def; } };

export async function leerAsientos(db: Client, filtro: { anulados?: boolean; desde?: string; hasta?: string } = {}): Promise<AsientoDb[]> {
  const cond = ['anulado = ?'], args: InValue[] = [filtro.anulados ? 1 : 0];
  if (filtro.desde) { cond.push('fecha >= ?'); args.push(filtro.desde); }
  if (filtro.hasta) { cond.push('fecha <= ?'); args.push(filtro.hasta); }
  const { rows } = await db.execute({ sql: `SELECT rowid AS num, * FROM asientos WHERE ${cond.join(' AND ')} ORDER BY fecha DESC, rowid DESC`, args });
  if (!rows.length) return [];
  const ids = rows.map(r => String(r.id));
  const lineas = new Map<string, LineaAsientoDb[]>();
  for (let i = 0; i < ids.length; i += 400) {
    const lote = ids.slice(i, i + 400);
    const { rows: ls } = await db.execute({ sql: `SELECT rowid AS num, * FROM asientos_lineas WHERE asiento_id IN (${lote.map(() => '?').join(',')}) ORDER BY rowid`, args: lote });
    for (const l of ls) {
      const k = String(l.asiento_id);
      if (!lineas.has(k)) lineas.set(k, []);
      lineas.get(k)!.push({ id: Number(l.num), cuenta: String(l.cuenta ?? ''), descripcion: String(l.descripcion ?? ''), cCostos: String(l.c_costos ?? ''), debe: Number(l.debe ?? 0), haber: Number(l.haber ?? 0) });
    }
  }
  return rows.map(a => {
    const auto = String(a.origen ?? '') === 'Facturación electrónica';
    return {
      id: Number(a.num), tipo: String(a.tipo ?? 'M'), origen: String(a.origen ?? ''), fecha: String(a.fecha ?? ''), consecutivo: String(a.consecutivo ?? ''),
      titulo: String(a.titulo ?? ''), moneda: String(a.moneda ?? 'CRC'), importe: Number(a.importe ?? 0), usuario: String(a.usuario ?? 'sistema'),
      documento: String(a.documento ?? ''), observacion: String(a.observacion ?? ''), contabilizado: Number(a.contabilizado) === 1,
      lineas: lineas.get(String(a.id)) ?? [],
      archivos: json<string[]>(a.archivos_json, []),
      historial: json(a.historial_json, auto ? [{ color: '#10B981', texto: 'Asiento generado automáticamente desde Facturación electrónica', fecha: String(a.fecha ?? ''), usuario: 'sistema' }] : []),
      motivoAnulacion: a.motivo_anulacion ? String(a.motivo_anulacion) : undefined,
      conciliacion: json(a.conciliacion_json, null),
      documentoRefId: a.documento_ref_id ? String(a.documento_ref_id) : null,
    };
  });
}

export async function insertarAsiento(db: Client, a: Omit<AsientoDb, 'id'> & { anulado?: boolean }): Promise<number> {
  const id = 'as-' + Math.random().toString(36).slice(2, 12);
  await db.execute({
    sql: `INSERT INTO asientos (id, tipo, origen, fecha, consecutivo, titulo, moneda, importe, usuario, documento, observacion, contabilizado,
            documento_ref_id, anulado, motivo_anulacion, archivos_json, historial_json, conciliacion_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, a.tipo, a.origen, a.fecha, a.consecutivo, a.titulo, a.moneda, a.importe, a.usuario, a.documento, a.observacion, a.contabilizado ? 1 : 0,
      a.documentoRefId ?? null, a.anulado ? 1 : 0, a.motivoAnulacion ?? null, JSON.stringify(a.archivos ?? []), JSON.stringify(a.historial ?? []),
      a.conciliacion ? JSON.stringify(a.conciliacion) : null],
  });
  for (let i = 0; i < a.lineas.length; i += 200) {
    await db.batch(a.lineas.slice(i, i + 200).map(l => ({
      sql: 'INSERT INTO asientos_lineas (id, asiento_id, cuenta, descripcion, c_costos, debe, haber) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: ['al-' + Math.random().toString(36).slice(2, 12), id, l.cuenta, l.descripcion, l.cCostos ?? '', Number(l.debe) || 0, Number(l.haber) || 0],
    })), 'write');
  }
  const { rows } = await db.execute({ sql: 'SELECT rowid AS num FROM asientos WHERE id = ?', args: [id] });
  return Number(rows[0].num);
}

export async function actualizarAsientos(db: Client, nums: number[], cambios: { contabilizado?: boolean; anulado?: boolean; motivoAnulacion?: string | null; archivos?: string[] }) {
  const sets: string[] = [], args: InValue[] = [];
  if (cambios.contabilizado !== undefined) { sets.push('contabilizado = ?'); args.push(cambios.contabilizado ? 1 : 0); }
  if (cambios.anulado !== undefined) { sets.push('anulado = ?'); args.push(cambios.anulado ? 1 : 0); }
  if (cambios.motivoAnulacion !== undefined) { sets.push('motivo_anulacion = ?'); args.push(cambios.motivoAnulacion); }
  if (cambios.archivos !== undefined) { sets.push('archivos_json = ?'); args.push(JSON.stringify(cambios.archivos)); }
  if (!sets.length || !nums.length) return;
  await db.execute({ sql: `UPDATE asientos SET ${sets.join(', ')} WHERE rowid IN (${nums.map(() => '?').join(',')})`, args: [...args, ...nums] });
}
