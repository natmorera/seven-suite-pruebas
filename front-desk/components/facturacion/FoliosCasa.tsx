'use client';
// Folios cuenta casa: cargos internos del hotel (consumo interno, cortesías…).
import { useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Radio, Select, StatusBadge, Toast } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Campo, Celda, Fila, FilaVacia, Grid, Tabla } from '@/components/configuracion/kit';
import { exportarCSV, usePrint } from '@/components/hotel/ui';
import { HOY, fmtF } from '@/components/hotel/datos';
import { conceptoDe, fmtMon, r2 } from '@/components/hotel/finanzas';
import { ChipTipo, Exportar, FiltroUno, HojaSistema, IcCandado, IcRefresh, IcXCirculo, PaginaFact, TablaReporte, Tarjeta, tdR } from './comun';
import { useFolios, type FolioVista, type LineaFolio } from './folios/modelo';
import { Corregir, DetalleLinea, Liquidar, NuevoCargo, Trasladar } from './folios/Operaciones';
import { NuevoFolio } from './folios/NuevoFolio';
import { PieFijo } from '@/components/suite/Paginacion';
import { PanelLateral } from '@/components/suite/PanelLateral';
import { MontoCelda } from '@/components/suite/Monto';

export default function FoliosCasa() {
  const { cuentas } = useFolios();
  const casas = cuentas.filter(c => c.clase === 'casa');
  const [cuentaId, setCuentaId] = useState(casas[0]?.id ?? '');
  const [usuario, setUsuario] = useState('');
  const [verHist, setVerHist] = useState(false);
  const [dialogo, setDialogo] = useState<null | 'cargo' | 'traslado' | 'liquidar' | 'exportar' | { corregir: string[] }>(null);
  const [lineaId, setLineaId] = useState<string | null>(null);
  const { imprimir, portal } = usePrint();
  const [toast, setToast] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);
  const cta = casas.find(c => c.id === cuentaId) ?? casas[0];
  const lineas = (cta?.lineas ?? []).filter(l => (verHist || !l.historico) && (!usuario || l.usuario === usuario))
    .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
  const hojaNueva = nueva && <NuevoFolio clase="casa" onClose={() => setNueva(false)} onListo={(id, t) => { setNueva(false); setCuentaId(id); setToast(t); }} />;
  if (!cta) return <PaginaFact titulo="Folios cuenta casa" acciones={<Button icon={<IcPlus size={12} />} onClick={() => setNueva(true)}>Nueva cuenta casa</Button>}><Tarjeta>Todavía no hay cuentas casa.</Tarjeta>{hojaNueva}</PaginaFact>;
  const usuarios = [...new Set(cta.lineas.map(l => l.usuario))].sort();
  const total = r2(cta.lineas.filter(l => !l.historico).reduce((s, l) => s + l.importe, 0));
  const listo = (t: string) => { setDialogo(null); setLineaId(null); setToast(t); };
  const linea = cta.lineas.find(l => l.id === lineaId);
  const corregibles = cta.lineas.some(l => !l.bloqueado && !l.historico && l.importe > 0);

  return (
    <PaginaFact titulo="Folios cuenta casa" acciones={<>
      <Exportar disabled={!lineas.length} titulo={`Cuenta casa ${cta.numero} - ${cta.nombre}`} criterio={`Usuario: ${usuario || 'Todos'}${verHist ? ' · Incluye históricos' : ''}`}
        onCSV={() => exportarCSV(`cuenta-casa-${cta.numero}`, ['Fecha', 'Concepto', 'Descripción', 'Importe', 'Tipo', 'Motivo', 'Usuario', 'Estado'], lineas.map(l => [fmtF(l.fecha), l.conceptoOrig || conceptoDe(l.concepto).descripcion, l.descripcion, l.importe, l.tipo, l.motivo, l.usuario, l.historico ? 'Liquidado' : 'Vigente']))}
        onPDF={() => imprimir(<HojaSistema titulo={`Cuenta casa ${cta.numero} - ${cta.nombre}`} subtitulo="Cargos visibles en pantalla"><TablaReporte headers={['Fecha', 'Concepto', 'Descripción', 'Importe', 'Tipo', 'Usuario']} derecha={[3]}>
          {lineas.map(l => <tr key={l.id}><td style={tdR()}>{fmtF(l.fecha)}</td><td style={tdR()}>{l.conceptoOrig || conceptoDe(l.concepto).descripcion}</td><td style={tdR()}>{l.descripcion}</td><td style={tdR(true)}><MontoCelda texto={fmtMon(l.importe)} /></td><td style={tdR()}>{l.tipo}</td><td style={tdR()}>{l.usuario}</td></tr>)}
        </TablaReporte></HojaSistema>)}
        masOpciones={{ label: 'Estado de cuenta con opciones…', onClick: () => setDialogo('exportar') }} />
      <Button variant="secondary" icon={<IcRefresh />} onClick={() => setDialogo('traslado')}>Trasladar cargos</Button>
      <Button variant="secondary" icon={<IcXCirculo />} disabled={!corregibles} onClick={() => setDialogo({ corregir: [] })}>Corrección</Button>
      <Button variant="secondary" icon={<IcCandado />} onClick={() => setDialogo('liquidar')} disabled={Math.abs(cta.saldo) < 0.01}>Liquidar</Button>
      <Button variant="secondary" icon={<IcPlus size={12} />} onClick={() => setNueva(true)}>Nueva cuenta</Button>
      <Button icon={<IcPlus size={12} />} onClick={() => setDialogo('cargo')}>Cargo</Button>
    </>} filtros={<>
        <FiltroUno label="Cuenta" value={cta.id} onChange={v => { if (v) { setCuentaId(v); setUsuario(''); } }} todos={null} ancho={340} opciones={casas.map(c => ({ value: c.id, label: `${c.numero} - ${c.nombre}` }))} />
        <FiltroUno label="Usuario" value={usuario} onChange={setUsuario} todos="Todos los usuarios" opciones={usuarios.map(u => ({ value: u, label: u }))} />
        {cta.lineas.some(l => l.historico) && <Checkbox label="Ver cargos históricos (liquidados)" checked={verHist} onChange={setVerHist} />}
      </>}
      filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>{lineas.length} cargos</span>}>
      <Tarjeta>
        <InfoCuenta c={cta} />
        <Tabla headers={['Fecha', 'Concepto', 'Descripción', 'Importe', 'Tipo', 'Motivo', 'Usuario']} alinearDerecha={[3]} minWidth={880}>
          {lineas.length === 0 && <FilaVacia cols={7} texto="No hay cargos para los filtros seleccionados." />}
          {lineas.map((l: LineaFolio) => (
            <Fila key={l.id} onClick={() => setLineaId(l.id)} activa={l.id === lineaId} style={{ opacity: l.historico ? 0.55 : 1 }}>
              <Celda style={{ whiteSpace: 'nowrap' }}>{fmtF(l.fecha)}</Celda><Celda>{l.conceptoOrig || conceptoDe(l.concepto).descripcion}</Celda><Celda>{l.descripcion}</Celda>
              <Celda derecha style={{ color: l.importe < 0 ? C.error : undefined, whiteSpace: 'nowrap' }}>{fmtMon(l.importe)}</Celda>
              <Celda><ChipTipo tipo={l.tipo} />{l.historico && <span style={{ marginLeft: 6 }}><StatusBadge label="Liquidado" color="gray" /></span>}</Celda><Celda>{l.motivo || '—'}</Celda><Celda>{l.usuario}</Celda>
            </Fila>
          ))}
        </Tabla>
      </Tarjeta>
      <PieFijo><div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: C.n700 }}>
        <span>{lineas.length} cargos en pantalla · clic en una línea para ver su detalle</span>
        <span>Saldo de la cuenta <b style={{ color: C.n900, fontWeight: 600, marginLeft: 8, fontSize: 14 }}>{fmtMon(total)}</b></span>
      </div></PieFijo>
      {linea && !dialogo && <DetalleLinea folio={cta} linea={linea} onClose={() => setLineaId(null)} onCorregir={() => setDialogo({ corregir: [linea.id] })} onTrasladar={() => setDialogo('traslado')} />}
      {dialogo === 'cargo' && <NuevoCargo folio={cta} onClose={() => setDialogo(null)} onListo={listo} />}
      {dialogo === 'traslado' && <Trasladar folio={cta} onClose={() => setDialogo(null)} onListo={listo} />}
      {dialogo === 'liquidar' && <Liquidar folio={cta} onClose={() => setDialogo(null)} onListo={listo} />}
      {typeof dialogo === 'object' && dialogo && <Corregir folio={cta} inicial={dialogo.corregir} onClose={() => setDialogo(null)} onListo={listo} />}
      {dialogo === 'exportar' && <ExportarCuenta c={cta} onClose={() => setDialogo(null)} onListo={listo} />}
      {hojaNueva}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </PaginaFact>
  );
}

function InfoCuenta({ c }: { c: FolioVista }) {
  const par = (l: string, v: ReactNode) => <><span style={{ color: C.n700 }}>{l}</span><span>{v}</span></>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: '6px 40px', background: C.n200, borderRadius: radius.md, padding: '12px 16px', fontSize: 12.5, maxWidth: 760 }}>
      {par('Titular', c.titular)}{par('Tipo', c.tipo)}{par('Emisión', fmtF(c.emision))}{par('Moneda', c.moneda)}
      {par('Vencimiento', fmtF(c.vencimiento))}{par('Límite Crédito', <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>{c.limite.toFixed(2)}<StatusBadge label={c.vencimiento >= HOY ? 'Activo' : 'Vencido'} color={c.vencimiento >= HOY ? 'green' : 'red'} /></span>)}
    </div>
  );
}

/** Exportar: detalle de cargos o por conceptos, vigentes/históricos, rango de fechas y formato. */
function ExportarCuenta({ c, onClose, onListo }: { c: FolioVista; onClose: () => void; onListo: (t: string) => void }) {
  const [listar, setListar] = useState<'detalle' | 'conceptos'>('detalle');
  const [incluir, setIncluir] = useState<'vigentes' | 'todos' | 'historicos'>('vigentes');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [formato, setFormato] = useState<'excel' | 'pdf'>('excel');
  const { imprimir, portal } = usePrint();
  const lineas = c.lineas.filter(l => (incluir === 'todos' || (incluir === 'historicos' ? l.historico : !l.historico)) && (!desde || l.fecha >= desde) && (!hasta || l.fecha <= hasta));
  const porConcepto = Object.values(lineas.reduce<Record<string, { concepto: string; n: number; total: number }>>((a, l) => {
    const k = l.conceptoOrig || l.concepto; a[k] ??= { concepto: k, n: 0, total: 0 }; a[k].n++; a[k].total = r2(a[k].total + l.importe); return a;
  }, {}));
  const total = r2(lineas.reduce((s, l) => s + l.importe, 0));
  const exportar = () => {
    if (formato === 'excel') {
      if (listar === 'detalle') exportarCSV(`cuenta-casa-${c.numero}`, ['Fecha', 'Concepto', 'Descripción', 'Importe', 'Tipo', 'Motivo', 'Usuario', 'Estado'], lineas.map(l => [fmtF(l.fecha), l.conceptoOrig, l.descripcion, l.importe, l.tipo, l.motivo, l.usuario, l.historico ? 'Histórico' : 'Vigente']));
      else exportarCSV(`cuenta-casa-${c.numero}-conceptos`, ['Concepto', 'Cantidad', 'Total'], porConcepto.map(x => [x.concepto, x.n, x.total]));
      onListo('Exportación generada');
    } else imprimir(
      <HojaSistema titulo="Reporte de Folios Cuenta Casa" subtitulo="Resumen detallado de movimientos de cuentas internas">
        <div style={{ border: `1px solid ${C.n500}`, background: C.n200, borderRadius: 8, padding: '14px 18px', marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, fontFamily: FONT }}>
          <div style={{ gridColumn: 'span 3' }}><Small l="CUENTA SELECCIONADA" v={`${c.numero} - ${c.nombre}`} /></div><div style={{ gridColumn: 'span 2' }}><Small l="TITULAR" v={c.titular} /></div>
          <Small l="EMISIÓN" v={fmtF(c.emision)} /><Small l="VENCIMIENTO" v={fmtF(c.vencimiento)} /><Small l="TIPO" v={c.tipo} /><Small l="MONEDA" v={c.moneda} /><Small l="LÍMITE CRÉDITO" v={c.limite.toFixed(2)} />
        </div>
        {listar === 'detalle' ? (
          <TablaReporte headers={['Fecha', 'Concepto', 'Descripción', 'Importe', 'Tipo', 'Motivo', 'Usuario']} derecha={[3]}>
            {lineas.map(l => <tr key={l.id}><td style={tdR()}>{fmtF(l.fecha)}</td><td style={tdR()}>{l.conceptoOrig}</td><td style={tdR()}>{l.descripcion}</td><td style={tdR(true, { color: l.importe < 0 ? C.error : undefined, fontWeight: 600 })}><MontoCelda texto={fmtMon(l.importe)} /></td>
              <td style={tdR(false, { color: l.tipo === 'Cargo' ? C.brand : C.error, fontWeight: 600 })}>{l.tipo.toUpperCase()}</td><td style={tdR()}>{l.motivo}</td><td style={tdR()}>{l.usuario}</td></tr>)}
            <tr><td colSpan={3} style={tdR(true, { fontWeight: 700 })}>TOTAL FOLIO:</td><td style={tdR(true, { fontWeight: 700 })}><MontoCelda texto={fmtMon(total)} /></td><td colSpan={3} style={tdR()} /></tr>
          </TablaReporte>
        ) : (
          <TablaReporte headers={['Concepto de venta', 'Cantidad', 'Total']} derecha={[1, 2]}>
            {porConcepto.map(x => <tr key={x.concepto}><td style={tdR()}>{x.concepto}</td><td style={tdR(true)}>{x.n}</td><td style={tdR(true)}><MontoCelda texto={fmtMon(x.total)} /></td></tr>)}
            <tr><td colSpan={2} style={tdR(true, { fontWeight: 700 })}>TOTAL:</td><td style={tdR(true, { fontWeight: 700 })}><MontoCelda texto={fmtMon(total)} /></td></tr>
          </TablaReporte>
        )}
      </HojaSistema>);
  };
  return (
    <PanelLateral title="Estado de cuenta" sub={`Cuenta ${c.numero} - ${c.nombre}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={exportar} disabled={!lineas.length}>Exportar</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Grid cols={2}>
          <Campo label="Listar por:"><div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            <Radio name="lp" label="Detalle de los cargos" checked={listar === 'detalle'} onChange={() => setListar('detalle')} />
            <Radio name="lp" label="Por conceptos de venta" checked={listar === 'conceptos'} onChange={() => setListar('conceptos')} />
          </div></Campo>
          <Campo label="Incluir:"><div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            <Radio name="inc" label="Sólo cargos vigentes" checked={incluir === 'vigentes'} onChange={() => setIncluir('vigentes')} />
            <Radio name="inc" label="Cargos vigentes e históricos" checked={incluir === 'todos'} onChange={() => setIncluir('todos')} />
            <Radio name="inc" label="Sólo cargos históricos" checked={incluir === 'historicos'} onChange={() => setIncluir('historicos')} />
          </div></Campo>
          <Campo label="Desde"><Input type="date" value={desde} onChange={setDesde} /></Campo>
          <Campo label="Hasta"><Input type="date" value={hasta} onChange={setHasta} /></Campo>
        </Grid>
        <Campo label="Formato"><Select value={formato} onChange={v => setFormato(v as 'excel' | 'pdf')} options={[{ value: 'excel', label: 'Excel (.csv)' }, { value: 'pdf', label: 'PDF' }]} /></Campo>
        <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>{lineas.length} movimientos · total {fmtMon(total)}</p>
      </div>
      {portal}
    </PanelLateral>
  );
}
const Small = ({ l, v }: { l: string; v: string }) => <div><div style={{ fontSize: 10.5, color: C.n700, letterSpacing: '.04em' }}>{l}</div><div style={{ fontSize: 14, marginTop: 3 }}>{v}</div></div>;
