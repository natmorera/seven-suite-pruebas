'use client';
import { TabsEnBarra } from '@/components/layout/Pantalla';
import { useMemo, useRef, useState } from 'react';
import { C, FONT, fmtDate, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Select, StatusBadge, Switch } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { usePatch } from '../store';
import Dega from './Dega';
import {
  Aviso, Campo, Celda, ConfigCard, Fila, FilaVacia, Grid, IcCheckLine, IcTrash, IcUpload, IconButton, InputAfijo, LinkButton, PillTabs, Popover, SubCard, Tabla, TextArea, uid,
} from '../kit';

const SUB = ['Información', 'Apariencia', 'Condiciones'] as const;
const PRESETS = ['#213C89', '#1984D9', '#04760F', '#2E6A4D', '#A77600', '#B3261E', '#6E3FD6', '#0F0F0F'];

/** Mezcla un color con blanco: el «secundario» es el principal al 20 %. */
const al20 = (hex: string) => {
  const h = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(h)) return '#F2F7FE';
  return '#' + [0, 2, 4].map(i => Math.round(parseInt(h.slice(i, i + 2), 16) * 0.2 + 255 * 0.8).toString(16).padStart(2, '0')).join('').toUpperCase();
};

// Integraciones: Seven Web Check In (3 pestañas) y Seven DEGA en una sola sección.
const TABS_INT = ['Web Check In', 'Formulario Check-In', 'Errores de sincronización', 'DEGA'] as const;
export default function Integraciones() {
  const [tab, setTab] = useState<(typeof TABS_INT)[number]>('Web Check In');
  const [w] = usePatch('webCheckin');
  const sinLeer = w.errores.filter(e => !e.leido).length;
  return (
    <>
      <TabsEnBarra items={TABS_INT.map(t => ({ id: t, count: t === 'Errores de sincronización' && sinLeer ? sinLeer : undefined }))} activo={tab} onChange={setTab} />
      {tab === 'DEGA' ? <Dega /> : (
        <ConfigCard title={tab === 'Web Check In' ? 'Seven Web Check In · Parámetros generales' : `Seven Web Check In · ${tab}`}>
          {tab === 'Web Check In' && <Parametros />}
          {tab === 'Formulario Check-In' && <Formulario />}
          {tab === 'Errores de sincronización' && <Errores />}
        </ConfigCard>
      )}
    </>
  );
}

function Parametros() {
  const [w, patch] = usePatch('webCheckin');
  const [validacion, setValidacion] = useState<{ ok: boolean; msgs: string[] } | null>(null);
  const urlOk = /^https:\/\/[^\s/$.?#].[^\s]*$/i.test(w.apiUrl);
  const tokenOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(w.token);
  const validar = () => {
    const msgs: string[] = [];
    if (!urlOk) msgs.push('La API URL debe empezar con https://');
    if (!tokenOk) msgs.push('El token debe tener formato UUID.');
    if (!/^\d+$/.test(w.cliente)) msgs.push('El ID de cliente debe ser numérico.');
    if (w.recordatorio >= w.primerCorreo) msgs.push('El recordatorio debe enviarse después del primer correo (menos horas antes del check-in).');
    setValidacion(msgs.length ? { ok: false, msgs } : { ok: true, msgs: [`Configuración válida. Las solicitudes se enviarán a ${w.apiUrl.replace(/\/$/, '')} con el cliente ${w.cliente}.`] });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SubCard title="Conexión de API" actions={<Button variant="secondary" icon={<IcCheckLine />} onClick={validar} style={{ color: C.brand, borderColor: C.brandBd }}>Validar</Button>}>
        <Grid cols={2}>
          <Campo label="API URL" required hint="Endpoint base para las solicitudes del Web Check-In" error={w.apiUrl && !urlOk ? 'Debe ser una URL https://' : undefined}>
            <Input value={w.apiUrl} onChange={v => patch({ apiUrl: v.trim() })} placeholder="https://node.myhotelpeak.com" error={w.apiUrl && !urlOk ? 'x' : undefined} />
          </Campo>
          <Campo label="Token" required error={w.token && !tokenOk ? 'Formato UUID esperado' : undefined}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={w.token} onChange={v => patch({ token: v.trim() })} error={w.token && !tokenOk ? 'x' : undefined} />
              <Button variant="secondary" onClick={() => patch({ token: crypto.randomUUID() })}>Generar</Button>
            </div>
          </Campo>
        </Grid>
        <Grid cols={3}>
          <Campo label="Cliente" required><Input value={w.cliente} onChange={v => patch({ cliente: v.replace(/\D/g, '') })} inputMode="numeric" /></Campo>
          <Campo label="Primer correo" hint="Horas antes del check-in para enviar el primer correo">
            <InputAfijo type="number" value={w.primerCorreo} onChange={v => patch({ primerCorreo: Math.max(0, Number(v) || 0) })} sufijo="horas antes" />
          </Campo>
          <Campo label="Recordatorio" hint="Horas antes del check-in para enviar el recordatorio">
            <InputAfijo type="number" value={w.recordatorio} onChange={v => patch({ recordatorio: Math.max(0, Number(v) || 0) })} sufijo="horas antes" />
          </Campo>
        </Grid>
        {validacion && (
          <div role="status" style={{ fontSize: 12, padding: '8px 12px', borderRadius: radius.control, background: validacion.ok ? 'rgba(76,175,80,.08)' : 'rgba(244,67,54,.06)', color: validacion.ok ? '#2E7D32' : '#C62828' }}>
            {validacion.msgs.map(m => <div key={m}>{m}</div>)}
          </div>
        )}
      </SubCard>
    </div>
  );
}

function Formulario() {
  const [sub, setSub] = useState<(typeof SUB)[number]>('Información');
  return (
    <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden' }}>
      <div style={{ background: C.n200, padding: 8 }}><PillTabs tabs={SUB} active={sub} onChange={setSub} /></div>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sub === 'Información' && <Informacion />}
        {sub === 'Apariencia' && <Apariencia />}
        {sub === 'Condiciones' && <Condiciones />}
      </div>
    </div>
  );
}

function Hora({ label, v, onChange }: { label: string; v: { activo: boolean; hora: string }; onChange: (v: { activo: boolean; hora: string }) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Checkbox checked={v.activo} onChange={b => onChange({ ...v, activo: b })} label={label} />
      <div style={{ width: 180 }}><Input type="time" value={v.hora} onChange={h => onChange({ ...v, hora: h })} disabled={!v.activo} aria-label={label} /></div>
    </div>
  );
}

function Informacion() {
  const [w, patch] = usePatch('webCheckin');
  return (
    <>
      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Información básica</h4>
      <Campo label="Dirección"><Input value={w.direccion} onChange={v => patch({ direccion: v })} placeholder="Ingresa la dirección del hotel" /></Campo>
      <div style={{ borderTop: `1px solid ${C.n500}` }} />
      <div>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Campos obligatorios</h4>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: C.n700 }}>Selecciona los datos que el huésped debe completar de forma obligatoria.</p>
      </div>
      <Grid cols={4}>
        {Object.entries(w.obligatorios).map(([grupo, campos]) => (
          <div key={grupo} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{grupo}</span>
            {Object.entries(campos).map(([c, v]) => (
              <Checkbox key={c} checked={v} label={c} onChange={b => patch({ obligatorios: { ...w.obligatorios, [grupo]: { ...campos, [c]: b } } })} />
            ))}
          </div>
        ))}
      </Grid>
      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Información adicional</h4>
      <Checkbox checked={w.placa} onChange={b => patch({ placa: b })} label="Placa del vehículo" />
      <Grid cols={2} style={{ maxWidth: 420 }}>
        <Hora label="Hora de salida" v={w.horaSalida} onChange={v => patch({ horaSalida: v })} />
        <Hora label="Hora de entrada" v={w.horaEntrada} onChange={v => patch({ horaEntrada: v })} />
      </Grid>
    </>
  );
}

function SelectorColor({ label, value, onApply, hint }: { label: string; value: string; onApply: (v: string) => void; hint?: string }) {
  const [open, setOpen] = useState(false);
  const [borrador, setBorrador] = useState(value);
  const valido = /^#[0-9a-f]{6}$/i.test(borrador);
  return (
    <Campo label={label} hint={hint}>
      <div style={{ position: 'relative' }}>
        <button type="button" onClick={() => { setBorrador(value); setOpen(true); }} className="suite-campo"
          style={{ width: '100%', height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, background: C.n000, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', cursor: 'pointer', fontFamily: FONT, fontSize: 12 }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, background: value, border: `1px solid ${C.n500}` }} />{value.toUpperCase()}
        </button>
        <Popover open={open} onClose={() => setOpen(false)} width={250}>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
              {PRESETS.map(p => (
                <button key={p} type="button" aria-label={p} onClick={() => setBorrador(p)}
                  style={{ aspectRatio: '1', borderRadius: 4, background: p, border: borrador.toUpperCase() === p ? `2px solid ${C.n900}` : `1px solid ${C.n500}`, cursor: 'pointer' }} />
              ))}
            </div>
            <input type="color" value={valido ? borrador : '#213C89'} onChange={e => setBorrador(e.target.value.toUpperCase())} aria-label="Selector de color" style={{ width: '100%', height: 34, border: 'none', padding: 0, background: 'none' }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: C.n700 }}>Color:</span>
              <Input value={borrador} onChange={setBorrador} error={valido ? undefined : 'x'} aria-label="Hexadecimal" />
            </div>
            <Button onClick={() => { if (valido) { onApply(borrador.toUpperCase()); setOpen(false); } }} disabled={!valido}>Aplicar</Button>
          </div>
        </Popover>
      </div>
    </Campo>
  );
}

function Apariencia() {
  const [w, patch] = usePatch('webCheckin');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const subir = (f: File) => {
    if (!/^image\/(png|jpeg)$/.test(f.type)) return setError('Solo se aceptan archivos PNG o JPEG.');
    if (f.size > 1024 * 1024) return setError('El archivo supera el tamaño máximo de 1 MB.');
    const r = new FileReader();
    r.onload = () => { patch({ logo: String(r.result), logoNombre: f.name }); setError(''); };
    r.readAsDataURL(f);
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 20, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Grid cols={2}>
          <SelectorColor label="Color principal" value={w.colorPrincipal} onApply={v => patch({ colorPrincipal: v, colorSecundario: al20(v) })} />
          <SelectorColor label="Color secundario" value={w.colorSecundario} onApply={v => patch({ colorSecundario: v })} hint="Por defecto, el principal al 20 %" />
        </Grid>
        <Campo label="Logo del portal">
          <div
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) subir(f); }}
            style={{ border: `1.5px dashed ${C.brandBd}`, borderRadius: radius.md, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: C.brandBg }}>
            <span style={{ color: C.brand }}><IcUpload size={22} /></span>
            <LinkButton onClick={() => input.current?.click()}>Subir el logo del hotel</LinkButton>
            <span style={{ fontSize: 11, color: C.n700 }}>Archivos compatibles: PNG, JPEG · Tamaño máximo 1 MB · También puedes arrastrarlo aquí</span>
            <input ref={input} type="file" accept="image/png,image/jpeg" hidden onChange={e => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = ''; }} />
          </div>
        </Campo>
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>{error}</p>}
        {w.logoNombre && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '6px 10px' }}>
            <span style={{ fontSize: 12, flex: 1 }}>{w.logoNombre}</span>
            <IconButton label="Quitar logo" tono="peligro" onClick={() => patch({ logo: '', logoNombre: '' })}><IcTrash /></IconButton>
          </div>
        )}
      </div>
      <div>
        <span style={{ fontSize: 12, color: C.n700 }}>Vista previa</span>
        <div style={{ marginTop: 6, border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden', fontFamily: FONT, background: w.colorSecundario }}>
          <div style={{ background: w.colorPrincipal, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen generada por un servicio externo de QR */}
            {w.logo ? <img src={w.logo} alt="Logo" style={{ maxHeight: 26, maxWidth: 120 }} /> : <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>Tu hotel</span>}
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.n900 }}>Check-in en línea</span>
            <div style={{ height: 24, background: '#fff', borderRadius: 4, border: `1px solid ${C.n500}` }} />
            <div style={{ height: 24, background: '#fff', borderRadius: 4, border: `1px solid ${C.n500}` }} />
            <div style={{ height: 26, background: w.colorPrincipal, borderRadius: 4, color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Continuar</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Condiciones() {
  const [w, patch] = usePatch('webCheckin');
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Condiciones del hotel</h4>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: C.n700 }}>Si activas esta opción, tu cliente deberá autorizar las condiciones agregadas antes de finalizar el Check-In.</p>
        </div>
        <Switch checked={w.usarCondiciones} onChange={b => patch({ usarCondiciones: b })} />
      </div>
      {w.condiciones.map((c, i) => (
        <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', opacity: w.usarCondiciones ? 1 : 0.5 }}>
          <span style={{ fontSize: 12, color: C.n700, paddingTop: 10, width: 18 }}>{i + 1}.</span>
          <TextArea value={c.texto} rows={2} disabled={!w.usarCondiciones} placeholder="Ej: No se permiten mascotas"
            onChange={v => patch({ condiciones: w.condiciones.map(x => (x.id === c.id ? { ...x, texto: v } : x)) })} />
          <IconButton label="Quitar condición" tono="peligro" disabled={!w.usarCondiciones} onClick={() => patch({ condiciones: w.condiciones.filter(x => x.id !== c.id) })}><IcTrash /></IconButton>
        </div>
      ))}
      <div><LinkButton onClick={() => w.usarCondiciones && patch({ condiciones: [...w.condiciones, { id: uid(), texto: '' }] })} style={{ textDecoration: 'none', opacity: w.usarCondiciones ? 1 : 0.5 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IcPlus size={12} /> Agregar nueva condición o restricción</span>
      </LinkButton></div>
    </>
  );
}

function Errores() {
  const [w, patch] = usePatch('webCheckin');
  const [filtro, setFiltro] = useState('');
  const lista = useMemo(() => w.errores.filter(e => !filtro || (filtro === 'no') === !e.leido), [w.errores, filtro]);
  const marcar = (id: string, b: boolean) => patch({ errores: w.errores.map(e => (e.id === id ? { ...e, leido: b } : e)) });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Aviso>Log de errores de comunicación entre Web Check-In y el PMS. Úsalo para diagnosticar problemas de integración.</Aviso>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ width: 180 }}><Select value={filtro} onChange={setFiltro} options={[{ value: '', label: 'Todos' }, { value: 'no', label: 'No leídos' }, { value: 'si', label: 'Leídos' }]} /></div>
        <Button variant="secondary" disabled={!w.errores.some(e => !e.leido)} onClick={() => patch({ errores: w.errores.map(e => ({ ...e, leido: true })) })}>Marcar todos como leídos</Button>
      </div>
      <Tabla headers={['Fecha', 'Descripción', 'Leído']} anchos={{ 0: 110, 2: 90 }}>
        {lista.length === 0 && <FilaVacia cols={3} texto="Sin errores de sincronización." />}
        {lista.map(e => (
          <Fila key={e.id}>
            <Celda>{fmtDate(e.fecha)}</Celda>
            <Celda style={{ fontWeight: e.leido ? 400 : 500 }}>{e.descripcion}</Celda>
            <Celda>{e.leido ? <Checkbox checked onChange={b => marcar(e.id, b)} label="Sí" /> : <span onClick={() => marcar(e.id, true)} style={{ cursor: 'pointer' }}><StatusBadge color="red" label="Nuevo" /></span>}</Celda>
          </Fila>
        ))}
      </Tabla>
    </div>
  );
}
