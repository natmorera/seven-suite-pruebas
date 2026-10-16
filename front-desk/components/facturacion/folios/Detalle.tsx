'use client';
// Detalle del folio: Información · Cargos · Pagos · Bitácora (spec «Detalle del folio»).
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, StatusBadge, Toast } from '@/components/suite/ui';
import { CardTabs } from '@/components/configuracion/kit';
import { Alerta } from '@/components/hotel/ui';
import { useHotel } from '@/components/hotel/store';
import { HOY, fmtF } from '@/components/hotel/datos';
import { ahoraHotel, fmtFH, fmtMon, fmtN, formaPago, r2, type PagoFolio } from '@/components/hotel/finanzas';
import { BotonIcono, ChipTipo, IcDoc, IcRefresh, IcXCirculo, Visor } from '../comun';
import { ConfirmarCorreccion, NuevoCargo, Redirigir, Trasladar } from './Operaciones';
import { DocumentoFolio, NotaFiscal, RegistrarPago } from './Pagos';
import type { FolioVista, LineaFolio } from './modelo';

const TABS = ['Información', 'Cargos', 'Pagos', 'Bitácora'] as const;
type Tab = (typeof TABS)[number];
type Dialogo = null | 'cargo' | 'traslado' | 'redirigir' | 'pago' | 'nota' | 'prefactura' | 'factura' | 'sinSaldo' | 'eliminar' | 'cerrar' | { recibo: PagoFolio };

const cuando = () => ahoraHotel();

/** `agrupado`: la cuenta pertenece a una reserva que se cobra en una sola factura (folio de agencia o factura única);
 *  entonces no se cierra por separado. */
export function DetalleFolio({ folio, onEliminado, agrupado, tabInicial = 'Información', sinCabecera, dialogoInicial }: { folio: FolioVista; onEliminado?: () => void; agrupado?: string; tabInicial?: Tab; sinCabecera?: boolean; dialogoInicial?: 'cargo' | 'pago' | 'prefactura' }) {
  const h = useHotel();
  const [tab, setTab] = useState<Tab>(tabInicial);
  const [dialogo, setDialogo] = useState<Dialogo>(dialogoInicial ?? null);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [confirmarCorr, setConfirmarCorr] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const abierto = folio.estado === 'Abierto';
  const listo = (t: string) => { setDialogo(null); setToast(t); };
  const formaCierre = folio.pagos.at(-1) ? formaPago(folio.pagos.at(-1)!.forma).cuenta : 'Cuentas por Cobrar Clientes - 1401001';
  const corregibles = folio.lineas.filter(l => !l.bloqueado && !l.historico && l.importe > 0);
  const elegidas = folio.lineas.filter(l => sel.includes(l.id));
  const totalSel = r2(elegidas.reduce((s, l) => s + l.importe, 0));
  const inHouse = folio.reserva?.estado === 'In-House';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, fontFamily: FONT }}>
      {!sinCabecera && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.n200, borderRadius: radius.md, padding: '10px 14px' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{folio.clase === 'casa' ? 'Cuenta' : 'Folio'} {folio.numero} <StatusBadge label={folio.estado} color={abierto ? 'green' : 'gray'} /></span>
        <span style={{ fontSize: 12, color: C.n700 }}>Saldo <b data-testid="saldo-folio" style={{ color: C.n900, fontWeight: 500, marginLeft: 6 }}>{fmtMon(folio.saldo, folio.moneda)}</b></span>
      </div>}
      <CardTabs tabs={TABS} active={tab} onChange={t => { setTab(t); setCorrigiendo(false); setSel([]); }} />

      {tab === 'Información' && <Informacion folio={folio} acciones={<>
        <Button variant="secondary" onClick={() => setDialogo('prefactura')}>Prefactura</Button>
        {abierto && !inHouse && !agrupado && Math.abs(folio.saldo) < 0.01 && <Button onClick={() => setDialogo('cerrar')}>Cerrar folio y facturar</Button>}
        {abierto && agrupado && <span style={{ fontSize: 11.5, color: C.n700, alignSelf: 'center' }}>Se factura junto con la reserva desde «{agrupado}».</span>}
        {!abierto && folio.clase !== 'reserva' && <Button variant="secondary" onClick={() => { h.reabrirFolio(folio.id, h.sesion, cuando()); setToast('Folio reabierto'); }}>Reabrir folio</Button>}
        {folio.factura && <Button variant="secondary" onClick={() => setDialogo('factura')}>Ver factura {folio.factura}</Button>}
        {folio.factura && <Button variant="secondary" onClick={() => setDialogo('nota')}>Nota de crédito / débito</Button>}
        {folio.clase === 'externo' && folio.lineas.length === 0 && folio.pagos.length === 0 && <Button variant="danger" onClick={() => setDialogo('eliminar')}>Eliminar cuenta</Button>}
      </>} />}

      {tab === 'Cargos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!corrigiendo ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button onClick={() => setDialogo('cargo')} disabled={!abierto}>Agregar cargo</Button>
              <Button variant="secondary" icon={<IcRefresh />} style={{ color: C.brand, borderColor: C.brandBd }} onClick={() => setDialogo('traslado')} disabled={!abierto}>Trasladar cargos</Button>
              <Button variant="secondary" style={{ color: C.brand, borderColor: C.brandBd }} onClick={() => setDialogo('redirigir')} disabled={!abierto}>Redirigir cargos{folio.redirecciones.length ? ` (${folio.redirecciones.length})` : ''}</Button>
              <Button icon={<IcXCirculo />} onClick={() => { setCorrigiendo(true); setSel([]); }} disabled={!abierto || !corregibles.length} style={{ background: C.error, borderColor: C.error }}>Corrección</Button>
            </div>
          ) : (
            <div style={{ background: C.brandDk, color: '#fff', borderRadius: radius.md, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
              <span><b style={{ fontWeight: 600 }}>Seleccionar los cargos que deseas corregir</b><span style={{ opacity: .8, marginLeft: 10 }}>{sel.length} seleccionados</span></span><b>- {fmtMon(totalSel, folio.moneda)}</b>
            </div>
          )}
          <TablaCargos folio={folio} corrigiendo={corrigiendo} sel={sel} setSel={setSel} />
          {corrigiendo && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="secondary" onClick={() => { setCorrigiendo(false); setSel([]); }}>Cancelar</Button>
            <Button disabled={!sel.length} onClick={() => setConfirmarCorr(true)}>Guardar correcciones</Button>
          </div>}
        </div>
      )}

      {tab === 'Pagos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><Button onClick={() => setDialogo('pago')} disabled={!abierto || folio.saldo <= 0.009} style={{ background: C.success, borderColor: C.success }}>Registrar pago</Button></div>
          {folio.pagos.length === 0 ? <p style={{ margin: 0, padding: '40px 0', textAlign: 'center', fontSize: 12.5, color: C.n700 }}>Sin pagos registrados en este folio.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>{['Fecha', 'Forma de pago', 'Tarjeta', 'Monto facturado', 'Pendiente', ''].map((x, i) => <th key={i} style={{ ...th, textAlign: i >= 3 && i <= 4 ? 'right' : 'left' }}>{x}</th>)}</tr></thead>
              <tbody>{folio.pagos.map(p => (
                <tr key={p.id} style={{ opacity: p.historico ? 0.55 : 1 }}>
                  <td style={td}>{fmtF(p.fecha)} <span style={{ color: C.n700 }}>{p.hora}</span></td>
                  <td style={td}>{p.forma === 'ANT' ? 'Anticipos / pagos previos' : p.forma === 'DEP' ? 'Depósito en garantía' : formaPago(p.forma).nombre}{p.moneda !== 'USD' && <span style={{ color: C.n700 }}> · {fmtMon(p.importe, p.moneda)}</span>}</td>
                  <td style={td}>{p.tarjeta ? <>{'•••• ' + p.tarjeta}<br /><span style={{ color: C.n700, fontSize: 11 }}>{p.venceTarjeta || '—'}</span></> : '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtMon(p.montoFacturado)}</td><td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmtMon(p.pendiente)}</td>
                  <td style={{ ...td, textAlign: 'right' }}><BotonIcono label="Ver recibo de pago" onClick={() => setDialogo({ recibo: p })}><IcDoc /></BotonIcono></td>
                </tr>
              ))}</tbody>
            </table>
          )}
          <TotalBar l="Total pagado:" v={fmtMon(folio.totalPagado, folio.moneda)} />
        </div>
      )}

      {tab === 'Bitácora' && <Bitacora folio={folio} />}

      {dialogo === 'cargo' && <NuevoCargo folio={folio} onClose={() => setDialogo(null)} onListo={listo} />}
      {dialogo === 'traslado' && <Trasladar folio={folio} onClose={() => setDialogo(null)} onListo={listo} />}
      {dialogo === 'redirigir' && <Redirigir folio={folio} onClose={() => setDialogo(null)} onListo={listo} />}
      {dialogo === 'pago' && <RegistrarPago folio={folio} onClose={() => setDialogo(null)} onListo={(t, cero) => { setToast(t); setDialogo(cero && !inHouse ? 'sinSaldo' : null); }} />}
      {dialogo === 'nota' && <NotaFiscal folio={folio} onClose={() => setDialogo(null)} onListo={listo} />}
      {dialogo === 'prefactura' && <Visor titulo="Prefactura" sub={`Folio ${folio.numero}`} onClose={() => setDialogo(null)}><DocumentoFolio folio={folio} /></Visor>}
      {dialogo === 'factura' && <Visor titulo="Factura electrónica" sub={folio.factura} onClose={() => setDialogo(null)}><DocumentoFolio folio={{ ...folio, lineas: folio.lineas.map(l => ({ ...l, historico: false })) }} titulo={`FACTURA ${folio.factura}`} nota="Comprobante electrónico" /></Visor>}
      {typeof dialogo === 'object' && dialogo && 'recibo' in dialogo && <Visor titulo="Recibo de pago" sub={`Folio ${folio.numero}`} ancho={640} onClose={() => setDialogo(null)}><ReciboPago folio={folio} p={dialogo.recibo} /></Visor>}
      <Alerta open={dialogo === 'sinSaldo'} titulo="La cuenta quedó sin saldo" onClose={() => setDialogo(null)} cancelar="Mantener abierta" confirmar="Cerrar folio"
        onConfirm={() => { h.cerrarFolio(folio.id, h.sesion, cuando(), formaCierre); listo(`Folio ${folio.numero} cerrado y facturado`); }}>
        ¿Mantener abierta o cerrar? Al cerrar se emite la factura electrónica y no se podrán agregar cargos.
      </Alerta>
      <Alerta open={dialogo === 'cerrar'} titulo={`¿Cerrar el folio ${folio.numero}?`} onClose={() => setDialogo(null)} confirmar="Cerrar y facturar" cancelar="Cancelar"
        onConfirm={() => { h.cerrarFolio(folio.id, h.sesion, cuando(), formaCierre); listo(`Folio ${folio.numero} cerrado y facturado`); }}>
        Se emitirá la factura por {fmtMon(folio.totalCargos, folio.moneda)} y el folio pasará al histórico.
      </Alerta>
      <Alerta open={dialogo === 'eliminar'} titulo="¿Eliminar esta cuenta?" tono="danger" onClose={() => setDialogo(null)} confirmar="Eliminar" cancelar="Cancelar"
        onConfirm={() => { h.eliminarFolio(folio.id); setDialogo(null); onEliminado?.(); }}>
        No se podrán agregar nuevos cargos. La cuenta solo quedará en la bitácora.
      </Alerta>
      {confirmarCorr && <ConfirmarCorreccion folio={folio} lineas={elegidas} onClose={() => setConfirmarCorr(false)} onListo={() => { setConfirmarCorr(false); setCorrigiendo(false); setSel([]); setToast('Corrección registrada'); }} />}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </div>
  );
}

const th = { padding: '8px', fontWeight: 400, color: C.n700, borderBottom: `1px solid ${C.n500}`, fontSize: 12, whiteSpace: 'nowrap' as const };
const td = { padding: '8px', borderBottom: `1px solid ${C.n500}`, fontSize: 12 };
function TotalBar({ l, v }: { l: string; v: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', background: C.n200, borderRadius: radius.control, padding: '10px 14px', fontSize: 13, fontWeight: 600 }}><span>{l}</span><span>{v}</span></div>;
}

function TablaCargos({ folio, corrigiendo, sel, setSel }: { folio: FolioVista; corrigiendo: boolean; sel: string[]; setSel: (s: string[]) => void }) {
  const [hist, setHist] = useState(false);
  const lineas = folio.lineas.filter(l => hist || !l.historico).filter(l => !corrigiendo || (!l.bloqueado && l.importe > 0 && !l.historico));
  const cols = ['Fecha', 'Concepto', 'Origen', 'Concepto Orig.', 'Importe', 'Tipo'];
  const total = r2(folio.lineas.filter(l => !l.historico).reduce((s, l) => s + l.importe, 0));
  const todos = lineas.length > 0 && lineas.every(l => sel.includes(l.id));
  return (
    <>
      {folio.lineas.some(l => l.historico) && !corrigiendo && <Checkbox label="Ver cargos históricos (liquidados)" checked={hist} onChange={setHist} />}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead><tr>
            {corrigiendo && <th style={{ ...th, width: 28 }}><Checkbox checked={todos} onChange={v => setSel(v ? lineas.map(l => l.id) : [])} /></th>}
            {cols.map((c, i) => <th key={c} style={{ ...th, textAlign: i === 4 ? 'right' : 'left' }}>{c}</th>)}
          </tr></thead>
          <tbody>
            {lineas.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.n700, padding: 28 }}>{corrigiendo ? 'No hay cargos que se puedan corregir.' : 'El folio no tiene cargos.'}</td></tr>}
            {lineas.map((l: LineaFolio) => (
              <tr key={l.id} style={{ background: sel.includes(l.id) ? 'rgba(244,67,54,.04)' : undefined, opacity: l.historico ? 0.55 : 1 }}>
                {corrigiendo && <td style={td}><Checkbox checked={sel.includes(l.id)} onChange={v => setSel(v ? [...sel, l.id] : sel.filter(x => x !== l.id))} /></td>}
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtF(l.fecha)}</td>
                <td style={{ ...td, maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.descripcion}>{l.descripcion || l.conceptoOrig}</td>
                <td style={td}>{l.origen}</td>
                <td style={{ ...td, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.n700 }} title={l.motivo}>{l.conceptoOrig}</td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap', color: l.importe < 0 ? C.error : undefined }}>{fmtMon(l.importe, folio.moneda)}</td>
                <td style={td}><ChipTipo tipo={l.tipo} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TotalBar l="Total:" v={fmtMon(total, folio.moneda)} />
    </>
  );
}

function Informacion({ folio, acciones }: { folio: FolioVista; acciones: ReactNode }) {
  const fila = (l: string, v: ReactNode) => <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5, padding: '3px 0' }}><span>{l}</span><span style={{ textAlign: 'right' }}>{v || '-'}</span></div>;
  const titulo = (t: string) => <p style={{ margin: '14px 0 4px', fontSize: 12.5, color: C.n700 }}>{t}</p>;
  return (
    <div>
      {titulo('Datos del folio')}
      {folio.reserva && fila('Cliente', folio.perfilId ? <Link href={`/hospedaje/perfiles?id=${folio.perfilId}`} style={{ color: C.brand }}>{folio.nombre}</Link> : folio.nombre)}
      {folio.reserva && fila('Reserva', `${folio.reservaNumero} · Hab ${folio.habitacion} · ${folio.reserva.estado}`)}
      {fila('N° Folio', folio.numero)}{fila('Cuenta contable', folio.cuenta)}{fila(folio.clase === 'casa' ? 'Titular' : 'Perfil', folio.clase === 'casa' ? folio.titular : folio.reserva ? folio.titular : folio.nombre)}
      {fila(folio.reserva ? 'F. Entrada' : 'F. Emisión', fmtF(folio.emision))}{fila(folio.reserva ? 'F. Salida' : 'F. Vencimiento', <span style={{ color: folio.estado === 'Abierto' && folio.vencimiento < HOY ? C.error : undefined }}>{fmtF(folio.vencimiento)}</span>)}
      {folio.clase !== 'casa' && fila('Tipo', folio.tipo)}
      {titulo('Crédito')}
      {fila('Límite de crédito', folio.limite ? fmtMon(folio.limite, folio.moneda) : '-')}{fila('Depósito en garantía', fmtN(folio.depGarantia))}{fila('Folio crédito', folio.folioCredito)}{fila('Forma de pago', folio.formaPago)}
      {titulo('Facturación electrónica')}
      {fila('Razón social', folio.fiscal.razon)}{fila('Identificación fiscal', folio.fiscal.numeroId)}{fila('Correo electrónico', folio.fiscal.email)}{fila('Dirección de envío', folio.direccionEnvio)}
      {folio.exoneracion && <>{titulo('Exoneración de impuestos')}{fila('Tipo', folio.exoneracion.tipo)}{fila('Documento', `${folio.exoneracion.documento || '—'} · ${folio.exoneracion.institucion || '—'}`)}{fila('Monto / tarifa', `${fmtMon(folio.exoneracion.monto)} · ${folio.exoneracion.tarifa}%`)}</>}
      {folio.referencia && <>{titulo('Referencia')}{fila('Tipo', folio.referencia.tipo)}{fila('Documento', `${folio.referencia.documento || '—'}${folio.referencia.contingencia ? ' (contingencia)' : ''}`)}{fila('Razón', folio.referencia.razon)}</>}
      {folio.documentos.length > 0 && <>{titulo('Documentos fiscales')}{folio.documentos.map(d => <div key={d.id}>{fila(`${d.tipo} ${d.numero}`, `${fmtMon(d.importe)} · ${fmtFH(d.fecha)}`)}</div>)}</>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>{acciones}</div>
    </div>
  );
}

function Bitacora({ folio }: { folio: FolioVista }) {
  const [asc, setAsc] = useState(false);
  const filas = [...folio.bitacora].sort((a, b) => (asc ? a.fecha.localeCompare(b.fecha) : b.fecha.localeCompare(a.fecha)));
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>
        <th style={{ ...th, textAlign: 'left' }}><button type="button" onClick={() => setAsc(!asc)} style={{ border: 'none', background: 'none', color: C.n700, cursor: 'pointer', fontFamily: FONT, fontSize: 12, padding: 0 }}>Fecha {asc ? '↑' : '↓'}</button></th>
        {['Usuario', 'Folio', 'Acción'].map(c => <th key={c} style={{ ...th, textAlign: 'left' }}>{c}</th>)}
      </tr></thead>
      <tbody>
        {filas.length === 0 && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: C.n700, padding: 28 }}>Sin acciones registradas.</td></tr>}
        {filas.map(e => <tr key={e.id}><td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtFH(e.fecha)}</td><td style={td}>{e.usuario}</td><td style={td}>{folio.numero}</td><td style={td}>{e.accion}</td></tr>)}
      </tbody>
    </table>
  );
}

function ReciboPago({ folio, p }: { folio: FolioVista; p: PagoFolio }) {
  const fila = (l: string, v: ReactNode) => <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.n500}`, fontSize: 12.5 }}><span style={{ color: C.n700 }}>{l}</span><span>{v}</span></div>;
  return (
    <div style={{ padding: 28, fontFamily: FONT }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Recibo de pago</h2>
      <p style={{ margin: '0 0 14px', fontSize: 12, color: C.n700 }}>Folio {folio.numero} · {folio.nombre}</p>
      {fila('Fecha', `${fmtF(p.fecha)} ${p.hora}`)}{fila('Forma de pago', p.forma === 'ANT' ? 'Anticipos / pagos previos' : p.forma === 'DEP' ? 'Depósito en garantía' : formaPago(p.forma).nombre)}
      {fila('Moneda / tasa', `${p.moneda} · ${fmtN(p.tasa)}`)}{fila('Importe', fmtMon(p.importe, p.moneda))}{p.descuento > 0 && fila('Descuento', `- ${fmtMon(p.descuento, p.moneda)}`)}
      {p.tarjeta && fila('Tarjeta', `•••• ${p.tarjeta}`)}{p.referencia && fila('Referencia', p.referencia)}{fila('Monto aplicado al folio', fmtMon(p.montoFacturado))}{fila('Saldo pendiente', fmtMon(p.pendiente))}{fila('Cajero', p.usuario)}
      <div style={{ marginTop: 50, width: 220, borderTop: `1px solid ${C.n900}`, paddingTop: 4, fontSize: 11, textAlign: 'center' }}>Firma del cliente</div>
    </div>
  );
}
