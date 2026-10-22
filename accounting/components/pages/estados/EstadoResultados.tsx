'use client';
import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/primitives';
import { C, radius, TABLA } from '@/components/ui/tokens';
import { fmtNum } from '@/components/ui/formato';
import { Pagination } from '@/components/ui/tabla';
import { SearchInput } from '@/components/ui/filtros';
import { F, BRAND, FilterBarGroup, FilterBtn, Chip, NivelCuentaPicker, type NivelCuentaFiltro, type VistaFiltro, OptionList, BotonExportar, ModalExportarEstado } from './estadosCommon';

function fmt(n: number) { return fmtNum(n, 2); }

const CENTROS_COSTO = ['Gerencia General', 'Hotel', 'Alimentos y Bebidas', 'Marina', 'Lavandería', 'Eventos'];
interface Row { code:string; cg?:string; desc:string; nivel:0|1|2|3; periodo:number; acumulado:number; tipo:'ingreso'|'costo'|'gasto'|'total'; cc:string; }
const DATA: Row[] = [
  { code:'400', cg:'', desc:'Ingresos', nivel:0, periodo:93010287, acumulado:93010287, tipo:'ingreso', cc:'Hotel' },
  { code:'40001', cg:'', desc:'Ingresos ordinarios', nivel:1, periodo:84932281, acumulado:84932281, tipo:'ingreso', cc:'Hotel' },
  { code:'40001001',cg:'(',desc:'Ingresos por habitaciones - Hotel',nivel:2,periodo:26017881,acumulado:26017881,tipo:'ingreso', cc:'Hotel'},
  { code:'40001002',cg:'0302',desc:'Ingresos por apartamentos',nivel:2,periodo:23909119,acumulado:23909119,tipo:'ingreso', cc:'Hotel'},
  { code:'40001003',cg:'(',desc:'Alimentos y bebidas',nivel:2,periodo:17534505,acumulado:17534505,tipo:'ingreso', cc:'Alimentos y Bebidas'},
  { code:'40001005',cg:'0305',desc:'Alquiler de marina',nivel:2,periodo:6339651,acumulado:6339651,tipo:'ingreso', cc:'Marina'},
  { code:'40002', cg:'', desc:'Otros ingresos de alojamiento', nivel:1, periodo:511377, acumulado:511377, tipo:'ingreso', cc:'Hotel' },
  { code:'40003', cg:'', desc:'Ingresos financieros', nivel:1, periodo:5701625, acumulado:5701625, tipo:'ingreso', cc:'Gerencia General' },
  { code:'500', cg:'', desc:'Costos de operación', nivel:0, periodo:-47285694, acumulado:-47285694, tipo:'costo', cc:'Alimentos y Bebidas' },
  { code:'610', cg:'', desc:'Gastos de personal', nivel:0, periodo:-28000000, acumulado:-28000000, tipo:'gasto', cc:'Gerencia General' },
  { code:'611', cg:'', desc:'Gastos financieros', nivel:0, periodo:-4917232, acumulado:-4917232, tipo:'gasto', cc:'Gerencia General' },
];

const NIVEL_DEPTH: Record<NivelCuentaFiltro, number> = { 'Mayor':0, 'Sub mayor':1, 'Detalle':2, 'Auxiliar':3 };

export default function EstadoResultados() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['400','40001','500','610','611']));
  const [nivelFiltro, setNivelFiltro] = useState<NivelCuentaFiltro | null>(null);
  const [vista, setVista] = useState<VistaFiltro>('Ambos');
  const [cc, setCc] = useState('Todos');
  const [incluirSinMov, setIncluirSinMov] = useState(true);
  const [periodoModo, setPeriodoModo] = useState<'Todo el ejercicio'|'Por período'|'Rango de fechas'>('Todo el ejercicio');
  const [anio, setAnio] = useState<'2026'|'2025'|'2024'>('2026');
  const [fDesde, setFDesde] = useState('2026-01-01');
  const [fHasta, setFHasta] = useState('2026-01-31');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportarOpen, setExportarOpen] = useState(false);

  function toggle(c: string) { setExpanded(p=>{const n=new Set(p);if (n.has(c)) n.delete(c); else n.add(c);return n;}); }

  const NUM: React.CSSProperties = { padding:'8px 12px', textAlign:'right', whiteSpace:'nowrap', fontFamily:F, fontSize:12 };
  const NUMh: React.CSSProperties = { ...NUM, padding:'10px 12px', fontWeight:500, color:C.n700, fontSize:11 };

  const visibleAll = DATA.filter(r => {
    if (r.nivel === 0) return true;
    if (nivelFiltro) return r.nivel <= NIVEL_DEPTH[nivelFiltro];
    if (r.nivel === 1) return expanded.has(r.code.slice(0,5));
    if (r.nivel === 2) return expanded.has(r.code.slice(0,5));
    return false;
  })
    .filter(r => !search || r.desc.toLowerCase().includes(search.toLowerCase()))
    .filter(r => cc === 'Todos' || r.cc === cc)
    .filter(r => incluirSinMov || r.periodo !== 0 || r.acumulado !== 0);

  // Exportar: igual que en Balance de comprobación, el listado completo no
  // puede depender de qué cuentas estén expandidas en pantalla - se repiten
  // los filtros reales sin el filtro de expandido/colapsado.
  const exportRows = DATA.filter(r => r.nivel === 0 || !nivelFiltro || r.nivel <= NIVEL_DEPTH[nivelFiltro])
    .filter(r => !search || r.desc.toLowerCase().includes(search.toLowerCase()))
    .filter(r => cc === 'Todos' || r.cc === cc)
    .filter(r => incluirSinMov || r.periodo !== 0 || r.acumulado !== 0);

  // Paginación por cuenta mayor (nivel 0) para no separar un grupo de su detalle - igual criterio que en Balance de comprobación.
  const gruposNivel0 = visibleAll.filter(r => r.nivel === 0).map(r => r.code);
  const totalPaginas = Math.max(1, Math.ceil(gruposNivel0.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const gruposPagina = new Set(gruposNivel0.slice((paginaActual-1)*pageSize, paginaActual*pageSize));
  const visible = visibleAll.filter(r => gruposPagina.has(r.code.slice(0,3)));

  const indent = [0,16,36,52];
  const fw = [600,500,400,400];

  const periodoLabel = periodoModo === 'Todo el ejercicio' ? 'Período'
    : periodoModo === 'Por período' ? anio
    : `${fDesde.split('-').reverse().join('/')} – ${fHasta.split('-').reverse().join('/')}`;
  const nivelLabel = nivelFiltro ?? 'Nivel de cuenta';
  const ccLabel = cc !== 'Todos' ? cc : 'Centro de costos';

  const chips: { label: string; onClear: () => void }[] = [];
  if (search) chips.push({ label: `Búsqueda: ${search}`, onClear: () => setSearch('') });
  if (periodoModo !== 'Todo el ejercicio') {
    chips.push({
      label: periodoModo === 'Por período' ? `Período: ${anio}` : `Rango: ${fDesde.split('-').reverse().join('/')} – ${fHasta.split('-').reverse().join('/')}`,
      onClear: () => setPeriodoModo('Todo el ejercicio'),
    });
  }
  if (nivelFiltro) chips.push({ label: `Nivel: ${nivelFiltro}`, onClear: () => setNivelFiltro(null) });
  if (vista !== 'Ambos') chips.push({ label: `Vista: ${vista}`, onClear: () => setVista('Ambos') });
  if (cc !== 'Todos') chips.push({ label: `Centro de costos: ${cc}`, onClear: () => setCc('Todos') });
  if (!incluirSinMov) chips.push({ label: 'Excluye cuentas sin movimiento', onClear: () => setIncluirSinMov(true) });

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#FFFFFF' }}>
      <PageHeader title="Estado de resultados" left={<span style={{ fontSize:13, color:C.n700 }}>Hotel Fortuna S.A.</span>}>
        <BotonExportar onClick={()=>setExportarOpen(true)}/>
      </PageHeader>
      <div style={{ padding:'8px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', gap:8, flexWrap:'wrap', flexShrink:0 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por descripción…" width={220} />

        <FilterBarGroup>
          <FilterBtn id="periodo" label={periodoLabel} active={periodoModo !== 'Todo el ejercicio'}>
            <div style={{ fontSize:12, display:'flex', flexDirection:'column', gap:10, minWidth:190 }}>
              <div>
                <p style={{ fontSize:11, color:C.n700, margin:'0 0 4px', fontFamily:F }}>Tipo de período</p>
                <OptionList options={['Todo el ejercicio','Por período','Rango de fechas'] as const} value={periodoModo} onChange={setPeriodoModo}/>
              </div>
              <div>
                <p style={{ fontSize:11, color:C.n700, margin:'0 0 4px', fontFamily:F }}>Ejercicio</p>
                <OptionList options={['2026','2025','2024'] as const} value={anio} onChange={setAnio}/>
              </div>
              <div>
                <p style={{ fontSize:11, color:C.n700, margin:'0 0 4px', fontFamily:F }}>Desde - Hasta</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  <input aria-label="Desde - Hasta" type="date" value={fDesde} onChange={e=>setFDesde(e.target.value)} style={{ height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F }}/>
                  <input aria-label="Desde - Hasta" type="date" value={fHasta} onChange={e=>setFHasta(e.target.value)} style={{ height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F }}/>
                </div>
              </div>
            </div>
          </FilterBtn>

          <FilterBtn id="nivel" label={nivelLabel} active={!!nivelFiltro}>
            <NivelCuentaPicker value={nivelFiltro} onChange={setNivelFiltro} vista={vista} onVistaChange={setVista}/>
          </FilterBtn>

          <FilterBtn id="cc" label={ccLabel} active={cc !== 'Todos'}>
            <OptionList options={['Todos', ...CENTROS_COSTO] as const} value={cc} onChange={setCc}/>
          </FilterBtn>

          <FilterBtn id="opciones" label="Opciones" active={!incluirSinMov}>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:12, fontFamily:F }}>
              <input type="checkbox" aria-label="Seleccionar" checked={incluirSinMov} onChange={e=>setIncluirSinMov(e.target.checked)} style={{ accentColor:BRAND }}/>
              Incluir cuentas sin movimiento
            </label>
          </FilterBtn>
        </FilterBarGroup>
      </div>

      {chips.length > 0 && (
        <div style={{ padding:'6px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', gap:6, flexWrap:'wrap', flexShrink:0, alignItems:'center' }}>
          {chips.map((c,i) => <Chip key={i} label={c.label} onClear={c.onClear}/>)}
        </div>
      )}

      <div style={{ flex:1, overflowY:'auto', padding:'0 24px' }}>
        <table className="tabla" style={TABLA.table}>
          <thead style={{ position:'sticky', top:0, background:'#FFFFFF', zIndex:2 }}>
            <tr style={TABLA.headRow}>
              <th style={{ ...TABLA.th, width:110 }}>Cuenta</th>
              <th style={{ ...TABLA.th, width:60 }}>C/G</th>
              <th style={TABLA.th}>Descripción</th>
              <th style={NUMh}>Período</th>
              <th style={NUMh}>Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {/* Sección de ingresos */}
            <tr style={{ background:'#F9F9F9' }}><td colSpan={5} style={{ padding:'8px 12px', textTransform:'uppercase', letterSpacing:'.05em' }}>Ingresos</td></tr>
            {visible.filter(r=>r.tipo==='ingreso').length === 0 ? (
              <tr><td colSpan={5} style={TABLA.empty}>Sin cuentas para los filtros seleccionados.</td></tr>
            ) : visible.filter(r=>r.tipo==='ingreso').map(r => {
              const hasC = DATA.some(d=>d.nivel===r.nivel+1&&d.code.startsWith(r.code));
              const isE = expanded.has(r.code);
              return (
                <tr key={r.code} style={{ borderBottom:'1px solid #ECECEC' }} onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='#FFFFFF')}>
                  <td style={{ padding:'8px 12px', paddingLeft:12+indent[r.nivel], whiteSpace:'nowrap' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      {hasC && !nivelFiltro ? <button onClick={()=>toggle(r.code)} style={{ background:'none',border:'none',cursor:'pointer',color:C.n700,padding:0,display:'flex',flexShrink:0 }}><svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">{isE?<path d="M3.5 5.25L7 8.75L10.5 5.25"/>:<path d="M5.25 3.5L8.75 7L5.25 10.5"/>}</svg></button>:<span style={{ width:14, flexShrink:0 }}/>}
                      <span style={{ fontSize:12, fontWeight:fw[r.nivel], color:BRAND }}>{r.code}</span>
                    </div>
                  </td>
                  <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>{r.cg}</td>
                  <td style={{ padding:'8px 12px', fontWeight:fw[r.nivel] }}>{r.desc}</td>
                  <td style={{ ...NUM, fontWeight:fw[r.nivel] }}>{fmt(r.periodo)}</td>
                  <td style={{ ...NUM, fontWeight:fw[r.nivel] }}>{fmt(r.acumulado)}</td>
                </tr>
              );
            })}
            <tr style={{ background:'#ECECEC' }}>
              <td colSpan={3} style={{ padding:'8px 12px', fontWeight:600 }}>Total ingresos</td>
              <td style={{ ...NUM, fontWeight:600 }}>{fmt(93010287)}</td>
              <td style={{ ...NUM, fontWeight:600 }}>{fmt(93010287)}</td>
            </tr>
            {/* Costos */}
            <tr style={{ background:'#F9F9F9' }}><td colSpan={5} style={{ padding:'8px 12px', textTransform:'uppercase', letterSpacing:'.05em' }}>Costos</td></tr>
            {visible.filter(r=>r.tipo==='costo').map(r=>(
              <tr key={r.code} style={{ borderBottom:'1px solid #ECECEC' }} onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='#FFFFFF')}>
                <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}><span style={{ fontSize:12, color:BRAND }}>{r.code}</span></td>
                <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}></td>
                <td style={{ padding:'8px 12px' }}>{r.desc}</td>
                <td style={{ ...NUM, color:C.error }}>({fmt(Math.abs(r.periodo))})</td>
                <td style={{ ...NUM, color:C.error }}>({fmt(Math.abs(r.acumulado))})</td>
              </tr>
            ))}
            <tr style={{ background:'#ECECEC' }}>
              <td colSpan={3} style={{ padding:'8px 12px' }}>Beneficio bruto</td>
              <td style={{ ...NUM }}>{fmt(45724593)}</td>
              <td style={{ ...NUM }}>{fmt(45724593)}</td>
            </tr>
            {/* Gastos */}
            <tr style={{ background:'#F9F9F9' }}><td colSpan={5} style={{ padding:'8px 12px', textTransform:'uppercase', letterSpacing:'.05em' }}>Gastos</td></tr>
            {visible.filter(r=>r.tipo==='gasto').map(r=>(
              <tr key={r.code} style={{ borderBottom:'1px solid #ECECEC' }} onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='#FFFFFF')}>
                <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}><span style={{ fontSize:12, color:BRAND }}>{r.code}</span></td>
                <td/><td style={{ padding:'8px 12px', fontWeight:600 }}>{r.desc}</td>
                <td style={{ ...NUM, color:C.error }}>({fmt(Math.abs(r.periodo))})</td>
                <td style={{ ...NUM, color:C.error }}>({fmt(Math.abs(r.acumulado))})</td>
              </tr>
            ))}
            <tr style={{ background:'#ECECEC' }}>
              <td colSpan={3} style={{ padding:'8px 12px', fontWeight:600 }}>Total gastos</td>
              <td style={{ ...NUM, fontWeight:600, color:C.error }}>({fmt(56003207)})</td>
              <td style={{ ...NUM, fontWeight:600, color:C.error }}>({fmt(56003207)})</td>
            </tr>
            <tr style={{ background:C.successBg }}>
              <td colSpan={3} style={{ padding:'8px 12px', fontSize:13 }}>Beneficio neto del período</td>
              <td style={{ ...NUM, fontSize:13, color:C.success }}>{fmt(16278614)}</td>
              <td style={{ ...NUM, fontSize:13, color:C.success }}>{fmt(16278614)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ background:'#FFFFFF', borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0 }}>
        <Pagination page={paginaActual} pageSize={pageSize} total={gruposNivel0.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      {exportarOpen && (() => {
        const ingresos = exportRows.filter(r=>r.tipo==='ingreso');
        const costos   = exportRows.filter(r=>r.tipo==='costo');
        const gastos   = exportRows.filter(r=>r.tipo==='gasto');
        const csvRows: (string|number)[][] = [
          ['Cuenta','C/G','Descripción','Período','Acumulado'],
          ['','','INGRESOS','',''],
          ...ingresos.map(r=>[r.code, r.cg??'', r.desc, r.periodo, r.acumulado]),
          ['','','Total ingresos','',93010287],
          ['','','COSTOS','',''],
          ...costos.map(r=>[r.code, '', r.desc, r.periodo, r.acumulado]),
          ['','','Beneficio bruto','',45724593],
          ['','','GASTOS','',''],
          ...gastos.map(r=>[r.code, '', r.desc, r.periodo, r.acumulado]),
          ['','','Total gastos','',-56003207],
          ['','','Beneficio neto del período','',16278614],
        ];
        return (
          <ModalExportarEstado
            titulo="Estado de resultados"
            subtitulo={periodoLabel}
            filtrosResumen={chips.map(c=>c.label)}
            filename="estado-resultados"
            csvRows={csvRows}
            reporteKey="resultados"
            onClose={()=>setExportarOpen(false)}
          >
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead><tr style={{ borderBottom:`2px solid ${C.n500}` }}>
                {['Cuenta','C/G','Descripción','Período','Acumulado'].map(h=>(
                  <th key={h} style={{ padding:'6px 8px', textAlign:(h==='Período'||h==='Acumulado')?'right':'left', fontWeight:500, color:'#757575' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                <tr style={{ background:'#F9F9F9' }}><td colSpan={5} style={{ padding:'5px 8px', fontWeight:700 }}>Ingresos</td></tr>
                {ingresos.map(r=>(
                  <tr key={r.code} style={{ borderBottom:'1px solid #ECECEC' }}>
                    <td style={{ padding:'4px 8px' }}>{r.code}</td><td style={{ padding:'4px 8px' }}>{r.cg}</td><td style={{ padding:'4px 8px' }}>{r.desc}</td>
                    <td style={{ padding:'4px 8px', textAlign:'right' }}>{fmt(r.periodo)}</td><td style={{ padding:'4px 8px', textAlign:'right' }}>{fmt(r.acumulado)}</td>
                  </tr>
                ))}
                <tr style={{ background:'#F9F9F9' }}><td colSpan={3} style={{ padding:'5px 8px', fontWeight:700 }}>Total ingresos</td><td style={{ padding:'5px 8px', textAlign:'right', fontWeight:700 }}>{fmt(93010287)}</td><td style={{ padding:'5px 8px', textAlign:'right', fontWeight:700 }}>{fmt(93010287)}</td></tr>
                <tr style={{ background:'#F9F9F9' }}><td colSpan={5} style={{ padding:'5px 8px', fontWeight:700 }}>Costos</td></tr>
                {costos.map(r=>(
                  <tr key={r.code} style={{ borderBottom:'1px solid #ECECEC' }}>
                    <td style={{ padding:'4px 8px' }}>{r.code}</td><td/><td style={{ padding:'4px 8px' }}>{r.desc}</td>
                    <td style={{ padding:'4px 8px', textAlign:'right' }}>({fmt(Math.abs(r.periodo))})</td><td style={{ padding:'4px 8px', textAlign:'right' }}>({fmt(Math.abs(r.acumulado))})</td>
                  </tr>
                ))}
                <tr style={{ background:'#F9F9F9' }}><td colSpan={3} style={{ padding:'5px 8px', fontWeight:700 }}>Beneficio bruto</td><td style={{ padding:'5px 8px', textAlign:'right', fontWeight:700 }}>{fmt(45724593)}</td><td style={{ padding:'5px 8px', textAlign:'right', fontWeight:700 }}>{fmt(45724593)}</td></tr>
                <tr style={{ background:'#F9F9F9' }}><td colSpan={5} style={{ padding:'5px 8px', fontWeight:700 }}>Gastos</td></tr>
                {gastos.map(r=>(
                  <tr key={r.code} style={{ borderBottom:'1px solid #ECECEC' }}>
                    <td style={{ padding:'4px 8px' }}>{r.code}</td><td/><td style={{ padding:'4px 8px' }}>{r.desc}</td>
                    <td style={{ padding:'4px 8px', textAlign:'right' }}>({fmt(Math.abs(r.periodo))})</td><td style={{ padding:'4px 8px', textAlign:'right' }}>({fmt(Math.abs(r.acumulado))})</td>
                  </tr>
                ))}
                <tr style={{ background:'#F9F9F9' }}><td colSpan={3} style={{ padding:'5px 8px', fontWeight:700 }}>Total gastos</td><td style={{ padding:'5px 8px', textAlign:'right', fontWeight:700 }}>({fmt(56003207)})</td><td style={{ padding:'5px 8px', textAlign:'right', fontWeight:700 }}>({fmt(56003207)})</td></tr>
              </tbody>
              <tfoot>
                <tr style={{ borderTop:`2px solid ${C.n500}`, background:C.successBg }}>
                  <td colSpan={3} style={{ padding:'6px 8px', fontWeight:700 }}>Beneficio neto del período</td>
                  <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, color:C.success }}>{fmt(16278614)}</td>
                  <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, color:C.success }}>{fmt(16278614)}</td>
                </tr>
              </tfoot>
            </table>
          </ModalExportarEstado>
        );
      })()}
    </div>
  );
}
