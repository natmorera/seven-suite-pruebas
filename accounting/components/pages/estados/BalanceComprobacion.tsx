'use client';
import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/primitives';
import { C, radius, TABLA } from '@/components/ui/tokens';
import { fmtNum } from '@/components/ui/formato';
import { Pagination } from '@/components/ui/tabla';
import { SearchInput } from '@/components/ui/filtros';
import { F, BRAND, FilterBarGroup, FilterBtn, Chip, NivelCuentaPicker, type NivelCuentaFiltro, type VistaFiltro, OptionList, BotonExportar, ModalExportarEstado } from './estadosCommon';

function fmt(n: number) { return fmtNum(n, 2); }

// ── Datos de ejemplo ───────────────────────────────────────────────────────────────────
const CENTROS_COSTO = ['Gerencia General', 'Hotel', 'Alimentos y Bebidas', 'Marina', 'Lavandería', 'Eventos'];
interface Cuenta {
  code: string; cg?: string; desc: string; nivel: 0 | 1 | 2; saldoIni: number; debe: number; haber: number; saldoMov: number; saldoFin: number;
  cc: string; tipoEspecial?: 'Clientes corrientes';
}

const DATA: Cuenta[] = [
  { code:'100', cg:'', desc:'Efectivo y equivalentes', nivel:0, saldoIni:60243474, debe:328487715, haber:337476409, saldoMov:-8988694, saldoFin:60243474, cc:'Gerencia General' },
  { code:'10001', cg:'', desc:'Efectivo en caja',       nivel:1, saldoIni:1287590,  debe:15779694,  haber:15366114,  saldoMov:413580,   saldoFin:1701170, cc:'Gerencia General' },
  { code:'10001001',cg:'0101',desc:'Caja cambio restaurante',nivel:2,saldoIni:93000,debe:91242,haber:84242,saldoMov:7000,saldoFin:100000, cc:'Alimentos y Bebidas' },
  { code:'10001002',cg:'0101',desc:'Caja cambio recepción', nivel:2,saldoIni:425350,debe:7709455,haber:7615865,saldoMov:93590,saldoFin:518940, cc:'Hotel' },
  { code:'10001003',cg:'0101',desc:'Caja cambio recepción USD',nivel:2,saldoIni:35099,debe:2786489,haber:2156927,saldoMov:629562,saldoFin:664661, cc:'Hotel' },
  { code:'10002', cg:'', desc:'Bancos MN',              nivel:1, saldoIni:769206,   debe:116413735,  haber:110776246,  saldoMov:5637489,  saldoFin:6406695, cc:'Gerencia General' },
  { code:'10002001',cg:'0101',desc:'Banco Lafise CRC 7355489518',nivel:2,saldoIni:485224,debe:43835130,haber:45803895,saldoMov:1784984,saldoFin:2270208, cc:'Gerencia General' },
  { code:'10002003',cg:'0101',desc:'BCR CRC CC-001-03786781',nivel:2,saldoIni:1847,debe:3650000,haber:339356,saldoMov:3330644,saldoFin:3312491, cc:'Gerencia General' },
  { code:'110', cg:'', desc:'Cuentas por cobrar',       nivel:0, saldoIni:13350706, debe:18750300,  haber:16250300,  saldoMov:2500000,  saldoFin:15850706, cc:'Hotel', tipoEspecial:'Clientes corrientes' },
  { code:'120', cg:'', desc:'Inventarios',              nivel:0, saldoIni:8078759,  debe:2700000,   haber:2200000,   saldoMov:500000,   saldoFin:8578759, cc:'Alimentos y Bebidas' },
  { code:'130', cg:'', desc:'Activos tributarios',      nivel:0, saldoIni:10114135, debe:1000000,   haber:500001,    saldoMov:499999,   saldoFin:10614134, cc:'Gerencia General' },
  { code:'140', cg:'', desc:'Activos diferidos',        nivel:0, saldoIni:6249675,  debe:800000,    haber:300001,    saldoMov:499999,   saldoFin:6749674, cc:'Gerencia General' },
];

const NIVEL_DEPTH: Record<NivelCuentaFiltro, number> = { 'Mayor':0, 'Sub mayor':1, 'Detalle':2, 'Auxiliar':2 };

export default function BalanceComprobacion() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['100','10001','10002']));
  const [nivelFiltro, setNivelFiltro] = useState<NivelCuentaFiltro | null>(null);
  const [vista, setVista] = useState<VistaFiltro>('Ambos');
  const [cc, setCc] = useState('Todos');
  const [tipoCuenta, setTipoCuenta] = useState<'Todas'|'Clientes corrientes'>('Todas');
  const [comparativo, setComparativo] = useState<'Sin comparativo'|'Variación vs. saldo inicial'>('Sin comparativo');
  const [incluirSaldoCero, setIncluirSaldoCero] = useState(true);
  const [periodoModo, setPeriodoModo] = useState<'Todo el ejercicio'|'Por período'|'Rango de fechas'>('Todo el ejercicio');
  const [anio, setAnio] = useState<'2026'|'2025'|'2024'>('2026');
  const [fDesde, setFDesde] = useState('2026-01-01');
  const [fHasta, setFHasta] = useState('2026-01-31');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportarOpen, setExportarOpen] = useState(false);

  function toggle(code: string) {
    setExpanded(p => { const n = new Set(p); if (n.has(code)) n.delete(code); else n.add(code); return n; });
  }

  const visibleAll = DATA.filter(r => {
    if (r.nivel === 0) return true;
    if (nivelFiltro) return r.nivel <= NIVEL_DEPTH[nivelFiltro];
    if (r.nivel === 1) return expanded.has(r.code.slice(0, 3));
    if (r.nivel === 2) return expanded.has(r.code.slice(0, 5));
    return false;
  })
    .filter(r => !search || r.desc.toLowerCase().includes(search.toLowerCase()) || r.code.includes(search))
    .filter(r => cc === 'Todos' || r.cc === cc)
    .filter(r => tipoCuenta === 'Todas' || r.tipoEspecial === tipoCuenta)
    .filter(r => incluirSaldoCero || r.saldoFin !== 0);

  // Exportar: el listado completo no puede depender de qué cuentas tenga el
  // usuario expandidas en pantalla en ese momento - "visibleAll" oculta el
  // detalle (nivel 1/2) de las cuentas colapsadas, así que si se usara para
  // exportar, el archivo quedaría incompleto sin que se note. Acá se repiten
  // los mismos filtros reales (búsqueda, centro de costo, nivel, saldo cero)
  // pero sin el filtro de expandido/colapsado.
  const exportRows = DATA.filter(r => r.nivel === 0 || !nivelFiltro || r.nivel <= NIVEL_DEPTH[nivelFiltro])
    .filter(r => !search || r.desc.toLowerCase().includes(search.toLowerCase()) || r.code.includes(search))
    .filter(r => cc === 'Todos' || r.cc === cc)
    .filter(r => tipoCuenta === 'Todas' || r.tipoEspecial === tipoCuenta)
    .filter(r => incluirSaldoCero || r.saldoFin !== 0);

  // La paginación se hace por grupo de nivel 0 (cuenta mayor), no por fila suelta,
  // para no cortar un grupo a la mitad y dejar hijos sin su padre a la vista.
  const gruposNivel0 = visibleAll.filter(r => r.nivel === 0).map(r => r.code);
  const totalPaginas = Math.max(1, Math.ceil(gruposNivel0.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const gruposPagina = new Set(gruposNivel0.slice((paginaActual-1)*pageSize, paginaActual*pageSize));
  const visible = visibleAll.filter(r => gruposPagina.has(r.code.slice(0, 3)));

  const totalesBase = DATA.filter(r => r.nivel === 0)
    .filter(r => cc === 'Todos' || r.cc === cc)
    .filter(r => tipoCuenta === 'Todas' || r.tipoEspecial === tipoCuenta)
    .filter(r => incluirSaldoCero || r.saldoFin !== 0);
  const TOTALES = {
    saldoIni: totalesBase.reduce((s, r) => s + r.saldoIni, 0),
    debe:     totalesBase.reduce((s, r) => s + r.debe, 0),
    haber:    totalesBase.reduce((s, r) => s + r.haber, 0),
    saldoMov: totalesBase.reduce((s, r) => s + r.saldoMov, 0),
    saldoFin: totalesBase.reduce((s, r) => s + r.saldoFin, 0),
  };

  const NUM: React.CSSProperties = { padding:'8px 12px', textAlign:'right', whiteSpace:'nowrap', fontFamily:F, fontSize:12 };
  const NUMh: React.CSSProperties = { ...NUM, padding:'10px 12px', fontWeight:500, color:C.n700, fontSize:11 };

  function MonCell({ v }: { v: number }) {
    const red = v < 0;
    return (
      <td style={{ ...NUM, color: red ? C.error : '#0F0F0F' }}>
        {red ? `(${fmt(Math.abs(v))})` : fmt(v)}
      </td>
    );
  }

  const indent = [0, 16, 36];
  const fweights = [600, 500, 400];
  const fsizes = [13, 12, 12];

  const comparativoOn = comparativo === 'Variación vs. saldo inicial';

  // ── Etiquetas de los botones - muestran el valor seleccionado, no solo el nombre del filtro ──
  const periodoLabel = periodoModo === 'Todo el ejercicio' ? 'Período'
    : periodoModo === 'Por período' ? anio
    : `${fDesde.split('-').reverse().join('/')} – ${fHasta.split('-').reverse().join('/')}`;
  const nivelLabel = nivelFiltro ?? 'Nivel de cuenta';
  const ccLabel = cc !== 'Todos' ? cc : 'Centro de costos';
  const tipoLabel = tipoCuenta !== 'Todas' ? tipoCuenta : 'Tipo de cuenta';
  const comparativoLabel = comparativoOn ? 'Var. vs. saldo inicial' : 'Comparativo';

  // ── Chips de filtros activos - solo los realmente aplicados (no mostrar todos por defecto) ──
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
  if (tipoCuenta !== 'Todas') chips.push({ label: `Tipo de cuenta: ${tipoCuenta}`, onClear: () => setTipoCuenta('Todas') });
  if (comparativoOn) chips.push({ label: 'Comparativo: variación vs. saldo inicial', onClear: () => setComparativo('Sin comparativo') });
  if (!incluirSaldoCero) chips.push({ label: 'Excluye cuentas con saldo cero', onClear: () => setIncluirSaldoCero(true) });

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#FFFFFF' }}>
      {/* Encabezado */}
      <PageHeader title="Balance de comprobación" left={<span style={{ fontSize:13, color:C.n700 }}>Hotel Fortuna S.A.</span>}>
        <BotonExportar onClick={()=>setExportarOpen(true)}/>
      </PageHeader>

      {/* Toolbar */}
      <div style={{ padding:'8px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
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

          <FilterBtn id="tipo" label={tipoLabel} active={tipoCuenta !== 'Todas'}>
            <OptionList options={['Todas','Clientes corrientes'] as const} value={tipoCuenta} onChange={setTipoCuenta}/>
          </FilterBtn>

          <FilterBtn id="comparativo" label={comparativoLabel} active={comparativoOn}>
            <OptionList options={['Sin comparativo','Variación vs. saldo inicial'] as const} value={comparativo} onChange={setComparativo}/>
          </FilterBtn>

          <FilterBtn id="opciones" label="Opciones" active={!incluirSaldoCero}>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:12, fontFamily:F }}>
              <input type="checkbox" aria-label="Seleccionar" checked={incluirSaldoCero} onChange={e=>setIncluirSaldoCero(e.target.checked)} style={{ accentColor:BRAND }}/>
              Incluir cuentas con saldo cero
            </label>
          </FilterBtn>
        </FilterBarGroup>
      </div>

      {/* Active chips - solo si hay filtros realmente aplicados */}
      {chips.length > 0 && (
        <div style={{ padding:'6px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', gap:6, flexWrap:'wrap', flexShrink:0, alignItems:'center' }}>
          {chips.map((c,i) => <Chip key={i} label={c.label} onClear={c.onClear}/>)}
        </div>
      )}

      <div style={{ flex:1, overflowY:'auto', padding:'0 24px' }}>
        <table className="tabla" style={TABLA.table}>
          <thead style={{ position:'sticky', top:0, background:'#FFFFFF', zIndex:2 }}>
            <tr style={TABLA.headRow}>
              <th style={{ ...TABLA.th, width:120 }}>Cuenta</th>
              <th style={{ ...TABLA.th, width:60 }}>C/G</th>
              <th style={TABLA.th}>Descripción</th>
              <th style={NUMh}>Saldo inicial</th>
              <th style={NUMh}>Debe</th>
              <th style={NUMh}>Haber</th>
              <th style={NUMh}>Saldo mov.</th>
              <th style={NUMh}>Saldo final</th>
              {comparativoOn && <th style={NUMh}>Var. %</th>}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={comparativoOn?9:8} style={TABLA.empty}>Sin cuentas para los filtros seleccionados.</td></tr>
            ) : visible.map(r => {
              const hasChildren = DATA.some(d => d.nivel === r.nivel + 1 && d.code.startsWith(r.code));
              const isExp = expanded.has(r.code);
              const variacion = r.saldoIni !== 0 ? ((r.saldoFin - r.saldoIni) / Math.abs(r.saldoIni)) * 100 : 0;
              return (
                <tr key={r.code}
                  style={{ borderBottom:'1px solid #ECECEC', background:r.nivel===0?'#F9F9F9':'#FFFFFF' }}
                  onMouseEnter={e=>(e.currentTarget.style.background=C.n200)}
                  onMouseLeave={e=>(e.currentTarget.style.background=r.nivel===0?'#F9F9F9':'#FFFFFF')}>
                  <td style={{ padding:'8px 12px', paddingLeft:12 + indent[r.nivel], whiteSpace:'nowrap' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      {hasChildren && !nivelFiltro ? (
                        <button onClick={() => toggle(r.code)}
                          style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, padding:0, display:'flex', flexShrink:0 }}>
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            {isExp ? <path d="M3.5 5.25L7 8.75L10.5 5.25"/> : <path d="M5.25 3.5L8.75 7L5.25 10.5"/>}
                          </svg>
                        </button>
                      ) : <span style={{ width:14, display:'inline-block' }}/>}
                      <span style={{ fontSize:fsizes[r.nivel], fontWeight:fweights[r.nivel], color:BRAND, fontFamily:F }}>{r.code}</span>
                    </div>
                  </td>
                  <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>{r.cg}</td>
                  <td style={{ padding:'8px 12px', fontSize:fsizes[r.nivel], fontWeight:fweights[r.nivel] }}>{r.desc}</td>
                  <MonCell v={r.saldoIni}/>
                  <MonCell v={r.debe}/>
                  <MonCell v={r.haber}/>
                  <MonCell v={r.saldoMov}/>
                  <MonCell v={r.saldoFin}/>
                  {comparativoOn && (
                    <td style={{ ...NUM, color: variacion < 0 ? C.error : C.success }}>
                      {variacion >= 0 ? '+' : ''}{variacion.toFixed(1)}%
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {visible.length > 0 && (
            <tfoot>
              <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
                <td colSpan={3} style={{ padding:'8px 12px', fontWeight:600, fontSize:13 }}>Totales</td>
                {([TOTALES.saldoIni, TOTALES.debe, TOTALES.haber, TOTALES.saldoMov, TOTALES.saldoFin] as number[]).map((v, i) => (
                  <td key={i} style={{ ...NUM, fontWeight:600, fontSize:12, color: v < 0 ? C.error : '#0F0F0F' }}>
                    {v < 0 ? `(${fmt(Math.abs(v))})` : fmt(v)}
                  </td>
                ))}
                {comparativoOn && <td/>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pie */}
      <div style={{ background:'#FFFFFF', borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0 }}>
        <Pagination page={paginaActual} pageSize={pageSize} total={gruposNivel0.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
      </div>

      {exportarOpen && (() => {
        const headers = ['Cuenta','C/G','Descripción','Saldo inicial','Debe','Haber','Saldo mov.','Saldo final'];
        const csvRows: (string|number)[][] = [
          headers,
          ...exportRows.map(r => [r.code, r.cg ?? '', r.desc, r.saldoIni, r.debe, r.haber, r.saldoMov, r.saldoFin]),
          ['','','Totales', TOTALES.saldoIni, TOTALES.debe, TOTALES.haber, TOTALES.saldoMov, TOTALES.saldoFin],
        ];
        return (
          <ModalExportarEstado
            titulo="Balance de comprobación"
            subtitulo={periodoLabel}
            filtrosResumen={chips.map(c=>c.label)}
            filename="balance-comprobacion"
            csvRows={csvRows}
            reporteKey="balance"
            onClose={()=>setExportarOpen(false)}
          >
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead><tr style={{ borderBottom:`2px solid ${C.n500}` }}>
                {headers.map(h=>(
                  <th key={h} style={{ padding:'6px 8px', textAlign:['Saldo inicial','Debe','Haber','Saldo mov.','Saldo final'].includes(h)?'right':'left', fontWeight:500, color:'#757575' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {exportRows.length===0 ? (
                  <tr><td colSpan={8} style={{ padding:20, textAlign:'center', color:'#757575' }}>Sin cuentas para los filtros seleccionados.</td></tr>
                ) : exportRows.map(r=>(
                  <tr key={r.code} style={{ borderBottom:'1px solid #ECECEC', fontWeight:r.nivel===0?600:400 }}>
                    <td style={{ padding:'4px 8px', paddingLeft:8+indent[r.nivel] }}>{r.code}</td>
                    <td style={{ padding:'4px 8px' }}>{r.cg}</td>
                    <td style={{ padding:'4px 8px' }}>{r.desc}</td>
                    {[r.saldoIni, r.debe, r.haber, r.saldoMov, r.saldoFin].map((v,i)=>(
                      <td key={i} style={{ padding:'4px 8px', textAlign:'right' }}>{v<0?`(${fmt(Math.abs(v))})`:fmt(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {exportRows.length>0 && (
                <tfoot>
                  <tr style={{ borderTop:`2px solid ${C.n500}` }}>
                    <td colSpan={3} style={{ padding:'6px 8px', fontWeight:700 }}>Totales</td>
                    {([TOTALES.saldoIni, TOTALES.debe, TOTALES.haber, TOTALES.saldoMov, TOTALES.saldoFin] as number[]).map((v,i)=>(
                      <td key={i} style={{ padding:'6px 8px', textAlign:'right', fontWeight:700 }}>{v<0?`(${fmt(Math.abs(v))})`:fmt(v)}</td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </ModalExportarEstado>
        );
      })()}
    </div>
  );
}
