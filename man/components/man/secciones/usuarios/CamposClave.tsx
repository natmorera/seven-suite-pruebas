'use client';
// Contraseña nueva con confirmación y «Generar contraseña temporal», y el modal para cambiar la contraseña de un usuario.
import { useState } from 'react';
import { C, FONT } from '@/components/suite/tokens';
import { Button, Checkbox, Input } from '@/components/suite/ui';
import { Campo, Grid, LinkButton, ModalBase } from '@/components/kit';
import type { Usuario } from '../../tipos';
import { REGLAS, claveTemporal, errorClave, type ClaveNueva } from './claves';

export function CamposClave({ f, setF }: { f: ClaveNueva; setF: (p: ClaveNueva) => void }) {
  return (
    <Grid cols={2}>
      <Campo label="Contraseña" required hint={`Mínimo ${REGLAS.longitudMin} caracteres, una mayúscula y un número.`}>
        <Input type="text" value={f.clave} onChange={v => setF({ ...f, clave: v })} autoComplete="new-password" />
      </Campo>
      <Campo label="Confirmar contraseña" required><Input type="text" value={f.confirmar} onChange={v => setF({ ...f, confirmar: v })} autoComplete="new-password" /></Campo>
      <div style={{ gridColumn: '1 / -1', marginTop: -4 }}>
        <LinkButton onClick={() => { const t = claveTemporal(); setF({ clave: t, confirmar: t }); }}>Generar contraseña temporal</LinkButton>
      </div>
    </Grid>
  );
}

export function CambiarClave({ u, onClose, onGuardar }: { u: Usuario; onClose: () => void; onGuardar: (cambiarAlIngresar: boolean) => void }) {
  const [f, setF] = useState<ClaveNueva>({ clave: '', confirmar: '' });
  const [cambiar, setCambiar] = useState(true);
  const error = errorClave(f);
  return (
    <ModalBase titulo={`Cambiar contraseña de ${u.usuario}`} onClose={onClose} ancho={520}
      pie={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!!error} onClick={() => onGuardar(cambiar)}>Cambiar contraseña</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
        <CamposClave f={f} setF={setF} />
        <Checkbox checked={cambiar} onChange={setCambiar} label="Pedir que la cambie en el próximo ingreso" />
        {error && f.clave && <span role="alert" style={{ fontSize: 12, color: C.error }}>{error}</span>}
      </div>
    </ModalBase>
  );
}
