'use client';
// Caja: cierre de la caja del día (consolidado de turnos, resumen final y firma con contabilidad).
import { useState } from 'react';
import { C } from '@/components/suite/tokens';
import { Button, StatusBadge } from '@/components/suite/ui';
import { Celda, Fila, Tabla, TextArea } from '@/components/configuracion/kit';
import { useHotel } from '@/components/hotel/store';
import { fmtF } from '@/components/hotel/datos';
import { ADMIN, TC, fmtCRC, fmtUSD, horaReal, r2, type Turno } from '@/components/hotel/finanzas';
import { Banda, PaginaFact, Tarjeta, Visor, useAhora } from '../comun';
import { consolidadoDia } from './calc';
import { ReporteCierreCaja, TicketTurno } from './Reportes';
import { FirmaModal, Linea, Renglon, Volver, type P } from './piezas';
import { ForzarCierre } from './Cajeros';

// ── Cierre de caja del día ──────────────────────────────────────────────────
export function CierreDia({ ir, toast, obsInicial }: P & { obsInicial?: string }) {
  const h = useHotel();
  const c = consolidadoDia(h);
  const [obs, setObs] = useState(obsInicial ?? '');
  const [forzar, setForzar] = useState<Turno | null>(null);
  const [ver, setVer] = useState<Turno | null>(null);
  const totalDecl = r2(c.metodos.efUSD + c.metodos.efCRC / TC + c.metodos.pos1 + c.metodos.pos2 / TC + c.metodos.link + c.metodos.transf);
  const pendientes = c.turnos.filter(t => t.fin && Math.abs(t.diferencia) >= 0.01).length;
  return (
    <PaginaFact titulo={`Cierre de caja del día · ${fmtF(h.cajaDia.fecha)}`} izquierda={<Volver onClick={() => ir({ v: 'inicio' })} />}
      pie={<><Button variant="secondary" onClick={() => ir({ v: 'inicio' })}>Cancelar</Button><Button disabled={c.activos.length > 0} onClick={() => ir({ v: 'resumenDia', obs })} title={c.activos.length ? 'Cierra o fuerza el cierre de los turnos activos' : undefined}>Revisar y resumen final →</Button></>}>
      {c.activos.length > 0 && <Banda tono="error"><b>{c.activos.length} {c.activos.length === 1 ? 'cajero aún tiene' : 'cajeros aún tienen'} turno activo.</b> Para cerrar la caja del día, primero deben cerrar sus turnos o tú debes forzar el cierre.</Banda>}
      <Tarjeta titulo="Estado de turnos al cierre">
        <Tabla headers={['Cajero', 'Inicio de turno', 'Ingresos', 'Egresos', 'Diferencia', 'Estado turno', '']} alinearDerecha={[2, 3, 4]}>
          {c.filas.map(({ t, r }) => {
            const conDif = Math.abs(t.diferencia) >= 0.01;
            const mio = t.cajero === h.sesion;
            return (
              <Fila key={t.id}>
                <Celda style={{ fontWeight: 600 }}>{t.cajero}</Celda><Celda>{t.inicio.slice(11, 16)}</Celda>
                <Celda derecha style={{ color: '#2E7D32' }}>{fmtUSD(r.ingresos, true)}</Celda><Celda derecha style={{ color: C.error }}>{fmtUSD(-r.egresos)}</Celda>
                <Celda derecha>{t.fin ? <StatusBadge label={fmtUSD(t.diferencia)} color={conDif ? 'red' : 'green'} /> : '—'}</Celda>
                <Celda>{t.fin ? <StatusBadge label={`${t.forzado ? 'Cerrado (forzado)' : 'Cerrado'} ${t.fin.slice(11, 16)}`} color="green" /> : <StatusBadge label={t.precierre ? 'Activo — en precierre' : 'Activo — precierre pendiente'} color={t.precierre ? 'yellow' : 'brand'} />}</Celda>
                <Celda derecha>{t.fin ? <Button variant="secondary" onClick={() => setVer(t)}>Ver reporte</Button> : mio ? <Button variant="secondary" onClick={() => ir({ v: 'arqueo', turnoId: t.id })}>Ir a mi precierre</Button>
                  : <Button onClick={() => setForzar(t)} style={{ background: C.error, borderColor: C.error }}>Forzar cierre</Button>}</Celda>
              </Fila>
            );
          })}
        </Tabla>
      </Tarjeta>
      <Tarjeta titulo="Resumen consolidado del día">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <Renglon l="Saldo inicial de apertura" v={fmtUSD(c.saldoInicial)} />
            <Renglon l="Total ingresos del día" v={<span style={{ color: '#2E7D32' }}>{fmtUSD(c.ingresos, true)}</span>} />
            <Renglon l="Total egresos del día" v={<span style={{ color: C.error }}>{fmtUSD(-c.egresos)}</span>} />
            <Renglon l="Saldo esperado al cierre" v={fmtUSD(c.esperado)} fuerte />
          </div>
          <div>
            <Renglon l="D1 · Efectivo USD contado" v={fmtUSD(c.metodos.efUSD)} />
            <Renglon l="D2 · Efectivo CRC (equiv. USD)" v={fmtUSD(c.metodos.efCRC / TC)} />
            <Renglon l="D3 · Comprobantes datáfono" v={fmtUSD(c.metodos.pos1 + c.metodos.pos2 / TC)} />
            <Renglon l="D4 · Transferencias / Link de pago" v={fmtUSD(c.metodos.link + c.metodos.transf)} />
            <Renglon l="Total declarado (turnos cerrados)" v={fmtUSD(totalDecl)} fuerte />
          </div>
        </div>
        <Linea l="Diferencia consolidada (sobrante / faltante)" v={`${fmtUSD(c.diferencia)}${pendientes ? ` ⚠ (${pendientes} turno${pendientes > 1 ? 's' : ''} con diferencia)` : ' ✓'}`} verde={!pendientes} rojo={!!pendientes} bold />
      </Tarjeta>
      <Tarjeta>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Observaciones del cierre del día <span style={{ color: C.n700, fontWeight: 400 }}>(opcional)</span></span>
        <TextArea value={obs} onChange={setObs} rows={3} placeholder="Ej.: turno de Carlos Mora cerrado con diferencia; pendiente revisión de grabación." />
      </Tarjeta>
      {forzar && <ForzarCierre t={forzar} onClose={() => setForzar(null)} onListo={() => { toast(`Turno de ${forzar.cajero} cerrado de forma forzada.`); setForzar(null); }} />}
      {ver && <Visor titulo="Cierre de turno" sub={ver.cajero} ancho={640} onClose={() => setVer(null)}><TicketTurno t={ver} /></Visor>}
    </PaginaFact>
  );
}

export function ResumenDia({ ir, toast, obs }: P & { obs: string }) {
  const h = useHotel();
  const c = consolidadoDia(h);
  const [ver, setVer] = useState(false);
  const [firmar, setFirmar] = useState(false);
  const ahora = useAhora();
  const conDif = c.filas.filter(f => f.diferencia !== null && Math.abs(f.diferencia) >= 0.01);
  const m = c.metodos;
  const metodos: [string, number | null, number | null, number][] = [
    ['Efectivo USD', null, m.efUSD, m.efUSD], ['Efectivo CRC', m.efCRC, null, m.efCRC / TC], ['Datáfono USD (POS Recepción 1)', null, m.pos1, m.pos1],
    ['Datáfono CRC (POS Recepción 2)', m.pos2, null, m.pos2 / TC], ['Transferencia bancaria', null, m.transf, m.transf], ['Link de pago', null, m.link, m.link],
  ];
  const totUSD = r2(metodos.reduce((s, x) => s + x[3], 0));
  const cerrar = ({ recibidoPor }: { recibidoPor: string }) => {
    const hora = horaReal();
    h.cerrarCaja({ fecha: h.cajaDia.fecha, hora, firmadoPor: h.sesion, recibidoPor, observaciones: obs, turnos: c.turnos.map(t => t.id), ingresos: c.ingresos, egresos: c.egresos, saldoFinal: r2(c.esperado + c.diferencia), diferencia: c.diferencia, nMovs: c.nMovs });
    toast('Caja del día cerrada y enviada a Seven Accounting.');
    ir({ v: 'inicio' });
  };
  return (
    <PaginaFact titulo={`Resumen de cierre · ${fmtF(h.cajaDia.fecha)}`} izquierda={<Volver onClick={() => ir({ v: 'cierreDia', obs })} />}
      pie={<><Button variant="secondary" onClick={() => ir({ v: 'cierreDia', obs })}>Cancelar</Button><Button variant="secondary" onClick={() => setVer(true)}>Vista previa reporte</Button>
        <Button onClick={() => setFirmar(true)} style={{ background: C.error, borderColor: C.error }}>Firmar y cerrar caja del día</Button></>}>
      {conDif.length ? <Banda tono="error"><b>Diferencia de {fmtUSD(c.diferencia)} ({c.diferencia < 0 ? 'faltante' : 'sobrante'}) en {conDif.map(f => `el turno de ${f.t.cajero}`).join(' y ')}.</b> El cierre se registrará con diferencia. Queda documentada en el historial de auditoría.</Banda>
        : <Banda tono="ok"><b>Todos los turnos cuadran.</b> La caja del día no tiene diferencias.</Banda>}
      <Tarjeta titulo="Desglose por cajero">
        <Tabla headers={['Cajero', 'Saldo inicial', 'Cobrado', 'Egresos', 'Saldo esperado', 'Declarado', 'Diferencia']} alinearDerecha={[1, 2, 3, 4, 5, 6]}>
          {c.filas.map(f => (
            <Fila key={f.t.id} style={f.diferencia && Math.abs(f.diferencia) >= 0.01 ? { background: 'rgba(244,67,54,.03)' } : undefined}>
              <Celda style={{ fontWeight: 600 }}>{f.t.cajero}</Celda><Celda derecha>{f.saldoInicial !== null ? fmtUSD(f.saldoInicial) : '—'}</Celda>
              <Celda derecha style={{ color: '#2E7D32' }}>{fmtUSD(f.r.ingresos, true)}</Celda><Celda derecha style={{ color: C.error }}>{fmtUSD(-f.r.egresos)}</Celda>
              <Celda derecha>{fmtUSD(f.esperado)}</Celda><Celda derecha>{fmtUSD(f.declarado ?? f.esperado)}</Celda>
              <Celda derecha><StatusBadge label={fmtUSD(f.diferencia ?? 0)} color={f.diferencia && Math.abs(f.diferencia) >= 0.01 ? 'red' : 'green'} /></Celda>
            </Fila>
          ))}
          <tr style={{ background: '#EEF2FA', fontWeight: 700 }}><td style={{ padding: 10 }}>Total del día</td><td style={{ padding: 10, textAlign: 'right' }}>{fmtUSD(c.saldoInicial)}</td><td style={{ padding: 10, textAlign: 'right' }}>{fmtUSD(c.ingresos, true)}</td>
            <td style={{ padding: 10, textAlign: 'right' }}>{fmtUSD(-c.egresos)}</td><td style={{ padding: 10, textAlign: 'right' }}>{fmtUSD(c.esperado)}</td><td style={{ padding: 10, textAlign: 'right' }}>{fmtUSD(c.declarado)}</td><td style={{ padding: 10, textAlign: 'right' }}>{fmtUSD(c.diferencia)}</td></tr>
        </Tabla>
      </Tarjeta>
      <Tarjeta titulo="Desglose por método de pago">
        <Tabla headers={['Método', 'CRC (₡)', 'USD ($)', 'Total USD']} alinearDerecha={[1, 2, 3]}>
          {metodos.map(([l, crc, usd, tot]) => <Fila key={l}><Celda>{l}</Celda><Celda derecha>{crc === null ? '—' : fmtCRC(crc)}</Celda><Celda derecha>{usd === null ? '—' : fmtUSD(usd)}</Celda><Celda derecha>{fmtUSD(tot)}</Celda></Fila>)}
          <tr style={{ background: '#EEF2FA', fontWeight: 700 }}><td style={{ padding: 10 }}>Total declarado</td><td style={{ padding: 10, textAlign: 'right' }}>{fmtCRC(m.efCRC + m.pos2)}</td><td style={{ padding: 10, textAlign: 'right' }}>{fmtUSD(m.efUSD + m.pos1 + m.transf + m.link)}</td><td style={{ padding: 10, textAlign: 'right' }}>{fmtUSD(totUSD)}</td></tr>
        </Tabla>
        <Linea l="C1 · Diferencia final de la caja del día" v={fmtUSD(c.diferencia)} rojo={Math.abs(c.diferencia) >= 0.01} verde={Math.abs(c.diferencia) < 0.01} bold />
      </Tarjeta>
      {ver && <Visor titulo="Cierre de caja" sub="Vista previa" onClose={() => setVer(false)}><ReporteCierreCaja hora={ahora?.slice(11, 16) ?? ''} /></Visor>}
      {firmar && <FirmaModal titulo="Firma de cierre de caja del día" sub={`${fmtF(h.cajaDia.fecha)} · Cajero Responsable: ${h.sesion}`} firmante={h.sesion} extra="contabilidad" onClose={() => setFirmar(false)} onFirmar={cerrar}
        confirmar="Firmar y cerrar caja del día" peligro
        resumen={<div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <div><div style={{ fontSize: 12, color: C.n700 }}>Caja del día {fmtF(h.cajaDia.fecha)} · {c.turnos.length} turnos · {c.nMovs} movimientos</div><div style={{ fontSize: 13, marginTop: 4 }}>Total operado: {fmtUSD(c.ingresos)} ingresos · {fmtUSD(c.egresos)} egresos</div></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, color: C.n700 }}>Diferencia del día</div><b style={{ color: Math.abs(c.diferencia) >= 0.01 ? C.error : '#2E7D32', fontSize: 16 }}>{fmtUSD(c.diferencia)}</b></div>
        </div>}
        aviso={`Al firmar, declaras la exactitud del cierre. El reporte será enviado a Seven Accounting y notificado a ${ADMIN} (Admin).${conDif.length ? ` La diferencia de ${fmtUSD(c.diferencia)} de ${conDif.map(f => f.t.cajero).join(', ')} queda registrada en auditoría.` : ''}`} />}
    </PaginaFact>
  );
}
