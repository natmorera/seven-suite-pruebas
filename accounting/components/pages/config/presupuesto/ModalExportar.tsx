'use client';
import { useState } from 'react';
import { Modal } from '@/components/ui/primitives';
import { Button, FormField, Select, Checkbox, Radio } from '@/components/ui/formulario';
import { radius, C } from '@/components/ui/tokens';
import { IcImport, IcExport } from '@/components/ui/icons';
import { MESES, TIPOS_DE_CUENTA, type PresRow } from '../presupuestoData';
import { type CentroCosto } from '@/components/pages/catalogo/centrosCostoConfig';
import { type Comparativo, F, MESES_EN, NIVELES_DETALLE, type NivelDetalle, fmtCelda, soloCodigo } from './datos';
import { RangoInput } from './piezas';

export function ModalExportar({ rows, todasLasCuentas, ejercicio, centrosCosto, onClose }: {
  rows:PresRow[]; todasLasCuentas:PresRow[]; ejercicio:string; centrosCosto:CentroCosto[]; onClose:()=>void;
}) {
  const cuentaOpciones = todasLasCuentas.map(r=>({ value:r.cuenta, label:`${r.cuenta} - ${r.descripcion}` }));
  const centroOpciones = centrosCosto.map(c=>({ value:c.codigo, label:`${c.codigo} - ${c.descripcion}` }));
  const periodos = MESES.map(m => `${m} ${ejercicio}`);
  const [desde, setDesde] = useState(0);
  const [hasta, setHasta] = useState(11);
  const [nivel, setNivel] = useState<NivelDetalle>('Mayor');
  const [comparativo, setComparativo] = useState<Comparativo>('solo');
  const [usarRango, setUsarRango] = useState(false);
  const [rIni, setRIni] = useState(''); const [rFin, setRFin] = useState('');
  const [usarCentro, setUsarCentro] = useState(false);
  const [cIni, setCIni] = useState(''); const [cFin, setCFin] = useState('');
  const [usarTipo, setUsarTipo] = useState(true);
  const [tipoCuenta, setTipoCuenta] = useState(TIPOS_DE_CUENTA.find(t=>t.tipo==='costos')?.codigo ?? TIPOS_DE_CUENTA[0]?.codigo ?? '');
  const [titulosIngles, setTitulosIngles] = useState(false);

  function filasAExportar() {
    return rows.filter(r => {
      if (usarRango && rIni && rFin && (r.cuenta < soloCodigo(rIni) || r.cuenta > soloCodigo(rFin))) return false;
      if (usarCentro && cIni && cFin && (r.cg < soloCodigo(cIni) || r.cg > soloCodigo(cFin))) return false;
      if (usarTipo && r.tipoCuentaCodigo !== tipoCuenta) return false;
      return true;
    });
  }

  function descargarExcel() {
    const filas = filasAExportar();
    const mesesLabel = titulosIngles ? MESES_EN : MESES;
    const headers = [
      titulosIngles?'Account':'Cuenta', titulosIngles?'Cost center':'Centro', titulosIngles?'Description':'Descripción',
      ...mesesLabel.slice(desde, hasta+1),
    ];
    if (comparativo === 'vs_real') headers.push(...mesesLabel.slice(desde,hasta+1).map(m=>`${m} (${titulosIngles?'Actual':'Real'})`));
    if (comparativo === 'vs_anterior') headers.push(...mesesLabel.slice(desde,hasta+1).map(m=>`${m} (${titulosIngles?'Prior year':'Año anterior'})`));
    const lines = [headers.map(h=>`"${h}"`).join(',')];
    filas.forEach(r => {
      const vals = r.valores.slice(desde, hasta+1);
      const row = [r.cuenta, r.cg, r.descripcion, ...vals.map(v=>v.toFixed(2))];
      // Comparativo vs real / vs año anterior: valores ilustrativos (no hay
      // datos de ejecución real ni de un ejercicio anterior en esta maqueta).
      if (comparativo === 'vs_real') row.push(...vals.map(v=>(v*0.92).toFixed(2)));
      if (comparativo === 'vs_anterior') row.push(...vals.map(v=>(v*0.88).toFixed(2)));
      lines.push(row.map(v=>`"${v}"`).join(','));
    });
    const blob = new Blob(['\ufeff'+lines.join('\n')], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `presupuesto-${ejercicio}-${nivel.toLowerCase()}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const filas = filasAExportar();

  return (
    <Modal open title="Exportar presupuesto" onClose={onClose}
      footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="secondary" icon={<IcExport className="w-3.5 h-3.5" />} onClick={descargarExcel}>Excel</Button>
        <Button variant="secondary" onClick={()=>window.print()}>PDF</Button>
        <Button icon={<IcImport className="w-3.5 h-3.5" />} onClick={()=>window.print()}>Imprimir</Button>
      </div>}>
      <style>{`@media print {
        body * { visibility:hidden; }
        #export-print-area-presupuesto, #export-print-area-presupuesto * { visibility:visible; }
        #export-print-area-presupuesto { position:absolute; left:0; top:0; width:100%; padding:24px; }
      }`}</style>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div>
          <p style={{ fontSize:12,fontWeight:500,marginBottom:8 }}>Período</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <FormField label="Desde"><Select value={String(desde)} onChange={v=>setDesde(Number(v))} options={periodos.map((p,i)=>({ value:String(i), label:p }))} /></FormField>
            <FormField label="Hasta"><Select value={String(hasta)} onChange={v=>setHasta(Number(v))} options={periodos.map((p,i)=>({ value:String(i), label:p }))} /></FormField>
          </div>
        </div>
        <div>
          <p style={{ fontSize:12,fontWeight:500,marginBottom:8 }}>Nivel de detalle</p>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {NIVELES_DETALLE.map(n => (
              <button key={n} type="button" onClick={()=>setNivel(n)}
                style={{ height:30, padding:'0 12px', borderRadius:radius.sm, border:`1px solid ${nivel===n?C.brand:C.n500}`,
                  background:nivel===n?C.brand:'#FFFFFF', color:nivel===n?'#FFFFFF':C.n900, fontSize:12, fontWeight:nivel===n?600:400,
                  fontFamily:F, cursor:'pointer' }}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize:12,fontWeight:500,marginBottom:8 }}>Comparativo</p>
          {([
            ['solo','Solo presupuesto','Muestra únicamente los valores presupuestados por mes'],
            ['vs_real','Presupuesto vs real','Compara lo presupuestado con lo ejecutado en el mismo período'],
            ['vs_anterior','Presupuesto vs año anterior',`Compara con el presupuesto del ejercicio anterior (${Number(ejercicio)-1})`],
          ] as const).map(([val,label,hint])=>(
            <div key={val} style={{ marginBottom:8 }}>
              <Radio checked={comparativo===val} onChange={()=>setComparativo(val)} label={
                <div>
                  <span style={{ fontSize:13 }}>{label}</span>
                  <p style={{ fontSize:11,color:C.n700,margin:'2px 0 0' }}>{hint}</p>
                </div>
              }/>
            </div>
          ))}
        </div>
        <div>
          <p style={{ fontSize:12,fontWeight:500,marginBottom:8 }}>Filtros</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <Checkbox label="Rango de cuenta" checked={usarRango} onChange={setUsarRango} />
            {usarRango && <RangoInput inicial={rIni} final={rFin} onInicial={setRIni} onFinal={setRFin} opciones={cuentaOpciones} tituloBuscador="Buscar cuenta" />}
            <Checkbox label="Centro de costos" checked={usarCentro} onChange={setUsarCentro} />
            {usarCentro && <RangoInput inicial={cIni} final={cFin} onInicial={setCIni} onFinal={setCFin} opciones={centroOpciones} tituloBuscador="Buscar centro de costos" />}
            <Checkbox label="Tipo de cuenta" checked={usarTipo} onChange={setUsarTipo} />
            {usarTipo && (
              <Select ariaLabel="Filtros" value={tipoCuenta} onChange={setTipoCuenta}
                options={TIPOS_DE_CUENTA.map(t=>({ value:t.codigo, label:`${t.codigo} - ${t.nombre}` }))} />
            )}
            <Checkbox label="Mostrar títulos en inglés" checked={titulosIngles} onChange={setTitulosIngles} />
          </div>
        </div>
      </div>

      {/* Área que efectivamente se imprime con PDF/Imprimir */}
      <div id="export-print-area-presupuesto" style={{ display:'none' }}>
        <p style={{ fontSize:16, fontWeight:700 }}>Hotel Fortuna S.A.</p>
        <p style={{ fontSize:12, color:'#757575' }}>Presupuesto {ejercicio} · Nivel: {nivel} · {periodos[desde]} a {periodos[hasta]}</p>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, marginTop:12 }}>
          <thead>
            <tr>
              <th style={{ textAlign:'left', borderBottom:'1px solid #ECECEC', padding:4 }}>{titulosIngles?'Description':'Descripción'}</th>
              {MESES.slice(desde,hasta+1).map(m=><th key={m} style={{ textAlign:'right', borderBottom:'1px solid #ECECEC', padding:4 }}>{titulosIngles?MESES_EN[MESES.indexOf(m)]:m}</th>)}
            </tr>
          </thead>
          <tbody>
            {filas.map(r=>(
              <tr key={r.id}>
                <td style={{ padding:4 }}>{r.descripcion}</td>
                {r.valores.slice(desde,hasta+1).map((v,i)=><td key={i} style={{ padding:4, textAlign:'right' }}>{fmtCelda(v)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
