// XML del documento tributario electrónico (GTDocumento, FEL de la SAT).
// Es el que se entrega al certificador: él lo valida, lo firma, le asigna
// número de autorización, serie y número y lo envía a la SAT.
// Usa los mismos cálculos que el formulario (lib/calculoFactura.ts).
import { calcularDocumento, esServicio, type LineaCalculo } from './calculoFactura';
import { nombreDepartamento, type FraseEmisor, type AbonoFcam } from './perfilPais';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const m = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
const m6 = (n: number) => (Math.round(n * 1e6) / 1e6).toString();

export interface DatosXmlFel {
  tipoDte: string;                      // FACT, FCAM, NCRE, NDEB, FESP
  fechaEmision: Date;
  moneda: string;                       // CRC (moneda local) se escribe como GTQ
  exportacion: boolean;
  emisor: { nit: string; nombre: string; nombreComercial: string; establecimiento: string; afiliacionIva: string; correo: string;
    direccion: string; codigoPostal: string; municipio: string; departamento: string };
  receptor: { tipoId: string; numero: string; nombre: string; correo?: string };
  frases: FraseEmisor[];
  lineas: (LineaCalculo & { descripcion: string; unidadMedida?: string })[];
  referencia?: { uuid: string; fecha: string; serie: string; numero: string; motivo: string } | null;
  abonos?: AbonoFcam[] | null;
  retencionesFesp?: { isr: number; iva: number; totalMenosRetenciones: number } | null;
}

// Receptor: NIT, CF o documento especial (CUI o extranjero)
function atributosReceptor(r: DatosXmlFel['receptor']) {
  const n = String(r.numero ?? '').trim().toUpperCase();
  if (r.tipoId === '06' || !n || n === 'CF') return `IDReceptor="CF" NombreReceptor="${esc(r.nombre || 'Consumidor final')}"`;
  const especial = r.tipoId === '01' ? ' TipoEspecial="CUI"' : r.tipoId === '02' ? '' : ' TipoEspecial="EXT"';
  return `IDReceptor="${esc(n.replace(/-/g, ''))}"${especial} NombreReceptor="${esc(r.nombre)}"${r.correo ? ` CorreoReceptor="${esc(r.correo)}"` : ''}`;
}

export function construirXmlFel(d: DatosXmlFel): string {
  const calc = calcularDocumento(d.lineas);
  const fecha = new Date(d.fechaEmision.getTime() - 6 * 3600 * 1000).toISOString().slice(0, 19) + '-06:00';
  const moneda = d.moneda === 'USD' ? 'USD' : 'GTQ';
  const conIth = calc.lineas.some(c => c.otroImpuesto > 0);
  const items = d.lineas.map((l, i) => {
    const c = calc.lineas[i];
    const impuestos = [
      `<dte:Impuesto><dte:NombreCorto>IVA</dte:NombreCorto><dte:CodigoUnidadGravable>${c.tarifa > 0 ? 1 : 2}</dte:CodigoUnidadGravable><dte:MontoGravable>${m(c.subtotal)}</dte:MontoGravable><dte:MontoImpuesto>${m(c.impuesto)}</dte:MontoImpuesto></dte:Impuesto>`,
      ...(c.otroImpuesto > 0 ? [`<dte:Impuesto><dte:NombreCorto>TURISMO HOSPEDAJE</dte:NombreCorto><dte:CodigoUnidadGravable>1</dte:CodigoUnidadGravable><dte:MontoGravable>${m(c.subtotal)}</dte:MontoGravable><dte:MontoImpuesto>${m(c.otroImpuesto)}</dte:MontoImpuesto></dte:Impuesto>`] : []),
    ].join('');
    return `<dte:Item NumeroLinea="${i + 1}" BienOServicio="${esServicio(l.codigoCabys) ? 'S' : 'B'}">`
      + `<dte:Cantidad>${m6(l.cantidad)}</dte:Cantidad><dte:UnidadMedida>${esc((l.unidadMedida || 'UNI').slice(0, 3).toUpperCase())}</dte:UnidadMedida>`
      + `<dte:Descripcion>${esc(l.descripcion)}</dte:Descripcion><dte:PrecioUnitario>${m6(l.precioUnitario)}</dte:PrecioUnitario>`
      + `<dte:Precio>${m(c.montoConIva)}</dte:Precio><dte:Descuento>${m(c.descuentoConIva)}</dte:Descuento>`
      + (d.tipoDte === 'RANT' ? '' : `<dte:Impuestos>${impuestos}</dte:Impuestos>`) + `<dte:Total>${m(c.totalLinea)}</dte:Total></dte:Item>`;
  }).join('');
  const totalIva = calc.lineas.reduce((a, c) => a + c.impuesto, 0);
  const totalIth = calc.lineas.reduce((a, c) => a + c.otroImpuesto, 0);
  const frases = d.frases.length
    ? `<dte:Frases>${d.frases.map(f => `<dte:Frase TipoFrase="${f.tipo}" CodigoEscenario="${f.escenario}"${f.resolucion ? ` NumeroResolucion="${esc(f.resolucion)}"` : ''}${f.fecha ? ` FechaResolucion="${esc(f.fecha)}"` : ''}/>`).join('')}</dte:Frases>`
    : '';
  const complementos: string[] = [];
  if (d.referencia) {
    complementos.push(`<dte:Complemento IDComplemento="1" NombreComplemento="ReferenciasNota" URIComplemento="http://www.sat.gob.gt/face2/ComplementoReferenciaNota/0.1.0">`
      + `<cno:ReferenciasNota xmlns:cno="http://www.sat.gob.gt/face2/ComplementoReferenciaNota/0.1.0" Version="0.0" NumeroAutorizacionDocumentoOrigen="${esc(d.referencia.uuid)}"`
      + ` FechaEmisionDocumentoOrigen="${esc(d.referencia.fecha.slice(0, 10))}" MotivoAjuste="${esc(d.referencia.motivo)}" SerieDocumentoOrigen="${esc(d.referencia.serie)}" NumeroDocumentoOrigen="${esc(d.referencia.numero)}"/></dte:Complemento>`);
  }
  if (d.abonos?.length) {
    complementos.push(`<dte:Complemento IDComplemento="1" NombreComplemento="AbonosFacturaCambiaria" URIComplemento="http://www.sat.gob.gt/dte/fel/CompCambiaria/0.1.0">`
      + `<cfc:AbonosFacturaCambiaria xmlns:cfc="http://www.sat.gob.gt/dte/fel/CompCambiaria/0.1.0" Version="1">`
      + d.abonos.map(a => `<cfc:Abono><cfc:NumeroAbono>${a.numero}</cfc:NumeroAbono><cfc:FechaVencimiento>${esc(a.fechaVencimiento)}</cfc:FechaVencimiento><cfc:MontoAbono>${m(a.monto)}</cfc:MontoAbono></cfc:Abono>`).join('')
      + `</cfc:AbonosFacturaCambiaria></dte:Complemento>`);
  }
  if (d.retencionesFesp) {
    complementos.push(`<dte:Complemento IDComplemento="1" NombreComplemento="RetencionesFacturaEspecial" URIComplemento="http://www.sat.gob.gt/face2/ComplementoFacturaEspecial/0.1.0">`
      + `<cfe:RetencionesFacturaEspecial xmlns:cfe="http://www.sat.gob.gt/face2/ComplementoFacturaEspecial/0.1.0" Version="1">`
      + `<cfe:RetencionISR>${m(d.retencionesFesp.isr)}</cfe:RetencionISR><cfe:RetencionIVA>${m(d.retencionesFesp.iva)}</cfe:RetencionIVA>`
      + `<cfe:TotalMenosRetenciones>${m(d.retencionesFesp.totalMenosRetenciones)}</cfe:TotalMenosRetenciones></cfe:RetencionesFacturaEspecial></dte:Complemento>`);
  }
  const e = d.emisor;
  return `<?xml version="1.0" encoding="UTF-8"?>`
    + `<dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0" Version="0.1"><dte:SAT ClaseDocumento="dte"><dte:DTE ID="DatosCertificados"><dte:DatosEmision ID="DatosEmision">`
    + `<dte:DatosGenerales Tipo="${d.tipoDte}" FechaHoraEmision="${fecha}" CodigoMoneda="${moneda}"${d.exportacion ? ' Exp="SI"' : ''}/>`
    + `<dte:Emisor NITEmisor="${esc(e.nit.replace(/-/g, ''))}" NombreEmisor="${esc(e.nombre)}" CodigoEstablecimiento="${Number(e.establecimiento) || 1}" NombreComercial="${esc(e.nombreComercial)}" AfiliacionIVA="${esc(e.afiliacionIva)}"${e.correo ? ` CorreoEmisor="${esc(e.correo)}"` : ''}>`
    + `<dte:DireccionEmisor><dte:Direccion>${esc(e.direccion)}</dte:Direccion><dte:CodigoPostal>${esc(e.codigoPostal || '01001')}</dte:CodigoPostal><dte:Municipio>${esc(e.municipio)}</dte:Municipio>`
    + `<dte:Departamento>${esc(nombreDepartamento(e.departamento) || e.departamento)}</dte:Departamento><dte:Pais>GT</dte:Pais></dte:DireccionEmisor></dte:Emisor>`
    + `<dte:Receptor ${atributosReceptor(d.receptor)}/>`
    + frases
    + `<dte:Items>${items}</dte:Items>`
    + `<dte:Totales>${d.tipoDte === 'RANT' ? '' : `<dte:TotalImpuestos><dte:TotalImpuesto NombreCorto="IVA" TotalMontoImpuesto="${m(totalIva)}"/>${conIth ? `<dte:TotalImpuesto NombreCorto="TURISMO HOSPEDAJE" TotalMontoImpuesto="${m(totalIth)}"/>` : ''}</dte:TotalImpuestos>`}`
    + `<dte:GranTotal>${m(calc.totalComprobante)}</dte:GranTotal></dte:Totales>`
    + (complementos.length ? `<dte:Complementos>${complementos.join('')}</dte:Complementos>` : '')
    + `</dte:DatosEmision></dte:DTE></dte:SAT></dte:GTDocumento>`;
}

export { retencionesFacturaEspecial } from './retenciones';
