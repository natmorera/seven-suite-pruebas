'use client';
// Perfiles: formulario de cliente / empresa con validación de identificación, consulta DICR y datos fiscales.
import { useState } from 'react';
import { C, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Radio, Select, Switch } from '@/components/suite/ui';
import { Campo, Grid, TextArea } from '@/components/configuracion/kit';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { GEO_CR, HOY, NACIONALIDADES, PAISES, REGLAS_ID, formatearId, perfilVacio, type Direccion, type Perfil, type TipoId } from '@/components/hotel/datos';
import { Alerta } from '@/components/hotel/ui';
import { Seccion } from './Detalle';
import { BuscadorActividad, consultarHacienda } from './Actividad';
import type { ActividadEconomica } from '@/components/hotel/actividadesEconomicas';

const TIPOS_ID: TipoId[] = ['Cédula Física', 'Cédula Jurídica', 'DIMEX', 'NITE', 'Pasaporte'];
export const digitos = (s: string) => s.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

/** Registro simulado de DICR / Hacienda para «Buscar». Reemplazar por la API de DICR. */
const REGISTRO_DICR: Record<string, Partial<Perfil>> = {
  '203840298': { nombre: 'Juan Quirós Vargas', nacionalidad: 'Costa Rica', genero: 'M', email: 'juanquirosa@gmail.com', telefono: '8888 8888', dir: { pais: 'Costa Rica', provincia: 'Alajuela', canton: 'San Ramón', distrito: 'San Juan', barrio: '', cp: '', direccion: '' } },
  '3101998877': { nombre: 'Volcano Lodge & Thermal Experience S.A.', nombreComercial: 'Volcano Lodge', nacionalidad: 'Costa Rica', email: 'reservas@volcanolodge.cr', telefono: '2460 6080', dir: { pais: 'Costa Rica', provincia: 'Alajuela', canton: 'San Ramón', distrito: 'Piedades Norte', barrio: '', cp: '', direccion: '' } },
};

function CamposDireccion({ d, set, dis, obligatorios }: { d: Direccion; set: (d: Direccion) => void; dis: boolean; obligatorios?: boolean }) {
  const cr = d.pais === 'Costa Rica';
  const prov = cr ? Object.keys(GEO_CR) : [];
  const cant = cr && d.provincia ? Object.keys(GEO_CR[d.provincia] ?? {}) : [];
  const dist = cr && d.canton ? GEO_CR[d.provincia]?.[d.canton] ?? [] : [];
  const sel = (label: string, v: string, ops: string[], on: (v: string) => void, req = false) => (
    <Campo label={`${label}${req ? '' : ' (opcional)'}`} required={req}>
      {ops.length || !cr ? (ops.length ? <Select value={v} onChange={on} disabled={dis} options={[{ value: '', label: 'Seleccionar' }, ...ops.map(x => ({ value: x, label: x }))]} />
        : <Input value={v} onChange={on} disabled={dis} placeholder="Escribir" />) : <Select value="" onChange={() => {}} disabled options={[{ value: '', label: 'Seleccionar' }]} />}
    </Campo>
  );
  return (
    <>
      <Grid cols={3}>
        {sel('País', d.pais, PAISES, v => set({ ...d, pais: v, provincia: '', canton: '', distrito: '' }), true)}
        {sel('Provincia / Estado', d.provincia, prov, v => set({ ...d, provincia: v, canton: '', distrito: '' }), obligatorios)}
        {sel('Cantón', d.canton, cant, v => set({ ...d, canton: v, distrito: '' }), obligatorios)}
        {sel('Distrito', d.distrito, dist, v => set({ ...d, distrito: v }), obligatorios)}
        <Campo label="Barrio (opcional)"><Input value={d.barrio} onChange={v => set({ ...d, barrio: v })} disabled={dis} placeholder="Ingresa el barrio" /></Campo>
        <Campo label="Código postal (opcional)"><Input value={d.cp} onChange={v => set({ ...d, cp: v.replace(/\D/g, '').slice(0, 5) })} disabled={dis} placeholder="00000" /></Campo>
      </Grid>
      <Campo label="Dirección (opcional)"><Input value={d.direccion} onChange={v => set({ ...d, direccion: v })} disabled={dis} placeholder="Ingresa la dirección" /></Campo>
    </>
  );
}

export function FormPerfil({ inicial, modo, onGuardar, onCancelar, onEditar }: {
  inicial: Perfil; modo: 'ver' | 'editar' | 'crear'; onGuardar: (p: Perfil) => void; onCancelar: () => void; onEditar?: () => void;
}) {
  const h = useHotel();
  const [p, setP] = useState<Perfil>(() => structuredClone(inicial));
  const [err, setErr] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<{ ok: boolean; t: string } | null>(null);
  const [limpiar, setLimpiar] = useState(false);
  const [salir, setSalir] = useState(false);
  const [extraAbierta, setExtraAbierta] = useState(modo !== 'crear' && (inicial.extra.credito || !!inicial.extra.observaciones));
  const dis = modo === 'ver';
  const empresa = p.tipo === 'empresa';
  const set = (x: Partial<Perfil>) => setP(v => ({ ...v, ...x }));
  const setF = (x: Partial<Perfil['fiscal']>) => setP(v => ({ ...v, fiscal: { ...v.fiscal, ...x } }));
  const setX = (x: Partial<Perfil['extra']>) => setP(v => ({ ...v, extra: { ...v.extra, ...x } }));
  const sucio = JSON.stringify(p) !== JSON.stringify(inicial);

  const cambiarTipoId = (t: TipoId) => set({ tipoId: t, tipo: t === 'Cédula Jurídica' ? 'empresa' : 'cliente' });
  const buscar = () => {
    if (!p.tipoId) return setErr({ tipoId: 'Selecciona el tipo de identificación' });
    if (!REGLAS_ID[p.tipoId].validar(p.numeroId)) return setErr({ numeroId: REGLAS_ID[p.tipoId].msg });
    const n = digitos(p.numeroId);
    const dup = h.perfiles.find(x => x.id !== p.id && digitos(x.numeroId) === n);
    if (dup) return setAviso({ ok: false, t: `Ya existe un perfil con esta identificación: ${dup.nombre}.` });
    const hit = REGISTRO_DICR[n];
    if (hit) { setP(v => ({ ...v, ...hit, numeroId: formatearId(v.tipoId, n), dir: { ...v.dir, ...hit.dir } })); setErr({}); setAviso({ ok: true, t: 'Se han completado los datos de la persona automáticamente.' }); }
    else { set({ numeroId: formatearId(p.tipoId, p.numeroId) }); setAviso({ ok: false, t: 'No se encontró en el registro de DICR. Completa los datos manualmente.' }); }
  };

  const validar = () => {
    const e: Record<string, string> = {};
    const email = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (!p.tipoId) e.tipoId = 'Obligatorio';
    else if (!REGLAS_ID[p.tipoId].validar(p.numeroId)) e.numeroId = REGLAS_ID[p.tipoId].msg;
    if (!p.numeroId) e.numeroId = 'Obligatorio';
    if (p.numeroId && h.perfiles.some(x => x.id !== p.id && digitos(x.numeroId) === digitos(p.numeroId))) e.numeroId = 'Ya existe un perfil con esta identificación';
    if (!p.nombre.trim()) e.nombre = 'Obligatorio';
    if (!email(p.email)) e.email = p.email ? 'Formato: usuario@dominio.com' : 'Obligatorio';
    if (!p.telefono.trim()) e.telefono = 'Obligatorio';
    if (!p.dir.pais) e.pais = 'Obligatorio';
    if (p.fiscal.emitir) {
      const f = p.fiscal.misma ? { ...p.fiscal, tipoId: p.tipoId, numeroId: p.numeroId, razon: p.nombre, email: p.fiscal.email || p.email, telefono: p.fiscal.telefono || p.telefono } : p.fiscal;
      if (!f.tipoId || !f.numeroId || !f.razon) e.fiscal = 'Completa la identificación y razón social de facturación';
      if (!email(f.email)) e.fiscalEmail = 'Correo de facturación con formato usuario@dominio.com';
      if (!f.telefono) e.fiscalTel = 'Teléfono de facturación obligatorio';
      if (!f.actividad) e.actividad = 'Obligatorio';
      const dir = f.mismaDir ? p.dir : f.dir;
      if (dir.pais === 'Costa Rica' && (!dir.provincia || !dir.canton || !dir.distrito)) e.fiscalDir = 'Provincia, cantón y distrito son obligatorios para facturación';
    }
    if (p.extra.credito && !(Number(p.extra.dias) > 0)) e.dias = 'Indica los días de crédito';
    setErr(e);
    return Object.keys(e).length === 0;
  };
  const guardar = () => {
    if (!validar()) { setAviso({ ok: false, t: 'Revisa los campos marcados antes de guardar.' }); return; }
    const final: Perfil = {
      ...p, id: p.id || nuevoId('p'), numeroId: formatearId(p.tipoId, p.numeroId), tipo: p.tipoId === 'Cédula Jurídica' ? 'empresa' : 'cliente',
      fiscal: p.fiscal.misma && p.fiscal.emitir ? { ...p.fiscal, tipoId: p.tipoId, numeroId: formatearId(p.tipoId, p.numeroId), razon: p.nombre, email: p.fiscal.email || p.email, telefono: p.fiscal.telefono || p.telefono } : p.fiscal,
    };
    onGuardar(final);
  };
  const [hacienda, setHacienda] = useState<{ cargando: boolean; msg: string; ok: boolean; actividades: ActividadEconomica[] }>({ cargando: false, msg: '', ok: false, actividades: [] });
  const consultar = async () => {
    const ced = p.fiscal.misma ? p.numeroId : p.fiscal.numeroId;
    setHacienda(x => ({ ...x, cargando: true, msg: '' }));
    const r = await consultarHacienda(ced);
    if ('error' in r) return setHacienda({ cargando: false, ok: false, msg: r.error, actividades: [] });
    if (!p.fiscal.misma && r.nombre) setF({ razon: r.nombre });
    if (r.actividades.length === 1) setF({ actividad: `${r.actividades[0].codigo} · ${r.actividades[0].nombre}` });
    setHacienda({ cargando: false, ok: true, msg: `${r.nombre}${r.regimen ? ` · ${r.regimen}` : ''} · ${r.actividades.length} ${r.actividades.length === 1 ? 'actividad inscrita' : 'actividades inscritas'}`, actividades: r.actividades });
  };
  const receptor = p.fiscal.emitir ? (p.fiscal.misma ? p.nombre : p.fiscal.razon) : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Seccion titulo={<>Identificación
        <span style={{ display: 'inline-flex', gap: 16, fontWeight: 400 }}>
          <Radio name="tipo-perfil" checked={!empresa} onChange={() => !dis && set({ tipo: 'cliente', tipoId: p.tipoId === 'Cédula Jurídica' ? '' : p.tipoId })} label="Cliente" />
          <Radio name="tipo-perfil" checked={empresa} onChange={() => !dis && set({ tipo: 'empresa', tipoId: 'Cédula Jurídica' })} label="Empresa" />
        </span></>}
        acciones={modo === 'ver' && <Button onClick={onEditar}>Editar perfil ✎</Button>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'start' }}>
          <Campo label="Tipo de identificación" required error={err.tipoId}>
            <Select value={p.tipoId} onChange={v => cambiarTipoId(v as TipoId)} disabled={dis} error={err.tipoId}
              options={[{ value: '', label: 'Seleccionar' }, ...TIPOS_ID.filter(t => (empresa ? t === 'Cédula Jurídica' : t !== 'Cédula Jurídica')).map(t => ({ value: t, label: t }))]} />
          </Campo>
          <Campo label="Número de identificación" required error={err.numeroId} hint={p.tipoId ? `Formato: ${REGLAS_ID[p.tipoId].formato}` : undefined}>
            <Input value={p.numeroId} onChange={v => { set({ numeroId: p.tipoId === 'Pasaporte' ? v.toUpperCase().slice(0, 20) : v.replace(/[^\d-]/g, '') }); setAviso(null); }} disabled={dis} placeholder="Ingresa la identidad" error={err.numeroId}
              onBlur={() => p.tipoId && set({ numeroId: formatearId(p.tipoId, p.numeroId) })} />
          </Campo>
          <div style={{ paddingTop: 22 }}><Button variant="secondary" onClick={buscar} disabled={dis}>Buscar</Button></div>
        </div>
        {aviso && <p role="status" style={{ margin: 0, fontSize: 12, color: aviso.ok ? '#2E7D32' : '#B45309' }}>ⓘ {aviso.t}</p>}
      </Seccion>

      <Seccion titulo="Información general">
        <Grid cols={3}>
          {empresa ? <>
            <Campo label="Razón social" required error={err.nombre} style={{ gridColumn: 'span 2' }}><Input value={p.nombre} onChange={v => set({ nombre: v })} disabled={dis} error={err.nombre} placeholder="Ingresa la razón social" /></Campo>
            <Campo label="Nombre comercial (opcional)"><Input value={p.nombreComercial} onChange={v => set({ nombreComercial: v })} disabled={dis} /></Campo>
          </> : <>
            <Campo label="Nombre completo" required error={err.nombre}><Input value={p.nombre} onChange={v => set({ nombre: v })} disabled={dis} error={err.nombre} placeholder="Ingresa el nombre" /></Campo>
            <Campo label="Fecha de nacimiento (opcional)"><Input type="date" value={p.fechaNac} max={HOY} onChange={v => set({ fechaNac: v })} disabled={dis} /></Campo>
            <Campo label="Género (opcional)"><div style={{ display: 'flex', gap: 18, height: 32, alignItems: 'center' }}>
              <Radio name="genero" checked={p.genero === 'M'} onChange={() => !dis && set({ genero: 'M' })} label="Masculino" />
              <Radio name="genero" checked={p.genero === 'F'} onChange={() => !dis && set({ genero: 'F' })} label="Femenino" /></div></Campo>
          </>}
          <Campo label="Nacionalidad (opcional)"><Select value={p.nacionalidad} onChange={v => set({ nacionalidad: v })} disabled={dis} options={[{ value: '', label: 'Seleccionar' }, ...Object.values(NACIONALIDADES).map(v => ({ value: v, label: v }))]} /></Campo>
          {!empresa && <Campo label="Profesión (opcional)"><Input value={p.profesion} onChange={v => set({ profesion: v })} disabled={dis} placeholder="Ingresa la profesión" /></Campo>}
          <Campo label="Email" required error={err.email} style={empresa ? { gridColumn: 'span 2' } : undefined}><Input type="email" value={p.email} onChange={v => set({ email: v.trim() })} disabled={dis} error={err.email} placeholder="Ingresa el email" /></Campo>
          <Campo label="Teléfono" required error={err.telefono}><Input value={p.telefono} onChange={v => set({ telefono: v.replace(/[^\d +-]/g, '') })} disabled={dis} error={err.telefono} placeholder="Ingresa el teléfono" /></Campo>
          <Campo label="Teléfono secundario (opcional)"><Input value={p.telefono2} onChange={v => set({ telefono2: v.replace(/[^\d +-]/g, '') })} disabled={dis} placeholder="Ingresa el teléfono" /></Campo>
          <Campo label="Fax (opcional)"><Input value={p.fax} onChange={v => set({ fax: v.replace(/[^\d +-]/g, '') })} disabled={dis} placeholder="Ingresa el fax" /></Campo>
        </Grid>
      </Seccion>

      <Seccion titulo="Dirección de contacto">
        <CamposDireccion d={p.dir} set={d => set({ dir: d })} dis={dis} />
        {err.pais && <p role="alert" style={{ margin: 0, fontSize: 11, color: C.error }}>El país es obligatorio.</p>}
      </Seccion>

      <Seccion titulo="Información fiscal (crear receptor en DICR)" acciones={<Switch checked={p.fiscal.emitir} onChange={b => !dis && setF({ emitir: b })} disabled={dis} label="Emitir factura electrónica" />}>
        {!p.fiscal.emitir ? <p style={{ margin: 0, fontSize: 12, color: C.n700 }}>Cliente sin factura electrónica. Activa el interruptor para registrarlo como receptor en DICR.</p> : <>
          <Checkbox checked={p.fiscal.misma} onChange={b => !dis && setF({ misma: b })} label="Utilizar la misma información agregada" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={consultar} disabled={dis || hacienda.cargando || !(p.fiscal.misma ? p.numeroId : p.fiscal.numeroId)}>{hacienda.cargando ? 'Consultando…' : 'Consultar en Hacienda'}</Button>
            {hacienda.msg && <span role="status" style={{ fontSize: 12, color: hacienda.ok ? '#2E7D32' : '#B45309' }}>{hacienda.msg}</span>}
          </div>
          <Grid cols={3} style={{ alignItems: 'start' }}>
            <Campo label="Tipo de identificación" required><Select value={p.fiscal.misma ? p.tipoId : p.fiscal.tipoId} onChange={v => setF({ tipoId: v as TipoId })} disabled={dis || p.fiscal.misma} options={[{ value: '', label: 'Seleccionar' }, ...TIPOS_ID.map(t => ({ value: t, label: t }))]} /></Campo>
            <Campo label="Número de identificación" required><Input value={p.fiscal.misma ? p.numeroId : p.fiscal.numeroId} onChange={v => setF({ numeroId: v })} disabled={dis || p.fiscal.misma} /></Campo>
            <Campo label="Razón social" required><Input value={p.fiscal.misma ? p.nombre : p.fiscal.razon} onChange={v => setF({ razon: v })} disabled={dis || p.fiscal.misma} /></Campo>
            <Campo label="Email de facturación" required error={err.fiscalEmail}><Input type="email" value={p.fiscal.email} onChange={v => setF({ email: v.trim() })} disabled={dis} placeholder={p.email || 'fe@empresa.com'} error={err.fiscalEmail} /></Campo>
            <Campo label="Teléfono" required error={err.fiscalTel}><Input value={p.fiscal.telefono} onChange={v => setF({ telefono: v })} disabled={dis} placeholder={p.telefono} /></Campo>
            <Campo label="Código de actividad económica" required error={err.actividad}><BuscadorActividad value={p.fiscal.actividad} onChange={v => setF({ actividad: v })} extra={hacienda.actividades} disabled={dis} error={err.actividad} /></Campo>
          </Grid>
          <Campo label="Receptor" hint="Se crea o sincroniza en DICR al guardar y queda vinculado a este perfil (FDK ↔ DICR)."><Input value={receptor} readOnly /></Campo>
          {err.fiscal && <p role="alert" style={{ margin: 0, fontSize: 11, color: C.error }}>{err.fiscal}</p>}
          <Checkbox checked={p.fiscal.mismaDir} onChange={b => !dis && setF({ mismaDir: b })} label="Utilizar la misma dirección de contacto" />
          {!p.fiscal.mismaDir && <CamposDireccion d={p.fiscal.dir} set={d => setF({ dir: d })} dis={dis} obligatorios />}
          {err.fiscalDir && <p role="alert" style={{ margin: 0, fontSize: 11, color: C.error }}>{err.fiscalDir}</p>}
        </>}
      </Seccion>

      <Seccion titulo="Información adicional (opcional)" acciones={<Button variant="ghost" onClick={() => setExtraAbierta(a => !a)} aria-expanded={extraAbierta}>{extraAbierta ? 'Ocultar ▴' : 'Mostrar ▾'}</Button>}>
        {extraAbierta && <>
          <Grupo titulo="Crédito">
            <Grid cols={3} style={{ alignItems: 'start' }}>
              <div style={{ paddingTop: 26 }}><Checkbox checked={p.extra.credito} onChange={b => !dis && setX({ credito: b, ...(b ? {} : { dias: '', maximo: '' }) })} label="Activar crédito" /></div>
              <Campo label="Días de crédito" required={p.extra.credito} error={err.dias}><Input type="number" value={p.extra.dias} onChange={v => setX({ dias: v })} disabled={dis || !p.extra.credito} placeholder="Ingresar días" error={err.dias} /></Campo>
              <Campo label="Máximo de crédito (opcional)"><Input type="number" value={p.extra.maximo} onChange={v => setX({ maximo: v })} disabled={dis || !p.extra.credito} placeholder="$ 0.00" /></Campo>
            </Grid>
          </Grupo>
          <Grupo titulo="Condiciones comerciales">
            <Grid cols={3} style={{ alignItems: 'start' }}>
              <Campo label="Cuenta (opcional)"><Select value={p.extra.cuenta} onChange={v => setX({ cuenta: v })} disabled={dis} options={[{ value: '', label: 'Seleccionar' }, ...['Cuenta corriente', 'Cuenta corporativa', 'Cuenta casa'].map(x => ({ value: x, label: x }))]} /></Campo>
              <Campo label="Moneda (opcional)"><Select value={p.extra.moneda} onChange={v => setX({ moneda: v })} disabled={dis} options={[{ value: '', label: 'Seleccionar' }, { value: 'USD', label: 'USD - Dólar' }, { value: 'CRC', label: 'CRC - Colón' }]} /></Campo>
              <Campo label="Descuento (opcional)"><Select value={p.extra.descuento} onChange={v => setX({ descuento: v })} disabled={dis} options={[{ value: '', label: 'Seleccionar' }, ...['5%', '10%', '15%'].map(x => ({ value: x, label: `Descuento ${x}` }))]} /></Campo>
              <Campo label="Precio especial (opcional)"><Input type="number" value={p.extra.precioEspecial} onChange={v => setX({ precioEspecial: v })} disabled={dis} placeholder="$ 0.00" /></Campo>
              <Campo label="Red de viajes (opcional)"><Select value={p.extra.red} onChange={v => setX({ red: v })} disabled={dis} options={[{ value: '', label: 'Seleccionar' }, ...['Amadeus', 'Sabre', 'Travelport'].map(x => ({ value: x, label: x }))]} /></Campo>
            </Grid>
          </Grupo>
          <Grupo titulo="Preferencias del huésped">
            <Grid cols={3} style={{ alignItems: 'start' }}>
              <Campo label="Idioma (opcional)"><Select value={p.extra.idioma} onChange={v => setX({ idioma: v })} disabled={dis} options={[{ value: '', label: 'Seleccionar' }, ...['Español', 'Inglés', 'Francés', 'Alemán', 'Portugués'].map(x => ({ value: x, label: x }))]} /></Campo>
              <div style={{ paddingTop: 26 }}><Checkbox checked={p.extra.vip} onChange={b => !dis && setX({ vip: b })} label="Huésped VIP" /></div>
            </Grid>
            <Campo label="Observaciones (opcional)"><TextArea value={p.extra.observaciones} onChange={v => setX({ observaciones: v })} disabled={dis} rows={2} placeholder="Ingresa observaciones" /></Campo>
          </Grupo>
        </>}
      </Seccion>

      {!dis && (
        // Barra fija al pie del área con scroll: Guardar / Cancelar siempre a la vista mientras se edita.
        <section style={{ position: 'sticky', bottom: -24, zIndex: 3, background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, boxShadow: '0 -4px 14px rgba(15,15,15,.06)' }}>
          {sucio && <span style={{ marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: C.n900 }}><i style={{ width: 8, height: 8, borderRadius: '50%', background: C.warning }} />Tienes cambios sin guardar</span>}
          <Button variant="secondary" onClick={() => (sucio ? setSalir(true) : onCancelar())}>Cancelar</Button>
          <Button variant="secondary" onClick={() => setLimpiar(true)}>Limpiar formulario</Button>
          <Button onClick={guardar}>Guardar perfil</Button>
        </section>
      )}
      <Alerta open={limpiar} titulo="¿Limpiar el formulario?" tono="danger" confirmar="Sí, limpiar" onClose={() => setLimpiar(false)}
        onConfirm={() => { setP({ ...perfilVacio(p.tipo), id: p.id }); setErr({}); setAviso(null); setLimpiar(false); }}>Se borrarán todos los datos ingresados en el formulario.</Alerta>
      <Alerta open={salir} titulo="¿Deseas salir?" tono="danger" confirmar="Salir sin guardar" onClose={() => setSalir(false)} onConfirm={() => { setSalir(false); onCancelar(); }}>Los cambios no se guardarán.</Alerta>
    </div>
  );
}

/** Subgrupo dentro de una sección (Crédito, Condiciones comerciales, Preferencias). */
function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12, borderTop: `1px solid ${C.n500}` }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.04em', color: C.n700 }}>{titulo.toUpperCase()}</span>
      {children}
    </div>
  );
}
