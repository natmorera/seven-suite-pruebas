'use client';
import { Button } from '@/components/ui/formulario';
import { C } from '@/components/ui/tokens';
import { type Firma, type FirmaReporte } from '@/components/pages/config/firmasConfig';
import { F } from './datos';

export function ConfirmDelete({ onConfirm, onCancel, label }: { onConfirm:()=>void; onCancel:()=>void; label:string }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.35)',zIndex:1002,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'#FFFFFF',borderRadius:10,padding:24,maxWidth:380,width:'90%',fontFamily:F,boxShadow:'0 8px 40px rgba(0,0,0,.18)' }}>
        <h3 style={{ fontSize:14,fontWeight:500,margin:'0 0 12px' }}>Eliminar firma</h3>
        <p style={{ fontSize:12,color:C.n700,marginBottom:20 }}>¿Eliminar la firma de <strong>{label}</strong>? Esta acción no se puede deshacer.</p>
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm}>Eliminar</Button>
        </div>
      </div>
    </div>
  );
}
// Al guardar, si el orden elegido ya lo tiene otra firma en ese reporte, esa otra (y en cascada
// las que sigan) pasa al siguiente número libre; el orden que se acaba de escribir queda
// intacto.
export function resolverConflictosOrden(lista: Firma[], editada: Firma): Firma[] {
  let resultado = lista;
  for (const rel of editada.reportes) {
    const otras = resultado
      .filter(x => x.id !== editada.id)
      .map(x => ({ firma: x, rel: x.reportes.find(r => r.reporteKey === rel.reporteKey) }))
      .filter((x): x is { firma: Firma; rel: FirmaReporte } => !!x.rel)
      .sort((a, b) => a.rel.orden - b.rel.orden);

    const usados = new Set<number>([rel.orden]);
    const cambios = new Map<string, number>();
    for (const { firma, rel: r } of otras) {
      let o = r.orden;
      while (usados.has(o)) o++;
      if (o !== r.orden) cambios.set(firma.id, o);
      usados.add(o);
    }
    if (cambios.size > 0) {
      resultado = resultado.map(x => {
        const nuevoOrden = cambios.get(x.id);
        if (nuevoOrden === undefined) return x;
        return { ...x, reportes: x.reportes.map(r => r.reporteKey === rel.reporteKey ? { ...r, orden: nuevoOrden } : r) };
      });
    }
  }
  return resultado;
}
