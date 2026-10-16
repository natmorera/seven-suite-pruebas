// Un "Emisor" es la empresa/cédula jurídica autorizada ante Hacienda para
// emitir comprobantes. Un proyecto multi-hotel puede tener varios emisores
// (uno por cédula jurídica), cada uno con su propia llave criptográfica.

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
