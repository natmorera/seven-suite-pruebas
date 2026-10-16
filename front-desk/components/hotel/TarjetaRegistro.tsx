'use client';
// Tarjeta de registro imprimible y código QR del Web Check-In.
import { useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Input, Modal, Select } from '@/components/suite/ui';
import { Campo, Grid, TextArea } from '@/components/configuracion/kit';
import { useHotel, totalReserva } from './store';
import { NACIONALIDADES, TIPOS, fmtRango } from './datos';
import { money, usePrint } from './ui';
import { Firma, Subida } from './checkinPiezas';

export const IcQR = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM20 14v.01M17 20h4M14 20v.01" /></svg>;

export function TarjetaRegistro({ reservaId, onClose }: { reservaId: string; onClose: () => void }) {
  const h = useHotel();
  const r = h.reservas.find(x => x.id === reservaId)!;
  const [f, setF] = useState({ nombre: r.nombre, email: r.email, nacionalidad: r.nacionalidad, tipoDoc: r.nacionalidad === 'CRI' ? 'Cédula Física' : 'Pasaporte', doc: r.identificacion, observaciones: r.observaciones, direccion: '' });
  const [frente, setFrente] = useState(''); const [reverso, setReverso] = useState('');
  const [firmaVacia, setFirmaVacia] = useState(true);
  const [error, setError] = useState('');
  const { imprimir, portal } = usePrint();
  const guardar = () => {
    if (!f.nombre || !f.doc || !/^\S+@\S+\.\S+$/.test(f.email)) return setError('Nombre, e-mail válido y número de documento son obligatorios.');
    if (firmaVacia) return setError('Falta la firma del huésped.');
    h.setReserva(r.id, { nombre: f.nombre, email: f.email, nacionalidad: f.nacionalidad, identificacion: f.doc, observaciones: f.observaciones, tarjetaLista: true });
    onClose();
  };
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  return (
    <Modal open onClose={onClose} width={720} title={`Tarjeta de registro${r.tarjetaLista ? ' · completada' : ''}`}
      footer={<>
        <Button variant="secondary" style={{ marginRight: 'auto' }} onClick={() => imprimir(
          <div style={{ fontFamily: FONT, fontSize: 12, padding: 20 }}>
            <h1 style={{ fontSize: 18 }}>Tarjeta de registro · Grand Horizon</h1>
            <p>Reserva {r.numero} · Habitación {r.habitacion} · {fmtRango(r.entrada, r.salida)} · {money(r.precio)} / noche</p>
            <p>Huésped: {f.nombre} · {f.tipoDoc} {f.doc} · {NACIONALIDADES[f.nacionalidad] ?? f.nacionalidad} · {f.email}</p>
            <p>Observaciones: {f.observaciones || '—'}</p><p style={{ marginTop: 60, borderTop: '1px solid #000', width: 260, paddingTop: 4 }}>Firma del huésped</p>
          </div>)}>Imprimir tarjeta</Button>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={guardar}>Guardar tarjeta de registro</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: C.n200, borderRadius: radius.md, padding: 12, fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <b style={{ fontWeight: 600 }}>Reserva {r.numero} · {r.empresa || 'Directo'}</b><span style={{ textAlign: 'right' }}>{money(r.precio)} / noche</span>
          <span>Habitación {r.habitacion || '—'} · {fmtRango(r.entrada, r.salida)}</span><span style={{ textAlign: 'right' }}>Total {money(totalReserva(r))}</span>
          <span>{TIPOS.find(t => t.id === r.tipo)?.nombre} · Pax: {r.adultos + r.ninos}</span><span style={{ textAlign: 'right' }}>Régimen: {r.regimen}</span>
        </div>
        <Grid cols={2}>
          <Campo label="Nombre" required><Input value={f.nombre} onChange={set('nombre')} /></Campo>
          <Campo label="Email" required><Input type="email" value={f.email} onChange={set('email')} placeholder="Ingresa el email" /></Campo>
        </Grid>
        <Grid cols={3}>
          <Campo label="Nacionalidad"><Select value={f.nacionalidad} onChange={set('nacionalidad')} options={Object.entries(NACIONALIDADES).map(([k, v]) => ({ value: k, label: v }))} /></Campo>
          <Campo label="Tipo de documento"><Select value={f.tipoDoc} onChange={set('tipoDoc')} options={['Cédula Física', 'DIMEX', 'Pasaporte'].map(x => ({ value: x, label: x }))} /></Campo>
          <Campo label="Número de documento" required><Input value={f.doc} onChange={set('doc')} placeholder="Ingresa el número" /></Campo>
        </Grid>
        <Campo label="Dirección (opcional)"><Input value={f.direccion} onChange={set('direccion')} /></Campo>
        <Campo label="Observaciones (opcional)"><TextArea value={f.observaciones} onChange={set('observaciones')} rows={2} /></Campo>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Documento y firma digital</p>
        <Grid cols={2}><Subida label="Documento frontal" valor={frente} onChange={setFrente} /><Subida label="Documento reverso" valor={reverso} onChange={setReverso} /></Grid>
        <Campo label="Firma" required><Firma onChange={setFirmaVacia} /></Campo>
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
      </div>
      {portal}
    </Modal>
  );
}

// ── QR para Web Check-In ────────────────────────────────────────────────────
export function QRCheckIn({ reservaId, onClose }: { reservaId: string; onClose: () => void }) {
  const h = useHotel();
  const r = h.reservas.find(x => x.id === reservaId)!;
  const [v, setV] = useState(0);
  const { imprimir, portal } = usePrint();
  const idiomas = [['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['pt', 'Português']];
  const url = (l: string) => `https://checkin.mysevensuite.com/${l}/${r.numero}?t=${v}`;
  const qr = (l: string) => `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url(l))}`;
  const grid = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      {idiomas.map(([l, n]) => (
        <div key={l} style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 10, textAlign: 'center', fontFamily: FONT }}>
          <b style={{ fontSize: 12, fontWeight: 600 }}>{n}</b>
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen generada por un servicio externo de QR */}
          <img src={qr(l)} alt={`Código QR Web Check-In en ${n}`} width={140} height={140} style={{ display: 'block', margin: '8px auto' }} />
          <span style={{ fontSize: 11, color: C.n700 }}>Web Check-In</span>
        </div>
      ))}
    </div>
  );
  return (
    <Modal open onClose={onClose} width={720} title={`Formulario para Check-In · Reserva ${r.numero}`}
      footer={<><Button variant="secondary" onClick={() => setV(x => x + 1)}>Actualizar</Button><Button onClick={() => imprimir(<div style={{ padding: 20 }}><h2 style={{ fontFamily: FONT }}>Reserva {r.numero} · {r.nombre}</h2>{grid}</div>)}>Imprimir</Button></>}>
      <p style={{ margin: '0 0 14px', fontSize: 12, color: C.n700 }}>Escanea el código QR según el idioma para completar el formulario para check-in. Al terminar, la tarjeta de registro queda lista.</p>
      {grid}
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: C.n700 }}>¿El huésped ya lo completó?</span>
        <Button variant="secondary" onClick={() => { h.setReserva(r.id, { tarjetaLista: true }); onClose(); }}>Marcar formulario recibido</Button>
      </div>
      {portal}
    </Modal>
  );
}
