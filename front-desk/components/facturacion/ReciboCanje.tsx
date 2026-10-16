'use client';
// Canje de divisas: recibo de dos copias y tarjeta de registro impresa.
import { useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Checkbox } from '@/components/suite/ui';
import { exportarCSV } from '@/components/hotel/ui';
import { useHotel } from '@/components/hotel/store';
import { HOY, NACIONALIDADES, fmtF, fmtRango, type Reserva } from '@/components/hotel/datos';
import { fmtN, nombreMoneda, type Canje } from '@/components/hotel/finanzas';
import { useEmpresa } from '@/components/layout/Shell';
import { Visor } from './comun';

// ── Recibo ──────────────────────────────────────────────────────────────────
/** Datos del encabezado del recibo por propiedad (configurable por hotel). */
export const DATOS_HOTEL: Record<string, { razon: string; direccion: string; tel: string; email: string; web: string; preNumerado: boolean }> = {
  'Grand Horizon': { razon: 'Grand Horizon Resorts S.R.L.', direccion: 'Playa Hermosa, Guanacaste', tel: '(506) 2670-0000', email: 'info@grandhorizon.cr', web: 'www.grandhorizon.cr', preNumerado: true },
  'Hotel Fortuna': { razon: 'Hotel Fortuna S.A.', direccion: 'La Fortuna, San Carlos, Alajuela', tel: '(506) 2479-0000', email: 'info@hotelfortuna.cr', web: 'www.hotelfortuna.cr', preNumerado: false },
  'Hotel San José': { razon: 'Hotel San José Centro S.A.', direccion: 'Avenida 2, San José', tel: '(506) 2222-0000', email: 'info@hotelsanjose.cr', web: 'www.hotelsanjose.cr', preNumerado: false },
  'Hotel Uvita': { razon: 'Uvita Beach Lodge S.R.L.', direccion: 'Uvita, Osa, Puntarenas', tel: '(506) 2743-0000', email: 'info@hoteluvita.cr', web: 'www.hoteluvita.cr', preNumerado: true },
};
export const datosHotel = (empresa: string) => DATOS_HOTEL[empresa] ?? { razon: `${empresa} S.A.`, direccion: 'Costa Rica', tel: '(506) 4000-2026', email: 'info@sevensuite.com', web: 'www.sevensuite.com', preNumerado: false };

export function VisorCanje({ canje, onClose }: { canje: Canje; onClose: () => void }) {
  const h = useHotel();
  const [conTarjeta, setConTarjeta] = useState(false);
  const r = canje.reservaId ? h.reservas.find(x => x.id === canje.reservaId) : undefined;
  const combinable = !!r?.checkinEn;
  const csv = () => exportarCSV(`recibo-canje-${canje.numero}`, ['Número', 'Nombre', 'Recibido', 'Habitación', 'Pasaporte', 'Moneda', 'Tasa', 'Comisión (%)', 'Importe a cambiar', `Importe en ${canje.monedaDestino}`, 'Comisión', 'Entregado'],
    [[canje.numero, canje.nombre, canje.fecha.replace('T', ' '), canje.habitacion, canje.pasaporte, canje.monedaOrigen, canje.tasa.toFixed(8), canje.comisionPct, canje.importeOrigen, canje.importeDestino, canje.comision, canje.entregado]]);
  return (
    <Visor titulo="Canje de divisas" onClose={onClose} onCSV={csv} ancho={860}
      extra={combinable ? <Checkbox label="Incluir tarjeta de registro" checked={conTarjeta} onChange={setConTarjeta} /> : undefined}>
      <div>
        {conTarjeta && r && <><TarjetaRegistroImpresa r={r} /><div style={{ breakAfter: 'page', pageBreakAfter: 'always', borderTop: `2px dashed ${C.n500}`, margin: '0 24px' }} /></>}
        <ReciboCanje canje={canje} />
      </div>
    </Visor>
  );
}

export function ReciboCanje({ canje }: { canje: Canje }) {
  const empresa = useEmpresa();
  const d = datosHotel(empresa);
  return (
    <div style={{ fontFamily: FONT, color: C.n900 }}>
      <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${C.n500}` }}>
        <div><div style={{ fontSize: 18, fontWeight: 600 }}>Canje de divisas{!d.preNumerado && <span style={{ color: C.n700, fontWeight: 400 }}> · Nro. {canje.numero}</span>}</div><div style={{ fontSize: 13, color: C.n700, marginTop: 2 }}>{fmtF(canje.fecha.slice(0, 10))}</div></div>
        <Logo empresa={empresa} />
      </div>
      <div style={{ background: C.n200, padding: '12px 24px', borderBottom: `1px solid ${C.n500}` }}>
        <div style={{ fontSize: 15 }}>{empresa}</div>
        <div style={{ fontSize: 12, color: C.n700, marginTop: 2 }}>{d.razon} · {d.direccion}</div>
        <div style={{ fontSize: 12, color: C.n700 }}>Tel: {d.tel} | {d.email} | {d.web}</div>
      </div>
      <CopiaRecibo canje={canje} copia="ORIGINAL · RECEPCIONISTA" firma={['Recepcionista', 'Original · Cliente']} pre={d.preNumerado} />
      <div style={{ borderTop: `1.5px dashed ${C.n700}` }} />
      <CopiaRecibo canje={canje} copia="COPIA · CLIENTE" firma={['Cliente', 'Copia']} pre={d.preNumerado} />
    </div>
  );
}
function Logo({ empresa }: { empresa: string }) {
  return <div style={{ textAlign: 'center', color: '#5B4B3A' }}>
    <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden><path d="M33 12a15 15 0 1 0 0 16" fill="none" stroke="#5B4B3A" strokeWidth="2.4" strokeLinecap="round" /></svg>
    <div style={{ fontSize: 10, letterSpacing: '.12em' }}>{empresa.toUpperCase().split(' ').slice(-1)[0]}</div>
  </div>;
}
function CopiaRecibo({ canje, copia, firma, pre }: { canje: Canje; copia: string; firma: [string, string]; pre: boolean }) {
  const lbl = { fontSize: 10, color: C.n700, letterSpacing: '.06em' } as const;
  const celda = (l: string, v: ReactNode, borde = true) => <div style={{ padding: '10px 0', borderBottom: `1px solid ${C.n500}`, borderRight: borde ? `1px solid ${C.n500}` : undefined, paddingLeft: borde ? 0 : 20 }}><div style={lbl}>{l}</div><div style={{ fontSize: 13, marginTop: 2 }}>{v}</div></div>;
  const caja = (l: string, v: ReactNode, mon: string, destacada = false) => (
    <div style={{ background: destacada ? '#EEF2FA' : C.n200, border: `1px solid ${destacada ? C.brandBd : C.n500}`, borderRadius: radius.md, padding: '10px 16px' }}>
      <div style={lbl}>{l}</div><div style={{ fontSize: destacada ? 17 : 14, fontWeight: 600, marginTop: 4, color: destacada ? C.brand : C.n900 }}>{v} <span style={{ fontSize: 12, fontWeight: 400, color: C.n700 }}>{mon}</span></div>
    </div>
  );
  return (
    <div style={{ padding: '18px 24px 22px', breakInside: 'avoid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: `1px solid ${C.n500}` }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Recibo de canje de divisas</span>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {pre && <span style={{ background: C.brand, color: '#fff', fontWeight: 600, fontSize: 12, padding: '3px 10px', borderRadius: 6 }}>N° {String(canje.numero).padStart(6, '0')}</span>}
          <span style={{ fontSize: 10, letterSpacing: '.08em', color: C.n700, border: `1px solid ${C.n500}`, borderRadius: radius.pill, padding: '3px 10px', fontWeight: 600 }}>{copia}</span>
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {celda('NOMBRE', canje.nombre || '—')}{celda('RECIBIDO', `${fmtF(canje.fecha.slice(0, 10))} · ${canje.fecha.slice(11, 16)}`, false)}
        {celda('HABITACIÓN', canje.habitacion || '—')}{celda('PASAPORTE', canje.pasaporte || '—', false)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', border: `1px solid ${C.n500}`, borderRadius: radius.md, background: C.n200, margin: '14px 0 10px' }}>
        {[['MONEDA', `${canje.monedaOrigen} · ${nombreMoneda(canje.monedaOrigen)}`], ['TASA', canje.tasa.toFixed(8)], ['COMISIÓN (%)', fmtN(canje.comisionPct)]].map(([l, v], i) => (
          <div key={l} style={{ padding: '10px 16px', borderLeft: i ? `1px solid ${C.n500}` : undefined }}><div style={lbl}>{l}</div><div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</div></div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {caja('IMPORTE A CAMBIAR', fmtN(canje.importeOrigen), canje.monedaOrigen)}
        {caja(`IMPORTE EN ${canje.monedaDestino}`, fmtN(canje.importeDestino), canje.monedaDestino)}
        {caja('COMISIÓN', fmtN(canje.comision), canje.monedaDestino)}
        {caja('ENTREGADO', fmtN(canje.entregado), canje.monedaDestino, true)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 34 }}>
        <div style={{ width: 170, borderTop: `1px solid ${C.n700}`, textAlign: 'center', paddingTop: 6, fontSize: 11, color: C.n700, lineHeight: 1.5 }}>{firma[0]}<br />{firma[1]}</div>
      </div>
    </div>
  );
}

/** Tarjeta de registro para la impresión combinada (página 1). */
function TarjetaRegistroImpresa({ r }: { r: Reserva }) {
  const h = useHotel();
  const empresa = useEmpresa();
  const p = h.perfiles.find(x => x.id === r.perfilId);
  const fila = (l: string, v: ReactNode) => <div style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: `1px solid ${C.n500}`, fontSize: 12 }}><span style={{ width: 170, color: C.n700 }}>{l}</span><span>{v || '—'}</span></div>;
  return (
    <div style={{ padding: 28, fontFamily: FONT }}>
      <h1 style={{ margin: 0, fontSize: 20 }}>Tarjeta de registro · {empresa}</h1>
      <p style={{ margin: '4px 0 16px', fontSize: 12, color: C.n700 }}>Reserva {r.numero} · Habitación {r.habitacion} · {fmtRango(r.entrada, r.salida)}</p>
      {fila('Huésped', p?.nombre ?? r.nombre)}{fila('Identificación', r.identificacion)}{fila('Nacionalidad', NACIONALIDADES[r.nacionalidad] ?? r.nacionalidad)}
      {fila('Correo', r.email)}{fila('Teléfono', r.telefono)}{fila('Pax', `${r.adultos} adultos · ${r.ninos} niños`)}{fila('Tarifa', `${r.tarifa} · $ ${fmtN(r.precio)} / noche`)}
      {fila('Check-in', r.checkinEn ? fmtF(r.checkinEn) : '—')}{fila('Fecha hotelera', fmtF(HOY))}
      <div style={{ marginTop: 60, width: 260, borderTop: `1px solid ${C.n900}`, paddingTop: 4, fontSize: 11 }}>Firma del huésped</div>
    </div>
  );
}
