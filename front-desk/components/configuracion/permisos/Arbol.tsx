'use client';
// Árbol de permisos (mismo patrón que la suite): categoría › módulo en acordeón
// › grupos con sus permisos en tres columnas. Los permisos «por tipo» muestran
// sus opciones como chips. Cada nivel tiene «Marcar todo» / «Quitar todo».
import { useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Chevron, norm } from '../kit';
import { ARBOL, TOTAL, TODAS_LAS_HOJAS, clavesDe, clavesDeHojas, contar, hojasDe, marcada, type Hoja, type Modulo } from './datosPermisos';

type Cambiar = (claves: string[], on: boolean) => void;

function MarcarQuitar({ onMarcar, onQuitar }: { onMarcar: () => void; onQuitar: () => void }) {
  const b = (color: string): React.CSSProperties => ({ border: 'none', background: 'none', padding: 0, color, textDecoration: 'underline', cursor: 'pointer', fontSize: 12, fontFamily: FONT });
  return <span style={{ display: 'inline-flex', gap: 14 }}>
    <button type="button" onClick={onMarcar} style={b(C.brand)}>Marcar todo</button>
    <button type="button" onClick={onQuitar} style={b(C.error)}>Quitar todo</button>
  </span>;
}
const Cuenta = ({ n, total }: { n: number; total: number }) => <span style={{ fontSize: 12, color: n === total && total > 0 ? '#2E7D32' : C.n700, fontVariantNumeric: 'tabular-nums' }}>{n}/{total}</span>;

function Casilla({ on, parcial }: { on: boolean; parcial?: boolean }) {
  return <span aria-hidden style={{ width: 16, height: 16, flexShrink: 0, borderRadius: 4, border: `1.5px solid ${on ? C.brand : C.n500}`, background: on ? C.brand : C.n000, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, lineHeight: 1 }}>
    {on ? (parcial ? '–' : '✓') : ''}</span>;
}

function FilaPermiso({ x, p, cambiar }: { x: Hoja; p: Set<string>; cambiar: Cambiar }) {
  const on = marcada(x, p);
  const elegidas = (x.subOpciones ?? []).filter(o => p.has(`${x.key}:${o}`));
  const parcial = !!x.subOpciones && elegidas.length > 0 && elegidas.length < x.subOpciones.length;
  return (
    <div style={{ breakInside: 'avoid', padding: '8px 10px', borderRadius: radius.md, background: on ? C.brandBg : 'transparent', marginBottom: 6 }}>
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
        <input type="checkbox" checked={on} onChange={() => cambiar(clavesDe(x), !on)} aria-label={x.label} style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} />
        <span style={{ marginTop: 1 }}><Casilla on={on} parcial={parcial} /></span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 12.5, color: C.n900 }}>{x.label}</span>
          {x.desc && <span style={{ display: 'block', fontSize: 11, color: C.n700, marginTop: 2 }}>{x.desc}</span>}
        </span>
      </label>
      {x.subOpciones && (
        <div role="group" aria-label={`Opciones de ${x.label}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 0 26px' }}>
          {x.subOpciones.map(o => {
            const sel = p.has(`${x.key}:${o}`);
            return <button key={o} type="button" aria-pressed={sel} onClick={() => cambiar([`${x.key}:${o}`], !sel)}
              style={{ border: `1px solid ${sel ? C.brand : C.n500}`, background: sel ? C.brand : C.n000, color: sel ? '#fff' : C.n700, borderRadius: radius.pill, padding: '3px 10px', fontSize: 11, fontFamily: FONT, cursor: 'pointer' }}>{o}</button>;
          })}
        </div>
      )}
    </div>
  );
}

function Columnas({ hojas, p, cambiar }: { hojas: Hoja[]; p: Set<string>; cambiar: Cambiar }) {
  return <div style={{ columnCount: 3, columnGap: 18, columnRule: `1px solid ${C.n500}` }}>{hojas.map(x => <FilaPermiso key={x.key} x={x} p={p} cambiar={cambiar} />)}</div>;
}

function TarjetaModulo({ m, p, cambiar, filtro, abierto, onAbrir }: { m: Modulo; p: Set<string>; cambiar: Cambiar; filtro: (x: Hoja, grupo?: string) => boolean; abierto: boolean; onAbrir: () => void }) {
  const todas = hojasDe(m);
  const sueltas = (m.hojas ?? []).filter(x => filtro(x));
  const grupos = (m.grupos ?? []).map(gr => ({ gr, hojas: gr.hojas.filter(x => filtro(x, gr.label)) })).filter(x => x.hojas.length);
  return (
    <section style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card }}>
      <button type="button" onClick={onAbrir} aria-expanded={abierto}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}>
        <Chevron abierto={abierto} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.n900 }}>{m.label}</span>
        <Cuenta n={contar(todas, p)} total={todas.length} />
      </button>
      {abierto && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <MarcarQuitar onMarcar={() => cambiar(clavesDeHojas(todas), true)} onQuitar={() => cambiar(clavesDeHojas(todas), false)} />
          {sueltas.length > 0 && <Columnas hojas={sueltas} p={p} cambiar={cambiar} />}
          {grupos.map(({ gr, hojas }) => (
            <div key={gr.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.n900 }}>{gr.label}</span>
                <span style={{ marginLeft: 'auto' }}><Cuenta n={contar(gr.hojas, p)} total={gr.hojas.length} /></span>
              </div>
              <Columnas hojas={hojas} p={p} cambiar={cambiar} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ArbolPermisos({ permisos, onChange, busqueda = '', cabecera }: { permisos: Set<string>; onChange: (p: Set<string>) => void; busqueda?: string; cabecera?: ReactNode }) {
  const [abiertos, setAbiertos] = useState<string[]>([]);
  const cambiar: Cambiar = (claves, on) => {
    const n = new Set(permisos);
    claves.forEach(k => (on ? n.add(k) : n.delete(k)));
    onChange(n);
  };
  const q = norm(busqueda.trim());
  const filtroDe = (m: Modulo) => (x: Hoja, grupo?: string) => !q || [m.label, grupo, x.label, x.desc, ...(x.subOpciones ?? [])].some(t => norm(t).includes(q));
  const caja: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '10px 14px', fontSize: 12.5 };
  const modsDe = (cat: (typeof ARBOL)[number]) => cat.modulos.filter(m => !q || hojasDe(m).some(x => filtroDe(m)(x, m.grupos?.find(gr => gr.hojas.includes(x))?.label)));
  const visibles = ARBOL.reduce((n, cat) => n + modsDe(cat).length, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT }}>
      {cabecera}
      <div style={caja}>
        <span>Todos los permisos · <Cuenta n={contar(TODAS_LAS_HOJAS, permisos)} total={TOTAL} /></span>
        <span style={{ marginLeft: 'auto' }}><MarcarQuitar onMarcar={() => cambiar(clavesDeHojas(TODAS_LAS_HOJAS), true)} onQuitar={() => cambiar(clavesDeHojas(TODAS_LAS_HOJAS), false)} /></span>
      </div>
      {ARBOL.map(cat => {
        const mods = modsDe(cat);
        if (!mods.length) return null;
        const hojas = cat.modulos.flatMap(hojasDe);
        return (
          <div key={cat.key} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: C.n700 }}>{cat.label}</span>
              <Cuenta n={contar(hojas, permisos)} total={hojas.length} />
              <span style={{ marginLeft: 'auto' }}><MarcarQuitar onMarcar={() => cambiar(clavesDeHojas(hojas), true)} onQuitar={() => cambiar(clavesDeHojas(hojas), false)} /></span>
            </div>
            {mods.map(m => (
              <TarjetaModulo key={m.key} m={m} p={permisos} cambiar={cambiar} filtro={filtroDe(m)} abierto={!!q || abiertos.includes(m.key)}
                onAbrir={() => setAbiertos(a => (a.includes(m.key) ? a.filter(x => x !== m.key) : [...a, m.key]))} />
            ))}
          </div>
        );
      })}
      {q && !visibles && <p style={{ textAlign: 'center', color: C.n700, fontSize: 12.5, padding: 30 }}>Ningún permiso coincide con «{busqueda}».</p>}
    </div>
  );
}
