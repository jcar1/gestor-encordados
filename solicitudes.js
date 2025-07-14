import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();
const solicitudesRef = collection(db, "users");

// Obtener todas las solicitudes
export async function obtenerSolicitudes() {
  try {
    const q = query(solicitudesRef, orderBy("fechaSolicitud", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al obtener solicitudes:", error);
    throw new Error("No se pudieron cargar las solicitudes");
  }
}

// Agregar nueva solicitud
export async function agregarSolicitud(data) {
  try {
    const solicitudData = {
      ...data,
      fechaSolicitud: data.fechaSolicitud || new Date().toISOString()
    };
    const docRef = await addDoc(solicitudesRef, solicitudData);
    return { id: docRef.id, ...solicitudData };
  } catch (error) {
    console.error("Error al agregar solicitud:", error);
    throw error;
  }
}

// Actualizar solicitud existente
export async function actualizarSolicitud(id, data) {
  try {
    const solicitudDoc = doc(solicitudesRef, id);
    await updateDoc(solicitudDoc, data);
    return { id, ...data };
  } catch (error) {
    console.error("Error al actualizar solicitud:", error);
    throw error;
  }
}

// Eliminar solicitud
export async function eliminarSolicitud(id) {
  try {
    const solicitudDoc = doc(solicitudesRef, id);
    await deleteDoc(solicitudDoc);
    return id;
  } catch (error) {
    console.error("Error al eliminar solicitud:", error);
    throw new Error("No se pudo eliminar la solicitud");
  }
}

// Buscar solicitudes por código o nombre de jugador
export async function buscarSolicitudesPorJugador(termino) {
  try {
    const q = query(
      solicitudesRef,
      where("nombreJugador", ">=", termino),
      where("nombreJugador", "<=", termino + "\uf8ff")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al buscar solicitudes:", error);
    throw new Error("No se pudo realizar la búsqueda");
  }
}
