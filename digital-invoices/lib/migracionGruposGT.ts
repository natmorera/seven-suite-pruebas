// Guatemala: los grupos de productos son «clasificaciones de producto». En
// vez de un CABYS cada grupo lleva una clasificación (hospedaje, alimentos,
// tours…) que define bien o servicio, IVA e impuesto de turismo. Los grupos de
// ejemplo se asocian a la clasificación que corresponde por su nombre, y sus
// productos sin datos propios toman esa clasificación.
import type { Client } from '@libsql/client';
import { clasificacionPorId } from '@/lib/perfilPais';

const POR_NOMBRE: [RegExp, string][] = [
  [/hosped|habitaci/i, 'hospedaje'], [/minibar|tienda|souvenir/i, 'minibar'], [/aliment|restaur|bebida|bar\b/i, 'alimentos'],
  [/evento|sal[oó]n/i, 'eventos'], [/tour|transp|transfer|traslado/i, 'tours'], [/spa|bienestar/i, 'spa'], [/lavand/i, 'lavanderia'],
];

export async function migrarGruposGT(db: Client) {
  const { rows } = await db.execute(`SELECT id, nombre FROM grupos_productos WHERE COALESCE(datos_pais, '') = ''`);
  for (const g of rows) {
    const id = POR_NOMBRE.find(([re]) => re.test(String(g.nombre)))?.[1] ?? 'otros-servicios';
    const c = clasificacionPorId(id)!;
    await db.execute({
      sql: `UPDATE grupos_productos SET datos_pais = ?, codigo_cabys = '', descripcion_cabys = ?, impuesto = ? WHERE id = ?`,
      args: [JSON.stringify({ clasificacion: c.id }), c.nombre, c.unidadIva === 1 ? 12 : 0, String(g.id)],
    });
    const datos = { bienServicio: c.bienServicio, unidadIva: c.unidadIva, unidadIth: c.unidadIth, escenarioExencion: c.escenarioExencion, clasificacion: c.id };
    await db.execute({
      sql: `UPDATE cabys_favoritos SET datos_pais = ? WHERE grupo_id = ? AND COALESCE(datos_pais, '') = ''`,
      args: [JSON.stringify(datos), String(g.id)],
    });
  }
  // Los productos de ejemplo traían tarifas de Costa Rica: en Guatemala el IVA es 12 % o exento
  await db.execute(`UPDATE cabys_favoritos SET impuesto = 12 WHERE impuesto NOT IN (0, 12)`);
}
