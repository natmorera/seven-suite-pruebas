'use client';
// Configuración › Empresa: datos de la empresa, consecutivos de documentos e impresión
import SeccionApiKey from '@/components/ui/integracion/SeccionApiKey';
import { obtenerApiKey, regenerarApiKey } from './datos/apiKey';
import { useState, useEffect } from 'react';
import { PageHeader, TabBar, Section, Toast } from '@/components/ui/primitives';
import { Button } from '@/components/ui/formulario';
import { C, PAGE_PAD } from '@/components/ui/tokens';
import { IcCheck, IcPlus } from '@/components/ui/icons';
import { useFirmasConfig } from '@/components/pages/config/firmasConfig';
import TabDatosEmpresa from './TabDatosEmpresa';
import ConsecutivosDocumentos from './ConsecutivosDocumentos';
import TabAsignacion from './impresion/TabAsignacion';
import TabImpresoras from './impresion/TabImpresoras';
import TabTiposDocumento from './impresion/TabTiposDocumento';
import { empresaAlmacen, type DatosEmpresa } from './datos/empresa';
import { useAlmacen } from './datos/almacen';

const TABS = [
  { id: 'datos', label: 'Datos de empresa' },
  { id: 'consecutivos', label: 'Consecutivos de documentos' },
  { id: 'asignacion', label: 'Asignación de impresoras' },
  { id: 'impresoras', label: 'Impresoras' },
  { id: 'tipos', label: 'Tipos de documento' },
  { id: 'apikey', label: 'API Key' },
] as const;

export default function EmpresaPage() {
  const guardado = useAlmacen(empresaAlmacen);
  const [tab, setTab] = useState(0);
  const [borrador, setBorrador] = useState<DatosEmpresa | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [nuevaImpresora, setNuevaImpresora] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState(false);
  const { setEmpresaLegal } = useFirmasConfig();

  const config = borrador ?? guardado;
  const dirty = borrador !== null && JSON.stringify(borrador) !== JSON.stringify(guardado);
  const id = TABS[tab].id;

  // Los datos legales alimentan las firmas y el encabezado alternativo de los
  // reportes; se sincronizan en cada cambio para que la vista previa esté al día.
  useEffect(() => {
    setEmpresaLegal({
      nombre: config.nombreLegal,
      cedulaJuridica: config.numeroId,
      noLegalizacion: config.numeroLegalizacion,
      citasPresentacion: config.citasPresentacion,
    });
  }, [config.nombreLegal, config.numeroId, config.numeroLegalizacion, config.citasPresentacion, setEmpresaLegal]);

  function patch(p: Partial<DatosEmpresa>) { setBorrador(b => ({ ...(b ?? guardado), ...p })); }
  function guardar() {
    if (borrador) empresaAlmacen.guardar(borrador);
    setBorrador(null);
    setToast('Se guardaron los datos de la empresa.');
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader title="Empresa">
        {id === 'datos' && dirty && (
          <>
            <Button variant="secondary" onClick={() => setBorrador(null)}>Cancelar</Button>
            <Button onClick={guardar} icon={<IcCheck className="w-3 h-3" />}>Guardar cambios</Button>
          </>
        )}
        {id === 'impresoras' && <Button onClick={() => setNuevaImpresora(true)} icon={<IcPlus className="w-3 h-3" />}>Registrar impresora</Button>}
        {id === 'tipos' && <Button onClick={() => setNuevoTipo(true)} icon={<IcPlus className="w-3 h-3" />}>Nuevo tipo de documento</Button>}
      </PageHeader>
      <TabBar tabs={TABS.map(t => t.label)} active={tab} onChange={setTab} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {id === 'datos' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: PAGE_PAD }}>
            <TabDatosEmpresa config={config} patch={patch} />
          </div>
        )}
        {id === 'consecutivos' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: PAGE_PAD }}>
            <Section title="Consecutivos de documentos" hint="Cómo se numera cada tipo de documento."><ConsecutivosDocumentos /></Section>
          </div>
        )}
        {id === 'asignacion' && <TabAsignacion />}
        {id === 'apikey' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: PAGE_PAD }}>
            <SeccionApiKey obtener={obtenerApiKey} regenerar={regenerarApiKey} marca={C.brand} />
          </div>
        )}
        {id === 'impresoras' && <TabImpresoras nueva={nuevaImpresora} onCerrarNueva={() => setNuevaImpresora(false)} />}
        {id === 'tipos' && <TabTiposDocumento nuevo={nuevoTipo} onCerrarNuevo={() => setNuevoTipo(false)} />}
      </div>
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </div>
  );
}
