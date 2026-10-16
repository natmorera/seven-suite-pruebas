
// ─────────────────────────────────────────────────────────────────────────────
// Datos operativos de Front Desk (habitaciones, reservas, perfiles, tareas,
// cajas). Los comparten Dashboard, Mapa, Perfiles, Tareas y Reportes, así que
// un check-out en el mapa se ve de inmediato en el dashboard y los reportes.
// Los datos de ejemplo se generan en semilla.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** Fecha hotelera (la misma del pie del sistema). */
export const HOY = '2026-10-06';

// ── Fechas ──────────────────────────────────────────────────────────────────
const d12 = (s: string) => new Date(s + 'T12:00:00');
export const isoDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const sumarDias = (s: string, n: number) => { const d = d12(s); d.setDate(d.getDate() + n); return isoDe(d); };
export const noches = (a: string, b: string) => Math.max(0, Math.round((d12(b).getTime() - d12(a).getTime()) / 86400000));
export const fmtF = (s?: string) => (s ? s.split('-').reverse().join('/') : '-');
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const fmtRango = (a: string, b: string) => {
  const [, ma, da] = a.split('-').map(Number); const [yb, mb, db] = b.split('-').map(Number);
  return ma === mb ? `${da} - ${db} ${MESES[mb - 1]} ${yb}` : `${da} ${MESES[ma - 1]} - ${db} ${MESES[mb - 1]} ${yb}`;
};
export const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const diaSemana = (s: string) => DIAS_CORTOS[d12(s).getDay()];

// ── Tipos ───────────────────────────────────────────────────────────────────
export type EstadoHab = 'libre' | 'ocupada' | 'bloqueada' | 'checkin' | 'checkinRL' | 'checkout';
export interface TipoHab { id: string; codigo: string; nombre: string; tarifa: number }
export interface Habitacion {
  numero: string; tipo: string; piso: number; estado: EstadoHab; sucia: boolean;
  motivoBloqueo: string; observaciones: string;
  /** Reserva alojada (ocupada / check-out) */
  reservaId: string | null;
  /** Ama de llaves: libre sin uso que no necesita limpieza (excluye de «Sucia» y «Limpia»). */
  noRequiere?: boolean;
  /** Discrepancia reportada por ama de llaves (p. ej. ocupada con 2 pax y el sistema dice 1). */
  discrepancia?: string;
  /** Observaciones internas de la camarera al limpiar. */
  obsLimpieza?: string;
  /** Camarera asignada hoy (Distribución de camareras). */
  camarera?: string;
  /** Último cambio de sábanas (fecha hotelera). */
  sabanas?: string;
  /** Cronómetro de limpieza de hoy: la camarera inicia, pausa y finaliza; `segundos` acumula lo trabajado. */
  limpieza?: Cronometro;
  /** Fotos / archivos adjuntos a la discrepancia. */
  adjuntos?: Adjunto[];
}
export interface Cronometro { estado: 'enCurso' | 'pausada' | 'finalizada'; camarera: string; inicio: string; fin?: string; segundos: number; desde: number | null; pausas: number }
export interface Adjunto { id: string; nombre: string; tipo: string; url: string; fecha: string }
/** Segundos trabajados en la limpieza (incluye el tramo en curso). */
export const segundosLimpieza = (c?: Cronometro, ahora = Date.now()) => (!c ? 0 : c.segundos + (c.estado === 'enCurso' && c.desde ? Math.floor((ahora - c.desde) / 1000) : 0));
export const fmtCrono = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
/** Bloqueo de habitación (Ama de llaves → Bloqueo de habitaciones). `hasta` vacío = indefinido. */
export interface BloqueoHab { id: string; habitacion: string; desde: string; hasta: string; motivo: string; usuario: string; creado: string; tareaId?: string }
export type EstadoLimpieza = 'sucia' | 'limpia' | 'noRequiere';
export const estadoLimpieza = (h: Habitacion): EstadoLimpieza => (h.sucia ? 'sucia' : h.noRequiere ? 'noRequiere' : 'limpia');
/** Camareras / mucamas activas (las mismas de Configuración → Alojamiento → Camareras / Mucamas). */
export const CAMARERAS = ['Ana Luisa Ramírez', 'Graciela Pérez', 'Rosa Elena Mora'];

export type EstadoReserva = 'Solicitada' | 'Confirmada' | 'Lista de espera' | 'In-House' | 'Completada' | 'No-Show' | 'Anulada';
export const ESTADOS_RESERVA: EstadoReserva[] = ['Solicitada', 'Confirmada', 'Lista de espera', 'In-House', 'Completada', 'No-Show', 'Anulada'];
/** Información comercial de la reserva (tab Detalles / «Otras informaciones»). */
export interface DetallesReserva { usuario: string; agente: string; referencia: string; referidor: string; origen: string; placa: string; consecutivo: string; vuelo: string; noEnviarEmail: boolean }
export interface Cuenta { id: string; nombre: string; saldo: number; consumos: number }
export interface Cargo { id: string; desde: string; hasta: string; cantidad: number; concepto: string; precio: number }
export interface HuespedAdicional { id: string; nombre: string; identificacion: string; nacionalidad: string; email: string }
export interface Reserva {
  id: string; numero: string; rooming: boolean; perfilId: string | null; nombre: string; empresa: string; cliente: 'Huésped Individual' | 'Tarifa Corporativa' | 'Agencia de Viajes';
  habitacion: string; tipo: string; entrada: string; salida: string; adultos: number; ninos: number;
  tarifa: string; precio: number; regimen: string; moneda: 'USD' | 'CRC'; estado: EstadoReserva;
  pagado: number; depGarantia: number; credito: boolean; condiciones: string[]; observaciones: string; observacionesInternas: string;
  nacionalidad: string; identificacion: string; email: string; telefono: string; vip: boolean;
  tarjetaLista: boolean; checkinEn: string | null; checkoutEn: string | null;
  cuentas: Cuenta[]; cargos: Cargo[]; adicionales: HuespedAdicional[]; descuento: number;
  /** Reservas de varias habitaciones: cada habitación es una línea con el mismo `grupo` (número RD-4400_1, RD-4400_2…). */
  grupo?: string; creada?: string; idExterno?: string; depRequerido?: number; detalles?: DetallesReserva;
  /** Reserva de varias habitaciones: «individual» (múltiple: cada habitación es su propia reserva y cuenta)
   *  o «grupo» (todo a una sola factura: folio de agencia con el hospedaje + una cuenta de consumo por habitación). */
  modalidad?: 'individual' | 'grupo';
  /** Individual múltiple: se decide en el check-in. true = una sola factura; false = factura separada por habitación. */
  facturaUnica?: boolean;
  anulacion?: { fecha: string; usuario: string; motivo: string };
}

export type TipoId = 'Cédula Física' | 'Cédula Jurídica' | 'DIMEX' | 'NITE' | 'Pasaporte';
export interface Direccion { pais: string; provincia: string; canton: string; distrito: string; barrio: string; cp: string; direccion: string }
export interface Perfil {
  id: string; tipo: 'cliente' | 'empresa'; tipoId: TipoId | ''; numeroId: string;
  nombre: string; nombreComercial: string; fechaNac: string; genero: '' | 'M' | 'F'; nacionalidad: string; profesion: string;
  email: string; telefono: string; telefono2: string; fax: string; dir: Direccion;
  fiscal: { emitir: boolean; misma: boolean; tipoId: TipoId | ''; numeroId: string; razon: string; email: string; telefono: string; actividad: string; mismaDir: boolean; dir: Direccion };
  extra: { credito: boolean; dias: string; maximo: string; cuenta: string; descuento: string; precioEspecial: string; red: string; moneda: string; idioma: string; observaciones: string; vip: boolean };
}

export const TIPOS_TAREA = ['Ama de llaves', 'Mantenimiento', 'Servicio al cliente', 'Spa', 'Transporte'] as const;
export type TipoTarea = (typeof TIPOS_TAREA)[number];
export const ESTADOS_TAREA = ['Pendiente', 'En proceso', 'Atrasado', 'Completado', 'Anulado'] as const;
export type EstadoTarea = (typeof ESTADOS_TAREA)[number];
export interface Bloqueo { habitaciones: string[]; inicio: string; fin: string; motivo: string }
export interface Recordatorio { enviarA: 'Responsable de la tarea' | 'Creador de la tarea' | 'Ambos'; canales: { sistema: boolean; email: boolean; whatsapp: boolean }; contactos: Record<string, { email: string; codigo: string; telefono: string }>; cuando: string }
export interface Tarea {
  id: string; tipo: TipoTarea; tarea: string; inicio: string; vencimiento: string; estado: EstadoTarea;
  responsable: string; creador: string; bloqueo: Bloqueo | null; recordatorio: Recordatorio | null;
  descripcion?: string;
  /** Anulación (solo tareas pendientes: una atrasada ya no se anula, se elimina). */
  anulacion?: { fecha: string; usuario: string; motivo: string };
  /** Bitácora de la tarea (creación, cambios de estado, bloqueo…). */
  historial?: { fecha: string; usuario: string; texto: string }[];
}
/** Tarea viva (cuenta para bloqueos, urgentes y pendientes): ni completada ni anulada. */
export const tareaAbierta = (t: { estado: EstadoTarea }) => t.estado !== 'Completado' && t.estado !== 'Anulado';

export interface Movimiento { hora: string; concepto: string; monto: number }
export interface Caja { id: string; nombre: string; estado: 'Abierta' | 'Precierre' | 'Cerrada'; apertura: string; cajero: string; fondo: number; movimientos: Movimiento[] }
export interface Alerta { id: string; modulo: string; texto: string; fecha: string; accion?: { label: string; href: string } }

export const USUARIOS = ['Juan Pérez', 'Carlos Rayo', 'Ernesto Ríos', 'Daniel Viera', 'Fabián Araya', 'Luis Duarte', 'María Laura Céspedes Morales', 'Carlos Morales'];
export const USUARIO_ACTUAL = 'Juan Pérez';
export const NACIONALIDADES: Record<string, string> = {
  CRI: 'Costa Rica', USA: 'Estados Unidos', ALE: 'Alemania', CAN: 'Canadá', FRA: 'Francia', ESP: 'España', MEX: 'México', ITA: 'Italia', JPN: 'Japón', ARG: 'Argentina',
};
export const REGIMENES: Record<string, string> = { SP: 'Solo alojamiento', '1.BB': 'Desayuno', DESI: 'Desayuno incluido', MP: 'Media pensión', TI: 'Todo incluido' };
export const CONDICIONES = ['Alérgico', 'Diabético', 'Hipertenso', 'Celiaco', 'Asma', 'Cardiopatía', 'Arritmia', 'Insuficiencia cardíaca', 'Diabetes tipo 2', 'Colesterol alto', 'Obesidad'];
export const CONCEPTOS_CARGO = ['Desayuno buffet', 'Parqueo', 'Minibar', 'Lavandería', 'Spa', 'Tour volcán', 'Transporte aeropuerto'];

/** Contratos/canales con su aporte (top del dashboard financiero). */
export const CONTRATOS = [
  { nombre: 'Booking.com', tipo: 'OTA', color: '#7C5CDB' },
  { nombre: 'Corp. Guachipelín', tipo: 'Corporativo', color: '#5C77C4' },
  { nombre: 'Expedia Group', tipo: 'OTA', color: '#1A306E' },
  { nombre: 'Despegar.com', tipo: 'Tour Operador', color: '#26A69A' },
  { nombre: 'Hotelbeds', tipo: 'OTA', color: '#D97706' },
  { nombre: 'Directo', tipo: 'Directo', color: '#9E9E9E' },
];

// ── Geografía (cascada de Dirección de contacto) ────────────────────────────
export const PAISES = ['Costa Rica', 'Estados Unidos', 'Canadá', 'México', 'Panamá', 'España', 'Alemania', 'Francia'];
export const GEO_CR: Record<string, Record<string, string[]>> = {
  'San José': { 'San José': ['Carmen', 'Merced', 'Hospital', 'Catedral'], 'Escazú': ['Escazú', 'San Antonio', 'San Rafael'], 'Santa Ana': ['Santa Ana', 'Pozos', 'Uruca'] },
  'Alajuela': { 'Alajuela': ['Alajuela', 'San José', 'Desamparados'], 'San Ramón': ['San Ramón', 'San Juan', 'Santiago', 'Piedades Norte'], 'Grecia': ['Grecia', 'San Isidro', 'Tacares'] },
  'Cartago': { 'Cartago': ['Oriental', 'Occidental', 'Carmen'], 'La Unión': ['Tres Ríos', 'San Diego', 'Concepción'] },
  'Heredia': { 'Heredia': ['Heredia', 'Mercedes', 'San Francisco'], 'Belén': ['San Antonio', 'La Ribera', 'La Asunción'] },
  'Guanacaste': { 'Liberia': ['Liberia', 'Cañas Dulces'], 'Santa Cruz': ['Santa Cruz', 'Tamarindo', 'Cartagena'] },
  'Puntarenas': { 'Puntarenas': ['Puntarenas', 'Chacarita'], 'Garabito': ['Jacó', 'Tárcoles'] },
  'Limón': { 'Limón': ['Limón', 'Valle La Estrella'], 'Talamanca': ['Bratsi', 'Cahuita'] },
};
export const ACTIVIDADES = ['5510.0 · Hoteles', '7601.1 · Agencias de viajes', '6201.0 · Desarrollo de software', '4711.0 · Comercio al por menor', '8299.0 · Otros servicios'];

// ── Reglas de identificación ──────────────────────────────
export const REGLAS_ID: Record<TipoId, { formato: string; validar: (v: string) => boolean; msg: string }> = {
  'Cédula Física': { formato: '1-1234-1234', validar: v => /^\d{9}$/.test(v.replace(/-/g, '')), msg: 'Debe tener 9 dígitos (solo números).' },
  'Cédula Jurídica': { formato: '3-101-123456', validar: v => /^\d{10}$/.test(v.replace(/-/g, '')), msg: 'Debe tener 10 dígitos.' },
  'DIMEX': { formato: '12 dígitos', validar: v => /^\d{12}$/.test(v.replace(/-/g, '')), msg: 'Debe tener 12 dígitos.' },
  'NITE': { formato: '10 dígitos', validar: v => /^\d{10}$/.test(v.replace(/-/g, '')), msg: 'Debe tener 10 dígitos.' },
  'Pasaporte': { formato: 'Alfanumérico, máx. 20', validar: v => /^[A-Za-z0-9]{1,20}$/.test(v), msg: 'Alfanumérico, máximo 20 caracteres.' },
};
export const formatearId = (tipo: TipoId | '', v: string) => {
  const n = v.replace(/\D/g, '');
  if (tipo === 'Cédula Física' && n.length === 9) return `${n[0]}-${n.slice(1, 5)}-${n.slice(5)}`;
  if (tipo === 'Cédula Jurídica' && n.length === 10) return `${n[0]}-${n.slice(1, 4)}-${n.slice(4)}`;
  return v;
};

export const dirVacia = (): Direccion => ({ pais: '', provincia: '', canton: '', distrito: '', barrio: '', cp: '', direccion: '' });
export const perfilVacio = (tipo: 'cliente' | 'empresa' = 'cliente'): Perfil => ({
  id: '', tipo, tipoId: tipo === 'empresa' ? 'Cédula Jurídica' : '', numeroId: '', nombre: '', nombreComercial: '', fechaNac: '', genero: '', nacionalidad: '', profesion: '',
  email: '', telefono: '', telefono2: '', fax: '', dir: dirVacia(),
  fiscal: { emitir: false, misma: true, tipoId: '', numeroId: '', razon: '', email: '', telefono: '', actividad: '', mismaDir: true, dir: dirVacia() },
  extra: { credito: false, dias: '', maximo: '', cuenta: '', descuento: '', precioEspecial: '', red: '', moneda: '', idioma: '', observaciones: '', vip: false },
});

// ── Semilla ─────────────────────────────────────────────────────────────────
export function prng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

export const TARIFAS: { nombre: string; contrato: string; cliente: Reserva['cliente']; empresa: string }[] = [
  { nombre: 'BOOKING', contrato: 'Booking.com', cliente: 'Agencia de Viajes', empresa: 'Booking.com' },
  { nombre: 'DIR', contrato: 'Directo', cliente: 'Huésped Individual', empresa: '' },
  { nombre: 'CORP', contrato: 'Corp. Guachipelín', cliente: 'Tarifa Corporativa', empresa: 'Corp. Guachipelín' },
  { nombre: 'EXPEDIA', contrato: 'Expedia Group', cliente: 'Agencia de Viajes', empresa: 'Expedia Group' },
  { nombre: 'DESPEGAR', contrato: 'Despegar.com', cliente: 'Agencia de Viajes', empresa: 'Despegar.com' },
  { nombre: 'HOTELBEDS', contrato: 'Hotelbeds', cliente: 'Agencia de Viajes', empresa: 'Hotelbeds' },
];
export const contratoDeTarifa = (t: string) => TARIFAS.find(x => x.nombre === t)?.contrato ?? 'Directo';
export const TARIFAS_NOMBRES = TARIFAS.map(t => t.nombre);

export const TIPOS: TipoHab[] = [
  { id: 'STD', codigo: 'STD', nombre: 'Estándar', tarifa: 120 },
  { id: 'SUP', codigo: 'SUP', nombre: 'Superior 2 camas', tarifa: 160 },
  { id: 'DLX', codigo: 'DLX', nombre: 'Deluxe', tarifa: 210 },
  { id: 'FAM', codigo: 'FAM', nombre: 'Familiar', tarifa: 250 },
  { id: 'JRS', codigo: 'JRS', nombre: 'Junior Suite', tarifa: 320 },
];

/** Estado guardado en el store: operación + facturación (finanzas.ts) + reservaciones (reservas.ts). */
export interface DatosOperacion { habitaciones: Habitacion[]; reservas: Reserva[]; perfiles: Perfil[]; tareas: Tarea[]; alertas: Alerta[]; bloqueos: BloqueoHab[] }
export type EstadoHotel = DatosOperacion & import('./finanzas').Finanzas & import('./reservas').DatosReservas & import('./auditoria').DatosAuditoria;
/** Lo que expone useHotel(): el estado más las cajas derivadas de los turnos abiertos. */
export type DatosHotel = EstadoHotel & { cajas: Caja[] };
