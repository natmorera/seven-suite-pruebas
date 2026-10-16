'use client';
import { C, FONT } from '@/components/ui/tokens';
import { type Nomenclatura } from './datos/plan';

const F = FONT;
type Nivel = 'mayor' | 'submajor' | 'detalle';
const NIVELES: [Nivel, string, number, number][] = [['mayor', 'Cuenta mayor', 1, 6], ['submajor', 'Sub mayor', 1, 6], ['detalle', 'Detalle', 2, 8]];
const SEPS: { val: Nomenclatura['separador']; label: string }[] = [{ val: '-', label: 'Guion medio' }, { val: '.', label: 'Punto' }, { val: '', label: 'Sin separador' }];

const botonPaso = { width: 32, height: 32, border: `1px solid ${C.n500}`, borderRadius: 4, background: C.n000, cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as const;

function Stepper({ valor, min, max, etiqueta, onChange }: { valor: number; min: number; max: number; etiqueta: string; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button type="button" aria-label={`Menos dígitos en ${etiqueta}`} onClick={() => onChange(Math.max(min, valor - 1))} style={botonPaso}>−</button>
      <div style={{ flex: 1, height: 32, minWidth: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, fontSize: 14, background: C.n200, border: `1px solid ${C.n500}`, borderRadius: 4 }}>{valor}</div>
      <button type="button" aria-label={`Más dígitos en ${etiqueta}`} onClick={() => onChange(Math.min(max, valor + 1))} style={botonPaso}>+</button>
    </div>
  );
}

function Opcion({ activo, titulo, ejemplo, onClick }: { activo: boolean; titulo: string; ejemplo: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}
      style={{ padding: '10px 14px', borderRadius: 4, textAlign: 'left', cursor: 'pointer', fontFamily: F, border: `1px solid ${activo ? C.brand : C.n500}`, background: activo ? C.brandBg : C.n200 }}>
      <div style={{ fontSize: 12, color: C.n900, marginBottom: 4 }}>{titulo}</div>
      <div style={{ fontSize: 11, color: C.n700 }}>{ejemplo}</div>
    </button>
  );
}

function Bloque({ titulo, texto, children }: { titulo: string; texto: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 14, fontWeight: 500, color: C.n900, margin: '0 0 4px', fontFamily: F }}>{titulo}</p>
      <p style={{ fontSize: 12, color: C.n700, margin: '0 0 12px', fontFamily: F }}>{texto}</p>
      {children}
    </div>
  );
}

export default function PasoNomenclatura({ config, patch }: { config: Nomenclatura; patch: (p: Partial<Nomenclatura>) => void }) {
  const lng = config.longitudes;
  const mayor = '1'.padEnd(lng.mayor, '0'), sub = '1'.padEnd(lng.submajor, '0'), det = '1'.padEnd(lng.detalle, '0');
  const ejemplo = [mayor, sub, det].join(config.separador);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Bloque titulo="Longitud por nivel de cuentas contables" texto="Define cuántos dígitos tiene cada nivel de la estructura contable.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
          {NIVELES.map(([k, label, min, max]) => (
            <div key={k}>
              <p style={{ fontSize: 12, color: C.n900, margin: '0 0 8px', fontFamily: F }}>{label}</p>
              <Stepper valor={lng[k]} min={min} max={max} etiqueta={label} onChange={v => patch({ longitudes: { ...lng, [k]: v } })} />
              <p style={{ fontSize: 11, color: C.n700, margin: '6px 0 0', fontFamily: F }}>{min}–{max} dígitos</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: C.n900, margin: '14px 0 0', fontFamily: F }}>
          Código de ejemplo: <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{ejemplo}</span>
          <span style={{ color: C.n700 }}>{'  ·  '}Total de dígitos: </span><span style={{ fontWeight: 600 }}>{lng.mayor + lng.submajor + lng.detalle}</span>
        </p>
      </Bloque>
      <Bloque titulo="Separador de código" texto="Carácter visual que separa los niveles en el código contable.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {SEPS.map(o => <Opcion key={o.label} activo={config.separador === o.val} titulo={o.label} ejemplo={[mayor, sub, det].join(o.val)} onClick={() => patch({ separador: o.val })} />)}
        </div>
      </Bloque>
      <Bloque titulo="Formato numérico" texto="Separador decimal usado para mostrar los montos en todo el sistema.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          <Opcion activo={config.decimalSep === '.'} titulo="Punto" ejemplo="1,000.00" onClick={() => patch({ decimalSep: '.' })} />
          <Opcion activo={config.decimalSep === ','} titulo="Coma" ejemplo="1.000,00" onClick={() => patch({ decimalSep: ',' })} />
        </div>
      </Bloque>
    </div>
  );
}
