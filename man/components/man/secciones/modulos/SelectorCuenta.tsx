'use client';
// Buscador de cuentas del catálogo de Accounting: lista las cuentas con su código y nivel, se busca por código o nombre
// (sin distinguir mayúsculas ni tildes) y unos chips filtran por nivel (Mayor, Submayor, Detalle, Auxiliar). Solo se
// eligen cuentas auxiliares, que son las que reciben movimientos.
import { useState } from 'react';
import { C, FONT, SIZE, radius } from '@/components/suite/tokens';
import { IcChevronDown } from '@/components/suite/icons';
import { Popover, norm } from '@/components/kit';
import { CUENTAS_ACC, cuentaPorCodigo, type NivelCuenta } from '../../datos/contabilidad';

const NIVELES: NivelCuenta[] = ['Mayor', 'Submayor', 'Detalle', 'Auxiliar'];

export function SelectorCuenta({ value, onChange, label }: { value: string; onChange: (codigo: string) => void; label: string }) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const [nivel, setNivel] = useState<NivelCuenta | ''>('');
  const elegida = cuentaPorCodigo(value);
  const lista = CUENTAS_ACC.filter(c => (!nivel || c.nivel === nivel) && (!q || norm(`${c.codigo} ${c.nombre}`).includes(norm(q))));
  const chip = (n: NivelCuenta | '', texto: string) => (
    <button key={texto} type="button" aria-pressed={nivel === n} onClick={() => setNivel(n)}
      style={{ height: 26, padding: '0 10px', borderRadius: radius.pill, fontSize: 11.5, fontFamily: FONT, cursor: 'pointer',
        border: `1px solid ${nivel === n ? C.brandBd : C.n500}`, background: nivel === n ? C.brandBg : C.n000, color: nivel === n ? C.brand : C.n900 }}>{texto}</button>
  );
  const elegir = (codigo: string) => { onChange(codigo); setAbierto(false); setQ(''); };

  return (
    <span style={{ position: 'relative', display: 'block' }}>
      <button type="button" onClick={() => setAbierto(v => !v)} aria-haspopup="dialog" aria-expanded={abierto} aria-label={label} className="suite-campo"
        style={{ width: '100%', height: SIZE.control, border: `1px solid ${C.n500}`, borderRadius: radius.control, background: C.n000, padding: '0 12px',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: FONT, color: elegida ? C.n900 : C.n700, cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {elegida ? <><b style={{ fontWeight: 500 }}>{elegida.codigo}</b> · {elegida.nombre}</> : 'Seleccionar cuenta'}
        </span>
        <IcChevronDown size={12} />
      </button>
      <Popover open={abierto} onClose={() => { setAbierto(false); setQ(''); }} width={560}>
        <div role="dialog" aria-label={`Cuentas para ${label}`} style={{ display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
          <div style={{ padding: 10, borderBottom: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por código o nombre" aria-label="Buscar cuenta" className="suite-campo"
              style={{ width: '100%', height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 10px', fontSize: 12, fontFamily: FONT, boxSizing: 'border-box' }} />
            <div role="group" aria-label="Nivel" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{chip('', 'Todos')}{NIVELES.map(n => chip(n, n))}</div>
          </div>
          <div role="listbox" aria-label="Catálogo de cuentas" style={{ maxHeight: 300, overflowY: 'auto', padding: 6 }}>
            {lista.length === 0 && <span style={{ display: 'block', padding: 12, fontSize: 12, color: C.n700 }}>No hay cuentas que coincidan.</span>}
            {lista.map(c => {
              const auxiliar = c.nivel === 'Auxiliar';
              const on = c.codigo === value;
              const contenido = (
                <>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500, minWidth: 64 }}>{c.codigo}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{c.nombre}</span>
                  <span style={{ fontSize: 11, color: C.n700 }}>{c.nivel}</span>
                </>
              );
              const estilo = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 10px', borderRadius: radius.sm,
                fontSize: 12, fontFamily: FONT, textAlign: 'left' as const, border: 'none' };
              return auxiliar ? (
                <button key={c.codigo} type="button" role="option" aria-selected={on} onClick={() => elegir(c.codigo)}
                  style={{ ...estilo, cursor: 'pointer', background: on ? C.brandBg : 'transparent', color: on ? C.brand : C.n900 }}>{contenido}</button>
              ) : (
                <div key={c.codigo} style={{ ...estilo, color: C.n700, background: 'transparent' }}>{contenido}</div>
              );
            })}
          </div>
        </div>
      </Popover>
    </span>
  );
}
