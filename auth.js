// auth.js - Versión mejorada
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { mostrarError } from "./main.js";

const auth = getAuth();

// Iniciar sesión
export async function iniciarSesion(email, password) {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    
    let mensajeError = "Error al iniciar sesión";
    switch (error.code) {
      case "auth/invalid-email":
        mensajeError = "El email no es válido";
        break;
      case "auth/user-disabled":
        mensajeError = "Usuario deshabilitado";
        break;
      case "auth/user-not-found":
        mensajeError = "Usuario no encontrado";
        break;
      case "auth/wrong-password":
        mensajeError = "Contraseña incorrecta";
        break;
      case "auth/too-many-requests":
        mensajeError = "Demasiados intentos. Cuenta temporalmente bloqueada";
        break;
    }
    
    mostrarError(mensajeError);
    throw error;
  }
}

// Cerrar sesión
export async function cerrarSesion() {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    mostrarError("No se pudo cerrar la sesión");
    throw error;
  }
}

// Observar cambios de autenticación
export function observarAutenticacion(callback) {
  return onAuthStateChanged(auth, (user) => {
    try {
      callback(user);
    } catch (error) {
      console.error("Error en callback de autenticación:", error);
    }
  }, (error) => {
    console.error("Error en observador de autenticación:", error);
    mostrarError("Error en el sistema de autenticación");
  });
}

// Registrar nuevo usuario
export async function registrarUsuario(email, password, nombre) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Actualizar perfil con nombre
    if (nombre) {
      await updateProfile(userCredential.user, {
        displayName: nombre
      });
    }
    
    return userCredential.user;
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    
    let mensajeError = "Error al registrar usuario";
    switch (error.code) {
      case "auth/email-already-in-use":
        mensajeError = "El email ya está en uso";
        break;
      case "auth/invalid-email":
        mensajeError = "El email no es válido";
        break;
      case "auth/weak-password":
        mensajeError = "La contraseña es demasiado débil";
        break;
    }
    
    mostrarError(mensajeError);
    throw error;
  }
}

// Restablecer contraseña
export async function restablecerPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error("Error al restablecer contraseña:", error);
    
    let mensajeError = "Error al restablecer contraseña";
    if (error.code === "auth/user-not-found") {
      mensajeError = "No existe usuario con ese email";
    }
    
    mostrarError(mensajeError);
    throw error;
  }
}