'use client';
// Estructura › Impresión › Impresoras de la empresa y los módulos que imprimen en cada una
// (cada módulo asigna a cuál va cada tipo de documento).
import { C } from '@/components/suite/tokens';
import { CrudCatalogo } from '@/components/kit/CrudCatalogo';
import { ConfigCard } from '@/components/kit';
import { useDato } from '../../store';
import { siglaModulo } from '../../catalogo';
import { ChipModulo } from '../../piezas';

export default function Impresoras() {
  const [l, set] = useDato('impresoras');
  const [modulos] = useDato('modulos');
  const contratados = modulos.filter(m => m.contratado).map(m => m.codigo);
  return (
    <ConfigCard title="Impresoras">
      <CrudCatalogo entidad="impresora" femenino filas={l} onChange={set} nombre={i => i.nombre} buscarEn={['nombre']} campoActivo="activa" contador={false}
        textoAgregar="Nueva impresora" nuevo={() => ({ nombre: '', modulos: [], activa: true })}
        columnas={[
          { key: 'nombre', label: 'Nombre', link: true },
          { key: 'modulos', label: 'Módulos', render: i => (i.modulos.length
            ? <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>{i.modulos.map(m => <ChipModulo key={m} m={m} />)}</span>
            : <span style={{ color: C.n700 }}>Ninguno</span>) },
          { key: 'activa', label: 'Impresión', ancho: 120, render: i => <span style={{ color: i.activa ? C.successDk : C.n700 }}>{i.activa ? 'Habilitada' : 'Deshabilitada'}</span> },
        ]}
        campos={[
          { key: 'nombre', label: 'Nombre', requerido: true, unico: true, placeholder: 'Ej: Recepción principal' },
          { key: 'modulos', label: 'Módulos que imprimen aquí', tipo: 'multi', opciones: contratados.map(m => ({ value: m, label: siglaModulo(m) })) },
          { key: 'activa', label: 'Impresión habilitada', tipo: 'switch' },
        ]} />
    </ConfigCard>
  );
}
