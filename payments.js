// ==================================================================================
// PAYMENTS.JS - PAYMENT TRACKING MODULE WITH COLOR STATUS AND INVOICE GENERATION
// ==================================================================================

console.log('💰 Loading payments module...');

// ==================================================================================
// DATE HELPERS - Imported from date-utils.js
// ==================================================================================
// Functions: window.getLocalDate(), window.getLocalDateTime()
// Aliases: window.getTodayInColombia(), window.window.getColombiaDateTime()

// ==================================================================================
// PAYMENT CONFIGURATION - Semester dates and payment options
// ==================================================================================

const PaymentConfig = {
    // Academic semester definitions
    semesters: {
        2025: {
            semester1: {
                name: "Semestre 1 2025",
                startDate: "2025-02-01",
                endDate: "2025-06-30",
                months: ['febrero', 'marzo', 'abril', 'mayo', 'junio']
            },
            semester2: {
                name: "Semestre 2 2025",
                startDate: "2025-07-01",
                endDate: "2025-12-07",
                months: ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre']
            }
        },
        2026: {
            semester1: {
                name: "Semestre 1 2026",
                startDate: "2026-02-01",
                endDate: "2026-06-30",
                months: ['febrero', 'marzo', 'abril', 'mayo', 'junio']
            },
            semester2: {
                name: "Semestre 2 2026",
                startDate: "2026-07-01",
                endDate: "2026-12-07",
                months: ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre']
            }
        }
    },

    // Holiday periods - no payment required during these months
    holidays: [
        { year: 2025, month: 'diciembre', label: 'Vacaciones' },
        { year: 2026, month: 'enero', label: 'Vacaciones' }
    ],

    // Helper function to check if a month is a holiday
    isHoliday: function(year, month) {
        return this.holidays.some(h => h.year === year && h.month === month.toLowerCase());
    },

    // Payment type options
    paymentTypes: {
        monthly: { name: "Mensual", months: 1 },
        trimester: { name: "Trimestre", months: 3 },
        semester: { name: "Semestre (6 meses)", months: 6 },
        academicSemester: { name: "Semestre Académico", months: 'custom' },
        annual: { name: "Anual (12 meses)", months: 12 },
        twoSemesters: { name: "2 Semestres Académicos", months: 'custom' }
    }
};

// ==================================================================================
// SECTION 1: PAYMENT MANAGER CLASS - Core payment functionality and Firebase operations
// ==================================================================================

class PaymentManager {
    constructor() {
        this.payments = new Map();
        this.initialized = false;
    }

    // Initialize
    async init() {
        if (this.initialized) return;

        // Validate Firebase dependencies
        if (!window.firebaseModules?.database) {
            console.error('❌ Firebase database module not available');
            throw new Error('Firebase database module required for PaymentManager');
        }

        if (!window.FirebaseData?.database) {
            console.error('❌ Firebase database instance not available');
            throw new Error('Firebase database instance required for PaymentManager');
        }

        console.log('🚀 Initializing payment manager');
        await this.loadPayments();
        this.initialized = true;
    }

    // Load payments from Firebase
async loadPayments() {
    try {
        // Validate dependencies before accessing
        if (!window.firebaseModules?.database) {
            console.warn('⚠️ Firebase database module not loaded - cannot load payments');
            return;
        }

        if (!window.FirebaseData?.database) {
            console.warn('⚠️ Firebase database instance not available - cannot load payments');
            return;
        }

        this.payments.clear(); // Clear existing payments first
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, 'payments');
        const snapshot = await db.get(ref);

        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.entries(data).forEach(([id, payment]) => {
                // Ensure month is lowercase for consistency
                if (payment.month) {
                    payment.month = payment.month.toLowerCase();
                }
                this.payments.set(id, payment);
            });
        }
        console.log(`✅ Loaded ${this.payments.size} payment records`);
    } catch (error) {
        console.error('❌ Error loading payments:', error);
        throw error; // Re-throw to be handled by caller
    }
}

    // Get payment status with color
// Get payment status with color
getPaymentStatus(student) {
    // Skip payment status for hourly students - they don't have regular payment dates
    if (student.tipoPago === 'POR_HORAS') {
        return { color: '#6b7280', status: 'Por horas', icon: '⏱️' };
    }

    if (!student.diaPago) return { color: '#6b7280', status: 'Sin fecha', icon: '❓' };

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    const payDay = parseInt(student.diaPago) || 1;

    // Check if payment was made this month
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const monthName = monthNames[currentMonth];
    const currentYear = today.getFullYear();

    // Check if current month is a holiday - no payment required
    if (PaymentConfig.isHoliday(currentYear, monthName)) {
        return { color: '#60a5fa', status: '🏖️ Vacaciones', icon: '🏖️' };
    }
    
    // Look for payment in the payments Map
    const payment = Array.from(this.payments.values()).find(p => 
        p.studentId === student.id && 
        p.month?.toLowerCase() === monthName.toLowerCase() && 
        p.year === currentYear
    );
    
    // If payment exists for this month, check if it's full or partial
    if (payment) {
        // Convert to numbers to ensure proper comparison
        const expectedAmount = Number(student.valor) || 0;
        const paidAmount = Number(payment.amount) || 0;

        console.log(`🔍 Checking payment for ${student.nombre}: Expected: $${expectedAmount}, Paid: $${paidAmount}`);

        // Check if payment is partial (less than expected)
        if (paidAmount < expectedAmount) {
            const remaining = expectedAmount - paidAmount;
            console.log(`⚠️ Partial payment detected! Remaining: $${remaining}`);
            return {
                color: '#f59e0b',
                status: `Pago Parcial`,
                icon: '⚠️',
                partial: true,
                paidAmount: paidAmount,
                remaining: remaining
            };
        }

        // Full payment
        return { color: '#10b981', status: 'Pagado', icon: '✅' };
    }
    
    // Calculate days until payment
    let payDate = new Date(today.getFullYear(), currentMonth, payDay);
    if (payDate < today) {
        // Payment is overdue
        const daysLate = Math.ceil((today - payDate) / (1000 * 60 * 60 * 24));
        return { color: '#ef4444', status: `Vencido ${daysLate}d`, icon: '🔴' };
    }
    
    const daysUntil = Math.ceil((payDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntil === 0) {
        return { color: '#f59e0b', status: 'Vence hoy', icon: '🟠' };
    } else if (daysUntil <= 5) {
        return { color: '#fbbf24', status: `Vence en ${daysUntil}d`, icon: '🟡' };
    } else {
        return { color: '#10b981', status: `Vence en ${daysUntil}d`, icon: '🟢' };
    }
}

// NEW: Record multi-month payment (for semesters, annual, etc)
async recordMultiMonthPayment(studentId, paymentData) {
    try {
        const payments = [];
        const masterPaymentId = `PAY-MULTI-${Date.now()}`;
        
        // Calculate amount per month
        const monthCount = paymentData.selectedMonths.length;
        const amountPerMonth = Math.round(paymentData.totalAmount / monthCount);
        
        // Create individual payment records for each selected month
        for (const monthData of paymentData.selectedMonths) {
            const payment = {
                id: `PAY-${Date.now()}-${monthData.month}`,
                masterPaymentId: masterPaymentId, // Link to the master payment
                studentId,
                amount: Number(amountPerMonth), // Ensure amount is stored as number
                method: paymentData.method,
                bank: paymentData.bank,
                month: monthData.month.toLowerCase(),
                year: monthData.year,
                date: window.getColombiaDateTime(), // Use Colombia timezone
                registeredBy: window.FirebaseData.currentUser?.uid,
                notes: paymentData.notes || '',
                paymentType: paymentData.paymentType, // 'semester', 'annual', etc
                paymentPeriod: paymentData.paymentPeriod, // 'Semestre 1 2025', etc
                installment: paymentData.installment || '1/1', // '1/3' for first of 3 payments
                totalInstallments: paymentData.totalInstallments || 1
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `payments/${payment.id}`);
            await db.set(ref, payment);
            
            this.payments.set(payment.id, payment);
            payments.push(payment);
            
            // Small delay to ensure unique timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        console.log(`✅ Multi-month payment recorded: ${payments.length} months`);

        // Audit log
        if (typeof window.logAudit === 'function') {
            const student = window.StudentManager?.students.get(studentId);
            const studentName = student?.nombre || 'Estudiante desconocido';
            const monthsList = paymentData.selectedMonths.map(m => `${m.month} ${m.year}`).join(', ');
            await window.logAudit(
                'Pago registrado',
                'payment',
                masterPaymentId,
                `${studentName} - $${paymentData.totalAmount.toLocaleString()} - ${paymentData.paymentType} (${payments.length} meses)`,
                {
                    after: {
                        estudiante: studentName,
                        montoTotal: paymentData.totalAmount,
                        tipoPago: paymentData.paymentType,
                        periodo: paymentData.paymentPeriod,
                        meses: monthsList,
                        cantidadMeses: payments.length,
                        metodo: paymentData.method,
                        banco: paymentData.bank
                    }
                }
            );
        }

        // Force UI refresh
        setTimeout(() => {
            window.loadPaymentsTab();
        }, 100);

        return {
            masterPaymentId,
            payments,
            totalAmount: paymentData.totalAmount,
            paymentType: paymentData.paymentType,
            paymentPeriod: paymentData.paymentPeriod,
            // Additional items for invoice
            lineItems: paymentData.lineItems || [],
            matriculaAmount: paymentData.matriculaAmount || 0,
            certificadoAmount: paymentData.certificadoAmount || 0,
            otroConcepto: paymentData.otroConcepto || '',
            otroAmount: paymentData.otroAmount || 0
        };
    } catch (error) {
        console.error('❌ Error recording multi-month payment:', error);
        throw error;
    }
}


    
 // Record payment
async recordPayment(studentId, paymentData) {
    try {
        const payment = {
            id: `PAY-${Date.now()}`,
            studentId,
            amount: Number(paymentData.amount), // Ensure amount is stored as number
            baseAmount: Number(paymentData.baseAmount || paymentData.amount),
            method: paymentData.method,
            bank: paymentData.bank,
            month: paymentData.month.toLowerCase(), // Ensure lowercase
            year: paymentData.year || new Date().getFullYear(),
            date: window.getColombiaDateTime(), // Use Colombia timezone
            registeredBy: window.FirebaseData.currentUser?.uid,
            notes: paymentData.notes || '',
            // Additional items
            lineItems: paymentData.lineItems || [],
            matriculaAmount: paymentData.matriculaAmount || 0,
            certificadoAmount: paymentData.certificadoAmount || 0,
            otroConcepto: paymentData.otroConcepto || '',
            otroAmount: paymentData.otroAmount || 0
        };

        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `payments/${payment.id}`);
        await db.set(ref, payment);
        
        this.payments.set(payment.id, payment);

        console.log('✅ Payment recorded:', payment.id);

        // Audit log
        if (typeof window.logAudit === 'function') {
            const student = window.StudentManager?.students.get(studentId);
            const studentName = student?.nombre || 'Estudiante desconocido';
            await window.logAudit(
                'Pago registrado',
                'payment',
                payment.id,
                `${studentName} - $${payment.amount.toLocaleString()} - ${payment.month} ${payment.year}`,
                {
                    after: {
                        estudiante: studentName,
                        monto: payment.amount,
                        mes: payment.month,
                        año: payment.year,
                        metodo: payment.method,
                        banco: payment.bank
                    }
                }
            );
        }

        // Force UI refresh after payment
        setTimeout(() => {
            window.loadPaymentsTab();
        }, 100);

        return payment;
    } catch (error) {
        console.error('❌ Error recording payment:', error);
        throw error;
    }
}

// Delete payment (admin only)
async deletePayment(paymentId) {
    try {
        // Verify admin access
        if (window.FirebaseData?.currentUser?.email !== 'admin@ciudadbilingue.com') {
            throw new Error('No autorizado - Solo el administrador puede eliminar pagos');
        }

        // Get the payment before deleting for audit log
        const payment = this.payments.get(paymentId);
        if (!payment) {
            throw new Error('Pago no encontrado');
        }

        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `payments/${paymentId}`);
        await db.remove(ref);

        this.payments.delete(paymentId);

        console.log('🗑️ Payment deleted:', paymentId);

        // Audit log
        if (typeof window.logAudit === 'function') {
            const student = window.StudentManager?.students.get(payment.studentId);
            const studentName = student?.nombre || 'Estudiante desconocido';
            await window.logAudit(
                'Pago eliminado',
                'payment',
                paymentId,
                `${studentName} - $${payment.amount?.toLocaleString()} - ${payment.month} ${payment.year}`,
                {
                    before: {
                        estudiante: studentName,
                        monto: payment.amount,
                        mes: payment.month,
                        año: payment.year,
                        metodo: payment.method,
                        banco: payment.bank
                    }
                }
            );
        }

        // Force UI refresh
        setTimeout(() => {
            window.loadPaymentsTab();
        }, 100);

        return true;
    } catch (error) {
        console.error('❌ Error deleting payment:', error);
        throw error;
    }
}

    // Update student payment status
    async updateStudentPaymentStatus(studentId, month, paid) {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `students/${studentId}/pagos/${month}`);
        await db.set(ref, {
            paid,
            date: window.getColombiaDateTime(), // Use Colombia timezone
            updatedBy: window.FirebaseData.currentUser?.uid
        });
    }

    // Get student payments
    getStudentPayments(studentId) {
        return Array.from(this.payments.values())
            .filter(p => p.studentId === studentId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Get student payment for specific month
    getStudentPayment(studentId, month) {
        const year = new Date().getFullYear();
        return Array.from(this.payments.values()).find(p => 
            p.studentId === studentId && 
            p.month === month && 
            p.year === year
        );
    }

    // NEW: Get complete payment history for a student (12 months)
    async getStudentPaymentHistory(studentId, year = null) {
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const targetYear = year || new Date().getFullYear();
        const history = {};

        // Get all payments for this student
        const payments = this.getStudentPayments(studentId);

        // Get student data for default amount
        const student = window.StudentManager.students.get(studentId);
        const defaultAmount = student?.valor || 0;

        // Build history object for each month
        for (const month of months) {
            // FIXED: Use filter() instead of find() to get ALL payments for this month
            const monthPayments = payments.filter(p =>
                p.month?.toLowerCase() === month &&
                p.year === targetYear
            );

            if (monthPayments.length > 0) {
                // Calculate total amount paid for this month
                const totalAmount = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

                history[month] = {
                    status: 'paid',
                    amount: totalAmount,
                    payments: monthPayments.map(p => ({
                        date: new Date(p.date).toLocaleDateString('es-CO'),
                        amount: p.amount,
                        method: p.method,
                        bank: p.bank,
                        invoiceNumber: p.invoiceNumber,
                        paymentId: p.id
                    })),
                    // Keep backward compatibility with single payment display
                    date: new Date(monthPayments[0].date).toLocaleDateString('es-CO'),
                    method: monthPayments[0].method,
                    bank: monthPayments[0].bank,
                    invoiceNumber: monthPayments[0].invoiceNumber,
                    paymentId: monthPayments[0].id
                };
            } else {
                // Check if this is a holiday month first
                if (PaymentConfig.isHoliday(targetYear, month)) {
                    history[month] = {
                        status: 'holiday',
                        amount: 0,
                        date: null,
                        payments: [],
                        label: 'Vacaciones'
                    };
                } else {
                    // Check if payment is due/overdue for this month
                    const monthIndex = months.indexOf(month);
                    const today = new Date();
                    const currentYear = today.getFullYear();
                    const currentMonth = today.getMonth();

                    if (targetYear < currentYear || (targetYear === currentYear && monthIndex < currentMonth)) {
                        // Past month - check if it should have been paid
                        if (student?.diaPago) {
                            history[month] = {
                                status: 'overdue',
                                amount: defaultAmount,
                                date: null,
                                payments: []
                            };
                        } else {
                            history[month] = {
                                status: 'no-payment',
                                amount: 0,
                                date: null,
                                payments: []
                            };
                        }
                    } else if (targetYear === currentYear && monthIndex === currentMonth) {
                        // Current month
                        if (student?.diaPago) {
                            const payDay = parseInt(student.diaPago);
                            const dueDate = new Date(targetYear, monthIndex, payDay);
                            const isPending = dueDate >= today;

                            history[month] = {
                                status: isPending ? 'pending' : 'overdue',
                                amount: defaultAmount,
                                date: null,
                                payments: []
                            };
                        } else {
                            history[month] = {
                                status: 'no-payment',
                                amount: 0,
                                date: null,
                                payments: []
                            };
                        }
                    } else {
                        // Future month
                        history[month] = {
                            status: 'no-payment',
                            amount: 0,
                            date: null,
                            payments: []
                        };
                    }
                }
            }
        }

        return history;
    }

    // NEW: Calculate payment statistics
    calculatePaymentStats(history) {
        let totalPaid = 0;
        let totalPending = 0;
        let monthsPaid = 0;
        let monthsPending = 0;
        let monthsOverdue = 0;
        
        Object.values(history).forEach(payment => {
            if (payment.status === 'paid') {
                totalPaid += payment.amount;
                monthsPaid++;
            } else if (payment.status === 'pending') {
                totalPending += payment.amount;
                monthsPending++;
            } else if (payment.status === 'overdue') {
                totalPending += payment.amount;
                monthsOverdue++;
            }
        });
        
        return { 
            totalPaid, 
            totalPending, 
            monthsPaid, 
            monthsPending,
            monthsOverdue,
            totalMonths: monthsPaid + monthsPending + monthsOverdue
        };
    }

    // Get payment summary with optional date range filter
    async getPaymentSummary(startDate = null, endDate = null) {
        const students = Array.from(window.StudentManager.students.values());
        const summary = {
            total: students.length,
            paid: 0,
            partial: 0,
            pending: 0,
            overdue: 0,
            upcoming: 0,
            totalAmount: 0,
            collectedAmount: 0,
            partialAmount: 0,
            dateRange: startDate && endDate ? { startDate, endDate } : null
        };

        // If date range is specified, filter by REGISTRATION DATE (payment.date)
        if (startDate && endDate) {
            console.log('📅 Filtering by date range:', {
                startDate,
                endDate,
                totalPayments: this.payments.size,
                totalStudents: students.length
            });

            // Get all payments REGISTERED in the date range
            const paymentsInRange = Array.from(this.payments.values()).filter(p => {
                if (!p.date) return false;
                const paymentDate = p.date.split('T')[0]; // Get YYYY-MM-DD
                return paymentDate >= startDate && paymentDate <= endDate;
            });

            console.log('💰 Payments registered in range:', {
                count: paymentsInRange.length,
                totalAmount: paymentsInRange.reduce((sum, p) => sum + (p.amount || 0), 0)
            });

            // Calculate total collected in this range
            summary.collectedAmount = paymentsInRange.reduce((sum, p) => sum + (p.amount || 0), 0);

            // Get unique students who made payments in this range
            const studentsWithPaymentsInRange = new Set();
            paymentsInRange.forEach(p => {
                if (p.studentId) {
                    studentsWithPaymentsInRange.add(p.studentId);
                }
            });

            // Count students by payment status (using current month status)
            students.forEach(student => {
                // Only count students who have payments in the date range
                if (!studentsWithPaymentsInRange.has(student.id)) return;

                const status = this.getPaymentStatus(student);

                if (status.partial) {
                    summary.partial++;
                } else if (status.status === 'Pagado') {
                    summary.paid++;
                } else if (status.color === '#ef4444') {
                    summary.overdue++;
                } else if (status.color === '#fbbf24' || status.color === '#f59e0b') {
                    summary.upcoming++;
                } else {
                    summary.pending++;
                }
            });

            // Update total to reflect students with payments in range
            summary.total = studentsWithPaymentsInRange.size;

            console.log('📊 Summary for date range:', {
                ...summary,
                paymentsInRange: paymentsInRange.length,
                studentsWithPayments: studentsWithPaymentsInRange.size
            });
        } else {
            // No date filter - use original logic (current month only)
            students.forEach(student => {
                const status = this.getPaymentStatus(student);

                // Skip holiday students from payment stats
                if (status.status === '🏖️ Vacaciones') {
                    return; // Don't count in any category during holidays
                }

                if (status.partial) {
                    summary.partial++;
                    summary.collectedAmount += status.paidAmount || 0;
                    summary.partialAmount += status.remaining || 0;
                } else if (status.status === 'Pagado') {
                    summary.paid++;
                    summary.collectedAmount += student.valor || 0;
                } else if (status.color === '#ef4444') {
                    summary.overdue++;
                } else if (status.color === '#fbbf24' || status.color === '#f59e0b') {
                    summary.upcoming++;
                } else {
                    summary.pending++;
                }
                summary.totalAmount += student.valor || 0;
            });
        }

        return summary;
    }

    // Send payment reminder
    async sendReminder(studentId, message) {
        const student = window.StudentManager.students.get(studentId);
        if (!student) return;

        // In production, this would integrate with WhatsApp API
        const whatsappUrl = `https://wa.me/57${student.telefono?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        console.log('📱 Reminder sent to:', student.nombre);
    }
}

// ==================================================================================
// SECTION 2: INVOICE STORAGE MANAGER - Firebase Storage integration for invoice files
// ==================================================================================

class InvoiceStorageManager {
    constructor() {
        this.storage = null;
        this.initialized = false;
    }

    // Initialize storage
    async init() {
        if (this.initialized) return;
        
        try {
            // Check if storage module is loaded
            if (!window.firebaseModules?.storage) {
                console.warn('⚠️ Firebase Storage module not loaded - invoices will be saved to database only');
                return false;
            }
            
            this.storage = window.firebaseModules.storage.storage;
            this.initialized = true;
            console.log('✅ Invoice Storage Manager initialized');
            return true;
        } catch (error) {
            console.error('❌ Error initializing storage:', error);
            return false;
        }
    }

    // Save invoice to Firebase Storage
    async saveInvoiceToStorage(invoiceData, htmlContent) {
        try {
            if (!this.initialized) await this.init();
            if (!this.storage) return null; // Storage not available
            
            const { storageRef, uploadBytes, getDownloadURL } = window.firebaseModules.storage;
            
            // Create folder structure: invoices/2025/01/CB-2025-STU123-001.html
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const fileName = `${invoiceData.number}.html`;
            const path = `invoices/${year}/${month}/${fileName}`;
            
            // Create storage reference
            const invoiceRef = storageRef(this.storage, path);
            
            // Create HTML file with full document structure
            const fullHtml = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Comprobante ${invoiceData.number}</title>
                    <style>
                        @page { size: letter; margin: 0.5in; }
                        body { margin: 0; font-family: Arial, sans-serif; }
                        * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                </body>
                </html>
            `;
            
            // Convert to blob
            const blob = new Blob([fullHtml], { type: 'text/html' });
            
            // Upload file with metadata
            const metadata = {
                contentType: 'text/html',
                customMetadata: {
                    invoiceNumber: invoiceData.number,
                    studentId: invoiceData.studentId || '',
                    studentName: invoiceData.student.name || '',
                    amount: String(invoiceData.total || 0),
                    date: invoiceData.date.toISOString(),
                    paymentId: invoiceData.paymentId || '',
                    createdBy: window.FirebaseData?.currentUser?.email || 'unknown'
                }
            };
            
            // Upload to storage
            const snapshot = await uploadBytes(invoiceRef, blob, metadata);
            console.log('✅ Invoice uploaded to storage:', path);
            
            // Get download URL
            const downloadUrl = await getDownloadURL(snapshot.ref);
            
            // Update invoice data with storage info
            const storageInfo = {
                storagePath: path,
                downloadUrl: downloadUrl,
                uploadedAt: new Date().toISOString(),
                fileSize: blob.size,
                storageRef: snapshot.ref.fullPath
            };
            
            // Save storage info to database
            await this.updateInvoiceDatabase(invoiceData.number, storageInfo);
            
            return {
                success: true,
                path: path,
                downloadUrl: downloadUrl,
                invoiceNumber: invoiceData.number
            };
            
        } catch (error) {
            console.error('⚠️ Storage save failed, invoice saved to database only:', error);
            return null;
        }
    }

    // Update invoice database with storage info
    async updateInvoiceDatabase(invoiceNumber, storageInfo) {
        try {
            const db = window.firebaseModules.database;
            const updates = {};
            
            // Update invoice record
            updates[`invoices/${invoiceNumber}/storage`] = storageInfo;
            
            // Update index for quick lookups
            updates[`invoiceIndex/${invoiceNumber}`] = {
                path: storageInfo.storagePath,
                url: storageInfo.downloadUrl,
                uploadedAt: storageInfo.uploadedAt
            };
            
            await db.update(db.ref(window.FirebaseData.database), updates);
            console.log('✅ Database updated with storage info');
            
        } catch (error) {
            console.error('❌ Error updating database:', error);
        }
    }

    // Retrieve invoice from storage
    async getInvoice(invoiceNumber) {
        try {
            if (!this.initialized) await this.init();
            
            // First check database for storage info
            const db = window.firebaseModules.database;
            const invoiceRef = db.ref(window.FirebaseData.database, `invoices/${invoiceNumber}`);
            const snapshot = await db.get(invoiceRef);
            
            if (!snapshot.exists()) {
                throw new Error('Invoice not found in database');
            }
            
            const invoiceData = snapshot.val();
            
            // If we have a storage URL, return it
            if (invoiceData.storage?.downloadUrl) {
                return {
                    data: invoiceData,
                    url: invoiceData.storage.downloadUrl,
                    path: invoiceData.storage.storagePath
                };
            }
            
            // If no storage URL, invoice might be old (pre-storage)
            return {
                data: invoiceData,
                url: null,
                path: null
            };
            
        } catch (error) {
            console.error('❌ Error retrieving invoice:', error);
            throw error;
        }
    }

    // Download invoice
    async downloadInvoice(invoiceNumber) {
        try {
            const invoice = await this.getInvoice(invoiceNumber);
            
            if (invoice.url) {
                // Open in new tab or trigger download
                const link = document.createElement('a');
                link.href = invoice.url;
                link.target = '_blank';
                link.download = `Comprobante_${invoiceNumber}.html`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                console.log('✅ Invoice download initiated');
                return true;
            } else {
                console.warn('⚠️ No storage URL for invoice');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error downloading invoice:', error);
            throw error;
        }
    }
}

// ==================================================================================
// SECTION 3: PRINT FUNCTIONS - Fixed invoice printing without navigation issues
// ==================================================================================

// Single Invoice Print Handler - Standard size
window.printStandardInvoice = function(event) {
    // Prevent any default action
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const invoiceContent = document.getElementById('invoiceContent');
    if (!invoiceContent) return;
    
    // Store current hash to restore if needed
    const currentHash = window.location.hash;
    
    // Create print window with specific features to prevent focus issues
    const printWindow = window.open('', 'PrintWindow' + Date.now(), 'width=800,height=600,toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes');
    
    if (!printWindow) {
        alert('Por favor permite las ventanas emergentes para imprimir');
        return;
    }
    
    // Standard full-page invoice styles
    const styles = `
        <style>
            @media print {
                @page {
                    size: letter;
                    margin: 0.5in;
                }
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                }
                .invoice-print {
                    width: 100%;
                    max-width: 7.5in;
                }
            }
            @media screen {
                body {
                    padding: 20px;
                    font-family: Arial, sans-serif;
                }
            }
        </style>
    `;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Comprobante - ${new Date().toISOString()}</title>
            ${styles}
        </head>
        <body>
            ${invoiceContent.innerHTML}
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        window.onafterprint = () => window.close();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
    
    // Ensure we stay on the same page
    setTimeout(() => {
        if (window.location.hash !== currentHash) {
            window.location.hash = currentHash;
        }
        // Keep focus on the main window
        window.focus();
    }, 100);
    
    return false; // Prevent any navigation
};

// Half-Page Invoice Print - TWO COPIES on same page
window.printHalfPageInvoice = function(event) {
    // Prevent any default action
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const invoiceContent = document.getElementById('invoiceContent');
    if (!invoiceContent) return;
    
    // Store current hash to restore if needed
    const currentHash = window.location.hash;
    
    // Create print window with specific features
    const printWindow = window.open('', 'PrintWindowHalf' + Date.now(), 'width=800,height=600,toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes');
    
    if (!printWindow) {
        alert('Por favor permite las ventanas emergentes para imprimir');
        return;
    }
    
    // Half-page specific styles for TWO copies
    const styles = `
        <style>
            @media print {
                @page {
                    size: letter;
                    margin: 0.25in;
                }
                body {
                    margin: 0;
                    padding: 0;
                }
                .page-container {
                    width: 8in;
                    height: 10.5in;
                    display: flex;
                    flex-direction: column;
                }
                .invoice-wrapper {
                    width: 100%;
                    height: 5.25in;
                    padding: 0.2in;
                    font-size: 10px;
                    page-break-inside: avoid;
                    border-bottom: 1px dashed #999;
                }
                .invoice-wrapper:last-child {
                    border-bottom: none;
                }
                .invoice-wrapper h1 {
                    font-size: 18px !important;
                }
                .invoice-wrapper p {
                    font-size: 10px !important;
                    margin: 2px 0 !important;
                }
                .invoice-wrapper table {
                    font-size: 10px !important;
                    table-layout: fixed !important;
                }
                /* FIXED: Column widths for half-page printing */
                .invoice-wrapper table th:nth-child(1),
                .invoice-wrapper table td:nth-child(1) {
                    width: 8% !important;
                    min-width: 0.6in !important;
                    max-width: 0.6in !important;
                }
                .invoice-wrapper table th:nth-child(2),
                .invoice-wrapper table td:nth-child(2) {
                    width: 50% !important;
                }
                .invoice-wrapper table th:nth-child(3),
                .invoice-wrapper table td:nth-child(3) {
                    width: 21% !important;
                    min-width: 1.2in !important;
                    max-width: 1.2in !important;
                }
                .invoice-wrapper table th:nth-child(4),
                .invoice-wrapper table td:nth-child(4) {
                    width: 21% !important;
                    min-width: 1.2in !important;
                    max-width: 1.2in !important;
                }
            }
            @media screen {
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 10px;
                }
                .page-container {
                    max-width: 800px;
                    margin: 0 auto;
                }
                .invoice-wrapper {
                    border: 1px solid #ccc;
                    padding: 15px;
                    margin-bottom: 10px;
                }
            }
        </style>
    `;
    
    // Modify invoice content for half-page size with fixed table structure
    const modifiedContent = invoiceContent.innerHTML
        .replace(/font-size:\s*\d+px/g, 'font-size: 10px')
        .replace(/width:\s*500px/g, 'width: 100%')
        .replace(/max-width:\s*\d+px/g, 'max-width: 100%')
        .replace(/padding:\s*20px/g, 'padding: 12px')
        .replace(/padding:\s*15px/g, 'padding: 8px')
        // Fix specific table column widths for half-page
        .replace(/width:\s*50px;/g, 'width: 8% !important; min-width: 0.6in !important; max-width: 0.6in !important;')
        .replace(/width:\s*80px;/g, 'width: 21% !important; min-width: 1.2in !important; max-width: 1.2in !important;');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Comprobante Media Carta - 2 Copias</title>
            ${styles}
        </head>
        <body>
            <div class="page-container">
                <div class="invoice-wrapper invoice-copy-1">
                    <div style="text-align: center; margin-bottom: 5px; font-size: 9px;">
                        <strong>ORIGINAL - CLIENTE</strong>
                    </div>
                    ${modifiedContent}
                </div>
                <div class="invoice-wrapper invoice-copy-2">
                    <div style="text-align: center; margin-bottom: 5px; font-size: 9px;">
                        <strong>COPIA - ARCHIVO</strong>
                    </div>
                    ${modifiedContent}
                </div>
            </div>
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        window.onafterprint = () => window.close();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
    
    // Ensure we stay on the same page
    setTimeout(() => {
        if (window.location.hash !== currentHash) {
            window.location.hash = currentHash;
        }
        // Keep focus on the main window
        window.focus();
    }, 100);
    
    return false; // Prevent any navigation
};

// ==================================================================================
// SECTION 4: INVOICE GENERATOR - Professional receipt generation with storage integration
// ==================================================================================

const InvoiceGenerator = {
    config: {
        businessName: 'CIUDAD BILINGÜE',
        nit: '9.764.924-1',
        address: 'Cra 8. #22-52',
        phones: '324 297 3737 - 315 640 6911',
        email: 'contacto@ciudadbilingue.com',
        whatsapp: '324 297 37 37'
    },

    // Generate invoice number: CB-YYYYMMDD-StudentRow#-Receipt#
    async generateInvoiceNumber(studentId) {
        const now = new Date();
        const dateStr = now.getFullYear().toString() + 
                       String(now.getMonth() + 1).padStart(2, '0') + 
                       String(now.getDate()).padStart(2, '0');
        
        try {
            // Get student row number from students list
            const studentRowNumber = await this.getStudentRowNumber(studentId);
            
            // Use atomic counter increment
            const db = window.firebaseModules.database;
            const counterRef = db.ref(window.FirebaseData.database, `invoiceCounters/global`);
            
            // Get current counter value and increment atomically
            let counter = 1;
            const snapshot = await db.get(counterRef);
            if (snapshot.exists()) {
                counter = snapshot.val() + 1;
            }
            
            // Save new counter value
            await db.set(counterRef, counter);
            return `CB-${dateStr}-${String(studentRowNumber).padStart(3, '0')}-${String(counter).padStart(3, '0')}`;
        } catch (error) {
            console.warn('Failed to generate sequential invoice number, using timestamp fallback:', error);
            return `CB-${dateStr}-000-${Date.now().toString().slice(-4)}`;
        }
    },

    // Helper function to get student row number from the students list
    async getStudentRowNumber(studentId) {
        try {
            const db = window.firebaseModules.database;
            const studentsRef = db.ref(window.FirebaseData.database, 'students');
            const snapshot = await db.get(studentsRef);
            
            if (snapshot.exists()) {
                const studentsData = snapshot.val();
                const studentsList = Object.keys(studentsData)
                    .map(key => ({ id: key, ...studentsData[key] }))
                    .filter(s => s.status === 'active')
                    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
                
                const studentIndex = studentsList.findIndex(s => s.id === studentId);
                return studentIndex >= 0 ? studentIndex + 1 : 999;
            }
            return 999;
        } catch (error) {
            console.warn('Error getting student row number:', error);
            return 999;
        }
    },

    // Generate invoice from payment - ENHANCED WITH STORAGE
    async generateInvoice(payment, student) {
        const invoiceNumber = await this.generateInvoiceNumber(student.id);

        // Ensure date is ISO string
        const invoiceDate = payment.date instanceof Date ? payment.date.toISOString() : payment.date;
        console.log('📄 Generating invoice with date:', invoiceDate, 'from payment.date:', payment.date);

        // Build invoice items from lineItems if available, otherwise use single item
        let invoiceItems = [];

        if (payment.lineItems && payment.lineItems.length > 0) {
            // Use detailed line items - FILTER OUT items with amount <= 0
            invoiceItems = payment.lineItems
                .filter(item => item.amount > 0) // Only include items with positive amounts
                .map(item => ({
                    quantity: 1,
                    description: item.concept === 'Mensualidad/Semestre'
                        ? `${payment.month.charAt(0).toUpperCase() + payment.month.slice(1)} ${payment.year} - ${student.grupo || 'Curso de Inglés'}`
                        : item.concept,
                    unitPrice: item.amount,
                    total: item.amount
                }));
        }

        // If no items after filtering (or no lineItems), use legacy single item
        if (invoiceItems.length === 0) {
            // Fallback to single item (legacy)
            invoiceItems = [{
                quantity: 1,
                description: `${payment.month.charAt(0).toUpperCase() + payment.month.slice(1)} ${payment.year} - ${student.grupo || 'Curso de Inglés'}`,
                unitPrice: payment.amount,
                total: payment.amount
            }];
        }

        const invoiceData = {
            number: invoiceNumber,
            paymentId: payment.id,
            date: invoiceDate,
            student: {
                name: student.nombre || '',
                nit: student.numDoc || '',
                tipoDoc: student.tipoDoc || 'C.C',
                address: student.direccion || '',
                phone: student.telefono || ''
            },
            items: invoiceItems,
            subtotal: payment.amount,
            total: payment.amount,
            paymentMethod: payment.method,
            bank: payment.bank,
            observations: payment.notes || '',
            printedAt: new Date().toISOString(),
            studentId: student.id // Add studentId for storage
        };

        // Save invoice to Firebase Database (existing functionality)
        await this.saveInvoice(invoiceData, student.id);
        
        // Update payment with invoice number
        const db = window.firebaseModules.database;
        const paymentRef = db.ref(window.FirebaseData.database, `payments/${payment.id}/invoiceNumber`);
        await db.set(paymentRef, invoiceNumber);
        
        // NEW: Try to save to Firebase Storage
        try {
            const htmlContent = this.getInvoiceHTML(invoiceData);
            const storageResult = await window.InvoiceStorage.saveInvoiceToStorage(invoiceData, htmlContent);
            
            if (storageResult) {
                console.log('✅ Invoice saved to cloud storage:', storageResult);
                invoiceData.storageUrl = storageResult.downloadUrl;
                invoiceData.storagePath = storageResult.path;
            }
        } catch (error) {
            console.error('⚠️ Storage save failed, invoice saved to database only:', error);
        }

        // Audit log
        if (typeof window.logAudit === 'function') {
            await window.logAudit(
                'Factura generada',
                'invoice',
                invoiceNumber,
                `${student.nombre} - Factura ${invoiceNumber} - $${invoiceData.total.toLocaleString()}`,
                {
                    after: {
                        numeroFactura: invoiceNumber,
                        estudiante: student.nombre,
                        monto: invoiceData.total,
                        mes: payment.month,
                        año: payment.year,
                        metodoPago: payment.method
                    }
                }
            );
        }

        return invoiceData;
    },

    // NEW: Generate multi-month invoice for semester/annual payments
    async generateMultiMonthInvoice(paymentResult, student) {
        const invoiceNumber = await this.generateInvoiceNumber(student.id);

        // Build description based on payment type
        let description = '';
        if (paymentResult.paymentPeriod.includes('Semestre')) {
            description = paymentResult.paymentPeriod;
        } else {
            const monthCount = paymentResult.payments.length;
            description = `Pago ${monthCount} meses - ${paymentResult.paymentPeriod}`;
        }

        // Ensure date is ISO string
        const invoiceDate = paymentResult.payments[0].date instanceof Date ?
            paymentResult.payments[0].date.toISOString() :
            paymentResult.payments[0].date;
        console.log('📄 Generating multi-month invoice with date:', invoiceDate);

        // Build invoice items from lineItems if available
        let invoiceItems = [];

        if (paymentResult.lineItems && paymentResult.lineItems.length > 0) {
            // Use detailed line items - FILTER OUT items with amount <= 0
            invoiceItems = paymentResult.lineItems
                .filter(item => item.amount > 0) // Only include items with positive amounts
                .map(item => ({
                    quantity: 1,
                    description: item.concept === 'Mensualidad/Semestre'
                        ? `${description} - ${student.grupo || 'Curso de Inglés'}`
                        : item.concept,
                    unitPrice: item.amount,
                    total: item.amount
                }));
        }

        // If no items after filtering (or no lineItems), use legacy single item
        if (invoiceItems.length === 0) {
            invoiceItems = [{
                quantity: 1,
                description: `${description} - ${student.grupo || 'Curso de Inglés'}`,
                unitPrice: paymentResult.totalAmount,
                total: paymentResult.totalAmount
            }];
        }

        const invoiceData = {
            number: invoiceNumber,
            masterPaymentId: paymentResult.masterPaymentId,
            date: invoiceDate,
            student: {
                name: student.nombre || '',
                nit: student.numDoc || '',
                tipoDoc: student.tipoDoc || 'C.C',
                address: student.direccion || '',
                phone: student.telefono || ''
            },
            items: invoiceItems,
            subtotal: paymentResult.totalAmount,
            total: paymentResult.totalAmount,
            paymentMethod: paymentResult.payments[0].method,
            bank: paymentResult.payments[0].bank,
            observations: paymentResult.payments[0].notes || '',
            printedAt: new Date().toISOString(),
            studentId: student.id,
            paymentType: paymentResult.paymentType,
            coveredMonths: paymentResult.payments.map(p => `${p.month} ${p.year}`)
        };

        // Save invoice
        await this.saveInvoice(invoiceData, student.id);
        
        // Update all related payments with invoice number
        const db = window.firebaseModules.database;
        for (const payment of paymentResult.payments) {
            const paymentRef = db.ref(window.FirebaseData.database, `payments/${payment.id}/invoiceNumber`);
            await db.set(paymentRef, invoiceNumber);
        }
        
        // Try to save to storage
        try {
            const htmlContent = this.getInvoiceHTML(invoiceData);
            const storageResult = await window.InvoiceStorage.saveInvoiceToStorage(invoiceData, htmlContent);
            if (storageResult) {
                invoiceData.storageUrl = storageResult.downloadUrl;
                invoiceData.storagePath = storageResult.path;
            }
        } catch (error) {
            console.error('⚠️ Storage save failed:', error);
        }

        // Audit log
        if (typeof window.logAudit === 'function') {
            const monthsList = paymentResult.payments.map(p => `${p.month} ${p.year}`).join(', ');
            await window.logAudit(
                'Factura generada',
                'invoice',
                invoiceNumber,
                `${student.nombre} - Factura ${invoiceNumber} - $${invoiceData.total.toLocaleString()} (${paymentResult.payments.length} meses)`,
                {
                    after: {
                        numeroFactura: invoiceNumber,
                        estudiante: student.nombre,
                        monto: invoiceData.total,
                        tipoPago: paymentResult.paymentType,
                        periodo: paymentResult.paymentPeriod,
                        meses: monthsList,
                        cantidadMeses: paymentResult.payments.length,
                        metodoPago: paymentResult.payments[0].method
                    }
                }
            );
        }

        return invoiceData;
    },

    // Save invoice to Firebase
    async saveInvoice(invoiceData, studentId) {
        try {
            const db = window.firebaseModules.database;
            const invoiceRef = db.ref(window.FirebaseData.database, `invoices/${invoiceData.number}`);

            // Ensure date is stored as ISO string for consistent parsing
            const dataToSave = {
                ...invoiceData,
                date: invoiceData.date instanceof Date ? invoiceData.date.toISOString() : invoiceData.date,
                studentId: studentId,
                createdAt: new Date().toISOString(),
                createdBy: window.FirebaseData.auth?.currentUser?.email || 'unknown'
            };

            console.log('💾 Saving invoice with date:', dataToSave.date);
            await db.set(invoiceRef, dataToSave);

            // Link to student
            const studentInvoiceRef = db.ref(window.FirebaseData.database, `students/${studentId}/invoices/${invoiceData.number}`);
            await db.set(studentInvoiceRef, true);

            console.log('✅ Invoice saved:', invoiceData.number);
        } catch (error) {
            console.error('Error saving invoice:', error);
        }
    },

    // Show invoice modal with FIXED z-index and timing
    showInvoiceModal(invoiceData) {
        // First, remove any existing invoice modal
        const existingModal = document.getElementById('invoiceModal');
        if (existingModal) existingModal.remove();
        
        // IMPORTANT: Also ensure payment modal is closed
        const paymentModal = document.getElementById('paymentModal');
        if (paymentModal) paymentModal.remove();

        const modal = document.createElement('div');
        modal.id = 'invoiceModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            animation: fadeIn 0.3s ease-in;
        `;
        
        // Check if invoice has storage URL for download button
        const downloadButton = invoiceData.storageUrl ? 
            `<button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.open('${invoiceData.storageUrl}', '_blank'); return false;" 
                    style="background: #059669; color: white; padding: 12px 24px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px; font-size: 14px;">
                ☁️ Descargar desde la nube
            </button>` : '';
        
        modal.innerHTML = `
            <div style="background: white; padding: 20px; max-width: 650px; max-height: 90vh; overflow-y: auto; position: relative; margin: 20px; border-radius: 8px; box-shadow: 0 10px 50px rgba(0,0,0,0.3); animation: slideIn 0.3s ease-out;">
                <button type="button" onclick="event.preventDefault(); event.stopPropagation(); document.getElementById('invoiceModal').remove(); return false;" 
                        style="position: absolute; right: 10px; top: 10px; background: red; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; z-index: 100000;">✖</button>
                
                <div id="invoiceContent">
                    ${this.getInvoiceHTML(invoiceData)}
                </div>
                
                <div style="margin-top: 20px; text-align: center;">
                    <button type="button" onclick="event.preventDefault(); event.stopPropagation(); printStandardInvoice(event); return false;" 
                            style="background: #3b82f6; color: white; padding: 12px 24px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px; font-size: 14px;">
                        🖨️ Imprimir Tamaño Carta
                    </button>
                    <button type="button" onclick="event.preventDefault(); event.stopPropagation(); printHalfPageInvoice(event); return false;" 
                            style="background: #E53E3E; color: white; padding: 12px 24px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px; font-size: 14px;">
                        📄 Imprimir 2 Copias (Media Carta)
                    </button>
                    <button type="button" onclick="event.preventDefault(); event.stopPropagation(); InvoiceGenerator.saveAsPDF('${invoiceData.number}'); return false;" 
                            style="background: #10b981; color: white; padding: 12px 24px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px; font-size: 14px;">
                        💾 Guardar como PDF
                    </button>
                    ${downloadButton}
                </div>
            </div>
        `;
        
        // Add animation styles if not already present
        if (!document.getElementById('invoiceModalAnimations')) {
            const style = document.createElement('style');
            style.id = 'invoiceModalAnimations';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { 
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Append to body
        document.body.appendChild(modal);
        
        // Force focus to the invoice modal
        setTimeout(() => {
            modal.focus();
            // Ensure it's on top
            modal.style.zIndex = '99999';
        }, 100);
    },

    // Get invoice HTML - UPDATED WITH LOGO, FIXED DATE, AND COMPLETE INFO
    getInvoiceHTML(data) {
        const formatDate = (date) => {
            try {
                // Log the date being processed for debugging
                console.log('📅 Formatting invoice date:', date, 'Type:', typeof date);

                const d = new Date(date);

                // Check if date is valid
                if (isNaN(d.getTime())) {
                    console.error('❌ Invalid date in invoice:', date);
                    // DO NOT use current date as fallback - use a clear error indicator
                    return {
                        day: 'XX',
                        month: 'XX',
                        year: 'ERROR'
                    };
                }

                const result = {
                    day: d.getDate().toString().padStart(2, '0'),
                    month: (d.getMonth() + 1).toString().padStart(2, '0'),
                    year: d.getFullYear()
                };

                console.log('✅ Date formatted successfully:', result);
                return result;
            } catch (error) {
                console.error('❌ Error formatting date:', error, 'Date value:', date);
                // DO NOT use current date as fallback
                return {
                    day: 'XX',
                    month: 'XX',
                    year: 'ERROR'
                };
            }
        };

        const dateInfo = formatDate(data.date);
        const formatCurrency = (num) => `$${(num || 0).toLocaleString('es-CO')}`;

        return `
            <div class="invoice-print" style="width: 500px; padding: 20px; border: 3px solid #000; font-family: Arial, sans-serif; position: relative; background: white; font-size: 11px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <!-- Header with Logo -->
                <div style="text-align: center; margin-bottom: 15px;">
                    <!-- Logo SVG -->
                    <div style="width: 70px; height: 70px; margin: 0 auto 8px;">
                        <svg width="70" height="70" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                            <!-- Red circle -->
                            <circle cx="50" cy="50" r="48" fill="#E53E3E" stroke="none"/>
                            <!-- White inner circle -->
                            <circle cx="50" cy="50" r="28" fill="white" stroke="none"/>
                            <!-- Blue bar -->
                            <rect x="0" y="40" width="100" height="20" fill="#2B6CB0"/>
                            <!-- Text on blue bar -->
                            <text x="50" y="54" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="white" text-anchor="middle">CIUDAD BILINGÜE</text>
                        </svg>
                    </div>
                    
                    <h1 style="margin: 0; font-size: 24px; color: #E53E3E;">${this.config.businessName}</h1>
                    <p style="margin: 3px 0; font-size: 10px;">NIT. ${this.config.nit}</p>
                    <p style="margin: 3px 0; font-size: 10px;">${this.config.address} &nbsp; Cel. ${this.config.phones}</p>
                </div>

                <!-- Invoice Number Box -->
                <div style="position: absolute; right: 20px; top: 20px; border: 2px solid #000; padding: 8px 15px; background: #f9f9f9;">
                    <div style="font-size: 10px; font-weight: bold;">COMPROBANTE DE PAGO</div>
                    <div style="font-size: 14px; font-weight: bold; color: #E53E3E;">${data.number}</div>
                </div>

                <!-- Date Box -->
                <div style="position: absolute; right: 20px; top: 75px; border: 2px solid #000; padding: 8px; background: #f9f9f9;">
                    <div style="font-size: 10px; text-align: center; font-weight: bold;">FECHA</div>
                    <div style="display: flex; gap: 8px;">
                        <div style="text-align: center;">
                            <div style="border: 1px solid #000; padding: 4px 8px; font-size: 10px; background: white;">${dateInfo.day}</div>
                            <small style="font-size: 8px;">DÍA</small>
                        </div>
                        <div style="text-align: center;">
                            <div style="border: 1px solid #000; padding: 4px 8px; font-size: 10px; background: white;">${dateInfo.month}</div>
                            <small style="font-size: 8px;">MES</small>
                        </div>
                        <div style="text-align: center;">
                            <div style="border: 1px solid #000; padding: 4px 8px; font-size: 10px; background: white;">${dateInfo.year}</div>
                            <small style="font-size: 8px;">AÑO</small>
                        </div>
                    </div>
                </div>

                <!-- Customer Info -->
                <div style="margin: 90px 0 15px 0; padding: 10px; background: #fafafa; border: 1px solid #ddd;">
                    <div style="display: flex; margin-bottom: 8px;">
                        <label style="font-weight: bold; width: 60px; font-size: 10px;">Señor:</label>
                        <span style="flex: 1; border-bottom: 1px solid #000; padding: 0 3px; font-size: 10px;">${data.student.name}</span>
                        <label style="font-weight: bold; width: 50px; margin-left: 10px; font-size: 10px;">${data.student.tipoDoc || 'C.C'}:</label>
                        <span style="flex: 1; border-bottom: 1px solid #000; padding: 0 3px; font-size: 10px;">${data.student.nit}</span>
                    </div>
                    <div style="display: flex; margin-bottom: 0;">
                        <label style="font-weight: bold; width: 60px; font-size: 10px;">Dirección:</label>
                        <span style="flex: 1; border-bottom: 1px solid #000; padding: 0 3px; font-size: 10px;">${data.student.address || 'N/A'}</span>
                        <label style="font-weight: bold; width: 50px; margin-left: 10px; font-size: 10px;">Cel.:</label>
                        <span style="flex: 1; border-bottom: 1px solid #000; padding: 0 3px; font-size: 10px;">${data.student.phone}</span>
                    </div>
                </div>

                <!-- Items Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <thead>
                        <tr>
                            <th style="border: 2px solid #000; padding: 6px; background: #E53E3E; color: white; width: 50px; font-size: 10px;">CANT.</th>
                            <th style="border: 2px solid #000; padding: 6px; background: #E53E3E; color: white; font-size: 10px;">DESCRIPCIÓN</th>
                            <th style="border: 2px solid #000; padding: 6px; background: #E53E3E; color: white; width: 80px; font-size: 10px;">VR. UNIT</th>
                            <th style="border: 2px solid #000; padding: 6px; background: #E53E3E; color: white; width: 80px; font-size: 10px;">VR. TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map(item => `
                            <tr>
                                <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 10px;">${item.quantity || 1}</td>
                                <td style="border: 1px solid #000; padding: 6px; font-size: 10px;">${item.description || ''}</td>
                                <td style="border: 1px solid #000; padding: 6px; text-align: right; font-size: 10px;">${formatCurrency(item.unitPrice || 0)}</td>
                                <td style="border: 1px solid #000; padding: 6px; text-align: right; font-size: 10px;">${formatCurrency(item.total || 0)}</td>
                            </tr>
                        `).join('')}
                        <!-- Empty rows for better layout -->
                        ${[...Array(Math.max(0, 3 - data.items.length))].map(() => `
                            <tr>
                                <td style="border: 1px solid #000; padding: 6px; height: 20px; font-size: 10px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 6px; font-size: 10px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 6px; font-size: 10px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 6px; font-size: 10px;">&nbsp;</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <!-- Totals -->
                <div style="text-align: right;">
                    <table style="margin-left: auto; width: 200px;">
                        <tr>
                            <td style="padding: 4px; font-weight: bold; font-size: 10px;">SUB TOTAL</td>
                            <td style="border: 1px solid #000; padding: 4px 8px; text-align: right; width: 100px; font-size: 10px; background: #f5f5f5;">
                                ${formatCurrency(data.subtotal || data.total || 0)}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 4px; font-weight: bold; font-size: 14px;">TOTAL</td>
                            <td style="border: 2px solid #000; padding: 4px 8px; text-align: right; font-weight: bold; font-size: 14px; background: #E53E3E; color: white;">
                                ${formatCurrency(data.total || 0)}
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Observations & Payment Info -->
                <div style="margin-top: 15px; border: 1px solid #000; padding: 8px; min-height: 40px; background: #fafafa;">
                    <strong style="font-size: 10px;">OBSERVACIONES:</strong><br>
                    <span style="font-size: 10px;">${data.observations || ''}</span>
                    ${data.paymentMethod ? `<br><span style="font-size: 10px;"><strong>Método de pago:</strong> ${data.paymentMethod}</span>` : ''}
                    ${data.bank ? `<span style="font-size: 10px;"> - ${data.bank}</span>` : ''}
                </div>

                <!-- Footer with Signatures -->
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #000;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <div style="text-align: center; width: 45%;">
                            <div style="border-bottom: 1px solid #000; margin-bottom: 5px; height: 40px;"></div>
                            <p style="margin: 0; font-size: 11px;">Firma del Estudiante</p>
                        </div>
                        <div style="text-align: center; width: 45%;">
                            <div style="border-bottom: 1px solid #000; margin-bottom: 5px; height: 40px;"></div>
                            <p style="margin: 0; font-size: 11px;">Firma Autorizada</p>
                        </div>
                    </div>
                    
                    <!-- Electronic Invoice Request Info -->
                    <div style="text-align: center; padding: 10px; background: #f5f5f5; border: 1px solid #ccc; margin-top: 10px;">
                        <p style="margin: 0; font-size: 10px; font-style: italic;">
                            Solicita factura electrónica enviando solicitud al correo<br>
                            <strong>contacto@ciudadbilingue.com</strong><br>
                            o al número de WhatsApp <strong>315 640 6911</strong>
                        </p>
                    </div>
                </div>

                <!-- Timestamp -->
                <div style="margin-top: 8px; font-size: 8px; color: #666; text-align: right;">
                    Impreso: ${new Date(data.printedAt).toLocaleString('es-CO')}
                </div>
            </div>
        `;
    },

    printInvoice() {
        printStandardInvoice(event);
    },

    saveAsPDF(invoiceNumber) {
        // Prevent navigation
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        window.print();
        alert(`Use "Guardar como PDF" en el diálogo de impresión.\nNombre sugerido: Comprobante_${invoiceNumber}.pdf`);
        return false;
    },

    // ==================== VOIDED INVOICES SYSTEM ====================

    // Void an invoice (mark as cancelled and create audit record)
    async voidInvoice(invoiceNumber, reason, replacementInvoiceNumber = null) {
        try {
            const db = window.firebaseModules.database;

            // Get the original invoice
            const invoiceRef = db.ref(window.FirebaseData.database, `invoices/${invoiceNumber}`);
            const snapshot = await db.get(invoiceRef);

            if (!snapshot.exists()) {
                throw new Error('Factura no encontrada: ' + invoiceNumber);
            }

            const originalInvoice = snapshot.val();

            // Create voided invoice record
            const voidedRecord = {
                ...originalInvoice,
                originalNumber: invoiceNumber,
                status: 'ANULADA',
                voidedAt: new Date().toISOString(),
                voidedBy: window.FirebaseData.auth?.currentUser?.email || 'unknown',
                voidReason: reason,
                replacementInvoice: replacementInvoiceNumber || null
            };

            // Save to voidedInvoices collection
            const voidedRef = db.ref(window.FirebaseData.database, `voidedInvoices/${invoiceNumber}`);
            await db.set(voidedRef, voidedRecord);

            // Update original invoice to mark as voided (keep for reference but mark status)
            const updatedInvoice = {
                ...originalInvoice,
                status: 'ANULADA',
                voidedAt: new Date().toISOString(),
                voidedBy: window.FirebaseData.auth?.currentUser?.email || 'unknown',
                voidReason: reason,
                replacementInvoice: replacementInvoiceNumber || null
            };
            await db.set(invoiceRef, updatedInvoice);

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Factura anulada',
                    'invoice',
                    invoiceNumber,
                    `Factura ${invoiceNumber} ANULADA - ${reason}${replacementInvoiceNumber ? ' → Reemplazada por ' + replacementInvoiceNumber : ''}`,
                    {
                        before: { status: 'ACTIVA', total: originalInvoice.total },
                        after: { status: 'ANULADA', reason: reason, replacement: replacementInvoiceNumber }
                    }
                );
            }

            console.log('✅ Factura anulada:', invoiceNumber);
            return voidedRecord;

        } catch (error) {
            console.error('❌ Error anulando factura:', error);
            throw error;
        }
    },

    // Get all voided invoices for audit purposes
    async getVoidedInvoices() {
        try {
            const db = window.firebaseModules.database;
            const voidedRef = db.ref(window.FirebaseData.database, 'voidedInvoices');
            const snapshot = await db.get(voidedRef);

            if (!snapshot.exists()) {
                return [];
            }

            const voided = [];
            snapshot.forEach(child => {
                voided.push({
                    id: child.key,
                    ...child.val()
                });
            });

            // Sort by voidedAt date descending
            voided.sort((a, b) => new Date(b.voidedAt) - new Date(a.voidedAt));

            return voided;
        } catch (error) {
            console.error('❌ Error getting voided invoices:', error);
            return [];
        }
    },

    // Show voided invoices modal for audit
    async showVoidedInvoicesModal() {
        const voided = await this.getVoidedInvoices();

        const existingModal = document.getElementById('voidedInvoicesModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'voidedInvoicesModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 900px; width: 95%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h2 style="margin: 0; color: #dc2626;">🚫 Facturas Anuladas (Auditoría)</h2>
                    <button onclick="document.getElementById('voidedInvoicesModal').remove()"
                            style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                        ✕ Cerrar
                    </button>
                </div>

                ${voided.length === 0 ? `
                    <div style="text-align: center; padding: 3rem; color: #6b7280;">
                        <div style="font-size: 48px; margin-bottom: 1rem;">✅</div>
                        <p>No hay facturas anuladas</p>
                    </div>
                ` : `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <strong>Total facturas anuladas:</strong> ${voided.length}
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background: #fee2e2;">
                                <th style="padding: 10px; border: 1px solid #fecaca; text-align: left;">Factura</th>
                                <th style="padding: 10px; border: 1px solid #fecaca; text-align: left;">Estudiante</th>
                                <th style="padding: 10px; border: 1px solid #fecaca; text-align: right;">Monto</th>
                                <th style="padding: 10px; border: 1px solid #fecaca; text-align: left;">Fecha Anulación</th>
                                <th style="padding: 10px; border: 1px solid #fecaca; text-align: left;">Motivo</th>
                                <th style="padding: 10px; border: 1px solid #fecaca; text-align: left;">Reemplazo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${voided.map(inv => `
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #fecaca; font-family: monospace; color: #dc2626;">
                                        ${inv.originalNumber || inv.number}
                                    </td>
                                    <td style="padding: 10px; border: 1px solid #fecaca;">
                                        ${inv.student?.name || 'N/A'}
                                    </td>
                                    <td style="padding: 10px; border: 1px solid #fecaca; text-align: right;">
                                        $${(inv.total || 0).toLocaleString('es-CO')}
                                    </td>
                                    <td style="padding: 10px; border: 1px solid #fecaca;">
                                        ${inv.voidedAt ? new Date(inv.voidedAt).toLocaleString('es-CO') : 'N/A'}
                                    </td>
                                    <td style="padding: 10px; border: 1px solid #fecaca; max-width: 200px;">
                                        ${inv.voidReason || 'Sin motivo'}
                                    </td>
                                    <td style="padding: 10px; border: 1px solid #fecaca; font-family: monospace; color: #16a34a;">
                                        ${inv.replacementInvoice || '—'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}

                <div style="margin-top: 1.5rem; padding: 1rem; background: #f3f4f6; border-radius: 8px; font-size: 13px; color: #6b7280;">
                    <strong>ℹ️ Nota:</strong> Este reporte muestra todas las facturas que fueron anuladas por errores o
                    duplicaciones. Cada factura anulada puede tener una factura de reemplazo asociada.
                    Los saltos en la numeración de facturas se explican por estas anulaciones.
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }
};
// ==================================================================================
// SECTION 5: UI RENDERING FUNCTIONS - Dashboard and table generation
// ==================================================================================

function renderPaymentDashboard() {
    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div style="background: #10b981; color: white; padding: 1.5rem; border-radius: 8px;">
                <div style="font-size: 2rem; font-weight: bold;" id="paidCount">0</div>
                <div>Pagados</div>
            </div>
            <div style="background: #f59e0b; color: white; padding: 1.5rem; border-radius: 8px;">
                <div style="font-size: 2rem; font-weight: bold;" id="partialCount">0</div>
                <div>⚠️ Parciales</div>
            </div>
            <div style="background: #fbbf24; color: white; padding: 1.5rem; border-radius: 8px;">
                <div style="font-size: 2rem; font-weight: bold;" id="upcomingCount">0</div>
                <div>Próximos</div>
            </div>
            <div style="background: #ef4444; color: white; padding: 1.5rem; border-radius: 8px;">
                <div style="font-size: 2rem; font-weight: bold;" id="overdueCount">0</div>
                <div>Vencidos</div>
            </div>
            <div style="background: #3b82f6; color: white; padding: 1.5rem; border-radius: 8px;">
                <div style="font-size: 1.5rem; font-weight: bold;" id="collectedAmount">$0</div>
                <div>Recaudado</div>
            </div>
        </div>

        <!-- Date Range Selector -->
        <div style="background: #f0f9ff; border: 2px solid #3b82f6; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
            <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-weight: 600; color: #1e40af;">📅 Rango de Fechas:</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <label style="font-size: 0.875rem; color: #374151;">Desde:</label>
                    <input
                        type="date"
                        id="paymentStartDate"
                        style="padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;"
                    >
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <label style="font-size: 0.875rem; color: #374151;">Hasta:</label>
                    <input
                        type="date"
                        id="paymentEndDate"
                        style="padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;"
                    >
                </div>
                <button
                    onclick="applyDateRangeFilter()"
                    class="btn"
                    style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border-radius: 6px; border: none; cursor: pointer; font-weight: 500;">
                    🔍 Aplicar
                </button>
                <button
                    onclick="clearDateRangeFilter()"
                    class="btn"
                    style="background: #6b7280; color: white; padding: 0.5rem 1rem; border-radius: 6px; border: none; cursor: pointer; font-weight: 500;">
                    🔄 Ver Todos
                </button>
                <div id="dateRangeInfo" style="font-size: 0.875rem; color: #059669; font-weight: 500; margin-left: auto;"></div>
            </div>
            <!-- Quick Presets -->
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; padding-top: 0.5rem; border-top: 1px solid #bfdbfe;">
                <span style="font-size: 0.75rem; color: #6b7280; align-self: center;">Accesos rápidos:</span>
                <button onclick="setDateRangePreset('today')" class="btn btn-sm" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 0.25rem 0.75rem; font-size: 0.75rem;">Hoy</button>
                <button onclick="setDateRangePreset('yesterday')" class="btn btn-sm" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 0.25rem 0.75rem; font-size: 0.75rem;">Ayer</button>
                <button onclick="setDateRangePreset('last7days')" class="btn btn-sm" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 0.25rem 0.75rem; font-size: 0.75rem;">Últimos 7 Días</button>
                <button onclick="setDateRangePreset('thisWeek')" class="btn btn-sm" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 0.25rem 0.75rem; font-size: 0.75rem;">Esta Semana</button>
                <button onclick="setDateRangePreset('thisMonth')" class="btn btn-sm" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 0.25rem 0.75rem; font-size: 0.75rem;">Este Mes</button>
                <button onclick="setDateRangePreset('lastMonth')" class="btn btn-sm" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 0.25rem 0.75rem; font-size: 0.75rem;">Mes Anterior</button>
                <button onclick="setDateRangePreset('thisYear')" class="btn btn-sm" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 0.25rem 0.75rem; font-size: 0.75rem;">Este Año</button>
                <button onclick="setDateRangePreset('last30days')" class="btn btn-sm" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 0.25rem 0.75rem; font-size: 0.75rem;">Últimos 30 Días</button>
            </div>
        </div>
    `;
}

// UPDATED: Render payment table with expandable history rows
function renderPaymentTable(students) {
    if (!students.length) {
        return '<div style="text-align: center; padding: 2rem; color: #666;">No hay estudiantes</div>';
    }

    return `
        <table style="width: 100%; background: white; border-radius: 8px; overflow: hidden;">
            <thead style="background: #f3f4f6;">
                <tr>
                    <th style="padding: 0.75rem; text-align: center; width: 40px;"></th>
                    <th style="padding: 0.75rem; text-align: center; width: 50px;">#</th>
                    <th style="padding: 0.75rem; text-align: left;">Estado Pago</th>
                    <th style="padding: 0.75rem; text-align: center;">Estado</th>
                    <th style="padding: 0.75rem; text-align: left;">Estudiante</th>
                    <th style="padding: 0.75rem; text-align: left;">Grupo</th>
                    <th style="padding: 0.75rem; text-align: left;">Modalidad</th>
                    <th style="padding: 0.75rem; text-align: right;">Valor</th>
                    <th style="padding: 0.75rem; text-align: center;">Día Pago</th>
                    <th style="padding: 0.75rem; text-align: center;">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${students.map((s, index) => {
                    const status = window.PaymentManager.getPaymentStatus(s);
                    const isInactive = s.status === 'inactive';
                    const rowStyle = isInactive ? 'background: #fee2e2;' : '';

                    // Main row with expand button
                    let mainRow = `
                        <tr style="border-top: 1px solid #e5e7eb; ${rowStyle}">
                            <td style="padding: 0.75rem; text-align: center;">
                                <button onclick="togglePaymentHistory('${s.id}')"
                                        id="expand-${s.id}"
                                        style="
                                            background: none;
                                            border: none;
                                            cursor: pointer;
                                            padding: 4px;
                                            transition: transform 0.3s;
                                            display: inline-flex;
                                            align-items: center;
                                        ">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#6b7280">
                                        <path d="M9 5l7 7-7 7"/>
                                    </svg>
                                </button>
                            </td>
                            <td style="padding: 0.75rem; text-align: center; font-weight: bold; color: #6b7280;">
                                ${index + 1}
                            </td>
                            <td style="padding: 0.75rem;">
                                <div>
                                    <span style="
                                        display: inline-flex;
                                        align-items: center;
                                        gap: 0.5rem;
                                        color: ${status.color};
                                        font-weight: 500;
                                    ">
                                        ${status.icon}
                                        ${status.status}
                                    </span>
                                    ${status.partial ? `
                                        <div style="
                                            font-size: 0.75rem;
                                            color: #6b7280;
                                            margin-top: 0.25rem;
                                            line-height: 1.3;
                                        ">
                                            Pagado: $${status.paidAmount.toLocaleString()}<br>
                                            <span style="color: #ef4444; font-weight: 600;">
                                                Pendiente: $${status.remaining.toLocaleString()}
                                            </span>
                                        </div>
                                    ` : ''}
                                </div>
                            </td>
                            <td style="padding: 0.75rem; text-align: center;">
                                <button class="btn btn-sm"
                                        style="background: ${isInactive ? '#ef4444' : '#10b981'}; color: white; cursor: default;">
                                    ${isInactive ? '❌ Inactivo' : '✓ Activo'}
                                </button>
                            </td>
                            <td style="padding: 0.75rem;">
                                <div style="font-weight: 500;">${s.nombre || '-'}</div>
                                <small style="color: #6b7280;">${s.telefono || '-'}</small>
                            </td>
                            <td style="padding: 0.75rem;">${s.grupo || 'Sin grupo'}</td>
                            <td style="padding: 0.75rem;">
                                ${s.modalidad || '-'}
                                ${s.modalidadDetalle ? `<br><small style="color: #6b7280;">${s.modalidadDetalle}</small>` : ''}
                            </td>
                            <td style="padding: 0.75rem; text-align: right;">
                                <strong>$${(s.valor || 0).toLocaleString()}</strong>
                            </td>
                            <td style="padding: 0.75rem; text-align: center;">
                                ${s.diaPago || '-'}
                            </td>
                            <td style="padding: 0.75rem; text-align: center;">
                                <button onclick="showPaymentModal('${s.id}')"
                                        class="btn btn-sm"
                                        style="background: #10b981; color: white; padding: 0.4rem 0.6rem; font-size: 13px; font-weight: bold; margin-right: 0.3rem; border-radius: 4px; border: none; cursor: pointer;"
                                        title="Registrar Pago">
                                    +
                                </button>
                                <button onclick="sendPaymentReminder('${s.id}')"
                                        class="btn btn-sm"
                                        style="background: #3b82f6; color: white; padding: 0.4rem 0.6rem; font-size: 13px; font-weight: bold; margin-right: 0.3rem; border-radius: 4px; border: none; cursor: pointer;"
                                        title="Enviar Recordatorio">
                                    R
                                </button>
                                <button onclick="openStudentNotes('${s.id}')"
                                        class="btn btn-sm"
                                        style="background: ${s.notes && s.notes.length > 0 ? '#f59e0b' : '#8b5cf6'}; color: white; padding: 0.4rem 0.6rem; font-size: 13px; font-weight: bold; margin-right: 0.3rem; border-radius: 4px; border: none; cursor: pointer;"
                                        title="${s.notes && s.notes.length > 0 ? 'Ver Notas (' + s.notes.length + ')' : 'Notas del Estudiante'}">
                                    📝
                                </button>
                                ${status.status === 'Pagado' ? `
                                <button onclick="generatePazYSalvo('${s.id}')"
                                        class="btn btn-sm"
                                        style="background: #059669; color: white; padding: 0.4rem 0.6rem; font-size: 13px; font-weight: bold; border-radius: 4px; border: none; cursor: pointer;"
                                        title="Generar Paz y Salvo">
                                    PZ
                                </button>
                                ` : ''}
                            </td>
                        </tr>
                    `;

                    // Hidden history row (will be populated on expand)
                    let historyRow = `
                        <tr id="history-${s.id}" class="payment-history-row" style="display: none;">
                            <td colspan="10" style="padding: 20px; background: #f9fafb; text-align: center;">
                                <div style="color: #6b7280;">Cargando historial...</div>
                            </td>
                        </tr>
                    `;
                    
                    return mainRow + historyRow;
                }).join('')}
            </tbody>
        </table>
    `;
}

// NEW: Render payment history row with monthly grid
function renderPaymentHistoryContent(studentId, history, stats, year = 2025) {
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    const statusColors = {
        'paid': '#10b981',
        'pending': '#f59e0b',
        'overdue': '#ef4444',
        'no-payment': '#d1d5db',
        'holiday': '#60a5fa'
    };

    return `
        <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="margin: 0; color: #1f2937; font-size: 16px;">📅 Historial de Pagos ${year}</h4>
                <select onchange="changeHistoryYear('${studentId}', this.value)"
                        style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white;">
                    <option value="2026"${year == 2026 ? ' selected' : ''}>2026</option>
                    <option value="2025"${year == 2025 ? ' selected' : ''}>2025</option>
                    <option value="2024"${year == 2024 ? ' selected' : ''}>2024</option>
                </select>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
                ${months.map(month => {
                    const payment = history[month];
                    const color = statusColors[payment.status];
                    const hasMultiplePayments = payment.payments && payment.payments.length > 1;

                    return `
                        <div style="
                            background: white;
                            border: 2px solid ${color};
                            border-radius: 8px;
                            padding: 12px;
                            position: relative;
                            transition: all 0.2s;
                        ">

                            <div style="
                                width: 8px; height: 8px;
                                background: ${color};
                                border-radius: 50%;
                                position: absolute; top: 8px; right: 8px;
                            "></div>

                            ${hasMultiplePayments ?
                                `<div style="
                                    background: #3b82f6;
                                    color: white;
                                    font-size: 9px;
                                    padding: 2px 6px;
                                    border-radius: 10px;
                                    position: absolute;
                                    top: 8px;
                                    left: 8px;
                                    font-weight: 600;
                                ">${payment.payments.length} pagos</div>` : ''}

                            <div style="font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 13px; ${hasMultiplePayments ? 'margin-top: 12px;' : ''}">
                                ${month.charAt(0).toUpperCase() + month.slice(1)}
                            </div>

                            <div style="font-weight: 600; font-size: 15px; color: ${color};">
                                ${payment.status === 'holiday' ? '🏖️' : (payment.amount > 0 ? '$' + payment.amount.toLocaleString('es-CO') : '-')}
                            </div>

                            ${!hasMultiplePayments ? `
                                <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
                                    ${payment.date || (payment.status === 'pending' ? 'Pendiente' : payment.status === 'overdue' ? 'Vencido' : payment.status === 'holiday' ? 'Vacaciones' : '')}
                                </div>

                                ${payment.status === 'paid' && payment.method ?
                                    `<div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">
                                        ${payment.method} ${payment.bank ? '- ' + payment.bank : ''}
                                    </div>` : ''}

                                ${payment.status === 'paid' && payment.invoiceNumber ?
                                    `<button
                                        onclick="viewPaymentInvoice('${payment.paymentId}')"
                                        class="btn btn-sm"
                                        style="
                                            background: #3b82f6;
                                            color: white;
                                            border: none;
                                            padding: 4px 8px;
                                            border-radius: 4px;
                                            font-size: 10px;
                                            margin-top: 6px;
                                            width: 100%;
                                            cursor: pointer;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            gap: 4px;
                                            transition: background 0.2s;
                                        "
                                        onmouseover="this.style.background='#2563eb'"
                                        onmouseout="this.style.background='#3b82f6'">
                                        🧾 Ver Factura
                                    </button>` : ''}

                                ${payment.status === 'paid' && payment.paymentId && window.FirebaseData?.currentUser?.email === 'admin@ciudadbilingue.com' ?
                                    `<button
                                        onclick="openEditPaymentModal('${payment.paymentId}', '${studentId}')"
                                        class="btn btn-sm"
                                        style="
                                            background: #f59e0b;
                                            color: white;
                                            border: none;
                                            padding: 4px 8px;
                                            border-radius: 4px;
                                            font-size: 10px;
                                            margin-top: 4px;
                                            width: 100%;
                                            cursor: pointer;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            gap: 4px;
                                            transition: background 0.2s;
                                        "
                                        onmouseover="this.style.background='#d97706'"
                                        onmouseout="this.style.background='#f59e0b'">
                                        ✏️ Editar
                                    </button>
                                    <button
                                        onclick="confirmDeletePayment('${payment.paymentId}', '${studentId}')"
                                        class="btn btn-sm"
                                        style="
                                            background: #ef4444;
                                            color: white;
                                            border: none;
                                            padding: 4px 8px;
                                            border-radius: 4px;
                                            font-size: 10px;
                                            margin-top: 4px;
                                            width: 100%;
                                            cursor: pointer;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            gap: 4px;
                                            transition: background 0.2s;
                                        "
                                        onmouseover="this.style.background='#dc2626'"
                                        onmouseout="this.style.background='#ef4444'">
                                        🗑️ Eliminar
                                    </button>` : ''}
                            ` : `
                                <!-- Multiple payments - show list -->
                                <div style="margin-top: 8px; max-height: 200px; overflow-y: auto;">
                                    ${payment.payments.map((p, index) => `
                                        <div style="
                                            background: #f9fafb;
                                            border-radius: 6px;
                                            padding: 8px;
                                            margin-bottom: 6px;
                                            border-left: 3px solid ${color};
                                        ">
                                            <div style="font-size: 10px; color: #6b7280; margin-bottom: 4px;">
                                                Pago ${index + 1} - ${p.date}
                                            </div>
                                            <div style="font-weight: 600; font-size: 12px; color: #374151;">
                                                $${p.amount.toLocaleString('es-CO')}
                                            </div>
                                            <div style="font-size: 9px; color: #9ca3af; margin-top: 2px;">
                                                ${p.method} ${p.bank ? '- ' + p.bank : ''}
                                            </div>
                                            ${p.invoiceNumber ?
                                                `<button
                                                    onclick="viewPaymentInvoice('${p.paymentId}')"
                                                    class="btn btn-sm"
                                                    style="
                                                        background: #3b82f6;
                                                        color: white;
                                                        border: none;
                                                        padding: 3px 6px;
                                                        border-radius: 4px;
                                                        font-size: 9px;
                                                        margin-top: 4px;
                                                        width: 100%;
                                                        cursor: pointer;
                                                        transition: background 0.2s;
                                                    "
                                                    onmouseover="this.style.background='#2563eb'"
                                                    onmouseout="this.style.background='#3b82f6'">
                                                    🧾 Recibo ${index + 1}
                                                </button>` : ''}
                                            ${p.paymentId && window.FirebaseData?.currentUser?.email === 'admin@ciudadbilingue.com' ?
                                                `<button
                                                    onclick="openEditPaymentModal('${p.paymentId}', '${studentId}')"
                                                    class="btn btn-sm"
                                                    style="
                                                        background: #f59e0b;
                                                        color: white;
                                                        border: none;
                                                        padding: 3px 6px;
                                                        border-radius: 4px;
                                                        font-size: 9px;
                                                        margin-top: 4px;
                                                        width: 100%;
                                                        cursor: pointer;
                                                        transition: background 0.2s;
                                                    "
                                                    onmouseover="this.style.background='#d97706'"
                                                    onmouseout="this.style.background='#f59e0b'">
                                                    ✏️ Editar
                                                </button>
                                                <button
                                                    onclick="confirmDeletePayment('${p.paymentId}', '${studentId}')"
                                                    class="btn btn-sm"
                                                    style="
                                                        background: #ef4444;
                                                        color: white;
                                                        border: none;
                                                        padding: 3px 6px;
                                                        border-radius: 4px;
                                                        font-size: 9px;
                                                        margin-top: 4px;
                                                        width: 100%;
                                                        cursor: pointer;
                                                        transition: background 0.2s;
                                                    "
                                                    onmouseover="this.style.background='#dc2626'"
                                                    onmouseout="this.style.background='#ef4444'">
                                                    🗑️ Eliminar
                                                </button>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            `}
                        </div>
                    `;
                }).join('')}
            </div>
            
            <!-- Summary Stats -->
            <div style="
                display: flex; 
                gap: 20px; 
                margin-top: 20px; 
                padding-top: 20px; 
                border-top: 1px solid #e5e7eb;
            ">
                <div style="flex: 1; text-align: center;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Total Pagado</div>
                    <div style="font-size: 18px; font-weight: 600; color: #10b981;">
                        $${stats.totalPaid.toLocaleString('es-CO')}
                    </div>
                </div>
                <div style="flex: 1; text-align: center;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Total Pendiente</div>
                    <div style="font-size: 18px; font-weight: 600; color: #f59e0b;">
                        $${stats.totalPending.toLocaleString('es-CO')}
                    </div>
                </div>
                <div style="flex: 1; text-align: center;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Meses Pagados</div>
                    <div style="font-size: 18px; font-weight: 600; color: #1f2937;">
                        ${stats.monthsPaid}/12
                    </div>
                </div>
                <div style="flex: 1; text-align: center;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Meses Vencidos</div>
                    <div style="font-size: 18px; font-weight: 600; color: #ef4444;">
                        ${stats.monthsOverdue}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderPaymentModal(student) {
    const currentMonth = new Date().toLocaleDateString('es-ES', { month: 'long' });
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Generate month options for 24 months (current year + next year)
    const allMonths = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    return `
        <div id="paymentModal" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 700px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <h3>💵 Registrar Pago - ${student.nombre}</h3>
                
                <form id="paymentForm" style="margin-top: 1rem;">
                    <!-- Hourly Payment Section - For POR_HORAS students OR Privadas modalidad -->
                    ${(student.tipoPago === 'POR_HORAS' || student.modalidad === 'Privadas') ? `
                        <div style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
                            <h4 style="margin: 0 0 1rem 0; color: #0369a1;">⏱️ Pago por Horas</h4>

                            <div class="form-group">
                                <label>Valor por Hora</label>
                                <input type="number" id="hourlyRate" value="${student.valorHora || 0}" min="0" step="0.01" readonly
                                       style="background: #e0f2fe; font-weight: 600;"
                                       onchange="calculateHourlyTotal()">
                                <small style="color: #6b7280;">Tarifa configurada para este estudiante</small>
                            </div>

                            <div class="form-group">
                                <label>Número de Horas Pagadas</label>
                                <input type="number" id="hoursCount" value="0" min="0" step="0.5" required
                                       oninput="calculateHourlyTotal()"
                                       style="font-size: 16px; padding: 0.75rem;">
                                <small style="color: #6b7280;">Ingrese el total de horas a pagar</small>
                            </div>

                            <div class="form-group">
                                <label>Total a Pagar</label>
                                <input type="number" id="payAmount" value="0" readonly required
                                       style="background: #dcfce7; font-size: 18px; font-weight: 700; color: #166534; padding: 0.75rem;">
                                <small style="color: #6b7280;">Calculado automáticamente: <span id="hourlyCalculation">$0 x 0 horas</span></small>
                            </div>
                        </div>
                    ` : `
                        <!-- Payment Type Selection - Only for regular students -->
                        <div class="form-group">
                            <label>Tipo de Pago</label>
                            <select id="paymentType" required onchange="handlePaymentTypeChange()">
                                <option value="monthly">Mensual</option>
                                <option value="trimester">Trimestre (3 meses)</option>
                                <option value="semester">Semestre (6 meses)</option>
                                <option value="academicSemester">Semestre Académico (Fechas fijas)</option>
                                <option value="annual">Anual (12 meses)</option>
                                <option value="twoSemesters">2 Semestres Académicos</option>
                            </select>
                        </div>
                    `}
                    
                    <!-- Academic Semester Selection (hidden by default) -->
                    <div class="form-group" id="academicSemesterGroup" style="display: none;">
                        <label>Seleccionar Semestre Académico</label>
                        <select id="academicSemesterSelect" onchange="selectAcademicSemester()">
                            <option value="">Seleccionar...</option>
                            <option value="2025-1">Semestre 1 2025 (Feb-Jun)</option>
                            <option value="2025-2">Semestre 2 2025 (Jul-Dic)</option>
                            <option value="2026-1">Semestre 1 2026 (Feb-Jun)</option>
                            <option value="2026-2">Semestre 2 2026 (Jul-Dic)</option>
                        </select>
                    </div>
                    
                    <!-- Month Selection Grid - Hidden for hourly/Privadas students -->
                    <div class="form-group" id="monthSelectionGroup" style="display: ${(student.tipoPago === 'POR_HORAS' || student.modalidad === 'Privadas') ? 'none' : 'block'};">
                        <label>Seleccionar Meses <span id="monthCounter">(0 seleccionados)</span></label>
                        <div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px; max-height: 300px; overflow-y: auto;">
                            <!-- Current Year -->
                            <div style="margin-bottom: 15px;">
                                <strong>${currentYear}</strong>
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px;">
                                    ${allMonths.map((month, idx) => {
                                        const monthDate = new Date(currentYear, idx, 1);
                                        const isPast = monthDate < new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                                        return `
                                            <label style="display: flex; align-items: center; padding: 5px; background: ${isPast ? '#f3f4f6' : 'white'}; border: 1px solid #e5e7eb; border-radius: 4px; cursor: pointer;">
                                                <input type="checkbox" 
                                                       class="month-checkbox" 
                                                       data-month="${month}" 
                                                       data-year="${currentYear}"
                                                       data-month-index="${idx}"
                                                       onchange="updateMonthSelection()"
                                                       style="margin-right: 5px;">
                                                <span style="font-size: 13px; ${isPast ? 'color: #6b7280;' : ''}">${month.charAt(0).toUpperCase() + month.slice(1)}</span>
                                            </label>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                            
                            <!-- Next Year -->
                            <div>
                                <strong>${nextYear}</strong>
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px;">
                                    ${allMonths.map((month, idx) => `
                                        <label style="display: flex; align-items: center; padding: 5px; background: white; border: 1px solid #e5e7eb; border-radius: 4px; cursor: pointer;">
                                            <input type="checkbox" 
                                                   class="month-checkbox" 
                                                   data-month="${month}" 
                                                   data-year="${nextYear}"
                                                   data-month-index="${idx}"
                                                   onchange="updateMonthSelection()"
                                                   style="margin-right: 5px;">
                                            <span style="font-size: 13px;">${month.charAt(0).toUpperCase() + month.slice(1)}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Payment Installments -->
                    <div class="form-group" id="installmentGroup" style="display: none;">
                        <label>Opciones de Pago</label>
                        <select id="installmentOption" onchange="updateInstallmentAmounts()">
                            <option value="1">Pago único (100%)</option>
                            <option value="2">2 cuotas (50% cada una)</option>
                            <option value="3">3 cuotas (33.3% cada una)</option>
                        </select>
                    </div>
                    
                    <!-- Amount Section - Only for regular students (not hourly/Privadas) -->
                    ${(student.tipoPago !== 'POR_HORAS' && student.modalidad !== 'Privadas') ? `
                        <div class="form-group">
                            <label>Monto Mensualidad/Semestre ($)</label>
                            <input type="number" id="payAmountBase" value="" required min="0" onchange="updatePaymentTotal()" placeholder="Ingrese el monto a pagar">
                            <small id="amountHelp" style="color: #6b7280; display: block; margin-top: 5px;">
                                Ingrese el monto total de la mensualidad o semestre
                            </small>
                        </div>

                        <!-- Additional Items Section -->
                        <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
                            <h4 style="margin: 0 0 1rem 0; color: #166534;">📦 Artículos Adicionales (Opcional)</h4>

                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <!-- Matrícula -->
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; min-width: 120px;">
                                        <input type="checkbox" id="includeMatricula" onchange="updatePaymentTotal()">
                                        <span style="font-weight: 500;">Matrícula</span>
                                    </label>
                                    <input type="number" id="matriculaAmount" value="0" min="0"
                                           style="flex: 1; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;"
                                           placeholder="Valor matrícula"
                                           oninput="updatePaymentTotal()"
                                           disabled>
                                </div>

                                <!-- Certificado -->
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; min-width: 120px;">
                                        <input type="checkbox" id="includeCertificado" onchange="updatePaymentTotal()">
                                        <span style="font-weight: 500;">Certificado</span>
                                    </label>
                                    <input type="number" id="certificadoAmount" value="0" min="0"
                                           style="flex: 1; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;"
                                           placeholder="Valor certificado"
                                           oninput="updatePaymentTotal()"
                                           disabled>
                                </div>

                                <!-- Otro concepto -->
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; min-width: 120px;">
                                        <input type="checkbox" id="includeOtro" onchange="updatePaymentTotal()">
                                        <span style="font-weight: 500;">Otro</span>
                                    </label>
                                    <input type="text" id="otroConcepto"
                                           style="width: 100px; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;"
                                           placeholder="Concepto"
                                           disabled>
                                    <input type="number" id="otroAmount" value="0" min="0"
                                           style="flex: 1; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;"
                                           placeholder="Valor"
                                           oninput="updatePaymentTotal()"
                                           disabled>
                                </div>
                            </div>
                        </div>

                        <!-- Payment Summary -->
                        <div id="paymentSummary" style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
                            <h4 style="margin: 0 0 0.75rem 0; color: #92400e;">🧾 Resumen del Pago</h4>
                            <div id="paymentLineItems" style="font-size: 14px; color: #374151;">
                                <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                                    <span>Mensualidad/Semestre:</span>
                                    <span id="summaryBase">$0</span>
                                </div>
                            </div>
                            <div style="border-top: 2px solid #f59e0b; margin-top: 8px; padding-top: 8px; display: flex; justify-content: space-between; font-weight: 700; font-size: 16px; color: #92400e;">
                                <span>TOTAL:</span>
                                <span id="summaryTotal">$0</span>
                            </div>
                        </div>

                        <!-- Hidden field for actual total -->
                        <input type="hidden" id="payAmount" value="${student.valor || ''}">
                    ` : ''}
                    
                    <!-- Installment Details (hidden by default) -->
                    <div id="installmentDetails" style="display: none; background: #f9fafb; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                        <strong>Detalles de Cuotas:</strong>
                        <div id="installmentBreakdown"></div>
                    </div>
                    
                    <!-- Current Installment Selection (for multi-installment payments) -->
                    <div class="form-group" id="currentInstallmentGroup" style="display: none;">
                        <label>Esta es la cuota número:</label>
                        <select id="currentInstallment">
                            <option value="1">Primera cuota</option>
                            <option value="2">Segunda cuota</option>
                            <option value="3">Tercera cuota</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Método de Pago</label>
                        <select id="payMethod" required onchange="toggleBankOptions()">
                            <option value="">Seleccionar...</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Efectivo">Efectivo en la escuela</option>
                        </select>
                    </div>
                    
                    <div class="form-group" id="bankGroup" style="display: none;">
                        <label>Banco/App</label>
                        <select id="payBank">
                            <option value="Nequi">Nequi</option>
                            <option value="Bancolombia">Bancolombia</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Notas (opcional)</label>
                        <textarea id="payNotes" rows="2"></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                        <button type="button" onclick="closePaymentModal()" class="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary">
                            ✅ Registrar Pago
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// ==================================================================================
// SECTION 6: WINDOW FUNCTIONS - Global event handlers and modal management
// ==================================================================================

// NEW: Toggle payment history visibility
window.togglePaymentHistory = async function(studentId) {
    const btn = document.querySelector(`#expand-${studentId}`);
    const historyRow = document.querySelector(`#history-${studentId}`);
    
    if (!historyRow) return;
    
    // Toggle visibility
    const isVisible = historyRow.style.display !== 'none';
    
    if (isVisible) {
        // Hide
        historyRow.style.display = 'none';
        btn.style.transform = 'rotate(0deg)';
    } else {
        // Show and load data if needed
        historyRow.style.display = 'table-row';
        btn.style.transform = 'rotate(90deg)';
        
        // Check if we need to load the history
        if (historyRow.innerHTML.includes('Cargando')) {
            try {
                const history = await window.PaymentManager.getStudentPaymentHistory(studentId);
                const stats = window.PaymentManager.calculatePaymentStats(history);
                
                // Update the row with actual history
                historyRow.innerHTML = `
                    <td colspan="8" style="padding: 0; background: #f9fafb;">
                        ${renderPaymentHistoryContent(studentId, history, stats)}
                    </td>
                `;
            } catch (error) {
                console.error('Error loading payment history:', error);
                historyRow.innerHTML = '<td colspan="8" style="padding: 20px; text-align: center; color: #ef4444;">Error al cargar historial</td>';
            }
        }
    }
};

// NEW: Change history year
window.changeHistoryYear = async function(studentId, year) {
    const historyRow = document.querySelector(`#history-${studentId}`);
    if (!historyRow) return;
    
    try {
        // Show loading
        historyRow.innerHTML = '<td colspan="8" style="padding: 20px; text-align: center; color: #6b7280;">Cargando historial...</td>';
        
        // Load history for selected year
        const history = await window.PaymentManager.getStudentPaymentHistory(studentId, parseInt(year));
        const stats = window.PaymentManager.calculatePaymentStats(history);
        
        // Update display
        historyRow.innerHTML = `
            <td colspan="8" style="padding: 0; background: #f9fafb;">
                ${renderPaymentHistoryContent(studentId, history, stats, parseInt(year))}
            </td>
        `;
    } catch (error) {
        console.error('Error changing year:', error);
        window.showNotification('❌ Error al cargar historial', 'error');
    }
};

// Add function to view/regenerate invoices from payment history
window.viewPaymentInvoice = async function(paymentId) {
    try {
        console.log('📄 Viewing invoice for payment:', paymentId);
        window.showNotification('📄 Cargando factura...', 'info');

        const payment = window.PaymentManager.payments.get(paymentId);
        if (!payment) {
            console.error('Payment not found:', paymentId);
            window.showNotification('❌ Pago no encontrado', 'error');
            return;
        }

        const student = window.StudentManager.students.get(payment.studentId);
        if (!student) {
            console.error('Student not found:', payment.studentId);
            window.showNotification('❌ Estudiante no encontrado', 'error');
            return;
        }

        // Check if invoice exists
        if (payment.invoiceNumber) {
            console.log('📄 Loading existing invoice:', payment.invoiceNumber);
            // Load existing invoice
            const db = window.firebaseModules.database;
            const invoiceRef = db.ref(window.FirebaseData.database, `invoices/${payment.invoiceNumber}`);
            const snapshot = await db.get(invoiceRef);

            if (snapshot.exists()) {
                console.log('✅ Invoice found in database');
                const invoiceData = snapshot.val();

                // CRITICAL FIX: If invoice doesn't have date (old invoices), get it from payment
                if (!invoiceData.date) {
                    console.warn('⚠️ Invoice missing date, using payment date:', payment.date);
                    invoiceData.date = payment.date;

                    // Update the invoice in Firebase to add the missing date
                    try {
                        await db.set(invoiceRef, invoiceData);
                        console.log('✅ Updated invoice with payment date');
                    } catch (error) {
                        console.error('❌ Error updating invoice date:', error);
                    }
                }

                InvoiceGenerator.showInvoiceModal(invoiceData);
                window.showNotification('✅ Factura cargada', 'success');
            } else {
                // Regenerate if not found in database (shouldn't normally happen)
                console.warn('⚠️ Invoice not in database, regenerating with same number');
                const invoiceData = await InvoiceGenerator.generateInvoice(payment, student);
                // Keep the original invoice number
                invoiceData.number = payment.invoiceNumber;
                InvoiceGenerator.showInvoiceModal(invoiceData);
                window.showNotification('✅ Factura regenerada', 'success');
            }
        } else {
            // Generate new invoice (for old payments without invoice numbers)
            console.log('⚠️ Payment has no invoice number, generating new one');
            const invoiceData = await InvoiceGenerator.generateInvoice(payment, student);
            InvoiceGenerator.showInvoiceModal(invoiceData);
            window.showNotification('✅ Factura generada', 'success');
        }
    } catch (error) {
        console.error('❌ Error loading invoice:', error);
        window.showNotification('❌ Error al cargar factura: ' + error.message, 'error');
    }
};

// NEW: Enhanced functions for storage-enabled invoices
window.viewStoredInvoice = async function(invoiceNumber) {
    try {
        const invoice = await window.InvoiceStorage.getInvoice(invoiceNumber);
        
        if (invoice.url) {
            // Open cloud-stored invoice in new tab
            window.open(invoice.url, '_blank');
        } else if (invoice.data) {
            // Show using existing modal
            InvoiceGenerator.showInvoiceModal(invoice.data);
        }
    } catch (error) {
        console.error('Error viewing invoice:', error);
        window.showNotification('❌ Error al abrir comprobante', 'error');
    }
};

window.downloadStoredInvoice = async function(invoiceNumber) {
    try {
        await window.InvoiceStorage.downloadInvoice(invoiceNumber);
        window.showNotification('✅ Descarga iniciada', 'success');
    } catch (error) {
        console.error('Error downloading invoice:', error);
        window.showNotification('❌ Error al descargar', 'error');
    }
};

// Replace the old window.printAsHalfPage function
window.printAsHalfPage = window.printHalfPageInvoice;

// Batch print function for multiple invoices (2 per page, different invoices)
window.batchPrintHalfPage = function(invoices) {
    if (!invoices || invoices.length === 0) {
        window.showNotification('No hay comprobantes para imprimir', 'warning');
        return;
    }
    
    const printWindow = window.open('', 'BatchPrint' + Date.now(), 'width=800,height=600');
    
    const styles = `
        <style>
            @media print {
                @page {
                    size: letter;
                    margin: 0.25in;
                }
                body {
                    margin: 0;
                    padding: 0;
                }
                .page {
                    page-break-after: always;
                    height: 11in;
                }
                .page:last-child {
                    page-break-after: auto;
                }
                .invoice-wrapper {
                    width: 100%;
                    height: 5.25in;
                    padding: 0.2in;
                    font-size: 10px;
                    border-bottom: 1px dashed #999;
                }
                .invoice-wrapper:last-child {
                    border-bottom: none;
                }
            }
            @media screen {
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 10px;
                }
                .page {
                    max-width: 800px;
                    margin: 0 auto 20px;
                    border: 1px solid #ddd;
                }
                .invoice-wrapper {
                    border-bottom: 1px dashed #ccc;
                    padding: 15px;
                }
            }
        </style>
    `;
    
    let pagesHTML = '';
    for (let i = 0; i < invoices.length; i += 2) {
        pagesHTML += '<div class="page">';
        
        // First invoice on page
        pagesHTML += `<div class="invoice-wrapper">${InvoiceGenerator.getInvoiceHTML(invoices[i])}</div>`;
        
        // Second invoice on page (if exists)
        if (i + 1 < invoices.length) {
            pagesHTML += `<div class="invoice-wrapper">${InvoiceGenerator.getInvoiceHTML(invoices[i + 1])}</div>`;
        }
        
        pagesHTML += '</div>';
    }
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Comprobantes - Impresión Masiva</title>
            ${styles}
        </head>
        <body>
            ${pagesHTML}
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        window.onafterprint = () => window.close();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

// ==================================================================================
// NEW MULTI-MONTH PAYMENT FUNCTIONS
// ==================================================================================

// Handle payment type change
window.handlePaymentTypeChange = function() {
    const paymentType = document.getElementById('paymentType').value;
    const monthSelectionGroup = document.getElementById('monthSelectionGroup');
    const academicSemesterGroup = document.getElementById('academicSemesterGroup');
    const installmentGroup = document.getElementById('installmentGroup');
    
    // Reset all checkboxes
    document.querySelectorAll('.month-checkbox').forEach(cb => {
        cb.checked = false;
        cb.disabled = false;
    });
    
    if (paymentType === 'academicSemester' || paymentType === 'twoSemesters') {
        monthSelectionGroup.style.display = 'none';
        academicSemesterGroup.style.display = 'block';
        installmentGroup.style.display = 'block';
    } else {
        academicSemesterGroup.style.display = 'none';
        monthSelectionGroup.style.display = 'block';
        installmentGroup.style.display = paymentType !== 'monthly' ? 'block' : 'none';
        
        // Auto-select months for standard types
        if (paymentType === 'monthly') {
            // Select current month
            const currentMonth = new Date().toLocaleDateString('es-ES', { month: 'long' });
            const currentYear = new Date().getFullYear();
            const checkbox = document.querySelector(`.month-checkbox[data-month="${currentMonth}"][data-year="${currentYear}"]`);
            if (checkbox) checkbox.checked = true;
        }
    }
    
    updateMonthSelection();
};

// Update month selection counter
window.updateMonthSelection = function() {
    const checkedBoxes = document.querySelectorAll('.month-checkbox:checked');
    const counter = document.getElementById('monthCounter');
    const paymentType = document.getElementById('paymentType').value;
    const student = window.StudentManager.students.get(window.currentStudentId);

    // Use payAmountBase if it exists (new UI), otherwise payAmount (legacy)
    const amountInput = document.getElementById('payAmountBase') || document.getElementById('payAmount');

    counter.textContent = `(${checkedBoxes.length} seleccionados)`;

    // Show selected months count (no auto-fill - user enters amount manually)
    if (checkedBoxes.length > 0) {
        const amountHelp = document.getElementById('amountHelp');
        if (amountHelp) {
            amountHelp.innerHTML = `${checkedBoxes.length} mes(es) seleccionado(s)`;
        }
    } else {
        const amountHelp = document.getElementById('amountHelp');
        if (amountHelp) {
            amountHelp.innerHTML = `Ingrese el monto total de la mensualidad o semestre`;
        }
    }

    // Update total calculation if the new UI is present
    if (typeof updatePaymentTotal === 'function' && document.getElementById('payAmountBase')) {
        updatePaymentTotal();
    } else {
        updateInstallmentAmounts();
    }
};

// Calculate hourly payment total
window.calculateHourlyTotal = function() {
    const hourlyRate = parseFloat(document.getElementById('hourlyRate')?.value) || 0;
    const hoursCount = parseFloat(document.getElementById('hoursCount')?.value) || 0;
    const total = hourlyRate * hoursCount;

    // Update the total amount field
    const payAmountField = document.getElementById('payAmount');
    if (payAmountField) {
        payAmountField.value = total.toFixed(2);
    }

    // Update the calculation display
    const calculationDisplay = document.getElementById('hourlyCalculation');
    if (calculationDisplay) {
        calculationDisplay.textContent = `$${hourlyRate.toLocaleString('es-CO')} x ${hoursCount} horas = $${total.toLocaleString('es-CO')}`;
    }
};

// Update payment total with additional items (Matrícula, Certificado, etc.)
window.updatePaymentTotal = function() {
    // Get base amount
    const baseAmount = parseFloat(document.getElementById('payAmountBase')?.value) || 0;

    // Handle checkbox enable/disable for inputs
    const matriculaCheck = document.getElementById('includeMatricula');
    const matriculaInput = document.getElementById('matriculaAmount');
    const certificadoCheck = document.getElementById('includeCertificado');
    const certificadoInput = document.getElementById('certificadoAmount');
    const otroCheck = document.getElementById('includeOtro');
    const otroConceptoInput = document.getElementById('otroConcepto');
    const otroAmountInput = document.getElementById('otroAmount');

    // Enable/disable inputs based on checkbox state
    if (matriculaInput) {
        matriculaInput.disabled = !matriculaCheck?.checked;
        if (!matriculaCheck?.checked) matriculaInput.value = 0;
    }
    if (certificadoInput) {
        certificadoInput.disabled = !certificadoCheck?.checked;
        if (!certificadoCheck?.checked) certificadoInput.value = 0;
    }
    if (otroConceptoInput && otroAmountInput) {
        otroConceptoInput.disabled = !otroCheck?.checked;
        otroAmountInput.disabled = !otroCheck?.checked;
        if (!otroCheck?.checked) {
            otroAmountInput.value = 0;
            otroConceptoInput.value = '';
        }
    }

    // Get additional amounts
    const matriculaAmount = matriculaCheck?.checked ? (parseFloat(matriculaInput?.value) || 0) : 0;
    const certificadoAmount = certificadoCheck?.checked ? (parseFloat(certificadoInput?.value) || 0) : 0;
    const otroAmount = otroCheck?.checked ? (parseFloat(otroAmountInput?.value) || 0) : 0;
    const otroConcepto = otroConceptoInput?.value || 'Otro';

    // Calculate total
    const total = baseAmount + matriculaAmount + certificadoAmount + otroAmount;

    // Update hidden payAmount field
    const payAmountField = document.getElementById('payAmount');
    if (payAmountField) {
        payAmountField.value = total;
    }

    // Update summary display
    const lineItemsDiv = document.getElementById('paymentLineItems');
    const summaryTotalSpan = document.getElementById('summaryTotal');

    if (lineItemsDiv) {
        let html = `
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                <span>Mensualidad/Semestre:</span>
                <span>$${baseAmount.toLocaleString('es-CO')}</span>
            </div>
        `;

        if (matriculaAmount > 0) {
            html += `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #166534;">
                    <span>+ Matrícula:</span>
                    <span>$${matriculaAmount.toLocaleString('es-CO')}</span>
                </div>
            `;
        }

        if (certificadoAmount > 0) {
            html += `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #166534;">
                    <span>+ Certificado:</span>
                    <span>$${certificadoAmount.toLocaleString('es-CO')}</span>
                </div>
            `;
        }

        if (otroAmount > 0) {
            html += `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #166534;">
                    <span>+ ${otroConcepto}:</span>
                    <span>$${otroAmount.toLocaleString('es-CO')}</span>
                </div>
            `;
        }

        lineItemsDiv.innerHTML = html;
    }

    if (summaryTotalSpan) {
        summaryTotalSpan.textContent = `$${total.toLocaleString('es-CO')}`;
    }

    // Also update installment amounts if applicable
    updateInstallmentAmounts();
};

// Select academic semester months
window.selectAcademicSemester = function() {
    const selection = document.getElementById('academicSemesterSelect').value;
    if (!selection) return;

    const [year, semesterNum] = selection.split('-');
    const semesterKey = `semester${semesterNum}`;
    const semesterData = PaymentConfig.semesters[year]?.[semesterKey];

    if (semesterData) {
        // Clear all checkboxes first
        document.querySelectorAll('.month-checkbox').forEach(cb => cb.checked = false);

        // Select semester months
        semesterData.months.forEach(month => {
            const checkbox = document.querySelector(`.month-checkbox[data-month="${month}"][data-year="${year}"]`);
            if (checkbox) checkbox.checked = true;
        });

        updateMonthSelection();
    }
};

// Update installment amounts display
window.updateInstallmentAmounts = function() {
    const totalAmount = parseInt(document.getElementById('payAmount').value) || 0;
    const installments = parseInt(document.getElementById('installmentOption')?.value) || 1;
    const installmentDetails = document.getElementById('installmentDetails');
    const installmentBreakdown = document.getElementById('installmentBreakdown');
    const currentInstallmentGroup = document.getElementById('currentInstallmentGroup');
    
    if (installments > 1 && totalAmount > 0) {
        const amountPerInstallment = Math.round(totalAmount / installments);
        let breakdown = '';
        
        for (let i = 1; i <= installments; i++) {
            breakdown += `<div style="margin: 5px 0;">Cuota ${i}: $${amountPerInstallment.toLocaleString()}</div>`;
        }
        
        installmentBreakdown.innerHTML = breakdown;
        installmentDetails.style.display = 'block';
        currentInstallmentGroup.style.display = 'block';
        
        // Update current installment options
        const currentInstallmentSelect = document.getElementById('currentInstallment');
        currentInstallmentSelect.innerHTML = '';
        for (let i = 1; i <= installments; i++) {
            currentInstallmentSelect.innerHTML += `<option value="${i}">Cuota ${i} de ${installments}</option>`;
        }
    } else {
        installmentDetails.style.display = 'none';
        currentInstallmentGroup.style.display = 'none';
    }
};

// ==================================================================================
// SECTION 7: GLOBAL INSTANCES AND INITIALIZATION - Main entry points and setup
// ==================================================================================

// Global instances
window.PaymentManager = new PaymentManager();
window.InvoiceStorage = new InvoiceStorageManager();

// Global state for date range filter
window.activeDateRangeFilter = {
    startDate: null,
    endDate: null
};

window.loadPaymentsTab = async function() {
    console.log('💰 Loading payments tab');

    const container = document.getElementById('paymentsContainer');
    if (!container) {
        console.error('❌ Payments container not found');
        return;
    }

    // Validate required dependencies
    if (!window.PaymentManager) {
        console.error('❌ PaymentManager not available');
        container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">❌ Error: Sistema de pagos no disponible</div>';
        return;
    }

    if (!window.StudentManager) {
        console.error('❌ StudentManager not available');
        container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">❌ Error: Sistema de estudiantes no disponible</div>';
        return;
    }

    if (!window.InvoiceStorage) {
        console.error('❌ InvoiceStorage not available');
        container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">❌ Error: Sistema de comprobantes no disponible</div>';
        return;
    }

    try {
        // Initialize systems
        await window.StudentManager.init(); // Initialize StudentManager first!
        await window.PaymentManager.init();
        await window.InvoiceStorage.init();

        const students = window.StudentManager.getStudents();
        const summary = await window.PaymentManager.getPaymentSummary();

        if (!students || students.length === 0) {
            container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #6b7280;">No hay estudiantes registrados</div>';
            return;
        }

        container.innerHTML = `
            <div style="padding: 1rem;">
                <h2 style="margin-bottom: 1rem;">💰 Control de Pagos</h2>

                ${renderPaymentDashboard()}

                <div style="background: white; padding: 1rem; border-radius: 8px;">
                    <!-- Advanced Filters Section -->
                    <div style="background: #f9fafb; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h3 style="margin: 0;">🔍 Filtros Avanzados</h3>
                            <div style="display: flex; gap: 0.5rem;">
                                <button onclick="showBulkSemesterPaymentModal()" class="btn btn-sm" style="background: #8b5cf6; color: white; padding: 0.5rem 1rem;">
                                    📅 Pago Semestre Masivo
                                </button>
                                <button onclick="clearPaymentFilters()" class="btn btn-sm" style="background: #6b7280; color: white; padding: 0.5rem 1rem;">
                                    🔄 Limpiar Filtros
                                </button>
                                <button onclick="exportPaymentReport()" class="btn btn-sm" style="background: #10b981; color: white; padding: 0.5rem 1rem;">
                                    📊 Exportar
                                </button>
                            </div>
                        </div>

                        <!-- Filter Grid -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                            <!-- Search by Name -->
                            <div>
                                <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151;">
                                    👤 Buscar Estudiante
                                </label>
                                <input
                                    type="text"
                                    id="searchNameFilter"
                                    placeholder="Nombre del estudiante..."
                                    oninput="filterPayments()"
                                    style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;">
                            </div>

                            <!-- Status Filter -->
                            <div>
                                <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151;">
                                    📊 Estado de Pago
                                </label>
                                <select id="paymentFilter" onchange="filterPayments()" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;">
                                    <option value="">Todos los estados</option>
                                    <option value="paid">✅ Pagados</option>
                                    <option value="partial">⚠️ Parciales</option>
                                    <option value="upcoming">🟡 Próximos</option>
                                    <option value="overdue">🔴 Vencidos</option>
                                </select>
                            </div>

                            <!-- Payment Method Filter -->
                            <div>
                                <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151;">
                                    💳 Método de Pago
                                </label>
                                <select id="methodFilter" onchange="filterPayments()" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;">
                                    <option value="">Todos los métodos</option>
                                    <option value="Efectivo">💵 Efectivo</option>
                                    <option value="Transferencia">🏦 Transferencia</option>
                                    <option value="Nequi">📱 Nequi</option>
                                </select>
                            </div>

                            <!-- Bank Filter -->
                            <div>
                                <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151;">
                                    🏦 Banco
                                </label>
                                <select id="bankFilter" onchange="filterPayments()" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;">
                                    <option value="">Todos los bancos</option>
                                    <option value="Bancolombia">Bancolombia</option>
                                    <option value="Nequi">Nequi</option>
                                    <option value="Daviplata">Daviplata</option>
                                    <option value="Banco de Bogotá">Banco de Bogotá</option>
                                    <option value="Davivienda">Davivienda</option>
                                </select>
                            </div>

                            <!-- Modalidad Filter -->
                            <div>
                                <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151;">
                                    📚 Modalidad
                                </label>
                                <select id="modalidadFilter" onchange="filterPayments()" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;">
                                    <option value="">Todas las modalidades</option>
                                    <option value="Presencial">Presencial</option>
                                    <option value="Compañia">Compañía</option>
                                    <option value="Escuela">Escuela</option>
                                    <option value="Online">Online</option>
                                </select>
                            </div>

                            <!-- Month/Year Filter -->
                            <div>
                                <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151;">
                                    📅 Mes
                                </label>
                                <select id="monthFilter" onchange="filterPayments()" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;">
                                    <option value="">Todos los meses</option>
                                    <option value="enero">Enero</option>
                                    <option value="febrero">Febrero</option>
                                    <option value="marzo">Marzo</option>
                                    <option value="abril">Abril</option>
                                    <option value="mayo">Mayo</option>
                                    <option value="junio">Junio</option>
                                    <option value="julio">Julio</option>
                                    <option value="agosto">Agosto</option>
                                    <option value="septiembre">Septiembre</option>
                                    <option value="octubre">Octubre</option>
                                    <option value="noviembre">Noviembre</option>
                                    <option value="diciembre">Diciembre</option>
                                </select>
                            </div>

                            <!-- Year Filter -->
                            <div>
                                <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151;">
                                    📆 Año
                                </label>
                                <select id="yearFilter" onchange="filterPayments()" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;">
                                    <option value="" selected>Todos los años</option>
                                    <option value="2025">2025</option>
                                    <option value="2024">2024</option>
                                    <option value="2026">2026</option>
                                </select>
                            </div>
                        </div>

                        <!-- Results Counter -->
                        <div id="filterResults" style="margin-top: 1rem; padding: 0.5rem; background: white; border-radius: 6px; text-align: center; font-size: 0.875rem; color: #6b7280;">
                            Mostrando <strong id="filteredCount">${students.length}</strong> de <strong id="totalCount">${students.length}</strong> estudiantes
                        </div>
                    </div>

                    <div id="paymentTableContainer">
                        ${renderPaymentTable(students)}
                    </div>
                </div>
            </div>
        `;

        // Update dashboard
        document.getElementById('paidCount').textContent = summary.paid;
        document.getElementById('partialCount').textContent = summary.partial;
        document.getElementById('upcomingCount').textContent = summary.upcoming;
        document.getElementById('overdueCount').textContent = summary.overdue;
        document.getElementById('collectedAmount').textContent = `$${summary.collectedAmount.toLocaleString()}`;
    } catch (error) {
        console.error('❌ Error loading payments tab:', error);
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #ef4444;">
                <p>❌ Error al cargar el módulo de pagos</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem;">${error.message}</p>
            </div>
        `;
        if (window.showNotification) {
            window.showNotification('❌ Error al cargar módulo de pagos', 'error');
        }
    }
};

// FIX FOR MODAL POSITION
window.showPaymentModal = function(studentId) {
    const student = window.StudentManager.students.get(studentId);
    if (!student) return;
    
    window.currentStudentId = studentId; // Store for use in other functions
    
    // Remove any existing modal first
    const existingModal = document.getElementById('paymentModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.innerHTML = renderPaymentModal(student);
    
    // Try to append to payments container first, otherwise to body
    const paymentsContainer = document.getElementById('paymentsContainer');
    if (paymentsContainer) {
        paymentsContainer.appendChild(modal.firstElementChild);
    } else {
        document.body.appendChild(modal.firstElementChild);
    }
    
    document.getElementById('paymentForm').onsubmit = async (e) => {
        e.preventDefault();
        await processPayment(studentId);
    };
};

window.closePaymentModal = function() {
    document.getElementById('paymentModal')?.remove();
};

window.toggleBankOptions = function() {
    const method = document.getElementById('payMethod').value;
    const bankGroup = document.getElementById('bankGroup');
    bankGroup.style.display = method === 'Transferencia' ? 'block' : 'none';
};

window.sendPaymentReminder = async function(studentId) {
    const student = window.StudentManager.students.get(studentId);
    if (!student) return;
    
    const status = window.PaymentManager.getPaymentStatus(student);
    const message = `Hola ${student.nombre}, te recordamos que tu pago de $${(student.valor || 0).toLocaleString()} ${status.status}. 
    
Ciudad Bilingüe - English School
Métodos de pago: Nequi/Bancolombia o efectivo en la escuela.`;
    
    await window.PaymentManager.sendReminder(studentId, message);
    window.showNotification('📱 Recordatorio enviado', 'success');
};

window.filterPayments = function() {
    // Get all filter values
    const searchName = document.getElementById('searchNameFilter')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('paymentFilter')?.value || '';
    const methodFilter = document.getElementById('methodFilter')?.value || '';
    const bankFilter = document.getElementById('bankFilter')?.value || '';
    const modalidadFilter = document.getElementById('modalidadFilter')?.value || '';
    const monthFilter = document.getElementById('monthFilter')?.value || '';
    const yearFilter = document.getElementById('yearFilter')?.value || '';

    let students = window.StudentManager.getStudents();
    const totalCount = students.length;

    // Apply date range filter first if active
    if (window.activeDateRangeFilter.startDate && window.activeDateRangeFilter.endDate) {
        console.log('📅 Filtering by date range:', {
            startDate: window.activeDateRangeFilter.startDate,
            endDate: window.activeDateRangeFilter.endDate,
            totalStudents: students.length
        });

        const beforeFilter = students.length;

        // Create a Set to track students with payments in date range
        const studentsWithPayments = new Set();

        students.forEach(student => {
            // Check student.pagos (old student-level payment records)
            if (student.pagos) {
                const hasPaymentInRange = Object.values(student.pagos).some(payment => {
                    if (!payment.date) return false;
                    const paymentDate = payment.date.split('T')[0];
                    return paymentDate >= window.activeDateRangeFilter.startDate &&
                           paymentDate <= window.activeDateRangeFilter.endDate;
                });

                if (hasPaymentInRange) {
                    studentsWithPayments.add(student.id);
                }
            }

            // ALSO check global payments collection (used by Finance module)
            if (window.PaymentManager && window.PaymentManager.payments) {
                const globalPayments = Array.from(window.PaymentManager.payments.values());
                const hasGlobalPayment = globalPayments.some(payment => {
                    if (!payment.date || !payment.studentId) return false;
                    const paymentDate = payment.date.split('T')[0];
                    const inRange = paymentDate >= window.activeDateRangeFilter.startDate &&
                                   paymentDate <= window.activeDateRangeFilter.endDate;
                    return inRange && payment.studentId === student.id;
                });

                if (hasGlobalPayment) {
                    studentsWithPayments.add(student.id);
                    console.log('✅ Found payment in global collection:', {
                        student: student.nombre,
                        studentId: student.id
                    });
                }
            }
        });

        // Filter to only students with payments in range
        students = students.filter(student => studentsWithPayments.has(student.id));

        console.log(`📊 Date filter results: ${beforeFilter} → ${students.length} students`);
    }

    // Apply name search filter
    if (searchName) {
        students = students.filter(s => {
            const name = (s.nombre || '').toLowerCase();
            const phone = (s.telefono || '').toLowerCase();
            const doc = (s.documento || '').toLowerCase();
            return name.includes(searchName) || phone.includes(searchName) || doc.includes(searchName);
        });
    }

    // Apply modalidad filter
    if (modalidadFilter) {
        students = students.filter(s => s.modalidad === modalidadFilter);
    }

    // Apply status filter
    if (statusFilter) {
        students = students.filter(s => {
            const status = window.PaymentManager.getPaymentStatus(s);
            if (statusFilter === 'paid') return status.status === 'Pagado';
            if (statusFilter === 'partial') return status.partial === true;
            if (statusFilter === 'upcoming') return status.color === '#fbbf24' || status.color === '#f59e0b';
            if (statusFilter === 'overdue') return status.color === '#ef4444';
            return true;
        });
    }

    // Apply payment method/bank/month/year filters
    if (methodFilter || bankFilter || monthFilter || yearFilter) {
        students = students.filter(s => {
            // Get student's payments
            const studentPayments = Array.from(window.PaymentManager.payments.values()).filter(p => p.studentId === s.id);

            // If no payments at all, only show if no specific filters are active
            if (studentPayments.length === 0) {
                return !(methodFilter || bankFilter || monthFilter || yearFilter);
            }

            // Filter payments by year if specified
            let relevantPayments = studentPayments;
            if (yearFilter) {
                relevantPayments = relevantPayments.filter(p => p.year === parseInt(yearFilter));
            }

            // Filter payments by month if specified
            if (monthFilter) {
                relevantPayments = relevantPayments.filter(p => p.month?.toLowerCase() === monthFilter);
            }

            // Filter by method if specified
            if (methodFilter) {
                relevantPayments = relevantPayments.filter(p => p.method === methodFilter);
            }

            // Filter by bank if specified
            if (bankFilter) {
                relevantPayments = relevantPayments.filter(p => p.bank === bankFilter);
            }

            // Student passes filter if they have at least one payment matching all criteria
            return relevantPayments.length > 0;
        });
    }

    // Update results counter
    const filteredCount = students.length;
    const filteredCountEl = document.getElementById('filteredCount');
    const totalCountEl = document.getElementById('totalCount');
    if (filteredCountEl) filteredCountEl.textContent = filteredCount;
    if (totalCountEl) totalCountEl.textContent = totalCount;

    // Only recalculate summary when filters OTHER than date range are active
    // Date range filter already calculated the summary correctly in applyDateRangeFilter()
    const hasDateRangeFilter = window.activeDateRangeFilter.startDate && window.activeDateRangeFilter.endDate;
    const hasOtherFilters = monthFilter || yearFilter || statusFilter || methodFilter || bankFilter;

    if (hasOtherFilters && !hasDateRangeFilter) {
        // Only recalculate if using month/year filters without date range
        const filteredSummary = calculateFilteredSummary(students, monthFilter, yearFilter);
        updatePaymentSummaryDisplay(filteredSummary);
        console.log('📊 Updated summary from month/year filter:', filteredSummary);
    } else if (!hasDateRangeFilter && !hasOtherFilters) {
        // No filters at all - show all data
        window.PaymentManager.getPaymentSummary().then(summary => {
            updatePaymentSummaryDisplay(summary);
        });
    } else {
        // Date range is active - summary was already calculated correctly, DON'T overwrite it
        console.log('✅ Keeping date range summary (not recalculating)');
    }

    // Update table
    document.getElementById('paymentTableContainer').innerHTML = renderPaymentTable(students);

    // Show notification if heavily filtered
    if (filteredCount === 0 && totalCount > 0) {
        console.log('⚠️ No se encontraron resultados con los filtros actuales');
    }
};

// Calculate summary for filtered students (by month/year or date range)
function calculateFilteredSummary(students, monthFilter, yearFilter) {
    const summary = {
        paid: 0,
        partial: 0,
        upcoming: 0,
        overdue: 0,
        collectedAmount: 0
    };

    const hasDateRange = window.activeDateRangeFilter.startDate && window.activeDateRangeFilter.endDate;

    students.forEach(student => {
        if (!student.pagos) return;

        // Check if student has ANY payment matching the filter
        let hasMatchingPayment = false;
        let hasPaidPayment = false;
        let hasPartialPayment = false;
        let collectedFromStudent = 0;

        Object.values(student.pagos).forEach(payment => {
            let matchesFilter = false;

            // If date range is active, use that for filtering
            if (hasDateRange) {
                if (payment.date) {
                    const paymentDate = payment.date.split('T')[0];
                    matchesFilter = paymentDate >= window.activeDateRangeFilter.startDate &&
                                  paymentDate <= window.activeDateRangeFilter.endDate;
                }
            } else {
                // Otherwise use month/year filter
                matchesFilter = true;

                if (monthFilter && payment.month) {
                    matchesFilter = matchesFilter && payment.month.toLowerCase() === monthFilter.toLowerCase();
                }

                if (yearFilter && payment.year) {
                    matchesFilter = matchesFilter && payment.year.toString() === yearFilter.toString();
                }
            }

            if (matchesFilter) {
                hasMatchingPayment = true;

                // Track payment status
                if (payment.status === 'paid') {
                    hasPaidPayment = true;
                    collectedFromStudent += payment.amount || 0;
                } else if (payment.status === 'partial') {
                    hasPartialPayment = true;
                    collectedFromStudent += payment.amount || 0;
                }
            }
        });

        // Only count student if they have payments in the filtered period
        if (!hasMatchingPayment) return;

        summary.collectedAmount += collectedFromStudent;

        // Determine student's overall status for this period
        const status = window.PaymentManager.getPaymentStatus(student);

        // Count by status - but only if student has payment activity in the period
        if (status.partial || hasPartialPayment) {
            summary.partial++;
        } else if (status.status === 'Pagado' || hasPaidPayment) {
            summary.paid++;
        } else if (status.color === '#ef4444') {
            summary.overdue++;
        } else if (status.color === '#fbbf24' || status.color === '#f59e0b') {
            summary.upcoming++;
        }
    });

    return summary;
}

// Clear all filters
window.clearPaymentFilters = async function() {
    document.getElementById('searchNameFilter').value = '';
    document.getElementById('paymentFilter').value = '';
    document.getElementById('methodFilter').value = '';
    document.getElementById('bankFilter').value = '';
    document.getElementById('monthFilter').value = '';
    document.getElementById('yearFilter').value = ''; // All years by default

    // Reset summary boxes to show all data (unless date range filter is active)
    if (!window.activeDateRangeFilter.startDate) {
        const summary = await window.PaymentManager.getPaymentSummary();
        updatePaymentSummaryDisplay(summary);
    }

    filterPayments();
    window.showNotification('🔄 Filtros limpiados', 'success');
};

// Apply date range filter
window.applyDateRangeFilter = async function() {
    const startDate = document.getElementById('paymentStartDate')?.value;
    const endDate = document.getElementById('paymentEndDate')?.value;

    if (!startDate || !endDate) {
        window.showNotification('⚠️ Por favor seleccione ambas fechas', 'warning');
        return;
    }

    if (startDate > endDate) {
        window.showNotification('⚠️ La fecha de inicio debe ser anterior a la fecha final', 'warning');
        return;
    }

    try {
        // Store date range in global state
        window.activeDateRangeFilter.startDate = startDate;
        window.activeDateRangeFilter.endDate = endDate;

        // Update summary with date range
        const summary = await window.PaymentManager.getPaymentSummary(startDate, endDate);
        updatePaymentSummaryDisplay(summary);

        // Update the student table to show only students with payments in range
        filterPayments();

        // Update date range info display - FIX timezone issue
        const formatDateWithoutTimezone = (dateStr) => {
            const [year, month, day] = dateStr.split('-').map(Number);

            // Manual formatting to avoid timezone issues
            const monthNames = [
                'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
            ];

            return `${day} de ${monthNames[month - 1]} de ${year}`;
        };

        const startDateFormatted = formatDateWithoutTimezone(startDate);
        const endDateFormatted = formatDateWithoutTimezone(endDate);

        console.log('📅 Date formatting:', {
            startDate,
            startDateFormatted,
            endDate,
            endDateFormatted
        });

        const infoElement = document.getElementById('dateRangeInfo');
        if (infoElement) {
            infoElement.innerHTML = `✅ Mostrando: ${startDateFormatted} - ${endDateFormatted}`;
        }

        window.showNotification(`✅ Filtro aplicado: ${startDateFormatted} al ${endDateFormatted}`, 'success');
    } catch (error) {
        console.error('Error applying date range filter:', error);
        window.showNotification('❌ Error al aplicar filtro de fechas', 'error');
    }
};

// Clear date range filter
window.clearDateRangeFilter = async function() {
    document.getElementById('paymentStartDate').value = '';
    document.getElementById('paymentEndDate').value = '';

    // Clear global state
    window.activeDateRangeFilter.startDate = null;
    window.activeDateRangeFilter.endDate = null;

    const infoElement = document.getElementById('dateRangeInfo');
    if (infoElement) {
        infoElement.innerHTML = '';
    }

    try {
        // Update summary without date range (show all)
        const summary = await window.PaymentManager.getPaymentSummary();
        updatePaymentSummaryDisplay(summary);

        // Update the student table to show all students
        filterPayments();

        window.showNotification('🔄 Mostrando todos los pagos', 'success');
    } catch (error) {
        console.error('Error clearing date range filter:', error);
        window.showNotification('❌ Error al limpiar filtro', 'error');
    }
};

// Helper function to update summary display
function updatePaymentSummaryDisplay(summary) {
    console.log('🎨 Updating payment summary display with:', {
        paid: summary.paid,
        partial: summary.partial,
        upcoming: summary.upcoming,
        overdue: summary.overdue,
        collectedAmount: summary.collectedAmount,
        formatted: `$${summary.collectedAmount.toLocaleString('es-CO')}`
    });

    const paidEl = document.getElementById('paidCount');
    const partialEl = document.getElementById('partialCount');
    const upcomingEl = document.getElementById('upcomingCount');
    const overdueEl = document.getElementById('overdueCount');
    const collectedEl = document.getElementById('collectedAmount');

    console.log('🔍 DOM elements found:', {
        paidEl: !!paidEl,
        partialEl: !!partialEl,
        upcomingEl: !!upcomingEl,
        overdueEl: !!overdueEl,
        collectedEl: !!collectedEl
    });

    if (paidEl) paidEl.textContent = summary.paid;
    if (partialEl) partialEl.textContent = summary.partial;
    if (upcomingEl) upcomingEl.textContent = summary.upcoming;
    if (overdueEl) overdueEl.textContent = summary.overdue;
    if (collectedEl) collectedEl.textContent = `$${summary.collectedAmount.toLocaleString('es-CO')}`;

    console.log('✅ Display updated. Current values in DOM:', {
        paid: paidEl?.textContent,
        partial: partialEl?.textContent,
        upcoming: upcomingEl?.textContent,
        overdue: overdueEl?.textContent,
        collected: collectedEl?.textContent
    });
}

// Set date range preset
window.setDateRangePreset = function(preset) {
    console.log('🎯 setDateRangePreset called with preset:', preset);

    // Get today's date in Colombia timezone (YYYY-MM-DD)
    const todayStr = window.getTodayInColombia ? window.getTodayInColombia() : new Date().toISOString().split('T')[0];
    const [year, month, day] = todayStr.split('-').map(Number);

    // Create date object without timezone issues
    const today = new Date(year, month - 1, day);

    let startDate, endDate;

    switch (preset) {
        case 'today':
            startDate = endDate = today;
            break;

        case 'yesterday':
            startDate = endDate = new Date(year, month - 1, day - 1);
            break;

        case 'thisWeek':
            const dayOfWeek = today.getDay();
            const monday = new Date(year, month - 1, day);
            monday.setDate(day - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            startDate = monday;
            endDate = today;
            break;

        case 'thisMonth':
            startDate = new Date(year, month - 1, 1);
            endDate = today;
            break;

        case 'lastMonth':
            const lastMonthDate = new Date(year, month - 2, 1); // month - 2 because month is already 1-indexed
            startDate = lastMonthDate;
            endDate = new Date(year, month - 1, 0); // Last day of previous month
            break;

        case 'thisYear':
            startDate = new Date(year, 0, 1);
            endDate = today;
            break;

        case 'last30days':
            startDate = new Date(year, month - 1, day - 30);
            endDate = today;
            break;

        case 'last7days':
            startDate = new Date(year, month - 1, day - 7);
            endDate = today;
            break;

        default:
            return;
    }

    // Format dates as YYYY-MM-DD for input fields
    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    console.log(`📅 Date filter preset "${preset}":`, {
        todayInColombia: todayStr,
        calculatedStartDate: startDateStr,
        calculatedEndDate: endDateStr,
        startDateObject: startDate,
        endDateObject: endDate
    });

    document.getElementById('paymentStartDate').value = startDateStr;
    document.getElementById('paymentEndDate').value = endDateStr;

    // Automatically apply the filter
    applyDateRangeFilter();
};

// DIAGNOSTIC: Show all payment dates in the system
window.diagnosticPaymentDates = function() {
    const students = window.StudentManager.getStudents();
    const paymentDates = {};

    students.forEach(student => {
        if (student.pagos) {
            Object.values(student.pagos).forEach(payment => {
                if (!payment.date) {
                    console.warn('⚠️ Payment without date for student:', student.nombre, payment);
                    return;
                }
                const date = payment.date.split('T')[0];
                if (!paymentDates[date]) {
                    paymentDates[date] = { count: 0, students: [], totalAmount: 0 };
                }
                paymentDates[date].count++;
                paymentDates[date].students.push(student.nombre);
                paymentDates[date].totalAmount += payment.amount || 0;
            });
        }
    });

    // Sort by date
    const sortedDates = Object.keys(paymentDates).sort();

    console.log('📅 PAYMENT DATES IN SYSTEM:');
    console.log('================================');
    sortedDates.forEach(date => {
        const data = paymentDates[date];
        console.log(`📆 ${date}: ${data.count} payments, $${data.totalAmount.toLocaleString('es-CO')}`);
    });
    console.log('================================');
    console.log(`Total dates with payments: ${sortedDates.length}`);
    console.log('Recent dates (last 10):');
    console.table(
        sortedDates.slice(-10).map(date => ({
            Date: date,
            Payments: paymentDates[date].count,
            Total: `$${paymentDates[date].totalAmount.toLocaleString('es-CO')}`
        }))
    );

    return paymentDates;
};

window.exportPaymentReport = async function() {
    console.log('🔄 CSV Export v2.0 - Starting export...');
    try {
        window.showNotification('📊 Generando reporte...', 'info');

        // Get current filter
        const filter = document.getElementById('paymentFilter')?.value;
        let students = window.StudentManager.getStudents();

        console.log(`👥 Total students: ${students?.length || 0}`);

        // Apply filter
        if (filter) {
            students = students.filter(s => {
                const status = window.PaymentManager.getPaymentStatus(s);
                if (filter === 'paid') return status.status === 'Pagado';
                if (filter === 'partial') return status.partial === true;
                if (filter === 'upcoming') return status.color === '#fbbf24' || status.color === '#f59e0b';
                if (filter === 'overdue') return status.color === '#ef4444';
                return true;
            });
        }

        // Build CSV data
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().toLocaleDateString('es', { month: 'long' }).toLowerCase();
        const rows = [
            ['Nombre', 'Teléfono', 'Estado', 'Mes Actual', 'Método', 'Banco', 'Monto', 'Fecha Pago', 'No. Comprobante', 'Notas']
        ];

        console.log(`📊 Exporting ${students.length} students to CSV...`);

        for (const student of students) {
            const status = window.PaymentManager.getPaymentStatus(student);
            const payment = await window.PaymentManager.getStudentPayment(student.id, currentMonth, currentYear);

            rows.push([
                student.nombre || student.name || '',
                student.telefono || student.phone || '',
                status.status || '',
                currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1),
                payment?.method || 'N/A',
                payment?.bank || 'N/A',
                payment?.amount ? `Q${payment.amount.toFixed(2)}` : 'Q0.00',
                payment?.date ? new Date(payment.date).toLocaleDateString('es-GT') : 'N/A',
                payment?.invoiceNumber || 'N/A',
                payment?.notes || ''
            ]);
        }

        console.log(`✅ CSV data prepared: ${rows.length} rows (including header)`);

        // Convert to CSV string
        const csvContent = rows.map(row =>
            row.map(cell => {
                // Escape quotes and wrap in quotes if contains comma or quotes
                const cellStr = String(cell).replace(/"/g, '""');
                return cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')
                    ? `"${cellStr}"`
                    : cellStr;
            }).join(',')
        ).join('\n');

        // Create and download file
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().split('T')[0];
        const filterSuffix = filter ? `_${filter}` : '';
        const filename = `reporte_pagos_${timestamp}${filterSuffix}.csv`;

        console.log(`💾 Creating download link: ${filename}`);
        console.log(`📦 Blob size: ${blob.size} bytes`);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);

        console.log(`✅ Download triggered for ${filename}`);
        window.showNotification(`✅ Reporte exportado (${students.length} estudiantes)`, 'success');
    } catch (error) {
        console.error('❌ Error exporting report:', error);
        console.error('Error details:', error.message, error.stack);
        window.showNotification('❌ Error al exportar reporte', 'error');
    }
};

// ==================================================================================
// SECTION 8: PAYMENT PROCESSING - Core payment workflow with invoice generation
// ==================================================================================

// Enhanced processPayment function with FIXED timing for invoice modal
// Enhanced processPayment function for multi-month payments
async function processPayment(studentId) {
    try {
        window.currentStudentId = studentId; // Store for reference

        // Validate required dependencies
        if (!window.StudentManager) {
            window.showNotification('❌ Error: StudentManager no está disponible', 'error');
            return;
        }

        if (!window.PaymentManager) {
            window.showNotification('❌ Error: PaymentManager no está disponible', 'error');
            return;
        }

        // Get student to check payment type
        const student = window.StudentManager.students.get(studentId);
        const isHourlyPayment = student?.tipoPago === 'POR_HORAS';

        // Get payment type (skip for hourly students)
        let paymentType = 'hourly';
        let selectedMonths = [];

        if (!isHourlyPayment) {
            paymentType = document.getElementById('paymentType')?.value;
            if (!paymentType) {
                window.showNotification('❌ Por favor seleccione un tipo de pago', 'error');
                return;
            }

            // Validate selected months
            selectedMonths = Array.from(document.querySelectorAll('.month-checkbox:checked'))
                .map(cb => ({
                    month: cb.dataset.month,
                    year: parseInt(cb.dataset.year),
                    monthIndex: parseInt(cb.dataset.monthIndex)
                }));

            if (selectedMonths.length === 0) {
                window.showNotification('❌ Por favor seleccione al menos un mes', 'error');
                return;
            }
        } else {
            // For hourly payments, use current month
            const now = new Date();
            const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                              'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
            selectedMonths = [{
                month: monthNames[now.getMonth()],
                year: now.getFullYear(),
                monthIndex: now.getMonth()
            }];
        }

        // Validate payment amount
        const amountInput = document.getElementById('payAmount');
        if (!amountInput) {
            window.showNotification('❌ Error: Campo de monto no encontrado', 'error');
            return;
        }

        const amountValue = amountInput.value?.trim();
        if (!amountValue) {
            window.showNotification('❌ Por favor ingrese un monto', 'error');
            return;
        }

        const totalAmount = parseFloat(amountValue);
        if (isNaN(totalAmount)) {
            window.showNotification('❌ El monto debe ser un número válido', 'error');
            return;
        }

        if (totalAmount <= 0) {
            window.showNotification('❌ El monto debe ser mayor a cero', 'error');
            return;
        }

        if (totalAmount > 50000000) {
            window.showNotification('❌ El monto es demasiado alto (máximo $50.000.000)', 'error');
            return;
        }

        // Validate payment method
        const paymentMethod = document.getElementById('payMethod')?.value;
        if (!paymentMethod) {
            window.showNotification('❌ Por favor seleccione un método de pago', 'error');
            return;
        }

        const installmentOption = parseInt(document.getElementById('installmentOption')?.value) || 1;
        const currentInstallment = parseInt(document.getElementById('currentInstallment')?.value) || 1;
        
        // Get semester info if academic semester
        let paymentPeriod = '';
        if (paymentType === 'academicSemester' || paymentType === 'twoSemesters') {
            const selection = document.getElementById('academicSemesterSelect').value;
            if (selection) {
                const [year, semesterNum] = selection.split('-');
                paymentPeriod = `Semestre ${semesterNum} ${year}`;
            }
        } else if (selectedMonths.length > 1) {
            // For regular multi-month payments
            const firstMonth = selectedMonths[0];
            const lastMonth = selectedMonths[selectedMonths.length - 1];
            paymentPeriod = `${firstMonth.month} ${firstMonth.year} - ${lastMonth.month} ${lastMonth.year}`;
        }
        
        // Get additional items data
        const includeMatricula = document.getElementById('includeMatricula')?.checked || false;
        const matriculaAmount = includeMatricula ? (parseFloat(document.getElementById('matriculaAmount')?.value) || 0) : 0;

        const includeCertificado = document.getElementById('includeCertificado')?.checked || false;
        const certificadoAmount = includeCertificado ? (parseFloat(document.getElementById('certificadoAmount')?.value) || 0) : 0;

        const includeOtro = document.getElementById('includeOtro')?.checked || false;
        const otroConcepto = document.getElementById('otroConcepto')?.value || 'Otro';
        const otroAmount = includeOtro ? (parseFloat(document.getElementById('otroAmount')?.value) || 0) : 0;

        // Get base amount (without additional items)
        // IMPORTANT: Allow 0 as a valid value (for payments that are only Matrícula/Certificado)
        const payAmountBaseField = document.getElementById('payAmountBase');
        const baseAmount = payAmountBaseField
            ? (parseFloat(payAmountBaseField.value) || 0)  // Allow 0 as valid
            : totalAmount; // Only use totalAmount as fallback if field doesn't exist

        // Build line items array
        const lineItems = [];

        // Only add base payment if amount > 0
        if (baseAmount > 0) {
            lineItems.push({
                concept: 'Mensualidad/Semestre',
                amount: baseAmount
            });
        }

        // Add additional items if included
        if (matriculaAmount > 0) {
            lineItems.push({
                concept: 'Matrícula',
                amount: matriculaAmount
            });
        }

        if (certificadoAmount > 0) {
            lineItems.push({
                concept: 'Certificado',
                amount: certificadoAmount
            });
        }

        if (otroAmount > 0) {
            lineItems.push({
                concept: otroConcepto,
                amount: otroAmount
            });
        }

        const paymentData = {
            selectedMonths: selectedMonths,
            totalAmount: totalAmount,
            baseAmount: baseAmount,
            method: paymentMethod,
            bank: paymentMethod === 'Transferencia' ? (document.getElementById('payBank')?.value || '') : '',
            notes: document.getElementById('payNotes')?.value || '',
            paymentType: paymentType,
            paymentPeriod: paymentPeriod,
            installment: installmentOption > 1 ? `${currentInstallment}/${installmentOption}` : '1/1',
            totalInstallments: installmentOption,
            // Additional items
            lineItems: lineItems,
            matriculaAmount: matriculaAmount,
            certificadoAmount: certificadoAmount,
            otroConcepto: otroConcepto,
            otroAmount: otroAmount
        };

        // Add hourly payment data if applicable
        if (isHourlyPayment) {
            paymentData.hourlyRate = parseFloat(document.getElementById('hourlyRate')?.value) || 0;
            paymentData.hoursCount = parseFloat(document.getElementById('hoursCount')?.value) || 0;
            paymentData.notes = `${paymentData.hoursCount} horas x $${paymentData.hourlyRate.toLocaleString('es-CO')} ${paymentData.notes ? '| ' + paymentData.notes : ''}`;
        }
        
        // Record payment(s)
        let result;
        // student already declared at line 3581, no need to redeclare
        
        if (selectedMonths.length === 1 && paymentType === 'monthly') {
            // Single month payment (existing logic)
            const singlePaymentData = {
                amount: totalAmount,
                baseAmount: paymentData.baseAmount,
                method: paymentData.method,
                bank: paymentData.bank,
                month: selectedMonths[0].month,
                year: selectedMonths[0].year,
                notes: paymentData.notes,
                // Additional items
                lineItems: paymentData.lineItems,
                matriculaAmount: paymentData.matriculaAmount,
                certificadoAmount: paymentData.certificadoAmount,
                otroConcepto: paymentData.otroConcepto,
                otroAmount: paymentData.otroAmount
            };
            const payment = await window.PaymentManager.recordPayment(studentId, singlePaymentData);
            const invoiceData = await InvoiceGenerator.generateInvoice(payment, student);
            result = { invoiceData };
        } else {
            // Multi-month payment
            result = await window.PaymentManager.recordMultiMonthPayment(studentId, paymentData);
            
            // Generate consolidated invoice for multi-month payment
            const invoiceData = await InvoiceGenerator.generateMultiMonthInvoice(result, student);
            result.invoiceData = invoiceData;
        }
        
        // Show success notification
        window.showNotification('✅ Pago registrado exitosamente', 'success');
        
        // Close payment modal
        closePaymentModal();
        
        // Show invoice modal
        setTimeout(() => {
            InvoiceGenerator.showInvoiceModal(result.invoiceData);
        }, 300);
        
        // Reload payments tab
        setTimeout(() => {
            loadPaymentsTab();
        }, 500);
        
    } catch (error) {
        console.error('❌ Error processing payment:', error);
        window.showNotification('❌ Error al registrar pago', 'error');
    }
}

// ==================================================================================
// SECTION 8.5: BULK SEMESTER PAYMENT - Mass payment registration for all students
// ==================================================================================

window.showBulkSemesterPaymentModal = async function() {
    console.log('📅 Opening bulk semester payment modal');

    // Get all active students
    await window.StudentManager.init();
    const allStudents = window.StudentManager.getStudents();
    const activeStudents = allStudents.filter(s => s.estado === 'Activo' || s.estado === 'activo');

    if (activeStudents.length === 0) {
        window.showNotification('No hay estudiantes activos', 'error');
        return;
    }

    const modalHTML = `
        <div id="bulkPaymentModal" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 900px; width: 95%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0;">📅 Pago Semestre Masivo - Semestre 1 2026</h3>
                    <button onclick="closeBulkPaymentModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>

                <div style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
                    <p style="margin: 0; color: #0369a1;">
                        <strong>ℹ️ Instrucciones:</strong> Selecciona los estudiantes y asigna el valor del semestre para cada uno.
                        El valor puede variar según promociones o descuentos especiales.
                    </p>
                </div>

                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="selectAllStudents" onchange="toggleAllStudentsBulk()">
                            <strong>Seleccionar Todos</strong>
                        </label>
                        <span style="color: #6b7280;">|</span>
                        <span id="selectedCountBulk">0 estudiantes seleccionados</span>
                        <span style="color: #6b7280;">|</span>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            Valor por defecto: $
                            <input type="number" id="defaultBulkAmount" value="0" min="0"
                                   style="width: 120px; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;"
                                   onchange="applyDefaultAmountToSelected()">
                        </label>
                        <button onclick="applyDefaultAmountToSelected()" class="btn btn-sm" style="background: #3b82f6; color: white; padding: 0.5rem 1rem;">
                            Aplicar a Seleccionados
                        </button>
                    </div>
                </div>

                <div style="margin-bottom: 1rem;">
                    <label style="font-weight: 500;">Método de Pago:</label>
                    <select id="bulkPaymentMethod" style="margin-left: 0.5rem; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
                        <option value="Transferencia">Transferencia</option>
                        <option value="Efectivo">Efectivo</option>
                    </select>
                    <select id="bulkPaymentBank" style="margin-left: 0.5rem; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
                        <option value="Nequi">Nequi</option>
                        <option value="Bancolombia">Bancolombia</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>

                <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f3f4f6; position: sticky; top: 0;">
                            <tr>
                                <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #e5e7eb;">✓</th>
                                <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #e5e7eb;">Estudiante</th>
                                <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #e5e7eb;">Modalidad</th>
                                <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #e5e7eb;">Valor Mensual</th>
                                <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #e5e7eb;">Valor Semestre</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activeStudents.map(s => `
                                <tr style="border-bottom: 1px solid #e5e7eb;">
                                    <td style="padding: 0.75rem;">
                                        <input type="checkbox" class="bulk-student-checkbox" data-student-id="${s.id}" onchange="updateBulkSelectedCount()">
                                    </td>
                                    <td style="padding: 0.75rem; font-weight: 500;">${s.nombre}</td>
                                    <td style="padding: 0.75rem; color: #6b7280;">${s.modalidad || 'Regular'}</td>
                                    <td style="padding: 0.75rem; color: #6b7280;">$${(s.valor || 0).toLocaleString()}</td>
                                    <td style="padding: 0.75rem;">
                                        <input type="number"
                                               class="bulk-amount-input"
                                               data-student-id="${s.id}"
                                               value="0"
                                               min="0"
                                               style="width: 120px; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
                    <div>
                        <strong>Total a Registrar: </strong>
                        <span id="bulkTotalAmount" style="font-size: 1.25rem; color: #059669;">$0</span>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button onclick="closeBulkPaymentModal()" class="btn btn-secondary" style="padding: 0.75rem 1.5rem;">
                            Cancelar
                        </button>
                        <button onclick="processBulkSemesterPayments()" class="btn btn-primary" style="padding: 0.75rem 1.5rem; background: #8b5cf6;">
                            ✅ Registrar Pagos Seleccionados
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('bulkPaymentModal');
    if (existingModal) existingModal.remove();

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.closeBulkPaymentModal = function() {
    const modal = document.getElementById('bulkPaymentModal');
    if (modal) modal.remove();
};

// ==================================================================================
// SECTION 8.6: DELETE PAYMENT - Admin function to delete payments
// ==================================================================================

window.confirmDeletePayment = async function(paymentId, studentId) {
    // Get payment details for confirmation message
    const payment = window.PaymentManager.payments.get(paymentId);
    if (!payment) {
        window.showNotification('❌ Pago no encontrado', 'error');
        return;
    }

    const student = window.StudentManager?.students.get(studentId);
    const studentName = student?.nombre || 'Estudiante';
    const amount = payment.amount?.toLocaleString() || '0';
    const month = payment.month || '';
    const year = payment.year || '';

    // Create confirmation modal
    const existingModal = document.getElementById('deletePaymentModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', `
        <div id="deletePaymentModal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        ">
            <div style="
                background: white;
                border-radius: 12px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
            ">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <h3 style="margin: 0 0 8px 0; color: #1f2937;">¿Eliminar este pago?</h3>
                    <p style="color: #6b7280; margin: 0;">Esta acción no se puede deshacer</p>
                </div>

                <div style="
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 20px;
                ">
                    <div style="font-weight: 600; color: #991b1b; margin-bottom: 8px;">
                        ${studentName}
                    </div>
                    <div style="color: #7f1d1d; font-size: 14px;">
                        <div><strong>Monto:</strong> $${amount}</div>
                        <div><strong>Mes:</strong> ${month.charAt(0).toUpperCase() + month.slice(1)} ${year}</div>
                        <div><strong>ID:</strong> ${paymentId}</div>
                    </div>
                </div>

                <div style="display: flex; gap: 12px;">
                    <button onclick="closeDeletePaymentModal()" style="
                        flex: 1;
                        padding: 12px;
                        border: 1px solid #d1d5db;
                        background: white;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        color: #374151;
                    ">
                        Cancelar
                    </button>
                    <button onclick="executeDeletePayment('${paymentId}', '${studentId}')" style="
                        flex: 1;
                        padding: 12px;
                        border: none;
                        background: #ef4444;
                        color: white;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                    ">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        </div>
    `);
};

window.closeDeletePaymentModal = function() {
    const modal = document.getElementById('deletePaymentModal');
    if (modal) modal.remove();
};

window.executeDeletePayment = async function(paymentId, studentId) {
    try {
        closeDeletePaymentModal();
        window.showNotification('🗑️ Eliminando pago...', 'info');

        await window.PaymentManager.deletePayment(paymentId);

        window.showNotification('✅ Pago eliminado correctamente', 'success');

        // Refresh the payment history for this student
        const historyRow = document.querySelector(`#history-${studentId}`);
        if (historyRow && historyRow.style.display !== 'none') {
            // Get current year from the select if available
            const yearSelect = historyRow.querySelector('select');
            const currentYear = yearSelect ? parseInt(yearSelect.value) : new Date().getFullYear();

            // Reload history
            const history = await window.PaymentManager.getStudentPaymentHistory(studentId, currentYear);
            const stats = window.PaymentManager.calculatePaymentStats(history);

            historyRow.innerHTML = `
                <td colspan="8" style="padding: 0; background: #f9fafb;">
                    ${renderPaymentHistoryContent(studentId, history, stats, currentYear)}
                </td>
            `;
        }

    } catch (error) {
        console.error('Error deleting payment:', error);
        window.showNotification('❌ Error al eliminar pago: ' + error.message, 'error');
    }
};

// ==================== EDIT PAYMENT FUNCTIONS (Admin Only) ====================

window.openEditPaymentModal = async function(paymentId, studentId) {
    // Verify admin access
    if (window.FirebaseData?.currentUser?.email !== 'admin@ciudadbilingue.com') {
        window.showNotification('❌ Solo el administrador puede editar pagos', 'error');
        return;
    }

    // Get payment details
    const payment = window.PaymentManager.payments.get(paymentId);
    if (!payment) {
        window.showNotification('❌ Pago no encontrado', 'error');
        return;
    }

    const student = window.StudentManager?.students.get(studentId);
    const studentName = student?.nombre || 'Estudiante';

    // Remove existing modal if any
    const existingModal = document.getElementById('editPaymentModal');
    if (existingModal) existingModal.remove();

    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    document.body.insertAdjacentHTML('beforeend', `
        <div id="editPaymentModal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        ">
            <div style="
                background: white;
                border-radius: 12px;
                padding: 24px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
            ">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">✏️</div>
                    <h3 style="margin: 0 0 8px 0; color: #1f2937;">Editar Pago</h3>
                    <p style="color: #6b7280; margin: 0;">${studentName}</p>
                </div>

                <form id="editPaymentForm" style="display: flex; flex-direction: column; gap: 16px;">
                    <input type="hidden" id="editPaymentId" value="${paymentId}">
                    <input type="hidden" id="editStudentId" value="${studentId}">

                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #374151;">
                            Monto ($)
                        </label>
                        <input type="number" id="editPaymentAmount" value="${payment.amount || 0}"
                            style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;"
                            required min="1">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #374151;">
                                Mes
                            </label>
                            <select id="editPaymentMonth" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;">
                                ${months.map(m => `<option value="${m}" ${payment.month === m ? 'selected' : ''}>${m.charAt(0).toUpperCase() + m.slice(1)}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #374151;">
                                Año
                            </label>
                            <select id="editPaymentYear" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;">
                                <option value="2024" ${payment.year == 2024 ? 'selected' : ''}>2024</option>
                                <option value="2025" ${payment.year == 2025 ? 'selected' : ''}>2025</option>
                                <option value="2026" ${payment.year == 2026 ? 'selected' : ''}>2026</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #374151;">
                            Método de Pago
                        </label>
                        <select id="editPaymentMethod" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;">
                            <option value="Efectivo en la escuela" ${payment.method === 'Efectivo en la escuela' ? 'selected' : ''}>Efectivo en la escuela</option>
                            <option value="Transferencia bancaria" ${payment.method === 'Transferencia bancaria' ? 'selected' : ''}>Transferencia bancaria</option>
                            <option value="Nequi" ${payment.method === 'Nequi' ? 'selected' : ''}>Nequi</option>
                            <option value="Daviplata" ${payment.method === 'Daviplata' ? 'selected' : ''}>Daviplata</option>
                            <option value="Tarjeta de crédito" ${payment.method === 'Tarjeta de crédito' ? 'selected' : ''}>Tarjeta de crédito</option>
                            <option value="Tarjeta débito" ${payment.method === 'Tarjeta débito' ? 'selected' : ''}>Tarjeta débito</option>
                            <option value="Consignación" ${payment.method === 'Consignación' ? 'selected' : ''}>Consignación</option>
                        </select>
                    </div>

                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #374151;">
                            Banco (opcional)
                        </label>
                        <input type="text" id="editPaymentBank" value="${payment.bank || ''}"
                            style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;"
                            placeholder="Ej: Bancolombia, Davivienda...">
                    </div>

                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #374151;">
                            Notas (opcional)
                        </label>
                        <textarea id="editPaymentNotes" rows="2"
                            style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; resize: vertical;"
                            placeholder="Notas adicionales...">${payment.notes || ''}</textarea>
                    </div>

                    <div style="
                        background: #fef3c7;
                        border: 1px solid #fcd34d;
                        border-radius: 8px;
                        padding: 12px;
                        font-size: 13px;
                        color: #92400e;
                    ">
                        <strong>⚠️ Importante:</strong> Los cambios quedarán registrados en el log de auditoría.
                    </div>

                    <div style="display: flex; gap: 12px; margin-top: 8px;">
                        <button type="button" onclick="closeEditPaymentModal()" style="
                            flex: 1;
                            padding: 12px;
                            border: 1px solid #d1d5db;
                            background: white;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 500;
                            color: #374151;
                        ">
                            Cancelar
                        </button>
                        <button type="submit" style="
                            flex: 1;
                            padding: 12px;
                            border: none;
                            background: #f59e0b;
                            color: white;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 500;
                        ">
                            ✅ Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `);

    // Add form submit handler
    document.getElementById('editPaymentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveEditedPayment();
    });
};

window.closeEditPaymentModal = function() {
    const modal = document.getElementById('editPaymentModal');
    if (modal) modal.remove();
};

window.saveEditedPayment = async function() {
    try {
        // Verify admin access
        if (window.FirebaseData?.currentUser?.email !== 'admin@ciudadbilingue.com') {
            window.showNotification('❌ Solo el administrador puede editar pagos', 'error');
            return;
        }

        const paymentId = document.getElementById('editPaymentId').value;
        const studentId = document.getElementById('editStudentId').value;
        const newAmount = parseFloat(document.getElementById('editPaymentAmount').value);
        const newMonth = document.getElementById('editPaymentMonth').value;
        const newYear = parseInt(document.getElementById('editPaymentYear').value);
        const newMethod = document.getElementById('editPaymentMethod').value;
        const newBank = document.getElementById('editPaymentBank').value.trim();
        const newNotes = document.getElementById('editPaymentNotes').value.trim();

        // Validation
        if (!newAmount || newAmount <= 0) {
            window.showNotification('❌ El monto debe ser mayor a cero', 'error');
            return;
        }

        if (newAmount > 50000000) {
            window.showNotification('❌ El monto es demasiado alto (máximo $50.000.000)', 'error');
            return;
        }

        // Get original payment for audit
        const originalPayment = window.PaymentManager.payments.get(paymentId);
        if (!originalPayment) {
            window.showNotification('❌ Pago no encontrado', 'error');
            return;
        }

        closeEditPaymentModal();
        window.showNotification('💾 Guardando cambios...', 'info');

        // Prepare updated payment data
        const updatedPayment = {
            ...originalPayment,
            amount: newAmount,
            month: newMonth,
            year: newYear,
            method: newMethod,
            bank: newBank,
            notes: newNotes,
            lastEditedBy: window.FirebaseData.currentUser?.email,
            lastEditedAt: window.getColombiaDateTime ? window.getColombiaDateTime() : new Date().toISOString()
        };

        // Update in Firebase
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `payments/${paymentId}`);
        await db.set(ref, updatedPayment);

        // Update local cache
        window.PaymentManager.payments.set(paymentId, updatedPayment);

        // Audit log
        if (typeof window.logAudit === 'function') {
            const student = window.StudentManager?.students.get(studentId);
            const studentName = student?.nombre || 'Estudiante desconocido';
            await window.logAudit(
                'Pago editado',
                'payment',
                paymentId,
                `${studentName} - Pago modificado`,
                {
                    before: {
                        monto: originalPayment.amount,
                        mes: originalPayment.month,
                        año: originalPayment.year,
                        metodo: originalPayment.method,
                        banco: originalPayment.bank,
                        notas: originalPayment.notes
                    },
                    after: {
                        monto: newAmount,
                        mes: newMonth,
                        año: newYear,
                        metodo: newMethod,
                        banco: newBank,
                        notas: newNotes
                    }
                }
            );
        }

        window.showNotification('✅ Pago actualizado correctamente', 'success');

        // Refresh the payment history for this student
        const historyRow = document.querySelector(`#history-${studentId}`);
        if (historyRow && historyRow.style.display !== 'none') {
            const yearSelect = historyRow.querySelector('select');
            const currentYear = yearSelect ? parseInt(yearSelect.value) : new Date().getFullYear();

            const history = await window.PaymentManager.getStudentPaymentHistory(studentId, currentYear);
            const stats = window.PaymentManager.calculatePaymentStats(history);

            historyRow.innerHTML = `
                <td colspan="8" style="padding: 0; background: #f9fafb;">
                    ${renderPaymentHistoryContent(studentId, history, stats, currentYear)}
                </td>
            `;
        }

    } catch (error) {
        console.error('Error editing payment:', error);
        window.showNotification('❌ Error al editar pago: ' + error.message, 'error');
    }
};

// ==================== END EDIT PAYMENT FUNCTIONS ====================

// ==================== VOIDED INVOICES WINDOW FUNCTIONS ====================

// Show voided invoices modal (for audit)
window.showVoidedInvoices = function() {
    InvoiceGenerator.showVoidedInvoicesModal();
};

// Void an invoice (admin only)
window.voidInvoice = async function(invoiceNumber, reason, replacementInvoice = null) {
    if (window.FirebaseData?.currentUser?.email !== 'admin@ciudadbilingue.com') {
        window.showNotification('❌ Solo el administrador puede anular facturas', 'error');
        return;
    }

    try {
        await InvoiceGenerator.voidInvoice(invoiceNumber, reason, replacementInvoice);
        window.showNotification(`✅ Factura ${invoiceNumber} anulada correctamente`, 'success');
    } catch (error) {
        window.showNotification(`❌ Error: ${error.message}`, 'error');
    }
};

// Delete a payment and its associated invoice (admin only)
window.deletePaymentWithInvoice = async function(paymentId, studentId, voidInvoice = true) {
    if (window.FirebaseData?.currentUser?.email !== 'admin@ciudadbilingue.com') {
        window.showNotification('❌ Solo el administrador puede eliminar pagos', 'error');
        return;
    }

    try {
        const payment = window.PaymentManager.payments.get(paymentId);
        if (!payment) {
            throw new Error('Pago no encontrado');
        }

        // If payment has an invoice, void it first
        if (voidInvoice && payment.invoiceNumber) {
            await InvoiceGenerator.voidInvoice(
                payment.invoiceNumber,
                'Pago eliminado - duplicado o error',
                null
            );
        }

        // Delete the payment
        await window.PaymentManager.deletePayment(paymentId);

        window.showNotification('✅ Pago eliminado y factura anulada', 'success');

        // Refresh if viewing student payments
        if (typeof loadPaymentsTab === 'function') {
            loadPaymentsTab();
        }

    } catch (error) {
        console.error('Error deleting payment:', error);
        window.showNotification(`❌ Error: ${error.message}`, 'error');
    }
};

// ==================== END VOIDED INVOICES FUNCTIONS ====================

window.toggleAllStudentsBulk = function() {
    const selectAll = document.getElementById('selectAllStudents');
    const checkboxes = document.querySelectorAll('.bulk-student-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateBulkSelectedCount();
};

window.updateBulkSelectedCount = function() {
    const checkboxes = document.querySelectorAll('.bulk-student-checkbox:checked');
    document.getElementById('selectedCountBulk').textContent = `${checkboxes.length} estudiantes seleccionados`;

    // Update total
    let total = 0;
    checkboxes.forEach(cb => {
        const studentId = cb.dataset.studentId;
        const amountInput = document.querySelector(`.bulk-amount-input[data-student-id="${studentId}"]`);
        if (amountInput) {
            total += parseFloat(amountInput.value) || 0;
        }
    });
    document.getElementById('bulkTotalAmount').textContent = `$${total.toLocaleString()}`;
};

window.applyDefaultAmountToSelected = function() {
    const defaultAmount = parseFloat(document.getElementById('defaultBulkAmount').value) || 0;
    const checkboxes = document.querySelectorAll('.bulk-student-checkbox:checked');

    checkboxes.forEach(cb => {
        const studentId = cb.dataset.studentId;
        const amountInput = document.querySelector(`.bulk-amount-input[data-student-id="${studentId}"]`);
        if (amountInput) {
            amountInput.value = defaultAmount;
        }
    });

    updateBulkSelectedCount();
    window.showNotification(`Valor $${defaultAmount.toLocaleString()} aplicado a ${checkboxes.length} estudiantes`, 'success');
};

window.processBulkSemesterPayments = async function() {
    const checkboxes = document.querySelectorAll('.bulk-student-checkbox:checked');

    if (checkboxes.length === 0) {
        window.showNotification('Selecciona al menos un estudiante', 'error');
        return;
    }

    const method = document.getElementById('bulkPaymentMethod').value;
    const bank = document.getElementById('bulkPaymentBank').value;

    // Collect payments to process
    const paymentsToProcess = [];
    checkboxes.forEach(cb => {
        const studentId = cb.dataset.studentId;
        const amountInput = document.querySelector(`.bulk-amount-input[data-student-id="${studentId}"]`);
        const amount = parseFloat(amountInput?.value) || 0;

        if (amount > 0) {
            paymentsToProcess.push({ studentId, amount });
        }
    });

    if (paymentsToProcess.length === 0) {
        window.showNotification('Ingresa el valor del semestre para al menos un estudiante', 'error');
        return;
    }

    // Confirm
    const totalAmount = paymentsToProcess.reduce((sum, p) => sum + p.amount, 0);
    if (!confirm(`¿Registrar ${paymentsToProcess.length} pagos por un total de $${totalAmount.toLocaleString()}?`)) {
        return;
    }

    // Process each payment
    let successCount = 0;
    let errorCount = 0;

    // Semester 1 2026 months
    const semester1Months = ['febrero', 'marzo', 'abril', 'mayo', 'junio'];

    for (const payment of paymentsToProcess) {
        try {
            const student = window.StudentManager.getStudentById(payment.studentId);
            if (!student) {
                errorCount++;
                continue;
            }

            // Create payment record
            const paymentData = {
                fecha: window.getLocalDate ? window.getLocalDate() : new Date().toISOString().split('T')[0],
                monto: payment.amount,
                metodo: method,
                banco: method === 'Transferencia' ? bank : null,
                meses: semester1Months,
                año: 2026,
                semestre: 'Semestre 1 2026',
                tipoPago: 'semester',
                notas: 'Pago Semestre 1 2026 - Registro masivo'
            };

            await window.PaymentManager.addPayment(payment.studentId, paymentData);
            successCount++;

        } catch (error) {
            console.error(`Error processing payment for ${payment.studentId}:`, error);
            errorCount++;
        }
    }

    // Close modal and refresh
    closeBulkPaymentModal();

    // Show result
    if (errorCount === 0) {
        window.showNotification(`✅ ${successCount} pagos registrados exitosamente`, 'success');
    } else {
        window.showNotification(`⚠️ ${successCount} pagos registrados, ${errorCount} errores`, 'warning');
    }

    // Reload payments tab
    setTimeout(() => {
        loadPaymentsTab();
    }, 500);
};

// ==================================================================================
// SECTION 9: STYLES AND UTILITIES - CSS styles and backward compatibility
// ==================================================================================

console.log('✅ Payments module loaded successfully');

// Add print styles for invoices - UPDATED FOR HALF-LETTER SIZE
if (!document.getElementById('invoicePrintStyles')) {
    const style = document.createElement('style');
    style.id = 'invoicePrintStyles';
    style.textContent = `
        @media print {
            body * {
                visibility: hidden;
            }
            .invoice-print, .invoice-print * {
                visibility: visible;
            }
            .invoice-print {
                position: absolute;
                left: 0;
                top: 0;
                width: 5.5in !important;
                max-width: 5.5in !important;
            }
            .no-print {
                display: none !important;
            }
            @page {
                size: 5.5in 8.5in;
                margin: 0.25in;
            }
        }
        
        /* Payment history styles */
        .payment-history-row {
            transition: all 0.3s ease-in-out;
        }
        
        .payment-history-row td {
            padding: 0 !important;
        }
        
        #expand-btn:hover svg {
            fill: #3b82f6;
        }
        
        .month-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
    `;
    document.head.appendChild(style);
}

// ==================================================================================
// PAZ Y SALVO CERTIFICATE GENERATOR
// ==================================================================================

window.generatePazYSalvo = async function(studentId) {
    console.log('📄 Generating Paz y Salvo for student:', studentId);

    try {
        // Get student data
        const student = window.StudentManager?.students?.get(studentId);
        if (!student) {
            window.showNotification('❌ Estudiante no encontrado', 'error');
            return;
        }

        // Get payment status
        const status = window.PaymentManager?.getPaymentStatus(student);

        // Verify student is current with payments
        if (status?.status !== 'Pagado') {
            window.showNotification('⚠️ Este estudiante no está al día con sus pagos', 'warning');
            return;
        }

        // Get today's date in Colombia timezone
        const todayStr = window.getTodayInColombia ? window.getTodayInColombia() : new Date().toISOString().split('T')[0];
        const [year, month, day] = todayStr.split('-').map(Number);

        // Format date for display
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const formattedDate = `${day} de ${months[month - 1]} de ${year}`;

        // Get current operator
        const operatorEmail = window.FirebaseData.auth?.currentUser?.email || 'Sistema';

        // Create certificate data
        const certificateData = {
            studentName: student.nombre || 'N/A',
            studentId: student.cedula || student.id,
            date: formattedDate,
            dateISO: todayStr,
            operator: operatorEmail,
            status: status
        };

        // Show modal with certificate
        showPazYSalvoModal(certificateData);

        // Log audit trail
        if (typeof window.logAudit === 'function') {
            await window.logAudit(
                'Paz y Salvo generado',
                'certificate',
                student.id,
                `Paz y Salvo emitido para ${student.nombre}`,
                {
                    after: {
                        estudiante: student.nombre,
                        cedula: student.cedula,
                        fecha: todayStr,
                        operador: operatorEmail
                    }
                }
            );
        }

    } catch (error) {
        console.error('❌ Error generating Paz y Salvo:', error);
        window.showNotification('❌ Error al generar Paz y Salvo', 'error');
    }
};

function showPazYSalvoModal(data) {
    // Remove existing modal if any
    const existingModal = document.getElementById('pazYSalvoModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'pazYSalvoModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        animation: fadeIn 0.3s ease-in;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 20px; max-width: 700px; max-height: 90vh; overflow-y: auto; position: relative; margin: 20px; border-radius: 8px; box-shadow: 0 10px 50px rgba(0,0,0,0.3); animation: slideIn 0.3s ease-out;">
            <button type="button" onclick="document.getElementById('pazYSalvoModal').remove();"
                    style="position: absolute; right: 10px; top: 10px; background: red; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; z-index: 100000;">✖</button>

            <div id="pazYSalvoContent">
                ${getPazYSalvoHTML(data)}
            </div>

            <div style="margin-top: 20px; text-align: center; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                <button type="button" onclick="printPazYSalvo()"
                        style="background: #3b82f6; color: white; padding: 12px 24px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px; font-size: 14px;">
                    🖨️ Imprimir
                </button>
                <button type="button" onclick="savePazYSalvoAsPDF('${data.studentId}')"
                        style="background: #10b981; color: white; padding: 12px 24px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px; font-size: 14px;">
                    💾 Guardar como PDF
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function getPazYSalvoHTML(data) {
    return `
        <div class="paz-y-salvo-print" style="width: 500px; padding: 25px; border: 3px double #000; font-family: 'Georgia', serif; position: relative; background: white; margin: 0 auto;">
            <!-- Header with Logo -->
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="images/logo.png" alt="Logo Ciudad Bilingüe" style="width: 100px; height: auto; margin: 0 auto 10px; display: block; filter: grayscale(100%);" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div style="width: 60px; height: 60px; margin: 0 auto 10px; display: none;">
                    <svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="50" cy="50" r="48" fill="#000" stroke="none"/>
                        <path d="M30 45 L40 35 L50 45 L60 35 L70 45" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        <rect x="28" y="48" width="44" height="28" fill="white" stroke="none"/>
                        <rect x="35" y="55" width="8" height="10" fill="#000"/>
                        <rect x="46" y="55" width="8" height="10" fill="#000"/>
                        <rect x="57" y="55" width="8" height="10" fill="#000"/>
                        <rect x="40" y="68" width="20" height="8" fill="#000"/>
                    </svg>
                </div>
                <h1 style="margin: 0; font-size: 20px; font-weight: bold; color: #000;">CIUDAD BILINGÜE</h1>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #333;">Centro de Idiomas y Capacitación</p>
                <p style="margin: 2px 0 0 0; font-size: 10px; color: #666;">NIT: 900.123.456-7</p>
            </div>

            <!-- Certificate Title -->
            <div style="text-align: center; margin: 20px 0; padding: 12px; background: #f5f5f5; border-radius: 6px; border: 2px solid #000;">
                <h2 style="margin: 0; font-size: 24px; font-weight: bold; color: #000; letter-spacing: 1.5px;">PAZ Y SALVO</h2>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #333; font-style: italic;">Certificado de Pagos al Día</p>
            </div>

            <!-- Certificate Body -->
            <div style="margin: 20px 0; padding: 18px; background: #fafafa; border-left: 3px solid #000; border-radius: 4px;">
                <p style="font-size: 12px; line-height: 1.6; color: #000; text-align: justify; margin: 0;">
                    La <strong>CIUDAD BILINGÜE</strong>, Centro de Idiomas y Capacitación, hace constar que el(la) estudiante:
                </p>

                <div style="margin: 15px 0; padding: 12px; background: white; border-radius: 4px; border: 1px solid #ccc;">
                    <p style="margin: 6px 0; font-size: 13px; color: #000;">
                        <strong>Nombre:</strong> <span style="font-size: 15px; color: #000; font-weight: bold;">${data.studentName}</span>
                    </p>
                    <p style="margin: 6px 0; font-size: 12px; color: #333;">
                        <strong>Identificación:</strong> ${data.studentId}
                    </p>
                </div>

                <p style="font-size: 12px; line-height: 1.6; color: #000; text-align: justify; margin: 15px 0 0 0;">
                    Se encuentra <strong>AL DÍA</strong> con sus obligaciones financieras correspondientes al mes actual,
                    habiendo cumplido satisfactoriamente con todos los pagos requeridos por el programa académico en el cual
                    se encuentra inscrito(a).
                </p>

                <p style="font-size: 12px; line-height: 1.6; color: #000; text-align: justify; margin: 12px 0 0 0;">
                    Este certificado se expide a solicitud del interesado para los fines que estime convenientes.
                </p>
            </div>

            <!-- Status Badge -->
            <div style="text-align: center; margin: 18px 0;">
                <div style="display: inline-block; padding: 10px 25px; background: #000; border-radius: 40px; border: 2px solid #000;">
                    <span style="color: white; font-size: 13px; font-weight: bold; letter-spacing: 0.8px;">✓ ESTADO: AL DÍA CON PAGOS</span>
                </div>
            </div>

            <!-- Footer with Date and Signature -->
            <div style="margin-top: 25px;">
                <p style="font-size: 11px; color: #333; text-align: center; margin-bottom: 20px;">
                    Expedido en Medellín, a los <strong>${data.date}</strong>
                </p>

                <div style="margin-top: 35px; text-align: center;">
                    <!-- Signature Image -->
                    <img src="images/firma.png" alt="Firma" style="height: 50px; width: auto; margin: 0 auto 5px; display: block; filter: grayscale(100%);" onerror="this.style.display='none';">

                    <div style="display: inline-block; border-top: 2px solid #000; padding-top: 6px; min-width: 250px;">
                        <p style="margin: 0; font-size: 12px; font-weight: bold; color: #000;">CIUDAD BILINGÜE</p>
                        <p style="margin: 2px 0 0 0; font-size: 10px; color: #666;">Dirección Académica y Administrativa</p>
                    </div>
                </div>
            </div>

            <!-- Certificate Metadata -->
            <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #ccc;">
                <p style="font-size: 9px; color: #999; text-align: center; margin: 0;">
                    Certificado expedido electrónicamente el ${data.dateISO} por ${data.operator}
                </p>
                <p style="font-size: 9px; color: #999; text-align: center; margin: 4px 0 0 0;">
                    Este documento es válido sin firma autógrafa de conformidad con el Decreto 2150 de 1995
                </p>
            </div>

            <!-- Watermark -->
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: 0.03; pointer-events: none; z-index: 0;">
                <p style="font-size: 100px; font-weight: bold; color: #000; margin: 0; white-space: nowrap;">PAZ Y SALVO</p>
            </div>
        </div>
    `;
}

// Print function for Paz y Salvo
window.printPazYSalvo = function() {
    const printContent = document.getElementById('pazYSalvoContent').innerHTML;
    const printWindow = window.open('', '_blank', 'width=800,height=900');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Paz y Salvo - Ciudad Bilingüe</title>
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    font-family: 'Georgia', serif;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                    @page {
                        margin: 1cm;
                    }
                }
            </style>
        </head>
        <body>
            ${printContent}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 100);
                };
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
};

// Save as PDF function for Paz y Salvo
window.savePazYSalvoAsPDF = function(studentId) {
    window.showNotification('💾 Para guardar como PDF, use la función de imprimir y seleccione "Guardar como PDF"', 'info');
    setTimeout(() => {
        window.printPazYSalvo();
    }, 1000);
};

// Function mappings for backward compatibility
window.registerPayment = window.showPaymentModal;
window.viewPaymentHistory = window.sendPaymentReminder;
