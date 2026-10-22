'use client';
// Lista desplegable de selección múltiple: muestra lo elegido en el campo y
// abre una lista con casillas. Sirve para listas que pueden crecer.
import { useEffect, useRef, useState } from 'react';
import { C, FONT } from './tokens';
import { IcChevronDown } from './icons';

export default function MultiSelect({ value, onChange, options, placeholder = 'Ninguna', ariaLabel }: {
  value: string[]; onChange: (v: string[]) => void; options: { value: string; label: string }[]; placeholder?: string; ariaLabel?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc); };
  }, [abierto]);
  const elegidas = options.filter(o => value.includes(o.value));
  const alternar = (v: string) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  return (
    <div ref={raiz} style={{ position: 'relative', width: '100%', fontFamily: FONT }}>
      <button type="button" aria-haspopup="listbox" aria-expanded={abierto} aria-label={ariaLabel} onClick={() => setAbierto(a => !a)}
        style={{ width: '100%', height: 32, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${abierto ? C.brand : C.n500}`,
          borderRadius: 4, background: C.n000, cursor: 'pointer', fontSize: 12, fontFamily: FONT, color: elegidas.length ? C.n900 : C.n700, textAlign: 'left' }}>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {elegidas.length ? elegidas.map(o => o.label).join(', ') : placeholder}
        </span>
        <IcChevronDown className="w-3 h-3" />
      </button>
      {abierto && (
        <div role="listbox" aria-multiselectable style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, background: C.n000,
          border: `1px solid ${C.n500}`, borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,.12)', padding: 4, maxHeight: 240, overflowY: 'auto' }}>
          {options.map(o => {
            const activa = value.includes(o.value);
            return (
              <label key={o.value} role="option" aria-selected={activa}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: C.n900, background: activa ? C.brandBg : 'transparent' }}>
                <input type="checkbox" aria-label="Seleccionar" checked={activa} onChange={() => alternar(o.value)} />
                {o.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
