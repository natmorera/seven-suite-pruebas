// Sincronización de perfiles: lo que trae cada módulo de su base de datos y cómo se une con los perfiles del MAN.
// Sin backend, cada módulo devuelve una lista de ejemplo; al conectar la API se reemplaza perfilesDelModulo.
import { PERFILES_DE } from '../catalogo';
import type { DatosCliente, DatosEmpresa, DatosProveedor, DatosReceptor, ModuloId, Perfil, RolPerfil } from '../tipos';

export interface PerfilEntrante {
  nombre: string; tipoId: string; identificacion: string; roles: RolPerfil[]; correo: string; telefono: string; pais: string;
  cliente?: DatosCliente; proveedor?: DatosProveedor; receptor?: DatosReceptor; empresa?: DatosEmpresa;
}

/** Identificación sin guiones, espacios ni puntos: «3-101-778899» y «3101778899» son el mismo número. */
export const normId = (id: string) => id.replace(/[^0-9a-z]/gi, '').toUpperCase();
const correo = (nombre: string) => `facturacion@${nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, '').slice(0, 14)}.com`;
const telefono = (id: string) => { const d = id.replace(/\D/g, ''); return d.length >= 7 ? `+506 2${d.slice(-7, -4)}-${d.slice(-4)}` : ''; };
const E = (nombre: string, tipoId: string, identificacion: string, extra: Partial<PerfilEntrante>, pais = 'Costa Rica'): PerfilEntrante => {
  const roles: RolPerfil[] = [
    ...(extra.cliente ? ['Cliente' as const] : []), ...(extra.proveedor ? ['Proveedor' as const] : []), ...(extra.receptor ? ['Receptor' as const] : []),
    ...(extra.empresa ? ['Empresa' as const] : []),
  ];
  return { nombre, tipoId, identificacion, correo: correo(nombre), telefono: telefono(identificacion), pais, roles, ...extra };
};
const cli = (condicion: DatosCliente['condicion'], plazo: number, limite: number, moneda = 'CRC'): DatosCliente => ({ condicion, plazo, limite, moneda });
const prov = (plazo: number, categoria: string): DatosProveedor => ({ plazo, moneda: 'CRC', categoria, cuenta: '' });
const rec = (actividad: string, provincia: string, exonerado = false): DatosReceptor => ({ correoComprobantes: '', actividad, provincia, exonerado });
const emp = (tipo: DatosEmpresa['tipo'], tarifa: string, comision: number, credito = true): DatosEmpresa => ({ tipo, tarifa, credito, comision });

const DESDE: Partial<Record<'ACC' | 'DICR' | 'FDK', PerfilEntrante[]>> = {
  ACC: [
    E('Distribuidora La Florida S.A.', 'Cédula jurídica', '3101000001', { proveedor: prov(30, 'Alimentos y bebidas') }),
    E('Travel Agency CR S.A.', 'Cédula jurídica', '3101778899', { cliente: cli('Crédito', 30, 15000, 'USD') }),
    E('Ferretería El Pochote', 'Cédula jurídica', '3101445500', { proveedor: prov(15, 'Suministros') }),
    E('Agencia Swiss Travel', 'Cédula jurídica', '3101220011', { cliente: cli('Crédito', 45, 25000, 'USD') }),
    E('Gas Zeta Costa Rica', 'Cédula jurídica', '3101117788', { proveedor: prov(30, 'Servicios') }),
    E('Corporación Fischel', 'Cédula jurídica', '3101009911', { cliente: cli('Contado', 0, 0), proveedor: prov(30, 'Suministros') }),
    E('Mantenimiento Integral MI', 'Cédula jurídica', '3101882244', { proveedor: prov(30, 'Servicios') }),
    // Mismo nombre que un perfil del MAN con otra cédula: posible duplicado.
    E('Pricesmart de Costa Rica S.A.', 'Cédula jurídica', '3101112233', { proveedor: prov(30, 'Suministros') }),
  ],
  DICR: [
    E('Intel Costa Rica', 'Cédula jurídica', '3012123456', { receptor: rec('262001 - Fabricación de computadoras', 'Heredia'), correo: 'fe.costarica@intel.com' }),
    E('María Fernanda Rojas', 'Cédula física', '112340567', { receptor: rec('No aplica', 'San José') }),
    E('Agencia Swiss Travel', 'Cédula jurídica', '3101220011', { receptor: rec('791101 - Agencias de viajes', 'San José') }),
    E('Constructora Meco', 'Cédula jurídica', '3101015566', { receptor: rec('410001 - Construcción de edificios', 'San José', true) }),
  ],
  FDK: [
    // Misma cédula con otro formato, el nombre escrito distinto y otro teléfono: se une y pide revisar los datos.
    E('Travel Agency C.R.', 'Cédula jurídica', '3-101-778899', { empresa: emp('Agencia', 'Neta agencias', 10), telefono: '+506 2643-1200' }),
    E('Expedia Inc.', 'Pasaporte', 'US-91-1996326', { empresa: emp('OTA', 'OTA', 15, false) }, 'Estados Unidos'),
    // Solo cambian tildes y mayúsculas: no cuenta como dato distinto.
    E('CARLOS MENDEZ SOLIS', 'Cédula física', '204560789', { cliente: cli('Contado', 0, 0) }),
    E('Sofía Hernández Brenes', 'Cédula física', '115670234', { cliente: cli('Contado', 0, 0) }),
    E('Grupo Mutual Alajuela', 'Cédula jurídica', '3101662233', { empresa: emp('Corporativo', 'Corporativa 2026', 0) }),
    E('Kevin O\'Brien', 'Pasaporte', 'P-7781234', { cliente: cli('Contado', 0, 0) }, 'Estados Unidos'),
    E('Hotelbeds Spain S.L.', 'Pasaporte', 'ES-B57218372', { empresa: emp('Mayorista', 'Neta mayoristas', 20) }, 'España'),
    E('Emma Schneider', 'Pasaporte', 'C4TX81122', { cliente: cli('Contado', 0, 0) }, 'Alemania'),
  ],
};

/** Une dos entradas de la misma identificación (ACC y DICR en el modo ACC + DICR). */
const juntar = (a: PerfilEntrante, b: PerfilEntrante): PerfilEntrante => ({ ...a, ...b, roles: [...new Set([...a.roles, ...b.roles])] });

/** Perfiles que tiene el módulo en su base de datos. */
export function perfilesDelModulo(m: ModuloId): PerfilEntrante[] {
  if (!PERFILES_DE[m]) return [];
  const fuentes = m === 'ACC_DICR' ? ['ACC', 'DICR'] as const : [m as 'ACC' | 'DICR' | 'FDK'];
  const out: PerfilEntrante[] = [];
  for (const e of fuentes.flatMap(f => DESDE[f] ?? [])) {
    const i = out.findIndex(x => normId(x.identificacion) === normId(e.identificacion));
    if (i >= 0) out[i] = juntar(out[i], e); else out.push(e);
  }
  return out;
}

/** Perfil del MAN con la misma identificación (si existe). */
export const coincidencia = (e: PerfilEntrante, actuales: Perfil[]) => actuales.find(p => normId(p.identificacion) === normId(e.identificacion));

/**
 * Une los perfiles elegidos del módulo con los del MAN: por identificación suma roles, módulo y los datos de cada rol;
 * si no existe, lo crea. Devuelve los perfiles resultantes.
 */
export function unirPerfiles(m: ModuloId, actuales: Perfil[], elegidos?: string[]): Perfil[] {
  const out = actuales.map(p => ({ ...p }));
  for (const e of perfilesDelModulo(m).filter(x => !elegidos || elegidos.includes(normId(x.identificacion)))) {
    const { nombre, tipoId, identificacion, correo: mail, telefono: tel, pais, roles, ...datos } = e;
    const p = out.find(x => normId(x.identificacion) === normId(identificacion));
    if (p) {
      p.roles = [...new Set([...p.roles, ...roles])];
      p.modulos = [...new Set([...p.modulos, m])];
      // Los datos de un rol que el perfil todavía no tiene se toman del módulo.
      for (const [k, v] of Object.entries(datos) as [keyof typeof datos, unknown][]) if (v && !p[k]) Object.assign(p, { [k]: v });
    }
    else out.push({ id: 'pf-' + identificacion, nombre, tipoId, identificacion, correo: mail, telefono: tel, pais, roles, modulos: [m], activo: true, ...datos });
  }
  return out;
}
