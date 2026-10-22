'use client';
// Dashboard: header con el filtro de período de la suite (mueve todo el tablero), pestañas Operativo y Financiero,
// Nueva reserva (formulario completo), Planificador y Reportes (cada uno abre su pantalla).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/suite/ui';
import { Pantalla } from '@/components/layout/Pantalla';
import { useHotel } from '@/components/hotel/store';
import { HOY, fmtF } from '@/components/hotel/datos';
import { HojaReporte, MenuBoton, TablaImpresa, exportarCSV, usePrint } from '@/components/hotel/ui';
import { useEmpresa } from '@/components/layout/Shell';
import { DISP_DEFECTO, REPORTES_RAPIDOS, diasDisponibilidad, exportFinanciero, exportOperativo, rango, resolverRango, type RangoSel } from './datos';
import { Ext } from './piezas';
import { FiltroPeriodo } from './Periodo';
import { Operativo } from './Operativo';
import { Financiero } from './Financiero';

export default function Dashboard() {
  const h = useHotel();
  const router = useRouter();
  const [tab, setTab] = useState<'Operativo' | 'Financiero'>('Operativo');
  // Período del header: el Operativo muestra el último día del período; el Financiero, todo el período.
  const [periodo, setPeriodo] = useState<RangoSel>({ r: 'hoy', desde: '', hasta: '' });
  const [rDisp, setRDisp] = useState<RangoSel>(DISP_DEFECTO);
  const { imprimir, portal } = usePrint();
  const empresa = useEmpresa();
  const [desde, dia] = resolverRango(HOY, 'pasado', periodo);
  const diasPeriodo = rango(desde, dia);
  const diasDisp = diasDisponibilidad(dia, rDisp);

  const exportar = (pdf: boolean) => {
    const { titulo, secciones } = tab === 'Financiero' ? exportFinanciero(h, dia, diasPeriodo) : exportOperativo(h, dia, diasDisp);
    const criterio = desde === dia ? `Día: ${fmtF(dia)}` : `Período: ${fmtF(desde)} – ${fmtF(dia)}`;
    if (pdf) imprimir(<HojaReporte titulo={titulo} filtros={criterio}>{secciones.map(sx => <div key={sx.titulo} style={{ marginBottom: 14 }}><h3 style={{ fontSize: 13, margin: '0 0 6px' }}>{sx.titulo}</h3><TablaImpresa headers={sx.headers} filas={sx.filas} derecha={sx.headers.map((_, k) => k).slice(1)} /></div>)}</HojaReporte>);
    else exportarCSV(`dashboard-${tab.toLowerCase()}`, ['Sección', 'Concepto', 'Valor', ''], secciones.flatMap(sx => [[sx.titulo, ...sx.headers], ...sx.filas.map(f => ['', ...f])]));
  };

  return (
    <Pantalla titulo={<>¡Te damos la bienvenida <b style={{ fontWeight: 600 }}>{empresa}</b>!</>}
      izquierda={<FiltroPeriodo valor={periodo} onChange={setPeriodo} dia={HOY} sentido="pasado" />}
      acciones={<>
        <Button variant="secondary" onClick={() => router.push('/reservaciones/reservas?nueva=1')}>Nueva reserva</Button>
        <Button variant="secondary" onClick={() => window.open('/reservaciones/planificador', '_blank', 'noopener')}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Planificador <Ext /></span></Button>
        <MenuBoton label="Reportes" variant="primary" ancho={260} opciones={[
          ...REPORTES_RAPIDOS.map(r => ({ label: r.label, onClick: () => router.push(r.href) })),
          { label: `Exportar ${tab.toLowerCase()} (Excel)`, onClick: () => exportar(false) },
          { label: `Exportar ${tab.toLowerCase()} (PDF)`, onClick: () => exportar(true) },
        ]} />
      </>}
      tabs={{ items: ['Operativo', 'Financiero'] as const, activo: tab, onChange: setTab }}>
      {tab === 'Operativo'
        ? <Operativo dia={dia} dias={diasDisp} rango={rDisp} onRango={setRDisp} />
        : <Financiero dia={dia} dias={diasPeriodo} />}
      {portal}
    </Pantalla>
  );
}
