'use client';
// API Key del módulo para conectarlo con Management (MAN). Se puede abrir sin
// haber terminado el onboarding (ver RUTAS_SIN_ONBOARDING): primero se
// conecta el módulo y después se configura. También está en Empresa › API Key
// y en el asistente inicial (botón «API Key»).
import Link from 'next/link';
import { C, FONT, PageHeader } from '@/components/ui/primitives';
import SeccionApiKey from '@/components/ui/integracion/SeccionApiKey';

export const obtenerApiKey = () => fetch('/api/integracion/api-key').then(r => r.json());
export const regenerarApiKey = () => fetch('/api/integracion/api-key', { method: 'POST' }).then(r => r.json());

export function AyudaApiKey() {
  return (
    <p style={{ margin: '0 0 14px', fontSize: 12.5, color: C.n700, lineHeight: 1.5 }}>
      Copia esta llave y pégala en Management (MAN), en los módulos de la empresa. No hace falta terminar el asistente inicial:
      el módulo queda conectado desde ya y la configuración se completa después.
    </p>
  );
}

export default function ApiKeyPagina() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT }}>
      <PageHeader title="API Key" />
      <div style={{ padding: 24, maxWidth: 760 }}>
        <AyudaApiKey />
        <SeccionApiKey obtener={obtenerApiKey} regenerar={regenerarApiKey} marca={C.brand} />
        <p style={{ marginTop: 16, fontSize: 12 }}><Link href="/dashboard" style={{ color: C.brand }}>Ir al módulo</Link></p>
      </div>
    </div>
  );
}
