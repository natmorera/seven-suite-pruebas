'use client';
// Provincia → Cantón → Distrito encadenados, con los códigos que pide el XML
// de Hacienda (1 + 2 + 2 dígitos). Si la empresa es de Guatemala: departamento,
// municipio y código postal, en los mismos tres campos.
import { useSyncExternalStore } from 'react';
import { FormField, Select, Input } from './primitives';
import { PROVINCIAS, type Provincia } from '@/data/divisionTerritorial';
import { usePaisEmpresa } from '@/lib/paisCliente';
import { DEPARTAMENTOS_GT, PREFIJO_DEPARTAMENTO, esUbicacionGT, nombreDepartamento } from '@/lib/perfilPais';

// La división territorial sale de la base (se actualiza con el script de
// catálogos); mientras carga, o si falla, se usa la que trae el sistema.
let cargadas: Record<string, Provincia> | null = null;
let solicitud: Promise<void> | null = null;
const oyentes = new Set<() => void>();
function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  if (!solicitud) {
    solicitud = fetch('/api/catalogos/ubicaciones').then(r => r.json()).then((d: Record<string, Provincia>) => {
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
  if (esUbicacionGT(u.provincia)) return [u.canton, nombreDepartamento(String(u.provincia))].filter(Boolean).join(', ');
  const p = u.provincia ? PROVINCIAS[u.provincia] : undefined;
  const c = p && u.canton ? p.cantones[u.canton] : undefined;
  const d = c && u.distrito ? c.distritos[u.distrito] : undefined;
  return [d, c?.nombre, p?.nombre].filter(Boolean).join(', ');
}

const VACIO = { value: '', label: '-' };

export default function UbicacionCR({ value, onChange, required }: { value: Ubicacion; onChange: (u: Ubicacion) => void; required?: boolean }) {
  const { gt } = usePaisEmpresa();
  const PROVINCIAS = useProvincias();
  if (gt || esUbicacionGT(value.provincia)) {
    const depto = esUbicacionGT(value.provincia) ? value.provincia : '';
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <FormField label="Departamento" required={required}>
          <Select value={depto} onChange={v => onChange({ ...value, provincia: v })}
            options={[VACIO, ...Object.keys(DEPARTAMENTOS_GT).map(k => ({ value: PREFIJO_DEPARTAMENTO + k, label: DEPARTAMENTOS_GT[k] }))]} />
        </FormField>
        <FormField label="Municipio" required={required}>
          <Input value={depto ? value.canton : ''} onChange={v => onChange({ ...value, provincia: depto, canton: v })} placeholder="Ej. Flores" />
        </FormField>
        <FormField label="Código postal" required={required}>
          <Input value={depto ? value.distrito : ''} onChange={v => onChange({ ...value, provincia: depto, distrito: v.replace(/\D/g, '').slice(0, 5) })} placeholder="Ej. 17001" />
        </FormField>
      </div>
    );
  }
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
