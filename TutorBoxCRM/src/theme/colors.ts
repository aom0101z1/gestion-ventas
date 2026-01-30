// Theme Colors - Ciudad Bilingue CRM
// Beautiful, modern color palette matching web CRM

export const Colors = {
  // Primary Gradient (Purple theme like web)
  primary: '#667eea',
  primaryDark: '#5a67d8',
  primaryLight: '#7c8dfc',

  // Gradient colors
  gradientStart: '#667eea',
  gradientEnd: '#764ba2',

  // Secondary colors (for action buttons - matching web sidebar)
  success: '#48bb78',      // Green - Estudiantes
  successDark: '#38a169',

  warning: '#ed8936',      // Orange - Pagos
  warningDark: '#dd6b20',

  danger: '#fc8181',       // Red/Pink - Asistencia
  dangerDark: '#f56565',

  info: '#4299e1',         // Blue - Reportes
  infoDark: '#3182ce',

  purple: '#9f7aea',       // Purple - Grupos
  purpleDark: '#805ad5',

  teal: '#38b2ac',         // Teal - Extra
  tealDark: '#319795',

  // Neutral colors
  white: '#ffffff',
  black: '#000000',

  // Gray scale
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  // Background colors
  background: '#f0f2f5',
  backgroundLight: '#f8fafc',
  card: '#ffffff',

  // Text colors
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textLight: '#9ca3af',
  textWhite: '#ffffff',

  // Status colors
  statusActive: '#48bb78',
  statusInactive: '#9ca3af',
  statusPending: '#ed8936',
  statusError: '#f56565',

  // Attendance specific
  present: '#48bb78',
  late: '#ed8936',
  absent: '#f56565',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

export const Gradients = {
  primary: ['#667eea', '#764ba2'],
  success: ['#48bb78', '#38a169'],
  warning: ['#ed8936', '#dd6b20'],
  danger: ['#fc8181', '#f56565'],
  info: ['#4299e1', '#3182ce'],
  purple: ['#9f7aea', '#805ad5'],
  dark: ['#1f2937', '#111827'],
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: Colors.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: Colors.textPrimary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  body: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    color: Colors.textLight,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
