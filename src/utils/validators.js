export function validarPNR(pnr) {
  return /^[A-Z0-9]{6}$/.test(pnr);
}

export function validarIATA(iata) {
  return /^[A-Z]{3}$/.test(iata);
}

export function validarPassword(password) {
  return /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

export function validarCorreo(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

export function validarTelefonoPeru(telefonoE164) {
  if (!telefonoE164) return true; // campo opcional: vacio es valido
  return /^\+519\d{8}$/.test(telefonoE164);
}
