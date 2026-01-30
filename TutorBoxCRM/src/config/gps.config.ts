// GPS Configuration for Attendance Validation
// Strict mode: Must be within radius of class location

export const GPS_CONFIG = {
  // Minimum GPS accuracy required (meters)
  MIN_ACCURACY_METERS: 50,

  // Maximum age of location data (milliseconds)
  MAX_LOCATION_AGE_MS: 60000, // 1 minute

  // Required radius from class location (meters)
  // Teacher must be within this distance to submit attendance
  REQUIRED_RADIUS_METERS: 500,

  // GPS timeout (milliseconds)
  TIMEOUT_MS: 15000, // 15 seconds

  // Enable high accuracy (uses GPS chip)
  HIGH_ACCURACY: true,

  // Maximum wait time for cached location
  MAXIMUM_AGE_MS: 10000, // 10 seconds
};

// GPS validation error messages
export const GPS_ERRORS = {
  PERMISSION_DENIED: 'Permiso de ubicación denegado. Por favor habilita el GPS.',
  POSITION_UNAVAILABLE: 'No se pudo obtener tu ubicación. Intenta en un área abierta.',
  TIMEOUT: 'Tiempo de espera agotado. Intenta de nuevo.',
  LOW_ACCURACY: 'Precisión GPS muy baja. Muévete a un área abierta.',
  TOO_FAR: 'Estás muy lejos de la ubicación de clase.',
  LOCATION_STALE: 'Datos de ubicación muy antiguos. Actualiza el GPS.',
};
