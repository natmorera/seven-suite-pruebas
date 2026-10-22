'use client';
// Modal para configurar la base de datos de un módulo dentro de una entidad: primero la descripción, luego origen,
// base de datos y servidor juntos, y al final usuario y contraseña.
import { useState } from 'react';
import { Button, Input } from '@/components/suite/ui';
import { Campo, Grid, ModalBase } from '@/components/kit';
import { nombreModulo } from '../../catalogo';
import type { BaseDatos } from '../../tipos';

export function EditarBase({ b, onClose, onGuardar }: { b: BaseDatos; onClose: () => void; onGuardar: (p: Partial<BaseDatos>) => void }) {
  const [f, setF] = useState({ descripcion: b.descripcion, base: b.base, origen: b.origen, usuario: b.usuario, contrasena: '', servidor: b.servidor });
  const listo = f.descripcion.trim() && f.base.trim() && f.servidor.trim();
  const guardar = () => onGuardar({
    descripcion: f.descripcion.trim(), base: f.base.trim(), origen: (f.origen || f.base).trim(), usuario: f.usuario, servidor: f.servidor.trim(),
    version: b.version || '6.0.18', ...(f.contrasena ? { contrasena: '••••••••' } : {}),
  });
  return (
    <ModalBase titulo={`Base de datos de ${nombreModulo(b.modulo)}`} onClose={onClose} ancho={720}
      pie={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!listo} onClick={guardar}>Guardar</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Campo label="Descripción" required><Input value={f.descripcion} onChange={v => setF({ ...f, descripcion: v })} placeholder="Ej: Accounting" /></Campo>
        <Grid cols={3}>
          <Campo label="Origen de datos"><Input value={f.origen} onChange={v => setF({ ...f, origen: v })} placeholder="Igual a la base" /></Campo>
          <Campo label="Base de datos" required><Input value={f.base} onChange={v => setF({ ...f, base: v })} placeholder="Ej: CGA_SevenAcc" /></Campo>
          <Campo label="Servidor" required><Input value={f.servidor} onChange={v => setF({ ...f, servidor: v })} placeholder="IP o nombre,puerto" /></Campo>
        </Grid>
        <Grid cols={2}>
          <Campo label="Usuario"><Input value={f.usuario} onChange={v => setF({ ...f, usuario: v })} autoComplete="off" /></Campo>
          <Campo label="Contraseña" hint={b.base ? 'Déjala vacía para conservar la actual.' : undefined}>
            <Input type="password" value={f.contrasena} onChange={v => setF({ ...f, contrasena: v })} autoComplete="new-password" />
          </Campo>
        </Grid>
      </div>
    </ModalBase>
  );
}
