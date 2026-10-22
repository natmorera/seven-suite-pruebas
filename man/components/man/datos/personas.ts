// Datos de ejemplo: usuarios de la suite y perfiles (clientes, proveedores, receptores y empresas).
import type { ModuloId, Perfil, RolPerfil, Usuario } from '../tipos';

export const usuarios: Usuario[] = ([
  [1, 'admin', 'Superusuario', true, [['FDK', 'Administrador'], ['ACC_DICR', 'Administrador'], ['POS', 'Administrador'], ['MAN', 'Administrador']]],
  [1037, 'jhidalgo', 'Johnny Hidalgo', false, [['FDK', 'Administrador'], ['ACC_DICR', 'Gerente'], ['DSS', 'Gerente'], ['MAN', 'Administrador']]],
  [1091, 'jmeneces', 'Jorge Meneces', false, [['FDK', 'Gerente de recepción'], ['DSS', 'Consulta']]],
  [1097, 'jsalas', 'Josue Salas', false, [['FDK', 'Cajero responsable'], ['POS', 'Cajero']]],
  [1080, 'jzuniga', 'Derick Zúñiga Quesada', false, [['FDK', 'Cajero']]],
  [12, 'karias', 'Karen Arias', false, [['FDK', 'Recepcionista']]],
  [1078, 'kcastillo', 'Kristel Castillo Sánchez', false, [['FDK', 'Agente de reservas']]],
  [1079, 'kmiranda', 'Kimberly Miranda', false, [['FDK', 'Auditor nocturno'], ['ACC_DICR', 'Consulta']]],
  [1042, 'kzamora', 'Karen Zamora', false, [['ACC_DICR', 'Contador'], ['PAY', 'Planillas']]],
  [1032, 'ldiaz', 'Leslie Díaz', false, [['POS', 'Mesero']]],
  [1060, 'lobando', 'Leonor Obando Rodríguez', false, [['INV', 'Bodeguero'], ['POS', 'Consulta']]],
  [1065, 'faraya', 'Fabián Araya', false, [['FDK', 'Ama de llaves']]],
] as [number, string, string, boolean, [ModuloId, string][]][]).map(([numero, usuario, nombre, admin, acc], i) => ({
  id: 'u' + numero, numero, usuario, nombre, correo: `${usuario}@hotelsevensuite.com`, admin,
  activo: usuario !== 'ldiaz', cambiarClave: usuario === 'karias',
  ultimoAcceso: `2026-10-${String(14 - (i % 4)).padStart(2, '0')}T0${(i % 9) + 1}:15`,
  accesos: acc.map(([modulo, rol]) => ({ modulo, rol })),
}));

type Base = Omit<Perfil, 'id' | 'activo'>;
const P = (nombre: string, tipoId: string, identificacion: string, roles: RolPerfil[], pais = 'Costa Rica'): Base => {
  const dominio = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, '').slice(0, 14);
  // Registrados en el MAN: los módulos se suman al sincronizar los perfiles de cada uno.
  const modulos: ModuloId[] = [];
  const n = Number(identificacion.replace(/\D/g, '').slice(-3)) || 7;
  return {
    nombre, tipoId, identificacion, roles, modulos, pais, correo: `facturacion@${dominio}.com`, telefono: '+506 2' + identificacion.replace(/\D/g, '').slice(-7, -4) + '-' + identificacion.replace(/\D/g, '').slice(-4),
    ...(roles.includes('Cliente') ? { cliente: { condicion: n % 3 ? 'Crédito' as const : 'Contado' as const, plazo: n % 3 ? 30 : 0, limite: n % 3 ? 5000 + (n % 7) * 2500 : 0, moneda: n % 2 ? 'USD' : 'CRC' } } : {}),
    ...(roles.includes('Proveedor') ? { proveedor: { plazo: [15, 30, 45][n % 3], moneda: 'CRC', categoria: ['Alimentos y bebidas', 'Servicios', 'Suministros', 'Servicios públicos'][n % 4], cuenta: `CR${String(n).padStart(2, '0')}0152020010${String(n * 7919).padStart(8, '0')}` } } : {}),
    ...(roles.includes('Receptor') ? { receptor: { correoComprobantes: `fe@${dominio}.com`, actividad: ['551001 - Hoteles', '791101 - Agencias de viajes', '641901 - Bancos', '262001 - Fabricación de computadoras'][n % 4], provincia: ['San José', 'Alajuela', 'Heredia', 'Puntarenas'][n % 4], exonerado: n % 5 === 0 } } : {}),
    ...(roles.includes('Empresa') ? { empresa: { tipo: (['Agencia', 'Corporativo', 'OTA', 'Mayorista'] as const)[n % 4], tarifa: ['Rack', 'Corporativa 2026', 'Neta agencias', 'OTA'][n % 4], credito: n % 2 === 0, comision: [10, 0, 15, 20][n % 4] } } : {}),
  };
};
export const perfiles: Perfil[] = [
  P('Distribuidora La Florida S.A.', 'Cédula jurídica', '3101000001', ['Proveedor']),
  P('Coopeagri R.L.', 'Cédula jurídica', '3004045011', ['Proveedor']),
  P('Lavandería Industrial Jacó', 'Cédula jurídica', '3101654321', ['Proveedor']),
  P('Pricesmart de Costa Rica', 'Cédula jurídica', '3102112233', ['Proveedor']),
  P('Instituto Costarricense de Electricidad', 'Cédula jurídica', '4000042139', ['Proveedor']),
  P('Travel Agency CR S.A.', 'Cédula jurídica', '3101778899', ['Cliente', 'Receptor', 'Empresa']),
  P('Expedia Inc.', 'Pasaporte', 'US-91-1996326', ['Cliente', 'Empresa'], 'Estados Unidos'),
  P('Booking.com B.V.', 'Pasaporte', 'NL-31047344', ['Cliente', 'Empresa'], 'Países Bajos'),
  P('Banco Nacional de Costa Rica', 'Cédula jurídica', '4000001021', ['Cliente', 'Receptor', 'Empresa']),
  P('Intel Costa Rica', 'Cédula jurídica', '3012123456', ['Cliente', 'Receptor', 'Empresa']),
  P('Grupo Purdy Motor', 'Cédula jurídica', '3101009876', ['Receptor', 'Empresa']),
  P('María Fernanda Rojas', 'Cédula física', '112340567', ['Cliente', 'Receptor']),
  P('Carlos Méndez Solís', 'Cédula física', '204560789', ['Cliente']),
  P('John Peterson', 'Pasaporte', '548812345', ['Cliente'], 'Estados Unidos'),
  P('Ana Lucía Vargas', 'Cédula física', '303450123', ['Cliente', 'Receptor']),
  P('Consultores Asociados GTM', 'Cédula jurídica', '3102445566', ['Cliente', 'Receptor']),
  P('Eventos del Pacífico S.A.', 'Cédula jurídica', '3101334455', ['Cliente', 'Empresa']),
  P('Laura Jiménez Mora', 'DIMEX', '155812345678', ['Cliente'], 'Nicaragua'),
  P('Mariscos del Golfo', 'Cédula jurídica', '3101556677', ['Proveedor']),
  P('Tours Arenal Adventure', 'Cédula jurídica', '3101998877', ['Proveedor', 'Empresa']),
].map((p, i) => ({ id: 'pf' + i, ...p, activo: i !== 4 }));
