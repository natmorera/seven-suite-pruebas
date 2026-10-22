
export interface ActividadEconomica {
  codigo: string;
  nombre: string;
}

export const ACTIVIDADES_ECONOMICAS: ActividadEconomica[] = [
  { codigo: '551001', nombre: 'Actividades de alojamiento para estancias cortas (hoteles)' },
  { codigo: '551002', nombre: 'Actividades de alojamiento en cabinas y moteles' },
  { codigo: '552001', nombre: 'Actividades de campamentos y parques para vehículos recreativos' },
  { codigo: '561001', nombre: 'Actividades de restaurantes y de servicio móvil de comidas' },
  { codigo: '563001', nombre: 'Actividades de servicio de bebidas (bares, cantinas)' },
  { codigo: '960201', nombre: 'Actividades de lavado y limpieza de textiles y prendas de piel (lavandería)' },
  { codigo: '960920', nombre: 'Actividades de spa y balnearios' },
  { codigo: '791101', nombre: 'Actividades de agencias de viajes' },
  { codigo: '799001', nombre: 'Actividades de operadores turísticos (tour operador)' },
  { codigo: '522001', nombre: 'Actividades de estacionamiento y parqueo de vehículos' },
  { codigo: '821900', nombre: 'Actividades de fotocopiado, preparación de documentos y otras actividades de apoyo de oficina' },
  { codigo: '620100', nombre: 'Actividades de programación informática' },
  { codigo: '620200', nombre: 'Actividades de consultoría informática y de gestión de instalaciones informáticas' },
  { codigo: '620900', nombre: 'Otras actividades de tecnología de información y de servicio de computador' },
  { codigo: '682001', nombre: 'Alquiler de bienes inmuebles propios o arrendados' },
  { codigo: '561002', nombre: 'Actividades de preparación de alimentos por encargo (catering)' },
  { codigo: '932100', nombre: 'Actividades de parques de atracciones y parques temáticos' },
  { codigo: '493003', nombre: 'Otras actividades de transporte terrestre de pasajeros (transfer/traslados)' },
];

export function buscarActividadEconomica(q: string): ActividadEconomica[] {
  const s = q.trim().toLowerCase();
  if (!s) return ACTIVIDADES_ECONOMICAS;
  return ACTIVIDADES_ECONOMICAS.filter(a => a.codigo.includes(s) || a.nombre.toLowerCase().includes(s));
}

export function labelActividadEconomica(codigo: string): string {
  const a = ACTIVIDADES_ECONOMICAS.find(x => x.codigo === codigo);
  return a ? `${a.codigo} - ${a.nombre}` : codigo;
}
