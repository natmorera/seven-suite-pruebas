'use client';
// Reservas: listado (Directa / Agencia) con búsqueda y filtros avanzados a la
// izquierda, detalle de la reserva a la derecha y alta de reservas.
import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal, Toast } from '@/components/suite/ui';
import { CheckFila, CheckTodos, Pantalla as PantallaStd, useSeleccion } from '@/components/layout/Pantalla';
import { Buscador, MultiSelect, TextArea, norm } from '@/components/configuracion/kit';
import { Alerta, BotonExportar, MenuBoton, RangoBoton, exportarCSV, usePrint } from '@/components/hotel/ui';
import { useHotel, totalReserva } from '@/components/hotel/store';
import { CONDICIONES, ESTADOS_RESERVA, NACIONALIDADES, REGIMENES, TARIFAS_NOMBRES, TIPOS, USUARIOS, contratoDeTarifa, fmtF, noches, type EstadoReserva, type Reserva } from '@/components/hotel/datos';
import { AGENTES, MERCADOS, ORIGENES, USOS, agrupar, esAgencia, estadoGrupo, mercadoDe, numeroDe, usoDe, type GrupoReserva } from '@/components/hotel/reservas';
import { fmtMon } from '@/components/hotel/finanzas';
import { TarjetaRegistro } from '@/components/hotel/TarjetaRegistro';
import { HojaSistema, TablaReporte, tdR } from '@/components/facturacion/comun';
import { ChipEstado, totales } from './comun';
import { DetalleReserva } from './reserva/Detalle';
import { EnviarCorreo } from './reserva/Acciones';
import { FormReserva, type Prefill } from './FormReserva';
import { MontoCelda } from '@/components/suite/Monto';

export default function Reservas() {
  return <Suspense fallback={null}><Pantalla /></Suspense>;
}

// ── Filtros avanzados ───────────────────────────────────────────────────────
type Rango = { d: string; h: string };
export interface FiltrosRes {
  estados: EstadoReserva[]; nHab: string; tipos: string[]; usos: string[]; tarifas: string[]; regimenes: string[]; origenes: string[]; condiciones: string[];
  entrada: Rango; salida: Rango; creacion: Rango; anulacion: Rango;
  numero: string; idExterno: string; empresas: string[]; mercados: string[]; usuarios: string[];
  nombre: string; nacionalidades: string[]; vip: boolean;
  deposito: string[]; saldo: string[];
  referencia: string; agentes: string[];
}
const rv = (): Rango => ({ d: '', h: '' });
export const filtrosVacios = (): FiltrosRes => ({
  estados: [], nHab: '', tipos: [], usos: [], tarifas: [], regimenes: [], origenes: [], condiciones: [], entrada: rv(), salida: rv(), creacion: rv(), anulacion: rv(),
  numero: '', idExterno: '', empresas: [], mercados: [], usuarios: [], nombre: '', nacionalidades: [], vip: false, deposito: [], saldo: [], referencia: '', agentes: [],
});
const enRango = (v: string | undefined, r: Rango) => (!r.d || (!!v && v >= r.d)) && (!r.h || (!!v && v <= r.h));
const seccion = (f: FiltrosRes) => ({
  principal: f.estados.length + (f.nHab ? 1 : 0) + f.tipos.length + f.usos.length + f.tarifas.length + f.regimenes.length + f.origenes.length + f.condiciones.length,
  fechas: [f.entrada, f.salida, f.creacion, f.anulacion].filter(r => r.d || r.h).length,
  detalles: (f.numero ? 1 : 0) + (f.idExterno ? 1 : 0) + f.empresas.length + f.mercados.length + f.usuarios.length,
  cliente: (f.nombre ? 1 : 0) + f.nacionalidades.length + (f.vip ? 1 : 0),
  finanzas: f.deposito.length + f.saldo.length,
  agencia: (f.referencia ? 1 : 0) + f.agentes.length,
});
export const nFiltros = (f: FiltrosRes) => Object.values(seccion(f)).reduce((s, n) => s + n, 0);

function cumple(g: GrupoReserva, f: FiltrosRes, nombrePerfil: string) {
  const ls = g.lineas, p = g.principal;
  const alguna = (fn: (r: Reserva) => boolean) => ls.some(fn);
  const t = totales(ls);
  return (!f.estados.length || f.estados.includes(estadoGrupo(ls)) || ls.some(r => f.estados.includes(r.estado)))
    && (!f.nHab || ls.length === Number(f.nHab))
    && (!f.tipos.length || alguna(r => f.tipos.includes(r.tipo))) && (!f.usos.length || alguna(r => f.usos.includes(usoDe(r))))
    && (!f.tarifas.length || f.tarifas.includes(p.tarifa)) && (!f.regimenes.length || alguna(r => f.regimenes.includes(r.regimen)))
    && (!f.origenes.length || f.origenes.includes(p.detalles?.origen ?? '')) && (!f.condiciones.length || alguna(r => r.condiciones.some(c => f.condiciones.includes(c))))
    && enRango(p.entrada, f.entrada) && enRango(p.salida, f.salida) && enRango(p.creada?.slice(0, 10), f.creacion) && (!(f.anulacion.d || f.anulacion.h) || alguna(r => enRango(r.anulacion?.fecha.slice(0, 10), f.anulacion)))
    && (!f.numero || numeroDe(p).includes(f.numero.replace(/\D/g, ''))) && (!f.idExterno || (p.idExterno ?? '').includes(f.idExterno))
    && (!f.empresas.length || f.empresas.includes(p.empresa)) && (!f.mercados.length || f.mercados.includes(mercadoDe(p))) && (!f.usuarios.length || f.usuarios.includes(p.detalles?.usuario ?? ''))
    && (!f.nombre || norm(`${nombrePerfil} ${ls.map(r => r.nombre).join(' ')}`).includes(norm(f.nombre)))
    && (!f.nacionalidades.length || f.nacionalidades.includes(p.nacionalidad)) && (!f.vip || alguna(r => r.vip))
    && (!f.deposito.length || (f.deposito.includes('con') && t.deposito > 0) || (f.deposito.includes('sin') && t.deposito === 0))
    && (!f.saldo.length || (f.saldo.includes('pendiente') && t.pendiente > 0.005) || (f.saldo.includes('pagado') && t.pendiente <= 0.005))
    && (!f.referencia || norm(p.detalles?.referencia ?? '').includes(norm(f.referencia))) && (!f.agentes.length || f.agentes.includes(p.detalles?.agente ?? ''));
}

const POR_PAGINA = 120;

function Pantalla() {
  const h = useHotel();
  const sp = useSearchParams();
  const router = useRouter();
  // Si el formulario se abrió desde otra pantalla (?nueva=1), Cancelar vuelve a esa pantalla.
  const [vieneDeFuera] = useState(() => !!sp.get('nueva'));
  const grupos = useMemo(() => agrupar(h.reservas), [h.reservas]);
  const buscarClave = (v: string | null) => {
    if (!v) return null;
    const r = h.reservas.find(x => x.id === v || x.grupo === v || x.numero === v || numeroDe(x) === v.replace(/\D/g, ''));
    return r ? (r.grupo ?? r.id) : null;
  };
  const [clave, setClave] = useState<string | null>(() => buscarClave(sp.get('id')));
  const inicial = grupos.find(g => g.clave === clave);
  const [tab, setTab] = useState<'Directa' | 'Agencia'>(inicial && esAgencia(inicial.principal) ? 'Agencia' : 'Directa');
  const [q, setQ] = useState('');
  const [filtros, setFiltros] = useState<FiltrosRes>(filtrosVacios);
  const [verFiltros, setVerFiltros] = useState(false);
  const [limite, setLimite] = useState(POR_PAGINA);
  const [nueva, setNueva] = useState<Prefill | null>(() => (sp.get('nueva') ? { hab: sp.get('hab') ?? '', entrada: sp.get('entrada') ?? '', salida: sp.get('salida') ?? '', tipo: sp.get('tipo') ?? '', perfilId: sp.get('perfil') ?? '' } : null));
  const [modal, setModal] = useState<null | 'tarjeta' | 'correo'>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [masivo, setMasivo] = useState<null | 'confirmar' | 'anular'>(null);
  const s = useSeleccion();
  const { imprimir, portal } = usePrint();

  const nombreDe = (g: GrupoReserva) => {
    const p = h.perfiles.find(x => x.id === g.principal.perfilId);
    return esAgencia(g.principal) && tab === 'Agencia' ? g.principal.empresa : (p?.nombre ?? g.principal.nombre);
  };
  const lista = useMemo(() => grupos.filter(g => (tab === 'Agencia') === esAgencia(g.principal))
    .filter(g => !q || norm(`${numeroDe(g.principal)} ${g.principal.idExterno ?? ''} ${g.lineas.map(r => `${r.nombre} ${r.habitacion}`).join(' ')} ${h.perfiles.find(x => x.id === g.principal.perfilId)?.nombre ?? ''} ${g.principal.empresa}`).includes(norm(q)))
    .filter(g => cumple(g, filtros, h.perfiles.find(x => x.id === g.principal.perfilId)?.nombre ?? ''))
    .sort((a, b) => (b.principal.creada ?? '').localeCompare(a.principal.creada ?? '') || b.principal.numero.localeCompare(a.principal.numero)),
  [grupos, tab, q, filtros, h.perfiles]);
  const sel = grupos.find(g => g.clave === clave);
  const nf = nFiltros(filtros);

  const filasListado = lista.map(g => {
    const t = totales(g.lineas);
    return { g, t, nombre: h.perfiles.find(x => x.id === g.principal.perfilId)?.nombre ?? g.principal.nombre };
  });
  const listado = (detallado: boolean) => imprimir(
    <HojaSistema titulo={detallado ? 'Listado detallado de reservas' : 'Listado de reservas'} subtitulo={`Reservas ${tab === 'Directa' ? 'directas' : 'de agencia'}`}
      criterio={`${lista.length} reservas · ${nf ? `${nf} filtros aplicados` : 'Sin filtros'}${q ? ` · Búsqueda: «${q}»` : ''}`}>
      <TablaReporte headers={detallado ? ['N°', 'Estado', 'Nombre', 'Tarifa', 'Hab.', 'Tipo', 'Entrada', 'Salida', 'Noches', 'Pax', 'Régimen', 'Total', 'Pagado', 'Pendiente'] : ['N°', 'Estado', 'Nombre', 'Tarifa', 'Habitaciones', 'Entrada', 'Salida', 'Total']}
        derecha={detallado ? [8, 9, 11, 12, 13] : [7]}>
        {detallado ? filasListado.flatMap(({ g, nombre }) => g.lineas.map((r, i) => (
          <tr key={r.id}><td style={tdR(false, { fontWeight: 600 })}>{i === 0 ? numeroDe(r) : ''}</td><td style={tdR()}>{r.estado}</td><td style={tdR()}>{i === 0 ? nombre : r.nombre}</td><td style={tdR()}>{r.tarifa}</td><td style={tdR()}>{r.habitacion || '—'}</td><td style={tdR()}>{r.tipo}</td>
            <td style={tdR()}>{fmtF(r.entrada)}</td><td style={tdR()}>{fmtF(r.salida)}</td><td style={tdR(true)}>{noches(r.entrada, r.salida)}</td><td style={tdR(true)}>{r.adultos + r.ninos}</td><td style={tdR()}>{r.regimen}</td>
            <td style={tdR(true)}><MontoCelda texto={fmtMon(totalReserva(r), r.moneda)} /></td><td style={tdR(true)}><MontoCelda texto={fmtMon(r.pagado, r.moneda)} /></td><td style={tdR(true)}><MontoCelda texto={fmtMon(Math.max(0, totalReserva(r) - r.pagado - r.depGarantia), r.moneda)} /></td></tr>
        ))) : filasListado.map(({ g, t, nombre }) => (
          <tr key={g.clave}><td style={tdR(false, { fontWeight: 600 })}>{numeroDe(g.principal)}</td><td style={tdR()}>{estadoGrupo(g.lineas)}</td><td style={tdR()}>{nombre}</td><td style={tdR()}>{g.principal.tarifa}</td>
            <td style={tdR()}>{g.lineas.map(r => r.habitacion || '—').join(', ')}</td><td style={tdR()}>{fmtF(g.principal.entrada)}</td><td style={tdR()}>{fmtF(g.principal.salida)}</td><td style={tdR(true)}><MontoCelda texto={fmtMon(t.subtotalII, g.principal.moneda)} /></td></tr>
        ))}
      </TablaReporte>
    </HojaSistema>);
  const elegidos = lista.filter(g => s.tiene(g.clave));
  const confirmables = elegidos.filter(g => g.lineas.some(l => l.estado === 'Solicitada' || l.estado === 'Lista de espera'));
  const anulables = elegidos.filter(g => g.lineas.some(l => ['Solicitada', 'Confirmada', 'Lista de espera'].includes(l.estado)));
  const cambiarTab = (t: 'Directa' | 'Agencia') => { setTab(t); setLimite(POR_PAGINA); s.limpiar(); };
  const sinFormato = (gs: GrupoReserva[] = lista) => exportarCSV('reservas', ['N° reserva', 'Línea', 'ID externo', 'Estado', 'Nombre', 'Empresa', 'Tarifa', 'Contrato', 'Habitación', 'Tipo', 'Uso', 'Entrada', 'Salida', 'Noches', 'Adultos', 'Niños', 'Régimen', 'Precio', 'Total', 'Pagado', 'Dep. garantía', 'Creada'],
    gs.flatMap(g => g.lineas.map(r => [numeroDe(r), r.numero, r.idExterno ?? '', r.estado, r.nombre, r.empresa, r.tarifa, contratoDeTarifa(r.tarifa), r.habitacion, r.tipo, usoDe(r), fmtF(r.entrada), fmtF(r.salida), noches(r.entrada, r.salida), r.adultos, r.ninos, r.regimen, r.precio, totalReserva(r), r.pagado, r.depGarantia, r.creada?.replace('T', ' ') ?? ''])));

  if (nueva) {
    return <FormReserva prefill={nueva} onCancelar={() => { if (vieneDeFuera && window.history.length > 1) router.back(); else setNueva(null); }}
      onGuardado={(c, t) => { setNueva(null); setClave(c); const g = h.reservas.find(r => (r.grupo ?? r.id) === c); if (g) setTab(esAgencia(g) ? 'Agencia' : 'Directa'); setToast(t); }} />;
  }

  return (
    <PantallaStd titulo="Reservas" sinPadding cuerpoStyle={{ flexDirection: 'row', gap: 0, overflow: 'hidden' }}
      acciones={<>
        <MenuBoton label="Tarjeta de registro" opciones={[{ label: sel && !sel.principal.tarjetaLista ? 'Registro pendiente (Web Check-In)' : 'Ver tarjeta de registro', onClick: () => setModal('tarjeta'), disabled: !sel }, { label: 'Enviar por correo', onClick: () => setModal('correo'), disabled: !sel }]} />
        <BotonExportar disabled={!lista.length} titulo={`Reservas ${tab === 'Directa' ? 'directas' : 'de agencia'}`} criterio={`${lista.length} reservas · ${nf ? `${nf} filtros aplicados` : 'Sin filtros'}${q ? ` · Búsqueda: «${q}»` : ''}`}
          onCSV={() => sinFormato()} onPDF={() => listado(false)} masOpciones={{ label: 'Listado detallado (PDF)', onClick: () => listado(true) }} />
        <Button onClick={() => setNueva({})}>Nueva reserva</Button>
      </>}
      tabs={{ items: [{ id: 'Directa', count: grupos.filter(g => !esAgencia(g.principal)).length }, { id: 'Agencia', count: grupos.filter(g => esAgencia(g.principal)).length }] as const, activo: tab, onChange: cambiarTab }}
      filtros={<>
        <div style={{ width: 220 }}><Buscador value={q} onChange={v => { setQ(v); setLimite(POR_PAGINA); }} placeholder="N° reserva, nombre, habitación" /></div>
        <div style={{ width: 190 }}><MultiSelect value={filtros.estados} onChange={v => { setFiltros({ ...filtros, estados: v as EstadoReserva[] }); setLimite(POR_PAGINA); }} placeholder="Estado: todos" opciones={ESTADOS_RESERVA.map(e => ({ value: e, label: e }))} /></div>
        <RangoBoton label="Entrada" desde={filtros.entrada.d} hasta={filtros.entrada.h} onChange={(d, x) => setFiltros({ ...filtros, entrada: { d, h: x } })} />
        <RangoBoton label="Salida" desde={filtros.salida.d} hasta={filtros.salida.h} onChange={(d, x) => setFiltros({ ...filtros, salida: { d, h: x } })} />
        <Button variant="secondary" onClick={() => setVerFiltros(true)} style={nf ? { color: C.brand, borderColor: C.brand, background: C.brandBg } : undefined}>Más filtros{nf ? ` (${nf})` : ''}</Button>
        {(nf > 0 || q) && <Button variant="ghost" style={{ color: C.error }} onClick={() => { setFiltros(filtrosVacios()); setQ(''); }}>Limpiar filtros</Button>}
      </>}
      filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>{lista.length} reservas</span>}
      seleccion={{ n: s.n, onLimpiar: s.limpiar, etiqueta: s.n === 1 ? 'seleccionada' : 'seleccionadas', acciones: <>
        <Button variant="secondary" disabled={!confirmables.length} onClick={() => setMasivo('confirmar')}>Confirmar ({confirmables.length})</Button>
        <Button variant="secondary" onClick={() => sinFormato(elegidos)}>Exportar selección</Button>
        <Button variant="secondary" disabled={!anulables.length} style={{ color: C.error }} onClick={() => setMasivo('anular')}>Anular ({anulables.length})</Button>
      </> }}>
        <aside style={{ width: 230, flexShrink: 0, background: C.n000, borderRight: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px 8px', fontSize: 11.5, color: C.n700, borderBottom: `1px solid ${C.n500}` }}>
            <CheckTodos s={s} ids={lista.slice(0, limite).map(g => g.clave)} />Seleccionar visibles
          </label>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 12px' }} role="listbox" aria-label="Reservas">
            {lista.length === 0 && <p style={{ fontSize: 12, color: C.n700, textAlign: 'center', padding: 20 }}>No se encontraron reservas</p>}
            {lista.slice(0, Math.max(limite, lista.findIndex(g => g.clave === clave) + 1)).map(g => (
              <div key={g.clave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ paddingLeft: 10 }}><CheckFila s={s} id={g.clave} label={`Seleccionar reserva ${numeroDe(g.principal)}`} /></span>
                <div style={{ flex: 1, minWidth: 0 }}><ItemReserva g={g} nombre={nombreDe(g)} activo={g.clave === clave} agencia={tab === 'Agencia'} onClick={() => setClave(g.clave)} /></div>
              </div>))}
            {lista.length > limite && <div style={{ textAlign: 'center', padding: 8 }}><Button variant="ghost" onClick={() => setLimite(l => l + POR_PAGINA)}>Mostrar más ({lista.length - limite})</Button></div>}
          </div>
        </aside>
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: C.n200 }}>
          {sel ? <DetalleReserva key={sel.clave} g={sel} onAbrir={c => setClave(c)} onToast={setToast} />
            : (
              <div style={{ padding: 24 }}>
                <div style={{ background: C.n000, borderRadius: radius.card, border: `1px solid ${C.n500}`, padding: '56px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: '18vh' }}>
                  <span style={{ width: 48, height: 48, borderRadius: '50%', background: C.brandBg, color: C.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
                  </span>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: C.n700 }}>Selecciona una reserva o crea una nueva</p>
                </div>
              </div>
            )}
        </div>
      {verFiltros && <ModalFiltros inicial={filtros} agencia={tab === 'Agencia'} onClose={() => setVerFiltros(false)} onAplicar={f => { setFiltros(f); setVerFiltros(false); setLimite(POR_PAGINA); }} />}
      {modal === 'tarjeta' && sel && <TarjetaRegistro reservaId={sel.principal.id} onClose={() => setModal(null)} />}
      {modal === 'correo' && sel && <EnviarCorreo g={sel} onClose={() => setModal(null)} onListo={t => { setModal(null); setToast(t); }} />}
      {masivo === 'confirmar' && <Alerta open titulo={`¿Confirmar ${confirmables.length} reservas?`} onClose={() => setMasivo(null)} confirmar="Confirmar reservas"
        onConfirm={() => { confirmables.forEach(g => h.cambiarEstado(g.lineas.filter(l => l.estado === 'Solicitada' || l.estado === 'Lista de espera').map(l => l.id), 'Confirmada')); setMasivo(null); s.limpiar(); setToast(`${confirmables.length} reservas confirmadas`); }}>
        Las líneas solicitadas o en lista de espera pasarán a «Confirmada»: {confirmables.map(g => numeroDe(g.principal)).join(', ')}.
      </Alerta>}
      {masivo === 'anular' && <AnularVarias gs={anulables} onClose={() => setMasivo(null)} onListo={t => { setMasivo(null); s.limpiar(); setToast(t); }} />}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </PantallaStd>
  );
}

function AnularVarias({ gs, onClose, onListo }: { gs: GrupoReserva[]; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(false);
  return (
    <Alerta open titulo={`¿Anular ${gs.length} reservas?`} tono="danger" onClose={onClose} confirmar="Sí, anular" cancelar="Cancelar"
      onConfirm={() => { if (!motivo.trim()) return setError(true); gs.forEach(g => h.anularReserva(g.lineas.filter(l => ['Solicitada', 'Confirmada', 'Lista de espera'].includes(l.estado)).map(l => l.id), motivo.trim())); onListo(`${gs.length} reservas anuladas`); }}>
      Esta acción no se puede deshacer. Se anularán: {gs.map(g => numeroDe(g.principal)).join(', ')}. Las reservas en casa no se anulan desde aquí.
      <div style={{ marginTop: 12, textAlign: 'left' }}>
        <span style={{ fontSize: 12, color: C.n900 }}>Motivo <b style={{ color: C.error }}>*</b></span>
        <TextArea value={motivo} onChange={v => { setMotivo(v.slice(0, 300)); setError(false); }} rows={3} placeholder="Indica el motivo de la anulación" />
        {error && <span style={{ fontSize: 11, color: C.error }}>El motivo es obligatorio.</span>}
      </div>
    </Alerta>
  );
}

function ItemReserva({ g, nombre, activo, agencia, onClick }: { g: GrupoReserva; nombre: string; activo: boolean; agencia: boolean; onClick: () => void }) {
  const p = g.principal;
  const t = totales(g.lineas);
  const ref = useRef<HTMLButtonElement>(null);
  // La reserva abierta por enlace (?id=) queda visible en la lista
  useEffect(() => { if (activo) ref.current?.scrollIntoView({ block: 'nearest' }); }, [activo]);
  return (
    <button ref={ref} type="button" role="option" aria-selected={activo} onClick={onClick}
      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 10px', border: `1px solid ${activo ? C.brand : 'transparent'}`, borderBottom: activo ? `1px solid ${C.brand}` : `1px solid ${C.n500}`, background: activo ? C.brandBg : 'transparent', borderRadius: activo ? radius.md : 0, cursor: 'pointer', fontFamily: FONT }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: C.n900 }}>{numeroDe(p)}{g.lineas.length > 1 && <span style={{ fontSize: 10.5, color: C.n700 }}> · {g.lineas.length} hab.{p.modalidad === 'grupo' ? ' · grupo' : ''}</span>}</span>
        <ChipEstado estado={estadoGrupo(g.lineas)} />
      </span>
      <span style={{ display: 'block', fontSize: 11.5, color: C.n700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{nombre}</span>
      <span style={{ display: 'block', fontSize: 11, color: C.n700 }}>{fmtF(p.entrada).slice(0, 6) + p.entrada.slice(2, 4)} - {fmtF(p.salida).slice(0, 6) + p.salida.slice(2, 4)}</span>
      {agencia && <span style={{ display: 'block', fontSize: 11, color: t.pendiente > 0.005 ? '#B58900' : '#2E7D32' }}>F. Empresa: {t.pendiente > 0.005 ? 'Pendiente' : 'Pagada'}</span>}
    </button>
  );
}

// ── Modal «Filtros de reserva» ──────────────────────────────────────────────
function Grupo({ titulo, n, onLimpiar, children, abierto: ini = false }: { titulo: string; n: number; onLimpiar: () => void; children: ReactNode; abierto?: boolean }) {
  const [abierto, setAbierto] = useState(ini || n > 0);
  return (
    <section style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto} style={{ border: 'none', background: 'none', padding: 0, fontSize: 14, fontWeight: 600, color: C.n900, cursor: 'pointer', fontFamily: FONT }}>{titulo}</button>
        {n > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.brand, background: C.brandBg, border: `1px solid ${C.brandBd}`, borderRadius: radius.pill, padding: '2px 8px' }}>
          {n} filtros seleccionados<button type="button" onClick={onLimpiar} aria-label={`Quitar filtros de ${titulo}`} style={{ border: 'none', background: 'none', color: C.brand, cursor: 'pointer', padding: 0, display: 'flex' }}>⊗</button></span>}
        <button type="button" onClick={() => setAbierto(a => !a)} aria-label={abierto ? 'Contraer' : 'Expandir'} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: C.n900, transform: abierto ? 'rotate(180deg)' : undefined, display: 'flex' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>
      {abierto && children}
    </section>
  );
}
const lbl: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: C.n900, minWidth: 0 };
function Fecha({ l, r, on }: { l: string; r: Rango; on: (r: Rango) => void }) {
  const inp: CSSProperties = { height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 6px', fontSize: 12, fontFamily: FONT, minWidth: 0, flex: 1 };
  return <label style={lbl}>{l}<span style={{ display: 'flex', gap: 4 }}><input type="date" aria-label={`${l} desde`} value={r.d} onChange={e => on({ ...r, d: e.target.value })} className="suite-campo" style={inp} /><input type="date" aria-label={`${l} hasta`} value={r.h} min={r.d} onChange={e => on({ ...r, h: e.target.value })} className="suite-campo" style={inp} /></span></label>;
}
const ops = (xs: readonly string[] | { value: string; label: string }[]) => (xs as (string | { value: string; label: string })[]).map(x => (typeof x === 'string' ? { value: x, label: x } : x));

function ModalFiltros({ inicial, agencia, onClose, onAplicar }: { inicial: FiltrosRes; agencia: boolean; onClose: () => void; onAplicar: (f: FiltrosRes) => void }) {
  const h = useHotel();
  const [f, setF] = useState<FiltrosRes>(inicial);
  const s = seccion(f);
  const set = <K extends keyof FiltrosRes>(k: K) => (v: FiltrosRes[K]) => setF(x => ({ ...x, [k]: v }));
  const empresas = [...new Set(h.reservas.map(r => r.empresa).filter(Boolean))].sort();
  const multi = (l: string, k: 'tipos' | 'usos' | 'tarifas' | 'regimenes' | 'origenes' | 'condiciones' | 'empresas' | 'mercados' | 'usuarios' | 'nacionalidades' | 'agentes', o: { value: string; label: string }[]) =>
    <label style={lbl}><span style={{ color: f[k].length ? C.brand : C.n900 }}>{l}</span><MultiSelect value={f[k]} onChange={set(k)} opciones={o} placeholder="Seleccionar" resumen={sel => (sel.length === 1 ? sel[0].label : `${sel.length} opciones`)} /></label>;
  return (
    <Modal open title="Filtros de reserva" onClose={onClose} width={980}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="secondary" onClick={() => setF(filtrosVacios())}>Limpiar filtros</Button><Button onClick={() => onAplicar(f)}>Aplicar filtros</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Grupo titulo="Búsqueda principal" n={s.principal} abierto onLimpiar={() => setF({ ...f, estados: [], nHab: '', tipos: [], usos: [], tarifas: [], regimenes: [], origenes: [], condiciones: [] })}>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {ESTADOS_RESERVA.map(e => <Checkbox key={e} checked={f.estados.includes(e)} onChange={b => set('estados')(b ? [...f.estados, e] : f.estados.filter(x => x !== e))} label={e === 'In-House' ? 'Check-In (In-House)' : e} />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 10 }}>
            <label style={lbl}># Habitaciones<Input value={f.nHab} onChange={x => set('nHab')(x.replace(/\D/g, ''))} placeholder="Ej: 2" /></label>
            {multi('Tipo de habit.', 'tipos', TIPOS.map(t => ({ value: t.id, label: `${t.codigo} - ${t.nombre}` })))}
            {multi('Uso de habit.', 'usos', USOS.map(u => ({ value: u.id, label: `${u.id} - ${u.label}` })))}
            {multi('Tarifa', 'tarifas', TARIFAS_NOMBRES.map(t => ({ value: t, label: `${t} · ${contratoDeTarifa(t)}` })))}
            {multi('Régimen', 'regimenes', Object.entries(REGIMENES).map(([k, x]) => ({ value: k, label: `${k} - ${x}` })))}
            {multi('Origen de neg.', 'origenes', ops(ORIGENES))}
            {multi('Cond. Especiales', 'condiciones', ops(CONDICIONES))}
          </div>
        </Grupo>
        <Grupo titulo="Fechas" n={s.fechas} onLimpiar={() => setF({ ...f, entrada: rv(), salida: rv(), creacion: rv(), anulacion: rv() })}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
            <Fecha l="Entrada" r={f.entrada} on={set('entrada')} /><Fecha l="Salida" r={f.salida} on={set('salida')} /><Fecha l="Creación" r={f.creacion} on={set('creacion')} /><Fecha l="Anulación" r={f.anulacion} on={set('anulacion')} />
          </div>
        </Grupo>
        <Grupo titulo="Detalles" n={s.detalles} onLimpiar={() => setF({ ...f, numero: '', idExterno: '', empresas: [], mercados: [], usuarios: [] })}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 10 }}>
            <label style={lbl}>Número de reserva<Input value={f.numero} onChange={set('numero')} placeholder="Ej: 4410" /></label>
            <label style={lbl}>ID de reserva<Input value={f.idExterno} onChange={set('idExterno')} placeholder="Ej: 001" /></label>
            {multi('Empresa', 'empresas', ops(empresas))}{multi('Mercado', 'mercados', ops(MERCADOS))}{multi('Usuario', 'usuarios', ops(USUARIOS))}
          </div>
        </Grupo>
        <Grupo titulo="Cliente" n={s.cliente} onLimpiar={() => setF({ ...f, nombre: '', nacionalidades: [], vip: false })}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, alignItems: 'end' }}>
            <label style={lbl}>Nombre del huésped / reservante<Input value={f.nombre} onChange={set('nombre')} placeholder="Búsqueda parcial" /></label>
            {multi('Nacionalidad', 'nacionalidades', Object.entries(NACIONALIDADES).map(([k, x]) => ({ value: k, label: x })))}
            <span style={{ height: 32, display: 'flex', alignItems: 'center' }}><Checkbox checked={f.vip} onChange={set('vip')} label="Solo VIP" /></span>
          </div>
        </Grupo>
        <Grupo titulo="Finanzas" n={s.finanzas} onLimpiar={() => setF({ ...f, deposito: [], saldo: [] })}>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            {[['deposito', 'con', 'Con depósito'], ['deposito', 'sin', 'Sin depósito'], ['saldo', 'pendiente', 'Con saldo pendiente'], ['saldo', 'pagado', 'Al día (pagadas)']].map(([k, val, l]) => {
              const arr = f[k as 'deposito' | 'saldo'];
              return <Checkbox key={val} checked={arr.includes(val)} onChange={b => set(k as 'deposito')(b ? [...arr, val] : arr.filter(x => x !== val))} label={l} />;
            })}
          </div>
        </Grupo>
        <Grupo titulo="Agencia" n={s.agencia} abierto={agencia} onLimpiar={() => setF({ ...f, referencia: '', agentes: [] })}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={lbl}>Referencia agencia<Input value={f.referencia} onChange={set('referencia')} placeholder="Ej: BOO-4181" /></label>
            {multi('Agente', 'agentes', ops(AGENTES))}
          </div>
        </Grupo>
      </div>
    </Modal>
  );
}
