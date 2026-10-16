'use client';
// Configuración › Empresa. Mismas pestañas que Accounting (datos, consecutivos, asignación de impresoras,
// impresoras y tipos de documento) más las pestañas propias de Front Desk: enlace contable e importación de datos.
import { TabsEnBarra } from '@/components/layout/Pantalla';
import { useState, type ReactNode } from 'react';
import { C } from '@/components/suite/tokens';
import { Input, Select } from '@/components/suite/ui';
import { useDato, usePatch } from '../store';
import { CrudCatalogo } from '../CrudCatalogo';
import { Aviso, Campo, Celda, ConfigCard, Fila, Grid, Tabla } from '../kit';
import type { Datos } from '../inicial';
import Consecutivos from './Consecutivos';
import Impresoras from './Impresoras';
import ImportarDocumentos from './ImportarDocumentos';
import Contabilidad from './Contabilidad';

const TABS = ['Datos de empresa', 'Consecutivos de documentos', 'Asignación de impresoras', 'Impresoras', 'Tipos de documento', 'Contabilidad', 'Importar datos'] as const;

export default function Empresa() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Datos de empresa');
  return <>
    <TabsEnBarra items={TABS} activo={tab} onChange={setTab} />
    {tab === 'Datos de empresa' && <DatosEmpresa />}
    {tab === 'Consecutivos de documentos' && <Consecutivos />}
    {tab === 'Asignación de impresoras' && <AsignacionImpresoras />}
    {tab === 'Impresoras' && <Impresoras />}
    {tab === 'Tipos de documento' && <TiposDocumento />}
    {tab === 'Contabilidad' && <Contabilidad />}
    {tab === 'Importar datos' && <ImportarDocumentos />}
  </>;
}

type G = Datos['general'];
const ACTIVIDADES = ['551001 - Hoteles, moteles y otros alojamientos', '551002 - Alquiler de bienes inmuebles de uso habitacional por periodos cortos', '552001 - Campamentos y parques de casas rodantes'];

const Grupo = ({ titulo, children, linea }: { titulo: string; children: ReactNode; linea?: boolean }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: linea ? 20 : 0, borderTop: linea ? `1px solid ${C.n500}` : undefined }}>
    <h3 style={{ fontSize: 11.5, fontWeight: 500, color: C.n700, letterSpacing: '.05em', textTransform: 'uppercase', margin: 0 }}>{titulo}</h3>
    {children}
  </div>
);

function DatosEmpresa() {
  const [g, patch] = usePatch('general');
  const texto = (k: keyof G, l: string, tipo = 'text') => (
    <Campo label={l}><Input value={String(g[k])} type={tipo} onChange={v => patch({ [k]: v } as Partial<G>)} /></Campo>
  );
  const opciones = (xs: string[]) => xs.map(x => ({ value: x, label: x }));
  return (
    <ConfigCard title="Datos de empresa" subtitle="Identidad del establecimiento que aparece en facturas, reportes y correos.">
      <Grupo titulo="Información básica">
        <Grid cols={2}>
          {texto('nombre', 'Nombre comercial')}
          {texto('razonSocial', 'Razón social')}
          {texto('cedula', 'Cédula jurídica / RUC')}
          {texto('pais', 'País')}
          <Campo label="Moneda predeterminada"><Select value={g.moneda} onChange={v => patch({ moneda: v })} options={opciones(['COL – Colón', 'USD – Dólar americano'])} /></Campo>
          <Campo label="Idioma predeterminado"><Select value={g.idioma} onChange={v => patch({ idioma: v })} options={opciones(['Español', 'Inglés'])} /></Campo>
          <Campo label="Actividad económica"><Select value={g.actividad} onChange={v => patch({ actividad: v })} options={opciones(ACTIVIDADES)} /></Campo>
        </Grid>
      </Grupo>
      <Grupo titulo="Contacto" linea>
        <Grid cols={2}>
          {texto('telefono', 'Teléfono')}
          {texto('correo', 'Correo principal', 'email')}
          {texto('web', 'Sitio web')}
          {texto('direccion', 'Dirección')}
        </Grid>
      </Grupo>
    </ConfigCard>
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
