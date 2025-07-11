// utilidades.js - Versión mejorada

// Formatear fecha con opciones
export function formatearFecha(fecha, opciones = {}) {
  if (!fecha) return "";
  
  try {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return "Fecha inválida";
    
    const defaults = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC"
    };
    
    const config = { ...defaults, ...opciones };
    return d.toLocaleDateString("es-ES", config);
  } catch (error) {
    console.error("Error al formatear fecha:", error);
    return "Error de formato";
  }
}

// Validar email mejorado
export function validarEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Validar formulario de solicitud
export function validarSolicitud(solicitud) {
  const errores = [];
  
  if (!solicitud.codigoJugador || solicitud.codigoJugador.trim() === "") {
    errores.push("El código de jugador es requerido");
  }
  
  if (!solicitud.nombreJugador || solicitud.nombreJugador.trim() === "") {
    errores.push("El nombre del jugador es requerido");
  }
  
  if (!solicitud.fechaSolicitud || isNaN(new Date(solicitud.fechaSolicitud).getTime())) {
    errores.push("La fecha de solicitud no es válida");
  }
  
  if (solicitud.precio && isNaN(parseFloat(solicitud.precio))) {
    errores.push("El precio debe ser un número válido");
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

// Convertir CSV a JSON
export function csvToJson(csvData) {
  const lines = csvData.split("\n");
  const result = [];
  const headers = lines[0].split(",").map(h => h.trim());
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const obj = {};
    const currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    for (let j = 0; j < headers.length; j++) {
      let value = currentline[j];
      if (value && value.startsWith("\"") && value.endsWith("\"")) {
        value = value.substring(1, value.length - 1);
      }
      obj[headers[j]] = value ? value.trim() : "";
    }
    
    result.push(obj);
  }
  
  return result;
}

// Formatear moneda
export function formatearMoneda(valor) {
  return parseFloat(valor || 0).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}