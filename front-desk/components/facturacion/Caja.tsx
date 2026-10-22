'use client';
// Caja: una caja por hotel (se abre y cierra una vez al día) y muchos turnos de
// cajeros dentro de ella. Vistas: caja cerrada · abrir caja/turno con conteo ·
// mis movimientos / cajeros / historial · arqueo → resumen → firma · cierre del día.
import { useState } from 'react';
import { C } from '@/components/suite/tokens';
import { Button, StatusBadge, Toast } from '@/components/suite/ui';
import { exportarCSV, usePrint } from '@/components/hotel/ui';
import { useHotel } from '@/components/hotel/store';
import { HOY, fmtF } from '@/components/hotel/datos';
import { TC, fmtCRC, fmtDuracion, fmtFH, fmtN, fmtUSD, minutosEntre, type Turno } from '@/components/hotel/finanzas';
import { turnoAbiertoDe } from '@/components/hotel/accionesFinanzas';
import { Banda, Bloque, Exportar, Kpi, PaginaFact, Tarjeta, Visor, useAhora } from './comun';
import { duracion, esResponsable, resumenTurno, turnosDelDia } from './caja/calc';
import { ReporteCierreCaja, ReporteMovimientosCajero, TicketTurno } from './caja/Reportes';
import { Candado, Check, PillUsuario, VerComo, sumar, type P, type Vista } from './caja/piezas';
import { Historial, Movimientos } from './caja/Listados';
import { Cajeros } from './caja/Cajeros';
import { AbrirTurno, Arqueo, ResumenCierre, TurnoCerrado } from './caja/Turno';
import { CierreDia, ResumenDia } from './caja/CierreDia';

export default function Caja() {
  const h = useHotel();
  const [vista, setVista] = useState<Vista>({ v: 'inicio' });
  const [toast, setToast] = useState<string | null>(null);
  const ir = (v: Vista) => setVista(v);
  const props = { ir, toast: setToast };
  return (
    <>
      {vista.v === 'inicio' && <Inicio {...props} tabInicial={vista.tab} usuarioInicial={vista.usuario} key={`${h.sesion}-${vista.tab ?? ''}-${vista.usuario ?? ''}`} />}
      {vista.v === 'abrir' && <AbrirTurno {...props} modo={vista.modo} cajero={vista.cajero} />}
      {vista.v === 'arqueo' && <Arqueo {...props} turnoId={vista.turnoId} inicial={vista.decl} obsInicial={vista.obs} desde={vista.desde} />}
      {vista.v === 'resumen' && <ResumenCierre {...props} turnoId={vista.turnoId} decl={vista.decl} obs={vista.obs} desde={vista.desde} />}
      {vista.v === 'turnoCerrado' && <TurnoCerrado {...props} turnoId={vista.turnoId} />}
      {vista.v === 'cierreDia' && <CierreDia {...props} obsInicial={vista.obs} />}
      {vista.v === 'resumenDia' && <ResumenDia {...props} obs={vista.obs} />}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </>
  );
}
function EstadoCaja() {
  const h = useHotel();
  const cd = h.cajaDia;
  const abierta = cd.estado === 'abierta';
  const dia = (iso: string) => (iso.slice(0, 10) === HOY ? `Hoy ${iso.slice(11, 16)}` : iso.slice(0, 10) === sumar(HOY, -1) ? `Ayer ${iso.slice(11, 16)}` : fmtFH(iso));
  return (
    <Tarjeta style={{ flexDirection: 'row', gap: 44, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <Kpi label="Estado"><StatusBadge label={abierta ? '● Caja abierta' : '● Caja cerrada'} color={abierta ? 'green' : 'red'} /></Kpi>
      {abierta ? <>
        <Kpi label="Abierta">{dia(cd.apertura ?? '')}</Kpi><Kpi label="Abierta por">{cd.abiertaPor}</Kpi><Kpi label="Último cierre">{dia(cd.ultimoCierre)}</Kpi>
      </> : <>
        <Kpi label="Última apertura">{dia(cd.ultimaApertura)}</Kpi><Kpi label="Último cierre">{dia(cd.ultimoCierre)}</Kpi><Kpi label="Cerrada por">{cd.cerradaPor}</Kpi>
      </>}
    </Tarjeta>
  );
}
// ── Inicio ──────────────────────────────────────────────────────────────────
function Inicio({ ir, toast, tabInicial, usuarioInicial }: P & { tabInicial?: string; usuarioInicial?: string }) {
  const h = useHotel();
  const ahora = useAhora();
  const resp = esResponsable(h.sesion);
  const miTurno = turnoAbiertoDe(h, h.sesion);
  const { imprimir, portal } = usePrint();
  const [precierre, setPrecierre] = useState<Turno | null>(null);
  const [verCierre, setVerCierre] = useState(false);
  const tabs = resp ? ['Cajeros', 'Movimientos del día', 'Historial de turnos'] as const : ['Mis movimientos del día', 'Mis turnos anteriores'] as const;
  type Tab = (typeof tabs)[number];
  const [tab, setTab] = useState<Tab>((tabs as readonly string[]).includes(tabInicial ?? '') ? tabInicial as Tab : resp ? 'Cajeros' as Tab : tabs[0]);
  const cerrada = h.cajaDia.estado === 'cerrada';
  const turnosHoy = turnosDelDia(h);
  const exportarHist = () => exportarCSV('historial-turnos', ['Cajero', 'Fecha de inicio', 'Fecha de finalización', 'Duración', 'Saldo inicial', 'Ingresos', 'Egresos', 'Saldo final', 'Diferencia'],
    h.turnos.filter(t => resp || t.cajero === h.sesion).map(t => { const r = resumenTurno(h, t); return [t.cajero, fmtFH(t.inicio), fmtFH(t.fin), fmtDuracion(duracion(t, ahora)), t.saldoInicial, r.ingresos, r.egresos, t.declarado ?? r.esperado, t.diferencia]; }));
  const titulo = cerrada ? 'Caja' : miTurno || !resp ? (tab === 'Cajeros' ? 'Cajeros' : tab.startsWith('Historial') || tab === 'Mis turnos anteriores' ? (resp ? 'Historial de turnos' : 'Mis turnos anteriores') : 'Mis movimientos') : tab;

  const acciones = cerrada ? (resp ? <Button onClick={() => ir({ v: 'abrir', modo: 'caja', cajero: h.sesion })} style={{ background: C.success, borderColor: C.success }}>Abrir caja</Button> : null) : <>
    {tab === 'Cajeros' && <Exportar onCSV={exportarHist} onPDF={() => imprimir(<ReporteMovimientosCajero turnos={turnosHoy} />)} titulo="Movimientos por cajero" />}
    {miTurno && <Button variant="secondary" onClick={() => { h.precierre(miTurno.id); setPrecierre(miTurno); }}>Precierre</Button>}
    {miTurno && <Button onClick={() => ir({ v: 'arqueo', turnoId: miTurno.id })} style={resp ? undefined : { background: C.error, borderColor: C.error }}>Cerrar turno</Button>}
    {resp && <Button onClick={() => ir({ v: 'cierreDia' })} style={{ background: C.error, borderColor: C.error }}>Cerrar caja</Button>}
  </>;

  return (
    <PaginaFact titulo={titulo} izquierda={<span style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}><PillUsuario /><VerComo />
</span>} acciones={acciones} conRanuras
      tabs={cerrada ? undefined : { items: tabs, activo: tab, onChange: (t: Tab) => setTab(t),
        // Estado de la caja a la derecha de las pestañas: no ocupa una barra propia
        derecha: <span title={resp ? 'Ves todos los cajeros' : 'Ves solo tus turnos y movimientos'} style={{ fontSize: 12, color: C.n700, whiteSpace: 'nowrap' }}>
          Abierta por <b style={{ color: C.n900, fontWeight: 500 }}>{h.cajaDia.abiertaPor}</b> · desde las {h.cajaDia.apertura?.slice(11, 16) ?? '—'}{resp ? ` · ${turnosHoy.filter(t => !t.fin).length} turnos abiertos` : ''}
        </span> }}
>
      {cerrada ? <>
        <EstadoCaja />
        {h.cajaDia.folioCierre && h.cierres.at(-1)?.fecha === HOY ? <>{!resp && <Banda tono="warn">La caja del día está cerrada. Solo un Cajero Responsable puede abrir la caja del día.</Banda>}<CajaCerradaHoy onVer={() => setVerCierre(true)} onImprimir={() => imprimir(<ReporteCierreCaja cierre={h.cierres.at(-1)} hora={h.cierres.at(-1)!.hora} />)} /></> : (
          <>
            {!resp && <Banda tono="warn">La caja del día aún no ha sido abierta. Solo un Cajero Responsable puede abrir la caja del día.</Banda>}
            {!resp && <Tarjeta style={{ alignItems: 'center', textAlign: 'center', padding: '56px 20px', gap: 10 }}>
              <Candado />
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Caja cerrada</h2>
              <p style={{ margin: 0, maxWidth: 540, color: C.n700, fontSize: 13, lineHeight: 1.6 }}>No puedes registrar cobros ni abrir un turno hasta que un responsable abra la caja del día. Mientras tanto, puedes consultar tus turnos anteriores.</p>
              <Button variant="secondary" onClick={() => setTab('Mis turnos anteriores' as Tab)}>Ver mis turnos anteriores</Button>
            </Tarjeta>}
          </>
        )}
        {(!resp && tab === 'Mis turnos anteriores') && <Tarjeta><Historial soloDe={h.sesion} /></Tarjeta>}
        {resp && <Tarjeta titulo="Historial de turnos"><Historial /></Tarjeta>}
      </> : <>
        {miTurno ? <ResumenTurnoAbierto t={miTurno} ahora={ahora} /> : (
          <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>No tienes un turno abierto</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: C.n700 }}>La caja del día está abierta desde las {h.cajaDia.apertura?.slice(11, 16)} ({h.cajaDia.abiertaPor}). Abre tu turno declarando el efectivo que recibes.</p>
            </div>
            <Button onClick={() => ir({ v: 'abrir', modo: 'turno', cajero: h.sesion })}>Abrir mi turno</Button>
          </Tarjeta>
        )}
        <Tarjeta style={{ gap: 16 }}>
          {tab === 'Cajeros' && <Cajeros ir={ir} toast={toast} ahora={ahora} onVerMovs={u => ir({ v: 'inicio', tab: 'Movimientos del día', usuario: u })} onVerHist={u => ir({ v: 'inicio', tab: 'Historial de turnos', usuario: u })} />}
          {(tab === 'Movimientos del día' || tab === 'Mis movimientos del día') && <Movimientos todos={resp} usuarioInicial={usuarioInicial} />}
          {(tab === 'Historial de turnos' || tab === 'Mis turnos anteriores') && <Historial soloDe={resp ? undefined : h.sesion} usuarioInicial={usuarioInicial} />}
        </Tarjeta>
      </>}
      {precierre && <Visor titulo="Precierre de turno" sub={precierre.cajero} ancho={640} onClose={() => { h.precierre(precierre.id, true); setPrecierre(null); toast('Precierre generado. El turno sigue abierto.'); }}><TicketTurno t={precierre} precierre ahora={ahora} /></Visor>}
      {verCierre && h.cierres.at(-1) && <Visor titulo="Cierre de caja" sub={h.cierres.at(-1)!.folio} onClose={() => setVerCierre(false)}><ReporteCierreCaja cierre={h.cierres.at(-1)} hora={h.cierres.at(-1)!.hora} /></Visor>}
      {portal}
    </PaginaFact>
  );
}
function CajaCerradaHoy({ onVer, onImprimir }: { onVer: () => void; onImprimir: () => void }) {
  const h = useHotel();
  const c = h.cierres.at(-1)!;
  const conDif = h.turnos.filter(t => c.turnos.includes(t.id) && Math.abs(t.diferencia) >= 0.01);
  return <>
    <Tarjeta style={{ alignItems: 'center', textAlign: 'center', padding: '40px 20px', gap: 10 }}>
      <Check />
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Caja cerrada</h2>
      <p style={{ margin: 0, maxWidth: 560, color: C.n700, fontSize: 13, lineHeight: 1.6 }}>El cierre fue firmado por <b>{c.firmadoPor}</b> a las {c.hora}. El reporte fue enviado a Seven Accounting y archivado con folio <b>{c.folio}</b>.</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}><Button variant="secondary" onClick={onVer}>Ver reporte de cierre</Button><Button variant="secondary" onClick={onImprimir}>Imprimir</Button></div>
      <p style={{ margin: 0, fontSize: 11.5, color: C.n700 }}>Para el siguiente día, el Cajero Responsable abre la caja con «Abrir caja».</p>
    </Tarjeta>
    <Tarjeta titulo={`Resumen de la caja del día ${fmtF(c.fecha)}`}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 12 }}>
        <Bloque label="Cajeros" valor={`${c.turnos.length} turnos`} sub={`${c.nMovs} movimientos totales`} />
        <Bloque label="Total ingresos" valor={fmtUSD(c.ingresos, true)} color="#2E7D32" />
        <Bloque label="Total egresos" valor={fmtUSD(-c.egresos)} color={C.error} />
        <Bloque label="Saldo final" valor={fmtUSD(c.saldoFinal)} color={C.brand} />
        <Bloque label="Diferencia registrada" valor={fmtUSD(c.diferencia)} color={Math.abs(c.diferencia) >= 0.01 ? C.error : '#2E7D32'} fondo={Math.abs(c.diferencia) >= 0.01 ? 'rgba(244,67,54,.05)' : 'rgba(76,175,80,.06)'}
          sub={conDif.length ? `${conDif.map(t => t.cajero).join(', ')} · En auditoría` : 'Sin diferencias'} />
      </div>
    </Tarjeta>
  </>;
}

function ResumenTurnoAbierto({ t, ahora }: { t: Turno; ahora: string | null }) {
  const h = useHotel();
  const r = resumenTurno(h, t);
  const crcUSD = r.efectivoCRC / TC;
  const total = r.efectivoUSD + crcUSD + r.tarjetas + r.transf || 1;
  const pct = (v: number) => `${fmtN((v / total) * 100, 1)}%`;
  return (
    <Tarjeta style={{ gap: 12, padding: '14px 16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', rowGap: 12, alignItems: 'start' }} className="kpis-separados">
        <Kpi label="Estado"><StatusBadge label={t.precierre ? '● En precierre' : '● Turno abierto'} color={t.precierre ? 'yellow' : 'green'} /></Kpi>
        <Kpi label="Abierta hace">{ahora ? fmtDuracion(minutosEntre(t.inicio, ahora)) : '—'}</Kpi>
        <Kpi label="Saldo inicial">{fmtUSD(t.saldoInicial)}</Kpi>
        <Kpi label="Total operado" color="#2E7D32">{fmtUSD(r.ingresos, true)}</Kpi>
        <Kpi label="Egresos" color={C.error}>{fmtUSD(-r.egresos)}</Kpi>
        <Kpi label="En caja ahora" color={C.brand}>{fmtUSD(r.esperado)}</Kpi>
        <Kpi label="Tipo de cambio">{fmtCRC(TC)}</Kpi>
      </div>
      <div style={{ borderTop: `1px solid ${C.n500}`, paddingTop: 10, paddingLeft: 16, display: 'flex', flexWrap: 'wrap', gap: '6px 28px', fontSize: 12, color: C.n700 }}>
        {([['Efectivo USD', fmtUSD(r.efectivoUSD), pct(r.efectivoUSD)], ['Efectivo CRC', fmtCRC(r.efectivoCRC), `≈ ${fmtUSD(crcUSD)} · ${pct(crcUSD)}`], ['Tarjetas', fmtUSD(r.tarjetas), pct(r.tarjetas)], ['Transferencias / Link', fmtUSD(r.transf), pct(r.transf)]] as const).map(([l, v, sub]) => (
          <span key={l} style={{ whiteSpace: 'nowrap' }}>{l} <b style={{ color: C.n900, fontWeight: 600, marginLeft: 4 }}>{v}</b> <span style={{ fontSize: 11.5 }}>· {sub}</span></span>
        ))}
      </div>
    </Tarjeta>
  );
}
