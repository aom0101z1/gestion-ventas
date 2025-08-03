// payments.js - Payment Tracking Module with Color Status
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

function renderPaymentTable(students) {
    if (!students.length) {
        return '<div style="text-align: center; padding: 2rem; color: #666;">No hay estudiantes</div>';
    }

    return `
        <table style="width: 100%; background: white; border-radius: 8px; overflow: hidden;">
            <thead style="background: #f3f4f6;">
                <tr>
                    <th style="padding: 0.75rem; text-align: left;">Estado</th>
                    <th style="padding: 0.75rem; text-align: left;">Estudiante</th>
                    <th style="padding: 0.75rem; text-align: left;">Grupo</th>
                    <th style="padding: 0.75rem; text-align: right;">Valor</th>
                    <th style="padding: 0.75rem; text-align: center;">Día Pago</th>
                    <th style="padding: 0.75rem; text-align: center;">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${students.map(student => {
                    const status = window.PaymentManager.getPaymentStatus(student);
                    return `
                        <tr style="border-top: 1px solid #e5e7eb;">
                            <td style="padding: 0.75rem;">
                                <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
                                    <span style="font-size: 1.2rem;">${status.icon}</span>
                                    <span style="color: ${status.color}; font-weight: 500;">
                                        ${status.status}
                                    </span>
                                </span>
                            </td>
                            <td style="padding: 0.75rem;">
                                <div>${student.nombre || '-'}</div>
                                <small style="color: #6b7280;">${student.telefono || ''}</small>
                            </td>
                            <td style="padding: 0.75rem;">${student.grupo || 'Sin grupo'}</td>
                            <td style="padding: 0.75rem; text-align: right; font-weight: 600;">
                                $${(student.valor || 0).toLocaleString()}
                            </td>
                            <td style="padding: 0.75rem; text-align: center;">
                                ${student.diaPago || '-'}
                            </td>
                            <td style="padding: 0.75rem; text-align: center;">
                                ${status.status !== 'Pagado' ? `
                                    <button onclick="showPaymentModal('${student.id}')" 
                                            class="btn btn-sm" style="background: #10b981; color: white;">
                                        💵 Registrar
                                    </button>
                                ` : ''}
                                <button onclick="sendPaymentReminder('${student.id}')" 
                                        class="btn btn-sm" style="background: #3b82f6; color: white;">
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

window.showPaymentModal = function(studentId) {
    const student = window.StudentManager.students.get(studentId);
    if (!student) return;
    
    const modal = document.createElement('div');
    modal.innerHTML = renderPaymentModal(student);
    document.body.appendChild(modal);
    
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

async function processPayment(studentId) {
    try {
        const paymentData = {
            amount: parseInt(document.getElementById('payAmount').value),
            method: document.getElementById('payMethod').value,
            bank: document.getElementById('payBank')?.value || '',
            month: document.getElementById('payMonth').value,
            notes: document.getElementById('payNotes').value
        };
        
        await window.PaymentManager.recordPayment(studentId, paymentData);
        
        window.showNotification('✅ Pago registrado exitosamente', 'success');
        closePaymentModal();
        loadPaymentsTab();
    } catch (error) {
        console.error('❌ Error processing payment:', error);
        window.showNotification('❌ Error al registrar pago', 'error');
    }
}

console.log('✅ Payments module loaded successfully');
