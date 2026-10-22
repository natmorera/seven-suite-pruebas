'use client';
// Parámetros generales › Impuestos que aplican los módulos al facturar.
import { C, radius } from '@/components/suite/tokens';
import { useDato } from '../../store';
import { CrudCatalogo } from '@/components/kit/CrudCatalogo';
import { ConfigCard } from '@/components/kit';
import { CUENTAS } from '../../inicial';

const Chip = ({ children }: { children: string }) => (
  <span style={{ padding: '2px 8px', borderRadius: radius.pill, border: '1px solid var(--brand-border)', background: 'var(--brand-bg)', color: 'var(--brand)', fontSize: 11.5 }}>{children}</span>
);

export default function Impuestos() {
  const [l, set] = useDato('impuestos');
  const [monedas] = useDato('monedas');
  return (
    <ConfigCard title="Impuestos">
      <CrudCatalogo entidad="impuesto" filas={l} onChange={set} nombre={i => i.descripcion} buscarEn={['descripcion']} campoActivo="activo"
        nuevo={() => ({ descripcion: '', porcentaje: 0, nivel: 1, cuenta: '', monedas: [], canje: false, apSup: false, activo: true })}
        columnas={[
          { key: 'descripcion', label: 'Descripción', link: true },
          { key: 'porcentaje', label: 'Porcentaje', tipo: 'num', ancho: 100 },
          { key: 'nivel', label: 'Nivel', derecha: true, ancho: 70 },
          { key: 'cuenta', label: 'Cuenta', render: i => <span title={i.cuenta} style={{ display: 'inline-block', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}>{i.cuenta || '-'}</span> },
          { key: 'monedas', label: 'Moneda', render: i => <span style={{ display: 'inline-flex', gap: 4 }}>{i.monedas.length ? i.monedas.map(m => <Chip key={m}>{m}</Chip>) : <span style={{ color: C.n700 }}>-</span>}</span> },
          { key: 'canje', label: 'Canje', tipo: 'check', editable: true, ancho: 70 },
          { key: 'apSup', label: 'Ap. Sup.', tipo: 'check', editable: true, ancho: 80 },
        ]}
        campos={[
          { key: 'descripcion', label: 'Descripción', requerido: true, unico: true, placeholder: 'Ej: IVA 13%' },
          { key: 'porcentaje', label: 'Porcentaje', tipo: 'number', span: 3 },
          { key: 'nivel', label: 'Nivel', tipo: 'number', span: 3 },
          { key: 'cuenta', label: 'Cuenta contable', tipo: 'select', opciones: CUENTAS },
          { key: 'monedas', label: 'Monedas', tipo: 'multi', opciones: monedas.map(m => m.codigo) },
          { key: 'canje', label: 'Aplica en canje', tipo: 'checkbox', span: 3 },
          { key: 'apSup', label: 'Requiere aprobación del supervisor', tipo: 'checkbox', span: 3 },
        ]}
        validar={i => (i.porcentaje < 0 || i.porcentaje > 100 ? 'El porcentaje va de 0 a 100.' : undefined)} />
    </ConfigCard>
  );
}
