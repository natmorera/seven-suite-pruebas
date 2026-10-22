'use client';
// Dashboard › Operativo: llegadas y salidas, habitaciones, tareas, disponibilidad, cupos garantizados y alertas.
import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { C, FONT, fmtNum, radius } from '@/components/suite/tokens';
import { useHotel } from '@/components/hotel/store';
import { HOY, TIPOS, diaSemana, fmtF, sumarDias, tareaAbierta, type Reserva } from '@/components/hotel/datos';
import { Dona, Panel } from '@/components/hotel/ui';
import { ListadoLlegadas, ListadoSalidas } from '@/components/hotel/checkin';
import { DISP_DEFECTO, disponibles, operacion, resolverRango, type RangoSel } from './datos';
import { CuposGarantizados } from './Cupos';
import { FiltroFecha } from '@/components/suite/FiltroFecha';
import { Bandera, Carpeta, Ext, FilaBarra, Pie, Punto, Rotulo, TINTE, VERDE, VERDE_OSC, ROJO, ROJO_CLARO, MORADO, NARANJA, AZUL } from './piezas';

export function Operativo({ dia, dias, rango: r, onRango }: { dia: string; dias: string[]; rango: RangoSel; onRango: (v: RangoSel) => void }) {
  const h = useHotel();
  const [llegadas, setLlegadas] = useState(false);
  const [salidas, setSalidas] = useState(false);
  const o = operacion(h, dia);
  const porLlegar = h.reservas.filter(x => x.entrada === dia && (x.estado === 'Confirmada' || x.estado === 'Solicitada'));
  const porSalir = h.reservas.filter(x => x.salida === dia && x.estado === 'In-House');
  const nombre = (x: Reserva) => h.perfiles.find(p => p.id === x.perfilId)?.nombre ?? x.nombre;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: 16, alignItems: 'stretch' }}>
        <div style={{ minWidth: 0, display: 'flex' }}>
          <Panel style={{ flex: 1, gap: 12 }} titulo="Llegadas y salidas" acciones={<span style={{ fontSize: 12.5, color: C.n700 }}>{diaSemana(dia)} {fmtF(dia)}</span>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 1px minmax(0, 1fr)', gap: 20, flex: 1 }}>
              <Movimiento titulo="Llegadas" sub="Check-In" color={VERDE} partes={[{ label: 'Esperadas', valor: o.esperadas, color: VERDE }, { label: 'Listas', valor: o.listasIn, color: VERDE_OSC, texto: VERDE_OSC }]}
                total={o.esperadas} lista={porLlegar} vacio="No hay llegadas pendientes." nombre={nombre} accion="Check-In" onAccion={() => setLlegadas(true)} />
              <span style={{ background: C.n500 }} />
              <Movimiento titulo="Salidas" sub="Check-Out" color={ROJO} partes={[{ label: 'Pendientes', valor: o.pendOut, color: ROJO }, { label: 'Listas', valor: o.listasOut, color: ROJO_CLARO, texto: ROJO }]}
                total={o.pendOut} lista={porSalir} vacio="No hay salidas pendientes." nombre={nombre} accion="Check-Out" onAccion={() => setSalidas(true)} />
            </div>
          </Panel>
        </div>
        <Panel style={{ gap: 12 }} titulo="Habitaciones" acciones={<span style={{ fontSize: 12.5, color: C.n700 }}>Ocupación <b style={{ color: C.n900 }}>{fmtNum((o.ocupadas / o.total) * 100, 0)} %</b></span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, justifyContent: 'space-between' }}>
            <Rotulo>OCUPACIÓN</Rotulo>
            <FilaBarra label="Libres" valor={o.libres} total={o.total} color={AZUL} />
            <FilaBarra label="Ocupadas" valor={o.ocupadas} total={o.total} color={ROJO} />
            <FilaBarra label="Bloqueadas" valor={o.bloqueadas} total={o.total} color={MORADO} />
            <span style={{ marginTop: 4 }}><Rotulo>LIMPIEZA{dia !== HOY ? ' · ESTADO ACTUAL' : ''}</Rotulo></span>
            <FilaBarra label="Limpias" valor={o.total - o.sucias} total={o.total} color={VERDE} />
            <FilaBarra label="Sucias" valor={o.sucias} total={o.total} color={NARANJA} />
          </div>
          <Pie href="/hospedaje/mapa-de-habitaciones">Mapa de habitaciones <Ext /></Pie>
        </Panel>
      </div>

      <TareasVisual tareas={o.tareas} dia={dia} />

      <Disponibilidad dias={dias} dia={dia} rango={r} onRango={onRango} />

      <CuposGarantizados dia={dia} />

      <Alertas />
      {llegadas && <ListadoLlegadas onClose={() => setLlegadas(false)} />}
      {salidas && <ListadoSalidas onClose={() => setSalidas(false)} />}
    </div>
  );
}

/** Media tarjeta de llegadas o salidas: dona con tooltip, leyenda, próximas 3 reservas y botón de la acción. */
const FILAS_MOV = 3;
function Movimiento({ titulo, sub, color, partes, total, lista, vacio, nombre, accion, onAccion }: {
  titulo: string; sub: string; color: string; partes: { label: string; valor: number; color: string; texto?: string }[]; total: number;
  lista: Reserva[]; vacio: string; nombre: (r: Reserva) => string; accion: string; onAccion: () => void;
}) {
  const visibles = lista.slice(0, FILAS_MOV);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Dona size={76} grosor={12} partes={partes.map(p => ({ valor: p.valor, color: p.color, label: p.label }))} centro={<b style={{ fontSize: 17, color }}>{total}</b>} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
            <Bandera color={color} />{titulo} <span style={{ fontWeight: 400, color: C.n700 }}>({sub})</span>
          </span>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {partes.map(p => (
              <span key={p.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                <Punto color={p.color} />{p.label}<b style={{ color: p.texto ?? p.color, fontWeight: 600, fontSize: 14 }}>{p.valor}</b>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: FILAS_MOV * 29 + 18 }}>
        {visibles.length === 0 && <span style={{ fontSize: 12, color: C.n700, padding: '6px 0', borderTop: `1px solid ${C.n500}` }}>{vacio}</span>}
        {visibles.map(x => (
          <div key={x.id} style={{ display: 'grid', gridTemplateColumns: '40px minmax(0, 1fr) auto', gap: 8, alignItems: 'center', height: 29, borderTop: `1px solid ${C.n500}`, fontSize: 12 }}>
            <b style={{ fontWeight: 600, color: x.habitacion ? C.n900 : C.n700 }}>{x.habitacion || 's/h'}</b>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nombre(x)}>{nombre(x)}</span>
            <span style={{ color: C.n700, whiteSpace: 'nowrap' }}>{x.adultos + x.ninos} pax</span>
          </div>
        ))}
        {lista.length > visibles.length && <span style={{ fontSize: 11.5, color: C.n700, paddingTop: 4 }}>y {lista.length - visibles.length} más</span>}
      </div>
      <button type="button" onClick={onAccion} className="suite-fila"
        style={{ height: 32, marginTop: 'auto', border: `1px solid ${C.n500}`, borderRadius: radius.control, background: C.n000, fontSize: 12.5, fontFamily: FONT, cursor: 'pointer', color: C.n900 }}>
        {accion} <span aria-hidden>→</span>
      </button>
    </div>
  );
}

// ── Disponibilidad por tipo de habitación ───────────────────────────────────
/** Color de la celda según cuántas habitaciones quedan libres del tipo. */
const tono = (libres: number, total: number): CSSProperties =>
  libres <= 0 ? { background: 'rgba(244,67,54,.10)', color: ROJO, fontWeight: 600 }
    : libres / total <= 0.25 ? { background: 'rgba(238,179,0,.12)', color: '#8A6A00', fontWeight: 600 }
      : { color: C.n900 };

function Disponibilidad({ dias, dia, rango: r, onRango }: { dias: string[]; dia: string; rango: RangoSel; onRango: (v: RangoSel) => void }) {
  const h = useHotel();
  const habs = (t: string) => h.habitaciones.filter(x => x.tipo === t).length;
  const totalHabs = h.habitaciones.length;
  // Más de dos meses: una fila por mes con la menor disponibilidad del mes.
  const porMes = dias.length > 62;
  const filas = porMes
    ? [...new Set(dias.map(d => d.slice(0, 7)))].map(m => {
      const ds = dias.filter(d => d.startsWith(m));
      return { key: m, label: `${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`, valores: TIPOS.map(t => Math.min(...ds.map(d => disponibles(h, t.id, d)))), finde: false };
    })
    : dias.map(d => ({ key: d, label: `${diaSemana(d)} ${fmtF(d)}`, valores: TIPOS.map(t => disponibles(h, t.id, d)), finde: [0, 6].includes(new Date(d + 'T12:00:00').getDay()) }));
  const th: CSSProperties = { fontWeight: 400, color: C.n700, padding: '8px 10px', fontSize: 12, position: 'sticky', top: 0, background: C.n000, zIndex: 1, borderBottom: `1px solid ${C.n500}`, verticalAlign: 'top' };
  const td: CSSProperties = { padding: '8px 10px', borderTop: `1px solid ${C.n500}`, fontSize: 12.5, textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
  return (
    <Panel titulo="Disponibilidad" acciones={(() => {
      const [d0, h0] = resolverRango(dia, 'futuro', r);
      return <FiltroFecha label="Período" futuro alinear="right" desde={d0} hasta={h0}
        onChange={(d, h) => onRango(d || h ? { r: 'personalizado', desde: d || h, hasta: h || d } : DISP_DEFECTO)} />;
    })()}>
      <div style={{ maxHeight: 420, overflow: 'auto', border: `1px solid ${C.n500}`, borderRadius: radius.md }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 120 + TIPOS.length * 110 }}>
          <thead><tr>
            <th style={{ ...th, textAlign: 'left', left: 0, zIndex: 2, minWidth: 130 }}>{porMes ? 'Mes (mínimo)' : 'Día'}</th>
            {TIPOS.map(t => (
              <th key={t.id} title={`${t.nombre} · ${habs(t.id)} habitaciones`} style={{ ...th, textAlign: 'center', maxWidth: 150 }}>
                <span style={{ display: 'block', fontSize: 11, marginBottom: 2 }}>{t.codigo} · {habs(t.id)} hab.</span>
                <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: C.n900, fontWeight: 500, lineHeight: 1.3 }}>{t.nombre}</span>
              </th>
            ))}
            <th style={{ ...th, textAlign: 'center' }}><span style={{ display: 'block', fontSize: 11, marginBottom: 2 }}>{totalHabs} hab.</span><span style={{ color: C.n900, fontWeight: 500 }}>Total</span></th>
          </tr></thead>
          <tbody>{filas.map(f => {
            const total = f.valores.reduce((s, v) => s + v, 0);
            return (
              <tr key={f.key} style={{ background: f.finde ? C.n200 : undefined }}>
                <td style={{ ...td, textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: f.finde ? C.n200 : C.n000 }}>{f.label}</td>
                {f.valores.map((v, i) => <td key={TIPOS[i].id} style={{ ...td, ...tono(v, habs(TIPOS[i].id) || 1) }}>{v}</td>)}
                <td style={{ ...td, fontWeight: 600, ...tono(total, totalHabs || 1) }}>{total}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 11.5, color: C.n700 }}>
        <span>{porMes ? `${filas.length} meses · ${dias.length} días` : `${dias.length} ${dias.length === 1 ? 'día' : 'días'}`}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(238,179,0,.25)' }} />Quedan pocas (25 % o menos)</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(244,67,54,.2)' }} />Sin disponibilidad o sobreventa</span>
      </div>
    </Panel>
  );
}
// ── Tareas (visual): barra por estado + tablero de lo urgente ───────────────
// Mismo orden que la pantalla de Tareas: Todas, Pendientes, En proceso, Atrasadas, Completadas, Anuladas.
const ESTADOS_DASH = ['Pendiente', 'En proceso', 'Atrasado', 'Completado', 'Anulado'] as const;
const PLURAL: Record<string, string> = { Atrasado: 'Atrasadas', Pendiente: 'Pendientes', 'En proceso': 'En proceso', Completado: 'Completadas', Anulado: 'Anuladas' };
/** Tareas visibles por bandeja; el resto se ve con «Ver N más». */
const MAX_BANDEJA = 4;
const iniciales = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
function TareasVisual({ tareas, dia }: { tareas: (ReturnType<typeof operacion>)['tareas']; dia: string }) {
  const vivas = tareas;
  const total = Math.max(1, vivas.length);
  const columnas = [
    { titulo: 'Atrasadas', color: ROJO, items: tareas.filter(t => t.estado === 'Atrasado') },
    { titulo: dia === HOY ? 'Vencen hoy' : `Vencen el ${fmtF(dia)}`, color: NARANJA, items: tareas.filter(t => tareaAbierta(t) && t.estado !== 'Atrasado' && t.vencimiento === dia) },
    { titulo: 'Mañana', color: AZUL, items: tareas.filter(t => tareaAbierta(t) && t.vencimiento === sumarDias(dia, 1)) },
  ];
  return (
    <Panel titulo="Tareas" acciones={<Link href="/hospedaje/tareas" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.brand, textDecoration: 'none' }}>Ver todas <Ext /></Link>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div aria-label="Tareas por estado" style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: C.n200 }}>
          {ESTADOS_DASH.map(e => { const n = vivas.filter(t => t.estado === e).length; return n ? <span key={e} title={`${e}: ${n}`} style={{ width: `${(n / total) * 100}%`, background: TINTE[e].color }} /> : null; })}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/hospedaje/tareas"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: radius.pill, background: C.n000, border: `1px solid ${C.n500}`, color: C.n900, fontSize: 12.5, textDecoration: 'none' }}>
            Todas<b style={{ fontWeight: 600 }}>{tareas.length}</b>
          </Link>
          {ESTADOS_DASH.map(e => (
            <Link key={e} href={`/hospedaje/tareas?estado=${encodeURIComponent(e)}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: radius.pill, background: TINTE[e].bg, color: TINTE[e].texto ?? TINTE[e].color, fontSize: 12.5, textDecoration: 'none' }}>
              <Punto color={TINTE[e].color} size={8} />{PLURAL[e]}<b style={{ fontWeight: 600 }}>{vivas.filter(t => t.estado === e).length}</b>
            </Link>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {columnas.map(c => (
          <section key={c.titulo} aria-label={c.titulo} style={{ background: C.n200, borderRadius: radius.md, padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600 }}><Punto color={c.color} size={8} />{c.titulo}<span style={{ marginLeft: 'auto', color: C.n700, fontWeight: 400 }}>{c.items.length}</span></header>
            {c.items.length === 0 && <span style={{ fontSize: 12, color: C.n700, padding: '14px 0', textAlign: 'center' }}>Nada pendiente</span>}
            {c.items.slice(0, MAX_BANDEJA).map(t => (
              <Link key={t.id} href={`/hospedaje/tareas?estado=${encodeURIComponent(t.estado)}`} title={`${t.tarea} · ${t.responsable}`}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.n000, borderRadius: radius.md, borderLeft: `3px solid ${c.color}`, padding: '8px 10px', textDecoration: 'none', color: C.n900 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.tarea}</span>
                  <span style={{ fontSize: 11, color: C.n700 }}>{t.tipo}{t.estado === 'En proceso' ? ' · en proceso' : ''}</span>
                </span>
                <span title={t.responsable} style={{ width: 26, height: 26, borderRadius: '50%', background: C.brandBg, color: C.brand, fontSize: 10.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{iniciales(t.responsable)}</span>
              </Link>
            ))}
            {c.items.length > MAX_BANDEJA && <Link href={`/hospedaje/tareas`} style={{ fontSize: 12, color: C.brand, textDecoration: 'underline' }}>Ver {c.items.length - MAX_BANDEJA} más</Link>}
          </section>
        ))}
      </div>
    </Panel>
  );
}

/** Alertas compactas: las 3 más recientes y el resto bajo «Ver todas». */
function Alertas() {
  const h = useHotel();
  const [todas, setTodas] = useState(false);
  const lista = todas ? h.alertas : h.alertas.slice(0, 3);
  return (
    <Panel titulo={<>Alertas <span style={{ color: C.n700, fontWeight: 400 }}>({h.alertas.length})</span></>}
      acciones={h.alertas.length > 3 ? <button type="button" onClick={() => setTodas(v => !v)} style={{ border: 'none', background: 'none', color: C.brand, fontSize: 12.5, cursor: 'pointer', fontFamily: FONT }}>{todas ? 'Ver menos' : `Ver todas (${h.alertas.length})`}</button> : undefined}>
      {h.alertas.length === 0 && <span style={{ fontSize: 12.5, color: C.n700 }}>Sin alertas.</span>}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {lista.map((a, i) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: i ? `1px solid ${C.n500}` : 'none', fontSize: 12.5 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500, width: 70, flexShrink: 0 }}><Carpeta />{a.modulo}</span>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.texto}>{a.texto}</span>
            {a.accion && <Link href={a.accion.href} style={{ color: C.brand, fontSize: 12.5, textDecoration: 'none', flexShrink: 0 }}>{a.accion.label} →</Link>}
          </div>
        ))}
      </div>
    </Panel>
  );
}
