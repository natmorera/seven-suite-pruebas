'use client';
// Frases de FEL de la empresa: las del RTU (según afiliación y régimen), las
// que se agregan solas al emitir y las que se agregan a mano con resolución.
import { useState } from 'react';
import { C, Button, FormField, Input, Select, StatusBadge, radius, DataTable, DataRow, Td } from '@/components/ui/primitives';
import { IcPlus, IcTrash } from '@/components/ui/icons';
import {
  TIPOS_FRASE, ESCENARIOS_FRASE, nombreTipoFrase, escenarioFrase, pideNumeroResolucion, pideFechaResolucion, type FraseEmisor,
} from '@/lib/perfilPais';

const textoFrase = (f: FraseEmisor) => {
  const base = escenarioFrase(f.tipo, f.escenario)?.texto ?? '';
  if (f.tipo === 1 && f.escenario === 3) return `${base} (${f.resolucion || '[resolución]'} - ${f.fecha ? f.fecha.split('-').reverse().join('/') : '[fecha]'})`;
  if (f.tipo === 7) return base.replace('[resolución]', f.resolucion || '[resolución]');
  return base;
};

export default function TablaFrases({ rtu, manuales, onChange, puedeEditar }: {
  rtu: FraseEmisor[]; manuales: FraseEmisor[]; onChange: (f: FraseEmisor[]) => void; puedeEditar: boolean;
}) {
  const vacia: FraseEmisor = { tipo: 8, escenario: ESCENARIOS_FRASE[8][0].escenario, resolucion: '', fecha: '', origen: 'manual' };
  const [nueva, setNueva] = useState<FraseEmisor | null>(null);
  const [error, setError] = useState('');
  const todas = [...rtu, ...manuales];
  const tiposManuales = TIPOS_FRASE.filter(t => [1, 7, 8].includes(t.tipo));
  function agregar() {
    if (!nueva) return;
    if (pideNumeroResolucion(nueva.tipo, nueva.escenario) && !nueva.resolucion.trim()) { setError('Escribe el número de resolución.'); return; }
    if (pideFechaResolucion(nueva.tipo, nueva.escenario) && !nueva.fecha) { setError('Elige la fecha de resolución.'); return; }
    if (todas.some(f => f.tipo === nueva.tipo && f.escenario === nueva.escenario)) { setError('Esa frase ya está.'); return; }
    onChange([...manuales, nueva]); setNueva(null); setError('');
  }
  // De dónde sale cada frase y cuándo hay que agregar una
  const explicacion: [string, string][] = [
    ['Del RTU (automáticas)', 'Salen de la afiliación al IVA, el régimen de ISR y si eres agente de retención. Cambian solas si cambias esos datos: un hotel en régimen General suele tener una o dos.'],
    ['De cada documento (al emitir)', 'No se configuran: se agregan al emitir cuando aplican. Exento o no afecto (tipo 4), factura especial (tipo 5) y ubicación temporal (tipo 9).'],
    ['Agregadas (con resolución)', 'Solo si la SAT te dio una resolución: exención de ISR (tipo 8), pago directo del ISR (tipo 1) o régimen electrónico (tipo 7). Usa «Agregar frase», elige tipo y escenario, escribe la resolución y guarda los cambios.'],
  ];
  return <>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
      {explicacion.map(([t, d]) => (
        <div key={t} style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '10px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.n900 }}>{t}</div>
          <div style={{ fontSize: 11.5, color: C.n700, marginTop: 4, lineHeight: 1.45 }}>{d}</div>
        </div>
      ))}
    </div>
    <DataTable headers={['Tipo', 'Escenario', 'Texto en el documento', 'Origen', 'Resolución', 'Fecha', '']}>
      {todas.map(f => (
        <DataRow key={`${f.origen}-${f.tipo}-${f.escenario}`}>
          <Td>{f.tipo} · {nombreTipoFrase(f.tipo)}</Td>
          <Td>{f.escenario}</Td>
          <Td>{textoFrase(f)}</Td>
          <Td><StatusBadge label={f.origen === 'rtu' ? 'Automática del RTU' : 'Agregada'} color={f.origen === 'rtu' ? 'brand' : 'gray'} /></Td>
          <Td muted>{pideNumeroResolucion(f.tipo, f.escenario) ? f.resolucion || '-' : 'No aplica'}</Td>
          <Td muted>{pideFechaResolucion(f.tipo, f.escenario) ? (f.fecha ? f.fecha.split('-').reverse().join('/') : '-') : 'No aplica'}</Td>
          <Td>
            {f.origen === 'manual' && puedeEditar && (
              <button onClick={() => onChange(manuales.filter(x => !(x.tipo === f.tipo && x.escenario === f.escenario)))} title="Quitar" aria-label="Quitar frase"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, display: 'inline-flex', padding: 4 }}><IcTrash className="w-4 h-4" /></button>
            )}
          </Td>
        </DataRow>
      ))}
      {!todas.length && <DataRow><Td colSpan={7}><span style={{ color: C.n700 }}>Todavía no hay frases.</span></Td></DataRow>}
    </DataTable>
    {puedeEditar && !nueva && <div><Button variant="secondary" icon={<IcPlus />} onClick={() => setNueva(vacia)}>Agregar frase</Button></div>}
    {nueva && (
      <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Tipo de frase" required>
            <Select value={String(nueva.tipo)} onChange={v => { const t = Number(v); setNueva({ ...nueva, tipo: t, escenario: ESCENARIOS_FRASE[t][0].escenario, resolucion: '', fecha: '' }); }}
              options={tiposManuales.map(t => ({ value: String(t.tipo), label: `${t.tipo} · ${t.nombre}` }))} />
          </FormField>
          <FormField label="Escenario" required>
            <Select value={String(nueva.escenario)} onChange={v => setNueva({ ...nueva, escenario: Number(v), resolucion: '', fecha: '' })}
              options={ESCENARIOS_FRASE[nueva.tipo].map(e => ({ value: String(e.escenario), label: `${e.escenario} · ${e.nombre}` }))} />
          </FormField>
          <FormField label="Número de resolución" required={pideNumeroResolucion(nueva.tipo, nueva.escenario)}
            hint={pideNumeroResolucion(nueva.tipo, nueva.escenario) ? 'El de la resolución de afiliación especial de la SAT.' : 'No aplica a esta frase.'}>
            <Input value={nueva.resolucion} onChange={v => setNueva({ ...nueva, resolucion: v })} disabled={!pideNumeroResolucion(nueva.tipo, nueva.escenario)} />
          </FormField>
          <FormField label="Fecha de resolución" required={pideFechaResolucion(nueva.tipo, nueva.escenario)}
            hint={pideFechaResolucion(nueva.tipo, nueva.escenario) ? undefined : 'No aplica a esta frase.'}>
            <Input value={nueva.fecha} onChange={v => setNueva({ ...nueva, fecha: v })} type="date" disabled={!pideFechaResolucion(nueva.tipo, nueva.escenario)} />
          </FormField>
        </div>
        <FormField label="Texto que se imprimirá"><Input value={textoFrase(nueva)} onChange={() => {}} readOnly /></FormField>
        {error && <p style={{ fontSize: 11.5, color: C.error, margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => { setNueva(null); setError(''); }}>Cancelar</Button>
          <Button onClick={agregar}>Agregar frase</Button>
        </div>
      </div>
    )}
  </>;
}
