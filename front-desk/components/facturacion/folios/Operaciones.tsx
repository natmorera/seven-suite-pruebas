'use client';
// Operaciones sobre un folio (comunes a cuenta casa, folios externos y folios
// de reservas): nuevo cargo, corrección, traslado, redirección, pago,
// exoneración, referencia, notas de crédito/débito y prefactura.
import { useState, type ReactNode } from 'react';
import { C, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal, Select } from '@/components/suite/ui';
import { Campo, Grid, InputAfijo, MultiSelect, TextArea, norm } from '@/components/configuracion/kit';
import { Alerta, RangoBoton } from '@/components/hotel/ui';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { HOY, fmtF } from '@/components/hotel/datos';
import { CONCEPTOS, ahoraHotel, fmtMon, fmtN, r2, simbolo } from '@/components/hotel/finanzas';
import { destinosPosibles, useFolios, type FolioVista, type LineaFolio } from './modelo';

const Resumen = ({ children, tono = 'gris' }: { children: ReactNode; tono?: 'gris' | 'rojo' }) => (
  <div style={{ background: tono === 'rojo' ? 'rgba(244,67,54,.04)' : '#F5F6FA', borderRadius: radius.md, padding: '12px 16px', margin: '14px auto 0', maxWidth: 340, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: C.n900 }}>{children}</div>
);
export const Par = ({ l, v, color }: { l: ReactNode; v: ReactNode; color?: string }) => <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span>{l}</span><span style={{ color }}>{v}</span></div>;
export const cuando = () => ahoraHotel();

// ── Nuevo cargo ─────────────────────────────────────────────────────────────
export function NuevoCargo({ folio, onClose, onListo }: { folio: FolioVista; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const [concepto, setConcepto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [importe, setImporte] = useState('100');
  const [motivo, setMotivo] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState('');
  const monto = r2(Number(importe) || 0);
  const k = CONCEPTOS.find(c => c.codigo === concepto);
  const excede = folio.limite > 0 && folio.saldo + monto > folio.limite;
  const red = folio.redirecciones.find(r => (!r.conceptos.length || r.conceptos.includes(concepto)) && r.desde <= HOY && (!r.hasta || r.hasta >= HOY));
  const seguir = () => {
    if (!concepto) return setError('Selecciona el concepto.');
    if (monto === 0) return setError('Ingresa el importe.');
    setError(''); setConfirmar(true);
  };
  const registrar = () => {
    const t = cuando();
    h.agregarCargo(folio.id, { fecha: HOY, hora: t.slice(11, 16), concepto, descripcion: descripcion.trim() || k!.descripcion, origen: 'FDK', conceptoOrig: k!.descripcion, importe: monto, tipo: 'Cargo', motivo: motivo.trim(), usuario: h.sesion }, t);
    onListo(red ? 'Cargo registrado (redirigido a otro folio por la regla de redirección)' : 'Cargo registrado');
  };
  return (
    <>
      <Modal open={!confirmar} title={`Nuevo cargo · ${folio.clase === 'casa' ? `Cuenta: ${folio.numero} - ${folio.nombre}` : `Folio ${folio.numero}`}`} onClose={onClose} width={620}
        footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={seguir}>Registrar cargo</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Campo label="Concepto" required><Select value={concepto} onChange={setConcepto} options={[{ value: '', label: 'Seleccionar concepto' }, ...CONCEPTOS.filter(c => c.codigo !== 'DESC').map(c => ({ value: c.codigo, label: `${c.codigo} · ${c.descripcion}` }))]} /></Campo>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
            <Campo label="Moneda"><Input value={`${folio.moneda} ${simbolo(folio.moneda)}`} disabled /></Campo>
            <Campo label="Importe" required hint="Precio con impuestos incluidos."><InputAfijo value={importe} onChange={v => setImporte(v.replace(/[^\d.-]/g, ''))} prefijo={simbolo(folio.moneda)} alinear="right" /></Campo>
          </div>
          <Campo label="Descripción (opcional)"><Input value={descripcion} onChange={setDescripcion} placeholder={k?.descripcion ?? 'Ej.: Almuerzo Staff'} /></Campo>
          <Campo label="Motivo"><TextArea value={motivo} onChange={setMotivo} rows={3} placeholder="Escriba el motivo de la operación" /></Campo>
          {excede && <p style={{ margin: 0, fontSize: 12, color: '#7A5C00', background: 'rgba(238,179,0,.1)', padding: '8px 12px', borderRadius: radius.control }}>Con este cargo el folio supera su límite de crédito ({fmtMon(folio.limite, folio.moneda)}).</p>}
          {red && <p style={{ margin: 0, fontSize: 12, color: C.brand, background: C.brandBg, padding: '8px 12px', borderRadius: radius.control }}>Este concepto tiene una redirección activa: el cargo se registrará en el folio destino.</p>}
          {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
        </div>
      </Modal>
      <Alerta open={confirmar} titulo={folio.clase === 'casa' ? '¿Deseas confirmar cargo interno?' : '¿Deseas confirmar el cargo?'} onClose={() => setConfirmar(false)} onConfirm={registrar} confirmar="Confirmar cargo" cancelar="Cancelar">
        {folio.clase === 'casa' ? 'Estás a punto de registrar un cargo en la cuenta de casa.' : `Estás a punto de registrar un cargo en el folio ${folio.numero}.`}
        <Resumen><Par l={descripcion.trim() || k?.descripcion} v={<b>{fmtMon(monto, folio.moneda)}</b>} /></Resumen>
      </Alerta>
    </>
  );
}

// ── Corrección (confirmación con lista y monto negativo) ────────────────────
export const MOTIVOS_CORRECCION = ['Error de cobro', 'Cargo duplicado', 'Cortesía autorizada', 'Cargo en folio equivocado', 'Otro'];
export function ConfirmarCorreccion({ folio, lineas, onClose, onListo }: { folio: FolioVista; lineas: LineaFolio[]; onClose: () => void; onListo: () => void }) {
  const h = useHotel();
  const [motivo, setMotivo] = useState(MOTIVOS_CORRECCION[0]);
  const total = r2(lineas.reduce((s, l) => s + l.importe, 0));
  return (
    <Alerta open titulo="¿Deseas confirmar la corrección de cargos?" onClose={onClose} confirmar="Confirmar corrección" cancelar="Cancelar"
      onConfirm={() => { h.corregir(folio.id, lineas.map(l => ({ id: l.id, concepto: l.concepto, descripcion: l.descripcion, importe: l.importe, conceptoOrig: l.conceptoOrig })), motivo, h.sesion, cuando()); onListo(); }}>
      Estás modificando un cargo existente.
      <Resumen tono="rojo">
        {lineas.map(l => <Par key={l.id} l={l.descripcion || l.conceptoOrig} v={fmtMon(l.importe, folio.moneda)} />)}
        <Par l={<b>Monto total:</b>} v={<b>- {fmtMon(total, folio.moneda)}</b>} color={C.error} />
      </Resumen>
      <div style={{ marginTop: 12, textAlign: 'left', maxWidth: 340, marginInline: 'auto' }}>
        <Campo label="Motivo"><Select value={motivo} onChange={setMotivo} options={MOTIVOS_CORRECCION.map(m => ({ value: m, label: m }))} /></Campo>
      </div>
    </Alerta>
  );
}

// ── Trasladar cargos ────────────────────────────────────────────────────────
export function Trasladar({ folio, onClose, onListo }: { folio: FolioVista; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const folios = useFolios();
  const [q, setQ] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [destino, setDestino] = useState('');
  const [motivo, setMotivo] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState('');
  const disponibles = folio.lineas.filter(l => !l.bloqueado && !l.historico && l.importe > 0 && (!q || norm(`${l.conceptoOrig} ${l.descripcion}`).includes(norm(q))) && (!desde || l.fecha >= desde) && (!hasta || l.fecha <= hasta));
  const elegidas = folio.lineas.filter(l => sel.includes(l.id));
  const total = r2(elegidas.reduce((s, l) => s + l.importe, 0));
  const destinos = destinosPosibles(folios, folio.id);
  const dest = folios.porId.get(destino);
  const todos = disponibles.length > 0 && disponibles.every(l => sel.includes(l.id));
  const seguir = () => {
    if (!sel.length) return setError('Selecciona al menos un cargo.');
    if (!destino) return setError('Selecciona el destino.');
    if (!motivo.trim()) return setError('El motivo del traslado es obligatorio.');
    setError(''); setConfirmar(true);
  };
  const campoGris = (v: ReactNode, w?: number, der?: boolean) => <span style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: der ? 'space-between' : 'flex-start', padding: '0 10px', background: C.n200, border: `1px solid ${C.n500}`, borderRadius: radius.control, fontSize: 12, width: w, flex: w ? undefined : 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}>{v}</span>;
  return (
    <>
      <Modal open={!confirmar} title={`Trasladar cargos · ${folio.clase === 'casa' ? `Cuenta: ${folio.numero} - ${folio.nombre}` : `Folio ${folio.numero}`}`} onClose={onClose} width={760}
        footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={seguir}>Guardar traslado</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><Input value={q} onChange={setQ} placeholder="Buscar por concepto" aria-label="Buscar por concepto" /></div>
            <RangoBoton label="Período de cargo" desde={desde} hasta={hasta} onChange={(a, b) => { setDesde(a); setHasta(b); }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: C.n700 }}>
              <Checkbox checked={todos} onChange={v => setSel(v ? disponibles.map(l => l.id) : [])} label={<span style={{ width: 90 }}>Fecha</span>} /><span style={{ flex: 1 }}>Concepto</span><span style={{ width: 130 }}>Precio i.i.</span>
            </div>
            {disponibles.length === 0 && <p style={{ margin: 0, fontSize: 12, color: C.n700, textAlign: 'center', padding: 16 }}>No hay cargos disponibles para trasladar.</p>}
            {disponibles.map(l => (
              <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Checkbox checked={sel.includes(l.id)} onChange={v => setSel(v ? [...sel, l.id] : sel.filter(x => x !== l.id))} />
                {campoGris(fmtF(l.fecha), 96)}{campoGris(l.descripcion || l.conceptoOrig)}{campoGris(<><span>{simbolo(folio.moneda)}</span><span>{fmtN(l.importe)}</span></>, 130, true)}
              </div>
            ))}
          </div>
          <Campo label="Destino"><Select value={destino} onChange={setDestino} options={[{ value: '', label: 'Seleccionar Habitación / Folio externo' }, ...destinos.map(d => ({ value: d.value, label: d.label }))]} /></Campo>
          <Campo label="Motivo" required><TextArea value={motivo} onChange={setMotivo} rows={3} placeholder="Ingresa el motivo del traslado" /></Campo>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: radius.md, border: `1px solid ${C.n500}`, background: C.n200, fontSize: 13 }}>
            <span style={{ color: C.n700 }}>Importe total</span><b style={{ color: C.brand }}>{fmtMon(total, folio.moneda)}</b>
          </div>
          {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
        </div>
      </Modal>
      <Alerta open={confirmar} titulo="¿Deseas confirmar traslado de cargos?" onClose={() => setConfirmar(false)} confirmar="Confirmar traslado" cancelar="Cancelar"
        onConfirm={() => { h.trasladar(folio.id, elegidas.map(l => ({ id: l.id, concepto: l.concepto, descripcion: l.descripcion, importe: l.importe, conceptoOrig: l.conceptoOrig })), destino, motivo.trim(), h.sesion, cuando()); onListo(`Cargos trasladados al folio ${dest?.numero}`); }}>
        Esto puede afectar saldos y responsabilidades de pago.
        <Resumen><Par l="Desde:" v={<b>Folio #{folio.numero}</b>} /><Par l="Hacia:" v={<b>Folio #{dest?.numero}</b>} /><Par l="Monto:" v={<b>{fmtMon(total, folio.moneda)}</b>} /></Resumen>
      </Alerta>
    </>
  );
}

// ── Redirigir cargos ────────────────────────────────────────────────────────
export function Redirigir({ folio, onClose, onListo }: { folio: FolioVista; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const folios = useFolios();
  const [conceptos, setConceptos] = useState<string[]>([]);
  const [destino, setDestino] = useState('');
  const [desde, setDesde] = useState(HOY);
  const [hasta, setHasta] = useState(folio.vencimiento);
  const destinos = destinosPosibles(folios, folio.id);
  return (
    <Modal open title={`Redirigir cargos · Folio ${folio.numero}`} onClose={onClose} width={620}
      footer={<><Button variant="secondary" onClick={onClose}>Cerrar</Button><Button disabled={!destino} onClick={() => {
        h.redirigir(folio.id, { id: nuevoId('rd'), conceptos, destino, desde, hasta }, h.sesion, cuando());
        onListo(`Los cargos de ${conceptos.length ? conceptos.join(', ') : 'todos los conceptos'} se redirigirán al folio ${folios.porId.get(destino)?.numero}`);
      }}>Guardar redirección</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Los cargos nuevos de los conceptos elegidos se registrarán automáticamente en el folio destino (p. ej. el hospedaje a la agencia y los extras al huésped).</p>
        <Campo label="Conceptos (vacío = todos)"><MultiSelect value={conceptos} onChange={setConceptos} placeholder="Todos los conceptos" opciones={CONCEPTOS.filter(c => c.codigo !== 'DESC').map(c => ({ value: c.codigo, label: c.descripcion, detalle: c.codigo }))} /></Campo>
        <Campo label="Destino" required><Select value={destino} onChange={setDestino} options={[{ value: '', label: 'Seleccionar Habitación / Folio externo' }, ...destinos.map(d => ({ value: d.value, label: d.label }))]} /></Campo>
        <Grid cols={2}>
          <Campo label="Vigente desde"><Input type="date" value={desde} onChange={setDesde} /></Campo>
          <Campo label="Hasta"><Input type="date" value={hasta} onChange={setHasta} /></Campo>
        </Grid>
        {folio.redirecciones.length > 0 && (
          <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md }}>
            <p style={{ margin: 0, padding: '8px 12px', fontSize: 12, fontWeight: 600, borderBottom: `1px solid ${C.n500}` }}>Redirecciones activas</p>
            {folio.redirecciones.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', fontSize: 12, borderBottom: `1px solid ${C.n500}` }}>
                <span>{r.conceptos.length ? r.conceptos.join(', ') : 'Todos'} → folio {folios.porId.get(r.destino)?.numero ?? r.destino} · {fmtF(r.desde)} – {fmtF(r.hasta)}</span>
                <Button variant="ghost" style={{ color: C.error }} onClick={() => h.quitarRedireccion(folio.id, r.id, h.sesion, cuando())}>Quitar</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
