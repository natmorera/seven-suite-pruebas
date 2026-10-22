'use client';
// Integración con el MAN de los módulos que se integran desde aquí: el producto contable (la base de todo) y Front Desk.
// Pasos: conexión (el API Key se genera en el módulo y aquí se pega y se valida), envío de datos entre módulos (cada
// enlace que lo necesita se configura; Front Desk → Accounting lleva la configuración contable) y perfiles compartidos.
// Al final, «Verificar y guardar» comprueba todo y crea los enlaces. Lo usan la lista de módulos y el detalle.
import { useDato, useOperacion } from '../../store';
import { MODULOS_INTEGRABLES, PERFILES_DE, esContable, modoFinanzas, nombreModulo, puedeEnviar } from '../../catalogo';
import { validarApiKey } from '../../datos/conexion';
import { normId, unirPerfiles } from '../../datos/sincronizacion';
import { ahora } from '../../piezas';
import type { ConexionModulo, Enlace, IntegracionContable, ModuloId, Perfil } from '../../tipos';

export interface Paso { id: 'conexion' | 'envio' | 'perfiles' | 'verificacion'; titulo: string; hecho: boolean }
export interface Comprobacion { titulo: string; ok: boolean; detalle: string }

const vacia = (modulo: ModuloId): ConexionModulo => ({ id: 'cx-' + modulo, modulo, apiKey: '', estado: 'Sin probar', ultimaPrueba: '', ultimaSync: '', perfilesSync: 0 });
/** Datos de la configuración contable que faltan para enviar Front Desk a Accounting. */
export const faltaContable = (c: IntegracionContable) => ([
  [c.sistema, 'sistema contable'], [c.inventario, 'forma de inventario'], [c.libro, 'libro contable'],
  [c.cuentaCargoDivisa, 'cuenta de cargo de divisa'], [c.cuentaNoCheques, 'cuenta de no cheques'],
] as [string, string][]).filter(([v]) => !v).map(([, n]) => n);
export const contabilidadCompleta = (c: IntegracionContable) => faltaContable(c).length === 0;
export const integrable = (m: ModuloId) => MODULOS_INTEGRABLES.includes(m);
/** El envío Front Desk → Accounting se configura con la contabilidad de Front Desk. */
export const llevaContabilidad = (origen: ModuloId, destino: ModuloId) => origen === 'FDK' && esContable(destino);

/** Estado de la integración para mostrar: lista, solo falta verificar, o cuántos pasos van. */
export function resumen(pasos: Paso[]) {
  const previos = pasos.filter(p => p.id !== 'verificacion');
  const hechos = previos.filter(p => p.hecho).length;
  if (pasos.every(p => p.hecho)) return { listo: true, etiqueta: 'Lista para operar', falta: '' };
  if (hechos === previos.length) return { listo: false, etiqueta: 'Falta verificar y guardar', falta: '' };
  return { listo: false, etiqueta: `${hechos} de ${previos.length} pasos`, falta: previos.filter(p => !p.hecho).map(p => p.titulo.toLowerCase()).join(', ') };
}

/** Módulos contratados con la conexión validada, más el MAN: los únicos a los que se da acceso a un usuario. */
export function useModulosConAcceso(): ModuloId[] {
  const [conexiones] = useDato('conexiones');
  const [modulos] = useDato('modulos');
  const conectados = modulos.filter(m => m.contratado && conexiones.some(c => c.modulo === m.codigo && c.apiKey && c.estado === 'Conectada')).map(m => m.codigo);
  return [...conectados, 'MAN'];
}

export function useIntegracion() {
  const [conexiones] = useDato('conexiones');
  const [modulos] = useDato('modulos');
  const [perfiles] = useDato('perfiles');
  const [enlaces] = useDato('enlaces');
  const [contabilidad] = useDato('contabilidadFDK');
  // Validar, sincronizar y verificar son operaciones: no quedan como cambios pendientes de guardar.
  const operarConexiones = useOperacion('conexiones');
  const operarPerfiles = useOperacion('perfiles');
  const operarEnlaces = useOperacion('enlaces');
  const modoContable = modoFinanzas(modulos);
  // El producto contable va primero: es la base de la integración; luego Front Desk y los demás.
  const contratados = modulos.filter(m => m.contratado).map(m => m.codigo)
    .sort((a, b) => Number(!esContable(a)) - Number(!esContable(b)) || Number(a !== 'FDK') - Number(b !== 'FDK'));
  const conexion = (m: ModuloId) => conexiones.find(c => c.modulo === m) ?? vacia(m);
  const guardar = (c: ConexionModulo) => operarConexiones(prev => (prev.some(x => x.modulo === c.modulo) ? prev.map(x => (x.modulo === c.modulo ? c : x)) : [...prev, c]));
  const conectado = (m: ModuloId) => { const c = conexion(m); return !!c.apiKey && c.estado === 'Conectada'; };
  const perfilesListos = (m: ModuloId) => !PERFILES_DE[m] || !!conexion(m).ultimaSync || !!conexion(m).perfilesOmitido;
  /** Enlaces marcados de un módulo (en cualquier dirección), guardados o por guardar. */
  const enlacesDe = (m: ModuloId) => enlaces.filter(e => e.activo && (e.origen === m || e.destino === m));
  const enlaceListo = (e: Enlace) => conectado(e.origen) && conectado(e.destino) && (!llevaContabilidad(e.origen, e.destino) || contabilidadCompleta(contabilidad));
  /** Módulos de los que se traen perfiles al integrar m: el propio y los enlazados que comparten perfiles. */
  const fuentesPerfiles = (m: ModuloId) => [m, ...enlacesDe(m).map(e => (e.origen === m ? e.destino : e.origen))]
    .filter((x, i, xs) => xs.indexOf(x) === i && !!PERFILES_DE[x] && conectado(x));

  /** Módulos enlazados (o el propio) cuyos perfiles todavía no se sincronizan ni se omitieron. */
  const perfilesPendientes = (m: ModuloId) => fuentesPerfiles(m).filter(f => !conexion(f).ultimaSync && !conexion(f).perfilesOmitido);

  const pasos = (m: ModuloId): Paso[] => {
    if (!integrable(m)) return [];
    const previos: Paso[] = [
      { id: 'conexion', titulo: 'Conexión', hecho: conectado(m) },
      { id: 'envio', titulo: 'Envío de datos', hecho: conectado(m) && enlacesDe(m).every(enlaceListo) },
      ...(PERFILES_DE[m] ? [{ id: 'perfiles' as const, titulo: 'Perfiles compartidos', hecho: perfilesListos(m) && !perfilesPendientes(m).length }] : []),
    ];
    // La verificación vale mientras los pasos anteriores sigan completos.
    return [...previos, { id: 'verificacion', titulo: 'Verificación', hecho: !!conexion(m).verificada && previos.every(p => p.hecho) }];
  };

  /** Lo que revisa «Verificar y guardar». */
  const comprobaciones = (m: ModuloId): Comprobacion[] => [
    { titulo: 'Conexión', ok: conectado(m), detalle: conectado(m) ? `${nombreModulo(m)} acepta el API Key.` : 'Falta validar el API Key del módulo.' },
    ...enlacesDe(m).map(e => {
      const falta = [!conectado(e.origen) && `conectar ${nombreModulo(e.origen)}`, !conectado(e.destino) && `conectar ${nombreModulo(e.destino)}`,
        llevaContabilidad(e.origen, e.destino) && !contabilidadCompleta(contabilidad) && `configurar: ${faltaContable(contabilidad).join(', ')}`].filter(Boolean);
      return { titulo: `${nombreModulo(e.origen)} → ${nombreModulo(e.destino)}`, ok: !falta.length,
        detalle: falta.length ? `Falta ${falta.join('; ')}.` : 'Enlace configurado.' };
    }),
    ...(PERFILES_DE[m] ? [{ titulo: 'Perfiles compartidos', ok: perfilesListos(m) && !perfilesPendientes(m).length,
      detalle: perfilesPendientes(m).length ? `Falta sincronizar u omitir los de ${perfilesPendientes(m).map(nombreModulo).join(' y ')}.`
        : conexion(m).ultimaSync ? 'Perfiles sincronizados.' : 'Se omitió la sincronización.' }] : []),
  ];

  return {
    contratados, conexion, conectado, pasos, perfilesPendientes, comprobaciones, enlacesDe, enlaceListo, fuentesPerfiles, perfiles, enlaces, modoContable,
    /** Valida el API Key pegado; si el módulo lo acepta queda conectado. Devuelve el error o null. */
    validar: (m: ModuloId, apiKey: string) => {
      const error = validarApiKey(m, apiKey);
      if (!error) guardar({ ...conexion(m), apiKey: apiKey.trim().toUpperCase(), estado: 'Conectada', ultimaPrueba: ahora(), verificada: undefined });
      return error;
    },
    /** Une los perfiles elegidos de cada módulo con los del MAN por número de identificación y aplica los datos elegidos al revisarlos. */
    sincronizar: (fuentes: ModuloId[], elegidos: string[], cambios: Record<string, Partial<Perfil>> = {}) => {
      const unir = (prev: Perfil[]) => fuentes.reduce((acc, f) => unirPerfiles(f, acc, elegidos), prev)
        .map(p => (cambios[normId(p.identificacion)] ? { ...p, ...cambios[normId(p.identificacion)] } : p));
      operarPerfiles(unir);
      const resultado = unir(perfiles);
      fuentes.forEach(f => guardar({ ...conexion(f), ultimaSync: ahora(), perfilesSync: resultado.filter(p => p.modulos.includes(f)).length, perfilesOmitido: false }));
    },
    /** Deja la sincronización de perfiles para después; el módulo puede operar sin ella. */
    omitirPerfiles: (m: ModuloId) => [m, ...perfilesPendientes(m)].filter((x, i, xs) => xs.indexOf(x) === i)
      .forEach(f => guardar({ ...conexion(f), perfilesOmitido: !conexion(f).ultimaSync || conexion(f).perfilesOmitido })),
    /** Guarda la verificación: crea los enlaces marcados y deja listos el módulo y los módulos enlazados que ya lo estén. */
    verificar: (m: ModuloId) => {
      if (!comprobaciones(m).every(c => c.ok)) return false;
      const propios = enlacesDe(m);
      operarEnlaces(prev => prev.map(e => (propios.some(x => x.id === e.id) && e.pendiente ? { ...e, pendiente: false, nuevos: 3 } : e)));
      const otros = propios.map(e => (e.origen === m ? e.destino : e.origen)).filter(o => integrable(o) && conectado(o) && perfilesListos(o));
      [m, ...otros].forEach(x => guardar({ ...conexion(x), ultimaPrueba: ahora(), verificada: ahora() }));
      return true;
    },
    puedeEnviar,
  };
}
