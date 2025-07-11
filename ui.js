// ui.js - Manejo de la interfaz de usuario
import { cerrarSesion } from "./auth.js";
import { obtenerJugadores, buscarJugador, eliminarJugador } from "./jugadores.js";
import { obtenerSolicitudes, eliminarSolicitud, agregarSolicitud, actualizarSolicitud } from "./solicitudes.js";
import { calcularEstadisticasAvanzadas, generarDatosGraficos } from "./estadisticas.js";
import { formatearFecha, formatearMoneda, validarSolicitud, csvToJson } from "./utilidades.js";

// Elementos UI
const elementosUI = {
  // Tabs
  tabs: document.querySelectorAll(".tab-button"),
  tabContents: document.querySelectorAll(".tab-content"),
  
  // Dashboard
  statsCards: document.querySelectorAll(".stat-card"),
  ingresosChart: document.getElementById("ingresosChart"),
  cuerdasChart: document.getElementById("cuerdasChart"),
  
  // Solicitudes
  nuevaSolicitudBtn: document.getElementById("nuevaSolicitudBtn"),
  tablaSolicitudes: document.getElementById("tablaSolicitudes"),
  solicitudesBody: document.getElementById("solicitudesBody"),
  filtroEstado: document.getElementById("filtroEstado"),
  filtroDesde: document.getElementById("filtroDesde"),
  filtroHasta: document.getElementById("filtroHasta"),
  aplicarFiltrosBtn: document.getElementById("aplicarFiltrosBtn"),
  
  // Jugadores
  nuevoJugadorBtn: document.getElementById("nuevoJugadorBtn"),
  tablaJugadores: document.getElementById("tablaJugadores"),
  jugadoresBody: document.getElementById("jugadoresBody"),
  buscarJugador: document.getElementById("buscarJugador"),
  buscarJugadorBtn: document.getElementById("buscarJugadorBtn"),
  
  // Importar
  archivoCSV: document.getElementById("archivoCSV"),
  importarCSVBtn: document.getElementById("importarCSVBtn"),
  resultadoImportacion: document.getElementById("resultadoImportacion"),
  
  // Modal
  modal: document.getElementById("modalFormulario"),
  modalContent: document.getElementById("modalContent"),
  closeModal: document.querySelector(".close-modal"),
  
  // Auth
  logoutBtn: document.getElementById("logoutBtn")
};

// Inicializar gráficos
let ingresosChartInstance = null;
let cuerdasChartInstance = null;

// Inicializar UI
export function inicializarUI() {
  // Configurar tabs
  elementosUI.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab");
      cambiarTab(tabId);
    });
  });
  
  // Configurar botón de logout
  elementosUI.logoutBtn.addEventListener("click", async () => {
    try {
      await cerrarSesion();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  });
  
  // Configurar modal
  elementosUI.closeModal.addEventListener("click", cerrarModal);
  window.addEventListener("click", (event) => {
    if (event.target === elementosUI.modal) {
      cerrarModal();
    }
  });
  
  // Configurar solicitudes
  elementosUI.nuevaSolicitudBtn.addEventListener("click", mostrarFormularioSolicitud);
  elementosUI.aplicarFiltrosBtn.addEventListener("click", aplicarFiltrosSolicitudes);
  
  // Configurar jugadores
  elementosUI.nuevoJugadorBtn.addEventListener("click", mostrarFormularioJugador);
  elementosUI.buscarJugadorBtn.addEventListener("click", buscarJugadores);
  elementosUI.buscarJugador.addEventListener("keypress", (e) => {
    if (e.key === "Enter") buscarJugadores();
  });
  
  // Configurar importación
  elementosUI.importarCSVBtn.addEventListener("click", importarCSV);
}

// Cambiar de pestaña
function cambiarTab(tabId) {
  // Actualizar botones de tabs
  elementosUI.tabs.forEach(tab => {
    tab.classList.toggle("active", tab.getAttribute("data-tab") === tabId);
  });
  
  // Actualizar contenido de tabs
  elementosUI.tabContents.forEach(content => {
    content.classList.toggle("active", content.id === tabId);
  });
  
  // Cargar datos específicos si es necesario
  if (tabId === "solicitudes") {
    cargarSolicitudes();
  } else if (tabId === "jugadores") {
    cargarJugadores();
  } else if (tabId === "dashboard") {
    actualizarGraficos();
  }
}

// Modal functions
function abrirModal() {
  elementosUI.modal.style.display = "flex";
}

function cerrarModal() {
  elementosUI.modal.style.display = "none";
  elementosUI.modalContent.innerHTML = "";
}

// Función para mostrar formulario genérico
function mostrarFormulario(titulo, campos, onSubmit) {
  elementosUI.modalContent.innerHTML = `
    <h2>${titulo}</h2>
    <form id="modalForm">
      ${campos.map(campo => `
        <div class="form-group">
          <label for="${campo.id}">${campo.label}</label>
          ${campo.type === "textarea" ? 
            `<textarea id="${campo.id}" ${campo.required ? "required" : ""}>${campo.value || ""}</textarea>` :
            `<input type="${campo.type}" id="${campo.id}" value="${campo.value || ""}" 
             ${campo.required ? "required" : ""} ${campo.options ? `list="${campo.id}-options"` : ""}>
             ${campo.options ? `
               <datalist id="${campo.id}-options">
                 ${campo.options.map(opt => `<option value="${opt}">`).join("")}
               </datalist>
             ` : ""}`
          }
        </div>
      `).join("")}
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  `;
  
  document.getElementById("modalForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await onSubmit();
      cerrarModal();
    } catch (error) {
      console.error("Error al enviar formulario:", error);
    }
  });
  
  abrirModal();
}

// Funciones específicas para jugadores
function mostrarFormularioJugador(jugador = null) {
  const esEdicion = jugador !== null;
  const titulo = esEdicion ? "Editar Jugador" : "Nuevo Jugador";
  
  const campos = [
    { id: "nombreCompleto", label: "Nombre Completo", type: "text", required: true, value: jugador?.nombreCompleto },
    { id: "telefono", label: "Teléfono", type: "tel", value: jugador?.telefono },
    { id: "email", label: "Email", type: "email", value: jugador?.email },
    { id: "nivel", label: "Nivel", type: "text", value: jugador?.nivel, 
      options: ["principiante", "intermedio", "avanzado", "profesional"] },
    { id: "notas", label: "Notas", type: "textarea", value: jugador?.notas }
  ];
  
  mostrarFormulario(titulo, campos, async () => {
    const formData = {
      nombreCompleto: document.getElementById("nombreCompleto").value,
      telefono: document.getElementById("telefono").value,
      email: document.getElementById("email").value,
      nivel: document.getElementById("nivel").value,
      notas: document.getElementById("notas").value
    };
    
    if (esEdicion) {
      await actualizarJugador(jugador.id, formData);
    } else {
      await agregarJugador(formData);
    }
    
    await cargarJugadores();
  });
}

async function cargarJugadores() {
  try {
    const jugadores = await obtenerJugadores();
    renderizarJugadores(jugadores);
  } catch (error) {
    console.error("Error al cargar jugadores:", error);
  }
}

function renderizarJugadores(jugadores) {
  elementosUI.jugadoresBody.innerHTML = jugadores.map(jugador => `
    <tr>
      <td>${jugador.id.substring(0, 6)}</td>
      <td>${jugador.nombreCompleto}</td>
      <td>${jugador.telefono || "-"}</td>
      <td>${jugador.email || "-"}</td>
      <td>${jugador.nivel}</td>
      <td class="acciones">
        <button class="btn-icon editar" data-id="${jugador.id}">✏️</button>
        <button class="btn-icon eliminar" data-id="${jugador.id}">🗑️</button>
      </td>
    </tr>
  `).join("");
  
  // Agregar eventos a los botones
  document.querySelectorAll(".editar").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const jugadorId = e.target.getAttribute("data-id");
      const jugadores = await obtenerJugadores();
      const jugador = jugadores.find(j => j.id === jugadorId);
      mostrarFormularioJugador(jugador);
    });
  });
  
  document.querySelectorAll(".eliminar").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      if (confirm("¿Estás seguro de eliminar este jugador?")) {
        const jugadorId = e.target.getAttribute("data-id");
        await eliminarJugador(jugadorId);
        await cargarJugadores();
      }
    });
  });
}

async function buscarJugadores() {
  const termino = elementosUI.buscarJugador.value.trim();
  if (termino.length === 0) {
    await cargarJugadores();
    return;
  }
  
  try {
    const jugadores = await buscarJugador(termino);
    renderizarJugadores(jugadores);
  } catch (error) {
    console.error("Error al buscar jugadores:", error);
  }
}

// Funciones específicas para solicitudes
function mostrarFormularioSolicitud(solicitud = null) {
  const esEdicion = solicitud !== null;
  const titulo = esEdicion ? "Editar Solicitud" : "Nueva Solicitud";
  
  const campos = [
    { id: "codigoJugador", label: "Código Jugador", type: "text", required: true, value: solicitud?.codigoJugador },
    { id: "nombreJugador", label: "Nombre Jugador", type: "text", required: true, value: solicitud?.nombreJugador },
    { id: "marcaRaqueta", label: "Marca Raqueta", type: "text", value: solicitud?.marcaRaqueta },
    { id: "modeloRaqueta", label: "Modelo Raqueta", type: "text", value: solicitud?.modeloRaqueta },
    { id: "tensionVertical", label: "Tensión Vertical", type: "number", value: solicitud?.tensionVertical },
    { id: "tensionHorizontal", label: "Tensión Horizontal", type: "number", value: solicitud?.tensionHorizontal },
    { id: "tipoCuerda", label: "Tipo Cuerda", type: "text", value: solicitud?.tipoCuerda },
    { id: "cuerdaIncluida", label: "Cuerda Incluida", type: "checkbox", value: solicitud?.cuerdaIncluida === "Sí" },
    { id: "fechaSolicitud", label: "Fecha Solicitud", type: "date", required: true, value: solicitud?.fechaSolicitud?.split("T")[0] },
    { id: "fechaEntregaEstimada", label: "Fecha Entrega Estimada", type: "date", value: solicitud?.fechaEntregaEstimada?.split("T")[0] },
    { id: "precio", label: "Precio (€)", type: "number", step: "0.01", value: solicitud?.precio },
    { id: "estadoPago", label: "Estado Pago", type: "text", value: solicitud?.estadoPago, 
      options: ["pendiente", "pagado", "cancelado"] },
    { id: "estadoEntrega", label: "Estado Entrega", type: "text", value: solicitud?.estadoEntrega, 
      options: ["en_proceso", "completado", "entregado", "cancelado"] },
    { id: "notas", label: "Notas", type: "textarea", value: solicitud?.notas },
    { id: "fechaPago", label: "Fecha Pago", type: "date", value: solicitud?.fechaPago?.split("T")[0] }
  ];
  
  mostrarFormulario(titulo, campos, async () => {
    const formData = {
      codigoJugador: document.getElementById("codigoJugador").value,
      nombreJugador: document.getElementById("nombreJugador").value,
      marcaRaqueta: document.getElementById("marcaRaqueta").value,
      modeloRaqueta: document.getElementById("modeloRaqueta").value,
      tensionVertical: document.getElementById("tensionVertical").value,
      tensionHorizontal: document.getElementById("tensionHorizontal").value,
      tipoCuerda: document.getElementById("tipoCuerda").value,
      cuerdaIncluida: document.getElementById("cuerdaIncluida").checked ? "Sí" : "No",
      fechaSolicitud: document.getElementById("fechaSolicitud").value,
      fechaEntregaEstimada: document.getElementById("fechaEntregaEstimada").value || null,
      precio: document.getElementById("precio").value || 0,
      estadoPago: document.getElementById("estadoPago").value,
      estadoEntrega: document.getElementById("estadoEntrega").value,
      notas: document.getElementById("notas").value,
      fechaPago: document.getElementById("fechaPago").value || null
    };
    
    const validacion = validarSolicitud(formData);
    if (!validacion.valido) {
      alert(`Errores:\n${validacion.errores.join("\n")}`);
      return;
    }
    
    if (esEdicion) {
      await actualizarSolicitud(solicitud.id, formData);
    } else {
      await agregarSolicitud(formData);
    }
    
    await cargarSolicitudes();
  });
}

async function cargarSolicitudes(filtros = {}) {
  try {
    const solicitudes = await obtenerSolicitudes(filtros);
    renderizarSolicitudes(solicitudes);
    
    // Actualizar estadísticas en dashboard
    const stats = calcularEstadisticasAvanzadas(solicitudes);
    actualizarEstadisticas(stats);
    actualizarGraficos(solicitudes);
  } catch (error) {
    console.error("Error al cargar solicitudes:", error);
  }
}

function renderizarSolicitudes(solicitudes) {
  elementosUI.solicitudesBody.innerHTML = solicitudes.map(solicitud => `
    <tr>
      <td><input type="checkbox" class="solicitud-checkbox" data-id="${solicitud.id}"></td>
      <td>${solicitud.codigoJugador}</td>
      <td>${solicitud.nombreJugador}</td>
      <td>${solicitud.marcaRaqueta || "-"} ${solicitud.modeloRaqueta || ""}</td>
      <td>${solicitud.tensionVertical || "-"}/${solicitud.tensionHorizontal || "-"}</td>
      <td>${solicitud.tipoCuerda || "-"} ${solicitud.cuerdaIncluida === "Sí" ? "(incluida)" : ""}</td>
      <td>${formatearFecha(solicitud.fechaSolicitud)}</td>
      <td>${solicitud.fechaEntregaEstimada ? formatearFecha(solicitud.fechaEntregaEstimada) : "-"}</td>
      <td>${formatearMoneda(solicitud.precio)}</td>
      <td>
        <span class="${solicitud.estadoPago === "pagado" ? "paid-indicator" : ""}"></span>
        ${solicitud.estadoPago || "pendiente"}
      </td>
      <td class="acciones">
        <button class="btn-icon editar" data-id="${solicitud.id}">✏️</button>
        <button class="btn-icon eliminar" data-id="${solicitud.id}">🗑️</button>
      </td>
    </tr>
  `).join("");
  
  // Agregar eventos a los botones
  document.querySelectorAll(".editar").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const solicitudId = e.target.getAttribute("data-id");
      const solicitudes = await obtenerSolicitudes();
      const solicitud = solicitudes.find(s => s.id === solicitudId);
      mostrarFormularioSolicitud(solicitud);
    });
  });
  
  document.querySelectorAll(".eliminar").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      if (confirm("¿Estás seguro de eliminar esta solicitud?")) {
        const solicitudId = e.target.getAttribute("data-id");
        await eliminarSolicitud(solicitudId);
        await cargarSolicitudes();
      }
    });
  });
  
  // Configurar checkbox "seleccionar todos"
  elementosUI.selectAllSolicitudes.addEventListener("change", (e) => {
    document.querySelectorAll(".solicitud-checkbox").forEach(checkbox => {
      checkbox.checked = e.target.checked;
    });
  });
}

function aplicarFiltrosSolicitudes() {
  const filtros = {
    estadoPago: elementosUI.filtroEstado.value || undefined,
    desde: elementosUI.filtroDesde.value || undefined,
    hasta: elementosUI.filtroHasta.value || undefined
  };
  
  cargarSolicitudes(filtros);
}

// Funciones para gráficos
function actualizarGraficos(solicitudes) {
  if (!solicitudes) return;
  
  const datosGraficos = generarDatosGraficos(solicitudes);
  
  // Gráfico de ingresos por mes
  if (ingresosChartInstance) {
    ingresosChartInstance.destroy();
  }
  
  ingresosChartInstance = new Chart(elementosUI.ingresosChart, {
    type: "bar",
    data: {
      labels: datosGraficos.porMes.map(item => item.mes),
      datasets: [{
        label: "Ingresos por mes (€)",
        data: datosGraficos.porMes.map(item => item.total),
        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderColor: "rgba(59, 130, 246, 1)",
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
      }
    }
  });
  
  // Gráfico de solicitudes por tipo de cuerda
  if (cuerdasChartInstance) {
    cuerdasChartInstance.destroy();
  }
  
  cuerdasChartInstance = new Chart(elementosUI.cuerdasChart, {
    type: "pie",
    data: {
      labels: datosGraficos.porTipoCuerda.map(item => item.tipo),
      datasets: [{
        data: datosGraficos.porTipoCuerda.map(item => item.cantidad),
        backgroundColor: [
          "rgba(59, 130, 246, 0.7)",
          "rgba(16, 185, 129, 0.7)",
          "rgba(245, 158, 11, 0.7)",
          "rgba(139, 92, 246, 0.7)",
          "rgba(239, 68, 68, 0.7)"
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// Función para importar CSV
async function importarCSV() {
  const file = elementosUI.archivoCSV.files[0];
  if (!file) {
    alert("Por favor selecciona un archivo CSV");
    return;
  }
  
  try {
    const fileText = await readFileAsText(file);
    const datosCSV = csvToJson(fileText);
    
    let exitosas = 0;
    const fallidas = [];
    
    for (const item of datosCSV) {
      try {
        // Convertir formato de fechas
        if (item.FechaSolicitud) {
          const [day, month, year] = item.FechaSolicitud.split("/");
          item.fechaSolicitud = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
        
        if (item.FechaEntregaEstimada) {
          const [day, month, year] = item.FechaEntregaEstimada.split("/");
          item.fechaEntregaEstimada = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
        
        if (item.FechaPago) {
          const [day, month, year] = item.FechaPago.split("/");
          item.fechaPago = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
        
        // Mapear campos del CSV al formato esperado
        const solicitudData = {
          codigoJugador: item["Código Jugador"],
          nombreJugador: item["Nombre Jugador"],
          marcaRaqueta: item["Marca Raqueta"],
          modeloRaqueta: item["Modelo Raqueta"],
          tensionVertical: item["Tensión Vertical"],
          tensionHorizontal: item["Tensión Horizontal"],
          tipoCuerda: item["Tipo Cuerda"],
          cuerdaIncluida: item["Cuerda Incluida"] === "Sí" ? "Sí" : "No",
          fechaSolicitud: item.fechaSolicitud || item.FechaSolicitud,
          fechaEntregaEstimada: item.fechaEntregaEstimada || item.FechaEntregaEstimada,
          precio: parseFloat(item.Precio) || 0,
          estadoPago: item["Estado Pago"]?.toLowerCase() || "pendiente",
          estadoEntrega: item["Estado Entrega"]?.toLowerCase() || "en_proceso",
          notas: item.Notas || "",
          fechaPago: item.fechaPago || item.FechaPago
        };
        
        await agregarSolicitud(solicitudData);
        exitosas++;
      } catch (error) {
        fallidas.push({
          item,
          error: error.message
        });
      }
    }
    
    // Mostrar resultados
    elementosUI.resultadoImportacion.style.display = "block";
    document.getElementById("importacionExitosas").textContent = `${exitosas} registros importados con éxito`;
    document.getElementById("importacionFallidas").textContent = `${fallidas.length} registros con errores`;
    
    const erroresContainer = document.getElementById("erroresImportacion");
    erroresContainer.innerHTML = fallidas.map((f, i) => `
      <details>
        <summary>Error ${i + 1}: ${f.error}</summary>
        <pre>${JSON.stringify(f.item, null, 2)}</pre>
      </details>
    `).join("");
    
    // Recargar solicitudes
    await cargarSolicitudes();
  } catch (error) {
    console.error("Error al importar CSV:", error);
    alert("Error al procesar el archivo CSV");
  }
}

// Helper para leer archivo como texto
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = error => reject(error);
    reader.readAsText(file);
  });
}

// Inicializar la UI cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", inicializarUI);