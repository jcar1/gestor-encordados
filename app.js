// app.js - Versión modular y robusta para Gestor de Encordados
import { app } from './firebase-init.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  obtenerJugadores,
  agregarJugador,
  actualizarJugador,
  eliminarJugador,
  buscarJugador,
} from './jugadores.js';
import {
  obtenerSolicitudes,
  agregarSolicitud,
  actualizarSolicitud,
  eliminarSolicitud,
  buscarSolicitudesPorJugador,
} from './solicitudes.js';
import {
  calcularEstadisticasAvanzadas,
  generarDatosGraficos,
} from './estadisticas.js';
import {
  formatearFecha,
  formatearMoneda,
  validarEmail,
  csvToJson,
} from './utilidades.js';
import { mostrarError } from './ui-helpers.js';

// ---- Configuración general y variables globales ----
const auth = getAuth(app);
const ADMIN_EMAILS = ['jcsueca@gmail.com']; // Modifica según tus necesidades

let userId = null;
let userEmail = null;
let userRole = 'user';

// ---- Inicialización de la aplicación ----
document.addEventListener('DOMContentLoaded', () => {
  setupAuthUI();
  setupTabs();
  setupLogout();
  setupSolicitudForm();
  setupJugadorForm();
  setupFiltros();
  setupImportExport();
  setupAdminPanel();
  setupInactivityTimer();
});

// ---- Autenticación ----
function setupAuthUI() {
  const loginContainer = document.getElementById('loginContainer');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginForm = document.getElementById('loginForm');

  onAuthStateChanged(auth, (user) => {
    if (user) {
      userId = user.uid;
      userEmail = user.email;
      userRole = ADMIN_EMAILS.includes(user.email) ? 'admin' : 'user';
      document.getElementById('userIdDisplay').textContent = userId;
      loginContainer.style.display = 'none';
      document.querySelector('.container').style.display = '';
      logoutBtn.style.display = '';
      document.getElementById('adminPanel').style.display = userRole === 'admin' ? 'block' : 'none';
      loadInitialData();
    } else {
      userId = null;
      userEmail = null;
      userRole = 'user';
      loginContainer.style.display = '';
      document.querySelector('.container').style.display = 'none';
      logoutBtn.style.display = 'none';
      document.getElementById('adminPanel').style.display = 'none';
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.loginEmail.value.trim();
    const password = loginForm.loginPassword.value;
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      document.getElementById('loginError').textContent = '';
    } catch (err) {
      document.getElementById('loginError').textContent = 'Credenciales incorrectas';
    }
  });
}

function setupLogout() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
  });
}

// ---- Tabs ----
function setupTabs() {
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      showTab(btn.getAttribute('onclick').match(/'([^']+)'/)[1]);
    });
  });
}

function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  const tab = document.getElementById(tabId);
  if (tab) tab.style.display = '';
  const btn = document.querySelector(`.tab-button[onclick="showTab('${tabId}')"]`);
  if (btn) btn.classList.add('active');
  // Carga asociada
  if (tabId === 'verSolicitudesTab') loadSolicitudes();
  if (tabId === 'estadisticasTab') actualizarEstadisticas();
  if (tabId === 'verJugadoresTab') loadJugadores();
}
window.showTab = showTab;
// ---- Inactividad ----
let inactivityTimer;
function setupInactivityTimer() {
  const timeout = 30 * 60 * 1000;
  const reset = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      signOut(auth);
      showModal('Sesión cerrada por inactividad', 'warning');
    }, timeout);
  };
  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(e =>
    document.addEventListener(e, reset)
  );
  reset();
}

// ---- Carga inicial ----
async function loadInitialData() {
  await Promise.all([loadJugadores(), loadSolicitudes()]);
  document.getElementById('solicitudFechaSolicitud').valueAsDate = new Date();
}

// ---- Jugadores ----
async function loadJugadores() {
  const tbody = document.getElementById('listaJugadores');
  try {
    const jugadores = await obtenerJugadores();
    tbody.innerHTML = jugadores.length
      ? jugadores.map(j => `
        <tr>
          <td>${j.codigo || ''}</td>
          <td>${j.nombreCompleto || ''}<span class="block text-xs text-gray-500">${j.telefono || ''}</span></td>
          <td>${j.telefono || ''}</td>
          <td>${j.email || ''}</td>
          <td>${j.marcaRaqueta || ''} ${j.modeloRaqueta || ''}</td>
          <td>${formatearFecha(j.fechaRegistro)}</td>
          <td>
            <button onclick="openEditJugadorModal('${j.id}')" class="text-blue-600 hover:text-blue-900 mr-2"><i class="fas fa-edit"></i></button>
            <button onclick="confirmDeleteJugador('${j.id}', '${j.nombreCompleto.replace(/'/g, "\\'")}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('')
      : `<tr><td colspan="7" class="text-center">No hay jugadores.</td></tr>`;
  } catch (err) {
    mostrarError('Error al cargar jugadores');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500">Error al cargar jugadores.</td></tr>`;
  }
}

// ---- Solicitudes ----
async function loadSolicitudes() {
  const tbody = document.getElementById('listaSolicitudes');
  try {
    const solicitudes = await obtenerSolicitudes();
    window._solicitudesCache = solicitudes;
    tbody.innerHTML = solicitudes.length
      ? solicitudes.map(s => `
        <tr>
          <td><input type="checkbox" class="solicitud-checkbox" value="${s.id}"></td>
          <td>${s.nombreJugador || s.jugadorId}</td>
          <td>${s.marcaRaqueta || ''} ${s.modeloRaqueta || ''}</td>
          <td>${s.tensionVertical || ''}/${s.tensionHorizontal || ''}</td>
          <td>${formatearFecha(s.fechaSolicitud)}</td>
          <td>${formatearFecha(s.fechaEntregaEstimada)}</td>
          <td>${formatearMoneda(s.precio)}</td>
          <td>${s.estadoPago}</td>
          <td>${s.estadoEntrega}</td>
          <td>
            <button onclick="openEditSolicitudModal('${s.id}')" class="text-blue-600 hover:text-blue-900 mr-2"><i class="fas fa-edit"></i></button>
            <button onclick="confirmDeleteSolicitud('${s.id}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('')
      : `<tr><td colspan="10" class="text-center">No hay solicitudes.</td></tr>`;
    actualizarResumenSolicitudes(solicitudes);
    actualizarEstadisticas(solicitudes);
  } catch (err) {
    mostrarError('Error al cargar solicitudes');
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-red-500">Error al cargar solicitudes.</td></tr>`;
  }
}

// ---- Formularios ----
function setupSolicitudForm() {
  const form = document.getElementById('formNuevaSolicitud');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.tensionVertical = parseFloat(data.tensionVertical);
    data.tensionHorizontal = parseFloat(data.tensionHorizontal);
    data.precio = parseFloat(data.precio) || 0;
    data.cuerdaIncluida = !!form.cuerdaIncluida.checked;
    // Validaciones básicas
    if (!data.jugadorId || !data.nombreJugador) {
      mostrarError("Debe seleccionar un jugador válido");
      return;
    }
    try {
      await agregarSolicitud(data);
      showModal('Solicitud registrada correctamente', 'success');
      form.reset();
      document.getElementById('solicitudFechaSolicitud').valueAsDate = new Date();
      loadSolicitudes();
    } catch (err) {
      mostrarError('Error al registrar solicitud');
    }
  });
}

function setupJugadorForm() {
  const form = document.getElementById('formRegistrarJugador');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.codigo || !data.nombreCompleto) {
      mostrarError('El código y nombre son obligatorios');
      return;
    }
    if (data.email && !validarEmail(data.email)) {
      mostrarError('El email no tiene un formato válido');
      return;
    }
    try {
      await agregarJugador(data);
      showModal('Jugador registrado correctamente', 'success');
      form.reset();
      loadJugadores();
    } catch (err) {
      mostrarError('Error al registrar jugador');
    }
  });
}

// ---- Filtros y búsqueda ----
function setupFiltros() {
  document.getElementById('btnAplicarFiltros').addEventListener('click', loadSolicitudes);
  document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
    ['filtroJugador', 'filtroEstadoPago', 'filtroEstadoEntrega', 'filtroFechaSolicitudDesde', 'filtroFechaSolicitudHasta', 'filtroFechaPagoDesde', 'filtroFechaPagoHasta']
      .forEach(id => document.getElementById(id).value = '');
    loadSolicitudes();
  });
}

// ---- Importar / Exportar CSV ----
function setupImportExport() {
  document.getElementById('btnImportCsv').addEventListener('click', async () => {
    const fileInput = document.getElementById('importFile');
    if (!fileInput.files.length) {
      mostrarError('Selecciona un archivo CSV');
      return;
    }
    try {
      const text = await fileInput.files[0].text();
      const data = csvToJson(text);
      for (const item of data) {
        await agregarSolicitud(item);
      }
      showModal('Importación completada', 'success');
      loadSolicitudes();
    } catch (err) {
      mostrarError('Error al importar CSV');
    }
    fileInput.value = '';
  });

  document.getElementById('btnExportCsv').addEventListener('click', () => {
    const solicitudes = window._solicitudesCache || [];
    if (!solicitudes.length) {
      mostrarError('No hay datos para exportar');
      return;
    }
    const headers = ["Código Jugador", "Nombre Jugador", "Marca Raqueta", "Modelo Raqueta", "Tensión Vertical", "Tensión Horizontal", "Tipo Cuerda", "Cuerda Incluida", "Fecha Solicitud", "Fecha Entrega Estimada", "Precio", "Estado Pago", "Estado Entrega", "Notas", "Fecha Pago"];
    let csv = headers.join(',') + '\n';
    solicitudes.forEach(s => {
      const row = [
        s.codigoJugador || '',
        s.nombreJugador || '',
        s.marcaRaqueta || '',
        s.modeloRaqueta || '',
        s.tensionVertical || '',
        s.tensionHorizontal || '',
        s.tipoCuerda || '',
        s.cuerdaIncluida ? "Sí" : "No",
        formatearFecha(s.fechaSolicitud),
        formatearFecha(s.fechaEntregaEstimada),
        s.precio || '',
        s.estadoPago || '',
        s.estadoEntrega || '',
        s.notas || '',
        formatearFecha(s.fechaPago),
      ];
      csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solicitudes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  });

  document.getElementById('btnDeleteSelected').addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('.solicitud-checkbox:checked');
    if (!checkboxes.length) {
      mostrarError('Selecciona al menos una solicitud');
      return;
    }
    if (!confirm('¿Seguro que deseas eliminar las solicitudes seleccionadas?')) return;
    for (const checkbox of checkboxes) {
      await eliminarSolicitud(checkbox.value);
    }
    showModal('Solicitudes eliminadas', 'success');
    loadSolicitudes();
  });
}

// ---- Admin panel ----
function setupAdminPanel() {
  if (userRole !== 'admin') return;
  // Implementa aquí funciones de admin (logs, export global, settings, etc.)
  // Ejemplo:
  window.showAccessLogs = () => alert('Funcionalidad de logs pendiente');
  window.exportAllData = () => alert('Funcionalidad de exportación global pendiente');
  window.showSecuritySettings = () => alert('Funcionalidad de configuración de seguridad pendiente');
}

// ---- Resumen y estadísticas ----
function actualizarResumenSolicitudes(solicitudes = window._solicitudesCache || []) {
  const total = solicitudes.length;
  const pagadas = solicitudes.filter(s => s.estadoPago === 'Pagado').length;
  const pendientes = total - pagadas;
  const totalPagado = solicitudes.filter(s => s.estadoPago === 'Pagado').reduce((sum, s) => sum + (s.precio || 0), 0);
  const totalPendiente = solicitudes.filter(s => s.estadoPago !== 'Pagado').reduce((sum, s) => sum + (s.precio || 0), 0);
  const totalGeneral = solicitudes.reduce((sum, s) => sum + (s.precio || 0), 0);
  document.getElementById('resumenTotalSolicitudes').textContent = total;
  document.getElementById('resumenSolicitudesPagadas').textContent = `${pagadas} (${formatearMoneda(totalPagado)})`;
  document.getElementById('resumenSolicitudesPendientes').textContent = `${pendientes} (${formatearMoneda(totalPendiente)})`;
  document.getElementById('resumenTotalIngresos').textContent = formatearMoneda(totalGeneral);
}

function actualizarEstadisticas(solicitudes = window._solicitudesCache || []) {
  const stats = calcularEstadisticasAvanzadas(solicitudes);
  document.getElementById('statTotalSolicitudes').textContent = stats.total || 0;
  document.getElementById('statIngresosTotales').textContent = formatearMoneda(stats.ingresos || 0);
  document.getElementById('statPrecioPromedio').textContent = formatearMoneda(stats.promedio || 0);
  document.getElementById('statSolicitudesHoy').textContent = stats.solicitudesHoy || 0;
  document.getElementById('statIngresos30Dias').textContent = formatearMoneda(stats.ingresos30Dias || 0);
  document.getElementById('statPromedioDiario').textContent = formatearMoneda(stats.promedioDiario || 0);
  actualizarGraficos(solicitudes);
}

// ---- Gráficos ----
let pagoChart, entregaChart, ingresosChart, jugadoresChart;
function actualizarGraficos(solicitudes = window._solicitudesCache || []) {
  // Estado de Pago
  const estadosPago = { Pendiente: 0, Pagado: 0 };
  const estadosEntrega = { 'Pendiente': 0, 'En Proceso': 0, 'Listo para Recoger': 0, 'Entregado': 0, 'Cancelado': 0 };
  solicitudes.forEach(s => {
    estadosPago[s.estadoPago] = (estadosPago[s.estadoPago] || 0) + 1;
    estadosEntrega[s.estadoEntrega] = (estadosEntrega[s.estadoEntrega] || 0) + 1;
  });

  if (window.Chart) {
    // Gráfico de pago
    if (pagoChart) pagoChart.destroy();
    const pagoCtx = document.getElementById('pagoChart').getContext('2d');
    pagoChart = new Chart(pagoCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(estadosPago),
        datasets: [{ data: Object.values(estadosPago), backgroundColor: ['#f59e0b', '#10b981'] }]
      },
      options: { plugins: { legend: { position: 'bottom' } }, responsive: true }
    });
    // Gráfico de entrega
    if (entregaChart) entregaChart.destroy();
    const entregaCtx = document.getElementById('entregaChart').getContext('2d');
    entregaChart = new Chart(entregaCtx, {
      type: 'pie',
      data: {
        labels: Object.keys(estadosEntrega),
        datasets: [{ data: Object.values(estadosEntrega), backgroundColor: ['#ef4444', '#3b82f6', '#8b5cf6', '#10b981', '#9ca3af'] }]
      },
      options: { plugins: { legend: { position: 'bottom' } }, responsive: true }
    });
    // Gráfico de ingresos mensuales
    const datosMes = generarDatosGraficos(solicitudes).porMes;
    if (ingresosChart) ingresosChart.destroy();
    const ingresosCtx = document.getElementById('ingresosChart').getContext('2d');
    ingresosChart = new Chart(ingresosCtx, {
      type: 'bar',
      data: {
        labels: datosMes.map(d => d.mes),
        datasets: [{ label: 'Ingresos (€)', data: datosMes.map(d => d.total), backgroundColor: '#3b82f6' }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
    // Gráfico top 5 jugadores
    const jugadoresCount = {};
    solicitudes.forEach(s => {
      const nombre = s.nombreJugador || s.jugadorId;
      jugadoresCount[nombre] = (jugadoresCount[nombre] || 0) + 1;
    });
    const topJugadores = Object.entries(jugadoresCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (jugadoresChart) jugadoresChart.destroy();
    const jugadoresCtx = document.getElementById('jugadoresChart').getContext('2d');
    jugadoresChart = new Chart(jugadoresCtx, {
      type: 'bar',
      data: {
        labels: topJugadores.map(j => j[0]),
        datasets: [{ label: 'Solicitudes', data: topJugadores.map(j => j[1]), backgroundColor: '#8b5cf6' }]
      },
      options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
    });
  }
}

// ---- Modales ----
function showModal(message, type = 'info') {
  const modal = document.getElementById('messageModal');
  const text = document.getElementById('modalMessageText');
  text.textContent = message;
  text.className = 'text-lg mb-4';
  if (type === 'error') text.classList.add('text-red-600');
  if (type === 'success') text.classList.add('text-green-600');
  if (type === 'warning') text.classList.add('text-yellow-600');
  modal.style.display = 'flex';
}
document.getElementById('modalCloseButton').onclick = () =>
  document.getElementById('messageModal').style.display = 'none';

// ---- Editar y borrar ----
window.openEditJugadorModal = async (id) => {
  // Implementa modal de edición usando tu actual estructura de modales
  alert('Funcionalidad de edición de jugador pendiente');
};
window.confirmDeleteJugador = async (id, nombre) => {
  if (!confirm(`¿Eliminar al jugador "${nombre}"?`)) return;
  await eliminarJugador(id);
  loadJugadores();
};

window.openEditSolicitudModal = async (id) => {
  alert('Funcionalidad de edición de solicitud pendiente');
};
window.confirmDeleteSolicitud = async (id) => {
  if (!confirm('¿Eliminar esta solicitud?')) return;
  await eliminarSolicitud(id);
  loadSolicitudes();
};

// ---- Exponer funciones admin ----
window.showAccessLogs = () => alert('Funcionalidad de logs admin');
window.exportAllData = () => alert('Funcionalidad de exportar todo');
window.showSecuritySettings = () => alert('Config de seguridad');
