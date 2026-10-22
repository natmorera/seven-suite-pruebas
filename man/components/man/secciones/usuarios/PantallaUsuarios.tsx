'use client';
// Usuarios: pestañas Usuarios y Bitácora de seguridad. Con ?usuario=<id> muestra el detalle de ese usuario.
import { useSearchParams } from 'next/navigation';
import { PestanasUrl } from '@/components/layout/Pestanas';
import Bitacora from './Bitacora';
import DetalleUsuario from './DetalleUsuario';
import Usuarios from './Usuarios';

export default function PantallaUsuarios() {
  const params = useSearchParams();
  const id = params.get('usuario');
  if (id) return <DetalleUsuario key={id} id={id} desde={params.get('desde')} />;
  return (
    <PestanasUrl tabs={[
      { id: 'usuarios', label: 'Usuarios', contenido: () => <Usuarios /> },
      { id: 'bitacora', label: 'Bitácora de seguridad', contenido: () => <Bitacora /> },
    ]} />
  );
}
