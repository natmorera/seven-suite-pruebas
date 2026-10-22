'use client';
// Cajas / Terminales: dónde se emite. El consecutivo de Hacienda es
// sucursal (3) + terminal (5) + tipo de documento (2) + número (10), y cada
// tipo lleva su propio contador por terminal. En el MVP hay una sola
// sucursal (001), así que solo se elige el número de terminal.
import { Fragment, useEffect, useState } from 'react';
import { PageHeader, C, FONT, Button, DataTable, DataRow, Td, Switch, Modal, FormField, Input, Radio, radius, Select } from '@/components/ui/primitives';
import { IcTrash, IcEdit } from '@/components/ui/icons';
import InfoTooltip from './InfoTooltip';
import { useListaFiltrable } from '@/components/ui/ListaFiltrable';
import { tiposNumeracion } from '@/data/catalogosHacienda';
import { usePermisos } from '@/lib/permisosCliente';
import { esGuatemalaActual } from '@/lib/paisActual';

interface CajaRow {
  id: string; sucursal: string; terminal: string; nombre: string; emisor_id: string;
  consecutivo_actual: number; activa: number; numeracion_continuada: number;
}
interface Sucursal { codigo: string; nombre: string }
type NumeracionPorTipo = { tipo_documento: string; consecutivo_actual: number }[];

export interface FormCaja { terminal: string; nombre: string; numeracionModo: 'cero' | 'continuar'; numeracion: Record<string, string> }
const FORM_INICIAL: FormCaja = { terminal: '', nombre: '', numeracionModo: 'cero', numeracion: {} };
// Guatemala: las compras no llevan acuse en FEL, solo se numeran los documentos
const grupos = () => (esGuatemalaActual() ? ['Comprobantes'] as const : ['Comprobantes', 'Acuses de compras'] as const);

// Tabla de «próximo número» por tipo de documento (alta y edición).
export function TablaNumeracion({ valores, onCambiar, actuales }: {
  valores: Record<string, string>; onCambiar: (tipo: string, v: string) => void; actuales?: Record<string, number>;
}) {
  return (
    <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: FONT }}>
        <thead>
          <tr style={{ background: C.n200, color: C.n700, fontSize: 11 }}>
            <th style={{ textAlign: 'left', padding: '7px 12px', fontWeight: 500, width: 44 }}>Cód.</th>
            <th style={{ textAlign: 'left', padding: '7px 12px', fontWeight: 500 }}>Tipo de documento</th>
            {actuales && <th style={{ textAlign: 'right', padding: '7px 12px', fontWeight: 500, width: 90 }}>Emitidos</th>}
            <th style={{ textAlign: 'left', padding: '7px 12px', fontWeight: 500, width: 150 }}>Próximo número</th>
          </tr>
        </thead>
        <tbody>
          {grupos().map(g => (
            <Fragment key={g}>
              <tr><td colSpan={actuales ? 4 : 3} style={{ padding: '6px 12px', fontSize: 10.5, color: C.n700, background: C.n200, borderTop: `1px solid ${C.n500}` }}>{g}</td></tr>
              {tiposNumeracion().filter(t => t.grupo === g).map(t => (
                <tr key={t.tipo} style={{ borderTop: `1px solid ${C.n500}` }}>
                  <td style={{ padding: '4px 12px', color: C.n700, fontVariantNumeric: 'tabular-nums' }}>{t.codigo}</td>
                  <td style={{ padding: '4px 12px' }}>{t.tipo}</td>
                  {actuales && <td style={{ padding: '4px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: C.n700 }}>{actuales[t.tipo] ?? 0}</td>}
                  <td style={{ padding: '4px 12px' }}>
                    <Input value={valores[t.tipo] ?? ''} maxLength={10} inputMode="numeric" placeholder="1"
                      onChange={v => onCambiar(t.tipo, v.replace(/\D/g, '').slice(0, 10))} />
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Campos de una caja / terminal: los mismos en Configuración › Cajas y en el
// asistente inicial. «sucursal» es el control que muestra o elige la sucursal.
export function CamposCaja({ form, patch, nueva, sucursal, hintSucursal }: {
  form: FormCaja; patch: (p: Partial<FormCaja>) => void; nueva: boolean; sucursal: React.ReactNode; hintSucursal?: string;
}) {
  return <>
    <FormField label="Nombre" required hint="Ej. Recepción principal, Restaurante">
      <Input value={form.nombre} onChange={v => patch({ nombre: v })} placeholder="Recepción principal" />
    </FormField>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <FormField label="Sucursal" hint={hintSucursal}>{sucursal}</FormField>
      <FormField label="Número de terminal" hint="Hasta 5 dígitos">
        <Input value={form.terminal} maxLength={5} inputMode="numeric" onChange={v => patch({ terminal: v.replace(/\D/g, '').slice(0, 5) })} />
      </FormField>
    </div>
    {nueva && (
      <div>
        <b style={{ fontSize: 13 }}>Numeración de los documentos</b>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <Radio label="Todos los tipos empiezan en 1 (terminal nueva)" checked={form.numeracionModo === 'cero'} onChange={() => patch({ numeracionModo: 'cero' })} name="numeracion" />
          <Radio label="Ya emitía en otro sistema: indicar el próximo número de cada tipo" checked={form.numeracionModo === 'continuar'} onChange={() => patch({ numeracionModo: 'continuar' })} name="numeracion" />
        </div>
        {form.numeracionModo === 'continuar' && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 11.5, color: C.n700, margin: 0 }}>Si dejas un campo vacío, ese tipo empieza en 1.{esGuatemalaActual() ? '' : ' Los acuses de compras también llevan su propio número.'}</p>
            <TablaNumeracion valores={form.numeracion} onCambiar={(tipo, v) => patch({ numeracion: { ...form.numeracion, [tipo]: v } })} />
          </div>
        )}
      </div>
    )}
  </>;
}

export default function CajasPage({ hideHeader, addSignal }: { hideHeader?: boolean; addSignal?: number } = {}) {
  const { puede } = usePermisos();
  const [cajas, setCajas] = useState<CajaRow[]>([]);
  const [sucursal, setSucursal] = useState<Sucursal>({ codigo: '001', nombre: 'Casa matriz' });
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [numeracionCaja, setNumeracionCaja] = useState<CajaRow | null>(null);
  const [numeracionValores, setNumeracionValores] = useState<Record<string, string>>({});
  const [numeracionActual, setNumeracionActual] = useState<Record<string, number>>({});

  const [version, setVersion] = useState(0);
  const cargar = () => setVersion(v => v + 1);
  useEffect(() => {
    let vivo = true;
    Promise.all([fetch('/api/cajas').then(r => r.json()), fetch('/api/sucursales').then(r => r.json()).catch(() => [])]).then(([cajasData, sucs]: [CajaRow[], Sucursal[]]) => {
      if (!vivo) return;
      setCajas(cajasData);
      const activas = sucs.filter(x => Number((x as Sucursal & { activa?: number }).activa ?? 1) === 1);
      setSucursales(activas.map(x => ({ codigo: x.codigo, nombre: x.nombre })));
      const s = activas.find(x => x.codigo === '001') ?? activas[0];
      if (s) setSucursal({ codigo: s.codigo, nombre: s.nombre });
      setCargando(false);
    });
    return () => { vivo = false; };
  }, [version]);

  const siguienteTerminal = () => String(Math.max(0, ...cajas.filter(c => c.sucursal === sucursal.codigo).map(c => Number(c.terminal) || 0)) + 1).padStart(5, '0');

  // Señal del botón «+» del encabezado: se atiende al cambiar (durante el render).
  const [senal, setSenal] = useState(addSignal);
  if (addSignal !== senal) { setSenal(addSignal); if (addSignal) { abrirNuevo(); } }

  function abrirNuevo() {
    setEditId(null); setError(null);
    setForm({ ...FORM_INICIAL, terminal: siguienteTerminal() });
    setOpen(true);
  }
  function abrirEditar(c: CajaRow) {
    setEditId(c.id); setError(null);
    setSucursal(sucursales.find(x => x.codigo === c.sucursal) ?? { codigo: c.sucursal, nombre: '' });
    setForm({ ...FORM_INICIAL, terminal: c.terminal, nombre: c.nombre });
    setOpen(true);
  }

  async function guardar() {
    const terminal = (form.terminal || '1').padStart(5, '0');
    if (cajas.some(c => c.id !== editId && c.sucursal === sucursal.codigo && c.terminal === terminal)) { setError(`Ya existe la terminal ${terminal} en la sucursal ${sucursal.codigo}.`); return; }
    if (editId) {
      await fetch(`/api/cajas/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: form.nombre, terminal }) });
    } else {
      await fetch('/api/cajas', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: form.nombre, sucursal: sucursal.codigo, terminal, numeracion: form.numeracionModo === 'continuar' ? form.numeracion : {} }) });
    }
    setOpen(false);
    cargar();
  }
  async function eliminar(c: CajaRow) {
    if (!window.confirm(`¿Eliminar la caja «${c.nombre}» (terminal ${c.terminal})?`)) return;
    setCajas(cs => cs.filter(x => x.id !== c.id));
    await fetch(`/api/cajas/${c.id}`, { method: 'DELETE' });
  }
  async function toggleActiva(id: string, activa: boolean) {
    setCajas(cs => cs.map(c => c.id === id ? { ...c, activa: activa ? 1 : 0 } : c));
    await fetch(`/api/cajas/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activa }) });
  }

  async function abrirNumeracion(c: CajaRow) {
    setNumeracionCaja(c);
    const datos: NumeracionPorTipo = await fetch(`/api/cajas/${c.id}`).then(r => r.json());
    const valores: Record<string, string> = {};
    const actuales: Record<string, number> = {};
    for (const t of tiposNumeracion()) {
      const fila = datos.find(d => d.tipo_documento === t.tipo);
      actuales[t.tipo] = Number(fila?.consecutivo_actual ?? 0);
      valores[t.tipo] = String(actuales[t.tipo] + 1);
    }
    setNumeracionValores(valores); setNumeracionActual(actuales);
  }
  async function guardarNumeracion() {
    if (!numeracionCaja) return;
    await fetch(`/api/cajas/${numeracionCaja.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numeracion: numeracionValores }) });
    setNumeracionCaja(null);
    cargar();
  }

  const lista = useListaFiltrable({
    items: cajas, texto: c => `${c.nombre} ${c.sucursal} ${c.terminal}`, placeholder: 'Buscar por nombre o número de terminal',
    defs: [{ tipo: 'check', clave: 'activas', label: 'Solo activas', cumple: c => Boolean(Number(c.activa)) }],
    derecha: <InfoTooltip text="El número de cada comprobante tiene 20 dígitos: sucursal (3), terminal (5), tipo de documento (2) y consecutivo (10). Cada tipo de documento lleva su propio consecutivo en cada terminal." />,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!hideHeader && (
        <PageHeader title="Cajas / Terminales">
          <Button onClick={abrirNuevo}>+ Nueva caja / terminal</Button>
        </PageHeader>
      )}

      {lista.barra}
      {lista.chips}

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {cargando ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p> : (
          <DataTable headers={['Nombre', 'Sucursal', 'Terminal', 'Próx. factura', 'Activa', '']}>
            {lista.filasPagina.map(c => (
              <DataRow key={c.id}>
                <Td>{c.nombre}</Td>
                <Td mono>{c.sucursal}</Td>
                <Td mono>{c.terminal}</Td>
                <Td right mono width="120px">{String(c.consecutivo_actual + 1).padStart(10, '0')}</Td>
                <Td><Switch checked={!!c.activa} onChange={v => toggleActiva(c.id, v)} /></Td>
                <Td right>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {puede('fe.config.cajas.numeracion') && <Button variant="secondary" onClick={() => abrirNumeracion(c)}>Numeración</Button>}
                    {puede('fe.config.cajas.editar') && <button title="Editar" onClick={() => abrirEditar(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'inline-flex', padding: 4 }}><IcEdit className="w-3.5 h-3.5" /></button>}
                    {puede('fe.config.cajas.eliminar') && <button title="Eliminar" onClick={() => eliminar(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, display: 'inline-flex', padding: 4 }}><IcTrash className="w-4 h-4" /></button>}
                  </div>
                </Td>
              </DataRow>
            ))}
            {lista.filtrados.length === 0 && (
              <DataRow><Td colSpan={6}>
                {lista.vacio('Todavía no hay cajas / terminales. Usa «+ Nueva caja / terminal» para empezar.')}
              </Td></DataRow>
            )}
          </DataTable>
        )}
      </div>

      {!cargando && lista.paginacion}
      <Modal open={open} title={editId ? 'Editar caja / terminal' : 'Nueva caja / terminal'} onClose={() => setOpen(false)} width={680}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.nombre.trim()}>Guardar</Button>
          </div>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CamposCaja form={form} patch={p => setForm(f => ({ ...f, ...p }))} nueva={!editId}
            sucursal={sucursales.length > 1 && !editId
              ? <Select value={sucursal.codigo} onChange={v => { const s = sucursales.find(x => x.codigo === v); if (s) { setSucursal(s); setForm(f => ({ ...f, terminal: String(Math.max(0, ...cajas.filter(c => c.sucursal === v).map(c => Number(c.terminal) || 0)) + 1).padStart(5, '0') })); } }}
                  options={sucursales.map(s => ({ value: s.codigo, label: `${s.codigo} · ${s.nombre}` }))} />
              : <Input value={`${sucursal.codigo} · ${sucursal.nombre}`} onChange={() => {}} readOnly />}
            hintSucursal={sucursales.length > 1 ? undefined : 'El plan tiene una sola sucursal.'} />
          {error && <div style={{ fontSize: 12, color: C.error }}>{error}</div>}
        </div>
      </Modal>

      <Modal open={numeracionCaja !== null} title={`Numeración: ${numeracionCaja?.nombre ?? ''} (terminal ${numeracionCaja?.terminal ?? ''})`} onClose={() => setNumeracionCaja(null)} width={680}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="secondary" onClick={() => setNumeracionCaja(null)}>Cancelar</Button>
            <Button onClick={guardarNumeracion}>Guardar</Button>
          </div>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>Próximo número de cada tipo de documento en esta terminal.</p>
          <TablaNumeracion valores={numeracionValores} actuales={numeracionActual} onCambiar={(tipo, v) => setNumeracionValores(vs => ({ ...vs, [tipo]: v }))} />
        </div>
      </Modal>
    </div>
  );
}
