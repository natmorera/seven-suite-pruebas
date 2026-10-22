'use client';
// Detalle de un usuario (?usuario=<id>, o «nuevo» para el alta): pestañas Datos y accesos y Bitácora de seguridad (solo sus eventos),
// sin las pestañas de la lista. «Duplicar» abre el alta con los módulos y roles de otro usuario (&desde=<id>).
import { useRouter } from 'next/navigation';
import { C } from '@/components/suite/tokens';
import { JuntoAlTitulo, VolverEnTitulo } from '@/components/layout/Pantalla';
import { PestanasUrl } from '@/components/layout/Pestanas';
import { FilaVacia, Tabla, uid } from '@/components/kit';
import { useDato } from '../../store';
import type { Usuario } from '../../tipos';
import { useModulosConAcceso } from '../modulos/integracion';
import Bitacora from './Bitacora';
import { EditorUsuario } from './EditorUsuario';

/** Dirección del detalle de un usuario. */
export const rutaUsuario = (id: string, desde?: string) => `/usuarios?usuario=${encodeURIComponent(id)}${desde ? `&desde=${encodeURIComponent(desde)}` : ''}`;

export default function DetalleUsuario({ id, desde }: { id: string; desde?: string | null }) {
  const router = useRouter();
  const [l, set] = useDato('usuarios');
  const [modulos] = useDato('modulos');
  const disponibles = useModulosConAcceso();
  const nuevo = id === 'nuevo';
  const origen = l.find(u => u.id === desde);
  const u: Usuario | undefined = nuevo
    ? { id: '', numero: Math.max(0, ...l.map(x => x.numero)) + 1, usuario: '', nombre: '', correo: '', activo: true, admin: origen?.admin ?? false,
      cambiarClave: true, ultimoAcceso: '', accesos: origen ? origen.accesos.map(a => ({ ...a })) : [] }
    : l.find(x => x.id === id);
  const volver = () => router.push('/usuarios');
  const guardar = (x: Usuario) => {
    const g = x.id ? x : { ...x, id: uid() };
    set(l.some(y => y.id === g.id) ? l.map(y => (y.id === g.id ? g : y)) : [...l, g]);
    volver();
  };

  if (!u) return (
    <>
      <VolverEnTitulo onClick={volver} label="Volver a usuarios" />
      <Tabla headers={['Usuario']}><FilaVacia cols={1} texto="El usuario no existe." /></Tabla>
    </>
  );

  const urls = Object.fromEntries(modulos.filter(m => m.contratado && m.url).map(m => [m.codigo, m.url]));
  const editor = () => <EditorUsuario key={id} inicial={u} nuevo={nuevo} modulos={disponibles} urls={urls}
    usados={l.filter(x => x.id !== u.id).map(x => x.usuario)} onCancelar={volver} onGuardar={guardar} />;

  return (
    <>
      <VolverEnTitulo onClick={volver} label="Volver a usuarios" />
      <JuntoAlTitulo><span style={{ fontSize: 16, color: C.n700 }}>› {nuevo ? 'Nuevo usuario' : u.usuario}</span></JuntoAlTitulo>
      {nuevo ? editor() : (
        <PestanasUrl tabs={[
          { id: 'datos', label: 'Datos y accesos', contenido: editor },
          { id: 'bitacora', label: 'Bitácora de seguridad', contenido: () => <Bitacora usuario={u.usuario} /> },
        ]} />
      )}
    </>
  );
}
