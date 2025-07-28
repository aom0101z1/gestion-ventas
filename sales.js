async function addContact(event) {
  event.preventDefault();

  const name = document.getElementById("contactName").value;
  const phone = document.getElementById("contactPhone").value;
  const source = document.getElementById("contactSource").value;
  const notes = document.getElementById("contactNotes").value;

  const newLead = {
    id: Date.now().toString(),
    name,
    phone,
    source,
    notes,
    status: "Nuevo",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString(),
    salesperson: currentUser.username
  };

  AdminData.addContact(newLead);
  await AdminData.saveDataToFirebase();

  alert("✅ Contacto agregado correctamente");
  document.getElementById("contactForm").reset();
  refreshPipeline();
}
