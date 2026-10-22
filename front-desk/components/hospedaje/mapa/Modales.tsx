'use client';
// Mapa de habitaciones: modales de asignar llegada, mover huésped, bloquear y prepago.
import { useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Input, Modal, Select } from '@/components/suite/ui';
import { Campo, Grid, TextArea } from '@/components/configuracion/kit';
import { useHotel, totalReserva } from '@/components/hotel/store';
import { HOY, TIPOS, fmtF, noches, sumarDias, type Habitacion, type Reserva } from '@/components/hotel/datos';
import { Alerta, money } from '@/components/hotel/ui';
import { nombreTipo, titulo } from './comun';
import { Resumen } from './Panel';

export function AsignarLlegada({ hab, llegadas, onClose, onListo }: { hab: Habitacion; llegadas: Reserva[]; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const orden = [...llegadas].sort((a, b) => Number(b.tipo === hab.tipo) - Number(a.tipo === hab.tipo));
  return (
    <Modal open onClose={onClose} title={`Asignar llegada a la ${hab.numero}`} width={480} footer={<Button variant="secondary" onClick={onClose}>Cancelar</Button>}>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: C.n700 }}>{nombreTipo(hab.tipo)}{hab.sucia ? ' · la habitación está sucia' : ''}. Primero las llegadas que reservaron este tipo.</p>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {orden.map(r => (
          <button key={r.id} type="button" className="suite-fila" onClick={() => { h.asignarHabitacion(r.id, hab.numero); onListo(`${titulo(r.nombre)} asignado a la ${hab.numero}`); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '10px 8px', border: 'none', borderBottom: `1px solid ${C.n500}`, background: 'none', cursor: 'pointer', fontFamily: FONT }}>
            <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 13 }}>{titulo(r.nombre)}</span><span style={{ fontSize: 11.5, color: C.n700 }}>{r.numero} · {nombreTipo(r.tipo)} · {r.adultos + r.ninos} pers. · {noches(r.entrada, r.salida)} noches</span></span>
            {r.tipo === hab.tipo ? <span style={{ fontSize: 11, color: '#0E7A57' }}>Mismo tipo</span> : <span style={{ fontSize: 11, color: '#B45309' }}>Otro tipo</span>}
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function BloquearVarias({ habs, onClose, onListo }: { habs: Habitacion[]; onClose: () => void; onListo: (n: number) => void }) {
  const h = useHotel();
  const [motivo, setMotivo] = useState('');
  const [hasta, setHasta] = useState('');
  return (
    <Modal open onClose={onClose} title={`Bloquear ${habs.length} habitaciones`} width={460}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!motivo.trim()} onClick={() => { habs.forEach(x => h.bloquear(x.numero, motivo.trim(), hasta)); onListo(habs.length); }}>Bloquear</Button></>}>
      <p style={{ margin: '0 0 10px', fontSize: 12 }}>Habitaciones libres seleccionadas: <b>{habs.map(x => x.numero).join(', ')}</b></p>
      <CamposBloqueo motivo={motivo} setMotivo={setMotivo} hasta={hasta} setHasta={setHasta} />
    </Modal>
  );
}

/** Motivo + «Hasta» (vacío = indefinido). El bloqueo queda registrado en Ama de llaves → Bloqueo de habitaciones. */
function CamposBloqueo({ motivo, setMotivo, hasta, setHasta }: { motivo: string; setMotivo: (v: string) => void; hasta: string; setHasta: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Grid cols={2}>
        <Campo label="Desde"><Input value={fmtF(HOY)} readOnly /></Campo>
        <Campo label="Hasta"><Input type="date" value={hasta} min={sumarDias(HOY, 1)} onChange={setHasta} aria-label="Hasta" /></Campo>
      </Grid>
      <Campo label="Motivo de bloqueo" required><TextArea value={motivo} onChange={setMotivo} rows={3} placeholder="Ej: Mantenimiento preventivo" /></Campo>
      <p style={{ margin: 0, fontSize: 11, color: C.n700 }}>{hasta ? `Bloqueada hasta el ${fmtF(hasta)}.` : 'Sin fecha final: el bloqueo queda indefinido hasta que se desbloquee.'} Se gestiona en Ama de llaves → Bloqueo de habitaciones.</p>
    </div>
  );
}

// ── Mover huésped ───────────────────────────────────────────────────────────
export function MoverHuesped({ reservaId, destino, onClose, onListo }: { reservaId: string; destino?: string; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const r = h.reservas.find(x => x.id === reservaId)!;
  const [tipo, setTipo] = useState(destino ? h.habitaciones.find(x => x.numero === destino)?.tipo ?? '' : '');
  const [hab, setHab] = useState(destino ?? '');
  const [motivo, setMotivo] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const libres = h.habitaciones.filter(x => x.estado === 'libre' && x.numero !== r.habitacion && (!tipo || x.tipo === tipo));
  const nueva = hab ? Math.round((TIPOS.find(t => t.id === h.habitaciones.find(x => x.numero === hab)!.tipo)!.tarifa) * (r.precio / TIPOS.find(t => t.id === r.tipo)!.tarifa)) : r.precio;
  const dif = nueva - r.precio;
  const tarifas = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, fontSize: 12, alignItems: 'center' }}>
      <span style={{ color: C.n700 }}>Tarifa actual</span><span>{money(r.precio)}</span>
      <span>Nueva tarifa</span><span>{money(nueva)}</span>
      <b style={{ fontWeight: 600, borderTop: `1px solid ${C.n500}`, paddingTop: 6 }}>Cambio de tarifa</b>
      <b style={{ fontWeight: 600, borderTop: `1px solid ${C.n500}`, paddingTop: 6, color: dif > 0 ? '#2E7D32' : dif < 0 ? C.error : C.n900 }}>{dif >= 0 ? '+ ' : '- '}{money(Math.abs(dif))}</b>
    </div>
  );
  return (
    <>
      <Modal open onClose={onClose} title="Mover huésped de habitación" width={560}
        footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!hab} onClick={() => setConfirmar(true)}>Confirmar</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Resumen r={r} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Habitación actual</p>
          <Grid cols={2}><Campo label="Tipo de habitación"><Input value={TIPOS.find(t => t.id === r.tipo)?.nombre ?? ''} readOnly /></Campo><Campo label="Habitación"><Input value={`${r.tipo} ${r.habitacion}`} readOnly /></Campo></Grid>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Nueva habitación</p>
          <Grid cols={2}>
            <Campo label="Tipo de habitación"><Select value={tipo} onChange={v => { setTipo(v); setHab(''); }} options={[{ value: '', label: 'Todos los tipos' }, ...TIPOS.map(t => ({ value: t.id, label: t.nombre }))]} /></Campo>
            <Campo label="Habitación" hint={libres.length ? `${libres.length} disponibles` : 'No hay habitaciones libres de este tipo'}>
              <Select value={hab} onChange={setHab} options={[{ value: '', label: 'Selecciona una habitación' }, ...libres.map(x => ({ value: x.numero, label: `${x.numero} · ${x.tipo}${x.sucia ? ' (sucia)' : ''}` }))]} />
            </Campo>
          </Grid>
          <Campo label="Motivo del cambio"><TextArea value={motivo} onChange={setMotivo} rows={2} placeholder="Escribe el motivo del cambio" /></Campo>
          <div style={{ background: C.n200, border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 14 }}>{tarifas}</div>
        </div>
      </Modal>
      <Alerta open={confirmar} titulo="¿Deseas confirmar el cambio de habitación del huésped?" onClose={() => setConfirmar(false)}
        onConfirm={() => { h.mover(r.id, hab, nueva, motivo); onListo(`Huésped movido de la ${r.habitacion} a la ${hab}`); }}>
        <p style={{ margin: '0 0 10px' }}>{dif ? 'Hay un cambio en la tarifa:' : 'La tarifa no cambia.'}</p>
        <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 12, textAlign: 'left' }}>{tarifas}</div>
        {dif !== 0 && <p style={{ margin: '8px 0 0' }}>Ajuste por {noches(HOY, r.salida)} noches restantes: <b>{money(dif * noches(HOY, r.salida))}</b></p>}
      </Alerta>
    </>
  );
}

/** Bloquear una habitación libre, o editar el bloqueo manual vigente (`editar`). */
export function BloquearHab({ hab, editar, onClose, onListo }: { hab: Habitacion; editar?: boolean; onClose: () => void; onListo: () => void }) {
  const h = useHotel();
  const actual = editar ? h.bloqueos.find(b => b.habitacion === hab.numero && !b.tareaId && b.desde <= HOY && (!b.hasta || b.hasta >= HOY)) : undefined;
  const [motivo, setMotivo] = useState(actual?.motivo ?? (editar ? hab.motivoBloqueo : ''));
  const [hasta, setHasta] = useState(actual?.hasta ?? '');
  const deTarea = editar && !actual;
  return (
    <Modal open onClose={onClose} title={`${editar ? 'Editar bloqueo' : 'Bloquear habitación'} ${hab.numero}`} width={460}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={!motivo.trim() || deTarea} onClick={() => { if (editar) h.editarBloqueo(hab.numero, motivo.trim(), hasta); else h.bloquear(hab.numero, motivo.trim(), hasta); onListo(); }}>{editar ? 'Guardar cambios' : 'Bloquear'}</Button></>}>
      {deTarea
        ? <p style={{ margin: 0, fontSize: 12.5, color: C.n700 }}>Este bloqueo viene de una tarea. Se edita desde la tarea en Hospedaje › Tareas o en Ama de llaves › Bloqueo de habitaciones.</p>
        : <CamposBloqueo motivo={motivo} setMotivo={setMotivo} hasta={hasta} setHasta={setHasta} />}
    </Modal>
  );
}

export function Prepago({ reservaId, onClose, onListo }: { reservaId: string; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const r = h.reservas.find(x => x.id === reservaId)!;
  const [monto, setMonto] = useState('');
  const total = totalReserva(r);
  const n = Number(monto);
  return (
    <Modal open onClose={onClose} title={`Prepagos · ${r.numero}`} width={440}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!(n > 0)} onClick={() => { h.prepago(r.id, n); onListo(`Prepago de ${money(n)} aplicado a ${r.numero}`); }}>Registrar prepago</Button></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, fontSize: 12, marginBottom: 14 }}>
        <span style={{ color: C.n700 }}>Total de la estancia</span><span>{money(total)}</span>
        <span style={{ color: C.n700 }}>Pagado</span><span>{money(r.pagado)}</span>
        <b style={{ fontWeight: 600 }}>Pendiente</b><b style={{ fontWeight: 600 }}>{money(Math.max(0, total - r.pagado))}</b>
      </div>
      <Campo label="Monto del prepago (USD)"><Input type="number" value={monto} onChange={setMonto} placeholder="0.00" /></Campo>
    </Modal>
  );
}
