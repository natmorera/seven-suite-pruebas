'use client';
// Receptores de facturación electrónica: todos los terceros a los que se les
// puede facturar, tengan o no cuenta en Contabilidad. Es la misma base de
// Clientes y proveedores; aquí se ven desde el lado de Facturación.
//   · Solo receptor: se le factura, pero no tiene cuenta auxiliar (contado).
//   · Con cuenta: además es cliente contable y se le puede dar crédito.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, FONT, DataTable, DataRow, Td, Toast, StatusBadge } from '@/components/ui/primitives';
import { useListaFiltrable } from '@/components/ui/ListaFiltrable';
import { labelTipoId, ClienteModal, RECEPTOR_VACIO, type Receptor } from './NuevaFacturaPartes';
import { cuentaDe, esSoloReceptor, tipoTercero, type TerceroFila } from '@/components/pages/clientes/ReceptorPartes';
import { useModulos } from '@/lib/modulosCliente';
import InfoTooltip from './InfoTooltip';

// Qué le falta para que sus facturas salgan completas
function faltantes(t: TerceroFila): string[] {
  const f: string[] = [];
  if (!t.numero_identificacion) f.push('identificación');
  if (!t.email) f.push('correo');
  if (!t.actividad_economica && t.tipo_identificacion !== '05') f.push('actividad económica');
  return f;
}

export default function ReceptoresPage({ addSignal }: { addSignal?: number }) {
  const [filas, setFilas] = useState<TerceroFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);
  const router = useRouter();
  const [nuevo, setNuevo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [senal, setSenal] = useState(addSignal);
  if (addSignal !== senal) { setSenal(addSignal); if (addSignal) setNuevo(true); }

  useEffect(() => {
    let vivo = true;
    fetch('/api/clientes?receptores=1').then(r => r.json()).then((rows: TerceroFila[]) => {
      if (!vivo) return;
      setFilas(rows.filter(r => r.tipo !== 'proveedor' || Number(r.es_receptor) === 1));
      setCargando(false);
    });
    return () => { vivo = false; };
  }, [version]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);

  const { contabilidad } = useModulos();
  const lista = useListaFiltrable({
    items: filas,
    texto: t => `${t.nombre} ${t.numero_identificacion ?? ''} ${t.email ?? ''} ${t.nombre_comercial ?? ''}`,
    placeholder: 'Buscar por nombre, cédula o correo',
    defs: [
      { tipo: 'lista', clave: 'tipo', label: 'Tipo', opciones: (contabilidad ? ['Cliente', 'Proveedor', 'Solo receptor'] : ['Cliente', 'Proveedor']).map(x => ({ value: x, label: x })), valor: t => tipoTercero(t) },
      { tipo: 'lista', clave: 'tipoid', label: 'Tipo de identificación', opciones: Array.from(new Set(filas.map(t => labelTipoId(t.tipo_identificacion || '02')))).sort().map(x => ({ value: x, label: x })), valor: t => labelTipoId(t.tipo_identificacion || '02') },
      { tipo: 'check', clave: 'credito', label: 'Solo con crédito', cumple: t => Number(t.dias_credito ?? 0) > 0 && (!contabilidad || !esSoloReceptor(t)) },
      { tipo: 'check', clave: 'incompletos', label: 'Solo con datos incompletos', cumple: t => faltantes(t).length > 0 },
    ],
    derecha: <InfoTooltip text={contabilidad ? 'Es la misma base de Contabilidad › Clientes y proveedores. Un receptor sin cuenta solo puede comprar de contado; al crearle la cuenta se le puede dar crédito.' : 'Clientes y proveedores a los que les facturas. Los días de crédito se proponen al facturarles.'} />,
  });

  async function guardarNuevo(r: Receptor, _destino: 'base' | 'solo-aqui', crearCuenta?: boolean, tipoTercero: 'cliente' | 'proveedor' = 'cliente') {
    const res = await fetch('/api/clientes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: r.nombre, tipo: crearCuenta ? tipoTercero : 'cliente', tipoIdentificacion: r.tipoIdentificacion, numeroIdentificacion: r.numeroIdentificacion,
        email: r.email || null, telefono: r.telefono || null, direccionFiscal: r.direccion || null, actividadEconomica: r.actividad || null,
        diasCredito: crearCuenta && tipoTercero === 'cliente' ? r.diasCredito : 0, esReceptor: true, crearCuenta: Boolean(crearCuenta),
      }),
    });
    const d = await res.json().catch(() => ({}));
    setNuevo(false); setVersion(v => v + 1);
    setToast(d.cuenta ? `Se creó ${r.nombre} con su cuenta ${d.cuenta}.` : `Se guardó ${r.nombre} como receptor.`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT }}>
      {lista.barra}
      {lista.chips}
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {cargando ? <p style={{ fontSize: 12, color: C.n700 }}>Cargando…</p> : (
          <DataTable headers={['Receptor', 'Correo', 'Tipo', 'Crédito', 'Datos tributarios', '']}>
            {lista.filasPagina.map(t => {
              const cuenta = cuentaDe(t);
              const falta = faltantes(t);
              const dias = Number(t.dias_credito ?? 0);
              return (
                <DataRow key={t.id} onClick={() => router.push(`/facturacion-config/receptores/${encodeURIComponent(t.id)}`)}>
                  <Td>
                    <div style={{ fontWeight: 500 }}>{t.nombre}</div>
                    <div style={{ fontSize: 11, color: C.n700, whiteSpace: 'nowrap' }}>{labelTipoId(t.tipo_identificacion || '02')} {t.numero_identificacion || 'sin número'}</div>
                  </Td>
                  <Td muted>{t.email || '-'}</Td>
                  <Td>
                    {/* Cliente o proveedor (con cuenta en Contabilidad) o solo receptor */}
                    <StatusBadge label={tipoTercero(t)} color={tipoTercero(t) === 'Proveedor' ? 'orange' : tipoTercero(t) === 'Cliente' ? 'blue' : 'gray'} />
                    {cuenta && <div style={{ fontSize: 11, color: C.n700, marginTop: 3, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{cuenta}</div>}
                  </Td>
                  <Td>{(cuenta || !contabilidad) && dias > 0 ? <span style={{ whiteSpace: 'nowrap' }}>{dias} días</span> : <span style={{ color: C.n700 }}>Contado</span>}</Td>
                  <Td>{falta.length === 0
                    ? <StatusBadge label="Completos" color="green" />
                    : <span title={`Falta: ${falta.join(', ')}`} style={{ whiteSpace: 'nowrap' }}><StatusBadge label={`Falta ${falta[0].split(' ')[0]}${falta.length > 1 ? ` +${falta.length - 1}` : ''}`} color="yellow" /></span>}
                  </Td>
                  <Td right><span aria-hidden style={{ color: C.n700, fontSize: 16 }}>›</span></Td>
                </DataRow>
              );
            })}
            {lista.filtrados.length === 0 && (
              <DataRow><Td colSpan={6}>{lista.vacio('Todavía no hay receptores. Se crean aquí, al facturar o desde Clientes y proveedores.')}</Td></DataRow>
            )}
          </DataTable>
        )}
      </div>
      {!cargando && lista.paginacion}

      {nuevo && <ClienteModal open modo="nuevo" inicial={RECEPTOR_VACIO} onClose={() => setNuevo(false)} onGuardar={guardarNuevo} />}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 60, minWidth: 300 }}><Toast message={toast} type="success" onClose={() => setToast(null)} /></div>}
    </div>
  );
}
