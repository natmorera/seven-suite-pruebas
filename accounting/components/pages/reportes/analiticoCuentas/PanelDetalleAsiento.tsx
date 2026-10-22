'use client';
import { PERMISOS_ACTUAL } from '@/components/ui/tokens';
import { DetalleDrawer } from '@/components/pages/asientos/detalleDrawer/DetalleDrawer';
import { type EstadoMov } from './datos';
import { type EstadoAnalitico } from './useAnalitico';

// Detalle del asiento seleccionado en el analítico
export function PanelDetalleAsiento({ e }: { e: EstadoAnalitico }) {
  const { detalleAsiento, setDetalleAsiento, setMovimientos } = e;
  if (!detalleAsiento) return null;
  return (
        <DetalleDrawer
          asiento={{
            id: detalleAsiento.id,
            tipo: detalleAsiento.tipo,
            origen: detalleAsiento.modulo,
            fecha: detalleAsiento.fecha,
            consecutivo: detalleAsiento.consecutivo,
            titulo: detalleAsiento.descripcion,
            moneda: detalleAsiento.moneda as 'CRC'|'USD',
            importe: detalleAsiento.debe || detalleAsiento.haber,
            usuario: 'sistema',
            documento: detalleAsiento.documento,
            observacion: detalleAsiento.observacion ?? '',
            contabilizado: detalleAsiento.estado === 'Contabilizado',
            archivos: detalleAsiento.archivos ?? [],
            historial: detalleAsiento.historial ?? [],
            conciliacion: detalleAsiento.conciliacion ?? null,
            lineas: [
              { id:1, cuenta:detalleAsiento.cuentaCode, descripcion:detalleAsiento.descripcion, cCostos:'-', debe:detalleAsiento.debe, haber:0 },
              { id:2, cuenta:'400-010-0001', descripcion:'Contrapartida', cCostos:'-', debe:0, haber:detalleAsiento.debe },
            ],
          }}
          onClose={()=>setDetalleAsiento(null)}
          onAnular={()=>{}}
          onDuplicar={()=>{}}
          tienePermisoDescontabilizar={PERMISOS_ACTUAL.descontabilizarAsientos}
          onContabilizar={(payload)=>{
            // La confirmación (motivo, desconciliar, permisos) ya ocurrió dentro del propio drawer.
            if (detalleAsiento.estado === 'Contabilizado') {
              setMovimientos(p => p.map(x => x.id === detalleAsiento.id ? { ...x, estado:'Pendiente' as EstadoMov,
                historial:[...(x.historial??[]), { color:'#EF9F27', texto:`Descontabilizado${payload?.desconciliar?' y desconciliado':''} - ${payload?.motivo ?? ''}`, fecha:new Date().toLocaleString('es-CR'), usuario:'usuario actual' }] } : x));
            } else {
              setMovimientos(p => p.map(x => x.id === detalleAsiento.id ? { ...x, estado:'Contabilizado' as EstadoMov } : x));
            }
            setDetalleAsiento(null);
          }}
        />
  );
}
