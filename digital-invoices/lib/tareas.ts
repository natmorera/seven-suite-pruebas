// Tareas que corren solas:
//   · Revisar el buzón de facturas cada `intervalo` minutos (si está
//     configurado y con la revisión automática encendida). Las facturas de
//     proveedores conocidos se importan solas (lib/comprasAuto.ts).
//   · Emitir las facturas recurrentes en modo «automática» cuya fecha llegó.
// Se disparan desde tres lugares, para que funcione en cualquier despliegue:
//   1. instrumentation.ts: cada minuto mientras el servidor esté encendido
//      (servidor propio o `next start`).
//   2. /api/tareas: lo llama el cron de Vercel (vercel.json). En el plan
//      gratuito de Vercel el cron corre una vez al día.
//   3. Mientras la aplicación está abierta en el navegador: el menú lateral
//      lo pide al entrar y cada 5 minutos (ver AppShell). El buzón respeta
//      el intervalo configurado, así que pedirlo seguido no lo revisa de más.
import type { Client } from '@libsql/client';
import { leerConfig, sincronizar } from '@/lib/buzon';
import { emitirRecurrentesAutomaticas } from '@/lib/emitirCopia';
import { completarAsientos } from '@/lib/asientosFaltantes';
import { consultarPendientes } from '@/lib/estadosPendientes';

export interface ResultadoTareas {
  buzon: { revisado: boolean; nuevos: number; automaticos: number; mensaje: string } | null;
  recurrentes: { emitidas: string[]; sinCorreo: string[]; errores: string[] };
}

let enCurso: Promise<ResultadoTareas> | null = null;

export function ejecutarTareas(db: Client): Promise<ResultadoTareas> {
  // Una sola corrida a la vez (el intervalo, el cron y la pantalla pueden coincidir)
  if (!enCurso) enCurso = correr(db).finally(() => { enCurso = null; });
  return enCurso;
}

async function correr(db: Client): Promise<ResultadoTareas> {
  let buzon: ResultadoTareas['buzon'] = null;
  const c = await leerConfig(db);
  const configurado = Boolean(c.host && c.usuario && c.clave);
  const ultima = c.ultima_sync ? new Date(c.ultima_sync).getTime() : 0;
  if (configurado && c.auto && Date.now() - ultima >= c.intervalo * 60_000) {
    const r = await sincronizar(db).catch(e => ({ ok: false, mensaje: String(e?.message ?? e), nuevos: 0, automaticos: 0 }));
    buzon = { revisado: r.ok, nuevos: r.nuevos, automaticos: r.automaticos ?? 0, mensaje: r.mensaje };
  }
  const recurrentes = await emitirRecurrentesAutomaticas(db).catch(e => ({ emitidas: [], sinCorreo: [], errores: [String(e?.message ?? e)] }));
  // Comprobantes que quedaron en Recibido/Procesando: se consulta su estado
  await consultarPendientes(db).catch(() => 0);
  // Ventas y compras aceptadas que quedaron sin asiento: se generan solos
  await completarAsientos(db).catch(() => null);
  return { buzon, recurrentes };
}
