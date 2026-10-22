// Un "Emisor" es la empresa autorizada para emitir comprobantes: en Costa
// Rica, la cédula jurídica ante Hacienda, con su llave criptográfica; en
// Guatemala, el NIT ante la SAT, con sus certificadores. Un proyecto
// multi-hotel puede tener varios emisores.

export interface Emisor {
  id: string;
  razonSocial: string;
  nombreComercial: string;
  cedulaJuridica: string;
  actividadEconomica: string;
  regimen: 'Tradicional' | 'Simplificado';
  llaveCargada: boolean;   // si ya se subió el archivo .p12 de la llave criptográfica
  vigenciaLlave?: string;  // fecha ISO de vencimiento
  activo: boolean;
}

export const EMISORES: Emisor[] = [
  {
    id: 'em-1',
    razonSocial: 'Hotel Fortuna S.A.',
    nombreComercial: 'Hotel Fortuna',
    cedulaJuridica: '3-101-123456',
    actividadEconomica: '551001 - Servicios de alojamiento',
    regimen: 'Tradicional',
    llaveCargada: true,
    vigenciaLlave: '2027-04-12',
    activo: true,
  },
  {
    id: 'em-2',
    razonSocial: 'Grand Horizon Hospitality S.A.',
    nombreComercial: 'Grand Horizon',
    cedulaJuridica: '3-101-654321',
    actividadEconomica: '551001 - Servicios de alojamiento',
    regimen: 'Tradicional',
    llaveCargada: false,
    activo: true,
  },
];

// Emisores de ejemplo de la base de Guatemala
export const EMISORES_GT: Emisor[] = [
  {
    id: 'em-1',
    razonSocial: 'Corporación Petenera de Turismo, S.A.',
    nombreComercial: 'Hotel Guatemala',
    cedulaJuridica: '16896963',
    actividadEconomica: '',
    regimen: 'Tradicional',
    llaveCargada: true,
    vigenciaLlave: '2027-04-12',
    activo: true,
  },
  {
    id: 'em-2',
    razonSocial: 'Inversiones Lago Petén Itzá, S.A.',
    nombreComercial: 'Hotel Itzá',
    cedulaJuridica: '4567812K',
    actividadEconomica: '',
    regimen: 'Tradicional',
    llaveCargada: false,
    activo: true,
  },
];
