// Cuenta contable de cada impuesto de FEL (Guatemala). El IVA usa las cuentas
// de Cuentas de facturación (IVA por pagar e IVA acreditable); los demás
// impuestos (ITH, tasa municipal…) guardan aquí su cuenta por pagar y, si
// aplica, la de compras.
import type { Client } from '@libsql/client';

export type CuentasImpuestos = Record<string, { ventas?: string; compras?: string }>;
const CLAVE = 'cuentas_impuestos_gt';

export async function leerCuentasImpuestos(db: Client): Promise<CuentasImpuestos> {
  const { rows } = await db.execute({ sql: 'SELECT valor FROM app_meta WHERE clave = ?', args: [CLAVE] });
  try { return rows[0] ? JSON.parse(String(rows[0].valor)) : {}; } catch { return {}; }
}

export async function guardarCuentasImpuestos(db: Client, c: CuentasImpuestos) {
  const limpio: CuentasImpuestos = {};
  for (const [k, v] of Object.entries(c ?? {})) {
    if (!/^\d{1,2}$/.test(k) || k === '1') continue;   // el IVA vive en Cuentas de facturación
    limpio[k] = { ventas: String(v?.ventas ?? '').trim() || undefined, compras: String(v?.compras ?? '').trim() || undefined };
  }
  await db.execute({ sql: 'INSERT INTO app_meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor', args: [CLAVE, JSON.stringify(limpio)] });
}
