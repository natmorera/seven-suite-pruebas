// Consulta ante Hacienda los comprobantes que quedaron «Recibido» o
// «Procesando» (por ejemplo, las recurrentes que se emiten solas). Sin
// credenciales reales se simula la aceptación, como en el resto del sistema;
// los asientos los completa luego completarAsientos.
import type { Client } from '@libsql/client';
import { consultarEstado, haciendaEnModoSimulacion } from '@/lib/hacienda';

export async function consultarPendientes(db: Client, limite = 40): Promise<number> {
  const { rows } = await db.execute({
    sql: `SELECT id, clave FROM documentos_emitidos WHERE estado IN ('Recibido', 'Procesando') AND COALESCE(clave, '') <> '' ORDER BY fecha_emision LIMIT ?`, args: [limite],
  });
  let cambiados = 0;
  for (const r of rows) {
    let nuevo: string | null = null, detalle: string | null = null, respuesta: string | null = null;
    if (haciendaEnModoSimulacion()) nuevo = 'Aceptado';
    else {
      const c = await consultarEstado(String(r.clave)).catch(() => null);
      if (c) { nuevo = c.estado; detalle = c.detalle ?? null; respuesta = c.respuestaXml ?? null; }
    }
    if (!nuevo || nuevo === 'Recibido' || nuevo === 'Procesando') continue;
    await db.execute({
      sql: 'UPDATE documentos_emitidos SET estado = ?, respuesta_xml = COALESCE(?, respuesta_xml), ultimo_error = COALESCE(?, ultimo_error) WHERE id = ?',
      args: [nuevo, respuesta, nuevo === 'Rechazado' ? detalle : null, String(r.id)],
    });
    cambiados++;
  }
  return cambiados;
}
