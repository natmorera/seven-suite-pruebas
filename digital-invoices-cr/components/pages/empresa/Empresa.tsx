'use client';
import { useState, useEffect, useSyncExternalStore } from 'react';
import { PageHeader, TabBar, Button, FormField, Input, Section, Toast, radius, PAGE_PAD, FONT } from '../../ui/primitives';
import { IcCheck, IcPlus } from '../../ui/icons';
import CamposIdentificacion from './CamposIdentificacion';
import ConsecutivosDocumentos from './ConsecutivosDocumentos';
import { useImpresion, TabAsignacion, TabImpresoras, TabTiposDocumento } from './ImpresionEmpresa';
import { C } from '../../ui/primitives';
import { useFirmasConfig } from '../config/firmasConfig';
import InformacionTributaria from '../facturacion/EmisoresPage';
import type { DatosEmpresa, OpcionFE } from '@/lib/empresa';
import { useModulos } from '@/lib/modulosCliente';
import { usePermisos } from '@/lib/permisosCliente';

// Pregunta de facturación electrónica. Sin responder: tarjeta destacada
// arriba de los datos (es lo primero que se ve al entrar a Empresa).
// Respondida: una sección más, que se puede cambiar cuando se quiera.
// Facturación electrónica para el usuario final: una sola pregunta. Al decir
// que sí (con confirmación) la empresa queda como emisor y la pregunta
// desaparece; desactivarla es un proceso interno de Seven, no del usuario.
function PreguntaFacturacion({ fe, onResponder }: { fe: OpcionFE; onResponder: (v: 'si' | 'no') => void }) {
  if (fe === 'si') return null;
  const activar = () => { if (window.confirm('La empresa quedará como emisor de facturación electrónica. Una vez activa no se puede desactivar. ¿Continuar?')) onResponder('si'); };
  return (
    <div style={{ border: `1px solid ${C.brandBd}`, background: C.brandBg, borderRadius: radius.md, padding: '16px 18px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 380px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.n900 }}>¿Esta empresa emite facturación electrónica?</div>
        <div style={{ fontSize: 12, color: C.n700, marginTop: 4, lineHeight: 1.5 }}>
          {fe === 'no'
            ? 'Indicaste que no emite comprobantes electrónicos. Si eso cambia, actívala aquí.'
            : 'Si emite comprobantes electrónicos ante Hacienda, actívala para configurar los datos tributarios.'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {fe !== 'no' && <Button variant="secondary" onClick={() => onResponder('no')}>No</Button>}
        <Button onClick={activar}>{fe === 'no' ? 'Activar facturación electrónica' : 'Sí'}</Button>
      </div>
    </div>
  );
}


function TabDatosEmpresa({ config, patch, fe, onResponderFe }: { config: DatosEmpresa; patch: (p: Partial<DatosEmpresa>) => void; fe: OpcionFE; onResponderFe: (v: 'si' | 'no') => void }) {
  const { facturacion, contabilidad } = useModulos();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {facturacion && <PreguntaFacturacion fe={fe} onResponder={onResponderFe} />}
      <Section title="Identificación" hint="Datos legales y fiscales de la empresa.">
        <CamposIdentificacion config={config} patch={patch} libros={contabilidad} />
      </Section>

      <Section title="Contacto" hint="Información de contacto de la empresa.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FormField label="Dirección">
            <Input value={config.direccion} onChange={v => patch({ direccion: v })} placeholder="Dirección física" />
          </FormField>
          <FormField label="Teléfono">
            <Input value={config.telefono} onChange={v => patch({ telefono: v })} placeholder="+506 2222-3333" />
          </FormField>
          <FormField label="Correo electrónico">
            <Input type="email" value={config.email} onChange={v => patch({ email: v })} placeholder="info@empresa.com" />
          </FormField>
          <FormField label="Sitio web">
            <Input value={config.web} onChange={v => patch({ web: v })} placeholder="www.empresa.com" />
          </FormField>
        </div>
      </Section>
    </div>
  );
}

type TabId = 'datos' | 'tributaria' | 'consecutivos' | 'asignacion' | 'impresoras' | 'tipos';

export default function EmpresaPage() {
  const { contabilidad: contabilidadEmp } = useModulos();
  const { puede: puedeEmp } = usePermisos();
  // ?tab=tributaria abre directo esa pestaña (enlaces de la lista de configuración)
  const tabUrl = useSyncExternalStore(() => () => {}, () => new URLSearchParams(window.location.search).get('tab'), () => null);
  const [tabManual, setTab] = useState<TabId | null>(null);
  const tab: TabId = tabManual ?? (tabUrl === 'tributaria' ? 'tributaria' : 'datos');
  const [config, setConfig] = useState<DatosEmpresa | null>(null);
  const [savedConfig, setSavedConfig] = useState<DatosEmpresa | null>(null);
  const [fe, setFe]         = useState<OpcionFE>('');
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast]   = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { setEmpresaLegal } = useFirmasConfig();
  const impresion = useImpresion(m => setToast({ message: m, type: 'error' }));
  const [nuevaImpresora, setNuevaImpresora] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch('/api/empresa').then(r => r.json()).then(d => {
      if (!vivo) return;
      setConfig(d.datos); setSavedConfig(d.datos); setFe(d.facturacionElectronica ?? '');
    });
    return () => { vivo = false; };
  }, []);

  // Sincroniza los datos legales con el contexto global de Firmas / Encabezado
  // alternativo, para que el reporte muestre lo que está cargado aquí.
  useEffect(() => {
    if (!config) return;
    setEmpresaLegal({
      nombre: config.nombreLegal,
      cedulaJuridica: config.numeroId,
      noLegalizacion: config.numeroLegalizacion,
      citasPresentacion: config.citasPresentacion,
    });
  }, [config, setEmpresaLegal]);

  const dirty = Boolean(config && savedConfig && JSON.stringify(config) !== JSON.stringify(savedConfig));
  function patch(p: Partial<DatosEmpresa>) { setConfig(c => c && ({ ...c, ...p })); }
  async function save() {
    if (!config) return;
    setGuardando(true);
    const r = await fetch('/api/empresa', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ datos: config }) });
    setGuardando(false);
    if (!r.ok) { setToast({ message: 'No se pudo guardar.', type: 'error' }); return; }
    const d = await r.json();
    setConfig(d.datos); setSavedConfig(d.datos);
    setToast({ message: 'Se guardaron los datos de la empresa.', type: 'success' });
  }
  function cancelar() { setConfig(savedConfig); }

  async function responderFe(v: 'si' | 'no') {
    if (v === fe) return;
    if (v === 'no' && fe === 'si') return;   // una vez emisor no se desactiva desde aquí
    const r = await fetch('/api/empresa', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ facturacionElectronica: v, ...(config ? { datos: config } : {}) }) });
    if (!r.ok) { setToast({ message: 'No se pudo guardar.', type: 'error' }); return; }
    const d = await r.json();
    setFe(d.facturacionElectronica); setConfig(d.datos); setSavedConfig(d.datos);
    setToast({ message: v === 'si' ? 'Se activó la facturación electrónica. Completa la información tributaria.' : 'Se desactivó la facturación electrónica.', type: 'success' });
    if (v === 'si') {
      if (fe !== 'si') { try { sessionStorage.setItem('fe-recien-activada', '1'); } catch { /* sin almacenamiento */ } }
      setTab('tributaria');
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'datos', label: 'Datos de empresa' },
    ...(fe === 'si' && puedeEmp('fe.config.tributaria.view') ? [{ id: 'tributaria' as const, label: 'Información tributaria' }] : []),
    // Consecutivos de asientos, transferencias, depósitos…: solo con Contabilidad
    ...(contabilidadEmp ? [{ id: 'consecutivos' as const, label: 'Consecutivos de documentos' }] : []),
    { id: 'asignacion', label: 'Asignación de impresoras' },
    { id: 'impresoras', label: 'Impresoras' },
    { id: 'tipos', label: 'Tipos de documento' },
  ];
  const activo = Math.max(0, tabs.findIndex(t => t.id === tab));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: FONT }}>
      <PageHeader title="Empresa">
        {tab === 'datos' && dirty && (
          <>
            <Button variant="secondary" onClick={cancelar} disabled={guardando}>Cancelar</Button>
            <Button onClick={save} disabled={guardando} icon={<IcCheck className="w-3 h-3" />}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Button>
          </>
        )}
        {tabs[activo]?.id === 'impresoras' && <Button onClick={() => setNuevaImpresora(true)} icon={<IcPlus className="w-3 h-3" />}>Registrar impresora</Button>}
        {tabs[activo]?.id === 'tipos' && <Button onClick={() => setNuevoTipo(true)} icon={<IcPlus className="w-3 h-3" />}>Nuevo tipo de documento</Button>}
      </PageHeader>
      <TabBar tabs={tabs.map(t => t.label)} active={activo} onChange={i => setTab(tabs[i].id)} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tabs[activo].id === 'datos' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: PAGE_PAD }}>
            {config ? <TabDatosEmpresa config={config} patch={patch} fe={fe} onResponderFe={responderFe} /> : <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p>}
          </div>
        )}
        {tabs[activo].id === 'tributaria' && <InformacionTributaria />}
        {tabs[activo].id === 'consecutivos' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: PAGE_PAD }}>
            <Section title="Consecutivos de documentos" hint="Cómo se numera cada tipo de documento."><ConsecutivosDocumentos /></Section>
          </div>
        )}
        {tabs[activo].id === 'asignacion' && <TabAsignacion {...impresion} />}
        {tabs[activo].id === 'impresoras' && <TabImpresoras {...impresion} nueva={nuevaImpresora} onCerrarNueva={() => setNuevaImpresora(false)} />}
        {tabs[activo].id === 'tipos' && <TabTiposDocumento {...impresion} nuevo={nuevoTipo} onCerrarNuevo={() => setNuevoTipo(false)} />}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
