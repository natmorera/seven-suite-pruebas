'use client';
// Receptor de factura electrónica: buscador de actividad económica (código o descripción) y consulta a Hacienda
// por cédula, que devuelve la razón social y las actividades inscritas del contribuyente.
import { useEffect, useRef, useState } from 'react';
import { C, FONT, SIZE, radius, shadow, Z } from '@/components/suite/tokens';
import { norm } from '@/components/configuracion/kit';
import { ACTIVIDADES_ECONOMICAS, type ActividadEconomica } from '@/components/hotel/actividadesEconomicas';

export const textoActividad = (a: ActividadEconomica) => `${a.codigo} · ${a.nombre}`;

/** Campo con búsqueda: escribe un código o parte de la descripción y elige de la lista. */
export function BuscadorActividad({ value, onChange, extra = [], disabled, error }: {
  value: string; onChange: (v: string) => void; extra?: ActividadEconomica[]; disabled?: boolean; error?: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const fuera = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [open]);
  const todas = [...extra, ...ACTIVIDADES_ECONOMICAS.filter(a => !extra.some(x => x.codigo === a.codigo))];
  const lista = todas.filter(a => !q.trim() || norm(textoActividad(a)).includes(norm(q.trim()))).slice(0, 60);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input value={open ? q : value} disabled={disabled} placeholder="Buscar por código o descripción" aria-label="Código de actividad económica" className="suite-campo"
        onFocus={() => { setQ(''); setOpen(true); }} onChange={e => { setQ(e.target.value); setOpen(true); }}
        style={{ width: '100%', boxSizing: 'border-box', height: SIZE.control, padding: '0 10px', border: `1px solid ${error ? C.error : C.n500}`, borderRadius: radius.control, fontSize: 12, fontFamily: FONT, background: disabled ? C.n200 : C.n000, color: C.n900, outline: 'none' }} />
      {open && !disabled && (
        <div role="listbox" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, minWidth: 380, maxHeight: 280, overflowY: 'auto', background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.md, boxShadow: shadow.panel, zIndex: Z.dropdown, padding: 4 }}>
          {lista.length === 0 && <p style={{ margin: 0, padding: 10, fontSize: 12, color: C.n700 }}>Sin resultados. Consulta la cédula en Hacienda para traer sus actividades.</p>}
          {lista.map(a => {
            const t = textoActividad(a);
            return <button key={a.codigo} type="button" role="option" aria-selected={t === value} onClick={() => { onChange(t); setOpen(false); }} className="suite-fila"
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', border: 'none', background: t === value ? C.brandBg : 'none', borderRadius: radius.control, fontSize: 12, fontFamily: FONT, color: C.n900, cursor: 'pointer' }}>
              <b style={{ fontWeight: 600 }}>{a.codigo}</b> · {a.nombre}{extra.some(x => x.codigo === a.codigo) && <span style={{ color: C.success, marginLeft: 6 }}>· inscrita en Hacienda</span>}
            </button>;
          })}
        </div>
      )}
    </div>
  );
}

/** Consulta a Hacienda por cédula (ruta /api/hacienda/contribuyente). */
export async function consultarHacienda(cedula: string): Promise<{ nombre: string; regimen: string; actividades: ActividadEconomica[] } | { error: string }> {
  try {
    const r = await fetch(`/api/hacienda/contribuyente?id=${encodeURIComponent(cedula.replace(/\D/g, ''))}`);
    const d = await r.json();
    return r.ok ? d : { error: d.error ?? 'No se pudo consultar Hacienda.' };
  } catch {
    return { error: 'No se pudo consultar Hacienda (sin conexión).' };
  }
}
