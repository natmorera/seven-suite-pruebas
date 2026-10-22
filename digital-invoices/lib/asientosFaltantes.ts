import type { Client } from '@libsql/client';
import { crearAsientoPorDocumento, crearAsientoPorCompra } from '@/lib/asientoAutomatico';
import { registrarCompraDeFec, TIPO_FEC } from '@/lib/fec';
import { contabilidadActiva } from '@/lib/modulos';

export async function completarAsientos(db: Client, limite = 60): Promise<{ creados: number; errores: number }> {
  let creados = 0, errores = 0;
  const conContabilidad = await contabilidadActiva(db);
  const { rows: ventas } = await db.execute({
    sql: `SELECT d.id, d.tipo FROM documentos_emitidos d
          WHERE d.estado = 'Aceptado' AND COALESCE(d.importado, 0) = 0 AND NOT EXISTS (SELECT 1 FROM asientos a WHERE a.documento_ref_id = d.id)
            AND NOT (d.tipo = ? AND d.compra_id IS NOT NULL)
          ORDER BY d.fecha_emision LIMIT ?`, args: [TIPO_FEC, limite],
  });
  for (const v of ventas) {
    if (!conContabilidad && String(v.tipo) !== TIPO_FEC) continue;
    try {
      const r = String(v.tipo) === TIPO_FEC ? await registrarCompraDeFec(db, String(v.id)) : await crearAsientoPorDocumento(String(v.id));
      if ('error' in r && r.error) errores++; else creados++;
    } catch { errores++; }
  }
  if (!conContabilidad) return { creados, errores };
  const { rows: compras } = await db.execute({
    sql: `SELECT c.id FROM documentos_recibidos c
          WHERE c.estado = 'Aceptado' AND NOT EXISTS (SELECT 1 FROM asientos a WHERE a.documento_ref_id = c.id)
          ORDER BY c.fecha_emision LIMIT ?`, args: [limite],
  });
  for (const c of compras) {
    try { const r = await crearAsientoPorCompra(String(c.id)); if ('error' in r && r.error) errores++; else creados++; } catch { errores++; }
  }
  return { creados, errores };
}
