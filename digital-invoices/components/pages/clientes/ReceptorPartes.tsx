'use client';
// Piezas compartidas de terceros (clientes, proveedores y receptores):
//  · DatosTributarios: lo que Hacienda necesita del receptor de una factura.
//    Aparece solo cuando el tercero está marcado como receptor.
//  · ActivarCuentaModal: crea la cuenta auxiliar en Contabilidad a un
//    receptor y, si se quiere, le activa crédito.
//  · ComprasPorCorreo: importación automática de las facturas de un proveedor.
// Guardan con PATCH /api/clientes/:id (base única de terceros).
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { C, FONT, Button, FormField, Input, Select, Modal, Checkbox, Switch, radius } from '@/components/ui/primitives';
import { tiposIdentificacion } from '@/lib/calculoFactura';
import { PROVINCIAS } from '@/data/divisionTerritorial';
import { ACTIVIDADES_ECONOMICAS } from '@/data/actividadesEconomicas';
import { cuentasCompra } from '@/lib/cuentasContables';
import CuentaSelect from '@/components/pages/facturacion/CuentaSelect';
import { conContabilidad } from '@/lib/modulosCliente';
import { errorReceptorGT } from '@/lib/perfilPais';
import { nombreUbicacion } from '@/components/ui/UbicacionCR';
import UbicacionCR from '@/components/ui/UbicacionCR';
import { autoridad, esGuatemalaActual, segunPais } from '@/lib/paisActual';

// Fila de la tabla clientes (lo que devuelve GET /api/clientes)
export interface TerceroFila {
  id: string; nombre: string; tipo: string; tipo_identificacion: string | null; numero_identificacion: string | null;
  email: string | null; telefono: string | null; direccion_fiscal: string | null; actividad_economica?: string | null;
  nombre_comercial?: string | null; dias_credito?: number | null; es_receptor?: number | null; con_cuenta?: number | null;
  provincia?: string | null; canton?: string | null; distrito?: string | null; otras_senas?: string | null; correos_copia?: string | null;
  compras_auto?: number | null; cuenta_gasto?: string | null; correos_compra?: string | null; datos_json?: string | null; activo?: number | null;
  regimen?: string | null; representante_legal?: string | null; exoneracion_codigo?: string | null; exonerado?: number | null;
  actividades_json?: string | null; actividad_empresa?: string | null;
}

export const esSoloReceptor = (t: TerceroFila) => Number(t.con_cuenta ?? 1) !== 1;
// Cliente, proveedor o solo receptor (sin cuenta en Contabilidad)
export function tipoTercero(t: TerceroFila): 'Cliente' | 'Proveedor' | 'Solo receptor' {
  if (t.tipo === 'proveedor' || t.tipo === '04') return 'Proveedor';
  // Solo facturación: no hay cuentas contables, todo receptor es cliente
  if (!conContabilidad()) return 'Cliente';
  return cuentaDe(t) ? 'Cliente' : 'Solo receptor';
}
export function cuentaDe(t: TerceroFila): string | null {
  if (!conContabilidad() || esSoloReceptor(t) || !t.datos_json) return null;
  try { const p = JSON.parse(t.datos_json); return p.cuentaCode && p.auxId ? `${p.cuentaCode}-${p.auxId}` : null; } catch { return null; }
}

async function patch(id: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/clientes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json().catch(() => ({}));
}

const correoOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const listaCorreos = (s: string) => s.split(/[\s,;]+/).map(x => x.trim()).filter(Boolean);
const LARGO_ID: Record<string, number[]> = { '01': [9], '02': [10], '03': [11, 12], '04': [10] };

// Cada bloque de los datos tributarios: tarjeta con título y una línea de qué es
function Bloque({ titulo: t, desc, children, derecha }: { titulo: string; desc?: string; children: ReactNode; derecha?: ReactNode }) {
  return (
    <section style={{ border: `1px solid ${C.n500}`, borderRadius: 10, background: '#fff' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${C.n500}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.n900 }}>{t}</div>
          {desc && <div style={{ fontSize: 11.5, color: C.n700, marginTop: 2 }}>{desc}</div>}
        </div>
        {derecha}
      </header>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </section>
  );
}

// ── Datos tributarios del receptor ──────────────────────────────────────────
// completo=false: solo identificación, consulta a Hacienda, régimen y actividad
// (lo que se necesita aunque no sea receptor). completo: además lo del envío de
// comprobantes, ubicación y exoneración.
// resumen=false: sin la franja con el nombre (cuando la pantalla ya lo muestra, como el perfil)
// columnas: en pantalla propia, los bloques en dos columnas
// seccion (pantalla del receptor con pestañas): «general» = identificación y
// actividades; «comprobantes» = envío, ubicación y exoneración; «oculto» = no se
// muestra pero conserva lo escrito. formId: el botón Guardar vive en el
// encabezado de la pantalla (form="…"), sin barra propia.
export function DatosTributarios({ tercero, onGuardado, completo = true, resumen = true, columnas = false, seccion = 'todo', formId }: {
  tercero: TerceroFila; onGuardado: (mensaje: string) => void; completo?: boolean; resumen?: boolean; columnas?: boolean;
  seccion?: 'todo' | 'general' | 'comprobantes' | 'oculto'; formId?: string;
}) {
  const ver = (b: 'general' | 'comprobantes') => seccion === 'todo' || seccion === b;
  const [f, setF] = useState(() => ({
    tipoIdentificacion: tercero.tipo_identificacion || '02', numeroIdentificacion: tercero.numero_identificacion ?? '',
    nombreComercial: tercero.nombre_comercial ?? '', email: tercero.email ?? '', correosCopia: tercero.correos_copia ?? '',
    actividadEconomica: tercero.actividad_economica ?? '', telefono: tercero.telefono ?? '',
    provincia: tercero.provincia ?? '', canton: tercero.canton ?? '', distrito: tercero.distrito ?? '', otrasSenas: tercero.otras_senas ?? '',
    regimen: tercero.regimen ?? '', representanteLegal: tercero.representante_legal ?? '',
    exoneracionId: Number(tercero.exonerado ?? 0) === 1 ? tercero.exoneracion_codigo ?? '' : '',
  }));
  // Exoneraciones de Configuración › Facturación electrónica › Exoneraciones
  const [exoneraciones, setExoneraciones] = useState<{ id: string; nombre: string; porcentaje: number; activo: number }[]>([]);
  useEffect(() => {
    let vivo = true;
    fetch('/api/exoneraciones').then(r => r.json()).then(d => { if (vivo && Array.isArray(d)) setExoneraciones(d); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const set = (p: Partial<typeof f>) => setF(x => ({ ...x, ...p }));
  // Sus actividades (varias, de Hacienda; la principal va en sus comprobantes)
  // y la actividad de nuestra empresa que se le asocia (predeterminada en sus
  // ventas y compras; se puede cambiar en cada documento)
  const [actividades, setActividades] = useState<string[]>(() => {
    try { const l = tercero.actividades_json ? JSON.parse(tercero.actividades_json) : null; if (Array.isArray(l) && l.length) return l.map(String); } catch { /* lista vacía */ }
    return tercero.actividad_economica ? [tercero.actividad_economica] : [];
  });
  const [nuevaActividad, setNuevaActividad] = useState('');
  const [actividadEmpresa, setActividadEmpresa] = useState(tercero.actividad_empresa ?? '');
  const [misActividades, setMisActividades] = useState<string[]>([]);
  useEffect(() => {
    let vivo = true;
    fetch('/api/emisores').then(r => r.json()).then((es: { activo: number; actividad_economica: string; actividades_json?: string | null }[]) => {
      const e = es.find(x => Number(x.activo) === 1) ?? es[0];
      let acts: { codigo: string; nombre: string; principal?: boolean }[] = [];
      try { acts = e?.actividades_json ? JSON.parse(e.actividades_json) : []; } catch { acts = []; }
      const l = acts.sort((a, b) => Number(Boolean(b.principal)) - Number(Boolean(a.principal))).map(a => `${a.codigo} - ${a.nombre}`);
      if (vivo) setMisActividades(l.length ? l : e?.actividad_economica ? [e.actividad_economica] : []);
    }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  function agregarActividad(a: string) {
    const v = a.trim(); if (!v) return;
    setActividades(l => l.includes(v) ? l : [...l, v]);
    if (!f.actividadEconomica) set({ actividadEconomica: v });
    setNuevaActividad('');
  }
  function quitarActividad(a: string) {
    setActividades(l => l.filter(x => x !== a));
    if (f.actividadEconomica === a) set({ actividadEconomica: actividades.find(x => x !== a) ?? '' });
  }
  // Consulta pública de Hacienda por cédula: nombre, tipo, régimen y actividades
  const [hacienda, setHacienda] = useState<{ nombre: string; regimen: string; actividades: { codigo: string; nombre: string }[]; cuando: string } | null>(null);
  const [nombreHacienda, setNombreHacienda] = useState<string | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [errorHacienda, setErrorHacienda] = useState<string | null>(null);
  async function consultarHacienda(cedula = f.numeroIdentificacion) {
    const dig = cedula.replace(/\D/g, '');
    if (dig.length < 9) { setErrorHacienda(segunPais('Escribe la cédula completa (9 a 12 dígitos).')); return; }
    setConsultando(true); setErrorHacienda(null);
    const r = await fetch(`/api/hacienda/contribuyente?id=${dig}`).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setConsultando(false);
    if (!r || !r.ok) { setErrorHacienda(d.error ?? segunPais('No se pudo consultar Hacienda.')); return; }
    const acts: { codigo: string; nombre: string }[] = Array.isArray(d.actividades) ? d.actividades : [];
    setHacienda({ nombre: String(d.nombre ?? ''), regimen: String(d.regimen ?? ''), actividades: acts, cuando: new Date().toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' }) });
    if (d.nombre && String(d.nombre).trim().toLowerCase() !== tercero.nombre.trim().toLowerCase()) setNombreHacienda(String(d.nombre).trim());
    if (acts.length) setActividades(acts.map(a => `${a.codigo} - ${a.nombre}`));
    setF(x => ({
      ...x,
      numeroIdentificacion: dig,
      tipoIdentificacion: ['01', '02', '03', '04'].includes(String(d.tipoIdentificacion)) ? String(d.tipoIdentificacion) : x.tipoIdentificacion,
      regimen: /simplific/i.test(String(d.regimen ?? '')) ? '02' : d.regimen ? '01' : x.regimen,
      // Si ya tenía una actividad que sigue inscrita, se respeta; si no, la primera
      actividadEconomica: acts.some(a => x.actividadEconomica.startsWith(a.codigo)) ? x.actividadEconomica : acts[0] ? `${acts[0].codigo} - ${acts[0].nombre}` : x.actividadEconomica,
    }));
  }
  // Al abrir: si ya tiene cédula y le faltan datos tributarios, se consulta sola
  const [autoConsultado, setAutoConsultado] = useState(false);
  if (!autoConsultado) {
    setAutoConsultado(true);
    if (f.tipoIdentificacion !== '05' && f.numeroIdentificacion.replace(/\D/g, '').length >= 9 && !f.actividadEconomica) queueMicrotask(() => { consultarHacienda(); });
  }
  // Guatemala: sin actividades económicas ni exoneraciones; dirección por departamento y municipio
  const gt = esGuatemalaActual();
  const cantones = f.provincia ? PROVINCIAS[f.provincia]?.cantones ?? {} : {};
  const distritos = f.canton ? cantones[f.canton]?.distritos ?? {} : {};
  const extranjero = f.tipoIdentificacion === '05';

  async function guardar() {
    const dig = f.numeroIdentificacion.replace(/\D/g, '');
    const largo = LARGO_ID[f.tipoIdentificacion];
    if (gt) {
      const errId = f.tipoIdentificacion === '06' ? null : errorReceptorGT(f.tipoIdentificacion, f.numeroIdentificacion, 0, 'FACT');
      if (errId) { setError(errId); return; }
    } else if (!extranjero && largo && !largo.includes(dig.length)) { setError(`La identificación debe tener ${largo.join(' u ')} dígitos.`); return; }
    if (f.email && !correoOk(f.email)) { setError('Revisa el correo para enviar comprobantes.'); return; }
    if (listaCorreos(f.correosCopia).some(c => !correoOk(c))) { setError('Revisa los correos de copia.'); return; }
    setError(null); setGuardando(true);
    const prov = PROVINCIAS[f.provincia];
    const direccion = gt ? [f.otrasSenas, nombreUbicacion({ provincia: f.provincia, canton: f.canton, distrito: f.distrito })].filter(Boolean).join(', ')
      : [prov?.nombre, cantones[f.canton]?.nombre, distritos[f.distrito], f.otrasSenas].filter(Boolean).join(', ');
    await patch(tercero.id, {
      tipoIdentificacion: f.tipoIdentificacion, numeroIdentificacion: f.numeroIdentificacion.trim(), nombreComercial: f.nombreComercial.trim() || null,
      email: f.email.trim() || null, correosCopia: listaCorreos(f.correosCopia).join(', ') || null, actividadEconomica: f.actividadEconomica || actividades[0] || null,
      actividadesJson: actividades.length ? JSON.stringify(actividades) : null, actividadEmpresa: actividadEmpresa || null,
      telefono: f.telefono.trim() || null, provincia: f.provincia || null, canton: f.canton || null, distrito: f.distrito || null,
      otrasSenas: f.otrasSenas.trim() || null, direccionFiscal: direccion || null,
      regimen: f.regimen || null, representanteLegal: f.representanteLegal.trim() || null, exoneracionId: f.exoneracionId || null,
    });
    setGuardando(false);
    onGuardado('Datos tributarios guardados.');
  }

  // Qué falta para facturarle (se muestra arriba, junto al nombre)
  const faltan = [
    !f.numeroIdentificacion.trim() && 'identificación',
    !extranjero && !gt && actividades.length === 0 && 'actividad económica',
    completo && !f.email.trim() && 'correo',
  ].filter(Boolean) as string[];


  return (
    <form id={formId} onSubmit={e => { e.preventDefault(); guardar(); }}
      style={{ display: seccion === 'oculto' ? 'none' : 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT, maxWidth: columnas ? 'none' : 680 }}>
      {/* Resumen: quién es y si está listo para facturarle */}
      {resumen && <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: faltan.length ? C.warningBg : C.successBg, border: `1px solid ${faltan.length ? 'rgba(238,179,0,.35)' : 'rgba(76,175,80,.3)'}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.n900 }}>{tercero.nombre}</div>
          <div style={{ fontSize: 12, color: C.n700, marginTop: 2 }}>
            {tiposIdentificacion().find(t => t.value === f.tipoIdentificacion)?.label ?? 'Identificación'} {f.numeroIdentificacion || 'sin número'}
            {f.actividadEconomica ? ` · ${f.actividadEconomica.split(' - ')[0]}` : ''}
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: faltan.length ? '#8A6A00' : C.successDk ?? '#2E7D32' }}>
          {faltan.length ? `Falta: ${faltan.join(', ')}` : 'Listo para facturarle'}
        </span>
      </div>}

      <div style={columnas ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 14, alignItems: 'start' } : { display: 'flex', flexDirection: 'column', gap: 14 }}>
      {ver('general') && <>
      <Bloque titulo="Identificación" desc={gt ? 'Nombre e identificación del receptor (NIT, CUI o pasaporte).' : 'Con la cédula se traen de Hacienda el nombre, el régimen y las actividades.'}
        derecha={!extranjero ? <Button variant="secondary" onClick={() => consultarHacienda()} disabled={consultando}>{consultando ? 'Consultando…' : `Consultar en ${autoridad()}`}</Button> : undefined}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Tipo de identificación"><Select value={f.tipoIdentificacion} onChange={v => set({ tipoIdentificacion: v })} options={tiposIdentificacion().map(t => ({ value: t.value, label: t.label }))} /></FormField>
          <FormField label={extranjero ? 'Pasaporte o identificación' : 'Número de identificación'} required><Input value={f.numeroIdentificacion} onChange={v => set({ numeroIdentificacion: v })} /></FormField>
        </div>
        {errorHacienda && <div style={{ fontSize: 12, color: C.error }}>{errorHacienda}</div>}
        {hacienda && (
          <div style={{ background: C.n200, borderRadius: 8, padding: '10px 12px', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span><b style={{ fontWeight: 600 }}>{hacienda.nombre || 'Sin nombre'}</b>{hacienda.regimen ? ` · ${hacienda.regimen}` : ''} <span style={{ color: C.n700 }}>· consultado {hacienda.cuando}</span></span>
            {nombreHacienda && (
              <span style={{ color: C.n700 }}>En {autoridad()} el nombre es «{nombreHacienda}». {' '}
                <button type="button" onClick={async () => { await patch(tercero.id, { nombre: nombreHacienda }); setNombreHacienda(null); onGuardado(`Nombre actualizado con el de ${autoridad()}.`); }}
                  style={{ background: 'none', border: 'none', padding: 0, color: C.brand, cursor: 'pointer', fontSize: 12, textDecoration: 'underline', fontFamily: FONT }}>Usar ese nombre</button>
              </span>
            )}
            {hacienda.actividades.length === 0 && <span style={{ color: C.n700 }}>No tiene actividades inscritas (no es contribuyente).</span>}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: completo ? '1fr 1fr' : '1fr', gap: 12 }}>
          {completo && <FormField label="Nombre comercial (opcional)"><Input value={f.nombreComercial} onChange={v => set({ nombreComercial: v })} /></FormField>}
          {/* Régimen general o simplificado: solo Costa Rica */}
          {!gt && <FormField label="Régimen tributario"><Select value={f.regimen} onChange={v => set({ regimen: v })} options={[{ value: '', label: 'Sin indicar' }, { value: '01', label: 'Régimen general' }, { value: '02', label: 'Régimen simplificado' }]} /></FormField>}
        </div>
        {completo && <FormField label="Representante legal (opcional)"><Input value={f.representanteLegal} onChange={v => set({ representanteLegal: v })} placeholder="Nombre completo" /></FormField>}
      </Bloque>

      {/* Las dos de actividades van juntas en la columna derecha */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!gt && <>
      <Bloque titulo="Actividades del receptor" desc="Las que tiene inscritas en Hacienda. La principal es la que va en sus comprobantes.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {actividades.length === 0 && <span style={{ fontSize: 12, color: C.n700 }}>Sin actividades: consúltalas en Hacienda o agrégalas.</span>}
          {actividades.map(a => (
            <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '7px 10px', border: `1px solid ${f.actividadEconomica === a ? C.brandBd : C.n500}`, background: f.actividadEconomica === a ? C.brandBg : '#fff', borderRadius: 8, cursor: 'pointer' }}>
              <input type="radio" name={`principal-${tercero.id}`} checked={f.actividadEconomica === a} onChange={() => set({ actividadEconomica: a })} aria-label={`Principal: ${a}`} />
              <span style={{ flex: 1 }}>{a}</span>
              {f.actividadEconomica === a && <span style={{ fontSize: 11, color: C.brand, fontWeight: 600 }}>Principal</span>}
              <button type="button" onClick={e => { e.preventDefault(); quitarActividad(a); }} aria-label={`Quitar ${a}`} style={{ background: 'none', border: 'none', color: C.n700, cursor: 'pointer', fontSize: 15 }}>×</button>
            </label>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><Input value={nuevaActividad} onChange={setNuevaActividad} list="actividades-ciiu-terceros" placeholder="Agregar por código o nombre" /></div>
            <Button variant="secondary" onClick={() => agregarActividad(nuevaActividad)} disabled={!nuevaActividad.trim()}>Agregar</Button>
          </div>
        </div>
        <datalist id="actividades-ciiu-terceros">{ACTIVIDADES_ECONOMICAS.map(a => <option key={a.codigo} value={`${a.codigo} - ${a.nombre}`} />)}</datalist>
      </Bloque>

      <Bloque titulo="Actividad de mi empresa" desc="Con cuál de tus actividades se registran las ventas y compras con este receptor. Marca la predeterminada; se puede cambiar en cada documento.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {misActividades.map((a, i) => {
            const elegida = (actividadEmpresa || misActividades[0]) === a;
            return (
              <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '7px 10px', border: `1px solid ${elegida ? C.brandBd : C.n500}`, background: elegida ? C.brandBg : '#fff', borderRadius: 8, cursor: 'pointer' }}>
                <input type="radio" name={`mi-actividad-${tercero.id}`} checked={elegida} onChange={() => setActividadEmpresa(a)} />
                <span style={{ flex: 1 }}>{a}</span>
                {i === 0 && <span style={{ fontSize: 11, color: C.n700 }}>Principal de la empresa</span>}
                {elegida && <span style={{ fontSize: 11, color: C.brand, fontWeight: 600 }}>Predeterminada</span>}
              </label>
            );
          })}
        </div>
      </Bloque>
      </>}
      </div>
      </>}

      {completo && ver('comprobantes') && (
        <Bloque titulo="Envío de comprobantes" desc="A dónde le llega cada comprobante.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Correo" required><Input value={f.email} onChange={v => set({ email: v })} type="email" /></FormField>
            <FormField label="Teléfono"><Input value={f.telefono} onChange={v => set({ telefono: v })} /></FormField>
          </div>
          <FormField label="Copias (opcional)" hint="Varios correos separados por comas."><Input value={f.correosCopia} onChange={v => set({ correosCopia: v })} placeholder="contabilidad@empresa.cr" /></FormField>
        </Bloque>
      )}

      {completo && ver('comprobantes') && (gt
        ? <Bloque titulo="Ubicación" desc="Dirección que va en sus documentos.">
          <UbicacionCR value={{ provincia: f.provincia, canton: f.canton, distrito: f.distrito }} onChange={u => set({ provincia: u.provincia, canton: u.canton, distrito: u.distrito })} />
          <FormField label="Dirección"><Input value={f.otrasSenas} onChange={v => set({ otrasSenas: v })} placeholder="Calle, zona, edificio" /></FormField>
        </Bloque>
        : <Bloque titulo="Ubicación" desc="Dirección que va en sus comprobantes.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <FormField label="Provincia"><Select value={f.provincia} onChange={v => set({ provincia: v, canton: '', distrito: '' })}
              options={[{ value: '', label: 'Elegir' }, ...Object.entries(PROVINCIAS).map(([k, p]) => ({ value: k, label: p.nombre }))]} /></FormField>
            <FormField label="Cantón"><Select value={f.canton} disabled={!f.provincia} onChange={v => set({ canton: v, distrito: '' })}
              options={[{ value: '', label: 'Elegir' }, ...Object.entries(cantones).sort((a, b) => a[1].nombre.localeCompare(b[1].nombre)).map(([k, c]) => ({ value: k, label: c.nombre }))]} /></FormField>
            <FormField label="Distrito"><Select value={f.distrito} disabled={!f.canton} onChange={v => set({ distrito: v })}
              options={[{ value: '', label: 'Elegir' }, ...Object.entries(distritos).sort((a, b) => a[0].localeCompare(b[0])).map(([k, d]) => ({ value: k, label: d }))]} /></FormField>
          </div>
          <FormField label="Otras señas"><Input value={f.otrasSenas} onChange={v => set({ otrasSenas: v })} placeholder="Barrio, calle, edificio" /></FormField>
        </Bloque>
      )}

      {completo && ver('comprobantes') && !gt && (
        <Bloque titulo="Exoneración" desc="Si tiene una vigente, se aplica sola a sus líneas al facturarle.">
          <Select value={f.exoneracionId} onChange={v => set({ exoneracionId: v })}
            options={[{ value: '', label: 'Sin exoneración' }, ...exoneraciones.filter(e => Number(e.activo ?? 1) === 1 || e.id === f.exoneracionId).map(e => ({ value: e.id, label: `${e.nombre} (${Number(e.porcentaje)}%)` }))]} />
        </Bloque>
      )}

      </div>

      {/* Guardar siempre a la vista (en la pantalla del receptor va en el encabezado) */}
      {formId ? (error && <div style={{ fontSize: 12, color: C.error }}>{error}</div>) : <div style={{ position: 'sticky', bottom: columnas ? -24 : -20, background: columnas ? C.n200 : '#fff', padding: columnas ? '12px 0 24px' : '12px 0 20px', marginBottom: columnas ? -24 : -20, borderTop: `1px solid ${C.n500}`, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', boxShadow: '0 -8px 12px -10px rgba(0,0,0,.15)' }}>
        {error && <span style={{ fontSize: 12, color: C.error, marginRight: 'auto' }}>{error}</span>}
        <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : completo ? 'Guardar datos tributarios' : 'Guardar información tributaria'}</Button>
      </div>}
    </form>
  );
}

// ── Crear cuenta en Contabilidad (+ crédito) ────────────────────────────────
export function ActivarCuentaModal({ tercero, onClose, onHecho, titulo, aviso, textoBoton, alternativa, soloCredito }: {
  tercero: { id: string; nombre: string; dias_credito?: number | null; tipo?: string | null };
  onClose: () => void;
  onHecho: (r: { cuenta: string | null; diasCredito: number }) => void;
  titulo?: string; aviso?: string; textoBoton?: string;
  alternativa?: { label: string; ayuda?: string; onClick: () => void };   // otra salida (p. ej. emitir sin cuenta)
  soloCredito?: boolean;                                                   // la venta ya es a crédito: no se puede desmarcar
}) {
  // La cuenta puede ser de cliente (por cobrar) o de proveedor (por pagar)
  const [como, setComo] = useState<'cliente' | 'proveedor'>(tercero.tipo === 'proveedor' ? 'proveedor' : 'cliente');
  const [credito, setCredito] = useState(true);
  const [dias, setDias] = useState(String(Number(tercero.dias_credito ?? 0) || 30));
  const [guardando, setGuardando] = useState(false);
  async function crear() {
    const d = credito ? Math.max(1, Number(dias) || 0) : 0;
    setGuardando(true);
    const r = await patch(tercero.id, { crearCuenta: true, diasCredito: como === 'cliente' ? d : 0, tipo: como });
    setGuardando(false);
    onHecho({ cuenta: r.cuenta ?? null, diasCredito: d });
  }
  return (
    <Modal open width={540} title={titulo ?? 'Crear su cuenta en Contabilidad'} onClose={onClose}
      footer={<div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <div>{alternativa && <Button variant="secondary" onClick={alternativa.onClick}>{alternativa.label}</Button>}
          {alternativa?.ayuda && <span style={{ fontSize: 11, color: C.n700, marginLeft: 8 }}>{alternativa.ayuda}</span>}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={crear} disabled={guardando || (como === 'cliente' && credito && !(Number(dias) > 0))}>{guardando ? 'Creando…' : textoBoton ?? 'Crear cuenta'}</Button>
        </div>
      </div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
        <p style={{ fontSize: 12.5, margin: 0 }}>{aviso ?? <>A <b style={{ fontWeight: 600 }}>{tercero.nombre}</b> se le crea su cuenta auxiliar en Contabilidad.</>}</p>
        {!soloCredito && (
          <FormField label="Tipo de cuenta" required>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}><input type="radio" name="cuenta-como" checked={como === 'cliente'} onChange={() => setComo('cliente')} /> <b style={{ fontWeight: 600 }}>Cliente</b> <span style={{ color: C.n700 }}>· cuenta 110-001-0001-…, cuentas por cobrar</span></label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}><input type="radio" name="cuenta-como" checked={como === 'proveedor'} onChange={() => setComo('proveedor')} /> <b style={{ fontWeight: 600 }}>Proveedor</b> <span style={{ color: C.n700 }}>· cuenta 300-001-0001-…, cuentas por pagar</span></label>
            </div>
          </FormField>
        )}
        {como === 'cliente' && <div style={{ border: `1px solid ${C.brandBd}`, background: C.brandBg, borderRadius: radius.md, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!soloCredito && <Checkbox label="Activar crédito" checked={credito} onChange={setCredito} />}
          {credito && (
            <div style={{ marginLeft: soloCredito ? 0 : 24, maxWidth: 220 }}>
              <FormField label="Días de crédito" hint="Se propone en sus facturas como plazo.">
                <Input type="number" min="1" value={dias} onChange={setDias} />
              </FormField>
            </div>
          )}
          {!credito && <div style={{ fontSize: 11.5, color: C.n700, marginLeft: 24 }}>Sus facturas se proponen de contado. Puedes activarlo después.</div>}
        </div>}
      </div>
    </Modal>
  );
}

// ── Compras por correo (proveedores) ────────────────────────────────────────
export function ComprasPorCorreo({ tercero, onGuardado }: { tercero: TerceroFila; onGuardado: (mensaje: string) => void }) {
  const [auto, setAuto] = useState(Number(tercero.compras_auto ?? 1) !== 0);
  const [correos, setCorreos] = useState(tercero.correos_compra ?? '');
  const [cuenta, setCuenta] = useState(tercero.cuenta_gasto ?? '');
  const [error, setError] = useState<string | null>(null);
  const opciones = useMemo(() => cuentasCompra(), []);
  async function guardar() {
    if (listaCorreos(correos).some(c => !correoOk(c))) { setError('Revisa los correos.'); return; }
    setError(null);
    await patch(tercero.id, { comprasAuto: auto, correosCompra: listaCorreos(correos).join(', ') || null, cuentaGasto: cuenta || null });
    onGuardado('Configuración de compras guardada.');
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT, maxWidth: 640 }}>
      <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>Qué pasa con las facturas de este proveedor que llegan al buzón de facturas.</p>
      <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '12px 14px' }}>
        <Switch checked={auto} onChange={setAuto} label="Importar sus facturas automáticamente" />
        <div style={{ fontSize: 11.5, color: C.n700, marginTop: 6 }}>
          {auto
            ? 'Llegan solas a Documentos recibidos › Sin emitir, con las cuentas de la última vez. Solo falta emitir el acuse.'
            : 'Cada factura queda en Por importar y la revisas antes de importarla.'}
        </div>
      </div>
      <FormField label="Cuenta de gasto por defecto" hint="Para lo que nunca le has comprado. Lo ya clasificado usa la cuenta de la última vez.">
        <CuentaSelect value={cuenta} opciones={opciones} onChange={setCuenta} placeholder="Buscar cuenta de gasto…" />
      </FormField>
      <FormField label="Otros correos desde los que envía facturas (opcional)" hint={segunPais('Se reconoce por la cédula del comprobante. Agrega correos solo si la cédula no coincide. Separa varios con comas.')}>
        <Input value={correos} onChange={setCorreos} placeholder="facturacion@proveedor.cr" />
      </FormField>
      {error && <div style={{ fontSize: 12, color: C.error }}>{error}</div>}
      <div><Button onClick={guardar}>Guardar</Button></div>
    </div>
  );
}
