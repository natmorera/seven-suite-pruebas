'use client';
import { useState } from 'react';
import { PageHeader, C, Section, StatusBadge, Button, InfoBox } from '@/components/ui/primitives';

interface Sistema {
  id: string;
  nombre: string;
  descripcion: string;
  conectado: boolean;
  origen: string; // valor que llega en el campo "origen" del documento
}

const SISTEMAS: Sistema[] = [
  { id: 'pms', nombre: 'Front Desk', descripcion: 'Genera la factura al hacer check-out de una reserva.', conectado: true, origen: 'Front Desk' },
  { id: 'pos', nombre: 'Punto de Venta (POS)', descripcion: 'Genera la factura al cerrar una cuenta de restaurante, bar o spa.', conectado: true, origen: 'Punto de Venta (POS)' },
  { id: 'inv', nombre: 'Inventario', descripcion: 'Genera la factura al despachar una venta de bodega/almacén.', conectado: false, origen: 'Inventario' },
  { id: 'tour', nombre: 'Tour Operador', descripcion: 'Genera la factura al confirmar un tour o excursión vendida.', conectado: false, origen: 'Tour Operador' },
];

// Referencia de prueba distinta en cada envío.
function referenciaDemo() { return 'DEMO-' + Math.floor(Math.random() * 9000 + 1000); }

export default function IntegracionesPage({ hideHeader }: { hideHeader?: boolean } = {}) {
  const sistemas = SISTEMAS;
  const [probando, setProbando] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Record<string, string>>({});

  async function probarConexion(s: Sistema) {
    setProbando(s.id);
    try {
      const res = await fetch('/api/documentos/externo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'Factura electrónica', emisorId: 'em-1', cajaId: 'caja-1',
          receptorNombre: 'Consumidor final', origen: s.origen, origenReferencia: referenciaDemo(),
          condicionVenta: 'Contado', moneda: 'CRC', tipoCambio: 1,
          lineas: [{ codigoCabys: '6311100000000', descripcion: `Cargo de prueba desde ${s.nombre}`, cantidad: 1, precioUnitario: 15000, impuesto: 13 }],
        }),
      });
      const data = await res.json();
      setResultado(r => ({ ...r, [s.id]: res.ok ? `✓ Documento ${data.id} creado. Puedes verlo en Documentos emitidos.` : `Error: ${data.error}` }));
    } catch {
      setResultado(r => ({ ...r, [s.id]: 'No se pudo conectar.' }));
    }
    setProbando(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!hideHeader && <PageHeader title="Integraciones" />}
      <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680 }}>
        <InfoBox>
          Este módulo de facturación es parte de la suite hotelera. En la mayoría de los casos
          el documento no se teclea aquí, nace en otro módulo (check-out, cierre de cuenta,
          despacho de bodega, venta de tour) y llega mediante <code>POST /api/documentos/externo</code>.
          «Manual» (crear desde Documentos emitidos) queda como la excepción, no la regla.
        </InfoBox>

        {sistemas.map(s => (
          <Section key={s.id} title={s.nombre}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 12, color: C.n700, margin: 0, maxWidth: 440 }}>{s.descripcion}</p>
                <StatusBadge label={s.conectado ? 'Conectado' : 'No conectado'} color={s.conectado ? 'green' : 'gray'} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Button variant="secondary" onClick={() => probarConexion(s)} disabled={probando === s.id}>
                  {probando === s.id ? 'Enviando…' : 'Probar conexión (crea un documento de ejemplo)'}
                </Button>
                {resultado[s.id] && <span style={{ fontSize: 11.5, color: resultado[s.id].startsWith('✓') ? '#1e7a3a' : C.error }}>{resultado[s.id]}</span>}
              </div>
            </div>
          </Section>
        ))}
      </div>
    </div>
  );
}
