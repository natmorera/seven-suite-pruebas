// Clave numérica de 50 dígitos, formato oficial de Hacienda (Costa Rica):
// País(3) + Día(2) + Mes(2) + Año(2) + Cédula emisor(12) + Consecutivo(20) +
// Situación(1) + Código de seguridad(8) = 50 dígitos.
// El consecutivo de 20 dígitos es a su vez Sucursal(3)+Terminal(5)+Tipo(2)+Consecutivo(10).

export const TIPO_DOCUMENTO_CODIGO: Record<string, string> = {
  'Factura electrónica':             '01',
  'Nota de débito':                  '02',
  'Nota de crédito':                 '03',
  'Tiquete electrónico':             '04',
  'Factura electrónica de compra':   '08',
  'Factura de exportación':          '09',
  'Recibo Electrónico de Pago':      '10',
};

export interface DatosClave {
  cedulaEmisor: string;   // solo dígitos, sin guiones
  sucursal: string;       // 3 dígitos
  terminal: string;       // 5 dígitos
  tipoDocumento: string;  // nombre legible del tipo (ver TIPO_DOCUMENTO_CODIGO)
  consecutivo: string;    // 10 dígitos
  situacion?: '1' | '2' | '3'; // normal / contingencia / sin internet
  fecha?: Date;
}

function soloDigitos(s: string) { return s.replace(/\D/g, ''); }

export function generarClave(d: DatosClave): string {
  const fecha = d.fecha ?? new Date();
  const dia  = String(fecha.getDate()).padStart(2, '0');
  const mes  = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = String(fecha.getFullYear()).slice(-2);
  const cedula = soloDigitos(d.cedulaEmisor).padStart(12, '0').slice(-12);
  const tipoCod = TIPO_DOCUMENTO_CODIGO[d.tipoDocumento] ?? '01';
  const consecutivo20 = d.sucursal.padStart(3, '0') + d.terminal.padStart(5, '0') + tipoCod + d.consecutivo.padStart(10, '0');
  const situacion = d.situacion ?? '1';
  const codigoSeguridad = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');

  return '506' + dia + mes + anio + cedula + consecutivo20 + situacion + codigoSeguridad;
}

// URL del comprobante en el sitio de consulta pública de Hacienda, para el QR.
export function urlConsultaHacienda(clave: string): string {
  return `https://api.comprobanteselectronicos.go.cr/consulta?clave=${clave}`;
}
