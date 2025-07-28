const AdminData = (() => {
  let allData = [];

  function getAllData() {
    return allData;
  }

  function addContact(lead) {
    allData.push(lead);
  }

  function updateContact(id, updatedFields) {
    const index = allData.findIndex(l => l.id === id);
    if (index !== -1) {
      allData[index] = { ...allData[index], ...updatedFields };
      return allData[index];
    }
    return null;
  }

  async function saveDataToFirebase() {
    if (!window.database) return;
    await window.database.ref("leads").set(allData);
  }

  async function loadDataFromFirebase() {
    if (!window.database) return;
    const snapshot = await window.database.ref("leads").once("value");
    allData = snapshot.val() || [];
  }

  return {
    getAllData,
    addContact,
    updateContact,
    saveDataToFirebase,
    loadDataFromFirebase,
  };
})();

window.AdminData = AdminData;
