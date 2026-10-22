'use client';
// Botón «Más acciones» con menú agrupado. Para los encabezados de detalle:
// arriba quedan una o dos acciones principales y el resto va aquí.
import { useState } from 'react';
import { C, FONT, Button, Dropdown } from './primitives';

export interface AccionMenu { label: string; onClick: () => void; peligro?: boolean; ayuda?: string }

export default function MasAcciones({ grupos, label = 'Más acciones' }: { grupos: AccionMenu[][]; label?: string }) {
  const [abierto, setAbierto] = useState(false);
  const visibles = grupos.map(g => g.filter(Boolean)).filter(g => g.length);
  if (!visibles.length) return null;
  return (
    <Dropdown open={abierto} onOpenChange={setAbierto} align="right" width={240}
      trigger={<Button variant="secondary" aria-haspopup="menu" aria-expanded={abierto}>{label} <span aria-hidden style={{ marginLeft: 4, fontSize: 10 }}>▾</span></Button>}>
      <div role="menu" style={{ padding: '4px 0' }}>
        {visibles.map((g, i) => (
          <div key={i} style={{ borderTop: i ? `1px solid ${C.n500}` : 'none', padding: i ? '4px 0 0' : 0, marginTop: i ? 4 : 0 }}>
            {g.map(a => (
              <button key={a.label} role="menuitem" onClick={() => { setAbierto(false); a.onClick(); }} title={a.ayuda}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 12.5, border: 'none', background: 'none', cursor: 'pointer',
                  fontFamily: FONT, color: a.peligro ? C.error : C.n900 }}
                onMouseEnter={e => { e.currentTarget.style.background = C.n200; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                {a.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </Dropdown>
  );
}
