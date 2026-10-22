// Empresas del usuario y el país de cada una. El país decide la facturación
// electrónica (Costa Rica con Hacienda, Guatemala con la SAT y su
// certificador) y la base de datos que se usa: cada país tiene la suya.
// Se cambia con NEXT_PUBLIC_EMPRESAS: nombres separados por coma y, si la
// empresa no es de Costa Rica, el país después de dos puntos
// (Hotel Fortuna,Hotel Guatemala:GT). Lo usan el servidor y las pantallas.
import type { PerfilPais } from './perfilPais';

export interface EmpresaSuite { nombre: string; pais: PerfilPais }

export const EMPRESAS_SUITE: EmpresaSuite[] = (process.env.NEXT_PUBLIC_EMPRESAS || 'Hotel Fortuna,Grand Horizon,Hotel San José,Hotel Guatemala:GT')
  .split(',').map(x => x.trim()).filter(Boolean)
  .map(x => { const [nombre, pais] = x.split(':').map(s => s.trim()); return { nombre, pais: pais?.toUpperCase() === 'GT' ? 'GT' : 'CR' }; });

// Cookie con la empresa elegida: la leen el servidor (base de datos) y el
// diseño de la aplicación (país de las pantallas).
export const COOKIE_EMPRESA = 'empresa';

export const empresaValida = (nombre: string | null | undefined) => EMPRESAS_SUITE.some(e => e.nombre === nombre);
export const empresaOInicial = (nombre: string | null | undefined) => (empresaValida(nombre) ? nombre! : EMPRESAS_SUITE[0]?.nombre ?? '');
export const paisDeEmpresa = (nombre: string | null | undefined): PerfilPais => EMPRESAS_SUITE.find(e => e.nombre === empresaOInicial(nombre))?.pais ?? 'CR';
