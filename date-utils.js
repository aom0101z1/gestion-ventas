// ==================================================================================
// DATE-UTILS.JS - Utilidades de fecha para toda la aplicación
// ==================================================================================
//
// Este archivo contiene funciones compartidas de manejo de fechas
// que son usadas por finance.js, payments.js, tienda.js y otros módulos
//
// ==================================================================================

console.log('📅 Loading date utilities...');

/**
 * Get today's date from local computer
 * Simple: just uses the computer's date, no timezone conversions
 * @returns {string} Date in YYYY-MM-DD format
 */
window.getLocalDate = function() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Get current date/time from local computer
 * Format: YYYY-MM-DDTHH:mm:ss.sss (local time, no UTC conversion)
 * @returns {string} DateTime string
 */
window.getLocalDateTime = function() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`;
};

// Backwards compatibility aliases for old code
window.getTodayInColombia = window.getLocalDate;
window.getColombiaDateTime = window.getLocalDateTime;

console.log('✅ Date utilities loaded');
