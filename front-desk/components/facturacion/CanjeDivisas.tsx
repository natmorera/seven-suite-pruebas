'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Toast } from '@/components/suite/ui';
import { Campo, Celda, Fila, FilaVacia, InputAfijo, Paginacion, Tabla, norm, usePaginado } from '@/components/configuracion/kit';
import { FechaBoton, exportarCSV, usePrint } from '@/components/hotel/ui';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { HOY, fmtF } from '@/components/hotel/datos';
import { COMISIONES_CANJE, MONEDAS, ahoraHotel, fmtMon, fmtN, r2, simbolo, tasaCruce, type Canje, type Mon } from '@/components/hotel/finanzas';
import { turnoAbiertoDe } from '@/components/hotel/accionesFinanzas';
import { BotonIcono, BuscarPerfil, Exportar, FiltroUno, HojaSistema, IcDoc, PaginaFact, Tarjeta, TablaReporte, tdR, type PerfilElegido } from './comun';
import { VisorCanje } from './ReciboCanje';

const opcMonedas = MONEDAS.map(m => ({ value: m.codigo, label: m.codigo }));
export const titulo = (x: string) => x.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());

/**
 * Canje de divisas en recepción: la calculadora está siempre a la vista (sin
 * modal). El cajero elige qué entrega el cliente y qué recibe, escribe el monto
 * (o lo que el cliente quiere recibir) y registra; la comisión se sugiere sola
 * según sea huésped o no, y el recibo sale al registrar.
 */
export default function CanjeDivisas() {
  const h = useHotel();
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [fecha, setFecha] = useState('');
  const [conComision, setConComision] = useState(false);
  const [recibo, setRecibo] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { imprimir, portal } = usePrint();

  const filas = useMemo(() => [...h.canjes].sort((a, b) => b.fecha.localeCompare(a.fecha)).filter(c =>
    (!origen || c.monedaOrigen === origen) && (!destino || c.monedaDestino === destino) && (!fecha || c.fecha.startsWith(fecha)) && (!conComision || c.comision > 0)), [h.canjes, origen, destino, fecha, conComision]);
  const pag = usePaginado(filas, 10);
  const hayFiltros = !!(origen || destino || fecha || conComision);
  const hoy = h.canjes.filter(c => c.fecha.startsWith(HOY));
  const csv = () => exportarCSV('canjes-de-divisas', ['Número', 'Fecha', 'Moneda origen', 'Importe origen', 'Tasa de cambio', 'Moneda destino', 'Importe destino', 'Comisión', 'Cliente', 'Usuario'],
    filas.map(c => [c.numero, `${fmtF(c.fecha.slice(0, 10))} ${c.fecha.slice(11, 16)}`, c.monedaOrigen, c.importeOrigen, c.tasa.toFixed(4), c.monedaDestino, c.entregado, c.comision, c.nombre || '—', c.usuario]));
  const pdf = () => imprimir(
    <HojaSistema titulo="Canjes de divisas" subtitulo="Historial de canjes registrados en recepción" criterio={[origen && `Moneda origen: ${origen}`, destino && `Moneda destino: ${destino}`, fecha && `Fecha: ${fmtF(fecha)}`, conComision && 'Solo con comisión'].filter(Boolean).join(' · ') || 'Todos los canjes'}>
      <TablaReporte headers={['N°', 'Fecha', 'Origen', 'Importe origen', 'Tasa', 'Destino', 'Importe destino', 'Comisión', 'Cliente']} derecha={[3, 4, 6, 7]}>
        {filas.map(c => <tr key={c.id}><td style={tdR()}>{c.numero}</td><td style={tdR()}>{fmtF(c.fecha.slice(0, 10))} {c.fecha.slice(11, 16)}</td><td style={tdR()}>{c.monedaOrigen}</td><td style={tdR(true)}>{fmtMon(c.importeOrigen, c.monedaOrigen)}</td>
          <td style={tdR(true)}>{fmtN(c.tasa, 4)}</td><td style={tdR()}>{c.monedaDestino}</td><td style={tdR(true)}>{fmtMon(c.entregado, c.monedaDestino)}</td><td style={tdR(true)}>{fmtN(c.comision)}</td><td style={tdR()}>{c.nombre || '—'}</td></tr>)}
      </TablaReporte>
    </HojaSistema>);

  const sel = h.canjes.find(c => c.id === recibo);
  const total = (m: Mon, campo: 'importeOrigen' | 'entregado', lado: 'monedaOrigen' | 'monedaDestino') => hoy.filter(c => c[lado] === m).reduce((s, c) => s + c[campo], 0);
  return (
    <PaginaFact titulo="Canje de divisas" acciones={<Exportar onCSV={csv} onPDF={pdf} disabled={!filas.length} />}
      filtros={<>
        <FiltroUno label="Moneda de origen" value={origen} onChange={setOrigen} opciones={opcMonedas} todos="Todas" />
        <FiltroUno label="Moneda destino" value={destino} onChange={setDestino} opciones={opcMonedas} todos="Todas" />
        <FechaBoton label="Fecha" value={fecha} onChange={setFecha} />
        <Checkbox label="Con comisión" checked={conComision} onChange={setConComision} />
        {hayFiltros && <Button variant="ghost" style={{ color: C.error }} onClick={() => { setOrigen(''); setDestino(''); setFecha(''); setConComision(false); }}>Limpiar filtros</Button>}
      </>} filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>{filas.length} canjes</span>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 520px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <CanjeRapido onListo={id => { setRecibo(id); setToast('Canje registrado. Se generó el recibo.'); }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <Tarjeta titulo="Tasas del día" style={{ gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {MONEDAS.filter(m => m.codigo !== 'CRC').flatMap(m => [[m.codigo, 'CRC'], ['CRC', m.codigo]] as [Mon, Mon][]).concat(MONEDAS.some(m => m.codigo === 'EUR') ? [['EUR', 'USD'], ['USD', 'EUR']] as [Mon, Mon][] : []).map(([a, b]) => {
                const t = tasaCruce(a, b);
                return <div key={a + b} style={{ background: C.n200, borderRadius: radius.md, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11.5, color: C.n700 }}>1 {a} → {b}</div><div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{simbolo(b)} {fmtN(t, t < 1 ? 6 : 2)}</div></div>;
              })}
            </div>
            <span style={{ fontSize: 11.5, color: C.n700 }}>Tipo de cambio BCCR configurado en Configuración › Facturación › Monedas.</span>
          </Tarjeta>
          <Tarjeta titulo={`Hoy · ${hoy.length} canje${hoy.length === 1 ? '' : 's'}`} style={{ gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {MONEDAS.map(m => <div key={m.codigo} style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '10px 12px' }}>
                <div style={{ fontSize: 11.5, color: C.n700 }}>{m.codigo}</div>
                <div style={{ fontSize: 12.5, marginTop: 4 }}>Recibido <b style={{ fontWeight: 600 }}>{fmtMon(total(m.codigo, 'importeOrigen', 'monedaOrigen'), m.codigo)}</b></div>
                <div style={{ fontSize: 12.5 }}>Entregado <b style={{ fontWeight: 600 }}>{fmtMon(total(m.codigo, 'entregado', 'monedaDestino'), m.codigo)}</b></div>
              </div>)}
            </div>
          </Tarjeta>
        </div>
      </div>
      <Tarjeta titulo="Historial de canjes">
        <Tabla headers={['Fecha', 'Cliente', 'Entrega', 'Tasa', 'Recibe', 'Comisión', 'Usuario', '']} alinearDerecha={[2, 3, 4, 5]} minWidth={900}>
          {pag.visibles.length === 0 && <FilaVacia cols={8} texto={hayFiltros ? 'Ningún canje coincide con los filtros.' : 'Todavía no hay canjes registrados.'} />}
          {pag.visibles.map(c => (
            <Fila key={c.id}>
              <Celda style={{ whiteSpace: 'nowrap' }}>{fmtF(c.fecha.slice(0, 10))} <span style={{ color: C.n700 }}>{c.fecha.slice(11, 16)}</span></Celda>
              <Celda>{c.perfilId ? <Link href={`/hospedaje/perfiles?id=${c.perfilId}`} style={{ color: C.n900 }}>{c.nombre}</Link> : c.nombre || '—'}{c.habitacion && <span style={{ color: C.n700 }}> · Hab. {c.habitacion}</span>}</Celda>
              <Celda derecha style={{ whiteSpace: 'nowrap' }}>{fmtMon(c.importeOrigen, c.monedaOrigen)}</Celda>
              <Celda derecha style={{ whiteSpace: 'nowrap' }}>{fmtN(c.tasa, c.tasa < 1 ? 6 : 2)}</Celda>
              <Celda derecha style={{ whiteSpace: 'nowrap' }}><b style={{ fontWeight: 600 }}>{fmtMon(c.entregado, c.monedaDestino)}</b></Celda>
              <Celda derecha>{c.comision ? fmtMon(c.comision, c.monedaDestino) : '—'}</Celda>
              <Celda muted>{c.usuario}</Celda>
              <Celda derecha><BotonIcono label={`Ver recibo ${c.numero}`} onClick={() => setRecibo(c.id)}><IcDoc /></BotonIcono></Celda>
            </Fila>
          ))}
        </Tabla>
        {filas.length > 10 && <Paginacion pagina={pag.pagina} total={pag.total} onChange={pag.setPagina} />}
      </Tarjeta>
      {sel && <VisorCanje canje={sel} onClose={() => setRecibo(null)} />}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </PaginaFact>
  );
}

// ── Canje rápido (siempre visible) ──────────────────────────────────────────
function CanjeRapido({ onListo }: { onListo: (id: string) => void }) {
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
  const chips = (val: Mon, set: (m: Mon) => void, otra: Mon, label: string) => (
    <div role="radiogroup" aria-label={label} style={{ display: 'flex', gap: 6 }}>
      {MONEDAS.map(m => {
        const on = m.codigo === val;
        return <button key={m.codigo} type="button" role="radio" aria-checked={on} onClick={() => { if (m.codigo === otra) { set(m.codigo); (set === setMo ? setMd : setMo)(val); } else set(m.codigo); }}
          style={{ height: 30, padding: '0 12px', borderRadius: 999, border: `1px solid ${on ? C.brand : C.n500}`, background: on ? C.brand : C.n000, color: on ? '#fff' : C.n900, fontSize: 12.5, fontFamily: FONT, cursor: 'pointer' }}>{m.simbolo} {m.codigo}</button>;
      })}
    </div>
  );
  const grande = (v: string) => <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums' }}>{v}</span>;
  return (
    <section aria-label="Canje rápido" style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Nuevo canje</h2>
        <span style={{ fontSize: 11.5, color: turno ? '#0E7A57' : '#B45309' }}>{turno ? `Caja · turno de ${h.sesion.split(' ')[0]}` : 'Sin turno abierto'}</span>
      </div>
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
            <Button variant="secondary" style={{ color: C.brand, borderColor: C.brandBd }} onClick={() => setBuscar(true)}>Buscar perfil</Button>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, color: C.n700 }}>El cliente entrega</span>{chips(mo, setMo, md, 'Moneda que entrega')}</div>
        <button type="button" aria-label="Invertir monedas" title="Invertir" onClick={() => { setMo(md); setMd(mo); }} style={{ width: 34, height: 34, borderRadius: '50%', border: `1px solid ${C.n500}`, background: C.n000, cursor: 'pointer', fontSize: 15, marginTop: 18 }}>⇄</button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, color: C.n700 }}>El cliente recibe</span>{chips(md, setMd, mo, 'Moneda que recibe')}</div>
      </div>
      <div role="radiogroup" aria-label="Calcular por" style={{ display: 'inline-flex', alignSelf: 'flex-start', border: `1px solid ${C.n500}`, borderRadius: radius.control, overflow: 'hidden' }}>
        {([['entrega', 'Monto que entrega'], ['recibe', 'Monto que quiere recibir']] as const).map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={modo === v} onClick={() => { setModo(v); setMonto(''); }}
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
          <span style={{ color: C.n700 }}>Comisión</span>
          <select value={comId} onChange={e => setComision(e.target.value)} aria-label="Comisión" className="suite-campo" style={{ height: 28, border: `1px solid ${C.n500}`, borderRadius: 6, fontSize: 12, fontFamily: FONT, background: C.n000 }}>
            {COMISIONES_CANJE.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {comision === null && comId !== 'sin' && <span style={{ color: C.n700 }}>(sugerida: {huesped ? 'huésped' : 'no huésped'})</span>}
        </div>
      </div>
      <Campo label="Observaciones internas (opcional)"><Input value={obs} onChange={setObs} placeholder="No aparecen en el recibo" /></Campo>
      {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={limpiar}>Limpiar</Button>
        <Button onClick={registrar} disabled={!importe}>Registrar y emitir recibo</Button>
      </div>
      {buscar && <BuscarPerfil onClose={() => setBuscar(false)} onElegir={p => { setElegido(p); setBuscar(false); setQ(''); setNombre(''); }} />}
    </section>
  );
}
