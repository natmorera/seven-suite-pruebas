'use client';
import { PanelLateral } from '@/components/suite/PanelLateral';
// Reserva › pestaña Facturación: cuentas, agrupación por concepto, nueva cuenta y documentos emitidos.
import { useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Select, StatusBadge } from '@/components/suite/ui';
import { Campo, Celda, Fila, IcTrash, Tabla } from '@/components/configuracion/kit';
import { Alerta } from '@/components/hotel/ui';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { type Reserva } from '@/components/hotel/datos';
import { CONCEPTOS_HOSPEDAJE, claveDe, esAgencia, facturaAgrupada, modalidadDe, numeroDe, reservaCerrada, type GrupoReserva } from '@/components/hotel/reservas';
import { CUENTAS_CONTABLES, ahoraHotel, extraVacio, fmtMon, r2 } from '@/components/hotel/finanzas';
import { Visor } from '@/components/facturacion/comun';
import { DetalleFolio } from '@/components/facturacion/folios/Detalle';
import { DocumentoFolio } from '@/components/facturacion/folios/Pagos';
import { folioDeCuenta, folioDeReservaVista, type FolioVista, type LineaFolio } from '@/components/facturacion/folios/modelo';
import { nombreTipo, totales } from '../comun';
import { MontoCelda } from '@/components/suite/Monto';

// ── Facturación (folio por habitación + cuentas adicionales) ────────────────
// Reserva grupal: la cuenta 1 es siempre el folio de agencia (hospedaje de todas las
// habitaciones) y luego una cuenta de consumo por habitación; todo se cierra en una
// sola factura. Individual múltiple con «una sola factura» (elegido en el check-in):
// la cuenta 1 es la factura única que reúne todas las cuentas.
const AGRUPADA = '__agrupada';
const esHospedaje = (l: LineaFolio) => !!l.derivado && CONCEPTOS_HOSPEDAJE.includes(l.concepto);
/** Cuenta de consumo de una habitación de grupo: el folio sin el hospedaje (que va al folio de agencia). */
function soloConsumos(f: FolioVista): FolioVista {
  const lineas = f.lineas.filter(l => !esHospedaje(l));
  const pagos = f.pagos.filter(p => p.forma !== 'ANT');
  const totalCargos = r2(lineas.filter(l => !l.historico).reduce((s, l) => s + l.importe, 0));
  const totalPagado = r2(pagos.filter(p => !p.historico).reduce((s, p) => s + p.montoFacturado, 0));
  return { ...f, lineas, pagos, totalCargos, totalPagado, saldo: r2(totalCargos - totalPagado) };
}
export function TabFacturacion({ g, sel, onSel, onCheckout }: { g: GrupoReserva; sel: string | null; onSel: (id: string) => void; onCheckout: (r: Reserva) => void }) {
  const h = useHotel();
  const lineas = g.lineas.filter(l => l.estado !== 'Anulada');
  const ids = g.lineas.map(l => l.id);
  const modalidad = modalidadDe(g);
  const esGrupo = modalidad === 'grupo';
  const agrupada = facturaAgrupada(g);
  const reales = [...lineas.map(l => folioDeReservaVista(l, h.perfiles, h.foliosRes)), ...h.foliosCta.filter(c => c.reservaId && ids.includes(c.reservaId)).map(c => folioDeCuenta(c, h.perfiles))];
  const folios = esGrupo ? reales.map(f => (f.reserva ? soloConsumos(f) : f)) : reales;
  const verAgrupada = agrupada && (sel === AGRUPADA || (!sel && !!folios.length));
  const actual = verAgrupada ? undefined : folios.find(f => (f.reserva ? f.reserva.id : f.id) === sel) ?? folios[0];
  const [incluir, setIncluir] = useState(true);
  const [nueva, setNueva] = useState(false);
  const [eliminar, setEliminar] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  if (!folios.length) return <p style={{ fontSize: 12, color: C.n700 }}>La reserva no tiene cuentas activas.</p>;
  const estadoCta = (f: FolioVista) => (f.estado === 'Cerrado' ? 'Cerrada' : f.saldo <= 0.005 && f.totalPagado > 0 ? 'Pagada' : 'Abierta');
  const vacia = (f: FolioVista) => !f.reserva && !f.lineas.length && !f.pagos.length;
  const kpi = (l: string, v: ReactNode, tono?: 'saldo' | 'ok') => <div style={{ background: tono === 'saldo' ? '#FFF4ED' : tono === 'ok' ? '#EEF8F3' : C.n200, borderRadius: radius.md, padding: '9px 12px', minWidth: 0 }}>
    <span style={{ display: 'block', fontSize: 11.5, color: C.n700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</span>
    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', color: tono === 'saldo' ? '#B45309' : tono === 'ok' ? '#0E7A57' : C.n900 }}>{v}</span></div>;
  const off = agrupada ? 1 : 0;
  const etiqueta = (f: FolioVista) => (f.reserva ? `${esGrupo ? 'Consumos · ' : ''}Hab ${f.habitacion || '—'}` : f.nombre);
  const cerradas = reales.every(f => f.estado === 'Cerrado');
  const totalAgr = r2(reales.reduce((s, f) => s + f.saldo, 0));
  /** Cuenta en la lista lateral: dos líneas (número y nombre · estado, folio y saldo) para que muchas cuentas quepan sin crecer. */
  const tarjetaCta = (key: string, on: boolean, n: number, nombre: string, estado: string, numero: string, moneda: string, importe: number, extra?: ReactNode) => (
    <div key={key} style={{ position: 'relative' }}>
      <button type="button" onClick={() => onSel(key)} aria-current={on || undefined} title={`${n} · ${nombre} · ${numero} · ${estado}`}
        style={{ width: '100%', textAlign: 'left', border: `1px solid ${on ? C.brandBd : C.n500}`, background: on ? C.brandBg : C.n000, borderRadius: radius.md, padding: extra ? '6px 28px 6px 10px' : '6px 10px', cursor: 'pointer', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, minWidth: 0 }}>
          <b style={{ fontWeight: 600 }}>{n}</b>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.n900 }}>{nombre}</span>
          <i style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: estado === 'Abierta' ? C.warning : C.success }} aria-label={estado} />
        </span>
        <span style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 11, color: C.n700 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{numero.replace('Nro. Folio ', 'Folio ')}</span>
          <span style={{ whiteSpace: 'nowrap', color: C.n900 }}>{fmtMon(importe, moneda)}</span>
        </span>
      </button>
      {extra}
    </div>
  );
  const r = actual ? actual.reserva ?? g.lineas.find(l => l.id === actual.cta?.reservaId) ?? g.principal : g.principal;
  const t = totales([r], incluir);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {modalidad && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: C.n700, background: C.n200, borderRadius: radius.md, padding: '8px 12px' }}>
          <StatusBadge label={esGrupo ? 'Grupal' : 'Individual (múltiple)'} color="brand" />
          {esGrupo ? 'Todo se cobra en una sola factura: folio de agencia con el hospedaje + una cuenta de consumo por habitación.'
            : g.principal.facturaUnica === undefined ? 'La facturación (separada por habitación o una sola factura) se define en el check-in.'
              : g.principal.facturaUnica ? 'Definido en el check-in: una sola factura para todas las habitaciones.' : 'Definido en el check-in: factura separada por habitación.'}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(0,1fr)', gap: 0, minHeight: 360 }}>
        <div style={{ borderRight: `1px solid ${C.n500}`, paddingRight: 12, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 520, overflowY: 'auto' }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Cuentas</span>
            <button type="button" aria-label="Nueva cuenta" title="Nueva cuenta" disabled={g.lineas.every(reservaCerrada)} onClick={() => setNueva(true)} style={{ width: 28, height: 28, border: `1px solid ${C.brandBd}`, borderRadius: radius.control, background: C.n000, color: C.brand, cursor: 'pointer', fontSize: 15 }}>+</button>
          </span>
          {agrupada && tarjetaCta(AGRUPADA, verAgrupada, 1, esGrupo ? 'Folio de agencia' : 'Factura única', cerradas ? 'Facturada' : 'Abierta', esGrupo ? 'Hospedaje' : `${reales.length} cuentas`, g.principal.moneda, esGrupo ? r2(reales.reduce((s, f) => s + f.lineas.filter(esHospedaje).reduce((a, l) => a + l.importe, 0), 0)) : totalAgr)}
          {folios.map((f, i) => tarjetaCta(f.reserva ? f.reserva.id : f.id, !verAgrupada && f.id === actual?.id, i + 1 + off, etiqueta(f), estadoCta(f), `Nro. Folio ${f.numero}`, f.moneda, f.saldo,
            !f.reserva ? <button type="button" aria-label={`Eliminar cuenta ${f.numero}`} title="Eliminar cuenta"
              onClick={() => (vacia(f) && Math.abs(f.saldo) < 0.005 ? setEliminar(f.id) : setAviso('Sólo se puede eliminar una cuenta si está en 0 y sin movimientos.'))}
              style={{ position: 'absolute', top: 6, right: 4, border: 'none', background: 'none', color: C.error, cursor: 'pointer' }}><IcTrash /></button> : undefined))}
        </div>
        <div style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {verAgrupada || !actual ? <CuentaAgrupada g={g} folios={reales} esGrupo={esGrupo} /> : <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ marginRight: 'auto', minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>Cuenta {folios.indexOf(actual) + 1 + off} · {esGrupo && actual.reserva ? `Consumos hab ${actual.habitacion || '—'}` : actual.nombre}{!actual.reserva && actual.cta?.habitacion ? ` · Hab ${actual.cta.habitacion}` : ''}
                  <StatusBadge label={actual.estado} color={actual.estado === 'Abierto' ? 'green' : 'gray'} /></span>
                <span style={{ fontSize: 12, color: C.n700 }}>Folio {actual.numero}{actual.factura ? ` · Factura ${actual.factura}` : ''}{actual.limite ? ` · Crédito ${fmtMon(actual.limite, actual.moneda)}` : ''}</span>
              </div>
              {actual.reserva && r.estado === 'In-House' && <Button style={{ background: '#4CAF50', color: '#fff', border: 'none' }} onClick={() => onCheckout(r)}>Check-out ↦</Button>}
            </div>
            {actual.reserva && !esGrupo ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
                {kpi('Importe hab. i.i.', fmtMon(t.alojamiento, r.moneda))}{kpi('Cargos adicionales', fmtMon(t.cargos, r.moneda))}{kpi('Descuento i.i.', fmtMon(t.descuento, r.moneda))}{kpi('Importe a cobrar', fmtMon(t.aCobrar, r.moneda))}
                {kpi('Depósito en garantía', fmtMon(t.deposito, r.moneda))}{kpi('Facturado', fmtMon(actual.totalPagado, r.moneda))}{kpi('Pendiente', fmtMon(Math.max(0, actual.saldo), r.moneda), actual.saldo > 0.005 ? 'saldo' : 'ok')}
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}><Checkbox checked={incluir} onChange={setIncluir} label="Incluir depósito al cerrar" /></div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
                {kpi('Cargos', fmtMon(actual.totalCargos, actual.moneda))}{kpi('Pagado', fmtMon(actual.totalPagado, actual.moneda))}{kpi('Saldo', fmtMon(actual.saldo, actual.moneda), actual.saldo > 0.005 ? 'saldo' : 'ok')}
              </div>
            )}
            <DetalleFolio key={actual.id} folio={actual} sinCabecera agrupado={agrupada ? (esGrupo ? 'Folio de agencia' : 'Factura única') : undefined} onEliminado={() => onSel(lineas[0]?.id ?? '')} />
            <span style={{ fontSize: 11, color: C.n700 }}>Folio {actual.numero} · también disponible en Facturación › {actual.reserva ? 'Folios' : 'Folios externos'}.</span>
          </>}
        </div>
      </div>
      {nueva && <NuevaCuenta g={g} onClose={() => setNueva(false)} onListo={id => { setNueva(false); onSel(id); }} />}
      {eliminar && <Alerta open titulo="¿Deseas eliminar esta cuenta?" tono="danger" confirmar="Sí, eliminar" cancelar="Cancelar" onClose={() => setEliminar(null)}
        onConfirm={() => { const c = h.foliosCta.find(x => x.id === eliminar); h.eliminarFolio(eliminar); if (c) h.registrarBitacora(claveDe(g.principal), `Cuenta ${c.nombre} eliminada`, `Folio #${c.numero}: Abierto`, `Folio #${c.numero}: Eliminado`); setEliminar(null); onSel(lineas[0]?.id ?? ''); }}>
        No se podrán agregar nuevos cargos. Solo quedará registro en la bitácora.</Alerta>}
      {aviso && <Alerta open titulo={aviso} onClose={() => setAviso(null)} onConfirm={() => setAviso(null)} confirmar="Entendido" cancelar="Cerrar" />}
    </div>
  );
}

/** Cuenta 1 de una reserva agrupada: folio de agencia (grupo) o factura única (individual). */
function CuentaAgrupada({ g, folios, esGrupo }: { g: GrupoReserva; folios: FolioVista[]; esGrupo: boolean }) {
  const h = useHotel();
  const p = g.principal;
  const [ver, setVer] = useState<null | 'pre' | 'fac'>(null);
  const [confirmar, setConfirmar] = useState(false);
  const titular = (esAgencia(p) || p.cliente === 'Tarifa Corporativa') && p.empresa ? p.empresa : h.perfiles.find(x => x.id === p.perfilId)?.nombre ?? p.nombre;
  const suma = (ls: LineaFolio[]) => r2(ls.filter(l => !l.historico).reduce((s, l) => s + l.importe, 0));
  const filas = folios.map(f => {
    const vig = f.lineas;
    const hosp = suma(vig.filter(l => esHospedaje(l) && (l.concepto === 'HOSP' || l.concepto === 'DESC')));
    const reg = suma(vig.filter(l => esHospedaje(l) && (l.concepto === 'BB' || l.concepto === 'DESI')));
    const cons = suma(vig.filter(l => !esHospedaje(l)));
    return { f, hosp, reg, cons, total: r2(hosp + reg + cons) };
  });
  const tot = filas.reduce((a, x) => ({ hosp: a.hosp + x.hosp, reg: a.reg + x.reg, cons: a.cons + x.cons, total: a.total + x.total }), { hosp: 0, reg: 0, cons: 0, total: 0 });
  const pagado = r2(folios.reduce((s, f) => s + f.totalPagado, 0));
  const pendiente = r2(Math.max(0, tot.total - pagado));
  const cerradas = folios.every(f => f.estado === 'Cerrado');
  const factura = cerradas ? folios[0]?.factura : undefined;
  const listas = g.lineas.filter(l => l.estado !== 'Anulada').every(l => ['Completada', 'No-Show'].includes(l.estado));
  const m = p.moneda;
  // Documento único: todas las líneas de todas las cuentas en un solo folio
  const unico: FolioVista | undefined = folios[0] && {
    ...folios[0], nombre: titular, titular, numero: folios[0].numero,
    lineas: folios.flatMap(f => f.lineas.map(l => ({ ...l, descripcion: f.reserva ? `${l.descripcion} · Hab ${f.habitacion || '—'}` : `${l.descripcion} · ${f.nombre}` }))),
    pagos: folios.flatMap(f => f.pagos), totalCargos: r2(tot.total), totalPagado: pagado, saldo: r2(tot.total - pagado),
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, marginRight: 'auto' }}>Cuenta 1 · {esGrupo ? 'Folio de agencia' : 'Factura única'} <span style={{ fontWeight: 400, color: C.n700 }}>| {titular}</span></span>
        <StatusBadge label={factura ? `Facturada · ${factura}` : 'Abierta'} color={factura ? 'green' : 'yellow'} />
        <Button variant="secondary" onClick={() => setVer('pre')}>Prefactura única</Button>
        {factura ? <Button variant="secondary" onClick={() => setVer('fac')}>Ver factura {factura}</Button>
          : <span title={listas ? undefined : 'Disponible cuando todas las habitaciones hayan hecho check-out'}><Button disabled={!listas} onClick={() => setConfirmar(true)}>Facturar todo en una factura</Button></span>}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>
        {esGrupo ? <>Reúne el hospedaje (alojamiento y régimen) de todas las habitaciones a nombre de {titular}. Los consumos de cada habitación quedan en su propia cuenta y se incluyen en la misma factura.</>
          : <>Todas las cuentas de la reserva se cobran juntas. Los cargos se registran en la cuenta de cada habitación.</>}
      </p>
      <Tabla headers={['Cuenta', 'Huésped', 'Hospedaje', 'Régimen', 'Consumos', 'Total']} alinearDerecha={[2, 3, 4, 5]}>
        {filas.map(({ f, hosp, reg, cons, total }) => (
          <Fila key={f.id}><Celda>{f.reserva ? `Hab ${f.habitacion || '—'} · Folio ${f.numero}` : `${f.nombre} · Folio ${f.numero}`}</Celda><Celda>{f.reserva?.nombre ?? '—'}</Celda>
            <Celda derecha><MontoCelda texto={fmtMon(hosp, m)} /></Celda><Celda derecha><MontoCelda texto={fmtMon(reg, m)} /></Celda><Celda derecha><MontoCelda texto={fmtMon(cons, m)} /></Celda><Celda derecha><MontoCelda texto={fmtMon(total, m)} /></Celda></Fila>
        ))}
        <Fila><Celda style={{ fontWeight: 600 }}>Total</Celda><Celda /><Celda derecha style={{ fontWeight: 600 }}><MontoCelda texto={fmtMon(tot.hosp, m)} /></Celda><Celda derecha style={{ fontWeight: 600 }}><MontoCelda texto={fmtMon(tot.reg, m)} /></Celda><Celda derecha style={{ fontWeight: 600 }}><MontoCelda texto={fmtMon(tot.cons, m)} /></Celda><Celda derecha style={{ fontWeight: 600 }}><MontoCelda texto={fmtMon(tot.total, m)} /></Celda></Fila>
      </Tabla>
      <div style={{ display: 'flex', gap: 24, fontSize: 12.5 }}>
        <span style={{ color: C.n700 }}>Pagado <b style={{ color: C.n900, fontWeight: 500 }}>{fmtMon(pagado, m)}</b></span>
        <span style={{ color: C.n700 }}>{factura ? 'Por cobrar (CxC)' : 'Pendiente'} <b style={{ color: pendiente > 0.005 ? '#B45309' : C.n900, fontWeight: 500 }}>{fmtMon(pendiente, m)}</b></span>
      </div>
      {ver && unico && <Visor titulo={ver === 'pre' ? 'Prefactura única' : 'Factura'} sub={titular} onClose={() => setVer(null)}>
        <DocumentoFolio folio={unico} titulo={ver === 'pre' ? 'PREFACTURA' : 'FACTURA'} nota={ver === 'pre' ? 'Documento sin valor fiscal' : `Copia · ${factura}`} /></Visor>}
      {confirmar && <Alerta open titulo="¿Facturar toda la reserva en una sola factura?" onClose={() => setConfirmar(false)} confirmar="Sí, facturar"
        onConfirm={() => {
          h.facturarAgrupado(folios.filter(f => f.estado === 'Abierto').map(f => f.id), titular, h.sesion, ahoraHotel(), 'Cuentas por Cobrar Clientes - 1401001');
          h.registrarBitacora(claveDe(p), 'Factura única emitida', '-', `${folios.length} cuentas · ${fmtMon(tot.total, m)}`);
          setConfirmar(false);
        }}>
        Se cerrarán las {folios.length} cuentas de la reserva y se emitirá una sola factura a nombre de {titular} por {fmtMon(tot.total, m)}.</Alerta>}
    </div>
  );
}

function NuevaCuenta({ g, onClose, onListo }: { g: GrupoReserva; onClose: () => void; onListo: (id: string) => void }) {
  const h = useHotel();
  const p = g.principal;
  const extras = h.foliosCta.filter(c => c.reservaId && g.lineas.some(l => l.id === c.reservaId)).length;
  const [f, setF] = useState({ nombre: '', moneda: p.moneda as 'USD' | 'CRC', hab: '' });
  const crear = () => {
    const id = nuevoId('fx');
    const numero = String(h.seq.folio);
    const linea = g.lineas.find(l => l.habitacion === f.hab) ?? p;
    const nombre = f.nombre.trim() || `Cuenta ${g.lineas.filter(l => l.estado !== 'Anulada').length + extras + 1}`;
    const perfil = h.perfiles.find(x => x.id === p.perfilId);
    h.crearFolio({
      ...extraVacio(), id, clase: 'externo', numero, nombre, perfilId: p.perfilId, titular: perfil?.nombre ?? p.nombre, tipo: 'Cuenta de reserva', cuenta: CUENTAS_CONTABLES[0], emision: p.entrada, vencimiento: p.salida,
      moneda: f.moneda, limite: 0, tipoDeposito: 'Sin depósito', depGarantia: 0, folioCredito: '', formaPago: '', tarjeta: { tipo: 'Sin tarjeta', numero: '', vence: '', nombre: '' }, cheque: '', direccionEnvio: '', credito: false,
      fiscal: { activa: false, tipoId: '', numeroId: '', razon: '', email: '', actividad: '', direccion: '' }, cargosAuto: [], estado: 'Abierto', reservaId: linea.id, habitacion: f.hab,
      bitacora: [{ id: nuevoId('e'), fecha: ahoraHotel(), usuario: h.sesion, accion: `Cuenta creada desde la reserva ${numeroDe(p)}` }],
    });
    h.registrarBitacora(claveDe(p), `${nombre} creada. Folio: #${numero}`, '-', 'Cuenta abierta | Saldo: 0');
    onListo(id);
  };
  return (
    <PanelLateral title="Nueva cuenta" sub={`Reserva ${numeroDe(p)} · los cargos se pueden trasladar a esta cuenta`} onClose={onClose} width="clamp(420px, 36vw, 560px)"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={crear}>Crear cuenta</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Campo label="Nombre de cuenta (opcional)" hint="Puedes agregar el número de orden o habitación"><Input value={f.nombre} onChange={v => setF({ ...f, nombre: v })} placeholder={`Cuenta ${g.lineas.length + extras + 1}`} /></Campo>
        <Campo label="Moneda" required><Select value={f.moneda} onChange={v => setF({ ...f, moneda: v as 'USD' | 'CRC' })} options={[{ value: 'USD', label: 'USD $' }, { value: 'CRC', label: 'CRC ₡' }]} /></Campo>
        <Campo label="Habitación (opcional)" hint="Asocia esta cuenta a una habitación de la reserva."><Select value={f.hab} onChange={v => setF({ ...f, hab: v })} options={[{ value: '', label: 'Seleccionar habitación' }, ...g.lineas.filter(l => l.habitacion && l.estado !== 'Anulada').map(l => ({ value: l.habitacion, label: `${l.habitacion} · ${nombreTipo(l.tipo)}` }))]} /></Campo>
      </div>
    </PanelLateral>
  );
}
