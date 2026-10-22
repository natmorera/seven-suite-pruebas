// Arranque del servidor: en un servidor propio (no en Vercel, que usa su
// cron) se revisan cada minuto las tareas automáticas (ver lib/tareas.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.VERCEL) return;
  const g = globalThis as unknown as { __tareasHotel?: NodeJS.Timeout };
  if (g.__tareasHotel) return;
  const { getDb } = await import('./lib/db');
  const { ejecutarTareas } = await import('./lib/tareas');
  const { conPais } = await import('./lib/paisServidor');
  // La base de cada país, una después de la otra, cada una con sus reglas
  g.__tareasHotel = setInterval(() => {
    conPais('CR', async () => ejecutarTareas(await getDb('CR')))
      .then(() => conPais('GT', async () => ejecutarTareas(await getDb('GT'))))
      .catch(() => { /* se reintenta en el siguiente minuto */ });
  }, 60_000);
}
