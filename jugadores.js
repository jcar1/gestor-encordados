// jugadores.js - Versión corregida con campo "codigo" y soporte de edición
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
import { validarEmail } from "./utilidades.js";

const db = getFirestore();
const jugadoresRef = collection(db, "users");

// Obtener todos los jugadores ordenados
export async function obtenerJugadores(busqueda = "") {
  try {
    let q = query(jugadoresRef, orderBy("nombreCompleto"));
    if (busqueda) {
      q = query(
        jugadoresRef,
        where("nombreCompleto", ">=", busqueda),
        where("nombreCompleto", "<=", busqueda + "\uf8ff")
      );
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al obtener jugadores:", error);
    throw new Error("No se pudieron cargar los jugadores");
  }
}

// Agregar nuevo jugador (GUARDA 'codigo')
export async function agregarJugador(data) {
  try {
    // Validar datos básicos
    if (!data.codigo || data.codigo.trim() === "") {
      throw new Error("El código es requerido");
    }
    if (!data.nombreCompleto || data.nombreCompleto.trim() === "") {
      throw new Error("El nombre completo es requerido");
    }
    if (data.email && !validarEmail(data.email)) {
      throw new Error("El email no es válido");
    }
    const jugadorData = {
      codigo: data.codigo?.trim() || "",
      nombreCompleto: data.nombreCompleto.trim(),
      telefono: data.telefono?.trim() || "",
      email: data.email?.trim() || "",
      nivel: data.nivel || "intermedio",
      fechaRegistro: new Date().toISOString(),
      notas: data.notas?.trim() || ""
    };
    const docRef = await addDoc(jugadoresRef, jugadorData);
    return { id: docRef.id, ...jugadorData };
  } catch (error) {
    console.error("Error al agregar jugador:", error);
    throw error;
  }
}

// Actualizar jugador existente (INCLUYE 'codigo')
export async function actualizarJugador(id, data) {
  try {
    const jugadorDoc = doc(jugadoresRef, id);
    const updateData = {};
    // Actualizar todos los campos permitidos, incluido el código
    if (data.codigo) {
      updateData.codigo = data.codigo.trim();
    }
    if (data.nombreCompleto) {
      updateData.nombreCompleto = data.nombreCompleto.trim();
    }
    if (data.telefono) {
      updateData.telefono = data.telefono.trim();
    }
    if (data.email) {
      if (!validarEmail(data.email)) {
        throw new Error("El email no es válido");
      }
      updateData.email = data.email.trim();
    }
    if (data.nivel) {
      updateData.nivel = data.nivel;
    }
    if (data.notas) {
      updateData.notas = data.notas.trim();
    }
    await updateDoc(jugadorDoc, updateData);
    return { id, ...updateData };
  } catch (error) {
    console.error("Error al actualizar jugador:", error);
    throw error;
  }
}

// Eliminar jugador
export async function eliminarJugador(id) {
  try {
    const jugadorDoc = doc(jugadoresRef, id);
    await deleteDoc(jugadorDoc);
    return id;
  } catch (error) {
    console.error("Error al eliminar jugador:", error);
    throw new Error("No se pudo eliminar el jugador");
  }
}

// Buscar jugador por código o nombre
export async function buscarJugador(termino) {
  try {
    const q = query(
      jugadoresRef,
      where("nombreCompleto", ">=", termino),
      where("nombreCompleto", "<=", termino + "\uf8ff")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al buscar jugador:", error);
    throw new Error("No se pudo realizar la búsqueda");
  }
}
