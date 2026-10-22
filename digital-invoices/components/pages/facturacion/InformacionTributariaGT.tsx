'use client';
// Información tributaria cuando la empresa es de Guatemala (régimen FEL de la
// SAT). Mismas tarjetas que la de Costa Rica, con su contenido:
//   · Afiliación al IVA y régimen de ISR (deciden tipos de DTE y frases)
//   · Frases: las del RTU y las que se agregan a mano (ver FrasesGT.tsx)
//   · Certificadores: uno principal y los de respaldo; la contraseña no se
//     vuelve a mostrar
//   · Dirección fiscal y correo
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  C, FONT, Button, FormField, Input, Select, Section, StatusBadge, Toast, radius, PAGE_PAD, EmptyState, Modal, Switch,
  DataTable, DataRow, Td, InfoBox,
} from '@/components/ui/primitives';
import { IcPlus, IcTrash, IcCheck, IcEdit } from '@/components/ui/icons';
import UbicacionCR, { type Ubicacion } from '@/components/ui/UbicacionCR';
import ChecklistFE from './ChecklistFE';
import TablaFrases from './FrasesGT';
import { leerDatosGT, guardarDatosGT, type DatosTributariosGT } from './datosTributariosGT';
import { usePermisos } from '@/lib/permisosCliente';
import type { EmisorRow } from './EmisoresPage';
import {
  AFILIACIONES_IVA, REGIMENES_ISR, CERTIFICADORES_GT, tiposDteVenta, nombreAfiliacion, frasesDelRtu, type FraseEmisor, type CertificadorEmisor,
} from '@/lib/perfilPais';

const correoValido = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

// ── Afiliación al IVA y régimen de ISR ───────────────────────────────────
export function CamposAfiliacion({ valor, onChange }: {
  valor: Pick<DatosTributariosGT, 'afiliacionIva' | 'vigenteDesde' | 'regimenIsr' | 'agenteRetencionIva'>;
  onChange: (p: Partial<DatosTributariosGT>) => void;
}) {
  const tipos = tiposDteVenta(valor.afiliacionIva);
  return <>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <FormField label="Afiliación al IVA" required hint="La que tiene la empresa en el RTU de la SAT.">
        <Select value={valor.afiliacionIva} onChange={v => onChange({ afiliacionIva: v })} options={AFILIACIONES_IVA} />
      </FormField>
      <FormField label="Vigente desde" required hint="Si cambia, los documentos con fecha anterior usan la afiliación previa.">
        <Input value={valor.vigenteDesde} onChange={v => onChange({ vigenteDesde: v })} type="date" />
      </FormField>
      <FormField label="Régimen de ISR" hint={valor.afiliacionIva === 'GEN' ? 'Define la frase de retención del ISR.' : 'Solo aplica con afiliación General.'}>
        <Select value={valor.regimenIsr} onChange={v => onChange({ regimenIsr: v })} options={REGIMENES_ISR.map(r => ({ value: r.value, label: r.label }))} />
      </FormField>
      <FormField label="Agente de retención del IVA" hint="Agrega la frase tipo 2 en facturas y notas.">
        <div style={{ height: 32, display: 'flex', alignItems: 'center' }}>
          <Switch checked={valor.agenteRetencionIva} onChange={v => onChange({ agenteRetencionIva: v })} label={valor.agenteRetencionIva ? 'Sí' : 'No'} />
        </div>
      </FormField>
    </div>
    <InfoBox>
      Con afiliación {nombreAfiliacion(valor.afiliacionIva)}{tipos.length ? <> puede emitir: {tipos.map(t => t.nombre).join(', ')}.</> : <> no emite documentos de venta.</>}
      {valor.afiliacionIva !== 'GEN' && ' Las notas de crédito y débito solo existen en afiliación General.'}
    </InfoBox>
  </>;
}

// ── Certificadores ───────────────────────────────────────────────────────
interface FormCert { id: string; certificador: string; usuario: string; clave: string; identificador: string; certificado: string; principal: boolean; tieneClave: boolean }
const certVacio = (principal: boolean): FormCert => ({ id: '', certificador: CERTIFICADORES_GT[0], usuario: '', clave: '', identificador: '', certificado: '', principal, tieneClave: false });

export function SeccionCertificadores({ certificadores, onGuardado, puedeEditar }: {
  certificadores: CertificadorEmisor[]; onGuardado: (d: DatosTributariosGT, mensaje: string) => void; puedeEditar: boolean;
}) {
  const [form, setForm] = useState<FormCert | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  async function enviar(lista: (CertificadorEmisor & { clave?: string })[], mensaje: string) {
    setTrabajando(true);
    const r = await guardarDatosGT({ certificadores: lista });
    setTrabajando(false);
    if (r.error) { setError(r.error); return false; }
    if (r.datos) onGuardado(r.datos, mensaje);
    return true;
  }
  async function guardarForm() {
    if (!form) return;
    if (!form.usuario.trim()) { setError('Escribe el usuario.'); return; }
    if (!form.id && !form.clave) { setError('Escribe la contraseña.'); return; }
    const base = certificadores.map(c => form.principal ? { ...c, principal: false } : c);
    const fila = { id: form.id, certificador: form.certificador, usuario: form.usuario, identificador: form.identificador, certificado: form.certificado,
      principal: form.principal || !certificadores.some(c => c.principal && c.id !== form.id), verificado: false, tieneClave: form.tieneClave, clave: form.clave };
    const lista = form.id ? base.map(c => c.id === form.id ? fila : c) : [...base, fila];
    if (await enviar(lista, form.id ? `Se actualizó ${form.certificador}.` : `Se agregó ${form.certificador}.`)) { setForm(null); setError(''); }
  }
  async function quitar(c: CertificadorEmisor) {
    const resto = certificadores.filter(x => x.id !== c.id);
    if (resto.length && !resto.some(x => x.principal)) resto[0] = { ...resto[0], principal: true };
    await enviar(resto, `Se quitó ${c.certificador}.`);
  }
  async function hacerPrincipal(c: CertificadorEmisor) {
    await enviar(certificadores.map(x => ({ ...x, principal: x.id === c.id })), `${c.certificador} es ahora el certificador principal.`);
  }
  async function verificar(c: CertificadorEmisor) {
    setTrabajando(true);
    const r = await fetch('/api/gt/certificadores/verificar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id }) });
    const d = await r.json().catch(() => ({}));
    setTrabajando(false);
    setAviso({ texto: d.mensaje ?? 'No se pudo verificar.', ok: Boolean(d.ok) });
    if (d.ok) onGuardado(await leerDatosGT(), d.mensaje);
  }

  return <>
    <DataTable headers={['Principal', 'Certificador', 'Usuario', 'Identificador', 'Contraseña', 'Estado', '']}>
      {certificadores.map(c => (
        <DataRow key={c.id}>
          <Td>
            <input type="radio" name="cert-principal" checked={c.principal} disabled={!puedeEditar || trabajando} onChange={() => hacerPrincipal(c)}
              aria-label={`${c.certificador} principal`} style={{ accentColor: C.brand }} />
          </Td>
          <Td><span style={{ fontWeight: 500 }}>{c.certificador}</span></Td>
          <Td>{c.usuario}</Td>
          <Td muted>{c.identificador || '-'}</Td>
          <Td muted>{c.tieneClave ? 'Guardada' : 'Falta'}</Td>
          <Td><StatusBadge label={c.verificado ? 'Verificado' : 'Sin verificar'} color={c.verificado ? 'green' : 'gray'} /></Td>
          <Td>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
              <button onClick={() => verificar(c)} disabled={trabajando} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.brand, fontSize: 11.5, fontFamily: FONT, textDecoration: 'underline', padding: 0, whiteSpace: 'nowrap' }}>Verificar credenciales</button>
              {puedeEditar && <button onClick={() => { setForm({ ...c, clave: '' }); setError(''); }} title="Editar" aria-label={`Editar ${c.certificador}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'inline-flex', padding: 4 }}><IcEdit className="w-3.5 h-3.5" /></button>}
              {puedeEditar && <button onClick={() => quitar(c)} title="Quitar" aria-label={`Quitar ${c.certificador}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, display: 'inline-flex', padding: 4 }}><IcTrash className="w-4 h-4" /></button>}
            </div>
          </Td>
        </DataRow>
      ))}
      {!certificadores.length && <DataRow><Td colSpan={7}><span style={{ color: C.n700 }}>Todavía no hay certificadores.</span></Td></DataRow>}
    </DataTable>
    {aviso && <p style={{ fontSize: 11.5, color: aviso.ok ? C.success : C.error, margin: 0 }}>{aviso.texto}</p>}
    <p style={{ fontSize: 11.5, color: C.n700, margin: 0 }}>El principal certifica todos los documentos; los demás se usan de respaldo. Las contraseñas se guardan cifradas y no se vuelven a mostrar.</p>
    {puedeEditar && <div><Button variant="secondary" icon={<IcPlus />} onClick={() => { setForm(certVacio(!certificadores.length)); setError(''); }}>Agregar certificador</Button></div>}
    {form && (
      <Modal open title={form.id ? `Certificador ${form.certificador}` : 'Agregar certificador'} onClose={() => setForm(null)} width={560}
        footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={() => setForm(null)} disabled={trabajando}>Cancelar</Button>
          <Button onClick={guardarForm} disabled={trabajando}>{form.id ? 'Guardar certificador' : 'Agregar certificador'}</Button>
        </div>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Certificador" required>
              <Select value={form.certificador} onChange={v => setForm({ ...form, certificador: v })} options={CERTIFICADORES_GT.map(c => ({ value: c, label: c }))} />
            </FormField>
            <FormField label="Identificador" hint="El que entrega el certificador, si lo pide.">
              <Input value={form.identificador} onChange={v => setForm({ ...form, identificador: v })} />
            </FormField>
            <FormField label="Usuario" required><Input value={form.usuario} onChange={v => setForm({ ...form, usuario: v })} /></FormField>
            <FormField label="Contraseña" required={!form.id} hint={form.tieneClave ? 'Ya hay una guardada. Déjala vacía para conservarla.' : undefined}>
              <Input value={form.clave} onChange={v => setForm({ ...form, clave: v })} type="password" autoComplete="new-password" placeholder={form.tieneClave ? '••••••••' : ''} />
            </FormField>
            <FormField label="Certificado" hint="Alias del certificado de firma, si el certificador lo pide.">
              <Input value={form.certificado} onChange={v => setForm({ ...form, certificado: v })} />
            </FormField>
            <FormField label="Principal">
              <div style={{ height: 32, display: 'flex', alignItems: 'center' }}>
                <Switch checked={form.principal} onChange={v => setForm({ ...form, principal: v })} label={form.principal ? 'Certifica todos los documentos' : 'Respaldo'} />
              </div>
            </FormField>
          </div>
          {error && <p style={{ fontSize: 11.5, color: C.error, margin: 0 }}>{error}</p>}
        </div>
      </Modal>
    )}
  </>;
}

// ── Pantalla ─────────────────────────────────────────────────────────────
interface Form {
  afiliacionIva: string; vigenteDesde: string; regimenIsr: string; agenteRetencionIva: boolean; frases: FraseEmisor[];
  ubicacion: Ubicacion; direccion: string; correoElectronico: string; correosAdicionales: string[];
}

function aForm(e: EmisorRow, d: DatosTributariosGT): Form {
  let correos: string[] = [];
  try { correos = e.correos_adicionales ? JSON.parse(e.correos_adicionales) : []; } catch { correos = (e.correos_adicionales ?? '').split(',').map(s => s.trim()).filter(Boolean); }
  return {
    afiliacionIva: d.afiliacionIva, vigenteDesde: d.vigenteDesde, regimenIsr: d.regimenIsr, agenteRetencionIva: d.agenteRetencionIva, frases: d.frases,
    ubicacion: { provincia: e.provincia ?? '', canton: e.canton ?? '', distrito: e.distrito ?? '' }, direccion: e.otras_senas ?? '',
    correoElectronico: e.correo_electronico ?? '', correosAdicionales: correos,
  };
}

export default function InformacionTributariaGT() {
  const { puede } = usePermisos();
  const [emisor, setEmisor] = useState<EmisorRow | null>(null);
  const [datos, setDatos] = useState<DatosTributariosGT | null>(null);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [original, setOriginal] = useState<Form | null>(null);
  const bienvenida = useSyncExternalStore(() => () => {}, () => { try { return sessionStorage.getItem('fe-recien-activada') === '1'; } catch { return false; } }, () => false);
  const [guardando, setGuardando] = useState(false);
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const cerrarToast = useCallback(() => setToast(null), []);
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [version, setVersion] = useState(0);
  const cargar = useCallback(() => setVersion(v => v + 1), []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [lista, d]: [EmisorRow[], DatosTributariosGT] = await Promise.all([fetch('/api/emisores').then(r => r.json()), leerDatosGT()]);
      if (!vivo) return;
      const e = lista.find(x => Number(x.activo) === 1) ?? lista[0] ?? null;
      setEmisor(e); setDatos(d);
      if (e) { const f = aForm(e, d); setForm(f); setOriginal(f); }
      setCargando(false);
    })();
    return () => { vivo = false; };
  }, [version]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(original), [form, original]);
  const patch = (p: Partial<Form>) => setForm(f => f ? { ...f, ...p } : f);

  const errores = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form) return e;
    if (!form.vigenteDesde) e.vigencia = 'Elige desde cuándo está vigente la afiliación.';
    if (!correoValido(form.correoElectronico)) e.correo = 'Correo no válido.';
    if (!form.ubicacion.provincia || !form.ubicacion.canton.trim() || !form.ubicacion.distrito) e.ubicacion = 'Elige departamento y escribe municipio y código postal.';
    if (form.direccion.trim().length < 5) e.direccion = 'Obligatorio: el DTE lleva la dirección del emisor.';
    return e;
  }, [form]);
  const err = (k: string) => (intentoGuardar ? errores[k] : undefined);

  async function guardar() {
    if (!form || !emisor) return;
    setIntentoGuardar(true);
    if (Object.keys(errores).length) { setToast({ message: 'Revisa los campos marcados.', type: 'error' }); return; }
    setGuardando(true);
    const [r1, r2] = await Promise.all([
      fetch(`/api/emisores/${emisor.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correoElectronico: form.correoElectronico.trim(), correosAdicionales: JSON.stringify(form.correosAdicionales),
          provincia: form.ubicacion.provincia, canton: form.ubicacion.canton.trim(), distrito: form.ubicacion.distrito, otrasSenas: form.direccion.trim(),
        }),
      }),
      guardarDatosGT({ afiliacionIva: form.afiliacionIva, vigenteDesde: form.vigenteDesde, regimenIsr: form.regimenIsr, agenteRetencionIva: form.agenteRetencionIva, frases: form.frases }),
    ]);
    setGuardando(false);
    if (!r1.ok || r2.error) { setToast({ message: r2.error ?? 'No se pudo guardar.', type: 'error' }); return; }
    setIntentoGuardar(false);
    setToast({ message: 'Se guardó la información tributaria.', type: 'success' });
    cargar();
  }

  function agregarCorreo() {
    if (!form || !correoValido(nuevoCorreo)) return;
    patch({ correosAdicionales: [...new Set([...form.correosAdicionales, nuevoCorreo.trim()])] });
    setNuevoCorreo('');
  }

  if (cargando) return <p style={{ padding: PAGE_PAD, fontSize: 12, color: C.n700 }}>Cargando…</p>;
  if (!emisor || !form || !datos) {
    return <div style={{ padding: PAGE_PAD }}><EmptyState message="Todavía no hay emisor. Guarda los datos de la empresa con la facturación electrónica activada." /></div>;
  }
  const principal = datos.certificadores.find(c => c.principal);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: PAGE_PAD }}>
        <div style={{ maxWidth: 980, display: 'flex', flexDirection: 'column', gap: 16 }}>

          <ChecklistFE variante="completo" bienvenida={bienvenida} version={version} />

          <div style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '14px 18px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{emisor.nombre_comercial || emisor.razon_social}</div>
              <div style={{ fontSize: 12, color: C.n700, marginTop: 2 }}>{emisor.razon_social} · NIT {emisor.cedula_juridica} · <span style={{ fontStyle: 'italic' }}>se editan en Datos de empresa</span></div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge label={`Afiliación ${nombreAfiliacion(form.afiliacionIva)}`} color="gray" />
              <StatusBadge label={principal ? `Certificador ${principal.certificador}` : 'Sin certificador'} color={principal?.verificado ? 'green' : principal ? 'blue' : 'yellow'} />
            </div>
          </div>

          <div id="afiliacion" style={{ scrollMarginTop: 12 }} />
          <fieldset disabled={!puede('fe.config.tributaria.actividades')} style={{ display: 'contents' }}>
            <Section title="Afiliación al IVA y régimen" hint="Deciden qué tipos de documento puede emitir la empresa y qué frases llevan.">
              <CamposAfiliacion valor={form} onChange={p => patch(p)} />
              {err('vigencia') && <p style={{ fontSize: 11, color: C.error, margin: '-8px 0 0' }}>{err('vigencia')}</p>}
            </Section>
            <Section title="Frases" hint="Van en cada documento que las admite. Las del RTU dependen de la afiliación y del régimen de ISR.">
              <TablaFrases rtu={frasesDelRtu(form.afiliacionIva, form.regimenIsr, form.agenteRetencionIva)} manuales={form.frases} onChange={f => patch({ frases: f })} puedeEditar={puede('fe.config.tributaria.actividades')} />
            </Section>
          </fieldset>

          <div id="certificadores" style={{ scrollMarginTop: 12 }} />
          <Section title="Certificadores" hint="Reciben los documentos, los certifican y los envían a la SAT. La serie y el número de cada DTE los asigna el certificador.">
            <SeccionCertificadores certificadores={datos.certificadores} puedeEditar={puede('fe.config.tributaria.credenciales')}
              onGuardado={(d, m) => { setDatos(d); setToast({ message: m, type: 'success' }); }} />
          </Section>

          <div id="direccion" style={{ scrollMarginTop: 12 }} />
          <fieldset disabled={!puede('fe.config.tributaria.editar')} style={{ display: 'contents' }}>
            <Section title="Dirección fiscal y correo" hint="Aparecen en cada documento. Los establecimientos se administran en Configuración › Facturación electrónica › Establecimientos.">
              <UbicacionCR value={form.ubicacion} onChange={u => patch({ ubicacion: u })} required />
              {err('ubicacion') && <p style={{ fontSize: 11, color: C.error, margin: '-8px 0 0' }}>{err('ubicacion')}</p>}
              <FormField label="Dirección" required error={err('direccion')}>
                <Input value={form.direccion} onChange={v => patch({ direccion: v })} placeholder="Calle 30 de Junio, zona 0, Flores" error={err('direccion')} />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Correo para documentos" required error={err('correo')} hint="Aparece en los documentos y recibe las respuestas del certificador.">
                  <Input value={form.correoElectronico} onChange={v => patch({ correoElectronico: v })} type="email" placeholder="facturacion@hotel.com.gt" error={err('correo')} />
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
                  <Input value={nuevoCorreo} onChange={setNuevoCorreo} placeholder="contabilidad@hotel.com.gt" type="email" onKeyDown={e => { if (e.key === 'Enter') agregarCorreo(); }} />
                  <Button variant="secondary" icon={<IcPlus />} disabled={!correoValido(nuevoCorreo)} onClick={agregarCorreo}>Agregar</Button>
                </div>
              </div>
            </Section>
          </fieldset>
          <div style={{ height: dirty ? 56 : 0 }} />
        </div>
      </div>

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
