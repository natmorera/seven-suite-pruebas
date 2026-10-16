'use client';
// Folios cuenta casa: cargos internos del hotel (consumo interno, cortesías…).
import { useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal, Radio, Select, StatusBadge, Toast } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Campo, Celda, Fila, FilaVacia, Grid, Tabla } from '@/components/configuracion/kit';
import { Alerta, exportarCSV, usePrint } from '@/components/hotel/ui';
import { useHotel } from '@/components/hotel/store';
import { HOY, fmtF } from '@/components/hotel/datos';
import { ahoraHotel, conceptoDe, fmtMon, r2 } from '@/components/hotel/finanzas';
import { ChipTipo, Exportar, FiltroUno, HojaSistema, IcCandado, IcRefresh, IcXCirculo, PaginaFact, TablaReporte, Tarjeta, tdR } from './comun';
import { useFolios, type FolioVista, type LineaFolio } from './folios/modelo';
import { ConfirmarCorreccion, NuevoCargo, Trasladar } from './folios/Operaciones';

export default function FoliosCasa() {
  const h = useHotel();
  const { cuentas } = useFolios();
  const casas = cuentas.filter(c => c.clase === 'casa');
  const [cuentaId, setCuentaId] = useState(casas[0]?.id ?? '');
  const [usuario, setUsuario] = useState('');
  const [verHist, setVerHist] = useState(false);
  const [dialogo, setDialogo] = useState<null | 'cargo' | 'traslado' | 'liquidar' | 'exportar'>(null);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const { imprimir, portal } = usePrint();
  const [sel, setSel] = useState<string[]>([]);
  const [confirmarCorr, setConfirmarCorr] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const cta = casas.find(c => c.id === cuentaId) ?? casas[0];
  const lineas = (cta?.lineas ?? []).filter(l => (verHist || !l.historico) && (!usuario || l.usuario === usuario) && (!corrigiendo || (!l.bloqueado && l.importe > 0 && !l.historico)))
    .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
  if (!cta) return <PaginaFact titulo="Folios cuenta casa"><Tarjeta>No hay cuentas casa configuradas.</Tarjeta></PaginaFact>;
  const usuarios = [...new Set(cta.lineas.map(l => l.usuario))].sort();
  const total = r2(cta.lineas.filter(l => !l.historico).reduce((s, l) => s + l.importe, 0));
  const elegidas = cta.lineas.filter(l => sel.includes(l.id));
  const totalSel = r2(elegidas.reduce((s, l) => s + l.importe, 0));
  const listo = (t: string) => { setDialogo(null); setToast(t); };
  const todos = lineas.length > 0 && lineas.every(l => sel.includes(l.id));

  return (
    <PaginaFact titulo={corrigiendo ? 'Corrección de cargos' : 'Folios cuenta casa'} acciones={corrigiendo ? <>
      <Button variant="secondary" onClick={() => { setCorrigiendo(false); setSel([]); }}>Cancelar</Button>
      <Button disabled={!sel.length} onClick={() => setConfirmarCorr(true)}>Guardar correcciones</Button>
    </> : <>
      <Exportar disabled={!lineas.length} titulo={`Cuenta casa ${cta.numero} - ${cta.nombre}`} criterio={`Usuario: ${usuario || 'Todos'}${verHist ? ' · Incluye históricos' : ''}`}
        onCSV={() => exportarCSV(`cuenta-casa-${cta.numero}`, ['Fecha', 'Concepto', 'Descripción', 'Importe', 'Tipo', 'Motivo', 'Usuario', 'Estado'], lineas.map(l => [fmtF(l.fecha), l.conceptoOrig || conceptoDe(l.concepto).descripcion, l.descripcion, l.importe, l.tipo, l.motivo, l.usuario, l.historico ? 'Liquidado' : 'Vigente']))}
        onPDF={() => imprimir(<HojaSistema titulo={`Cuenta casa ${cta.numero} - ${cta.nombre}`} subtitulo="Cargos visibles en pantalla"><TablaReporte headers={['Fecha', 'Concepto', 'Descripción', 'Importe', 'Tipo', 'Usuario']} derecha={[3]}>
          {lineas.map(l => <tr key={l.id}><td style={tdR()}>{fmtF(l.fecha)}</td><td style={tdR()}>{l.conceptoOrig || conceptoDe(l.concepto).descripcion}</td><td style={tdR()}>{l.descripcion}</td><td style={tdR(true)}>{fmtMon(l.importe)}</td><td style={tdR()}>{l.tipo}</td><td style={tdR()}>{l.usuario}</td></tr>)}
        </TablaReporte></HojaSistema>)}
        masOpciones={{ label: 'Estado de cuenta con opciones…', onClick: () => setDialogo('exportar') }} />
      <Button variant="secondary" icon={<IcRefresh />} onClick={() => setDialogo('traslado')}>Trasladar cargos</Button>
      <Button icon={<IcCandado />} onClick={() => setDialogo('liquidar')} disabled={Math.abs(cta.saldo) < 0.01} style={{ background: C.success, borderColor: C.success }}>Liquidar</Button>
      <Button icon={<IcXCirculo />} onClick={() => { setCorrigiendo(true); setSel([]); }} style={{ background: C.error, borderColor: C.error }}>Corrección</Button>
      <Button icon={<IcPlus size={12} />} onClick={() => setDialogo('cargo')}>Cargo</Button>
    </>} filtros={corrigiendo
      ? <span style={{ fontSize: 12.5, color: C.n900, fontWeight: 500 }}>Selecciona los cargos que deseas corregir</span>
      : <>
        <FiltroUno label="Cuenta" value={cta.id} onChange={v => { if (v) { setCuentaId(v); setUsuario(''); } }} todos={null} ancho={340} opciones={casas.map(c => ({ value: c.id, label: `${c.numero} - ${c.nombre}` }))} />
        <FiltroUno label="Usuario" value={usuario} onChange={setUsuario} todos="Todos los usuarios" opciones={usuarios.map(u => ({ value: u, label: u }))} />
        {cta.lineas.some(l => l.historico) && <Checkbox label="Ver cargos históricos (liquidados)" checked={verHist} onChange={setVerHist} />}
      </>}
      filtrosDerecha={corrigiendo
        ? <span style={{ fontSize: 12.5, color: C.n700 }}>{sel.length} seleccionados · <b style={{ color: C.error }}>- {fmtMon(totalSel)}</b></span>
        : <span style={{ fontSize: 12, color: C.n700 }}>{lineas.length} cargos</span>}>
      <Tarjeta>
        {!corrigiendo && <InfoCuenta c={cta} />}
        <Tabla headers={[...(corrigiendo ? [<Checkbox key="t" checked={todos} onChange={v => setSel(v ? lineas.map(l => l.id) : [])} />] : []), 'Fecha', 'Concepto', 'Descripción', 'Importe', 'Tipo', 'Motivo', 'Usuario']} alinearDerecha={[corrigiendo ? 4 : 3]} minWidth={880}>
          {lineas.length === 0 && <FilaVacia cols={8} texto={corrigiendo ? 'No hay cargos vigentes que se puedan corregir.' : 'No hay cargos para los filtros seleccionados.'} />}
          {lineas.map((l: LineaFolio) => (
            <Fila key={l.id} style={{ background: sel.includes(l.id) ? 'rgba(244,67,54,.04)' : undefined, opacity: l.historico ? 0.55 : 1 }}>
              {corrigiendo && <Celda><Checkbox checked={sel.includes(l.id)} onChange={v => setSel(v ? [...sel, l.id] : sel.filter(x => x !== l.id))} /></Celda>}
              <Celda>{fmtF(l.fecha)}</Celda><Celda>{l.conceptoOrig || conceptoDe(l.concepto).descripcion}</Celda><Celda>{l.descripcion}</Celda>
              <Celda derecha style={{ color: l.importe < 0 ? C.error : undefined, whiteSpace: 'nowrap' }}>{l.importe < 0 ? `- ${fmtMon(-l.importe)}` : fmtMon(l.importe)}</Celda>
              <Celda><ChipTipo tipo={l.tipo} />{l.historico && <span style={{ marginLeft: 6 }}><StatusBadge label="Liquidado" color="gray" /></span>}</Celda><Celda>{l.motivo || '—'}</Celda><Celda>{l.usuario}</Celda>
            </Fila>
          ))}
        </Tabla>
        <div style={{ display: 'flex', gap: 60, background: C.n200, borderRadius: radius.control, padding: '12px 14px', fontSize: 13, fontWeight: 600 }}><span>Total:</span><span>{fmtMon(total)}</span></div>
      </Tarjeta>
      {dialogo === 'cargo' && <NuevoCargo folio={cta} onClose={() => setDialogo(null)} onListo={listo} />}
      {dialogo === 'traslado' && <Trasladar folio={cta} onClose={() => setDialogo(null)} onListo={listo} />}
      {dialogo === 'exportar' && <ExportarCuenta c={cta} onClose={() => setDialogo(null)} onListo={listo} />}
      <Alerta open={dialogo === 'liquidar'} titulo="¿Deseas confirmar liquidación de cargos?" onClose={() => setDialogo(null)} confirmar="Confirmar liquidación" cancelar="Cancelar"
        onConfirm={() => { h.liquidar(cta.id, h.sesion, ahoraHotel()); listo(`Cuenta ${cta.numero} liquidada`); }}>
        Esta acción cerrará los movimientos pendientes.
        <div style={{ background: '#F5F6FA', borderRadius: radius.md, padding: '12px 16px', margin: '14px auto 0', maxWidth: 320, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.n900 }}><span>Total a pagar:</span><b>{fmtMon(cta.saldo)}</b></div>
      </Alerta>
      {confirmarCorr && <ConfirmarCorreccion folio={cta} lineas={elegidas} onClose={() => setConfirmarCorr(false)} onListo={() => { setConfirmarCorr(false); setCorrigiendo(false); setSel([]); setToast('Corrección registrada'); }} />}
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
            {lineas.map(l => <tr key={l.id}><td style={tdR()}>{fmtF(l.fecha)}</td><td style={tdR()}>{l.conceptoOrig}</td><td style={tdR()}>{l.descripcion}</td><td style={tdR(true, { color: l.importe < 0 ? C.error : undefined, fontWeight: 600 })}>{fmtMon(l.importe)}</td>
              <td style={tdR(false, { color: l.tipo === 'Cargo' ? C.brand : C.error, fontWeight: 600 })}>{l.tipo.toUpperCase()}</td><td style={tdR()}>{l.motivo}</td><td style={tdR()}>{l.usuario}</td></tr>)}
            <tr><td colSpan={3} style={tdR(true, { fontWeight: 700 })}>TOTAL FOLIO:</td><td style={tdR(true, { fontWeight: 700 })}>{fmtMon(total)}</td><td colSpan={3} style={tdR()} /></tr>
          </TablaReporte>
        ) : (
          <TablaReporte headers={['Concepto de venta', 'Cantidad', 'Total']} derecha={[1, 2]}>
            {porConcepto.map(x => <tr key={x.concepto}><td style={tdR()}>{x.concepto}</td><td style={tdR(true)}>{x.n}</td><td style={tdR(true)}>{fmtMon(x.total)}</td></tr>)}
            <tr><td colSpan={2} style={tdR(true, { fontWeight: 700 })}>TOTAL:</td><td style={tdR(true, { fontWeight: 700 })}>{fmtMon(total)}</td></tr>
          </TablaReporte>
        )}
      </HojaSistema>);
  };
  return (
    <Modal open title={`Exportar · Cuenta: ${c.numero} - ${c.nombre}`} onClose={onClose} width={620}
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
    </Modal>
  );
}
const Small = ({ l, v }: { l: string; v: string }) => <div><div style={{ fontSize: 10.5, color: C.n700, letterSpacing: '.04em' }}>{l}</div><div style={{ fontSize: 14, marginTop: 3 }}>{v}</div></div>;
