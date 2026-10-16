'use client';
// Impresoras de la empresa: asignación por tipo de documento, impresoras
// registradas en el servidor de impresión y el catálogo de tipos de documento.
import { useEffect, useState } from 'react';
import { C, FONT, Button, FormField, Input, Section, InfoBox, DataTable, DataRow, Td, Modal, Switch, PAGE_PAD, radius } from '@/components/ui/primitives';
import { IcEdit, IcTrash } from '@/components/ui/icons';
import type { DatosImpresion, Impresora } from '@/lib/empresaDocumentos';

export function useImpresion(onError: (m: string) => void) {
  const [datos, setDatos] = useState<DatosImpresion | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch('/api/empresa/impresoras').then(r => r.json()).then(d => { if (vivo) setDatos(d); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  async function guardar(nuevo: DatosImpresion): Promise<boolean> {
    const r = await fetch('/api/empresa/impresoras', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevo) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { onError(d.error ?? 'No se pudo guardar.'); return false; }
    setDatos(d); return true;
  }
  return { datos, guardar };
}

const Pagina = ({ children }: { children: React.ReactNode }) => (
  <div style={{ flex: 1, overflowY: 'auto', padding: PAGE_PAD }}>{children}</div>
);

export function TabAsignacion({ datos, guardar }: { datos: DatosImpresion | null; guardar: (d: DatosImpresion) => Promise<boolean> }) {
  if (!datos) return <Pagina><p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p></Pagina>;
  const habilitadas = datos.impresoras.filter(i => i.habilitada);
  const nombre = (id?: string) => datos.impresoras.find(i => i.id === id)?.nombre;
  return (
    <Pagina>
      <Section title="Configuración de impresoras" hint="Asigne una impresora a cada tipo de documento.">
        <InfoBox>Las impresoras disponibles son las registradas en la pestaña Impresoras para la empresa en el servidor de impresión.</InfoBox>
        <DataTable headers={['Tipo', 'Código', 'Impresora actual', 'Asignar']}>
          {datos.tipos.map(t => {
            const actual = datos.asignaciones[t.codigo];
            return (
              <DataRow key={t.codigo}>
                <Td><span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: C.n200, color: C.n900 }}>{t.nombre}</span></Td>
                <Td muted>{t.codigo}</Td>
                <Td muted={!nombre(actual)}>{nombre(actual) ?? 'Sin asignar'}</Td>
                <Td width="320px">
                  <select value={actual && nombre(actual) ? actual : ''} aria-label={`Impresora para ${t.nombre}`}
                    onChange={e => {
                      const asignaciones = { ...datos.asignaciones };
                      if (e.target.value) asignaciones[t.codigo] = e.target.value; else delete asignaciones[t.codigo];
                      guardar({ ...datos, asignaciones });
                    }}
                    style={{ width: '100%', height: 32, padding: '0 8px', border: `1px solid ${C.n500}`, borderRadius: radius.sm, fontSize: 12, fontFamily: FONT, background: C.n000 }}>
                    <option value="">- Predeterminada del sistema -</option>
                    {habilitadas.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                    {actual && !habilitadas.some(i => i.id === actual) && nombre(actual) && <option value={actual}>{nombre(actual)}</option>}
                  </select>
                </Td>
              </DataRow>
            );
          })}
        </DataTable>
      </Section>
    </Pagina>
  );
}

export function TabImpresoras({ datos, guardar, nueva, onCerrarNueva }: {
  datos: DatosImpresion | null; guardar: (d: DatosImpresion) => Promise<boolean>; nueva: boolean; onCerrarNueva: () => void;
}) {
  const [editando, setEditando] = useState<Impresora | null>(null);
  if (!datos) return <Pagina><p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p></Pagina>;
  async function eliminar(i: Impresora) {
    if (!datos || !window.confirm(`¿Eliminar la impresora «${i.nombre}»? Los documentos asignados a ella pasan a la predeterminada del sistema.`)) return;
    guardar({ ...datos, impresoras: datos.impresoras.filter(x => x.id !== i.id), asignaciones: Object.fromEntries(Object.entries(datos.asignaciones).filter(([, id]) => id !== i.id)) });
  }
  return (
    <Pagina>
      <Section title="Impresoras" hint="Las impresoras que esta empresa tiene registradas.">
        <DataTable headers={['Nombre', 'Impresión', 'Acciones']}>
          {datos.impresoras.length === 0 && <DataRow><Td colSpan={3} muted>No hay impresoras registradas.</Td></DataRow>}
          {datos.impresoras.map(i => (
            <DataRow key={i.id}>
              <Td>{i.nombre}</Td>
              <Td width="180px"><span style={{ color: i.habilitada ? C.success : C.n700 }}>{i.habilitada ? 'Habilitada' : 'Deshabilitada'}</span></Td>
              <Td width="110px">
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setEditando(i)} aria-label={`Editar ${i.nombre}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'flex' }}><IcEdit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => eliminar(i)} aria-label={`Eliminar ${i.nombre}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, display: 'flex' }}><IcTrash className="w-3.5 h-3.5" /></button>
                </div>
              </Td>
            </DataRow>
          ))}
        </DataTable>
      </Section>
      {(nueva || editando) && (
        <ModalImpresora impresora={editando} onClose={() => { setEditando(null); onCerrarNueva(); }}
          onGuardar={async (nombre, habilitada) => {
            const impresoras = editando
              ? datos.impresoras.map(x => x.id === editando.id ? { ...x, nombre, habilitada } : x)
              : [...datos.impresoras, { id: 'imp-' + Math.random().toString(36).slice(2, 9), nombre, habilitada: true }];
            if (await guardar({ ...datos, impresoras })) { setEditando(null); onCerrarNueva(); }
          }} />
      )}
    </Pagina>
  );
}

function ModalImpresora({ impresora, onClose, onGuardar }: { impresora: Impresora | null; onClose: () => void; onGuardar: (nombre: string, habilitada: boolean) => void }) {
  const [nombre, setNombre] = useState(impresora?.nombre ?? '');
  const [habilitada, setHabilitada] = useState(impresora?.habilitada ?? true);
  return (
    <Modal open title={impresora ? 'Editar impresora' : 'Registrar impresora'} onClose={onClose}
      footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => onGuardar(nombre.trim(), habilitada)} disabled={!nombre.trim()}>{impresora ? 'Guardar' : 'Registrar'}</Button>
      </div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="Nombre" required hint="Cómo se conoce la impresora en el servidor de impresión.">
          <Input value={nombre} onChange={setNombre} />
        </FormField>
        {impresora && <Switch checked={habilitada} onChange={setHabilitada} label="Impresión habilitada" />}
      </div>
    </Modal>
  );
}

export function TabTiposDocumento({ datos, guardar, nuevo, onCerrarNuevo }: {
  datos: DatosImpresion | null; guardar: (d: DatosImpresion) => Promise<boolean>; nuevo: boolean; onCerrarNuevo: () => void;
}) {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  if (!datos) return <Pagina><p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p></Pagina>;
  const cerrar = () => { setCodigo(''); setNombre(''); onCerrarNuevo(); };
  return (
    <Pagina>
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: C.n900, margin: 0 }}>Tipos de documento</p>
        <p style={{ fontSize: 12, color: C.n700, margin: '4px 0 0' }}>Clases de documento para efectos de impresión: es lo que se asigna a cada impresora. Catálogo global.</p>
      </div>
      <DataTable headers={['Código', 'Nombre', 'Estado']}>
        {datos.tipos.map(t => (
          <DataRow key={t.codigo}>
            <Td width="260px"><span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5 }}>{t.codigo}</span></Td>
            <Td>{t.nombre}</Td>
            <Td width="120px"><span style={{ color: C.success }}>En uso</span></Td>
          </DataRow>
        ))}
      </DataTable>
      {nuevo && (
        <Modal open title="Nuevo tipo de documento" onClose={cerrar}
          footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={cerrar}>Cancelar</Button>
            <Button disabled={!codigo.trim() || !nombre.trim()}
              onClick={async () => { if (await guardar({ ...datos, tipos: [...datos.tipos, { codigo: codigo.trim(), nombre: nombre.trim() }] })) cerrar(); }}>Crear</Button>
          </div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Código" required hint="Identificador natural del tipo; no cambia después.">
              <Input value={codigo} onChange={setCodigo} />
            </FormField>
            <FormField label="Nombre" required>
              <Input value={nombre} onChange={setNombre} />
            </FormField>
          </div>
        </Modal>
      )}
    </Pagina>
  );
}
