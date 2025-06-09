document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("appContainer");
  container.innerHTML = '<h1 class="text-2xl font-bold mb-4">Gestor de Encordados</h1><p class="text-gray-700">Bienvenido a la aplicación.</p>';

  const modal = document.getElementById("messageModal");
  const modalText = document.getElementById("modalMessageText");
  const modalClose = document.getElementById("modalCloseButton");

  setTimeout(() => {
    modalText.textContent = "Esto es un ejemplo de mensaje.";
    modal.classList.remove("hidden");
  }, 2000);

  modalClose.addEventListener("click", () => {
    modal.classList.add("hidden");
  });
});
