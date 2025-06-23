
// Configuración de Firebase
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
  orderBy,
  Timestamp,
  initializeFirestore
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWRLU0AWoZtxRGSRNko3U8Rmip5Oz0h30",
  authDomain: "gestion-de-encordados.firebaseapp.com",
  projectId: "gestion-de-encordados",
  storageBucket: "gestion-de-encordados.appspot.com",
  messagingSenderId: "898210321428",
  appId: "1:898210321428:web:08162c1a38e557605dc301",
  measurementId: "G-VJG0HVKMZV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

// Exponer variables globales para depuración
window.auth = auth;
window.db = db;

let userId = null;
let userRole = null;

// --- CHECK ROL ---
async function checkUserRole(uid) {
  const userDoc = await getDoc(doc(db, "users", uid));
  return userDoc.exists() ? userDoc.data().role || "user" : "user";
}

window.checkUserRole = checkUserRole;

// --- PROMOCIÓN A ADMIN ---
async function promoteMeToAdmin() {
  const feedback = document.getElementById("promoteFeedback");
  if (!auth.currentUser) {
    feedback.textContent = "⚠️ No estás autenticado.";
    feedback.className = "text-red-600";
    return;
  }
  try {
    const uid = auth.currentUser.uid;
    await setDoc(doc(db, "users", uid), { role: "admin" }, { merge: true });
    userRole = "admin";
    document.getElementById("adminPanel").style.display = "block";
    feedback.textContent = "✅ ¡Ahora eres admin!";
    feedback.className = "text-green-600";
  } catch (err) {
    console.error(err);
    feedback.textContent = "❌ Error al promover. Revisa consola.";
    feedback.className = "text-red-600";
  }
}
window.promoteMeToAdmin = promoteMeToAdmin;

// --- VER ROL ACTUAL ---
async function verMiRol() {
  const info = document.getElementById("rolActualInfo");
  if (!auth.currentUser) {
    info.textContent = "No has iniciado sesión.";
    return;
  }
  const uid = auth.currentUser.uid;
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    const role = userDoc.data().role || "user";
    info.textContent = `Tu UID es: ${uid} | Rol: ${role}`;
  } else {
    info.textContent = `Tu UID es: ${uid} | No se encontró tu documento.`;
  }
}
window.verMiRol = verMiRol;

// --- LOGIN ---
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginError = document.getElementById("loginError");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;
      loginError.textContent = "";
      try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, email, password);
        document.getElementById("loginContainer").style.display = "none";
        document.querySelector(".container").style.display = "";
        document.getElementById("logoutBtn").style.display = "";
      } catch (error) {
        loginError.textContent = "Usuario o contraseña incorrectos";
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => signOut(auth));
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      userId = user.uid;
      document.getElementById("userIdDisplay").textContent = userId;
      document.getElementById("loginContainer").style.display = "none";
      document.querySelector(".container").style.display = "";
      document.getElementById("logoutBtn").style.display = "";

      // Cargar rol del usuario
      userRole = await checkUserRole(userId);
      if (userRole === "admin") {
        document.getElementById("adminPanel").style.display = "block";
      } else {
        document.getElementById("adminPanel").style.display = "none";
      }
    } else {
      document.getElementById("userIdDisplay").textContent = "No autenticado";
      document.getElementById("loginContainer").style.display = "";
      document.querySelector(".container").style.display = "none";
      document.getElementById("logoutBtn").style.display = "none";
      document.getElementById("adminPanel").style.display = "none";
    }
  });
});
