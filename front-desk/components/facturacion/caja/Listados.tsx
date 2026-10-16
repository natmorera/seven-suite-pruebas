'use client';
// Caja: movimientos del día e historial de turnos (todos los cajeros para el responsable; los propios para el cajero).
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { C, radius } from '@/components/suite/tokens';
import { StatusBadge } from '@/components/suite/ui';
import { Celda, Fila, FilaVacia, Paginacion, Tabla, usePaginado } from '@/components/configuracion/kit';
import { FechaBoton, exportarCSV, usePrint } from '@/components/hotel/ui';
import { useHotel } from '@/components/hotel/store';
import { HOY, fmtF } from '@/components/hotel/datos';
import { CAJEROS, RESPONSABLE, TC, fmtDuracion, fmtFH, fmtN, fmtUSD, r2, type Turno } from '@/components/hotel/finanzas';
import { Exportar, FiltroUno, HojaSistema, TablaReporte, Visor, tdR, useAhora } from '../comun';
import { AccionesEnHeader, FiltrosEnBarra } from '@/components/layout/Pantalla';
import { duracion, resumenTurno } from './calc';
import { TicketTurno } from './Reportes';
import { hrefReferencia } from './piezas';

export function Movimientos({ todos, usuarioInicial }: { todos: boolean; usuarioInicial?: string }) {
  const h = useHotel();
  const [fecha, setFecha] = useState(HOY);
  const [tipo, setTipo] = useState('');
  const [usuario, setUsuario] = useState(usuarioInicial ?? '');
  const [moneda, setMoneda] = useState('');
  const filas = useMemo(() => h.movsCaja.filter(m => (todos || m.usuario === h.sesion) && (!fecha || m.fecha === fecha) && (!tipo || m.tipo === tipo) && (!usuario || m.usuario === usuario) && (!moneda || m.moneda === moneda))
    .sort((a, b) => b.hora.localeCompare(a.hora)), [h.movsCaja, h.sesion, todos, fecha, tipo, usuario, moneda]);
  const pag = usePaginado(filas, 12);
  const neto = (k: 'usd' | 'crc') => r2(filas.reduce((s, m) => s + (m.tipo === 'Egreso' ? -1 : 1) * (k === 'usd' ? m.usd : m.usd * TC), 0));
  const headers = ['Hora', 'Concepto', 'Referencia', 'Cliente / Habitación', 'Método de pago', 'Moneda', 'Importe', 'USD', 'Tipo', ...(todos ? ['Usuario', 'Responsable'] : [])];
  const { imprimir, portal } = usePrint();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FiltrosEnBarra>
        <FechaBoton label="Fecha" value={fecha} onChange={setFecha} />
        <FiltroUno label="Tipo" value={tipo} onChange={setTipo} opciones={[{ value: 'Ingreso', label: 'Ingreso' }, { value: 'Egreso', label: 'Egreso' }]} />
        {todos && <FiltroUno label="Usuario" value={usuario} onChange={setUsuario} opciones={CAJEROS.filter(c => c.rol !== 'Administrador').map(c => ({ value: c.nombre, label: c.nombre }))} />}
        <FiltroUno label="Moneda" value={moneda} onChange={setMoneda} opciones={[{ value: 'USD', label: 'USD' }, { value: 'CRC', label: 'CRC' }, { value: 'EUR', label: 'EUR' }]} todos="Todas" />
      </FiltrosEnBarra>
      <AccionesEnHeader>
        <Exportar disabled={!filas.length} titulo={todos ? 'Movimientos del día' : 'Mis movimientos del día'} criterio={`Fecha: ${fecha ? fmtF(fecha) : 'Todas'} · Tipo: ${tipo || 'Todos'} · Usuario: ${usuario || 'Todos'} · Moneda: ${moneda || 'Todas'}`}
          onCSV={() => exportarCSV('movimientos-caja', ['Fecha', 'Hora', 'Concepto', 'Referencia', 'Cliente / Habitación', 'Método de pago', 'Moneda', 'Importe', 'USD', 'Tipo', 'Usuario'], filas.map(m => [fmtF(m.fecha), m.hora, m.concepto, m.referencia, m.cliente, m.metodo, m.moneda, m.importe, m.usd, m.tipo, m.usuario]))}
          onPDF={() => imprimir(<HojaSistema titulo={todos ? 'Movimientos del día' : 'Mis movimientos del día'} subtitulo={`${filas.length} movimientos`}><TablaReporte headers={['Hora', 'Concepto', 'Referencia', 'Cliente', 'Método', 'Moneda', 'USD', 'Tipo', 'Usuario']} derecha={[6]}>
            {filas.map(m => <tr key={m.id}><td style={tdR()}>{m.hora}</td><td style={tdR()}>{m.concepto}</td><td style={tdR()}>{m.referencia}</td><td style={tdR()}>{m.cliente || '-'}</td><td style={tdR()}>{m.metodo}</td><td style={tdR()}>{m.moneda}</td><td style={tdR(true)}>{fmtN(m.usd)}</td><td style={tdR()}>{m.tipo}</td><td style={tdR()}>{m.usuario}</td></tr>)}
          </TablaReporte></HojaSistema>)} />
        {portal}
      </AccionesEnHeader>
      <Tabla headers={headers} alinearDerecha={[6, 7]} minWidth={todos ? 1320 : 1040}>
        {pag.visibles.length === 0 && <FilaVacia cols={headers.length} texto="No hay movimientos para los filtros seleccionados." />}
        {pag.visibles.map(m => {
          const href = hrefReferencia(m.referencia);
          return (
            <Fila key={m.id}>
              <Celda>{m.hora}</Celda>
              <Celda style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.concepto}</Celda>
              <Celda style={{ whiteSpace: 'nowrap' }}>{href ? <Link href={href} style={{ color: C.brand, fontWeight: 500 }}>{m.referencia}</Link> : m.referencia}</Celda>
              <Celda>{m.cliente || '-'}</Celda>
              <Celda>{m.metodo === 'Tarjeta' ? 'Tarjeta de crédito / débito' : m.metodo}</Celda>
              <Celda>{m.moneda}</Celda>
              <Celda derecha style={{ whiteSpace: 'nowrap' }}>₡ {fmtN(m.usd * TC)}</Celda>
              <Celda derecha style={{ whiteSpace: 'nowrap' }}>$ {fmtN(m.usd)}</Celda>
              <Celda><StatusBadge label={m.tipo} color={m.tipo === 'Ingreso' ? 'green' : 'red'} /></Celda>
              {todos && <Celda style={{ whiteSpace: 'nowrap' }}>{m.usuario}</Celda>}
              {todos && <Celda style={{ whiteSpace: 'nowrap' }}>{h.cajaDia.abiertaPor || RESPONSABLE}</Celda>}
            </Fila>
          );
        })}
      </Tabla>
      {filas.length > 12 && <Paginacion pagina={pag.pagina} total={pag.total} onChange={pag.setPagina} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, background: C.n200, borderRadius: radius.md, padding: '12px 14px', fontSize: 13 }}>
        <b style={{ fontWeight: 600 }}>Total {todos ? 'del día' : 'del turno'} (hasta ahora)</b><span style={{ color: C.n700 }}>{filas.length} movimientos</span>
        <span style={{ marginLeft: 'auto' }}>₡ {fmtN(neto('crc'))}</span><span style={{ minWidth: 110, textAlign: 'right' }}>$ {fmtN(neto('usd'))}</span>
      </div>
    </div>
  );
}

// ── Historial de turnos ─────────────────────────────────────────────────────
export function Historial({ soloDe, usuarioInicial }: { soloDe?: string; usuarioInicial?: string }) {
  const h = useHotel();
  const ahora = useAhora();
  const [usuario, setUsuario] = useState(usuarioInicial ?? '');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [ver, setVer] = useState<Turno | null>(null);
  const filas = useMemo(() => h.turnos.filter(t => (!soloDe || t.cajero === soloDe) && (!usuario || t.cajero === usuario) && (!desde || t.inicio.slice(0, 10) >= desde) && (!hasta || (t.fin ?? HOY).slice(0, 10) <= hasta))
    .sort((a, b) => b.inicio.localeCompare(a.inicio)), [h.turnos, soloDe, usuario, desde, hasta]);
  const pag = usePaginado(filas, 10);
  const headers = ['Fecha de inicio', ...(soloDe ? [] : ['Usuario']), 'Fecha de finalización', 'Duración', 'Saldo inicial', 'Ingresos', 'Egresos', 'Saldo final', 'Diferencia'];
  const off = soloDe ? 0 : 1;
  const { imprimir, portal } = usePrint();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FiltrosEnBarra>
        {!soloDe && <FiltroUno label="Usuario" value={usuario} onChange={setUsuario} opciones={CAJEROS.filter(c => c.rol !== 'Administrador').map(c => ({ value: c.nombre, label: c.nombre }))} />}
        <FechaBoton label="Fecha de inicio" value={desde} onChange={setDesde} />
        <FechaBoton label="Fecha de finalización" value={hasta} onChange={setHasta} />
      </FiltrosEnBarra>
      <AccionesEnHeader>
        <Exportar disabled={!filas.length} titulo={soloDe ? 'Mis turnos anteriores' : 'Historial de turnos'} criterio={`Usuario: ${soloDe ?? (usuario || 'Todos')} · Desde: ${desde ? fmtF(desde) : '…'} · Hasta: ${hasta ? fmtF(hasta) : '…'}`}
          onCSV={() => exportarCSV('historial-turnos', ['Cajero', 'Fecha de inicio', 'Fecha de finalización', 'Duración', 'Saldo inicial', 'Ingresos', 'Egresos', 'Saldo final', 'Diferencia'], filas.map(t => { const r = resumenTurno(h, t); return [t.cajero, fmtFH(t.inicio), fmtFH(t.fin), fmtDuracion(duracion(t, ahora)), t.saldoInicial, r.ingresos, r.egresos, t.declarado ?? r.esperado, t.diferencia]; }))}
          onPDF={() => imprimir(<HojaSistema titulo={soloDe ? 'Mis turnos anteriores' : 'Historial de turnos'} subtitulo={`${filas.length} turnos`}><TablaReporte headers={['Cajero', 'Inicio', 'Fin', 'Duración', 'Saldo inicial', 'Ingresos', 'Egresos', 'Saldo final', 'Diferencia']} derecha={[4, 5, 6, 7, 8]}>
            {filas.map(t => { const r = resumenTurno(h, t); return <tr key={t.id}><td style={tdR()}>{t.cajero}</td><td style={tdR()}>{fmtFH(t.inicio)}</td><td style={tdR()}>{t.fin ? fmtFH(t.fin) : 'Abierto'}</td><td style={tdR()}>{fmtDuracion(duracion(t, ahora))}</td><td style={tdR(true)}>{fmtN(t.saldoInicial)}</td><td style={tdR(true)}>{fmtN(r.ingresos)}</td><td style={tdR(true)}>{fmtN(r.egresos)}</td><td style={tdR(true)}>{fmtN(t.declarado ?? r.esperado)}</td><td style={tdR(true)}>{fmtN(t.diferencia)}</td></tr>; })}
          </TablaReporte></HojaSistema>)} />
        {portal}
      </AccionesEnHeader>
      <Tabla headers={headers} alinearDerecha={[3 + off, 4 + off, 5 + off, 6 + off, 7 + off]} minWidth={960}>
        {pag.visibles.length === 0 && <FilaVacia cols={headers.length} texto="No hay turnos para los filtros seleccionados." />}
        {pag.visibles.map(t => {
          const r = resumenTurno(h, t);
          return (
            <Fila key={t.id} onClick={() => setVer(t)}>
              <Celda>{fmtFH(t.inicio)}</Celda>
              {!soloDe && <Celda>{t.cajero}</Celda>}
              <Celda>{t.fin ? fmtFH(t.fin) : <StatusBadge label="Abierto" color="green" />}</Celda>
              <Celda>{fmtDuracion(duracion(t, ahora))}</Celda>
              <Celda derecha>$ {fmtN(t.saldoInicial)}</Celda>
              <Celda derecha style={{ color: '#2E7D32' }}>+ $ {fmtN(r.ingresos)}</Celda>
              <Celda derecha style={{ color: C.error }}>- $ {fmtN(r.egresos)}</Celda>
              <Celda derecha>$ {fmtN(t.fin ? t.declarado ?? r.esperado : r.esperado)}</Celda>
              <Celda derecha style={{ color: t.diferencia < -0.005 ? C.error : t.diferencia > 0.005 ? '#2E7D32' : undefined, fontWeight: Math.abs(t.diferencia) >= 0.01 ? 600 : 400 }}>{fmtUSD(t.diferencia)}{t.forzado ? ' ·F' : ''}</Celda>
            </Fila>
          );
        })}
      </Tabla>
      {filas.length > 10 && <Paginacion pagina={pag.pagina} total={pag.total} onChange={pag.setPagina} />}
      {ver && <Visor titulo={ver.fin ? 'Cierre de turno' : 'Precierre de turno'} sub={ver.cajero} ancho={640} onClose={() => setVer(null)}><TicketTurno t={ver} precierre={!ver.fin} ahora={ahora} /></Visor>}
    </div>
  );
}
