'use client';
import { useState } from 'react';
import { C, fmtNum, Toast, FONT, radius, SearchInput } from '../../ui/primitives';
import { IcPlus, IcEdit, IcTrash, IcSearch, IcClose, IcCheck } from '../../ui/icons';
import { useSenalAgregar } from '@/components/ui/senales';

const F = FONT;
const BRAND = C.brand;

interface Afiliado {
  id: string; code: string; nombre: string; banco: string; terminal: string;
  cuentaTransito: string; comision: number; retFuente: number; retIVA: number; activo: boolean;
}

const CUENTAS_TRANSITO = [
  '100-003-0001 · Datáfono BAC ¢',
  '100-003-0002 · Datáfono BAC $',
  '100-003-0003 · Datáfono BNCR ¢',
];

const INIT: Afiliado[] = [
  { id:'a1', code:'AFI-001', nombre:'BAC Visa/Master', banco:'BAC San José', terminal:'4654897', cuentaTransito:CUENTAS_TRANSITO[0], comision:1.85, retFuente:2.0, retIVA:1.0, activo:true },
  { id:'a2', code:'AFI-002', nombre:'BAC Amex',         banco:'BAC San José', terminal:'4654898', cuentaTransito:CUENTAS_TRANSITO[1], comision:2.10, retFuente:2.0, retIVA:1.0, activo:true },
  { id:'a3', code:'AFI-003', nombre:'BNCR Visa',        banco:'Banco Nacional', terminal:'7812300', cuentaTransito:CUENTAS_TRANSITO[2], comision:1.85, retFuente:2.0, retIVA:1.0, activo:true },
];

function pct(n: number) { return `${fmtNum(n, 2)}%`; }

// ── Modal crear/editar afiliado ───────────────────────────────────────────────
function ModalAfiliado({ afiliado, onClose, onSave }: { afiliado: Afiliado|null; onClose:()=>void; onSave:(a:Afiliado)=>void }) {
  const isNew = !afiliado;
  const [form, setForm] = useState({
    code: afiliado?.code ?? '',
    nombre: afiliado?.nombre ?? '',
    banco: afiliado?.banco ?? '',
    terminal: afiliado?.terminal ?? '',
    cuentaTransito: afiliado?.cuentaTransito ?? CUENTAS_TRANSITO[0],
    comision: afiliado ? String(afiliado.comision) : '',
    retFuente: afiliado ? String(afiliado.retFuente) : '2.0',
    retIVA: afiliado ? String(afiliado.retIVA) : '1.0',
    activo: afiliado?.activo ?? true,
  });
  const [errors, setErrors] = useState<Record<string,string>>({});
  function set<K extends keyof typeof form>(k:K, v:typeof form[K]) { setForm(f=>({...f,[k]:v})); }

  function validar() {
    const e: Record<string,string> = {};
    if (!form.code.trim()) e.code = 'El código es obligatorio';
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (!form.terminal.trim()) e.terminal = 'El número de terminal es obligatorio';
    if (form.comision.trim() === '' || isNaN(Number(form.comision))) e.comision = 'Porcentaje inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  function guardar() {
    if (!validar()) return;
    onSave({
      id: afiliado?.id ?? 'a_' + Date.now(),
      code: form.code.trim(), nombre: form.nombre.trim(), banco: form.banco.trim(), terminal: form.terminal.trim(),
      cuentaTransito: form.cuentaTransito, comision: Number(form.comision), retFuente: Number(form.retFuente),
      retIVA: Number(form.retIVA), activo: form.activo,
    });
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:460, padding:24, fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <span style={{ fontSize:14, fontWeight:600, color:'#0F0F0F' }}>{isNew ? 'Nuevo afiliado' : 'Editar afiliado'}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9E9E9E', fontSize:18, padding:0 }}><IcClose className="w-4 h-4"/></button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:500, color:'#555', display:'block', marginBottom:5 }}>Código <span style={{ color:C.error }}>*</span></label>
            <input value={form.code} onChange={e=>set('code', e.target.value)} placeholder="AFI-004"
              style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errors.code?C.error:'#E0E0E0'}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            {errors.code && <p style={{ fontSize:10, color:C.error, margin:'4px 0 0' }}>{errors.code}</p>}
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:500, color:'#555', display:'block', marginBottom:5 }}># Terminal <span style={{ color:C.error }}>*</span></label>
            <input value={form.terminal} onChange={e=>set('terminal', e.target.value)} placeholder="4654897"
              style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errors.terminal?C.error:'#E0E0E0'}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            {errors.terminal && <p style={{ fontSize:10, color:C.error, margin:'4px 0 0' }}>{errors.terminal}</p>}
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, fontWeight:500, color:'#555', display:'block', marginBottom:5 }}>Nombre <span style={{ color:C.error }}>*</span></label>
          <input value={form.nombre} onChange={e=>set('nombre', e.target.value)} placeholder="BAC Visa/Master"
            style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errors.nombre?C.error:'#E0E0E0'}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          {errors.nombre && <p style={{ fontSize:10, color:C.error, margin:'4px 0 0' }}>{errors.nombre}</p>}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:500, color:'#555', display:'block', marginBottom:5 }}>Banco</label>
            <input value={form.banco} onChange={e=>set('banco', e.target.value)} placeholder="BAC San José"
              style={{ width:'100%', height:36, padding:'0 10px', border:'1px solid #E0E0E0', borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:500, color:'#555', display:'block', marginBottom:5 }}>Cuenta de tránsito</label>
            <select value={form.cuentaTransito} onChange={e=>set('cuentaTransito', e.target.value)}
              style={{ width:'100%', height:36, padding:'0 10px', border:'1px solid #E0E0E0', borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', background:'#fff' }}>
              {CUENTAS_TRANSITO.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <p style={{ fontSize:10, fontWeight:600, color:'#9E9E9E', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>Porcentajes aplicados a cada liquidación</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
          <div>
            <label style={{ fontSize:11, color:'#555', display:'block', marginBottom:5 }}>Comisión %</label>
            <input type="number" step="0.01" value={form.comision} onChange={e=>set('comision', e.target.value)}
              style={{ width:'100%', height:34, padding:'0 8px', border:`1px solid ${errors.comision?C.error:'#E0E0E0'}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div>
            <label style={{ fontSize:11, color:'#555', display:'block', marginBottom:5 }}>Ret. fuente %</label>
            <input type="number" step="0.01" value={form.retFuente} onChange={e=>set('retFuente', e.target.value)}
              style={{ width:'100%', height:34, padding:'0 8px', border:'1px solid #E0E0E0', borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div>
            <label style={{ fontSize:11, color:'#555', display:'block', marginBottom:5 }}>Ret. IVA %</label>
            <input type="number" step="0.01" value={form.retIVA} onChange={e=>set('retIVA', e.target.value)}
              style={{ width:'100%', height:34, padding:'0 8px', border:'1px solid #E0E0E0', borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          </div>
        </div>

        <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, cursor:'pointer' }}>
          <input type="checkbox" checked={form.activo} onChange={e=>set('activo', e.target.checked)} style={{ width:14, height:14, accentColor:BRAND, cursor:'pointer' }}/>
          <span style={{ fontSize:12, color:'#0F0F0F' }}>Afiliado activo</span>
        </label>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose} style={{ height:36, padding:'0 18px', border:'1px solid #E0E0E0', borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:13, fontFamily:F, color:'#555' }}>Cancelar</button>
          <button onClick={guardar} style={{ height:36, padding:'0 20px', border:'none', borderRadius:radius.md, background:BRAND, color:'#fff', cursor:'pointer', fontSize:13, fontFamily:F, fontWeight:500 }}>
            {isNew ? 'Crear afiliado' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Afiliados({ addSignal, onAddHandled }: { addSignal?: number; onAddHandled?: () => void }) {
  const [afiliados, setAfiliados] = useState<Afiliado[]>(INIT);
  const [busq, setBusq] = useState('');
  const [modal, setModal] = useState<'nuevo'|Afiliado|null>(null);
  const [confirmDel, setConfirmDel] = useState<Afiliado|null>(null);
  const [toast, setToast] = useState<string|null>(null);

  const filtrados = afiliados.filter(a =>
    !busq || a.code.toLowerCase().includes(busq.toLowerCase()) || a.nombre.toLowerCase().includes(busq.toLowerCase()) || a.banco.toLowerCase().includes(busq.toLowerCase()));

  function guardar(a: Afiliado) {
    const esEdicion = afiliados.some(x=>x.id===a.id);
    setAfiliados(p => esEdicion ? p.map(x=>x.id===a.id?a:x) : [...p, a]);
    setToast(esEdicion ? `Afiliado ${a.code} actualizado` : `Afiliado ${a.code} creado`);
    setModal(null);
  }
  function eliminar(a: Afiliado) {
    setAfiliados(p => p.filter(x=>x.id!==a.id));
    setToast(`Afiliado ${a.code} eliminado`);
    setConfirmDel(null);
  }

  useSenalAgregar(addSignal, () => { setModal('nuevo'); }, onAddHandled);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>
      {/* Toolbar */}
      <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'10px 20px', display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
        <SearchInput value={busq} onChange={setBusq} placeholder="Buscar por código, nombre o banco…" width={260} />
      </div>

      {/* Tabla */}
      <div style={{ flex:1, overflowY:'auto', background:'#fff' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
          <thead style={{ position:'sticky', top:0, background:'#fff', zIndex:1 }}>
            <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
              {['Código','Nombre','Banco','Terminal','Cuenta de tránsito','Comisión','Ret. fuente','Ret. IVA','Estado','Acciones'].map(h=>(
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={10} style={{ padding:'30px 12px', textAlign:'center', color:'#9E9E9E' }}>Sin afiliados para la búsqueda.</td></tr>
            ) : filtrados.map((a,i)=>(
              <tr key={a.id} style={{ borderBottom:'1px solid #F5F5F5', background:i%2===1?'#FCFCFA':'#fff' }}>
                <td style={{ padding:'10px 12px', color:BRAND, fontWeight:600 }}>{a.code}</td>
                <td style={{ padding:'10px 12px', color:'#0F0F0F' }}>{a.nombre}</td>
                <td style={{ padding:'10px 12px', color:C.n700 }}>{a.banco || '-'}</td>
                <td style={{ padding:'10px 12px', color:C.n700, fontVariantNumeric:'tabular-nums' }}>{a.terminal}</td>
                <td style={{ padding:'10px 12px', color:C.n700, fontSize:11, whiteSpace:'nowrap' }}>{a.cuentaTransito}</td>
                <td style={{ padding:'10px 12px', fontVariantNumeric:'tabular-nums' }}>{pct(a.comision)}</td>
                <td style={{ padding:'10px 12px', fontVariantNumeric:'tabular-nums' }}>{pct(a.retFuente)}</td>
                <td style={{ padding:'10px 12px', fontVariantNumeric:'tabular-nums' }}>{pct(a.retIVA)}</td>
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:radius.lg, fontWeight:600,
                    background:a.activo?'rgba(29,158,117,.1)':'#F0F0F0', color:a.activo?C.success:'#9E9E9E' }}>
                    {a.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style={{ padding:'10px 12px' }}>
                  <div style={{ display:'flex', gap:4 }}>
                    <button title="Editar" onClick={()=>setModal(a)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.n700, display:'flex', alignItems:'center', justifyContent:'center' }}
                      onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                      <IcEdit className="w-3.5 h-3.5"/>
                    </button>
                    <button title="Eliminar" onClick={()=>setConfirmDel(a)} style={{ width:26, height:26, borderRadius:5, border:'none', background:'none', cursor:'pointer', color:C.error, display:'flex', alignItems:'center', justifyContent:'center' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(226,75,74,.1)')} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                      <IcTrash className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <ModalAfiliado afiliado={modal==='nuevo'?null:modal} onClose={()=>setModal(null)} onSave={guardar}/>}

      {confirmDel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setConfirmDel(null)}>
          <div style={{ background:'#fff', borderRadius:radius.lg, width:380, padding:22, fontFamily:F }} onClick={e=>e.stopPropagation()}>
            <p style={{ fontSize:14, fontWeight:600, margin:'0 0 8px' }}>¿Eliminar afiliado {confirmDel.code}?</p>
            <p style={{ fontSize:12, color:C.n700, margin:'0 0 18px' }}>Esta acción no se puede deshacer. Las liquidaciones ya generadas no se ven afectadas.</p>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button onClick={()=>setConfirmDel(null)} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
              <button onClick={()=>eliminar(confirmDel)} style={{ height:34, padding:'0 14px', border:'none', borderRadius:radius.md, background:C.error, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}
    </div>
  );
}
