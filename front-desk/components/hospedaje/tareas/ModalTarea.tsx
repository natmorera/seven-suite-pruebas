'use client';
// Tareas: crear / editar tarea (responsables, bloqueo y recordatorio) y bloqueo de habitaciones de una tarea.
import { useState } from 'react';
import { C, fmtDate, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal, Select, Switch } from '@/components/suite/ui';
import { IcClose } from '@/components/suite/icons';
import { Campo, Grid, MultiSelect, TextArea } from '@/components/configuracion/kit';
import { useHotel, estadoTarea, nuevoId } from '@/components/hotel/store';
import { HOY, TIPOS, TIPOS_TAREA, USUARIOS, USUARIO_ACTUAL, correoUsuario, sumarDias, type Bloqueo, type Recordatorio, type Tarea, type TipoTarea } from '@/components/hotel/datos';
import { Alerta } from '@/components/hotel/ui';
import { CUANDO, conLog } from './comun';

/** Opciones de habitaciones agrupables por tipo con su estado de limpieza. */
function useOpcionesHab() {
  const h = useHotel();
  return h.habitaciones.map(x => ({ value: x.numero, label: `${x.numero} · ${x.sucia ? 'Sucia' : 'Limpia'}${x.estado === 'bloqueada' ? ' · Bloqueada' : ''}`, detalle: TIPOS.find(t => t.id === x.tipo)?.codigo }));
}

function SeccionToggle({ titulo, on, onChange, estado, children }: { titulo: string; on: boolean; onChange: (b: boolean) => void; estado: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{titulo}</span>
        <Switch checked={on} onChange={onChange} label={<span style={{ color: C.n700, fontSize: 12 }}>{estado}</span>} />
      </div>
      {on && <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeIn .2s' }}>{children}</div>}
    </div>
  );
}

/** `conBloqueo`: abre con la sección de bloqueo activa (desde el detalle de la tarea). */
export function ModalTarea({ id, onClose, onListo, conBloqueo }: { id?: string; onClose: () => void; onListo: (t: string) => void; conBloqueo?: boolean }) {
  const h = useHotel();
  const original = id ? h.tareas.find(t => t.id === id) : undefined;
  const [f, setF] = useState({
    tipo: original?.tipo ?? ('' as TipoTarea | ''), tarea: original?.tarea ?? '', responsables: original ? [original.responsable] : [] as string[],
    inicio: original?.inicio ?? HOY, vencimiento: original?.vencimiento ?? sumarDias(HOY, 1), estado: original?.estado ?? 'Pendiente',
    bloqueo: original?.bloqueo ?? (conBloqueo ? { habitaciones: [], inicio: original?.inicio && original.inicio > HOY ? original.inicio : HOY, fin: original?.vencimiento ?? sumarDias(HOY, 1), motivo: original?.tarea ?? '' } : null) as Bloqueo | null, recordatorio: original?.recordatorio ?? null as Recordatorio | null,
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const [salir, setSalir] = useState(false);
  const [quitarBloqueo, setQuitarBloqueo] = useState(false);
  const [cambiosClave, setCambiosClave] = useState<string[] | null>(null);
  const opcionesHab = useOpcionesHab();
  const inicial = useState(() => JSON.stringify(f))[0];
  const sucio = JSON.stringify(f) !== inicial;
  const rec = f.recordatorio;
  const setRec = (p: Partial<Recordatorio>) => setF(v => ({ ...v, recordatorio: { ...v.recordatorio!, ...p } }));
  const destinatarios = !rec ? [] : rec.enviarA === 'Creador de la tarea' ? [original?.creador ?? USUARIO_ACTUAL] : rec.enviarA === 'Ambos' ? [...new Set([...f.responsables, original?.creador ?? USUARIO_ACTUAL])] : f.responsables;

  const validar = () => {
    const e: Record<string, string> = {};
    if (!f.tipo) e.tipo = 'Obligatorio';
    if (!f.tarea.trim()) e.tarea = 'Obligatorio';
    if (!f.responsables.length) e.resp = 'Agrega al menos un responsable';
    if (!f.inicio) e.inicio = 'Obligatorio';
    if (!id && !f.vencimiento) e.venc = 'Obligatorio';
    if (!id && f.vencimiento < f.inicio) e.venc = 'Debe ser igual o posterior al inicio';
    if (f.bloqueo) {
      if (!f.bloqueo.habitaciones.length) e.bHab = 'Selecciona habitaciones';
      if (!f.bloqueo.inicio || !f.bloqueo.fin) e.bFechas = 'Indica inicio y fin';
      else if (f.bloqueo.fin < f.bloqueo.inicio) e.bFechas = 'El fin debe ser posterior al inicio';
      const ocupadas = f.bloqueo.habitaciones.filter(n => { const x = h.habitaciones.find(y => y.numero === n)!; return ['ocupada', 'checkout'].includes(x.estado) && f.bloqueo!.inicio <= HOY; });
      if (ocupadas.length) e.bHab = `Las habitaciones ${ocupadas.join(', ')} están ocupadas hoy: el bloqueo se aplicará cuando queden libres.`;
    }
    if (rec) {
      if (!rec.canales.sistema && !rec.canales.email) e.canales = 'Selecciona al menos un canal';
    }
    setErr(e);
    return !Object.keys(e).filter(k => !(k === 'bHab' && e.bHab.includes('se aplicará'))).length;
  };

  const guardar = () => {
    if (!validar()) return;
    const base = { tipo: f.tipo as TipoTarea, tarea: f.tarea.trim(), inicio: f.inicio, vencimiento: f.vencimiento, bloqueo: f.bloqueo, recordatorio: f.recordatorio };
    if (id) {
      const [primero, ...resto] = f.responsables;
      h.setTareas(ts => [...ts.map(t => (t.id === id ? conLog({ ...t, ...base, responsable: primero, estado: f.estado === 'Atrasado' ? 'Pendiente' : f.estado }, 'Tarea editada') : t)),
        ...resto.map(r => ({ ...base, id: nuevoId('t'), responsable: r, creador: USUARIO_ACTUAL, estado: 'Pendiente' as const, bloqueo: null }))]);
      onListo(resto.length ? `Tarea actualizada y ${resto.length} copia(s) creadas para los demás responsables` : 'Tarea actualizada');
    } else {
      // Asignación masiva: una tarea individual por responsable (el bloqueo queda en la primera)
      h.setTareas(ts => [...ts, ...f.responsables.map((r, i) => ({ ...base, id: nuevoId('t'), responsable: r, creador: USUARIO_ACTUAL, estado: 'Pendiente' as const, bloqueo: i === 0 ? f.bloqueo : null }))]);
      onListo(f.responsables.length > 1 ? `Se crearon ${f.responsables.length} tareas, una por responsable` : 'Tarea creada');
    }
  };
  const intentarCerrar = () => (sucio ? setSalir(true) : onClose());
  const toggleBloqueo = (b: boolean) => {
    if (b) setF({ ...f, bloqueo: { habitaciones: [], inicio: f.inicio, fin: f.vencimiento, motivo: '' } });
    else if (original?.bloqueo) setQuitarBloqueo(true);
    else setF({ ...f, bloqueo: null });
  };

  return (
    <>
      <Modal open onClose={intentarCerrar} width={600} title={id ? 'Editar tarea' : 'Crear nueva tarea'}
        footer={id ? <><Button variant="secondary" onClick={intentarCerrar}>Cancelar</Button><Button disabled={!sucio} onClick={() => {
          const cambios = [original && f.tipo !== original.tipo && `el tipo (${original.tipo} → ${f.tipo})`, original && f.responsables[0] !== original.responsable && `el responsable (${original.responsable} → ${f.responsables.join(', ')})`].filter(Boolean) as string[];
          if (cambios.length && validar()) setCambiosClave(cambios); else guardar();
        }}>Guardar cambios</Button></>
          : <><Button variant="secondary" onClick={intentarCerrar}>Cancelar</Button><Button onClick={guardar}>Crear tarea</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Campo label="Tipo de tarea" required error={err.tipo}><Select value={f.tipo} onChange={v => setF({ ...f, tipo: v as TipoTarea })} error={err.tipo} options={[{ value: '', label: 'Seleccionar' }, ...TIPOS_TAREA.map(t => ({ value: t, label: t }))]} /></Campo>
          <Campo label="Tarea" required error={err.tarea}><Input value={f.tarea} onChange={v => setF({ ...f, tarea: v })} error={err.tarea} placeholder="Ej: Reparación de techo Hab 112" /></Campo>
          <Campo label="Responsable" required error={err.resp} hint={!id && f.responsables.length > 1 ? `Se creará una tarea individual para cada uno de los ${f.responsables.length} responsables.` : undefined}>
            <MultiSelect value={f.responsables} onChange={v => setF({ ...f, responsables: v })} opciones={USUARIOS.map(u => ({ value: u, label: u }))} placeholder="Agregar responsables" buscar="Buscar usuario" resumen={s => `${s.length} responsable${s.length > 1 ? 's' : ''}`} />
            {f.responsables.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>{f.responsables.map(r => (
              <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: radius.pill, background: C.brandBg, border: `1px solid ${C.brandBd}`, fontSize: 11.5, color: C.brand }}>
                {r}<button type="button" aria-label={`Quitar ${r}`} onClick={() => setF({ ...f, responsables: f.responsables.filter(x => x !== r) })} style={{ border: 'none', background: 'none', color: C.brand, cursor: 'pointer', padding: 0, display: 'flex' }}><IcClose size={10} /></button>
              </span>))}</div>}
          </Campo>
          <Grid cols={id ? 2 : 2}>
            <Campo label="Inicio" required error={err.inicio}><Input type="date" value={f.inicio} onChange={v => setF({ ...f, inicio: v })} /></Campo>
            {id
              ? <Campo label="Estado" hint={original && estadoTarea(original) === 'Atrasado' ? 'Atrasada: venció sin completarse' : undefined}>
                  <Select value={f.estado === 'Atrasado' ? 'Pendiente' : f.estado} onChange={v => setF({ ...f, estado: v as Tarea['estado'] })} disabled={f.estado === 'Completado'}
                    options={(f.estado === 'Completado' ? ['Completado'] : ['Pendiente', 'En proceso']).map(e => ({ value: e, label: e }))} />
                </Campo>
              : <Campo label="Vencimiento" required error={err.venc}><Input type="date" value={f.vencimiento} min={f.inicio} onChange={v => setF({ ...f, vencimiento: v })} error={err.venc} /></Campo>}
          </Grid>

          <SeccionToggle titulo="Bloquear habitaciones" on={!!f.bloqueo} onChange={toggleBloqueo} estado={f.bloqueo ? 'Bloqueo activo' : 'Sin bloqueo de habitación'}>
            {f.bloqueo && <>
              <Campo label="Habitaciones a bloquear" required error={err.bHab}>
                <MultiSelect value={f.bloqueo.habitaciones} onChange={v => setF({ ...f, bloqueo: { ...f.bloqueo!, habitaciones: v.sort() } })} opciones={opcionesHab} placeholder="Seleccionar habitaciones" buscar="Buscar habitación" />
              </Campo>
              <Grid cols={2}>
                <Campo label="Inicio" required error={err.bFechas}><Input type="date" value={f.bloqueo.inicio} onChange={v => setF({ ...f, bloqueo: { ...f.bloqueo!, inicio: v } })} /></Campo>
                <Campo label="Fin" required><Input type="date" value={f.bloqueo.fin} min={f.bloqueo.inicio} onChange={v => setF({ ...f, bloqueo: { ...f.bloqueo!, fin: v } })} /></Campo>
              </Grid>
              <Campo label="Motivo de bloqueo"><TextArea value={f.bloqueo.motivo} onChange={v => setF({ ...f, bloqueo: { ...f.bloqueo!, motivo: v } })} rows={2} placeholder="Escribe el motivo de bloqueo" /></Campo>
            </>}
          </SeccionToggle>

          <SeccionToggle titulo="Agregar recordatorio" on={!!rec} estado={rec ? 'Recordatorio activo' : 'Sin recordatorio'}
            onChange={b => setF({ ...f, recordatorio: b ? { enviarA: 'Responsable de la tarea', canales: { sistema: true, email: false, whatsapp: false }, contactos: {}, cuando: '1 hora antes' } : null })}>
            {rec && <>
              <Campo label="Enviar recordatorio a" required>
                <Select value={rec.enviarA} onChange={v => setRec({ enviarA: v as Recordatorio['enviarA'] })} options={['Responsable de la tarea', 'Creador de la tarea', 'Ambos'].map(x => ({ value: x, label: x }))} />
              </Campo>
              <Campo label="Canales de envío" required error={err.canales}>
                <div style={{ display: 'flex', gap: 20 }}>
                  {([['sistema', 'En sistema'], ['email', 'Correo electrónico']] as const).map(([k, l]) => <Checkbox key={k} checked={rec.canales[k]} onChange={b => setRec({ canales: { ...rec.canales, [k]: b } })} label={l} />)}
                </div>
              </Campo>
              {rec.canales.email && (destinatarios.length === 0
                ? <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Agrega responsables para enviarles el correo.</p>
                : <div style={{ background: C.n200, borderRadius: radius.md, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <span style={{ color: C.n700 }}>Se envía al correo de cada usuario:</span>
                    {destinatarios.map(d => <span key={d}><b style={{ fontWeight: 500 }}>{d}</b> · {correoUsuario(d)}</span>)}
                  </div>)}
              <Campo label="Cuándo recordar" required><Select value={rec.cuando} onChange={v => setRec({ cuando: v })} options={CUANDO.map(x => ({ value: x, label: `${x} del vencimiento` }))} /></Campo>
            </>}
          </SeccionToggle>
        </div>
      </Modal>
      <Alerta open={!!cambiosClave} titulo="¿Guardar los cambios de la tarea?" confirmar="Sí, guardar" onClose={() => setCambiosClave(null)}
        onConfirm={() => { setCambiosClave(null); guardar(); }}>Vas a cambiar {cambiosClave?.join(' y ')}.</Alerta>
      <Alerta open={salir} titulo="¿Deseas salir?" tono="danger" confirmar="Salir sin guardar" onClose={() => setSalir(false)} onConfirm={onClose}>Los cambios no se guardarán.</Alerta>
      <Alerta open={quitarBloqueo} titulo="¿Quitar el bloqueo de habitaciones?" tono="danger" confirmar="Sí, quitar" onClose={() => setQuitarBloqueo(false)}
        onConfirm={() => { setF({ ...f, bloqueo: null }); setQuitarBloqueo(false); }}>Al guardar se liberarán las habitaciones {original?.bloqueo?.habitaciones.join(', ')}.</Alerta>
    </>
  );
}

export function ModalBloqueo({ tareaId, soloLectura, onClose, onListo }: { tareaId: string; soloLectura: boolean; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const t = h.tareas.find(x => x.id === tareaId)!;
  const [ver, setVer] = useState(soloLectura);
  const [b, setB] = useState<Bloqueo>(t.bloqueo ?? { habitaciones: [], inicio: HOY, fin: t.vencimiento >= HOY ? t.vencimiento : HOY, motivo: '' });
  const [error, setError] = useState('');
  const opciones = useOpcionesHab();
  const guardar = () => {
    if (!b.habitaciones.length) return setError('Selecciona al menos una habitación.');
    if (!b.inicio || !b.fin || b.fin < b.inicio) return setError('Revisa las fechas de inicio y fin.');
    h.setTareas(ts => ts.map(x => (x.id === tareaId ? { ...x, bloqueo: b } : x)));
    onListo(`Habitaciones ${b.habitaciones.join(', ')} bloqueadas del ${fmtDate(b.inicio)} al ${fmtDate(b.fin)}`);
  };
  return (
    <Modal open onClose={onClose} title="Bloqueo de habitación" width={500}
      footer={ver
        ? <><Button variant="danger" style={{ marginRight: 'auto' }} onClick={() => { h.setTareas(ts => ts.map(x => (x.id === tareaId ? { ...x, bloqueo: null } : x))); onListo('Bloqueo eliminado; habitaciones liberadas'); }}>Quitar bloqueo</Button>
            <Button variant="secondary" onClick={() => setVer(false)} style={{ color: C.brand }}>Editar bloqueo</Button></>
        : <><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={guardar}>Bloquear</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Tarea: <b style={{ color: C.n900, fontWeight: 500 }}>{t.tarea}</b></p>
        <Campo label="Habitaciones a bloquear" required>
          {ver ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{b.habitaciones.map(n => <div key={n} style={{ background: C.n200, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '7px 10px', fontSize: 12, color: C.n700 }}>Habitación {n} · {TIPOS.find(tp => tp.id === h.habitaciones.find(x => x.numero === n)?.tipo)?.nombre}</div>)}</div>
            : <MultiSelect value={b.habitaciones} onChange={v => setB({ ...b, habitaciones: v.sort() })} opciones={opciones} placeholder="Seleccionar habitaciones" buscar="Buscar habitación" />}
        </Campo>
        <Grid cols={2}>
          <Campo label="Inicio"><Input type="date" value={b.inicio} onChange={v => setB({ ...b, inicio: v })} disabled={ver} /></Campo>
          <Campo label="Fin"><Input type="date" value={b.fin} min={b.inicio} onChange={v => setB({ ...b, fin: v })} disabled={ver} /></Campo>
        </Grid>
        <Campo label="Motivo de bloqueo"><TextArea value={b.motivo} onChange={v => setB({ ...b, motivo: v })} rows={2} disabled={ver} placeholder="Escribe el motivo de bloqueo" /></Campo>
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
      </div>
    </Modal>
  );
}
