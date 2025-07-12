// auth.js - Versión corregida
import { app } from './firebase-init.js';
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

// Inicializar auth con la app de Firebase
const auth = getAuth(app);

// Iniciar sesión
export async function iniciarSesion(email, password) {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Usuario autenticado exitosamente:", userCredential.user.uid);
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
      case "auth/invalid-credential":
        mensajeError = "Credenciales inválidas";
        break;
    }
    
    // Mostrar error en UI
    mostrarError(mensajeError);
    throw error;
  }
}

// Cerrar sesión
export async function cerrarSesion() {
  try {
    await signOut(auth);
    console.log("Sesión cerrada exitosamente");
    // Redirigir a login
    window.location.href = "login.html";
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
    if (user) {
      console.log("Usuario autenticado:", user.uid);
      callback(user);
    } else {
      console.log("No hay usuario autenticado");
      callback(null);
    }
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
    
    console.log("Usuario registrado exitosamente:", userCredential.user.uid);
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
    console.log("Email de restablecimiento enviado");
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

// Obtener usuario actual
export function obtenerUsuarioActual() {
  return auth.currentUser;
}

// Función auxiliar para mostrar errores
function mostrarError(mensaje) {
  const errorContainer = document.getElementById('errorContainer');
  if (errorContainer) {
    errorContainer.textContent = mensaje;
    errorContainer.style.display = 'block';
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
      errorContainer.style.display = 'none';
    }, 5000);
  } else {
    console.error("Error:", mensaje);
    alert(mensaje); // Fallback si no hay contenedor de errores
  }
}

// Exportar auth para uso en otros módulos
export { auth };