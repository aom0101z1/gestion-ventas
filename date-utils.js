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
 * Get today's date in Colombia timezone (America/Bogota = UTC-5)
 * Uses Intl API to ensure correct timezone conversion
 * @returns {string} Date in YYYY-MM-DD format
 */
window.getLocalDate = function() {
    try {
        // Get current date/time in Colombia timezone
        const now = new Date();

        // Use Intl.DateTimeFormat with Colombia timezone to get the correct date
        const colombiaDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(now);

        // Format is already YYYY-MM-DD from en-CA locale
        console.log('📅 Date calculation:', {
            systemDate: now.toISOString(),
            colombiaDate: colombiaDate,
            systemTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });

        return colombiaDate;
    } catch (error) {
        // Fallback to simple date if Intl API fails
        console.error('❌ Error getting Colombia date, using fallback:', error);
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
};

/**
 * Get current date/time in Colombia timezone (America/Bogota = UTC-5)
 * Format: YYYY-MM-DDTHH:mm:ss.sss
 * @returns {string} DateTime string
 */
window.getLocalDateTime = function() {
    try {
        const now = new Date();

        // Get Colombia date parts
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const parts = formatter.formatToParts(now);
        const dateParts = {};
        parts.forEach(part => {
            dateParts[part.type] = part.value;
        });

        const ms = String(now.getMilliseconds()).padStart(3, '0');

        return `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}.${ms}`;
    } catch (error) {
        // Fallback
        console.error('❌ Error getting Colombia datetime, using fallback:', error);
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const ms = String(now.getMilliseconds()).padStart(3, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`;
    }
};

// Backwards compatibility aliases for old code
window.getTodayInColombia = window.getLocalDate;
window.getColombiaDateTime = window.getLocalDateTime;

console.log('✅ Date utilities loaded');
