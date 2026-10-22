'use client';
// Configuración › Parámetros generales › Monedas y Tipo de cambio (misma forma que Accounting).
// La moneda principal es la de referencia; cada divisa toma su tasa vigente del registro más reciente de Tipo de cambio.
import { type ReactNode } from 'react';
import { AccionesEnHeader } from '@/components/layout/Pantalla';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Input, Select } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { useDato } from '../store';
import { Aviso, Campo, ConfigCard, IcTrash, IconButton, uid, useConfirmar } from '../kit';
import type { Moneda, TipoCambio } from '../datos';

/** Divisas que se pueden agregar (código ISO 4217, nombre y símbolo). */
export const CATALOGO_MONEDAS: [string, string, string][] = [
  ['CRC', 'Colón costarricense', '₡'], ['NIO', 'Córdoba nicaragüense', 'C$'], ['GTQ', 'Quetzal guatemalteco', 'Q'],
  ['USD', 'Dólar estadounidense', '$'], ['EUR', 'Euro', '€'],
];

export const fmtTasa = (n: number) => n.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 10 });

/** Último registro de tipo de cambio de una moneda (la tasa vigente). */
export const tasaVigente = (tc: TipoCambio[], codigo: string) =>
  tc.filter(t => t.moneda === codigo).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

export default function Monedas() {
  const [l, set] = useDato('monedas');
  const [tc] = useDato('tiposCambio');
  const { pedir, dialogo } = useConfirmar();
  const principal = l.find(m => m.referencia) ?? l[0];
  const divisas = l.filter(m => m.id !== principal.id);
  const libres = CATALOGO_MONEDAS.filter(([c]) => !l.some(m => m.codigo === c));
  const patch = (id: string, p: Partial<Moneda>) => set(l.map(m => (m.id === id ? { ...m, ...p } : m)));
  const agregar = () => {
    const [codigo, descripcion, simbolo] = libres[0];
    set([...l, { id: uid(), codigo, descripcion, simbolo, referencia: false, activo: true }]);
  };
  const cambiarMoneda = (id: string, codigo: string) => {
    const [, descripcion, simbolo] = CATALOGO_MONEDAS.find(([c]) => c === codigo)!;
    patch(id, { codigo, descripcion, simbolo });
  };
  const opciones = (m: Moneda) => CATALOGO_MONEDAS.filter(([c]) => c === m.codigo || !l.some(x => x.codigo === c)).map(([c, d, s]) => ({ value: c, label: `${s} ${d}` }));

  return (
    <ConfigCard title="Configuración de monedas" subtitle="Moneda principal del sistema y divisas disponibles.">
      <AccionesEnHeader><Button icon={<IcPlus size={12} />} onClick={agregar} disabled={!libres.length}>Agregar divisa</Button></AccionesEnHeader>
      <Aviso tono="warning">
        La moneda principal no puede cambiarse una vez se registren movimientos. Las divisas pueden activarse o desactivarse en cualquier
        momento. El tipo de cambio se gestiona en la pestaña <b>Tipo de cambio</b>.
      </Aviso>
      <Bloque titulo="Moneda principal" sub="Moneda base del sistema.">
        <FilaMoneda m={principal} opciones={opciones(principal)} fija />
        <span style={{ fontSize: 12, color: C.n700 }}>Ya hay movimientos registrados, así que la moneda principal quedó fija.</span>
      </Bloque>
      {divisas.map((m, i) => {
        const vig = tasaVigente(tc, m.codigo);
        return (
          <Bloque key={m.id} titulo={`Divisa ${i + 1}`} acciones={<>
            <button type="button" onClick={() => patch(m.id, { activo: !m.activo })} aria-label={m.activo ? `Desactivar ${m.codigo}` : `Activar ${m.codigo}`}
              style={{ background: C.n000, border: `1px solid ${m.activo ? 'var(--brand)' : C.n500}`, color: m.activo ? 'var(--brand)' : C.n700, borderRadius: radius.pill, padding: '3px 12px', fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}>
              {m.activo ? 'Activa' : 'Inactiva'}
            </button>
            <IconButton label={`Eliminar ${m.descripcion}`} tono="peligro" onClick={() => pedir('Eliminar divisa', `¿Eliminar ${m.codigo} - ${m.descripcion}?`, () => set(l.filter(x => x.id !== m.id)))}><IcTrash /></IconButton>
          </>}>
            <FilaMoneda m={m} opciones={opciones(m)} onCambiar={c => cambiarMoneda(m.id, c)} />
            <span style={{ fontSize: 12, color: C.n700 }}>
              {vig ? <>Tasa actual ({vig.fuente}): <b style={{ color: C.n900, fontWeight: 600 }}>{fmtTasa(vig.tasa)}</b> · Se actualiza en Tipo de cambio</> : 'Sin tasa registrada · Agrégala en Tipo de cambio'}
            </span>
          </Bloque>
        );
      })}
      {dialogo}
    </ConfigCard>
  );
}

function Bloque({ titulo, sub, acciones, children }: { titulo: string; sub?: string; acciones?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16, borderTop: `1px solid ${C.n500}`, fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ marginRight: 'auto' }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 500, margin: 0, color: C.n900 }}>{titulo}</h3>
          {sub && <p style={{ fontSize: 12, color: C.n700, margin: '2px 0 0' }}>{sub}</p>}
        </div>
        {acciones}
      </div>
      {children}
    </div>
  );
}

function FilaMoneda({ m, opciones, fija, onCambiar }: { m: Moneda; opciones: { value: string; label: string }[]; fija?: boolean; onCambiar?: (c: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 110px', gap: 12 }}>
      <Campo label="Moneda"><Select value={m.codigo} onChange={v => onCambiar?.(v)} options={opciones} disabled={fija} /></Campo>
      <Campo label="Símbolo"><Input value={m.simbolo} onChange={() => undefined} disabled /></Campo>
    </div>
  );
}
