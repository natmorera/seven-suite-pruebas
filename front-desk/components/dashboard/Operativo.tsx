'use client';
// Dashboard › Operativo: llegadas, salidas, habitaciones, tareas, disponibilidad y alertas.
import Link from 'next/link';
import { useState } from 'react';
import { C, FONT, fmtNum, radius } from '@/components/suite/tokens';
import { usePaginado } from '@/components/configuracion/kit';
import { useHotel } from '@/components/hotel/store';
import { HOY, TIPOS, diaSemana, fmtF, sumarDias, tareaAbierta } from '@/components/hotel/datos';
import { Dona, Panel } from '@/components/hotel/ui';
import { ListadoLlegadas, ListadoSalidas } from '@/components/hotel/checkin';
import { disponibles, operacion, type RangoSel } from './datos';
import { Bandera, Carpeta, Ext, FilaBarra, Leyenda, Paginas, Pie, Punto, Rangos, Rotulo, TINTE, VERDE, VERDE_OSC, ROJO, ROJO_CLARO, MORADO, NARANJA, AZUL } from './piezas';

export function Operativo({ dia, dias, rango: r, onRango }: { dia: string; dias: string[]; rango: RangoSel; onRango: (v: RangoSel) => void }) {
  const h = useHotel();
  const [llegadas, setLlegadas] = useState(false);
  const [salidas, setSalidas] = useState(false);
  const o = operacion(h, dia);
  const pag = usePaginado(dias, 7);
  const th: React.CSSProperties = { fontWeight: 400, color: C.n700, padding: '8px 10px', fontSize: 12, whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '9px 10px', borderTop: `1px solid ${C.n500}`, fontSize: 12.5 };
  const tarjeta: React.CSSProperties = { justifyContent: 'flex-start' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Panel style={tarjeta} titulo={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Bandera color={VERDE} />Llegadas <span style={{ fontWeight: 400, color: C.n700 }}>(Check-In)</span></span>}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '4px 0' }}>
            <Dona size={120} grosor={18} partes={[{ valor: o.esperadas, color: VERDE, label: 'Esperadas' }, { valor: o.listasIn, color: VERDE_OSC, label: 'Listas' }]} centro={<b style={{ fontSize: 22, color: VERDE }}>{o.esperadas}</b>} />
            <Leyenda items={[{ label: 'Esperadas', valor: o.esperadas, color: VERDE }, { label: 'Listas', valor: o.listasIn, color: VERDE_OSC, texto: VERDE }]} />
          </div>
          <Pie onClick={() => setLlegadas(true)}>Check-In <span aria-hidden>→</span></Pie>
        </Panel>
        <Panel style={tarjeta} titulo={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Bandera color={ROJO} />Salidas <span style={{ fontWeight: 400, color: C.n700 }}>(Check-Out)</span></span>}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '4px 0' }}>
            <Dona size={120} grosor={18} partes={[{ valor: o.pendOut, color: ROJO, label: 'Pendientes' }, { valor: o.listasOut, color: ROJO_CLARO, label: 'Listas' }]} centro={<b style={{ fontSize: 22, color: ROJO }}>{o.pendOut}</b>} />
            <Leyenda items={[{ label: 'Pendientes', valor: o.pendOut, color: ROJO }, { label: 'Listas', valor: o.listasOut, color: ROJO_CLARO, texto: ROJO }]} />
          </div>
          <Pie onClick={() => setSalidas(true)}>Check-Out <span aria-hidden>→</span></Pie>
        </Panel>
        <Panel style={tarjeta} titulo="Habitaciones" acciones={<span style={{ fontSize: 12.5, color: C.n700 }}>Ocupación <b style={{ color: C.n900 }}>{fmtNum((o.ocupadas / o.total) * 100, 0)} %</b></span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
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

      <Panel titulo="Disponibilidad" acciones={<Rangos label="Rango de disponibilidad" valor={r} onChange={v => { onRango(v); pag.setPagina(1); }} />}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ ...th, textAlign: 'left' }}>Día</th>{TIPOS.map(t => <th key={t.id} title={t.nombre} style={{ ...th, textAlign: 'center' }}>{t.codigo}</th>)}</tr></thead>
            <tbody>{pag.visibles.map(d => (
              <tr key={d}>
                <td style={td}>{diaSemana(d)} {fmtF(d)}</td>
                {TIPOS.map(t => { const v = disponibles(h, t.id, d); return <td key={t.id} style={{ ...td, textAlign: 'center', color: v < 0 ? ROJO : C.n900, fontVariantNumeric: 'tabular-nums' }}>{v}</td>; })}
              </tr>))}</tbody>
          </table>
        </div>
        <Paginas pagina={pag.pagina} total={pag.total} onChange={pag.setPagina} />
      </Panel>

      <Alertas />
      {llegadas && <ListadoLlegadas onClose={() => setLlegadas(false)} />}
      {salidas && <ListadoSalidas onClose={() => setSalidas(false)} />}
    </div>
  );
}
// ── Tareas (visual): barra por estado + tablero de lo urgente ───────────────
const ESTADOS_DASH = ['Atrasado', 'Pendiente', 'En proceso', 'Completado'] as const;
const PLURAL: Record<string, string> = { Atrasado: 'Atrasadas', Pendiente: 'Pendientes', 'En proceso': 'En proceso', Completado: 'Completadas' };
const iniciales = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
function TareasVisual({ tareas, dia }: { tareas: (ReturnType<typeof operacion>)['tareas']; dia: string }) {
  const vivas = tareas.filter(t => t.estado !== 'Anulado');
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
          {ESTADOS_DASH.map(e => (
            <Link key={e} href={`/hospedaje/tareas?estado=${encodeURIComponent(e)}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: radius.pill, background: TINTE[e].bg, color: TINTE[e].color, fontSize: 12.5, textDecoration: 'none' }}>
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
            {c.items.slice(0, 3).map(t => (
              <Link key={t.id} href={`/hospedaje/tareas?estado=${encodeURIComponent(t.estado)}`} title={`${t.tarea} · ${t.responsable}`}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.n000, borderRadius: radius.md, borderLeft: `3px solid ${c.color}`, padding: '8px 10px', textDecoration: 'none', color: C.n900 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.tarea}</span>
                  <span style={{ fontSize: 11, color: C.n700 }}>{t.tipo}{t.estado === 'En proceso' ? ' · en proceso' : ''}</span>
                </span>
                <span title={t.responsable} style={{ width: 26, height: 26, borderRadius: '50%', background: C.brandBg, color: C.brand, fontSize: 10.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{iniciales(t.responsable)}</span>
              </Link>
            ))}
            {c.items.length > 3 && <Link href="/hospedaje/tareas" style={{ fontSize: 12, color: C.brand }}>+{c.items.length - 3} más</Link>}
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
