'use client';
import { TabsEnBarra } from '@/components/layout/Pantalla';
import { useState, useSyncExternalStore } from 'react';
import { FiltroUno } from '@/components/facturacion/comun';
import { useDato } from '../store';
import { CrudCatalogo } from '../CrudCatalogo';
import { ConfigCard } from '../kit';
import { Tarifario } from './Tarifario';
import Contratos from './Contratos';

// Orden por uso: lo que se toca a diario (Tarifario, Contratos) primero; los catálogos de apoyo después.
const TABS = ['Tarifario', 'Contratos', 'Empresas', 'Mercados', 'Agentes de ventas', 'Referidores'] as const;
/** Solo Tarifario y Contratos llevan subtítulo; los catálogos van directo del buscador a la tabla. */
const AYUDA: Partial<Record<(typeof TABS)[number], string>> = {
  'Tarifario': 'Precio por noche, pax adicionales, cupos y restricciones por tarifa, tipo de habitación y día.',
  'Contratos': 'Acuerdos con empresas y agencias: datos comerciales, servicios, impuestos, políticas, cupos garantizados y restricciones.',
};

const ACTIVO = { key: 'activo' as const, label: 'Activo', tipo: 'checkbox' as const };

export default function Tarifas() {
  // ?tab=Contratos (o cualquier pestaña) abre directo esa pestaña
  const tabUrl = useSyncExternalStore(() => () => {}, () => new URLSearchParams(window.location.search).get('tab'), () => null);
  const [tabManual, setTab] = useState<(typeof TABS)[number] | null>(null);
  const tab: (typeof TABS)[number] = tabManual ?? ((TABS as readonly string[]).includes(tabUrl ?? '') ? (tabUrl as (typeof TABS)[number]) : 'Tarifario');
  return (
    <ConfigCard title={tab} subtitle={AYUDA[tab]}>
      <TabsEnBarra items={TABS} activo={tab} onChange={setTab} />
      {tab === 'Empresas' && <Empresas />}
      {tab === 'Mercados' && <Mercados />}
      {tab === 'Agentes de ventas' && <Agentes />}
      {tab === 'Referidores' && <Referidores />}
      {tab === 'Contratos' && <Contratos />}
      {tab === 'Tarifario' && <Tarifario />}
    </ConfigCard>
  );
}

function Empresas() {
  const [filas, set] = useDato('empresas');
  const [canal, setCanal] = useState('');
  return (
    <CrudCatalogo entidad="empresa" femenino filas={filas} onChange={set} nombre={f => f.descripcion} buscarEn={['descripcion']} campoActivo="activo"
      filtros={<FiltroUno label="Venta" value={canal} onChange={setCanal} todos="Todas" ancho={200}
        opciones={[{ value: 'si', label: 'Directa' }, { value: 'no', label: 'Por intermediario' }]} />}
      filtrar={f => !canal || f.directo === (canal === 'si')}
      nuevo={() => ({ descripcion: '', directo: false, color: '#FFFFFF', activo: true })}
      columnas={[{ key: 'descripcion', label: 'Descripción', link: true }, { key: 'directo', label: 'Directo', tipo: 'siNo', ancho: 100 }, { key: 'color', label: 'Color', tipo: 'color', ancho: 110 }]}
      campos={[
        { key: 'descripcion', label: 'Descripción', requerido: true, unico: true, placeholder: 'Ej: Agencias, Corporativo' },
        { key: 'directo', label: 'Directo', tipo: 'siNo' },
        { key: 'color', label: 'Color', tipo: 'color' },
        ACTIVO,
      ]} />
  );
}
function Mercados() {
  const [filas, set] = useDato('mercados');
  return (
    <CrudCatalogo entidad="mercado" filas={filas} onChange={set} nombre={f => f.descripcion} buscarEn={['descripcion']} campoActivo="activo" nuevo={() => ({ descripcion: '', activo: true })}
      columnas={[{ key: 'descripcion', label: 'Descripción', link: true }]}
      campos={[{ key: 'descripcion', label: 'Descripción', requerido: true, unico: true, placeholder: 'Ej: Corporativo, Incentivos' }, ACTIVO]} />
  );
}
function Agentes() {
  const [filas, set] = useDato('agentes');
  return (
    <CrudCatalogo entidad="agente de ventas" filas={filas} onChange={set} nombre={f => f.nombre} buscarEn={['nombre', 'correo']} campoActivo="activo"
      nuevo={() => ({ nombre: '', telefono: '', celular: '', correo: '', activo: true })}
      columnas={[{ key: 'nombre', label: 'Nombre', link: true }, { key: 'telefono', label: 'Teléfono' }, { key: 'celular', label: 'Celular' }, { key: 'correo', label: 'Correo electrónico' }]}
      campos={[
        { key: 'nombre', label: 'Nombre', requerido: true, placeholder: 'Nombre completo' },
        { key: 'telefono', label: 'Teléfono', tipo: 'text', placeholder: '8888 8888', span: 3 },
        { key: 'celular', label: 'Celular', placeholder: '8888 8888', span: 3 },
        { key: 'correo', label: 'Correo electrónico', tipo: 'email', placeholder: 'correo@ejemplo.com' },
        ACTIVO,
      ]} />
  );
}
function Referidores() {
  const [filas, set] = useDato('referidores');
  return (
    <CrudCatalogo entidad="referidor" filas={filas} onChange={set} nombre={f => f.descripcion} buscarEn={['descripcion']} campoActivo="activo" nuevo={() => ({ descripcion: '', activo: true })}
      columnas={[{ key: 'descripcion', label: 'Descripción', link: true }]}
      campos={[{ key: 'descripcion', label: 'Descripción', requerido: true, unico: true, placeholder: 'Nombre del referidor' }, ACTIVO]} />
  );
}
