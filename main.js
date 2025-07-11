// main.js - Versión mejorada
import { iniciarSesion, cerrarSesion, observarAutenticacion } from "./auth.js";
import { obtenerJugadores, agregarJugador, actualizarJugador, eliminarJugador } from "./jugadores.js";
import { obtenerSolicitudes, agregarSolicitud, actualizarSolicitud, eliminarSolicitud } from "./solicitudes.js";
import { calcularEstadisticas, calcularEstadisticasAvanzadas } from "./estadisticas.js";
import { formatearFecha, validarEmail } from "./utilidades.js";
import { mostrarError } from "./ui-helpers.js";

// Elementos UI
const elementosUI = {
  userIdDisplay: document.getElementById("userIdDisplay"),
  statTotalSolicitudes: document.getElementById("statTotalSolicitudes"),
  statIngresosTotales: document.getElementById("statIngresosTotales"),
  statPrecioPromedio: document.getElementById("statPrecioPromedio"),
  statSolicitudesHoy: document.getElementById("statSolicitudesHoy"),
  statIngresos30Dias: document.getElementById("statIngresos30Dias"),
  statPromedioDiario: document.getElementById("statPromedioDiario"),
  loadingIndicator: document.getElementById("loadingIndicator"),
  errorContainer: document.getElementById("errorContainer")
};

// Estado global
const estadoApp = {
  usuario: null,
  jugadores: [],
  solicitudes: [],
  stats: null
};

// Funciones de utilidad para UI
function mostrarCarga(mostrar = true) {
  elementosUI.loadingIndicator.style.display = mostrar ? "block" : "none";
}


// Actualizar UI con datos
function actualizarUI() {
  try {
    // Actualizar información de usuario
    elementosUI.userIdDisplay.textContent = estadoApp.usuario ? estadoApp.usuario.uid : "No autenticado";

    // Actualizar estadísticas
    if (estadoApp.stats) {
      elementosUI.statTotalSolicitudes.textContent = estadoApp.stats.total;
      elementosUI.statIngresosTotales.textContent = `${estadoApp.stats.ingresos.toFixed(2)} €`;
      elementosUI.statPrecioPromedio.textContent = `${estadoApp.stats.promedio.toFixed(2)} €`;
      elementosUI.statSolicitudesHoy.textContent = estadoApp.stats.solicitudesHoy;
      elementosUI.statIngresos30Dias.textContent = `${estadoApp.stats.ingresos30Dias.toFixed(2)} €`;
      elementosUI.statPromedioDiario.textContent = `${estadoApp.stats.promedioDiario.toFixed(2)} €`;
    }
  } catch (error) {
    console.error("Error al actualizar UI:", error);
    mostrarError("Error al actualizar la interfaz");
  }
}

// Cargar datos iniciales
async function cargarDatosIniciales() {
  mostrarCarga(true);
  try {
    const [jugadores, solicitudes] = await Promise.all([
      obtenerJugadores().catch(e => {
        mostrarError("Error cargando jugadores");
        console.error("Detalle error jugadores:", e);
        return []; // Retorna array vacío para que la app no se rompa
      }),
      obtenerSolicitudes().catch(e => {
        mostrarError("Error cargando solicitudes");
        console.error("Detalle error solicitudes:", e);
        return []; // Retorna array vacío para continuar
      })
    ]);
    
    // Actualiza el estado incluso si un array está vacío
    estadoApp.jugadores = jugadores || [];
    estadoApp.solicitudes = solicitudes || [];
    
    // Solo calcula stats si hay datos
    if (solicitudes.length > 0) {
      estadoApp.stats = calcularEstadisticasAvanzadas(solicitudes);
    } else {
      estadoApp.stats = { 
        total: 0, 
        ingresos: 0, 
        promedio: 0,
        solicitudesHoy: 0,
        ingresos30Dias: 0,
        promedioDiario: 0
      };
    }
    
    actualizarUI();
  } catch (error) {
    console.error("Error general en carga inicial:", error);
    mostrarError("Error crítico. Contacte al soporte.");
  } finally {
    mostrarCarga(false);
  }
}

// Inicialización de la aplicación
document.addEventListener("DOMContentLoaded", () => {
  observarAutenticacion(async (user) => {
    if (user) {
      estadoApp.usuario = user;
      await cargarDatosIniciales();
    } else {
      estadoApp.usuario = null;
      actualizarUI();
    }
  });
});

// Verifica si estamos en desarrollo (localhost) o producción
const isLocalDevelopment = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

// Opcional: Habilitar debug con hash en la URL (ej: https://tusitio.com#debug)
const isDebugMode = window.location.hash === '#debug';

if (isLocalDevelopment || isDebugMode) {
  window.app = {
    estado: estadoApp,
    ui: elementosUI,
    cargarDatosIniciales,
    actualizarUI
  };
  console.log("Modo desarrollo/debug activado"); // Opcional
}