'use client';
// Selección de perfiles a sincronizar al integrar un módulo: junta los perfiles del módulo y de los módulos enlazados
// (por ejemplo Accounting y Front Desk) y los agrupa por número de identificación, sin importar guiones ni espacios. Un
// mismo número en varios módulos o en el MAN es un solo perfil; si sus datos generales no coinciden se marcan para
// revisarlos antes de sincronizar. Un nombre igual con otra identificación se marca como posible duplicado.
import { useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Buscador, Celda, Fila, FilaVacia, Insignia, LinkButton, Tabla, norm } from '@/components/kit';
import { CheckFila, CheckTodos, type Seleccion } from '@/components/layout/Pantalla';
import { siglaModulo } from '../../catalogo';
import { normId, perfilesDelModulo, type PerfilEntrante } from '../../datos/sincronizacion';
import type { ModuloId, Perfil } from '../../tipos';
import { camposDistintos, nombreBase } from './comparar';

export interface Grupo {
  id: string; nombre: string; man?: Perfil; versiones: Partial<Record<ModuloId, PerfilEntrante>>;
  /** Datos generales que no coinciden entre el MAN y los módulos. */
  diferencias: string[];
  duplicadoDe?: string;
}

/** Agrupa por identificación los perfiles de los módulos y los del MAN. */
export function agrupar(fuentes: ModuloId[], actuales: Perfil[]): Grupo[] {
  const grupos = new Map<string, Grupo>();
  for (const f of fuentes) for (const e of perfilesDelModulo(f)) {
    const id = normId(e.identificacion);
    const g = grupos.get(id) ?? { id, nombre: '', versiones: {}, diferencias: [], man: actuales.find(p => normId(p.identificacion) === id) };
    g.versiones[f] = e;
    g.nombre = g.man?.nombre ?? (g.nombre || e.nombre);
    grupos.set(id, g);
  }
  const lista = [...grupos.values()];
  for (const g of lista) g.diferencias = camposDistintos([...(g.man ? [g.man] : []), ...Object.values(g.versiones)]).map(([, label]) => label);
  // Mismo nombre con otra identificación (en los módulos o en el MAN): puede ser el mismo cliente mal registrado.
  const todos = [...lista.map(g => ({ id: g.id, nombre: g.nombre })), ...actuales.map(p => ({ id: normId(p.identificacion), nombre: p.nombre }))];
  for (const g of lista) {
    const otro = todos.find(x => x.id !== g.id && nombreBase(x.nombre) === nombreBase(g.nombre));
    if (otro) g.duplicadoDe = `${otro.nombre} · ${otro.id}`;
  }
  return lista;
}
/** Perfil elegido con datos distintos que todavía no se revisó: hay que revisarlo antes de sincronizar. */
export const faltaRevisar = (g: Grupo, revisados: Record<string, unknown>) => g.diferencias.length > 0 && !revisados[g.id];
/** Hay más de una versión del perfil: en varios módulos, o en un módulo y en el MAN. */
export const seUne = (g: Grupo) => Object.keys(g.versiones).length + (g.man ? 1 : 0) > 1;

export function UnificarPerfiles({ grupos, fuentes, s, revisados, onRevisar }: {
  grupos: Grupo[]; fuentes: ModuloId[]; s: Seleccion; revisados: Record<string, Partial<Perfil>>; onRevisar: (g: Grupo) => void;
}) {
  const [vista, setVista] = useState<'todos' | 'unen' | 'distintos' | 'nuevos' | 'duplicados'>('todos');
  const [q, setQ] = useState('');
  const cumple = (g: Grupo) => (vista === 'todos' || (vista === 'unen' ? seUne(g) : vista === 'distintos' ? g.diferencias.length > 0 : vista === 'nuevos' ? !g.man : !!g.duplicadoDe));
  const visibles = grupos.filter(g => cumple(g) && (!q || norm(`${g.nombre} ${g.id}`).includes(norm(q))));
  const tiles: [string, number][] = [['Perfiles', grupos.length], ['Se unen', grupos.filter(seUne).length], ['Con datos distintos', grupos.filter(g => g.diferencias.length).length],
    ['Nuevos en el MAN', grupos.filter(g => !g.man).length], ['Posibles duplicados', grupos.filter(g => g.duplicadoDe).length], ['Elegidos', s.n]];
  const pill = (id: typeof vista, label: string) => (
    <button type="button" aria-pressed={vista === id} onClick={() => setVista(id)}
      style={{ height: 30, padding: '0 12px', borderRadius: radius.pill, fontSize: 12, fontFamily: FONT, cursor: 'pointer',
        border: `1px solid ${vista === id ? C.brandBd : C.n500}`, background: vista === id ? C.brandBg : C.n000, color: vista === id ? C.brand : C.n900 }}>{label}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: C.n900 }}>Selecciona los perfiles para sincronizar</p>
        <span style={{ fontSize: 12, color: C.n700 }}>Se unen por número de identificación, sin importar guiones ni espacios: el mismo número en varios módulos es un solo perfil. Si el nombre, el correo, el teléfono u otro dato general no coincide, se marca «Datos distintos» y hay que revisarlo para elegir qué dato queda en el MAN. «Posible duplicado» marca un nombre igual con otra identificación.</span>
      </div>
      <div className="kit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
        {tiles.map(([t, n]) => (
          <div key={t} style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '8px 12px' }}>
            <span style={{ display: 'block', fontSize: 11.5, color: C.n700 }}>{t}</span>
            <span style={{ fontSize: 17, fontWeight: 600, color: C.n900 }}>{n}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Buscador value={q} onChange={setQ} placeholder="Nombre o identificación" width={240} />
        {pill('todos', 'Todos')}{pill('unen', 'Se unen')}{pill('distintos', 'Datos distintos')}{pill('nuevos', 'Nuevos')}{pill('duplicados', 'Posibles duplicados')}
      </div>
      <Tabla headers={[<CheckTodos key="t" s={s} ids={visibles.map(g => g.id)} />, 'Perfil', ...fuentes.map(f => `En ${siglaModulo(f)}`), 'En el MAN', 'Resultado']}
        anchos={{ 0: 32, [fuentes.length + 3]: 250 }}>
        {visibles.length === 0 && <FilaVacia cols={fuentes.length + 4} />}
        {visibles.map(g => (
          <Fila key={g.id}>
            <Celda><CheckFila s={s} id={g.id} label={`Elegir ${g.nombre}`} /></Celda>
            <Celda style={{ whiteSpace: 'normal' }}>{g.nombre} <span style={{ fontSize: 11.5, color: C.n700 }}>· {g.id}</span></Celda>
            {fuentes.map(f => (
              <Celda key={f}>{g.versiones[f]
                ? <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>{g.versiones[f]!.roles.map(r => <Insignia key={r} label={r} color="brand" />)}</span>
                : <span style={{ color: C.n700 }}>—</span>}</Celda>
            ))}
            <Celda muted>{g.man ? 'Ya existe' : 'No'}</Celda>
            <Celda>
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {seUne(g) ? <Insignia label="Se une" color="blue" /> : <Insignia label="Nuevo" color="green" />}
                {g.diferencias.length > 0 && !revisados[g.id] && <span title={`No coincide: ${g.diferencias.join(', ')}`}><Insignia label="Datos distintos" color="yellow" /></span>}
                {g.duplicadoDe && <span title={`Mismo nombre que ${g.duplicadoDe}`}><Insignia label="Posible duplicado" color="yellow" /></span>}
                {revisados[g.id] && <Insignia label="Revisado" color="green" />}
                {(seUne(g) || g.duplicadoDe) && <LinkButton onClick={() => onRevisar(g)}>Revisar datos</LinkButton>}
              </span>
              {g.diferencias.length > 0 && !revisados[g.id] && <span style={{ display: 'block', fontSize: 11.5, color: C.n700, marginTop: 4 }}>No coincide: {g.diferencias.join(', ').toLowerCase()}</span>}
            </Celda>
          </Fila>
        ))}
      </Tabla>
    </div>
  );
}
