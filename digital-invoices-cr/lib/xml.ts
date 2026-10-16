import { create } from 'xmlbuilder2';
import { generarClave, TIPO_DOCUMENTO_CODIGO } from './clave';
import { calcularDocumento, type DescuentoLinea, type ExoneracionLinea, type OtroCargo, type OtroImpuestoLinea } from './calculoFactura';


// Unidades que se muestran en pantalla → código del catálogo de Hacienda.
const UNIDAD_HACIENDA: Record<string, string> = {
  Noche: 'd', 'Día': 'd', Dia: 'd', Servicio: 'Os', Hora: 'h', Persona: 'Unid', Kg: 'kg', L: 'L', Caja: 'Unid', Paquete: 'Unid', Unid: 'Unid',
};
export function unidadHacienda(u?: string | null): string {
  if (!u) return 'Unid';
  return UNIDAD_HACIENDA[u] ?? u;
}

export interface LineaXml {
  numero: number;
  codigoCabys: string;
  codigoComercial?: string;        // código propio del vendedor (SKU)
  tipoCodigoComercial?: string;    // 01 vendedor, 04 uso interno…
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  impuestoPorcentaje: number;
  // Código del catálogo de tarifas (ver TARIFAS_IVA): '08' = 13%, '10' = exenta…
  codigoTarifa?: string;
  unidadMedida?: string;
  unidadMedidaComercial?: string;  // cómo la llama el vendedor (opcional)
  tipoTransaccion?: string;        // catálogo TIPOS_TRANSACCION (opcional)
  descuento?: DescuentoLinea | null;
  exoneracion?: ExoneracionLinea | null;
  otroImpuesto?: OtroImpuestoLinea | null;
}

export interface DocumentoParaXml {
  tipoDocumento: string;
  consecutivo: string;   // 10 dígitos
  sucursal: string;
  terminal: string;
  fechaEmision: Date;
  emisor: {
    nombre: string;
    cedulaJuridica: string;
    actividadEconomica: string; // "551001 - descripción"
    tipoIdentificacion?: string;
  };
  receptor: {
    nombre: string;
    tipoIdentificacion: string; // 01 física, 02 jurídica, 03 DIMEX, 04 NITE, 05 extranjero no domiciliado, 06 no contribuyente
    numeroIdentificacion: string;
    email?: string;
    nombreComercial?: string;
    // Códigos de Hacienda: provincia (1 dígito), cantón y distrito (2 dígitos)
    ubicacion?: { provincia: string; canton: string; distrito: string; otrasSenas: string };
  } | null; // null = consumidor final (tiquete sin receptor)
  actividadReceptor?: string;
  condicionVenta: string;
  plazoCreditoDias?: number;
  moneda: 'CRC' | 'USD';
  tipoCambio: number;
  lineas: LineaXml[];
  medioPago: string[];
  medioPagoOtros?: string;
  otrosCargos?: OtroCargo[];
  observaciones?: string;
  referencia?: { tipoDocumento: string; numero: string; fecha: string; codigo: string; razon: string };
}

const RAIZ: Record<string, string> = {
  '01': 'FacturaElectronica', '02': 'NotaDebitoElectronica', '03': 'NotaCreditoElectronica',
  '04': 'TiqueteElectronico', '08': 'FacturaElectronicaCompra', '09': 'FacturaElectronicaExportacion',
  '10': 'ReciboElectronicoPago',
};

export function construirXml(doc: DocumentoParaXml): { xml: string; clave: string; calculo: ReturnType<typeof calcularDocumento> } {
  const clave = generarClave({
    cedulaEmisor: doc.emisor.cedulaJuridica,
    sucursal: doc.sucursal,
    terminal: doc.terminal,
    tipoDocumento: doc.tipoDocumento,
    consecutivo: doc.consecutivo,
    fecha: doc.fechaEmision,
  });
  const codigoTipo = TIPO_DOCUMENTO_CODIGO[doc.tipoDocumento] ?? '01';
  const numeroConsecutivo = doc.sucursal.padStart(3, '0') + doc.terminal.padStart(5, '0') + codigoTipo + doc.consecutivo.padStart(10, '0');
  const raiz = RAIZ[codigoTipo] ?? 'FacturaElectronica';

  const calc = calcularDocumento(doc.lineas.map(l => ({ ...l, codigoTarifa: l.codigoTarifa ?? '08' })), doc.otrosCargos ?? []);
  const f = (n: number) => n.toFixed(5);
  const esExtranjero = doc.receptor?.tipoIdentificacion === '05';
  const esCompra = codigoTipo === '08';
  const nodoTercero = (t: DocumentoParaXml['receptor']) => {
    if (!t) return { Nombre: 'Proveedor' };
    const ext = t.tipoIdentificacion === '05';
    return {
      Nombre: t.nombre,
      ...(ext ? { IdentificacionExtranjero: t.numeroIdentificacion } : { Identificacion: { Tipo: t.tipoIdentificacion, Numero: t.numeroIdentificacion.replace(/\D/g, '') } }),
      ...(!ext && t.ubicacion?.provincia && t.ubicacion.canton && t.ubicacion.distrito ? {
        Ubicacion: { Provincia: t.ubicacion.provincia, Canton: t.ubicacion.canton, Distrito: t.ubicacion.distrito, OtrasSenas: (t.ubicacion.otrasSenas || 'Sin otras señas').slice(0, 250) },
      } : {}),
      ...(t.email ? { CorreoElectronico: t.email } : {}),
    };
  };

  const obj: Record<string, unknown> = {
    [raiz]: {
      '@xmlns': `https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/${raiz.charAt(0).toLowerCase() + raiz.slice(1)}`,
      Clave: clave,
      // En la de compra, la actividad del «emisor» es la del proveedor (si se
      // indicó) y la del receptor es la de la empresa.
      ...(esCompra ? {
        ...(doc.actividadReceptor ? { CodigoActividadEmisor: doc.actividadReceptor.split(' - ')[0].replace(/\D/g, '') } : {}),
        CodigoActividadReceptor: doc.emisor.actividadEconomica.split(' - ')[0].replace(/\D/g, ''),
      } : {
        CodigoActividadEmisor: doc.emisor.actividadEconomica.split(' - ')[0].replace(/\D/g, ''),
        ...(doc.actividadReceptor ? { CodigoActividadReceptor: doc.actividadReceptor.split(' - ')[0].replace(/\D/g, '') } : {}),
      }),
      NumeroConsecutivo: numeroConsecutivo,
      FechaEmision: doc.fechaEmision.toISOString(),
      // Factura electrónica de compra (08): la emite la empresa a nombre de un
      // proveedor que no factura electrónicamente. En el XML el proveedor va
      // como Emisor y la empresa como Receptor.
      ...(esCompra ? {
        Emisor: nodoTercero(doc.receptor),
        Receptor: {
          Nombre: doc.emisor.nombre,
          Identificacion: { Tipo: doc.emisor.tipoIdentificacion ?? '02', Numero: doc.emisor.cedulaJuridica.replace(/\D/g, '') },
        },
      } : {
        Emisor: {
        Nombre: doc.emisor.nombre,
        Identificacion: { Tipo: doc.emisor.tipoIdentificacion ?? '02', Numero: doc.emisor.cedulaJuridica.replace(/\D/g, '') },
        NombreComercial: doc.emisor.nombre,
      },
      ...(doc.receptor ? {
        Receptor: {
          Nombre: doc.receptor.nombre,
          // Extranjero no domiciliado: va en IdentificacionExtranjero (pasaporte, etc.)
          ...(esExtranjero
            ? { IdentificacionExtranjero: doc.receptor.numeroIdentificacion }
            : { Identificacion: { Tipo: doc.receptor.tipoIdentificacion, Numero: doc.receptor.numeroIdentificacion.replace(/\D/g, '') } }),
          ...(doc.receptor.nombreComercial ? { NombreComercial: doc.receptor.nombreComercial.slice(0, 80) } : {}),
          // Ubicación: opcional; va completa o no va (Hacienda pide las tres partes y otras señas)
          ...(!esExtranjero && doc.receptor.ubicacion?.provincia && doc.receptor.ubicacion.canton && doc.receptor.ubicacion.distrito ? {
            Ubicacion: {
              Provincia: doc.receptor.ubicacion.provincia, Canton: doc.receptor.ubicacion.canton, Distrito: doc.receptor.ubicacion.distrito,
              OtrasSenas: (doc.receptor.ubicacion.otrasSenas || 'Sin otras señas').slice(0, 250),
            },
          } : {}),
          ...(doc.receptor.email ? { CorreoElectronico: doc.receptor.email } : {}),
        },
      } : {}),
      }),
      CondicionVenta: doc.condicionVenta,
      ...(doc.condicionVenta === '02' || doc.condicionVenta === '10' ? { PlazoCredito: String(doc.plazoCreditoDias ?? 0) } : {}),
      DetalleServicio: {
        LineaDetalle: doc.lineas.map((l, k) => {
          const c = calc.lineas[k];
          return {
            NumeroLinea: l.numero,
            ...(l.codigoCabys ? { CodigoCABYS: l.codigoCabys } : {}),
            ...(l.codigoComercial ? { CodigoComercial: { Tipo: l.tipoCodigoComercial || '01', Codigo: l.codigoComercial } } : {}),
            Cantidad: l.cantidad,
            UnidadMedida: unidadHacienda(l.unidadMedida),
            ...(l.tipoTransaccion ? { TipoTransaccion: l.tipoTransaccion } : {}),
            ...(l.unidadMedidaComercial ? { UnidadMedidaComercial: l.unidadMedidaComercial.slice(0, 20) } : {}),
            Detalle: l.descripcion,
            PrecioUnitario: f(l.precioUnitario),
            MontoTotal: f(c.montoTotal),
            ...(c.descuento > 0 ? { Descuento: {
              MontoDescuento: f(c.descuento),
              CodigoDescuento: l.descuento?.codigo ?? '07',
              ...(l.descuento?.codigo === '99' && l.descuento?.codigoOtro ? { CodigoDescuentoOTRO: l.descuento.codigoOtro.slice(0, 100) } : {}),
              ...(l.descuento?.codigo === '99' && l.descuento?.naturaleza ? { NaturalezaDescuento: l.descuento.naturaleza } : {}),
            } } : {}),
            SubTotal: f(c.subtotal),
            BaseImponible: f(c.subtotal),
            // El nodo Impuesto va SIEMPRE, incluso exento (CodigoTarifaIVA 10);
            // omitirlo lo rechaza Hacienda y consume el consecutivo.
            Impuesto: [{
              Codigo: '01', CodigoTarifaIVA: l.codigoTarifa ?? '08', Tarifa: c.tarifa.toFixed(2), Monto: f(c.impuesto),
              ...(l.exoneracion && c.montoExoneracion > 0 ? { Exoneracion: {
                TipoDocumentoEX1: l.exoneracion.tipoDocumento,
                ...(l.exoneracion.tipoDocumento === '99' && l.exoneracion.tipoDocumentoOtro ? { TipoDocumentoOTRO: l.exoneracion.tipoDocumentoOtro } : {}),
                NumeroDocumento: l.exoneracion.numeroDocumento,
                ...(l.exoneracion.articulo ? { Articulo: l.exoneracion.articulo, Inciso: l.exoneracion.inciso || '0' } : {}),
                NombreInstitucion: l.exoneracion.institucion,
                ...(l.exoneracion.institucion === '99' && l.exoneracion.nombreInstitucionOtros ? { NombreInstitucionOtros: l.exoneracion.nombreInstitucionOtros } : {}),
                FechaEmisionEX: l.exoneracion.fechaEmision,
                TarifaExonerada: c.tarifaExonerada.toFixed(2),
                MontoExoneracion: f(c.montoExoneracion),
              } } : {}),
            }, ...(l.otroImpuesto && c.otroImpuesto > 0 ? [{
              Codigo: l.otroImpuesto.codigo,
              ...(l.otroImpuesto.codigo === '99' && l.otroImpuesto.descripcion ? { CodigoImpuestoOTRO: l.otroImpuesto.descripcion.slice(0, 100) } : {}),
              Tarifa: l.otroImpuesto.tarifa.toFixed(2), Monto: f(c.otroImpuesto),
            }] : [])],
            ImpuestoAsumidoEmisorFabrica: f(0),
            ImpuestoNeto: f(c.impuestoNeto),
            MontoTotalLinea: f(c.totalLinea),
          };
        }),
      },
      ...(calc.cargos.length ? { OtrosCargos: calc.cargos.map(o => ({
        TipoDocumentoOC: o.tipoDocumento,
        ...(o.terceroIdentificacion ? {
          IdentificacionTercero: { Tipo: o.terceroTipoIdentificacion ?? '02', Numero: o.terceroIdentificacion.replace(/\D/g, '') },
          NombreTercero: o.terceroNombre ?? '',
        } : {}),
        Detalle: o.detalle,
        ...(o.porcentaje ? { PorcentajeOC: o.porcentaje.toFixed(5) } : {}),
        MontoCargo: f(o.montoCalculado),
      })) } : {}),
      ResumenFactura: {
        CodigoTipoMoneda: { CodigoMoneda: doc.moneda, TipoCambio: f(doc.moneda === 'CRC' ? 1 : doc.tipoCambio) },
        TotalServGravados: f(calc.servGravados),
        TotalServExentos: f(calc.servExentos),
        TotalServExonerado: f(calc.servExonerados),
        TotalMercanciasGravadas: f(calc.mercGravadas),
        TotalMercanciasExentas: f(calc.mercExentas),
        TotalMercExonerada: f(calc.mercExoneradas),
        TotalGravado: f(calc.totalGravado),
        TotalExento: f(calc.totalExento),
        TotalExonerado: f(calc.totalExonerado),
        TotalVenta: f(calc.totalVenta),
        TotalDescuentos: f(calc.totalDescuentos),
        TotalVentaNeta: f(calc.totalVentaNeta),
        TotalImpuesto: f(calc.totalImpuesto),
        ...(calc.totalOtrosCargos > 0 ? { TotalOtrosCargos: f(calc.totalOtrosCargos) } : {}),
        MedioPago: (doc.medioPago.length ? doc.medioPago : ['01']).map(m => ({ TipoMedioPago: m, ...(m === '99' && doc.medioPagoOtros ? { MedioPagoOtros: doc.medioPagoOtros.slice(0, 100) } : {}) })),
        TotalComprobante: f(calc.totalComprobante),
      },
      ...(doc.referencia ? {
        InformacionReferencia: {
          TipoDocIR: TIPO_DOCUMENTO_CODIGO[doc.referencia.tipoDocumento] ?? '01',
          Numero: doc.referencia.numero,
          FechaEmisionIR: doc.referencia.fecha,
          Codigo: doc.referencia.codigo,
          Razon: doc.referencia.razon,
        },
      } : {}),
      ...(doc.observaciones ? { Otros: { OtroTexto: doc.observaciones } } : {}),
    },
  };

  const xml = create(obj).end({ prettyPrint: true });
  return { xml, clave, calculo: calc };
}
