'use client';
// Pasos de facturación del asistente inicial cuando la empresa es de
// Guatemala. Guardan en los mismos lugares que Empresa › Información
// tributaria, con los mismos campos.
import { useEffect, useState } from 'react';
import { C, FormField, Input } from '@/components/ui/primitives';
import UbicacionCR, { type Ubicacion } from '@/components/ui/UbicacionCR';
import type { EmisorRow } from '@/components/pages/facturacion/EmisoresPage';
import { CamposAfiliacion, SeccionCertificadores } from '@/components/pages/facturacion/InformacionTributariaGT';
import { leerDatosGT, guardarDatosGT, type DatosTributariosGT } from '@/components/pages/facturacion/datosTributariosGT';
import TablaFrases from '@/components/pages/facturacion/FrasesGT';
import { frasesDelRtu } from '@/lib/perfilPais';
import type { Guardar } from './PasosFacturacion';

const correoValido = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

const Titulo = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div>
    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: C.n900 }}>{children}</p>
    {hint && <p style={{ margin: '3px 0 0', fontSize: 12, color: C.n700 }}>{hint}</p>}
  </div>
);

function useDatos() {
  const [emisor, setEmisor] = useState<EmisorRow | null | undefined>(undefined);
  const [datos, setDatos] = useState<DatosTributariosGT | null>(null);
  useEffect(() => {
    let vivo = true;
    Promise.all([fetch('/api/emisores').then(r => r.json()) as Promise<EmisorRow[]>, leerDatosGT()]).then(([lista, d]) => {
      if (!vivo) return;
      setEmisor(lista.find(x => Number(x.activo) === 1) ?? lista[0] ?? null); setDatos(d);
    }).catch(() => { if (vivo) setEmisor(null); });
    return () => { vivo = false; };
  }, []);
  return { emisor, datos, setDatos };
}

// ── Datos para la SAT: afiliación, frases, dirección y correo ────────────
export function PasoTributariaGT({ onRegistrar }: { onRegistrar: (f: Guardar) => void }) {
  const { emisor, datos } = useDatos();
  const [afil, setAfil] = useState({ afiliacionIva: 'GEN', vigenteDesde: '', regimenIsr: '1', agenteRetencionIva: false });
  const [frases, setFrases] = useState<DatosTributariosGT['frases']>([]);
  const [ubicacion, setUbicacion] = useState<Ubicacion>({ provincia: '', canton: '', distrito: '' });
  const [direccion, setDireccion] = useState('');
  const [correo, setCorreo] = useState('');
  const [cargado, setCargado] = useState<string | null>(null);

  // Al llegar los datos se llena el formulario una sola vez
  if (emisor && datos && cargado !== emisor.id) {
    setCargado(emisor.id);
    setAfil({ afiliacionIva: datos.afiliacionIva, vigenteDesde: datos.vigenteDesde, regimenIsr: datos.regimenIsr, agenteRetencionIva: datos.agenteRetencionIva });
    setFrases(datos.frases);
    setUbicacion({ provincia: emisor.provincia ?? '', canton: emisor.canton ?? '', distrito: emisor.distrito ?? '' });
    setDireccion(emisor.otras_senas ?? '');
    setCorreo(emisor.correo_electronico ?? '');
  }

  useEffect(() => {
    onRegistrar(async () => {
      if (!emisor) return 'Todavía no hay datos del emisor. Vuelve al paso Empresa y continúa.';
      if (!afil.vigenteDesde) return 'Elige desde cuándo está vigente la afiliación al IVA.';
      if (!ubicacion.provincia || !ubicacion.canton.trim() || !ubicacion.distrito) return 'Elige el departamento y escribe el municipio y el código postal.';
      if (direccion.trim().length < 5) return 'Escribe la dirección.';
      if (!correoValido(correo)) return 'Escribe un correo válido para los documentos.';
      const r1 = await fetch(`/api/emisores/${emisor.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provincia: ubicacion.provincia, canton: ubicacion.canton.trim(), distrito: ubicacion.distrito, otrasSenas: direccion.trim(), correoElectronico: correo.trim() }) });
      if (!r1.ok) return 'No se pudo guardar la dirección.';
      const r2 = await guardarDatosGT({ ...afil, frases });
      return r2.error ?? null;
    });
  }, [onRegistrar, emisor, afil, frases, ubicacion, direccion, correo]);

  if (emisor === undefined || (emisor && !datos)) return <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>Cargando…</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Titulo hint="Decide qué tipos de documento puede emitir la empresa.">Afiliación al IVA y régimen</Titulo>
        <CamposAfiliacion valor={afil} onChange={p => setAfil(a => ({ ...a, ...p }))} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Titulo hint="Las del RTU se agregan solas según la afiliación; agrega aquí exenciones de ISR o la resolución de pago directo.">Frases</Titulo>
        <TablaFrases rtu={frasesDelRtu(afil.afiliacionIva, afil.regimenIsr, afil.agenteRetencionIva)} manuales={frases} onChange={setFrases} puedeEditar />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Titulo hint="Aparecen en cada documento.">Dirección fiscal y correo</Titulo>
        <UbicacionCR value={ubicacion} onChange={setUbicacion} required />
        <FormField label="Dirección" required><Input value={direccion} onChange={setDireccion} placeholder="Calle 30 de Junio, zona 0, Flores" /></FormField>
        <FormField label="Correo para documentos" required><Input value={correo} onChange={setCorreo} type="email" placeholder="facturacion@hotel.com.gt" /></FormField>
      </div>
    </div>
  );
}

// ── Certificador ─────────────────────────────────────────────────────────
export function PasoCertificadorGT({ onRegistrar }: { onRegistrar: (f: Guardar) => void }) {
  const { emisor, datos, setDatos } = useDatos();
  useEffect(() => {
    onRegistrar(async () => {
      const principal = datos?.certificadores.find(c => c.principal);
      if (!principal) return 'Agrega el certificador con el que vas a emitir.';
      if (!principal.usuario || !principal.tieneClave) return `Falta el usuario o la contraseña de ${principal.certificador}.`;
      return null;
    });
  }, [onRegistrar, datos]);
  if (emisor === undefined || !datos) return <p style={{ fontSize: 12, color: C.n700, margin: 0 }}>Cargando…</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 12.5, color: C.n700, lineHeight: 1.55 }}>
        El certificador recibe cada documento, lo valida, le asigna la serie y el número y lo envía a la SAT. Usa el usuario y la contraseña que te dio tu certificador.
      </p>
      <SeccionCertificadores certificadores={datos.certificadores} puedeEditar onGuardado={d => setDatos(d)} />
    </div>
  );
}
