'use client';
// Estructura › Servidores: cada servidor (una terminal de tipo Servidor y su puerto remoto) y los servicios que corre,
// automáticos (por su frecuencia) o manuales (a pedido). Los servicios se crean en Servicios.
import { useState } from 'react';
import { AccionesEnHeader } from '@/components/layout/Pantalla';
import { C, FONT } from '@/components/suite/tokens';
import { Button, Input, Select, Switch } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Campo, Celda, ConfigCard, Fila, FilaVacia, Grid, IcEdit, IcTrash, IconButton, LinkButton, ModalBase, Tabla, uid, useConfirmar, Paginacion, usePaginado } from '@/components/kit';
import { useDato } from '../../store';
import { ChipModulo } from '../../piezas';
import type { ModoServicio, Servicio, Servidor, Terminal } from '../../tipos';
import { useCrearEnEscritorio } from '@/components/layout/SoloEscritorio';

export default function Servidores() {
  const enEscritorio = useCrearEnEscritorio();
  const [l, set] = useDato('servidores');
  const [terminales] = useDato('terminales');
  const [servicios] = useDato('servicios');
  const [editando, setEditando] = useState<Servidor | null>(null);
  const { pedir, dialogo } = useConfirmar();
  const nombreTerminal = (id: string) => terminales.find(t => t.id === id)?.nombre ?? 'Sin terminal';
  const pag = usePaginado(l, 10);
  const guardar = (s: Servidor) => { set(l.some(x => x.id === s.id) ? l.map(x => (x.id === s.id ? s : x)) : [...l, s]); setEditando(null); };
  const sinServidor = servicios.filter(s => s.activo && !l.some(x => x.servicios.some(a => a.servicio === s.id)));
  const cuenta = (s: Servidor, m: ModoServicio) => s.servicios.filter(a => a.modo === m).length;

  return (
    <ConfigCard title="Servidores">
      <AccionesEnHeader>
        <Button icon={<IcPlus size={12} />} onClick={enEscritorio(() => setEditando({ id: uid(), descripcion: '', terminal: '', puerto: 1001, activo: true, servicios: [] }))}>Nuevo servidor</Button>
      </AccionesEnHeader>
      <Tabla headers={['Descripción', 'Terminal', 'Puerto remoto', 'Servicios', 'Activo', '']} anchos={{ 2: 120, 4: 70, 5: 70 }} alinearDerecha={[2, 5]}>
        {pag.visibles.length === 0 && <FilaVacia cols={6} texto="Todavía no hay servidores. Usa «Nuevo servidor»." />}
        {pag.visibles.map(s => (
          <Fila key={s.id}>
            <Celda><LinkButton onClick={() => setEditando(s)}>{s.descripcion}</LinkButton></Celda>
            <Celda muted>{nombreTerminal(s.terminal)}</Celda>
            <Celda derecha>{s.puerto}</Celda>
            <Celda>{cuenta(s, 'Automático')} {cuenta(s, 'Automático') === 1 ? 'automático' : 'automáticos'} · {cuenta(s, 'Manual')} {cuenta(s, 'Manual') === 1 ? 'manual' : 'manuales'}</Celda>
            <Celda><Switch checked={s.activo} onChange={b => set(l.map(x => (x.id === s.id ? { ...x, activo: b } : x)))} label={<span className="sr-only">Activo</span>} /></Celda>
            <Celda derecha>
              <span style={{ display: 'inline-flex', gap: 2 }}>
                <IconButton label={`Editar ${s.descripcion}`} onClick={() => setEditando(s)}><IcEdit /></IconButton>
                <IconButton label={`Eliminar ${s.descripcion}`} tono="peligro" onClick={() => pedir('Eliminar servidor', `¿Eliminar «${s.descripcion}»? Sus servicios quedarán sin servidor.`, () => set(l.filter(x => x.id !== s.id)))}><IcTrash /></IconButton>
              </span>
            </Celda>
          </Fila>
        ))}
      </Tabla>
      <Paginacion pag={pag} />
      {sinServidor.length > 0 && <span style={{ fontSize: 12, color: C.n700 }}>Servicios activos sin servidor: {sinServidor.map(s => s.nombre).join(', ')}.</span>}
      {editando && <EditarServidor inicial={editando} terminales={terminales} servicios={servicios} onClose={() => setEditando(null)} onGuardar={guardar} />}
      {dialogo}
    </ConfigCard>
  );
}

function EditarServidor({ inicial, terminales, servicios, onClose, onGuardar }: {
  inicial: Servidor; terminales: Terminal[]; servicios: Servicio[]; onClose: () => void; onGuardar: (s: Servidor) => void;
}) {
  const [s, setS] = useState(inicial);
  const nuevo = !inicial.descripcion;
  const modo = (id: string) => s.servicios.find(a => a.servicio === id)?.modo ?? '';
  const cambiar = (id: string, m: string) => setS({ ...s, servicios: m ? [...s.servicios.filter(a => a.servicio !== id), { servicio: id, modo: m as ModoServicio }] : s.servicios.filter(a => a.servicio !== id) });
  const valido = s.descripcion.trim() && s.terminal && s.puerto > 0;
  return (
    <ModalBase titulo={nuevo ? 'Nuevo servidor' : s.descripcion || 'Servidor'} onClose={onClose} ancho={720}
      pie={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!valido} onClick={() => onGuardar({ ...s, descripcion: s.descripcion.trim() })}>Guardar</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: FONT }}>
        <Grid cols={3}>
          <Campo label="Descripción" required><Input value={s.descripcion} onChange={v => setS({ ...s, descripcion: v })} placeholder="Ej: Servidor de aplicaciones" /></Campo>
          <Campo label="Terminal" required>
            <Select value={s.terminal} onChange={v => setS({ ...s, terminal: v })}
              options={[{ value: '', label: 'Seleccionar' }, ...terminales.filter(t => t.tipo === 'Servidor' && t.activo).map(t => ({ value: t.id, label: t.nombre }))]} />
          </Campo>
          <Campo label="Puerto remoto" required><Input type="number" value={s.puerto} onChange={v => setS({ ...s, puerto: Number(v) || 0 })} /></Campo>
        </Grid>
        <Switch checked={s.activo} onChange={b => setS({ ...s, activo: b })} label="Servidor activo" />
        <Tabla headers={['Servicio', 'Módulo', 'Base de datos', 'Corre en este servidor']} anchos={{ 1: 80, 3: 190 }}>
          {servicios.length === 0 && <FilaVacia cols={4} texto="No hay servicios. Créalos en Estructura › Servicios." />}
          {servicios.map(x => (
            <Fila key={x.id}>
              <Celda>{x.nombre}</Celda>
              <Celda><ChipModulo m={x.modulo} /></Celda>
              <Celda muted>{x.base}</Celda>
              <Celda>
                <label style={{ display: 'block' }}>
                  <span className="sr-only">Modo de {x.nombre}</span>
                  <Select value={modo(x.id)} onChange={m => cambiar(x.id, m)} options={[{ value: '', label: 'No corre aquí' }, { value: 'Automático', label: 'Automático' }, { value: 'Manual', label: 'Manual' }]} />
                </label>
              </Celda>
            </Fila>
          ))}
        </Tabla>
      </div>
    </ModalBase>
  );
}
