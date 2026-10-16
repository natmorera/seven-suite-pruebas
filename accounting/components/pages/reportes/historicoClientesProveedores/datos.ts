import { fechaVencimiento, diasVencidos } from '../../../ui/formato';
import { FONT } from '../../../ui/tokens';

export const F = FONT;
export const BRAND = '#A77600';
export const RED = '#F44336';
export const GREEN = '#4CAF50';
export function fmt(n: number) {
  const abs = Math.abs(n);
  const s = abs.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
  return n < 0 ? `(${s})` : s;
}
// Issue #10: en el histórico solo se debe mostrar el ID auxiliar (último
// segmento del código de cuenta), no el código completo con los prefijos
// de mayor/sub mayor/detalle.
export function soloIdAux(id: string): string {
  const partes = id.split('-');
  return partes[partes.length - 1];
}
export function fmtFechaHora() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const min = String(d.getMinutes()).padStart(2,'0');
  return `${dd}/${mm}/${yyyy} ${String(h).padStart(2,'0')}:${min} ${ampm}`;
}
// ── Mock data ─────────────────────────────────────────────────────────────────
export const CLIENTES_EC = [
  { id:'13201009', nombre:'ARA Agencia de Viajes Internacional', periodo:'Mayo 2026', moneda:'COL - Colón',
    saldoPendiente:-3241889.74, ultimaOp:'30/04/2025', diasVencido:398,
    movimientos:[
      { doc:'FE-010000030531',       fecha:'04/01/2022', desc:'RE-11, ARA Agencia de Viajes Internacional (dt)', debe:-178596.45, haber:91364.85,  saldo:-87231.60,    dias:1610, fultOp:'04/01/2022' },
      { doc:'FE-0010005001000004510',fecha:'24/03/2022', desc:'DALSTEIN',                                         debe:92514.30,  haber:0,         saldo:92514.30,     dias:1531, fultOp:'24/03/2022' },
      { doc:'FE-0010005001000013600',fecha:'16/12/2022', desc:'Vogele Reisen CR ID-ARGR166002 RE-43651',          debe:-298279.00,haber:325383.91, saldo:27104.92,     dias:1264, fultOp:'29/06/2023' },
      { doc:'FE-0010005001000042118',fecha:'12/12/2024', desc:'Kultour x11+1TL ID-2129445 RE-152050',             debe:216027.28, haber:0,         saldo:216027.28,    dias:537,  fultOp:'12/12/2024' },
      { doc:'FE-0010005001000045071',fecha:'11/03/2025', desc:'Berge & Meer Baden 04.03.25 ID-ARTS178114',        debe:608022.25, haber:0,         saldo:608022.25,    dias:448,  fultOp:'11/03/2025' },
      { doc:'FE-0010005001000046467',fecha:'27/04/2025', desc:'Familie Favre x4 ID-ARFI176612 RE-149597',         debe:115946.18, haber:0,         saldo:115946.18,    dias:401,  fultOp:'27/04/2025' },
    ]
  },
  { id:'13014006', nombre:'Hotel Heliconia S.A.', periodo:'Mayo 2026', moneda:'COL - Colón',
    saldoPendiente:-640907.47, ultimaOp:'15/03/2025', diasVencido:310,
    movimientos:[
      { doc:'FAV-000000000001',     fecha:'01/01/2022', desc:'Servicio hospedaje anual 2022', debe:-640907.47, haber:0,      saldo:-640907.47, dias:1592, fultOp:'01/01/2022' },
      { doc:'FE-0010005001000038901',fecha:'10/08/2024', desc:'Paquete grupos 2024',           debe:189500.00, haber:0,      saldo:189500.00,  dias:294,  fultOp:'10/08/2024' },
    ]
  },
  { id:'30401001', nombre:'Corporación Tica S.A.', periodo:'Mayo 2026', moneda:'COL - Colón',
    saldoPendiente:-540000.00, ultimaOp:'28/02/2026', diasVencido:115,
    movimientos:[
      { doc:'FE-0010005001000049012',fecha:'15/01/2026', desc:'Servicio habitaciones enero 2026', debe:540000.00, haber:0, saldo:540000.00, dias:158, fultOp:'15/01/2026' },
    ]
  },
];
export const PROVEEDORES_EC = [
  { id:'300-001-0001-0001', nombre:'Materiales Occidente S.A.', periodo:'Mayo 2026', moneda:'COL - Colón',
    saldoPendiente:-2000000, ultimaOp:'10/04/2026', diasVencido:135,
    movimientos:[
      { doc:'COM-0000128',fecha:'15/01/2026', desc:'Factura materiales construcción', debe:0, haber:-1200000, saldo:-1200000, dias:144, fultOp:'15/01/2026' },
      { doc:'COM-0000189',fecha:'02/03/2026', desc:'Suministros mantenimiento',       debe:0, haber:-800000,  saldo:-800000,  dias:97,  fultOp:'02/03/2026' },
    ]
  },
  { id:'300-001-0001-0002', nombre:'Ferretero Monteverde S.A.', periodo:'Mayo 2026', moneda:'COL - Colón',
    saldoPendiente:-1800000, ultimaOp:'20/04/2026', diasVencido:110,
    movimientos:[
      { doc:'COM-0000210',fecha:'20/01/2026', desc:'Materiales eléctricos', debe:0, haber:-1800000, saldo:-1800000, dias:139, fultOp:'20/01/2026' },
    ]
  },
];
export interface CuentaCP {
  id: string; nombre: string; periodo: string; moneda: string;
  saldoPendiente: number; ultimaOp: string; diasVencido: number;
  movimientos: { doc:string; fecha:string; desc:string; debe:number; haber:number; saldo:number; dias:number; fultOp:string }[];
}
export interface RangoCP { desde: string; hasta: string }
// "Hoy" de referencia para todo el módulo de antigüedad de saldos (mock)
export const HOY_ANTIGUEDAD = new Date(2026, 5, 2);
 // 02/06/2026

// Issue #14: cada documento ahora guarda su fecha de factura y los días de
// crédito reales (no montos ya repartidos a mano por rango) - el rango de
// antigüedad y la fecha de vencimiento se calculan con fechaVencimiento()/
// diasVencidos() en bucketizeDoc(), igual que se calcularía con datos reales.
export const AGING_DATA = [
  { id:'13201009', nombre:'ARA Agencia de Viajes Internacional',
    docs:[
      { doc:'FE-010000029402',        fechaFactura:'2025-12-04', diasCredito:30, monto:87231.60 },   // +120 días
      { doc:'FE-010000029423',        fechaFactura:'2026-01-18', diasCredito:30, monto:216027.28 },  // 91–120 días
      { doc:'FE-0010005001000042118', fechaFactura:'2026-02-17', diasCredito:30, monto:608022.25 },  // 61–90 días
      { doc:'FE-0010005001000046467', fechaFactura:'2026-04-18', diasCredito:30, monto:115946.18 },  // 1–30 días
      { doc:'FE-0010005001000049200', fechaFactura:'2026-05-13', diasCredito:30, monto:92514.30 },   // corriente
    ]
  },
  { id:'13014006', nombre:'Hotel Heliconia S.A.',
    docs:[
      { doc:'FAV-000000000001',       fechaFactura:'2026-03-19', diasCredito:30, monto:640907.47 },  // 31–60 días
      { doc:'FE-0010005001000038901', fechaFactura:'2025-12-04', diasCredito:30, monto:189500.00 },  // +120 días
    ]
  },
];
// Calcula a qué rango de antigüedad cae un documento, a partir de su factura y
// días de crédito - reemplaza la asignación manual de rango por cálculo real.
export function bucketizeDoc(d: { doc:string; fechaFactura:string; diasCredito:number; monto:number }, hoy: Date = HOY_ANTIGUEDAD) {
  const venceDate = fechaVencimiento(d.fechaFactura, d.diasCredito);
  const vence = `${String(venceDate.getDate()).padStart(2,'0')}/${String(venceDate.getMonth()+1).padStart(2,'0')}/${venceDate.getFullYear()}`;
  const dv = diasVencidos(d.fechaFactura, d.diasCredito, hoy);
  const base = { corr:0, d30:0, d60:0, d90:0, d120:0, mas120:0 };
  if (dv <= 0)       base.corr   = d.monto;
  else if (dv <= 30) base.d30    = d.monto;
  else if (dv <= 60) base.d60    = d.monto;
  else if (dv <= 90) base.d90    = d.monto;
  else if (dv <= 120) base.d120  = d.monto;
  else                base.mas120 = d.monto;
  return { ...base, doc:d.doc, vence, diasVencidos:dv };
}
// ── Vista previa / PDF - replica el reporte impreso (Estado de cuenta y Antigüedad) ──
export function csvEscapeHistorico(v: string) { return `"${String(v).replace(/"/g,'""')}"`; }
