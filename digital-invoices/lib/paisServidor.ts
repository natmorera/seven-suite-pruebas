// País de la empresa con la que se trabaja, del lado del servidor. Sale de la
// cookie de la empresa elegida y cada solicitud corre dentro de su país
// (conPaisDeSolicitud envuelve las rutas de la API), así el código común
// (cálculos, catálogos, textos) sabe qué reglas usar aunque lleguen
// solicitudes de los dos países a la vez. Las tareas automáticas, que no
// traen cookie, recorren cada país con conPais.
import { AsyncLocalStorage } from 'node:async_hooks';
import { cookies } from 'next/headers';
import { COOKIE_EMPRESA, paisDeEmpresa } from './empresas';
import { registrarLectorServidor } from './paisActual';
import type { PerfilPais } from './perfilPais';

const contexto = new AsyncLocalStorage<PerfilPais>();
registrarLectorServidor(() => contexto.getStore());

/** País de la cookie de la solicitud; fuera de una solicitud, Costa Rica. */
export async function paisDeSolicitud(): Promise<PerfilPais> {
  try {
    return paisDeEmpresa((await cookies()).get(COOKIE_EMPRESA)?.value);
  } catch {
    return 'CR';
  }
}

/** País en curso, si se está dentro de conPais. */
export const paisEnCurso = () => contexto.getStore();

/** Ejecuta fn con las reglas y la base de ese país. */
export const conPais = <T>(pais: PerfilPais, fn: () => Promise<T>) => contexto.run(pais, fn);

/** Envuelve una ruta de la API para que corra con el país de la empresa elegida. */
export function conPaisDeSolicitud<A extends unknown[], R>(manejar: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => conPais(await paisDeSolicitud(), () => manejar(...args));
}
