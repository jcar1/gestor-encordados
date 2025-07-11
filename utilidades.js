// utilidades.js
export function formatearFecha(fecha) {
  if (!fecha) return "";
  const d = new Date(fecha);
  return d.toLocaleDateString("es-ES");
}

export function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
