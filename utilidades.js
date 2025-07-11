// --- FUNCIONES DE SEGURIDAD MEJORADAS ---
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip || 'unknown';
    } catch (error) {
        console.error("Error obteniendo IP:", error);
        return 'unknown';
    }
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function checkPermissions(requiredRole = 'user') {
    if (!isAuthReady) return false;
    if (requiredRole === 'admin' && userRole !== 'admin') {
        showModalMessage("Acceso denegado: se requieren privilegios de administrador", "error");
        return false;
    }
    return true;
}

let inactivityTimer;
function setupInactivityTimer() {
    const inactivityTimeout = 30 * 60 * 1000; // 30 minutos
    
    const resetTimer = () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            signOut(auth);
            showModalMessage("Sesión cerrada por inactividad", "warning");
        }, inactivityTimeout);
    };
    
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetTimer, false);
    });
    
    resetTimer();
}

async function logAction(action, details = {}) {
    try {
        await setDoc(
            doc(db, `users/${userId}/private/auditoria`), 
            {
                action,
                details: JSON.stringify(details),
                timestamp: Timestamp.now(),
                ip: await getClientIP(),
                userAgent: navigator.userAgent
            }, 
            { merge: true }
        ); // ← Paréntesis correctamente cerrados
    } catch (error) {
        console.error("Error registrando acción:", error);
    }
}

// --- MECANISMO DE REVERSIÓN ---
function setupRollbackButton() {
    if (document.getElementById('rollbackBtn')) return;
    
    const rollbackBtn = document.createElement('button');
    rollbackBtn.id = 'rollbackBtn';
    rollbackBtn.className = 'fixed bottom-4 left-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg z-50';
    rollbackBtn.innerHTML = '<i class="fas fa-undo mr-2"></i>Restaurar Versión Anterior';
    rollbackBtn.onclick = () => {
        showConfirmModal("¿Restaurar versión anterior? Se perderán las mejoras de seguridad.", () => {
            localStorage.setItem('useLegacyVersion', 'true');
            window.location.reload();
        });
    };
    document.body.appendChild(rollbackBtn);
    
    rollbackBtn.style.display = userRole === 'admin' ? 'block' : 'none';
}

// --- OBSERVADOR DE AUTENTICACIÓN ACTUALIZADO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;
        document.getElementById('userIdDisplay').textContent = userId;
        document.getElementById('loginContainer').style.display = 'none';
        document.querySelector('.container').style.display = '';
        document.getElementById('logoutBtn').style.display = '';
        
        // Verificar rol de usuario
        userRole = ADMIN_EMAILS.includes(user.email) ? 'admin' : 'user';
        
        // Registrar acceso
        const loginTime = new Date();
        lastLoginDate = loginTime;
        const ip = await getClientIP();
        loginHistory.push({ date: loginTime, ip });
        
        try {
            await setDoc(doc(db, `users/${userId}/private/accesos`), {
                lastLogin: Timestamp.fromDate(loginTime),
                loginHistory: arrayUnion({ date: Timestamp.now(), ip }),
                role: userRole,
                email: user.email
            }, { merge: true });
        } catch (error) {
            console.error("Error registrando acceso:", error);
        }

        if (!isAuthReady) {
            jugadoresCollectionRef = collection(db, `users/${userId}/jugadores`);
            solicitudesCollectionRef = collection(db, `users/${userId}/solicitudes`);
            isAuthReady = true;
            initApplication();
        }
    } else {
        userRole = 'user';
        lastLoginDate = null;
        document.getElementById('loginContainer').style.display = '';
        document.querySelector('.container').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
        isAuthReady = false;
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
               
                const jugador = { id: docSnap.id, ...docSnap.data(), refPath: docSnap.ref.path };
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
        let jugadorDocRef;
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

    // Verificar que el código sea un número
    if (isNaN(parseInt(codigo))) {
        showError('editCodigo', "El código debe ser un número");
        return;
    }

    // Verificar si el nombre ya existe (excluyendo el jugador actual)
    const nombreExists = jugadoresData.some(j => j.nombreCompleto.toLowerCase() === nombreCompleto.toLowerCase() && j.id !== jugadorId);
    if (nombreExists) {
        showError('editNombreCompleto', "Este nombre ya está registrado");
        return;
    }

    try {
        
        let jugadorDocRef;
        const jugador = jugadoresData.find(j => j.id === jugadorId);
        if (userRole === 'admin' && jugador && jugador.refPath) {
            jugadorDocRef = doc(db, jugador.refPath);
        } else {
            jugadorDocRef = doc(jugadoresCollectionRef, jugadorId);
}
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
                const solicitud = { id: docSnap.id, ...docSnap.data(), refPath: docSnap.ref.path };
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
        let solicitudDocRef;
        const solicitud = currentSolicitudesData.find(s => s.id === solicitudId);
        if (userRole === 'admin' && solicitud && solicitud.refPath) {
          solicitudDocRef = doc(db, solicitud.refPath);
        } else {
            solicitudDocRef = doc(solicitudesCollectionRef, solicitudId);
        }
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
        let solicitudDocRef;
        const solicitud = currentSolicitudesData.find(s => s.id === solicitudId);
        if (userRole === 'admin' && solicitud && solicitud.refPath) {
          solicitudDocRef = doc(db, solicitud.refPath);
        } else {
           solicitudDocRef = doc(solicitudesCollectionRef, solicitudId);
    }
        
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
                let solicitudDocRef;
                const solicitud = currentSolicitudesData.find(s => s.id === solicitudId);
                if (userRole === 'admin' && solicitud && solicitud.refPath) {
                     solicitudDocRef = doc(db, solicitud.refPath);
                } else {
                    solicitudDocRef = doc(solicitudesCollectionRef, solicitudId);
            }
                await deleteDoc(solicitudDocRef);
                    
                showModalMessage("Solicitud eliminada correctamente.", "success");
            } catch (error) {
                showModalMessage(`Error al eliminar solicitud: ${error.message}`, "error");
            }
        }
    );
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
                    
