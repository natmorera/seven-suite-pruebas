// Unidades gravables de Guatemala: los impuestos de FEL que usa la empresa,
// con su valor y su estado. Se guardan en app_meta; la primera vez se crean
// las del IVA y del impuesto de turismo de hospedaje.
import type { Client } from '@libsql/client';

export interface UnidadGravableGT {
  id: string;
  impuesto: number;          // código del impuesto en FEL (1 IVA, 3 turismo hospedaje…)
  codigo: number;            // código de la unidad gravable dentro del impuesto
  nombre: string;
  valor: number;
  tipoValor: 'porcentaje' | 'monto';
  descripcion: string;
  activo: boolean;
}

const CLAVE = 'unidades_gravables_gt';

export const UNIDADES_INICIALES: UnidadGravableGT[] = [
  { id: '1-1', impuesto: 1, codigo: 1, nombre: 'IVA 12 %', valor: 12, tipoValor: 'porcentaje', descripcion: 'Ventas gravadas', activo: true },
  { id: '1-2', impuesto: 1, codigo: 2, nombre: 'IVA exento', valor: 0, tipoValor: 'porcentaje', descripcion: 'Ventas exentas o con frase de exención', activo: true },
  { id: '3-1', impuesto: 3, codigo: 1, nombre: 'Turismo hospedaje 10 %', valor: 10, tipoValor: 'porcentaje', descripcion: 'Hospedaje', activo: true },
  { id: '3-2', impuesto: 3, codigo: 2, nombre: 'Turismo hospedaje exento', valor: 0, tipoValor: 'porcentaje', descripcion: 'Hospedaje exento', activo: true },
];

export async function leerUnidadesGravables(db: Client): Promise<UnidadGravableGT[]> {
  const { rows } = await db.execute({ sql: 'SELECT valor FROM app_meta WHERE clave = ?', args: [CLAVE] });
  try { return rows[0] ? JSON.parse(String(rows[0].valor)) : UNIDADES_INICIALES; } catch { return UNIDADES_INICIALES; }
}

export async function guardarUnidadesGravables(db: Client, lista: UnidadGravableGT[]) {
  const limpia = (Array.isArray(lista) ? lista : []).map(u => ({
    id: `${Number(u.impuesto)}-${Number(u.codigo)}`,
    impuesto: Number(u.impuesto), codigo: Number(u.codigo),
    nombre: String(u.nombre ?? '').trim(), valor: Number(u.valor) || 0,
    tipoValor: u.tipoValor === 'monto' ? 'monto' : 'porcentaje',
    descripcion: String(u.descripcion ?? '').trim(), activo: u.activo !== false,
  }));
  await db.execute({ sql: 'INSERT INTO app_meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor', args: [CLAVE, JSON.stringify(limpia)] });
}
