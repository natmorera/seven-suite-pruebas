// Datos de empresa de Seven Analytics, uno por cada empresa del selector.
// El módulo no tiene servidor: se guardan en el navegador.
export interface DatosEmpresa {
  nombreLegal: string; nombreComercial: string; tipoId: string; numeroId: string; pais: string; zonaHoraria: string;
  direccion: string; telefono: string; email: string; web: string;
}
export const TIPOS_ID = [
  { value: "02", label: "Cédula jurídica" }, { value: "01", label: "Cédula física" },
  { value: "NIT", label: "NIT" }, { value: "RUC", label: "RUC" }, { value: "OTRO", label: "Otro" },
];
export const PAISES = [
  { value: "CR", label: "Costa Rica", zona: "America/Costa_Rica" }, { value: "GT", label: "Guatemala", zona: "America/Guatemala" },
  { value: "NI", label: "Nicaragua", zona: "America/Managua" }, { value: "PA", label: "Panamá", zona: "America/Panama" },
  { value: "SV", label: "El Salvador", zona: "America/El_Salvador" }, { value: "HN", label: "Honduras", zona: "America/Tegucigalpa" },
  { value: "MX", label: "México", zona: "America/Mexico_City" }, { value: "CO", label: "Colombia", zona: "America/Bogota" },
];
const vacio = (nombre: string): DatosEmpresa => ({
  nombreLegal: nombre, nombreComercial: nombre, tipoId: "02", numeroId: "", pais: "CR", zonaHoraria: "America/Costa_Rica",
  direccion: "", telefono: "", email: "", web: "",
});
const clave = (id: string) => `ana_empresa_${id}`;
export function leerEmpresa(id: string, nombre: string): DatosEmpresa {
  try { const g = localStorage.getItem(clave(id)); if (g) return { ...vacio(nombre), ...JSON.parse(g) }; } catch { /* por defecto */ }
  return vacio(nombre);
}
export function guardarEmpresa(id: string, d: DatosEmpresa) {
  try { localStorage.setItem(clave(id), JSON.stringify(d)); } catch { /* sin almacenamiento */ }
}
