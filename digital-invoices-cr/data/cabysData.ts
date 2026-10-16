// Catálogo de Bienes y Servicios (CABYS) - Hacienda exige un código CABYS por
// cada línea de detalle de un comprobante electrónico. El catálogo real tiene
// más de 350,000 códigos (13 dígitos); acá va un subconjunto curado típico
// para un hotel.

export interface CodigoCabys {
  codigo: string;        // 13 dígitos
  descripcion: string;
  impuesto: number;      // % de IVA aplicable (13, 4, 2, 1 o 0 = exento)
}

// Códigos verificados contra el catálogo oficial (api.hacienda.go.cr/fe/cabys,
// sept 2026). Para cualquier otro bien o servicio, los buscadores consultan
// en vivo a Hacienda (ver app/api/hacienda/cabys).
export const CABYS: CodigoCabys[] = [
  { codigo: '6311100000000', descripcion: 'Servicios de alojamiento para visitantes, en habitaciones o unidades de estancias cortas, con servicio de limpieza diario', impuesto: 13 },
  { codigo: '6311200000000', descripcion: 'Servicios de alojamiento para visitantes, en habitaciones o unidades de estancias cortas, sin servicio de limpieza diario', impuesto: 13 },
  { codigo: '6311400000000', descripcion: 'Servicios de alojamiento para visitantes, en habitaciones o unidades de estancias cortas, para ocupación múltiple', impuesto: 13 },
  { codigo: '6329000000000', descripcion: 'Servicios de alojamiento, n.c.p.', impuesto: 13 },
  { codigo: '8552100000000', descripcion: 'Servicios de reservación de alojamiento', impuesto: 13 },
  { codigo: '6331000000000', descripcion: 'Suministro de comida, servicio de restaurante con mesero', impuesto: 13 },
  { codigo: '6332000000000', descripcion: 'Suministro de comida, servicio de restaurante sin mesero, con sitios para sentarse', impuesto: 13 },
  { codigo: '6339100000000', descripcion: 'Servicios de suministro de comida por encargo para eventos "catering service"', impuesto: 13 },
  { codigo: '6340002010100', descripcion: 'Cerveza nacional embotellada o no, vendida en restaurantes, bares y establecimientos similares', impuesto: 13 },
  { codigo: '6340002019900', descripcion: 'Bebidas frías, con alcohol, vendidas en restaurantes, bares y establecimientos similares', impuesto: 13 },
  { codigo: '6340002029900', descripcion: 'Bebidas frías, sin alcohol, vendidas en restaurantes, bares y establecimientos similares', impuesto: 13 },
  { codigo: '6340001009900', descripcion: 'Bebidas calientes, vendidas en restaurantes, bares y establecimientos similares', impuesto: 13 },
  { codigo: '9713000000000', descripcion: 'Servicios de limpieza de productos textiles, n.c.p. (lavandería)', impuesto: 13 },
  { codigo: '9714000000000', descripcion: 'Servicios de planchado', impuesto: 13 },
  { codigo: '9723000000100', descripcion: 'Servicios brindados por estéticas o spa (tratamientos faciales, masajes, entre otros)', impuesto: 13 },
  { codigo: '8554000000000', descripcion: 'Servicios de operador turístico', impuesto: 13 },
  { codigo: '8555000000000', descripcion: 'Servicios de guía turístico', impuesto: 13 },
  { codigo: '6413200000000', descripcion: 'Servicios de transporte terrestre de turistas, excepto por ferrocarril', impuesto: 13 },
  { codigo: '6743000000000', descripcion: 'Servicios de estacionamiento (parqueos)', impuesto: 13 },
  { codigo: '8422200000000', descripcion: 'Servicios de acceso a Internet de banda ancha', impuesto: 13 },
  { codigo: '8596100000000', descripcion: 'Servicios de organización y asistencia de convenciones', impuesto: 13 },
  { codigo: '7324000000000', descripcion: 'Servicios de arrendamiento de equipo de recreación y esparcimiento', impuesto: 13 },
  { codigo: '2441099000000', descripcion: 'Agua embotellada, sin edulcorantes o saborizantes, n.c.p.', impuesto: 13 },
  { codigo: '2431000000000', descripcion: 'Cerveza de malta', impuesto: 13 },
  { codigo: '2449001000000', descripcion: 'Bebidas gaseosas azucaradas, edulcoradas o aromatizadas', impuesto: 13 },
  { codigo: '2139400000200', descripcion: 'Papas en rodajas, tostadas', impuesto: 13 },
  { codigo: '2820204990000', descripcion: 'Camiseta para hombre o niño, n.c.p.', impuesto: 13 },
  { codigo: '0135999000000', descripcion: 'Frutas frescas o refrigeradas, n.c.p.', impuesto: 13 },
  { codigo: '0151002020100', descripcion: 'Papa blanca, fresca o refrigerada', impuesto: 1 },
  { codigo: '2349002010700', descripcion: 'Pan cuadrado, blanco o integral, con o sin semillas, pasas o similares, sin congelar', impuesto: 1 },
];

// Códigos de ejemplo de versiones anteriores → código oficial.
export const CABYS_REEMPLAZO: Record<string, string> = {
  '8511100010000': '6311100000000', '8511100020000': '6311400000000', '5620100010000': '6331000000000',
  '5630100010000': '6340002019900', '9610100010000': '9713000000000', '9200100010000': '9723000000100',
  '7911100010000': '8554000000000', '5221100010000': '6743000000000', '6110100010000': '8422200000000',
  '5510100010000': '8596100000000', '0111100010000': '0135999000000', '0112100010000': '0151002020100',
  '1071100010000': '2349002010700', '4923100010000': '6413200000000', '2441100010000': '2441099000000',
  '2431100010000': '2431000000000', '2399100010000': '2139400000200', '3899100010000': '2820204990000',
};

function sinAcentos(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Acepta texto ("hospedaje"), código completo o parcial ("8314", "8314-1000"),
// o el valor mostrado en el campo ("8314100000200 - Servicios de…").
export function coincideCabys(codigo: string, descripcion: string, q: string): boolean {
  const t = q.trim();
  if (!t) return true;
  const inicioNumerico = t.match(/^[\d\s.-]+/)?.[0] ?? '';
  const digitos = inicioNumerico.replace(/\D/g, '');
  if (digitos.length >= 2) return codigo.startsWith(digitos.slice(0, 13));
  const s = sinAcentos(t.toLowerCase());
  return sinAcentos(descripcion.toLowerCase()).includes(s) || codigo.includes(s);
}
export function buscarCabys(q: string): CodigoCabys[] {
  if (!q.trim()) return CABYS;
  return CABYS.filter(c => coincideCabys(c.codigo, c.descripcion, q));
}
