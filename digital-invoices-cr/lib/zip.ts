// Archivo .zip sin compresión (método «store»), suficiente para descargar
// varios XML juntos sin agregar dependencias.
const TABLA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(b: Uint8Array) { let c = 0xffffffff; for (const x of b) c = TABLA[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

export function crearZip(archivos: { nombre: string; contenido: string | Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  const usados = new Set<string>();
  for (const a of archivos) {
    let nombre = a.nombre.replace(/[\\/:*?"<>|]/g, '_');
    for (let i = 2; usados.has(nombre); i++) nombre = a.nombre.replace(/(\.[^.]+)?$/, `-${i}$1`);
    usados.add(nombre);
    const n = enc.encode(nombre), d = typeof a.contenido === 'string' ? enc.encode(a.contenido) : a.contenido, crc = crc32(d);
    const loc = new DataView(new ArrayBuffer(30));
    loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true); loc.setUint32(14, crc, true);
    loc.setUint32(18, d.length, true); loc.setUint32(22, d.length, true); loc.setUint16(26, n.length, true);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, d.length, true); cen.setUint32(24, d.length, true); cen.setUint16(28, n.length, true); cen.setUint32(42, offset, true);
    partes.push(new Uint8Array(loc.buffer), n, d);
    central.push(new Uint8Array(cen.buffer), n);
    offset += 30 + n.length + d.length;
  }
  const tamCentral = central.reduce((s, p) => s + p.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamCentral, true); fin.setUint32(16, offset, true);
  const todo = [...partes, ...central, new Uint8Array(fin.buffer)];
  const out = new Uint8Array(todo.reduce((s, p) => s + p.length, 0));
  let i = 0; for (const p of todo) { out.set(p, i); i += p.length; }
  return out;
}
