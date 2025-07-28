// AdminData.js

const AdminData = (() => {
  let _dataCache = [];

  function fetchAllContacts(callback) {
    firebase
      .database()
      .ref("contacts")
      .once("value")
      .then((snapshot) => {
        const data = snapshot.val() || {};
        _dataCache = Object.values(data);
        if (callback) callback(_dataCache);
      })
      .catch((error) => {
        console.error("❌ Error al obtener datos de contactos:", error);
        _dataCache = [];
        if (callback) callback([]);
      });
  }

  function getAllData() {
    return _dataCache;
  }

  function filterBySeller(sellerName) {
    return _dataCache.filter((c) => c.assignedTo === sellerName);
  }

  return {
    fetchAllContacts,
    getAllData,
    filterBySeller,
  };
})();
