'use client';
// Check-in: estancia por tramos. Con un solo tramo es la estancia normal (salida editable = prórroga);
// «Dividir estancia» agrega un cambio de habitación programado. Mismo formato de líneas que «Nueva reserva».
import { useState, type CSSProperties } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { useHotel } from './store';
import { HOY, TIPOS, fmtF, noches, sumarDias, type Reserva } from './datos';
import { habitacionLibre, precioTarifa, type Tramo } from './reservas';
import { bloqueadaEnEstancia } from '@/components/reservaciones/inventario';
import { money } from './ui';
import { MenuLinea } from '@/components/reservaciones/FormReservaPartes';

export const tramoInicial = (r: Reserva): Tramo => ({ desde: r.entrada, hasta: r.salida, tipo: r.tipo, habitacion: r.habitacion, precio: r.precio });

/** Errores de los tramos (vacío = válido). */
export function erroresTramos(ts: Tramo[]) {
  const e: string[] = [];
  ts.forEach((t, i) => {
    if (!t.habitacion) e.push(ts.length > 1 ? `Habitación del tramo ${i + 1}` : 'Habitación asignada');
    if (noches(t.desde, t.hasta) < 1) e.push(`Fechas del tramo ${i + 1}`);
    if (i > 0 && t.habitacion && t.habitacion === ts[i - 1].habitacion) e.push(`El tramo ${i + 1} repite la habitación ${t.habitacion}`);
  });
  return e;
}

const PALETA = ['#213C89', '#0E7A57', '#B45309', '#7C3AED'];
const ctl: CSSProperties = { height: 30, border: `1px solid ${C.n500}`, borderRadius: radius.control, fontSize: 12, fontFamily: FONT, padding: '0 6px', background: C.n000, width: '100%', boxSizing: 'border-box' };
const th: CSSProperties = { padding: '6px 4px', textAlign: 'left', fontSize: 11, fontWeight: 400, color: C.n700, whiteSpace: 'nowrap' };

export function EstanciaTramos({ r, tramos, onChange }: { r: Reserva; tramos: Tramo[]; onChange: (t: Tramo[]) => void }) {
  const h = useHotel();
  const [aviso, setAviso] = useState('');
  const total = Math.max(1, noches(tramos[0].desde, tramos.at(-1)!.hasta));
  const set = (i: number, p: Partial<Tramo>) => onChange(tramos.map((t, j) => {
    if (j === i) return { ...t, ...p };
    // Los tramos son contiguos: mover la salida de uno mueve la entrada del siguiente
    if (j === i + 1 && p.hasta) return { ...t, desde: p.hasta, habitacion: '' };
    return t;
  }));

  /** Habitaciones que se pueden asignar a un tramo. Hoy deben estar listas (libres y limpias); después, solo disponibles. */
  const opciones = (t: Tramo, i: number) => h.habitaciones.filter(x => {
    if (x.numero === r.habitacion && i === 0) return true;
    if (bloqueadaEnEstancia(h, x.numero, t.desde, t.hasta)) return false;
    if (!habitacionLibre(h.reservas, x.numero, t.desde, t.hasta, [r.id])) return false;
    if (t.desde === HOY) return ['libre', 'checkin', 'checkinRL'].includes(x.estado) && !x.sucia;
    return true;
  });

  const dividir = () => {
    const u = tramos.at(-1)!;
    const n = noches(u.desde, u.hasta);
    if (n < 2) return setAviso('El último tramo tiene una sola noche: extiende la salida para poder dividirlo.');
    setAviso('');
    const corte = sumarDias(u.desde, Math.ceil(n / 2));
    onChange([...tramos.slice(0, -1), { ...u, hasta: corte }, { ...u, desde: corte, habitacion: '' }]);
  };
  const quitar = (i: number) => onChange(tramos.flatMap((t, j) => (j === i ? [] : j === i - 1 ? [{ ...t, hasta: tramos[i].hasta }] : [t])));

  return (
    <section aria-label="Estancia y habitaciones" style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Estancia y habitaciones</p>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: C.n700 }}>
            {tramos.length > 1 ? `${tramos.length} tramos · el huésped cambia de habitación en cada fecha. Todo se cobra en una sola factura.` : 'Si el huésped cambiará de habitación durante la estancia, divídela por tramos.'}
          </p>
        </div>
        <span style={{ fontSize: 12, color: C.n700 }}>{fmtF(tramos[0].desde)} → {fmtF(tramos.at(-1)!.hasta)} · <b style={{ color: C.n900, fontWeight: 600 }}>{total} noche{total === 1 ? '' : 's'}</b></span>
      </div>

      {/* Línea de tiempo: cada tramo ocupa su proporción de noches */}
      {tramos.length > 1 && (
        <div aria-hidden style={{ display: 'flex', height: 26, borderRadius: radius.control, overflow: 'hidden', gap: 2 }}>
          {tramos.map((t, i) => (
            <div key={i} style={{ flex: Math.max(1, noches(t.desde, t.hasta)), background: PALETA[i % PALETA.length], color: '#fff', fontSize: 11.5, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', overflow: 'hidden', padding: '0 6px' }}>
              {t.habitacion ? `Hab. ${t.habitacion}` : 'Sin habitación'} · {noches(t.desde, t.hasta)}n
            </div>
          ))}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead><tr>{['#', 'Desde', 'Hasta (salida)', 'Noches', 'Tipo de habitación', 'Habitación', 'Precio / noche', ''].map((x, i) => <th key={i} style={th}>{x}</th>)}</tr></thead>
          <tbody>
            {tramos.map((t, i) => {
              const ultimo = i === tramos.length - 1;
              const libres = opciones(t, i);
              const max = ultimo ? undefined : sumarDias(tramos[i + 1].hasta, -1);
              return (
                <tr key={i} style={{ borderTop: `1px solid ${C.n500}`, verticalAlign: 'top' }}>
                  <td style={{ padding: '10px 4px', width: 22 }}>
                    <span aria-hidden style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: PALETA[i % PALETA.length], marginRight: 4 }} />
                    <span style={{ fontSize: 12, color: C.n700 }}>{i + 1}</span>
                  </td>
                  <td style={{ padding: 4, width: 118 }}>
                    <div style={{ ...ctl, background: C.n200, display: 'flex', alignItems: 'center' }}>{fmtF(t.desde)}</div>
                    <span style={{ display: 'block', fontSize: 10.5, color: C.n700, marginTop: 3 }}>{i === 0 ? 'Check-in hoy' : 'Cambio de habitación'}</span>
                  </td>
                  <td style={{ padding: 4, width: 130 }}>
                    <input type="date" value={t.hasta} min={sumarDias(t.desde, 1)} max={max} aria-label={`Salida del tramo ${i + 1}`} className="suite-campo" style={ctl}
                      onChange={e => { const v = e.target.value; if (v && v > t.desde && (!max || v <= max)) set(i, { hasta: v }); }} />
                    {ultimo && t.hasta !== r.salida && <span style={{ display: 'block', fontSize: 10.5, color: '#B45309', marginTop: 3 }}>Salida original {fmtF(r.salida)}</span>}
                  </td>
                  <td style={{ padding: '10px 4px', fontSize: 12, width: 56 }}>{noches(t.desde, t.hasta)}</td>
                  <td style={{ padding: 4, minWidth: 150 }}>
                    <select value={t.tipo} aria-label={`Tipo de habitación del tramo ${i + 1}`} className="suite-campo" style={ctl}
                      onChange={e => set(i, { tipo: e.target.value, habitacion: '', precio: e.target.value === r.tipo ? r.precio : precioTarifa(e.target.value, r.tarifa) })}>
                      {TIPOS.map(x => <option key={x.id} value={x.id}>{x.nombre} ({x.codigo})</option>)}
                    </select>
                  </td>
                  <td style={{ padding: 4, width: 120 }}>
                    <select value={t.habitacion} aria-label={`Habitación del tramo ${i + 1}`} className="suite-campo" style={{ ...ctl, borderColor: t.habitacion ? C.n500 : C.brandBd }}
                      onChange={e => { const hab = h.habitaciones.find(x => x.numero === e.target.value); set(i, { habitacion: e.target.value, ...(hab && hab.tipo !== t.tipo ? { tipo: hab.tipo, precio: hab.tipo === r.tipo ? r.precio : precioTarifa(hab.tipo, r.tarifa) } : {}) }); }}>
                      <option value="">Asignar</option>
                      {libres.filter(x => x.tipo === t.tipo).map(x => <option key={x.numero} value={x.numero}>{x.numero}</option>)}
                      {libres.some(x => x.tipo !== t.tipo) && <optgroup label="Otros tipos">{libres.filter(x => x.tipo !== t.tipo).map(x => <option key={x.numero} value={x.numero}>{x.numero} · {x.tipo}</option>)}</optgroup>}
                    </select>
                    <span style={{ display: 'block', fontSize: 10.5, color: libres.some(x => x.tipo === t.tipo) ? C.n700 : C.error, marginTop: 3 }}>
                      {libres.filter(x => x.tipo === t.tipo).length} libre{libres.filter(x => x.tipo === t.tipo).length === 1 ? '' : 's'} del tipo{t.desde === HOY ? ' y limpias' : ''}
                    </span>
                  </td>
                  <td style={{ padding: 4, width: 96 }}>
                    <input value={t.precio} aria-label={`Precio del tramo ${i + 1}`} inputMode="decimal" className="suite-campo" style={{ ...ctl, textAlign: 'right' }}
                      onChange={e => set(i, { precio: Math.max(0, Number(e.target.value.replace(/[^\d.]/g, '')) || 0) })} />
                    <span style={{ display: 'block', fontSize: 10.5, color: C.n700, marginTop: 3, textAlign: 'right' }}>{money(t.precio * noches(t.desde, t.hasta))}</span>
                  </td>
                  <td style={{ padding: 4, width: 30 }}>
                    {i > 0 && <MenuLinea n={i + 1} opciones={[{ l: 'Quitar tramo (une con el anterior)', on: () => quitar(i), peligro: true }]} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Button variant="secondary" icon={<IcPlus size={12} />} onClick={dividir}>Dividir estancia (cambio de habitación)</Button>
        {aviso && <span role="status" style={{ fontSize: 12, color: '#B45309' }}>{aviso}</span>}
      </div>
    </section>
  );
}
