// firebase-init.js - Versión mejorada
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getPerformance } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-performance.js";

// Configuración de Firebase (puede moverse a variables de entorno en producción)
const firebaseConfig = {
    apiKey: "AIzaSyBWRLU0AWoZtxRGSRNko3U8Rmip5Oz0h30",
    authDomain: "gestion-de-encordados.firebaseapp.com",
    projectId: "gestion-de-encordados",
    storageBucket: "gestion-de-encordados.appspot.com",
    messagingSenderId: "898210321428",
    appId: "1:898210321428:web:08162c1a38e557605dc301",
    measurementId: "G-VJG0HVKMZV"
};

// Inicialización de Firebase con manejo de errores
let app;
let analytics;
let performance;

try {
    app = initializeApp(firebaseConfig);
    
    // Solo inicializar Analytics y Performance en entorno de producción
    if (window.location.hostname !== "localhost") {
        analytics = getAnalytics(app);
        performance = getPerformance(app);
    }
    
    console.log("Firebase inicializado correctamente");
} catch (error) {
    console.error("Error al inicializar Firebase:", error);
    // Podrías mostrar un mensaje al usuario o redirigir a una página de error
}

export { app, analytics, performance };
