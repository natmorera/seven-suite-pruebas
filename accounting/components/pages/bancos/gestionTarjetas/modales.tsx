'use client';
import { useState } from 'react';
import { Modal } from '../../../ui/primitives';
import { C, radius, shadow, TABLA } from '../../../ui/tokens';
import { SearchInput } from '../../../ui/filtros';
import { Monto } from '../../../ui/montos';
import { BRAND, ESTADO_STYLE, F, type Liquidacion, VOUCHERS_MOCK, fmt2 } from './datos';
import { Btn, Pill } from './piezas';

// ── Modal: Selección de vouchers ──────────────────────────────────────────────
export function VouchersModal({ onSelect, onClose }: { onSelect: (ids: string[]) => void; onClose: () => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set(['v1','v2','v3']));
  const [q, setQ] = useState('');
  const total = VOUCHERS_MOCK.filter(v=>sel.has(v.id)).reduce((s,v)=>s+v.bruto,0);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:660, boxShadow:shadow.modal, fontFamily:F, display:'flex', flexDirection:'column' }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.n500}` }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Vouchers</p>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.n700 }}>×</button>
          </div>
          <p style={{ fontSize:11, color:C.n700, margin:'3px 0 0' }}>100-001-0001-CLI0001 · Distribuidora ABC S.A. · Moneda: CRC · Total pendiente: ₡1,885,000.00</p>
          <p style={{ fontSize:11, color:C.n700, margin:'2px 0 0' }}>Seleccioná los documentos a aplicar</p>
        </div>
        <div style={{ padding:'10px 18px', borderBottom:`1px solid ${C.n500}`, display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ flex:1 }}>
            <SearchInput value={q} onChange={setQ} placeholder="Buscar por número de documento…" width="100%" />
          </div>
          <span style={{ fontSize:12, color:C.n700 }}>Ordenar:</span>
          {(['Fecha','Monto'] as const).map((o,i) => (
            <button key={o} style={{ height:30, padding:'0 14px', borderRadius:radius.sm, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, background:i===0?BRAND:C.n200, color:i===0?'#FFFFFF':'#0F0F0F', fontWeight:i===0?600:400 }}>{o}</button>
          ))}
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          <table className="tabla" style={TABLA.table}>
            <thead><tr style={TABLA.headRow}>
              <th style={{ ...TABLA.th, width:40 }}>
                <input type="checkbox" checked={sel.size===VOUCHERS_MOCK.length} onChange={()=>setSel(p=>p.size===VOUCHERS_MOCK.length?new Set():new Set(VOUCHERS_MOCK.map(v=>v.id)))} style={{ accentColor:BRAND }}/>
              </th>
              {['Documento','Fecha','Descripción','Imp. original','Saldo pendiente'].map(h=>(
                <th key={h} style={{ ...TABLA.th, textAlign:h.includes('Imp')||h.includes('Saldo')?'right':'left' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {VOUCHERS_MOCK.map(v=>{
                const isSel=sel.has(v.id);
                return (
                  <tr key={v.id} onClick={()=>setSel(p=>{const n=new Set(p);isSel?n.delete(v.id):n.add(v.id);return n;})}
                    style={{ borderBottom:'1px solid #ECECEC', cursor:'pointer', background:isSel?C.brandBg:'#FFFFFF' }}>
                    <td style={{ padding:'8px 12px' }}><input type="checkbox" checked={isSel} readOnly style={{ accentColor:BRAND }}/></td>
                    <td style={{ padding:'8px 12px', color:BRAND, fontFamily:F }}>{v.codigo}</td>
                    <td style={{ padding:'8px 12px' }}>{v.fecha}</td>
                    <td style={{ padding:'8px 12px', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={v.descripcion}>{v.descripcion}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right' }}><Monto sym="₡" valor={fmt2(v.bruto)}/></td>
                    <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:isSel?600:400, color:isSel?BRAND:'#0F0F0F' }}><Monto sym="₡" valor={fmt2(v.bruto)}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'12px 18px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:C.n700 }}>{sel.size} vouchers seleccionados · Total seleccionado: ₡{fmt2(total)}</span>
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="danger" onClick={onClose}>Descartar</Btn>
            <Btn onClick={()=>{onSelect([...sel]);onClose();}}>Cargar</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
// ── Modal: Importar vouchers ──────────────────────────────────────────────────
export function ImportarVouchersModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<string|null>(null);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:400, boxShadow:shadow.modal, fontFamily:F }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Importar vouchers</p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.n700 }}>×</button>
        </div>
        <div style={{ padding:'20px 18px' }}>
          <div onDrop={e=>{e.preventDefault();setFile(e.dataTransfer.files[0]?.name??null);}} onDragOver={e=>e.preventDefault()}
            style={{ border:'1.5px dashed #ECECEC', borderRadius:10, padding:'30px 20px', textAlign:'center', cursor:'pointer' }}
            onClick={()=>setFile('vouchers.xlsx')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ECECEC" strokeWidth="1.5" style={{ marginBottom:10 }}><path d="M12 16V4M8 8l4-4 4 4"/><path d="M3 20h18"/></svg>
            <p style={{ fontSize:12, color:C.n700, margin:'0 0 8px' }}>{file ? file : 'Arrastrá tu archivo aquí o'}</p>
            {!file && <button style={{ height:28, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F }}>Seleccionar archivo</button>}
            <p style={{ fontSize:10, color:C.n700, margin:'8px 0 0' }}>Formatos soportados: .xlsx, .csv - Máx. 5 MB</p>
          </div>
        </div>
        <div style={{ padding:'12px 18px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <Btn variant="danger" onClick={onClose}>Descartar</Btn>
          <Btn disabled={!file} onClick={onClose}>Importar</Btn>
        </div>
      </div>
    </div>
  );
}
// ── Detalle de liquidación (antes no existía nada al hacer clic) ────────────
export function DetalleLiquidacionModal({ liq, onClose, onAnular }: { liq: Liquidacion; onClose:()=>void; onAnular:()=>void }) {
  const sym = liq.moneda==='USD'?'$':'₡';
  const [stColor, stBg] = ESTADO_STYLE[liq.estado];
  const campos: [string,string][] = [
    ['Consecutivo', liq.consecutivo], ['Estado', liq.estado],
    ['Afiliado', liq.afiliado], ['Fecha', liq.fecha],
    ['Cuenta en tránsito', liq.cuentaTransito], ['Referencia', liq.referencia],
    ['Moneda', `${liq.moneda} ${sym}`], ['Importe', `${sym} ${fmt2(liq.importe)}`],
    ['Usuario', liq.usuario], ['N.º Asiento', liq.nroAsiento || 'Sin asiento asociado'],
  ];
  return (
    <Modal open title={`Liquidación ${liq.consecutivo}`} onClose={onClose}
      footer={
        <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
          {liq.estado!=='Anulada' && (
            <button onClick={onAnular} style={{ height:34, padding:'0 14px', border:`1px solid ${C.errorBorder}`, background:C.errorBg, color:C.error, borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>Anular</button>
          )}
          <button onClick={onClose} style={{ height:34, padding:'0 16px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Cerrar</button>
        </div>
      }>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <Pill color={stColor} bg={stBg}>{liq.estado}</Pill>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 16px' }}>
        {campos.map(([l,v])=>(
          <div key={l}>
            <p style={{ fontSize:10, color:C.n700, margin:'0 0 2px', fontFamily:F }}>{l}</p>
            <p style={{ fontSize:12, fontWeight:500, color:'#0F0F0F', margin:0, fontFamily:F }}>{v}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
// ── Enviar por correo ────────────────────────────────────────────────────────
export function CorreoLiquidacionModal({ liq, onClose, onEnviar }: { liq: Liquidacion; onClose:()=>void; onEnviar:(correo:string)=>void }) {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  function enviar() {
    if (!correo.trim() || !/^\S+@\S+\.\S+$/.test(correo.trim())) { setError('Ingresá un correo válido.'); return; }
    onEnviar(correo.trim());
  }
  return (
    <Modal open title={`Enviar liquidación ${liq.consecutivo} por correo`} onClose={onClose}
      footer={
        <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, background:'#FFFFFF', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={enviar} style={{ height:34, padding:'0 16px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Enviar</button>
        </div>
      }>
      <p style={{ fontSize:11, color:C.n700, margin:'0 0 10px', fontFamily:F }}>Correo del destinatario</p>
      <input value={correo} onChange={e=>{setCorreo(e.target.value); setError('');}} placeholder="nombre@empresa.com" autoFocus
        style={{ width:'100%', height:34, padding:'0 10px', border:`1px solid ${error?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
      {error && <p style={{ fontSize:10, color:C.error, margin:'5px 0 0' }}>{error}</p>}
    </Modal>
  );
}
