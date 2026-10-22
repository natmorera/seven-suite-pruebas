'use client';
// Tarifas / Contratos › Contratos: lista de contratos a la izquierda y, a la derecha, el contrato elegido con sus
// pestañas: Datos, Servicios de agencia, Impuestos, Políticas, Cupos y precios directos y Restricción.
// La lista y el encabezado del contrato (nombre + pestañas) quedan fijos al hacer scroll.
import { useState, type ReactNode } from 'react';
import { BarraSeccion } from '@/components/layout/Pantalla';
import { C } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Select } from '@/components/suite/ui';
import { useDato } from '../store';
import { Buscador, CabeceraDetalle, Campo, CardTabs, MaestroDetalle, Celda, Fila, FilaVacia, IcTrash, IconButton, ItemMaestro, Tabla, TextArea, norm, uid, useConfirmar } from '../kit';
import { CUENTAS_OPC, IDIOMAS, RESTRICCIONES_CONTRATO, type Contrato, type RestriccionContrato } from '../datos';
import { CuposDeContrato } from './CuposContratos';

const PESTANAS = ['Datos', 'Servicios de agencia', 'Impuestos', 'Políticas', 'Cupos y precios directos', 'Restricción'] as const;
type Pestana = (typeof PESTANAS)[number];
const MODOS_PAGO = ['Contado', 'Crédito', 'Prepago', 'Transferencia', 'Tarjeta de crédito'];
const fmt = (d: string) => (d ? d.split('-').reverse().join('/') : '-');
const ops = (xs: string[], vacio = '-') => [{ value: '', label: vacio }, ...xs.map(x => ({ value: x, label: x }))];

const nuevoContrato = (): Contrato => ({
  id: uid(), codigo: 'NUEVO', nombre: 'Nuevo contrato', nacionalidad: '', empresa: '', mercado: '', descuento: '', tarifa: '', tasaFija: 0, depGarantia: false,
  cSab: 1, cpl: false, modoPago: '', webCheckin: true, cuenta: '', maxDias: 0, saldoMax: 0, desde: '', hasta: '', activo: true, observaciones: '',
  servicios: [], impuestos: [], politicas: {}, restricciones: [],
});

export default function Contratos() {
  const [lista, setLista] = useDato('contratos');
  const [empresas] = useDato('empresas');
  const [mercados] = useDato('mercados');
  const [tarifas] = useDato('tarifas');
  const [descuentos] = useDato('descuentos');
  const [nacionalidades] = useDato('nacionalidades');
  const [q, setQ] = useState('');
  const [inactivos, setInactivos] = useState(false);
  // ?contrato=<id>&pestana=cupos abre ese contrato en esa pestaña (enlace desde el Dashboard).
  const param = (k: string) => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(k));
  const [selId, setSelId] = useState(() => (lista.some(x => x.id === param('contrato')) ? param('contrato')! : lista[0]?.id ?? ''));
  const [pestana, setPestana] = useState<Pestana>(() => (param('pestana') === 'cupos' ? 'Cupos y precios directos' : 'Datos'));
  const { pedir, dialogo } = useConfirmar();
  const visibles = lista.filter(c => (inactivos || c.activo) && (!q.trim() || norm(`${c.codigo} ${c.nombre} ${c.empresa}`).includes(norm(q))))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
  const c = lista.find(x => x.id === selId) ?? visibles[0];
  const set = (p: Partial<Contrato>) => c && setLista(xs => xs.map(x => (x.id === c.id ? { ...x, ...p } : x)));
  const nuevo = () => { const n = nuevoContrato(); setLista(xs => [...xs, n]); setSelId(n.id); setQ(''); };

  const texto = (k: 'codigo' | 'nombre', label: string, required?: boolean) =>
    <Campo label={label} required={required}><Input value={c?.[k] ?? ''} onChange={v => set({ [k]: k === 'codigo' ? v.toUpperCase() : v })} /></Campo>;
  const numero = (k: 'tasaFija' | 'cSab' | 'maxDias' | 'saldoMax', label: string, decimales = 0) =>
    <Campo label={label}><Input type="number" value={c ? String(c[k]) : ''} onChange={v => set({ [k]: Number(v) || 0 } as Partial<Contrato>)} style={{ textAlign: 'right' }} step={decimales ? String(1 / 10 ** decimales) : '1'} /></Campo>;

  return (
    <>
      <BarraSeccion
        filtros={<><Buscador value={q} onChange={setQ} placeholder="Buscar contrato" width={240} /><Checkbox checked={inactivos} onChange={setInactivos} label="Mostrar inactivos" /></>}
        acciones={<Button onClick={nuevo}>Nuevo contrato</Button>}
        derecha={<span style={{ fontSize: 12, color: C.n700 }}>{visibles.length} contratos</span>} />
      <MaestroDetalle titulo="Contratos" contador={visibles.length} pegajoso vacio={c ? undefined : 'Crea un contrato con «Nuevo contrato».'}
        lista={<>
          {visibles.length === 0 && <p style={{ margin: 0, padding: 10, fontSize: 12, color: C.n700 }}>Sin resultados.</p>}
          {visibles.map(x => (
            <ItemMaestro key={x.id} activo={x.id === c?.id} onClick={() => setSelId(x.id)}
              titulo={x.codigo} detalle={<>{x.nombre}{!x.activo && ' · inactivo'}</>} />
          ))}
        </>}>
        {c && <>
          <CabeceraDetalle titulo={c.codigo} sub={`${c.nombre} · ${fmt(c.desde)} – ${fmt(c.hasta)}`}
            acciones={<Checkbox checked={c.activo} onChange={b => set({ activo: b })} label="Activo" />}
            onEliminar={() => pedir('Eliminar contrato', `¿Eliminar el contrato «${c.nombre}»?`, () => { setLista(xs => xs.filter(x => x.id !== c.id)); setSelId(''); })} />
          <CardTabs tabs={PESTANAS} active={pestana} onChange={setPestana} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {pestana === 'Datos' && <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
                {texto('codigo', 'Código', true)}
                <div style={{ gridColumn: 'span 2' }}>{texto('nombre', 'Descripción', true)}</div>
                <Campo label="Nacionalidad"><Select value={c.nacionalidad} onChange={v => set({ nacionalidad: v })} options={ops(nacionalidades.map(n => n.pais))} /></Campo>

                <Campo label="Empresa" required><Select value={c.empresa} onChange={v => set({ empresa: v })} options={ops(empresas.filter(e => e.activo || e.descripcion === c.empresa).map(e => e.descripcion), 'Selecciona')} /></Campo>
                <Campo label="Mercado"><Select value={c.mercado} onChange={v => set({ mercado: v })} options={ops(mercados.filter(m => m.activo || m.descripcion === c.mercado).map(m => m.descripcion))} /></Campo>
                <Campo label="Descuento"><Select value={c.descuento} onChange={v => set({ descuento: v })} options={ops(descuentos.map(d => d.descripcion))} /></Campo>
                <Campo label="Tarifario"><Select value={c.tarifa} onChange={v => set({ tarifa: v })} options={ops(tarifas.map(t => t.nombre))} /></Campo>

                <Campo label="Vigente desde"><Input type="date" value={c.desde} onChange={v => set({ desde: v })} /></Campo>
                <Campo label="Vigente hasta" error={c.desde && c.hasta && c.hasta < c.desde ? 'Anterior a «desde».' : undefined}><Input type="date" value={c.hasta} min={c.desde} onChange={v => set({ hasta: v })} /></Campo>
                <Campo label="Modo de pago"><Select value={c.modoPago} onChange={v => set({ modoPago: v })} options={ops(MODOS_PAGO)} /></Campo>
                <Campo label="Cuenta"><Select value={c.cuenta} onChange={v => set({ cuenta: v })} options={ops(CUENTAS_OPC)} /></Campo>

                {numero('tasaFija', 'Tasa fija', 4)}
                {numero('cSab', 'C. Sáb.')}
                {numero('maxDias', 'Máx. días')}
                {numero('saldoMax', 'Saldo máximo', 2)}
              </div>
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                <Checkbox checked={c.depGarantia} onChange={b => set({ depGarantia: b })} label="Depósito en garantía" />
                <Checkbox checked={c.cpl} onChange={b => set({ cpl: b })} label="Contrato CPL" />
                <Checkbox checked={c.webCheckin} onChange={b => set({ webCheckin: b })} label="Web Check-in automático" />
              </div>
              <Campo label="Observaciones"><TextArea value={c.observaciones} onChange={v => set({ observaciones: v })} rows={3} placeholder="Notas internas del contrato" /></Campo>
            </>}
            {pestana === 'Servicios de agencia' && <Servicios c={c} set={set} />}
            {pestana === 'Impuestos' && <Impuestos c={c} set={set} />}
            {pestana === 'Políticas' && <Politicas c={c} set={set} />}
            {pestana === 'Cupos y precios directos' && <CuposDeContrato contrato={c} />}
            {pestana === 'Restricción' && <Restricciones c={c} set={set} />}
          </div>
        </>}
      </MaestroDetalle>
      {dialogo}
    </>
  );
}

type Props = { c: Contrato; set: (p: Partial<Contrato>) => void };
const Agregar = ({ onClick, children }: { onClick: () => void; children: ReactNode }) =>
  <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button variant="secondary" onClick={onClick}>{children}</Button></div>;

// ── Servicios de agencia: servicios que se cargan con el contrato ─────────────
function Servicios({ c, set }: Props) {
  const [servicios] = useDato('serviciosFact');
  const patch = (id: string, p: Partial<Contrato['servicios'][number]>) => set({ servicios: c.servicios.map(s => (s.id === id ? { ...s, ...p } : s)) });
  return <>
    <Tabla headers={['Servicio', 'Por pax', 'Pax', 'Automático', 'Precio', '']} anchos={{ 1: 80, 2: 90, 3: 100, 4: 130, 5: 50 }}>
      {c.servicios.length === 0 && <FilaVacia cols={6} texto="Sin servicios de agencia." />}
      {c.servicios.map(s => (
        <Fila key={s.id}>
          <Celda><Select value={s.servicio} onChange={v => patch(s.id, { servicio: v })} options={[{ value: '', label: 'Selecciona' }, ...servicios.map(x => ({ value: x.codigo, label: `${x.codigo} - ${x.nombre}` }))]} /></Celda>
          <Celda><Checkbox checked={s.porPax} onChange={b => patch(s.id, { porPax: b })} /></Celda>
          <Celda><Input type="number" value={String(s.pax)} onChange={v => patch(s.id, { pax: Math.max(1, Number(v) || 1) })} style={{ textAlign: 'right' }} /></Celda>
          <Celda><Checkbox checked={s.automatico} onChange={b => patch(s.id, { automatico: b })} /></Celda>
          <Celda><Input type="number" value={String(s.precio)} onChange={v => patch(s.id, { precio: Number(v) || 0 })} style={{ textAlign: 'right' }} /></Celda>
          <Celda><IconButton label="Quitar servicio" tono="peligro" onClick={() => set({ servicios: c.servicios.filter(x => x.id !== s.id) })}><IcTrash /></IconButton></Celda>
        </Fila>
      ))}
    </Tabla>
    <Agregar onClick={() => set({ servicios: [...c.servicios, { id: uid(), servicio: '', porPax: true, pax: 1, automatico: false, precio: 0 }] })}>Agregar servicio</Agregar>
  </>;
}

// ── Impuestos del contrato y si van incluidos en el precio ──────────────────
function Impuestos({ c, set }: Props) {
  const [impuestos] = useDato('impuestos');
  const libres = impuestos.filter(i => !c.impuestos.some(x => x.impuesto === i.id));
  const nombre = (id: string) => impuestos.find(i => i.id === id)?.descripcion ?? id;
  return <>
    <Tabla headers={['Impuesto', 'Incluido en el precio', '']} anchos={{ 1: 180, 2: 50 }}>
      {c.impuestos.length === 0 && <FilaVacia cols={3} texto="Sin impuestos." />}
      {c.impuestos.map(i => (
        <Fila key={i.id}>
          <Celda>{nombre(i.impuesto)}</Celda>
          <Celda><Checkbox checked={i.incluido} onChange={b => set({ impuestos: c.impuestos.map(x => (x.id === i.id ? { ...x, incluido: b } : x)) })} /></Celda>
          <Celda><IconButton label={`Quitar ${nombre(i.impuesto)}`} tono="peligro" onClick={() => set({ impuestos: c.impuestos.filter(x => x.id !== i.id) })}><IcTrash /></IconButton></Celda>
        </Fila>
      ))}
    </Tabla>
    {libres.length > 0 && (
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
        <div style={{ width: 240 }}>
          <Select value="" onChange={v => v && set({ impuestos: [...c.impuestos, { id: uid(), impuesto: v, incluido: true }] })}
            options={[{ value: '', label: 'Agregar impuesto…' }, ...libres.map(i => ({ value: i.id, label: i.descripcion }))]} />
        </div>
      </div>
    )}
  </>;
}

// ── Políticas por idioma ─────────────────────────────────────────────────────
function Politicas({ c, set }: Props) {
  const [idioma, setIdioma] = useState(IDIOMAS[0]);
  return <>
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 12, alignItems: 'end' }}>
      <Campo label="Idioma"><Select value={idioma} onChange={setIdioma} options={IDIOMAS.map(i => ({ value: i, label: `${i}${c.politicas[i] ? ' ✓' : ''}` }))} /></Campo>
      <span style={{ fontSize: 12, color: C.n700, paddingBottom: 8 }}>Se imprimen en la confirmación de la reserva y en el voucher en el idioma del huésped.</span>
    </div>
    <TextArea value={c.politicas[idioma] ?? ''} onChange={v => set({ politicas: { ...c.politicas, [idioma]: v } })} rows={8} placeholder={`Políticas del contrato en ${idioma.toLowerCase()}`} />
  </>;
}

// ── Restricciones por tipo de habitación y régimen ──────────────────────────
function Restricciones({ c, set }: Props) {
  const [tipos] = useDato('tiposHab');
  const [regimenes] = useDato('regimenes');
  const patch = (id: string, p: Partial<RestriccionContrato>) => set({ restricciones: c.restricciones.map(r => (r.id === id ? { ...r, ...p } : r)) });
  const conEstancias = (r: RestriccionContrato) => r.restriccion === 'Estancia mínima' || r.restriccion === 'Estancia máxima';
  return <>
    <Tabla headers={['Tipo', 'Régimen', 'Restricción', 'Estancias', 'Desde', 'Hasta', 'Aplicar', '']} anchos={{ 0: 190, 1: 170, 2: 160, 3: 90, 4: 150, 5: 150, 6: 64, 7: 48 }} minWidth={1020}>
      {c.restricciones.length === 0 && <FilaVacia cols={8} texto="Sin restricciones." />}
      {c.restricciones.map(r => (
        <Fila key={r.id}>
          <Celda><Select value={r.tipo} onChange={v => patch(r.id, { tipo: v })} options={tipos.map(t => ({ value: t.id, label: `${t.codigo} - ${t.nombre}` }))} /></Celda>
          <Celda><Select value={r.regimen} onChange={v => patch(r.id, { regimen: v })} options={regimenes.map(x => ({ value: x.codigo, label: `${x.codigo} - ${x.descripcion}` }))} /></Celda>
          <Celda><Select value={r.restriccion} onChange={v => patch(r.id, { restriccion: v as RestriccionContrato['restriccion'] })} options={RESTRICCIONES_CONTRATO.map(x => ({ value: x, label: x }))} /></Celda>
          <Celda><Input type="number" value={String(r.estancias)} disabled={!conEstancias(r)} onChange={v => patch(r.id, { estancias: Math.max(0, Number(v) || 0) })} style={{ textAlign: 'right' }} /></Celda>
          <Celda><Input type="date" value={r.desde} onChange={v => patch(r.id, { desde: v })} /></Celda>
          <Celda><Input type="date" value={r.hasta} min={r.desde} onChange={v => patch(r.id, { hasta: v })} /></Celda>
          <Celda><Checkbox checked={r.aplicar} onChange={b => patch(r.id, { aplicar: b })} /></Celda>
          <Celda><IconButton label="Quitar restricción" tono="peligro" onClick={() => set({ restricciones: c.restricciones.filter(x => x.id !== r.id) })}><IcTrash /></IconButton></Celda>
        </Fila>
      ))}
    </Tabla>
    <Agregar onClick={() => set({ restricciones: [...c.restricciones, { id: uid(), tipo: tipos[0]?.id ?? '', regimen: regimenes[0]?.codigo ?? '', restriccion: 'Cerrado', estancias: 0, desde: c.desde, hasta: c.hasta, aplicar: true }] })}>Agregar restricción</Agregar>
    <span style={{ fontSize: 11.5, color: C.n700 }}>Vigencia del contrato: {fmt(c.desde)} – {fmt(c.hasta)}.</span>
  </>;
}
