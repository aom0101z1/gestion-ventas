# Reporte Comparativo: App Móvil vs Web
**Fecha:** 10 de Febrero de 2026
**Proyecto:** Ciudad Bilingüe CRM - TutorBox

---

## Resumen Ejecutivo

Este documento detalla las diferencias funcionales entre la aplicación móvil (Capacitor/Hybrid) y la aplicación web del sistema CRM de Ciudad Bilingüe. El objetivo es identificar las funcionalidades faltantes en la app móvil para lograr paridad funcional.

---

## 1. FUNCIONES FALTANTES EN LA APP MÓVIL

### 1.1 Prioridad ALTA (Críticas para operación diaria)

| # | Función | Descripción | Estado |
|---|---------|-------------|--------|
| 1 | **Pagado Desde (paidFrom)** | Distinguir gastos pagados de "Caja del Negocio" vs "Mi Bolsillo". Los gastos de bolsillo NO deben afectar el cierre de caja. | ⏳ Implementado, pendiente verificación |
| 2 | **Pagos Mixtos** | Permitir dividir un pago entre efectivo + transferencia con montos configurables y selección de banco. | ❌ No implementado |
| 3 | **Sistema de Facturas/Comprobantes** | Generar, visualizar y descargar facturas/comprobantes de pago con numeración consecutiva. | ❌ No implementado |
| 4 | **Cierre Diario de Caja** | Proceso completo: Apertura de caja → Registro de ingresos → Registro de gastos → Cierre con conteo real. | ❌ No implementado |

### 1.2 Prioridad MEDIA (Importantes para gestión)

| # | Función | Descripción | Estado |
|---|---------|-------------|--------|
| 5 | **Reconciliación de Efectivo** | Comparar cierre esperado (Apertura + Efectivo - Gastos Caja) vs conteo real. Mostrar diferencia (sobrante/faltante). | ❌ No implementado |
| 6 | **Entrega de Efectivo** | Registrar entregas de efectivo a administración con sistema de aprobación (pendiente → aprobado/rechazado). | ❌ No implementado |
| 7 | **Historial de Cierres** | Visualizar cierres históricos, recuperar/reabrir días si es necesario. | ❌ No implementado |
| 8 | **Anular Facturas (Admin)** | Permitir a admin@ciudadbilingue.com anular facturas con selección de razón y registro en auditoría. | ❌ No implementado |

### 1.3 Prioridad BAJA (Complementarias)

| # | Función | Descripción | Estado |
|---|---------|-------------|--------|
| 9 | **Audit Log** | Registro detallado de todas las acciones financieras para auditoría y trazabilidad. | ❌ No implementado |
| 10 | **Reportes COATS** | Reportes de cumplimiento para programas corporativos de capacitación. | ❌ No implementado |
| 11 | **Cierre Retroactivo** | Crear cierres para días pasados que no fueron cerrados. | ❌ No implementado |

---

## 2. FUNCIONES EXISTENTES EN AMBAS PLATAFORMAS

### 2.1 Gestión de Estudiantes
- ✅ Crear, editar, eliminar estudiantes
- ✅ Fotos de estudiantes (captura de cámara y subida de archivo)
- ✅ Filtros por estado (activo/inactivo), modalidad, grupo
- ✅ Búsqueda por nombre, documento, teléfono
- ✅ Información de acudiente
- ✅ Tipos de pago (Mensual, Semestral, Por Horas)

### 2.2 Gestión de Pagos
- ✅ Registro de pagos básicos
- ✅ Métodos: Efectivo, Transferencia, Nequi, Bancolombia, Daviplata
- ✅ Estados: Pagado, Parcial, Pendiente, Atrasado, Vacaciones
- ✅ Historial de pagos por estudiante
- ✅ Resumen mensual de ingresos
- ✅ Lógica de vacaciones/festivos

### 2.3 Gestión de Gastos
- ✅ Registro de gastos con monto, categoría, descripción, fecha
- ✅ Tipos: Negocio / Personal
- ✅ Categorías predefinidas (12 negocio + 15 personal)
- ✅ Categorías personalizadas
- ✅ Otros ingresos

### 2.4 Dashboard Financiero
- ✅ Efectivo recibido hoy
- ✅ Transferencias recibidas hoy
- ✅ Gastos del día
- ✅ Resumen mensual (MRR)

### 2.5 Otros Módulos
- ✅ Grupos y Grupos 2.0
- ✅ Profesores
- ✅ Empleados
- ✅ Asistencia
- ✅ Contactos/CRM
- ✅ Pipeline de ventas
- ✅ Tareas
- ✅ Configuración

---

## 3. FUNCIONES EXCLUSIVAS DE LA APP MÓVIL

| Función | Descripción |
|---------|-------------|
| **Calendario Visual de Pagos** | Grid de 12 meses mostrando estado de pago por mes con colores |
| **Filtros Rápidos de Fecha** | Botones: Hoy, Ayer, Últimos 7 días, Esta semana, Este mes, Último mes |
| **Navegación Inferior** | Acceso rápido a Módulos, Búsqueda, Alertas, Perfil |
| **Interfaz Táctil Optimizada** | UI diseñada para dispositivos móviles |

---

## 4. PLAN DE IMPLEMENTACIÓN

### Fase 1: Verificación (Inmediato)
- [ ] Verificar que paidFrom funciona correctamente en la app móvil
- [ ] Probar registro de gastos con ambas opciones (Caja/Bolsillo)

### Fase 2: Funciones Críticas (Prioridad Alta)
- [ ] Implementar Cierre Diario de Caja
- [ ] Implementar Pagos Mixtos (Efectivo + Transferencia)
- [ ] Implementar visualización de Facturas/Comprobantes

### Fase 3: Gestión Financiera (Prioridad Media)
- [ ] Implementar Reconciliación de Efectivo
- [ ] Implementar Entrega de Efectivo con aprobación
- [ ] Implementar Historial de Cierres

### Fase 4: Administración (Prioridad Baja)
- [ ] Implementar funciones de anulación para admin
- [ ] Implementar visualización de Audit Log
- [ ] Implementar Reportes COATS

---

## 5. NOTAS TÉCNICAS

### Archivos Involucrados
- **App Móvil:** `mobile/www/index.html` (Capacitor hybrid app)
- **Web - Finanzas:** `finance.js` (~349 KB)
- **Web - Pagos:** `payments.js` (~252 KB)
- **Web - Estudiantes:** `students.js`

### Base de Datos
- **Firebase Realtime Database**
- Colecciones: students, payments, expenses, dailyReconciliation, cashDeliveries, invoices

### Versiones
- **App Móvil:** v1.1.0 (versionCode 2)
- **Capacitor:** 6.0.0
- **Firebase:** Realtime Database

---

## 6. HISTORIAL DE CAMBIOS

| Fecha | Cambio | Estado |
|-------|--------|--------|
| 10/02/2026 | Documento inicial creado | ✅ |
| 10/02/2026 | Agregado paidFrom a app móvil | ⏳ Verificación pendiente |

---

**Preparado por:** Claude Code (Asistente de Desarrollo)
**Para:** Ciudad Bilingüe - Equipo de Desarrollo
