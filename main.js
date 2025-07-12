// main.js - Versión corregida
import { observarAutenticacion, obtenerUsuarioActual } from "./auth.js";
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
  stats: null,
  cargando: false
};

// Funciones de utilidad para UI
function mostrarCarga(mostrar = true) {
  if (elementosUI.loadingIndicator) {
    elementosUI.loadingIndicator.style.display = mostrar ? "block" : "none";
  }
  estadoApp.cargando = mostrar;
}

function mostrarError(mensaje) {
  console.error("Error:", mensaje);
  
  if (elementosUI.errorContainer) {
    elementosUI.errorContainer.textContent = mensaje;
    elementosUI.errorContainer.style.display = 'block';
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
      elementosUI.errorContainer.style.display = 'none';
    }, 5000);
  } else {
    alert(mensaje); // Fallback
  }
}

// Actualizar UI con datos
function actualizarUI() {
  try {
    // Actualizar información de usuario
    if (elementosUI.userIdDisplay) {
      elementosUI.userIdDisplay.textContent = estadoApp.usuario ? 
        estadoApp.usuario.uid.substring(0, 8) + "..." : "No autenticado";
    }

    // Actualizar estadísticas
    if (estadoApp.stats) {
      if (elementosUI.statTotalSolicitudes) {
        elementosUI.statTotalSolicitudes.textContent = estadoApp.stats.total || 0;
      }
      if (elementosUI.statIngresosTotales) {
        elementosUI.statIngresosTotales.textContent = `${(estadoApp.stats.ingresos || 0).toFixed(2)} €`;
      }
      if (elementosUI.statPrecioPromedio) {
        elementosUI.statPrecioPromedio.textContent = `${(estadoApp.stats.promedio || 0).toFixed(2)} €`;
      }
      if (elementosUI.statSolicitudesHoy) {
        elementosUI.statSolicitudesHoy.textContent = estadoApp.stats.solicitudesHoy || 0;
      }
      if (elementosUI.statIngresos30Dias) {
        elementosUI.statIngresos30Dias.textContent = `${(estadoApp.stats.ingresos30Dias || 0).toFixed(2)} €`;
      }
      if (elementosUI.statPromedioDiario) {
        elementosUI.statPromedioDiario.textContent = `${(estadoApp.stats.promedioDiario || 0).toFixed(2)} €`;
      }
    }

    console.log("UI actualizada exitosamente");
  } catch (error) {
    console.error("Error al actualizar UI:", error);
    mostrarError("Error al actualizar la interfaz");
  }
}

// Cargar datos iniciales
async function cargarDatosIniciales() {
  if (estadoApp.cargando) {
    console.log("Ya se están cargando datos, evitando duplicación");
    return;
  }

  mostrarCarga(true);
  console.log("Iniciando carga de datos...");
  
  try {
    // Verificar que el usuario esté autenticado
    const usuario = obtenerUsuarioActual();
    if (!usuario) {
      throw new Error("Usuario no autenticado");
    }

    console.log("Cargando datos para usuario:", usuario.uid);

    // Cargar jugadores y solicitudes en paralelo
    const [jugadores, solicitudes] = await Promise.allSettled([
      obtenerJugadores(),
      obtenerSolicitudes()
    ]);

    // Procesar resultados de jugadores
    if (jugadores.status === 'fulfilled') {
      estadoApp.jugadores = jugadores.value || [];
      console.log(`Jugadores cargados: ${estadoApp.jugadores.length}`);
    } else {
      console.error("Error cargando jugadores:", jugadores.reason);
      estadoApp.jugadores = [];
      mostrarError("Error al cargar jugadores");
    }

    // Procesar resultados de solicitudes
    if (solicitudes.status === 'fulfilled') {
      estadoApp.solicitudes = solicitudes.value || [];
      console.log(`Solicitudes cargadas: ${estadoApp.solicitudes.length}`);
    } else {
      console.error("Error cargando solicitudes:", solicitudes.reason);
      estadoApp.solicitudes = [];
      mostrarError("Error al cargar solicitudes");
    }

    // Calcular estadísticas
    if (estadoApp.solicitudes.length > 0) {
      estadoApp.stats = calcularEstadisticasAvanzadas(estadoApp.solicitudes);
      console.log("Estadísticas calculadas:", estadoApp.stats);
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

    // Actualizar UI
    actualizarUI();
    
    console.log("Datos cargados exitosamente");
  } catch (error) {
    console.error("Error en carga inicial:", error);
    mostrarError("Error al cargar datos. Verifique su conexión.");
  } finally {
    mostrarCarga(false);
  }
}

// Función para recargar datos
async function recargarDatos() {
  console.log("Recargando datos...");
  await cargarDatosIniciales();
}

// Inicialización cuando el DOM está listo
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM cargado, iniciando aplicación...");
  
  // Configurar observador de autenticación
  observarAutenticacion(async (user) => {
    if (user) {
      console.log("Usuario autenticado detectado:", user.uid);
      estadoApp.usuario = user;
      
      // Cargar datos iniciales
      await cargarDatosIniciales();
      
      // Configurar navegación por pestañas
      configurarNavegacion();
      
    } else {
      console.log("Usuario no autenticado");
      estadoApp.usuario = null;
      
      // Limpiar datos
      estadoApp.jugadores = [];
      estadoApp.solicitudes = [];
      estadoApp.stats = null;
      
      // Actualizar UI
      actualizarUI();
      
      // Redirigir a login si no estamos ya allí
      if (!window.location.pathname.includes("login.html")) {
        console.log("Redirigiendo a login...");
        window.location.href = "login.html";
      }
    }
  });
});

// Configurar navegación por pestañas
function configurarNavegacion() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const targetTab = e.target.dataset.tab;
      
      // Remover clase active de todos los botones y contenidos
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Agregar clase active al botón clickeado y su contenido
      e.target.classList.add('active');
      const targetContent = document.getElementById(targetTab);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

// Exportar funciones para uso en otros módulos
export { 
  estadoApp, 
  elementosUI, 
  cargarDatosIniciales, 
  recargarDatos, 
  actualizarUI, 
  mostrarError, 
  mostrarCarga 
};

// Modo debug para desarrollo
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.appDebug = {
    estado: estadoApp,
    ui: elementosUI,
    recargar: recargarDatos,
    cargarDatos: cargarDatosIniciales
  };
  console.log("Modo debug activado - usa window.appDebug");
}