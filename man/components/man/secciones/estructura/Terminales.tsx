'use client';
// Estructura › Terminales: equipos (estaciones, servidores y accesos web) que se conectan a la suite.
// Las terminales de tarjeta están aparte, en Terminales PinPad.
import { CrudCatalogo } from '@/components/kit/CrudCatalogo';
import { ConfigCard } from '@/components/kit';
import { fmtFH } from '@/components/kit/fechas';
import { useDato } from '../../store';

export default function Terminales() {
  const [l, set] = useDato('terminales');
  const siguiente = Math.max(0, ...l.map(t => t.numero)) + 1;
  return (
    <ConfigCard title="Terminales">
      <CrudCatalogo entidad="terminal" filas={[...l].sort((a, b) => a.numero - b.numero)} onChange={set} nombre={t => t.nombre} buscarEn={['nombre', 'ubicacion']} campoActivo="activo"
        placeholderBuscar="Nombre, IP o ubicación" nuevo={() => ({ numero: siguiente, nombre: '', tipo: 'Estación' as const, ubicacion: '', ultimaConexion: '', activo: true })}
        columnas={[
          { key: 'numero', label: 'Nro.', derecha: true, ancho: 60 },
          { key: 'nombre', label: 'Nombre o IP', link: true },
          { key: 'tipo', label: 'Tipo', ancho: 110 },
          { key: 'ubicacion', label: 'Ubicación' },
          { key: 'ultimaConexion', label: 'Última conexión', ancho: 150, render: t => (t.ultimaConexion ? fmtFH(t.ultimaConexion) : 'Nunca') },
        ]}
        contador={false}
        campos={[
          { key: 'nombre', label: 'Nombre del equipo o IP', requerido: true, unico: true, placeholder: 'Ej: DESKTOP-RECEP01 o 10.0.0.7' },
          { key: 'tipo', label: 'Tipo', tipo: 'select', opciones: ['Estación', 'Servidor', 'Web'], span: 3 },
          { key: 'ubicacion', label: 'Ubicación', span: 3, placeholder: 'Ej: Recepción' },
          { key: 'activo', label: 'Activo', tipo: 'switch' },
        ]} />
    </ConfigCard>
  );
}

