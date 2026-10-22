// Valores iniciales del MAN (datos de ejemplo). Para conectar el backend se reemplaza INICIAL por la carga desde la API.
import type { EventoBitacora, Impuesto, Moneda, Nacionalidad, TipoCambio } from './tipos';
import { bitacoraEjemplo } from './datos/bitacora';
import { contabilidadFDK } from './datos/contabilidad';
import { conexiones, empresas, enlaces, entidades, modulos } from './datos/estructura';
import { perfiles, usuarios } from './datos/personas';
import { impresoras, pinpad, servicios, servidores, terminales, tiposDocumento } from './datos/estructura-fisica';

export const CUENTAS = [
  '80301010 (0103) - [001] - Ventas de alimentos - IO- Alimentos',
  '80302010 (0104) - [001] - Ingresos por hospedaje',
  '21040101 (0201) - [001] - IVA por pagar',
];

const deposito = { empresa: '100 - Hotel', depAdelantados: 'ADE - DEP ADELANTADO EFECTIVO', pagoParcial: 'ADT - DEP ADELANTADO TARJETA' };
const monedas: Moneda[] = [
  { id: 'mo1', codigo: 'CRC', descripcion: 'Colón Costarricense', simbolo: '₡', principal: true, activo: true, comision: 0, decimales: 2, convertible: true, facturable: true, porModulo: { FDK: deposito, POS: { ...deposito, depAdelantados: '' } } },
  { id: 'mo2', codigo: 'USD', descripcion: 'Dólar Americano', simbolo: '$', principal: false, activo: true, comision: 0, decimales: 2, convertible: true, facturable: true, porModulo: { FDK: deposito } },
  { id: 'mo3', codigo: 'EUR', descripcion: 'Euro', simbolo: '€', principal: false, activo: true, comision: 2, decimales: 2, convertible: true, facturable: false, porModulo: {} },
];
const tiposCambio: TipoCambio[] = ([
  ['2026-10-14', 'USD', 506.4, 'Importación'], ['2026-10-14', 'EUR', 551.1, 'Manual'], ['2026-10-13', 'USD', 506, 'Importación'],
  ['2026-10-13', 'EUR', 550, 'Manual'], ['2026-10-12', 'USD', 505.5, 'Importación'], ['2026-10-11', 'USD', 505.8, 'Importación'],
  ['2026-10-10', 'USD', 506.2, 'Importación'], ['2026-10-09', 'USD', 507, 'Manual'], ['2026-10-01', 'EUR', 551.3, 'Manual'],
] as [string, string, number, TipoCambio['fuente']][]).map(([fecha, moneda, tasa, fuente], i) => ({ id: 'tc' + i, fecha, moneda, tasa, fuente }));

const nacionalidades: Nacionalidad[] = [
  ['ALE', 'Alemania', 'Alemán'], ['ARG', 'Argentina', 'Español'], ['BRA', 'Brasil', 'Portugués'], ['CAN', 'Canadá', 'Inglés'],
  ['CHL', 'Chile', 'Español'], ['COL', 'Colombia', 'Español'], ['CRI', 'Costa Rica', 'Español'], ['ESP', 'España', 'Español'],
  ['USA', 'Estados Unidos', 'Inglés'], ['FRA', 'Francia', 'Francés'], ['GBR', 'Reino Unido', 'Inglés'], ['ITA', 'Italia', 'Italiano'],
  ['MEX', 'México', 'Español'], ['NIC', 'Nicaragua', 'Español'], ['PAN', 'Panamá', 'Español'], ['NLD', 'Países Bajos', 'Neerlandés'],
].map(([codigo, pais, idioma], i) => ({ id: 'n' + i, codigo, pais, idioma, activo: true }));

const impuestos: Impuesto[] = ([
  ['IVA 0%', 0, 1, ['CRC', 'USD'], true, true], ['IVA 1%', 1, 1, ['CRC', 'USD'], false, false], ['IVA 2%', 2, 1, ['CRC'], false, false],
  ['IVA 4%', 4, 1, ['USD'], false, false], ['IVA 13%', 13, 2, ['CRC', 'USD'], false, false], ['Servicios 10%', 10, 1, ['CRC', 'USD'], false, false],
] as [string, number, number, string[], boolean, boolean][]).map(([descripcion, porcentaje, nivel, mon, canje, apSup], i) => ({ id: 'im' + i, descripcion, porcentaje, nivel, cuenta: CUENTAS[2], monedas: mon, canje, apSup, activo: true }));

export const INICIAL = {
  empresas, modulos, conexiones, enlaces, entidades, perfiles, usuarios,
  monedas, tiposCambio, nacionalidades, impuestos,
  bitacora: bitacoraEjemplo(usuarios.map(u => u.usuario)) as EventoBitacora[],
  terminales, servidores, servicios, impresoras, tiposDocumento, pinpad,
  contabilidadFDK,
};
export type Datos = typeof INICIAL;
