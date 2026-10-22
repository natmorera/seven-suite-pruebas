'use client';
import { useEffect, useMemo, useState } from 'react';
import { conContabilidad } from '@/lib/modulosCliente';
import { useRouter, useSearchParams } from 'next/navigation';
import { C, FONT, radius, Input, Select, Button, Checkbox, Modal } from '@/components/ui/primitives';
import { condicionesVenta, mediosPago, medioInicial, condicionesVentaPermitidas, codigoTarifaDesdePorcentaje, tarifaPorcentaje } from '@/data/catalogosHacienda';
import { calcularDocumento, esServicio, CODIGOS_REFERENCIA, TIPOS_OTRO_CARGO, type DescuentoLinea, type ExoneracionLinea, type OtroImpuestoLinea } from '@/lib/calculoFactura';
import ProductoRapidoModal from './ProductoRapidoModal';
import NuevaLineaModal, { type ValorLinea } from './NuevaLineaModal';
import { guardarFacturaEnCurso, leerFacturaEnCurso, borrarFacturaEnCurso } from './facturaEnCurso';
import { ModoRecurrencia, type ModoRec } from './RecurrenciaModal';
import { useUnidades } from './useUnidades';
import { FRECUENCIAS, siguienteFecha, labelFrecuencia } from '@/lib/recurrencia';
import {
  ClienteCombobox, ClienteModal, CabysPicker, ItemPicker, DescuentoModal, ImpuestoModal, DatalistActividades,
  RECEPTOR_VACIO, receptorDesdeCliente, labelTipoId, TARIFA_LABEL_CORTA,
  type ClienteRow, type Receptor, type FavoritoCabys, type ExoneracionConfig, type DescuentoConfig, type ImpuestoConfig, exoneracionDeConfig,
} from './NuevaFacturaPartes';
import { ActivarCuentaModal } from '@/components/pages/clientes/ReceptorPartes';
import ChecklistFE, { useConfiguracionFE } from './ChecklistFE';
import { usePermisos } from '@/lib/permisosCliente';
import { CuentaCampo } from './CuentaPicker';
import UbicacionCR, { nombreUbicacion, type Ubicacion } from '@/components/ui/UbicacionCR';
import { autoridad, simboloLocal } from '@/lib/paisActual';
import { usePaisEmpresa } from '@/lib/paisCliente';
import { NOMBRE_TIPO_GT, tiposCreablesGT, errorReceptorGT, tipoDteDe, leerDatosArticuloGT, ESCENARIOS_FRASE } from '@/lib/perfilPais';
import { retencionesFacturaEspecial } from '@/lib/retenciones';

function sumarDias(iso: string, dias: number) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); }

const PASOS_BLOQUEAN = ['empresa', 'actividad', 'ubicacion', 'sucursal', 'caja'];

// ── Tipos ────────────────────────────────────────────────────────────────────
interface EmisorRow {
  id: string; razon_social: string; nombre_comercial: string; cedula_juridica: string;
  actividad_economica: string; correo_electronico: string | null; telefono: string | null;
  direccion_fiscal: string | null; registro_bebidas_alcoholicas: string | null; activo: number;
  actividades_json?: string | null;
}
interface CajaRow { id: string; sucursal: string; terminal: string; nombre: string; emisor_id: string; activa: number }
interface DocRef {
  id: string; tipo: string; numero_factura: string; clave: string; cliente_id: string | null; cliente_nombre: string;
  fecha_emision: string; total: number; estado: string; moneda: string; origen?: string | null; origen_referencia?: string | null; importado?: number | null;
  lineas: { codigo_cabys: string; descripcion: string; cantidad: number; precio_unitario: number; impuesto: number; codigo_tarifa: string | null }[];
}
interface LineaForm {
  id: string; codigoCabys: string; descripcion: string; cantidad: number; precioUnitario: number; codigoTarifa: string;
  unidad: string; descuento: DescuentoLinea | null; exoneracion: ExoneracionLinea | null;
  otroImpuesto?: OtroImpuestoLinea | null;
  deInventario: boolean;   // si viene de Productos/Servicios, el CABYS ya está definido y no se busca
  codigoComercial: string; // código del vendedor (SKU), también en líneas escritas a mano
  tipoCodigo: string;      // tipo del código comercial (01 vendedor, 04 uso interno…)
  unidadComercial: string; // opcional
  tipoTransaccion: string; // opcional (v4.4)
  articuloId: string | null;
  escenarioExencion?: number | null; // Guatemala, línea sin IVA: escenario de la frase tipo 4
}
interface CargoForm { id: string; tipoDocumento: string; detalle: string; porcentaje: string; monto: string; conTercero: boolean; terceroTipo: string; terceroId: string; terceroNombre: string }
interface Referencia { tipoDocumento: string; numero: string; fecha: string; codigo: string; razon: string }
// Todo lo que se llevaba escrito, para volver a la factura desde el
// formulario avanzado de producto.
interface EstadoFactura {
  tipo: string; emisorId: string; cajaId: string; receptor: Receptor; identificarTiquete: boolean; actividadReceptor: string;
  condicionVenta: string; plazoDias: string; moneda: 'CRC' | 'USD'; tipoCambio: string; tcFuente: 'bccr' | 'manual' | null; medios: string[];
  conReferencia: boolean; referencia: Referencia; lineas: LineaForm[]; cargos: CargoForm[]; observaciones: string;
  programar: boolean; recFrecuencia: string; recProxima: string; recFin: string; recModo: ModoRec;
  repitiendo: { numero: string; cliente: string } | null; refacturando: { numero: string; cliente: string; tipo: string } | null;
}

const TIPOS_EMITIBLES = ['Factura electrónica', 'Nota de crédito', 'Nota de débito', 'Tiquete electrónico', 'Factura de exportación', 'Factura electrónica de compra', 'Recibo de anticipos'] as const;
const esCompraFec = (t: string) => t === 'Factura electrónica de compra';
const CREDITOS_COMPRA = [{ value: 'pleno', label: 'Con crédito fiscal completo' }, { value: 'parcial', label: 'Crédito fiscal parcial' }, { value: 'sin_derecho', label: 'Sin crédito fiscal' }];
const TITULO: Record<string, string> = {
  'Factura electrónica': 'Nueva factura', 'Nota de crédito': 'Nueva nota de crédito', 'Nota de débito': 'Nueva nota de débito',
  'Tiquete electrónico': 'Nuevo tiquete', 'Factura de exportación': 'Nueva factura de exportación',
  'Factura electrónica de compra': 'Nueva factura electrónica de compra',
};
const NOMBRE_CORTO: Record<string, string> = {
  'Factura electrónica': 'Factura', 'Nota de crédito': 'Nota de crédito', 'Nota de débito': 'Nota de débito',
  'Tiquete electrónico': 'Tiquete', 'Factura de exportación': 'Factura de exportación',
  'Factura electrónica de compra': 'Factura electrónica de compra',
  'Recibo de anticipos': 'Recibo de anticipos',
};
const LABEL_TIPO: Record<string, string> = {
  'Factura electrónica': 'Factura electrónica', 'Nota de crédito': 'Nota de crédito electrónica', 'Nota de débito': 'Nota de débito electrónica',
  'Tiquete electrónico': 'Tiquete electrónico', 'Factura de exportación': 'Factura electrónica de exportación',
  'Factura electrónica de compra': 'Factura electrónica de compra',
};
const FEMENINO = (t: string) => t !== 'Tiquete electrónico';
const esNota = (t: string) => t === 'Nota de crédito' || t === 'Nota de débito';
const esExportacion = (t: string) => t === 'Factura de exportación';
const esTiquete = (t: string) => t === 'Tiquete electrónico';
// Guatemala, recibo de anticipos (RANT): depósito de una reserva; solo servicios y sin impuestos
const esAnticipo = (t: string) => t === 'Recibo de anticipos';
const nuevoId = () => Math.random().toString(36).slice(2);
const lineaNueva = (tipo: string): LineaForm => ({
  id: nuevoId(), codigoCabys: '', descripcion: '', cantidad: 1, precioUnitario: 0,
  // Exportación: tarifa 0% (art. 32 RLIVA) o unidad gravable 2 en Guatemala; el recibo de anticipos, sin
  // impuestos; el resto arranca en la tarifa general (13 % o IVA 12 %).
  codigoTarifa: esExportacion(tipo) ? '01' : esAnticipo(tipo) ? '10' : '08', unidad: 'Unid', descuento: null, exoneracion: null, deInventario: false,
  codigoComercial: '', tipoCodigo: '01', unidadComercial: '', tipoTransaccion: '', articuloId: null,
});
const vacia = (l: LineaForm) => !l.codigoCabys && !l.descripcion.trim() && !l.precioUnitario;

function money(n: number, moneda: string) {
  return (moneda === 'USD' ? '$' : simboloLocal()) + '\u00a0' + (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Piezas visuales ──────────────────────────────────────────────────────────
const tarjeta = { background: '#fff', border: `1px solid ${C.n500}`, borderRadius: radius.lg, padding: 20 } as const;
function Campo({ label, children, gris }: { label: string; children: React.ReactNode; gris?: boolean }) {
  return (
    <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '6px 12px', background: gris ? C.n200 : '#fff', minHeight: 46, boxSizing: 'border-box' }}>
      <div style={{ fontSize: 10.5, color: C.n700 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.n900, marginTop: 1 }}>{children}</div>
    </div>
  );
}
const plano = { border: 'none', outline: 'none', width: '100%', fontSize: 13, fontFamily: FONT, background: 'transparent', color: C.n900, padding: 0, cursor: 'pointer' } as const;
const texto = { ...plano, cursor: 'text' } as const;
function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 10.5, color: C.n700 }}>{label}</div><div style={{ fontSize: 12.5, color: C.n900, marginTop: 2, wordBreak: 'break-word' }}>{children || <span style={{ color: C.n700 }}>-</span>}</div></div>;
}
const enlace = { background: 'none', border: 'none', padding: 0, color: C.brand, fontFamily: FONT, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' } as const;
const separador = <hr style={{ border: 'none', borderTop: `1px dashed ${C.n500}`, margin: '20px 0' }} />;

// ── Página ───────────────────────────────────────────────────────────────────
export default function NuevaFacturaPage() {
  const unidades = useUnidades();
  const router = useRouter();
  const params = useSearchParams();
  const tipoParam = params.get('tipo') ?? 'Factura electrónica';
  const tipoInicial = (TIPOS_EMITIBLES as readonly string[]).includes(tipoParam) ? tipoParam : 'Factura electrónica';

  const [tipo, setTipo] = useState<string>(tipoInicial);
  // Guatemala: nombres de los tipos de DTE; serie y número los asigna el certificador
  const { gt } = usePaisEmpresa();
  const [emisores, setEmisores] = useState<EmisorRow[]>([]);
  const [cajas, setCajas] = useState<CajaRow[]>([]);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [favoritos, setFavoritos] = useState<FavoritoCabys[]>([]);
  const [exoneraciones, setExoneraciones] = useState<ExoneracionConfig[]>([]);
  const [descuentosCat, setDescuentosCat] = useState<DescuentoConfig[]>([]);
  const [impuestosCat, setImpuestosCat] = useState<ImpuestoConfig[]>([]);
  // lineaId null: el producto se crea desde el modal «Nueva línea» y vuelve a él
  const [crearArticulo, setCrearArticulo] = useState<{ lineaId: string | null; nombre: string } | null>(null);
  const [lineaModal, setLineaModal] = useState<{ editarId?: string; inicial?: ValorLinea } | null>(null);
  // Tiquete: por defecto a consumidor final, sin bloque de receptor.
  const [identificarTiquete, setIdentificarTiquete] = useState(false);
  const restaurar = params.get('restaurar') === '1';
  const refacturarId = params.get('refacturar');
  // Factura recurrente: mismas líneas y mismo cliente que el documento original.
  const repetirId = params.get('repetir');
  // Modificar y refacturar un rechazado: mismo cliente y líneas, para corregir
  const corregirId = params.get('corregir');
  const [corrigiendo, setCorrigiendo] = useState<{ id: string; numero: string; cliente: string; origen: string; origenReferencia: string | null; motivo: string } | null>(null);
  // Nota de crédito sobre un documento de Front/POS: anularlo también allá
  const [anularEnOrigen, setAnularEnOrigen] = useState(true);
  const recurrenciaId = params.get('recurrencia');
  const [repitiendo, setRepitiendo] = useState<{ numero: string; cliente: string } | null>(null);
  const [refacturando, setRefacturando] = useState<{ numero: string; cliente: string; tipo: string } | null>(null);
  const [docsRef, setDocsRef] = useState<DocRef[] | null>(null);
  const [cargando, setCargando] = useState(true);

  const [emisorId, setEmisorId] = useState('');
  const [cajaId, setCajaId] = useState('');
  const [actividadReceptor, setActividadReceptor] = useState('');
  // Actividad de la empresa con que se emite: la asociada al cliente o la principal
  const [actividadEmisor, setActividadEmisor] = useState('');

  const [receptor, setReceptor] = useState<Receptor>(RECEPTOR_VACIO);
  const [clienteModal, setClienteModal] = useState<{ modo: 'nuevo' | 'modificar'; inicial: Receptor } | null>(null);
  const [activarCuenta, setActivarCuenta] = useState(false);
  const [creditoSinCuenta, setCreditoSinCuenta] = useState(false);

  const [condicionVenta, setCondicionVenta] = useState(gt && params.get('condicion') === '02' ? '02' : '01');
  // Guatemala, factura especial: motivo (escenario de la frase tipo 5)
  const [escenarioFesp, setEscenarioFesp] = useState(1);
  // Guatemala, factura cambiaria (a crédito): abonos programados con su vencimiento
  const [abonos, setAbonos] = useState<{ id: string; fechaVencimiento: string; monto: string; medio?: string }[]>([]);
  const [plazoDias, setPlazoDias] = useState('30');

  const [moneda, setMoneda] = useState<'CRC' | 'USD'>(esExportacion(tipoInicial) ? 'USD' : 'CRC');
  const [tipoCambio, setTipoCambio] = useState('');
  // Los ítems del inventario pueden tener precio en dólares (hospedaje) o en
  // colones (restaurante); se convierten a la moneda de la factura.
  function precioEnMoneda(f: FavoritoCabys): number {
    // El artículo guarda el precio sin IVA; en Guatemala la línea va con IVA incluido (FEL)
    const p = gt ? Math.round((Number(f.precio_unitario) || 0) * (1 + tarifaPorcentaje(codigoTarifaDesdePorcentaje(f.impuesto)) / 100) * 100) / 100 : Number(f.precio_unitario) || 0;
    const tc = Number(tipoCambio) || 0;
    const monedaItem = f.moneda === 'USD' ? 'USD' : 'CRC';
    if (!p || monedaItem === moneda) return p;
    if (!(tc > 0)) return 0; // sin tipo de cambio no se inventa un precio
    return Math.round((monedaItem === 'USD' ? p * tc : p / tc) * 100) / 100;
  }
  const [tcFuente, setTcFuente] = useState<'bccr' | 'manual' | null>(null);
  const [medios, setMedios] = useState<Set<string>>(() => new Set([medioInicial()]));
  const [medioOtro, setMedioOtro] = useState('');
  // Medios de pago desde la base (si Hacienda agrega uno, aparece aquí).
  // Guatemala usa las siglas de FEL (efectivo, tarjetas y cheque).
  const [catalogoMedios, setCatalogoMedios] = useState<{ value: string; label: string }[]>(() => mediosPago().map(m => ({ value: m.value, label: m.label })));
  useEffect(() => {
    if (gt) return;
    let vivo = true;
    fetch('/api/catalogos?nombre=medios_pago').then(r => r.json()).then((d: { value: string; label: string }[]) => { if (vivo && Array.isArray(d) && d.length) setCatalogoMedios(d); }).catch(() => {});
    return () => { vivo = false; };
  }, [gt]);

  const [conReferencia, setConReferencia] = useState(esNota(tipoInicial));
  const [referencia, setReferencia] = useState<Referencia>({
    tipoDocumento: 'Factura electrónica', numero: params.get('referencia') ?? '', fecha: '',
    codigo: tipoInicial === 'Nota de crédito' ? '03' : '04', razon: '',
  });

  const [lineas, setLineas] = useState<LineaForm[]>(() => [lineaNueva(tipoInicial)]);
  const [cargos, setCargos] = useState<CargoForm[]>([]);
  const [observaciones, setObservaciones] = useState('');
  // Programar como recurrente al crearla (solo facturas).
  const [programar, setProgramar] = useState(false);
  const [recFrecuencia, setRecFrecuencia] = useState('mensual');
  const [recProxima, setRecProxima] = useState(() => siguienteFecha(new Date().toISOString().slice(0, 10), 'mensual'));
  const [recFin, setRecFin] = useState('');
  const [recModo, setRecModo] = useState<ModoRec>('revisar');

  const [descuentoDe, setDescuentoDe] = useState<string | null>(null);
  const [impuestoDe, setImpuestoDe] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  // Ubicación del proveedor (factura de compra): se completa en su tarjeta
  const [ubic, setUbic] = useState<Ubicacion & { otrasSenas: string }>({ provincia: '', canton: '', distrito: '', otrasSenas: '' });
  const [guardandoUbic, setGuardandoUbic] = useState(false);
  async function guardarUbicacion() {
    if (!receptor.clienteId || !ubic.provincia || !ubic.canton || !ubic.distrito) return;
    setGuardandoUbic(true);
    const r = await fetch(`/api/clientes/${receptor.clienteId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provincia: ubic.provincia, canton: ubic.canton, distrito: ubic.distrito, otrasSenas: ubic.otrasSenas.trim() || null,
        ...(receptor.direccion ? {} : { direccionFiscal: [nombreUbicacion(ubic), ubic.otrasSenas.trim()].filter(Boolean).join(', ') }) }) }).catch(() => null);
    setGuardandoUbic(false);
    if (!r?.ok) { setErrores(['No se pudo guardar la ubicación del proveedor. Intenta de nuevo.']); return; }
    const u = { ...ubic, otrasSenas: ubic.otrasSenas.trim() };
    setReceptor(x => ({ ...x, ubicacion: u, direccion: x.direccion || [nombreUbicacion(u), u.otrasSenas].filter(Boolean).join(', ') }));
    setClientes(cs => cs.map(c => c.id === receptor.clienteId ? { ...c, provincia: u.provincia, canton: u.canton, distrito: u.distrito, otras_senas: u.otrasSenas } : c));
    setErrores(es => es.filter(x => !/provincia, cantón y distrito/.test(x)));
  }
  // Factura de compra: cómo se registra la compra cuando Hacienda la acepte
  const [compraCuenta, setCompraCuenta] = useState('');
  const [compraCredito, setCompraCredito] = useState<'pleno' | 'parcial' | 'sin_derecho'>('pleno');
  const configFE = useConfiguracionFE();
  const { puede } = usePermisos();
  const [guardando, setGuardando] = useState<'emitir' | 'borrador' | null>(null);
  const [resultado, setResultado] = useState<{ consecutivo: string; total: number; advertencia?: string } | null>(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    let vivo = true;
    Promise.all([
      fetch('/api/emisores').then(r => r.json()),
      fetch('/api/cajas').then(r => r.json()),
      fetch(esCompraFec(tipoInicial) ? '/api/clientes?tipo=proveedor' : '/api/clientes?receptores=1').then(r => r.json()),
      fetch('/api/cabys-favoritos').then(r => r.json()),
      fetch('/api/exoneraciones').then(r => r.json()).catch(() => []),
      esExportacion(tipoInicial) ? fetch('/api/tipo-cambio').then(r => r.json()).catch(() => null) : Promise.resolve(null),
    ]).then(([e, c, cl, fav, exo, tc]: [EmisorRow[], CajaRow[], ClienteRow[], FavoritoCabys[], ExoneracionConfig[], { valor: number; fuente: 'bccr' | 'manual' } | null]) => {
      if (!vivo) return;
      setEmisores(e); setCajas(c); setClientes(cl); setFavoritos(fav); setExoneraciones(exo);
      fetch('/api/descuentos').then(r => r.json()).then(setDescuentosCat).catch(() => {});
      fetch('/api/impuestos').then(r => r.json()).then(setImpuestosCat).catch(() => {});
      const cajaInicial = c.find(x => x.id === params.get('cajaId')) ?? c.find(x => Number(x.activa) === 1) ?? c[0];
      if (cajaInicial) { setCajaId(cajaInicial.id); setEmisorId(cajaInicial.emisor_id); }
      else if (e[0]) setEmisorId(e[0].id);
      if (tc) { setTipoCambio(String(tc.valor)); setTcFuente(tc.fuente); }
      if (restaurar) restaurarFactura(fav);
      setCargando(false);
    });
    return () => { vivo = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Vuelta desde el formulario avanzado de producto: se recupera la factura
  // tal como estaba y el producto creado queda puesto en su línea.
  function restaurarFactura(fav: FavoritoCabys[]) {
    const guardada = leerFacturaEnCurso<EstadoFactura>();
    borrarFacturaEnCurso();
    const url = new URL(window.location.href);
    const articuloId = url.searchParams.get('articulo');
    url.searchParams.delete('restaurar'); url.searchParams.delete('articulo');
    window.history.replaceState(null, '', url.toString());
    if (!guardada) return;
    const e = guardada.estado;
    setTipo(e.tipo); setEmisorId(e.emisorId); setCajaId(e.cajaId); setReceptor(e.receptor); setIdentificarTiquete(e.identificarTiquete);
    setActividadReceptor(e.actividadReceptor); setCondicionVenta(e.condicionVenta); setPlazoDias(e.plazoDias); setMoneda(e.moneda);
    setTipoCambio(e.tipoCambio); setTcFuente(e.tcFuente); setMedios(new Set(e.medios)); setConReferencia(e.conReferencia); setReferencia(e.referencia);
    setCargos(e.cargos); setObservaciones(e.observaciones); setProgramar(e.programar); setRecFrecuencia(e.recFrecuencia);
    setRecProxima(e.recProxima); setRecFin(e.recFin); setRecModo(e.recModo); setRepitiendo(e.repitiendo); setRefacturando(e.refacturando);
    const f = articuloId ? fav.find(x => x.id === articuloId) : undefined;
    if (!f) { setLineas(e.lineas.length ? e.lineas : [lineaNueva(e.tipo)]); return; }
    const p = Number(f.precio_unitario) || 0, tcN = Number(e.tipoCambio) || 0, monedaItem = f.moneda === 'USD' ? 'USD' : 'CRC';
    const precio = !p || monedaItem === e.moneda ? p : tcN > 0 ? Math.round((monedaItem === 'USD' ? p * tcN : p / tcN) * 100) / 100 : 0;
    const datos: Partial<LineaForm> = {
      descripcion: f.nombre || f.descripcion, codigoCabys: f.codigo, unidad: f.unidad_medida || 'Unid', deInventario: true,
      codigoTarifa: esExportacion(e.tipo) ? '01' : codigoTarifaDesdePorcentaje(f.impuesto), precioUnitario: precio,
      codigoComercial: f.codigo_interno ?? '', tipoCodigo: f.tipo_codigo || '04', articuloId: f.id,
    };
    const conLinea = guardada.lineaId && e.lineas.some(l => l.id === guardada.lineaId)
      ? e.lineas.map(l => l.id === guardada.lineaId ? { ...l, ...datos } : l)
      : [...e.lineas.filter(l => !vacia(l)), { ...lineaNueva(e.tipo), ...datos }];
    setLineas(conLinea);
  }
  function abrirFormularioAvanzado(lineaId: string | null) {
    const url = new URL(window.location.href);
    url.searchParams.delete('restaurar'); url.searchParams.delete('articulo'); url.searchParams.set('tipo', tipo);
    const estado: EstadoFactura = {
      tipo, emisorId, cajaId, receptor, identificarTiquete, actividadReceptor, condicionVenta, plazoDias, moneda, tipoCambio, tcFuente,
      medios: Array.from(medios), conReferencia, referencia, lineas, cargos, observaciones,
      programar, recFrecuencia, recProxima, recFin, recModo, repitiendo, refacturando,
    };
    guardarFacturaEnCurso({ query: url.searchParams.toString(), lineaId, estado });
    router.push('/facturacion-config/producto?volver=factura');
  }

  // Refacturar: mismo contenido que el documento original, para otro receptor.
  useEffect(() => {
    const origenId = refacturarId ?? repetirId ?? corregirId;
    if (!origenId || cargando || restaurar) return;
    let vivo = true;
    fetch(`/api/documentos/${encodeURIComponent(origenId)}`).then(r => r.json()).then(d => {
      if (!vivo || d.error) return;
      if (refacturarId) setRefacturando({ numero: d.numero_factura, cliente: d.cliente_nombre, tipo: d.tipo });
      else if (corregirId) setCorrigiendo({ id: d.id, numero: d.numero_factura, cliente: d.cliente_nombre, origen: d.origen ?? 'Manual', origenReferencia: d.origen_referencia ?? null, motivo: d.ultimo_error ?? '' });
      else setRepitiendo({ numero: d.numero_factura, cliente: d.cliente_nombre });
      if (d.moneda === 'USD') { cambiarMoneda('USD'); if (d.tipo_cambio) setTipoCambio(String(d.tipo_cambio)); }
      if (d.condicion_venta) setCondicionVenta(d.condicion_venta);
      try {
        // Solo los medios de este país (un documento de ejemplo puede traer los de Costa Rica)
        const validos = new Set(mediosPago().map(x => x.value));
        const m = (JSON.parse(d.medios_pago ?? '[]') as unknown[]).map(String).filter(x => validos.has(x));
        if (m.length) setMedios(new Set(m));
      } catch { /* deja efectivo */ }
      const ls = (d.lineas ?? []).filter((l: { sintetica?: number }) => !l.sintetica);
      if (ls.length) setLineas(ls.map((l: { codigo_cabys: string; descripcion: string; cantidad: number; precio_unitario: number; impuesto: number; codigo_tarifa: string | null; unidad_medida?: string; codigo_comercial?: string; articulo_id?: string | null; descuento_json?: string | null; exoneracion_json?: string | null }) => ({
        ...lineaNueva('Factura electrónica'), codigoCabys: l.codigo_cabys, descripcion: l.descripcion, cantidad: Number(l.cantidad), precioUnitario: Number(l.precio_unitario),
        codigoTarifa: l.codigo_tarifa ?? codigoTarifaDesdePorcentaje(Number(l.impuesto)), unidad: l.unidad_medida || 'Unid', deInventario: Boolean(l.articulo_id),
        codigoComercial: l.codigo_comercial ?? '', articuloId: l.articulo_id ?? null,
        descuento: l.descuento_json ? JSON.parse(l.descuento_json) : null,
      })));
      if (repetirId || corregirId) {
        // Recurrente: mismo cliente, sin referencia al documento anterior.
        const cl = clientes.find(c => c.id === d.cliente_id) ?? clientes.find(c => c.nombre === d.cliente_nombre);
        if (cl) elegirCliente(cl); else setReceptor({ ...RECEPTOR_VACIO, nombre: d.cliente_nombre ?? '', email: d.receptor_email ?? '' });
        if (d.observaciones) setObservaciones(d.observaciones);
        return;
      }
      setObservaciones(`Refacturación de ${d.tipo === 'Tiquete electrónico' ? 'el tiquete' : 'la factura'} ${d.numero_factura}${d.observaciones ? ` · ${d.observaciones}` : ''}`);
      setConReferencia(true);
      setReferencia({ tipoDocumento: d.tipo, numero: d.clave || d.numero_factura, fecha: d.fecha_emision, codigo: '04', razon: 'Refacturación a otro receptor' });
      setReceptor(RECEPTOR_VACIO);
    });
    return () => { vivo = false; };
  }, [refacturarId, repetirId, corregirId, cargando]); // eslint-disable-line react-hooks/exhaustive-deps

  // Documentos para referenciar (solo cuando hacen falta)
  useEffect(() => {
    if (!conReferencia || docsRef || cargando) return;
    let vivo = true;
    fetch('/api/documentos/con-lineas').then(r => r.json()).then((d: DocRef[]) => {
      if (!vivo) return;
      const validos = d.filter(x => x.numero_factura && !esNota(x.tipo) && x.estado !== 'Borrador');
      setDocsRef(validos);
      // Desde Ventas → "Generar nota de crédito": el documento ya viene indicado
      const pre = restaurar ? null : params.get('referencia');
      const doc = pre ? validos.find(x => x.numero_factura === pre || x.clave === pre) : undefined;
      if (doc) elegirDocumentoReferencia(doc, true);
    });
    return () => { vivo = false; };
  }, [conReferencia, cargando]); // eslint-disable-line react-hooks/exhaustive-deps


  const emisorBase = emisores.find(e => e.id === emisorId);
  const emisor = emisorBase;
  // Actividades inscritas de la empresa, la principal primero
  const misActividades = (() => {
    let acts: { codigo: string; nombre: string; principal?: boolean }[] = [];
    try { acts = emisor?.actividades_json ? JSON.parse(emisor.actividades_json) : []; } catch { acts = []; }
    const l = acts.sort((a, b) => Number(Boolean(b.principal)) - Number(Boolean(a.principal))).map(a => `${a.codigo} - ${a.nombre}`);
    return l.length ? l : emisor?.actividad_economica ? [emisor.actividad_economica] : [];
  })();
  const cajasEmisor = cajas.filter(c => c.emisor_id === emisorId && Number(c.activa) === 1);
  // Con varias sucursales se elige primero la sucursal y luego su caja
  const sucursalesEmisor = Array.from(new Set(cajasEmisor.map(c => c.sucursal))).sort();
  const sucursalActual = cajas.find(c => c.id === cajaId)?.sucursal ?? sucursalesEmisor[0] ?? '';
  const [nombresSucursal, setNombresSucursal] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!emisorId) return;
    let vivo = true;
    fetch(`/api/sucursales?emisor=${emisorId}`).then(r => r.json()).then((l: { codigo: string; nombre: string }[]) => {
      if (vivo && Array.isArray(l)) setNombresSucursal(Object.fromEntries(l.map(x => [x.codigo, x.nombre])));
    }).catch(() => {});
    return () => { vivo = false; };
  }, [emisorId]);
  const docReferenciado = referencia.numero ? docsRef?.find(d => (d.clave && d.clave === referencia.numero) || d.numero_factura === referencia.numero) : undefined;
  const mostrarReceptor = !esTiquete(tipo) || identificarTiquete || Boolean(receptor.nombre);
  const caja = cajas.find(c => c.id === cajaId);

  // ── Cálculo (misma función que usa el servidor para el XML) ────────────────
  const conPlanPago = tipo === 'Factura electrónica' && (condicionVenta === '08' || condicionVenta === '10');
  const calculo = useMemo(() => calcularDocumento(
    lineas.map(l => ({ codigoCabys: l.codigoCabys, cantidad: l.cantidad, precioUnitario: l.precioUnitario, codigoTarifa: l.codigoTarifa, descuento: l.descuento, exoneracion: l.exoneracion, otroImpuesto: l.otroImpuesto })),
    (gt ? [] : cargos).map(o => ({ tipoDocumento: o.tipoDocumento, detalle: o.detalle, porcentaje: o.porcentaje ? Number(o.porcentaje) : null, monto: o.monto ? Number(o.monto) : null })),
  ), [lineas, cargos, gt]);

  // ── Acciones ───────────────────────────────────────────────────────────────
  function cambiarMoneda(m: 'CRC' | 'USD') {
    setMoneda(m);
    if (m === 'USD' && !tipoCambio) {
      fetch('/api/tipo-cambio').then(r => r.json()).then((tc: { valor: number; fuente: 'bccr' | 'manual' }) => { setTipoCambio(String(tc.valor)); setTcFuente(tc.fuente); }).catch(() => {});
    }
  }
  function cambiarTipo(t: string) {
    // La factura de compra usa la lista de proveedores; las demás, la de receptores
    if (esCompraFec(t) !== esCompraFec(tipo)) {
      setReceptor(RECEPTOR_VACIO);
      fetch(esCompraFec(t) ? '/api/clientes?tipo=proveedor' : '/api/clientes?receptores=1').then(r => r.json()).then(setClientes).catch(() => {});
    }
    setTipo(t);
    const permitidas = condicionesVentaPermitidas(t);
    if (!permitidas.includes(condicionVenta)) setCondicionVenta(permitidas[0]);
    if (esNota(t)) { setConReferencia(true); setReferencia(r => ({ ...r, codigo: t === 'Nota de crédito' ? '03' : '04' })); }
    if (esExportacion(t)) { cambiarMoneda('USD'); setLineas(ls => ls.map(l => ({ ...l, codigoTarifa: '01', exoneracion: null }))); }
    else setLineas(ls => ls.map(l => (l.codigoTarifa === '01' && tipo === 'Factura de exportación') || (['05', '06', '07'].includes(l.codigoTarifa) && !esNota(t)) ? { ...l, codigoTarifa: '08' } : l));
    const url = new URL(window.location.href); url.searchParams.set('tipo', t); window.history.replaceState(null, '', url.toString());
  }

  // Exoneración guardada en los datos tributarios del cliente (si sigue activa)
  const exoDeCliente = (c: ClienteRow | null) => c && Number(c.exonerado ?? 0) === 1 && c.exoneracion_codigo
    ? exoneraciones.find(e => e.id === c.exoneracion_codigo && Number(e.activo ?? 1) === 1) ?? null : null;
  const exoCliente = exoDeCliente(clientes.find(c => c.id === receptor.clienteId) ?? null);
  function elegirCliente(c: ClienteRow | null) {
    const antes = exoCliente;
    if (!c) {
      setReceptor(RECEPTOR_VACIO); setActividadReceptor('');
      if (antes) setLineas(ls => ls.map(l => l.exoneracion?.nombre === antes.nombre ? { ...l, exoneracion: null } : l));
      return;
    }
    const r = receptorDesdeCliente(c);
    setReceptor(r);
    setUbic({ provincia: '', canton: '', distrito: '', otrasSenas: '' });
    setActividadReceptor(r.actividad);
    setActividadEmisor(r.actividadEmpresa ?? '');
    // Días de crédito del cliente (Contabilidad) → condición y plazo
    // Si el perfil del cliente trae «Generar recibo electrónico de pago», la factura sale con la condición 10
    if (tipo === 'Factura electrónica' && r.diasCredito > 0) { if (!['08', '10'].includes(condicionVenta)) setCondicionVenta(r.generaRecibo ? '10' : '02'); setPlazoDias(String(Math.min(r.diasCredito, r.generaRecibo ? 90 : r.diasCredito))) }
    else if (tipo === 'Factura electrónica' && r.generaRecibo) { setCondicionVenta('10'); setPlazoDias('90'); }
    // Exoneración del cliente → a todas las líneas gravadas
    const exo = esExportacion(tipo) ? null : exoDeCliente(c);
    setLineas(ls => ls.map(l => {
      const pct = tarifaPorcentaje(l.codigoTarifa);
      if (exo && pct > 0) return { ...l, exoneracion: exoneracionDeConfig(exo, pct) };
      if (antes && l.exoneracion?.nombre === antes.nombre) return { ...l, exoneracion: null };
      return l;
    }));
  }
  async function guardarCliente(r: Receptor, destino: 'base' | 'solo-aqui', crearCuenta?: boolean, tipoTercero?: 'cliente' | 'proveedor') {
    let final = r;
    if (destino === 'base') {
      const cuerpo = {
        nombre: r.nombre, tipoIdentificacion: r.tipoIdentificacion, numeroIdentificacion: r.numeroIdentificacion,
        email: r.email || null, telefono: r.telefono || null, direccionFiscal: r.direccion || null, actividadEconomica: r.actividad || null,
      };
      if (r.clienteId) {
        await fetch(`/api/clientes/${r.clienteId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
      } else {
        // Cliente o proveedor según lo elegido al crear la cuenta; sin cuenta, el de la lista (proveedor en la factura de compra)
        const tipoTer = crearCuenta && tipoTercero ? tipoTercero : esCompraFec(tipo) ? 'proveedor' : 'cliente';
        const dias = crearCuenta && tipoTer === 'cliente' ? Number(r.diasCredito) || 0 : 0;
        const res = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cuerpo, diasCredito: dias, tipo: tipoTer, esReceptor: true, crearCuenta: Boolean(crearCuenta) }) });
        const d = await res.json();
        final = { ...r, clienteId: d.id, conCuenta: Boolean(d.cuenta), diasCredito: dias };
        // Crédito activado al crearlo: esta factura se propone a crédito
        if (dias > 0 && tipo === 'Factura electrónica') { setCondicionVenta('02'); setPlazoDias(String(dias)); }
      }
      setClientes(await fetch(esCompraFec(tipo) ? '/api/clientes?tipo=proveedor' : '/api/clientes?receptores=1').then(x => x.json()));
    }
    setReceptor(final); setActividadReceptor(final.actividad); setClienteModal(null);
  }
  function elegirDocumentoReferencia(d: DocRef, copiarLineas: boolean) {
    setReferencia(r => ({ ...r, tipoDocumento: d.tipo, numero: d.clave || d.numero_factura, fecha: d.fecha_emision }));
    // Importado de otro sistema: la nota sale con su misma sucursal y terminal
    if (Number(d.importado) === 1) {
      const c = cajas.find(x => x.sucursal === d.numero_factura.slice(0, 3) && x.terminal === d.numero_factura.slice(3, 8) && Number(x.activa) === 1);
      if (c) { setEmisorId(c.emisor_id); setCajaId(c.id); }
    }
    const cl = clientes.find(c => c.id === d.cliente_id) ?? clientes.find(c => c.nombre === d.cliente_nombre);
    if (cl) elegirCliente(cl);
    else if (d.cliente_nombre) setReceptor(r => r.nombre ? r : { ...RECEPTOR_VACIO, nombre: d.cliente_nombre });
    if (d.moneda === 'USD') cambiarMoneda('USD');
    if (copiarLineas && d.lineas?.length) {
      setLineas(d.lineas.map(l => ({
        ...lineaNueva(tipo), codigoCabys: l.codigo_cabys, descripcion: l.descripcion, cantidad: Number(l.cantidad), precioUnitario: Number(l.precio_unitario),
        codigoTarifa: l.codigo_tarifa ?? codigoTarifaDesdePorcentaje(Number(l.impuesto)), deInventario: !!l.codigo_cabys,
      })));
    }
  }
  const setLinea = (id: string, p: Partial<LineaForm>) => setLineas(ls => ls.map(l => l.id === id ? { ...l, ...p } : l));
  function elegirArticulo(lineaId: string, f: FavoritoCabys) {
    setLineas(ls => ls.map(l => l.id !== lineaId ? l : {
      ...l, descripcion: f.nombre || f.descripcion, codigoCabys: f.codigo, unidad: f.unidad_medida || 'Unid', deInventario: true,
      codigoTarifa: esExportacion(tipo) ? '01' : codigoTarifaDesdePorcentaje(f.impuesto),
      precioUnitario: precioEnMoneda(f) || l.precioUnitario, codigoComercial: f.codigo_interno ?? '', tipoCodigo: f.tipo_codigo || '04', articuloId: f.id,
      ...(gt ? datosGtDeArticulo(f) : {}),
    }));
  }
  // Guatemala: impuesto de turismo y escenario de exención que trae el artículo
  function datosGtDeArticulo(f: FavoritoCabys): Partial<LineaForm> {
    const gt = leerDatosArticuloGT(f.datos_pais);
    return {
      otroImpuesto: gt.unidadIth === 1 ? { codigo: '03', descripcion: 'Turismo hospedaje', tarifa: 10 } : null,
      escenarioExencion: gt.escenarioExencion,
    };
  }
  // «+ Añadir línea» abre el modal: producto del catálogo o línea manual
  function agregarLinea() { setLineaModal({}); }
  function valorDeLinea(l: LineaForm): ValorLinea {
    return {
      articuloId: l.articuloId, codigoCabys: l.codigoCabys, descripcion: l.descripcion, cantidad: l.cantidad, precioUnitario: l.precioUnitario,
      codigoTarifa: l.codigoTarifa, unidad: l.unidad, codigoComercial: l.codigoComercial, tipoCodigo: l.tipoCodigo,
      unidadComercial: l.unidadComercial, tipoTransaccion: l.tipoTransaccion, ...(gt ? { ith: Boolean(l.otroImpuesto?.tarifa) } : {}),
    };
  }
  function valorDeProducto(f: FavoritoCabys): ValorLinea {
    return {
      articuloId: f.id, codigoCabys: f.codigo, descripcion: f.nombre || f.descripcion, cantidad: 1, precioUnitario: precioEnMoneda(f),
      codigoTarifa: esExportacion(tipo) ? '01' : codigoTarifaDesdePorcentaje(f.impuesto), unidad: f.unidad_medida || 'Unid',
      codigoComercial: f.codigo_interno ?? '', tipoCodigo: f.tipo_codigo || '04', unidadComercial: '', tipoTransaccion: '',
      ...(gt ? { ith: leerDatosArticuloGT(f.datos_pais).unidadIth === 1 } : {}),
    };
  }
  function guardarLineaModal(v: ValorLinea, otra: boolean) {
    const fav = gt && v.articuloId ? favoritos.find(f => f.id === v.articuloId) : undefined;
    // Guatemala: el impuesto de turismo es el que quedó elegido en el modal
    const { ith, ...valor } = v;
    const datos: Partial<LineaForm> = {
      ...valor, deInventario: Boolean(v.articuloId), ...(fav ? datosGtDeArticulo(fav) : {}),
      ...(gt ? { otroImpuesto: ith ? { codigo: '03', descripcion: 'Turismo hospedaje', tarifa: 10 } : null } : {}),
    };
    const editarId = lineaModal?.editarId;
    if (editarId) {
      setLinea(editarId, datos);
    } else {
      const n: LineaForm = { ...lineaNueva(tipo), ...datos };
      const pct = tarifaPorcentaje(n.codigoTarifa);
      if (exoCliente && !esExportacion(tipo) && pct > 0) n.exoneracion = exoneracionDeConfig(exoCliente, pct);
      setLineas(ls => {
        const vacias = ls.filter(vacia);
        return vacias.length === ls.length ? [n] : [...ls.filter(l => !vacia(l)), n];
      });
    }
    if (!otra) setLineaModal(null);
  }
  function agregarCargo() {
    // Lo más común en un hotel: el 10% de servicio (ley 2 de restaurantes)
    const yaTieneServicio = cargos.some(c => c.tipoDocumento === '06');
    const t = yaTieneServicio ? TIPOS_OTRO_CARGO.find(x => x.value === '99')! : TIPOS_OTRO_CARGO[0];
    setCargos(cs => [...cs, { id: nuevoId(), tipoDocumento: t.value, detalle: t.label, porcentaje: 'porcentaje' in t ? String(t.porcentaje) : '', monto: '', conTercero: false, terceroTipo: '02', terceroId: '', terceroNombre: '' }]);
  }
  const setCargo = (id: string, p: Partial<CargoForm>) => setCargos(cs => cs.map(c => c.id === id ? { ...c, ...p } : c));

  function validar(): string[] {
    const e: string[] = [];
    if (!emisor || !caja) e.push('Elige el emisor y la caja.');
    // Guatemala: sin receptor la factura va a consumidor final (CF); notas y factura especial sí lo piden
    const requiereReceptor = gt ? esNota(tipo) || esCompraFec(tipo) : !esTiquete(tipo);
    if (requiereReceptor && !receptor.nombre.trim()) e.push(esCompraFec(tipo) ? 'Indica el proveedor al que le compras.' : 'Indica el receptor del comprobante.');
    if (docReferenciado && Number(docReferenciado.importado) === 1) {
      const suc = docReferenciado.numero_factura.slice(0, 3), ter = docReferenciado.numero_factura.slice(3, 8);
      const cajaSel = cajas.find(c => c.id === cajaId);
      if (!cajaSel || cajaSel.sucursal !== suc || cajaSel.terminal !== ter) e.push(`El documento viene de otro sistema: la nota debe salir con la sucursal ${suc} y la terminal ${ter}. ${cajas.some(c => c.sucursal === suc && c.terminal === ter) ? 'Elige esa caja.' : 'Crea esa caja en Configuración › Cajas / Terminales.'}`);
    }
    if (esCompraFec(tipo) && !compraCuenta && conContabilidad()) e.push('Elige la cuenta de gasto o costo con que se registra la compra.');
    if (gt) {
      // Receptor (FEL): NIT, CF hasta Q2,500, CUI o extranjero
      if (receptor.nombre && !receptor.numeroIdentificacion.trim() && receptor.tipoIdentificacion !== '06') e.push('El receptor no tiene identificación. Usa «Modificar» para completarla.');
      const totalQ = calculo.totalComprobante * (moneda === 'USD' ? Number(tipoCambio) || 0 : 1);
      const errRec = errorReceptorGT(receptor.numeroIdentificacion.trim() ? receptor.tipoIdentificacion : '06', receptor.numeroIdentificacion || 'CF', totalQ, tipoDteDe(tipo, condicionVenta));
      if (errRec) e.push(errRec);
      if (tipoDteDe(tipo, condicionVenta) === 'FCAM') {
        const suma = abonos.reduce((x, y) => x + (Number(y.monto) || 0), 0);
        if (!abonos.length || abonos.some(y => !y.fechaVencimiento || !(Number(y.monto) > 0))) e.push('Completa la fecha y el monto de cada abono.');
        else if (Math.abs(suma - calculo.totalComprobante) > 0.01) e.push(`Los abonos suman ${money(suma, moneda)} y el total es ${money(calculo.totalComprobante, moneda)}: deben coincidir.`);
      }
      if (esExportacion(tipo) && receptor.nombre && !['05', '06'].includes(receptor.tipoIdentificacion)) e.push('La factura de exportación es para un receptor extranjero o consumidor final.');
    } else {
      if (esCompraFec(tipo) && !actividadReceptor) e.push('Indica la actividad económica del proveedor (la trae la consulta a Hacienda en su perfil).');
      if (esCompraFec(tipo) && !receptor.clienteId) e.push('Elige un proveedor guardado: su ubicación es obligatoria en la factura de compra.');
      if (esCompraFec(tipo) && receptor.clienteId && !receptor.ubicacion) e.push('El proveedor necesita provincia, cantón y distrito: complétalos en la tarjeta del proveedor (Ubicación del proveedor).');
      if (receptor.nombre && !receptor.numeroIdentificacion.trim()) e.push('El receptor no tiene identificación. Usa "Modificar" para completarla.');
      if (esExportacion(tipo) && receptor.nombre && receptor.tipoIdentificacion !== '05') e.push('La factura de exportación es para un receptor extranjero no domiciliado.');
    }
    if (conReferencia) {
      if (!referencia.numero.trim()) e.push('Falta el documento de referencia.');
      if (!referencia.razon.trim()) e.push(gt ? 'Indica el motivo del ajuste.' : 'Indica la razón de la referencia.');
    }
    if (condicionVenta === '01' && medios.size === 0) e.push('Marca al menos un método de pago.');
    if ((condicionVenta === '02' || condicionVenta === '10') && !(Number(plazoDias) > 0)) e.push('Indica el plazo de crédito en días.');
    if (!gt && condicionVenta === '10' && Number(plazoDias) > 90) e.push('Con recibo electrónico de pago el plazo máximo es de 90 días.');
    if (moneda === 'USD' && !(Number(tipoCambio) > 0)) e.push('Indica el tipo de cambio.');
    const conContenido = lineas.filter(l => !vacia(l));
    if (conContenido.length === 0) e.push('Agrega al menos una línea.');
    lineas.forEach((l, i) => {
      if (vacia(l)) return;
      const n = i + 1;
      if (gt) {
        if (esAnticipo(tipo) && l.codigoCabys === 'B') e.push(`Línea ${n}: el recibo de anticipos solo admite servicios.`);
        if (tarifaPorcentaje(l.codigoTarifa) === 0 && !esExportacion(tipo) && !esNota(tipo) && !esAnticipo(tipo) && !l.escenarioExencion) e.push(`Línea ${n}: va sin IVA, elige el escenario de exención en el impuesto de la línea.`);
      } else if (!/^\d{13}$/.test(l.codigoCabys)) e.push(`Línea ${n}: el código CABYS debe tener 13 dígitos.`);
      if (!l.descripcion.trim()) e.push(`Línea ${n}: falta la descripción.`);
      if (!(l.cantidad > 0)) e.push(`Línea ${n}: la cantidad debe ser mayor a 0.`);
      if (!(l.precioUnitario > 0)) e.push(`Línea ${n}: el precio debe ser mayor a 0.`);
    });
    cargos.forEach((o, i) => {
      if (!o.detalle.trim() || !(Number(o.porcentaje) > 0 || Number(o.monto) > 0)) e.push(`Otro cargo ${i + 1}: falta detalle o monto.`);
      if (o.tipoDocumento === '04' && (!o.terceroId.trim() || !o.terceroNombre.trim())) e.push(`Otro cargo ${i + 1}: un cobro de un tercero necesita su identificación y nombre.`);
    });
    if (receptor.email && !/^\S+@\S+\.\S+$/.test(receptor.email)) e.push('El correo del receptor no es válido.');
    return e;
  }

  async function guardar(comoBorrador: boolean, sinPreguntarCuenta = false) {
    const e = comoBorrador ? [] : validar();
    const faltaConfig = configFE?.activa ? configFE.pasos.filter(p => PASOS_BLOQUEAN.includes(p.id) && !p.listo) : [];
    if (!comoBorrador && faltaConfig.length) e.unshift(`Antes de emitir completa la configuración: ${faltaConfig.map(p => p.titulo.toLowerCase()).join(', ')}.`);
    setErrores(e);
    if (e.length) { setTimeout(() => document.getElementById('errores-factura')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0); return; }
    // Venta a crédito a un receptor sin cuenta auxiliar: se ofrece crearla
    // (si no, la cuenta por cobrar va a la cuenta general de clientes).
    if (!comoBorrador && !sinPreguntarCuenta && (condicionVenta === '02' || condicionVenta === '10') && receptor.clienteId && receptor.conCuenta === false && conContabilidad()) {
      setCreditoSinCuenta(true); return;
    }

    setGuardando(comoBorrador ? 'borrador' : 'emitir');
    const conContenido = lineas.filter(l => !vacia(l));
    const res = await fetch('/api/documentos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo, emisorId, cajaId,
        clienteId: receptor.clienteId, receptorNombre: receptor.nombre, receptorTipoIdentificacion: receptor.tipoIdentificacion,
        receptorNumeroIdentificacion: receptor.numeroIdentificacion, receptorEmail: receptor.email,
        actividadReceptor: actividadReceptor || undefined,
        actividadEmisor: actividadEmisor || undefined,
        condicionVenta, plazoDias: condicionVenta === '02' || condicionVenta === '10' ? plazoDias : undefined,
        medioPago: condicionVenta === '01' ? Array.from(medios) : [medioInicial()],
        medioPagoOtros: condicionVenta === '01' && medios.has('99') ? medioOtro.trim() || undefined : undefined,
        moneda, tipoCambio: moneda === 'USD' ? Number(tipoCambio) : 1,
        referencia: conReferencia ? { ...referencia, fecha: referencia.fecha || new Date().toISOString() } : undefined,
        ...(gt ? {
          escenarioFacturaEspecial: esCompraFec(tipo) ? escenarioFesp : undefined,
          abonos: tipoDteDe(tipo, condicionVenta) === 'FCAM' ? abonos.map((a, k) => ({ numero: k + 1, fechaVencimiento: a.fechaVencimiento, monto: Number(a.monto), ...(a.medio ? { medio: a.medio } : {}) })) : undefined,
        } : {}),
        lineas: conContenido.map(l => ({
          codigoCabys: gt ? l.codigoCabys || 'S' : l.codigoCabys, descripcion: l.descripcion, cantidad: l.cantidad, precioUnitario: l.precioUnitario,
          impuesto: tarifaPorcentaje(l.codigoTarifa), codigoTarifa: l.codigoTarifa, unidadMedida: l.unidad, ...(gt ? { escenarioExencion: l.escenarioExencion ?? null } : {}),
          descuento: l.descuento, exoneracion: l.exoneracion, otroImpuesto: l.otroImpuesto ?? null,
          codigoComercial: l.codigoComercial.trim() || undefined, tipoCodigoComercial: l.codigoComercial.trim() ? (l.articuloId ? (favoritos.find(f => f.id === l.articuloId)?.tipo_codigo || '04') : (l.tipoCodigo || '01')) : undefined,
          unidadMedidaComercial: l.unidadComercial.trim() || undefined, tipoTransaccion: l.tipoTransaccion || undefined,
          articuloId: l.articuloId,
        })),
        otrosCargos: calculo.cargos.map((o, k) => ({
          tipoDocumento: o.tipoDocumento, detalle: o.detalle, porcentaje: o.porcentaje, monto: o.montoCalculado,
          ...((cargos[k].conTercero || cargos[k].tipoDocumento === '04') && cargos[k].terceroId ? { terceroTipoIdentificacion: cargos[k].terceroTipo, terceroIdentificacion: cargos[k].terceroId, terceroNombre: cargos[k].terceroNombre } : {}),
        })),
        observaciones: observaciones.trim() || undefined,
        esBorrador: comoBorrador,
        ...(esCompraFec(tipo) ? { compraCuentaGasto: compraCuenta, compraCreditoFiscal: compraCredito } : {}),
        ...(corrigiendo ? { reemplazaA: corrigiendo.id, origen: corrigiendo.origen, origenReferencia: corrigiendo.origenReferencia ?? undefined } : {}),
        ...(tipo === 'Nota de crédito' && docReferenciado?.origen && docReferenciado.origen !== 'Manual' && anularEnOrigen ? { anularEnOrigen: true } : {}),
      }),
    });
    const data = await res.json();
    setGuardando(null);
    if (!res.ok) { setErrores([data.error ?? 'No se pudo guardar el documento.']); return; }
    if (comoBorrador) { router.push(esCompraFec(tipo) ? '/facturacion/recepcion?tab=fec' : '/facturacion/emitidos'); return; }
    // Consulta del estado ante Hacienda (en simulación responde enseguida)
    fetch(`/api/documentos/${String(data.id).replace('#', '')}/estado`, { method: 'POST' }).catch(() => {});
    // Se programó como recurrente al crearla.
    if (programar && tipo === 'Factura electrónica' && !recurrenciaId) {
      fetch('/api/recurrentes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentoId: data.id, frecuencia: recFrecuencia, proxima: recProxima, fin: recFin, modo: recModo }) }).catch(() => {});
    }
    // Factura recurrente: pasa a la siguiente fecha.
    if (recurrenciaId) fetch(`/api/recurrentes/${encodeURIComponent(recurrenciaId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'emitida', documentoId: data.id }) }).catch(() => {});
    setResultado({ consecutivo: data.consecutivo, total: calculo.totalComprobante, advertencia: data.advertenciaFirma });
  }
  function emitirOtro() {
    setResultado(null); setLineas([lineaNueva(tipo)]); setCargos([]); setObservaciones(''); setReceptor(RECEPTOR_VACIO); setIdentificarTiquete(false);
    setActividadReceptor(''); setErrores([]);
  }

  if (cargando) return <div style={{ padding: 24, fontSize: 12, color: C.n700, fontFamily: FONT }}>Cargando…</div>;
  if (!emisores.length) return <div style={{ padding: 24, fontSize: 12, color: C.n700, fontFamily: FONT }}>No hay emisores configurados. Créalos en Configuración &gt; Facturación electrónica &gt; Emisores.</div>;

  const sym = moneda === 'USD' ? '$' : simboloLocal();
  const idxDescuento = lineas.findIndex(l => l.id === descuentoDe);
  const idxImpuesto = lineas.findIndex(l => l.id === impuestoDe);
  const etiquetaReceptor = esExportacion(tipo) ? 'Cliente extranjero' : esCompraFec(tipo) ? 'Proveedor' : 'Cliente';
  const th = { padding: '8px 6px', fontSize: 11, fontWeight: 500, color: C.n700, textAlign: 'left' as const, whiteSpace: 'nowrap' as const };
  const tdNum = { padding: '12px 6px', fontSize: 12, textAlign: 'right' as const, whiteSpace: 'nowrap' as const, fontVariantNumeric: 'tabular-nums' as const };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT, overflow: 'hidden', background: C.n200 }}>
      <DatalistActividades />
      {/* Encabezado fijo: no se mueve con el scroll y tiene las acciones */}
      <div style={{ flexShrink: 0, background: '#fff', borderBottom: `1px solid ${C.n500}`, padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button onClick={() => router.push(esCompraFec(tipo) ? '/facturacion/recepcion' : '/facturacion/emitidos')} aria-label="Volver" title="Volver"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n900, fontSize: 18, lineHeight: 1, padding: 4 }}>←</button>
          <h1 style={{ fontSize: 17, fontWeight: 600, margin: 0, whiteSpace: 'nowrap' }}>{TITULO[tipo]}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => guardar(true)} disabled={guardando !== null}>{guardando === 'borrador' ? 'Guardando…' : 'Guardar como borrador'}</Button>
          <Button onClick={() => guardar(false)} disabled={guardando !== null}>{guardando === 'emitir' ? 'Emitiendo…' : `Emitir ${NOMBRE_CORTO[tipo].toLowerCase()}`}</Button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ChecklistFE variante="aviso" margen="0" />

          {errores.length > 0 && (
            <div id="errores-factura" style={{ fontSize: 12, color: C.error, background: '#FFF5F4', border: '1px solid rgba(244,67,54,.25)', borderRadius: radius.md, padding: '10px 14px' }}>
              <b style={{ fontWeight: 600 }}>Revisa antes de emitir:</b>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{errores.map(x => {
                // Cada error lleva al lugar donde se corrige
                const ancla = /provincia, cantón y distrito/.test(x) ? 'ubicacion-proveedor'
                  : /proveedor|receptor|identificación|correo del receptor|exportación es para/i.test(x) ? 'tarjeta-receptor'
                  : /cuenta de gasto/i.test(x) ? 'registro-compra'
                  : /^Línea|al menos una línea|Otro cargo/.test(x) ? 'lineas-factura'
                  : /referencia/i.test(x) ? 'referencia-factura'
                  : /método de pago|plazo|tipo de cambio/i.test(x) ? 'condiciones-factura'
                  : /emisor y la caja/.test(x) ? 'tarjeta-emisor' : null;
                return (
                  <li key={x} style={{ marginBottom: 2 }}>{x}
                    {ancla && <button onClick={() => { const el = document.getElementById(ancla); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.querySelector<HTMLElement>('select, input, button')?.focus({ preventScroll: true }); }}
                      style={{ marginLeft: 8, background: 'none', border: 'none', padding: 0, color: C.error, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Ir a corregirlo</button>}
                  </li>
                );
              })}</ul>
            </div>
          )}

          {repitiendo && (
            <div style={{ fontSize: 12.5, background: C.brandBg, border: `1px solid ${C.brandBd}`, borderRadius: radius.md, padding: '10px 14px' }}>
              Factura recurrente: se copiaron el cliente y las líneas de la factura <b>{repitiendo.numero}</b> ({repitiendo.cliente}). Revisa y emite.
            </div>
          )}
          {corrigiendo && (
            <div style={{ fontSize: 12.5, background: 'rgba(244,67,54,.06)', border: '1px solid rgba(244,67,54,.25)', borderRadius: radius.md, padding: '10px 14px' }}>
              Corrigiendo la factura rechazada <b>{corrigiendo.numero}</b> ({corrigiendo.cliente}). Se copiaron el cliente y las líneas: corrige lo que indicó {autoridad()} y emite. La nueva factura queda enlazada a la rechazada{corrigiendo.origen !== 'Manual' ? ` y se avisa a ${corrigiendo.origen}` : ''}.
              {corrigiendo.motivo && <div style={{ marginTop: 6, color: C.n700 }}>Motivo: {corrigiendo.motivo}</div>}
            </div>
          )}
          {refacturando && (
            <div style={{ fontSize: 12.5, background: C.brandBg, border: `1px solid ${C.brandBd}`, borderRadius: radius.md, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span>Refacturando {refacturando.tipo === 'Tiquete electrónico' ? 'el tiquete' : 'la factura'} <b>{refacturando.numero}</b> (a nombre de {refacturando.cliente}). Elige el nuevo receptor; las líneas ya están copiadas.</span>
              <button style={enlace} onClick={() => window.open(`/facturacion/emitidos/nuevo?tipo=${encodeURIComponent('Nota de crédito')}&referencia=${encodeURIComponent(refacturando.numero)}`, '_blank')}>Anular la original con nota de crédito ↗</button>
            </div>
          )}
          <div style={tarjeta}>
            {/* 1. Datos del comprobante (lo del emisor y receptor va en su tarjeta) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              <Campo label="Tipo de documento">
                <select value={tipo} onChange={e => cambiarTipo(e.target.value)} style={plano}>
                  {(gt ? tiposCreablesGT(TIPOS_EMITIBLES) : TIPOS_EMITIBLES.filter(t => !esAnticipo(t))).map(t => <option key={t} value={t}>{gt ? NOMBRE_TIPO_GT[t] ?? LABEL_TIPO[t] : LABEL_TIPO[t]}</option>)}
                </select>
              </Campo>
              {/* El consecutivo lo asigna la caja en el momento de emitir */}
              <Campo label={gt ? 'Serie y número' : 'Número consecutivo'} gris><span style={{ color: C.n700 }}>{gt ? 'Los asigna el certificador' : 'Se asigna al emitir'}</span></Campo>
              <Campo label="Fecha de emisión" gris>{new Date().toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</Campo>
            </div>
            {separador}

            {/* 2. Emisor y receptor. En el tiquete el receptor es opcional y casi
                nunca se usa: se muestra solo el emisor y el receptor se activa con
                la casilla. */}
            {esTiquete(tipo) && (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer', marginBottom: 10 }}>
                <input type="checkbox" checked={mostrarReceptor} style={{ accentColor: C.brand }}
                  onChange={e => { setIdentificarTiquete(e.target.checked); if (!e.target.checked) { setReceptor(RECEPTOR_VACIO); setActividadReceptor(''); } }} />
                Identificar al receptor (opcional)
              </label>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: mostrarReceptor ? 'repeat(auto-fit, minmax(380px, 1fr))' : '1fr', gap: 16 }}>
              {/* En la factura electrónica de compra la empresa es el receptor y el proveedor, el emisor */}
              <div id="tarjeta-emisor" style={{ display: 'flex', flexDirection: 'column', order: esCompraFec(tipo) ? 2 : 1 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 10px' }}>{esCompraFec(tipo) ? (gt ? 'Datos de mi empresa (comprador)' : 'Datos del receptor (mi empresa)') : 'Datos del emisor'}</h2>
                <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, flex: 1, alignContent: 'start' }}>
                    <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {/* Un solo emisor (la empresa): se elige la sucursal y la caja */}
                      {sucursalesEmisor.length > 0 && (
                        <Campo label="Sucursal">
                          <select value={sucursalActual} onChange={e => { const c = cajasEmisor.find(x => x.sucursal === e.target.value); if (c) setCajaId(c.id); }} style={plano}>
                            {[...sucursalesEmisor].sort().map(s => <option key={s} value={s}>{s}{nombresSucursal[s] ? ` · ${nombresSucursal[s]}` : ''}</option>)}
                          </select>
                        </Campo>
                      )}
                      <Campo label="Caja">
                        {cajasEmisor.length ? (
                          <select value={cajaId} onChange={e => setCajaId(e.target.value)} style={plano}>
                            {cajasEmisor.filter(c => c.sucursal === sucursalActual).map(c => <option key={c.id} value={c.id}>{c.terminal}{c.nombre ? ` · ${c.nombre}` : ''}</option>)}
                          </select>
                        ) : <span style={{ color: C.error }}>Este emisor no tiene cajas activas</span>}
                      </Campo>
                      {!gt && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <Campo label="Actividad de mi empresa">
                          {misActividades.length > 1 ? (
                            <select value={actividadEmisor || misActividades[0]} onChange={e => setActividadEmisor(e.target.value === misActividades[0] ? '' : e.target.value)} style={plano}>
                              {misActividades.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                          ) : <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={emisor?.actividad_economica}>{emisor?.actividad_economica || 'Sin actividad'}</span>}
                        </Campo>
                      </div>
                      )}
                    </div>
                    <Dato label="Nombre o razón social">
                      <b style={{ fontWeight: 600 }}>{emisor?.nombre_comercial || emisor?.razon_social}</b>
                      {emisor?.nombre_comercial && emisor.razon_social !== emisor.nombre_comercial && <div style={{ fontSize: 11.5 }}>{emisor.razon_social}</div>}
                    </Dato>
                    <Dato label={gt ? 'NIT' : 'Cédula'}>{emisor?.cedula_juridica}</Dato>
                    <div style={{ gridColumn: '1 / -1' }}><Dato label="Dirección fiscal">{emisor?.direccion_fiscal}</Dato></div>
                    <Dato label="Correo electrónico">{emisor?.correo_electronico}</Dato>
                    <Dato label="Teléfono">{emisor?.telefono}</Dato>
                  </div>
                </div>
              </div>

              {mostrarReceptor && (
              <div id="tarjeta-receptor" style={{ display: 'flex', flexDirection: 'column', order: esCompraFec(tipo) ? 1 : 2 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 10px' }}>{esCompraFec(tipo) ? (gt ? 'Datos del proveedor (vendedor)' : 'Datos del emisor (proveedor)') : 'Datos del receptor'}{esTiquete(tipo) && <span style={{ fontSize: 11, color: C.n700, fontWeight: 400 }}> (opcional)</span>}</h2>
                {(
                <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                    <ClienteCombobox clientes={esCompraFec(tipo) ? clientes : clientes.filter(c => c.tipo !== 'proveedor')} valor={receptor} etiqueta={etiquetaReceptor} opcional={esTiquete(tipo)}
                      onElegir={elegirCliente}
                      onNuevo={!puede('fe.config.receptores.crear') ? undefined : nombre => setClienteModal({ modo: 'nuevo', inicial: { ...RECEPTOR_VACIO, nombre, tipoIdentificacion: esExportacion(tipo) ? '05' : '02' } })} />
                    {gt && !receptor.nombre && !esNota(tipo) && !esCompraFec(tipo) && (
                      <div style={{ fontSize: 11.5, color: C.n700 }}>Sin receptor, el documento va a consumidor final (CF). Desde Q2,500 hay que indicar NIT, CUI o pasaporte.</div>
                    )}
                    {!gt && !esTiquete(tipo) && (
                      <Campo label={esCompraFec(tipo) ? 'Actividad económica del proveedor (obligatoria)' : 'Actividad económica del receptor (opcional)'}>
                        {receptor.actividades && receptor.actividades.length > 0 ? (
                          <select value={actividadReceptor} onChange={e => setActividadReceptor(e.target.value)} style={plano}>
                            {receptor.actividades.map(a => <option key={a} value={a}>{a}</option>)}
                            {actividadReceptor && !receptor.actividades.includes(actividadReceptor) && <option value={actividadReceptor}>{actividadReceptor}</option>}
                          </select>
                        ) : <input value={actividadReceptor} onChange={e => setActividadReceptor(e.target.value)} list="actividades-ciiu" placeholder={esCompraFec(tipo) ? 'Código CIIU del proveedor' : 'Código CIIU del cliente'} style={texto} />}
                      </Campo>
                    )}
                    {receptor.nombre ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
                        <Dato label="Nombre o razón social"><b style={{ fontWeight: 600 }}>{receptor.nombre}</b></Dato>
                        <Dato label={labelTipoId(receptor.tipoIdentificacion)}>{receptor.numeroIdentificacion || <span style={{ color: C.error }}>Falta</span>}</Dato>
                        <div style={{ gridColumn: '1 / -1' }}><Dato label="Dirección fiscal">{receptor.direccion}</Dato></div>
                        <Dato label="Correo electrónico">{receptor.email || <span style={{ color: C.error }}>Sin correo: no se le podrá enviar</span>}</Dato>
                        <Dato label="Teléfono">{receptor.telefono}</Dato>
                        {esCompraFec(tipo) && receptor.ubicacion && (
                          <div style={{ gridColumn: '1 / -1' }}><Dato label={`Ubicación (${autoridad()})`}>{nombreUbicacion(receptor.ubicacion)}{receptor.ubicacion.otrasSenas ? ` · ${receptor.ubicacion.otrasSenas}` : ''}</Dato></div>
                        )}
                        {esCompraFec(tipo) && receptor.clienteId && !receptor.ubicacion && (
                          <div id="ubicacion-proveedor" style={{ gridColumn: '1 / -1', border: `1px solid ${errores.some(x => /provincia, cantón y distrito/.test(x)) ? C.error : C.brandBd}`, background: errores.some(x => /provincia, cantón y distrito/.test(x)) ? '#FFF5F4' : C.brandBg, borderRadius: radius.md, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ fontSize: 12.5 }}>
                              <b style={{ fontWeight: 600 }}>Ubicación del proveedor</b>
                              <span style={{ display: 'block', fontSize: 11.5, color: C.n700, marginTop: 2 }}>La factura de compra lleva la provincia, el cantón y el distrito del proveedor con los códigos de {autoridad()}. Se guarda en su perfil para las próximas.</span>
                            </div>
                            <UbicacionCR value={ubic} onChange={u => setUbic(x => ({ ...x, ...u }))} required />
                            <input value={ubic.otrasSenas} onChange={e => setUbic(x => ({ ...x, otrasSenas: e.target.value }))} placeholder="Otras señas (opcional)" maxLength={250}
                              style={{ height: 34, border: `1px solid ${C.n500}`, borderRadius: 4, padding: '0 10px', fontSize: 12.5, fontFamily: FONT, outline: 'none', background: '#fff' }} />
                            <div><Button onClick={guardarUbicacion} disabled={!ubic.provincia || !ubic.canton || !ubic.distrito || guardandoUbic}>{guardandoUbic ? 'Guardando…' : 'Guardar ubicación'}</Button></div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>
                        {esTiquete(tipo) ? 'El tiquete puede ir a consumidor final sin identificar.'
                          : esExportacion(tipo) ? 'Elige o crea un cliente extranjero (identificación tipo 05).'
                          : (esCompraFec(tipo) ? 'Busca en tus proveedores o crea uno nuevo.' : (conContabilidad() ? 'Busca en la base de clientes (la misma de Contabilidad) o crea uno nuevo.' : 'Busca en tus clientes o crea uno nuevo.'))}
                      </p>
                    )}
                  </div>
                  {receptor.nombre && (
                    <div style={{ borderTop: `1px solid ${C.n500}`, padding: '10px 14px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button style={enlace} onClick={() => setClienteModal({ modo: 'modificar', inicial: { ...receptor, actividad: actividadReceptor } })}>Modificar</button>
                      {exoCliente && <span style={{ fontSize: 11.5, color: C.successDk }}>Exoneración aplicada: {exoCliente.nombre} ({Number(exoCliente.porcentaje)}%)</span>}
                      {receptor.clienteId && receptor.conCuenta === false && conContabilidad() && (
                        <span style={{ fontSize: 11.5, color: C.n700 }}>Solo receptor ·{' '}
                          <button style={{ ...enlace, fontSize: 11.5 }} onClick={() => setActivarCuenta(true)}>crear cuenta y activar crédito</button>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                )}
              </div>
              )}
            </div>

            {separador}

            {/* 3. Condiciones */}
            <div id="condiciones-factura" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, alignItems: 'start' }}>
              <Campo label="Condición de venta">
                <select value={condicionVenta} onChange={e => setCondicionVenta(e.target.value)} style={plano}>
                  {condicionesVenta().filter(c => condicionesVentaPermitidas(tipo).includes(c.value)).map(c => <option key={c.value} value={c.value}>{c.value} - {c.label}</option>)}
                </select>
              </Campo>
              {(condicionVenta === '02' || condicionVenta === '10') && (
                <Campo label="Plazo de crédito (días)"><input type="number" min={1} max={!gt && condicionVenta === '10' ? 90 : undefined} value={plazoDias} onChange={e => setPlazoDias(e.target.value)} style={texto} /></Campo>
              )}
              {!gt && tipo === 'Factura electrónica' && ['02', '08', '10'].includes(condicionVenta) && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <Checkbox checked={condicionVenta === '08' || condicionVenta === '10'}
                    onChange={v => { if (condicionVenta === '08') return; setCondicionVenta(v ? '10' : '02'); if (v && Number(plazoDias) > 90) setPlazoDias('90'); }}
                    label="Generar recibo electrónico de pago (el IVA se declara con cada abono, hasta 90 días)" />
                </div>
              )}
              <Campo label="Moneda">
                <select value={moneda} onChange={e => cambiarMoneda(e.target.value as 'CRC' | 'USD')} style={plano}>
                  <option value="CRC">{gt ? 'GTQ - Quetzal' : 'CRC - Colón costarricense'}</option>
                  <option value="USD">USD - Dólar estadounidense</option>
                </select>
              </Campo>
              <Campo label={`Tipo de cambio${moneda === 'USD' && tcFuente === 'bccr' ? ' (BCCR)' : moneda === 'USD' && tcFuente === 'manual' ? ' (editable)' : ''}`} gris={moneda === 'CRC'}>
                {moneda === 'CRC' ? '1.00' : <input type="number" value={tipoCambio} onChange={e => { setTipoCambio(e.target.value); setTcFuente('manual'); }} style={texto} />}
              </Campo>
            </div>

            {/* Guatemala, factura cambiaria: abonos programados (complemento obligatorio en FEL) */}
            {gt && tipoDteDe(tipo, condicionVenta) === 'FCAM' && (
              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Abonos de la factura cambiaria</div>
                <div style={{ fontSize: 12, color: C.n700 }}>A crédito, la factura sale como factura cambiaria con sus abonos programados. Deben sumar el total ({money(calculo.totalComprobante, moneda)}). El pago de cada abono se confirma después, en el detalle de la factura.</div>
                {abonos.length > 0 && (
                  <div aria-hidden style={{ display: 'grid', gridTemplateColumns: '28px 180px 160px 200px 28px', gap: 8, fontSize: 11.5, color: C.n700 }}>
                    <span>N.º</span><span>Vence</span><span>Monto</span><span>Medio de pago (opcional)</span><span />
                  </div>
                )}
                {abonos.map((a, k) => (
                  <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '28px 180px 160px 200px 28px', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: C.n700 }}>{k + 1}</span>
                    <input type="date" value={a.fechaVencimiento} onChange={e => setAbonos(xs => xs.map(x => x.id === a.id ? { ...x, fechaVencimiento: e.target.value } : x))} style={texto} aria-label={`Vencimiento del abono ${k + 1}`} />
                    <input type="number" value={a.monto} onChange={e => setAbonos(xs => xs.map(x => x.id === a.id ? { ...x, monto: e.target.value } : x))} style={texto} placeholder="0.00" aria-label={`Monto del abono ${k + 1}`} />
                    <select value={a.medio ?? ''} onChange={e => setAbonos(xs => xs.map(x => x.id === a.id ? { ...x, medio: e.target.value || undefined } : x))} style={plano} aria-label={`Medio de pago del abono ${k + 1}`}>
                      <option value="">Sin indicar</option>
                      {catalogoMedios.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <button onClick={() => setAbonos(xs => xs.filter(x => x.id !== a.id))} aria-label={`Quitar abono ${k + 1}`} style={{ background: 'none', border: 'none', color: C.n700, cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button style={enlace} onClick={() => setAbonos(xs => [...xs, { id: nuevoId(), fechaVencimiento: sumarDias(new Date().toISOString().slice(0, 10), Number(plazoDias) || 30), monto: '' }])}>+ Agregar abono</button>
                  <button style={enlace} onClick={() => {
                    const n = Math.max(1, abonos.length || 1), dias = Number(plazoDias) || 30, total = calculo.totalComprobante;
                    const parte = Math.floor(total / n * 100) / 100;
                    setAbonos(Array.from({ length: n }, (_, k) => ({
                      id: nuevoId(), fechaVencimiento: sumarDias(new Date().toISOString().slice(0, 10), Math.round(dias * (k + 1) / n)),
                      monto: (k === n - 1 ? Math.round((total - parte * (n - 1)) * 100) / 100 : parte).toFixed(2),
                    })));
                  }}>Repartir el total en {Math.max(1, abonos.length)} abono{abonos.length > 1 ? 's' : ''} hasta el plazo</button>
                </div>
              </div>
            )}

            {condicionVenta === '01' ? (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Métodos de pago</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 520 }}>
                  {Array.from(medios).map((cod, i) => (
                    <div key={cod + i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <Campo label={i === 0 ? 'Método de pago' : `Método de pago ${i + 1}`}>
                          <select value={cod} style={plano} onChange={e => { const v = e.target.value; setMedios(s => new Set(Array.from(s).map(x => x === cod ? v : x))); }}>
                            {catalogoMedios.filter(m => m.value === cod || !medios.has(m.value)).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                        </Campo>
                      </div>
                      {cod === '99' && (
                        <div style={{ flex: 1 }}>
                          <Campo label="¿Cuál otro?"><input value={medioOtro} maxLength={100} onChange={e => setMedioOtro(e.target.value)} placeholder="Ej.: vale de regalo" style={texto} /></Campo>
                        </div>
                      )}
                      {medios.size > 1 && (
                        <button onClick={() => setMedios(s => { const n = new Set(s); n.delete(cod); return n; })} aria-label="Quitar método de pago" title="Quitar"
                          style={{ background: 'none', border: 'none', color: C.n700, cursor: 'pointer', fontSize: 16 }}>×</button>
                      )}
                    </div>
                  ))}
                  {medios.size < 4 && catalogoMedios.some(m => !medios.has(m.value)) && (
                    <button style={{ ...enlace, alignSelf: 'flex-start' }} onClick={() => { const libre = catalogoMedios.find(m => !medios.has(m.value)); if (libre) setMedios(s => new Set([...s, libre.value])); }}>+ Agregar otro método de pago</button>
                  )}
                  <span style={{ fontSize: 11, color: C.n700 }}>Hasta 4 métodos por comprobante.</span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: C.n700, margin: '14px 0 0' }}>Venta a crédito: el método de pago se registra cuando el cliente pague.</p>
            )}

            {esCompraFec(tipo) && (
              <>
                {separador}
                <h2 id="registro-compra" style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>Registro de la compra</h2>
                <p style={{ fontSize: 12, color: C.n700, margin: '0 0 12px' }}>
                  {gt ? 'La emites tú como comprador cuando el vendedor no te da factura. Se retiene todo el IVA y el ISR; al certificarse queda registrada en Compras' : 'Emites este comprobante a nombre de un proveedor que no factura electrónicamente. Cuando Hacienda lo acepte, queda registrado en Compras'}{conContabilidad() ? ' con su asiento' : ''}.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, alignItems: 'start' }}>
                  {gt && <>
                    <Campo label="Motivo (frase tipo 5)">
                    <select value={escenarioFesp} onChange={e => setEscenarioFesp(Number(e.target.value))} style={plano}>
                      {ESCENARIOS_FRASE[5].map(x => <option key={x.escenario} value={x.escenario}>{x.escenario} · {x.nombre}</option>)}
                    </select>
                  </Campo>
                  </>}
                  <CuentaCampo titulo="Cuenta de gasto o costo" value={compraCuenta} onChange={setCompraCuenta} grupoInicial="6" />
                  <Campo label="Condición del IVA">
                    <select value={compraCredito} onChange={e => setCompraCredito(e.target.value as typeof compraCredito)} style={plano}>
                      {CREDITOS_COMPRA.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </Campo>
                </div>
              </>
            )}

            {conPlanPago && (
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: radius.md, background: C.brandBg, border: `1px solid ${C.brandBd}`, fontSize: 12.5, lineHeight: 1.5 }}>
                <b style={{ fontWeight: 600 }}>Con recibo electrónico de pago.</b> El IVA de esta factura se declara a medida que el cliente abone: cada abono se registra en Ventas y sale como un recibo electrónico.
                Si a los 90 días ({new Date(sumarDias(new Date().toISOString().slice(0, 10), 90) + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' })}) no se ha cobrado todo, el IVA pendiente se declara igual ese mes.
              </div>
            )}

            {/* 4. Información de referencia */}
            {conReferencia && (
              <>
                {separador}
                <div id="referencia-factura" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                    Información de referencia {esNota(tipo) && <span style={{ fontSize: 11, color: C.n700, fontWeight: 400 }}>(obligatoria en notas)</span>}
                  </h2>
                  {!esNota(tipo) && <button style={{ ...enlace, color: C.error }} onClick={() => setConReferencia(false)}>Quitar</button>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Campo label={gt ? (esNota(tipo) ? 'Documento que se ajusta (al elegirlo se copian sus líneas)' : 'Documento que se referencia') : esNota(tipo) ? 'Comprobante que se corrige (al elegirlo se copian sus líneas)' : 'Comprobante que se referencia'}>
                      <select value={referencia.numero ? (docsRef?.find(d => (d.clave && d.clave === referencia.numero) || d.numero_factura === referencia.numero)?.id ?? '') : ''} style={plano}
                        onChange={e => { const d = docsRef?.find(x => x.id === e.target.value); if (d) elegirDocumentoReferencia(d, esNota(tipo)); }}>
                        <option value="">{docsRef ? `Elegir de mis ${gt ? 'documentos' : 'comprobantes'} emitidos…` : 'Cargando…'}</option>
                        {(docsRef ?? []).map(d => <option key={d.id} value={d.id}>{d.numero_factura} · {d.cliente_nombre} · {money(Number(d.total), d.moneda)} · {d.estado}</option>)}
                      </select>
                    </Campo>
                  </div>
                  <Campo label="Tipo de documento referenciado">
                    <select value={referencia.tipoDocumento} onChange={e => setReferencia(r => ({ ...r, tipoDocumento: e.target.value }))} style={plano}>
                      {(gt ? ['Factura electrónica', 'Nota de crédito', 'Nota de débito'] : ['Factura electrónica', 'Tiquete electrónico', 'Factura de exportación', 'Nota de crédito', 'Nota de débito']).map(t => <option key={t} value={t}>{gt ? NOMBRE_TIPO_GT[t] ?? LABEL_TIPO[t] : LABEL_TIPO[t]}</option>)}
                    </select>
                  </Campo>
                  <Campo label={gt ? 'Serie y número o número de autorización' : 'Clave o número del documento'}>
                    <input value={referencia.numero} onChange={e => setReferencia(r => ({ ...r, numero: e.target.value }))} style={{ ...texto, fontVariantNumeric: 'tabular-nums' }} />
                  </Campo>
                  <Campo label="Fecha del documento">
                    <input type="date" value={referencia.fecha.slice(0, 10)} onChange={e => setReferencia(r => ({ ...r, fecha: e.target.value }))} style={texto} />
                  </Campo>
                  {!gt && <Campo label="Código de referencia">
                    <select value={referencia.codigo} onChange={e => setReferencia(r => ({ ...r, codigo: e.target.value }))} style={plano}>
                      {CODIGOS_REFERENCIA.map(c => <option key={c.value} value={c.value}>{c.value} - {c.label}</option>)}
                    </select>
                  </Campo>}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Campo label={gt ? 'Motivo del ajuste' : 'Razón'}>
                      <input value={referencia.razon} maxLength={180} onChange={e => setReferencia(r => ({ ...r, razon: e.target.value }))}
                        placeholder="Ej.: devolución de una noche no utilizada" style={texto} />
                    </Campo>
                  </div>
                </div>
                {tipo === 'Nota de crédito' && docReferenciado && docReferenciado.origen && docReferenciado.origen !== 'Manual' && (
                  <div style={{ marginTop: 12, padding: '10px 14px', border: `1px solid ${C.n500}`, borderRadius: radius.md }}>
                    <Checkbox checked={anularEnOrigen} onChange={setAnularEnOrigen} label={`Marcar como anulada en ${docReferenciado.origen}${docReferenciado.origen_referencia ? ` (${docReferenciado.origen_referencia})` : ''}`} />
                    <div style={{ fontSize: 11.5, color: C.n700, margin: '4px 0 0 26px' }}>El documento viene de otro módulo. Al emitir la nota de crédito se le avisa para que también lo anule allá.</div>
                  </div>
                )}
              </>
            )}

            {separador}

            {/* 5. Líneas de detalle */}
            {/* Anchos fijos (table-layout: fixed): escribir no mueve las columnas */}
            <div id="lineas-factura" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 1150, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 28 }} /><col /><col style={{ width: 150 }} /><col style={{ width: 78 }} /><col style={{ width: 112 }} />
                  <col style={{ width: 110 }} /><col style={{ width: 106 }} /><col style={{ width: 110 }} /><col style={{ width: 104 }} /><col style={{ width: 116 }} /><col style={{ width: 28 }} />
                </colgroup>
                <thead>
                  <tr style={{ background: C.n200 }}>
                    <th style={th} /><th style={th}>{gt ? 'Descripción' : 'Bien o servicio'}</th><th style={th}>{gt ? 'Bien o servicio' : 'Código CABYS'}</th>
                    <th style={th}>Cantidad</th><th style={th}>{gt ? 'Precio con IVA' : 'Precio unit.'}</th>
                    <th style={{ ...th, textAlign: 'right' }}>{gt ? 'Precio total' : 'Monto total'}</th><th style={{ ...th, textAlign: 'right' }}>Descuentos</th>
                    <th style={{ ...th, textAlign: 'right' }}>{gt ? 'Monto gravable' : 'Subtotal'}</th><th style={{ ...th, textAlign: 'right' }}>Impuestos</th>
                    <th style={{ ...th, textAlign: 'right' }}>Total</th><th style={th} />
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l, i) => {
                    const c = calculo.lineas[i];
                    const conDatos = c.montoTotal > 0 || (gt ? !!l.descripcion.trim() : !!l.codigoCabys);
                    return (
                      <tr key={l.id} style={{ borderBottom: `1px solid ${C.n500}`, verticalAlign: 'top' }}>
                        <td style={{ padding: '14px 6px', fontSize: 12, color: C.n700 }}>{i + 1}</td>
                        <td style={{ padding: 6 }}>
                          <ItemPicker valor={l.descripcion} favoritos={favoritos}
                            onEscribir={v => setLinea(l.id, { descripcion: v, ...(l.deInventario ? { deInventario: false, codigoCabys: '', articuloId: null, codigoComercial: '' } : {}) })}
                            onElegir={f => elegirArticulo(l.id, f)}
                            onCrear={puede('fe.config.productos.crear') ? nombre => setCrearArticulo({ lineaId: l.id, nombre }) : undefined} />
                          {l.deInventario ? (
                            <div style={{ fontSize: 10.5, color: C.n700, marginTop: 3 }}>De Productos/Servicios{l.codigoComercial ? ` · Cód. ${l.codigoComercial}` : ''} · Unidad: {l.unidad}</div>
                          ) : (
                            // Línea escrita a mano: también lleva unidad y código del vendedor.
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
                              <select value={l.unidad} onChange={e => setLinea(l.id, { unidad: e.target.value })} title="Unidad de medida"
                                style={{ height: 26, border: `1px solid ${C.n500}`, borderRadius: 4, fontSize: 11, fontFamily: FONT, background: '#fff', color: C.n900 }}>
                                {unidades.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                              </select>
                              <input value={l.codigoComercial} onChange={e => setLinea(l.id, { codigoComercial: e.target.value })} placeholder="Código del vendedor"
                                style={{ height: 26, border: `1px solid ${C.n500}`, borderRadius: 4, fontSize: 11, fontFamily: FONT, padding: '0 6px', minWidth: 0, color: C.n900 }} />
                            </div>
                          )}
                        </td>
                        <td style={{ padding: 6 }}>
                          {l.deInventario
                            ? <div style={{ padding: '8px 2px', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{gt ? (esServicio(l.codigoCabys || 'S') ? 'Servicio' : 'Bien') : l.codigoCabys}</div>
                            : gt ? <select value={esServicio(l.codigoCabys || 'S') ? 'S' : 'B'} onChange={e => setLinea(l.id, { codigoCabys: e.target.value })} aria-label="Bien o servicio" style={{ ...plano, width: '100%' }}>
                                <option value="S">Servicio</option><option value="B">Bien</option>
                              </select>
                            : <CabysPicker valor={l.codigoCabys} favoritos={[]}
                                onEscribir={v => setLinea(l.id, { codigoCabys: v.replace(/\s/g, '') })}
                                onElegir={x => setLinea(l.id, {
                                  codigoCabys: x.codigo, descripcion: l.descripcion || x.descripcion,
                                  codigoTarifa: esExportacion(tipo) ? '01' : codigoTarifaDesdePorcentaje(x.impuesto),
                                })} />}
                        </td>
                        <td style={{ padding: 6 }}><Input value={l.cantidad} onChange={v => setLinea(l.id, { cantidad: Number(v) || 0 })} type="number" /></td>
                        <td style={{ padding: 6 }}>
                          <Input value={l.precioUnitario || ''} onChange={v => setLinea(l.id, { precioUnitario: Number(v) || 0 })} type="number" placeholder="0.00"
                            onKeyDown={e => { if (e.key === 'Enter' && i === lineas.length - 1 && !vacia(l)) agregarLinea(); }} />
                        </td>
                        <td style={tdNum}>{conDatos ? money(gt ? c.montoConIva : c.montoTotal, moneda) : '-'}</td>
                        <td style={tdNum}>
                          {c.montoTotal > 0
                            ? <button style={enlace} onClick={() => setDescuentoDe(l.id)}>{(gt ? c.descuentoConIva : c.descuento) > 0 ? `− ${money(gt ? c.descuentoConIva : c.descuento, moneda)}` : '+ Agregar'}</button>
                            : '-'}
                        </td>
                        <td style={tdNum}>{conDatos ? money(c.subtotal, moneda) : '-'}</td>
                        <td style={tdNum}>
                          {/* Sin bien/servicio elegido no hay impuesto que mostrar */}
                          {conDatos ? <>
                            {gt && esAnticipo(tipo) ? <span style={{ fontSize: 11.5, color: C.n700 }}>Sin impuestos</span>
                              : <button style={enlace} onClick={() => setImpuestoDe(l.id)} title={gt ? 'Cambiar el IVA o agregar el impuesto de turismo' : 'Cambiar tarifa o exonerar'}>IVA {TARIFA_LABEL_CORTA(l.codigoTarifa)}{gt && c.otroImpuesto > 0 ? ' + ITH' : ''}</button>}
                            {gt && c.tarifa === 0 && !esExportacion(tipo) && !esNota(tipo) && !esAnticipo(tipo) && (
                              <select value={l.escenarioExencion ?? ''} onChange={e => setLinea(l.id, { escenarioExencion: e.target.value ? Number(e.target.value) : null })}
                                aria-label="Escenario de exención" title="Escenario de exención (frase tipo 4)" style={{ ...plano, width: '100%', marginTop: 4, fontSize: 11 }}>
                                <option value="">Escenario de exención</option>
                                {ESCENARIOS_FRASE[4].map(x => <option key={x.escenario} value={x.escenario}>{x.escenario} · {x.nombre}</option>)}
                              </select>
                            )}
                            <div style={{ fontSize: 11, color: C.n700 }}>{money(c.impuestoNeto, moneda)}</div>
                            {l.exoneracion && c.montoExoneracion > 0 && <div style={{ fontSize: 10.5, color: C.successDk }}>Exonerado {c.tarifaExonerada}%</div>}
                          </> : '-'}
                        </td>
                        <td style={{ ...tdNum, fontWeight: 600 }}>{conDatos ? money(c.totalLinea, moneda) : '-'}</td>
                        <td style={{ padding: '10px 6px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <button onClick={() => setLineas(ls => ls.length > 1 ? ls.filter(x => x.id !== l.id) : [lineaNueva(tipo)])} title="Quitar línea" aria-label="Quitar línea"
                              style={{ background: 'none', border: 'none', color: C.n700, cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
                            {!vacia(l) && (
                              <button onClick={() => setLineaModal({ editarId: l.id, inicial: valorDeLinea(l) })} title="Editar línea" aria-label="Editar línea"
                                style={{ background: 'none', border: 'none', color: C.n700, cursor: 'pointer', padding: 0, display: 'flex' }}>
                                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2.5l2.5 2.5L6 12.5H3.5V10z" /></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {favoritos.length === 0 && <p style={{ fontSize: 11.5, color: C.n700 }}>Tip: agrega tus productos en Configuración &gt; Facturación electrónica &gt; Productos/Servicios, o creálos desde la línea.</p>}

            {/* Otros cargos */}
            {!gt && cargos.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Otros cargos</div>
                {cargos.map((o, k) => (
                  <div key={o.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.2fr) minmax(200px, 1.5fr) 100px 130px 120px 24px', gap: 8, alignItems: 'center' }}>
                    <Select value={o.tipoDocumento} onChange={v => {
                      const t = TIPOS_OTRO_CARGO.find(x => x.value === v);
                      setCargo(o.id, { tipoDocumento: v, detalle: t?.label ?? o.detalle, porcentaje: t && 'porcentaje' in t ? String(t.porcentaje) : o.porcentaje });
                    }} options={TIPOS_OTRO_CARGO.map(t => ({ value: t.value, label: `${t.value} - ${t.label}` }))} />
                    <Input value={o.detalle} onChange={v => setCargo(o.id, { detalle: v })} placeholder="Detalle" />
                    <Input value={o.porcentaje} onChange={v => setCargo(o.id, { porcentaje: v, monto: '' })} type="number" placeholder="%" />
                    <Input value={o.monto} onChange={v => setCargo(o.id, { monto: v, porcentaje: '' })} type="number" placeholder={`Monto ${sym}`} />
                    <span style={{ fontSize: 12, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{money(calculo.cargos[k]?.montoCalculado ?? 0, moneda)}</span>
                    <button onClick={() => setCargos(cs => cs.filter(x => x.id !== o.id))} aria-label="Quitar cargo" style={{ background: 'none', border: 'none', color: C.n700, cursor: 'pointer', fontSize: 16 }}>×</button>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                      {(o.conTercero || o.tipoDocumento === '04') ? <>
                        <span style={{ fontSize: 11.5, color: C.n700 }}>Tercero:</span>
                        <div style={{ width: 170 }}><Select value={o.terceroTipo} onChange={v => setCargo(o.id, { terceroTipo: v })} options={gt ? [{ value: '02', label: 'NIT' }, { value: '01', label: 'CUI (DPI)' }, { value: '03', label: 'Residente extranjero' }, { value: '04', label: 'Otro documento' }] : [{ value: '01', label: 'Cédula física' }, { value: '02', label: 'Cédula jurídica' }, { value: '03', label: 'DIMEX' }, { value: '04', label: 'NITE' }]} /></div>
                        <div style={{ width: 160 }}><Input value={o.terceroId} onChange={v => setCargo(o.id, { terceroId: v })} placeholder="Identificación" /></div>
                        <div style={{ flex: 1, minWidth: 200 }}><Input value={o.terceroNombre} onChange={v => setCargo(o.id, { terceroNombre: v })} placeholder="Nombre del tercero" /></div>
                      </> : (
                        <button style={{ ...enlace, fontSize: 11.5 }} onClick={() => setCargo(o.id, { conTercero: true })}>+ Datos de un tercero</button>
                      )}
                    </div>
                  </div>
                ))}
                <p style={{ fontSize: 11, color: C.n700, margin: 0 }}>Con porcentaje se calcula sobre la venta neta; o indica un monto fijo.</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
              <Button variant="secondary" onClick={agregarLinea}>+ Añadir línea</Button>
              {/* Guatemala: FEL no tiene otros cargos y la referencia solo va en las notas, que ya la traen */}
              {!gt && <button style={{ ...enlace, textDecoration: 'none', color: C.n900 }} onClick={agregarCargo}>+ Añadir otro cargo</button>}
              {!gt && !conReferencia && <button style={{ ...enlace, textDecoration: 'none', color: C.n900 }} onClick={() => setConReferencia(true)}>+ Añadir información de referencia</button>}
            </div>

            {/* 6. Totales */}
            <div style={{ marginTop: 18, background: C.n200, borderRadius: radius.md, padding: '16px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 'min(420px, 100%)', display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 8, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                {calculo.totalDescuentos > 0 && <>
                  <span style={{ color: C.n700 }}>Total venta</span><span style={{ textAlign: 'right' }}>{money(calculo.totalVenta, moneda)}</span>
                  <span style={{ color: C.n700 }}>Descuentos</span><span style={{ textAlign: 'right' }}>− {money(calculo.totalDescuentos, moneda)}</span>
                </>}
                <span>{gt ? 'Monto gravable' : 'Subtotal (venta neta)'}</span><span style={{ textAlign: 'right' }}>{money(calculo.totalVentaNeta, moneda)}</span>
                <span style={{ color: C.n700 }}>{gt ? 'IVA e impuesto de turismo' : 'Impuestos'}</span><span style={{ textAlign: 'right' }}>{money(calculo.totalImpuesto, moneda)}</span>
                {calculo.exoneracion > 0 && <><span style={{ color: C.n700, fontSize: 11.5 }}>IVA exonerado</span><span style={{ textAlign: 'right', fontSize: 11.5, color: C.n700 }}>{money(calculo.exoneracion, moneda)}</span></>}
                {calculo.totalOtrosCargos > 0 && <><span style={{ color: C.n700 }}>Otros cargos</span><span style={{ textAlign: 'right' }}>{money(calculo.totalOtrosCargos, moneda)}</span></>}
                <span style={{ fontSize: 17, fontWeight: 600, borderTop: `1px dashed ${C.n500}`, paddingTop: 8 }}>Total</span>
                <span style={{ fontSize: 17, fontWeight: 600, borderTop: `1px dashed ${C.n500}`, paddingTop: 8, textAlign: 'right' }}>{money(calculo.totalComprobante, moneda)}</span>
                {gt && esCompraFec(tipo) && (() => {
                  const r = retencionesFacturaEspecial(calculo.totalVentaNeta, calculo.totalImpuesto, calculo.totalComprobante);
                  return <>
                    <span style={{ color: C.n700 }}>Retención de ISR</span><span style={{ textAlign: 'right' }}>− {money(r.isr, moneda)}</span>
                    <span style={{ color: C.n700 }}>Retención de IVA</span><span style={{ textAlign: 'right' }}>− {money(r.iva, moneda)}</span>
                    <span style={{ fontWeight: 600 }}>A pagar al vendedor</span><span style={{ textAlign: 'right', fontWeight: 600 }}>{money(r.totalMenosRetenciones, moneda)}</span>
                  </>;
                })()}
                {moneda === 'USD' && Number(tipoCambio) > 0 && <><span style={{ color: C.n700, fontSize: 11.5 }}>Equivale a</span><span style={{ textAlign: 'right', fontSize: 11.5, color: C.n700 }}>{money(calculo.totalComprobante * Number(tipoCambio), 'CRC')}</span></>}
              </div>
            </div>

            {/* 7. Repetir esta factura */}
            {tipo === 'Factura electrónica' && !recurrenciaId && (
              <div style={{ marginTop: 16, border: `1px solid ${programar ? C.brandBd : C.n500}`, background: programar ? C.brandBg : '#fff', borderRadius: radius.md, padding: '12px 14px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>
                  <input type="checkbox" checked={programar} onChange={e => setProgramar(e.target.checked)} style={{ accentColor: C.brand }} />
                  Repetir esta factura (recurrente)
                </label>
                {programar ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 10 }}>
                    <Campo label="Frecuencia">
                      <select value={recFrecuencia} onChange={e => { setRecFrecuencia(e.target.value); setRecProxima(siguienteFecha(new Date().toISOString().slice(0, 10), e.target.value)); }} style={plano}>
                        {FRECUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </Campo>
                    <Campo label="Próxima factura"><input type="date" value={recProxima} onChange={e => setRecProxima(e.target.value)} style={plano} /></Campo>
                    <Campo label="Terminar el (opcional)"><input type="date" value={recFin} onChange={e => setRecFin(e.target.value)} style={plano} /></Campo>
                    <div style={{ gridColumn: '1 / -1' }}><ModoRecurrencia valor={recModo} onCambiar={setRecModo} /></div>
                    <p style={{ gridColumn: '1 / -1', fontSize: 11.5, color: C.n700, margin: 0 }}>
                      {labelFrecuencia(recFrecuencia)} {recModo === 'automatica' ? 'se emitirá sola' : 'se preparará'} una factura igual para {receptor.nombre || 'este cliente'}. Todas están en Ventas › Recurrentes.
                    </p>
                  </div>
                ) : <div style={{ fontSize: 11.5, color: C.n700, marginTop: 4 }}>Para servicios que se cobran siempre igual, como alquileres o contratos mensuales.</div>}
              </div>
            )}

            {/* 8. Observaciones */}
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 12, color: C.n700 }} htmlFor="obs-factura">Observaciones</label>
              <textarea id="obs-factura" value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3} maxLength={500}
                placeholder="Se imprimen en el comprobante (p. ej. número de reserva o de habitación)"
                style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 4, border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 10, fontFamily: FONT, fontSize: 12.5, resize: 'vertical' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de totales fija */}
      <div style={{ flexShrink: 0, background: '#fff', borderTop: `1px solid ${C.n500}`, padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ fontSize: 12, color: C.n700 }}>{NOMBRE_CORTO[tipo]} · {receptor.nombre || (esTiquete(tipo) ? 'consumidor final' : esCompraFec(tipo) ? 'sin proveedor todavía' : 'sin receptor todavía')}</span>
        <div style={{ display: 'flex', gap: 22, alignItems: 'baseline', flexWrap: 'wrap' }}>
          {[
            ['Venta neta', calculo.totalVentaNeta],
            ...(calculo.totalDescuentos > 0 ? [['Descuentos', calculo.totalDescuentos] as [string, number]] : []),
            ['Impuestos', calculo.totalImpuesto],
            ...(calculo.exoneracion > 0 ? [['Exonerado', calculo.exoneracion] as [string, number]] : []),
            ...(calculo.totalOtrosCargos > 0 ? [['Otros cargos', calculo.totalOtrosCargos] as [string, number]] : []),
          ].map(([k, v]) => (
            <span key={k as string} style={{ fontSize: 12, color: C.n700 }}>{k} <b style={{ color: C.n900, fontWeight: 500 }}>{money(v as number, moneda)}</b></span>
          ))}
          <span style={{ fontSize: 13, color: C.n700 }}>Total <b style={{ fontSize: 17, color: C.n900 }}>{money(calculo.totalComprobante, moneda)}</b></span>
        </div>
      </div>

      {/* Modales */}
      {creditoSinCuenta && receptor.clienteId && (
        <ActivarCuentaModal tercero={{ id: receptor.clienteId, nombre: receptor.nombre, dias_credito: Number(plazoDias) || receptor.diasCredito }}
          titulo="Venta a crédito a un solo receptor" soloCredito textoBoton="Crear cuenta y emitir"
          aviso={`${receptor.nombre} no tiene cuenta en Contabilidad. Para llevar lo que te debe en sus propias cuentas por cobrar, créale la cuenta ahora.`}
          alternativa={{ label: 'Emitir sin cuenta', ayuda: 'Va a la cuenta general de clientes.', onClick: () => { setCreditoSinCuenta(false); guardar(false, true); } }}
          onClose={() => setCreditoSinCuenta(false)}
          onHecho={r => {
            setCreditoSinCuenta(false);
            setReceptor(x => ({ ...x, conCuenta: true, diasCredito: r.diasCredito }));
            if (r.diasCredito > 0) setPlazoDias(String(r.diasCredito));
            guardar(false, true);
          }} />
      )}
      {activarCuenta && receptor.clienteId && (
        <ActivarCuentaModal tercero={{ id: receptor.clienteId, nombre: receptor.nombre, dias_credito: receptor.diasCredito }} onClose={() => setActivarCuenta(false)}
          onHecho={r => {
            setActivarCuenta(false);
            setReceptor(x => ({ ...x, conCuenta: true, diasCredito: r.diasCredito }));
            if (r.diasCredito > 0 && tipo === 'Factura electrónica') { setCondicionVenta('02'); setPlazoDias(String(r.diasCredito)); }
            fetch('/api/clientes?receptores=1').then(x => x.json()).then(setClientes).catch(() => {});
          }} />
      )}
      {clienteModal && (
        <ClienteModal open modo={clienteModal.modo} inicial={clienteModal.inicial} tipoPorDefecto={esExportacion(tipo) ? '05' : '02'}
          onClose={() => setClienteModal(null)} onGuardar={guardarCliente} />
      )}
      {crearArticulo && (
        <ProductoRapidoModal contexto="factura" nombreInicial={crearArticulo.nombre} moneda={moneda} onClose={() => setCrearArticulo(null)}
          onCreado={f => {
            setFavoritos(fs => [...fs, f]);
            if (crearArticulo.lineaId) elegirArticulo(crearArticulo.lineaId, f);
            else setLineaModal({ inicial: valorDeProducto(f) });
            setCrearArticulo(null);
          }}
          onAvanzado={() => { const lineaId = crearArticulo.lineaId; setCrearArticulo(null); abrirFormularioAvanzado(lineaId); }} />
      )}
      {lineaModal && (
        <NuevaLineaModal favoritos={favoritos} moneda={moneda} tipoDocumento={tipo} precioEnMoneda={precioEnMoneda}
          inicial={lineaModal.inicial} editando={Boolean(lineaModal.editarId)}
          onAgregar={guardarLineaModal} onClose={() => setLineaModal(null)}
          onCrearProducto={puede('fe.config.productos.crear') ? nombre => { setLineaModal(null); setCrearArticulo({ lineaId: null, nombre }); } : undefined} />
      )}
      {idxDescuento >= 0 && (
        <DescuentoModal open montoLinea={(gt ? calculo.lineas[idxDescuento]?.montoConIva : calculo.lineas[idxDescuento]?.montoTotal) ?? 0} inicial={lineas[idxDescuento].descuento} simbolo={sym} catalogo={descuentosCat}
          onClose={() => setDescuentoDe(null)} onAplicar={d => { setLinea(lineas[idxDescuento].id, { descuento: d }); setDescuentoDe(null); }} />
      )}
      {idxImpuesto >= 0 && (
        <ImpuestoModal open tipoDocumento={tipo} codigoTarifa={lineas[idxImpuesto].codigoTarifa} exoneracion={lineas[idxImpuesto].exoneracion} otroImpuesto={lineas[idxImpuesto].otroImpuesto}
          exoneraciones={exoneraciones} impuestosCat={impuestosCat} subtotal={calculo.lineas[idxImpuesto]?.subtotal ?? 0} simbolo={sym}
          onClose={() => setImpuestoDe(null)}
          onAplicar={({ codigoTarifa, exoneracion, otroImpuesto, aTodas }) => {
            const id = lineas[idxImpuesto].id;
            setLineas(ls => ls.map(l => (aTodas || l.id === id) ? { ...l, codigoTarifa, exoneracion, otroImpuesto } : l));
            setImpuestoDe(null);
          }} />
      )}
      <Modal open={resultado !== null} title={`${NOMBRE_CORTO[tipo]} ${FEMENINO(tipo) ? 'emitida' : 'emitido'}`} onClose={() => router.push(esCompraFec(tipo) ? '/facturacion/recepcion?tab=fec' : '/facturacion/emitidos')}
        footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={emitirOtro}>{FEMENINO(tipo) ? 'Emitir otra' : 'Emitir otro'}</Button>
          <Button onClick={() => router.push(esCompraFec(tipo) ? '/facturacion/recepcion?tab=fec' : '/facturacion/emitidos')}>{esCompraFec(tipo) ? 'Ir a Compras' : 'Ir a Ventas'}</Button>
        </div>}>
        <div style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0 }}>Consecutivo <b style={{ fontVariantNumeric: 'tabular-nums' }}>{resultado?.consecutivo}</b> enviado a {autoridad()} por {money(resultado?.total ?? 0, moneda)}.</p>
          {receptor.email && <p style={{ margin: 0, color: C.n700 }}>Cuando {autoridad()} lo acepte se puede enviar a {receptor.email} desde {esCompraFec(tipo) ? 'Compras' : 'Ventas'}.</p>}
        </div>
      </Modal>
    </div>
  );
}
