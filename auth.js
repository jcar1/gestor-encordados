// auth.js
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();

export async function iniciarSesion(email, password) {
  await setPersistence(auth, browserLocalPersistence);
  return signInWithEmailAndPassword(auth, email, password);
}

export function cerrarSesion() {
  return signOut(auth);
}

export function observarAutenticacion(callback) {
  onAuthStateChanged(auth, callback);
}
