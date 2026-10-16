'use client';
import { Section } from '../../ui/primitives';
import { C, FONT } from '../../ui/tokens';

const F = FONT;

const SEPS = [
  { val:'-', label:'Guion medio',   ex:'100-001-0001' },
  { val:'.', label:'Punto',         ex:'100.001.0001' },
  { val:'',  label:'Sin separador', ex:'1000010001'   },
];
function Divider({ label }:{label:string}) {
  return (
    <div style={{ padding:'14px 20px 10px', borderTop:'1px solid #ECECEC' }}>
      <p style={{ fontSize:12, fontWeight:400, color:C.n900, margin:0, fontFamily:F }}>{label}</p>
    </div>
  );
}

export function TabNomenclatura({ config, patch }: { config:any; patch:(p:any)=>void }) {
  const sep=config.separador; const lng=config.longitudes; const dec=config.decimalSep??'.';
  const pad=(n:number)=>'1'.padEnd(n,'0');
  const mayor=pad(lng.mayor), sub=pad(lng.submajor), det=pad(lng.detalle);
  const preview=sep?[mayor,sub,det].join(sep):mayor+sub+det;

  const Stepper = ({ k, min, max }: { k:'mayor'|'submajor'|'detalle'; min:number; max:number }) => (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <button onClick={()=>patch({ longitudes:{...lng,[k]:Math.max(min,lng[k]-1)} })}
        style={{ width:32, height:32, border:'1px solid #ECECEC', borderRadius:4, background:'#FFFFFF', cursor:'pointer', fontSize:20, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>−</button>
      <div style={{ flex:1, height:32, minWidth:60, display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:F, fontSize:14, fontWeight:400, background:'#F9F9F9', border:'1px solid #ECECEC', borderRadius:4 }}>{lng[k]}</div>
      <button onClick={()=>patch({ longitudes:{...lng,[k]:Math.min(max,lng[k]+1)} })}
        style={{ width:32, height:32, border:'1px solid #ECECEC', borderRadius:4, background:'#FFFFFF', cursor:'pointer', fontSize:20, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>+</button>
    </div>
  );

  return (
    <Section title="Nomenclatura contable" hint="Estructura de los códigos del catálogo de cuentas.">

      {/* Longitud por nivel */}
      <div style={{ padding:'16px 20px 20px' }}>
        <p style={{ fontSize:14, fontWeight:400, color:C.n900, margin:'0 0 4px', fontFamily:F }}>Longitud por nivel de cuentas contables</p>
        <p style={{ fontSize:12, color:C.n700, margin:'0 0 16px', fontFamily:F }}>Define cuántos dígitos tiene cada nivel de la estructura contable.</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
          {([['mayor','Cuenta mayor',1,6],['submajor','Sub mayor',1,6],['detalle','Detalle',2,8]] as const).map(([k,label,min,max])=>(
            <div key={k}>
              <p style={{ fontSize:12, color:C.n900, marginBottom:8, fontFamily:F }}>{label}</p>
              <Stepper k={k} min={min} max={max} />
              <p style={{ fontSize:11, color:C.n700, marginTop:6, fontFamily:F }}>{min}–{max} dígitos</p>
              {/* Per-level preview */}
              <div style={{ marginTop:8, padding:'8px 12px', background:'#F9F9F9', borderRadius:4, border:'1px solid #ECECEC' }}>
                <p style={{ fontSize:10, color:C.n700, margin:'0 0 3px', fontFamily:F }}>{label}</p>
                <span style={{ fontSize:11, color:C.n900, fontWeight:500, fontFamily:F }}>
                  {k==='mayor'?mayor:k==='submajor'?(sep?mayor+sep+sub:mayor+sub):preview}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize:14, fontWeight:400, color:C.n900, marginTop:16, fontFamily:F }}>
          Total de dígitos: <span style={{ fontFamily:"'Montserrat',sans-serif",color:C.n900,fontWeight:500 }}>{lng.mayor+lng.submajor+lng.detalle}</span>
        </p>
      </div>

      {/* Separador de código - continúa sin línea divisoria (#11) */}
      <div style={{ padding:'4px 20px 20px' }}>
        <p style={{ fontSize:14, fontWeight:500, color:C.n900, margin:'0 0 8px', fontFamily:F }}>Separador de código</p>
        <p style={{ fontSize:12, color:C.n700, marginBottom:12, fontFamily:F }}>Carácter visual que separa los niveles en el código contable.</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {SEPS.map(o=>(
            <button key={o.val} onClick={()=>patch({separador:o.val})}
              style={{ padding:'10px 14px', borderRadius:4, textAlign:'left', cursor:'pointer',
                border:`1px solid ${config.separador===o.val?C.brand:C.n500}`,
                background: config.separador===o.val?C.brandBg:'#F9F9F9' }}>
              <div style={{ fontSize:12, fontWeight:400, color:C.n900, marginBottom:4, fontFamily:F }}>{o.label}</div>
              <div style={{ fontSize:11, color:C.n700, fontFamily:F }}>{o.ex}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Formato numérico - separador decimal (#9 mismo tamaño, #10 título 14px) */}
      <div style={{ padding:'14px 20px 10px', borderTop:'1px solid #ECECEC' }}>
        <p style={{ fontSize:14, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>Formato numérico</p>
      </div>
      <div style={{ padding:'0 20px 20px' }}>
        <p style={{ fontSize:12, color:C.n700, marginBottom:12, fontFamily:F }}>Separador decimal usado para mostrar los montos en todo el sistema.</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[
            { decimal:'.', titulo:'Punto', ejemplo:'1,000.00' },
            { decimal:',', titulo:'Coma',  ejemplo:'1.000,00' },
          ].map(o=>{
            const activo = dec===o.decimal;
            return (
              <button key={o.decimal} onClick={()=>patch({decimalSep:o.decimal})}
                style={{ padding:'10px 14px', borderRadius:4, textAlign:'left', cursor:'pointer',
                  border:`1px solid ${activo?C.brand:C.n500}`,
                  background: activo?C.brandBg:'#F9F9F9', fontFamily:F }}>
                <div style={{ fontSize:12, fontWeight:400, color:C.n900, marginBottom:4, fontFamily:F }}>{o.titulo}</div>
                <div style={{ fontSize:11, color:C.n700, fontFamily:F }}>{o.ejemplo}</div>
              </button>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
