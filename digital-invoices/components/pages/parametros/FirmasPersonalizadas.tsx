'use client';
import { useState } from 'react';
import { Button, FormField, Input, Modal, Checkbox, Select, radius } from '../../ui/primitives';
import { IcEdit, IcTrash } from '../../ui/icons';
import { C, FONT } from '../../ui/primitives';
import { useFirmasConfig, REPORTES_FIRMABLES, Firma, FirmaReporte, FormatoFirmaLinea } from '../config/firmasConfig';
import { USUARIOS_INIT } from '../config/permissionsData';
import { useSenalAgregar } from '@/components/ui/senales';

const F = FONT;
const FORMATO_OPCIONES: { value: FormatoFirmaLinea; label: string }[] = [
  { value:'nombre',    label:'Nombre del firmante' },
  { value:'documento', label:'Número de identificación' },
  { value:'puesto',    label:'Puesto / Puesto alternativo' },
];

function ConfirmDelete({ onConfirm, onCancel, label }: { onConfirm:()=>void; onCancel:()=>void; label:string }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.35)',zIndex:1002,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'#fff',borderRadius:10,padding:24,maxWidth:380,width:'90%',fontFamily:F,boxShadow:'0 8px 40px rgba(0,0,0,.18)' }}>
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

function BLANK_FIRMA(): Firma {
  return { id:`f${Date.now()}`, nombre:'', documento:'', puesto:'', puestoAlt:'', formato:['nombre','documento','puesto'], reportes:[], usuarioId:undefined };
}

function ModalFirma({ firma, firmas, onClose, onGuardar }: { firma: Firma; firmas: Firma[]; onClose:()=>void; onGuardar:(f:Firma)=>void }) {
  const [form, setForm] = useState<Firma>({ ...firma, reportes:[...firma.reportes] });

  function toggleFormato(v: FormatoFirmaLinea) {
    setForm(f => ({ ...f, formato: f.formato.includes(v) ? f.formato.filter(x=>x!==v) : [...f.formato, v] }));
  }
  function toggleReporte(key: string) {
    setForm(f => {
      const existe = f.reportes.find(r=>r.reporteKey===key);
      if (existe) return { ...f, reportes: f.reportes.filter(r=>r.reporteKey!==key) };
      const maxOrden = Math.max(0, ...f.reportes.map(r=>r.orden));
      return { ...f, reportes: [...f.reportes, { reporteKey:key, orden:maxOrden+1 }] };
    });
  }
  function setOrden(key: string, orden: number) {
    setForm(f => ({ ...f, reportes: f.reportes.map(r=>r.reporteKey===key?{...r,orden}:r) }));
  }
  function firmaConEseOrden(key: string, orden: number): Firma | undefined {
    return firmas.find(f => f.id !== form.id && f.reportes.some(r => r.reporteKey === key && r.orden === orden));
  }

  const usuarioYaEnlazado = form.usuarioId
    ? firmas.find(f => f.usuarioId === form.usuarioId && f.id !== form.id)
    : undefined;
  const usuarioSel = USUARIOS_INIT.find(u => u.id === form.usuarioId);
  const sinFormato = form.formato.length === 0;

  const valido = !!form.usuarioId && !!form.nombre.trim() && !!form.documento.trim() && !usuarioYaEnlazado && !sinFormato;

  return (
    <Modal open title={form.nombre ? `Editar firma de ${form.nombre}` : 'Nueva firma'} onClose={onClose} wide
      footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={()=>valido && onGuardar(form)}>Guardar</Button>
      </div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <FormField label="Usuario del sistema" required hint="La persona que va a firmar. Precarga el nombre; el resto se completa a mano.">
          <Select
            value={form.usuarioId ? String(form.usuarioId) : ''}
            onChange={v=>{
              const uid = v ? Number(v) : undefined;
              const u = USUARIOS_INIT.find(x=>x.id===uid);
              setForm(f=>({ ...f, usuarioId: uid, nombre: u?.descripcion ?? f.nombre }));
            }}
            options={[{ value:'', label:'Seleccioná un usuario…' }, ...USUARIOS_INIT.map(u=>({ value:String(u.id), label:`${u.descripcion} (${u.usuario})` }))]}
          />
        </FormField>
        {usuarioYaEnlazado && (
          <p style={{ fontSize:11, color:C.error, margin:0 }}>
            {usuarioSel?.descripcion ?? 'Ese usuario'} ya tiene una firma enlazada ({usuarioYaEnlazado.nombre}). Un usuario no puede tener dos firmas - elegí otro usuario o editá la firma existente.
          </p>
        )}
        <FormField label="Nombre del firmante" required><Input value={form.nombre} onChange={v=>setForm(f=>({...f,nombre:v}))} placeholder="Nombre completo" /></FormField>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          <FormField label="Número de identificación" required hint="Ej. 0-0000-0000">
            <Input value={form.documento} onChange={v=>setForm(f=>({...f,documento:v}))} placeholder="0-0000-0000" />
          </FormField>
          <FormField label="Puesto"><Input value={form.puesto} onChange={v=>setForm(f=>({...f,puesto:v}))} placeholder="Ej. Representante Legal" /></FormField>
          <FormField label="Puesto alternativo" hint="Se usa en reportes emitidos en USD por defecto.">
            <Input value={form.puestoAlt} onChange={v=>setForm(f=>({...f,puestoAlt:v}))} placeholder="Ej. Legal Representative" />
          </FormField>
        </div>

        <div>
          <p style={{ fontSize:12, fontWeight:600, color:C.n900, margin:'0 0 4px' }}>Imagen de la firma</p>
          <p style={{ fontSize:11, color:C.n700, margin:'0 0 8px' }}>
            Firma visual (trazo escaneado o dibujado) para que se vea igual que en papel - no es una firma digital
            criptográfica con validez legal (eso requiere un certificado emitido por una autoridad certificadora
            costarricense, un proyecto legal y técnico aparte).
          </p>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:160, height:60, border:'1px dashed #ECECEC', borderRadius:radius.md, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background:'#FAFAFA' }}>
              {form.imagenFirma
                ? <img src={form.imagenFirma} alt="" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }}/>
                : <span style={{ fontSize:10, color:C.n700 }}>Sin imagen</span>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label style={{ height:30, padding:'0 12px', border:'1px solid #ECECEC', borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:11, fontFamily:F, color:C.n900, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                {form.imagenFirma ? 'Cambiar imagen' : 'Subir imagen'}
                <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{
                  const file = e.target.files?.[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setForm(f=>({ ...f, imagenFirma: reader.result as string }));
                  reader.readAsDataURL(file);
                }}/>
              </label>
              {form.imagenFirma && (
                <button type="button" onClick={()=>setForm(f=>({...f, imagenFirma:undefined}))}
                  style={{ height:30, padding:'0 12px', border:'none', background:'none', cursor:'pointer', fontSize:11, fontFamily:F, color:C.error }}>
                  Quitar imagen
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <p style={{ fontSize:12, fontWeight:600, color:C.n900, margin:'0 0 4px' }}>Formato de firma</p>
          <p style={{ fontSize:11, color:C.n700, margin:'0 0 8px' }}>Qué líneas de información se muestran en el reporte, en este orden.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {FORMATO_OPCIONES.map(o=>(
              <Checkbox key={o.value} label={o.label} checked={form.formato.includes(o.value)} onChange={()=>toggleFormato(o.value)}/>
            ))}
          </div>
          {sinFormato && (
            <p style={{ fontSize:11, color:C.error, margin:'6px 0 0' }}>
              Elegí al menos una línea - si no, la firma se imprime en blanco (solo la imagen, si tiene).
            </p>
          )}
        </div>

        <div>
          <p style={{ fontSize:12, fontWeight:600, color:C.n900, margin:'0 0 4px' }}>Reportes asociados</p>
          <p style={{ fontSize:11, color:C.n700, margin:'0 0 8px' }}>El orden define la posición de esta firma entre las demás firmas de ese reporte específico.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:14, border:'1px solid #ECECEC', borderRadius:radius.md, padding:12 }}>
            {(['reportes','estadosfin'] as const).map(grupo=>(
              <div key={grupo}>
                <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.03em', margin:'0 0 6px' }}>
                  {grupo==='reportes' ? 'Reportes' : 'Estados financieros'}
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {REPORTES_FIRMABLES.filter(r=>r.grupo===grupo).map(r=>{
                    const rel = form.reportes.find(x=>x.reporteKey===r.key);
                    const choque = rel ? firmaConEseOrden(r.key, rel.orden) : undefined;
                    return (
                      <div key={r.key} style={{ display:'flex', flexDirection:'column', gap:2 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <Checkbox label={r.label} checked={!!rel} onChange={()=>toggleReporte(r.key)}/>
                          {rel && (
                            <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:'auto' }}>
                              <span style={{ fontSize:11, color:C.n700 }}>Orden</span>
                              <button type="button" title="Subir" onClick={()=>setOrden(r.key, Math.max(1, rel.orden-1))}
                                style={{ width:20, height:20, border:'1px solid #ECECEC', borderRadius:4, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.n700, padding:0 }}>
                                <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9L7 5L11 9"/></svg>
                              </button>
                              <input type="number" min={1} value={rel.orden} onChange={e=>setOrden(r.key, parseInt(e.target.value,10)||1)}
                                style={{ width:42, height:26, padding:'0 4px', border:`1px solid ${choque ? C.error : '#ECECEC'}`, borderRadius:4, fontSize:12, fontFamily:F, textAlign:'center' }}/>
                              <button type="button" title="Bajar" onClick={()=>setOrden(r.key, rel.orden+1)}
                                style={{ width:20, height:20, border:'1px solid #ECECEC', borderRadius:4, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.n700, padding:0 }}>
                                <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 5L7 9L11 5"/></svg>
                              </button>
                            </div>
                          )}
                        </div>
                        {choque && (
                          <p style={{ fontSize:10.5, color:C.error, margin:'0 0 0 26px' }}>
                            El orden {rel!.orden} de “{r.label}” ya lo tiene {choque.nombre}. Si guardás, {choque.nombre} pasa al siguiente número libre.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function resolverConflictosOrden(lista: Firma[], editada: Firma): Firma[] {
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

function compactarOrdenes(lista: Firma[], reporteKey: string): Firma[] {
  const relacionadas = lista
    .map(x => ({ firma: x, rel: x.reportes.find(r => r.reporteKey === reporteKey) }))
    .filter((x): x is { firma: Firma; rel: FirmaReporte } => !!x.rel)
    .sort((a, b) => a.rel.orden - b.rel.orden);
  const nuevoOrden = new Map<string, number>();
  relacionadas.forEach((x, i) => nuevoOrden.set(x.firma.id, i + 1));
  return lista.map(x => {
    const o = nuevoOrden.get(x.id);
    if (o === undefined || o === x.reportes.find(r=>r.reporteKey===reporteKey)?.orden) return x;
    return { ...x, reportes: x.reportes.map(r => r.reporteKey === reporteKey ? { ...r, orden: o } : r) };
  });
}

export default function FirmasPersonalizadas({ addSignal, onAddHandled }: { addSignal?: number; onAddHandled?: () => void }) {
  const { firmas, setFirmas } = useFirmasConfig();
  const [editando, setEditando] = useState<Firma|null>(null);
  const [creando, setCreando] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Firma|null>(null);

  function guardar(f: Firma) {
    setFirmas(prev => {
      const anterior = prev.find(x => x.id === f.id);
      let base = prev.some(x=>x.id===f.id) ? prev.map(x=>x.id===f.id?f:x) : [...prev, f];
      base = resolverConflictosOrden(base, f);
      if (anterior) {
        const reportesQuitados = anterior.reportes
          .filter(r => !f.reportes.some(nr => nr.reporteKey === r.reporteKey))
          .map(r => r.reporteKey);
        for (const key of reportesQuitados) base = compactarOrdenes(base, key);
      }
      return base;
    });
    setEditando(null); setCreando(false);
  }

  function eliminarFirma(f: Firma) {
    setFirmas(prev => {
      let resultado = prev.filter(x => x.id !== f.id);
      for (const r of f.reportes) resultado = compactarOrdenes(resultado, r.reporteKey);
      return resultado;
    });
  }

  useSenalAgregar(addSignal, () => { setCreando(true); }, onAddHandled);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ background:'#fff', border:'1px solid #ECECEC', borderRadius:radius.md, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #ECECEC' }}>
          <p style={{ fontSize:13, fontWeight:500, margin:0, fontFamily:F }}>Firmas personalizadas</p>
          <p style={{ fontSize:11, color:C.n700, margin:'2px 0 0', fontFamily:F }}>Firmantes que pueden aparecer al pie de los libros legales y estados financieros.</p>
        </div>
        <div style={{ padding:'14px 20px' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F, border:'1px solid #ECECEC', borderRadius:radius.md, overflow:'hidden', tableLayout:'fixed' }}>
            <colgroup>
              <col style={{ width:'15%' }}/>
              <col style={{ width:'13%' }}/>
              <col style={{ width:'12%' }}/>
              <col style={{ width:'12%' }}/>
              <col/>
              <col style={{ width:64 }}/>
            </colgroup>
            <thead><tr style={{ background:'#fff', borderBottom:'1px solid #E8E8E8' }}>
              {['Nombre del firmante','Número de identificación','Puesto','Usuario del sistema','Reportes asociados',''].map(h=>(
                <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:11, fontWeight:500, color:C.n700, borderBottom:'1px solid #ECECEC' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {firmas.length===0 && (
                <tr><td colSpan={6} style={{ padding:24, textAlign:'center', color:C.n700, fontSize:12 }}>Sin firmas registradas - creá la primera.</td></tr>
              )}
              {firmas.map(f=>(
                <tr key={f.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                  <td style={{ padding:'10px 14px', fontWeight:600, color:C.n900, verticalAlign:'top' }}>{f.nombre}</td>
                  <td style={{ padding:'10px 14px', color:C.n700, fontFamily:'monospace', verticalAlign:'top' }}>{f.documento}</td>
                  <td style={{ padding:'10px 14px', color:C.n700, verticalAlign:'top' }}>{f.puesto || <span style={{ color:'#BCBCBC' }}>-</span>}</td>
                  <td style={{ padding:'10px 14px', color:C.n700, verticalAlign:'top' }}>
                    {f.usuarioId ? (USUARIOS_INIT.find(u=>u.id===f.usuarioId)?.descripcion ?? '-') : <span style={{ color:'#BCBCBC' }}>Sin enlazar</span>}
                  </td>
                  <td style={{ padding:'10px 14px', color:C.n700, verticalAlign:'top' }}>
                    {f.reportes.length===0
                      ? <span style={{ color:'#BCBCBC' }}>Sin reportes</span>
                      : (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {[...f.reportes].sort((a,b)=>a.orden-b.orden).map(r=>(
                            <span key={r.reporteKey} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:radius.pill, background:C.brandBg, border:`1px solid ${C.brandBd}`, color:C.brand, fontSize:10.5, fontWeight:500, whiteSpace:'nowrap' }}>
                              {REPORTES_FIRMABLES.find(x=>x.key===r.reporteKey)?.label ?? r.reporteKey}
                              <span style={{ fontWeight:700 }}>{r.orden}°</span>
                            </span>
                          ))}
                        </div>
                      )}
                  </td>
                  <td style={{ padding:'10px 14px', verticalAlign:'top' }}>
                    <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                      <button onClick={()=>setEditando(f)} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700 }}><IcEdit className="w-3.5 h-3.5" /></button>
                      <button onClick={()=>setConfirmDel(f)} style={{ background:'none', border:'none', cursor:'pointer', color:C.error }}><IcTrash className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(creando || editando) && (
        <ModalFirma firma={editando ?? BLANK_FIRMA()} firmas={firmas} onClose={()=>{setEditando(null);setCreando(false);}} onGuardar={guardar}/>
      )}
      {confirmDel && (
        <ConfirmDelete label={confirmDel.nombre} onConfirm={()=>{ eliminarFirma(confirmDel); setConfirmDel(null); }} onCancel={()=>setConfirmDel(null)} />
      )}
    </div>
  );
}
