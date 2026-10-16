'use client';
// Documentos imprimibles de Caja: ticket de cierre/precierre de turno,
// reporte de cierre de caja y movimientos por cajero.
import type { ReactNode } from 'react';
import { C, FONT } from '@/components/suite/tokens';
import { StatusBadge } from '@/components/suite/ui';
import { fmtF } from '@/components/hotel/datos';
import { useEmpresa } from '@/components/layout/Shell';
import { CAJEROS, COMPROBANTES, DENOMINACIONES, TC, cajeroDe, fmtCRC, fmtDuracion, fmtFH, fmtN, fmtUSD, minutosEntre, r2, totalConteo, type CierreCaja, type Turno } from '@/components/hotel/finanzas';
import { HojaSistema, TablaReporte, tdR } from '../comun';
import { datosHotel } from '../ReciboCanje';
import { consolidadoDia, resumenTurno } from './calc';
import { useHotel } from '@/components/hotel/store';

const mono = "'Courier New', ui-monospace, monospace";

/** Ticket de cierre (o precierre) de turno, formato tirilla. */
export function TicketTurno({ t, precierre, ahora }: { t: Turno; precierre?: boolean; ahora?: string | null }) {
  const h = useHotel();
  const empresa = useEmpresa();
  const d = datosHotel(empresa);
  const r = resumenTurno(h, t);
  const fin = t.fin ?? ahora ?? t.inicio;
  const declarado = t.declarado ?? r.esperado;
  const fila = (l: string, v: ReactNode, b = true) => <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}><span>{l}</span><span style={{ fontWeight: b ? 700 : 400 }}>{v}</span></div>;
  return (
    <div style={{ fontFamily: mono, fontSize: 12.5, color: '#111', padding: '30px 40px', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 }}>{empresa.toUpperCase()}</div>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#555', lineHeight: 1.5 }}>{d.razon} · Recepción Principal {d.direccion}<br />Tel: {d.tel}</div>
      <div style={{ borderTop: '1px solid #111', borderBottom: '1px solid #111', margin: '12px 0', padding: '4px 0', textAlign: 'center', fontWeight: 700 }}>{precierre ? 'PRECIERRE DE TURNO (X)' : 'CIERRE DE TURNO'}</div>
      {fila('Cajero:', t.cajero)}{fila('Apertura:', fmtFH(t.inicio))}{fila(precierre ? 'Corte:' : 'Cierre:', fmtFH(fin))}{fila('Duración:', fmtDuracion(minutosEntre(t.inicio, fin)))}
      <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />
      {fila('Fondo inicial:', fmtUSD(t.saldoInicial))}{fila('Total cobrado:', fmtUSD(r.ingresos, true))}{fila('Total egresos:', fmtUSD(-r.egresos))}{fila('Saldo esperado:', fmtUSD(r.esperado))}
      {!precierre && <>{fila('Saldo declarado:', fmtUSD(declarado))}{fila('Diferencia:', fmtUSD(t.diferencia))}</>}
      {precierre && <>{fila('Efectivo USD:', fmtUSD(r.efectivoUSD))}{fila('Efectivo CRC:', fmtCRC(r.efectivoCRC))}{fila('Tarjetas:', fmtUSD(r.tarjetas))}{fila('Transf./Link:', fmtUSD(r.transf))}</>}
      {t.forzado && <div style={{ marginTop: 6, fontSize: 11 }}>Cierre forzado por {t.forzadoPor}: {t.detalles}</div>}
      {t.motivo && !t.forzado && <div style={{ marginTop: 6, fontSize: 11 }}>Motivo: {t.motivo}. {t.detalles}</div>}
      <div style={{ borderTop: '1px dashed #999', margin: '8px 0 40px' }} />
      {precierre ? <div style={{ textAlign: 'center', fontSize: 11 }}>Documento informativo · el turno sigue abierto</div> : (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 30 }}>
          {['Cajero', 'Supervisor'].map(x => <div key={x} style={{ flex: 1, borderTop: '1px solid #111', textAlign: 'center', paddingTop: 4, fontSize: 11 }}>{x}</div>)}
        </div>
      )}
    </div>
  );
}

const Seccion = ({ titulo, children }: { titulo: string; children: ReactNode }) => <div style={{ marginTop: 22 }}><h2 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 600 }}>{titulo}</h2>{children}</div>;
const Total = ({ l, v }: { l: string; v: string }) => <tr><td colSpan={2} style={{ ...tdR(true), fontWeight: 600, borderBottom: 'none' }}>{l}</td><td style={{ ...tdR(true), fontWeight: 700, fontSize: 13, borderBottom: 'none' }}>{v}</td><td style={{ borderBottom: 'none' }} /></tr>;

/** Reporte «Cierre de caja» (System Report). Sin `cierre` muestra la vista previa con los datos actuales. */
export function ReporteCierreCaja({ cierre, hora }: { cierre?: CierreCaja; hora: string }) {
  const h = useHotel();
  const empresa = useEmpresa();
  const c = consolidadoDia(h);
  const cerrados = c.turnos.filter(t => t.fin);
  const conteoUSD = DENOMINACIONES.USD.map(d => [d, cerrados.reduce((s, t) => s + (t.conteoCierre?.USD[d] ?? 0), 0)] as const).filter(([, n]) => n);
  const conteoCRC = DENOMINACIONES.CRC.map(d => [d, cerrados.reduce((s, t) => s + (t.conteoCierre?.CRC[d] ?? 0), 0)] as const).filter(([, n]) => n);
  const box = (l: string, v: ReactNode) => <div><div style={{ fontSize: 9.5, color: C.n700, letterSpacing: '.05em' }}>{l}</div><div style={{ fontSize: 14, marginTop: 3 }}>{v}</div></div>;
  return (
    <HojaSistema titulo="Cierre de caja" subtitulo="Resumen de cierre de caja y liquidación de comprobantes">
      <div style={{ border: `1px solid ${C.n500}`, background: C.n200, borderRadius: 8, padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div style={{ gridColumn: 'span 2' }}>{box('RECEPCIÓN', 'Recepción Principal')}</div><div style={{ gridColumn: 'span 2' }}>{box('FOLIO', cierre?.folio ?? 'Vista previa (sin firmar)')}</div>
        {box('RESPONSABLE', cierre?.firmadoPor ?? h.sesion)}{box('FECHA HOTELERA', fmtF(cierre?.fecha ?? h.cajaDia.fecha))}{box('HORA CIERRE', cierre?.hora ?? hora)}{box('HOTEL', empresa)}
      </div>
      <Seccion titulo="Cajeros en el turno">
        <TablaReporte headers={['Cajero', 'Estado', 'Usuario', 'Total']} derecha={[3]}>
          {c.filas.map(({ t, r }) => <tr key={t.id}><td style={tdR()}>{t.cajero}</td><td style={tdR()}><StatusBadge label={t.fin ? 'CERRADO' : 'ACTIVO'} color={t.fin ? 'gray' : 'green'} /></td><td style={tdR()}>{cajeroDe(t.cajero)?.usuario}</td><td style={tdR(true)}>{fmtUSD(r.ingresos - r.egresos)}</td></tr>)}
          <Total l="TOTAL CAJEROS:" v={fmtUSD(r2(c.ingresos - c.egresos))} />
        </TablaReporte>
      </Seccion>
      <Seccion titulo="Liquidación de comprobantes">
        <TablaReporte headers={['Tipo', 'Moneda', 'Importe', '']} derecha={[2]}>
          {COMPROBANTES.map(k => <tr key={k.k}><td style={tdR()}>{k.metodo} · {k.detalle}</td><td style={tdR()}>{k.moneda}</td><td style={tdR(true)}>{k.moneda === 'CRC' ? fmtCRC(c.metodos[k.k]) : fmtUSD(c.metodos[k.k])}</td><td style={tdR()} /></tr>)}
          <Total l="TOTAL COMPROBANTES:" v={fmtUSD(r2(c.metodos.pos1 + c.metodos.pos2 / TC + c.metodos.link + c.metodos.transf))} />
        </TablaReporte>
      </Seccion>
      <Seccion titulo="Recuento efectivo">
        <TablaReporte headers={['Denominación', 'Cantidad', 'Importe', '']} derecha={[1, 2]}>
          {conteoUSD.map(([d, n]) => <tr key={'u' + d}><td style={tdR()}>$ {d}</td><td style={tdR(true)}>{n}</td><td style={tdR(true)}>{fmtUSD(d * n)}</td><td style={tdR()} /></tr>)}
          {conteoCRC.map(([d, n]) => <tr key={'c' + d}><td style={tdR()}>₡ {fmtN(d, 0)}</td><td style={tdR(true)}>{n}</td><td style={tdR(true)}>{fmtCRC(d * n)}</td><td style={tdR()} /></tr>)}
          <Total l="TOTAL EFECTIVO:" v={fmtUSD(r2(c.metodos.efUSD + c.metodos.efCRC / TC))} />
        </TablaReporte>
      </Seccion>
      <Seccion titulo="Resultado del día">
        <TablaReporte headers={['Concepto', '', 'Importe', '']} derecha={[2]}>
          {[['Saldo inicial de apertura', c.saldoInicial], ['Total ingresos', c.ingresos], ['Total egresos', -c.egresos], ['Saldo esperado al cierre', c.esperado], ['Total declarado', c.declarado], ['Diferencia del día', c.diferencia]].map(([l, v]) =>
            <tr key={l as string}><td style={tdR()} colSpan={2}>{l}</td><td style={tdR(true, { color: l === 'Diferencia del día' && (v as number) < 0 ? C.error : undefined })}>{fmtUSD(v as number)}</td><td style={tdR()} /></tr>)}
        </TablaReporte>
        {cierre?.observaciones && <p style={{ fontSize: 11, marginTop: 10 }}><b>Observaciones:</b> {cierre.observaciones}</p>}
      </Seccion>
      <Seccion titulo="Firmas de responsables">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 6 }}>
          {[['FIRMA CAJERO RESPONSABLE', cierre?.firmadoPor ?? h.sesion], ['RECIBIDO POR CONTABILIDAD', cierre?.recibidoPor || '—']].map(([l, n]) => (
            <div key={l}><div style={{ fontSize: 9.5, color: C.n700 }}>{l}</div><div style={{ borderBottom: `1px solid ${C.n500}`, height: 30 }} /><div style={{ fontSize: 12, paddingTop: 6 }}>{n}</div></div>
          ))}
        </div>
      </Seccion>
    </HojaSistema>
  );
}

/** «Movimientos por cajero» + cantidad en caja consolidada (Exportar historial → PDF). */
export function ReporteMovimientosCajero({ turnos }: { turnos: Turno[] }) {
  const h = useHotel();
  const filas = CAJEROS.map(c => {
    const ts = turnos.filter(t => t.cajero === c.nombre);
    if (!ts.length) return null;
    const entrada = r2(ts.reduce((s, t) => s + resumenTurno(h, t).ingresos, 0));
    const salida = r2(ts.reduce((s, t) => s + resumenTurno(h, t).egresos, 0));
    const dif = r2(ts.reduce((s, t) => s + t.diferencia, 0));
    return { c, entrada, salida, dif, conciliado: ts.every(t => t.fin) && Math.abs(dif) < 0.01 };
  }).filter((x): x is NonNullable<typeof x> => !!x);
  const cerrados = turnos.filter(t => t.fin && t.conteoCierre);
  const ult = cerrados.at(-1);
  const billetes = DENOMINACIONES.USD.map(d => [d, ult?.conteoCierre?.USD[d] ?? 0] as const);
  const tot = (k: 'entrada' | 'salida' | 'dif') => r2(filas.reduce((s, f) => s + f[k], 0));
  return (
    <HojaSistema titulo="Movimientos por cajero" subtitulo="Resumen de movimientos registrados por cajero">
      <TablaReporte headers={['Cajero', 'Entrada', 'Salida', 'Diferencia', 'Estado']} derecha={[1, 2, 3]}>
        {filas.map(f => <tr key={f.c.nombre}><td style={tdR(false, { fontWeight: 600 })}>{f.c.nombre}</td><td style={tdR(true)}>{fmtUSD(f.entrada)}</td><td style={tdR(true)}>{fmtUSD(f.salida)}</td><td style={tdR(true)}>{fmtUSD(f.dif)}</td>
          <td style={tdR()}><StatusBadge label={f.conciliado ? 'CONCILIADO' : 'PENDIENTE'} color={f.conciliado ? 'green' : 'gray'} /></td></tr>)}
        <tr style={{ background: '#F5F5F5' }}><td style={tdR(false, { fontWeight: 700 })}>TOTAL</td><td style={tdR(true, { fontWeight: 700 })}>{fmtUSD(tot('entrada'))}</td><td style={tdR(true, { fontWeight: 700 })}>{fmtUSD(tot('salida'))}</td><td style={tdR(true, { fontWeight: 700 })}>{fmtUSD(tot('dif'))}</td><td style={tdR()} /></tr>
      </TablaReporte>
      <h2 style={{ margin: '24px 0 10px', fontSize: 16, fontWeight: 600 }}>Cantidad en caja - consolidado</h2>
      <TablaReporte headers={['Item', 'Cantidad', 'Importe', 'Total']} derecha={[1, 2, 3]}>
        {billetes.map(([d, n]) => <tr key={d}><td style={tdR()}>Billetes $ {d}</td><td style={tdR(true)}>{n}</td><td style={tdR(true)}>{fmtUSD(d)}</td><td style={tdR(true)}>{fmtUSD(d * n)}</td></tr>)}
        <tr><td style={tdR()}>Colones (equiv. USD)</td><td style={tdR(true)}>—</td><td style={tdR(true)}>{fmtCRC(totalConteo(ult?.conteoCierre, 'CRC'))}</td><td style={tdR(true)}>{fmtUSD(totalConteo(ult?.conteoCierre, 'CRC') / TC)}</td></tr>
        <tr style={{ background: '#F5F5F5' }}><td style={tdR(false, { fontWeight: 700 })}>TOTAL</td><td style={tdR(true, { fontWeight: 700 })}>{billetes.reduce((s, [, n]) => s + n, 0)}</td><td style={tdR()} /><td style={tdR(true, { fontWeight: 700 })}>{fmtUSD(r2(totalConteo(ult?.conteoCierre, 'USD') + totalConteo(ult?.conteoCierre, 'CRC') / TC))}</td></tr>
      </TablaReporte>
      <p style={{ fontSize: 10, color: C.n700, marginTop: 8, fontFamily: FONT }}>Cantidad en caja según el último arqueo cerrado{ult ? ` (${ult.cajero}, ${fmtFH(ult.fin)})` : ''}.</p>
    </HojaSistema>
  );
}
