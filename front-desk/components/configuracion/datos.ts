// ─────────────────────────────────────────────────────────────────────────────
// Tipos y catálogos fijos de Configuración. Los valores iniciales (datos de
// ejemplo) están en inicial.ts; las pantallas solo dependen de estos tipos.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConId { id: string }

// ── Opciones compartidas ────────────────────────────────────────────────────
export const MONEDAS_OPC = ['USD - Dólar Americano', 'CRC - Colón Costarricense'];
export const CUENTAS_OPC = [
  '80301010 (0103) - [001] - Ventas de alimentos - IO- Alimentos',
  '80301020 (0103) - [001] - Ventas de bebidas - IO- Bebidas',
  '80302010 (0104) - [001] - Ingresos por hospedaje',
  '11020101 (0001) - [001] - Caja general',
  '21050101 (0201) - [001] - Depósitos de clientes',
];
export const CENTROS_COSTO = ['0107 - IO- Otros servicios', '0101 - IO- Hospedaje', '0103 - IO- Alimentos y bebidas'];
export const IDIOMAS = ['Español', 'Inglés', 'Portugués', 'Francés', 'Alemán', 'Italiano', 'Árabe', 'Albanés'];
export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

// ── Empresa ─────────────────────────────────────────────────────────────────
export const GENERAL = {
  nombre: 'Hotel Seven Suite', razonSocial: 'Seven Hospitality S.A.', cedula: '3-101-XXXXXX', pais: 'Costa Rica',
  moneda: 'COL – Colón', idioma: 'Español', telefono: '+506 2777-0000', correo: 'info@hotelsevensuit.com',
  web: 'www.hotelsevensuit.com', direccion: 'Jacó, Puntarenas',
  actividad: '551001 - Hoteles, moteles y otros alojamientos',
  // Los consecutivos de Reservas, Registro, Cargos, Factura externo y Rooming pasaron a Empresa › Consecutivos de documentos.
  operacion: { internoTCP: '5', maxCargosDivisa: '4', formaVenta: 'Server POS' },
  impresionFacturas: { copias: '2', lineas: '10' },
  cuentasContables: { cargoDivisa: '550101 – (001)', noCheques: '550101 – (001)' },
  opcionesParametros: {
    'Imprimir recibo / reserva': true, 'Combinar hab. Limpia / Sucia': false, 'Mostrar hab. fuera de orden como sucia': false,
    'Cálculo precio medio': true, 'Asignar habitaciones automáticamente': false, 'Permitir desbloquear habitaciones': true,
    'Código único ProfCard': false, 'Activar NTP (Seven Cloud Printing)': false,
  } as Record<string, boolean>,
  lineasTelefonicas: { conceptoCargo: '', conceptoProduccion: '' },
  cambioHabitacion: { conceptoCargo: '', tipoColon: '' },
  opcionesFolios: {
    'Recibo en carga de moneda': false, 'Recibo en depósitos en garantía': true, 'Impresión directa de facturas': false,
    'Cambio de recibo a factura': false, 'Número de factura externo': false, 'Cheques con factura agencia': false,
  } as Record<string, boolean>,
  contabilidad: { sistema: 'Seven Accounting', inventario: 'PEPS', libro: '' },
  opcionesContables: {
    'No contabilizar producción diariamente': true, 'Contabilización de documentos': false, 'Balance de vías automático': true,
    'Integración automática de asientos': true, 'Producción a repuestos detallados': false,
  } as Record<string, boolean>,
  alertas: {
    'Operaciones sobre folios': 'info@hocheguaran.forest.com', 'Reservas': 'info@hocheguaran.forest.com',
    'Operaciones de agencias': 'info@hocheguaran.forest.com', 'Niveles de saldos / créditos': 'info@hocheguaran.forest.com',
    'Cancelación folios y recibos': 'info@hocheguaran.forest.com',
  } as Record<string, string>,
  reservasCheckin: {
    'Uso solo líneas en tarjetas de registro': false, 'Uso solo líneas – registro de reservas': false, 'Tiempo sucursal (Stop Over)': false,
    'Permitir reservas agencias automáticamente': false, 'Solicitar moderador': false, 'Asignar habitaciones automáticamente': true,
    'Plataforma aut. reservas agen. al check-in': false, 'Verificar tarjeta al realizar check-in': true, 'Permitir desbloquear habitaciones': false,
    'Confirmación automática de reserva con OE': false, 'Mostrar habitaciones en facturas de agencia': false,
  } as Record<string, boolean>,
  integraciones: {
    'Activar WebCheckin': true, 'Activar NTP (Seven Cloud Printing)': false, 'Portada OTA / MPos': false,
    'Activar disponibilidad compartida': false, 'Activar AntiBot HubSpot': false, 'Activar GRSA (depósitos en garantía)': false,
  } as Record<string, boolean>,
  horarios: { checkin: '14:00', checkout: '11:00', diasGarantia: '630', diasAdelantos: '3600' },
  condiciones: ['Alérgico', 'Diabético', 'Hipertenso', 'Celiaco', 'Asma', 'Cardiopatía', 'Arritmia', 'Insuficiencia cardíaca',
    'Infarto agudo de miocardio', 'Accidente cerebrovascular', 'Diabetes tipo 2', 'Hipertensión arterial', 'Colesterol alto', 'Obesidad'],
  condicionesActivas: ['Alérgico', 'Celiaco', 'Diabetes tipo 2', 'Colesterol alto'],
  politicas: `RESERVATION POLICIES
CONFIRMATION: No Shows or Early Departures: If for any reason a pre-paid reservation is a NO SHOW or chooses to leave PRIOR to their specified departure date, NO REFUND will apply.
Cancellations: A 92% refund will apply to any reservation cancelled prior to 31 days (8% processing fee), from 30 to 15 days prior a 50% penalty, less than 15 days prior 100% penalty will apply. For Easter week - Christmas & New Years 61 days prior will have 25% penalty, 60-31 will have 50% penalty, 30 days or less will have 100% penalty.
Payment Schedules: All reservations require payment in full prior to guest's arrival: 50% deposit at the time of booking and the remaining 50% will be charged 30 days prior.`,
};

export interface CuentaCorreo extends ConId {
  correo: string; titulo: string; descripcion: string; servidor: string; remitente: string; usuario: string; contrasena: string; puerto: string; firma: string;
  ssl: boolean; auth: boolean; oauth: boolean; cuenta: string; clienteId: string; secreto: string;
  responderA: string; copiarA: string; asunto: string; cuerpo: string; asuntoReserva: string;
}
export interface CorreoEspecial extends ConId { nombre: string; disparador: string; activo: boolean; remitente: string; responderA: string; copiarA: string; asunto: string; cuerpo: string }
export interface CorreoEnviado extends ConId { correo: string; remitente: string; mensaje: string; fecha: string; estado: 'Enviado' | 'Fallido' }

export interface Impresora extends ConId { nombre: string; ubicacion: string; tipo: string; papel: string; activa: boolean }

// ── Empresa: documentos e impresión (misma estructura que Accounting) ───────
export type Reinicio = 'Nunca' | 'Anual' | 'Mensual';
/** Formato con texto fijo + {AAAA} (año), {MM} (mes) y {N:k} (consecutivo con k dígitos). */
export interface Consecutivo extends ConId { tipo: string; formato: string; reinicio: Reinicio; emitidos: number }
export interface TipoDocumento extends ConId { codigo: string; nombre: string; enUso: boolean }
/** Impresora por tipo de documento: id de la impresora, '' = predeterminada del sistema, 'no' = no se imprime. */
export interface AsignacionImpresora { tipo: string; impresora: string }

// ── Parámetros generales: monedas y tipo de cambio ──────────────────
/** Tasa en moneda principal por 1 unidad de la divisa (₡ por $, ₡ por €). */
export interface TipoCambio extends ConId { fecha: string; moneda: string; tasa: number; fuente: 'Manual' | 'Importación' }


// ── Alojamiento ─────────────────────────────────────────────────────────────
export interface Habitacion extends ConId {
  codigo: string; tipo: string; servicio: string; caracteristicas: string[]; centroCosto: string; adultos: number; ninos: number; pax: number; color: string;
}
export interface GrupoDisp extends ConId { nombre: string; orden: number; habitaciones: string[] }
export interface Regimen extends ConId { codigo: string; descripcion: string; concepto: string; tipo: string; moneda: string; precio: number }

// ── Tarifas / Contratos ─────────────────────────────────────────────────────
export interface Empresa extends ConId { descripcion: string; directo: boolean; color: string }
export interface Mercado extends ConId { descripcion: string }
export interface Agente extends ConId { nombre: string; telefono: string; celular: string; correo: string }
export interface Referidor extends ConId { descripcion: string }
export interface Contrato extends ConId { nombre: string; empresa: string; mercado: string; desde: string; hasta: string; cupos: number; release: number; tarifa: string; activo: boolean }

/** `base` = personas incluidas en el precio; `max` = capacidad máxima (define cuántos pax adicionales admite). */
export interface TipoHab extends ConId { nombre: string; codigo: string; base?: number; max?: number }
export interface Tarifa extends ConId {
  nombre: string; activo: boolean; moneda: string;
  /** Precio base por tipo de habitación (tarifas «nuevas») */
  base: Record<string, number | null>;
  /** Si deriva de otra tarifa, el precio se calcula: padre × (1 + %/100) + importe */
  derivaDe: string | null; metodo: 'Porcentaje' | 'Importe'; ajusteImporte: number; ajustePct: number;
  /** Pax adicionales: `modo` «base» = mismo precio por cada adicional (adulto / niño);
   *  «escalones» = precio por escalón (adicional 1 = base + 1 personas, adicional 2 = base + 2…). */
  extras: { derivar: boolean; tipo: 'Importe' | 'Porcentaje'; importe: number; pct: number; adulto: number; nino: number; modo?: 'base' | 'escalones'; escalones?: { adulto: number; nino: number }[] };
  restricciones: { estMin: number; estMax: number };
}
export const VISTAS_TARIFARIO = ['Tarifas', 'Cerrar ventas', 'CTA', 'CTD', 'Estancia Min', 'Estancia Max', 'Adulto Extra', 'Niño Extra'] as const;
export type VistaTarifario = (typeof VISTAS_TARIFARIO)[number];
export const TERMINOS: Record<VistaTarifario, string> = {
  'Tarifas': 'Precio por noche por contrato',
  'Cerrar ventas': 'Bloquear disponibilidad',
  'CTA': 'Closed to Arrival: no se permite la entrada ese día',
  'CTD': 'Closed to Departure: no se permite la salida ese día',
  'Estancia Min': 'Noches mínimas requeridas',
  'Estancia Max': 'Noches máximas permitidas',
  'Adulto Extra': 'Cargo por adulto adicional',
  'Niño Extra': 'Cargo por niño adicional',
};

// ── Facturación ─────────────────────────────────────────────────────────────
export interface MonedaCuenta { id: string; moneda: string; ctaProduccion: string; ctaCasa: string }
export interface Concepto extends ConId { descripcion: string; activo: boolean; agrupadoEn: string; codigoTributario: string; monedas: MonedaCuenta[] }
export interface GrupoProd extends ConId { nombre: string; conceptos: Concepto[] }

export interface PrecioMoneda { id: string; moneda: string; precio: number }
export interface ServFacturacion extends ConId { nombre: string; codigo: string; concepto: string; precios: PrecioMoneda[]; impuestos: string[]; descuentos: string[] }
export interface ServAgencia extends ConId { codigo: string; nombre: string; uso: string; regimen: string; tipo: string; impuestos: string[] }
export interface ServSimple extends ConId { codigo: string; descripcion: string; tipo: string; concepto: string; modo: 'Precio' | 'Porcentaje'; moneda: string; precio: number; porcentaje: number }
export interface TipoCobro extends ConId {
  codigo: string; descripcion: string; moneda: string; tipo: string; detallado: boolean; ctaFija: boolean;
  digitosTC: string; comision: number; terminal: string; cuenta: string; cuentaPropinas: string;
}
export interface Impuesto extends ConId { descripcion: string; porcentaje: number; nivel: number; moneda: string; cuenta: string; canje: boolean; apSup: boolean }
export interface Exoneracion extends ConId { descripcion: string }
export interface Descuento extends ConId { descripcion: string; porcentaje: number; moneda: string; tipo: string; cuenta: string; contrasena: string; visible: boolean }
export interface FolioExterno extends ConId {
  codigo: string; descripcion: string; ctaCasa: boolean; canje: boolean; inactFact: boolean; moneda: string; proxTarj: number; limite: number;
  descuento: string; cuenta: string; impuesto: string;
}

// ── Operaciones / Ama de llaves ─────────────────────────────────────────────
export interface TipoTarea extends ConId { descripcion: string }
export interface Moneda extends ConId {
  codigo: string; descripcion: string; simbolo: string; comision: number; decimales: number; convertible: boolean; facturable: boolean; referencia: boolean;
  activo: boolean; empresa: string; depAdelantados: string; pagoParcial: string;
}
export interface Nacionalidad extends ConId { codigo: string; pais: string; idioma: string; activo: boolean }
export interface Camarera extends ConId { nombre: string; activo: boolean }
export interface Rango extends ConId { codigo: string; descripcion: string; habitaciones: string[]; activo: boolean }
export const NUMEROS_HAB = Array.from({ length: 40 }, (_, i) => String(201 + i));

// ── Caja / Cierre / Integraciones / Sistema ─────────────────────────────────
export interface Denominacion { id: string; moneda: 'USD' | 'CRC'; valor: number; cantidad: number }
export interface ReporteAuditoria extends ConId { activa: boolean; descripcion: string; codigo: string; orden: number; sistema1: boolean; sistema2: boolean; obligatoria: boolean; reporte: boolean }
export interface CondicionWCI { id: string; texto: string }
export interface ErrorSync extends ConId { fecha: string; descripcion: string; leido: boolean }
