'use client';
// Depósitos en garantía: listado, registro (con cálculo de vuelto), edición,
// anulación y comprobantes imprimibles.
import Link from 'next/link';
import { Suspense, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckFila, CheckTodos, useSeleccion } from '@/components/layout/Pantalla';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Input, Modal, Select, StatusBadge, Toast } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Buscador, Campo, Celda, Fila, FilaVacia, IcEdit, IcTrash, Paginacion, Tabla, TextArea, norm, usePaginado } from '@/components/configuracion/kit';
import { Alerta, RangoBoton, exportarCSV, usePrint } from '@/components/hotel/ui';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { HOY, TARIFAS_NOMBRES, fmtF, sumarDias } from '@/components/hotel/datos';
import { MONEDAS, TIPOS_DEPOSITO, ahoraHotel, fmtFH, fmtMon, fmtN, nombreMoneda, r2, tasaCruce, type Deposito, type Mon } from '@/components/hotel/finanzas';
import { montoEnLetras } from '@/components/hotel/montoEnLetras';
import { turnoAbiertoDe } from '@/components/hotel/accionesFinanzas';
import { useEmpresa } from '@/components/layout/Shell';
import { datosHotel } from './ReciboCanje';
import { BotonIcono, Exportar, FiltroUno, HojaSistema, IcDoc, PaginaFact, TablaReporte, Tarjeta, Visor, tdR } from './comun';
import { useFolios } from './folios/modelo';

export default function Depositos() {
  return <Suspense fallback={null}><Pantalla /></Suspense>;
}

function Pantalla() {
  const h = useHotel();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [periodo, setPeriodo] = useState({ d: '', h: '' });
  const [tipo, setTipo] = useState('');
  const [moneda, setMoneda] = useState('');
  const [tarifa, setTarifa] = useState('');
  const [estado, setEstado] = useState('Activo');
  const [form, setForm] = useState<null | { dep?: Deposito }>(null);
  const [verId, setVerId] = useState<string | null>(null);
  const [anular, setAnular] = useState<Deposito | null>(null);
  const [anulId, setAnulId] = useState<string | null>(null);
  const ver = h.depositos.find(x => x.id === verId);
  const verAnulacion = h.depositos.find(x => x.id === anulId);
  const [toast, setToast] = useState<string | null>(null);
  const [anularVarios, setAnularVarios] = useState(false);
  const s = useSeleccion();
  const { imprimir, portal } = usePrint();
  const filas = useMemo(() => h.depositos.filter(d => {
    const r = h.reservas.find(x => x.id === d.reservaId);
    return (!q || norm(`${d.numero} ${d.nombre} ${r?.numero ?? ''} ${d.referencia}`).includes(norm(q))) && (!periodo.d || d.recibido.slice(0, 10) >= periodo.d) && (!periodo.h || d.recibido.slice(0, 10) <= periodo.h)
      && (!tipo || d.tipo === tipo) && (!moneda || d.moneda === moneda) && (!tarifa || d.tarifa === tarifa) && (!estado || d.estado === estado);
  }).sort((a, b) => b.recibido.localeCompare(a.recibido)), [h.depositos, h.reservas, q, periodo, tipo, moneda, tarifa, estado]);
  const pag = usePaginado(filas, 12);
  const resNum = (d: Deposito) => h.reservas.find(x => x.id === d.reservaId)?.numero ?? (d.folioId ? h.foliosCta.find(f => f.id === d.folioId)?.numero : undefined);
  const elegidos = filas.filter(d => s.tiene(d.id));
  const activosSel = elegidos.filter(d => d.estado === 'Activo');
  const hayFiltros = !!(q || periodo.d || periodo.h || tipo || moneda || tarifa || estado !== 'Activo');
  const csv = (xs: Deposito[] = filas) => exportarCSV('depositos-garantia', ['Número', 'N° reserva / folio', 'Nombre', 'Tarifa', 'Asignado', 'Tipo', 'Moneda', 'Importe', 'Recibido', 'Vencimiento', 'Estado'],
    xs.map(d => [d.numero, resNum(d) ?? '', d.nombre, d.tarifa, d.asignado, d.tipo, d.moneda, d.importe, fmtFH(d.recibido), fmtF(d.vence), d.estado]));
  const pdf = () => imprimir(
    <HojaSistema titulo="Depósitos en garantía" subtitulo="Listado de depósitos recibidos">
      <TablaReporte headers={['Número', 'Reserva', 'Nombre', 'Tarifa', 'Tipo', 'Moneda', 'Importe', 'Recibido', 'Estado']} derecha={[6]}>
        {filas.map(d => <tr key={d.id}><td style={tdR(false, { fontWeight: 600 })}>{d.numero}</td><td style={tdR()}>{resNum(d) ?? '—'}</td><td style={tdR()}>{d.nombre}</td><td style={tdR()}>{d.tarifa}</td><td style={tdR()}>{d.tipo}</td><td style={tdR()}>{d.moneda}</td>
          <td style={tdR(true)}>{fmtN(d.importe)}</td><td style={tdR()}>{fmtFH(d.recibido)}</td><td style={tdR()}>{d.estado}</td></tr>)}
      </TablaReporte>
    </HojaSistema>);
  return (
    <PaginaFact titulo="Depósito en garantía" acciones={<><Exportar onCSV={() => csv()} onPDF={pdf} disabled={!filas.length} /><Button icon={<IcPlus size={12} />} onClick={() => setForm({})}>Nuevo depósito</Button></>}
      filtros={<>
        <div style={{ width: 220 }}><Buscador value={q} onChange={setQ} placeholder="Buscar por número, nombre..." /></div>
        <RangoBoton label="Período de recibido" desde={periodo.d} hasta={periodo.h} onChange={(d, x) => setPeriodo({ d, h: x })} />
        <FiltroUno label="Tipo de depósito" value={tipo} onChange={setTipo} opciones={TIPOS_DEPOSITO.map(t => ({ value: t, label: t }))} />
        <FiltroUno label="Moneda" value={moneda} onChange={setMoneda} todos="Todas" opciones={MONEDAS.map(m => ({ value: m.codigo, label: m.codigo }))} />
        <FiltroUno label="Tarifa" value={tarifa} onChange={setTarifa} todos="Todas" opciones={TARIFAS_NOMBRES.map(t => ({ value: t, label: t }))} />
        <FiltroUno label="Estado" value={estado} onChange={setEstado} opciones={[{ value: 'Activo', label: 'Activos' }, { value: 'Anulado', label: 'Anulados' }]} />
        {hayFiltros && <Button variant="ghost" style={{ color: C.error }} onClick={() => { setQ(''); setPeriodo({ d: '', h: '' }); setTipo(''); setMoneda(''); setTarifa(''); setEstado('Activo'); }}>Limpiar filtros</Button>}
      </>}
      filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>{filas.length} depósitos</span>}
      seleccion={{ n: s.n, onLimpiar: s.limpiar, acciones: <>
        <Button variant="secondary" onClick={() => csv(elegidos)}>Exportar selección</Button>
        <Button variant="secondary" disabled={!activosSel.length} style={{ color: C.error }} onClick={() => setAnularVarios(true)}>Anular ({activosSel.length})</Button>
      </> }}>
      <Tarjeta>
        <Tabla headers={[<CheckTodos key="t" s={s} ids={pag.visibles.map(d => d.id)} />, 'Número', 'N° reserva', 'Nombre', 'Tarifa', 'Asignado', 'Moneda', 'Importe', 'Recibido', '']} alinearDerecha={[7]} minWidth={1000}>
          {pag.visibles.length === 0 && <FilaVacia cols={10} texto="No hay depósitos para los filtros seleccionados." />}
          {pag.visibles.map(d => {
            const n = resNum(d);
            return (
              <Fila key={d.id} style={{ opacity: d.estado === 'Anulado' ? 0.65 : 1 }}>
                <Celda style={{ width: 28 }}><CheckFila s={s} id={d.id} label={`Seleccionar ${d.numero}`} /></Celda>
                <Celda><button type="button" onClick={() => setVerId(d.id)} style={{ border: 'none', background: 'none', padding: 0, color: C.brand, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT, fontSize: 12 }}>{d.numero}</button></Celda>
                <Celda>{n ? <Link href={d.reservaId ? `/facturacion/folios?q=${n}` : `/facturacion/folios-externos?folio=${n}`} style={{ color: C.brand }}>{n}</Link> : '—'}</Celda>
                <Celda>{d.nombre}</Celda><Celda>{d.tarifa || '—'}</Celda><Celda>{d.asignado || '—'}</Celda><Celda>{d.moneda}</Celda>
                <Celda derecha style={{ textDecoration: d.estado === 'Anulado' ? 'line-through' : undefined }}>{fmtN(d.importe)}</Celda>
                <Celda style={{ whiteSpace: 'nowrap' }}>{fmtFH(d.recibido)}</Celda>
                <Celda derecha style={{ whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    {d.estado === 'Anulado' ? <><StatusBadge label="Anulado" color="red" /><Button variant="secondary" onClick={() => setAnulId(d.id)}>Anulación</Button></> : <>
                      <Button variant="secondary" icon={<IcDoc size={14} />} style={{ color: C.brand, borderColor: C.brandBd }} onClick={() => setVerId(d.id)}>Detalle</Button>
                      <BotonIcono label={`Editar depósito ${d.numero}`} tono="peligro" onClick={() => setForm({ dep: d })}><span style={{ color: C.n700, display: 'flex' }}><IcEdit /></span></BotonIcono>
                      <BotonIcono label={`Anular depósito ${d.numero}`} tono="peligro" onClick={() => setAnular(d)}><IcTrash /></BotonIcono>
                    </>}
                  </span>
                </Celda>
              </Fila>
            );
          })}
        </Tabla>
        {filas.length > 12 && <Paginacion pagina={pag.pagina} total={pag.total} onChange={pag.setPagina} />}
      </Tarjeta>
      {form && <FormDeposito dep={form.dep} onClose={() => setForm(null)} onListo={(t, id) => { setForm(null); setToast(t); if (id) setVerId(id); }} />}
      {ver && <Visor titulo="Dep. en Garantía" sub={`#${ver.numero}`} onClose={() => setVerId(null)}><Comprobante d={ver} /></Visor>}
      {verAnulacion && <Visor titulo="Anulación de Dep. en Garantía" sub={`#${verAnulacion.numero}`} onClose={() => setAnulId(null)}><ComprobanteAnulacion d={verAnulacion} /></Visor>}
      {anular && <AnularDeposito d={anular} onClose={() => setAnular(null)} onListo={() => { const d = anular; setAnular(null); setToast(`Depósito ${d.numero} anulado`); setAnulId(d.id); }} />}
      {anularVarios && <AnularVarios ds={activosSel} onClose={() => setAnularVarios(false)} onListo={n => { setAnularVarios(false); s.limpiar(); setToast(`${n} depósitos anulados`); }} />}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </PaginaFact>
  );
}

// ── Formulario nuevo / editar ───────────────────────────────────────────────
export function FormDeposito({ dep, reservaId, onClose, onListo }: { dep?: Deposito; reservaId?: string; onClose: () => void; onListo: (t: string, id?: string) => void }) {
  const h = useHotel();
  const folios = useFolios();
  const editar = !!dep;
  const r0 = reservaId ? h.reservas.find(x => x.id === reservaId) : undefined;
  const [destino, setDestino] = useState<string>(dep?.reservaId ? `R:${dep.reservaId}` : r0 ? `R:${r0.id}` : dep?.folioId ?? '');
  const [buscar, setBuscar] = useState(false);
  const [moneda, setMoneda] = useState<Mon>(dep?.moneda ?? 'USD');
  const [importeUSD, setImporteUSD] = useState(dep ? String(r2(dep.importe / (dep.tasa || 1))) : r0 ? String(Math.max(50, Math.round(r0.precio * 0.5))) : '');
  const [entregado, setEntregado] = useState(dep ? String(dep.entregado) : '');
  const [comPct, setComPct] = useState(dep ? String(dep.comisionPct) : '0');
  const [f, setF] = useState({ nombre: dep?.nombre ?? (r0 ? h.perfiles.find(x => x.id === r0.perfilId)?.nombre ?? r0.nombre : ''), vence: dep?.vence ?? (r0 && r0.entrada > HOY ? sumarDias(r0.entrada, -1) : sumarDias(HOY, 7)), tipo: dep?.tipo ?? '', tarifa: dep?.tarifa ?? r0?.tarifa ?? '', referencia: dep?.referencia ?? '', obs: dep?.observaciones ?? '',
    tNombre: dep?.tarjeta.nombre ?? '', tNumero: dep?.tarjeta.numero ?? '', tMes: dep?.tarjeta.mes || '12', tAnio: dep?.tarjeta.anio || String(Number(HOY.slice(0, 4)) + 1) });
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const tasa = tasaCruce('USD', moneda);
  const imp = r2((Number(importeUSD) || 0) * tasa);
  const comision = r2(imp * (Number(comPct) || 0) / 100);
  const ent = Number(entregado) || 0;
  const vuelto = r2(ent - imp - comision);
  const tarjeta = f.tipo === 'Tarjeta de crédito';
  const r = destino.startsWith('R:') ? h.reservas.find(x => x.id === destino.slice(2)) : undefined;
  const fx = !destino.startsWith('R:') ? h.foliosCta.find(x => x.id === destino) : undefined;
  const elegir = (id: string) => {
    setDestino(id); setBuscar(false);
    const rr = id.startsWith('R:') ? h.reservas.find(x => x.id === id.slice(2)) : undefined;
    const ff = !id.startsWith('R:') ? h.foliosCta.find(x => x.id === id) : undefined;
    if (rr) { setF(p => ({ ...p, nombre: h.perfiles.find(x => x.id === rr.perfilId)?.nombre ?? rr.nombre, tarifa: rr.tarifa, vence: rr.entrada > HOY ? sumarDias(rr.entrada, -1) : p.vence })); if (!importeUSD) setImporteUSD(String(Math.max(50, Math.round(rr.precio * 0.5)))); }
    if (ff) setF(p => ({ ...p, nombre: ff.nombre, tarifa: '' }));
  };
  const guardar = () => {
    if (!f.nombre.trim()) return setError('Indica el nombre del depositante.');
    if (!f.tipo) return setError('Selecciona el tipo de depósito.');
    if (tarjeta && (!f.tNombre.trim() || f.tNumero.replace(/\D/g, '').length < (editar ? 4 : 16))) return setError('Con tarjeta: nombre y número de 16 dígitos son obligatorios.');
    if (editar) {
      h.editarDeposito(dep!.id, { nombre: f.nombre.trim(), vence: f.vence, tipo: f.tipo, tarifa: f.tarifa, referencia: f.referencia.trim(), observaciones: f.obs.trim(),
        tarjeta: tarjeta ? { nombre: f.tNombre.trim(), numero: f.tNumero.includes('•') ? f.tNumero : `•••• ${f.tNumero.replace(/\D/g, '').slice(-4)}`, mes: f.tMes, anio: f.tAnio } : { nombre: '', numero: '', mes: '', anio: '' } });
      return onListo(`Depósito ${dep!.numero} actualizado`);
    }
    if (!(Number(importeUSD) > 0)) return setError('Ingresa el importe del depósito.');
    if (ent < imp + comision - 0.001) return setError(`El importe entregado no cubre el depósito (${fmtMon(imp + comision, moneda)}).`);
    if (!turnoAbiertoDe(h, h.sesion)) return setError(`${h.sesion} no tiene un turno de caja abierto: el depósito entra a la caja del cajero.`);
    const id = nuevoId('dg');
    const d: Omit<Deposito, 'numero'> = {
      id, reservaId: r?.id ?? null, folioId: fx?.id ?? null, nombre: f.nombre.trim(), tarifa: f.tarifa, asignado: r?.habitacion ? `Hab-${r.habitacion}` : fx ? `Folio ${fx.numero}` : '', moneda, tasa, importe: imp, entregado: ent, comisionPct: Number(comPct) || 0, comision, vuelto,
      tipo: f.tipo, referencia: f.referencia.trim(), tarjeta: tarjeta ? { nombre: f.tNombre.trim(), numero: `•••• ${f.tNumero.replace(/\D/g, '').slice(-4)}`, mes: f.tMes, anio: f.tAnio } : { nombre: '', numero: '', mes: '', anio: '' },
      vence: f.vence, recibido: ahoraHotel(), observaciones: f.obs.trim(), estado: 'Activo', usuario: h.sesion,
    };
    h.crearDeposito(d);
    onListo(`Depósito registrado por ${fmtMon(imp, moneda)}`, id);
  };
  const destinos = [
    ...h.reservas.filter(x => x.id === reservaId || (['Solicitada', 'Confirmada', 'Lista de espera', 'In-House'].includes(x.estado) && x.entrada <= sumarDias(HOY, 30))).sort((a, b) => a.entrada.localeCompare(b.entrada))
      .map(x => ({ id: `R:${x.id}`, txt: `${x.numero} · ${h.perfiles.find(p => p.id === x.perfilId)?.nombre ?? x.nombre}`, det: `${x.estado} · ${fmtF(x.entrada)} → ${fmtF(x.salida)}${x.habitacion ? ` · Hab ${x.habitacion}` : ''}` })),
    ...folios.cuentas.filter(x => x.clase === 'externo' && x.estado === 'Abierto').map(x => ({ id: x.id, txt: `Folio externo ${x.numero} · ${x.nombre}`, det: `Vence ${fmtF(x.vencimiento)}` })),
  ];
  const caja = (l: string, v: ReactNode, w?: number) => <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: w, flex: w ? undefined : 1, minWidth: 0 }}><span style={{ fontSize: 12, color: C.n700 }}>{l}</span>{v}</div>;
  return (
    <Modal open title={editar ? `Depósito en garantía ${String(dep!.numero).padStart(6, '0')}` : 'Nuevo depósito en garantía'} onClose={onClose} width={860}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={guardar}>{editar ? 'Guardar cambios' : 'Registrar depósito'}</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', paddingBottom: 16, borderBottom: `1px solid ${C.n500}` }}>
          {caja('Moneda', <Input value={moneda} disabled />, 70)}
          {caja('Tasa', <Input value={fmtN(tasa)} disabled style={{ textAlign: 'right' }} />, 100)}
          {caja('Importe (Entregado)', <Input value={entregado} onChange={v => setEntregado(v.replace(/[^\d.]/g, ''))} disabled={editar} style={{ textAlign: 'right' }} placeholder="0.00" aria-label="Importe entregado" />)}
          {caja('Comisión %', <Input value={comPct} onChange={v => setComPct(v.replace(/[^\d.]/g, ''))} disabled={editar} style={{ textAlign: 'right' }} />, 90)}
          {caja('Comisión', <Input value={fmtN(comision)} disabled style={{ textAlign: 'right' }} />)}
          {caja('Vuelto', <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', borderRadius: radius.control, background: vuelto < 0 ? 'rgba(244,67,54,.12)' : 'rgba(244,67,54,.08)', fontSize: 12, color: vuelto < 0 ? C.error : C.n900 }}>{fmtN(editar ? dep!.vuelto : Math.max(0, vuelto))}</div>)}
        </div>
        <Campo label="Reserva / folio externo">
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><Select value={destino} onChange={elegir} options={[{ value: '', label: 'Seleccionar' }, ...destinos.map(x => ({ value: x.id, label: x.txt }))]} /></div>
            <Button variant="secondary" style={{ color: C.brand, borderColor: C.brandBd }} onClick={() => setBuscar(true)}>Buscar</Button>
          </div>
        </Campo>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14 }}>
          <Campo label="Nombre del depositante" required><Input value={f.nombre} onChange={set('nombre')} placeholder="Ingresa el nombre" /></Campo>
          <Campo label="Vencimiento"><Input type="date" value={f.vence} onChange={set('vence')} /></Campo>
          <Campo label="Moneda"><Select value={moneda} onChange={v => setMoneda(v as Mon)} disabled={editar} options={MONEDAS.filter(m => m.codigo !== 'EUR').map(m => ({ value: m.codigo, label: `${m.codigo} - ${m.nombre}` }))} /></Campo>
          <Campo label="Importe del depósito (USD)" required hint={moneda !== 'USD' && imp ? `= ${fmtMon(imp, moneda)}` : r ? `Tarifa ${r.tarifa} · ${fmtMon(r.precio)} / noche` : undefined}>
            <Input value={importeUSD} onChange={v => setImporteUSD(v.replace(/[^\d.]/g, ''))} disabled={editar} placeholder="0.00" style={{ textAlign: 'right' }} aria-label="Importe del depósito" /></Campo>
          <Campo label="Tipo de depósito" required><Select value={f.tipo} onChange={v => { set('tipo')(v); if (v === 'Efectivo Colones') setMoneda('CRC'); else if (v === 'Efectivo Dólares') setMoneda('USD'); }} options={[{ value: '', label: 'Selecciona el tipo' }, ...TIPOS_DEPOSITO.map(t => ({ value: t, label: t }))]} /></Campo>
          <Campo label="Tarifa de reserva"><Select value={f.tarifa} onChange={set('tarifa')} options={[{ value: '', label: 'Seleccionar' }, ...TARIFAS_NOMBRES.map(t => ({ value: t, label: t }))]} /></Campo>
          <Campo label={<>Referencia <span style={{ color: C.n700 }}>(opcional)</span></>}><Input value={f.referencia} onChange={set('referencia')} placeholder="Ingrese la referencia" /></Campo>
        </div>
        {tarjeta && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 70px 110px', gap: 14, alignItems: 'end' }}>
          <Campo label="Nombre en la tarjeta" required><Input value={f.tNombre} onChange={set('tNombre')} placeholder="Ingresa el nombre en la tarjeta" /></Campo>
          <Campo label="Número de tarjeta" required><Input value={f.tNumero} onChange={v => set('tNumero')(v.includes('•') ? v : v.replace(/[^\d]/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '))} placeholder="0000 0000 0000 0000" inputMode="numeric" /></Campo>
          <Campo label="Vencimiento"><Select value={f.tMes} onChange={set('tMes')} options={Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(x => ({ value: x, label: x }))} /></Campo>
          <Campo label=" "><Select value={f.tAnio} onChange={set('tAnio')} options={Array.from({ length: 8 }, (_, i) => String(Number(HOY.slice(0, 4)) + i)).map(x => ({ value: x, label: x }))} /></Campo>
        </div>}
        <Campo label={<>Observaciones <span style={{ color: C.n700 }}>(opcional)</span></>}><TextArea value={f.obs} onChange={set('obs')} rows={3} placeholder="Ingresa observaciones" /></Campo>
        {editar && <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Los montos no se pueden editar porque ya entraron a la caja. Para corregirlos, anula el depósito y registra uno nuevo.</p>}
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
      </div>
      {buscar && (
        <Modal open title="Buscar reserva o folio externo" onClose={() => setBuscar(false)} width={640} footer={<Button variant="secondary" onClick={() => setBuscar(false)}>Cerrar</Button>}>
          <ListaBusqueda items={destinos} onElegir={elegir} />
        </Modal>
      )}
    </Modal>
  );
}
function ListaBusqueda({ items, onElegir }: { items: { id: string; txt: string; det: string }[]; onElegir: (id: string) => void }) {
  const [q, setQ] = useState('');
  const vis = items.filter(x => !q || norm(x.txt + x.det).includes(norm(q))).slice(0, 60);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Buscador value={q} onChange={setQ} placeholder="Número de reserva, nombre o folio" />
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {vis.map(x => <button key={x.id} type="button" onClick={() => onElegir(x.id)} className="suite-fila" style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderBottom: `1px solid ${C.n500}`, background: 'none', padding: '9px 6px', cursor: 'pointer', fontFamily: FONT }}>
          <span style={{ fontSize: 12.5, color: C.n900 }}>{x.txt}</span><br /><span style={{ fontSize: 11, color: C.n700 }}>{x.det}</span></button>)}
        {!vis.length && <p style={{ fontSize: 12, color: C.n700, textAlign: 'center' }}>Sin resultados</p>}
      </div>
    </div>
  );
}

export function AnularDeposito({ d, onClose, onListo }: { d: Deposito; onClose: () => void; onListo: () => void }) {
  const h = useHotel();
  const [motivo, setMotivo] = useState('');
  return (
    <Alerta open titulo={`¿Anular el depósito ${d.numero}?`} tono="danger" onClose={onClose} confirmar="Anular depósito" cancelar="Cancelar"
      onConfirm={() => { if (!motivo.trim()) return; h.anularDeposito(d.id, motivo.trim(), h.sesion, ahoraHotel()); onListo(); }}>
      Se generará el comprobante de anulación{d.tipo.startsWith('Efectivo') ? ` y la devolución de ${fmtMon(d.importe, d.moneda)} saldrá de tu caja` : ''}.
      <div style={{ marginTop: 12, textAlign: 'left' }}><TextArea value={motivo} onChange={setMotivo} rows={2} placeholder="Motivo de la anulación (obligatorio)" /></div>
    </Alerta>
  );
}

function AnularVarios({ ds, onClose, onListo }: { ds: Deposito[]; onClose: () => void; onListo: (n: number) => void }) {
  const h = useHotel();
  const [motivo, setMotivo] = useState('');
  return (
    <Alerta open titulo={`¿Anular ${ds.length} depósitos?`} tono="danger" onClose={onClose} confirmar="Anular depósitos" cancelar="Cancelar"
      onConfirm={() => { if (!motivo.trim()) return; ds.forEach(d => h.anularDeposito(d.id, motivo.trim(), h.sesion, ahoraHotel())); onListo(ds.length); }}>
      Se generará un comprobante de anulación por cada depósito ({ds.map(d => d.numero).join(', ')}). Las devoluciones en efectivo saldrán de tu caja.
      <div style={{ marginTop: 12, textAlign: 'left' }}><TextArea value={motivo} onChange={setMotivo} rows={2} placeholder="Motivo de la anulación (obligatorio)" /></div>
    </Alerta>
  );
}

// ── Comprobantes ────────────────────────────────────────────────────────────
const S = { celda: { border: '1px solid #222', padding: '6px 12px', fontSize: 12 } as const, lbl: { fontWeight: 700, fontSize: 11.5 } as const };
export function Comprobante({ d }: { d: Deposito }) {
  return <div style={{ padding: '24px 30px', fontFamily: 'Arial, Helvetica, sans-serif' }}><CopiaDeposito d={d} copia="ORIGINAL: Cliente" /><div style={{ borderTop: '1.5px dashed #888', margin: '22px 0' }} /><CopiaDeposito d={d} copia="COPIA: Hotel" /></div>;
}
function CopiaDeposito({ d, copia }: { d: Deposito; copia: string }) {
  const h = useHotel();
  const empresa = useEmpresa();
  const dh = datosHotel(empresa);
  const r = d.reservaId ? h.reservas.find(x => x.id === d.reservaId) : undefined;
  return (
    <div style={{ color: '#111', breakInside: 'avoid' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'end' }}>
        <div style={{ textAlign: 'center', fontSize: 12, lineHeight: 1.45 }}><b>{empresa.toUpperCase()}</b><br /><b>{dh.razon.toUpperCase()}</b><br />{dh.direccion}<br /><b>Tel: {dh.tel}</b><br />E-mail: {dh.email}</div>
        <div>
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 17 }}>DEPÓSITO EN GARANTÍA</div>
          <div style={{ textAlign: 'center', color: '#E00', fontWeight: 700, fontSize: 19, fontFamily: 'Georgia, serif' }}>No. {d.numero}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #222', marginTop: 6 }}>
            <div style={{ textAlign: 'center', padding: 4, borderRight: '1px solid #222', fontSize: 12 }}><b>FECHA</b><br />{fmtF(d.recibido.slice(0, 10))}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700 }}>{d.moneda}. {fmtN(d.importe)}</div>
          </div>
        </div>
      </div>
      <div style={{ border: '1px solid #222', marginTop: 4 }}>
        <div style={{ ...S.celda, border: 'none', borderBottom: '1px solid #222' }}><span style={S.lbl}>RECIBIMOS DE:</span><br />{d.nombre.toUpperCase()}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #222' }}>
          <div style={{ ...S.celda, border: 'none', borderRight: '1px solid #222', minHeight: 34 }}><span style={S.lbl}>ASIGNADO EN:</span><br />{d.asignado || ''}{r ? ` · Reserva ${r.numero}` : ''}</div>
          <div style={{ ...S.celda, border: 'none' }}><span style={S.lbl}>REFERENCIA:</span><br />{d.referencia}</div>
        </div>
        <div style={{ ...S.celda, border: 'none', borderBottom: '1px solid #222' }}><span style={S.lbl}>LA CANTIDAD DE:</span><br />{montoEnLetras(d.importe)} {d.moneda === 'CRC' ? 'COLONES' : d.moneda === 'USD' ? 'DÓLARES' : nombreMoneda(d.moneda).toUpperCase()}</div>
        <div style={{ ...S.celda, border: 'none', minHeight: 30 }}><span style={S.lbl}>POR CONCEPTO DE:</span><br />Depósito en garantía{r ? ` de la reserva ${r.numero} (${fmtF(r.entrada)} – ${fmtF(r.salida)}) · Tarifa ${d.tarifa}` : ''}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.4fr 1.6fr', marginTop: 4 }}>
        <table style={{ borderCollapse: 'collapse', gridColumn: 'span 2' }}>
          <tbody>
            <tr><td style={{ ...S.celda, textAlign: 'center', fontWeight: 700 }}>TIPO</td><td style={{ ...S.celda, textAlign: 'center', fontWeight: 700 }}>VALOR</td></tr>
            <tr><td style={{ ...S.celda, textAlign: 'right', fontWeight: 700 }}>{d.tipo}{d.tarjeta.numero ? ` ${d.tarjeta.numero}` : ''}</td><td style={{ ...S.celda, textAlign: 'right', fontWeight: 700 }}>{fmtN(d.entregado)} {d.moneda}</td></tr>
            <tr><td style={{ ...S.celda, textAlign: 'right', fontWeight: 700 }}>{d.comision ? 'COMISIÓN / VUELTO' : 'VUELTO'}</td><td style={{ ...S.celda, textAlign: 'right', fontWeight: 700 }}>{d.comision ? `${fmtN(d.comision)} / ` : ''}{fmtN(d.vuelto)} {d.moneda}</td></tr>
            <tr><td style={{ textAlign: 'right', fontWeight: 700, fontSize: 15, padding: '6px 12px' }}>TOTAL</td><td style={{ ...S.celda, textAlign: 'right', fontWeight: 700, fontSize: 15 }}>{fmtN(d.importe)} {d.moneda}</td></tr>
          </tbody>
        </table>
        <div style={{ border: '1px solid #222', padding: 8, fontSize: 10.5, fontWeight: 700, lineHeight: 1.35 }}>LA VALIDEZ DEL PRESENTE QUEDA SUJETO A QUE EL BANCO RECONOZCA EL VALOR DE LOS CHEQUES, SI ESTOS FUERAN RECHAZADOS SE APLICARÁN CARGOS ADMINISTRATIVOS.</div>
        <div style={{ border: '1px solid #222', borderLeft: 'none', display: 'flex', alignItems: 'flex-end', padding: 8 }}><div style={{ borderTop: '1px solid #222', width: '100%', textAlign: 'center', fontSize: 11, fontWeight: 700, paddingTop: 3 }}>FIRMA Y SELLO</div></div>
      </div>
      <div style={{ marginTop: 10, fontSize: 11.5, fontFamily: 'Georgia, serif', lineHeight: 1.45 }}>
        <b>Políticas de Cancelación:</b><br />Cancelaciones hechas a 48 horas o más días antes de la llegada, no aplica cargo por concepto de gastos administrativos.<br />
        Cancelaciones recibidas entre 0 - 2 días antes de la llegada, aplica una penalización del 50% del monto total cargado.<br />En caso de no show (cuando el cliente no se presenta para el día reservado) se penaliza el 100% del monto total cargado.
      </div>
      <div style={{ textAlign: 'right', color: '#E00', fontWeight: 700, fontFamily: 'Georgia, serif', marginTop: 6 }}>{copia}</div>
    </div>
  );
}
export function ComprobanteAnulacion({ d }: { d: Deposito }) {
  const h = useHotel();
  const r = d.reservaId ? h.reservas.find(x => x.id === d.reservaId) : undefined;
  const fila = (a: string, b: ReactNode, c: string, e: ReactNode) => <tr><td style={{ fontWeight: 700, padding: '3px 0', width: '22%' }}>{a}</td><td style={{ width: '38%' }}>{b}</td><td style={{ fontWeight: 700, textAlign: 'right', width: '22%' }}>{c}</td><td style={{ textAlign: 'right' }}>{e}</td></tr>;
  return (
    <div style={{ padding: '24px 30px', fontFamily: 'Georgia, serif', fontSize: 13.5, color: '#111' }}>
      <div style={{ display: 'flex', gap: 30, fontWeight: 700, fontSize: 17, borderBottom: '1.5px solid #111', paddingBottom: 4 }}><span>Dep. en Gar. #{d.numero}</span><span>Anulación</span></div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
        <tbody>
          {fila('Nombre:', d.nombre.toUpperCase(), 'Recibido:', fmtF(d.recibido.slice(0, 10)))}
          {fila('Importe:', fmtN(d.importe), 'Vencimiento:', fmtF(d.vence))}
          {fila('Tipo:', d.tipo, 'Moneda:', d.moneda)}
          {fila('Documento Ext.:', d.referencia, 'Tasa:', fmtN(d.tasa))}
          {fila('Asignado en:', d.asignado ? `${d.asignado}${r ? ` · ${r.numero}` : ''}` : '', '', '')}
          {fila('Tarjeta de Crédito:', d.tarjeta.numero, '', '')}
          {fila('Tarifa:', d.tarifa, '', '')}
        </tbody>
      </table>
      <div style={{ borderTop: '1.5px solid #111', marginTop: 6, paddingTop: 8, fontSize: 12.5 }}>
        <b>Anulado:</b> {d.anulado ? `${fmtFH(d.anulado.fecha)} por ${d.anulado.usuario}` : '—'}<br /><b>Motivo:</b> {d.anulado?.motivo ?? '—'}
      </div>
      <div style={{ marginTop: 50, width: 240, borderTop: '1px solid #111', textAlign: 'center', fontSize: 11, paddingTop: 3, fontFamily: FONT }}>Firma autorizada</div>
    </div>
  );
}
