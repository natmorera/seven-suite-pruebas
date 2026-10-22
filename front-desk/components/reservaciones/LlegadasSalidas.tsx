'use client';
// Listado de llegadas / salidas: solo lectura, filtrado por fecha (hoy por
// defecto), con notas de la reserva y exportación a Excel / PDF.
import { useMemo, useState } from 'react';
import { C, FONT } from '@/components/suite/tokens';
import { Celda, Fila, FilaVacia, Popover, Tabla } from '@/components/configuracion/kit';
import { FechaBoton, FiltroChecks, exportarCSV, usePrint } from '@/components/hotel/ui';
import { useHotel } from '@/components/hotel/store';
import { CheckFila, CheckTodos, useSeleccion } from '@/components/layout/Pantalla';
import { Button } from '@/components/suite/ui';
import { HOY, NACIONALIDADES, REGIMENES, TARIFAS_NOMBRES, TIPOS, fmtF, type Reserva } from '@/components/hotel/datos';
import { USOS, numeroDe, usoDe } from '@/components/hotel/reservas';
import { Exportar, HojaSistema, PaginaFact, TablaReporte, Tarjeta, tdR } from '@/components/facturacion/comun';
import { nombreTipo } from './comun';

const TABS = ['Llegadas', 'Salidas'] as const;
const VIVAS: Reserva['estado'][] = ['Solicitada', 'Confirmada', 'In-House', 'Completada'];
const corta = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(2, 4)}`;

export default function LlegadasSalidas() {
  const h = useHotel();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Llegadas');
  const [entrada, setEntrada] = useState(HOY);
  const [salida, setSalida] = useState(HOY);
  const [tarifas, setTarifas] = useState<string[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [usos, setUsos] = useState<string[]>([]);
  const [regimenes, setRegimenes] = useState<string[]>([]);
  const [pax, setPax] = useState<string[]>([]);
  const [nacs, setNacs] = useState<string[]>([]);
  const { imprimir, portal } = usePrint();
  const s = useSeleccion();
  const filas = useMemo(() => h.reservas.filter(r => VIVAS.includes(r.estado) && (tab === 'Llegadas' ? r.entrada === entrada : r.salida === salida)
    && (!tarifas.length || tarifas.includes(r.tarifa)) && (!tipos.length || tipos.includes(r.tipo)) && (!usos.length || usos.includes(usoDe(r)))
    && (!regimenes.length || regimenes.includes(r.regimen)) && (!pax.length || pax.includes(String(Math.min(4, r.adultos + r.ninos)))) && (!nacs.length || nacs.includes(r.nacionalidad)))
    .sort((a, b) => a.numero.localeCompare(b.numero, 'es', { numeric: true })), [h.reservas, tab, entrada, salida, tarifas, tipos, usos, regimenes, pax, nacs]);
  const nombre = (r: Reserva) => h.perfiles.find(p => p.id === r.perfilId)?.nombre ?? r.nombre;
  const headers = ['Número', 'Tarifa', 'Nombre', 'Uso', 'Habitación', 'Régimen', 'Cant.', 'Adultos', 'Niños', 'Nacionalidad', 'Entrada', 'Salida', 'Notas'];
  const criterio = `${tab === 'Llegadas' ? `Entrada: ${fmtF(entrada)}` : `Salida: ${fmtF(salida)}`}${tarifas.length ? ` · Tarifa: ${tarifas.join(', ')}` : ''}${tipos.length ? ` · Habitación: ${tipos.join(', ')}` : ''}${regimenes.length ? ` · Régimen: ${regimenes.join(', ')}` : ''}`;
  const csv = (xs: Reserva[] = filas) => exportarCSV(tab === 'Llegadas' ? 'listado-llegadas' : 'listado-salidas', headers,
    xs.map(r => [numeroDe(r), r.tarifa, nombre(r), nombreTipo(r.tipo), r.habitacion, r.regimen, 1, r.adultos, r.ninos, r.nacionalidad, fmtF(r.entrada), fmtF(r.salida), [r.observacionesInternas, r.observaciones].filter(Boolean).join(' | ')]));
  const pdf = () => imprimir(
    <HojaSistema titulo={`Listado de ${tab.toLowerCase()}`} subtitulo={tab === 'Llegadas' ? 'Reservas con llegada programada' : 'Reservas con salida programada'} criterio={criterio}>
      <TablaReporte headers={headers} derecha={[6, 7, 8]}>
        {filas.map(r => <tr key={r.id}><td style={tdR(false, { fontWeight: 600 })}>{numeroDe(r)}</td><td style={tdR()}>{r.tarifa}</td><td style={tdR()}>{nombre(r)}</td><td style={tdR()}>{nombreTipo(r.tipo)}</td><td style={tdR()}>{r.habitacion || '—'}</td><td style={tdR()}>{r.regimen}</td>
          <td style={tdR(true)}>1</td><td style={tdR(true)}>{r.adultos}</td><td style={tdR(true)}>{r.ninos}</td><td style={tdR()}>{r.nacionalidad}</td><td style={tdR()}>{corta(r.entrada)}</td><td style={tdR()}>{corta(r.salida)}</td>
          <td style={tdR()}>{[r.observacionesInternas, r.observaciones].filter(Boolean).join(' · ') || '—'}</td></tr>)}
      </TablaReporte>
      <p style={{ marginTop: 10, fontSize: 11 }}>Total: {filas.length} reservas · {filas.reduce((s, r) => s + r.adultos + r.ninos, 0)} huéspedes</p>
    </HojaSistema>);
  return (
    <PaginaFact titulo="Listado de llegadas / salidas" acciones={<Exportar onCSV={() => csv()} onPDF={pdf} disabled={!filas.length} titulo={`Listado de ${tab.toLowerCase()}`} criterio={criterio} />}
      tabs={{ items: TABS, activo: tab, onChange: t => { setTab(t); s.limpiar(); } }}
      filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>{filas.length} {tab.toLowerCase()} · {filas.reduce((n, r) => n + r.adultos + r.ninos, 0)} huéspedes</span>}
      seleccion={{ n: s.n, onLimpiar: s.limpiar, etiqueta: s.n === 1 ? 'seleccionada' : 'seleccionadas', acciones: <Button variant="secondary" onClick={() => csv(filas.filter(r => s.tiene(r.id)))}>Exportar selección</Button> }}
      filtros={<>
          {tab === 'Llegadas' ? <FechaBoton label="Entrada" value={entrada} onChange={v => setEntrada(v || HOY)} /> : <FechaBoton label="Salida" value={salida} onChange={v => setSalida(v || HOY)} />}
          <FiltroChecks label="Tarifa" value={tarifas} onChange={setTarifas} opciones={TARIFAS_NOMBRES.map(t => ({ value: t, label: t }))} />
          <FiltroChecks label="Habitación" value={tipos} onChange={setTipos} opciones={TIPOS.map(t => ({ value: t.id, label: t.nombre }))} />
          <FiltroChecks label="Uso" value={usos} onChange={setUsos} opciones={USOS.map(u => ({ value: u.id, label: `${u.id} - ${u.label}` }))} />
          <FiltroChecks label="Régimen" value={regimenes} onChange={setRegimenes} opciones={Object.entries(REGIMENES).map(([k, v]) => ({ value: k, label: `${k} - ${v}` }))} />
          <FiltroChecks label="Pax" value={pax} onChange={setPax} opciones={[1, 2, 3, 4].map(n => ({ value: String(n), label: n === 4 ? '4 o más' : String(n) }))} ancho={160} />
          <FiltroChecks label="Nacionalidad" value={nacs} onChange={setNacs} buscar opciones={Object.entries(NACIONALIDADES).map(([k, v]) => ({ value: k, label: v }))} />
      </>}>
      <Tarjeta>
        <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
          <Tabla headers={[<CheckTodos key="t" s={s} ids={filas.map(r => r.id)} />, ...headers]} alinearDerecha={[7, 8, 9]} minWidth={1040}>
            {!filas.length && <FilaVacia cols={headers.length + 1} texto={`No hay ${tab.toLowerCase()} para la fecha seleccionada.`} />}
            {filas.map(r => (
              <Fila key={r.id}>
                <Celda style={{ width: 28 }}><CheckFila s={s} id={r.id} label={`Seleccionar ${numeroDe(r)}`} /></Celda>
                <Celda style={{ fontWeight: 500 }}>{numeroDe(r)}</Celda><Celda>{r.tarifa}</Celda><Celda>{nombre(r)}</Celda><Celda>{nombreTipo(r.tipo)}</Celda>
                <Celda>{r.habitacion || <i style={{ color: C.n700 }}>Sin asignar</i>}</Celda><Celda>{r.regimen}</Celda><Celda derecha>1</Celda><Celda derecha>{r.adultos}</Celda><Celda derecha>{r.ninos}</Celda>
                <Celda>{r.nacionalidad}</Celda><Celda>{corta(r.entrada)}</Celda><Celda>{corta(r.salida)}</Celda>
                <Celda style={{ width: 56, textAlign: 'center' }}><VerNotas r={r} /></Celda>
              </Fila>
            ))}
          </Tabla>
        </div>
      </Tarjeta>
      {portal}
    </PaginaFact>
  );
}

/** Notas de la reserva como ícono (punto azul = tiene notas); el contenido se abre en un popover. */
function VerNotas({ r }: { r: Reserva }) {
  const [open, setOpen] = useState(false);
  const hay = !!(r.observacionesInternas || r.observaciones || r.condiciones.length);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Ver notas" title={hay ? 'Ver notas' : 'Sin notas'} disabled={!hay}
        style={{ position: 'relative', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 6, background: open ? C.brandBg : 'none', padding: 0, color: hay ? C.brand : C.n500, cursor: hay ? 'pointer' : 'default', fontFamily: FONT }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 4h14v12l-4 4H5z M15 20v-4h4 M8 9h8 M8 13h5" /></svg>
        {hay && <i style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: C.brand }} />}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} width={300} align="right">
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontWeight: 600 }}>Notas</b><button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.n700 }}>✕</button></div>
          <div><span style={{ display: 'block', fontSize: 11, color: C.n700 }}>Nota interna</span>{r.observacionesInternas || 'Sin nota interna.'}</div>
          <div><span style={{ display: 'block', fontSize: 11, color: C.n700 }}>Nota reserva</span>{r.observaciones || 'Sin nota de reserva.'}{r.condiciones.length > 0 && <span style={{ display: 'block', marginTop: 4, color: C.n700 }}>Condiciones: {r.condiciones.join(', ')}</span>}</div>
        </div>
      </Popover>
    </span>
  );
}
