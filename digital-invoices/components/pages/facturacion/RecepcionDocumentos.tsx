'use client';
import { Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  C, FONT, PageHeader, TabBar, Button, StatusBadge, BulkActionBar, EmptyState, Toast,
} from '@/components/ui/primitives';
import { pedirTareas, useTareasHechas } from '@/lib/tareasCliente';
import GenerarAsientoBoton from './GenerarAsientoBoton';
import AsientoVinculado from './AsientoVinculado';
import CambiarActividadModal from './CambiarActividadModal';
import { useModulos } from '@/lib/modulosCliente';
import { usePermisos } from '@/lib/permisosCliente';
import FacturasCompraLista, { useFacturasCompra, URL_NUEVA_FEC } from './FacturasCompraLista';
import DocumentosTable, { type DocColumn, type RowAction } from './DocumentosTable';
import ImportarComprasModal from './ImportarComprasModal';
import EmitirAcuseModal from './EmitirAcuseModal';
import RegistrarCompraManualModal from './RegistrarCompraManualModal';
import { parsearCompraXml } from '@/lib/xmlCompra';
import { descargarAcuseCompra } from './pdfAcuseCompra';
import { CREDITO_CORTO, CREDITO_OPCIONES, CompraRow, CorreoRow, EmisorInfo, fecha, sinAcuse, ESTILO_ACUSE } from './comprasComun';
import { soloDigitos } from '@/lib/xmlCompra';
import { MontoCelda } from '@/components/ui/Monto';
import NuevaCompraMenu from './NuevaCompraMenu';
import { useListaFiltrable } from '@/components/ui/ListaFiltrable';
import { NumeroYClave } from '@/components/ui/NumeroClave';
import { ESTADO_DOC_OPCIONES } from '@/data/estadosHacienda';
import EmisorCompra, { type ProveedorPerfil } from './EmisorCompraPanel';
import { esGuatemalaActual, nombreMonedaLocal, simboloLocal } from '@/lib/paisActual';
import { usePaisEmpresa } from '@/lib/paisCliente';
import CompraFisicaModal from './CompraFisicaModal';

type Etapa = 'por_importar' | 'sin_xml' | 'sin_acuse' | 'aceptada' | 'rechazada';
interface Fila {
  key: string;
  etapa: Etapa;
  proveedor: string;
  identificacion: string;
  tipo: string;
  consecutivo: string;
  clave?: string | null;
  fecha: string;
  origen: string;
  credito: CompraRow['tipo_credito_fiscal'] | null;
  total: number | null;
  moneda: string | null;
  correo?: CorreoRow;
  compra?: CompraRow;
}

// Función y no constante: el símbolo depende del país de la empresa
const monedas = () => [{ value: 'CRC', label: `${nombreMonedaLocal(true)} (${simboloLocal()})` }, { value: 'USD', label: 'Dólares ($)' }];
const ORIGEN_LABEL: Record<string, string> = { xml: 'XML', correo: 'Correo', manual: 'Manual', auto: 'Correo automático', fisica: 'Compra física' };
const ORDEN_ETAPA: Record<Etapa, number> = { por_importar: 0, sin_acuse: 1, sin_xml: 2, aceptada: 3, rechazada: 3 };

const TABS: { id: 'todas' | Etapa | 'pendientes' | 'fec'; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'por_importar', label: 'Por importar' },
  // Mismo proceso en los dos países: sin emitir, aceptadas o rechazadas. En Costa Rica
  // se emite el acuse a Hacienda; en Guatemala la compra se acepta o se rechaza
  // (las aceptadas entran al libro de compras).
  { id: 'sin_acuse', label: 'Sin emitir' },
  { id: 'aceptada', label: 'Aceptadas' },
  { id: 'rechazada', label: 'Rechazadas' },
  { id: 'fec', get label() { return esGuatemalaActual() ? 'Facturas especiales' : 'Facturas electrónicas de compra'; } },
];

// Candado: dato que ya no se puede cambiar (va en el acuse enviado a Hacienda)
const IcCandado = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round" aria-label="Bloqueada"><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>
);

function badge(f: Fila) {
  const gt = esGuatemalaActual();
  switch (f.etapa) {
    case 'por_importar': return <StatusBadge label="Por importar" color="blue" />;
    case 'sin_xml': return <StatusBadge label="Sin XML" color="gray" />;
    case 'sin_acuse': return <StatusBadge label="Sin emitir" color="yellow" />;
    case 'aceptada': return <StatusBadge label={f.compra?.tipo_acuse === 'parcial' ? (gt ? 'Aceptada con diferencia' : 'Aceptado parcial') : gt ? 'Aceptada' : 'Aceptado'} color="green" />;
    default: return <StatusBadge label={gt ? 'Rechazada' : 'Rechazado'} color="red" />;
  }
}

export default function RecepcionDocumentos() {
  return <Suspense fallback={null}><RecepcionContenido /></Suspense>;
}

function RecepcionContenido() {
  const [compras, setCompras] = useState<CompraRow[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorPerfil[]>([]);
  const [correos, setCorreos] = useState<CorreoRow[]>([]);
  const [emisores, setEmisores] = useState<EmisorInfo[]>([]);
  const [cambiarAct, setCambiarAct] = useState<{ ids: string[]; actual?: string | null } | null>(null);
  const [cargando, setCargando] = useState(true);

  // ?tab=fec (al volver de emitir una factura de compra) abre esa pestaña
  const tabUrl = useSyncExternalStore(() => () => {}, () => new URLSearchParams(window.location.search).get('tab'), () => null);
  const [tabManual, setTab] = useState<number | null>(null);
  const tab = tabManual ?? Math.max(0, TABS.findIndex(t => t.id === tabUrl));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowMenu, setRowMenu] = useState<string | null>(null);

  const [importar, setImportar] = useState<{ open: boolean; correos: CorreoRow[] }>({ open: false, correos: [] });
  const [acusar, setAcusar] = useState<CompraRow[]>([]);
  const [fisicaOpen, setFisicaOpen] = useState(false);
  const { gt } = usePaisEmpresa();
  // El detalle de una compra es una página, igual que el de Ventas
  const setDetalle = (c: CompraRow | null) => { if (c) window.location.href = `/facturacion/recepcion/${encodeURIComponent(c.id)}`; };
  const [manualOpen, setManualOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const cerrarToast = useCallback(() => setToast(null), []);

  const [version, setVersion] = useState(0);
  const cargar = useCallback(() => setVersion(v => v + 1), []);
  // Al abrir Compras se revisa el buzón si ya le toca (revisión automática)
  useTareasHechas(d => {
    setVersion(v => v + 1);   // también trae los asientos que se completaron solos
    if (!d.buzon?.nuevos) return;
    setToast({ message: `Llegaron facturas nuevas al buzón: ${d.buzon.mensaje}`, type: 'success' });
  });
  useEffect(() => { pedirTareas(); }, []);
  useEffect(() => {
    let vivo = true;
    Promise.all([
      fetch('/api/recepcion').then(r => r.json()),
      fetch('/api/correos').then(r => r.json()),
      fetch('/api/emisores').then(r => r.json()).catch(() => []),
      fetch('/api/clientes?tipo=proveedor').then(r => r.json()).catch(() => []),
    ]).then(([c, m, e, pv]) => {
      if (!vivo) return;
      setCompras(c); setCorreos(m); setEmisores(e); setProveedores(pv); setCargando(false);
    });
    return () => { vivo = false; };
  }, [version]);

  const buzon = emisores.find(e => Number(e.activo) === 1)?.correo_electronico ?? null;

  // ── Filas: correos sin importar + compras registradas ─────────────────────
  const filas: Fila[] = useMemo(() => {
    const deCorreos: Fila[] = correos.filter(c => !c.importado).map(c => {
      // Correo del buzón real: se muestran los datos del XML adjunto.
      const x = c.xml ? parsearCompraXml(c.xml) : null;
      const d = x?.ok ? x.doc : null;
      return {
      key: 'correo-' + c.id, etapa: c.tiene_adjunto_xml ? 'por_importar' : 'sin_xml',
      proveedor: d?.proveedor || c.remitente, identificacion: d?.proveedorIdentificacion ?? '', tipo: d ? d.tipo : 'Correo recibido', consecutivo: d?.consecutivo || c.asunto, clave: d?.clave ?? null,
      fecha: d?.fechaEmision?.slice(0, 10) || c.fecha, origen: 'Correo', credito: null, total: d?.totalComprobante ?? null, moneda: d?.moneda ?? null, correo: c,
      };
    });
    const deCompras: Fila[] = compras.map(r => ({
      key: r.id, etapa: sinAcuse(r) ? 'sin_acuse' : r.estado === 'Rechazado' ? 'rechazada' : 'aceptada',
      proveedor: r.proveedor, identificacion: r.proveedor_identificacion ?? '', tipo: r.tipo ?? 'Factura electrónica',
      consecutivo: r.numero_factura, fecha: r.fecha_emision, origen: ORIGEN_LABEL[r.origen] ?? r.origen,
      credito: r.tipo_credito_fiscal, total: r.total_factura, moneda: r.moneda, compra: r,
    }));
    return [...deCorreos, ...deCompras].sort((a, b) => ORDEN_ETAPA[a.etapa] - ORDEN_ETAPA[b.etapa] || b.fecha.localeCompare(a.fecha));
  }, [correos, compras]);

  const conteo = useMemo(() => ({
    por_importar: filas.filter(f => f.etapa === 'por_importar').length,
    sin_acuse: filas.filter(f => f.etapa === 'sin_acuse').length,
    auto: filas.filter(f => f.etapa === 'sin_acuse' && f.compra?.origen === 'auto').length,
  }), [filas]);

  const tabId = TABS[tab].id;
  const fecs = useFacturasCompra(version);
  const conteoTab = (id: string) => id === 'fec' ? (fecs?.length ?? 0) : id === 'todas' ? filas.length : id === 'por_importar' ? filas.filter(f => f.etapa === 'por_importar' || f.etapa === 'sin_xml').length : filas.filter(f => f.etapa === id).length;
  const porTab = useMemo(() => filas.filter(f => {
    if (tabId === 'por_importar') return f.etapa === 'por_importar' || f.etapa === 'sin_xml';
    return tabId === 'todas' || f.etapa === tabId;
  }), [filas, tabId]);
  const lista = useListaFiltrable({
    items: porTab, prefijo: 'rc_',
    texto: f => `${f.proveedor} ${f.identificacion} ${f.consecutivo} ${f.compra?.clave ?? ''}`,
    placeholder: `Buscar por emisor, ${gt ? 'NIT' : 'cédula'} o consecutivo`,
    defs: [
      { tipo: 'fecha', clave: 'fecha', label: 'Fecha de emisión', valor: f => f.fecha },
      { tipo: 'lista', clave: 'origen', label: 'Origen', opciones: ['XML', 'Correo', 'Correo automático', 'Manual', ...(gt ? ['Compra física'] : [])].map(x => ({ value: x, label: x })), valor: f => f.origen },
      { tipo: 'lista', clave: 'iva', label: 'Condición del IVA', opciones: CREDITO_OPCIONES.map(o => ({ value: o.value, label: o.label })), valor: f => f.credito ?? '' },
      { tipo: 'lista', clave: 'moneda', label: 'Moneda', opciones: monedas(), valor: f => (f.moneda ?? 'CRC').toUpperCase() },
    ],
    derecha: buzon ? (
      <span style={{ fontSize: 11.5, color: C.n700, whiteSpace: 'nowrap' }}>
        Buzón: <b style={{ color: C.n900, fontWeight: 500 }}>{buzon}</b>
        <button onClick={() => { navigator.clipboard?.writeText(buzon); setToast({ message: 'Correo copiado.', type: 'success' }); }}
          style={{ marginLeft: 6, background: 'none', border: 'none', color: C.brand, cursor: 'pointer', fontSize: 11.5, fontFamily: FONT, textDecoration: 'underline', padding: 0 }}>Copiar</button>
      </span>
    ) : undefined,
  });
  const pagina = lista.filasPagina;
  // Facturas electrónicas de compra (emitidas por la empresa): mismos filtros que Ventas
  const listaFec = useListaFiltrable({
    items: fecs ?? [], prefijo: 'fec_',
    texto: f => `${f.id} ${f.numero_factura} ${f.cliente_nombre} ${f.receptor_identificacion ?? ''}`,
    placeholder: `Buscar por proveedor, número o ${gt ? 'NIT' : 'cédula'}`,
    defs: [
      { tipo: 'fecha', clave: 'fecha', label: 'Fecha de emisión', valor: f => f.fecha_emision },
      { tipo: 'lista', clave: 'estado', label: 'Estado', opciones: ESTADO_DOC_OPCIONES, valor: f => f.estado },
      { tipo: 'lista', clave: 'moneda', label: 'Moneda', opciones: monedas(), valor: f => (f.moneda ?? 'CRC').toUpperCase() },
    ],
  });

  // ── Acciones ──────────────────────────────────────────────────────────────
  const existentes = useMemo(() => ({
    claves: new Set(compras.map(c => c.clave).filter(Boolean) as string[]),
    consecutivos: new Set(compras.map(c => c.numero_factura + '|' + soloDigitos(c.proveedor_identificacion ?? ''))),
  }), [compras]);

  const abrirImportarCorreos = (cs: CorreoRow[]) => setImportar({ open: true, correos: cs.filter(c => c.tiene_adjunto_xml) });
  const descargarAcuse = (r: CompraRow) => descargarAcuseCompra({
    id: r.id, proveedor: r.proveedor, numeroFactura: r.numero_factura, fechaEmision: r.fecha_emision,
    fechaAceptacion: r.fecha_aceptacion, estado: r.tipo_acuse === 'parcial' ? 'Aceptado parcialmente' : r.estado, totalFactura: r.total_factura,
  });
  async function descartarCorreos(ids: string[]) {
    await Promise.all(ids.map(id => fetch(`/api/correos/${id}`, { method: 'DELETE' })));
    setToast({ message: `${ids.length} correo${ids.length === 1 ? '' : 's'} descartado${ids.length === 1 ? '' : 's'}.`, type: 'success' });
    cargar();
  }
  // Descarga un .zip con los XML (y respuestas de Hacienda) de las compras
  function exportarXml(ids: string[]) {
    if (!ids.length) return;
    const a = document.createElement('a');
    a.href = `/api/recepcion/exportar?ids=${encodeURIComponent(ids.join(','))}`;
    a.download = '';
    document.body.appendChild(a); a.click(); a.remove();
  }


  // Selección → qué se puede hacer con lo seleccionado
  const sel = filas.filter(f => selected.has(f.key));
  const selImportables = sel.filter(f => f.etapa === 'por_importar').map(f => f.correo!);
  const selAcusables = sel.filter(f => f.etapa === 'sin_acuse').map(f => f.compra!);
  const selConAcuse = sel.filter(f => f.etapa === 'aceptada' || f.etapa === 'rechazada').map(f => f.compra!);
  const selCorreos = sel.filter(f => f.correo).map(f => f.correo!.id);
  const selCompras = sel.filter(f => f.compra).map(f => f.compra!.id);
  const limpiarSel = () => setSelected(new Set());

  // Mismo criterio que Ventas: una acción principal solo si hay algo pendiente
  // (importar o emitir el acuse); lo demás va en el menú ⋯, por grupos.
  function accionPrincipal(f: Fila) {
    if (f.etapa === 'por_importar') return <Button variant="secondary" onClick={() => abrirImportarCorreos([f.correo!])} style={{ height: 28 }}>Importar</Button>;
    if (f.etapa === 'sin_acuse') return <Button variant="secondary" onClick={() => setAcusar([f.compra!])} style={{ height: 28 }}>{gt ? 'Aceptar o rechazar' : 'Emitir acuse'}</Button>;
    if (f.etapa === 'sin_xml') return <span style={{ fontSize: 11, color: C.n700 }}>Sin XML adjunto</span>;
    return null;
  }

  const { contabilidad } = useModulos();
  const { puede } = usePermisos();
  const columnas: DocColumn<Fila>[] = [
    { key: 'proveedor', label: 'Emisor', wrap: true, render: f => (
      <div style={{ minWidth: 170, maxWidth: 240 }}>
        <EmisorCompra nombre={f.proveedor} identificacion={f.identificacion} correo={f.compra?.proveedor_correo} compras={compras} proveedores={proveedores}
          onVerComprobante={f.compra ? () => setDetalle(f.compra!) : f.etapa === 'por_importar' ? () => abrirImportarCorreos([f.correo!]) : undefined} />
        {f.identificacion && <div style={{ fontSize: 11, color: C.n700 }}>{esGuatemalaActual() ? 'NIT' : 'Céd.'} {f.identificacion}</div>}
        {contabilidad && f.compra?.cuenta_proveedor && <div style={{ fontSize: 10.5, color: C.n700, fontVariantNumeric: 'tabular-nums' }}>Cta. {f.compra.cuenta_proveedor}</div>}
      </div>
    ) },
    { key: 'comprobante', label: 'Comprobante', wrap: true, render: f => (
      <div>
        <div>{f.tipo}</div>
        {f.compra
          ? <button onClick={() => setDetalle(f.compra!)} style={{ display: 'block', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: FONT, marginTop: 2 }}>
              <NumeroYClave numero={f.consecutivo} clave={f.compra.clave} />
            </button>
          : f.correo && /^\d{20}$/.test(f.consecutivo)
          ? <div style={{ marginTop: 2 }}><NumeroYClave numero={f.consecutivo} clave={f.clave} /></div>
          : <div style={{ fontSize: 11, color: C.n700, fontVariantNumeric: 'tabular-nums', fontStyle: 'italic', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.consecutivo}</div>}
      </div>
    ) },
    { key: 'fecha', label: 'Fecha', render: f => fecha(f.fecha) },
    { key: 'origen', label: 'Origen', render: f => f.compra?.origen === 'auto'
      ? <span title="Proveedor conocido: se importó sola desde el buzón con las cuentas de la vez anterior." style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: C.brandBg, color: C.brand, border: `1px solid ${C.brandBd}`, whiteSpace: 'nowrap' }}>Automática</span>
      : f.correo && f.identificacion ? <span title="Primera factura de este proveedor: impórtala una vez y las siguientes llegan solas." style={{ color: C.n700, whiteSpace: 'nowrap' }}>Proveedor nuevo</span>
      : <span style={{ color: C.n700 }}>{f.origen}</span> },
    { key: 'credito', label: 'IVA', render: f => f.credito ? CREDITO_CORTO[f.credito] : <span style={{ color: C.n700 }}>-</span> },
    { key: 'actividad', label: 'Actividad', render: f => f.compra?.actividad_economica
        ? <span title={sinAcuse(f.compra) ? f.compra.actividad_economica : `${f.compra.actividad_economica} · ${gt ? 'Ya registrada: no se puede cambiar' : 'Declarada en el acuse: ya no se puede cambiar'}`} style={{ fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {f.compra.actividad_economica.split(' - ')[0]}{!sinAcuse(f.compra) && <IcCandado />}
          </span>
        : <span style={{ color: C.n700 }}>—</span> },
    { key: 'estado', label: 'Estado', render: f => <div>{badge(f)}</div> },
    { key: 'asiento', label: 'Asiento', render: f => f.compra?.asiento_consecutivo
        ? <AsientoVinculado documentoId={f.compra.id} consecutivo={f.compra.asiento_consecutivo} compacto />
        : f.compra?.estado === 'Aceptado'
          ? <GenerarAsientoBoton url={`/api/recepcion/${f.compra.id}/asiento`} compacto />
          : <span style={{ color: C.n700 }} title={gt ? 'El asiento se genera al aceptar la compra.' : 'El asiento se genera al emitir el acuse de aceptación.'}>—</span> },
    { key: 'total', label: 'Total', align: 'right', render: f => f.total == null ? <span style={{ color: C.n700 }}>-</span> : <span style={{ display: 'inline-block', minWidth: 110 }}><MontoCelda valor={f.total} moneda={f.moneda} fuerte /></span> },
  ];

  function accionesSecundarias(f: Fila): RowAction<Fila>[] {
    if (f.correo) return [
      { label: 'Ver correo e importar', grupo: 0, onClick: () => abrirImportarCorreos([f.correo!]) },
      { label: 'Eliminar', danger: true, grupo: 2, onClick: () => descartarCorreos([f.correo!.id]) },
    ];
    const r = f.compra!;
    return [
      { label: 'Ver detalle', grupo: 0, onClick: () => setDetalle(r) },
      { label: 'Descargar XML', grupo: 0, onClick: () => exportarXml([r.id]) },
      // Con el acuse emitido la actividad ya fue declarada a Hacienda: no se cambia más
      ...(sinAcuse(r) ? [{ label: 'Cambiar actividad', grupo: 1, onClick: () => setCambiarAct({ ids: [r.id], actual: r.actividad_economica }) }] : []),
      ...(sinAcuse(r) ? [] : [{ label: gt ? 'Descargar constancia' : 'Descargar acuse', grupo: 0, onClick: () => descargarAcuse(r) }]),
      ...(sinAcuse(r) ? [] : [{ label: gt ? 'Cambiar registro' : 'Cambiar acuse', grupo: 1, onClick: () => setAcusar([r]) }]),
    ];
  }

  // Cada botón de «resolver todo» aparece solo en su bandeja
  const accionPestana = tabId === 'por_importar'
    ? <Button variant="secondary" disabled={!conteo.por_importar} onClick={() => abrirImportarCorreos(filas.filter(f => f.etapa === 'por_importar').map(f => f.correo!))}>Importar pendientes ({conteo.por_importar})</Button>
    : tabId === 'sin_acuse'
      ? <Button disabled={!conteo.sin_acuse} onClick={() => setAcusar(filas.filter(f => f.etapa === 'sin_acuse').map(f => f.compra!))} style={ESTILO_ACUSE}>{gt ? 'Aceptar todas' : 'Emitir acuse a todas'} ({conteo.sin_acuse})</Button>
      : tabId === 'aceptada' || tabId === 'rechazada' || tabId === 'todas'
        ? <Button variant="secondary" disabled={!filas.some(f => f.compra)} onClick={() => exportarXml(porTab.filter(f => f.compra).map(f => f.compra!.id))}>Exportar XML</Button>
        : null;

  const vacio = lista.hayFiltros && porTab.length > 0 ? lista.vacio('') : tabId === 'por_importar'
    ? <EmptyState message={`No hay facturas por importar. Aquí quedan las de proveedores nuevos: las de proveedores que ya importaste llegan solas a Sin emitir.`} />
    : tabId === 'sin_acuse'
      ? <EmptyState message={gt ? 'Todas las compras importadas ya están aceptadas o rechazadas.' : 'Todas las compras importadas ya tienen acuse.'} />
      : <EmptyState message={filas.length === 0 ? 'Todavía no hay compras. Importa los XML de tus proveedores para empezar.' : 'No hay compras que coincidan con los filtros aplicados.'}
          action={filas.length === 0 ? <Button onClick={() => setImportar({ open: true, correos: [] })}>Importar XML</Button> : undefined} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT }}>
      <PageHeader title="Documentos Recibidos (Compras)">
        <NuevaCompraMenu
          importar={puede('fe.compras.importar') ? [
            { label: 'Importar XML', ayuda: 'Los XML que te enviaron tus proveedores, del correo o de tu computadora.', onClick: () => setImportar({ open: true, correos: [] }) },
            { label: 'Importar desde Excel', ayuda: 'Varias compras sin XML a la vez, con la plantilla de Excel.', onClick: () => setManualOpen(true) },
          ] : []}
          documentos={[
            ...(puede('fe.compras.fec') ? [gt
              ? { label: 'Factura especial', ayuda: 'La emites tú cuando el vendedor no está inscrito en el IVA; retiene ISR e IVA.', onClick: () => { window.location.href = URL_NUEVA_FEC; } }
              : { label: 'Factura electrónica de compra', ayuda: 'La emites tú cuando el proveedor no está inscrito y no te factura.', onClick: () => { window.location.href = URL_NUEVA_FEC; } }] : []),
            ...(gt && puede('fe.compras.importar') ? [
              { label: 'Compra física', ayuda: 'Factura en papel u otro documento que no pasa por un certificador.', onClick: () => setFisicaOpen(true) },
            ] : []),
          ]} />
      </PageHeader>

      <TabBar
        tabs={TABS.map(t => ({ label: t.label, count: conteoTab(t.id) }))}
        active={tab} onChange={i => { setTab(i); limpiarSel(); }} actions={accionPestana} />

      {tabId === 'fec' ? listaFec.barra : lista.barra}

      {conteo.auto > 0 && (tabId === 'todas' || tabId === 'sin_acuse') && !lista.seleccion('origen').has('Correo automático') && (
        <div style={{ margin: '12px 24px 0', padding: '10px 14px', border: `1px solid ${C.brandBd}`, background: C.brandBg, borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 240 }}><b style={{ fontWeight: 600 }}>{conteo.auto} factura{conteo.auto === 1 ? '' : 's'} se importaron solas desde el correo.</b> Son de proveedores que ya habías importado y llevan las mismas cuentas. Solo falta el acuse.</span>
          <Button variant="secondary" onClick={() => { setTab(TABS.findIndex(t => t.id === 'sin_acuse')); lista.ponerLista('origen', ['Correo automático']); }}>Ver solo esas</Button>
        </div>
      )}

      <BulkActionBar count={selected.size} onClose={limpiarSel} actions={[
        ...(selImportables.length ? [{ label: `Importar (${selImportables.length})`, onClick: () => { abrirImportarCorreos(selImportables); limpiarSel(); } }] : []),
        ...(selAcusables.length ? [{ label: `${gt ? 'Aceptar o rechazar' : 'Emitir acuse'} (${selAcusables.length})`, onClick: () => { setAcusar(selAcusables); limpiarSel(); } }] : []),
        ...(selConAcuse.length ? [{ label: `${gt ? 'Descargar constancias' : 'Descargar acuses'} (${selConAcuse.length})`, variant: 'outline' as const, onClick: () => { selConAcuse.forEach(descargarAcuse); limpiarSel(); } }] : []),
        ...(selAcusables.length ? [{ label: `Cambiar actividad (${selAcusables.length})`, variant: 'outline' as const, onClick: () => { setCambiarAct({ ids: selAcusables.map(c => c.id) }); limpiarSel(); } }] : []),
        ...(selCompras.length ? [{ label: `Descargar XML (${selCompras.length})`, variant: 'outline' as const, onClick: () => { exportarXml(selCompras); limpiarSel(); } }] : []),
        ...(selCorreos.length ? [{ label: `Eliminar (${selCorreos.length})`, variant: 'danger' as const, onClick: () => { descartarCorreos(selCorreos); limpiarSel(); } }] : []),
      ]} />

      {/* La tabla scrollea sola; la paginación queda fija en su propio pie. */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 24px 0' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: 16 }}>
          {tabId === 'fec' ? <FacturasCompraLista filas={fecs ? listaFec.filasPagina : null} total={fecs?.length ?? 0} contabilidad={contabilidad} vacio={listaFec.vacio('')} /> : cargando ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p> : (
            <DocumentosTable
              columns={contabilidad ? columnas : columnas.filter(c => c.key !== 'asiento')}
              rows={pagina}
              rowKey={f => f.key}
              selected={selected}
              onToggleAll={checked => setSelected(s => {
                const n = new Set(s);
                pagina.forEach(f => { if (checked) n.add(f.key); else n.delete(f.key); });
                return n;
              })}
              onToggleRow={(id, checked) => setSelected(s => { const n = new Set(s); if (checked) n.add(id); else n.delete(id); return n; })}
              openMenuId={rowMenu}
              onOpenMenuChange={setRowMenu}
              rowActions={accionesSecundarias}
              accionFija={accionPrincipal}
              onRowClick={f => { if (f.compra) setDetalle(f.compra); else if (f.etapa === 'por_importar' && f.correo) abrirImportarCorreos([f.correo]); }}
              empty={vacio}
            />
          )}
        </div>
      </div>
      {!cargando && (tabId === 'fec' ? (fecs?.length ? listaFec.paginacion : null) : lista.paginacion)}

      {cambiarAct && <CambiarActividadModal ids={cambiarAct.ids} actual={cambiarAct.actual} emisores={emisores} onClose={() => setCambiarAct(null)}
        onHecho={m => { setCambiarAct(null); setToast({ message: m, type: 'success' }); setVersion(v => v + 1); }} />}
      {importar.open && <ImportarComprasModal
        key={importar.correos.map(c => c.id).join(',') || 'archivos'}
        open
        correos={importar.correos}
        existentes={existentes}
        emisores={emisores}
        onClose={() => setImportar({ open: false, correos: [] })}
        onExcel={importar.correos.length ? undefined : () => { setImportar({ open: false, correos: [] }); setManualOpen(true); }}
        onImportado={r => {
          setToast({
            message: r.fallidas.length
              ? `${r.importadas} importada${r.importadas === 1 ? '' : 's'}; ${r.fallidas.length} no: ${r.fallidas.join('; ')}`
              : `${r.importadas} compra${r.importadas === 1 ? '' : 's'} importada${r.importadas === 1 ? '' : 's'}${r.conAcuse ? (gt ? ' y aceptadas' : ' con acuse emitido') : ''}${r.asientos?.length ? ` · asiento${r.asientos.length === 1 ? '' : 's'} ${r.asientos.join(', ')}` : ''}.${r.automaticas ? ` Además se importaron solas ${r.automaticas} factura${r.automaticas === 1 ? '' : 's'} más de esos proveedores que esperaban en la bandeja.` : ''}`,
            type: r.fallidas.length && !r.importadas ? 'error' : 'success',
          });
          cargar();
        }}
      />}
      {fisicaOpen && <CompraFisicaModal onClose={() => setFisicaOpen(false)} onCreado={msg => { setToast({ message: msg, type: 'success' }); cargar(); }} />}
      {acusar.length > 0 && <EmitirAcuseModal
        compras={acusar}
        emisores={emisores}
        onClose={() => setAcusar([])}
        onHecho={r => {
          setAcusar([]);
          setToast({
            message: r.fallidas ? (gt ? `${r.ok} compra${r.ok === 1 ? '' : 's'} procesada${r.ok === 1 ? '' : 's'}, ${r.fallidas} con error.` : `${r.ok} acuse${r.ok === 1 ? '' : 's'} emitido${r.ok === 1 ? '' : 's'}, ${r.fallidas} con error.`)
              : `${gt ? `${r.ok} ${r.tipo === 'rechazo' ? 'compra rechazada' : 'compra aceptada'}${r.ok === 1 ? '' : 's'}` : `${r.ok} ${r.tipo === 'rechazo' ? 'rechazo' : 'acuse'}${r.ok === 1 ? '' : 's'} emitido${r.ok === 1 ? '' : 's'}`}${r.asientos?.length ? ` · asiento${r.asientos.length === 1 ? '' : 's'} ${r.asientos.join(', ')}` : ''}.`,
            type: r.fallidas ? 'error' : 'success',
          });
          cargar();
        }}
      />}
      {manualOpen && <RegistrarCompraManualModal open onClose={() => setManualOpen(false)} onCreado={msg => { if (msg) setToast({ message: msg, type: 'success' }); cargar(); }} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={cerrarToast} />}
    </div>
  );
}
