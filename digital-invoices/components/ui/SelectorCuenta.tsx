'use client';
// Selector de cuenta contable único de la suite. Mismo diseño que el filtro
// de cuenta del Analítico de cuentas: botón con «código · nombre» y un panel
// con «Seleccionar cuenta», chips de nivel (Detalle / Auxiliar), buscador por
// código o nombre y la lista con el código en negrita. Se usa en formularios
// (CuentaCampo), en compras (CuentaSelect) y en configuración.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, radius } from './primitives';

export interface OpcionCuenta { code: string; nombre: string; nivel?: string; grupo?: string; ruta?: string[] }

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const NIVEL_TXT: Record<string, string> = { detalle: 'Detalle', auxiliar: 'Auxiliar' };
const Check = () => <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={C.brand} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M2 7l3.5 3.5L12 3" /></svg>;
const Chevron = () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M3.5 5.25L7 8.75L10.5 5.25" /></svg>;

export default function SelectorCuenta({
  value, onChange, opciones, nueva, titulo = 'Seleccionar cuenta', placeholder = 'Buscar cuenta', compacto, sugerencia, error, opcional,
  grupos, grupoInicial, ancho,
}: {
  value: string;
  onChange: (code: string, esNueva: boolean) => void;
  opciones: OpcionCuenta[];
  nueva?: OpcionCuenta | null;           // cuenta auxiliar que se crearía (tercero sin cuenta)
  titulo?: string;
  placeholder?: string;
  compacto?: boolean;
  sugerencia?: string;                   // texto corto debajo: «Sugerida por cédula»…
  error?: string;
  opcional?: boolean;                    // permite quitar la cuenta
  grupos?: { value: string; label: string }[];   // chips de grupo (p. ej. 6 · Gastos)
  grupoInicial?: string;
  ancho?: number;                        // ancho del panel (por defecto 460, como el Analítico)
}) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const [nivel, setNivel] = useState('');
  const [grupo, setGrupo] = useState(grupoInicial ?? '');
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; arriba: boolean; alto: number } | null>(null);
  const W = Math.min(ancho ?? 460, typeof window === 'undefined' ? 460 : window.innerWidth - 16);

  const actual = opciones.find(o => o.code === value) ?? (nueva && nueva.code === value ? nueva : null);
  const esNueva = Boolean(nueva && value === nueva.code && !opciones.some(o => o.code === value));
  const niveles = useMemo(() => Array.from(new Set(opciones.map(o => o.nivel).filter((n): n is string => Boolean(n && NIVEL_TXT[n])))), [opciones]);
  const lista = useMemo(() => {
    const t = sinTildes(q.trim());
    return opciones.filter(o => (!nivel || o.nivel === nivel) && (!grupo || o.grupo === grupo)
      && (!t || o.code.includes(t) || sinTildes(o.nombre).includes(t) || (o.ruta ?? []).some(r => sinTildes(r).includes(t)))).slice(0, 200);
  }, [opciones, q, nivel, grupo]);
  const mostrarNueva = nueva && !opciones.some(o => o.code === nueva.code) && (!q.trim() || sinTildes(nueva.nombre).includes(sinTildes(q.trim())) || nueva.code.includes(q.trim()));

  useLayoutEffect(() => {
    if (!abierto) return;
    const medir = () => {
      const r = boton.current?.getBoundingClientRect(); if (!r) return;
      const abajo = window.innerHeight - r.bottom;
      const arriba = abajo < 440 && r.top > abajo;
      // Alto de la lista según el espacio libre (encabezado y pie ≈ 190 px)
      const alto = Math.max(140, Math.min(260, (arriba ? r.top : abajo) - 200));
      setPos({ top: arriba ? r.top - 4 : r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - W - 8)), arriba, alto });
    };
    medir();
    window.addEventListener('scroll', medir, true); window.addEventListener('resize', medir);
    return () => { window.removeEventListener('scroll', medir, true); window.removeEventListener('resize', medir); };
  }, [abierto, W]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { const n = e.target as Node; if (!panel.current?.contains(n) && !boton.current?.contains(n)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setAbierto(false); } };
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc, true); };
  }, [abierto]);

  const elegir = (code: string, n: boolean) => { onChange(code, n); setAbierto(false); };
  const activo = Boolean(value);
  const chip = (sel: boolean, texto: ReactNode, onClick: () => void) => (
    <button type="button" onClick={onClick}
      style={{ height: 26, padding: '0 12px', border: `1px solid ${sel ? C.brand : C.n500}`, borderRadius: radius.pill, background: sel ? C.brand : '#fff',
        color: sel ? '#fff' : '#0F0F0F', cursor: 'pointer', fontSize: 11, fontFamily: FONT, fontWeight: sel ? 600 : 400, whiteSpace: 'nowrap' }}>{texto}</button>
  );

  return (
    <div style={{ minWidth: 0 }}>
      <button ref={boton} type="button" onClick={() => { setQ(''); setAbierto(v => !v); }} title={actual ? `${actual.code} · ${actual.nombre}` : value || undefined}
        style={{ width: '100%', minHeight: compacto ? 28 : 34, padding: compacto ? '2px 8px' : '4px 12px', boxSizing: 'border-box',
          border: `1px solid ${error ? C.error : activo ? C.brand : C.n500}`, borderRadius: compacto ? 4 : radius.md,
          background: esNueva || activo ? C.brandBg : '#fff', cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 6,
          color: activo ? C.brand : C.n700, textAlign: 'left' }}>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {actual ? (
            <>
              <span style={{ display: 'block', fontSize: compacto ? 11.5 : 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.n900 }}>
                <b style={{ fontWeight: 600, color: C.brand, fontVariantNumeric: 'tabular-nums' }}>{actual.code}</b> · {actual.nombre}
              </span>
              {!compacto && actual.ruta && actual.ruta.length > 0 && <span style={{ display: 'block', fontSize: 10.5, color: C.n700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actual.ruta.join(' › ')}</span>}
            </>
          ) : <span style={{ fontSize: compacto ? 11.5 : 12.5 }}>{value || placeholder}</span>}
        </span>
        <Chevron />
      </button>
      {(error || sugerencia || esNueva) && !abierto && (
        <div style={{ fontSize: 10.5, color: error ? C.error : esNueva ? C.brandDk : C.n700, marginTop: 2 }}>{error ?? (esNueva ? 'Cuenta nueva: se crea al guardar' : sugerencia)}</div>
      )}

      {abierto && pos && typeof document !== 'undefined' && createPortal(
        <div ref={panel} data-flotante role="dialog" aria-label={titulo}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: W, transform: pos.arriba ? 'translateY(-100%)' : undefined, zIndex: 1600,
            background: '#fff', border: `1px solid ${C.n500}`, borderRadius: radius.lg, boxShadow: '0 8px 32px rgba(0,0,0,.16)', fontFamily: FONT }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.n500}` }}>
            <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 8px', color: C.n900 }}>{titulo}</p>
            {(niveles.length > 1 || (grupos && grupos.length > 0)) && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                {niveles.length > 1 && <>
                  {chip(!nivel, 'Todas', () => setNivel(''))}
                  {niveles.map(n => <span key={n}>{chip(nivel === n, NIVEL_TXT[n], () => setNivel(n))}</span>)}
                </>}
                {grupos && grupos.length > 0 && <>
                  {niveles.length > 1 && <span style={{ width: 1, background: C.n500, margin: '0 4px' }} />}
                  {chip(!grupo, 'Todos los grupos', () => setGrupo(''))}
                  {grupos.map(g => <span key={g.value}>{chip(grupo === g.value, g.label, () => setGrupo(g.value))}</span>)}
                </>}
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.3" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }}><circle cx="6.5" cy="6.5" r="4.5" /><path d="M11 11l-2-2" /></svg>
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por código o nombre…"
                onKeyDown={e => { if (e.key === 'Enter' && lista.length === 1) elegir(lista[0].code, false); }}
                style={{ width: '100%', height: 32, paddingLeft: 26, paddingRight: 8, border: `1px solid ${C.n500}`, borderRadius: radius.sm, fontSize: 12, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ maxHeight: pos.alto, overflowY: 'auto', padding: '6px 0 4px' }}>
            {mostrarNueva && nueva && (
              <div onClick={() => elegir(nueva.code, true)}
                style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 12, background: C.brandBg, borderBottom: `1px solid ${C.n500}` }}>
                <div style={{ fontWeight: 600, color: C.brandDk }}>+ Crear cuenta auxiliar {nueva.code}</div>
                <div style={{ fontSize: 11, color: C.n700 }}>{nueva.nombre}</div>
              </div>
            )}
            {opcional && (
              <div onClick={() => elegir('', false)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', cursor: 'pointer', fontSize: 12, color: !value ? C.brand : C.n700, background: !value ? C.brandBg : '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.background = C.n200)} onMouseLeave={e => (e.currentTarget.style.background = !value ? C.brandBg : '#fff')}>
                <span>Sin cuenta</span>{!value && <Check />}
              </div>
            )}
            {lista.map(o => {
              const sel = o.code === value;
              return (
                <div key={o.code} onClick={() => elegir(o.code, false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, background: sel ? C.brandBg : '#fff' }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.n200)} onMouseLeave={e => (e.currentTarget.style.background = sel ? C.brandBg : '#fff')}>
                  <div style={{ display: 'flex', gap: 10, minWidth: 0, alignItems: 'baseline' }}>
                    <span style={{ color: C.brand, fontWeight: 600, minWidth: 110, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{o.code}</span>
                    <span style={{ minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ display: 'block', color: '#0F0F0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.nombre}</span>
                      {q.trim() && o.ruta && o.ruta.length > 0 && <span style={{ display: 'block', fontSize: 10.5, color: C.n700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.ruta.join(' › ')}</span>}
                    </span>
                  </div>
                  {sel && <Check />}
                </div>
              );
            })}
            {lista.length === 0 && !mostrarNueva && <p style={{ padding: '10px 14px', fontSize: 12, color: C.n700, margin: 0 }}>Sin resultados</p>}
          </div>
          <div style={{ padding: '8px 14px', borderTop: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={() => setAbierto(false)} style={{ height: 28, padding: '0 12px', border: `1px solid ${C.n500}`, borderRadius: radius.sm, background: '#fff', cursor: 'pointer', fontSize: 11, fontFamily: FONT }}>Cancelar</button>
          </div>
        </div>, document.body)}
    </div>
  );
}
