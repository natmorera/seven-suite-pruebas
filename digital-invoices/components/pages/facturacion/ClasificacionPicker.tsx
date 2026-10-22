'use client';
import { useState } from 'react';
import { C, radius } from '@/components/ui/primitives';
import { buscarClasificacion, type ClasificacionGT } from '@/lib/perfilPais';

// Guatemala: búsqueda de la clasificación del artículo, como el CABYS de
// Costa Rica. Al elegirla se completan bien o servicio, unidad, IVA, ITH y el
// motivo de la exención.
export default function ClasificacionPicker({ valor, onElegir }: { valor: ClasificacionGT | undefined; onElegir: (c: ClasificacionGT) => void }) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const lista = buscarClasificacion(texto).slice(0, 12);
  const resumen = (c: ClasificacionGT) => [c.bienServicio === 'B' ? 'Bien' : 'Servicio', c.unidadIva === 1 ? 'IVA 12 %' : 'Sin IVA', c.unidadIth === 1 ? 'ITH 10 %' : ''].filter(Boolean).join(' · ');
  return (
    <div style={{ position: 'relative' }}>
      <input value={abierto ? texto : valor ? valor.nombre : texto} onFocus={() => { setAbierto(true); setTexto(''); }} onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onChange={e => { setTexto(e.target.value); setAbierto(true); }} placeholder="Busca: habitación, desayuno, tour, medicamento…" aria-label="Clasificación del artículo"
        style={{ width: '100%', height: 32, padding: '0 10px', border: `1px solid ${C.n500}`, borderRadius: radius.sm, fontSize: 12, fontFamily: 'inherit', color: C.n900, boxSizing: 'border-box' }} />
      {abierto && (
        <div style={{ position: 'absolute', top: 36, left: 0, right: 0, zIndex: 20, background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.md, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 300, overflowY: 'auto' }}>
          {lista.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12, color: C.n700 }}>Sin resultados. Prueba con otra palabra.</div>}
          {lista.map(c => (
            <button key={c.id} type="button" onMouseDown={e => { e.preventDefault(); onElegir(c); setTexto(''); setAbierto(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', borderBottom: `1px solid ${C.n200}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.n900 }}>{c.nombre}</div>
              <div style={{ fontSize: 11, color: C.n700 }}>{resumen(c)} · {c.ejemplos}</div>
            </button>
          ))}
        </div>
      )}
      {valor && !abierto && <div style={{ fontSize: 11, color: C.n700, marginTop: 4 }}>{resumen(valor)}{valor.escenarioExencion ? ' · lleva la frase de exención en la factura' : ''}</div>}
    </div>
  );
}
