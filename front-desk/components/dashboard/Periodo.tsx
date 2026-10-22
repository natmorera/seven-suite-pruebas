'use client';
// Filtro de período del header del Dashboard (el mismo de la suite): botón «Período: …» que abre un modal con
// atajos a la izquierda y un calendario de dos meses para elegir un rango (doble clic = una sola fecha).
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, SIZE, radius, shadow, Z } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';
import { ATAJOS, resolverRango, type RangoSel, type Sentido } from './datos';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const fmt = (d: string) => (d ? d.split('-').reverse().join('/') : '');
const isoMes = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;
const sigMes = (ym: string, n: number) => { const [y, m] = ym.split('-').map(Number); const f = new Date(y, m - 1 + n, 1); return isoMes(f.getFullYear(), f.getMonth()); };
/** dd/mm/aaaa → aaaa-mm-dd (vacío si no es una fecha válida). */
const leer = (t: string) => { const m = t.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (!m) return ''; const d = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; return isNaN(new Date(d + 'T12:00:00').getTime()) ? '' : d; };

export function FiltroPeriodo({ valor, onChange, dia, sentido, label = 'Período' }: { valor: RangoSel; onChange: (v: RangoSel) => void; dia: string; sentido: Sentido; label?: string }) {
  const [open, setOpen] = useState(false);
  const atajo = ATAJOS[sentido].find(a => a.id === valor.r);
  const [d, h] = resolverRango(dia, sentido, valor);
  const texto = atajo ? atajo.label : d === h ? fmt(d) : `${fmt(d)} – ${fmt(h)}`;
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="suite-campo"
      style={{ height: SIZE.control, padding: '0 12px', border: `1px solid ${C.n500}`, borderRadius: radius.control, background: C.n000, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: FONT, color: C.n900, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      <span style={{ color: C.n700 }}>{label}:</span><b style={{ fontWeight: 600 }}>{texto}</b>
      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden style={{ marginLeft: 2 }}><path d="M3.5 5.25L7 8.75L10.5 5.25" /></svg>
    </button>
    {open && <ModalPeriodo valor={valor} dia={dia} sentido={sentido} label={label} onClose={() => setOpen(false)} onAplicar={v => { onChange(v); setOpen(false); }} />}
  </>;
}

function ModalPeriodo({ valor, dia, sentido, label, onClose, onAplicar }: { valor: RangoSel; dia: string; sentido: Sentido; label: string; onClose: () => void; onAplicar: (v: RangoSel) => void }) {
  const [r, setR] = useState(valor.r);
  const [ini, fin] = resolverRango(dia, sentido, valor);
  const [desde, setDesde] = useState(ini);
  const [hasta, setHasta] = useState(fin);
  const [eligiendo, setEligiendo] = useState(false);
  const [sobre, setSobre] = useState('');
  const [mes, setMes] = useState(ini.slice(0, 7));
  const [txt, setTxt] = useState({ d: fmt(ini), h: fmt(fin) });
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);

  const fijar = (a: string, b: string, id = 'personalizado') => {
    const [x, y] = a <= b ? [a, b] : [b, a];
    setDesde(x); setHasta(y); setR(id); setTxt({ d: fmt(x), h: fmt(y) });
  };
  const elegirAtajo = (id: string) => { const [a, b] = ATAJOS[sentido].find(x => x.id === id)!.calc(dia); fijar(a, b, id); setMes(a.slice(0, 7)); setEligiendo(false); };
  const clic = (d: string) => {
    if (!eligiendo) { setDesde(d); setHasta(d); setEligiendo(true); setR('personalizado'); setTxt({ d: fmt(d), h: fmt(d) }); }
    else { fijar(desde, d); setEligiendo(false); }
  };
  const [vd, vh] = eligiendo && sobre ? (sobre < desde ? [sobre, desde] : [desde, sobre]) : [desde, hasta];
  const nombreAtajo = ATAJOS[sentido].find(a => a.id === r)?.label ?? 'Personalizado';

  const mesCal = (ym: string, izq: boolean) => {
    const [y, m] = ym.split('-').map(Number);
    const primero = new Date(y, m - 1, 1).getDay();
    const total = new Date(y, m, 0).getDate();
    const celdas = [...Array(primero).fill(''), ...Array.from({ length: total }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)];
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          {izq ? <NavBtn label="Mes anterior" onClick={() => setMes(sigMes(mes, -1))}>‹</NavBtn> : <span style={{ width: 32 }} />}
          <b style={{ fontSize: 13.5, fontWeight: 600 }}>{MESES[m - 1]} {y}</b>
          {!izq ? <NavBtn label="Mes siguiente" onClick={() => setMes(sigMes(mes, 1))}>›</NavBtn> : <span style={{ width: 32 }} />}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 4, textAlign: 'center' }}>
          {DIAS.map(x => <span key={x} style={{ fontSize: 11, color: C.n700, padding: '4px 0' }}>{x}</span>)}
          {celdas.map((x, i) => {
            if (!x) return <span key={i} />;
            const borde = x === vd || x === vh, dentro = x > vd && x < vh, hoy = x === dia;
            return (
              <button key={x} type="button" aria-label={fmt(x)} aria-pressed={borde} onClick={() => clic(x)} onDoubleClick={() => { fijar(x, x); setEligiendo(false); }}
                onMouseEnter={() => setSobre(x)}
                style={{ height: 34, border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, fontVariantNumeric: 'tabular-nums',
                  background: borde ? C.brand : dentro ? C.brandBg : 'transparent', color: borde ? '#fff' : C.n900, fontWeight: borde || hoy ? 600 : 400,
                  borderRadius: borde ? 999 : dentro ? 0 : 999, outline: hoy && !borde ? `1px solid ${C.brandBd}` : undefined, outlineOffset: -2 }}>
                {Number(x.slice(8))}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: Z.modal, background: 'rgba(15,15,15,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: FONT }} onClick={onClose}>
      <div role="dialog" aria-label={`${label}: elegir período`} onClick={e => e.stopPropagation()}
        style={{ background: C.n000, borderRadius: radius.card, width: 860, maxWidth: '100%', maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: shadow.modal }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.n500}` }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: SIZE.control, padding: '0 12px', border: `1px solid ${C.n500}`, borderRadius: radius.control, fontSize: 12.5 }}>
            <span style={{ color: C.n700 }}>{label}:</span><b style={{ fontWeight: 600 }}>{nombreAtajo}</b>
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(0, 1fr)', minHeight: 0, overflowY: 'auto' }}>
          <nav aria-label="Atajos" style={{ borderRight: `1px solid ${C.n500}`, padding: '10px 0' }}>
            {[...ATAJOS[sentido].map(a => ({ id: a.id, label: a.label })), { id: 'personalizado', label: 'Personalizado' }].map(a => {
              const on = r === a.id;
              return <button key={a.id} type="button" aria-pressed={on} onClick={() => (a.id === 'personalizado' ? setR('personalizado') : elegirAtajo(a.id))}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 18px', border: 'none', background: on ? C.brandBg : 'transparent', color: on ? C.brand : C.n900, fontWeight: on ? 600 : 400, fontSize: 13, fontFamily: FONT, cursor: 'pointer' }}>{a.label}</button>;
            })}
          </nav>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '9px 14px', borderRadius: radius.md, background: C.brandBg, border: `1px solid ${C.brandBd}`, fontSize: 12.5, color: C.n900 }}>
              Para seleccionar una única fecha, haga doble clic en la fecha deseada.
            </div>
            <div style={{ display: 'flex', gap: 24 }} onMouseLeave={() => setSobre('')}>
              {mesCal(mes, true)}
              <span style={{ width: 1, background: C.n500 }} />
              {mesCal(sigMes(mes, 1), false)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {(['d', 'h'] as const).map((k, i) => (
                <span key={k} style={{ display: 'contents' }}>
                  {i === 1 && <span style={{ color: C.n700 }}>–</span>}
                  <input value={txt[k]} aria-label={k === 'd' ? 'Desde' : 'Hasta'} placeholder="DD/MM/AAAA" className="suite-campo"
                    onChange={e => setTxt(t => ({ ...t, [k]: e.target.value }))}
                    onBlur={() => { const v = leer(txt[k]); if (!v) { setTxt({ d: fmt(desde), h: fmt(hasta) }); return; } if (k === 'd') fijar(v, hasta < v ? v : hasta); else fijar(desde > v ? v : desde, v); setMes((k === 'd' ? v : desde).slice(0, 7)); }}
                    style={{ width: 150, height: SIZE.control, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 10px', fontSize: 12.5, fontFamily: FONT, textAlign: 'center' }} />
                </span>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: C.n700 }}>
                {Math.round((new Date(hasta + 'T12:00:00').getTime() - new Date(desde + 'T12:00:00').getTime()) / 86400000) + 1} días
              </span>
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onAplicar(r === 'personalizado' ? { r: 'personalizado', desde, hasta } : { r, desde: '', hasta: '' })}>Aplicar</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function NavBtn({ label, onClick, children }: { label: string; onClick: () => void; children: string }) {
  return <button type="button" aria-label={label} onClick={onClick}
    style={{ width: 32, height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, background: C.n000, cursor: 'pointer', fontSize: 15, color: C.n900, fontFamily: FONT }}>{children}</button>;
}
