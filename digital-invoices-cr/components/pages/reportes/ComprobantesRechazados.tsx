'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExportListModal, Pagination, C } from '@/components/ui/primitives';
import { Filtros, aplicarFiltros, enVista, filtrosIniciales, fmtFechaHora, simbolo, useComprobantes } from './comun/datos';
import { interpretarError } from '@/lib/erroresHacienda';
import { AvisoReporte, BarraFiltros, Cargando, Encabezado, Enlace, Fila, FilaTotal, FilaVacia, Monto, ReporteLayout, Tabla, Td, TdTotal, Th, descripcionFiltros, txtMonto } from './comun/ui';

const TABS = ['Ventas', 'Compras'] as const;
const INICIAL = filtrosIniciales();
const SIN_MOTIVO = 'Hacienda no devolvió el detalle del rechazo';

export default function ComprobantesRechazados() {
  const router = useRouter();
  const { comprobantes, cargando } = useComprobantes();
  // Filtro por actividad: las de los documentos (la de cada venta o compra)
  const actividades = useMemo(() => Array.from(new Set(comprobantes.map(c => c.actividad))).sort(), [comprobantes]);
  const [tab, setTab] = useState(0);
  const [filtros, setFiltros] = useState<Filtros>(INICIAL);
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // Vista: cada comprobante o agrupado por actividad económica
  const [vista, setVista] = useState<'detalle' | 'actividad'>('detalle');

  const esVentas = tab === 0;
  const sym = simbolo(filtros);
  const conteoPorLado = useMemo(() => ({
    venta: comprobantes.filter(c => c.lado === 'venta' && c.estado === 'Rechazado').length,
    compra: comprobantes.filter(c => c.lado === 'compra' && c.estado === 'Rechazado').length,
  }), [comprobantes]);

  const filas = useMemo(() => aplicarFiltros(
    comprobantes.filter(c => c.lado === (esVentas ? 'venta' : 'compra') && c.estado === 'Rechazado'), filtros,
  ).sort((a, b) => b.fecha.localeCompare(a.fecha)), [comprobantes, esVentas, filtros]);

  const total = filas.reduce((a, c) => a + enVista(c, c.total, filtros), 0);
  const porActividad = useMemo(() => {
    const m = new Map<string, { actividad: string; cantidad: number; total: number; motivos: Map<string, number> }>();
    for (const c of filas) {
      const k = c.actividad || 'Sin actividad asignada';
      const g = m.get(k) ?? { actividad: k, cantidad: 0, total: 0, motivos: new Map<string, number>() };
      g.cantidad += 1; g.total += enVista(c, c.total, filtros);
      const motivo = c.motivoRechazo ? interpretarError(c.motivoRechazo)[0].titulo : 'Sin detalle de Hacienda';
      g.motivos.set(motivo, (g.motivos.get(motivo) ?? 0) + 1);
      m.set(k, g);
    }
    return [...m.values()].sort((a, b) => b.cantidad - a.cantidad);
  }, [filas, filtros]);
  const pagina = filas.slice((page - 1) * pageSize, page * pageSize);
  const colContraparte = esVentas ? 'Cliente' : 'Proveedor';
  const colOrigen = esVentas ? 'Módulo origen' : 'Origen';

  if (cargando) return <Cargando />;

  return (
    <ReporteLayout
      titulo="Comprobantes rechazados" filtros={filtros} onExportar={() => setExportOpen(true)} permisoExportar="fe.reportes.rechazados.exportar"
      tabs={[`Ventas (${conteoPorLado.venta})`, `Compras (${conteoPorLado.compra})`]} tab={tab}
      onTab={i => { setTab(i); setPage(1); }}
      barra={
        <BarraFiltros actividades={actividades} filtros={filtros} inicial={INICIAL} onChange={f => { setFiltros(f); setPage(1); }} mostrarEstado={false}
          placeholder={esVentas ? 'Busca cliente o consecutivo…' : 'Busca proveedor o consecutivo…'}
          conteo={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <span><b style={{ color: C.error }}>{filas.length}</b> comprobante{filas.length === 1 ? '' : 's'} rechazado{filas.length === 1 ? '' : 's'}</span>
            <span style={{ display: 'inline-flex', border: `1px solid ${C.n500}`, borderRadius: 6, overflow: 'hidden' }}>
              {([['detalle', 'Detalle'], ['actividad', 'Por actividad económica']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setVista(v)} style={{ border: 'none', padding: '4px 10px', fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit',
                  background: vista === v ? C.brandBg : '#fff', color: vista === v ? C.brand : C.n900, fontWeight: vista === v ? 600 : 400 }}>{l}</button>
              ))}
            </span>
          </span>} />
      }
      aviso={
        <AvisoReporte>
          {esVentas
            ? 'Un comprobante rechazado no tiene validez fiscal: corrige el dato indicado en el motivo y emite un comprobante nuevo. Estos montos no suman en los reportes fiscales.'
            : 'Compras rechazadas por Hacienda o por tu empresa con el acuse. No generan crédito fiscal.'}
        </AvisoReporte>
      }
      pie={<Pagination page={page} pageSize={pageSize} total={filas.length} onPageChange={setPage} onPageSizeChange={setPageSize} />}
    >
      {vista === 'actividad' ? (
        <Tabla minWidth={900}>
          <Encabezado>
            <Th>Actividad económica</Th><Th right>Rechazados</Th><Th>Motivos más frecuentes</Th><Th right>Total</Th>
          </Encabezado>
          <tbody>
            {porActividad.length === 0
              ? <FilaVacia span={4} texto="No hay comprobantes rechazados para el período y los filtros seleccionados." />
              : porActividad.map((g, i) => (
                <Fila key={g.actividad} i={i}>
                  <Td>{g.actividad}</Td>
                  <Td right bold>{g.cantidad}</Td>
                  <Td style={{ maxWidth: 420 }}>{[...g.motivos.entries()].sort((a, b) => b[1] - a[1]).map(([mo, n]) => `${mo} (${n})`).join(' · ')}</Td>
                  <Td right bold><Monto n={g.total} sym={sym} /></Td>
                </Fila>
              ))}
            <FilaTotal span={3}><TdTotal><Monto n={total} sym={sym} /></TdTotal></FilaTotal>
          </tbody>
        </Tabla>
      ) : (
      <Tabla minWidth={1050}>
        <Encabezado>
          <Th>{colContraparte}</Th><Th>Tipo de comprobante</Th><Th>Consecutivo</Th><Th>Fecha de emisión</Th>
          <Th>{colOrigen}</Th><Th>Motivo del rechazo</Th><Th right>Total</Th>
        </Encabezado>
        <tbody>
          {pagina.length === 0
            ? <FilaVacia span={7} texto="No hay comprobantes rechazados para el período y los filtros seleccionados." />
            : pagina.map((c, i) => (
              <Fila key={c.id} i={i}>
                <Td>{c.contraparte}</Td>
                <Td nowrap>{c.tipo}</Td>
                <Td nowrap>
                  {esVentas && c.consecutivo
                    ? <Enlace onClick={() => router.push(`/facturacion/emitidos/${c.id.replace('#', '')}`)}>{c.consecutivo}</Enlace>
                    : c.consecutivo || <span style={{ color: C.error }}>Sin consecutivo</span>}
                </Td>
                <Td nowrap>{fmtFechaHora(c.fecha)}</Td>
                <Td nowrap>{c.origen}</Td>
                <Td style={{ maxWidth: 380 }}>
                  {c.motivoRechazo
                    ? <span style={{ color: C.n900 }}>{c.motivoRechazo}</span>
                    : <span style={{ color: C.n700, fontStyle: 'italic' }}>{SIN_MOTIVO}</span>}
                </Td>
                <Td right bold><Monto n={enVista(c, c.total, filtros)} sym={sym} /></Td>
              </Fila>
            ))}
          <FilaTotal span={6}><TdTotal><Monto n={total} sym={sym} /></TdTotal></FilaTotal>
        </tbody>
      </Tabla>
      )}

      {exportOpen && (
        vista === 'actividad' ? (
          <ExportListModal
            title={`Rechazados por actividad económica: ${TABS[tab]}`}
            subtitulo={descripcionFiltros({ ...filtros, estados: new Set(['Rechazado']) })}
            columns={[{ key: 'actividad', label: 'Actividad económica' }, { key: 'cantidad', label: 'Rechazados', align: 'right' }, { key: 'motivos', label: 'Motivos' }, { key: 'total', label: 'Total', align: 'right' }]}
            rows={[
              ...porActividad.map(g => ({ actividad: g.actividad, cantidad: String(g.cantidad), motivos: [...g.motivos.entries()].map(([mo, n]) => `${mo} (${n})`).join(' · '), total: txtMonto(g.total, sym) })),
              { actividad: 'Totalizado', cantidad: String(filas.length), motivos: '', total: txtMonto(total, sym) },
            ]}
            filename="rechazados-por-actividad"
            onClose={() => setExportOpen(false)}
          />
        ) : <ExportListModal
          title={`Comprobantes rechazados: ${TABS[tab]}`}
          subtitulo={descripcionFiltros({ ...filtros, estados: new Set(['Rechazado']) })}
          columns={[
            { key: 'contraparte', label: colContraparte }, { key: 'tipo', label: 'Tipo de comprobante' },
            { key: 'consecutivo', label: 'Consecutivo' }, { key: 'fecha', label: 'Fecha de emisión' },
            { key: 'origen', label: colOrigen }, { key: 'motivo', label: 'Motivo del rechazo' },
            { key: 'total', label: 'Total', align: 'right' },
          ]}
          rows={[
            ...filas.map(c => ({
              contraparte: c.contraparte, tipo: c.tipo, consecutivo: c.consecutivo || 'Sin consecutivo', fecha: fmtFechaHora(c.fecha),
              origen: c.origen, motivo: c.motivoRechazo ?? SIN_MOTIVO, total: txtMonto(enVista(c, c.total, filtros), sym),
            })),
            { contraparte: 'Totalizado', tipo: '', consecutivo: '', fecha: '', origen: '', motivo: '', total: txtMonto(total, sym) },
          ]}
          filename="comprobantes-rechazados"
          onClose={() => setExportOpen(false)}
        />
      )}
    </ReporteLayout>
  );
}
