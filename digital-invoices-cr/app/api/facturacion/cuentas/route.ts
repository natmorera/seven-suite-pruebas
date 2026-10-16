import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { obtenerMapeo, MAPEO_DEFAULT, type MapeoContable } from '@/lib/asientoAutomatico';

// Cuentas contables por defecto de la facturación (las que usan los asientos
// automáticos cuando un producto, cliente o proveedor no trae la suya).
const COLUMNAS: Record<keyof MapeoContable, string> = {
  cuentaVentas: 'cuenta_ventas', cuentaIvaVentas: 'cuenta_iva_ventas', cuentaCxc: 'cuenta_cxc', cuentaCaja: 'cuenta_caja',
  cuentaBanco: 'cuenta_banco', cuentaGastos: 'cuenta_gastos', cuentaIvaCompras: 'cuenta_iva_compras', cuentaProveedores: 'cuenta_proveedores',
};

export async function GET() {
  return NextResponse.json(await obtenerMapeo(await getDb(), 'default'));
}

export async function PUT(req: NextRequest) {
  const b = await req.json().catch(() => ({})) as Partial<MapeoContable>;
  const m = { ...MAPEO_DEFAULT, ...(await obtenerMapeo(await getDb(), 'default')) } as MapeoContable;
  for (const k of Object.keys(COLUMNAS) as (keyof MapeoContable)[]) if (typeof b[k] === 'string' && b[k]!.trim()) m[k] = b[k]!.trim();
  const db = await getDb();
  const cols = Object.values(COLUMNAS);
  await db.execute('DELETE FROM mapeo_contable_facturacion');
  await db.execute({
    sql: `INSERT INTO mapeo_contable_facturacion (emisor_id, ${cols.join(', ')}) VALUES ('default', ${cols.map(() => '?').join(', ')})`,
    args: (Object.keys(COLUMNAS) as (keyof MapeoContable)[]).map(k => m[k]),
  });
  return NextResponse.json(m);
}
