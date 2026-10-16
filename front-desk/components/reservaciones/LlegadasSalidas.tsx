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
  const headers = ['Número', 'Tarifa', 'Nombre', 'Habitación', 'Uso', 'Régimen', 'Cant.', 'Pax', 'Nacionalidad', 'Entrada', 'Salida', tab === 'Llegadas' ? 'Notas' : 'Observaciones'];
  const criterio = `${tab === 'Llegadas' ? `Entrada: ${fmtF(entrada)}` : `Salida: ${fmtF(salida)}`}${tarifas.length ? ` · Tarifa: ${tarifas.join(', ')}` : ''}${tipos.length ? ` · Habitación: ${tipos.join(', ')}` : ''}${regimenes.length ? ` · Régimen: ${regimenes.join(', ')}` : ''}`;
  const csv = (xs: Reserva[] = filas) => exportarCSV(tab === 'Llegadas' ? 'listado-llegadas' : 'listado-salidas', headers,
    xs.map(r => [numeroDe(r), r.tarifa, nombre(r), nombreTipo(r.tipo), r.habitacion, r.regimen, 1, `${r.adultos} / ${r.ninos}`, r.nacionalidad, fmtF(r.entrada), fmtF(r.salida), tab === 'Llegadas' ? [r.observacionesInternas, r.observaciones].filter(Boolean).join(' | ') : r.observaciones]));
  const pdf = () => imprimir(
    <HojaSistema titulo={`Listado de ${tab.toLowerCase()}`} subtitulo={tab === 'Llegadas' ? 'Reservas con llegada programada' : 'Reservas con salida programada'} criterio={criterio}>
      <TablaReporte headers={headers} derecha={[6, 7]}>
        {filas.map(r => <tr key={r.id}><td style={tdR(false, { fontWeight: 600 })}>{numeroDe(r)}</td><td style={tdR()}>{r.tarifa}</td><td style={tdR()}>{nombre(r)}</td><td style={tdR()}>{nombreTipo(r.tipo)}</td><td style={tdR()}>{r.habitacion || '—'}</td><td style={tdR()}>{r.regimen}</td>
          <td style={tdR(true)}>1</td><td style={tdR(true)}>{r.adultos} / {r.ninos}</td><td style={tdR()}>{r.nacionalidad}</td><td style={tdR()}>{corta(r.entrada)}</td><td style={tdR()}>{corta(r.salida)}</td>
          <td style={tdR()}>{tab === 'Llegadas' ? [r.observacionesInternas, r.observaciones].filter(Boolean).join(' · ') || '—' : r.observaciones || '—'}</td></tr>)}
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
          <Tabla headers={[<CheckTodos key="t" s={s} ids={filas.map(r => r.id)} />, ...headers]} alinearDerecha={[7, 8]} minWidth={1040}>
            {!filas.length && <FilaVacia cols={headers.length + 1} texto={`No hay ${tab.toLowerCase()} para la fecha seleccionada.`} />}
            {filas.map(r => (
              <Fila key={r.id}>
                <Celda style={{ width: 28 }}><CheckFila s={s} id={r.id} label={`Seleccionar ${numeroDe(r)}`} /></Celda>
                <Celda style={{ fontWeight: 500 }}>{numeroDe(r)}</Celda><Celda>{r.tarifa}</Celda><Celda>{nombre(r)}</Celda><Celda>{nombreTipo(r.tipo)}</Celda>
                <Celda>{r.habitacion || <i style={{ color: C.n700 }}>Sin asignar</i>}</Celda><Celda>{r.regimen}</Celda><Celda derecha>1</Celda><Celda derecha>{r.adultos} / {r.ninos}</Celda>
                <Celda>{r.nacionalidad}</Celda><Celda>{corta(r.entrada)}</Celda><Celda>{corta(r.salida)}</Celda>
                <Celda>{tab === 'Llegadas' ? <VerNotas r={r} /> : <span style={{ color: r.observaciones ? C.n900 : C.n700 }}>{r.observaciones || '—'}</span>}</Celda>
              </Fila>
            ))}
          </Tabla>
        </div>
      </Tarjeta>
      {portal}
    </PaginaFact>
  );
}

function VerNotas({ r }: { r: Reserva }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ border: 'none', background: 'none', padding: 0, color: C.brand, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT, fontSize: 12 }}>Ver notas</button>
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
