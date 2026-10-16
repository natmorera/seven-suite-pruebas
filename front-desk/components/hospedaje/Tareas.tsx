'use client';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { C, FONT, fmtDate, radius } from '@/components/suite/tokens';
import { Button, Toast } from '@/components/suite/ui';
import { CheckFila, CheckTodos, Pantalla, useSeleccion } from '@/components/layout/Pantalla';
import { IcPlus } from '@/components/suite/icons';
import { Buscador, IcTrash, IconButton, Paginacion, norm, usePaginado } from '@/components/configuracion/kit';
import { useHotel, estadoTarea } from '@/components/hotel/store';
import { ESTADOS_TAREA, TIPOS_TAREA, USUARIOS, tareaAbierta, type Tarea, type TipoTarea } from '@/components/hotel/datos';
import { Alerta, BotonExportar, FiltroChecks, HojaReporte, MenuBoton, TablaImpresa, exportarCSV, usePrint } from '@/components/hotel/ui';
import { COLOR_ESTADO, TABS_T, conLog, puedeAnular, selInline, type TabT } from './tareas/comun';
import { AnularTareas, DetalleTarea } from './tareas/Detalle';
import { ModalBloqueo, ModalTarea } from './tareas/ModalTarea';

export default function Tareas() {
  const h = useHotel();
  const params = useSearchParams();
  const [q, setQ] = useState('');
  const [tipos, setTipos] = useState<string[]>([]);
  const [tab, setTab] = useState<TabT>(() => (ESTADOS_TAREA as readonly string[]).includes(params.get('estado') ?? '') ? params.get('estado') as TabT : 'Pendiente');
  const [creadores, setCreadores] = useState<string[]>([]);
  const [resp, setResp] = useState<string[]>([]);
  const [modal, setModal] = useState<{ tipo: 'nueva' } | { tipo: 'editar'; id: string } | { tipo: 'bloqueo'; id: string; ver: boolean } | { tipo: 'anular'; ids: string[] } | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);
  const [borrar, setBorrar] = useState<Tarea | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const s_ = useSeleccion();
  const [borrarSel, setBorrarSel] = useState(false);
  const { imprimir, portal } = usePrint();

  const filtradas = useMemo(() => h.tareas.map(t => ({ ...t, estado: estadoTarea(t) })).filter(t =>
    (!q || norm(t.tarea).includes(norm(q))) && (!tipos.length || tipos.includes(t.tipo)) &&
    (!creadores.length || creadores.includes(t.creador)) && (!resp.length || resp.includes(t.responsable))), [h.tareas, q, tipos, creadores, resp]);
  const cuenta = (e: TabT) => (e === 'Todas' ? filtradas.length : filtradas.filter(t => t.estado === e).length);
  const lista = useMemo(() => filtradas.filter(t => tab === 'Todas' || t.estado === tab)
    .sort((a, b) => (tab === 'Completado' || tab === 'Anulado' ? b.vencimiento.localeCompare(a.vencimiento) : a.vencimiento.localeCompare(b.vencimiento))), [filtradas, tab]);
  const { pagina, total, setPagina, visibles } = usePaginado(lista, 12);
  const actualizar = (id: string, p: Partial<Tarea>, log?: string) => h.setTareas(ts => ts.map(t => (t.id === id ? (log ? conLog({ ...t, ...p }, log) : { ...t, ...p }) : t)));
  const hayFiltros = q || tipos.length || creadores.length || resp.length;
  const th = { padding: '9px 8px', textAlign: 'left' as const, fontSize: 12, fontWeight: 400, color: C.n700, whiteSpace: 'nowrap' as const };
  const td = { padding: '6px 8px', fontSize: 12, borderTop: `1px solid ${C.n500}`, color: C.n900, whiteSpace: 'nowrap' as const, height: 44 };

  const HEAD = ['Tipo', 'Tarea', 'Inicio', 'Vence', 'Estado', 'Responsable', 'Creador', 'Bloqueo'];
  const filas = () => lista.map(t => [t.tipo, t.tarea, fmtDate(t.inicio), fmtDate(t.vencimiento), t.estado, t.responsable, t.creador, t.bloqueo ? `Hab. ${t.bloqueo.habitaciones.join(', ')}` : '—']);
  const criterio = [`Estado: ${TABS_T.find(x => x.id === tab)!.label}`, q && `Búsqueda: ${q}`, tipos.length && `Tipo: ${tipos.join(', ')}`, creadores.length && `Creador: ${creadores.join(', ')}`, resp.length && `Responsable: ${resp.join(', ')}`].filter(Boolean).join(' · ');
  const selTareas = h.tareas.filter(t => s_.tiene(t.id));
  const anulables = selTareas.filter(puedeAnular);
  const abiertas = selTareas.filter(t => tareaAbierta(t));
  const masivo = (ids: string[], p: Partial<Tarea>, msg: string, log: string) => { h.setTareas(ts => ts.map(t => (ids.includes(t.id) ? conLog({ ...t, ...p }, log) : t))); setToast(msg); s_.limpiar(); };
  const cambiarTab = (t: TabT) => { setTab(t); s_.limpiar(); setPagina(1); };
  const vacio = tab === 'Todas' ? 'No hay tareas. Crea la primera con «Nueva tarea».' : `No hay tareas ${TABS_T.find(x => x.id === tab)!.label.toLowerCase()}${hayFiltros ? ' con estos filtros' : ''}.`;
  return (
    <Pantalla titulo="Tareas"
      acciones={<><BotonExportar titulo="Tareas" criterio={criterio} disabled={!lista.length} onCSV={() => exportarCSV('tareas', HEAD, filas())}
        onPDF={() => imprimir(<HojaReporte titulo="Tareas" filtros={criterio}><TablaImpresa headers={HEAD} filas={filas()} /></HojaReporte>)} />
        <Button icon={<IcPlus size={12} />} onClick={() => setModal({ tipo: 'nueva' })}>Nueva tarea</Button></>}
      tabs={{ items: TABS_T.map(x => ({ id: x.id, label: x.label, count: cuenta(x.id) })), activo: tab, onChange: cambiarTab }}
      filtros={<>
        <Buscador value={q} onChange={setQ} placeholder="Buscar por nombre de tarea" width={260} />
        <FiltroChecks label="Tipo de tarea" value={tipos} onChange={setTipos} opciones={TIPOS_TAREA.map(t => ({ value: t, label: t }))} />
        <FiltroChecks label="Creador" value={creadores} onChange={setCreadores} buscar opciones={USUARIOS.map(u => ({ value: u, label: u }))} />
        <FiltroChecks label="Responsable" value={resp} onChange={setResp} buscar opciones={USUARIOS.map(u => ({ value: u, label: u }))} />
        {hayFiltros ? <Button variant="ghost" onClick={() => { setQ(''); setTipos([]); setCreadores([]); setResp([]); }}>Limpiar filtros</Button> : null}
      </>}
      filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>{lista.length} tareas</span>}
      seleccion={{ n: s_.n, onLimpiar: s_.limpiar, etiqueta: s_.n === 1 ? 'tarea' : 'tareas', acciones: <>
        {abiertas.length > 0 && <Button variant="secondary" onClick={() => masivo(abiertas.map(t => t.id), { estado: 'Completado' }, `${abiertas.length} tareas completadas`, 'Completada (acción masiva)')}>Completar</Button>}
        {abiertas.length > 0 && <MenuBoton label="Cambiar estado" opciones={(['Pendiente', 'En proceso'] as const).map(e => ({ label: e, onClick: () => masivo(abiertas.map(t => t.id), { estado: e }, `${abiertas.length} tareas en «${e}»`, `Estado: ${e}`) }))} />}
        <MenuBoton label="Asignar responsable" ancho={260} opciones={USUARIOS.map(u => ({ label: u, onClick: () => masivo(s_.sel, { responsable: u }, `${s_.n} tareas asignadas a ${u}`, `Responsable: ${u}`) }))} />
        {anulables.length > 0 && <Button variant="secondary" onClick={() => setModal({ tipo: 'anular', ids: anulables.map(t => t.id) })} title="Solo las pendientes se pueden anular">Anular{anulables.length < s_.n ? ` (${anulables.length})` : ''}</Button>}
        <Button variant="secondary" style={{ color: C.error }} onClick={() => setBorrarSel(true)}>Eliminar</Button></> }}>
        <section style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
              <thead><tr><th style={{ ...th, width: 28 }}><CheckTodos s={s_} ids={visibles.map(t => t.id)} /></th>{['Tipo', 'Tarea', 'Inicio', 'Vence', ...(tab === 'Todas' ? ['Estado'] : []), 'Responsable', 'Creador', 'Bloqueo', ''].map(c => <th key={c} style={th}>{c}</th>)}</tr></thead>
              <tbody>
                {visibles.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: C.n700, padding: 30 }}>{vacio}</td></tr>}
                {visibles.map(t => {
                  const cerrada = !tareaAbierta(t);
                  return (
                    <tr key={t.id} className="suite-fila" style={{ background: s_.tiene(t.id) || detalle === t.id ? C.brandBg : undefined, color: cerrada ? C.n700 : undefined }}>
                      <td style={td}><CheckFila s={s_} id={t.id} label={`Seleccionar ${t.tarea}`} /></td>
                      <td style={{ ...td, width: 160 }}>{cerrada ? <span style={{ color: C.n700 }}>{t.tipo}</span>
                        : <select value={t.tipo} onChange={e => actualizar(t.id, { tipo: e.target.value as TipoTarea }, `Tipo: ${e.target.value}`)} aria-label="Tipo de tarea" style={selInline}>{TIPOS_TAREA.map(x => <option key={x}>{x}</option>)}</select>}</td>
                      <td style={td}><button type="button" onClick={() => setDetalle(t.id)} title="Ver detalle"
                        style={{ display: 'block', maxWidth: 230, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: 'none', background: 'none', padding: 0, fontSize: 12, fontFamily: FONT, color: cerrada ? C.n700 : C.brand, cursor: 'pointer', textAlign: 'left', textDecoration: t.estado === 'Anulado' ? 'line-through' : 'none' }}>{t.tarea}</button></td>
                      <td style={td}>{fmtDate(t.inicio)}</td>
                      <td style={{ ...td, color: t.estado === 'Atrasado' ? C.error : undefined }}>{fmtDate(t.vencimiento)}</td>
                      {tab === 'Todas' && <td style={{ ...td, color: COLOR_ESTADO[t.estado] }}>● {t.estado}</td>}
                      <td style={{ ...td, width: 170, maxWidth: 170 }}>{cerrada ? t.responsable
                        : <select value={t.responsable} onChange={e => actualizar(t.id, { responsable: e.target.value }, `Responsable: ${e.target.value}`)} aria-label="Responsable" style={{ ...selInline, width: 160, textOverflow: 'ellipsis' }}>{USUARIOS.map(x => <option key={x}>{x}</option>)}</select>}</td>
                      <td style={td}>{t.creador}</td>
                      <td style={td}>{t.bloqueo
                        ? <button type="button" onClick={() => setModal({ tipo: 'bloqueo', id: t.id, ver: true })} title="Ver bloqueo" style={{ border: 'none', background: cerrada ? C.n200 : '#FDECEA', color: cerrada ? C.n700 : '#C62828', borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontFamily: FONT, cursor: 'pointer', whiteSpace: 'nowrap' }}>Hab. {t.bloqueo.habitaciones.join(', ')}</button>
                        : <span style={{ color: C.n700 }}>—</span>}</td>
                      <td style={{ ...td, width: 76, textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', gap: 2 }}>
                          {!t.bloqueo && !cerrada && <IconButton label={`Bloquear habitación · ${t.tarea}`} onClick={() => setModal({ tipo: 'bloqueo', id: t.id, ver: false })}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></IconButton>}
                          <IconButton label={`Eliminar ${t.tarea}`} tono="peligro" onClick={() => setBorrar(t)}><IcTrash /></IconButton>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {total > 1 && <Paginacion pagina={pagina} total={total} onChange={setPagina} />}
        </section>

      {/* el detalle se oculta mientras hay un modal encima y vuelve al cerrarlo */}
      {detalle && !modal && !borrar && h.tareas.some(t => t.id === detalle) && <DetalleTarea id={detalle} onClose={() => setDetalle(null)}
        onEditar={() => setModal({ tipo: 'editar', id: detalle })} onBloqueo={ver => setModal({ tipo: 'bloqueo', id: detalle, ver })}
        onAnular={() => setModal({ tipo: 'anular', ids: [detalle] })} onEliminar={() => setBorrar(h.tareas.find(t => t.id === detalle)!)} onToast={setToast} />}
      {modal?.tipo === 'nueva' && <ModalTarea onClose={() => setModal(null)} onListo={t => { setModal(null); setToast(t); }} />}
      {modal?.tipo === 'editar' && <ModalTarea id={modal.id} onClose={() => setModal(null)} onListo={t => { setModal(null); setToast(t); }} />}
      {modal?.tipo === 'bloqueo' && <ModalBloqueo tareaId={modal.id} soloLectura={modal.ver} onClose={() => setModal(null)} onListo={t => { setModal(null); setToast(t); }} />}
      {modal?.tipo === 'anular' && <AnularTareas ids={modal.ids} onClose={() => setModal(null)} onListo={t => { setModal(null); s_.limpiar(); setToast(t); }} />}
      <Alerta open={!!borrar} titulo={`¿Eliminar la tarea «${borrar?.tarea}»?`} tono="danger" confirmar="Sí, eliminar" onClose={() => setBorrar(null)}
        onConfirm={() => { h.setTareas(ts => ts.filter(t => t.id !== borrar!.id)); setToast('Tarea eliminada'); if (detalle === borrar!.id) setDetalle(null); setBorrar(null); }}>
        {borrar?.bloqueo && tareaAbierta(borrar) ? <>Esta tarea tiene un bloqueo activo: se liberarán las habitaciones <b>{borrar.bloqueo.habitaciones.join(', ')}</b>.</> : 'Esta acción no se puede deshacer.'}
      </Alerta>
      <Alerta open={borrarSel} titulo={`¿Eliminar ${s_.n} tareas?`} tono="danger" confirmar="Sí, eliminar" onClose={() => setBorrarSel(false)}
        onConfirm={() => { h.setTareas(ts => ts.filter(t => !s_.tiene(t.id))); setToast(`${s_.n} tareas eliminadas`); s_.limpiar(); setBorrarSel(false); }}>
        Esta acción no se puede deshacer. Si alguna tenía bloqueo de habitaciones, las habitaciones se liberarán.
      </Alerta>
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </Pantalla>
  );
}
