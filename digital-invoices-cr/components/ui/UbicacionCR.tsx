'use client';
// Provincia → Cantón → Distrito encadenados, con los códigos que pide el XML
// de Hacienda (1 + 2 + 2 dígitos).
import { useSyncExternalStore } from 'react';
import { FormField, Select } from './primitives';
import { PROVINCIAS, type Provincia } from '@/data/divisionTerritorial';

// La división territorial sale de la base (se actualiza con el script de
// catálogos); mientras carga, o si falla, se usa la que trae el sistema.
let cargadas: Record<string, Provincia> | null = null;
let pedido: Promise<void> | null = null;
const oyentes = new Set<() => void>();
function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  if (!pedido) {
    pedido = fetch('/api/catalogos/ubicaciones').then(r => r.json()).then((d: Record<string, Provincia>) => {
      if (d && typeof d === 'object' && Object.keys(d).length) { cargadas = d; oyentes.forEach(f => f()); }
    }).catch(() => {});
  }
  return () => { oyentes.delete(avisar); };
}
export function useProvincias(): Record<string, Provincia> {
  return useSyncExternalStore(suscribir, () => cargadas ?? PROVINCIAS, () => PROVINCIAS);
}

export interface Ubicacion { provincia: string; canton: string; distrito: string }

export function nombreUbicacion(u: Partial<Ubicacion>): string {
  const p = u.provincia ? PROVINCIAS[u.provincia] : undefined;
  const c = p && u.canton ? p.cantones[u.canton] : undefined;
  const d = c && u.distrito ? c.distritos[u.distrito] : undefined;
  return [d, c?.nombre, p?.nombre].filter(Boolean).join(', ');
}

const VACIO = { value: '', label: '-' };

export default function UbicacionCR({ value, onChange, required }: { value: Ubicacion; onChange: (u: Ubicacion) => void; required?: boolean }) {
  const PROVINCIAS = useProvincias();
  const prov = PROVINCIAS[value.provincia];
  const cant = prov?.cantones[value.canton];
  const orden = (o: Record<string, unknown>) => Object.keys(o).sort();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
      <FormField label="Provincia" required={required}>
        <Select value={value.provincia} onChange={v => onChange({ provincia: v, canton: '', distrito: '' })}
          options={[VACIO, ...orden(PROVINCIAS).map(k => ({ value: k, label: PROVINCIAS[k].nombre }))]} />
      </FormField>
      <FormField label="Cantón" required={required}>
        <Select value={value.canton} disabled={!prov} onChange={v => onChange({ ...value, canton: v, distrito: '' })}
          options={[VACIO, ...(prov ? orden(prov.cantones).map(k => ({ value: k, label: prov.cantones[k].nombre })) : [])]} />
      </FormField>
      <FormField label="Distrito" required={required}>
        <Select value={value.distrito} disabled={!cant} onChange={v => onChange({ ...value, distrito: v })}
          options={[VACIO, ...(cant ? orden(cant.distritos).map(k => ({ value: k, label: cant.distritos[k] })) : [])]} />
      </FormField>
    </div>
  );
}
