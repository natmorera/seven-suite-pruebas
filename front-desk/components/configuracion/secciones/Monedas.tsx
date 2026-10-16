'use client';
// Configuración › Parámetros generales › Monedas y Tipo de cambio (misma forma que Accounting).
// La moneda principal es la de referencia; cada divisa toma su tasa vigente del registro más reciente de Tipo de cambio.
import { type ReactNode } from 'react';
import { AccionesEnHeader } from '@/components/layout/Pantalla';
import { C, FONT } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Select, StatusBadge } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { useDato } from '../store';
import { Aviso, Campo, ConfigCard, Grid, IcTrash, IconButton, uid, useConfirmar } from '../kit';
import type { Moneda, TipoCambio } from '../datos';

/** Divisas que se pueden agregar (código ISO 4217, nombre y símbolo). */
export const CATALOGO_MONEDAS: [string, string, string][] = [
  ['CRC', 'Colón Costarricense', '₡'], ['USD', 'Dólar Americano', '$'], ['EUR', 'Euro', '€'], ['CAD', 'Dólar Canadiense', 'CA$'],
  ['GBP', 'Libra Esterlina', '£'], ['MXN', 'Peso Mexicano', 'MX$'], ['JPY', 'Yen Japonés', '¥'], ['CHF', 'Franco Suizo', 'CHF'],
];

export const fmtTasa = (n: number) => n.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 10 });

/** Último registro de tipo de cambio de una moneda (la tasa vigente). */
export const tasaVigente = (tc: TipoCambio[], codigo: string) =>
  tc.filter(t => t.moneda === codigo).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

const DEPOSITOS = ['ADE - DEP ADELANTADO EFECTIVO', 'ADT - DEP ADELANTADO TARJETA'];

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
    set([...l, { id: uid(), codigo, descripcion, simbolo, comision: 0, decimales: 2, convertible: true, facturable: false, referencia: false, activo: true, empresa: '100 - Hotel', depAdelantados: '', pagoParcial: '' }]);
  };
  const cambiarMoneda = (id: string, codigo: string) => {
    const [, descripcion, simbolo] = CATALOGO_MONEDAS.find(([c]) => c === codigo)!;
    patch(id, { codigo, descripcion, simbolo });
  };
  const opciones = (m: Moneda) => CATALOGO_MONEDAS.filter(([c]) => c === m.codigo || !l.some(x => x.codigo === c)).map(([c, d, s]) => ({ value: c, label: `${s} ${d}` }));

  return (
    <ConfigCard title="Configuración de monedas" subtitle="Moneda principal del sistema y divisas disponibles.">
      <AccionesEnHeader><Button icon={<IcPlus size={12} />} onClick={agregar} disabled={!libres.length}>Agregar divisa</Button></AccionesEnHeader>
      <Aviso>
        La moneda principal no puede cambiarse una vez se registren movimientos. Las divisas pueden activarse o desactivarse en cualquier
        momento. El tipo de cambio se gestiona en la pestaña <b>Tipo de cambio</b>.
      </Aviso>
      <Bloque titulo="Moneda principal" sub="Moneda base del sistema.">
        <FilaMoneda m={principal} opciones={opciones(principal)} fija />
        <span style={{ fontSize: 12, color: C.n700 }}>Ya hay movimientos registrados, así que la moneda principal quedó fija.</span>
        <DatosFrontDesk m={principal} patch={p => patch(principal.id, p)} />
      </Bloque>
      {divisas.map((m, i) => {
        const vig = tasaVigente(tc, m.codigo);
        return (
          <Bloque key={m.id} titulo={`Divisa ${i + 1}`} acciones={<>
            <button type="button" onClick={() => patch(m.id, { activo: !m.activo })} aria-label={m.activo ? `Desactivar ${m.codigo}` : `Activar ${m.codigo}`}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}><StatusBadge label={m.activo ? 'Activa' : 'Inactiva'} color={m.activo ? 'green' : 'gray'} /></button>
            <IconButton label={`Eliminar ${m.descripcion}`} tono="peligro" onClick={() => pedir('Eliminar divisa', `¿Eliminar ${m.codigo} - ${m.descripcion}?`, () => set(l.filter(x => x.id !== m.id)))}><IcTrash /></IconButton>
          </>}>
            <FilaMoneda m={m} opciones={opciones(m)} onCambiar={c => cambiarMoneda(m.id, c)} />
            <span style={{ fontSize: 12, color: C.n700 }}>
              {vig ? <>Tasa actual ({vig.fuente}): <b style={{ color: C.n900, fontWeight: 600 }}>{fmtTasa(vig.tasa)}</b> · Se actualiza en Tipo de cambio</> : 'Sin tasa registrada · Agrégala en Tipo de cambio'}
            </span>
            <DatosFrontDesk m={m} patch={p => patch(m.id, p)} />
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

/** Datos que usa Front Desk de cada moneda: comisión de canje, decimales y servicios de depósito. */
function DatosFrontDesk({ m, patch }: { m: Moneda; patch: (p: Partial<Moneda>) => void }) {
  const ops = (xs: string[]) => [{ value: '', label: 'Seleccionar' }, ...xs.map(x => ({ value: x, label: x }))];
  return (
    <details style={{ fontSize: 12.5, color: C.n900 }}>
      <summary style={{ cursor: 'pointer', color: 'var(--brand)', fontSize: 12.5 }}>Uso en Front Desk</summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
        <Grid cols={4}>
          <Campo label="Comisión de canje (%)"><Input type="number" value={m.comision} onChange={v => patch({ comision: Number(v) || 0 })} /></Campo>
          <Campo label="Decimales"><Input type="number" value={m.decimales} onChange={v => patch({ decimales: Math.max(0, Math.min(4, Number(v) || 0)) })} /></Campo>
          <Campo label="Depósitos adelantados"><Select value={m.depAdelantados} onChange={v => patch({ depAdelantados: v })} options={ops(DEPOSITOS)} /></Campo>
          <Campo label="Pago parcial tarjeta de crédito"><Select value={m.pagoParcial} onChange={v => patch({ pagoParcial: v })} options={ops(DEPOSITOS)} /></Campo>
        </Grid>
        <div style={{ display: 'flex', gap: 24 }}>
          <Checkbox checked={m.convertible} onChange={b => patch({ convertible: b })} label="Convertible (canje de divisas)" />
          <Checkbox checked={m.facturable} onChange={b => patch({ facturable: b })} label="Facturable" />
        </div>
      </div>
    </details>
  );
}
