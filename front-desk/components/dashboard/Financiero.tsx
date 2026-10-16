'use client';
// Dashboard › Financiero: KPIs, ingresos en el tiempo, forecast y top de contratos.
import Link from 'next/link';
import { useMemo } from 'react';
import { C, FONT, fmtNum, radius, SIZE } from '@/components/suite/tokens';
import { useHotel } from '@/components/hotel/store';
import { HOY, diaSemana, fmtF, sumarDias } from '@/components/hotel/datos';
import { Dona, Panel, Progreso } from '@/components/hotel/ui';
import { fmtCorto, forecast, metricas, promedio, rango, topContratos, variacion, type RangoSel } from './datos';
import { Ext, Grafico, Kpi, MESES, Punto, Rangos, Seccion, VERDE, ROJO } from './piezas';

const filaContrato: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) minmax(140px, 1.1fr) 64px 92px', columnGap: 14, alignItems: 'center' };
/** Variación como en el diseño: «↓ - 18.87%», «↑ + 0%». */
const vsTexto = (v: number) => `${v >= 0 ? '↑ +' : '↓ -'} ${Math.abs(v) < 0.005 ? '0' : fmtNum(Math.abs(v), 2)}%`;

export function Financiero({ dia, dias, rango: r, onRango }: { dia: string; dias: string[]; rango: RangoSel; onRango: (v: RangoSel) => void }) {
  const h = useHotel();
  const m = metricas(h, dia);
  const ini = dia.slice(0, 8) + '01';
  const pm = promedio(h, rango(ini, dia)), pa = promedio(h, rango(sumarDias(ini, -30), sumarDias(ini, -1)));
  const mensual = rango(ini, dia).reduce((s, d) => s + metricas(h, d).ingresos, 0);
  // Más de 62 días se agrupa por mes
  const serie = useMemo(() => {
    if (dias.length <= 62) return dias.map(d => ({ label: dias.length <= 10 ? d : `${d.slice(8)}/${d.slice(5, 7)}`, detalle: `${diaSemana(d)} ${fmtF(d)}`, valor: metricas(h, d).ingresos }));
    const g: Record<string, number> = {};
    dias.forEach(d => { g[d.slice(0, 7)] = (g[d.slice(0, 7)] ?? 0) + metricas(h, d).ingresos; });
    return Object.entries(g).map(([k, v]) => ({ label: `${MESES[Number(k.slice(5)) - 1]} ${k.slice(2, 4)}`, detalle: `${MESES[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}`, valor: v }));
  }, [dias, h]);
  const fc = forecast(h, dia);
  const contratos = useMemo(() => topContratos(h, dia), [h, dia]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
      <Seccion>KPIs principales ({dia === HOY ? 'Hoy' : fmtF(dia)})</Seccion>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <Kpi titulo="ADR" valor={fmtNum(m.adr)} delta={variacion(pm.adr, pa.adr)} />
        <Kpi titulo="RevPAR" valor={fmtNum(m.revpar)} delta={variacion(pm.revpar, pa.revpar)} />
        <Kpi titulo="RevPOR" valor={fmtNum(m.revpor)} delta={variacion(pm.revpor, pa.revpor)} />
        <Kpi titulo="Ocupación" valor={`${fmtNum(m.ocupacion * 100, 0)} %`} delta={variacion(pm.ocupacion, pa.ocupacion)} />
        <Kpi titulo="Ingresos diarios" valor={fmtNum(m.ingresos)} sub={fmtF(dia)} />
        <Kpi titulo="Mensuales" valor={fmtNum(mensual)} sub={`${fmtF(ini)} - ${dia === HOY ? 'Hoy' : fmtF(dia)}`} />
      </div>

      <Panel titulo="Ingresos totales en el tiempo" acciones={<Rangos label="Rango de ingresos" valor={r} onChange={onRango} />}>
        <Grafico datos={serie} />
      </Panel>

      <Seccion>Forecast (próximos 7 días)</Seccion>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <Kpi grande titulo="Ingresos proyectados:" valor={`USD${fmtCorto(fc.ingresos)}`} />
        <Kpi grande titulo="Ocupación proyectada:" valor={`${fmtNum(fc.ocupacion * 100, 1)}%`} />
        <Kpi grande titulo="Reservas proyectadas" valor={`+${fc.reservas} reservas esperadas`} />
      </div>

      <Panel titulo="Contratos" sub={<span style={{ color: C.brand }}>Visualización del top 5 de contratos.</span>} acciones={<span style={{ fontSize: 12.5, color: C.n700 }}>{contratos.length} totales</span>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)', gap: 32, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Dona size={170} grosor={34} partes={contratos.map(c => ({ valor: c.importe, color: c.color, label: c.nombre }))} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
              {contratos.map(c => (
                <div key={c.nombre} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto 56px 110px', gap: 10, alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}><Punto color={c.color} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre.toUpperCase()}</span></span>
                  <span style={{ color: C.brand, fontSize: 12 }}>{c.tipo.toUpperCase()}</span>
                  <span style={{ textAlign: 'right' }}>{fmtNum(c.aporte, 2)}%</span>
                  <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>USD {fmtNum(c.importe)}</span>
                </div>))}
            </div>
            <span><Link href="/configuracion/tarifas-contratos" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: SIZE.control, padding: '0 14px', border: `1px solid ${C.n500}`, borderRadius: radius.control, color: C.n900, fontSize: 12.5, textDecoration: 'none' }}>Todos los contratos <Ext /></Link></span>
          </div>
          <div role="table" aria-label="Top 5 de contratos" style={{ display: 'flex', flexDirection: 'column', fontSize: 12.5 }}>
            <div role="row" style={{ ...filaContrato, color: C.n700, fontSize: 12, paddingBottom: 6 }}>
              <span role="columnheader">Contrato</span><span role="columnheader" style={{ textAlign: 'right' }}>Importe</span><span role="columnheader" style={{ textAlign: 'right' }}>Aporte</span><span role="columnheader" style={{ textAlign: 'right' }}>vs. mes ant.</span>
            </div>
            {contratos.map(c => (
              <div key={c.nombre} role="row" style={{ ...filaContrato, gridTemplateRows: 'auto auto', rowGap: 2, padding: '8px 0' }}>
                <span role="cell" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}><Punto color={c.color} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre.toUpperCase()}</span></span>
                <span role="cell" style={{ textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>USD {fmtNum(c.importe)}</span>
                <span role="cell" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtNum(c.aporte, 2)} %</span>
                <span role="cell" style={{ textAlign: 'right', whiteSpace: 'nowrap', color: c.vs >= 0 ? VERDE : ROJO }}>{vsTexto(c.vs)}</span>
                <span style={{ fontSize: 12, color: C.brand, marginLeft: 16 }}>{c.tipo.toUpperCase()}</span>
                <span style={{ alignSelf: 'center' }}><Progreso valor={c.aporte} total={100} color={c.color} /></span>
              </div>))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
