'use client';
// Libros de IVA de Guatemala y listado de DTE.
//   · Libro de ventas y servicios prestados: un renglón por DTE emitido, con
//     ventas gravadas de bienes y de servicios, exentas, exportaciones e IVA débito.
//   · Libro de compras y servicios adquiridos: un renglón por compra registrada,
//     con compras gravadas de bienes y servicios, exentas e IVA crédito.
//   · Listado de DTE: todo lo emitido, en cualquier estado, con su autorización.
// Montos sin IVA (monto gravable); las notas de crédito restan. El impuesto de
// turismo y otros impuestos van en «Otros impuestos».
import { useMemo, useState } from 'react';
import { ExportListModal, Pagination, StatusBadge } from '@/components/ui/primitives';
import { ESTADO_COLOR, type Comprobante, type Filtros, aplicarFiltros, enVista, filtrosIniciales, simbolo } from './comun/datos';
import { AvisoReporte, BarraFiltros, Cargando, Encabezado, Fila, FilaTotal, FilaVacia, Monto, ReporteLayout, Resumen, Tabla, Td, TdTotal, Th, descripcionFiltros, txtMonto } from './comun/ui';
import { useComprobantes } from './comun/datos';
import { nombreDte } from '@/lib/perfilPais';

export type VistaLibros = 'libros' | 'dte';
const TABS_LIBROS = ['Libro de ventas', 'Libro de compras', 'Resumen del IVA'] as const;

const fecha = (iso: string) => (iso ? new Date(iso).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');
const serieNumero = (c: Comprobante) => {
  const [serie, ...resto] = String(c.consecutivo ?? '').split('-');
  return resto.length ? { serie, numero: resto.join('-') } : { serie: '', numero: serie };
};

// Montos del renglón de un libro (en la moneda de la vista)
function renglon(c: Comprobante, f: Filtros) {
  const v = (n: number) => enVista(c, n, f);
  const base = (p: Comprobante['partes']['bienes']) => Object.values(p.porTarifa).reduce((a, t) => a + t.base, 0);
  const bienes = v(base(c.partes.bienes));
  const servicios = v(base(c.partes.servicios));
  const exportaciones = v(c.ceroConCredito);
  const iva = v(c.iva), otros = v(c.otros), total = v(c.total);
  const exentos = total - iva - otros - bienes - servicios - exportaciones;
  return { bienes, servicios, exentos: Math.abs(exentos) < 0.005 ? 0 : exentos, exportaciones, iva, otros, total };
}
type Renglon = ReturnType<typeof renglon>;
const sumaRenglones = (rs: Renglon[]): Renglon => rs.reduce((a, r) => ({
  bienes: a.bienes + r.bienes, servicios: a.servicios + r.servicios, exentos: a.exentos + r.exentos, exportaciones: a.exportaciones + r.exportaciones,
  iva: a.iva + r.iva, otros: a.otros + r.otros, total: a.total + r.total,
}), { bienes: 0, servicios: 0, exentos: 0, exportaciones: 0, iva: 0, otros: 0, total: 0 });

export default function LibrosGT({ vista }: { vista: VistaLibros }) {
  const { comprobantes, cargando } = useComprobantes();
  const libros = vista === 'libros';
  const inicial = useMemo(() => filtrosIniciales({ soloAceptados: libros }), [libros]);
  const [filtros, setFiltros] = useState<Filtros>(inicial);
  const [tab, setTab] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const ventas = !libros || tab === 0;
  const resumenIva = libros && tab === 2;
  const sym = simbolo(filtros);
  const lista = useMemo(() => aplicarFiltros(comprobantes, filtros, { excluirIncompletos: true })
    .filter(c => c.lado === (ventas ? 'venta' : 'compra') && (!libros || c.tipoDte !== 'RANT'))   // el anticipo no es venta
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))), [comprobantes, filtros, ventas, libros]);
  const filas = useMemo(() => lista.map(c => ({ c, r: renglon(c, filtros), sn: serieNumero(c) })), [lista, filtros]);
  const total = useMemo(() => sumaRenglones(filas.map(f => f.r)), [filas]);
  const pagina = filas.slice((page - 1) * pageSize, page * pageSize);

  // Resumen del IVA del período: débito de ventas, crédito de compras con derecho
  const resumen = useMemo(() => {
    if (!resumenIva) return null;
    const base = aplicarFiltros(comprobantes, filtros, { excluirIncompletos: true });
    const vts = sumaRenglones(base.filter(c => c.lado === 'venta').map(c => renglon(c, filtros)));
    const cmpConCredito = base.filter(c => c.lado === 'compra' && c.credito !== 'sin_derecho');
    const cmp = sumaRenglones(cmpConCredito.map(c => renglon(c, filtros)));
    const sinCredito = sumaRenglones(base.filter(c => c.lado === 'compra' && c.credito === 'sin_derecho').map(c => renglon(c, filtros)));
    const credito = cmpConCredito.reduce((a, c) => a + enVista(c, c.iva, filtros) * (c.credito === 'parcial' ? 0.5 : 1), 0);
    const ivaFesp = base.filter(c => c.lado === 'compra' && c.tipoDte === 'FESP').reduce((a, c) => a + enVista(c, c.iva, filtros), 0);
    return { vts, cmp, sinCredito, credito, ivaFesp, resultado: vts.iva - credito };
  }, [resumenIva, comprobantes, filtros]);

  if (cargando) return <Cargando />;

  const titulo = libros ? (ventas ? 'Libro de ventas y servicios prestados' : 'Libro de compras y servicios adquiridos') : 'Listado de DTE';
  const contraparte = ventas ? 'Cliente' : 'Proveedor';
  const columnasLibro = [
    { key: 'fecha', label: 'Fecha' }, { key: 'tipo', label: 'Tipo' }, { key: 'serie', label: 'Serie' }, { key: 'numero', label: 'Número' },
    { key: 'nit', label: 'NIT' }, { key: 'nombre', label: contraparte },
    { key: 'bienes', label: 'Bienes gravados', align: 'right' as const }, { key: 'servicios', label: 'Servicios gravados', align: 'right' as const },
    { key: 'exentos', label: 'Exentos', align: 'right' as const },
    ...(ventas ? [{ key: 'exportaciones', label: 'Exportaciones', align: 'right' as const }] : []),
    { key: 'iva', label: ventas ? 'IVA débito' : 'IVA crédito', align: 'right' as const },
    { key: 'otros', label: 'Otros impuestos', align: 'right' as const }, { key: 'total', label: 'Total', align: 'right' as const },
  ];
  const columnasDte = [
    { key: 'fecha', label: 'Fecha' }, { key: 'tipo', label: 'Tipo de DTE' }, { key: 'serie', label: 'Serie' }, { key: 'numero', label: 'Número' },
    { key: 'autorizacion', label: 'Número de autorización' }, { key: 'nit', label: 'NIT receptor' }, { key: 'nombre', label: 'Receptor' },
    { key: 'estado', label: 'Estado' }, { key: 'total', label: 'Total', align: 'right' as const },
  ];
  const nCols = libros ? columnasLibro.length : columnasDte.length;
  const filaExport = (x: typeof filas[number]): Record<string, string> => libros ? {
    fecha: fecha(x.c.fecha), tipo: x.c.tipoDte, serie: x.sn.serie, numero: x.sn.numero, nit: x.c.nit, nombre: x.c.contraparte,
    bienes: txtMonto(x.r.bienes, sym), servicios: txtMonto(x.r.servicios, sym), exentos: txtMonto(x.r.exentos, sym),
    exportaciones: txtMonto(x.r.exportaciones, sym), iva: txtMonto(x.r.iva, sym), otros: txtMonto(x.r.otros, sym), total: txtMonto(x.r.total, sym),
  } : {
    fecha: fecha(x.c.fecha), tipo: `${x.c.tipoDte} · ${nombreDte(x.c.tipoDte)}`, serie: x.sn.serie, numero: x.sn.numero,
    autorizacion: x.c.clave, nit: x.c.nit, nombre: x.c.contraparte, estado: x.c.estado, total: txtMonto(x.r.total, sym),
  };

  return (
    <ReporteLayout
      titulo={titulo} filtros={filtros} onExportar={() => setExportOpen(true)} permisoExportar="fe.reportes.general.exportar"
      tabs={libros ? [...TABS_LIBROS] : undefined} tab={tab} onTab={i => { setTab(i); setPage(1); }}
      barra={
        <BarraFiltros filtros={filtros} inicial={inicial} onChange={f => { setFiltros(f); setPage(1); }}
          placeholder={`Busca ${contraparte.toLowerCase()}, serie o número…`} conteo={`${lista.length} documentos`} />
      }
      aviso={resumenIva ? (
        <AvisoReporte>
          Resumen para preparar la declaración mensual del IVA (SAT-2237): no la reemplaza. Elige el mes en Fecha. Falta restar el remanente
          del mes anterior y las retenciones de IVA que te hicieron. El crédito de una compra solo se puede reportar en su mes o en los dos siguientes (art. 20 Ley del IVA).
        </AvisoReporte>
      ) : libros ? <>
        <Resumen items={[
          { label: 'Gravado', valor: <Monto n={total.bienes + total.servicios} sym={sym} />, nota: 'Bienes y servicios, sin IVA' },
          { label: 'Exento y exportaciones', valor: <Monto n={total.exentos + total.exportaciones} sym={sym} /> },
          { label: ventas ? 'IVA débito fiscal' : 'IVA crédito fiscal', valor: <Monto n={total.iva} sym={sym} />, destacado: true },
          { label: 'Total', valor: <Monto n={total.total} sym={sym} /> },
        ]} />
        <AvisoReporte>
          {ventas ? 'DTE certificados de la empresa' : 'Compras registradas'} del período, en orden de fecha. Montos sin IVA; las notas de crédito restan.
          El impuesto de turismo y los demás impuestos van en «Otros impuestos».
        </AvisoReporte>
      </> : (
        <AvisoReporte>Todos los DTE emitidos, en cualquier estado. Filtra por Estado para ver solo los certificados o los rechazados.</AvisoReporte>
      )}
      pie={<Pagination page={page} pageSize={pageSize} total={filas.length} onPageChange={setPage} onPageSizeChange={setPageSize} />}
    >
      {resumen ? (
        <Tabla minWidth={640}>
          <Encabezado><Th>Concepto</Th><Th right>Base</Th><Th right>IVA</Th></Encabezado>
          <tbody>
            {([
              ['Ventas gravadas de bienes', resumen.vts.bienes, null],
              ['Ventas gravadas de servicios', resumen.vts.servicios, null],
              ['Ventas exentas', resumen.vts.exentos, null],
              ['Exportaciones', resumen.vts.exportaciones, null],
              ['Débito fiscal', resumen.vts.bienes + resumen.vts.servicios, resumen.vts.iva],
              ['Compras gravadas de bienes', resumen.cmp.bienes, null],
              ['Compras gravadas de servicios', resumen.cmp.servicios, null],
              ['Compras sin derecho a crédito', resumen.sinCredito.total, null],
              ['Crédito fiscal', resumen.cmp.bienes + resumen.cmp.servicios, resumen.credito],
              ['IVA retenido en facturas especiales (se paga aparte)', null, resumen.ivaFesp],
            ] as [string, number | null, number | null][]).map(([l, b, i], k) => (
              <Fila key={l} i={k}>
                <Td bold={l === 'Débito fiscal' || l === 'Crédito fiscal'}>{l}</Td>
                <Td right>{b === null ? '' : <Monto n={b} sym={sym} />}</Td>
                <Td right bold>{i === null ? '' : <Monto n={i} sym={sym} />}</Td>
              </Fila>
            ))}
            <FilaTotal etiqueta={resumen.resultado >= 0 ? 'IVA a pagar (antes de remanente y retenciones recibidas)' : 'Crédito fiscal a favor (remanente)'} span={2}>
              <TdTotal><Monto n={Math.abs(resumen.resultado)} sym={sym} /></TdTotal>
            </FilaTotal>
          </tbody>
        </Tabla>
      ) : (
      <Tabla minWidth={libros ? 1280 : 1180}>
        <Encabezado>
          {(libros ? columnasLibro : columnasDte).map(c => <Th key={c.key} right={c.align === 'right'}>{c.label}</Th>)}
        </Encabezado>
        <tbody>
          {pagina.length === 0 ? <FilaVacia span={nCols} texto="No hay documentos para el período y los filtros seleccionados." /> : pagina.map((x, i) => (
            <Fila key={x.c.id} i={i}>
              <Td nowrap>{fecha(x.c.fecha)}</Td>
              <Td nowrap>{libros ? x.c.tipoDte : `${x.c.tipoDte} · ${nombreDte(x.c.tipoDte)}`}</Td>
              <Td nowrap>{x.sn.serie || '-'}</Td>
              <Td nowrap>{x.sn.numero || '-'}</Td>
              {libros ? <>
                <Td nowrap>{x.c.nit || '-'}</Td>
                <Td>{x.c.contraparte}</Td>
                <Td right><Monto n={x.r.bienes} sym={sym} /></Td>
                <Td right><Monto n={x.r.servicios} sym={sym} /></Td>
                <Td right><Monto n={x.r.exentos} sym={sym} /></Td>
                {ventas && <Td right><Monto n={x.r.exportaciones} sym={sym} /></Td>}
                <Td right><Monto n={x.r.iva} sym={sym} /></Td>
                <Td right><Monto n={x.r.otros} sym={sym} /></Td>
                <Td right bold><Monto n={x.r.total} sym={sym} /></Td>
              </> : <>
                <Td muted nowrap>{x.c.clave || '-'}</Td>
                <Td nowrap>{x.c.nit || '-'}</Td>
                <Td>{x.c.contraparte}</Td>
                <Td><StatusBadge label={x.c.estado} color={ESTADO_COLOR[x.c.estado] ?? 'gray'} /></Td>
                <Td right bold><Monto n={x.r.total} sym={sym} /></Td>
              </>}
            </Fila>
          ))}
          {libros ? (
            <FilaTotal span={6}>
              {[total.bienes, total.servicios, total.exentos, ...(ventas ? [total.exportaciones] : []), total.iva, total.otros, total.total]
                .map((n, k) => <TdTotal key={k}><Monto n={n} sym={sym} /></TdTotal>)}
            </FilaTotal>
          ) : (
            <FilaTotal span={8}><TdTotal><Monto n={total.total} sym={sym} /></TdTotal></FilaTotal>
          )}
        </tbody>
      </Tabla>
      )}

      {exportOpen && (
        <ExportListModal
          title={titulo} subtitulo={descripcionFiltros(filtros)}
          columns={libros ? columnasLibro : columnasDte}
          rows={[
            ...filas.map(filaExport),
            ...(libros ? [{
              fecha: 'Totalizado', tipo: '', serie: '', numero: '', nit: '', nombre: '',
              bienes: txtMonto(total.bienes, sym), servicios: txtMonto(total.servicios, sym), exentos: txtMonto(total.exentos, sym),
              exportaciones: txtMonto(total.exportaciones, sym), iva: txtMonto(total.iva, sym), otros: txtMonto(total.otros, sym), total: txtMonto(total.total, sym),
            }] : []),
          ]}
          filename={libros ? (ventas ? 'libro-de-ventas' : 'libro-de-compras') : 'listado-de-dte'}
          onClose={() => setExportOpen(false)}
        />
      )}
    </ReporteLayout>
  );
}
