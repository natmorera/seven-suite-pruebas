// Importe en letras para recibos y comprobantes (p. ej. «CIENTO VEINTE DÓLARES CON 50/100»).
import { pad } from './finanzas';

// ── Montos en letras (comprobante de depósito) ──────────────────────────────
const U = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
const D = ['', '', 'VEINTI', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CC = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
function menorMil(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100), r = n % 100;
  let t = '';
  if (r <= 20) t = U[r];
  else if (r < 30) t = D[2] + U[r - 20];
  else t = D[Math.floor(r / 10)] + (r % 10 ? ' Y ' + U[r % 10] : '');
  return [CC[c], t].filter(Boolean).join(' ');
}
export function montoEnLetras(monto: number): string {
  const ent = Math.floor(Math.abs(monto)), cent = Math.round((Math.abs(monto) - ent) * 100);
  const mill = Math.floor(ent / 1e6), miles = Math.floor((ent % 1e6) / 1000), resto = ent % 1000;
  const partes: string[] = [];
  if (mill) partes.push(mill === 1 ? 'UN MILLÓN' : `${menorMil(mill)} MILLONES`);
  if (miles) partes.push(miles === 1 ? 'MIL' : `${menorMil(miles)} MIL`);
  if (resto) partes.push(menorMil(resto));
  return `${partes.join(' ') || 'CERO'} CON ${pad(cent)}/100`;
}
