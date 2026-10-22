'use client';
// Estructura › Terminales PinPad: proveedores (Credomatic, BCR…) y sus terminales de tarjeta.
// Proveedores en una lista fija a la izquierda (con buscador y scroll propio) y, a la derecha, el proveedor elegido con sus terminales; contraseña oculta, impresora elegida de la lista y prueba de conexión por terminal.
import { useState } from 'react';
import { AccionesEnHeader } from '@/components/layout/Pantalla';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Input, SearchInput, Select, Switch } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { useDato, useOperacion } from '../../store';
import { Campo, Celda, ConfigCard, Fila, FilaVacia, Grid, IcEdit, IcTrash, IconButton, ModalBase, OutlineButton, Tabla, norm, uid, useConfirmar } from '@/components/kit';
import { EstadoConexionChip, useProbarConexion } from '../../piezas';
import type { ProveedorPinPad, TerminalPinPad } from '../../tipos';
import { useCrearEnEscritorio } from '@/components/layout/SoloEscritorio';

export default function PinPad() {
  const enEscritorio = useCrearEnEscritorio();
  const [l, set] = useDato('pinpad');
  const [impresoras] = useDato('impresoras');
  const [selId, setSelId] = useState(l[0]?.id ?? '');
  const { pedir, dialogo } = useConfirmar();
  const [editando, setEditando] = useState<TerminalPinPad | null>(null);
  const [q, setQ] = useState('');
  const lista = l.filter(p => !q || norm(`${p.codigo} ${p.descripcion}`).includes(norm(q)));
  const sel = l.find(p => p.id === selId);
  // El resultado de probar una terminal no queda como cambio pendiente de guardar.
  const operar = useOperacion('pinpad');
  const patch = (p: Partial<ProveedorPinPad>) => set(l.map(x => (x.id === selId ? { ...x, ...p } : x)));
  const { probar, probando } = useProbarConexion((id, estado) => operar(prev => prev.map(p => ({ ...p, terminales: p.terminales.map(t => (t.id === id ? { ...t, estado } : t)) }))));
  const nuevoProveedor = () => {
    const id = uid();
    const codigo = String(Math.max(0, ...l.map(p => Number(p.codigo) || 0)) + 1).padStart(2, '0');
    set([...l, { id, codigo, descripcion: 'Nuevo proveedor', activo: true, terminales: [] }]);
    setSelId(id);
  };
  const agregarTerminal = () => setEditando({ id: uid(), nombre: '', descripcion: '', importeMax: 0, terminal: '', api: '', contrasena: '', impresora: '', estado: 'Sin probar' });
  const guardarTerminal = (t: TerminalPinPad) => {
    if (!sel) return;
    patch({ terminales: sel.terminales.some(x => x.id === t.id) ? sel.terminales.map(x => (x.id === t.id ? t : x)) : [...sel.terminales, t] });
    setEditando(null);
  };

  return (
    <div className="maestro-detalle" style={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: 16, alignItems: 'start', fontFamily: FONT }}>
      <AccionesEnHeader><Button icon={<IcPlus size={12} />} onClick={enEscritorio(nuevoProveedor)}>Nuevo proveedor</Button></AccionesEnHeader>
      <nav aria-label="Proveedores" className="lista-lateral" style={{ position: 'sticky', top: 0, maxHeight: 'calc(100vh - 190px)', minHeight: 0, background: C.n000,
        border: `1px solid ${C.n500}`, borderRadius: radius.card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: C.n900 }}>Proveedores</span>
          <SearchInput value={q} onChange={setQ} placeholder="Buscar proveedor" width="100%" />
        </div>
        <div style={{ overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {lista.length === 0 && <span style={{ fontSize: 12, color: C.n700, padding: '8px 10px' }}>Sin resultados.</span>}
          {lista.map(p => {
            const on = p.id === sel?.id;
            return (
              <button key={p.id} type="button" onClick={() => setSelId(p.id)} aria-current={on ? 'true' : undefined}
                style={{ textAlign: 'left', padding: '9px 12px', borderRadius: radius.md, border: `1px solid ${on ? C.brandBd : 'transparent'}`, background: on ? C.brandBg : 'transparent',
                  cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 12.5, color: on ? C.brand : C.n900, fontWeight: on ? 500 : 400 }}>{p.codigo} · {p.descripcion}</span>
                <span style={{ fontSize: 11.5, color: C.n700 }}>{p.activo ? p.terminales.length : 'Inactivo'}</span>
              </button>
            );
          })}
        </div>
      </nav>
      {sel ? (
        <ConfigCard title={sel.descripcion}
          actions={<IconButton label={`Eliminar ${sel.descripcion}`} tono="peligro" onClick={() => pedir('Eliminar proveedor', `¿Eliminar «${sel.descripcion}» y sus ${sel.terminales.length} terminales?`, () => { set(l.filter(p => p.id !== sel.id)); setSelId(l.find(p => p.id !== sel.id)?.id ?? ''); })}><IcTrash /></IconButton>}>
          <Grid cols={4}>
            <Campo label="Código"><Input value={sel.codigo} onChange={v => patch({ codigo: v })} /></Campo>
            <Campo label="Descripción" style={{ gridColumn: 'span 2' }}><Input value={sel.descripcion} onChange={v => patch({ descripcion: v })} /></Campo>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}><Switch checked={sel.activo} onChange={b => patch({ activo: b })} label="Activo" /></div>
          </Grid>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500, marginRight: 'auto' }}>Terminales</span>
            <OutlineButton icon={<IcPlus size={12} />} onClick={enEscritorio(agregarTerminal)}>Agregar terminal</OutlineButton>
          </div>
          <Tabla headers={['Nombre', 'Máx. sin firma', 'Terminal', 'Impresora', 'Conexión', '']} alinearDerecha={[1, 5]}>
            {sel.terminales.length === 0 && <FilaVacia cols={6} texto="Este proveedor no tiene terminales. Usa «Agregar terminal»." />}
            {sel.terminales.map(t => (
              <Fila key={t.id}>
                <Celda><b style={{ fontWeight: 500 }}>{t.nombre || 'Sin nombre'}</b>{t.descripcion && <span style={{ display: 'block', fontSize: 11.5, color: C.n700 }}>{t.descripcion}</span>}</Celda>
                <Celda derecha>₡{t.importeMax.toLocaleString('es-CR')}</Celda>
                <Celda muted>{t.terminal}</Celda>
                <Celda muted>{impresoras.find(i => i.id === t.impresora)?.nombre ?? 'Sin impresora'}</Celda>
                <Celda><EstadoConexionChip estado={probando(t.id) ? 'Probando' : t.estado} /></Celda>
                <Celda derecha>
                  <span style={{ display: 'inline-flex', gap: 6 }}>
                    <OutlineButton disabled={probando(t.id)} onClick={() => probar(t.id, t.terminal && t.api)}>Probar</OutlineButton>
                    <IconButton label={`Editar ${t.nombre || 'terminal'}`} onClick={() => setEditando(t)}><IcEdit /></IconButton>
                    <IconButton label="Eliminar terminal" tono="peligro" onClick={() => pedir('Eliminar terminal', `¿Eliminar la terminal ${t.nombre || 'sin nombre'}?`, () => patch({ terminales: sel.terminales.filter(x => x.id !== t.id) }))}><IcTrash /></IconButton>
                  </span>
                </Celda>
              </Fila>
            ))}
          </Tabla>
        </ConfigCard>
      ) : <ConfigCard title="Sin proveedores" subtitle="Registra uno con «Nuevo proveedor»."><span /></ConfigCard>}
      {editando && <EditarTerminal t={editando} impresoras={impresoras.filter(i => i.activa).map(i => ({ value: i.id, label: i.nombre }))} onClose={() => setEditando(null)} onGuardar={guardarTerminal} />}
      {dialogo}
    </div>
  );
}

function EditarTerminal({ t, impresoras, onClose, onGuardar }: { t: TerminalPinPad; impresoras: { value: string; label: string }[]; onClose: () => void; onGuardar: (t: TerminalPinPad) => void }) {
  const [f, setF] = useState({ ...t, contrasena: '' });
  const nueva = !t.nombre;
  return (
    <ModalBase titulo={nueva ? 'Nueva terminal' : `Terminal ${t.nombre}`} onClose={onClose} ancho={600}
      pie={<><Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={!f.nombre.trim() || !f.terminal.trim()} onClick={() => onGuardar({ ...f, nombre: f.nombre.trim(), contrasena: f.contrasena || t.contrasena, estado: 'Sin probar' })}>Guardar</Button></>}>
      <Grid cols={2}>
        <Campo label="Nombre" required><Input value={f.nombre} onChange={v => setF({ ...f, nombre: v })} placeholder="Ej: BAC-REC-01" /></Campo>
        <Campo label="Descripción"><Input value={f.descripcion} onChange={v => setF({ ...f, descripcion: v })} placeholder="Ej: Recepción" /></Campo>
        <Campo label="Número de terminal" required><Input value={f.terminal} onChange={v => setF({ ...f, terminal: v })} /></Campo>
        <Campo label="Importe máximo sin firma (₡)"><Input type="number" value={f.importeMax} onChange={v => setF({ ...f, importeMax: Number(v) || 0 })} /></Campo>
        <Campo label="Dirección de la API" style={{ gridColumn: '1 / -1' }}><Input value={f.api} onChange={v => setF({ ...f, api: v })} placeholder="https://" /></Campo>
        <Campo label="Contraseña" hint={nueva ? undefined : 'Déjala vacía para conservar la actual.'}><Input type="password" value={f.contrasena} onChange={v => setF({ ...f, contrasena: v })} /></Campo>
        <Campo label="Impresora del comprobante"><Select value={f.impresora} onChange={v => setF({ ...f, impresora: v })} options={[{ value: '', label: 'Sin impresora' }, ...impresoras]} /></Campo>
      </Grid>
    </ModalBase>
  );
}
