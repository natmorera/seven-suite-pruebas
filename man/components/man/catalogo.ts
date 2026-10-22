// Catálogo de módulos de Seven Suite visto desde el MAN: nombre, sigla, isotipo, qué perfiles comparte
// con el MAN y dónde se abre cada perfil. Accounting y Digital Invoices son un solo producto con tres modos
// (ACC, DICR o ACC + DICR): mismo isotipo, distinto nombre, y una empresa tiene solo uno.
import { MODULOS_SUITE } from '@/components/suite/modulos';
import type { Modulo, ModuloId, RolPerfil } from './tipos';

interface ModuloCatalogo {
  id: ModuloId; sigla: string; nombre: string; descripcion: string;
  /** Isotipo (degradado claro → oscuro) y color del texto. */
  colores: [string, string]; texto: string; fondo: string;
}

const desde = (id: ModuloId, suite: string, nombre?: string, sigla: string = id): ModuloCatalogo => {
  const s = MODULOS_SUITE.find(m => m.id === suite);
  return {
    id, sigla, nombre: nombre ?? s?.nombre ?? id, descripcion: s?.descripcion ?? '',
    colores: s?.colores[0] ?? ['#9E9E9E', '#616161'], texto: s?.texto ?? '#424242', fondo: s?.fondo ?? '#F5F5F5',
  };
};

export const CATALOGO: ModuloCatalogo[] = [
  desde('FDK', 'FDK'),
  desde('POS', 'POS'),
  desde('TO', 'TO', 'Tour Operador'),
  desde('ACC', 'ACC'),
  desde('DICR', 'DICR'),
  desde('ACC_DICR', 'ACC_DICR', 'Accounting + Digital Invoices', 'ACC + DICR'),
  desde('PAY', 'PAY'),
  desde('INV', 'INV'),
  desde('DSS', 'DSS'),
  desde('ANA', 'ANA', undefined, 'ANA'),
];

// Management usa su propio verde (#8ADD88 → #34723A) para no confundirse con el del POS.
const MAN: ModuloCatalogo = { ...desde('MAN', 'MGT', 'Management', 'MAN'), colores: ['#8ADD88', '#34723A'], texto: '#34723A', fondo: '#EFF8EE' };
export const infoModulo = (id: ModuloId): ModuloCatalogo => CATALOGO.find(m => m.id === id) ?? MAN;
export const nombreModulo = (id: ModuloId) => infoModulo(id).nombre;
export const siglaModulo = (id: ModuloId) => infoModulo(id).sigla;

/** Modos del producto contable: la empresa tiene uno solo. */
const MODOS_FINANZAS: ModuloId[] = ['ACC', 'DICR', 'ACC_DICR'];
/** Modo contable que tiene contratado la empresa (o undefined). */
export const modoFinanzas = (modulos: Modulo[]) => modulos.find(m => m.contratado && MODOS_FINANZAS.includes(m.codigo))?.codigo;
/** El modo contratado incluye contabilidad (ACC) o facturación electrónica (DICR). */
export const incluye = (modo: ModuloId | undefined, parte: 'ACC' | 'DICR') => !!modo && (modo === parte || modo === 'ACC_DICR');

/** Módulos que se integran desde el MAN (conexión, perfiles, contabilidad y verificación). Los demás solo se abren. */
export const MODULOS_INTEGRABLES: ModuloId[] = ['FDK', 'ACC', 'DICR', 'ACC_DICR'];

/** Envíos de datos que existen entre módulos (origen → destino); el producto contable cuenta como uno solo. */
// Por ahora solo hay información para enlazar Front Desk con el producto contable (en las dos direcciones).
const ENVIOS: Partial<Record<ModuloId | 'CONTABLE', (ModuloId | 'CONTABLE')[]>> = {
  FDK: ['CONTABLE'],
  CONTABLE: ['FDK'],
};
const grupo = (m: ModuloId) => (MODOS_FINANZAS.includes(m) ? 'CONTABLE' : m);
/** El producto contable (ACC, DICR o ACC + DICR). */
export const esContable = (m: ModuloId) => MODOS_FINANZAS.includes(m);
/** El módulo de origen puede enviar datos al de destino. */
export const puedeEnviar = (origen: ModuloId, destino: ModuloId) => !!ENVIOS[grupo(origen)]?.includes(grupo(destino));

/** Perfiles que cada módulo comparte con el MAN y que se traen al conectarlo. */
export const PERFILES_DE: Partial<Record<ModuloId, { roles: RolPerfil[]; texto: string }>> = {
  ACC: { roles: ['Cliente', 'Proveedor'], texto: 'clientes y proveedores' },
  DICR: { roles: ['Receptor'], texto: 'receptores de comprobantes' },
  ACC_DICR: { roles: ['Cliente', 'Proveedor', 'Receptor'], texto: 'clientes, proveedores y receptores' },
  FDK: { roles: ['Cliente', 'Empresa'], texto: 'perfiles de cliente y de empresa' },
};

/** Roles de un perfil y los módulos que los usan (Cliente es el mismo perfil en Accounting y en Front Desk). */
const ROLES: { rol: RolPerfil; titulo: string; usan: ('ACC' | 'DICR' | 'FDK')[] }[] = [
  { rol: 'Cliente', titulo: 'Clientes', usan: ['ACC', 'FDK'] },
  { rol: 'Proveedor', titulo: 'Proveedores', usan: ['ACC'] },
  { rol: 'Receptor', titulo: 'Receptores', usan: ['DICR'] },
  { rol: 'Empresa', titulo: 'Empresas', usan: ['FDK'] },
];
/** Pantalla de cada módulo donde se personalizan los permisos de un usuario (se abre con ?usuario=<usuario>). */
export const RUTA_PERMISOS = '/configuracion/usuarios';

/** Pantalla de perfiles dentro de cada módulo, para abrir un perfil allá. */
export const RUTA_PERFILES: Partial<Record<ModuloId, string>> = {
  ACC: '/configuracion/clientes-proveedores', ACC_DICR: '/configuracion/clientes-proveedores', DICR: '/facturacion/receptores', FDK: '/perfiles',
};
/** Roles que existen para la empresa según lo que tiene contratado (sin DICR no hay receptores). */
export function rolesDisponibles(modulos: Modulo[]) {
  const modo = modoFinanzas(modulos);
  const fdk = modulos.some(m => m.codigo === 'FDK' && m.contratado);
  return ROLES.filter(r => r.usan.some(u => (u === 'FDK' ? fdk : incluye(modo, u))));
}

/** Enlace de WhatsApp de ventas con el mensaje para solicitar un módulo. */
const WHATSAPP_VENTAS = process.env.NEXT_PUBLIC_WHATSAPP_VENTAS || 'https://wa.me/50640003444';
export const enlaceSolicitud = (empresa: string) => {
  const u = new URL(WHATSAPP_VENTAS);
  u.searchParams.set('text', `Hola, quiero información sobre los módulos de Seven Suite para ${empresa}.`);
  return u.href;
};

/** Roles de cada módulo para asignar a un usuario (los permisos de cada rol se definen dentro del módulo). */
const ROLES_FINANZAS = ['Administrador', 'Gerente', 'Contador', 'Facturación', 'Consulta'];
export const ROLES_MODULO: Partial<Record<ModuloId, string[]>> = {
  FDK: ['Administrador', 'Gerente de recepción', 'Recepcionista', 'Agente de reservas', 'Cajero', 'Cajero responsable', 'Auditor nocturno', 'Ama de llaves', 'Consulta'],
  POS: ['Administrador', 'Supervisor', 'Cajero', 'Mesero', 'Consulta'],
  ACC: ROLES_FINANZAS, DICR: ROLES_FINANZAS, ACC_DICR: ROLES_FINANZAS,
  INV: ['Administrador', 'Bodeguero', 'Comprador', 'Consulta'],
  PAY: ['Administrador', 'Planillas', 'Consulta'],
  TO: ['Administrador', 'Agente de ventas', 'Consulta'],
  DSS: ['Gerente', 'Consulta'], ANA: ['Gerente', 'Consulta'],
  MAN: ['Administrador', 'Consulta'],
};
