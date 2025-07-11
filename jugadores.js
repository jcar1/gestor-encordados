// --- AUTOCOMPLETADO DE JUGADORES ---
// [El código anterior permanece igual hasta la función setupAutocomplete]

// --- AUTOCOMPLETADO DE JUGADORES MEJORADO ---
function setupAutocomplete() {
    const input = document.getElementById('solicitudJugadorNombre');
    const hiddenInput = document.getElementById('solicitudJugadorId');
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.className = 'autocomplete-items absolute z-10 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto w-full';
    input.parentNode.appendChild(autocompleteContainer);

    input.addEventListener('input', function() {
        const val = this.value.trim().toLowerCase();
        autocompleteContainer.innerHTML = '';
        
        if (val.length < 2) {
            hiddenInput.value = '';
            // Limpiar campos de raqueta si no hay jugador seleccionado
            document.getElementById('solicitudMarcaRaqueta').value = '';
            document.getElementById('solicitudModeloRaqueta').value = '';
            document.getElementById('solicitudTensionVertical').value = '';
            document.getElementById('solicitudTensionHorizontal').value = '';
            document.getElementById('solicitudTipoCuerda').value = '';
            return;
        }

        const matches = jugadoresData.filter(jugador => 
            jugador.nombreCompleto.toLowerCase().includes(val) || 
            jugador.codigo.toString().includes(val)
        ).slice(0, 10); // Mostrar hasta 10 resultados

        if (matches.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'px-4 py-2 text-gray-500';
            noResults.textContent = 'No se encontraron jugadores';
            autocompleteContainer.appendChild(noResults);
            return;
        }

        matches.forEach(jugador => {
            const item = document.createElement('div');
            item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer';
            item.innerHTML = `
                <div class="font-semibold">${jugador.nombreCompleto}</div>
                <div class="text-sm text-gray-600">
                    <span class="font-medium">Código:</span> ${jugador.codigo}
                    ${jugador.marcaRaqueta ? `<span class="ml-2"><span class="font-medium">Raqueta:</span> ${jugador.marcaRaqueta} ${jugador.modeloRaqueta || ''}</span>` : ''}
                </div>
            `;
            
            item.addEventListener('click', function() {
                input.value = jugador.nombreCompleto;
                hiddenInput.value = jugador.id;
                autocompleteContainer.innerHTML = '';
                
                // Autocompletar datos de raqueta del jugador
                document.getElementById('solicitudMarcaRaqueta').value = jugador.marcaRaqueta || '';
                document.getElementById('solicitudModeloRaqueta').value = jugador.modeloRaqueta || '';
                document.getElementById('solicitudTensionVertical').value = jugador.tensionVertical || '';
                document.getElementById('solicitudTensionHorizontal').value = jugador.tensionHorizontal || '';
                document.getElementById('solicitudTipoCuerda').value = jugador.tipoCuerda || '';
            });
            
            autocompleteContainer.appendChild(item);
        });
    });

    // Cerrar autocompletado al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (e.target !== input) {
            autocompleteContainer.innerHTML = '';
        }
    });

    // Manejar teclado (flechas arriba/abajo y enter)
    input.addEventListener('keydown', function(e) {
        const items = autocompleteContainer.querySelectorAll('div');
        let currentFocus = -1;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentFocus = Math.min(currentFocus + 1, items.length - 1);
            setActive(items, currentFocus);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentFocus = Math.max(currentFocus - 1, -1);
            setActive(items, currentFocus);
        } else if (e.key === 'Enter' && currentFocus > -1) {
            e.preventDefault();
            items[currentFocus].click();
        }
    });

    function setActive(items, index) {
        items.forEach(item => item.classList.remove('bg-blue-50'));
        if (index >= 0 && index < items.length) {
            items[index].classList.add('bg-blue-50');
            items[index].scrollIntoView({ block: 'nearest' });
        }
    }
}

// [El resto del código permanece igual]


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

        // Busca el jugador en jugadoresData
        const jugador = jugadoresData.find(j => j.id === jugadorId);
        if (userRole === 'admin' && jugador && jugador.refPath) {
            jugadorDocRef = doc(db, jugador.refPath);
        } else {
            jugadorDocRef = doc(jugadoresCollectionRef, jugadorId);
        }

        const docSnap = await getDoc(jugadorDocRef);

        if (docSnap.exists()) {
            const jugadorData = docSnap.data();

            formEditJugador.editJugadorId.value = jugadorId;
            formEditJugador.editJugadorCodigo.value = jugadorData.codigo;
            formEditJugador.editJugadorNombreCompleto.value = jugadorData.nombreCompleto;
            formEditJugador.editJugadorTelefono.value = jugadorData.telefono || '';
            formEditJugador.editJugadorEmail.value = jugadorData.email || '';
            formEditJugador.editJugadorMarcaRaqueta.value = jugadorData.marcaRaqueta || '';
            formEditJugador.editJugadorModeloRaqueta.value = jugadorData.modeloRaqueta || '';
            formEditJugador.editJugadorTensionVertical.value = jugadorData.tensionVertical || '';
            formEditJugador.editJugadorTensionHorizontal.value = jugadorData.tensionHorizontal || '';
            formEditJugador.editJugadorTipoCuerda.value = jugadorData.tipoCuerda || '';

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
                    
// --- MEJORA EN IMPORTACIÓN CSV CON CREACIÓN DE JUGADORES AUTOMÁTICA ---
async function importarCSV(csvText, type = 'solicitudes') {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(/[,;]/).map(h => h.trim());
    
    try {
        if (type === 'jugadores') {
            // Import players
            const batch = writeBatch(db);
            const jugadoresToImport = [];
            
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue;
                
                const values = lines[i].split(/[,;]/).map(v => v.trim());
                
                // Parsear datos del jugador según el formato del CSV
                const jugadorData = {
                    codigo: values[0] ? parseInt(values[0]) : null,
                    nombreCompleto: values[1] || '',
                    marcaRaqueta: values[2] || '',
                    modeloRaqueta: values[3] || '',
                    tensionVertical: values[4] ? parseFloat(values[4]) : null,
                    tensionHorizontal: values[5] ? parseFloat(values[5]) : null,
                    tipoCuerda: values[6] || '',
                    cuerdaIncluida: values[7] ? values[7].toLowerCase() === 'sí' || values[7].toLowerCase() === 'si' : false,
                    fechaRegistro: Timestamp.now(),
                    fechaUltimaActualizacion: Timestamp.now()
                };
                
                if (!jugadorData.codigo || !jugadorData.nombreCompleto) continue;
                
                // Verificar si el jugador ya existe
                const existingQuery = query(jugadoresCollectionRef, where("codigo", "==", jugadorData.codigo));
                const existingSnapshot = await getDocs(existingQuery);
                
                if (!existingSnapshot.empty) {
                    // Actualizar jugador existente
                    const existingDoc = existingSnapshot.docs[0];
                    await updateDoc(existingDoc.ref, {
                        nombreCompleto: jugadorData.nombreCompleto,
                        marcaRaqueta: jugadorData.marcaRaqueta,
                        modeloRaqueta: jugadorData.modeloRaqueta,
                        tensionVertical: jugadorData.tensionVertical,
                        tensionHorizontal: jugadorData.tensionHorizontal,
                        tipoCuerda: jugadorData.tipoCuerda,
                        cuerdaIncluida: jugadorData.cuerdaIncluida,
                        fechaUltimaActualizacion: Timestamp.now()
                    });
                } else {
                    // Crear nuevo jugador
                    const newDocRef = doc(jugadoresCollectionRef);
                    batch.set(newDocRef, jugadorData);
                }
                
                jugadoresToImport.push(jugadorData);
            }
            
            await batch.commit();
            showModalMessage(`${jugadoresToImport.length} jugadores importados/actualizados correctamente`, 'success');
            loadJugadoresParaDropdown();
            loadJugadoresParaFiltros();
            loadJugadoresParaLista();
            
        } else if (type === 'solicitudes') {
            // Import stringing requests
            const batch = writeBatch(db);
            const solicitudesToImport = [];
            const jugadoresMap = {};
            
            // First get all players to map codes to IDs
            const jugadoresSnapshot = await getDocs(jugadoresCollectionRef);
            jugadoresSnapshot.forEach(doc => {
                jugadoresMap[doc.data().codigo] = doc.id;
            });
            
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue;
                
                const values = lines[i].split(/[,;]/).map(v => v.trim());
                if (values.length < headers.length) continue;
                
                const [
                    codigoJugador, nombreJugador, marcaRaqueta, modeloRaqueta,
                    tensionVertical, tensionHorizontal, tipoCuerda, cuerdaIncluida,
                    fechaSolicitud, fechaEntregaEstimada, precio, estadoPago,
                    estadoEntrega, notas, fechaPago
                ] = values;
                
                const jugadorId = jugadoresMap[codigoJugador];
                if (!jugadorId) {
                    console.warn(`Jugador con código ${codigoJugador} no encontrado`);
                    continue;
                }
                
                // Parse dates (dd/mm/yyyy format)
                const parseDate = (dateStr) => {
                    if (!dateStr || dateStr === '') return null;
                    const [day, month, year] = dateStr.split('/');
                    return new Date(year, month - 1, day);
                };
                
                const solicitudData = {
                    jugadorId,
                    nombreJugador,
                    marcaRaqueta: marcaRaqueta || '',
                    modeloRaqueta: modeloRaqueta || '',
                    tensionVertical: parseFloat(tensionVertical) || 0,
                    tensionHorizontal: parseFloat(tensionHorizontal) || 0,
                    tipoCuerda: tipoCuerda || '',
                    cuerdaIncluida: cuerdaIncluida.toLowerCase() === 'sí' || cuerdaIncluida.toLowerCase() === 'si',
                    fechaSolicitud: Timestamp.fromDate(parseDate(fechaSolicitud)),
                    fechaEntregaEstimada: fechaEntregaEstimada ? Timestamp.fromDate(parseDate(fechaEntregaEstimada)) : null,
                    precio: parseFloat(precio) || 0,
                    estadoPago: estadoPago || 'Pendiente',
                    estadoEntrega: estadoEntrega || 'Pendiente',
                    notas: notas || '',
                    fechaPago: fechaPago ? Timestamp.fromDate(parseDate(fechaPago)) : null,
                    fechaCreacion: Timestamp.now(),
                    fechaUltimaActualizacion: Timestamp.now()
                };
                
                const newDocRef = doc(solicitudesCollectionRef);
                batch.set(newDocRef, solicitudData);
                solicitudesToImport.push(solicitudData);
            }
            
            await batch.commit();
            showModalMessage(`${solicitudesToImport.length} solicitudes importadas correctamente`, 'success');
            loadSolicitudes();
        }
    } catch (error) {
        console.error(`Error importing ${type}:`, error);
        showModalMessage(`Error al importar ${type}: ${error.message}`, 'error');
    }
}

// Iniciar la aplicación cuando el DOM esté listo





