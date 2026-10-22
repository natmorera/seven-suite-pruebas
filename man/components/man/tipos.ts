// Tipos del MAN (Management): lo que comparte toda la suite. Los valores iniciales están en inicial.ts.

interface ConId { id: string }
/** ACC, DICR y ACC_DICR son el mismo producto en tres modos: una empresa tiene solo uno. */
export type ModuloId = 'ACC' | 'DICR' | 'ACC_DICR' | 'FDK' | 'POS' | 'TO' | 'INV' | 'PAY' | 'DSS' | 'ANA' | 'MAN';
export type EstadoConexion = 'Sin probar' | 'Conectada' | 'Error';

// ── Empresa ─────────────────────────────────────────────────────────────────
export interface Empresa {
  nombreLegal: string; nombreComercial: string; tipoId: string; numeroId: string; pais: string; zonaHoraria: string;
  direccion: string; telefono: string; correo: string; web: string;
}

// ── Usuarios ────────────────────────────────────────────────────────────────
/** Módulo al que entra el usuario y el rol que tiene allí (el rol se asigna dentro del módulo). */
export interface Acceso { modulo: ModuloId; rol: string }
export interface Usuario extends ConId {
  numero: number; usuario: string; nombre: string; correo: string; activo: boolean; admin: boolean;
  /** Debe cambiar la contraseña en el próximo ingreso. */
  cambiarClave: boolean;
  ultimoAcceso: string; accesos: Acceso[];
}
export interface EventoBitacora extends ConId { fecha: string; usuario: string; modulo: ModuloId; aplicacion: string; opcion: string; base: string; detalle: string; ip: string }

// ── Parámetros generales ────────────────────────────────────────────────────
/** Lo que cada módulo usa de una moneda (empresa contable y servicios de depósito). */
export interface UsoModulo { empresa: string; depAdelantados: string; pagoParcial: string }
export interface Moneda extends ConId {
  codigo: string; descripcion: string; simbolo: string; principal: boolean; activo: boolean;
  comision: number; decimales: number; convertible: boolean; facturable: boolean;
  porModulo: Partial<Record<'FDK' | 'POS' | 'TO', UsoModulo>>;
}
/** Tasa en moneda principal por 1 unidad de la divisa. */
export interface TipoCambio extends ConId { fecha: string; moneda: string; tasa: number; fuente: 'Manual' | 'Importación' }
export interface Nacionalidad extends ConId { codigo: string; pais: string; idioma: string; activo: boolean }
export interface Impuesto extends ConId { descripcion: string; porcentaje: number; nivel: number; cuenta: string; monedas: string[]; canje: boolean; apSup: boolean; activo: boolean }

// ── Módulos ─────────────────────────────────────────────────────────────────
/** Módulo del catálogo tal como lo tiene la empresa. */
export interface Modulo extends ConId { codigo: ModuloId; contratado: boolean; activo: boolean; url: string }
/** Credenciales con las que el MAN se conecta a la API de un módulo y lo que trajo de él. */
export interface ConexionModulo extends ConId {
  modulo: ModuloId; apiKey: string; estado: EstadoConexion; ultimaPrueba: string;
  ultimaSync: string; perfilesSync: number;
  /** Se decidió no traer perfiles del módulo por ahora. */
  perfilesOmitido?: boolean;
  /** Fecha en que se verificó que la integración completa funciona. */
  verificada?: string;
}
export interface Enlace extends ConId {
  origen: ModuloId; destino: ModuloId; ultimaSync: string; estado: 'Al día' | 'Con error' | 'Nunca'; activo: boolean;
  /** Marcado en la integración pero todavía sin verificar y guardar: no aparece en Enlaces. */
  pendiente?: boolean;
  /** Registros nuevos en el origen que todavía no pasan al destino. */
  nuevos?: number;
}
export interface BaseDatos extends ConId {
  modulo: ModuloId; descripcion: string; base: string; origen: string; usuario: string; contrasena: string; servidor: string; version: string; estado: EstadoConexion;
  /** Fecha del sistema con la que trabaja la base (se cambia desde el MAN). */
  fechaSistema?: string;
}
export interface Entidad extends ConId { descripcion: string; bitacora: boolean; frontPrincipal: string; activo: boolean; bases: BaseDatos[] }

// ── Perfiles ────────────────────────────────────────────────────────────────
/** Cliente es el mismo perfil en Accounting y en Front Desk. */
export type RolPerfil = 'Cliente' | 'Proveedor' | 'Receptor' | 'Empresa';
/** Lo que usa cada módulo de un perfil según su rol. */
export interface DatosCliente { condicion: 'Contado' | 'Crédito'; plazo: number; limite: number; moneda: string }
export interface DatosProveedor { plazo: number; moneda: string; categoria: string; cuenta: string }
export interface DatosReceptor { correoComprobantes: string; actividad: string; provincia: string; exonerado: boolean }
export interface DatosEmpresa { tipo: 'Agencia' | 'Corporativo' | 'OTA' | 'Mayorista'; tarifa: string; credito: boolean; comision: number }
export interface Perfil extends ConId {
  tipoId: string; identificacion: string; nombre: string; correo: string; telefono: string; pais: string;
  roles: RolPerfil[];
  /** Módulos que usan este perfil (de donde se sincronizó o donde se usa). */
  modulos: ModuloId[];
  activo: boolean;
  cliente?: DatosCliente; proveedor?: DatosProveedor; receptor?: DatosReceptor; empresa?: DatosEmpresa;
}

// ── Estructura ──────────────────────────────────────────────────────────────
export interface Terminal extends ConId { numero: number; nombre: string; tipo: 'Estación' | 'Servidor' | 'Web'; ubicacion: string; ultimaConexion: string; activo: boolean }
export type ModoServicio = 'Automático' | 'Manual';
interface AsignacionServicio { servicio: string; modo: ModoServicio }
export interface Servidor extends ConId { descripcion: string; terminal: string; puerto: number; activo: boolean; servicios: AsignacionServicio[] }
/** Servicio de un módulo sobre una base de datos (envío a Hacienda, sincronizaciones, integración contable…). */
export interface Servicio extends ConId {
  nombre: string; modulo: ModuloId; base: string; frecuencia: string; ultimaEjecucion: string; estado: 'Correcto' | 'Con error' | 'Sin ejecutar'; mensaje: string; activo: boolean;
}
export interface TerminalPinPad extends ConId {
  nombre: string; descripcion: string; importeMax: number; terminal: string; api: string; contrasena: string; impresora: string; estado: EstadoConexion;
}
export interface ProveedorPinPad extends ConId { codigo: string; descripcion: string; activo: boolean; terminales: TerminalPinPad[] }
export interface Impresora extends ConId { nombre: string; modulos: ModuloId[]; activa: boolean }
/** Clase de documento para efectos de impresión. Sin módulo es general (lo usan todos). */
export interface TipoDocumento extends ConId { codigo: string; nombre: string; modulo: ModuloId | ''; activo: boolean }

// ── Integración contable ────────────────────────────────────────────────────
/** Cómo pasan a Accounting la producción, los cobros y los cierres de un módulo (por ahora, Front Desk). */
export interface IntegracionContable {
  sistema: string; inventario: '' | 'PEPS' | 'UEPS' | 'Promedio'; libro: string;
  noContabilizarDiario: boolean; contabilizarDocumentos: boolean; balanceVias: boolean; integracionAsientos: boolean; produccionRepuestos: boolean;
  cuentaCargoDivisa: string; cuentaNoCheques: string;
  alertas: { folios: string; reservas: string; agencias: string; saldos: string; cancelaciones: string };
}
