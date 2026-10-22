'use client';
// Paso «Contabilidad» de la integración de Front Desk: cómo pasan a Accounting la producción, los cobros y los cierres.
// Las cuentas y los libros se eligen del catálogo de Accounting; los cambios se guardan con «Guardar cambios» del header.
import { type ReactNode } from 'react';
import { C, FONT } from '@/components/suite/tokens';
import { Checkbox, Input, Select } from '@/components/suite/ui';
import { Campo, Grid } from '@/components/kit';
import { useDato } from '../../store';
import { LIBROS_ACC, SISTEMAS_CONTABLES } from '../../datos/contabilidad';
import { SelectorCuenta } from './SelectorCuenta';
import type { IntegracionContable as Config } from '../../tipos';

const opciones = (xs: string[], vacia?: string) => [...(vacia ? [{ value: '', label: vacia }] : []), ...xs.map(x => ({ value: x, label: x }))];

const MARCAS: [keyof Config, string][] = [
  ['noContabilizarDiario', 'No contabilizar producción diariamente'],
  ['contabilizarDocumentos', 'Contabilización de documentos'],
  ['balanceVias', 'Balance de vías automático'],
  ['integracionAsientos', 'Integración automática de asientos'],
  ['produccionRepuestos', 'Producción a repuestos detallados'],
];
const ALERTAS: [keyof Config['alertas'], string][] = [
  ['folios', 'Operaciones sobre folios'], ['reservas', 'Reservas'], ['agencias', 'Operaciones de agencias'],
  ['saldos', 'Niveles de saldos / créditos'], ['cancelaciones', 'Cancelación de folios y recibos'],
];

export function ContabilidadFrontDesk() {
  const [c, set] = useDato('contabilidadFDK');
  const cambiar = (p: Partial<Config>) => set(prev => ({ ...prev, ...p }));
  const alerta = (k: keyof Config['alertas'], v: string) => set(prev => ({ ...prev, alertas: { ...prev.alertas, [k]: v } }));
  const correoInvalido = (v: string) => (v && !/^\S+@\S+\.\S+$/.test(v) ? 'El correo no es válido.' : undefined);

  return (
    <div className="maestro-detalle" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
      <Seccion titulo="Sistema contable">
        <Grid cols={2}>
          <Campo label="Contabilidad" required><Select value={c.sistema} onChange={v => cambiar({ sistema: v })} options={opciones(SISTEMAS_CONTABLES, 'Seleccionar')} /></Campo>
          <Campo label="Forma de inventario" required>
            <Select value={c.inventario} onChange={v => cambiar({ inventario: v as Config['inventario'] })} options={opciones(['PEPS', 'UEPS', 'Promedio'], 'Seleccionar')} />
          </Campo>
          <Campo label="Libro contable de Front Desk" required style={{ gridColumn: '1 / -1' }}>
            <Select value={c.libro} onChange={v => cambiar({ libro: v })} options={opciones(LIBROS_ACC, 'Seleccionar')} />
          </Campo>
        </Grid>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MARCAS.map(([k, label]) => <Checkbox key={k} checked={!!c[k]} onChange={b => cambiar({ [k]: b })} label={label} />)}
        </div>
      </Seccion>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
        <Seccion titulo="Cuentas contables">
          <Grid cols={2}>
            <Campo label="Cargo de divisa" required><SelectorCuenta label="Cargo de divisa" value={c.cuentaCargoDivisa} onChange={v => cambiar({ cuentaCargoDivisa: v })} /></Campo>
            <Campo label="No cheques" required><SelectorCuenta label="No cheques" value={c.cuentaNoCheques} onChange={v => cambiar({ cuentaNoCheques: v })} /></Campo>
          </Grid>
        </Seccion>
        <Seccion titulo="Alertas por correo">
          <Grid cols={2}>
            {ALERTAS.map(([k, label]) => (
              <Campo key={k} label={label} error={correoInvalido(c.alertas[k])}>
                <Input type="email" value={c.alertas[k]} onChange={v => alerta(k, v)} />
              </Campo>
            ))}
          </Grid>
        </Seccion>
      </div>
    </div>
  );
}

/** Bloque con título dentro de la tarjeta del paso. */
const Seccion = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <section style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, fontFamily: FONT }}>
    <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: C.n900 }}>{titulo}</h3>
    {children}
  </section>
);
