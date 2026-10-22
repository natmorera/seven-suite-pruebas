// Datos de ejemplo: empresas, módulos, conexiones con cada módulo, integraciones entre módulos y entidades.
import { EMPRESAS, MODULOS_SUITE } from '@/components/suite/modulos';
import { CATALOGO } from '../catalogo';
import type { ConexionModulo, Empresa, Enlace, Entidad, Modulo, ModuloId } from '../tipos';

const base = (nombreLegal: string, nombreComercial: string, numeroId: string, direccion: string, telefono: string, dominio: string): Empresa => ({
  nombreLegal, nombreComercial, tipoId: 'Cédula jurídica', numeroId, pais: 'Costa Rica', zonaHoraria: 'America/Costa_Rica',
  direccion, telefono, correo: `info@${dominio}`, web: `www.${dominio}`,
});
/** Datos de cada empresa del usuario (las del selector del menú). */
export const empresas: Record<string, Empresa> = Object.fromEntries(EMPRESAS.map((nombre, i) => [nombre, [
  base('Fortuna Hospitality S.A.', nombre, '3101123456', 'La Fortuna, San Carlos, Alajuela', '+506 2479-0000', 'hotelfortuna.com'),
  base('Grand Horizon Resorts S.A.', nombre, '3101654987', 'Playa Tamarindo, Santa Cruz, Guanacaste', '+506 2653-1100', 'grandhorizon.com'),
  base('Inversiones San José Centro S.A.', nombre, '3101778811', 'Avenida 2, San José', '+506 2222-3300', 'hotelsanjose.com'),
  base('Uvita Bay Lodge S.R.L.', nombre, '3102445501', 'Uvita, Osa, Puntarenas', '+506 2743-8800', 'hoteluvita.com'),
][i] ?? base(nombre, nombre, '', '', '', 'empresa.com')]));

const CONTRATADOS: ModuloId[] = ['FDK', 'POS', 'ACC_DICR', 'INV', 'PAY', 'DSS'];
export const modulos: Modulo[] = CATALOGO.map(m => ({
  id: 'm-' + m.id, codigo: m.id, contratado: CONTRATADOS.includes(m.id), activo: CONTRATADOS.includes(m.id),
  url: CONTRATADOS.includes(m.id) ? MODULOS_SUITE.find(x => x.id === m.id)?.url ?? `https://${m.id.toLowerCase()}.seven.cloud` : '',
}));

// Ningún módulo empieza conectado: Accounting y Front Desk se integran desde Módulos pegando el API Key que genera cada uno.
export const conexiones: ConexionModulo[] = CONTRATADOS.map(modulo => ({
  id: 'cx-' + modulo, modulo, apiKey: '', estado: 'Sin probar', ultimaPrueba: '', ultimaSync: '', perfilesSync: 0,
}));

// Sin enlaces al inicio: se crean al verificar y guardar la integración de un módulo.
export const enlaces: Enlace[] = [];
/** Sufijo de la base de datos de cada módulo (CGA_SevenFront, CGA_SevenAcc…). */
const SUFIJO_BASE: Partial<Record<ModuloId, string>> = {
  FDK: 'Front', POS: 'POS', ACC: 'Acc', DICR: 'DICR', ACC_DICR: 'Acc', INV: 'Inv', PAY: 'PR', DSS: 'DSS', TO: 'TO', MAN: 'Man',
};
const SERVIDOR = 'sql.seven.local,1433';
const MODULOS_NOMBRE: Partial<Record<ModuloId, string>> = {
  FDK: 'Front Desk', POS: 'Point of Sales', ACC_DICR: 'Accounting', INV: 'Inventory', PAY: 'Payroll', DSS: 'DSS',
};
const entidad = (id: string, descripcion: string, pref: string, activo = true): Entidad => ({
  id, descripcion, bitacora: true, frontPrincipal: `${pref}_SevenFront`, activo,
  bases: CONTRATADOS.map(modulo => ({
    id: `${id}-${modulo}`, modulo, descripcion: MODULOS_NOMBRE[modulo] ?? modulo, base: pref === 'CRF' && modulo === 'DSS' ? '' : `${pref}_Seven${SUFIJO_BASE[modulo]}`, origen: pref === 'CRF' && modulo === 'DSS' ? '' : `${pref}_Seven${SUFIJO_BASE[modulo]}`, usuario: 'sys7user', contrasena: '••••••••',
    servidor: SERVIDOR, version: '6.0.18', estado: pref === 'CGA' && modulo === 'PAY' ? 'Error' : pref === 'CGA' ? 'Conectada' : 'Sin probar',
  })),
});
export const entidades: Entidad[] = [
  entidad('e1', 'Marea Hotel Seven', 'CGA'), entidad('e2', 'Chachagua Rain Forest', 'CRF'), entidad('e3', 'Hotel Fortuna Centro', 'HFC'),
  entidad('e4', 'Grand Horizon Tamarindo', 'GHT'), entidad('e5', 'Hotel San José Plaza', 'HSJ'), entidad('e6', 'Hotel Uvita (cerrado)', 'HUV', false),
];
