'use client';
import { BRAND, type Cheque, F, fmtN } from './datos';
import { ModalShell } from './modales';

// ── Modal Ver cheque (lectura) ──────────────────────────────────────────────────
export function ModalVerCheque({ cheque, onClose, onVerRetencion }:{ cheque:Cheque; onClose:()=>void; onVerRetencion:()=>void }) {
  const importeNeto = cheque.totalDoc - cheque.retencion;
  const filas: [string,string][] = [
    ['Estado', cheque.estado],
    ['Consecutivo', cheque.consec],
    ['Número de cheque', cheque.chequeNro ?? '-'],
    ['Proveedor', cheque.proveedor],
    ['Banco / Cuenta', `${cheque.banco} · ${cheque.cuenta}`],
    ['Fecha', cheque.fecha],
    ['N° Asiento', cheque.nroAsiento ?? '-'],
    ['Total documento', `₡ ${fmtN(cheque.totalDoc)}`],
    ['Retención', `₡ ${fmtN(cheque.retencion)}`],
    ['Importe neto', `₡ ${fmtN(importeNeto)}`],
    ['Usuario', cheque.usuario],
  ];
  return (
    <ModalShell title="Detalle del cheque" subtitle={`Consecutivo ${cheque.consec}`} onClose={onClose} width={420}
      footer={<div style={{ display:'flex',justifyContent:'space-between',gap:8 }}>
        {cheque.retencion>0
          ? <button onClick={onVerRetencion} style={{ height:32,padding:'0 14px',border:'1px solid #ECECEC',borderRadius:7,background:'#FFFFFF',cursor:'pointer',fontSize:12,fontFamily:F,color:BRAND }}>Ver detalle de retención</button>
          : <span/>}
        <button onClick={onClose} style={{ height:32,padding:'0 16px',border:'none',borderRadius:7,background:BRAND,color:'#FFFFFF',cursor:'pointer',fontSize:12,fontFamily:F,fontWeight:500 }}>Cerrar</button>
      </div>}>
      <div style={{ padding:20,display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
        {filas.map(([l,v])=>(
          <div key={l}>
            <p style={{ fontSize:10,color:'#757575',margin:'0 0 3px',fontFamily:F }}>{l}</p>
            <p style={{ fontSize:13,fontWeight:500,color:'#0F0F0F',margin:0,fontFamily:F }}>{v}</p>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
