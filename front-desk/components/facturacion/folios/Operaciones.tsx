'use client';
// Operaciones sobre un folio (comunes a cuenta casa, folios externos y folios
// de reservas): nuevo cargo, corrección, traslado, redirección, pago,
// exoneración, referencia, notas de crédito/débito y prefactura.
import { useState, type ReactNode } from 'react';
import { C, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Select } from '@/components/suite/ui';
import { PanelLateral } from '@/components/suite/PanelLateral';
import { Campo, Grid, InputAfijo, MultiSelect, TextArea, norm } from '@/components/configuracion/kit';
import { Alerta, RangoBoton } from '@/components/hotel/ui';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { HOY, fmtF } from '@/components/hotel/datos';
import { CONCEPTOS, aUSD, ahoraHotel, fmtMon, fmtN, r2, simbolo } from '@/components/hotel/finanzas';
import { destinosPosibles, useFolios, type FolioVista, type LineaFolio } from './modelo';
import { MontoCelda } from '@/components/suite/Monto';

const Resumen = ({ children, tono = 'gris' }: { children: ReactNode; tono?: 'gris' | 'rojo' }) => (
  <div style={{ background: tono === 'rojo' ? 'rgba(244,67,54,.04)' : '#F5F6FA', borderRadius: radius.md, padding: '12px 16px', margin: '14px auto 0', maxWidth: 340, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: C.n900 }}>{children}</div>
);
export const Par = ({ l, v, color }: { l: ReactNode; v: ReactNode; color?: string }) => <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span>{l}</span><span style={{ color }}>{v}</span></div>;
export const cuando = () => ahoraHotel();
/** Subtítulo de los paneles de operación: la cuenta o el folio sobre el que se trabaja. */
export const subFolio = (f: FolioVista) => (f.clase === 'casa' ? `Cuenta ${f.numero} - ${f.nombre}` : `Folio ${f.numero} · ${f.nombre}`);

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
      <PanelLateral open={!confirmar} title="Nuevo cargo" sub={subFolio(folio)} onClose={onClose}
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
      </PanelLateral>
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
      <PanelLateral open={!confirmar} title="Trasladar cargos" sub={subFolio(folio)} onClose={onClose}
        footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={seguir}>Guardar traslado</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><Input value={q} onChange={setQ} placeholder="Buscar por concepto" aria-label="Buscar por concepto" /></div>
            <RangoBoton label="Período de cargo" desde={desde} hasta={hasta} onChange={(a, b) => { setDesde(a); setHasta(b); }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
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
      </PanelLateral>
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
    <PanelLateral title="Redirigir cargos" sub={subFolio(folio)} onClose={onClose}
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
    </PanelLateral>
  );
}

// ── Tabla de selección de cargos (corrección) ───────────────────────────────
const thS = { padding: '8px', fontWeight: 400, color: C.n700, borderBottom: `1px solid ${C.n500}`, fontSize: 12, textAlign: 'left' as const, background: C.n200, whiteSpace: 'nowrap' as const };
const tdS = { padding: '8px', borderBottom: `1px solid ${C.n500}`, fontSize: 12 };

// ── Corrección de cargos ────────────────────────────────────────────────────
export function Corregir({ folio, inicial = [], onClose, onListo }: { folio: FolioVista; inicial?: string[]; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const [sel, setSel] = useState<string[]>(inicial);
  const [motivo, setMotivo] = useState(MOTIVOS_CORRECCION[0]);
  const [confirmar, setConfirmar] = useState(false);
  const corregibles = folio.lineas.filter(l => !l.bloqueado && !l.historico && l.importe > 0).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
  const elegidas = corregibles.filter(l => sel.includes(l.id));
  const total = r2(elegidas.reduce((s, l) => s + l.importe, 0));
  const todos = corregibles.length > 0 && corregibles.every(l => sel.includes(l.id));
  return (
    <>
      <PanelLateral open={!confirmar} title="Corrección de cargos" sub={subFolio(folio)} onClose={onClose}
        footerIzq={<span style={{ fontSize: 12.5, color: C.n700 }}>{sel.length} seleccionados · <b style={{ color: C.error }}>- {fmtMon(total, folio.moneda)}</b></span>}
        footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="danger" disabled={!sel.length} onClick={() => setConfirmar(true)}>Guardar corrección</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: C.n700 }}>Selecciona los cargos vigentes que deseas corregir. Cada uno se anula con un movimiento de corrección por el mismo importe.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={{ ...thS, width: 28 }}><Checkbox checked={todos} onChange={v => setSel(v ? corregibles.map(l => l.id) : [])} /></th>
              <th style={thS}>Fecha</th><th style={thS}>Concepto</th><th style={thS}>Usuario</th><th style={{ ...thS, textAlign: 'right' }}>Importe</th>
            </tr></thead>
            <tbody>
              {corregibles.length === 0 && <tr><td colSpan={5} style={{ ...tdS, textAlign: 'center', color: C.n700, padding: 28 }}>No hay cargos vigentes que se puedan corregir.</td></tr>}
              {corregibles.map(l => (
                <tr key={l.id} onClick={() => setSel(sel.includes(l.id) ? sel.filter(x => x !== l.id) : [...sel, l.id])} style={{ cursor: 'pointer', background: sel.includes(l.id) ? 'rgba(244,67,54,.04)' : undefined }}>
                  <td style={tdS} onClick={e => e.stopPropagation()}><Checkbox checked={sel.includes(l.id)} onChange={v => setSel(v ? [...sel, l.id] : sel.filter(x => x !== l.id))} /></td>
                  <td style={{ ...tdS, whiteSpace: 'nowrap' }}>{fmtF(l.fecha)}</td>
                  <td style={tdS}>{l.descripcion || l.conceptoOrig}</td>
                  <td style={{ ...tdS, color: C.n700 }}>{l.usuario}</td>
                  <td style={{ ...tdS, textAlign: 'right', whiteSpace: 'nowrap' }}><MontoCelda texto={fmtMon(l.importe, folio.moneda)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Campo label="Motivo"><Select value={motivo} onChange={setMotivo} options={MOTIVOS_CORRECCION.map(m => ({ value: m, label: m }))} /></Campo>
        </div>
      </PanelLateral>
      <Alerta open={confirmar} titulo="¿Deseas confirmar la corrección de cargos?" tono="danger" onClose={() => setConfirmar(false)} confirmar="Confirmar corrección" cancelar="Cancelar"
        onConfirm={() => { h.corregir(folio.id, elegidas.map(l => ({ id: l.id, concepto: l.concepto, descripcion: l.descripcion, importe: l.importe, conceptoOrig: l.conceptoOrig })), motivo, h.sesion, cuando()); onListo('Corrección registrada'); }}>
        Estás modificando cargos existentes.
        <Resumen tono="rojo">
          {elegidas.map(l => <Par key={l.id} l={l.descripcion || l.conceptoOrig} v={fmtMon(l.importe, folio.moneda)} />)}
          <Par l={<b>Monto total:</b>} v={<b>- {fmtMon(total, folio.moneda)}</b>} color={C.error} />
        </Resumen>
      </Alerta>
    </>
  );
}

// ── Liquidación de la cuenta ────────────────────────────────────────────────
export function Liquidar({ folio, onClose, onListo }: { folio: FolioVista; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const [confirmar, setConfirmar] = useState(false);
  const vigentes = folio.lineas.filter(l => !l.historico);
  const porConcepto = Object.values(vigentes.reduce<Record<string, { concepto: string; n: number; total: number }>>((a, l) => {
    const k = l.conceptoOrig || l.concepto; a[k] ??= { concepto: k, n: 0, total: 0 }; a[k].n++; a[k].total = r2(a[k].total + l.importe); return a;
  }, {})).sort((a, b) => b.total - a.total);
  return (
    <>
      <PanelLateral open={!confirmar} title="Liquidar cuenta" sub={subFolio(folio)} onClose={onClose}
        footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={Math.abs(folio.saldo) < 0.01} onClick={() => setConfirmar(true)} style={{ background: C.success, borderColor: C.success }}>Liquidar {fmtMon(folio.saldo, folio.moneda)}</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: C.n700 }}>Los {vigentes.length} movimientos vigentes pasan al histórico de la cuenta y el saldo queda en cero.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={thS}>Concepto</th><th style={{ ...thS, textAlign: 'right' }}>Movimientos</th><th style={{ ...thS, textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {porConcepto.length === 0 && <tr><td colSpan={3} style={{ ...tdS, textAlign: 'center', color: C.n700, padding: 28 }}>La cuenta no tiene movimientos vigentes.</td></tr>}
              {porConcepto.map(x => <tr key={x.concepto}><td style={tdS}>{x.concepto}</td><td style={{ ...tdS, textAlign: 'right' }}>{x.n}</td><td style={{ ...tdS, textAlign: 'right' }}><MontoCelda texto={fmtMon(x.total, folio.moneda)} /></td></tr>)}
              <tr><td style={{ ...tdS, fontWeight: 600, background: C.n200 }}>Total a liquidar</td><td style={{ ...tdS, textAlign: 'right', fontWeight: 600, background: C.n200 }}>{vigentes.length}</td><td style={{ ...tdS, textAlign: 'right', fontWeight: 600, background: C.n200 }}><MontoCelda texto={fmtMon(folio.saldo, folio.moneda)} fuerte /></td></tr>
            </tbody>
          </table>
        </div>
      </PanelLateral>
      <Alerta open={confirmar} titulo="¿Deseas confirmar la liquidación de cargos?" onClose={() => setConfirmar(false)} confirmar="Confirmar liquidación" cancelar="Cancelar"
        onConfirm={() => { h.liquidar(folio.id, h.sesion, cuando()); onListo(`Cuenta ${folio.numero} liquidada`); }}>
        Esta acción cerrará los movimientos pendientes.
        <Resumen><Par l="Total a liquidar:" v={<b>{fmtMon(folio.saldo, folio.moneda)}</b>} /></Resumen>
      </Alerta>
    </>
  );
}

// ── Detalle de una línea del folio ──────────────────────────────────────────
export function DetalleLinea({ folio, linea, onClose, onCorregir, onTrasladar }: { folio: FolioVista; linea: LineaFolio; onClose: () => void; onCorregir?: () => void; onTrasladar?: () => void }) {
  const corregible = folio.estado === 'Abierto' && !linea.bloqueado && !linea.historico && linea.importe > 0;
  const relacionada = linea.ref ? folio.lineas.find(l => l.id === linea.ref) : undefined;
  const correcciones = folio.lineas.filter(l => l.ref === linea.id);
  const fila = (l: string, v: ReactNode) => <><span style={{ color: C.n700 }}>{l}</span><span style={{ textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' }}>{v || '—'}</span></>;
  return (
    <PanelLateral title={linea.descripcion || linea.conceptoOrig} sub={`${linea.tipo} · ${subFolio(folio)}`} onClose={onClose} width="clamp(420px, 36vw, 560px)"
      footerIzq={corregible ? <>
        {onCorregir && <Button variant="danger" onClick={onCorregir}>Corregir</Button>}
        {onTrasladar && <Button variant="secondary" onClick={onTrasladar}>Trasladar</Button>}
      </> : undefined}
      footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: linea.importe < 0 ? 'rgba(244,67,54,.05)' : C.n200, borderRadius: radius.md, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: C.n700 }}>Importe (impuestos incluidos)</span>
          <b style={{ fontSize: 18, fontWeight: 600, color: linea.importe < 0 ? C.error : C.n900 }}>{fmtMon(linea.importe, folio.moneda)}</b>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: '8px 24px', fontSize: 12.5 }}>
          {fila('Fecha y hora', `${fmtF(linea.fecha)} ${linea.hora}`)}
          {fila('Concepto', `${linea.concepto} · ${linea.conceptoOrig}`)}
          {fila('Descripción', linea.descripcion)}
          {fila('Origen', linea.origen)}
          {fila('Tipo', linea.tipo)}
          {fila('Estado', linea.historico ? 'Liquidado (histórico)' : linea.bloqueado ? 'Bloqueado' : correcciones.length ? 'Corregido' : 'Vigente')}
          {fila('Motivo', linea.motivo)}
          {fila('Registrado por', linea.usuario)}
          {relacionada && fila('Movimiento original', `${relacionada.descripcion || relacionada.conceptoOrig} · ${fmtF(relacionada.fecha)} · ${fmtMon(relacionada.importe, folio.moneda)}`)}
        </div>
        {correcciones.length > 0 && (
          <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md }}>
            <p style={{ margin: 0, padding: '8px 12px', fontSize: 12, fontWeight: 600, borderBottom: `1px solid ${C.n500}` }}>Movimientos relacionados</p>
            {correcciones.map(c => <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontSize: 12 }}><span>{c.tipo} · {fmtF(c.fecha)} · {c.usuario}</span><span style={{ color: C.error }}>{fmtMon(c.importe, folio.moneda)}</span></div>)}
          </div>
        )}
        {!corregible && !linea.historico && linea.bloqueado && <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Este movimiento está bloqueado: no se puede corregir ni trasladar.</p>}
      </div>
    </PanelLateral>
  );
}

// ── Asociar perfil a un folio externo ───────────────────────────────────────
export function AsociarPerfil({ folio, onClose, onListo }: { folio: FolioVista; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(folio.perfilId ?? '');
  const lista = h.perfiles.filter(p => !q || norm(`${p.nombre} ${p.numeroId} ${p.email}`).includes(norm(q))).slice(0, 60);
  const elegido = h.perfiles.find(p => p.id === sel);
  return (
    <PanelLateral title="Asociar perfil" sub={subFolio(folio)} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!sel || sel === folio.perfilId} onClick={() => { h.asociarPerfil(folio.id, sel, h.sesion, cuando()); onListo(`Perfil ${elegido?.nombre} asociado al folio ${folio.numero}`); }}>Asociar perfil</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: C.n700 }}>El titular y los datos de facturación electrónica del folio pasan a ser los del perfil elegido.</p>
        <Input value={q} onChange={setQ} placeholder="Buscar por nombre, identificación o correo" aria-label="Buscar perfil" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={{ ...thS, width: 28 }} /><th style={thS}>Perfil</th><th style={thS}>Identificación</th><th style={thS}>Correo</th></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={4} style={{ ...tdS, textAlign: 'center', color: C.n700, padding: 28 }}>Ningún perfil coincide con la búsqueda.</td></tr>}
            {lista.map(p => (
              <tr key={p.id} onClick={() => setSel(p.id)} style={{ cursor: 'pointer', background: sel === p.id ? C.brandBg : undefined }}>
                <td style={tdS}><input type="radio" name="perfil-folio" checked={sel === p.id} onChange={() => setSel(p.id)} aria-label={p.nombre} /></td>
                <td style={tdS}>{p.nombre}{p.id === folio.perfilId && <span style={{ color: C.n700 }}> · actual</span>}</td>
                <td style={{ ...tdS, color: C.n700 }}>{p.numeroId || '—'}</td>
                <td style={{ ...tdS, color: C.n700 }}>{p.email || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelLateral>
  );
}

// ── Asociar depósitos en garantía a un folio externo ────────────────────────
export function AsociarDepositos({ folio, onClose, onListo }: { folio: FolioVista; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const [sel, setSel] = useState<string[]>([]);
  const libres = h.depositos.filter(d => d.estado === 'Activo' && !d.folioId && !d.reservaId);
  const asociados = h.depositos.filter(d => d.folioId === folio.id);
  const total = r2(libres.filter(d => sel.includes(d.id)).reduce((s, d) => s + aUSD(d.importe, d.moneda), 0));
  return (
    <PanelLateral title="Asociar depósitos en garantía" sub={subFolio(folio)} onClose={onClose}
      footerIzq={<span style={{ fontSize: 12.5, color: C.n700 }}>{sel.length} seleccionados · <b style={{ color: C.n900 }}>{fmtMon(total)}</b></span>}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!sel.length} onClick={() => { h.asociarDepositos(folio.id, sel, h.sesion, cuando()); onListo(`${sel.length} depósito(s) asociados al folio ${folio.numero}`); }}>Asociar depósitos</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: C.n700 }}>Depósitos activos que no están asignados a una reserva ni a otro folio.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={{ ...thS, width: 28 }} /><th style={thS}>N°</th><th style={thS}>Recibido</th><th style={thS}>Nombre</th><th style={thS}>Forma</th><th style={{ ...thS, textAlign: 'right' }}>Importe</th></tr></thead>
          <tbody>
            {libres.length === 0 && <tr><td colSpan={6} style={{ ...tdS, textAlign: 'center', color: C.n700, padding: 28 }}>No hay depósitos sin asignar.</td></tr>}
            {libres.map(d => (
              <tr key={d.id} onClick={() => setSel(sel.includes(d.id) ? sel.filter(x => x !== d.id) : [...sel, d.id])} style={{ cursor: 'pointer', background: sel.includes(d.id) ? C.brandBg : undefined }}>
                <td style={tdS} onClick={e => e.stopPropagation()}><Checkbox checked={sel.includes(d.id)} onChange={v => setSel(v ? [...sel, d.id] : sel.filter(x => x !== d.id))} /></td>
                <td style={tdS}>DG-{d.numero}</td><td style={{ ...tdS, whiteSpace: 'nowrap' }}>{fmtF(d.recibido.slice(0, 10))}</td><td style={tdS}>{d.nombre}</td><td style={{ ...tdS, color: C.n700 }}>{d.tipo}</td>
                <td style={{ ...tdS, textAlign: 'right', whiteSpace: 'nowrap' }}><MontoCelda texto={fmtMon(d.importe, d.moneda)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {asociados.length > 0 && <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Ya asociados a este folio: {asociados.map(d => `DG-${d.numero}`).join(', ')}.</p>}
      </div>
    </PanelLateral>
  );
}
