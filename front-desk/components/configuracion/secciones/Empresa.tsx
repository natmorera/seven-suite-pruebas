'use client';
// Configuración › Empresa. Mismas pestañas que Accounting (datos, consecutivos, asignación de impresoras,
// impresoras y tipos de documento) y la API Key con la que Management se conecta al módulo;
// la importación de catálogos se abre desde el header.
import { AccionesEnHeader, TabsEnBarra } from '@/components/layout/Pantalla';
import { useState, type ReactNode } from 'react';
import { C, radius } from '@/components/suite/tokens';
import { Button, Input, Section, Select } from '@/components/suite/ui';
import { PAISES, TIPOS_ID, ZONAS_HORARIAS, paisPorCodigo } from '../paises';
import { useDato, usePatch } from '../store';
import { CrudCatalogo } from '../CrudCatalogo';
import { Aviso, Campo, Celda, ConfigCard, Fila, IcUpload, Tabla } from '../kit';
import type { Datos } from '../inicial';
import Consecutivos from './Consecutivos';
import Impresoras from './Impresoras';
import ImportarDocumentos from './ImportarDocumentos';
import SeccionApiKey from '@/components/ui/integracion/SeccionApiKey';
import { obtenerApiKey, regenerarApiKey } from '../apiKey';

const TABS = ['Datos de empresa', 'Consecutivos de documentos', 'Asignación de impresoras', 'Impresoras', 'Tipos de documento', 'API Key'] as const;

export default function Empresa() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Datos de empresa');
  const [importar, setImportar] = useState(false);
  return <>
    <AccionesEnHeader><Button variant="secondary" icon={<IcUpload size={12} />} onClick={() => setImportar(true)}>Importar datos</Button></AccionesEnHeader>
    <TabsEnBarra items={TABS} activo={tab} onChange={setTab} />
    {tab === 'Datos de empresa' && <DatosEmpresa />}
    {tab === 'Consecutivos de documentos' && <Consecutivos />}
    {tab === 'Asignación de impresoras' && <AsignacionImpresoras />}
    {tab === 'Impresoras' && <Impresoras />}
    {tab === 'Tipos de documento' && <TiposDocumento />}
    {tab === 'API Key' && <ApiKey />}
    {importar && <ImportarDocumentos onClose={() => setImportar(false)} />}
  </>;
}

function ApiKey() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.n900 }}>API Key</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12.5, color: C.n700 }}>Llave con la que Management se conecta a Front Desk. Cópiala en Management al registrar este módulo.</p>
      </div>
      <SeccionApiKey obtener={obtenerApiKey} regenerar={regenerarApiKey} marca={C.brand} />
    </div>
  );
}

type G = Datos['general'];

const Columnas = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>{children}</div>
);

function DatosEmpresa() {
  const [g, patch] = usePatch('general');
  const texto = (k: keyof G, l: string, placeholder: string, extra: { tipo?: string; requerido?: boolean } = {}) => (
    <Campo label={l} required={extra.requerido}>
      <Input value={String(g[k])} type={extra.tipo ?? 'text'} placeholder={placeholder} onChange={v => patch({ [k]: v } as Partial<G>)} />
    </Campo>
  );
  const pais = paisPorCodigo(g.pais);
  const zonas = !g.zonaHoraria || ZONAS_HORARIAS.some(z => z.value === g.zonaHoraria) ? ZONAS_HORARIAS : [{ value: g.zonaHoraria, label: g.zonaHoraria }, ...ZONAS_HORARIAS];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="Identificación" hint="Datos legales y fiscales de la empresa.">
        <Columnas>
          {texto('nombreLegal', 'Nombre legal', 'Ej. Seven Hospitality S.A.', { requerido: true })}
          {texto('nombreComercial', 'Nombre comercial', 'Ej. Hotel Seven Suite')}
          <Campo label="Tipo de identificación" required><Select value={g.tipoId} onChange={v => patch({ tipoId: v })} options={TIPOS_ID} /></Campo>
          {texto('numeroId', 'Número de identificación', 'Ej. 3101123456', { requerido: true })}
          <Campo label="País" required>
            <Select value={g.pais} onChange={v => patch({ pais: v, zonaHoraria: paisPorCodigo(v)?.zona ?? g.zonaHoraria })} options={PAISES.map(x => ({ value: x.value, label: x.label }))} />
          </Campo>
          <Campo label="Moneda del país">
            <div style={{ height: 32, padding: '0 10px', display: 'flex', alignItems: 'center', fontSize: 12, color: C.n700, background: C.n200, border: `1px solid ${C.n500}`, borderRadius: radius.control }}>
              {pais ? `${pais.simbolo} ${pais.monedaNombre}` : '-'}
            </div>
          </Campo>
          <Campo label="Zona horaria" required><Select value={g.zonaHoraria} onChange={v => patch({ zonaHoraria: v })} options={zonas} /></Campo>
        </Columnas>
      </Section>

      <Section title="Contacto" hint="Información de contacto de la empresa.">
        <Columnas>
          {texto('direccion', 'Dirección', 'Dirección física')}
          {texto('telefono', 'Teléfono', '+506 2222-3333')}
          {texto('correo', 'Correo electrónico', 'info@empresa.com', { tipo: 'email' })}
          {texto('web', 'Sitio web', 'www.empresa.com')}
        </Columnas>
      </Section>

    </div>
  );
}

function AsignacionImpresoras() {
  const [asig, set] = useDato('asignaciones');
  const [tipos] = useDato('tiposDocumento');
  const [impresoras] = useDato('impresoras');
  const nombre = (id: string) => (id === 'no' ? 'No se imprime' : impresoras.find(i => i.id === id)?.nombre);
  const opciones = [{ value: '', label: '- Predeterminada del sistema -' }, { value: 'no', label: '- No imprimir -' },
    ...impresoras.filter(i => i.activa).map(i => ({ value: i.id, label: i.nombre }))];
  const asignar = (tipo: string, impresora: string) =>
    set(asig.some(a => a.tipo === tipo) ? asig.map(a => (a.tipo === tipo ? { ...a, impresora } : a)) : [...asig, { tipo, impresora }]);
  return (
    <ConfigCard title="Configuración de impresoras" subtitle="Asigne una impresora a cada tipo de documento.">
      <Aviso>Las impresoras disponibles son las registradas y habilitadas en la pestaña Impresoras.</Aviso>
      <Tabla headers={['Tipo', 'Código', 'Impresora actual', 'Asignar']} anchos={{ 3: 320 }}>
        {tipos.filter(t => t.enUso).map(t => {
          const actual = asig.find(a => a.tipo === t.codigo)?.impresora ?? '';
          return (
            <Fila key={t.id}>
              <Celda><span style={{ padding: '3px 8px', background: C.n200, border: `1px solid ${C.n500}`, borderRadius: 4, fontSize: 12 }}>{t.nombre}</span></Celda>
              <Celda muted>{t.codigo}</Celda>
              <Celda muted={!nombre(actual)}>{nombre(actual) ?? 'Sin asignar'}</Celda>
              <Celda><Select value={actual} onChange={v => asignar(t.codigo, v)} options={opciones} /></Celda>
            </Fila>
          );
        })}
      </Tabla>
    </ConfigCard>
  );
}

function TiposDocumento() {
  const [l, set] = useDato('tiposDocumento');
  return (
    <ConfigCard title="Tipos de documento" subtitle="Clases de documento para efectos de impresión: es lo que se asigna a cada impresora.">
      <CrudCatalogo entidad="tipo de documento" filas={l} onChange={set} nombre={t => t.nombre} buscarEn={['codigo', 'nombre']} campoActivo="enUso"
        textoAgregar="Nuevo tipo de documento" nuevo={() => ({ codigo: '', nombre: '', enUso: true })}
        columnas={[
          { key: 'codigo', label: 'Código', ancho: 180, render: t => <code style={{ fontSize: 12.5 }}>{t.codigo}</code> },
          { key: 'nombre', label: 'Nombre', link: true },
          { key: 'enUso', label: 'Estado', ancho: 100, render: t => <span style={{ color: t.enUso ? C.successDk : C.n700 }}>{t.enUso ? 'En uso' : 'Sin uso'}</span> },
        ]}
        contador={false}
        campos={[
          { key: 'codigo', label: 'Código', requerido: true, unico: true, placeholder: 'Ej: FACTURA' },
          { key: 'nombre', label: 'Nombre', requerido: true, placeholder: 'Ej: Factura electrónica' },
          { key: 'enUso', label: 'En uso', tipo: 'switch' },
        ]}
        validar={t => (!/^[A-Z0-9_]+$/.test(t.codigo) ? 'El código va en mayúsculas, sin espacios (letras, números y _).' : undefined)} />
    </ConfigCard>
  );
}
