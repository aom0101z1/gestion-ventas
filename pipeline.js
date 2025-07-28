// pipeline.js

document.addEventListener("DOMContentLoaded", function () {
  const contactsContainer = document.getElementById("contactsList");

  function renderContact(contact) {
    const div = document.createElement("div");
    div.className = "contact-item";
    div.innerHTML = `
      <strong>${contact.name}</strong><br>
      📞 ${contact.phone} | ✉️ ${contact.email}<br>
      🏷️ Fuente: ${contact.source}<br>
      👤 Asignado a: ${contact.assignedTo}<br>
      🕒 ${new Date(contact.createdAt).toLocaleString()}
      <hr>
    `;
    contactsContainer.appendChild(div);
  }

  function loadContacts() {
    firebase
      .database()
      .ref("contacts")
      .once("value")
      .then((snapshot) => {
        contactsContainer.innerHTML = ""; // Limpiar lista anterior
        const contacts = snapshot.val();
        if (contacts) {
          Object.values(contacts).forEach(renderContact);
        } else {
          contactsContainer.innerHTML = "<p>No hay contactos registrados.</p>";
        }
      })
      .catch((error) => {
        console.error("Error al cargar contactos:", error);
        contactsContainer.innerHTML = "<p>Error al cargar contactos.</p>";
      });
  }

  // Ejecutar carga al iniciar
  loadContacts();
});
