'use client';
// Paso «Perfiles compartidos» de la integración. La primera vez (o con «Sincronizar de nuevo») junta los perfiles del
// módulo y de los módulos enlazados, agrupados por identificación, para elegir cuáles traer y revisar los que se unen;
// se puede omitir. Con una sincronización hecha muestra su detalle: fecha y perfiles que el MAN tiene de estos módulos.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, FONT } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';
import { useSeleccion } from '@/components/layout/Pantalla';
import { Celda, Fila, Insignia, LinkButton, OutlineButton, Tabla } from '@/components/kit';
import { ChipModulo } from '../../piezas';
import { fmtFH } from '@/components/kit/fechas';
import { nombreModulo } from '../../catalogo';
import type { ModuloId, Perfil } from '../../tipos';
import type { useIntegracion } from './integracion';
import { RevisarUnion } from './RevisarUnion';
import { TarjetaPaso } from './TarjetaPaso';
import { UnificarPerfiles, agrupar, faltaRevisar, type Grupo } from './UnificarPerfiles';

export function PasoPerfiles({ m, n, it, conectado }: { m: ModuloId; n: number; it: ReturnType<typeof useIntegracion>; conectado: boolean }) {
  const router = useRouter();
  const c = it.conexion(m);
  const fuentes = it.fuentesPerfiles(m);
  const s = useSeleccion();
  const [eligiendo, setEligiendo] = useState(false);
  const [revisados, setRevisados] = useState<Record<string, Partial<Perfil>>>({});
  const [revisando, setRevisando] = useState<Grupo | null>(null);
  const sincronizados = it.perfiles.filter(p => fuentes.some(f => p.modulos.includes(f)));
  // Con una sincronización hecha se ve su detalle; la selección aparece solo al pedir «Sincronizar de nuevo».
  const pendientes = it.perfilesPendientes(m);
  const seleccion = conectado && (!c.ultimaSync || eligiendo || pendientes.length > 0);
  const grupos = seleccion ? agrupar(fuentes, it.perfiles) : [];
  // Los elegidos con datos distintos se revisan antes de sincronizar, para decidir qué dato queda en el MAN.
  const porRevisar = grupos.filter(g => s.tiene(g.id) && faltaRevisar(g, revisados)).length;
  const sincronizar = () => { it.sincronizar(fuentes, s.sel, revisados); s.limpiar(); setRevisados({}); setEligiendo(false); };
  const acciones = seleccion ? <>
    {eligiendo ? <Button variant="secondary" onClick={() => { setEligiendo(false); s.limpiar(); }}>Cancelar</Button>
      : pendientes.length > 0 && <Button variant="secondary" onClick={() => it.omitirPerfiles(m)}>Omitir por ahora</Button>}
    {porRevisar > 0 && <span role="status" style={{ fontSize: 12, color: C.n700, fontFamily: FONT }}>Revisa los datos de {porRevisar} {porRevisar === 1 ? 'perfil elegido' : 'perfiles elegidos'}</span>}
    <Button disabled={!s.n || porRevisar > 0} onClick={sincronizar}>Sincronizar {s.n} {s.n === 1 ? 'perfil' : 'perfiles'}</Button>
  </> : conectado && c.ultimaSync ? <OutlineButton onClick={() => setEligiendo(true)}>Sincronizar de nuevo</OutlineButton> : null;

  return (
    <TarjetaPaso n={n} titulo="Perfiles compartidos" hecho={(!!c.ultimaSync || !!c.perfilesOmitido) && !pendientes.length} listo={c.ultimaSync ? 'Listo' : 'Omitido'} pendiente="Sin sincronizar" acciones={acciones}>
      {!conectado && <span style={{ fontSize: 12.5, color: C.n700, fontFamily: FONT }}>Disponible al conectar el módulo.</span>}
      {conectado && fuentes.length > 1 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.n700, fontFamily: FONT }}>Perfiles de {fuentes.map(f => <ChipModulo key={f} m={f} />)}</span>
      )}
      {conectado && !seleccion && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT }}>
          <span style={{ fontSize: 12.5, color: C.n900 }}>
            Sincronizados el {fmtFH(c.ultimaSync)}: {sincronizados.length} perfiles de {fuentes.map(nombreModulo).join(' y ')} en el MAN · <LinkButton onClick={() => router.push(`/perfiles?modulo=${m}`)}>Ver en Perfiles</LinkButton>
          </span>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            <Tabla headers={['Perfil', 'Roles', 'Correo']}>
              {sincronizados.map(p => (
                <Fila key={p.id}>
                  <Celda style={{ whiteSpace: 'normal' }}>{p.nombre} <span style={{ fontSize: 11.5, color: C.n700 }}>· {p.identificacion}</span></Celda>
                  <Celda><span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>{p.roles.map(r => <Insignia key={r} label={r} color="brand" />)}</span></Celda>
                  <Celda muted>{p.correo || '—'}</Celda>
                </Fila>
              ))}
            </Tabla>
          </div>
        </div>
      )}
      {seleccion && (
        <>
          <UnificarPerfiles grupos={grupos} fuentes={fuentes} s={s} revisados={revisados} onRevisar={setRevisando} />
          {revisando && <RevisarUnion g={revisando} inicial={revisados[revisando.id]} onClose={() => setRevisando(null)}
            onConfirmar={cambios => { setRevisados({ ...revisados, [revisando.id]: cambios }); if (!s.tiene(revisando.id)) s.alternar(revisando.id); setRevisando(null); }} />}
        </>
      )}
    </TarjetaPaso>
  );
}
