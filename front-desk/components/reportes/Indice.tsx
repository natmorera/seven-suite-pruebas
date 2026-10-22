'use client';
// Índice de reportes de un módulo (pantalla estándar): buscador y tarjetas agrupadas con el nombre y qué muestra
// cada reporte. Al elegir uno se abre su pantalla de reporte (?r=…); desde el reporte, «‹ Reportes» vuelve aquí.
import Link from 'next/link';
import { useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Pantalla } from '@/components/layout/Pantalla';
import { Buscador, norm } from '@/components/configuracion/kit';

export interface ItemIndice { label: string; descripcion: string; href: string }
export interface GrupoIndice { titulo: string; items: ItemIndice[] }

export function IndiceReportes({ titulo, grupos }: { titulo: string; grupos: GrupoIndice[] }) {
  const [q, setQ] = useState('');
  const filtrados = grupos.map(g => ({ ...g, items: g.items.filter(i => !q.trim() || norm(`${i.label} ${i.descripcion}`).includes(norm(q))) })).filter(g => g.items.length);
  const total = grupos.reduce((s, g) => s + g.items.length, 0);
  return (
    <Pantalla titulo={titulo}
      filtros={<Buscador value={q} onChange={setQ} placeholder="Buscar reporte" width={280} />}
      filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>{total} reportes</span>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, fontFamily: FONT }}>
        {filtrados.length === 0 && <p style={{ margin: 0, fontSize: 12.5, color: C.n700 }}>Ningún reporte coincide con la búsqueda.</p>}
        {filtrados.map(g => (
          <section key={g.titulo} aria-label={g.titulo} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 11.5, fontWeight: 600, letterSpacing: '.06em', color: C.n700 }}>{g.titulo.toUpperCase()}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {g.items.map(i => (
                <Link key={i.href} href={i.href} className="suite-fila"
                  style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 16px', background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, textDecoration: 'none', color: C.n900 }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13.5, fontWeight: 600 }}>{i.label}<span aria-hidden style={{ color: C.n700, fontWeight: 400 }}>›</span></span>
                  <span style={{ fontSize: 12, color: C.n700, lineHeight: 1.45 }}>{i.descripcion}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Pantalla>
  );
}
