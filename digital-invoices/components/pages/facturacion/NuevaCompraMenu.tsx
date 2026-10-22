'use client';
// Acciones de Compras, como en Ventas:
//   · «Importar» (secundaria): los XML de los proveedores o un Excel.
//   · «Agregar documento» (principal): los documentos que crea la empresa.
//     Con un solo tipo abre directo; con varios se elige el tipo, igual que
//     «Agregar documento» en Ventas.
import { useState } from 'react';
import { C, FONT, Button, Dropdown, Modal, FormField, Select } from '@/components/ui/primitives';

export interface OpcionCompra { label: string; ayuda: string; onClick: () => void }

function MenuImportar({ opciones }: { opciones: OpcionCompra[] }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Dropdown open={abierto} onOpenChange={setAbierto} align="right" width={320}
      trigger={<Button variant="secondary" aria-haspopup="menu" aria-expanded={abierto}>Importar <span aria-hidden style={{ marginLeft: 4, fontSize: 10 }}>▾</span></Button>}>
      <div role="menu" style={{ padding: '4px 0' }}>
        {opciones.map((o, i) => (
          <button key={o.label} role="menuitem" onClick={() => { setAbierto(false); o.onClick(); }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', borderTop: i ? `1px solid ${C.n200}` : 'none', background: 'none', cursor: 'pointer', fontFamily: FONT }}
            onMouseEnter={e => { e.currentTarget.style.background = C.n200; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: C.n900 }}>{o.label}</div>
            <div style={{ fontSize: 11.5, color: C.n700, marginTop: 2, lineHeight: 1.4 }}>{o.ayuda}</div>
          </button>
        ))}
      </div>
    </Dropdown>
  );
}

function ElegirDocumento({ opciones, onClose }: { opciones: OpcionCompra[]; onClose: () => void }) {
  const [elegido, setElegido] = useState(opciones[0].label);
  const opcion = opciones.find(o => o.label === elegido) ?? opciones[0];
  return (
    <Modal open title="Agregar documento" onClose={onClose}
      footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => { onClose(); opcion.onClick(); }}>Continuar</Button>
      </div>}>
      <FormField label="Tipo de documento" required hint={opcion.ayuda}>
        <Select value={elegido} onChange={setElegido} options={opciones.map(o => ({ value: o.label, label: o.label }))} />
      </FormField>
    </Modal>
  );
}

export default function AccionesCompras({ importar, documentos }: { importar: OpcionCompra[]; documentos: OpcionCompra[] }) {
  const [elegir, setElegir] = useState(false);
  return (
    <>
      {importar.length > 0 && <MenuImportar opciones={importar} />}
      {documentos.length > 0 && <Button onClick={() => (documentos.length === 1 ? documentos[0].onClick() : setElegir(true))}>Agregar documento</Button>}
      {elegir && <ElegirDocumento opciones={documentos} onClose={() => setElegir(false)} />}
    </>
  );
}
