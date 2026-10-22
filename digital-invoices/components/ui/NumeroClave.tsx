'use client';
// Número consecutivo (20 dígitos) y clave numérica (50 dígitos) de un
// comprobante electrónico de Hacienda (v4.4), completos y agrupados para
// leerlos. Los grupos son espacios visuales: al copiar salen los dígitos
// seguidos.
//
// Número consecutivo (20): sucursal 3 · terminal 5 · tipo de comprobante 2 · número 10
// Clave numérica (50):     país 3 (506) · fecha DDMMAA 6 · cédula del emisor 12 ·
//                          consecutivo 20 · situación 1 · código de seguridad 8
import { useState, type CSSProperties } from 'react';
import { C, FONT } from './primitives';

const soloDig = (s: string | null | undefined) => String(s ?? '').replace(/\D/g, '');

const PARTES_CONSECUTIVO: [number, string][] = [[3, 'Sucursal'], [5, 'Terminal'], [2, 'Tipo de comprobante'], [10, 'Número']];
const PARTES_CLAVE: [number, string][] = [[3, 'País (506)'], [6, 'Fecha DDMMAA'], [12, 'Cédula del emisor'], [20, 'Número consecutivo'], [1, 'Situación'], [8, 'Código de seguridad']];

// El consecutivo completo: el guardado si ya tiene 20 dígitos; si no, el que va dentro de la clave.
export function consecutivoCompleto(numero: string | null | undefined, clave?: string | null): string {
  const n = soloDig(numero), k = soloDig(clave);
  if (n.length === 20) return n;
  if (k.length === 50) return k.slice(21, 41);
  return String(numero ?? '');
}

function partir(v: string, partes: [number, string][]) {
  const out: { t: string; nombre: string }[] = [];
  let i = 0;
  for (const [n, nombre] of partes) { out.push({ t: v.slice(i, i + n), nombre }); i += n; }
  return out;
}

function Grupos({ valor, partes, total, style, cortes }: { valor: string; partes: [number, string][]; total: number; style?: CSSProperties; cortes?: number[] }) {
  const v = soloDig(valor);
  const base: CSSProperties = { fontVariantNumeric: 'tabular-nums', letterSpacing: '.01em', ...style };
  if (v.length !== total) return <span style={base}>{valor}</span>;
  const grupos = partir(v, partes);
  return (
    <span style={base} title={grupos.map(g => `${g.nombre}: ${g.t}`).join('\n')}>
      {grupos.map((g, i) => (
        <span key={i}>
          {cortes?.includes(i) && <br />}
          <span style={{ display: 'inline-block', whiteSpace: 'nowrap', marginRight: i < grupos.length - 1 && !cortes?.includes(i + 1) ? 4 : 0 }}>{g.t}</span>
        </span>
      ))}
    </span>
  );
}

export function Consecutivo({ numero, clave, style }: { numero: string | null | undefined; clave?: string | null; style?: CSSProperties }) {
  const v = consecutivoCompleto(numero, clave);
  if (!v) return null;
  return <Grupos valor={v} partes={PARTES_CONSECUTIVO} total={20} style={style} />;
}

// enDosLineas: país, fecha y cédula arriba; consecutivo, situación y código abajo (tablas)
export function Clave({ clave, style, enDosLineas }: { clave: string | null | undefined; style?: CSSProperties; enDosLineas?: boolean }) {
  if (!clave) return null;
  return <Grupos valor={clave} partes={PARTES_CLAVE} total={50} style={style} cortes={enDosLineas ? [3] : undefined} />;
}

// Para las tablas: número (20) y debajo la clave (50), completos.
export function NumeroYClave({ numero, clave }: { numero: string | null | undefined; clave?: string | null }) {
  return (
    <div style={{ fontFamily: FONT, lineHeight: 1.35, whiteSpace: 'nowrap' }}>
      <Consecutivo numero={numero} clave={clave} style={{ display: 'block', fontSize: 11.5, color: C.n900 }} />
      {clave ? <Clave clave={clave} enDosLineas style={{ display: 'block', fontSize: 10.5, color: C.n700, marginTop: 1 }} />
        : <span style={{ display: 'block', fontSize: 10.5, color: C.n700 }}>Sin clave todavía</span>}
    </div>
  );
}

// Para el detalle: etiqueta, valor completo y botón para copiarlo.
export function DatoNumero({ tipo, numero, clave }: { tipo: 'consecutivo' | 'clave'; numero?: string | null; clave?: string | null }) {
  const [copiado, setCopiado] = useState(false);
  const valor = tipo === 'consecutivo' ? consecutivoCompleto(numero, clave) : String(clave ?? '');
  const etiqueta = tipo === 'consecutivo' ? 'Número consecutivo (20 dígitos)' : 'Clave numérica (50 dígitos)';
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: C.n700 }}>{etiqueta}</div>
      <div style={{ fontSize: 13, marginTop: 2, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        {valor ? (tipo === 'consecutivo' ? <Consecutivo numero={valor} /> : <Clave clave={valor} />)
          : <span style={{ color: C.n700, fontSize: 12.5 }}>{tipo === 'clave' ? 'Se genera al emitir' : '-'}</span>}
        {valor && (
          <button type="button" onClick={() => { navigator.clipboard?.writeText(soloDig(valor) || valor); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}
            style={{ background: 'none', border: 'none', padding: 0, color: C.brand, fontFamily: FONT, fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' }}>
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        )}
      </div>
    </div>
  );
}
