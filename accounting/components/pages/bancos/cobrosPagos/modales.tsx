'use client';
import { useState } from 'react';
import { C, radius, shadow, TABLA } from '../../../ui/tokens';
import { SearchInput } from '../../../ui/filtros';
import { BRAND, CUENTAS_CLIENTES, CUENTAS_PROVEEDORES, F } from './datos';

// ── Seleccionar cuenta auxiliar modal ─────────────────────────────────────────
export function SelAuxModal({ tipo, onSelect, onClose }: {
  tipo: 'Cliente' | 'Proveedor'; onSelect: (c: typeof CUENTAS_CLIENTES[0]) => void; onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const lista = tipo === 'Cliente' ? CUENTAS_CLIENTES : CUENTAS_PROVEEDORES;
  const filtered = lista.filter(c => !q || c.nombre.toLowerCase().includes(q.toLowerCase()) || c.code.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:560, maxHeight:'70vh', display:'flex', flexDirection:'column', boxShadow:shadow.modal, fontFamily:F }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Seleccionar cuenta auxiliar</p>
          <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Seleccionar todas</button>
        </div>
        <div style={{ padding:'10px 18px', borderBottom:`1px solid ${C.n500}` }}>
          <SearchInput value={q} onChange={setQ} placeholder="Buscar…" width="100%" />
          {/* Filtro tipo */}
          <div style={{ display:'flex', gap:6, marginTop:8 }}>
            {[tipo, 'Auxiliar'].map(t=>(
              <span key={t} style={{ height:22, padding:'0 10px', borderRadius:radius.pill, background:t===tipo?BRAND:C.n200, color:t===tipo?'#FFFFFF':'#0F0F0F', fontSize:11, display:'flex', alignItems:'center', cursor:'pointer', fontFamily:F }}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          <table className="tabla" style={TABLA.table}>
            <thead><tr style={TABLA.headRow}>
              <th style={{ width:28 }}/>
              {['Mayor','Submayor','Detalle','Auxiliar',tipo].map(h=>(
                <th key={h} style={TABLA.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={TABLA.empty}>Sin resultados.</td></tr>
              )}
              {filtered.map(item=>(
                <tr key={item.code}
                  style={{ borderBottom:'1px solid #ECECEC', cursor:'pointer' }}
                  onMouseEnter={e=>(e.currentTarget.style.background=C.n200)}
                  onMouseLeave={e=>(e.currentTarget.style.background='#FFFFFF')}>
                  <td style={{ padding:'8px 12px' }}>
                    <input type="checkbox" style={{ accentColor:BRAND, width:14, height:14 }}/>
                  </td>
                  <td style={{ padding:'8px 12px', color:BRAND, fontFamily:F }}>100</td>
                  <td style={{ padding:'8px 12px', color:'#0F0F0F' }}>001</td>
                  <td style={{ padding:'8px 12px', color:'#0F0F0F' }}>0001</td>
                  <td style={{ padding:'8px 12px', color:'#0F0F0F' }}>{item.auxId}</td>
                  <td style={{ padding:'8px 12px', color:'#0F0F0F' }}>
                    {item.nombre}
                    {item.tipo==='Cliente' && item.code.includes('CLI0002') && (
                      <span style={{ marginLeft:6, fontSize:10, padding:'1px 6px', borderRadius:4, background:C.successBg, color:C.success, fontWeight:600 }}>Con datos bancarios</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'10px 18px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={()=>filtered[0]&&onSelect(filtered[0])} style={{ height:34, padding:'0 16px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Seleccionar</button>
        </div>
      </div>
    </div>
  );
}
