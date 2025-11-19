// ==================================================================================
// FINANCE.JS - COMPREHENSIVE FINANCIAL MANAGEMENT MODULE
// Version: 1.0
// Purpose: Revenue tracking, cash reconciliation, expense management, business metrics
// ==================================================================================

console.log('💰 Loading finance module...');

// ==================================================================================
// SECTION 1: EXPENSE CATEGORIES CONFIGURATION
// ==================================================================================

// Business Expense Categories
const BusinessExpenseCategories = {
    RENT: 'Arriendo Local',
    SALARIES: 'Salarios Profesores',
    WATER: 'Agua Negocio',
    ELECTRICITY: 'Luz Negocio',
    INTERNET: 'Internet Negocio',
    GOOGLE: 'Servicios Google',
    HOSTING: 'Hosting',
    MARKETING: 'Marketing',
    SUPPLIES: 'Materiales',
    MAINTENANCE: 'Mantenimiento',
    INVENTORY: 'Inventario/Compras',
    OTHER: 'Otros Negocio'
};

// Personal Expense Categories
const PersonalExpenseCategories = {
    RENT: 'Arriendo Vivienda',
    FOOD: 'Alimentación',
    TRANSPORT: 'Transporte',
    HEALTH: 'Salud',
    EDUCATION: 'Educación Personal',
    ENTERTAINMENT: 'Entretenimiento',
    WATER: 'Agua Hogar',
    ELECTRICITY: 'Luz Hogar',
    INTERNET: 'Internet Hogar',
    GAS: 'Gas',
    PHONE: 'Teléfono/Celular',
    CLOTHING: 'Ropa',
    INSURANCE: 'Seguros',
    SAVINGS: 'Ahorro/Inversión',
    OTHER: 'Otros Personal'
};

// Legacy support - defaults to business categories
const ExpenseCategories = BusinessExpenseCategories;

// ==================================================================================
// FINANCIAL CONTEXT - Business, Personal, or Combined
// ==================================================================================

// Global variable to track current financial context
window.financialContext = localStorage.getItem('financialContext') || 'business'; // 'business' | 'personal' | 'combined'

// Function to set financial context and persist it
window.setFinancialContext = function(context) {
    window.financialContext = context;
    localStorage.setItem('financialContext', context);
    console.log('💼 Financial context set to:', context);
};

// ==================================================================================
// DATE HELPERS - Imported from date-utils.js
// ==================================================================================
// Functions: window.getLocalDate(), window.getLocalDateTime()
// Aliases: window.window.getTodayInColombia(), window.getColombiaDateTime()

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

/**
 * Format currency input as user types (for input fields)
 * @param {HTMLInputElement} input - The input element to format
 */
function formatCurrencyInput(input) {
    // Get cursor position before formatting
    const cursorPosition = input.selectionStart;
    const oldLength = input.value.length;

    // Remove all non-digit characters
    let value = input.value.replace(/\D/g, '');

    // Don't format if empty
    if (value === '') {
        input.value = '';
        return;
    }

    // Convert to number and format
    const numericValue = parseInt(value, 10);
    const formatted = numericValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = `$${formatted}`;

    // Restore cursor position (accounting for added characters)
    const newLength = input.value.length;
    const newPosition = cursorPosition + (newLength - oldLength);
    input.setSelectionRange(newPosition, newPosition);
}

/**
 * Parse currency input to get numeric value
 * @param {string|number} value - The formatted currency string or number
 * @returns {number} The numeric value
 */
function parseCurrencyInput(value) {
    if (!value && value !== 0) return 0;

    // If already a number, return it
    if (typeof value === 'number') return value;

    // If string, parse it
    if (typeof value === 'string') {
        // Remove $ and dots, then parse
        const cleaned = value.replace(/[\$\.]/g, '');
        return parseInt(cleaned, 10) || 0;
    }

    return 0;
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
                amount: parseCurrencyInput(expenseData.amount),
                category: expenseData.category,
                description: expenseData.description,
                date: expenseData.date || window.getTodayInColombia(),
                type: expenseData.type || 'business', // 'business' | 'personal'
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

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Gasto registrado',
                    'expense',
                    id,
                    `${expense.category} - $${expense.amount.toLocaleString()} - ${expense.description}`,
                    {
                        after: {
                            categoria: expense.category,
                            monto: expense.amount,
                            descripcion: expense.description,
                            fecha: expense.date
                        }
                    }
                );
            }

            return expense;
        } catch (error) {
            console.error('❌ Error adding expense:', error);
            throw error;
        }
    }

    async deleteExpense(id) {
        try {
            const expense = this.expenses.get(id);

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `expenses/${id}`);
            await db.remove(ref);

            this.expenses.delete(id);
            console.log('✅ Expense deleted:', id);

            // Audit log
            if (expense && typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Gasto eliminado',
                    'expense',
                    id,
                    `${expense.category} - $${expense.amount.toLocaleString()} - ${expense.description}`,
                    {
                        before: {
                            categoria: expense.category,
                            monto: expense.amount,
                            descripcion: expense.description,
                            fecha: expense.date
                        }
                    }
                );
            }

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
                console.log('📥 Loading reconciliations from Firebase:', data);
                Object.entries(data).forEach(([date, reconciliation]) => {
                    console.log(`📥 Loading reconciliation for ${date}:`, reconciliation);
                    console.log(`📥   - openingBalance: ${reconciliation.openingBalance}`);
                    console.log(`📥   - closingCount: ${reconciliation.closingCount}`);
                    console.log(`📥   - expenses: ${reconciliation.expenses}`);
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
            console.log('💾 Saving reconciliation - RAW data received:', data);

            const reconciliation = {
                date,
                openingBalance: parseCurrencyInput(data.openingBalance),
                closingCount: parseCurrencyInput(data.closingCount),
                expenses: parseFloat(data.expenses) || 0,
                notes: data.notes || '',
                isClosed: data.isClosed || false,
                closedBy: data.closedBy || null,
                closedAt: data.closedAt || null,
                registeredBy: window.FirebaseData.currentUser?.uid,
                registeredByName: window.FirebaseData.currentUser?.email,
                updatedAt: new Date().toISOString()
            };

            console.log('💾 Reconciliation PARSED data to save:', reconciliation);
            console.log('💾 Parsed openingBalance:', reconciliation.openingBalance);
            console.log('💾 Parsed closingCount:', reconciliation.closingCount);
            console.log('💾 Parsed expenses:', reconciliation.expenses);

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `dailyReconciliations/${date}`);
            await db.set(ref, reconciliation);

            this.dailyReconciliations.set(date, reconciliation);
            console.log('✅ Reconciliation saved for:', date, '- Full object:', reconciliation);

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Cierre diario guardado',
                    'reconciliation',
                    date,
                    `Fecha: ${date} - Apertura: $${reconciliation.openingBalance.toLocaleString()} - Cierre: $${reconciliation.closingCount.toLocaleString()}`,
                    {
                        after: {
                            fecha: date,
                            saldoApertura: reconciliation.openingBalance,
                            efectivoCierre: reconciliation.closingCount,
                            gastos: reconciliation.expenses,
                            diferencia: reconciliation.closingCount - reconciliation.openingBalance - reconciliation.expenses,
                            cerrado: reconciliation.isClosed
                        }
                    }
                );
            }

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

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Día cerrado',
                    'reconciliation',
                    date,
                    `Día ${date} cerrado - Apertura: $${reconciliation.openingBalance.toLocaleString()} - Cierre: $${reconciliation.closingCount.toLocaleString()}`,
                    {
                        after: {
                            fecha: date,
                            cerrado: true,
                            cerradoPor: reconciliation.closedByName,
                            fechaCierre: reconciliation.closedAt
                        }
                    }
                );
            }

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

    async calculateDailyRevenue(date) {
        // Query Firebase directly instead of using in-memory cache
        const db = window.firebaseModules.database;

        // Get student tuition payments
        const paymentsRef = db.ref(window.FirebaseData.database, 'payments');
        const paymentsSnapshot = await db.get(paymentsRef);

        let payments = [];
        if (paymentsSnapshot.exists()) {
            const paymentsData = paymentsSnapshot.val();
            payments = Object.entries(paymentsData)
                .map(([id, payment]) => ({ id, ...payment }))
                .filter(p => {
                    const paymentDate = p.date ? p.date.split('T')[0] : null;
                    return paymentDate === date;
                });
        }

        const cashPayments = payments.filter(p => p.method === 'Efectivo');
        const transferPayments = payments.filter(p => p.method === 'Transferencia');

        const cashTotal = cashPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const transferTotal = transferPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Get tienda sales
        const salesRef = db.ref(window.FirebaseData.database, 'sales');
        const salesSnapshot = await db.get(salesRef);

        let tiendaSales = [];
        let tiendaCash = 0;
        let tiendaTransfers = 0;
        let tiendaNequi = 0;
        let tiendaBancolombia = 0;

        if (salesSnapshot.exists()) {
            const salesData = salesSnapshot.val();
            tiendaSales = Object.entries(salesData)
                .map(([id, sale]) => ({ id, ...sale }))
                .filter(s => {
                    const saleDate = s.date ? s.date.split('T')[0] : null;
                    return saleDate === date;
                });

            // Calculate tienda totals by payment method
            tiendaSales.forEach(sale => {
                const amount = sale.total || 0;
                if (sale.paymentMethod === 'Efectivo') {
                    tiendaCash += amount;
                } else if (sale.paymentMethod === 'Nequi') {
                    tiendaNequi += amount;
                } else if (sale.paymentMethod === 'Bancolombia') {
                    tiendaBancolombia += amount;
                }
            });

            tiendaTransfers = tiendaNequi + tiendaBancolombia;
        }

        return {
            // Combined totals
            total: cashTotal + transferTotal + tiendaCash + tiendaTransfers,
            cash: cashTotal + tiendaCash,
            transfers: transferTotal + tiendaTransfers,
            cashCount: cashPayments.length,
            transferCount: transferPayments.length,
            payments: payments,

            // Tuition breakdown
            tuitionTotal: cashTotal + transferTotal,
            tuitionCash: cashTotal,
            tuitionTransfers: transferTotal,

            // Tienda breakdown
            tiendaTotal: tiendaCash + tiendaTransfers,
            tiendaCash: tiendaCash,
            tiendaTransfers: tiendaTransfers,
            tiendaNequi: tiendaNequi,
            tiendaBancolombia: tiendaBancolombia,
            tiendaSalesCount: tiendaSales.length,
            tiendaSales: tiendaSales
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

    async calculateMonthlyMetrics(year, month) {
        // Get all payments for the month
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        const payments = Array.from(window.PaymentManager.payments.values()).filter(p => {
            const paymentDate = p.date ? p.date.split('T')[0] : null;
            return paymentDate >= startDate && paymentDate <= endDate;
        });

        const tuitionRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Get tienda sales for the month
        const db = window.firebaseModules.database;
        const salesRef = db.ref(window.FirebaseData.database, 'sales');
        const salesSnapshot = await db.get(salesRef);

        let tiendaRevenue = 0;
        let tiendaCost = 0;
        let tiendaSalesCount = 0;

        if (salesSnapshot.exists()) {
            const salesData = salesSnapshot.val();
            const tiendaSales = Object.values(salesData).filter(s => {
                const saleDate = s.date ? s.date.split('T')[0] : null;
                return saleDate >= startDate && saleDate <= endDate;
            });

            tiendaRevenue = tiendaSales.reduce((sum, s) => sum + (s.total || 0), 0);
            tiendaSalesCount = tiendaSales.length;

            // Calculate cost of goods sold for tienda
            if (window.ProductManager?.products) {
                tiendaSales.forEach(sale => {
                    sale.items?.forEach(item => {
                        const product = window.ProductManager.products.get(item.productId);
                        if (product) {
                            tiendaCost += product.cost * item.quantity;
                        }
                    });
                });
            }
        }

        const totalRevenue = tuitionRevenue + tiendaRevenue;

        // Get expenses for the month
        const expenses = this.getExpenses({ startDate, endDate });
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        // Calculate profit (including COGS for tienda)
        const grossProfit = totalRevenue - totalExpenses - tiendaCost;

        // EBITDA (in this simple case, same as gross profit since we don't track depreciation/amortization)
        const ebitda = grossProfit;

        // Calculate margin
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        // Calculate tienda profit margin
        const tiendaProfit = tiendaRevenue - tiendaCost;
        const tiendaMargin = tiendaRevenue > 0 ? (tiendaProfit / tiendaRevenue) * 100 : 0;

        return {
            revenue: totalRevenue,
            tuitionRevenue,
            tiendaRevenue,
            tiendaCost,
            tiendaProfit,
            tiendaMargin,
            tiendaSalesCount,
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

    async calculateCollectionRate(year, month) {
        const expectedRevenue = this.calculateExpectedMonthlyRevenue();
        const monthlyMetrics = await this.calculateMonthlyMetrics(year, month);
        const actualRevenue = monthlyMetrics.tuitionRevenue; // Only tuition for collection rate

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
async function renderFinanceDashboard() {
    const today = window.getTodayInColombia();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Get current financial context
    const isAdmin = window.userRole === 'admin' || window.userRole === 'director';
    const context = isAdmin ? (window.financialContext || 'business') : 'business';

    console.log('💰 Rendering dashboard with context:', context);

    // Get monthly expenses filtered by context
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;
    const allExpenses = window.FinanceManager.getExpenses({ startDate, endDate });

    let monthlyExpenses = 0;
    let monthlyExpensesBusiness = 0;
    let monthlyExpensesPersonal = 0;

    if (context === 'business') {
        const businessExpenses = allExpenses.filter(e => !e.type || e.type === 'business');
        monthlyExpenses = businessExpenses.reduce((sum, e) => sum + e.amount, 0);
    } else if (context === 'personal') {
        const personalExpenses = allExpenses.filter(e => e.type === 'personal');
        monthlyExpenses = personalExpenses.reduce((sum, e) => sum + e.amount, 0);
    } else {
        // Combined
        const businessExpenses = allExpenses.filter(e => !e.type || e.type === 'business');
        const personalExpenses = allExpenses.filter(e => e.type === 'personal');
        monthlyExpensesBusiness = businessExpenses.reduce((sum, e) => sum + e.amount, 0);
        monthlyExpensesPersonal = personalExpenses.reduce((sum, e) => sum + e.amount, 0);
        monthlyExpenses = monthlyExpensesBusiness + monthlyExpensesPersonal;
    }

    // Get otros ingresos filtered by context
    const db = window.firebaseModules.database;
    const otrosIngresosRef = db.ref(window.FirebaseData.database, 'otrosIngresos');
    const otrosSnapshot = await db.get(otrosIngresosRef);

    let otrosIngresosTotal = 0;
    let otrosIngresosBusiness = 0;
    let otrosIngresosPersonal = 0;

    if (otrosSnapshot.exists()) {
        const allOtrosIngresos = Object.values(otrosSnapshot.val()).filter(i =>
            i.fecha && i.fecha.startsWith(`${currentYear}-${String(currentMonth).padStart(2, '0')}`)
        );

        if (context === 'business') {
            const businessIngresos = allOtrosIngresos.filter(i => !i.type || i.type === 'business');
            otrosIngresosTotal = businessIngresos.reduce((sum, i) => sum + (i.monto || 0), 0);
        } else if (context === 'personal') {
            const personalIngresos = allOtrosIngresos.filter(i => i.type === 'personal');
            otrosIngresosTotal = personalIngresos.reduce((sum, i) => sum + (i.monto || 0), 0);
        } else {
            // Combined
            const businessIngresos = allOtrosIngresos.filter(i => !i.type || i.type === 'business');
            const personalIngresos = allOtrosIngresos.filter(i => i.type === 'personal');
            otrosIngresosBusiness = businessIngresos.reduce((sum, i) => sum + (i.monto || 0), 0);
            otrosIngresosPersonal = personalIngresos.reduce((sum, i) => sum + (i.monto || 0), 0);
            otrosIngresosTotal = otrosIngresosBusiness + otrosIngresosPersonal;
        }
    }

    // Get business data (only for business and combined contexts)
    let dailyRevenue, reconciliation, expectedRevenue, monthlyMetrics, collectionRate;
    let expectedClosing = 0;
    let discrepancy = 0;

    if (context !== 'personal') {
        dailyRevenue = await window.FinanceManager.calculateDailyRevenue(today);
        reconciliation = window.FinanceManager.getDailyReconciliation(today);
        expectedRevenue = window.FinanceManager.calculateExpectedMonthlyRevenue();
        monthlyMetrics = await window.FinanceManager.calculateMonthlyMetrics(currentYear, currentMonth);
        collectionRate = await window.FinanceManager.calculateCollectionRate(currentYear, currentMonth);

        // Calculate discrepancy if reconciliation exists
        if (reconciliation) {
            expectedClosing = reconciliation.openingBalance + dailyRevenue.cash - reconciliation.expenses;
            discrepancy = reconciliation.closingCount - expectedClosing;
        }
    }

    return `
        <div style="padding: 2rem;">
            <!-- Page Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h1 style="margin: 0;">
                    💰 Dashboard Financiero
                    ${context === 'business' ? '- 🏢 Negocio' : context === 'personal' ? '- 🏠 Personal' : '- 📊 Combinado'}
                </h1>
                <div style="display: flex; gap: 1rem;">
                    ${context !== 'personal' ? `
                    <button onclick="loadDailyReconciliationView()" class="btn" style="background: #3b82f6; color: white;">
                        📋 Cierre Diario
                    </button>
                    ` : ''}
                    <button onclick="loadTodayMovementsView()" class="btn" style="background: #f59e0b; color: white;">
                        📊 Ingresos y Gastos Hoy
                    </button>
                    <button onclick="loadExpensesView()" class="btn" style="background: #8b5cf6; color: white;">
                        💸 Gastos
                    </button>
                    <button onclick="loadReportsView()" class="btn" style="background: #10b981; color: white;">
                        📊 Reportes
                    </button>
                </div>
            </div>

            ${context === 'personal' ? `
                <!-- PERSONAL VIEW -->
                <!-- Monthly Overview - Personal -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                    <!-- Personal Income Card -->
                    <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                            <div style="background: #10b981; width: 50px; height: 50px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                                💰
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; color: #6b7280;">Ingresos Personales</div>
                                <div style="font-size: 1.5rem; font-weight: bold; color: #1f2937;">${formatCurrency(otrosIngresosTotal)}</div>
                            </div>
                        </div>
                        <div style="font-size: 0.85rem; color: #6b7280;">Este mes</div>
                    </div>

                    <!-- Personal Expenses Card -->
                    <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                            <div style="background: #ef4444; width: 50px; height: 50px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                                💸
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; color: #6b7280;">Gastos Personales</div>
                                <div style="font-size: 1.5rem; font-weight: bold; color: #1f2937;">${formatCurrency(monthlyExpenses)}</div>
                            </div>
                        </div>
                        <div style="font-size: 0.85rem; color: #6b7280;">Este mes</div>
                    </div>

                    <!-- Personal Balance Card -->
                    <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                            <div style="background: ${otrosIngresosTotal - monthlyExpenses >= 0 ? '#8b5cf6' : '#f59e0b'}; width: 50px; height: 50px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                                📊
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; color: #6b7280;">Balance Personal</div>
                                <div style="font-size: 1.5rem; font-weight: bold; color: ${otrosIngresosTotal - monthlyExpenses >= 0 ? '#10b981' : '#ef4444'};">
                                    ${formatCurrency(otrosIngresosTotal - monthlyExpenses)}
                                </div>
                            </div>
                        </div>
                        <div style="font-size: 0.85rem; color: #6b7280;">${otrosIngresosTotal > 0 ? ((otrosIngresosTotal - monthlyExpenses) / otrosIngresosTotal * 100).toFixed(1) : 0}% margen</div>
                    </div>
                </div>
            ` : context === 'business' ? `
                <!-- BUSINESS VIEW -->
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

                <!-- Monthly Overview - Business -->
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
                                <div style="font-size: 1.5rem; font-weight: bold; color: #1f2937;">${formatCurrency(monthlyMetrics.tuitionRevenue + monthlyMetrics.tiendaRevenue + otrosIngresosTotal)}</div>
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
                                <div style="font-size: 1.5rem; font-weight: bold; color: #1f2937;">${formatCurrency(monthlyExpenses)}</div>
                            </div>
                        </div>
                        <div style="font-size: 0.85rem; color: #6b7280;">Negocio</div>
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
            ` : `
                <!-- COMBINED VIEW -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                    <!-- Business Column -->
                    <div>
                        <h3 style="margin: 0 0 1rem 0; color: #3b82f6;">🏢 Negocio</h3>
                        <div style="display: grid; gap: 1rem;">
                            <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="font-size: 0.85rem; color: #6b7280;">Ingresos del Mes</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: #10b981;">
                                    ${formatCurrency(monthlyMetrics.tuitionRevenue + monthlyMetrics.tiendaRevenue + otrosIngresosBusiness)}
                                </div>
                            </div>
                            <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="font-size: 0.85rem; color: #6b7280;">Gastos del Mes</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: #ef4444;">
                                    ${formatCurrency(monthlyExpensesBusiness + monthlyMetrics.tiendaCost)}
                                </div>
                            </div>
                            <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="font-size: 0.85rem; color: #6b7280;">Balance Negocio</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: ${monthlyMetrics.ebitda >= 0 ? '#10b981' : '#ef4444'};">
                                    ${formatCurrency(monthlyMetrics.ebitda)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Personal Column -->
                    <div>
                        <h3 style="margin: 0 0 1rem 0; color: #ec4899;">🏠 Personal</h3>
                        <div style="display: grid; gap: 1rem;">
                            <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="font-size: 0.85rem; color: #6b7280;">Ingresos del Mes</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: #10b981;">
                                    ${formatCurrency(otrosIngresosPersonal)}
                                </div>
                            </div>
                            <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="font-size: 0.85rem; color: #6b7280;">Gastos del Mes</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: #ef4444;">
                                    ${formatCurrency(monthlyExpensesPersonal)}
                                </div>
                            </div>
                            <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="font-size: 0.85rem; color: #6b7280;">Balance Personal</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: ${(otrosIngresosPersonal - monthlyExpensesPersonal) >= 0 ? '#10b981' : '#ef4444'};">
                                    ${formatCurrency(otrosIngresosPersonal - monthlyExpensesPersonal)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `}

            <!-- Quick Actions -->
            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 1rem 0;">Acciones Rápidas</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    ${(window.financialContext || 'business') !== 'personal' ? `
                    <button onclick="loadDailyReconciliationView()" class="btn" style="background: #3b82f6; color: white; padding: 1rem;">
                        📋 Abrir Cierre Diario
                    </button>
                    ` : ''}
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
async function renderDailyReconciliationView() {
    const today = window.getTodayInColombia();
    const reconciliation = window.FinanceManager.getDailyReconciliation(today);
    const dailyRevenue = await window.FinanceManager.calculateDailyRevenue(today);

    // Get students map for names
    const db = window.firebaseModules.database;
    const studentsRef = db.ref(window.FirebaseData.database, 'students');
    const studentsSnapshot = await db.get(studentsRef);
    const students = new Map();
    if (studentsSnapshot.exists()) {
        const studentsData = studentsSnapshot.val();
        Object.entries(studentsData).forEach(([id, student]) => {
            students.set(id, student);
        });
    }

    console.log('🎨 Rendering Cierre Diario for:', today);
    console.log('🎨 Reconciliation object:', reconciliation);

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

    console.log('🎨 Display values:');
    console.log('🎨   - openingBalance:', openingBalance, '(formatted:', formatCurrency(openingBalance) + ')');
    console.log('🎨   - actualClosing:', actualClosing, '(formatted:', formatCurrency(actualClosing) + ')');
    console.log('🎨   - dailyRevenue.cash:', dailyRevenue.cash);
    console.log('🎨   - totalExpenses:', totalExpenses);

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
                        <input type="text"
                               id="openingBalance"
                               value="${formatCurrency(openingBalance)}"
                               ${isClosed ? 'disabled' : ''}
                               oninput="formatCurrencyInput(this)"
                               style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 1.1rem;"
                               placeholder="$500.000">
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

                        ${dailyRevenue.cashCount > 0 ? `
                            <button type="button"
                                    onclick="toggleCashDetails()"
                                    class="btn btn-sm"
                                    style="background: #10b981; color: white; margin-top: 0.5rem; width: 100%;">
                                <span id="cashToggleIcon">▼</span> Ver Detalles
                            </button>
                            <div id="cashDetails" style="display: none; margin-top: 0.75rem; max-height: 300px; overflow-y: auto;">
                                ${dailyRevenue.payments
                                    .filter(p => p.method === 'Efectivo')
                                    .map(payment => {
                                        const student = students.get(payment.studentId);
                                        return `
                                            <div style="background: white; padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 6px; border-left: 3px solid #10b981;">
                                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                                    <div style="flex: 1;">
                                                        <div style="font-weight: 600; color: #1f2937; margin-bottom: 0.25rem;">
                                                            👤 ${student?.nombre || 'Estudiante no encontrado'}
                                                        </div>
                                                        <div style="font-size: 0.85rem; color: #6b7280; margin-bottom: 0.25rem;">
                                                            💵 Efectivo
                                                        </div>
                                                        ${payment.invoiceNumber ? `
                                                            <div style="font-size: 0.75rem; color: #9ca3af;">
                                                                📄 ${payment.invoiceNumber}
                                                            </div>
                                                        ` : ''}
                                                        ${payment.notes ? `
                                                            <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.25rem;">
                                                                💬 ${payment.notes}
                                                            </div>
                                                        ` : ''}
                                                    </div>
                                                    <div style="text-align: right;">
                                                        <div style="font-size: 1.1rem; font-weight: bold; color: #10b981;">
                                                            ${formatCurrency(payment.amount)}
                                                        </div>
                                                        <div style="font-size: 0.75rem; color: #6b7280;">
                                                            ${new Date(payment.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                            </div>
                        ` : ''}
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

                        ${dailyRevenue.transferCount > 0 ? `
                            <button type="button"
                                    onclick="toggleTransferDetails()"
                                    class="btn btn-sm"
                                    style="background: #3b82f6; color: white; margin-top: 0.5rem; width: 100%;">
                                <span id="transferToggleIcon">▼</span> Ver Detalles
                            </button>
                            <div id="transferDetails" style="display: none; margin-top: 0.75rem; max-height: 300px; overflow-y: auto;">
                                ${dailyRevenue.payments
                                    .filter(p => p.method === 'Transferencia')
                                    .map(payment => {
                                        const student = students.get(payment.studentId);
                                        return `
                                            <div style="background: white; padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 6px; border-left: 3px solid #3b82f6;">
                                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                                    <div style="flex: 1;">
                                                        <div style="font-weight: 600; color: #1f2937; margin-bottom: 0.25rem;">
                                                            👤 ${student?.nombre || 'Estudiante no encontrado'}
                                                        </div>
                                                        <div style="font-size: 0.85rem; color: #6b7280; margin-bottom: 0.25rem;">
                                                            ${payment.bank ? `🏦 ${payment.bank}` : 'Transferencia'}
                                                        </div>
                                                        ${payment.invoiceNumber ? `
                                                            <div style="font-size: 0.75rem; color: #9ca3af;">
                                                                📄 ${payment.invoiceNumber}
                                                            </div>
                                                        ` : ''}
                                                        ${payment.notes ? `
                                                            <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.25rem;">
                                                                💬 ${payment.notes}
                                                            </div>
                                                        ` : ''}
                                                    </div>
                                                    <div style="text-align: right;">
                                                        <div style="font-size: 1.1rem; font-weight: bold; color: #3b82f6;">
                                                            ${formatCurrency(payment.amount)}
                                                        </div>
                                                        <div style="font-size: 0.75rem; color: #6b7280;">
                                                            ${new Date(payment.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                            </div>
                        ` : ''}
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
                        <input type="text"
                               id="closingCount"
                               value="${formatCurrency(actualClosing)}"
                               ${isClosed ? 'disabled' : ''}
                               oninput="formatCurrencyInput(this); calculateDiscrepancy()"
                               style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 1.1rem;"
                               placeholder="$2.750.000">
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
                                const student = students.get(payment.studentId);
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

window.loadFinanceTab = async function(activeTab = 'dashboard') {
    console.log('💰 Loading finance tab, activeTab:', activeTab);

    const container = document.getElementById('financeContainer');
    if (!container) {
        console.error('❌ Finance container not found');
        return;
    }

    await window.FinanceManager.init();

    // Check user permissions - use window.userRole which is set during login
    console.log('🔍 DEBUG - window.userRole value:', window.userRole);
    const userRole = window.userRole || 'vendedor';
    const isAdmin = userRole === 'admin' || userRole === 'director'; // Director has admin privileges
    const isDirector = userRole === 'director';
    const canViewAdvanced = isAdmin || isDirector;

    console.log('🔐 Permission check:', { userRole, isAdmin, isDirector, canViewAdvanced });

    // Get current financial context - Admin and Director can use personal/combined
    const currentContext = isAdmin ? (window.financialContext || 'business') : 'business';

    // Render tabs header
    const tabsHeader = `
        <div style="background: white; border-bottom: 2px solid #e5e7eb; margin-bottom: 0;">
            <div style="padding: 1rem 2rem 0 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h1 style="margin: 0;">💰 Módulo de Finanzas</h1>

                    <!-- Financial Context Selector - ADMIN ONLY -->
                    ${isAdmin ? `
                    <div style="display: flex; gap: 0.5rem; background: #f3f4f6; padding: 0.25rem; border-radius: 8px;">
                        <button onclick="changeFinancialContext('business')" style="padding: 0.5rem 1rem; border: none; background: ${currentContext === 'business' ? '#3b82f6' : 'transparent'}; color: ${currentContext === 'business' ? 'white' : '#6b7280'}; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.9rem; transition: all 0.2s;">
                            🏢 Negocio
                        </button>
                        <button onclick="changeFinancialContext('personal')" style="padding: 0.5rem 1rem; border: none; background: ${currentContext === 'personal' ? '#3b82f6' : 'transparent'}; color: ${currentContext === 'personal' ? 'white' : '#6b7280'}; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.9rem; transition: all 0.2s;">
                            🏠 Personal
                        </button>
                        <button onclick="changeFinancialContext('combined')" style="padding: 0.5rem 1rem; border: none; background: ${currentContext === 'combined' ? '#3b82f6' : 'transparent'}; color: ${currentContext === 'combined' ? 'white' : '#6b7280'}; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.9rem; transition: all 0.2s;">
                            📊 Combinado
                        </button>
                    </div>
                    ` : ''}
                </div>
                <div style="display: flex; gap: 0.5rem; overflow-x: auto;">
                    <button onclick="loadFinanceTab('dashboard')" class="finance-tab ${activeTab === 'dashboard' ? 'active' : ''}" style="padding: 0.75rem 1.5rem; border: none; background: ${activeTab === 'dashboard' ? '#3b82f6' : 'transparent'}; color: ${activeTab === 'dashboard' ? 'white' : '#6b7280'}; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 500; white-space: nowrap;">
                        📊 Dashboard
                    </button>
                    ${currentContext !== 'personal' ? `
                    <button onclick="loadFinanceTab('cierre')" class="finance-tab ${activeTab === 'cierre' ? 'active' : ''}" style="padding: 0.75rem 1.5rem; border: none; background: ${activeTab === 'cierre' ? '#3b82f6' : 'transparent'}; color: ${activeTab === 'cierre' ? 'white' : '#6b7280'}; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 500; white-space: nowrap;">
                        📋 Cierre Diario
                    </button>
                    ` : ''}
                    ${canViewAdvanced ? `
                        <button onclick="loadFinanceTab('otros-ingresos')" class="finance-tab ${activeTab === 'otros-ingresos' ? 'active' : ''}" style="padding: 0.75rem 1.5rem; border: none; background: ${activeTab === 'otros-ingresos' ? '#3b82f6' : 'transparent'}; color: ${activeTab === 'otros-ingresos' ? 'white' : '#6b7280'}; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 500; white-space: nowrap;">
                            💵 Otros Ingresos
                        </button>
                        <button onclick="loadFinanceTab('gastos')" class="finance-tab ${activeTab === 'gastos' ? 'active' : ''}" style="padding: 0.75rem 1.5rem; border: none; background: ${activeTab === 'gastos' ? '#3b82f6' : 'transparent'}; color: ${activeTab === 'gastos' ? 'white' : '#6b7280'}; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 500; white-space: nowrap;">
                            💸 Gastos
                        </button>
                        <button onclick="loadFinanceTab('reportes')" class="finance-tab ${activeTab === 'reportes' ? 'active' : ''}" style="padding: 0.75rem 1.5rem; border: none; background: ${activeTab === 'reportes' ? '#3b82f6' : 'transparent'}; color: ${activeTab === 'reportes' ? 'white' : '#6b7280'}; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 500; white-space: nowrap;">
                            📈 Reportes Avanzados
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    // Render content based on active tab
    let content = '';
    switch(activeTab) {
        case 'dashboard':
            content = await renderFinanceDashboard();
            break;
        case 'cierre':
            content = await renderDailyReconciliationView();
            break;
        case 'otros-ingresos':
            if (canViewAdvanced) {
                content = await renderOtrosIngresosView();
            } else {
                content = '<div style="padding: 2rem; text-align: center;">❌ No tienes permisos para ver esta sección</div>';
            }
            break;
        case 'gastos':
            if (canViewAdvanced) {
                content = await renderExpensesViewEnhanced();
            } else {
                content = '<div style="padding: 2rem; text-align: center;">❌ No tienes permisos para ver esta sección</div>';
            }
            break;
        case 'reportes':
            if (canViewAdvanced) {
                content = await renderAdvancedReportsView();
            } else {
                content = '<div style="padding: 2rem; text-align: center;">❌ No tienes permisos para ver esta sección</div>';
            }
            break;
        default:
            content = await renderFinanceDashboard();
    }

    console.log('📝 Rendering tabs. Advanced tabs visible:', canViewAdvanced);
    console.log('📄 Tab header HTML length:', tabsHeader.length);

    container.innerHTML = tabsHeader + content;

    console.log('✅ Finance tab loaded successfully');
};

// Change financial context and reload current tab
window.changeFinancialContext = function(context) {
    window.setFinancialContext(context);

    // Reload the finance module to reflect the new context
    const currentTab = getCurrentActiveTab();
    window.loadFinanceTab(currentTab);
};

// Helper function to get current active tab
function getCurrentActiveTab() {
    const tabs = ['dashboard', 'cierre', 'otros-ingresos', 'gastos', 'reportes'];

    // Try to detect from URL hash if available
    if (window.location.hash) {
        const hashTab = window.location.hash.substring(1);
        if (tabs.includes(hashTab)) return hashTab;
    }

    // Default to dashboard
    return 'dashboard';
}

window.loadDailyReconciliationView = async function() {
    const container = document.getElementById('financeContainer');
    if (!container) return;

    container.innerHTML = await renderDailyReconciliationView();
};

window.calculateDiscrepancy = async function() {
    const openingBalance = parseCurrencyInput(document.getElementById('openingBalance').value);
    const closingCount = parseCurrencyInput(document.getElementById('closingCount').value);

    const today = window.getTodayInColombia();
    const dailyRevenue = await window.FinanceManager.calculateDailyRevenue(today);
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

window.toggleTransferDetails = function() {
    const details = document.getElementById('transferDetails');
    const icon = document.getElementById('transferToggleIcon');

    if (details && icon) {
        if (details.style.display === 'none') {
            details.style.display = 'block';
            icon.textContent = '▲';
        } else {
            details.style.display = 'none';
            icon.textContent = '▼';
        }
    }
};

window.toggleCashDetails = function() {
    const details = document.getElementById('cashDetails');
    const icon = document.getElementById('cashToggleIcon');

    if (details && icon) {
        if (details.style.display === 'none') {
            details.style.display = 'block';
            icon.textContent = '▲';
        } else {
            details.style.display = 'none';
            icon.textContent = '▼';
        }
    }
};

window.saveDailyReconciliation = async function(event) {
    event.preventDefault();

    const today = window.getTodayInColombia();

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
    const today = window.getTodayInColombia();
    const isAdmin = window.userRole === 'admin' || window.userRole === 'director';

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
        z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%;">
            <h2 style="margin: 0 0 1.5rem 0;">➕ Registrar Gasto</h2>

            <form id="expenseForm" onsubmit="saveExpense(event)" style="display: grid; gap: 1rem;">
                <!-- Type Selector - ADMIN ONLY -->
                ${isAdmin ? `
                <div class="form-group">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Tipo de Gasto*</label>
                    <div style="display: flex; gap: 0.5rem; background: #f3f4f6; padding: 0.25rem; border-radius: 6px;">
                        <button type="button" onclick="toggleExpenseType('business')" id="expenseTypeBusiness" style="flex: 1; padding: 0.5rem; border: none; background: #3b82f6; color: white; border-radius: 4px; cursor: pointer; font-weight: 500;">
                            🏢 Negocio
                        </button>
                        <button type="button" onclick="toggleExpenseType('personal')" id="expenseTypePersonal" style="flex: 1; padding: 0.5rem; border: none; background: transparent; color: #6b7280; border-radius: 4px; cursor: pointer; font-weight: 500;">
                            🏠 Personal
                        </button>
                    </div>
                    <input type="hidden" id="expenseType" value="business">
                </div>
                ` : '<input type="hidden" id="expenseType" value="business">'}

                <div class="form-group">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Categoría*</label>
                    <select id="expenseCategory" required style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                        <option value="">Seleccionar...</option>
                        ${Object.entries(BusinessExpenseCategories).map(([key, label]) => `
                            <option value="${label}">${label}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Monto (COP)*</label>
                    <input type="text"
                           id="expenseAmount"
                           required
                           oninput="formatCurrencyInput(this)"
                           placeholder="$50.000"
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

// Toggle expense type and update categories
window.toggleExpenseType = function(type) {
    const typeInput = document.getElementById('expenseType');
    const businessBtn = document.getElementById('expenseTypeBusiness');
    const personalBtn = document.getElementById('expenseTypePersonal');
    const categorySelect = document.getElementById('expenseCategory');

    // Update hidden input
    typeInput.value = type;

    // Update button styles
    if (type === 'business') {
        businessBtn.style.background = '#3b82f6';
        businessBtn.style.color = 'white';
        personalBtn.style.background = 'transparent';
        personalBtn.style.color = '#6b7280';

        // Update categories to business
        categorySelect.innerHTML = '<option value="">Seleccionar...</option>' +
            Object.entries(BusinessExpenseCategories).map(([key, label]) =>
                `<option value="${label}">${label}</option>`
            ).join('');
    } else {
        personalBtn.style.background = '#3b82f6';
        personalBtn.style.color = 'white';
        businessBtn.style.background = 'transparent';
        businessBtn.style.color = '#6b7280';

        // Update categories to personal
        categorySelect.innerHTML = '<option value="">Seleccionar...</option>' +
            Object.entries(PersonalExpenseCategories).map(([key, label]) =>
                `<option value="${label}">${label}</option>`
            ).join('');
    }
};

window.saveExpense = async function(event) {
    event.preventDefault();

    const expenseData = {
        category: document.getElementById('expenseCategory').value,
        amount: document.getElementById('expenseAmount').value,
        date: document.getElementById('expenseDate').value,
        description: document.getElementById('expenseDescription').value,
        type: document.getElementById('expenseType').value // Add type field
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

window.loadReportsView = async function() {
    const container = document.getElementById('financeContainer');
    if (!container) return;

    // Get current financial context
    const isAdmin = window.userRole === 'admin' || window.userRole === 'director';
    const context = isAdmin ? (window.financialContext || 'business') : 'business';

    console.log('📊 Loading reports with context:', context);

    // For personal view, just redirect to advanced reports which already has filtering
    if (context !== 'business') {
        return await loadFinanceTab('reportes');
    }

    // Business view - continue with original logic
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const monthlyMetrics = await window.FinanceManager.calculateMonthlyMetrics(currentYear, currentMonth);
    const expectedRevenue = window.FinanceManager.calculateExpectedMonthlyRevenue();
    const collectionRate = await window.FinanceManager.calculateCollectionRate(currentYear, currentMonth);
    const studentGrowth = window.FinanceManager.calculateStudentGrowth(6);

    container.innerHTML = `
        <div style="padding: 2rem; max-width: 1200px; margin: 0 auto;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <div>
                    <button onclick="loadFinanceTab()" class="btn btn-secondary" style="margin-bottom: 0.5rem;">
                        ← Volver al Dashboard
                    </button>
                    <h1 style="margin: 0;">📊 Reportes Financieros - 🏢 Negocio</h1>
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

window.exportFinancialReport = async function() {
    // Get current financial context
    const isAdmin = window.userRole === 'admin' || window.userRole === 'director';
    const context = isAdmin ? (window.financialContext || 'business') : 'business';

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const contextLabel = context === 'business' ? 'NEGOCIO' : context === 'personal' ? 'PERSONAL' : 'COMBINADO';
    const contextIcon = context === 'business' ? '🏢' : context === 'personal' ? '🏠' : '📊';

    let reportText = '';

    if (context === 'personal') {
        // PERSONAL REPORT
        const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

        // Get personal expenses
        const allExpenses = window.FinanceManager.getExpenses({ startDate, endDate });
        const personalExpenses = allExpenses.filter(e => e.type === 'personal');
        const totalExpenses = personalExpenses.reduce((sum, e) => sum + e.amount, 0);

        // Get personal otros ingresos
        const db = window.firebaseModules.database;
        const otrosIngresosRef = db.ref(window.FirebaseData.database, 'otrosIngresos');
        const otrosSnapshot = await db.get(otrosIngresosRef);

        let otrosIngresosTotal = 0;
        if (otrosSnapshot.exists()) {
            const allOtrosIngresos = Object.values(otrosSnapshot.val()).filter(i =>
                i.fecha && i.fecha.startsWith(`${currentYear}-${String(currentMonth).padStart(2, '0')}`)
            );
            const personalIngresos = allOtrosIngresos.filter(i => i.type === 'personal');
            otrosIngresosTotal = personalIngresos.reduce((sum, i) => sum + (i.monto || 0), 0);
        }

        const balance = otrosIngresosTotal - totalExpenses;
        const margin = otrosIngresosTotal > 0 ? (balance / otrosIngresosTotal * 100) : 0;

        reportText = `
===========================================
${contextIcon} REPORTE FINANCIERO ${contextLabel}
CIUDAD BILINGÜE
${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
===========================================

RESUMEN PERSONAL:
-----------------
Ingresos Personales:    ${formatCurrency(otrosIngresosTotal)}
Gastos Personales:      ${formatCurrency(totalExpenses)}
Balance Personal:       ${formatCurrency(balance)}
Margen:                 ${margin.toFixed(1)}%

GASTOS PERSONALES:
-----------------
${personalExpenses.length > 0 ? personalExpenses
    .map(e => `${e.date} - ${e.category}: ${formatCurrency(e.amount)} ${e.description ? '(' + e.description + ')' : ''}`)
    .join('\n') : 'Sin gastos personales registrados'}

===========================================
Generado: ${new Date().toLocaleString('es-ES')}
===========================================
        `.trim();

    } else if (context === 'business') {
        // BUSINESS REPORT
        const monthlyMetrics = await window.FinanceManager.calculateMonthlyMetrics(currentYear, currentMonth);
        const expectedRevenue = window.FinanceManager.calculateExpectedMonthlyRevenue();
        const collectionRate = await window.FinanceManager.calculateCollectionRate(currentYear, currentMonth);

        reportText = `
===========================================
${contextIcon} REPORTE FINANCIERO ${contextLabel}
CIUDAD BILINGÜE
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

    } else {
        // COMBINED REPORT
        reportText = `
===========================================
${contextIcon} REPORTE FINANCIERO ${contextLabel}
CIUDAD BILINGÜE
${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
===========================================

NOTA: Este reporte contiene información combinada
de negocio y personal. Use el tab "Reportes Avanzados"
para ver el desglose completo con columnas separadas.

===========================================
Generado: ${new Date().toLocaleString('es-ES')}
===========================================
        `.trim();
    }

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte-${contextLabel}-${new Date().toISOString().slice(0, 7)}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    window.showNotification(`✅ Reporte ${contextLabel} exportado exitosamente`, 'success');
};

// ==================================================================================
// TODAY'S INCOME & EXPENSES VIEW (SIMPLE)
// ==================================================================================

window.loadTodayMovementsView = async function() {
    const container = document.getElementById('financeContainer');
    if (!container) return;

    const today = window.getTodayInColombia();
    const db = window.firebaseModules.database;

    // Get current financial context
    const isAdmin = window.userRole === 'admin' || window.userRole === 'director';
    const context = isAdmin ? (window.financialContext || 'business') : 'business';

    console.log('📊 Loading today movements for date:', today, 'context:', context);

    // Get today's revenue (students payments) - only for business/combined
    let dailyRevenue = { total: 0, cash: 0, transfers: 0, cashCount: 0, transferCount: 0 };
    if (context !== 'personal') {
        dailyRevenue = await window.FinanceManager.calculateDailyRevenue(today);
        console.log('💰 Daily revenue calculated:', dailyRevenue);
    }

    // Get today's expenses filtered by context
    const allTodayExpenses = window.FinanceManager.getExpenses({ startDate: today, endDate: today });
    let todayExpenses = [];
    let totalExpenses = 0;
    let totalExpensesBusiness = 0;
    let totalExpensesPersonal = 0;

    if (context === 'business') {
        todayExpenses = allTodayExpenses.filter(e => !e.type || e.type === 'business');
        totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    } else if (context === 'personal') {
        todayExpenses = allTodayExpenses.filter(e => e.type === 'personal');
        totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    } else {
        // Combined
        const businessExpenses = allTodayExpenses.filter(e => !e.type || e.type === 'business');
        const personalExpenses = allTodayExpenses.filter(e => e.type === 'personal');
        totalExpensesBusiness = businessExpenses.reduce((sum, e) => sum + e.amount, 0);
        totalExpensesPersonal = personalExpenses.reduce((sum, e) => sum + e.amount, 0);
        totalExpenses = totalExpensesBusiness + totalExpensesPersonal;
        todayExpenses = allTodayExpenses;
    }

    console.log('💸 Today expenses:', todayExpenses.length, 'total:', totalExpenses);

    // Get today's student payments (detailed)
    const paymentsRef = db.ref(window.FirebaseData.database, 'payments');
    const paymentsSnapshot = await db.get(paymentsRef);

    let todayPayments = [];
    if (paymentsSnapshot.exists()) {
        const paymentsData = paymentsSnapshot.val();
        console.log('📚 Total payments in database:', Object.keys(paymentsData).length);
        todayPayments = Object.entries(paymentsData)
            .map(([id, payment]) => ({ id, ...payment }))
            .filter(payment => {
                const paymentDate = payment.date ? payment.date.split('T')[0] : null;
                return paymentDate === today;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        console.log('📚 Today payments filtered:', todayPayments.length);
        if (todayPayments.length > 0) {
            console.log('📚 First payment example:', todayPayments[0]);
        }
    }

    // Get students map for names
    const studentsRef = db.ref(window.FirebaseData.database, 'students');
    const studentsSnapshot = await db.get(studentsRef);
    const students = new Map();
    if (studentsSnapshot.exists()) {
        const studentsData = studentsSnapshot.val();
        Object.entries(studentsData).forEach(([id, student]) => {
            students.set(id, student);
        });
    }

    // Get today's store sales (only for business/combined)
    let storeSales = 0;
    let storeSalesDetails = [];
    if (context !== 'personal') {
        const salesRef = db.ref(window.FirebaseData.database, 'sales');
        const salesSnapshot = await db.get(salesRef);

        if (salesSnapshot.exists()) {
            const salesData = salesSnapshot.val();
            console.log('🛒 Total sales in database:', Object.keys(salesData).length);
            const allSales = Object.entries(salesData).map(([id, sale]) => ({ id, ...sale }));

            storeSalesDetails = allSales
                .filter(sale => {
                    if (!sale.date) {
                        console.warn('🛒 Sale without date:', sale.id);
                        return false;
                    }
                    const saleDate = sale.date.split('T')[0];
                    return saleDate === today;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            storeSales = storeSalesDetails.reduce((sum, sale) => sum + sale.total, 0);
            console.log('🛒 Today sales filtered:', storeSalesDetails.length, 'total:', storeSales);
        }
    }

    // Get today's otros ingresos filtered by context
    const otrosIngresosRef = db.ref(window.FirebaseData.database, 'otrosIngresos');
    const otrosSnapshot = await db.get(otrosIngresosRef);

    let otrosIngresosTotal = 0;
    let otrosIngresosBusiness = 0;
    let otrosIngresosPersonal = 0;

    if (otrosSnapshot.exists()) {
        const allOtrosIngresos = Object.values(otrosSnapshot.val()).filter(i =>
            i.fecha && i.fecha === today
        );

        if (context === 'business') {
            const businessIngresos = allOtrosIngresos.filter(i => !i.type || i.type === 'business');
            otrosIngresosTotal = businessIngresos.reduce((sum, i) => sum + (i.monto || 0), 0);
        } else if (context === 'personal') {
            const personalIngresos = allOtrosIngresos.filter(i => i.type === 'personal');
            otrosIngresosTotal = personalIngresos.reduce((sum, i) => sum + (i.monto || 0), 0);
        } else {
            // Combined
            const businessIngresos = allOtrosIngresos.filter(i => !i.type || i.type === 'business');
            const personalIngresos = allOtrosIngresos.filter(i => i.type === 'personal');
            otrosIngresosBusiness = businessIngresos.reduce((sum, i) => sum + (i.monto || 0), 0);
            otrosIngresosPersonal = personalIngresos.reduce((sum, i) => sum + (i.monto || 0), 0);
            otrosIngresosTotal = otrosIngresosBusiness + otrosIngresosPersonal;
        }
    }

    // Calculate balance
    const totalIncome = dailyRevenue.total + storeSales + otrosIngresosTotal;
    const balance = totalIncome - totalExpenses;

    container.innerHTML = `
        <div style="padding: 2rem;">
            <!-- Page Header -->
            <div style="margin-bottom: 2rem;">
                <button onclick="loadFinanceTab()" class="btn btn-secondary" style="margin-bottom: 0.5rem;">
                    ← Volver al Dashboard
                </button>
                <h1 style="margin: 0;">
                    📊 Ingresos y Gastos de Hoy
                    ${context === 'business' ? '- 🏢 Negocio' : context === 'personal' ? '- 🏠 Personal' : '- 📊 Combinado'}
                </h1>
                <p style="margin: 0.5rem 0 0 0; color: #6b7280;">
                    ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            <!-- Main Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-bottom: 2rem;">

                <!-- INGRESOS -->
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 2rem; border-radius: 16px; box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div style="font-size: 3rem;">💰</div>
                        <div>
                            <div style="font-size: 1rem; opacity: 0.9;">INGRESOS</div>
                            <div style="font-size: 2.5rem; font-weight: 700;">${formatCurrency(totalIncome)}</div>
                        </div>
                    </div>
                    <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 1rem; margin-top: 1rem;">
                        ${context === 'personal' ? `
                            <div style="display: flex; justify-content: space-between;">
                                <span style="opacity: 0.9;">Otros Ingresos:</span>
                                <strong>${formatCurrency(otrosIngresosTotal)}</strong>
                            </div>
                        ` : context === 'business' ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span style="opacity: 0.9;">Pagos Estudiantes:</span>
                                <strong>${formatCurrency(dailyRevenue.total)}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span style="opacity: 0.9;">Ventas Tienda:</span>
                                <strong>${formatCurrency(storeSales)}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="opacity: 0.9;">Otros Ingresos:</span>
                                <strong>${formatCurrency(otrosIngresosTotal)}</strong>
                            </div>
                        ` : `
                            <div style="margin-bottom: 0.75rem;">
                                <div style="font-size: 0.85rem; opacity: 0.8; margin-bottom: 0.25rem;">🏢 Negocio:</div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.25rem;">
                                    <span>Pagos:</span>
                                    <strong>${formatCurrency(dailyRevenue.total)}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.25rem;">
                                    <span>Tienda:</span>
                                    <strong>${formatCurrency(storeSales)}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                                    <span>Otros:</span>
                                    <strong>${formatCurrency(otrosIngresosBusiness)}</strong>
                                </div>
                            </div>
                            <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 0.75rem;">
                                <div style="font-size: 0.85rem; opacity: 0.8; margin-bottom: 0.25rem;">🏠 Personal:</div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                                    <span>Otros:</span>
                                    <strong>${formatCurrency(otrosIngresosPersonal)}</strong>
                                </div>
                            </div>
                        `}
                    </div>
                </div>

                <!-- GASTOS -->
                <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 2rem; border-radius: 16px; box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div style="font-size: 3rem;">💸</div>
                        <div>
                            <div style="font-size: 1rem; opacity: 0.9;">GASTOS</div>
                            <div style="font-size: 2.5rem; font-weight: 700;">${formatCurrency(totalExpenses)}</div>
                        </div>
                    </div>
                    <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 1rem; margin-top: 1rem;">
                        ${context === 'combined' ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span style="opacity: 0.9;">🏢 Negocio:</span>
                                <strong>${formatCurrency(totalExpensesBusiness)}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="opacity: 0.9;">🏠 Personal:</span>
                                <strong>${formatCurrency(totalExpensesPersonal)}</strong>
                            </div>
                        ` : `
                            <div style="display: flex; justify-content: space-between;">
                                <span style="opacity: 0.9;">Total de gastos:</span>
                                <strong>${todayExpenses.length} registros</strong>
                            </div>
                        `}
                    </div>
                </div>

                <!-- BALANCE -->
                <div style="background: linear-gradient(135deg, ${balance >= 0 ? '#3b82f6' : '#f59e0b'} 0%, ${balance >= 0 ? '#2563eb' : '#d97706'} 100%); color: white; padding: 2rem; border-radius: 16px; box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div style="font-size: 3rem;">${balance >= 0 ? '📈' : '📉'}</div>
                        <div>
                            <div style="font-size: 1rem; opacity: 0.9;">BALANCE</div>
                            <div style="font-size: 2.5rem; font-weight: 700;">${formatCurrency(Math.abs(balance))}</div>
                        </div>
                    </div>
                    <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 1rem; margin-top: 1rem;">
                        <div style="text-align: center; font-size: 1.1rem; font-weight: 600;">
                            ${balance >= 0 ? '✅ Ganancia del día' : '⚠️ Gastos superan ingresos'}
                        </div>
                    </div>
                </div>

            </div>

            <!-- Detailed Lists -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">

                <!-- Expenses List -->
                <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 1.5rem 0; color: #ef4444;">💸 Gastos de Hoy</h3>
                    ${todayExpenses.length === 0 ? `
                        <div style="text-align: center; padding: 2rem; color: #6b7280;">
                            <div style="font-size: 2rem; margin-bottom: 0.5rem;">✅</div>
                            <p>No hay gastos registrados hoy</p>
                        </div>
                    ` : `
                        <div style="max-height: 400px; overflow-y: auto;">
                            ${todayExpenses.map(expense => `
                                <div style="padding: 1rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600; color: #1f2937;">${expense.category}</div>
                                        <div style="font-size: 0.85rem; color: #6b7280;">${expense.description || 'Sin descripción'}</div>
                                    </div>
                                    <div style="font-weight: 700; color: #ef4444; font-size: 1.1rem;">
                                        ${formatCurrency(expense.amount)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <!-- Income Details -->
                <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 1.5rem 0; color: #10b981;">💰 Detalle de Ingresos</h3>

                    <!-- Student Payments List -->
                    <div style="margin-bottom: 1.5rem;">
                        <div style="font-weight: 600; color: #065f46; margin-bottom: 0.75rem; padding: 0.5rem; background: #f0fdf4; border-radius: 6px;">
                            📚 Pagos de Estudiantes (${todayPayments.length})
                        </div>
                        ${todayPayments.length === 0 ? `
                            <div style="text-align: center; padding: 1.5rem; color: #6b7280; font-size: 0.9rem;">
                                No hay pagos de estudiantes hoy
                            </div>
                        ` : `
                            <div style="max-height: 250px; overflow-y: auto; border: 1px solid #d1fae5; border-radius: 6px;">
                                ${todayPayments.map(payment => {
                                    const student = students.get(payment.studentId);
                                    const studentName = student ? student.nombre : 'Estudiante desconocido';
                                    const paymentTime = new Date(payment.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                                    return `
                                        <div style="padding: 0.75rem; border-bottom: 1px solid #f0fdf4; display: flex; justify-content: space-between; align-items: center;">
                                            <div style="flex: 1;">
                                                <div style="font-weight: 500; color: #1f2937; font-size: 0.9rem;">${studentName}</div>
                                                <div style="font-size: 0.75rem; color: #6b7280;">
                                                    ${paymentTime} •
                                                    <span style="color: ${payment.method === 'Efectivo' ? '#059669' : '#3b82f6'};">
                                                        ${payment.method === 'Efectivo' ? '💵' : payment.method === 'Nequi' ? '📱' : '🏦'} ${payment.method}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style="font-weight: 700; color: #10b981; font-size: 0.95rem;">
                                                ${formatCurrency(payment.amount)}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            <div style="padding: 0.75rem; background: #f0fdf4; border-radius: 6px; margin-top: 0.5rem;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="font-weight: 600; color: #065f46;">Total Estudiantes:</span>
                                    <strong style="color: #059669; font-size: 1.1rem;">${formatCurrency(dailyRevenue.total)}</strong>
                                </div>
                            </div>
                        `}
                    </div>

                    <!-- Store Sales List -->
                    <div>
                        <div style="font-weight: 600; color: #92400e; margin-bottom: 0.75rem; padding: 0.5rem; background: #fef3c7; border-radius: 6px;">
                            🛒 Ventas de Tienda (${storeSalesDetails.length})
                        </div>
                        ${storeSalesDetails.length === 0 ? `
                            <div style="text-align: center; padding: 1.5rem; color: #6b7280; font-size: 0.9rem;">
                                No hay ventas de tienda hoy
                            </div>
                        ` : `
                            <div style="max-height: 250px; overflow-y: auto; border: 1px solid #fef3c7; border-radius: 6px;">
                                ${storeSalesDetails.map(sale => {
                                    const saleTime = new Date(sale.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                                    const itemsCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                                    return `
                                        <div style="padding: 0.75rem; border-bottom: 1px solid #fef3c7; display: flex; justify-content: space-between; align-items: center;">
                                            <div style="flex: 1;">
                                                <div style="font-weight: 500; color: #1f2937; font-size: 0.9rem;">
                                                    Venta #${sale.id.slice(0, 6)} (${itemsCount} items)
                                                </div>
                                                <div style="font-size: 0.75rem; color: #6b7280;">
                                                    ${saleTime} •
                                                    <span style="color: ${sale.paymentMethod === 'Efectivo' ? '#d97706' : '#3b82f6'};">
                                                        ${sale.paymentMethod === 'Efectivo' ? '💵' : sale.paymentMethod === 'Nequi' ? '📱' : '🏦'} ${sale.paymentMethod}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style="font-weight: 700; color: #d97706; font-size: 0.95rem;">
                                                ${formatCurrency(sale.total)}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            <div style="padding: 0.75rem; background: #fef3c7; border-radius: 6px; margin-top: 0.5rem;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="font-weight: 600; color: #92400e;">Total Tienda:</span>
                                    <strong style="color: #d97706; font-size: 1.1rem;">${formatCurrency(storeSales)}</strong>
                                </div>
                            </div>
                        `}
                    </div>

                </div>

            </div>
        </div>
    `;
};

// ==================================================================================
// SECTION 5: OTROS INGRESOS (ADMIN ONLY)
// ==================================================================================

// Render Otros Ingresos View
async function renderOtrosIngresosView() {
    // Get current financial context - Admin and Director can use personal/combined
    const isAdmin = window.userRole === 'admin' || window.userRole === 'director';
    const context = isAdmin ? (window.financialContext || 'business') : 'business';

    // Get other income records from Firebase
    const db = window.firebaseModules.database;
    const otrosIngresosRef = db.ref(window.FirebaseData.database, 'otrosIngresos');
    const snapshot = await db.get(otrosIngresosRef);

    let allOtrosIngresos = [];
    if (snapshot.exists()) {
        allOtrosIngresos = Object.values(snapshot.val()).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    // Filter by financial context
    let otrosIngresos = allOtrosIngresos;
    if (context === 'business') {
        otrosIngresos = allOtrosIngresos.filter(i => !i.type || i.type === 'business');
    } else if (context === 'personal') {
        otrosIngresos = allOtrosIngresos.filter(i => i.type === 'personal');
    }
    // If 'combined', show all

    // Calculate totals
    const totalThisMonth = otrosIngresos
        .filter(i => i.fecha && i.fecha.startsWith(new Date().toISOString().slice(0, 7)))
        .reduce((sum, i) => sum + (i.monto || 0), 0);

    const totalAllTime = otrosIngresos.reduce((sum, i) => sum + (i.monto || 0), 0);

    return `
        <div style="padding: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <div>
                    <h2 style="margin: 0;">💵 Otros Ingresos</h2>
                    <p style="margin: 0.5rem 0 0 0; color: #6b7280;">Registra ingresos adicionales que no provienen de matrículas o tienda</p>
                </div>
                <button onclick="showAddOtroIngresoModal()" class="btn" style="background: #10b981; color: white; padding: 0.75rem 1.5rem;">
                    ➕ Registrar Ingreso
                </button>
            </div>

            <!-- Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem;">Este Mes</div>
                    <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${formatCurrency(totalThisMonth)}</div>
                </div>
                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem;">Total Histórico</div>
                    <div style="font-size: 2rem; font-weight: bold; color: #3b82f6;">${formatCurrency(totalAllTime)}</div>
                </div>
                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem;">Total Registros</div>
                    <div style="font-size: 2rem; font-weight: bold; color: #1f2937;">${otrosIngresos.length}</div>
                </div>
            </div>

            <!-- Income List -->
            <div style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                        <tr>
                            ${context === 'combined' ? '<th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151;">Tipo</th>' : ''}
                            <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151;">Fecha</th>
                            <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151;">Concepto</th>
                            <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151;">Monto</th>
                            <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151;">Método</th>
                            <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151;">Registrado Por</th>
                            <th style="padding: 1rem; text-align: center; font-weight: 600; color: #374151;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${otrosIngresos.length === 0 ? `
                            <tr>
                                <td colspan="${context === 'combined' ? '7' : '6'}" style="padding: 3rem; text-align: center; color: #9ca3af;">
                                    No hay otros ingresos registrados
                                </td>
                            </tr>
                        ` : otrosIngresos.map(ingreso => {
                            const ingresoType = ingreso.type || 'business';
                            const typeIcon = ingresoType === 'business' ? '🏢' : '🏠';
                            const typeLabel = ingresoType === 'business' ? 'Negocio' : 'Personal';
                            return `
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                ${context === 'combined' ? `<td style="padding: 1rem;"><span style="font-size: 0.875rem;">${typeIcon} ${typeLabel}</span></td>` : ''}
                                <td style="padding: 1rem;">${new Date(ingreso.fecha).toLocaleDateString('es-CO')}</td>
                                <td style="padding: 1rem;">
                                    <div style="font-weight: 500;">${ingreso.concepto}</div>
                                    ${ingreso.notas ? `<div style="font-size: 0.875rem; color: #6b7280;">${ingreso.notas}</div>` : ''}
                                </td>
                                <td style="padding: 1rem; font-weight: 600; color: #10b981;">${formatCurrency(ingreso.monto)}</td>
                                <td style="padding: 1rem;">${ingreso.metodoPago}</td>
                                <td style="padding: 1rem; font-size: 0.875rem; color: #6b7280;">${ingreso.registradoPor || 'N/A'}</td>
                                <td style="padding: 1rem; text-align: center;">
                                    <button onclick="deleteOtroIngreso('${ingreso.id}')" class="btn btn-sm" style="background: #ef4444; color: white; padding: 0.25rem 0.75rem;">
                                        🗑️ Eliminar
                                    </button>
                                </td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Show add otro ingreso modal
window.showAddOtroIngresoModal = function() {
    const isAdmin = window.userRole === 'admin' || window.userRole === 'director';
    const today = window.getTodayInColombia();

    const modalHTML = `
        <div id="otroIngresoModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001;">
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%;">
                <h2 style="margin: 0 0 1.5rem 0;">💵 Registrar Otro Ingreso</h2>

                <!-- Type Selector - ADMIN ONLY -->
                ${isAdmin ? `
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Tipo de Ingreso</label>
                    <div style="display: flex; gap: 0.5rem; background: #f3f4f6; padding: 0.25rem; border-radius: 6px;">
                        <button type="button" onclick="toggleIngresoType('business')" id="ingresoTypeBusiness" style="flex: 1; padding: 0.5rem; border: none; background: #3b82f6; color: white; border-radius: 4px; cursor: pointer; font-weight: 500;">
                            🏢 Negocio
                        </button>
                        <button type="button" onclick="toggleIngresoType('personal')" id="ingresoTypePersonal" style="flex: 1; padding: 0.5rem; border: none; background: transparent; color: #6b7280; border-radius: 4px; cursor: pointer; font-weight: 500;">
                            🏠 Personal
                        </button>
                    </div>
                    <input type="hidden" id="otroIngresoType" value="business">
                </div>
                ` : '<input type="hidden" id="otroIngresoType" value="business">'}

                <div style="margin-bottom: 1rem;">
                    <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Fecha</label>
                    <input type="date" id="otroIngresoFecha" value="${today}" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                </div>

                <div style="margin-bottom: 1rem;">
                    <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Concepto</label>
                    <select id="otroIngresoConcepto" onchange="handleConceptoChange()" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="">Seleccione...</option>
                        <option value="Matrícula">Matrícula</option>
                        <option value="Venta de Materiales">Venta de Materiales</option>
                        <option value="Servicios Adicionales">Servicios Adicionales</option>
                        <option value="Donaciones">Donaciones</option>
                        <option value="Intereses">Intereses Bancarios</option>
                        <option value="Otro">Otro (especificar)</option>
                    </select>
                </div>

                <div id="otroConceptoContainer" style="margin-bottom: 1rem; display: none;">
                    <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Especificar Concepto</label>
                    <input type="text" id="otroConceptoText" placeholder="Escriba el concepto..." style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                </div>

                <div style="margin-bottom: 1rem;">
                    <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Monto</label>
                    <input type="text" id="otroIngresoMonto" placeholder="$0" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;" oninput="formatCurrencyInput(this)">
                </div>

                <div style="margin-bottom: 1rem;">
                    <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Método de Pago</label>
                    <select id="otroIngresoMetodo" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Nequi">Nequi</option>
                        <option value="Bancolombia">Bancolombia</option>
                    </select>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Notas (opcional)</label>
                    <textarea id="otroIngresoNotas" rows="3" placeholder="Detalles adicionales..." style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; resize: vertical;"></textarea>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button onclick="closeOtroIngresoModal()" class="btn" style="background: #6b7280; color: white; padding: 0.5rem 1.5rem;">
                        Cancelar
                    </button>
                    <button onclick="saveOtroIngreso()" class="btn" style="background: #10b981; color: white; padding: 0.5rem 1.5rem;">
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.handleConceptoChange = function() {
    const concepto = document.getElementById('otroIngresoConcepto').value;
    const otroContainer = document.getElementById('otroConceptoContainer');

    if (concepto === 'Otro') {
        otroContainer.style.display = 'block';
    } else {
        otroContainer.style.display = 'none';
    }
};

window.closeOtroIngresoModal = function() {
    const modal = document.getElementById('otroIngresoModal');
    if (modal) modal.remove();
};

// Toggle ingreso type
window.toggleIngresoType = function(type) {
    const typeInput = document.getElementById('otroIngresoType');
    const businessBtn = document.getElementById('ingresoTypeBusiness');
    const personalBtn = document.getElementById('ingresoTypePersonal');

    // Update hidden input
    typeInput.value = type;

    // Update button styles
    if (type === 'business') {
        businessBtn.style.background = '#3b82f6';
        businessBtn.style.color = 'white';
        personalBtn.style.background = 'transparent';
        personalBtn.style.color = '#6b7280';
    } else {
        personalBtn.style.background = '#3b82f6';
        personalBtn.style.color = 'white';
        businessBtn.style.background = 'transparent';
        businessBtn.style.color = '#6b7280';
    }
};

window.saveOtroIngreso = async function() {
    try {
        const fecha = document.getElementById('otroIngresoFecha').value;
        let concepto = document.getElementById('otroIngresoConcepto').value;
        const montoStr = document.getElementById('otroIngresoMonto').value;
        const metodoPago = document.getElementById('otroIngresoMetodo').value;
        const notas = document.getElementById('otroIngresoNotas').value;
        const type = document.getElementById('otroIngresoType').value;

        // Validation
        if (!fecha || !concepto || !montoStr) {
            window.showNotification('⚠️ Por favor complete todos los campos obligatorios', 'warning');
            return;
        }

        // If "Otro" was selected, use custom text
        if (concepto === 'Otro') {
            const otroTexto = document.getElementById('otroConceptoText').value.trim();
            if (!otroTexto) {
                window.showNotification('⚠️ Por favor especifique el concepto', 'warning');
                return;
            }
            concepto = otroTexto;
        }

        const monto = parseCurrencyInput(montoStr);

        if (monto <= 0) {
            window.showNotification('⚠️ El monto debe ser mayor a cero', 'warning');
            return;
        }

        const id = `OING-${Date.now()}`;
        const otroIngreso = {
            id,
            fecha,
            concepto,
            monto,
            type, // 'business' | 'personal'
            metodoPago,
            notas,
            registradoPor: window.FirebaseData.currentUser?.email || 'unknown',
            creadoEn: new Date().toISOString()
        };

        // Save to Firebase
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `otrosIngresos/${id}`);
        await db.set(ref, otroIngreso);

        // Audit log
        if (typeof window.logAudit === 'function') {
            await window.logAudit(
                'Otro ingreso registrado',
                'otro-ingreso',
                id,
                `${concepto} - ${formatCurrency(monto)}`,
                { after: otroIngreso }
            );
        }

        window.showNotification('✅ Ingreso registrado exitosamente', 'success');
        closeOtroIngresoModal();
        loadFinanceTab('otros-ingresos');

    } catch (error) {
        console.error('Error saving otro ingreso:', error);
        window.showNotification('❌ Error al guardar ingreso', 'error');
    }
};

window.deleteOtroIngreso = async function(id) {
    if (!confirm('¿Está seguro de eliminar este ingreso?')) return;

    try {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `otrosIngresos/${id}`);
        await db.remove(ref);

        window.showNotification('✅ Ingreso eliminado', 'success');
        loadFinanceTab('otros-ingresos');
    } catch (error) {
        console.error('Error deleting otro ingreso:', error);
        window.showNotification('❌ Error al eliminar ingreso', 'error');
    }
};

// ==================================================================================
// SECTION 6: GASTOS MEJORADOS (ADMIN ONLY)
// ==================================================================================

async function renderExpensesViewEnhanced() {
    // Get current financial context - Admin and Director can use personal/combined
    const isAdmin = window.userRole === 'admin' || window.userRole === 'director';
    const context = isAdmin ? (window.financialContext || 'business') : 'business';

    // Generate the expenses view HTML
    let allExpenses = window.FinanceManager.getExpenses();

    // Filter by financial context
    let expenses = allExpenses;
    if (context === 'business') {
        expenses = allExpenses.filter(e => !e.type || e.type === 'business');
    } else if (context === 'personal') {
        expenses = allExpenses.filter(e => e.type === 'personal');
    }
    // If 'combined', show all expenses

    const currentMonth = new Date().toISOString().slice(0, 7);

    // Filter month expenses by context too
    let monthExpenses = expenses.filter(e => {
        const expenseMonth = e.date.slice(0, 7);
        return expenseMonth === currentMonth;
    });

    const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Group by category (and optionally by type for combined view)
    const byCategory = {};
    if (context === 'combined') {
        // For combined view, group by type first
        const businessExpenses = monthExpenses.filter(e => !e.type || e.type === 'business');
        const personalExpenses = monthExpenses.filter(e => e.type === 'personal');

        const businessTotal = businessExpenses.reduce((sum, e) => sum + e.amount, 0);
        const personalTotal = personalExpenses.reduce((sum, e) => sum + e.amount, 0);

        byCategory['🏢 Negocio'] = { total: businessTotal, count: businessExpenses.length };
        byCategory['🏠 Personal'] = { total: personalTotal, count: personalExpenses.length };
    } else {
        // For single context, group by actual category
        monthExpenses.forEach(expense => {
            if (!byCategory[expense.category]) {
                byCategory[expense.category] = { total: 0, count: 0 };
            }
            byCategory[expense.category].total += expense.amount;
            byCategory[expense.category].count++;
        });
    }

    return `
        <div style="padding: 2rem; max-width: 1200px; margin: 0 auto;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <div>
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
                                <th style="padding: 0.75rem; text-align: left;">Tipo</th>
                                <th style="padding: 0.75rem; text-align: left;">Fecha</th>
                                <th style="padding: 0.75rem; text-align: left;">Categoría</th>
                                <th style="padding: 0.75rem; text-align: left;">Descripción</th>
                                <th style="padding: 0.75rem; text-align: right;">Monto</th>
                                <th style="padding: 0.75rem; text-align: left;">Registrado por</th>
                                <th style="padding: 0.75rem; text-align: center;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expenses.map(expense => {
                                const expenseType = expense.type || 'business';
                                const typeIcon = expenseType === 'business' ? '🏢' : '🏠';
                                const typeLabel = expenseType === 'business' ? 'Empresa' : 'Personal';
                                return `
                                <tr style="border-top: 1px solid #e5e7eb;">
                                    <td style="padding: 0.75rem;">
                                        <span style="background: ${expenseType === 'business' ? '#dbeafe' : '#fce7f3'}; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; color: ${expenseType === 'business' ? '#1e40af' : '#9d174d'};">
                                            ${typeIcon} ${typeLabel}
                                        </span>
                                    </td>
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
                            `}).join('')}
                        </tbody>
                        <tfoot style="background: #f3f4f6; font-weight: bold;">
                            <tr>
                                <td colspan="4" style="padding: 0.75rem; text-align: right;">TOTAL:</td>
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
}

// ==================================================================================
// SECTION 7: REPORTES AVANZADOS (ADMIN ONLY)
// ==================================================================================

async function renderAdvancedReportsView() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Get current financial context
    const isAdmin = window.userRole === 'admin' || window.userRole === 'director';
    const context = isAdmin ? (window.financialContext || 'business') : 'business';

    // Get data
    const monthlyMetrics = await window.FinanceManager.calculateMonthlyMetrics(currentYear, currentMonth);
    const expectedRevenue = window.FinanceManager.calculateExpectedMonthlyRevenue();

    // Get otros ingresos and filter by context
    const db = window.firebaseModules.database;
    const otrosIngresosRef = db.ref(window.FirebaseData.database, 'otrosIngresos');
    const otrosSnapshot = await db.get(otrosIngresosRef);

    let otrosIngresosTotal = 0;
    let otrosIngresosBusiness = 0;
    let otrosIngresosPersonal = 0;

    if (otrosSnapshot.exists()) {
        const allOtrosIngresos = Object.values(otrosSnapshot.val()).filter(i =>
            i.fecha && i.fecha.startsWith(`${currentYear}-${String(currentMonth).padStart(2, '0')}`)
        );

        // Filter by context
        if (context === 'business') {
            const businessIngresos = allOtrosIngresos.filter(i => !i.type || i.type === 'business');
            otrosIngresosTotal = businessIngresos.reduce((sum, i) => sum + (i.monto || 0), 0);
        } else if (context === 'personal') {
            const personalIngresos = allOtrosIngresos.filter(i => i.type === 'personal');
            otrosIngresosTotal = personalIngresos.reduce((sum, i) => sum + (i.monto || 0), 0);
        } else {
            // Combined view - calculate both
            const businessIngresos = allOtrosIngresos.filter(i => !i.type || i.type === 'business');
            const personalIngresos = allOtrosIngresos.filter(i => i.type === 'personal');
            otrosIngresosBusiness = businessIngresos.reduce((sum, i) => sum + (i.monto || 0), 0);
            otrosIngresosPersonal = personalIngresos.reduce((sum, i) => sum + (i.monto || 0), 0);
            otrosIngresosTotal = otrosIngresosBusiness + otrosIngresosPersonal;
        }
    }

    // Get expenses and filter by context
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;
    const allExpenses = window.FinanceManager.getExpenses({ startDate, endDate });

    let expensesTotal = 0;
    let expensesBusiness = 0;
    let expensesPersonal = 0;

    if (context === 'business') {
        const businessExpenses = allExpenses.filter(e => !e.type || e.type === 'business');
        expensesTotal = businessExpenses.reduce((sum, e) => sum + e.amount, 0);
    } else if (context === 'personal') {
        const personalExpenses = allExpenses.filter(e => e.type === 'personal');
        expensesTotal = personalExpenses.reduce((sum, e) => sum + e.amount, 0);
    } else {
        // Combined view - calculate both
        const businessExpenses = allExpenses.filter(e => !e.type || e.type === 'business');
        const personalExpenses = allExpenses.filter(e => e.type === 'personal');
        expensesBusiness = businessExpenses.reduce((sum, e) => sum + e.amount, 0);
        expensesPersonal = personalExpenses.reduce((sum, e) => sum + e.amount, 0);
        expensesTotal = expensesBusiness + expensesPersonal;
    }

    // Calculate totals based on context
    let totalIngresos, totalEgresos, utilidadNeta, margenUtilidad;

    if (context === 'personal') {
        // Personal context: Only personal income and expenses
        totalIngresos = otrosIngresosTotal;
        totalEgresos = expensesTotal;
        utilidadNeta = totalIngresos - totalEgresos;
        margenUtilidad = totalIngresos > 0 ? (utilidadNeta / totalIngresos * 100) : 0;
    } else if (context === 'business') {
        // Business context: Business income, expenses, tuition, tienda
        totalIngresos = monthlyMetrics.tuitionRevenue + monthlyMetrics.tiendaRevenue + otrosIngresosTotal;
        totalEgresos = expensesTotal + monthlyMetrics.tiendaCost;
        utilidadNeta = totalIngresos - totalEgresos;
        margenUtilidad = totalIngresos > 0 ? (utilidadNeta / totalIngresos * 100) : 0;
    } else {
        // Combined context: Will be handled separately in the UI
        totalIngresos = monthlyMetrics.tuitionRevenue + monthlyMetrics.tiendaRevenue + otrosIngresosTotal;
        totalEgresos = expensesTotal + monthlyMetrics.tiendaCost;
        utilidadNeta = totalIngresos - totalEgresos;
        margenUtilidad = totalIngresos > 0 ? (utilidadNeta / totalIngresos * 100) : 0;
    }

    return `
        <div style="padding: 2rem;">
            <div style="margin-bottom: 2rem;">
                <h2 style="margin: 0;">📈 Reportes Avanzados</h2>
                <p style="margin: 0.5rem 0 0 0; color: #6b7280;">Estado de Resultados y Balance Financiero - ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
            </div>

            <!-- Estado de Resultados -->
            <div style="background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 2rem; margin-bottom: 2rem;">
                <h3 style="margin: 0 0 1.5rem 0; font-size: 1.5rem;">
                    💰 Estado de Resultados (P&L)
                    ${context === 'business' ? '- 🏢 Negocio' : context === 'personal' ? '- 🏠 Personal' : '- 📊 Combinado'}
                </h3>

                ${context === 'personal' ? `
                    <!-- PERSONAL VIEW -->
                    <!-- Ingresos Personales -->
                    <div style="margin-bottom: 2rem;">
                        <div style="font-weight: 600; font-size: 1.1rem; color: #10b981; margin-bottom: 1rem; border-bottom: 2px solid #10b981; padding-bottom: 0.5rem;">
                            INGRESOS PERSONALES
                        </div>
                        <div style="display: grid; gap: 0.75rem; margin-left: 1rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>Otros Ingresos</span>
                                <span style="font-weight: 600;">${formatCurrency(otrosIngresosTotal)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding-top: 0.75rem; border-top: 2px solid #e5e7eb; font-size: 1.1rem;">
                                <span style="font-weight: 700;">TOTAL INGRESOS</span>
                                <span style="font-weight: 700; color: #10b981;">${formatCurrency(totalIngresos)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Gastos Personales -->
                    <div style="margin-bottom: 2rem;">
                        <div style="font-weight: 600; font-size: 1.1rem; color: #ef4444; margin-bottom: 1rem; border-bottom: 2px solid #ef4444; padding-bottom: 0.5rem;">
                            GASTOS PERSONALES
                        </div>
                        <div style="display: grid; gap: 0.75rem; margin-left: 1rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>Gastos Personales</span>
                                <span style="font-weight: 600;">${formatCurrency(expensesTotal)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding-top: 0.75rem; border-top: 2px solid #e5e7eb; font-size: 1.1rem;">
                                <span style="font-weight: 700;">TOTAL GASTOS</span>
                                <span style="font-weight: 700; color: #ef4444;">${formatCurrency(totalEgresos)}</span>
                            </div>
                        </div>
                    </div>
                ` : context === 'business' ? `
                    <!-- BUSINESS VIEW -->
                    <!-- Ingresos Negocio -->
                    <div style="margin-bottom: 2rem;">
                        <div style="font-weight: 600; font-size: 1.1rem; color: #10b981; margin-bottom: 1rem; border-bottom: 2px solid #10b981; padding-bottom: 0.5rem;">
                            INGRESOS NEGOCIO
                        </div>
                        <div style="display: grid; gap: 0.75rem; margin-left: 1rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>Matrículas y Mensualidades</span>
                                <span style="font-weight: 600;">${formatCurrency(monthlyMetrics.tuitionRevenue)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Tienda/Cafetería</span>
                                <span style="font-weight: 600;">${formatCurrency(monthlyMetrics.tiendaRevenue)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Otros Ingresos</span>
                                <span style="font-weight: 600;">${formatCurrency(otrosIngresosTotal)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding-top: 0.75rem; border-top: 2px solid #e5e7eb; font-size: 1.1rem;">
                                <span style="font-weight: 700;">TOTAL INGRESOS</span>
                                <span style="font-weight: 700; color: #10b981;">${formatCurrency(totalIngresos)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Egresos Negocio -->
                    <div style="margin-bottom: 2rem;">
                        <div style="font-weight: 600; font-size: 1.1rem; color: #ef4444; margin-bottom: 1rem; border-bottom: 2px solid #ef4444; padding-bottom: 0.5rem;">
                            EGRESOS NEGOCIO
                        </div>
                        <div style="display: grid; gap: 0.75rem; margin-left: 1rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>Gastos Operacionales</span>
                                <span style="font-weight: 600;">${formatCurrency(expensesTotal)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Costo de Mercancía (Tienda)</span>
                                <span style="font-weight: 600;">${formatCurrency(monthlyMetrics.tiendaCost)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding-top: 0.75rem; border-top: 2px solid #e5e7eb; font-size: 1.1rem;">
                                <span style="font-weight: 700;">TOTAL EGRESOS</span>
                                <span style="font-weight: 700; color: #ef4444;">${formatCurrency(totalEgresos)}</span>
                            </div>
                        </div>
                    </div>
                ` : `
                    <!-- COMBINED VIEW - Separated Columns -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                        <!-- Business Column -->
                        <div>
                            <div style="font-weight: 600; font-size: 1.1rem; color: #3b82f6; margin-bottom: 1rem; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem;">
                                🏢 NEGOCIO
                            </div>

                            <!-- Ingresos Negocio -->
                            <div style="margin-bottom: 1.5rem;">
                                <div style="font-weight: 600; color: #10b981; margin-bottom: 0.5rem;">INGRESOS</div>
                                <div style="display: grid; gap: 0.5rem; margin-left: 0.5rem; font-size: 0.9rem;">
                                    <div style="display: flex; justify-content: space-between;">
                                        <span>Matrículas</span>
                                        <span>${formatCurrency(monthlyMetrics.tuitionRevenue)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span>Tienda</span>
                                        <span>${formatCurrency(monthlyMetrics.tiendaRevenue)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span>Otros Ingresos</span>
                                        <span>${formatCurrency(otrosIngresosBusiness)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; padding-top: 0.5rem; border-top: 1px solid #e5e7eb; font-weight: 600;">
                                        <span>TOTAL</span>
                                        <span style="color: #10b981;">${formatCurrency(monthlyMetrics.tuitionRevenue + monthlyMetrics.tiendaRevenue + otrosIngresosBusiness)}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Egresos Negocio -->
                            <div>
                                <div style="font-weight: 600; color: #ef4444; margin-bottom: 0.5rem;">EGRESOS</div>
                                <div style="display: grid; gap: 0.5rem; margin-left: 0.5rem; font-size: 0.9rem;">
                                    <div style="display: flex; justify-content: space-between;">
                                        <span>Gastos Operacionales</span>
                                        <span>${formatCurrency(expensesBusiness)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span>Costo Tienda</span>
                                        <span>${formatCurrency(monthlyMetrics.tiendaCost)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; padding-top: 0.5rem; border-top: 1px solid #e5e7eb; font-weight: 600;">
                                        <span>TOTAL</span>
                                        <span style="color: #ef4444;">${formatCurrency(expensesBusiness + monthlyMetrics.tiendaCost)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Personal Column -->
                        <div>
                            <div style="font-weight: 600; font-size: 1.1rem; color: #ec4899; margin-bottom: 1rem; border-bottom: 2px solid #ec4899; padding-bottom: 0.5rem;">
                                🏠 PERSONAL
                            </div>

                            <!-- Ingresos Personal -->
                            <div style="margin-bottom: 1.5rem;">
                                <div style="font-weight: 600; color: #10b981; margin-bottom: 0.5rem;">INGRESOS</div>
                                <div style="display: grid; gap: 0.5rem; margin-left: 0.5rem; font-size: 0.9rem;">
                                    <div style="display: flex; justify-content: space-between;">
                                        <span>Otros Ingresos</span>
                                        <span>${formatCurrency(otrosIngresosPersonal)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; padding-top: 0.5rem; border-top: 1px solid #e5e7eb; font-weight: 600;">
                                        <span>TOTAL</span>
                                        <span style="color: #10b981;">${formatCurrency(otrosIngresosPersonal)}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Gastos Personal -->
                            <div>
                                <div style="font-weight: 600; color: #ef4444; margin-bottom: 0.5rem;">GASTOS</div>
                                <div style="display: grid; gap: 0.5rem; margin-left: 0.5rem; font-size: 0.9rem;">
                                    <div style="display: flex; justify-content: space-between;">
                                        <span>Gastos Personales</span>
                                        <span>${formatCurrency(expensesPersonal)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; padding-top: 0.5rem; border-top: 1px solid #e5e7eb; font-weight: 600;">
                                        <span>TOTAL</span>
                                        <span style="color: #ef4444;">${formatCurrency(expensesPersonal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `}

                <!-- Utilidad Neta -->
                <div style="background: ${utilidadNeta >= 0 ? '#d1fae5' : '#fee2e2'}; padding: 1.5rem; border-radius: 8px; border: 2px solid ${utilidadNeta >= 0 ? '#10b981' : '#ef4444'};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 700; font-size: 1.2rem; color: #1f2937;">
                                ${context === 'combined' ? 'UTILIDAD NETA TOTAL' : 'UTILIDAD NETA'}
                            </div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">
                                Margen: ${margenUtilidad.toFixed(2)}%
                            </div>
                        </div>
                        <div style="font-weight: 700; font-size: 2rem; color: ${utilidadNeta >= 0 ? '#10b981' : '#ef4444'};">
                            ${formatCurrency(utilidadNeta)}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Métricas Adicionales (Business only) -->
            ${context !== 'personal' ? `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem;">Margen Tienda</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: ${monthlyMetrics.tiendaMargin > 0 ? '#10b981' : '#ef4444'};">
                        ${monthlyMetrics.tiendaMargin?.toFixed(2) || 0}%
                    </div>
                </div>

                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem;">Ganancia Tienda</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">
                        ${formatCurrency(monthlyMetrics.tiendaProfit || 0)}
                    </div>
                </div>

                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem;">Pagos Recibidos</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #3b82f6;">
                        ${monthlyMetrics.paymentCount} pagos
                    </div>
                </div>

                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem;">Ventas Tienda</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #8b5cf6;">
                        ${monthlyMetrics.tiendaSalesCount || 0} ventas
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
}

console.log('✅ Finance module loaded successfully');
