'use client';
import { conContabilidad } from '@/lib/modulosCliente';
// Modal único para crear un producto o servicio rápido. Lo usan
// Configuración › Productos/Servicios y la factura (al escribir un artículo
// que no existe). Con un grupo CABYS se llenan solos el CABYS, el IVA, la
// unidad y las cuentas; solo falta el nombre y el precio.
// «Formulario avanzado» abre la ficha completa del producto. Desde una
// factura, la factura queda guardada en la sesión y al terminar se vuelve a ella.
import { useState } from 'react';
import { C, FONT, Button, FormField, Input, Select, Modal } from '@/components/ui/primitives';
import { CABYS, buscarCabys } from '@/data/cabysData';

const tipoDeCabys = (c: string) => (Number(c?.[0]) <= 4 ? 'Producto' : 'Servicio');
import { useCabys } from '@/lib/useCabys';
import { useGrupos, SelectorGrupo, type GrupoProducto } from './GruposProductos';
import { MontoInput } from '@/components/ui/Monto';
import { UNIDADES } from './InventarioAvanzado';
import { Flotante, type FavoritoCabys } from './NuevaFacturaPartes';
import { CLAVE_BORRADOR } from './ProductoPantalla';

export default function ProductoRapidoModal({ contexto, nombreInicial = '', moneda = 'CRC', onClose, onCreado, onAvanzado }: {
  contexto: 'config' | 'factura';
  nombreInicial?: string; moneda?: 'CRC' | 'USD';
  onClose: () => void;
  onCreado: (f: FavoritoCabys) => void;
  onAvanzado: () => void;               // el borrador del producto ya quedó guardado para la ficha
}) {
  const { grupos, recargar: recargarGrupos } = useGrupos();
  const [grupoId, setGrupoId] = useState('');
  const [nombre, setNombre] = useState(nombreInicial);
  const [cabysQ, setCabysQ] = useState('');
  const [cabys, setCabys] = useState<{ codigo: string; descripcion: string; impuesto: number } | null>(null);
  const [precio, setPrecio] = useState('');
  const [mon, setMon] = useState<'CRC' | 'USD'>(moneda);
  const [unidad, setUnidad] = useState('Unid');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [ancla, setAncla] = useState<HTMLDivElement | null>(null);
  const g = grupos.find(x => x.id === grupoId);
  const { lista: encontrados, buscando } = useCabys(cabysQ, 8);
  const sugeridos = !g && !cabys && cabysQ.trim().length >= 2 ? encontrados : [];
  const codigoActual = cabys?.codigo ?? (/^\d{13}$/.test(cabysQ.replace(/\D/g, '')) ? cabysQ.replace(/\D/g, '') : '');
  const tipoActual = codigoActual ? tipoDeCabys(codigoActual) : null;

  function elegirGrupo(id: string, directo?: GrupoProducto) {
    setGrupoId(id);
    const x = directo ?? grupos.find(y => y.id === id);
    if (x) { setCabys({ codigo: x.codigo_cabys, descripcion: x.descripcion_cabys, impuesto: x.impuesto }); setUnidad(x.unidad); setMon(x.moneda === 'USD' ? 'USD' : 'CRC'); }
  }

  async function guardar() {
    const cod = cabys?.codigo ?? cabysQ.replace(/\D/g, '');
    if (!nombre.trim()) { setError('Escribe el nombre.'); return; }
    if (!/^\d{13}$/.test(cod)) { setError('Elige un grupo o un código CABYS.'); return; }
    if (contexto === 'factura' && !(Number(precio) > 0)) { setError('Escribe el precio sin IVA.'); return; }
    setGuardando(true);
    const body = {
      codigo: cod, descripcionCabys: cabys?.descripcion ?? CABYS.find(c => c.codigo === cod)?.descripcion ?? nombre, nombre: nombre.trim(),
      precioUnitario: Number(precio) || 0, moneda: mon, unidadMedida: unidad, codigoInterno: codigo.trim(), tipoCodigo: codigo.trim() ? '04' : '',
      ...(g ? { grupoId: g.id, impuesto: g.impuesto, categoria: g.nombre, cuentaIngreso: g.cuenta_ingreso, cuentaCosto: g.cuenta_costo, centroCosto: g.centro_costo ?? '' }
        : { impuesto: cabys?.impuesto ?? 13, categoria: 'Otros', cuentaIngreso: '600-001-0001' }),
    };
    const r = await fetch('/api/cabys-favoritos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    setGuardando(false);
    if (!r.ok) { setError(d.error ?? 'No se pudo crear.'); return; }
    onCreado({
      id: d.id, codigo: d.codigo, descripcion: d.descripcion, nombre: body.nombre, impuesto: Number(body.impuesto), precio_unitario: body.precioUnitario,
      unidad_medida: unidad, moneda: mon, categoria: body.categoria, codigo_interno: body.codigoInterno, tipo_codigo: body.tipoCodigo, activo: 1,
    });
  }

  // Lo escrito pasa a la ficha completa
  function abrirAvanzado() {
    const cod = cabys?.codigo ?? cabysQ.replace(/\D/g, '');
    const cat = cabys ?? CABYS.find(c => c.codigo === cod) ?? (cod.length === 13 ? undefined : buscarCabys(cabysQ)[0]);
    const borrador = {
      nombre, precioBase: precio, moneda: mon, unidad, codigoInterno: codigo,
      ...(g ? { grupoId: g.id, cuentaIngreso: g.cuenta_ingreso, cuentaCosto: g.cuenta_costo, centroCosto: g.centro_costo ?? '', impuesto: g.impuesto } : {}),
      ...(cat ? { cabys: cat.codigo, cabysDesc: cat.descripcion, impuesto: cat.impuesto, tipo: tipoDeCabys(cat.codigo) } : cod.length === 13 ? { cabys: cod, tipo: tipoDeCabys(cod) } : {}),
    };
    try { sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify(borrador)); } catch { /* se abre vacío */ }
    onAvanzado();
  }

  const pie = confirmarSalida ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: C.n900, flex: '1 1 280px' }}><b style={{ fontWeight: 600 }}>Vas a salir de esta factura un momento.</b> Al guardar el producto vuelves a ella, con todo lo que llevas y el producto ya puesto.</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" onClick={() => setConfirmarSalida(false)}>Seguir en la factura</Button>
        <Button onClick={abrirAvanzado}>Abrir formulario avanzado</Button>
      </div>
    </div>
  ) : (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <button onClick={() => contexto === 'factura' ? setConfirmarSalida(true) : abrirAvanzado()}
        style={{ fontSize: 12, color: C.brand, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500, fontFamily: FONT }}>
        Formulario avanzado
      </button>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : contexto === 'factura' ? 'Crear y usar en la línea' : 'Guardar'}</Button>
      </div>
    </div>
  );

  return (
    <Modal open width={760} title="Nuevo producto o servicio" onClose={onClose} footer={pie}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormField label="Grupo CABYS" hint={g ? `Se completan CABYS ${g.codigo_cabys}, IVA ${g.impuesto}%${conContabilidad() ? ', unidad y cuentas' : ' y unidad'}.` : 'Con un grupo solo te falta el nombre y el precio.'}>
          <SelectorGrupo grupos={grupos} value={grupoId} onChange={id => elegirGrupo(id)} onCreado={x => { recargarGrupos(); elegirGrupo(x.id, x); }}
            inicial={cabys ? { codigoCabys: cabys.codigo, descripcionCabys: cabys.descripcion, impuesto: cabys.impuesto } : undefined} />
        </FormField>
        {!g && (
          <FormField label="Código CABYS" required hint={cabys ? `${cabys.codigo} · ${cabys.descripcion} · IVA ${cabys.impuesto}%` : buscando ? 'Buscando en el catálogo de Hacienda…' : 'Busca por descripción o escribe los 13 dígitos.'}>
            <div ref={setAncla}>
              <Input value={cabysQ} onChange={v => { setCabysQ(v); setCabys(null); }} placeholder="Ej. alojamiento o 6311100000000" />
              <Flotante anchor={ancla} open={sugeridos.length > 0}>
                <div>
                  {sugeridos.map(c => (
                    <div key={c.codigo} onClick={() => { setCabys(c); setCabysQ(c.codigo); if (!nombre) setNombre(c.descripcion); }}
                      style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 11.5, borderBottom: `1px solid ${C.n200}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.n200)} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                      <b style={{ fontWeight: 500 }}>{c.descripcion}</b> <span style={{ color: C.n700 }}>{c.codigo} · IVA {c.impuesto}%</span>
                    </div>
                  ))}
                </div>
              </Flotante>
            </div>
          </FormField>
        )}
        {/* Producto o servicio: lo dicta el CABYS, por eso va después */}
        <FormField label="Tipo" hint={codigoActual ? 'Lo define el código CABYS (Hacienda).' : 'Se completa al elegir el grupo o el código CABYS.'}>
          <div style={{ display: 'flex', gap: 4, padding: 3, background: C.n200, border: `1px solid ${C.n500}`, borderRadius: 8, maxWidth: 320 }}>
            {(['Producto', 'Servicio'] as const).map(t => {
              const sel = tipoActual === t;
              return <div key={t} aria-selected={sel} style={{ flex: 1, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, fontSize: 13, fontFamily: FONT,
                background: sel ? C.n000 : 'transparent', color: sel ? C.n900 : C.n700, fontWeight: sel ? 600 : 400, boxShadow: sel ? '0 1px 3px rgba(0,0,0,.12)' : 'none', cursor: 'default' }}>{t}</div>;
            })}
          </div>
        </FormField>
        <FormField label="Nombre" required hint="Así aparece en la factura.">
          <Input value={nombre} onChange={setNombre} autoFocus placeholder="Ej. Hospedaje habitación doble (noche)" />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1.2fr 1fr 1fr', gap: 12 }}>
          <FormField label="Moneda"><Select value={mon} onChange={v => setMon(v as 'CRC' | 'USD')} options={[{ value: 'CRC', label: '₡ Colones' }, { value: 'USD', label: '$ Dólares' }]} /></FormField>
          <FormField label="Precio sin IVA" required={contexto === 'factura'}><MontoInput value={precio} onChange={setPrecio} moneda={mon} /></FormField>
          <FormField label="Unidad de medida"><Select value={unidad} onChange={setUnidad} options={UNIDADES} /></FormField>
          <FormField label="Código propio"><Input value={codigo} onChange={v => setCodigo(v.toUpperCase())} placeholder="Opcional" style={{ whiteSpace: 'nowrap' }} /></FormField>
        </div>
        {error && <div style={{ fontSize: 12, color: C.error, background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
      </div>
    </Modal>
  );
}
