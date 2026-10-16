'use client';
import { useState } from 'react';
import { C, FONT, fmtNum, radius, SIZE } from '@/components/suite/tokens';
import { Button, Modal, Toast } from '@/components/suite/ui';
import { Pantalla } from '@/components/layout/Pantalla';
import { useHotel } from '@/components/hotel/store';
import { HOY, NACIONALIDADES, fmtF, sumarDias } from '@/components/hotel/datos';
import { BotonExportar, HojaReporte, MenuBoton, TablaImpresa, exportarCSV, money, usePrint } from '@/components/hotel/ui';
import { NuevaReservaModal } from '@/components/hospedaje/NuevaReserva';
import { useEmpresa } from '@/components/layout/Shell';
import { REPORTES_RAPIDOS, diasDisponibilidad, diasIngresos, exportFinanciero, exportOperativo, metricas, noche, rango, type RangoSel, type ReporteRapido } from './datos';
import { Ext } from './piezas';
import { Operativo } from './Operativo';
import { Financiero } from './Financiero';

/** «Día actual: dd/mm/aaaa ⌄» del header: abre el calendario y mueve todo el tablero. */
function DiaActual({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ position: 'relative', height: SIZE.control, padding: '0 10px', border: `1px solid ${C.n500}`, borderRadius: radius.control, background: C.n000,
      display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontFamily: FONT, color: C.n900, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      <span style={{ color: C.n700 }}>Día actual:</span>{fmtF(value)}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.n700} strokeWidth={2} aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      <input type="date" value={value} aria-label="Día actual" onChange={e => onChange(e.target.value || HOY)}
        onClick={e => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
    </label>
  );
}

export default function Dashboard() {
  const h = useHotel();
  const [tab, setTab] = useState<'Operativo' | 'Financiero'>('Operativo');
  const [dia, setDia] = useState(HOY);
  const [rDisp, setRDisp] = useState<RangoSel>({ r: '7D', desde: HOY, hasta: sumarDias(HOY, 6) });
  const [rIng, setRIng] = useState<RangoSel>({ r: '7D', desde: sumarDias(HOY, -7), hasta: HOY });
  const [reserva, setReserva] = useState(false);
  const [reporte, setReporte] = useState<ReporteRapido | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { imprimir, portal } = usePrint();
  const empresa = useEmpresa();
  const diasDisp = diasDisponibilidad(dia, rDisp);
  const diasIng = diasIngresos(dia, rIng);

  const exportar = (pdf: boolean) => {
    const { titulo, secciones } = tab === 'Financiero' ? exportFinanciero(h, dia, diasIng) : exportOperativo(h, dia, diasDisp);
    const criterio = `Día actual: ${fmtF(dia)}`;
    if (pdf) imprimir(<HojaReporte titulo={titulo} filtros={criterio}>{secciones.map(sx => <div key={sx.titulo} style={{ marginBottom: 14 }}><h3 style={{ fontSize: 13, margin: '0 0 6px' }}>{sx.titulo}</h3><TablaImpresa headers={sx.headers} filas={sx.filas} derecha={sx.headers.map((_, k) => k).slice(1)} /></div>)}</HojaReporte>);
    else exportarCSV(`dashboard-${tab.toLowerCase()}`, ['Sección', 'Concepto', 'Valor', ''], secciones.flatMap(sx => [[sx.titulo, ...sx.headers], ...sx.filas.map(f => ['', ...f])]));
  };

  return (
    <Pantalla titulo={<>¡Te damos la bienvenida <b style={{ fontWeight: 600 }}>{empresa}</b>!</>}
      izquierda={<DiaActual value={dia} onChange={setDia} />}
      acciones={<>
        <Button variant="secondary" onClick={() => setReserva(true)}>Nueva reserva</Button>
        <Button variant="secondary" onClick={() => window.open('/reservaciones/planificador', '_blank', 'noopener')}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Planificador <Ext /></span></Button>
        <MenuBoton label="Reportes" variant="primary" ancho={260} opciones={[
          ...REPORTES_RAPIDOS.map(r => ({ label: r, onClick: () => setReporte(r) })),
          { label: `Exportar ${tab.toLowerCase()} (Excel)`, onClick: () => exportar(false) },
          { label: `Exportar ${tab.toLowerCase()} (PDF)`, onClick: () => exportar(true) },
        ]} />
      </>}
      tabs={{ items: ['Operativo', 'Financiero'] as const, activo: tab, onChange: setTab }}>
      {tab === 'Operativo'
        ? <Operativo dia={dia} dias={diasDisp} rango={rDisp} onRango={setRDisp} />
        : <Financiero dia={dia} dias={diasIng} rango={rIng} onRango={setRIng} />}
      {reserva && <NuevaReservaModal onClose={() => setReserva(false)} onListo={t => { setReserva(false); setToast(t); }} />}
      {reporte && <VistaReporte nombre={reporte} onClose={() => setReporte(null)} />}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </Pantalla>
  );
}

// ── Reportes rápidos ────────────────────────────────────────────────────────
function VistaReporte({ nombre, onClose }: { nombre: ReporteRapido; onClose: () => void }) {
  const h = useHotel();
  const { imprimir, portal } = usePrint();
  let cab: string[] = [], filas: (string | number)[][] = [], derecha: number[] = [], titulo = nombre as string, resumen = '';
  if (nombre === 'Informe Diario') {
    const dias = rango(sumarDias(HOY, -4), HOY);
    const ms = dias.map(d => metricas(h, d));
    titulo = 'Informe Diario de Ingresos para la Gerencia';
    cab = ['Concepto', ...dias.map(d => fmtF(d))];
    derecha = dias.map((_, i) => i + 1);
    filas = [
      ['Total de habitaciones', ...ms.map(m => m.total)], ['Habitaciones ocupadas', ...ms.map(m => m.ocupadas)], ['Habitaciones bloqueadas', ...ms.map(m => m.bloqueadas)],
      ['Porcentaje de ocupación', ...ms.map(m => `${fmtNum(m.ocupacion * 100)} %`)], ['ADR', ...ms.map(m => money(m.adr))], ['RevPAR', ...ms.map(m => money(m.revpar))], ['RevPOR', ...ms.map(m => money(m.revpor))],
      ['Ingresos de habitaciones', ...ms.map(m => money(m.ingresos))], ['Número de personas', ...ms.map(m => m.personas)],
      ['Ingresos acumulados', ...ms.map((_, i) => money(ms.slice(0, i + 1).reduce((s, m) => s + m.ingresos, 0)))],
    ];
  } else if (nombre === 'Estado de Habitaciones') {
    cab = ['Hab.', 'Tipo', 'Estado', 'Limpieza', 'Pax', 'Huésped'];
    filas = h.habitaciones.map(x => { const r = h.reservas.find(y => y.id === x.reservaId); return [x.numero, x.tipo, { libre: 'Libre', ocupada: 'Ocupada', bloqueada: 'Bloqueada', checkin: 'Check-in', checkinRL: 'Check-in RL', checkout: 'Check-out' }[x.estado], x.sucia ? 'Sucia' : 'Limpia', r ? r.adultos + r.ninos : 0, r?.nombre ?? (x.estado === 'bloqueada' ? x.motivoBloqueo : '')]; });
    resumen = `Total: ${h.habitaciones.length} · Ocupadas: ${h.habitaciones.filter(x => x.reservaId).length} · Libres limpias: ${h.habitaciones.filter(x => !x.reservaId && x.estado !== 'bloqueada' && !x.sucia).length} · Libres sucias: ${h.habitaciones.filter(x => !x.reservaId && x.estado !== 'bloqueada' && x.sucia).length} · Fuera de orden: ${h.habitaciones.filter(x => x.estado === 'bloqueada').length}`;
  } else if (nombre === 'Ocupación por Nacionalidades') {
    const rs = noche(h.reservas, HOY);
    const nacs = [...new Set(rs.map(r => r.nacionalidad))].sort();
    cab = ['Nacionalidad', 'Habitaciones', 'Adultos', 'Niños', 'Total huéspedes', '%'];
    derecha = [1, 2, 3, 4, 5];
    const tot = rs.reduce((s, r) => s + r.adultos + r.ninos, 0) || 1;
    filas = nacs.map(n => { const xs = rs.filter(r => r.nacionalidad === n); const p = xs.reduce((s, r) => s + r.adultos + r.ninos, 0); return [`${n} · ${NACIONALIDADES[n] ?? ''}`, xs.length, xs.reduce((s, r) => s + r.adultos, 0), xs.reduce((s, r) => s + r.ninos, 0), p, `${fmtNum((p / tot) * 100, 1)} %`]; });
  } else if (nombre === 'Mano corriente de Hoy') {
    titulo = 'Transacciones Diarias';
    cab = ['Caja', 'Hora', 'Concepto', 'Monto'];
    derecha = [3];
    filas = h.cajas.flatMap(c => c.movimientos.map(m => [c.nombre, m.hora, m.concepto, money(m.monto)])).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
    resumen = `Total del día: ${money(h.cajas.reduce((s, c) => s + c.movimientos.reduce((a, m) => a + m.monto, 0), 0))}`;
  } else if (nombre === 'Caja del Día') {
    titulo = 'Listado de Operaciones de Caja';
    cab = ['Caja', 'Estado', 'Apertura', 'Usuario en turno', 'Fondo inicial', 'Total recibido', 'Movimientos'];
    derecha = [4, 5, 6];
    filas = h.cajas.map(c => [c.nombre, c.estado, `${fmtF(c.apertura.slice(0, 10))} ${c.apertura.slice(11)}`, c.cajero, money(c.fondo), money(c.movimientos.reduce((s, m) => s + m.monto, 0)), c.movimientos.length]);
  } else {
    titulo = 'Histórico de Folios';
    const fol = h.reservas.filter(r => r.checkoutEn === HOY);
    cab = ['Documento', 'Folio', 'Cliente', 'Habitación', 'Importe', 'Depositado', 'Imp. neto'];
    derecha = [4, 5, 6];
    filas = fol.map((r, i) => { const tot = r.precio * Math.max(1, (new Date(r.salida).getTime() - new Date(r.entrada).getTime()) / 86400000); return [`FE-${String(4500 + i).padStart(6, '0')}`, r.numero, r.nombre, r.habitacion, money(tot), money(r.depGarantia), money(tot - r.depGarantia)]; });
    resumen = fol.length ? `Total facturado: ${money(fol.reduce((s, r) => s + r.precio * Math.max(1, (new Date(r.salida).getTime() - new Date(r.entrada).getTime()) / 86400000), 0))}` : 'No se han cerrado folios hoy.';
  }
  return (
    <Modal open onClose={onClose} title={titulo} width={900}
      footer={<><BotonExportar titulo={titulo} onPDF={() => imprimir(<HojaReporte titulo={titulo} resumen={resumen || undefined}><TablaImpresa headers={cab} filas={filas} derecha={derecha} /></HojaReporte>)} onCSV={() => exportarCSV(titulo.toLowerCase().replace(/\s+/g, '-'), cab, filas)} />
        <Button variant="secondary" onClick={() => imprimir(<HojaReporte titulo={titulo} resumen={resumen || undefined}><TablaImpresa headers={cab} filas={filas} derecha={derecha} /></HojaReporte>)}>Imprimir</Button><Button variant="secondary" onClick={onClose}>Cerrar</Button></>}>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: C.n700 }}>Fecha hotelera: {fmtF(HOY)}</p>
      <div style={{ overflowX: 'auto', border: `1px solid ${C.n500}`, borderRadius: radius.md }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr>{cab.map((c, i) => <th key={i} style={{ textAlign: derecha.includes(i) ? 'right' : 'left', fontWeight: 400, color: C.n700, padding: '8px', background: C.n200, whiteSpace: 'nowrap' }}>{c}</th>)}</tr></thead>
          <tbody>
            {filas.length === 0 && <tr><td colSpan={cab.length} style={{ padding: 20, textAlign: 'center', color: C.n700 }}>Sin datos para hoy.</td></tr>}
            {filas.map((f, i) => <tr key={i} style={{ borderTop: `1px solid ${C.n500}` }}>{f.map((c, j) => <td key={j} style={{ padding: '7px 8px', textAlign: derecha.includes(j) ? 'right' : 'left', fontWeight: j === 0 ? 500 : 400 }}>{c}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      {resumen && <p style={{ margin: '10px 0 0', fontSize: 12 }}>{resumen}</p>}
      {portal}
    </Modal>
  );
}
