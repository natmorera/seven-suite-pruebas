// Base de conocimiento de errores frecuentes de Hacienda. Traduce el mensaje
// técnico del rechazo a lenguaje claro y sugiere cómo corregirlo. Se busca
// por palabras clave del mensaje, así que sirve aunque Hacienda cambie un
// poco la redacción. Para agregar un caso nuevo, basta con sumar una entrada.
import { segunPais } from '@/lib/paisActual';
export interface ErrorConocido {
  id: string;
  titulo: string;
  explicacion: string;
  solucion: string[];
  campo?: 'receptor' | 'lineas' | 'actividad' | 'referencia' | 'emisor' | 'fecha' | 'totales';
  // Si se arregla fuera de la factura (configuración), no basta con refacturar
  fueraDeLaFactura?: boolean;
  claves: RegExp;
}

export const ERRORES_HACIENDA: ErrorConocido[] = [
  {
    id: 'clave-duplicada', claves: /(clave|consecutivo).*(ya|anterior|duplicad|existe)|ya fue recibid|previamente recibid/i,
    titulo: 'El número ya se había usado',
    explicacion: 'Hacienda ya tenía un comprobante con esta clave o este consecutivo. Pasa cuando la numeración de la caja no coincide con la que Hacienda conoce (por ejemplo, después de migrar de otro sistema).',
    solucion: ['Revisa en Cajas / Terminales el próximo número de este tipo de documento y ajústalo al siguiente libre.', 'Luego refactura: se emite con un número nuevo.'],
    campo: 'emisor', fueraDeLaFactura: true,
  },
  {
    id: 'receptor-no-inscrito', claves: /receptor.*(no.*(inscrit|registrad|existe|válid)|inválid)|identificaci[oó]n.*receptor/i,
    titulo: 'La identificación del receptor no es válida',
    explicacion: 'La cédula del cliente no existe en el registro de Hacienda, tiene un dígito de más o de menos, o el tipo de identificación no corresponde (física, jurídica, DIMEX, NITE).',
    solucion: ['Confirma la cédula con el cliente y el tipo de identificación.', 'Si es extranjero sin cédula, usa factura de exportación o tiquete.', 'Refactura con el receptor corregido.'],
    campo: 'receptor',
  },
  {
    id: 'actividad', claves: /actividad.*(econ[oó]mica)?.*(no|inválid|vigente|corresponde|inscrit)/i,
    titulo: 'La actividad económica no corresponde',
    explicacion: 'El código de actividad del emisor (o del receptor) no está inscrito o ya no está vigente en Hacienda.',
    solucion: ['En Empresa › Información tributaria revisa que la actividad sea la que tienes inscrita en TRIBU-CR.', 'Si el error es de la actividad del receptor, déjala vacía o usa la que el cliente tiene inscrita.'],
    campo: 'actividad',
  },
  {
    id: 'cabys', claves: /cabys/i,
    titulo: 'Hay un código CABYS que no sirve',
    explicacion: 'Alguna línea usa un código CABYS que no existe, está desactualizado o no permite la tarifa de IVA indicada.',
    solucion: ['Busca el producto o servicio en el catálogo CABYS actualizado y cambia el código de la línea.', 'Revisa que la tarifa de IVA sea la que corresponde a ese código.', 'Actualiza el código también en Productos/Servicios para que no se repita.'],
    campo: 'lineas',
  },
  {
    id: 'tarifa', claves: /tarifa|impuesto.*(no|inválid|corresponde)|codigotarifa/i,
    titulo: 'La tarifa de IVA no es correcta',
    explicacion: 'La tarifa de IVA de una línea no corresponde al código CABYS o a la exoneración aplicada.',
    solucion: ['Revisa el IVA de cada línea contra su CABYS.', 'Si hay exoneración, confirma que el porcentaje no supere la tarifa.'],
    campo: 'lineas',
  },
  {
    id: 'montos', claves: /(total|monto|suma|subtotal|c[aá]lculo).*(no coincide|no corresponde|incorrect|diferente|inválid)|redonde/i,
    titulo: 'Los montos no cuadran',
    explicacion: 'Algún total del comprobante no coincide con la suma de sus líneas (a veces por redondeos o descuentos mayores al monto de la línea).',
    solucion: ['Revisa descuentos y otros cargos de cada línea.', 'Refactura: el sistema vuelve a calcular todos los totales.'],
    campo: 'totales',
  },
  {
    id: 'firma', claves: /firma|certificad|llave|p12|criptogr/i,
    titulo: 'Problema con la firma digital',
    explicacion: 'La llave criptográfica está vencida, no corresponde a la cédula del emisor o el PIN no es el correcto.',
    solucion: ['En Empresa › Información tributaria carga una llave vigente del mismo ambiente (pruebas o producción).', 'Luego refactura.'],
    campo: 'emisor', fueraDeLaFactura: true,
  },
  {
    id: 'fecha', claves: /fecha.*(emisi[oó]n)?.*(fuera|posterior|anterior|plazo|inválid|mayor)/i,
    titulo: 'La fecha de emisión no es aceptada',
    explicacion: 'La fecha del comprobante quedó fuera del plazo que acepta Hacienda (muy vieja o en el futuro). Suele pasar si el equipo tiene mal la hora.',
    solucion: ['Revisa la fecha y hora del equipo o del servidor.', 'Refactura: se emite con la fecha de hoy.'],
    campo: 'fecha',
  },
  {
    id: 'referencia', claves: /referencia|documento.*(referenci|original).*(no existe|inválid)/i,
    titulo: 'El documento de referencia no es válido',
    explicacion: 'La nota de crédito o débito apunta a un documento que Hacienda no encuentra o que no fue aceptado.',
    solucion: ['Elige como referencia un documento aceptado, con su clave de 50 dígitos.', 'Revisa el código de referencia (anula, corrige monto, etc.).'],
    campo: 'referencia',
  },
  {
    id: 'exoneracion', claves: /exoneraci/i,
    titulo: 'La exoneración no es válida',
    explicacion: 'El documento de exoneración está vencido, no corresponde al receptor o su número no existe en el sistema de exoneraciones (EXONET).',
    solucion: ['Confirma el número y la vigencia de la exoneración con el cliente.', 'Si ya no aplica, quítala de las líneas y refactura.'],
    campo: 'lineas',
  },
  {
    id: 'correo', claves: /correo|e-?mail/i,
    titulo: 'El correo tiene un formato inválido',
    explicacion: 'Algún correo (del emisor o del receptor) tiene espacios, caracteres especiales o le falta la @.',
    solucion: ['Corrige el correo del receptor en la factura o en su ficha.'],
    campo: 'receptor',
  },
  {
    id: 'esquema', claves: /esquema|xsd|estructura|xml.*(inválid|mal formad)|element/i,
    titulo: 'El comprobante no cumple con el formato de Hacienda',
    explicacion: 'Falta un dato obligatorio o hay un campo con un valor que el formato 4.4 no permite (por ejemplo, un texto demasiado largo).',
    solucion: ['Revisa descripciones muy largas, códigos comerciales y datos del receptor.', 'Si se repite, envía el detalle técnico a soporte.'],
    campo: 'lineas',
  },
  {
    id: 'credenciales', claves: /autentic|credencial|token|usuario|401|403/i,
    titulo: 'No se pudo entrar a Hacienda',
    explicacion: 'El usuario o la contraseña de la API de Hacienda no son correctos, o son de otro ambiente (pruebas/producción).',
    solucion: ['En Empresa › Información tributaria revisa el usuario y la contraseña de la API.', 'Confirma que el ambiente elegido coincide con las credenciales.', 'Luego reenvía el documento.'],
    campo: 'emisor', fueraDeLaFactura: true,
  },
];

export const ERROR_DESCONOCIDO: Omit<ErrorConocido, 'claves'> = {
  id: 'desconocido',
  titulo: 'Hacienda rechazó el comprobante',
  explicacion: 'El motivo no está en la lista de errores frecuentes. Abajo está el mensaje completo de Hacienda.',
  solucion: ['Lee el detalle técnico y corrige el dato que menciona.', 'Si no queda claro, envía el detalle a soporte.'],
};

// Los textos están escritos para Hacienda; con una empresa de Guatemala se adaptan a la SAT
const adaptar = (e: Omit<ErrorConocido, 'claves'>) => ({ ...e, titulo: segunPais(e.titulo), explicacion: segunPais(e.explicacion), solucion: e.solucion.map(segunPais) });

export function interpretarError(mensaje: string | null | undefined): (Omit<ErrorConocido, 'claves'>)[] {
  const t = String(mensaje ?? '');
  if (!t.trim()) return [adaptar(ERROR_DESCONOCIDO)];
  const hallados = ERRORES_HACIENDA.filter(e => e.claves.test(t));
  return (hallados.length ? hallados : [ERROR_DESCONOCIDO]).map(adaptar);
}
