import { create } from 'xmlbuilder2';

// El "acuse" o "respuesta" es el mensaje que Hacienda devuelve tras procesar
// el comprobante (aceptado, rechazado o aceptado parcialmente). Es un XML
// aparte del comprobante original, y en Hacienda real también viene firmado
// por ellos. Acá se genera una versión simplificada pero con la forma real
// del esquema "MensajeHacienda", suficiente para mostrar/descargar junto al
// PDF y al XML del comprobante — que es exactamente lo que pidió el negocio:
// las tres cosas disponibles desde una sola pantalla (como Tico Facturas).

export interface DatosAcuse {
  clave: string;
  fechaEmisionDoc: string;
  cedulaEmisor: string;
  cedulaReceptor?: string;
  totalImpuesto: number;
  totalFactura: number;
  aceptado: boolean;
}

export function construirAcuse(d: DatosAcuse): string {
  const obj = {
    MensajeHacienda: {
      '@xmlns': 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda',
      Clave: d.clave,
      FechaEmisionDoc: d.fechaEmisionDoc,
      Mensaje: d.aceptado ? '1' : '3',
      DetalleMensaje: d.aceptado ? 'Comprobante electrónico aceptado' : 'Comprobante electrónico rechazado',
      MontoTotalImpuesto: d.totalImpuesto.toFixed(5),
      TotalFactura: d.totalFactura.toFixed(5),
      NumeroCedulaEmisor: d.cedulaEmisor.replace(/\D/g, ''),
      ...(d.cedulaReceptor ? { NumeroCedulaReceptor: d.cedulaReceptor.replace(/\D/g, '') } : {}),
    },
  };
  return create(obj).end({ prettyPrint: true });
}
