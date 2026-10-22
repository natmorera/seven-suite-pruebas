'use client';
// Revisar un perfil antes de sincronizarlo: muestra lado a lado cómo se ve en el MAN y en cada módulo (datos generales y
// de cada rol). La identificación coincide, así que es el mismo perfil; en los datos generales que no coinciden se elige
// con cuál quedarse (por defecto, el del MAN o el del primer módulo) y la columna «Queda en el MAN» permite corregirlo a
// mano. Los roles se suman y los datos de cada rol se completan con los de los módulos.
import { Fragment, useState, type ReactNode } from 'react';
import { C, FONT } from '@/components/suite/tokens';
import { Button, Input } from '@/components/suite/ui';
import { Celda, Fila, Insignia, ModalBase, Tabla } from '@/components/kit';
import { siglaModulo } from '../../catalogo';
import type { PerfilEntrante } from '../../datos/sincronizacion';
import type { ModuloId, Perfil } from '../../tipos';
import { COMUNES, camposDistintos, type CampoComun, type DatosPerfil as Datos } from './comparar';
import type { Grupo } from './UnificarPerfiles';
const si = (b?: boolean) => (b ? 'Sí' : 'No');
const num = (n?: number) => (n === undefined ? '' : n.toLocaleString('es-CR'));
const ROLES: [string, (p: Datos) => [string, string][] | null][] = [
  ['Cliente', p => p.cliente ? [['Condición', p.cliente.condicion], ['Plazo', `${p.cliente.plazo} días`], ['Límite de crédito', num(p.cliente.limite)], ['Moneda', p.cliente.moneda]] : null],
  ['Proveedor', p => p.proveedor ? [['Categoría', p.proveedor.categoria], ['Plazo', `${p.proveedor.plazo} días`], ['Moneda', p.proveedor.moneda], ['Cuenta', p.proveedor.cuenta]] : null],
  ['Receptor', p => p.receptor ? [['Correo de comprobantes', p.receptor.correoComprobantes], ['Actividad', p.receptor.actividad], ['Provincia', p.receptor.provincia], ['Exonerado', si(p.receptor.exonerado)]] : null],
  ['Empresa', p => p.empresa ? [['Tipo', p.empresa.tipo], ['Tarifa', p.empresa.tarifa], ['Crédito', si(p.empresa.credito)], ['Comisión', `${p.empresa.comision}%`]] : null],
];

export function RevisarUnion({ g, inicial, onClose, onConfirmar }: {
  g: Grupo; inicial?: Partial<Perfil>; onClose: () => void; onConfirmar: (cambios: Partial<Perfil>) => void;
}) {
  // Columnas: el MAN (si ya existe) y cada módulo que tiene el perfil.
  const fuentes: { clave: string; titulo: string; datos: Datos }[] = [
    ...(g.man ? [{ clave: 'MAN', titulo: 'En el MAN', datos: g.man as Datos }] : []),
    ...(Object.entries(g.versiones) as [ModuloId, PerfilEntrante][]).map(([m, e]) => ({ clave: m, titulo: `En ${siglaModulo(m)}`, datos: e as Datos })),
  ];
  const distintos = camposDistintos(fuentes.map(f => f.datos));
  // Por campo distinto: la versión elegida (o «propio» si se escribió a mano) y el valor que queda en el MAN.
  const [usar, setUsar] = useState<Partial<Record<CampoComun, string>>>(() => Object.fromEntries(distintos.map(([k]) => {
    if (inicial && k in inicial) return [k, fuentes.find(f => f.datos[k] === inicial[k])?.clave ?? 'propio'];
    return [k, fuentes[0].clave];
  })));
  const [queda, setQueda] = useState<Partial<Record<CampoComun, string>>>(() => Object.fromEntries(distintos.map(([k]) => [k, inicial?.[k] ?? fuentes[0].datos[k] ?? ''])));
  const elegir = (k: CampoComun, clave: string) => { setUsar({ ...usar, [k]: clave }); setQueda({ ...queda, [k]: fuentes.find(f => f.clave === clave)!.datos[k] ?? '' }); };
  const escribir = (k: CampoComun, v: string) => {
    setQueda({ ...queda, [k]: v });
    setUsar({ ...usar, [k]: fuentes.find(f => f.datos[k] === v)?.clave ?? 'propio' });
  };
  const error = (k: CampoComun) => {
    const v = (queda[k] ?? '').trim();
    if (k === 'nombre' && !v) return 'El nombre es obligatorio.';
    if (k === 'correo' && v && !/^\S+@\S+\.\S+$/.test(v)) return 'El correo no es válido.';
    return undefined;
  };
  const hayError = distintos.some(([k]) => error(k));
  const confirmar = () => onConfirmar(Object.fromEntries(distintos.map(([k]) => [k, (queda[k] ?? '').trim()])));
  const valor = (texto: ReactNode, queda: boolean) => <span style={{ color: queda ? C.n900 : C.n700, fontWeight: queda ? 500 : 400, whiteSpace: 'normal' }}>{texto || '—'}</span>;
  const grupo = (titulo: string) => (
    <tr><td colSpan={fuentes.length + 2} style={{ padding: '10px 12px 6px', fontSize: 11.5, fontWeight: 600, color: C.n700, background: C.n200, textTransform: 'uppercase', letterSpacing: '.03em' }}>{titulo}</td></tr>
  );

  return (
    <ModalBase titulo={`Revisar: ${g.nombre}`} onClose={onClose} ancho={Math.min(1240, 600 + fuentes.length * 220)}
      pie={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={hayError} onClick={confirmar}>Confirmar</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT }}>
        {g.duplicadoDe && <span style={{ fontSize: 12.5, color: C.n900 }}><Insignia label="Posible duplicado" color="yellow" /> Mismo nombre que {g.duplicadoDe}. Revisa si es el mismo perfil con otra identificación.</span>}
        <span style={{ fontSize: 12.5, color: C.n900 }}>
          {fuentes.length > 1 ? 'La identificación coincide, así que es el mismo perfil. ' : ''}
          {distintos.length ? `No coincide: ${distintos.map(([, l]) => l.toLowerCase()).join(', ')}. Elige qué dato queda en el MAN o corrígelo en «Queda en el MAN».` : 'Los datos generales coinciden (sin contar mayúsculas, tildes ni puntuación).'}
        </span>
        <Tabla headers={['Dato', ...fuentes.map(f => f.titulo), 'Queda en el MAN']} anchos={{ 0: 170, [fuentes.length + 1]: 240 }}>
          {grupo('Datos generales')}
          <Fila><Celda muted>Identificación</Celda>{fuentes.map(f => <Celda key={f.clave}>{valor(f.datos.identificacion, true)}</Celda>)}<Celda>{valor(fuentes[0].datos.identificacion, true)}</Celda></Fila>
          {COMUNES.map(([k, label]) => (
            <Fila key={k}>
              <Celda muted>{label}{distintos.some(([d]) => d === k) && <span style={{ display: 'block', marginTop: 4 }}><Insignia label="No coincide" color="yellow" /></span>}</Celda>
              {fuentes.map(f => (
                <Celda key={f.clave}>{distintos.some(([d]) => d === k) ? (
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12.5, whiteSpace: 'normal' }}>
                    <input type="radio" name={`usar-${k}`} checked={usar[k] === f.clave} onChange={() => elegir(k, f.clave)} style={{ marginTop: 2 }} />
                    {valor(f.datos[k], usar[k] === f.clave)}
                  </label>
                ) : valor(f.datos[k], true)}</Celda>
              ))}
              <Celda>{distintos.some(([d]) => d === k) ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="sr-only">{label} que queda en el MAN</span>
                  <Input value={queda[k] ?? ''} onChange={v => escribir(k, v)} error={error(k)} />
                  {(error(k) || usar[k] === 'propio') && <span style={{ fontSize: 11, color: error(k) ? C.error : C.n700 }}>{error(k) ?? 'Corregido a mano'}</span>}
                </label>
              ) : valor(fuentes.find(f => f.datos[k])?.datos[k], true)}</Celda>
            </Fila>
          ))}
          <Fila>
            <Celda muted>Roles</Celda>
            {fuentes.map(f => <Celda key={f.clave}><span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>{f.datos.roles.map(r => <Insignia key={r} label={r} color="brand" />)}</span></Celda>)}
            <Celda><span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>{[...new Set(fuentes.flatMap(f => f.datos.roles))].map(r => <Insignia key={r} label={r} color="brand" />)}</span></Celda>
          </Fila>
          {ROLES.map(([rol, datos]) => {
            const porFuente = fuentes.map(f => datos(f.datos));
            const filas = porFuente.find(Boolean);
            if (!filas) return null;
            return (
              <Fragment key={rol}>
                {grupo(rol)}
                {filas.map(([label], i) => (
                  <Fila key={label}><Celda muted>{label}</Celda>{porFuente.map((d, j) => <Celda key={fuentes[j].clave}>{valor(d?.[i][1], !!d)}</Celda>)}<Celda>{valor(filas[i][1], true)}</Celda></Fila>
                ))}
              </Fragment>
            );
          })}
        </Tabla>
        <span style={{ fontSize: 12, color: C.n700 }}>En negrita, el dato que queda en el MAN.</span>
      </div>
    </ModalBase>
  );
}
