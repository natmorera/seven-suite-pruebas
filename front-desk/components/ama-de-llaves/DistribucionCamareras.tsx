'use client';
// Ama de llaves → Distribución de camareras.
// Tablero con una columna por camarera (y «Sin asignar»): se arrastran las
// habitaciones de una a otra, o se seleccionan varias y se asignan juntas.
// Cada columna muestra la carga estimada (salida = limpieza completa,
// ocupada = repaso, libre sucia = limpieza) para repartir el trabajo parejo.
// La asignación es la que ve cada camarera en su vista móvil.
import { useMemo, useState, type DragEvent } from 'react';
import Link from 'next/link';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Toast } from '@/components/suite/ui';
import { Pantalla } from '@/components/layout/Pantalla';
import { useHotel } from '@/components/hotel/store';
import { CAMARERAS, TIPOS, estadoLimpieza, type Habitacion } from '@/components/hotel/datos';
import { Alerta, BotonExportar, FiltroChecks, HojaReporte, MenuBoton, TablaImpresa, exportarCSV, usePrint } from '@/components/hotel/ui';
import { COLOR_DISP, IcMovil, Tarjeta, disponibilidad, infoLimpieza, paxDe } from './comun';

/** Minutos estimados por tipo de servicio. */
const MIN = { salida: 45, repaso: 25, limpieza: 30, ninguno: 0 };
export function servicioDe(x: Habitacion): { id: keyof typeof MIN; label: string } {
  if (x.estado === 'bloqueada') return { id: 'ninguno', label: 'F/O' };
  if (x.estado === 'checkout') return { id: 'salida', label: 'Salida' };
  if (x.estado === 'ocupada') return { id: 'repaso', label: x.sucia ? 'Repaso' : 'Repaso hecho' };
  return x.sucia ? { id: 'limpieza', label: 'Limpieza' } : { id: 'ninguno', label: estadoLimpieza(x) === 'noRequiere' ? 'No requiere' : 'Lista' };
}
const minutos = (x: Habitacion) => (x.estado === 'ocupada' && !x.sucia ? 0 : MIN[servicioDe(x).id]);
const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `${m} min`);

export default function DistribucionCamareras() {
  const h = useHotel();
  const [pisos, setPisos] = useState<string[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [arrastrando, setArrastrando] = useState<string[] | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { imprimir, portal } = usePrint();

  const habs = useMemo(() => h.habitaciones.filter(x => (!pisos.length || pisos.includes(String(x.piso))) && (!tipos.length || tipos.includes(x.tipo)))
    .sort((a, b) => a.numero.localeCompare(b.numero, 'es', { numeric: true })), [h.habitaciones, pisos, tipos]);
  const columnas = [...CAMARERAS.map(c => ({ id: c, nombre: c })), { id: '', nombre: 'Sin asignar' }];
  const de = (c: string) => habs.filter(x => (x.camarera ?? '') === c);
  const asignar = (nums: string[], c: string) => {
    h.asignarCamarera(nums, c);
    setToast(`${nums.length === 1 ? `Habitación ${nums[0]}` : `${nums.length} habitaciones`} → ${c || 'Sin asignar'}`);
    setSel([]);
  };
  /** Reparte por carga: ordena de mayor a menor trabajo y asigna a quien lleva menos minutos (manteniendo pisos juntos). */
  const distribuir = () => {
    const carga = Object.fromEntries(CAMARERAS.map(c => [c, 0])) as Record<string, number>;
    const plan: Record<string, string[]> = Object.fromEntries(CAMARERAS.map(c => [c, []]));
    [...h.habitaciones].sort((a, b) => minutos(b) - minutos(a) || a.numero.localeCompare(b.numero)).forEach(x => {
      const c = CAMARERAS.reduce((m, k) => (carga[k] < carga[m] || (carga[k] === carga[m] && plan[k].length < plan[m].length) ? k : m), CAMARERAS[0]);
      carga[c] += minutos(x); plan[c].push(x.numero);
    });
    CAMARERAS.forEach(c => h.asignarCamarera(plan[c], c));
    setAuto(false); setSel([]);
    setToast('Habitaciones distribuidas según la carga de trabajo');
  };
  const alternar = (n: string) => setSel(s => (s.includes(n) ? s.filter(x => x !== n) : [...s, n]));
  const soltar = (c: string) => (e: DragEvent) => { e.preventDefault(); if (arrastrando) asignar(arrastrando, c); setArrastrando(null); setSobre(null); };

  const HEAD = ['Hab', 'Tipo', 'Estado', 'Pax', 'Limpieza', 'Servicio', 'Observaciones'];
  const filasDe = (c: string) => h.habitaciones.filter(x => (x.camarera ?? '') === c).sort((a, b) => a.numero.localeCompare(b.numero, 'es', { numeric: true }))
    .map(x => [x.numero, x.tipo, disponibilidad(x), paxDe(x, h.reservas) || '-', infoLimpieza(estadoLimpieza(x)).label, servicioDe(x).label, [x.discrepancia, x.obsLimpieza].filter(Boolean).join(' · ')]);
  const hojas = (cs: string[]) => imprimir(<>{cs.map((c, i) => (
    <div key={c} style={{ pageBreakAfter: i < cs.length - 1 ? 'always' : 'auto' }}>
      <HojaReporte titulo={`Hoja de trabajo · ${c}`} filtros={`${filasDe(c).length} habitaciones · carga estimada ${fmtMin(h.habitaciones.filter(x => x.camarera === c).reduce((s, x) => s + minutos(x), 0))}`}>
        <TablaImpresa headers={HEAD} filas={filasDe(c)} />
      </HojaReporte>
    </div>
  ))}</>);

  return (
    <Pantalla titulo="Distribución de camareras"
      acciones={<>
        <BotonExportar titulo="Distribución de camareras" onCSV={() => exportarCSV('distribucion-camareras', ['Camarera', ...HEAD], columnas.flatMap(c => filasDe(c.id).map(f => [c.nombre, ...f])))}
          onPDF={() => hojas(CAMARERAS)} />
        <MenuBoton label="Imprimir hoja de trabajo" ancho={240} opciones={[...CAMARERAS.map(c => ({ label: c, onClick: () => hojas([c]) })), { label: 'Todas las camareras', onClick: () => hojas(CAMARERAS) }]} />
        <Button onClick={() => setAuto(true)}>Distribuir automáticamente</Button>
      </>}
      filtros={<>
        <FiltroChecks label="Piso" value={pisos} onChange={setPisos} opciones={[1, 2, 3, 4].map(p => ({ value: String(p), label: `Piso ${p}` }))} ancho={170} />
        <FiltroChecks label="Tipo de habitación" value={tipos} onChange={setTipos} opciones={TIPOS.map(t => ({ value: t.id, label: t.nombre }))} />
        {(pisos.length || tipos.length) ? <Button variant="ghost" onClick={() => { setPisos([]); setTipos([]); }}>Limpiar filtros</Button> : null}
      </>}
      filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>Arrastra las habitaciones entre camareras</span>}
      seleccion={{ n: sel.length, onLimpiar: () => setSel([]), etiqueta: sel.length === 1 ? 'habitación' : 'habitaciones', acciones:
        <MenuBoton label="Asignar a" variant="primary" ancho={240} opciones={columnas.map(c => ({ label: c.nombre, onClick: () => asignar(sel, c.id) }))} /> }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columnas.length}, minmax(230px, 1fr))`, gap: 12, overflowX: 'auto', alignItems: 'start' }}>
        {columnas.map(col => {
          const xs = de(col.id);
          const todas = h.habitaciones.filter(x => (x.camarera ?? '') === col.id);
          const carga = todas.reduce((s, x) => s + minutos(x), 0);
          const sucias = todas.filter(x => x.sucia).length;
          const destino = !!arrastrando && sobre === col.id;
          return (
            <Tarjeta key={col.id || 'sin'} style={{ display: 'flex', flexDirection: 'column', minHeight: 200, borderColor: destino ? C.brand : C.n500, background: destino ? C.brandBg : C.n000 }}>
              <div onDragOver={e => { e.preventDefault(); setSobre(col.id); }} onDragLeave={() => setSobre(s => (s === col.id ? null : s))} onDrop={soltar(col.id)}
                aria-label={`Columna ${col.nombre}`} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <header style={{ padding: '12px 14px', borderBottom: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <b style={{ fontSize: 13, fontWeight: 600, color: col.id ? C.n900 : C.n700 }}>{col.nombre}</b>
                    {col.id && <Link href={`/ama-de-llaves/estado-de-habitaciones/camarera?c=${encodeURIComponent(col.id)}`} title="Ver su vista móvil" aria-label={`Vista móvil de ${col.nombre}`} style={{ color: C.brand, display: 'inline-flex' }}><IcMovil /></Link>}
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11.5, color: C.n700, flexWrap: 'wrap' }}>
                    <span><b style={{ color: C.n900, fontWeight: 600 }}>{todas.length}</b> hab.</span>
                    <span><b style={{ color: '#C62828', fontWeight: 600 }}>{sucias}</b> sucias</span>
                    <span><b style={{ color: C.n900, fontWeight: 600 }}>{todas.filter(x => x.estado === 'checkout').length}</b> salidas</span>
                    {col.id && <span title="Carga estimada (salida 45 min, limpieza 30 min, repaso 25 min)">≈ <b style={{ color: C.n900, fontWeight: 600 }}>{fmtMin(carga)}</b></span>}
                    {col.id && (() => { const hechas = h.habitaciones.filter(x => x.limpieza?.camarera === col.id && x.limpieza.estado === 'finalizada'); const enCurso = h.habitaciones.find(x => x.limpieza?.camarera === col.id && x.limpieza.estado !== 'finalizada');
                      return <span title="Medido con Iniciar / Finalizar en la vista de camarera">{hechas.length} hechas{hechas.length ? ` · prom. ${Math.round(hechas.reduce((s, x) => s + x.limpieza!.segundos, 0) / hechas.length / 60)} min` : ''}{enCurso ? ` · limpiando ${enCurso.numero}` : ''}</span>; })()}
                  </div>
                  {col.id && <div style={{ height: 4, borderRadius: 2, background: C.n500, overflow: 'hidden' }}><div style={{ width: `${Math.min(100, (carga / 480) * 100)}%`, height: '100%', background: carga > 480 ? C.error : C.brand }} /></div>}
                </header>
                <div style={{ padding: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8, alignContent: 'start', flex: 1 }}>
                  {xs.length === 0 && <p style={{ gridColumn: '1 / -1', margin: 0, padding: '18px 6px', textAlign: 'center', fontSize: 12, color: C.n700, border: `1px dashed ${C.n500}`, borderRadius: radius.md }}>Suelta aquí habitaciones</p>}
                  {xs.map(x => (
                    <FichaHab key={x.numero} x={x} on={sel.includes(x.numero)} onClick={() => alternar(x.numero)}
                      onDragStart={e => { const nums = sel.includes(x.numero) ? sel : [x.numero]; setArrastrando(nums); e.dataTransfer.setData('text/plain', nums.join(',')); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragEnd={() => { setArrastrando(null); setSobre(null); }} />
                  ))}
                </div>
              </div>
            </Tarjeta>
          );
        })}
      </div>
      <Alerta open={auto} titulo="¿Distribuir automáticamente?" confirmar="Sí, distribuir" onClose={() => setAuto(false)} onConfirm={distribuir}>
        Se reasignarán las {h.habitaciones.length} habitaciones entre {CAMARERAS.length} camareras para equilibrar la carga de trabajo. Las asignaciones actuales se reemplazan.
      </Alerta>
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </Pantalla>
  );
}

function FichaHab({ x, on, onClick, onDragStart, onDragEnd }: { x: Habitacion; on: boolean; onClick: () => void; onDragStart: (e: DragEvent) => void; onDragEnd: () => void }) {
  const l = infoLimpieza(estadoLimpieza(x));
  const d = disponibilidad(x);
  const s = servicioDe(x);
  return (
    <button type="button" draggable onClick={onClick} onDragStart={onDragStart} onDragEnd={onDragEnd} aria-pressed={on} aria-label={`Habitación ${x.numero}`}
      title={`${x.numero} · ${d} · ${l.label} · ${s.label}. Clic para seleccionar, arrastra para reasignar.`}
      style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '7px 9px', borderRadius: radius.md, borderTop: `1px solid ${on ? C.brand : C.n500}`, borderRight: `1px solid ${on ? C.brand : C.n500}`, borderBottom: `1px solid ${on ? C.brand : C.n500}`, borderLeft: `4px solid ${l.color}`,
        background: on ? C.brandBg : C.n000, cursor: 'grab', fontFamily: FONT, textAlign: 'left' }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ fontSize: 13, fontWeight: 600, color: C.n900 }}>{x.numero}</b>
        <span title={d} style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_DISP[d] }} />
      </span>
      <span style={{ fontSize: 10.5, color: C.n700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.tipo} · {s.label}</span>
    </button>
  );
}
