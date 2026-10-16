'use client';
// Tareas: detalle en panel lateral (datos, bloqueo, recordatorio, historial y acciones) y anulación con motivo.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, fmtDate, radius, shadow, Z } from '@/components/suite/tokens';
import { Button, Modal } from '@/components/suite/ui';
import { Campo, TextArea } from '@/components/configuracion/kit';
import { useHotel, estadoTarea, nuevoId } from '@/components/hotel/store';
import { HOY, USUARIO_ACTUAL, tareaAbierta, type Tarea } from '@/components/hotel/datos';
import { MenuBoton } from '@/components/hotel/ui';
import { COLOR_ESTADO, ahora, conLog, puedeAnular } from './comun';

// ── Detalle de la tarea (panel lateral de solo lectura, con las acciones) ───
export function DetalleTarea({ id, onClose, onEditar, onBloqueo, onAnular, onEliminar, onToast }: {
  id: string; onClose: () => void; onEditar: () => void; onBloqueo: (ver: boolean) => void; onAnular: () => void; onEliminar: () => void; onToast: (t: string) => void;
}) {
  const h = useHotel();
  const t0 = h.tareas.find(t => t.id === id)!;
  const t = { ...t0, estado: estadoTarea(t0) };
  const abierta = tareaAbierta(t);
  const dias = Math.round((new Date(t.vencimiento + 'T12:00:00').getTime() - new Date(HOY + 'T12:00:00').getTime()) / 86400000);
  const plazo = !abierta ? '' : dias < 0 ? `Venció hace ${-dias} ${dias === -1 ? 'día' : 'días'}` : dias === 0 ? 'Vence hoy' : `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`;
  const cambiar = (estado: Tarea['estado'], msg: string) => { h.setTareas(ts => ts.map(x => (x.id === id ? conLog({ ...x, estado }, `Estado: ${estado}`) : x))); onToast(msg); };
  const historial = [{ fecha: `${t.inicio}T08:00`, usuario: t.creador, texto: 'Tarea creada' }, ...(t.historial ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const fila = (l: string, v: React.ReactNode) => <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, fontSize: 12.5, padding: '6px 0' }}><span style={{ color: C.n700 }}>{l}</span><span>{v}</span></div>;
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: Z.modal, fontFamily: FONT }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,15,15,.25)' }} />
      <aside role="dialog" aria-label={`Detalle de la tarea ${t.tarea}`} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(460px, 100vw)', background: C.n000, boxShadow: shadow.modal, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: C.n700, background: C.n200, borderRadius: radius.pill, padding: '2px 10px' }}>{t.tipo}</span>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: COLOR_ESTADO[t.estado], background: `color-mix(in srgb, ${COLOR_ESTADO[t.estado]} 10%, transparent)`, borderRadius: radius.pill, padding: '2px 10px' }}>● {t.estado}</span>
            <button type="button" aria-label="Cerrar detalle" onClick={onClose} style={{ marginLeft: 'auto', border: 'none', background: 'none', fontSize: 18, color: C.n700, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: C.n900, textDecoration: t.estado === 'Anulado' ? 'line-through' : 'none' }}>{t.tarea}</h2>
          {plazo && <span style={{ fontSize: 12, color: dias < 0 ? C.error : dias === 0 ? '#B45309' : C.n700 }}>{plazo}</span>}
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {t.estado === 'Anulado' && t.anulacion && <div style={{ background: C.n200, borderRadius: radius.md, padding: 12, fontSize: 12, lineHeight: 1.5 }}><b style={{ fontWeight: 600 }}>Anulada</b> el {fmtDate(t.anulacion.fecha.slice(0, 10))} por {t.anulacion.usuario}.<br />Motivo: {t.anulacion.motivo}</div>}
          <div>
            {fila('Responsable', t.responsable)}
            {fila('Creada por', t.creador)}
            {fila('Inicio', fmtDate(t.inicio))}
            {fila('Vencimiento', <span style={{ color: t.estado === 'Atrasado' ? C.error : undefined }}>{fmtDate(t.vencimiento)}</span>)}
            {t.descripcion && fila('Descripción', t.descripcion)}
          </div>
          <section style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: 12.5, fontWeight: 600 }}>Bloqueo de habitaciones</b>
              {abierta && <button type="button" onClick={() => onBloqueo(!!t.bloqueo)} style={{ border: 'none', background: 'none', color: C.brand, fontSize: 12, cursor: 'pointer', fontFamily: FONT }}>{t.bloqueo ? 'Ver / editar' : 'Bloquear habitaciones'}</button>}
            </div>
            {t.bloqueo ? <span style={{ fontSize: 12.5 }}>Hab. <b style={{ fontWeight: 600 }}>{t.bloqueo.habitaciones.join(', ')}</b> · {fmtDate(t.bloqueo.inicio)} – {fmtDate(t.bloqueo.fin)}{t.bloqueo.motivo ? ` · ${t.bloqueo.motivo}` : ''}{!abierta && <span style={{ color: C.n700 }}> (liberado)</span>}</span>
              : <span style={{ fontSize: 12, color: C.n700 }}>Sin bloqueo.</span>}
          </section>
          <section style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <b style={{ fontSize: 12.5, fontWeight: 600 }}>Recordatorio</b>
            {t.recordatorio ? <span style={{ fontSize: 12.5 }}>{t.recordatorio.cuando} del vencimiento · a {t.recordatorio.enviarA.toLowerCase()} · {[t.recordatorio.canales.sistema && 'sistema', t.recordatorio.canales.email && 'email', t.recordatorio.canales.whatsapp && 'WhatsApp'].filter(Boolean).join(', ')}</span>
              : <span style={{ fontSize: 12, color: C.n700 }}>Sin recordatorio.</span>}
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <b style={{ fontSize: 12.5, fontWeight: 600 }}>Historial</b>
            {historial.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? C.brand : C.n500, marginTop: 4, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{e.texto}<span style={{ display: 'block', color: C.n700, fontSize: 11 }}>{fmtDate(e.fecha.slice(0, 10))} {e.fecha.slice(11, 16)} · {e.usuario}</span></span>
              </div>
            ))}
          </section>
        </div>
        <footer style={{ borderTop: `1px solid ${C.n500}`, padding: '12px 20px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {t.estado === 'Pendiente' && <Button onClick={() => cambiar('En proceso', 'Tarea en proceso')}>Iniciar</Button>}
          {abierta && <Button onClick={() => cambiar('Completado', 'Tarea completada')} variant={t.estado === 'Pendiente' ? 'secondary' : 'primary'} style={t.estado === 'Pendiente' ? { color: '#2E7D32' } : undefined}>Completar</Button>}
          {!abierta && t.estado === 'Completado' && <Button variant="secondary" onClick={() => cambiar('Pendiente', 'Tarea reabierta')}>Reabrir</Button>}
          {abierta && <Button variant="secondary" onClick={onEditar}>Editar</Button>}
          <MenuBoton label="Más" align="right" ancho={210} opciones={[
            { label: 'Duplicar tarea', onClick: () => { h.setTareas(ts => [...ts, { ...t0, id: nuevoId('t'), estado: 'Pendiente', creador: USUARIO_ACTUAL, bloqueo: null, anulacion: undefined, historial: [] }]); onToast('Tarea duplicada'); } },
            ...(puedeAnular(t0) ? [{ label: 'Anular tarea', onClick: onAnular }] : []),
            { label: 'Eliminar tarea', onClick: onEliminar, peligro: true },
          ]} />
          {t.estado === 'Atrasado' && <span style={{ fontSize: 11, color: C.n700, flexBasis: '100%' }}>Una tarea atrasada no se puede anular; solo eliminar.</span>}
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

// ── Anular (solo pendientes) con motivo obligatorio ─────────────────────────
export function AnularTareas({ ids, onClose, onListo }: { ids: string[]; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const [motivo, setMotivo] = useState('');
  const ts = h.tareas.filter(t => ids.includes(t.id) && puedeAnular(t));
  const anular = () => {
    const fecha = ahora();
    h.setTareas(xs => xs.map(t => (ts.some(y => y.id === t.id) ? conLog({ ...t, estado: 'Anulado', anulacion: { fecha, usuario: USUARIO_ACTUAL, motivo: motivo.trim() } }, `Anulada: ${motivo.trim()}`) : t)));
    onListo(ts.length === 1 ? 'Tarea anulada' : `${ts.length} tareas anuladas`);
  };
  return (
    <Modal open onClose={onClose} title={ts.length === 1 ? 'Anular tarea' : `Anular ${ts.length} tareas`} width={460}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="danger" disabled={!motivo.trim() || !ts.length} onClick={anular}>Anular</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5 }}>{ts.length === 1 ? <>La tarea <b>{ts[0].tarea}</b> quedará anulada.</> : `Se anularán ${ts.length} tareas pendientes.`} Queda en la pestaña «Anuladas» con su motivo{ts.some(t => t.bloqueo) ? ' y se liberan las habitaciones bloqueadas' : ''}.</p>
        <Campo label="Motivo de la anulación" required><TextArea value={motivo} onChange={setMotivo} rows={3} placeholder="Ej: el huésped canceló el servicio" /></Campo>
        <p style={{ margin: 0, fontSize: 11, color: C.n700 }}>Solo se pueden anular tareas pendientes. Una tarea atrasada ya no se anula: se elimina.</p>
      </div>
    </Modal>
  );
}
