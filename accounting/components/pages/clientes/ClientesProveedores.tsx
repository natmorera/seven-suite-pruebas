'use client';
import { useState, useEffect } from 'react';
import { PageHeader, InfoBox, Modal, Toast, RowAction } from '@/components/ui/primitives';
import { Button, FormField, Input, Select, Checkbox } from '@/components/ui/formulario';
import { StatusBadge } from '@/components/ui/tabla';
import { radius, TABLA , C, FONT } from '@/components/ui/tokens';
import { SearchInput } from '@/components/ui/filtros';
import { IcPlus, IcEdit, IcTrash, IcClose, IcCheck, IcUser } from '@/components/ui/icons';

const F = FONT;

type TabId = 'basica' | 'bancaria' | 'fiscal';

const PAISES = [{ value:'CR',label:'Costa Rica' },{ value:'NI',label:'Nicaragua' },{ value:'GT',label:'Guatemala' },{ value:'HN',label:'Honduras' },{ value:'SV',label:'El Salvador' },{ value:'PA',label:'Panamá' }];
const TIPOS_ID = [{ value:'juridica',label:'Persona jurídica' },{ value:'fisica',label:'Persona física' },{ value:'extranjer',label:'Extranjero' }];
const MONEDAS_BANCO = [{ value:'CRC',label:'¢ Colón costarricense' },{ value:'USD',label:'$ Dólar estadounidense' },{ value:'EUR',label:'€ Euro' }];
const TIPOS_CUENTA  = [{ value:'corriente',label:'Cuenta corriente' },{ value:'ahorros',label:'Cuenta de ahorros' }];
const PAIS_LABEL: Record<string,string> = { CR:'Costa Rica',NI:'Nicaragua',GT:'Guatemala',HN:'Honduras',SV:'El Salvador',PA:'Panamá' };
const TIPO_LABEL:  Record<string,string> = { juridica:'Persona jurídica',fisica:'Persona física',extranjer:'Extranjero' };

const REGIMENES_TRIB = [{ value:'',label:'- Seleccionar -' },{ value:'01',label:'Régimen general' },{ value:'02',label:'Régimen simplificado' }];
const TIPOS_ID_TRIB = [{ value:'01',label:'01 - Cédula física' },{ value:'02',label:'02 - Cédula jurídica' },{ value:'03',label:'03 - DIMEX' }];
const PROVINCIAS = [{ value:'',label:'- Seleccionar -' },...['San José','Alajuela','Cartago','Heredia','Guanacaste','Puntarenas','Limón'].map(p=>({ value:p,label:p }))];

interface Bancaria { id:string;banco:string;numero:string;moneda:string;tipo:string;titulo:string;principal:boolean; }
interface Perfil {
  id:string;auxId:string;tipo:'02'|'04';activo:boolean;
  nombre:string;tipoIdentificacion:string;numeroIdentificacion:string;pais:string;
  correo:string;telefono:string;contacto:string;direccion:string;
  cuentaCode:string;cuentaNombre:string;bancarias:Bancaria[];
  // Condiciones comerciales - días de crédito faltaba por completo en este
  // formulario; la fecha de vencimiento de cada factura se calcula sumando estos días
  // (ese cálculo vive en Histórico clientes/proveedores, donde están las facturas reales).
  diasCredito:number;
  // Datos fiscales del cliente o proveedor
  tipoIdTributaria:string;nombreComercial:string;representanteLegal:string;actividadEconomica:string;regimenTributario:string;
  provincia:string;canton:string;distrito:string;barrioSenas:string;
  creadoPor:string;creadoEn:string;
}

const INIT: Perfil[] = [
  { id:'c1',auxId:'0001',tipo:'02',activo:true,nombre:'Distribuidora La Florida S.A.',tipoIdentificacion:'juridica',numeroIdentificacion:'3-101-456789',pais:'CR',correo:'ventas@laflorida.cr',telefono:'+506 2234-5678',contacto:'Andrea Rojas',direccion:'San José, Barrio Escalante',cuentaCode:'100-002-0001',cuentaNombre:'Clientes nacionales',bancarias:[],
    diasCredito:30, tipoIdTributaria:'02', nombreComercial:'La Florida', representanteLegal:'Andrea Rojas', actividadEconomica:'4649 - Venta al por mayor de otros enseres domésticos', regimenTributario:'01', provincia:'San José', canton:'San José', distrito:'Carmen', barrioSenas:'Barrio Escalante, 200m norte del parque',
    creadoPor:'jperez',creadoEn:'2026-03-12' },
  { id:'c2',auxId:'0002',tipo:'02',activo:true,nombre:'Hotel Las Palmas S.A.',tipoIdentificacion:'juridica',numeroIdentificacion:'3-101-789012',pais:'CR',correo:'admin@laspalmas.cr',telefono:'+506 2291-0000',contacto:'',direccion:'',cuentaCode:'100-002-0001',cuentaNombre:'Clientes nacionales',bancarias:[],
    diasCredito:15, tipoIdTributaria:'02', nombreComercial:'', representanteLegal:'', actividadEconomica:'', regimenTributario:'', provincia:'', canton:'', distrito:'', barrioSenas:'',
    creadoPor:'sblandon',creadoEn:'2026-04-01' },
  { id:'p1',auxId:'0001',tipo:'04',activo:true,nombre:'Comercial Ferretero Monteverde',tipoIdentificacion:'juridica',numeroIdentificacion:'3-101-222333',pais:'CR',correo:'compras@cfm.cr',telefono:'+506 2645-1234',contacto:'Luis Barrantes',direccion:'Monteverde, Puntarenas',cuentaCode:'200-001-0001',cuentaNombre:'Proveedores nacionales',bancarias:[{ id:'b1',banco:'BAC San José',numero:'CR21015108010010012345',moneda:'CRC',tipo:'corriente',titulo:'',principal:true }],
    diasCredito:45, tipoIdTributaria:'02', nombreComercial:'Ferretero Monteverde', representanteLegal:'Luis Barrantes', actividadEconomica:'4752 - Venta al por menor de artículos de ferretería', regimenTributario:'01', provincia:'Puntarenas', canton:'Monteverde', distrito:'Monteverde', barrioSenas:'Centro de Monteverde',
    creadoPor:'jperez',creadoEn:'2026-02-15' },
];

function Initials({ n, t }: { n:string;t:string }) {
  const w = n.trim().split(/\s+/);
  const txt = w.length>=2?(w[0][0]+w[1][0]).toUpperCase():n.slice(0,2).toUpperCase();
  return <div style={{ width:36,height:36,borderRadius:'50%',background:t==='02'?'#E6F1FB':'#E1F5EE',color:t==='02'?'#0C447C':'#085041',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0,fontFamily:"'Montserrat',sans-serif" }}>{txt}</div>;
}
function SL({ c }: { c:React.ReactNode }) { return <p style={{ fontSize:10.5,fontWeight:600,color:C.n700,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6,paddingBottom:4,borderBottom:`1px solid ${C.n500}` }}>{c}</p>; }
function RF({ l, v }: { l:string;v?:string;m?:boolean }) { return <div><p style={{ fontSize:10.5,color:C.n700,marginBottom:2 }}>{l}</p><p style={{ fontSize:12,color:v?C.n900:'#ECECEC',fontFamily:"'Montserrat',sans-serif" }}>{v||'-'}</p></div>; }

function PerfilDetalle({ perfil,onUpdate,onClose }: { perfil:Perfil;onUpdate:(p:Perfil)=>void;onClose:()=>void }) {
  const [tab,setTab]=useState<TabId>('basica');
  const [editando,setEdit]=useState(false);
  const [addB,setAddB]=useState(false);
  const [toast,setToast]=useState<{message:string;type:'success'|'error'}|null>(null);
  const [form,setForm]=useState({ nombre:perfil.nombre,tipoIdentificacion:perfil.tipoIdentificacion,numeroIdentificacion:perfil.numeroIdentificacion,pais:perfil.pais,correo:perfil.correo,telefono:perfil.telefono,contacto:perfil.contacto,direccion:perfil.direccion,diasCredito:String(perfil.diasCredito) });
  const [bForm,setBForm]=useState({ banco:'',numero:'',moneda:'CRC',tipo:'corriente',titulo:'',principal:false });
  const [fForm,setFForm]=useState({ tipoIdTributaria:perfil.tipoIdTributaria,nombreComercial:perfil.nombreComercial,representanteLegal:perfil.representanteLegal,actividadEconomica:perfil.actividadEconomica,regimenTributario:perfil.regimenTributario,provincia:perfil.provincia,canton:perfil.canton,distrito:perfil.distrito,barrioSenas:perfil.barrioSenas });
  const showT=(m:string)=>{ setToast({message:m,type:'success'});setTimeout(()=>setToast(null),3000); };
  const fullCode=`${perfil.cuentaCode}-${perfil.auxId}`;
  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%',background:C.n000,position:'relative' }}>
      <div style={{ padding:'12px 16px',borderBottom:`1px solid ${C.n500}`,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexShrink:0 }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,minWidth:0 }}>
          <Initials n={perfil.nombre} t={perfil.tipo} />
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:13,fontWeight:500,color:C.n900 }}>{perfil.nombre}</p>
            <div style={{ display:'flex',gap:6,marginTop:2 }}><span style={{ fontSize:10.5,color:C.n900,fontFamily:F }}>{perfil.auxId}</span><span style={{ fontSize:10.5,color:C.n700 }}>·</span><span style={{ fontSize:10.5,color:C.n900,fontFamily:F }}>{fullCode}</span></div>
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
        {(['basica','bancaria','fiscal'] as TabId[]).map(id=>(
          <button key={id} onClick={()=>setTab(id)} style={{ padding:'0 14px',height:40,fontSize:12,cursor:'pointer',border:'none',background:'none',color:tab===id?C.brand:C.n700,fontWeight:400,borderBottom:`2px solid ${tab===id?C.brand:'transparent'}`,fontFamily:"'Montserrat',sans-serif",display:'flex',alignItems:'center',gap:6 }}>
            {id==='basica'?'Información básica':id==='bancaria'?'Cuentas bancarias':'Fiscal'}
            {id==='fiscal'&&<span style={{ fontSize:10.5,padding:'1px 5px',background:C.n200,color:C.n700,borderRadius:radius.md }}>Opcional</span>}
          </button>
        ))}
      </div>
      <div style={{ flex:1,overflowY:'auto',padding:16 }}>
        {tab==='basica'&&(
          <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
            <div style={{ background:C.brandBg,border:`1px solid ${C.brandBd}`,borderRadius:radius.md,padding:'10px 14px',display:'flex',justifyContent:'space-between' }}>
              <div><p style={{ fontSize:10.5,color:'#8A6200',marginBottom:2 }}>ID auxiliar (4° nivel)</p><span style={{ fontSize:13,fontWeight:500,color:'#412402',fontFamily:F }}>{fullCode}</span></div>
              <div style={{ textAlign:'right' }}><p style={{ fontSize:10.5,color:'#8A6200',marginBottom:2 }}>Cuenta vinculada</p><p style={{ fontSize:11,color:'#633806' }}>{perfil.cuentaCode} · {perfil.cuentaNombre}</p></div>
            </div>
            <div><SL c="Datos de identificación" /><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}><RF l="Nombre / Razón social" v={perfil.nombre} /><RF l="Tipo de identificación" v={TIPO_LABEL[perfil.tipoIdentificacion]} /><RF l="Número de identificación" v={perfil.numeroIdentificacion} m /><RF l="País" v={PAIS_LABEL[perfil.pais]} /></div></div>
            <div><SL c="Condiciones comerciales" /><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}><RF l="Días de crédito" v={perfil.diasCredito>0?`${perfil.diasCredito} días`:'Contado (0 días)'} /></div></div>
            <div><SL c="Contacto" /><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}><RF l="Correo electrónico" v={perfil.correo} /><RF l="Teléfono" v={perfil.telefono} /><RF l="Contacto principal" v={perfil.contacto} /><RF l="Dirección" v={perfil.direccion} /></div></div>
            <p style={{ fontSize:11,color:C.n700 }}>Creado por {perfil.creadoPor} · {perfil.creadoEn}</p>
          </div>
        )}
        {tab==='bancaria'&&(
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div style={TABLA.wrap}><table className="tabla" style={TABLA.table}>
              <thead><tr style={TABLA.headRow}>{['Banco','Moneda','Tipo','Título','N.° Cuenta','Acciones'].map(h=><th key={h} style={TABLA.th}>{h}</th>)}</tr></thead>
              <tbody>
                {perfil.bancarias.length===0&&!addB&&<tr><td colSpan={6} style={TABLA.empty}>No hay cuentas bancarias registradas.</td></tr>}
                {perfil.bancarias.map(b=>(
                  <tr key={b.id} style={{ borderTop:'1px solid #ECECEC' }}>
                    <td style={{ padding:'8px 12px' }}>{b.banco}{b.principal&&<span style={{ fontSize:10.5,marginLeft:6,padding:'1px 5px',background:C.brandBg,color:C.brand,border:`1px solid ${C.brandBd}`,borderRadius:radius.md }}>Principal</span>}</td>
                    <td style={{ padding:'8px 12px' }}>{b.moneda}</td>
                    <td style={{ padding:'8px 12px' }}>{TIPOS_CUENTA.find(t=>t.value===b.tipo)?.label}</td>
                    <td style={{ padding:'8px 12px' }}>{b.titulo||'-'}</td>
                    <td style={{ padding:'8px 12px', fontFamily:"'Montserrat',sans-serif" }}>{b.numero}</td>
                    <td style={{ padding:'8px 12px' }}><RowAction title="Eliminar" danger onClick={()=>onUpdate({...perfil,bancarias:perfil.bancarias.filter(x=>x.id!==b.id)})}><IcTrash className="w-3.5 h-3.5"/></RowAction></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
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
        {tab==='fiscal'&&(
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            <InfoBox>Información requerida por el Ministerio de Hacienda de Costa Rica para factura electrónica.</InfoBox>
            <SL c="Datos fiscales" />
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <FormField label="Tipo de identificación tributaria"><Select value={fForm.tipoIdTributaria} onChange={v=>setFForm(f=>({...f,tipoIdTributaria:v}))} options={TIPOS_ID_TRIB} /></FormField>
              <FormField label="N.° identificación tributaria"><Input value={perfil.numeroIdentificacion} onChange={()=>{}} disabled /></FormField>
              <FormField label="Nombre comercial"><Input value={fForm.nombreComercial} onChange={v=>setFForm(f=>({...f,nombreComercial:v}))} placeholder="Nombre en factura" /></FormField>
              <FormField label="Representante legal"><Input value={fForm.representanteLegal} onChange={v=>setFForm(f=>({...f,representanteLegal:v}))} placeholder="Nombre completo" /></FormField>
              <FormField label="Actividad económica"><Input value={fForm.actividadEconomica} onChange={v=>setFForm(f=>({...f,actividadEconomica:v}))} placeholder="Ej. 5510 - Hoteles" /></FormField>
              <FormField label="Régimen tributario"><Select value={fForm.regimenTributario} onChange={v=>setFForm(f=>({...f,regimenTributario:v}))} options={REGIMENES_TRIB} /></FormField>
            </div>
            <SL c="Dirección fiscal" />
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <FormField label="Provincia"><Select value={fForm.provincia} onChange={v=>setFForm(f=>({...f,provincia:v}))} options={PROVINCIAS} /></FormField>
              <FormField label="Cantón"><Input value={fForm.canton} onChange={v=>setFForm(f=>({...f,canton:v}))} placeholder="Cantón" /></FormField>
              <FormField label="Distrito"><Input value={fForm.distrito} onChange={v=>setFForm(f=>({...f,distrito:v}))} placeholder="Distrito" /></FormField>
              <FormField label="Barrio / Otras señas"><Input value={fForm.barrioSenas} onChange={v=>setFForm(f=>({...f,barrioSenas:v}))} placeholder="Barrio o señas" /></FormField>
            </div>
            <div style={{ display:'flex',justifyContent:'flex-end' }}>
              <Button icon={<IcCheck className="w-3 h-3" />} onClick={()=>{ onUpdate({...perfil,...fForm}); showT('Información fiscal guardada.'); }}>Guardar información fiscal</Button>
            </div>
          </div>
        )}
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
          </div>
        </Modal>
      )}
    </div>
  );
}

export function ClientesProveedoresPage() {
  const [perfiles,setPerfiles]=useState<Perfil[]>(INIT);
  const [tipo,setTipo]=useState<'02'|'04'>('02');
  const [search,setSearch]=useState('');
  const [selected,setSelected]=useState<Perfil|null>(null);
  const [creando,setCreando]=useState(false);
  const [nf,setNf]=useState({ nombre:'',tipoIdentificacion:'juridica',numeroIdentificacion:'',pais:'CR',correo:'',telefono:'',contacto:'',direccion:'',diasCredito:'' });
  const lista=perfiles.filter(p=>p.tipo===tipo&&(!search||p.nombre.toLowerCase().includes(search.toLowerCase())||p.auxId.toLowerCase().includes(search.toLowerCase())));

  // acceso directo desde el Catálogo de cuentas (?open=<código de cuenta
  // auxiliar>) - abre de una vez el perfil completo del cliente/proveedor.
  /* eslint-disable react-hooks/set-state-in-effect -- la página se prerenderiza sin parámetros; los de la URL se leen en el navegador después de hidratar */
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const open = params.get('open');
      const nombreParam = params.get('nombre');
      const tipoParam = params.get('tipo');
      if (!open && !nombreParam && !tipoParam) return;
      if (tipoParam === '02' || tipoParam === '04') setTipo(tipoParam);
      const pool = (tipoParam === '02' || tipoParam === '04') ? perfiles.filter(p=>p.tipo===tipoParam) : perfiles;
      const match = pool.find(p => p.cuentaCode === open || p.auxId === open)
        ?? (nombreParam ? pool.find(p => p.nombre.toLowerCase() === nombreParam.toLowerCase()) : undefined);
      if (match) { setTipo(match.tipo); setSelected(match); }
    } catch { /* noop - SSR o entorno sin window */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- los parámetros de la URL se leen una sola vez, al abrir la pantalla
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  function create() {
    if(!nf.nombre||!nf.numeroIdentificacion)return;
    const count=perfiles.filter(p=>p.tipo===tipo).length+1;
    const p:Perfil={...nf,diasCredito:nf.diasCredito.trim()?parseInt(nf.diasCredito,10):0,id:`p${Date.now()}`,auxId:String(count).padStart(4,'0'),tipo,activo:true,cuentaCode:tipo==='02'?'100-002-0001':'200-001-0001',cuentaNombre:tipo==='02'?'Clientes nacionales':'Proveedores nacionales',bancarias:[],
      tipoIdTributaria:'02',nombreComercial:'',representanteLegal:'',actividadEconomica:'',regimenTributario:'',provincia:'',canton:'',distrito:'',barrioSenas:'',
      creadoPor:'usuario',creadoEn:new Date().toISOString().split('T')[0]};
    setPerfiles(ps=>[...ps,p]); setSelected(p); setCreando(false); setNf({ nombre:'',tipoIdentificacion:'juridica',numeroIdentificacion:'',pais:'CR',correo:'',telefono:'',contacto:'',direccion:'',diasCredito:'' });
  }
  return (
    <div style={{ height:'100%',display:'flex',flexDirection:'column',overflow:'hidden' }}>
      <PageHeader title="Clientes y proveedores" />
      <div style={{ flex:1,display:'flex',overflow:'hidden' }}>
        <div style={{ width:260,minWidth:260,borderRight:`1px solid ${C.n500}`,display:'flex',flexDirection:'column' }}>
          <div style={{ display:'flex',borderBottom:`1px solid ${C.n500}`,background:C.n200 }}>
            {(['02','04'] as const).map(id=>(
              <button key={id} onClick={()=>{setTipo(id);setSelected(null);}} style={{ flex:1,height:40,fontSize:12,cursor:'pointer',border:'none',background:'none',color:tipo===id?C.brand:C.n700,fontWeight:tipo===id?600:400,borderBottom:`2px solid ${tipo===id?C.brand:'transparent'}`,fontFamily:"'Montserrat',sans-serif" }}>
                {id==='02'?'Clientes':'Proveedores'}
              </button>
            ))}
          </div>
          <div style={{ padding:'10px 12px',borderBottom:`1px solid ${C.n500}`,display:'flex',gap:8,background:C.n200 }}>
            <div style={{ flex:1 }}>
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar…" width="100%" />
            </div>
            <Button icon={<IcPlus className="w-3 h-3" />} onClick={()=>setCreando(true)}>Nuevo</Button>
          </div>
          <div style={{ flex:1,overflowY:'auto' }}>
            {lista.length===0&&<p style={{ fontSize:12,color:C.n700,textAlign:'center',padding:24 }}>No hay registros.</p>}
            {lista.map(p=>(
              <button key={p.id} onClick={()=>setSelected(p)} style={{ width:'100%',padding:'10px 12px',background:selected?.id===p.id?C.brandBg:C.n000,border:'none',borderBottom:`1px solid ${C.n500}`,cursor:'pointer',display:'flex',alignItems:'center',gap:10,textAlign:'left',fontFamily:"'Montserrat',sans-serif" }}>
                <Initials n={p.nombre} t={p.tipo} />
                <div style={{ flex:1,minWidth:0 }}><p style={{ fontSize:12,fontWeight:400,color:C.n900,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.nombre}</p><p style={{ fontSize:10.5,color:C.n700,fontFamily:"'Montserrat',sans-serif" }}>{p.auxId}</p></div>
                <StatusBadge label={p.activo?'Activo':'Inactivo'} color={p.activo?'green':'gray'} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex:1,overflow:'hidden',position:'relative',background:C.n000 }}>
          {selected?(
            <PerfilDetalle perfil={selected} onUpdate={p=>{setPerfiles(ps=>ps.map(x=>x.id===p.id?p:x));setSelected(p);}} onClose={()=>setSelected(null)} />
          ):(
            <div style={{ height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,textAlign:'center',padding:32,fontFamily:F,background:C.n000 }}>
              <div style={{ width:56,height:56,borderRadius:14,background:C.brandBg,border:`1px solid ${C.brandBd}`,display:'flex',alignItems:'center',justifyContent:'center' }}><IcUser className="w-6 h-6" style={{ color:C.brand }} /></div>
              <div><p style={{ fontSize:14,fontWeight:500,color:C.n900,marginBottom:4 }}>{lista.length===0?`Sin ${tipo==='02'?'clientes':'proveedores'} registrados`:`Seleccioná un ${tipo==='02'?'cliente':'proveedor'}`}</p><p style={{ fontSize:12,color:C.n700 }}>Hacé clic en la lista para ver su información.</p></div>
              <Button icon={<IcPlus className="w-3 h-3" />} onClick={()=>setCreando(true)}>Nuevo {tipo==='02'?'cliente':'proveedor'}</Button>
            </div>
          )}
        </div>
      </div>
      <Modal open={creando} title={`Nuevo ${tipo==='02'?'cliente':'proveedor'}`} onClose={()=>setCreando(false)}
        footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}><Button variant="secondary" onClick={()=>setCreando(false)}>Cancelar</Button><Button onClick={create}>Crear {tipo==='02'?'cliente':'proveedor'}</Button></div>}>
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          <FormField label="Nombre / Razón social" required><Input value={nf.nombre} onChange={v=>setNf(f=>({...f,nombre:v}))} placeholder="Nombre" /></FormField>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <FormField label="Tipo de identificación" required><Select value={nf.tipoIdentificacion} onChange={v=>setNf(f=>({...f,tipoIdentificacion:v}))} options={TIPOS_ID} /></FormField>
            <FormField label="Número de identificación" required><Input value={nf.numeroIdentificacion} onChange={v=>setNf(f=>({...f,numeroIdentificacion:v}))} placeholder="3-101-456789" /></FormField>
            <FormField label="País"><Select value={nf.pais} onChange={v=>setNf(f=>({...f,pais:v}))} options={PAISES} /></FormField>
            <FormField label="Teléfono"><Input value={nf.telefono} onChange={v=>setNf(f=>({...f,telefono:v}))} /></FormField>
            <FormField label="Correo electrónico"><Input value={nf.correo} onChange={v=>setNf(f=>({...f,correo:v}))} /></FormField>
            <FormField label="Contacto principal"><Input value={nf.contacto} onChange={v=>setNf(f=>({...f,contacto:v}))} /></FormField>
            <FormField label="Dirección"><Input value={nf.direccion} onChange={v=>setNf(f=>({...f,direccion:v}))} /></FormField>
            <FormField label="Días de crédito" hint="La fecha de vencimiento de cada factura se calcula sumando estos días.">
              <Input type="number" min="0" value={nf.diasCredito} onChange={v=>setNf(f=>({...f,diasCredito:v}))} placeholder="0 = contado" />
            </FormField>
          </div>
          <p style={{ fontSize:11,color:C.n700,margin:0 }}>Las cuentas bancarias y la información fiscal completa se agregan después de crear el registro, desde sus propias pestañas.</p>
        </div>
      </Modal>
    </div>
  );
}
