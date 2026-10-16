'use client';
// Modal «Nueva línea» de la factura. Dos formas de agregar una línea:
//   · Producto o servicio: se elige del catálogo (o se crea en el momento) y
//     trae CABYS, descripción, unidad, IVA y precio.
//   · Línea manual: se escribe todo aquí, en el orden en que se piensa
//     (qué se vende, cuánto y a qué precio) y lo opcional queda aparte.
import { useMemo, useState } from 'react';
import { C, FONT, radius, Modal, Button, Input, Select } from '@/components/ui/primitives';
import { TARIFAS_IVA, TIPOS_TRANSACCION, codigoTarifaDesdePorcentaje } from '@/data/catalogosHacienda';
import { UNIDADES, TIPOS_CODIGO } from './InventarioAvanzado';
import { CabysPicker, type FavoritoCabys } from './NuevaFacturaPartes';

export interface ValorLinea {
  articuloId: string | null;
  codigoCabys: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  codigoTarifa: string;
  unidad: string;
  codigoComercial: string;
  tipoCodigo: string;
  unidadComercial: string;
  tipoTransaccion: string;
}

export const LINEA_VACIA: ValorLinea = {
  articuloId: null, codigoCabys: '', descripcion: '', cantidad: 1, precioUnitario: 0, codigoTarifa: '08',
  unidad: 'Unid', codigoComercial: '', tipoCodigo: '01', unidadComercial: '', tipoTransaccion: '',
};

type Modo = 'producto' | 'manual';

const simboloDe = (m: string) => (m === 'USD' ? '$' : '₡');
const sinTildes = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.n700, textTransform: 'uppercase', letterSpacing: '.04em' }}>{titulo}</div>
      {children}
    </div>
  );
}
function Etiqueta({ texto, requerido, children, error }: { texto: string; requerido?: boolean; children: React.ReactNode; error?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: C.n900 }}>{texto}{requerido && <span style={{ color: C.error }}> *</span>}</span>
      {children}
      {error && <span style={{ fontSize: 11, color: C.error }}>{error}</span>}
    </label>
  );
}

export default function NuevaLineaModal({ favoritos, moneda, tipoDocumento, precioEnMoneda, inicial, editando, onAgregar, onCrearProducto, onClose }: {
  favoritos: FavoritoCabys[];
  moneda: 'CRC' | 'USD';
  tipoDocumento: string;
  precioEnMoneda: (f: FavoritoCabys) => number;
  inicial?: ValorLinea;
  editando?: boolean;
  onAgregar: (v: ValorLinea, otra: boolean) => void;
  onCrearProducto?: (nombre: string) => void;   // sin permiso de crear productos: no se ofrece
  onClose: () => void;
}) {
  const esExportacion = tipoDocumento === 'Factura de exportación';
  const esNota = tipoDocumento === 'Nota de crédito' || tipoDocumento === 'Nota de débito';
  const base = inicial ?? { ...LINEA_VACIA, codigoTarifa: esExportacion ? '01' : '08' };
  const [modo, setModo] = useState<Modo>(inicial && !inicial.articuloId ? 'manual' : 'producto');
  const [v, setV] = useState<ValorLinea>(base);
  const [busqueda, setBusqueda] = useState('');
  const [masDatos, setMasDatos] = useState(Boolean(base.unidadComercial || base.tipoTransaccion || (!base.articuloId && base.codigoComercial)));
  const [intento, setIntento] = useState(false);
  const set = (p: Partial<ValorLinea>) => setV(x => ({ ...x, ...p }));
  const elegido = v.articuloId ? favoritos.find(f => f.id === v.articuloId) : undefined;

  const lista = useMemo(() => {
    const q = sinTildes(busqueda.trim());
    return favoritos.filter(f => f.activo !== 0 && (!q || [f.nombre, f.descripcion, f.codigo, f.codigo_interno, f.categoria].some(x => sinTildes(String(x ?? '')).includes(q)))).slice(0, 30);
  }, [favoritos, busqueda]);

  const tarifas = TARIFAS_IVA.filter(t => !('soloNotas' in t) || esNota).map(t => ({ value: t.value, label: t.label }));

  function elegirProducto(f: FavoritoCabys) {
    set({
      articuloId: f.id, codigoCabys: f.codigo, descripcion: f.nombre || f.descripcion, unidad: f.unidad_medida || 'Unid',
      codigoTarifa: esExportacion ? '01' : codigoTarifaDesdePorcentaje(f.impuesto), precioUnitario: precioEnMoneda(f) || v.precioUnitario,
      codigoComercial: f.codigo_interno ?? '', tipoCodigo: f.tipo_codigo || '04',
    });
  }
  function cambiarModo(m: Modo) {
    setModo(m); setIntento(false);
    // Al pasar a manual se conserva lo elegido para ajustarlo; deja de ser del catálogo
    if (m === 'manual' && v.articuloId) set({ articuloId: null });
    if (m === 'producto' && !v.articuloId) set({ ...LINEA_VACIA, codigoTarifa: v.codigoTarifa, cantidad: v.cantidad });
  }

  const errores: Record<string, string> = {};
  if (modo === 'producto' && !v.articuloId) errores.producto = 'Elige un producto o servicio, o crea uno.';
  if (!/^\d{13}$/.test(v.codigoCabys)) errores.cabys = 'Elige un código CABYS de 13 dígitos.';
  if (!v.descripcion.trim()) errores.descripcion = 'Escribe la descripción.';
  if (!(v.cantidad > 0)) errores.cantidad = 'Mayor a 0.';
  if (!(v.precioUnitario > 0)) errores.precio = 'Mayor a 0.';
  const e = (k: string) => (intento ? errores[k] : undefined);

  function agregar(otra: boolean) {
    setIntento(true);
    if (Object.keys(errores).length) return;
    onAgregar({ ...v, descripcion: v.descripcion.trim(), codigoComercial: v.codigoComercial.trim(), unidadComercial: v.unidadComercial.trim() }, otra);
    if (otra) { setV({ ...LINEA_VACIA, codigoTarifa: esExportacion ? '01' : '08' }); setBusqueda(''); setIntento(false); }
  }

  const pestana = (m: Modo, texto: string, sub: string) => (
    <button type="button" onClick={() => cambiarModo(m)} aria-pressed={modo === m}
      style={{ flex: 1, textAlign: 'left', padding: '10px 14px', borderRadius: radius.md, cursor: 'pointer', fontFamily: FONT,
        border: `1px solid ${modo === m ? C.brand : C.n500}`, background: modo === m ? C.brandBg : '#fff' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: modo === m ? C.brand : C.n900 }}>{texto}</div>
      <div style={{ fontSize: 11, color: C.n700, marginTop: 2 }}>{sub}</div>
    </button>
  );

  const cantidadYPrecio = (
    <Seccion titulo="Cantidad y precio">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        <Etiqueta texto="Cantidad" requerido error={e('cantidad')}>
          <Input value={v.cantidad} type="number" onChange={x => set({ cantidad: Number(x) || 0 })} />
        </Etiqueta>
        <Etiqueta texto="Unidad de medida" requerido>
          <Select value={v.unidad} onChange={x => set({ unidad: x })} options={UNIDADES} disabled={modo === 'producto'} />
        </Etiqueta>
        <Etiqueta texto={`Precio unitario (${simboloDe(moneda)})`} requerido error={e('precio')}>
          <Input value={v.precioUnitario || ''} type="number" placeholder="0.00" onChange={x => set({ precioUnitario: Number(x) || 0 })} />
        </Etiqueta>
        <Etiqueta texto="IVA" requerido>
          <Select value={v.codigoTarifa} onChange={x => set({ codigoTarifa: x })} options={tarifas} disabled={esExportacion} />
        </Etiqueta>
      </div>
    </Seccion>
  );

  return (
    <Modal open title={editando ? 'Editar línea' : 'Nueva línea'} onClose={onClose} width={680}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <div style={{ display: 'flex', gap: 8 }}>
            {!editando && <Button variant="secondary" onClick={() => agregar(true)}>Agregar y crear otra</Button>}
            <Button onClick={() => agregar(false)}>{editando ? 'Guardar cambios' : 'Agregar línea'}</Button>
          </div>
        </div>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: FONT }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {pestana('producto', 'Producto o servicio', 'Del catálogo: trae CABYS, IVA y precio')}
          {pestana('manual', 'Línea manual', 'Escribes los datos solo para esta factura')}
        </div>

        {modo === 'producto' ? (
          <Seccion titulo="Producto o servicio">
            {elegido ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: `1px solid ${C.n500}`, borderRadius: radius.md }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.n900 }}>{elegido.nombre || elegido.descripcion}</div>
                  <div style={{ fontSize: 11, color: C.n700, marginTop: 2 }}>
                    CABYS {elegido.codigo}{elegido.codigo_interno ? ` · Cód. ${elegido.codigo_interno}` : ''} · {elegido.unidad_medida || 'Unid'}
                  </div>
                </div>
                <Button variant="ghost" onClick={() => set({ ...LINEA_VACIA, cantidad: v.cantidad })}>Cambiar</Button>
              </div>
            ) : <>
              <Input value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, código o CABYS" autoFocus />
              <div style={{ border: `1px solid ${e('producto') ? C.error : C.n500}`, borderRadius: radius.md, maxHeight: 230, overflowY: 'auto' }}>
                {lista.length === 0 && (
                  <div style={{ padding: '14px', fontSize: 12, color: C.n700 }}>
                    {favoritos.length === 0 ? 'Todavía no tienes productos o servicios.' : 'No hay resultados para esa búsqueda.'}
                  </div>
                )}
                {lista.map(f => (
                  <button key={f.id} type="button" onClick={() => elegirProducto(f)}
                    style={{ display: 'flex', width: '100%', gap: 12, alignItems: 'center', padding: '9px 14px', border: 'none', borderBottom: `1px solid ${C.n200}`, background: '#fff', cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = C.n200)} onMouseLeave={ev => (ev.currentTarget.style.background = '#fff')}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12.5, color: C.n900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nombre || f.descripcion}</span>
                      <span style={{ display: 'block', fontSize: 10.5, color: C.n700 }}>{f.codigo}{f.categoria ? ` · ${f.categoria}` : ''}</span>
                    </span>
                    <span style={{ fontSize: 12, color: C.n900, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {simboloDe(f.moneda === 'USD' ? 'USD' : 'CRC')} {Number(f.precio_unitario || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {e('producto') ? <span style={{ fontSize: 11, color: C.error }}>{e('producto')}</span> : <span />}
                {onCrearProducto && <button type="button" onClick={() => onCrearProducto?.(busqueda.trim())}
                  style={{ background: 'none', border: 'none', padding: 0, color: C.brand, fontFamily: FONT, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  + Crear producto o servicio{busqueda.trim() ? ` «${busqueda.trim()}»` : ''}
                </button>}
              </div>
            </>}
          </Seccion>
        ) : (
          <Seccion titulo="Bien o servicio">
            <Etiqueta texto="Código CABYS" requerido error={e('cabys')}>
              <CabysPicker valor={v.codigoCabys} favoritos={[]} autoFocus
                onEscribir={x => set({ codigoCabys: x.replace(/\s/g, '') })}
                onElegir={x => set({
                  codigoCabys: x.codigo, descripcion: v.descripcion || x.descripcion,
                  codigoTarifa: esExportacion ? '01' : codigoTarifaDesdePorcentaje(x.impuesto),
                })} />
            </Etiqueta>
            <Etiqueta texto="Descripción de la línea" requerido error={e('descripcion')}>
              <Input value={v.descripcion} onChange={x => set({ descripcion: x })} placeholder="Lo que verá el cliente en la factura" />
            </Etiqueta>
          </Seccion>
        )}

        {(modo === 'manual' || elegido) && cantidadYPrecio}

        {modo === 'manual' && (
          <div style={{ borderTop: `1px dashed ${C.n500}`, paddingTop: 14 }}>
            <button type="button" onClick={() => setMasDatos(x => !x)} aria-expanded={masDatos}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 500, color: C.n900, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', transform: masDatos ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span>
              Datos opcionales
              <span style={{ fontWeight: 400, color: C.n700 }}>(código propio, unidad comercial, tipo de transacción)</span>
            </button>
            {masDatos && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 12 }}>
                <Etiqueta texto="Código">
                  <Input value={v.codigoComercial} onChange={x => set({ codigoComercial: x })} placeholder="Ej.: 001" />
                </Etiqueta>
                <Etiqueta texto="Tipo de código">
                  <Select value={v.tipoCodigo} onChange={x => set({ tipoCodigo: x })} options={TIPOS_CODIGO} disabled={!v.codigoComercial.trim()} />
                </Etiqueta>
                <Etiqueta texto="Unidad de medida comercial">
                  <Input value={v.unidadComercial} onChange={x => set({ unidadComercial: x.slice(0, 20) })} placeholder="Ej.: paquete de 6" />
                </Etiqueta>
                <Etiqueta texto="Tipo de transacción">
                  <Select value={v.tipoTransaccion} onChange={x => set({ tipoTransaccion: x })}
                    options={[{ value: '', label: 'Venta normal (sin indicar)' }, ...TIPOS_TRANSACCION.filter(t => t.value !== '01').map(t => ({ value: t.value, label: t.label }))]} />
                </Etiqueta>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
