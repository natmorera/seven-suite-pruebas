'use client';
import { useState, useEffect } from 'react';
import { type Cuenta, type Nivel, isCCObligatorioBySpec, SEP, LONGITUD } from '../../catalogoData';
import { getNaturaleza, getChildNivelConfigurable, isPosteable, codeExists, buildCodePrefix, suggestNextSegment, suggestNextMayorSegment, genId } from '../../datos/arbol';
import { useCentrosCostoConfig } from '../../centrosCostoConfig';
import { NIIF_LEAVES, type NiifLeaf } from '../datos';

export function useEditForm({ account, parentAccount, allNodes, onSave, onCancel, isNew }: {
  account:Cuenta|null; parentAccount:Cuenta|null; allNodes:Cuenta[];
  onSave:(c:Cuenta)=>void; onCancel:()=>void; isNew:boolean;
}) {
  const { centrosCosto: CENTROS_COSTO } = useCentrosCostoConfig();
  // Cuenta nueva: nivel «mayor» salvo que la cuenta madre fije el nivel del hijo
  const defaultNivel: Nivel = isNew
    ? (parentAccount ? (getChildNivelConfigurable(parentAccount.nivel) ?? 'mayor') : 'mayor')
    : (account?.nivel ?? 'mayor');

  const [nivelSel, setNivelSel] = useState<Nivel>(defaultNivel);
  const [parentSel, setParentSel] = useState<Cuenta|null>(parentAccount);
  const effectiveParent = parentAccount ?? parentSel;
  const nivel: Nivel = !isNew ? (account?.nivel ?? 'mayor') : nivelSel;

  const esAuxiliar2 = nivel === 'auxiliar';
  const segLen = LONGITUD[nivel] ?? 4;

  // Prefijo de la cuenta madre (si hay una seleccionada)
  const prefix = isNew && effectiveParent ? buildCodePrefix(effectiveParent) : '';
  // siempre se ofrece la sugerencia de código que sigue en el nivel.
  // Mayor no tiene cuenta padre que consultar - se sugiere en base al catálogo completo.
  const suggestion = isNew
    ? (nivel === 'mayor' ? suggestNextMayorSegment(allNodes) : suggestNextSegment(effectiveParent ?? null))
    : '';

  const currentSegment = !isNew && account?.code
    ? account.code.split(SEP).pop() ?? ''
    : suggestion;

  const [form, setForm] = useState({
    nombre:                 account?.nombre??'',
    nombreAlt:              account?.nombreAlt??'',
    codeSegment:            currentSegment,
    grupo:                  account?.grupo??(parentAccount?.grupo??'1'),
    moneda:                 account?.moneda??'CRC',
    centroCostoObligatorio: account?.centroCostoObligatorio??false,
    usaCentroCosto:         account?.usaCentroCosto??false,
    descripcion:            account?.descripcion??'',
    grupoPatrimonio:        account?.grupoPatrimonio??'',
    tipoEspecial:           account?.tipoEspecial??'',
    centrosCostoIds:        account?.centrosCostoIds??[],
    tipoIdentificacion:     account?.entornoFiscal?.tipoIdentificacion??'juridica',
    numeroIdentificacion:   account?.entornoFiscal?.numeroIdentificacion??'',
    regimenFiscal:          account?.entornoFiscal?.regimen??'tradicional',
    diasCredito:            account?.diasCredito!=null ? String(account.diasCredito) : '',
    esCuentaImpuesto:       !!account?.configImpuesto,
    impuestoRol:            account?.configImpuesto?.rol ?? 'debito',
    impuestoTipo:           account?.configImpuesto?.tipoImpuesto ?? 'iva',
  });
  const [bancarias, setBancarias] = useState<{ id:string; banco:string; numero:string; moneda:string; tipo:string }[]>(account?.bancarias??[]);
  function agregarBancaria() {
    setBancarias(b=>[...b, { id:genId(), banco:'', numero:'', moneda:'CRC', tipo:'corriente' }]);
  }
  function actualizarBancaria(id:string, patch:Partial<{banco:string;numero:string;moneda:string;tipo:string}>) {
    setBancarias(b=>b.map(x=>x.id===id?{...x,...patch}:x));
  }
  function eliminarBancaria(id:string) {
    setBancarias(b=>b.filter(x=>x.id!==id));
  }
  // ── Clasificación NIIF - un solo selector con búsqueda ───────────────────────
  const initialLeaf = NIIF_LEAVES.find(l=>l.grupo===form.grupo) ?? null;
  const [niifLeaf, setNiifLeaf] = useState<NiifLeaf|null>(initialLeaf);

  function handleNiifSelect(leaf: NiifLeaf) {
    setNiifLeaf(leaf);
    set('grupo', leaf.grupo);
  }
  const [errors, setErrors] = useState<Record<string,string>>({});

  function set<K extends keyof typeof form>(field:K, value: typeof form[K]) {
    setForm(f=>({...f,[field]:value}));
    if (errors[field]) setErrors(e=>({...e,[field]:''}));
  }

  // El código sugerido solo se conocía al montar el formulario (useState
  // initializer), así que cambiar de nivel (Mayor → Sub mayor, etc.) dejaba el
  // segmento sugerido "viejo" pegado en el input aunque todavía no hubiera
  // cuenta madre seleccionada. Se recalcula cada vez que cambia el nivel o la
  // cuenta madre elegida: Mayor siempre tiene sugerencia; Sub mayor/Detalle solo
  // sugieren una vez que se eligió la cuenta madre, y se vacían mientras tanto.
  useEffect(() => {
    if (!isNew) return;
    if (nivel === 'mayor') {
      set('codeSegment', suggestNextMayorSegment(allNodes));
    } else if (effectiveParent) {
      set('codeSegment', suggestNextSegment(effectiveParent));
    } else {
      set('codeSegment', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- el segmento se sugiere solo al cambiar de nivel o de cuenta madre, no en cada edición
  }, [isNew, nivel, effectiveParent?.id]);

  // ── Jerarquía de herencia ─────────────────────────────────────────────────
  // Centro de costo y Rol especial: se definen únicamente en Detalle; Auxiliar hereda.
  // Mayor y Sub mayor son puramente estructurales, no aplica ninguno de los dos.
  const ccObligatorioBySpec = isCCObligatorioBySpec(form.grupo, form.tipoEspecial||null);
  const ccEffective = nivel === 'detalle'
    ? (ccObligatorioBySpec || form.centroCostoObligatorio || form.usaCentroCosto)
    : nivel === 'auxiliar'
    ? !!(effectiveParent?.centroCostoObligatorio || effectiveParent?.usaCentroCosto)
    : false;
  const tipoEspecialEffective = nivel === 'detalle'
    ? (form.tipoEspecial || null)
    : nivel === 'auxiliar'
    ? (effectiveParent?.tipoEspecial ?? null)
    : null;

  const fullCode = isNew
    ? (effectiveParent ? prefix + form.codeSegment.trim() : form.codeSegment.trim())
    : (account?.code?.split(SEP).slice(0,-1).concat(form.codeSegment.trim()).join(SEP) ?? form.codeSegment.trim());

  const naturaleza = getNaturaleza(form.grupo);
  const posteable = isPosteable(nivel);
  const grupoLocked = !!parentAccount;
  const esPatrimonio = form.grupo==='3';
  const codeErr = isNew && fullCode && codeExists(allNodes, fullCode, null);
  const esProveedorAuxiliar = nivel === 'auxiliar' && tipoEspecialEffective === '04';
  // Días de crédito, entorno fiscal y cuentas bancarias aplican a clientes (tipoEspecial
  // '02'/'03') y a proveedores ('04'): se usan para calcular el vencimiento de las cuentas por
  // cobrar y por pagar.
  const esClienteAuxiliar = nivel === 'auxiliar' && (tipoEspecialEffective === '02' || tipoEspecialEffective === '03');
  const esClienteOProveedorAuxiliar = esProveedorAuxiliar || esClienteAuxiliar;

  function validate() {
    const e: Record<string,string> = {};
    if (!form.nombre.trim()) e.nombre='El nombre es obligatorio';
    const seg = form.codeSegment.trim();
    if (!seg) e.codeSegment='El código es obligatorio';
    else if (!/^\d+$/.test(seg)) e.codeSegment='Solo se permiten dígitos';
    // No enforced length - user can configure segment length in Parámetros generales
    else if (codeExists(allNodes, fullCode, account?.id??null)) e.codeSegment='Este código ya existe en el catálogo';
    // La identificación es obligatoria para clientes/proveedores sin importar si se
    // crean acá (Catálogo de cuentas) o desde Clientes/Proveedores - ambas puntas
    // deben quedar igual de completas.
    if (esClienteOProveedorAuxiliar && !form.numeroIdentificacion.trim()) e.numeroIdentificacion='La identificación es obligatoria';
    setErrors(e);
    return Object.keys(e).length===0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({
      id: account?.id??'_new_'+Date.now(),
      code: fullCode,
      nombre: form.nombre.trim(),
      nombreAlt: form.nombreAlt.trim(),
      grupo: form.grupo,
      moneda: form.moneda,
      naturaleza,
      nivel,
      posteable,
      centroCostoObligatorio: ccEffective,
      usaCentroCosto: ccEffective,
      centrosCostoIds: form.centrosCostoIds,
      descripcion: form.descripcion.trim(),
      grupoPatrimonio: esPatrimonio?(form.grupoPatrimonio||null):null,
      tipoEspecial: tipoEspecialEffective,
      parentId: effectiveParent?.id??account?.parentId??undefined,
      children: account?.children??[],
      expanded: account?.expanded??false,
      saldo: account?.saldo??0,
      configImpuesto: (nivel==='detalle' && form.esCuentaImpuesto)
        ? { rol: form.impuestoRol as 'acreditable'|'debito', tipoImpuesto: form.impuestoTipo }
        : null,
      ...(esClienteOProveedorAuxiliar ? {
        entornoFiscal: {
          tipoIdentificacion: form.tipoIdentificacion,
          numeroIdentificacion: form.numeroIdentificacion.trim(),
          regimen: form.regimenFiscal,
        },
        bancarias,
        diasCredito: form.diasCredito.trim() ? parseInt(form.diasCredito,10) : 0,
      } : {}),
    } as Cuenta);
  }
  return { account, parentAccount, allNodes, onSave, onCancel, isNew, CENTROS_COSTO, defaultNivel, nivelSel, setNivelSel, parentSel, setParentSel, effectiveParent, nivel, esAuxiliar2, segLen, prefix, suggestion, currentSegment, form, setForm, bancarias, setBancarias, agregarBancaria, actualizarBancaria, eliminarBancaria, initialLeaf, niifLeaf, setNiifLeaf, handleNiifSelect, errors, setErrors, set, ccObligatorioBySpec, ccEffective, tipoEspecialEffective, fullCode, naturaleza, posteable, grupoLocked, esPatrimonio, codeErr, esProveedorAuxiliar, esClienteAuxiliar, esClienteOProveedorAuxiliar, validate, handleSubmit };
}

export type EstadoEditForm = ReturnType<typeof useEditForm>;
