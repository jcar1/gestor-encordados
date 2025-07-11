// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, firestoreSettings);

// Variables globales
let jugadoresCollectionRef;
let solicitudesCollectionRef;
let userId = null;
let isAuthReady = false;
let userRole = 'user';
let lastLoginDate = null;
let loginHistory = [];
const ADMIN_EMAILS = ['jcsueca@gmail.com']; // Reemplaza con tus emails admin

// Variables para gráficos
let pagoChart = null;
let entregaChart = null;
let ingresosChart = null;
let jugadoresChart = null;

// Suscripciones
let unsubscribeJugadores = null;
let unsubscribeSolicitudes = null;
let unsubscribeJugadoresLista = null;

// Datos actuales
let currentSolicitudesData = [];
let jugadoresData = [];

// --- INICIALIZACIÓN ---
async function loadInitialData() {
    try {
        await loadJugadoresParaDropdown();
        await loadJugadoresParaFiltros();
        await loadJugadoresParaLista();
        await loadSolicitudes();
        
        // Configurar fecha actual por defecto en nueva solicitud
        document.getElementById('solicitudFechaSolicitud').valueAsDate = new Date();
        actualizarPrecioSugerido('solicitud');
    } catch (error) {
        console.error("Error cargando datos iniciales:", error);
        showModalMessage("Error al cargar datos iniciales", "error");
    }
}

// --- FUNCIÓN DE INICIALIZACIÓN ---
function initApplication() {
    loadInitialData();
    setupInactivityTimer();
    setupRollbackButton();
    
    // Verificar si es la primera carga
    
    if (!localStorage.getItem('appInitialized')) {
        showModalMessage("Bienvenido a la versión mejorada con controles de seguridad", "info");
        localStorage.setItem('appInitialized', 'true');
    }
}

// Add buttons for bulk imports
    const importContainer = document.createElement('div');
    importContainer.className = 'my-6 p-4 bg-gray-50 rounded-lg shadow';
    importContainer.innerHTML = `
        <h3 class="text-lg font-medium text-gray-800 mb-3">Importación Masiva</h3>
        <div class="flex flex-col sm:flex-row gap-4 items-start">
            <div>
                <button id="btnImportJugadoresCSV" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out">
                    <i class="fas fa-users mr-2"></i>Importar Jugadores CSV
                </button>
                <p class="mt-2 text-xs text-gray-500">Formato: Código,Nombre,Marca,Modelo,Tensión V,Tensión H,Tipo Cuerda,Cuerda Incluida</p>
            </div>
            <div>
                <button id="btnImportSolicitudesCSV" class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out">
                    <i class="fas fa-file-import mr-2"></i>Importar Solicitudes CSV
                </button>
                <p class="mt-2 text-xs text-gray-500">Formato completo como en exportación</p>
            </div>
        </div>
    `;
    
    document.getElementById('verJugadoresTab').prepend(importContainer);
    
    document.getElementById('btnImportJugadoresCSV').addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => importarCSV(event.target.result, 'jugadores');
            reader.readAsText(file);
        };
        fileInput.click();
    });
    
    document.getElementById('btnImportSolicitudesCSV').addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => importarCSV(event.target.result, 'solicitudes');
            reader.readAsText(file);
        };
        fileInput.click();
    });
// --- INICIO DE LA APLICACIÓN ---
if (localStorage.getItem('useLegacyVersion') === 'true') {
    console.warn("Cargando versión legacy por solicitud explícita");
    const script = document.createElement('script');
    script.src = 'app-legacy.js';
    document.head.appendChild(script);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        initApplication();
    });
}
