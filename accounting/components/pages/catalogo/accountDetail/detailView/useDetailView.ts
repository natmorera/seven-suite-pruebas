'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type Cuenta, GRUPOS_NIIF, TIPOS_ESPECIAL, MONEDAS, TIPOS_IDENTIFICACION_FISCAL } from '../../catalogoData';
import { type EnlaceAjuste } from '../../datos/ajustes';
import { useCentrosCostoConfig } from '../../centrosCostoConfig';
import { type TrasladoResult } from '../../modalTrasladoSaldo/datos';
import { GRUPOS_PATRIMONIO } from '../datos';

export function useDetailView({ account, onEdit, onDelete, onAddChild, onClose, onSelect, allNodes, onTraslado, trasladoResult, enlacesAjuste }: {
  account:Cuenta; onEdit:()=>void; onDelete:(id:string)=>void; onAddChild:(p:Cuenta)=>void;
  onClose:()=>void; onSelect:(n:Cuenta)=>void; allNodes:Cuenta[];
  onTraslado:()=>void; trasladoResult:TrasladoResult|null;
  enlacesAjuste?: EnlaceAjuste[];
}) {
  const router = useRouter();
  const { centrosCosto: CENTROS_COSTO } = useCentrosCostoConfig();
  const [confirmDel, setConfirmDel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ccAsignados, setCcAsignados] = useState<string[]>(account.centrosCostoIds??[]);

  // Al cambiar de cuenta se vuelven a cargar sus centros de costo
  const [cuentaPrevia, setCuentaPrevia] = useState(account.id);
  if (account.id !== cuentaPrevia) { setCuentaPrevia(account.id); setCcAsignados(account.centrosCostoIds??[]); }

  const isRoot = account.nivel === 'grupo';
  const esCliente = account.tipoEspecial==='02'||account.tipoEspecial==='03';
  const esProveedor = account.tipoEspecial==='04';
  const esAuxiliar = esCliente || esProveedor;
  const esBanco = account.tipoEspecial==='05';
  // esta cuenta ES un cliente/proveedor puntual (nivel auxiliar bajo un
  // Detalle 02/03/04) - tiene entornoFiscal propio y perfil en Clientes/Proveedores.
  const esFichaAuxiliar = esAuxiliar && account.nivel === 'auxiliar';
  const tipoIdLabel = TIPOS_IDENTIFICACION_FISCAL.find(t=>t.value===account.entornoFiscal?.tipoIdentificacion)?.label ?? '';
  // movimientos de ajuste (Catálogo > Movimientos de ajuste) enlazados a esta cuenta
  const ajustesEnlazados = (enlacesAjuste??[]).filter(e => e.cuentaCode === account.code);
  // Las cuentas de detalle con tipo 02/03/04 admiten subcuentas auxiliares (clientes o proveedores)
  const canAddChild = account.nivel !== 'detalle' || esAuxiliar;
  const canDelete = !account.children?.length && !isRoot;
  const esPatrimonio = account.grupo==='3';
  const grupoLabel = GRUPOS_NIIF.find(g=>g.value===account.grupo)?.label??'';
  const monedaLabel = MONEDAS.find(m=>m.value===account.moneda)?.label??'Colón costarricense';
  const espLabel = TIPOS_ESPECIAL.find(t=>t.value===account.tipoEspecial)?.label??'';
  const patriLabel = GRUPOS_PATRIMONIO.find(g=>g.value===account.grupoPatrimonio)?.label;
  const subcuentas = account.children??[];
  const hasCCSection = esBanco || account.centroCostoObligatorio || account.usaCentroCosto;
  return { account, onEdit, onDelete, onAddChild, onClose, onSelect, allNodes, onTraslado, trasladoResult, enlacesAjuste, router, CENTROS_COSTO, confirmDel, setConfirmDel, copied, setCopied, ccAsignados, setCcAsignados, isRoot, esCliente, esProveedor, esAuxiliar, esBanco, esFichaAuxiliar, tipoIdLabel, ajustesEnlazados, canAddChild, canDelete, esPatrimonio, grupoLabel, monedaLabel, espLabel, patriLabel, subcuentas, hasCCSection };
}

export type EstadoDetailView = ReturnType<typeof useDetailView>;
