'use client';
import { useEffect, useState } from 'react';
import { PageHeader, C, Button, DataTable, DataRow, Td, Modal, FormField, Input, Select, Switch } from '@/components/ui/primitives';
import { IcTrash, IcEdit } from '@/components/ui/icons';
import InfoTooltip from './InfoTooltip';
import { useListaFiltrable } from '@/components/ui/ListaFiltrable';
import { TIPOS_DOCUMENTO_EXONERACION, INSTITUCIONES_EXONERACION, reglaExoneracion } from '@/data/catalogosHacienda';
import { usePermisos } from '@/lib/permisosCliente';

export interface Exoneracion {
  id: string; nombre: string; tipo_documento: string; numero_documento: string; institucion: string;
  fecha_emision: string; porcentaje: number; articulo: string; inciso: string; descripcion: string; activo: number;
  tipo_documento_otro?: string; nombre_institucion_otros?: string;
}

function labelTipoDoc(v: string) { return TIPOS_DOCUMENTO_EXONERACION.find(t => t.value === v)?.label ?? v; }
function labelInstitucion(v: string) { return INSTITUCIONES_EXONERACION.find(i => i.value === v)?.label ?? v; }

export default function ExoneracionesPage({ hideHeader, addSignal }: { hideHeader?: boolean; addSignal?: number } = {}) {
  const { puede } = usePermisos();
  const [items, setItems] = useState<Exoneracion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<string>(TIPOS_DOCUMENTO_EXONERACION[3].value); // '04', el caso normal
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [institucion, setInstitucion] = useState<string>(INSTITUCIONES_EXONERACION[0].value);
  const [fechaEmision, setFechaEmision] = useState('');
  const [porcentaje, setPorcentaje] = useState('13');
  const [articulo, setArticulo] = useState('');
  const [inciso, setInciso] = useState('0');
  const [descripcion, setDescripcion] = useState('');
  const [tipoOtro, setTipoOtro] = useState('');
  const [institucionOtros, setInstitucionOtros] = useState('');
  const regla = reglaExoneracion(tipoDocumento);
  // Al cambiar el tipo se ajusta la institución que normalmente la emite.
  function cambiarTipo(t: string) {
    const r = reglaExoneracion(t);
    setTipoDocumento(t); setInstitucion(r.institucion); setInstitucionOtros(r.nombreInstitucionOtros ?? '');
    if (!r.pideArticulo) { setArticulo(''); setInciso('0'); }
  }
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Carga con contador de versión: `cargar()` pide recargar y el efecto
  // hace el fetch (sin setState síncrono dentro del efecto).
  const [version, setVersion] = useState(0);
  const cargar = () => setVersion(v => v + 1);
  useEffect(() => {
    let vivo = true;
    fetch('/api/exoneraciones').then(r => r.json()).then(d => { if (vivo) { setItems(d); setCargando(false); } }).catch(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [version]);

  // Señal del botón «+» del encabezado: se atiende al cambiar (durante el
  // render, como recomienda React para derivar de props).
  const [senal, setSenal] = useState(addSignal);
  if (addSignal !== senal) { setSenal(addSignal); if (addSignal) { abrirNuevo(); } }

  function abrirNuevo() {
    setEditId(null); setNombre(''); setTipoDocumento(TIPOS_DOCUMENTO_EXONERACION[3].value); setNumeroDocumento('');
    setInstitucion(INSTITUCIONES_EXONERACION[0].value); setFechaEmision(''); setPorcentaje('13'); setArticulo(''); setInciso('0'); setDescripcion(''); setTipoOtro(''); setInstitucionOtros('');
    setError(null); setOpen(true);
  }
  function abrirEditar(e: Exoneracion) {
    setEditId(e.id); setNombre(e.nombre); setTipoDocumento(e.tipo_documento); setNumeroDocumento(e.numero_documento);
    setInstitucion(e.institucion); setFechaEmision(e.fecha_emision?.slice(0, 10) ?? ''); setPorcentaje(String(e.porcentaje));
    setArticulo(e.articulo); setInciso(e.inciso || '0'); setDescripcion(e.descripcion); setTipoOtro(e.tipo_documento_otro ?? ''); setInstitucionOtros(e.nombre_institucion_otros ?? '');
    setError(null); setOpen(true);
  }

  async function guardar() {
    if (!nombre.trim()) { setError('Escribe el nombre.'); return; }
    if (!numeroDocumento.trim()) { setError(`Falta: ${regla.etiquetaNumero}.`); return; }
    if (regla.pideArticulo && !articulo.trim()) { setError('Escribe el artículo de la ley.'); return; }
    if (regla.pideDescripcionTipo && !tipoOtro.trim()) { setError('Describe el tipo de documento.'); return; }
    if (institucion === '99' && !institucionOtros.trim()) { setError('Escribe el nombre de la institución.'); return; }
    // Igual que en el XML real: si hay artículo, el inciso nunca se omite —
    // va en 0 cuando ese artículo no tiene incisos.
    const incisoFinal = articulo.trim() ? (inciso.trim() || '0') : inciso;
    setGuardando(true);
    const body = JSON.stringify({ nombre, tipoDocumento, numeroDocumento, institucion, fechaEmision, porcentaje: Number(porcentaje) || 0, articulo: regla.pideArticulo ? articulo : '', inciso: regla.pideArticulo ? incisoFinal : '0', descripcion, tipoDocumentoOtro: regla.pideDescripcionTipo ? tipoOtro : '', nombreInstitucionOtros: institucion === '99' ? institucionOtros : '' });
    if (editId) {
      await fetch(`/api/exoneraciones/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
    } else {
      await fetch('/api/exoneraciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    }
    setGuardando(false);
    setOpen(false);
    cargar();
  }
  async function eliminar(id: string) {
    setItems(is => is.filter(i => i.id !== id));
    await fetch(`/api/exoneraciones/${id}`, { method: 'DELETE' });
  }
  async function toggleActivo(e: Exoneracion, valor: boolean) {
    setItems(is => is.map(x => x.id === e.id ? { ...x, activo: valor ? 1 : 0 } : x));
    await fetch(`/api/exoneraciones/${e.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: valor }) });
  }

  const lista = useListaFiltrable({
    items, texto: e => `${e.nombre} ${e.numero_documento} ${labelTipoDoc(e.tipo_documento)} ${labelInstitucion(e.institucion)}`, placeholder: 'Buscar por nombre, número, tipo o institución',
    defs: [
      { tipo: 'lista', clave: 'tipo', label: 'Tipo de documento', opciones: [...new Set(items.map(e => e.tipo_documento))].map(v => ({ value: v, label: labelTipoDoc(v) })), valor: e => e.tipo_documento },
      { tipo: 'lista', clave: 'institucion', label: 'Institución', opciones: [...new Set(items.map(e => e.institucion))].map(v => ({ value: v, label: labelInstitucion(v) })), valor: e => e.institucion },
      { tipo: 'check', clave: 'activas', label: 'Solo activas', cumple: e => Boolean(Number(e.activo)) },
    ],
    derecha: <InfoTooltip text="Permiso que libera a un cliente de pagar todo o parte del IVA. Se aplica al elegir ese cliente en una factura." />,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!hideHeader && <PageHeader title="Exoneraciones"><Button onClick={abrirNuevo}>+ Nueva exoneración</Button></PageHeader>}
      {lista.barra}
      {lista.chips}
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {cargando ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p> : (
          <DataTable headers={['Nombre', 'Tipo de documento', 'Institución', 'Tarifa exonerada', 'Artículo / Inciso', 'Activo', '']}>
            {lista.filasPagina.map(e => (
              <DataRow key={e.id}>
                <Td>{e.nombre}</Td>
                <Td muted>{labelTipoDoc(e.tipo_documento)}</Td>
                <Td muted>{labelInstitucion(e.institucion)}</Td>
                <Td>{Math.min(Number(e.porcentaje), 13)} pts</Td>
                <Td muted>{e.articulo ? `Art. ${e.articulo} / Inc. ${e.inciso}` : '-'}</Td>
                <Td><Switch checked={Boolean(e.activo)} onChange={v => toggleActivo(e, v)} /></Td>
                <Td right>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {puede('fe.config.exoneraciones.editar') && <button title="Editar" onClick={() => abrirEditar(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'inline-flex', padding: 4 }}><IcEdit className="w-3.5 h-3.5" /></button>}
                    {puede('fe.config.exoneraciones.eliminar') && <button title="Eliminar" onClick={() => eliminar(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, display: 'inline-flex', padding: 4 }}><IcTrash className="w-4 h-4" /></button>}
                  </div>
                </Td>
              </DataRow>
            ))}
            {lista.filtrados.length === 0 && (
              <DataRow><Td colSpan={7}>
                {lista.vacio('Todavía no hay exoneraciones registradas. Usa "+ Nueva exoneración" para empezar.')}
              </Td></DataRow>
            )}
          </DataTable>
        )}
      </div>

      {!cargando && lista.paginacion}
      <Modal open={open} title={editId ? 'Editar exoneración' : 'Nueva exoneración'} onClose={() => setOpen(false)}
        footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
        </div>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ fontSize: 12, color: C.error, background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
          <FormField label="Nombre" required><Input value={nombre} onChange={setNombre} placeholder="Ej. Instituciones públicas" /></FormField>
          <FormField label="Tipo de documento de exoneración" hint={regla.ayuda}>
            <Select value={tipoDocumento} onChange={cambiarTipo} options={TIPOS_DOCUMENTO_EXONERACION.map(t => ({ value: t.value, label: `${t.value} - ${t.label}` }))} />
          </FormField>
          {regla.pideDescripcionTipo && (
            <FormField label="Descripción del tipo de documento" required><Input value={tipoOtro} onChange={setTipoOtro} placeholder="Documento que respalda la exoneración" /></FormField>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: institucion === '99' ? '1fr 1fr' : '1fr', gap: 10 }}>
            <FormField label="Institución que la emitió"><Select value={institucion} onChange={setInstitucion} options={INSTITUCIONES_EXONERACION.map(i => ({ value: i.value, label: i.label }))} /></FormField>
            {institucion === '99' && <FormField label="Nombre de la institución" required><Input value={institucionOtros} onChange={setInstitucionOtros} placeholder="Ej. PROCOMER" /></FormField>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label={regla.etiquetaNumero} required><Input value={numeroDocumento} onChange={setNumeroDocumento} placeholder={regla.placeholderNumero} /></FormField>
            <FormField label="Fecha de emisión del documento"><Input value={fechaEmision} onChange={setFechaEmision} type="date" /></FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: regla.pideArticulo ? '1fr 1fr 1fr' : '1fr 2fr', gap: 10 }}>
            <FormField label="Tarifa exonerada (puntos)" hint="Puntos de IVA que no se cobran. 13 exonera todo el IVA; 6.5, la mitad."><Input value={porcentaje} onChange={setPorcentaje} type="number" /></FormField>
            {regla.pideArticulo ? <>
              <FormField label="Artículo" required hint="De la ley que autoriza la exoneración."><Input value={articulo} onChange={setArticulo} /></FormField>
              <FormField label="Inciso" hint="Escribe 0 si el artículo no tiene incisos."><Input value={inciso} onChange={setInciso} /></FormField>
            </> : <p style={{ fontSize: 11.5, color: C.n700, margin: '22px 0 0' }}>Este tipo se identifica por su número de autorización; no lleva artículo ni inciso.</p>}
          </div>
          <FormField label="Descripción" hint="Opcional"><Input value={descripcion} onChange={setDescripcion} /></FormField>
        </div>
      </Modal>
    </div>
  );
}
