'use client';
// Configuración › Facturación: tipos de cobro, impuestos, exoneración, descuentos y folios externos.
import { useDato } from '../store';
import { CrudCatalogo } from '../CrudCatalogo';
import { CUENTAS_OPC, MONEDAS_OPC, type TipoCobro } from '../datos';

// ── Catálogos simples ───────────────────────────────────────────────────────
const TIPOS_COBRO = ['Efectivo', 'Tarjeta de crédito', 'Tarjeta de débito', 'Transferencia', 'Cuenta crédito', 'Crédito habitación', 'Crédito interno'];
export function TiposCobro() {
  const [l, set] = useDato('tiposCobro');
  const detalle = [
    { key: 'digitosTC' as const, label: 'Dígitos T.C.', tipo: 'select' as const, opciones: ['4', '6', '16'], placeholder: 'Selecciona', span: 3 as const },
    { key: 'comision' as const, label: 'Comisión', tipo: 'number' as const, span: 3 as const },
    { key: 'terminal' as const, label: 'Terminal de cobro T.C.', tipo: 'select' as const, opciones: ['BAC Credomatic', 'BCR', 'Banco Nacional'], placeholder: 'Selecciona' },
    { key: 'cuenta' as const, label: 'Cuenta', tipo: 'select' as const, opciones: CUENTAS_OPC, placeholder: 'Selecciona' },
    { key: 'cuentaPropinas' as const, label: 'Cuenta propinas', tipo: 'select' as const, opciones: CUENTAS_OPC, placeholder: 'Selecciona' },
  ];
  return (
    <CrudCatalogo<TipoCobro> entidad="tipo de cobro" filas={l} onChange={set} nombre={t => t.codigo} buscarEn={['codigo', 'descripcion']}
      nuevo={() => ({ codigo: '', descripcion: '', moneda: MONEDAS_OPC[0], tipo: '', detallado: false, ctaFija: false, digitosTC: '', comision: 0, terminal: '', cuenta: '', cuentaPropinas: '' })}
      columnas={[
        { key: 'codigo', label: 'Código', link: true }, { key: 'descripcion', label: 'Descripción' }, { key: 'moneda', label: 'Moneda' }, { key: 'tipo', label: 'Tipo' },
        { key: 'detallado', label: 'Detallado', tipo: 'check', editable: true, ancho: 80 }, { key: 'ctaFija', label: 'Cta. Fija', tipo: 'check', editable: true, ancho: 80 },
      ]}
      contador={false}
      detalle={{ titulo: t => `${t.codigo} - ${t.descripcion}`, campos: detalle }}
      campos={[
        { key: 'codigo', label: 'Código', requerido: true, unico: true, placeholder: 'Ej: CASH_BACK', span: 3 },
        { key: 'descripcion', label: 'Descripción', requerido: true, span: 3 },
        { key: 'moneda', label: 'Moneda', tipo: 'select', opciones: MONEDAS_OPC, requerido: true, placeholder: 'Selecciona moneda', span: 3 },
        { key: 'tipo', label: 'Tipo', tipo: 'select', opciones: TIPOS_COBRO, requerido: true, placeholder: 'Selecciona tipo', span: 3 },
        ...detalle,
        { key: 'detallado', label: 'Detallado', tipo: 'checkbox', span: 3 }, { key: 'ctaFija', label: 'Cuenta fija', tipo: 'checkbox', span: 3 },
      ]} />
  );
}
export function Impuestos() {
  const [l, set] = useDato('impuestos');
  return (
    <CrudCatalogo entidad="impuesto" filas={l} onChange={set} nombre={t => t.descripcion} buscarEn={['descripcion']}
      nuevo={() => ({ descripcion: '', porcentaje: 0, nivel: 1, moneda: '', cuenta: '', canje: false, apSup: false })}
      columnas={[
        { key: 'descripcion', label: 'Descripción', link: true }, { key: 'porcentaje', label: 'Porcentaje', tipo: 'num', ancho: 90 }, { key: 'nivel', label: 'Nivel', ancho: 60 },
        { key: 'moneda', label: 'Moneda' }, { key: 'cuenta', label: 'Cuenta' },
        { key: 'canje', label: 'Canje', tipo: 'check', editable: true, ancho: 60 }, { key: 'apSup', label: 'Ap. Sup.', tipo: 'check', editable: true, ancho: 70 },
      ]}
      contador={false}
      campos={[
        { key: 'descripcion', label: 'Descripción', requerido: true, unico: true, placeholder: 'Ej: IVA 13%' },
        { key: 'porcentaje', label: 'Porcentaje', tipo: 'number', span: 3, sufijo: '%' },
        { key: 'nivel', label: 'Nivel', tipo: 'number', span: 3, hint: 'Orden en que se calcula sobre el monto' },
        { key: 'moneda', label: 'Moneda', tipo: 'select', opciones: MONEDAS_OPC, requerido: true, placeholder: 'Selecciona moneda' },
        { key: 'cuenta', label: 'Cuenta', tipo: 'select', opciones: CUENTAS_OPC, requerido: true, placeholder: 'Selecciona cuenta' },
        { key: 'canje', label: 'Canje', tipo: 'checkbox', span: 3 }, { key: 'apSup', label: 'Requiere aprobación de supervisor', tipo: 'checkbox', span: 3 },
      ]}
      validar={i => (i.porcentaje < 0 || i.porcentaje > 100 ? 'El porcentaje debe estar entre 0 y 100.' : undefined)} />
  );
}
export function Exoneracion() {
  const [l, set] = useDato('exoneraciones');
  return (
    <CrudCatalogo entidad="exoneración" femenino filas={l} onChange={set} nombre={t => t.descripcion} buscarEn={['descripcion']} nuevo={() => ({ descripcion: '' })}
      columnas={[{ key: 'descripcion', label: 'Descripción', link: true }]}
      campos={[{ key: 'descripcion', label: 'Descripción', requerido: true, unico: true, placeholder: 'Ej: Compras Autorizadas, Zonas Francas' }]} />
  );
}
export function Descuentos() {
  const [l, set] = useDato('descuentos');
  return (
    <CrudCatalogo entidad="descuento" filas={l} onChange={set} nombre={t => t.descripcion} buscarEn={['descripcion']}
      nuevo={() => ({ descripcion: '', porcentaje: 0, moneda: '', tipo: '', cuenta: '', contrasena: '', visible: true })}
      columnas={[
        { key: 'descripcion', label: 'Descripción', link: true }, { key: 'porcentaje', label: 'Porcentaje', tipo: 'num', ancho: 90 }, { key: 'moneda', label: 'Moneda' },
        { key: 'tipo', label: 'Tipo' }, { key: 'cuenta', label: 'Cuenta' },
        { key: 'contrasena', label: 'Contraseña', render: d => (d.contrasena ? '••••••' : '-') },
        { key: 'visible', label: 'Visible', tipo: 'check', editable: true, ancho: 60 },
      ]}
      contador={false}
      campos={[
        { key: 'descripcion', label: 'Descripción', requerido: true, unico: true, placeholder: 'Descuento 5%' },
        { key: 'porcentaje', label: 'Porcentaje', tipo: 'number', span: 3, sufijo: '%' },
        { key: 'moneda', label: 'Moneda', tipo: 'select', opciones: MONEDAS_OPC, placeholder: 'Selecciona', span: 3 },
        { key: 'tipo', label: 'Tipo', tipo: 'select', opciones: ['Punto de Venta', 'Front Desk', 'Ambos'], requerido: true, placeholder: 'Selecciona tipo' },
        { key: 'cuenta', label: 'Cuenta', tipo: 'select', opciones: CUENTAS_OPC, placeholder: 'Selecciona cuenta' },
        { key: 'contrasena', label: 'Contraseña', tipo: 'password', placeholder: 'Agrega una contraseña', hint: 'Se pedirá al aplicar el descuento' },
        { key: 'visible', label: 'Visible', tipo: 'checkbox' },
      ]}
      validar={d => (d.porcentaje < 0 || d.porcentaje > 100 ? 'El porcentaje debe estar entre 0 y 100.' : undefined)} />
  );
}
export function FoliosExternos() {
  const [l, set] = useDato('foliosExternos');
  const [descuentos] = useDato('descuentos');
  const [impuestos] = useDato('impuestos');
  const detalle = [
    { key: 'descuento' as const, label: 'Descuento', tipo: 'select' as const, opciones: descuentos.map(d => d.descripcion), placeholder: 'Selecciona' },
    { key: 'cuenta' as const, label: 'Cuenta', tipo: 'select' as const, opciones: CUENTAS_OPC, placeholder: 'Selecciona' },
    { key: 'impuesto' as const, label: 'Impuestos', tipo: 'select' as const, opciones: impuestos.map(d => d.descripcion), placeholder: 'Selecciona' },
  ];
  return (
    <CrudCatalogo entidad="folio externo" filas={l} onChange={set} nombre={t => `${t.codigo} - ${t.descripcion}`} buscarEn={['codigo', 'descripcion']}
      nuevo={() => ({ codigo: String(Math.max(0, ...l.map(f => Number(f.codigo) || 0)) + 1), descripcion: '', ctaCasa: false, canje: false, inactFact: false, moneda: '', proxTarj: 1, limite: 0, descuento: '', cuenta: '', impuesto: '' })}
      columnas={[
        { key: 'codigo', label: 'Código', link: true, ancho: 70 }, { key: 'descripcion', label: 'Descripción' },
        { key: 'ctaCasa', label: 'Cta. Casa', tipo: 'check', editable: true, ancho: 70 }, { key: 'canje', label: 'Canje', tipo: 'check', editable: true, ancho: 60 },
        { key: 'inactFact', label: 'Inact. Facturación', tipo: 'check', editable: true, ancho: 110 },
        { key: 'moneda', label: 'Moneda' }, { key: 'proxTarj', label: 'Próx. Tarj.', ancho: 80 }, { key: 'limite', label: 'Límite', tipo: 'num', ancho: 90 },
      ]}
      contador={false}
      detalle={{ titulo: f => `${f.codigo} - ${f.descripcion}`, campos: detalle }}
      campos={[
        { key: 'codigo', label: 'Código', requerido: true, unico: true, span: 2 },
        { key: 'descripcion', label: 'Descripción', requerido: true, placeholder: 'Ej: Cuenta casa', span: 4 },
        { key: 'moneda', label: 'Moneda', tipo: 'select', opciones: MONEDAS_OPC, requerido: true, placeholder: 'Selecciona moneda', span: 3 },
        { key: 'limite', label: 'Límite', tipo: 'number', span: 3 },
        { key: 'ctaCasa', label: 'Cuenta de casa', tipo: 'checkbox', span: 2 }, { key: 'canje', label: 'Canje', tipo: 'checkbox', span: 2 },
        { key: 'inactFact', label: 'Inactivo en facturación', tipo: 'checkbox', span: 2 },
        ...detalle,
      ]} />
  );
}
