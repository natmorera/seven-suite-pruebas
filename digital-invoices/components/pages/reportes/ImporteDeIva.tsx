'use client';
import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExportListModal, Pagination, StatusBadge, C } from '@/components/ui/primitives';
import { CreditoFiscal, ESTADO_COLOR, Filtros, Totales, agruparPor, aplicarFiltros, enVista, filtrosIniciales, fmtFechaHora, simbolo, sumar, tarifasPresentes, useComprobantes } from './comun/datos';
import { AvisoReporte, BarraFiltros, Cargando, Encabezado, Enlace, Fila, FilaTotal, FilaVacia, Monto, ReporteLayout, Resumen, Tabla, Td, TdTotal, Th, descripcionFiltros, txtMonto } from './comun/ui';
import { esGuatemalaActual } from '@/lib/paisActual';

const TABS = ['Ventas (IVA débito)', 'Compras (IVA crédito)'] as const;
const INICIAL = filtrosIniciales({ soloAceptados: true });
const CREDITO_LABEL: Record<CreditoFiscal, string> = { pleno: 'Pleno', parcial: 'Parcial', sin_derecho: 'Sin derecho' };
const fmtTarifa = (t: number) => `IVA ${String(t).replace('.', ',')}%`;

export default function ImporteDeIva() {
  const { comprobantes, cargando } = useComprobantes();
  // Filtro por actividad: las de los documentos (la de cada venta o compra)
  const actividades = useMemo(() => Array.from(new Set(comprobantes.map(c => c.actividad))).sort(), [comprobantes]);
  const [tab, setTab] = useState(0);
  const [filtros, setFiltros] = useState<Filtros>(INICIAL);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const esVentas = tab === 0;
  const sym = simbolo(filtros);
  const filtrados = useMemo(() => aplicarFiltros(comprobantes, filtros, { excluirIncompletos: true }), [comprobantes, filtros]);
  const ventas = useMemo(() => filtrados.filter(c => c.lado === 'venta'), [filtrados]);
  const compras = useMemo(() => filtrados.filter(c => c.lado === 'compra'), [filtrados]);
  const lista = esVentas ? ventas : compras;
  const tarifas = useMemo(() => tarifasPresentes(lista), [lista]);

  const grupos = useMemo(() => Array.from(agruparPor(lista, c => esVentas ? c.contraparte : `${c.contraparte}||${c.credito}`).entries())
    .map(([k, docs]) => ({ key: k, nombre: docs[0].contraparte, credito: docs[0].credito, docs, t: sumar(docs, filtros) }))
    .sort((a, b) => b.t.iva - a.t.iva), [lista, esVentas, filtros]);
  const total = useMemo(() => sumar(lista, filtros), [lista, filtros]);

  // Resumen (siempre sobre ventas y compras del período filtrado)
  const ivaVentas = sumar(ventas, filtros).iva;
  const ivaPleno = sumar(compras.filter(c => c.credito === 'pleno'), filtros).iva;
  const ivaParcial = sumar(compras.filter(c => c.credito === 'parcial'), filtros).iva;
  const neto = ivaVentas - ivaPleno;

  const pagina = grupos.slice((page - 1) * pageSize, page * pageSize);
  const span = esVentas ? 1 : 2;
  const nCols = span + 3 + tarifas.length + 3;

  function celdas(t: Totales, total?: boolean) {
    const vals = [t.gravado, t.exento, t.descuentos, ...tarifas.map(x => t.porTarifa[String(x)]?.iva ?? 0), t.iva, t.otros, t.total];
    return vals.map((n, i) => total
      ? <TdTotal key={i}><Monto n={n} sym={sym} /></TdTotal>
      : <Td key={i} right bold={i === vals.length - 1}><Monto n={n} sym={sym} /></Td>);
  }
  const fila = (nombre: string, credito: string, t: Totales) => ({
    nombre, credito,
    gravado: txtMonto(t.gravado, sym), exento: txtMonto(t.exento, sym), descuentos: txtMonto(t.descuentos, sym),
    ...Object.fromEntries(tarifas.map(x => [`t${x}`, txtMonto(t.porTarifa[String(x)]?.iva ?? 0, sym)])),
    iva: txtMonto(t.iva, sym), otros: txtMonto(t.otros, sym), total: txtMonto(t.total, sym),
  });

  if (cargando) return <Cargando />;

  return (
    <ReporteLayout
      titulo="Importe de impuesto" filtros={filtros} onExportar={() => setExportOpen(true)} permisoExportar="fe.reportes.importe.exportar"
      tabs={[...TABS]} tab={tab} onTab={i => { setTab(i); setPage(1); setExpandido(null); }}
      barra={
        <BarraFiltros actividades={esGuatemalaActual() ? undefined : actividades} filtros={filtros} inicial={INICIAL} onChange={f => { setFiltros(f); setPage(1); }}
          placeholder={esVentas ? 'Busca cliente o consecutivo…' : 'Busca proveedor o consecutivo…'}
          conteo={`${lista.length} comprobantes`} />
      }
      aviso={<>
        <Resumen items={[
          { label: 'Débito fiscal', valor: <Monto n={ivaVentas} sym={sym} /> },
          { label: 'Crédito fiscal pleno', valor: <Monto n={ivaPleno} sym={sym} /> },
          { label: 'Crédito fiscal parcial', valor: <Monto n={ivaParcial} sym={sym} />, nota: 'Sujeto a proporcionalidad' },
          { label: neto >= 0 ? 'Diferencia estimada a pagar' : 'Saldo a favor estimado', valor: <Monto n={Math.abs(neto)} sym={sym} />, destacado: true,
            nota: 'Débito menos crédito pleno' },
        ]} />
        <AvisoReporte>
          {esGuatemalaActual() ? <>
            Solo documentos certificados (cámbialo en Estado); las notas de crédito restan. El detalle por documento está en los{' '}
            <Link href="/reportes/libros" style={{ color: C.brand }}>Libros de ventas y compras</Link>.
          </> : <>
            Solo comprobantes aceptados por Hacienda (cámbialo en Estado); las notas de crédito restan. La liquidación oficial,
            con proporcionalidad, está en el <Link href="/reportes/iva" style={{ color: C.brand }}>Reporte de IVA</Link>.
          </>}
        </AvisoReporte>
      </>}
      pie={<Pagination page={page} pageSize={pageSize} total={grupos.length} onPageChange={setPage} onPageSizeChange={setPageSize} />}
    >
      <Tabla minWidth={1000 + tarifas.length * 90}>
        <Encabezado>
          <Th>{esVentas ? 'Cliente' : 'Proveedor'}</Th>
          {!esVentas && <Th>Crédito fiscal</Th>}
          <Th right>Gravado</Th><Th right>Exento</Th><Th right>Descuentos</Th>
          {tarifas.map(t => <Th key={t} right>{fmtTarifa(t)}</Th>)}
          <Th right>Total IVA</Th><Th right>Otros cargos</Th><Th right>Total</Th>
        </Encabezado>
        <tbody>
          {pagina.length === 0 ? <FilaVacia span={nCols} /> : pagina.map((g, i) => {
            const abierto = expandido === g.key;
            return (
              <Fragment key={g.key}>
                <Fila i={i} activa={abierto}>
                  <Td><Enlace abierto={abierto} onClick={() => setExpandido(abierto ? null : g.key)}>{g.nombre}</Enlace></Td>
                  {!esVentas && <Td muted>{g.credito ? CREDITO_LABEL[g.credito] : '-'}</Td>}
                  {celdas(g.t)}
                </Fila>
                {abierto && g.docs.map(c => {
                  const v = (n: number) => enVista(c, n, filtros);
                  const vals = [c.gravado, c.exento, c.descuentos, ...tarifas.map(x => c.porTarifa[String(x)]?.iva ?? 0), c.iva, c.otros, c.total];
                  return (
                    <Fila key={c.id} i={0} sub>
                      <Td indent muted colSpan={span}>
                        {c.consecutivo} · {fmtFechaHora(c.fecha)}{' '}
                        <StatusBadge label={c.estado} color={ESTADO_COLOR[c.estado] ?? 'gray'} />
                      </Td>
                      {vals.map((n, k) => <Td key={k} right muted><Monto n={v(n)} sym={sym} /></Td>)}
                    </Fila>
                  );
                })}
              </Fragment>
            );
          })}
          <FilaTotal span={span}>{celdas(total, true)}</FilaTotal>
        </tbody>
      </Tabla>

      {exportOpen && (
        <ExportListModal
          title={`Importe de impuesto: ${TABS[tab]}`}
          subtitulo={descripcionFiltros(filtros)}
          columns={[
            { key: 'nombre', label: esVentas ? 'Cliente' : 'Proveedor' },
            ...(esVentas ? [] : [{ key: 'credito', label: 'Crédito fiscal' }]),
            { key: 'gravado', label: 'Gravado', align: 'right' as const }, { key: 'exento', label: 'Exento', align: 'right' as const },
            { key: 'descuentos', label: 'Descuentos', align: 'right' as const },
            ...tarifas.map(t => ({ key: `t${t}`, label: fmtTarifa(t), align: 'right' as const })),
            { key: 'iva', label: 'Total IVA', align: 'right' as const }, { key: 'otros', label: 'Otros cargos', align: 'right' as const },
            { key: 'total', label: 'Total', align: 'right' as const },
          ]}
          rows={[
            ...grupos.map(g => fila(g.nombre, g.credito ? CREDITO_LABEL[g.credito] : '', g.t)),
            fila('Totalizado', '', total),
          ]}
          filename="importe-de-impuesto"
          onClose={() => setExportOpen(false)}
        />
      )}
    </ReporteLayout>
  );
}
