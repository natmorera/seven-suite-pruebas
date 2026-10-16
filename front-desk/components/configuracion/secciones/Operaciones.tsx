'use client';
import { TabsEnBarra } from '@/components/layout/Pantalla';
import { useState } from 'react';
import { useDato } from '../store';
import { CrudCatalogo } from '../CrudCatalogo';
import { ConfigCard } from '../kit';
import { IDIOMAS } from '../datos';

// Las monedas pasaron a Parámetros generales › Monedas (junto con el tipo de cambio), como en Accounting.
const TABS = ['Tipos de tareas', 'Nacionalidades'] as const;
const AYUDA: Record<(typeof TABS)[number], string> = {
  'Tipos de tareas': 'Clasificación de las tareas de Hospedaje (mantenimiento, transporte, ama de llaves…).',
  'Nacionalidades': 'Países e idioma que se usan en perfiles, tarjetas de registro y estadísticas.',
};

export default function Operaciones() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Tipos de tareas');
  return <>
    <TabsEnBarra items={TABS} activo={tab} onChange={setTab} />
    <ConfigCard title={tab} subtitle={AYUDA[tab]}>
      {tab === 'Tipos de tareas' && <TiposTarea />}
      {tab === 'Nacionalidades' && <Nacionalidades />}
    </ConfigCard>
  </>;
}

function TiposTarea() {
  const [l, set] = useDato('tiposTarea');
  return (
    <CrudCatalogo entidad="tipo de tarea" filas={l} onChange={set} nombre={t => t.descripcion} buscarEn={['descripcion']} nuevo={() => ({ descripcion: '' })}
      columnas={[{ key: 'descripcion', label: 'Descripción', link: true }]}
      campos={[{ key: 'descripcion', label: 'Descripción', requerido: true, unico: true, placeholder: 'Ej: Ama de llaves, Mantenimiento' }]} />
  );
}

function Nacionalidades() {
  const [l, set] = useDato('nacionalidades');
  return (
    <CrudCatalogo entidad="nacionalidad" femenino filas={[...l].sort((a, b) => a.pais.localeCompare(b.pais))} onChange={set} nombre={n => n.pais}
      buscarEn={['codigo', 'pais']} campoActivo="activo" porPagina={12}
      nuevo={() => ({ codigo: '', pais: '', idioma: '', activo: true })}
      columnas={[{ key: 'codigo', label: 'Código', link: true, ancho: 80 }, { key: 'pais', label: 'País' }, { key: 'idioma', label: 'Idioma' }]}
      contador={false}
      campos={[
        { key: 'codigo', label: 'Código', requerido: true, unico: true, placeholder: 'Ej: CRI' },
        { key: 'pais', label: 'País', requerido: true, unico: true, placeholder: 'Ej: Costa Rica' },
        { key: 'idioma', label: 'Idioma', tipo: 'select', opciones: IDIOMAS, placeholder: 'Selecciona' },
        { key: 'activo', label: 'Activa', tipo: 'checkbox' },
      ]}
      validar={n => (!/^[A-Za-z]{3}$/.test(n.codigo) ? 'El código debe tener 3 letras (ISO 3166).' : undefined)} />
  );
}
