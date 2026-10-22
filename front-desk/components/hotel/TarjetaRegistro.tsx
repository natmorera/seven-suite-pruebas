'use client';
// Registro del huésped: un solo componente con tres vistas excluyentes.
//  · Pendiente → enlaces del Web Check-In por idioma (QR, copiar, abrir) y «Completar aquí en recepción».
//  · Formulario → el mismo formulario del Web Check-In, llenado por el colaborador junto al huésped.
//  · Completada → la tarjeta de registro (solo lectura), con Imprimir y Editar datos.
import { useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Input, Modal, Select, StatusBadge } from '@/components/suite/ui';
import { Campo, Grid, TextArea } from '@/components/configuracion/kit';
import { useEmpresa } from '@/components/layout/Shell';
import { useHotel, totalReserva } from './store';
import { HOY, NACIONALIDADES, TIPOS, fmtF, fmtRango, type Reserva } from './datos';
import { money, usePrint } from './ui';
import { Firma, Subida } from './checkinPiezas';

export const IcQR = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM20 14v.01M17 20h4M14 20v.01" /></svg>;

const IDIOMAS = [['es', 'Español'], ['en', 'English'], ['fr', 'Français'], ['pt', 'Português']] as const;
type Idioma = (typeof IDIOMAS)[number][0];
export const urlWebCheckIn = (r: Reserva, l: string, v = 0) => `https://checkin.mysevensuite.com/${l}/${r.numero}${v ? `?t=${v}` : ''}`;
const ahora = () => { const d = new Date(); return `${HOY}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/** Estado del registro como chip (para listados y el check-in). */
export function EstadoRegistro({ r }: { r: Reserva }) {
  return r.tarjetaLista
    ? <StatusBadge label={r.registro?.origen === 'recepcion' ? 'Completada en recepción' : 'Completada'} color="green" />
    : <StatusBadge label="Pendiente" color="yellow" />;
}

type Vista = 'web' | 'form' | 'tarjeta';

/** `alCompletar`: si se abrió desde «Check-In», al guardar el registro se sigue con el check-in. */
export function TarjetaRegistro({ reservaId, onClose, vistaInicial, alCompletar }: { reservaId: string; onClose: () => void; vistaInicial?: Vista; alCompletar?: () => void }) {
  const h = useHotel();
  const r = h.reservas.find(x => x.id === reservaId)!;
  const [vista, setVista] = useState<Vista>(vistaInicial ?? (r.tarjetaLista ? 'tarjeta' : 'web'));
  const [idioma, setIdioma] = useState<Idioma>('es');
  const titulo = vista === 'tarjeta' ? 'Tarjeta de registro' : vista === 'form' ? 'Web Check-In · completar en recepción' : 'Registro pendiente · Web Check-In';
  return vista === 'web'
    ? <EnlacesWeb r={r} titulo={titulo} onClose={onClose} onCompletar={l => { setIdioma(l); setVista('form'); }} />
    : vista === 'form'
      ? <FormularioRegistro r={r} titulo={titulo} idioma={idioma} onClose={onClose} onVolver={r.tarjetaLista ? () => setVista('tarjeta') : () => setVista('web')} onGuardado={() => (alCompletar ? alCompletar() : setVista('tarjeta'))} />
      : <TarjetaCompleta r={r} titulo={titulo} onClose={onClose} onEditar={() => setVista('form')} />;
}

/** Compatibilidad: abrir directamente los enlaces del Web Check-In. Si ya está completa, muestra la tarjeta. */
export const QRCheckIn = (p: { reservaId: string; onClose: () => void }) => <TarjetaRegistro {...p} />;

const Resumen = ({ r }: { r: Reserva }) => (
  <div style={{ background: C.n200, borderRadius: radius.md, padding: '10px 14px', fontSize: 12, display: 'grid', gridTemplateColumns: '1fr auto', gap: 4 }}>
    <b style={{ fontWeight: 600 }}>Reserva {r.numero} · {r.nombre}</b><span style={{ textAlign: 'right', color: C.n700 }}>{r.empresa || 'Directo'}</span>
    <span style={{ color: C.n700 }}>Habitación {r.habitacion || 'sin asignar'} · {TIPOS.find(t => t.id === r.tipo)?.nombre} · {fmtRango(r.entrada, r.salida)}</span><span style={{ textAlign: 'right', color: C.n700 }}>{r.adultos + r.ninos} pax · {r.regimen}</span>
  </div>
);

// ── Pendiente: enlaces del Web Check-In ─────────────────────────────────────
function EnlacesWeb({ r, titulo, onClose, onCompletar }: { r: Reserva; titulo: string; onClose: () => void; onCompletar: (l: Idioma) => void }) {
  const h = useHotel();
  const [v, setV] = useState(0);
  const [copiado, setCopiado] = useState('');
  const { imprimir, portal } = usePrint();
  const qr = (l: string) => `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(urlWebCheckIn(r, l, v))}`;
  const copiar = (l: string) => { navigator.clipboard?.writeText(urlWebCheckIn(r, l, v)).catch(() => {}); setCopiado(l); setTimeout(() => setCopiado(''), 1800); };
  const grid = (paraImprimir: boolean) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
      {IDIOMAS.map(([l, n]) => (
        <div key={l} style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontFamily: FONT }}>
          <b style={{ fontSize: 12.5, fontWeight: 600 }}>{n}</b>
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen generada por un servicio externo de QR */}
          <img src={qr(l)} alt={`Código QR del Web Check-In en ${n}`} width={120} height={120} style={{ display: 'block' }} />
          {!paraImprimir && <span style={{ display: 'flex', gap: 10, fontSize: 11.5 }}>
            <button type="button" onClick={() => copiar(l)} style={{ border: 'none', background: 'none', padding: 0, color: C.brand, cursor: 'pointer', fontFamily: FONT, fontSize: 11.5 }}>{copiado === l ? 'Copiado ✓' : 'Copiar enlace'}</button>
            <button type="button" onClick={() => onCompletar(l)} style={{ border: 'none', background: 'none', padding: 0, color: C.brand, cursor: 'pointer', fontFamily: FONT, fontSize: 11.5 }}>Abrir aquí</button>
          </span>}
        </div>
      ))}
    </div>
  );
  return (
    <Modal open onClose={onClose} width={780} title={titulo}
      footer={<>
        <Button variant="secondary" style={{ marginRight: 'auto' }} onClick={() => imprimir(<div style={{ padding: 24, fontFamily: FONT }}><h2 style={{ fontSize: 16 }}>Web Check-In · Reserva {r.numero} · {r.nombre}</h2>{grid(true)}</div>)}>Imprimir códigos</Button>
        <Button variant="secondary" onClick={() => setV(x => x + 1)}>Generar enlaces nuevos</Button>
        <Button onClick={() => onCompletar('es')}>Completar aquí en recepción</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
        <Resumen r={r} />
        <p style={{ margin: 0, fontSize: 12.5, color: C.n700, lineHeight: 1.5 }}>
          El huésped todavía no completa su registro. Compártele el código o el enlace en su idioma; al terminar el Web Check-In, aquí verás la tarjeta de registro.
          Si está en recepción, puedes completarlo con él desde este equipo.
        </p>
        {grid(false)}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: `1px solid ${C.n500}`, paddingTop: 12 }}>
          <span style={{ fontSize: 12, color: C.n700 }}>¿El huésped lo completó en papel o desde otro dispositivo y no se sincronizó?</span>
          <Button variant="secondary" onClick={() => { h.setReserva(r.id, { tarjetaLista: true, registro: { origen: 'web', fecha: ahora() } }); onClose(); }}>Marcar como recibido</Button>
        </div>
      </div>
      {portal}
    </Modal>
  );
}

// ── Formulario del Web Check-In (lo llena el colaborador) ───────────────────
const TEXTOS: Record<Idioma, { nombre: string; email: string; nac: string; tipoDoc: string; doc: string; dir: string; obs: string; frente: string; reverso: string; firma: string }> = {
  es: { nombre: 'Nombre completo', email: 'Correo electrónico', nac: 'Nacionalidad', tipoDoc: 'Tipo de documento', doc: 'Número de documento', dir: 'Dirección (opcional)', obs: 'Comentarios (opcional)', frente: 'Documento: frente', reverso: 'Documento: reverso', firma: 'Firma del huésped' },
  en: { nombre: 'Full name', email: 'Email', nac: 'Nationality', tipoDoc: 'Document type', doc: 'Document number', dir: 'Address (optional)', obs: 'Comments (optional)', frente: 'ID: front', reverso: 'ID: back', firma: 'Guest signature' },
  fr: { nombre: 'Nom complet', email: 'E-mail', nac: 'Nationalité', tipoDoc: 'Type de document', doc: 'Numéro de document', dir: 'Adresse (facultatif)', obs: 'Commentaires (facultatif)', frente: 'Pièce : recto', reverso: 'Pièce : verso', firma: 'Signature du client' },
  pt: { nombre: 'Nome completo', email: 'E-mail', nac: 'Nacionalidade', tipoDoc: 'Tipo de documento', doc: 'Número do documento', dir: 'Endereço (opcional)', obs: 'Comentários (opcional)', frente: 'Documento: frente', reverso: 'Documento: verso', firma: 'Assinatura do hóspede' },
};

function FormularioRegistro({ r, titulo, idioma: idiomaInicial, onClose, onVolver, onGuardado }: { r: Reserva; titulo: string; idioma: Idioma; onClose: () => void; onVolver: () => void; onGuardado: () => void }) {
  const h = useHotel();
  const [idioma, setIdioma] = useState<Idioma>(idiomaInicial);
  const t = TEXTOS[idioma];
  const [f, setF] = useState({ nombre: r.nombre, email: r.email, nacionalidad: r.nacionalidad, tipoDoc: r.registro?.tipoDoc ?? (r.nacionalidad === 'CRI' ? 'Cédula Física' : 'Pasaporte'), doc: r.identificacion, observaciones: r.observaciones, direccion: r.registro?.direccion ?? '' });
  const [frente, setFrente] = useState(''); const [reverso, setReverso] = useState('');
  const [firmaVacia, setFirmaVacia] = useState(!r.registro?.firmada);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (v: string) => { setF({ ...f, [k]: v }); setError(''); };
  const guardar = () => {
    const faltan = [!f.nombre.trim() && 'nombre', !/^\S+@\S+\.\S+$/.test(f.email) && 'correo válido', !f.doc.trim() && 'número de documento', firmaVacia && 'firma'].filter(Boolean);
    if (faltan.length) return setError(`Falta: ${faltan.join(', ')}.`);
    h.setReserva(r.id, { nombre: f.nombre, email: f.email, nacionalidad: f.nacionalidad, identificacion: f.doc, observaciones: f.observaciones, tarjetaLista: true,
      registro: { origen: 'recepcion', fecha: ahora(), idioma, tipoDoc: f.tipoDoc, direccion: f.direccion, firmada: true } });
    onGuardado();
  };
  return (
    <Modal open onClose={onClose} width={780} title={titulo}
      footer={<>
        {error ? <span role="alert" style={{ marginRight: 'auto', fontSize: 12.5, color: C.error }}>{error}</span> : <span style={{ marginRight: 'auto' }} />}
        <Button variant="secondary" onClick={onVolver}>{r.tarjetaLista ? 'Volver a la tarjeta' : 'Volver a los enlaces'}</Button>
        <Button onClick={guardar}>Guardar registro</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: C.n700 }}>Es el mismo formulario que ve el huésped en el enlace. Llénalo con él y que firme en pantalla.</span>
          <span role="group" aria-label="Idioma del formulario" style={{ display: 'inline-flex', border: `1px solid ${C.n500}`, borderRadius: radius.control, overflow: 'hidden' }}>
            {IDIOMAS.map(([l, n]) => <button key={l} type="button" aria-pressed={idioma === l} onClick={() => setIdioma(l)}
              style={{ border: 'none', padding: '5px 10px', fontSize: 11.5, fontFamily: FONT, cursor: 'pointer', background: idioma === l ? C.brandBg : C.n000, color: idioma === l ? C.brand : C.n900 }}>{n}</button>)}
          </span>
        </div>
        <Resumen r={r} />
        <Grid cols={2}>
          <Campo label={t.nombre} required><Input value={f.nombre} onChange={set('nombre')} /></Campo>
          <Campo label={t.email} required><Input type="email" value={f.email} onChange={set('email')} placeholder="correo@ejemplo.com" /></Campo>
        </Grid>
        <Grid cols={3}>
          <Campo label={t.nac}><Select value={f.nacionalidad} onChange={set('nacionalidad')} options={Object.entries(NACIONALIDADES).map(([k, v]) => ({ value: k, label: v }))} /></Campo>
          <Campo label={t.tipoDoc}><Select value={f.tipoDoc} onChange={set('tipoDoc')} options={['Cédula Física', 'DIMEX', 'Pasaporte'].map(x => ({ value: x, label: x }))} /></Campo>
          <Campo label={t.doc} required><Input value={f.doc} onChange={set('doc')} /></Campo>
        </Grid>
        <Campo label={t.dir}><Input value={f.direccion} onChange={set('direccion')} /></Campo>
        <Campo label={t.obs}><TextArea value={f.observaciones} onChange={set('observaciones')} rows={2} /></Campo>
        <Grid cols={2}><Subida label={t.frente} valor={frente} onChange={setFrente} /><Subida label={t.reverso} valor={reverso} onChange={setReverso} /></Grid>
        <Campo label={t.firma} required><Firma onChange={v => { setFirmaVacia(v); setError(''); }} /></Campo>
      </div>
    </Modal>
  );
}

// ── Completada: la tarjeta de registro ──────────────────────────────────────
function TarjetaCompleta({ r, titulo, onClose, onEditar }: { r: Reserva; titulo: string; onClose: () => void; onEditar: () => void }) {
  const empresa = useEmpresa();
  const { imprimir, portal } = usePrint();
  const reg = r.registro;
  const fila = (l: string, v: ReactNode) => (
    <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 12, padding: '8px 0', borderBottom: `1px solid ${C.n500}`, fontSize: 12.5 }}>
      <span style={{ color: C.n700 }}>{l}</span><span>{v || '—'}</span>
    </div>
  );
  const documento = (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{empresa}</span>
        <span style={{ fontSize: 12, color: C.n700 }}>Reserva {r.numero}</span>
      </div>
      {fila('Huésped', r.nombre)}
      {fila('Documento', `${reg?.tipoDoc ?? 'Identificación'} ${r.identificacion}`)}
      {fila('Nacionalidad', NACIONALIDADES[r.nacionalidad] ?? r.nacionalidad)}
      {fila('Correo', r.email)}
      {fila('Dirección', reg?.direccion)}
      {fila('Habitación', `${r.habitacion || 'Sin asignar'} · ${TIPOS.find(t => t.id === r.tipo)?.nombre ?? r.tipo}`)}
      {fila('Estancia', fmtRango(r.entrada, r.salida))}
      {fila('Personas', `${r.adultos} adultos${r.ninos ? ` · ${r.ninos} niños` : ''}${r.adicionales.length ? ` · ${r.adicionales.map(a => a.nombre).filter(Boolean).join(', ')}` : ''}`)}
      {fila('Tarifa', `${r.tarifa} · ${money(r.precio)} / noche · total ${money(totalReserva(r))}`)}
      {fila('Comentarios', r.observaciones)}
      <div style={{ marginTop: 40, width: 260, borderTop: `1px solid ${C.n900}`, paddingTop: 4, fontSize: 11, color: C.n700 }}>Firma del huésped{reg?.firmada ? ' (firmada en pantalla)' : ''}</div>
    </div>
  );
  return (
    <Modal open onClose={onClose} width={720} title={titulo}
      footer={<>
        <Button variant="secondary" style={{ marginRight: 'auto' }} onClick={onEditar}>Editar datos</Button>
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        <Button onClick={() => imprimir(<div style={{ padding: 28 }}><h1 style={{ fontFamily: FONT, fontSize: 18, margin: '0 0 12px' }}>Tarjeta de registro</h1>{documento}</div>)}>Imprimir tarjeta</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: C.n700 }}>
          <EstadoRegistro r={r} />
          <span>{reg ? `${reg.origen === 'recepcion' ? 'Registrada' : 'Recibida por Web Check-In'} el ${fmtF(reg.fecha.slice(0, 10))} a las ${reg.fecha.slice(11, 16)}` : 'Recibida por Web Check-In'}</span>
        </div>
        <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '16px 18px' }}>{documento}</div>
      </div>
      {portal}
    </Modal>
  );
}
