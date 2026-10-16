'use client';
import { C } from '@/components/suite/tokens';
import { useDato } from '../store';
import { CrudCatalogo } from '../CrudCatalogo';
import { Aviso, ConfigCard } from '../kit';

export default function Impresoras() {
  const [l, set] = useDato('impresoras');
  return (
    <ConfigCard title="Impresoras" subtitle="Las impresoras que esta empresa tiene registradas.">
      <Aviso>Cada tipo de documento se asigna a una impresora en la pestaña Asignación de impresoras.</Aviso>
      <CrudCatalogo entidad="impresora" femenino filas={l} onChange={set} nombre={i => i.nombre} buscarEn={['nombre', 'ubicacion']} campoActivo="activa"
        textoAgregar="Registrar impresora" nuevo={() => ({ nombre: '', ubicacion: '', tipo: 'Láser', papel: 'Letter', activa: true })}
        columnas={[
          { key: 'nombre', label: 'Nombre', link: true }, { key: 'ubicacion', label: 'Ubicación' }, { key: 'tipo', label: 'Tipo' }, { key: 'papel', label: 'Papel' },
          { key: 'activa', label: 'Impresión', ancho: 110, render: i => <span style={{ color: i.activa ? C.successDk : C.n700 }}>{i.activa ? 'Habilitada' : 'Deshabilitada'}</span> },
        ]}
        campos={[
          { key: 'nombre', label: 'Nombre', requerido: true, unico: true, placeholder: 'Ej: Recepción principal' },
          { key: 'ubicacion', label: 'Ubicación', placeholder: 'Ej: Front Desk' },
          { key: 'tipo', label: 'Tipo', tipo: 'select', opciones: ['Láser', 'Inyección', 'Térmica 80 mm', 'Matricial'], span: 3 },
          { key: 'papel', label: 'Papel', tipo: 'select', opciones: ['Letter', 'Legal', 'A4', 'Rollo 80 mm'], span: 3 },
          { key: 'activa', label: 'Impresión habilitada', tipo: 'switch' },
        ]} />
    </ConfigCard>
  );
}
