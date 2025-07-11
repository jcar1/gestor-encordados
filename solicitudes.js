// solicitudes.js
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();
const solicitudesRef = collection(db, "solicitudes");

export async function obtenerSolicitudes() {
  const q = query(solicitudesRef, orderBy("fechaSolicitud", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function agregarSolicitud(data) {
  return await addDoc(solicitudesRef, data);
}

export async function actualizarSolicitud(id, data) {
  const solicitudDoc = doc(solicitudesRef, id);
  return await updateDoc(solicitudDoc, data);
}

export async function eliminarSolicitud(id) {
  const solicitudDoc = doc(solicitudesRef, id);
  return await deleteDoc(solicitudDoc);
}
