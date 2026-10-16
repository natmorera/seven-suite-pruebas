'use client';
// Configuración › Parámetros generales. Primero las pestañas comunes con Accounting (Monedas, Tipo de cambio)
// y después las propias de Front Desk (Operación, Folios y cargos, Comportamiento, Políticas).
import { TabsEnBarra } from '@/components/layout/Pantalla';
import { useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Checkbox, Input, Select } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { usePatch } from '../store';
import { Campo, ConfigCard, Grid, OutlineButton, SubCard, TextArea } from '../kit';
import type { Datos } from '../inicial';
import Monedas from './Monedas';
import TipoCambio from './TipoCambio';

type G = Datos['general'];
type Patch = (p: Partial<G>) => void;

const TABS = ['Monedas', 'Tipo de cambio', 'Operación', 'Folios y cargos', 'Comportamiento', 'Políticas'] as const;
const AYUDA: Partial<Record<(typeof TABS)[number], string>> = {
  'Operación': 'Parámetros de la operación diaria de recepción.',
  'Folios y cargos': 'Conceptos de cargo automáticos e impresión de facturas.',
  'Comportamiento': 'Cómo se comportan las reservas, el check-in y las integraciones.',
  'Políticas': 'Horarios, condiciones especiales del huésped y políticas de reserva.',
};

export default function ParametrosGenerales() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Monedas');
  const [g, patch] = usePatch('general');
  return <>
    <TabsEnBarra items={TABS} activo={tab} onChange={setTab} />
    {tab === 'Monedas' && <Monedas />}
    {tab === 'Tipo de cambio' && <TipoCambio />}
    {AYUDA[tab] && (
      <ConfigCard title={tab} subtitle={AYUDA[tab]}>
        {tab === 'Operación' && <Operacion g={g} patch={patch} />}
        {tab === 'Folios y cargos' && <Folios g={g} patch={patch} />}
        {tab === 'Comportamiento' && <Comportamiento g={g} patch={patch} />}
        {tab === 'Políticas' && <Politicas g={g} patch={patch} />}
      </ConfigCard>
    )}
  </>;
}

/** Grupo de checkboxes guardados como Record<etiqueta, boolean>. */
export function Opciones({ valores, onChange, cols = 2 }: { valores: Record<string, boolean>; onChange: (v: Record<string, boolean>) => void; cols?: number }) {
  return (
    <Grid cols={cols} gap={12} style={{ columnGap: 32 }}>
      {Object.entries(valores).map(([k, v]) => <Checkbox key={k} checked={v} onChange={b => onChange({ ...valores, [k]: b })} label={k} />)}
    </Grid>
  );
}

/** Grilla de inputs de texto sobre un sub-objeto de G. */
export function Campos<K extends 'operacion' | 'impresionFacturas' | 'cuentasContables'>({ g, patch, k, etiquetas, tipos = {} }: {
  g: G; patch: Patch; k: K; etiquetas: Partial<Record<keyof G[K], string>>; tipos?: Partial<Record<keyof G[K], string>>;
}) {
  const obj = g[k] as Record<string, string>;
  return (
    <Grid cols={2}>
      {(Object.keys(etiquetas) as (keyof G[K] & string)[]).map(c => (
        <Campo key={c} label={etiquetas[c]}>
          <Input value={obj[c]} type={tipos[c] ?? 'text'} onChange={v => patch({ [k]: { ...obj, [c]: v } } as Partial<G>)} />
        </Campo>
      ))}
    </Grid>
  );
}

// Los consecutivos de documentos están en Empresa › Consecutivos de documentos y las cuentas contables en Empresa › Contabilidad.
function Operacion({ g, patch }: { g: G; patch: Patch }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SubCard title="Parámetros de operación">
        <Campos g={g} patch={patch} k="operacion" etiquetas={{ internoTCP: 'Número interno TCP', maxCargosDivisa: 'Máx. cargos de divisa', formaVenta: 'Forma de venta' }}
          tipos={{ internoTCP: 'number', maxCargosDivisa: 'number' }} />
      </SubCard>
      <SubCard title="Opciones generales">
        <Opciones valores={g.opcionesParametros} onChange={v => patch({ opcionesParametros: v })} />
      </SubCard>
    </div>
  );
}

const CONCEPTOS = ['Llamadas locales', 'Llamadas internacionales', 'Cambio de habitación', 'Otros cargos'];

function Folios({ g, patch }: { g: G; patch: Patch }) {
  const sel = (v: string, on: (v: string) => void, ops: string[]) => (
    <Select value={v} onChange={on} options={[{ value: '', label: 'Selecciona' }, ...ops.map(x => ({ value: x, label: x }))]} />
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Grid cols={2}>
        <SubCard title="Líneas telefónicas">
          <Grid cols={2}>
            <Campo label="Concepto de cargo">{sel(g.lineasTelefonicas.conceptoCargo, v => patch({ lineasTelefonicas: { ...g.lineasTelefonicas, conceptoCargo: v } }), CONCEPTOS)}</Campo>
            <Campo label="Concepto de producción">{sel(g.lineasTelefonicas.conceptoProduccion, v => patch({ lineasTelefonicas: { ...g.lineasTelefonicas, conceptoProduccion: v } }), ['Teléfono', 'Otros servicios'])}</Campo>
          </Grid>
        </SubCard>
        <SubCard title="Cambio de habitación">
          <Grid cols={2}>
            <Campo label="Concepto de cargo">{sel(g.cambioHabitacion.conceptoCargo, v => patch({ cambioHabitacion: { ...g.cambioHabitacion, conceptoCargo: v } }), CONCEPTOS)}</Campo>
            <Campo label="Tipo de cambio">{sel(g.cambioHabitacion.tipoColon, v => patch({ cambioHabitacion: { ...g.cambioHabitacion, tipoColon: v } }), ['Compra', 'Venta', 'Referencia'])}</Campo>
          </Grid>
        </SubCard>
      </Grid>
      <SubCard title="Impresión de facturas" hint="La impresora de cada documento se asigna en Empresa › Asignación de impresoras.">
        <Campos g={g} patch={patch} k="impresionFacturas" etiquetas={{ copias: 'Copias de factura', lineas: 'Líneas por factura' }} tipos={{ copias: 'number', lineas: 'number' }} />
      </SubCard>
      <SubCard title="Opciones de folios">
        <Opciones valores={g.opcionesFolios} onChange={v => patch({ opcionesFolios: v })} />
      </SubCard>
    </div>
  );
}

function Comportamiento({ g, patch }: { g: G; patch: Patch }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SubCard title="Reservas y check-in"><Opciones valores={g.reservasCheckin} onChange={v => patch({ reservasCheckin: v })} /></SubCard>
      <SubCard title="Integraciones"><Opciones valores={g.integraciones} onChange={v => patch({ integraciones: v })} /></SubCard>
    </div>
  );
}

function Politicas({ g, patch }: { g: G; patch: Patch }) {
  const [nueva, setNueva] = useState('');
  const toggle = (c: string) => patch({ condicionesActivas: g.condicionesActivas.includes(c) ? g.condicionesActivas.filter(x => x !== c) : [...g.condicionesActivas, c] });
  const agregar = () => {
    const t = nueva.trim();
    if (!t || g.condiciones.includes(t)) return;
    patch({ condiciones: [...g.condiciones, t], condicionesActivas: [...g.condicionesActivas, t] });
    setNueva('');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SubCard title="Horarios">
        <Grid cols={2}>
          <Campo label="Hora de check-in"><Input type="time" value={g.horarios.checkin} onChange={v => patch({ horarios: { ...g.horarios, checkin: v } })} /></Campo>
          <Campo label="Hora de check-out"><Input type="time" value={g.horarios.checkout} onChange={v => patch({ horarios: { ...g.horarios, checkout: v } })} /></Campo>
          <Campo label="Días dep. en garantía"><Input type="number" value={g.horarios.diasGarantia} onChange={v => patch({ horarios: { ...g.horarios, diasGarantia: v } })} /></Campo>
          <Campo label="Días para adelantos"><Input type="number" value={g.horarios.diasAdelantos} onChange={v => patch({ horarios: { ...g.horarios, diasAdelantos: v } })} /></Campo>
        </Grid>
      </SubCard>
      <SubCard title="Condiciones especiales" hint="Las condiciones marcadas aparecen como opción en el perfil del huésped.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {g.condiciones.map(c => {
            const on = g.condicionesActivas.includes(c);
            return (
              <button key={c} type="button" aria-pressed={on} onClick={() => toggle(c)}
                style={{ padding: '6px 12px', borderRadius: radius.control, fontSize: 12, fontFamily: FONT, cursor: 'pointer',
                  border: `1px solid ${on ? C.brandBd : C.n500}`, background: on ? C.brandBg : C.n000, color: on ? C.brand : C.n900 }}>
                {c}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, maxWidth: 420 }}>
          <Input value={nueva} onChange={setNueva} placeholder="Nueva condición" aria-label="Nueva condición"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }} />
          <OutlineButton icon={<IcPlus size={12} />} onClick={agregar} disabled={!nueva.trim()}>Agregar</OutlineButton>
        </div>
      </SubCard>
      <Campo label="Políticas generales">
        <TextArea value={g.politicas} onChange={v => patch({ politicas: v })} rows={10} />
      </Campo>
    </div>
  );
}
