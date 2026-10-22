'use client';
import { useEffect, useState } from 'react';
import { conContabilidad } from '@/lib/modulosCliente';
import { PageHeader, C, Button, DataTable, DataRow, Td, StatusBadge, Modal, FormField, Input, Select, Switch } from '@/components/ui/primitives';
import { IcTrash, IcEdit } from '@/components/ui/icons';
import { CuentaCampo } from './CuentaPicker';
import InfoTooltip from './InfoTooltip';
import { useListaFiltrable } from '@/components/ui/ListaFiltrable';
import { usePermisos } from '@/lib/permisosCliente';

export interface Impuesto {
  id: string; nombre: string; tipo: string; porcentaje: number;
  impuesto_acreditable: number; descripcion: string; activo: number; cuenta?: string; codigo_otro?: string;
}

const TIPOS = ['IVA', 'Renta', 'Otro'];

export default function ImpuestosPage({ hideHeader, addSignal }: { hideHeader?: boolean; addSignal?: number } = {}) {
  const { puede } = usePermisos();
  const [items, setItems] = useState<Impuesto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [porcentaje, setPorcentaje] = useState('');
  const [acreditable, setAcreditable] = useState(true);
  const [descripcion, setDescripcion] = useState('');
  const [cuenta, setCuenta] = useState('');
  const [codigoOtro, setCodigoOtro] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Carga con contador de versión: `cargar()` pide recargar y el efecto
  // hace el fetch (sin setState síncrono dentro del efecto).
  const [version, setVersion] = useState(0);
  const cargar = () => setVersion(v => v + 1);
  useEffect(() => {
    let vivo = true;
    fetch('/api/impuestos').then(r => r.json()).then(d => { if (vivo) { setItems(d); setCargando(false); } }).catch(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [version]);

  // Señal del botón «+» del encabezado: se atiende al cambiar (durante el
  // render, como recomienda React para derivar de props).
  const [senal, setSenal] = useState(addSignal);
  if (addSignal !== senal) { setSenal(addSignal); if (addSignal) { abrirNuevo(); } }

  function abrirNuevo() {
    setEditId(null); setNombre(''); setTipo(TIPOS[0]); setPorcentaje(''); setAcreditable(true); setDescripcion(''); setCuenta(''); setCodigoOtro(''); setError(null);
    setOpen(true);
  }
  function abrirEditar(i: Impuesto) {
    setEditId(i.id); setNombre(i.nombre); setTipo(i.tipo || TIPOS[0]); setPorcentaje(String(i.porcentaje)); setAcreditable(Boolean(i.impuesto_acreditable)); setDescripcion(i.descripcion); setCuenta(i.cuenta ?? ''); setCodigoOtro(i.codigo_otro ?? '');
    setError(null); setOpen(true);
  }

  async function guardar() {
    if (!nombre.trim()) { setError('Escribe el nombre.'); return; }
    if (tipo === 'Otro' && !codigoOtro.trim()) { setError('Indica qué impuesto es.'); return; }
    if (!cuenta && conContabilidad()) { setError('Elige la cuenta contable del impuesto.'); return; }
    setGuardando(true);
    const body = JSON.stringify({ nombre, tipo, porcentaje: Number(porcentaje) || 0, impuestoAcreditable: acreditable, descripcion, cuenta, codigoOtro: tipo === 'Otro' ? codigoOtro : '' });
    if (editId) {
      await fetch(`/api/impuestos/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
    } else {
      await fetch('/api/impuestos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    }
    setGuardando(false);
    setOpen(false);
    cargar();
  }
  async function eliminar(id: string) {
    setItems(is => is.filter(i => i.id !== id));
    await fetch(`/api/impuestos/${id}`, { method: 'DELETE' });
  }
  async function toggleActivo(i: Impuesto, valor: boolean) {
    setItems(is => is.map(x => x.id === i.id ? { ...x, activo: valor ? 1 : 0 } : x));
    await fetch(`/api/impuestos/${i.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: valor }) });
  }

  const lista = useListaFiltrable({
    items, texto: i => `${i.nombre} ${i.tipo} ${i.descripcion}`, placeholder: 'Buscar por nombre, tipo o descripción',
    defs: [
      { tipo: 'lista', clave: 'tipo', label: 'Tipo', opciones: [...new Set(items.map(i => i.tipo || 'Otro'))].map(v => ({ value: v, label: v })), valor: i => i.tipo || 'Otro' },
      { tipo: 'check', clave: 'acreditables', label: 'Solo acreditables', cumple: i => Boolean(Number(i.impuesto_acreditable)) },
      { tipo: 'check', clave: 'activos', label: 'Solo activos', cumple: i => Boolean(Number(i.activo)) },
    ],
    derecha: <InfoTooltip text="Estos impuestos aparecen al agregar líneas a una factura. «Acreditable» indica que el IVA pagado en compras se puede usar como crédito fiscal." />,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!hideHeader && <PageHeader title="Impuestos"><Button onClick={abrirNuevo}>+ Nuevo impuesto</Button></PageHeader>}
      {lista.barra}
      {lista.chips}
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {cargando ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p> : (
          <DataTable headers={['Nombre', 'Tipo', 'Porcentaje', 'Impuesto acreditable', ...(conContabilidad() ? ['Cuenta contable'] : []), 'Descripción', 'Activo', '']}>
            {lista.filasPagina.map(i => (
              <DataRow key={i.id}>
                <Td>{i.nombre}</Td>
                <Td muted>{i.tipo}</Td>
                <Td>{i.porcentaje}%</Td>
                <Td><StatusBadge label={i.impuesto_acreditable ? 'Sí' : 'No'} color={i.impuesto_acreditable ? 'green' : 'gray'} /></Td>
                {conContabilidad() && <Td>{i.cuenta || (i.porcentaje > 0 ? <span style={{ color: C.error, fontSize: 11.5 }}>Sin cuenta</span> : <span style={{ color: C.n700 }}>No aplica</span>)}</Td>}
                <Td muted>{i.descripcion}</Td>
                <Td><Switch checked={Boolean(i.activo)} onChange={v => toggleActivo(i, v)} /></Td>
                <Td right>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {puede('fe.config.impuestos.editar') && <button title="Editar" onClick={() => abrirEditar(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'inline-flex', padding: 4 }}><IcEdit className="w-3.5 h-3.5" /></button>}
                    {puede('fe.config.impuestos.eliminar') && <button title="Eliminar" onClick={() => eliminar(i.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, display: 'inline-flex', padding: 4 }}><IcTrash className="w-4 h-4" /></button>}
                  </div>
                </Td>
              </DataRow>
            ))}
            {lista.filtrados.length === 0 && (
              <DataRow><Td colSpan={7}>
                {lista.vacio('Todavía no hay impuestos registrados. Usa "+ Nuevo impuesto" para empezar.')}
              </Td></DataRow>
            )}
          </DataTable>
        )}
      </div>

      {!cargando && lista.paginacion}
      <Modal open={open} title={editId ? 'Editar impuesto' : 'Nuevo impuesto'} onClose={() => setOpen(false)}
        footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
        </div>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ fontSize: 12, color: C.error, background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
          <FormField label="Nombre" required><Input value={nombre} onChange={setNombre} placeholder="Nombre del impuesto" /></FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="Tipo"><Select value={tipo} onChange={setTipo} options={TIPOS.map(t => ({ value: t, label: t }))} /></FormField>
            <FormField label="Porcentaje"><Input value={porcentaje} onChange={setPorcentaje} type="number" placeholder="0%" /></FormField>
          </div>
          {tipo === 'Otro' && <FormField label="¿Qué impuesto es?" required hint="Código de Hacienda para este impuesto."><Input value={codigoOtro} onChange={setCodigoOtro} placeholder="Ej. Impuesto municipal de hospedaje" /></FormField>}
          <CuentaCampo titulo="Cuenta contable del impuesto" value={cuenta} onChange={setCuenta} grupoInicial={acreditable ? '1' : '2'} />
          <Switch checked={acreditable} onChange={setAcreditable} label="Acreditable (el IVA de las compras da crédito fiscal)" />
          <FormField label="Descripción" hint="Opcional"><Input value={descripcion} onChange={setDescripcion} /></FormField>
        </div>
      </Modal>
    </div>
  );
}
