'use client';
import { useState } from 'react';
import { Modal } from '@/components/ui/primitives';
import { Button } from '@/components/ui/formulario';
import { radius , C } from '@/components/ui/tokens';
import { BRAND, F } from './datos';

// ── Modales ───────────────────────────────────────────────────────────────────
export function ModalExIm({ onClose }: { onClose:()=>void }) {
  const [tab, setTab] = useState<'exportar'|'importar'>('exportar');
  const [file, setFile] = useState('');
  return (
    <Modal open title="Exportar / Importar - Plan de cuentas" onClose={onClose}
      footer={<div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        {tab==='exportar'?<Button>Exportar Excel</Button>:<Button disabled={!file}>Importar</Button>}
      </div>}>
      <div style={{ display:'flex', gap:0, marginBottom:14, borderBottom:`1px solid ${C.n500}` }}>
        {(['exportar','importar'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'7px 14px', fontSize:11, fontFamily:F, border:'none', background:'none', cursor:'pointer', color:tab===t?BRAND:C.n700, borderBottom:`2px solid ${tab===t?BRAND:'transparent'}` }}>
            {t==='exportar'?'Exportar':'Importar'}
          </button>
        ))}
      </div>
      {tab==='exportar'
        ? <p style={{ fontSize:11, color:C.n700, fontFamily:F }}>Descarga el catálogo completo en formato Excel.</p>
        : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <p style={{ fontSize:11, color:C.n700, fontFamily:F }}>El archivo debe seguir el formato de la plantilla.</p>
            {file
              ? <div style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 12px', border:`1px solid ${C.success}`, borderRadius:radius.md, background:'rgba(76,175,80,.05)' }}>
                  <span style={{ color:C.success }}>✓</span>
                  <span style={{ fontSize:11, flex:1, fontFamily:F }}>{file}</span>
                  <button onClick={()=>setFile('')} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700 }}>✕</button>
                </div>
              : <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7, padding:28, border:`2px dashed ${C.n500}`, borderRadius:radius.md, cursor:'pointer', background:C.n200 }}>
                  <span style={{ fontSize:12, fontWeight:500, color:C.n900, fontFamily:F }}>Arrastrá tu archivo acá</span>
                  <span style={{ fontSize:10.5, color:C.n700, fontFamily:F }}>Solo .xlsx</span>
                  <input type="file" accept=".xlsx" style={{ display:'none' }} onChange={e=>setFile(e.target.files?.[0]?.name||'')}/>
                </label>
            }
            <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Descargar plantilla</button>
          </div>
      }
    </Modal>
  );
}
export function ModalEstructura({ onClose }: { onClose:()=>void }) {
  return (
    <Modal open title="Estructura del código contable" onClose={onClose}>
      <p style={{ fontSize:11, color:C.n700, margin:'0 0 14px', fontFamily:F }}>
        El código contable se construye concatenando los segmentos de cada nivel con el separador configurado en Parámetros generales.
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {[
          { nivel:'1. Mayor',       ejemplo:'100',                  color:'#E6F1FB', text:'#0C447C', seg:'3 dígitos' },
          { nivel:'2. Sub mayor',   ejemplo:'100-001',              color:'#EAF3DE', text:'#3B6D11', seg:'3 dígitos' },
          { nivel:'3. Detalle',     ejemplo:'100-001-0001',         color:'#FAEEDA', text:'#633806', seg:'4 dígitos' },
          { nivel:'4. ID auxiliar', ejemplo:'100-001-0001-CLI0001', color:'#EEEDFE', text:'#3C3489', seg:'CLI/PRO-XXXX', nota:'Solo cuentas con rol 02 o 04' },
        ].map(r=>(
          <div key={r.nivel} style={{ display:'flex', alignItems:'center', gap:10, padding:10, borderRadius:radius.md, border:`1px solid ${C.n500}` }}>
            <span style={{ background:r.color, color:r.text, fontSize:10.5, fontWeight:600, fontFamily:F, padding:'3px 9px', borderRadius:4, minWidth:90, textAlign:'center', flexShrink:0 }}>{r.nivel}</span>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:11, fontFamily:F, color:C.n900 }}>{r.ejemplo}</span>
              {'nota' in r && <p style={{ fontSize:10.5, color:C.n700, margin:'2px 0 0', fontFamily:F }}>{r.nota}</p>}
            </div>
            <span style={{ fontSize:10.5, color:C.n700, fontFamily:F, flexShrink:0 }}>{r.seg}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
