'use client';
import { Checkbox, Input } from '@/components/suite/ui';
import { usePatch } from '../store';
import { Campo, Celda, ConfigCard, Fila, Grid, SiNoSelect, SubCard, Tabla } from '../kit';
import type { ReporteAuditoria } from '../datos';

export default function CierreDiario() {
  const [c, patch] = usePatch('cierre');
  const setR = (id: string, p: Partial<ReporteAuditoria>) => patch({ reportes: c.reportes.map(r => (r.id === id ? { ...r, ...p } : r)) });
  const num = (k: 'diasMantener' | 'diasAlerta' | 'copias', label: string) => (
    <Campo label={label}><Input type="number" value={c[k]} onChange={v => patch({ [k]: Math.max(0, Number(v) || 0) })} /></Campo>
  );
  return (
    <ConfigCard title="Cierre Diario">
      <SubCard title="Configuración general">
        <Grid cols={2}>
          {num('diasMantener', 'Días para mantener cierres')}
          <Campo label="Fecha último cierre" hint="La define el proceso de auditoría nocturna"><Input type="date" value={c.fechaUltimo} readOnly /></Campo>
          {num('diasAlerta', 'Días alerta dep. fallidos')}
          {num('copias', 'N° copias a imprimir')}
        </Grid>
        <Campo label="Asientos">
          <div style={{ display: 'flex', gap: 24 }}>
            <Checkbox checked={c.asientos.automaticos} onChange={b => patch({ asientos: { ...c.asientos, automaticos: b } })} label="Automáticos" />
            <Checkbox checked={c.asientos.integrados} onChange={b => patch({ asientos: { ...c.asientos, integrados: b } })} label="Integrados" />
          </div>
        </Campo>
        <Campo label="Configuraciones adicionales">
          <Grid cols={2} gap={12}>
            {Object.entries(c.adicionales).map(([k, v]) => <Checkbox key={k} checked={v} onChange={b => patch({ adicionales: { ...c.adicionales, [k]: b } })} label={k} />)}
          </Grid>
        </Campo>
      </SubCard>
      <h3 style={{ fontSize: 13, fontWeight: 500, margin: '4px 0 0' }}>Reportes generados en auditoría</h3>
      <Tabla headers={['Activa', 'Descripción', 'Código', 'Orden', 'Sistema', 'Sistema', 'Obligatoria', 'Reporte']} anchos={{ 0: 80, 3: 80 }}>
        {[...c.reportes].sort((a, b) => b.orden - a.orden).map(r => (
          <Fila key={r.id}>
            <Celda><SiNoSelect value={r.activa} onChange={b => setR(r.id, { activa: b })} label={`Activa ${r.descripcion}`} /></Celda>
            <Celda>{r.descripcion}</Celda>
            <Celda muted>{r.codigo}</Celda>
            <Celda><Input type="number" value={r.orden} onChange={v => setR(r.id, { orden: Number(v) || 0 })} aria-label={`Orden de ${r.descripcion}`} style={{ width: 60, textAlign: 'right' }} /></Celda>
            {(['sistema1', 'sistema2', 'obligatoria', 'reporte'] as const).map(k => (
              <Celda key={k}><Checkbox checked={r[k]} onChange={b => setR(r.id, { [k]: b })} label={<span className="sr-only">{k}</span>} /></Celda>
            ))}
          </Fila>
        ))}
      </Tabla>
    </ConfigCard>
  );
}
