// Lee los archivos de un .zip en el navegador (sin compresión o «deflate»),
// para importar de una vez todos los XML que el cliente exportó de otro sistema.
export async function leerZip(archivo: Blob): Promise<File[]> {
  const buf = new Uint8Array(await archivo.arrayBuffer());
  const dv = new DataView(buf.buffer);
  // Directorio central: se busca el fin de directorio desde el final
  let fin = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  if (fin < 0) throw new Error('El archivo .zip está dañado.');
  const total = dv.getUint16(fin + 10, true);
  let p = dv.getUint32(fin + 16, true);
  const dec = new TextDecoder();
  const salida: File[] = [];
  for (let k = 0; k < total; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const metodo = dv.getUint16(p + 10, true), tam = dv.getUint32(p + 20, true);
    const nLen = dv.getUint16(p + 28, true), eLen = dv.getUint16(p + 30, true), cLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const nombre = dec.decode(buf.subarray(p + 46, p + 46 + nLen));
    p += 46 + nLen + eLen + cLen;
    if (nombre.endsWith('/')) continue;
    const ini = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const datos = buf.slice(ini, ini + tam);
    let contenido: Uint8Array;
    if (metodo === 0) contenido = datos;
    else if (metodo === 8) contenido = new Uint8Array(await new Response(new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    else continue;
    salida.push(new File([contenido as BlobPart], nombre.split('/').pop() || nombre, { type: 'application/xml' }));
  }
  return salida;
}
