'use client';
import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/primitives';
import { C, radius, TABLA } from '@/components/ui/tokens';
import { fmtNum } from '@/components/ui/formato';
import { SearchInput } from '@/components/ui/filtros';
import { F, BRAND, FilterBarGroup, FilterBtn, Chip, NivelCuentaPicker, type NivelCuentaFiltro, type VistaFiltro, OptionList, BotonExportar, ModalExportarEstado } from './estadosCommon';

function fmt(n: number) { return fmtNum(n, 2); }

interface Row { code:string; desc:string; valor:number; valorAnterior:number; nivel:0|1|2; seccion:'activo_c'|'activo_f'|'activo_o'|'pasivo'|'patrimonio'; }
const DATA: Row[] = [
  // Activo circulante
  { code:'100', desc:'Efectivo y equivalentes', valor:60243474, valorAnterior:57000000, nivel:0, seccion:'activo_c' },
  { code:'10001', desc:'Caja general', valor:15000000, valorAnterior:14200000, nivel:1, seccion:'activo_c' },
  { code:'10002', desc:'Bancos', valor:45243474, valorAnterior:42800000, nivel:1, seccion:'activo_c' },
  { code:'10002001', desc:'Banco Lafise CRC', valor:30000000, valorAnterior:28500000, nivel:2, seccion:'activo_c' },
  { code:'10002002', desc:'BCR CRC', valor:15243474, valorAnterior:14300000, nivel:2, seccion:'activo_c' },
  { code:'110', desc:'Cuentas por cobrar', valor:15850706, valorAnterior:14600000, nivel:0, seccion:'activo_c' },
  { code:'120', desc:'Inventarios', valor:8578759, valorAnterior:8300000, nivel:0, seccion:'activo_c' },
  { code:'130', desc:'Activos tributarios', valor:10614134, valorAnterior:10100000, nivel:0, seccion:'activo_c' },
  // Activo fijo
  { code:'150', desc:'Propiedad, planta y equipo', valor:9368697141, valorAnterior:9410000000, nivel:0, seccion:'activo_f' },
  // Otros activos
  { code:'140', desc:'Activos diferidos', valor:6749674, valorAnterior:6900000, nivel:0, seccion:'activo_o' },
  // Pasivo
  { code:'200', desc:'Cuentas por pagar', valor:-6334509804, valorAnterior:-6200000000, nivel:0, seccion:'pasivo' },
  // Patrimonio
  { code:'300', desc:'Capital social', valor:1500000000, valorAnterior:1500000000, nivel:0, seccion:'patrimonio' },
  { code:'310', desc:'Utilidades retenidas', valor:1485945470, valorAnterior:1400000000, nivel:0, seccion:'patrimonio' },
  { code:'320', desc:'Resultado del período', valor:16278614, valorAnterior:12000000, nivel:0, seccion:'patrimonio' },
];

const FECHA_BASE = 'Al 31/05/2026';
const TOTALS = {
  actC: 95287073, actF: 9368697141, actO: 6749674,
  actTotal: 9470733888, pasivo: -6334509804, patri: 1136224084,
};

const NIVEL_DEPTH: Record<NivelCuentaFiltro, number> = { 'Mayor':0, 'Sub mayor':1, 'Detalle':2, 'Auxiliar':2 };

const NUM: React.CSSProperties = { padding:'8px 12px', textAlign:'right', whiteSpace:'nowrap', fontFamily:F, fontSize:12 };

function ValCell({ v }: { v: number }) {
  const red = v < 0;
  return <td style={{ ...NUM, fontWeight:500, color: red?C.error:'#0F0F0F' }}>{red?`(${fmt(Math.abs(v))})`:fmt(v)}</td>;
}
function VarCell({ v, prev }: { v: number; prev: number }) {
  const variacion = prev !== 0 ? ((v - prev) / Math.abs(prev)) * 100 : 0;
  return <td style={{ ...NUM, fontWeight:500, color: variacion<0?C.error:C.success }}>{variacion>=0?'+':''}{variacion.toFixed(1)}%</td>;
}
function Section({ title, rows, total, color, comparativo }: { title:string; rows:Row[]; total?:number; color?:string; comparativo:boolean }) {
  return (<>
    <tr style={{ background:'#F9F9F9' }}><td colSpan={comparativo?4:3} style={{ padding:'8px 12px', fontSize:11, fontWeight:600, color:color||BRAND, letterSpacing:'.02em' }}>{title}</td></tr>
    {rows.length === 0 ? (
      <tr><td colSpan={comparativo?4:3} style={{ padding:'10px 28px', color:C.n700, fontSize:12 }}>Sin cuentas para los filtros seleccionados.</td></tr>
    ) : rows.map(r=>(
      <tr key={r.code} style={{ borderBottom:`1px solid #ECECEC` }} onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='#FFFFFF')}>
        <td style={{ padding:`8px 12px 8px ${28+r.nivel*14}px` }}><span style={{ fontSize:12, color:BRAND, fontWeight:500 }}>· {r.code}</span></td>
        <td style={{ padding:'8px 12px' }}>{r.desc}</td>
        <ValCell v={r.valor}/>
        {comparativo && <VarCell v={r.valor} prev={r.valorAnterior}/>}
      </tr>
    ))}
    {total !== undefined && (
      <tr style={{ background:'#ECECEC', borderBottom:`2px solid ${C.n500}` }}>
        <td colSpan={2} style={{ padding:'9px 12px', fontWeight:600 }}>Total {title.toLowerCase()}</td>
        <td style={{ ...NUM, fontWeight:600, color: total<0?C.error:'#0F0F0F' }}>{total<0?`(${fmt(Math.abs(total))})`:fmt(total)}</td>
        {comparativo && <td/>}
      </tr>
    )}
  </>);
}

export default function SituacionFinanciera() {
  const [search, setSearch] = useState('');
  const [nivelFiltro, setNivelFiltro] = useState<NivelCuentaFiltro | null>(null);
  const [vista, setVista] = useState<VistaFiltro>('Ambos');
  const [comparativo, setComparativo] = useState(false);
  const [incluirSaldoCero, setIncluirSaldoCero] = useState(true);
  const [periodoModo, setPeriodoModo] = useState<'corte'|'rango'>('corte');
  const [fCorte, setFCorte] = useState('2026-05-31');
  const [exportarOpen, setExportarOpen] = useState(false);

  const nivelMax = nivelFiltro ? NIVEL_DEPTH[nivelFiltro] : 0;

  const secRows = (sec: Row['seccion']) => DATA.filter(r => r.seccion === sec && r.nivel <= nivelMax)
    .filter(r => !search || r.desc.toLowerCase().includes(search.toLowerCase()) || r.code.includes(search))
    .filter(r => incluirSaldoCero || r.valor !== 0);

  const periodoLabel = periodoModo === 'corte' ? 'Período' : fCorte.split('-').reverse().join('/');
  const nivelLabel = nivelFiltro ?? 'Nivel de cuenta';
  const comparativoLabel = comparativo ? 'Var. vs. período anterior' : 'Comparativo';

  const chips: { label: string; onClear: () => void }[] = [];
  if (search) chips.push({ label: `Búsqueda: ${search}`, onClear: () => setSearch('') });
  if (periodoModo !== 'corte') chips.push({ label: `Rango desde: ${fCorte.split('-').reverse().join('/')}`, onClear: () => setPeriodoModo('corte') });
  if (nivelFiltro) chips.push({ label: `Nivel: ${nivelFiltro}`, onClear: () => setNivelFiltro(null) });
  if (vista !== 'Ambos') chips.push({ label: `Vista: ${vista}`, onClear: () => setVista('Ambos') });
  if (comparativo) chips.push({ label: 'Comparativo: variación vs. período anterior', onClear: () => setComparativo(false) });
  if (!incluirSaldoCero) chips.push({ label: 'Excluye cuentas con saldo cero', onClear: () => setIncluirSaldoCero(true) });

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#FFFFFF' }}>
      <PageHeader title="Situación financiera" left={<span style={{ fontSize:13, color:C.n700 }}>Hotel Fortuna S.A.</span>}>
        <BotonExportar onClick={()=>setExportarOpen(true)}/>
      </PageHeader>
      <div style={{ padding:'8px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', gap:8, flexWrap:'wrap', flexShrink:0 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por descripción…" width={220} />

        <FilterBarGroup>
          <FilterBtn id="periodo" label={periodoLabel} active={periodoModo !== 'corte'}>
            <div style={{ fontSize:12, display:'flex', flexDirection:'column', gap:10, minWidth:170 }}>
              <OptionList options={['Fecha de corte','Comparar desde'] as const}
                value={periodoModo==='corte'?'Fecha de corte':'Comparar desde'}
                onChange={v=>setPeriodoModo(v==='Fecha de corte'?'corte':'rango')}/>
              <input aria-label="Fecha de corte" type="date" value={fCorte} onChange={e=>setFCorte(e.target.value)} style={{ height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F }}/>
            </div>
          </FilterBtn>

          <FilterBtn id="nivel" label={nivelLabel} active={!!nivelFiltro}>
            <NivelCuentaPicker value={nivelFiltro} onChange={setNivelFiltro} vista={vista} onVistaChange={setVista}/>
          </FilterBtn>

          <FilterBtn id="comparativo" label={comparativoLabel} active={comparativo}>
            <OptionList options={['Sin comparativo','Variación vs. período anterior'] as const}
              value={comparativo ? 'Variación vs. período anterior' : 'Sin comparativo'}
              onChange={v=>setComparativo(v==='Variación vs. período anterior')}/>
          </FilterBtn>

          <FilterBtn id="opciones" label="Opciones" active={!incluirSaldoCero}>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:12, fontFamily:F }}>
              <input type="checkbox" aria-label="Seleccionar" checked={incluirSaldoCero} onChange={e=>setIncluirSaldoCero(e.target.checked)} style={{ accentColor:BRAND }}/>
              Incluir cuentas con saldo cero
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
              <th style={TABLA.th}>Descripción</th>
              <th style={{ ...TABLA.th, textAlign:'right' }}>{periodoModo==='rango'?`Al ${fCorte.split('-').reverse().join('/')}`:FECHA_BASE}</th>
              {comparativo && <th style={{ ...TABLA.th, textAlign:'right' }}>Var. %</th>}
            </tr>
          </thead>
          <tbody>
            <tr style={{ background:'#F9F9F9' }}><td colSpan={comparativo?4:3} style={{ padding:'8px 12px', fontSize:13 }}>Activo</td></tr>
            <Section title="Activo circulante" rows={secRows('activo_c')} total={TOTALS.actC} color={BRAND} comparativo={comparativo}/>
            <Section title="Activo fijo" rows={secRows('activo_f')} total={TOTALS.actF} color={BRAND} comparativo={comparativo}/>
            <Section title="Otros activos" rows={secRows('activo_o')} total={TOTALS.actO} color={BRAND} comparativo={comparativo}/>
            <tr style={{ background:'#E8F5FE', borderBottom:`2px solid #90CAF9` }}>
              <td colSpan={2} style={{ padding:'8px 12px', fontWeight:600, fontSize:13 }}>Total de activo</td>
              <td style={{ ...NUM, fontWeight:600, fontSize:13 }}>{fmt(TOTALS.actTotal)}</td>
              {comparativo && <td/>}
            </tr>
            <tr style={{ background:'#F9F9F9' }}><td colSpan={comparativo?4:3} style={{ padding:'8px 12px', fontSize:13 }}>Pasivo</td></tr>
            <Section title="Pasivo" rows={secRows('pasivo')} total={TOTALS.pasivo} color="#E24B4A" comparativo={comparativo}/>
            <tr style={{ background:'#F9F9F9' }}><td colSpan={comparativo?4:3} style={{ padding:'8px 12px', fontSize:13 }}>Patrimonio</td></tr>
            <Section title="Patrimonio" rows={secRows('patrimonio')} color={BRAND} comparativo={comparativo}/>
            <tr style={{ background:C.successBg, borderTop:`2px solid #1D9E7550` }}>
              <td colSpan={2} style={{ padding:'8px 12px', fontWeight:600, fontSize:13 }}>Total patrimonio y pasivo</td>
              <td style={{ ...NUM, fontWeight:600, fontSize:13, color:C.success }}>{fmt(TOTALS.actTotal)}</td>
              {comparativo && <td/>}
            </tr>
          </tbody>
        </table>
      </div>

      {exportarOpen && (() => {
        const headers = ['Cuenta','Descripción', periodoModo==='rango'?`Al ${fCorte.split('-').reverse().join('/')}`:FECHA_BASE];
        const seccionRows = (titulo:string, rows:Row[]) => rows.map(r => [r.code, r.desc, r.valor]);
        const csvRows: (string|number)[][] = [
          headers,
          ['','Activo',''],
          ...seccionRows('Activo circulante', secRows('activo_c')),
          ...seccionRows('Activo fijo', secRows('activo_f')),
          ...seccionRows('Otros activos', secRows('activo_o')),
          ['','Total de activo', TOTALS.actTotal],
          ['','Pasivo',''],
          ...seccionRows('Pasivo', secRows('pasivo')),
          ['','Patrimonio',''],
          ...seccionRows('Patrimonio', secRows('patrimonio')),
          ['','Total patrimonio y pasivo', TOTALS.actTotal],
        ];
        const renderRows = (rows: Row[]) => rows.map(r => (
          <tr key={r.code} style={{ borderBottom:'1px solid #ECECEC' }}>
            <td style={{ padding:'4px 8px', paddingLeft:8+r.nivel*16 }}>{r.code}</td>
            <td style={{ padding:'4px 8px' }}>{r.desc}</td>
            <td style={{ padding:'4px 8px', textAlign:'right' }}>{fmt(r.valor)}</td>
          </tr>
        ));
        return (
          <ModalExportarEstado
            titulo="Situación financiera"
            subtitulo={periodoLabel}
            filtrosResumen={chips.map(c=>c.label)}
            filename="situacion-financiera"
            csvRows={csvRows}
            reporteKey="situacion"
            onClose={()=>setExportarOpen(false)}
          >
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead><tr style={{ borderBottom:`2px solid ${C.n500}` }}>
                {headers.map(h=>(
                  <th key={h} style={{ padding:'6px 8px', textAlign:h===headers[2]?'right':'left', fontWeight:500, color:'#757575' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                <tr style={{ background:'#F9F9F9' }}><td colSpan={3} style={{ padding:'5px 8px', fontWeight:700 }}>Activo</td></tr>
                {renderRows(secRows('activo_c'))}
                {renderRows(secRows('activo_f'))}
                {renderRows(secRows('activo_o'))}
                <tr style={{ background:'#EAF4FB' }}><td colSpan={2} style={{ padding:'5px 8px', fontWeight:700 }}>Total de activo</td><td style={{ padding:'5px 8px', textAlign:'right', fontWeight:700 }}>{fmt(TOTALS.actTotal)}</td></tr>
                <tr style={{ background:'#F9F9F9' }}><td colSpan={3} style={{ padding:'5px 8px', fontWeight:700 }}>Pasivo</td></tr>
                {renderRows(secRows('pasivo'))}
                <tr style={{ background:'#F9F9F9' }}><td colSpan={3} style={{ padding:'5px 8px', fontWeight:700 }}>Patrimonio</td></tr>
                {renderRows(secRows('patrimonio'))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:`2px solid ${C.n500}`, background:C.successBg }}>
                  <td colSpan={2} style={{ padding:'6px 8px', fontWeight:700 }}>Total patrimonio y pasivo</td>
                  <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, color:C.success }}>{fmt(TOTALS.actTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </ModalExportarEstado>
        );
      })()}
    </div>
  );
}
