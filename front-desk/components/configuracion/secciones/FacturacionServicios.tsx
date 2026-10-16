'use client';
// Configuración › Facturación › Servicios: servicios facturables, de agencia y simples con sus precios e impuestos.
import { BarraSeccion } from '@/components/layout/Pantalla';
import { BotonExportar, exportarCSV } from '@/components/hotel/ui';
import { useState } from 'react';
import { C, fmtNum } from '@/components/suite/tokens';
import { Button, Input, Modal, Select } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { useDato } from '../store';
import { CrudCatalogo } from '../CrudCatalogo';
import { Aviso, Buscador, Campo, CardTabs, Celda, Fila, FilaVacia, Grid, IcTrash, IconButton, ItemMaestro, OutlineButton, PillTabs, Tabla, norm, uid, useConfirmar } from '../kit';
import { MONEDAS_OPC, type ServAgencia, type ServFacturacion, type ServSimple } from '../datos';
import { CabeceraDetalle, MaestroDetalle, ops } from './FacturacionPiezas';

// ── Servicios ───────────────────────────────────────────────────────────────
const SUBTABS = ['Servicios de facturación', 'Servicios de agencia', 'Servicios simples'] as const;
export function Servicios() {
  const [sub, setSub] = useState<(typeof SUBTABS)[number]>('Servicios de facturación');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PillTabs tabs={SUBTABS} active={sub} onChange={setSub} />
      {sub === 'Servicios de facturación' && <ServFact />}
      {sub === 'Servicios de agencia' && <ServAg />}
      {sub === 'Servicios simples' && <ServSimples />}
    </div>
  );
}

/** Lista de impuestos o descuentos asociados (ids), con porcentaje y «+ Nuevo». */
function Asociados({ ids, onChange, catalogo, nuevoLabel, cabecera }: {
  ids: string[]; onChange: (v: string[]) => void; catalogo: { id: string; descripcion: string; porcentaje: number }[]; nuevoLabel: string; cabecera: string;
}) {
  const libres = catalogo.filter(x => !ids.includes(x.id));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div><OutlineButton icon={<IcPlus size={12} />} disabled={!libres.length} onClick={() => onChange([...ids, libres[0].id])}>{nuevoLabel}</OutlineButton></div>
      <Tabla headers={[cabecera, 'Porcentaje', '']} alinearDerecha={[1]} anchos={{ 1: 110, 2: 40 }}>
        {ids.length === 0 && <FilaVacia cols={3} texto="Sin registros asociados." />}
        {ids.map((id, i) => {
          const x = catalogo.find(c => c.id === id);
          return (
            <Fila key={id}>
              <Celda><Select value={id} onChange={v => onChange(ids.map((y, j) => (j === i ? v : y)))} options={catalogo.filter(c => c.id === id || !ids.includes(c.id)).map(c => ({ value: c.id, label: c.descripcion }))} /></Celda>
              <Celda derecha>{x ? fmtNum(x.porcentaje) : '-'}</Celda>
              <Celda><IconButton label="Quitar" tono="peligro" onClick={() => onChange(ids.filter(y => y !== id))}><IcTrash /></IconButton></Celda>
            </Fila>
          );
        })}
      </Tabla>
    </div>
  );
}

function useNuevoServicio<T extends { id: string; codigo: string }>(lista: T[], setLista: (f: (l: T[]) => T[]) => void, crear: (nombre: string, codigo: string) => T, onCreado: (id: string) => void) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ nombre: '', codigo: '' });
  const [error, setError] = useState('');
  const guardar = () => {
    if (!f.nombre.trim() || !f.codigo.trim()) return setError('Nombre y código son obligatorios.');
    if (lista.some(x => x.codigo.toLowerCase() === f.codigo.trim().toLowerCase())) return setError('Ya existe un servicio con ese código.');
    const n = crear(f.nombre.trim(), f.codigo.trim().toUpperCase());
    setLista(l => [...l, n]); onCreado(n.id); setOpen(false);
  };
  const modal = (titulo: string) => (
    <Modal open={open} onClose={() => setOpen(false)} title={titulo} width={440}
      footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={guardar}>Guardar</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Campo label="Nombre del servicio" required><Input value={f.nombre} onChange={v => setF({ ...f, nombre: v })} placeholder="Ej: Restaurante exonerado" autoFocus /></Campo>
        <Campo label="Código" required><Input value={f.codigo} onChange={v => setF({ ...f, codigo: v })} placeholder="Ej: ABK" /></Campo>
        <p style={{ fontSize: 11, color: C.n700, margin: 0 }}>Después de crearlo configuras precios, impuestos y demás datos en el panel derecho.</p>
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
      </div>
    </Modal>
  );
  return { abrir: () => { setF({ nombre: '', codigo: '' }); setError(''); setOpen(true); }, modal };
}

function ServFact() {
  const [lista, setLista] = useDato('serviciosFact');
  const [grupos] = useDato('gruposProd');
  const [impuestos] = useDato('impuestos');
  const [descuentos] = useDato('descuentos');
  const [selId, setSelId] = useState(lista[0]?.id ?? '');
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'Precios' | 'Impuestos' | 'Descuentos'>('Precios');
  const { pedir, dialogo } = useConfirmar();
  const nuevo = useNuevoServicio<ServFacturacion>(lista, setLista, (nombre, codigo) => ({ id: uid(), nombre, codigo, concepto: '', precios: [], impuestos: [], descuentos: [] }), setSelId);
  const sel = lista.find(s => s.id === selId);
  const set = (p: Partial<ServFacturacion>) => sel && setLista(l => l.map(s => (s.id === sel.id ? { ...s, ...p } : s)));
  const conceptos = grupos.flatMap(g => g.conceptos.map(c => c.descripcion));
  const tabs = [`Precios (${sel?.precios.length ?? 0})`, `Impuestos (${sel?.impuestos.length ?? 0})`, `Descuentos (${sel?.descuentos.length ?? 0})`];

  return (
    <>
      <Aviso>Selecciona un servicio para configurar sus precios por moneda, impuestos aplicables y descuentos.</Aviso>
      <MaestroDetalle lista={<>
        <BarraSeccion filtros={<Buscador value={q} onChange={setQ} placeholder="Buscar servicio" width={240} />}
          acciones={<><BotonExportar disabled={!lista.length} titulo="Servicios de facturación" onCSV={() => exportarCSV('servicios-facturacion', ['Código', 'Nombre', 'Concepto', 'Precios'], lista.filter(s => norm(s.nombre + s.codigo).includes(norm(q))).map(s => [s.codigo, s.nombre, s.concepto, s.precios.map(p => `${p.moneda} ${p.precio}`).join(' · ')]))} /><Button icon={<IcPlus size={12} />} onClick={nuevo.abrir}>Nuevo servicio</Button></>} />
        <div>{lista.filter(s => norm(s.nombre + s.codigo).includes(norm(q))).map(s => <ItemMaestro key={s.id} titulo={s.nombre} detalle={s.codigo} activo={s.id === selId} onClick={() => setSelId(s.id)} />)}</div>
      </>}>
        {sel ? <>
          <CabeceraDetalle titulo={sel.nombre} sub={`Código ${sel.codigo}`} onEliminar={() => pedir('Eliminar servicio', `¿Eliminar «${sel.nombre}»?`, () => { setLista(l => l.filter(s => s.id !== sel.id)); setSelId(''); })} />
          <Grid cols={2}>
            <Campo label="Nombre del servicio"><Input value={sel.nombre} onChange={v => set({ nombre: v })} /></Campo>
            <Campo label="Concepto de producción"><Select value={sel.concepto} onChange={v => set({ concepto: v })} options={[{ value: '', label: 'Seleccione' }, ...ops(conceptos)]} /></Campo>
          </Grid>
          <CardTabs tabs={tabs} active={tabs.find(t => t.startsWith(tab)) ?? tabs[0]} onChange={t => setTab(t.split(' ')[0] as typeof tab)} />
          {tab === 'Precios' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><OutlineButton icon={<IcPlus size={12} />} disabled={sel.precios.length >= MONEDAS_OPC.length}
                onClick={() => set({ precios: [...sel.precios, { id: uid(), moneda: MONEDAS_OPC.find(m => !sel.precios.some(p => p.moneda === m)) ?? MONEDAS_OPC[0], precio: 0 }] })}>Nuevo precio</OutlineButton></div>
              <Tabla headers={['Moneda', 'Precio', '']} alinearDerecha={[1]} anchos={{ 1: 140, 2: 40 }}>
                {sel.precios.length === 0 && <FilaVacia cols={3} texto="Sin precios. Agrega uno por moneda." />}
                {sel.precios.map(p => (
                  <Fila key={p.id}>
                    <Celda><Select value={p.moneda} onChange={v => set({ precios: sel.precios.map(x => (x.id === p.id ? { ...x, moneda: v } : x)) })} options={ops(MONEDAS_OPC)} /></Celda>
                    <Celda><Input type="number" value={p.precio} onChange={v => set({ precios: sel.precios.map(x => (x.id === p.id ? { ...x, precio: Number(v) || 0 } : x)) })} style={{ textAlign: 'right' }} aria-label={`Precio en ${p.moneda}`} /></Celda>
                    <Celda><IconButton label="Quitar precio" tono="peligro" onClick={() => set({ precios: sel.precios.filter(x => x.id !== p.id) })}><IcTrash /></IconButton></Celda>
                  </Fila>
                ))}
              </Tabla>
            </div>
          )}
          {tab === 'Impuestos' && <Asociados ids={sel.impuestos} onChange={v => set({ impuestos: v })} catalogo={impuestos} nuevoLabel="Nuevo impuesto" cabecera="Impuesto" />}
          {tab === 'Descuentos' && <Asociados ids={sel.descuentos} onChange={v => set({ descuentos: v })} catalogo={descuentos} nuevoLabel="Nuevo descuento" cabecera="Descuento" />}
        </> : <p style={{ fontSize: 12, color: C.n700 }}>Selecciona o crea un servicio.</p>}
      </MaestroDetalle>
      {nuevo.modal('Nuevo servicio de facturación')}
      {dialogo}
    </>
  );
}

function ServAg() {
  const [lista, setLista] = useDato('serviciosAgencia');
  const [habs] = useDato('habitaciones');
  const [regs] = useDato('regimenes');
  const [impuestos] = useDato('impuestos');
  const [selId, setSelId] = useState(lista[0]?.id ?? '');
  const [q, setQ] = useState('');
  const { pedir, dialogo } = useConfirmar();
  const nuevo = useNuevoServicio<ServAgencia>(lista, setLista, (nombre, codigo) => ({ id: uid(), nombre, codigo, uso: '', regimen: '', tipo: 'Diario', impuestos: [] }), setSelId);
  const sel = lista.find(s => s.id === selId);
  const set = (p: Partial<ServAgencia>) => sel && setLista(l => l.map(s => (s.id === sel.id ? { ...s, ...p } : s)));
  return (
    <>
      <Aviso>Servicios que se cargan en las reservas de agencia: combinan el uso de habitación, el régimen y los impuestos.</Aviso>
      <MaestroDetalle lista={<>
        <BarraSeccion filtros={<Buscador value={q} onChange={setQ} placeholder="Buscar servicio" width={240} />}
          acciones={<><BotonExportar disabled={!lista.length} titulo="Servicios de agencia" onCSV={() => exportarCSV('servicios-agencia', ['Código', 'Nombre', 'Uso', 'Régimen', 'Tipo'], lista.filter(s => norm(s.nombre + s.codigo).includes(norm(q))).map(s => [s.codigo, s.nombre, s.uso, s.regimen, s.tipo]))} /><Button icon={<IcPlus size={12} />} onClick={nuevo.abrir}>Nuevo servicio</Button></>} />
        <div>{lista.filter(s => norm(s.nombre + s.codigo).includes(norm(q))).map(s => <ItemMaestro key={s.id} titulo={s.nombre} detalle={s.codigo} activo={s.id === selId} onClick={() => setSelId(s.id)} />)}</div>
      </>}>
        {sel ? <>
          <CabeceraDetalle titulo={sel.nombre} onEliminar={() => pedir('Eliminar servicio', `¿Eliminar «${sel.nombre}»?`, () => { setLista(l => l.filter(s => s.id !== sel.id)); setSelId(''); })} />
          <Grid cols={2}>
            <Campo label="Uso de habitación"><Select value={sel.uso} onChange={v => set({ uso: v })} options={[{ value: '', label: 'Seleccione' }, ...habs.map(h => ({ value: h.codigo, label: `Habitación - ${h.codigo} ${h.tipo}` }))]} /></Campo>
            <Campo label="Código"><Input value={sel.codigo} onChange={v => set({ codigo: v.toUpperCase() })} placeholder="Ej: HAB_ES_1A0N" /></Campo>
            <Campo label="Régimen de alojamiento"><Select value={sel.regimen} onChange={v => set({ regimen: v })} options={[{ value: '', label: 'Seleccione régimen' }, ...regs.map(r => ({ value: r.codigo, label: `${r.codigo} · ${r.descripcion}` }))]} /></Campo>
            <Campo label="Tipo"><Select value={sel.tipo} onChange={v => set({ tipo: v })} options={ops(['Diario', 'Primera noche', 'Por estancia'])} /></Campo>
          </Grid>
          <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>Impuestos</p>
          <Asociados ids={sel.impuestos} onChange={v => set({ impuestos: v })} catalogo={impuestos} nuevoLabel="Nuevo impuesto" cabecera="Impuesto" />
        </> : <p style={{ fontSize: 12, color: C.n700 }}>Selecciona o crea un servicio.</p>}
      </MaestroDetalle>
      {nuevo.modal('Nuevo servicio de agencia')}
      {dialogo}
    </>
  );
}

function ServSimples() {
  const [lista, setLista] = useDato('serviciosSimples');
  const [grupos] = useDato('gruposProd');
  return (
    <CrudCatalogo<ServSimple> entidad="servicio simple" filas={lista} onChange={setLista} nombre={s => `${s.codigo} - ${s.descripcion}`} buscarEn={['codigo', 'descripcion']}
      nuevo={() => ({ codigo: '', descripcion: '', tipo: 'Alojamiento', concepto: '', modo: 'Precio', moneda: MONEDAS_OPC[0], precio: 0, porcentaje: 0 })}
      columnas={[
        { key: 'codigo', label: 'Código', link: true, ancho: 80 }, { key: 'descripcion', label: 'Descripción' }, { key: 'tipo', label: 'Tipo' },
        { key: 'concepto', label: 'Concepto de producción' },
        { key: 'dif', label: 'Dif. precio', render: s => (s.modo === 'Precio' ? 'Precio fijo' : 'Porcentaje') },
        { key: 'valor', label: 'Precio / Porc.', derecha: true, render: s => (s.modo === 'Precio' ? `${s.moneda.slice(0, 3)} ${fmtNum(s.precio)}` : `${fmtNum(s.porcentaje)} %`) },
      ]}
      contador={false}
      campos={[
        { key: 'codigo', label: 'Código', requerido: true, unico: true, placeholder: 'Ej: ABC', span: 2 },
        { key: 'descripcion', label: 'Descripción', requerido: true, placeholder: 'Ej: Servicio a la habitación', span: 4 },
        { key: 'tipo', label: 'Tipo', tipo: 'select', opciones: ['Alojamiento', 'Transporte', 'Alimentos y bebidas', 'Otros'], span: 3 },
        { key: 'concepto', label: 'Concepto de producción', tipo: 'select', opciones: grupos.flatMap(g => g.conceptos.map(c => c.descripcion)), span: 3 },
        { key: 'modo', label: 'Configuración de precio', tipo: 'radio', opciones: ['Precio', 'Porcentaje'] },
        { key: 'moneda', label: 'Moneda', tipo: 'select', opciones: MONEDAS_OPC, span: 3, deshabilitar: s => s.modo !== 'Precio' },
        { key: 'precio', label: 'Precio', tipo: 'number', span: 3, deshabilitar: s => s.modo !== 'Precio' },
        { key: 'porcentaje', label: 'Porcentaje', tipo: 'number', span: 3, sufijo: '%', deshabilitar: s => s.modo !== 'Porcentaje' },
      ]} />
  );
}
