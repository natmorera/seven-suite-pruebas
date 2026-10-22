// API Key del módulo: la llave con la que Management (MAN) se conecta a este
// módulo. Se genera una vez, se guarda en app_meta y se puede regenerar.
import type { Client } from '@libsql/client';
import { randomBytes, timingSafeEqual } from 'crypto';
import { esGuatemalaActual } from '@/lib/paisActual';

// Módulo según el país de la empresa: cada país tiene su base y su API Key
export const moduloActual = () => (esGuatemalaActual() ? { codigo: 'DIGT', nombre: 'Digital Invoices Guatemala' } : { codigo: 'DICR', nombre: 'Digital Invoices Costa Rica' });
const CLAVE = 'api_key_modulo';
export interface LlaveModulo { clave: string; creada: string }

const nueva = (): LlaveModulo => ({ clave: `${moduloActual().codigo.toLowerCase()}_live_${randomBytes(24).toString('hex')}`, creada: new Date().toISOString() });

async function guardar(db: Client, l: LlaveModulo) {
  await db.execute({ sql: 'INSERT INTO app_meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor', args: [CLAVE, JSON.stringify(l)] });
  return l;
}

export async function leerApiKey(db: Client): Promise<LlaveModulo> {
  const { rows } = await db.execute({ sql: 'SELECT valor FROM app_meta WHERE clave = ?', args: [CLAVE] });
  try { if (rows[0]) return JSON.parse(String(rows[0].valor)); } catch { /* se genera abajo */ }
  return guardar(db, nueva());
}

export async function regenerarApiKey(db: Client): Promise<LlaveModulo> { return guardar(db, nueva()); }

// Revisa la llave que manda Management en el encabezado «x-api-key»
export async function apiKeyValida(db: Client, recibida: string | null): Promise<boolean> {
  if (!recibida) return false;
  const { clave } = await leerApiKey(db);
  const a = Buffer.from(recibida), b = Buffer.from(clave);
  return a.length === b.length && timingSafeEqual(a, b);
}
