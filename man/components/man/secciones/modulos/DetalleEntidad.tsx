'use client';
// Detalle de una entidad: sus datos (descripción, Front Desk principal, bitácora) y la base de datos de cada módulo
// contratado. Por base: refrescar la conexión, cambiar la fecha del sistema y eliminarla (no se puede si el módulo
// tiene enlaces activos). La base se edita en un modal al abrirla.
import { useState, type ReactNode } from 'react';
import { AccionesEnHeader, JuntoAlTitulo, VolverEnTitulo } from '@/components/layout/Pantalla';
import { C, FONT } from '@/components/suite/tokens';
import { Button, Input, Select, Switch } from '@/components/suite/ui';
import { Campo, Celda, ConfigCard, Fila, Grid, IconButton, IcTrash, LinkButton, ModalBase, OutlineButton, Tabla, useConfirmar } from '@/components/kit';
import { fmtF } from '@/components/kit/fechas';
import { useDato } from '../../store';
import { nombreModulo } from '../../catalogo';
import { ChipModulo, EstadoConexionChip, useProbarConexion } from '../../piezas';
import type { BaseDatos, Entidad, ModuloId } from '../../tipos';
import { EditarBase } from './EditarBase';

const IcRefrescar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4" />
  </svg>
);
const IcCalendario = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

/** Etiqueta de una base de Front Desk para elegir el Front Desk principal: «FDK - Hotel». */
export const etiquetaFront = (entidades: Entidad[], base: string) => {
  const e = entidades.find(x => x.bases.some(b => b.modulo === 'FDK' && b.base === base));
  return e ? `FDK - ${e.descripcion}` : base;
};

export function DetalleEntidad({ e, contratados, onVolver, onEliminar, onCambiar, onEstado, dialogo }: {
  e: Entidad; contratados: ModuloId[]; onVolver: () => void; onEliminar: () => void; onCambiar: (p: Partial<Entidad>) => void;
  onEstado: (id: string, estado: BaseDatos['estado']) => void; dialogo: ReactNode;
}) {
  const [entidades] = useDato('entidades');
  const [enlaces] = useDato('enlaces');
  const [editando, setEditando] = useState<BaseDatos | null>(null);
  const [fecha, setFecha] = useState<{ b: BaseDatos; valor: string } | null>(null);
  const [enUso, setEnUso] = useState(false);
  const { pedir, dialogo: confirmacion } = useConfirmar();
  const { probar, probando } = useProbarConexion(onEstado);
  const base = (m: ModuloId): BaseDatos => e.bases.find(b => b.modulo === m)
    ?? { id: `${e.id}-${m}`, modulo: m, descripcion: nombreModulo(m), base: '', origen: '', usuario: '', contrasena: '', servidor: '', version: '', estado: 'Sin probar' };
  const filas = contratados.map(base);
  const guardarBase = (b: BaseDatos) => onCambiar({ bases: e.bases.some(x => x.id === b.id) ? e.bases.map(x => (x.id === b.id ? b : x)) : [...e.bases, b] });
  const refrescar = (b: BaseDatos) => probar(b.id, `${b.base} ${b.servidor}`);
  // Una base no se elimina mientras su módulo tenga enlaces activos con otros módulos.
  const eliminar = (b: BaseDatos) => (enlaces.some(x => x.activo && (x.origen === b.modulo || x.destino === b.modulo))
    ? setEnUso(true)
    : pedir('Eliminar base de datos', `¿Eliminar la base ${b.base} de ${nombreModulo(b.modulo)} en esta entidad?`, () => onCambiar({ bases: e.bases.filter(x => x.id !== b.id) })));
  const fronts = entidades.flatMap(x => x.bases.filter(b => b.modulo === 'FDK' && b.base).map(b => ({ value: b.base, label: `FDK - ${x.descripcion}` })));

  return (
    <>
      <AccionesEnHeader><OutlineButton onClick={() => filas.filter(b => b.base).forEach(refrescar)}>Refrescar conexiones</OutlineButton></AccionesEnHeader>
      <VolverEnTitulo onClick={onVolver} label="Volver a entidades" />
      <JuntoAlTitulo><span style={{ fontSize: 16, color: C.n700 }}>› {e.descripcion || 'Entidad'}</span></JuntoAlTitulo>
      <ConfigCard title="Datos de la entidad"
        actions={<IconButton label={`Eliminar ${e.descripcion}`} tono="peligro" onClick={onEliminar}><IcTrash /></IconButton>}>
        <Grid cols={2} gap={16}>
          <Campo label="Descripción" required><Input value={e.descripcion} onChange={v => onCambiar({ descripcion: v })} /></Campo>
          <Campo label="Front Desk principal">
            <Select value={e.frontPrincipal} onChange={v => onCambiar({ frontPrincipal: v })} options={[{ value: '', label: 'Seleccionar' }, ...fronts]} />
          </Campo>
        </Grid>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Switch checked={e.activo} onChange={b => onCambiar({ activo: b })} label="Entidad activa" />
          <Switch checked={e.bitacora} onChange={b => onCambiar({ bitacora: b })} label="Registrar sus eventos en la bitácora de seguridad" />
        </div>
      </ConfigCard>
      <ConfigCard title="Bases de datos">
        <Tabla headers={['Módulo', 'Descripción', 'Base de datos', 'Origen de datos', 'Usuario', 'Servidor', 'Conexión', '']} anchos={{ 6: 110, 7: 110 }} alinearDerecha={[7]}>
          {filas.map(b => (
            <Fila key={b.modulo}>
              <Celda><ChipModulo m={b.modulo} /></Celda>
              {b.base ? <>
                <Celda>{b.descripcion}</Celda>
                <Celda><LinkButton onClick={() => setEditando(b)}>{b.base}</LinkButton></Celda>
                <Celda muted>{b.origen || b.base}</Celda>
                <Celda muted>{b.usuario}</Celda>
                <Celda muted>{b.servidor}</Celda>
                <Celda><EstadoConexionChip estado={probando(b.id) ? 'Probando' : b.estado} /></Celda>
              </> : <Celda colSpan={6} muted>Sin base de datos en esta entidad</Celda>}
              <Celda derecha>
                {b.base ? (
                  <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
                    <IconButton label={`Refrescar conexión de ${nombreModulo(b.modulo)}`} disabled={probando(b.id)} onClick={() => refrescar(b)}><IcRefrescar /></IconButton>
                    <IconButton label={`Cambiar fecha del sistema de ${nombreModulo(b.modulo)}`} onClick={() => setFecha({ b, valor: b.fechaSistema ?? '' })}><IcCalendario /></IconButton>
                    <IconButton label={`Eliminar base de ${nombreModulo(b.modulo)}`} tono="peligro" onClick={() => eliminar(b)}><IcTrash /></IconButton>
                  </span>
                ) : <Button onClick={() => setEditando(b)}>Configurar</Button>}
              </Celda>
            </Fila>
          ))}
        </Tabla>
      </ConfigCard>
      {editando && <EditarBase b={editando} onClose={() => setEditando(null)} onGuardar={p => { guardarBase({ ...editando, ...p, estado: 'Sin probar' }); setEditando(null); }} />}
      {fecha && (
        <ModalBase titulo="Cambiar fecha del sistema" onClose={() => setFecha(null)} ancho={420}
          pie={<><Button variant="secondary" onClick={() => setFecha(null)}>Cancelar</Button>
            <Button disabled={!fecha.valor} onClick={() => { guardarBase({ ...fecha.b, fechaSistema: fecha.valor }); setFecha(null); }}>Aceptar</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: FONT }}>
            <span style={{ fontSize: 12.5, color: C.n900 }}>{nombreModulo(fecha.b.modulo)} · {fecha.b.base}{fecha.b.fechaSistema && <span style={{ color: C.n700 }}> · actual {fmtF(fecha.b.fechaSistema)}</span>}</span>
            <Campo label="Fecha del sistema" required><Input type="date" value={fecha.valor} onChange={v => setFecha({ ...fecha, valor: v })} /></Campo>
          </div>
        </ModalBase>
      )}
      {enUso && (
        <ModalBase titulo="No se puede eliminar" onClose={() => setEnUso(false)} ancho={420} pie={<Button onClick={() => setEnUso(false)}>Entendido</Button>}>
          <p style={{ margin: 0, fontSize: 13, color: C.n900, fontFamily: FONT }}>La base de datos está siendo usada en enlaces entre módulos.</p>
        </ModalBase>
      )}
      {confirmacion}
      {dialogo}
    </>
  );
}
