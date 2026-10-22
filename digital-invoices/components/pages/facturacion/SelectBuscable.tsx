'use client';
// Lista desplegable con buscador propio (para listas largas: centros de
// costo, bodegas…). La lista flota sobre la página para que no se corte.
import { useState } from 'react';
import { C, FONT } from '@/components/ui/primitives';
import { Flotante } from './NuevaFacturaPartes';

export interface OpcionBuscable { value: string; label: string; detalle?: string }

export default function SelectBuscable({ value, onChange, opciones, placeholder = 'Buscar…', vacio }: {
  value: string; onChange: (v: string) => void; opciones: OpcionBuscable[]; placeholder?: string;
  vacio?: string;              // texto de la opción "ninguno" (si se permite dejarlo vacío)
}) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const [ancla, setAncla] = useState<HTMLDivElement | null>(null);
  const actual = opciones.find(o => o.value === value);
  const t = q.trim().toLowerCase();
  const lista = opciones.filter(o => !t || o.label.toLowerCase().includes(t) || (o.detalle ?? '').toLowerCase().includes(t));
  const elegir = (v: string) => { onChange(v); setAbierto(false); setQ(''); };
  return (
    <div ref={setAncla}>
      <input value={abierto ? q : actual ? actual.label : ''} placeholder={abierto ? placeholder : vacio ?? placeholder}
        onFocus={() => { setQ(''); setAbierto(true); }} onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onChange={e => { setQ(e.target.value); setAbierto(true); }}
        style={{ height: 32, padding: '0 10px', border: `1px solid ${abierto ? C.brand : C.n500}`, borderRadius: 4, fontSize: 12, fontFamily: FONT,
          outline: 'none', width: '100%', boxSizing: 'border-box', color: C.n900, background: C.n000 }} />
      <Flotante anchor={ancla} open={abierto}>
        <div>
          {vacio && (
            <div onMouseDown={e => e.preventDefault()} onClick={() => elegir('')}
              style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 12, color: C.n700, borderBottom: `1px solid ${C.n200}` }}>{vacio}</div>
          )}
          {lista.map(o => (
            <div key={o.value} onMouseDown={e => e.preventDefault()} onClick={() => elegir(o.value)}
              onMouseEnter={e => (e.currentTarget.style.background = C.n200)} onMouseLeave={e => (e.currentTarget.style.background = o.value === value ? C.brandBg : '#fff')}
              style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 12, borderBottom: `1px solid ${C.n200}`, background: o.value === value ? C.brandBg : '#fff' }}>
              {o.label}
              {o.detalle && <div style={{ fontSize: 11, color: C.n700 }}>{o.detalle}</div>}
            </div>
          ))}
          {lista.length === 0 && <div style={{ padding: 10, fontSize: 12, color: C.n700 }}>Sin resultados.</div>}
        </div>
      </Flotante>
    </div>
  );
}
