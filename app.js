import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getFirestore, collection, getDocs, query, where, orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_DOMINIO",
  projectId: "TU_PROJECT_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let userId = null;
let solicitudesRef = null;
let jugadoresRef = null;

const filtroJugador = document.getElementById('filtroJugador');
const filtroEstadoPago = document.getElementById('filtroEstadoPago');
const btnAplicarFiltros = document.getElementById('btnAplicarFiltros');
const listaSolicitudes = document.getElementById('listaSolicitudes');
const resumenSolicitudes = document.getElementById('resumenSolicitudes');
const exportarBtn = document.getElementById('btnExportarCSV');

const jugadoresMap = new Map();

onAuthStateChanged(auth, async (user) => {
  if (user) {
    userId = user.uid;
    document.getElementById("userIdDisplay").textContent = userId;
    solicitudesRef = collection(db, `users/${userId}/solicitudes`);
    jugadoresRef = collection(db, `users/${userId}/jugadores`);
    await cargarJugadores();
    aplicarFiltros();
  } else {
    signInWithEmailAndPassword(auth, "test@example.com", "test123")
      .then(() => console.log("Autenticado"))
      .catch(err => alert("Error autenticando: " + err.message));
  }
});

async function cargarJugadores() {
  filtroJugador.innerHTML = '<option value="">Todos los jugadores</option>';
  const snapshot = await getDocs(jugadoresRef);
  snapshot.forEach(doc => {
    const jugador = doc.data();
    jugadoresMap.set(doc.id, jugador.nombreCompleto);
    const option = document.createElement('option');
    option.value = doc.id;
    option.textContent = jugador.nombreCompleto;
    filtroJugador.appendChild(option);
  });
}

async function aplicarFiltros() {
  let q = query(solicitudesRef, orderBy("fechaSolicitud", "desc"));
  const jugadorId = filtroJugador.value;
  const estadoPago = filtroEstadoPago.value;

  if (jugadorId) q = query(q, where("jugadorId", "==", jugadorId));
  if (estadoPago) q = query(q, where("estadoPago", "==", estadoPago));

  const snapshot = await getDocs(q);
  listaSolicitudes.innerHTML = "";

  let total = 0, pagados = 0, pendientes = 0, totalPagado = 0, totalPendiente = 0;
  const rows = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    const row = document.createElement('tr');
    const nombreJugador = jugadoresMap.get(data.jugadorId) || data.jugadorId;
    row.innerHTML = `<td class='px-4 py-2'>${nombreJugador}</td><td class='px-4 py-2'>${data.estadoPago}</td>`;
    listaSolicitudes.appendChild(row);
    total++;
    if (data.estadoPago === "Pagado") {
      pagados++;
      totalPagado += Number(data.total) || 0;
    }
    if (data.estadoPago === "Pendiente") {
      pendientes++;
      totalPendiente += Number(data.total) || 0;
    }
    rows.push({ jugador: nombreJugador, estadoPago: data.estadoPago, total: data.total });
  });

  resumenSolicitudes.innerHTML = `Cantidad de Solicitudes: ${total} | Pagados: ${pagados} ($${totalPagado.toFixed(2)}) | Pendientes: ${pendientes} ($${totalPendiente.toFixed(2)})`;

  exportarBtn.onclick = () => exportarCSV(rows);
}

function exportarCSV(rows) {
  let csv = "Jugador,Estado de Pago,Total\n";
  rows.forEach(r => {
    csv += `${r.jugador},${r.estadoPago},${r.total}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "solicitudes_filtradas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

btnAplicarFiltros.addEventListener("click", aplicarFiltros);
