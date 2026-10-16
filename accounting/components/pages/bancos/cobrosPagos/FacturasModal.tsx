'use client';
import { useState } from 'react';
import { C, radius, TABLA } from '../../../ui/tokens';
import { fmtNum } from '../../../ui/formato';
import { BRAND, F, type Factura } from './datos';

// ── Modal: Seleccionar facturas ───────────────────────────────────────────────
export function FacturasModal({ facturas, onApply, onClose }: {
  facturas: Factura[];
  onApply: (selected: Factura[]) => void;
  onClose: () => void;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set(facturas.filter(f => f.abono).map(f => f.id)));
  const [abonos, setAbonos] = useState<Record<string, number>>(
    Object.fromEntries(facturas.map(f => [f.id, f.abono ?? f.saldoPendiente]))
  );

  const toggleAll = (checked: boolean) => setSel(checked ? new Set(facturas.map(f => f.id)) : new Set());
  const toggle = (id: string) => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const totalSel = facturas.filter(f => sel.has(f.id)).reduce((s, f) => s + (abonos[f.id] ?? 0), 0);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:700,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:'100%', maxWidth:720,
        boxShadow:'0 16px 48px rgba(0,0,0,.22)', fontFamily:F, display:'flex', flexDirection:'column', maxHeight:'80vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Seleccionar facturas</p>
            <p style={{ fontSize:11, color:C.n700, margin:'2px 0 0' }}>Seleccioná los documentos a aplicar en esta operación</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, fontSize:20, padding:'0 4px' }}>×</button>
        </div>

        {/* Table */}
        <div style={{ flex:1, overflowY:'auto' }}>
          <table className="tabla" style={TABLA.table}>
            <thead style={{ position:'sticky', top:0, background:'#FFFFFF', zIndex:2 }}>
              <tr style={TABLA.headRow}>
                <th style={{ ...TABLA.th, width:36 }}>
                  <input type="checkbox"
                    checked={sel.size === facturas.length}
                    onChange={e => toggleAll(e.target.checked)}
                    style={{ width:14, height:14, accentColor:BRAND }}/>
                </th>
                {['Documento','Fecha','Descripción','Importe original','Saldo pendiente','Abono'].map((h,i) => (
                  <th key={h} style={{ ...TABLA.th, textAlign:i >= 3 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facturas.map(f => {
                const isSel = sel.has(f.id);
                return (
                  <tr key={f.id} onClick={() => toggle(f.id)}
                    style={{ borderBottom:'1px solid #ECECEC', cursor:'pointer', background:isSel ? C.brandBg : '#FFFFFF' }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = C.n200; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSel ? C.brandBg : '#FFFFFF'; }}>
                    <td style={{ padding:'8px 12px' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSel} onChange={() => toggle(f.id)}
                        style={{ width:14, height:14, accentColor:BRAND }}/>
                    </td>
                    <td style={{ padding:'8px 12px', color:BRAND, fontFamily:F }}>{f.documento}</td>
                    <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>{f.fecha}</td>
                    <td style={{ padding:'8px 12px', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={f.descripcion}>{f.descripcion}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:100 }}>
                        <span>₡</span>
                        <span>{fmtNum(f.importeOriginal, 2)}</span>
                      </div>
                    </td>
                    <td style={{ padding:'8px 12px', textAlign:'right', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:100 }}>
                        <span>₡</span>
                        <span>{fmtNum(f.saldoPendiente, 2)}</span>
                      </div>
                    </td>
                    <td style={{ padding:'8px 12px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:4, minWidth:110 }}>
                        <span>₡</span>
                        <input
                          type="number"
                          value={abonos[f.id] ?? ''}
                          onChange={e => { setAbonos(p => ({ ...p, [f.id]: +e.target.value || 0 })); if (!sel.has(f.id)) toggle(f.id); }}
                          style={{ width:100, height:28, padding:'0 7px', border:`1px solid ${isSel ? BRAND : C.n500}`,
                            borderRadius:5, fontSize:11, fontFamily:F, outline:'none', textAlign:'right', boxSizing:'border-box' }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ fontSize:12, color:C.n700 }}>
            <span style={{ marginRight:16 }}>{sel.size} documento{sel.size !== 1 ? 's' : ''} seleccionado{sel.size !== 1 ? 's' : ''}</span>
            <span>Total abono: <strong style={{ color:BRAND }}>₡ {fmtNum(totalSel, 2)}</strong></span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`,
              borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
            <button
              onClick={() => { onApply(facturas.filter(f => sel.has(f.id)).map(f => ({ ...f, abono: abonos[f.id] }))); onClose(); }}
              style={{ height:34, padding:'0 16px', background:BRAND, color:'#FFFFFF', border:'none',
                borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>
              Aplicar selección
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
