// Tipos del árbol de permisos
// subOptions: cuando una acción se otorga "por tipo" (p.ej. registrar asientos
// solo de cierto origen, o crear cuentas solo de cierto nivel), en vez de
// tener un permiso plano por cada combinación, el permiso vive UNA vez con
// una lista de sub-opciones seleccionables. Se guarda en el Set como
// "clave:subopcion" (p.ej. "bandeja.registrar:Manual"). El checkbox del
// permiso queda marcado si tiene AL MENOS una sub-opción elegida.
export interface PermLeaf { key: string; label: string; desc?: string; subOptions?: string[] }
export interface PermGroup { key: string; label: string; info?: string; leaves: PermLeaf[]; flat?: boolean }
export interface PermModule { key: string; label: string; leaves?: PermLeaf[]; groups?: PermGroup[] }
export interface PermCategory { key: string; label: string; modules: PermModule[] }
