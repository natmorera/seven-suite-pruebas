'use client';
// Auditoría: piezas compartidas por la gestión y el asistente (visor de reporte y configuración de cierre).
import { useState } from 'react';
import { C } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Modal } from '@/components/suite/ui';
import { useHotel } from '@/components/hotel/store';
import { HOY, fmtF } from '@/components/hotel/datos';
import { PARAMS_CIERRE, ultimaAuditoria, type ConfigCierre } from '@/components/hotel/auditoria';
import { Visor } from '@/components/facturacion/comun';
import { exportarCSV } from '@/components/hotel/ui';
import { HojaAuditoria, filasExport, generarReporte } from './motor';

export const Ok = ({ on }: { on: boolean }) => <span aria-label={on ? 'Sí' : 'No'} style={{ display: 'inline-flex', width: 15, height: 15, borderRadius: '50%', background: on ? C.brand : C.n500, color: '#fff', fontSize: 9, alignItems: 'center', justifyContent: 'center' }}>✓</span>;
/** Visor de un reporte de auditoría (imprimir / exportar). */
export function VerReporte({ codigo, fecha, onClose }: { codigo: string; fecha: string; onClose: () => void }) {
  const h = useHotel();
  const d = generarReporte(h, codigo, fecha);
  const x = filasExport(d);
  return <Visor titulo={d.titulo} onClose={onClose} ancho={1000} onCSV={() => exportarCSV(`auditoria-${codigo.replace(/\W/g, '')}`, x.headers, x.filas)}><HojaAuditoria d={d} fecha={fecha} /></Visor>;
}

export function ConfigCierreModal({ onClose, onListo }: { onClose: () => void; onListo: () => void }) {
  const h = useHotel();
  const [c, setC] = useState<ConfigCierre>(h.cfgCierre);
  const ult = ultimaAuditoria(h);
  const fila = (l: string, v: React.ReactNode) => <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 12 }}><span style={{ color: C.n700 }}>{l}</span>{v}</div>;
  return (
    <Modal open title="Configuración de Cierre Diario" onClose={onClose} width={640}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => { h.guardarCfgCierre(c); onListo(); }}>Guardar cambios</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Parámetros Generales</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {PARAMS_CIERRE.map(p => <Checkbox key={p} checked={!!c.params[p]} onChange={b => setC({ ...c, params: { ...c.params, [p]: b } })} label={p} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 30px', borderTop: `1px solid ${C.n500}`, paddingTop: 14 }}>
          {fila('Días de lista cierre', <span style={{ width: 90 }}><Input value={c.diasLista} onChange={v => setC({ ...c, diasLista: Math.max(1, Number(v.replace(/\D/g, '')) || 1) })} style={{ textAlign: 'right' }} /></span>)}
          {fila('Fecha Hotelera:', <b>{fmtF(HOY)}</b>)}
          {fila('Consecutivo de cierre:', <b>{(ult?.numero ?? 5582) + 1}</b>)}
          {fila('Fecha último cierre:', <b>{fmtF(ult?.fecha)}</b>)}
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>Contraseña para cierres seguidos (lapso menor a 20 horas)
          <span style={{ width: 200 }}><Input type="password" value={c.password} onChange={v => setC({ ...c, password: v })} /></span></label>
      </div>
    </Modal>
  );
}
