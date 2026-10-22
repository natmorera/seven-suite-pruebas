'use client';
// Formulario completo de un producto o servicio. Es una pantalla propia (sin
// las pestañas de configuración): encabezado fijo con Guardar, un índice de
// secciones y, a la derecha, la imagen y el resumen del precio.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { conContabilidad } from '@/lib/modulosCliente';
import { C, FONT, Button, FormField, Input, Select, radius, Toast } from '@/components/ui/primitives';
import { IcArrowLeft } from '@/components/ui/icons';
import { MontoInput, fmtMonto, simboloMoneda } from '@/components/ui/Monto';
import { useCabys } from '@/lib/useCabys';
import { Flotante } from './NuevaFacturaPartes';
import { useGrupos, SelectorGrupo, clasificacionDeGrupo, type GrupoProducto } from './GruposProductos';
import { CuentaCampo } from './CuentaPicker';
import SelectBuscable from './SelectBuscable';
import { useCentrosCostoConfig } from '@/components/pages/catalogo/centrosCostoConfig';
import { USUARIO_ACTUAL } from '@/components/ui/primitives';
import { usePaisEmpresa } from '@/lib/paisCliente';
import { leerDatosArticuloGT, ESCENARIOS_FRASE, calcularLineaGT, clasificacionPorId, type DatosArticuloGT } from '@/lib/perfilPais';
import ClasificacionPicker from './ClasificacionPicker';
import { useUnidades } from './useUnidades';
import { useUnidadesGravablesActivas } from './useUnidadesGravables';

export interface ItemInventario {
  id: string; actividad_economica: string; codigo: string; descripcion: string; impuesto: number;
  precio_unitario: number; unidad_medida: string; nombre?: string; codigo_interno?: string;
  tipo_codigo?: string; partida_arancelaria?: string; notas?: string; categoria?: string; moneda?: string;
  descripcion_larga?: string; inventariable?: number; cantidad_inicial?: number; cantidad_minima?: number;
  costo_unitario?: number; bodega?: string; cuenta_ingreso?: string; cuenta_costo?: string; cuenta_inventario?: string;
  imagen?: string; activo?: number; grupo_id?: string; centro_costo?: string; datos_pais?: string;
}

export const TIPOS_CODIGO = [
  { value: '04', label: '04 · Código de uso interno' }, { value: '01', label: '01 · Código del vendedor' },
  { value: '02', label: '02 · Código del comprador' }, { value: '03', label: '03 · Asignado por la industria' }, { value: '99', label: '99 · Otros' },
];
const tipoDeCabys = (c: string): 'Producto' | 'Servicio' | null => (/^\d/.test(c) ? (Number(c[0]) <= 4 ? 'Producto' : 'Servicio') : null);
const r2 = (n: number) => Math.round(n * 100) / 100;
const a2 = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '');

interface ImpuestoCat { id: string; nombre: string; porcentaje: number; tipo: string; activo: number }
interface Comentario { id: string; autor: string; texto: string; fecha: string }

export interface FormProducto {
  tipo: 'Producto' | 'Servicio'; nombre: string; unidad: string; codigoInterno: string; tipoCodigo: string;
  cabys: string; cabysDesc: string; descripcionLarga: string;
  moneda: 'CRC' | 'USD' | 'GTQ'; precioBase: string; impuesto: number; precioTotal: string;
  inventariable: boolean; cantidadInicial: string; cantidadMinima: string; costoUnitario: string; bodega: string; partidaArancelaria: string;
  cuentaIngreso: string; cuentaCosto: string; cuentaInventario: string; centroCosto: string; imagen: string; grupoId: string;
}

function formDesde(it: ItemInventario | null, borrador?: Partial<FormProducto>): FormProducto {
  const base: FormProducto = {
    tipo: 'Servicio', nombre: '', unidad: 'Servicio', codigoInterno: '', tipoCodigo: '04', cabys: '', cabysDesc: '',
    descripcionLarga: '', moneda: 'CRC', precioBase: '', impuesto: 13, precioTotal: '', inventariable: false,
    cantidadInicial: '', cantidadMinima: '', costoUnitario: '', bodega: 'Bodega principal', partidaArancelaria: '',
    cuentaIngreso: '600-001-0001', cuentaCosto: '', cuentaInventario: '120-001-0001', centroCosto: '', imagen: '', grupoId: '',
  };
  if (!it) {
    const f = { ...base, ...borrador };
    return f.precioBase ? { ...f, precioBase: a2(Number(f.precioBase)), precioTotal: a2(r2(Number(f.precioBase) * (1 + f.impuesto / 100))) } : f;
  }
  const precio = Number(it.precio_unitario) || 0;
  return {
    tipo: tipoDeCabys(it.codigo) ?? 'Servicio', nombre: it.nombre ?? '', unidad: it.unidad_medida || 'Unid', codigoInterno: it.codigo_interno ?? '',
    tipoCodigo: it.tipo_codigo || '04', cabys: it.codigo, cabysDesc: it.descripcion,
    descripcionLarga: it.descripcion_larga ?? '', moneda: (it.moneda === 'USD' || it.moneda === 'GTQ' ? it.moneda : 'CRC'), precioBase: precio ? a2(precio) : '',
    impuesto: Number(it.impuesto ?? 13), precioTotal: precio ? a2(r2(precio * (1 + Number(it.impuesto ?? 13) / 100))) : '',
    inventariable: Boolean(it.inventariable), cantidadInicial: it.cantidad_inicial ? String(it.cantidad_inicial) : '',
    cantidadMinima: it.cantidad_minima ? String(it.cantidad_minima) : '', costoUnitario: it.costo_unitario ? a2(Number(it.costo_unitario)) : '',
    bodega: it.bodega || 'Bodega principal', partidaArancelaria: it.partida_arancelaria ?? '', cuentaIngreso: it.cuenta_ingreso || '600-001-0001',
    cuentaCosto: it.cuenta_costo ?? '', cuentaInventario: it.cuenta_inventario || '120-001-0001', centroCosto: it.centro_costo ?? '',
    imagen: it.imagen ?? '', grupoId: it.grupo_id ?? '',
  };
}

function Tarjeta({ id, titulo, descripcion, children, destacada }: { id: string; titulo: string; descripcion?: string; children: ReactNode; destacada?: boolean }) {
  return (
    <section id={id} style={{ background: C.n000, border: `1px solid ${destacada ? C.brandBd : C.n500}`, borderLeft: destacada ? `4px solid ${C.brand}` : `1px solid ${C.n500}`,
      borderRadius: radius.lg, scrollMarginTop: 12 }}>
      <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.n500}` }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.n900 }}>{titulo}</div>
        {descripcion && <div style={{ fontSize: 12, color: C.n700, marginTop: 3 }}>{descripcion}</div>}
      </div>
      <div style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </section>
  );
}

// Buscador de CABYS: catálogo local y catálogo de Hacienda.
function CabysBuscador({ codigo, desc, onElegir, disabled }: { codigo: string; desc: string; disabled?: boolean; onElegir: (c: { codigo: string; descripcion: string; impuesto?: number }) => void }) {
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const { lista, buscando } = useCabys(q, 10);
  const digitos = q.replace(/\D/g, '');
  const [ancla, setAncla] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setAncla}>
      <input value={abierto ? q : (codigo ? `${codigo} · ${desc || 'sin descripción'}` : '')} disabled={disabled}
        onChange={ev => { setQ(ev.target.value); setAbierto(true); }} onFocus={() => { setQ(''); setAbierto(true); }} onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar por código o descripción"
        style={{ height: 32, padding: '0 10px', border: `1px solid ${abierto ? C.brand : C.n500}`, borderRadius: 4, fontSize: 12, fontFamily: FONT,
          background: disabled ? C.n200 : C.n000, outline: 'none', width: '100%', color: C.n900, boxSizing: 'border-box' }} />
      <Flotante anchor={ancla} open={abierto && !disabled}>
        <div>
          {lista.map(c => (
            <div key={c.codigo} onClick={() => { onElegir(c); setAbierto(false); }}
              style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 11.5, borderBottom: `1px solid ${C.n200}` }}
              onMouseEnter={e => (e.currentTarget.style.background = C.n200)} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
              <div style={{ fontWeight: 500 }}>{c.descripcion}</div>
              <div style={{ color: C.n700, fontVariantNumeric: 'tabular-nums' }}>{c.codigo} · IVA {c.impuesto}% · {tipoDeCabys(c.codigo)}</div>
            </div>
          ))}
          {digitos.length === 13 && !lista.some(c => c.codigo === digitos) && (
            <div onMouseDown={e => e.preventDefault()} onClick={() => { onElegir({ codigo: digitos, descripcion: '' }); setAbierto(false); }}
              style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 11.5, color: C.brand }}>Usar el código {digitos}</div>
          )}
          {buscando && <div style={{ padding: 10, fontSize: 11.5, color: C.n700 }}>Buscando en el catálogo de Hacienda…</div>}
          {!buscando && lista.length === 0 && digitos.length !== 13 && <div style={{ padding: 10, fontSize: 11.5, color: C.n700 }}>Sin resultados. También puedes escribir el código completo de 13 dígitos.</div>}
        </div>
      </Flotante>
    </div>
  );
}

// Comentarios del producto: quién, cuándo y qué. En un producto nuevo se
// guardan al crear el producto.
function Comentarios({ articuloId, pendientes, setPendientes }: { articuloId: string | null; pendientes: string[]; setPendientes: (p: string[]) => void }) {
  const [lista, setLista] = useState<Comentario[]>([]);
  const [texto, setTexto] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!articuloId) return;
    let vivo = true;
    fetch(`/api/cabys-favoritos/${articuloId}/comentarios`).then(r => r.json()).then(d => { if (vivo) setLista(d); }).catch(() => {});
    return () => { vivo = false; };
  }, [articuloId, version]);
  async function agregar() {
    const t = texto.trim();
    if (!t) return;
    if (!articuloId) { setPendientes([...pendientes, t]); setTexto(''); return; }
    await fetch(`/api/cabys-favoritos/${articuloId}/comentarios`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: t, autor: USUARIO_ACTUAL }) });
    setTexto(''); setVersion(v => v + 1);
  }
  async function borrar(id: string) {
    await fetch(`/api/cabys-favoritos/${articuloId}/comentarios?comentario=${id}`, { method: 'DELETE' });
    setVersion(v => v + 1);
  }
  const mostrados: Comentario[] = articuloId ? lista : pendientes.map((t, i) => ({ id: 'p' + i, autor: USUARIO_ACTUAL, texto: t, fecha: '' }));
  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2} placeholder="Ej. Precio negociado con la agencia hasta diciembre."
          style={{ flex: 1, border: `1px solid ${C.n500}`, borderRadius: 4, padding: 10, fontSize: 12, fontFamily: FONT, resize: 'vertical', outline: 'none' }} />
        <Button variant="secondary" onClick={agregar} disabled={!texto.trim()}>Comentar</Button>
      </div>
      {mostrados.length === 0
        ? <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>Todavía no hay comentarios.</p>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mostrados.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: C.brandBg, color: C.brand, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {(c.autor || '?').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, color: C.n700 }}>
                    <b style={{ color: C.n900, fontWeight: 500 }}>{c.autor}</b>{c.fecha ? ` · ${new Date(c.fecha).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' })}` : ' · se guarda al crear el producto'}
                    {articuloId && <button onClick={() => borrar(c.id)} style={{ marginLeft: 8, background: 'none', border: 'none', color: C.error, cursor: 'pointer', fontSize: 11, fontFamily: FONT, padding: 0 }}>Eliminar</button>}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.n900, marginTop: 2, whiteSpace: 'pre-wrap' }}>{c.texto}</div>
                </div>
              </div>
            ))}
          </div>
        )}
    </>
  );
}

export default function InventarioAvanzado({ item, borrador, onCancelar, onGuardado, desdeFactura }: {
  item: ItemInventario | null;                 // null = nuevo
  borrador?: Partial<FormProducto> & { datosPais?: string };   // lo que se escribió en el formulario rápido
  onCancelar: () => void;
  onGuardado: (msg: string, id?: string) => void;
  desdeFactura?: boolean;                      // al guardar se vuelve a la factura
}) {
  const [f, setF] = useState<FormProducto>(() => formDesde(item, { ...borrador }));
  // Guatemala: sin CABYS; bien o servicio, unidades gravables y escenario de exención
  const { gt } = usePaisEmpresa();
  const [art, setArt] = useState<DatosArticuloGT>(() => leerDatosArticuloGT(item?.datos_pais ?? borrador?.datosPais));
  const setGt = (p: Partial<DatosArticuloGT>) => setArt(a => ({ ...a, ...p }));
  const [impuestos, setImpuestos] = useState<ImpuestoCat[]>([]);
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [pendientes, setPendientes] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const cuerpoRef = useRef<HTMLDivElement>(null);
  // Pestañas: se ve una sección a la vez
  const [seccion, setSeccion] = useState('general');
  const set = (p: Partial<FormProducto>) => setF(x => ({ ...x, ...p }));
  const unidades = useUnidades(f.unidad);
  const ugActiva = useUnidadesGravablesActivas();
  const { grupos, recargar: recargarGrupos } = useGrupos();
  const { centrosCosto } = useCentrosCostoConfig();
  const grupo = grupos.find(g => g.id === f.grupoId);

  function elegirGrupo(id: string, directo?: GrupoProducto) {
    const g = directo ?? grupos.find(x => x.id === id);
    if (!g) { set({ grupoId: '' }); return; }
    // Guatemala: la clasificación del grupo completa bien o servicio, IVA, ITH y exención
    const c = gt ? clasificacionDeGrupo(g.datos_pais) : undefined;
    if (c) setGt({ clasificacion: c.id, bienServicio: c.bienServicio, unidadIva: c.unidadIva, unidadIth: c.unidadIth, escenarioExencion: c.escenarioExencion });
    const base = Number(f.precioBase) || 0;
    set({
      grupoId: id, cabys: item ? f.cabys : g.codigo_cabys, cabysDesc: item ? f.cabysDesc : g.descripcion_cabys, impuesto: g.impuesto, unidad: g.unidad,
      moneda: g.moneda === 'USD' ? 'USD' : 'CRC', cuentaIngreso: g.cuenta_ingreso || f.cuentaIngreso, cuentaCosto: g.cuenta_costo, centroCosto: g.centro_costo || f.centroCosto,
      tipo: item ? f.tipo : c ? (c.bienServicio === 'B' ? 'Producto' : 'Servicio') : (tipoDeCabys(g.codigo_cabys) ?? f.tipo), precioTotal: base ? a2(r2(base * (1 + g.impuesto / 100))) : f.precioTotal,
    });
  }

  useEffect(() => {
    let vivo = true;
    fetch('/api/impuestos').then(r => r.json()).then(d => { if (vivo) setImpuestos(d); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  const opcionesImpuesto = useMemo(() => {
    const ivas = impuestos.filter(i => Number(i.activo) === 1 && (i.tipo === 'IVA' || i.porcentaje === 0));
    const vistos = new Set<number>();
    const ops = ivas.filter(i => !vistos.has(i.porcentaje) && vistos.add(i.porcentaje)).sort((a, b) => b.porcentaje - a.porcentaje)
      .map(i => ({ value: String(i.porcentaje), label: `${i.nombre.replace(/\s*\d+(\.\d+)?%$/, '')} (${i.porcentaje}%)` }));
    if (!ops.some(o => Number(o.value) === f.impuesto)) ops.push({ value: String(f.impuesto), label: `IVA (${f.impuesto}%)` });
    return ops;
  }, [impuestos, f.impuesto]);
  const tipoCabys = gt ? null : tipoDeCabys(f.cabys);
  // El tipo lo dicta el CABYS (1.er dígito 0-4 bien, 5-9 servicio); solo se elige a mano sin CABYS.
  // En Guatemala se elige siempre: bien (B) o servicio (S).
  const bloqueaTipo = !gt && (Boolean(item) || Boolean(tipoCabys));
  const tipo = gt ? (art.bienServicio === 'B' ? 'Producto' : 'Servicio') : tipoCabys ?? f.tipo;
  const moneda = gt && f.moneda === 'CRC' ? 'GTQ' : f.moneda;
  const simbolo = simboloMoneda(moneda);
  const base = Number(f.precioBase) || 0;
  const total = Number(f.precioTotal) || 0;

  const errores: Record<string, string> = {};
  if (!f.nombre.trim()) errores.nombre = 'Escribe el nombre.';
  if (!gt && !/^\d{13}$/.test(f.cabys)) errores.cabys = 'Elige un código CABYS.';
  if (gt && art.unidadIva === 2 && !art.escenarioExencion) errores.exencion = 'Elige el escenario de exención.';
  if (!(base > 0)) errores.precio = 'Escribe el precio.';
  if (!f.cuentaIngreso && conContabilidad()) errores.cuentaIngreso = 'Elige la cuenta de ingreso.';
  const e = (k: string) => (intento ? errores[k] : undefined);

  function cambiarBase(v: string) { set({ precioBase: v, precioTotal: v === '' ? '' : a2(r2(Number(v) * (1 + f.impuesto / 100))) }); }
  function cambiarTotal(v: string) { set({ precioTotal: v, precioBase: v === '' ? '' : a2(r2(Number(v) / (1 + f.impuesto / 100))) }); }
  function cambiarImpuesto(pct: number) { set({ impuesto: pct, precioTotal: f.precioBase ? a2(r2(base * (1 + pct / 100))) : '' }); }

  async function elegirImagen(file: File) {
    // Se reduce a 480 px para que la imagen no pese mucho.
    const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 480 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
      set({ imagen: cv.toDataURL('image/jpeg', 0.82) });
    };
    img.src = url;
  }

  async function guardar(otro: boolean) {
    setIntento(true);
    if (Object.keys(errores).length) {
      setToast({ message: 'Revisa los campos marcados.', type: 'error' });
      const primero = errores.nombre || errores.cabys ? 'general' : errores.precio || errores.exencion ? 'precio' : 'contabilidad';
      setSeccion(primero); cuerpoRef.current?.scrollTo({ top: 0 });
      return;
    }
    setGuardando(true);
    const body = {
      nombre: f.nombre.trim(), unidadMedida: f.unidad, codigoInterno: f.codigoInterno.trim(), tipoCodigo: f.codigoInterno.trim() ? f.tipoCodigo : '',
      categoria: grupo?.nombre ?? 'Otros', descripcionLarga: f.descripcionLarga, moneda,
      ...(gt ? { pais: 'GT', datosPais: JSON.stringify({ ...art, escenarioExencion: art.unidadIva === 2 ? art.escenarioExencion : null }) } : {}),
      // Las existencias se llevan en el módulo de inventario, no aquí.
      precioUnitario: base, impuesto: f.impuesto,
      partidaArancelaria: tipo === 'Producto' ? f.partidaArancelaria : '', cuentaIngreso: f.cuentaIngreso, cuentaCosto: f.cuentaCosto,
      centroCosto: f.centroCosto, imagen: f.imagen, grupoId: f.grupoId,
    };
    const r = item
      ? await fetch(`/api/cabys-favoritos/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/cabys-favoritos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, codigo: f.cabys, descripcionCabys: f.cabysDesc }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setGuardando(false); setToast({ message: d.error ?? 'No se pudo guardar.', type: 'error' }); return; }
    if (!item && d.id) {
      for (const t of pendientes) {
        await fetch(`/api/cabys-favoritos/${d.id}/comentarios`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: t, autor: USUARIO_ACTUAL }) });
      }
    }
    setGuardando(false);
    if (otro) {
      setF(formDesde(null, { grupoId: f.grupoId, moneda: f.moneda, tipo, unidad: f.unidad, cabys: f.cabys, cabysDesc: f.cabysDesc,
        impuesto: f.impuesto, cuentaIngreso: f.cuentaIngreso, cuentaCosto: f.cuentaCosto, centroCosto: f.centroCosto }));
      setPendientes([]); setIntento(false);
      setToast({ message: `Se guardó «${body.nombre}». Ya puedes crear el siguiente.`, type: 'success' });
      cuerpoRef.current?.scrollTo({ top: 0 });
      return;
    }
    onGuardado(item ? `Se actualizó «${body.nombre}».` : `Se creó «${body.nombre}».`, item?.id ?? (d.id ? String(d.id) : undefined));
  }

  const seg = (v: 'Producto' | 'Servicio') => (
    <button type="button" onClick={() => { if (bloqueaTipo) return; if (gt) setGt({ bienServicio: v === 'Producto' ? 'B' : 'S' }); set({ tipo: v, unidad: v === 'Producto' ? 'Unid' : f.unidad === 'Unid' ? 'Servicio' : f.unidad }); }}
      disabled={bloqueaTipo}
      style={{ flex: 1, height: 36, border: 'none', borderRadius: radius.md, cursor: bloqueaTipo ? 'not-allowed' : 'pointer', fontFamily: FONT, fontSize: 13,
        background: tipo === v ? C.n000 : 'transparent', color: tipo === v ? C.n900 : C.n700, fontWeight: tipo === v ? 600 : 400,
        boxShadow: tipo === v ? '0 1px 3px rgba(0,0,0,.12)' : 'none' }}>{v}</button>
  );

  const secciones = [
    { id: 'general', label: 'Información general', error: Boolean(e('nombre') || e('cabys')) },
    { id: 'precio', label: gt ? 'Precio e impuestos' : 'Precio', error: Boolean(e('precio') || e('exencion')) },
    ...(conContabilidad() ? [{ id: 'contabilidad', label: 'Contabilidad', error: Boolean(e('cuentaIngreso')) }] : []),
    { id: 'comentarios', label: 'Comentarios', error: false },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: FONT, background: C.n200 }}>
      {/* Encabezado fijo */}
      <div style={{ height: 56, flexShrink: 0, background: C.n000, borderBottom: `1px solid ${C.n500}`, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onCancelar} aria-label={desdeFactura ? 'Volver a la factura' : 'Volver a Productos/Servicios'} title={desdeFactura ? 'Volver a la factura' : 'Volver a Productos/Servicios'}
          style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: `1px solid ${C.n500}`, borderRadius: radius.sm, cursor: 'pointer', color: C.n900 }}>
          <IcArrowLeft className="w-4 h-4" />
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: C.n700 }}>{desdeFactura ? 'Al guardar vuelves a la factura' : 'Productos/Servicios'}</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: C.n900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item ? (f.nombre || 'Editar producto o servicio') : 'Nuevo producto o servicio'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={onCancelar} disabled={guardando}>Cancelar</Button>
          {!item && !desdeFactura && <Button variant="secondary" onClick={() => guardar(true)} disabled={guardando}>Guardar y crear otro</Button>}
          <Button onClick={() => guardar(false)} disabled={guardando}>{guardando ? 'Guardando…' : desdeFactura ? 'Guardar y volver a la factura' : 'Guardar'}</Button>
        </div>
      </div>
      {/* Índice de secciones */}
      <div style={{ height: 40, flexShrink: 0, background: C.n000, borderBottom: `1px solid ${C.n500}`, padding: '0 24px', display: 'flex', alignItems: 'stretch', gap: 4 }}>
        {secciones.map(s => (
          <button key={s.id} role="tab" aria-selected={seccion === s.id} onClick={() => { setSeccion(s.id); cuerpoRef.current?.scrollTo({ top: 0 }); }}
            style={{ background: 'none', border: 'none', borderBottom: `2px solid ${seccion === s.id ? C.brand : 'transparent'}`, padding: '0 12px', fontSize: 12,
              color: seccion === s.id ? C.brand : C.n700, fontWeight: seccion === s.id ? 600 : 400, cursor: 'pointer', fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {s.label}{s.error && <span aria-label="Con errores" style={{ width: 6, height: 6, borderRadius: 3, background: C.error }} />}
          </button>
        ))}
      </div>

      <div ref={cuerpoRef} style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 24px 40px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {seccion === 'general' && <Tarjeta id="general" titulo="Información general">
              {/* Orden: primero el CABYS, que es el que dicta si es producto o servicio */}
              {gt ? <>
                <FormField label="Clasificación de producto" hint="Ordena tus productos y completa la clasificación, el IVA, la unidad y las cuentas.">
                  <SelectorGrupo grupos={grupos} value={f.grupoId} onChange={id => elegirGrupo(id)} onCreado={g => { recargarGrupos(); elegirGrupo(g.id, g); }} />
                </FormField>
                <FormField label="Clasificación" hint="Elígela y se completan solos el tipo, la unidad, el IVA, el impuesto de turismo y, si aplica, la exención. Puedes ajustarlos después.">
                  <ClasificacionPicker valor={clasificacionPorId(art.clasificacion)} onElegir={c => {
                    setGt({ clasificacion: c.id, bienServicio: c.bienServicio, unidadIva: c.unidadIva, unidadIth: c.unidadIth, escenarioExencion: c.escenarioExencion });
                    set({ tipo: c.bienServicio === 'B' ? 'Producto' : 'Servicio', unidad: c.unidad });
                    cambiarImpuesto(c.unidadIva === 1 ? 12 : 0);
                  }} />
                </FormField>
                <FormField label="Bien o servicio" required hint="Así lo pide la SAT en cada línea de la factura. Un recibo de anticipos solo admite servicios.">
                  <div style={{ display: 'flex', gap: 4, padding: 3, background: C.n200, border: `1px solid ${C.n500}`, borderRadius: radius.md, maxWidth: 360 }}>{seg('Producto')}{seg('Servicio')}</div>
                </FormField>
              </> : <>
              <FormField label="Grupo CABYS" hint={`Ordena tus productos y completa CABYS, IVA${conContabilidad() ? ', unidad y cuentas' : ' y unidad'}.`}>
                <SelectorGrupo grupos={grupos} value={f.grupoId} onChange={id => elegirGrupo(id)} onCreado={g => { recargarGrupos(); elegirGrupo(g.id, g); }}
                  inicial={f.cabys ? { codigoCabys: f.cabys, descripcionCabys: f.cabysDesc, impuesto: f.impuesto, unidad: f.unidad, moneda: f.moneda, cuentaIngreso: f.cuentaIngreso, cuentaCosto: f.cuentaCosto, centroCosto: f.centroCosto } : undefined} />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Código CABYS" required error={e('cabys')}>
                  <CabysBuscador codigo={f.cabys} desc={f.cabysDesc} disabled={Boolean(item)}
                    onElegir={c => { set({ cabys: c.codigo, cabysDesc: c.descripcion }); if (c.impuesto !== undefined) cambiarImpuesto(c.impuesto); if (!item) { const t = tipoDeCabys(c.codigo); if (t) set({ tipo: t, unidad: t === 'Producto' ? (f.unidad === 'Servicio' ? 'Unid' : f.unidad) : f.unidad === 'Unid' ? 'Servicio' : f.unidad }); } }} />
                </FormField>
                <FormField label="Tipo" required hint={tipoCabys ? 'Lo define el código CABYS (Hacienda).' : 'Se completa al elegir el CABYS.'}>
                  <div style={{ display: 'flex', gap: 4, padding: 3, background: C.n200, border: `1px solid ${C.n500}`, borderRadius: radius.md }}>{seg('Producto')}{seg('Servicio')}</div>
                </FormField>
              </div>
              </>}
              <FormField label="Nombre" required error={e('nombre')} hint="Así aparece en la factura.">
                <Input value={f.nombre} onChange={v => set({ nombre: v })} placeholder={tipo === 'Servicio' ? 'Ej. Hospedaje habitación doble (noche)' : 'Ej. Agua embotellada 600 ml'} error={e('nombre')} />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <FormField label="Unidad de medida" required>
                  <Select value={f.unidad} onChange={v => set({ unidad: v })} options={unidades} />
                </FormField>
                <FormField label="Código propio (opcional)" hint="Tu código interno o SKU.">
                  <Input value={f.codigoInterno} onChange={v => set({ codigoInterno: v.toUpperCase() })} placeholder="Ej. HAB-DBL" />
                </FormField>
                <FormField label="Tipo de código">
                  <Select value={f.tipoCodigo} onChange={v => set({ tipoCodigo: v })} options={TIPOS_CODIGO} disabled={!f.codigoInterno.trim()} />
                </FormField>
              </div>
              {!gt && f.cabys && !f.cabysDesc && (
                <FormField label="Descripción del CABYS" hint="Escríbela tal como aparece en el catálogo de Hacienda.">
                  <Input value={f.cabysDesc} onChange={v => set({ cabysDesc: v })} />
                </FormField>
              )}
              <FormField label="Descripción (opcional)" hint="Se puede mostrar en la factura.">
                <textarea value={f.descripcionLarga} onChange={ev => set({ descripcionLarga: ev.target.value })} rows={3}
                  placeholder={tipo === 'Servicio' ? 'Ej. Habitación con dos camas matrimoniales, desayuno no incluido.' : ''}
                  style={{ border: `1px solid ${C.n500}`, borderRadius: 4, padding: 10, fontSize: 12, fontFamily: FONT, resize: 'vertical', outline: 'none' }} />
              </FormField>
            </Tarjeta>}

            {seccion === 'precio' && <Tarjeta id="precio" titulo={gt ? 'Precio e impuestos' : 'Precio'} descripcion={gt ? 'En el DTE el precio va con IVA incluido. Escribe el precio sin IVA o con IVA; el otro se calcula solo.' : 'Escribe el precio sin IVA o el precio final; el otro se calcula solo.'}>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr auto 170px auto 1fr', gap: 10, alignItems: 'end' }}>
                <FormField label="Moneda">
                  <Select value={moneda} onChange={v => set({ moneda: v as 'CRC' | 'USD' | 'GTQ' })}
                    options={gt ? [{ value: 'GTQ', label: 'Q Quetzales' }, { value: 'USD', label: '$ Dólares' }] : [{ value: 'CRC', label: '₡ Colones' }, { value: 'USD', label: '$ Dólares' }]} />
                </FormField>
                <FormField label="Precio sin IVA" required error={e('precio')}>
                  <MontoInput value={f.precioBase} onChange={cambiarBase} simbolo={simbolo} error={e('precio')} ariaLabel="Precio sin IVA" />
                </FormField>
                <span style={{ paddingBottom: e('precio') ? 26 : 8, color: C.n700 }}>+</span>
                <FormField label="IVA">
                  {gt
                    ? <Select value={String(art.unidadIva)} onChange={v => { const u = Number(v); setGt({ unidadIva: u }); cambiarImpuesto(u === 1 ? 12 : 0); }}
                        options={[{ value: '1', label: 'Con IVA 12 %' }, { value: '2', label: 'Sin IVA (exento o no afecto)' }].filter(o => ugActiva(1, Number(o.value)) || Number(o.value) === art.unidadIva)} />
                    : <Select value={String(f.impuesto)} onChange={v => cambiarImpuesto(Number(v))} options={opcionesImpuesto} />}
                </FormField>
                <span style={{ paddingBottom: e('precio') ? 26 : 8, color: C.n700 }}>=</span>
                <FormField label={gt ? 'Precio con IVA' : 'Precio final'}>
                  <MontoInput value={f.precioTotal} onChange={cambiarTotal} simbolo={simbolo} ariaLabel="Precio final" />
                </FormField>
              </div>
              {f.moneda === 'USD' && <p style={{ fontSize: 11.5, color: C.n700, margin: 0 }}>Si facturas en {gt ? 'quetzales' : 'colones'}, el precio se convierte con el tipo de cambio de la factura.</p>}
              {gt && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Impuesto al turismo de hospedaje (ITH)" hint="Solo para habitaciones y alojamiento. Es el 10 % del precio sin IVA y se suma al total que paga el huésped.">
                  <Select value={art.unidadIth === null ? '' : String(art.unidadIth)} onChange={v => setGt({ unidadIth: v === '' ? null : Number(v) })}
                    options={[{ value: '', label: 'No lleva ITH' }, { value: '1', label: 'Lleva ITH 10 %' }, { value: '2', label: 'Exento de ITH' }].filter(o => !o.value || ugActiva(3, Number(o.value)) || Number(o.value) === art.unidadIth)} />
                </FormField>
                {art.unidadIva === 2 && (
                  <FormField label="Motivo de la exención" required error={e('exencion')} hint={art.escenarioExencion ? `En la factura sale: «${ESCENARIOS_FRASE[4].find(x => x.escenario === art.escenarioExencion)?.texto ?? ''}»` : 'Por qué este artículo no lleva IVA. La SAT pide imprimir una frase con el motivo.'}>
                    <Select value={art.escenarioExencion === null ? '' : String(art.escenarioExencion)} onChange={v => setGt({ escenarioExencion: v === '' ? null : Number(v) })}
                      options={[{ value: '', label: 'Elige el motivo' }, ...ESCENARIOS_FRASE[4].map(x => ({ value: String(x.escenario), label: x.nombre }))]} error={e('exencion')} />
                  </FormField>
                )}
              </div>}

              {tipo === 'Producto' && (
                <FormField label="Partida arancelaria (opcional)" hint="Solo si exportas este producto. 12 dígitos.">
                  <Input value={f.partidaArancelaria} onChange={v => set({ partidaArancelaria: v.replace(/\D/g, '').slice(0, 12) })} />
                </FormField>
              )}
            </Tarjeta>}

            {seccion === 'contabilidad' && <Tarjeta id="contabilidad" titulo="Contabilidad" destacada
              descripcion={grupo ? `Cuentas del asiento de cada venta. Vienen del grupo «${grupo.nombre}»; puedes cambiarlas aquí.` : 'Cuentas del asiento que se genera con cada venta de este producto.'}>
              {/* Cómo queda el asiento de una venta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: C.n500, border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden', fontSize: 11.5 }}>
                <div style={{ background: C.n200, padding: '6px 12px', fontWeight: 600, color: C.n700 }}>Debe</div>
                <div style={{ background: C.n200, padding: '6px 12px', fontWeight: 600, color: C.n700 }}>Haber</div>
                <div style={{ background: C.n000, padding: '8px 12px', color: C.n900 }}>Caja o cuenta del cliente</div>
                <div style={{ background: C.n000, padding: '8px 12px', color: C.n900 }}>Ingreso de este producto<br />IVA por pagar</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Cuenta de ingreso" required error={e('cuentaIngreso')}>
                  <CuentaCampo value={f.cuentaIngreso} onChange={v => set({ cuentaIngreso: v })} titulo="Cuenta de ingreso" grupoInicial="4" error={e('cuentaIngreso')} />
                </FormField>
                <FormField label="Cuenta de costo (opcional)" hint="Para registrar el costo de lo vendido.">
                  <CuentaCampo value={f.cuentaCosto} onChange={v => set({ cuentaCosto: v })} titulo="Cuenta de costo" grupoInicial="5" opcional />
                </FormField>
                <FormField label="Centro de costos (opcional)">
                  <SelectBuscable value={f.centroCosto} onChange={v => set({ centroCosto: v })} vacio="Sin centro de costos" placeholder="Buscar centro de costos"
                    opciones={centrosCosto.map(c => ({ value: c.codigo, label: `${c.codigo} · ${c.descripcion}` }))} />
                </FormField>
              </div>
            </Tarjeta>}

            {seccion === 'comentarios' && <Tarjeta id="comentarios" titulo="Comentarios" descripcion="Para el equipo; no salen en la factura.">
              <Comentarios articuloId={item?.id ?? null} pendientes={pendientes} setPendientes={setPendientes} />
            </Tarjeta>}
          </div>

          {/* Columna derecha: imagen y resumen */}
          <div style={{ position: 'sticky', top: 0, background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.lg, overflow: 'hidden' }}>
            <div style={{ padding: 16, borderBottom: `1px solid ${C.n500}` }}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={ev => { const file = ev.target.files?.[0]; if (file) elegirImagen(file); ev.target.value = ''; }} />
              <button onClick={() => fileRef.current?.click()}
                style={{ width: '100%', height: 170, border: `1.5px dashed ${C.n700}55`, borderRadius: radius.md, background: f.imagen ? `center / cover no-repeat url(${f.imagen})` : C.n200,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.n700, fontFamily: FONT, fontSize: 13 }}>
                {!f.imagen && <>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                  Subir imagen
                </>}
              </button>
              {f.imagen && <button onClick={() => set({ imagen: '' })} style={{ marginTop: 6, background: 'none', border: 'none', color: C.error, fontSize: 11.5, cursor: 'pointer', fontFamily: FONT, padding: 0 }}>Quitar imagen</button>}
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11.5, color: C.n700 }}>{tipo}{grupo ? ` · ${grupo.nombre}` : ''}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{f.nombre || 'Sin nombre'}</div>
                {gt ? <div style={{ fontSize: 11, color: C.n700, marginTop: 2 }}>{clasificacionPorId(art.clasificacion)?.nombre ? `${clasificacionPorId(art.clasificacion)?.nombre} · ` : ''}{art.bienServicio === 'B' ? 'Bien' : 'Servicio'} · {art.unidadIva === 1 ? 'IVA 12 %' : 'Sin IVA'}{art.unidadIth === 1 ? ' · ITH 10 %' : ''}</div>
                  : f.cabys && <div style={{ fontSize: 11, color: C.n700, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>CABYS {f.cabys}</div>}
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: C.n700 }}>Precio final (con IVA)</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, fontWeight: 600, color: C.brand, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                  <span>{simbolo}</span><span>{fmtMonto(total)}</span>
                </div>
                <div style={{ fontSize: 11, color: C.n700, display: 'flex', justifyContent: 'space-between', fontVariantNumeric: 'tabular-nums' }}>
                  <span>Sin IVA ({f.impuesto}% IVA)</span><span>{simbolo} {fmtMonto(base)}</span>
                </div>
                {gt && art.unidadIth === 1 && (
                  <div style={{ fontSize: 11, color: C.n700, display: 'flex', justifyContent: 'space-between', fontVariantNumeric: 'tabular-nums' }}>
                    <span>Con impuesto de turismo (ITH 10 %)</span><span>{simbolo} {fmtMonto(calcularLineaGT(total, 0, art.unidadIva, 1).total)}</span>
                  </div>
                )}
                <div style={{ fontSize: 11, color: C.n700 }}>Por {unidades.find(u => u.value === f.unidad)?.label.toLowerCase() ?? f.unidad.toLowerCase()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
