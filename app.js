// Configuración de Firebase
// Asegúrate de que esta configuración coincida con la tuya
const firebaseConfig = {
    apiKey: "AIzaSyBWRLU0AWoZtxRGSRNko3U8Rmip5Oz0h30",
    authDomain: "gestion-de-encordados.firebaseapp.com",
    projectId: "gestion-de-encordados",
    storageBucket: "gestion-de-encordados.appspot.com",
    messagingSenderId: "898210321428",
    appId: "1:898210321428:web:08162c1a38e557605dc301",
    measurementId: "G-VJG0HVKMZV"
};

// Importaciones de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    signOut,
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
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variables globales para Firebase
let app;
let db;
let auth;
let userRole = null;
let currentUserId = null; // Para almacenar el UID del usuario actual

// Inicializar Firebase
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (error) {
    console.error("Error al inicializar Firebase:", error);
    showMessage("Error al inicializar la aplicación. Por favor, recarga la página.", 'error');
}

// Global variables for Firestore (MUST BE USED)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfigRuntime = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

// Utilidad para mostrar mensajes al usuario
function showMessage(message, type = 'info') {
    const messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) {
        console.warn('No se encontró el contenedor de mensajes. Mensaje:', message);
        return;
    }

    // Limpiar mensajes anteriores
    messageContainer.innerHTML = '';
    messageContainer.className = 'fixed top-4 right-4 p-4 rounded-lg shadow-md z-50 transition-transform transform';

    let bgColor = '';
    let textColor = '';
    switch (type) {
        case 'success':
            bgColor = 'bg-green-500';
            textColor = 'text-white';
            break;
        case 'error':
            bgColor = 'bg-red-500';
            textColor = 'text-white';
            break;
        case 'warning':
            bgColor = 'bg-yellow-500';
            textColor = 'text-gray-800';
            break;
        case 'info':
        default:
            bgColor = 'bg-blue-500';
            textColor = 'text-white';
            break;
    }

    messageContainer.classList.add(bgColor, textColor, 'translate-x-0');
    messageContainer.textContent = message;

    setTimeout(() => {
        messageContainer.classList.remove('translate-x-0');
        messageContainer.classList.add('translate-x-full');
        // Ocultar después de la transición
        messageContainer.addEventListener('transitionend', () => {
            if (messageContainer.classList.contains('translate-x-full')) {
                messageContainer.innerHTML = '';
                messageContainer.className = ''; // Limpiar clases para futuras animaciones
            }
        }, { once: true });
    }, 5000);
}

// Observador de estado de autenticación
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid; // Guarda el UID del usuario
        // User is signed in, check their role
        const userDocRef = doc(db, 'users', user.uid); // Asumiendo una colección 'users' donde el UID es el ID del documento
        try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                userRole = userDoc.data().role || 'usuario'; // Por defecto 'usuario' si el rol no se encuentra
            } else {
                // Si el documento del usuario no existe, crearlo con un rol predeterminado
                await setDoc(userDocRef, { email: user.email, role: 'usuario', createdAt: new Date() });
                userRole = 'usuario';
                showMessage(`Bienvenido, ${user.email}. Tu rol es: ${userRole}`, 'info');
            }
        } catch (error) {
            console.error("Error al obtener o crear el rol del usuario:", error);
            userRole = 'usuario'; // Fallback a rol predeterminado en caso de error
            showMessage("Error al cargar el perfil de usuario. Inténtalo de nuevo.", 'error');
        }
        console.log("Usuario autenticado. Rol:", userRole);

        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('appContent').style.display = 'block';

        // Actualizar la interfaz de usuario basada en el rol y el estado de autenticación
        updateUIForAuthState();
        // Cargar usuarios para la gestión de roles (si es administrador)
        if (userRole === 'admin') {
            cargarUsuarios();
        }

    } else {
        // User is signed out
        userRole = null;
        currentUserId = null;
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('appContent').style.display = 'none';
        updateUIForAuthState(); // Ocultar elementos de administrador
    }
});

// Función para actualizar la interfaz de usuario basada en el rol del usuario
function updateUIForAuthState() {
    // Mostrar/ocultar pestaña de administración y elementos admin-only
    const administracionTabLink = document.getElementById('administracionTabLink');
    const tabAdministracion = document.getElementById('tab-administracion');

    if (administracionTabLink) { // Verificar si el elemento existe
        if (userRole === 'admin') {
            administracionTabLink.style.display = 'block';
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        } else {
            administracionTabLink.style.display = 'none';
            if (tabAdministracion) tabAdministracion.style.display = 'none'; // Asegurarse de que el contenido de la pestaña también se oculte
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }
    }
    // Asegurarse de que el botón de cerrar sesión esté visible solo cuando hay usuario
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.style.display = auth.currentUser ? 'block' : 'none';
    }
}

// **********************************************
// Funciones de Autenticación
// **********************************************

// Función de inicio de sesión
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorMessageElement = document.getElementById('error-login');

    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, email, password);
        showMessage('Inicio de sesión exitoso.', 'success');
        errorMessageElement.textContent = '';
    } catch (error) {
        console.error("Error de inicio de sesión:", error);
        let message = 'Error de inicio de sesión. Credenciales inválidas.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            message = 'Correo o contraseña incorrectos.';
        } else if (error.code === 'auth/invalid-email') {
            message = 'El formato del correo electrónico es inválido.';
        } else if (error.code === 'auth/too-many-requests') {
            message = 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo más tarde.';
        }
        errorMessageElement.textContent = message;
        showMessage(message, 'error');
    }
});

// Función de cierre de sesión
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await signOut(auth);
        showMessage('Sesión cerrada correctamente.', 'info');
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        showMessage(`Error al cerrar sesión: ${error.message}`, 'error');
    }
});

// **********************************************
// Funciones de Administración de Roles (NUEVO)
// **********************************************

// Función para asignar el rol de administrador a un usuario
async function asignarRolAdministrador(email) {
    if (userRole !== 'admin') {
        showMessage('Solo un administrador puede asignar roles.', 'error');
        return;
    }

    if (!email) {
        showMessage('Por favor, ingresa un correo electrónico.', 'error');
        return;
    }

    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            await updateDoc(userDoc.ref, { role: 'admin' });
            showMessage(`Rol de administrador asignado a "${email}".`, 'success');
            cargarUsuarios(); // Recargar la lista de usuarios
        } else {
            showMessage(`Usuario con correo "${email}" no encontrado en la base de datos de roles. Asegúrate de que el usuario haya iniciado sesión al menos una vez para que su documento de usuario se cree.`, 'error');
        }
    } catch (error) {
        console.error("Error al asignar rol de administrador:", error);
        showMessage(`Error al asignar rol de administrador: ${error.message}`, 'error');
    }
}

// Función para cargar y mostrar la lista de usuarios
async function cargarUsuarios() {
    if (userRole !== 'admin' || !db) { // Solo administradores y si db está inicializado
        return;
    }

    const userListElement = document.getElementById('userList');
    if (!userListElement) {
        console.warn('No se encontró el elemento userList.');
        return;
    }
    userListElement.innerHTML = '<li class="text-gray-500">Cargando usuarios...</li>'; // Mensaje de carga

    try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        userListElement.innerHTML = ''; // Limpiar antes de añadir nuevos elementos

        if (querySnapshot.empty) {
            userListElement.innerHTML = '<li class="text-gray-500">No hay usuarios registrados.</li>';
            return;
        }

        querySnapshot.forEach(doc => {
            const userData = doc.data();
            const userId = doc.id;
            const listItem = document.createElement('li');
            listItem.className = 'p-3 border border-gray-200 rounded-md shadow-sm flex justify-between items-center bg-gray-50';
            listItem.innerHTML = `
                <span class="font-medium">${userData.email || 'N/A'}</span>
                <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-600">Rol: <strong class="capitalize">${userData.role || 'usuario'}</strong></span>
                    ${userRole === 'admin' && userData.role !== 'admin' ? `
                        <button data-userid="${userId}" data-email="${userData.email}" class="assign-admin-role-from-list-btn bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded-lg">
                            Hacer Admin
                        </button>
                    ` : ''}
                    ${userRole === 'admin' && userData.role === 'admin' && userId !== currentUserId ? `
                         <button data-userid="${userId}" data-email="${userData.email}" class="remove-admin-role-btn bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded-lg">
                            Remover Admin
                        </button>
                    ` : ''}
                </div>
            `;
            userListElement.appendChild(listItem);
        });

        // Añadir event listeners a los botones generados
        userListElement.querySelectorAll('.assign-admin-role-from-list-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const emailToAssign = e.target.dataset.email;
                await asignarRolAdministrador(emailToAssign);
            });
        });

        userListElement.querySelectorAll('.remove-admin-role-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userIdToRemoveRole = e.target.dataset.userid;
                await removerRolAdministrador(userIdToRemoveRole);
            });
        });

    } catch (error) {
        console.error("Error al cargar usuarios:", error);
        userListElement.innerHTML = '<li class="text-red-500">Error al cargar usuarios.</li>';
        showMessage(`Error al cargar usuarios: ${error.message}`, 'error');
    }
}

// Función para remover el rol de administrador
async function removerRolAdministrador(userId) {
    if (userRole !== 'admin') {
        showMessage('Solo un administrador puede remover roles.', 'error');
        return;
    }
    if (userId === currentUserId) { // Evitar que un admin se remueva a sí mismo
        showMessage('No puedes remover tu propio rol de administrador.', 'error');
        return;
    }

    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, { role: 'usuario' });
        showMessage('Rol de administrador removido con éxito.', 'success');
        cargarUsuarios(); // Recargar la lista de usuarios
    } catch (error) {
        console.error("Error al remover rol de administrador:", error);
        showMessage(`Error al remover rol de administrador: ${error.message}`, 'error');
    }
}


// Event listener para el botón de asignar rol de administrador
document.addEventListener('DOMContentLoaded', () => {
    const assignAdminRoleBtn = document.getElementById('assignAdminRoleBtn');
    if (assignAdminRoleBtn) {
        assignAdminRoleBtn.addEventListener('click', () => {
            const emailInput = document.getElementById('adminEmailInput');
            if (emailInput) {
                asignarRolAdministrador(emailInput.value);
            }
        });
    }
});


// **********************************************
// Funciones de Navegación de Pestañas
// **********************************************

// Función para mostrar la pestaña activa
function showTab(tabId) {
    // Ocultar todas las pestañas
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.style.display = 'none';
    });
    // Remover clase 'active' de todos los enlaces de pestañas
    document.querySelectorAll('.tab-link').forEach(link => {
        link.classList.remove('bg-blue-600', 'text-white');
        link.classList.add('text-blue-800', 'hover:bg-blue-200');
    });

    // Mostrar la pestaña seleccionada
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }

    // Añadir clase 'active' al enlace de la pestaña seleccionada
    const activeTabLink = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
    if (activeTabLink) {
        activeTabLink.classList.remove('text-blue-800', 'hover:bg-blue-200');
        activeTabLink.classList.add('bg-blue-600', 'text-white');
    }

    // Si la pestaña de administración está activa, cargar los usuarios
    if (tabId === 'tab-administracion' && userRole === 'admin') {
        cargarUsuarios();
    }
}

// Asignar event listeners a los enlaces de pestañas
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = e.target.dataset.tab;
            showTab(tabId);
        });
    });

    // Mostrar la pestaña de Solicitudes por defecto al cargar
    showTab('tab-solicitudes');
    updateUIForAuthState(); // Asegurarse de que el estado de la UI se actualiza al cargar la página
});


// **********************************************
// Funciones para Solicitudes
// **********************************************

// Referencia a la colección de solicitudes (anidada dentro del usuario)
const getSolicitudesCollectionRef = (uid) => collection(db, 'artifacts', appId, 'users', uid, 'solicitudes');
const getPublicSolicitudesCollectionRef = () => collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'); // Colección pública


// Cargar solicitudes (ajustada para roles y mostrar el creador)
async function cargarSolicitudes() {
    const solicitudesTableBody = document.getElementById('solicitudesTableBody');
    if (!solicitudesTableBody) return;

    solicitudesTableBody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-gray-500">Cargando solicitudes...</td></tr>';

    const solicitudes = [];

    try {
        if (userRole === 'admin') {
            // Si es admin, cargar solicitudes de todos los usuarios
            const usersSnapshot = await getDocs(collection(db, 'users'));
            for (const userDoc of usersSnapshot.docs) {
                const userUid = userDoc.id;
                const userEmail = userDoc.data().email || 'Usuario Desconocido'; // Obtener email del creador

                const userSolicitudesQuery = query(getSolicitudesCollectionRef(userUid));
                const userSolicitudesSnapshot = await getDocs(userSolicitudesQuery);
                userSolicitudesSnapshot.forEach(doc => {
                    solicitudes.push({ id: doc.id, ...doc.data(), creadorEmail: userEmail, creadorUid: userUid });
                });
            }
             // También cargar solicitudes de la colección pública para administradores
             const publicSolicitudesSnapshot = await getDocs(getPublicSolicitudesCollectionRef());
             publicSolicitudesSnapshot.forEach(doc => {
                 solicitudes.push({ id: doc.id, ...doc.data(), creadorEmail: 'Público', creadorUid: 'public' });
             });

        } else if (currentUserId) {
            // Si es usuario normal, cargar solo sus solicitudes privadas
            const userSolicitudesQuery = query(getSolicitudesCollectionRef(currentUserId));
            const userSolicitudesSnapshot = await getDocs(userSolicitudesQuery);
            userSolicitudesSnapshot.forEach(doc => {
                solicitudes.push({ id: doc.id, ...doc.data(), creadorEmail: 'Tú', creadorUid: currentUserId });
            });
        }

        renderizarSolicitudes(solicitudes);
        actualizarEstadisticasSolicitudes(solicitudes);
        const exportarSolicitudesBtn = document.getElementById('exportarSolicitudesCSV');
        if (exportarSolicitudesBtn) {
            exportarSolicitudesBtn.style.display = solicitudes.length > 0 ? 'block' : 'none'; // Mostrar/ocultar botón
        }
    } catch (error) {
        console.error("Error al cargar solicitudes:", error);
        solicitudesTableBody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-red-500">Error al cargar solicitudes.</td></tr>';
        showMessage('Error al cargar solicitudes.', 'error');
    }
}

// Renderizar las solicitudes en la tabla
function renderizarSolicitudes(solicitudes) {
    const solicitudesTableBody = document.getElementById('solicitudesTableBody');
    if (!solicitudesTableBody) return;

    solicitudesTableBody.innerHTML = ''; // Limpiar tabla

    if (solicitudes.length === 0) {
        solicitudesTableBody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-gray-500">No hay solicitudes registradas.</td></tr>';
        return;
    }

    solicitudes.forEach(solicitud => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        let estadoColorClass = '';
        switch (solicitud.estadoEntrega) {
            case 'Pendiente': estadoColorClass = 'text-yellow-600 font-semibold'; break;
            case 'En Proceso': estadoColorClass = 'text-blue-600 font-semibold'; break;
            case 'Listo para Recoger': estadoColorClass = 'text-green-600 font-semibold'; break;
            case 'Entregado': estadoColorClass = 'text-gray-500'; break;
            case 'Cancelado': estadoColorClass = 'text-red-600'; break;
        }

        const fechaSolicitud = solicitud.fechaSolicitud ? new Date(solicitud.fechaSolicitud).toLocaleDateString() : 'N/A';
        const fechaEntregaEstimada = solicitud.fechaEntregaEstimada ? new Date(solicitud.fechaEntregaEstimada).toLocaleDateString() : 'N/A';
        const fechaEntregaReal = solicitud.fechaEntregaReal ? new Date(solicitud.fechaEntregaReal).toLocaleDateString() : 'N/A';

        // Determinar si los botones de acción deben estar deshabilitados
        const isEditable = (userRole === 'admin') || (currentUserId === solicitud.creadorUid);
        const isDisabledClass = isEditable ? '' : 'opacity-50 cursor-not-allowed';
        const disabledAttr = isEditable ? '' : 'disabled';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${solicitud.nombreJugador || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${solicitud.modeloRaqueta || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${solicitud.tipoCuerda || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${solicitud.tensión || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${fechaSolicitud}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${fechaEntregaEstimada}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${fechaEntregaReal}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm ${estadoColorClass}">${solicitud.estadoEntrega || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${solicitud.creadorEmail || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button data-id="${solicitud.id}" data-creador-uid="${solicitud.creadorUid}" class="edit-solicitud-btn bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg mr-2 ${isDisabledClass}" ${disabledAttr}>
                    <i class="fas fa-edit"></i>
                </button>
                <button data-id="${solicitud.id}" data-creador-uid="${solicitud.creadorUid}" class="delete-solicitud-btn bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg ${isDisabledClass}" ${disabledAttr}>
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        solicitudesTableBody.appendChild(row);
    });

    // Añadir event listeners para editar y eliminar solicitudes
    document.querySelectorAll('.edit-solicitud-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const solicitudId = e.currentTarget.dataset.id;
            const creadorUid = e.currentTarget.dataset.creadorUid;
            mostrarEditarSolicitudModal(solicitudId, creadorUid);
        });
    });

    document.querySelectorAll('.delete-solicitud-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const solicitudId = e.currentTarget.dataset.id;
            const creadorUid = e.currentTarget.dataset.creadorUid;
            mostrarConfirmarEliminarModal(solicitudId, 'solicitud', creadorUid);
        });
    });
}

// Añadir una nueva solicitud
document.getElementById('solicitudForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validar permisos
    if (userRole !== 'admin' && userRole !== 'usuario') {
        showMessage('No tienes permiso para agregar solicitudes.', 'error');
        return;
    }
    if (!currentUserId) {
        showMessage('Debes iniciar sesión para agregar solicitudes.', 'error');
        return;
    }

    const newSolicitud = {
        nombreJugador: document.getElementById('solicitudNombreJugador').value,
        modeloRaqueta: document.getElementById('solicitudModeloRaqueta').value,
        tipoCuerda: document.getElementById('solicitudTipoCuerda').value,
        tensión: document.getElementById('solicitudTension').value,
        fechaSolicitud: document.getElementById('solicitudFechaSolicitud').value,
        fechaEntregaEstimada: document.getElementById('solicitudFechaEntregaEstimada').value,
        estadoEntrega: document.getElementById('solicitudEstadoEntrega').value,
        notas: document.getElementById('solicitudNotas').value,
        fechaEntregaReal: '', // Se llena cuando el estado cambia a "Entregado"
        createdAt: new Date().toISOString()
    };

    // Validaciones
    let isValid = true;
    if (!newSolicitud.nombreJugador) {
        document.getElementById('error-solicitudNombreJugador').textContent = 'El nombre del jugador es obligatorio.';
        isValid = false;
    } else {
        document.getElementById('error-solicitudNombreJugador').textContent = '';
    }
    if (!newSolicitud.modeloRaqueta) {
        document.getElementById('error-solicitudModeloRaqueta').textContent = 'El modelo de la raqueta es obligatorio.';
        isValid = false;
    } else {
        document.getElementById('error-solicitudModeloRaqueta').textContent = '';
    }
    if (!newSolicitud.tipoCuerda) {
        document.getElementById('error-solicitudTipoCuerda').textContent = 'El tipo de cuerda es obligatorio.';
        isValid = false;
    } else {
        document.getElementById('error-solicitudTipoCuerda').textContent = '';
    }
    if (!newSolicitud.tensión) {
        document.getElementById('error-solicitudTension').textContent = 'La tensión es obligatoria.';
        isValid = false;
    } else {
        document.getElementById('error-solicitudTension').textContent = '';
    }
    if (!newSolicitud.fechaSolicitud) {
        document.getElementById('error-solicitudFechaSolicitud').textContent = 'La fecha de solicitud es obligatoria.';
        isValid = false;
    } else {
        document.getElementById('error-solicitudFechaSolicitud').textContent = '';
    }
    if (!newSolicitud.estadoEntrega) {
        document.getElementById('error-solicitudEstadoEntrega').textContent = 'El estado de entrega es obligatorio.';
        isValid = false;
    } else {
        document.getElementById('error-solicitudEstadoEntrega').textContent = '';
    }

    if (!isValid) {
        showMessage('Por favor, completa todos los campos obligatorios.', 'error');
        return;
    }

    try {
        const publicCheckbox = document.getElementById('solicitudPublico');
        const isPublic = publicCheckbox && publicCheckbox.checked;

        if (isPublic) {
            await addDoc(getPublicSolicitudesCollectionRef(), newSolicitud);
            showMessage('Nueva solicitud pública añadida.', 'success');
        } else {
            await addDoc(getSolicitudesCollectionRef(currentUserId), newSolicitud);
            showMessage('Nueva solicitud privada añadida.', 'success');
        }

        document.getElementById('solicitudForm').reset();
        if (publicCheckbox) {
            publicCheckbox.checked = false; // Reset checkbox
        }
        cargarSolicitudes();
    } catch (error) {
        console.error("Error al añadir solicitud:", error);
        showMessage(`Error al añadir solicitud: ${error.message}`, 'error');
    }
});


// Mostrar/ocultar el modal de edición de solicitudes
const editSolicitudModal = document.getElementById('editSolicitudModal');
const cancelEditSolicitudBtn = document.getElementById('cancelEditSolicitud');
const editSolicitudForm = document.getElementById('editSolicitudForm');

if (cancelEditSolicitudBtn) {
    cancelEditSolicitudBtn.addEventListener('click', () => {
        if (editSolicitudModal) editSolicitudModal.classList.add('hidden');
        if (editSolicitudForm) editSolicitudForm.reset();
    });
}

let currentEditingSolicitud = null; // Variable para guardar el ID de la solicitud en edición
let currentEditingSolicitudCreatorUid = null; // Variable para guardar el UID del creador de la solicitud en edición

// Mostrar modal de edición de solicitud
async function mostrarEditarSolicitudModal(solicitudId, creadorUid) {
    if (userRole !== 'admin' && currentUserId !== creadorUid) {
        showMessage('No tienes permiso para editar esta solicitud.', 'error');
        return;
    }
    currentEditingSolicitud = solicitudId;
    currentEditingSolicitudCreatorUid = creadorUid;

    let solicitudDocRef;
    if (creadorUid === 'public') { // Es una solicitud pública
        solicitudDocRef = doc(getPublicSolicitudesCollectionRef(), solicitudId);
    } else { // Es una solicitud privada de un usuario
        solicitudDocRef = doc(getSolicitudesCollectionRef(creadorUid), solicitudId);
    }

    try {
        const docSnap = await getDoc(solicitudDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('editSolicitudNombreJugador').value = data.nombreJugador || '';
            document.getElementById('editSolicitudModeloRaqueta').value = data.modeloRaqueta || '';
            document.getElementById('editSolicitudTipoCuerda').value = data.tipoCuerda || '';
            document.getElementById('editSolicitudTension').value = data.tensión || '';
            document.getElementById('editSolicitudFechaSolicitud').value = data.fechaSolicitud || '';
            document.getElementById('editSolicitudFechaEntregaEstimada').value = data.fechaEntregaEstimada || '';
            document.getElementById('editSolicitudFechaEntregaReal').value = data.fechaEntregaReal || '';
            document.getElementById('editSolicitudEstadoEntrega').value = data.estadoEntrega || 'Pendiente';
            document.getElementById('editSolicitudNotas').value = data.notas || '';

            if (editSolicitudModal) editSolicitudModal.classList.remove('hidden');
        } else {
            showMessage("Solicitud no encontrada.", 'error');
        }
    } catch (error) {
        console.error("Error al cargar solicitud para edición:", error);
        showMessage("Error al cargar solicitud para edición.", 'error');
    }
}

// Guardar cambios de solicitud
if (editSolicitudForm) {
    editSolicitudForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentEditingSolicitud || !currentEditingSolicitudCreatorUid) {
            showMessage('No hay solicitud seleccionada para editar.', 'error');
            return;
        }

        if (userRole !== 'admin' && currentUserId !== currentEditingSolicitudCreatorUid) {
            showMessage('No tienes permiso para guardar cambios en esta solicitud.', 'error');
            return;
        }

        const updatedSolicitud = {
            nombreJugador: document.getElementById('editSolicitudNombreJugador').value,
            modeloRaqueta: document.getElementById('editSolicitudModeloRaqueta').value,
            tipoCuerda: document.getElementById('editSolicitudTipoCuerda').value,
            tensión: document.getElementById('editSolicitudTension').value,
            fechaSolicitud: document.getElementById('editSolicitudFechaSolicitud').value,
            fechaEntregaEstimada: document.getElementById('editSolicitudFechaEntregaEstimada').value,
            fechaEntregaReal: document.getElementById('editSolicitudFechaEntregaReal').value,
            estadoEntrega: document.getElementById('editSolicitudEstadoEntrega').value,
            notas: document.getElementById('editSolicitudNotas').value,
            updatedAt: new Date().toISOString()
        };

        // Validaciones de campos obligatorios en edición
        let isValid = true;
        const errorEditNombreJugador = document.getElementById('error-editNombreJugador');
        const errorEditModeloRaqueta = document.getElementById('error-editModeloRaqueta');
        const errorEditTipoCuerda = document.getElementById('error-editTipoCuerda');
        const errorEditTension = document.getElementById('error-editTension');
        const errorEditFechaSolicitud = document.getElementById('error-editFechaSolicitud');
        const errorEditEstadoEntrega = document.getElementById('error-editEstadoEntrega');

        if (!updatedSolicitud.nombreJugador) {
            if (errorEditNombreJugador) errorEditNombreJugador.textContent = 'El nombre del jugador es obligatorio.';
            isValid = false;
        } else {
            if (errorEditNombreJugador) errorEditNombreJugador.textContent = '';
        }
        if (!updatedSolicitud.modeloRaqueta) {
            if (errorEditModeloRaqueta) errorEditModeloRaqueta.textContent = 'El modelo de la raqueta es obligatorio.';
            isValid = false;
        } else {
            if (errorEditModeloRaqueta) errorEditModeloRaqueta.textContent = '';
        }
        if (!updatedSolicitud.tipoCuerda) {
            if (errorEditTipoCuerda) errorEditTipoCuerda.textContent = 'El tipo de cuerda es obligatorio.';
            isValid = false;
        } else {
            if (errorEditTipoCuerda) errorEditTipoCuerda.textContent = '';
        }
        if (!updatedSolicitud.tensión) {
            if (errorEditTension) errorEditTension.textContent = 'La tensión es obligatoria.';
            isValid = false;
        } else {
            if (errorEditTension) errorEditTension.textContent = '';
        }
        if (!updatedSolicitud.fechaSolicitud) {
            if (errorEditFechaSolicitud) errorEditFechaSolicitud.textContent = 'La fecha de solicitud es obligatoria.';
            isValid = false;
        } else {
            if (errorEditFechaSolicitud) errorEditFechaSolicitud.textContent = '';
        }
        if (!updatedSolicitud.estadoEntrega) {
            if (errorEditEstadoEntrega) errorEditEstadoEntrega.textContent = 'El estado de entrega es obligatorio.';
            isValid = false;
        } else {
            if (errorEditEstadoEntrega) errorEditEstadoEntrega.textContent = '';
        }

        if (!isValid) {
            showMessage('Por favor, completa todos los campos obligatorios en el formulario de edición.', 'error');
            return;
        }

        let solicitudDocRef;
        if (currentEditingSolicitudCreatorUid === 'public') {
            solicitudDocRef = doc(getPublicSolicitudesCollectionRef(), currentEditingSolicitud);
        } else {
            solicitudDocRef = doc(getSolicitudesCollectionRef(currentEditingSolicitudCreatorUid), currentEditingSolicitud);
        }

        try {
            await updateDoc(solicitudDocRef, updatedSolicitud);
            showMessage('Solicitud actualizada con éxito.', 'success');
            if (editSolicitudModal) editSolicitudModal.classList.add('hidden');
            cargarSolicitudes(); // Recargar la lista de solicitudes
            currentEditingSolicitud = null;
            currentEditingSolicitudCreatorUid = null;
        } catch (error) {
            console.error("Error al actualizar solicitud:", error);
            showMessage(`Error al actualizar solicitud: ${error.message}`, 'error');
        }
    });
}

// **********************************************
// Funciones para Jugadores
// **********************************************

// Referencia a la colección de jugadores (anidada dentro del usuario)
const getJugadoresCollectionRef = (uid) => collection(db, 'artifacts', appId, 'users', uid, 'jugadores');
const getPublicJugadoresCollectionRef = () => collection(db, 'artifacts', appId, 'public', 'data', 'jugadores'); // Colección pública

// Cargar jugadores (ajustada para roles y mostrar el creador)
async function cargarJugadores() {
    const jugadoresTableBody = document.getElementById('jugadoresTableBody');
    if (!jugadoresTableBody) return;

    jugadoresTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">Cargando jugadores...</td></tr>';

    const jugadores = [];

    try {
        if (userRole === 'admin') {
            // Si es admin, cargar jugadores de todos los usuarios
            const usersSnapshot = await getDocs(collection(db, 'users'));
            for (const userDoc of usersSnapshot.docs) {
                const userUid = userDoc.id;
                const userEmail = userDoc.data().email || 'Usuario Desconocido';

                const userJugadoresQuery = query(getJugadoresCollectionRef(userUid));
                const userJugadoresSnapshot = await getDocs(userJugadoresQuery);
                userJugadoresSnapshot.forEach(doc => {
                    jugadores.push({ id: doc.id, ...doc.data(), creadorEmail: userEmail, creadorUid: userUid });
                });
            }
             // También cargar jugadores de la colección pública para administradores
            const publicJugadoresSnapshot = await getDocs(getPublicJugadoresCollectionRef());
            publicJugadoresSnapshot.forEach(doc => {
                jugadores.push({ id: doc.id, ...doc.data(), creadorEmail: 'Público', creadorUid: 'public' });
            });

        } else if (currentUserId) {
            // Si es usuario normal, cargar solo sus jugadores privados
            const userJugadoresQuery = query(getJugadoresCollectionRef(currentUserId));
            const userJugadoresSnapshot = await getDocs(userJugadoresQuery);
            userJugadoresSnapshot.forEach(doc => {
                jugadores.push({ id: doc.id, ...doc.data(), creadorEmail: 'Tú', creadorUid: currentUserId });
            });
        }

        renderizarJugadores(jugadores);
        const exportarJugadoresBtn = document.getElementById('exportarJugadoresCSV');
        if (exportarJugadoresBtn) {
            exportarJugadoresBtn.style.display = jugadores.length > 0 ? 'block' : 'none'; // Mostrar/ocultar botón
        }
    } catch (error) {
        console.error("Error al cargar jugadores:", error);
        jugadoresTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-red-500">Error al cargar jugadores.</td></tr>';
        showMessage('Error al cargar jugadores.', 'error');
    }
}


// Renderizar jugadores en la tabla
function renderizarJugadores(jugadores) {
    const jugadoresTableBody = document.getElementById('jugadoresTableBody');
    if (!jugadoresTableBody) return;

    jugadoresTableBody.innerHTML = ''; // Limpiar tabla

    if (jugadores.length === 0) {
        jugadoresTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No hay jugadores registrados.</td></tr>';
        return;
    }

    jugadores.forEach(jugador => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';

        const isEditable = (userRole === 'admin') || (currentUserId === jugador.creadorUid);
        const isDisabledClass = isEditable ? '' : 'opacity-50 cursor-not-allowed';
        const disabledAttr = isEditable ? '' : 'disabled';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${jugador.nombre || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${jugador.email || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${jugador.telefono || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${jugador.nivel || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${jugador.manoDominante || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${jugador.notas || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${jugador.creadorEmail || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button data-id="${jugador.id}" data-creador-uid="${jugador.creadorUid}" class="edit-jugador-btn bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg mr-2 ${isDisabledClass}" ${disabledAttr}>
                    <i class="fas fa-edit"></i>
                </button>
                <button data-id="${jugador.id}" data-creador-uid="${jugador.creadorUid}" class="delete-jugador-btn bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg ${isDisabledClass}" ${disabledAttr}>
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        jugadoresTableBody.appendChild(row);
    });

    // Añadir event listeners para editar y eliminar jugadores
    document.querySelectorAll('.edit-jugador-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const jugadorId = e.currentTarget.dataset.id;
            const creadorUid = e.currentTarget.dataset.creadorUid;
            mostrarEditarJugadorModal(jugadorId, creadorUid);
        });
    });

    document.querySelectorAll('.delete-jugador-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const jugadorId = e.currentTarget.dataset.id;
            const creadorUid = e.currentTarget.dataset.creadorUid;
            mostrarConfirmarEliminarModal(jugadorId, 'jugador', creadorUid);
        });
    });
}

// Añadir nuevo jugador
document.getElementById('jugadorForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validar permisos
    if (userRole !== 'admin' && userRole !== 'usuario') {
        showMessage('No tienes permiso para agregar jugadores.', 'error');
        return;
    }
    if (!currentUserId) {
        showMessage('Debes iniciar sesión para agregar jugadores.', 'error');
        return;
    }

    const newJugador = {
        nombre: document.getElementById('jugadorNombre').value,
        email: document.getElementById('jugadorEmail').value,
        telefono: document.getElementById('jugadorTelefono').value,
        nivel: document.getElementById('jugadorNivel').value,
        manoDominante: document.getElementById('jugadorManoDominante').value,
        notas: document.getElementById('jugadorNotas').value,
        createdAt: new Date().toISOString()
    };

    // Validaciones
    let isValid = true;
    if (!newJugador.nombre) {
        document.getElementById('error-jugadorNombre').textContent = 'El nombre es obligatorio.';
        isValid = false;
    } else {
        document.getElementById('error-jugadorNombre').textContent = '';
    }
    if (!newJugador.email) {
        document.getElementById('error-jugadorEmail').textContent = 'El email es obligatorio.';
        isValid = false;
    } else {
        document.getElementById('error-jugadorEmail').textContent = '';
    }

    if (!isValid) {
        showMessage('Por favor, completa todos los campos obligatorios.', 'error');
        return;
    }

    try {
        const publicCheckbox = document.getElementById('jugadorPublico');
        const isPublic = publicCheckbox && publicCheckbox.checked;

        if (isPublic) {
            await addDoc(getPublicJugadoresCollectionRef(), newJugador);
            showMessage('Nuevo jugador público añadido.', 'success');
        } else {
            await addDoc(getJugadoresCollectionRef(currentUserId), newJugador);
            showMessage('Nuevo jugador privado añadido.', 'success');
        }

        document.getElementById('jugadorForm').reset();
        if (publicCheckbox) {
            publicCheckbox.checked = false; // Reset checkbox
        }
        cargarJugadores();
    } catch (error) {
        console.error("Error al añadir jugador:", error);
        showMessage(`Error al añadir jugador: ${error.message}`, 'error');
    }
});


// Mostrar/ocultar el modal de edición de jugadores
const editJugadorModal = document.getElementById('editJugadorModal');
const cancelEditJugadorBtn = document.getElementById('cancelEditJugador');
const editJugadorForm = document.getElementById('editJugadorForm');

if (cancelEditJugadorBtn) {
    cancelEditJugadorBtn.addEventListener('click', () => {
        if (editJugadorModal) editJugadorModal.classList.add('hidden');
        if (editJugadorForm) editJugadorForm.reset();
    });
}

let currentEditingJugador = null; // Variable para guardar el ID del jugador en edición
let currentEditingJugadorCreatorUid = null; // Variable para guardar el UID del creador del jugador en edición

// Mostrar modal de edición de jugador
async function mostrarEditarJugadorModal(jugadorId, creadorUid) {
    if (userRole !== 'admin' && currentUserId !== creadorUid) {
        showMessage('No tienes permiso para editar este jugador.', 'error');
        return;
    }
    currentEditingJugador = jugadorId;
    currentEditingJugadorCreatorUid = creadorUid;

    let jugadorDocRef;
    if (creadorUid === 'public') {
        jugadorDocRef = doc(getPublicJugadoresCollectionRef(), jugadorId);
    } else {
        jugadorDocRef = doc(getJugadoresCollectionRef(creadorUid), jugadorId);
    }

    try {
        const docSnap = await getDoc(jugadorDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('editJugadorNombre').value = data.nombre || '';
            document.getElementById('editJugadorEmail').value = data.email || '';
            document.getElementById('editJugadorTelefono').value = data.telefono || '';
            document.getElementById('editJugadorNivel').value = data.nivel || '';
            document.getElementById('editJugadorManoDominante').value = data.manoDominante || '';
            document.getElementById('editJugadorNotas').value = data.notas || '';

            if (editJugadorModal) editJugadorModal.classList.remove('hidden');
        } else {
            showMessage("Jugador no encontrado.", 'error');
        }
    } catch (error) {
        console.error("Error al cargar jugador para edición:", error);
        showMessage("Error al cargar jugador para edición.", 'error');
    }
}

// Guardar cambios de jugador
if (editJugadorForm) {
    editJugadorForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentEditingJugador || !currentEditingJugadorCreatorUid) {
            showMessage('No hay jugador seleccionado para editar.', 'error');
            return;
        }

        if (userRole !== 'admin' && currentUserId !== currentEditingJugadorCreatorUid) {
            showMessage('No tienes permiso para guardar cambios en este jugador.', 'error');
            return;
        }

        const updatedJugador = {
            nombre: document.getElementById('editJugadorNombre').value,
            email: document.getElementById('editJugadorEmail').value,
            telefono: document.getElementById('editJugadorTelefono').value,
            nivel: document.getElementById('editJugadorNivel').value,
            manoDominante: document.getElementById('editJugadorManoDominante').value,
            notas: document.getElementById('editJugadorNotas').value,
            updatedAt: new Date().toISOString()
        };

        // Validaciones de campos obligatorios en edición
        let isValid = true;
        const errorEditJugadorNombre = document.getElementById('error-editJugadorNombre');
        const errorEditJugadorEmail = document.getElementById('error-editJugadorEmail');

        if (!updatedJugador.nombre) {
            if (errorEditJugadorNombre) errorEditJugadorNombre.textContent = 'El nombre es obligatorio.';
            isValid = false;
        } else {
            if (errorEditJugadorNombre) errorEditJugadorNombre.textContent = '';
        }
        if (!updatedJugador.email) {
            if (errorEditJugadorEmail) errorEditJugadorEmail.textContent = 'El email es obligatorio.';
            isValid = false;
        } else {
            if (errorEditJugadorEmail) errorEditJugadorEmail.textContent = '';
        }

        if (!isValid) {
            showMessage('Por favor, completa todos los campos obligatorios en el formulario de edición.', 'error');
            return;
        }

        let jugadorDocRef;
        if (currentEditingJugadorCreatorUid === 'public') {
            jugadorDocRef = doc(getPublicJugadoresCollectionRef(), currentEditingJugador);
        } else {
            jugadorDocRef = doc(getJugadoresCollectionRef(currentEditingJugadorCreatorUid), currentEditingJugador);
        }

        try {
            await updateDoc(jugadorDocRef, updatedJugador);
            showMessage('Jugador actualizado con éxito.', 'success');
            if (editJugadorModal) editJugadorModal.classList.add('hidden');
            cargarJugadores(); // Recargar la lista de jugadores
            currentEditingJugador = null;
            currentEditingJugadorCreatorUid = null;
        } catch (error) {
            console.error("Error al actualizar jugador:", error);
            showMessage(`Error al actualizar jugador: ${error.message}`, 'error');
        }
    });
}


// **********************************************
// Funciones de Eliminación (Común para Jugadores y Solicitudes)
// **********************************************

const confirmarEliminarModal = document.getElementById('confirmarEliminarModal');
const cancelarEliminarBtn = document.getElementById('cancelarEliminar');
const confirmarEliminarBtn = document.getElementById('confirmarEliminar');

let itemAEliminar = { id: null, tipo: null, creadorUid: null }; // Almacenar el ID y tipo del ítem a eliminar

if (cancelarEliminarBtn) {
    cancelarEliminarBtn.addEventListener('click', () => {
        if (confirmarEliminarModal) confirmarEliminarModal.classList.add('hidden');
    });
}

if (confirmarEliminarBtn) {
    confirmarEliminarBtn.addEventListener('click', async () => {
        if (confirmarEliminarModal) confirmarEliminarModal.classList.add('hidden');
        const { id, tipo, creadorUid } = itemAEliminar;

        if (userRole !== 'admin' && currentUserId !== creadorUid) {
            showMessage('No tienes permiso para eliminar este elemento.', 'error');
            return;
        }

        try {
            let docRef;
            if (tipo === 'jugador') {
                if (creadorUid === 'public') {
                    docRef = doc(getPublicJugadoresCollectionRef(), id);
                } else {
                    docRef = doc(getJugadoresCollectionRef(creadorUid), id);
                }
                await deleteDoc(docRef);
                showMessage('Jugador eliminado con éxito.', 'success');
                cargarJugadores();
            } else if (tipo === 'solicitud') {
                if (creadorUid === 'public') {
                    docRef = doc(getPublicSolicitudesCollectionRef(), id);
                } else {
                    docRef = doc(getSolicitudesCollectionRef(creadorUid), id);
                }
                await deleteDoc(docRef);
                showMessage('Solicitud eliminada con éxito.', 'success');
                cargarSolicitudes();
            }
        } catch (error) {
            console.error(`Error al eliminar ${tipo}:`, error);
            showMessage(`Error al eliminar ${tipo}: ${error.message}`, 'error');
        } finally {
            itemAEliminar = { id: null, tipo: null, creadorUid: null }; // Reset
        }
    });
}

function mostrarConfirmarEliminarModal(id, tipo, creadorUid) {
    if (userRole !== 'admin' && currentUserId !== creadorUid) {
        showMessage('No tienes permiso para eliminar este elemento.', 'error');
        return;
    }
    itemAEliminar = { id, tipo, creadorUid };
    const confirmarMensaje = document.getElementById('confirmarMensaje');
    if (confirmarMensaje) {
        confirmarMensaje.textContent = `¿Estás seguro de que deseas eliminar este ${tipo}?`;
    }
    if (confirmarEliminarModal) confirmarEliminarModal.classList.remove('hidden');
}


// **********************************************
// Funciones de Exportación e Importación CSV
// **********************************************

// Función para convertir datos a CSV
function convertirAcsv(data, headers) {
    let csv = headers.join(',') + '\n';
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
            // Escapar comas y comillas dobles
            return `"${value.replace(/"/g, '""')}"`;
        });
        csv += values.join(',') + '\n';
    });
    return csv;
}

// Exportar Jugadores a CSV
const exportarJugadoresBtn = document.getElementById('exportarJugadoresCSV');
if (exportarJugadoresBtn) {
    exportarJugadoresBtn.addEventListener('click', async () => {
        if (userRole !== 'admin' && userRole !== 'usuario') { // Permiso para exportar
            showMessage('No tienes permiso para exportar jugadores.', 'error');
            return;
        }
        if (!currentUserId) {
            showMessage('Debes iniciar sesión para exportar jugadores.', 'error');
            return;
        }

        const jugadores = [];
        try {
            if (userRole === 'admin') {
                const usersSnapshot = await getDocs(collection(db, 'users'));
                for (const userDoc of usersSnapshot.docs) {
                    const userUid = userDoc.id;
                    const userJugadoresSnapshot = await getDocs(getJugadoresCollectionRef(userUid));
                    userJugadoresSnapshot.forEach(doc => jugadores.push(doc.data()));
                }
                const publicJugadoresSnapshot = await getDocs(getPublicJugadoresCollectionRef());
                publicJugadoresSnapshot.forEach(doc => jugadores.push(doc.data()));
            } else {
                const userJugadoresSnapshot = await getDocs(getJugadoresCollectionRef(currentUserId));
                userJugadoresSnapshot.forEach(doc => jugadores.push(doc.data()));
            }

            if (jugadores.length === 0) {
                showMessage('No hay jugadores para exportar.', 'info');
                return;
            }

            const headers = ['nombre', 'email', 'telefono', 'nivel', 'manoDominante', 'notas', 'createdAt', 'updatedAt'];
            const csv = convertirAcsv(jugadores, headers);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'jugadores.csv';
            link.click();
            showMessage('Jugadores exportados correctamente.', 'success');
        } catch (error) {
            console.error("Error al exportar jugadores:", error);
            showMessage('Error al exportar jugadores.', 'error');
        }
    });
}

// Exportar Solicitudes a CSV
const exportarSolicitudesBtn = document.getElementById('exportarSolicitudesCSV');
if (exportarSolicitudesBtn) {
    exportarSolicitudesBtn.addEventListener('click', async () => {
        if (userRole !== 'admin' && userRole !== 'usuario') { // Permiso para exportar
            showMessage('No tienes permiso para exportar solicitudes.', 'error');
            return;
        }
        if (!currentUserId) {
            showMessage('Debes iniciar sesión para exportar solicitudes.', 'error');
            return;
        }

        const solicitudes = [];
        try {
            if (userRole === 'admin') {
                const usersSnapshot = await getDocs(collection(db, 'users'));
                for (const userDoc of usersSnapshot.docs) {
                    const userUid = userDoc.id;
                    const userSolicitudesSnapshot = await getDocs(getSolicitudesCollectionRef(userUid));
                    userSolicitudesSnapshot.forEach(doc => solicitudes.push(doc.data()));
                }
                const publicSolicitudesSnapshot = await getDocs(getPublicSolicitudesCollectionRef());
                publicSolicitudesSnapshot.forEach(doc => solicitudes.push(doc.data()));
            } else {
                const userSolicitudesSnapshot = await getDocs(getSolicitudesCollectionRef(currentUserId));
                userSolicitudesSnapshot.forEach(doc => solicitudes.push(doc.data()));
            }

            if (solicitudes.length === 0) {
                showMessage('No hay solicitudes para exportar.', 'info');
                return;
            }

            const headers = ['nombreJugador', 'modeloRaqueta', 'tipoCuerda', 'tensión', 'fechaSolicitud', 'fechaEntregaEstimada', 'fechaEntregaReal', 'estadoEntrega', 'notas', 'createdAt', 'updatedAt'];
            const csv = convertirAcsv(solicitudes, headers);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'solicitudes.csv';
            link.click();
            showMessage('Solicitudes exportadas correctamente.', 'success');
        } catch (error) {
            console.error("Error al exportar solicitudes:", error);
            showMessage('Error al exportar solicitudes.', 'error');
        }
    });
}

// Importar CSV
function importarCSV(csvContent, tipo) {
    if (userRole !== 'admin') { // Solo admin puede importar
        showMessage('Solo un administrador puede importar datos.', 'error');
        return;
    }
    if (!currentUserId) {
        showMessage('Debes iniciar sesión para importar datos.', 'error');
        return;
    }

    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
        showMessage('El archivo CSV está vacío.', 'error');
        return;
    }

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const dataToImport = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Dividir por coma, ignorando comas dentro de comillas
        if (values.length !== headers.length) {
            console.warn(`Saltando línea ${i + 1} debido a un número de columnas incorrecto.`);
            continue;
        }
        const rowData = {};
        headers.forEach((header, index) => {
            rowData[header] = values[index].replace(/"/g, '').trim();
        });
        dataToImport.push(rowData);
    }

    if (dataToImport.length === 0) {
        showMessage('No se pudieron parsear datos válidos del archivo CSV.', 'error');
        return;
    }

    // Modal de confirmación para importación
    const confirmImportModal = document.getElementById('confirmImportModal');
    const importMessage = document.getElementById('importMessage');
    const confirmImportBtn = document.getElementById('confirmImportBtn');
    const cancelImportBtn = document.getElementById('cancelImportBtn');

    if (importMessage) {
        importMessage.textContent = `Se van a importar ${dataToImport.length} ${tipo}. ¿Deseas continuar?`;
    }
    if (confirmImportModal) confirmImportModal.classList.remove('hidden');

    if (confirmImportBtn) {
        confirmImportBtn.onclick = async () => {
            if (confirmImportModal) confirmImportModal.classList.add('hidden');
            try {
                let collectionRef;
                if (tipo === 'jugadores') {
                    collectionRef = getJugadoresCollectionRef(currentUserId);
                } else if (tipo === 'solicitudes') {
                    collectionRef = getSolicitudesCollectionRef(currentUserId);
                }

                for (const item of dataToImport) {
                    // Generar un nuevo ID de documento para cada importación
                    await addDoc(collectionRef, { ...item, createdAt: new Date().toISOString() });
                }

                showMessage(`${dataToImport.length} ${tipo} importados correctamente.`, 'success');
                if (tipo === 'jugadores') {
                    cargarJugadores();
                } else if (tipo === 'solicitudes') {
                    cargarSolicitudes();
                }
            } catch (error) {
                console.error(`Error al importar ${tipo}:`, error);
                showMessage(`Error al importar ${tipo}: ${error.message}`, 'error');
            }
        };
    }

    if (cancelImportBtn) {
        cancelImportBtn.onclick = () => {
            if (confirmImportModal) confirmImportModal.classList.add('hidden');
            showMessage('Importación cancelada.', 'info');
        };
    }
}

// Inyectar botones de importación dinámicamente
document.addEventListener('DOMContentLoaded', () => {
    const verJugadoresTab = document.getElementById('verJugadoresTab');
    const verSolicitudesTab = document.getElementById('verSolicitudesTab');

    // Contenedor para botones de importación de Jugadores
    if (verJugadoresTab) {
        const importJugadoresContainer = document.createElement('div');
        importJugadoresContainer.className = 'admin-only mb-4 p-4 bg-gray-100 rounded-lg flex flex-col items-center justify-center';
        importJugadoresContainer.innerHTML = `
            <h3 class="text-lg font-semibold mb-2">Importar Jugadores</h3>
            <button id="btnImportJugadoresCSV" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center">
                <i class="fas fa-file-import mr-2"></i>Importar Jugadores CSV
            </button>
            <p class="mt-2 text-xs text-gray-500">Formato completo como en exportación</p>
        `;
        verJugadoresTab.prepend(importJugadoresContainer); // Añadir al inicio del contenido de la pestaña

        document.getElementById('btnImportJugadoresCSV').addEventListener('click', () => {
            if (userRole !== 'admin') { showMessage('Solo un administrador puede importar datos.', 'error'); return; }
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
    }

    // Contenedor para botones de importación de Solicitudes
    if (verSolicitudesTab) {
        const importSolicitudesContainer = document.createElement('div');
        importSolicitudesContainer.className = 'admin-only mb-4 p-4 bg-gray-100 rounded-lg flex flex-col items-center justify-center';
        importSolicitudesContainer.innerHTML = `
            <h3 class="text-lg font-semibold mb-2">Importar Solicitudes</h3>
            <button id="btnImportSolicitudesCSV" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center">
                <i class="fas fa-file-import mr-2"></i>Importar Solicitudes CSV
            </button>
            <p class="mt-2 text-xs text-gray-500">Formato completo como en exportación</p>
        `;
        verSolicitudesTab.prepend(importSolicitudesContainer); // Añadir al inicio del contenido de la pestaña

        document.getElementById('btnImportSolicitudesCSV').addEventListener('click', () => {
            if (userRole !== 'admin') { showMessage('Solo un administrador puede importar datos.', 'error'); return; }
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
    }

    // Cargar datos inicialmente (después de que el DOM esté listo y el usuario autenticado)
    cargarJugadores();
    cargarSolicitudes();
});

// **********************************************
// Gráficos (Chart.js)
// **********************************************

let solicitudesChart;

function actualizarEstadisticasSolicitudes(solicitudes) {
    const estadoCounts = {
        'Pendiente': 0,
        'En Proceso': 0,
        'Listo para Recoger': 0,
        'Entregado': 0,
        'Cancelado': 0
    };

    solicitudes.forEach(solicitud => {
        if (solicitud.estadoEntrega && estadoCounts.hasOwnProperty(solicitud.estadoEntrega)) {
            estadoCounts[solicitud.estadoEntrega]++;
        }
    });

    const chartData = {
        labels: Object.keys(estadoCounts),
        datasets: [{
            label: 'Número de Solicitudes',
            data: Object.values(estadoCounts),
            backgroundColor: [
                'rgba(255, 205, 86, 0.7)', // Pendiente (Amarillo)
                'rgba(54, 162, 235, 0.7)', // En Proceso (Azul)
                'rgba(75, 192, 192, 0.7)', // Listo para Recoger (Verde Teal)
                'rgba(201, 203, 207, 0.7)', // Entregado (Gris)
                'rgba(255, 99, 132, 0.7)'  // Cancelado (Rojo)
            ],
            borderColor: [
                'rgb(255, 205, 86)',
                'rgb(54, 162, 235)',
                'rgb(75, 192, 192)',
                'rgb(201, 203, 207)',
                'rgb(255, 99, 132)'
            ],
            borderWidth: 1
        }]
    };

    const config = {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) { if (Number.isInteger(value)) return value; },
                        color: '#4A5568' // gray-700
                    },
                    grid: {
                        color: '#E2E8F0' // gray-200
                    }
                },
                x: {
                    ticks: {
                        color: '#4A5568' // gray-700
                    },
                    grid: {
                        color: '#E2E8F0' // gray-200
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#4A5568' // gray-700
                    }
                },
                title: {
                    display: true,
                    text: 'Estado de Solicitudes de Encordado',
                    color: '#2D3748', // gray-800
                    font: {
                        size: 16
                    }
                }
            }
        }
    };

    const ctx = document.getElementById('solicitudesChart');
    if (ctx) {
        if (solicitudesChart) {
            solicitudesChart.destroy(); // Destruir instancia anterior si existe
        }
        solicitudesChart = new Chart(ctx, config);
    }
}

// Asegurarse de que el gráfico se actualice al cambiar de pestaña a "Resumen"
document.addEventListener('DOMContentLoaded', () => {
    const resumenTabLink = document.querySelector('.tab-link[data-tab="tab-resumen"]');
    if (resumenTabLink) {
        resumenTabLink.addEventListener('click', () => {
            // No es necesario llamar a cargarSolicitudes aquí, ya que se llama en onAuthStateChanged
            // y la tabla de solicitudes se actualiza al cargar. Solo necesitamos re-renderizar el gráfico.
            cargarSolicitudes(); // Esto asegura que los datos del gráfico se refresquen si los datos de la tabla cambian
        });
    }
});
