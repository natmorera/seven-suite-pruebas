'use client';
import { TabsEnBarra } from '@/components/layout/Pantalla';
import { useState } from 'react';
import { useDato } from '../store';
import { CrudCatalogo } from '../CrudCatalogo';
import { ConfigCard } from '../kit';
import { type Contrato } from '../datos';
import { Tarifario } from './Tarifario';

// Orden por uso: lo que se toca a diario (Tarifario, Contratos) primero; los catálogos de apoyo después.
const TABS = ['Tarifario', 'Contratos', 'Empresas', 'Mercados', 'Agentes de ventas', 'Referidores'] as const;
const AYUDA: Record<(typeof TABS)[number], string> = {
  'Tarifario': 'Precio por noche, pax adicionales y restricciones por tarifa, tipo de habitación y día.',
  'Contratos': 'Acuerdos con empresas y agencias: vigencia, cupos, release y tarifa negociada.',
  'Empresas': 'Agencias, OTAs y empresas que venden o contratan; el color las identifica en reservas y reportes.',
  'Mercados': 'Segmentos de mercado para clasificar las reservas en las estadísticas.',
  'Agentes de ventas': 'Personas que gestionan reservas por las empresas o agencias.',
  'Referidores': 'Quién recomendó o refirió la reserva.',
};

export default function Tarifas() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Tarifario');
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
  return (
    <CrudCatalogo entidad="empresa" femenino filas={filas} onChange={set} nombre={f => f.descripcion} buscarEn={['descripcion']}
      nuevo={() => ({ descripcion: '', directo: false, color: '#FFFFFF' })}
      columnas={[{ key: 'descripcion', label: 'Descripción', link: true }, { key: 'directo', label: 'Directo', tipo: 'siNo', ancho: 100 }, { key: 'color', label: 'Color', tipo: 'color', ancho: 110 }]}
      campos={[
        { key: 'descripcion', label: 'Descripción', requerido: true, unico: true, placeholder: 'Ej: Agencias, Corporativo' },
        { key: 'directo', label: 'Directo', tipo: 'siNo' },
        { key: 'color', label: 'Color', tipo: 'color' },
      ]} />
  );
}
function Mercados() {
  const [filas, set] = useDato('mercados');
  return (
    <CrudCatalogo entidad="mercado" filas={filas} onChange={set} nombre={f => f.descripcion} buscarEn={['descripcion']} nuevo={() => ({ descripcion: '' })}
      columnas={[{ key: 'descripcion', label: 'Descripción', link: true }]}
      campos={[{ key: 'descripcion', label: 'Descripción', requerido: true, unico: true, placeholder: 'Ej: Corporativo, Incentivos' }]} />
  );
}
function Agentes() {
  const [filas, set] = useDato('agentes');
  return (
    <CrudCatalogo entidad="agente de ventas" filas={filas} onChange={set} nombre={f => f.nombre} buscarEn={['nombre', 'correo']}
      nuevo={() => ({ nombre: '', telefono: '', celular: '', correo: '' })}
      columnas={[{ key: 'nombre', label: 'Nombre', link: true }, { key: 'telefono', label: 'Teléfono' }, { key: 'celular', label: 'Celular' }, { key: 'correo', label: 'Correo electrónico' }]}
      campos={[
        { key: 'nombre', label: 'Nombre', requerido: true, placeholder: 'Nombre completo' },
        { key: 'telefono', label: 'Teléfono', tipo: 'text', placeholder: '8888 8888', span: 3 },
        { key: 'celular', label: 'Celular', placeholder: '8888 8888', span: 3 },
        { key: 'correo', label: 'Correo electrónico', tipo: 'email', placeholder: 'correo@ejemplo.com' },
      ]} />
  );
}
function Referidores() {
  const [filas, set] = useDato('referidores');
  return (
    <CrudCatalogo entidad="referidor" filas={filas} onChange={set} nombre={f => f.descripcion} buscarEn={['descripcion']} nuevo={() => ({ descripcion: '' })}
      columnas={[{ key: 'descripcion', label: 'Descripción', link: true }]}
      campos={[{ key: 'descripcion', label: 'Descripción', requerido: true, unico: true, placeholder: 'Nombre del referidor' }]} />
  );
}
function Contratos() {
  const [filas, set] = useDato('contratos');
  const [empresas] = useDato('empresas');
  const [mercados] = useDato('mercados');
  const [tarifas] = useDato('tarifas');
  return (
    <CrudCatalogo<Contrato> entidad="contrato" filas={filas} onChange={set} nombre={f => f.nombre} buscarEn={['nombre', 'empresa']} campoActivo="activo"
      nuevo={() => ({ nombre: '', empresa: '', mercado: '', desde: '', hasta: '', cupos: 0, release: 0, tarifa: '', activo: true })}
      columnas={[
        { key: 'nombre', label: 'Nombre', link: true }, { key: 'empresa', label: 'Empresa / agencia' },
        { key: 'vigencia', label: 'Vigencia', render: c => (c.desde && c.hasta ? `${c.desde.split('-').reverse().join('/')} – ${c.hasta.split('-').reverse().join('/')}` : '-') },
        { key: 'cupos', label: 'Cupos', ancho: 60 }, { key: 'release', label: 'Release', render: c => `${c.release} días`, ancho: 80 },
        { key: 'tarifa', label: 'Tarifa negociada' }, { key: 'activo', label: 'Estado', tipo: 'estado', ancho: 80 },
      ]}
      campos={[
        { key: 'nombre', label: 'Nombre', requerido: true, unico: true, placeholder: 'Ej: Agencias Fits 2026' },
        { key: 'empresa', label: 'Empresa / agencia', tipo: 'select', opciones: empresas.map(e => e.descripcion), requerido: true, span: 3 },
        { key: 'mercado', label: 'Mercado', tipo: 'select', opciones: mercados.map(m => m.descripcion), span: 3 },
        { key: 'desde', label: 'Vigente desde', tipo: 'date', requerido: true, span: 3 },
        { key: 'hasta', label: 'Vigente hasta', tipo: 'date', requerido: true, span: 3 },
        { key: 'cupos', label: 'Cupos', tipo: 'number', span: 3, hint: 'Habitaciones reservadas por noche' },
        { key: 'release', label: 'Release', tipo: 'number', span: 3, sufijo: 'días', hint: 'Días antes de la llegada en que se liberan' },
        { key: 'tarifa', label: 'Tarifa negociada', tipo: 'select', opciones: tarifas.map(t => t.nombre) },
        { key: 'activo', label: 'Activo', tipo: 'switch' },
      ]}
      validar={c => (c.desde && c.hasta && c.hasta < c.desde ? 'La fecha «hasta» debe ser posterior a «desde».' : undefined)} />
  );
}
