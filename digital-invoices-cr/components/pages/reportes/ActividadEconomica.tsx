'use client';
import { Fragment, useMemo, useState } from 'react';
import { ExportListModal, Pagination, StatusBadge } from '@/components/ui/primitives';
import { Comprobante, CreditoFiscal, ESTADO_COLOR, Filtros, Totales, agruparPor, aplicarFiltros, enVista, filtrosIniciales, fmtFechaHora, simbolo, sumar, useComprobantes } from './comun/datos';
import { AvisoReporte, BarraFiltros, Cargando, Encabezado, Enlace, Fila, FilaTotal, FilaVacia, Monto, ReporteLayout, Tabla, Td, TdTotal, Th, descripcionFiltros, txtMonto } from './comun/ui';

type TabId = 'todo' | 'ventas' | CreditoFiscal;
const TABS: { id: TabId; label: string }[] = [
  { id: 'todo', label: 'Ver todo' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'pleno', label: 'Compras con crédito pleno' },
  { id: 'parcial', label: 'Compras con crédito parcial' },
  { id: 'sin_derecho', label: 'Compras sin derecho a crédito' },
];
const INICIAL = filtrosIniciales({ soloAceptados: true });

function delTab(c: Comprobante, t: TabId) {
  if (t === 'todo') return true;
  if (t === 'ventas') return c.lado === 'venta';
  return c.lado === 'compra' && c.credito === t;
}

const COLS = ['Gravado', 'Exento', 'Descuentos', 'IVA', 'Otros cargos', 'Total'];
function celdas(t: Totales, sym: string, Comp: typeof Td | typeof TdTotal = Td) {
  const vals = [t.gravado, t.exento, t.descuentos, t.iva, t.otros, t.total];
  return vals.map((n, i) => Comp === Td
    ? <Td key={i} right bold={i === 5}><Monto n={n} sym={sym} /></Td>
    : <TdTotal key={i}><Monto n={n} sym={sym} /></TdTotal>);
}
function txtCeldas(t: Totales, sym: string) {
  return { gravado: txtMonto(t.gravado, sym), exento: txtMonto(t.exento, sym), descuentos: txtMonto(t.descuentos, sym),
    iva: txtMonto(t.iva, sym), otros: txtMonto(t.otros, sym), total: txtMonto(t.total, sym) };
}

export default function ActividadEconomica() {
  const { comprobantes, cargando } = useComprobantes();
  const [tabIdx, setTabIdx] = useState(0);
  const [filtros, setFiltros] = useState<Filtros>(INICIAL);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const tab = TABS[tabIdx].id;
  const sym = simbolo(filtros);
  const actividades = useMemo(() => Array.from(new Set(comprobantes.map(c => c.actividad))).sort(), [comprobantes]);
  const filtrados = useMemo(() => aplicarFiltros(comprobantes, filtros, { excluirIncompletos: true }), [comprobantes, filtros]);
  const actividadesVisibles = useMemo(() => Array.from(new Set(filtrados.map(c => c.actividad))).sort(), [filtrados]);
  const variasActividades = actividadesVisibles.length > 1;
  const hayEstimados = filtrados.some(c => c.estimado);

  // Detalle por contraparte (pestañas distintas de "Ver todo")
  const grupos = useMemo(() => {
    if (tab === 'todo') return [];
    const lista = filtrados.filter(c => delTab(c, tab));
    return Array.from(agruparPor(lista, c => `${c.actividad}||${c.contraparte}`).entries())
      .map(([k, docs]) => ({ key: k, actividad: docs[0].actividad, contraparte: docs[0].contraparte, docs, t: sumar(docs, filtros) }))
      .sort((a, b) => a.actividad.localeCompare(b.actividad) || b.t.total - a.t.total);
  }, [filtrados, tab, filtros]);

  const totalTab = useMemo(() => sumar(filtrados.filter(c => tab !== 'todo' && delTab(c, tab)), filtros), [filtrados, tab, filtros]);
  const totalVentas = useMemo(() => sumar(filtrados.filter(c => c.lado === 'venta'), filtros), [filtrados, filtros]);
  const totalCompras = useMemo(() => sumar(filtrados.filter(c => c.lado === 'compra'), filtros), [filtrados, filtros]);

  const pagina = grupos.slice((page - 1) * pageSize, page * pageSize);
  const colContraparte = tab === 'ventas' ? 'Cliente' : 'Proveedor';
  const placeholder = tab === 'todo' ? 'Busca cliente, proveedor o consecutivo…' : tab === 'ventas' ? 'Busca cliente o consecutivo…' : 'Busca proveedor o consecutivo…';
  const irATab = (id: TabId) => { setTabIdx(TABS.findIndex(t => t.id === id)); setPage(1); setExpandido(null); };

  if (cargando) return <Cargando />;

  // Filas de exportación
  const filasExport = tab === 'todo'
    ? actividadesVisibles.flatMap(a => TABS.slice(1).map(t => ({
        actividad: a, nombre: t.label, ...txtCeldas(sumar(filtrados.filter(c => c.actividad === a && delTab(c, t.id)), filtros), sym),
      })))
    : grupos.map(g => ({ actividad: g.actividad, nombre: g.contraparte, ...txtCeldas(g.t, sym) }));
  if (tab === 'todo') {
    filasExport.push({ actividad: '', nombre: 'Total ventas', ...txtCeldas(totalVentas, sym) });
    filasExport.push({ actividad: '', nombre: 'Total compras', ...txtCeldas(totalCompras, sym) });
  } else {
    filasExport.push({ actividad: '', nombre: 'Totalizado', ...txtCeldas(totalTab, sym) });
  }

  return (
    <ReporteLayout
      titulo="Actividad económica" filtros={filtros} onExportar={() => setExportOpen(true)} permisoExportar="fe.reportes.actividad.exportar"
      tabs={TABS.map(t => t.label)} tab={tabIdx} onTab={i => { setTabIdx(i); setPage(1); setExpandido(null); }}
      barra={
        <BarraFiltros filtros={filtros} inicial={INICIAL} onChange={f => { setFiltros(f); setPage(1); }}
          placeholder={placeholder} actividades={actividades}
          conteo={`${filtrados.filter(c => delTab(c, tab)).length} comprobantes`} />
      }
      aviso={
        <AvisoReporte>
          {filtros.estados.size === 1 && filtros.estados.has('Aceptado')
            ? 'Solo se incluyen comprobantes aceptados por Hacienda; puedes cambiarlo en el filtro Estado.'
            : 'Atención: el filtro de estado incluye comprobantes que no están aceptados por Hacienda.'}
          {' '}Los borradores y documentos sin consecutivo nunca suman.
          {hayEstimados && ' Algunos montos se calcularon desde el encabezado del documento porque no traen detalle de líneas.'}
        </AvisoReporte>
      }
      pie={tab !== 'todo' ? <Pagination page={page} pageSize={pageSize} total={grupos.length} onPageChange={setPage} onPageSizeChange={setPageSize} /> : undefined}
    >
      <Tabla minWidth={1000}>
        <Encabezado>
          <Th>{tab === 'todo' ? 'Actividad / tipo de operación' : colContraparte}</Th>
          {COLS.map(c => <Th key={c} right>{c}</Th>)}
        </Encabezado>
        <tbody>
          {tab === 'todo' ? (
            actividadesVisibles.length === 0 ? <FilaVacia span={7} /> : <>
              {actividadesVisibles.map(a => (
                <Fragment key={a}>
                  <tr style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td colSpan={7} style={{ padding: '14px 12px 6px', fontSize: 12, fontWeight: 600 }}>{a}</td>
                  </tr>
                  {TABS.slice(1).map((t, i) => (
                    <Fila key={t.id} i={i}>
                      <Td indent><Enlace onClick={() => irATab(t.id)}>{t.label}</Enlace></Td>
                      {celdas(sumar(filtrados.filter(c => c.actividad === a && delTab(c, t.id)), filtros), sym)}
                    </Fila>
                  ))}
                </Fragment>
              ))}
              <FilaTotal span={1} etiqueta="Total ventas">{celdas(totalVentas, sym, TdTotal)}</FilaTotal>
              <FilaTotal span={1} etiqueta="Total compras">{celdas(totalCompras, sym, TdTotal)}</FilaTotal>
            </>
          ) : (
            <>
              {pagina.length === 0 ? <FilaVacia span={7} /> : pagina.map((g, i) => {
                const abierto = expandido === g.key;
                const nuevaActividad = variasActividades && (i === 0 || pagina[i - 1].actividad !== g.actividad);
                return (
                  <Fragment key={g.key}>
                    {nuevaActividad && (
                      <tr><td colSpan={7} style={{ padding: '14px 12px 6px', fontSize: 12, fontWeight: 600 }}>{g.actividad}</td></tr>
                    )}
                    <Fila i={i} activa={abierto}>
                      <Td><Enlace abierto={abierto} onClick={() => setExpandido(abierto ? null : g.key)}>{g.contraparte}</Enlace>
                        <span style={{ fontSize: 11, color: '#757575', marginLeft: 8 }}>{g.docs.length} doc.</span></Td>
                      {celdas(g.t, sym)}
                    </Fila>
                    {abierto && g.docs.map(c => {
                      const v = (n: number) => enVista(c, n, filtros);
                      return (
                        <Fila key={c.id} i={0} sub>
                          <Td indent muted>
                            {c.consecutivo} · {fmtFechaHora(c.fecha)}{' '}
                            <StatusBadge label={c.estado} color={ESTADO_COLOR[c.estado] ?? 'gray'} />
                          </Td>
                          {[c.gravado, c.exento, c.descuentos, c.iva, c.otros, c.total].map((n, k) => (
                            <Td key={k} right muted><Monto n={v(n)} sym={sym} /></Td>
                          ))}
                        </Fila>
                      );
                    })}
                  </Fragment>
                );
              })}
              <FilaTotal span={1}>{celdas(totalTab, sym, TdTotal)}</FilaTotal>
            </>
          )}
        </tbody>
      </Tabla>

      {exportOpen && (
        <ExportListModal
          title={`Actividad económica: ${TABS[tabIdx].label}`}
          subtitulo={descripcionFiltros(filtros)}
          columns={[
            { key: 'actividad', label: 'Actividad económica' },
            { key: 'nombre', label: tab === 'todo' ? 'Tipo de operación' : colContraparte },
            { key: 'gravado', label: 'Gravado', align: 'right' }, { key: 'exento', label: 'Exento', align: 'right' },
            { key: 'descuentos', label: 'Descuentos', align: 'right' }, { key: 'iva', label: 'IVA', align: 'right' },
            { key: 'otros', label: 'Otros cargos', align: 'right' }, { key: 'total', label: 'Total', align: 'right' },
          ]}
          rows={filasExport}
          filename="actividad-economica"
          onClose={() => setExportOpen(false)}
        />
      )}
    </ReporteLayout>
  );
}
