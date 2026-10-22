// Fechas en formato de la suite (dd/mm/aaaa) a partir de AAAA-MM-DD.
export const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const fmtF = (f: string) => (f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : '');
export const fmtFH = (iso: string) => `${fmtF(iso.slice(0, 10))} ${iso.slice(11, 16)}`;
