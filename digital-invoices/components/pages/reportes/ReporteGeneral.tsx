'use client';
// Reporte general: listado de todos los comprobantes (ventas y compras) con
// su estado ante Hacienda. Es el único reporte que muestra TODOS los estados
// por defecto, pero el Totalizado nunca suma rechazados ni documentos sin
// consecutivo: se informan aparte para que el total cuadre con los reportes
// fiscales.
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExportListModal, FilterDropdown, Pagination, StatusBadge, C } from '@/components/ui/primitives';
import { tiposDocumento } from '@/data/catalogosHacienda';
import { Comprobante, ESTADO_COLOR, aplicarFiltros, enVista, filtrosIniciales, fmtFechaHora, simbolo, useComprobantes, Filtros } from './comun/datos';
import { BarraFiltros, Cargando, Encabezado, Enlace, Fila, FilaTotal, FilaVacia, Monto, ReporteLayout, Tabla, Td, TdTotal, Th, descripcionFiltros, txtMonto } from './comun/ui';
import { esGuatemalaActual } from '@/lib/paisActual';

const TABS = ['Ver todo', 'Ventas', 'Compras'] as const;
const INICIAL = filtrosIniciales();

const noSuma = (c: Comprobante) => c.estado === 'Rechazado' || c.incompleto;
const subtotal = (c: Comprobante) => c.gravado + c.exento - c.descuentos;

export default function ReporteGeneral() {
  const router = useRouter();
  const { comprobantes, cargando, error } = useComprobantes();
  // Filtro por actividad: las de los documentos (la de cada venta o compra)
  const actividades = useMemo(() => Array.from(new Set(comprobantes.map(c => c.actividad))).sort(), [comprobantes]);
  const [tab, setTab] = useState(1);
  const [filtros, setFiltros] = useState<Filtros>(INICIAL);
  const [tipos, setTipos] = useState<Set<string>>(new Set());
  const [origenes, setOrigenes] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const lado = tab === 1 ? 'venta' : tab === 2 ? 'compra' : null;
  const colContraparte = tab === 1 ? 'Cliente' : tab === 2 ? 'Proveedor' : 'Cliente / proveedor';
  const colOrigen = tab === 1 ? 'Módulo origen' : 'Origen';
  const placeholder = tab === 1 ? 'Busca cliente o consecutivo…' : tab === 2 ? 'Busca proveedor o consecutivo…' : 'Busca cliente, proveedor o consecutivo…';

  const delLado = useMemo(() => comprobantes.filter(c => !lado || c.lado === lado), [comprobantes, lado]);
  const opcionesOrigen = useMemo(() => Array.from(new Set(delLado.map(c => c.origen))).sort(), [delLado]);

  const filas = useMemo(() => aplicarFiltros(delLado, filtros)
    .filter(c => tipos.size === 0 || tipos.has(c.tipo))
    .filter(c => origenes.size === 0 || origenes.has(c.origen))
    .sort((a, b) => b.fecha.localeCompare(a.fecha)),
  [delLado, filtros, tipos, origenes]);

  const sym = simbolo(filtros);
  const v = (c: Comprobante, n: number) => enVista(c, n, filtros);
  const suman = filas.filter(c => !noSuma(c));
  const excluidos = filas.filter(noSuma);
  const tot = (lista: Comprobante[], f: (c: Comprobante) => number) => lista.reduce((a, c) => a + v(c, f(c)), 0);

  const pagina = filas.slice((page - 1) * pageSize, page * pageSize);
  const conTipo = tab === 0;
  const span = conTipo ? 8 : 7;
  const cambiarFiltros = (f: Filtros) => { setFiltros(f); setPage(1); };

  if (cargando) return <Cargando />;

  return (
    <ReporteLayout
      titulo="Reporte general" filtros={filtros} onExportar={() => setExportOpen(true)} permisoExportar="fe.reportes.general.exportar"
      tabs={[...TABS]} tab={tab} onTab={i => { setTab(i); setPage(1); setOrigenes(new Set()); }}
      barra={
        <BarraFiltros actividades={esGuatemalaActual() ? undefined : actividades} filtros={filtros} inicial={INICIAL} onChange={cambiarFiltros} placeholder={placeholder}
          conteo={`${filas.length} comprobante${filas.length === 1 ? '' : 's'}`}
          hayExtraActivo={tipos.size > 0 || origenes.size > 0}
          onLimpiarExtra={() => { setTipos(new Set()); setOrigenes(new Set()); }}
          extra={<>
            <FilterDropdown label="Tipo de comprobante" options={[...tiposDocumento()]} selected={tipos}
              onApply={s => { setTipos(s); setPage(1); }} onClear={() => setTipos(new Set())} />
            <FilterDropdown label={colOrigen} options={opcionesOrigen} selected={origenes}
              onApply={s => { setOrigenes(s); setPage(1); }} onClear={() => setOrigenes(new Set())} />
          </>} />
      }
      pie={<Pagination page={page} pageSize={pageSize} total={filas.length} onPageChange={setPage} onPageSizeChange={setPageSize} />}
    >
      {error && <p style={{ color: C.error, fontSize: 12 }}>{error}</p>}
      <Tabla minWidth={1100}>
        <Encabezado>
          {conTipo && <Th>Tipo</Th>}
          <Th>{colContraparte}</Th><Th>Tipo de comprobante</Th><Th>Consecutivo</Th><Th>Fecha de emisión</Th>
          <Th>Estado</Th><Th>{colOrigen}</Th><Th>Moneda</Th>
          <Th right>Subtotal</Th><Th right>IVA</Th><Th right>Total</Th>
        </Encabezado>
        <tbody>
          {pagina.length === 0 ? <FilaVacia span={span + 3} /> : pagina.map((c, i) => (
            <Fila key={c.lado + c.id} i={i}>
              {conTipo && <Td muted>{c.lado === 'venta' ? 'Venta' : 'Compra'}</Td>}
              <Td>{c.contraparte}</Td>
              <Td nowrap>{c.tipo}</Td>
              <Td nowrap>
                {c.incompleto
                  ? <span style={{ color: C.error }}>Sin consecutivo</span>
                  : c.lado === 'venta'
                    ? <Enlace onClick={() => router.push(`/facturacion/emitidos/${c.id.replace('#', '')}`)}>{c.consecutivo}</Enlace>
                    : <span style={{ fontVariantNumeric: 'tabular-nums' }}>{c.consecutivo}</span>}
              </Td>
              <Td nowrap>{fmtFechaHora(c.fecha)}</Td>
              <Td><StatusBadge label={c.estado} color={ESTADO_COLOR[c.estado] ?? 'gray'} /></Td>
              <Td nowrap>{c.origen}</Td>
              <Td muted>{c.moneda}</Td>
              <Td right><Monto n={v(c, subtotal(c))} sym={sym} /></Td>
              <Td right><Monto n={v(c, c.iva)} sym={sym} /></Td>
              <Td right bold><Monto n={v(c, c.total)} sym={sym} /></Td>
            </Fila>
          ))}
          <FilaTotal span={span} etiqueta={`Totalizado (${suman.length} válidos)`}>
            <TdTotal><Monto n={tot(suman, subtotal)} sym={sym} /></TdTotal>
            <TdTotal><Monto n={tot(suman, c => c.iva)} sym={sym} /></TdTotal>
            <TdTotal><Monto n={tot(suman, c => c.total)} sym={sym} /></TdTotal>
          </FilaTotal>
          {excluidos.length > 0 && (
            <tr style={{ background: '#FAFAFA' }}>
              <td colSpan={span} style={{ padding: '6px 12px 10px', fontSize: 11, color: C.n700 }}>
                No suman: {excluidos.length} rechazado{excluidos.length === 1 ? '' : 's'} o sin consecutivo
              </td>
              <td /><td />
              <td style={{ padding: '6px 12px 10px', textAlign: 'right', fontSize: 11, color: C.n700, whiteSpace: 'nowrap' }}>
                {txtMonto(tot(excluidos, c => c.total), sym)}
              </td>
            </tr>
          )}
        </tbody>
      </Tabla>

      {exportOpen && (
        <ExportListModal
          title={`Reporte general: ${TABS[tab]}`}
          subtitulo={descripcionFiltros(filtros)}
          columns={[
            ...(conTipo ? [{ key: 'lado', label: 'Tipo' }] : []),
            { key: 'contraparte', label: colContraparte }, { key: 'tipo', label: 'Tipo de comprobante' },
            { key: 'consecutivo', label: 'Consecutivo' }, { key: 'fecha', label: 'Fecha de emisión' },
            { key: 'estado', label: 'Estado' }, { key: 'origen', label: colOrigen }, { key: 'moneda', label: 'Moneda' },
            { key: 'subtotal', label: 'Subtotal', align: 'right' as const }, { key: 'iva', label: 'IVA', align: 'right' as const },
            { key: 'total', label: 'Total', align: 'right' as const },
          ]}
          rows={[
            ...filas.map(c => ({
              lado: c.lado === 'venta' ? 'Venta' : 'Compra', contraparte: c.contraparte, tipo: c.tipo,
              consecutivo: c.incompleto ? 'Sin consecutivo' : c.consecutivo, fecha: fmtFechaHora(c.fecha),
              estado: c.estado, origen: c.origen, moneda: c.moneda,
              subtotal: txtMonto(v(c, subtotal(c)), sym), iva: txtMonto(v(c, c.iva), sym), total: txtMonto(v(c, c.total), sym),
            })),
            { lado: '', contraparte: `Totalizado (${suman.length} válidos, sin rechazados)`, tipo: '', consecutivo: '', fecha: '', estado: '', origen: '', moneda: '',
              subtotal: txtMonto(tot(suman, subtotal), sym), iva: txtMonto(tot(suman, c => c.iva), sym), total: txtMonto(tot(suman, c => c.total), sym) },
          ]}
          filename="reporte-general"
          onClose={() => setExportOpen(false)}
        />
      )}
    </ReporteLayout>
  );
}
