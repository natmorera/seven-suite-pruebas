'use client';
// Configuración › Empresa › Contabilidad (propia de Front Desk): enlace con Accounting (sistema, cuentas y alertas).
import { Input, Select } from '@/components/suite/ui';
import { usePatch } from '../store';
import { Aviso, Campo, ConfigCard, Grid, SubCard } from '../kit';
import { Campos, Opciones } from './ParametrosGenerales';

export default function Contabilidad() {
  const [g, patch] = usePatch('general');
  const ops = (xs: string[]) => xs.map(x => ({ value: x, label: x }));
  return (
    <ConfigCard title="Contabilidad" subtitle="Cómo pasan a Accounting la producción, los cobros y los cierres de Front Desk.">
      <Aviso>La configuración contable y el catálogo de cuentas se administran en Accounting; aquí solo se eligen las cuentas que usa Front Desk.</Aviso>
      <Grid cols={2} style={{ alignItems: 'start' }}>
        <SubCard title="Sistema contable">
          <Grid cols={2}>
            <Campo label="Contabilidad"><Select value={g.contabilidad.sistema} onChange={v => patch({ contabilidad: { ...g.contabilidad, sistema: v } })} options={ops(['Seven Accounting', 'Externo'])} /></Campo>
            <Campo label="Forma de inventario"><Select value={g.contabilidad.inventario} onChange={v => patch({ contabilidad: { ...g.contabilidad, inventario: v } })} options={ops(['PEPS', 'Promedio ponderado', 'UEPS'])} /></Campo>
          </Grid>
          <Campo label="Libro contable de front"><Input value={g.contabilidad.libro} placeholder="—" onChange={v => patch({ contabilidad: { ...g.contabilidad, libro: v } })} /></Campo>
          <Opciones cols={1} valores={g.opcionesContables} onChange={v => patch({ opcionesContables: v })} />
        </SubCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SubCard title="Cuentas contables">
            <Campos g={g} patch={patch} k="cuentasContables" etiquetas={{ cargoDivisa: 'Cargo de divisa', noCheques: 'No cheques' }} />
          </SubCard>
          <SubCard title="Alertas por módulo" hint="Correos que reciben notificaciones automáticas por proceso contable.">
            <Grid cols={2}>
              {Object.entries(g.alertas).map(([k, v]) => (
                <Campo key={k} label={k}><Input type="email" value={v} onChange={x => patch({ alertas: { ...g.alertas, [k]: x } })} /></Campo>
              ))}
            </Grid>
          </SubCard>
        </div>
      </Grid>
    </ConfigCard>
  );
}
