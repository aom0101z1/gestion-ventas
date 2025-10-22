// ==================================================================================
// FINANCE.JS - COMPREHENSIVE FINANCIAL MANAGEMENT MODULE
// Version: 1.0
// Purpose: Revenue tracking, cash reconciliation, expense management, business metrics
// ==================================================================================

console.log('💰 Loading finance module...');

// ==================================================================================
// SECTION 1: EXPENSE CATEGORIES CONFIGURATION
// ==================================================================================

const ExpenseCategories = {
    RENT: 'Arriendo',
    SALARIES: 'Salarios Profesores',
    WATER: 'Agua',
    ELECTRICITY: 'Luz',
    INTERNET: 'Internet',
    GOOGLE: 'Servicios Google',
    HOSTING: 'Hosting',
    MARKETING: 'Marketing',
    SUPPLIES: 'Materiales',
    MAINTENANCE: 'Mantenimiento',
    OTHER: 'Otros'
};

// ==================================================================================
// CURRENCY FORMATTING HELPER
// ==================================================================================

/**
 * Format number as Colombian Peso currency
 * Example: 100000 => "$100.000"
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '$0';
    }

    const num = Math.round(amount); // Round to avoid decimal issues
    const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$${formatted}`;
}

// ==================================================================================
// SECTION 2: FINANCE MANAGER CLASS
// ==================================================================================

class FinanceManager {
    constructor() {
        this.expenses = new Map();
        this.dailyReconciliations = new Map();
        this.initialized = false;
    }

    // Initialize module
    async init() {
        if (this.initialized) return;
        console.log('🚀 Initializing finance manager');
        await this.loadExpenses();
        await this.loadReconciliations();
        this.initialized = true;
    }

    // ==================================================================================
    // EXPENSE MANAGEMENT
    // ==================================================================================

    async loadExpenses() {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'expenses');
            const snapshot = await db.get(ref);

            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.entries(data).forEach(([id, expense]) => {
                    this.expenses.set(id, expense);
                });
            }
            console.log(`✅ Loaded ${this.expenses.size} expenses`);
        } catch (error) {
            console.error('❌ Error loading expenses:', error);
        }
    }

    async addExpense(expenseData) {
        try {
            const id = `EXP-${Date.now()}`;
            const expense = {
                id,
                amount: parseFloat(expenseData.amount),
                category: expenseData.category,
                description: expenseData.description,
                date: expenseData.date || new Date().toISOString().split('T')[0],
                receiptUrl: expenseData.receiptUrl || null,
                registeredBy: window.FirebaseData.currentUser?.uid,
                registeredByName: window.FirebaseData.currentUser?.email,
                createdAt: new Date().toISOString()
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `expenses/${id}`);
            await db.set(ref, expense);

            this.expenses.set(id, expense);
            console.log('✅ Expense added:', id);
            return expense;
        } catch (error) {
            console.error('❌ Error adding expense:', error);
            throw error;
        }
    }

    async deleteExpense(id) {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `expenses/${id}`);
            await db.remove(ref);

            this.expenses.delete(id);
            console.log('✅ Expense deleted:', id);
            return true;
        } catch (error) {
            console.error('❌ Error deleting expense:', error);
            throw error;
        }
    }

    getExpenses(filters = {}) {
        let expenses = Array.from(this.expenses.values());

        if (filters.startDate) {
            expenses = expenses.filter(e => e.date >= filters.startDate);
        }

        if (filters.endDate) {
            expenses = expenses.filter(e => e.date <= filters.endDate);
        }

        if (filters.category) {
            expenses = expenses.filter(e => e.category === filters.category);
        }

        return expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // ==================================================================================
    // DAILY CASH RECONCILIATION
    // ==================================================================================

    async loadReconciliations() {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'dailyReconciliations');
            const snapshot = await db.get(ref);

            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.entries(data).forEach(([date, reconciliation]) => {
                    this.dailyReconciliations.set(date, reconciliation);
                });
            }
            console.log(`✅ Loaded ${this.dailyReconciliations.size} reconciliations`);
        } catch (error) {
            console.error('❌ Error loading reconciliations:', error);
        }
    }

    async saveDailyReconciliation(date, data) {
        try {
            const reconciliation = {
                date,
                openingBalance: parseFloat(data.openingBalance) || 0,
                closingCount: parseFloat(data.closingCount) || 0,
                expenses: parseFloat(data.expenses) || 0,
                notes: data.notes || '',
                isClosed: data.isClosed || false,
                closedBy: data.closedBy || null,
                closedAt: data.closedAt || null,
                registeredBy: window.FirebaseData.currentUser?.uid,
                registeredByName: window.FirebaseData.currentUser?.email,
                updatedAt: new Date().toISOString()
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `dailyReconciliations/${date}`);
            await db.set(ref, reconciliation);

            this.dailyReconciliations.set(date, reconciliation);
            console.log('✅ Reconciliation saved for:', date);
            return reconciliation;
        } catch (error) {
            console.error('❌ Error saving reconciliation:', error);
            throw error;
        }
    }

    async closeDay(date) {
        try {
            const reconciliation = this.dailyReconciliations.get(date);
            if (!reconciliation) {
                throw new Error('No reconciliation found for this date');
            }

            reconciliation.isClosed = true;
            reconciliation.closedBy = window.FirebaseData.currentUser?.uid;
            reconciliation.closedByName = window.FirebaseData.currentUser?.email;
            reconciliation.closedAt = new Date().toISOString();

            await this.saveDailyReconciliation(date, reconciliation);
            console.log('✅ Day closed:', date);
            return true;
        } catch (error) {
            console.error('❌ Error closing day:', error);
            throw error;
        }
    }

    getDailyReconciliation(date) {
        return this.dailyReconciliations.get(date) || null;
    }

    // ==================================================================================
    // REVENUE CALCULATIONS
    // ==================================================================================

    calculateDailyRevenue(date) {
        const payments = Array.from(window.PaymentManager.payments.values()).filter(p => {
            const paymentDate = p.date ? p.date.split('T')[0] : null;
            return paymentDate === date;
        });

        const cashPayments = payments.filter(p => p.method === 'Efectivo');
        const transferPayments = payments.filter(p => p.method === 'Transferencia');

        const cashTotal = cashPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const transferTotal = transferPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        return {
            total: cashTotal + transferTotal,
            cash: cashTotal,
            transfers: transferTotal,
            cashCount: cashPayments.length,
            transferCount: transferPayments.length,
            payments: payments
        };
    }

    calculateExpectedMonthlyRevenue() {
        const students = Array.from(window.StudentManager.students.values());
        const activeStudents = students.filter(s => s.status !== 'inactive');

        let totalExpected = 0;
        let breakdown = {
            monthly: { count: 0, total: 0 },
            semester: { count: 0, total: 0 },
            annual: { count: 0, total: 0 }
        };

        activeStudents.forEach(student => {
            const amount = student.valor || 0;
            const paymentType = (student.tipoPago || 'MENSUAL').toUpperCase();

            if (paymentType === 'MENSUAL') {
                totalExpected += amount;
                breakdown.monthly.count++;
                breakdown.monthly.total += amount;
            } else if (paymentType === 'SEMESTRAL') {
                // Semester students pay once every 6 months
                const monthlyEquivalent = amount / 6;
                totalExpected += monthlyEquivalent;
                breakdown.semester.count++;
                breakdown.semester.total += amount;
            } else if (paymentType === 'ANUAL') {
                // Annual students pay once a year
                const monthlyEquivalent = amount / 12;
                totalExpected += monthlyEquivalent;
                breakdown.annual.count++;
                breakdown.annual.total += amount;
            }
        });

        return {
            totalExpected,
            activeStudents: activeStudents.length,
            breakdown
        };
    }

    // ==================================================================================
    // BUSINESS METRICS
    // ==================================================================================

    calculateMonthlyMetrics(year, month) {
        // Get all payments for the month
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        const payments = Array.from(window.PaymentManager.payments.values()).filter(p => {
            const paymentDate = p.date ? p.date.split('T')[0] : null;
            return paymentDate >= startDate && paymentDate <= endDate;
        });

        const revenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Get expenses for the month
        const expenses = this.getExpenses({ startDate, endDate });
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        // Calculate profit
        const grossProfit = revenue - totalExpenses;

        // EBITDA (in this simple case, same as gross profit since we don't track depreciation/amortization)
        const ebitda = grossProfit;

        // Calculate margin
        const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

        return {
            revenue,
            expenses: totalExpenses,
            grossProfit,
            ebitda,
            profitMargin,
            paymentCount: payments.length,
            expenseBreakdown: this.getExpenseBreakdown(expenses)
        };
    }

    getExpenseBreakdown(expenses) {
        const breakdown = {};
        expenses.forEach(expense => {
            if (!breakdown[expense.category]) {
                breakdown[expense.category] = 0;
            }
            breakdown[expense.category] += expense.amount;
        });
        return breakdown;
    }

    calculateCollectionRate(year, month) {
        const expectedRevenue = this.calculateExpectedMonthlyRevenue();
        const actualRevenue = this.calculateMonthlyMetrics(year, month).revenue;

        const rate = expectedRevenue.totalExpected > 0
            ? (actualRevenue / expectedRevenue.totalExpected) * 100
            : 0;

        return {
            expected: expectedRevenue.totalExpected,
            actual: actualRevenue,
            rate: rate,
            difference: actualRevenue - expectedRevenue.totalExpected
        };
    }

    // ==================================================================================
    // STUDENT GROWTH METRICS
    // ==================================================================================

    calculateStudentGrowth(months = 6) {
        const students = Array.from(window.StudentManager.students.values());
        const today = new Date();
        const monthlyData = [];

        for (let i = months - 1; i >= 0; i--) {
            const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const targetMonth = targetDate.toISOString().slice(0, 7); // YYYY-MM

            const activeInMonth = students.filter(s => {
                const startDate = s.fechaInicio;
                if (!startDate) return false;

                const studentStart = new Date(startDate);
                const isActive = studentStart <= targetDate;

                // Check if became inactive before this month
                const statusHistory = s.statusHistory || [];
                const inactiveEvent = statusHistory.find(h =>
                    h.newStatus === 'inactive' && new Date(h.changedAt) <= targetDate
                );

                return isActive && !inactiveEvent;
            });

            monthlyData.push({
                month: targetMonth,
                count: activeInMonth.length,
                monthName: targetDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
            });
        }

        return monthlyData;
    }
}

// ==================================================================================
// SECTION 3: UI RENDERING FUNCTIONS
// ==================================================================================

// Render main finance dashboard
function renderFinanceDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Get today's data
    const dailyRevenue = window.FinanceManager.calculateDailyRevenue(today);
    const reconciliation = window.FinanceManager.getDailyReconciliation(today);
    const expectedRevenue = window.FinanceManager.calculateExpectedMonthlyRevenue();
    const monthlyMetrics = window.FinanceManager.calculateMonthlyMetrics(currentYear, currentMonth);
    const collectionRate = window.FinanceManager.calculateCollectionRate(currentYear, currentMonth);

    // Calculate discrepancy if reconciliation exists
    let expectedClosing = 0;
    let discrepancy = 0;
    if (reconciliation) {
        expectedClosing = reconciliation.openingBalance + dailyRevenue.cash - reconciliation.expenses;
        discrepancy = reconciliation.closingCount - expectedClosing;
    }

    return `
        <div style="padding: 2rem;">
            <!-- Page Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h1 style="margin: 0;">💰 Dashboard Financiero</h1>
                <div style="display: flex; gap: 1rem;">
                    <button onclick="loadDailyReconciliationView()" class="btn" style="background: #3b82f6; color: white;">
                        📋 Cierre Diario
                    </button>
                    <button onclick="loadExpensesView()" class="btn" style="background: #8b5cf6; color: white;">
                        💸 Gastos
                    </button>
                    <button onclick="loadReportsView()" class="btn" style="background: #10b981; color: white;">
                        📊 Reportes
                    </button>
                </div>
            </div>

            <!-- Today's Summary -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem;">
                <h2 style="margin: 0 0 1rem 0;">HOY - ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Efectivo Recibido</div>
                        <div style="font-size: 2rem; font-weight: bold;">${formatCurrency(dailyRevenue.cash)}</div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">${dailyRevenue.cashCount} pagos</div>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Transferencias</div>
                        <div style="font-size: 2rem; font-weight: bold;">${formatCurrency(dailyRevenue.transfers)}</div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">${dailyRevenue.transferCount} pagos</div>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Total Recaudado</div>
                        <div style="font-size: 2rem; font-weight: bold;">${formatCurrency(dailyRevenue.total)}</div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">${dailyRevenue.cashCount + dailyRevenue.transferCount} pagos</div>
                    </div>
                    ${reconciliation ? `
                        <div>
                            <div style="font-size: 0.9rem; opacity: 0.9;">Estado Cierre</div>
                            <div style="font-size: 2rem; font-weight: bold;">${reconciliation.isClosed ? '🔒 Cerrado' : '🔓 Abierto'}</div>
                            <div style="font-size: 0.8rem; opacity: 0.8;">${discrepancy !== 0 ? `Diferencia: ${formatCurrency(Math.abs(discrepancy))}` : 'Sin diferencia'}</div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Monthly Overview -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <!-- MRR Card -->
                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div style="background: #10b981; width: 50px; height: 50px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            💵
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: #6b7280;">MRR Esperado</div>
                            <div style="font-size: 1.5rem; font-weight: bold; color: #1f2937;">${formatCurrency(expectedRevenue.totalExpected)}</div>
                        </div>
                    </div>
                    <div style="font-size: 0.85rem; color: #6b7280;">${expectedRevenue.activeStudents} estudiantes activos</div>
                </div>

                <!-- Revenue Card -->
                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div style="background: #3b82f6; width: 50px; height: 50px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            📈
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: #6b7280;">Recaudado Este Mes</div>
                            <div style="font-size: 1.5rem; font-weight: bold; color: #1f2937;">${formatCurrency(monthlyMetrics.revenue)}</div>
                        </div>
                    </div>
                    <div style="font-size: 0.85rem; color: #6b7280;">${collectionRate.rate.toFixed(1)}% tasa de cobro</div>
                </div>

                <!-- Expenses Card -->
                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div style="background: #ef4444; width: 50px; height: 50px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            💸
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: #6b7280;">Gastos Este Mes</div>
                            <div style="font-size: 1.5rem; font-weight: bold; color: #1f2937;">${formatCurrency(monthlyMetrics.expenses)}</div>
                        </div>
                    </div>
                    <div style="font-size: 0.85rem; color: #6b7280;">${monthlyMetrics.expenseBreakdown ? Object.keys(monthlyMetrics.expenseBreakdown).length : 0} categorías</div>
                </div>

                <!-- Profit Card -->
                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div style="background: #8b5cf6; width: 50px; height: 50px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            💰
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: #6b7280;">Utilidad (EBITDA)</div>
                            <div style="font-size: 1.5rem; font-weight: bold; color: ${monthlyMetrics.ebitda >= 0 ? '#10b981' : '#ef4444'};">
                                ${formatCurrency(monthlyMetrics.ebitda)}
                            </div>
                        </div>
                    </div>
                    <div style="font-size: 0.85rem; color: #6b7280;">${monthlyMetrics.profitMargin.toFixed(1)}% margen</div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 1rem 0;">Acciones Rápidas</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <button onclick="loadDailyReconciliationView()" class="btn" style="background: #3b82f6; color: white; padding: 1rem;">
                        📋 Abrir Cierre Diario
                    </button>
                    <button onclick="showAddExpenseModal()" class="btn" style="background: #ef4444; color: white; padding: 1rem;">
                        ➕ Registrar Gasto
                    </button>
                    <button onclick="loadReportsView()" class="btn" style="background: #10b981; color: white; padding: 1rem;">
                        📊 Ver Reportes Completos
                    </button>
                    <button onclick="exportFinancialReport()" class="btn" style="background: #8b5cf6; color: white; padding: 1rem;">
                        📥 Exportar Reporte
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Render Daily Cash Reconciliation View
function renderDailyReconciliationView() {
    const today = new Date().toISOString().split('T')[0];
    const reconciliation = window.FinanceManager.getDailyReconciliation(today);
    const dailyRevenue = window.FinanceManager.calculateDailyRevenue(today);

    // Get today's expenses
    const todayExpenses = window.FinanceManager.getExpenses({
        startDate: today,
        endDate: today
    });
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate expected closing
    const openingBalance = reconciliation?.openingBalance || 0;
    const expectedClosing = openingBalance + dailyRevenue.cash - totalExpenses;
    const actualClosing = reconciliation?.closingCount || 0;
    const discrepancy = actualClosing - expectedClosing;

    const isClosed = reconciliation?.isClosed || false;
    const isDirector = true; // TODO: Check actual user role

    return `
        <div style="padding: 2rem; max-width: 1000px; margin: 0 auto;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <div>
                    <button onclick="loadFinanceTab()" class="btn btn-secondary" style="margin-bottom: 0.5rem;">
                        ← Volver al Dashboard
                    </button>
                    <h1 style="margin: 0;">📋 Cierre Diario de Caja</h1>
                    <p style="margin: 0.5rem 0 0 0; color: #6b7280;">
                        ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                ${isClosed ? `
                    <div style="background: #ef4444; color: white; padding: 1rem; border-radius: 8px; text-align: center;">
                        <div style="font-size: 1.5rem;">🔒</div>
                        <div style="font-weight: bold;">DÍA CERRADO</div>
                        <div style="font-size: 0.8rem;">Por ${reconciliation.closedByName}</div>
                    </div>
                ` : `
                    <div style="background: #10b981; color: white; padding: 1rem; border-radius: 8px; text-align: center;">
                        <div style="font-size: 1.5rem;">🔓</div>
                        <div style="font-weight: bold;">DÍA ABIERTO</div>
                        <div style="font-size: 0.8rem;">Editable</div>
                    </div>
                `}
            </div>

            <!-- Reconciliation Form -->
            <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 2rem;">
                <h2 style="margin: 0 0 1.5rem 0;">Registro de Efectivo</h2>

                <form id="reconciliationForm" onsubmit="saveDailyReconciliation(event)" style="display: grid; gap: 1.5rem;">
                    <!-- Opening Balance -->
                    <div class="form-group">
                        <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">
                            💵 Apertura de Caja (Efectivo inicial)
                        </label>
                        <input type="number"
                               id="openingBalance"
                               value="${openingBalance}"
                               ${isClosed ? 'disabled' : ''}
                               min="0"
                               step="1000"
                               style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 1.1rem;"
                               placeholder="Ej: 500000">
                        <small style="color: #6b7280;">Dinero en efectivo al inicio del día</small>
                    </div>

                    <!-- Cash Received (Auto-calculated) -->
                    <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px;">
                        <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">
                            💰 Efectivo Recibido Hoy (Sistema)
                        </label>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">
                            ${formatCurrency(dailyRevenue.cash)}
                        </div>
                        <small style="color: #6b7280;">${dailyRevenue.cashCount} pagos en efectivo registrados</small>
                    </div>

                    <!-- Transfers Received (Auto-calculated) -->
                    <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px;">
                        <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">
                            🏦 Transferencias Recibidas Hoy (Sistema)
                        </label>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #3b82f6;">
                            ${formatCurrency(dailyRevenue.transfers)}
                        </div>
                        <small style="color: #6b7280;">${dailyRevenue.transferCount} transferencias registradas</small>
                    </div>

                    <!-- Expenses (Auto-calculated) -->
                    <div style="background: #f3f4f6; padding: 1rem; border-radius: 6px;">
                        <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">
                            💸 Gastos Registrados Hoy
                        </label>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #ef4444;">
                            -${formatCurrency(totalExpenses)}
                        </div>
                        <small style="color: #6b7280;">${todayExpenses.length} gastos registrados</small>
                        <button type="button" onclick="showAddExpenseModal()" class="btn btn-sm" style="background: #ef4444; color: white; margin-top: 0.5rem;">
                            ➕ Agregar Gasto
                        </button>
                    </div>

                    <!-- Closing Count -->
                    <div class="form-group">
                        <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">
                            🧮 Cierre de Caja (Conteo real de efectivo)
                        </label>
                        <input type="number"
                               id="closingCount"
                               value="${actualClosing}"
                               ${isClosed ? 'disabled' : ''}
                               min="0"
                               step="1000"
                               oninput="calculateDiscrepancy()"
                               style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 1.1rem;"
                               placeholder="Ej: 2750000">
                        <small style="color: #6b7280;">Cuente el efectivo real en caja al final del día</small>
                    </div>

                    <!-- Expected vs Actual Comparison (Director Only) -->
                    ${isDirector ? `
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 8px;">
                            <h3 style="margin: 0 0 1rem 0;">📊 Análisis del Director</h3>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div>
                                    <div style="font-size: 0.9rem; opacity: 0.9;">Cierre Esperado</div>
                                    <div style="font-size: 1.8rem; font-weight: bold;">
                                        ${formatCurrency(expectedClosing)}
                                    </div>
                                    <div style="font-size: 0.8rem; opacity: 0.8;">
                                        Apertura + Efectivo - Gastos
                                    </div>
                                </div>
                                <div>
                                    <div style="font-size: 0.9rem; opacity: 0.9;">Diferencia</div>
                                    <div id="discrepancyAmount" style="font-size: 1.8rem; font-weight: bold; color: ${discrepancy === 0 ? '#10b981' : discrepancy > 0 ? '#fbbf24' : '#ef4444'};">
                                        ${discrepancy === 0 ? '✓ $0' : (discrepancy > 0 ? '+' : '-') + formatCurrency(Math.abs(discrepancy))}
                                    </div>
                                    <div id="discrepancyStatus" style="font-size: 0.8rem; opacity: 0.8;">
                                        ${discrepancy === 0 ? 'Cuadra perfecto' : discrepancy > 0 ? 'Sobrante' : 'Faltante'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Notes -->
                    <div class="form-group">
                        <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">
                            📝 Notas / Observaciones
                        </label>
                        <textarea id="reconciliationNotes"
                                  ${isClosed ? 'disabled' : ''}
                                  rows="3"
                                  style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;"
                                  placeholder="Observaciones, incidentes, o explicaciones sobre diferencias...">${reconciliation?.notes || ''}</textarea>
                    </div>

                    <!-- Action Buttons -->
                    ${!isClosed ? `
                        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                            <button type="submit" class="btn btn-primary" style="background: #10b981; color: white; padding: 0.75rem 1.5rem;">
                                💾 Guardar Cierre
                            </button>
                            ${isDirector ? `
                                <button type="button" onclick="closeDayConfirm('${today}')" class="btn" style="background: #ef4444; color: white; padding: 0.75rem 1.5rem;">
                                    🔒 Cerrar Día
                                </button>
                            ` : ''}
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 1rem; background: #fee2e2; border-radius: 6px;">
                            <strong>Este día ya está cerrado y no se puede modificar.</strong><br>
                            <small>Cerrado por ${reconciliation.closedByName} el ${new Date(reconciliation.closedAt).toLocaleString('es-ES')}</small>
                        </div>
                    `}
                </form>
            </div>

            <!-- Payment Details -->
            <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 1rem 0;">📋 Detalle de Pagos de Hoy</h3>

                ${dailyRevenue.payments.length === 0 ? `
                    <div style="text-align: center; padding: 2rem; color: #6b7280;">
                        No hay pagos registrados para hoy
                    </div>
                ` : `
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f3f4f6;">
                            <tr>
                                <th style="padding: 0.75rem; text-align: left;">Hora</th>
                                <th style="padding: 0.75rem; text-align: left;">Estudiante</th>
                                <th style="padding: 0.75rem; text-align: left;">Método</th>
                                <th style="padding: 0.75rem; text-align: right;">Monto</th>
                                <th style="padding: 0.75rem; text-align: left;">Registrado por</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dailyRevenue.payments.map(payment => {
                                const student = window.StudentManager.students.get(payment.studentId);
                                const time = payment.date ? new Date(payment.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-';
                                return `
                                    <tr style="border-top: 1px solid #e5e7eb;">
                                        <td style="padding: 0.75rem;">${time}</td>
                                        <td style="padding: 0.75rem;">${student?.nombre || 'N/A'}</td>
                                        <td style="padding: 0.75rem;">
                                            <span style="background: ${payment.method === 'Efectivo' ? '#10b981' : '#3b82f6'}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem;">
                                                ${payment.method} ${payment.bank ? '- ' + payment.bank : ''}
                                            </span>
                                        </td>
                                        <td style="padding: 0.75rem; text-align: right; font-weight: 600;">${formatCurrency(payment.amount)}</td>
                                        <td style="padding: 0.75rem; font-size: 0.85rem; color: #6b7280;">${payment.registeredByName || 'Sistema'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        <tfoot style="background: #f3f4f6; font-weight: bold;">
                            <tr>
                                <td colspan="3" style="padding: 0.75rem; text-align: right;">TOTAL:</td>
                                <td style="padding: 0.75rem; text-align: right;">${formatCurrency(dailyRevenue.total)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                `}
            </div>
        </div>
    `;
}

// ==================================================================================
// SECTION 4: WINDOW FUNCTIONS
// ==================================================================================

window.FinanceManager = new FinanceManager();

window.loadFinanceTab = async function() {
    console.log('💰 Loading finance tab');

    const container = document.getElementById('financeContainer');
    if (!container) {
        console.error('❌ Finance container not found');
        return;
    }

    await window.FinanceManager.init();

    container.innerHTML = renderFinanceDashboard();
};

window.loadDailyReconciliationView = function() {
    const container = document.getElementById('financeContainer');
    if (!container) return;

    container.innerHTML = renderDailyReconciliationView();
};

window.calculateDiscrepancy = function() {
    const openingBalance = parseFloat(document.getElementById('openingBalance').value) || 0;
    const closingCount = parseFloat(document.getElementById('closingCount').value) || 0;

    const today = new Date().toISOString().split('T')[0];
    const dailyRevenue = window.FinanceManager.calculateDailyRevenue(today);
    const todayExpenses = window.FinanceManager.getExpenses({ startDate: today, endDate: today });
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    const expectedClosing = openingBalance + dailyRevenue.cash - totalExpenses;
    const discrepancy = closingCount - expectedClosing;

    const amountEl = document.getElementById('discrepancyAmount');
    const statusEl = document.getElementById('discrepancyStatus');

    if (amountEl && statusEl) {
        amountEl.textContent = discrepancy === 0 ? '✓ $0' : (discrepancy > 0 ? '+' : '-') + formatCurrency(Math.abs(discrepancy));
        amountEl.style.color = discrepancy === 0 ? '#10b981' : discrepancy > 0 ? '#fbbf24' : '#ef4444';
        statusEl.textContent = discrepancy === 0 ? 'Cuadra perfecto' : discrepancy > 0 ? 'Sobrante' : 'Faltante';
    }
};

window.saveDailyReconciliation = async function(event) {
    event.preventDefault();

    const today = new Date().toISOString().split('T')[0];

    const data = {
        openingBalance: document.getElementById('openingBalance').value,
        closingCount: document.getElementById('closingCount').value,
        notes: document.getElementById('reconciliationNotes').value
    };

    try {
        // Get expenses for today
        const todayExpenses = window.FinanceManager.getExpenses({ startDate: today, endDate: today });
        data.expenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

        await window.FinanceManager.saveDailyReconciliation(today, data);
        window.showNotification('✅ Cierre guardado exitosamente', 'success');

        // Refresh view
        loadDailyReconciliationView();
    } catch (error) {
        console.error('Error saving reconciliation:', error);
        window.showNotification('❌ Error al guardar cierre', 'error');
    }
};

window.closeDayConfirm = async function(date) {
    if (!confirm('¿Está seguro de cerrar el día? No podrá modificar los datos después de cerrar.')) {
        return;
    }

    try {
        await window.FinanceManager.closeDay(date);
        window.showNotification('✅ Día cerrado exitosamente', 'success');
        loadDailyReconciliationView();
    } catch (error) {
        console.error('Error closing day:', error);
        window.showNotification('❌ Error al cerrar día: ' + error.message, 'error');
    }
};

// ==================================================================================
// EXPENSE MANAGEMENT VIEW
// ==================================================================================

window.loadExpensesView = function() {
    const container = document.getElementById('financeContainer');
    if (!container) return;

    const expenses = window.FinanceManager.getExpenses();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthExpenses = window.FinanceManager.getExpenses({
        startDate: currentMonth + '-01',
        endDate: currentMonth + '-31'
    });
    const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Group by category
    const byCategory = {};
    monthExpenses.forEach(expense => {
        if (!byCategory[expense.category]) {
            byCategory[expense.category] = { total: 0, count: 0 };
        }
        byCategory[expense.category].total += expense.amount;
        byCategory[expense.category].count++;
    });

    container.innerHTML = `
        <div style="padding: 2rem; max-width: 1200px; margin: 0 auto;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <div>
                    <button onclick="loadFinanceTab()" class="btn btn-secondary" style="margin-bottom: 0.5rem;">
                        ← Volver al Dashboard
                    </button>
                    <h1 style="margin: 0;">💸 Gestión de Gastos</h1>
                </div>
                <button onclick="showAddExpenseModal()" class="btn btn-primary" style="background: #ef4444; color: white;">
                    ➕ Registrar Gasto
                </button>
            </div>

            <!-- Monthly Summary -->
            <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 2rem;">
                <h2 style="margin: 0 0 1.5rem 0;">📊 Resumen del Mes Actual</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                    <div>
                        <div style="font-size: 0.9rem; color: #6b7280;">Total Gastado</div>
                        <div style="font-size: 2rem; font-weight: bold; color: #ef4444;">${formatCurrency(monthTotal)}</div>
                        <div style="font-size: 0.85rem; color: #6b7280;">${monthExpenses.length} gastos registrados</div>
                    </div>
                    ${Object.entries(byCategory).slice(0, 3).map(([category, data]) => `
                        <div>
                            <div style="font-size: 0.9rem; color: #6b7280;">${category}</div>
                            <div style="font-size: 1.5rem; font-weight: bold;">${formatCurrency(data.total)}</div>
                            <div style="font-size: 0.85rem; color: #6b7280;">${data.count} gastos</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Expenses Table -->
            <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 1rem 0;">📋 Historial de Gastos</h3>

                ${expenses.length === 0 ? `
                    <div style="text-align: center; padding: 3rem; color: #6b7280;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                        <p>No hay gastos registrados</p>
                        <button onclick="showAddExpenseModal()" class="btn btn-primary" style="margin-top: 1rem;">
                            ➕ Registrar Primer Gasto
                        </button>
                    </div>
                ` : `
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f3f4f6;">
                            <tr>
                                <th style="padding: 0.75rem; text-align: left;">Fecha</th>
                                <th style="padding: 0.75rem; text-align: left;">Categoría</th>
                                <th style="padding: 0.75rem; text-align: left;">Descripción</th>
                                <th style="padding: 0.75rem; text-align: right;">Monto</th>
                                <th style="padding: 0.75rem; text-align: left;">Registrado por</th>
                                <th style="padding: 0.75rem; text-align: center;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expenses.map(expense => `
                                <tr style="border-top: 1px solid #e5e7eb;">
                                    <td style="padding: 0.75rem;">${new Date(expense.date).toLocaleDateString('es-ES')}</td>
                                    <td style="padding: 0.75rem;">
                                        <span style="background: #e5e7eb; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem;">
                                            ${expense.category}
                                        </span>
                                    </td>
                                    <td style="padding: 0.75rem;">${expense.description || '-'}</td>
                                    <td style="padding: 0.75rem; text-align: right; font-weight: 600; color: #ef4444;">
                                        -${formatCurrency(expense.amount)}
                                    </td>
                                    <td style="padding: 0.75rem; font-size: 0.85rem; color: #6b7280;">
                                        ${expense.registeredByName || 'Sistema'}
                                    </td>
                                    <td style="padding: 0.75rem; text-align: center;">
                                        <button onclick="deleteExpenseConfirm('${expense.id}')" class="btn btn-sm" style="background: #ef4444; color: white; padding: 0.25rem 0.5rem;">
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot style="background: #f3f4f6; font-weight: bold;">
                            <tr>
                                <td colspan="3" style="padding: 0.75rem; text-align: right;">TOTAL:</td>
                                <td style="padding: 0.75rem; text-align: right; color: #ef4444;">
                                    -${formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
                                </td>
                                <td colspan="2"></td>
                            </tr>
                        </tfoot>
                    </table>
                `}
            </div>
        </div>
    `;
};

window.showAddExpenseModal = function() {
    const today = new Date().toISOString().split('T')[0];

    const modal = document.createElement('div');
    modal.id = 'expenseModal';
    modal.style.cssText = `
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
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%;">
            <h2 style="margin: 0 0 1.5rem 0;">➕ Registrar Gasto</h2>

            <form id="expenseForm" onsubmit="saveExpense(event)" style="display: grid; gap: 1rem;">
                <div class="form-group">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Categoría*</label>
                    <select id="expenseCategory" required style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                        <option value="">Seleccionar...</option>
                        ${Object.entries(ExpenseCategories).map(([key, label]) => `
                            <option value="${label}">${label}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Monto (COP)*</label>
                    <input type="number"
                           id="expenseAmount"
                           required
                           min="0"
                           step="1000"
                           placeholder="Ej: 50000"
                           style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                </div>

                <div class="form-group">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Fecha*</label>
                    <input type="date"
                           id="expenseDate"
                           value="${today}"
                           required
                           max="${today}"
                           style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                </div>

                <div class="form-group">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Descripción*</label>
                    <textarea id="expenseDescription"
                              required
                              rows="3"
                              placeholder="Ej: Pago arriendo del mes de octubre"
                              style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;"></textarea>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                    <button type="button" onclick="closeExpenseModal()" class="btn btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary" style="background: #ef4444; color: white;">
                        💾 Guardar Gasto
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
};

window.closeExpenseModal = function() {
    const modal = document.getElementById('expenseModal');
    if (modal) modal.remove();
};

window.saveExpense = async function(event) {
    event.preventDefault();

    const expenseData = {
        category: document.getElementById('expenseCategory').value,
        amount: document.getElementById('expenseAmount').value,
        date: document.getElementById('expenseDate').value,
        description: document.getElementById('expenseDescription').value
    };

    try {
        await window.FinanceManager.addExpense(expenseData);
        window.showNotification('✅ Gasto registrado exitosamente', 'success');
        closeExpenseModal();
        loadExpensesView();
    } catch (error) {
        console.error('Error saving expense:', error);
        window.showNotification('❌ Error al registrar gasto', 'error');
    }
};

window.deleteExpenseConfirm = async function(id) {
    if (!confirm('¿Está seguro de eliminar este gasto?')) return;

    try {
        await window.FinanceManager.deleteExpense(id);
        window.showNotification('✅ Gasto eliminado', 'success');
        loadExpensesView();
    } catch (error) {
        console.error('Error deleting expense:', error);
        window.showNotification('❌ Error al eliminar gasto', 'error');
    }
};

// ==================================================================================
// REPORTS VIEW
// ==================================================================================

window.loadReportsView = function() {
    const container = document.getElementById('financeContainer');
    if (!container) return;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const monthlyMetrics = window.FinanceManager.calculateMonthlyMetrics(currentYear, currentMonth);
    const expectedRevenue = window.FinanceManager.calculateExpectedMonthlyRevenue();
    const collectionRate = window.FinanceManager.calculateCollectionRate(currentYear, currentMonth);
    const studentGrowth = window.FinanceManager.calculateStudentGrowth(6);

    container.innerHTML = `
        <div style="padding: 2rem; max-width: 1200px; margin: 0 auto;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <div>
                    <button onclick="loadFinanceTab()" class="btn btn-secondary" style="margin-bottom: 0.5rem;">
                        ← Volver al Dashboard
                    </button>
                    <h1 style="margin: 0;">📊 Reportes Financieros</h1>
                </div>
                <button onclick="exportFinancialReport()" class="btn btn-primary" style="background: #8b5cf6; color: white;">
                    📥 Exportar Reporte
                </button>
            </div>

            <!-- Key Metrics -->
            <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 2rem;">
                <h2 style="margin: 0 0 1.5rem 0;">📈 Métricas Clave - ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h2>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                    <div style="text-align: center; padding: 1rem; background: #f0fdf4; border-radius: 8px;">
                        <div style="font-size: 0.9rem; color: #166534;">Ingresos</div>
                        <div style="font-size: 2rem; font-weight: bold; color: #16a34a;">${formatCurrency(monthlyMetrics.revenue)}</div>
                    </div>

                    <div style="text-align: center; padding: 1rem; background: #fef2f2; border-radius: 8px;">
                        <div style="font-size: 0.9rem; color: #991b1b;">Gastos</div>
                        <div style="font-size: 2rem; font-weight: bold; color: #dc2626;">${formatCurrency(monthlyMetrics.expenses)}</div>
                    </div>

                    <div style="text-align: center; padding: 1rem; background: #f0f9ff; border-radius: 8px;">
                        <div style="font-size: 0.9rem; color: #1e40af;">EBITDA</div>
                        <div style="font-size: 2rem; font-weight: bold; color: ${monthlyMetrics.ebitda >= 0 ? '#2563eb' : '#dc2626'};">
                            ${formatCurrency(monthlyMetrics.ebitda)}
                        </div>
                    </div>

                    <div style="text-align: center; padding: 1rem; background: #faf5ff; border-radius: 8px;">
                        <div style="font-size: 0.9rem; color: #6b21a8;">Margen</div>
                        <div style="font-size: 2rem; font-weight: bold; color: #7c3aed;">${monthlyMetrics.profitMargin.toFixed(1)}%</div>
                    </div>

                    <div style="text-align: center; padding: 1rem; background: #fffbeb; border-radius: 8px;">
                        <div style="font-size: 0.9rem; color: #92400e;">Tasa de Cobro</div>
                        <div style="font-size: 2rem; font-weight: bold; color: #d97706;">${collectionRate.rate.toFixed(1)}%</div>
                    </div>

                    <div style="text-align: center; padding: 1rem; background: #ecfdf5; border-radius: 8px;">
                        <div style="font-size: 0.9rem; color: #065f46;">Estudiantes Activos</div>
                        <div style="font-size: 2rem; font-weight: bold; color: #059669;">${expectedRevenue.activeStudents}</div>
                    </div>
                </div>
            </div>

            <!-- Revenue vs Expenses Chart -->
            <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 2rem;">
                <h3 style="margin: 0 0 1rem 0;">💰 Comparación Ingresos vs Gastos</h3>

                <div style="display: flex; gap: 2rem; align-items: center;">
                    <div style="flex: 1;">
                        <div style="margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span>Ingresos Esperados</span>
                                <span style="font-weight: bold;">${formatCurrency(expectedRevenue.totalExpected)}</span>
                            </div>
                            <div style="background: #e5e7eb; height: 30px; border-radius: 4px; overflow: hidden;">
                                <div style="background: #10b981; height: 100%; width: 100%;"></div>
                            </div>
                        </div>

                        <div style="margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span>Ingresos Reales</span>
                                <span style="font-weight: bold; color: ${monthlyMetrics.revenue >= expectedRevenue.totalExpected ? '#10b981' : '#f59e0b'};">
                                    ${formatCurrency(monthlyMetrics.revenue)}
                                </span>
                            </div>
                            <div style="background: #e5e7eb; height: 30px; border-radius: 4px; overflow: hidden;">
                                <div style="background: ${monthlyMetrics.revenue >= expectedRevenue.totalExpected ? '#10b981' : '#f59e0b'}; height: 100%; width: ${Math.min((monthlyMetrics.revenue / expectedRevenue.totalExpected) * 100, 100)}%;"></div>
                            </div>
                        </div>

                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span>Gastos Totales</span>
                                <span style="font-weight: bold; color: #ef4444;">${formatCurrency(monthlyMetrics.expenses)}</span>
                            </div>
                            <div style="background: #e5e7eb; height: 30px; border-radius: 4px; overflow: hidden;">
                                <div style="background: #ef4444; height: 100%; width: ${Math.min((monthlyMetrics.expenses / expectedRevenue.totalExpected) * 100, 100)}%;"></div>
                            </div>
                        </div>
                    </div>

                    <div style="text-align: center; padding: 2rem; background: ${monthlyMetrics.ebitda >= 0 ? '#f0fdf4' : '#fef2f2'}; border-radius: 12px;">
                        <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.5rem;">Utilidad Neta</div>
                        <div style="font-size: 3rem; font-weight: bold; color: ${monthlyMetrics.ebitda >= 0 ? '#10b981' : '#ef4444'};">
                            ${formatCurrency(Math.abs(monthlyMetrics.ebitda))}
                        </div>
                        <div style="font-size: 1rem; color: #6b7280;">${monthlyMetrics.ebitda >= 0 ? 'Ganancia' : 'Pérdida'}</div>
                    </div>
                </div>
            </div>

            <!-- Student Growth -->
            <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 2rem;">
                <h3 style="margin: 0 0 1rem 0;">📈 Crecimiento de Estudiantes (Últimos 6 Meses)</h3>

                <div style="display: flex; align-items: flex-end; gap: 1rem; height: 200px;">
                    ${studentGrowth.map(data => {
                        const maxCount = Math.max(...studentGrowth.map(d => d.count));
                        const heightPercent = (data.count / maxCount) * 100;
                        return `
                            <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                                <div style="font-size: 0.9rem; font-weight: bold; margin-bottom: 0.5rem;">${data.count}</div>
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 100%; height: ${heightPercent}%; min-height: 20px; border-radius: 4px 4px 0 0;"></div>
                                <div style="font-size: 0.75rem; margin-top: 0.5rem; text-align: center; color: #6b7280;">
                                    ${data.monthName.split(' ')[0]}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Expense Breakdown -->
            <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 1rem 0;">💸 Desglose de Gastos por Categoría</h3>

                ${monthlyMetrics.expenseBreakdown && Object.keys(monthlyMetrics.expenseBreakdown).length > 0 ? `
                    <div style="display: grid; gap: 0.5rem;">
                        ${Object.entries(monthlyMetrics.expenseBreakdown)
                            .sort((a, b) => b[1] - a[1])
                            .map(([category, amount]) => {
                                const percent = (amount / monthlyMetrics.expenses) * 100;
                                return `
                                    <div>
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                            <span style="font-size: 0.9rem;">${category}</span>
                                            <span style="font-weight: bold;">${formatCurrency(amount)} (${percent.toFixed(1)}%)</span>
                                        </div>
                                        <div style="background: #e5e7eb; height: 20px; border-radius: 4px; overflow: hidden;">
                                            <div style="background: #ef4444; height: 100%; width: ${percent}%; transition: width 0.3s;"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                    </div>
                ` : `
                    <div style="text-align: center; padding: 2rem; color: #6b7280;">
                        No hay gastos registrados este mes
                    </div>
                `}
            </div>
        </div>
    `;
};

window.exportFinancialReport = function() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const monthlyMetrics = window.FinanceManager.calculateMonthlyMetrics(currentYear, currentMonth);
    const expectedRevenue = window.FinanceManager.calculateExpectedMonthlyRevenue();
    const collectionRate = window.FinanceManager.calculateCollectionRate(currentYear, currentMonth);

    const reportText = `
===========================================
REPORTE FINANCIERO - CIUDAD BILINGÜE
${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
===========================================

MÉTRICAS PRINCIPALES:
---------------------
Ingresos del Mes:       ${formatCurrency(monthlyMetrics.revenue)}
Gastos del Mes:         ${formatCurrency(monthlyMetrics.expenses)}
EBITDA:                 ${formatCurrency(monthlyMetrics.ebitda)}
Margen de Utilidad:     ${monthlyMetrics.profitMargin.toFixed(1)}%

ESTUDIANTES:
-----------
Estudiantes Activos:    ${expectedRevenue.activeStudents}
Ingresos Esperados:     ${formatCurrency(expectedRevenue.totalExpected)}
Tasa de Cobro:          ${collectionRate.rate.toFixed(1)}%

DESGLOSE DE GASTOS:
------------------
${monthlyMetrics.expenseBreakdown ? Object.entries(monthlyMetrics.expenseBreakdown)
    .map(([category, amount]) => `${category}: ${formatCurrency(amount)}`)
    .join('\n') : 'Sin gastos registrados'}

===========================================
Generado: ${new Date().toLocaleString('es-ES')}
===========================================
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte-Financiero-${new Date().toISOString().slice(0, 7)}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    window.showNotification('✅ Reporte exportado exitosamente', 'success');
};

console.log('✅ Finance module loaded successfully');
