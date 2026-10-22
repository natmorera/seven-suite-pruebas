'use client';
// Al hacer clic en el emisor de una compra: sus datos, lo que se le ha
// comprado y, si tiene perfil en Clientes y proveedores, acceso directo.
import { useState } from 'react';
import Link from 'next/link';
import { C, FONT, Button, radius } from '@/components/ui/primitives';
import { Flotante } from './NuevaFacturaPartes';
import { MontoCelda } from '@/components/ui/Monto';
import type { CompraRow } from './comprasComun';
import { soloDigitos } from '@/lib/xmlCompra';
import { simboloLocal, esGuatemalaActual } from '@/lib/paisActual';

export interface ProveedorPerfil { id: string; nombre: string; numero_identificacion: string | null; email: string | null; compras_auto?: number | null; cuenta_gasto?: string | null }

export default function EmisorCompra({ nombre, identificacion, correo, compras, proveedores, onVerComprobante }: {
  nombre: string; identificacion: string; correo?: string | null;
  compras: CompraRow[]; proveedores: ProveedorPerfil[];
  onVerComprobante?: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [ancla, setAncla] = useState<HTMLSpanElement | null>(null);
  const ced = soloDigitos(identificacion);
  const perfil = ced ? proveedores.find(p => soloDigitos(p.numero_identificacion ?? '') === ced) : undefined;
  const suyas = ced ? compras.filter(c => soloDigitos(c.proveedor_identificacion ?? '') === ced) : compras.filter(c => c.proveedor === nombre);
  const totalCrc = suyas.reduce((a, c) => a + Number(c.total_factura ?? 0) * (c.moneda === 'USD' ? Number(c.tipo_cambio ?? 1) : 1), 0);
  const ultima = suyas.map(c => c.fecha_emision).sort().pop();
  const fila = (l: string, v: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, padding: '3px 0' }}>
      <span style={{ color: C.n700 }}>{l}</span><span style={{ color: C.n900, textAlign: 'right' }}>{v}</span>
    </div>
  );

  return (
    <span ref={setAncla} style={{ display: 'inline-block' }}>
      <button onClick={() => setAbierto(v => !v)} onBlur={() => setTimeout(() => setAbierto(false), 150)}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.brand, textDecoration: 'underline', fontFamily: FONT, fontSize: 12, textAlign: 'left', fontWeight: 500 }}>
        {nombre}
      </button>
      <Flotante anchor={ancla} open={abierto} width={320}>
        <div style={{ padding: 14, fontFamily: FONT }} onMouseDown={e => e.preventDefault()}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.n900 }}>{nombre}</div>
          <div style={{ fontSize: 11.5, color: C.n700, marginBottom: 8 }}>{identificacion ? `${esGuatemalaActual() ? 'NIT' : 'Céd.'} ${identificacion}` : 'Sin identificación'}{correo ? ` · ${correo}` : ''}</div>
          <div style={{ borderTop: `1px solid ${C.n200}`, paddingTop: 6 }}>
            {fila('Compras registradas', suyas.length)}
            {suyas.length > 0 && fila('Total comprado', <MontoCelda valor={totalCrc} simbolo={simboloLocal()} />)}
            {ultima && fila('Última compra', new Date(ultima).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }))}
            {perfil && fila('Importación automática', Number(perfil.compras_auto ?? 1) === 0 ? 'Apagada' : 'Encendida')}
          </div>
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: radius.md, background: perfil ? C.brandBg : C.n200, fontSize: 11.5, color: C.n700 }}>
            {perfil ? 'Tiene perfil en Clientes y proveedores.' : 'Todavía no tiene perfil. Se crea al importar su primera factura.'}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {perfil && <Link href={`/clientes?tipo=04&nombre=${encodeURIComponent(perfil.nombre)}`} style={{ textDecoration: 'none' }}><Button>Abrir perfil</Button></Link>}
            {onVerComprobante && <Button variant="secondary" onClick={() => { setAbierto(false); onVerComprobante(); }}>Ver comprobante</Button>}
          </div>
        </div>
      </Flotante>
    </span>
  );
}
