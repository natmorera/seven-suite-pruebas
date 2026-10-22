
export interface Bancaria { id:string;banco:string;numero:string;moneda:string;tipo:string;titulo:string;principal:boolean; }
export interface Perfil {
  id:string;auxId:string;tipo:'02'|'04';activo:boolean;
  nombre:string;tipoIdentificacion:string;numeroIdentificacion:string;pais:string;
  correo:string;telefono:string;contacto:string;direccion:string;
  cuentaCode:string;cuentaNombre:string;bancarias:Bancaria[];
  diasCredito:number;
  generaReciboPago?:boolean;
  tipoIdTributaria:string;nombreComercial:string;representanteLegal:string;actividadEconomica:string;regimenTributario:string;
  provincia:string;canton:string;distrito:string;barrioSenas:string;
  creadoPor:string;creadoEn:string;
}

export const TERCEROS_SEMILLA: Perfil[] = [
  { id:'c1',auxId:'0001',tipo:'02',activo:true,nombre:'Distribuidora La Florida S.A.',tipoIdentificacion:'juridica',numeroIdentificacion:'3-101-456789',pais:'CR',correo:'ventas@laflorida.cr',telefono:'+506 2234-5678',contacto:'Andrea Rojas',direccion:'San José, Barrio Escalante',cuentaCode:'110-001-0001',cuentaNombre:'Clientes nacionales',bancarias:[],
    diasCredito:30, tipoIdTributaria:'02', nombreComercial:'La Florida', representanteLegal:'Andrea Rojas', actividadEconomica:'4649 - Venta al por mayor de otros enseres domésticos', regimenTributario:'01', provincia:'San José', canton:'San José', distrito:'Carmen', barrioSenas:'Barrio Escalante, 200m norte del parque',
    creadoPor:'jperez',creadoEn:'2026-03-12' },
  { id:'c2',auxId:'0002',tipo:'02',activo:true,nombre:'Hotel Las Palmas S.A.',tipoIdentificacion:'juridica',numeroIdentificacion:'3-101-789012',pais:'CR',correo:'admin@laspalmas.cr',telefono:'+506 2291-0000',contacto:'',direccion:'',cuentaCode:'110-001-0001',cuentaNombre:'Clientes nacionales',bancarias:[],
    diasCredito:15, tipoIdTributaria:'02', nombreComercial:'', representanteLegal:'', actividadEconomica:'', regimenTributario:'', provincia:'', canton:'', distrito:'', barrioSenas:'',
    creadoPor:'sblandon',creadoEn:'2026-04-01' },
  { id:'p1',auxId:'0002',tipo:'04',activo:true,nombre:'Comercial Ferretero Monteverde',tipoIdentificacion:'juridica',numeroIdentificacion:'3-101-222333',pais:'CR',correo:'compras@cfm.cr',telefono:'+506 2645-1234',contacto:'Luis Barrantes',direccion:'Monteverde, Puntarenas',cuentaCode:'300-001-0001',cuentaNombre:'Proveedores nacionales',bancarias:[{ id:'b1',banco:'BAC San José',numero:'CR21015108010010012345',moneda:'CRC',tipo:'corriente',titulo:'',principal:true }],
    diasCredito:45, tipoIdTributaria:'02', nombreComercial:'Ferretero Monteverde', representanteLegal:'Luis Barrantes', actividadEconomica:'4752 - Venta al por menor de artículos de ferretería', regimenTributario:'01', provincia:'Puntarenas', canton:'Monteverde', distrito:'Monteverde', barrioSenas:'Centro de Monteverde',
    creadoPor:'jperez',creadoEn:'2026-02-15' },
];


// Tipo de identificación: Contabilidad usa etiquetas propias; Hacienda usa
// códigos (01 física, 02 jurídica, 03 DIMEX, 04 NITE, 05 extranjero no
// domiciliado, 06 no contribuyente).
const TIPO_ID_A_HACIENDA: Record<string, string> = { fisica: '01', juridica: '02', extranjer: '05' };
const HACIENDA_A_TIPO_ID: Record<string, string> = { '01': 'fisica', '02': 'juridica', '03': 'extranjer', '04': 'juridica', '05': 'extranjer', '06': 'fisica' };

export interface ClienteDb {
  id: string; nombre: string; tipo: string; tipo_identificacion: string; numero_identificacion: string;
  email: string | null; telefono: string | null; direccion_fiscal: string | null;
  actividad_economica?: string | null; dias_credito?: number | null; nombre_comercial?: string | null; genera_recibo_pago?: number | null;
  activo?: number | null; datos_json?: string | null;
  exonerado?: number | null;
  es_receptor?: number | null; con_cuenta?: number | null;
}

// Perfil de Contabilidad → columnas de la tabla (lo que usa la factura).
export function perfilAColumnas(p: Perfil) {
  const direccion = [p.provincia, p.canton, p.distrito, p.barrioSenas].filter(Boolean).join(', ') || p.direccion || '';
  return {
    nombre: p.nombre,
    tipo: p.tipo === '04' ? 'proveedor' : 'cliente',
    tipo_identificacion: p.tipoIdTributaria || TIPO_ID_A_HACIENDA[p.tipoIdentificacion] || '02',
    numero_identificacion: p.numeroIdentificacion,
    email: p.correo || null,
    telefono: p.telefono || null,
    direccion_fiscal: direccion || null,
    actividad_economica: p.actividadEconomica || null,
    dias_credito: Number(p.diasCredito) || 0,
    genera_recibo_pago: p.generaReciboPago ? 1 : 0,
    nombre_comercial: p.nombreComercial || null,
    activo: p.activo ? 1 : 0,
    datos_json: JSON.stringify(p),
  };
}

// Fila de la tabla → perfil de Contabilidad (para registros creados desde
// Facturación, que no tienen perfil completo todavía).
export function filaAPerfil(r: ClienteDb, indice = 0): Perfil {
  if (r.datos_json) {
    try {
      const p = JSON.parse(r.datos_json) as Perfil;
      // Las columnas mandan (pueden haberse editado desde Facturación)
      return { ...p, id: r.id, nombre: r.nombre, numeroIdentificacion: r.numero_identificacion ?? p.numeroIdentificacion,
        correo: r.email ?? p.correo, telefono: r.telefono ?? p.telefono, activo: r.activo == null ? p.activo : Number(r.activo) === 1 };
    } catch { /* cae al armado por columnas */ }
  }
  const esProv = r.tipo === 'proveedor';
  return {
    id: r.id, auxId: String(indice + 1).padStart(4, '0'), tipo: esProv ? '04' : '02', activo: r.activo == null ? true : Number(r.activo) === 1,
    nombre: r.nombre, tipoIdentificacion: HACIENDA_A_TIPO_ID[r.tipo_identificacion] ?? 'juridica', numeroIdentificacion: r.numero_identificacion ?? '',
    pais: 'CR', correo: r.email ?? '', telefono: r.telefono ?? '', contacto: '', direccion: r.direccion_fiscal ?? '',
    cuentaCode: esProv ? '300-001-0001' : '110-001-0001', cuentaNombre: esProv ? 'Proveedores nacionales' : 'Clientes nacionales', bancarias: [],
    diasCredito: Number(r.dias_credito ?? 0), generaReciboPago: Number(r.genera_recibo_pago ?? 0) === 1, tipoIdTributaria: r.tipo_identificacion ?? '02', nombreComercial: r.nombre_comercial ?? '',
    representanteLegal: '', actividadEconomica: r.actividad_economica ?? '', regimenTributario: '', provincia: '', canton: '', distrito: '', barrioSenas: r.direccion_fiscal ?? '',
    creadoPor: 'facturacion', creadoEn: '',
  };
}
