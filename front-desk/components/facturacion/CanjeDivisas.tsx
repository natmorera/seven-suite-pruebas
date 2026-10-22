'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Select, Toast } from '@/components/suite/ui';
import { Campo, Celda, Fila, FilaVacia, InputAfijo, ModalBase, Paginacion, Tabla, norm, usePaginado } from '@/components/configuracion/kit';
import { exportarCSV, usePrint } from '@/components/hotel/ui';
import { FiltroFecha } from '@/components/suite/FiltroFecha';
import { CheckFila, CheckTodos, useSeleccion } from '@/components/layout/Pantalla';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { fmtF } from '@/components/hotel/datos';
import { COMISIONES_CANJE, MONEDAS, ahoraHotel, fmtMon, fmtN, r2, simbolo, tasaCruce, type Canje, type Mon } from '@/components/hotel/finanzas';
import { turnoAbiertoDe } from '@/components/hotel/accionesFinanzas';
import { BotonIcono, BuscarPerfil, Exportar, FiltroUno, HojaSistema, IcDoc, PaginaFact, Tarjeta, TablaReporte, tdR, type PerfilElegido } from './comun';
import { VisorCanje } from './ReciboCanje';
import { MontoCelda, celdaMonto } from '@/components/suite/Monto';

const opcMonedas = MONEDAS.map(m => ({ value: m.codigo, label: m.codigo }));
export const titulo = (x: string) => x.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());

/**
 * Canje de divisas en recepción: listado de todos los canjes (filtros, detalle con el recibo de cada uno) y
 * «Nuevo canje» en el header, que abre el formulario: qué moneda entrega el cliente y cuál recibe, el monto
 * (lo que entrega o lo que quiere recibir) y la comisión, sugerida según sea huésped o no.
 */
export default function CanjeDivisas() {
  const h = useHotel();
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [periodo, setPeriodo] = useState({ d: '', h: '' });
  const s = useSeleccion();
  const [conComision, setConComision] = useState(false);
  const [recibo, setRecibo] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { imprimir, portal } = usePrint();

  const filas = useMemo(() => [...h.canjes].sort((a, b) => b.fecha.localeCompare(a.fecha)).filter(c =>
    (!origen || c.monedaOrigen === origen) && (!destino || c.monedaDestino === destino) && (!periodo.d || c.fecha.slice(0, 10) >= periodo.d) && (!periodo.h || c.fecha.slice(0, 10) <= periodo.h) && (!conComision || c.comision > 0)), [h.canjes, origen, destino, periodo, conComision]);
  const pag = usePaginado(filas, 50);
  const hayFiltros = !!(origen || destino || periodo.d || periodo.h || conComision);
  const csv = (xs: Canje[] = filas) => exportarCSV('canjes-de-divisas', ['Número', 'Fecha', 'Moneda origen', 'Importe origen', 'Tasa de cambio', 'Moneda destino', 'Importe destino', 'Comisión', 'Cliente', 'Usuario'],
    xs.map(c => [c.numero, `${fmtF(c.fecha.slice(0, 10))} ${c.fecha.slice(11, 16)}`, c.monedaOrigen, c.importeOrigen, c.tasa.toFixed(4), c.monedaDestino, c.entregado, c.comision, c.nombre || '—', c.usuario]));
  const pdf = (xs: Canje[] = filas) => imprimir(
    <HojaSistema titulo="Canjes de divisas" subtitulo="Historial de canjes registrados en recepción" criterio={[origen && `Moneda origen: ${origen}`, destino && `Moneda destino: ${destino}`, (periodo.d || periodo.h) && `Fecha: ${fmtF(periodo.d) || '…'} al ${fmtF(periodo.h) || '…'}`, conComision && 'Solo con comisión'].filter(Boolean).join(' · ') || 'Todos los canjes'}>
      <TablaReporte headers={['N°', 'Fecha', 'Origen', 'Importe origen', 'Tasa', 'Destino', 'Importe destino', 'Comisión', 'Cliente']} derecha={[3, 4, 6, 7]}>
        {xs.map(c => <tr key={c.id}><td style={tdR()}>{c.numero}</td><td style={tdR()}>{fmtF(c.fecha.slice(0, 10))} {c.fecha.slice(11, 16)}</td><td style={tdR()}>{c.monedaOrigen}</td><td style={tdR(true)}><MontoCelda texto={fmtMon(c.importeOrigen, c.monedaOrigen)} /></td>
          <td style={tdR(true)}>{fmtN(c.tasa, 4)}</td><td style={tdR()}>{c.monedaDestino}</td><td style={tdR(true)}><MontoCelda texto={fmtMon(c.entregado, c.monedaDestino)} /></td><td style={tdR(true)}>{fmtN(c.comision)}</td><td style={tdR()}>{c.nombre || '—'}</td></tr>)}
      </TablaReporte>
    </HojaSistema>);

  const sel = h.canjes.find(c => c.id === recibo);
  return (
    <PaginaFact titulo="Canje de divisas" acciones={<><Exportar onCSV={() => csv()} onPDF={() => pdf()} disabled={!filas.length} /><Button onClick={() => setNuevo(true)}>Nuevo canje</Button></>}
      filtros={<>
        <FiltroUno label="Moneda de origen" value={origen} onChange={setOrigen} opciones={opcMonedas} todos="Todas" />
        <FiltroUno label="Moneda destino" value={destino} onChange={setDestino} opciones={opcMonedas} todos="Todas" />
        <FiltroFecha label="Fecha" desde={periodo.d} hasta={periodo.h} onChange={(d, x) => setPeriodo({ d, h: x })} />
        <Checkbox label="Con comisión" checked={conComision} onChange={setConComision} />
        {hayFiltros && <Button variant="ghost" style={{ color: C.error }} onClick={() => { setOrigen(''); setDestino(''); setPeriodo({ d: '', h: '' }); setConComision(false); }}>Limpiar filtros</Button>}
      </>} filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>{filas.length} canjes</span>}
      seleccion={{ n: s.n, onLimpiar: s.limpiar, acciones: <>
        <Button variant="secondary" onClick={() => csv(filas.filter(c => s.tiene(c.id)))}>Exportar selección (Excel)</Button>
        <Button variant="secondary" onClick={() => pdf(filas.filter(c => s.tiene(c.id)))}>Imprimir selección</Button>
      </> }}>
      <Tarjeta>
        <Tabla headers={[<CheckTodos key="t" s={s} ids={pag.visibles.map(c => c.id)} />, 'N°', 'Fecha', 'Cliente', 'Entrega', 'Tasa', 'Recibe', 'Comisión', 'Usuario', '']} alinearDerecha={[4, 5, 6, 7]} minWidth={940}>
          {pag.visibles.length === 0 && <FilaVacia cols={10} texto={hayFiltros ? 'Ningún canje coincide con los filtros.' : 'Todavía no hay canjes registrados.'} />}
          {pag.visibles.map(c => (
            <Fila key={c.id} activa={s.tiene(c.id)}>
              <Celda style={{ width: 28 }}><CheckFila s={s} id={c.id} label={`Seleccionar canje ${c.numero}`} /></Celda>
              <Celda><button type="button" onClick={() => setRecibo(c.id)} title="Ver detalle y recibo" style={{ border: 'none', background: 'none', padding: 0, color: C.brand, textDecoration: 'underline', textUnderlineOffset: 2, fontWeight: 500, fontFamily: FONT, fontSize: 12, cursor: 'pointer' }}>{c.numero}</button></Celda>
              <Celda style={{ whiteSpace: 'nowrap' }}>{fmtF(c.fecha.slice(0, 10))} <span style={{ color: C.n700 }}>{c.fecha.slice(11, 16)}</span></Celda>
              <Celda>{c.perfilId ? <Link href={`/hospedaje/perfiles?id=${c.perfilId}`} style={{ color: C.n900 }}>{c.nombre}</Link> : c.nombre || '—'}{c.habitacion && <span style={{ color: C.n700 }}> · Hab. {c.habitacion}</span>}</Celda>
              <Celda derecha style={{ whiteSpace: 'nowrap' }}><MontoCelda texto={fmtMon(c.importeOrigen, c.monedaOrigen)} /></Celda>
              <Celda derecha style={{ whiteSpace: 'nowrap' }}>{fmtN(c.tasa, c.tasa < 1 ? 6 : 2)}</Celda>
              <Celda derecha style={{ whiteSpace: 'nowrap' }}><b style={{ fontWeight: 600 }}>{celdaMonto(fmtMon(c.entregado, c.monedaDestino))}</b></Celda>
              <Celda derecha>{celdaMonto(c.comision ? fmtMon(c.comision, c.monedaDestino) : '—')}</Celda>
              <Celda muted>{c.usuario}</Celda>
              <Celda derecha><BotonIcono label={`Ver recibo ${c.numero}`} onClick={() => setRecibo(c.id)}><IcDoc /></BotonIcono></Celda>
            </Fila>
          ))}
        </Tabla>
        <Paginacion pagina={pag.pagina} total={pag.total} onChange={pag.setPagina} filas={pag.filas} porPagina={pag.tam} />
      </Tarjeta>
      {nuevo && (
        <ModalBase titulo="Nuevo canje" onClose={() => setNuevo(false)} ancho={600} altoMax="94vh">
          <CanjeRapido onCancelar={() => setNuevo(false)} onListo={id => { setNuevo(false); setRecibo(id); setToast('Canje registrado. Se generó el recibo.'); }} />
        </ModalBase>
      )}
      {sel && <VisorCanje canje={sel} onClose={() => setRecibo(null)} />}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </PaginaFact>
  );
}

// ── Formulario de nuevo canje (modal) ───────────────────────────────────────
function CanjeRapido({ onListo, onCancelar }: { onListo: (id: string) => void; onCancelar: () => void }) {
  const h = useHotel();
  const [elegido, setElegido] = useState<PerfilElegido | null>(null);
  const [nombre, setNombre] = useState('');
  const [buscar, setBuscar] = useState(false);
  const [mo, setMo] = useState<Mon>('USD');
  const [md, setMd] = useState<Mon>('CRC');
  const [modo, setModo] = useState<'entrega' | 'recibe'>('entrega');
  const [monto, setMonto] = useState('');
  const [comision, setComision] = useState<string | null>(null);
  const [obs, setObs] = useState('');
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const tasa = tasaCruce(mo, md);
  const huesped = !!elegido?.reserva;
  // Comisión sugerida: huésped 1 %, no huésped 2 % (se puede cambiar)
  const comId = comision ?? (elegido ? (huesped ? 'c1' : 'c2') : nombre.trim() ? 'c2' : 'sin');
  const com = COMISIONES_CANJE.find(c => c.id === comId);
  const pct = (com?.pct ?? 0) / 100;
  const n = Number(monto) || 0;
  // Si el cliente dice cuánto quiere recibir, se calcula cuánto debe entregar
  const importe = modo === 'entrega' ? n : r2(n / (tasa * (1 - pct)) || 0);
  const bruto = r2(importe * tasa);
  const montoCom = r2(bruto * pct);
  const entregado = modo === 'entrega' ? r2(bruto - montoCom) : n;
  const turno = turnoAbiertoDe(h, h.sesion);
  const enCasa = useMemo(() => h.reservas.filter(r => r.estado === 'In-House'), [h.reservas]);
  const sugerencias = q.trim() ? enCasa.filter(r => norm(`${r.nombre} ${r.habitacion}`).includes(norm(q))).slice(0, 5) : [];
  const limpiar = () => { setElegido(null); setNombre(''); setMonto(''); setComision(null); setObs(''); setError(''); setQ(''); };
  const registrar = () => {
    if (!turno) return setError(`${h.sesion} no tiene un turno de caja abierto. Abre tu turno en Caja para registrar canjes.`);
    if (importe <= 0) return setError('Ingresa el monto.');
    if (mo === md) return setError('La moneda que entrega y la que recibe deben ser distintas.');
    const id = nuevoId('cj');
    const r = elegido?.reserva;
    const c: Omit<Canje, 'numero'> = {
      id, fecha: ahoraHotel(), perfilId: elegido?.perfil?.id ?? null, nombre: elegido ? elegido.nombre : nombre.trim(), habitacion: r?.habitacion ?? '', pasaporte: elegido?.perfil?.numeroId ?? r?.identificacion ?? '', reservaId: r?.id ?? null,
      monedaOrigen: mo, importeOrigen: r2(importe), monedaDestino: md, tasa, importeDestino: bruto, comisionId: com?.id ?? 'sin', comisionPct: com?.pct ?? 0, comision: montoCom, entregado, observaciones: obs.trim(), usuario: h.sesion,
    };
    h.registrarCanje(c, c.fecha.slice(11, 16));
    limpiar();
    onListo(id);
  };
  /** Desplegable de moneda; si se elige la misma que la otra, se intercambian. */
  const moneda = (val: Mon, set: (m: Mon) => void, otra: Mon, setOtra: (m: Mon) => void) => (
    <Select value={val} onChange={v => { if (v === otra) setOtra(val); set(v as Mon); }} options={MONEDAS.map(m => ({ value: m.codigo, label: `${m.simbolo} ${m.codigo} · ${m.nombre}` }))} />
  );
  const grande = (v: string) => <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums' }}>{v}</span>;
  return (
    <section aria-label="Nuevo canje" style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
      <span style={{ fontSize: 11.5, color: turno ? '#0E7A57' : '#B45309' }}>{turno ? `Se registra en la caja · turno de ${h.sesion.split(' ')[0]}` : 'Sin turno de caja abierto'}</span>
      {!turno && <div role="alert" style={{ fontSize: 12, color: '#7A5C00', background: 'rgba(238,179,0,.10)', border: '1px solid rgba(238,179,0,.3)', borderRadius: radius.control, padding: '8px 12px' }}>
        El canje se registra en el turno del cajero. <Link href="/facturacion/caja" style={{ color: C.brand }}>Abrir mi turno en Caja</Link></div>}
      {/* Cliente */}
      <div style={{ position: 'relative' }}>
        <span style={{ display: 'block', fontSize: 12, color: C.n700, marginBottom: 6 }}>Cliente <span style={{ color: C.n700 }}>(huésped o visitante)</span></span>
        {elegido ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, height: 36, padding: '0 10px', border: `1px solid ${C.brandBd}`, background: C.brandBg, borderRadius: radius.control, fontSize: 12.5 }}>
            <span><b style={{ fontWeight: 600 }}>{elegido.nombre}</b>{elegido.reserva && <span style={{ color: C.n700 }}> · Hab. {elegido.reserva.habitacion}</span>}</span>
            <button type="button" onClick={() => { setElegido(null); setComision(null); }} style={{ border: 'none', background: 'none', color: C.error, cursor: 'pointer', fontSize: 12, fontFamily: FONT }}>Quitar</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><Input value={q || nombre} onChange={v => { setQ(v); setNombre(v); }} placeholder="Nombre o número de habitación" aria-label="Cliente" /></div>
            <Button variant="secondary" onClick={() => setBuscar(true)}>Buscar perfil</Button>
          </div>
        )}
        {!elegido && sugerencias.length > 0 && (
          <div role="listbox" aria-label="Huéspedes en casa" style={{ position: 'absolute', zIndex: 5, top: '100%', left: 0, right: 0, marginTop: 4, background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.md, boxShadow: '0 8px 24px rgba(0,0,0,.08)', padding: 4 }}>
            {sugerencias.map(r => (
              <button key={r.id} type="button" role="option" aria-selected={false} className="suite-fila" onClick={() => { const p = h.perfiles.find(x => x.id === r.perfilId) ?? null; setElegido({ perfil: p, reserva: r, nombre: p?.nombre ?? titulo(r.nombre) }); setQ(''); setNombre(''); }}
                style={{ display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontFamily: FONT }}>
                {titulo(r.nombre)}<span style={{ color: C.n700 }}>Hab. {r.habitacion}</span></button>
            ))}
          </div>
        )}
      </div>
      {/* Monedas e importe */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
        <Campo label="Moneda que entrega el cliente">{moneda(mo, setMo, md, setMd)}</Campo>
        <button type="button" aria-label="Invertir monedas" title="Invertir" onClick={() => { setMo(md); setMd(mo); }} style={{ width: 34, height: 34, borderRadius: '50%', border: `1px solid ${C.n500}`, background: C.n000, cursor: 'pointer', fontSize: 15, marginTop: 18 }}>⇄</button>
        <Campo label="Moneda que recibe el cliente">{moneda(md, setMd, mo, setMo)}</Campo>
      </div>
      <span style={{ fontSize: 12, color: C.n700, marginBottom: -10 }}>¿El cliente dice cuánto entrega o cuánto quiere recibir?</span>
      <div role="radiogroup" aria-label="Calcular por" style={{ display: 'inline-flex', alignSelf: 'flex-start', border: `1px solid ${C.n500}`, borderRadius: radius.control, overflow: 'hidden' }}>
        {([['entrega', `Entrega ${mo}`], ['recibe', `Quiere recibir ${md}`]] as const).map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={modo === v} onClick={() => { setModo(v); setMonto(''); }}
          style={{ height: 30, padding: '0 12px', border: 'none', background: modo === v ? C.brandBg : C.n000, color: modo === v ? C.brand : C.n700, fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}>{l}</button>)}
      </div>
      <div>
        <InputAfijo value={monto} onChange={v => setMonto(v.replace(/[^\d.]/g, ''))} prefijo={simbolo(modo === 'entrega' ? mo : md)} alinear="right" placeholder="0.00" />
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {(modo === 'entrega' ? (mo === 'CRC' ? [10000, 20000, 50000, 100000] : [20, 50, 100, 200]) : (md === 'CRC' ? [10000, 25000, 50000, 100000] : [20, 50, 100, 200])).map(x => (
            <button key={x} type="button" onClick={() => setMonto(String(x))} style={{ height: 26, padding: '0 10px', borderRadius: 999, border: `1px solid ${C.n500}`, background: C.n000, fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}>{simbolo(modo === 'entrega' ? mo : md)}{fmtN(x, 0)}</button>
          ))}
        </div>
      </div>
      {/* Resultado */}
      <div style={{ background: C.brandBg, border: `1px solid ${C.brandBd}`, borderRadius: radius.md, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 12, color: C.n700 }}>{modo === 'entrega' ? 'Entregar al cliente' : 'El cliente debe entregar'}</span>
          {grande(modo === 'entrega' ? fmtMon(entregado, md) : fmtMon(importe, mo))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.n700 }}>
          <span>Tasa: 1 {mo} = {fmtN(tasa, tasa < 1 ? 6 : 2)} {md}</span>
          <span>Comisión: {fmtMon(montoCom, md)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ color: C.n700 }}>Comisión aplicada</span>
          <select value={comId} onChange={e => setComision(e.target.value)} aria-label="Comisión" className="suite-campo" style={{ height: 28, border: `1px solid ${C.n500}`, borderRadius: 6, fontSize: 12, fontFamily: FONT, background: C.n000 }}>
            {COMISIONES_CANJE.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {comision === null && comId !== 'sin' && <span style={{ color: C.n700 }}>(sugerida: {huesped ? 'huésped' : 'no huésped'})</span>}
        </div>
      </div>
      <Campo label="Observaciones internas (opcional)"><Input value={obs} onChange={setObs} placeholder="No aparecen en el recibo" /></Campo>
      {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: `1px solid ${C.n500}`, paddingTop: 14 }}>
        <Button variant="ghost" onClick={limpiar} style={{ marginRight: 'auto' }}>Limpiar</Button>
        <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
        <Button onClick={registrar} disabled={!importe}>Registrar y emitir recibo</Button>
      </div>
      {buscar && <BuscarPerfil onClose={() => setBuscar(false)} onElegir={p => { setElegido(p); setBuscar(false); setQ(''); setNombre(''); }} />}
    </section>
  );
}
