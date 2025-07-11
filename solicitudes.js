// solicitudes.js - Versión mejorada
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
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { formatearFecha } from "./utilidades.js";

const db = getFirestore();
const solicitudesRef = collection(db, "solicitudes");

// Obtener todas las solicitudes ordenadas
export async function obtenerSolicitudes(filtros = {}) {
  try {
    let q = query(solicitudesRef, orderBy("fechaSolicitud", "desc"));
    
    // Aplicar filtros si existen
    if (filtros.estadoPago) {
      q = query(q, where("estadoPago", "==", filtros.estadoPago));
    }
    
    if (filtros.desde) {
      const desdeDate = new Date(filtros.desde);
      q = query(q, where("fechaSolicitud", ">=", Timestamp.fromDate(desdeDate)));
    }
    
    if (filtros.hasta) {
      const hastaDate = new Date(filtros.hasta);
      hastaDate.setHours(23, 59, 59, 999);
      q = query(q, where("fechaSolicitud", "<=", Timestamp.fromDate(hastaDate)));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id,
        ...data,
        // Convertir Timestamps a fechas legibles
        fechaSolicitud: data.fechaSolicitud?.toDate()?.toISOString() || "",
        fechaEntregaEstimada: data.fechaEntregaEstimada?.toDate()?.toISOString() || "",
        fechaPago: data.fechaPago?.toDate()?.toISOString() || ""
      };
    });
  } catch (error) {
    console.error("Error al obtener solicitudes:", error);
    throw new Error("No se pudieron cargar las solicitudes");
  }
}

// Agregar nueva solicitud
export async function agregarSolicitud(data) {
  try {
    // Validar y preparar datos
    const solicitudData = {
      ...data,
      fechaSolicitud: Timestamp.fromDate(new Date(data.fechaSolicitud)),
      precio: parseFloat(data.precio) || 0,
      estadoPago: data.estadoPago || "pendiente",
      estadoEntrega: data.estadoEntrega || "en_proceso",
      fechaRegistro: Timestamp.now()
    };
    
    if (data.fechaEntregaEstimada) {
      solicitudData.fechaEntregaEstimada = Timestamp.fromDate(new Date(data.fechaEntregaEstimada));
    }
    
    const docRef = await addDoc(solicitudesRef, solicitudData);
    return { id: docRef.id, ...solicitudData };
  } catch (error) {
    console.error("Error al agregar solicitud:", error);
    throw new Error("No se pudo agregar la solicitud");
  }
}

// Actualizar solicitud existente
export async function actualizarSolicitud(id, data) {
  try {
    const solicitudDoc = doc(solicitudesRef, id);
    const updateData = { ...data };
    
    // Convertir fechas si existen
    if (data.fechaSolicitud) {
      updateData.fechaSolicitud = Timestamp.fromDate(new Date(data.fechaSolicitud));
    }
    
    if (data.fechaEntregaEstimada) {
      updateData.fechaEntregaEstimada = Timestamp.fromDate(new Date(data.fechaEntregaEstimada));
    }
    
    if (data.fechaPago) {
      updateData.fechaPago = Timestamp.fromDate(new Date(data.fechaPago));
    }
    
    if (data.precio) {
      updateData.precio = parseFloat(data.precio);
    }
    
    await updateDoc(solicitudDoc, updateData);
    return { id, ...updateData };
  } catch (error) {
    console.error("Error al actualizar solicitud:", error);
    throw new Error("No se pudo actualizar la solicitud");
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

// Buscar solicitudes por jugador
export async function buscarSolicitudesPorJugador(jugadorId) {
  try {
    const q = query(
      solicitudesRef, 
      where("codigoJugador", "==", jugadorId),
      orderBy("fechaSolicitud", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al buscar solicitudes por jugador:", error);
    throw new Error("No se pudieron buscar las solicitudes");
  }
}