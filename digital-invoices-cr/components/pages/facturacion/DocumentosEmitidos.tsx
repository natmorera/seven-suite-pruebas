'use client';
import { ESTADO_DOC_COLOR, ESTADO_DOC_AYUDA, ESTADO_DOC_OPCIONES, type EstadoDocumento } from '@/data/estadosHacienda';
import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  C, FONT, PageHeader, TabBar,
  Button, StatusBadge, Checkbox, Dropdown, BulkActionBar, Toast,
} from '@/components/ui/primitives';
import ModalEnviarCorreo from '@/components/ui/ModalEnviarCorreo';
import { MontoCelda } from '@/components/ui/Monto';
import RecurrenciaModal, { type Recurrencia } from './RecurrenciaModal';
import RecurrentesLista from './RecurrentesLista';
import RefacturarModal from './RefacturarModal';
import { labelFrecuencia } from '@/lib/recurrencia';
import { useListaFiltrable } from '@/components/ui/ListaFiltrable';
import { NumeroYClave } from '@/components/ui/NumeroClave';
import { pedirTareas, useTareasHechas } from '@/lib/tareasCliente';
import { IcEdit } from '@/components/ui/icons';
import { CONDICIONES_VENTA, labelCondicionVenta } from '@/data/catalogosHacienda';
import NuevoDocumentoModal from './NuevoDocumentoModal';
import { descargarComprobantePdf } from './pdfComprobante';
import DocumentosTable, { type DocColumn } from './DocumentosTable';
import DescargarDocumentosModal from './DescargarDocumentosModal';
import ErrorHaciendaModal from './ErrorHaciendaModal';
import { RegistrarAbonoModal, periodoIvaAbono, type EstadoCredito } from './AbonosFactura';
import GenerarAsientoBoton from './GenerarAsientoBoton';
import ImportarExternoModal from './ImportarExternoModal';
import { useModulos } from '@/lib/modulosCliente';
import { usePermisos } from '@/lib/permisosCliente';
import { accionesDocumento } from './accionesDocumento';
import ChecklistFE from './ChecklistFE';
import OrigenModulo, { moduloDe } from '@/components/ui/OrigenModulo';

export interface DocumentoRow {
  id: string;
  tipo: string;
  numero_factura: string;
  clave: string;
  cliente_nombre: string;
  receptor_email: string | null;
  receptor_copias?: string | null;
  fecha_emision: string;
  estado: EstadoDocumento;
  recurrente: number;
  condicion_venta: string;
  moneda: string;
  total: number;
  xml: string;
  respuesta_xml: string | null;
  origen: string;
  origen_referencia: string | null;
  estado_envio: string;
  ultimo_error: string | null;
  referencia_documento: string | null;
  referencia_motivo: string | null;
  asiento_consecutivo: string | null;
  envio_correo?: string | null;
  reemplazado_por?: string | null;
  recibo_de?: string | null;
  importado?: number | null;
  reemplaza_a?: string | null;
  anulado_en_origen?: number | null;
  emitida_sola?: number | null;
}

// Ícono de «se repite» (flechas en círculo)
const IcRecurrente = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" />
  </svg>
);
const hoyISO = () => new Date().toISOString().slice(0, 10);
function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
}
function ir(url: string) { window.location.assign(url); }

const ESTADO_COLOR = ESTADO_DOC_COLOR;
const ESTADO_OPTIONS = ESTADO_DOC_OPCIONES;

// El documento casi nunca nace aquí tecleado a mano: en un hotel real llega
// desde los módulos vecinos de la suite (Front Desk al hacer check-out,
// Punto de Venta al cerrar una cuenta, Inventario, Tour Operador). 'Manual'
// es la excepción, así que este filtro/columna importa para poder auditar
// de dónde salió cada factura.
// Cada módulo de origen con el isotipo y su sigla: FDK (Front Desk), POS,
// ACC (Accounting: creado aquí), TO (Tour Operador) e INV (Inventario).
const ORIGEN_OPTIONS = ['Manual', 'Front Desk', 'Punto de Venta (POS)', 'Tour Operador', 'Inventario'].map(v => ({ value: v, label: `${moduloDe(v).sigla} · ${moduloDe(v).nombre}` }));

// Columnas de Ventas. Para que la tabla quepa en la pantalla sin desplazarse
// (como en Compras), los datos del documento van juntos en una sola columna:
// ID y número (la clave está en el detalle). El asiento tiene su columna.
// La acción principal y el menú ⋯ quedan fijos a la derecha.
const ESTILO_SUB = { display: 'block', fontSize: 11, color: C.n700, marginTop: 2 } as const;
const ALL_COLUMNS: DocColumn<DocumentoRow>[] = [
  { key: 'documento', label: 'Documento', render: r => (
    <div>
      <a href={`/facturacion/emitidos/${r.id.replace('#', '')}`} style={{ color: C.brand, fontWeight: 500, textDecoration: 'underline' }}>{r.id}</a>
      {/* Número consecutivo (20 dígitos) y clave numérica (50), completos */}
      {(r.numero_factura || r.clave) && <div style={{ marginTop: 2 }}><NumeroYClave numero={r.numero_factura} clave={r.clave} /></div>}
    </div>
  ) },
  { key: 'cliente', label: 'Cliente', wrap: true, render: r => (
    <div style={{ minWidth: 110, maxWidth: 170 }}>
      <span>{r.cliente_nombre || <span style={{ color: C.n700 }}>Consumidor final</span>}</span>
    </div>
  ) },
  { key: 'origen', label: 'Origen', render: r => <OrigenModulo origen={r.origen} referencia={r.origen_referencia} /> },
  { key: 'referencia', label: 'Referencia', wrap: true, render: r => r.referencia_documento
      ? <span style={{ fontSize: 11.5, display: 'block', maxWidth: 240 }} title={r.referencia_documento}><NumeroYClave numero={r.referencia_documento.length === 50 ? null : r.referencia_documento} clave={r.referencia_documento.length === 50 ? r.referencia_documento : null} />{r.referencia_motivo ? <span style={{ ...ESTILO_SUB, whiteSpace: 'normal' }}>{r.referencia_motivo}</span> : null}</span>
      : <span style={{ color: C.n700 }}>-</span> },
  { key: 'fecha_emision', label: 'Fecha', sortable: true, render: r => fmtFecha(r.fecha_emision) },
  { key: 'condicion', label: 'Condición', render: () => null },
  { key: 'abono', label: 'Abono a la factura', wrap: true, render: () => null },
  { key: 'estado', label: 'Estado', render: r => {
      // Una sola nota bajo el estado: la más importante
      const nota = Number(r.importado) === 1 ? { t: 'Importada de otro sistema', c: C.n700 }
        : r.envio_correo === 'sin_correo' ? { t: 'Sin enviar: sin correo', c: C.error }
        : r.envio_correo === 'error' || r.estado_envio === 'error' ? { t: 'No se pudo enviar', c: C.error }
        : r.reemplazado_por ? { t: `Refacturada en ${r.reemplazado_por}`, c: C.n700 }
        : r.reemplaza_a ? { t: `Reemplaza a ${r.reemplaza_a}`, c: C.n700 }
        : Number(r.anulado_en_origen) === 1 ? { t: `Anulada en ${moduloDe(r.origen).sigla}`, c: C.n700 } : null;
      return (
        <div>
          <StatusBadge label={r.estado} color={ESTADO_COLOR[r.estado] ?? 'yellow'} title={ESTADO_DOC_AYUDA[r.estado]} />
          {nota && <span style={{ ...ESTILO_SUB, color: nota.c }}>{nota.t}</span>}
        </div>
      );
    } },
  { key: 'asiento', label: 'Asiento', render: r => r.asiento_consecutivo
      ? <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.asiento_consecutivo}</span>
      : r.estado === 'Aceptado' && Number(r.importado) !== 1
        ? <GenerarAsientoBoton url={`/api/documentos/${r.id.replace('#', '')}/asiento`} compacto />
        : <span style={{ color: C.n700 }} title="El asiento se genera solo cuando Hacienda acepta el documento.">—</span> },
  { key: 'total', label: 'Total', sortable: true, align: 'right', render: r => <span style={{ display: 'inline-block', minWidth: 104, whiteSpace: 'nowrap' }}><MontoCelda valor={r.total} moneda={r.moneda} fuerte /></span> },
];

// Esta pantalla es VENTAS: la factura de compra va en Compras y el recibo
// electrónico de pago no se crea desde este listado. Nota de crédito y nota
// de débito comparten pestaña, con un filtro de tipo adentro.
const TABS_VENTAS = ['Factura electrónica', 'Tiquete electrónico', 'Notas de crédito/débito', 'Factura de exportación', 'Recibos de pago', 'Recurrentes'];
// Pestañas cuyo nombre no es el del tipo de documento
const TAB_A_TIPO: Record<string, string> = { 'Recibos de pago': 'Recibo Electrónico de Pago' };
const tipoDeTab = (t: string) => TAB_A_TIPO[t] ?? t;
const CON_RECIBO = ['08', '10'];   // condiciones con IVA al cobro: cada pago lleva recibo
const TIPOS_CREABLES = ['Factura electrónica', 'Nota de crédito', 'Nota de débito', 'Tiquete electrónico', 'Factura de exportación'];

// Todas las pestañas tienen las mismas columnas, en el mismo orden; solo
// cambian Condición (facturas) y Referencia (notas y recibos).
const BASE_COLUMNAS = ['documento', 'cliente', 'origen', 'fecha_emision', 'estado', 'asiento', 'total'];
const conColumna = (extra: string) => [...BASE_COLUMNAS.slice(0, 4), extra, ...BASE_COLUMNAS.slice(4)];
const COLUMNAS_POR_TIPO: Record<string, string[]> = {
  'Factura electrónica': conColumna('condicion'),
  'Notas de crédito/débito': conColumna('referencia'),
  'Tiquete electrónico': BASE_COLUMNAS,
  'Factura de exportación': BASE_COLUMNAS,
  'Recibos de pago': conColumna('abono'),
};

export default function DocumentosEmitidos() {
  return <Suspense fallback={null}><DocumentosEmitidosContenido /></Suspense>;
}

function DocumentosEmitidosContenido() {
  // ?tab=recurrentes (desde el Dashboard) abre esa pestaña
  const tabUrl = useSyncExternalStore(() => () => {}, () => new URLSearchParams(window.location.search).get('tab'), () => null);
  const [tabManual, setTab] = useState<number | null>(null);
  const tab = tabManual ?? (tabUrl === 'recurrentes' ? TABS_VENTAS.indexOf('Recurrentes') : 0);
  const [rows, setRows] = useState<DocumentoRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [colsOpen, setColsOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [crearTipo, setCrearTipo] = useState<string | null>(null);
  // Con NC y ND unidas en una sola pestaña, hace falta poder filtrar cuál
  // de las dos se está viendo.
  // Un set de columnas visibles POR pestaña (cada una recuerda su propia
  // selección de "Columnas"), inicializado con todas las columnas que le
  // corresponden según COLUMNAS_POR_TIPO.
  const [visibleColsPorTipo, setVisibleColsPorTipo] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {};
    for (const t of TABS_VENTAS) init[t] = new Set(COLUMNAS_POR_TIPO[t] ?? []);
    return init;
  });
  const [descargarRow, setDescargarRow] = useState<DocumentoRow | null>(null);
  const [correoRow, setCorreoRow] = useState<DocumentoRow | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [recurrenciaRow, setRecurrenciaRow] = useState<DocumentoRow | null>(null);
  const [refacturarRow, setRefacturarRow] = useState<DocumentoRow | null>(null);
  const [errorRow, setErrorRow] = useState<DocumentoRow | null>(null);
  const [pagoRow, setPagoRow] = useState<DocumentoRow | null>(null);
  const [importarExterno, setImportarExterno] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [recurrencias, setRecurrencias] = useState<Recurrencia[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Carga con contador de versión: `cargar()` pide recargar y el efecto
  // hace el fetch (sin setState síncrono dentro del efecto).
  const [version, setVersion] = useState(0);
  // Ventas a crédito con recibo de pago: saldo, IVA y plazo de 90 días
  const [creditoDe, setCreditoDe] = useState<Map<string, EstadoCredito>>(new Map());
  useEffect(() => {
    let vivo = true;
    fetch('/api/recibos-pago/pendientes').then(r => r.json()).then((l: EstadoCredito[]) => {
      if (vivo && Array.isArray(l)) setCreditoDe(new Map(l.map(c => [c.facturaId, c])));
    }).catch(() => {});
    return () => { vivo = false; };
  }, [version]);
  const cargar = () => setVersion(v => v + 1);
  // Al abrir Ventas se corren las tareas pendientes (recurrentes automáticas)
  useTareasHechas(d => {
    const { emitidas, sinCorreo } = d.recurrentes;
    setVersion(v => v + 1);   // también trae los asientos que se completaron solos
    if (!emitidas.length) return;
    const n = emitidas.length;
    const aviso = sinCorreo.length ? ` ${sinCorreo.length} no se envi${sinCorreo.length === 1 ? 'ó' : 'aron'} porque el receptor no tiene correo.` : '';
    setToast({ message: `Se emitieron solas ${n} factura${n === 1 ? '' : 's'} recurrente${n === 1 ? '' : 's'}.${aviso}`, type: sinCorreo.length ? 'error' : 'success' });
  });
  useEffect(() => { pedirTareas(); }, []);
  useEffect(() => {
    let vivo = true;
    fetch('/api/documentos').then(r => r.json()).then(d => { if (vivo) { setRows(d); setCargando(false); } }).catch(() => { if (vivo) setCargando(false); });
    fetch('/api/recurrentes').then(r => r.json()).then(d => { if (vivo) setRecurrencias(d); }).catch(() => {});
    return () => { vivo = false; };
  }, [version]);
  const recDe = useMemo(() => new Map(recurrencias.map(r => [r.documento_id, r])), [recurrencias]);
  const porEmitir = recurrencias.filter(r => Number(r.activa) === 1 && r.proxima <= hoyISO());


  const tipoActivo = TABS_VENTAS[tab];
  // Todas las pestañas muestran cuántos documentos tienen
  const conteoTab = (t: string) => t === 'Recurrentes' ? recurrencias.filter(r => Number(r.activa) === 1).length
    : t === 'Notas de crédito/débito' ? rows.filter(r => (r.tipo === 'Nota de crédito' || r.tipo === 'Nota de débito') && r.estado !== 'Borrador').length
    : rows.filter(r => r.tipo === tipoDeTab(t) && r.estado !== 'Borrador').length;   // solo emitidas
  const esTabNotas = tipoActivo === 'Notas de crédito/débito';

  // Documentos de la pestaña; los filtros (lineamientos) se aplican encima
  const porTab = useMemo(() => rows.filter(r => esTabNotas ? (r.tipo === 'Nota de crédito' || r.tipo === 'Nota de débito') : r.tipo === tipoDeTab(tipoActivo)), [rows, tipoActivo, esTabNotas]);
  // Saldo de las ventas a crédito con IVA al cobro (lo que falta por cobrar con recibos)
  const saldoDe = useMemo(() => {
    const cobrado = new Map<string, number>();
    for (const r of rows) if (r.tipo === 'Recibo Electrónico de Pago' && r.recibo_de && !['Rechazado', 'Borrador', 'Error'].includes(r.estado)) cobrado.set(r.recibo_de, (cobrado.get(r.recibo_de) ?? 0) + Number(r.total));
    return (r: DocumentoRow) => Math.max(0, Math.round((Number(r.total) - (cobrado.get(r.id) ?? 0)) * 100) / 100);
  }, [rows]);
  const cobraConRecibo = (r: DocumentoRow) => r.tipo === 'Factura electrónica' && r.estado === 'Aceptado' && CON_RECIBO.includes(r.condicion_venta);
  const lista = useListaFiltrable({
    items: porTab, prefijo: 'v_', tamanoInicial: 25, unaFila: true, anchoBusqueda: 200,
    texto: r => `${r.id} ${r.numero_factura} ${r.cliente_nombre} ${r.clave ?? ''}`,
    placeholder: 'Buscar cliente, número o clave',
    defs: [
      { tipo: 'fecha', clave: 'fecha', label: 'Fecha', valor: r => r.fecha_emision },
      ...(esTabNotas ? [{ tipo: 'lista' as const, clave: 'nota', label: 'Tipo de nota', opciones: [{ value: 'Nota de crédito', label: 'Nota de crédito' }, { value: 'Nota de débito', label: 'Nota de débito' }], valor: (r: DocumentoRow) => r.tipo }] : []),
      { tipo: 'lista', clave: 'estado', label: 'Estado', opciones: ESTADO_OPTIONS, valor: r => r.estado },
      { tipo: 'lista', clave: 'cond', label: 'Condición', opciones: CONDICIONES_VENTA.map(c => ({ value: c.value, label: c.label })), valor: r => r.condicion_venta },
      { tipo: 'lista', clave: 'origen', label: 'Origen', opciones: ORIGEN_OPTIONS, valor: r => r.origen },
      { tipo: 'lista', clave: 'moneda', label: 'Moneda', opciones: [{ value: 'CRC', label: 'Colones (₡)' }, { value: 'USD', label: 'Dólares ($)' }], valor: r => (r.moneda ?? 'CRC').toUpperCase() },
      ...(tipoActivo === 'Factura electrónica' ? [{ tipo: 'check' as const, clave: 'rec', label: 'Solo recurrentes', cumple: (r: DocumentoRow) => recDe.has(r.id) }] : []),
      // Aquí se ven las emitidas; lo que todavía no se emitió (borradores) solo con este filtro
      { tipo: 'check', clave: 'noemit', label: 'Ver borradores', oculta: true, cumple: r => r.estado === 'Borrador' },
    ],
    derecha: (
      <Dropdown align="right" open={colsOpen} onOpenChange={setColsOpen} width={260}
        trigger={<Button variant="secondary" icon={<IcEdit className="w-3.5 h-3.5" />} onClick={() => {}}>Columnas</Button>}>
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ALL_COLUMNS.filter(c => (COLUMNAS_POR_TIPO[tipoActivo] ?? []).includes(c.key)).map(c => (
            <Checkbox key={c.key} label={c.label} checked={(visibleColsPorTipo[tipoActivo] ?? new Set(COLUMNAS_POR_TIPO[tipoActivo] ?? [])).has(c.key)}
              onChange={checked => setVisibleColsPorTipo(s => {
                const n = new Set(s[tipoActivo] ?? COLUMNAS_POR_TIPO[tipoActivo] ?? []); if (checked) n.add(c.key); else n.delete(c.key);
                return { ...s, [tipoActivo]: n };
              })} />
          ))}
        </div>
      </Dropdown>
    ),
  });
  const filtered = lista.filtrados;

  // Sin Contabilidad (solo facturación) no hay columna Asiento
  const { contabilidad } = useModulos();
  const { puede } = usePermisos();
  const columnasDelTipo = ALL_COLUMNS.filter(c => (COLUMNAS_POR_TIPO[tipoActivo] ?? []).includes(c.key) && (contabilidad || c.key !== 'asiento'));
  const visibleCols = visibleColsPorTipo[tipoActivo] ?? new Set(COLUMNAS_POR_TIPO[tipoActivo] ?? []);
  // La condición de venta lleva debajo la recurrencia (si la tiene)
  // Recibo de pago: a qué factura abona, n.º de abono, IVA (y en qué mes se declara) y saldo que deja
  const columnaAbono = (c: DocColumn<DocumentoRow>): DocColumn<DocumentoRow> => ({
    ...c, render: (r: DocumentoRow) => {
      const e = r.recibo_de ? creditoDe.get(r.recibo_de) : undefined;
      const i = e ? e.abonos.findIndex(a => a.id === r.id) : -1;
      if (!e || i < 0) return <span style={{ color: C.n700 }}>-</span>;
      const a = e.abonos[i];
      const valido = (x: { estado: string }) => !['Rechazado', 'Borrador', 'Error'].includes(x.estado);
      const cobrado = e.abonos.slice(0, i + 1).filter(valido).reduce((s, x) => s + x.total, 0);
      const saldo = Math.max(0, Math.round((e.total - cobrado) * 100) / 100);
      const m = (n: number) => `${e.moneda === 'USD' ? '$' : '₡'}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return (
        <div style={{ minWidth: 170, maxWidth: 200, fontSize: 12 }}>
          <a href={`/facturacion/emitidos/${String(r.recibo_de).replace('#', '')}`} style={{ color: C.brand, fontVariantNumeric: 'tabular-nums' }}>{e.numero}</a>
          <span style={ESTILO_SUB}>Abono {i + 1} de {e.abonos.length} · IVA {m(a.iva)}</span>
          <span style={ESTILO_SUB}>IVA: {periodoIvaAbono(a, e.fechaLimite)}</span>
          <span style={{ ...ESTILO_SUB, color: saldo <= 0 ? C.success : C.n700 }}>{saldo <= 0 ? 'Factura cobrada por completo' : `Saldo: ${m(saldo)}`}</span>
        </div>
      );
    },
  });
  const columns = columnasDelTipo.filter(c => visibleCols.has(c.key)).map(c => c.key === 'abono' ? columnaAbono(c) : c.key !== 'condicion' ? c : {
    ...c, render: (r: DocumentoRow) => {
      const rec = recDe.get(r.id);
      const vence = rec && Number(rec.activa) === 1 && rec.proxima <= hoyISO();
      return (
        <div>
          <span>{labelCondicionVenta(r.condicion_venta)}</span>
          {cobraConRecibo(r) && (() => {
            const c = creditoDe.get(r.id);
            const saldo = c?.saldo ?? saldoDe(r);
            if (saldo <= 0) return <span style={{ display: 'block', fontSize: 11, color: C.success, marginTop: 2 }}>Con recibo · cobrada</span>;
            const alerta = c && (c.vencido || c.diasRestantes <= 15);
            return <span style={{ display: 'block', fontSize: 11, color: alerta ? C.error : C.n700, marginTop: 2 }}>
              Con recibo · saldo {r.moneda === 'USD' ? '$' : '₡'}{saldo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {c && <span style={{ display: 'block' }}>{c.vencido ? 'Día 90 cumplido: IVA declarado' : `Día 90 en ${c.diasRestantes} día${c.diasRestantes === 1 ? '' : 's'}`}</span>}
            </span>;
          })()}
          {rec && (
            <button onClick={() => setRecurrenciaRow(r)} title="Editar recurrencia" style={{ display: 'block', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 3, fontFamily: FONT, textAlign: 'left' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.n900 }}><IcRecurrente /> {labelFrecuencia(rec.frecuencia)}</span>
              <span style={{ display: 'block', fontSize: 10.5, color: vence ? C.error : C.n700 }}>{Number(rec.activa) !== 1 ? 'Terminada' : vence ? `Siguiente pendiente en Recurrentes (${fmtFecha(rec.proxima + 'T12:00:00')})` : `Siguiente: ${fmtFecha(rec.proxima + 'T12:00:00')}`}</span>
            </button>
          )}
        </div>
      );
    },
  });

  function toggleAll(checked: boolean) { setSelected(checked ? new Set(filtered.map(r => r.id)) : new Set()); }
  function toggleRow(id: string, checked: boolean) { setSelected(s => { const n = new Set(s); if (checked) n.add(id); else n.delete(id); return n; }); }

  function pdfDe(r: DocumentoRow) { return descargarComprobantePdf(r.id, 'carta'); }
  async function descargarSeleccionados() { for (const r of filtered.filter(x => selected.has(x.id))) await pdfDe(r); }

  // Un documento emitido no se elimina (ya tiene número ante Hacienda); se
  // anula con una nota de crédito. Solo los borradores se pueden borrar.
  const esBorrador = (d: DocumentoRow) => d.estado === 'Borrador';
  async function eliminarBorradores(docs: DocumentoRow[]) {
    const borradores = docs.filter(esBorrador);
    if (!borradores.length) return;
    if (!window.confirm(borradores.length === 1 ? '¿Eliminar este borrador?' : `¿Eliminar ${borradores.length} borradores?`)) return;
    const ids = new Set(borradores.map(d => d.id));
    setRows(rs => rs.filter(x => !ids.has(x.id)));
    await Promise.all(borradores.map(d => fetch(`/api/documentos/${d.id.replace('#', '')}`, { method: 'DELETE' })));
    setSelected(new Set());
    setToast({ message: borradores.length === 1 ? 'Se eliminó el borrador.' : `Se eliminaron ${borradores.length} borradores.`, type: 'success' });
    cargar();
  }

  async function enviarCorreo(r: DocumentoRow, datos: { para: string[]; mensaje: string; adjuntos: string[] }) {
    setEnviando(true);
    const res = await fetch(`/api/documentos/${r.id.replace('#', '')}/reenviar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos),
    });
    const data = await res.json().catch(() => ({}));
    setEnviando(false);
    if (!res.ok) { setToast({ message: data.error ?? 'No se pudo enviar el correo.', type: 'error' }); return; }
    setCorreoRow(null);
    setToast({ message: `Se envió a ${datos.para.join(', ')}.`, type: 'success' });
  }
  // Reenvío en lote: cada documento a su propio receptor (correo y copias)
  async function reenviarVarios(docs: DocumentoRow[]) {
    const conCorreo = docs.filter(d => d.receptor_email);
    const sin = docs.length - conCorreo.length;
    if (!conCorreo.length) { setToast({ message: 'Ninguno de los seleccionados tiene correo del receptor. Reenvíalos uno por uno.', type: 'error' }); return; }
    if (!window.confirm(`¿Reenviar ${conCorreo.length} documento${conCorreo.length === 1 ? '' : 's'} a su receptor?${sin ? ` ${sin} no tiene${sin === 1 ? '' : 'n'} correo y se omite${sin === 1 ? '' : 'n'}.` : ''}`)) return;
    await Promise.all(conCorreo.map(d => fetch(`/api/documentos/${d.id.replace('#', '')}/reenviar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ para: [d.receptor_email, ...String(d.receptor_copias ?? '').split(/[\s,;]+/)].filter(Boolean), adjuntos: ['xml'] }),
    })));
    setSelected(new Set());
    setToast({ message: `Se reenviaron ${conCorreo.length} documento${conCorreo.length === 1 ? '' : 's'}.${sin ? ` ${sin} sin correo.` : ''}`, type: 'success' });
  }
  function emitirRecurrente(r: DocumentoRow) {
    const rec = recDe.get(r.id);
    if (!rec) return;
    ir(`/facturacion/emitidos/nuevo?tipo=${encodeURIComponent(r.tipo)}&repetir=${encodeURIComponent(r.id.replace('#', ''))}&recurrencia=${encodeURIComponent(rec.id)}`);
  }
  const seleccionados = filtered.filter(r => selected.has(r.id));

  // Acción principal de cada fila, fija a la derecha junto al menú ⋯
  function modificarYRefacturar(r: DocumentoRow) {
    ir(`/facturacion/emitidos/nuevo?tipo=${encodeURIComponent(r.tipo)}&corregir=${encodeURIComponent(r.id.replace('#', ''))}`);
  }
  async function reenviarHacienda(r: DocumentoRow) {
    setReenviando(true);
    const res = await fetch(`/api/documentos/${r.id.replace('#', '')}/reenviar-hacienda`, { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    setReenviando(false);
    if (!res.ok || d.error) { setToast({ message: d.error ?? 'No se pudo reenviar.', type: 'error' }); cargar(); return; }
    setErrorRow(null);
    setToast({ message: 'Se reenvió a Hacienda. El estado se actualiza en unos minutos.', type: 'success' });
    fetch(`/api/documentos/${r.id.replace('#', '')}/estado`, { method: 'POST' }).finally(cargar);
  }

  // Acciones por estado: las mismas reglas que el detalle (accionesDocumento.ts)
  function accionesDe(r: DocumentoRow) {
    const id = r.id.replace('#', '');
    const rec = recDe.get(r.id);
    const credito = creditoDe.get(r.id);
    return accionesDocumento(r, {
      recurrenteVence: Boolean(rec && Number(rec.activa) === 1 && rec.proxima <= hoyISO()),
      tieneRecurrencia: Boolean(rec),
      saldoCredito: cobraConRecibo(r) ? (credito?.saldo ?? saldoDe(r)) : null,
      tieneAbonos: Boolean(credito && credito.abonos.length),
    }, {
      ver: () => ir(`/facturacion/emitidos/${id}`),
      descargar: () => setDescargarRow(r),
      correo: () => setCorreoRow(r),
      consultar: () => { fetch(`/api/documentos/${id}/estado`, { method: 'POST' }).then(r2 => r2.json()).then(d => { setToast({ message: `Estado ante Hacienda: ${d.estado ?? 'sin cambios'}.`, type: 'success' }); cargar(); }).catch(() => {}); },
      verError: () => setErrorRow(r),
      corregir: () => modificarYRefacturar(r),
      refacturar: () => setRefacturarRow(r),
      nota: t => ir(`/facturacion/emitidos/nuevo?tipo=${encodeURIComponent(t)}&referencia=${encodeURIComponent(r.numero_factura)}`),
      recurrencia: () => setRecurrenciaRow(r),
      emitirRecurrente: () => emitirRecurrente(r),
      abono: () => setPagoRow(r),
      verAbonos: () => ir(`/facturacion/emitidos/${id}`),
      eliminarBorrador: () => eliminarBorradores([r]),
    });
  }
  // Qué permiso pide cada acción (Usuarios y permisos › Facturación electrónica)
  const PERMISO_ACCION: Record<string, string> = {
    descargar: 'fe.ventas.descargar', correo: 'fe.ventas.correo', consultar: 'fe.ventas.reenviar', reenviar: 'fe.ventas.reenviar',
    corregir: 'fe.ventas.refacturar', refacturar: 'fe.ventas.refacturar', nc: 'fe.ventas.emitir:Nota de crédito', nd: 'fe.ventas.emitir:Nota de débito',
    rec: 'fe.recurrentes.editar', 'emitir-rec': 'fe.recurrentes.emitir', abono: 'fe.recibos.abonar', borrar: 'fe.ventas.borrador',
  };
  const permitida = (id: string) => !PERMISO_ACCION[id] || puede(PERMISO_ACCION[id]);
  function accionPrincipal(r: DocumentoRow) {
    const { principal } = accionesDe(r);
    if (!principal || !permitida(principal.id)) return null;
    const alerta = principal.id === 'reenviar' || principal.id === 'corregir';
    return <Button variant="secondary" onClick={principal.onClick} style={{ height: 28, ...(alerta ? { color: C.error } : {}) }}>{principal.label}</Button>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT }}>
      <PageHeader title="Documentos Emitidos (Ventas)">
        {puede('fe.ventas.importarexterno') && <Button variant="secondary" onClick={() => setImportarExterno(true)}>Importar de otro sistema</Button>}
        {/* Sin menú intermedio: abre el modal con el tipo de la pestaña actual (se puede cambiar ahí) */}
        {puede('fe.ventas.emitir') && <Button onClick={() => setCrearTipo(({ 0: 'Factura electrónica', 1: 'Tiquete electrónico', 2: 'Nota de crédito', 3: 'Factura de exportación', 4: 'Recibo Electrónico de Pago' } as Record<number, string>)[tab] ?? 'Factura electrónica')}>Agregar documento</Button>}
      </PageHeader>

      <TabBar tabs={TABS_VENTAS.map(t => ({ label: t, count: conteoTab(t) }))} active={tab} onChange={t => { setTab(t); setSelected(new Set()); }} />
      <ChecklistFE variante="aviso" />
      {TABS_VENTAS[tab] === 'Recurrentes' ? <RecurrentesLista onCambio={cargar} /> : <>

      {lista.barra}

      {porEmitir.length > 0 && (
        <div style={{ margin: '12px 24px 0', padding: '10px 14px', borderRadius: 8, background: C.brandBg, border: `1px solid ${C.brandBd}`, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <IcRecurrente />
          <span>Tienes <b>{porEmitir.length}</b> factura{porEmitir.length === 1 ? '' : 's'} recurrente{porEmitir.length === 1 ? '' : 's'} por emitir: {porEmitir.slice(0, 3).map(p => `${p.numero_factura ?? ''} (${p.cliente_nombre ?? ''})`).join(', ')}{porEmitir.length > 3 ? '…' : ''}.</span>
          <button onClick={() => setTab(TABS_VENTAS.indexOf('Recurrentes'))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.brand, fontWeight: 500, cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, textDecoration: 'underline' }}>Ver recurrentes</button>
        </div>
      )}

      <BulkActionBar
        count={selected.size}
        onClose={() => setSelected(new Set())}
        actions={[
          ...(seleccionados.some(r => !esBorrador(r)) ? [{ label: 'Reenviar por correo', onClick: () => reenviarVarios(seleccionados.filter(r => !esBorrador(r))) }] : []),
          { label: 'Descargar PDF', onClick: descargarSeleccionados },
          ...(seleccionados.length && seleccionados.every(esBorrador) ? [{ label: 'Eliminar borradores', onClick: () => eliminarBorradores(seleccionados), variant: 'danger' as const }] : []),
        ]}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 24px 0' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: 16 }}>
          {cargando ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p> : (
            <DocumentosTable
              columns={columns}
              rows={lista.filasPagina}
              empty={lista.vacio(`Todavía no hay documentos de tipo ${tipoActivo.toLowerCase()}.`)}
              rowKey={r => r.id}
              selected={selected}
              onToggleAll={toggleAll}
              onToggleRow={toggleRow}
              openMenuId={rowMenu}
              onOpenMenuChange={setRowMenu}
              accionFija={accionPrincipal}
              onRowClick={r => ir(`/facturacion/emitidos/${r.id.replace('#', '')}`)}
              rowActions={r => accionesDe(r).grupos.flatMap((g, i) => g.filter(x => permitida(x.id)).map(x => ({ label: x.label, danger: x.peligro, grupo: i, onClick: x.onClick })))}
            />
          )}
        </div>
      </div>
      {!cargando && lista.paginacion}

      </>}
      <NuevoDocumentoModal open={crearTipo !== null} tipo={crearTipo ?? TIPOS_CREABLES[0]} onClose={() => setCrearTipo(null)} />
      <DescargarDocumentosModal open={descargarRow !== null} doc={descargarRow} onClose={() => setDescargarRow(null)} />
      {correoRow && (
        <ModalEnviarCorreo titulo="Reenviar por correo" subtitulo={`${correoRow.tipo} ${correoRow.numero_factura} · ${correoRow.cliente_nombre}`} para={[correoRow.receptor_email, correoRow.receptor_copias].filter(Boolean).join(', ')} enviando={enviando}
          adjuntos={[{ id: 'xml', label: 'Comprobante electrónico (XML)', marcado: true }]}
          onEnviar={d => enviarCorreo(correoRow, d)} onClose={() => setCorreoRow(null)} />
      )}
      {recurrenciaRow && (
        <RecurrenciaModal documento={recurrenciaRow} actual={recDe.get(recurrenciaRow.id) ?? null} onClose={() => setRecurrenciaRow(null)}
          onGuardado={m => { setRecurrenciaRow(null); setToast({ message: m, type: 'success' }); cargar(); }} />
      )}
      {refacturarRow && <RefacturarModal documentoId={refacturarRow.id.replace('#', '')} onClose={() => setRefacturarRow(null)}
        onEmitido={m => { setRefacturarRow(null); setToast({ message: m, type: 'success' }); cargar(); }} />}
      {importarExterno && <ImportarExternoModal onClose={() => setImportarExterno(false)} onHecho={m => { setToast({ message: m, type: 'success' }); cargar(); }} />}
      {pagoRow && <RegistrarAbonoModal facturaId={pagoRow.id} onClose={() => setPagoRow(null)}
        onHecho={m => { setPagoRow(null); setToast({ message: m, type: 'success' }); cargar(); }} />}
      {errorRow && <ErrorHaciendaModal doc={errorRow} onClose={() => setErrorRow(null)} reenviando={reenviando}
        onRefacturar={errorRow.reemplazado_por ? undefined : () => modificarYRefacturar(errorRow)} onReenviar={() => reenviarHacienda(errorRow)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
