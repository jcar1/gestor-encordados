// main.js - Versión mejorada
import { iniciarSesion, cerrarSesion, observarAutenticacion } from "./auth.js";
import { obtenerJugadores, agregarJugador, actualizarJugador, eliminarJugador } from "./jugadores.js";
import { obtenerSolicitudes, agregarSolicitud, actualizarSolicitud, eliminarSolicitud } from "./solicitudes.js";
import { calcularEstadisticas, calcularEstadisticasAvanzadas } from "./estadisticas.js";
import { formatearFecha, validarEmail } from "./utilidades.js";

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

function mostrarError(mensaje) {
  elementosUI.errorContainer.textContent = mensaje;
  elementosUI.errorContainer.style.display = "block";
  setTimeout(() => {
    elementosUI.errorContainer.style.display = "none";
  }, 5000);
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
      obtenerJugadores(),
      obtenerSolicitudes()
    ]);
    
    estadoApp.jugadores = jugadores;
    estadoApp.solicitudes = solicitudes;
    estadoApp.stats = calcularEstadisticasAvanzadas(solicitudes);
    
    actualizarUI();
  } catch (error) {
    console.error("Error al cargar datos:", error);
    mostrarError("Error al cargar datos. Intente recargar la página.");
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

// Exportar para acceso desde consola (solo desarrollo)
if (process.env.NODE_ENV === "development") {
  window.app = {
    estado: estadoApp,
    ui: elementosUI,
    cargarDatosIniciales,
    actualizarUI
  };
}