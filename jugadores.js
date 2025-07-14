// jugadores.js
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();
const jugadoresRef = collection(db, "jugadores");

export async function obtenerJugadores() {
  const q = query(jugadoresRef, orderBy("nombreCompleto"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function agregarJugador(data) {
  return await addDoc(jugadoresRef, data);
}

export async function actualizarJugador(id, data) {
  const jugadorDoc = doc(jugadoresRef, id);
  return await updateDoc(jugadorDoc, data);
}

export async function eliminarJugador(id) {
  const jugadorDoc = doc(jugadoresRef, id);
  return await deleteDoc(jugadorDoc);
}
