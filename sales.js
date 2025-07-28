// sales.js

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("contactForm");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document.getElementById("contactName").value.trim();
    const phone = document.getElementById("contactPhone").value.trim();
    const email = document.getElementById("contactEmail").value.trim();
    const source = document.getElementById("contactSource").value.trim();
    const assignedTo = document.getElementById("assignedTo").value.trim();

    if (!name || !phone || !email || !source || !assignedTo) {
      alert("Todos los campos son obligatorios.");
      return;
    }

    const newContactRef = firebase.database().ref("contacts").push();
    const contactData = {
      id: newContactRef.key,
      name,
      phone,
      email,
      source,
      assignedTo,
      createdAt: new Date().toISOString()
    };

    newContactRef
      .set(contactData)
      .then(() => {
        alert("Contacto agregado correctamente");
        form.reset();
      })
      .catch((error) => {
        console.error("Error al agregar contacto:", error);
        alert("Hubo un error al guardar el contacto.");
      });
  });
});
