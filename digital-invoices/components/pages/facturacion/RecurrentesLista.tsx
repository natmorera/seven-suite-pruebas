'use client';
// Pestaña «Recurrentes» de Ventas: todas las facturas que se repiten, cuándo
// toca la siguiente y qué hacer con cada una. Todas las filas tienen las
// mismas acciones en el mismo orden; las que no aplican quedan deshabilitadas.
//   Emitir (principal) · Saltar · Editar · Pausar / Reanudar
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, Button, DataTable, DataRow, Td, StatusBadge, Toast } from '@/components/ui/primitives';
import { MontoCelda } from '@/components/ui/Monto';
import { useListaFiltrable } from '@/components/ui/ListaFiltrable';
import { labelFrecuencia } from '@/lib/recurrencia';
import RecurrenciaModal, { type Recurrencia } from './RecurrenciaModal';
import InfoTooltip from './InfoTooltip';

type Fila = Recurrencia & { tipo?: string; total?: number; moneda?: string };
const hoy = () => new Date().toISOString().slice(0, 10);
const fecha = (iso?: string) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '') : '-';
const activa = (f: Fila) => Number(f.activa) === 1;
const vence = (f: Fila) => activa(f) && f.proxima <= hoy();
function estado(f: Fila): string {
  if (!activa(f)) return f.fin && f.proxima > f.fin ? 'Terminada' : 'Pausada';
  return vence(f) ? 'Por emitir' : 'Activa';
}

// Colores por tipo de acción (iguales en todas las filas)
const ESTILO_PAUSAR = { color: '#8A5A00', borderColor: '#E8C77A', background: '#FFF8E6' };
const ESTILO_REANUDAR = { color: C.successDk, borderColor: '#9ED3AE', background: '#EEF8F1' };

export default function RecurrentesLista({ onCambio }: { onCambio?: () => void }) {
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editar, setEditar] = useState<Fila | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const recargar = () => { setVersion(v => v + 1); onCambio?.(); };
  useEffect(() => {
    let vivo = true;
    fetch('/api/recurrentes').then(r => r.json()).then(d => { if (vivo) { setFilas(d); setCargando(false); } }).catch(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [version]);

  const lista = useListaFiltrable({
    items: filas, prefijo: 'r_',
    texto: f => `${f.numero_factura ?? ''} ${f.cliente_nombre ?? ''}`,
    placeholder: 'Buscar por cliente o número de factura',
    defs: [
      { tipo: 'lista', clave: 'estado', label: 'Estado', opciones: ['Por emitir', 'Activa', 'Pausada', 'Terminada'].map(x => ({ value: x, label: x })), valor: estado },
      { tipo: 'lista', clave: 'frec', label: 'Frecuencia', opciones: Array.from(new Set(filas.map(f => f.frecuencia))).map(x => ({ value: x, label: labelFrecuencia(x) })), valor: f => f.frecuencia },
      { tipo: 'check', clave: 'auto', label: 'Solo automáticas', cumple: f => f.modo === 'automatica' },
    ],
    derecha: <InfoTooltip text="Una factura recurrente se repite con el mismo cliente y las mismas líneas. Cuando llega la fecha se emite sola o te avisa para revisarla, según la elijas. Se programa al crear la factura o desde el menú de una factura ya emitida." />,
  });

  async function omitir(f: Fila) {
    if (!window.confirm(`¿Saltar la factura del ${fecha(f.proxima)}? La siguiente queda para el período que sigue.`)) return;
    await fetch(`/api/recurrentes/${f.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'omitir' }) });
    setToast('Se saltó este período.'); recargar();
  }
  async function pausar(f: Fila, reanudar: boolean) {
    await fetch(`/api/recurrentes/${f.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activa: reanudar }) });
    setToast(reanudar ? 'Se reanudó la recurrencia.' : 'Se pausó la recurrencia.'); recargar();
  }
  // Emitir: abre la factura ya llena para revisarla y emitirla
  const emitir = (f: Fila) => {
    router.push(`/facturacion/emitidos/nuevo?tipo=${encodeURIComponent(f.tipo || 'Factura electrónica')}&repetir=${encodeURIComponent(f.documento_id.replace('#', ''))}&recurrencia=${encodeURIComponent(f.id)}`);
  };

  const alto = { height: 28, padding: '0 8px', gap: 0 };
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {lista.barra}
      {lista.chips}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {cargando ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p> : (
          <DataTable headers={['Cliente', 'Factura base', 'Frecuencia', 'Próxima', 'Termina', 'Al llegar', 'Emitidas', 'Monto', 'Estado', '']}>
            {lista.filasPagina.map(f => {
              const est = estado(f);
              return (
                <DataRow key={f.id}>
                  <Td><span style={{ fontWeight: 500 }}>{f.cliente_nombre}</span></Td>
                  <Td><a href={`/facturacion/emitidos/${f.documento_id.replace('#', '')}`} style={{ color: C.brand, fontVariantNumeric: 'tabular-nums' }}>{f.numero_factura}</a></Td>
                  <Td>{labelFrecuencia(f.frecuencia)}</Td>
                  <Td><span style={{ color: vence(f) ? C.error : C.n900, fontWeight: vence(f) ? 600 : 400, whiteSpace: 'nowrap' }}>{fecha(f.proxima)}</span></Td>
                  <Td muted>{f.fin ? fecha(f.fin) : 'Sin fin'}</Td>
                  <Td>
                    <span style={{ whiteSpace: 'nowrap' }}>{f.modo === 'automatica' ? 'Se emite sola' : 'Avisarme'}</span>
                    {f.ultimo_error && <div title={f.ultimo_error} style={{ fontSize: 10.5, color: C.error }}>No se pudo emitir</div>}
                  </Td>
                  <Td right>{f.emitidas ?? 0}</Td>
                  <Td width="120px"><MontoCelda valor={f.total ?? 0} moneda={f.moneda} /></Td>
                  <Td><span style={{ whiteSpace: 'nowrap' }}><StatusBadge label={est} color={est === 'Por emitir' ? 'red' : est === 'Activa' ? 'green' : 'gray'} /></span></Td>
                  <Td right>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
                      <Button onClick={() => emitir(f)} disabled={!activa(f)} style={alto} title={vence(f) ? 'Revisar y emitir la de este período' : 'Emitir antes de la fecha'}>Emitir</Button>
                      <Button variant="secondary" onClick={() => omitir(f)} disabled={!activa(f)} style={alto} title="Saltar este período">Saltar</Button>
                      <Button variant="secondary" onClick={() => setEditar(f)} style={alto}>Editar</Button>
                      {activa(f)
                        ? <Button variant="secondary" onClick={() => pausar(f, false)} style={{ ...alto, ...ESTILO_PAUSAR, width: 76, justifyContent: 'center' }}>Pausar</Button>
                        : <Button variant="secondary" onClick={() => pausar(f, true)} style={{ ...alto, ...ESTILO_REANUDAR, width: 76, justifyContent: 'center' }}>Reanudar</Button>}
                    </div>
                  </Td>
                </DataRow>
              );
            })}
            {lista.filtrados.length === 0 && <DataRow><Td colSpan={10}>{lista.vacio('Todavía no hay facturas recurrentes. Programa una al crear la factura o desde el menú de una factura emitida.')}</Td></DataRow>}
          </DataTable>
        )}
      </div>
      {!cargando && lista.paginacion}
      {editar && (
        <RecurrenciaModal documento={{ id: editar.documento_id, numero_factura: editar.numero_factura ?? '', cliente_nombre: editar.cliente_nombre ?? '', fecha_emision: editar.creado ?? new Date().toISOString() }}
          actual={editar} onClose={() => setEditar(null)} onGuardado={m => { setEditar(null); setToast(m); recargar(); }} />
      )}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </div>
  );
}
