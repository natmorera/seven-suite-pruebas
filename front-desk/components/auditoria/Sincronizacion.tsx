'use client';
// Problemas de sincronización: monitoreo (solo lectura) de los errores de
// comunicación con sistemas externos (Channel Manager, contabilidad…).
import { useMemo, useState } from 'react';
import { C } from '@/components/suite/tokens';
import { Buscador, norm } from '@/components/configuracion/kit';
import { FechaBoton } from '@/components/hotel/ui';
import { useHotel } from '@/components/hotel/store';
import { HOY, fmtF } from '@/components/hotel/datos';
import { HojaSistema, PaginaFact, TablaReporte, Tarjeta, tdR } from '@/components/facturacion/comun';
import { ExportarReporte, TablaP, Vacio, tdP } from '@/components/pronostico/comun';

export default function Sincronizacion() {
  const h = useHotel();
  const [q, setQ] = useState('');
  const [fecha, setFecha] = useState(HOY);
  const filas = useMemo(() => h.erroresSync.filter(e => (!fecha || e.fecha.startsWith(fecha)) && (!q || norm(e.descripcion).includes(norm(q)))).sort((a, b) => b.fecha.localeCompare(a.fecha)), [h.erroresSync, q, fecha]);
  const fh = (s: string) => `${fmtF(s.slice(0, 10))} ${s.slice(11, 16)}`;
  const criterio = `${fecha ? `Fecha: ${fmtF(fecha)}` : 'Todas las fechas'}${q ? ` · «${q}»` : ''}`;
  return (
    <PaginaFact titulo="Problemas de sincronización" acciones={<ExportarReporte disabled={!filas.length} datos={() => ({ nombre: 'problemas-sincronizacion', titulo: 'Problemas de sincronización', criterio, headers: ['Fecha', 'Origen', 'Descripción'], filas: filas.map(e => [fh(e.fecha), e.origen, e.descripcion]) })}
      pdf={<HojaSistema titulo="Problemas de sincronización" criterio={criterio}><TablaReporte headers={['Fecha', 'Origen', 'Descripción']}>{filas.map(e => <tr key={e.id}><td style={tdR()}>{fh(e.fecha)}</td><td style={tdR()}>{e.origen}</td><td style={tdR()}>{e.descripcion}</td></tr>)}</TablaReporte></HojaSistema>} />}
      filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>{filas.length} errores</span>}
      filtros={<>
          <div style={{ width: 280 }}><Buscador value={q} onChange={setQ} placeholder="Buscar por descripción" /></div>
          <FechaBoton label="Fecha" value={fecha} onChange={setFecha} />
          {fecha && <button type="button" onClick={() => setFecha('')} style={{ border: 'none', background: 'none', color: C.brand, textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}>Ver todas las fechas</button>}
      </>}>
      <Tarjeta>
        <TablaP headers={['Fecha', 'Origen', 'Descripción']} alto="calc(100vh - 290px)">
          {!filas.length && <Vacio cols={3} texto="No se encontraron problemas de sincronización para la fecha seleccionada." />}
          {filas.map(e => <tr key={e.id} className="suite-fila"><td style={tdP()}>{fh(e.fecha)}</td><td style={tdP(false, { color: C.n700 })}>{e.origen}</td><td style={tdP(false, { whiteSpace: 'normal' })}>{e.descripcion}</td></tr>)}
        </TablaP>
      </Tarjeta>
    </PaginaFact>
  );
}
