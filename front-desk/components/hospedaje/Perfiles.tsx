'use client';
import { useEffect, useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Toast } from '@/components/suite/ui';
import { CheckFila, CheckTodos, Pantalla, useSeleccion } from '@/components/layout/Pantalla';
import { IcPlus } from '@/components/suite/icons';
import { Buscador, norm } from '@/components/configuracion/kit';
import { useHotel } from '@/components/hotel/store';
import { perfilVacio, type Perfil } from '@/components/hotel/datos';
import { BotonExportar, FiltroChecks, MenuBoton, exportarCSV } from '@/components/hotel/ui';
import { useRouter } from 'next/navigation';
import { FormPerfil, digitos } from './perfiles/FormPerfil';
import { Avatar, CabeceraPerfil, EnviarMensaje, Historial, ResumenPerfil, type Vista } from './perfiles/Detalle';

export default function Perfiles() {
  const h = useHotel();
  const [tab, setTab] = useState<'Clientes' | 'Empresas'>('Clientes');
  const [q, setQ] = useState('');
  const [filtros, setFiltros] = useState<{ nac: string[]; hab: string[] }>({ nac: [], hab: [] });
  const [selId, setSelId] = useState<string | null>(null);
  const [modo, setModo] = useState<'ver' | 'editar' | 'crear'>('ver');
  const [nuevoTipo, setNuevoTipo] = useState<'cliente' | 'empresa'>('cliente');
  const [vista, setVista] = useState<Vista>('Resumen');
  const router = useRouter();
  const [mensaje, setMensaje] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // ?id=… abre directamente un perfil (enlaces desde Facturación)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    const p = id ? h.perfiles.find(x => x.id === id) : undefined;
    if (p) queueMicrotask(() => { setTab(p.tipo === 'empresa' ? 'Empresas' : 'Clientes'); setSelId(p.id); setVista('Resumen'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al entrar (abrir el perfil de ?id=)
  }, []);

  const habDe = (p: Perfil) => h.reservas.filter(r => (r.perfilId === p.id || (p.tipo === 'empresa' && r.empresa === p.nombre)) && r.estado === 'In-House').map(r => r.habitacion);
  const lista = h.perfiles.filter(p =>
    p.tipo === (tab === 'Clientes' ? 'cliente' : 'empresa') &&
    (!q || [p.nombre, p.nombreComercial, p.numeroId, digitos(p.numeroId), p.email, p.telefono, p.telefono.replace(/\D/g, '')].some(v => norm(v).includes(norm(q)))) &&
    (!filtros.nac.length || filtros.nac.includes(p.nacionalidad)) &&
    (!filtros.hab.length || habDe(p).some(x => filtros.hab.includes(x)))).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const sel = h.perfiles.find(p => p.id === selId);
  const nFiltros = filtros.nac.length + filtros.hab.length;

  const empezarNuevo = (t: 'cliente' | 'empresa') => { setNuevoTipo(t); setModo('crear'); setSelId(null); setVista('Información'); };

  const s_ = useSeleccion();
  const nacs = [...new Set(h.perfiles.filter(p => p.tipo === (tab === 'Clientes' ? 'cliente' : 'empresa')).map(p => p.nacionalidad).filter(Boolean))].sort();
  const HEAD = ['Nombre', 'Tipo', 'Tipo ID', 'Identificación', 'Nacionalidad', 'Correo', 'Teléfono', 'VIP', 'En casa'];
  const fila = (p: Perfil) => [p.nombre, p.tipo === 'empresa' ? 'Empresa' : 'Cliente', p.tipoId, p.numeroId, p.nacionalidad, p.email, p.telefono, p.extra.vip ? 'Sí' : 'No', habDe(p).join(' ')];
  const criterio = `${tab}${q ? ` · Búsqueda: ${q}` : ''}${filtros.nac.length ? ` · Nacionalidad: ${filtros.nac.join(', ')}` : ''}${filtros.hab.length ? ` · Habitación: ${filtros.hab.join(', ')}` : ''}`;
  const selPerfiles = h.perfiles.filter(p => s_.tiene(p.id));
  return (
    <Pantalla titulo="Perfiles" sinPadding
      acciones={<><BotonExportar titulo={`Perfiles · ${tab}`} criterio={criterio} disabled={!lista.length} onCSV={() => exportarCSV(`perfiles-${tab.toLowerCase()}`, HEAD, lista.map(fila))} />
        <MenuBoton label="Nuevo perfil" variant="primary" ancho={180} opciones={[{ label: 'Cliente', onClick: () => empezarNuevo('cliente') }, { label: 'Empresa', onClick: () => empezarNuevo('empresa') }]} /></>}
      tabs={{ items: ['Clientes', 'Empresas'] as const, activo: tab, onChange: t => { setTab(t); setSelId(null); s_.limpiar(); if (modo !== 'crear') setModo('ver'); } }}
      filtros={<>
        <Buscador value={q} onChange={setQ} placeholder="Buscar por nombre, correo, teléfono o identificación" width={340} />
        {tab === 'Clientes' && <FiltroChecks label="Nacionalidad" value={filtros.nac} onChange={v => setFiltros({ ...filtros, nac: v })} buscar opciones={nacs.map(n => ({ value: n, label: n }))} />}
        <FiltroChecks label="Habitación en casa" value={filtros.hab} onChange={v => setFiltros({ ...filtros, hab: v })} buscar opciones={h.habitaciones.filter(x => x.reservaId).map(x => ({ value: x.numero, label: `Habitación ${x.numero}` }))} />
        {(q || nFiltros > 0) && <Button variant="ghost" onClick={() => { setQ(''); setFiltros({ nac: [], hab: [] }); }}>Limpiar filtros</Button>}
      </>}
      filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>{lista.length} perfiles</span>}
      seleccion={{ n: s_.n, onLimpiar: s_.limpiar, acciones: <>
        <BotonExportar label="Exportar selección" titulo={`Perfiles seleccionados`} onCSV={() => exportarCSV('perfiles-seleccion', HEAD, selPerfiles.map(fila))} />
        {tab === 'Clientes' && <Button variant="secondary" onClick={() => { selPerfiles.forEach(p => h.guardarPerfil({ ...p, extra: { ...p.extra, vip: true } })); setToast(`${selPerfiles.length} perfiles marcados como VIP`); s_.limpiar(); }}>Marcar VIP</Button>}
        {tab === 'Clientes' && <Button variant="secondary" onClick={() => { selPerfiles.forEach(p => h.guardarPerfil({ ...p, extra: { ...p.extra, vip: false } })); setToast(`VIP quitado a ${selPerfiles.length} perfiles`); s_.limpiar(); }}>Quitar VIP</Button>}
      </> }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', fontFamily: FONT, height: '100%' }}>
        <aside style={{ width: 290, flexShrink: 0, background: C.n000, borderRight: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, color: C.n700, borderBottom: `1px solid ${C.n500}` }}><CheckTodos s={s_} ids={lista.map(p => p.id)} />Seleccionar todos</label>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 12px' }}>
            {lista.length === 0 && <p style={{ fontSize: 12, color: C.n700, textAlign: 'center', padding: 20 }}>Sin perfiles que coincidan.</p>}
            {lista.map(p => {
              const on = p.id === selId;
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 0 0 4px', marginBottom: 2, borderRadius: radius.md, border: `1px solid ${on ? C.brandBd : 'transparent'}`, background: on ? C.brandBg : 'transparent' }}>
                  <CheckFila s={s_} id={p.id} label={`Seleccionar ${p.nombre}`} />
                  <button type="button" onClick={() => { setSelId(p.id); setModo('ver'); setVista('Resumen'); }} aria-current={on || undefined}
                    style={{ flex: 1, minWidth: 0, display: 'block', textAlign: 'left', padding: '9px 6px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar nombre={p.nombre} size={30} />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: on ? C.brand : C.n900, fontWeight: 500 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</span>
                          {p.extra.vip && <span title="VIP" style={{ fontSize: 10.5, fontWeight: 600, color: '#8A6100', background: '#FFF4D6', borderRadius: 4, padding: '1px 4px', flexShrink: 0 }}>VIP</span>}
                        </span>
                        <span style={{ display: 'block', fontSize: 11.5, color: habDe(p).length ? '#0E7A57' : C.n700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {habDe(p).length ? `En casa · Hab. ${habDe(p).join(', ')}` : [p.nacionalidad || p.dir.pais, p.email].filter(Boolean).join(' · ') || '—'}</span>
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {modo === 'crear' && (
            <FormPerfil key={'nuevo' + nuevoTipo} inicial={perfilVacio(nuevoTipo)} modo="crear" onCancelar={() => setModo('ver')}
              onGuardar={p => { h.guardarPerfil(p); setTab(p.tipo === 'empresa' ? 'Empresas' : 'Clientes'); setSelId(p.id); setModo('ver'); setToast('Perfil guardado'); }} />
          )}
          {modo !== 'crear' && sel && (
            <>
              <CabeceraPerfil p={sel} vista={vista} setVista={v => { setVista(v); if (v !== 'Información') setModo('ver'); }} onReservar={() => router.push(`/reservaciones/reservas?nueva=1&perfil=${sel.id}`)} onMensaje={() => setMensaje(true)}
                onEditar={() => { setVista('Información'); setModo('editar'); }} />
              {vista === 'Resumen' && <ResumenPerfil p={sel} />}
              {vista === 'Información' && <FormPerfil key={sel.id + modo} inicial={sel} modo={modo} onEditar={() => setModo('editar')} onCancelar={() => setModo('ver')}
                onGuardar={p => { h.guardarPerfil(p); setModo('ver'); setToast('Cambios del perfil guardados'); }} />}
              {vista === 'Historial de reservas' && <Historial p={sel} />}
            </>
          )}
          {modo !== 'crear' && !sel && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: C.n700, fontSize: 12.5, textAlign: 'center' }}>
              <p style={{ margin: 0, maxWidth: 340 }}>Selecciona un perfil de la lista para ver su información e historial de reservas, o crea uno nuevo.</p>
              <Button icon={<IcPlus size={12} />} onClick={() => empezarNuevo(tab === 'Empresas' ? 'empresa' : 'cliente')}>Nuevo {tab === 'Empresas' ? 'perfil de empresa' : 'perfil de cliente'}</Button>
            </div>
          )}
        </div>
      </div>

      {mensaje && sel && <EnviarMensaje p={sel} onClose={() => setMensaje(false)} onListo={t => { setMensaje(false); setToast(t); }} />}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </Pantalla>
  );
}
