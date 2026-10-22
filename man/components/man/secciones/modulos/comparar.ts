// Comparación de los datos generales de un mismo perfil (misma identificación) entre el MAN y los módulos. Las diferencias
// de mayúsculas, tildes, espacios o puntuación no cuentan; en el teléfono solo cuentan los dígitos.
import { norm } from '@/components/kit';
import type { PerfilEntrante } from '../../datos/sincronizacion';
import type { Perfil } from '../../tipos';

export type CampoComun = 'nombre' | 'tipoId' | 'correo' | 'telefono' | 'pais';
export type DatosPerfil = PerfilEntrante | Perfil;

export const COMUNES: [CampoComun, string][] = [
  ['nombre', 'Nombre'], ['tipoId', 'Tipo de identificación'], ['correo', 'Correo'], ['telefono', 'Teléfono'], ['pais', 'País'],
];

/** Valor comparable de un campo. */
export const comparable = (k: CampoComun, v: string) => (k === 'telefono' ? v.replace(/\D/g, '').slice(-8) : norm(v).replace(/[^a-z0-9@]+/g, ''));

/** Campos con valores realmente distintos entre las versiones (los vacíos no cuentan). */
export const camposDistintos = (versiones: DatosPerfil[]) => COMUNES.filter(([k]) => new Set(versiones.map(v => v[k] || '').filter(Boolean).map(v => comparable(k, v))).size > 1);

/** Nombre para buscar posibles duplicados: sin puntuación ni sufijos de sociedad (S.A., S.R.L., Inc.…). */
export const nombreBase = (nombre: string) => norm(nombre).replace(/[^a-z0-9 ]+/g, '').replace(/\b(sa|srl|inc|ltda|rl|bv|sl)\b/g, '').replace(/\s+/g, ' ').trim();
