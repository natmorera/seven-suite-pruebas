'use client';
import React, { useRef, useState } from 'react';
import { fmtNum } from '@/components/ui/formato';
import { radius } from '@/components/ui/tokens';
import { Chart, type ActiveElement, type TooltipModel } from 'chart.js';
import { BRAND, DAYS_ES, F, OPERACIONES_PENDIENTES, USUARIOS_CONECTADOS, getDaysInMonth, getFirstDayOfMonth, tiempoDesde, useChartJS } from './datos';

// Tooltip HTML externo para los donuts chicos (88x88px). El tooltip nativo de
// Chart.js se dibuja DENTRO del canvas, así que en un donut tan chico
// cualquier tooltip más ancho que el canvas se corta contra su borde. Con
// esto el tooltip es un <div> aparte, posicionado encima del canvas pero sin
// límite de tamaño, así nunca se corta.
function externalDonutTooltip(wrapperId: string) {
  return (context: { tooltip: TooltipModel<'doughnut'> }) => {
    const { tooltip } = context;
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    let el = wrapper.querySelector<HTMLDivElement>('.donut-tooltip');
    if (!el) {
      el = document.createElement('div');
      el.className = 'donut-tooltip';
      Object.assign(el.style, {
        position:'absolute', pointerEvents:'none', zIndex:'50', transition:'opacity .08s ease',
        background:'#1A1A1A', color:'#fff', padding:'7px 11px', borderRadius:'6px', fontSize:'11px',
        fontFamily:"'Montserrat', sans-serif", whiteSpace:'nowrap', boxShadow:'0 4px 14px rgba(0,0,0,.28)',
        transform:'translate(-50%, -115%)',
      } as CSSStyleDeclaration);
      wrapper.appendChild(el);
    }
    if (tooltip.opacity === 0) { el.style.opacity = '0'; return; }
    const dp = tooltip.dataPoints?.[0];
    if (dp) {
      const color = tooltip.labelColors?.[0]?.backgroundColor ?? BRAND;
      el.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;">
        <span style="width:8px;height:8px;border-radius:2px;background:${color};display:inline-block;flex-shrink:0;"></span>
        <span>${dp.label}: <strong>${dp.raw}</strong></span>
      </span>`;
    }
    el.style.opacity = '1';
    el.style.left = tooltip.caretX + 'px';
    el.style.top = tooltip.caretY + 'px';
  };
}
// ── MiniCalendar ──────────────────────────────────────────────────────────────
export function MiniCalendar({
  year, month, from, to, hovered,
  onDayClick, onDayHover,
}: {
  year: number; month: number;
  from: string | null; to: string | null; hovered: string | null;
  onDayClick: (iso: string) => void; onDayHover: (iso: string | null) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);
  const rangeEnd    = to || hovered;

  function isoOf(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  function inRange(iso: string) {
    if (!from || !rangeEnd) return false;
    const [a, b] = from <= rangeEnd ? [from, rangeEnd] : [rangeEnd, from];
    return iso >= a && iso <= b;
  }
  function isEndpoint(iso: string) { return iso === from || iso === to; }
  function isStart(iso: string)    { return iso === from; }
  function isEnd(iso: string)      { return iso === to; }

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ width: 240 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 0, marginBottom: 6 }}>
        {DAYS_ES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', fontFamily: F, padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 0 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const iso = isoOf(day);
          const endpoint = isEndpoint(iso);
          const inR = !endpoint && inRange(iso);
          const start = isStart(iso);
          const end   = isEnd(iso);
          return (
            <div key={iso} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
              background: inR && !endpoint ? '#FFF8EC' : 'transparent',
              borderRadius: start ? '50% 0 0 50%' : end ? '0 50% 50% 0' : inR ? '0' : undefined,
            }}>
              <button
                onClick={() => onDayClick(iso)}
                onMouseEnter={() => onDayHover(iso)}
                onMouseLeave={() => onDayHover(null)}
                style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: endpoint ? '' : 'transparent',
                  color: endpoint ? '#fff' : inR ? '' : '#0F0F0F',
                  fontSize: 12, fontFamily: F, fontWeight: endpoint ? 600 : 400,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ── Estructura de tarjeta ────────────────────────────────────────────────────────────────
export function Card({ title, titleExtra, sub, children }: { title: string; titleExtra?: React.ReactNode; sub?: string; children: React.ReactNode }) {
  return (
    <div className="dash-card" style={{ background:'#fff',border:'1px solid #ECECEC',borderRadius:10,padding:'16px 18px',display:'flex',flexDirection:'column',gap:10,height:'100%',boxSizing:'border-box' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:8 }}>
        <span style={{ fontSize:14,fontWeight:500,color:'#0F0F0F',fontFamily:F }}>{title}</span>
        {titleExtra}
      </div>
      {sub && <span style={{ fontSize:10,color:'#757575',fontFamily:F,marginTop:-6 }}>{sub}</span>}
      {children}
    </div>
  );
}
// ── Card: Usuarios activos (lista completa) ── Tarjeta del dashboard que siempre muestra la
// lista completa.
export function CardUsuariosActivos() {
  const [hover, setHover] = useState<string|null>(null);
  return (
    <div className="dash-card" style={{ background:'#fff', border:'1px solid #ECECEC', borderRadius:10, padding:'16px 20px', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:12, color:'#757575', fontFamily:F }}>Usuarios activos</span>
        <span style={{ fontSize:11, color:'#4CAF50', fontFamily:F, fontWeight:500 }}>{USUARIOS_CONECTADOS.length} en línea</span>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {USUARIOS_CONECTADOS.map(u=>(
          <div key={u.nombre} onMouseEnter={()=>setHover(u.nombre)} onMouseLeave={()=>setHover(null)}
            style={{ position:'relative', display:'flex', alignItems:'center', gap:7, background:'#FAFAFA', border:'1px solid #F0F0F0', borderRadius:radius.pill, padding:'5px 10px 5px 5px' }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:u.color, color:'#fff', fontSize:9, fontWeight:600, fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center' }}>{u.iniciales}</div>
              <span style={{ position:'absolute', bottom:-1, right:-1, width:6, height:6, borderRadius:'50%', background:'#4CAF50', border:'1.5px solid #fff' }}/>
            </div>
            <span style={{ fontSize:12, color:'#0F0F0F', fontFamily:F, whiteSpace:'nowrap' }}>{u.nombre.split(' ').slice(0,2).join(' ')}</span>
            {hover===u.nombre && (
              <div style={{ position:'absolute', bottom:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)', background:'#1A1A1A',
                color:'#fff', padding:'6px 10px', borderRadius:6, fontSize:11, fontFamily:F, whiteSpace:'nowrap', zIndex:20,
                boxShadow:'0 4px 12px rgba(0,0,0,.25)' }}>
                Conectado hace {tiempoDesde(u.sesionDesdeMin)}
                <div style={{ position:'absolute', top:'100%', left:'50%', transform:'translateX(-50%)', width:0, height:0,
                  borderLeft:'5px solid transparent', borderRight:'5px solid transparent', borderTop:'5px solid #1A1A1A' }}/>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
// ── Desglose de operaciones bancarias pendientes por módulo (solo lista) ── Tercera columna de
// la tarjeta «Asientos pendientes»: lista módulo → cantidad, sin donut ni número grande.
export function DesgloseOperacionesPendientes() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      {OPERACIONES_PENDIENTES.map(m=>(
        <div key={m.modulo} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, fontSize:11, fontFamily:F }}>
          <span style={{ color:'#555' }}>{m.modulo}</span>
          <span style={{ fontWeight:600, color:'#1A1A1A' }}>{m.pendientes}</span>
        </div>
      ))}
    </div>
  );
}
// ── C1: Situación actual (donut compacto) - sin Card wrapper, para usar inline ──
export function C1() {
  const ref = useRef<Chart | null>(null);
  const [selIdx, setSelIdx] = React.useState<number|null>(null);
  const [hovering, setHovering] = React.useState(false);
  const BASE = ['#A77600','#C49520','#D9B54A','#EDD47E','#F5E8C0'];
  const data = [90,60,45,35,18];
  const labels = ['Ingresos','Gastos','Costos','Bancos','Otros'];
  useChartJS(() => {
    const el = document.getElementById('c1') as HTMLCanvasElement; if(!el) return;
    ref.current?.destroy();
    ref.current = new Chart(el, {
      type:'doughnut',
      data:{ labels, datasets:[{ data, backgroundColor:BASE, borderWidth:2, borderColor:'#fff', hoverOffset:4 }] },
      options:{ responsive:true, maintainAspectRatio:false, cutout:'62%',
        plugins:{ legend:{ display:false }, tooltip:{ enabled:false, external:externalDonutTooltip('c1-wrap') } },
        onClick:(_: unknown, els: ActiveElement[])=>{ setSelIdx(els.length>0?els[0].index:null); },
        onHover:(_: unknown, els: ActiveElement[])=>setHovering(els.length>0),
      }
    });
  });
  return (
    <div style={{ display:'flex', gap:12, alignItems:'center', minWidth:0 }}>
      <div id="c1-wrap" style={{ width:88, height:88, flexShrink:0, position:'relative' }}>
        <canvas id="c1" />
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', pointerEvents:'none', opacity:hovering?0:1, transition:'opacity .1s' }}>
          <span style={{ fontSize:16, fontWeight:700, color:'#1A1A1A', fontFamily:F, lineHeight:1 }}>248</span>
          <span style={{ fontSize:9, color:'#9E9E9E', fontFamily:F }}>total</span>
        </div>
      </div>
      {/* Leyenda en grilla de 2 columnas (etiqueta | número): a diferencia de un
          flex column, las columnas de una grilla nunca se estiran para llenar
          espacio sobrante salvo que se use `fr` - así el número queda pegado
          a su etiqueta sin importar cuánto espacio le sobre a la tarjeta.
          minWidth:0 en el contenedor y minmax(0,...) en las columnas son
          necesarios para que, cuando la tarjeta se angosta (ej. al abrir el
          menú lateral), la leyenda se ENCOJA/trunque en vez de desbordarse
          sobre la columna vecina - sin eso, flexbox nunca la deja bajar de
          su ancho de contenido y el sobrante se derrama hacia afuera. */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,max-content) minmax(0,max-content)', columnGap:10, rowGap:5, justifyContent:'start', minWidth:0, overflow:'hidden' }}>
        {labels.map((label,i)=>(
          <React.Fragment key={label}>
            <span onClick={()=>setSelIdx(selIdx===i?null:i)}
              style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, fontFamily:F, cursor:'pointer', minWidth:0 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:BASE[i], flexShrink:0 }}/>
              <span style={{ color:'#555', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', minWidth:0 }}>{label}</span>
            </span>
            <span onClick={()=>setSelIdx(selIdx===i?null:i)}
              style={{ fontWeight:600, color:'#1A1A1A', fontSize:11, fontFamily:F, cursor:'pointer', textAlign:'right', alignSelf:'center', whiteSpace:'nowrap' }}>
              {data[i]}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
// Moneda separada: cifra a la izquierda, símbolo a la derecha (regla transversal)
export function MoneyAmt({ sym, amount, color, size=15 }: { sym:string; amount:number; color:string; size?:number }) {
  return (
    <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
      <span style={{ fontSize:size-2, color, fontFamily:F, fontWeight:500 }}>{sym}</span>
      <span style={{ fontSize:size, fontWeight:400, color, fontFamily:F, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{fmtNum(amount,2)}</span>
    </div>
  );
}
