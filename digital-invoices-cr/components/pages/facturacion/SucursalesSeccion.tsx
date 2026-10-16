'use client';
// Sucursales del emisor. Cada una tiene su código de 3 dígitos (va en el
// número de cada comprobante), su dirección y su correo. El cliente edita
// los datos; el código y las sucursales nuevas los maneja implementación,
// hasta el número que incluye el plan.
import { useEffect, useState } from 'react';
import { C, FONT, Button, Modal, FormField, Input, StatusBadge, DataTable, DataRow, Td } from '@/components/ui/primitives';
import { IcEdit } from '@/components/ui/icons';
import UbicacionCR, { nombreUbicacion, type Ubicacion } from '@/components/ui/UbicacionCR';
import { usePermisos } from '@/lib/permisosCliente';

export interface ConfigPlan { limiteSucursales: number; implementacion: boolean; permitirPruebas: boolean }
interface Sucursal {
  id: string; codigo: string; nombre: string; provincia: string; canton: string; distrito: string;
  otras_senas: string; telefono: string; correo: string; activa: number; cajas: number;
}
interface FormSuc { id: string | null; codigo: string; nombre: string; ubicacion: Ubicacion; otrasSenas: string; telefono: string; correo: string }

const vacio = (codigo: string): FormSuc => ({ id: null, codigo, nombre: '', ubicacion: { provincia: '', canton: '', distrito: '' }, otrasSenas: '', telefono: '', correo: '' });

export default function SucursalesSeccion({ emisorId, plan, onCambio, addSignal }: { emisorId: string; plan: ConfigPlan; onCambio?: () => void; addSignal?: number }) {
  const { puede } = usePermisos();
  const [avisoLimite, setAvisoLimite] = useState<string | null>(null);
  const [lista, setLista] = useState<Sucursal[]>([]);
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState<FormSuc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/sucursales?emisor=${emisorId}`).then(r => r.json()).then((l: Sucursal[]) => { if (vivo && Array.isArray(l)) setLista(l); }).catch(() => {});
    return () => { vivo = false; };
  }, [emisorId, version]);

  const puedeAgregar = plan.implementacion && lista.length < plan.limiteSucursales;
  const siguienteCodigo = String(Math.max(0, ...lista.map(s => Number(s.codigo) || 0)) + 1).padStart(3, '0');

  // «+ Nueva sucursal» del encabezado de la pestaña
  const [senalVista, setSenalVista] = useState(addSignal ?? 0);
  if ((addSignal ?? 0) !== senalVista) {
    setSenalVista(addSignal ?? 0);
    if (puedeAgregar) { setError(null); setAvisoLimite(null); setForm(vacio(siguienteCodigo)); }
    else setAvisoLimite(plan.implementacion ? `El plan incluye ${plan.limiteSucursales} sucursal${plan.limiteSucursales === 1 ? '' : 'es'}.` : 'Las sucursales las crea soporte de Seven.');
  }

  function editar(s: Sucursal) {
    setError(null);
    setForm({ id: s.id, codigo: s.codigo, nombre: s.nombre, ubicacion: { provincia: s.provincia ?? '', canton: s.canton ?? '', distrito: s.distrito ?? '' }, otrasSenas: s.otras_senas ?? '', telefono: s.telefono ?? '', correo: s.correo ?? '' });
  }
  async function guardar() {
    if (!form) return;
    if (!/^\d{3}$/.test(form.codigo)) { setError('El código son 3 dígitos, por ejemplo 002.'); return; }
    if (!form.nombre.trim()) { setError('Escribe el nombre de la sucursal.'); return; }
    setGuardando(true);
    const cuerpo = {
      nombre: form.nombre, provincia: form.ubicacion.provincia, canton: form.ubicacion.canton, distrito: form.ubicacion.distrito,
      otrasSenas: form.otrasSenas, telefono: form.telefono, correo: form.correo,
      ...(plan.implementacion ? { codigo: form.codigo } : {}),
    };
    const r = form.id
      ? await fetch(`/api/sucursales/${form.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
      : await fetch('/api/sucursales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cuerpo, emisorId, codigo: form.codigo }) });
    const d = await r.json().catch(() => ({}));
    setGuardando(false);
    if (!r.ok) { setError(d.error ?? 'No se pudo guardar.'); return; }
    setForm(null); setVersion(v => v + 1); onCambio?.();
  }

  const original = form?.id ? lista.find(s => s.id === form.id) : null;
  const cambiaCodigo = Boolean(original && form && original.codigo !== form.codigo);

  return (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, color: C.n700 }}>
        Tu plan incluye {plan.limiteSucursales} sucursal{plan.limiteSucursales === 1 ? '' : 'es'} ({lista.length} en uso).
        {plan.implementacion ? (puedeAgregar ? '' : ' Llegaste al límite del plan.') : ' Para agregar otra o cambiar un código, contacta a soporte de Seven.'}
        {' '}Cada sucursal tiene sus cajas o terminales; su código va en el número de cada comprobante.
      </div>
      {avisoLimite && <div style={{ fontSize: 12, color: C.error }}>{avisoLimite}</div>}
      <DataTable headers={['Código', 'Nombre', 'Ubicación', 'Teléfono', 'Correo', 'Cajas', 'Estado', '']}>
        {lista.map(s => (
          <DataRow key={s.id}>
            <Td mono width="80px">{s.codigo}</Td>
            <Td>{s.nombre || <span style={{ color: C.n700 }}>Sin nombre</span>}</Td>
            <Td muted>{[nombreUbicacion({ provincia: s.provincia, canton: s.canton, distrito: s.distrito }), s.otras_senas].filter(Boolean).join(' · ') || 'Sin dirección'}</Td>
            <Td muted>{s.telefono || '-'}</Td>
            <Td muted>{s.correo || '-'}</Td>
            <Td right mono width="70px">{s.cajas}</Td>
            <Td width="90px"><StatusBadge label={Number(s.activa) === 1 ? 'Activa' : 'Inactiva'} color={Number(s.activa) === 1 ? 'green' : 'gray'} /></Td>
            <Td right width="60px">
              {puede('fe.config.sucursales.editar') && <button title="Editar" aria-label="Editar sucursal" onClick={() => editar(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'inline-flex', padding: 4 }}><IcEdit className="w-3.5 h-3.5" /></button>}
            </Td>
          </DataRow>
        ))}
        {!lista.length && <DataRow><Td colSpan={8}><span style={{ color: C.n700 }}>Todavía no hay sucursales.</span></Td></DataRow>}
      </DataTable>

      {form && (
        <Modal open title={form.id ? `Sucursal ${original?.codigo ?? form.codigo}` : 'Nueva sucursal'} onClose={() => setForm(null)} width={560}
          footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
          </div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div style={{ fontSize: 12, color: C.error }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
              <FormField label="Código" required hint={plan.implementacion && puede('fe.config.sucursales.codigo') ? '3 dígitos' : plan.implementacion ? 'Sin permiso para cambiar el código' : 'Lo cambia soporte de Seven'}>
                <Input value={form.codigo} onChange={v => setForm(f => f && ({ ...f, codigo: v.replace(/\D/g, '').slice(0, 3) }))} readOnly={!plan.implementacion || !puede('fe.config.sucursales.codigo')} />
              </FormField>
              <FormField label="Nombre" required><Input value={form.nombre} onChange={v => setForm(f => f && ({ ...f, nombre: v }))} placeholder="Ej. Hotel Arenal" /></FormField>
            </div>
            {cambiaCodigo && (
              <p style={{ fontSize: 12, color: C.warning, margin: 0 }}>
                Al cambiar el código, los próximos comprobantes de sus cajas salen con {form.codigo}. Los ya emitidos conservan {original?.codigo}. Revisa el próximo número de cada caja en Cajas / Terminales.
              </p>
            )}
            <UbicacionCR value={form.ubicacion} onChange={u => setForm(f => f && ({ ...f, ubicacion: u }))} />
            <FormField label="Dirección exacta (otras señas)"><Input value={form.otrasSenas} onChange={v => setForm(f => f && ({ ...f, otrasSenas: v }))} /></FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Teléfono"><Input value={form.telefono} onChange={v => setForm(f => f && ({ ...f, telefono: v }))} /></FormField>
              <FormField label="Correo"><Input value={form.correo} onChange={v => setForm(f => f && ({ ...f, correo: v }))} type="email" /></FormField>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
