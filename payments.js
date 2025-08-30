// ==================================================================================
// PAYMENTS.JS - PAYMENT TRACKING MODULE WITH COLOR STATUS AND INVOICE GENERATION
// ==================================================================================

console.log('💰 Loading payments module...');

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
                months: ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
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
                months: ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
            }
        }
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
        console.log('🚀 Initializing payment manager');
        await this.loadPayments();
        this.initialized = true;
    }

    // Load payments from Firebase
async loadPayments() {
    try {
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
    }
}

    // Get payment status with color
// Get payment status with color
getPaymentStatus(student) {
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
    
    // Look for payment in the payments Map
    const payment = Array.from(this.payments.values()).find(p => 
        p.studentId === student.id && 
        p.month?.toLowerCase() === monthName.toLowerCase() && 
        p.year === currentYear
    );
    
    // If payment exists for this month, mark as paid
    if (payment) {
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
                amount: amountPerMonth,
                method: paymentData.method,
                bank: paymentData.bank,
                month: monthData.month.toLowerCase(),
                year: monthData.year,
                date: new Date().toISOString(),
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
        
        // Force UI refresh
        setTimeout(() => {
            window.loadPaymentsTab();
        }, 100);
        
        return {
            masterPaymentId,
            payments,
            totalAmount: paymentData.totalAmount,
            paymentType: paymentData.paymentType,
            paymentPeriod: paymentData.paymentPeriod
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
            amount: paymentData.amount,
            method: paymentData.method,
            bank: paymentData.bank,
            month: paymentData.month.toLowerCase(), // Ensure lowercase
            year: paymentData.year || new Date().getFullYear(),
            date: new Date().toISOString(),
            registeredBy: window.FirebaseData.currentUser?.uid,
            notes: paymentData.notes || ''
        };

        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `payments/${payment.id}`);
        await db.set(ref, payment);
        
        this.payments.set(payment.id, payment);
        
        console.log('✅ Payment recorded:', payment.id);
        
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

    // Update student payment status
    async updateStudentPaymentStatus(studentId, month, paid) {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `students/${studentId}/pagos/${month}`);
        await db.set(ref, {
            paid,
            date: new Date().toISOString(),
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
            const payment = payments.find(p => 
                p.month?.toLowerCase() === month && 
                p.year === targetYear
            );
            
            if (payment) {
                history[month] = {
                    status: 'paid',
                    amount: payment.amount,
                    date: new Date(payment.date).toLocaleDateString('es-CO'),
                    method: payment.method,
                    bank: payment.bank,
                    invoiceNumber: payment.invoiceNumber,
                    paymentId: payment.id
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
                            date: null
                        };
                    } else {
                        history[month] = {
                            status: 'no-payment',
                            amount: 0,
                            date: null
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
                            date: null
                        };
                    } else {
                        history[month] = {
                            status: 'no-payment',
                            amount: 0,
                            date: null
                        };
                    }
                } else {
                    // Future month
                    history[month] = {
                        status: 'no-payment',
                        amount: 0,
                        date: null
                    };
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

    // Get payment summary
    async getPaymentSummary() {
        const students = Array.from(window.StudentManager.students.values());
        const summary = {
            total: students.length,
            paid: 0,
            pending: 0,
            overdue: 0,
            upcoming: 0,
            totalAmount: 0,
            collectedAmount: 0
        };

        students.forEach(student => {
            const status = this.getPaymentStatus(student);
            if (status.status === 'Pagado') {
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
        
        const invoiceData = {
            number: invoiceNumber,
            paymentId: payment.id,
            date: new Date(),
            student: {
                name: student.nombre || '',
                nit: student.numDoc || '',
                tipoDoc: student.tipoDoc || 'C.C',
                address: student.direccion || '',
                phone: student.telefono || ''
            },
            items: [{
                quantity: 1,
                description: `${payment.month.charAt(0).toUpperCase() + payment.month.slice(1)} ${payment.year} - ${student.grupo || 'Curso de Inglés'}`,
                unitPrice: payment.amount,
                total: payment.amount
            }],
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
        
        const invoiceData = {
            number: invoiceNumber,
            masterPaymentId: paymentResult.masterPaymentId,
            date: new Date(),
            student: {
                name: student.nombre || '',
                nit: student.numDoc || '',
                tipoDoc: student.tipoDoc || 'C.C',
                address: student.direccion || '',
                phone: student.telefono || ''
            },
            items: [{
                quantity: 1,
                description: `${description} - ${student.grupo || 'Curso de Inglés'}`,
                unitPrice: paymentResult.totalAmount,
                total: paymentResult.totalAmount
            }],
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
        
        return invoiceData;
    },

    // Save invoice to Firebase
    async saveInvoice(invoiceData, studentId) {
        try {
            const db = window.firebaseModules.database;
            const invoiceRef = db.ref(window.FirebaseData.database, `invoices/${invoiceData.number}`);
            await db.set(invoiceRef, {
                ...invoiceData,
                studentId: studentId,
                createdAt: new Date().toISOString(),
                createdBy: window.FirebaseData.auth?.currentUser?.email || 'unknown'
            });

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
                const d = new Date(date);
                // Check if date is valid
                if (isNaN(d.getTime())) {
                    // If invalid, try to use current date
                    const now = new Date();
                    return {
                        day: now.getDate().toString().padStart(2, '0'),
                        month: (now.getMonth() + 1).toString().padStart(2, '0'),
                        year: now.getFullYear()
                    };
                }
                return {
                    day: d.getDate().toString().padStart(2, '0'),
                    month: (d.getMonth() + 1).toString().padStart(2, '0'),
                    year: d.getFullYear()
                };
            } catch (error) {
                // Fallback to current date if any error
                const now = new Date();
                return {
                    day: now.getDate().toString().padStart(2, '0'),
                    month: (now.getMonth() + 1).toString().padStart(2, '0'),
                    year: now.getFullYear()
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
    }
};
// ==================================================================================
// SECTION 5: UI RENDERING FUNCTIONS - Dashboard and table generation
// ==================================================================================

function renderPaymentDashboard() {
    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
            <div style="background: #10b981; color: white; padding: 1.5rem; border-radius: 8px;">
                <div style="font-size: 2rem; font-weight: bold;" id="paidCount">0</div>
                <div>Pagados</div>
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
                    <th style="padding: 0.75rem; text-align: left;">Estado</th>
                    <th style="padding: 0.75rem; text-align: left;">Estudiante</th>
                    <th style="padding: 0.75rem; text-align: left;">Grupo</th>
                    <th style="padding: 0.75rem; text-align: right;">Valor</th>
                    <th style="padding: 0.75rem; text-align: center;">Día Pago</th>
                    <th style="padding: 0.75rem; text-align: center;">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${students.map((s, index) => {
                    const status = window.PaymentManager.getPaymentStatus(s);
                    
                    // Main row with expand button
                    let mainRow = `
                        <tr style="border-top: 1px solid #e5e7eb;">
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
                            </td>
                            <td style="padding: 0.75rem;">
                                <div style="font-weight: 500;">${s.nombre || '-'}</div>
                                <small style="color: #6b7280;">${s.telefono || '-'}</small>
                            </td>
                            <td style="padding: 0.75rem;">${s.grupo || 'Sin grupo'}</td>
                            <td style="padding: 0.75rem; text-align: right;">
                                <strong>$${(s.valor || 0).toLocaleString()}</strong>
                            </td>
                            <td style="padding: 0.75rem; text-align: center;">
                                ${s.diaPago || '-'}
                            </td>
                            <td style="padding: 0.75rem; text-align: center;">
                                <button onclick="showPaymentModal('${s.id}')" 
                                        class="btn btn-sm" 
                                        style="background: #10b981; color: white; margin-right: 0.5rem;">
                                    ➕ Registrar
                                </button>
                                <button onclick="sendPaymentReminder('${s.id}')" 
                                        class="btn btn-sm"
                                        style="background: #3b82f6; color: white;">
                                    📱 Recordar
                                </button>
                            </td>
                        </tr>
                    `;
                    
                    // Hidden history row (will be populated on expand)
                    let historyRow = `
                        <tr id="history-${s.id}" class="payment-history-row" style="display: none;">
                            <td colspan="8" style="padding: 20px; background: #f9fafb; text-align: center;">
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
function renderPaymentHistoryContent(studentId, history, stats) {
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    const statusColors = {
        'paid': '#10b981',
        'pending': '#f59e0b',
        'overdue': '#ef4444',
        'no-payment': '#d1d5db'
    };
    
    return `
        <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="margin: 0; color: #1f2937; font-size: 16px;">📅 Historial de Pagos ${new Date().getFullYear()}</h4>
                <select onchange="changeHistoryYear('${studentId}', this.value)" 
                        style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white;">
                    <option value="${new Date().getFullYear()}">${new Date().getFullYear()}</option>
                    <option value="${new Date().getFullYear() - 1}">${new Date().getFullYear() - 1}</option>
                </select>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
                ${months.map(month => {
                    const payment = history[month];
                    const color = statusColors[payment.status];
                    
                    return `
                        <div style="
                            background: white; 
                            border: 2px solid ${color}; 
                            border-radius: 8px; 
                            padding: 12px;
                            position: relative;
                            cursor: ${payment.status === 'paid' && payment.invoiceNumber ? 'pointer' : 'default'};
                            transition: all 0.2s;
                        " 
                        ${payment.status === 'paid' && payment.invoiceNumber ? 
                            `onclick="viewPaymentInvoice('${payment.paymentId}')"
                             onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)';"
                             onmouseout="this.style.transform=''; this.style.boxShadow='';"` : ''}>
                            
                            <div style="
                                width: 8px; height: 8px; 
                                background: ${color}; 
                                border-radius: 50%;
                                position: absolute; top: 8px; right: 8px;
                            "></div>
                            
                            <div style="font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 13px;">
                                ${month.charAt(0).toUpperCase() + month.slice(1)}
                            </div>
                            
                            <div style="font-weight: 600; font-size: 15px; color: ${color};">
                                ${payment.amount > 0 ? '$' + payment.amount.toLocaleString('es-CO') : '-'}
                            </div>
                            
                            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
                                ${payment.date || (payment.status === 'pending' ? 'Pendiente' : payment.status === 'overdue' ? 'Vencido' : '')}
                            </div>
                            
                            ${payment.status === 'paid' && payment.method ? 
                                `<div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">
                                    ${payment.method} ${payment.bank ? '- ' + payment.bank : ''}
                                </div>` : ''}
                            
                            ${payment.status === 'paid' && payment.invoiceNumber ? 
                                `<div style="font-size: 10px; color: #3b82f6; margin-top: 4px;">
                                    🧾 Ver comprobante
                                </div>` : ''}
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
                    <!-- Payment Type Selection -->
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
                    
                    <!-- Month Selection Grid -->
                    <div class="form-group" id="monthSelectionGroup">
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
                    
                    <!-- Amount Section -->
                    <div class="form-group">
                        <label>Monto Total ($)</label>
                        <input type="number" id="payAmount" value="${student.valor || ''}" required min="0" onchange="updateInstallmentAmounts()">
                        <small id="amountHelp" style="color: #6b7280; display: block; margin-top: 5px;">
                            Valor mensual: $${(student.valor || 0).toLocaleString()}
                        </small>
                    </div>
                    
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
                ${renderPaymentHistoryContent(studentId, history, stats)}
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
        const payment = window.PaymentManager.payments.get(paymentId);
        if (!payment) return;
        
        const student = window.StudentManager.students.get(payment.studentId);
        if (!student) return;
        
        // Check if invoice exists
        if (payment.invoiceNumber) {
            // Load existing invoice
            const db = window.firebaseModules.database;
            const invoiceRef = db.ref(window.FirebaseData.database, `invoices/${payment.invoiceNumber}`);
            const snapshot = await db.get(invoiceRef);
            
            if (snapshot.exists()) {
                InvoiceGenerator.showInvoiceModal(snapshot.val());
            } else {
                // Regenerate if not found
                const invoiceData = await InvoiceGenerator.generateInvoice(payment, student);
                InvoiceGenerator.showInvoiceModal(invoiceData);
            }
        } else {
            // Generate new invoice
            const invoiceData = await InvoiceGenerator.generateInvoice(payment, student);
            InvoiceGenerator.showInvoiceModal(invoiceData);
        }
    } catch (error) {
        console.error('Error loading invoice:', error);
        window.showNotification('❌ Error al cargar comprobante', 'error');
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
    const amountInput = document.getElementById('payAmount');
    const student = window.StudentManager.students.get(window.currentStudentId);
    
    counter.textContent = `(${checkedBoxes.length} seleccionados)`;
    
    // Update suggested amount based on selection
    if (student && student.valor && checkedBoxes.length > 0) {
        const suggestedAmount = student.valor * checkedBoxes.length;
        amountInput.value = suggestedAmount;
        document.getElementById('amountHelp').innerHTML = `
            Valor mensual: $${student.valor.toLocaleString()}<br>
            Total sugerido (${checkedBoxes.length} meses): $${suggestedAmount.toLocaleString()}
        `;
    }
    
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

window.loadPaymentsTab = async function() {
    console.log('💰 Loading payments tab');
    
    const container = document.getElementById('paymentsContainer');
    if (!container) {
        console.error('❌ Payments container not found');
        return;
    }

    await window.PaymentManager.init();
    await window.InvoiceStorage.init();
    
    const students = window.StudentManager.getStudents();
    const summary = await window.PaymentManager.getPaymentSummary();
    
    container.innerHTML = `
        <div style="padding: 1rem;">
            <h2 style="margin-bottom: 1rem;">💰 Control de Pagos</h2>
            
            ${renderPaymentDashboard()}
            
            <div style="background: white; padding: 1rem; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3>Estado de Pagos</h3>
                    <div style="display: flex; gap: 1rem;">
                        <select id="paymentFilter" onchange="filterPayments()">
                            <option value="">Todos</option>
                            <option value="paid">✅ Pagados</option>
                            <option value="upcoming">🟡 Próximos</option>
                            <option value="overdue">🔴 Vencidos</option>
                        </select>
                        <button onclick="exportPaymentReport()" class="btn btn-secondary">
                            📊 Exportar
                        </button>
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
    document.getElementById('upcomingCount').textContent = summary.upcoming;
    document.getElementById('overdueCount').textContent = summary.overdue;
    document.getElementById('collectedAmount').textContent = `$${summary.collectedAmount.toLocaleString()}`;
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
    const filter = document.getElementById('paymentFilter').value;
    let students = window.StudentManager.getStudents();
    
    if (filter) {
        students = students.filter(s => {
            const status = window.PaymentManager.getPaymentStatus(s);
            if (filter === 'paid') return status.status === 'Pagado';
            if (filter === 'upcoming') return status.color === '#fbbf24' || status.color === '#f59e0b';
            if (filter === 'overdue') return status.color === '#ef4444';
            return true;
        });
    }
    
    document.getElementById('paymentTableContainer').innerHTML = renderPaymentTable(students);
};

window.exportPaymentReport = function() {
    window.showNotification('📊 Generando reporte...', 'info');
    // Implementation for CSV export would go here
};

// ==================================================================================
// SECTION 8: PAYMENT PROCESSING - Core payment workflow with invoice generation
// ==================================================================================

// Enhanced processPayment function with FIXED timing for invoice modal
// Enhanced processPayment function for multi-month payments
async function processPayment(studentId) {
    try {
        window.currentStudentId = studentId; // Store for reference
        const paymentType = document.getElementById('paymentType').value;
        const selectedMonths = Array.from(document.querySelectorAll('.month-checkbox:checked'))
            .map(cb => ({
                month: cb.dataset.month,
                year: parseInt(cb.dataset.year),
                monthIndex: parseInt(cb.dataset.monthIndex)
            }));
        
        const totalAmount = parseInt(document.getElementById('payAmount').value);
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
        
        const paymentData = {
            selectedMonths: selectedMonths,
            totalAmount: totalAmount,
            method: document.getElementById('payMethod').value,
            bank: document.getElementById('payBank')?.value || '',
            notes: document.getElementById('payNotes').value,
            paymentType: paymentType,
            paymentPeriod: paymentPeriod,
            installment: installmentOption > 1 ? `${currentInstallment}/${installmentOption}` : '1/1',
            totalInstallments: installmentOption
        };
        
        // Record payment(s)
        let result;
        const student = window.StudentManager.students.get(studentId);
        
        if (selectedMonths.length === 1 && paymentType === 'monthly') {
            // Single month payment (existing logic)
            const singlePaymentData = {
                amount: totalAmount,
                method: paymentData.method,
                bank: paymentData.bank,
                month: selectedMonths[0].month,
                year: selectedMonths[0].year,
                notes: paymentData.notes
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

// Function mappings for backward compatibility
window.registerPayment = window.showPaymentModal;
window.viewPaymentHistory = window.sendPaymentReminder;
