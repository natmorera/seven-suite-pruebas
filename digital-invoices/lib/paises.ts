// Países disponibles para la empresa: su moneda (la moneda funcional de la
// contabilidad) y la zona horaria que se propone al elegirlos.
export interface Pais { value: string; label: string; moneda: string; monedaNombre: string; simbolo: string; zona: string }
export const PAISES: Pais[] = [
  { value: 'CR', label: 'Costa Rica', moneda: 'CRC', monedaNombre: 'Colón costarricense', simbolo: '¢', zona: 'America/Costa_Rica' },
  { value: 'NI', label: 'Nicaragua', moneda: 'NIO', monedaNombre: 'Córdoba nicaragüense', simbolo: 'C$', zona: 'America/Managua' },
  { value: 'GT', label: 'Guatemala', moneda: 'GTQ', monedaNombre: 'Quetzal guatemalteco', simbolo: 'Q', zona: 'America/Guatemala' },
  { value: 'HN', label: 'Honduras', moneda: 'HNL', monedaNombre: 'Lempira hondureña', simbolo: 'L', zona: 'America/Tegucigalpa' },
  { value: 'SV', label: 'El Salvador', moneda: 'USD', monedaNombre: 'Dólar estadounidense', simbolo: '$', zona: 'America/El_Salvador' },
  { value: 'PA', label: 'Panamá', moneda: 'USD', monedaNombre: 'Dólar estadounidense', simbolo: '$', zona: 'America/Panama' },
  { value: 'DO', label: 'República Dominicana', moneda: 'DOP', monedaNombre: 'Peso dominicano', simbolo: 'RD$', zona: 'America/Santo_Domingo' },
  { value: 'MX', label: 'México', moneda: 'MXN', monedaNombre: 'Peso mexicano', simbolo: '$', zona: 'America/Mexico_City' },
  { value: 'CO', label: 'Colombia', moneda: 'COP', monedaNombre: 'Peso colombiano', simbolo: '$', zona: 'America/Bogota' },
  { value: 'VE', label: 'Venezuela', moneda: 'VES', monedaNombre: 'Bolívar venezolano', simbolo: 'Bs.', zona: 'America/Caracas' },
  { value: 'US', label: 'Estados Unidos', moneda: 'USD', monedaNombre: 'Dólar estadounidense', simbolo: '$', zona: 'America/New_York' },
];
export const paisPorCodigo = (c: string) => PAISES.find(p => p.value === c);
export const monedaDePais = (c: string) => paisPorCodigo(c)?.moneda ?? 'USD';
// Monedas que puede llevar la contabilidad: una primaria (funcional) y las secundarias que se quieran
export const MONEDAS_CONTABLES = [
  { value: 'CRC', label: 'Colón costarricense (¢)', simbolo: '¢' },
  { value: 'USD', label: 'Dólar estadounidense ($)', simbolo: '$' },
  { value: 'EUR', label: 'Euro (€)', simbolo: '€' },
  { value: 'GTQ', label: 'Quetzal guatemalteco (Q)', simbolo: 'Q' },
  { value: 'NIO', label: 'Córdoba nicaragüense (C$)', simbolo: 'C$' },
];
export const esMonedaContable = (m: string) => MONEDAS_CONTABLES.some(x => x.value === m);
// Moneda primaria que se propone para un país (si la suya no está en la lista, dólares)
export const monedaPrimariaDePais = (c: string) => { const m = monedaDePais(c); return esMonedaContable(m) ? m : 'USD'; };
export const simboloMoneda = (m: string) => MONEDAS_CONTABLES.find(x => x.value === m)?.simbolo ?? PAISES.find(p => p.moneda === m)?.simbolo ?? '';
export const ZONAS_HORARIAS = [...new Set(PAISES.map(p => p.zona))].map(z => ({ value: z, label: z }));
// Códigos de Hacienda: son los mismos que lleva el emisor en el XML.
export const TIPOS_ID = [
  { value: '02', label: 'Cédula jurídica' }, { value: '01', label: 'Cédula física' }, { value: '03', label: 'DIMEX' },
  { value: '04', label: 'NITE' }, { value: 'EX', label: 'Extranjero' },
];
// Guatemala: el emisor se identifica con su NIT
export const TIPOS_ID_GT = [{ value: 'NIT', label: 'NIT' }];
export const tiposIdDePais = (pais: string) => (pais === 'GT' ? TIPOS_ID_GT : TIPOS_ID);
export const tipoIdInicialDePais = (pais: string) => (pais === 'GT' ? 'NIT' : '02');
