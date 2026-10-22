'use client';
// Parámetros de un envío de datos entre módulos (por ahora, Front Desk → Accounting): el API Key del otro módulo, si
// todavía no está conectado, y la configuración contable con que Front Desk pasa sus datos a Accounting.
import { C, FONT } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';
import { ModalBase } from '@/components/kit';
import { nombreModulo } from '../../catalogo';
import type { ModuloId } from '../../tipos';
import { ApiKey } from './ApiKey';
import { ContabilidadFrontDesk } from './ContabilidadModulo';
import type { useIntegracion } from './integracion';

export function ConfigurarEnvio({ origen, destino, actual, it, onClose }: {
  origen: ModuloId; destino: ModuloId; actual: ModuloId; it: ReturnType<typeof useIntegracion>; onClose: () => void;
}) {
  const otro = origen === actual ? destino : origen;
  return (
    <ModalBase titulo={`Configurar envío: ${nombreModulo(origen)} → ${nombreModulo(destino)}`} onClose={onClose} ancho={1040}
      pie={<Button onClick={onClose}>Listo</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: FONT }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: C.n900 }}>Conexión de {nombreModulo(otro)}</h3>
          <ApiKey m={otro} it={it} />
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: `1px solid ${C.n500}`, paddingTop: 18 }}>
          <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: C.n900 }}>Contabilidad</h3>
          <ContabilidadFrontDesk />
        </section>
      </div>
    </ModalBase>
  );
}
