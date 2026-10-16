'use client';
import { Fragment, useMemo, useRef, useState, useEffect } from 'react';
import { C, FONT, Button, Checkbox, radius, shadow, StatusBadge } from '@/components/ui/primitives';
import { leerZip } from '@/lib/leerZip';
import { parsearCompraXml, soloDigitos, type CompraXml } from '@/lib/xmlCompra';
import { CREDITO_OPCIONES, CreditoFiscal, CorreoRow, EmisorInfo, monto, fecha, r2 } from './comprasComun';
import { ACTIVIDADES_ECONOMICAS } from '@/data/actividadesEconomicas';
import CuentaSelect from './CuentaSelect';
import { useModulos } from '@/lib/modulosCliente';
import { useCuentasCompra, MOTIVO_TXT, type ContextoCuentas } from './useCuentasCompra';
import { siguienteAuxiliar, DETALLE_PROVEEDORES, soloDigitos as digitos, type CuentaOpcion } from '@/lib/cuentasContables';

interface Item {
  key: string;
  archivo: string;
  origen: 'xml' | 'correo';
  correoId?: string;
  simulado?: boolean;
  doc?: CompraXml;
  xml?: string;
  error?: string;
  avisos: string[];
  credito: CreditoFiscal;
  actividad?: string;            // MI actividad (la del hotel) elegida para esta compra
  recordar?: boolean;            // asociarla a este proveedor para sus próximas compras
  incluir: boolean;
  // Clasificación contable
  cuentaProveedor?: string;        // cuenta nivel 4 (auxiliar) del proveedor
  cuentaNueva?: CuentaOpcion | null;
  motivoProveedor?: string;
  motivosLinea?: string[];
}

// Asigna cuenta de proveedor y de cada línea a los ítems que todavía no la
// tienen. Las cuentas nuevas se numeran en orden para no repetir código, y
// dos comprobantes del mismo proveedor nuevo comparten la misma.
function clasificar(items: Item[], cx: ContextoCuentas): Item[] {
  const usadas: CuentaOpcion[] = [...cx.proveedores];
  const nuevasPorProveedor = new Map<string, CuentaOpcion>();
  items.forEach(i => { if (i.cuentaNueva) { usadas.push(i.cuentaNueva); nuevasPorProveedor.set(digitos(i.doc?.proveedorIdentificacion) || i.doc?.proveedor || '', i.cuentaNueva); } });
  return items.map(it => {
    if (!it.doc || it.cuentaProveedor !== undefined) return it;
    const d = it.doc;
    const clave = digitos(d.proveedorIdentificacion) || d.proveedor;
    const sug = cx.sugerirProveedor(d.proveedor, d.proveedorIdentificacion);
    let cuentaProveedor = sug.cuenta?.code ?? '';
    let cuentaNueva: CuentaOpcion | null = null;
    let motivo = sug.aprendida ? 'aprendida' : sug.motivo;
    if (!sug.cuenta) {
      const previa = nuevasPorProveedor.get(clave);
      cuentaNueva = previa ?? { ...sug.nueva!, code: siguienteAuxiliar(DETALLE_PROVEEDORES.code, usadas), nombre: d.proveedor || 'Proveedor nuevo' };
      if (!previa) { usadas.push(cuentaNueva); nuevasPorProveedor.set(clave, cuentaNueva); }
      cuentaProveedor = cuentaNueva.code; motivo = 'nueva';
    }
    const motivosLinea: string[] = [];
    const lineas = d.lineas.map(l => {
      if (l.cuenta) { motivosLinea.push(''); return l; }
      const s = cx.sugerirLinea(d.proveedorIdentificacion, l);
      motivosLinea.push(s.motivo);
      return { ...l, cuenta: s.cuenta, articuloId: l.articuloId ?? s.articuloId };
    });
    return { ...it, doc: { ...d, lineas }, cuentaProveedor, cuentaNueva, motivoProveedor: motivo, motivosLinea };
  });
}

// Correos de ejemplo (sembrados, sin XML guardado): se arma un comprobante
// de ejemplo y se marca como tal. Los que llegan del buzón real (IMAP o .eml)
// traen el XML y se leen de verdad.
function compraDesdeCorreo(c: CorreoRow): CompraXml {
  const hash = Array.from(c.id + c.asunto + c.remitente).reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 1_000_000_007, 7);
  const subtotal = 20000 + (hash % 180000);
  const iva = r2(subtotal * 0.13);
  const consecutivo = '00100001010' + String(hash % 1_000_000_000).padStart(9, '0');
  const clave = ('506' + String(hash).padStart(12, '0') + consecutivo + '1' + '12345678').padEnd(50, '0').slice(0, 50);
  return {
    tipo: 'Factura electrónica', version: '4.4', clave, consecutivo,
    fechaEmision: c.fecha, proveedor: c.remitente, proveedorIdentificacion: '', proveedorTipoIdentificacion: '',
    proveedorCorreo: c.remitente.includes('@') ? c.remitente : '', receptorNombre: '', receptorIdentificacion: '',
    actividadEmisor: '', actividadReceptor: '', condicionVenta: '01', moneda: 'CRC', tipoCambio: 1,
    totalGravado: subtotal, totalExento: 0, totalExonerado: 0, totalDescuentos: 0, totalVentaNeta: subtotal,
    totalImpuesto: iva, totalOtrosCargos: 0, totalComprobante: r2(subtotal + iva), tarifaPrincipal: 13,
    lineas: [{ numero: 1, cabys: '', detalle: c.asunto, cantidad: 1, unidad: 'Sp', precioUnitario: subtotal, descuento: 0, subtotal, tarifa: 13, impuesto: iva, total: r2(subtotal + iva) }],
  };
}

interface Ctx { existentes: { claves: Set<string>; consecutivos: Set<string> }; cedulasPropias: Set<string>; nombreHotel: string }

// Validaciones de cada comprobante cargado (duplicado, receptor, tipo…)
function validar(it: Item, otros: Item[], ctx: Ctx): Item {
  const { existentes, cedulasPropias, nombreHotel } = ctx;
  if (!it.doc) return { ...it, incluir: false };
  const d = it.doc;
  const avisos: string[] = [];
  let error: string | undefined;
  let incluir = it.incluir;
  let credito = it.credito;
  if (existentes.claves.has(d.clave) || (d.consecutivo && existentes.consecutivos.has(d.consecutivo + '|' + soloDigitos(d.proveedorIdentificacion)))) {
    error = 'Ya estaba importado';
  } else if (otros.some(o => o.doc?.clave === d.clave)) {
    error = 'Repetido en esta carga';
  }
  if (d.receptorIdentificacion && cedulasPropias.size && !cedulasPropias.has(soloDigitos(d.receptorIdentificacion))) {
    avisos.push(`Está a nombre de ${d.receptorNombre || 'otro receptor'} (céd. ${d.receptorIdentificacion}), que no es ${nombreHotel}.`);
    incluir = false;
  }
  if (d.tipo === 'Tiquete electrónico') { avisos.push('Tiquete electrónico: no da derecho a crédito fiscal.'); credito = 'sin_derecho'; }
  if (d.tipo === 'Nota de crédito') avisos.push('Nota de crédito: resta del gasto y del IVA.');
  if (d.moneda !== 'CRC') avisos.push(`En ${d.moneda} (tipo de cambio ${d.tipoCambio}).`);
  return { ...it, error, avisos, incluir: error ? false : incluir, credito };
}

export default function ImportarComprasModal({ open, onClose, onImportado, correos = [], existentes, emisores, onExcel }: {
  open: boolean;
  onClose: () => void;
  onExcel?: () => void;                 // carga masiva con plantilla de Excel
  onImportado: (r: { importadas: number; conAcuse: number; fallidas: string[]; asientos?: string[]; automaticas?: number }) => void;
  correos?: CorreoRow[];                         // correos de la bandeja a importar (desde la tabla)
  existentes: { claves: Set<string>; consecutivos: Set<string> };
  emisores: EmisorInfo[];
}) {
  const ctx: Ctx = useMemo(() => ({
    existentes,
    cedulasPropias: new Set(emisores.map(e => soloDigitos(e.cedula_juridica))),
    nombreHotel: emisores.length > 1 ? 'ninguno de tus emisores' : (emisores[0]?.razon_social ?? 'el hotel'),
  }), [existentes, emisores]);
  // El padre monta el modal de nuevo (key) cada vez que se abre, así que el
  // estado inicial sale directo de los correos recibidos por props.
  // Correos del buzón real: traen el XML del adjunto y se lee igual que un
  // archivo. Los correos de ejemplo (sin XML guardado) siguen armando un
  // comprobante simulado, marcado como tal.
  const [items, setItems] = useState<Item[]>(() => {
    const acumulado: Item[] = [];
    for (const c of correos) {
      const base = { key: 'correo-' + c.id, archivo: c.xml_nombre || c.asunto, origen: 'correo' as const, correoId: c.id, avisos: [], credito: 'pleno' as CreditoFiscal, incluir: true };
      if (c.xml) {
        const res = parsearCompraXml(c.xml);
        acumulado.push(res.ok ? validar({ ...base, doc: res.doc, xml: res.xml }, acumulado, ctx) : { ...base, error: res.error, incluir: false });
      } else {
        acumulado.push(validar({ ...base, simulado: true, doc: compraDesdeCorreo(c) }, acumulado, ctx));
      }
    }
    return acumulado;
  });
  // Dos actividades distintas en cada compra:
  //  · la del PROVEEDOR: viene en su XML (la eligió él al facturar). Solo se
  //    muestra; si su perfil no la tiene, se le agrega al importar.
  //  · la MÍA (del hotel): a cuál de MIS actividades inscritas se asocia la
  //    compra (IVA y reporte por actividad). Se elige aquí, una sola vez; el
  //    acuse la toma de la compra.
  const misActividades = useMemo(() => {
    const e = emisores.find(x => Number(x.activo) === 1) ?? emisores[0];
    let acts: { codigo: string; nombre: string; principal?: boolean }[] = [];
    try { acts = e?.actividades_json ? JSON.parse(e.actividades_json) : []; } catch { acts = []; }
    const l = acts.sort((a, b) => Number(Boolean(b.principal)) - Number(Boolean(a.principal))).map(a => `${a.codigo} - ${a.nombre}`);
    return l.length ? l : (e?.actividad_economica ? [e.actividad_economica] : []);
  }, [emisores]);
  // '' = la asociada a cada proveedor
  const [actividad, setActividadGeneral] = useState('');
  const [perfiles, setPerfiles] = useState<Map<string, { mia: string; suyas: string[] }>>(new Map());
  useEffect(() => {
    let vivo = true;
    fetch('/api/clientes').then(r => r.json()).then((l: { numero_identificacion?: string; actividad_empresa?: string | null; actividades_json?: string | null; actividad_economica?: string | null }[]) => {
      if (!vivo || !Array.isArray(l)) return;
      const m = new Map<string, { mia: string; suyas: string[] }>();
      for (const c of l) {
        const ced = soloDigitos(String(c.numero_identificacion ?? '')); if (!ced) continue;
        let suyas: string[] = [];
        try { suyas = c.actividades_json ? JSON.parse(c.actividades_json) : (c.actividad_economica ? [c.actividad_economica] : []); } catch { suyas = []; }
        m.set(ced, { mia: String(c.actividad_empresa ?? ''), suyas: suyas.map(String) });
      }
      setPerfiles(m);
    }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  const perfilDe = (i: Item) => perfiles.get(soloDigitos(i.doc?.proveedorIdentificacion ?? ''));
  // Mi actividad para una compra: la elegida en la fila, la general, la asociada al proveedor (si es mía) o la principal
  const actividadDe = (i: Item) => {
    if (i.actividad) return i.actividad;
    if (actividad) return actividad;
    const asociada = perfilDe(i)?.mia ?? '';
    const mia = misActividades.find(a => a.split(' - ')[0] === asociada.split(' - ')[0]);
    return mia ?? misActividades[0] ?? '';
  };
  const origenActividad = (i: Item) => i.actividad ? 'elegida' : actividad ? 'general' : misActividades.some(a => a.split(' - ')[0] === (perfilDe(i)?.mia ?? '').split(' - ')[0] && perfilDe(i)?.mia) ? 'proveedor' : 'principal';
  // La del proveedor (del XML): ¿ya está en su perfil?
  const actividadProveedor = (i: Item) => {
    const cod = String(i.doc?.actividadEmisor ?? '').split(' - ')[0].trim();
    if (!cod) return null;
    const registrada = perfilDe(i)?.suyas.find(a => a.split(' - ')[0] === cod);
    const cat = ACTIVIDADES_ECONOMICAS.find(a => a.codigo === cod);
    return { texto: registrada ?? (cat ? `${cod} - ${cat.nombre}` : cod), nueva: !registrada };
  };
  function setActividad(a: string) {
    setActividadGeneral(a);
    setItems(prev => prev.map(i => ({ ...i, actividad: undefined, recordar: a ? true : false })));
  }
  const [creditoGeneral, setCreditoGeneral] = useState<CreditoFiscal>('pleno');
  const [emitirAcuse, setEmitirAcuse] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [generarAsiento, setGenerarAsiento] = useState(true);
  // Las próximas facturas de estos proveedores llegan solas desde el buzón
  const [comprasAuto, setComprasAuto] = useState(true);
  const cx = useCuentasCompra();
  // Solo facturación: sin cuentas contables ni asiento
  const { contabilidad } = useModulos();
  // Cuando llegan las cuentas (o se cargan archivos nuevos), se sugiere la
  // clasificación de lo que todavía no la tiene.
  const pendientes = items.some(i => i.doc && i.cuentaProveedor === undefined);
  if (cx.listo && pendientes) setItems(clasificar(items, cx));


  async function agregarArchivos(files: FileList | File[]) {
    // Un .zip se abre y se importan todos sus XML (las respuestas de Hacienda se omiten)
    const lista: File[] = [];
    for (const f of Array.from(files)) {
      if (/\.zip$/i.test(f.name)) {
        try { lista.push(...(await leerZip(f)).filter(x => /\.xml$/i.test(x.name) && !/respuesta/i.test(x.name))); }
        catch { lista.push(f); }
      } else lista.push(f);
    }
    const nuevos: Item[] = [];
    for (const f of lista) {
      const base: Item = { key: f.name + '-' + f.size + '-' + Math.random().toString(36).slice(2, 6), archivo: f.name, origen: 'xml', avisos: [], credito: creditoGeneral, incluir: true };
      if (!/\.xml$/i.test(f.name)) { nuevos.push({ ...base, error: 'No es un archivo .xml', incluir: false }); continue; }
      const texto = await f.text();
      const res = parsearCompraXml(texto);
      if (!res.ok) { nuevos.push({ ...base, error: res.error, incluir: false }); continue; }
      nuevos.push({ ...base, doc: res.doc, xml: res.xml });
    }
    setItems(prev => {
      const acumulado = [...prev];
      for (const n of nuevos) acumulado.push(validar(n, acumulado, ctx));
      return acumulado;
    });
  }

  function cambiar(key: string, p: Partial<Item>) { setItems(prev => prev.map(i => i.key === key ? { ...i, ...p } : i)); }
  function quitar(key: string) { setItems(prev => prev.filter(i => i.key !== key)); }
  function aplicarCreditoATodas(c: CreditoFiscal) {
    setCreditoGeneral(c);
    setItems(prev => prev.map(i => i.doc?.tipo === 'Tiquete electrónico' ? i : { ...i, credito: c }));
  }

  const listos = items.filter(i => i.incluir && i.doc && !i.error);
  const sinCuenta = contabilidad ? listos.filter(i => !i.cuentaProveedor).length : 0;
  function cambiarLinea(key: string, n: number, p: { cuenta?: string; articuloId?: string }) {
    setItems(prev => prev.map(i => i.key !== key || !i.doc ? i : { ...i, doc: { ...i.doc, lineas: i.doc.lineas.map(l => l.numero === n ? { ...l, ...p } : l) } }));
  }
  function cuentaATodasLasLineas(key: string, cuenta: string) {
    setItems(prev => prev.map(i => i.key !== key || !i.doc ? i : { ...i, doc: { ...i.doc, lineas: i.doc.lineas.map(l => ({ ...l, cuenta })) } }));
  }
  const totalListos = listos.reduce((a, i) => a + (i.doc!.moneda === 'USD' ? i.doc!.totalComprobante * i.doc!.tipoCambio : i.doc!.totalComprobante), 0);
  const ivaListos = listos.reduce((a, i) => a + (i.doc!.moneda === 'USD' ? i.doc!.totalImpuesto * i.doc!.tipoCambio : i.doc!.totalImpuesto), 0);

  async function importar() {
    if (!listos.length) return;
    setGuardando(true);
    try {
      const res = await fetch('/api/recepcion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentos: listos.map(i => {
            const d = i.doc!;
            return {
              clave: d.clave, tipo: d.tipo, consecutivo: d.consecutivo, fechaEmision: d.fechaEmision,
              proveedor: d.proveedor, proveedorIdentificacion: d.proveedorIdentificacion, proveedorCorreo: d.proveedorCorreo,
              receptorIdentificacion: d.receptorIdentificacion, moneda: d.moneda, tipoCambio: d.tipoCambio,
              subtotal: d.totalVentaNeta || (d.totalGravado + d.totalExento - d.totalDescuentos), iva: d.totalImpuesto,
              total: d.totalComprobante, totalExento: d.totalExento, totalDescuentos: d.totalDescuentos,
              totalOtrosCargos: d.totalOtrosCargos, tarifa: d.tarifaPrincipal, lineas: d.lineas, xml: i.xml,
              tipoCreditoFiscal: i.credito, actividadEconomica: actividadDe(i), recordarActividad: Boolean(i.recordar), actividadEmisor: d.actividadEmisor || undefined, origen: i.origen, correoId: i.correoId,
              emitirAcuse, generarAsiento: contabilidad && emitirAcuse && generarAsiento, comprasAuto,
              cuentaProveedor: contabilidad ? i.cuentaProveedor : undefined, crearProveedor: contabilidad && Boolean(i.cuentaNueva && i.cuentaProveedor === i.cuentaNueva.code),
              cuentaProveedorNombre: (cx.proveedores.find(p => p.code === i.cuentaProveedor) ?? i.cuentaNueva)?.nombre ?? d.proveedor,
            };
          }),
        }),
      });
      const data = await res.json();
      const resultados: { ok: boolean; consecutivo: string; error?: string; asiento?: string | null }[] = data.resultados ?? [];
      const ok = resultados.filter(r => r.ok).length;
      onImportado({
        importadas: ok, conAcuse: emitirAcuse ? ok : 0, automaticas: Number(data.automaticas ?? 0), asientos: resultados.map(r => r.asiento).filter(Boolean) as string[],
        fallidas: resultados.filter(r => !r.ok).map(r => `${r.consecutivo}: ${r.error}`),
      });
      setItems([]);
      onClose();
    } finally { setGuardando(false); }
  }

  if (!open) return null;

  const sel = { height: 32, padding: '0 10px', border: `1px solid ${C.n500}`, borderRadius: 4, fontSize: 12, fontFamily: FONT, background: '#fff', color: C.n900 } as const;
  const th = { padding: '8px 10px', fontSize: 11, fontWeight: 500, color: C.n700, textAlign: 'left' as const, whiteSpace: 'nowrap' as const, background: C.n200 };
  const td = { padding: '8px 10px', fontSize: 12, verticalAlign: 'top' as const };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: FONT }}
      onClick={() => !guardando && onClose()}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: radius.lg, width: 'min(1200px, 96vw)', height: 'min(860px, 94vh)', display: 'flex', flexDirection: 'column', boxShadow: shadow.modal, overflow: 'hidden' }}>

        {/* Encabezado */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Importar compras</p>
            <p style={{ margin: '2px 0 0', fontSize: 11.5, color: C.n700 }}>
              Carga uno o varios XML de comprobantes de proveedores. Se leen y se validan{contabilidad ? ' y se asignan a sus cuentas contables' : ''} antes de guardar.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {onExcel && items.length === 0 && <Button variant="secondary" onClick={onExcel}>Importar masivo (Excel)</Button>}
            <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.n700 }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 1. Cargar */}
          <div
            onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={e => { e.preventDefault(); setArrastrando(false); agregarArchivos(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            style={{ border: `1.5px dashed ${arrastrando ? C.brand : C.n500}`, background: arrastrando ? C.brandBg : '#fff', borderRadius: radius.md,
              padding: items.length ? '12px 16px' : '36px 16px', textAlign: 'center', cursor: 'pointer', transition: 'padding .15s' }}>
            <input ref={inputRef} type="file" accept=".xml,.zip,text/xml,application/xml,application/zip" multiple style={{ display: 'none' }}
              onChange={e => { if (e.target.files) agregarArchivos(e.target.files); e.target.value = ''; }} />
            <span style={{ fontSize: 12.5, color: C.brand, fontWeight: 500, textDecoration: 'underline' }}>
              {items.length ? 'Agregar más archivos XML' : 'Elegir archivos XML'}
            </span>
            <span style={{ fontSize: 12, color: C.n700 }}> o arrastrarlos aquí. Puedes cargar varios a la vez.</span>
          </div>


          {items.length > 0 && <>
            {/* 2. Clasificar para todas */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', padding: 14, background: C.n200, borderRadius: radius.md }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: C.n700, flex: '1 1 320px' }}>
                <span><b style={{ color: C.n900, fontWeight: 600 }}>Mi actividad (hotel)</b> a la que se asocian estas compras</span>
                <select value={actividad} onChange={e => setActividad(e.target.value)} style={sel}>
                  <option value="">La asociada a cada proveedor</option>
                  {misActividades.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <span style={{ fontSize: 10.5 }}>Solo tus actividades inscritas. La del proveedor viene en su factura y no se elige.</span>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: C.n700, flex: '1 1 260px' }}>
                Condición del IVA para todas
                <select value={creditoGeneral} onChange={e => aplicarCreditoATodas(e.target.value as CreditoFiscal)} style={sel}>
                  {CREDITO_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <div style={{ flex: '1 1 260px', paddingBottom: 6 }}>
                <Checkbox label="Emitir acuse de aceptación total al importar" checked={emitirAcuse} onChange={setEmitirAcuse} />
                <div style={{ fontSize: 11, color: C.n700, marginTop: 2, marginLeft: 24 }}>Si alguna no se acepta completa, déjalo sin marcar y emite el acuse desde la tabla.</div>
                {emitirAcuse && contabilidad && (
                  <div style={{ marginTop: 8, marginLeft: 24 }}>
                    <Checkbox label="¿Generar también el asiento contable?" checked={generarAsiento} onChange={setGenerarAsiento} />
                    <div style={{ fontSize: 11, color: C.n700, marginTop: 2, marginLeft: 24 }}>Con las cuentas de abajo. El asiento lleva el número de factura y la compra queda con el número de asiento.</div>
                  </div>
                )}
                <div style={{ marginTop: 10 }}>
                  <Checkbox label="Importar solas las próximas facturas de estos proveedores" checked={comprasAuto} onChange={setComprasAuto} />
                  <div style={{ fontSize: 11, color: C.n700, marginTop: 2, marginLeft: 24 }}>Cuando lleguen al buzón se importan {contabilidad ? 'con estas mismas cuentas ' : ''}y quedan listas para el acuse.</div>
                </div>
              </div>
            </div>

            {/* 3. Revisar */}
            <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'auto' }}>
              <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse', fontFamily: FONT }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: 34 }} />
                    <th style={th}>Proveedor</th>{contabilidad && <th style={{ ...th, minWidth: 200 }}>Cuenta del proveedor</th>}<th style={th}>Comprobante</th>
                    <th style={{ ...th, textAlign: 'right' }}>Total</th>
                    <th style={{ ...th, minWidth: 240 }}>Actividades e IVA</th><th style={th}>Revisión</th><th style={{ ...th, width: 30 }} />
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => {
                    const d = it.doc;
                    const abierto = expandido === it.key;
                    return (
                      <Fragment key={it.key}>
                        <tr style={{ borderTop: `1px solid ${C.n500}`, background: it.error ? 'rgba(244,67,54,.03)' : undefined, opacity: it.incluir || it.error ? 1 : 0.6 }}>
                          <td style={td}>
                            <Checkbox checked={it.incluir} onChange={v => !it.error && d && cambiar(it.key, { incluir: v })} />
                          </td>
                          <td style={td}>
                            {d ? <>
                              <div style={{ fontWeight: 500 }}>{d.proveedor}</div>
                              <div style={{ fontSize: 11, color: C.n700 }}>{d.proveedorIdentificacion ? `Céd. ${d.proveedorIdentificacion}` : it.origen === 'correo' ? 'Desde correo' : ''}</div>
                            </> : <span style={{ color: C.n700 }}>{it.archivo}</span>}
                          </td>
                          {contabilidad && <td style={td}>
                            {d && !it.error && (it.cuentaProveedor === undefined
                              ? <span style={{ fontSize: 11, color: C.n700 }}>Buscando cuenta…</span>
                              : <CuentaSelect compacto value={it.cuentaProveedor} opciones={cx.proveedores} nueva={it.cuentaNueva}
                                  sugerencia={MOTIVO_TXT[it.motivoProveedor ?? ''] ?? ''}
                                  onChange={code => cambiar(it.key, { cuentaProveedor: code, motivoProveedor: 'manual' })} />)}
                          </td>}
                          <td style={td}>
                            {d ? <>
                              <div>{d.tipo}</div>
                              <button onClick={() => setExpandido(abierto ? null : it.key)}
                                style={{ background: 'none', border: 'none', padding: 0, color: C.brand, fontSize: 11, cursor: 'pointer', fontFamily: FONT, textDecoration: 'underline', fontVariantNumeric: 'tabular-nums', textAlign: 'left' }}>
                                {d.consecutivo || 'sin consecutivo'} · {abierto ? 'ocultar detalle' : `ver ${d.lineas.length} línea${d.lineas.length === 1 ? '' : 's'}`}
                              </button>
                              <div style={{ fontSize: 11, color: C.n700 }}>{fecha(d.fechaEmision)}</div>
                            </> : <span style={{ fontSize: 11, color: C.n700 }}>{it.origen === 'xml' ? 'Archivo' : 'Correo'}</span>}
                          </td>
                          <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 600 }}>{d ? monto(d.totalComprobante, d.moneda) : '-'}</div>
                            {d && <div style={{ fontSize: 11, color: C.n700 }}>IVA {monto(d.totalImpuesto, d.moneda)}</div>}
                          </td>
                          <td style={td}>
                            {d && !it.error && (() => {
                              const ap = actividadProveedor(it);
                              const origen = origenActividad(it);
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 260 }}>
                                  {/* Del proveedor: solo lectura */}
                                  <div style={{ fontSize: 11 }}>
                                    <div style={{ fontSize: 10, color: C.n700, textTransform: 'uppercase', letterSpacing: '.03em' }}>Del proveedor (su factura)</div>
                                    {ap ? <div title={ap.texto} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ap.texto}</div> : <div style={{ color: C.n700 }}>No viene en el XML</div>}
                                    {ap?.nueva && <div style={{ fontSize: 10.5, color: C.brand, fontWeight: 600 }}>Nueva: se agrega a su perfil</div>}
                                  </div>
                                  {/* Mía (hotel): se elige aquí */}
                                  <div>
                                    <div style={{ fontSize: 10, color: C.n700, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2 }}>Mi actividad (hotel)</div>
                                    <select value={actividadDe(it)} onChange={e => cambiar(it.key, { actividad: e.target.value, recordar: true })} title={actividadDe(it)}
                                      style={{ ...sel, height: 28, fontSize: 11.5, width: '100%' }}>
                                      {misActividades.map(a => <option key={a} value={a}>{a.length > 40 ? a.slice(0, 39) + '…' : a}</option>)}
                                    </select>
                                    <div style={{ fontSize: 10.5, color: C.n700, marginTop: 3 }}>
                                      {origen === 'elegida' || origen === 'general'
                                        ? <label style={{ display: 'inline-flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={Boolean(it.recordar)} onChange={e => cambiar(it.key, { recordar: e.target.checked })} />Asociarla a este proveedor</label>
                                        : origen === 'proveedor' ? 'La asociada a este proveedor' : 'Tu actividad principal · se asocia a este proveedor'}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                            {d && !it.error && (
                              <select value={it.credito} title="Condición del IVA" onChange={e => cambiar(it.key, { credito: e.target.value as CreditoFiscal })}
                                disabled={d.tipo === 'Tiquete electrónico'} style={{ ...sel, height: 28, fontSize: 11.5, marginTop: 6, width: '100%', maxWidth: 260 }}>
                                {CREDITO_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            )}
                          </td>
                          <td style={{ ...td, maxWidth: 300 }}>
                            {it.error
                              ? <><StatusBadge label="No se importa" color="red" />
                                  <div style={{ fontSize: 11, color: C.error, marginTop: 4, whiteSpace: 'normal' }}>{it.error}</div></>
                              : it.avisos.length
                                ? <><StatusBadge label="Revisar" color="yellow" />
                                    {it.avisos.map(a => <div key={a} style={{ fontSize: 11, color: C.n700, marginTop: 4, whiteSpace: 'normal' }}>{a}</div>)}</>
                                : <StatusBadge label="Listo" color="green" />}
                          </td>
                          <td style={td}>
                            <button onClick={() => quitar(it.key)} title="Quitar de la carga" aria-label="Quitar"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, fontSize: 16, lineHeight: 1 }}>×</button>
                          </td>
                        </tr>
                        {abierto && d && (
                          <tr style={{ background: C.n200 }}>
                            <td />
                            <td colSpan={contabilidad ? 7 : 6} style={{ padding: '8px 10px 14px' }}>
                              <div style={{ fontSize: 11, color: C.n700, marginBottom: 6, wordBreak: 'break-all' }}>
                                Clave {d.clave} · Receptor: {d.receptorNombre || '-'} {d.receptorIdentificacion && `(céd. ${d.receptorIdentificacion})`} · XML v{d.version}
                              </div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                                <thead><tr style={{ color: C.n700 }}>
                                  <td style={{ padding: 4 }}>CABYS</td><td style={{ padding: 4 }}>Detalle</td>
                                  <td style={{ padding: 4, textAlign: 'right' }}>Cant.</td><td style={{ padding: 4, textAlign: 'right' }}>Subtotal</td>
                                  <td style={{ padding: 4, textAlign: 'right' }}>IVA</td><td style={{ padding: 4, textAlign: 'right' }}>Total</td>
                                  {contabilidad && <td style={{ padding: 4, minWidth: 230 }}>Cuenta</td>}<td style={{ padding: 4, minWidth: 170 }}>Artículo (inventario)</td>
                                </tr></thead>
                                <tbody>
                                  {d.lineas.map((l, li) => (
                                    <tr key={l.numero} style={{ borderTop: `1px solid ${C.n500}` }}>
                                      <td style={{ padding: 4, fontVariantNumeric: 'tabular-nums' }}>{l.cabys || '-'}</td>
                                      <td style={{ padding: 4 }}>{l.detalle}</td>
                                      <td style={{ padding: 4, textAlign: 'right' }}>{l.cantidad}</td>
                                      <td style={{ padding: 4, textAlign: 'right' }}>{monto(l.subtotal, d.moneda)}</td>
                                      <td style={{ padding: 4, textAlign: 'right' }}>{l.tarifa}% · {monto(l.impuesto, d.moneda)}</td>
                                      <td style={{ padding: 4, textAlign: 'right' }}>{monto(l.total, d.moneda)}</td>
                                      {contabilidad && <td style={{ padding: 4 }}>
                                        <CuentaSelect compacto value={l.cuenta ?? ''} opciones={cx.cuentasLinea}
                                          sugerencia={MOTIVO_TXT[it.motivosLinea?.[li] ?? ''] ?? ''}
                                          onChange={code => cambiarLinea(it.key, l.numero, { cuenta: code })} />
                                      </td>}
                                      <td style={{ padding: 4 }}>
                                        <select value={l.articuloId ?? ''} onChange={e => {
                                          const art = cx.articulos.find(a => a.id === e.target.value);
                                          cambiarLinea(it.key, l.numero, { articuloId: e.target.value || undefined, ...(art?.inventariable && art.cuenta_inventario ? { cuenta: art.cuenta_inventario } : {}) });
                                        }} style={{ ...sel, height: 28, fontSize: 11.5, width: '100%' }}>
                                          <option value="">Sin artículo</option>
                                          {cx.articulos.map(a => <option key={a.id} value={a.id}>{a.codigo_interno ? `${a.codigo_interno} · ` : ''}{a.nombre || a.descripcion}</option>)}
                                        </select>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {contabilidad && d.lineas.length > 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 11.5, color: C.n700 }}>
                                  Usar la misma cuenta en todas las líneas:
                                  <div style={{ width: 280 }}>
                                    <CuentaSelect compacto value="" placeholder="Elegir cuenta…" opciones={cx.cuentasLinea} onChange={code => cuentaATodasLasLineas(it.key, code)} />
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>}
        </div>

        {/* Pie */}
        <div style={{ padding: '12px 24px', borderTop: `1px solid ${C.n500}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: C.n700 }}>
            {items.length === 0 ? 'Todavía no hay archivos cargados.'
              : <><b style={{ color: C.n900 }}>{listos.length}</b> de {items.length} listas para importar · IVA {monto(ivaListos)} · Total {monto(totalListos)}
                  {sinCuenta > 0 && <span style={{ color: C.error }}> · {sinCuenta} sin cuenta de proveedor</span>}</>}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={onClose} disabled={guardando}>Cancelar</Button>
            <Button onClick={importar} disabled={!listos.length || guardando || sinCuenta > 0}>
              {guardando ? 'Importando…' : emitirAcuse ? `Importar y emitir acuse (${listos.length})` : `Importar ${listos.length} comprobante${listos.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
