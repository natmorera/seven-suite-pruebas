'use client';
// Información tributaria (pestaña de Empresa cuando emite facturación
// electrónica). Los datos legales (nombre, cédula, teléfono) son los de la
// empresa; aquí va lo propio de Hacienda: actividades económicas (varias, una
// principal), certificado .p12, credenciales para enviar comprobantes y la
// sucursal (una sola en el MVP) con su dirección y correo.
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  C, FONT, Button, FormField, Input, Select, Section, StatusBadge, Toast, radius, PAGE_PAD, EmptyState,
} from '@/components/ui/primitives';
import { IcPlus, IcSearch, IcTrash, IcCheck } from '@/components/ui/icons';
import CertificadoEmisor, { insigniaLlave } from './CertificadoEmisor';
import VerificarCredenciales from './VerificarCredenciales';
import { Flotante } from './NuevaFacturaPartes';
import UbicacionCR, { type Ubicacion } from '@/components/ui/UbicacionCR';
import type { ConfigPlan } from './SucursalesSeccion';
import ChecklistFE from './ChecklistFE';
import { usePermisos } from '@/lib/permisosCliente';
import { buscarActividadEconomica } from '@/data/actividadesEconomicas';
import { Autoridad, segunPais, esGuatemalaActual } from '@/lib/paisActual';

export interface EmisorRow {
  id: string;
  razon_social: string;
  nombre_comercial: string;
  cedula_juridica: string;
  tipo_identificacion: string;
  actividad_economica: string;
  regimen: string;
  llave_cargada: number;
  vigencia_llave: string | null;
  activo: number;
  correo_electronico?: string | null;
  telefono?: string | null;
  provincia?: string | null; canton?: string | null; distrito?: string | null; barrio?: string | null; otras_senas?: string | null;
  correos_adicionales?: string | null; actividades_json?: string | null; alias?: string | null;
  usuario_hacienda?: string | null; tiene_clave_hacienda?: boolean; ambiente?: string | null;
  certificado_nombre?: string | null; certificado_emisor?: string | null; tiene_pin?: boolean;
  registro_bebidas?: string | null; registro_bebidas_vence?: string | null;
}

interface Actividad { codigo: string; nombre: string; principal: boolean }
interface Sucursal {
  id: string; emisor_id: string; codigo: string; nombre: string; provincia: string; canton: string; distrito: string;
  otras_senas: string; telefono: string; correo: string; activa: number; cajas: number;
}

export const REGIMENES = [{ value: 'Tradicional', label: 'Régimen tradicional' }, { value: 'Simplificado', label: 'Régimen simplificado' }];
// Ambiente de Hacienda: se explica con una tarjeta por opción.
export const AMBIENTES = [
  { value: 'pruebas', label: 'Pruebas', get detalle() { return segunPais('Para revisar que todo esté bien configurado. Los comprobantes van al ambiente de pruebas de Hacienda y no tienen validez fiscal. Usa el usuario y la llave de pruebas.'); } },
  { value: 'produccion', label: 'Producción', get detalle() { return segunPais('Para facturar de verdad. Los comprobantes son válidos ante Hacienda y cuentan para tus declaraciones. Usa el usuario y la llave de producción.'); } },
];

interface Form {
  tipoIdentificacion: string; cedulaJuridica: string; razonSocial: string; nombreComercial: string; regimen: string; alias: string;
  correoElectronico: string; telefono: string; correosAdicionales: string[];
  ubicacion: Ubicacion; barrio: string; otrasSenas: string;
  actividades: Actividad[];
  usuarioHacienda: string; claveHacienda: string; ambiente: string;
  registroBebidas: string; registroBebidasVence: string;
}

function aForm(e: EmisorRow): Form {
  let actividades: Actividad[] = [];
  try { actividades = e.actividades_json ? JSON.parse(e.actividades_json) : []; } catch { /* vacío */ }
  if (!actividades.length && e.actividad_economica) {
    const [codigo, ...resto] = e.actividad_economica.split(' - ');
    actividades = [{ codigo: codigo.trim(), nombre: resto.join(' - ').trim(), principal: true }];
  }
  let correos: string[] = [];
  try { correos = e.correos_adicionales ? JSON.parse(e.correos_adicionales) : []; } catch { correos = (e.correos_adicionales ?? '').split(',').map(s => s.trim()).filter(Boolean); }
  return {
    tipoIdentificacion: e.tipo_identificacion || '02', cedulaJuridica: e.cedula_juridica ?? '', razonSocial: e.razon_social ?? '',
    nombreComercial: e.nombre_comercial ?? '', regimen: e.regimen || 'Tradicional', alias: e.alias ?? '',
    correoElectronico: e.correo_electronico ?? '', telefono: e.telefono ?? '', correosAdicionales: correos,
    ubicacion: { provincia: e.provincia ?? '', canton: e.canton ?? '', distrito: e.distrito ?? '' },
    barrio: e.barrio ?? '', otrasSenas: e.otras_senas ?? '', actividades,
    usuarioHacienda: e.usuario_hacienda ?? '', claveHacienda: '', ambiente: e.ambiente || 'produccion',
    registroBebidas: e.registro_bebidas ?? '', registroBebidasVence: e.registro_bebidas_vence ?? '',
  };
}

const correoValido = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export default function InformacionTributaria() {
  // Cada parte se edita según su permiso (Configuración de facturación › Información tributaria)
  const { puede } = usePermisos();
  const [emisor, setEmisor] = useState<EmisorRow | null>(null);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [original, setOriginal] = useState<Form | null>(null);
  const [sucursal, setSucursal] = useState<Sucursal | null>(null);
  // Recién activada la facturación (desde Datos de empresa): se da la bienvenida
  const bienvenida = useSyncExternalStore(() => () => {}, () => { try { return sessionStorage.getItem('fe-recien-activada') === '1'; } catch { return false; } }, () => false);
  const [plan, setPlan] = useState<ConfigPlan>({ limiteSucursales: 1, implementacion: false, permitirPruebas: false });
  useEffect(() => {
    let vivo = true;
    fetch('/api/empresa/plan').then(r => r.json()).then((p: ConfigPlan) => { if (vivo) setPlan(p); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  const [guardando, setGuardando] = useState(false);
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const cerrarToast = useCallback(() => setToast(null), []);

  const [consultando, setConsultando] = useState(false);
  const [buscarAct, setBuscarAct] = useState('');
  const [nuevoCorreo, setNuevoCorreo] = useState('');

  const [version, setVersion] = useState(0);
  const cargar = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    let vivo = true;
    (async () => {
      const lista: EmisorRow[] = await fetch('/api/emisores').then(r => r.json());
      if (!vivo) return;
      const e = lista.find(x => Number(x.activo) === 1) ?? lista[0] ?? null;
      setEmisor(e);
      if (e) {
        const f = aForm(e);
        setForm(f); setOriginal(f);
        const suc: Sucursal[] = await fetch(`/api/sucursales?emisor=${e.id}`).then(r => r.json());
        if (vivo) setSucursal(suc.find(s => s.codigo === '001') ?? suc[0] ?? null);
      }
      if (vivo) setCargando(false);
    })();
    return () => { vivo = false; };
  }, [version]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(original), [form, original]);
  const patch = (p: Partial<Form>) => setForm(f => f ? { ...f, ...p } : f);

  // ── Validación ──────────────────────────────────────────────────────────
  const errores = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form) return e;
    if (!form.actividades.length) e.actividades = 'Agrega al menos una actividad económica.';
    if (!correoValido(form.correoElectronico)) e.correo = 'Correo no válido.';
    if (!form.ubicacion.provincia || !form.ubicacion.canton || !form.ubicacion.distrito) e.ubicacion = 'Elige provincia, cantón y distrito.';
    if (form.otrasSenas.trim().length < 5) e.otrasSenas = 'Obligatorio: el XML del emisor lleva la dirección exacta.';
    return e;
  }, [form]);
  const err = (k: string) => (intentoGuardar ? errores[k] : undefined);

  async function guardar() {
    if (!form || !emisor) return;
    setIntentoGuardar(true);
    if (Object.keys(errores).length) { setToast({ message: 'Revisa los campos marcados.', type: 'error' }); return; }
    setGuardando(true);
    const r = await fetch(`/api/emisores/${emisor.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regimen: form.regimen, correoElectronico: form.correoElectronico.trim(), correosAdicionales: JSON.stringify(form.correosAdicionales),
        provincia: form.ubicacion.provincia, canton: form.ubicacion.canton, distrito: form.ubicacion.distrito,
        barrio: form.barrio, otrasSenas: form.otrasSenas, actividades: form.actividades,
        usuarioHacienda: form.usuarioHacienda, ambiente: form.ambiente, ...(form.claveHacienda ? { claveHacienda: form.claveHacienda } : {}),
        registroBebidas: form.registroBebidas.trim(), registroBebidasVence: form.registroBebidasVence,
      }),
    });
    setGuardando(false);
    if (!r.ok) { setToast({ message: 'No se pudo guardar.', type: 'error' }); return; }
    setIntentoGuardar(false);
    setToast({ message: 'Se guardó la información tributaria.', type: 'success' });
    cargar();
  }

  // ── Consultar Hacienda por la cédula de la empresa ──────────────────────
  async function consultarHacienda() {
    if (!form || !emisor) return;
    setConsultando(true);
    const r = await fetch(`/api/hacienda/contribuyente?id=${encodeURIComponent(emisor.cedula_juridica)}`);
    const d = await r.json();
    setConsultando(false);
    if (!r.ok) { setToast({ message: d.error ?? 'No se pudo consultar.', type: 'error' }); return; }
    const actuales = new Map(form.actividades.map(a => [a.codigo, a]));
    const acts: Actividad[] = (d.actividades as { codigo: string; nombre: string }[]).map((a, i) => ({
      codigo: a.codigo, nombre: a.nombre, principal: actuales.get(a.codigo)?.principal ?? (i === 0 && !form.actividades.some(x => x.principal)),
    }));
    if (acts.length && !acts.some(a => a.principal)) acts[0].principal = true;
    patch({ regimen: /simplificado/i.test(d.regimen) ? 'Simplificado' : form.regimen, actividades: acts.length ? acts : form.actividades });
    setToast({ message: `${Autoridad()}: ${d.nombre}${d.situacion ? ` · ${d.situacion}` : ''} · ${acts.length} actividad${acts.length === 1 ? '' : 'es'} inscrita${acts.length === 1 ? '' : 's'}.`, type: 'success' });
  }

  // ── Actividades (varias; una marcada como principal) ────────────────────
  const sugerencias = useMemo(() => {
    const q = buscarAct.trim();
    if (!q) return [];
    const lista: { codigo: string; nombre: string; libre?: boolean }[] = buscarActividadEconomica(q).filter(a => !form?.actividades.some(x => x.codigo === a.codigo)).slice(0, 8);
    const m = q.match(/^(\d{6})\s*[-–·]?\s*(.*)$/);
    if (m && !lista.some(a => a.codigo === m[1]) && !form?.actividades.some(x => x.codigo === m[1])) {
      lista.unshift({ codigo: m[1], nombre: m[2].trim() || `Actividad ${m[1]}`, libre: true });
    }
    return lista;
  }, [buscarAct, form?.actividades]);
  function agregarActividad(a: { codigo: string; nombre: string }) {
    if (!form) return;
    patch({ actividades: [...form.actividades, { ...a, principal: form.actividades.length === 0 }] });
    setBuscarAct('');
  }
  function quitarActividad(codigo: string) {
    if (!form) return;
    const resto = form.actividades.filter(a => a.codigo !== codigo);
    if (resto.length && !resto.some(a => a.principal)) resto[0] = { ...resto[0], principal: true };
    patch({ actividades: resto });
  }
  function marcarPrincipal(codigo: string) {
    if (!form) return;
    patch({ actividades: form.actividades.map(x => ({ ...x, principal: x.codigo === codigo })) });
  }
  function agregarCorreo() {
    if (!form || !correoValido(nuevoCorreo)) return;
    patch({ correosAdicionales: [...new Set([...form.correosAdicionales, nuevoCorreo.trim()])] });
    setNuevoCorreo('');
  }

  if (cargando) return <p style={{ padding: PAGE_PAD, fontSize: 12, color: C.n700 }}>Cargando…</p>;
  if (!emisor || !form) {
    return <div style={{ padding: PAGE_PAD }}><EmptyState message="Todavía no hay emisor. Guarda los datos de la empresa con la facturación electrónica activada." /></div>;
  }

  const llaveBadge = insigniaLlave(emisor);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: PAGE_PAD }}>
        <div style={{ maxWidth: 980, display: 'flex', flexDirection: 'column', gap: 16 }}>

          <ChecklistFE variante="completo" bienvenida={bienvenida} version={version} />

          {/* Quién factura: los datos legales se editan en «Datos de empresa» */}
          <div style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '14px 18px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{emisor.nombre_comercial || emisor.razon_social}</div>
              <div style={{ fontSize: 12, color: C.n700, marginTop: 2 }}>{emisor.razon_social} · {esGuatemalaActual() ? 'NIT' : 'Céd.'} {emisor.cedula_juridica} · <span style={{ fontStyle: 'italic' }}>se editan en Datos de empresa</span></div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge label={form.regimen === 'Simplificado' ? 'Régimen simplificado' : 'Régimen tradicional'} color="gray" />
              {plan.permitirPruebas && <StatusBadge label={form.ambiente === 'produccion' ? 'Producción' : 'Ambiente de pruebas'} color={form.ambiente === 'produccion' ? 'green' : 'blue'} />}
              {llaveBadge}
            </div>
          </div>

          <div id="actividades" style={{ scrollMarginTop: 12 }} />
          <fieldset disabled={!puede('fe.config.tributaria.actividades')} style={{ display: 'contents' }}>
          <Section title="Actividades económicas" hint={segunPais('Todas las que la empresa tiene inscritas en Hacienda. La principal se usa por defecto en las facturas.')}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
              <div style={{ width: 240 }}>
                <FormField label="Régimen"><Select value={form.regimen} onChange={v => patch({ regimen: v })} options={REGIMENES} /></FormField>
              </div>
              <Button variant="secondary" icon={<IcSearch />} onClick={consultarHacienda} disabled={consultando || emisor.cedula_juridica.replace(/\D/g, '').length < 9}>
                {consultando ? 'Consultando…' : segunPais('Traer de Hacienda')}
              </Button>
            </div>
            {form.actividades.length === 0
              ? <p style={{ fontSize: 12, color: err('actividades') ? C.error : C.n700, margin: 0 }}>{segunPais('Todavía no hay actividades. Tráelas de Hacienda o búscalas abajo.')}</p>
              : (
                <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden' }}>
                  {form.actividades.map((a, i) => (
                    <div key={a.codigo} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i ? `1px solid ${C.n500}` : 'none', background: a.principal ? C.brandBg : C.n000 }}>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: C.n700, width: 56 }}>{a.codigo}</span>
                      <input value={a.nombre} onChange={e => patch({ actividades: form.actividades.map(x => x.codigo === a.codigo ? { ...x, nombre: e.target.value } : x) })}
                        title={segunPais('Puedes corregir el nombre para que coincida con Hacienda')}
                        style={{ flex: 1, fontSize: 12.5, fontFamily: FONT, border: '1px solid transparent', borderRadius: 4, padding: '4px 6px', background: 'transparent', color: C.n900, outline: 'none' }}
                        onFocus={e => { e.target.style.borderColor = C.brand; e.target.style.background = '#fff'; }}
                        onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent'; }} />
                      {a.principal
                        ? <StatusBadge label="Principal" color="brand" />
                        : <button onClick={() => marcarPrincipal(a.codigo)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.brand, fontSize: 11.5, fontFamily: FONT, textDecoration: 'underline', padding: 0, whiteSpace: 'nowrap' }}>Marcar como principal</button>}
                      <button onClick={() => quitarActividad(a.codigo)} title="Quitar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, display: 'inline-flex', padding: 4 }}><IcTrash className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            <BuscadorActividad valor={buscarAct} onCambiar={setBuscarAct} sugerencias={sugerencias} onElegir={agregarActividad} />
          </Section>
          </fieldset>

          <div id="llave" style={{ scrollMarginTop: 12 }} />
          <Section title="Certificado (llave criptográfica)" hint="Archivo .p12 con el que se firman los comprobantes. Lo descargas de TRIBU-CR (OVi, Tico Factura) o lo generas aquí.">
            <CertificadoEmisor emisor={emisor} puedeCambiar={puede('fe.config.tributaria.llave')} onCambio={m => { setToast({ message: m, type: 'success' }); cargar(); }} />
          </Section>

          <div id="credenciales" style={{ scrollMarginTop: 12 }} />
          <Section title={segunPais('Credenciales para enviar a Hacienda')}>
<fieldset disabled={!puede('fe.config.tributaria.credenciales')} style={{ display: 'contents' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Usuario">
                <Input value={form.usuarioHacienda} onChange={v => patch({ usuarioHacienda: v })} placeholder="cpj-3-101-123456@prod.comprobanteselectronicos.go.cr" />
              </FormField>
              <FormField label="Contraseña" hint={emisor.tiene_clave_hacienda ? 'Ya hay una guardada. Déjalo vacío para conservarla.' : 'La que recibiste por correo con el usuario.'}>
                <Input value={form.claveHacienda} onChange={v => patch({ claveHacienda: v })} type="password" placeholder={emisor.tiene_clave_hacienda ? '••••••••' : ''} autoComplete="new-password" />
              </FormField>
            </div>
            <VerificarCredenciales emisorId={emisor.id} usuario={form.usuarioHacienda} clave={form.claveHacienda} ambiente={form.ambiente} />
            </fieldset>
            <fieldset disabled={!puede('fe.config.tributaria.ambiente')} style={{ display: 'contents' }}>
            {plan.permitirPruebas && <div>
              <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 6 }}>Ambiente</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {AMBIENTES.filter(a => plan.permitirPruebas || a.value === 'produccion').map(a => (
                  <label key={a.value} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: radius.md, cursor: 'pointer',
                    border: `1px solid ${form.ambiente === a.value ? C.brand : C.n500}`, background: form.ambiente === a.value ? C.brandBg : C.n000 }}>
                    <input type="radio" name="ambiente" checked={form.ambiente === a.value} onChange={() => patch({ ambiente: a.value })} style={{ marginTop: 2, accentColor: C.brand }} />
                    <span>
                      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: C.n900 }}>{a.label}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: C.n700, marginTop: 2, lineHeight: 1.45 }}>{a.detalle}</span>
                    </span>
                  </label>
                ))}
              </div>
              {!plan.permitirPruebas && form.ambiente !== 'produccion' && <p style={{ fontSize: 11.5, color: C.warning, margin: '8px 0 0' }}>Este ambiente solo factura en Producción. Elígelo y guarda.</p>}
              {plan.permitirPruebas && <p style={{ fontSize: 11.5, color: C.n700, margin: '8px 0 0' }}>Empieza en Pruebas. Cuando todo funcione, cambia a Producción con tu usuario y tu llave de producción.</p>}
            </div>}
            </fieldset>
          </Section>

          <div id="direccion" style={{ scrollMarginTop: 12 }} />
          <fieldset disabled={!puede('fe.config.tributaria.editar')} style={{ display: 'contents' }}>
          <Section title="Licencias" hint={segunPais('Registros que Hacienda pide según lo que vende la empresa.')}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <FormField label="Registro fiscal de bebidas alcohólicas (Ley 8707)" hint={segunPais('Número de inscripción en Hacienda. Obligatorio si la empresa vende bebidas con contenido alcohólico.')}>
                <Input value={form.registroBebidas} onChange={v => patch({ registroBebidas: v })} placeholder="Ej. RF-8707-000123" />
              </FormField>
              <FormField label="Vence" hint="Fecha de vencimiento de la licencia, si la tiene.">
                <Input value={form.registroBebidasVence} onChange={v => patch({ registroBebidasVence: v })} type="date" />
              </FormField>
            </div>
          </Section>

          <Section title="Dirección fiscal y correo" hint={`Aparecen en cada comprobante. Las sucursales (${sucursal?.codigo ?? '001'} y otras) se administran en Configuración › Facturación electrónica › Sucursales.`}>
            <UbicacionCR value={form.ubicacion} onChange={u => patch({ ubicacion: u })} required />
            {err('ubicacion') && <p style={{ fontSize: 11, color: C.error, margin: '-8px 0 0' }}>{err('ubicacion')}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <FormField label="Barrio (opcional)"><Input value={form.barrio} onChange={v => patch({ barrio: v })} placeholder="La Fortuna centro" /></FormField>
              <FormField label="Dirección exacta (otras señas)" required error={err('otrasSenas')}>
                <Input value={form.otrasSenas} onChange={v => patch({ otrasSenas: v })} placeholder="400 m oeste de la iglesia católica" error={err('otrasSenas')} />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Correo para comprobantes" required error={err('correo')} hint={segunPais('Aparece en los comprobantes y recibe las respuestas de Hacienda.')}>
                <Input value={form.correoElectronico} onChange={v => patch({ correoElectronico: v })} type="email" placeholder="facturacion@hotel.cr" error={err('correo')} />
              </FormField>
              <FormField label="Teléfono" hint="Se cambia en Datos de empresa.">
                <Input value={emisor.telefono ?? ''} onChange={() => {}} readOnly />
              </FormField>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 6 }}>Otros correos que reciben copia</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: form.correosAdicionales.length ? 8 : 0 }}>
                {form.correosAdicionales.map(c => (
                  <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: radius.pill, background: C.n200, border: `1px solid ${C.n500}`, fontSize: 11.5 }}>
                    {c}
                    <button onClick={() => patch({ correosAdicionales: form.correosAdicionales.filter(x => x !== c) })} aria-label={`Quitar ${c}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, maxWidth: 480 }}>
                <Input value={nuevoCorreo} onChange={setNuevoCorreo} placeholder="contabilidad@hotel.cr" type="email" onKeyDown={e => { if (e.key === 'Enter') agregarCorreo(); }} />
                <Button variant="secondary" icon={<IcPlus />} disabled={!correoValido(nuevoCorreo)} onClick={agregarCorreo}>Agregar</Button>
              </div>
            </div>
          </Section>
          </fieldset>
          <div style={{ height: dirty ? 56 : 0 }} />
        </div>
      </div>

      {/* Barra de guardado: solo aparece si hay cambios */}
      {dirty && (
        <div style={{ flexShrink: 0, borderTop: `1px solid ${C.n500}`, background: C.n000, padding: `10px ${PAGE_PAD}px`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <span style={{ fontSize: 12, color: C.n700, marginRight: 'auto' }}>Tienes cambios sin guardar.</span>
          <Button variant="secondary" onClick={() => { setForm(original); setIntentoGuardar(false); }} disabled={guardando}>Descartar</Button>
          <Button onClick={guardar} disabled={guardando} icon={<IcCheck />}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Button>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={cerrarToast} />}
    </div>
  );
}

// Buscador de actividades: la lista flota sobre la página (portal), así no la
// corta el borde de la sección.
export function BuscadorActividad({ valor, onCambiar, sugerencias, onElegir }: {
  valor: string; onCambiar: (v: string) => void; sugerencias: { codigo: string; nombre: string; libre?: boolean }[]; onElegir: (a: { codigo: string; nombre: string }) => void;
}) {
  const [ancla, setAncla] = useState<HTMLDivElement | null>(null);
  const [foco, setFoco] = useState(false);
  return (
    <div ref={setAncla} style={{ maxWidth: 480 }}>
      <input value={valor} onChange={e => onCambiar(e.target.value)} placeholder="Agregar actividad: busca por nombre o escribe el código de 6 dígitos"
        onFocus={() => setFoco(true)} onBlur={() => setTimeout(() => setFoco(false), 150)}
        style={{ height: 32, padding: '0 10px', border: `1px solid ${foco ? C.brand : C.n500}`, borderRadius: 4, fontSize: 12, fontFamily: FONT, outline: 'none', width: '100%', boxSizing: 'border-box', color: C.n900 }} />
      <Flotante anchor={ancla} open={foco && sugerencias.length > 0} width={480}>
        {sugerencias.map(a => (
          <div key={a.codigo} onClick={() => onElegir({ codigo: a.codigo, nombre: a.nombre })} style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 11.5, borderBottom: `1px solid ${C.n200}`, background: a.libre ? C.brandBg : '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.background = C.n200)} onMouseLeave={e => (e.currentTarget.style.background = a.libre ? C.brandBg : '#fff')}>
            <div style={{ fontWeight: 500, color: a.libre ? C.brandDk : C.n900 }}>{a.libre ? `+ Agregar actividad ${a.codigo}` : a.nombre}</div>
            <div style={{ color: C.n700 }}>{a.libre ? `${a.nombre} · puedes corregir el nombre después` : a.codigo}</div>
          </div>
        ))}
      </Flotante>
    </div>
  );
}
