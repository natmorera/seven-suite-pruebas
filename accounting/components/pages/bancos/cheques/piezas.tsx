'use client';
import { radius } from '../../../ui/tokens';
import { BRAND, type Cheque, F, RED } from './datos';

export function Field({ label, required, children }:{ label:string; required?:boolean; children:React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize:11,fontWeight:500,color:'#757575',margin:'0 0 5px',fontFamily:F }}>
        {label}{required&&<span style={{ color:RED }}> *</span>}
      </p>
      {children}
    </div>
  );
}
export function ChevronSelect() {
  return <svg style={{ position:'absolute',right:9,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }}
    width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>;
}
// ── Acción icons por estado ────────────────────────────────────────────────────
export function AccionesRow({ ch, onEmitir, onAnular, onVer, onContabilizar, onPrint, onMail }:{
  ch:Cheque; onEmitir:()=>void; onAnular:()=>void; onVer:()=>void; onContabilizar:()=>void; onPrint:()=>void; onMail:()=>void;
  onGen:()=>void;
}) {
  const IcView = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 7C1 7 3.5 2.5 7 2.5S13 7 13 7 10.5 11.5 7 11.5 1 7 1 7z"/><circle cx="7" cy="7" r="2"/></svg>;
  const IcPrint = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5V1.5h7V5M1.5 5h11v6h-11z"/></svg>;
  const IcMail = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1.5" y="3.5" width="11" height="7" rx="1.5"/><path d="M1.5 3.5L7 7.5L12.5 3.5"/></svg>;
  const IcStar = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.5l1.54 3.13L12 5.13l-2.5 2.44.59 3.43L7 9.38 4.91 11 5.5 7.57 3 5.13l3.46-.5z"/></svg>;
  const IcCancel = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M9.5 4.5L4.5 9.5M4.5 4.5L9.5 9.5"/></svg>;

  const iconBtn = (onClick:()=>void, icon:React.ReactNode, color='#757575', title='') => (
    <button onClick={e=>{e.stopPropagation();onClick();}} title={title} aria-label={title||'acción'}
      style={{ width:28,height:28,border:`1px solid #ECECEC`,borderRadius:radius.sm,background:'#FFFFFF',
        cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color }}>
      {icon}
    </button>
  );

  if (ch.estado==='Pendiente') return (
    <div style={{ display:'flex',gap:4,alignItems:'center' }}>
      <button onClick={e=>{e.stopPropagation();onEmitir();}}
        style={{ height:26,padding:'0 10px',border:'none',borderRadius:radius.sm,background:BRAND,
          color:'#FFFFFF',cursor:'pointer',fontSize:11,fontFamily:F,fontWeight:500 }}>Emitir</button>
      {iconBtn(()=>{}, <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9.5 1.5L12.5 4.5L5 12H2v-3L9.5 1.5z"/></svg>, BRAND, 'Editar')}
      {iconBtn(onAnular, <IcCancel/>, '#757575', 'Anular')}
    </div>
  );

  if (ch.estado==='Emitido') return (
    <div style={{ display:'flex',gap:4,alignItems:'center' }}>
      <button onClick={e=>{e.stopPropagation();onVer();}} style={{ height:26,padding:'0 10px',border:'1px solid #ECECEC',borderRadius:radius.sm,background:'#FFFFFF',color:'#757575',cursor:'pointer',fontSize:11,fontFamily:F }}>
        Ver asiento
      </button>
      {iconBtn(onVer, <IcView/>, '#757575', 'Ver')}
      {iconBtn(onPrint, <IcPrint/>, '#757575', 'Imprimir')}
      {iconBtn(onMail, <IcMail/>, '#757575', 'Enviar por correo')}
      {iconBtn(onAnular, <IcCancel/>, '#757575', 'Anular')}
    </div>
  );

  if (ch.estado==='Generado') return (
    <div style={{ display:'flex',gap:4,alignItems:'center' }}>
      {iconBtn(onContabilizar, <IcStar/>, BRAND, 'Contabilizar')}
      {iconBtn(onVer, <IcView/>, BRAND, 'Ver')}
      {iconBtn(onPrint, <IcPrint/>, BRAND, 'Imprimir')}
      {iconBtn(onMail, <IcMail/>, BRAND, 'Enviar por correo')}
      {iconBtn(onAnular, <IcCancel/>, RED, 'Anular')}
    </div>
  );

  if (ch.estado==='Contabilizado') return (
    <div style={{ display:'flex',gap:4,alignItems:'center' }}>
      {iconBtn(onVer, <IcView/>, BRAND, 'Ver')}
      {iconBtn(onPrint, <IcPrint/>, BRAND, 'Imprimir')}
      {iconBtn(onMail, <IcMail/>, BRAND, 'Enviar por correo')}
      {iconBtn(onAnular, <IcCancel/>, '#757575', 'Anular')}
    </div>
  );

  return <span style={{ fontSize:11,color:'#757575',fontFamily:F }}>-</span>;
}
