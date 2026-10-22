'use client';
// Parámetros › Monedas, con la forma de Accounting: moneda principal + divisas. Cada divisa toma su tasa vigente
// del registro más reciente de Tipo de cambio, y cada módulo indica qué usa de ella (panel «Uso por módulo»).
import { type ReactNode } from 'react';
import { AccionesEnHeader } from '@/components/layout/Pantalla';
import { C, FONT } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Select } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { useDato } from '../../store';
import { Campo, ConfigCard, Grid, IconButton, IcTrash, Insignia, uid, useConfirmar } from '@/components/kit';
import type { Moneda, TipoCambio, UsoModulo } from '../../tipos';
import { useCrearEnEscritorio } from '@/components/layout/SoloEscritorio';

/** Divisas que se pueden agregar (código ISO 4217, nombre y símbolo). */
const CATALOGO_MONEDAS: [string, string, string][] = [
  ['CRC', 'Colón Costarricense', '₡'], ['USD', 'Dólar Americano', '$'], ['EUR', 'Euro', '€'], ['CAD', 'Dólar Canadiense', 'CA$'],
  ['GBP', 'Libra Esterlina', '£'], ['MXN', 'Peso Mexicano', 'MX$'], ['JPY', 'Yen Japonés', '¥'], ['CHF', 'Franco Suizo', 'CHF'],
];

export const fmtTasa = (n: number) => n.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 10 });

/** Último registro de tipo de cambio de una moneda (la tasa vigente). */
const tasaVigente = (tc: TipoCambio[], codigo: string) =>
  tc.filter(t => t.moneda === codigo).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

const DEPOSITOS = ['ADE - DEP ADELANTADO EFECTIVO', 'ADT - DEP ADELANTADO TARJETA'];
const EMPRESAS_CONTABLES = ['100 - Hotel', '200 - Restaurante', '300 - Tours'];

/** Divisas secundarias que puede tener la empresa además de la moneda principal. */
const MAX_DIVISAS = 3;

export default function Monedas() {
  const enEscritorio = useCrearEnEscritorio();
  const [l, set] = useDato('monedas');
  const [tc] = useDato('tiposCambio');
  const { pedir, dialogo } = useConfirmar();
  const principal = l.find(m => m.principal) ?? l[0];
  const divisas = l.filter(m => m.id !== principal.id);
  const lleno = divisas.length >= MAX_DIVISAS;
  const libres = CATALOGO_MONEDAS.filter(([c]) => !l.some(m => m.codigo === c));
  const patch = (id: string, p: Partial<Moneda>) => set(l.map(m => (m.id === id ? { ...m, ...p } : m)));
  const agregar = () => {
    const [codigo, descripcion, simbolo] = libres[0];
    set([...l, { id: uid(), codigo, descripcion, simbolo, principal: false, activo: true, comision: 0, decimales: 2, convertible: true, facturable: false, porModulo: {} }]);
  };
  const cambiarMoneda = (id: string, codigo: string) => {
    const [, descripcion, simbolo] = CATALOGO_MONEDAS.find(([c]) => c === codigo)!;
    patch(id, { codigo, descripcion, simbolo });
  };
  const opciones = (m: Moneda) => CATALOGO_MONEDAS.filter(([c]) => c === m.codigo || !l.some(x => x.codigo === c)).map(([c, d, s]) => ({ value: c, label: `${s} ${d}` }));

  return (
    <ConfigCard title="Configuración de monedas" actions={<span style={{ fontSize: 12, color: C.n700 }}>{divisas.length} de {MAX_DIVISAS} divisas</span>}>
      <AccionesEnHeader>
        <span title={lleno ? `Máximo ${MAX_DIVISAS} divisas` : undefined}>
          <Button icon={<IcPlus size={12} />} onClick={enEscritorio(agregar)} disabled={lleno || !libres.length}>Agregar divisa</Button>
        </span>
      </AccionesEnHeader>
      <Bloque titulo="Moneda principal" primero>
        <FilaMoneda m={principal} opciones={opciones(principal)} fija />
        <UsoPorModulo m={principal} patch={p => patch(principal.id, p)} />
      </Bloque>
      {divisas.map((m, i) => {
        const vig = tasaVigente(tc, m.codigo);
        return (
          <Bloque key={m.id} titulo={`Divisa ${i + 1}`} acciones={<>
            <button type="button" onClick={() => patch(m.id, { activo: !m.activo })} aria-label={m.activo ? `Desactivar ${m.codigo}` : `Activar ${m.codigo}`}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}><Insignia label={m.activo ? 'Activa' : 'Inactiva'} color={m.activo ? 'green' : 'gray'} /></button>
            <IconButton label={`Eliminar ${m.descripcion}`} tono="peligro" onClick={() => pedir('Eliminar divisa', `¿Eliminar ${m.codigo} - ${m.descripcion}?`, () => set(l.filter(x => x.id !== m.id)))}><IcTrash /></IconButton>
          </>}>
            <FilaMoneda m={m} opciones={opciones(m)} onCambiar={c => cambiarMoneda(m.id, c)} />
            <span style={{ fontSize: 12, color: C.n700 }}>
              {vig ? <>Tasa actual ({vig.fuente}): <b style={{ color: C.n900, fontWeight: 600 }}>{fmtTasa(vig.tasa)}</b></> : 'Sin tasa registrada · Agrégala en Tipo de cambio'}
            </span>
            <UsoPorModulo m={m} patch={p => patch(m.id, p)} />
          </Bloque>
        );
      })}
      {dialogo}
    </ConfigCard>
  );
}

function Bloque({ titulo, primero, acciones, children }: { titulo: string; primero?: boolean; acciones?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: primero ? 0 : 16, borderTop: primero ? undefined : `1px solid ${C.n500}`, fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 500, margin: '0 auto 0 0', color: C.n900 }}>{titulo}</h3>
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

const MODULOS_MONEDA: { id: 'FDK' | 'POS' | 'TO'; nombre: string; depositos: boolean }[] = [
  { id: 'FDK', nombre: 'Front Desk', depositos: true }, { id: 'POS', nombre: 'Point of Sales', depositos: false }, { id: 'TO', nombre: 'Tour Operador', depositos: true },
];
const VACIO: UsoModulo = { empresa: '', depAdelantados: '', pagoParcial: '' };

/** Datos generales de la moneda (comisión, decimales, uso) y lo que cada módulo usa de ella. */
function UsoPorModulo({ m, patch }: { m: Moneda; patch: (p: Partial<Moneda>) => void }) {
  const ops = (xs: string[]) => [{ value: '', label: 'Seleccionar' }, ...xs.map(x => ({ value: x, label: x }))];
  const uso = (id: 'FDK' | 'POS' | 'TO', p: Partial<UsoModulo>) => patch({ porModulo: { ...m.porModulo, [id]: { ...VACIO, ...m.porModulo[id], ...p } } });
  return (
    <details style={{ fontSize: 12.5, color: C.n900 }}>
      <summary style={{ cursor: 'pointer', color: 'var(--brand)', fontSize: 12.5, textDecoration: 'underline', textUnderlineOffset: 3 }}>Detalle y uso por módulo</summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 12 }}>
        <Grid cols={4}>
          <Campo label="Comisión de canje (%)"><Input type="number" value={m.comision} onChange={v => patch({ comision: Number(v) || 0 })} /></Campo>
          <Campo label="Decimales"><Input type="number" value={m.decimales} onChange={v => patch({ decimales: Math.max(0, Math.min(4, Number(v) || 0)) })} /></Campo>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'flex-end', gridColumn: 'span 2' }}>
            <Checkbox checked={m.convertible} onChange={b => patch({ convertible: b })} label="Convertible (canje de divisas)" />
            <Checkbox checked={m.facturable} onChange={b => patch({ facturable: b })} label="Facturable" />
          </div>
        </Grid>
        {MODULOS_MONEDA.map(md => {
          const u = { ...VACIO, ...m.porModulo[md.id] };
          return (
            <div key={md.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12, borderTop: `1px solid ${C.n500}` }}>
              <span style={{ fontSize: 11.5, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--brand)', fontWeight: 500 }}>{md.nombre}</span>
              <Grid cols={3}>
                <Campo label="Empresa"><Select value={u.empresa} onChange={v => uso(md.id, { empresa: v })} options={ops(EMPRESAS_CONTABLES)} /></Campo>
                {md.depositos && <Campo label="Depósitos adelantados"><Select value={u.depAdelantados} onChange={v => uso(md.id, { depAdelantados: v })} options={ops(DEPOSITOS)} /></Campo>}
                <Campo label="Pago parcial tarjeta de crédito"><Select value={u.pagoParcial} onChange={v => uso(md.id, { pagoParcial: v })} options={ops(DEPOSITOS)} /></Campo>
              </Grid>
            </div>
          );
        })}
      </div>
    </details>
  );
}
