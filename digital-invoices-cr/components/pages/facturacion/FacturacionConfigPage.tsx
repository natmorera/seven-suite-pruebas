'use client';
// Configuración de Facturación electrónica: una sola entrada del menú con
// pestañas. Los datos del emisor están en Empresa → Información tributaria.
// El botón principal del encabezado cambia según la pestaña; en
// Productos/Servicios, la plantilla y la importación de Excel son botones
// secundarios del mismo encabezado.
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader, TabBar, Button, EmptyState, C } from '@/components/ui/primitives';
import ImpuestosPage from './ImpuestosPage';
import ExoneracionesPage from './ExoneracionesPage';
import CajasPage from './CajasPage';
import CabysPage from './CabysPage';
import GruposPage from './GruposProductos';
import DescuentosPage from './DescuentosPage';
import ReceptoresPage from './ReceptoresPage';
import SucursalesPage from './SucursalesPage';
import CuentasFacturacionPage from './CuentasFacturacionPage';
import { useModulos } from '@/lib/modulosCliente';
import { usePermisos } from '@/lib/permisosCliente';
import ChecklistFE from './ChecklistFE';

const TABS = [
  { id: 'sucursales', label: 'Sucursales' },
  { id: 'cajas', label: 'Cajas / Terminales' },
  { id: 'impuestos', label: 'Impuestos' },
  { id: 'descuentos', label: 'Descuentos' },
  { id: 'exoneraciones', label: 'Exoneraciones' },
  { id: 'receptores', label: 'Receptores' },
  { id: 'grupos', label: 'Grupos CABYS' },
  { id: 'productos', label: 'Productos/Servicios' },
  { id: 'cuentas', label: 'Cuentas contables' },
] as const;
type TabId = typeof TABS[number]['id'];

function Contenido() {
  const router = useRouter();
  const params = useSearchParams();
  const desdeUrl = params.get('tab');
  const tabPedida: TabId = (TABS.find(t => t.id === desdeUrl)?.id ?? 'cajas');
  const [senal, setSenal] = useState<Record<string, number>>({});
  const disparar = (k: string) => setSenal(s => ({ ...s, [k]: (s[k] ?? 0) + 1 }));
  const [fe, setFe] = useState<string | null>(null);
  // Solo implementación crea sucursales (según el plan)
  const [implementacion, setImplementacion] = useState(false);
  useEffect(() => {
    let vivo = true;
    fetch('/api/empresa/plan').then(r => r.json()).then(p => { if (vivo) setImplementacion(Boolean(p?.implementacion)); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  useEffect(() => {
    let vivo = true;
    fetch('/api/empresa').then(r => r.json()).then(d => { if (vivo) setFe(d.facturacionElectronica === 'no' || (!d.facturacionElectronica && !d.emisorId) ? 'no' : 'si'); }).catch(() => { if (vivo) setFe('si'); });
    return () => { vivo = false; };
  }, []);

  // Sin Contabilidad no hay pestaña de cuentas contables
  const { contabilidad } = useModulos();
  // Cada pestaña según su permiso «Ver»; los botones de crear según «Crear»
  const { puede } = usePermisos();
  const VISIBLES = TABS.filter(t => (contabilidad || t.id !== 'cuentas') && puede(`fe.config.${t.id}.view`));
  const tab: TabId = VISIBLES.find(t => t.id === tabPedida)?.id ?? VISIBLES[0]?.id ?? 'cajas';
  const cambiarTab = (i: number) => router.replace(`/facturacion-config?tab=${VISIBLES[i].id}`, { scroll: false });

  const accion =
    fe !== 'si' ? null :
    tab === 'sucursales' ? (implementacion && puede('fe.config.sucursales.crear') ? <Button onClick={() => disparar('sucursales')}>+ Nueva sucursal</Button> : null) :
    tab === 'cajas' ? (puede('fe.config.cajas.crear') ? <Button onClick={() => disparar('cajas')}>+ Nueva caja / terminal</Button> : null) :
    tab === 'impuestos' ? (puede('fe.config.impuestos.crear') ? <Button onClick={() => disparar('impuestos')}>+ Nuevo impuesto</Button> : null) :
    tab === 'descuentos' ? (puede('fe.config.descuentos.crear') ? <Button onClick={() => disparar('descuentos')}>+ Nuevo descuento</Button> : null) :
    tab === 'exoneraciones' ? (puede('fe.config.exoneraciones.crear') ? <Button onClick={() => disparar('exoneraciones')}>+ Nueva exoneración</Button> : null) :
    tab === 'receptores' ? (puede('fe.config.receptores.crear') ? <Button onClick={() => disparar('receptores')}>+ Nuevo receptor</Button> : null) :
    tab === 'productos' ? <>
      {puede('fe.config.productos.exportar') && <Button variant="secondary" onClick={() => disparar('plantilla')}>Descargar listado</Button>}
      {puede('fe.config.productos.importar') && <Button variant="secondary" onClick={() => disparar('importar')}>Importar desde Excel</Button>}
      {puede('fe.config.productos.crear') && <Button onClick={() => disparar('productos')}>+ Nuevo producto o servicio</Button>}
    </> :
    tab === 'grupos' ? (puede('fe.config.grupos.crear') ? <Button onClick={() => disparar('grupos')}>+ Nuevo grupo CABYS</Button> : null) :
    null;

  // Solo se bloquea si la empresa indicó que no emite (o no hay emisor).
  if (fe === 'no') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <PageHeader title="Facturación electrónica" />
        <div style={{ padding: 24 }}>
          <EmptyState message="La facturación electrónica no está activada. Actívala en Empresa, en Datos de empresa."
            action={<Link href="/empresa" style={{ color: C.brand, fontSize: 12.5, fontWeight: 500 }}>Ir a Empresa</Link>} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader title="Facturación electrónica">
        {accion}
      </PageHeader>
      <TabBar tabs={VISIBLES.map(t => t.label)} active={VISIBLES.findIndex(t => t.id === tab)} onChange={cambiarTab} />
      <ChecklistFE variante="aviso" />
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {tab === 'sucursales' && <SucursalesPage addSignal={senal.sucursales} />}
        {tab === 'cuentas' && <CuentasFacturacionPage />}
        {tab === 'cajas' && <CajasPage hideHeader addSignal={senal.cajas} />}
        {tab === 'impuestos' && <ImpuestosPage hideHeader addSignal={senal.impuestos} />}
        {tab === 'descuentos' && <DescuentosPage hideHeader addSignal={senal.descuentos} />}
        {tab === 'exoneraciones' && <ExoneracionesPage hideHeader addSignal={senal.exoneraciones} />}
        {tab === 'receptores' && <ReceptoresPage addSignal={senal.receptores} />}
        {tab === 'productos' && <CabysPage hideHeader addSignal={senal.productos} plantillaSignal={senal.plantilla} importarSignal={senal.importar} />}
        {tab === 'grupos' && <GruposPage hideHeader addSignal={senal.grupos} />}
      </div>
    </div>
  );
}

export default function FacturacionConfigPage() {
  return <Suspense fallback={null}><Contenido /></Suspense>;
}
