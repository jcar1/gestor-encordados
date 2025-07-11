                // Verificar si el jugador tiene solicitudes asociadas
                const q = query(solicitudesCollectionRef, where("jugadorId", "==", jugadorId));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    showModalMessage("No se puede eliminar el jugador porque tiene solicitudes asociadas.", "error");
                    return;
                }
                
                
                let jugadorDocRef;
                const jugador = jugadoresData.find(j => j.id === jugadorId);
                if (userRole === 'admin' && jugador && jugador.refPath) {
                    jugadorDocRef = doc(db, jugador.refPath);
                } else {
                    jugadorDocRef = doc(jugadoresCollectionRef, jugadorId);
            }
                await deleteDoc(jugadorDocRef);

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
                const solicitud = currentSolicitudesData.find(s => s.id === id);
                let docRef;
                if (userRole === 'admin' && solicitud && solicitud.refPath) {
                    docRef = doc(db, solicitud.refPath);
                } else {
                    docRef = doc(solicitudesCollectionRef, id);
                }
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

