// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBWRLU0AWoZtxRGSRNko3U8Rmip5Oz0h30",
    authDomain: "gestion-de-encordados.firebaseapp.com",
    projectId: "gestion-de-encordados",
    storageBucket: "gestion-de-encordados.appspot.com",
    messagingSenderId: "898210321428",
    appId: "1:898210321428:web:08162c1a38e557605dc301",
    measurementId: "G-VJG0HVKMZV"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);
