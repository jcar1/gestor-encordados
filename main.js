// main.js
import { iniciarSesion, observarAutenticacion } from "./auth.js";
import { obtenerJugadores } from "./jugadores.js";
import { obtenerSolicitudes } from "./solicitudes.js";
import { calcularEstadisticas } from "./estadisticas.js";

document.addEventListener("DOMContentLoaded", () => {
  observarAutenticacion(async (user) => {
    if (user) {
      const jugadores = await obtenerJugadores();
      const solicitudes = await obtenerSolicitudes();
      const stats = calcularEstadisticas(solicitudes);
      console.log("Jugadores:", jugadores);
      console.log("Estadísticas:", stats);
    } else {
      console.log("Usuario no autenticado");
    }
  });
});
