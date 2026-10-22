'use client';
// Filtros de la barra de filtros con el patrón de Accounting: botón con la etiqueta y una flecha que abre un
// desplegable. FiltroOpciones elige un valor de una lista; FiltroFechas elige un período o un rango.
import { useState, type ReactNode } from 'react';
import { C, FONT, radius, SIZE } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';
import { IcChevronDown } from '@/components/suite/icons';
import { fmtF, hoy } from './fechas';
import { Popover } from './selectores';

function BotonFiltro({ etiqueta, valor, abierto, onClick, activo = !!valor }: { etiqueta: string; valor?: string; abierto: boolean; onClick: () => void; activo?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-haspopup="dialog" aria-expanded={abierto}
      style={{ height: SIZE.control, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: radius.control, cursor: 'pointer',
        fontSize: 12, fontFamily: FONT, whiteSpace: 'nowrap', maxWidth: 260,
        border: `1px solid ${activo ? C.brandBd : C.n500}`, background: activo ? C.brandBg : C.n000, color: activo ? C.brand : C.n900, fontWeight: activo ? 500 : 400 }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{valor ? `${etiqueta}: ${valor}` : etiqueta}</span>
      <IcChevronDown size={12} />
    </button>
  );
}

const opcionStyle = (on: boolean) => ({
  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' as const, padding: '8px 12px', border: 'none', borderRadius: radius.sm, cursor: 'pointer',
  fontSize: 12, fontFamily: FONT, background: on ? C.brandBg : 'transparent', color: on ? C.brand : C.n900, fontWeight: on ? 500 : 400,
});

/** Filtro de una opción: «Todos» lo limpia. Las opciones pueden llevar un ícono (logo del módulo). */
export function FiltroOpciones({ etiqueta, value, onChange, opciones, todos = 'Todos' }: {
  etiqueta: string; value: string; onChange: (v: string) => void; opciones: { value: string; label: string; icono?: ReactNode }[]; todos?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const elegir = (v: string) => { onChange(v); setAbierto(false); };
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <BotonFiltro etiqueta={etiqueta} valor={opciones.find(o => o.value === value)?.label} abierto={abierto} onClick={() => setAbierto(v => !v)} />
      <Popover open={abierto} onClose={() => setAbierto(false)} width={260}>
        <div role="listbox" aria-label={etiqueta} style={{ padding: 6, maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button type="button" role="option" aria-selected={!value} onClick={() => elegir('')} style={opcionStyle(!value)}>{todos}</button>
          {opciones.map(o => (
            <button key={o.value} type="button" role="option" aria-selected={o.value === value} onClick={() => elegir(o.value)} style={opcionStyle(o.value === value)}>
              {o.icono}{o.label}
            </button>
          ))}
        </div>
      </Popover>
    </span>
  );
}

/** Filtro de catálogo con varias opciones a la vez: «Todos» limpia la selección, el menú no se cierra al marcar,
 *  la etiqueta muestra el valor elegido o la cantidad, y con más de 10 opciones incluye un buscador. */
export function FiltroMulti({ etiqueta, value, onChange, opciones }: {
  etiqueta: string; value: string[]; onChange: (v: string[]) => void; opciones: { value: string; label: string; icono?: ReactNode }[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const sinTildes = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visibles = opciones.filter(o => !q || sinTildes(o.label).includes(sinTildes(q)));
  const alternar = (v: string) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  const valor = value.length === 1 ? opciones.find(o => o.value === value[0])?.label : undefined;
  const fila = (on: boolean) => ({ ...opcionStyle(on), fontWeight: 400 });
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <BotonFiltro etiqueta={value.length > 1 ? `${etiqueta} (${value.length})` : etiqueta} valor={valor} activo={value.length > 0} abierto={abierto} onClick={() => setAbierto(v => !v)} />
      <Popover open={abierto} onClose={() => { setAbierto(false); setQ(''); }} width={260}>
        <div role="group" aria-label={etiqueta} style={{ display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
          {opciones.length > 10 && (
            <div style={{ padding: 8, borderBottom: `1px solid ${C.n500}` }}>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Buscar ${etiqueta.toLowerCase()}`} aria-label={`Buscar ${etiqueta.toLowerCase()}`} className="suite-campo"
                style={{ width: '100%', height: 30, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 10px', fontSize: 12, fontFamily: FONT, boxSizing: 'border-box' }} />
            </div>
          )}
          <div style={{ padding: 6, maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label style={fila(!value.length)}><input type="checkbox" checked={!value.length} onChange={() => onChange([])} />Todos</label>
            {visibles.map(o => (
              <label key={o.value} style={fila(value.includes(o.value))}>
                <input type="checkbox" checked={value.includes(o.value)} onChange={() => alternar(o.value)} />{o.icono}{o.label}
              </label>
            ))}
          </div>
        </div>
      </Popover>
    </span>
  );
}

// ── Período de fechas ───────────────────────────────────────────────────────
export interface Rango { desde: string; hasta: string }
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dia = (f: string) => new Date(f + 'T12:00:00');

/** Rangos predefinidos a partir de la fecha de hoy. */
function periodos(h: string): [string, Rango][] {
  const d = dia(h);
  const lunes = new Date(d); lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
  const finMes = (y: number, m: number) => iso(new Date(y, m + 1, 0, 12));
  const y = d.getFullYear(), m = d.getMonth(), t = Math.floor(m / 3) * 3;
  return [
    ['Hoy', { desde: h, hasta: h }],
    ['Esta semana', { desde: iso(lunes), hasta: iso(domingo) }],
    ['Este mes', { desde: iso(new Date(y, m, 1, 12)), hasta: finMes(y, m) }],
    ['Mes anterior', { desde: iso(new Date(y, m - 1, 1, 12)), hasta: finMes(y, m - 1) }],
    ['Este trimestre', { desde: iso(new Date(y, t, 1, 12)), hasta: finMes(y, t + 2) }],
    ['Este año', { desde: `${y}-01-01`, hasta: `${y}-12-31` }],
  ];
}

/** Texto del botón para un rango: el nombre del período si coincide, o «dd/mm/aaaa – dd/mm/aaaa». */
export function textoRango(r: Rango) {
  if (!r.desde && !r.hasta) return '';
  const p = periodos(hoy()).find(([, x]) => x.desde === r.desde && x.hasta === r.hasta);
  return p ? p[0] : `${r.desde ? fmtF(r.desde) : '…'} – ${r.hasta ? fmtF(r.hasta) : '…'}`;
}

export function FiltroFechas({ value, onChange, etiqueta = 'Fechas' }: { value: Rango; onChange: (r: Rango) => void; etiqueta?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState(value);
  const abrir = () => { setBorrador(value); setAbierto(v => !v); };
  const aplicar = (r: Rango) => { onChange(r); setAbierto(false); };
  const campo = (k: keyof Rango, label: string) => (
    <label style={{ display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr)', alignItems: 'center', gap: 10, fontSize: 12, color: C.n700 }}>
      {label}
      <input type="date" value={borrador[k]} onChange={e => setBorrador({ ...borrador, [k]: e.target.value })} className="suite-campo"
        style={{ height: SIZE.control, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 10px', fontSize: 12, fontFamily: FONT, color: C.n900, minWidth: 0 }} />
    </label>
  );
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <BotonFiltro etiqueta={etiqueta} valor={textoRango(value)} abierto={abierto} onClick={abrir} />
      <Popover open={abierto} onClose={() => setAbierto(false)} width={340}>
        <div role="dialog" aria-label="Período de fecha" style={{ fontFamily: FONT }}>
          <p style={{ margin: 0, padding: '14px 16px', fontSize: 13, fontWeight: 600, color: C.n900, borderBottom: `1px solid ${C.n500}` }}>Período de fecha</p>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {periodos(hoy()).map(([nombre, r]) => (
                <button key={nombre} type="button" onClick={() => aplicar(r)}
                  style={{ height: 34, border: `1px solid ${textoRango(value) === nombre ? C.brandBd : C.n500}`, borderRadius: radius.md, background: textoRango(value) === nombre ? C.brandBg : C.n000,
                    color: textoRango(value) === nombre ? C.brand : C.n900, fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}>{nombre}</button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: C.n700 }}>Rango personalizado</span>
            {campo('desde', 'Desde')}
            {campo('hasta', 'Hasta')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderTop: `1px solid ${C.n500}` }}>
            <button type="button" onClick={() => aplicar({ desde: '', hasta: '' })}
              style={{ marginRight: 'auto', background: 'none', border: 'none', padding: 0, color: C.error, fontSize: 12, fontFamily: FONT, cursor: 'pointer', textDecoration: 'underline' }}>Limpiar</button>
            <Button variant="secondary" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={() => aplicar(borrador)} disabled={!!borrador.desde && !!borrador.hasta && borrador.desde > borrador.hasta}>Aplicar</Button>
          </div>
        </div>
      </Popover>
    </span>
  );
}

/** El día (AAAA-MM-DD) cae dentro del rango; un rango vacío incluye todo. */
export const enRango = (f: string, r: Rango) => (!r.desde || f >= r.desde) && (!r.hasta || f <= r.hasta);
