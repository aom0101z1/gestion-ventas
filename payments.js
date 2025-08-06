// payments.js - Payment Tracking Module with Color Status and Invoice Generation
console.log('💰 Loading payments module...');

// Payment Manager Class
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
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'payments');
            const snapshot = await db.get(ref);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.entries(data).forEach(([id, payment]) => {
                    this.payments.set(id, payment);
                });
            }
            console.log(`✅ Loaded ${this.payments.size} payment records`);
        } catch (error) {
            console.error('❌ Error loading payments:', error);
        }
    }

    // Get payment status with color
    getPaymentStatus(student) {
        if (!student.diaPago) return { color: '#6b7280', status: 'Sin fecha', icon: '❓' };
        
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentDay = today.getDate();
        const payDay = parseInt(student.diaPago) || 1;
        
        // Check if payment was made this month
        const monthName = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][currentMonth];
        const payment = this.getStudentPayment(student.id, monthName);
        
        if (payment?.paid) {
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

    // Record payment
    async recordPayment(studentId, paymentData) {
        try {
            const payment = {
                id: `PAY-${Date.now()}`,
                studentId,
                amount: paymentData.amount,
                method: paymentData.method, // 'Transferencia' or 'Efectivo'
                bank: paymentData.bank, // 'Nequi', 'Bancolombia', etc
                month: paymentData.month,
                year: paymentData.year || new Date().getFullYear(),
                date: new Date().toISOString(),
                registeredBy: window.FirebaseData.currentUser?.uid,
                notes: paymentData.notes || ''
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `payments/${payment.id}`);
            await db.set(ref, payment);
            
            this.payments.set(payment.id, payment);
            
            // Update student payment status
            await this.updateStudentPaymentStatus(studentId, payment.month, true);
            
            console.log('✅ Payment recorded:', payment.id);
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

// ===== NEW: INVOICE STORAGE MANAGER FOR FIREBASE STORAGE =====
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

// ===== NEW: HALF-PAGE INVOICE GENERATOR (2 PER PAGE) =====
// ===== NEW: HALF-PAGE INVOICE GENERATOR (2 PER PAGE) - COMPLETE IMPLEMENTATION =====


// ===== SIMPLIFIED INVOICE PRINTING SOLUTION =====

// Single Invoice Print Handler - Standard size
window.printStandardInvoice = function() {
    const invoiceContent = document.getElementById('invoiceContent');
    if (!invoiceContent) return;
    
    // Create print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
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
};

// Half-Page Invoice Print - FIXED for single invoices
window.printHalfPageInvoice = function() {
    const invoiceContent = document.getElementById('invoiceContent');
    if (!invoiceContent) return;
    
    // Create print window
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    
    // Half-page specific styles
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
                .invoice-wrapper {
                    width: 8in;
                    height: 5.25in;
                    padding: 0.25in;
                    font-size: 11px;
                    page-break-inside: avoid;
                }
                /* Hide second copy */
                .invoice-copy-2 {
                    display: none;
                }
            }
            @media screen {
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 10px;
                }
                .invoice-wrapper {
                    border: 1px solid #ccc;
                    padding: 15px;
                    margin-bottom: 10px;
                    max-width: 600px;
                }
            }
        </style>
    `;
    
    // Modify invoice content for half-page size
    const modifiedContent = invoiceContent.innerHTML
        .replace(/font-size:\s*\d+px/g, 'font-size: 11px')
        .replace(/width:\s*\d+px/g, 'width: 100%')
        .replace(/max-width:\s*\d+px/g, 'max-width: 100%');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Comprobante Media Carta</title>
            ${styles}
        </head>
        <body>
            <div class="invoice-wrapper invoice-copy-1">
                ${modifiedContent}
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
};

// Updated Invoice Generator with clean print methods
const InvoiceGenerator = {
    config: {
        businessName: 'CIUDAD BILINGÜE',
        nit: '9.764.924-1',
        address: 'Cra 8. #22-52',
        phones: '324 297 3737 - 315 640 6911'
    },

    // Show invoice modal with fixed buttons
    showInvoiceModal(invoiceData) {
        const existingModal = document.getElementById('invoiceModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'invoiceModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 20px; max-width: 650px; max-height: 90vh; overflow-y: auto; position: relative; margin: 20px;">
                <button onclick="document.getElementById('invoiceModal').remove()" 
                        style="position: absolute; right: 10px; top: 10px; background: red; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">✖</button>
                
                <div id="invoiceContent">
                    ${this.getInvoiceHTML(invoiceData)}
                </div>
                
                <div style="margin-top: 20px; text-align: center;">
                    <button onclick="printStandardInvoice()" 
                            style="background: #3b82f6; color: white; padding: 10px 20px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px;">
                        🖨️ Imprimir Carta Completa
                    </button>
                    <button onclick="printHalfPageInvoice()" 
                            style="background: #8b5cf6; color: white; padding: 10px 20px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px;">
                        📄 Imprimir Media Carta
                    </button>
                    <button onclick="InvoiceGenerator.saveAsPDF('${invoiceData.number}')" 
                            style="background: #10b981; color: white; padding: 10px 20px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px;">
                        💾 Guardar PDF
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },

    // Clean invoice HTML generation
    getInvoiceHTML(data) {
        const formatDate = (date) => {
            const d = new Date(date);
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        };

        const formatCurrency = (num) => `$${num.toLocaleString('es-CO')}`;

        return `
            <div class="invoice-print" style="padding: 15px; border: 2px solid #000; font-family: Arial, sans-serif;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 15px;">
                    <h1 style="margin: 0; font-size: 24px;">${this.config.businessName}</h1>
                    <p style="margin: 3px 0; font-size: 12px;">NIT. ${this.config.nit}</p>
                    <p style="margin: 3px 0; font-size: 12px;">${this.config.address}</p>
                    <p style="margin: 3px 0; font-size: 12px;">Tel: ${this.config.phones}</p>
                </div>
                
                <!-- Invoice Info -->
                <div style="border: 1px solid #000; padding: 10px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between;">
                        <div>
                            <strong>COMPROBANTE N°:</strong> ${data.number}
                        </div>
                        <div>
                            <strong>FECHA:</strong> ${formatDate(data.date)}
                        </div>
                    </div>
                </div>
                
                <!-- Student Info -->
                <div style="margin-bottom: 15px;">
                    <p><strong>Estudiante:</strong> ${data.studentName || data.student?.name || ''}</p>
                    <p><strong>Documento:</strong> ${data.documentType || data.student?.tipoDoc || 'C.C'} ${data.documentNumber || data.student?.nit || ''}</p>
                </div>
                
                <!-- Items Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <thead>
                        <tr style="background: #f0f0f0;">
                            <th style="border: 1px solid #000; padding: 5px;">Cant.</th>
                            <th style="border: 1px solid #000; padding: 5px;">Descripción</th>
                            <th style="border: 1px solid #000; padding: 5px;">Valor Unit.</th>
                            <th style="border: 1px solid #000; padding: 5px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map(item => `
                            <tr>
                                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${item.quantity}</td>
                                <td style="border: 1px solid #000; padding: 5px;">${item.description}</td>
                                <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatCurrency(item.unitPrice)}</td>
                                <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatCurrency(item.total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" style="border: 1px solid #000; padding: 5px; text-align: right;"><strong>TOTAL:</strong></td>
                            <td style="border: 1px solid #000; padding: 5px; text-align: right;"><strong>${formatCurrency(data.total)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
                
                <!-- Payment Info -->
                <div style="margin-bottom: 15px;">
                    <p><strong>Forma de Pago:</strong> ${data.paymentMethod || 'Efectivo'}</p>
                    ${data.bank ? `<p><strong>Banco:</strong> ${data.bank}</p>` : ''}
                    ${data.notes ? `<p><strong>Observaciones:</strong> ${data.notes}</p>` : ''}
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #000;">
                    <div style="display: flex; justify-content: space-between;">
                        <div style="text-align: center; width: 45%;">
                            <div style="border-bottom: 1px solid #000; margin-bottom: 5px; height: 40px;"></div>
                            <p style="margin: 0; font-size: 11px;">Firma del Estudiante</p>
                        </div>
                        <div style="text-align: center; width: 45%;">
                            <div style="border-bottom: 1px solid #000; margin-bottom: 5px; height: 40px;"></div>
                            <p style="margin: 0; font-size: 11px;">Firma Autorizada</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Print regular invoice
    printInvoice() {
        printStandardInvoice();
    },

    // Save as PDF (implement based on your PDF library)
    saveAsPDF(invoiceNumber) {
        // Implement PDF generation here
        console.log('Saving PDF for invoice:', invoiceNumber);
        window.showNotification('📄 Generando PDF...', 'info');
        
        // Use window.print() with save as PDF option
        window.print();
    }
};

// Replace the old window.printAsHalfPage function
window.printAsHalfPage = window.printHalfPageInvoice;

// Update the global InvoiceGenerator
window.InvoiceGenerator = InvoiceGenerator;

console.log('✅ Invoice printing module fixed and loaded');



// Invoice Generator for creating professional receipts
const InvoiceGenerator = {
    config: {
        businessName: 'CIUDAD BILINGÜE',
        nit: '9.764.924-1',
        address: 'Cra 8. #22-52',
        phones: '324 297 3737 - 315 640 6911',
        email: 'contacto@ciudadbilingue.com',
        whatsapp: '324 297 37 37'
    },

    // Generate invoice number: CB-2025-STD123-001
    async generateInvoiceNumber(studentId) {
        const year = new Date().getFullYear();
        const studentPart = studentId.substring(0, 6).toUpperCase().replace('STU-', '');
        
        try {
            const db = window.firebaseModules.database;
            const counterRef = db.ref(window.FirebaseData.database, `invoiceCounters/${year}/${studentId}`);
            const snapshot = await db.get(counterRef);
            
            let counter = 1;
            if (snapshot.exists()) {
                counter = snapshot.val() + 1;
            }
            
            await db.set(counterRef, counter);
            return `CB-${year}-${studentPart}-${String(counter).padStart(3, '0')}`;
        } catch (error) {
            return `CB-${year}-${studentPart}-${Date.now().toString().slice(-4)}`;
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

    // Show invoice modal
    showInvoiceModal(invoiceData) {
        const existingModal = document.getElementById('invoiceModal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'invoiceModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            overflow-y: auto;
        `;
        
        // Check if invoice has storage URL for download button
        const downloadButton = invoiceData.storageUrl ? 
            `<button onclick="window.open('${invoiceData.storageUrl}', '_blank')" 
                    style="background: #059669; color: white; padding: 10px 20px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px;">
                ☁️ Descargar desde la nube
            </button>` : '';
        
        modal.innerHTML = `
            <div style="background: white; padding: 20px; max-width: 600px; max-height: 90vh; overflow-y: auto; position: relative; margin: 20px;">
                <button onclick="document.getElementById('invoiceModal').remove()" 
                        style="position: absolute; right: 10px; top: 10px; background: red; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">✖</button>
                
                <div id="invoiceContent">
                    ${this.getInvoiceHTML(invoiceData)}
                </div>
                
                <div style="margin-top: 20px; text-align: center;" class="no-print">
                    <button onclick="InvoiceGenerator.printInvoice()" 
                            style="background: #3b82f6; color: white; padding: 10px 20px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px;">
                        🖨️ Imprimir
                    </button>
                    <button onclick="printAsHalfPage('${invoiceData.number}')" 
                            style="background: #8b5cf6; color: white; padding: 10px 20px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px;">
                        📄 Imprimir Media Carta
                    </button>
                    <button onclick="InvoiceGenerator.saveAsPDF('${invoiceData.number}')" 
                            style="background: #10b981; color: white; padding: 10px 20px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px;">
                        📄 Guardar PDF
                    </button>
                    ${downloadButton}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },

    // Get invoice HTML - UPDATED WITH SMALLER SIZE
    getInvoiceHTML(data) {
        const formatDate = (date) => {
            const d = new Date(date);
            return {
                day: d.getDate().toString().padStart(2, '0'),
                month: (d.getMonth() + 1).toString().padStart(2, '0'),
                year: d.getFullYear()
            };
        };

        const dateInfo = formatDate(data.date);
        const formatCurrency = (num) => `$${num.toLocaleString('es-CO')}`;

        return `
            <div class="invoice-print" style="width: 500px; padding: 15px; border: 2px solid #000; font-family: Arial, sans-serif; position: relative; background: white; font-size: 11px;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 15px;">
                    <!-- Logo -->
                    <div style="width: 60px; height: 60px; margin: 0 auto 8px; position: relative;">
                        <svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
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
                    
                    <h1 style="margin: 0; font-size: 24px;">${this.config.businessName}</h1>
                    <p style="margin: 3px 0; font-size: 10px;">NIT. ${this.config.nit}</p>
                    <p style="margin: 3px 0; font-size: 10px;">${this.config.address} &nbsp; Cel. ${this.config.phones}</p>
                </div>

                <!-- Invoice Number -->
                <div style="position: absolute; right: 15px; top: 15px; border: 2px solid #000; padding: 8px 15px;">
                    <div style="font-size: 10px;">COMPROBANTE DE PAGO</div>
                    <div style="font-size: 14px; font-weight: bold;">${data.number}</div>
                </div>

                <!-- Date -->
                <div style="position: absolute; right: 15px; top: 70px; border: 2px solid #000; padding: 8px;">
                    <div style="font-size: 10px; text-align: center;">FECHA</div>
                    <div style="display: flex; gap: 8px;">
                        <div style="text-align: center;">
                            <div style="border: 1px solid #000; padding: 4px 8px; font-size: 10px;">${dateInfo.day}</div>
                            <small style="font-size: 8px;">DÍA</small>
                        </div>
                        <div style="text-align: center;">
                            <div style="border: 1px solid #000; padding: 4px 8px; font-size: 10px;">${dateInfo.month}</div>
                            <small style="font-size: 8px;">MES</small>
                        </div>
                        <div style="text-align: center;">
                            <div style="border: 1px solid #000; padding: 4px 8px; font-size: 10px;">${dateInfo.year}</div>
                            <small style="font-size: 8px;">AÑO</small>
                        </div>
                    </div>
                </div>

                <!-- Customer Info -->
                <div style="margin: 80px 0 15px 0;">
                    <div style="display: flex; margin-bottom: 8px;">
                        <label style="font-weight: bold; width: 60px; font-size: 10px;">Señor:</label>
                        <span style="flex: 1; border-bottom: 1px solid #000; padding: 0 3px; font-size: 10px;">${data.student.name}</span>
                        <label style="font-weight: bold; width: 50px; margin-left: 10px; font-size: 10px;">${data.student.tipoDoc || 'C.C'}:</label>
                        <span style="flex: 1; border-bottom: 1px solid #000; padding: 0 3px; font-size: 10px;">${data.student.nit}</span>
                    </div>
                    <div style="display: flex; margin-bottom: 15px;">
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
                            <th style="border: 2px solid #000; padding: 6px; background: #f0f0f0; width: 50px; font-size: 10px;">CANT.</th>
                            <th style="border: 2px solid #000; padding: 6px; background: #f0f0f0; font-size: 10px;">DESCRIPCIÓN</th>
                            <th style="border: 2px solid #000; padding: 6px; background: #f0f0f0; width: 80px; font-size: 10px;">VR. UNITARIO</th>
                            <th style="border: 2px solid #000; padding: 6px; background: #f0f0f0; width: 80px; font-size: 10px;">VR. TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map(item => `
                            <tr>
                                <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 10px;">${item.quantity}</td>
                                <td style="border: 1px solid #000; padding: 6px; font-size: 10px;">${item.description}</td>
                                <td style="border: 1px solid #000; padding: 6px; text-align: right; font-size: 10px;">${formatCurrency(item.unitPrice)}</td>
                                <td style="border: 1px solid #000; padding: 6px; text-align: right; font-size: 10px;">${formatCurrency(item.total)}</td>
                            </tr>
                        `).join('')}
                        <!-- Empty rows -->
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
                            <td style="padding: 4px; font-weight: bold; font-size: 10px;">SUB-TOTAL</td>
                            <td style="border: 1px solid #000; padding: 4px 8px; text-align: right; width: 100px; font-size: 10px;">
                                ${formatCurrency(data.subtotal)}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 4px; font-weight: bold; font-size: 14px;">TOTAL</td>
                            <td style="border: 2px solid #000; padding: 4px 8px; text-align: right; font-weight: bold; font-size: 14px;">
                                ${formatCurrency(data.total)}
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Footer -->
                <div style="margin-top: 15px; font-size: 9px; text-align: center;">
                    <p style="margin: 3px 0;">Solicita la factura electrónica enviando este comprobante al correo: ${this.config.email}</p>
                    <p style="margin: 3px 0;">o al whatsapp ${this.config.whatsapp}</p>
                </div>

                <!-- Observations -->
                <div style="margin-top: 15px; border: 1px solid #000; padding: 8px; min-height: 40px;">
                    <strong style="font-size: 10px;">OBSERVACIONES:</strong><br>
                    <span style="font-size: 10px;">${data.observations || ''}</span>
                    ${data.paymentMethod ? `<br><span style="font-size: 10px;">Método de pago: ${data.paymentMethod}</span>` : ''}
                    ${data.bank ? `<span style="font-size: 10px;"> - ${data.bank}</span>` : ''}
                </div>

                <!-- Timestamp -->
                <div style="margin-top: 8px; font-size: 8px; color: #666; text-align: right;">
                    Impreso: ${new Date(data.printedAt).toLocaleString('es-CO')}
                </div>
            </div>
        `;
    },

    printInvoice() {
        window.print();
    },

    saveAsPDF(invoiceNumber) {
        window.print();
        alert(`Use "Guardar como PDF" en el diálogo de impresión.\nNombre sugerido: Comprobante_${invoiceNumber}.pdf`);
    }
};

// UI Functions
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

// Updated renderPaymentTable function for payments.js
// This adds row numbers to the payments table

function renderPaymentTable(students) {
    if (!students.length) {
        return '<div style="text-align: center; padding: 2rem; color: #666;">No hay estudiantes</div>';
    }

    return `
        <table style="width: 100%; background: white; border-radius: 8px; overflow: hidden;">
            <thead style="background: #f3f4f6;">
                <tr>
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
                    const statusColors = {
                        paid: '#10b981',
                        upcoming: '#fbbf24',
                        overdue: '#ef4444',
                        none: '#6b7280'
                    };
                    
                    return `
                        <tr style="border-top: 1px solid #e5e7eb;">
                            <td style="padding: 0.75rem; text-align: center; font-weight: bold; color: #6b7280;">
                                ${index + 1}
                            </td>
                            <td style="padding: 0.75rem;">
                                <span style="
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 0.5rem;
                                    color: ${statusColors[status.type]};
                                ">
                                    ${status.type === 'paid' ? '✅' : 
                                      status.type === 'overdue' ? '🔴' : 
                                      status.type === 'upcoming' ? '🟡' : '❓'}
                                    ${status.label}
                                </span>
                            </td>
                            <td style="padding: 0.75rem;">
                                <div>${s.nombre || '-'}</div>
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
                }).join('')}
            </tbody>
        </table>
    `;
}

function renderPaymentModal(student) {
    const currentMonth = new Date().toLocaleDateString('es-ES', { month: 'long' });
    
    return `
        <div id="paymentModal" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; width: 90%;">
                <h3>💵 Registrar Pago - ${student.nombre}</h3>
                
                <form id="paymentForm" style="margin-top: 1rem;">
                    <div class="form-group">
                        <label>Mes</label>
                        <select id="payMonth" required>
                            <option value="${currentMonth}">${currentMonth}</option>
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
                    
                    <div class="form-group">
                        <label>Monto ($)</label>
                        <input type="number" id="payAmount" value="${student.valor || ''}" required min="0">
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

// ===== HALF-PAGE BATCH PRINTING FUNCTIONS =====

// Print multiple invoices (2 per page)
window.batchPrintHalfPageInvoices = async function(studentIds, month) {
    try {
        window.showNotification('📄 Generando comprobantes (2 por página)...', 'info');
        
        const invoices = [];
        
        for (const studentId of studentIds) {
            const student = window.StudentManager?.students.get(studentId);
            if (!student) continue;
            
            const invoice = {
                number: await InvoiceGenerator.generateInvoiceNumber(studentId),
                date: new Date().toISOString(),
                studentName: student.nombre,
                documentType: student.tipoDoc || 'C.C',
                documentNumber: student.numDoc,
                acudiente: student.acudiente,
                items: [{
                    quantity: 1,
                    description: `Mensualidad ${month} - Grupo ${student.grupo || ''}`,
                    unitPrice: student.valor || 0,
                    total: student.valor || 0
                }],
                subtotal: student.valor || 0,
                total: student.valor || 0,
                paymentMethod: student.tipoPago || 'Por definir',
                createdBy: window.FirebaseData?.currentUser?.email || 'Sistema'
            };
            
            invoices.push(invoice);
        }
        
        // Print all invoices (2 per page)
        await window.HalfPageInvoiceGen.printInvoices(invoices);
        
        window.showNotification(`✅ ${invoices.length} comprobantes generados (2 por página)`, 'success');
        
    } catch (error) {
        console.error('Error in batch print:', error);
        window.showNotification('❌ Error en impresión masiva', 'error');
    }
};

// Print today's payments in half-page format
window.printTodayPaymentsHalfPage = async function() {
    const today = new Date().toISOString().split('T')[0];
    const todayPayments = Array.from(window.PaymentManager.payments.values())
        .filter(p => p.date.startsWith(today));
    
    if (todayPayments.length === 0) {
        window.showNotification('No hay pagos de hoy para imprimir', 'info');
        return;
    }
    
    const invoices = [];
    for (const payment of todayPayments) {
        const student = window.StudentManager.students.get(payment.studentId);
        if (!student) continue;
        
        invoices.push(window.HalfPageInvoiceGen.createInvoiceFromPayment(payment, student));
    }
    
    await window.HalfPageInvoiceGen.printInvoices(invoices);
};

// Print single invoice as half-page
// ===== SIMPLIFIED INVOICE PRINTING SOLUTION =====

// Single Invoice Print Handler - Standard size
window.printStandardInvoice = function() {
    const invoiceContent = document.getElementById('invoiceContent');
    if (!invoiceContent) return;
    
    // Create print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
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
};

// Half-Page Invoice Print - TWO COPIES on same page
window.printHalfPageInvoice = function() {
    const invoiceContent = document.getElementById('invoiceContent');
    if (!invoiceContent) return;
    
    // Create print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
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
    
    // Modify invoice content for half-page size with smaller fonts
    const modifiedContent = invoiceContent.innerHTML
        .replace(/font-size:\s*\d+px/g, 'font-size: 10px')
        .replace(/width:\s*\d+px/g, 'width: 100%')
        .replace(/max-width:\s*\d+px/g, 'max-width: 100%')
        .replace(/padding:\s*15px/g, 'padding: 10px');
    
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
};

// Updated Invoice Generator with clean print methods
const InvoiceGenerator = {
    config: {
        businessName: 'CIUDAD BILINGÜE',
        nit: '9.764.924-1',
        address: 'Cra 8. #22-52',
        phones: '324 297 3737 - 315 640 6911'
    },

    // Show invoice modal with fixed buttons
    showInvoiceModal(invoiceData) {
        const existingModal = document.getElementById('invoiceModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'invoiceModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 20px; max-width: 650px; max-height: 90vh; overflow-y: auto; position: relative; margin: 20px;">
                <button onclick="document.getElementById('invoiceModal').remove()" 
                        style="position: absolute; right: 10px; top: 10px; background: red; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">✖</button>
                
                <div id="invoiceContent">
                    ${this.getInvoiceHTML(invoiceData)}
                </div>
                
                <div style="margin-top: 20px; text-align: center;">
                    <button onclick="printStandardInvoice()" 
                            style="background: #3b82f6; color: white; padding: 12px 24px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px; font-size: 14px;">
                        🖨️ Imprimir Tamaño Carta
                    </button>
                    <button onclick="printHalfPageInvoice()" 
                            style="background: #E53E3E; color: white; padding: 12px 24px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px; font-size: 14px;">
                        📄 Imprimir 2 Copias (Media Carta)
                    </button>
                    <button onclick="InvoiceGenerator.saveAsPDF('${invoiceData.number}')" 
                            style="background: #10b981; color: white; padding: 12px 24px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px; font-size: 14px;">
                        💾 Guardar como PDF
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },

    // Clean invoice HTML generation with logo and complete info
    getInvoiceHTML(data) {
        const formatDate = (date) => {
            try {
                const d = new Date(date);
                // Check if date is valid
                if (isNaN(d.getTime())) {
                    // If invalid, try to use current date
                    const now = new Date();
                    return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
                }
                return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
            } catch (error) {
                // Fallback to current date if any error
                const now = new Date();
                return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
            }
        };

        const formatCurrency = (num) => `${(num || 0).toLocaleString('es-CO')}`;

        return `
            <div class="invoice-print" style="padding: 15px; border: 2px solid #000; font-family: Arial, sans-serif; position: relative;">
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
                    <p style="margin: 3px 0; font-size: 12px;">NIT. ${this.config.nit}</p>
                    <p style="margin: 3px 0; font-size: 12px;">${this.config.address}</p>
                    <p style="margin: 3px 0; font-size: 12px;">Tel: ${this.config.phones}</p>
                </div>
                
                <!-- Invoice Info Box -->
                <div style="border: 2px solid #000; padding: 10px; margin-bottom: 15px; background: #f9f9f9;">
                    <div style="display: flex; justify-content: space-between;">
                        <div>
                            <strong>COMPROBANTE DE PAGO</strong><br>
                            <span style="font-size: 14px; color: #E53E3E;">N° ${data.number || 'CB-2025-17-014'}</span>
                        </div>
                        <div style="text-align: right;">
                            <strong>FECHA:</strong><br>
                            <span style="font-size: 14px;">${formatDate(data.date)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Student Info -->
                <div style="margin-bottom: 15px; padding: 10px; background: #fafafa; border: 1px solid #ddd;">
                    <p style="margin: 5px 0;"><strong>Estudiante:</strong> ${data.studentName || data.student?.name || ''}</p>
                    <p style="margin: 5px 0;"><strong>Documento:</strong> ${data.documentType || data.student?.tipoDoc || 'C.C'} ${data.documentNumber || data.student?.nit || ''}</p>
                </div>
                
                <!-- Items Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <thead>
                        <tr style="background: #E53E3E; color: white;">
                            <th style="border: 1px solid #000; padding: 8px; text-align: center;">CANT.</th>
                            <th style="border: 1px solid #000; padding: 8px;">DESCRIPCIÓN</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right;">VR. UNIT</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right;">VR. TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map(item => `
                            <tr>
                                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.quantity || 1}</td>
                                <td style="border: 1px solid #000; padding: 8px;">${item.description || ''}</td>
                                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${formatCurrency(item.unitPrice || 0)}</td>
                                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${formatCurrency(item.total || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" style="border: 1px solid #000; padding: 8px; text-align: right; background: #f5f5f5;"><strong>SUB TOTAL:</strong></td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: right; background: #f5f5f5;">${formatCurrency(data.subtotal || data.total || 0)}</td>
                        </tr>
                        <tr>
                            <td colspan="3" style="border: 1px solid #000; padding: 8px; text-align: right; background: #E53E3E; color: white;"><strong>TOTAL:</strong></td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: right; background: #E53E3E; color: white;"><strong>${formatCurrency(data.total || 0)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
                
                <!-- Payment Info -->
                <div style="margin-bottom: 15px; padding: 10px; background: #fafafa; border: 1px solid #ddd;">
                    <p style="margin: 5px 0;"><strong>Forma de Pago:</strong> ${data.paymentMethod || 'Efectivo'}</p>
                    ${data.bank ? `<p style="margin: 5px 0;"><strong>Banco:</strong> ${data.bank}</p>` : ''}
                    ${data.notes || data.observations ? `
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                            <p style="margin: 5px 0;"><strong>Observaciones:</strong></p>
                            <p style="margin: 5px 0; font-style: italic;">${data.notes || data.observations}</p>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Footer with Signatures -->
                <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #000;">
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
            </div>
        `;
    },

    // Print regular invoice
    printInvoice() {
        printStandardInvoice();
    },

    // Save as PDF (implement based on your PDF library)
    saveAsPDF(invoiceNumber) {
        // Implement PDF generation here
        console.log('Saving PDF for invoice:', invoiceNumber);
        window.showNotification('📄 Generando PDF...', 'info');
        
        // Use window.print() with save as PDF option
        window.print();
    }
};

// Replace the old window.printAsHalfPage function
window.printAsHalfPage = window.printHalfPageInvoice;

// Update the global InvoiceGenerator
window.InvoiceGenerator = InvoiceGenerator;

// Batch print function for multiple invoices (2 per page, different invoices)
window.batchPrintHalfPage = function(invoices) {
    if (!invoices || invoices.length === 0) {
        window.showNotification('No hay comprobantes para imprimir', 'warning');
        return;
    }
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
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

console.log('✅ Invoice printing module fixed and loaded');

// Global instances
window.PaymentManager = new PaymentManager();
window.InvoiceStorage = new InvoiceStorageManager();
window.HalfPageInvoiceGen = new HalfPageInvoiceGenerator();

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

// Enhanced processPayment function with automatic invoice generation
async function processPayment(studentId) {
    try {
        const paymentData = {
            amount: parseInt(document.getElementById('payAmount').value),
            method: document.getElementById('payMethod').value,
            bank: document.getElementById('payBank')?.value || '',
            month: document.getElementById('payMonth').value,
            notes: document.getElementById('payNotes').value
        };
        
        // Record payment (existing functionality)
        const payment = await window.PaymentManager.recordPayment(studentId, paymentData);
        
        // Get student data
        const student = window.StudentManager.students.get(studentId);
        
        // Generate invoice automatically (NOW WITH STORAGE)
        const invoiceData = await InvoiceGenerator.generateInvoice(payment, student);
        
        window.showNotification('✅ Pago registrado exitosamente', 'success');
        closePaymentModal();
        
        // Show invoice modal immediately
        InvoiceGenerator.showInvoiceModal(invoiceData);
        
        // Reload payments tab
        loadPaymentsTab();
    } catch (error) {
        console.error('❌ Error processing payment:', error);
        window.showNotification('❌ Error al registrar pago', 'error');
    }
}

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
    `;
    document.head.appendChild(style);
}

// Function mappings for backward compatibility
window.registerPayment = window.showPaymentModal;
window.viewPaymentHistory = window.sendPaymentReminder;
