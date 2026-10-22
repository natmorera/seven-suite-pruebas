'use client';
// Estructura › Impresión: Impresoras y Tipos de documento en pestañas.
import { PestanasUrl } from '@/components/layout/Pestanas';
import Impresoras from './Impresoras';
import TiposDocumento from './TiposDocumento';

export default function PantallaImpresion() {
  return (
    <PestanasUrl tabs={[
      { id: 'impresoras', label: 'Impresoras', contenido: () => <Impresoras /> },
      { id: 'tipos-documento', label: 'Tipos de documento', contenido: () => <TiposDocumento /> },
    ]} />
  );
}
