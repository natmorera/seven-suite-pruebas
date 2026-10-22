'use client';
// Módulos: los contratados con su integración y los enlaces entre módulos, en pestañas.
// Con ?modulo=<id> muestra el detalle de ese módulo, donde se integra con el MAN.
import { useSearchParams } from 'next/navigation';
import { PestanasUrl } from '@/components/layout/Pestanas';
import type { ModuloId } from '../../tipos';
import Conexion from './Conexion';
import DetalleModulo from './DetalleModulo';
import Enlaces from './Enlaces';

export default function PantallaModulos() {
  const modulo = useSearchParams().get('modulo');
  if (modulo) return <DetalleModulo key={modulo} m={modulo as ModuloId} />;
  return (
    <PestanasUrl tabs={[
      { id: 'modulos', label: 'Módulos', contenido: () => <Conexion /> },
      { id: 'enlaces', label: 'Enlaces', contenido: () => <Enlaces /> },
    ]} />
  );
}
