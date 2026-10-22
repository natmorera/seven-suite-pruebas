'use client';
// Configuración › Parámetros generales. Primero las pestañas comunes con Accounting (Monedas, Tipo de cambio),
// después las propias de Front Desk y al final los catálogos generales (Nacionalidades, Tipos de tareas).
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
import { Nacionalidades, TiposTarea } from './CatalogosGenerales';

type G = Datos['general'];
type Patch = (p: Partial<G>) => void;

const TABS = ['Monedas', 'Tipo de cambio', 'Reservas y habitaciones', 'Folios y cargos', 'Políticas', 'Nacionalidades', 'Tipos de tareas'] as const;
const AYUDA: Partial<Record<(typeof TABS)[number], string>> = {
  'Reservas y habitaciones': 'Cómo se asignan las habitaciones y cómo se comportan las reservas y el check-in.',
  'Folios y cargos': 'Cargos automáticos, recibos e impresión de facturas.',
  'Políticas': 'Horarios, condiciones especiales del huésped y políticas de reserva.',
};

export default function ParametrosGenerales() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Monedas');
  const [g, patch] = usePatch('general');
  return <>
    <TabsEnBarra items={TABS} activo={tab} onChange={setTab} />
    {tab === 'Monedas' && <Monedas />}
    {tab === 'Tipo de cambio' && <TipoCambio />}
    {(tab === 'Nacionalidades' || tab === 'Tipos de tareas') && (
      <ConfigCard title={tab}>{tab === 'Nacionalidades' ? <Nacionalidades /> : <TiposTarea />}</ConfigCard>
    )}
    {AYUDA[tab] && (
      <ConfigCard title={tab} subtitle={AYUDA[tab]}>
        {tab === 'Reservas y habitaciones' && <Reservas g={g} patch={patch} />}
        {tab === 'Folios y cargos' && <Folios g={g} patch={patch} />}
        {tab === 'Políticas' && <Politicas g={g} patch={patch} />}
      </ConfigCard>
    )}
  </>;
}

/** Qué hace cada opción; se muestra debajo de su casilla. */
export const AYUDA_OPCIONES: Record<string, string> = {
  'Asignar habitaciones automáticamente': 'Al guardar la reserva se le asigna una habitación libre del tipo reservado. Apagado, la habitación se asigna a mano desde el Planificador.',
  'Permitir desbloquear habitaciones': 'Deja quitar el bloqueo de una habitación desde el Mapa de habitaciones (a los usuarios con permiso).',
  'Combinar hab. Limpia / Sucia': 'El Mapa de habitaciones muestra ocupación y limpieza en una sola marca en lugar de dos.',
  'Mostrar hab. fuera de orden como sucia': 'Una habitación fuera de orden aparece como sucia en Ama de llaves, para que se revise antes de volver a venderla.',
  'Cálculo precio medio': 'Si la tarifa cambia entre noches, la reserva muestra el precio promedio por noche.',
  'Imprimir recibo / reserva': 'Al guardar una reserva o registrar un pago se ofrece imprimir el comprobante.',
  'Permitir reservas agencias automáticamente': 'Las reservas que llegan de agencias quedan confirmadas sin revisión de recepción.',
  'Confirmación automática de reserva con OE': 'Envía la confirmación de la reserva por correo en cuanto se guarda.',
  'Solicitar moderador': 'Los cambios de tarifa o descuento en una reserva necesitan la aprobación de un supervisor.',
  'Tiempo sucursal (Stop Over)': 'Permite reservas de escala (stop over) por horas, sin noche completa.',
  'Uso solo líneas – registro de reservas': 'El comprobante de reserva se imprime en formato de líneas, sin recuadros.',
  'Verificar tarjeta al realizar check-in': 'Pide registrar una tarjeta de garantía antes de completar el check-in.',
  'Plataforma aut. reservas agen. al check-in': 'En el check-in de una reserva de agencia se cargan los datos que envió la agencia.',
  'Uso solo líneas en tarjetas de registro': 'La tarjeta de registro se imprime en formato de líneas, sin recuadros.',
  'Código único ProfCard': 'Cada perfil de huésped recibe un código único que no se repite; sirve para buscarlo y evitar duplicados.',
  'Recibo en carga de moneda': 'Imprime un recibo al registrar un cambio de divisas.',
  'Recibo en depósitos en garantía': 'Imprime un recibo al recibir un depósito en garantía.',
  'Impresión directa de facturas': 'La factura va directo a la impresora, sin vista previa.',
  'Cambio de recibo a factura': 'Permite convertir un recibo ya emitido en factura.',
  'Número de factura externo': 'Permite registrar el número de una factura emitida en otro sistema.',
  'Cheques con factura agencia': 'Permite pagar con cheque las facturas a agencias.',
  'Mostrar habitaciones en facturas de agencia': 'La factura a la agencia detalla el número de habitación de cada huésped.',
  'Activar WebCheckin': 'Habilita Seven Web Check In; la conexión se configura en la pestaña Web Check In.',
  'Activar NTP (Seven Cloud Printing)': 'Envía las impresiones por Seven Cloud Printing en lugar de la impresora local.',
  'Portada OTA / MPos': 'Conecta los portales de venta en línea (OTA) y el punto de venta móvil.',
  'Activar disponibilidad compartida': 'Comparte la disponibilidad con los demás hoteles del grupo.',
  'Activar AntiBot HubSpot': 'Protege contra bots los formularios web conectados a HubSpot.',
  'Activar GRSA (depósitos en garantía)': 'Cobra los depósitos en garantía por la pasarela GRSA.',
};

/** Casillas guardadas como Record<etiqueta, boolean>, cada una con su explicación. `solo` limita y ordena las que se muestran. */
export function Opciones({ valores, onChange, cols = 2, solo }: {
  valores: Record<string, boolean>; onChange: (v: Record<string, boolean>) => void; cols?: number; solo?: string[];
}) {
  const claves = solo ?? Object.keys(valores);
  return (
    <Grid cols={cols} gap={16} style={{ columnGap: 32, alignItems: 'start' }}>
      {claves.map(k => (
        <Checkbox key={k} checked={!!valores[k]} onChange={b => onChange({ ...valores, [k]: b })}
          label={<span style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 1 }}>
            <span>{k}</span>
            {AYUDA_OPCIONES[k] && <span style={{ fontSize: 11.5, color: C.n700, lineHeight: 1.4 }}>{AYUDA_OPCIONES[k]}</span>}
          </span>} />
      ))}
    </Grid>
  );
}

/** Grilla de inputs de texto sobre un sub-objeto de G. */
export function Campos<K extends 'operacion' | 'impresionFacturas'>({ g, patch, k, etiquetas, tipos = {} }: {
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

const GRUPOS_RESERVAS: [string, string[]][] = [
  ['Asignación y estado de habitaciones', ['Asignar habitaciones automáticamente', 'Permitir desbloquear habitaciones', 'Combinar hab. Limpia / Sucia', 'Mostrar hab. fuera de orden como sucia']],
  ['Reservas', ['Cálculo precio medio', 'Imprimir recibo / reserva', 'Permitir reservas agencias automáticamente', 'Confirmación automática de reserva con OE', 'Solicitar moderador', 'Tiempo sucursal (Stop Over)', 'Uso solo líneas – registro de reservas']],
  ['Check-in y registro', ['Verificar tarjeta al realizar check-in', 'Plataforma aut. reservas agen. al check-in', 'Uso solo líneas en tarjetas de registro', 'Código único ProfCard']],
];

function Reservas({ g, patch }: { g: G; patch: Patch }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {GRUPOS_RESERVAS.map(([t, claves]) => (
        <SubCard key={t} title={t}><Opciones valores={g.opcionesReservas} solo={claves} onChange={v => patch({ opcionesReservas: v })} /></SubCard>
      ))}
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
      <SubCard title="Cargos">
        <Campos g={g} patch={patch} k="operacion" etiquetas={{ maxCargosDivisa: 'Máx. cargos de divisa', formaVenta: 'Forma de venta', internoTCP: 'Número interno TCP' }}
          tipos={{ internoTCP: 'number', maxCargosDivisa: 'number' }} />
      </SubCard>
      <SubCard title="Impresión de facturas" hint="La impresora de cada documento se asigna en Empresa › Asignación de impresoras.">
        <Campos g={g} patch={patch} k="impresionFacturas" etiquetas={{ copias: 'Copias de factura', lineas: 'Líneas por factura' }} tipos={{ copias: 'number', lineas: 'number' }} />
      </SubCard>
      <SubCard title="Opciones de folios">
        <Opciones valores={g.opcionesFolios} onChange={v => patch({ opcionesFolios: v })} />
      </SubCard>
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
