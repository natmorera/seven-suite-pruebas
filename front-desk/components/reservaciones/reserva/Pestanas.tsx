'use client';
// Pestañas del detalle de la reserva (excepto Alojamiento).
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Select, StatusBadge } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Buscador, Campo, Celda, Fila, FilaVacia, IcTrash, Tabla, TextArea, norm } from '@/components/configuracion/kit';
import { RangoBoton } from '@/components/hotel/ui';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { CONDICIONES, NACIONALIDADES, USUARIOS, fmtF, noches, type DetallesReserva, type HuespedAdicional, type Reserva } from '@/components/hotel/datos';
import { AGENTES, ORIGENES, bitacoraBase, claveDe, detallesVacios, esAgencia, reservaCerrada, type GrupoReserva } from '@/components/hotel/reservas';
import { fmtFH, fmtMon, r2 } from '@/components/hotel/finanzas';
import { FiltroUno, Visor } from '@/components/facturacion/comun';
import { AnularDeposito, Comprobante, FormDeposito } from '@/components/facturacion/Depositos';
import { DocumentoFolio } from '@/components/facturacion/folios/Pagos';
import { folioDeReservaVista } from '@/components/facturacion/folios/modelo';
import { SeleccionarPerfil, nombreTipo, totales } from '../comun';

function Pie({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: `1px solid ${C.n500}`, paddingTop: 14, marginTop: 4 }}>{children}</div>;
}
export const titulo = (t: ReactNode, extra?: ReactNode) => <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 13, fontWeight: 600, marginRight: 'auto' }}>{t}</span>{extra}</div>;

// ── Huésped ─────────────────────────────────────────────────────────────────
type DatosHuesped = Pick<Reserva, 'id' | 'nombre' | 'identificacion' | 'nacionalidad' | 'email' | 'telefono' | 'vip' | 'perfilId' | 'adicionales'>;
const huespedDe = (r: Reserva): DatosHuesped => ({ id: r.id, nombre: r.nombre, identificacion: r.identificacion, nacionalidad: r.nacionalidad, email: r.email, telefono: r.telefono, vip: r.vip, perfilId: r.perfilId, adicionales: r.adicionales });
export function TabHuesped({ g, onToast }: { g: GrupoReserva; onToast: (t: string) => void }) {
  const h = useHotel();
  const inicial = () => g.lineas.map(huespedDe);
  const [d, setD] = useState<DatosHuesped[]>(inicial);
  const [perfilPara, setPerfilPara] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const soloLectura = g.lineas.every(reservaCerrada);
  const varias = g.lineas.length > 1;
  const set = (id: string, p: Partial<DatosHuesped>) => setD(v => v.map(x => (x.id === id ? { ...x, ...p } : x)));
  const cambiado = JSON.stringify(d) !== JSON.stringify(inicial());
  const guardar = () => {
    const e: string[] = [];
    d.forEach((x, i) => {
      const pre = varias ? `Habitación ${g.lineas[i].habitacion || i + 1}: ` : '';
      if (!x.nombre.trim()) e.push(`${pre}nombre del huésped principal`);
      if (x.email && !/^\S+@\S+\.\S+$/.test(x.email)) e.push(`${pre}e-mail válido`);
      x.adicionales.forEach((a, j) => { if (!a.nombre.trim()) e.push(`${pre}nombre del huésped ${j + 2}`); });
    });
    setErrores(e);
    if (e.length) return;
    h.editarReserva(d.map(x => ({ id: x.id, p: { ...x, nombre: x.nombre.trim().toUpperCase() } })), 'Datos de huéspedes actualizados', '-', d.map(x => x.nombre.trim()).join(', '));
    onToast('Cambios guardados');
  };
  const nac = [{ value: '', label: 'Selecciona' }, ...Object.entries(NACIONALIDADES).map(([k, v]) => ({ value: k, label: v }))];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {d.map((x, i) => {
        const l = g.lineas[i];
        return (
          <section key={x.id} style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16, borderBottom: `1px solid ${C.n500}` }}>
            {titulo(varias ? `Habitación ${l.habitacion || '—'} · ${nombreTipo(l.tipo)} (${l.numero})` : 'Huésped principal')}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr auto 1fr', gap: 12, alignItems: 'end' }}>
              <Campo label="Nombre del huésped principal" required><Input value={x.nombre} disabled={soloLectura} onChange={v => set(x.id, { nombre: v })} /></Campo>
              <span style={{ display: 'flex', gap: 10, alignItems: 'center', height: 32 }}>
                <Button variant="secondary" disabled={soloLectura} style={{ color: C.brand, borderColor: C.brandBd }} onClick={() => setPerfilPara(x.id)}>⌕ Perfil de cliente</Button>
                <Checkbox checked={x.vip} onChange={b => !soloLectura && set(x.id, { vip: b })} label="VIP" />
              </span>
              <Campo label="Identificación"><Input value={x.identificacion} disabled={soloLectura} onChange={v => set(x.id, { identificacion: v })} /></Campo>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
              <Campo label="Nacionalidad (opcional)"><Select value={x.nacionalidad} disabled={soloLectura} onChange={v => set(x.id, { nacionalidad: v })} options={nac} /></Campo>
              <Campo label="E-mail"><Input type="email" value={x.email} disabled={soloLectura} onChange={v => set(x.id, { email: v })} placeholder="correo@ejemplo.com" /></Campo>
              <Campo label="Teléfono (opcional)"><Input value={x.telefono} disabled={soloLectura} onChange={v => set(x.id, { telefono: v })} placeholder="+506 8888 8888" /></Campo>
            </div>
            {x.adicionales.map((a, j) => (
              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1.2fr 32px', gap: 12, alignItems: 'end' }}>
                {(['nombre', 'identificacion'] as const).map(k => <Campo key={k} label={k === 'nombre' ? `Huésped ${j + 2}` : 'Identificación'} required={k === 'nombre'}>
                  <Input value={a[k]} disabled={soloLectura} onChange={v => set(x.id, { adicionales: x.adicionales.map(y => (y.id === a.id ? { ...y, [k]: v } : y)) })} /></Campo>)}
                <Campo label="Nacionalidad (opcional)"><Select value={a.nacionalidad} disabled={soloLectura} onChange={v => set(x.id, { adicionales: x.adicionales.map(y => (y.id === a.id ? { ...y, nacionalidad: v } : y)) })} options={nac} /></Campo>
                <Campo label="E-mail (opcional)"><Input value={a.email} disabled={soloLectura} onChange={v => set(x.id, { adicionales: x.adicionales.map(y => (y.id === a.id ? { ...y, email: v } : y)) })} placeholder="Ingresa el correo electrónico" /></Campo>
                {!soloLectura && <button type="button" aria-label={`Quitar huésped ${j + 2}`} onClick={() => set(x.id, { adicionales: x.adicionales.filter(y => y.id !== a.id) })} style={{ height: 32, border: 'none', background: 'none', color: C.error, cursor: 'pointer' }}><IcTrash /></button>}
              </div>
            ))}
            {!soloLectura && <button type="button" onClick={() => set(x.id, { adicionales: [...x.adicionales, { id: nuevoId('ad'), nombre: '', identificacion: '', nacionalidad: '', email: '' } as HuespedAdicional] })}
              style={{ alignSelf: 'flex-start', border: 'none', background: 'none', color: C.brand, fontSize: 12, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT, padding: 0 }}>+ Agregar nuevo huésped</button>}
          </section>
        );
      })}
      {errores.length > 0 && <p role="alert" style={{ margin: 0, fontSize: 12, color: C.error }}>Completa: {errores.join(', ')}.</p>}
      {!soloLectura && <Pie><Button variant="secondary" disabled={!cambiado} style={{ color: C.error }} onClick={() => { setD(inicial()); setErrores([]); }}>Descartar cambios</Button><Button disabled={!cambiado} onClick={guardar}>Guardar cambios</Button></Pie>}
      {perfilPara && <SeleccionarPerfil soloCliente onClose={() => setPerfilPara(null)} onElegir={pf => {
        const nacCod = Object.entries(NACIONALIDADES).find(([, v]) => v === pf.nacionalidad)?.[0] ?? '';
        set(perfilPara, { perfilId: pf.id, nombre: pf.nombre.toUpperCase(), identificacion: pf.numeroId, email: pf.email, telefono: pf.telefono, vip: pf.extra.vip, ...(nacCod ? { nacionalidad: nacCod } : {}) });
        setPerfilPara(null);
      }} />}
    </div>
  );
}

// ── Detalles («Otras informaciones») ────────────────────────────────────────
export function TabDetalles({ g, onToast }: { g: GrupoReserva; onToast: (t: string) => void }) {
  const h = useHotel();
  const agencia = esAgencia(g.principal);
  const lineas = agencia ? g.lineas : [g.principal];
  const inicial = () => lineas.map(l => ({ id: l.id, d: { ...detallesVacios(), usuario: '', ...l.detalles } as DetallesReserva, vip: l.vip, idExterno: l.idExterno ?? '' }));
  const [d, setD] = useState(inicial);
  const [editar, setEditar] = useState(false);
  const set = (id: string, p: Partial<DetallesReserva>) => setD(v => v.map(x => (x.id === id ? { ...x, d: { ...x.d, ...p } } : x)));
  const guardar = () => {
    const cambios = agencia ? d.map(x => ({ id: x.id, p: { detalles: x.d, vip: x.vip, idExterno: x.idExterno } }))
      : g.lineas.map(l => ({ id: l.id, p: { detalles: d[0].d, idExterno: d[0].idExterno, ...(l.id === g.principal.id ? { vip: d[0].vip } : {}) } }));
    h.editarReserva(cambios, 'Se realizaron cambios generales en la reserva.', '-', 'Otras informaciones');
    setEditar(false); onToast('Cambios guardados');
  };
  const empresa = h.perfiles.find(p => p.tipo === 'empresa' && p.nombre === g.principal.empresa);
  const campo = (l: string, v: string, on: (v: string) => void, opciones?: string[]) => (
    <Campo label={l}>{editar
      ? (opciones ? <Select value={v} onChange={on} options={[{ value: '', label: 'Seleccionar' }, ...opciones.map(o => ({ value: o, label: o }))]} /> : <Input value={v} onChange={on} placeholder={`Ingresa ${l.toLowerCase()}`} />)
      : <Input value={v || 'Sin datos'} readOnly style={{ background: C.n200, color: v ? C.n900 : C.n700 }} />}</Campo>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {titulo(<>Otras informaciones <span style={{ color: C.brand, fontWeight: 400 }}>(opcional)</span></>, !editar && <Button onClick={() => setEditar(true)}>Editar ✎</Button>)}
      <span><Button variant="secondary" disabled={!empresa} onClick={() => window.open(`/hospedaje/perfiles?id=${empresa?.id}`, '_blank', 'noopener')}>▤ Perfil de empresa{empresa ? `: ${empresa.nombreComercial || empresa.nombre}` : ''}</Button></span>
      {d.map(x => {
        const l = g.lineas.find(y => y.id === x.id)!;
        return (
          <section key={x.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {agencia && g.lineas.length > 1 && <span style={{ fontSize: 12.5, fontWeight: 600, color: C.brand }}>Habitación {l.habitacion || '—'} · {l.numero}</span>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr)) auto', gap: 12, alignItems: 'end' }}>
              {campo('Usuario', x.d.usuario, v => set(x.id, { usuario: v }), USUARIOS)}{campo('Agente de ventas', x.d.agente, v => set(x.id, { agente: v }), AGENTES)}{campo('Referencia', x.d.referencia, v => set(x.id, { referencia: v }))}
              <span style={{ height: 32, display: 'flex', alignItems: 'center' }}><Checkbox checked={x.vip} onChange={b => editar && setD(v => v.map(y => (y.id === x.id ? { ...y, vip: b } : y)))} label="VIP" /></span>
              {campo('Referidor', x.d.referidor, v => set(x.id, { referidor: v }))}{campo('Origen del Negocio', x.d.origen, v => set(x.id, { origen: v }), ORIGENES)}{campo('Placa del vehículo', x.d.placa, v => set(x.id, { placa: v }))}<span />
              {campo('Consecutivo de registro', x.d.consecutivo, v => set(x.id, { consecutivo: v }))}{campo('Vuelo salida', x.d.vuelo, v => set(x.id, { vuelo: v }))}
              {campo('ID de reserva (externo)', x.idExterno, v => setD(w => w.map(y => (y.id === x.id ? { ...y, idExterno: v } : y))))}
              <span style={{ height: 32, display: 'flex', alignItems: 'center' }}><Checkbox checked={x.d.noEnviarEmail} onChange={b => editar && set(x.id, { noEnviarEmail: b })} label="No enviar email" /></span>
            </div>
          </section>
        );
      })}
      {editar && <Pie><Button variant="secondary" style={{ color: C.error }} onClick={() => { setD(inicial()); setEditar(false); }}>Descartar cambios</Button><Button onClick={guardar}>Guardar cambios</Button></Pie>}
    </div>
  );
}

// ── Observaciones ───────────────────────────────────────────────────────────
export function TabObservaciones({ g, onToast }: { g: GrupoReserva; onToast: (t: string) => void }) {
  const h = useHotel();
  const p = g.principal;
  const inicial = () => ({ obs: p.observaciones, internas: p.observacionesInternas, cond: [...new Set(g.lineas.flatMap(l => l.condiciones))] });
  const [f, setF] = useState(inicial);
  const cambiado = JSON.stringify(f) !== JSON.stringify(inicial());
  const guardar = () => {
    h.editarReserva(g.lineas.map(l => ({ id: l.id, p: { observaciones: f.obs, observacionesInternas: f.internas, condiciones: f.cond } })), 'Observaciones actualizadas', '-', f.cond.length ? `Condiciones: ${f.cond.join(', ')}` : 'Notas de la reserva');
    onToast('Observaciones guardadas');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Campo label="Observaciones"><TextArea value={f.obs} onChange={v => setF({ ...f, obs: v })} rows={4} placeholder="Escriba cualquier observación" /></Campo>
      <Campo label="Observaciones internas"><TextArea value={f.internas} onChange={v => setF({ ...f, internas: v })} rows={4} placeholder="Escriba cualquier observación interna" /></Campo>
      <Campo label="Condiciones especiales">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CONDICIONES.map(c => {
            const on = f.cond.includes(c);
            return <button key={c} type="button" aria-pressed={on} onClick={() => setF({ ...f, cond: on ? f.cond.filter(x => x !== c) : [...f.cond, c] })}
              style={{ padding: '5px 12px', borderRadius: radius.pill, border: `1px solid ${on ? C.brand : C.n500}`, background: on ? C.brandBg : C.n000, color: on ? C.brand : C.n900, fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}>{c}</button>;
          })}
        </div>
      </Campo>
      <Pie><Button variant="secondary" disabled={!cambiado} style={{ color: C.error }} onClick={() => setF(inicial())}>Descartar cambios</Button><Button disabled={!cambiado} onClick={guardar}>Guardar cambios</Button></Pie>
    </div>
  );
}

// ── Mensajes ────────────────────────────────────────────────────────────────
const fechaLarga = (iso: string) => {
  const M = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const hh = Number(iso.slice(11, 13));
  return `${M[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)} ${hh % 12 || 12}:${iso.slice(14, 16)}${hh < 12 ? 'am' : 'pm'}`;
};
export function TabMensajes({ g, onToast }: { g: GrupoReserva; onToast: (t: string) => void }) {
  const h = useHotel();
  const clave = claveDe(g.principal);
  const lista = [...(h.mensajesRes[clave] ?? [])].reverse();
  const [sel, setSel] = useState<string | 'nuevo' | null>(lista[0]?.id ?? 'nuevo');
  const [f, setF] = useState({ remitente: '', destinatario: '', cuerpo: '' });
  const [error, setError] = useState('');
  const m = lista.find(x => x.id === sel);
  const enviar = () => {
    if (!f.remitente.trim() || !f.destinatario.trim() || !f.cuerpo.trim()) return setError('Completa remitente, destinatario y mensaje.');
    h.enviarMensaje(clave, { remitente: f.remitente.trim(), destinatario: f.destinatario.trim(), cuerpo: f.cuerpo.trim() });
    setF({ remitente: '', destinatario: '', cuerpo: '' }); setError(''); setSel(null); onToast('Mensaje enviado');
  };
  const fila = (l: string, c: ReactNode) => <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.n500}`, fontSize: 12 }}><span style={{ color: C.n700 }}>{l}</span>{c}</div>;
  const plano: CSSProperties = { border: 'none', outline: 'none', fontSize: 12, fontFamily: FONT, width: '100%' };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 360 }}>
      <div style={{ borderRight: `1px solid ${C.n500}`, paddingRight: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 12, color: C.n700 }}>Historial</span>
        <Button variant={sel === 'nuevo' ? 'secondary' : 'primary'} icon={<IcPlus size={12} />} onClick={() => { setSel('nuevo'); setError(''); }}>Nuevo mensaje</Button>
        {lista.map(x => (
          <button key={x.id} type="button" onClick={() => setSel(x.id)} aria-current={sel === x.id || undefined}
            style={{ textAlign: 'left', border: 'none', borderRadius: radius.md, background: sel === x.id ? C.brandBg : 'none', padding: '8px 8px', cursor: 'pointer', fontFamily: FONT }}>
            <span style={{ display: 'block', fontSize: 13, color: C.n900 }}>{x.remitente} <span style={{ color: C.n700 }}>→</span> {x.destinatario}</span>
            <span style={{ display: 'block', fontSize: 11, color: C.n700, marginTop: 2 }}>{fechaLarga(x.fecha)}</span>
          </button>
        ))}
        {!lista.length && <span style={{ fontSize: 12, color: C.n700 }}>Sin mensajes todavía.</span>}
      </div>
      <div style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column' }}>
        {m ? <>
          {fila('Remitente:', m.remitente)}{fila('Responder a:', m.destinatario)}{fila('Enviado:', fechaLarga(m.fecha))}
          <p style={{ fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '14px 0' }}>{m.cuerpo}</p>
        </> : sel === 'nuevo' ? <>
          {fila('Remitente:', <input value={f.remitente} onChange={e => setF({ ...f, remitente: e.target.value })} placeholder="Ingresa el nombre del remitente" aria-label="Remitente" style={plano} />)}
          {fila('Responder a:', <input value={f.destinatario} onChange={e => setF({ ...f, destinatario: e.target.value })} placeholder="Ingresa el nombre de quién recibe" aria-label="Responder a" style={plano} />)}
          {fila('Enviado:', <span style={{ color: C.n700 }}>---</span>)}
          <textarea value={f.cuerpo} onChange={e => setF({ ...f, cuerpo: e.target.value })} placeholder="Ingresa el cuerpo del mensaje..." aria-label="Cuerpo del mensaje" rows={8} style={{ ...plano, padding: '14px 0', resize: 'vertical', flex: 1 }} />
          {error && <span role="alert" style={{ fontSize: 12, color: C.error }}>{error}</span>}
          <Pie><Button variant="secondary" onClick={() => { setF({ remitente: '', destinatario: '', cuerpo: '' }); setSel(lista[0]?.id ?? null); }}>Cancelar</Button><Button onClick={enviar}>Enviar mensaje</Button></Pie>
        </> : <span style={{ fontSize: 12, color: C.n700, margin: 'auto' }}>Selecciona un mensaje del historial.</span>}
      </div>
    </div>
  );
}

// ── Depósitos ───────────────────────────────────────────────────────────────
export function TabDepositos({ g, onToast }: { g: GrupoReserva; onToast: (t: string) => void }) {
  const h = useHotel();
  const ids = g.lineas.map(l => l.id);
  const [estado, setEstado] = useState('Activo');
  const [nuevo, setNuevo] = useState(false);
  const [anular, setAnular] = useState<string | null>(null);
  const [ver, setVer] = useState<string | null>(null);
  const deps = h.depositos.filter(d => d.reservaId && ids.includes(d.reservaId)).sort((a, b) => b.recibido.localeCompare(a.recibido));
  const vis = deps.filter(d => !estado || d.estado === estado);
  const t = totales(g.lineas);
  const requerido = g.principal.depRequerido ?? r2(g.lineas.reduce((s, l) => s + l.precio, 0));
  const kpi = (l: string, v: string, color?: string) => <div style={{ flex: 1, background: C.n200, borderRadius: radius.md, padding: '12px 14px' }}><span style={{ display: 'block', fontSize: 11.5, color: C.n700 }}>{l}</span><span style={{ fontSize: 15, fontWeight: 600, color: color ?? C.n900 }}>{v}</span></div>;
  const terminalG = g.lineas.every(reservaCerrada);
  const dAnular = h.depositos.find(d => d.id === anular);
  const dVer = h.depositos.find(d => d.id === ver);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {titulo('Depósitos en garantía', <><FiltroUno label="Estado" value={estado} onChange={setEstado} todos="Todos" opciones={[{ value: 'Activo', label: 'Activos' }, { value: 'Anulado', label: 'Anulados' }]} />
        <Button icon={<IcPlus size={12} />} disabled={terminalG} onClick={() => setNuevo(true)}>Nuevo depósito</Button></>)}
      <div style={{ display: 'flex', gap: 10 }}>{kpi('Total depositado', fmtMon(t.deposito, g.principal.moneda))}{kpi('Total requerido (1 noche)', fmtMon(requerido, g.principal.moneda))}{kpi('Saldo pendiente', fmtMon(r2(Math.max(0, requerido - t.deposito)), g.principal.moneda), requerido - t.deposito > 0.005 ? C.error : '#2E7D32')}</div>
      <Tabla headers={['N° depósito', 'Fecha', 'Monto', 'Método de pago', 'Estado', 'Usuario', '']} alinearDerecha={[2]}>
        {!vis.length && <FilaVacia cols={7} texto="No hay depósitos registrados para esta reserva." />}
        {vis.map(d => (
          <Fila key={d.id}>
            <Celda><button type="button" onClick={() => setVer(d.id)} style={{ border: 'none', background: 'none', padding: 0, color: C.brand, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT, fontSize: 12 }}>#{String(d.numero).padStart(6, '0')}</button></Celda>
            <Celda>{fmtFH(d.recibido)}</Celda><Celda derecha style={{ textDecoration: d.estado === 'Anulado' ? 'line-through' : undefined }}>{fmtMon(d.importe, d.moneda)}</Celda>
            <Celda>{d.tipo}</Celda><Celda><StatusBadge label={d.estado} color={d.estado === 'Activo' ? 'green' : 'gray'} /></Celda><Celda>{d.usuario}</Celda>
            <Celda derecha>{d.estado === 'Activo' && <Button variant="secondary" style={{ color: C.error }} onClick={() => setAnular(d.id)}>Anular</Button>}</Celda>
          </Fila>
        ))}
      </Tabla>
      {nuevo && <FormDeposito reservaId={g.principal.id} onClose={() => setNuevo(false)} onListo={(m, id) => { setNuevo(false); onToast(m); if (id) setVer(id); }} />}
      {dAnular && <AnularDeposito d={dAnular} onClose={() => setAnular(null)} onListo={() => { setAnular(null); onToast(`Depósito ${dAnular.numero} anulado`); }} />}
      {dVer && <Visor titulo="Dep. en Garantía" sub={`#${dVer.numero}`} onClose={() => setVer(null)}><Comprobante d={dVer} /></Visor>}
    </div>
  );
}

// ── F. Empresa (solo agencia) ───────────────────────────────────────────────
export function TabEmpresa({ g }: { g: GrupoReserva }) {
  const h = useHotel();
  const [ver, setVer] = useState(false);
  const p = g.principal;
  const folios = g.lineas.filter(l => l.estado !== 'Anulada').map(l => folioDeReservaVista(l, h.perfiles, h.foliosRes));
  const t = totales(g.lineas);
  const abierta = t.pendiente > 0.005;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {titulo(<>{p.empresa} <span style={{ fontWeight: 400, color: C.n700 }}>| Hospedaje general</span></>, <>
        <span style={{ fontSize: 12, color: C.n700 }}>Factura empresa: <StatusBadge label={abierta ? 'Abierta' : 'Pagada'} color={abierta ? 'yellow' : 'green'} /></span>
        <Button variant="secondary" style={{ color: C.brand, borderColor: C.brandBd }} onClick={() => setVer(true)}>Ver factura ↗</Button></>)}
      <Tabla headers={['Folio', 'Habitación', 'Huésped', 'Noches', 'Importe', 'Pagado', 'Pendiente', 'Estado']} alinearDerecha={[3, 4, 5, 6]}>
        {folios.map(f => (
          <Fila key={f.id}><Celda>{f.numero}</Celda><Celda>{f.habitacion || '—'}</Celda><Celda>{f.nombre}</Celda><Celda derecha>{noches(f.reserva!.entrada, f.reserva!.salida)}</Celda>
            <Celda derecha>{fmtMon(f.totalCargos, f.moneda)}</Celda><Celda derecha>{fmtMon(f.totalPagado, f.moneda)}</Celda><Celda derecha>{fmtMon(Math.max(0, f.saldo), f.moneda)}</Celda>
            <Celda><StatusBadge label={f.saldo > 0.005 ? 'Pendiente' : 'Pagada'} color={f.saldo > 0.005 ? 'yellow' : 'green'} /></Celda></Fila>
        ))}
        <Fila><Celda style={{ fontWeight: 600 }}>Total</Celda><Celda /><Celda /><Celda /><Celda derecha style={{ fontWeight: 600 }}>{fmtMon(t.subtotalII, p.moneda)}</Celda><Celda derecha style={{ fontWeight: 600 }}>{fmtMon(t.pagado, p.moneda)}</Celda><Celda derecha style={{ fontWeight: 600 }}>{fmtMon(t.pendiente, p.moneda)}</Celda><Celda /></Fila>
      </Tabla>
      <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>El alojamiento se factura a {p.empresa} (crédito {p.credito ? 'aprobado' : 'no aplicado'}). Los consumos extra quedan en el folio de cada habitación.</p>
      {ver && <Visor titulo={abierta ? 'Prefactura empresa' : 'Factura empresa'} sub={p.empresa} onClose={() => setVer(false)}>
        {folios.map((f, i) => <div key={f.id} style={{ borderTop: i ? `2px dashed ${C.n500}` : 'none' }}><DocumentoFolio folio={f} titulo={abierta ? 'PREFACTURA' : 'FACTURA'} nota={abierta ? 'Documento sin valor fiscal' : 'Copia'} /></div>)}
      </Visor>}
    </div>
  );
}

// ── Bitácora ────────────────────────────────────────────────────────────────
export function TabBitacora({ g }: { g: GrupoReserva }) {
  const h = useHotel();
  const [q, setQ] = useState('');
  const [rango, setRango] = useState({ d: '', h: '' });
  const [usuario, setUsuario] = useState('');
  const ids = g.lineas.map(l => l.id);
  const eventos = useMemo(() => {
    const base = bitacoraBase(g.lineas);
    const manual = h.bitacoraRes[claveDe(g.principal)] ?? [];
    const deps = h.depositos.filter(d => d.reservaId && ids.includes(d.reservaId)).flatMap(d => [
      { id: `${d.id}-r`, fecha: d.recibido, usuario: d.usuario, accion: `Depósito registrado #${String(d.numero).padStart(6, '0')}`, antes: 'Depósito: —', despues: `Depósito: ${fmtMon(d.importe, d.moneda)}. ${d.tipo}.` },
      ...(d.anulado ? [{ id: `${d.id}-a`, fecha: d.anulado.fecha, usuario: d.anulado.usuario, accion: `Depósito #${String(d.numero).padStart(6, '0')} anulado`, antes: `Depósito: ${fmtMon(d.importe, d.moneda)}`, despues: d.anulado.motivo }] : []),
    ]);
    const facts = h.facturas.filter(f => f.reservaId && ids.includes(f.reservaId)).map(f => ({ id: f.id, fecha: `${f.fecha}T12:00`, usuario: f.usuario, accion: `${f.tipo} generada #${f.documento}`, antes: '-', despues: `Facturación: ${fmtMon(f.impFactura, f.moneda)}` }));
    const folios = ids.flatMap(id => (h.foliosRes[id]?.bitacora ?? []).map(e => ({ id: e.id, fecha: e.fecha, usuario: e.usuario, accion: e.accion, antes: '-', despues: `Folio ${g.lineas.find(l => l.id === id)?.numero ?? ''}` })));
    // Los eventos manuales que ya cubre la base (crear, anular, No-Show) no se duplican
    const sinDup = manual.filter(m => !['Creación de reserva', 'Reserva anulada', 'Reserva marcada como No-Show'].includes(m.accion) || !base.some(b => b.accion === m.accion));
    return [...base, ...sinDup, ...deps, ...facts, ...folios].sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [g, ids, h.bitacoraRes, h.depositos, h.facturas, h.foliosRes]);
  const usuarios = [...new Set(eventos.map(e => e.usuario))];
  const vis = eventos.filter(e => (!q || norm(`${e.accion} ${e.antes} ${e.despues}`).includes(norm(q))) && (!rango.d || e.fecha.slice(0, 10) >= rango.d) && (!rango.h || e.fecha.slice(0, 10) <= rango.h) && (!usuario || e.usuario === usuario));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {titulo('Bitácora de acciones en la reserva')}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ width: 240 }}><Buscador value={q} onChange={setQ} placeholder="Buscar por número, nombre…" /></div>
        <RangoBoton label="Período del cambio" desde={rango.d} hasta={rango.h} onChange={(d, x) => setRango({ d, h: x })} />
        <FiltroUno label="Usuario" value={usuario} onChange={setUsuario} todos="Todos" opciones={usuarios.map(u => ({ value: u, label: u }))} />
      </div>
      <Tabla headers={['Fecha', 'Usuario', 'Acción', 'Antes', 'Después']} minWidth={760}>
        {!vis.length && <FilaVacia cols={5} texto="No hay acciones para los filtros seleccionados." />}
        {vis.map(e => <Fila key={e.id}><Celda style={{ whiteSpace: 'nowrap' }}>{fmtF(e.fecha.slice(0, 10))} {e.fecha.slice(11, 16)}</Celda><Celda style={{ whiteSpace: 'nowrap' }}>{e.usuario}</Celda><Celda>{e.accion}</Celda><Celda muted>{e.antes}</Celda><Celda>{e.despues}</Celda></Fila>)}
      </Tabla>
    </div>
  );
}
