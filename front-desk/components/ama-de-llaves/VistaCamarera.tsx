'use client';
// Ama de llaves → vista de camarera (móvil). Cada camarera ve solo las
// habitaciones que le asignaron en «Distribución de camareras», con pestañas
// Todas / Sucias / Limpias / Sin limpieza y tarjetas que se expanden de una en
// una. Todo se guarda al instante, sin confirmaciones y sin exportar.
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Checkbox, Toast } from '@/components/suite/ui';
import { Pantalla } from '@/components/layout/Pantalla';
import { useHotel } from '@/components/hotel/store';
import { CAMARERAS, TIPOS, estadoLimpieza, fmtCrono, segundosLimpieza, type EstadoLimpieza, type Habitacion } from '@/components/hotel/datos';
import { Adjuntos, BadgeDisp, disponibilidad, infoLimpieza, paxDe, useReloj } from './comun';

type Tab = 'todas' | EstadoLimpieza;
const TABS: { id: Tab; label: string }[] = [{ id: 'todas', label: 'Todas' }, { id: 'sucia', label: 'Sucias' }, { id: 'limpia', label: 'Limpias' }, { id: 'noRequiere', label: 'Sin limpieza' }];

export default function VistaCamarera() {
  const h = useHotel();
  const sp = useSearchParams();
  const router = useRouter();
  const camarera = CAMARERAS.includes(sp.get('c') ?? '') ? sp.get('c')! : CAMARERAS[0];
  const [tab, setTab] = useState<Tab>('todas');
  const [abierta, setAbierta] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const mias = h.habitaciones.filter(x => x.camarera === camarera).sort((a, b) => a.numero.localeCompare(b.numero, 'es', { numeric: true }));
  const n = (t: Tab) => (t === 'todas' ? mias.length : mias.filter(x => estadoLimpieza(x) === t).length);
  const visibles = mias.filter(x => tab === 'todas' || estadoLimpieza(x) === tab);

  return (
    <Pantalla titulo="Vista de camarera" sinPadding
      izquierda={<select value={camarera} onChange={e => { setAbierta(null); router.replace(`/ama-de-llaves/estado-de-habitaciones/camarera?c=${encodeURIComponent(e.target.value)}`); }} aria-label="Ver como camarera"
        style={{ height: 30, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 8px', fontSize: 12, fontFamily: FONT, background: C.n000 }}>
        {CAMARERAS.map(c => <option key={c}>{c}</option>)}
      </select>}>
      <div className="vista-camarera" style={{ display: 'flex', justifyContent: 'center', padding: '16px 12px 40px', background: C.n200, minHeight: '100%' }}>
        <div style={{ width: '100%', maxWidth: 440, fontFamily: FONT, display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 3, background: C.n000, border: `1px solid ${C.n500}`, borderRadius: `${radius.card}px ${radius.card}px 0 0`, padding: '14px 14px 0' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.n900 }}>Estado de las habitaciones</h2>
            <div style={{ fontSize: 12, color: C.n700, marginTop: 2 }}>{camarera} · {mias.length} habitaciones asignadas</div>
            <div role="tablist" aria-label="Filtrar habitaciones" style={{ display: 'flex', gap: 4, marginTop: 12, overflowX: 'auto' }}>
              {TABS.map(t => {
                const on = tab === t.id;
                return (
                  <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => { setTab(t.id); setAbierta(null); }}
                    style={{ flex: '1 0 auto', padding: '8px 6px 10px', border: 'none', borderBottom: `2px solid ${on ? C.brand : 'transparent'}`, background: 'none', fontSize: 12.5, fontFamily: FONT, color: on ? C.brand : C.n700, fontWeight: on ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {t.label} ({n(t.id)})
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: C.n000, border: `1px solid ${C.n500}`, borderTop: 'none', borderRadius: `0 0 ${radius.card}px ${radius.card}px`, padding: 10 }}>
            {visibles.length === 0 && <p style={{ textAlign: 'center', color: C.n700, fontSize: 13, padding: '28px 10px', margin: 0 }}>{mias.length ? 'No hay habitaciones en esta pestaña.' : 'No tienes habitaciones asignadas hoy.'}</p>}
            {visibles.map(x => (
              <TarjetaHab key={x.numero} x={x} abierta={abierta === x.numero} onAlternar={() => setAbierta(a => (a === x.numero ? null : x.numero))}
                onLimpiar={() => { h.finalizarLimpieza(x.numero); setAbierta(null); setToast(`Habitación ${x.numero} limpia`); }} />
            ))}
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </Pantalla>
  );
}

function TarjetaHab({ x, abierta, onAlternar, onLimpiar }: { x: Habitacion; abierta: boolean; onAlternar: () => void; onLimpiar: () => void }) {
  const h = useHotel();
  const l = estadoLimpieza(x);
  const info = infoLimpieza(l);
  const pax = paxDe(x, h.reservas);
  const sale = x.estado === 'checkout';
  return (
    <article style={{ border: `1px solid ${abierta ? C.brandBd : C.n500}`, borderRadius: radius.card, overflow: 'hidden', background: C.n000 }}>
      <button type="button" onClick={onAlternar} aria-expanded={abierta} aria-label={`Habitación ${x.numero}`}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px', border: 'none', background: abierta ? C.brandBg : C.n000, cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}>
        <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: info.color }} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <b style={{ fontSize: 17, fontWeight: 600, color: C.n900 }}>{x.numero}</b>
            <BadgeDisp d={disponibilidad(x)} />
            {sale && <span style={{ fontSize: 11, color: '#B45309', fontWeight: 500 }}>Sale hoy</span>}
          </span>
          <span style={{ fontSize: 12, color: C.n700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {TIPOS.find(t => t.id === x.tipo)?.nombre} · {pax ? `${pax} pax` : 'Sin huéspedes'}{x.limpieza?.estado === 'enCurso' ? ' · ⏱ En curso' : x.limpieza?.estado === 'pausada' ? ' · ⏸ En pausa' : ''}{x.discrepancia || x.adjuntos?.length ? ' · ⚠ Discrepancia' : ''}
          </span>
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 500, color: info.color, background: info.bg, padding: '3px 10px', borderRadius: radius.pill, whiteSpace: 'nowrap' }}>{info.label}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.n700} strokeWidth={2} aria-hidden style={{ transform: abierta ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {abierta && (
        <div style={{ padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeIn .15s' }}>
          {x.estado === 'bloqueada' && <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Fuera de orden: {x.motivoBloqueo}</p>}
          <Cronometro x={x} onFinalizar={onLimpiar} />
          <Checkbox checked={l === 'noRequiere'} onChange={b => h.setLimpieza([x.numero], b ? 'noRequiere' : 'sucia')} label="No requiere limpieza" />
          <CampoMovil label="Discrepancia (opcional)" valor={x.discrepancia ?? ''} placeholder="Ej: hay 3 personas, el sistema indica 2" onGuardar={v => h.setHab(x.numero, { discrepancia: v })} />
          <Adjuntos hab={x} />
          <CampoMovil label="Observaciones internas" valor={x.obsLimpieza ?? ''} placeholder="Ej: falta una toalla, foco quemado…" area onGuardar={v => h.setHab(x.numero, { obsLimpieza: v })} />
        </div>
      )}
    </article>
  );
}

/** Campo con guardado automático al salir (sin botón Guardar). */
function CampoMovil({ label, valor, placeholder, area, onGuardar }: { label: string; valor: string; placeholder?: string; area?: boolean; onGuardar: (v: string) => void }) {
  const [v, setV] = useState(valor);
  const estilo = { width: '100%', boxSizing: 'border-box' as const, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '8px 10px', fontSize: 13, fontFamily: FONT, color: C.n900, outline: 'none', resize: 'vertical' as const };
  const guardar = () => { if (v.trim() !== valor) onGuardar(v.trim()); };
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: C.n700 }}>
      {label}
      {area
        ? <textarea value={v} onChange={e => setV(e.target.value)} onBlur={guardar} rows={3} placeholder={placeholder} className="suite-campo" style={estilo} />
        : <input value={v} onChange={e => setV(e.target.value)} onBlur={guardar} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} placeholder={placeholder} className="suite-campo" style={{ ...estilo, height: 38 }} />}
    </label>
  );
}

/** Iniciar / Pausar / Reanudar / Finalizar: mide cuánto dura la limpieza. Finalizar la deja Limpia. */
function Cronometro({ x, onFinalizar }: { x: Habitacion; onFinalizar: () => void }) {
  const h = useHotel();
  const c = x.limpieza;
  const ahora = useReloj(c?.estado === 'enCurso');
  const s = segundosLimpieza(c, ahora);
  const btn = (bg: string, fg = '#fff') => ({ flex: 1, height: 44, borderRadius: radius.control, border: bg === C.n000 ? `1px solid ${C.n500}` : 'none', background: bg, color: fg, fontSize: 14, fontWeight: 600, fontFamily: FONT, cursor: 'pointer' });
  if (!c || (c.estado === 'finalizada' && x.sucia)) {
    return <button type="button" onClick={() => h.iniciarLimpieza(x.numero, x.camarera ?? '')} style={btn('#2E7D32')}>▶ Iniciar limpieza</button>;
  }
  if (c.estado === 'finalizada') {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#E8F5E9', color: '#2E7D32', borderRadius: radius.control, padding: '10px 12px', fontSize: 13 }}>
      <b style={{ fontWeight: 600 }}>✓ Limpieza terminada</b><span>{Math.round(c.segundos / 60)} min{c.pausas ? ` · ${c.pausas} pausa${c.pausas > 1 ? 's' : ''}` : ''}</span></div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div aria-live="polite" style={{ textAlign: 'center', fontSize: 28, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: c.estado === 'enCurso' ? '#2E7D32' : '#B45309' }}>
        {fmtCrono(s)} <span style={{ fontSize: 12, fontWeight: 500 }}>{c.estado === 'enCurso' ? 'en curso' : 'en pausa'}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {c.estado === 'enCurso'
          ? <button type="button" onClick={() => h.pausarLimpieza(x.numero)} style={btn(C.n000, '#B45309')}>❚❚ Pausar</button>
          : <button type="button" onClick={() => h.reanudarLimpieza(x.numero)} style={btn(C.n000, '#2E7D32')}>▶ Reanudar</button>}
        <button type="button" onClick={onFinalizar} style={btn('#2E7D32')}>■ Finalizar</button>
      </div>
    </div>
  );
}
