'use client';
// Ama de llaves → Cambio de sábanas.
// Habitaciones ocupadas con la fecha del último cambio de ropa de cama y el
// próximo según la política del hotel (cada N noches). «Toca hoy» y
// «Atrasado» son la lista de trabajo del día; al marcar «Cambiado» se registra
// la fecha hotelera. Si el huésped sale antes del próximo cambio, no aplica.
import { useMemo, useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Toast } from '@/components/suite/ui';
import { CheckFila, CheckTodos, Pantalla, useSeleccion } from '@/components/layout/Pantalla';
import { Buscador, norm } from '@/components/configuracion/kit';
import { useHotel } from '@/components/hotel/store';
import { CAMARERAS, HOY, fmtF, noches, sumarDias } from '@/components/hotel/datos';
import { BotonExportar, FiltroChecks, HojaReporte, TablaImpresa, exportarCSV, usePrint } from '@/components/hotel/ui';
import { Contador, Tarjeta, td, th } from './comun';

type EstadoSab = 'Atrasado' | 'Toca hoy' | 'Al día' | 'Sale antes' | 'Sale hoy';
const COLOR: Record<EstadoSab, string> = { Atrasado: '#C62828', 'Toca hoy': '#B45309', 'Al día': '#2E7D32', 'Sale antes': '#616161', 'Sale hoy': '#213C89' };
const ESTADOS: EstadoSab[] = ['Atrasado', 'Toca hoy', 'Al día', 'Sale antes', 'Sale hoy'];
const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());

export default function CambioSabanas() {
  const h = useHotel();
  const [cada, setCada] = useState(3);
  const [q, setQ] = useState('');
  const [estados, setEstados] = useState<string[]>([]);
  const [cams, setCams] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const s_ = useSeleccion();
  const { imprimir, portal } = usePrint();

  const base = useMemo(() => h.habitaciones.filter(x => x.reservaId && (x.estado === 'ocupada' || x.estado === 'checkout')).map(x => {
    const r = h.reservas.find(y => y.id === x.reservaId)!;
    const ultimo = x.sabanas && x.sabanas >= r.entrada ? x.sabanas : r.entrada;
    const proximo = sumarDias(ultimo, cada);
    const estado: EstadoSab = r.salida <= HOY ? 'Sale hoy' : ultimo === HOY ? 'Al día' : r.salida <= proximo && proximo >= HOY ? 'Sale antes' : proximo < HOY ? 'Atrasado' : proximo === HOY ? 'Toca hoy' : 'Al día';
    return { x, r, ultimo, proximo, estado, dias: noches(ultimo, HOY) };
  }), [h.habitaciones, h.reservas, cada]);
  const filas = base.filter(f => (!q.trim() || f.x.numero.includes(q.trim()) || norm(f.r.nombre).includes(norm(q))) && (!estados.length || estados.includes(f.estado)) && (!cams.length || cams.includes(f.x.camarera ?? '')))
    .sort((a, b) => ESTADOS.indexOf(a.estado) - ESTADOS.indexOf(b.estado) || a.x.numero.localeCompare(b.x.numero, 'es', { numeric: true }));
  const n = (e: EstadoSab) => base.filter(f => f.estado === e).length;
  const marcar = (nums: string[]) => { h.cambiarSabanas(nums); setToast(nums.length === 1 ? `Cambio de sábanas registrado en la ${nums[0]}` : `Cambio de sábanas registrado en ${nums.length} habitaciones`); s_.limpiar(); };
  const alternar = (e: EstadoSab) => setEstados(s => (s.length === 1 && s[0] === e ? [] : [e]));

  const HEAD = ['Hab', 'Huésped', 'Entrada', 'Salida', 'Último cambio', 'Próximo cambio', 'Estado', 'Camarera'];
  const datos = () => filas.map(f => [f.x.numero, titulo(f.r.nombre), fmtF(f.r.entrada), fmtF(f.r.salida), fmtF(f.ultimo), f.estado === 'Sale antes' || f.estado === 'Sale hoy' ? '-' : fmtF(f.proximo), f.estado, f.x.camarera ?? '']);
  const criterio = [`Política: cada ${cada} noches`, q && `Búsqueda: ${q}`, estados.length && `Estado: ${estados.join(', ')}`, cams.length && `Camarera: ${cams.join(', ')}`].filter(Boolean).join(' · ');

  return (
    <Pantalla titulo="Cambio de sábanas"
      acciones={<>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.n700, fontFamily: FONT }}>Cambiar cada
          <select value={cada} onChange={e => setCada(Number(e.target.value))} aria-label="Frecuencia de cambio" className="suite-campo"
            style={{ height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 6px', fontSize: 12, fontFamily: FONT, background: C.n000 }}>
            {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{d} {d === 1 ? 'noche' : 'noches'}</option>)}
          </select>
        </label>
        <BotonExportar titulo="Cambio de sábanas" criterio={criterio} disabled={!filas.length} onCSV={() => exportarCSV('cambio-sabanas', HEAD, datos())}
          onPDF={() => imprimir(<HojaReporte titulo="Cambio de sábanas" filtros={criterio}><TablaImpresa headers={HEAD} filas={datos()} /></HojaReporte>)} />
      </>}
      filtros={<>
        <Buscador value={q} onChange={setQ} placeholder="Buscar habitación o huésped" width={240} />
        <FiltroChecks label="Estado" value={estados} onChange={setEstados} opciones={ESTADOS.map(e => ({ value: e, label: <span><span style={{ color: COLOR[e] }}>●</span> {e}</span> }))} />
        <FiltroChecks label="Camarera" value={cams} onChange={setCams} opciones={CAMARERAS.map(c => ({ value: c, label: c }))} ancho={240} />
        {(q || estados.length || cams.length) ? <Button variant="ghost" onClick={() => { setQ(''); setEstados([]); setCams([]); }}>Limpiar filtros</Button> : null}
      </>}
      filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>{filas.length} habitaciones ocupadas</span>}
      seleccion={{ n: s_.n, onLimpiar: s_.limpiar, etiqueta: s_.n === 1 ? 'habitación' : 'habitaciones', acciones: <Button onClick={() => marcar(s_.sel)}>Marcar cambiado</Button> }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {(['Atrasado', 'Toca hoy', 'Al día', 'Sale antes', 'Sale hoy'] as EstadoSab[]).map(e => <Contador key={e} valor={n(e)} label={e} color={COLOR[e]} activo={estados.length === 1 && estados[0] === e} onClick={() => alternar(e)} />)}
      </div>
      <Tarjeta style={{ padding: '6px 16px 12px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <thead><tr><th style={{ ...th, width: 28 }}><CheckTodos s={s_} ids={filas.map(f => f.x.numero)} /></th>{[...HEAD, ''].map((c, i) => <th key={i} style={th}>{c}</th>)}</tr></thead>
            <tbody>
              {filas.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: C.n700, padding: 30 }}>Ninguna habitación coincide con la búsqueda y los filtros.</td></tr>}
              {filas.map(f => {
                const pendiente = f.estado === 'Atrasado' || f.estado === 'Toca hoy';
                return (
                  <tr key={f.x.numero} className="suite-fila" style={{ background: s_.tiene(f.x.numero) ? C.brandBg : undefined }}>
                    <td style={td}><CheckFila s={s_} id={f.x.numero} label={`Seleccionar habitación ${f.x.numero}`} /></td>
                    <td style={{ ...td, width: 70 }}><b style={{ fontWeight: 600 }}>{f.x.numero}</b></td>
                    <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.r.nombre}>{titulo(f.r.nombre)}</td>
                    <td style={td}>{fmtF(f.r.entrada)}</td>
                    <td style={td}>{fmtF(f.r.salida)}</td>
                    <td style={td}>{fmtF(f.ultimo)} <span style={{ color: C.n700, fontSize: 11 }}>{f.dias === 0 ? '(hoy)' : `(hace ${f.dias} ${f.dias === 1 ? 'noche' : 'noches'})`}</span></td>
                    <td style={{ ...td, color: f.estado === 'Atrasado' ? C.error : C.n900 }}>{f.estado === 'Sale antes' || f.estado === 'Sale hoy' ? <span style={{ color: C.n700 }}>No aplica</span> : fmtF(f.proximo)}</td>
                    <td style={td}><span style={{ fontSize: 11.5, color: COLOR[f.estado], whiteSpace: 'nowrap' }}>● {f.estado}</span></td>
                    <td style={{ ...td, color: f.x.camarera ? C.n900 : C.n700 }}>{f.x.camarera ?? 'Sin asignar'}</td>
                    <td style={{ ...td, width: 140, textAlign: 'right' }}>
                      {f.ultimo === HOY ? <span style={{ fontSize: 12, color: '#2E7D32' }}>✓ Cambiado hoy</span>
                        : <Button variant={pendiente ? 'primary' : 'secondary'} onClick={() => marcar([f.x.numero])}>Marcar cambiado</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Tarjeta>
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </Pantalla>
  );
}
