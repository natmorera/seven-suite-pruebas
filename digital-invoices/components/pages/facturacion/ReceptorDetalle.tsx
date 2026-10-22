'use client';
// Pantalla propia de un receptor. Encabezado estándar (52 px) con sus
// etiquetas y los botones; pestañas: General (identificación y actividades),
// Comprobantes (envío, ubicación y exoneración) y Crédito.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { C, FONT, Button, StatusBadge, Toast, TabBar, Input, Checkbox, radius } from '@/components/ui/primitives';
import { DatosTributarios, ActivarCuentaModal, cuentaDe, tipoTercero, type TerceroFila } from '@/components/pages/clientes/ReceptorPartes';
import { labelTipoId } from './NuevaFacturaPartes';
import { useModulos } from '@/lib/modulosCliente';
import { usePermisos } from '@/lib/permisosCliente';

const PESTANAS = ['General', 'Comprobantes', 'Crédito'] as const;
const FORM = 'form-receptor';

function faltan(t: TerceroFila): string[] {
  const ext = t.tipo_identificacion === '05';
  return [!t.numero_identificacion && 'identificación', !ext && !t.actividad_economica && 'actividad', !t.email && 'correo'].filter(Boolean) as string[];
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.n700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: C.n900 }}>{children}</div>
    </div>
  );
}

export default function ReceptorDetalle({ id }: { id: string }) {
  const router = useRouter();
  const [t, setT] = useState<TerceroFila | null>(null);
  const [version, setVersion] = useState(0);
  const [pestana, setPestana] = useState(0);
  const [activar, setActivar] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [credito, setCredito] = useState<{ dias: string; recibo: boolean } | null>(null);
  // Solo facturación: el crédito no depende de una cuenta contable
  const { contabilidad } = useModulos();
  const { puede } = usePermisos();
  useEffect(() => {
    let vivo = true;
    fetch('/api/clientes').then(r => r.json()).then((l: (TerceroFila & { genera_recibo_pago?: number | null })[]) => {
      if (!vivo) return;
      const x = l.find(c => c.id === id) ?? null;
      setT(x);
      if (x) setCredito({ dias: String(Number(x.dias_credito ?? 0)), recibo: Number(x.genera_recibo_pago ?? 0) === 1 });
    }).catch(() => {});
    return () => { vivo = false; };
  }, [id, version]);

  if (!t || !credito) return <div style={{ padding: 24, fontSize: 12, color: C.n700, fontFamily: FONT }}>Cargando…</div>;
  const cuenta = cuentaDe(t);
  const dias = Number(t.dias_credito ?? 0);
  const f = faltan(t);
  const tipo = tipoTercero(t);

  async function guardarCredito(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/clientes/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ diasCredito: Number(credito!.dias) || 0 }) });
    await fetch(`/api/clientes/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ generaReciboPago: credito!.recibo ? 1 : 0 }) });
    setToast('Crédito guardado.'); setVersion(v => v + 1);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT }}>
      {/* Encabezado estándar: 52 px, título y etiquetas a la izquierda, botones a la derecha */}
      <div style={{ height: 52, minHeight: 52, background: C.n000, borderBottom: `1px solid ${C.n500}`, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => router.push('/facturacion-config?tab=receptores')} aria-label="Volver a Receptores" title="Volver a Receptores"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: C.n700, padding: 2, lineHeight: 1 }}>←</button>
        <h1 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: C.n900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{t.nombre}</h1>
        <StatusBadge label={tipo} color={tipo === 'Proveedor' ? 'orange' : tipo === 'Cliente' ? 'blue' : 'gray'} />
        {f.length ? <StatusBadge label={`Falta: ${f.join(', ')}`} color="yellow" /> : <StatusBadge label="Listo para facturarle" color="green" />}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          {contabilidad && !cuenta && tipo !== 'Proveedor' && puede('fe.config.receptores.cuenta') && <Button variant="secondary" onClick={() => setActivar(true)}>Crear cuenta y crédito</Button>}
          {puede(pestana === 2 ? 'fe.config.receptores.credito' : 'fe.config.receptores.editar') && <Button type="submit" form={FORM}>Guardar</Button>}
        </div>
      </div>
      <TabBar tabs={[...PESTANAS]} active={pestana} onChange={setPestana} />

      <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: C.n200 }}>
        {/* Los datos tributarios siguen montados en Crédito para no perder lo escrito */}
        <fieldset disabled={!puede('fe.config.receptores.editar')} style={{ display: 'contents' }}>
        <DatosTributarios key={t.id + version} tercero={t} columnas resumen={false}
          seccion={pestana === 0 ? 'general' : pestana === 1 ? 'comprobantes' : 'oculto'} formId={pestana < 2 ? FORM : undefined}
          onGuardado={m => { setToast(m); setVersion(v => v + 1); }} />
        </fieldset>

        {pestana === 2 && (
          <fieldset disabled={!puede('fe.config.receptores.credito')} style={{ display: 'contents' }}>
          <form id={FORM} onSubmit={guardarCredito} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 14, alignItems: 'start' }}>
            {contabilidad && <section style={{ background: '#fff', border: `1px solid ${C.n500}`, borderRadius: radius.md }}>
              <header style={{ padding: '12px 16px', borderBottom: `1px solid ${C.n500}` }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Cuenta</div>
                <div style={{ fontSize: 11.5, color: C.n700, marginTop: 2 }}>Para darle crédito necesita una cuenta de cliente en Contabilidad.</div>
              </header>
              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Dato label="Tipo">{tipo}</Dato>
                <Dato label="Identificación">{labelTipoId(t.tipo_identificacion || '02')} {t.numero_identificacion || 'sin número'}</Dato>
                <Dato label="Cuenta contable">
                  {cuenta
                    ? <Link href={`/clientes?open=${encodeURIComponent(cuenta.split('-')[3] ?? '')}&nombre=${encodeURIComponent(t.nombre)}&tipo=${t.tipo === '04' ? '04' : '02'}`} style={{ color: C.brand, fontVariantNumeric: 'tabular-nums' }}>{cuenta}</Link>
                    : <span style={{ color: C.n700 }}>Sin cuenta: se le factura de contado</span>}
                </Dato>
                <Dato label="Condición actual">{cuenta && dias > 0 ? `Crédito a ${dias} días` : 'Contado'}</Dato>
              </div>
            </section>}
            <section style={{ background: '#fff', border: `1px solid ${C.n500}`, borderRadius: radius.md }}>
              <header style={{ padding: '12px 16px', borderBottom: `1px solid ${C.n500}` }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Crédito</div>
                <div style={{ fontSize: 11.5, color: C.n700, marginTop: 2 }}>Se propone al facturarle; se puede cambiar en cada factura.</div>
              </header>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {cuenta || !contabilidad ? <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 500 }}>
                    Días de crédito
                    <div style={{ maxWidth: 160 }}><Input type="number" value={credito.dias} onChange={v => setCredito(c => c && ({ ...c, dias: v }))} placeholder="0 = contado" /></div>
                  </label>
                  <Checkbox checked={credito.recibo} onChange={v => setCredito(c => c && ({ ...c, recibo: v }))} label="Sus facturas a crédito llevan recibo electrónico de pago (IVA al cobro, hasta 90 días)" />
                </> : (
                  <div style={{ fontSize: 12.5, color: C.n700 }}>Este receptor no tiene cuenta. Usa «Crear cuenta y crédito» para darle crédito.</div>
                )}
              </div>
            </section>
          </form>
          </fieldset>
        )}
      </div>

      {activar && (
        <ActivarCuentaModal tercero={t} onClose={() => setActivar(false)} onHecho={r => {
          setActivar(false); setVersion(v => v + 1);
          setToast(`${t.nombre}: cuenta ${r.cuenta ?? ''}${r.diasCredito ? `, ${r.diasCredito} días de crédito` : ', de contado'}.`);
        }} />
      )}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 60, minWidth: 300 }}><Toast message={toast} type="success" onClose={() => setToast(null)} /></div>}
    </div>
  );
}
