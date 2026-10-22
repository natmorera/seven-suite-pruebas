'use client';
import { C, FONT } from '@/components/ui/tokens';
import { fmtNum } from '@/components/ui/formato';

export const F = FONT;
export const BRAND = C.brand;
export function fmt2(n: number) { return fmtNum(n, 2); }
type EstadoDep = 'Pendiente' | 'Contabilizada' | 'Anulados';
export interface Partida {
  id: string;
  comprobante: string;
  fecha: string;
  descripcion: string;
  importe: number;
  incluida: boolean;
}
export interface Deposito {
  id: number;
  consecutivo: string;
  fecha: string;
  estado: EstadoDep;
  cuentaOrigen: string;
  bancoDestino: string;
  referencia: string;
  moneda: 'CRC' | 'USD';
  importe: number;
  usuario: string;
}
export const CUENTAS_EFECTIVO = [
  '11020201 – Efectivo CRC Front Selvatura',
  '11020202 – Efectivo USD Front Selvatura',
  '11025251 – Efectivo CRC Rest El Jardín',
  '11020202 – Efectivo USD Front S…',
];
export const BANCOS_DESTINO = [
  'BNCR – Cta. 015-004943-0 (CRC)',
  'BAC – Cta. 4646545466888 (CRC)',
  'BCR – 001-0252067-2 (CRC)',
  'BAC – San José 917900144 (USD)',
];
export const PARTIDAS_MOCK: Partida[] = [
  { id:'p1', comprobante:'60500214', fecha:'00/00/0000', descripcion:'Depósito de efectivo del 04/05', importe:38000.00,  incluida:true  },
  { id:'p2', comprobante:'60500217', fecha:'00/00/0000', descripcion:'Depósito de efectivo del 04/05', importe:17493.22,  incluida:true  },
  { id:'p3', comprobante:'60500218', fecha:'00/00/0000', descripcion:'Depósito de efectivo del 05/05', importe:193466.99, incluida:false },
];
export const DEPOSITOS_INIT: Deposito[] = [
  { id:1, consecutivo:'DEP-4339', fecha:'00/00/00', estado:'Pendiente',     cuentaOrigen:'11020201 – Efectivo CRC Front S…',  bancoDestino:'BNCR 015-004943-0',     referencia:'-',       moneda:'USD', importe:1200,      usuario:'jperez'   },
  { id:2, consecutivo:'DEP-4338', fecha:'00/00/00', estado:'Pendiente',     cuentaOrigen:'11020201 – Efectivo CRC Front S…',  bancoDestino:'BNCR 015-004943-0',     referencia:'89774412',moneda:'CRC', importe:55500,     usuario:'sblandon' },
  { id:3, consecutivo:'DEP-4337', fecha:'00/00/00', estado:'Contabilizada', cuentaOrigen:'11025251 – Efectivo CRC Rest El J…', bancoDestino:'BAC San José 917900144',referencia:'45464545',moneda:'CRC', importe:193466.99, usuario:'yader'    },
  { id:4, consecutivo:'DEP-4335', fecha:'00/00/00', estado:'Anulados',      cuentaOrigen:'11020202 – Efectivo USD Front S…',  bancoDestino:'BCR 001-0252067-2',     referencia:'89774412',moneda:'CRC', importe:0,         usuario:'yader'    },
];
export const ESTADO_STYLE: Record<EstadoDep,[string,string]> = {
  Pendiente:     ['#EF9F27','rgba(239,159,39,.12)'],
  Contabilizada: [C.success,'rgba(29,158,117,.12)'],
  Anulados:      [C.error,'rgba(226,75,74,.12)'],
};
