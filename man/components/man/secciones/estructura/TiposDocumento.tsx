'use client';
// Estructura › Impresión › Tipos de documento: clases de documento para efectos de impresión. Cada módulo tiene los
// suyos y los generales los usan todos; es lo que se asigna a cada impresora dentro de cada módulo.
import { useState } from 'react';
import { C } from '@/components/suite/tokens';
import { CrudCatalogo } from '@/components/kit/CrudCatalogo';
import { ConfigCard, FiltroOpciones } from '@/components/kit';
import { useDato } from '../../store';
import { siglaModulo } from '../../catalogo';
import { ChipModulo, opcionesModulos } from '../../piezas';

export default function TiposDocumento() {
  const [l, set] = useDato('tiposDocumento');
  const [modulos] = useDato('modulos');
  const [modulo, setModulo] = useState('');
  const contratados = modulos.filter(m => m.contratado).map(m => m.codigo);
  return (
    <ConfigCard title="Tipos de documento">
      <CrudCatalogo entidad="tipo de documento" filas={l} onChange={set} nombre={t => t.nombre} buscarEn={['codigo', 'nombre']} campoActivo="activo" contador={false}
        placeholderBuscar="Código o nombre" textoAgregar="Nuevo tipo de documento" nuevo={() => ({ codigo: '', nombre: '', modulo: '' as const, activo: true })}
        filtros={<FiltroOpciones etiqueta="Módulo" value={modulo} onChange={setModulo} opciones={[{ value: 'general', label: 'General' }, ...opcionesModulos(contratados)]} />}
        filtrar={t => !modulo || (modulo === 'general' ? !t.modulo : t.modulo === modulo)}
        columnas={[
          { key: 'codigo', label: 'Código', link: true, ancho: 200, render: t => <span style={{ fontFamily: 'ui-monospace, monospace' }}>{t.codigo}</span> },
          { key: 'nombre', label: 'Nombre' },
          { key: 'modulo', label: 'Módulo', ancho: 220, render: t => (t.modulo ? <ChipModulo m={t.modulo} /> : <span style={{ color: C.n700 }}>General</span>) },
          { key: 'activo', label: 'Estado', ancho: 100, render: t => <span style={{ color: t.activo ? C.successDk : C.n700 }}>{t.activo ? 'En uso' : 'Inactivo'}</span> },
        ]}
        campos={[
          { key: 'codigo', label: 'Código', requerido: true, unico: true, span: 3, placeholder: 'Ej: FOLIO' },
          { key: 'modulo', label: 'Módulo', tipo: 'select', span: 3, placeholder: 'General (todos los módulos)', opciones: contratados.map(m => ({ value: m, label: siglaModulo(m) })) },
          { key: 'nombre', label: 'Nombre', requerido: true, placeholder: 'Ej: Folio del huésped' },
          { key: 'activo', label: 'En uso', tipo: 'switch' },
        ]} />
    </ConfigCard>
  );
}
