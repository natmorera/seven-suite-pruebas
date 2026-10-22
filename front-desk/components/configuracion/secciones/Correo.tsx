'use client';
import { BarraSeccion, TabsEnBarra } from '@/components/layout/Pantalla';
import { BotonExportar, exportarCSV } from '@/components/hotel/ui';
import { useMemo, useState } from 'react';
import { C, FONT, fmtDate, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Select, StatusBadge, Switch } from '@/components/suite/ui';
import { useDato, usePatch } from '../store';
import {
  Buscador, CabeceraDetalle, CardTabs, MaestroDetalle, Campo, Celda, ConfigCard, Fila, FilaVacia, Grid, IcCheckLine, IcEdit, ItemMaestro, Paginacion,
  Tabla, norm, uid, useConfirmar, usePaginado,
} from '../kit';
import type { CorreoEspecial, CuentaCorreo } from '../datos';

const TABS = ['Cuenta', 'Correos especiales', 'Notificaciones', 'Histórico de correos enviados'] as const;

/** El título de la tarjeta es la pestaña (no se repite «Correo electrónico»). */
const AYUDA: Record<(typeof TABS)[number], string> = {
  'Cuenta': 'Cuentas desde las que el sistema envía confirmaciones, facturas y avisos.',
  'Correos especiales': 'Correos automáticos que se envían al huésped en momentos clave de la estancia.',
  'Notificaciones': 'Quién recibe los avisos automáticos de cada proceso.',
  'Histórico de correos enviados': 'Registro de todos los correos que envió el sistema.',
};

export default function Correo() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Cuenta');
  return (
    <ConfigCard title={tab} subtitle={AYUDA[tab]}>
      <TabsEnBarra items={TABS} activo={tab} onChange={setTab} />
      {tab === 'Cuenta' && <Cuentas />}
      {tab === 'Correos especiales' && <Especiales />}
      {tab === 'Notificaciones' && <Notificaciones />}
      {tab === 'Histórico de correos enviados' && <Historico />}
    </ConfigCard>
  );
}

/** Correos que reciben los avisos automáticos de cada proceso. Se admiten varios separados por coma. */
function Notificaciones() {
  const [g, patch] = usePatch('general');
  const invalido = (v: string) => v.split(',').map(x => x.trim()).filter(Boolean).some(x => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ margin: 0, fontSize: 12.5, color: C.n700 }}>Para varios destinatarios, sepáralos con coma.</p>
      <Grid cols={2}>
        {Object.entries(g.alertas).map(([k, v]) => (
          <Campo key={k} label={k} error={invalido(v) ? 'Revisa el formato del correo.' : undefined}>
            <Input type="text" value={v} placeholder="correo@hotel.com" onChange={x => patch({ alertas: { ...g.alertas, [k]: x } })} />
          </Campo>
        ))}
      </Grid>
    </div>
  );
}

/** Maestro-detalle estándar del kit (misma lista y recuadro que Producción, Servicios y Contratos). */
const PEST_CUENTA = ['Servidor', 'Datos predefinidos', 'Otros'] as const;

function Maestro({ children, lista, titulo, contador }: { children: React.ReactNode; lista: React.ReactNode; titulo: string; contador?: number }) {
  return <MaestroDetalle titulo={titulo} contador={contador} lista={lista} anchoLista={250}>{children}</MaestroDetalle>;
}

/** Editor «Predefinir datos» (Responder a / Copiar a / Asunto / Cuerpo). */
function Predefinir({ v, set, disabled }: { v: { responderA: string; copiarA: string; asunto: string; cuerpo: string }; set: (p: Partial<typeof v>) => void; disabled?: boolean }) {
  const linea = (label: string, k: 'responderA' | 'copiarA' | 'asunto', ph: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.n500}`, padding: '10px 0', fontSize: 12, fontFamily: FONT }}>
      <span style={{ color: C.n700, width: 84, flexShrink: 0 }}>{label}</span>
      <input value={v[k]} onChange={e => set({ [k]: e.target.value })} placeholder={ph} disabled={disabled}
        style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, fontFamily: FONT, background: 'transparent', color: C.n900 }} />
    </label>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {linea('Responder a:', 'responderA', 'Ingresa un correo')}
      {linea('Copiar a:', 'copiarA', 'Ingresa un correo')}
      {linea('Asunto:', 'asunto', 'Ingresa el asunto del correo')}
      <textarea value={v.cuerpo} onChange={e => set({ cuerpo: e.target.value })} placeholder="Ingresa el cuerpo del correo..." disabled={disabled} rows={7}
        style={{ border: 'none', outline: 'none', resize: 'vertical', fontSize: 12, fontFamily: FONT, padding: '14px 0', color: C.n900, background: 'transparent', lineHeight: 1.6 }} />
    </div>
  );
}

function Cuentas() {
  const [cuentas, setCuentas] = useDato('cuentasCorreo');
  const [selId, setSelId] = useState(cuentas[0]?.id ?? '');
  const [q, setQ] = useState('');
  const [editar, setEditar] = useState(false);
  const [pest, setPest] = useState<(typeof PEST_CUENTA)[number]>('Servidor');
  const [verif, setVerif] = useState<{ ok: boolean; msg: string } | null>(null);
  const { pedir, dialogo } = useConfirmar();
  const sel = cuentas.find(c => c.id === selId) ?? cuentas[0];
  const set = (p: Partial<CuentaCorreo>) => sel && setCuentas(cs => cs.map(c => (c.id === sel.id ? { ...c, ...p } : c)));

  const nuevo = () => {
    const c: CuentaCorreo = { id: uid(), correo: 'nuevo@dominio.com', titulo: 'Nueva cuenta', descripcion: '', servidor: '', remitente: '', usuario: '', contrasena: '', puerto: '587', firma: '',
      ssl: true, auth: true, oauth: false, cuenta: '', clienteId: '', secreto: '', responderA: '', copiarA: '', asunto: '', cuerpo: '', asuntoReserva: '' };
    setCuentas(cs => [...cs, c]); setSelId(c.id); setEditar(true); setVerif(null);
  };
  const verificar = () => {
    if (!sel) return;
    const faltan = [!sel.servidor && 'servidor SMTP', !sel.puerto && 'puerto', !/^\S+@\S+\.\S+$/.test(sel.correo) && 'correo válido', sel.auth && !sel.usuario && 'usuario'].filter(Boolean);
    setVerif(faltan.length ? { ok: false, msg: `No se pudo verificar: falta ${faltan.join(', ')}.` } : { ok: true, msg: `Conexión con ${sel.servidor}:${sel.puerto} lista. Se enviará un correo de prueba a ${sel.correo}.` });
  };
  const filtradas = cuentas.filter(c => norm(c.correo).includes(norm(q)));
  const dis = !editar;
  const inp = (k: keyof CuentaCorreo, label: string, type = 'text') => (
    <Campo label={label}><Input value={String(sel?.[k] ?? '')} type={type} onChange={v => set({ [k]: v })} placeholder="Ingresa el valor" disabled={dis} /></Campo>
  );

  return (
    <Maestro titulo="Cuentas de correo" contador={filtradas.length} lista={<>
      <BarraSeccion filtros={<Buscador value={q} onChange={setQ} placeholder="Buscar correo" width={240} />}
        acciones={<><BotonExportar disabled={!filtradas.length} titulo="Cuentas de correo" onCSV={() => exportarCSV('cuentas-correo', ['Título', 'Correo', 'Descripción'], filtradas.map(c => [c.titulo, c.correo, c.descripcion ?? '']))} /><Button onClick={nuevo}>Nuevo correo</Button></>}
        derecha={<span style={{ fontSize: 12, color: C.n700 }}>{filtradas.length} cuentas</span>} />
      <div>
        {filtradas.map(c => (
          <ItemMaestro key={c.id} titulo={c.correo} detalle={c.titulo} activo={c.id === sel?.id} onClick={() => { setSelId(c.id); setEditar(false); setVerif(null); }} />
        ))}
      </div>
    </>}>
      {sel ? <>
        <CabeceraDetalle titulo={editar ? 'Editar cuenta' : sel.titulo} sub={editar ? undefined : sel.descripcion || sel.correo}
          acciones={<>
            <Button variant="secondary" icon={<IcCheckLine />} onClick={verificar}>Verificar correo</Button>
            <Button variant="secondary" icon={<IcEdit />} onClick={() => setEditar(e => !e)}>{editar ? 'Terminar edición' : 'Editar información'}</Button>
          </>}
          onEliminar={cuentas.length <= 1 ? undefined : () => pedir('Eliminar cuenta', `¿Eliminar la cuenta ${sel.correo}?`, () => { setCuentas(cs => cs.filter(c => c.id !== sel.id)); setSelId(''); })} />
        {editar && <Grid cols={2}><Campo label="Título"><Input value={sel.titulo} onChange={v => set({ titulo: v })} /></Campo><Campo label="Correo"><Input type="email" value={sel.correo} onChange={v => set({ correo: v })} /></Campo></Grid>}
        {verif && <div role="status" style={{ fontSize: 12, padding: '8px 12px', borderRadius: radius.control, background: verif.ok ? 'rgba(76,175,80,.08)' : 'rgba(244,67,54,.06)', color: verif.ok ? '#2E7D32' : '#C62828' }}>{verif.msg}</div>}
        <CardTabs tabs={PEST_CUENTA} active={pest} onChange={setPest} />
        {pest === 'Servidor' && <>
          <Grid cols={3}>
            {inp('servidor', 'Servidor SMTP')}{inp('remitente', 'Remitente')}{inp('usuario', 'Usuario')}
            {inp('contrasena', 'Contraseña', 'password')}{inp('puerto', 'Puerto', 'number')}{inp('firma', 'Firma')}
          </Grid>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {([['ssl', 'SSL'], ['auth', 'Autenticación SMTP'], ['oauth', 'Habilitar OAuth2']] as const).map(([k, l]) =>
              <Checkbox key={k} checked={sel[k]} onChange={b => !dis && set({ [k]: b })} label={l} />)}
          </div>
          {sel.oauth && <Grid cols={3}>{inp('cuenta', 'Cuenta')}{inp('clienteId', 'ID de Cliente')}{inp('secreto', 'Secreto del Cliente', 'password')}</Grid>}
        </>}
        {pest === 'Datos predefinidos' && <Predefinir v={sel} set={set} disabled={dis} />}
        {pest === 'Otros' && <Campo label="Asunto correo de reserva"><Input value={sel.asuntoReserva} onChange={v => set({ asuntoReserva: v })} disabled={dis} placeholder="Ingresa el asunto" /></Campo>}
      </> : <p style={{ fontSize: 12, color: C.n700 }}>Agrega una cuenta de correo con «Nuevo correo».</p>}
      {dialogo}
    </Maestro>
  );
}

function Especiales() {
  const [lista, setLista] = useDato('correosEspeciales');
  const [cuentas] = useDato('cuentasCorreo');
  const [selId, setSelId] = useState(lista[0]?.id ?? '');
  const sel = lista.find(c => c.id === selId) ?? lista[0];
  const set = (p: Partial<CorreoEspecial>) => sel && setLista(ls => ls.map(c => (c.id === sel.id ? { ...c, ...p } : c)));
  return (
    <Maestro titulo="Correos especiales" contador={lista.length} lista={lista.map(c => (
      <ItemMaestro key={c.id} titulo={c.nombre} detalle={c.activo ? c.disparador : 'Desactivado'} activo={c.id === sel?.id} onClick={() => setSelId(c.id)} />
    ))}>
      {sel && <>
        <CabeceraDetalle titulo={sel.nombre} sub={`Se envía: ${sel.disparador.toLowerCase()}.`} acciones={<Switch checked={sel.activo} onChange={b => set({ activo: b })} label={sel.activo ? 'Activo' : 'Inactivo'} />} />
          <Campo label="Enviar desde">
            <Select value={sel.remitente} onChange={v => set({ remitente: v })} options={cuentas.map(c => ({ value: c.correo, label: c.correo }))} />
          </Campo>
          <Predefinir v={sel} set={set} />
          <p style={{ fontSize: 11, color: C.n700, margin: 0 }}>Variables disponibles: {'{huesped}'}, {'{numero}'}, {'{llegada}'}, {'{salida}'}, {'{factura}'}.</p>
      </>}
    </Maestro>
  );
}

function Historico() {
  const [hist] = useDato('historicoCorreos');
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const filtradas = useMemo(() => hist.filter(h => (!estado || h.estado === estado) && norm(`${h.correo} ${h.remitente} ${h.mensaje}`).includes(norm(q))), [hist, q, estado]);
  const { pagina, total, setPagina, visibles, filas: nFilas, tam } = usePaginado(filtradas);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BarraSeccion
        filtros={<><Buscador value={q} onChange={setQ} placeholder="Buscar por correo o mensaje" width={260} /><div style={{ width: 160 }}><Select value={estado} onChange={setEstado} options={[{ value: '', label: 'Todos los estados' }, { value: 'Enviado', label: 'Enviado' }, { value: 'Fallido', label: 'Fallido' }]} /></div></>}
        acciones={<BotonExportar disabled={!filtradas.length} titulo="Histórico de correos" criterio={`Estado: ${estado || 'Todos'}${q ? ` · «${q}»` : ''}`} onCSV={() => exportarCSV('historico-correos', ['Correo', 'Remitente', 'Mensaje', 'Fecha', 'Estado'], filtradas.map(h => [h.correo, h.remitente, h.mensaje, fmtDate(h.fecha), h.estado]))} />}
        derecha={<span style={{ fontSize: 12, color: C.n700 }}>{filtradas.length} correos</span>} />
      <Tabla headers={['Correo', 'Remitente', 'Mensaje', 'Fecha', 'Estado']}>
        {visibles.length === 0 && <FilaVacia cols={5} />}
        {visibles.map(h => (
          <Fila key={h.id}>
            <Celda>{h.correo}</Celda><Celda muted>{h.remitente}</Celda><Celda>{h.mensaje}</Celda><Celda>{fmtDate(h.fecha)}</Celda>
            <Celda><StatusBadge label={h.estado} color={h.estado === 'Enviado' ? 'green' : 'red'} /></Celda>
          </Fila>
        ))}
      </Tabla>
      <Paginacion pagina={pagina} total={total} onChange={setPagina} filas={nFilas} porPagina={tam} />
    </div>
  );
}

