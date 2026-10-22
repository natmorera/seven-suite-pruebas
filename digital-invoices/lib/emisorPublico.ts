// Los secretos (PIN del .p12 y contraseña de Hacienda) nunca salen al
// navegador: solo se informa si están cargados.
export function emisorPublico(r: Record<string, unknown>) {
  const { llave_pin, clave_hacienda, llave_pfx_path, ...resto } = r;
  return { ...resto, tiene_pin: Boolean(llave_pin), tiene_clave_hacienda: Boolean(clave_hacienda), tiene_archivo_llave: Boolean(llave_pfx_path) };
}
