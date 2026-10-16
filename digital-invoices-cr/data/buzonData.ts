// Bandeja de reenvíos de factura por correo. En Costa Rica es común que
// proveedores reenvíen el XML+PDF de su factura directo al correo de
// facturación del hotel; esta pantalla deja "importar" ese adjunto sin salir
// del correo, en vez de descargarlo y subirlo a mano en Recepción de documentos.

export interface Correo {
  id: string;
  remitente: string;
  asunto: string;
  snippet: string;
  fecha: string;      // ISO
  favorito: boolean;
  leido: boolean;
  tieneAdjuntoXml: boolean;
  importado: boolean;
}

const HOY = new Date();
function haceDias(d: number, h = 13, m = 0) {
  const dt = new Date(HOY);
  dt.setDate(dt.getDate() - d);
  dt.setHours(h, m, 0, 0);
  return dt.toISOString();
}

export const CORREOS: Correo[] = [
  { id: 'c1',  remitente: 'facturación@hc.cr', asunto: 'Reenvío factura', snippet: 'Adjunto el XML de la factura del período correspondiente a...', fecha: haceDias(0), favorito: true,  leido: false, tieneAdjuntoXml: true,  importado: false },
  { id: 'c2',  remitente: 'Fernando Solís',     asunto: 'Reenvío factura', snippet: 'Buenas tardes, les reenvío el comprobante solicitado...',        fecha: haceDias(0), favorito: false, leido: true,  tieneAdjuntoXml: true,  importado: false },
  { id: 'c3',  remitente: 'Joel Valerio',       asunto: 'Reenvío factura', snippet: 'Buen día, adjunto factura electrónica de este mes...',           fecha: haceDias(0), favorito: false, leido: true,  tieneAdjuntoXml: true,  importado: true  },
  { id: 'c4',  remitente: 'Esteban Agüero',     asunto: 'Reenvío factura', snippet: 'Estimados, se adjunta el comprobante correspondiente...',        fecha: haceDias(0), favorito: false, leido: true,  tieneAdjuntoXml: true,  importado: false },
  { id: 'c5',  remitente: 'Erick Monge',        asunto: 'Reenvío factura', snippet: 'Saludos, les hago llegar la factura pendiente de...',            fecha: haceDias(0), favorito: false, leido: true,  tieneAdjuntoXml: false, importado: false },
  { id: 'c6',  remitente: 'Jorge Bonilla',       asunto: 'Reenvío factura', snippet: 'Buenas, reenvío el XML solicitado la semana pasada...',          fecha: haceDias(0), favorito: false, leido: true,  tieneAdjuntoXml: true,  importado: false },
  { id: 'c7',  remitente: 'facturación@ho.cr',   asunto: 'Reenvío factura', snippet: 'Adjunto comprobante electrónico y representación en PDF...',    fecha: haceDias(4), favorito: false, leido: true,  tieneAdjuntoXml: true,  importado: false },
  { id: 'c8',  remitente: 'Rommel Fermín',       asunto: 'Reenvío factura', snippet: 'Buen día, les comparto la factura de mantenimiento...',          fecha: haceDias(5), favorito: false, leido: true,  tieneAdjuntoXml: true,  importado: false },
  { id: 'c9',  remitente: 'Gabriel Bonilla',     asunto: 'Reenvío factura', snippet: 'Estimados, adjunto factura de suministros del mes...',          fecha: haceDias(5), favorito: false, leido: true,  tieneAdjuntoXml: false, importado: false },
  { id: 'c10', remitente: 'facturación@ho.cr',   asunto: 'Reenvío factura', snippet: 'Se adjunta comprobante electrónico correspondiente a...',       fecha: haceDias(5), favorito: false, leido: true,  tieneAdjuntoXml: true,  importado: false },
];
