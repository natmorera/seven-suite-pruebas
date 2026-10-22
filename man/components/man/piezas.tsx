'use client';
// Piezas compartidas por las pantallas del MAN: chip y logo de módulo, estado de conexión y prueba de conexión simulada.
import { useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Isotipo } from '@/components/suite/ModulosSuite';
import { Insignia } from '@/components/kit';
import { infoModulo } from './catalogo';
import type { EstadoConexion, ModuloId } from './tipos';

/** Isotipo del módulo en sus colores. */
export function IsotipoModulo({ m, size = 14 }: { m: ModuloId; size?: number }) {
  return <Isotipo colores={infoModulo(m).colores} size={size} />;
}

/** Módulo mencionado en tablas y textos: chip con su isotipo y su sigla en el color del módulo (el nombre completo va en el título); opcionalmente un detalle. */
export function ChipModulo({ m, children }: { m: ModuloId; children?: ReactNode }) {
  const info = infoModulo(m);
  return (
    <span title={info.nombre} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: radius.pill, border: `1px solid ${C.n500}`,
      background: C.n000, fontSize: 11.5, fontWeight: 600, fontFamily: FONT, lineHeight: 1.35, color: info.texto, whiteSpace: 'nowrap' }}>
      <IsotipoModulo m={m} size={11} />{info.sigla}
      {children && <span style={{ color: C.n700, fontWeight: 400 }}>· {children}</span>}
    </span>
  );
}

/** Isotipo del módulo en su recuadro de color, con el nombre y la sigla al lado. */
export function LogoModulo({ m, size = 32, sub }: { m: ModuloId; size?: number; sub?: ReactNode }) {
  const info = infoModulo(m);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0, fontFamily: FONT }}>
      <span aria-hidden style={{ width: size, height: size, borderRadius: radius.md, background: info.fondo, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Isotipo colores={info.colores} size={Math.round(size * 0.55)} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: C.n900, lineHeight: 1.3 }}>{info.nombre}</span>
        <span style={{ fontSize: 11, color: info.texto, fontWeight: 600, letterSpacing: '.03em' }}>{sub ?? info.sigla}</span>
      </span>
    </span>
  );
}

export function EstadoConexionChip({ estado }: { estado: EstadoConexion | 'Probando' }) {
  if (estado === 'Probando') return <Insignia label="Probando…" color="gray" />;
  return <Insignia label={estado} color={estado === 'Conectada' ? 'green' : estado === 'Error' ? 'red' : 'gray'} />;
}

/** Fecha y hora actual en formato AAAA-MM-DDTHH:MM. */
export const ahora = () => { const d = new Date(); return `${d.toISOString().slice(0, 10)}T${d.toTimeString().slice(0, 5)}`; };

/**
 * Prueba de conexión simulada (sin backend): tarda un momento y devuelve el resultado.
 * Un destino vacío o marcado con «error» falla; el resto conecta.
 */
export function useProbarConexion(onResultado: (id: string, estado: EstadoConexion) => void) {
  const [probando, setProbando] = useState<string[]>([]);
  const probar = (id: string, destino: string) => {
    setProbando(p => [...p, id]);
    setTimeout(() => {
      setProbando(p => p.filter(x => x !== id));
      onResultado(id, !destino.trim() || /error/i.test(destino) ? 'Error' : 'Conectada');
    }, 700);
  };
  return { probar, probando: (id: string) => probando.includes(id) };
}

/** Opciones de un filtro de módulos, con el isotipo de cada uno. */
export const opcionesModulos = (ids: ModuloId[]) =>
  ids.map(m => ({ value: m, label: infoModulo(m).sigla, icono: <IsotipoModulo m={m} /> }));
