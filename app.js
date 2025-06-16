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

// Credenciales fijas
const FIXED_CREDENTIALS = {
    email: "jcsueca@gmail.com",
    password: "A123456!"
};

// Importaciones de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp,
    writeBatch,
    addDoc,
    onSnapshot,
    initializeFirestore
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración mejorada de Firestore
const firestoreSettings = {
    experimentalForceLongPolling: true,
    merge: true
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, firestoreSettings);

// Referencias a colecciones
let jugadoresCollectionRef;
let solicitudesCollectionRef;
let userId = null;
let isAuthReady = false;

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

// Función de autenticación mejorada
async function authenticateUser() {
    try {
        await setPersistence(auth, browserLocalPersistence);
        const userCredential = await signInWithEmailAndPassword(
            auth, 
            FIXED_CREDENTIALS.email, 
            FIXED_CREDENTIALS.password
        );
        return userCredential.user;
    } catch (error) {
        console.error("Error de autenticación:", error);
        
        // Reintento después de 2 segundos
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
            const userCredential = await signInWithEmailAndPassword(
                auth, 
                FIXED_CREDENTIALS.email, 
                FIXED_CREDENTIALS.password
            );
            return userCredential.user;
        } catch (retryError) {
            console.error("Error en reintento de autenticación:", retryError);
            showModalMessage("Error de conexión. La aplicación funciona en modo offline.", "warning");
            return null;
        }
    }
}

// Función principal de inicialización
async function initApplication() {
    try {
        const user = await authenticateUser();
        if (user) {
            userId = user.uid;
            document.getElementById('userIdDisplay').textContent = userId;
            
            // Configurar referencias a la base de datos
            jugadoresCollectionRef = collection(db, `users/${userId}/jugadores`);
            solicitudesCollectionRef = collection(db, `users/${userId}/solicitudes`);
            
            isAuthReady = true;
            
            try {
                await loadInitialData();
                showTab('nuevaSolicitudTab');
            } catch (loadError) {
                console.error("Error cargando datos iniciales:", loadError);
                showModalMessage("Error al cargar datos iniciales", "error");
            }
        }
    } catch (error) {
        console.error("Error inicializando la aplicación:", error);
        document.getElementById('userIdDisplay').textContent = "Error de conexión";
        showModalMessage("Error al iniciar la aplicación: " + (error.message || error), "error");
    }
}

// Observador de estado de autenticación
onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid;
        document.getElementById('userIdDisplay').textContent = userId;
        console.log("Usuario autenticado con ID:", userId);
        
        if (!isAuthReady) {
            jugadoresCollectionRef = collection(db, `users/${userId}/jugadores`);
            solicitudesCollectionRef = collection(db, `users/${userId}/solicitudes`);
            isAuthReady = true;
            loadInitialData();
        }
    } else {
        console.log("Usuario no autenticado");
        document.getElementById('userIdDisplay').textContent = "No autenticado";
        authenticateUser();
    }
});

function checkAuth() {
    if (!isAuthReady) {
        showModalMessage("La aplicación no está autenticada correctamente", "error");
        return false;
    }
    return true;
}

// --- FUNCIONES DE FECHA MEJORADAS ---
function formatDateForDisplay(timestamp) {
    if (!timestamp || !timestamp.toDate) return '-';
    const date = timestamp.toDate();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function parseDateInput(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

// --- MANEJO DE PESTAÑAS ---
window.showTab = function(tabId) {
    // Ocultar todas las pestañas
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    
    // Mostrar la pestaña seleccionada
    const currentTab = document.getElementById(tabId);
    if (currentTab) currentTab.style.display = 'block';
    
    // Resaltar el botón activo
    const currentButton = document.querySelector(`.tab-button[onclick="showTab('${tabId}')"]`);
    if (currentButton) currentButton.classList.add('active');
    
    if (!isAuthReady) return;

    // Cargar datos según la pestaña
    switch(tabId) {
        case 'verSolicitudesTab': 
            loadSolicitudes();
            break;
        case 'estadisticasTab': 
            calcularYMostrarEstadisticas();
            break;
        case 'verJugadoresTab': 
            loadJugadoresParaLista();
            break;
        case 'nuevaSolicitudTab':
        default:
            loadJugadoresParaDropdown();
            break;
    }
}

// --- MODALES ---
const messageModal = document.getElementById('messageModal');
const modalMessageText = document.getElementById('modalMessageText');
const modalCloseButton = document.getElementById('modalCloseButton');
const confirmModal = document.getElementById('confirmModal');
const confirmModalText = document.getElementById('confirmModalText');
const confirmModalConfirm = document.getElementById('confirmModalConfirm');
const confirmModalCancel = document.getElementById('confirmModalCancel');
const editJugadorModal = document.getElementById('editJugadorModal');
const formEditJugador = document.getElementById('formEditJugador');
const cancelEditJugador = document.getElementById('cancelEditJugador');
const editSolicitudModal = document.getElementById('editSolicitudModal');
const formEditSolicitud = document.getElementById('formEditSolicitud');
const cancelEditSolicitud = document.getElementById('cancelEditSolicitud');

function showModalMessage(message, type = 'info') {
    modalMessageText.textContent = message;
    modalMessageText.className = 'text-lg mb-4';
    
    if (type === 'error') modalMessageText.classList.add('text-red-600');
    else if (type === 'success') modalMessageText.classList.add('text-green-600');
    else if (type === 'warning') modalMessageText.classList.add('text-yellow-600');
    
    messageModal.style.display = 'flex';
}

modalCloseButton.onclick = () => messageModal.style.display = 'none';

let confirmCallback = null;
function showConfirmModal(message, callback) {
    confirmModalText.textContent = message;
    confirmCallback = callback;
    confirmModal.style.display = 'flex';
}

confirmModalConfirm.onclick = () => {
    if (confirmCallback) confirmCallback();
    confirmModal.style.display = 'none';
};

confirmModalCancel.onclick = () => confirmModal.style.display = 'none';

window.onclick = (event) => { 
    if (event.target == messageModal) messageModal.style.display = 'none';
    if (event.target == confirmModal) confirmModal.style.display = 'none';
    if (event.target == editJugadorModal) editJugadorModal.style.display = 'none';
    if (event.target == editSolicitudModal) editSolicitudModal.style.display = 'none';
};

cancelEditJugador.onclick = () => editJugadorModal.style.display = 'none';
cancelEditSolicitud.onclick = () => editSolicitudModal.style.display = 'none';

// --- VALIDACIÓN DE FORMULARIOS ---
function validateForm(formData, requiredFields) {
    const errors = [];
    requiredFields.forEach(field => {
        if (!formData[field] || formData[field].toString().trim() === '') {
            errors.push(`El campo ${field} es obligatorio`);
        }
    });
    return errors;
}

function clearErrorMessages(formId) {
    document.querySelectorAll(`#${formId} .error-message`).forEach(el => {
        el.textContent = '';
    });
}

function showError(fieldId, message) {
    const errorElement = document.getElementById(`error-${fieldId}`);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

// --- PRECIOS SUGERIDOS ---
const PRECIO_SOLO_MANO_OBRA = 5;
const PRECIO_CON_CUERDA = 10;

function actualizarPrecioSugerido(formIdPrefix) {
    const cuerdaIncluidaCheckbox = document.getElementById(`${formIdPrefix}CuerdaIncluida`);
    const precioInput = document.getElementById(`${formIdPrefix}Precio`);
    if (cuerdaIncluidaCheckbox && precioInput) {
        if (cuerdaIncluidaCheckbox.checked) {
            precioInput.value = PRECIO_CON_CUERDA;
        } else {
            precioInput.value = PRECIO_SOLO_MANO_OBRA;
        }
    }
}

document.getElementById('solicitudCuerdaIncluida').addEventListener('change', () => actualizarPrecioSugerido('solicitud'));
document.getElementById('editSolicitudCuerdaIncluida').addEventListener('change', () => actualizarPrecioSugerido('editSolicitud'));

// --- AUTOCOMPLETADO DE JUGADORES ---
function setupAutocomplete() {
    const input = document.getElementById('solicitudJugadorNombre');
    const hiddenInput = document.getElementById('solicitudJugadorId');
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.className = 'autocomplete-items';
    input.parentNode.appendChild(autocompleteContainer);

    input.addEventListener('input', function() {
        const val = this.value.trim().toLowerCase();
        autocompleteContainer.innerHTML = '';
        
        if (val.length < 2) {
            hiddenInput.value = '';
            return;
        }

        const matches = jugadoresData.filter(jugador => 
            jugador.nombreCompleto.toLowerCase().includes(val) || 
            jugador.codigo.toLowerCase().includes(val)
        ).slice(0, 5);

        if (matches.length === 0) {
            const noResults = document.createElement('div');
            noResults.textContent = 'No se encontraron jugadores';
            autocompleteContainer.appendChild(noResults);
            return;
        }

        matches.forEach(jugador => {
            const item = document.createElement('div');
            item.innerHTML = `<strong>${jugador.codigo}</strong> - ${jugador.nombreCompleto}`;
            item.addEventListener('click', function() {
                input.value = jugador.nombreCompleto;
                hiddenInput.value = jugador.id;
                autocompleteContainer.innerHTML = '';
                
                // Autocompletar datos de raqueta
                document.getElementById('solicitudMarcaRaqueta').value = jugador.marcaRaqueta || '';
                document.getElementById('solicitudModeloRaqueta').value = jugador.modeloRaqueta || '';
                document.getElementById('solicitudTensionVertical').value = jugador.tensionVertical || '';
                document.getElementById('solicitudTensionHorizontal').value = jugador.tensionHorizontal || '';
                document.getElementById('solicitudTipoCuerda').value = jugador.tipoCuerda || '';
            });
            autocompleteContainer.appendChild(item);
        });
    });

    document.addEventListener('click', function(e) {
        if (e.target !== input) {
            autocompleteContainer.innerHTML = '';
        }
    });
}

// --- GESTIÓN DE JUGADORES ---
function loadJugadoresParaDropdown() {
    if (!checkAuth() || !jugadoresCollectionRef) return;

    getDocs(query(jugadoresCollectionRef, orderBy("nombreCompleto"))).then(snapshot => {
        jugadoresData = [];
        snapshot.forEach(doc => {
            jugadoresData.push({ id: doc.id, ...doc.data() });
        });

        // Activar autocompletado luego de tener los datos cargados
        setupAutocomplete();
    }).catch(error => {
        console.error("Error cargando jugadores para dropdown:", error);
        showModalMessage("Error al cargar jugadores", "error");
    });
}

function loadJugadoresParaFiltros() {
    if (!isAuthReady || !jugadoresCollectionRef) return;
    
    const filtroJugador = document.getElementById('filtroJugador');
    if (!filtroJugador) return;
    
    // Limpiar opciones excepto la primera
    while (filtroJugador.options.length > 1) {
        filtroJugador.remove(1);
    }
    
    getDocs(query(jugadoresCollectionRef, orderBy("nombreCompleto"))).then(snapshot => {
        snapshot.forEach(doc => {
            const jugador = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${jugador.codigo} - ${jugador.nombreCompleto}`;
            filtroJugador.appendChild(option);
        });
    }).catch(error => {
        console.error("Error cargando jugadores para filtros:", error);
    });
}

const formRegistrarJugador = document.getElementById('formRegistrarJugador');
formRegistrarJugador.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAuthReady) {
        showModalMessage("La base de datos no está lista", "error");
        return;
    }

    clearErrorMessages('formRegistrarJugador');

    const formData = {
        codigo: formRegistrarJugador.jugadorCodigo.value.trim(),
        nombreCompleto: formRegistrarJugador.jugadorNombreCompleto.value.trim(),
        telefono: formRegistrarJugador.jugadorTelefono.value.trim(),
        email: formRegistrarJugador.jugadorEmail.value.trim(),
        marcaRaqueta: formRegistrarJugador.jugadorMarcaRaqueta.value.trim(),
        modeloRaqueta: formRegistrarJugador.jugadorModeloRaqueta.value.trim(),
        tensionVertical: parseFloat(formRegistrarJugador.jugadorTensionVertical.value) || null,
        tensionHorizontal: parseFloat(formRegistrarJugador.jugadorTensionHorizontal.value) || null,
        tipoCuerda: formRegistrarJugador.jugadorTipoCuerda.value.trim()
    };

    // Validaciones
    const errors = validateForm(formData, ['codigo', 'nombreCompleto']);
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.push("El email no tiene un formato válido");
        showError('email', "El email no tiene un formato válido");
    }

    // Verificar si el código ya existe
    const codigoExists = jugadoresData.some(j => j.codigo === formData.codigo && j.id !== formRegistrarJugador.jugadorId?.value);
    if (codigoExists) {
        errors.push("El código de jugador ya existe");
        showError('codigo', "Este código ya está en uso");
    }

    // Verificar si el nombre ya existe
    const nombreExists = jugadoresData.some(j => j.nombreCompleto.toLowerCase() === formData.nombreCompleto.toLowerCase() && j.id !== formRegistrarJugador.jugadorId?.value);
    if (nombreExists) {
        errors.push("El nombre de jugador ya existe");
        showError('nombreCompleto', "Este nombre ya está registrado");
    }

    if (errors.length > 0) {
        showModalMessage(errors.join("<br>"), "error");
        return;
    }

    try {
        await addDoc(jugadoresCollectionRef, {
            ...formData,
            fechaRegistro: Timestamp.now()
        });
        showModalMessage("Jugador registrado correctamente", "success");
        formRegistrarJugador.reset();
    } catch (error) {
        console.error("Error registrando jugador:", error);
        showModalMessage("Error al registrar jugador", "error");
    }
});

function loadJugadoresParaLista() {
    if (!isAuthReady || !jugadoresCollectionRef) return;
    
    const listaJugadoresBody = document.getElementById('listaJugadores');
    if (!listaJugadoresBody) return;
    
    listaJugadoresBody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-gray-500">Cargando jugadores...</td></tr>';
    
    if (unsubscribeJugadoresLista) unsubscribeJugadoresLista();
    
    unsubscribeJugadoresLista = onSnapshot(
        query(jugadoresCollectionRef, orderBy("nombreCompleto")), 
        (snapshot) => {
            jugadoresData = [];
            
            if (snapshot.empty) {
                listaJugadoresBody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-gray-500">No hay jugadores registrados.</td></tr>';
                return;
            }
            
            listaJugadoresBody.innerHTML = '';
            
            snapshot.forEach(docSnap => {
                const jugador = { id: docSnap.id, ...docSnap.data() };
                jugadoresData.push(jugador);
                const tr = document.createElement('tr');
                tr.className = "hover:bg-gray-50 transition-colors duration-150";
                
                tr.innerHTML = `
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-700">${jugador.codigo}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-700">
                        ${jugador.nombreCompleto}
                        <span class="block text-xs text-gray-500">${jugador.telefono || 'Sin teléfono'}</span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${jugador.email || '-'}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <div class="flex items-center">
                            ${jugador.marcaRaqueta || '-'} 
                            ${jugador.modeloRaqueta ? `<span class="ml-1 text-xs">(${jugador.modeloRaqueta})</span>` : ''}
                        </div>
                        ${jugador.tensionVertical ? 
                            `<span class="text-xs bg-gray-100 px-2 py-1 rounded">${jugador.tensionVertical}/${jugador.tensionHorizontal || '?'} lbs</span>` : ''}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${formatDateForDisplay(jugador.fechaRegistro)}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <button onclick="openEditJugadorModal('${jugador.id}')" class="text-blue-600 hover:text-blue-900 mr-3 transition-colors duration-150">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="confirmDeleteJugador('${jugador.id}', '${jugador.nombreCompleto.replace(/'/g, "\\'")}')" class="text-red-600 hover:text-red-900 transition-colors duration-150">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                `;
                
                listaJugadoresBody.appendChild(tr);
            });
        }, 
        error => {
            console.error("Error cargando lista de jugadores:", error);
            listaJugadoresBody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-red-500">Error al cargar jugadores.</td></tr>';
        }
    );
}

window.openEditJugadorModal = async (jugadorId) => {
    if (!isAuthReady) return;
    
    try {
        const jugadorDocRef = doc(jugadoresCollectionRef, jugadorId);
        const docSnap = await getDoc(jugadorDocRef);
        
        if (docSnap.exists()) {
            const jugador = docSnap.data();
            
            formEditJugador.editJugadorId.value = jugadorId;
            formEditJugador.editJugadorCodigo.value = jugador.codigo;
            formEditJugador.editJugadorNombreCompleto.value = jugador.nombreCompleto;
            formEditJugador.editJugadorTelefono.value = jugador.telefono || '';
            formEditJugador.editJugadorEmail.value = jugador.email || '';
            formEditJugador.editJugadorMarcaRaqueta.value = jugador.marcaRaqueta || '';
            formEditJugador.editJugadorModeloRaqueta.value = jugador.modeloRaqueta || '';
            formEditJugador.editJugadorTensionVertical.value = jugador.tensionVertical || '';
            formEditJugador.editJugadorTensionHorizontal.value = jugador.tensionHorizontal || '';
            formEditJugador.editJugadorTipoCuerda.value = jugador.tipoCuerda || '';
            
            editJugadorModal.style.display = 'flex';
        } else {
            showModalMessage("Jugador no encontrado.", "error");
        }
    } catch (error) {
        showModalMessage(`Error al cargar jugador: ${error.message}`, "error");
    }
};

formEditJugador.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAuthReady) return;
    
    clearErrorMessages('formEditJugador');

    const jugadorId = formEditJugador.editJugadorId.value;
    const codigo = formEditJugador.editJugadorCodigo.value.trim();
    const nombreCompleto = formEditJugador.editJugadorNombreCompleto.value.trim();
    const email = formEditJugador.editJugadorEmail.value.trim();
    
    // Validaciones
    if (!codigo) {
        showError('editCodigo', "El código de jugador es obligatorio");
        return;
    }
    
    if (!nombreCompleto) {
        showError('editNombreCompleto', "El nombre completo es obligatorio");
        return;
    }
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('editEmail', "El email no tiene un formato válido");
        return;
    }

    // Verificar si el código ya existe (excluyendo el jugador actual)
    const codigoExists = jugadoresData.some(j => j.codigo === codigo && j.id !== jugadorId);
    if (codigoExists) {
        showError('editCodigo', "Este código ya está en uso");
        return;
    }

    // Verificar si el nombre ya existe (excluyendo el jugador actual)
    const nombreExists = jugadoresData.some(j => j.nombreCompleto.toLowerCase() === nombreCompleto.toLowerCase() && j.id !== jugadorId);
    if (nombreExists) {
        showError('editNombreCompleto', "Este nombre ya está registrado");
        return;
    }

    try {
        const jugadorDocRef = doc(jugadoresCollectionRef, jugadorId);
        
        await updateDoc(jugadorDocRef, {
            codigo,
            nombreCompleto,
            telefono: formEditJugador.editJugadorTelefono.value.trim(),
            email,
            marcaRaqueta: formEditJugador.editJugadorMarcaRaqueta.value.trim(),
            modeloRaqueta: formEditJugador.editJugadorModeloRaqueta.value.trim(),
            tensionVertical: parseFloat(formEditJugador.editJugadorTensionVertical.value) || null,
            tensionHorizontal: parseFloat(formEditJugador.editJugadorTensionHorizontal.value) || null,
            tipoCuerda: formEditJugador.editJugadorTipoCuerda.value.trim(),
            fechaUltimaActualizacion: Timestamp.now()
        });
        
        showModalMessage("Jugador actualizado correctamente.", "success");
        editJugadorModal.style.display = 'none';
        loadJugadoresParaFiltros(); // Actualizar filtros después de editar
    } catch (error) {
        showModalMessage(`Error al actualizar jugador: ${error.message}`, "error");
    }
});

window.confirmDeleteJugador = (jugadorId, nombreJugador) => {
    const nombreDecodificado = nombreJugador.replace(/\\'/g, "'");
    
    showConfirmModal(
        `¿Está seguro de que desea eliminar al jugador "${nombreDecodificado}"? Esta acción no se puede deshacer.`, 
        async () => {
            if (!isAuthReady) return;
            
            try {
                // Verificar si el jugador tiene solicitudes asociadas
                const q = query(solicitudesCollectionRef, where("jugadorId", "==", jugadorId));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    showModalMessage("No se puede eliminar el jugador porque tiene solicitudes asociadas.", "error");
                    return;
                }
                
                await deleteDoc(doc(jugadoresCollectionRef, jugadorId));
                showModalMessage(`Jugador "${nombreDecodificado}" eliminado correctamente.`, "success");
                loadJugadoresParaFiltros(); // Actualizar filtros después de eliminar
            } catch (error) {
                showModalMessage(`Error al eliminar jugador: ${error.message}`, "error");
            }
        }
    );
};

// --- GESTIÓN DE SOLICITUDES DE ENCORDADO ---
const formNuevaSolicitud = document.getElementById('formNuevaSolicitud');
formNuevaSolicitud.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const jugadorId = formNuevaSolicitud.jugadorId.value;
    const jugadorNombre = formNuevaSolicitud.jugadorNombre.value.trim();

    if (!jugadorId || !jugadorNombre) {
        showError('jugadorId', "Debe seleccionar un jugador válido");
        return;
    }

    const formData = {
        jugadorId,
        nombreJugador: jugadorNombre,
        marcaRaqueta: formNuevaSolicitud.marcaRaqueta.value.trim(),
        modeloRaqueta: formNuevaSolicitud.modeloRaqueta.value.trim(),
        tensionVertical: parseFloat(formNuevaSolicitud.tensionVertical.value),
        tensionHorizontal: parseFloat(formNuevaSolicitud.tensionHorizontal.value),
        tipoCuerda: formNuevaSolicitud.tipoCuerda.value.trim(),
        cuerdaIncluida: formNuevaSolicitud.cuerdaIncluida.checked,
        fechaSolicitud: parseDateInput(formNuevaSolicitud.fechaSolicitud.value),
        fechaEntregaEstimada: parseDateInput(formNuevaSolicitud.fechaEntregaEstimada.value),
        precio: parseFloat(formNuevaSolicitud.precio.value) || 0,
        estadoPago: formNuevaSolicitud.estadoPago.value,
        estadoEntrega: "Pendiente",
        notas: formNuevaSolicitud.notas.value.trim(),
        fechaPago: null // No hay fecha de pago inicialmente
    };

    // Validaciones
    const errors = validateForm(formData, [
        'marcaRaqueta', 'tensionVertical', 'tensionHorizontal', 
        'fechaSolicitud', 'estadoPago'
    ]);

    if (isNaN(formData.tensionVertical)) {
        errors.push("La tensión vertical debe ser un número válido");
        showError('tensionVertical', "Debe ser un número válido");
    }

    if (isNaN(formData.tensionHorizontal)) {
        errors.push("La tensión horizontal debe ser un número válido");
        showError('tensionHorizontal', "Debe ser un número válido");
    }

    if (!formData.fechaSolicitud) {
        errors.push("La fecha de solicitud no es válida");
        showError('fechaSolicitud', "Fecha no válida");
    }

    if (errors.length > 0) {
        showModalMessage(errors.join("<br>"), "error");
        return;
    }

    try {
        await addDoc(solicitudesCollectionRef, {
            ...formData,
            fechaSolicitud: Timestamp.fromDate(formData.fechaSolicitud),
            fechaEntregaEstimada: formData.fechaEntregaEstimada ? Timestamp.fromDate(formData.fechaEntregaEstimada) : null,
            fechaCreacion: Timestamp.now(),
            fechaUltimaActualizacion: Timestamp.now()
        });
        
        showModalMessage("Solicitud registrada correctamente", "success");
        formNuevaSolicitud.reset();
        // Restablecer fecha actual
        document.getElementById('solicitudFechaSolicitud').valueAsDate = new Date();
        actualizarPrecioSugerido('solicitud');
        // Limpiar autocompletado
        document.getElementById('solicitudJugadorNombre').value = '';
        document.getElementById('solicitudJugadorId').value = '';
    } catch (error) {
        console.error("Error registrando solicitud:", error);
        showModalMessage("Error al registrar solicitud", "error");
    }
});

function loadSolicitudes() {
    if (!isAuthReady || !solicitudesCollectionRef) return;
    
    const listaSolicitudesBody = document.getElementById('listaSolicitudes');
    if (!listaSolicitudesBody) return;
    
    listaSolicitudesBody.innerHTML = '<tr><td colspan="10" class="text-center p-4 text-gray-500">Cargando solicitudes...</td></tr>';
    
    let conditions = [];
    
    // Aplicar filtros
    const filtroJugadorVal = document.getElementById('filtroJugador').value;
    const filtroEstadoPagoVal = document.getElementById('filtroEstadoPago').value;
    const filtroEstadoEntregaVal = document.getElementById('filtroEstadoEntrega').value;
    const filtroFechaDesdeVal = document.getElementById('filtroFechaSolicitudDesde').value;
    const filtroFechaHastaVal = document.getElementById('filtroFechaSolicitudHasta').value;
    const filtroFechaPagoDesdeVal = document.getElementById('filtroFechaPagoDesde').value;
    const filtroFechaPagoHastaVal = document.getElementById('filtroFechaPagoHasta').value;

    // Filtro por jugador - CORRECCIÓN PRINCIPAL
    if (filtroJugadorVal) {
        conditions.push(where("jugadorId", "==", filtroJugadorVal));
    }
    
    if (filtroEstadoPagoVal) conditions.push(where("estadoPago", "==", filtroEstadoPagoVal));
    if (filtroEstadoEntregaVal) conditions.push(where("estadoEntrega", "==", filtroEstadoEntregaVal));
    
    if (filtroFechaDesdeVal) {
        conditions.push(where("fechaSolicitud", ">=", Timestamp.fromDate(new Date(filtroFechaDesdeVal))));
    }
    
    if (filtroFechaHastaVal) {
        const hastaDate = new Date(filtroFechaHastaVal);
        hastaDate.setDate(hastaDate.getDate() + 1);
        conditions.push(where("fechaSolicitud", "<", Timestamp.fromDate(hastaDate)));
    }
    
    if (filtroFechaPagoDesdeVal) {
        conditions.push(where("fechaPago", ">=", Timestamp.fromDate(new Date(filtroFechaPagoDesdeVal))));
    }
    
    if (filtroFechaPagoHastaVal) {
        const hastaDate = new Date(filtroFechaPagoHastaVal);
        hastaDate.setDate(hastaDate.getDate() + 1);
        conditions.push(where("fechaPago", "<", Timestamp.fromDate(hastaDate)));
    }
    
    // Crear consulta
    let q;
    if (conditions.length > 0) {
        q = query(
            solicitudesCollectionRef, 
            ...conditions, 
            orderBy("fechaSolicitud", "desc")
        );
    } else {
        q = query(
            solicitudesCollectionRef, 
            orderBy("fechaSolicitud", "desc")
        );
    }

    if (unsubscribeSolicitudes) unsubscribeSolicitudes();
    
    unsubscribeSolicitudes = onSnapshot(q, 
        (snapshot) => {
            currentSolicitudesData = [];
            
            if (snapshot.empty) {
                listaSolicitudesBody.innerHTML = '<tr><td colspan="10" class="text-center p-4 text-gray-500">No hay solicitudes que coincidan con los filtros.</td></tr>';
                actualizarResumenSolicitudes();
                calcularYMostrarEstadisticas();
                return;
            }
            
            listaSolicitudesBody.innerHTML = '';
            
            snapshot.forEach(docSnap => {
                const solicitud = { id: docSnap.id, ...docSnap.data() };
                currentSolicitudesData.push(solicitud);
                
                const tr = document.createElement('tr');
                tr.className = "hover:bg-gray-50 transition-colors duration-150";
                
                const pagoClass = solicitud.estadoPago === 'Pagado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
                
                let entregaClass = 'bg-gray-100 text-gray-800';
                switch(solicitud.estadoEntrega) {
                    case 'Pendiente': entregaClass = 'bg-red-100 text-red-800'; break;
                    case 'En Proceso': entregaClass = 'bg-blue-100 text-blue-800'; break;
                    case 'Listo para Recoger': entregaClass = 'bg-purple-100 text-purple-800'; break;
                    case 'Entregado': entregaClass = 'bg-green-100 text-green-800'; break;
                    case 'Cancelado': entregaClass = 'bg-gray-400 text-white'; break;
                }
                
                // Mostrar indicador de pago si tiene fecha de pago
                const pagoIndicator = solicitud.fechaPago ? '<span class="paid-indicator"></span>' : '';
                
                tr.innerHTML = `
                    <td class="px-4 py-3 whitespace-nowrap">
                        <input type="checkbox" class="solicitud-checkbox form-checkbox h-4 w-4" value="${solicitud.id}">
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${solicitud.nombreJugador || solicitud.jugadorId}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${solicitud.marcaRaqueta} ${solicitud.modeloRaqueta || ''}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${solicitud.tensionVertical || 'N/A'} / ${solicitud.tensionHorizontal || 'N/A'}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${formatDateForDisplay(solicitud.fechaSolicitud)}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${formatDateForDisplay(solicitud.fechaEntregaEstimada)}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${solicitud.precio != null ? solicitud.precio.toFixed(2) + '€' : '-'}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pagoClass}">${pagoIndicator}${solicitud.estadoPago}</span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${entregaClass}">${solicitud.estadoEntrega}</span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <button onclick="openEditSolicitudModal('${solicitud.id}')" class="text-blue-600 hover:text-blue-900 mr-3 transition-colors duration-150">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="confirmDeleteSolicitud('${solicitud.id}')" class="text-red-600 hover:text-red-900 transition-colors duration-150">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                `;
                
                listaSolicitudesBody.appendChild(tr);
            });
            
            // Manejar el evento de seleccionar todos
            document.getElementById('selectAllSolicitudes').addEventListener('change', function() {
                const checkboxes = document.querySelectorAll('.solicitud-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = this.checked;
                });
            });

            // Manejar cuando se deselecciona un checkbox individual
            listaSolicitudesBody.addEventListener('change', (e) => {
                if (e.target.classList.contains('solicitud-checkbox')) {
                    const allChecked = document.querySelectorAll('.solicitud-checkbox:checked').length;
                    const totalCheckboxes = document.querySelectorAll('.solicitud-checkbox').length;
                    document.getElementById('selectAllSolicitudes').checked = allChecked === totalCheckboxes && totalCheckboxes > 0;
                }
            });
            
            actualizarResumenSolicitudes();
            calcularYMostrarEstadisticas();
        }, 
        (error) => {
            console.error("Error cargando solicitudes:", error);
            currentSolicitudesData = [];
            listaSolicitudesBody.innerHTML = `<tr><td colspan="10" class="text-center p-4 text-red-500">Error al cargar: ${error.message}</td></tr>`;
            
            if (error.code === 'failed-precondition') {
                showModalMessage("Error: Puede necesitar crear un índice compuesto en Firestore para esta consulta.", "error");
            }
            
            actualizarResumenSolicitudes();
            calcularYMostrarEstadisticas();
        }
    );
}

function actualizarResumenSolicitudes() {
    const totalSolicitudes = currentSolicitudesData.length;
    const solicitudesPagadas = currentSolicitudesData.filter(s => s.estadoPago === 'Pagado').length;
    const solicitudesPendientes = totalSolicitudes - solicitudesPagadas;
    
    // Calcular totales monetarios
    const totalPagado = currentSolicitudesData
        .filter(s => s.estadoPago === 'Pagado')
        .reduce((sum, s) => sum + (s.precio || 0), 0);
    
    const totalPendiente = currentSolicitudesData
        .filter(s => s.estadoPago !== 'Pagado')
        .reduce((sum, s) => sum + (s.precio || 0), 0);
    
    const totalGeneral = currentSolicitudesData
        .reduce((sum, s) => sum + (s.precio || 0), 0);
    
    document.getElementById('resumenTotalSolicitudes').textContent = totalSolicitudes;
    document.getElementById('resumenSolicitudesPagadas').textContent = `${solicitudesPagadas} (${totalPagado.toFixed(2)}€)`;
    document.getElementById('resumenSolicitudesPendientes').textContent = `${solicitudesPendientes} (${totalPendiente.toFixed(2)}€)`;
    document.getElementById('resumenTotalIngresos').textContent = totalGeneral.toFixed(2) + '€';
}

window.openEditSolicitudModal = async (solicitudId) => {
    if (!isAuthReady) return;
    
    try {
        const solicitudDocRef = doc(solicitudesCollectionRef, solicitudId);
        const docSnap = await getDoc(solicitudDocRef);
        
        if (docSnap.exists()) {
            const s = docSnap.data();
            
            formEditSolicitud.editSolicitudId.value = solicitudId;
            document.getElementById('editSolicitudJugadorIdDisplay').value = s.nombreJugador || s.jugadorId;
            formEditSolicitud.editSolicitudMarcaRaqueta.value = s.marcaRaqueta || '';
            formEditSolicitud.editSolicitudModeloRaqueta.value = s.modeloRaqueta || '';
            formEditSolicitud.editSolicitudTensionVertical.value = s.tensionVertical || '';
            formEditSolicitud.editSolicitudTensionHorizontal.value = s.tensionHorizontal || '';
            formEditSolicitud.editSolicitudTipoCuerda.value = s.tipoCuerda || '';
            formEditSolicitud.editSolicitudCuerdaIncluida.checked = s.cuerdaIncluida || false;
            
            formEditSolicitud.editSolicitudFechaSolicitud.value = s.fechaSolicitud ? 
                new Date(s.fechaSolicitud.toDate()).toISOString().split('T')[0] : '';
            
            formEditSolicitud.editSolicitudFechaEntregaEstimada.value = s.fechaEntregaEstimada ? 
                new Date(s.fechaEntregaEstimada.toDate()).toISOString().split('T')[0] : '';
            
            formEditSolicitud.editSolicitudPrecio.value = s.precio != null ? s.precio : '';
            formEditSolicitud.editSolicitudEstadoPago.value = s.estadoPago;
            formEditSolicitud.editSolicitudEstadoEntrega.value = s.estadoEntrega;
            formEditSolicitud.editSolicitudNotas.value = s.notas || '';
            
            // Manejar fecha de pago
            if (s.fechaPago) {
                formEditSolicitud.editSolicitudFechaPago.value = new Date(s.fechaPago.toDate()).toISOString().split('T')[0];
            } else {
                formEditSolicitud.editSolicitudFechaPago.value = '';
            }
            
            editSolicitudModal.style.display = 'flex';
        } else {
            showModalMessage("Solicitud no encontrada.", "error");
        }
    } catch (error) {
        showModalMessage(`Error al cargar solicitud: ${error.message}`, "error");
    }
};

formEditSolicitud.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAuthReady) return;
    
    clearErrorMessages('formEditSolicitud');

    const solicitudId = formEditSolicitud.editSolicitudId.value;
    
    const formData = {
        marcaRaqueta: formEditSolicitud.editSolicitudMarcaRaqueta.value.trim(),
        modeloRaqueta: formEditSolicitud.editSolicitudModeloRaqueta.value.trim(),
        tensionVertical: parseFloat(formEditSolicitud.editSolicitudTensionVertical.value),
        tensionHorizontal: parseFloat(formEditSolicitud.editSolicitudTensionHorizontal.value),
        tipoCuerda: formEditSolicitud.editSolicitudTipoCuerda.value.trim(),
        cuerdaIncluida: formEditSolicitud.editSolicitudCuerdaIncluida.checked,
        fechaSolicitud: parseDateInput(formEditSolicitud.editSolicitudFechaSolicitud.value),
        fechaEntregaEstimada: parseDateInput(formEditSolicitud.editSolicitudFechaEntregaEstimada.value),
        precio: formEditSolicitud.editSolicitudPrecio.value ? parseFloat(formEditSolicitud.editSolicitudPrecio.value) : null,
        estadoPago: formEditSolicitud.editSolicitudEstadoPago.value,
        estadoEntrega: formEditSolicitud.editSolicitudEstadoEntrega.value,
        notas: formEditSolicitud.editSolicitudNotas.value.trim(),
        fechaPago: parseDateInput(formEditSolicitud.editSolicitudFechaPago.value)
    };

    // Validaciones
    const errors = validateForm(formData, [
        'marcaRaqueta', 'tensionVertical', 'tensionHorizontal', 
        'fechaSolicitud', 'estadoPago', 'estadoEntrega'
    ]);

    if (isNaN(formData.tensionVertical)) {
        errors.push("La tensión vertical debe ser un número válido");
        showError('editTensionVertical', "Debe ser un número válido");
    }

    if (isNaN(formData.tensionHorizontal)) {
        errors.push("La tensión horizontal debe ser un número válido");
        showError('editTensionHorizontal', "Debe ser un número válido");
    }

    if (!formData.fechaSolicitud) {
        errors.push("La fecha de solicitud no es válida");
        showError('editFechaSolicitud', "Fecha no válida");
    }

    // Validar que si hay fecha de pago, el estado sea Pagado
    if (formData.fechaPago && formData.estadoPago !== 'Pagado') {
        errors.push("Si hay fecha de pago, el estado debe ser 'Pagado'");
        showError('editEstadoPago', "Debe ser 'Pagado' si hay fecha de pago");
    }

    // Validar que si no hay fecha de pago pero el estado es Pagado, establecer fecha actual
    if (!formData.fechaPago && formData.estadoPago === 'Pagado') {
        formData.fechaPago = new Date();
    }

    // Validar que la fecha de pago no sea anterior a la fecha de solicitud
    if (formData.fechaPago && formData.fechaSolicitud && formData.fechaPago < formData.fechaSolicitud) {
        errors.push("La fecha de pago no puede ser anterior a la fecha de solicitud");
        showError('editFechaPago', "No puede ser anterior a la fecha de solicitud");
    }

    if (errors.length > 0) {
        showModalMessage(errors.join("<br>"), "error");
        return;
    }

    try {
        const solicitudDocRef = doc(solicitudesCollectionRef, solicitudId);
        
        await updateDoc(solicitudDocRef, {
            ...formData,
            fechaSolicitud: Timestamp.fromDate(formData.fechaSolicitud),
            fechaEntregaEstimada: formData.fechaEntregaEstimada ? Timestamp.fromDate(formData.fechaEntregaEstimada) : null,
            fechaPago: formData.fechaPago ? Timestamp.fromDate(formData.fechaPago) : null,
            fechaUltimaActualizacion: Timestamp.now()
        });
        
        showModalMessage("Solicitud actualizada correctamente.", "success");
        editSolicitudModal.style.display = 'none';
    } catch (error) {
        showModalMessage(`Error al actualizar solicitud: ${error.message}`, "error");
    }
});

window.confirmDeleteSolicitud = (solicitudId) => {
    showConfirmModal(
        "¿Está seguro de que desea eliminar esta solicitud de encordado? Esta acción no se puede deshacer.", 
        async () => {
            if (!isAuthReady) return;
            
            try {
                await deleteDoc(doc(solicitudesCollectionRef, solicitudId));
                showModalMessage("Solicitud eliminada correctamente.", "success");
            } catch (error) {
                showModalMessage(`Error al eliminar solicitud: ${error.message}`, "error");
            }
        }
    );
};

// --- FUNCIONALIDAD PARA SELECCIONAR Y ELIMINAR MULTIPLES SOLICITUDES ---
document.getElementById('selectAllSolicitudes').addEventListener('change', function() {
    const checkboxes = document.querySelectorAll('.solicitud-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = this.checked;
    });
});

document.getElementById('btnDeleteSelected').addEventListener('click', function() {
    const selectedIds = Array.from(document.querySelectorAll('.solicitud-checkbox:checked')).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        showModalMessage("Por favor seleccione al menos una solicitud para eliminar.", "warning");
        return;
    }
    
    showConfirmModal(
        `¿Está seguro de que desea eliminar las ${selectedIds.length} solicitudes seleccionadas? Esta acción no se puede deshacer.`, 
        async () => {
            if (!isAuthReady) return;
            
            try {
                const batch = writeBatch(db);
                
                selectedIds.forEach(id => {
                    const docRef = doc(solicitudesCollectionRef, id);
                    batch.delete(docRef);
                });
                
                await batch.commit();
                showModalMessage(`${selectedIds.length} solicitudes eliminadas correctamente.`, "success");
                
                // Desmarcar "Seleccionar todos" después de eliminar
                document.getElementById('selectAllSolicitudes').checked = false;
            } catch (error) {
                showModalMessage(`Error al eliminar solicitudes: ${error.message}`, "error");
            }
        }
    );
});

// --- FUNCIONALIDAD PARA EXPORTAR CSV ---
function escapeCsvCell(cellData) {
    if (cellData == null) return '';
    const stringData = String(cellData);
    if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n') || stringData.includes('\r')) {
        return `"${stringData.replace(/"/g, '""')}"`;
    }
    return stringData;
}

btnExportCsv.addEventListener('click', async () => {
    if (!isAuthReady || currentSolicitudesData.length === 0) {
        showModalMessage("No hay datos de solicitudes para exportar o no está autenticado.", "warning");
        return;
    }

    // Obtener información de jugadores para mapear IDs a códigos
    const jugadoresMap = {};
    try {
        const jugadoresSnapshot = await getDocs(jugadoresCollectionRef);
        jugadoresSnapshot.forEach(doc => {
            jugadoresMap[doc.id] = doc.data().codigo;
        });
    } catch (error) {
        console.error("Error obteniendo datos de jugadores:", error);
        showModalMessage("Error al obtener datos de jugadores para exportación", "error");
        return;
    }

    const headers = [
        "Código Jugador", "Nombre Jugador", "Marca Raqueta", "Modelo Raqueta",
        "Tensión Vertical", "Tensión Horizontal", "Tipo Cuerda", "Cuerda Incluida",
        "Fecha Solicitud", "Fecha Entrega Estimada", "Precio", "Estado Pago",
        "Estado Entrega", "Notas", "Fecha Pago"
    ];

    let csvContent = headers.map(escapeCsvCell).join(",") + "\r\n";

    currentSolicitudesData.forEach(solicitud => {
        const codigoJugador = jugadoresMap[solicitud.jugadorId] || solicitud.jugadorId;

        const row = [
            codigoJugador,
            solicitud.nombreJugador,
            solicitud.marcaRaqueta,
            solicitud.modeloRaqueta,
            solicitud.tensionVertical,
            solicitud.tensionHorizontal,
            solicitud.tipoCuerda,
            solicitud.cuerdaIncluida ? "Sí" : "No",
            formatDateForDisplay(solicitud.fechaSolicitud),
            formatDateForDisplay(solicitud.fechaEntregaEstimada),
            solicitud.precio,
            solicitud.estadoPago,
            solicitud.estadoEntrega,
            solicitud.notas,
            formatDateForDisplay(solicitud.fechaPago)
        ];

        csvContent += row.map(escapeCsvCell).join(",") + "\r\n";
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Crear enlace de descarga
    const a = document.createElement('a');
    a.href = url;
    a.download = `solicitudes_encordado_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    
    // Limpiar
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);

    showModalMessage("Datos exportados a CSV correctamente.", "success");
});

// --- FUNCIONALIDAD PARA IMPORTAR CSV ---
btnImportCsv.addEventListener('click', async () => {
    if (!isAuthReady || !solicitudesCollectionRef) {
        showModalMessage("La base de datos no está lista o no está autenticado.", "error"); 
        return;
    }
    
    if (!importFile.files || importFile.files.length === 0) {
        showModalMessage("Por favor, seleccione un archivo CSV para importar.", "warning");
        return;
    }
    
    const file = importFile.files[0];
    const reader = new FileReader();
    
    reader.onload = async (event) => {
        try {
            const csvData = event.target.result;
            const lines = csvData.split(/\r\n|\n/).filter(line => line.trim() !== '');
            
            if (lines.length < 2) {
                showModalMessage("El archivo CSV está vacío o no tiene datos.", "error");
                return;
            }
            
            // Definir encabezados esperados
            const expectedHeaders = [
                "Código Jugador", "Nombre Jugador", "Marca Raqueta", "Modelo Raqueta",
                "Tensión Vertical", "Tensión Horizontal", "Tipo Cuerda", "Cuerda Incluida",
                "Fecha Solicitud", "Fecha Entrega Estimada", "Precio", "Estado Pago",
                "Estado Entrega", "Notas", "Fecha Pago"
            ];
            
            // Procesar encabezados del CSV
            const actualHeaders = lines[0].split(',')
                .map(h => h.trim().replace(/"/g, ''));
            
            // Verificar que todos los encabezados esperados estén presentes
            const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));
            
            if (missingHeaders.length > 0) {
                showModalMessage(`Error: Faltan columnas en CSV: ${missingHeaders.join(", ")}`, "error");
                return;
            }
            
            // Crear mapa de índices de columnas
            const headerMap = {};
            actualHeaders.forEach((header, index) => {
                headerMap[header] = index;
            });
            
            // Obtener mapa de códigos de jugador a IDs
            const codigoToIdMap = {};
            const jugadoresSnapshot = await getDocs(jugadoresCollectionRef);
            jugadoresSnapshot.forEach(doc => {
                codigoToIdMap[doc.data().codigo] = doc.id;
            });
            
            const batch = writeBatch(db);
            let importCount = 0;
            let errorCount = 0;
            const errors = [];
            
            // Procesar cada línea (empezando desde la línea 1)
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue;
                
                try {
                    // Dividir por comas, manejando campos entre comillas
                    const values = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
                        .map(v => v.trim().replace(/^"|"$/g, ''));
                    
                    // Obtener ID de jugador usando el código
                    const codigoJugador = values[headerMap["Código Jugador"]]?.trim();
                    const jugadorId = codigoToIdMap[codigoJugador];
                    
                    if (!jugadorId) {
                        errors.push(`Línea ${i+1}: No se encontró jugador con código ${codigoJugador}`);
                        errorCount++;
                        continue;
                    }
                    
                    // Procesar campo booleano
                    const cuerdaIncluidaStr = String(values[headerMap["Cuerda Incluida"]]).toLowerCase();
                    const cuerdaIncluida = cuerdaIncluidaStr === 'sí' || cuerdaIncluidaStr === 'si' || cuerdaIncluidaStr === 'true' || cuerdaIncluidaStr === '1';
                    
                    // Función para parsear fechas (dd/mm/yyyy o d/m/yyyy)
                    const parseDate = (dateStr) => {
                        if (!dateStr || dateStr.trim() === '-' || dateStr.trim() === '') return null;
                        const parts = dateStr.split('/');
                        if (parts.length !== 3) return null;
                        return new Date(
                            parseInt(parts[2]),
                            parseInt(parts[1]) - 1,
                            parseInt(parts[0])
                        );
                    };
                    
                    // Parsear fechas
                    const fechaSolicitud = parseDate(values[headerMap["Fecha Solicitud"]]);
                    const fechaEntrega = parseDate(values[headerMap["Fecha Entrega Estimada"]]);
                    const fechaPago = parseDate(values[headerMap["Fecha Pago"]]);
                    
                    if (!fechaSolicitud || isNaN(fechaSolicitud.getTime())) {
                        errors.push(`Línea ${i+1}: Fecha de solicitud inválida (formato dd/mm/yyyy)`);
                        errorCount++;
                        continue;
                    }
                    
                    // Crear objeto de datos para la solicitud
                    const solicitudData = {
                        jugadorId: jugadorId,
                        nombreJugador: values[headerMap["Nombre Jugador"]]?.trim() || "N/A",
                        marcaRaqueta: values[headerMap["Marca Raqueta"]]?.trim() || "",
                        modeloRaqueta: values[headerMap["Modelo Raqueta"]]?.trim() || "",
                        tensionVertical: parseFloat(values[headerMap["Tensión Vertical"]]) || null,
                        tensionHorizontal: parseFloat(values[headerMap["Tensión Horizontal"]]) || null,
                        tipoCuerda: values[headerMap["Tipo Cuerda"]]?.trim() || "",
                        cuerdaIncluida: cuerdaIncluida,
                        fechaSolicitud: Timestamp.fromDate(fechaSolicitud),
                        fechaEntregaEstimada: fechaEntrega && !isNaN(fechaEntrega.getTime()) ? 
                            Timestamp.fromDate(fechaEntrega) : null,
                        precio: parseFloat(values[headerMap["Precio"]]) || null,
                        estadoPago: values[headerMap["Estado Pago"]]?.trim() || "Pendiente",
                        estadoEntrega: values[headerMap["Estado Entrega"]]?.trim() || "Pendiente",
                        notas: values[headerMap["Notas"]]?.trim() || "",
                        fechaPago: fechaPago && !isNaN(fechaPago.getTime()) ? 
                            Timestamp.fromDate(fechaPago) : null,
                        fechaCreacion: Timestamp.now(),
                        fechaUltimaActualizacion: Timestamp.now()
                    };
                    
                    // Validación mínima de datos requeridos
                    if (!solicitudData.marcaRaqueta) {
                        errors.push(`Línea ${i+1}: Marca de raqueta es obligatoria`);
                        errorCount++;
                        continue;
                    }
                    
                    // Validar consistencia entre pago y fecha de pago
                    if (solicitudData.fechaPago && solicitudData.estadoPago !== 'Pagado') {
                        solicitudData.estadoPago = 'Pagado';
                    }
                    
                    // Añadir a la operación batch
                    const newSolicitudRef = doc(collection(db, `users/${userId}/solicitudes`));
                    batch.set(newSolicitudRef, solicitudData);
                    importCount++;
                    
                } catch (parseError) {
                    console.error(`Error parseando línea ${i+1}:`, parseError);
                    errors.push(`Línea ${i+1}: Error de formato - ${parseError.message}`);
                    errorCount++;
                }
            }
            
            // Ejecutar la operación batch si hay documentos para importar
            if (importCount > 0) {
                try {
                    await batch.commit();
                    let message = `${importCount} solicitudes importadas correctamente.`;
                    
                    if (errorCount > 0) {
                        message += ` ${errorCount} errores (ver consola para detalles).`;
                    }
                    
                    showModalMessage(message, "success");
                    console.log("Errores durante la importación:", errors);
                    
                    // Recargar la lista de solicitudes
                    loadSolicitudes();
                    
                } catch (commitError) {
                    console.error("Error al guardar los datos:", commitError);
                    showModalMessage(`Error al guardar: ${commitError.message}`, "error");
                }
            } else {
                showModalMessage(
                    errorCount > 0 ? 
                    "No se importaron solicitudes debido a errores." : 
                    "No se encontraron datos válidos para importar.",
                    "warning"
                );
            }
        } catch (error) {
            console.error("Error procesando CSV:", error);
            showModalMessage(`Error al procesar el archivo: ${error.message}`, "error");
        } finally {
            importFile.value = ''; // Limpiar el input de archivo
        }
    };
    
    reader.onerror = () => {
        showModalMessage("Error al leer el archivo.", "error");
        importFile.value = '';
    };
    
    reader.readAsText(file);
});

// --- EVENT LISTENERS PARA FILTROS ---
document.getElementById('btnAplicarFiltros').addEventListener('click', loadSolicitudes);
document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
    document.getElementById('filtroJugador').value = '';
    document.getElementById('filtroEstadoPago').value = '';
    document.getElementById('filtroEstadoEntrega').value = '';
    document.getElementById('filtroFechaSolicitudDesde').value = '';
    document.getElementById('filtroFechaSolicitudHasta').value = '';
    document.getElementById('filtroFechaPagoDesde').value = '';
    document.getElementById('filtroFechaPagoHasta').value = '';
    loadSolicitudes();
});

// --- ESTADÍSTICAS ---
function calcularYMostrarEstadisticas() {
    if (!isAuthReady) return;
    
    const totalSolicitudes = currentSolicitudesData.length;
    const ingresosTotales = currentSolicitudesData.reduce((sum, s) => sum + (s.precio || 0), 0);
    const precioPromedio = totalSolicitudes > 0 ? ingresosTotales / totalSolicitudes : 0;
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const solicitudesHoy = currentSolicitudesData.filter(s => {
        const fecha = s.fechaSolicitud?.toDate();
        return fecha && fecha >= hoy;
    }).length;
    
    // Nuevas métricas
    const ingresosUltimos30Dias = currentSolicitudesData
        .filter(s => {
            const fecha = s.fechaSolicitud?.toDate();
            return fecha && fecha >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        })
        .reduce((sum, s) => sum + (s.precio || 0), 0);
    
    const promedioIngresosDiarios = ingresosUltimos30Dias / 30;
    
    // Actualizar tarjetas
    document.getElementById('statTotalSolicitudes').textContent = totalSolicitudes;
    document.getElementById('statIngresosTotales').textContent = ingresosTotales.toFixed(2) + '€';
    document.getElementById('statPrecioPromedio').textContent = precioPromedio.toFixed(2) + '€';
    document.getElementById('statSolicitudesHoy').textContent = solicitudesHoy;
    document.getElementById('statIngresos30Dias').textContent = ingresosUltimos30Dias.toFixed(2) + '€';
    document.getElementById('statPromedioDiario').textContent = promedioIngresosDiarios.toFixed(2) + '€';
    
    // Actualizar gráficos
    actualizarGraficosEstadisticas();
}

function actualizarGraficosEstadisticas() {
    // Datos para gráficos
    const estadosPago = {
        Pendiente: 0,
        Pagado: 0
    };
    
    const estadosEntrega = {
        'Pendiente': 0,
        'En Proceso': 0,
        'Listo para Recoger': 0,
        'Entregado': 0,
        'Cancelado': 0
    };
    
    currentSolicitudesData.forEach(s => {
        estadosPago[s.estadoPago] = (estadosPago[s.estadoPago] || 0) + 1;
        estadosEntrega[s.estadoEntrega] = (estadosEntrega[s.estadoEntrega] || 0) + 1;
    });
    
    // Gráfico de estado de pago
    if (pagoChart) pagoChart.destroy();
    const pagoCtx = document.getElementById('pagoChart').getContext('2d');
    pagoChart = new Chart(pagoCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(estadosPago),
            datasets: [{
                data: Object.values(estadosPago),
                backgroundColor: [
                    '#f59e0b',
                    '#10b981'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Gráfico de estado de entrega
    if (entregaChart) entregaChart.destroy();
    const entregaCtx = document.getElementById('entregaChart').getContext('2d');
    entregaChart = new Chart(entregaCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(estadosEntrega),
            datasets: [{
                data: Object.values(estadosEntrega),
                backgroundColor: [
                    '#ef4444',
                    '#3b82f6',
                    '#8b5cf6',
                    '#10b981',
                    '#9ca3af'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Gráfico de ingresos mensuales
    const ingresosPorMes = {};
    currentSolicitudesData.forEach(s => {
        if (s.fechaSolicitud && s.precio) {
            const fecha = s.fechaSolicitud.toDate();
            const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            ingresosPorMes[mes] = (ingresosPorMes[mes] || 0) + (s.precio || 0);
        }
    });
    
    const meses = Object.keys(ingresosPorMes).sort();
    const ingresos = meses.map(mes => ingresosPorMes[mes]);
    
    if (ingresosChart) ingresosChart.destroy();
    const ingresosCtx = document.getElementById('ingresosChart').getContext('2d');
    ingresosChart = new Chart(ingresosCtx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [{
                label: 'Ingresos (€)',
                data: ingresos,
                backgroundColor: '#3b82f6',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
    
    // Gráfico de solicitudes por jugador (Top 5)
    const jugadoresCount = {};
    currentSolicitudesData.forEach(s => {
        const jugador = s.nombreJugador || s.jugadorId;
        jugadoresCount[jugador] = (jugadoresCount[jugador] || 0) + 1;
    });
    
    const jugadoresSorted = Object.entries(jugadoresCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const nombresJugadores = jugadoresSorted.map(j => j[0]);
    const countSolicitudes = jugadoresSorted.map(j => j[1]);
    
    if (jugadoresChart) jugadoresChart.destroy();
    const jugadoresCtx = document.getElementById('jugadoresChart').getContext('2d');
    jugadoresChart = new Chart(jugadoresCtx, {
        type: 'bar',
        data: {
            labels: nombresJugadores,
            datasets: [{
                label: 'Solicitudes',
                data: countSolicitudes,
                backgroundColor: '#8b5cf6',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

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

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initApplication();
});

function parseFechaCSV(fechaStr) {
    if (!fechaStr) return null;
    const [dia, mes, anio] = fechaStr.split('/');
    const date = new Date(`${anio}-${mes}-${dia}`);
    return isNaN(date) ? null : date;
}

document.getElementById('btnImportCsv').addEventListener('click', () => {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    if (!file) {
        showModalMessage("Seleccione un archivo CSV para importar.", "warning");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const csvText = e.target.result;
        importarCSV(csvText);
    };
    reader.readAsText(file);
});

// --- MEJORA EN IMPORTACIÓN CSV CON CREACIÓN DE JUGADORES AUTOMÁTICA ---

async function importarCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const expectedHeaders = [
        "Código Jugador", "Nombre Jugador", "Marca Raqueta", "Modelo Raqueta",
        "Tensión Vertical", "Tensión Horizontal", "Tipo Cuerda", "Cuerda Incluida",
        "Fecha Solicitud", "Fecha Entrega Estimada", "Precio", "Estado Pago",
        "Estado Entrega", "Notas", "Fecha Pago"
    ];

    if (headers.join(',') !== expectedHeaders.join(',')) {
        showModalMessage("Error: El encabezado del CSV no coincide con el formato esperado.", "error");
        return;
    }

    const nuevasSolicitudes = [];
    const errores = [];
    const jugadoresNuevos = new Map();

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length !== expectedHeaders.length) {
            errores.push(`Línea ${i + 1}: Número de columnas incorrecto.`);
            continue;
        }

        const [
            codigoJugador, nombreJugador, marcaRaqueta, modeloRaqueta,
            tensionVertical, tensionHorizontal, tipoCuerda, cuerdaIncluida,
            fechaSolicitud, fechaEntregaEstimada, precio, estadoPago,
            estadoEntrega, notas, fechaPago
        ] = values;

        let jugador = jugadoresData.find(j => j.codigo.toString() === codigoJugador);

        if (!jugador && !jugadoresNuevos.has(codigoJugador)) {
            const nuevoDocRef = doc(collection(db, `users/${userId}/jugadores`));
            const nuevoJugador = {
                id: nuevoDocRef.id,
                codigo: parseInt(codigoJugador),
                nombreCompleto: nombreJugador,
                marcaRaqueta,
                modeloRaqueta,
                tensionVertical: parseFloat(tensionVertical) || 0,
                tensionHorizontal: parseFloat(tensionHorizontal) || 0,
                tipoCuerda: tipoCuerda || "",
                fechaRegistro: Timestamp.now(),
                fechaUltimaActualizacion: Timestamp.now()
            };
            jugadoresNuevos.set(codigoJugador, nuevoJugador);
            jugadoresData.push(nuevoJugador);
            await setDoc(nuevoDocRef, nuevoJugador);
            jugador = nuevoJugador;
        } else if (!jugador) {
            jugador = jugadoresNuevos.get(codigoJugador);
        }

        const fechaSolicitudDate = parseFechaCSV(fechaSolicitud);
        const fechaEntregaEstimadaDate = parseFechaCSV(fechaEntregaEstimada);
        const fechaPagoDate = parseFechaCSV(fechaPago);

        if (!marcaRaqueta || isNaN(parseFloat(tensionVertical)) || isNaN(parseFloat(tensionHorizontal)) || !fechaSolicitudDate) {
            errores.push(`Línea ${i + 1}: Datos obligatorios faltantes o incorrectos.`);
            continue;
        }

        nuevasSolicitudes.push({
            jugadorId: jugador.id,
            nombreJugador,
            marcaRaqueta,
            modeloRaqueta,
            tensionVertical: parseFloat(tensionVertical),
            tensionHorizontal: parseFloat(tensionHorizontal),
            tipoCuerda,
            cuerdaIncluida: cuerdaIncluida.toLowerCase() === 'sí',
            fechaSolicitud: Timestamp.fromDate(fechaSolicitudDate),
            fechaEntregaEstimada: fechaEntregaEstimadaDate ? Timestamp.fromDate(fechaEntregaEstimadaDate) : null,
            fechaPago: fechaPagoDate ? Timestamp.fromDate(fechaPagoDate) : null,
            precio: parseFloat(precio) || 0,
            estadoPago,
            estadoEntrega: estadoEntrega || "Pendiente",
            notas,
            fechaCreacion: Timestamp.now(),
            fechaUltimaActualizacion: Timestamp.now()
        });
    }

    if (errores.length > 0) {
        showModalMessage(`Errores durante la importación:<br>${errores.join('<br>')}`, 'warning');
    }

    if (nuevasSolicitudes.length > 0) {
        const batch = writeBatch(db);
        nuevasSolicitudes.forEach(data => {
            const docRef = doc(collection(db, `users/${userId}/solicitudes`));
            batch.set(docRef, data);
        });

        await batch.commit();
        showModalMessage(`Importación completada: ${nuevasSolicitudes.length} solicitudes agregadas.`, 'success');
        loadSolicitudes();
    }
}

function parseFechaCSV(fechaStr) {
    if (!fechaStr) return null;
    const [dia, mes, anio] = fechaStr.split('/');
    const date = new Date(`${anio}-${mes}-${dia}`);
    return isNaN(date) ? null : date;
}

document.getElementById('btnImportCsv').addEventListener('click', () => {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    if (!file) {
        showModalMessage("Seleccione un archivo CSV para importar.", "warning");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const csvText = e.target.result;
        importarCSV(csvText);
    };
    reader.readAsText(file);
});