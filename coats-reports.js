// coats-reports.js - COATS Cadena Corporate English Training Reports
// ===== PROFESSIONAL BILINGUAL REPORTING SYSTEM =====

class CoatsReportsManager {
    constructor() {
        this.initialized = false;
        this.language = 'es'; // 'es' or 'en'
        this.charts = {};

        // COATS Program Data - June to December 2025
        this.programData = {
            company: 'COATS Cadena',
            programName: 'Corporate English Training Program',
            programNameEs: 'Programa de Capacitación en Inglés Corporativo',
            period: {
                start: '2025-06-11',
                end: '2025-12-31',
                semester: '2nd Semester 2025 / 2do Semestre 2025'
            },
            totalBooks: 12, // Full program has 12 books
            maxPossibleHours: 106, // Max hours June-Dec 12 (4hrs/week, partial December)
            monthlyMaxHours: {
                jun: 12, jul: 22, ago: 12, sep: 18, oct: 18, nov: 16, dic: 8 // Dec only through Dec 12
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
                monthlyTrendDesc: 'Gráfica de Líneas: Muestra el promedio de horas de asistencia por estudiante en cada grupo a lo largo del semestre (Junio-Diciembre). Al usar promedios, se normalizan los datos permitiendo comparar grupos con diferente número de estudiantes (Grupo 1: 8, Grupo 2: 8, Grupo 3: 9, Grupo 4: 6).',
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
                hideStudentList: 'Ocultar Lista'
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
                monthlyTrendDesc: 'Line Chart: Shows the average attendance hours per student in each group throughout the semester (June-December). By using averages, the data is normalized allowing comparison between groups with different numbers of students (Group 1: 8, Group 2: 8, Group 3: 9, Group 4: 6).',
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
                hideStudentList: 'Hide List'
            }
        };
    }

    initializeGroupsData() {
        return [
            {
                id: 'grupo-1',
                name: 'Grupo 1 - Libros 3-4-5-6',
                nameEn: 'Group 1 - Books 3-4-5-6',
                schedule: 'Lunes y Miércoles 7-9 AM',
                scheduleEn: 'Monday & Wednesday 7-9 AM',
                startDate: '2025-06-11',
                startBook: 3,
                currentBook: 6,
                currentPage: 126,
                totalPages: 136,
                teachers: ['David Bedoya', 'Juanita Echavarría', 'Anderson Bedoya'],
                students: [
                    { name: 'BEATRIZ VALENCIA', hours: { jun: 8, jul: 22, ago: 12, sep: 14, oct: 12, nov: 10, dic: 8 }, total: 86, status: 'active' },
                    { name: 'MARIA ALEJANDRA OCAMPO', hours: { jun: 6, jul: 22, ago: 10, sep: 16, oct: 20, nov: 4, dic: 8 }, total: 86, status: 'active', note: 'Transferred to this group' },
                    { name: 'CATALINA VALENCIA QUINTERO', hours: { jun: 8, jul: 22, ago: 10, sep: 12, oct: 14, nov: 10, dic: 8 }, total: 84, status: 'active' },
                    { name: 'FRANCINET HERRERA', hours: { jun: 4, jul: 18, ago: 10, sep: 8, oct: 18, nov: 10, dic: 8 }, total: 76, status: 'active' },
                    { name: 'VALERIA GIRALDO PULGARÍN', hours: { jun: 4, jul: 22, ago: 10, sep: 12, oct: 12, nov: 6, dic: 8 }, total: 74, status: 'active', note: 'Transferred to this group' },
                    { name: 'MARTIN VERA', hours: { jun: 0, jul: 18, ago: 8, sep: 14, oct: 12, nov: 4, dic: 8 }, total: 64, status: 'active' },
                    { name: 'MARCELA LÓPEZ', hours: { jun: 6, jul: 16, ago: 4, sep: 10, oct: 12, nov: 8, dic: 8 }, total: 64, status: 'active' },
                    { name: 'ALEXANDRA LONDOÑO', hours: { jun: 4, jul: 14, ago: 8, sep: 16, oct: 8, nov: 4, dic: 4 }, total: 58, status: 'active' },
                    { name: 'ANDREA CATALINA VALENCIA', hours: { jun: 8, jul: 6, ago: 0, sep: 0, oct: 0, nov: 0, dic: 0 }, total: 14, status: 'transferred', note: 'Transferred to Group 3' }
                ],
                totalGroupHours: 606
            },
            {
                id: 'grupo-2',
                name: 'Grupo 2 - Libros 2-3-4',
                nameEn: 'Group 2 - Books 2-3-4',
                schedule: 'Lunes y Miércoles 7-9 AM',
                scheduleEn: 'Monday & Wednesday 7-9 AM',
                startDate: '2025-06-18',
                startBook: 2,
                currentBook: 4,
                currentPage: 215,
                totalPages: 239,
                teachers: ['Juan Pablo Bedoya'],
                students: [
                    { name: 'MAURICIO SEPÚLVEDA HENAO', hours: { jun: 6, jul: 20, ago: 18, sep: 16, oct: 8, nov: 14, dic: 8 }, total: 90, status: 'active' },
                    { name: 'CARLOS EMANUEL ZAPATA', hours: { jun: 4, jul: 20, ago: 12, sep: 18, oct: 14, nov: 14, dic: 8 }, total: 90, status: 'active' },
                    { name: 'GERSAÍN BEDOYA P.', hours: { jun: 4, jul: 18, ago: 16, sep: 18, oct: 12, nov: 14, dic: 6 }, total: 88, status: 'active' },
                    { name: 'CATALINA DUQUE OSORIO', hours: { jun: 6, jul: 16, ago: 10, sep: 14, oct: 14, nov: 14, dic: 6 }, total: 80, status: 'active' },
                    { name: 'CARLOS ARTURO ORTIZ C.', hours: { jun: 4, jul: 18, ago: 18, sep: 14, oct: 9, nov: 12, dic: 2 }, total: 77, status: 'active' },
                    { name: 'LEONARDO CUERVO BUITRAGO', hours: { jun: 6, jul: 16, ago: 16, sep: 10, oct: 14, nov: 10, dic: 2 }, total: 74, status: 'active' },
                    { name: 'JOSHEPLEEN DUQUE NATAL', hours: { jun: 4, jul: 18, ago: 12, sep: 14, oct: 8, nov: 10, dic: 6 }, total: 72, status: 'active' },
                    { name: 'CARLOS ANDRES MEJÍA', hours: { jun: 2, jul: 12, ago: 12, sep: 10, oct: 8, nov: 2, dic: 0 }, total: 46, status: 'active' },
                    { name: 'ANDRES FELIPE CALVO OSPINA', hours: { jun: 4, jul: 16, ago: 10, sep: 0, oct: 0, nov: 0, dic: 0 }, total: 30, status: 'inactive', note: 'Did not return since September' },
                    { name: 'VALERIA GIRALDO PULGARÍN', hours: { jun: 0, jul: 0, ago: 0, sep: 0, oct: 0, nov: 0, dic: 0 }, total: 0, status: 'transferred', note: 'Transferred to Group 1' },
                    { name: 'MARIA ALEJANDRA OCAMPO HOLGUÍN', hours: { jun: 0, jul: 0, ago: 0, sep: 0, oct: 0, nov: 0, dic: 0 }, total: 0, status: 'transferred', note: 'Transferred to Group 1' }
                ],
                totalGroupHours: 617 // Excludes inactive student (Andres Felipe: 30 hrs)
            },
            {
                id: 'grupo-3',
                name: 'Grupo 3 - Libros 4-5-6',
                nameEn: 'Group 3 - Books 4-5-6',
                schedule: 'Martes y Miércoles 7-9 AM',
                scheduleEn: 'Tuesday & Wednesday 7-9 AM',
                startDate: '2025-06-11',
                startBook: 4,
                currentBook: 6,
                currentPage: 131,
                totalPages: 136,
                teachers: ['Anderson Bedoya', 'César Grisales', 'Alexander Osorio'],
                students: [
                    { name: 'DANIELA GARCÍA FLOREZ', hours: { jun: 10, jul: 12, ago: 14, sep: 12, oct: 14, nov: 16, dic: 8 }, total: 86, status: 'active' },
                    { name: 'JUAN PABLO BERMUDEZ', hours: { jun: 12, jul: 8, ago: 12, sep: 12, oct: 14, nov: 16, dic: 8 }, total: 82, status: 'active' },
                    { name: 'ANDREA CATALINA VALENCIA', hours: { jun: 12, jul: 14, ago: 12, sep: 12, oct: 14, nov: 10, dic: 8 }, total: 82, status: 'active', note: 'Transferred from Group 1' },
                    { name: 'LUIS MAFLA', hours: { jun: 10, jul: 14, ago: 12, sep: 10, oct: 10, nov: 12, dic: 8 }, total: 76, status: 'active' },
                    { name: 'VIVIANA URIBE', hours: { jun: 12, jul: 14, ago: 12, sep: 12, oct: 10, nov: 10, dic: 6 }, total: 76, status: 'active' },
                    { name: 'PAULA CARDONA', hours: { jun: 12, jul: 12, ago: 10, sep: 12, oct: 12, nov: 10, dic: 8 }, total: 76, status: 'active' },
                    { name: 'MARIANA OBANDO', hours: { jun: 12, jul: 12, ago: 12, sep: 12, oct: 10, nov: 10, dic: 6 }, total: 74, status: 'active' },
                    { name: 'GISELA ARCILA', hours: { jun: 12, jul: 10, ago: 10, sep: 10, oct: 6, nov: 10, dic: 8 }, total: 66, status: 'active' },
                    { name: 'EDITH ALEJANDRA GIL', hours: { jun: 12, jul: 12, ago: 10, sep: 10, oct: 8, nov: 0, dic: 0 }, total: 52, status: 'inactive', note: 'Did not return since Oct 28 - No ha confirmado si se retira' },
                    { name: 'LUZ MARÍA HURTADO', hours: { jun: 0, jul: 0, ago: 0, sep: 0, oct: 4, nov: 14, dic: 8 }, total: 26, status: 'active', note: 'Started Oct 28', lateStart: '2025-10-28' }
                ],
                totalGroupHours: 644 // Excludes inactive student (Edith: 52 hrs)
            },
            {
                id: 'grupo-4',
                name: 'Grupo 4 - Libros 6-7',
                nameEn: 'Group 4 - Books 6-7',
                schedule: 'Jueves y Viernes 7-9 AM',
                scheduleEn: 'Thursday & Friday 7-9 AM',
                startDate: '2025-06-12',
                startBook: 6,
                currentBook: 7,
                currentPage: 244,
                totalPages: 244,
                bookCompleted: true,
                teachers: ['Juan Pablo Bedoya', 'César Grisales', 'Anderson Bedoya'],
                students: [
                    { name: 'JULIANA ÁLVAREZ', hours: { jun: 12, jul: 14, ago: 10, sep: 18, oct: 12, nov: 14, dic: 8 }, total: 88, status: 'active' },
                    { name: 'JUAN CAMILO ARANGO', hours: { jun: 12, jul: 14, ago: 10, sep: 18, oct: 16, nov: 8, dic: 8 }, total: 86, status: 'active' },
                    { name: 'WILSON GONZÁLEZ', hours: { jun: 12, jul: 14, ago: 10, sep: 18, oct: 10, nov: 12, dic: 8 }, total: 84, status: 'active' },
                    { name: 'VIVIANA VARGAS', hours: { jun: 10, jul: 12, ago: 10, sep: 18, oct: 18, nov: 10, dic: 4 }, total: 82, status: 'active' },
                    { name: 'CAROLINA AGUDELO', hours: { jun: 10, jul: 12, ago: 10, sep: 18, oct: 16, nov: 4, dic: 6 }, total: 76, status: 'active' },
                    { name: 'ANGELA ARANZAZU', hours: { jun: 12, jul: 12, ago: 10, sep: 0, oct: 16, nov: 4, dic: 4 }, total: 58, status: 'active' }
                ],
                totalGroupHours: 474
            }
        ];
    }

    t(key) {
        return this.translations[this.language][key] || key;
    }

    // Calculate available hours since a specific date
    calculateAvailableHoursSince(startDate) {
        const start = new Date(startDate);
        const startMonth = start.getMonth(); // 0-indexed (0=Jan, 9=Oct, etc.)
        const startDay = start.getDate();

        const monthlyHours = this.programData.monthlyMaxHours;
        const monthKeys = ['jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const monthIndices = { jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };

        let totalAvailable = 0;

        monthKeys.forEach(month => {
            const monthIndex = monthIndices[month];
            if (monthIndex > startMonth) {
                // Full month available
                totalAvailable += monthlyHours[month];
            } else if (monthIndex === startMonth) {
                // Partial month - estimate based on day of month
                // Assume hours are spread evenly across the month
                const daysInMonth = new Date(2025, monthIndex + 1, 0).getDate();
                const daysAvailable = daysInMonth - startDay + 1;
                const partialHours = Math.round((monthlyHours[month] * daysAvailable) / daysInMonth);
                totalAvailable += partialHours;
            }
            // If monthIndex < startMonth, student wasn't enrolled yet
        });

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
            totalHours += group.totalGroupHours;
            group.students.forEach(student => {
                // Don't count transferred students as they are duplicates
                // (they appear in both their old and new group)
                if (student.status !== 'transferred') {
                    totalStudents++;
                }

                // Calculate max possible hours for this student
                // If student has lateStart, calculate based on available hours since their start date
                let maxPossibleHours = this.programData.maxPossibleHours;
                if (student.lateStart) {
                    maxPossibleHours = this.calculateAvailableHoursSince(student.lateStart);
                }
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
            return sum + (g.currentPage / g.totalPages) * 100;
        }, 0) / groups.length;

        // Calculate class hours delivered (hours per group, not student-hours)
        // 4 groups × hours per month = total class hours delivered
        const monthlyHours = this.programData.monthlyMaxHours;
        const totalClassHoursPerGroup = Object.values(monthlyHours).reduce((a, b) => a + b, 0); // 110 hours per group
        const totalClassHoursDelivered = totalClassHoursPerGroup * groups.length; // 110 × 4 = 440 hours

        return {
            totalStudents,
            activeStudents,
            transferredStudents,
            inactiveStudents,
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

    async renderReport(containerId) {
        await this.init();
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        const stats = this.calculateProgramStats();
        const awards = this.getAwardWinners();

        container.innerHTML = this.generateReportHTML(stats, awards);

        // Render charts after DOM update
        setTimeout(() => {
            this.renderCharts(stats);
        }, 100);
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

            <!-- Executive Summary -->
            <div class="coats-section coats-executive-summary">
                <h3><span class="section-icon">📋</span> ${this.t('executiveSummary')}</h3>
                <div class="coats-summary-grid">
                    <div class="coats-stat-card coats-stat-highlight">
                        <div class="stat-icon">👥</div>
                        <div class="stat-value">${stats.totalStudents}</div>
                        <div class="stat-label">${this.t('totalStudents')}</div>
                        <div class="stat-sub">${stats.activeStudents} ${this.language === 'es' ? 'activos' : 'active'}</div>
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
                    </div>
                    <div class="coats-stat-card">
                        <div class="stat-icon">📚</div>
                        <div class="stat-value">${stats.avgBookCompletion.toFixed(0)}%</div>
                        <div class="stat-label">${this.t('completionRate')}</div>
                    </div>
                    <div class="coats-stat-card">
                        <div class="stat-icon">🏆</div>
                        <div class="stat-value">${stats.totalBooksCompleted}</div>
                        <div class="stat-label">${this.t('groupCompleted')}</div>
                    </div>
                </div>
            </div>

            <!-- Program Structure -->
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

            <!-- Hours Breakdown -->
            <div class="coats-section coats-hours-breakdown">
                <h3><span class="section-icon">⏰</span> ${this.language === 'es' ? 'Horas de Clase Impartidas por Grupo' : 'Class Hours Delivered by Group'}</h3>
                <div class="hours-breakdown-container single">
                    <div class="hours-breakdown-card primary">
                        <div class="hours-card-header">
                            <span class="hours-icon">🎓</span>
                            <span class="hours-title">${this.t('classHoursDelivered')}</span>
                        </div>
                        <div class="hours-card-value">${stats.totalClassHoursDelivered} ${this.t('hours')}</div>
                        <div class="hours-card-explanation">${this.language === 'es' ? 'Junio - Diciembre 2025' : 'June - December 2025'}</div>
                        <table class="hours-detail-table">
                            <thead>
                                <tr>
                                    <th>${this.language === 'es' ? 'Grupo' : 'Group'}</th>
                                    <th>${this.language === 'es' ? 'Horas' : 'Hours'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.programData.groups.map(g => `
                                    <tr>
                                        <td>${g.name.split(' - ')[0]}</td>
                                        <td><strong>${stats.totalClassHoursPerGroup}</strong> hrs</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td><strong>TOTAL</strong></td>
                                    <td><strong>${stats.totalClassHoursDelivered}</strong> hrs</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Key Insights -->
            <div class="coats-section coats-insights">
                <h3><span class="section-icon">💡</span> ${this.t('keyInsights')}</h3>
                <div class="coats-insights-grid">
                    <div class="insight-card insight-success">
                        <span class="insight-icon">✅</span>
                        <span>${this.t('insight1')}</span>
                    </div>
                    <div class="insight-card insight-achievement">
                        <span class="insight-icon">🎓</span>
                        <span>${this.t('insight2')}</span>
                    </div>
                    <div class="insight-card insight-info">
                        <span class="insight-icon">📈</span>
                        <span>${this.t('insight3')}</span>
                    </div>
                </div>
            </div>

            <!-- Group Progress -->
            <div class="coats-section">
                <h3><span class="section-icon">📈</span> ${this.t('groupProgress')}</h3>
                <div class="coats-groups-container">
                    ${this.programData.groups.map(group => this.renderGroupCard(group)).join('')}
                </div>
            </div>

            <!-- Charts Section -->
            <div class="coats-section coats-charts-section">
                <h3><span class="section-icon">📊</span> ${this.t('attendanceAnalysis')}</h3>
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
                        <span class="chart-type-badge">${this.language === 'es' ? 'Gráfica de Líneas' : 'Line Chart'}</span>
                        <p class="chart-description">${this.t('monthlyTrendDesc')}</p>
                    </div>
                </div>

                <!-- Attendance vs Progress Scatter Chart with Description -->
                <div class="coats-chart-full-width">
                    <h4 class="chart-title">${this.t('attendanceVsProgress')}</h4>
                    <div class="coats-chart-container">
                        <canvas id="coats-correlation-chart"></canvas>
                    </div>
                    <div class="chart-description-box">
                        <span class="chart-type-badge">${this.language === 'es' ? 'Gráfica de Dispersión' : 'Scatter Plot'}</span>
                        <p class="chart-description">${this.t('attendanceVsProgressDesc')}</p>
                    </div>
                </div>
            </div>

            <!-- Attendance vs Progress Correlation -->
            <div class="coats-section coats-correlation-section">
                <h3><span class="section-icon">🔗</span> ${this.t('correlation')}</h3>
                <p class="correlation-description">${this.t('correlationText')}</p>
                <div class="correlation-stats">
                    <div class="correlation-stat high">
                        <div class="correlation-count">${stats.highAttendance.length}</div>
                        <div class="correlation-label">${this.t('highAttendance')}</div>
                        <div class="correlation-bar" style="width: ${(stats.highAttendance.length / stats.activeStudents) * 100}%"></div>
                    </div>
                    <div class="correlation-stat medium">
                        <div class="correlation-count">${stats.mediumAttendance.length}</div>
                        <div class="correlation-label">${this.t('mediumAttendance')}</div>
                        <div class="correlation-bar" style="width: ${(stats.mediumAttendance.length / stats.activeStudents) * 100}%"></div>
                    </div>
                    <div class="correlation-stat low">
                        <div class="correlation-count">${stats.lowAttendance.length}</div>
                        <div class="correlation-label">${this.t('lowAttendance')}</div>
                        <div class="correlation-bar" style="width: ${(stats.lowAttendance.length / stats.activeStudents) * 100}%"></div>
                    </div>
                </div>
            </div>

            <!-- Recognition & Awards -->
            <div class="coats-section coats-awards-section">
                <h3><span class="section-icon">🏆</span> ${this.t('recognitionAwards')}</h3>

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

                <!-- Consistency Award -->
                ${awards.consistency.length > 0 ? `
                <div class="award-category award-consistency">
                    <div class="award-header">
                        <span class="award-medal">⭐</span>
                        <h4>${this.t('consistency')}</h4>
                    </div>
                    <div class="award-winners">
                        ${awards.consistency.map((s, i) => this.renderAwardWinner(s, i + 1, 'consistency')).join('')}
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- Individual Progress Table -->
            <div class="coats-section">
                <h3><span class="section-icon">👤</span> ${this.t('individualProgress')}</h3>
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
                            </tr>
                        </thead>
                        <tbody>
                            ${stats.allStudents.map((s, i) => this.renderStudentRow(s, i + 1)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Withdrawn Students -->
            ${stats.withdrawnStudents.length > 0 ? `
            <div class="coats-section coats-withdrawn-section">
                <h3><span class="section-icon">📋</span> ${this.t('withdrawnStudents')}</h3>
                <p class="withdrawn-note">${this.t('withdrawnNote')}</p>
                <div class="withdrawn-list">
                    ${stats.withdrawnStudents.map(s => `
                        <div class="withdrawn-student">
                            <span class="withdrawn-name">${this.formatName(s.name)}</span>
                            <span class="withdrawn-group">${s.group.split(' - ')[0]}</span>
                            <span class="withdrawn-reason">${s.note || ''}</span>
                        </div>
                    `).join('')}
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

        // Calculate average attendance considering late-start students
        let totalAttendancePct = 0;
        activeStudentsList.forEach(student => {
            const maxHours = student.lateStart
                ? this.calculateAvailableHoursSince(student.lateStart)
                : this.programData.maxPossibleHours;
            totalAttendancePct += (student.total / maxHours) * 100;
        });
        const avgAttendance = activeStudents > 0 ? totalAttendancePct / activeStudents : 0;
        const bookProgress = (group.currentPage / group.totalPages) * 100;
        const overallProgress = ((group.currentBook - 1) / this.programData.totalBooks) * 100;
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
                <div class="group-stat">
                    <span class="stat-label">${this.t('totalHours')}</span>
                    <span class="stat-value">${group.totalGroupHours}</span>
                </div>
            </div>

            <div class="group-progress-section">
                <div class="progress-item">
                    <span class="progress-label">${this.t('book')} ${group.startBook} → ${group.currentBook} (+${booksAdvanced})</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar progress-bar-books" style="width: ${Math.min(overallProgress, 100)}%">
                            <span class="progress-text">${overallProgress.toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
                <div class="progress-item">
                    <span class="progress-label">${this.t('bookProgress')}: ${this.t('page')} ${group.currentPage}/${group.totalPages}</span>
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
                                    const maxHours = student.lateStart
                                        ? this.calculateAvailableHoursSince(student.lateStart)
                                        : this.programData.maxPossibleHours;
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

        return `
        <tr class="attendance-${attendanceClass}">
            <td>${rank}</td>
            <td class="student-name">${this.formatName(student.name)} ${lateStartBadge}</td>
            <td>${student.group.split('(')[0].trim()}</td>
            <td><strong>${student.total}</strong> ${this.t('hours')}</td>
            <td>
                <div class="attendance-badge ${attendanceClass}">
                    ${student.attendancePct.toFixed(1)}%
                </div>
            </td>
            <td>${student.booksStart} → ${student.booksCurrent} (+${student.booksAdvanced})</td>
            <td>
                <div class="mini-progress-bar">
                    <div class="mini-progress" style="width: ${student.attendancePct}%"></div>
                </div>
            </td>
        </tr>
        `;
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
                        data: groups.map(g => (g.currentPage / g.totalPages) * 100),
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
            const months = ['jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
            const monthLabels = this.language === 'es'
                ? ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                : ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

        // Correlation Scatter Chart
        const correlationCtx = document.getElementById('coats-correlation-chart');
        if (correlationCtx) {
            // Store student names for tooltip
            const studentNames = stats.allStudents.map(s => s.name);
            const scatterData = stats.allStudents.map(s => ({
                x: Math.round(s.attendancePct * 10) / 10,
                y: s.booksAdvanced
            }));

            const self = this;
            this.charts.correlation = new Chart(correlationCtx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: this.t('attendanceVsProgress'),
                        data: scatterData,
                        backgroundColor: scatterData.map(d =>
                            d.x >= 70 ? '#22c55e' : d.x >= 50 ? '#f59e0b' : '#ef4444'
                        ),
                        pointRadius: 8,
                        pointHoverRadius: 12
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: this.t('attendanceVsProgress'),
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const index = context.dataIndex;
                                    const name = studentNames[index] || '';
                                    const attendance = context.parsed.x.toFixed(1);
                                    const books = context.parsed.y;
                                    return [
                                        name,
                                        `${self.language === 'es' ? 'Asistencia' : 'Attendance'}: ${attendance}%`,
                                        `${self.language === 'es' ? 'Libros' : 'Books'}: +${books}`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: this.t('attendanceRate') + ' %' },
                            min: 0,
                            max: 100
                        },
                        y: {
                            title: { display: true, text: this.t('booksAdvanced') },
                            beginAtZero: true,
                            max: 5
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
