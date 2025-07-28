// core.js

// Inicializar referencia a la base de datos
const db = firebase.database();

// Función reutilizable para generar ID único
function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

// Función para obtener fecha y hora actual en formato ISO
function getTimestamp() {
  return new Date().toISOString();
}

// Exportar funciones si usas módulos
// module.exports = { db, generateId, getTimestamp };
