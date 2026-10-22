'use client';
import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/primitives';
import { C, radius, TABLA } from '@/components/ui/tokens';
import { fmtNum } from '@/components/ui/formato';
import { SearchInput } from '@/components/ui/filtros';
import { F, BRAND, FilterBarGroup, FilterBtn, Chip, BotonExportar, ModalExportarEstado } from './estadosCommon';

function fmt(n: number) { return fmtNum(n, 2); }

interface Fila { concepto:string; capitalSocial:number; reservaLegal:number; utilidadesRet:number; resultadoPer:number; bold?:boolean; }
const DATA: Fila[] = [
  { concepto:'Saldo al 31/12/2025', capitalSocial:1500000000, reservaLegal:150000000, utilidadesRet:1485945470, resultadoPer:0, bold:true },
  { concepto:'Dividendos decretados', capitalSocial:-50000000, reservaLegal:0, utilidadesRet:0, resultadoPer:0 },
  { concepto:'Traslado a reserva legal', capitalSocial:0, reservaLegal:15000000, utilidadesRet:-15000000, resultadoPer:0 },
  { concepto:'Resultado neto del período', capitalSocial:0, reservaLegal:0, utilidadesRet:0, resultadoPer:16278614 },
  { concepto:'Ajuste períodos anteriores', capitalSocial:0, reservaLegal:0, utilidadesRet:-16278614, resultadoPer:0 },
  { concepto:'Saldo al 31/01/2026', capitalSocial:1450000000, reservaLegal:165000000, utilidadesRet:1454666856, resultadoPer:16278614, bold:true },
];
const NOTAS = [
  '1. Preparado de conformidad con las Normas de Información Financiera (NIF) vigentes.',
  '2. Los dividendos decretados corresponden a la asamblea de accionistas del 15 de diciembre 2025.',
  '3. El traslado a reserva legal corresponde al 10% de la utilidad del ejercicio anterior según lo establecido por ley.',
  '4. El ajuste de períodos anteriores corresponde a la reclasificación de la utilidad del período anterior a utilidades retenidas.',
];

export default function CambioPatrimonio() {
  const [search, setSearch] = useState('');
  const [fCorte, setFCorte] = useState('2026-01-31');
  const [periodoTocado, setPeriodoTocado] = useState(false);
  const [mostrarNotas, setMostrarNotas] = useState(true);
  const [exportarOpen, setExportarOpen] = useState(false);

  const NUM: React.CSSProperties = { padding:'8px 14px', textAlign:'right', whiteSpace:'nowrap', fontFamily:F, fontSize:12 };
  const NUMh: React.CSSProperties = { ...NUM, fontWeight:500, color:C.n700, fontSize:11 };
  function Cell({ v, row }: { v:number; row:Fila }) {
    const red = v < 0;
    const green = row.bold && row.concepto.includes('2026') && v > 0 && v === row.resultadoPer;
    const style = { ...NUM, fontWeight:row.bold?600:400, color:red?C.error:green?C.success:'#0F0F0F' };
    if (v === 0 && !row.bold) return <td style={style}><span style={{ color:C.n500 }}>0.00</span></td>;
    return <td style={style}>{red?`(${fmt(Math.abs(v))})`:fmt(v)}</td>;
  }
  function totalRow(r: Fila) {
    return r.capitalSocial + r.reservaLegal + r.utilidadesRet + r.resultadoPer;
  }

  const visible = DATA.filter(r => !search || r.concepto.toLowerCase().includes(search.toLowerCase()));

  const periodoLabel = periodoTocado ? fCorte.split('-').reverse().join('/') : 'Período';

  const chips: { label: string; onClear: () => void }[] = [];
  if (search) chips.push({ label: `Búsqueda: ${search}`, onClear: () => setSearch('') });
  if (periodoTocado) chips.push({ label: `Fecha de corte: ${fCorte.split('-').reverse().join('/')}`, onClear: () => { setFCorte('2026-01-31'); setPeriodoTocado(false); } });
  if (!mostrarNotas) chips.push({ label: 'Notas ocultas', onClear: () => setMostrarNotas(true) });

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#FFFFFF' }}>
      <PageHeader title="Cambio en el patrimonio" left={<span style={{ fontSize:13, color:C.n700 }}>Hotel Fortuna S.A.</span>}>
        <BotonExportar onClick={()=>setExportarOpen(true)}/>
      </PageHeader>
      <div style={{ padding:'8px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', gap:8, flexWrap:'wrap', flexShrink:0 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por concepto…" width={220} />

        <FilterBarGroup>
          <FilterBtn id="periodo" label={periodoLabel} active={periodoTocado}>
            <div style={{ fontSize:12, display:'flex', flexDirection:'column', gap:8 }}>
              <p style={{ fontSize:11, color:C.n700, margin:0 }}>Fecha de corte</p>
              <input aria-label="Fecha de corte" type="date" value={fCorte} onChange={e=>{ setFCorte(e.target.value); setPeriodoTocado(e.target.value !== '2026-01-31'); }}
                style={{ height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F }}/>
            </div>
          </FilterBtn>

          <FilterBtn id="opciones" label="Opciones" active={!mostrarNotas}>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:12, fontFamily:F }}>
              <input type="checkbox" aria-label="Seleccionar" checked={mostrarNotas} onChange={e=>setMostrarNotas(e.target.checked)} style={{ accentColor:BRAND }}/>
              Mostrar notas
            </label>
          </FilterBtn>
        </FilterBarGroup>
      </div>

      {chips.length > 0 && (
        <div style={{ padding:'6px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', gap:6, flexWrap:'wrap', flexShrink:0, alignItems:'center' }}>
          {chips.map((c,i) => <Chip key={i} label={c.label} onClear={c.onClear}/>)}
        </div>
      )}

      <div style={{ flex:1, overflowY:'auto', padding:'0 24px 20px' }}>
        <table className="tabla" style={TABLA.table}>
          <thead style={{ position:'sticky', top:0, background:'#FFFFFF', zIndex:2 }}>
            <tr style={TABLA.headRow}>
              <th style={TABLA.th}>Concepto</th>
              <th style={NUMh}>Capital social</th>
              <th style={NUMh}>Reserva legal</th>
              <th style={NUMh}>Utilidades retenidas</th>
              <th style={NUMh}>Resultado del período</th>
              <th style={NUMh}>Total</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={6} style={TABLA.empty}>Sin conceptos para la búsqueda.</td></tr>
            ) : visible.map(r=>(
              <tr key={r.concepto} style={{ borderBottom:'1px solid #ECECEC', background:r.bold?'#F9F9F9':'#FFFFFF' }}
                onMouseEnter={e=>{if(!r.bold)e.currentTarget.style.background=C.n200}}
                onMouseLeave={e=>{if(!r.bold)e.currentTarget.style.background='#FFFFFF'}}>
                <td style={{ padding:'8px 12px', fontWeight:r.bold?600:400, fontSize:r.bold?13:12 }}>{r.concepto}</td>
                <Cell v={r.capitalSocial} row={r}/>
                <Cell v={r.reservaLegal} row={r}/>
                <Cell v={r.utilidadesRet} row={r}/>
                <Cell v={r.resultadoPer} row={r}/>
                <td style={{ ...NUM, fontWeight:r.bold?600:400, color:totalRow(r)<0?C.error:'#0F0F0F' }}>
                  {totalRow(r) < 0 ? `(${fmt(Math.abs(totalRow(r)))})` : fmt(totalRow(r))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {mostrarNotas && (
          <div style={{ padding:'20px 0' }}>
            <p style={{ fontSize:13, fontWeight:600, margin:'0 0 10px' }}>Notas</p>
            {NOTAS.map((n,i)=><p key={i} style={{ fontSize:12, color:C.n700, margin:'0 0 6px', lineHeight:1.6 }}>{n}</p>)}
          </div>
        )}
      </div>

      {exportarOpen && (() => {
        const headers = ['Concepto','Capital social','Reserva legal','Utilidades retenidas','Resultado del período','Total'];
        const csvRows: (string|number)[][] = [
          headers,
          ...visible.map(r => [r.concepto, r.capitalSocial, r.reservaLegal, r.utilidadesRet, r.resultadoPer, totalRow(r)]),
        ];
        return (
          <ModalExportarEstado
            titulo="Cambio en el patrimonio"
            subtitulo={periodoLabel}
            filtrosResumen={chips.map(c=>c.label)}
            filename="cambio-patrimonio"
            csvRows={csvRows}
            reporteKey="patrimonio"
            onClose={()=>setExportarOpen(false)}
          >
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead><tr style={{ borderBottom:`2px solid ${C.n500}` }}>
                {headers.map(h=>(
                  <th key={h} style={{ padding:'6px 8px', textAlign:h==='Concepto'?'left':'right', fontWeight:500, color:'#757575' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {visible.map(r=>(
                  <tr key={r.concepto} style={{ borderBottom:'1px solid #ECECEC', fontWeight:r.bold?700:400 }}>
                    <td style={{ padding:'4px 8px' }}>{r.concepto}</td>
                    {[r.capitalSocial, r.reservaLegal, r.utilidadesRet, r.resultadoPer, totalRow(r)].map((v,i)=>(
                      <td key={i} style={{ padding:'4px 8px', textAlign:'right' }}>{v<0?`(${fmt(Math.abs(v))})`:fmt(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {mostrarNotas && (
              <div style={{ padding:'16px 0 0' }}>
                <p style={{ fontSize:12, fontWeight:600, margin:'0 0 8px' }}>Notas</p>
                {NOTAS.map((n,i)=><p key={i} style={{ fontSize:11, color:'#757575', margin:'0 0 5px', lineHeight:1.5 }}>{n}</p>)}
              </div>
            )}
          </ModalExportarEstado>
        );
      })()}
    </div>
  );
}
