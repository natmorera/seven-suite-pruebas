'use client';
// Pasos de facturación electrónica del asistente inicial. Guardan en el mismo
// emisor que «Empresa › Información tributaria», así que lo que se complete aquí
// aparece allá. El asistente llama a la función registrada con onRegistrar
// antes de pasar al siguiente paso.
import { useEffect, useMemo, useState } from 'react';
import { C, FONT, Button, FormField, Input, Select, StatusBadge, radius } from '@/components/ui/primitives';
import { IcSearch, IcTrash } from '@/components/ui/icons';
import UbicacionCR, { type Ubicacion } from '@/components/ui/UbicacionCR';
import CertificadoEmisor from '@/components/pages/facturacion/CertificadoEmisor';
import VerificarCredenciales from '@/components/pages/facturacion/VerificarCredenciales';
import { BuscadorActividad, REGIMENES, AMBIENTES, type EmisorRow } from '@/components/pages/facturacion/EmisoresPage';
import CamposSucursal, { type FormSucursal } from '@/components/pages/facturacion/CamposSucursal';
import { CamposCaja, type FormCaja } from '@/components/pages/facturacion/CajasPage';
import { CamposCuentasFacturacion, type Mapeo } from '@/components/pages/facturacion/CuentasFacturacionPage';
import { useCatalogo } from '@/components/pages/catalogo/catalogoStore';
import { aplanar } from '@/lib/onboardingComun';
import { buscarActividadEconomica } from '@/data/actividadesEconomicas';
import { usePaisEmpresa } from '@/lib/paisCliente';
import { autoridad } from '@/lib/paisActual';

// Devuelve un error, null si todo bien, o los valores que el asistente manda al guardar el paso
export type Guardar = () => Promise<string | null | { valores: Record<string, unknown> }>;
interface Actividad { codigo: string; nombre: string; principal: boolean }
const correoValido = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

function useEmisor(version: number) {
  const [emisor, setEmisor] = useState<EmisorRow | null | undefined>(undefined);
  useEffect(() => {
    let vivo = true;
    fetch('/api/emisores').then(r => r.json()).then((lista: EmisorRow[]) => {
      if (vivo) setEmisor(lista.find(x => Number(x.activo) === 1) ?? lista[0] ?? null);
    }).catch(() => { if (vivo) setEmisor(null); });
    return () => { vivo = false; };
  }, [version]);
  return emisor;
}

async function patchEmisor(id: string, cuerpo: Record<string, unknown>): Promise<string | null> {
  const r = await fetch(`/api/emisores/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  if (r.ok) return null;
  const d = await r.json().catch(() => ({}));
  return d.error ?? 'No se pudo guardar.';
}

const Titulo = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div>
    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: C.n900 }}>{children}</p>
    {hint && <p style={{ margin: '3px 0 0', fontSize: 12, color: C.n700 }}>{hint}</p>}
  </div>
);

// ── Datos para Hacienda: régimen, actividades, dirección y correo ──────────
export function PasoTributaria({ onRegistrar }: { onRegistrar: (f: Guardar) => void }) {
  const emisor = useEmisor(0);
  const [regimen, setRegimen] = useState('Tradicional');
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [ubicacion, setUbicacion] = useState<Ubicacion>({ provincia: '', canton: '', distrito: '' });
  const [otrasSenas, setOtrasSenas] = useState('');
  const [correo, setCorreo] = useState('');
  const [buscar, setBuscar] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargado, setCargado] = useState<string | null>(null);

  // Al llegar el emisor se llena el formulario una sola vez
  if (emisor && cargado !== emisor.id) {
    setCargado(emisor.id);
    setRegimen(emisor.regimen || 'Tradicional');
    let acts: Actividad[] = [];
    try { acts = emisor.actividades_json ? JSON.parse(emisor.actividades_json) : []; } catch { acts = []; }
    if (!acts.length && emisor.actividad_economica) {
      const [codigo, ...resto] = emisor.actividad_economica.split(' - ');
      acts = [{ codigo: codigo.trim(), nombre: resto.join(' - ').trim(), principal: true }];
    }
    setActividades(acts);
    setUbicacion({ provincia: emisor.provincia ?? '', canton: emisor.canton ?? '', distrito: emisor.distrito ?? '' });
    setOtrasSenas(emisor.otras_senas ?? '');
    setCorreo(emisor.correo_electronico ?? '');
  }

  useEffect(() => {
    onRegistrar(async () => {
      if (!emisor) return 'Todavía no hay datos del emisor. Vuelve al paso Empresa y continúa.';
      if (!actividades.length) return 'Agrega al menos una actividad económica.';
      if (!ubicacion.provincia || !ubicacion.canton || !ubicacion.distrito) return 'Elige provincia, cantón y distrito.';
      if (otrasSenas.trim().length < 5) return 'Escribe la dirección exacta (otras señas).';
      if (!correoValido(correo)) return 'Escribe un correo válido para los comprobantes.';
      return patchEmisor(emisor.id, {
        regimen, actividades, provincia: ubicacion.provincia, canton: ubicacion.canton, distrito: ubicacion.distrito,
        otrasSenas: otrasSenas.trim(), correoElectronico: correo.trim(),
      });
    });
  }, [onRegistrar, emisor, regimen, actividades, ubicacion, otrasSenas, correo]);

  const sugerencias = useMemo(() => {
    const q = buscar.trim();
    if (!q) return [];
    const lista: { codigo: string; nombre: string; libre?: boolean }[] = buscarActividadEconomica(q).filter(a => !actividades.some(x => x.codigo === a.codigo)).slice(0, 8);
    const m = q.match(/^(\d{6})\s*[-–·]?\s*(.*)$/);
    if (m && !lista.some(a => a.codigo === m[1]) && !actividades.some(x => x.codigo === m[1])) lista.unshift({ codigo: m[1], nombre: m[2].trim() || `Actividad ${m[1]}`, libre: true });
    return lista;
  }, [buscar, actividades]);

  async function traerDeHacienda() {
    if (!emisor) return;
    setConsultando(true); setAviso(null);
    const r = await fetch(`/api/hacienda/contribuyente?id=${encodeURIComponent(emisor.cedula_juridica)}`);
    const d = await r.json().catch(() => ({}));
    setConsultando(false);
    if (!r.ok) { setAviso(d.error ?? `No se pudo consultar ${autoridad()}.`); return; }
    const acts: Actividad[] = (d.actividades as { codigo: string; nombre: string }[] ?? []).map((a, i) => ({ codigo: a.codigo, nombre: a.nombre, principal: i === 0 }));
    if (acts.length) setActividades(acts);
    if (/simplificado/i.test(d.regimen ?? '')) setRegimen('Simplificado');
  }

  if (emisor === undefined) return <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>Cargando…</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Titulo>Actividades económicas</Titulo>
        <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ width: 240 }}><FormField label="Régimen"><Select value={regimen} onChange={setRegimen} options={REGIMENES} /></FormField></div>
          <Button variant="secondary" icon={<IcSearch />} onClick={traerDeHacienda} disabled={consultando || !emisor}>{consultando ? 'Consultando…' : `Traer de ${autoridad()}`}</Button>
        </div>
        {aviso && <p style={{ margin: 0, fontSize: 12, color: C.error }}>{aviso}</p>}
        {actividades.length > 0 && (
          <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden' }}>
            {actividades.map((a, i) => (
              <div key={a.codigo} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderTop: i ? `1px solid ${C.n500}` : 'none', background: a.principal ? C.brandBg : C.n000 }}>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: C.n700, width: 56 }}>{a.codigo}</span>
                <span style={{ flex: 1, fontSize: 12.5, color: C.n900 }}>{a.nombre}</span>
                {a.principal ? <StatusBadge label="Principal" color="brand" /> : (
                  <button onClick={() => setActividades(actividades.map(x => ({ ...x, principal: x.codigo === a.codigo })))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.brand, fontSize: 11.5, fontFamily: FONT }}>Marcar principal</button>
                )}
                <button aria-label={`Quitar ${a.nombre}`} onClick={() => {
                  const resto = actividades.filter(x => x.codigo !== a.codigo);
                  if (resto.length && !resto.some(x => x.principal)) resto[0] = { ...resto[0], principal: true };
                  setActividades(resto);
                }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'flex' }}><IcTrash className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
        <BuscadorActividad valor={buscar} onCambiar={setBuscar} sugerencias={sugerencias}
          onElegir={a => { setActividades([...actividades, { ...a, principal: actividades.length === 0 }]); setBuscar(''); }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Titulo>Dirección fiscal y correo</Titulo>
        <UbicacionCR value={ubicacion} onChange={setUbicacion} required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Dirección exacta (otras señas)" required>
            <Input value={otrasSenas} onChange={setOtrasSenas} placeholder="400 m oeste de la iglesia católica" />
          </FormField>
          <FormField label="Correo para comprobantes" required>
            <Input value={correo} onChange={setCorreo} type="email" placeholder="facturacion@empresa.cr" />
          </FormField>
        </div>
      </div>
    </div>
  );
}

// ── Conexión con Hacienda: llave criptográfica, credenciales y ambiente ──
export function PasoHacienda({ onRegistrar, permitirPruebas }: { onRegistrar: (f: Guardar) => void; permitirPruebas: boolean }) {
  const [version, setVersion] = useState(0);
  const emisor = useEmisor(version);
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [ambiente, setAmbiente] = useState('produccion');
  const [cargado, setCargado] = useState<string | null>(null);

  if (emisor && cargado !== emisor.id) {
    setCargado(emisor.id);
    setUsuario(emisor.usuario_hacienda ?? '');
    setAmbiente(permitirPruebas ? (emisor.ambiente || 'pruebas') : 'produccion');
  }

  useEffect(() => {
    onRegistrar(async () => {
      if (!emisor) return 'Todavía no hay datos del emisor. Vuelve al paso Empresa y continúa.';
      if (Number(emisor.llave_cargada) !== 1) return 'Sube o genera el certificado (llave criptográfica).';
      if (!usuario.trim()) return `Escribe el usuario de ${autoridad()}.`;
      if (!clave && !emisor.tiene_clave_hacienda) return `Escribe la contraseña de ${autoridad()}.`;
      return patchEmisor(emisor.id, { usuarioHacienda: usuario.trim(), ambiente, ...(clave ? { claveHacienda: clave } : {}) });
    });
  }, [onRegistrar, emisor, usuario, clave, ambiente]);

  if (emisor === undefined) return <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>Cargando…</p>;
  if (!emisor) return <p style={{ fontSize: 12, color: C.error, margin: 0 }}>Todavía no hay datos del emisor. Vuelve al paso Empresa y continúa.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Titulo hint="Archivo .p12 con el que se firman los comprobantes. Lo descargas de TRIBU-CR (OVi, Tico Factura) o lo generas aquí.">Certificado (llave criptográfica)</Titulo>
        <div style={{ padding: '14px 16px', border: `1px solid ${C.n500}`, borderRadius: radius.md }}>
          <CertificadoEmisor emisor={emisor} onCambio={() => setVersion(v => v + 1)} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Titulo>Credenciales para enviar a {autoridad()}</Titulo>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Usuario" required>
            <Input value={usuario} onChange={setUsuario} placeholder="cpj-3-101-123456@prod.comprobanteselectronicos.go.cr" />
          </FormField>
          <FormField label="Contraseña" required hint={emisor.tiene_clave_hacienda ? 'Ya hay una guardada. Déjala vacía para conservarla.' : undefined}>
            <Input value={clave} onChange={setClave} type="password" autoComplete="new-password" placeholder={emisor.tiene_clave_hacienda ? '••••••••' : ''} />
          </FormField>
        </div>
        <VerificarCredenciales emisorId={emisor.id} usuario={usuario} clave={clave} ambiente={ambiente} />
      </div>

      {permitirPruebas && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Titulo>Ambiente</Titulo>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {AMBIENTES.map(a => (
              <label key={a.value} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: radius.md, cursor: 'pointer',
                border: `1px solid ${ambiente === a.value ? C.brand : C.n500}`, background: ambiente === a.value ? C.brandBg : C.n000 }}>
                <input type="radio" name="ambiente" checked={ambiente === a.value} onChange={() => setAmbiente(a.value)} style={{ marginTop: 2, accentColor: C.brand }} />
                <span>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: C.n900 }}>{a.label}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: C.n700, marginTop: 2, lineHeight: 1.45 }}>{a.detalle}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ── Primera sucursal y caja ──────────────────────────────────────────────
// Mismos campos que Configuración › Sucursales y Cajas / Terminales.
interface Sucursal { id: string; codigo: string; nombre: string; provincia: string; canton: string; distrito: string; otras_senas: string; telefono: string; correo: string }
interface Caja { id: string; sucursal: string; terminal: string; nombre: string }

export function PasoSucursal({ onRegistrar }: { onRegistrar: (f: Guardar) => void }) {
  const emisor = useEmisor(0);
  const { gt } = usePaisEmpresa();
  const [suc, setSuc] = useState<FormSucursal>({ codigo: '001', nombre: 'Casa matriz', ubicacion: { provincia: '', canton: '', distrito: '' }, otrasSenas: '', telefono: '', correo: '' });
  const [caja, setCaja] = useState<FormCaja>({ terminal: '00001', nombre: 'Recepción principal', numeracionModo: 'cero', numeracion: {} });
  const [cajaExiste, setCajaExiste] = useState(false);
  const [cargado, setCargado] = useState<string | null>(null);

  useEffect(() => {
    if (!emisor || cargado === emisor.id) return;
    let vivo = true;
    Promise.all([
      fetch(`/api/sucursales?emisor=${emisor.id}`).then(r => r.json()) as Promise<Sucursal[]>,
      fetch('/api/cajas').then(r => r.json()) as Promise<Caja[]>,
    ]).then(([sus, cajas]) => {
      if (!vivo) return;
      const s = sus.find(x => x.codigo === '001');
      const c = cajas.filter(x => x.sucursal === '001').sort((a, b) => a.terminal.localeCompare(b.terminal))[0];
      // Sin dirección propia, la sucursal arranca con la dirección fiscal
      const conDireccion = Boolean(s?.provincia);
      setSuc({
        codigo: '001', nombre: s?.nombre || 'Casa matriz',
        ubicacion: conDireccion && s ? { provincia: s.provincia, canton: s.canton, distrito: s.distrito } : { provincia: emisor.provincia ?? '', canton: emisor.canton ?? '', distrito: emisor.distrito ?? '' },
        otrasSenas: conDireccion && s ? s.otras_senas : emisor.otras_senas ?? '',
        telefono: s?.telefono || emisor.telefono || '', correo: s?.correo || emisor.correo_electronico || '',
      });
      if (c) { setCaja(f => ({ ...f, terminal: c.terminal, nombre: c.nombre })); setCajaExiste(true); }
      setCargado(emisor.id);
    }).catch(() => {});
    return () => { vivo = false; };
  }, [emisor, cargado]);

  useEffect(() => {
    onRegistrar(async () => {
      if (!emisor) return 'Todavía no hay datos del emisor. Vuelve al paso Empresa y continúa.';
      return { valores: {
        sucursal: { nombre: suc.nombre, ...suc.ubicacion, otrasSenas: suc.otrasSenas, telefono: suc.telefono, correo: suc.correo },
        caja: { nombre: caja.nombre, terminal: caja.terminal, numeracion: !cajaExiste && caja.numeracionModo === 'continuar' ? caja.numeracion : {} },
      } };
    });
  }, [onRegistrar, emisor, suc, caja, cajaExiste]);

  if (emisor === undefined || (emisor && cargado !== emisor.id)) return <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>Cargando…</p>;
  if (!emisor) return <p style={{ fontSize: 12, color: C.error, margin: 0 }}>Todavía no hay datos del emisor. Vuelve al paso Empresa y continúa.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Titulo hint={gt ? 'Usa el código del establecimiento registrado en la SAT.' : 'Su código va en el número de cada comprobante.'}>{gt ? 'Establecimiento' : 'Sucursal'}</Titulo>
        <CamposSucursal form={suc} patch={p => setSuc(f => ({ ...f, ...p }))} codigoEditable={false} requerirDireccion />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Titulo hint="Desde donde se emite; cada tipo de documento lleva su propio número por terminal.">Caja / terminal</Titulo>
        <CamposCaja form={caja} patch={p => setCaja(f => ({ ...f, ...p }))} nueva={!cajaExiste}
          sucursal={<Input value={`${suc.codigo} · ${suc.nombre}`} onChange={() => {}} readOnly />} />
      </div>
    </div>
  );
}

// ── Cuentas de los asientos de facturación (solo con Contabilidad) ────────
export function PasoCuentas({ onRegistrar }: { onRegistrar: (f: Guardar) => void }) {
  const [m, setM] = useState<Mapeo | null>(null);
  const plan = useCatalogo();
  useEffect(() => {
    let vivo = true;
    fetch('/api/facturacion/cuentas').then(r => r.json()).then(d => { if (vivo) setM(d); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  const posteables = useMemo(() => new Set(aplanar(plan).filter(c => c.posteable && !c.inactiva).map(c => c.code)), [plan]);
  const errores = useMemo(() => {
    const e: Partial<Record<keyof Mapeo, string>> = {};
    if (m) for (const k of Object.keys(m) as (keyof Mapeo)[]) if (!posteables.has(m[k])) e[k] = 'Elige una cuenta posteable de tu plan.';
    return e;
  }, [m, posteables]);
  useEffect(() => {
    onRegistrar(async () => {
      if (!m) return 'Cargando las cuentas…';
      if (Object.keys(errores).length) return 'Hay cuentas que no están en tu plan o no son posteables.';
      return { valores: { mapeo: m } };
    });
  }, [onRegistrar, m, errores]);
  if (!m) return <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>Cargando…</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0, fontSize: 12.5, color: C.n700, lineHeight: 1.55 }}>
        Cada venta y compra aceptada genera su asiento. Estas son las cuentas que usa cuando el producto, el cliente o el proveedor no trae la suya.
      </p>
      <CamposCuentasFacturacion m={m} onChange={setM} errores={errores} />
    </div>
  );
}
