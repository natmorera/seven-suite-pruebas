'use client';
import { useState } from 'react';
import { Modal } from '@/components/ui/primitives';
import { Button, FormField, Input, Select, Checkbox } from '@/components/ui/formulario';
import { radius , C } from '@/components/ui/tokens';
import { REPORTES_FIRMABLES, type Firma, type FormatoFirmaLinea } from '@/components/pages/config/firmasConfig';
import { USUARIOS_INIT } from '@/components/pages/config/permissionsData';
import { F, FORMATO_OPCIONES } from './datos';

export function ModalFirma({ firma, firmas, onClose, onGuardar }: { firma: Firma; firmas: Firma[]; onClose:()=>void; onGuardar:(f:Firma)=>void }) {
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
  // avisar en el momento (no solo corregir en silencio al guardar)
  // cuando el orden que se está escribiendo ya lo tiene otra firma en ese
  // mismo reporte.
  function firmaConEseOrden(key: string, orden: number): Firma | undefined {
    return firmas.find(f => f.id !== form.id && f.reportes.some(r => r.reporteKey === key && r.orden === orden));
  }

  // Un usuario no puede tener más de una firma: se bloquea el guardado.
  const usuarioYaEnlazado = form.usuarioId
    ? firmas.find(f => f.usuarioId === form.usuarioId && f.id !== form.id)
    : undefined;
  const usuarioSel = USUARIOS_INIT.find(u => u.id === form.usuarioId);
  // La firma debe mostrar al menos uno de Nombre, Número de identificación o Puesto.
  const sinFormato = form.formato.length === 0;

  const valido = !!form.usuarioId && !!form.nombre.trim() && !!form.documento.trim() && !usuarioYaEnlazado && !sinFormato;

  return (
    <Modal open title={form.nombre ? `Editar firma de ${form.nombre}` : 'Nueva firma'} onClose={onClose} wide
      footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={()=>valido && onGuardar(form)}>Guardar</Button>
      </div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Primero se elige el usuario. Del usuario se precarga el nombre; el número de
            identificación y el puesto se completan a mano. */}
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
            <div style={{ width:160, height:60, border:'1px dashed #ECECEC', borderRadius:radius.md, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background:'#F9F9F9' }}>
              {form.imagenFirma
                // eslint-disable-next-line @next/next/no-img-element -- imagen de la firma cargada por el usuario (data URL), no pasa por next/image
                ? <img src={form.imagenFirma} alt="" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }}/>
                : <span style={{ fontSize:10.5, color:C.n700 }}>Sin imagen</span>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label style={{ height:30, padding:'0 12px', border:'1px solid #ECECEC', borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F, color:C.n900, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
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

        {/* Reportes agrupados igual que en el menú (Reportes / Estados financieros). */}
        <div>
          <p style={{ fontSize:12, fontWeight:600, color:C.n900, margin:'0 0 4px' }}>Reportes asociados</p>
          <p style={{ fontSize:11, color:C.n700, margin:'0 0 8px' }}>El orden define la posición de esta firma entre las demás firmas de ese reporte específico.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:14, border:'1px solid #ECECEC', borderRadius:radius.md, padding:12 }}>
            {(['reportes','estadosfin'] as const).map(grupo=>(
              <div key={grupo}>
                <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.03em', margin:'0 0 6px' }}>
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
                              {/* la única forma de reordenar era escribir el número a
                                  mano - con varias firmas en un mismo reporte es incómodo. Se
                                  agregan flechas para subir/bajar de a 1 sin tener que calcular
                                  el número manualmente. */}
                              <button type="button" title="Subir" onClick={()=>setOrden(r.key, Math.max(1, rel.orden-1))}
                                style={{ width:20, height:20, border:'1px solid #ECECEC', borderRadius:4, background:'#FFFFFF', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.n700, padding:0 }}>
                                <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9L7 5L11 9"/></svg>
                              </button>
                              <input aria-label="Orden" type="number" min={1} value={rel.orden} onChange={e=>setOrden(r.key, parseInt(e.target.value,10)||1)}
                                style={{ width:42, height:26, padding:'0 4px', border:`1px solid ${choque ? C.error : '#ECECEC'}`, borderRadius:4, fontSize:12, fontFamily:F, textAlign:'center' }}/>
                              <button type="button" title="Bajar" onClick={()=>setOrden(r.key, rel.orden+1)}
                                style={{ width:20, height:20, border:'1px solid #ECECEC', borderRadius:4, background:'#FFFFFF', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.n700, padding:0 }}>
                                <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 5L7 9L11 5"/></svg>
                              </button>
                            </div>
                          )}
                        </div>
                        {choque && (
                          <p style={{ fontSize:10.5, color:C.error, margin:'0 0 0 26px' }}>
                            El orden {rel!.orden} de &quot;{r.label}&quot; ya lo tiene {choque.nombre}. Si guardás, {choque.nombre} pasa al siguiente número libre.
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
