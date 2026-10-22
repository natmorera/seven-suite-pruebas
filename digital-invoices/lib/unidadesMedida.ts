// Unidades de medida de los artículos. «valor» es lo que guarda el producto y
// sus tres primeras letras van como unidad de medida en el DTE de FEL.
import type { Client } from '@libsql/client';

export interface UnidadMedida { valor: string; nombre: string; activo: boolean }

const CLAVE = 'unidades_medida';

export const UNIDADES_INICIALES: UnidadMedida[] = [
  { valor: 'Unid', nombre: 'Unidad', activo: true }, { valor: 'Servicio', nombre: 'Servicio', activo: true },
  { valor: 'Noche', nombre: 'Noche', activo: true }, { valor: 'Hora', nombre: 'Hora', activo: true },
  { valor: 'Día', nombre: 'Día', activo: true }, { valor: 'Persona', nombre: 'Persona', activo: true },
  { valor: 'Kg', nombre: 'Kilogramo', activo: true }, { valor: 'L', nombre: 'Litro', activo: true },
  { valor: 'Caja', nombre: 'Caja', activo: true }, { valor: 'Paquete', nombre: 'Paquete', activo: true },
];

export async function leerUnidadesMedida(db: Client): Promise<UnidadMedida[]> {
  const { rows } = await db.execute({ sql: 'SELECT valor FROM app_meta WHERE clave = ?', args: [CLAVE] });
  try { return rows[0] ? JSON.parse(String(rows[0].valor)) : UNIDADES_INICIALES; } catch { return UNIDADES_INICIALES; }
}

export async function guardarUnidadesMedida(db: Client, lista: UnidadMedida[]) {
  const vistos = new Set<string>();
  const limpia = (Array.isArray(lista) ? lista : [])
    .map(u => ({ valor: String(u.valor ?? u.nombre ?? '').trim(), nombre: String(u.nombre ?? '').trim(), activo: u.activo !== false }))
    .filter(u => u.valor && u.nombre && !vistos.has(u.valor) && vistos.add(u.valor));
  await db.execute({ sql: 'INSERT INTO app_meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor', args: [CLAVE, JSON.stringify(limpia)] });
}
