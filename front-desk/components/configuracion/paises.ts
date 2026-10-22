// Países donde opera la suite: la moneda del país y la zona horaria que se propone al elegirlo.
export interface Pais { value: string; label: string; monedaNombre: string; simbolo: string; zona: string }

export const PAISES: Pais[] = [
  { value: 'CR', label: 'Costa Rica', monedaNombre: 'Colón costarricense', simbolo: '¢', zona: 'America/Costa_Rica' },
  { value: 'NI', label: 'Nicaragua', monedaNombre: 'Córdoba nicaragüense', simbolo: 'C$', zona: 'America/Managua' },
  { value: 'GT', label: 'Guatemala', monedaNombre: 'Quetzal guatemalteco', simbolo: 'Q', zona: 'America/Guatemala' },
];
export const paisPorCodigo = (c: string) => PAISES.find(p => p.value === c);
export const ZONAS_HORARIAS = [...new Set(PAISES.map(p => p.zona))].map(z => ({ value: z, label: z }));

// Códigos de identificación de Hacienda.
export const TIPOS_ID = [
  { value: '02', label: 'Cédula jurídica' }, { value: '01', label: 'Cédula física' }, { value: '03', label: 'DIMEX' },
  { value: '04', label: 'NITE' }, { value: 'EX', label: 'Extranjero' },
];
