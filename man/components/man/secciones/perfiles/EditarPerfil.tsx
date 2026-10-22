'use client';
// Modal de alta y edición de un perfil: datos generales, roles con lo que usa cada módulo y enlaces para abrir el
// perfil en los módulos que lo usan.
import { useState } from 'react';
import { C, FONT } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Select, Switch } from '@/components/suite/ui';
import { BotonEnlace, Campo, Grid, ModalBase } from '@/components/kit';
import { useDato } from '../../store';
import { RUTA_PERFILES } from '../../catalogo';
import { ChipModulo } from '../../piezas';
import { CamposRol, DEFECTO } from './datosRol';
import { TIPOS_ID } from '../Empresa';
import type { Perfil, RolPerfil } from '../../tipos';

export function EditarPerfil({ inicial, roles, otros, onClose, onGuardar }: {
  inicial: Perfil; roles: RolPerfil[]; otros: Perfil[]; onClose: () => void; onGuardar: (p: Perfil) => void;
}) {
  const [p, setP] = useState(inicial);
  const [nacionalidades] = useDato('nacionalidades');
  const [modulos] = useDato('modulos');
  const abrir = (m: Perfil['modulos'][number]) => {
    const url = modulos.find(x => x.codigo === m)?.url;
    return url && RUTA_PERFILES[m] ? `${new URL(url).origin}${RUTA_PERFILES[m]}?id=${encodeURIComponent(p.identificacion)}` : '';
  };
  const nuevo = !inicial.nombre;
  const repetido = otros.find(o => p.identificacion.trim() && o.identificacion === p.identificacion.trim());
  const error = !p.nombre.trim() || !p.identificacion.trim() ? 'Nombre e identificación son obligatorios.'
    : repetido ? `Ya existe un perfil con esa identificación: ${repetido.nombre}.`
      : !p.roles.length ? 'Elige al menos un rol.'
        : p.correo && !/^\S+@\S+\.\S+$/.test(p.correo) ? 'El correo no es válido.' : null;
  const alternar = (r: RolPerfil, on: boolean) => setP({ ...(on ? { ...DEFECTO[r], ...p } : p), roles: on ? [...p.roles, r] : p.roles.filter(x => x !== r) });

  return (
    <ModalBase titulo={nuevo ? 'Nuevo perfil' : p.nombre} onClose={onClose} ancho={1120}
      pie={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!!error} onClick={() => onGuardar({ ...p, nombre: p.nombre.trim(), identificacion: p.identificacion.trim() })}>Guardar</Button></>}>
      {/* Dos columnas: datos generales y roles a la izquierda; los datos de cada rol a la derecha, para no tener que hacer scroll. */}
      <div className="editor-usuario" style={{ display: 'grid', gridTemplateColumns: p.roles.length ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 28, alignItems: 'start', fontFamily: FONT }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Grid cols={2}>
          <Campo label="Tipo de identificación" required><Select value={p.tipoId} onChange={v => setP({ ...p, tipoId: v })} options={TIPOS_ID.map(t => ({ value: t, label: t }))} /></Campo>
          <Campo label="Número de identificación" required><Input value={p.identificacion} onChange={v => setP({ ...p, identificacion: v })} /></Campo>
          <Campo label="Nombre o razón social" required style={{ gridColumn: '1 / -1' }}><Input value={p.nombre} onChange={v => setP({ ...p, nombre: v })} /></Campo>
          <Campo label="Correo electrónico"><Input type="email" value={p.correo} onChange={v => setP({ ...p, correo: v })} /></Campo>
          <Campo label="Teléfono"><Input value={p.telefono} onChange={v => setP({ ...p, telefono: v })} /></Campo>
          <Campo label="País">
            <Select value={p.pais} onChange={v => setP({ ...p, pais: v })} options={[...new Set([p.pais, ...nacionalidades.map(n => n.pais)])].filter(Boolean).sort().map(x => ({ value: x, label: x }))} />
          </Campo>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}><Switch checked={p.activo} onChange={b => setP({ ...p, activo: b })} label="Activo" /></div>
        </Grid>
        <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <legend style={{ fontSize: 12, color: C.n700, padding: 0, marginBottom: 8 }}>Roles</legend>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {roles.map(r => <Checkbox key={r} checked={p.roles.includes(r)} onChange={b => alternar(r, b)} label={r} />)}
          </div>
        </fieldset>
        {p.modulos.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12, color: C.n700, paddingTop: 14, borderTop: `1px solid ${C.n500}` }}>
            <span>Lo usan:</span>
            {p.modulos.map(m => (
              <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <ChipModulo m={m} />
                {abrir(m) && <BotonEnlace href={abrir(m)} variante="contorno">Abrir en el módulo</BotonEnlace>}
              </span>
            ))}
          </div>
        )}
        {error && (p.nombre || p.identificacion) && <span role="alert" style={{ fontSize: 12, color: C.error }}>{error}</span>}
      </div>
      {p.roles.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{p.roles.map(r => <CamposRol key={r} rol={r} p={p} setP={setP} />)}</div>}
      </div>
    </ModalBase>
  );
}
