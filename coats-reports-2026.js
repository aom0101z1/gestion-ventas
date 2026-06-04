// coats-reports-2026.js - COATS Cadena Corporate English Training Reports (Full Year 2025-2026)
// ===== PROFESSIONAL BILINGUAL REPORTING SYSTEM =====
// Covers June 11, 2025 → May 29, 2026 (12 months).
// Per-group maxPossibleHours reflect actual sessions held (cancellations subtracted).

class CoatsReportsManager {
    constructor() {
        this.initialized = false;
        this.language = 'es'; // 'es' or 'en'
        this.charts = {};

        // COATS Program Data - Full year June 2025 to May 29, 2026
        this.programData = {
            company: 'COATS Cadena',
            programName: 'Corporate English Training Program',
            programNameEs: 'Programa de Capacitación en Inglés Corporativo',
            period: {
                start: '2025-06-11',
                end: '2026-05-29',
                semester: 'Full Year 2025-2026 / Año Completo 2025-2026'
            },
            totalBooks: 12,
            // Per-group maxPossibleHours overrides this default (each group has its own value
            // because the 2026 cancellation calendar differs by group schedule: 178/180/182/188).
            maxPossibleHours: 183,
            monthlyMaxHours: {
                // 2025 (program-wide) — unchanged from original report
                jun: 12, jul: 22, ago: 12, sep: 18, oct: 18, nov: 16, dic: 8,
                // 2026 (averaged across groups; per-group overrides used in actual calculations)
                ene: 10, feb: 16, mar: 17, abr: 17, may: 17
            },
            // Book structure with page counts
            // CEFR Levels: PreA1 (1-3), A1 (4-5), A2 (6-7), B1 (8), B2 (9-10), C1 (11-12)
            // Current program reaches B2 (Book 10). Books 7-12 divided into parts A and B.
            bookPages: {
                1: { pages: 62, level: 'PreA1' },
                2: { pages: 61, level: 'PreA1' },
                3: { pages: 50, level: 'PreA1' },
                4: { pages: 65, level: 'A1' },
                5: { pages: 50, level: 'A1' },
                6: { pages: 87, level: 'A2' },
                // Advanced books are divided into Part A and Part B (bound together)
                '7A': { pages: 50, level: 'A2', part: 'A' },
                '7B': { pages: 107, level: 'A2', part: 'B' },
                '8A': { pages: 50, level: 'B1', part: 'A' },
                '8B': { pages: 107, level: 'B1', part: 'B' },
                '9A': { pages: 50, level: 'B2', part: 'A' },
                '9B': { pages: 107, level: 'B2', part: 'B' },
                '10A': { pages: 50, level: 'B2', part: 'A' },
                '10B': { pages: 107, level: 'B2', part: 'B' },
                '11A': { pages: 50, level: 'C1', part: 'A' },
                '11B': { pages: 107, level: 'C1', part: 'B' },
                '12A': { pages: 50, level: 'C1', part: 'A' },
                '12B': { pages: 107, level: 'C1', part: 'B' }
            },
            groups: this.initializeGroupsData()
        };

        // Translations
        this.translations = {
            es: {
                title: 'Reporte de Progreso - Programa de Inglés',
                subtitle: 'Ciudad Bilingüe para COATS Cadena',
                executiveSummary: 'Resumen Ejecutivo',
                programOverview: 'Vista General del Programa',
                groupProgress: 'Progreso por Grupo',
                individualProgress: 'Progreso Individual',
                attendanceAnalysis: 'Análisis de Asistencia',
                recognitionAwards: 'Reconocimientos y Premios',
                attendanceVsProgress: 'Asistencia vs Progreso',
                attendanceVsProgressDesc: 'Gráfica de Dispersión: Cada punto representa un estudiante. El eje horizontal (X) muestra su porcentaje de asistencia, y el eje vertical (Y) muestra cuántos libros ha avanzado. Los colores indican el nivel de asistencia: verde (≥70%), amarillo (50-69%), rojo (<50%). Esta gráfica permite visualizar la correlación entre asistencia y progreso académico.',
                monthlyTrend: 'Tendencia Mensual de Asistencia',
                monthlyTrendDesc: 'Muestra el promedio de horas de asistencia por estudiante en cada grupo a lo largo del contrato completo (Junio 2025 → Mayo 2026, 12 meses). Al usar promedios, los datos se normalizan permitiendo comparar grupos con diferente número de estudiantes activos (Grupo 1: 8, Grupo 2: 8, Grupo 3: 10, Grupo 4: 5).',
                totalStudents: 'Total Estudiantes',
                totalHours: 'Total Horas-Estudiante',
                classHoursDelivered: 'Horas de Clase Impartidas',
                studentHoursExplanation: 'Suma de horas asistidas por cada estudiante',
                classHoursExplanation: 'Horas de clase por grupo (4 grupos × horas/mes)',
                avgAttendance: 'Asistencia Promedio',
                booksCompleted: 'Libros Completados',
                activeGroups: 'Grupos Activos',
                completionRate: 'Tasa de Finalización',
                programStructure: 'Estructura del Programa',
                programBooks: 'Libros del Programa',
                cefrLevel: 'Nivel CEFR',
                preA1toC1: 'PreA1 → C1',
                cefrFramework: 'Marco Común Europeo de Referencia',
                hours: 'horas',
                attendance: 'Asistencia',
                progress: 'Progreso',
                book: 'Libro',
                page: 'Página',
                schedule: 'Horario',
                teachers: 'Profesores',
                students: 'Estudiantes',
                startDate: 'Fecha de Inicio',
                currentStatus: 'Estado Actual',
                name: 'Nombre',
                group: 'Grupo',
                totalHoursAttended: 'Horas Totales Asistidas',
                attendanceRate: 'Tasa de Asistencia',
                booksAdvanced: 'Libros Avanzados',
                goldAward: 'Premio Oro - Excelencia en Asistencia',
                silverAward: 'Premio Plata - Alta Dedicación',
                bronzeAward: 'Premio Bronce - Compromiso Destacado',
                perfectAttendance: 'Asistencia Perfecta',
                mostImproved: 'Mayor Progreso',
                consistency: 'Consistencia Ejemplar',
                correlation: 'Correlación Asistencia-Progreso',
                correlationText: 'Los datos demuestran una correlación directa entre la asistencia regular y el progreso en el aprendizaje del idioma.',
                highAttendance: 'Alta Asistencia (≥70%)',
                mediumAttendance: 'Asistencia Media (50-69%)',
                lowAttendance: 'Baja Asistencia (<50%)',
                exportPDF: 'Exportar PDF',
                exportExcel: 'Exportar Excel',
                print: 'Imprimir',
                jan: 'Ene', feb: 'Feb', mar: 'Mar', apr: 'Abr', may: 'May', jun: 'Jun',
                jul: 'Jul', aug: 'Ago', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dic',
                programCompleted: '¡PROGRAMA COMPLETADO!',
                bookCompleted: '¡LIBRO COMPLETADO!',
                inProgress: 'En Progreso',
                groupCompleted: 'Libros Completados',
                bookProgress: 'Progreso del Libro Actual',
                overallProgress: 'Progreso General del Programa',
                keyInsights: 'Hallazgos Clave',
                insight1: 'Los estudiantes con >70% asistencia avanzan 40% más rápido',
                insight2: 'Grupo 4 completó el Libro 7 - Los libros 7-12 son significativamente más extensos',
                insight3: 'Tasa de retención del programa: 94% (solo 2 retiros confirmados)',
                advancedBooksNote: 'Nota: Los libros 7-12 son considerablemente más extensos que los libros 1-6, requiriendo más horas de estudio por libro.',
                advancedBooksNoteShort: 'Libros avanzados (7-12) son más extensos',
                lateStartNote: 'Inició',
                withdrawnStudents: 'Estudiantes Retirados',
                withdrawnNote: 'No se incluyen en el cálculo de asistencia promedio',
                generatedOn: 'Generado el',
                confidential: 'Documento Confidencial - Solo para uso interno de COATS',
                viewStudentList: 'Ver Lista de Estudiantes',
                hideStudentList: 'Ocultar Lista',
                privateClasses: 'Clases Privadas',
                privateClassesDesc: 'Estudiantes que complementan las clases grupales con sesiones individuales personalizadas',
                privateHours: 'Horas Privadas',
                evaluation: 'Evaluación',
                examDate: 'Fecha de Examen',
                examDuration: 'Duración del Examen',
                skillLevel: 'Nivel por Habilidad',
                grammar: 'Gramática',
                reading: 'Lectura',
                writing: 'Escritura',
                speaking: 'Speaking',
                listening: 'Comprensión Auditiva',
                areasToImprove: 'Áreas de Mejora',
                strengths: 'Fortalezas',
                teacherNotes: 'Observaciones del Profesor',
                alsoInGroup: 'También en',
                generalObservations: 'Observaciones Generales de los Profesores',
                generalObservationsDesc: 'Comentarios consolidados del equipo docente sobre el progreso general del programa',
                // Highlights / benchmark / context (added 2026-06-02)
                highlights: 'Logros Destacados del Programa',
                highlightsSubtitle: 'Resultados clave del año académico 2025-2026',
                hl_retentionLabel: 'Tasa de Retención',
                hl_retentionSub: 'estudiantes activos al cierre',
                hl_booksLabel: 'Libros Avanzados (Promedio)',
                hl_booksSub: 'todos los grupos subieron de libro',
                hl_cefrReachedLabel: 'Nivel CEFR Alcanzado',
                hl_cefrReachedSub: 'según el grupo',
                hl_excellentLabel: 'Estudiantes con Asistencia Excelente',
                hl_excellentSub: 'sobre 70% — meta del programa',
                hl_hoursLabel: 'Horas Totales de Capacitación',
                hl_hoursSub: 'horas-estudiante impartidas',
                hl_cefrLabel: 'Cobertura CEFR',
                hl_cefrSub: 'todos los grupos avanzaron de nivel',
                hl_groupsLabel: 'Grupos que Subieron de Nivel',
                hl_groupsSub: 'de 4 grupos activos',
                benchmarkNote: 'Asistencia promedio en programas corporativos voluntarios comparables: 50–65%. Cualquier valor superior a 70% se considera excelente.',
                benchmarkExcellent: 'Excelente ≥70%',
                benchmarkGood: 'Bueno 50–69%',
                benchmarkLow: 'Por debajo del benchmark <50%',
                denominatorNote: '⏰ Las horas máximas reflejan el calendario real de clases para cada grupo, excluyendo festivos oficiales (Semana Santa, Día del Trabajo) y cancelaciones de calendario. Por eso el máximo varía entre 178h y 188h según el grupo.',
                teacherQuoteTitle: 'Del equipo docente',
                teacherQuoteText: 'Los estudiantes que asisten con regularidad muestran un progreso notablemente más rápido y mayor confianza al hablar inglés. La correlación entre asistencia y avance académico es muy clara en este programa.',
                unit: 'Unidad',
                intensityNote: 'A pesar de la baja intensidad horaria de 4 horas por semana, todos los estudiantes lograron avanzar varios libros dentro de nuestro programa de conversación. Cada libro contiene 40 unidades temáticas.',
                finalProgressTitle: 'Posición Final por Grupo (al 29 de Mayo de 2026)',
                finalProgressSubtitle: 'Punto de partida y punto de llegada después de 12 meses de programa',
                progressStarted: 'Inició',
                progressEnded: 'Terminó',
                bookCompletedLabel: '¡Libro completado!',
                booksCovered: 'libros cubiertos',
                bookProgressLabel: 'Progreso en',
                programProgressLabel: 'Progreso del programa total (12 libros → C1)',
                programPositionLabel: 'del programa de 12 libros',
                booksThisYearTitle: 'Libros Avanzados Durante el Contrato Completo',
                booksThisYearDesc: 'Cantidad de libros que cada grupo cubrió a lo largo del contrato completo (Jun 2025 → May 2026, ambos semestres del año académico). No incluye libros previamente completados antes del inicio del contrato.',
                booksThisYearLabel: 'libros en el contrato',
                individualProgressToggleOpen: '👥 Haciendo click aquí abres la lista completa de estudiantes y podrás ver su progreso individual',
                individualProgressToggleClose: '🔽 Ocultar lista de estudiantes',
                individualProgressTip: 'La lista incluye los 31 estudiantes activos del programa, ordenados por tasa de asistencia.',
                awardsToggleOpen: '🏆 Haga click aquí para abrir esta sección y ver los reconocimientos y premios entregados',
                awardsToggleClose: '🔽 Ocultar reconocimientos y premios',
                awardsTip: 'Premios Oro, Plata y Bronce otorgados según asistencia y dedicación durante todo el contrato.',
                privateClassesToggleOpen: '👩‍🏫 Haga click aquí para abrir la sección de Clases Privadas y ver el detalle de cada estudiante',
                privateClassesToggleClose: '🔽 Ocultar sección de Clases Privadas',
                privateClassesTip: '4 estudiantes con clases individuales complementarias durante el contrato.',
                withdrawnToggleOpen: '📋 Haga click aquí para ver los estudiantes retirados del programa',
                withdrawnToggleClose: '🔽 Ocultar estudiantes retirados',
                withdrawnTip: 'Estudiantes que se retiraron durante el contrato. No se incluyen en el cálculo de asistencia promedio.',
                attendanceAnalysisToggleOpen: '📊 Haga click aquí para abrir el análisis de asistencia con gráficas detalladas',
                attendanceAnalysisToggleClose: '🔽 Ocultar análisis de asistencia',
                attendanceAnalysisTip: 'Incluye gráficas de asistencia por estudiante, progreso por grupo, y tendencia mensual a lo largo del contrato.',
                groupProgressToggleOpen: '📈 Haga click aquí para abrir la sección de Progreso por Grupo y ver el detalle de cada grupo',
                groupProgressToggleClose: '🔽 Ocultar Progreso por Grupo',
                groupProgressTip: 'Detalle por grupo: asistencia promedio, libro y unidad actual, profesores asignados, y lista expandible de estudiantes con sus horas y porcentajes.'
            },
            en: {
                title: 'Progress Report - English Program',
                subtitle: 'Ciudad Bilingüe for COATS Cadena',
                executiveSummary: 'Executive Summary',
                programOverview: 'Program Overview',
                groupProgress: 'Group Progress',
                individualProgress: 'Individual Progress',
                attendanceAnalysis: 'Attendance Analysis',
                recognitionAwards: 'Recognition & Awards',
                attendanceVsProgress: 'Attendance vs Progress',
                attendanceVsProgressDesc: 'Scatter Plot: Each point represents a student. The horizontal axis (X) shows their attendance percentage, and the vertical axis (Y) shows how many books they have advanced. Colors indicate attendance level: green (≥70%), yellow (50-69%), red (<50%). This chart visualizes the correlation between attendance and academic progress.',
                monthlyTrend: 'Monthly Attendance Trend',
                monthlyTrendDesc: 'Shows the average attendance hours per student in each group throughout the full contract (June 2025 → May 2026, 12 months). By using averages, the data is normalized allowing comparison between groups with different numbers of active students (Group 1: 8, Group 2: 8, Group 3: 10, Group 4: 5).',
                totalStudents: 'Total Students',
                totalHours: 'Total Student-Hours',
                classHoursDelivered: 'Class Hours Delivered',
                studentHoursExplanation: 'Sum of hours attended by each student',
                classHoursExplanation: 'Class hours per group (4 groups × hours/month)',
                avgAttendance: 'Average Attendance',
                booksCompleted: 'Books Completed',
                activeGroups: 'Active Groups',
                completionRate: 'Completion Rate',
                programStructure: 'Program Structure',
                programBooks: 'Program Books',
                cefrLevel: 'CEFR Level',
                preA1toC1: 'PreA1 → C1',
                cefrFramework: 'Common European Framework of Reference',
                hours: 'hours',
                attendance: 'Attendance',
                progress: 'Progress',
                book: 'Book',
                page: 'Page',
                schedule: 'Schedule',
                teachers: 'Teachers',
                students: 'Students',
                startDate: 'Start Date',
                currentStatus: 'Current Status',
                name: 'Name',
                group: 'Group',
                totalHoursAttended: 'Total Hours Attended',
                attendanceRate: 'Attendance Rate',
                booksAdvanced: 'Books Advanced',
                goldAward: 'Gold Award - Attendance Excellence',
                silverAward: 'Silver Award - High Dedication',
                bronzeAward: 'Bronze Award - Outstanding Commitment',
                perfectAttendance: 'Perfect Attendance',
                mostImproved: 'Most Improved',
                consistency: 'Exemplary Consistency',
                correlation: 'Attendance-Progress Correlation',
                correlationText: 'Data demonstrates a direct correlation between regular attendance and language learning progress.',
                highAttendance: 'High Attendance (≥70%)',
                mediumAttendance: 'Medium Attendance (50-69%)',
                lowAttendance: 'Low Attendance (<50%)',
                exportPDF: 'Export PDF',
                exportExcel: 'Export Excel',
                print: 'Print',
                jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun',
                jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec',
                programCompleted: 'PROGRAM COMPLETED!',
                bookCompleted: 'BOOK COMPLETED!',
                inProgress: 'In Progress',
                groupCompleted: 'Books Completed',
                bookProgress: 'Current Book Progress',
                overallProgress: 'Overall Program Progress',
                keyInsights: 'Key Insights',
                insight1: 'Students with >70% attendance progress 40% faster',
                insight2: 'Group 4 completed Book 7 - Books 7-12 are significantly more extensive',
                insight3: 'Program retention rate: 94% (only 2 confirmed dropouts)',
                advancedBooksNote: 'Note: Books 7-12 are considerably more extensive than books 1-6, requiring more study hours per book.',
                advancedBooksNoteShort: 'Advanced books (7-12) are more extensive',
                lateStartNote: 'Started',
                withdrawnStudents: 'Withdrawn Students',
                withdrawnNote: 'Not included in average attendance calculation',
                generatedOn: 'Generated on',
                confidential: 'Confidential Document - For COATS Internal Use Only',
                viewStudentList: 'View Student List',
                hideStudentList: 'Hide List',
                privateClasses: 'Private Classes',
                privateClassesDesc: 'Students complementing group classes with personalized individual sessions',
                privateHours: 'Private Hours',
                evaluation: 'Evaluation',
                examDate: 'Exam Date',
                examDuration: 'Exam Duration',
                skillLevel: 'Skill Level',
                grammar: 'Grammar',
                reading: 'Reading',
                writing: 'Writing',
                speaking: 'Speaking',
                listening: 'Listening',
                areasToImprove: 'Areas to Improve',
                strengths: 'Strengths',
                teacherNotes: 'Teacher Notes',
                alsoInGroup: 'Also in',
                generalObservations: 'General Teacher Observations',
                generalObservationsDesc: 'Consolidated comments from the teaching team on overall program progress',
                // Highlights / benchmark / context (added 2026-06-02)
                highlights: 'Program Highlights',
                highlightsSubtitle: 'Key results for the 2025-2026 academic year',
                hl_retentionLabel: 'Retention Rate',
                hl_retentionSub: 'students active at year-end',
                hl_booksLabel: 'Books Advanced (Avg)',
                hl_booksSub: 'every group moved up a book',
                hl_cefrReachedLabel: 'CEFR Level Reached',
                hl_cefrReachedSub: 'depending on group',
                hl_excellentLabel: 'Students with Excellent Attendance',
                hl_excellentSub: 'above 70% — the program target',
                hl_hoursLabel: 'Total Training Hours',
                hl_hoursSub: 'student-hours delivered',
                hl_cefrLabel: 'CEFR Coverage',
                hl_cefrSub: 'all groups advanced a level',
                hl_groupsLabel: 'Groups That Advanced',
                hl_groupsSub: 'of 4 active groups',
                benchmarkNote: 'Average attendance in comparable voluntary corporate language programs: 50–65%. Anything above 70% is considered excellent.',
                benchmarkExcellent: 'Excellent ≥70%',
                benchmarkGood: 'Good 50–69%',
                benchmarkLow: 'Below benchmark <50%',
                denominatorNote: '⏰ Max possible hours reflect each group\'s actual class calendar, excluding official holidays (Holy Week, Labor Day) and calendar cancellations. This is why the max varies between 178h and 188h depending on the group.',
                teacherQuoteTitle: 'From the teaching team',
                teacherQuoteText: 'Students who attend regularly show notably faster progress and greater confidence speaking English. The correlation between attendance and academic advancement is very clear in this program.',
                unit: 'Unit',
                intensityNote: 'Despite the low weekly intensity of just 4 hours per week, all students managed to advance several books in our conversation program. Each book contains 40 thematic units.',
                finalProgressTitle: 'Final Position by Group (as of May 29, 2026)',
                finalProgressSubtitle: 'Starting point and ending point after 12 months of program',
                progressStarted: 'Started',
                progressEnded: 'Finished',
                bookCompletedLabel: 'Book completed!',
                booksCovered: 'books covered',
                bookProgressLabel: 'Progress in',
                programProgressLabel: 'Overall program progress (12 books → C1)',
                programPositionLabel: 'of the 12-book program',
                booksThisYearTitle: 'Books Advanced During the Full Contract',
                booksThisYearDesc: 'Number of books each group covered throughout the full contract (Jun 2025 → May 2026, both semesters of the academic year). Does not include books previously completed before the contract started.',
                booksThisYearLabel: 'books in contract',
                individualProgressToggleOpen: '👥 Click here to open the complete student list and view their individual progress',
                individualProgressToggleClose: '🔽 Hide student list',
                individualProgressTip: 'The list includes all 31 active students in the program, sorted by attendance rate.',
                awardsToggleOpen: '🏆 Click here to open this section and see the recognitions and awards delivered',
                awardsToggleClose: '🔽 Hide recognitions and awards',
                awardsTip: 'Gold, Silver, and Bronze awards delivered based on attendance and dedication throughout the contract.',
                privateClassesToggleOpen: '👩‍🏫 Click here to open the Private Classes section and view each student\'s details',
                privateClassesToggleClose: '🔽 Hide Private Classes section',
                privateClassesTip: '4 students with complementary individual classes during the contract.',
                withdrawnToggleOpen: '📋 Click here to view students who withdrew from the program',
                withdrawnToggleClose: '🔽 Hide withdrawn students',
                withdrawnTip: 'Students who withdrew during the contract. Not included in the average attendance calculation.',
                attendanceAnalysisToggleOpen: '📊 Click here to open the attendance analysis with detailed charts',
                attendanceAnalysisToggleClose: '🔽 Hide attendance analysis',
                attendanceAnalysisTip: 'Includes attendance-per-student chart, group progress, and monthly trend across the contract.',
                groupProgressToggleOpen: '📈 Click here to open the Group Progress section and see each group\'s details',
                groupProgressToggleClose: '🔽 Hide Group Progress',
                groupProgressTip: 'Per-group detail: average attendance, current book and unit, assigned teachers, and an expandable student list with their hours and percentages.'
            }
        };
    }

    initializePrivateStudents() {
        // Full year totals: 2025 (Jun-Dec) + 2026 (Jan-May) private-class hours
        return [
            {
                name: 'Beatriz Valencia',
                privateHours: 72,  // 40 (2025) + 32 (2026, Vanessa Osorio, Libro 5 refuerzo)
                privateHoursBreakdown: { 2025: 40, 2026: 32 },
                teacher: 'Vanessa Osorio',
                groupRef: 'Grupo 1',
                currentBook: '7A',
                examDate: '2025-12-07',
                examDuration: null,
                skills: {
                    grammar: { level: 'A2', status: 'achieved' },
                    reading: { level: 'A2', status: 'on-track' },
                    writing: { level: 'A2', status: 'on-track' },
                    speaking: { level: 'A2', status: 'achieved' },
                    listening: { level: 'A2', status: 'on-track' }
                },
                strengths: [
                    { es: 'Inició muy débil en el grupo y terminó siendo una de las mejores de la clase', en: 'Started very weak in the group and ended up being one of the best in class' },
                    { es: 'Notable mejora en fluidez al hablar inglés', en: 'Notable improvement in English speaking fluency' },
                    { es: 'Mayor confianza y seguridad al expresarse', en: 'Greater confidence and self-assurance when expressing herself' }
                ],
                areasToImprove: [
                    { es: 'Continuar reforzando Listening en contextos rápidos o con acentos variados', en: 'Keep reinforcing Listening in fast contexts or with varied accents' },
                    { es: 'Avanzar hacia estructuras gramaticales de nivel B1 en el próximo período', en: 'Advance toward B1 grammar structures in the next period' }
                ],
                teacherNotes: {
                    es: 'Inició muy débil en el grupo, pero gracias a la combinación de clases privadas y grupales terminó siendo una de las mejores de la clase. Mejoró notablemente en fluidez y confianza al hablar inglés. Cerró el contrato en el Libro 7 (nivel A2 sólido) con base preparada para iniciar B1.',
                    en: 'Started very weak in the group, but thanks to the combination of private and group classes ended up being one of the best in class. Notably improved in fluency and confidence speaking English. Closed the contract at Book 7 (solid A2 level) with the foundation ready to begin B1.'
                }
            },
            {
                name: 'Lina Arias',
                privateHours: 65,  // 40 (2025) + 25 (2026, Vanessa Osorio, Libro 7)
                privateHoursBreakdown: { 2025: 40, 2026: 25 },
                teacher: 'Vanessa Osorio',
                currentBook: '7',
                groupRef: null,
                examDate: null,
                skills: null,
                strengths: [
                    { es: 'Muy disciplinada y constante en su asistencia', en: 'Very disciplined and consistent in attendance' },
                    { es: 'Ha integrado vocabulario y expresiones de recursos humanos efectivamente', en: 'Has effectively integrated HR vocabulary and expressions' },
                    { es: 'Comunica con mayor precisión y profesionalismo', en: 'Communicates with greater precision and professionalism' },
                    { es: 'Notable progreso en confianza para hablar', en: 'Notable progress in speaking confidence' }
                ],
                areasToImprove: [
                    { es: 'Continuar practicando pronunciación de palabras poco familiares', en: 'Continue practicing pronunciation of unfamiliar words' }
                ],
                teacherNotes: {
                    es: 'Nos hemos enfocado en temas específicos de su rol en recursos humanos: presentar avances de procesos, explicar estado de tareas y reportar novedades de forma clara y estructurada. Se ha trabajado intensivamente la pronunciación de palabras que le causan dificultad.',
                    en: 'We have focused on topics specific to her HR role: presenting process updates, explaining task status, and reporting news clearly and in a structured manner. Intensive work on pronunciation of words that cause her difficulty.'
                }
            },
            {
                name: 'Valeria Pino',
                privateHours: 26,  // 2026 only (started Feb 2026)
                privateHoursBreakdown: { 2025: 0, 2026: 26 },
                teacher: 'Alexander Osorio-Lee',
                currentBook: 'Contenido corporativo personalizado',
                groupRef: null,
                startDate: '2026-02-16',
                examDate: null,
                skills: null,
                strengths: [
                    { es: 'Trabajó con vocabulario y expresiones específicas de su rol corporativo', en: 'Worked on vocabulary and expressions specific to her corporate role' },
                    { es: 'Preparación enfocada para evento profesional internacional en México', en: 'Focused preparation for international professional event in Mexico' },
                    { es: 'Progreso notable en confianza para comunicación de negocios', en: 'Notable progress in confidence for business communication' }
                ],
                areasToImprove: [
                    { es: 'Continuar reforzando estructuras formales para contextos corporativos', en: 'Continue reinforcing formal structures for corporate contexts' },
                    { es: 'Recuperar el ritmo de asistencia en las últimas semanas del período', en: 'Recover attendance pace in the final weeks of the period' }
                ],
                teacherNotes: {
                    es: 'Las sesiones se enfocaron en contenido especializado adaptado a las necesidades de su rol en COATS, con énfasis en la preparación para un evento corporativo en México. El programa incluyó comunicación profesional, networking, presentaciones y vocabulario técnico relevante para su labor. El enfoque no se limitó al material de libro estándar, sino que combinó recursos específicos según el contexto laboral, complementados con elementos del Libro 1 cuando fue pertinente reforzar bases gramaticales. Esta metodología permitió aplicar el aprendizaje directamente a situaciones reales del entorno profesional.',
                    en: 'Sessions focused on specialized content tailored to her role at COATS, with emphasis on preparation for a corporate event in Mexico. The program included professional communication, networking, presentations, and relevant technical vocabulary for her work. The approach was not limited to standard textbook material but combined work-context-specific resources, complemented with elements of Book 1 when appropriate to reinforce grammar foundations. This methodology allowed her to directly apply learning to real-world professional situations.'
                }
            },
            {
                name: 'Mariluz Restrepo',
                privateHours: 26,  // 2026 only (started Feb 2026)
                privateHoursBreakdown: { 2025: 0, 2026: 26 },
                teacher: 'Alexander Osorio-Lee',
                currentBook: 'Contenido corporativo personalizado',
                groupRef: null,
                startDate: '2026-02-16',
                examDate: null,
                skills: null,
                strengths: [
                    { es: 'Desarrollo de vocabulario técnico y profesional alineado a su rol en la empresa', en: 'Developed technical and professional vocabulary aligned with her role in the company' },
                    { es: 'Preparación específica para evento corporativo internacional en México', en: 'Specific preparation for international corporate event in Mexico' },
                    { es: 'Mejora en fluidez para conversaciones de negocios y networking', en: 'Improved fluency for business conversations and networking' }
                ],
                areasToImprove: [
                    { es: 'Continuar fortaleciendo estructuras formales y vocabulario corporativo avanzado', en: 'Continue strengthening formal structures and advanced corporate vocabulary' },
                    { es: 'Recuperar el ritmo de asistencia en las últimas semanas del período', en: 'Recover attendance pace in the final weeks of the period' }
                ],
                teacherNotes: {
                    es: 'Comparte horario y enfoque metodológico con Valeria Pino (Lunes y Jueves 2-4 PM). El programa se diseñó alrededor de las necesidades reales de su rol en COATS, principalmente la preparación para un evento corporativo en México. Se trabajaron temas independientes relacionados con su labor: comunicación profesional, presentaciones, vocabulario técnico y manejo de situaciones formales en inglés. El material del Libro 1 se utilizó como apoyo cuando fue necesario reforzar bases, pero la mayor parte del trabajo se centró en contenido aplicable directamente a su contexto profesional.',
                    en: 'Shares schedule and methodological approach with Valeria Pino (Monday and Thursday 2-4 PM). The program was designed around the real needs of her role at COATS, primarily preparation for a corporate event in Mexico. Independent topics related to her work were covered: professional communication, presentations, technical vocabulary, and handling formal situations in English. Book 1 material was used as support when needed to reinforce foundations, but most of the work focused on content directly applicable to her professional context.'
                }
            }
        ];
    }

    initializeGroupsData() {
        // Hours per student per month for the FULL YEAR (Jun 2025 → May 2026).
        // 2025 hours (jun-dic) are unchanged from the original 2025 report.
        // 2026 hours (ene-may) come from the COATS attendance spreadsheet
        // (parsed by _CRM_STAGED/coats-2026/parse-attendance.js).
        //
        // Per-group maxPossibleHours = 106 (2025) + actual 2026 sessions held × 2 hrs.
        // Cancellations (Festivo, Canceladas, No trabajan, Sem. Santa) reduce the
        // per-group max so they don't penalize student attendance %.
        //
        // Current pages are estimates based on hours studied vs. pages-per-hour
        // observed in 2025 (the spreadsheet does not include page numbers).
        return [
            {
                id: 'grupo-1',
                name: 'Grupo 1 - Libros 3 → 7',
                nameEn: 'Group 1 - Books 3 → 7',
                schedule: 'Lunes y Miércoles 7-9 AM (cambió en 2026; antes: Martes y Miércoles)',
                scheduleEn: 'Monday & Wednesday 7-9 AM (changed in 2026; previously: Tue & Wed)',
                startDate: '2025-06-11',
                startBook: 3,
                currentBook: 7,
                currentUnit: 38,
                totalUnits: 40,
                teachers: ['David Bedoya', 'Juanita Echavarría', 'Anderson Bedoya', 'Juan Pablo Bedoya', 'Alexander Osorio'],
                // Per-group max for the full year (106 hrs 2025 + 76 hrs 2026 = 182)
                maxPossibleHours: 182,
                monthlyMaxHours: { jun: 12, jul: 22, ago: 12, sep: 18, oct: 18, nov: 16, dic: 8, ene: 10, feb: 16, mar: 14, abr: 18, may: 18 },
                students: [
                    { name: 'BEATRIZ VALENCIA', hours: { jun: 8, jul: 22, ago: 12, sep: 14, oct: 12, nov: 10, dic: 8, ene: 10, feb: 16, mar: 14, abr: 18, may: 14 }, total: 158, status: 'active' },
                    { name: 'MARIA ALEJANDRA OCAMPO', hours: { jun: 6, jul: 22, ago: 10, sep: 16, oct: 20, nov: 4, dic: 8, ene: 2, feb: 16, mar: 14, abr: 16, may: 12 }, total: 146, status: 'active', note: 'Transferred to this group in 2025' },
                    { name: 'CATALINA VALENCIA QUINTERO', hours: { jun: 8, jul: 22, ago: 10, sep: 12, oct: 14, nov: 10, dic: 8, ene: 8, feb: 14, mar: 10, abr: 12, may: 12 }, total: 140, status: 'active' },
                    { name: 'FRANCINED GUERRERO', hours: { jun: 4, jul: 18, ago: 10, sep: 8, oct: 18, nov: 10, dic: 8, ene: 8, feb: 10, mar: 14, abr: 12, may: 18 }, total: 138, status: 'active', note: 'Previously recorded as Francinet Herrera (name corrected 2026)' },
                    { name: 'MARTIN VERA', hours: { jun: 0, jul: 18, ago: 8, sep: 14, oct: 12, nov: 4, dic: 8, ene: 10, feb: 16, mar: 10, abr: 12, may: 16 }, total: 128, status: 'active' },
                    { name: 'MARCELA LÓPEZ', hours: { jun: 6, jul: 16, ago: 4, sep: 10, oct: 12, nov: 8, dic: 8, ene: 8, feb: 14, mar: 12, abr: 14, may: 14 }, total: 126, status: 'active' },
                    { name: 'VALERIA GIRALDO PULGARÍN', hours: { jun: 4, jul: 22, ago: 10, sep: 12, oct: 12, nov: 6, dic: 8, ene: 4, feb: 16, mar: 0, abr: 0, may: 0 }, total: 94, status: 'active', note: 'Stopped attending in March 2026' },
                    { name: 'ALEKSANDRO LONDOÑO', hours: { jun: 4, jul: 14, ago: 8, sep: 16, oct: 8, nov: 4, dic: 4, ene: 2, feb: 10, mar: 2, abr: 0, may: 0 }, total: 72, status: 'active', note: 'Previously recorded as Alexandra Londoño (name corrected 2026). Stopped attending in April 2026' },
                    { name: 'ANDREA CATALINA VALENCIA', hours: { jun: 8, jul: 6, ago: 0, sep: 0, oct: 0, nov: 0, dic: 0, ene: 0, feb: 0, mar: 0, abr: 0, may: 0 }, total: 14, status: 'transferred', note: 'Transferred to Group 3 in 2025' }
                ],
                totalGroupHours: 1002
            },
            {
                id: 'grupo-2',
                name: 'Grupo 2 - Libros 2 → 5',
                nameEn: 'Group 2 - Books 2 → 5',
                schedule: 'Martes y Miércoles 7-9 AM',
                scheduleEn: 'Tuesday & Wednesday 7-9 AM',
                startDate: '2025-06-18',
                startBook: 2,
                currentBook: 5,
                currentUnit: 27,
                totalUnits: 40,
                teachers: ['Juan Pablo Bedoya'],
                // Per-group max for the full year (106 hrs 2025 + 82 hrs 2026 = 188)
                maxPossibleHours: 188,
                monthlyMaxHours: { jun: 12, jul: 22, ago: 12, sep: 18, oct: 18, nov: 16, dic: 8, ene: 12, feb: 16, mar: 20, abr: 16, may: 18 },
                students: [
                    { name: 'GERSAÍN BEDOYA P.', hours: { jun: 4, jul: 18, ago: 16, sep: 18, oct: 12, nov: 14, dic: 6, ene: 12, feb: 14, mar: 20, abr: 14, may: 16 }, total: 164, status: 'active' },
                    { name: 'MAURICIO SEPÚLVEDA HENAO', hours: { jun: 6, jul: 20, ago: 18, sep: 16, oct: 8, nov: 14, dic: 8, ene: 12, feb: 12, mar: 18, abr: 12, may: 6 }, total: 150, status: 'active' },
                    { name: 'CATALINA DUQUE OSORIO', hours: { jun: 6, jul: 16, ago: 10, sep: 14, oct: 14, nov: 14, dic: 6, ene: 12, feb: 12, mar: 20, abr: 12, may: 14 }, total: 150, status: 'active' },
                    { name: 'CARLOS EMANUEL ZAPATA', hours: { jun: 4, jul: 20, ago: 12, sep: 18, oct: 14, nov: 14, dic: 8, ene: 12, feb: 14, mar: 8, abr: 12, may: 8 }, total: 144, status: 'active' },
                    { name: 'JOSHEPLEEN DUQUE NATAL', hours: { jun: 4, jul: 18, ago: 12, sep: 14, oct: 8, nov: 10, dic: 6, ene: 12, feb: 12, mar: 18, abr: 14, may: 16 }, total: 144, status: 'active' },
                    { name: 'LEONARDO CUERVO BUITRAGO', hours: { jun: 6, jul: 16, ago: 16, sep: 10, oct: 14, nov: 10, dic: 2, ene: 12, feb: 8, mar: 20, abr: 14, may: 10 }, total: 138, status: 'active' },
                    { name: 'CARLOS ARTURO ORTIZ C.', hours: { jun: 4, jul: 18, ago: 18, sep: 14, oct: 9, nov: 12, dic: 2, ene: 8, feb: 8, mar: 12, abr: 6, may: 4 }, total: 115, status: 'active' },
                    { name: 'CARLOS ANDRES MEJÍA', hours: { jun: 2, jul: 12, ago: 12, sep: 10, oct: 8, nov: 2, dic: 0, ene: 8, feb: 14, mar: 12, abr: 16, may: 6 }, total: 102, status: 'active' },
                    { name: 'ANDRES FELIPE CALVO OSPINA', hours: { jun: 4, jul: 16, ago: 10, sep: 0, oct: 0, nov: 0, dic: 0, ene: 0, feb: 0, mar: 0, abr: 0, may: 0 }, total: 30, status: 'inactive', note: 'Did not return since September 2025' },
                    { name: 'VALERIA GIRALDO PULGARÍN', hours: { jun: 0, jul: 0, ago: 0, sep: 0, oct: 0, nov: 0, dic: 0, ene: 0, feb: 0, mar: 0, abr: 0, may: 0 }, total: 0, status: 'transferred', note: 'Transferred to Group 1' },
                    { name: 'MARIA ALEJANDRA OCAMPO HOLGUÍN', hours: { jun: 0, jul: 0, ago: 0, sep: 0, oct: 0, nov: 0, dic: 0, ene: 0, feb: 0, mar: 0, abr: 0, may: 0 }, total: 0, status: 'transferred', note: 'Transferred to Group 1' }
                ],
                totalGroupHours: 1107 // Excludes inactive student (Andres Felipe: 30 hrs)
            },
            {
                id: 'grupo-3',
                name: 'Grupo 3 - Libros 4 → 7',
                nameEn: 'Group 3 - Books 4 → 7',
                schedule: 'Martes y Miércoles 7-9 AM',
                scheduleEn: 'Tuesday & Wednesday 7-9 AM',
                startDate: '2025-06-11',
                startBook: 4,
                currentBook: 7,
                currentUnit: 38,
                totalUnits: 40,
                teachers: ['Anderson Bedoya', 'César Grisales', 'Alexander Osorio', 'Lee Stoutmire'],
                // Per-group max for the full year (106 hrs 2025 + 74 hrs 2026 = 180)
                maxPossibleHours: 180,
                monthlyMaxHours: { jun: 12, jul: 22, ago: 12, sep: 18, oct: 18, nov: 16, dic: 8, ene: 8, feb: 16, mar: 18, abr: 16, may: 16 },
                students: [
                    { name: 'ANDREA CATALINA VALENCIA', hours: { jun: 12, jul: 14, ago: 12, sep: 12, oct: 14, nov: 10, dic: 8, ene: 8, feb: 14, mar: 16, abr: 12, may: 10 }, total: 142, status: 'active', note: 'Transferred from Group 1 in 2025' },
                    { name: 'DANIELA GARCÍA FLOREZ', hours: { jun: 10, jul: 12, ago: 14, sep: 12, oct: 14, nov: 16, dic: 8, ene: 8, feb: 14, mar: 12, abr: 14, may: 6 }, total: 140, status: 'active' },
                    { name: 'VIVIANA URIBE', hours: { jun: 12, jul: 14, ago: 12, sep: 12, oct: 10, nov: 10, dic: 6, ene: 8, feb: 14, mar: 12, abr: 12, may: 16 }, total: 138, status: 'active' },
                    { name: 'MARIANA OBANDO', hours: { jun: 12, jul: 12, ago: 12, sep: 12, oct: 10, nov: 10, dic: 6, ene: 8, feb: 16, mar: 16, abr: 10, may: 12 }, total: 136, status: 'active' },
                    { name: 'JUAN PABLO BERMUDEZ', hours: { jun: 12, jul: 8, ago: 12, sep: 12, oct: 14, nov: 16, dic: 8, ene: 8, feb: 8, mar: 16, abr: 12, may: 8 }, total: 134, status: 'active' },
                    { name: 'GISELA ARCILA', hours: { jun: 12, jul: 10, ago: 10, sep: 10, oct: 6, nov: 10, dic: 8, ene: 8, feb: 16, mar: 18, abr: 12, may: 12 }, total: 132, status: 'active' },
                    { name: 'PAULA CARDONA', hours: { jun: 12, jul: 12, ago: 10, sep: 12, oct: 12, nov: 10, dic: 8, ene: 8, feb: 16, mar: 12, abr: 10, may: 8 }, total: 130, status: 'active' },
                    { name: 'LUIS MAFLA', hours: { jun: 10, jul: 14, ago: 12, sep: 10, oct: 10, nov: 12, dic: 8, ene: 8, feb: 12, mar: 16, abr: 12, may: 4 }, total: 128, status: 'active' },
                    { name: 'EDITH ALEJANDRA GIL', hours: { jun: 12, jul: 12, ago: 10, sep: 10, oct: 8, nov: 0, dic: 0, ene: 8, feb: 14, mar: 14, abr: 8, may: 2 }, total: 98, status: 'active', note: 'Stopped Oct 28 2025; returned January 2026' },
                    // LUZ MARÍA started Oct 28 2025 → her max should be only Oct-Dec 2025 + full 2026
                    // = 26 (calculated) + 74 (G3 2026 max) = 100. Override directly.
                    { name: 'LUZ MARÍA HURTADO', hours: { jun: 0, jul: 0, ago: 0, sep: 0, oct: 4, nov: 14, dic: 8, ene: 8, feb: 14, mar: 16, abr: 8, may: 6 }, total: 78, status: 'active', note: 'Started Oct 28 2025', lateStart: '2025-10-28', maxPossibleHoursOverride: 100 }
                ],
                totalGroupHours: 1256
            },
            {
                id: 'grupo-4',
                name: 'Grupo 4 - Libros 6 → 8',
                nameEn: 'Group 4 - Books 6 → 8',
                schedule: 'Jueves y Viernes 7-9 AM',
                scheduleEn: 'Thursday & Friday 7-9 AM',
                startDate: '2025-06-12',
                startBook: 6,
                currentBook: 8,
                currentUnit: 40,
                totalUnits: 40,
                bookCompleted: true,
                teachers: ['Juan Pablo Bedoya', 'César Grisales', 'Anderson Bedoya'],
                // Per-group max for the full year (106 hrs 2025 + 72 hrs 2026 = 178)
                maxPossibleHours: 178,
                monthlyMaxHours: { jun: 12, jul: 22, ago: 12, sep: 18, oct: 18, nov: 16, dic: 8, ene: 8, feb: 16, mar: 16, abr: 16, may: 16 },
                students: [
                    { name: 'WILSON GONZÁLEZ', hours: { jun: 12, jul: 14, ago: 10, sep: 18, oct: 10, nov: 12, dic: 8, ene: 6, feb: 16, mar: 16, abr: 16, may: 16 }, total: 154, status: 'active' },
                    { name: 'VIVIANA VARGAS', hours: { jun: 10, jul: 12, ago: 10, sep: 18, oct: 18, nov: 10, dic: 4, ene: 6, feb: 16, mar: 16, abr: 16, may: 16 }, total: 152, status: 'active' },
                    { name: 'JUAN CAMILO ARANGO', hours: { jun: 12, jul: 14, ago: 10, sep: 18, oct: 16, nov: 8, dic: 8, ene: 8, feb: 12, mar: 16, abr: 16, may: 10 }, total: 148, status: 'active' },
                    { name: 'JULIANA ÁLVAREZ', hours: { jun: 12, jul: 14, ago: 10, sep: 18, oct: 12, nov: 14, dic: 8, ene: 8, feb: 16, mar: 10, abr: 12, may: 12 }, total: 146, status: 'active' },
                    { name: 'ANGELA ARANZAZU', hours: { jun: 12, jul: 12, ago: 10, sep: 0, oct: 16, nov: 4, dic: 4, ene: 8, feb: 10, mar: 8, abr: 10, may: 8 }, total: 102, status: 'active' },
                    { name: 'CAROLINA AGUDELO', hours: { jun: 10, jul: 12, ago: 10, sep: 18, oct: 16, nov: 4, dic: 6, ene: 4, feb: 8, mar: 6, abr: 8, may: 0 }, total: 102, status: 'inactive', note: 'Attendance dropped through 2026; no attendance in late May 2026' }
                ],
                totalGroupHours: 702 // Excludes inactive student (Carolina: 102 hrs)
            }
        ];
    }


    t(key) {
        return this.translations[this.language][key] || key;
    }

    // Calculate available hours since a specific date.
    // Walks the program timeline jun-2025 → may-2026 in order; counts only months
    // at or after startDate. Partial-month prorating preserved for the start month.
    calculateAvailableHoursSince(startDate) {
        const start = new Date(startDate);
        const monthlyHours = this.programData.monthlyMaxHours;

        // Ordered timeline of program months (with their calendar year).
        const timeline = [
            { key: 'jun', year: 2025, monthIdx: 5 },
            { key: 'jul', year: 2025, monthIdx: 6 },
            { key: 'ago', year: 2025, monthIdx: 7 },
            { key: 'sep', year: 2025, monthIdx: 8 },
            { key: 'oct', year: 2025, monthIdx: 9 },
            { key: 'nov', year: 2025, monthIdx: 10 },
            { key: 'dic', year: 2025, monthIdx: 11 },
            { key: 'ene', year: 2026, monthIdx: 0 },
            { key: 'feb', year: 2026, monthIdx: 1 },
            { key: 'mar', year: 2026, monthIdx: 2 },
            { key: 'abr', year: 2026, monthIdx: 3 },
            { key: 'may', year: 2026, monthIdx: 4 }
        ];

        let totalAvailable = 0;
        for (const slot of timeline) {
            const slotStart = new Date(slot.year, slot.monthIdx, 1);
            const slotEnd = new Date(slot.year, slot.monthIdx + 1, 0); // last day of month
            if (slotEnd < start) continue; // student not enrolled yet
            const hours = monthlyHours[slot.key] || 0;
            if (slotStart >= start) {
                totalAvailable += hours;
            } else {
                // Partial start month — prorate by days remaining
                const daysInMonth = slotEnd.getDate();
                const daysAvailable = daysInMonth - start.getDate() + 1;
                totalAvailable += Math.round((hours * daysAvailable) / daysInMonth);
            }
        }
        return totalAvailable;
    }

    async init() {
        if (this.initialized) return;
        console.log('📊 Initializing COATS Reports Manager...');

        // Load Chart.js if not loaded
        if (!window.Chart) {
            await this.loadChartJS();
        }

        this.initialized = true;
        console.log('✅ COATS Reports Manager initialized');
    }

    async loadChartJS() {
        return new Promise((resolve, reject) => {
            if (window.Chart) { resolve(); return; }
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // ===== ANALYTICS CALCULATIONS =====

    calculateProgramStats() {
        const groups = this.programData.groups;
        let totalStudents = 0;
        let activeStudents = 0;
        let transferredStudents = 0;
        let inactiveStudents = 0;
        let totalHours = 0;
        let totalAttendanceSum = 0;
        const allStudents = [];
        const allStudentsIncludingInactive = [];

        groups.forEach(group => {
            // Sum hours from active students only (matching individual progress table)
            const activeStudentHours = group.students
                .filter(s => s.status === 'active')
                .reduce((sum, s) => sum + s.total, 0);
            totalHours += activeStudentHours;

            group.students.forEach(student => {
                // Don't count transferred students as they are duplicates
                // (they appear in both their old and new group)
                if (student.status !== 'transferred') {
                    totalStudents++;
                }

                // Max possible hours: prefer explicit per-student override, then late-start
                // calc, then per-group max, then global default.
                let maxPossibleHours = student.maxPossibleHoursOverride
                    || (student.lateStart ? this.calculateAvailableHoursSince(student.lateStart) : null)
                    || group.maxPossibleHours
                    || this.programData.maxPossibleHours;
                const attendancePct = (student.total / maxPossibleHours) * 100;

                const studentData = {
                    ...student,
                    group: group.name,
                    groupId: group.id,
                    attendancePct,
                    maxPossibleHours,
                    booksStart: group.startBook,
                    booksCurrent: group.currentBook,
                    booksAdvanced: group.currentBook - group.startBook
                };

                allStudentsIncludingInactive.push(studentData);

                if (student.status === 'active') {
                    activeStudents++;
                    totalAttendanceSum += attendancePct;
                    allStudents.push(studentData);
                } else if (student.status === 'transferred') {
                    transferredStudents++;
                } else if (student.status === 'inactive') {
                    inactiveStudents++;
                }
            });
        });

        // Sort by attendance
        allStudents.sort((a, b) => b.attendancePct - a.attendancePct);
        allStudentsIncludingInactive.sort((a, b) => b.attendancePct - a.attendancePct);

        // Calculate completion stats - count total books completed across all groups
        const totalBooksCompleted = groups.reduce((sum, g) => sum + (g.currentBook - g.startBook), 0);
        const avgBookCompletion = groups.reduce((sum, g) => {
            return sum + (g.currentUnit / g.totalUnits) * 100;
        }, 0) / groups.length;

        // Calculate class hours delivered (hours per group, not student-hours)
        // 4 groups × hours per month = total class hours delivered
        const monthlyHours = this.programData.monthlyMaxHours;
        const totalClassHoursPerGroup = Object.values(monthlyHours).reduce((a, b) => a + b, 0); // 110 hours per group
        const totalClassHoursDelivered = totalClassHoursPerGroup * groups.length; // 110 × 4 = 440 hours

        // Count private students who are NOT already in any group (avoid double-counting Beatriz).
        const groupStudentNames = new Set();
        groups.forEach(g => g.students.forEach(s => {
            if (s.status !== 'transferred') groupStudentNames.add(s.name.trim().toUpperCase());
        }));
        const privateStudents = (this.initializePrivateStudents && this.initializePrivateStudents()) || [];
        const privateOnlyCount = privateStudents.filter(
            p => !groupStudentNames.has(p.name.trim().toUpperCase())
        ).length;
        const totalPeople = totalStudents + privateOnlyCount;

        return {
            totalStudents,
            activeStudents,
            transferredStudents,
            inactiveStudents,
            privateOnlyCount,
            privateStudentsCount: privateStudents.length,
            totalPeople,
            totalHours, // Student-hours (sum of all student attendance)
            totalClassHoursDelivered, // Class hours delivered (per group basis)
            totalClassHoursPerGroup,
            avgAttendance: activeStudents > 0 ? totalAttendanceSum / activeStudents : 0,
            groups: groups.length,
            totalBooksCompleted,
            avgBookCompletion,
            allStudents,
            allStudentsIncludingInactive,
            withdrawnStudents: allStudentsIncludingInactive.filter(s => s.status === 'inactive'),
            topPerformers: allStudents.slice(0, 10),
            highAttendance: allStudents.filter(s => s.attendancePct >= 70),
            mediumAttendance: allStudents.filter(s => s.attendancePct >= 50 && s.attendancePct < 70),
            lowAttendance: allStudents.filter(s => s.attendancePct < 50)
        };
    }

    getAwardWinners() {
        const stats = this.calculateProgramStats();
        const students = stats.allStudents;

        // Gold Award - Top 6 highest attendance
        const goldAward = students.slice(0, 6);

        // Silver Award - Next 6
        const silverAward = students.slice(6, 12);

        // Bronze Award - Next 6
        const bronzeAward = students.slice(12, 18);

        // Special recognition - Consistency (least variance in monthly attendance)
        const consistencyAward = this.findMostConsistentStudents(students);

        return {
            gold: goldAward,
            silver: silverAward,
            bronze: bronzeAward,
            consistency: consistencyAward
        };
    }

    findMostConsistentStudents(students) {
        return students
            .map(s => {
                // Find the original student data to get monthly hours
                let monthlyHours = [];
                this.programData.groups.forEach(g => {
                    const found = g.students.find(st => st.name === s.name);
                    if (found && found.hours) {
                        monthlyHours = Object.values(found.hours).filter(h => h > 0);
                    }
                });

                if (monthlyHours.length < 3) return { ...s, variance: Infinity };

                const avg = monthlyHours.reduce((a, b) => a + b, 0) / monthlyHours.length;
                const variance = monthlyHours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / monthlyHours.length;

                return { ...s, variance, avgMonthly: avg };
            })
            .filter(s => s.variance !== Infinity && s.attendancePct >= 60)
            .sort((a, b) => a.variance - b.variance)
            .slice(0, 3);
    }

    // ===== RENDER MAIN REPORT =====

    async renderReport(containerId, activeTab = 'report') {
        await this.init();
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        this.currentTab = activeTab;
        const isAdmin = window.FirebaseData?.currentUser?.email === 'admin@ciudadbilingue.com';

        const stats = this.calculateProgramStats();
        const awards = this.getAwardWinners();

        // Generate tabs + content
        let html = '';

        // Only show tabs if admin
        if (isAdmin) {
            html += this.generateTabsHTML(activeTab);
        }

        if (activeTab === 'report') {
            html += this.generateReportHTML(stats, awards);
        } else if (activeTab === 'admin' && isAdmin) {
            html += this.generateAdminHTML();
        }

        container.innerHTML = html;

        // Render charts after DOM update (only for report tab)
        if (activeTab === 'report') {
            setTimeout(() => {
                this.renderCharts(stats);
            }, 100);
        }
    }

    generateTabsHTML(activeTab) {
        return `
        <div class="coats-tabs-container">
            <div class="coats-tabs">
                <button class="coats-tab ${activeTab === 'report' ? 'active' : ''}" onclick="window.CoatsReports.switchTab('report')">
                    📊 Reporte
                </button>
                <button class="coats-tab ${activeTab === 'admin' ? 'active' : ''}" onclick="window.CoatsReports.switchTab('admin')">
                    ⚙️ Admin
                </button>
            </div>
        </div>
        `;
    }

    switchTab(tab) {
        this.renderReport('coatsReportContainer', tab);
    }

    // ===== ADMIN PANEL =====

    generateAdminHTML() {
        const groups = this.programData.groups;

        // Generate weeks for the semester (Jun 11 - Dec 12, 2025)
        const weeks = this.generateWeeksForSemester();

        return `
        <div class="coats-admin-panel">
            <div class="admin-header">
                <h2>⚙️ Panel de Administración COATS</h2>
                <p>Gestión de estudiantes y asistencia - Semestre 2 2025</p>
            </div>

            <!-- Group Selector -->
            <div class="admin-section">
                <div class="admin-group-tabs">
                    ${groups.map((g, i) => `
                        <button class="admin-group-tab ${i === 0 ? 'active' : ''}" onclick="window.CoatsReports.selectAdminGroup('${g.id}')">
                            ${g.name.split(' - ')[0]}
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Group Details -->
            <div id="adminGroupContent">
                ${this.renderAdminGroupContent(groups[0], weeks)}
            </div>

            <!-- Save Button -->
            <div class="admin-actions">
                <button class="coats-btn coats-btn-primary" onclick="window.CoatsReports.saveToFirebase()">
                    💾 Guardar en Firebase (Próximo Semestre)
                </button>
                <button class="coats-btn coats-btn-secondary" onclick="window.CoatsReports.exportAdminData()">
                    📥 Exportar Datos
                </button>
            </div>
        </div>

        <style>
            ${this.getAdminStyles()}
        </style>
        `;
    }

    generateWeeksForSemester() {
        const weeks = [];
        const startDate = new Date('2025-06-11');
        const endDate = new Date('2026-05-29');

        let currentDate = new Date(startDate);
        let weekNum = 1;

        while (currentDate <= endDate) {
            const weekStart = new Date(currentDate);
            const weekEnd = new Date(currentDate);
            weekEnd.setDate(weekEnd.getDate() + 6);

            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

            weeks.push({
                num: weekNum,
                start: weekStart,
                end: weekEnd,
                label: `S${weekNum}`,
                monthLabel: monthNames[weekStart.getMonth()],
                month: weekStart.getMonth()
            });

            currentDate.setDate(currentDate.getDate() + 7);
            weekNum++;
        }

        return weeks;
    }

    renderAdminGroupContent(group, weeks) {
        // Calculate attendance per week based on total hours
        // Each week = 4 hours (2 classes of 2 hours)
        const hoursPerWeek = 4;

        return `
        <div class="admin-group-details" data-group-id="${group.id}">
            <div class="admin-group-info">
                <h3>${group.name}</h3>
                <p><strong>Horario:</strong> ${group.schedule}</p>
                <p><strong>Profesores:</strong> ${group.teachers.join(', ')}</p>
                <p><strong>Libro Actual:</strong> ${group.currentBook} (Unidad ${group.currentUnit}/${group.totalUnits})</p>
            </div>

            <!-- Attendance Grid -->
            <div class="admin-attendance-container">
                <table class="admin-attendance-table">
                    <thead>
                        <tr>
                            <th class="sticky-col">Estudiante</th>
                            <th class="sticky-col-2">Estado</th>
                            <th class="sticky-col-3">Total Hrs</th>
                            ${this.renderWeekHeaders(weeks)}
                        </tr>
                    </thead>
                    <tbody>
                        ${group.students.map(student => this.renderAdminStudentRow(student, group.id, weeks, hoursPerWeek)).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Add Student -->
            <div class="admin-add-student">
                <h4>➕ Agregar Estudiante</h4>
                <div class="add-student-form">
                    <input type="text" id="newStudentName_${group.id}" placeholder="Nombre completo" />
                    <input type="date" id="newStudentStart_${group.id}" value="2025-06-11" />
                    <button onclick="window.CoatsReports.addStudent('${group.id}')">Agregar</button>
                </div>
            </div>
        </div>
        `;
    }

    renderWeekHeaders(weeks) {
        let html = '';
        let currentMonth = -1;

        weeks.forEach(week => {
            if (week.month !== currentMonth) {
                currentMonth = week.month;
                html += `<th class="week-header month-start" title="Semana ${week.num}">${week.monthLabel}</th>`;
            } else {
                html += `<th class="week-header" title="Semana ${week.num}">${week.label}</th>`;
            }
        });

        return html;
    }

    renderAdminStudentRow(student, groupId, weeks, hoursPerWeek) {
        // Calculate which weeks the student attended based on monthly hours
        const attendedWeeks = this.calculateAttendedWeeks(student, weeks, hoursPerWeek);

        const statusClass = student.status === 'active' ? 'status-active' :
                           student.status === 'inactive' ? 'status-inactive' : 'status-transferred';

        return `
        <tr class="admin-student-row ${statusClass}" data-student-name="${student.name}">
            <td class="sticky-col student-name-cell">
                <input type="text" class="student-name-input" value="${this.formatName(student.name)}"
                       onchange="window.CoatsReports.updateStudentName('${student.name}', '${groupId}', this.value)" />
            </td>
            <td class="sticky-col-2">
                <select class="student-status-select" onchange="window.CoatsReports.updateStudentStatus('${student.name}', '${groupId}', this.value)">
                    <option value="active" ${student.status === 'active' ? 'selected' : ''}>Activo</option>
                    <option value="inactive" ${student.status === 'inactive' ? 'selected' : ''}>Inactivo</option>
                    <option value="transferred" ${student.status === 'transferred' ? 'selected' : ''}>Transferido</option>
                </select>
            </td>
            <td class="sticky-col-3 total-hours-cell">
                <strong>${student.total}</strong> hrs
            </td>
            ${weeks.map((week, i) => `
                <td class="week-cell">
                    <input type="checkbox" class="attendance-checkbox"
                           data-week="${week.num}"
                           data-student="${student.name}"
                           data-group="${groupId}"
                           ${attendedWeeks[i] ? 'checked' : ''}
                           onchange="window.CoatsReports.toggleWeekAttendance('${student.name}', '${groupId}', ${week.num}, this.checked)" />
                </td>
            `).join('')}
        </tr>
        `;
    }

    calculateAttendedWeeks(student, weeks, hoursPerWeek) {
        // Reverse engineer: based on monthly hours, determine which weeks were attended
        const monthlyHours = student.hours || {};
        const attendedWeeks = [];

        // Map month indices to keys
        const monthKeyMap = { 5: 'jun', 6: 'jul', 7: 'ago', 8: 'sep', 9: 'oct', 10: 'nov', 11: 'dic' };

        // Track remaining hours per month
        const remainingHours = { ...monthlyHours };

        weeks.forEach(week => {
            const monthKey = monthKeyMap[week.month];
            if (monthKey && remainingHours[monthKey] && remainingHours[monthKey] >= hoursPerWeek) {
                attendedWeeks.push(true);
                remainingHours[monthKey] -= hoursPerWeek;
            } else if (monthKey && remainingHours[monthKey] && remainingHours[monthKey] >= 2) {
                // Partial attendance (at least one class)
                attendedWeeks.push(true);
                remainingHours[monthKey] -= 2;
            } else {
                attendedWeeks.push(false);
            }
        });

        return attendedWeeks;
    }

    selectAdminGroup(groupId) {
        const group = this.programData.groups.find(g => g.id === groupId);
        if (!group) return;

        const weeks = this.generateWeeksForSemester();

        // Update content
        document.getElementById('adminGroupContent').innerHTML = this.renderAdminGroupContent(group, weeks);

        // Update active tab
        document.querySelectorAll('.admin-group-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.textContent.includes(group.name.split(' - ')[0].replace('Grupo ', ''))) {
                tab.classList.add('active');
            }
        });

        // Fix: Match by group id
        document.querySelectorAll('.admin-group-tab').forEach((tab, i) => {
            tab.classList.toggle('active', this.programData.groups[i].id === groupId);
        });
    }

    updateStudentName(oldName, groupId, newName) {
        const group = this.programData.groups.find(g => g.id === groupId);
        if (!group) return;

        const student = group.students.find(s => s.name === oldName);
        if (student) {
            student.name = newName.toUpperCase();
            console.log(`✏️ Student renamed: ${oldName} → ${newName}`);
        }
    }

    updateStudentStatus(studentName, groupId, newStatus) {
        const group = this.programData.groups.find(g => g.id === groupId);
        if (!group) return;

        const student = group.students.find(s => s.name === studentName);
        if (student) {
            student.status = newStatus;
            console.log(`📝 ${studentName} status changed to: ${newStatus}`);
        }
    }

    toggleWeekAttendance(studentName, groupId, weekNum, attended) {
        const group = this.programData.groups.find(g => g.id === groupId);
        if (!group) return;

        const student = group.students.find(s => s.name === studentName);
        if (!student) return;

        // Recalculate total hours based on all checkboxes
        const checkboxes = document.querySelectorAll(`input.attendance-checkbox[data-student="${studentName}"][data-group="${groupId}"]`);
        let totalHours = 0;
        checkboxes.forEach(cb => {
            if (cb.checked) totalHours += 4; // 4 hours per week
        });

        student.total = totalHours;

        // Update the display
        const row = document.querySelector(`tr[data-student-name="${studentName}"]`);
        if (row) {
            const totalCell = row.querySelector('.total-hours-cell');
            if (totalCell) {
                totalCell.innerHTML = `<strong>${totalHours}</strong> hrs`;
            }
        }

        console.log(`📅 ${studentName} week ${weekNum}: ${attended ? 'attended' : 'absent'} - Total: ${totalHours} hrs`);
    }

    addStudent(groupId) {
        const nameInput = document.getElementById(`newStudentName_${groupId}`);
        const startInput = document.getElementById(`newStudentStart_${groupId}`);

        if (!nameInput.value.trim()) {
            alert('Por favor ingrese el nombre del estudiante');
            return;
        }

        const group = this.programData.groups.find(g => g.id === groupId);
        if (!group) return;

        const newStudent = {
            name: nameInput.value.toUpperCase(),
            hours: { jun: 0, jul: 0, ago: 0, sep: 0, oct: 0, nov: 0, dic: 0, ene: 0, feb: 0, mar: 0, abr: 0, may: 0 },
            total: 0,
            status: 'active',
            lateStart: startInput.value !== '2025-06-11' ? startInput.value : null
        };

        group.students.push(newStudent);

        // Refresh the group content
        this.selectAdminGroup(groupId);

        console.log(`➕ Added student: ${newStudent.name} to ${group.name}`);
    }

    async saveToFirebase() {
        try {
            if (!window.FirebaseData?.currentUser?.email === 'admin@ciudadbilingue.com') {
                alert('Solo el administrador puede guardar datos');
                return;
            }

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'coats/semester_2025_2');

            const dataToSave = {
                groups: this.programData.groups,
                period: this.programData.period,
                savedAt: new Date().toISOString(),
                savedBy: window.FirebaseData.currentUser.email
            };

            await db.set(ref, dataToSave);

            alert('✅ Datos guardados en Firebase exitosamente');
            console.log('💾 COATS data saved to Firebase');

        } catch (error) {
            console.error('Error saving to Firebase:', error);
            alert('❌ Error al guardar: ' + error.message);
        }
    }

    exportAdminData() {
        const data = {
            program: this.programData,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coats_data_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('📥 Data exported');
    }

    getAdminStyles() {
        return `
        .coats-tabs-container {
            margin-bottom: 20px;
        }

        .coats-tabs {
            display: flex;
            gap: 10px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 0;
        }

        .coats-tab {
            padding: 12px 24px;
            border: none;
            background: transparent;
            font-size: 15px;
            font-weight: 600;
            color: #6b7280;
            cursor: pointer;
            border-bottom: 3px solid transparent;
            margin-bottom: -2px;
            transition: all 0.2s;
        }

        .coats-tab:hover {
            color: #1e3a5f;
        }

        .coats-tab.active {
            color: #1e3a5f;
            border-bottom-color: #1e3a5f;
        }

        .coats-admin-panel {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .admin-header {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #e5e7eb;
        }

        .admin-header h2 {
            margin: 0 0 8px 0;
            color: #1e3a5f;
        }

        .admin-header p {
            margin: 0;
            color: #6b7280;
        }

        .admin-group-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .admin-group-tab {
            padding: 10px 20px;
            border: 2px solid #e5e7eb;
            background: white;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .admin-group-tab:hover {
            border-color: #1e3a5f;
            color: #1e3a5f;
        }

        .admin-group-tab.active {
            background: #1e3a5f;
            color: white;
            border-color: #1e3a5f;
        }

        .admin-group-details {
            background: #f9fafb;
            border-radius: 10px;
            padding: 20px;
        }

        .admin-group-info {
            margin-bottom: 20px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border-left: 4px solid #1e3a5f;
        }

        .admin-group-info h3 {
            margin: 0 0 10px 0;
            color: #1e3a5f;
        }

        .admin-group-info p {
            margin: 5px 0;
            font-size: 14px;
            color: #374151;
        }

        .admin-attendance-container {
            overflow-x: auto;
            margin-bottom: 20px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }

        .admin-attendance-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            min-width: 1200px;
        }

        .admin-attendance-table th,
        .admin-attendance-table td {
            padding: 8px;
            text-align: center;
            border: 1px solid #e5e7eb;
        }

        .admin-attendance-table th {
            background: #1e3a5f;
            color: white;
            font-weight: 600;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .sticky-col {
            position: sticky;
            left: 0;
            background: white;
            z-index: 5;
            min-width: 180px;
            text-align: left !important;
        }

        .sticky-col-2 {
            position: sticky;
            left: 180px;
            background: white;
            z-index: 5;
            min-width: 100px;
        }

        .sticky-col-3 {
            position: sticky;
            left: 280px;
            background: white;
            z-index: 5;
            min-width: 80px;
        }

        thead .sticky-col,
        thead .sticky-col-2,
        thead .sticky-col-3 {
            background: #1e3a5f;
            z-index: 15;
        }

        .week-header {
            min-width: 40px;
            font-size: 11px;
        }

        .week-header.month-start {
            background: #2d5a87 !important;
        }

        .week-cell {
            padding: 4px !important;
        }

        .attendance-checkbox {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }

        .attendance-checkbox:checked {
            accent-color: #22c55e;
        }

        .student-name-input {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid transparent;
            border-radius: 4px;
            font-size: 13px;
            background: transparent;
        }

        .student-name-input:hover,
        .student-name-input:focus {
            border-color: #d1d5db;
            background: white;
            outline: none;
        }

        .student-status-select {
            padding: 4px 8px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 12px;
            background: white;
        }

        .admin-student-row.status-inactive {
            background: #fef2f2;
        }

        .admin-student-row.status-transferred {
            background: #fefce8;
        }

        .total-hours-cell {
            background: #f0fdf4 !important;
            font-size: 12px;
        }

        .admin-add-student {
            margin-top: 20px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border: 2px dashed #d1d5db;
        }

        .admin-add-student h4 {
            margin: 0 0 12px 0;
            color: #374151;
        }

        .add-student-form {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }

        .add-student-form input[type="text"] {
            flex: 1;
            min-width: 200px;
            padding: 10px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
        }

        .add-student-form input[type="date"] {
            padding: 10px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
        }

        .add-student-form button {
            padding: 10px 20px;
            background: #22c55e;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }

        .add-student-form button:hover {
            background: #16a34a;
        }

        .admin-actions {
            margin-top: 24px;
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
        }
        `;
    }

    generateReportHTML(stats, awards) {
        const now = new Date();
        const dateStr = now.toLocaleDateString(this.language === 'es' ? 'es-CO' : 'en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        return `
        <div class="coats-report" id="coats-report-content">
            <!-- Header -->
            <div class="coats-report-header">
                <div class="coats-logos">
                    <div class="coats-logo-placeholder">
                        <span style="font-size: 24px; font-weight: bold; color: #1e3a5f;">Ciudad Bilingüe</span>
                    </div>
                    <div class="coats-logo-placeholder">
                        <span style="font-size: 24px; font-weight: bold; color: #c41e3a;">COATS</span>
                    </div>
                </div>
                <h1 class="coats-report-title">${this.t('title')}</h1>
                <h2 class="coats-report-subtitle">${this.t('subtitle')}</h2>
                <p class="coats-report-period">${this.programData.period.semester}</p>

                <!-- Language Toggle -->
                <div class="coats-language-toggle">
                    <button onclick="window.CoatsReports.setLanguage('es')" class="${this.language === 'es' ? 'active' : ''}">Español</button>
                    <button onclick="window.CoatsReports.setLanguage('en')" class="${this.language === 'en' ? 'active' : ''}">English</button>
                </div>
            </div>

            <!-- Executive Summary (moved to top 2026-06-04) -->
            <div class="coats-section coats-executive-summary">
                <h3><span class="section-icon">📋</span> ${this.t('executiveSummary')}</h3>
                <div class="coats-summary-grid">
                    <div class="coats-stat-card coats-stat-highlight">
                        <div class="stat-icon">👥</div>
                        <div class="stat-value">${stats.totalPeople}</div>
                        <div class="stat-label">${this.t('totalStudents')}</div>
                        <div class="stat-sub">${this.language === 'es'
                            ? `${stats.totalStudents} en grupos + ${stats.privateOnlyCount} solo en privadas`
                            : `${stats.totalStudents} in groups + ${stats.privateOnlyCount} only in private classes`}</div>
                    </div>
                    <div class="coats-stat-card coats-stat-primary">
                        <div class="stat-icon">🎓</div>
                        <div class="stat-value">${stats.totalClassHoursDelivered}</div>
                        <div class="stat-label">${this.t('classHoursDelivered')}</div>
                        <div class="stat-sub">${stats.groups} ${this.language === 'es' ? 'grupos' : 'groups'} × ${stats.totalClassHoursPerGroup} hrs</div>
                    </div>
                    <div class="coats-stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-value">${stats.avgAttendance.toFixed(1)}%</div>
                        <div class="stat-label">${this.t('avgAttendance')}</div>
                        <div class="stat-sub stat-benchmark">${this.t('benchmarkExcellent')}</div>
                    </div>
                    <div class="coats-stat-card">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-value">${stats.totalStudents > 0 ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0}%</div>
                        <div class="stat-label">${this.language === 'es' ? 'Tasa de Retención del Programa' : 'Program Retention Rate'}</div>
                        <div class="stat-sub">${this.language === 'es' ? `solo ${stats.inactiveStudents} retiros confirmados` : `only ${stats.inactiveStudents} confirmed withdrawals`}</div>
                    </div>
                </div>
                <p class="benchmark-note">📊 ${this.t('benchmarkNote')}</p>
            </div>

            <!-- Highlights / Logros Destacados (added 2026-06-02) -->
            ${(() => {
                const retentionPct = stats.totalStudents > 0
                    ? Math.round((stats.activeStudents / stats.totalStudents) * 100)
                    : 0;
                const avgBooksAdvanced = (
                    this.programData.groups.reduce((sum, g) => sum + (g.currentBook - g.startBook), 0)
                    / this.programData.groups.length
                ).toFixed(1);
                const groupsAdvancedCount = this.programData.groups.filter(
                    g => g.currentBook > g.startBook
                ).length;
                return `
                <div class="coats-section coats-highlights-section">
                    <h3><span class="section-icon">⭐</span> ${this.t('highlights')}</h3>
                    <p class="highlights-subtitle">${this.t('highlightsSubtitle')}</p>
                    <div class="highlights-grid">
                        <div class="highlight-card highlight-card-primary">
                            <div class="highlight-icon">🎯</div>
                            <div class="highlight-value">${retentionPct}%</div>
                            <div class="highlight-label">${this.t('hl_retentionLabel')}</div>
                            <div class="highlight-sub">${stats.activeStudents}/${stats.totalStudents} ${this.t('hl_retentionSub')}</div>
                        </div>
                        <div class="highlight-card">
                            <div class="highlight-icon">🎯</div>
                            <div class="highlight-value">A2 · B1</div>
                            <div class="highlight-label">${this.t('hl_cefrReachedLabel')}</div>
                            <div class="highlight-sub">${this.t('hl_cefrReachedSub')}</div>
                        </div>
                        <div class="highlight-card highlight-card-success">
                            <div class="highlight-icon">⭐</div>
                            <div class="highlight-value">${stats.highAttendance.length}</div>
                            <div class="highlight-label">${this.t('hl_excellentLabel')}</div>
                            <div class="highlight-sub">${this.t('hl_excellentSub')}</div>
                        </div>
                    </div>

                    <!-- Intensity callout (added 2026-06-03) -->
                    <div class="intensity-callout">
                        <span class="intensity-icon">⚡</span>
                        <p class="intensity-text">${this.t('intensityNote')}</p>
                    </div>

                    <!-- Final position per group (added 2026-06-03) -->
                    <div class="final-progress-block">
                        <h4 class="final-progress-title">${this.t('finalProgressTitle')}</h4>
                        <p class="final-progress-subtitle">${this.t('finalProgressSubtitle')}</p>
                        <div class="final-progress-grid">
                            ${this.programData.groups.map(g => {
                                const name = this.language === 'es' ? g.name : g.nameEn;
                                const shortName = name.split(' - ')[0];
                                const completed = g.bookCompleted;
                                const bookPct = Math.round((g.currentUnit / g.totalUnits) * 100);
                                const booksCovered = g.currentBook - g.startBook + 1;
                                // Overall program progress (books fully completed + current book pct) / 12 books to C1
                                const programPct = Math.round(
                                    ((g.currentBook - 1 + g.currentUnit / g.totalUnits) / this.programData.totalBooks) * 100
                                );
                                return `
                                <div class="final-progress-card ${completed ? 'final-progress-card--completed' : ''}">
                                    <div class="final-progress-group">${shortName}</div>
                                    <div class="final-progress-journey">
                                        <div class="final-progress-from">
                                            <span class="final-progress-step-label">${this.t('progressStarted')}</span>
                                            <span class="final-progress-step-value">${this.t('book')} ${g.startBook}</span>
                                        </div>
                                        <span class="final-progress-arrow">→</span>
                                        <div class="final-progress-to">
                                            <span class="final-progress-step-label">${this.t('progressEnded')}</span>
                                            <span class="final-progress-step-value">${this.t('book')} ${g.currentBook} · ${this.t('unit')} ${g.currentUnit}/${g.totalUnits}</span>
                                        </div>
                                    </div>
                                    <div class="final-progress-bar-block">
                                        <div class="final-progress-bar-header">
                                            <span class="final-progress-bar-label">${this.t('bookProgressLabel')} ${this.t('book')} ${g.currentBook}</span>
                                            <span class="final-progress-bar-pct">${bookPct}%</span>
                                        </div>
                                        <div class="final-progress-bar-track">
                                            <div class="final-progress-bar-fill ${completed ? 'final-progress-bar-fill--completed' : ''}" style="width: ${bookPct}%"></div>
                                        </div>
                                    </div>
                                    <div class="final-progress-bar-block">
                                        <div class="final-progress-bar-header">
                                            <span class="final-progress-bar-label">${this.t('programProgressLabel')}</span>
                                            <span class="final-progress-bar-pct">${programPct}%</span>
                                        </div>
                                        <div class="final-progress-bar-track">
                                            <div class="final-progress-bar-fill final-progress-bar-fill--overall" style="width: ${programPct}%"></div>
                                        </div>
                                    </div>
                                    <div class="final-progress-books-covered">
                                        📘 ${this.language === 'es' ? `Libro <strong>${g.currentBook}</strong> de 12 del programa completo` : `Book <strong>${g.currentBook}</strong> of 12 in the full program`}
                                    </div>
                                    ${completed ? `<div class="final-progress-badge">🏆 ${this.t('bookCompletedLabel')}</div>` : ''}
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>

                `;
            })()}

            <!-- Program Structure (moved above Executive Summary 2026-06-03) -->
            <div class="coats-section coats-program-structure">
                <h3><span class="section-icon">🌐</span> ${this.t('programStructure')} - Ciudad Bilingüe</h3>
                <div class="program-structure-container">
                    <div class="program-structure-card">
                        <div class="program-card-header">
                            <span class="program-icon">📚</span>
                            <span class="program-title">${this.t('programBooks')}</span>
                        </div>
                        <div class="program-books-display">
                            <span class="books-number">12</span>
                            <span class="books-label">${this.language === 'es' ? 'Libros' : 'Books'}</span>
                        </div>
                        <div class="books-visual">
                            ${[1,2,3,4,5,6,7,8,9,10,11,12].map(i => `<span class="book-dot ${i <= 6 ? 'basic' : 'advanced'}" title="${this.language === 'es' ? 'Libro' : 'Book'} ${i}">${i}</span>`).join('')}
                        </div>
                        <div class="books-legend">
                            <span class="legend-item"><span class="legend-dot basic"></span> ${this.language === 'es' ? 'Básico (1-6)' : 'Basic (1-6)'}</span>
                            <span class="legend-item"><span class="legend-dot advanced"></span> ${this.language === 'es' ? 'Avanzado (7-12)' : 'Advanced (7-12)'}</span>
                        </div>
                    </div>
                    <div class="program-structure-card cefr-card">
                        <div class="program-card-header">
                            <span class="program-icon">🎯</span>
                            <span class="program-title">${this.t('cefrLevel')}</span>
                        </div>
                        <div class="cefr-display">
                            <div class="cefr-journey">
                                <span class="cefr-start">PreA1</span>
                                <span class="cefr-arrow">→</span>
                                <span class="cefr-end">C1</span>
                            </div>
                        </div>
                        <div class="cefr-framework-label">${this.t('cefrFramework')}</div>
                        <div class="cefr-levels-grid">
                            <div class="cefr-level-item prea1">
                                <div class="cefr-level-name">PreA1</div>
                                <div class="cefr-level-books">${this.language === 'es' ? 'Libros' : 'Books'} 1-3</div>
                            </div>
                            <div class="cefr-level-item a1">
                                <div class="cefr-level-name">A1</div>
                                <div class="cefr-level-books">${this.language === 'es' ? 'Libros' : 'Books'} 4-5</div>
                            </div>
                            <div class="cefr-level-item a2">
                                <div class="cefr-level-name">A2</div>
                                <div class="cefr-level-books">${this.language === 'es' ? 'Libros' : 'Books'} 6-7</div>
                            </div>
                            <div class="cefr-level-item b1">
                                <div class="cefr-level-name">B1</div>
                                <div class="cefr-level-books">${this.language === 'es' ? 'Libro' : 'Book'} 8</div>
                            </div>
                            <div class="cefr-level-item b2">
                                <div class="cefr-level-name">B2</div>
                                <div class="cefr-level-books">${this.language === 'es' ? 'Libros' : 'Books'} 9-10</div>
                            </div>
                            <div class="cefr-level-item c1">
                                <div class="cefr-level-name">C1</div>
                                <div class="cefr-level-books">${this.language === 'es' ? 'Libros' : 'Books'} 11-12</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Group Progress (collapsible 2026-06-04) -->
            <div class="coats-section">
                <h3><span class="section-icon">📈</span> ${this.t('groupProgress')}</h3>

                <button class="individual-progress-toggle" type="button" onclick="window.CoatsReports.toggleGroupProgress()">
                    <span id="group-progress-toggle-text">${this.t('groupProgressToggleOpen')}</span>
                </button>
                <p class="individual-progress-tip">${this.t('groupProgressTip')}</p>

                <div class="group-progress-content" id="group-progress-content" style="display: none;">
                    <div class="coats-groups-container">
                        ${this.programData.groups.map(group => this.renderGroupCard(group)).join('')}
                    </div>
                </div>
            </div>

            <!-- Charts Section (collapsible 2026-06-04) -->
            <div class="coats-section coats-charts-section">
                <h3><span class="section-icon">📊</span> ${this.t('attendanceAnalysis')}</h3>

                <button class="individual-progress-toggle" type="button" onclick="window.CoatsReports.toggleAttendanceAnalysis()">
                    <span id="attendance-analysis-toggle-text">${this.t('attendanceAnalysisToggleOpen')}</span>
                </button>
                <p class="individual-progress-tip">${this.t('attendanceAnalysisTip')}</p>

                <div class="attendance-analysis-content" id="attendance-analysis-content" style="display: none;">
                    <div class="coats-charts-grid">
                        <div class="coats-chart-container">
                            <canvas id="coats-attendance-chart"></canvas>
                        </div>
                        <div class="coats-chart-container">
                            <canvas id="coats-progress-chart"></canvas>
                        </div>
                    </div>

                    <!-- Monthly Trend Chart with Description -->
                    <div class="coats-chart-full-width">
                        <h4 class="chart-title">${this.t('monthlyTrend')}</h4>
                        <div class="coats-chart-container">
                            <canvas id="coats-monthly-trend-chart"></canvas>
                        </div>
                        <div class="chart-description-box">
                            <p class="chart-description">${this.t('monthlyTrendDesc')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Books advanced during full contract per group -->
            <div class="coats-section">
                <h3><span class="section-icon">📚</span> ${this.t('booksThisYearTitle')}</h3>
                <p class="books-this-year-desc">${this.t('booksThisYearDesc')}</p>
                <div class="books-this-year-grid">
                    ${this.programData.groups.map(g => {
                        const name = this.language === 'es' ? g.name : g.nameEn;
                        const shortName = name.split(' - ')[0];
                        const booksThisYear = g.currentBook - g.startBook + 1;
                        return `
                        <div class="books-this-year-card">
                            <div class="books-this-year-group">${shortName}</div>
                            <div class="books-this-year-value">${booksThisYear}</div>
                            <div class="books-this-year-label">${this.t('booksThisYearLabel')}</div>
                            <div class="books-this-year-range">${this.t('book')} ${g.startBook} → ${this.t('book')} ${g.currentBook}</div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Recognition & Awards (collapsible 2026-06-04) -->
            <div class="coats-section coats-awards-section">
                <h3><span class="section-icon">🏆</span> ${this.t('recognitionAwards')}</h3>

                <button class="individual-progress-toggle" type="button" onclick="window.CoatsReports.toggleAwards()">
                    <span id="awards-toggle-text">${this.t('awardsToggleOpen')}</span>
                </button>
                <p class="individual-progress-tip">${this.t('awardsTip')}</p>

                <div class="awards-content" id="awards-content" style="display: none;">
                    <!-- Gold Awards -->
                    <div class="award-category award-gold">
                        <div class="award-header">
                            <span class="award-medal">🥇</span>
                            <h4>${this.t('goldAward')}</h4>
                        </div>
                        <div class="award-winners">
                            ${awards.gold.map((s, i) => this.renderAwardWinner(s, i + 1, 'gold')).join('')}
                        </div>
                    </div>

                    <!-- Silver Awards -->
                    <div class="award-category award-silver">
                        <div class="award-header">
                            <span class="award-medal">🥈</span>
                            <h4>${this.t('silverAward')}</h4>
                        </div>
                        <div class="award-winners">
                            ${awards.silver.map((s, i) => this.renderAwardWinner(s, i + 7, 'silver')).join('')}
                        </div>
                    </div>

                    <!-- Bronze Awards -->
                    ${awards.bronze.length > 0 ? `
                    <div class="award-category award-bronze">
                        <div class="award-header">
                            <span class="award-medal">🥉</span>
                            <h4>${this.t('bronzeAward')}</h4>
                        </div>
                        <div class="award-winners">
                            ${awards.bronze.map((s, i) => this.renderAwardWinner(s, i + 13, 'bronze')).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- Private Classes Section (collapsible 2026-06-04) -->
            <div class="coats-section private-classes-section">
                <h3><span class="section-icon">👩‍🏫</span> ${this.t('privateClasses')}</h3>
                <p class="section-description">${this.t('privateClassesDesc')}</p>

                <button class="individual-progress-toggle" type="button" onclick="window.CoatsReports.togglePrivateClasses()">
                    <span id="private-classes-toggle-text">${this.t('privateClassesToggleOpen')}</span>
                </button>
                <p class="individual-progress-tip">${this.t('privateClassesTip')}</p>

                <div class="private-classes-content" id="private-classes-content" style="display: none;">
                    <div class="private-students-grid">
                        ${this.renderPrivateStudents()}
                    </div>
                </div>
            </div>

            <!-- Individual Progress Table -->
            <div class="coats-section coats-individual-progress-section">
                <h3><span class="section-icon">👤</span> ${this.t('individualProgress')}</h3>
                <p class="denominator-note">${this.t('denominatorNote')}</p>

                <!-- Collapsible toggle (collapsed by default 2026-06-04) -->
                <button class="individual-progress-toggle" type="button" onclick="window.CoatsReports.toggleIndividualProgress()">
                    <span id="individual-progress-toggle-text">${this.t('individualProgressToggleOpen')}</span>
                </button>
                <p class="individual-progress-tip">${this.t('individualProgressTip')}</p>

                <div class="individual-progress-content" id="individual-progress-content" style="display: none;">
                    <div class="coats-table-container">
                        <table class="coats-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>${this.t('name')}</th>
                                    <th>${this.t('group')}</th>
                                    <th>${this.t('totalHoursAttended')}</th>
                                    <th>${this.t('attendanceRate')}</th>
                                    <th>${this.t('booksAdvanced')}</th>
                                    <th>${this.t('progress')}</th>
                                    ${window.FirebaseData?.currentUser?.email === 'admin@ciudadbilingue.com' ? `<th>${this.language === 'es' ? 'Estado' : 'Status'}</th>` : ''}
                                </tr>
                            </thead>
                            <tbody>
                                ${stats.allStudents.map((s, i) => this.renderStudentRow(s, i + 1)).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Withdrawn Students (collapsible 2026-06-04) -->
            ${stats.withdrawnStudents.length > 0 ? `
            <div class="coats-section coats-withdrawn-section">
                <h3><span class="section-icon">📋</span> ${this.t('withdrawnStudents')}</h3>
                <p class="withdrawn-note">${this.t('withdrawnNote')}</p>

                <button class="individual-progress-toggle" type="button" onclick="window.CoatsReports.toggleWithdrawn()">
                    <span id="withdrawn-toggle-text">${this.t('withdrawnToggleOpen')}</span>
                </button>
                <p class="individual-progress-tip">${this.t('withdrawnTip')}</p>

                <div class="withdrawn-content" id="withdrawn-content" style="display: none;">
                    <div class="withdrawn-list">
                        ${stats.withdrawnStudents.map(s => this.renderWithdrawnStudentRow(s)).join('')}
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Export Actions -->
            <div class="coats-section coats-actions">
                <button class="coats-btn coats-btn-primary" onclick="window.CoatsReports.exportToPDF()">
                    <span>📄</span> ${this.t('exportPDF')}
                </button>
                <button class="coats-btn coats-btn-secondary" onclick="window.CoatsReports.exportToExcel()">
                    <span>📊</span> ${this.t('exportExcel')}
                </button>
                <button class="coats-btn coats-btn-secondary" onclick="window.CoatsReports.printReport()">
                    <span>🖨️</span> ${this.t('print')}
                </button>
            </div>

            <!-- Footer -->
            <div class="coats-report-footer">
                <p>${this.t('generatedOn')}: ${dateStr}</p>
                <p class="confidential">${this.t('confidential')}</p>
            </div>
        </div>

        <style>
            ${this.getReportStyles()}
        </style>
        `;
    }

    renderGroupCard(group) {
        const activeStudentsList = group.students.filter(s => s.status === 'active');
        const activeStudents = activeStudentsList.length;

        // Average attendance — uses per-group max as denominator.
        // Priority: student override → lateStart calc → group max → global default.
        let totalAttendancePct = 0;
        activeStudentsList.forEach(student => {
            const maxHours = student.maxPossibleHoursOverride
                || (student.lateStart ? this.calculateAvailableHoursSince(student.lateStart) : null)
                || group.maxPossibleHours
                || this.programData.maxPossibleHours;
            totalAttendancePct += (student.total / maxHours) * 100;
        });
        const avgAttendance = activeStudents > 0 ? totalAttendancePct / activeStudents : 0;
        const bookProgress = (group.currentUnit / group.totalUnits) * 100;
        // Progress towards C1 (Book 12) - assumes student started from Book 1
        // Completed books + current book progress percentage
        const completedBooks = group.currentBook - 1;
        const currentBookPct = group.currentUnit / group.totalUnits;
        const overallProgressToC1 = ((completedBooks + currentBookPct) / this.programData.totalBooks) * 100;
        const booksAdvanced = group.currentBook - group.startBook;

        // Check if this is an advanced group (book 7+) to show note
        const isAdvancedLevel = group.currentBook >= 7;

        return `
        <div class="coats-group-card ${group.bookCompleted ? 'book-completed' : ''}">
            ${group.bookCompleted ? `<div class="completed-badge book-badge">${this.t('bookCompleted')}</div>` : ''}
            <div class="group-header">
                <h4>${this.language === 'es' ? group.name : group.nameEn}</h4>
                <span class="group-schedule">${this.language === 'es' ? group.schedule : group.scheduleEn}</span>
            </div>

            <div class="group-stats">
                <div class="group-stat">
                    <span class="stat-label">${this.t('students')}</span>
                    <span class="stat-value">${activeStudents}</span>
                </div>
                <div class="group-stat">
                    <span class="stat-label">${this.t('avgAttendance')}</span>
                    <span class="stat-value">${avgAttendance.toFixed(1)}%</span>
                </div>
            </div>

            <div class="group-progress-section">
                <div class="progress-item">
                    <span class="progress-label">${this.language === 'es' ? 'Progreso hacia C1' : 'Progress to C1'} (PreA1 → C1)</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar progress-bar-books" style="width: ${Math.min(overallProgressToC1, 100)}%">
                            <span class="progress-text">${overallProgressToC1.toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
                <div class="progress-item">
                    <span class="progress-label">${this.t('bookProgress')}: ${this.t('book')} ${group.currentBook} - ${this.t('unit')} ${group.currentUnit}/${group.totalUnits}</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar progress-bar-pages" style="width: ${bookProgress}%">
                            <span class="progress-text">${bookProgress.toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="group-teachers">
                <span class="teachers-label">${this.t('teachers')}:</span>
                <span class="teachers-names">${group.teachers.join(', ')}</span>
            </div>

            ${isAdvancedLevel ? `
            <div class="advanced-books-note">
                <span class="note-icon">📘</span>
                <span class="note-text">${this.t('advancedBooksNoteShort')}</span>
            </div>
            ` : ''}

            <!-- Student List Dropdown -->
            <div class="student-list-dropdown">
                <button class="dropdown-toggle" onclick="window.CoatsReports.toggleStudentList('${group.id}')">
                    <span class="dropdown-icon">👥</span>
                    <span class="dropdown-text">${this.t('viewStudentList')}</span>
                    <span class="dropdown-arrow" id="arrow-${group.id}">▼</span>
                </button>
                <div class="student-list-content" id="students-${group.id}" style="display: none;">
                    <table class="student-mini-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>${this.t('name')}</th>
                                <th>${this.t('totalHoursAttended')}</th>
                                <th>${this.t('attendanceRate')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.students
                                .filter(s => s.status === 'active')
                                .sort((a, b) => b.total - a.total)
                                .map((student, index) => {
                                    const maxHours = student.maxPossibleHoursOverride
                                        || (student.lateStart ? this.calculateAvailableHoursSince(student.lateStart) : null)
                                        || group.maxPossibleHours
                                        || this.programData.maxPossibleHours;
                                    const pct = ((student.total / maxHours) * 100).toFixed(1);
                                    const pctClass = pct >= 70 ? 'high' : pct >= 50 ? 'medium' : 'low';
                                    return `
                                        <tr>
                                            <td>${index + 1}</td>
                                            <td class="student-name-cell">
                                                ${student.name}
                                                ${student.lateStart ? '<span class="late-badge">⏰</span>' : ''}
                                            </td>
                                            <td>${student.total}h</td>
                                            <td><span class="pct-badge ${pctClass}">${pct}%</span></td>
                                        </tr>
                                    `;
                                }).join('')}
                        </tbody>
                    </table>
                    ${group.students.filter(s => s.status === 'inactive').length > 0 ? `
                    <div class="inactive-students-note">
                        <strong>${this.t('withdrawnStudents')}:</strong>
                        ${group.students.filter(s => s.status === 'inactive').map(s => s.name).join(', ')}
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
        `;
    }

    renderAwardWinner(student, rank, type) {
        // Extract group number (Grupo 1, Grupo 2, etc.)
        const groupNumber = student.groupId ? student.groupId.replace('grupo-', '') : '';
        const groupLabel = this.language === 'es' ? `Grupo ${groupNumber}` : `Group ${groupNumber}`;

        return `
        <div class="award-winner award-${type}">
            <span class="winner-rank">#${rank}</span>
            <span class="winner-name">${this.formatName(student.name)}</span>
            <span class="winner-stats">${student.attendancePct.toFixed(1)}%</span>
            <span class="winner-group">${groupLabel}</span>
        </div>
        `;
    }

    renderPrivateStudents() {
        const privateStudents = this.initializePrivateStudents();
        return privateStudents.map(student => this.renderPrivateStudentCard(student)).join('');
    }

    renderPrivateStudentCard(student) {
        const lang = this.language;

        // Skills table for Beatriz (has exam results)
        let skillsHTML = '';
        if (student.skills) {
            const skillOrder = ['grammar', 'reading', 'writing', 'speaking', 'listening'];
            skillsHTML = `
                <div class="private-skills">
                    <h5>${this.t('skillLevel')}</h5>
                    <div class="skills-grid">
                        ${skillOrder.map(skill => {
                            const skillData = student.skills[skill];
                            const statusClass = skillData.status === 'improving' ? 'improving' :
                                               skillData.status === 'on-track' ? 'on-track' : 'needs-work';
                            return `
                                <div class="skill-item ${statusClass}">
                                    <span class="skill-name">${this.t(skill)}</span>
                                    <span class="skill-level">${skillData.level}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // Exam info
        let examHTML = '';
        if (student.examDate) {
            const examDate = new Date(student.examDate);
            const dateStr = examDate.toLocaleDateString(lang === 'es' ? 'es-CO' : 'en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            const evalLabel = lang === 'es' ? 'Evaluación y resumen de progreso' : 'Evaluation and progress summary';
            examHTML = `
                <div class="private-exam-info">
                    <span class="exam-badge">📝 ${evalLabel}</span>
                    <span class="exam-date">${dateStr}</span>
                    ${student.examDuration ? `<span class="exam-duration">(${student.examDuration})</span>` : ''}
                </div>
            `;
        }

        // Group reference badge
        let groupBadge = '';
        if (student.groupRef) {
            groupBadge = `<span class="group-ref-badge">${this.t('alsoInGroup')} ${student.groupRef}</span>`;
        }

        // Teacher badge
        let teacherBadge = '';
        if (student.teacher) {
            teacherBadge = `<span class="teacher-badge">👩‍🏫 ${student.teacher}</span>`;
        }

        // Hours breakdown (2025 vs 2026) — shown when both years have hours
        let breakdownBadge = '';
        if (student.privateHoursBreakdown) {
            const b = student.privateHoursBreakdown;
            const parts = [];
            if (b[2025]) parts.push(`2025: ${b[2025]}h`);
            if (b[2026]) parts.push(`2026: ${b[2026]}h`);
            if (parts.length > 1) {
                breakdownBadge = `<span class="hours-breakdown-badge">${parts.join(' · ')}</span>`;
            }
        }

        return `
        <div class="private-student-card">
            <div class="private-student-header">
                <h4>${student.name}</h4>
                <div class="private-badges">
                    <span class="hours-badge">${student.privateHours} ${this.t('privateHours')}</span>
                    ${breakdownBadge}
                    ${teacherBadge}
                    ${groupBadge}
                </div>
            </div>

            ${examHTML}
            ${skillsHTML}

            <div class="private-details">
                <div class="private-strengths">
                    <h5>✓ ${this.t('strengths')}</h5>
                    <ul>
                        ${student.strengths.map(s => `<li>${s[lang]}</li>`).join('')}
                    </ul>
                </div>

                <div class="private-improve">
                    <h5>↗ ${this.t('areasToImprove')}</h5>
                    <ul>
                        ${student.areasToImprove.map(a => `<li>${a[lang]}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <div class="private-teacher-notes">
                <h5>💬 ${this.t('teacherNotes')}</h5>
                <p>${student.teacherNotes[lang]}</p>
            </div>
        </div>
        `;
    }

    renderStudentRow(student, rank) {
        const attendanceClass = student.attendancePct >= 70 ? 'high' :
                               student.attendancePct >= 50 ? 'medium' : 'low';

        // Check for late start note
        let lateStartBadge = '';
        if (student.lateStart) {
            const startDate = new Date(student.lateStart);
            const monthNames = this.language === 'es'
                ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const formattedDate = `${startDate.getDate()} ${monthNames[startDate.getMonth()]}`;
            lateStartBadge = `<span class="late-start-badge" title="${this.t('lateStartNote')} ${formattedDate}">(${this.t('lateStartNote')} ${formattedDate})</span>`;
        }

        // Create safe student ID for data attribute
        const studentId = student.name.replace(/[^a-zA-Z0-9]/g, '_');

        // Check if admin is logged in (only in CRM context)
        const isAdmin = window.FirebaseData?.currentUser?.email === 'admin@ciudadbilingue.com';

        return `
        <tr class="attendance-${attendanceClass}" data-student-id="${studentId}" data-group-id="${student.groupId}">
            <td>${rank}</td>
            <td class="student-name">${this.formatName(student.name)} ${lateStartBadge}</td>
            <td>${student.group.split('(')[0].trim()}</td>
            <td><strong>${student.total}</strong> ${this.t('hours')}</td>
            <td>
                <div class="attendance-badge ${attendanceClass}">
                    ${student.attendancePct.toFixed(1)}%
                </div>
            </td>
            <td>${student.booksStart} → ${student.booksCurrent} (${student.booksCurrent - student.booksStart + 1})</td>
            <td>
                <div class="mini-progress-bar">
                    <div class="mini-progress" style="width: ${student.attendancePct}%"></div>
                </div>
            </td>
            ${isAdmin ? `
            <td class="toggle-cell">
                <button class="status-toggle-btn active" onclick="window.CoatsReports.toggleStudentStatus('${student.name}', '${student.groupId}')" title="${this.language === 'es' ? 'Click para desactivar' : 'Click to deactivate'}">
                    ✓ ${this.language === 'es' ? 'Activo' : 'Active'}
                </button>
            </td>
            ` : ''}
        </tr>
        `;
    }

    renderWithdrawnStudentRow(student) {
        const studentId = student.name.replace(/[^a-zA-Z0-9]/g, '_');

        // Check if admin is logged in (only in CRM context)
        const isAdmin = window.FirebaseData?.currentUser?.email === 'admin@ciudadbilingue.com';

        return `
        <div class="withdrawn-student" data-student-id="${studentId}" data-group-id="${student.groupId}">
            <span class="withdrawn-name">${this.formatName(student.name)}</span>
            <span class="withdrawn-group">${student.group.split(' - ')[0]}</span>
            <span class="withdrawn-hours">${student.total} ${this.t('hours')} (${student.attendancePct.toFixed(1)}%)</span>
            <span class="withdrawn-reason">${student.note || ''}</span>
            ${isAdmin ? `
            <button class="status-toggle-btn inactive" onclick="window.CoatsReports.toggleStudentStatus('${student.name}', '${student.groupId}')" title="${this.language === 'es' ? 'Click para activar' : 'Click to activate'}">
                ✗ ${this.language === 'es' ? 'Inactivo' : 'Inactive'}
            </button>
            ` : ''}
        </div>
        `;
    }

    toggleStudentStatus(studentName, groupId) {
        // Security check - only admin can toggle status
        if (window.FirebaseData?.currentUser?.email !== 'admin@ciudadbilingue.com') {
            console.error('❌ Unauthorized: Only admin can change student status');
            return;
        }

        // Find the student in the group data
        const group = this.programData.groups.find(g => g.id === groupId);
        if (!group) {
            console.error('Group not found:', groupId);
            return;
        }

        const student = group.students.find(s => s.name === studentName);
        if (!student) {
            console.error('Student not found:', studentName);
            return;
        }

        // Toggle status
        if (student.status === 'active') {
            student.status = 'inactive';
            if (!student.note) {
                student.note = this.language === 'es' ? 'Desactivado manualmente' : 'Manually deactivated';
            }
            console.log(`🔴 ${studentName} set to inactive`);
        } else if (student.status === 'inactive') {
            student.status = 'active';
            console.log(`🟢 ${studentName} set to active`);
        }

        // Re-render the report
        this.refreshReport();
    }

    refreshReport() {
        const container = document.getElementById('coatsReportContainer');
        if (container) {
            this.renderReport('coatsReportContainer');
            console.log('📊 Report refreshed');
        }
    }

    formatName(name) {
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    // ===== CHARTS =====

    renderCharts(stats) {
        this.destroyCharts();

        // Attendance Distribution Pie Chart
        const attendanceCtx = document.getElementById('coats-attendance-chart');
        if (attendanceCtx) {
            this.charts.attendance = new Chart(attendanceCtx, {
                type: 'doughnut',
                data: {
                    labels: [this.t('highAttendance'), this.t('mediumAttendance'), this.t('lowAttendance')],
                    datasets: [{
                        data: [stats.highAttendance.length, stats.mediumAttendance.length, stats.lowAttendance.length],
                        backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: this.t('attendanceAnalysis'),
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: { position: 'bottom' }
                    }
                }
            });
        }

        // Group Progress Bar Chart
        const progressCtx = document.getElementById('coats-progress-chart');
        if (progressCtx) {
            const groups = this.programData.groups;
            this.charts.progress = new Chart(progressCtx, {
                type: 'bar',
                data: {
                    labels: groups.map(g => g.name.split('(')[0].trim()),
                    datasets: [{
                        label: this.t('booksAdvanced'),
                        data: groups.map(g => g.currentBook - g.startBook),
                        backgroundColor: '#3b82f6',
                        borderRadius: 8
                    }, {
                        label: this.t('bookProgress') + ' %',
                        data: groups.map(g => (g.currentUnit / g.totalUnits) * 100),
                        backgroundColor: '#8b5cf6',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: this.t('groupProgress'),
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: { position: 'bottom' }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // Monthly Trend Line Chart
        const trendCtx = document.getElementById('coats-monthly-trend-chart');
        if (trendCtx) {
            const months = ['jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic', 'ene', 'feb', 'mar', 'abr', 'may'];
            const monthLabels = this.language === 'es'
                ? ["Jun '25", "Jul '25", "Ago '25", "Sep '25", "Oct '25", "Nov '25", "Dic '25", "Ene '26", "Feb '26", "Mar '26", "Abr '26", "May '26"]
                : ["Jun '25", "Jul '25", "Aug '25", "Sep '25", "Oct '25", "Nov '25", "Dec '25", "Jan '26", "Feb '26", "Mar '26", "Apr '26", "May '26"];

            const groupTrends = this.programData.groups.map(group => {
                const activeStudents = group.students.filter(s => s.status === 'active');
                const activeCount = activeStudents.length;

                // Calculate average hours per student per month (normalized)
                const monthlyAverages = months.map(month => {
                    const totalHours = activeStudents.reduce((sum, s) => sum + (s.hours[month] || 0), 0);
                    return activeCount > 0 ? Math.round((totalHours / activeCount) * 10) / 10 : 0;
                });
                return {
                    label: `${group.name.split('-')[0].trim()} (${activeCount} est.)`,
                    data: monthlyAverages,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false
                };
            });

            const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];
            groupTrends.forEach((trend, i) => {
                trend.borderColor = colors[i];
                trend.backgroundColor = colors[i];
            });

            this.charts.trend = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: monthLabels,
                    datasets: groupTrends
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: this.t('monthlyTrend'),
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: { position: 'bottom' }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: this.language === 'es' ? 'Promedio horas/estudiante' : 'Avg hours/student' }
                        }
                    }
                }
            });
        }
    }

    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }

    // ===== STUDENT LIST DROPDOWN =====

    toggleStudentList(groupId) {
        const content = document.getElementById(`students-${groupId}`);
        const arrow = document.getElementById(`arrow-${groupId}`);
        const button = arrow?.parentElement;
        const textSpan = button?.querySelector('.dropdown-text');

        if (content && arrow) {
            const isVisible = content.style.display !== 'none';
            content.style.display = isVisible ? 'none' : 'block';
            arrow.textContent = isVisible ? '▼' : '▲';
            arrow.classList.toggle('open', !isVisible);

            if (textSpan) {
                textSpan.textContent = isVisible ? this.t('viewStudentList') : this.t('hideStudentList');
            }
        }
    }

    toggleIndividualProgress() {
        const content = document.getElementById('individual-progress-content');
        const textSpan = document.getElementById('individual-progress-toggle-text');
        if (!content || !textSpan) return;
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        textSpan.textContent = isVisible
            ? this.t('individualProgressToggleOpen')
            : this.t('individualProgressToggleClose');
    }

    toggleAwards() {
        const content = document.getElementById('awards-content');
        const textSpan = document.getElementById('awards-toggle-text');
        if (!content || !textSpan) return;
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        textSpan.textContent = isVisible
            ? this.t('awardsToggleOpen')
            : this.t('awardsToggleClose');
    }

    togglePrivateClasses() {
        const content = document.getElementById('private-classes-content');
        const textSpan = document.getElementById('private-classes-toggle-text');
        if (!content || !textSpan) return;
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        textSpan.textContent = isVisible
            ? this.t('privateClassesToggleOpen')
            : this.t('privateClassesToggleClose');
    }

    toggleWithdrawn() {
        const content = document.getElementById('withdrawn-content');
        const textSpan = document.getElementById('withdrawn-toggle-text');
        if (!content || !textSpan) return;
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        textSpan.textContent = isVisible
            ? this.t('withdrawnToggleOpen')
            : this.t('withdrawnToggleClose');
    }

    toggleAttendanceAnalysis() {
        const content = document.getElementById('attendance-analysis-content');
        const textSpan = document.getElementById('attendance-analysis-toggle-text');
        if (!content || !textSpan) return;
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        textSpan.textContent = isVisible
            ? this.t('attendanceAnalysisToggleOpen')
            : this.t('attendanceAnalysisToggleClose');
        // Charts rendered while the container was hidden have zero dimensions —
        // resize() recomputes them once the container becomes visible.
        if (!isVisible) {
            setTimeout(() => {
                Object.values(this.charts || {}).forEach(c => { if (c && c.resize) c.resize(); });
            }, 50);
        }
    }

    toggleGroupProgress() {
        const content = document.getElementById('group-progress-content');
        const textSpan = document.getElementById('group-progress-toggle-text');
        if (!content || !textSpan) return;
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        textSpan.textContent = isVisible
            ? this.t('groupProgressToggleOpen')
            : this.t('groupProgressToggleClose');
    }

    // ===== EXPORT FUNCTIONS =====

    async exportToPDF() {
        // Use browser print with PDF option
        const printContent = document.getElementById('coats-report-content');
        if (!printContent) return;

        const originalContent = document.body.innerHTML;
        document.body.innerHTML = printContent.outerHTML;

        // Add print styles
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                body { margin: 0; padding: 20px; }
                .coats-actions { display: none !important; }
                .coats-language-toggle { display: none !important; }
                .coats-report { box-shadow: none !important; }
                @page { margin: 1cm; size: A4 portrait; }
            }
        `;
        document.head.appendChild(style);

        window.print();

        document.body.innerHTML = originalContent;

        // Re-render the report
        setTimeout(() => {
            this.renderReport('coatsReportContainer');
        }, 100);
    }

    exportToExcel() {
        const stats = this.calculateProgramStats();
        let csvContent = '\uFEFF'; // BOM for Excel UTF-8

        // Header
        csvContent += 'COATS CADENA - ATTENDANCE REPORT / REPORTE DE ASISTENCIA\n';
        csvContent += `Generated / Generado: ${new Date().toLocaleDateString()}\n\n`;

        // Summary
        csvContent += 'EXECUTIVE SUMMARY / RESUMEN EJECUTIVO\n';
        csvContent += `Total Students / Estudiantes,${stats.activeStudents}\n`;
        csvContent += `Total Hours / Horas Totales,${stats.totalHours}\n`;
        csvContent += `Average Attendance / Asistencia Promedio,${stats.avgAttendance.toFixed(1)}%\n\n`;

        // Individual data
        csvContent += 'INDIVIDUAL PROGRESS / PROGRESO INDIVIDUAL\n';
        csvContent += 'Rank,Name/Nombre,Group/Grupo,Hours/Horas,Attendance/Asistencia,Books Start/Libro Inicio,Books Current/Libro Actual,Books Advanced/Libros Avanzados\n';

        stats.allStudents.forEach((s, i) => {
            csvContent += `${i + 1},"${s.name}","${s.group}",${s.total},${s.attendancePct.toFixed(1)}%,${s.booksStart},${s.booksCurrent},${s.booksAdvanced}\n`;
        });

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `COATS_Report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    printReport() {
        window.print();
    }

    setLanguage(lang) {
        this.language = lang;
        this.renderReport('coatsReportContainer');
    }

    // ===== STYLES =====

    getReportStyles() {
        return `
        /* ==== Highlights / Benchmark styles (added 2026-06-02) ==== */
        .coats-highlights-section {
            background: linear-gradient(135deg, #f0f9ff 0%, #ede9fe 100%);
            border: 1px solid #c7d2fe;
        }
        .highlights-subtitle {
            color: #475569;
            margin: -5px 0 20px;
            font-size: 14px;
        }
        .highlights-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 18px;
            margin-top: 8px;
        }
        .highlight-card {
            background: white;
            border-radius: 14px;
            padding: 20px 18px;
            text-align: center;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
            border: 1px solid #e2e8f0;
            transition: transform 0.15s ease;
        }
        .highlight-card:hover { transform: translateY(-2px); }
        .highlight-card-primary {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border-color: #2563eb;
        }
        .highlight-card-success {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border-color: #059669;
        }
        .highlight-card-primary .highlight-sub,
        .highlight-card-success .highlight-sub { color: rgba(255,255,255,0.85); }
        .highlight-card-primary .highlight-label,
        .highlight-card-success .highlight-label { color: white; }
        .highlight-icon {
            font-size: 28px;
            margin-bottom: 6px;
        }
        .highlight-value {
            font-size: 32px;
            font-weight: 800;
            line-height: 1.1;
            margin-bottom: 4px;
        }
        .highlight-label {
            font-size: 13px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 4px;
        }
        .highlight-sub {
            font-size: 11px;
            color: #64748b;
            line-height: 1.3;
        }

        /* Teacher quote callout */
        .teacher-quote-callout {
            display: flex;
            gap: 18px;
            align-items: flex-start;
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #f59e0b;
            padding: 20px 22px;
            border-radius: 12px;
            margin: 18px 0;
        }
        .teacher-quote-icon {
            font-size: 28px;
            flex-shrink: 0;
        }
        .teacher-quote-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #92400e;
            margin-bottom: 6px;
        }
        .teacher-quote-text {
            font-size: 15px;
            font-style: italic;
            color: #78350f;
            line-height: 1.5;
            margin: 0;
        }

        /* Benchmark note */
        .benchmark-note {
            background: #f1f5f9;
            border-left: 3px solid #64748b;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 13px;
            color: #334155;
            margin-top: 16px;
            line-height: 1.5;
        }
        .stat-benchmark {
            color: #10b981 !important;
            font-weight: 600;
        }

        /* Intensity callout (added 2026-06-03) */
        .intensity-callout {
            display: flex;
            gap: 14px;
            align-items: flex-start;
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border-left: 4px solid #10b981;
            padding: 16px 20px;
            border-radius: 10px;
            margin-top: 20px;
        }
        .intensity-icon {
            font-size: 24px;
            flex-shrink: 0;
        }
        .intensity-text {
            font-size: 14px;
            color: #065f46;
            line-height: 1.5;
            margin: 0;
            font-weight: 500;
        }

        /* Final position per group (added 2026-06-03) */
        .final-progress-block {
            margin-top: 22px;
        }
        .final-progress-title {
            font-size: 16px;
            font-weight: 700;
            color: #1e293b;
            margin: 0 0 4px;
        }
        .final-progress-subtitle {
            font-size: 13px;
            color: #64748b;
            margin: 0 0 14px;
        }
        .final-progress-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 12px;
        }
        .final-progress-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px 16px;
        }
        .final-progress-card--completed {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-color: #f59e0b;
        }
        .final-progress-group {
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 8px;
        }
        .final-progress-journey {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .final-progress-from,
        .final-progress-to {
            display: flex;
            flex-direction: column;
            flex: 1;
        }
        .final-progress-step-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #94a3b8;
        }
        .final-progress-step-value {
            font-size: 13px;
            font-weight: 600;
            color: #1e293b;
        }
        .final-progress-arrow {
            font-size: 20px;
            color: #94a3b8;
        }
        .final-progress-badge {
            margin-top: 10px;
            padding: 4px 10px;
            background: #f59e0b;
            color: white;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
            text-align: center;
            display: inline-block;
        }

        .final-progress-bar-block {
            margin-top: 12px;
        }
        .final-progress-bar-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 6px;
        }
        .final-progress-bar-label {
            font-size: 11px;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }
        .final-progress-bar-pct {
            font-size: 14px;
            font-weight: 800;
            color: #1e293b;
        }
        .final-progress-bar-track {
            height: 10px;
            background: #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
        }
        .final-progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
            border-radius: 6px;
            transition: width 0.4s ease;
        }
        .final-progress-bar-fill--completed {
            background: linear-gradient(90deg, #10b981 0%, #059669 100%);
        }
        .final-progress-bar-fill--overall {
            background: linear-gradient(90deg, #a855f7 0%, #7c3aed 100%);
        }
        .final-progress-card--completed .final-progress-bar-pct { color: #92400e; }
        .final-progress-card--completed .final-progress-bar-track { background: rgba(180, 83, 9, 0.15); }

        .final-progress-books-covered {
            margin-top: 10px;
            font-size: 13px;
            color: #1e293b;
            background: #f1f5f9;
            padding: 6px 10px;
            border-radius: 6px;
            display: inline-block;
        }
        .final-progress-card--completed .final-progress-books-covered {
            background: rgba(255, 255, 255, 0.6);
            color: #78350f;
        }

        /* Books Advanced This Year section (added 2026-06-03) */
        .books-this-year-block {
            margin-top: 22px;
            padding-top: 18px;
            border-top: 1px solid #e2e8f0;
        }
        .books-this-year-title {
            font-size: 15px;
            font-weight: 700;
            color: #1e293b;
            margin: 0 0 4px;
        }
        .books-this-year-desc {
            font-size: 13px;
            color: #64748b;
            margin: 0 0 14px;
        }
        .books-this-year-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
        }
        .books-this-year-card {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border: 1px solid #93c5fd;
            border-radius: 10px;
            padding: 14px 12px;
            text-align: center;
        }
        .books-this-year-group {
            font-size: 12px;
            font-weight: 700;
            color: #1e40af;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-bottom: 6px;
        }
        .books-this-year-value {
            font-size: 36px;
            font-weight: 800;
            color: #1e3a8a;
            line-height: 1;
        }
        .books-this-year-label {
            font-size: 12px;
            color: #475569;
            margin-top: 2px;
            margin-bottom: 8px;
        }
        .books-this-year-range {
            font-size: 11px;
            color: #475569;
            background: rgba(255, 255, 255, 0.6);
            padding: 3px 8px;
            border-radius: 6px;
            display: inline-block;
        }

        /* Denominator note */
        .denominator-note {
            background: #eff6ff;
            border-left: 3px solid #3b82f6;
            padding: 10px 14px;
            border-radius: 6px;
            font-size: 13px;
            color: #1e3a8a;
            margin-bottom: 14px;
            line-height: 1.5;
        }

        /* Collapsible toggle button (added 2026-06-04) */
        .individual-progress-toggle {
            display: block;
            width: 100%;
            text-align: center;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: 0;
            padding: 16px 22px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
            margin-top: 6px;
        }
        .individual-progress-toggle:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
        }
        .individual-progress-tip {
            font-size: 12.5px;
            color: #64748b;
            text-align: center;
            margin: 10px 0 6px;
            font-style: italic;
        }

        /* ==== End added styles ==== */

        .coats-report {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 30px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 20px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
        }

        .coats-report-header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 3px solid #1e3a5f;
        }

        .coats-logos {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding: 0 50px;
        }

        .coats-report-title {
            font-size: 32px;
            color: #1e3a5f;
            margin: 0 0 10px 0;
            font-weight: 700;
        }

        .coats-report-subtitle {
            font-size: 20px;
            color: #64748b;
            margin: 0 0 10px 0;
            font-weight: 400;
        }

        .coats-report-period {
            font-size: 16px;
            color: #94a3b8;
            margin: 0;
        }

        .coats-language-toggle {
            margin-top: 20px;
        }

        .coats-language-toggle button {
            padding: 8px 20px;
            margin: 0 5px;
            border: 2px solid #1e3a5f;
            background: white;
            color: #1e3a5f;
            border-radius: 20px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
        }

        .coats-language-toggle button.active,
        .coats-language-toggle button:hover {
            background: #1e3a5f;
            color: white;
        }

        .coats-section {
            background: white;
            border-radius: 16px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .coats-section h3 {
            color: #1e3a5f;
            font-size: 22px;
            margin: 0 0 20px 0;
            padding-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section-icon {
            font-size: 24px;
        }

        .coats-summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 20px;
        }

        .coats-stat-card {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .coats-stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
        }

        .coats-stat-highlight {
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
            color: white;
        }

        .coats-stat-highlight .stat-label {
            color: #cbd5e1;
        }

        .coats-stat-highlight .stat-sub {
            color: #94a3b8;
        }

        .coats-stat-primary {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            color: white;
        }

        .coats-stat-primary .stat-value {
            color: white;
        }

        .coats-stat-primary .stat-label {
            color: #d1fae5;
        }

        .coats-stat-primary .stat-sub {
            color: #a7f3d0;
        }

        .stat-sub {
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
        }

        .stat-icon {
            font-size: 32px;
            margin-bottom: 10px;
        }

        .stat-value {
            font-size: 36px;
            font-weight: 700;
            color: #1e3a5f;
        }

        .coats-stat-highlight .stat-value {
            color: white;
        }

        .stat-label {
            font-size: 13px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 5px;
        }

        /* Insights */
        .coats-insights-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }

        .insight-card {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px 20px;
            border-radius: 10px;
            font-weight: 500;
        }

        .insight-success {
            background: #dcfce7;
            color: #166534;
        }

        .insight-achievement {
            background: #dbeafe;
            color: #1e40af;
        }

        .insight-info {
            background: #fef3c7;
            color: #92400e;
        }

        .insight-icon {
            font-size: 24px;
        }

        /* Program Structure */
        .program-structure-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
        }

        .program-structure-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 25px;
            text-align: center;
        }

        .program-structure-card.cefr-card {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-color: #f59e0b;
        }

        .program-card-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 15px;
        }

        .program-icon {
            font-size: 28px;
        }

        .program-title {
            font-size: 16px;
            font-weight: 700;
            color: #1e3a5f;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .program-books-display {
            display: flex;
            align-items: baseline;
            justify-content: center;
            gap: 10px;
            margin-bottom: 20px;
        }

        .books-number {
            font-size: 64px;
            font-weight: 800;
            color: #1e3a5f;
            line-height: 1;
        }

        .books-label {
            font-size: 24px;
            color: #64748b;
            font-weight: 600;
        }

        .books-visual {
            display: flex;
            justify-content: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 15px;
        }

        .book-dot {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 12px;
            color: white;
            cursor: default;
        }

        .book-dot.basic {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }

        .book-dot.advanced {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        }

        .books-legend {
            display: flex;
            justify-content: center;
            gap: 20px;
            font-size: 13px;
            color: #64748b;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .legend-dot {
            width: 12px;
            height: 12px;
            border-radius: 3px;
        }

        .legend-dot.basic {
            background: #3b82f6;
        }

        .legend-dot.advanced {
            background: #8b5cf6;
        }

        .cefr-display {
            margin-bottom: 10px;
        }

        .cefr-journey {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
        }

        .cefr-start, .cefr-end {
            font-size: 32px;
            font-weight: 800;
            color: #1e3a5f;
        }

        .cefr-arrow {
            font-size: 36px;
            color: #f59e0b;
        }

        .cefr-framework-label {
            font-size: 12px;
            color: #92400e;
            margin-bottom: 20px;
            font-style: italic;
        }

        .cefr-levels-visual {
            display: flex;
            justify-content: center;
            gap: 5px;
        }

        .cefr-level-box {
            padding: 8px 12px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 11px;
            color: white;
        }

        .cefr-level-box.prea1 { background: #94a3b8; }
        .cefr-level-box.a1 { background: #22c55e; }
        .cefr-level-box.a2 { background: #3b82f6; }
        .cefr-level-box.b1 { background: #8b5cf6; }
        .cefr-level-box.b2 { background: #f59e0b; }

        /* CEFR Levels Grid with Books */
        .cefr-levels-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 8px;
            margin-top: 10px;
        }

        .cefr-level-item {
            padding: 10px 6px;
            border-radius: 8px;
            text-align: center;
            color: white;
        }

        .cefr-level-item.prea1 { background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%); }
        .cefr-level-item.a1 { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); }
        .cefr-level-item.a2 { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
        .cefr-level-item.b1 { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
        .cefr-level-item.b2 { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .cefr-level-item.c1 { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }

        .cefr-level-name {
            font-weight: 700;
            font-size: 14px;
            margin-bottom: 4px;
        }

        .cefr-level-books {
            font-size: 10px;
            opacity: 0.9;
        }

        @media (max-width: 768px) {
            .cefr-levels-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }

        /* Hours Breakdown */
        .hours-breakdown-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 25px;
        }

        .hours-breakdown-card {
            background: white;
            border-radius: 16px;
            padding: 25px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
            border: 2px solid #e2e8f0;
        }

        .hours-breakdown-card.primary {
            border-color: #10b981;
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        }

        .hours-breakdown-card.secondary {
            border-color: #3b82f6;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        }

        .hours-breakdown-container.single {
            display: flex;
            justify-content: center;
        }

        .hours-breakdown-container.single .hours-breakdown-card {
            max-width: 400px;
            width: 100%;
        }

        .hours-card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 10px;
        }

        .hours-icon {
            font-size: 28px;
        }

        .hours-title {
            font-size: 16px;
            font-weight: 700;
            color: #1e3a5f;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .hours-card-value {
            font-size: 42px;
            font-weight: 800;
            color: #1e3a5f;
            margin-bottom: 5px;
        }

        .hours-breakdown-card.primary .hours-card-value {
            color: #059669;
        }

        .hours-breakdown-card.secondary .hours-card-value {
            color: #2563eb;
        }

        .hours-card-explanation {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 20px;
            font-style: italic;
        }

        .hours-detail-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }

        .hours-detail-table th,
        .hours-detail-table td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .hours-detail-table th {
            background: rgba(0, 0, 0, 0.03);
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
        }

        .hours-detail-table .total-row {
            background: rgba(0, 0, 0, 0.05);
            font-weight: 700;
        }

        .hours-detail-table .total-row td {
            border-bottom: none;
            color: #1e3a5f;
        }

        /* Group Cards */
        .coats-groups-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }

        .coats-group-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 20px;
            position: relative;
            transition: all 0.3s ease;
        }

        .coats-group-card:hover {
            border-color: #3b82f6;
            box-shadow: 0 10px 30px -10px rgba(59, 130, 246, 0.3);
        }

        .coats-group-card.book-completed {
            border-color: #3b82f6;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        }

        .completed-badge {
            position: absolute;
            top: -10px;
            right: 20px;
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            box-shadow: 0 4px 10px rgba(34, 197, 94, 0.4);
        }

        .completed-badge.book-badge {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4);
        }

        .advanced-books-note {
            margin-top: 12px;
            padding: 8px 12px;
            background: #fef3c7;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            color: #92400e;
        }

        .advanced-books-note .note-icon {
            font-size: 14px;
        }

        .advanced-books-note .note-text {
            flex: 1;
        }

        /* Student List Dropdown */
        .student-list-dropdown {
            margin-top: 15px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
        }

        .dropdown-toggle {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 15px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            color: #475569;
            transition: all 0.2s ease;
        }

        .dropdown-toggle:hover {
            background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
            border-color: #94a3b8;
        }

        .dropdown-arrow {
            transition: transform 0.3s ease;
            font-size: 10px;
        }

        .dropdown-arrow.open {
            transform: rotate(180deg);
        }

        .student-list-content {
            margin-top: 12px;
            animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .student-mini-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }

        .student-mini-table th {
            background: #f1f5f9;
            padding: 8px 6px;
            text-align: left;
            font-weight: 600;
            color: #475569;
            border-bottom: 2px solid #e2e8f0;
        }

        .student-mini-table td {
            padding: 8px 6px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
        }

        .student-mini-table tr:hover {
            background: #f8fafc;
        }

        .student-name-cell {
            font-weight: 500;
        }

        .late-badge {
            font-size: 10px;
            margin-left: 4px;
        }

        .pct-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 11px;
        }

        .pct-badge.high {
            background: #dcfce7;
            color: #166534;
        }

        .pct-badge.medium {
            background: #fef3c7;
            color: #92400e;
        }

        .pct-badge.low {
            background: #fee2e2;
            color: #991b1b;
        }

        .inactive-students-note {
            margin-top: 10px;
            padding: 8px 10px;
            background: #fef2f2;
            border-radius: 6px;
            font-size: 11px;
            color: #991b1b;
        }

        .group-header h4 {
            margin: 0 0 5px 0;
            color: #1e3a5f;
            font-size: 16px;
        }

        .group-schedule {
            font-size: 13px;
            color: #64748b;
        }

        .group-stats {
            display: flex;
            justify-content: space-between;
            margin: 15px 0;
            padding: 15px 0;
            border-top: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
        }

        .group-stat {
            text-align: center;
        }

        .group-stat .stat-label {
            font-size: 11px;
            color: #94a3b8;
            display: block;
        }

        .group-stat .stat-value {
            font-size: 18px;
            font-weight: 700;
            color: #1e3a5f;
        }

        .group-progress-section {
            margin: 15px 0;
        }

        .progress-item {
            margin-bottom: 12px;
        }

        .progress-label {
            font-size: 12px;
            color: #64748b;
            display: block;
            margin-bottom: 5px;
        }

        .progress-bar-container {
            background: #e2e8f0;
            border-radius: 10px;
            height: 24px;
            overflow: hidden;
        }

        .progress-bar {
            height: 100%;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: width 0.5s ease;
        }

        .progress-bar-books {
            background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
        }

        .progress-bar-pages {
            background: linear-gradient(90deg, #8b5cf6 0%, #6d28d9 100%);
        }

        .progress-text {
            color: white;
            font-size: 12px;
            font-weight: 700;
        }

        .group-teachers {
            font-size: 12px;
            color: #64748b;
            margin-top: 10px;
        }

        .teachers-label {
            font-weight: 600;
        }

        /* Charts */
        .coats-charts-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }

        .coats-chart-container {
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            min-height: 300px;
        }

        .coats-chart-full-width {
            margin-top: 25px;
            background: #fff;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .chart-title {
            color: #1e3a5f;
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0 0 15px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
        }

        .chart-description-box {
            margin-top: 15px;
            padding: 15px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-radius: 10px;
            border: 1px solid #bae6fd;
        }

        .chart-type-badge {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }

        .chart-description {
            margin: 10px 0 0 0;
            padding: 0;
            background: transparent;
            font-size: 0.9rem;
            color: #334155;
            line-height: 1.6;
            border-left: none;
        }

        /* Correlation Section */
        .correlation-description {
            color: #64748b;
            margin-bottom: 20px;
            font-style: italic;
        }

        .correlation-stats {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .correlation-stat {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            border-radius: 10px;
            position: relative;
        }

        .correlation-stat.high {
            background: #dcfce7;
        }

        .correlation-stat.medium {
            background: #fef3c7;
        }

        .correlation-stat.low {
            background: #fee2e2;
        }

        .correlation-count {
            font-size: 28px;
            font-weight: 700;
            min-width: 50px;
        }

        .correlation-stat.high .correlation-count { color: #166534; }
        .correlation-stat.medium .correlation-count { color: #92400e; }
        .correlation-stat.low .correlation-count { color: #991b1b; }

        .correlation-label {
            flex: 1;
            font-weight: 500;
        }

        .correlation-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 4px;
            border-radius: 0 0 10px 10px;
        }

        .correlation-stat.high .correlation-bar { background: #22c55e; }
        .correlation-stat.medium .correlation-bar { background: #f59e0b; }
        .correlation-stat.low .correlation-bar { background: #ef4444; }

        /* Awards Section */
        .coats-awards-section {
            background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
        }

        .award-category {
            margin-bottom: 25px;
            padding: 20px;
            border-radius: 12px;
            background: white;
        }

        .award-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
        }

        .award-medal {
            font-size: 32px;
        }

        .award-header h4 {
            margin: 0;
            color: #1e3a5f;
        }

        .award-winners {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 10px;
        }

        .award-winner {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 15px;
            border-radius: 8px;
            background: #f8fafc;
        }

        .award-gold .award-winner {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid #f59e0b;
        }

        .award-silver .award-winner {
            background: linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%);
            border: 2px solid #94a3b8;
        }

        .award-bronze .award-winner {
            background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
            border: 2px solid #ea580c;
        }

        .consistency-explanation {
            font-size: 13px;
            color: #64748b;
            font-style: italic;
            margin: 0 0 15px 0;
            padding: 8px 12px;
            background: rgba(255,255,255,0.5);
            border-radius: 6px;
            border-left: 3px solid #f59e0b;
        }

        .winner-rank {
            font-weight: 700;
            color: #1e3a5f;
            min-width: 30px;
        }

        .winner-name {
            flex: 1;
            font-weight: 600;
        }

        .winner-stats {
            font-size: 12px;
            color: #64748b;
        }

        .winner-group {
            font-size: 11px;
            color: #94a3b8;
            max-width: 100px;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
        }

        /* Private Classes Section */
        .private-classes-section {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        }

        .section-description {
            color: #64748b;
            font-size: 14px;
            margin-bottom: 20px;
        }

        .private-students-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
            gap: 20px;
        }

        .private-student-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            border: 1px solid #e2e8f0;
        }

        .private-student-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
            flex-wrap: wrap;
            gap: 10px;
        }

        .private-student-header h4 {
            margin: 0;
            color: #1e3a5f;
            font-size: 18px;
        }

        .private-badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .hours-badge {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }

        .group-ref-badge {
            background: #f1f5f9;
            color: #475569;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            border: 1px solid #cbd5e1;
        }

        .teacher-badge {
            background: #fef3c7;
            color: #92400e;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            border: 1px solid #fcd34d;
        }

        .hours-breakdown-badge {
            background: #ede9fe;
            color: #5b21b6;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 500;
            border: 1px solid #c4b5fd;
        }

        .private-exam-info {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
            padding: 10px;
            background: #fffbeb;
            border-radius: 8px;
            border-left: 3px solid #f59e0b;
            flex-wrap: wrap;
        }

        .exam-badge {
            font-weight: 600;
            color: #92400e;
        }

        .exam-date {
            color: #78350f;
        }

        .exam-duration {
            color: #a16207;
            font-size: 12px;
        }

        .private-skills {
            margin-bottom: 15px;
        }

        .private-skills h5 {
            margin: 0 0 10px 0;
            color: #475569;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .skills-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 8px;
        }

        .skill-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 10px;
            border-radius: 8px;
            text-align: center;
        }

        .skill-item.improving {
            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
            border: 1px solid #22c55e;
        }

        .skill-item.on-track {
            background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
            border: 1px solid #0ea5e9;
        }

        .skill-item.needs-work {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 1px solid #f59e0b;
        }

        .skill-name {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 4px;
        }

        .skill-level {
            font-weight: 700;
            font-size: 16px;
            color: #1e3a5f;
        }

        .private-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }

        .private-strengths, .private-improve {
            padding: 12px;
            border-radius: 8px;
        }

        .private-strengths {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
        }

        .private-improve {
            background: #fffbeb;
            border: 1px solid #fde68a;
        }

        .private-strengths h5, .private-improve h5 {
            margin: 0 0 8px 0;
            font-size: 12px;
            color: #475569;
        }

        .private-strengths ul, .private-improve ul {
            margin: 0;
            padding-left: 18px;
            font-size: 13px;
            color: #334155;
        }

        .private-strengths li, .private-improve li {
            margin-bottom: 4px;
        }

        .private-teacher-notes {
            background: #f8fafc;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }

        .private-teacher-notes h5 {
            margin: 0 0 8px 0;
            font-size: 12px;
            color: #475569;
        }

        .private-teacher-notes p {
            margin: 0;
            font-size: 13px;
            color: #475569;
            line-height: 1.5;
            font-style: italic;
        }

        @media (max-width: 600px) {
            .private-students-grid {
                grid-template-columns: 1fr;
            }
            .private-details {
                grid-template-columns: 1fr;
            }
            .skills-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }

        /* General Observations Section */
        .general-observations-section {
            background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
        }

        .observations-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }

        .observation-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .observation-card.positive {
            border-left: 4px solid #22c55e;
        }

        .observation-card.recommendation {
            border-left: 4px solid #f59e0b;
        }

        .observation-icon {
            font-size: 28px;
            margin-bottom: 10px;
        }

        .observation-card h4 {
            margin: 0 0 10px 0;
            color: #1e3a5f;
            font-size: 16px;
        }

        .observation-card p {
            margin: 0;
            color: #475569;
            font-size: 14px;
            line-height: 1.6;
        }

        @media (max-width: 600px) {
            .observations-grid {
                grid-template-columns: 1fr;
            }
        }

        /* Table */
        .coats-table-container {
            overflow-x: auto;
        }

        .coats-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }

        .coats-table th {
            background: #1e3a5f;
            color: white;
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            white-space: nowrap;
        }

        .coats-table th:first-child {
            border-radius: 8px 0 0 0;
        }

        .coats-table th:last-child {
            border-radius: 0 8px 0 0;
        }

        .coats-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e2e8f0;
        }

        .coats-table tr:hover {
            background: #f8fafc;
        }

        .coats-table tr.attendance-high {
            background: linear-gradient(90deg, rgba(34, 197, 94, 0.1) 0%, transparent 50%);
        }

        .coats-table tr.attendance-low {
            background: linear-gradient(90deg, rgba(239, 68, 68, 0.1) 0%, transparent 50%);
        }

        .student-name {
            font-weight: 600;
            color: #1e3a5f;
        }

        .attendance-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 13px;
        }

        .attendance-badge.high {
            background: #dcfce7;
            color: #166534;
        }

        .attendance-badge.medium {
            background: #fef3c7;
            color: #92400e;
        }

        .attendance-badge.low {
            background: #fee2e2;
            color: #991b1b;
        }

        .late-start-badge {
            font-size: 0.75rem;
            color: #6366f1;
            font-weight: 500;
            font-style: italic;
            margin-left: 5px;
        }

        .mini-progress-bar {
            width: 100px;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
        }

        .mini-progress {
            height: 100%;
            background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
            border-radius: 4px;
            transition: width 0.5s ease;
        }

        /* Withdrawn Students */
        .coats-withdrawn-section {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 12px;
        }

        .withdrawn-note {
            font-size: 13px;
            color: #991b1b;
            font-style: italic;
            margin-bottom: 15px;
        }

        .withdrawn-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .withdrawn-student {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 12px 15px;
            background: white;
            border-radius: 8px;
            border: 1px solid #fecaca;
        }

        .withdrawn-name {
            font-weight: 600;
            color: #1e3a5f;
            min-width: 200px;
        }

        .withdrawn-group {
            font-size: 13px;
            color: #64748b;
            min-width: 80px;
        }

        .withdrawn-reason {
            font-size: 13px;
            color: #991b1b;
            font-style: italic;
            flex: 1;
        }

        .withdrawn-hours {
            font-size: 13px;
            color: #64748b;
            min-width: 120px;
        }

        /* Status Toggle Buttons */
        .toggle-cell {
            text-align: center;
        }

        .status-toggle-btn {
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: all 0.2s ease;
            white-space: nowrap;
        }

        .status-toggle-btn.active {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
        }

        .status-toggle-btn.active:hover {
            background: #fef2f2;
            color: #991b1b;
            border-color: #fecaca;
        }

        .status-toggle-btn.inactive {
            background: #fef2f2;
            color: #991b1b;
            border: 1px solid #fecaca;
        }

        .status-toggle-btn.inactive:hover {
            background: #dcfce7;
            color: #166534;
            border-color: #86efac;
        }

        /* Actions */
        .coats-actions {
            display: flex;
            justify-content: center;
            gap: 15px;
            flex-wrap: wrap;
        }

        .coats-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 25px;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
        }

        .coats-btn-primary {
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
            color: white;
        }

        .coats-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px -5px rgba(30, 58, 95, 0.4);
        }

        .coats-btn-secondary {
            background: white;
            color: #1e3a5f;
            border: 2px solid #1e3a5f;
        }

        .coats-btn-secondary:hover {
            background: #1e3a5f;
            color: white;
        }

        /* Footer */
        .coats-report-footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            color: #64748b;
            font-size: 13px;
        }

        .confidential {
            font-style: italic;
            color: #94a3b8;
            margin-top: 10px;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .coats-report {
                padding: 15px;
            }

            .coats-charts-grid {
                grid-template-columns: 1fr;
            }

            .coats-groups-container {
                grid-template-columns: 1fr;
            }

            .coats-summary-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .stat-value {
                font-size: 28px;
            }
        }

        /* Print Styles */
        @media print {
            .coats-actions,
            .coats-language-toggle {
                display: none !important;
            }

            .coats-report {
                box-shadow: none;
                background: white;
            }

            .coats-section {
                break-inside: avoid;
            }
        }
        `;
    }
}

// Initialize global instance
window.CoatsReports = new CoatsReportsManager();

// Function to open COATS reports
window.openCoatsReports = async function() {
    const container = document.getElementById('coatsReportContainer');
    if (container) {
        await window.CoatsReports.renderReport('coatsReportContainer');
    }
};

console.log('📊 COATS Reports module loaded');

