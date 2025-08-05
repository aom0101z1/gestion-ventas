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

    // Generate invoice from payment
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
            printedAt: new Date().toISOString()
        };

        // Save invoice to Firebase
        await this.saveInvoice(invoiceData, student.id);
        
        // Update payment with invoice number
        const db = window.firebaseModules.database;
        const paymentRef = db.ref(window.FirebaseData.database, `payments/${payment.id}/invoiceNumber`);
        await db.set(paymentRef, invoiceNumber);
        
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

        modal.innerHTML = `
            <div style="background: white; padding: 20px; max-width: 850px; max-height: 90vh; overflow-y: auto; position: relative; margin: 20px;">
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
                    <button onclick="InvoiceGenerator.saveAsPDF('${invoiceData.number}')" 
                            style="background: #10b981; color: white; padding: 10px 20px; margin: 0 10px; border: none; cursor: pointer; border-radius: 4px;">
                        📄 Guardar PDF
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    // Get invoice HTML
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
            <div class="invoice-print" style="width: 800px; padding: 20px; border: 2px solid #000; font-family: Arial, sans-serif; position: relative; background: white;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <!-- Logo -->
                    <div style="width: 100px; height: 100px; margin: 0 auto 10px; position: relative;">
                        <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
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
                    
                    <h1 style="margin: 0; font-size: 32px;">${this.config.businessName}</h1>
                    <p style="margin: 5px 0;">NIT. ${this.config.nit}</p>
                    <p style="margin: 5px 0;">${this.config.address} &nbsp; Cel. ${this.config.phones}</p>
                </div>

                <!-- Invoice Number -->
                <div style="position: absolute; right: 20px; top: 20px; border: 2px solid #000; padding: 10px 20px;">
                    <div style="font-size: 12px;">COMPROBANTE DE PAGO</div>
                    <div style="font-size: 18px; font-weight: bold;">${data.number}</div>
                </div>

                <!-- Date -->
                <div style="position: absolute; right: 20px; top: 100px; border: 2px solid #000; padding: 10px;">
                    <div style="font-size: 12px; text-align: center;">FECHA</div>
                    <div style="display: flex; gap: 10px;">
                        <div style="text-align: center;">
                            <div style="border: 1px solid #000; padding: 5px 10px;">${dateInfo.day}</div>
                            <small>DÍA</small>
                        </div>
                        <div style="text-align: center;">
                            <div style="border: 1px solid #000; padding: 5px 10px;">${dateInfo.month}</div>
                            <small>MES</small>
                        </div>
                        <div style="text-align: center;">
                            <div style="border: 1px solid #000; padding: 5px 10px;">${dateInfo.year}</div>
                            <small>AÑO</small>
                        </div>
                    </div>
                </div>

                <!-- Customer Info -->
                <div style="margin: 100px 0 20px 0;">
                    <div style="display: flex; margin-bottom: 10px;">
                        <label style="font-weight: bold; width: 100px;">Señor:</label>
                        <span style="flex: 1; border-bottom: 1px solid #000; padding: 0 5px;">${data.student.name}</span>
                        <label style="font-weight: bold; width: 100px; margin-left: 20px;">${data.student.tipoDoc || 'NIT'}/C.C.:</label>
                        <span style="flex: 1; border-bottom: 1px solid #000; padding: 0 5px;">${data.student.nit}</span>
                    </div>
                    <div style="display: flex; margin-bottom: 20px;">
                        <label style="font-weight: bold; width: 100px;">Dirección:</label>
                        <span style="flex: 1; border-bottom: 1px solid #000; padding: 0 5px;">${data.student.address || 'N/A'}</span>
                        <label style="font-weight: bold; width: 100px; margin-left: 20px;">Cel.:</label>
                        <span style="flex: 1; border-bottom: 1px solid #000; padding: 0 5px;">${data.student.phone}</span>
                    </div>
                </div>

                <!-- Items Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr>
                            <th style="border: 2px solid #000; padding: 10px; background: #f0f0f0; width: 80px;">CANT.</th>
                            <th style="border: 2px solid #000; padding: 10px; background: #f0f0f0;">DESCRIPCIÓN</th>
                            <th style="border: 2px solid #000; padding: 10px; background: #f0f0f0; width: 120px;">VR. UNITARIO</th>
                            <th style="border: 2px solid #000; padding: 10px; background: #f0f0f0; width: 120px;">VR. TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map(item => `
                            <tr>
                                <td style="border: 1px solid #000; padding: 10px; text-align: center;">${item.quantity}</td>
                                <td style="border: 1px solid #000; padding: 10px;">${item.description}</td>
                                <td style="border: 1px solid #000; padding: 10px; text-align: right;">${formatCurrency(item.unitPrice)}</td>
                                <td style="border: 1px solid #000; padding: 10px; text-align: right;">${formatCurrency(item.total)}</td>
                            </tr>
                        `).join('')}
                        <!-- Empty rows -->
                        ${[...Array(Math.max(0, 5 - data.items.length))].map(() => `
                            <tr>
                                <td style="border: 1px solid #000; padding: 10px; height: 30px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 10px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 10px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 10px;">&nbsp;</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <!-- Totals -->
                <div style="text-align: right;">
                    <table style="margin-left: auto; width: 300px;">
                        <tr>
                            <td style="padding: 5px; font-weight: bold;">SUB-TOTAL</td>
                            <td style="border: 1px solid #000; padding: 5px 10px; text-align: right; width: 150px;">
                                ${formatCurrency(data.subtotal)}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 5px; font-weight: bold; font-size: 18px;">TOTAL</td>
                            <td style="border: 2px solid #000; padding: 5px 10px; text-align: right; font-weight: bold; font-size: 18px;">
                                ${formatCurrency(data.total)}
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Footer -->
                <div style="margin-top: 20px; font-size: 12px; text-align: center;">
                    <p style="margin: 5px 0;">Solicita la factura electrónica enviando este comprobante al correo: ${this.config.email}</p>
                    <p style="margin: 5px 0;">o al whatsapp ${this.config.whatsapp}</p>
                </div>

                <!-- Observations -->
                <div style="margin-top: 20px; border: 1px solid #000; padding: 10px; min-height: 60px;">
                    <strong>OBSERVACIONES:</strong><br>
                    ${data.observations || ''}
                    ${data.paymentMethod ? `<br>Método de pago: ${data.paymentMethod}` : ''}
                    ${data.bank ? ` - ${data.bank}` : ''}
                </div>

                <!-- Timestamp -->
                <div style="margin-top: 10px; font-size: 10px; color: #666; text-align: right;">
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

// Global functions
window.PaymentManager = new PaymentManager();

window.loadPaymentsTab = async function() {
    console.log('💰 Loading payments tab');
    
    const container = document.getElementById('paymentsContainer');
    if (!container) {
        console.error('❌ Payments container not found');
        return;
    }

    await window.PaymentManager.init();
    
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

// 1. FIX FOR MODAL POSITION - Replace your showPaymentModal function with this:
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
        
        // Generate invoice automatically
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

// Add print styles for invoices
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
            }
            .no-print {
                display: none !important;
            }
            @page {
                size: letter;
                margin: 0.5in;
            }
        }
    `;
    document.head.appendChild(style);
    // Function mappings for backward compatibility
window.registerPayment = window.showPaymentModal;
window.viewPaymentHistory = window.sendPaymentReminder;
}
