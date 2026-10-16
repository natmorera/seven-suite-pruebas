'use client';
import { BarraSeccion, TabsEnBarra } from '@/components/layout/Pantalla';
import { BotonExportar, exportarCSV } from '@/components/hotel/ui';
import { useMemo, useState } from 'react';
import { C, FONT, fmtDate, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Select, StatusBadge, Switch } from '@/components/suite/ui';
import { useDato } from '../store';
import {
  Buscador, Campo, Celda, ConfigCard, Fila, FilaVacia, Grid, IcCheckLine, IcEdit, IcTrash, IconButton, ItemMaestro, Paginacion,
  SubCard, Tabla, norm, uid, useConfirmar, usePaginado,
} from '../kit';
import type { CorreoEspecial, CuentaCorreo } from '../datos';

const TABS = ['Cuenta', 'Correos especiales', 'Histórico de correos enviados'] as const;

export default function Correo() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Cuenta');
  return (
    <ConfigCard title="Correo electrónico">
      <TabsEnBarra items={TABS} activo={tab} onChange={setTab} />
      {tab === 'Cuenta' && <Cuentas />}
      {tab === 'Correos especiales' && <Especiales />}
      {tab === 'Histórico de correos enviados' && <Historico />}
    </ConfigCard>
  );
}

function Maestro({ children, lista }: { children: React.ReactNode; lista: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderRight: `1px solid ${C.n500}`, paddingRight: 16, minHeight: 300 }}>{lista}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>{children}</div>
    </div>
  );
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
    <Maestro lista={<>
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
        <SubCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              {editar
                ? <Grid cols={2}><Campo label="Título"><Input value={sel.titulo} onChange={v => set({ titulo: v })} /></Campo><Campo label="Correo"><Input type="email" value={sel.correo} onChange={v => set({ correo: v })} /></Campo></Grid>
                : <><p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{sel.titulo}</p><p style={{ fontSize: 12, color: C.n700, margin: '3px 0 0' }}>{sel.descripcion || sel.correo}</p></>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" icon={<IcCheckLine />} onClick={verificar} style={{ color: C.brand, borderColor: C.brandBd }}>Verificar correo</Button>
              <Button variant="secondary" icon={<IcEdit />} onClick={() => setEditar(e => !e)}>{editar ? 'Terminar edición' : 'Editar información'}</Button>
              <IconButton label={`Eliminar ${sel.correo}`} tono="peligro" disabled={cuentas.length <= 1}
                onClick={() => pedir('Eliminar cuenta', `¿Eliminar la cuenta ${sel.correo}?`, () => { setCuentas(cs => cs.filter(c => c.id !== sel.id)); setSelId(''); })}><IcTrash /></IconButton>
            </div>
          </div>
          {verif && <div role="status" style={{ fontSize: 12, padding: '8px 12px', borderRadius: radius.control, background: verif.ok ? 'rgba(76,175,80,.08)' : 'rgba(244,67,54,.06)', color: verif.ok ? '#2E7D32' : '#C62828' }}>{verif.msg}</div>}
          <Grid cols={3}>
            {inp('servidor', 'Servidor SMTP')}{inp('remitente', 'Remitente')}{inp('usuario', 'Usuario')}
            {inp('contrasena', 'Contraseña', 'password')}{inp('puerto', 'Puerto', 'number')}{inp('firma', 'Firma')}
          </Grid>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {([['ssl', 'SSL'], ['auth', 'Autenticación SMTP'], ['oauth', 'Habilitar OAuth2']] as const).map(([k, l]) =>
              <Checkbox key={k} checked={sel[k]} onChange={b => !dis && set({ [k]: b })} label={l} />)}
          </div>
          {sel.oauth && <Grid cols={3}>{inp('cuenta', 'Cuenta')}{inp('clienteId', 'ID de Cliente')}{inp('secreto', 'Secreto del Cliente', 'password')}</Grid>}
        </SubCard>
        <SubCard title="Predefinir datos"><Predefinir v={sel} set={set} disabled={dis} /></SubCard>
        <SubCard title="Otros">
          <Campo label="Asunto correo de reserva"><Input value={sel.asuntoReserva} onChange={v => set({ asuntoReserva: v })} disabled={dis} placeholder="Ingresa el asunto" /></Campo>
        </SubCard>
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
    <Maestro lista={lista.map(c => (
      <ItemMaestro key={c.id} titulo={c.nombre} detalle={c.activo ? c.disparador : 'Desactivado'} activo={c.id === sel?.id} onClick={() => setSelId(c.id)} />
    ))}>
      {sel && <>
        <SubCard title={sel.nombre} hint={`Se envía: ${sel.disparador.toLowerCase()}.`} actions={<Switch checked={sel.activo} onChange={b => set({ activo: b })} label={sel.activo ? 'Activo' : 'Inactivo'} />}>
          <Campo label="Enviar desde">
            <Select value={sel.remitente} onChange={v => set({ remitente: v })} options={cuentas.map(c => ({ value: c.correo, label: c.correo }))} />
          </Campo>
          <Predefinir v={sel} set={set} />
          <p style={{ fontSize: 11, color: C.n700, margin: 0 }}>Variables disponibles: {'{huesped}'}, {'{numero}'}, {'{llegada}'}, {'{salida}'}, {'{factura}'}.</p>
        </SubCard>
      </>}
    </Maestro>
  );
}

function Historico() {
  const [hist] = useDato('historicoCorreos');
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const filtradas = useMemo(() => hist.filter(h => (!estado || h.estado === estado) && norm(`${h.correo} ${h.remitente} ${h.mensaje}`).includes(norm(q))), [hist, q, estado]);
  const { pagina, total, setPagina, visibles } = usePaginado(filtradas);
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
      <Paginacion pagina={pagina} total={total} onChange={setPagina} />
    </div>
  );
}

