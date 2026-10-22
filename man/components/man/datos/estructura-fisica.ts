// Datos de ejemplo: terminales, servicios, servidores, impresoras, tipos de documento y PinPad.
import type { Impresora, ModuloId, ProveedorPinPad, Servicio, Servidor, Terminal, TipoDocumento } from '../tipos';

export const terminales: Terminal[] = ([
  [1, '10.0.0.6', 'Servidor', 'Cuarto de servidores'], [4, '10.0.0.4', 'Estación', 'Recepción'], [5, '10.0.0.5', 'Estación', 'Caja'],
  [6, 'SevenWEB', 'Web', 'Nube'], [7, 'SevenSQL', 'Servidor', 'Cuarto de servidores'], [8, 'DESKTOP-2E2ELVQ', 'Estación', 'Restaurante'],
  [9, '190.211.102.122', 'Web', 'Acceso remoto'], [10, 'SERVER', 'Servidor', 'Cuarto de servidores'], [11, 'DESKTOP-0QF8D1F', 'Estación', 'Contabilidad'],
  [12, 'DESKTOP-OFOBJRT', 'Estación', 'Bar'], [13, 'DESKTOP-UR5R400', 'Estación', 'Ama de llaves'],
] as [number, string, Terminal['tipo'], string][]).map(([numero, nombre, tipo, ubicacion], i) => ({ id: 't' + numero, numero, nombre, tipo, ubicacion, ultimaConexion: `2026-10-${String(14 - (i % 3)).padStart(2, '0')}T08:${String(10 + i * 3).padStart(2, '0')}`, activo: true }));

export const servicios: Servicio[] = [
  { id: 'sv1', nombre: 'Envío de comprobantes a Hacienda', modulo: 'ACC_DICR', base: 'CGA_SevenDICR', frecuencia: 'Cada 5 minutos', ultimaEjecucion: '2026-10-14T09:25', estado: 'Correcto', mensaje: '', activo: true },
  { id: 'sv2', nombre: 'Integración de inventario', modulo: 'INV', base: 'CGA_SevenInv', frecuencia: 'Cada 15 minutos', ultimaEjecucion: '2026-10-14T09:15', estado: 'Con error', mensaje: 'La bodega 03 no tiene cuenta contable asignada.', activo: true },
  { id: 'sv3', nombre: 'Cálculo de indicadores', modulo: 'DSS', base: 'CGA_SevenDSS', frecuencia: 'Diario 02:00', ultimaEjecucion: '2026-10-14T02:00', estado: 'Correcto', mensaje: '', activo: true },
  { id: 'sv4', nombre: 'Integración contable', modulo: 'ACC_DICR', base: 'CGA_SevenAcc', frecuencia: 'Diario 02:00', ultimaEjecucion: '2026-10-14T02:00', estado: 'Correcto', mensaje: '', activo: true },
  { id: 'sv5', nombre: 'Auditoría nocturna', modulo: 'FDK', base: 'CGA_SevenFront', frecuencia: 'A pedido', ultimaEjecucion: '2026-10-14T00:30', estado: 'Correcto', mensaje: '', activo: true },
  { id: 'sv6', nombre: 'Envío de correos', modulo: 'FDK', base: 'CGA_SevenFront', frecuencia: 'Cada minuto', ultimaEjecucion: '2026-10-14T09:29', estado: 'Correcto', mensaje: '', activo: true },
  { id: 'sv7', nombre: 'Respaldo de bases de datos', modulo: 'MAN', base: 'CGA_SevenMan', frecuencia: 'Diario 03:00', ultimaEjecucion: '2026-10-14T03:00', estado: 'Correcto', mensaje: '', activo: true },
];

export const servidores: Servidor[] = [
  { id: 's1', descripcion: 'Servidor de aplicaciones', terminal: 't1', puerto: 1001, activo: true,
    servicios: [{ servicio: 'sv1', modo: 'Automático' }, { servicio: 'sv2', modo: 'Automático' }, { servicio: 'sv3', modo: 'Automático' }, { servicio: 'sv4', modo: 'Automático' }, { servicio: 'sv5', modo: 'Manual' }, { servicio: 'sv6', modo: 'Automático' }] },
  { id: 's2', descripcion: 'Servidor de base de datos', terminal: 't7', puerto: 1433, activo: true, servicios: [{ servicio: 'sv7', modo: 'Automático' }] },
];

export const impresoras: Impresora[] = [
  { id: 'i1', nombre: 'Contabilidad', modulos: ['ACC_DICR', 'PAY'], activa: true },
  { id: 'i2', nombre: 'Tiquetes de caja', modulos: ['FDK', 'POS'], activa: true },
  { id: 'i3', nombre: 'Imp POS 80-C', modulos: ['POS'], activa: true },
  { id: 'i4', nombre: 'Recepción P90-C30 2020 (POS Canon 91)', modulos: ['FDK'], activa: true },
  { id: 'i5', nombre: 'Bodega central', modulos: ['INV'], activa: false },
];

export const tiposDocumento: TipoDocumento[] = ([
  ['REPORTE', 'Reporte', ''], ['CORREO', 'Comprobante enviado por correo', ''],
  ['ASIENTO', 'Asiento', 'ACC_DICR'], ['CHECK', 'Cheque', 'ACC_DICR'], ['JOURNAL_VOUCHER', 'Comprobante de asiento', 'ACC_DICR'], ['FACTURA', 'Factura electrónica', 'ACC_DICR'],
  ['FOLIO', 'Folio del huésped', 'FDK'], ['REGISTRO', 'Tarjeta de registro', 'FDK'], ['CONFIRMACION', 'Confirmación de reserva', 'FDK'], ['RECIBO', 'Recibo de pago', 'FDK'],
  ['COMANDA', 'Comanda de cocina', 'POS'], ['PRECUENTA', 'Precuenta', 'POS'], ['TIQUETE', 'Tiquete de venta', 'POS'],
  ['REQUISICION', 'Requisición', 'INV'], ['TRASLADO', 'Traslado entre bodegas', 'INV'], ['COLILLA', 'Colilla de pago', 'PAY'],
] as [string, string, ModuloId | ''][]).map(([codigo, nombre, modulo], i) => ({ id: 'td' + i, codigo, nombre, modulo, activo: true }));

export const pinpad: ProveedorPinPad[] = [
  { id: 'pp1', codigo: '01', descripcion: 'Credomatic', activo: true, terminales: [
    { id: 'tp1', nombre: 'BAC-REC-01', descripcion: 'Recepción', importeMax: 50000, terminal: '00412345', api: 'https://pinpad.credomatic.com/api', contrasena: '••••••', impresora: 'i2', estado: 'Sin probar' },
    { id: 'tp2', nombre: 'BAC-RES-01', descripcion: 'Restaurante', importeMax: 30000, terminal: '00412346', api: 'https://pinpad.credomatic.com/api', contrasena: '••••••', impresora: 'i3', estado: 'Sin probar' },
  ] },
  { id: 'pp2', codigo: '02', descripcion: 'BCR', activo: false, terminales: [] },
];
