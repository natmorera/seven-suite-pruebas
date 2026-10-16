'use client';
// Ama de llaves → Estado de las habitaciones (escritorio).
// Tabla de todas las habitaciones con su disponibilidad (Libre / Ocupada / F/O),
// pax, estado de limpieza (Sucia / Limpia / No requiere, excluyentes) y
// discrepancias. Todo se guarda al instante: no hay botón Guardar.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Modal, Toast } from '@/components/suite/ui';
import { CheckFila, CheckTodos, Pantalla, useSeleccion } from '@/components/layout/Pantalla';
import { Buscador } from '@/components/configuracion/kit';
import { useHotel } from '@/components/hotel/store';
import { CAMARERAS, TIPOS, estadoLimpieza, type EstadoLimpieza } from '@/components/hotel/datos';
import { Alerta, BotonExportar, FiltroChecks, HojaReporte, MenuBoton, TablaImpresa, exportarCSV, usePrint } from '@/components/hotel/ui';
import {
  Adjuntos, BadgeDisp, BotonesLimpieza, EstadoCrono, COLOR_DISP, Contador, DISPONIBILIDADES, IcMovil, LIMPIEZA, Tarjeta, TextoEnLinea, disponibilidad, infoLimpieza, paxDe, td, th,
} from './comun';

export default function EstadoHabitaciones() {
  const h = useHotel();
  const sp = useSearchParams();
  const [q, setQ] = useState('');
  const [limp, setLimp] = useState<string[]>(() => (sp.get('limpieza') ? [sp.get('limpieza')!] : []));
  const [disp, setDisp] = useState<string[]>([]);
  const [cams, setCams] = useState<string[]>([]);
  const [confirmar, setConfirmar] = useState(false);
  const [adjuntos, setAdjuntos] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const s_ = useSeleccion();
  const { imprimir, portal } = usePrint();

  const filas = useMemo(() => h.habitaciones.map(x => ({ x, disp: disponibilidad(x), limp: estadoLimpieza(x), pax: paxDe(x, h.reservas) }))
    .filter(f => (!q.trim() || f.x.numero.includes(q.trim())) && (!limp.length || limp.includes(f.limp)) && (!disp.length || disp.includes(f.disp)) && (!cams.length || cams.includes(f.x.camarera ?? '')))
    .sort((a, b) => a.x.numero.localeCompare(b.x.numero, 'es', { numeric: true })), [h.habitaciones, h.reservas, q, limp, disp, cams]);
  const porLimpiar = filas.filter(f => f.limp !== 'limpia');
  const cuenta = (e: EstadoLimpieza) => h.habitaciones.filter(x => estadoLimpieza(x) === e).length;
  const hayFiltros = q || limp.length || disp.length || cams.length;
  const tipoDe = (t: string) => TIPOS.find(x => x.id === t)?.codigo ?? t;

  const HEAD = ['Hab', 'Tipo', 'Estado', 'Pax', 'Estado de limpieza', 'Tiempo (min)', 'Discrepancias', 'Adjuntos', 'Camarera'];
  const datos = () => filas.map(f => [f.x.numero, tipoDe(f.x.tipo), f.disp, f.pax || '-', infoLimpieza(f.limp).label, f.x.limpieza ? Math.round(f.x.limpieza.segundos / 60) : '', f.x.discrepancia || '', f.x.adjuntos?.length || '', f.x.camarera || '']);
  const criterio = [q && `Habitación: ${q}`, limp.length && `Limpieza: ${limp.map(l => infoLimpieza(l as EstadoLimpieza).label).join(', ')}`, disp.length && `Disponibilidad: ${disp.join(', ')}`, cams.length && `Camarera: ${cams.join(', ')}`].filter(Boolean).join(' · ') || 'Todas las habitaciones';
  const cambiar = (nums: string[], e: EstadoLimpieza) => { h.setLimpieza(nums, e); };
  const alternarLimp = (e: EstadoLimpieza) => setLimp(l => (l.length === 1 && l[0] === e ? [] : [e]));

  return (
    <Pantalla titulo="Estado de las habitaciones"
      acciones={<>
        <Link href="/ama-de-llaves/estado-de-habitaciones/camarera" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.brand, textDecoration: 'none', fontFamily: FONT, marginRight: 4 }}><IcMovil /> Vista de camarera</Link>
        <BotonExportar titulo="Estado de las habitaciones" criterio={criterio} disabled={!filas.length} onCSV={() => exportarCSV('estado-habitaciones', HEAD, datos())}
          onPDF={() => imprimir(<HojaReporte titulo="Estado de las habitaciones" filtros={criterio}><TablaImpresa headers={HEAD} filas={datos()} /></HojaReporte>)} />
        <Button disabled={!porLimpiar.length} onClick={() => setConfirmar(true)}>Limpiar todas las habitaciones</Button>
      </>}
      filtros={<>
        <Buscador value={q} onChange={v => setQ(v.replace(/\D/g, ''))} placeholder="Buscar habitación" width={200} />
        <FiltroChecks label="Estado de limpieza" value={limp} onChange={setLimp} opciones={LIMPIEZA.map(o => ({ value: o.id, label: <span><span style={{ color: o.color }}>●</span> {o.label}</span> }))} />
        <FiltroChecks label="Estado de disponibilidad" value={disp} onChange={setDisp} opciones={DISPONIBILIDADES.map(d => ({ value: d, label: <span><span style={{ color: COLOR_DISP[d] }}>●</span> {d}</span> }))} />
        <FiltroChecks label="Camarera" value={cams} onChange={setCams} opciones={[...CAMARERAS.map(c => ({ value: c, label: c })), { value: '', label: 'Sin asignar' }]} ancho={240} />
        {hayFiltros ? <Button variant="ghost" onClick={() => { setQ(''); setLimp([]); setDisp([]); setCams([]); }}>Limpiar filtros</Button> : null}
      </>}
      filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>{filas.length} habitaciones · se guarda automáticamente</span>}
      seleccion={{ n: s_.n, onLimpiar: s_.limpiar, etiqueta: s_.n === 1 ? 'habitación' : 'habitaciones', acciones: <>
        {LIMPIEZA.map(o => <Button key={o.id} variant="secondary" onClick={() => { cambiar(s_.sel, o.id); setToast(`${s_.n} habitaciones marcadas como ${o.label.toLowerCase()}`); s_.limpiar(); }}>Marcar {o.label.toLowerCase()}</Button>)}
        <MenuBoton label="Asignar camarera" ancho={240} opciones={CAMARERAS.map(c => ({ label: c, onClick: () => { h.asignarCamarera(s_.sel, c); setToast(`${s_.n} habitaciones asignadas a ${c}`); s_.limpiar(); } }))} />
      </> }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {LIMPIEZA.map(o => <Contador key={o.id} valor={cuenta(o.id)} label={o.corto} color={o.color} activo={limp.length === 1 && limp[0] === o.id} onClick={() => alternarLimp(o.id)} />)}
        <Contador valor={h.habitaciones.filter(x => x.estado === 'bloqueada').length} label="Fuera de orden (F/O)" color={COLOR_DISP['F/O']} activo={disp.length === 1 && disp[0] === 'F/O'} onClick={() => setDisp(d => (d.length === 1 && d[0] === 'F/O' ? [] : ['F/O']))} />
        <Contador valor={h.habitaciones.filter(x => x.discrepancia).length} label="Con discrepancia" color="#7C5CDB" />
      </div>
      <Tarjeta style={{ padding: '6px 16px 12px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead><tr>
              <th style={{ ...th, width: 28 }}><CheckTodos s={s_} ids={filas.map(f => f.x.numero)} /></th>
              {['Hab', 'Estado', 'Pax', 'Estado de limpieza', 'Tiempo de limpieza', 'Discrepancias', 'Camarera'].map(c => <th key={c} style={th}>{c}</th>)}
            </tr></thead>
            <tbody>
              {filas.length === 0 && <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: C.n700, padding: 30 }}>Ninguna habitación coincide con la búsqueda y los filtros.</td></tr>}
              {filas.map(({ x, disp: d, limp: l, pax }) => (
                <tr key={x.numero} className="suite-fila" style={{ background: s_.tiene(x.numero) ? C.brandBg : undefined }}>
                  <td style={td}><CheckFila s={s_} id={x.numero} label={`Seleccionar habitación ${x.numero}`} /></td>
                  <td style={{ ...td, width: 90 }}><b style={{ fontWeight: 600 }}>{x.numero}</b> <span style={{ color: C.n700, fontSize: 11 }}>{tipoDe(x.tipo)}</span></td>
                  <td style={{ ...td, width: 100 }} title={d === 'F/O' ? x.motivoBloqueo : undefined}><BadgeDisp d={d} /></td>
                  <td style={{ ...td, width: 50, color: pax ? C.n900 : C.n700 }}>{pax || '-'}</td>
                  <td style={{ ...td, width: 300 }}><BotonesLimpieza hab={x.numero} valor={l} onChange={e => cambiar([x.numero], e)} /></td>
                  <td style={{ ...td, width: 150 }}><EstadoCrono c={x.limpieza} /></td>
                  <td style={{ ...td, minWidth: 240 }}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><TextoEnLinea valor={x.discrepancia ?? ''} label={`Discrepancia ${x.numero}`} placeholder="Agregar discrepancia" onGuardar={v => { h.setHab(x.numero, { discrepancia: v }); setToast(`Discrepancia de la ${x.numero} guardada`); }} />
                    <button type="button" onClick={() => setAdjuntos(x.numero)} aria-label={`Adjuntos de la ${x.numero}`} title="Fotos y archivos de la discrepancia"
                      style={{ border: 'none', background: x.adjuntos?.length ? C.brandBg : 'none', color: x.adjuntos?.length ? C.brand : C.n700, borderRadius: radius.pill, padding: '3px 8px', fontSize: 11.5, cursor: 'pointer', fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M21 11.5 12.5 20a5 5 0 0 1-7-7L14 4.5a3.5 3.5 0 0 1 5 5L10.5 18a2 2 0 0 1-3-3L15 7.5" /></svg>{x.adjuntos?.length || ''}
                    </button></span></td>
                  <td style={{ ...td, width: 170 }}>
                    <select value={x.camarera ?? ''} onChange={e => h.asignarCamarera([x.numero], e.target.value)} aria-label={`Camarera ${x.numero}`}
                      style={{ border: 'none', background: 'transparent', fontSize: 12, fontFamily: FONT, color: x.camarera ? C.n900 : C.n700, cursor: 'pointer', outline: 'none', width: 160 }}>
                      <option value="">Sin asignar</option>{CAMARERAS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
      <Alerta open={confirmar} titulo="¿Estás seguro?" confirmar="Sí, limpiar todas" onClose={() => setConfirmar(false)}
        onConfirm={() => { cambiar(porLimpiar.map(f => f.x.numero), 'limpia'); setToast(`${porLimpiar.length} habitaciones marcadas como limpias`); setConfirmar(false); }}>
        Se marcarán {porLimpiar.length} habitaciones como limpias.
      </Alerta>
      {adjuntos && (() => { const x = h.habitaciones.find(y => y.numero === adjuntos)!; return (
        <Modal open title={`Discrepancia · Habitación ${x.numero}`} onClose={() => setAdjuntos(null)} width={520} footer={<Button onClick={() => setAdjuntos(null)}>Listo</Button>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12.5 }}>
            <span><span style={{ color: C.n700 }}>Discrepancia: </span>{x.discrepancia || 'Sin texto'}</span>
            {x.obsLimpieza && <span><span style={{ color: C.n700 }}>Observaciones de la camarera: </span>{x.obsLimpieza}</span>}
            <Adjuntos hab={x} />
          </div>
        </Modal>); })()}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </Pantalla>
  );
}
