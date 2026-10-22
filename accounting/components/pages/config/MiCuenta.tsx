'use client';
import { useState, useEffect } from 'react';
import { Toast, PageHeader } from '@/components/ui/primitives';
import { C, USUARIO_ACTUAL, FONT, radius, PAGE_PAD, TABLA } from '@/components/ui/tokens';
import { IcCheck, IcEye, IcEyeOff } from '@/components/ui/icons';
import { USUARIOS_INIT, PLANTILLAS_INIT, PERMISSIONS_TREE, countChecked, countLeaves, leafIsChecked } from './permissionsData';

const F = FONT;
const BRAND = C.brand;

// Mismas impresoras que ya se configuran a nivel de empresa por tipo de
// documento (Empresa > Impresoras). Esto es la preferencia PERSONAL del
// usuario logueado, preguntada de la misma forma (por tipo de documento):
// cuando imprime algo desde su propia sesión, se usa esta en vez de la que
// la empresa asignó para ese tipo de documento, si la tiene puesta.
const IMPRESORAS = ['HP LaserJet Pro', 'Epson L3150'];
const TIPOS_DOCUMENTO = [
  { tipo:'Documentos', codigo:'DOC-001' },
  { tipo:'Cheques',    codigo:'CHQ-001' },
  { tipo:'Facturas',   codigo:'FAC-001' },
  { tipo:'Recibos',    codigo:'REC-001' },
];

// Las firmas se configuran en un único lugar: Parámetros generales › Firmas, donde se enlaza
// cada firma a un usuario y se define qué reportes firma y en qué orden.
type Tab = 'perfil' | 'permisos' | 'clave' | 'impresora';

// ── Vista de solo lectura de los permisos del usuario logueado ──────────────
// A propósito NO reutiliza PermissionTree: esa es para editar (checkboxes que
// sí hacen algo). Acá el usuario solo puede ver qué tiene, nunca cambiarlo -
// eso sigue siendo trabajo de un administrador en Usuarios y permisos.
function MisPermisosView({ perms }: { perms: Set<string> }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {PERMISSIONS_TREE.map(cat => (
        <div key={cat.key}>
          <p style={{ fontSize:11, fontWeight:600, color:C.n700, letterSpacing:'.05em', textTransform:'uppercase', margin:'0 0 8px' }}>{cat.label}</p>
          {cat.modules.map(mod => {
            const n = countChecked(mod, perms);
            const total = countLeaves(mod);
            const leaves = mod.leaves ?? (mod.groups ?? []).flatMap(g => g.leaves);
            if (n === 0) {
              // Si no hay nada asignado se dice explícitamente.
              return (
                <div key={mod.key} style={{ border:`1px solid ${C.n500}`, borderRadius:radius.md, marginBottom:8, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#F9F9F9' }}>
                  <span style={{ fontSize:13, fontWeight:500, color:C.n700 }}>{mod.label}</span>
                  <span style={{ fontSize:11, color:'#757575', fontStyle:'italic' }}>Sin acceso</span>
                </div>
              );
            }
            return (
              <div key={mod.key} style={{ border:`1px solid ${C.n500}`, borderRadius:radius.md, marginBottom:8, overflow:'hidden', background:'#FFFFFF' }}>
                <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#F9F9F9', borderBottom:`1px solid ${C.n500}` }}>
                  <span style={{ fontSize:13, fontWeight:500, color:C.n900 }}>{mod.label}</span>
                  <span style={{ fontSize:11, color: n===total ? C.success : C.n700 }}>{n}/{total}</span>
                </div>
                <div style={{ padding:'6px 14px' }}>
                  {leaves.filter(l=>leafIsChecked(l, perms)).map(l => (
                    <div key={l.key} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0' }}>
                      <span style={{ width:16, height:16, borderRadius:4, background:'#EAF5EE', border:'1px solid #C1DECD', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <IcCheck className="w-2.5 h-2.5" style={{ color:C.success }}/>
                      </span>
                      <span style={{ fontSize:12.5, color:C.n900 }}>
                        {l.label}
                        {l.subOptions && (
                          <span style={{ color:C.n700, fontWeight:400 }}> - {l.subOptions.filter(o=>perms.has(`${l.key}:${o}`)).join(', ')}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function MiCuenta() {
  const [tab, setTab] = useState<Tab>('perfil');
  const [toast, setToast] = useState<string|null>(null);
  const [impresoras, setImpresoras] = useState<Record<string,string>>({});

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verActual, setVerActual] = useState(false);
  const [verNueva, setVerNueva] = useState(false);
  const [error, setError] = useState('');

  // Acceso directo por URL a una pestaña específica (?tab=impresora, etc.)
  /* eslint-disable react-hooks/set-state-in-effect -- la página se prerenderiza sin parámetros; la pestaña de la URL se lee en el navegador después de hidratar */
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tParam = params.get('tab');
      if (tParam === 'perfil' || tParam === 'permisos' || tParam === 'clave' || tParam === 'impresora') {
        setTab(tParam);
      }
    } catch { /* noop - SSR o entorno sin window */ }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const usuario = USUARIOS_INIT.find(u => u.usuario === USUARIO_ACTUAL);
  const rol = usuario?.plantillaId ? PLANTILLAS_INIT.find(p => p.id === usuario.plantillaId) : undefined;

  function cambiarClave() {
    if (!actual.trim()) { setError('Ingresá tu contraseña actual'); return; }
    if (nueva.trim().length < 8) { setError('La nueva contraseña debe tener al menos 8 caracteres'); return; }
    if (nueva !== confirmar) { setError('Las contraseñas no coinciden'); return; }
    setError('');
    setActual(''); setNueva(''); setConfirmar('');
    setToast('Contraseña actualizada');
  }

  if (!usuario) {
    return <div style={{ padding:24, fontFamily:F, color:C.n700, fontSize:12 }}>No se encontró tu usuario ({USUARIO_ACTUAL}).</div>;
  }

  const inputStyle: React.CSSProperties = { width:'100%', height:36, padding:'0 36px 0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' };
  const TABS: [Tab,string][] = [['perfil','Mi perfil'],['permisos','Mis permisos'],['clave','Contraseña'],['impresora','Impresora']];

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>
      <PageHeader title="Mi cuenta" />

      <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'0 24px', display:'flex', gap:4, flexShrink:0 }}>
        {TABS.map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)}
            style={{ height:44, padding:'0 4px', marginRight:22, border:'none', background:'none', cursor:'pointer',
              borderBottom:`2px solid ${tab===key?BRAND:'transparent'}`, color:tab===key?BRAND:C.n700,
              fontWeight:tab===key?600:400, fontSize:13, fontFamily:F }}>{label}</button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:PAGE_PAD, maxWidth:640 }}>
        {tab==='perfil' && (
          <div style={{ background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:10, padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <p style={{ fontSize:10.5, color:C.n700, margin:'0 0 3px' }}>Usuario</p>
                <p style={{ fontSize:13, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{usuario.usuario}</p>
              </div>
              <div>
                <p style={{ fontSize:10.5, color:C.n700, margin:'0 0 3px' }}>Nombre</p>
                <p style={{ fontSize:13, fontWeight:500, color:C.n900, margin:0 }}>{usuario.descripcion}</p>
              </div>
              <div>
                <p style={{ fontSize:10.5, color:C.n700, margin:'0 0 3px' }}>Rol</p>
                <p style={{ fontSize:13, fontWeight:500, color:C.n900, margin:0 }}>{rol?.nombre ?? 'Sin rol asignado'}</p>
              </div>
              <div>
                <p style={{ fontSize:10.5, color:C.n700, margin:'0 0 3px' }}>Estado</p>
                <p style={{ fontSize:13, fontWeight:500, color: usuario.activo?C.success:C.n700, margin:0 }}>{usuario.activo?'Activo':'Inactivo'}</p>
              </div>
              <div>
                <p style={{ fontSize:10.5, color:C.n700, margin:'0 0 3px' }}>Último acceso</p>
                <p style={{ fontSize:13, color:C.n900, margin:0, fontFamily:F }}>{usuario.ultimoAcceso}</p>
              </div>
              <div>
                <p style={{ fontSize:10.5, color:C.n700, margin:'0 0 3px' }}>Último cambio de contraseña</p>
                <p style={{ fontSize:13, color:C.n900, margin:0, fontFamily:F }}>{usuario.ultimoCambioClave}</p>
              </div>
            </div>
            <p style={{ fontSize:11, color:C.n700, margin:0 }}>
              Para cambiar tu nombre, rol o permisos, contactá a un administrador en Configuración › Usuarios y permisos.
            </p>
          </div>
        )}

        {tab==='permisos' && (
          <div>
            <p style={{ fontSize:12, color:C.n700, margin:'0 0 14px' }}>
              Estos son los permisos que tenés activos ahora mismo{rol && <> por tu rol <strong style={{color:C.n900}}>{rol.nombre}</strong></>}.
              Es solo para consulta - si necesitás más acceso, pedile a un administrador que te lo asigne.
            </p>
            <MisPermisosView perms={usuario.permisos}/>
            {usuario.permisos.size===0 && (
              <p style={{ fontSize:12, color:C.n700, textAlign:'center', padding:24 }}>No tenés ningún permiso asignado todavía.</p>
            )}
          </div>
        )}

        {tab==='clave' && (
          <div style={{ background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:10, padding:20, display:'flex', flexDirection:'column', gap:14, maxWidth:380 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:500, color:C.n700, display:'block', marginBottom:5 }}>Contraseña actual</label>
              <div style={{ position:'relative' }}>
                <input aria-label="Contraseña actual" type={verActual?'text':'password'} value={actual} onChange={e=>{setActual(e.target.value); setError('');}} style={inputStyle}/>
                <button type="button" onClick={()=>setVerActual(v=>!v)} title={verActual?'Ocultar':'Mostrar'}
                  style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.n700, padding:4, display:'flex' }}>
                  {verActual ? <IcEyeOff className="w-3.5 h-3.5"/> : <IcEye className="w-3.5 h-3.5"/>}
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:500, color:C.n700, display:'block', marginBottom:5 }}>Nueva contraseña</label>
              <div style={{ position:'relative' }}>
                <input type={verNueva?'text':'password'} value={nueva} onChange={e=>{setNueva(e.target.value); setError('');}} placeholder="Mínimo 8 caracteres" aria-label="Mínimo 8 caracteres" style={inputStyle}/>
                <button type="button" onClick={()=>setVerNueva(v=>!v)} title={verNueva?'Ocultar':'Mostrar'}
                  style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.n700, padding:4, display:'flex' }}>
                  {verNueva ? <IcEyeOff className="w-3.5 h-3.5"/> : <IcEye className="w-3.5 h-3.5"/>}
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:500, color:C.n700, display:'block', marginBottom:5 }}>Confirmar nueva contraseña</label>
              <input aria-label="Confirmar nueva contraseña" type={verNueva?'text':'password'} value={confirmar} onChange={e=>{setConfirmar(e.target.value); setError('');}}
                style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            </div>
            {error && <p style={{ fontSize:11, color:C.error, margin:0 }}>{error}</p>}
            <button onClick={cambiarClave} style={{ height:36, padding:'0 18px', border:'none', borderRadius:radius.md, background:BRAND, color:'#FFFFFF', cursor:'pointer', fontSize:13, fontFamily:F, fontWeight:500, alignSelf:'flex-start' }}>
              Actualizar contraseña
            </button>
          </div>
        )}

        {tab==='impresora' && (
          <div style={{ background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:10, padding:20, display:'flex', flexDirection:'column', gap:12 }}>
            <p style={{ fontSize:12, color:C.n700, margin:0, lineHeight:1.6 }}>
              Elegí la impresora que se va a usar por cada tipo de documento cuando imprimás desde tu propia sesión. Si dejás uno sin asignar, se usa la que la empresa tenga configurada para ese tipo en Empresa › Impresoras.
            </p>
            <table className="tabla" style={TABLA.table}>
              <thead>
                <tr style={TABLA.headRow}>
                  {['Tipo','Código','Mi impresora'].map(h=>(
                    <th key={h} style={TABLA.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIPOS_DOCUMENTO.map(d=>(
                  <tr key={d.codigo} style={{ borderBottom:'1px solid #ECECEC' }}>
                    <td style={{ padding:'8px 12px' }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, background:C.n200, color:C.n900 }}>{d.tipo}</span>
                    </td>
                    <td style={{ padding:'8px 12px', color:C.n700, fontFamily:F }}>{d.codigo}</td>
                    <td style={{ padding:'8px 12px' }}>
                      <select aria-label="Impresora" value={impresoras[d.codigo] ?? ''} onChange={e=>{
                          const v = e.target.value;
                          setImpresoras(prev=>({ ...prev, [d.codigo]: v }));
                          setToast(v ? `${d.tipo}: se va a imprimir en ${v}` : `${d.tipo}: se quitó tu preferencia, usa la de la empresa`);
                        }}
                        style={{ height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, background:'#FFFFFF', color: impresoras[d.codigo]?C.n900:C.n700, minWidth:220 }}>
                        <option value="">- Usar la de la empresa -</option>
                        {IMPRESORAS.map(p=><option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}
    </div>
  );
}
