'use client';
// Diálogos de operación sobre una reserva: enviar por correo, duplicar, anular,
// cambio de habitación, prórroga, agregar habitación y elección de línea.
import { useState, type CSSProperties, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal, Select } from '@/components/suite/ui';
import { Campo, Grid, TextArea } from '@/components/configuracion/kit';
import { Alerta } from '@/components/hotel/ui';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { HOY, REGIMENES, TIPOS, fmtF, noches, sumarDias, type Reserva } from '@/components/hotel/datos';
import { USOS, claveDe, habitacionLibre, numeroDe, precioTarifa, usoDe, type GrupoReserva } from '@/components/hotel/reservas';
import { fmtMon, r2 } from '@/components/hotel/finanzas';
import { useEmpresa } from '@/components/layout/Shell';
import { SeleccionHabitacion, nombreTipo } from '../comun';

const ahoraISO = () => { const d = new Date(); return `${HOY}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/** Copia «limpia» de una línea para una reserva nueva (sin pagos, depósitos ni estado). */
export function lineaNueva(base: Reserva, p: Partial<Reserva>): Reserva {
  const id = nuevoId('r');
  return {
    ...base, id, estado: 'Solicitada', pagado: 0, depGarantia: 0, checkinEn: null, checkoutEn: null, tarjetaLista: false, anulacion: undefined, facturaUnica: undefined, creada: ahoraISO(), idExterno: '',
    cuentas: [{ id: id + 'c1', nombre: 'Cuenta 1', saldo: 0, consumos: 0 }], cargos: base.cargos.map(c => ({ ...c, id: nuevoId('cg') })), adicionales: base.adicionales.map(a => ({ ...a, id: nuevoId('ad') })),
    ...p,
  };
}
/** Saldo inicial de la cuenta = total de la línea. */
export const conSaldo = (r: Reserva): Reserva => {
  const n = Math.max(1, noches(r.entrada, r.salida));
  const cargos = r.cargos.reduce((s, c) => s + c.cantidad * c.precio * Math.max(1, noches(c.desde, c.hasta) || 1), 0);
  return { ...r, cuentas: [{ ...r.cuentas[0], saldo: r2(Math.max(0, r.precio * n + cargos - r.descuento - r.pagado)) }, ...r.cuentas.slice(1)] };
};

// ── Enviar por correo ───────────────────────────────────────────────────────
const PLANTILLAS = ['Confirmación de reserva', 'Recordatorio de llegada', 'Solicitud de depósito', 'Agradecimiento por su estancia'];
export function EnviarCorreo({ g, onClose, onListo }: { g: GrupoReserva; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const empresa = useEmpresa();
  const p = g.principal;
  const perfil = h.perfiles.find(x => x.id === p.perfilId);
  const correoHotel = `info@${empresa.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}.com`;
  const [para, setPara] = useState<string[]>([perfil?.email || p.email].filter(Boolean));
  const [nuevoPara, setNuevoPara] = useState('');
  const [f, setF] = useState({ responder: `reservas@${correoHotel.split('@')[1]}`, copia: '', plantilla: PLANTILLAS[0], adjuntar: true, asunto: `Confirmación de reserva N° ${numeroDe(p)}`,
    cuerpo: `Estimado(a) ${perfil?.nombre ?? p.nombre}:\n\nGracias por elegir ${empresa}. Le confirmamos su reserva N° ${numeroDe(p)} del ${fmtF(p.entrada)} al ${fmtF(p.salida)} (${g.lineas.length} habitación(es)).\n\nQuedamos atentos a cualquier consulta.\n\nSaludos cordiales,\nDepartamento de Reservas` });
  const [error, setError] = useState('');
  const agregar = () => { const v = nuevoPara.trim(); if (!v) return; if (!/^\S+@\S+\.\S+$/.test(v)) return setError(`«${v}» no es un correo válido.`); setPara([...new Set([...para, v])]); setNuevoPara(''); setError(''); };
  const plantilla = (t: string) => {
    const asunto = t === 'Confirmación de reserva' ? `Confirmación de reserva N° ${numeroDe(p)}` : `${t} · Reserva N° ${numeroDe(p)}`;
    setF({ ...f, plantilla: t, asunto });
  };
  const enviar = () => {
    if (!para.length) return setError('Agrega al menos un destinatario.');
    if (!f.asunto.trim()) return setError('El asunto es obligatorio.');
    h.registrarBitacora(claveDe(p), f.plantilla === 'Confirmación de reserva' ? 'Correo de confirmación enviado' : `Correo enviado: ${f.plantilla}`, '-', `Correo: ${para.join(', ')}`);
    onListo('Correo enviado correctamente.');
  };
  const fila = (l: string, c: ReactNode) => <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.n500}`, padding: '8px 0' }}><span style={{ fontSize: 12, color: C.n700 }}>{l}</span>{c}</div>;
  const plano: CSSProperties = { border: 'none', outline: 'none', fontSize: 12, fontFamily: FONT, width: '100%' };
  return (
    <Modal open title="Enviar por correo electrónico" onClose={onClose} width={720}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={enviar}>Enviar</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {fila('Remitente:', <span style={{ fontSize: 12 }}>{correoHotel}</span>)}
        {fila('Para:', <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {para.map(x => <span key={x} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, background: C.brandBg, color: C.brand, border: `1px solid ${C.brandBd}`, borderRadius: radius.pill, padding: '2px 8px' }}>{x}
            <button type="button" aria-label={`Quitar ${x}`} onClick={() => setPara(para.filter(y => y !== x))} style={{ border: 'none', background: 'none', color: C.brand, cursor: 'pointer', padding: 0 }}>×</button></span>)}
          <input value={nuevoPara} onChange={e => setNuevoPara(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); agregar(); } }} onBlur={agregar} placeholder="Agregar correo y Enter" aria-label="Agregar destinatario" style={{ ...plano, width: 200, flex: 1 }} />
        </span>)}
        {fila('Responder a:', <input value={f.responder} onChange={e => setF({ ...f, responder: e.target.value })} aria-label="Responder a" style={plano} />)}
        {fila('Copiar a:', <input value={f.copia} onChange={e => setF({ ...f, copia: e.target.value })} placeholder="Opcional" aria-label="Copiar a" style={plano} />)}
        {fila('Plantilla:', <select value={f.plantilla} onChange={e => plantilla(e.target.value)} aria-label="Plantilla" style={{ ...plano, background: 'none' }}>{PLANTILLAS.map(t => <option key={t}>{t}</option>)}</select>)}
        {fila('Asunto:', <input value={f.asunto} onChange={e => setF({ ...f, asunto: e.target.value })} aria-label="Asunto" style={plano} />)}
        <textarea value={f.cuerpo} onChange={e => setF({ ...f, cuerpo: e.target.value })} rows={9} aria-label="Cuerpo del correo" style={{ ...plano, padding: '12px 0', resize: 'vertical', lineHeight: 1.6 }} />
        <Checkbox checked={f.adjuntar} onChange={b => setF({ ...f, adjuntar: b })} label={`Adjuntar confirmación de reserva (Reserva-${numeroDe(p)}.pdf)`} />
        {error && <p role="alert" style={{ margin: '10px 0 0', fontSize: 12, color: C.error }}>{error}</p>}
      </div>
    </Modal>
  );
}

// ── Anular reserva (motivo obligatorio) ─────────────────────────────────────
export function AnularReserva({ g, onClose, onListo }: { g: GrupoReserva; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(false);
  const vivas = g.lineas.filter(l => ['Solicitada', 'Confirmada', 'Lista de espera', 'In-House'].includes(l.estado));
  return (
    <Alerta open titulo="¿Deseas anular la reserva?" tono="danger" onClose={onClose} confirmar="Sí, anular" cancelar="Cancelar"
      onConfirm={() => { if (!motivo.trim()) return setError(true); h.anularReserva(vivas.map(l => l.id), motivo.trim()); onListo(`Reserva ${numeroDe(g.principal)} anulada`); }}>
      Esta acción no se puede deshacer. {vivas.some(l => l.estado === 'In-House') && 'Las habitaciones en casa quedarán libres. '}
      <div style={{ marginTop: 12, textAlign: 'left' }}>
        <span style={{ fontSize: 12, color: C.n900 }}>Motivo <b style={{ color: C.error }}>*</b></span>
        <TextArea value={motivo} onChange={v => { setMotivo(v.slice(0, 300)); setError(false); }} rows={3} placeholder="Indica el motivo de la anulación" />
        <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: error ? C.error : C.n700 }}><span>{error ? 'El motivo es obligatorio.' : ''}</span><span>{motivo.length}/300</span></span>
      </div>
    </Alerta>
  );
}

// ── Elegir línea (reservas de varias habitaciones) ──────────────────────────
export function ElegirLinea({ titulo, lineas, accion, onElegir, onClose }: { titulo: string; lineas: Reserva[]; accion: string; onElegir: (r: Reserva) => void; onClose: () => void }) {
  return (
    <Modal open title={titulo} onClose={onClose} width={560} footer={<Button variant="secondary" onClick={onClose}>Cancelar</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lineas.map(l => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '10px 12px' }}>
            <span style={{ width: 38, height: 30, borderRadius: radius.sm, background: '#616161', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l.habitacion || '—'}</span>
            <span style={{ flex: 1, fontSize: 12 }}><b style={{ fontWeight: 600 }}>{l.numero}</b> · {l.nombre}<br /><span style={{ color: C.n700 }}>{nombreTipo(l.tipo)} · {fmtF(l.entrada)} → {fmtF(l.salida)}</span></span>
            <Button variant="secondary" onClick={() => onElegir(l)}>{accion}</Button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Cambio de habitación ────────────────────────────────────────────────────
export function CambioHabitacion({ r, onClose, onListo }: { r: Reserva; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const [destino, setDestino] = useState<{ num: string; tipo: string } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [mantener, setMantener] = useState(true);
  const enCasa = r.estado === 'In-House';
  const desde = enCasa ? (r.entrada > HOY ? r.entrada : HOY) : r.entrada;
  if (!destino) return <SeleccionHabitacion titulo={`Cambio de habitación · ${r.habitacion || 'sin asignar'}`} tipo={r.tipo} entrada={desde} salida={r.salida} ignorar={[r.id]} actual={r.habitacion} onClose={onClose} onElegir={(num, tipo) => setDestino({ num, tipo })} />;
  const nuevoPrecio = mantener ? r.precio : precioTarifa(destino.tipo, r.tarifa);
  const confirmar = () => {
    if (enCasa) {
      h.mover(r.id, destino.num, nuevoPrecio, motivo.trim());
      h.registrarBitacora(claveDe(r), 'Habitación cambiada', `Habitación ${r.habitacion}`, `Habitación ${destino.num}${motivo.trim() ? ` · ${motivo.trim()}` : ''}`);
    } else {
      h.asignarHabitacion(r.id, destino.num);
      if (nuevoPrecio !== r.precio) h.editarReserva([{ id: r.id, p: { precio: nuevoPrecio } }], 'Precio total actualizado', fmtMon(r.precio), fmtMon(nuevoPrecio));
    }
    onListo(`Habitación ${r.habitacion || '—'} → ${destino.num}`);
  };
  return (
    <Modal open title="Confirmar cambio de habitación" onClose={onClose} width={520} footer={<><Button variant="secondary" onClick={() => setDestino(null)}>Volver</Button><Button onClick={confirmar}>Confirmar cambio</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
        <p style={{ margin: 0 }}>La línea <b>{r.numero}</b> pasará de la habitación <b>{r.habitacion || 'sin asignar'}</b> ({nombreTipo(r.tipo)}) a la <b>{destino.num}</b> ({nombreTipo(destino.tipo)}).</p>
        {destino.tipo !== r.tipo && <Checkbox checked={mantener} onChange={setMantener} label={`Mantener el precio actual (${fmtMon(r.precio, r.moneda)}). Si no, se aplica ${fmtMon(precioTarifa(destino.tipo, r.tarifa), r.moneda)} de la tarifa ${r.tarifa}.`} />}
        {enCasa && <p style={{ margin: 0, color: C.n700 }}>La habitación {r.habitacion} quedará libre y marcada como sucia.</p>}
        <Campo label="Motivo (opcional)"><TextArea value={motivo} onChange={setMotivo} rows={2} placeholder="Ej. Ruido, upgrade de cortesía…" /></Campo>
      </div>
    </Modal>
  );
}

// ── Prórroga de habitación ──────────────────────────────────────────────────
export function Prorroga({ r, onClose, onListo }: { r: Reserva; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const [salida, setSalida] = useState(sumarDias(r.salida, 1));
  const extra = noches(r.salida, salida);
  const libre = !r.habitacion || habitacionLibre(h.reservas, r.habitacion, r.salida, salida, [r.id]);
  const valida = salida > r.salida && salida > HOY && libre;
  return (
    <Modal open title="Realizar prórroga de habitación" onClose={onClose} width={480}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!valida} onClick={() => { h.prorroga(r.id, salida); onListo(`Prórroga aplicada: salida ${fmtF(salida)}`); }}>Confirmar</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Grid cols={2}>
          <Campo label="Entrada"><Input value={fmtF(r.entrada)} readOnly /></Campo>
          <Campo label="Salida" hint={`Actual: ${fmtF(r.salida)}`}><Input type="date" value={salida} min={sumarDias(r.salida, 1)} onChange={v => v && setSalida(v)} aria-label="Nueva fecha de salida" /></Campo>
        </Grid>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.n200, borderRadius: radius.md, padding: '12px 14px', fontSize: 12 }}>
          <span>Diferencia ({extra} noche{extra === 1 ? '' : 's'} × {fmtMon(r.precio, r.moneda)})</span><b style={{ fontSize: 14, color: C.brand }}>+ {fmtMon(r2(Math.max(0, extra) * r.precio), r.moneda)}</b>
        </div>
        {!libre && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>La habitación {r.habitacion} tiene otra reserva en esas fechas. Haz primero un cambio de habitación.</p>}
      </div>
    </Modal>
  );
}

// ── Agregar habitación (solo reservas Solicitadas) ──────────────────────────
export function AgregarHabitacion({ g, onClose, onListo }: { g: GrupoReserva; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const p = g.principal;
  const [f, setF] = useState({ entrada: p.entrada, salida: p.salida, tipo: p.tipo, uso: usoDe(p), hab: '', adultos: 1, ninos: 0, regimen: p.regimen, precio: precioTarifa(p.tipo, p.tarifa) });
  const [elegir, setElegir] = useState(false);
  const [error, setError] = useState('');
  const set = (x: Partial<typeof f>) => setF(v => ({ ...v, ...x }));
  const guardar = () => {
    if (f.salida <= f.entrada) return setError('La salida debe ser posterior a la entrada.');
    if (f.hab && !habitacionLibre(h.reservas, f.hab, f.entrada, f.salida)) return setError(`La ${f.hab} no está disponible en esas fechas.`);
    const base = numeroDe(p);
    const prefijo = p.numero.split('-')[0];
    const n = g.lineas.length + 1;
    const l = lineaNueva(p, { numero: `${prefijo}-${base}_${n}`, grupo: g.clave, habitacion: f.hab, tipo: f.tipo, entrada: f.entrada, salida: f.salida, adultos: f.adultos, ninos: f.ninos, regimen: f.regimen, precio: f.precio,
      nombre: p.nombre, estado: p.estado, adicionales: [], cargos: [], descuento: 0, creada: p.creada });
    h.agregarLineas(g.clave, [conSaldo(l)]);
    onListo(`Habitación agregada a la reserva ${base}`);
  };
  return (
    <>
      <Modal open title="Agregar habitación" onClose={onClose} width={560} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={guardar}>Guardar</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Grid cols={2}>
            <Campo label="Entrada" required><Input type="date" value={f.entrada} min={HOY} onChange={v => v && set({ entrada: v, salida: v >= f.salida ? sumarDias(v, 1) : f.salida, hab: '' })} /></Campo>
            <Campo label="Salida" required hint={`${noches(f.entrada, f.salida)} noches`}><Input type="date" value={f.salida} min={sumarDias(f.entrada, 1)} onChange={v => v && set({ salida: v, hab: '' })} /></Campo>
            <Campo label="Tipo de habitación" required><Select value={f.tipo} onChange={v => set({ tipo: v, hab: '', precio: precioTarifa(v, p.tarifa) })} options={TIPOS.map(t => ({ value: t.id, label: `${t.codigo} - ${t.nombre}` }))} /></Campo>
            <Campo label="Uso"><Select value={f.uso} onChange={v => set({ uso: v })} options={USOS.map(u => ({ value: u.id, label: `${u.id} - ${u.label}` }))} /></Campo>
            <Campo label="Habitación"><div style={{ display: 'flex', gap: 8 }}><Input value={f.hab || 'Sin asignar'} readOnly /><Button variant="secondary" onClick={() => setElegir(true)}>Seleccionar</Button></div></Campo>
            <Campo label="Régimen"><Select value={f.regimen} onChange={v => set({ regimen: v })} options={Object.entries(REGIMENES).map(([k, v]) => ({ value: k, label: `${k} - ${v}` }))} /></Campo>
            <Campo label="Adultos" required><Input type="number" value={f.adultos} onChange={v => set({ adultos: Math.max(1, Number(v) || 1) })} /></Campo>
            <Campo label="Niños"><Input type="number" value={f.ninos} onChange={v => set({ ninos: Math.max(0, Number(v) || 0) })} /></Campo>
            <Campo label="Precio i.i (por noche)"><Input type="number" value={f.precio} onChange={v => set({ precio: Math.max(0, Number(v) || 0) })} /></Campo>
          </Grid>
          <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Total de la línea: <b style={{ color: C.n900 }}>{fmtMon(f.precio * noches(f.entrada, f.salida), p.moneda)}</b></p>
          {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
        </div>
      </Modal>
      {elegir && <SeleccionHabitacion tipo={f.tipo} entrada={f.entrada} salida={f.salida} actual={f.hab} onClose={() => setElegir(false)} onElegir={(num, tipo) => { set({ hab: num, tipo, precio: tipo !== f.tipo ? precioTarifa(tipo, p.tarifa) : f.precio }); setElegir(false); }} />}
    </>
  );
}

// ── Duplicar reserva ────────────────────────────────────────────────────────
export function DuplicarReserva({ g, onClose, onListo }: { g: GrupoReserva; onClose: () => void; onListo: (clave: string, t: string) => void }) {
  const h = useHotel();
  const p = g.principal;
  const n0 = Math.max(1, noches(p.entrada, p.salida));
  const ini = p.entrada > HOY ? sumarDias(p.salida, 7) : sumarDias(HOY, 7);
  const [entrada, setEntrada] = useState(ini);
  const [salida, setSalida] = useState(sumarDias(ini, n0));
  const [lineas, setLineas] = useState(() => g.lineas.filter(l => l.estado !== 'Anulada').map(l => ({ id: l.id, tipo: l.tipo, adultos: l.adultos, ninos: l.ninos })));
  const [error, setError] = useState('');
  const disponible = (lid: string, tipo: string) => {
    const orig = g.lineas.find(x => x.id === lid)!;
    if (orig.habitacion && orig.tipo === tipo && habitacionLibre(h.reservas, orig.habitacion, entrada, salida)) return orig.habitacion;
    return h.habitaciones.find(x => x.tipo === tipo && x.estado !== 'bloqueada' && habitacionLibre(h.reservas, x.numero, entrada, salida))?.numero ?? '';
  };
  const guardar = () => {
    if (salida <= entrada) return setError('La salida debe ser posterior a la entrada.');
    if (!lineas.length) return setError('La reserva no tiene líneas para duplicar.');
    const base = h.seqReserva;
    const varias = lineas.length > 1;
    const usadas: string[] = [];
    const nuevas = lineas.map((l, i) => {
      const orig = g.lineas.find(x => x.id === l.id)!;
      let hab = disponible(l.id, l.tipo);
      if (usadas.includes(hab)) hab = h.habitaciones.find(x => x.tipo === l.tipo && !usadas.includes(x.numero) && x.estado !== 'bloqueada' && habitacionLibre(h.reservas, x.numero, entrada, salida))?.numero ?? '';
      if (hab) usadas.push(hab);
      return conSaldo(lineaNueva(orig, { numero: varias ? `RD-${base}_${i + 1}` : `RD-${base}`, grupo: varias ? `g${base}` : undefined, entrada, salida, tipo: l.tipo, habitacion: hab, adultos: l.adultos, ninos: l.ninos,
        precio: l.tipo === orig.tipo ? orig.precio : precioTarifa(l.tipo, orig.tarifa) }));
    });
    h.crearReservaGrupo(nuevas, `Reserva duplicada de #${numeroDe(p)}`);
    onListo(claveDe(nuevas[0]), `Reserva ${base} creada como copia de ${numeroDe(p)} (Solicitada)`);
  };
  return (
    <Modal open title="Duplicar reserva" onClose={onClose} width={640} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={guardar}>Duplicar reserva</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Se copian perfil, tarifa, habitaciones, régimen, huéspedes y observaciones. No se copian depósitos, facturas, estado ni bitácora. Puedes duplicar en fechas no disponibles con diferente tipo de habitación.</p>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Periodo de reserva duplicada</span>
        <Grid cols={3}>
          <Campo label="Entrada"><Input type="date" value={entrada} min={HOY} onChange={v => { if (!v) return; setEntrada(v); setSalida(sumarDias(v, Math.max(1, noches(entrada, salida)))); }} /></Campo>
          <Campo label="Salida"><Input type="date" value={salida} min={sumarDias(entrada, 1)} onChange={v => v && setSalida(v)} /></Campo>
          <Campo label="Noches"><Input value={noches(entrada, salida)} readOnly /></Campo>
        </Grid>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr>{['#', 'Tipo de habitación', 'Adultos', 'Niños', 'Habitación'].map(x => <th key={x} style={{ textAlign: 'left', fontWeight: 400, color: C.n700, padding: '6px' }}>{x}</th>)}</tr></thead>
          <tbody>{lineas.map((l, i) => {
            const hab = disponible(l.id, l.tipo);
            return (
              <tr key={l.id} style={{ borderTop: `1px solid ${C.n500}` }}>
                <td style={{ padding: 6 }}>{i + 1}</td>
                <td style={{ padding: 6 }}><Select value={l.tipo} onChange={v => setLineas(lineas.map(x => (x.id === l.id ? { ...x, tipo: v } : x)))} options={TIPOS.map(t => ({ value: t.id, label: t.nombre }))} /></td>
                <td style={{ padding: 6, width: 80 }}><Input type="number" value={l.adultos} onChange={v => setLineas(lineas.map(x => (x.id === l.id ? { ...x, adultos: Math.max(1, Number(v) || 1) } : x)))} /></td>
                <td style={{ padding: 6, width: 80 }}><Input type="number" value={l.ninos} onChange={v => setLineas(lineas.map(x => (x.id === l.id ? { ...x, ninos: Math.max(0, Number(v) || 0) } : x)))} /></td>
                <td style={{ padding: 6, color: hab ? '#2E7D32' : '#B58900' }}>{hab ? `Hab. ${hab} disponible` : 'Sin disponibilidad · se crea sin habitación'}</td>
              </tr>
            );
          })}</tbody>
        </table>
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
      </div>
    </Modal>
  );
}
