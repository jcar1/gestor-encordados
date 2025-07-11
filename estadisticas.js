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
    
