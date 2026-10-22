// Catálogo de cuentas guardado en la base (una sola copia del árbol). Si no
// se ha guardado nunca, se usa el catálogo inicial del sistema.
import type { Client } from '@libsql/client';
import { CUENTAS_INIT, type Cuenta } from '@/components/pages/catalogo/catalogoData';

const CLAVE = 'catalogo_cuentas_json';

export async function leerCatalogo(db: Client): Promise<Cuenta[]> {
  const { rows } = await db.execute({ sql: 'SELECT valor FROM app_meta WHERE clave = ?', args: [CLAVE] });
  if (rows[0]?.valor) { try { return JSON.parse(String(rows[0].valor)) as Cuenta[]; } catch { /* catálogo inicial */ } }
  return CUENTAS_INIT;
}

// Se guarda sin el estado de pantalla (qué ramas estaban abiertas)
const limpiar = (ns: Cuenta[]): Cuenta[] => ns.map(({ expanded, ...c }) => { void expanded; return c; }).map(c => ({ ...c, ...(c.children ? { children: limpiar(c.children) } : {}) }));

export async function guardarCatalogo(db: Client, arbol: Cuenta[]) {
  await db.execute({
    sql: `INSERT INTO app_meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
    args: [CLAVE, JSON.stringify(limpiar(arbol))],
  });
}
