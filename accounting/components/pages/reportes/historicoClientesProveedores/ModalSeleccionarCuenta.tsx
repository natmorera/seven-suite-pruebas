'use client';
import { useState } from 'react';
import { C, radius } from '@/components/ui/tokens';
import { BRAND, CLIENTES_EC, F, PROVEEDORES_EC, type RangoCP, soloIdAux } from './datos';

// ── Modal: Seleccionar cuenta (una cuenta o rango) ─────────────────
// Sin selector de nivel (Detalle/Auxiliar): en este contexto todas las cuentas
// son auxiliares de clientes o proveedores, ya diferenciados por el radio de arriba.
export function ModalSeleccionarCuenta({ tipo, cuentaId, rango, onSelectCuenta, onSelectRango, onClose }: {
  tipo: 'clientes'|'proveedores'; cuentaId: string; rango: RangoCP|null;
  onSelectCuenta:(id:string)=>void; onSelectRango:(r:RangoCP)=>void; onClose:()=>void;
}) {
  const data = tipo==='clientes' ? CLIENTES_EC : PROVEEDORES_EC;
  const ordenado = [...data].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  const [tab, setTab] = useState<'una'|'rango'>(rango ? 'rango' : 'una');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(cuentaId);
  const [rDesde, setRDesde] = useState(rango?.desde ?? '');
  const [rHasta, setRHasta] = useState(rango?.hasta ?? '');

  const filtrado = ordenado.filter(d => !q || d.nombre.toLowerCase().includes(q.toLowerCase()) || d.id.includes(q));

  function confirmar() {
    if (tab === 'una') {
      onSelectCuenta(sel);
    } else if (rDesde && rHasta) {
      onSelectRango({ desde:rDesde, hasta:rHasta });
    }
    onClose();
  }

  const entidadLabel = tipo==='clientes' ? 'cliente' : 'proveedor';

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:480, maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.3)', fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, flexShrink:0 }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Seleccionar {entidadLabel}</p>
        </div>

        <div style={{ padding:'16px 24px 0', flexShrink:0 }}>
          <div style={{ position:'relative', marginBottom:14 }}>
            <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
              width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#757575" strokeWidth="1.4" strokeLinecap="round">
              <circle cx="6" cy="6" r="4"/><path d="M10.5 10.5L8.5 8.5"/>
            </svg>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder={`Buscar ${entidadLabel}…`} aria-label={`Buscar ${entidadLabel}…`}
              style={{ width:'100%', height:36, paddingLeft:32, paddingRight:12, border:`1px solid ${BRAND}`, borderRadius:radius.md,
                fontSize:13, fontFamily:F, outline:'none', boxSizing:'border-box', color:'#0F0F0F' }}/>
          </div>

          <div style={{ display:'flex', gap:20, borderBottom:`1px solid ${C.n500}`, marginBottom:12 }}>
            {(['una','rango'] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                style={{ padding:'0 0 10px', border:'none', borderBottom:`2px solid ${tab===t?BRAND:'transparent'}`,
                  background:'transparent', cursor:'pointer', fontSize:13, fontFamily:F,
                  fontWeight:tab===t?600:400, color:tab===t?'#0F0F0F':'#757575' }}>
                {t==='una' ? 'Una cuenta' : 'Rango de cuentas'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'0 24px' }}>
          {tab === 'una' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:2, paddingBottom:12 }}>
              <button onClick={()=>setSel('')}
                style={{ display:'flex', justifyContent:'space-between', alignItems:'center', textAlign:'left', padding:'9px 10px',
                  border:'none', borderRadius:radius.sm, background:!sel?C.brandBg:'transparent', fontSize:13, fontFamily:F, cursor:'pointer', color:!sel?BRAND:'#0F0F0F' }}>
                Todas las cuentas
                {!sel && <span style={{ color:BRAND }}>✓</span>}
              </button>
              {filtrado.map(d=>(
                <button key={d.id} onClick={()=>setSel(d.id)}
                  style={{ display:'flex', justifyContent:'space-between', alignItems:'center', textAlign:'left', padding:'9px 10px',
                    border:'none', borderRadius:radius.sm, background:sel===d.id?C.brandBg:'transparent', fontSize:13, fontFamily:F, cursor:'pointer' }}>
                  <span>
                    <span style={{ color:BRAND, fontWeight:500, marginRight:8 }}>{soloIdAux(d.id)}</span>
                    <span style={{ color:'#0F0F0F' }}>{d.nombre}</span>
                  </span>
                  {sel===d.id && <span style={{ color:BRAND }}>✓</span>}
                </button>
              ))}
              {filtrado.length===0 && <p style={{ fontSize:12, color:'#757575', textAlign:'center', padding:'20px 0' }}>Sin resultados.</p>}
            </div>
          ) : (
            <div style={{ paddingBottom:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:8 }}>
                <div>
                  <p style={{ fontSize:11, color:'#757575', margin:'0 0 4px', fontFamily:F }}>Desde</p>
                  <select aria-label="Desde" value={rDesde} onChange={e=>setRDesde(e.target.value)}
                    style={{ width:'100%', height:34, border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, padding:'0 8px', outline:'none' }}>
                    <option value="">Seleccionar…</option>
                    {ordenado.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <p style={{ fontSize:11, color:'#757575', margin:'0 0 4px', fontFamily:F }}>Hasta</p>
                  <select aria-label="Hasta" value={rHasta} onChange={e=>setRHasta(e.target.value)}
                    style={{ width:'100%', height:34, border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, padding:'0 8px', outline:'none' }}>
                    <option value="">Seleccionar…</option>
                    {ordenado.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </div>
              </div>
              <p style={{ fontSize:11, color:'#757575', margin:0, fontFamily:F }}>El rango se aplica según el orden alfabético del nombre.</p>
            </div>
          )}
        </div>

        <div style={{ padding:'14px 24px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={confirmar} disabled={tab==='rango' && (!rDesde || !rHasta)}
            style={{ height:34, padding:'0 16px', background:(tab==='rango' && (!rDesde||!rHasta))?'#ECECEC':BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md,
              cursor:(tab==='rango' && (!rDesde||!rHasta))?'default':'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>
            Seleccionar
          </button>
        </div>
      </div>
    </div>
  );
}
