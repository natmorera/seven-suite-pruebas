'use client';
// Parámetros generales: Monedas, Tipo de cambio, Nacionalidades e Impuestos en pestañas de una sola pantalla.
import { PestanasUrl } from '@/components/layout/Pestanas';
import Impuestos from './Impuestos';
import Monedas from './Monedas';
import Nacionalidades from './Nacionalidades';
import TipoCambio from './TipoCambio';

export default function PantallaParametros() {
  return (
    <PestanasUrl tabs={[
      { id: 'monedas', label: 'Monedas', contenido: () => <Monedas /> },
      { id: 'tipo-de-cambio', label: 'Tipo de cambio', contenido: () => <TipoCambio /> },
      { id: 'nacionalidades', label: 'Nacionalidades', contenido: () => <Nacionalidades /> },
      { id: 'impuestos', label: 'Impuestos', contenido: () => <Impuestos /> },
    ]} />
  );
}
