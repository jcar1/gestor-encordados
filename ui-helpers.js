// ui-helpers.js
export function mostrarError(mensaje) {
  const errorContainer = document.getElementById("errorContainer");
  if (errorContainer) {
    errorContainer.textContent = mensaje;
    errorContainer.style.display = "block";
    setTimeout(() => {
      errorContainer.style.display = "none";
    }, 5000);
  } else {
    console.error("Error:", mensaje);
    alert(mensaje);
  }
}