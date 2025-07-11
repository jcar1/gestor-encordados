// estadisticas.js - Versión mejorada
import { formatearFecha } from "./utilidades.js";

// Función básica de estadísticas
export function calcularEstadisticas(solicitudes) {
  const total = solicitudes.length;
  const ingresos = solicitudes.reduce((sum, s) => sum + (parseFloat(s.precio) || 0), 0);
  const promedio = total > 0 ? ingresos / total : 0;
  
  return { 
    total, 
    ingresos, 
    promedio 
  };
}

// Función avanzada de estadísticas
export function calcularEstadisticasAvanzadas(solicitudes) {
  const basics = calcularEstadisticas(solicitudes);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  // Solicitudes hoy
  const solicitudesHoy = solicitudes.filter(s => {
    const fechaSolicitud = new Date(s.fechaSolicitud);
    return fechaSolicitud >= hoy;
  }).length;
  
  // Ingresos últimos 30 días
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  
  const ingresos30Dias = solicitudes
    .filter(s => {
      const fechaPago = s.fechaPago ? new Date(s.fechaPago) : null;
      return fechaPago && fechaPago >= hace30Dias;
    })
    .reduce((sum, s) => sum + (parseFloat(s.precio) || 0), 0);
  
  // Promedio diario (últimos 30 días)
  const promedioDiario = ingresos30Dias / 30;
  
  return {
    ...basics,
    solicitudesHoy,
    ingresos30Dias,
    promedioDiario
  };
}

// Función para generar datos de gráficos
export function generarDatosGraficos(solicitudes) {
  const datosPorMes = {};
  const datosPorTipoCuerda = {};
  
  solicitudes.forEach(solicitud => {
    // Procesar por mes
    if (solicitud.fechaSolicitud) {
      const fecha = new Date(solicitud.fechaSolicitud);
      const mesAnio = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      if (!datosPorMes[mesAnio]) {
        datosPorMes[mesAnio] = 0;
      }
      datosPorMes[mesAnio] += parseFloat(solicitud.precio) || 0;
    }
    
    // Procesar por tipo de cuerda
    if (solicitud.tipoCuerda) {
      const tipo = solicitud.tipoCuerda.trim();
      
      if (!datosPorTipoCuerda[tipo]) {
        datosPorTipoCuerda[tipo] = 0;
      }
      datosPorTipoCuerda[tipo]++;
    }
  });
  
  return {
    porMes: Object.entries(datosPorMes)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mes, total]) => ({ mes, total })),
    porTipoCuerda: Object.entries(datosPorTipoCuerda)
      .sort((a, b) => b[1] - a[1])
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
  };
}