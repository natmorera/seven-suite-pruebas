// Módulos contratados del sitio. Tres versiones con el mismo código:
//   completo  Accounting + Digital Invoices (contabilidad y facturación)
//   dicr      solo Digital Invoices: sin asientos, cuentas ni pantallas contables
//   acc       solo Accounting: sin las pantallas de facturación electrónica
// NEXT_PUBLIC_MODO_FIJO (acc | dicr | completo) deja el sitio siempre en una
// versión; sin ella se cambia desde «Módulos» o con ?modo=… y queda guardada.
import type { Client } from '@libsql/client';

export interface Modulos { contabilidad: boolean; facturacion: boolean }
export type ModoSitio = 'completo' | 'dicr' | 'acc';
const CLAVE = 'modulos_json';

export const MODOS: Record<ModoSitio, Modulos> = {
  completo: { contabilidad: true, facturacion: true },
  dicr: { contabilidad: false, facturacion: true },
  acc: { contabilidad: true, facturacion: false },
};
export const MODO_FIJO = (['completo', 'dicr', 'acc'] as const).find(m => m === process.env.NEXT_PUBLIC_MODO_FIJO);

export async function leerModulos(db: Client): Promise<Modulos> {
  if (MODO_FIJO) return MODOS[MODO_FIJO];
  const { rows } = await db.execute({ sql: 'SELECT valor FROM app_meta WHERE clave = ?', args: [CLAVE] });
  try { if (rows[0]?.valor) return { ...MODOS.completo, ...JSON.parse(String(rows[0].valor)) }; } catch { /* por defecto */ }
  return process.env.SOLO_FACTURACION === '1' ? MODOS.dicr : MODOS.completo;
}
export async function guardarModulos(db: Client, m: Modulos) {
  await db.execute({ sql: `INSERT INTO app_meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`, args: [CLAVE, JSON.stringify(m)] });
}
export async function contabilidadActiva(db: Client): Promise<boolean> {
  return (await leerModulos(db)).contabilidad;
}
