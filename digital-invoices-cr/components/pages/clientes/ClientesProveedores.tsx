'use client';
import { useState, useEffect } from 'react';
import { PageHeader, Button, FormField, Input, Select, InfoBox, StatusBadge, Modal, Toast, Checkbox, radius, SearchInput, Switch } from '../../ui/primitives';
import { IcPlus, IcEdit, IcTrash, IcClose, IcUser } from '../../ui/icons';
import { C, FONT } from '../../ui/primitives';
import { type Perfil, type ClienteDb, filaAPerfil } from '@/data/terceros';
import ArticulosProveedor from './ArticulosProveedor';
import { DatosTributarios, ComprasPorCorreo, ActivarCuentaModal, type TerceroFila } from './ReceptorPartes';

const F = FONT;

type TabId = 'basica' | 'bancaria' | 'tributaria' | 'compras' | 'articulos';

const PAISES = [{ value:'CR',label:'Costa Rica' },{ value:'NI',label:'Nicaragua' },{ value:'GT',label:'Guatemala' },{ value:'HN',label:'Honduras' },{ value:'SV',label:'El Salvador' },{ value:'PA',label:'Panamá' }];
const TIPOS_ID = [{ value:'juridica',label:'Persona jurídica' },{ value:'fisica',label:'Persona física' },{ value:'extranjer',label:'Extranjero' }];
const MONEDAS_BANCO = [{ value:'CRC',label:'¢ Colón costarricense' },{ value:'USD',label:'$ Dólar estadounidense' },{ value:'EUR',label:'€ Euro' }];
const TIPOS_CUENTA  = [{ value:'corriente',label:'Cuenta corriente' },{ value:'ahorros',label:'Cuenta de ahorros' }];
const PAIS_LABEL: Record<string,string> = { CR:'Costa Rica',NI:'Nicaragua',GT:'Guatemala',HN:'Honduras',SV:'El Salvador',PA:'Panamá' };
const TIPO_LABEL:  Record<string,string> = { juridica:'Persona jurídica',fisica:'Persona física',extranjer:'Extranjero' };


function Initials({ n, t }: { n:string;t:string }) {
  const w = n.trim().split(/\s+/);
  const txt = w.length>=2?(w[0][0]+w[1][0]).toUpperCase():n.slice(0,2).toUpperCase();
  return <div style={{ width:36,height:36,borderRadius:'50%',background:t==='02'?'#E6F1FB':'#E1F5EE',color:t==='02'?'#0C447C':'#085041',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0,fontFamily:"'Montserrat',sans-serif" }}>{txt}</div>;
}
const FILTRO = { height:32,border:`1px solid ${C.n500}`,borderRadius:6,background:'#fff',fontSize:12,padding:'0 10px',color:C.n900,fontFamily:"'Montserrat',sans-serif",minWidth:0 } as const;
function SL({ c }: { c:React.ReactNode }) { return <p style={{ fontSize:10,fontWeight:600,color:C.n700,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6,paddingBottom:4,borderBottom:`1px solid ${C.n500}` }}>{c}</p>; }
function RF({ l, v, m=false }: { l:string;v?:string;m?:boolean }) { return <div><p style={{ fontSize:10,color:C.n700,marginBottom:2 }}>{l}</p><p style={{ fontSize:12,color:v?C.n900:'#C8C8C8',fontFamily:"'Montserrat',sans-serif" }}>{v||'-'}</p></div>; }

// Pestañas según el rol: «Datos tributarios» solo si es receptor de facturas;
// «Compras por correo» solo para proveedores (y con facturación activa).
function PerfilDetalle({ perfil,onUpdate,onClose,fila,receptor,fe,tabInicial,onRecargar,onCambiarReceptor }: { perfil:Perfil;onUpdate:(p:Perfil)=>void;onClose:()=>void;fila?:TerceroFila;receptor:boolean;fe:boolean;tabInicial?:TabId;onRecargar:()=>void;onCambiarReceptor:(v:boolean)=>void }) {
  // Los datos para Hacienda van dentro de Información básica (sección Facturación electrónica)
  const tabs:TabId[]=['basica','bancaria',...(perfil.tipo==='04'?['articulos' as const]:[]),...(fe&&perfil.tipo==='04'?['compras' as const]:[])];
  const [tabElegida,setTab]=useState<TabId>(tabInicial??'basica');
  const tab:TabId=tabs.includes(tabElegida)?tabElegida:'basica';
  const mostrarTributarios = tabElegida==='tributaria';
  const [editando,setEdit]=useState(false);
  const [addB,setAddB]=useState(false);
  const [toast,setToast]=useState<{message:string;type:'success'|'error'}|null>(null);
  const [form,setForm]=useState({ nombre:perfil.nombre,tipoIdentificacion:perfil.tipoIdentificacion,numeroIdentificacion:perfil.numeroIdentificacion,pais:perfil.pais,correo:perfil.correo,telefono:perfil.telefono,contacto:perfil.contacto,direccion:perfil.direccion,diasCredito:String(perfil.diasCredito),generaReciboPago:Boolean(perfil.generaReciboPago) });
  const [bForm,setBForm]=useState({ banco:'',numero:'',moneda:'CRC',tipo:'corriente',titulo:'',principal:false });
  const showT=(m:string)=>{ setToast({message:m,type:'success'});setTimeout(()=>setToast(null),3000); };
  const fullCode=`${perfil.cuentaCode}-${perfil.auxId}`;
  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%',background:C.n000,position:'relative' }}>
      <div style={{ padding:'12px 16px',borderBottom:`1px solid ${C.n500}`,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexShrink:0 }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,minWidth:0 }}>
          <Initials n={perfil.nombre} t={perfil.tipo} />
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:13,fontWeight:500,color:C.n900 }}>{perfil.nombre}</p>
            <div style={{ display:'flex',gap:6,marginTop:2 }}><span style={{ fontSize:10,color:C.n900,fontFamily:F }}>{perfil.auxId}</span><span style={{ fontSize:10,color:C.n700 }}>·</span><span style={{ fontSize:10,color:C.n900,fontFamily:F }}>{fullCode}</span></div>
          </div>
        </div>
        <div style={{ display:'flex',gap:6,alignItems:'center',flexShrink:0 }}>
          <StatusBadge label={perfil.activo?'Activo':'Inactivo'} color={perfil.activo?'green':'gray'} />
          <Button variant="secondary" onClick={()=>setEdit(true)} icon={<IcEdit className="w-3 h-3" />} style={{ height:28 }}>Editar</Button>
          <Button variant="secondary" onClick={()=>{onUpdate({...perfil,activo:!perfil.activo});showT(perfil.activo?'Inactivado.':'Activado.');}} style={{ height:28 }}>{perfil.activo?'Inactivar':'Activar'}</Button>
          <button onClick={onClose} style={{ width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${C.n500}`,borderRadius:radius.sm,background:C.n000,cursor:'pointer' }}><IcClose className="w-4 h-4" /></button>
        </div>
      </div>
      <div style={{ display:'flex',borderBottom:`1px solid ${C.n500}`,flexShrink:0,paddingLeft:16 }}>
        {tabs.map(id=>(
          <button key={id} onClick={()=>setTab(id)} style={{ padding:'0 14px',height:40,fontSize:12,cursor:'pointer',border:'none',background:'none',color:tab===id?C.brand:C.n700,fontWeight:400,borderBottom:`2px solid ${tab===id?C.brand:'transparent'}`,fontFamily:"'Montserrat',sans-serif",display:'flex',alignItems:'center',gap:6 }}>
            {id==='basica'?'Información básica':id==='bancaria'?'Cuentas bancarias':id==='articulos'?'Artículos que compra':id==='tributaria'?'Datos tributarios':'Compras por correo'}
          </button>
        ))}
      </div>
      <div style={{ flex:1,overflowY:'auto',padding:16 }}>
        {tab==='basica'&&(
          <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
            <div style={{ background:C.brandBg,border:`1px solid ${C.brandBd}`,borderRadius:radius.md,padding:'10px 14px',display:'flex',justifyContent:'space-between' }}>
              <div><p style={{ fontSize:10,color:'#8A6200',marginBottom:2 }}>ID auxiliar (4° nivel)</p><span style={{ fontSize:13,fontWeight:500,color:'#412402',fontFamily:F }}>{fullCode}</span></div>
              <div style={{ textAlign:'right' }}><p style={{ fontSize:10,color:'#8A6200',marginBottom:2 }}>Cuenta vinculada</p><p style={{ fontSize:11,color:'#633806' }}>{perfil.cuentaCode} · {perfil.cuentaNombre}</p></div>
            </div>
            <div><SL c="Datos de identificación" /><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}><RF l="Nombre / Razón social" v={perfil.nombre} /><RF l="Tipo de identificación" v={TIPO_LABEL[perfil.tipoIdentificacion]} /><RF l="Número de identificación" v={perfil.numeroIdentificacion} m /><RF l="País" v={PAIS_LABEL[perfil.pais]} /></div></div>
            <div id="seccion-fe">
              <SL c="Información tributaria" />
              <div style={{ border:`1px solid ${C.n500}`,borderRadius:radius.md,overflow:'hidden' }}>
                {fe && (
                  <div style={{ padding:'12px 14px',display:'flex',alignItems:'center',gap:12,background:receptor?C.brandBg:C.n200,borderBottom:`1px solid ${receptor?C.brandBd:C.n500}` }}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ fontSize:12.5,fontWeight:600,color:C.n900,marginBottom:2 }}>¿Se le emiten comprobantes electrónicos?</p>
                      <p style={{ fontSize:11.5,color:C.n700,lineHeight:1.45 }}>{receptor
                        ? 'Sí: es receptor y aparece al facturar. Abajo están los datos que van en sus comprobantes.'
                        : `Actívalo solo si es receptor. No todos los ${perfil.tipo==='02'?'clientes':'proveedores'} lo son.`}</p>
                    </div>
                    <Switch checked={receptor} onChange={onCambiarReceptor} label="Receptor" />
                  </div>
                )}
                <div style={{ padding:16 }} ref={el=>{ if (el && mostrarTributarios) el.scrollIntoView({ block:'start' }); }}>
                  {fila
                    ? <DatosTributarios key={fila.id+String(receptor)} tercero={fila} completo={fe && receptor} resumen={false} onGuardado={m=>{showT(m);onRecargar();}} />
                    : <p style={{ fontSize:12,color:C.n700 }}>Cargando…</p>}
                </div>
              </div>
            </div>
            <div><SL c="Condiciones comerciales" /><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}><RF l="Días de crédito" v={perfil.diasCredito>0?`${perfil.diasCredito} días`:'Contado (0 días)'} />{perfil.tipo==='02' && <RF l="Recibo electrónico de pago" v={perfil.generaReciboPago?'Sí, por defecto en sus facturas a crédito':'No'} />}</div></div>
            <div><SL c="Contacto" /><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}><RF l="Correo electrónico" v={perfil.correo} /><RF l="Teléfono" v={perfil.telefono} /><RF l="Contacto principal" v={perfil.contacto} /><RF l="Dirección" v={perfil.direccion} /></div></div>
            <p style={{ fontSize:11,color:C.n700 }}>Creado por {perfil.creadoPor} · {perfil.creadoEn}</p>
          </div>
        )}
        {tab==='bancaria'&&(
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12,border:`1px solid ${C.n500}`,borderRadius:radius.md,overflow:'hidden' }}>
              <thead><tr style={{ background:C.n200 }}>{['Banco','Moneda','Tipo','Título','N.° Cuenta',''].map(h=><th key={h} style={{ padding:'8px 12px',textAlign:'left',fontSize:10,fontWeight:500,color:C.n700 }}>{h}</th>)}</tr></thead>
              <tbody>
                {perfil.bancarias.length===0&&!addB&&<tr><td colSpan={6} style={{ padding:20,textAlign:'center',color:C.n700,fontSize:12 }}>No hay cuentas bancarias registradas.</td></tr>}
                {perfil.bancarias.map(b=>(
                  <tr key={b.id} style={{ borderTop:`1px solid ${C.n500}` }}>
                    <td style={{ padding:'8px 12px',fontWeight:500 }}>{b.banco}{b.principal&&<span style={{ fontSize:9,marginLeft:6,padding:'1px 5px',background:C.brandBg,color:C.brand,border:`1px solid ${C.brandBd}`,borderRadius:radius.md }}>Principal</span>}</td>
                    <td style={{ padding:'8px 12px',fontSize:11,color:C.n700 }}>{b.moneda}</td>
                    <td style={{ padding:'8px 12px',fontSize:11,color:C.n700 }}>{TIPOS_CUENTA.find(t=>t.value===b.tipo)?.label}</td>
                    <td style={{ padding:'8px 12px',fontSize:11 }}>{b.titulo||'-'}</td>
                    <td style={{ padding:'8px 12px',fontFamily:"'Montserrat',sans-serif",fontSize:11,color:C.n700 }}>{b.numero}</td>
                    <td style={{ padding:'8px 12px' }}><button onClick={()=>onUpdate({...perfil,bancarias:perfil.bancarias.filter(x=>x.id!==b.id)})} style={{ background:'none',border:'none',cursor:'pointer',color:C.error }}><IcTrash className="w-3 h-3" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {addB?(
              <div style={{ border:`1px solid ${C.n500}`,borderRadius:radius.md,padding:14 }}>
                <p style={{ fontSize:12,fontWeight:500,marginBottom:12 }}>Nueva cuenta bancaria</p>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}>
                  <FormField label="Banco" required><Input value={bForm.banco} onChange={v=>setBForm(f=>({...f,banco:v}))} placeholder="Nombre del banco" /></FormField>
                  <FormField label="Moneda"><Select value={bForm.moneda} onChange={v=>setBForm(f=>({...f,moneda:v}))} options={MONEDAS_BANCO} /></FormField>
                  <FormField label="Tipo de cuenta"><Select value={bForm.tipo} onChange={v=>setBForm(f=>({...f,tipo:v}))} options={TIPOS_CUENTA} /></FormField>
                  <FormField label="Título / Alias"><Input value={bForm.titulo} onChange={v=>setBForm(f=>({...f,titulo:v}))} placeholder="Alias" /></FormField>
                  <FormField label="N.° de cuenta" required><Input value={bForm.numero} onChange={v=>setBForm(f=>({...f,numero:v}))} placeholder="IBAN o número" style={{ fontFamily:"'Montserrat',sans-serif" }} /></FormField>
                </div>
                <Checkbox label="Marcar como cuenta principal" checked={bForm.principal} onChange={v=>setBForm(f=>({...f,principal:v}))} />
                <div style={{ display:'flex',gap:8,marginTop:12 }}>
                  <Button onClick={()=>{ if(!bForm.banco||!bForm.numero)return; onUpdate({...perfil,bancarias:[...perfil.bancarias,{...bForm,id:`b${Date.now()}`}]}); setAddB(false); setBForm({banco:'',numero:'',moneda:'CRC',tipo:'corriente',titulo:'',principal:false}); showT('Cuenta bancaria agregada.'); }}>Agregar cuenta</Button>
                  <Button variant="secondary" onClick={()=>setAddB(false)}>Cancelar</Button>
                </div>
              </div>
            ):(
              <button onClick={()=>setAddB(true)} style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 0',fontSize:12,color:C.brand,fontWeight:500,background:'none',border:'none',cursor:'pointer',fontFamily:"'Montserrat',sans-serif" }}><IcPlus className="w-3.5 h-3.5" />Agregar cuenta bancaria</button>
            )}
          </div>
        )}
        {tab==='articulos'&&<ArticulosProveedor identificacion={fila?.numero_identificacion ?? perfil.numeroIdentificacion} onGuardado={showT} />}
        {tab==='compras'&&fila&&<ComprasPorCorreo key={fila.id} tercero={fila} onGuardado={m=>{showT(m);onRecargar();}} />}
      </div>
      {toast&&<div style={{ position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',zIndex:50,minWidth:260 }}><Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} /></div>}
      {editando&&(
        <Modal open title={`Editar ${perfil.tipo==='02'?'cliente':'proveedor'}`} onClose={()=>setEdit(false)}
          footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}><Button variant="secondary" onClick={()=>setEdit(false)}>Cancelar</Button><Button onClick={()=>{ onUpdate({...perfil,...form,diasCredito:form.diasCredito.trim()?parseInt(form.diasCredito,10):0}); setEdit(false); showT('Cambios guardados.'); }}>Guardar cambios</Button></div>}>
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            <FormField label="Nombre / Razón social" required><Input value={form.nombre} onChange={v=>setForm(f=>({...f,nombre:v}))} /></FormField>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <FormField label="Tipo de identificación" required><Select value={form.tipoIdentificacion} onChange={v=>setForm(f=>({...f,tipoIdentificacion:v}))} options={TIPOS_ID} /></FormField>
              <FormField label="Número de identificación"><Input value={form.numeroIdentificacion} onChange={v=>setForm(f=>({...f,numeroIdentificacion:v}))} /></FormField>
              <FormField label="País"><Select value={form.pais} onChange={v=>setForm(f=>({...f,pais:v}))} options={PAISES} /></FormField>
              <FormField label="Teléfono"><Input value={form.telefono} onChange={v=>setForm(f=>({...f,telefono:v}))} /></FormField>
              <FormField label="Correo electrónico"><Input value={form.correo} onChange={v=>setForm(f=>({...f,correo:v}))} /></FormField>
              <FormField label="Contacto principal"><Input value={form.contacto} onChange={v=>setForm(f=>({...f,contacto:v}))} /></FormField>
            </div>
            <FormField label="Dirección"><Input value={form.direccion} onChange={v=>setForm(f=>({...f,direccion:v}))} /></FormField>
            <FormField label="Días de crédito" hint="La fecha de vencimiento de cada factura se calcula sumando estos días.">
              <Input type="number" min="0" value={form.diasCredito} onChange={v=>setForm(f=>({...f,diasCredito:v}))} placeholder="0 = contado" />
            </FormField>
            {perfil.tipo==='02' && <FormField label="Recibo electrónico de pago" hint="Sus facturas a crédito salen con «Generar recibo electrónico de pago» marcado: el IVA se declara con cada abono (máximo 90 días).">
              <Checkbox checked={form.generaReciboPago} onChange={v=>setForm(f=>({...f,generaReciboPago:v}))} label="Activado por defecto para este cliente" />
            </FormField>}
          </div>
        </Modal>
      )}
    </div>
  );
}

export function ClientesProveedoresPage() {
  // Misma base que usa Facturación (tabla clientes) — ver data/terceros.ts.
  const [perfiles,setPerfiles]=useState<Perfil[]>([]);
  const [cargado,setCargado]=useState(false);
  // Un tercero puede ser receptor de facturas, cliente/proveedor contable
  // (con cuenta auxiliar nivel 4), o ambos. Los "solo receptores" se
  // crearon desde Facturación sin cuenta: se listan aparte.
  const [flags,setFlags]=useState<Record<string,{receptor:boolean;cuenta:boolean}>>({});
  const [filas,setFilas]=useState<Record<string,TerceroFila>>({});
  const [version,setVersion]=useState(0);
  // Sin facturación electrónica no hay receptores: solo clientes y proveedores.
  const [fe,setFe]=useState(false);
  const [abrirTab,setAbrirTab]=useState<TabId|undefined>(undefined);
  const [activar,setActivar]=useState<TerceroFila|null>(null);
  const [aviso,setAviso]=useState<string|null>(null);
  useEffect(()=>{ if(!aviso)return; const t=setTimeout(()=>setAviso(null),4000); return ()=>clearTimeout(t); },[aviso]);
  useEffect(()=>{
    let vivo=true;
    fetch('/api/empresa').then(r=>r.json()).then(d=>{ if(vivo) setFe(!(d.facturacionElectronica==='no' || (!d.facturacionElectronica && !d.emisorId))); }).catch(()=>{});
    return ()=>{vivo=false;};
  },[]);
  useEffect(()=>{
    let vivo=true;
    fetch('/api/clientes').then(r=>r.json()).then((rows:ClienteDb[])=>{
      if(!vivo)return;
      setFilas(Object.fromEntries(rows.map(r=>[r.id,r as unknown as TerceroFila])));
      const porTipo:Record<string,number>={};
      setPerfiles(rows.map(r=>{ const k=r.tipo??'cliente'; porTipo[k]=(porTipo[k]??0)+1; return filaAPerfil(r,porTipo[k]-1); }));
      setFlags(Object.fromEntries(rows.map(r=>[r.id,{ receptor:Number(r.es_receptor ?? (r.tipo==='proveedor'?0:1))===1, cuenta:Number(r.con_cuenta ?? 1)===1 }])));
      setCargado(true);
    });
    return ()=>{vivo=false;};
  },[version]);
  async function cambiarReceptor(id:string, v:boolean){
    setFlags(f=>({...f,[id]:{...(f[id]??{cuenta:true}),receptor:v}}));
    // Al activarlo se abren sus datos tributarios para completarlos
    setAbrirTab(v?'tributaria':undefined);
    await fetch(`/api/clientes/${id}`,{ method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ esReceptor:v }) });
  }
  async function persistir(p:Perfil, nuevo:boolean){
    const res=await fetch(nuevo?'/api/clientes':`/api/clientes/${p.id}`,{ method:nuevo?'POST':'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(nuevo?{ perfil:p, esReceptor:fe&&nfReceptor }:{ perfil:p }) });
    const data=await res.json().catch(()=>({}));
    return (data.id as string|undefined) ?? p.id;
  }
  const [tipo,setTipo]=useState<'02'|'04'>('02');
  const [nfReceptor,setNfReceptor]=useState(true);
  const [nfHacienda,setNfHacienda]=useState<string|null>(null);
  // Lo que trajo Hacienda al crear: actividades para elegir y régimen
  const [nfActs,setNfActs]=useState<{codigo:string;nombre:string}[]>([]);
  const [nfActividad,setNfActividad]=useState('');
  const [nfRegimen,setNfRegimen]=useState('');
  const [search,setSearch]=useState('');
  const [selected,setSelected]=useState<Perfil|null>(null);
  const [creando,setCreando]=useState(false);
  const [nf,setNf]=useState({ nombre:'',tipoIdentificacion:'juridica',numeroIdentificacion:'',pais:'CR',correo:'',telefono:'',contacto:'',direccion:'',diasCredito:'' });
  // Filtros de la lista: estado, si es receptor de facturación y si tiene crédito
  const [fEstado,setFEstado]=useState<'todos'|'activos'|'inactivos'>('activos');
  const [fReceptor,setFReceptor]=useState<'todos'|'si'|'no'>('todos');
  const [fCredito,setFCredito]=useState<'todos'|'credito'|'contado'>('todos');
  const [verFiltros,setVerFiltros]=useState(false);
  const filtrosActivos=(fEstado!=='activos'?1:0)+(fReceptor!=='todos'?1:0)+(fCredito!=='todos'?1:0);
  const lista=perfiles.filter(p=>p.tipo===tipo && flags[p.id]?.cuenta!==false
    &&(fEstado==='todos'||(fEstado==='activos')===Boolean(p.activo))
    &&(fReceptor==='todos'||(fReceptor==='si')===Boolean(flags[p.id]?.receptor))
    &&(fCredito==='todos'||(fCredito==='credito')===(p.diasCredito>0))
    &&(!search||p.nombre.toLowerCase().includes(search.toLowerCase())||p.auxId.toLowerCase().includes(search.toLowerCase())||p.correo.toLowerCase().includes(search.toLowerCase())||p.numeroIdentificacion.replace(/\D/g,'').includes(search.replace(/\D/g,'')||'§')));

  // acceso directo desde el Catálogo de cuentas (?open=<código de cuenta
  // auxiliar>) - abre de una vez el perfil completo del cliente/proveedor.
  useEffect(() => {
    if (!cargado) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const open = params.get('open');
      const nombreParam = params.get('nombre');
      const tipoParam = params.get('tipo');
      if (!open && !nombreParam && !tipoParam) return;
      // Enlace directo (una sola vez al cargar): se abre la pestaña y el perfil pedidos
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (tipoParam === '02' || tipoParam === '04') setTipo(tipoParam);
      const pool = (tipoParam === '02' || tipoParam === '04') ? perfiles.filter(p=>p.tipo===tipoParam) : perfiles;
      const match = pool.find(p => p.cuentaCode === open || p.auxId === open)
        ?? (nombreParam ? pool.find(p => p.nombre.toLowerCase() === nombreParam.toLowerCase()) : undefined);
      if (match) { setTipo(match.tipo); setSelected(match); }
    } catch { /* noop - SSR o entorno sin window */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargado]);
  function create() {
    if(!nf.nombre||!nf.numeroIdentificacion)return;
    // Siguiente auxiliar libre bajo la cuenta de detalle (no el conteo: podía repetir códigos)
    const detalle=tipo==='02'?'110-001-0001':'300-001-0001';
    const usados=perfiles.filter(p=>p.tipo===tipo&&p.cuentaCode===detalle&&flags[p.id]?.cuenta!==false).map(p=>parseInt(p.auxId,10)||0);
    const count=Math.max(0,...usados)+1;
    const p:Perfil={...nf,diasCredito:nf.diasCredito.trim()?parseInt(nf.diasCredito,10):0,id:`p${Date.now()}`,auxId:String(count).padStart(4,'0'),tipo,activo:true,cuentaCode:tipo==='02'?'110-001-0001':'300-001-0001',cuentaNombre:tipo==='02'?'Clientes nacionales':'Proveedores nacionales',bancarias:[],
      tipoIdTributaria:nf.tipoIdentificacion==='fisica'?'01':'02',nombreComercial:'',representanteLegal:'',actividadEconomica:nfActividad,regimenTributario:nfRegimen,provincia:'',canton:'',distrito:'',barrioSenas:'',
      creadoPor:'usuario',creadoEn:new Date().toISOString().split('T')[0]};
    persistir(p,true).then(id=>{ const conId={...p,id}; setPerfiles(ps=>[...ps,conId]); setFlags(f=>({...f,[id]:{receptor:nfReceptor,cuenta:true}})); setSelected(conId); });
    setCreando(false); setNf({ nombre:'',tipoIdentificacion:'juridica',numeroIdentificacion:'',pais:'CR',correo:'',telefono:'',contacto:'',direccion:'',diasCredito:'' });
    setNfActs([]); setNfActividad(''); setNfRegimen(''); setNfHacienda(null);
  }
  return (
    <div style={{ height:'100%',display:'flex',flexDirection:'column',overflow:'hidden' }}>
      <PageHeader title="Clientes y proveedores" />
      <div style={{ flex:1,display:'flex',overflow:'hidden' }}>
        <div style={{ width:340,minWidth:340,borderRight:`1px solid ${C.n500}`,display:'flex',flexDirection:'column' }}>
          <div style={{ display:'flex',borderBottom:`1px solid ${C.n500}`,background:C.n200 }}>
            {(['02','04'] as const).map(id=>(
              <button key={id} onClick={()=>{setTipo(id);setSelected(null);}} style={{ flex:1,height:40,fontSize:11.5,cursor:'pointer',border:'none',background:'none',color:tipo===id?C.brand:C.n700,fontWeight:tipo===id?600:400,borderBottom:`2px solid ${tipo===id?C.brand:'transparent'}`,fontFamily:"'Montserrat',sans-serif" }}>
                {id==='02'?'Clientes':'Proveedores'} <span style={{ fontWeight:400,color:C.n700 }}>({perfiles.filter(p=>p.tipo===id&&flags[p.id]?.cuenta!==false).length})</span>
              </button>
            ))}
          </div>
          {/* Una sola barra: buscar, filtros (en un panel) y nuevo */}
          <div style={{ padding:'10px 12px',borderBottom:`1px solid ${C.n500}`,display:'flex',gap:8,background:C.n200,position:'relative' }}>
            <div style={{ flex:1,minWidth:0 }}>
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar…" width="100%" />
            </div>
            <button onClick={()=>setVerFiltros(v=>!v)} aria-expanded={verFiltros} aria-label="Filtros"
              style={{ height:32,padding:'0 10px',border:`1px solid ${filtrosActivos>0?C.brand:C.n500}`,borderRadius:6,background:filtrosActivos>0?C.brandBg:'#fff',color:filtrosActivos>0?C.brand:C.n900,fontSize:12,fontFamily:F,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,whiteSpace:'nowrap' }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M2 3h10M4 7h6M6 11h2" /></svg>
              Filtros{filtrosActivos>0?` · ${filtrosActivos}`:''}
            </button>
            <Button icon={<IcPlus className="w-3 h-3" />} onClick={()=>{setNfReceptor(tipo==='02');setCreando(true);}}>Nuevo</Button>
            {verFiltros && (
              <div style={{ position:'absolute',top:'calc(100% + 4px)',left:12,right:12,zIndex:20,background:'#fff',border:`1px solid ${C.n500}`,borderRadius:10,boxShadow:'0 10px 28px rgba(0,0,0,.12)',padding:12,display:'flex',flexDirection:'column',gap:10,fontFamily:F }}>
                <label style={{ display:'flex',flexDirection:'column',gap:4,fontSize:11.5,color:C.n700 }}>Estado
                  <select value={fEstado} onChange={e=>setFEstado(e.target.value as typeof fEstado)} style={FILTRO}>
                    <option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option>
                  </select>
                </label>
                <label style={{ display:'flex',flexDirection:'column',gap:4,fontSize:11.5,color:C.n700 }}>Crédito
                  <select value={fCredito} onChange={e=>setFCredito(e.target.value as typeof fCredito)} style={FILTRO}>
                    <option value="todos">Todos</option><option value="credito">Con crédito</option><option value="contado">De contado</option>
                  </select>
                </label>
                {fe && <label style={{ display:'flex',flexDirection:'column',gap:4,fontSize:11.5,color:C.n700 }}>Facturación electrónica
                  <select value={fReceptor} onChange={e=>setFReceptor(e.target.value as typeof fReceptor)} style={FILTRO}>
                    <option value="todos">Receptores y no receptores</option><option value="si">Solo receptores</option><option value="no">Solo no receptores</option>
                  </select>
                </label>}
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:4 }}>
                  <button onClick={()=>{setFEstado('activos');setFReceptor('todos');setFCredito('todos');}} style={{ background:'none',border:'none',color:C.brand,cursor:'pointer',fontSize:12,fontFamily:F,padding:0 }}>Limpiar</button>
                  <Button onClick={()=>setVerFiltros(false)}>Ver {lista.length} resultado{lista.length===1?'':'s'}</Button>
                </div>
              </div>
            )}
          </div>
          <div style={{ flex:1,overflowY:'auto' }}>
            {lista.length===0&&<p style={{ fontSize:12,color:C.n700,textAlign:'center',padding:24 }}>No hay registros.</p>}
            {lista.map(p=>(
              <button key={p.id} onClick={()=>setSelected(p)} style={{ width:'100%',padding:'10px 12px',background:selected?.id===p.id?C.brandBg:C.n000,border:'none',borderBottom:`1px solid ${C.n500}`,cursor:'pointer',display:'flex',alignItems:'center',gap:10,textAlign:'left',fontFamily:"'Montserrat',sans-serif" }}>
                <Initials n={p.nombre} t={p.tipo} />
                <div style={{ flex:1,minWidth:0 }}><p style={{ fontSize:12,fontWeight:400,color:C.n900,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.nombre}</p><p style={{ fontSize:10,color:C.n700,fontFamily:"'Montserrat',sans-serif" }}>{`${p.cuentaCode}-${p.auxId}`}{fe&&flags[p.id]?.receptor?' · receptor':''}</p></div>
                <StatusBadge label={p.activo?'Activo':'Inactivo'} color={p.activo?'green':'gray'} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex:1,overflow:'hidden',position:'relative',background:C.n000 }}>
          {selected?(
            <div style={{ height:'100%',display:'flex',flexDirection:'column' }}>
            <div style={{ flex:1,minHeight:0,position:'relative' }}>
            <PerfilDetalle key={selected.id+String(Boolean(flags[selected.id]?.receptor))} perfil={selected} fila={filas[selected.id]} receptor={Boolean(flags[selected.id]?.receptor)} fe={fe} tabInicial={abrirTab} onRecargar={()=>setVersion(x=>x+1)} onCambiarReceptor={v=>cambiarReceptor(selected.id,v)}
              onUpdate={p=>{setPerfiles(ps=>ps.map(x=>x.id===p.id?p:x));setSelected(p);persistir(p,false);}} onClose={()=>setSelected(null)} />
            </div>
            </div>
          ):(
            <div style={{ height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,textAlign:'center',padding:32,fontFamily:F,background:C.n000 }}>
              <div style={{ width:56,height:56,borderRadius:14,background:C.brandBg,border:`1px solid ${C.brandBd}`,display:'flex',alignItems:'center',justifyContent:'center' }}><IcUser className="w-6 h-6" style={{ color:C.brand }} /></div>
              <div><p style={{ fontSize:14,fontWeight:500,color:C.n900,marginBottom:4 }}>{lista.length===0?`Sin ${tipo==='02'?'clientes':'proveedores'} registrados`:`Selecciona un ${tipo==='02'?'cliente':'proveedor'}`}</p><p style={{ fontSize:12,color:C.n700 }}>Haz clic en la lista para ver su información.</p></div>
              <Button icon={<IcPlus className="w-3 h-3" />} onClick={()=>{setNfReceptor(tipo==='02');setCreando(true);}}>Nuevo {tipo==='02'?'cliente':'proveedor'}</Button>
            </div>
          )}
        </div>
      </div>
      {activar&&<ActivarCuentaModal tercero={activar} onClose={()=>setActivar(null)} onHecho={r=>{
        setActivar(null); setSelected(null); setTipo('02'); setVersion(x=>x+1);
        setAviso(`Se creó la cuenta ${r.cuenta ?? ''}${r.diasCredito?` con ${r.diasCredito} días de crédito`:''}. Ahora está en Clientes.`);
      }} />}
      {aviso&&<div style={{ position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',zIndex:60,minWidth:300 }}><Toast message={aviso} type="success" onClose={()=>setAviso(null)} /></div>}
      <Modal open={creando} title={`Nuevo ${tipo==='02'?'cliente':'proveedor'}`} onClose={()=>setCreando(false)}
        footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}><Button variant="secondary" onClick={()=>setCreando(false)}>Cancelar</Button><Button onClick={create}>Crear {tipo==='02'?'cliente':'proveedor'}</Button></div>}>
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          <FormField label="Nombre / Razón social" required><Input value={nf.nombre} onChange={v=>setNf(f=>({...f,nombre:v}))} placeholder="Nombre" /></FormField>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <FormField label="Tipo de identificación" required><Select value={nf.tipoIdentificacion} onChange={v=>setNf(f=>({...f,tipoIdentificacion:v}))} options={TIPOS_ID} /></FormField>
            <FormField label="Número de identificación" required hint={nfHacienda ?? 'Con la cédula se trae el nombre desde Hacienda.'}>
              <div style={{ display:'flex',gap:8 }}>
                <div style={{ flex:1 }}><Input value={nf.numeroIdentificacion} onChange={v=>setNf(f=>({...f,numeroIdentificacion:v}))} placeholder="3-101-456789" /></div>
                <Button variant="secondary" onClick={async()=>{
                  const dig=nf.numeroIdentificacion.replace(/\D/g,'');
                  if(dig.length<9){ setNfHacienda('Escribe la cédula completa.'); return; }
                  setNfHacienda('Consultando…');
                  const r=await fetch(`/api/hacienda/contribuyente?id=${dig}`).catch(()=>null); const d=r?await r.json().catch(()=>({})):{};
                  if(!r||!r.ok){ setNfHacienda(d.error??'No se pudo consultar Hacienda.'); return; }
                  setNf(f=>({...f,nombre:d.nombre||f.nombre,tipoIdentificacion:d.tipoIdentificacion==='01'?'fisica':d.tipoIdentificacion==='02'?'juridica':f.tipoIdentificacion}));
                  const acts=Array.isArray(d.actividades)?d.actividades:[]; setNfActs(acts); setNfActividad(acts[0]?`${acts[0].codigo} - ${acts[0].nombre}`:'');
                  setNfRegimen(/simplific/i.test(String(d.regimen??''))?'02':d.regimen?'01':'');
                  setNfHacienda(`Hacienda: ${d.nombre||'sin nombre'}${(d.actividades??[]).length?` · ${(d.actividades??[]).length} actividad${(d.actividades??[]).length===1?'':'es'} inscrita${(d.actividades??[]).length===1?'':'s'}`:''}`);
                }}>Consultar</Button>
              </div>
            </FormField>
            {nfActs.length>0 && (
              <FormField label="Actividad económica (de Hacienda)" hint="La que va en sus comprobantes. Se puede cambiar después en Información tributaria.">
                <Select value={nfActividad} onChange={setNfActividad} options={nfActs.map(a=>({ value:`${a.codigo} - ${a.nombre}`, label:`${a.codigo} - ${a.nombre}` }))} />
              </FormField>
            )}
            <FormField label="País"><Select value={nf.pais} onChange={v=>setNf(f=>({...f,pais:v}))} options={PAISES} /></FormField>
            <FormField label="Teléfono"><Input value={nf.telefono} onChange={v=>setNf(f=>({...f,telefono:v}))} /></FormField>
            <FormField label="Correo electrónico"><Input value={nf.correo} onChange={v=>setNf(f=>({...f,correo:v}))} /></FormField>
            <FormField label="Contacto principal"><Input value={nf.contacto} onChange={v=>setNf(f=>({...f,contacto:v}))} /></FormField>
            <FormField label="Dirección"><Input value={nf.direccion} onChange={v=>setNf(f=>({...f,direccion:v}))} /></FormField>
            <FormField label="Días de crédito" hint="La fecha de vencimiento de cada factura se calcula sumando estos días.">
              <Input type="number" min="0" value={nf.diasCredito} onChange={v=>setNf(f=>({...f,diasCredito:v}))} placeholder="0 = contado" />
            </FormField>
          </div>
          {fe&&<div style={{ border:`1px solid ${C.brandBd}`,background:C.brandBg,borderRadius:8,padding:'10px 12px' }}>
            <p style={{ fontSize:12.5,fontWeight:600,color:C.n900,margin:0 }}>¿Usarlo también como receptor de facturas?</p>
            <p style={{ fontSize:11,color:C.n700,margin:'2px 0 8px' }}>Si sí, aparece al crear una factura en Facturación electrónica.</p>
            <div style={{ display:'flex',gap:20 }}>
              <label style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer' }}><input type="radio" name="es-receptor" checked={nfReceptor} onChange={()=>setNfReceptor(true)} /> Sí, también es receptor</label>
              <label style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer' }}><input type="radio" name="es-receptor" checked={!nfReceptor} onChange={()=>setNfReceptor(false)} /> No, solo {tipo==='02'?'cliente':'proveedor'} contable</label>
            </div>
          </div>}
          <p style={{ fontSize:11,color:C.n700,margin:0 }}>Se le crea la cuenta auxiliar {tipo==='02'?'110-001-0001':'300-001-0001'}-XXXX. Las cuentas bancarias y la información fiscal completa se agregan después, desde sus propias pestañas.</p>
        </div>
      </Modal>
    </div>
  );
}
