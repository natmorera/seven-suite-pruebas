'use client';
import { useMemo, useState } from 'react';
import { PageHeader, C, FONT, BotonExportarUnico, ExportListModal } from '@/components/ui/primitives';
import { usePermisos } from '@/lib/permisosCliente';
import InfoTooltip from '../facturacion/InfoTooltip';
import { Filtros, aplicarFiltros, enVista, filtrosIniciales, useComprobantes } from './comun/datos';
import { BarraFiltros, descripcionFiltros, etiquetaPeriodo } from './comun/ui';

const INICIAL = filtrosIniciales({ soloAceptados: true });


// Tarifas oficiales de IVA en Costa Rica según el propio formulario D-150
// — no son "las que se nos ocurrieron", son las que Hacienda pone en la
// declaración. 4% (servicios aéreos) es una categoría aparte de Hacienda
// que no podemos distinguir del 4% general con los datos que tenemos hoy,
// así que queda en 0 explícitamente (ver fila correspondiente).
const TARIFAS_VENTA = [0.5, 1, 2, 3, 4, 13] as const;
const TARIFAS_COMPRA = [0.5, 1, 2, 3, 4, 13] as const;

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function tarifaMasCercana(t: number, oficiales: readonly number[]): number {
  return oficiales.includes(t) ? t : 0; // cualquier tarifa rara (dato mal cargado) cae en exento, nunca se pierde silenciosamente de otra forma
}

type Fila = { label: string; valor: number | null; modelado: boolean; bold?: boolean; indent?: boolean };

export default function ReporteIva() {
  const { puede } = usePermisos();
  const { comprobantes, cargando } = useComprobantes();
  // Filtro por actividad: las de los documentos (la de cada venta o compra)
  const actividades = useMemo(() => Array.from(new Set(comprobantes.map(c => c.actividad))).sort(), [comprobantes]);
  const [filtros, setFiltros] = useState<Filtros>(INICIAL);
  const [exportOpen, setExportOpen] = useState(false);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set(['Ventas generales', 'Compras totales', 'Crédito fiscal', 'Resumen']));
  const filtrados = useMemo(() => aplicarFiltros(comprobantes, filtros, { excluirIncompletos: true }), [comprobantes, filtros]);

  const calc = useMemo(() => {
    const ventasPorTarifa: Record<number, { total: number; impuesto: number }> = {};
    for (const t of TARIFAS_VENTA) ventasPorTarifa[t] = { total: 0, impuesto: 0 };
    for (const c of filtrados) {
      if (c.lado !== 'venta' || c.estado !== 'Aceptado') continue;
      // porTarifa ya viene con signo (las notas de crédito restan)
      for (const [k, m] of Object.entries(c.porTarifa)) {
        const tarifa = tarifaMasCercana(Number(k), TARIFAS_VENTA);
        if (tarifa === 0) continue; // exento/no sujeto — no tiene casilla de "monto de impuesto" propia en esta sección
        ventasPorTarifa[tarifa].total += enVista(c, m.base, filtros);
        ventasPorTarifa[tarifa].impuesto += enVista(c, m.iva, filtros);
      }
    }
    const totalVentasGeneralesGravadas = Object.values(ventasPorTarifa).reduce((a, v) => a + v.total, 0);
    const montoImpuestoVentas = Object.values(ventasPorTarifa).reduce((a, v) => a + v.impuesto, 0);

    const comprasPorTarifa: Record<number, { total: number; impuesto: number }> = {};
    for (const t of TARIFAS_COMPRA) comprasPorTarifa[t] = { total: 0, impuesto: 0 };
    let creditoPleno = 0, creditoParcial = 0, sinDerecho = 0;
    for (const c of filtrados) {
      if (c.lado !== 'compra' || c.estado !== 'Aceptado') continue;
      const iva = enVista(c, c.iva, filtros);
      for (const [k, m] of Object.entries(c.porTarifa)) {
        const tarifa = tarifaMasCercana(Number(k), TARIFAS_COMPRA);
        if (tarifa > 0) { comprasPorTarifa[tarifa].total += enVista(c, m.base, filtros); comprasPorTarifa[tarifa].impuesto += enVista(c, m.iva, filtros); }
      }
      if (c.credito === 'pleno') creditoPleno += iva;
      else if (c.credito === 'parcial') creditoParcial += iva;
      else sinDerecho += iva;
    }
    const totalImporteCompras = Object.values(comprasPorTarifa).reduce((a, v) => a + v.total, 0);
    const totalImpuestoSoportado = Object.values(comprasPorTarifa).reduce((a, v) => a + v.impuesto, 0);
    // El crédito parcial real depende de la prorrata de ventas gravadas vs.
    // exentas del período — no modelada todavía, así que se muestra al 50%
    // de referencia (ver nota bajo la sección de Crédito fiscal).
    const creditoParcialAplicado = creditoParcial * 0.5;
    const totalCreditoFiscal = creditoPleno + creditoParcialAplicado;

    const impuestoDeterminado = Math.max(0, montoImpuestoVentas - totalCreditoFiscal);
    const saldoAFavor = Math.max(0, totalCreditoFiscal - montoImpuestoVentas);

    return { ventasPorTarifa, totalVentasGeneralesGravadas, montoImpuestoVentas, comprasPorTarifa, totalImporteCompras, totalImpuestoSoportado, creditoPleno, creditoParcial, creditoParcialAplicado, sinDerecho, totalCreditoFiscal, impuestoDeterminado, saldoAFavor };
  }, [filtrados, filtros]);

  if (cargando) return <div style={{ padding: 24, fontSize: 12, color: C.n700 }}>Cargando…</div>;

  // Las 11 secciones del D-150, en el mismo orden que el formulario real.
  // `modelado: false` = Hacienda pide este dato pero todavía no lo
  // calculamos con datos reales (se muestra en 0 y en gris, no oculto).
  const secciones: { titulo: string; filas: Fila[] }[] = [
    {
      titulo: 'Ventas generales',
      filas: [
        ...TARIFAS_VENTA.flatMap(t => [
          { label: `Total ventas a ${t}%`, valor: calc.ventasPorTarifa[t].total, modelado: true, indent: true },
          { label: `Monto de impuesto a ${t}%`, valor: calc.ventasPorTarifa[t].impuesto, modelado: true, indent: true },
        ]),
        { label: 'Total ventas a 4% (servicios aéreos internacionales exclusivos)', valor: 0, modelado: false, indent: true },
        { label: 'Monto de impuesto a 4% (servicios aéreos internacionales exclusivos)', valor: 0, modelado: false, indent: true },
        { label: 'Total ventas exentas con derecho a crédito pleno', valor: 0, modelado: false, indent: true },
        { label: 'Total ventas exoneradas con derecho a crédito pleno', valor: 0, modelado: false, indent: true },
        { label: 'Total ventas no sujetas con derecho a crédito pleno', valor: 0, modelado: false, indent: true },
        { label: 'Total ventas exentas sin derecho a crédito', valor: 0, modelado: false, indent: true },
        { label: 'Total ventas exoneradas sin derecho a crédito', valor: 0, modelado: false, indent: true },
        { label: 'Total ventas no sujetas sin derecho a crédito', valor: 0, modelado: false, indent: true },
        { label: 'Total ventas de bienes de capital exentas sin derecho a crédito', valor: 0, modelado: false, indent: true },
        { label: 'Total ventas generales', valor: calc.totalVentasGeneralesGravadas, modelado: true, bold: true },
        { label: 'Total ventas generales gravadas', valor: calc.totalVentasGeneralesGravadas, modelado: true, bold: true },
        { label: 'Monto del impuesto ventas generales', valor: calc.montoImpuestoVentas, modelado: true, bold: true },
      ],
    },
    {
      titulo: 'Ventas sistema especial determinación del IVA',
      filas: [
        { label: 'Total ventas según sistema especial', valor: 0, modelado: false },
        { label: 'Monto del impuesto sistema especial', valor: 0, modelado: false },
      ],
    },
    {
      titulo: 'Actividades de casinos y juegos de azar',
      filas: [
        { label: 'Monto de salario base para el periodo', valor: 0, modelado: false },
        { label: 'Monto del impuesto por casinos', valor: 0, modelado: false },
        { label: 'Valor de lo apostado', valor: 0, modelado: false },
        { label: 'Monto del impuesto por juegos de azar', valor: 0, modelado: false },
        { label: 'Monto total del impuesto por casinos y juegos de azar', valor: 0, modelado: false, bold: true },
      ],
    },
    {
      titulo: 'Pago diferido del impuesto por ventas a crédito del periodo a presentar o de periodos anteriores',
      filas: [
        { label: 'Monto de impuesto por ventas a crédito del periodo a presentar', valor: 0, modelado: false },
        { label: 'Monto de impuesto por ventas a crédito de periodos anteriores canceladas', valor: 0, modelado: false },
      ],
    },
    {
      titulo: 'Compras totales',
      filas: [
        ...TARIFAS_COMPRA.flatMap(t => [
          { label: `Total importe compras a ${t}%`, valor: calc.comprasPorTarifa[t].total, modelado: true, indent: true },
          { label: `Impuesto soportado a ${t}%`, valor: calc.comprasPorTarifa[t].impuesto, modelado: true, indent: true },
        ]),
        { label: 'Bienes y servicios adquiridos a otros regímenes', valor: 0, modelado: false, indent: true },
        { label: 'Bienes y servicios exentos', valor: 0, modelado: false, indent: true },
        { label: 'Bienes y servicios no sujetos', valor: 0, modelado: false, indent: true },
        { label: 'Compras autorizadas sin impuesto', valor: 0, modelado: false, indent: true },
        { label: 'Bienes y servicios según artículo 19 de la LIVA', valor: 0, modelado: false, indent: true },
        { label: 'Compras bajo el sistema especial', valor: 0, modelado: false, indent: true },
        { label: 'Total importe compras', valor: calc.totalImporteCompras, modelado: true, bold: true },
        { label: 'Total importe de compras con IVA soportado', valor: calc.totalImporteCompras, modelado: true, bold: true },
        { label: 'Total impuesto soportado', valor: calc.totalImpuestoSoportado, modelado: true, bold: true },
      ],
    },
    {
      titulo: 'Crédito fiscal',
      filas: [
        { label: 'Con derecho a crédito pleno', valor: calc.creditoPleno, modelado: true },
        { label: 'Con derecho a crédito parcial (50% de referencia, ver nota)', valor: calc.creditoParcialAplicado, modelado: false },
        { label: 'Sin derecho a crédito', valor: calc.sinDerecho, modelado: true },
        { label: 'Total crédito fiscal del periodo', valor: calc.totalCreditoFiscal, modelado: true, bold: true },
        { label: 'Total importe de gasto para utilidades', valor: 0, modelado: false },
      ],
    },
    {
      titulo: 'Compras y cálculo de proporcionalidad',
      filas: [
        { label: 'Conoce a qué tipo de ventas destinó las compras', valor: null, modelado: false },
        { label: 'Total compras identificadas', valor: 0, modelado: false },
        { label: 'Total compras no identificadas', valor: 0, modelado: false },
      ],
    },
    {
      titulo: 'Créditos por compras identificadas',
      filas: [
        { label: 'Total crédito por compras identificadas', valor: 0, modelado: false },
        { label: 'Total gasto para utilidades de compras identificadas', valor: 0, modelado: false },
      ],
    },
    {
      titulo: 'Créditos por compras no identificadas',
      filas: [
        { label: 'Total crédito fiscal con proporción de ventas', valor: 0, modelado: false },
        { label: 'Total gasto para utilidades de compras con proporción', valor: 0, modelado: false },
      ],
    },
    {
      titulo: 'Cálculo del impuesto',
      filas: [
        { label: 'Monto del impuesto ventas generales', valor: calc.montoImpuestoVentas, modelado: true },
        { label: 'Total monto del impuesto', valor: calc.montoImpuestoVentas, modelado: true, bold: true },
        { label: 'Total crédito fiscal para el IVA', valor: calc.totalCreditoFiscal, modelado: true, bold: true },
        { label: 'Total gasto para utilidades', valor: 0, modelado: false },
        { label: 'Débito por auto repercusión del impuesto', valor: 0, modelado: false },
        { label: 'Impuesto determinado', valor: calc.impuestoDeterminado, modelado: true, bold: true },
        { label: 'Saldo a favor', valor: calc.saldoAFavor, modelado: true, bold: true },
      ],
    },
    {
      titulo: 'Resumen',
      filas: [
        { label: 'Total monto del impuesto', valor: calc.montoImpuestoVentas, modelado: true, bold: true },
        { label: 'Total crédito fiscal', valor: calc.totalCreditoFiscal, modelado: true, bold: true },
        { label: 'Total gasto para utilidades', valor: 0, modelado: false },
        { label: calc.saldoAFavor > 0 ? 'Saldo a favor' : 'Impuesto determinado', valor: calc.saldoAFavor > 0 ? calc.saldoAFavor : calc.impuestoDeterminado, modelado: true, bold: true },
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT }}>
      <PageHeader title="Reporte de IVA" left={<span style={{ fontSize: 12, color: C.n700, whiteSpace: 'nowrap' }}>{etiquetaPeriodo(filtros)}</span>}>
        {puede('fe.reportes.iva.exportar') && <BotonExportarUnico onClick={() => setExportOpen(true)} />}
      </PageHeader>
      <BarraFiltros actividades={actividades} filtros={filtros} inicial={INICIAL} onChange={setFiltros} mostrarEstado={false} sinBusqueda placeholder=""
        conteo="Solo comprobantes aceptados por Hacienda" />
      <div style={{ padding: 24, overflowY: 'auto', flex: 1, background: C.n200 }}>
        <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Resumen arriba: lo primero que se busca */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { l: 'Débito fiscal', v: calc.montoImpuestoVentas },
              { l: 'Crédito fiscal', v: calc.totalCreditoFiscal },
              { l: calc.saldoAFavor > 0 ? 'Saldo a favor' : 'Impuesto por pagar', v: calc.saldoAFavor > 0 ? calc.saldoAFavor : calc.impuestoDeterminado, d: true },
            ].map(k => (
              <div key={k.l} style={{ background: '#fff', border: `1px solid ${k.d ? C.brandBd : C.n500}`, borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 11.5, color: C.n700 }}>{k.l}</div>
                <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>₡ {fmt(k.v)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.n700 }}>Secciones del formulario D-150 en el mismo orden que TRIBU-CR.</span>
            <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button onClick={() => setAbiertas(new Set(secciones.map(x => x.titulo)))} style={{ background: 'none', border: 'none', color: C.brand, cursor: 'pointer', fontSize: 12, textDecoration: 'underline', fontFamily: FONT }}>Expandir todo</button>
              <button onClick={() => setAbiertas(new Set())} style={{ background: 'none', border: 'none', color: C.brand, cursor: 'pointer', fontSize: 12, textDecoration: 'underline', fontFamily: FONT }}>Contraer todo</button>
              <InfoTooltip text="Las filas en gris son casillas que Hacienda pide pero que todavía no se calculan con datos reales (casinos, sistema especial, proporcionalidad, gasto para utilidades); hoy muestran 0." />
            </span>
          </div>
          {secciones.map(sec => {
            const abierta = abiertas.has(sec.titulo);
            const total = [...sec.filas].reverse().find(f => f.bold && f.valor !== null);
            const conDatos = sec.filas.some(f => f.modelado && (f.valor ?? 0) !== 0);
            return (
              <div key={sec.titulo} style={{ background: '#fff', border: `1px solid ${C.n500}`, borderRadius: 10, overflow: 'hidden' }}>
                <button onClick={() => setAbiertas(a => { const n = new Set(a); if (n.has(sec.titulo)) n.delete(sec.titulo); else n.add(sec.titulo); return n; })}
                  aria-expanded={abierta}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}>
                  <span style={{ transform: abierta ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: C.n700 }}>›</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: conDatos ? C.n900 : C.n700 }}>{sec.titulo}</span>
                  {total && <span style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: C.n900 }}>{fmt(total.valor ?? 0)}</span>}
                </button>
                {abierta && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
                    <colgroup><col /><col style={{ width: 170 }} /></colgroup>
                    <tbody>
                      {sec.filas.map((f, i) => (
                        <tr key={i} style={{ borderTop: `1px solid ${C.n200}` }}>
                          <td style={{ padding: '6px 16px', paddingLeft: f.indent ? 32 : 16, fontSize: 12, color: f.modelado ? C.n900 : C.n700, fontWeight: f.bold ? 600 : 400 }}>{f.label}</td>
                          <td style={{ padding: '6px 16px', textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: f.modelado ? C.n900 : C.n700, fontWeight: f.bold ? 600 : 400, whiteSpace: 'nowrap' }}>
                            {f.valor === null ? 'No lo conozco' : fmt(f.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {exportOpen && (
        <ExportListModal
          title="Reporte de IVA"
          subtitulo={descripcionFiltros(filtros)}
          columns={[{ key: 'seccion', label: 'Sección' }, { key: 'label', label: 'Casilla' }, { key: 'valor', label: 'Valor', align: 'right' }]}
          rows={secciones.flatMap(s => s.filas.map(f => ({ seccion: s.titulo, label: f.label, valor: f.valor === null ? '-' : fmt(f.valor) })))}
          filename="reporte-de-iva"
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}
