'use client';
import { useState } from 'react';
import { C, radius, shadow, TABLA } from '@/components/ui/tokens';
import { MontoInput } from './PaginationFooter';
import { csvEscape } from './csvEscape';
import { BRAND, F, type LineaAsiento, MONEDAS, MON_SYM, type Moneda, type Plantilla, fmt2 } from './datos';
import { CuentaLineaSelect, IcCopy, IcPlus } from './piezas';

// ── Modal: editar plantilla - incluye las líneas reales, no solo nombre/moneda ──
export function EditPlantillaModal({ plantilla, onSave, onClose }: { plantilla:Plantilla; onSave:(nombre:string,moneda:Moneda,lineas:LineaAsiento[])=>void; onClose:()=>void }) {
  const [nombre, setNombre] = useState(plantilla.nombre);
  const [moneda, setMoneda] = useState<Moneda>(plantilla.moneda);
  const [lineas, setLineas] = useState<LineaAsiento[]>(() => plantilla.lineas.length ? plantilla.lineas : [{ id:1, cuenta:'', descripcion:'', cCostos:'', debe:0, haber:0 }]);

  function setL(id: number, k: keyof LineaAsiento, v: string|number) { setLineas(p=>p.map(l=>l.id===id?{...l,[k]:v}:l)); }
  function addLinea() { setLineas(p=>[...p,{ id:Date.now(), cuenta:'', descripcion:'', cCostos:'', debe:0, haber:0 }]); }
  function removeLinea(id: number) { setLineas(p=>p.length>1 ? p.filter(l=>l.id!==id) : p); }

  const totalDebe = lineas.reduce((s,l)=>s+l.debe,0);
  const totalHaber = lineas.reduce((s,l)=>s+l.haber,0);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:760, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', flexShrink:0 }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Editar plantilla</p>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#757575' }}>×</button>
        </div>
        <div style={{ padding:'16px 20px', overflowY:'auto', flex:1 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 160px', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Nombre</label>
              <input aria-label="Nombre" value={nombre} onChange={e=>setNombre(e.target.value)} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Moneda</label>
              <div style={{ display:'flex', gap:4 }}>
                {MONEDAS.map(m=>(
                  <button key={m} onClick={()=>setMoneda(m)} style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500, background:moneda===m?BRAND:C.n200, color:moneda===m?'#FFFFFF':'#0F0F0F' }}>
                    {MON_SYM[m]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <p style={{ fontSize:12, fontWeight:600, margin:0 }}>Líneas de la plantilla ({lineas.length})</p>
            <button onClick={addLinea} style={{ height:28, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F, display:'flex', alignItems:'center', gap:4 }}><IcPlus/> Agregar línea</button>
          </div>
          <table className="tabla" style={TABLA.table}>
            <thead>
              <tr style={TABLA.headRow}>
                <th style={TABLA.th}>Cuenta</th>
                <th style={TABLA.th}>Descripción</th>
                <th style={{ ...TABLA.th, width:70 }}>C.C.</th>
                <th style={{ ...TABLA.th, textAlign:'right', width:110 }}>Debe</th>
                <th style={{ ...TABLA.th, textAlign:'right', width:110 }}>Haber</th>
                <th style={{ width:28 }}/>
              </tr>
            </thead>
            <tbody>
              {lineas.map(l=>(
                <tr key={l.id}>
                  <td style={{ padding:'8px 12px' }}><CuentaLineaSelect value={l.cuenta} onChange={v=>setL(l.id,'cuenta',v)}/></td>
                  <td style={{ padding:'4px 12px' }}>
                    <input value={l.descripcion} onChange={e=>setL(l.id,'descripcion',e.target.value)} placeholder="Descripción…" aria-label="Descripción…"
                      style={{ width:'100%', height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                  </td>
                  <td style={{ padding:'4px 12px' }}>
                    <input value={l.cCostos} onChange={e=>setL(l.id,'cCostos',e.target.value)} placeholder="-" aria-label="-"
                      style={{ width:'100%', height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                  </td>
                  <td style={{ padding:'8px 12px' }}>
                    <MontoInput value={l.debe} onChange={v=>setL(l.id,'debe',v)} style={{ width:'100%', height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box', textAlign:'right' }}/>
                  </td>
                  <td style={{ padding:'8px 12px' }}>
                    <MontoInput value={l.haber} onChange={v=>setL(l.id,'haber',v)} style={{ width:'100%', height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box', textAlign:'right' }}/>
                  </td>
                  <td style={{ padding:'4px 0', textAlign:'center' }}>
                    <button onClick={()=>removeLinea(l.id)} aria-label="Quitar línea" title="Quitar línea" disabled={lineas.length===1}
                      style={{ background:'none', border:'none', cursor:lineas.length===1?'default':'pointer', color:lineas.length===1?'#ECECEC':C.error, fontSize:15, lineHeight:1 }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop:'1px solid #ECECEC' }}>
                <td colSpan={3} style={{ padding:'8px 12px', textAlign:'right', fontSize:11, fontWeight:600, color:'#757575' }}>Totales</td>
                <td style={{ padding:'8px 12px', textAlign:'right', fontSize:11, fontWeight:600 }}>{fmt2(totalDebe)}</td>
                <td style={{ padding:'8px 12px', textAlign:'right', fontSize:11, fontWeight:600 }}>{fmt2(totalHaber)}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={()=>onSave(nombre.trim()||plantilla.nombre, moneda, lineas.filter(l=>l.cuenta.trim()||l.debe>0||l.haber>0))} style={{ height:34, padding:'0 16px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
// ── Modal: importar asiento ────────────────────────────────────────────────────
export function ImportarAsientoModal({ onClose }: { onClose:()=>void }) {
  const [file, setFile] = useState<string|null>(null);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:480, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Importar asiento</p>
            <p style={{ fontSize:11, color:C.n700, margin:'3px 0 0' }}>El archivo debe seguir el formato de la plantilla descargable</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:C.n700 }}>×</button>
        </div>
        <div style={{ padding:'20px' }}>
          <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'32px 16px', border:`2px dashed ${C.n500}`, borderRadius:radius.md, cursor:'pointer', background:C.n200, marginBottom:14 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            <span style={{ fontSize:13, fontWeight:500, fontFamily:F }}>Arrastrá tu archivo aquí o hacé clic</span>
            <span style={{ fontSize:11, color:C.n700, fontFamily:F }}>Solo .xlsx o .csv - máximo 10 MB</span>
            <input type="file" accept=".xlsx,.csv" style={{ display:'none' }} onChange={e=>setFile(e.target.files?.[0]?.name||null)}/>
          </label>
          {file && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, marginBottom:14 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#1D9E75" strokeWidth="1.5"><path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6L9 2z"/><path d="M9 2v4h4"/></svg>
              <span style={{ fontSize:12, flex:1, fontFamily:F }}>{file}</span>
              <button onClick={()=>setFile(null)} aria-label="Quitar archivo" title="Quitar archivo" style={{ background:'none',border:'none',cursor:'pointer',color:C.n700,fontSize:16 }}>×</button>
            </div>
          )}
          <button onClick={()=>{
              const headers = ['tipo','origen','fecha','titulo','moneda','importe','usuario','documento','cuenta','descripcion','centro_costo','debe','haber'];
              const blob = new Blob(['﻿'+headers.map(csvEscape).join(',')+'\n'], { type:'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url; link.download = 'plantilla-importar-asientos.csv';
              document.body.appendChild(link); link.click(); document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            style={{ fontSize:12, color:BRAND, background:'none', border:'none', cursor:'pointer', fontFamily:F, textDecoration:'underline', display:'flex', alignItems:'center', gap:5 }}>
            <IcCopy/> Descargar plantilla
          </button>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={onClose} disabled={!file}
            style={{ height:34, padding:'0 16px', background:file?BRAND:'#ECECEC', color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:file?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F }}>
            Importar
          </button>
        </div>
      </div>
    </div>
  );
}
