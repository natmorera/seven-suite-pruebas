'use client';
// Módulos: los módulos contratados. Front Desk y el producto contable se integran desde el MAN y muestran el avance de
// su integración (cada uno se integra en su detalle); los demás muestran «Integrar» sin acción por ahora. «Solicitar módulo» abre el
// WhatsApp de ventas.
import { useRouter } from 'next/navigation';
import { C } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';
import { BotonEnlace, Celda, ConfigCard, Fila, Insignia, OutlineButton, Tabla } from '@/components/kit';
import { AccionesEnHeader } from '@/components/layout/Pantalla';
import { useEmpresa } from '@/components/layout/Shell';
import { fmtFH } from '@/components/kit/fechas';
import { PERFILES_DE, enlaceSolicitud } from '../../catalogo';
import { EstadoConexionChip, LogoModulo } from '../../piezas';
import type { ModuloId } from '../../tipos';
import { integrable, resumen, useIntegracion } from './integracion';

const IcWhatsApp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.1L3.5 20.5Z" /><path d="M9 8.5c0 3.3 2.7 6.5 6.5 6.5l1-1.6-2.2-1-1 .9c-1.2-.5-2.1-1.4-2.6-2.6l.9-1-1-2.2L9 8.5Z" />
  </svg>
);
/** Dirección del detalle de un módulo. */
const rutaModulo = (m: ModuloId) => `/modulos?modulo=${m}`;

export default function Conexion() {
  const router = useRouter();
  const { contratados, conexion, pasos, perfiles } = useIntegracion();
  // Primero el producto contable (la base de la integración), luego Front Desk y los demás.
  const orden = contratados;
  const empresa = useEmpresa();

  return (
    <>
    <AccionesEnHeader><BotonEnlace href={enlaceSolicitud(empresa)} icon={<IcWhatsApp />}>Solicitar módulo</BotonEnlace></AccionesEnHeader>
    <ConfigCard title="Módulos contratados">
      <Tabla headers={['Módulo', 'Integración', 'Conexión', 'Perfiles', '']} anchos={{ 1: 190, 2: 130, 4: 120 }} alinearDerecha={[4]}>
        {orden.map(m => {
          const c = conexion(m);
          const p = pasos(m);
          const { listo, etiqueta, falta } = resumen(p);
          const comparte = PERFILES_DE[m];
          return (
            <Fila key={m}>
              <Celda><LogoModulo m={m} /></Celda>
              <Celda>
                {!integrable(m) ? <span style={{ color: C.n700 }}>Todavía no disponible</span> : <>
                <Insignia label={etiqueta} color={listo ? 'green' : 'yellow'} />
                {falta && <span style={{ display: 'block', fontSize: 11.5, color: C.n700, marginTop: 4 }}>Falta: {falta}</span>}
                </>}
              </Celda>
              <Celda>
                {c.apiKey ? <EstadoConexionChip estado={c.estado} /> : <Insignia label="Sin conectar" color="gray" />}
                {c.ultimaPrueba && <span style={{ display: 'block', fontSize: 11, color: C.n700, marginTop: 4 }}>{fmtFH(c.ultimaPrueba)}</span>}
              </Celda>
              <Celda style={{ whiteSpace: 'normal' }}>
                {!comparte ? <span style={{ color: C.n700 }}>No comparte</span>
                  : c.perfilesOmitido && !c.ultimaSync ? <span style={{ fontSize: 12, color: C.n700 }}>Omitidos</span>
                  : c.ultimaSync ? <span style={{ fontSize: 12 }}>{perfiles.filter(x => x.modulos.includes(m)).length} sincronizados<span style={{ display: 'block', fontSize: 11, color: C.n700 }}>{fmtFH(c.ultimaSync)}</span></span>
                    : <span style={{ fontSize: 12, color: C.n700 }}>Sin sincronizar</span>}
              </Celda>
              <Celda derecha>
                {/* Los módulos que todavía no se integran desde el MAN muestran «Integrar» sin acción. */}
                {!integrable(m) ? <OutlineButton>Integrar</OutlineButton>
                  : listo ? <OutlineButton onClick={() => router.push(rutaModulo(m))}>Abrir</OutlineButton>
                    : <Button onClick={() => router.push(rutaModulo(m))}>Integrar</Button>}
              </Celda>
            </Fila>
          );
        })}
      </Tabla>
    </ConfigCard>
    </>
  );
}
