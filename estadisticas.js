// estadisticas.js
export function calcularEstadisticas(solicitudes) {
  const total = solicitudes.length;
  const ingresos = solicitudes.reduce((sum, s) => sum + (s.precio || 0), 0);
  const promedio = total > 0 ? ingresos / total : 0;
  return { total, ingresos, promedio };
}
