'use client';
// Usuarios: cada persona tiene un usuario para toda la suite. Aquí se gestionan el nombre de usuario, la contraseña,
// los módulos a los que entra y el rol en cada uno; los permisos de cada rol se definen dentro de cada módulo.
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AccionesEnHeader, FiltrosEnBarra } from '@/components/layout/Pantalla';
import { C } from '@/components/suite/tokens';
import { Button, Switch } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Buscador, Celda, Fila, FilaVacia, FiltroOpciones, IcEdit, IconButton, Insignia, LinkButton, norm, Paginacion, Popover, Tabla, usePaginado } from '@/components/kit';
import { fmtFH } from '@/components/kit/fechas';
import { useDato } from '../../store';
import { ChipModulo, opcionesModulos } from '../../piezas';
import type { Usuario } from '../../tipos';
import { useModulosConAcceso } from '../modulos/integracion';
import { CambiarClave } from './CamposClave';
import { rutaUsuario } from './DetalleUsuario';
import { useCrearEnEscritorio } from '@/components/layout/SoloEscritorio';

const IcLlave = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l3 3M15 8l2 2" />
  </svg>
);
const IcCopiar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h10" />
  </svg>
);


/** Siglas de los módulos del usuario; al pasar el cursor o hacer clic muestra el rol en cada uno. */
function RolesUsuario({ u, accesos }: { u: Usuario; accesos: Usuario['accesos'] }) {
  const [abierto, setAbierto] = useState(false);
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mostrar = () => { clearTimeout(espera.current); setAbierto(true); };
  const ocultar = () => { clearTimeout(espera.current); espera.current = setTimeout(() => setAbierto(false), 150); };
  return (
    <span style={{ display: 'inline-flex' }} onMouseEnter={mostrar} onMouseLeave={ocultar}>
      <button type="button" onClick={mostrar} aria-expanded={abierto} aria-label={`Ver roles de ${u.usuario}`}
        style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
        {accesos.map(a => <ChipModulo key={a.modulo} m={a.modulo} />)}
      </button>
      <Popover open={abierto} onClose={() => setAbierto(false)} width={260}>
        <div onMouseEnter={mostrar} onMouseLeave={ocultar} style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.n900, marginBottom: 8 }}>Roles de {u.usuario}</div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
            {accesos.map(a => (
              <li key={a.modulo} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', fontSize: 12.5 }}>
                <ChipModulo m={a.modulo} /><span style={{ color: a.rol ? C.n900 : C.n700 }}>{a.rol || 'Sin rol'}</span>
              </li>
            ))}
          </ul>
        </div>
      </Popover>
    </span>
  );
}

export default function Usuarios() {
  const enEscritorio = useCrearEnEscritorio();
  const [l, set] = useDato('usuarios');
  const disponibles = useModulosConAcceso();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('activos');
  const [modulo, setModulo] = useState('');
  const [cambiando, setCambiando] = useState<Usuario | null>(null);
  const filtrados = l.filter(u => (!estado || (estado === 'activos') === u.activo) && (!modulo || u.admin || u.accesos.some(a => a.modulo === modulo))
    && (!q || norm(`${u.usuario} ${u.nombre} ${u.correo} ${u.numero}`).includes(norm(q)))).sort((a, b) => a.usuario.localeCompare(b.usuario));
  const pag = usePaginado(filtrados, 10);
  const patch = (id: string, p: Partial<Usuario>) => set(l.map(x => (x.id === id ? { ...x, ...p } : x)));
  const router = useRouter();
  const abrir = (id: string, desde?: string) => router.push(rutaUsuario(id, desde));
  const filtro = (f: (v: string) => void) => (v: string) => { f(v); pag.setPagina(1); };

  return (
    <>
      <AccionesEnHeader><Button icon={<IcPlus size={12} />} onClick={enEscritorio(() => abrir('nuevo'))}>Nuevo usuario</Button></AccionesEnHeader>
      <FiltrosEnBarra>
        <Buscador value={q} onChange={filtro(setQ)} placeholder="Usuario, nombre, correo o número" width={240} />
        <FiltroOpciones etiqueta="Estado" value={estado} onChange={filtro(setEstado)} opciones={[{ value: 'activos', label: 'Activos' }, { value: 'inactivos', label: 'No activos' }]} />
        <FiltroOpciones etiqueta="Módulo" value={modulo} onChange={filtro(setModulo)} opciones={opcionesModulos(disponibles)} />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.n700 }}>{filtrados.length} usuarios</span>
      </FiltrosEnBarra>
      <Tabla headers={['Nro.', 'Usuario', 'Módulos', 'Último acceso', 'Activo', '']} anchos={{ 0: 70, 3: 140, 4: 64, 5: 100 }} alinearDerecha={[5]}>
        {pag.visibles.length === 0 && <FilaVacia cols={6} />}
        {pag.visibles.map(u => {
          // Solo se muestran los accesos a módulos conectados; los demás se conservan y aparecen al integrar el módulo.
          const accesos = u.accesos.filter(a => disponibles.includes(a.modulo));
          return (
              <Fila key={u.id} style={u.activo ? undefined : { color: C.n700 }}>
                <Celda muted movil="ocultar">{u.numero}</Celda>
                <Celda movil="titulo">
                  <LinkButton onClick={() => abrir(u.id)}>{u.usuario}</LinkButton>
                  <span style={{ display: 'block', fontSize: 11.5, color: C.n700, marginTop: 2 }}>{u.nombre}</span>
                </Celda>
                <Celda movil="bloque" style={{ whiteSpace: 'normal' }}>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {u.admin && <Insignia label="Administrador" color="brand" />}
                    {accesos.length > 0 && <RolesUsuario u={u} accesos={accesos} />}
                  </span>
                </Celda>
                <Celda muted>{u.ultimoAcceso ? fmtFH(u.ultimoAcceso) : 'Nunca'}</Celda>
                <Celda><Switch checked={u.activo} onChange={b => patch(u.id, { activo: b })} label={<span className="sr-only">Activo</span>} /></Celda>
                <Celda derecha>
                  <span style={{ display: 'inline-flex', gap: 2 }}>
                    <IconButton label={`Cambiar contraseña de ${u.usuario}`} onClick={() => setCambiando(u)}><IcLlave /></IconButton>
                    <IconButton label={`Duplicar ${u.usuario}`} onClick={enEscritorio(() => abrir('nuevo', u.id))}><IcCopiar /></IconButton>
                    <IconButton label={`Editar ${u.usuario}`} onClick={() => abrir(u.id)}><IcEdit /></IconButton>
                  </span>
                </Celda>
              </Fila>
          );
        })}
      </Tabla>
      <Paginacion pag={pag} />
      {cambiando && <CambiarClave u={cambiando} onClose={() => setCambiando(null)} onGuardar={c => { patch(cambiando.id, { cambiarClave: c }); setCambiando(null); }} />}
    </>
  );
}
