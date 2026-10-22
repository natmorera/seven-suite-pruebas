'use client';
// Detalle de un módulo que se integra desde el MAN (?modulo=<id>: el producto contable y Front Desk), con los pasos en orden.
// 1) Conexión: se pega el API Key que genera el módulo y se valida. 2) Envío de datos: a qué módulos envía y de cuáles
// recibe, con la configuración de cada enlace que la necesita. 3) Perfiles compartidos: se unen los perfiles del módulo
// y de los módulos enlazados. El pie «Verificar y guardar» comprueba todo, crea los enlaces y guarda la integración.
import { useRouter } from 'next/navigation';
import { C, FONT } from '@/components/suite/tokens';
import { JuntoAlTitulo, VolverEnTitulo } from '@/components/layout/Pantalla';
import { useGuardadoPropio } from '@/components/layout/Shell';
import { ConfigCard, Insignia } from '@/components/kit';
import { nombreModulo } from '../../catalogo';
import type { ModuloId } from '../../tipos';
import { ApiKey } from './ApiKey';
import { EnvioDatos } from './EnvioDatos';
import { integrable, resumen, useIntegracion, type Paso } from './integracion';
import { PasoPerfiles } from './PasoPerfiles';
import { TarjetaPaso } from './TarjetaPaso';
import { PieIntegracion } from './Verificacion';

export default function DetalleModulo({ m }: { m: ModuloId }) {
  const router = useRouter();
  const it = useIntegracion();
  // Esta pantalla guarda con su propio pie; el header no muestra «Guardar cambios».
  useGuardadoPropio();
  const volver = () => router.push('/modulos');
  const nombre = nombreModulo(m);
  if (!it.contratados.includes(m) || !integrable(m)) return (
    <>
      <VolverEnTitulo onClick={volver} label="Volver a módulos" />
      <ConfigCard title={nombre}><span style={{ fontSize: 12.5, color: C.n700 }}>
        {it.contratados.includes(m) ? 'Este módulo todavía no se integra desde el MAN.' : 'La empresa no tiene contratado este módulo.'}
      </span></ConfigCard>
    </>
  );
  const pasos = it.pasos(m);
  const paso = (id: Paso['id']) => pasos.find(p => p.id === id);
  const numero = (id: Paso['id']) => pasos.findIndex(p => p.id === id) + 1;
  const conectado = it.conectado(m);
  const estado = resumen(pasos);
  const falta = pasos.filter(p => p.id !== 'verificacion' && !p.hecho)
    .map(p => (p.id === 'envio' ? 'envío de datos (configurar los enlaces marcados)' : p.titulo.toLowerCase())).join('; ');

  return (
    <>
      <VolverEnTitulo onClick={volver} label="Volver a módulos" />
      <JuntoAlTitulo>
        <span style={{ fontSize: 16, color: C.n700 }}>› {nombre}</span>
        <Insignia label={estado.etiqueta} color={estado.listo ? 'green' : 'yellow'} />
      </JuntoAlTitulo>
      <TarjetaPaso n={numero('conexion')} titulo="Conexión" hecho={!!paso('conexion')?.hecho} pendiente="Sin conectar">
        <ApiKey m={m} it={it} />
      </TarjetaPaso>
      <TarjetaPaso n={numero('envio')} titulo="Envío de datos" hecho={!!paso('envio')?.hecho} pendiente="Por configurar">
        {conectado ? <EnvioDatos m={m} it={it} /> : <span style={{ fontSize: 12.5, color: C.n700, fontFamily: FONT }}>Disponible al conectar el módulo.</span>}
      </TarjetaPaso>
      {paso('perfiles') && <PasoPerfiles m={m} n={numero('perfiles')} it={it} conectado={conectado} />}
      <PieIntegracion m={m} it={it} previosListos={pasos.filter(p => p.id !== 'verificacion').every(p => p.hecho)} onSalir={volver} falta={falta} />
    </>
  );
}
