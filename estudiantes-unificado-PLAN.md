# Estudiantes unificado — mapa de reutilización (recon de solo lectura, 23 oct 2026)

> Objetivo: un módulo nuevo `students-unified.js` (una pantalla por estudiante: ficha + pagos +
> estado de cobro + acuerdo + excepciones + registrar pago / editar datos) que es una **VISTA**
> sobre `students/{id}` y `payments/{id}`. Regla #1: reutilizar las funciones existentes de
> guardado/validación (antifraude, numeración, auditoría); el módulo no escribe en Firebase por su cuenta.
> `students.js` y `payments.js` NO se tocan. Todas las referencias son `archivo:línea` del árbol
> del 16 oct 2026 (HEAD `333bed4`) más el archivo sin seguimiento `cobranza-tutorbox.js`.

---

## 1. Modelo de datos

### 1.1 `students/{id}` (id = `STU-{Date.now()}`, students.js:70)

| Campo | Tipo | Significado / ejemplo | Quién lo escribe | Notas |
|---|---|---|---|---|
| `id` | string | `STU-1720000000000` | saveStudent students.js:70-74; el formulario también lo manda (students.js:1844) | |
| `nombre`, `tipoDoc` (`C.C`, …), `numDoc`, `edad`, `telefono`, `correo`, `acudiente`, `docAcudiente` | string (edad viene del input como string) | ficha | saveStudentForm students.js:1843-1852 | `telefono` es texto libre; el código le quita lo que no es dígito (students.js:797, 2918-2927); puede traer varios números separados por `/ , ;` |
| `fechaInicio` | `YYYY-MM-DD` | inicio de clases | form students.js:1852 | lo lee el antifraude con regex `^(\d{4})-(\d{1,2})` (payments.js:3507-3511) |
| `grupo`, `grupo2` | string con el número de grupo (`"121"`) | grupo de Grupos 2.0 / segundo curso | form students.js:1853-1854 | se sincroniza con `grupos2/{id}.studentIds` (students.js:1900-1962) y con TutorBox (1966-1968) |
| `cursoTipo`, `cursoTipo2` | key de `priceList/cursoTipos` | tipo de curso oficial | form students.js:1856-1857 | `applyCursoTipo` copia el precio oficial (students.js:476-483) |
| `modalidad` | `Presencial`/`Compañia`/`Escuela`/`Online`/`Privadas`/`Prueba` | | form students.js:1858 | `Prueba` = registro de clase de prueba: marca T y abre la escritura de precio una sola vez (students.js:1248-1252) |
| `modalidadDetalle` | `COATS`/`OTRA`/`Hogar Nazareth`/`Remigio`/`otro` | | form students.js:1859 | |
| `tipoPago` | `MENSUAL`/`SEMESTRAL`/`POR_HORAS` | **CONGELADO** para el personal (reglas) | form students.js:1860 | |
| `valor` | number (las fichas importadas pueden tenerlo como **string**, import-students.js:122) | mensualidad del curso 1 | form students.js:1861 | **CONGELADO**. Nunca leer `valor` solo: usar `getStudentMonthlyTotal` |
| `valor2` | number o null | mensualidad del curso 2 | form students.js:1831-1840 | **CONGELADO**; el personal debe mandar el valor guardado tal cual (null sigue null) |
| `valorHora` | number | tarifa de POR_HORAS | form students.js:1862 (manda `0` si no es POR_HORAS) | **CONGELADO** — ver riesgo R10 |
| `diaPago` (= **DP1**) | int 1-31 | día de pago de la ficha | form students.js:1863 (`parseInt||1`) | **CONGELADO** |
| `diaPago2` (= **DP2**) | int 0-31 o null | día de pago ajustado (después del terremoto). **0 = semestre pagado** (sin cobro ni avisos) | `saveDiaPago2` students.js:2722-2758 (en la tabla, cualquier persona del equipo) | NO está congelado → R7 |
| `photoUrl` (+`photoUpdatedAt/By/ByEmail`) | data URL base64 | foto | form + sincronizar fotos (students.js:3276) | pesado; se reescribe en cada guardado del formulario |
| `colegio` | objeto/null | colegio (ColegioPicker) | students.js:1867 | |
| `status` | `active`/`inactive` | no existe "retirado": retirado = `inactive` + motivo | toggleStudentStatus students.js:300-331 | **CONGELADO** salvo el permiso `studentStatus` |
| `statusHistory[]` | `{previousStatus,newStatus,changedAt,date,reason,notes}` | historial de estado | students.js:306-317 | se usa en `isMonthRequiredByStatus` payments.js:3358-3385 (los meses inactivos no se exigen) |
| `paymentHistory[]` | `{previousValue,newValue,changedAt,notes}` | cambios de `valor` | updateStudent students.js:221-229 | |
| `paymentNotes` | string | "acuerdo especial" antiguo (texto libre) | `openPaymentNotes` students.js:1331-1369 — **no hay botón en la UI que lo abra** (código muerto) | ícono 📋 al lado del nombre (students.js:818) |
| `acuerdoPago` | `{hasta:'YYYY-MM-DD', nota, by, at}` o null | plazo pactado; vence solo | `cyclePagoOK` students.js:2655-2716 | `acuerdoVigente` students.js:2473-2479; `mensajeAcuerdo` 2481-2487 (**nadie lo consume**, R6) |
| `pagoOK` | `{ 'YYYY-MM': {ok:bool, by, at} }` | exonerar (OK) / forzar (No) el aviso de ESTE mes | cyclePagoOK students.js:2701-2705 | `pagoOKManual` 2459-2463 |
| `pagoMarca` | `{tipo:'S', periodo:'2026-S2', by, at}` / `{tipo:'T', by, at}` / null | marca manual Semestre/Test | cyclePagoOK students.js:2672-2674 | `pagoMarcaManual` 2554-2559 |
| `notes[]` | `{id:'NOTE-…', text, createdBy(email), createdByName, createdAt}` | notas | `saveStudentNote` students.js:1468-1513 | se reescribe el array entero (se pisa si dos personas escriben a la vez) |
| `invoices/{invoiceNumber}: true` | mapa | facturas enlazadas | `InvoiceGenerator.saveInvoice` payments.js:1520-1522 | |
| `pagos/{monthYear}` | `{paid,date,updatedBy}` | **formato viejo** (antes de la migración) | `updateStudentPaymentStatus` payments.js:465-473 | no lo cuenta ningún cálculo actual |
| Enlace con TutorBox: `tutorboxUid`, `tutorboxEmail`, `classAccount`, `classAccountAt`, `linkedExistingAccount`, `hasAppAccount`, `loginCode` (`A48213`), `loginCodeAt`, `loginCodeBy` | | cuenta de TutorBox + código de clase | `classAccountRecord` students.js:2944-2958; app 3376-3384; `generateStudentLoginCode` 3032-3084 | `loginCode` es lo que mira la cobranza (cobranza-tutorbox.js:58) |
| `leadId` | string | lead de origen | convertFromLead students.js:340-375 | |
| `createdAt`, `updatedAt` | ISO hora local (sin zona) / ISO UTC | | saveStudent 79-80 (hora local), updateStudent 234 (UTC) | formatos mezclados |
| `fechaPago`, `direccion` | legado | `direccion` se lee en las facturas (payments.js:1338) pero el formulario no lo escribe | | |

**Derivados (NO se guardan):** total mensual `window.getStudentMonthlyTotal(s)` = `valor+valor2` (date-utils.js:100-102);
estado del mes `window.pagoEstadoMes(s)` → `acuerdo|ok|no|S|T|okauto|parcial|pendiente` (students.js:2576-2590);
`PaymentManager.getPaymentStatus(s)` (payments.js:145-231); acuerdo vigente; DP efectivo (`effectivePayDay`, cobranza-tutorbox.js:33-41); etapa de cobro (`rowFor`, cobranza-tutorbox.js:54-82).

### 1.2 `payments/{id}`
Id `PAY-{Date.now()}` (un mes, payments.js:335) o `PAY-{Date.now()}-{mes}` + `masterPaymentId: PAY-MULTI-{ts}` (varios meses, payments.js:237-246, un registro por mes con `amount = round(total/N)`).

| Campo | Notas |
|---|---|
| `studentId`, `amount` (number), `baseAmount` (solo la parte de mensualidad; **es lo que cuenta para "pagó el mes"**) | `baseAmount` lo pone solo `recordPayment` (payments.js:338); en los registros multimes NO existe → se usa `amount` (payments.js:186-187, 3350-3351) |
| `month` (**español en minúscula**: `octubre`), `year` (number) | se pasa a minúscula al cargar y al guardar (payments.js:126-128, 343). Toda comparación es por nombre de mes + número de año estricto (`p.year === currentYear`, payments.js:181) |
| `method` (`Efectivo`/`Transferencia`/`Mixto`→se parte en dos registros/`Cesantías`), `bank` (`Nequi`/`Bancolombia`/…) | |
| `cesantiasStatus` (`pending`→`received`), `cesantiasFondo` | payments.js:252-253, 341-342; la regla del hijo es solo para admin/director |
| `date` | `getColombiaDateTime()` = `YYYY-MM-DDTHH:mm:ss.sss` **sin zona** (date-utils.js:54-91) |
| `registeredBy` | **solo uid** (payments.js:257, 346); no hay email del actor en el pago y las reglas no obligan a que sea `auth.uid` |
| `notes`, `lineItems[] {concept, amount}`, `matriculaAmount`, `certificadoAmount`, `otroConcepto`, `otroAmount`, `pricing` (metadatos de precio/promo de pricing.js) | |
| `paymentType` (`monthly`/`trimester`/`semester`/`academicSemester`/`annual`/`twoSemesters`/`hourly`), `paymentPeriod`, `installment` (`1/3`), `totalInstallments` | solo en multimes (payments.js:260-263) |
| `mixedGroupId` (`MIXED-{ts}`) | pagos mixtos (payments.js:5108) |
| `invoiceNumber` | se escribe DESPUÉS con un `set` aparte en `payments/{id}/invoiceNumber` (payments.js:1352-1354, 1471-1475) — la caché `PaymentManager.payments` **no** se actualiza |
| `receiptNumber` | tiene regla (database.rules.json) pero **ningún código lo escribe** (grep: 0 resultados en payments.js) |
| `status: 'cancelled'`, `cancelledAt`, `cancelledBy` (email) | anular (payments.js:418-423); `loadPayments` descarta los cancelados de la caché (payments.js:124) |
| `lastEditedBy` (email), `lastEditedAt` | editar (payments.js:5767-5768) |
| "comisión" | no hay campo de comisión en el pago; las comisiones van en `comisiones/{id}` (index.html:4976-5410, crear-solamente) y se calculan con `baseAmount`/`amount` |

`invoices/{CB-YYYYMMDD-RRR-NNN}`: `{number, paymentId|masterPaymentId, date, student{}, items[], total, paymentMethod, bank, studentId, createdAt, createdBy(email)}` (payments.js:1320-1339, 1508-1518). Contador `invoiceCounters/global` (payments.js:1243-1253).

### 1.3 `paymentExceptions/{studentId}/{year}-{monthIndex}`
`{month:'abril', monthIndex:3, year:2026, studentName, reason, grantedBy(email), grantedAt}` — **monthIndex empieza en 0** (`2026-3` = abril). Escribe/borra `PaymentExceptionsManager.grant/revoke` (payments.js:3420-3471). Lectura: cualquier usuario con sesión; escritura: admin/director.

---

## 2. Módulo Estudiantes (`students.js`)

- **Global:** `window.StudentManager = new StudentManager()` (students.js:937). Caché `students: Map<id, student>`, `initialized` (31-34).
- **Carga:** `init()` (37-42, protegido por `initialized` → **sin recarga**) → `loadStudents()` (45-65: un solo `get('students')`, sin listener, NO limpia el Map, así que un estudiante borrado por otro usuario sigue en la caché).
- **Lectura:** `getStudents(filters)` (109-214); `students.get(id)`.
- **"Ficha":** no existe una ficha de solo lectura. La "ficha" ES el modal del formulario: `window.showStudentForm(id)` (1101-1131) → `renderStudentForm(student)` (512-765, función global) dentro de **`#studentsContainer`** (1115-1116). El envío pasa por `saveStudentForm(id)` (1819-1977, global), que lee ~25 ids `stu*` del DOM.
- **Guardar desde otro módulo:**
  - Crear: `StudentManager.saveStudent(data)` (68-106) → `set(students/{id})` sobre el registro entero + `logAudit('Estudiante añadido','student',id,…)` (solo si es nuevo).
  - Editar: `StudentManager.updateStudent(id, updates)` (217-265) → `update()` parcial; anota los cambios de `valor` en `paymentHistory`; pone `updatedAt` (UTC); actualiza la caché; `logAudit('Estudiante editado', …, {before, after})` solo de los campos que cambiaron. **Esta es la API limpia para llamar desde otro módulo** (no depende del DOM). Muta el objeto `updates` que recibe.
  - Validaciones del lado del cliente: solo HTML `required` + `priceLocked` (517: los campos de precio quedan `readonly` si no eres admin y el registro no es de prueba) + la regla de llevar `valor2` sin cambios (1831-1840). La validación real está en las reglas (§5).
  - Efectos de `saveStudentForm` además de guardar: actualiza `grupos2.studentIds` de los grupos viejo/nuevo de ambos cursos (1900-1962), `syncStudentToTutorBox` (1876-1877, 2962), `syncGroupMembersToTutorBox` (1966-1968), y al final `closeStudentFormModal(); loadStudentsTab()` (1972-1973).
- **Estado:** `window.toggleStatus(id)` (1279-1323: valida `canToggleStudentStatus` 1256-1260; para inactivar abre `renderInactiveModal` en `#studentsContainer`) → `StudentManager.toggleStudentStatus(id, {date, reason, notes})` (300-331: `updateStudent` + un segundo `logAudit('Estado de estudiante cambiado')`) → `syncStatusToTutorBox(id)` (window, 1265-1277).
- **Borrar:** `window.deleteStudent(id)` (1202-1232) → `StudentManager.deleteStudent` (268-297; admin/director, `confirm`, `remove`, audit) + re-sincronización de grupos.
- **Grupos:** solo por el formulario (`stuGrupo`/`stuGrupo2`); no hay una función aparte de "asignar grupo".
- **Acuerdo de pago / OK / S / T:** `window.cyclePagoOK(studentId, btn)` (2655-2716), un clic que va rotando `— → OK → S → T → 📅acuerdo (prompt con fecha AAAA-MM-DD + nota) → No → —`; guarda `{pagoOK, acuerdoPago, pagoMarca}` con `updateStudent`. Lo pinta `window.paintPagoOK()` (2592-2645) en **cualquier** elemento `#pagoOK-{id}` que haya en el DOM. **Cualquier persona del equipo** (no ventas) puede poner un acuerdo; no hay restricción a admin.
- **DP2:** `window.saveDiaPago2(studentId, inputEl)` (2722-2758).
- **Excepciones de mes:** NO están en students.js; ver §3 (`PaymentExceptionsManager`) y la UI en el panel 🚨 Alertas (security-alerts.js:162-197, 213-239).
- **Notas:** `window.openStudentNotes(id)` (1380-1466; contenedor = `#studentsContainer` || `#paymentsContainer` || `body`), `saveStudentNote` (1468-1513).
- **Último pago / pagado este mes:** `window.refreshLastPayments(force)` (2390-2414) arma `window._lastPayByStudent` y `window._paidThisMonth` desde `PaymentManager.payments` (o con un `get('payments')` completo como respaldo) y pinta `#lastPay-{id}` / `#pagoOK-{id}`.
- **Modal de pagos del estudiante (de solo lectura):** `window.viewStudentPayments(id)` (1984-2161) — se monta en `#studentsContainer`.
- **TutorBox:** `showCreateStudentAccountModal` 2771, `generateStudentLoginCode` 3032, `copyLoginCode` 3193, `printLoginCard` 3202, `refreshLiveClassChips` 3147 (pinta `#liveChip-{id}`).

## 3. Módulo Pagos (`payments.js`)

- **Globales:** `window.PaymentManager = new PaymentManager()` (3778), `window.InvoiceStorage` (3779), `window.PaymentExceptionsManager` (3388). `PaymentConfig` (17) e `InvoiceGenerator` (1221) son **`const` del script**: se alcanzan por su nombre desde otros scripts clásicos, pero `window.PaymentConfig` / `window.InvoiceGenerator` son **undefined** (ver R3).
- **Carga:** `init()` (83-100, protegido por `initialized`) → `loadPayments()` (103-139): `get('payments')` completo, **limpia** el Map, salta los `cancelled`, pasa `month` a minúscula y luego `PaymentExceptionsManager.load()`. `loadPayments()` se puede volver a llamar sin problema para refrescar.
- **Registrar pago — la ÚNICA ruta validada es `processPayment(studentId)`** (payments.js:4774-5254, declaración de función de nivel superior → global, invocada por el `onsubmit` de `showPaymentModal`, 4039-4042). Depende al 100 % del DOM de `#paymentModal` (ids: `paymentType`, `.month-checkbox[data-month|data-year|data-month-index]`, `payAmount`, `payAmountBase`, `payMethod`, `payBank`, `cesantiasFondo`, `payNotes`, `installmentOption`, `currentInstallment`, `academicSemesterSelect`, `twoSemestersYearSelect`, `includeMatricula`/`matriculaAmount`/`matriculaPromoSelect`, `includeCertificado`/…, `includeOtro`/`otroConcepto`/`otroAmount`, `includeLibro`/`libroSelect`/`libroPromoSelect`/`libroAmount`, `basePromoSelect`, `partialPaymentCheck`, `mixedCashAmount`/`mixedTransferAmount`/`mixedPayBank`, `hourlyRate`/`hoursCount`). Orden de lo que hace:
  1. Bloqueo por doble clic `_isProcessingPayment` (4773-4785).
  2. Meses elegidos; venta solo de artículos → mes actual con base 0 (4817-4843); POR_HORAS → mes actual (4846-4855).
  3. **Antifraude de orden** `window.validateMonthlyPaymentOrder(studentId, student, selectedMonths, paymentType)` (función pura, payments.js:3474-3559; solo para `paymentType==='monthly'`): (a) mes futuro: > mes actual+1 → `future-month`; (b) saltarse un mes: continuidad desde el último mes cubierto, respetando fechaInicio, festivos, excepciones y `isMonthRequiredByStatus` → `skip-month`. Si es admin, en el mismo bloqueo ofrece `PaymentExceptionsManager.grant` (4866-4882); si no, `showNotification` + `window.logSecurityAlert(type, msg, ctx)` (4884-4892).
  4. Monto: >0 y ≤ 50 000 000 (4895-4924); método obligatorio (4927-4931).
  5. **Antifraude de precio** `PricingManager.buildPricingMeta({...})` (4975-4995; pricing.js:260 — lee el DOM: `basePromoSelect`, `partialPaymentCheck`, `includeLibro`, …). **Solo corre si `PricingManager.loaded`** (R2).
  6. **Libro** `BookManager.validateBookItem()` (4997-5009; books.js:~333, lee el DOM).
  7. Escritura: Mixto → dos `recordPayment` (efectivo + transferencia) **solo de `selectedMonths[0]`** (5105-5170, R11); un mes mensual → `recordPayment` (5174-5193); si no → `recordMultiMonthPayment` (5195-5201).
  8. Factura `InvoiceGenerator.generateInvoice` / `generateMultiMonthInvoice` (1287-1386 / 1389-1503) → número + `invoices/{n}` + `students/{id}/invoices/{n}` + `payments/{id}/invoiceNumber` + Storage + `logAudit('Factura generada','invoice',…)`.
  9. Libros `BookManager.onBookPaid` / `onSemesterPaymentRecorded` (5204-5213); cesantías `CesantiasManager.createFromPayment` (5215-5227).
  10. `closePaymentModal()` (5233), invoice modal (5236-5238), `loadPaymentsTab()` a +500 ms (5241-5243). Atrapa todos los errores y nunca hace rethrow (5245-5253).
- **Escritores de bajo nivel (SIN validación):** `PaymentManager.recordPayment(studentId, data)` (332-397) y `recordMultiMonthPayment(studentId, data)` (234-327): `set(payments/{id})`, actualizan la caché, `logAudit('Pago registrado','payment',…)` y `setTimeout(loadPaymentsTab, 100)`. **El módulo nuevo nunca debe llamarlos directamente** (se saltaría el antifraude de orden, precio y libros, y la factura).
- **Numeración:** `InvoiceGenerator.generateInvoiceNumber(studentId)` (1232-1260): `CB-YYYYMMDD-{fila del estudiante entre los activos ordenados por createdAt (lee TODO `students`)}-{contador}`; el contador es `get` + `set` (**no es una transacción**; la regla `.validate newData > data` hace fallar al que pierde la carrera → número de respaldo `CB-…-000-{4 últimos dígitos del ts}`). `receiptNumber` no se usa.
- **Comisión/`baseAmount`:** `baseAmount` = `payAmountBase` (la parte de mensualidad; puede ser 0 en ventas de solo artículos) (4964-4968). Todos los cálculos de "pagó este mes" suman `baseAmount ?? amount`.
- **Anular/borrar:** `confirmDeletePayment(paymentId, studentId)` (5395, modal en `body`) → `executeDeletePayment` (5493-5543: `InvoiceGenerator.voidInvoice` 1857 → `voidedInvoices/{n}` + `invoices/{n}` marcada; luego `PaymentManager.deletePayment` 402-461 = `update {status:'cancelled', cancelledAt, cancelledBy}` + audit `Pago eliminado`). En el cliente: solo `admin@ciudadbilingue.com`.
- **Editar:** `openEditPaymentModal(paymentId, studentId)` (5546) / `saveEditedPayment()` (5720-5878): solo admin por email; `set` del registro entero con `amount/month/year/method/bank/notes` nuevos + `lastEditedBy`; reescribe la factura; audit `Pago editado`. **No actualiza `baseAmount`** ni vuelve a pasar el antifraude (R12).
- **Estado de cobro:**
  - `PaymentManager.getPaymentStatus(student)` (145-231) — **método puro (solo la caché), ideal para reutilizar**: solo el MES ACTUAL; `Por horas`/`Sin fecha`/`🏖️ Vacaciones`/`Pago Parcial {paidAmount, remaining}`/`📋 Cesantías`/`Pagado`/`Vencido Nd`/`Vence hoy`/`Vence en Nd`. Usa **DP1** (`diaPago`), no DP2, e ignora acuerdo, pagoOK y excepciones.
  - `getStudentPayments(id)` (476-480), `getStudentPaymentHistory(id, year)` (493-605, mapa de 12 meses `paid|holiday|overdue|pending|no-payment`, async pero en realidad síncrono), `calculatePaymentStats(history)` (608-636) — puros. Ojo: "paid" = existe cualquier registro (también uno parcial o de base 0); los meses anteriores a `fechaInicio`, los exonerados o los inactivos aparecen como `overdue`.
  - `window.isMonthTuitionCovered(id, mes, año)` (3339-3352), `window.isMonthRequiredByStatus(student, mi, y)` (3358-3385) — puras.
  - `window.pagoEstadoMes(s)` (students.js:2576) — puro, pero necesita que antes se haya construido `window._paidThisMonth` (`refreshLastPayments`).
  - `TBXCobranza.preview()` / `rowFor` (cobranza-tutorbox.js:54-82, 117-125): etapa `remind|grace|spectator|blocked|ok` con DP2→DP1 (`rowFor` no está expuesto; `preview()` calcula TODOS).
- **Otros puntos de entrada útiles:** `viewPaymentInvoice(paymentId)` (2993; **si falta la factura, GENERA una nueva** → escribe, 3043-3054), `generatePazYSalvo(id)` (6350), `sendPaymentReminder(id)` (4129, abre wa.me), `PaymentExceptionsManager.isExempt/grant/revoke/isExceptionsAdmin` (3410-3471).
- **Dependencias del DOM (contenedores):** `showPaymentModal` mete el modal en `#paymentsContainer` si existe, si no en `body` (4030-4037); el modal tiene z-index **1000**. `loadPaymentsTab` necesita `#paymentsContainer` (3790-3794) y si no existe solo deja un `console.error` y sale.

## 4. Conexión del módulo (cómo se agrega uno)

- **El bar de módulos escolares lo construye `school-buttons.js`, NO index.html ni core.js.** `core.js` **no está cargado** (no tiene `<script>` en index.html; el `switchTab` de verdad está en línea en index.html:3303 y solo sirve para las pestañas de arriba).
- Pasos:
  1. Agregar una entrada en el array `modules` de school-buttons.js:41-53, p. ej. `{ name: 'Ficha 360', icon: '🗂️', color: '#0f766e', func: 'StudentsUnified', perm: 'studentsUnified' }`. `openModule(func)` (school-buttons.js:192-250) **reemplaza** el innerHTML de `#schoolModuleView` (fixed, **z-index 10000**) por una cabecera + `<div id="studentsUnifiedContainer">` (el id sale del nombre: primera letra en minúscula + `Container`) y a los 100 ms llama `window.loadStudentsUnifiedTab()`.
  2. Nuevo `students-unified.js` que define `window.loadStudentsUnifiedTab`. La etiqueta script va **después de `payments.js` y `cobranza-tutorbox.js` (index.html:5687-5688)** con `?v=AAAAMMDDx` (GitHub Pages cachea; firebase.json no-cache solo aplica al hosting de Firebase). Todo se resuelve en tiempo de ejecución, así que el orden solo importa por claridad.
  3. Permisos: `permission-enforcer.js` → `moduleMapping` (138-147) agregar `studentsUnified: { elementId: 'studentsUnifiedBtn', type: 'school' }`; el getter `schoolModules` (532-534) agregar `'studentsUnified'`; `buttonModuleMap` (499-509) agregar la etiqueta. **Trampa:** ese mapa compara con `includes()` → un botón llamado "Estudiantes unificado" coincide con `'Estudiantes'` (y "Estudiantes y Pagos" también con `'Pagos'`) cuando el bar no se autocontroló (`selfGated !== '1'`, 496). Usar un nombre sin "Estudiantes"/"Pagos"/"Grupos" o poner la clave nueva antes. `admin-center.js` `SYSTEM_MODULES` (6-35): agregar `{id:'studentsUnified', …}` para que se pueda otorgar en Admin → Ver Permisos (se guarda en `users/{uid}/permissions/modules/studentsUnified`, admin-center.js:299). El preset de ventas (admin-center.js:1092-1095) pone en false todo lo que no esté en su lista cuando alguien PASA a ventas.
  4. **Ventas:** school-buttons.js:63-66 hace `return` (no hay bar) para `userRole==='ventas'` → para que Felipe vea el módulo hay que exceptuarlo ahí (p. ej. dejar solo los módulos con `salesOk:true`). `hasPermission` (permission-enforcer.js:344-361) a ventas solo le da lo que se le otorgó explícitamente.
- **Usuario actual:** `window.FirebaseData.currentUser` (`.uid`, `.email`) — confiable. `window.userRole` = `profile.role || profile.rol` con override a `admin` para admin@ (index.html:2758-2760, 2821-2824). `window.PermissionEnforcer.userRole/userPermissions/isReady`. **No usar `window.currentUser`**: solo se asigna al restaurar la sesión (index.html:2752), no en un login nuevo (ahí `currentUser` es un `let` del script, 2785/2816) → por eso `cyclePagoOK` guarda `by:'staff'` y `classAccountRecord` guarda `loginCodeBy:'admin'` (students.js:2659, 2956) (R5).
- **Secuencia de init en el loader nuevo (obligatoria, es la misma que hace `loadPaymentsTab` 3816-3823):** `await StudentManager.init(); await PaymentManager.init(); await InvoiceStorage.init(); await PricingManager.init(); await BookManager.init(); GroupsManager2?.init()` y luego `refreshLastPayments()` para `_paidThisMonth`.

## 5. Permisos y reglas (`database.rules.json`)

Rol = `users/{uid}/profile/role` (también se escribe `rol`; admin-center.js:1080-1083). Permisos por módulo = `users/{uid}/permissions/modules/{key}: bool` (solo UX; las reglas no los miran, **excepto `studentStatus`**).

- `students/$studentId/.write` (texto literal, abreviado):
  `role==='admin' || role==='director' || email==='admin@…' || ((auth!=null && role!=='ventas') && newData.exists() && (!data.exists() || (valor, valor2, valorHora, diaPago, tipoPago, status sin cambios [=== estricto]) || ((data.modalidad==='Prueba' || !data.valor.exists() || data.valor===0 || data.valor==='') && status sin cambios))) || (auth!=null && role!=='ventas' && users/{uid}/permissions/modules/studentStatus===true && data.exists() && newData.exists() && valor, valor2, valorHora, diaPago, tipoPago sin cambios)`.
  → **ventas no puede escribir NADA en `students`** (ni notas, ni DP2, ni acuerdo, ni el enlace `invoices/{n}`). El rol legado `vendedor` **NO** está bloqueado (las reglas solo excluyen `'ventas'`; tampoco un usuario sin rol).
- `payments/$paymentId/.write`: `((auth!=null && role!=='ventas') && !data.exists() && newData.exists()) || role==='admin' || email==='admin@…'` — crear: cualquiera que no sea ventas; editar/anular: solo el rol admin o admin@ (**director tampoco**). Hijos: `cesantiasStatus` admin/director/admin@; `invoiceNumber` y `receiptNumber`: `(auth!=null && role!=='ventas') && !data.exists()`. **No hay `.validate`** (ni de monto, ni de `studentId`, ni de que `registeredBy===auth.uid`).
- `paymentExceptions/.write`: `(auth!=null && role!=='ventas') && (role admin|director || admin@)`; `.read: auth!=null`.
- Relacionadas con el flujo de pago: `invoices/$id` (crear si no es ventas; editar admin), `invoiceCounters/$id` (no ventas + `.validate isNumber && > anterior`), `securityAlerts/$id` (crear si no es ventas; leer admin/director), `cesantias/$id` (crear si no es ventas), `studentBooks/$s/$b`, `bookMovements` (no ventas), `auditLog/$id` (crear: cualquier usuario con sesión; leer admin/director), `users` (escribir admin/director).
- **Para "ventas puede CREAR pagos pero no editar/borrar"** hay que cambiar (y mantener append-only):
  1. `payments/$paymentId`: cambiar la rama de creación a `auth != null && !data.exists() && newData.exists()` (editar ya es solo admin). Agregar `.validate`: `newData.child('registeredBy').val() === auth.uid` y `root.child('students').child(newData.child('studentId').val()).exists()` y `amount` numérico > 0.
  2. `payments/$id/invoiceNumber`: quitar `role!=='ventas'` (sigue escribir-una-vez).
  3. `invoices/$invoiceId` crear, `invoiceCounters/$counterId` (o mejor convertirlo en una `transaction()`).
  4. `students/$studentId/invoices/$inv`: regla hija nueva `auth != null && !data.exists() && newData.val() === true` (en RTDB una regla hija puede DAR permiso aunque el padre lo niegue).
  5. `securityAlerts/$alertId` crear para ventas — si no, **los intentos bloqueados de Felipe no generan alerta** (`log()` falla en silencio, security-alerts.js:52-54).
  6. Si vende libros / cesantías: `studentBooks`, `bookMovements`, `cesantias` crear.
  7. Cliente: `school-buttons.js:63` (no hay bar para ventas) y que el módulo nuevo esconda editar/anular/excepciones/estado/DP2/acuerdo para ventas.
  **Trampa:** si falla solo `payments/{id}/invoiceNumber` (1352-1354, sin try), `generateInvoice` lanza la excepción **después** de que el pago ya quedó escrito → `processPayment` muestra "❌ Error al registrar pago" → el usuario lo vuelve a intentar → **pago duplicado**. Todas las reglas del punto 1-4 tienen que salir juntas en el mismo despliegue.

## 6. Auditoría y alertas

- `window.logAudit(activityType, entityType, entityId, description, details={})` (auditlog.js:740-749) → `AuditLogManager.logActivity` (auditlog.js:128-158): `auditLog/LOG-{ts}-{rand}` = `{id, activityType, entityType, entityId, description, details: JSON-string (sanitizado), userId: uid, userName: email, timestamp ISO, date}`. **Es el único punto por donde pasa cada movimiento del cliente** → aquí va el gancho para el email del dueño. El primer `logAudit` de la sesión llama `init()` → `loadLogs` (últimos 1500).
- Llamadas en estudiantes: `Estudiante añadido` (students.js:93), `Estudiante editado` (255), `Estudiante eliminado` (288), `Estado de estudiante cambiado` (322). Pagos: `Pago registrado` (payments.js:286, 371), `Pago eliminado` (435), `Pago editado` (5831), `Factura generada` (1368, 1483), `Excepción de pago autorizada/revocada` (3439, 3459), anular factura (`voidInvoice` 1857+). El acuerdo/pagoOK/DP2/notas pasan por `updateStudent` → "Estudiante editado" con before/after.
- `SecurityAlertsManager.log(type, message, context)` / `window.logSecurityAlert` (security-alerts.js:24-55, 262): `securityAlerts/ALERT-…` `{type, message, studentId, studentName, attemptedMonth/Year, pendingMonth*, byUid, byEmail, createdAt, seen:false}` + espejo en el audit. Nunca lanza excepción. Usado por processPayment (4889-4891) y bank-reconciliation.
- **Quién hizo qué, por pago:** `registeredBy` (solo uid, falsificable), `invoices/{n}.createdBy` (email), `cancelledBy`, `lastEditedBy` (email), `auditLog.userName` (email). No hay `createdByEmail` en `payments` aunque el resumen viejo lo diga (crm_summary 132).
- **Email por movimiento de otra persona (gancho):**
  - *Cliente (rápido, se puede saltar):* envolver `AuditLogManager.logActivity` (auditlog.js:128) — si `entityType ∈ {payment, invoice, payment-exception, student}` y `currentUser.email !== 'admin@…'` → POST a un endpoint de email. Hoy el CRM no tiene Cloud Functions (`firebase.json` no tiene `functions`); el único backend es el de TutorBox (`us-central1-tutorbox-4d7c9`, `x-admin-key`).
  - *Servidor (recomendado, no se puede falsear):* una Cloud Function en `ciudad-bilingue-crm` con disparador RTDB `onValueCreated('auditLog/{id}')` (y/o `payments/{id}`) que filtre `userName !== 'admin@ciudadbilingue.com'` y mande el correo. Necesita plan Blaze + agregar `functions` al proyecto del CRM.

## 7. Riesgos, trampas y bugs encontrados

- **R1 Modales detrás de la vista.** `#schoolModuleView` tiene z-index 10000. Los modales con z-index 1000 metidos en `body` quedan **ocultos detrás**: `paymentModal` (payments.js:2587; en Pagos se ve solo porque va dentro de `#paymentsContainer`), `studentNotesModal` (students.js:1396, respaldo en `body`). `showStudentForm`, `toggleStatus` (modal de inactivar), `openPaymentNotes` y `viewStudentPayments` hacen `getElementById('studentsContainer').insertAdjacentHTML` → **TypeError** si Estudiantes no está abierto (`openModule` destruye el contenedor del módulo anterior). Los que están bien: invoice (99999), editar/borrar pago (10000 en `body`, se agregan después), alertas (10000).
- **R2 El precio falla en modo "abierto".** `processPayment` solo valida el precio si `PricingManager.loaded` (payments.js:4976); el libro solo si existe `BookManager`. Si el módulo nuevo abre el modal sin `await PricingManager.init()`, **se salta el antifraude de precio sin decir nada**. Lo mismo `validateMonthlyPaymentOrder` con una caché de pagos vacía o vieja (no hay listener: los pagos que registró otra persona en otra sesión no se ven hasta `loadPayments()`).
- **R3 `window.PaymentConfig` es undefined** → en `validateMonthlyPaymentOrder` el salto de festivos (payments.js:3545) **nunca se aplica** (por ejemplo, enero de 2026 de vacaciones puede bloquear como "pendiente" a quien no tenga un pago después). students.js:2522-2525 ya lo documenta y usa el nombre del const. Igual `window.InvoiceGenerator` (invoice-integration.js:43) es undefined.
- **R4 Dobles refrescos.** `recordPayment`/`recordMultiMonthPayment`/`deletePayment` hacen `setTimeout(loadPaymentsTab,100)`, `processPayment` +500 ms, `saveStudentForm` → `loadStudentsTab()`. Sin el contenedor solo dejan un `console.error` (no pasa nada); **pero si el módulo nuevo crea un `#paymentsContainer`/`#studentsContainer` para "engañar" a los modales, se le pinta encima el módulo completo de Pagos/Estudiantes.** No hacerlo.
- **R5 Actor perdido:** `window.currentUser` no existe después de un login nuevo → `acuerdoPago.by`/`pagoOK.by`/`pagoMarca.by` = `'staff'`, `loginCodeBy` = `'admin'` (students.js:2659, 2956). El audit sí guarda el email correcto.
- **R6 El acuerdo no llega a TutorBox:** `cobranza-tutorbox.js` `rowFor` usa `getPaymentStatus` + DP2/DP1, **ignora `acuerdoPago`, `pagoOK`, `pagoMarca` y `paymentExceptions`**; `window.mensajeAcuerdo` no se llama en ninguna parte. Un estudiante con acuerdo vigente igual recibe etapa `blocked`. Además **`cobranza-tutorbox.js` NO tiene seguimiento en git pero index.html (en HEAD) lo carga** (index.html:5688) → 404 en producción (crm.tutorbox.app).
- **R7 Vector de fraude DP2=0:** `diaPago2` no está congelado; cualquier persona del equipo puede poner 0 ("semestre pagado") y la cobranza pasa a `ok` (cobranza-tutorbox.js:35, 62) y la casilla OK a S, sin registrar dinero. Igual el acuerdo (sin restricción de rol). Candidatos para congelar/limitar a admin.
- **R8 Varias verdades de "debe":** `getPaymentStatus` (mes actual, DP1), `pagoEstadoMes` (manuales + `_paidThisMonth`, sin días), `getStudentPaymentHistory` (12 meses, sin excepciones/fechaInicio/estado; "paid" = cualquier registro), `validateMonthlyPaymentOrder` (continuidad), `rowFor` (DP2 + etapas). La vista nueva tiene que **elegir una por columna y ponerle su nombre**, no inventar una sexta.
- **R9 Número de factura con carrera:** `get`+`set` del contador sin transacción (payments.js:1243-1253); `getStudentRowNumber` lee TODO `students` en cada factura. `viewPaymentInvoice` genera una factura nueva si no la encuentra (escribe al "ver").
- **R10 (por verificar) Ediciones del personal rechazadas:** `saveStudentForm` manda `valorHora: 0` para los que no son POR_HORAS, `diaPago: parseInt||1` y `valor: parseInt(...)` (número). Si la ficha guardada tiene `valorHora` ausente/`''`, `diaPago` ausente o `valor` como string (import-students.js:122), el `===` estricto de la regla falla y **se rechaza todo el update** para el personal que no es admin. Probarlo con una cuenta de personal sobre una ficha importada. Además, cuando falla, `saveStudentForm` se traga el error y el botón queda en "⏳ Guardando..." (students.js:1117-1129 vs 1974-1977).
- **R11 Mixto + varios meses:** el pago mixto graba solo `selectedMonths[0]` (payments.js:5121-5122, 5143-5144) aunque se hayan marcado varios meses; y el registro de transferencia pone `baseAmount = mixedTransferAmount` aunque lleve matrícula/libro → infla la "mensualidad pagada".
- **R12 Editar un pago** no recalcula `baseAmount` ni vuelve a pasar la validación de orden (payments.js:5759-5769); `getPaymentStatus` sigue leyendo el `baseAmount` viejo.
- **R13** Masivo de semestre llama `PaymentManager.addPayment` que no existe (payments.js:6266, backlog #13). `permission-enforcer.js:292, 346` le da todos los permisos a cualquier email que contenga `"admin"` (backlog #12). `TUTORBOX_ADMIN_KEY` está fijo en el cliente (students.js:2766, cobranza-tutorbox.js:22).
- **R14 Texto libre que el código interpreta:** fechas `YYYY-MM-DD` (fechaInicio, acuerdo `hasta` — solo se valida con regex en el prompt), meses en español en minúscula (`payments.month`, las claves de `PaymentConfig`), `paymentExceptions` con monthIndex que empieza en 0, `pagoOK` con clave `YYYY-MM` (mes 1-12), `pagoMarca.periodo` `YYYY-S1|S2`, `grupo` numérico como string (`parseInt`), `telefono` con varios números. La fecha del modal de inactivar usa `toISOString()` (UTC: después de las 7 pm en Colombia sale el día siguiente, students.js:387).
- **R15** Las notas y otros arrays (`notes`, `statusHistory`) se reescriben enteros desde la caché → si dos pestañas o dos personas escriben a la vez, la última borra lo de la otra. `StudentManager.loadStudents` nunca limpia el Map.
- **R16** Hay ids `payAmount` duplicados en el modal para los estudiantes por horas (payments.js:2615 y 2820); `getElementById` toma el primero (el de horas) — funciona, pero no reutilizarlo.

## 8. Plan de construcción recomendado

### 8.1 Principio
`students-unified.js` = **solo lectura + abrir los flujos existentes**. Nunca llama `db.set/update`, nunca `recordPayment`. Cada escritura pasa por una función existente que ya valida y audita.

### 8.2 Helpers propios (finos, sin escrituras)
- `ensureLoaded()` — la secuencia de init de §4 (incluye `PricingManager.init()`, `BookManager.init()`, `PaymentExceptionsManager.load()` por medio de `loadPayments`) + `refreshLastPayments(true)`. Bloquear el botón "Registrar pago" hasta que `PricingManager.loaded === true` (para evitar R2).
- `liftModals()` — un `MutationObserver` sobre `document.body` mientras la vista está abierta: si aparece `#paymentModal`, `#studentNotesModal`, `#inactiveModal` o `#studentFormModal`, se mueve dentro de `#studentsUnifiedContainer` o se le pone `style.zIndex = 10050`. Se desconecta al cerrar. Resuelve R1 sin tocar los módulos viejos.
- `refresh(studentId)` — `await PaymentManager.loadPayments()` (trae `invoiceNumber` y los pagos de otras sesiones) + `refreshLastPayments(true)` + volver a pintar la ficha.

### 8.3 Acción → función a llamar
| Acción | Llamar | Wrapper necesario |
|---|---|---|
| Buscar/listar | `StudentManager.getStudents({search, status})` | — |
| Cabecera de la ficha | `StudentManager.students.get(id)`, `getStudentMonthlyTotal`, DP1/DP2, `loginCode`, `tutorboxUid` | — |
| Estado del mes | poner `<span id="pagoOK-{id}">`, `<span id="lastPay-{id}">`, `<span id="liveChip-{id}">` en la vista y llamar `paintPagoOK()` / `paintLastPayments()` / `paintLiveClassChips()` — los pintores buscan por id (students.js:2417, 2592, 3171) y el botón OK resultante ya llama `cyclePagoOK` (acuerdo/OK/S/T) | ninguno (los módulos viejos no están en el DOM al mismo tiempo, así que los ids no chocan) |
| Semáforo DP / vence | `PaymentManager.getPaymentStatus(s)` (y en la etiqueta aclarar que es "mes actual, DP1") | — |
| Etapa en TutorBox | v1: no se muestra (rowFor es privado y no considera el acuerdo, R6); v2: exponer `TBXCobranza.rowFor` | — |
| Grilla de 12 meses | `getStudentPaymentHistory(id, year)` + superponer de forma local (solo lectura) `PaymentExceptionsManager.isExempt`, `isMonthRequiredByStatus`, `fechaInicio` | sí, pintado propio |
| Lista de pagos | `PaymentManager.getStudentPayments(id)` (agrupar por `masterPaymentId`/`mixedGroupId`) | — |
| Ver factura | `viewPaymentInvoice(paymentId)` (ojo R9: puede generar una) | — |
| **Registrar pago** | `ensureLoaded()` → `showPaymentModal(id)` → `liftModals` → reemplazar `#paymentForm.onsubmit` con `e.preventDefault(); await processPayment(id); if (!document.getElementById('paymentModal')) await refresh(id);` (el modal solo se cierra si salió bien) | sí, 10 líneas |
| Editar datos | `await GroupsManager2.init(true)`; `container.insertAdjacentHTML('beforeend', renderStudentForm(student))` (global); `onsubmit` con protección de doble clic → `await saveStudentForm(id)` (global; su `loadStudentsTab()` final no hace nada sin contenedor); si el modal sigue abierto → volver a habilitar el botón (R10); `refresh` | sí (porque `showStudentForm` exige `#studentsContainer`) |
| Activar/inactivar | si `canToggleStudentStatus()`: inactivar = `renderInactiveModal(id)` (global) en el contenedor → `StudentManager.toggleStudentStatus(id, {date, reason, notes})` → `syncStatusToTutorBox(id)`; reactivar = `confirm` + lo mismo con `{reason:'Reactivado'}` | sí (`toggleStatus` exige `#studentsContainer`) |
| DP2 | `<input onchange="saveDiaPago2(id,this)">` | — |
| Excepciones | listar `PaymentExceptionsManager.map` filtrado por studentId; otorgar (si `isExceptionsAdmin()`): `grant(id, monthIndex, year, monthName, reason)`; revocar: `confirm` + `PaymentExceptionsManager.revoke(id, key)` (no `SecurityAlertsManager.revokeException`, que abre el panel de alertas) | mínimo |
| Notas | `openStudentNotes(id)` + `liftModals` (cae en `body`) | solo z-index |
| Editar/anular pago (admin) | `openEditPaymentModal(pid, id)`, `confirmDeletePayment(pid, id)` + `refresh` (sus refrescos internos buscan `#history-{id}`, que no existe) | refresco |
| Paz y salvo / WhatsApp | `generatePazYSalvo(id)`, `sendPaymentReminder(id)` | — |

### 8.4 Alcance v1
1. Buscador + ficha 360 de solo lectura (datos, total mensual, DP1/DP2, estado del mes, semáforo, grilla de 12 meses con las excepciones encima, lista de pagos/facturas, acuerdo vigente, notas, enlace a TutorBox).
2. Botones: Registrar pago, Editar datos, Notas, Ver factura, Paz y salvo, WhatsApp. Excepciones, estado, editar/anular pago y acuerdo solo según el rol (los mismos chequeos de cliente que usan los módulos viejos).
3. Permiso `studentsUnified` (school-buttons + enforcer + admin-center). Sin cambios de reglas en v1.
4. v1.1 (cambio de reglas, §5, todo en un solo despliegue y fuera del horario de clases): ventas puede crear pagos + excepción en school-buttons para su rol + `.validate registeredBy === auth.uid`.
5. v1.2: email del dueño por medio de una CF con disparador en `auditLog` (proyecto CRM) — o un gancho en `logActivity` del cliente como paso intermedio.

### 8.5 Preguntas abiertas para el fundador
- ¿Qué valor tiene `users/{uid}/profile/role` de Felipe: `ventas` o `vendedor`? (Las reglas solo bloquean `ventas`; `vendedor` hoy ya puede escribir `payments` y `students`).
- ¿Felipe registra solo matrícula/primer pago o cualquier mensualidad? ¿Efectivo también (cierre de caja)? ¿Ve los montos de todos los estudiantes (la lectura de `students`/`payments` está abierta para cualquier usuario con sesión)?
- ¿Felipe imprime la factura? (necesita `invoices` + `invoiceCounters` + `students/{id}/invoices`).
- Email: ¿uno por movimiento o un resumen diario? ¿Qué cuenta como "movimiento" (pagos, ediciones de la ficha, acuerdos, DP2)? ¿Proveedor (SendGrid/Gmail SMTP) y plan Blaze en `ciudad-bilingue-crm`?
- ¿Cuál es la definición oficial de "debe" que debe mostrar la ficha (R8)? ¿El acuerdo debe frenar el bloqueo en TutorBox (R6)?
- ¿Se congela `diaPago2` / `acuerdoPago` para el personal (R7)?
- ¿`cobranza-tutorbox.js` se tiene que subir a git (hoy da 404 en producción)?

## 9. Aviso al dueño por correo (tarea 4, 23 Oct 2026)

Pedido del fundador: "Felipe va a tener acceso a pagos, pero avísame a admin@ciudadbilingue.com cada vez que otro usuario haga un movimiento". Decisión: un correo por movimiento (no resumen diario), Gmail SMTP de TutorBox (el proyecto CRM no tiene Cloud Functions ni hace falta Blaze aquí).

**Flujo.** `AuditLogManager.logActivity` (auditlog.js) escribe `auditLog/{id}` como siempre → si la escritura salió bien llama `notifyOwner(entry, details)` sin `await` (fire-and-forget, nunca lanza error) → `POST https://us-central1-tutorbox-4d7c9.cloudfunctions.net/notifyCrmMovement` con `x-admin-key` (la misma constante del puente que ya cargan `tutorbox-admin.js` / `students.js` / `grupos2.js`; no hay una segunda copia) y `keepalive: true` → la CF (`functions/crm/notifyCrmMovement.js` en el repo TutorBox) manda UN correo a admin@ciudadbilingue.com desde `"CRM Ciudad Bilingüe" <admin@tutorbox.app>`.

**Payload.** `{ actor: {uid, email, name, role}, activityType, entityType, entityId, description, details, studentName, amount, at, crmUrl }`. `studentName`/`amount` se derivan del pago en `PaymentManager.payments` (+ `StudentManager.students`), del estudiante, o de `details.after/before` (`estudiante`, `monto`, `montoTotal`). Asunto: `CRM · Pago registrado · Nicolás Oviedo · $280.000 · por Felipe`. Cuerpo en español: quién (nombre, correo, rol), qué, estudiante, monto, id del registro, hora de Colombia, detalle antes/después (máx. 30 líneas, campos cambiados primero) y enlace al CRM (Admin → Auditoría).

**No se avisa** cuando: el actor es admin@ciudadbilingue.com; `window.CRM_NOTIFY_OWNER === false` (interruptor, se puede poner desde la consola o en un script); o el tipo está en la lista de ruido `NOTIFY_NOISE`: `Progreso de clase registrado`, `Tarea creada`, `Tarea actualizada`, `Contacto añadido`, `Contacto editado`. Todo lo demás avisa (pagos, facturas, paz y salvo, estudiantes —incluye DP2 y acuerdo, que pasan por `updateStudent` → "Estudiante editado"—, estados, excepciones, alertas de seguridad, precios, libros, tienda, gastos, cierres, usuarios, bancos, cesantías y todo borrado).

**Freno anti-tormenta.** Más de 15 correos del mismo actor en 10 minutos (contador por instancia de la CF) → se dejan de enviar y sale UN correo "Límite de avisos superado, revisa Auditoría". Cada llamada (enviada o no) queda en RTDB de TutorBox `crmNotifyLog/{YYYY-MM-DD}` = `{at, actorEmail, activityType, entityId, sent, reason}` (razones: `owner`, `smtp-not-configured`, `smtp-error`, `rate-limited`, `rate-limited-notice-sent`, `bad-request`, `internal-error`). Lectura solo superadmin, sin escritura de clientes.

**Cómo probar.** (1) `curl` directo a la CF con la clave del puente (ver informe). (2) En el CRM, entrar con un usuario que no sea el dueño, registrar un pago de prueba y mirar la consola de red (`notifyCrmMovement` → `{sent:true}`) y el correo. (3) Repetir como admin@ciudadbilingue.com → `{sent:false, reason:'owner'}` en `crmNotifyLog`.

**Qué hay que desplegar.** TutorBox: `firebase deploy --only functions:notifyCrmMovement,database --project tutorbox-4d7c9` (la regla nueva `crmNotifyLog`; `onUserSignup` ahora usa `functions/lib/mailer.js` con el mismo comportamiento — se puede redesplegar después sin prisa). CRM: subir `auditlog.js` + la línea `?v=20261023a` de `index.html` (push a main = producción).

**Punto abierto.** ¿Está configurado el secreto `SMTP_PASSWORD` (contraseña de aplicación de admin@tutorbox.app) en `tutorbox-4d7c9`? Verificar con `firebase functions:secrets:get SMTP_PASSWORD --project tutorbox-4d7c9` (lista versiones sin mostrar el valor) (o mirar si llegan los correos de signup). Si no está, la CF responde `{sent:false, reason:'smtp-not-configured'}` y solo queda el registro en `crmNotifyLog`.

## 10. Filtro de cobranza + ✓ enviado (23 Oct 2026, tarde)

Pedido del fundador: "En Estudiantes unificado agrega un filtro para seleccionar las condiciones de cobranza que tenemos, para enviarles el mensaje desde aquí, y una función arriba para marcar 'Ya le envié mensaje'. Después haremos la función automática que mande estos mensajes antes, el día de pago y cuando estén atrasados."

### 10.1 `cobros-engine.js` (nuevo, puro: sin DOM, sin Firebase)
Misma regla que tutorbox.app/admin/cobros (`CobrosPanel.tsx`, `computeRows` + `buildText`), portada tal cual. UMD: `window.CobrosEngine` en el navegador y `module.exports` en Node.

- `computeRows({ students, payments, exceptions, todayIso, holidays, isActive, isMonthRequired })` → `{ rows, notes, ok }`.
  - `students` / `payments`: array, Map u objeto (los pagos `cancelled` se saltan). `exceptions`: el árbol `paymentExceptions` o una función `isExempt(sid, monthIndex0, year)`. `holidays`: claves `'2025-11'`, el array `PaymentConfig.holidays` o una función (por defecto dic 2025 + ene 2026). `isActive` por defecto = convención del CRM `(status || 'active') === 'active'`. `isMonthRequired` (opcional, el CRM pasa `isMonthRequiredByStatus`): solo se usa para el MES ANTERIOR (un mes que pasó inactivo no se debe).
  - `rows[]`: `{ s, bucket, dueIso, diff, expected, paidNow, remaining, partial, prevOwed {month, remaining, partial}|null, prevMonthName, agreement {hasta, nota}|null, phone }`, ordenadas por bucket y luego `diff` descendente.
  - `notes[]`: activos que no se cobran y por qué (`prueba`, `por_horas`, `semestre` DP2 = 0, `sin_dia`, `sin_valor`, `inicia_despues` + `nextDueIso`). `ok[]`: al día (`pagado`, `excepcion`, `vacaciones`, `aun_no`) + `nextDueIso`.
- Regla: día efectivo = DP2 (1–31) si existe, si no DP1 (29–31 se recortan al último día del mes); mensualidad pagada del mes = Σ `baseAmount ?? amount` de los pagos con `month` + `year` del mes; esperado = `valor + valor2`; excepción del mes = cubierto; inscrito después de la fecha de este mes → empieza el mes siguiente. `diff = hoy − vencimiento`.
- `BUCKETS` (en orden): 🔒 `suspend` Cuenta suspendida (8+ días) · ⛔ `late` Vencido (1–7 días) · 🔴 `today` Hoy es su día de pago · 🟠 `soon` Se vence en 1–2 días · 🟡 `remind` Recordar (3–5 días antes) · ⏪ `prev` Mes anterior pendiente (este mes cubierto o aún lejos) · 📅 `agreement` Acuerdo de pago vigente (`acuerdoPago.hasta ≥ hoy` y el mes sin cubrir). `partial` = pagó > 0 pero < esperado.
- `buildText(row, sender)` → `{ whatsapp, body }` — los textos del portal ("Hola {2 nombres}, te escribe {firma} de Ciudad Bilingüe 👋 …", sufijos de parcial / mes anterior, firma con `324 297 3737`, montos `$280.000`, fechas "viernes 17 de noviembre"). `waLink(telefono, text)` → `https://wa.me/57XXXXXXXXXX?text=…` (primer número de la ficha; 10 dígitos → 57; null si no hay número usable).
- Quitado respecto al portal (solo TutorBox): cuentas/roles de TutorBox (saltar profesores), avisos `paymentStatus` en la plataforma, el texto "inClass", `cobrosLog` en la base de TutorBox.

### 10.2 En Estudiantes unificado (`students-unified.js`)
- Panel izquierdo: select **Cobranza** ("Todos" + un bucket por línea con conteo en vivo y cuántos ✓ hoy, + "✅ Al día") y la casilla **ocultar enviados hoy** (por defecto marcada; se recuerda en `localStorage suCobrosHideSent`). Con un bucket elegido la lista son solo esos activos, del más atrasado al menos; el chip de Pagos se cambia por el del bucket y se ve "✓ 10:32 💬" si ya se envió hoy. Al abrir la vista siempre vuelve a "Todos" (misma lección que el buscador).
- Ficha: tarjeta **💰 Cobranza** bajo la barra de acciones (explicación, mensaje editable, **Firma** guardada en `tbx_cobros_sender`, 💬 WhatsApp · 📋 Copiar · ✅ Ya le envié · ↩ Deshacer · ➡ Siguiente). Si no está en ningún bucket: "✅ Al día — próximo vencimiento DD/MM" o el motivo por el que no se cobra. Ventas: solo lectura (sin botones que escriban).
- Cambiar DP2 o el acuerdo (botón OK/S/T/📅) desde la ficha vuelve a calcular la tarjeta a los ~1,5 s.

### 10.3 Nodo `cobrosLog` (única escritura nueva)
`cobrosLog/{YYYY-MM-DD}/{studentId}` = `{ kind: bucket, channel: 'wa'|'copy'|'manual', at: ISO, by: email, name }` en la base del **CRM**, solo desde `logSent()` / `unlogSent()`. Día = `getTodayInColombia()`. Se lee una vez al abrir y en cada ↻ Recargar. Tras una marca buena: `logAudit('Cobro enviado', 'student', id, '💬 {bucket} · {canal} · {nombre}', {bucket, channel})` → el dueño recibe el correo de §9 cuando lo hace otra persona.

Regla agregada a `database.rules.json` (**no desplegada**):
```json
"cobrosLog": {
  ".read": "auth != null",
  "$day": { "$studentId": {
    ".write": "auth != null && root.child('users').child(auth.uid).child('profile').child('role').val() !== 'ventas'",
    ".validate": "newData.hasChildren(['kind','channel','at','by'])"
  } }
}
```
Despliegue (cuenta admin del fundador, fuera de las clases): `firebase deploy --only database --project ciudad-bilingue-crm`. Antes de desplegar, la lectura falla en silencio (nadie aparece como enviado) y marcar muestra "❌ Falta publicar las reglas (cobrosLog)…" sin dejar la marca.

### 10.4 Automatización (siguiente paso)
`cobros-engine.js` corre igual en Node: `const E = require('./cobros-engine.js')`. Una CF programada (p. ej. 8 am hora Colombia) lee `students`, `payments`, `paymentExceptions` con Admin SDK, llama `E.computeRows({ …, todayIso })`, filtra los buckets que se quieren enviar solos (`remind`, `soon`, `today`, `late`), salta los que ya tienen `cobrosLog/{hoy}/{id}`, manda `E.buildText(row, 'Ciudad Bilingüe').whatsapp` por la API de WhatsApp Business (plantillas aprobadas por Meta) y escribe `cobrosLog/{hoy}/{id}` con `channel: 'auto'` (habría que agregar ese valor a la UI). Como el engine es el mismo archivo, la vista manual y el envío automático nunca se contradicen.

### 10.5 Cómo probar
1. `node --check cobros-engine.js students-unified.js`; prueba del engine (30+ casos, todos los buckets, parcial, mes anterior, acuerdo vencido/vigente, semestre, prueba, por horas, inscrito después, vacaciones, día 31).
2. Navegador (sesión del dueño, después de desplegar la regla): Estudiantes unificado → select Cobranza muestra conteos; elegir ⛔ Vencido → lista ordenada, chips de bucket; abrir uno → tarjeta 💰 con el texto; cambiar la Firma → el texto cambia; 💬 WhatsApp abre wa.me con el texto y el estudiante sale de la lista (✓ enviado hoy …); ➡ Siguiente pasa al que seguía; desmarcar "ocultar enviados hoy" → vuelve a aparecer con "✓ hh:mm 💬"; ↩ Deshacer quita la marca; Firebase console → `cobrosLog/{hoy}`; Admin → Auditoría → "Cobro enviado".
3. Cerrar y abrir la vista → el select vuelve a "Todos". Con un usuario `ventas`: tarjeta sin botones de escritura.
4. Comparar los conteos con tutorbox.app/admin/cobros el mismo día (diferencias esperadas: ver 10.6).

### 10.6 Diferencias conocidas con el portal
- Activo = `status || 'active'` (convención del CRM); el portal además mira Grupos 2.0 para fichas sin `status`.
- El portal salta a los profesores/personal que tienen ficha de alumno (por su rol en TutorBox); aquí no hay roles de TutorBox, así que aparecen (salvo que sean Prueba/por horas/valor 0).
- El mes anterior no se cobra si el estudiante estuvo inactivo ese mes (`isMonthRequiredByStatus`); el portal no lo mira.

## 11. 🖼️ Tarjeta (imagen WhatsApp) — 23 Oct 2026

Pedido del fundador: "Agrega a los botones un generador de imagen que pueda copiar, con el nombre del estudiante, con el mensaje bonito… uno para 8–5 días antes, otro para 2 días, otro para el día de pago y otro para cuentas suspendidas. Que para entrar a clase hoy debe pagar, pero bonito y motivador, recordándole todo lo que se pierde."

### 11.1 Archivos
- `cobros-card.js` (nuevo, UMD como `cobros-engine.js`: `window.CobrosCard` + `module.exports`; sin Firebase). `MOMENTS` / `MOMENT`, `textFor(row, sender, moment?)` → `{ who, pill, body, headline, sub, sender }` (puro, corre en Node), `drawCard(canvas, {…, octo})`, `loadOcto()` (→ `images/octopus.png`, nunca falla: sin imagen dibuja sin pulpo), `toPngBlob(canvas)`, `fileName(row)` → `recordatorio-{dos nombres}-{fecha de vencimiento}.png`.
- `images/octopus.png` (copiado de `portal-web/public/octopus.png`).
- `students-unified.js`: botón **🖼️ Tarjeta** en la tarjeta 💰 Cobranza → modal en `<body>` (z-index 10001) con la vista previa, select **Momento** (por defecto el bucket de la fila), **Firma** (misma clave `tbx_cobros_sender`; sincroniza la Firma y el texto de la tarjeta 💰), **📋 Copiar imagen**, **⬇️ Descargar**, **💬 Abrir WhatsApp** (wa.me con el texto plano de `buildText` — o el borrador editado si el momento es el de la fila; la imagen se pega a mano), **✅ Ya le envié** (`logSent(id, momento, 'card')`, icono 🖼️) y **Cerrar** (también Esc / clic afuera; se cierra solo si se sale de la vista). Ventas: abre, copia y descarga; sin WhatsApp ni "Ya le envié". Ninguna escritura nueva.
- `index.html`: `cobros-card.js?v=20261023` entre `cobros-engine.js` y `students-unified.js?v=20261023c`.

### 11.2 Momentos → textos (fila de ejemplo: vence el viernes 2 de octubre, $200.000)
Saludo dibujado: "Hola, {dos nombres} 👋". Sub = `Mensualidad $X · Nequi / Bancolombia o efectivo en la escuela` (pago parcial: `Te falta $X de tu mensualidad · …`; mes anterior: el saldo de ese mes).

| Bucket | Pill | Cuerpo | Recuadro 🗓️ |
|---|---|---|---|
| `remind` (3–5 días antes) | Recordatorio de pago | Te recordamos que tu mensualidad vence el {fecha}. Realiza tu pago desde ya para que sigas disfrutando de tus clases 😉 | Vence el {fecha} |
| `soon` (1–2 días) | Recordatorio de pago | Tu mensualidad vence mañana, {fecha} / vence en 2 días, el {fecha}. Realiza tu pago para que sigas disfrutando de tus clases 😉 | Mañana · {fecha} / Vence el {fecha} |
| `today` | Hoy es tu día de pago | Recuerda que para entrar a clase hoy debes realizar tu pago. ¡Tus clases en vivo, tu grupo, tus cristales y tu progreso en Tuto's World te esperan! 💎 | Hoy · {fecha} |
| `late` (1–7 días) | Pago pendiente | Tu mensualidad venció el {fecha}. Realiza tu pago antes de tu próxima clase para que sigas disfrutando con normalidad 🙏 | Venció el {fecha} |
| `suspend` (8+ días) | Cuenta suspendida | Tu cuenta está suspendida por falta de pago. Paga, envíanos el comprobante y recuperas tu cupo, tus cristales y todo lo ganado. ¡Te esperamos! 💙 | Venció el {fecha} |
| `prev` | Mensualidad pendiente | La mensualidad de {mes} quedó pendiente. Si ya la pagaste, envíanos el comprobante; si no, ponte al día para seguir disfrutando de tus clases 🙏 | Mensualidad de {mes} |
| `agreement` | Acuerdo de pago | Según tu acuerdo con la academia, tienes plazo hasta el {hasta} para ponerte al día. ¡Gracias por cumplirlo! 😉 | Hasta el {hasta} |

Los cuerpos están medidos para caber en **3 líneas** a 760 px con la fecha más larga ("miércoles 30 de septiembre"): con 4 líneas la caja de WhatsApp baja hasta el pulpo y el número queda tapado. Si se cambia un texto, renderizar de nuevo y revisar.

### 11.3 Cómo se portó el dibujo
`wrap`, `roundRect` y `drawCard` copiados línea por línea de `portal-web/src/app/admin/cobranza/page.tsx` (TypeScript → JS): mismo degradado, puntos, círculo "CIUDAD BILINGÜE", pill amarilla `📅 …`, tamaños/posiciones, fuente `"Segoe UI", Inter, Roboto, Arial`, número `324 297 3737` y pulpo en (760, 1000). Dos diferencias mínimas: (1) el titular del recuadro 🗓️ se encoge (34 → 24 px) solo si pasa de 610 px, para que una fecha larga no se salga; (2) el pie usa la Firma tal cual (el portal le añadía " Osorio").

### 11.4 Portapapeles
`navigator.clipboard.write([new ClipboardItem({'image/png': …})])` solo funciona en contexto seguro (HTTPS o localhost) y, para imágenes, en Chrome/Edge (Firefox y algunos Safari no). Primero se intenta con la promesa del PNG (Safari la exige) y luego con el Blob; si todo falla se descarga el PNG y el modal lo dice.

### 11.5 Cómo probar
1. `node --check cobros-card.js students-unified.js`; `node -e "const c=require('./cobros-card.js'); …textFor(…)"` imprime los 7 textos.
2. Navegador (sesión del dueño): Estudiantes unificado → filtro 🔴 Hoy (o cualquier bucket) → abrir un estudiante → **🖼️ Tarjeta** → aparece la imagen con su nombre y el pulpo. Cambiar Momento → se redibuja; cambiar Firma → cambia el pie y el texto de la tarjeta 💰.
3. **📋 Copiar imagen** → pegar (Ctrl+V) en WhatsApp Web; **⬇️ Descargar** → `recordatorio-nombre-AAAA-MM-DD.png`; **💬 Abrir WhatsApp** → wa.me con el texto; **✅ Ya le envié** → el modal se cierra, la lista muestra "✓ hh:mm 🖼️" y `cobrosLog/{hoy}/{id}.channel = 'card'`.
4. Usuario `ventas`: el botón 🖼️ Tarjeta abre el modal con solo Copiar / Descargar / Cerrar.
