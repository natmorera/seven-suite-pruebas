

// ── Design tokens ─────────────────────────────────────────────────────────────
// ── Formato numérico estándar de toda la app: 1,234,567.00 ───────────────────
// "," separador de miles, "." separador decimal, SIEMPRE 2 decimales (.00),
// sin excepción - regla de negocio explícita.
export function fmtNum(n: number, decimals = 2): string {
  const parts = Math.abs(n).toFixed(decimals).split('.');
  const int   = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const dec   = parts[1] ?? '';
  return (n < 0 ? '-' : '') + int + (decimals > 0 ? '.' + dec : '');
}
// Con símbolo de moneda: ₡ 1,234,567.00  |  $ 50,000.00
export function fmtMoney(n: number, sym = '₡', decimals = 2): string {
  return sym + '\u00a0' + fmtNum(n, decimals);
}
// Fecha estándar de toda la app: DD/MM/AAAA. Acepta Date, "YYYY-MM-DD" o
// cualquier string parseable, así cada módulo llama a lo mismo en vez de
// inventar su propio toLocaleDateString con opciones distintas.
export function fmtDate(input: Date | string): string {
  const d = typeof input === 'string'
    ? (input.length === 10 ? new Date(input + 'T12:00:00') : new Date(input))
    : input;
  if (isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
// ── Vencimiento de facturas ───────────────────────────────────────────────────
// Regla de negocio (Issue #14): la fecha de vencimiento de una factura es
// fecha de factura + días de crédito del cliente/proveedor. Los "días vencidos"
// se cuentan a partir de esa fecha de vencimiento, no de la fecha de factura.
export function fechaVencimiento(fechaFactura: Date | string, diasCredito: number): Date {
  const d = typeof fechaFactura === 'string'
    ? parseFechaInterna(fechaFactura)
    : new Date(fechaFactura);
  d.setDate(d.getDate() + diasCredito);
  return d;
}
// Acepta 'YYYY-MM-DD' (formato interno estándar) y, defensivamente, 'DD/MM/YYYY'
// (formato de visualización) por si algún dato llega así por error - antes esto
// último producía Invalid Date y se veía como "NaN/NaN/NaN" en pantalla.
export function parseFechaInterna(fecha: string): Date {
  if (fecha.includes('/')) {
    const [dd, mm, yyyy] = fecha.split('/').map(Number);
    return new Date(yyyy, (mm || 1) - 1, dd || 1, 12);
  }
  return fecha.length === 10 ? new Date(fecha + 'T12:00:00') : new Date(fecha);
}
export function diasVencidos(fechaFactura: Date | string, diasCredito: number, hoy: Date = new Date()): number {
  const venc = fechaVencimiento(fechaFactura, diasCredito);
  const diff = Math.round((hoy.getTime() - venc.getTime()) / 86400000);
  return Math.max(0, diff);
}
