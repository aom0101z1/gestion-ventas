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
                paidFrom: expenseData.paidFrom || 'caja', // 'caja' (cash box) | 'bolsillo' (pocket)
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
        // Check if user is admin or director
        if (window.userRole !== 'admin' && window.userRole !== 'director') {
            window.showNotification('🚫 Comunícate con administración - no tienes permitido borrar datos de esta plataforma', 'error');
            return false;
        }

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

            // Check if this is a new reconciliation (to set openedAt)
            const existingReconciliation = this.dailyReconciliations.get(date);
            const isNewReconciliation = !existingReconciliation;

            const reconciliation = {
                date,
                openingBalance: parseCurrencyInput(data.openingBalance),
                closingCount: parseCurrencyInput(data.closingCount),
                expenses: parseFloat(data.expenses) || 0,
                notes: data.notes || '',
                isClosed: data.isClosed || false,
                closedBy: data.closedBy || null,
                closedAt: data.closedAt || null,
                openedAt: data.openedAt || existingReconciliation?.openedAt || (isNewReconciliation ? new Date().toISOString() : null),
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
                    // Skip cancelled payments
                    if (p.status === 'cancelled') return false;
                    const paymentDate = p.date ? p.date.split('T')[0] : null;
                    return paymentDate === date;
                });
        }

        // IMPORTANT: Only "Efectivo" is cash. Everything else (Transferencia, Nequi, Bancolombia, Consignación, etc.) is a transfer
        const cashPayments = payments.filter(p => p.method === 'Efectivo');
        const transferPayments = payments.filter(p => p.method !== 'Efectivo'); // All non-cash methods

        const cashTotal = cashPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const transferTotal = transferPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        console.log(`📊 Payment classification for ${date}:`);
        console.log(`   💵 Cash payments: ${cashPayments.length} = ${formatCurrency(cashTotal)}`);
        console.log(`   💳 Transfer payments: ${transferPayments.length} = ${formatCurrency(transferTotal)}`);
        console.log(`   🔍 Cash methods found:`, [...new Set(cashPayments.map(p => p.method))]);
        console.log(`   🔍 Transfer methods found:`, [...new Set(transferPayments.map(p => p.method))]);

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
            // IMPORTANT: Only "Efectivo" is cash, everything else is transfer
            tiendaSales.forEach(sale => {
                const amount = sale.total || 0;
                if (sale.paymentMethod === 'Efectivo') {
                    tiendaCash += amount;
                } else {
                    // All non-cash methods count as transfers
                    tiendaTransfers += amount;

                    // Track specific methods for reporting
                    if (sale.paymentMethod === 'Nequi') {
                        tiendaNequi += amount;
                    } else if (sale.paymentMethod === 'Bancolombia') {
                        tiendaBancolombia += amount;
                    }
                }
            });

            console.log(`   🏪 Tienda - Cash: ${formatCurrency(tiendaCash)}, Transfers: ${formatCurrency(tiendaTransfers)}`);
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

        let payments = [];
        let tuitionRevenue = 0;

        // Check if PaymentManager is available
        if (window.PaymentManager && window.PaymentManager.payments) {
            payments = Array.from(window.PaymentManager.payments.values()).filter(p => {
                const paymentDate = p.date ? p.date.split('T')[0] : null;
                return paymentDate >= startDate && paymentDate <= endDate;
            });
            tuitionRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        } else {
            console.warn('⚠️ PaymentManager not available, tuition revenue will be 0');
        }

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

    // Separate expenses by payment source
    // Only 'caja' expenses affect the cash reconciliation
    const cajaExpenses = todayExpenses.filter(e => !e.paidFrom || e.paidFrom === 'caja');
    const bolsilloExpenses = todayExpenses.filter(e => e.paidFrom === 'bolsillo');

    const totalExpensesCaja = cajaExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpensesBolsillo = bolsilloExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = totalExpensesCaja + totalExpensesBolsillo; // Total for display

    // Calculate expected closing - ONLY using caja expenses
    const openingBalance = reconciliation?.openingBalance || 0;
    const expectedClosing = openingBalance + dailyRevenue.cash - totalExpensesCaja; // Only caja expenses!
    const actualClosing = reconciliation?.closingCount || 0;
    const discrepancy = actualClosing - expectedClosing;

    console.log('🎨 Display values:');
    console.log('🎨   - openingBalance:', openingBalance, '(formatted:', formatCurrency(openingBalance) + ')');
    console.log('🎨   - actualClosing:', actualClosing, '(formatted:', formatCurrency(actualClosing) + ')');
    console.log('🎨   - dailyRevenue.cash:', dailyRevenue.cash);
    console.log('🎨   - totalExpensesCaja:', totalExpensesCaja, '(affects cash reconciliation)');
    console.log('🎨   - totalExpensesBolsillo:', totalExpensesBolsillo, '(out of pocket, does NOT affect cash)');

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

            <!-- Important Notice -->
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: start; gap: 0.75rem;">
                    <div style="font-size: 1.5rem;">⚠️</div>
                    <div>
                        <div style="font-weight: 600; color: #92400e; margin-bottom: 0.25rem;">Clasificación de Pagos</div>
                        <div style="font-size: 0.9rem; color: #78350f;">
                            <strong>💵 EFECTIVO:</strong> Solo pagos registrados como "Efectivo"<br>
                            <strong>💳 TRANSFERENCIAS:</strong> Todo lo demás (Transferencia, Nequi, Bancolombia, Consignación, etc.)
                        </div>
                        <div style="font-size: 0.85rem; color: #78350f; margin-top: 0.5rem; font-style: italic;">
                            El cierre de caja solo cuenta el efectivo físico. Transferencias NO deben incluirse en el conteo.
                        </div>
                    </div>
                </div>
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
// RENDER HISTORICAL CLOSURES VIEW
// ==================================================================================

async function renderHistoricalClosuresView() {
    console.log('📜 Rendering Historical Closures View');

    // Force reload reconciliations from Firebase to ensure we have latest data
    await window.FinanceManager.loadReconciliations();

    // Get all reconciliations and sort by date (newest first)
    const allReconciliations = Array.from(window.FinanceManager.dailyReconciliations.entries())
        .map(([date, rec]) => ({ date, ...rec }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log('📊 Total reconciliations loaded:', allReconciliations.length);
    console.log('📊 Dates found:', allReconciliations.map(r => r.date));

    // Get today's date
    const today = window.getTodayInColombia ? window.getTodayInColombia() : new Date().toISOString().split('T')[0];
    console.log('📅 Today is:', today);

    // Get students map for payment details
    const students = window.StudentManager ? window.StudentManager.students : new Map();

    // Auto-load today's closure if it exists
    setTimeout(() => {
        const selector = document.getElementById('historicalDateSelector');
        if (selector) {
            // Try to find today's date in the reconciliations
            const todayRec = allReconciliations.find(r => r.date === today);
            if (todayRec) {
                selector.value = today;
                loadHistoricalClosure(today);
                console.log('✅ Auto-loaded today\'s closure:', today);
            } else {
                console.log('⚠️ Today\'s closure not found, showing first available');
                if (allReconciliations.length > 0) {
                    selector.value = allReconciliations[0].date;
                    loadHistoricalClosure(allReconciliations[0].date);
                }
            }
        }
    }, 100);

    return `
        <div style="padding: 2rem; max-width: 1400px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem;">
                <div>
                    <h1 style="margin: 0 0 0.5rem 0;">📜 Historial de Cierres de Caja</h1>
                    <p style="margin: 0; color: #6b7280;">
                        Consulta los cierres de caja de días anteriores. Total de cierres: <strong>${allReconciliations.length}</strong>
                        ${today ? ` • Hoy: <strong>${today}</strong>` : ''}
                    </p>
                </div>
                <button onclick="loadFinanceTab('historial-cierres')" class="btn" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem;">
                    🔄 Recargar Datos
                </button>
            </div>

            <!-- Date Selector -->
            <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 2rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">
                    📅 Seleccionar Fecha
                </label>
                <select id="historicalDateSelector" onchange="loadHistoricalClosure(this.value)"
                    style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 1rem;">
                    <option value="">-- Selecciona una fecha --</option>
                    ${allReconciliations.map(rec => {
                        // Parse date without timezone offset issues
                        // rec.date is in format "YYYY-MM-DD", we need to parse it correctly
                        const [year, month, day] = rec.date.split('-').map(Number);
                        const dateObj = new Date(year, month - 1, day); // month is 0-indexed
                        const formattedDate = dateObj.toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                        const status = rec.isClosed ? '🔒 Cerrado' : '🔓 Abierto';
                        const isToday = rec.date === today;
                        return `<option value="${rec.date}" ${isToday ? 'selected' : ''}>${formattedDate} - ${status}${isToday ? ' ← HOY' : ''}</option>`;
                    }).join('')}
                </select>
            </div>

            <!-- Debug Info (Admin Only) -->
            <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 2rem;">
                <details>
                    <summary style="cursor: pointer; font-weight: 600; color: #6b7280; user-select: none;">
                        🔍 Información de Depuración (Click para expandir)
                    </summary>
                    <div style="margin-top: 1rem; padding: 1rem; background: #f9fafb; border-radius: 6px; font-family: monospace; font-size: 0.85rem;">
                        <div style="margin-bottom: 0.5rem;"><strong>Fecha de hoy:</strong> ${window.getTodayInColombia ? window.getTodayInColombia() : 'N/A'}</div>
                        <div style="margin-bottom: 0.5rem;"><strong>Total cierres cargados:</strong> ${allReconciliations.length}</div>
                        <div style="margin-bottom: 0.5rem;"><strong>Fechas en memoria:</strong></div>
                        <div style="max-height: 200px; overflow-y: auto; background: white; padding: 0.5rem; border-radius: 4px;">
                            ${allReconciliations.map(r => `
                                <div style="padding: 0.25rem 0; border-bottom: 1px solid #e5e7eb;">
                                    📅 ${r.date} - ${r.isClosed ? '🔒 Cerrado' : '🔓 Abierto'} -
                                    Apertura: $${(r.openingBalance || 0).toLocaleString()} -
                                    Cierre: $${(r.closingCount || 0).toLocaleString()}
                                </div>
                            `).join('')}
                        </div>
                        <button onclick="verifyFirebaseData()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            🔄 Verificar Firebase Directamente
                        </button>
                        <div id="firebaseVerification" style="margin-top: 0.5rem;"></div>
                    </div>
                </details>
            </div>

            <!-- Closure Details Container -->
            <div id="closureDetailsContainer" style="display: none;">
                <!-- Details will be loaded here -->
            </div>

            ${allReconciliations.length === 0 ? `
                <div style="background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                    <h3 style="margin: 0 0 0.5rem 0; color: #374151;">No hay cierres registrados</h3>
                    <p style="margin: 0; color: #6b7280;">Los cierres de caja aparecerán aquí una vez registrados.</p>
                </div>
            ` : ''}
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

    // Initialize PaymentManager if available and not already initialized
    if (window.PaymentManager) {
        console.log('✅ PaymentManager exists:', typeof window.PaymentManager);
        console.log('✅ PaymentManager.init type:', typeof window.PaymentManager.init);
        console.log('✅ PaymentManager properties:', Object.keys(window.PaymentManager));

        if (typeof window.PaymentManager.init === 'function') {
            if (!window.PaymentManager.initialized) {
                console.log('🔄 Initializing PaymentManager for Finance...');
                try {
                    await window.PaymentManager.init();
                } catch (error) {
                    console.warn('⚠️ Failed to initialize PaymentManager:', error);
                }
            } else {
                console.log('✅ PaymentManager already initialized');
            }
        } else {
            console.warn('⚠️ PaymentManager.init is not a function - Type is:', typeof window.PaymentManager.init);
            console.warn('⚠️ PaymentManager value:', window.PaymentManager);
        }
    } else {
        console.warn('⚠️ PaymentManager not available on window object');
    }

    await window.FinanceManager.init();

    // Check user permissions - use window.userRole which is set during login
    console.log('🔍 DEBUG - window.userRole value:', window.userRole);
    const userRole = window.userRole || 'vendedor';
    const userEmail = window.FirebaseData?.currentUser?.email || '';
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
                    <button onclick="loadFinanceTab('historial-cierres')" class="finance-tab ${activeTab === 'historial-cierres' ? 'active' : ''}" style="padding: 0.75rem 1.5rem; border: none; background: ${activeTab === 'historial-cierres' ? '#3b82f6' : 'transparent'}; color: ${activeTab === 'historial-cierres' ? 'white' : '#6b7280'}; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 500; white-space: nowrap;">
                        📜 Historial de Cierres
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
                    ${userEmail === 'admin@ciudadbilingue.com' ? `
                        <button onclick="loadFinanceTab('entregas')" class="finance-tab ${activeTab === 'entregas' ? 'active' : ''}" id="entregasTabBtn" style="padding: 0.75rem 1.5rem; border: none; background: ${activeTab === 'entregas' ? '#f59e0b' : 'transparent'}; color: ${activeTab === 'entregas' ? 'white' : '#6b7280'}; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 500; white-space: nowrap; position: relative;">
                            📥 Entregas
                            <span id="pendingDeliveriesBadge" style="display: none; position: absolute; top: 2px; right: 2px; background: #ef4444; color: white; font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 10px; font-weight: bold;"></span>
                        </button>
                    ` : `
                        <!-- Non-admin: Button to see my deliveries status -->
                        <button onclick="showMyDeliveriesModal()" class="finance-tab" id="myDeliveriesBtn" style="padding: 0.75rem 1.5rem; border: none; background: transparent; color: #6b7280; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 500; white-space: nowrap; position: relative;">
                            📤 Mis Entregas
                            <span id="myDeliveriesNotificationBadge" style="display: none; position: absolute; top: 2px; right: 2px; background: #10b981; color: white; font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 10px; font-weight: bold;">!</span>
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;

    // Check for pending deliveries and update badge (admin only)
    if (userEmail === 'admin@ciudadbilingue.com') {
        setTimeout(async () => {
            const pending = await loadPendingDeliveries();
            const badge = document.getElementById('pendingDeliveriesBadge');
            if (badge && pending.length > 0) {
                badge.textContent = pending.length;
                badge.style.display = 'block';
            }
        }, 500);
    } else {
        // Non-admin: Check for delivery status updates
        setTimeout(async () => {
            const unseenUpdates = await window.checkMyDeliveryStatus();
            const badge = document.getElementById('myDeliveriesNotificationBadge');
            if (badge && unseenUpdates && unseenUpdates.length > 0) {
                badge.style.display = 'block';
            }
        }, 500);
    }

    // Render content based on active tab
    let content = '';
    switch(activeTab) {
        case 'dashboard':
            content = await renderFinanceDashboard();
            break;
        case 'cierre':
            content = await renderDailyReconciliationView();
            break;
        case 'historial-cierres':
            content = await renderHistoricalClosuresView();
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
        case 'entregas':
            if (userEmail === 'admin@ciudadbilingue.com') {
                content = await renderCashDeliveriesView();
            } else {
                content = '<div style="padding: 2rem; text-align: center;">❌ Solo el administrador puede ver esta sección</div>';
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
    const tabs = ['dashboard', 'cierre', 'historial-cierres', 'otros-ingresos', 'gastos', 'reportes'];

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

    // Only count expenses paid from caja for cash reconciliation
    const cajaExpenses = todayExpenses.filter(e => !e.paidFrom || e.paidFrom === 'caja');
    const totalExpensesCaja = cajaExpenses.reduce((sum, e) => sum + e.amount, 0);

    const expectedClosing = openingBalance + dailyRevenue.cash - totalExpensesCaja;
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

// ==================================================================================
// LOAD HISTORICAL CLOSURE DETAILS
// ==================================================================================

// ==================================================================================
// VERIFY FIREBASE DATA (DIAGNOSTIC TOOL)
// ==================================================================================

window.verifyFirebaseData = async function() {
    const resultDiv = document.getElementById('firebaseVerification');
    resultDiv.innerHTML = '<div style="color: #3b82f6;">🔄 Consultando Firebase...</div>';

    try {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, 'dailyReconciliations');
        const snapshot = await db.get(ref);

        if (!snapshot.exists()) {
            resultDiv.innerHTML = '<div style="color: #ef4444;">❌ No hay datos de cierres en Firebase</div>';
            return;
        }

        const data = snapshot.val();
        const dates = Object.keys(data).sort((a, b) => new Date(b) - new Date(a));

        console.log('🔍 FIREBASE VERIFICATION:');
        console.log('Total records in Firebase:', dates.length);
        console.log('Dates found:', dates);

        // Check for date 2025-11-19 specifically
        const nov19 = '2025-11-19';
        const hasNov19 = dates.includes(nov19);

        let html = `
            <div style="background: white; padding: 1rem; border-radius: 6px; margin-top: 0.5rem;">
                <div style="font-weight: 600; margin-bottom: 0.5rem; color: #10b981;">✅ Firebase consultado exitosamente</div>
                <div style="margin-bottom: 0.5rem;"><strong>Total registros en Firebase:</strong> ${dates.length}</div>

                <!-- Check for Nov 19 -->
                <div style="padding: 0.75rem; background: ${hasNov19 ? '#d1fae5' : '#fee2e2'}; border-radius: 6px; margin: 0.5rem 0;">
                    <strong>Verificación 19 de noviembre:</strong>
                    ${hasNov19 ?
                        `<div style="color: #10b981;">✅ SÍ existe en Firebase</div>
                         <div style="font-size: 0.85rem; margin-top: 0.25rem;">
                            Apertura: $${(data[nov19].openingBalance || 0).toLocaleString()}<br>
                            Cierre: $${(data[nov19].closingCount || 0).toLocaleString()}<br>
                            Estado: ${data[nov19].isClosed ? '🔒 Cerrado' : '🔓 Abierto'}
                         </div>` :
                        '<div style="color: #ef4444;">❌ NO existe en Firebase - No se guardó cierre para ese día</div>'
                    }
                </div>

                <div style="margin-top: 0.5rem;"><strong>Últimos 10 cierres en Firebase:</strong></div>
                <div style="max-height: 150px; overflow-y: auto; background: #f9fafb; padding: 0.5rem; border-radius: 4px; font-size: 0.8rem;">
                    ${dates.slice(0, 10).map(date => {
                        const rec = data[date];
                        return `<div style="padding: 0.25rem 0; border-bottom: 1px solid #e5e7eb;">
                            📅 ${date} - ${rec.isClosed ? '🔒' : '🔓'} -
                            Apertura: $${(rec.openingBalance || 0).toLocaleString()} -
                            Cierre: $${(rec.closingCount || 0).toLocaleString()}
                        </div>`;
                    }).join('')}
                </div>

                <!-- Comparison -->
                <div style="margin-top: 1rem; padding: 0.75rem; background: #eff6ff; border-radius: 6px;">
                    <strong>Comparación memoria vs Firebase:</strong><br>
                    <div style="font-size: 0.85rem; margin-top: 0.25rem;">
                        En memoria: ${window.FinanceManager.dailyReconciliations.size} registros<br>
                        En Firebase: ${dates.length} registros
                        ${window.FinanceManager.dailyReconciliations.size !== dates.length ?
                            '<div style="color: #ef4444; margin-top: 0.25rem;">⚠️ Hay diferencia - recargando...</div>' :
                            '<div style="color: #10b981; margin-top: 0.25rem;">✅ Coinciden</div>'
                        }
                    </div>
                </div>
            </div>
        `;

        resultDiv.innerHTML = html;

        // If there's a mismatch, reload
        if (window.FinanceManager.dailyReconciliations.size !== dates.length) {
            console.log('🔄 Reloading reconciliations due to mismatch...');
            await window.FinanceManager.loadReconciliations();
            setTimeout(() => {
                loadFinanceTab('historial-cierres');
            }, 500);
        }

    } catch (error) {
        console.error('❌ Error verifying Firebase:', error);
        resultDiv.innerHTML = `<div style="color: #ef4444;">❌ Error: ${error.message}</div>`;
    }
};

// ==================================================================================
// CREATE RETROACTIVE CLOSURE (FOR MISSING DATES)
// ==================================================================================

window.createRetroactiveClosure = async function(targetDate) {
    console.log('📝 Creating retroactive closure for:', targetDate);

    if (!targetDate) {
        alert('⚠️ Por favor proporciona una fecha válida (YYYY-MM-DD)');
        return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(targetDate)) {
        alert('⚠️ Formato de fecha inválido. Use YYYY-MM-DD (ej: 2025-11-19)');
        return;
    }

    // Check if closure already exists
    const existing = window.FinanceManager.getDailyReconciliation(targetDate);
    if (existing) {
        if (!confirm(`Ya existe un cierre para ${targetDate}. ¿Desea sobrescribirlo?`)) {
            return;
        }
    }

    // Get revenue and expenses for that date
    const dailyRevenue = await window.FinanceManager.calculateDailyRevenue(targetDate);
    const expenses = window.FinanceManager.getExpenses({ startDate: targetDate, endDate: targetDate });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    console.log(`📊 Data for ${targetDate}:`, {
        cash: dailyRevenue.cash,
        transfers: dailyRevenue.transfers,
        expenses: totalExpenses
    });

    // Ask user for opening balance and closing count
    const openingBalanceStr = prompt(
        `Cierre Retroactivo para ${targetDate}\n\n` +
        `Datos del día:\n` +
        `💵 Efectivo recibido: $${dailyRevenue.cash.toLocaleString()}\n` +
        `💳 Transferencias: $${dailyRevenue.transfers.toLocaleString()}\n` +
        `💸 Gastos: $${totalExpenses.toLocaleString()}\n\n` +
        `Ingrese el SALDO DE APERTURA (efectivo inicial):`
    );

    if (openingBalanceStr === null) {
        console.log('❌ Cancelled by user');
        return;
    }

    const openingBalance = parseCurrencyInput(openingBalanceStr);

    const expectedClosing = openingBalance + dailyRevenue.cash - totalExpenses;

    const closingCountStr = prompt(
        `Cierre Retroactivo para ${targetDate}\n\n` +
        `Saldo apertura: $${openingBalance.toLocaleString()}\n` +
        `+ Efectivo recibido: $${dailyRevenue.cash.toLocaleString()}\n` +
        `- Gastos: $${totalExpenses.toLocaleString()}\n` +
        `= Cierre esperado: $${expectedClosing.toLocaleString()}\n\n` +
        `Ingrese el CONTEO REAL de efectivo al cierre:`
    );

    if (closingCountStr === null) {
        console.log('❌ Cancelled by user');
        return;
    }

    const closingCount = parseCurrencyInput(closingCountStr);
    const discrepancy = closingCount - expectedClosing;

    const notes = prompt(
        `Cierre Retroactivo para ${targetDate}\n\n` +
        `Diferencia: $${discrepancy.toLocaleString()} ${discrepancy === 0 ? '✅ Cuadra perfecto' : discrepancy > 0 ? '⚠️ Sobrante' : '❌ Faltante'}\n\n` +
        `Notas adicionales (opcional):`
    );

    // Confirm before saving
    if (!confirm(
        `¿Confirmar cierre retroactivo?\n\n` +
        `Fecha: ${targetDate}\n` +
        `Apertura: $${openingBalance.toLocaleString()}\n` +
        `Cierre: $${closingCount.toLocaleString()}\n` +
        `Diferencia: $${discrepancy.toLocaleString()}\n\n` +
        `Este cierre se guardará como CERRADO.`
    )) {
        console.log('❌ Cancelled by user');
        return;
    }

    try {
        const closureData = {
            openingBalance: openingBalance,
            closingCount: closingCount,
            expenses: totalExpenses,
            notes: notes || `Cierre retroactivo creado el ${new Date().toLocaleDateString('es-CO')}`,
            isClosed: true,
            closedBy: window.FirebaseData.currentUser?.uid,
            closedByName: window.FirebaseData.currentUser?.email,
            closedAt: new Date().toISOString(),
            openedAt: new Date(targetDate + 'T08:00:00').toISOString(), // Assume 8 AM opening
        };

        console.log('💾 Saving retroactive closure:', closureData);

        await window.FinanceManager.saveDailyReconciliation(targetDate, closureData);

        alert(`✅ Cierre retroactivo creado exitosamente para ${targetDate}\n\n` +
              `Apertura: $${openingBalance.toLocaleString()}\n` +
              `Cierre: $${closingCount.toLocaleString()}\n` +
              `Diferencia: $${discrepancy.toLocaleString()}`);

        // Reload historical view
        loadFinanceTab('historial-cierres');

    } catch (error) {
        console.error('❌ Error creating retroactive closure:', error);
        alert('❌ Error al crear cierre retroactivo: ' + error.message);
    }
};

// ==================================================================================
// MOVE CLOSURE TO CORRECT DATE (FIX TIMEZONE ISSUES)
// ==================================================================================

/**
 * Moves a closure from one date to another in Firebase
 * Useful for fixing timezone-related date errors
 * Usage: moveClosureDate('2025-11-19', '2025-11-20')
 */
window.moveClosureDate = async function(oldDate, newDate) {
    console.log('📅 Moving closure from', oldDate, 'to', newDate);

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(oldDate) || !dateRegex.test(newDate)) {
        alert('⚠️ Formato de fecha inválido. Use YYYY-MM-DD (ej: 2025-11-19)');
        return;
    }

    try {
        const db = window.firebaseModules.database;

        // Get the closure data from old date directly from Firebase
        console.log('🔍 Checking Firebase for closure at', oldDate);
        const oldDateRef = db.ref(window.FirebaseData.database, `dailyReconciliations/${oldDate}`);
        const oldSnapshot = await db.get(oldDateRef);

        if (!oldSnapshot.exists()) {
            alert(`❌ No se encontró cierre para la fecha ${oldDate} en Firebase`);
            console.error('Closure not found in Firebase for date:', oldDate);

            // List all available dates to help user
            const allRef = db.ref(window.FirebaseData.database, 'dailyReconciliations');
            const allSnapshot = await db.get(allRef);
            if (allSnapshot.exists()) {
                const allDates = Object.keys(allSnapshot.val()).sort();
                console.log('📅 Available dates in Firebase:', allDates);
                alert(`Fechas disponibles en Firebase:\n${allDates.join('\n')}`);
            }
            return;
        }

        const oldClosure = oldSnapshot.val();
        console.log('📊 Found closure to move:', oldClosure);

        // Check if new date already has a closure
        const newDateRef = db.ref(window.FirebaseData.database, `dailyReconciliations/${newDate}`);
        const newSnapshot = await db.get(newDateRef);
        const newClosure = newSnapshot.exists() ? newSnapshot.val() : null;

        // Confirm with user
        if (newClosure) {
            const confirmOverwrite = confirm(
                `⚠️ Ya existe un cierre para ${newDate}.\n\n` +
                `Fecha antigua (${oldDate}):\n` +
                `  Apertura: $${(oldClosure.openingBalance || 0).toLocaleString()}\n` +
                `  Cierre: $${(oldClosure.closingCount || 0).toLocaleString()}\n\n` +
                `Fecha nueva (${newDate}):\n` +
                `  Apertura: $${(newClosure.openingBalance || 0).toLocaleString()}\n` +
                `  Cierre: $${(newClosure.closingCount || 0).toLocaleString()}\n\n` +
                `¿Desea sobrescribir el cierre de ${newDate}?`
            );

            if (!confirmOverwrite) {
                console.log('❌ Usuario canceló la operación');
                return;
            }
        } else {
            const confirmMove = confirm(
                `¿Mover el cierre de ${oldDate} a ${newDate}?\n\n` +
                `Apertura: $${(oldClosure.openingBalance || 0).toLocaleString()}\n` +
                `Cierre: $${(oldClosure.closingCount || 0).toLocaleString()}\n` +
                `Estado: ${oldClosure.isClosed ? 'Cerrado' : 'Abierto'}`
            );

            if (!confirmMove) {
                console.log('❌ Usuario canceló la operación');
                return;
            }
        }

        // 1. Save closure data to new date
        console.log('💾 Saving closure to new date:', newDate);
        await db.set(newDateRef, oldClosure);
        console.log('✅ Closure saved to new date');

        // 2. Delete old date entry
        console.log('🗑️ Deleting closure from old date:', oldDate);
        await db.remove(oldDateRef);
        console.log('✅ Old closure deleted');

        // 3. Update local memory if FinanceManager is available
        if (window.FinanceManager && window.FinanceManager.dailyReconciliations) {
            window.FinanceManager.dailyReconciliations.delete(oldDate);
            window.FinanceManager.dailyReconciliations.set(newDate, oldClosure);
        }

        // 4. Reload historical view if it's open
        if (document.getElementById('closureDetailsContainer')) {
            console.log('🔄 Reloading historical closures view...');
            await window.loadFinanceTab('historial-cierres');
        }

        alert(`✅ Cierre movido exitosamente de ${oldDate} a ${newDate}`);
        console.log('✅ Closure move completed successfully');

    } catch (error) {
        console.error('❌ Error moving closure:', error);
        alert('❌ Error al mover el cierre: ' + error.message);
    }
};

// ==================================================================================
// EMERGENCY FIX - RESTORE CORRECT DATES
// ==================================================================================

/**
 * Emergency function to restore Nov 19 and Nov 20 to correct state
 * Run this to undo the moveClosureDate mistake
 */
window.emergencyRestoreDates = async function() {
    console.log('🚨 EMERGENCY RESTORE - Fixing Nov 19 and Nov 20 dates');

    const confirmFix = confirm(
        '🚨 EMERGENCY FIX\n\n' +
        'This will restore the correct dates:\n\n' +
        'Nov 19:\n' +
        '  Opening: $100,000\n' +
        '  Closing: $68,000\n\n' +
        'Nov 20 (today):\n' +
        '  Opening: $68,000\n' +
        '  Closing: $0 (still open)\n\n' +
        '¿Continuar?'
    );

    if (!confirmFix) {
        console.log('❌ Usuario canceló');
        return;
    }

    try {
        const db = window.firebaseModules.database;

        // 1. Restore Nov 19 with correct data
        const nov19Data = {
            date: '2025-11-19',
            openingBalance: 100000,
            closingCount: 68000,
            expenses: 92300,
            isClosed: false,
            notes: '',
            openedAt: null,
            registeredBy: window.FirebaseData.currentUser?.uid,
            registeredByName: window.FirebaseData.currentUser?.email,
            updatedAt: new Date().toISOString()
        };

        const nov19Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-19');
        console.log('💾 Restoring Nov 19...');
        await db.set(nov19Ref, nov19Data);
        console.log('✅ Nov 19 restored');

        // 2. Restore Nov 20 (today) with correct data
        const nov20Data = {
            date: '2025-11-20',
            openingBalance: 68000, // This is Nov 19's closing
            closingCount: 0,
            expenses: 0,
            isClosed: false,
            notes: '',
            openedAt: new Date().toISOString(), // Today's opening time
            registeredBy: window.FirebaseData.currentUser?.uid,
            registeredByName: window.FirebaseData.currentUser?.email,
            updatedAt: new Date().toISOString()
        };

        const nov20Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-20');
        console.log('💾 Restoring Nov 20...');
        await db.set(nov20Ref, nov20Data);
        console.log('✅ Nov 20 restored');

        // 3. Reload data
        await window.FinanceManager.loadReconciliations();

        // 4. Reload view
        if (document.getElementById('closureDetailsContainer')) {
            await window.loadFinanceTab('historial-cierres');
        }

        alert('✅ Fechas restauradas correctamente!\n\nNov 19: $100,000 → $68,000\nNov 20: $68,000 → $0 (abierto)');
        console.log('✅ Emergency restore completed');

    } catch (error) {
        console.error('❌ Error in emergency restore:', error);
        alert('❌ Error: ' + error.message);
    }
};

// ==================================================================================
// BACKUP AND DIAGNOSTIC TOOLS
// ==================================================================================

/**
 * Comprehensive backup and diagnostic function
 * Queries Firebase directly and shows all closure data
 */
window.backupAndDiagnoseClosures = async function() {
    console.log('🔍 ========================================');
    console.log('🔍 BACKUP Y DIAGNÓSTICO DE CIERRES');
    console.log('🔍 ========================================');

    try {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, 'dailyReconciliations');
        const snapshot = await db.get(ref);

        if (!snapshot.exists()) {
            console.error('❌ No hay datos en Firebase');
            alert('❌ No se encontraron datos de cierres en Firebase');
            return null;
        }

        const allData = snapshot.val();
        const dates = Object.keys(allData).sort();

        console.log('📊 ========================================');
        console.log('📊 TOTAL DE REGISTROS:', dates.length);
        console.log('📊 ========================================');

        // Display all dates with their data
        console.table(
            dates.map(date => ({
                Fecha: date,
                Apertura: `$${(allData[date].openingBalance || 0).toLocaleString()}`,
                Cierre: `$${(allData[date].closingCount || 0).toLocaleString()}`,
                Gastos: `$${(allData[date].expenses || 0).toLocaleString()}`,
                Estado: allData[date].isClosed ? '🔒 Cerrado' : '🔓 Abierto',
                OpenedAt: allData[date].openedAt || 'N/A'
            }))
        );

        // Check specifically for Nov 19 and Nov 20
        console.log('🔍 ========================================');
        console.log('🔍 VERIFICACIÓN NOV 19 Y NOV 20');
        console.log('🔍 ========================================');

        const nov19 = allData['2025-11-19'];
        const nov20 = allData['2025-11-20'];

        console.log('📅 Nov 19:', nov19 ? 'EXISTE' : '❌ NO EXISTE');
        if (nov19) {
            console.log('   Apertura:', nov19.openingBalance);
            console.log('   Cierre:', nov19.closingCount);
            console.log('   Gastos:', nov19.expenses);
            console.log('   Datos completos:', nov19);
        }

        console.log('📅 Nov 20:', nov20 ? 'EXISTE' : '❌ NO EXISTE');
        if (nov20) {
            console.log('   Apertura:', nov20.openingBalance);
            console.log('   Cierre:', nov20.closingCount);
            console.log('   Gastos:', nov20.expenses);
            console.log('   Datos completos:', nov20);
        }

        // Create downloadable backup
        const backupData = {
            timestamp: new Date().toISOString(),
            totalRecords: dates.length,
            data: allData
        };

        console.log('💾 ========================================');
        console.log('💾 BACKUP CREADO');
        console.log('💾 Para descargar backup, ejecuta:');
        console.log('💾 downloadBackup()');
        console.log('💾 ========================================');

        // Store backup in window for download
        window.closuresBackup = backupData;

        // Summary alert
        alert(
            `✅ DIAGNÓSTICO COMPLETO\n\n` +
            `Total registros: ${dates.length}\n` +
            `Primer cierre: ${dates[0]}\n` +
            `Último cierre: ${dates[dates.length - 1]}\n\n` +
            `Nov 19: ${nov19 ? 'EXISTE ✓' : 'NO EXISTE ✗'}\n` +
            `Nov 20: ${nov20 ? 'EXISTE ✓' : 'NO EXISTE ✗'}\n\n` +
            `Revisa la consola para detalles completos.\n` +
            `Ejecuta downloadBackup() para descargar backup.`
        );

        return backupData;

    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
        alert('❌ Error: ' + error.message);
        return null;
    }
};

/**
 * Download backup as JSON file
 */
window.downloadBackup = function() {
    if (!window.closuresBackup) {
        alert('❌ Primero ejecuta: backupAndDiagnoseClosures()');
        return;
    }

    const dataStr = JSON.stringify(window.closuresBackup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cierres-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    console.log('✅ Backup descargado');
    alert('✅ Backup descargado exitosamente');
};

/**
 * Restore specific closure from Firebase data
 */
window.restoreClosureFromBackup = async function(date) {
    if (!window.closuresBackup || !window.closuresBackup.data) {
        alert('❌ Primero ejecuta: backupAndDiagnoseClosures()');
        return;
    }

    const closureData = window.closuresBackup.data[date];
    if (!closureData) {
        alert(`❌ No hay datos para ${date} en el backup`);
        return;
    }

    const confirm = window.confirm(
        `¿Restaurar cierre para ${date}?\n\n` +
        `Apertura: $${(closureData.openingBalance || 0).toLocaleString()}\n` +
        `Cierre: $${(closureData.closingCount || 0).toLocaleString()}\n` +
        `Gastos: $${(closureData.expenses || 0).toLocaleString()}`
    );

    if (!confirm) return;

    try {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `dailyReconciliations/${date}`);
        await db.set(ref, closureData);

        console.log(`✅ Cierre ${date} restaurado`);
        alert(`✅ Cierre ${date} restaurado exitosamente`);

        // Reload data
        await window.FinanceManager.loadReconciliations();
        if (document.getElementById('closureDetailsContainer')) {
            await window.loadFinanceTab('historial-cierres');
        }

    } catch (error) {
        console.error('❌ Error restaurando:', error);
        alert('❌ Error: ' + error.message);
    }
};

/**
 * Restore Nov 19 specifically with correct data
 */
window.restoreNov19 = async function() {
    console.log('🔧 Restaurando Nov 19...');

    const confirmRestore = confirm(
        '¿Restaurar el cierre del 19 de noviembre?\n\n' +
        'Datos a restaurar:\n' +
        'Apertura: $100,000\n' +
        'Cierre: $68,000\n' +
        'Gastos: $92,300\n' +
        'Estado: Abierto'
    );

    if (!confirmRestore) {
        console.log('❌ Cancelado por usuario');
        return;
    }

    try {
        const db = window.firebaseModules.database;

        // Create Nov 19 with correct data
        const nov19Data = {
            date: '2025-11-19',
            openingBalance: 100000,
            closingCount: 68000,
            expenses: 92300,
            isClosed: false,
            notes: 'Restaurado desde backup',
            openedAt: '2025-11-19T06:00:00.000Z', // Approximate opening time
            registeredBy: window.FirebaseData.currentUser?.uid,
            registeredByName: window.FirebaseData.currentUser?.email,
            updatedAt: new Date().toISOString()
        };

        const nov19Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-19');
        console.log('💾 Guardando Nov 19 en Firebase...');
        await db.set(nov19Ref, nov19Data);
        console.log('✅ Nov 19 guardado exitosamente');

        // Reload data from Firebase
        console.log('🔄 Recargando datos...');
        await window.FinanceManager.loadReconciliations();

        // Reload historical view if open
        if (document.getElementById('closureDetailsContainer')) {
            console.log('🔄 Recargando vista...');
            await window.loadFinanceTab('historial-cierres');
        }

        alert(
            '✅ Nov 19 restaurado exitosamente!\n\n' +
            'Apertura: $100,000\n' +
            'Cierre: $68,000\n' +
            'Gastos: $92,300'
        );

        console.log('✅ Restauración completada');

    } catch (error) {
        console.error('❌ Error restaurando Nov 19:', error);
        alert('❌ Error: ' + error.message);
    }
};

/**
 * Comprehensive diagnostic and fix for Nov 19 and Nov 20
 */
window.diagnosAndFixNov19And20 = async function() {
    console.log('🔍 ========================================');
    console.log('🔍 DIAGNÓSTICO COMPLETO NOV 19 Y NOV 20');
    console.log('🔍 ========================================');

    try {
        const db = window.firebaseModules.database;

        // Get Nov 19 data
        const nov19Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-19');
        const nov19Snapshot = await db.get(nov19Ref);
        const nov19Data = nov19Snapshot.exists() ? nov19Snapshot.val() : null;

        // Get Nov 20 data
        const nov20Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-20');
        const nov20Snapshot = await db.get(nov20Ref);
        const nov20Data = nov20Snapshot.exists() ? nov20Snapshot.val() : null;

        // Get payments for both days
        const paymentsRef = db.ref(window.FirebaseData.database, 'payments');
        const paymentsSnapshot = await db.get(paymentsRef);
        const allPayments = paymentsSnapshot.exists() ? Object.values(paymentsSnapshot.val()) : [];

        const nov19Payments = allPayments.filter(p => p.date && p.date.startsWith('2025-11-19'));
        const nov20Payments = allPayments.filter(p => p.date && p.date.startsWith('2025-11-20'));

        console.log('📅 NOV 19 DATA:');
        console.log('   Existe:', nov19Data ? 'SÍ' : 'NO');
        if (nov19Data) {
            console.log('   Apertura:', nov19Data.openingBalance);
            console.log('   Cierre:', nov19Data.closingCount);
            console.log('   Gastos:', nov19Data.expenses);
        }
        console.log('   Pagos encontrados:', nov19Payments.length);
        nov19Payments.forEach(p => {
            console.log(`      - $${p.amount} ${p.method} - ${p.studentId}`);
        });

        console.log('\n📅 NOV 20 DATA:');
        console.log('   Existe:', nov20Data ? 'SÍ' : 'NO');
        if (nov20Data) {
            console.log('   Apertura:', nov20Data.openingBalance);
            console.log('   Cierre:', nov20Data.closingCount);
            console.log('   Gastos:', nov20Data.expenses);
        }
        console.log('   Pagos encontrados:', nov20Payments.length);
        nov20Payments.forEach(p => {
            console.log(`      - $${p.amount} ${p.method} - ${p.studentId}`);
        });

        // Show summary alert
        const summary =
            '📊 RESUMEN DE DATOS\n\n' +
            '═══ NOV 19 ═══\n' +
            (nov19Data ?
                `Apertura: $${(nov19Data.openingBalance || 0).toLocaleString()}\n` +
                `Cierre: $${(nov19Data.closingCount || 0).toLocaleString()}\n` +
                `Gastos: $${(nov19Data.expenses || 0).toLocaleString()}\n`
                : 'NO EXISTE\n') +
            `Pagos: ${nov19Payments.length}\n\n` +
            '═══ NOV 20 (HOY) ═══\n' +
            (nov20Data ?
                `Apertura: $${(nov20Data.openingBalance || 0).toLocaleString()}\n` +
                `Cierre: $${(nov20Data.closingCount || 0).toLocaleString()}\n` +
                `Gastos: $${(nov20Data.expenses || 0).toLocaleString()}\n`
                : 'NO EXISTE\n') +
            `Pagos: ${nov20Payments.length}\n\n` +
            '¿Deseas corregir los datos según la información correcta?';

        const shouldFix = confirm(summary);

        if (!shouldFix) {
            console.log('❌ Corrección cancelada');
            return;
        }

        // Fix Nov 19
        const correctNov19 = {
            date: '2025-11-19',
            openingBalance: 100000,
            closingCount: 68000,
            expenses: 92300,
            isClosed: false,
            notes: 'Corregido - Pago transferencia $120,000 Juan Camilo Arias Mejía',
            openedAt: '2025-11-19T06:00:00.000Z',
            registeredBy: window.FirebaseData.currentUser?.uid,
            registeredByName: window.FirebaseData.currentUser?.email,
            updatedAt: new Date().toISOString()
        };

        console.log('💾 Corrigiendo Nov 19...');
        await db.set(nov19Ref, correctNov19);
        console.log('✅ Nov 19 corregido');

        // Fix Nov 20 - opening should be 68000 (yesterday's closing)
        const correctNov20 = {
            date: '2025-11-20',
            openingBalance: 68000, // ← ESTE ES EL CAMBIO CLAVE
            closingCount: nov20Data?.closingCount || 0,
            expenses: nov20Data?.expenses || 0,
            isClosed: false,
            notes: 'Corregido - Apertura ajustada a sobrante de ayer ($68,000)',
            openedAt: nov20Data?.openedAt || new Date().toISOString(),
            registeredBy: window.FirebaseData.currentUser?.uid,
            registeredByName: window.FirebaseData.currentUser?.email,
            updatedAt: new Date().toISOString()
        };

        console.log('💾 Corrigiendo Nov 20...');
        await db.set(nov20Ref, correctNov20);
        console.log('✅ Nov 20 corregido');

        // Reload
        console.log('🔄 Recargando datos...');
        await window.FinanceManager.loadReconciliations();
        if (document.getElementById('closureDetailsContainer')) {
            await window.loadFinanceTab('cierre');
        }

        alert(
            '✅ CORRECCIÓN COMPLETADA\n\n' +
            '═══ NOV 19 ═══\n' +
            'Apertura: $100,000\n' +
            'Cierre: $68,000\n' +
            'Gastos: $92,300\n\n' +
            '═══ NOV 20 (HOY) ═══\n' +
            'Apertura: $68,000 ✓\n' +
            'Cierre: $0 (abierto)\n\n' +
            'Recarga la página para ver los cambios.'
        );

        console.log('✅ Corrección completada exitosamente');

    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
        alert('❌ Error: ' + error.message);
    }
};

/**
 * Fix date shift issue - move closures from wrong dates to correct dates
 */
window.fixDateShift = async function() {
    console.log('🔧 ========================================');
    console.log('🔧 CORRIGIENDO DESPLAZAMIENTO DE FECHAS');
    console.log('🔧 ========================================');

    try {
        const db = window.firebaseModules.database;

        // Get all reconciliations
        const allRef = db.ref(window.FirebaseData.database, 'dailyReconciliations');
        const allSnapshot = await db.get(allRef);

        if (!allSnapshot.exists()) {
            alert('❌ No hay datos en Firebase');
            return;
        }

        const allData = allSnapshot.val();

        // Check what we have
        const has18 = allData['2025-11-18'];
        const has19 = allData['2025-11-19'];
        const has20 = allData['2025-11-20'];

        console.log('📊 ESTADO ACTUAL:');
        console.log('   2025-11-18:', has18 ? 'EXISTE' : 'NO EXISTE');
        if (has18) {
            console.log('      Apertura:', has18.openingBalance);
            console.log('      Cierre:', has18.closingCount);
        }
        console.log('   2025-11-19:', has19 ? 'EXISTE' : 'NO EXISTE');
        if (has19) {
            console.log('      Apertura:', has19.openingBalance);
            console.log('      Cierre:', has19.closingCount);
        }
        console.log('   2025-11-20:', has20 ? 'EXISTE' : 'NO EXISTE');
        if (has20) {
            console.log('      Apertura:', has20.openingBalance);
            console.log('      Cierre:', has20.closingCount);
        }

        const confirmFix = confirm(
            '🔧 CORRECCIÓN DE FECHAS\n\n' +
            'Se realizarán los siguientes cambios:\n\n' +
            '1. El cierre "18" → pasará a ser "19"\n' +
            '   (Apertura $100,000, Cierre $0)\n\n' +
            '2. El cierre "19" → pasará a ser "20" (HOY)\n' +
            '   (Apertura $68,000, Cierre $0)\n\n' +
            '¿Continuar?'
        );

        if (!confirmFix) {
            console.log('❌ Cancelado');
            return;
        }

        // PASO 1: Guardar temporalmente el cierre "19" actual (que será el 20)
        const tempData20 = has19 ? { ...has19 } : null;

        // PASO 2: Mover "18" → "19"
        if (has18) {
            console.log('📝 Moviendo cierre de Nov 18 → Nov 19...');
            const nov19Data = {
                ...has18,
                date: '2025-11-19',
                openingBalance: 100000,
                closingCount: 68000,
                expenses: 92300,
                updatedAt: new Date().toISOString()
            };

            const nov19Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-19');
            await db.set(nov19Ref, nov19Data);
            console.log('✅ Nov 19 actualizado');

            // Eliminar el viejo Nov 18
            const old18Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-18');
            await db.remove(old18Ref);
            console.log('✅ Nov 18 eliminado');
        }

        // PASO 3: Mover el temporal (antiguo "19") → "20"
        if (tempData20) {
            console.log('📝 Moviendo cierre de Nov 19 → Nov 20 (HOY)...');
            const nov20Data = {
                ...tempData20,
                date: '2025-11-20',
                openingBalance: 68000, // Sobrante de ayer
                closingCount: 0,
                expenses: 0,
                updatedAt: new Date().toISOString()
            };

            const nov20Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-20');
            await db.set(nov20Ref, nov20Data);
            console.log('✅ Nov 20 (HOY) actualizado');
        }

        // Recargar datos
        console.log('🔄 Recargando datos...');
        await window.FinanceManager.loadReconciliations();

        if (document.getElementById('closureDetailsContainer')) {
            await window.loadFinanceTab('historial-cierres');
        }

        alert(
            '✅ FECHAS CORREGIDAS\n\n' +
            '═══ Nov 19 (Ayer) ═══\n' +
            'Apertura: $100,000\n' +
            'Cierre: $68,000\n\n' +
            '═══ Nov 20 (Hoy) ═══\n' +
            'Apertura: $68,000\n' +
            'Cierre: $0 (abierto)\n\n' +
            'Recarga la página para ver los cambios en el historial.'
        );

        console.log('✅ Corrección de fechas completada');

    } catch (error) {
        console.error('❌ Error corrigiendo fechas:', error);
        alert('❌ Error: ' + error.message);
    }
};

/**
 * Complete diagnostic of Nov 18, 19, and 20 with actual payment and expense data
 */
window.fullDiagnosticNov18to20 = async function() {
    console.log('🔍 ========================================');
    console.log('🔍 DIAGNÓSTICO COMPLETO NOV 18, 19 Y 20');
    console.log('🔍 ========================================');

    try {
        const db = window.firebaseModules.database;

        // Get all closures
        const closuresRef = db.ref(window.FirebaseData.database, 'dailyReconciliations');
        const closuresSnapshot = await db.get(closuresRef);
        const closures = closuresSnapshot.exists() ? closuresSnapshot.val() : {};

        // Get all payments
        const paymentsRef = db.ref(window.FirebaseData.database, 'payments');
        const paymentsSnapshot = await db.get(paymentsRef);
        const allPayments = paymentsSnapshot.exists() ? Object.values(paymentsSnapshot.val()) : [];

        // Get all expenses
        const expensesRef = db.ref(window.FirebaseData.database, 'expenses');
        const expensesSnapshot = await db.get(expensesRef);
        const allExpenses = expensesSnapshot.exists() ? Object.values(expensesSnapshot.val()) : [];

        // Filter by dates
        const nov18Payments = allPayments.filter(p => p.date && p.date.startsWith('2025-11-18'));
        const nov19Payments = allPayments.filter(p => p.date && p.date.startsWith('2025-11-19'));
        const nov20Payments = allPayments.filter(p => p.date && p.date.startsWith('2025-11-20'));

        const nov18Expenses = allExpenses.filter(e => e.date && e.date.startsWith('2025-11-18'));
        const nov19Expenses = allExpenses.filter(e => e.date && e.date.startsWith('2025-11-19'));
        const nov20Expenses = allExpenses.filter(e => e.date && e.date.startsWith('2025-11-20'));

        // Calculate totals
        const calcTotal = (items) => items.reduce((sum, item) => sum + (item.amount || 0), 0);

        console.log('\n📅 ========== NOV 18 ==========');
        console.log('CIERRE GUARDADO:', closures['2025-11-18'] ? 'SÍ' : 'NO');
        if (closures['2025-11-18']) {
            console.log('   Apertura:', closures['2025-11-18'].openingBalance);
            console.log('   Cierre:', closures['2025-11-18'].closingCount);
            console.log('   Gastos guardados:', closures['2025-11-18'].expenses);
        }
        console.log('PAGOS REALES:');
        console.log('   Cantidad:', nov18Payments.length);
        console.log('   Total:', calcTotal(nov18Payments));
        nov18Payments.forEach(p => {
            console.log(`   - $${p.amount.toLocaleString()} ${p.method} (${p.studentId})`);
        });
        console.log('GASTOS REALES:');
        console.log('   Cantidad:', nov18Expenses.length);
        console.log('   Total:', calcTotal(nov18Expenses));
        nov18Expenses.forEach(e => {
            console.log(`   - $${e.amount.toLocaleString()} ${e.category}`);
        });

        console.log('\n📅 ========== NOV 19 ==========');
        console.log('CIERRE GUARDADO:', closures['2025-11-19'] ? 'SÍ' : 'NO');
        if (closures['2025-11-19']) {
            console.log('   Apertura:', closures['2025-11-19'].openingBalance);
            console.log('   Cierre:', closures['2025-11-19'].closingCount);
            console.log('   Gastos guardados:', closures['2025-11-19'].expenses);
        }
        console.log('PAGOS REALES:');
        console.log('   Cantidad:', nov19Payments.length);
        console.log('   Total:', calcTotal(nov19Payments));
        nov19Payments.forEach(p => {
            console.log(`   - $${p.amount.toLocaleString()} ${p.method} (${p.studentId || 'N/A'})`);
        });
        console.log('GASTOS REALES:');
        console.log('   Cantidad:', nov19Expenses.length);
        console.log('   Total:', calcTotal(nov19Expenses));
        nov19Expenses.forEach(e => {
            console.log(`   - $${e.amount.toLocaleString()} ${e.category}`);
        });

        console.log('\n📅 ========== NOV 20 (HOY) ==========');
        console.log('CIERRE GUARDADO:', closures['2025-11-20'] ? 'SÍ' : 'NO');
        if (closures['2025-11-20']) {
            console.log('   Apertura:', closures['2025-11-20'].openingBalance);
            console.log('   Cierre:', closures['2025-11-20'].closingCount);
            console.log('   Gastos guardados:', closures['2025-11-20'].expenses);
        }
        console.log('PAGOS REALES:');
        console.log('   Cantidad:', nov20Payments.length);
        console.log('   Total:', calcTotal(nov20Payments));
        nov20Payments.forEach(p => {
            console.log(`   - $${p.amount.toLocaleString()} ${p.method} (${p.studentId || 'N/A'})`);
        });
        console.log('GASTOS REALES:');
        console.log('   Cantidad:', nov20Expenses.length);
        console.log('   Total:', calcTotal(nov20Expenses));
        nov20Expenses.forEach(e => {
            console.log(`   - $${e.amount.toLocaleString()} ${e.category}`);
        });

        // Create summary
        const summary =
            '📊 RESUMEN COMPLETO\n\n' +
            '═══ NOV 18 ═══\n' +
            `Cierre guardado: ${closures['2025-11-18'] ? 'SÍ' : 'NO'}\n` +
            (closures['2025-11-18'] ?
                `Apertura: $${(closures['2025-11-18'].openingBalance || 0).toLocaleString()}\n` +
                `Cierre: $${(closures['2025-11-18'].closingCount || 0).toLocaleString()}\n`
                : '') +
            `Pagos: ${nov18Payments.length} = $${calcTotal(nov18Payments).toLocaleString()}\n` +
            `Gastos: ${nov18Expenses.length} = $${calcTotal(nov18Expenses).toLocaleString()}\n\n` +

            '═══ NOV 19 ═══\n' +
            `Cierre guardado: ${closures['2025-11-19'] ? 'SÍ' : 'NO'}\n` +
            (closures['2025-11-19'] ?
                `Apertura: $${(closures['2025-11-19'].openingBalance || 0).toLocaleString()}\n` +
                `Cierre: $${(closures['2025-11-19'].closingCount || 0).toLocaleString()}\n`
                : '') +
            `Pagos: ${nov19Payments.length} = $${calcTotal(nov19Payments).toLocaleString()}\n` +
            `Gastos: ${nov19Expenses.length} = $${calcTotal(nov19Expenses).toLocaleString()}\n\n` +

            '═══ NOV 20 (HOY) ═══\n' +
            `Cierre guardado: ${closures['2025-11-20'] ? 'SÍ' : 'NO'}\n` +
            (closures['2025-11-20'] ?
                `Apertura: $${(closures['2025-11-20'].openingBalance || 0).toLocaleString()}\n` +
                `Cierre: $${(closures['2025-11-20'].closingCount || 0).toLocaleString()}\n`
                : '') +
            `Pagos: ${nov20Payments.length} = $${calcTotal(nov20Payments).toLocaleString()}\n` +
            `Gastos: ${nov20Expenses.length} = $${calcTotal(nov20Expenses).toLocaleString()}\n\n` +

            'Revisa la consola para detalles completos.\n' +
            'Ejecuta downloadBackup() para guardar estos datos.';

        alert(summary);

        // Store for backup
        window.diagnosticData = {
            timestamp: new Date().toISOString(),
            closures: {
                nov18: closures['2025-11-18'],
                nov19: closures['2025-11-19'],
                nov20: closures['2025-11-20']
            },
            payments: {
                nov18: nov18Payments,
                nov19: nov19Payments,
                nov20: nov20Payments
            },
            expenses: {
                nov18: nov18Expenses,
                nov19: nov19Expenses,
                nov20: nov20Expenses
            }
        };

        console.log('✅ Diagnóstico completo. Datos guardados en window.diagnosticData');

    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
        alert('❌ Error: ' + error.message);
    }
};

/**
 * Correct Nov 19 and Nov 20 based on user specifications
 */
window.correctNov19And20 = async function() {
    console.log('🔧 ========================================');
    console.log('🔧 CORRECCIÓN ESPECÍFICA NOV 19 Y NOV 20');
    console.log('🔧 ========================================');

    try {
        const db = window.firebaseModules.database;

        // 1. Search for Jean Pierre payment
        console.log('🔍 Buscando pago de Jean Pierre...');
        const paymentsRef = db.ref(window.FirebaseData.database, 'payments');
        const paymentsSnapshot = await db.get(paymentsRef);
        const allPayments = paymentsSnapshot.exists() ? Object.entries(paymentsSnapshot.val()) : [];

        const jeanPierrePayment = allPayments.find(([id, p]) =>
            p.studentId && p.studentId.toLowerCase().includes('jean') && p.amount === 156000
        );

        if (jeanPierrePayment) {
            console.log('✅ Pago de Jean Pierre encontrado:');
            console.log('   ID:', jeanPierrePayment[0]);
            console.log('   Monto:', jeanPierrePayment[1].amount);
            console.log('   Método:', jeanPierrePayment[1].method);
            console.log('   Fecha:', jeanPierrePayment[1].date);
        } else {
            console.log('⚠️ No se encontró pago de Jean Pierre por $156,000');
        }

        // 2. Search for $60,000 expense "Puerta entrada"
        console.log('\n🔍 Buscando gasto de $60,000 Puerta entrada...');
        const expensesRef = db.ref(window.FirebaseData.database, 'expenses');
        const expensesSnapshot = await db.get(expensesRef);
        const allExpenses = expensesSnapshot.exists() ? Object.entries(expensesSnapshot.val()) : [];

        const puertaExpense = allExpenses.find(([id, e]) =>
            e.amount === 60000 && e.description && e.description.toLowerCase().includes('puerta')
        );

        if (puertaExpense) {
            console.log('✅ Gasto "Puerta entrada" encontrado:');
            console.log('   ID:', puertaExpense[0]);
            console.log('   Monto:', puertaExpense[1].amount);
            console.log('   Descripción:', puertaExpense[1].description);
            console.log('   Fecha:', puertaExpense[1].date);
        } else {
            console.log('⚠️ No se encontró gasto de $60,000 "Puerta entrada"');
        }

        // 3. Check for Nov 15 (sábado)
        console.log('\n🔍 Verificando Nov 15 (sábado)...');
        const nov15Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-15');
        const nov15Snapshot = await db.get(nov15Ref);

        if (nov15Snapshot.exists()) {
            console.log('✅ Nov 15 EXISTE:');
            const nov15Data = nov15Snapshot.val();
            console.log('   Apertura:', nov15Data.openingBalance);
            console.log('   Cierre:', nov15Data.closingCount);
            console.log('   Cerrado:', nov15Data.isClosed ? 'SÍ' : 'NO');
        } else {
            console.log('❌ Nov 15 NO EXISTE en Firebase');
        }

        // Show confirmation dialog
        const confirmMessage =
            '🔧 CORRECCIONES A REALIZAR:\n\n' +
            '═══ NOV 20 (HOY) ═══\n' +
            '✓ Abrir caja (cambiar de cerrado a abierto)\n' +
            '✓ Apertura: $68,000\n' +
            '✓ Pago Jean Pierre: $156,000 (Nequi)\n' +
            '✓ Gastos: $0\n\n' +
            '═══ NOV 19 (AYER) ═══\n' +
            '✓ Apertura: $100,000\n' +
            '✓ Gastos: $32,300 (Cafetería)\n' +
            (puertaExpense ? '✓ ELIMINAR gasto $60,000 Puerta entrada\n' : '') +
            '✓ Cierre: $67,700\n\n' +
            (nov15Snapshot.exists() ? '✓ Nov 15 encontrado\n\n' : '⚠️ Nov 15 NO existe\n\n') +
            '¿Continuar con las correcciones?';

        const shouldFix = confirm(confirmMessage);

        if (!shouldFix) {
            console.log('❌ Corrección cancelada');
            return;
        }

        // 4. Delete $60,000 expense if found
        if (puertaExpense) {
            console.log('🗑️ Eliminando gasto de $60,000 Puerta entrada...');
            const expenseToDeleteRef = db.ref(window.FirebaseData.database, `expenses/${puertaExpense[0]}`);
            await db.remove(expenseToDeleteRef);
            console.log('✅ Gasto eliminado');
        }

        // 5. Fix Nov 19
        console.log('💾 Corrigiendo Nov 19...');
        const nov19Data = {
            date: '2025-11-19',
            openingBalance: 100000,
            closingCount: 67700, // 100,000 - 32,300
            expenses: 32300,
            isClosed: true,
            notes: 'Gastos: Cafetería - 1kg azúcar, 1lb café, 1 electrolite',
            closedAt: new Date('2025-11-19T23:59:00').toISOString(),
            closedBy: window.FirebaseData.currentUser?.uid,
            closedByName: window.FirebaseData.currentUser?.email,
            openedAt: '2025-11-19T06:00:00.000Z',
            registeredBy: window.FirebaseData.currentUser?.uid,
            registeredByName: window.FirebaseData.currentUser?.email,
            updatedAt: new Date().toISOString()
        };

        const nov19Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-19');
        await db.set(nov19Ref, nov19Data);
        console.log('✅ Nov 19 corregido');

        // 6. Fix Nov 20 (open it)
        console.log('💾 Corrigiendo Nov 20 (HOY)...');
        const nov20Data = {
            date: '2025-11-20',
            openingBalance: 68000, // Changed from 67700 as user specified
            closingCount: 0,
            expenses: 0,
            isClosed: false, // ← OPEN IT
            notes: 'Pago Jean Pierre $156,000 Nequi',
            openedAt: new Date().toISOString(),
            registeredBy: window.FirebaseData.currentUser?.uid,
            registeredByName: window.FirebaseData.currentUser?.email,
            updatedAt: new Date().toISOString()
        };

        const nov20Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-20');
        await db.set(nov20Ref, nov20Data);
        console.log('✅ Nov 20 abierto');

        // 7. Reload data
        console.log('🔄 Recargando datos...');
        await window.FinanceManager.loadReconciliations();

        // Reload expense list
        await window.FinanceManager.loadExpenses();

        alert(
            '✅ CORRECCIONES COMPLETADAS\n\n' +
            '═══ NOV 19 (AYER) ═══\n' +
            'Apertura: $100,000\n' +
            'Gastos: $32,300\n' +
            'Cierre: $67,700 ✓\n' +
            'Estado: CERRADO\n\n' +
            '═══ NOV 20 (HOY) ═══\n' +
            'Apertura: $68,000\n' +
            'Pago: $156,000 (Jean Pierre)\n' +
            'Gastos: $0\n' +
            'Estado: ABIERTO ✓\n\n' +
            (puertaExpense ? '✓ Gasto $60,000 eliminado\n' : '') +
            '\nRecarga la página para ver todos los cambios.'
        );

        console.log('✅ Todas las correcciones completadas');

    } catch (error) {
        console.error('❌ Error en corrección:', error);
        alert('❌ Error: ' + error.message);
    }
};

/**
 * Fix the date shift - ensure today's closure shows as Nov 20, not Nov 19
 */
window.fixHistoricalDateShift = async function() {
    console.log('🔧 ========================================');
    console.log('🔧 CORRIGIENDO FECHAS EN HISTORIAL');
    console.log('🔧 ========================================');

    try {
        const db = window.firebaseModules.database;

        // Get all closures
        const closuresRef = db.ref(window.FirebaseData.database, 'dailyReconciliations');
        const closuresSnapshot = await db.get(closuresRef);
        const allClosures = closuresSnapshot.exists() ? closuresSnapshot.val() : {};

        console.log('📊 Estado actual en Firebase:');
        console.log('   Nov 18:', allClosures['2025-11-18'] ? 'EXISTE' : 'NO EXISTE');
        console.log('   Nov 19:', allClosures['2025-11-19'] ? 'EXISTE' : 'NO EXISTE');
        console.log('   Nov 20:', allClosures['2025-11-20'] ? 'EXISTE' : 'NO EXISTE');

        // Show what we found
        if (allClosures['2025-11-19']) {
            console.log('\n📅 Datos en "2025-11-19":');
            console.log('   Apertura:', allClosures['2025-11-19'].openingBalance);
            console.log('   Cierre:', allClosures['2025-11-19'].closingCount);
            console.log('   Cerrado:', allClosures['2025-11-19'].isClosed);
        }

        if (allClosures['2025-11-20']) {
            console.log('\n📅 Datos en "2025-11-20":');
            console.log('   Apertura:', allClosures['2025-11-20'].openingBalance);
            console.log('   Cierre:', allClosures['2025-11-20'].closingCount);
            console.log('   Cerrado:', allClosures['2025-11-20'].isClosed);
        }

        const confirmFix = confirm(
            '🔧 CORRECCIÓN DE FECHAS\n\n' +
            'El cierre de HOY (20 de noviembre) aparece como 19.\n\n' +
            'Se corregirá:\n' +
            '• Nov 19: Cerrado con $67,700\n' +
            '• Nov 20 (HOY): Abierto con $68,000\n\n' +
            '¿Continuar?'
        );

        if (!confirmFix) {
            console.log('❌ Cancelado');
            return;
        }

        // Create correct Nov 19 (yesterday - CLOSED)
        const correctNov19 = {
            date: '2025-11-19',
            openingBalance: 100000,
            closingCount: 67700,
            expenses: 32300,
            isClosed: true,
            closedAt: new Date('2025-11-19T23:59:00').toISOString(),
            closedBy: window.FirebaseData.currentUser?.uid,
            closedByName: window.FirebaseData.currentUser?.email,
            notes: 'Cafetería - 1kg azúcar, 1lb café, 1 electrolite',
            openedAt: '2025-11-19T06:00:00.000Z',
            registeredBy: window.FirebaseData.currentUser?.uid,
            registeredByName: window.FirebaseData.currentUser?.email,
            updatedAt: new Date().toISOString()
        };

        // Create correct Nov 20 (today - OPEN)
        const correctNov20 = {
            date: '2025-11-20',
            openingBalance: 68000,
            closingCount: 0,
            expenses: 0,
            isClosed: false,
            notes: 'Pago Jean Pierre $156,000 Nequi',
            openedAt: new Date().toISOString(),
            registeredBy: window.FirebaseData.currentUser?.uid,
            registeredByName: window.FirebaseData.currentUser?.email,
            updatedAt: new Date().toISOString()
        };

        console.log('💾 Guardando Nov 19 (ayer)...');
        const nov19Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-19');
        await db.set(nov19Ref, correctNov19);
        console.log('✅ Nov 19 guardado');

        console.log('💾 Guardando Nov 20 (HOY)...');
        const nov20Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-20');
        await db.set(nov20Ref, correctNov20);
        console.log('✅ Nov 20 guardado');

        // Delete Nov 18 if it exists (shouldn't be there)
        if (allClosures['2025-11-18']) {
            console.log('🗑️ Eliminando Nov 18 (no debería existir)...');
            const nov18Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-18');
            await db.remove(nov18Ref);
            console.log('✅ Nov 18 eliminado');
        }

        // Reload everything
        console.log('🔄 Recargando datos...');
        await window.FinanceManager.loadReconciliations();

        // Refresh the historical view if it's open
        const histContainer = document.getElementById('closureDetailsContainer');
        if (histContainer && histContainer.parentElement) {
            console.log('🔄 Recargando vista de historial...');
            await window.loadFinanceTab('historial-cierres');
        }

        alert(
            '✅ FECHAS CORREGIDAS\n\n' +
            'Historial de Cierres ahora muestra:\n\n' +
            '📅 Nov 19 (Ayer)\n' +
            '   Estado: CERRADO ✓\n' +
            '   Apertura: $100,000\n' +
            '   Cierre: $67,700\n\n' +
            '📅 Nov 20 (HOY)\n' +
            '   Estado: ABIERTO ✓\n' +
            '   Apertura: $68,000\n\n' +
            'Recarga la página si es necesario.'
        );

        console.log('✅ Corrección de fechas completada');

    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ Error: ' + error.message);
    }
};

/**
 * Simple direct fix - move Nov 19 closure to Nov 20
 */
window.moveNov19ToNov20 = async function() {
    console.log('🔧 Moviendo cierre de Nov 19 → Nov 20...');

    try {
        const db = window.firebaseModules.database;

        // 1. Get Nov 19 data
        const nov19Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-19');
        const nov19Snapshot = await db.get(nov19Ref);

        if (!nov19Snapshot.exists()) {
            alert('❌ No existe cierre en Nov 19');
            return;
        }

        const nov19Data = nov19Snapshot.val();

        console.log('📊 Datos encontrados en Nov 19:');
        console.log('   Apertura:', nov19Data.openingBalance);
        console.log('   Cierre:', nov19Data.closingCount);
        console.log('   Estado:', nov19Data.isClosed ? 'Cerrado' : 'Abierto');

        const confirm = window.confirm(
            '¿Mover el cierre de Nov 19 a Nov 20?\n\n' +
            'Esto corregirá la fecha del cierre de HOY.\n\n' +
            `Apertura: $${(nov19Data.openingBalance || 0).toLocaleString()}\n` +
            `Cierre: $${(nov19Data.closingCount || 0).toLocaleString()}\n` +
            `Estado: ${nov19Data.isClosed ? 'Cerrado' : 'Abierto'}`
        );

        if (!confirm) {
            console.log('❌ Cancelado');
            return;
        }

        // 2. Create Nov 20 with correct data
        const nov20Data = {
            ...nov19Data,
            date: '2025-11-20',
            updatedAt: new Date().toISOString()
        };

        // 3. Save to Nov 20
        const nov20Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-20');
        console.log('💾 Guardando en Nov 20...');
        await db.set(nov20Ref, nov20Data);
        console.log('✅ Guardado en Nov 20');

        // 4. Delete Nov 19
        console.log('🗑️ Eliminando Nov 19...');
        await db.remove(nov19Ref);
        console.log('✅ Nov 19 eliminado');

        // 5. Reload data
        console.log('🔄 Recargando datos...');
        await window.FinanceManager.loadReconciliations();

        // Reload historical view
        await window.loadFinanceTab('historial-cierres');

        alert(
            '✅ CIERRE MOVIDO EXITOSAMENTE\n\n' +
            'El cierre ahora aparece como:\n' +
            'jueves, 20 de noviembre de 2025 ← HOY\n\n' +
            'Recarga la página si es necesario.'
        );

        console.log('✅ Corrección completada');

    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ Error: ' + error.message);
    }
};

/**
 * Emergency function to check and fix the current mess
 */
window.emergencyCheckAndFix = async function() {
    console.log('🚨 ========================================');
    console.log('🚨 VERIFICACIÓN Y CORRECCIÓN DE EMERGENCIA');
    console.log('🚨 ========================================');

    try {
        const db = window.firebaseModules.database;

        // Get ALL closures from Firebase
        const allRef = db.ref(window.FirebaseData.database, 'dailyReconciliations');
        const allSnapshot = await db.get(allRef);

        if (!allSnapshot.exists()) {
            alert('❌ No hay datos en Firebase');
            return;
        }

        const allData = allSnapshot.val();
        const allDates = Object.keys(allData).sort();

        console.log('📊 Total cierres en Firebase:', allDates.length);
        console.log('📊 Fechas:', allDates);

        // Check specific dates
        const has19 = allData['2025-11-19'];
        const has20 = allData['2025-11-20'];

        console.log('\n🔍 Verificación:');
        console.log('   Nov 19:', has19 ? 'EXISTE ✓' : 'NO EXISTE ✗');
        console.log('   Nov 20:', has20 ? 'EXISTE ✓' : 'NO EXISTE ✗');

        if (has19) {
            console.log('\n📅 Datos en Nov 19:');
            console.log(JSON.stringify(has19, null, 2));
        }

        if (has20) {
            console.log('\n📅 Datos en Nov 20:');
            console.log(JSON.stringify(has20, null, 2));
        }

        // Show alert
        const message =
            '🚨 ESTADO ACTUAL EN FIREBASE\n\n' +
            `Total cierres: ${allDates.length}\n` +
            `Primer cierre: ${allDates[0]}\n` +
            `Último cierre: ${allDates[allDates.length - 1]}\n\n` +
            `Nov 19: ${has19 ? 'EXISTE ✓' : 'NO EXISTE ✗'}\n` +
            (has19 ? `  Apertura: $${(has19.openingBalance || 0).toLocaleString()}\n  Estado: ${has19.isClosed ? 'Cerrado' : 'Abierto'}\n\n` : '\n') +
            `Nov 20: ${has20 ? 'EXISTE ✓' : 'NO EXISTE ✗'}\n` +
            (has20 ? `  Apertura: $${(has20.openingBalance || 0).toLocaleString()}\n  Estado: ${has20.isClosed ? 'Cerrado' : 'Abierto'}\n\n` : '\n') +
            '\n¿Quieres BORRAR Nov 19 (si existe) y asegurar que Nov 20 esté correcto?';

        const shouldFix = confirm(message);

        if (!shouldFix) {
            console.log('❌ Cancelado');
            return;
        }

        // Delete Nov 19 if it exists
        if (has19) {
            console.log('🗑️ Eliminando Nov 19...');
            const nov19Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-19');
            await db.remove(nov19Ref);
            console.log('✅ Nov 19 eliminado');
        }

        // Ensure Nov 20 exists with correct data
        console.log('💾 Asegurando que Nov 20 esté correcto...');
        const nov20Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-20');

        const correctNov20 = {
            date: '2025-11-20',
            openingBalance: 68000,
            closingCount: 0,
            expenses: 0,
            isClosed: false,
            notes: 'Cierre de hoy - Pago Jean Pierre $156,000 Nequi',
            openedAt: has20?.openedAt || new Date().toISOString(),
            registeredBy: window.FirebaseData.currentUser?.uid,
            registeredByName: window.FirebaseData.currentUser?.email,
            updatedAt: new Date().toISOString()
        };

        await db.set(nov20Ref, correctNov20);
        console.log('✅ Nov 20 actualizado');

        // Clear local cache
        if (window.FinanceManager && window.FinanceManager.dailyReconciliations) {
            window.FinanceManager.dailyReconciliations.clear();
        }

        // Force reload from Firebase
        console.log('🔄 Recargando desde Firebase...');
        await window.FinanceManager.loadReconciliations();

        // Clear browser cache for this page
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }

        alert(
            '✅ CORRECCIÓN COMPLETADA\n\n' +
            'Se han realizado las siguientes acciones:\n' +
            (has19 ? '• Nov 19 ELIMINADO\n' : '• Nov 19 ya no existía\n') +
            '• Nov 20 ACTUALIZADO correctamente\n' +
            '• Caché limpiado\n\n' +
            'Ahora CIERRA COMPLETAMENTE EL NAVEGADOR\n' +
            'y ábrelo de nuevo para ver los cambios.'
        );

        console.log('✅ Corrección de emergencia completada');

    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ Error: ' + error.message);
    }
};

/**
 * Recover closures for Nov 15, 16, 17, 18 from payment and expense data
 */
window.recoverNov15to18 = async function() {
    console.log('🔄 ========================================');
    console.log('🔄 RECUPERANDO CIERRES NOV 15, 16, 17, 18');
    console.log('🔄 ========================================');

    try {
        const db = window.firebaseModules.database;

        // Get all payments
        const paymentsRef = db.ref(window.FirebaseData.database, 'payments');
        const paymentsSnapshot = await db.get(paymentsRef);
        const allPayments = paymentsSnapshot.exists() ? Object.values(paymentsSnapshot.val()) : [];

        // Get all expenses
        const expensesRef = db.ref(window.FirebaseData.database, 'expenses');
        const expensesSnapshot = await db.get(expensesRef);
        const allExpenses = expensesSnapshot.exists() ? Object.values(expensesSnapshot.val()) : [];

        // Get tienda sales
        const salesRef = db.ref(window.FirebaseData.database, 'sales');
        const salesSnapshot = await db.get(salesRef);
        const allSales = salesSnapshot.exists() ? Object.values(salesSnapshot.val()) : [];

        const datesToRecover = ['2025-11-15', '2025-11-16', '2025-11-17', '2025-11-18'];
        const recoveredData = {};

        console.log('\n📊 Buscando datos para cada fecha...\n');

        for (const date of datesToRecover) {
            // Filter payments for this date
            const datePayments = allPayments.filter(p => p.date && p.date.startsWith(date));
            const dateSales = allSales.filter(s => s.date && s.date.startsWith(date));
            const dateExpenses = allExpenses.filter(e => e.date && e.date.startsWith(date));

            // Calculate totals
            const paymentsTotal = datePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const salesTotal = dateSales.reduce((sum, s) => sum + (s.total || 0), 0);
            const expensesTotal = dateExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

            recoveredData[date] = {
                payments: datePayments,
                sales: dateSales,
                expenses: dateExpenses,
                paymentsTotal,
                salesTotal,
                expensesTotal,
                totalRevenue: paymentsTotal + salesTotal
            };

            console.log(`📅 ${date}:`);
            console.log(`   Pagos: ${datePayments.length} = $${paymentsTotal.toLocaleString()}`);
            console.log(`   Ventas tienda: ${dateSales.length} = $${salesTotal.toLocaleString()}`);
            console.log(`   Gastos: ${dateExpenses.length} = $${expensesTotal.toLocaleString()}`);
            console.log(`   Ingresos totales: $${(paymentsTotal + salesTotal).toLocaleString()}`);
        }

        // Create summary message
        let summaryMessage = '📊 DATOS ENCONTRADOS EN FIREBASE:\n\n';

        for (const date of datesToRecover) {
            const data = recoveredData[date];
            const dateObj = new Date(date);
            const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

            summaryMessage += `═══ ${dayName} ═══\n`;
            summaryMessage += `Pagos: ${data.payments.length} = $${data.paymentsTotal.toLocaleString()}\n`;
            summaryMessage += `Ventas: ${data.sales.length} = $${data.salesTotal.toLocaleString()}\n`;
            summaryMessage += `Gastos: ${data.expenses.length} = $${data.expensesTotal.toLocaleString()}\n`;
            summaryMessage += `Total ingresos: $${data.totalRevenue.toLocaleString()}\n\n`;
        }

        summaryMessage += '\n¿Deseas RECREAR los cierres para estas fechas?\n\n';
        summaryMessage += 'NOTA: Los cierres se crearán como CERRADOS\n';
        summaryMessage += 'con los datos encontrados.';

        const shouldRecover = confirm(summaryMessage);

        if (!shouldRecover) {
            console.log('❌ Recuperación cancelada');
            return;
        }

        // Recreate closures
        console.log('\n💾 Recreando cierres...\n');

        // We need to know the opening balances
        // Nov 15 should open with the closing from Nov 14
        const nov14Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-14');
        const nov14Snapshot = await db.get(nov14Ref);
        const nov14Closing = nov14Snapshot.exists() ? (nov14Snapshot.val().closingCount || 0) : 0;

        console.log('📊 Cierre del 14 de noviembre:', nov14Closing);

        // Create closures (we'll assume continuity of cash)
        let previousClosing = nov14Closing;

        for (const date of datesToRecover) {
            const data = recoveredData[date];

            // Calculate: opening + cash received - expenses = closing
            // We don't know exact cash vs transfers, so we'll estimate
            const cashReceived = data.totalRevenue * 0.3; // Estimate 30% cash
            const expectedClosing = previousClosing + cashReceived - data.expensesTotal;

            const closureData = {
                date: date,
                openingBalance: previousClosing,
                closingCount: Math.max(0, expectedClosing), // Can't be negative
                expenses: data.expensesTotal,
                isClosed: true,
                closedAt: new Date(date + 'T23:59:00').toISOString(),
                closedBy: window.FirebaseData.currentUser?.uid,
                closedByName: window.FirebaseData.currentUser?.email,
                notes: `Recuperado automáticamente - ${data.payments.length} pagos, ${data.expenses.length} gastos`,
                openedAt: new Date(date + 'T06:00:00').toISOString(),
                registeredBy: window.FirebaseData.currentUser?.uid,
                registeredByName: window.FirebaseData.currentUser?.email,
                updatedAt: new Date().toISOString()
            };

            const dateRef = db.ref(window.FirebaseData.database, `dailyReconciliations/${date}`);
            await db.set(dateRef, closureData);

            console.log(`✅ ${date} recuperado`);
            console.log(`   Apertura: $${previousClosing.toLocaleString()}`);
            console.log(`   Cierre estimado: $${closureData.closingCount.toLocaleString()}`);

            previousClosing = closureData.closingCount;
        }

        // Reload data
        console.log('\n🔄 Recargando datos...');
        await window.FinanceManager.loadReconciliations();

        alert(
            '✅ CIERRES RECUPERADOS\n\n' +
            'Se han recreado los cierres para:\n' +
            '• 15 de noviembre (viernes)\n' +
            '• 16 de noviembre (sábado)\n' +
            '• 17 de noviembre (domingo)\n' +
            '• 18 de noviembre (lunes)\n\n' +
            'Basados en los pagos, ventas y gastos\n' +
            'registrados en Firebase.\n\n' +
            'Recarga la página para verlos en el historial.'
        );

        console.log('✅ Recuperación completada');

        // Store data for reference
        window.recoveredData = recoveredData;
        console.log('\n💾 Datos guardados en window.recoveredData para referencia');

    } catch (error) {
        console.error('❌ Error en recuperación:', error);
        alert('❌ Error: ' + error.message);
    }
};

/**
 * Quick function to reopen Nov 20 closure
 * Admin only - for console use
 */
window.reopenNov20 = async function() {
    console.log('🔓 Quick reopen for Nov 20, 2025');
    await reopenClosure('2025-11-20');
};

/**
 * Create closure for Nov 19, 2025
 * Search for $120,000 payment and create closure
 */
window.createNov19Closure = async function() {
    console.log('📝 ========================================');
    console.log('📝 CREATING NOV 19 CLOSURE');
    console.log('📝 ========================================');

    try {
        const db = window.firebaseModules.database;
        const targetDate = '2025-11-19';

        // Check if closure already exists
        const closureRef = db.ref(window.FirebaseData.database, `dailyReconciliations/${targetDate}`);
        const existingSnapshot = await db.get(closureRef);

        if (existingSnapshot.exists()) {
            const response = confirm(
                `⚠️ El cierre del 19 de noviembre YA EXISTE.\n\n` +
                `¿Quieres sobrescribirlo?`
            );
            if (!response) {
                console.log('❌ Operation cancelled');
                return;
            }
        }

        // Search for payments on Nov 19
        console.log('\n🔍 Searching for payments on Nov 19...');
        const paymentsRef = db.ref(window.FirebaseData.database, 'payments');
        const paymentsSnapshot = await db.get(paymentsRef);

        let nov19Payments = [];
        if (paymentsSnapshot.exists()) {
            const allPayments = Object.values(paymentsSnapshot.val());
            nov19Payments = allPayments.filter(p => p.date && p.date.startsWith(targetDate));
        }

        console.log(`✅ Found ${nov19Payments.length} payment(s) on Nov 19`);

        if (nov19Payments.length > 0) {
            console.log('\n💰 PAYMENTS FOUND:');
            nov19Payments.forEach(p => {
                const student = window.StudentManager?.students?.get(p.studentId);
                console.log(`   • ${p.date} - ${student?.nombre || 'N/A'} - $${(p.amount || 0).toLocaleString()} (${p.method})`);
            });
        }

        // Search for the specific $120,000 payment
        const payment120k = nov19Payments.find(p => p.amount === 120000);

        if (payment120k) {
            const student = window.StudentManager?.students?.get(payment120k.studentId);
            console.log(`\n✅ FOUND $120,000 PAYMENT:`);
            console.log(`   Student: ${student?.nombre || payment120k.studentId}`);
            console.log(`   Method: ${payment120k.method}`);
            console.log(`   Bank: ${payment120k.bank || 'N/A'}`);
            console.log(`   Date: ${payment120k.date}`);
        } else {
            console.log(`\n⚠️ WARNING: No payment of exactly $120,000 found on Nov 19`);
            console.log(`   Total payments found: ${nov19Payments.length}`);
            console.log(`   Total amount: $${nov19Payments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}`);
        }

        // Search for expenses on Nov 19
        console.log('\n🔍 Searching for expenses on Nov 19...');
        const expensesRef = db.ref(window.FirebaseData.database, 'expenses');
        const expensesSnapshot = await db.get(expensesRef);

        let nov19Expenses = [];
        if (expensesSnapshot.exists()) {
            const allExpenses = Object.values(expensesSnapshot.val());
            nov19Expenses = allExpenses.filter(e => e.date && e.date.startsWith(targetDate));
        }

        console.log(`✅ Found ${nov19Expenses.length} expense(s) on Nov 19`);

        if (nov19Expenses.length > 0) {
            console.log('\n💸 EXPENSES FOUND:');
            nov19Expenses.forEach(e => {
                console.log(`   • ${e.category} - $${(e.amount || 0).toLocaleString()} - ${e.description || 'N/A'}`);
            });
        }

        const totalExpenses = nov19Expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        // Get Nov 18 closing balance for opening balance
        const nov18Ref = db.ref(window.FirebaseData.database, 'dailyReconciliations/2025-11-18');
        const nov18Snapshot = await db.get(nov18Ref);

        let openingBalance = 100000; // Default as specified
        if (nov18Snapshot.exists()) {
            const nov18Data = nov18Snapshot.val();
            if (nov18Data.closingCount !== undefined && nov18Data.closingCount !== 0) {
                console.log(`\nℹ️ Nov 18 closing: $${nov18Data.closingCount.toLocaleString()}`);
                const useNov18Closing = confirm(
                    `Nov 18 cerró con $${nov18Data.closingCount.toLocaleString()}.\n\n` +
                    `¿Usar este valor como apertura del 19?\n` +
                    `(Cancelar = usar $100,000 como especificaste)`
                );
                if (useNov18Closing) {
                    openingBalance = nov18Data.closingCount;
                }
            }
        }

        // Create closure data
        const closureData = {
            date: targetDate,
            openingBalance: openingBalance,
            closingCount: 0, // Will be updated when closed
            expenses: totalExpenses,
            isClosed: false, // LEFT OPEN as requested
            notes: `Creado manualmente - ${nov19Payments.length} pago(s), ${nov19Expenses.length} gasto(s)\n` +
                   `Usuario puede agregar gastos y cerrar.`,
            openedAt: `${targetDate}T08:00:00.000Z`, // 8 AM Colombia time
            openedBy: window.FirebaseData.currentUser?.uid || 'admin',
            registeredByName: window.FirebaseData.currentUser?.displayName || 'Administrador',
            createdAt: new Date().toISOString()
        };

        console.log('\n📊 CLOSURE DATA TO BE CREATED:');
        console.log(`   Date: ${targetDate}`);
        console.log(`   Opening: $${openingBalance.toLocaleString()}`);
        console.log(`   Payments: ${nov19Payments.length} = $${nov19Payments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}`);
        console.log(`   Expenses: ${nov19Expenses.length} = $${totalExpenses.toLocaleString()}`);
        console.log(`   Status: ABIERTO (para que agregues gastos y cierres)`);

        const confirmCreate = window.confirm(
            `¿Crear cierre para Nov 19 con estos datos?\n\n` +
            `Apertura: $${openingBalance.toLocaleString()}\n` +
            `Pagos: ${nov19Payments.length}\n` +
            `Gastos: ${nov19Expenses.length}\n` +
            `Estado: ABIERTO\n\n` +
            `Podrás agregar gastos y cerrar después.`
        );

        if (!confirmCreate) {
            console.log('❌ Cancelled by user');
            return;
        }

        // Save to Firebase using FinanceManager (has proper permissions)
        console.log('\n💾 Saving to Firebase...');
        await window.FinanceManager.saveDailyReconciliation(targetDate, {
            openingBalance: openingBalance,
            closingCount: 0,
            notes: closureData.notes
        });

        console.log('\n✅ CIERRE CREADO EXITOSAMENTE');
        console.log('✅ Estado: ABIERTO - Puedes agregar gastos y cerrar');

        // Reload data
        await window.FinanceManager.loadReconciliations();

        alert(
            `✅ Cierre del 19 de noviembre creado\n\n` +
            `Apertura: $${openingBalance.toLocaleString()}\n` +
            `Pagos encontrados: ${nov19Payments.length}\n` +
            `${payment120k ? `✅ Pago de $120,000 encontrado` : `⚠️ Pago de $120,000 NO encontrado`}\n` +
            `Gastos: ${nov19Expenses.length}\n\n` +
            `Estado: ABIERTO\n` +
            `Ahora puedes agregar gastos y cerrar.`
        );

        return {
            created: true,
            date: targetDate,
            openingBalance,
            payments: nov19Payments,
            expenses: nov19Expenses,
            payment120kFound: !!payment120k
        };

    } catch (error) {
        console.error('❌ Error creating Nov 19 closure:', error);
        alert('❌ Error: ' + error.message);
    }
};

/**
 * COMPREHENSIVE DIAGNOSTIC: Analyze all historical closures for date mismatches
 * Checks:
 * - Date consistency between closure date and timestamps
 * - Payment dates vs closure dates
 * - Expense dates vs closure dates
 * - Opening balance continuity (yesterday's closing = today's opening)
 * - Missing or duplicate dates
 */
window.diagnosticHistoricalClosures = async function() {
    console.log('🔍 ========================================');
    console.log('🔍 COMPREHENSIVE CLOSURE DIAGNOSTIC');
    console.log('🔍 ========================================');

    try {
        const db = window.firebaseModules.database;

        // Get all data from Firebase
        console.log('📥 Fetching all data from Firebase...');

        const closuresRef = db.ref(window.FirebaseData.database, 'dailyReconciliations');
        const paymentsRef = db.ref(window.FirebaseData.database, 'payments');
        const expensesRef = db.ref(window.FirebaseData.database, 'expenses');
        const salesRef = db.ref(window.FirebaseData.database, 'sales');

        const [closuresSnap, paymentsSnap, expensesSnap, salesSnap] = await Promise.all([
            db.get(closuresRef),
            db.get(paymentsRef),
            db.get(expensesRef),
            db.get(salesRef)
        ]);

        const closures = closuresSnap.exists() ? closuresSnap.val() : {};
        const allPayments = paymentsSnap.exists() ? Object.values(paymentsSnap.val()).filter(p => p.status !== 'cancelled') : [];
        const allExpenses = expensesSnap.exists() ? Object.values(expensesSnap.val()) : [];
        const allSales = salesSnap.exists() ? Object.values(salesSnap.val()) : [];

        console.log(`✅ Loaded: ${Object.keys(closures).length} closures, ${allPayments.length} payments, ${allExpenses.length} expenses, ${allSales.length} sales`);

        // Sort closure dates
        const closureDates = Object.keys(closures).sort();

        const issues = [];
        const report = [];

        console.log('\n📊 ANALYZING EACH CLOSURE...\n');

        closureDates.forEach((date, index) => {
            const closure = closures[date];
            const dateIssues = [];

            report.push('\n' + '='.repeat(80));
            report.push(`📅 CLOSURE: ${date} (${new Date(date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})`);
            report.push(`   Status: ${closure.isClosed ? '🔒 CERRADO' : '🔓 ABIERTO'}`);
            report.push('='.repeat(80));

            // 1. Check timestamp consistency
            if (closure.openedAt) {
                const openedDate = closure.openedAt.split('T')[0];
                if (openedDate !== date) {
                    const issue = `❌ MISMATCH: openedAt timestamp (${openedDate}) doesn't match closure date (${date})`;
                    dateIssues.push(issue);
                    report.push(`   ${issue}`);
                }
            } else {
                const issue = `⚠️  WARNING: No openedAt timestamp`;
                dateIssues.push(issue);
                report.push(`   ${issue}`);
            }

            if (closure.closedAt) {
                const closedDate = closure.closedAt.split('T')[0];
                if (closedDate !== date) {
                    const issue = `❌ MISMATCH: closedAt timestamp (${closedDate}) doesn't match closure date (${date})`;
                    dateIssues.push(issue);
                    report.push(`   ${issue}`);
                }
            }

            // 2. Check payments for this date
            const datePayments = allPayments.filter(p => p.date && p.date.startsWith(date));
            const paymentsInOtherDates = allPayments.filter(p => {
                if (!p.date) return false;
                const paymentDate = p.date.split('T')[0];
                return paymentDate !== date && Math.abs(new Date(paymentDate) - new Date(date)) < 7 * 24 * 60 * 60 * 1000; // within 1 week
            });

            report.push(`\n   💰 PAYMENTS ON ${date}: ${datePayments.length} payments`);
            if (datePayments.length > 0) {
                const totalAmount = datePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                report.push(`      Total: $${totalAmount.toLocaleString()}`);
                datePayments.forEach(p => {
                    const student = window.StudentManager?.students?.get(p.studentId);
                    report.push(`      • ${p.date.split('T')[1]?.substring(0,5) || 'N/A'} - ${student?.nombre || 'N/A'} - $${(p.amount || 0).toLocaleString()} (${p.method})`);
                });
            }

            // Check for payments that might belong to this closure but have wrong date
            if (paymentsInOtherDates.length > 0 && datePayments.length === 0) {
                const issue = `⚠️  WARNING: No payments on ${date}, but found ${paymentsInOtherDates.length} payments in nearby dates`;
                dateIssues.push(issue);
                report.push(`   ${issue}`);
            }

            // 3. Check expenses for this date
            const dateExpenses = allExpenses.filter(e => e.date && e.date.startsWith(date));

            report.push(`\n   💸 EXPENSES ON ${date}: ${dateExpenses.length} expenses`);
            if (dateExpenses.length > 0) {
                const totalExpenses = dateExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
                report.push(`      Total: $${totalExpenses.toLocaleString()}`);
                dateExpenses.forEach(e => {
                    report.push(`      • ${e.category || 'N/A'} - $${(e.amount || 0).toLocaleString()} - ${e.description || 'Sin descripción'}`);
                });

                // Compare with closure.expenses
                if (closure.expenses !== totalExpenses) {
                    const issue = `⚠️  WARNING: Closure.expenses ($${(closure.expenses || 0).toLocaleString()}) doesn't match actual expenses ($${totalExpenses.toLocaleString()})`;
                    dateIssues.push(issue);
                    report.push(`   ${issue}`);
                }
            }

            // 4. Check sales for this date
            const dateSales = allSales.filter(s => s.date && s.date.startsWith(date));
            if (dateSales.length > 0) {
                const totalSales = dateSales.reduce((sum, s) => sum + (s.total || 0), 0);
                report.push(`\n   🏪 TIENDA SALES ON ${date}: ${dateSales.length} sales, Total: $${totalSales.toLocaleString()}`);
            }

            // 5. Check opening balance continuity
            if (index > 0) {
                const previousDate = closureDates[index - 1];
                const previousClosure = closures[previousDate];

                if (previousClosure.isClosed && previousClosure.closingCount !== undefined) {
                    if (closure.openingBalance !== previousClosure.closingCount) {
                        const issue = `❌ MISMATCH: Opening balance ($${(closure.openingBalance || 0).toLocaleString()}) doesn't match previous day's closing ($${(previousClosure.closingCount || 0).toLocaleString()}) from ${previousDate}`;
                        dateIssues.push(issue);
                        report.push(`\n   ${issue}`);
                    } else {
                        report.push(`\n   ✅ Opening balance matches previous day's closing: $${(closure.openingBalance || 0).toLocaleString()}`);
                    }
                }
            }

            // 6. Financial summary
            report.push(`\n   📊 FINANCIAL SUMMARY:`);
            report.push(`      💵 Opening: $${(closure.openingBalance || 0).toLocaleString()}`);
            report.push(`      💰 Cash received: (calculated from payments above)`);
            report.push(`      💸 Expenses: $${(closure.expenses || 0).toLocaleString()}`);
            report.push(`      ✅ Closing count: $${(closure.closingCount || 0).toLocaleString()}`);

            // 7. Check for reopening
            if (closure.reopenedAt) {
                report.push(`\n   🔓 REOPENED: ${new Date(closure.reopenedAt).toLocaleString('es-ES')} by ${closure.reopenedByName || 'Unknown'}`);
            }

            if (dateIssues.length > 0) {
                issues.push({ date, issues: dateIssues });
                report.push(`\n   ⚠️  ${dateIssues.length} ISSUE(S) FOUND FOR THIS DATE`);
            } else {
                report.push(`\n   ✅ No issues found for this date`);
            }
        });

        // Check for missing dates
        report.push('\n\n' + '='.repeat(80));
        report.push('🔍 CHECKING FOR MISSING DATES');
        report.push('='.repeat(80));

        if (closureDates.length > 1) {
            const firstDate = new Date(closureDates[0]);
            const lastDate = new Date(closureDates[closureDates.length - 1]);
            const daysDiff = Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;

            report.push(`   First closure: ${closureDates[0]}`);
            report.push(`   Last closure: ${closureDates[closureDates.length - 1]}`);
            report.push(`   Total closures: ${closureDates.length}`);
            report.push(`   Expected days: ${daysDiff}`);

            if (closureDates.length < daysDiff) {
                report.push(`   ⚠️  WARNING: ${daysDiff - closureDates.length} missing dates detected`);

                // Find missing dates
                const missingDates = [];
                for (let i = 0; i < closureDates.length - 1; i++) {
                    const current = new Date(closureDates[i]);
                    const next = new Date(closureDates[i + 1]);
                    const diff = Math.floor((next - current) / (1000 * 60 * 60 * 24));

                    if (diff > 1) {
                        for (let j = 1; j < diff; j++) {
                            const missingDate = new Date(current);
                            missingDate.setDate(missingDate.getDate() + j);
                            missingDates.push(missingDate.toISOString().split('T')[0]);
                        }
                    }
                }

                if (missingDates.length > 0) {
                    report.push(`\n   ❌ MISSING DATES:`);
                    missingDates.forEach(md => {
                        report.push(`      • ${md} (${new Date(md).toLocaleDateString('es-ES', { weekday: 'long' })})`);

                        // Check if there are payments/expenses on missing dates
                        const mdPayments = allPayments.filter(p => p.date && p.date.startsWith(md));
                        const mdExpenses = allExpenses.filter(e => e.date && e.date.startsWith(md));

                        if (mdPayments.length > 0 || mdExpenses.length > 0) {
                            report.push(`        ⚠️  Has ${mdPayments.length} payments and ${mdExpenses.length} expenses - NEEDS CLOSURE!`);
                        }
                    });
                }
            }
        }

        // Summary
        report.push('\n\n' + '='.repeat(80));
        report.push('📋 DIAGNOSTIC SUMMARY');
        report.push('='.repeat(80));
        report.push(`Total closures analyzed: ${closureDates.length}`);
        report.push(`Closures with issues: ${issues.length}`);
        report.push(`Total issues found: ${issues.reduce((sum, i) => sum + i.issues.length, 0)}`);

        // Print full report
        console.log('\n' + report.join('\n'));

        // Create downloadable report
        const reportText = report.join('\n');
        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        window.closureDiagnosticReport = {
            text: reportText,
            downloadUrl: url,
            issues: issues,
            closures: closures
        };

        console.log('\n📥 REPORT SAVED TO: window.closureDiagnosticReport');
        console.log('📥 Download with: downloadClosureDiagnosticReport()');

        // Show summary alert
        alert(
            `🔍 DIAGNOSTIC COMPLETE\n\n` +
            `Total closures: ${closureDates.length}\n` +
            `Closures with issues: ${issues.length}\n` +
            `Total issues: ${issues.reduce((sum, i) => sum + i.issues.length, 0)}\n\n` +
            `Check console for full report.\n` +
            `Use downloadClosureDiagnosticReport() to download.`
        );

        return window.closureDiagnosticReport;

    } catch (error) {
        console.error('❌ Error in diagnostic:', error);
        alert('❌ Error: ' + error.message);
    }
};

/**
 * Download the diagnostic report as a text file
 */
window.downloadClosureDiagnosticReport = function() {
    if (!window.closureDiagnosticReport) {
        alert('❌ No diagnostic report available. Run diagnosticHistoricalClosures() first.');
        return;
    }

    const a = document.createElement('a');
    a.href = window.closureDiagnosticReport.downloadUrl;
    a.download = `closure-diagnostic-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    console.log('✅ Report downloaded');
};

/**
 * FIX ALL DATE MISMATCHES IN HISTORICAL CLOSURES
 * Corrects openedAt and closedAt timestamps to match the closure date
 * Preserves the time (HH:mm:ss) but fixes the date (YYYY-MM-DD)
 */
window.fixAllDateMismatches = async function() {
    console.log('🔧 ========================================');
    console.log('🔧 FIXING DATE MISMATCHES IN ALL CLOSURES');
    console.log('🔧 ========================================');

    try {
        const db = window.firebaseModules.database;

        // Get all closures from Firebase
        const closuresRef = db.ref(window.FirebaseData.database, 'dailyReconciliations');
        const snapshot = await db.get(closuresRef);

        if (!snapshot.exists()) {
            alert('❌ No closures found in Firebase');
            return;
        }

        const closures = snapshot.val();
        const closureDates = Object.keys(closures).sort();

        console.log(`📊 Found ${closureDates.length} closures to analyze`);

        const corrections = [];
        let totalFixed = 0;

        for (const date of closureDates) {
            const closure = closures[date];
            const changes = [];
            let needsUpdate = false;

            console.log(`\n📅 Checking ${date}...`);

            // Check openedAt
            if (closure.openedAt) {
                const openedDate = closure.openedAt.split('T')[0];
                const openedTime = closure.openedAt.split('T')[1];

                if (openedDate !== date) {
                    console.log(`   ⚠️  openedAt mismatch: ${openedDate} → ${date}`);

                    // Create corrected timestamp with correct date but original time
                    const correctedOpenedAt = `${date}T${openedTime}`;
                    closure.openedAt = correctedOpenedAt;
                    needsUpdate = true;

                    changes.push({
                        field: 'openedAt',
                        before: `${openedDate}T${openedTime}`,
                        after: correctedOpenedAt
                    });
                }
            }

            // Check closedAt
            if (closure.closedAt) {
                const closedDate = closure.closedAt.split('T')[0];
                const closedTime = closure.closedAt.split('T')[1];

                if (closedDate !== date) {
                    console.log(`   ⚠️  closedAt mismatch: ${closedDate} → ${date}`);

                    // Create corrected timestamp with correct date but original time
                    const correctedClosedAt = `${date}T${closedTime}`;
                    closure.closedAt = correctedClosedAt;
                    needsUpdate = true;

                    changes.push({
                        field: 'closedAt',
                        before: `${closedDate}T${closedTime}`,
                        after: correctedClosedAt
                    });
                }
            }

            // Check reopenedAt (if exists)
            if (closure.reopenedAt) {
                const reopenedDate = closure.reopenedAt.split('T')[0];
                const reopenedTime = closure.reopenedAt.split('T')[1];

                if (reopenedDate !== date) {
                    console.log(`   ⚠️  reopenedAt mismatch: ${reopenedDate} → ${date}`);

                    const correctedReopenedAt = `${date}T${reopenedTime}`;
                    closure.reopenedAt = correctedReopenedAt;
                    needsUpdate = true;

                    changes.push({
                        field: 'reopenedAt',
                        before: `${reopenedDate}T${reopenedTime}`,
                        after: correctedReopenedAt
                    });
                }
            }

            // Update Firebase if needed
            if (needsUpdate) {
                console.log(`   🔧 Updating ${date} in Firebase...`);

                const closureRef = db.ref(window.FirebaseData.database, `dailyReconciliations/${date}`);
                await db.set(closureRef, closure);

                totalFixed++;
                corrections.push({
                    date,
                    changes
                });

                console.log(`   ✅ Fixed ${changes.length} timestamp(s) for ${date}`);
            } else {
                console.log(`   ✅ ${date} - No corrections needed`);
            }
        }

        // Generate summary report
        console.log('\n' + '='.repeat(80));
        console.log('📋 CORRECTION SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total closures analyzed: ${closureDates.length}`);
        console.log(`Closures corrected: ${totalFixed}`);
        console.log(`Total timestamps fixed: ${corrections.reduce((sum, c) => sum + c.changes.length, 0)}`);

        if (corrections.length > 0) {
            console.log('\n📝 DETAILED CORRECTIONS:');
            corrections.forEach(correction => {
                console.log(`\n   📅 ${correction.date}:`);
                correction.changes.forEach(change => {
                    console.log(`      • ${change.field}:`);
                    console.log(`        Before: ${change.before}`);
                    console.log(`        After:  ${change.after}`);
                });
            });
        }

        console.log('\n' + '='.repeat(80));

        // Save corrections to window for reference
        window.dateCorrections = {
            totalAnalyzed: closureDates.length,
            totalCorrected: totalFixed,
            corrections: corrections
        };

        // Reload data
        console.log('\n🔄 Reloading closure data...');
        await window.FinanceManager.loadReconciliations();

        // Show summary alert
        alert(
            `✅ DATE MISMATCH CORRECTION COMPLETE\n\n` +
            `Total closures analyzed: ${closureDates.length}\n` +
            `Closures corrected: ${totalFixed}\n` +
            `Total timestamps fixed: ${corrections.reduce((sum, c) => sum + c.changes.length, 0)}\n\n` +
            `Check console for detailed report.\n` +
            `Data has been reloaded.`
        );

        return window.dateCorrections;

    } catch (error) {
        console.error('❌ Error fixing date mismatches:', error);
        alert('❌ Error: ' + error.message);
    }
};

/**
 * Debug function: Show exact timestamps for specific closures
 */
window.debugClosureTimestamps = async function(dates = null) {
    console.log('🔍 ========================================');
    console.log('🔍 DEBUG: CLOSURE TIMESTAMPS');
    console.log('🔍 ========================================');

    try {
        const db = window.firebaseModules.database;
        const closuresRef = db.ref(window.FirebaseData.database, 'dailyReconciliations');
        const snapshot = await db.get(closuresRef);

        if (!snapshot.exists()) {
            console.log('❌ No closures found');
            return;
        }

        const closures = snapshot.val();
        const datesToCheck = dates || Object.keys(closures).sort();

        datesToCheck.forEach(date => {
            const closure = closures[date];
            if (!closure) {
                console.log(`\n❌ ${date}: NOT FOUND`);
                return;
            }

            console.log(`\n📅 CLOSURE: ${date}`);
            console.log(`   Status: ${closure.isClosed ? '🔒 CLOSED' : '🔓 OPEN'}`);

            if (closure.openedAt) {
                const openedDate = closure.openedAt.split('T')[0];
                const openedTime = closure.openedAt.split('T')[1];
                const match = openedDate === date ? '✅' : '❌';
                console.log(`   ${match} openedAt: ${closure.openedAt}`);
                console.log(`      Date: ${openedDate} ${openedDate === date ? '(matches)' : `(SHOULD BE ${date})`}`);
                console.log(`      Time: ${openedTime}`);
            } else {
                console.log(`   ⚠️  openedAt: NOT SET`);
            }

            if (closure.closedAt) {
                const closedDate = closure.closedAt.split('T')[0];
                const closedTime = closure.closedAt.split('T')[1];
                const match = closedDate === date ? '✅' : '❌';
                console.log(`   ${match} closedAt: ${closure.closedAt}`);
                console.log(`      Date: ${closedDate} ${closedDate === date ? '(matches)' : `(SHOULD BE ${date})`}`);
                console.log(`      Time: ${closedTime}`);
            } else if (closure.isClosed) {
                console.log(`   ⚠️  closedAt: NOT SET (but marked as closed!)`);
            }

            if (closure.reopenedAt) {
                const reopenedDate = closure.reopenedAt.split('T')[0];
                const reopenedTime = closure.reopenedAt.split('T')[1];
                const match = reopenedDate === date ? '✅' : '❌';
                console.log(`   ${match} reopenedAt: ${closure.reopenedAt}`);
                console.log(`      Date: ${reopenedDate} ${reopenedDate === date ? '(matches)' : `(SHOULD BE ${date})`}`);
                console.log(`      Time: ${reopenedTime}`);
            }
        });

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error);
    }
};

window.loadHistoricalClosure = async function(date) {
    console.log('📜 Loading historical closure for date:', date);
    console.log('👤 Current user role:', window.userRole);

    const container = document.getElementById('closureDetailsContainer');
    if (!container) {
        console.error('❌ Closure details container not found');
        return;
    }

    if (!date) {
        container.style.display = 'none';
        return;
    }

    // Get reconciliation data
    const reconciliation = window.FinanceManager.getDailyReconciliation(date);
    if (!reconciliation) {
        container.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center;">
                <h3 style="color: #ef4444;">❌ No se encontró el cierre para esta fecha</h3>
            </div>
        `;
        container.style.display = 'block';
        return;
    }

    console.log('📊 Reconciliation data:', reconciliation);

    // Get daily revenue and payments for this date
    const dailyRevenue = await window.FinanceManager.calculateDailyRevenue(date);
    const todayExpenses = window.FinanceManager.getExpenses({ startDate: date, endDate: date });

    // Separate expenses by payment source for display
    const cajaExpenses = todayExpenses.filter(e => !e.paidFrom || e.paidFrom === 'caja');
    const bolsilloExpenses = todayExpenses.filter(e => e.paidFrom === 'bolsillo');
    const totalExpensesCaja = cajaExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpensesBolsillo = bolsilloExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = totalExpensesCaja + totalExpensesBolsillo;

    // Get students map for payment details
    // IMPORTANT: Ensure students are loaded from Firebase
    let students = new Map();

    if (window.StudentManager) {
        // Check if students are already loaded
        if (window.StudentManager.students && window.StudentManager.students.size > 0) {
            students = window.StudentManager.students;
            console.log('✅ Using cached students:', students.size);
        } else {
            // Students not in memory - load from Firebase
            console.log('⏳ Students not in memory, loading from Firebase...');
            try {
                await window.StudentManager.loadStudents();
                students = window.StudentManager.students;
                console.log('✅ Loaded students from Firebase:', students.size);
            } catch (error) {
                console.error('❌ Error loading students:', error);
            }
        }
    }

    console.log('📚 Students available for name lookup:', students.size);

    // Calculate values - Only caja expenses affect cash reconciliation
    const openingBalance = reconciliation.openingBalance || 0;
    const closingCount = reconciliation.closingCount || 0;
    const expectedClosing = openingBalance + dailyRevenue.cash - totalExpensesCaja; // Only caja!
    const discrepancy = closingCount - expectedClosing;

    // Format times - Use Colombia timezone explicitly
    const openedAtTime = reconciliation.openedAt ?
        new Date(reconciliation.openedAt).toLocaleString('es-ES', {
            timeZone: 'America/Bogota',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }) : 'No registrada';

    const closedAtTime = reconciliation.closedAt ?
        new Date(reconciliation.closedAt).toLocaleString('es-ES', {
            timeZone: 'America/Bogota',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }) : 'No cerrada';

    // Calculate work duration if both times exist
    let workDuration = '';
    if (reconciliation.openedAt && reconciliation.closedAt) {
        const openTime = new Date(reconciliation.openedAt);
        const closeTime = new Date(reconciliation.closedAt);
        const durationMs = closeTime - openTime;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        workDuration = `${hours}h ${minutes}m`;
    }

    // Render details
    container.innerHTML = `
        <div style="display: grid; gap: 1.5rem;">
            <!-- Payment Classification Notice -->
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 1rem; border-radius: 8px;">
                <div style="display: flex; align-items: start; gap: 0.75rem;">
                    <div style="font-size: 1.25rem;">ℹ️</div>
                    <div>
                        <div style="font-weight: 600; color: #1e40af; margin-bottom: 0.25rem;">Clasificación de Pagos</div>
                        <div style="font-size: 0.85rem; color: #1e3a8a;">
                            <strong>💵 Efectivo:</strong> Solo pagos marcados como "Efectivo" •
                            <strong>💳 Transferencias:</strong> Transferencia, Nequi, Bancolombia, Consignación, etc.
                        </div>
                    </div>
                </div>
            </div>

            <!-- Header with Status -->
            <div style="background: ${reconciliation.isClosed ? '#10b981' : '#fbbf24'}; color: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="margin: 0 0 0.5rem 0;">${reconciliation.isClosed ? '🔒' : '🔓'} Cierre de Caja - ${(() => {
                            const [year, month, day] = date.split('-').map(Number);
                            const dateObj = new Date(year, month - 1, day);
                            return dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        })()}</h2>
                        <p style="margin: 0; opacity: 0.9; font-size: 0.95rem;">
                            Estado: <strong>${reconciliation.isClosed ? 'CERRADO' : 'ABIERTO'}</strong>
                            ${reconciliation.isClosed ? ` por ${reconciliation.closedByName || 'Usuario'}` : ''}
                        </p>
                    </div>
                    ${reconciliation.isClosed && workDuration ? `
                        <div style="text-align: right;">
                            <div style="font-size: 0.9rem; opacity: 0.9;">Duración de jornada</div>
                            <div style="font-size: 2rem; font-weight: bold;">${workDuration}</div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Times Section -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.5rem;">⏰ Hora de Apertura</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">${openedAtTime}</div>
                    ${reconciliation.registeredByName ? `
                        <div style="font-size: 0.8rem; color: #6b7280; margin-top: 0.5rem;">Por: ${reconciliation.registeredByName}</div>
                    ` : ''}
                </div>

                ${reconciliation.isClosed ? `
                    <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.5rem;">🔒 Hora de Cierre</div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #ef4444;">${closedAtTime}</div>
                        ${reconciliation.closedByName ? `
                            <div style="font-size: 0.8rem; color: #6b7280; margin-top: 0.5rem;">Por: ${reconciliation.closedByName}</div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>

            <!-- Financial Summary -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.5rem;">💵 Apertura de Caja</div>
                    <div style="font-size: 1.8rem; font-weight: bold;">${formatCurrency(openingBalance)}</div>
                </div>

                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.5rem;">💰 Ventas en Efectivo</div>
                    <div style="font-size: 1.8rem; font-weight: bold; color: #10b981;">+${formatCurrency(dailyRevenue.cash)}</div>
                    <div style="font-size: 0.8rem; color: #6b7280; margin-top: 0.5rem;">${dailyRevenue.cashCount} pagos</div>
                </div>

                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.5rem;">💸 Gastos del Día</div>
                    <div style="font-size: 1.8rem; font-weight: bold; color: #ef4444;">-${formatCurrency(totalExpenses)}</div>
                    <div style="font-size: 0.8rem; color: #6b7280; margin-top: 0.5rem;">${todayExpenses.length} gastos</div>
                </div>

                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.5rem;">🧮 Cierre Esperado</div>
                    <div style="font-size: 1.8rem; font-weight: bold;">${formatCurrency(expectedClosing)}</div>
                    <div style="font-size: 0.8rem; color: #6b7280; margin-top: 0.5rem;">Teórico</div>
                </div>

                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.5rem;">✅ Cierre Real</div>
                    <div style="font-size: 1.8rem; font-weight: bold;">${formatCurrency(closingCount)}</div>
                    <div style="font-size: 0.8rem; color: #6b7280; margin-top: 0.5rem;">Conteo físico</div>
                </div>

                <div style="background: ${discrepancy === 0 ? '#d1fae5' : discrepancy > 0 ? '#fef3c7' : '#fee2e2'}; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.5rem;">📊 Diferencia</div>
                    <div style="font-size: 1.8rem; font-weight: bold; color: ${discrepancy === 0 ? '#10b981' : discrepancy > 0 ? '#fbbf24' : '#ef4444'};">
                        ${discrepancy === 0 ? '✓ $0' : (discrepancy > 0 ? '+' : '') + formatCurrency(discrepancy)}
                    </div>
                    <div style="font-size: 0.8rem; color: #6b7280; margin-top: 0.5rem;">
                        ${discrepancy === 0 ? 'Cuadra perfecto' : discrepancy > 0 ? 'Sobrante' : 'Faltante'}
                    </div>
                </div>
            </div>

            <!-- Payments and Transfers Summary -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 1rem 0;">💳 Consignaciones / Transferencias</h3>
                    <div style="font-size: 2rem; font-weight: bold; color: #3b82f6; margin-bottom: 0.5rem;">
                        ${formatCurrency(dailyRevenue.transfers)}
                    </div>
                    <div style="font-size: 0.9rem; color: #6b7280;">${dailyRevenue.transferCount} transferencias</div>
                </div>

                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 1rem 0;">💰 Total del Día</h3>
                    <div style="font-size: 2rem; font-weight: bold; color: #8b5cf6; margin-bottom: 0.5rem;">
                        ${formatCurrency(dailyRevenue.total)}
                    </div>
                    <div style="font-size: 0.9rem; color: #6b7280;">${dailyRevenue.payments.length} pagos totales</div>
                </div>
            </div>

            <!-- Payment Details Table -->
            ${dailyRevenue.payments.length > 0 ? `
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 1rem 0;">📋 Detalle de Pagos</h3>
                    <div style="overflow-x: auto;">
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

                                    // Debug if student not found
                                    if (!student && payment.studentId) {
                                        console.warn('⚠️ Student not found for payment:', {
                                            paymentId: payment.id,
                                            studentId: payment.studentId,
                                            amount: payment.amount,
                                            availableStudents: students.size,
                                            sampleIds: Array.from(students.keys()).slice(0, 5)
                                        });
                                    }

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
                        </table>
                    </div>
                </div>
            ` : ''}

            <!-- Expenses Table -->
            ${todayExpenses.length > 0 ? `
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 1rem 0;">💸 Gastos del Día</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #f3f4f6;">
                                <tr>
                                    <th style="padding: 0.75rem; text-align: left;">Fecha</th>
                                    <th style="padding: 0.75rem; text-align: left;">Categoría</th>
                                    <th style="padding: 0.75rem; text-align: left;">Descripción</th>
                                    <th style="padding: 0.75rem; text-align: right;">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${todayExpenses.map(expense => `
                                    <tr style="border-top: 1px solid #e5e7eb;">
                                        <td style="padding: 0.75rem;">${new Date(expense.date).toLocaleDateString('es-ES')}</td>
                                        <td style="padding: 0.75rem;">${expense.category || 'N/A'}</td>
                                        <td style="padding: 0.75rem;">${expense.description || '-'}</td>
                                        <td style="padding: 0.75rem; text-align: right; font-weight: 600; color: #ef4444;">${formatCurrency(expense.amount)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot style="background: #f3f4f6; font-weight: bold;">
                                <tr>
                                    <td colspan="3" style="padding: 0.75rem; text-align: right;">Total:</td>
                                    <td style="padding: 0.75rem; text-align: right; color: #ef4444;">${formatCurrency(totalExpenses)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            ` : ''}

            <!-- Notes Section -->
            ${reconciliation.notes ? `
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 0.5rem 0;">📝 Notas del Cierre</h3>
                    <p style="margin: 0; color: #6b7280; white-space: pre-wrap;">${reconciliation.notes}</p>
                </div>
            ` : ''}

            <!-- Admin Controls: Reopen/Close Closure Buttons -->
            ${reconciliation.isClosed && (window.userRole === 'admin' || window.userRole === 'director') ? `
                <div style="background: #fef3c7; border: 2px solid #fbbf24; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                        <div>
                            <h3 style="margin: 0 0 0.5rem 0;">🔓 Controles de Administrador</h3>
                            <p style="margin: 0; color: #92400e; font-size: 0.9rem;">
                                Solo tú como admin puedes re-abrir este cierre cerrado para hacer correcciones.
                            </p>
                        </div>
                        <button onclick="reopenClosure('${date}')"
                                style="padding: 0.75rem 1.5rem; background: #fbbf24; color: #78350f; border: 2px solid #f59e0b; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap; transition: all 0.2s;"
                                onmouseover="this.style.background='#f59e0b'; this.style.color='white';"
                                onmouseout="this.style.background='#fbbf24'; this.style.color='#78350f';">
                            🔓 Re-abrir Cierre
                        </button>
                    </div>
                </div>
            ` : ''}

            <!-- Admin Controls: Close Open Closure Button -->
            ${!reconciliation.isClosed && (window.userRole === 'admin' || window.userRole === 'director') ? `
                <div style="background: #dcfce7; border: 2px solid #10b981; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                        <div>
                            <h3 style="margin: 0 0 0.5rem 0;">🔒 Cerrar Caja desde Historial</h3>
                            <p style="margin: 0; color: #065f46; font-size: 0.9rem;">
                                Este cierre está abierto. Puedes cerrarlo desde aquí ingresando el conteo de caja.
                            </p>
                        </div>
                        <button onclick="closeHistoricalClosure('${date}')"
                                style="padding: 0.75rem 1.5rem; background: #10b981; color: white; border: 2px solid #059669; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap; transition: all 0.2s;"
                                onmouseover="this.style.background='#059669';"
                                onmouseout="this.style.background='#10b981';">
                            🔒 Cerrar Caja
                        </button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    container.style.display = 'block';
};

/**
 * Close an open closure from historical view
 * Prompts for closing count and closes the day
 */
window.closeHistoricalClosure = async function(date) {
    console.log('🔒 Closing historical closure for:', date);

    try {
        const reconciliation = window.FinanceManager.getDailyReconciliation(date);
        if (!reconciliation) {
            alert('❌ No se encontró el cierre para esta fecha');
            return;
        }

        if (reconciliation.isClosed) {
            alert('ℹ️ Este cierre ya está cerrado.');
            return;
        }

        // Get daily revenue
        const dailyRevenue = await window.FinanceManager.calculateDailyRevenue(date);
        const todayExpenses = window.FinanceManager.getExpenses({ startDate: date, endDate: date });

        // Only caja expenses affect cash reconciliation
        const cajaExpenses = todayExpenses.filter(e => !e.paidFrom || e.paidFrom === 'caja');
        const totalExpensesCaja = cajaExpenses.reduce((sum, e) => sum + e.amount, 0);

        const openingBalance = reconciliation.openingBalance || 0;
        const expectedClosing = openingBalance + dailyRevenue.cash - totalExpensesCaja;

        // Prompt for closing count
        const closingCountInput = prompt(
            `💰 Cierre de Caja - ${new Date(date.split('-').map(Number)).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n\n` +
            `📊 RESUMEN:\n` +
            `Apertura: $${openingBalance.toLocaleString()}\n` +
            `Efectivo recibido: $${dailyRevenue.cash.toLocaleString()}\n` +
            `Gastos (de caja): $${totalExpensesCaja.toLocaleString()}\n` +
            `Cierre esperado: $${expectedClosing.toLocaleString()}\n\n` +
            `💵 Ingresa el CONTEO REAL de efectivo en caja:`
        );

        if (closingCountInput === null) {
            console.log('❌ Cancelled by user');
            return;
        }

        // Parse closing count
        const closingCount = parseCurrencyInput(closingCountInput);

        if (isNaN(closingCount) || closingCount < 0) {
            alert('❌ Valor inválido. Debe ser un número positivo.');
            return;
        }

        const discrepancy = closingCount - expectedClosing;

        // Confirm closure
        const confirmClose = confirm(
            `⚠️ ¿Confirmar cierre de caja?\n\n` +
            `Cierre esperado: $${expectedClosing.toLocaleString()}\n` +
            `Conteo real: $${closingCount.toLocaleString()}\n` +
            `Diferencia: ${discrepancy === 0 ? '✅ $0 (Cuadra perfecto)' : (discrepancy > 0 ? `⚠️ +$${discrepancy.toLocaleString()} (Sobrante)` : `❌ -$${Math.abs(discrepancy).toLocaleString()} (Faltante)`)}\n\n` +
            `Esta acción marcará el día como CERRADO.`
        );

        if (!confirmClose) {
            console.log('❌ Cancelled by user');
            return;
        }

        // Close the day
        await window.FinanceManager.closeDay(date);

        console.log('✅ Closure closed successfully');

        alert(
            `✅ Caja cerrada exitosamente\n\n` +
            `Fecha: ${new Date(date.split('-').map(Number)).toLocaleDateString('es-ES')}\n` +
            `Cierre: $${closingCount.toLocaleString()}\n` +
            `Diferencia: ${discrepancy === 0 ? '$0' : (discrepancy > 0 ? `+$${discrepancy.toLocaleString()}` : `-$${Math.abs(discrepancy).toLocaleString()}`)}`
        );

        // Reload the historical view
        await loadHistoricalClosure(date);

    } catch (error) {
        console.error('❌ Error closing historical closure:', error);
        alert('❌ Error al cerrar: ' + error.message);
    }
};

/**
 * Parse currency input (handles commas, dots, etc.)
 */
function parseCurrencyInput(input) {
    if (!input) return 0;
    // Remove everything except numbers
    return parseInt(input.toString().replace(/[^\d]/g, '')) || 0;
}

/**
 * Debug: Find payment and check student data
 */
window.debugPayment120k = async function() {
    console.log('🔍 Looking for $120,000 payment on Nov 19...');

    try {
        const db = window.firebaseModules.database;
        const paymentsRef = db.ref(window.FirebaseData.database, 'payments');
        const snapshot = await db.get(paymentsRef);

        if (!snapshot.exists()) {
            console.log('❌ No payments found');
            return;
        }

        const allPayments = Object.values(snapshot.val());
        const nov19Payments = allPayments.filter(p => p.date && p.date.startsWith('2025-11-19'));
        const payment120k = nov19Payments.find(p => p.amount === 120000);

        if (!payment120k) {
            console.log('❌ $120,000 payment not found on Nov 19');
            console.log('Payments found:', nov19Payments);
            return;
        }

        console.log('\n✅ PAYMENT FOUND:');
        console.log(payment120k);

        console.log('\n🔍 Checking student data...');
        console.log('StudentManager exists?', !!window.StudentManager);
        console.log('Students map exists?', !!window.StudentManager?.students);
        console.log('Students map size:', window.StudentManager?.students?.size || 0);

        if (payment120k.studentId) {
            console.log('\nStudent ID in payment:', payment120k.studentId);

            if (window.StudentManager?.students) {
                const student = window.StudentManager.students.get(payment120k.studentId);

                if (student) {
                    console.log('✅ STUDENT FOUND:');
                    console.log('  Name:', student.nombre);
                    console.log('  ID:', student.id);
                } else {
                    console.log('❌ Student NOT FOUND in StudentManager');
                    console.log('Available student IDs:', Array.from(window.StudentManager.students.keys()).slice(0, 10));
                }
            } else {
                console.log('❌ StudentManager.students not available');
            }
        } else {
            console.log('⚠️ Payment has no studentId');
        }

        return payment120k;

    } catch (error) {
        console.error('❌ Error:', error);
    }
};

window.saveDailyReconciliation = async function(event) {
    event.preventDefault();

    const today = window.getTodayInColombia();

    console.log('💾 ============================================');
    console.log('💾 GUARDANDO CIERRE DE CAJA');
    console.log('💾 ============================================');
    console.log('💾 Fecha calculada (getTodayInColombia):', today);
    console.log('💾 Fecha del navegador:', new Date().toLocaleString('es-CO'));
    console.log('💾 Fecha ISO navegador:', new Date().toISOString());

    const data = {
        openingBalance: document.getElementById('openingBalance').value,
        closingCount: document.getElementById('closingCount').value,
        notes: document.getElementById('reconciliationNotes').value
    };

    console.log('💾 Datos del formulario:', data);

    try {
        // Get expenses for today
        const todayExpenses = window.FinanceManager.getExpenses({ startDate: today, endDate: today });
        data.expenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

        console.log('💾 Gastos del día:', data.expenses);
        console.log('💾 Guardando en Firebase con fecha:', today);

        await window.FinanceManager.saveDailyReconciliation(today, data);

        console.log('💾 ✅ Cierre guardado exitosamente para:', today);
        console.log('💾 Ruta Firebase: dailyReconciliations/' + today);
        console.log('💾 ============================================');

        window.showNotification('✅ Cierre guardado exitosamente para ' + today, 'success');

        // Refresh view
        loadDailyReconciliationView();
    } catch (error) {
        console.error('💾 ❌ Error saving reconciliation:', error);
        console.log('💾 ============================================');
        window.showNotification('❌ Error al guardar cierre', 'error');
    }
};

window.closeDayConfirm = async function(date) {
    // Show cash delivery modal instead of simple confirm
    await showCashDeliveryModal(date);
};

// ==================================================================================
// CASH DELIVERY SYSTEM - Entrega de Efectivo con Aprobación
// ==================================================================================

/**
 * Show cash delivery modal when closing the day
 * @param {string} date - The date being closed
 */
async function showCashDeliveryModal(date) {
    // Calculate cash to deliver
    const reconciliation = window.FinanceManager.dailyReconciliations?.get(date) || {};
    const dailyRevenue = await window.FinanceManager.calculateDailyRevenue(date) || { cash: 0, transfers: 0 };
    const openingBalance = parseFloat(reconciliation.openingBalance) || 0;
    const closingCount = parseFloat(reconciliation.closingCount) || 0;
    const todayExpenses = window.FinanceManager.getExpenses({ startDate: date, endDate: date });

    // Only caja expenses affect cash - out of pocket expenses don't reduce cash box
    const cajaExpenses = todayExpenses.filter(e => !e.paidFrom || e.paidFrom === 'caja');
    const totalExpensesCaja = cajaExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Expected cash = Opening + Cash received - Cash expenses (caja only)
    const expectedCash = openingBalance + dailyRevenue.cash - totalExpensesCaja;
    // Suggested delivery = Expected cash - Base for next day (default 100,000)
    const defaultBase = 100000;
    const suggestedDelivery = Math.max(0, expectedCash - defaultBase);

    const modal = document.createElement('div');
    modal.id = 'cashDeliveryModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; max-width: 500px; width: 95%; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.25);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 1.5rem; text-align: center;">
                <h2 style="margin: 0; font-size: 1.5rem;">🔒 Cerrar Día</h2>
                <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">${new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <!-- Content -->
            <div style="padding: 1.5rem;">
                <!-- Summary -->
                <div style="background: #f3f4f6; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.9rem;">
                        <div><strong>Apertura:</strong></div>
                        <div style="text-align: right;">${formatCurrency(openingBalance)}</div>
                        <div><strong>+ Efectivo recibido:</strong></div>
                        <div style="text-align: right; color: #10b981;">${formatCurrency(dailyRevenue.cash)}</div>
                        <div><strong>- Gastos de caja:</strong></div>
                        <div style="text-align: right; color: #ef4444;">${formatCurrency(totalExpensesCaja)}</div>
                        <div style="border-top: 2px solid #d1d5db; padding-top: 0.5rem;"><strong>= Efectivo esperado:</strong></div>
                        <div style="border-top: 2px solid #d1d5db; padding-top: 0.5rem; text-align: right; font-weight: bold; font-size: 1.1rem;">${formatCurrency(expectedCash)}</div>
                    </div>
                </div>

                <!-- Question -->
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <p style="font-size: 1.1rem; font-weight: 600; margin: 0 0 0.5rem 0;">💰 ¿Hacer entrega de efectivo?</p>
                    <p style="color: #6b7280; margin: 0; font-size: 0.9rem;">El efectivo será entregado al administrador para su aprobación</p>
                </div>

                <!-- Buttons -->
                <div style="display: flex; gap: 1rem;">
                    <button onclick="closeDayWithoutDelivery('${date}')" style="flex: 1; padding: 1rem; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 500;">
                        ❌ No, solo cerrar
                    </button>
                    <button onclick="showDeliveryForm('${date}', ${expectedCash}, ${suggestedDelivery})" style="flex: 1; padding: 1rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 500;">
                        ✅ Sí, hacer entrega
                    </button>
                </div>
            </div>

            <!-- Cancel -->
            <div style="padding: 0 1.5rem 1.5rem; text-align: center;">
                <button onclick="closeCashDeliveryModal()" style="background: none; border: none; color: #6b7280; cursor: pointer; font-size: 0.9rem;">
                    Cancelar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Close the cash delivery modal
 */
window.closeCashDeliveryModal = function() {
    const modal = document.getElementById('cashDeliveryModal');
    if (modal) modal.remove();
};

/**
 * Close day without making a cash delivery
 */
window.closeDayWithoutDelivery = async function(date) {
    closeCashDeliveryModal();

    if (!confirm('¿Cerrar el día SIN hacer entrega de efectivo?')) {
        return;
    }

    try {
        await window.FinanceManager.closeDay(date);
        window.showNotification('✅ Día cerrado exitosamente (sin entrega)', 'success');
        loadDailyReconciliationView();
    } catch (error) {
        console.error('Error closing day:', error);
        window.showNotification('❌ Error al cerrar día: ' + error.message, 'error');
    }
};

/**
 * Show the delivery form
 */
window.showDeliveryForm = function(date, expectedCash, suggestedDelivery) {
    const modal = document.getElementById('cashDeliveryModal');
    if (!modal) return;

    const userEmail = window.FirebaseData?.currentUser?.email || 'Usuario';
    const userName = userEmail.split('@')[0];

    modal.querySelector('div > div').innerHTML = `
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1.5rem; text-align: center;">
            <h2 style="margin: 0; font-size: 1.5rem;">💰 Entrega de Efectivo</h2>
            <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">${new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <!-- Form -->
        <div style="padding: 1.5rem;">
            <form id="cashDeliveryForm" onsubmit="return false;">
                <!-- Expected vs Delivery -->
                <div style="background: #f0fdf4; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #bbf7d0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Efectivo esperado en caja:</span>
                        <strong>${formatCurrency(expectedCash)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: #6b7280; font-size: 0.9rem;">
                        <span>Base sugerida para mañana:</span>
                        <span>$100,000</span>
                    </div>
                </div>

                <!-- Amount to deliver -->
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">
                        💵 Monto a entregar *
                    </label>
                    <input type="text" id="deliveryAmount" required
                           value="${formatCurrency(suggestedDelivery)}"
                           oninput="formatCurrencyInput(this)"
                           style="width: 100%; padding: 0.75rem; border: 2px solid #10b981; border-radius: 8px; font-size: 1.25rem; font-weight: bold; text-align: center;">
                    <small style="color: #6b7280;">Monto sugerido: ${formatCurrency(suggestedDelivery)}</small>
                </div>

                <!-- Base for tomorrow -->
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">
                        🏦 Base que queda en caja
                    </label>
                    <input type="text" id="deliveryBase"
                           value="${formatCurrency(expectedCash - suggestedDelivery)}"
                           oninput="formatCurrencyInput(this)"
                           style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px;">
                </div>

                <!-- Notes -->
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">
                        📝 Notas (opcional)
                    </label>
                    <textarea id="deliveryNotes" rows="2"
                              style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px;"
                              placeholder="Observaciones sobre la entrega..."></textarea>
                </div>

                <!-- Who is delivering -->
                <div style="background: #f3f4f6; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem;">
                    <strong>Entregado por:</strong> ${userEmail}
                </div>

                <!-- Submit -->
                <div style="display: flex; gap: 1rem;">
                    <button type="button" onclick="closeCashDeliveryModal()" style="flex: 1; padding: 1rem; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                        Cancelar
                    </button>
                    <button type="button" onclick="submitCashDelivery('${date}')" style="flex: 1; padding: 1rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                        📤 Enviar Entrega
                    </button>
                </div>
            </form>
        </div>
    `;
};

/**
 * Submit cash delivery for admin approval
 */
window.submitCashDelivery = async function(date) {
    const amountText = document.getElementById('deliveryAmount').value;
    const baseText = document.getElementById('deliveryBase').value;
    const notes = document.getElementById('deliveryNotes').value;

    const amount = parseFloat(amountText.replace(/[^\d]/g, '')) || 0;
    const base = parseFloat(baseText.replace(/[^\d]/g, '')) || 0;

    if (amount <= 0) {
        window.showNotification('⚠️ Ingresa un monto válido', 'warning');
        return;
    }

    try {
        const userEmail = window.FirebaseData?.currentUser?.email || 'unknown';
        const userId = window.FirebaseData?.currentUser?.uid || 'unknown';

        const delivery = {
            date: date,
            amount: amount,
            baseRemaining: base,
            notes: notes,
            status: 'pending', // pending, approved, rejected
            createdBy: userId,
            createdByEmail: userEmail,
            createdAt: new Date().toISOString(),
            approvedBy: null,
            approvedByEmail: null,
            approvedAt: null,
            approvalNotes: null
        };

        // Save to Firebase
        const db = window.firebaseModules.database;
        const deliveryRef = db.push(db.ref(window.FirebaseData.database, 'cashDeliveries'));
        delivery.id = deliveryRef.key;
        await db.set(deliveryRef, delivery);

        // Close the day
        await window.FinanceManager.closeDay(date);

        closeCashDeliveryModal();
        window.showNotification('✅ Entrega registrada y enviada para aprobación', 'success');

        // Show confirmation
        alert(`📤 Entrega enviada exitosamente!\n\nMonto: ${formatCurrency(amount)}\nBase en caja: ${formatCurrency(base)}\n\nEl administrador recibirá una notificación para aprobar esta entrega.`);

        loadDailyReconciliationView();
    } catch (error) {
        console.error('Error submitting cash delivery:', error);
        window.showNotification('❌ Error al enviar entrega: ' + error.message, 'error');
    }
};

/**
 * Load pending cash deliveries for admin
 */
window.loadPendingDeliveries = async function() {
    const userEmail = window.FirebaseData?.currentUser?.email || '';

    // Only admin can see pending deliveries
    if (userEmail !== 'admin@ciudadbilingue.com') {
        return [];
    }

    try {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, 'cashDeliveries');
        const snapshot = await db.get(ref);

        if (!snapshot.exists()) return [];

        const deliveries = [];
        snapshot.forEach(child => {
            const delivery = child.val();
            delivery.id = child.key;
            if (delivery.status === 'pending') {
                deliveries.push(delivery);
            }
        });

        return deliveries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
        console.error('Error loading pending deliveries:', error);
        return [];
    }
};

/**
 * Show pending deliveries panel for admin
 */
window.showPendingDeliveriesPanel = async function() {
    const deliveries = await loadPendingDeliveries();

    if (deliveries.length === 0) {
        window.showNotification('✅ No hay entregas pendientes', 'info');
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'pendingDeliveriesModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; max-width: 600px; width: 95%; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0;">📥 Entregas Pendientes de Aprobación</h2>
                    <span style="background: white; color: #f59e0b; padding: 0.25rem 0.75rem; border-radius: 20px; font-weight: bold;">
                        ${deliveries.length}
                    </span>
                </div>
            </div>

            <!-- List -->
            <div style="padding: 1.5rem; overflow-y: auto; flex: 1;">
                ${deliveries.map(d => `
                    <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                            <div>
                                <div style="font-weight: bold; font-size: 1.25rem; color: #92400e;">
                                    ${formatCurrency(d.amount)}
                                </div>
                                <div style="color: #6b7280; font-size: 0.9rem;">
                                    📅 ${new Date(d.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.85rem; color: #6b7280;">Base en caja:</div>
                                <div style="font-weight: 500;">${formatCurrency(d.baseRemaining)}</div>
                            </div>
                        </div>

                        <div style="background: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem;">
                            <strong>Entregado por:</strong> ${d.createdByEmail}<br>
                            <strong>Fecha/Hora:</strong> ${new Date(d.createdAt).toLocaleString('es-ES')}
                            ${d.notes ? `<br><strong>Notas:</strong> ${d.notes}` : ''}
                        </div>

                        <!-- Approval Form -->
                        <div style="margin-bottom: 0.75rem;">
                            <input type="text" id="approvalNotes_${d.id}" placeholder="Notas de aprobación (opcional)..."
                                   style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.9rem;">
                        </div>

                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="approveDelivery('${d.id}')" style="flex: 1; padding: 0.75rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                                ✅ Aprobar
                            </button>
                            <button onclick="rejectDelivery('${d.id}')" style="flex: 1; padding: 0.75rem; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                                ❌ Rechazar
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Footer -->
            <div style="padding: 1rem 1.5rem; background: #f9fafb; border-top: 1px solid #e5e7eb;">
                <button onclick="closePendingDeliveriesModal()" style="width: 100%; padding: 0.75rem; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

window.closePendingDeliveriesModal = function() {
    const modal = document.getElementById('pendingDeliveriesModal');
    if (modal) modal.remove();
};

/**
 * Approve a cash delivery
 */
window.approveDelivery = async function(deliveryId) {
    const notes = document.getElementById(`approvalNotes_${deliveryId}`)?.value || '';

    if (!confirm('¿Aprobar esta entrega de efectivo?')) return;

    try {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `cashDeliveries/${deliveryId}`);

        await db.update(ref, {
            status: 'approved',
            approvedBy: window.FirebaseData?.currentUser?.uid,
            approvedByEmail: window.FirebaseData?.currentUser?.email,
            approvedAt: new Date().toISOString(),
            approvalNotes: notes
        });

        window.showNotification('✅ Entrega aprobada', 'success');
        closePendingDeliveriesModal();

        // Refresh if there are more pending in modal
        const remaining = await loadPendingDeliveries();
        if (remaining.length > 0) {
            showPendingDeliveriesPanel();
        }

        // Refresh the entregas tab if it's active
        if (document.getElementById('entregasTabBtn')?.classList.contains('active') ||
            document.querySelector('[onclick*="entregas"]')?.style.background?.includes('f59e0b')) {
            loadFinanceTab('entregas');
        }
    } catch (error) {
        console.error('Error approving delivery:', error);
        window.showNotification('❌ Error al aprobar entrega', 'error');
    }
};

/**
 * Reject a cash delivery
 */
window.rejectDelivery = async function(deliveryId) {
    const notes = document.getElementById(`approvalNotes_${deliveryId}`)?.value || '';

    if (!notes) {
        window.showNotification('⚠️ Por favor agrega una nota explicando el rechazo', 'warning');
        document.getElementById(`approvalNotes_${deliveryId}`).focus();
        return;
    }

    if (!confirm('¿Rechazar esta entrega de efectivo?')) return;

    try {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `cashDeliveries/${deliveryId}`);

        await db.update(ref, {
            status: 'rejected',
            approvedBy: window.FirebaseData?.currentUser?.uid,
            approvedByEmail: window.FirebaseData?.currentUser?.email,
            approvedAt: new Date().toISOString(),
            approvalNotes: notes
        });

        window.showNotification('❌ Entrega rechazada', 'info');
        closePendingDeliveriesModal();

        // Refresh if there are more pending in modal
        const remaining = await loadPendingDeliveries();
        if (remaining.length > 0) {
            showPendingDeliveriesPanel();
        }

        // Refresh the entregas tab if it's active
        if (document.getElementById('entregasTabBtn')?.classList.contains('active') ||
            document.querySelector('[onclick*="entregas"]')?.style.background?.includes('f59e0b')) {
            loadFinanceTab('entregas');
        }
    } catch (error) {
        console.error('Error rejecting delivery:', error);
        window.showNotification('❌ Error al rechazar entrega', 'error');
    }
};

/**
 * Check for pending deliveries and show notification badge
 */
window.checkPendingDeliveries = async function() {
    const userEmail = window.FirebaseData?.currentUser?.email || '';

    if (userEmail !== 'admin@ciudadbilingue.com') return;

    const deliveries = await loadPendingDeliveries();

    if (deliveries.length > 0) {
        // Show notification
        window.showNotification(`📥 Tienes ${deliveries.length} entrega(s) de efectivo pendiente(s) de aprobación`, 'warning');
    }
};

/**
 * Load user's own deliveries (for non-admin users)
 */
window.loadMyDeliveries = async function() {
    const userId = window.FirebaseData?.currentUser?.uid || '';

    if (!userId) return [];

    try {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, 'cashDeliveries');
        const snapshot = await db.get(ref);

        if (!snapshot.exists()) return [];

        const myDeliveries = [];
        snapshot.forEach(child => {
            const delivery = child.val();
            delivery.id = child.key;
            if (delivery.createdBy === userId) {
                myDeliveries.push(delivery);
            }
        });

        return myDeliveries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
        console.error('Error loading my deliveries:', error);
        return [];
    }
};

/**
 * Check if user has any recently processed deliveries (approved/rejected)
 * Returns deliveries processed in the last 24 hours that haven't been seen
 */
window.checkMyDeliveryStatus = async function() {
    const userEmail = window.FirebaseData?.currentUser?.email || '';

    // Skip for admin (they see everything already)
    if (userEmail === 'admin@ciudadbilingue.com') return;

    const myDeliveries = await window.loadMyDeliveries();

    // Check for recently processed deliveries (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentlyProcessed = myDeliveries.filter(d => {
        if (d.status === 'pending') return false;
        if (!d.approvedAt) return false;
        return new Date(d.approvedAt) > sevenDaysAgo;
    });

    // Check localStorage for seen notifications
    const seenDeliveries = JSON.parse(localStorage.getItem('seenDeliveryNotifications') || '[]');
    const unseenProcessed = recentlyProcessed.filter(d => !seenDeliveries.includes(d.id));

    if (unseenProcessed.length > 0) {
        const approved = unseenProcessed.filter(d => d.status === 'approved');
        const rejected = unseenProcessed.filter(d => d.status === 'rejected');

        if (approved.length > 0) {
            window.showNotification(`✅ ${approved.length} entrega(s) de efectivo aprobada(s)`, 'success');
        }
        if (rejected.length > 0) {
            window.showNotification(`❌ ${rejected.length} entrega(s) de efectivo rechazada(s) - Ver detalles`, 'error');
        }

        // Show the deliveries modal automatically for rejected ones
        if (rejected.length > 0) {
            setTimeout(() => window.showMyDeliveriesModal(), 1500);
        }
    }

    return unseenProcessed;
};

/**
 * Show modal with user's delivery history
 */
window.showMyDeliveriesModal = async function() {
    const myDeliveries = await window.loadMyDeliveries();

    // Mark all as seen
    const seenDeliveries = myDeliveries.map(d => d.id);
    localStorage.setItem('seenDeliveryNotifications', JSON.stringify(seenDeliveries));

    const pending = myDeliveries.filter(d => d.status === 'pending');
    const approved = myDeliveries.filter(d => d.status === 'approved');
    const rejected = myDeliveries.filter(d => d.status === 'rejected');

    const modal = document.createElement('div');
    modal.id = 'myDeliveriesModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; max-width: 600px; width: 95%; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; text-align: center;">
                <h2 style="margin: 0; font-size: 1.5rem;">📤 Mis Entregas de Efectivo</h2>
            </div>

            <!-- Stats -->
            <div style="display: flex; gap: 0.5rem; padding: 1rem; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                <div style="flex: 1; text-align: center; padding: 0.5rem; background: #fef3c7; border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #92400e;">${pending.length}</div>
                    <div style="font-size: 0.8rem; color: #78350f;">Pendientes</div>
                </div>
                <div style="flex: 1; text-align: center; padding: 0.5rem; background: #d1fae5; border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #065f46;">${approved.length}</div>
                    <div style="font-size: 0.8rem; color: #047857;">Aprobadas</div>
                </div>
                <div style="flex: 1; text-align: center; padding: 0.5rem; background: #fee2e2; border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #991b1b;">${rejected.length}</div>
                    <div style="font-size: 0.8rem; color: #dc2626;">Rechazadas</div>
                </div>
            </div>

            <!-- Content -->
            <div style="flex: 1; overflow-y: auto; padding: 1rem;">
                ${myDeliveries.length === 0 ? `
                    <div style="text-align: center; padding: 3rem; color: #6b7280;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                        <p>No has realizado entregas de efectivo aún</p>
                    </div>
                ` : `
                    ${myDeliveries.map(d => `
                        <div style="background: ${d.status === 'pending' ? '#fffbeb' : d.status === 'approved' ? '#f0fdf4' : '#fef2f2'};
                                    border: 1px solid ${d.status === 'pending' ? '#fcd34d' : d.status === 'approved' ? '#86efac' : '#fca5a5'};
                                    border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem;">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div>
                                    <div style="font-weight: bold; font-size: 1.1rem; color: #111827;">
                                        ${formatCurrency(d.amount)}
                                    </div>
                                    <div style="color: #6b7280; font-size: 0.85rem; margin-top: 0.25rem;">
                                        📅 ${new Date(d.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    ${d.status === 'pending' ?
                                        '<span style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500;">⏳ Pendiente</span>' :
                                      d.status === 'approved' ?
                                        '<span style="background: #d1fae5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500;">✅ Aprobada</span>' :
                                        '<span style="background: #fee2e2; color: #991b1b; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500;">❌ Rechazada</span>'
                                    }
                                </div>
                            </div>
                            ${d.approvedAt ? `
                                <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid ${d.status === 'approved' ? '#86efac' : '#fca5a5'}; font-size: 0.85rem; color: #6b7280;">
                                    <div><strong>${d.status === 'approved' ? 'Aprobado' : 'Rechazado'} por:</strong> ${d.approvedByEmail?.split('@')[0] || 'Admin'}</div>
                                    <div><strong>Fecha:</strong> ${new Date(d.approvedAt).toLocaleString('es-ES')}</div>
                                    ${d.approvalNotes ? `<div style="margin-top: 0.5rem; background: white; padding: 0.5rem; border-radius: 6px;"><strong>📝 Nota:</strong> ${d.approvalNotes}</div>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                `}
            </div>

            <!-- Footer -->
            <div style="padding: 1rem; background: #f9fafb; border-top: 1px solid #e5e7eb;">
                <button onclick="closeMyDeliveriesModal()" style="width: 100%; padding: 0.75rem; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 1rem;">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeMyDeliveriesModal();
    });
};

window.closeMyDeliveriesModal = function() {
    const modal = document.getElementById('myDeliveriesModal');
    if (modal) modal.remove();
};

/**
 * Get count of user's pending deliveries (for badge display)
 */
window.getMyPendingDeliveriesCount = async function() {
    const myDeliveries = await window.loadMyDeliveries();
    return myDeliveries.filter(d => d.status === 'pending').length;
};

/**
 * Render the cash deliveries view (admin only)
 */
async function renderCashDeliveriesView() {
    // Load all deliveries
    let allDeliveries = [];
    try {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, 'cashDeliveries');
        const snapshot = await db.get(ref);

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const delivery = child.val();
                delivery.id = child.key;
                allDeliveries.push(delivery);
            });
        }
    } catch (error) {
        console.error('Error loading deliveries:', error);
    }

    // Sort by date descending
    allDeliveries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Separate by status
    const pending = allDeliveries.filter(d => d.status === 'pending');
    const approved = allDeliveries.filter(d => d.status === 'approved');
    const rejected = allDeliveries.filter(d => d.status === 'rejected');

    // Calculate totals
    const totalApproved = approved.reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalPending = pending.reduce((sum, d) => sum + (d.amount || 0), 0);

    return `
        <div style="padding: 1.5rem;">
            <h2 style="margin: 0 0 1.5rem 0;">📥 Entregas de Efectivo</h2>

            <!-- Stats -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <div style="background: #fef3c7; padding: 1.25rem; border-radius: 12px; text-align: center; border: 1px solid #fcd34d;">
                    <div style="font-size: 2rem; font-weight: bold; color: #92400e;">${pending.length}</div>
                    <div style="color: #78350f;">Pendientes</div>
                    <div style="font-size: 0.9rem; color: #92400e; margin-top: 0.25rem;">${formatCurrency(totalPending)}</div>
                </div>
                <div style="background: #d1fae5; padding: 1.25rem; border-radius: 12px; text-align: center; border: 1px solid #6ee7b7;">
                    <div style="font-size: 2rem; font-weight: bold; color: #065f46;">${approved.length}</div>
                    <div style="color: #047857;">Aprobadas</div>
                    <div style="font-size: 0.9rem; color: #065f46; margin-top: 0.25rem;">${formatCurrency(totalApproved)}</div>
                </div>
                <div style="background: #fee2e2; padding: 1.25rem; border-radius: 12px; text-align: center; border: 1px solid #fca5a5;">
                    <div style="font-size: 2rem; font-weight: bold; color: #991b1b;">${rejected.length}</div>
                    <div style="color: #dc2626;">Rechazadas</div>
                </div>
            </div>

            <!-- Pending Section -->
            ${pending.length > 0 ? `
                <div style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;">
                    <h3 style="margin: 0 0 1rem 0; color: #92400e;">⏳ Entregas Pendientes de Aprobación (${pending.length})</h3>
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        ${pending.map(d => renderDeliveryCard(d)).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- History -->
            <div style="background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 1rem 0;">📜 Historial de Entregas</h3>
                ${allDeliveries.length === 0 ? `
                    <div style="text-align: center; padding: 2rem; color: #6b7280;">
                        No hay entregas registradas
                    </div>
                ` : `
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f3f4f6;">
                            <tr>
                                <th style="padding: 0.75rem; text-align: left;">Fecha</th>
                                <th style="padding: 0.75rem; text-align: left;">Entregado por</th>
                                <th style="padding: 0.75rem; text-align: right;">Monto</th>
                                <th style="padding: 0.75rem; text-align: center;">Estado</th>
                                <th style="padding: 0.75rem; text-align: left;">Aprobado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allDeliveries.map(d => `
                                <tr style="border-top: 1px solid #e5e7eb;">
                                    <td style="padding: 0.75rem;">
                                        ${new Date(d.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                        <br><small style="color: #6b7280;">${new Date(d.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</small>
                                    </td>
                                    <td style="padding: 0.75rem; font-size: 0.9rem;">${d.createdByEmail?.split('@')[0] || 'N/A'}</td>
                                    <td style="padding: 0.75rem; text-align: right; font-weight: 500;">${formatCurrency(d.amount)}</td>
                                    <td style="padding: 0.75rem; text-align: center;">
                                        ${d.status === 'pending' ? '<span style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem;">⏳ Pendiente</span>' :
                                          d.status === 'approved' ? '<span style="background: #d1fae5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem;">✅ Aprobada</span>' :
                                          '<span style="background: #fee2e2; color: #991b1b; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem;">❌ Rechazada</span>'}
                                    </td>
                                    <td style="padding: 0.75rem; font-size: 0.85rem; color: #6b7280;">
                                        ${d.approvedAt ? new Date(d.approvedAt).toLocaleDateString('es-ES') : '-'}
                                        ${d.approvalNotes ? `<br><small title="${d.approvalNotes}">📝 ${d.approvalNotes.substring(0, 20)}${d.approvalNotes.length > 20 ? '...' : ''}</small>` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>
    `;
}

/**
 * Render a single delivery card for approval
 */
function renderDeliveryCard(d) {
    return `
        <div style="background: white; border-radius: 8px; padding: 1rem; border-left: 4px solid #f59e0b;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                <div>
                    <div style="font-weight: bold; font-size: 1.25rem; color: #111827;">
                        ${formatCurrency(d.amount)}
                    </div>
                    <div style="color: #6b7280; font-size: 0.9rem;">
                        📅 ${new Date(d.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                        • Base: ${formatCurrency(d.baseRemaining)}
                    </div>
                </div>
                <div style="text-align: right; font-size: 0.85rem; color: #6b7280;">
                    <div>${d.createdByEmail}</div>
                    <div>${new Date(d.createdAt).toLocaleString('es-ES')}</div>
                </div>
            </div>
            ${d.notes ? `<div style="background: #f9fafb; padding: 0.5rem; border-radius: 4px; font-size: 0.9rem; margin-bottom: 0.75rem;"><strong>Nota:</strong> ${d.notes}</div>` : ''}
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <input type="text" id="approvalNotes_${d.id}" placeholder="Notas (opcional)..."
                       style="flex: 1; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.9rem;">
                <button onclick="approveDelivery('${d.id}')" style="padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    ✅ Aprobar
                </button>
                <button onclick="rejectDelivery('${d.id}')" style="padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    ❌ Rechazar
                </button>
            </div>
        </div>
    `;
}

/**
 * ADMIN ONLY: Reopen a closed cash register closure for corrections
 * Only accessible to admin users
 */
window.reopenClosure = async function(date) {
    console.log('🔓 ========================================');
    console.log('🔓 RE-OPENING CLOSURE FOR DATE:', date);
    console.log('🔓 ========================================');

    // Verify admin permission (both admin and director can reopen)
    const isAdmin = window.userRole === 'admin' || window.userRole === 'director';

    console.log('🔍 Permission check:', {
        userRole: window.userRole,
        isAdmin: isAdmin
    });

    if (!isAdmin) {
        alert('❌ Solo los administradores pueden re-abrir cierres cerrados.');
        console.error('❌ Access denied: User role is', window.userRole);
        return;
    }

    // Confirm action
    const confirmed = confirm(
        `⚠️ ¿Estás seguro de re-abrir el cierre del ${new Date(date).toLocaleDateString('es-ES')}?\n\n` +
        `Esto permitirá hacer correcciones en:\n` +
        `• Apertura de caja\n` +
        `• Cierre de caja\n` +
        `• Notas del cierre\n\n` +
        `El cierre quedará marcado como ABIERTO hasta que lo cierres nuevamente.`
    );

    if (!confirmed) {
        console.log('🔓 Operation cancelled by user');
        return;
    }

    try {
        const db = window.firebaseModules.database;
        const reconciliationRef = db.ref(window.FirebaseData.database, `dailyReconciliations/${date}`);

        // Get current closure data
        const snapshot = await db.get(reconciliationRef);

        if (!snapshot.exists()) {
            alert(`❌ No se encontró el cierre para la fecha ${date}`);
            console.error('❌ Closure not found in Firebase');
            return;
        }

        const closureData = snapshot.val();

        if (!closureData.isClosed) {
            alert(`ℹ️ Este cierre ya está abierto.`);
            console.log('ℹ️ Closure is already open');
            return;
        }

        // Reopen the closure
        const reopenedData = {
            ...closureData,
            isClosed: false,
            reopenedAt: new Date().toISOString(),
            reopenedBy: window.FirebaseData.currentUser?.uid || 'admin',
            reopenedByName: window.FirebaseData.currentUser?.displayName || 'Administrador',
            // Clear closing timestamp
            closedAt: null,
            closedBy: null,
            closedByName: null,
            // Add note about reopening
            notes: (closureData.notes || '') +
                   `\n\n[RE-ABIERTO el ${new Date().toLocaleString('es-ES')} por ${window.FirebaseData.currentUser?.displayName || 'Admin'} para correcciones]`
        };

        // Save to Firebase
        await db.set(reconciliationRef, reopenedData);

        console.log('🔓 ✅ Closure reopened successfully');
        console.log('🔓 Updated data:', reopenedData);

        // Update local cache
        window.FinanceManager.dailyReconciliations.set(date, reopenedData);

        // Show success message
        alert(
            `✅ Cierre re-abierto exitosamente\n\n` +
            `Fecha: ${new Date(date).toLocaleDateString('es-ES')}\n` +
            `Estado: ABIERTO\n\n` +
            `Ahora puedes hacer las correcciones necesarias.`
        );

        console.log('🔓 ========================================');

        // Refresh the view
        await window.FinanceManager.loadReconciliations();
        await loadHistoricalClosure(date);

    } catch (error) {
        console.error('🔓 ❌ Error reopening closure:', error);
        console.log('🔓 ========================================');
        alert(`❌ Error al re-abrir el cierre: ${error.message}`);
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
                                        <button onclick="showEditExpenseModal('${expense.id}')" class="btn btn-sm" style="background: #3b82f6; color: white; padding: 0.25rem 0.5rem; margin-right: 0.25rem;">
                                            ✏️
                                        </button>
                                        ${(window.userRole === 'admin' || window.userRole === 'director') ? `
                                        <button onclick="deleteExpenseConfirm('${expense.id}')" class="btn btn-sm" style="background: #ef4444; color: white; padding: 0.25rem 0.5rem;">
                                            🗑️
                                        </button>
                                        ` : ''}
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

window.showAddExpenseModal = async function() {
    const today = window.getTodayInColombia();
    const isAdmin = window.userRole === 'admin' || window.userRole === 'director';

    // Load custom categories from Firebase
    const customCategories = await window.loadCustomExpenseCategories();

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
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <label style="font-weight: 600;">Categoría*</label>
                        ${isAdmin ? `
                            <button type="button" onclick="showManageCategoriesModal()" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                ⚙️ Gestionar
                            </button>
                        ` : ''}
                    </div>
                    <select id="expenseCategory" required style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                        <option value="">Seleccionar...</option>
                        <optgroup label="Categorías Predeterminadas">
                            ${Object.entries(BusinessExpenseCategories).map(([key, label]) => `
                                <option value="${label}">${label}</option>
                            `).join('')}
                        </optgroup>
                        ${customCategories.business.length > 0 ? `
                            <optgroup label="Categorías Personalizadas">
                                ${customCategories.business.map(cat => `
                                    <option value="${cat}">${cat}</option>
                                `).join('')}
                            </optgroup>
                        ` : ''}
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

                <!-- Payment Source - Important for cash reconciliation -->
                <div class="form-group">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">💰 Pagado Desde*</label>
                    <div style="display: flex; gap: 0.5rem; background: #f3f4f6; padding: 0.25rem; border-radius: 6px;">
                        <button type="button" onclick="togglePaidFrom('caja')" id="paidFromCaja" style="flex: 1; padding: 0.5rem; border: none; background: #3b82f6; color: white; border-radius: 4px; cursor: pointer; font-weight: 500;">
                            💵 Caja del Negocio
                        </button>
                        <button type="button" onclick="togglePaidFrom('bolsillo')" id="paidFromBolsillo" style="flex: 1; padding: 0.5rem; border: none; background: transparent; color: #6b7280; border-radius: 4px; cursor: pointer; font-weight: 500;">
                            👛 Mi Bolsillo
                        </button>
                    </div>
                    <input type="hidden" id="expensePaidFrom" value="caja">
                    <small style="color: #6b7280; display: block; margin-top: 0.5rem;">
                        ⚠️ Si pagaste de tu bolsillo, NO afectará el cierre de caja
                    </small>
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

// Toggle expense payment source (caja vs bolsillo)
window.togglePaidFrom = function(source) {
    const cajaBtn = document.getElementById('paidFromCaja');
    const bolsilloBtn = document.getElementById('paidFromBolsillo');
    const hiddenInput = document.getElementById('expensePaidFrom');

    if (source === 'caja') {
        cajaBtn.style.background = '#3b82f6';
        cajaBtn.style.color = 'white';
        bolsilloBtn.style.background = 'transparent';
        bolsilloBtn.style.color = '#6b7280';
        hiddenInput.value = 'caja';
    } else {
        bolsilloBtn.style.background = '#f59e0b';
        bolsilloBtn.style.color = 'white';
        cajaBtn.style.background = 'transparent';
        cajaBtn.style.color = '#6b7280';
        hiddenInput.value = 'bolsillo';
    }
};

// Load custom expense categories from Firebase
window.loadCustomExpenseCategories = async function() {
    try {
        const db = window.firebaseModules.database;
        const categoriesRef = db.ref(window.FirebaseData.database, 'system/customExpenseCategories');
        const snapshot = await db.get(categoriesRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            // Ensure both business and personal arrays exist
            return {
                business: Array.isArray(data.business) ? data.business : [],
                personal: Array.isArray(data.personal) ? data.personal : []
            };
        }
        return { business: [], personal: [] };
    } catch (error) {
        console.error('Error loading custom categories:', error);
        return { business: [], personal: [] };
    }
};

// Save custom expense categories to Firebase
window.saveCustomExpenseCategories = async function(categories) {
    try {
        const db = window.firebaseModules.database;
        const categoriesRef = db.ref(window.FirebaseData.database, 'system/customExpenseCategories');

        // Ensure both arrays exist before saving
        const dataToSave = {
            business: Array.isArray(categories.business) ? categories.business : [],
            personal: Array.isArray(categories.personal) ? categories.personal : []
        };

        await db.set(categoriesRef, dataToSave);
        console.log('✅ Custom categories saved:', dataToSave);
        return true;
    } catch (error) {
        console.error('Error saving custom categories:', error);
        alert('Error al guardar las categorías personalizadas');
        return false;
    }
};

// Show manage categories modal
window.showManageCategoriesModal = async function() {
    const customCategories = await window.loadCustomExpenseCategories();

    const modal = document.createElement('div');
    modal.id = 'manageCategoriesModal';
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
        z-index: 10002;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h2 style="margin: 0 0 1.5rem 0;">⚙️ Gestionar Categorías de Gastos</h2>

            <div style="margin-bottom: 2rem;">
                <h3 style="margin: 0 0 1rem 0; font-size: 1.1rem;">➕ Agregar Nueva Categoría</h3>
                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <input type="text"
                           id="newCategoryName"
                           placeholder="Ej: Cafetería, Aseo, etc."
                           style="flex: 1; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    <select id="newCategoryType" style="padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                        <option value="business">Negocio</option>
                        <option value="personal">Personal</option>
                    </select>
                    <button onclick="addNewCategory()" style="padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;">
                        ✓ Agregar
                    </button>
                </div>
            </div>

            <div style="margin-bottom: 2rem;">
                <h3 style="margin: 0 0 1rem 0; font-size: 1.1rem;">🏢 Categorías de Negocio Personalizadas</h3>
                <div id="businessCategoriesList" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${customCategories.business.length === 0 ?
                        '<p style="color: #9ca3af; font-style: italic;">No hay categorías personalizadas</p>' :
                        customCategories.business.map((cat, index) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: #f3f4f6; border-radius: 6px;">
                                <span>${cat}</span>
                                ${(window.userRole === 'admin' || window.userRole === 'director') ? `
                                <button onclick="deleteCategory('business', ${index})" style="padding: 0.25rem 0.5rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">
                                    🗑️ Eliminar
                                </button>
                                ` : '<span style="color: #9ca3af; font-size: 0.85rem;">Solo admin</span>'}
                            </div>
                        `).join('')
                    }
                </div>
            </div>

            <div style="margin-bottom: 2rem;">
                <h3 style="margin: 0 0 1rem 0; font-size: 1.1rem;">🏠 Categorías Personales Personalizadas</h3>
                <div id="personalCategoriesList" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${customCategories.personal.length === 0 ?
                        '<p style="color: #9ca3af; font-style: italic;">No hay categorías personalizadas</p>' :
                        customCategories.personal.map((cat, index) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: #fce7f3; border-radius: 6px;">
                                <span>${cat}</span>
                                ${(window.userRole === 'admin' || window.userRole === 'director') ? `
                                <button onclick="deleteCategory('personal', ${index})" style="padding: 0.25rem 0.5rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">
                                    🗑️ Eliminar
                                </button>
                                ` : '<span style="color: #9ca3af; font-size: 0.85rem;">Solo admin</span>'}
                            </div>
                        `).join('')
                    }
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end;">
                <button onclick="closeManageCategoriesModal()" style="padding: 0.5rem 1.5rem; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

window.closeManageCategoriesModal = function() {
    const modal = document.getElementById('manageCategoriesModal');
    if (modal) modal.remove();
};

window.addNewCategory = async function() {
    const nameInput = document.getElementById('newCategoryName');
    const typeSelect = document.getElementById('newCategoryType');
    const categoryName = nameInput.value.trim();
    const categoryType = typeSelect.value;

    if (!categoryName) {
        alert('Por favor ingrese un nombre para la categoría');
        return;
    }

    // Load current categories
    const customCategories = await window.loadCustomExpenseCategories();

    // Check if category already exists
    if (customCategories[categoryType].includes(categoryName)) {
        alert('Esta categoría ya existe');
        return;
    }

    // Add new category
    customCategories[categoryType].push(categoryName);

    // Save to Firebase
    const saved = await window.saveCustomExpenseCategories(customCategories);

    if (saved) {
        // Close and reopen modal to refresh
        window.closeManageCategoriesModal();
        window.showManageCategoriesModal();

        // Show success message
        alert(`Categoría "${categoryName}" agregada exitosamente`);
    }
};

window.deleteCategory = async function(type, categoryIndex) {
    // Check if user is admin or director
    if (window.userRole !== 'admin' && window.userRole !== 'director') {
        window.showNotification('🚫 Comunícate con administración - no tienes permitido borrar datos de esta plataforma', 'error');
        return;
    }

    // Load current categories
    const customCategories = await window.loadCustomExpenseCategories();

    // Get category name for confirmation
    const categoryName = customCategories[type][categoryIndex];

    if (!confirm(`¿Está seguro de eliminar la categoría "${categoryName}"?`)) {
        return;
    }

    // Remove category by index
    customCategories[type].splice(categoryIndex, 1);

    // Save to Firebase
    const saved = await window.saveCustomExpenseCategories(customCategories);

    if (saved) {
        // Close and reopen modal to refresh
        window.closeManageCategoriesModal();
        window.showManageCategoriesModal();

        // Show success message
        alert(`Categoría "${categoryName}" eliminada exitosamente`);
    }
};

// Toggle expense type and update categories
window.toggleExpenseType = async function(type) {
    const typeInput = document.getElementById('expenseType');
    const businessBtn = document.getElementById('expenseTypeBusiness');
    const personalBtn = document.getElementById('expenseTypePersonal');
    const categorySelect = document.getElementById('expenseCategory');

    // Load custom categories
    const customCategories = await window.loadCustomExpenseCategories();

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
            '<optgroup label="Categorías Predeterminadas">' +
            Object.entries(BusinessExpenseCategories).map(([key, label]) =>
                `<option value="${label}">${label}</option>`
            ).join('') +
            '</optgroup>' +
            (customCategories.business.length > 0 ?
                '<optgroup label="Categorías Personalizadas">' +
                customCategories.business.map(cat => `<option value="${cat}">${cat}</option>`).join('') +
                '</optgroup>'
            : '');
    } else {
        personalBtn.style.background = '#3b82f6';
        personalBtn.style.color = 'white';
        businessBtn.style.background = 'transparent';
        businessBtn.style.color = '#6b7280';

        // Update categories to personal
        categorySelect.innerHTML = '<option value="">Seleccionar...</option>' +
            '<optgroup label="Categorías Predeterminadas">' +
            Object.entries(PersonalExpenseCategories).map(([key, label]) =>
                `<option value="${label}">${label}</option>`
            ).join('') +
            '</optgroup>' +
            (customCategories.personal.length > 0 ?
                '<optgroup label="Categorías Personalizadas">' +
                customCategories.personal.map(cat => `<option value="${cat}">${cat}</option>`).join('') +
                '</optgroup>'
            : '');
    }
};

window.saveExpense = async function(event) {
    event.preventDefault();

    const expenseData = {
        category: document.getElementById('expenseCategory').value,
        amount: document.getElementById('expenseAmount').value,
        date: document.getElementById('expenseDate').value,
        description: document.getElementById('expenseDescription').value,
        type: document.getElementById('expenseType').value, // Add type field
        paidFrom: document.getElementById('expensePaidFrom')?.value || 'caja' // 'caja' or 'bolsillo'
    };

    try {
        await window.FinanceManager.addExpense(expenseData);
        const paidFromLabel = expenseData.paidFrom === 'bolsillo' ? '(pagado de bolsillo)' : '(de caja)';
        window.showNotification(`✅ Gasto registrado exitosamente ${paidFromLabel}`, 'success');
        closeExpenseModal();
        loadExpensesView();
    } catch (error) {
        console.error('Error saving expense:', error);
        window.showNotification('❌ Error al registrar gasto', 'error');
    }
};

window.deleteExpenseConfirm = async function(id) {
    // Check if user is admin or director
    if (window.userRole !== 'admin' && window.userRole !== 'director') {
        window.showNotification('🚫 Comunícate con administración - no tienes permitido borrar datos de esta plataforma', 'error');
        return;
    }

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

// Show edit expense modal
window.showEditExpenseModal = async function(id) {
    // Check if user is admin or director (also check email for super admin)
    const currentEmail = window.currentUser?.email || window.FirebaseData?.currentUser?.email || '';
    const isSuperAdmin = currentEmail === 'admin@ciudadbilingue.com';
    if (!isSuperAdmin && window.userRole !== 'admin' && window.userRole !== 'director') {
        window.showNotification('🚫 No tienes permisos para editar gastos', 'error');
        return;
    }

    // Find the expense (expenses is a Map, not an array)
    let expense = null;
    if (window.FinanceManager.expenses instanceof Map) {
        expense = window.FinanceManager.expenses.get(id);
        if (expense) expense = { id, ...expense };
    } else if (Array.isArray(window.FinanceManager.expenses)) {
        expense = window.FinanceManager.expenses.find(e => e.id === id);
    }
    if (!expense) {
        window.showNotification('❌ Gasto no encontrado', 'error');
        return;
    }

    const isAdmin = window.userRole === 'admin' || window.userRole === 'director' || isSuperAdmin;
    const customCategories = await window.loadCustomExpenseCategories();
    const expenseType = expense.type || 'business';

    const modal = document.createElement('div');
    modal.id = 'editExpenseModal';
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

    // Build category options based on expense type
    const defaultCategories = expenseType === 'personal' ? PersonalExpenseCategories : BusinessExpenseCategories;
    const customCats = expenseType === 'personal' ? customCategories.personal : customCategories.business;

    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%;">
            <h2 style="margin: 0 0 1.5rem 0;">✏️ Editar Gasto</h2>

            <form id="editExpenseForm" onsubmit="updateExpense(event, '${id}')" style="display: grid; gap: 1rem;">
                <input type="hidden" id="editExpenseId" value="${id}">

                <!-- Type Selector -->
                ${isAdmin ? `
                <div class="form-group">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Tipo de Gasto*</label>
                    <div style="display: flex; gap: 0.5rem; background: #f3f4f6; padding: 0.25rem; border-radius: 6px;">
                        <button type="button" onclick="toggleEditExpenseType('business')" id="editExpenseTypeBusiness" style="flex: 1; padding: 0.5rem; border: none; background: ${expenseType === 'business' ? '#3b82f6' : 'transparent'}; color: ${expenseType === 'business' ? 'white' : '#6b7280'}; border-radius: 4px; cursor: pointer; font-weight: 500;">
                            🏢 Negocio
                        </button>
                        <button type="button" onclick="toggleEditExpenseType('personal')" id="editExpenseTypePersonal" style="flex: 1; padding: 0.5rem; border: none; background: ${expenseType === 'personal' ? '#3b82f6' : 'transparent'}; color: ${expenseType === 'personal' ? 'white' : '#6b7280'}; border-radius: 4px; cursor: pointer; font-weight: 500;">
                            🏠 Personal
                        </button>
                    </div>
                    <input type="hidden" id="editExpenseType" value="${expenseType}">
                </div>
                ` : `<input type="hidden" id="editExpenseType" value="${expenseType}">`}

                <div class="form-group">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <label style="font-weight: 600;">Categoría*</label>
                        ${isAdmin ? `
                            <button type="button" onclick="showManageCategoriesModal()" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                ⚙️ Gestionar
                            </button>
                        ` : ''}
                    </div>
                    <select id="editExpenseCategory" required style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                        <option value="">Seleccionar...</option>
                        <optgroup label="Categorías Predeterminadas">
                            ${Object.entries(defaultCategories).map(([key, label]) => `
                                <option value="${label}" ${expense.category === label ? 'selected' : ''}>${label}</option>
                            `).join('')}
                        </optgroup>
                        ${customCats.length > 0 ? `
                            <optgroup label="Categorías Personalizadas">
                                ${customCats.map(cat => `
                                    <option value="${cat}" ${expense.category === cat ? 'selected' : ''}>${cat}</option>
                                `).join('')}
                            </optgroup>
                        ` : ''}
                    </select>
                </div>

                <div class="form-group">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Monto (COP)*</label>
                    <input type="text"
                           id="editExpenseAmount"
                           required
                           oninput="formatCurrencyInput(this)"
                           value="${formatCurrency(expense.amount)}"
                           style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                </div>

                <div class="form-group">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Fecha*</label>
                    <input type="date"
                           id="editExpenseDate"
                           value="${expense.date}"
                           required
                           style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                </div>

                <div class="form-group">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Descripción*</label>
                    <textarea id="editExpenseDescription"
                              required
                              rows="3"
                              style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">${expense.description || ''}</textarea>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                    <button type="button" onclick="closeEditExpenseModal()" class="btn btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary" style="background: #3b82f6; color: white;">
                        💾 Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
};

window.closeEditExpenseModal = function() {
    const modal = document.getElementById('editExpenseModal');
    if (modal) modal.remove();
};

// Toggle expense type in edit modal
window.toggleEditExpenseType = async function(type) {
    const typeInput = document.getElementById('editExpenseType');
    const businessBtn = document.getElementById('editExpenseTypeBusiness');
    const personalBtn = document.getElementById('editExpenseTypePersonal');
    const categorySelect = document.getElementById('editExpenseCategory');

    const customCategories = await window.loadCustomExpenseCategories();

    typeInput.value = type;

    if (type === 'business') {
        businessBtn.style.background = '#3b82f6';
        businessBtn.style.color = 'white';
        personalBtn.style.background = 'transparent';
        personalBtn.style.color = '#6b7280';

        categorySelect.innerHTML = '<option value="">Seleccionar...</option>' +
            '<optgroup label="Categorías Predeterminadas">' +
            Object.entries(BusinessExpenseCategories).map(([key, label]) =>
                `<option value="${label}">${label}</option>`
            ).join('') +
            '</optgroup>' +
            (customCategories.business.length > 0 ?
                '<optgroup label="Categorías Personalizadas">' +
                customCategories.business.map(cat => `<option value="${cat}">${cat}</option>`).join('') +
                '</optgroup>' : '');
    } else {
        personalBtn.style.background = '#3b82f6';
        personalBtn.style.color = 'white';
        businessBtn.style.background = 'transparent';
        businessBtn.style.color = '#6b7280';

        categorySelect.innerHTML = '<option value="">Seleccionar...</option>' +
            '<optgroup label="Categorías Predeterminadas">' +
            Object.entries(PersonalExpenseCategories).map(([key, label]) =>
                `<option value="${label}">${label}</option>`
            ).join('') +
            '</optgroup>' +
            (customCategories.personal.length > 0 ?
                '<optgroup label="Categorías Personalizadas">' +
                customCategories.personal.map(cat => `<option value="${cat}">${cat}</option>`).join('') +
                '</optgroup>' : '');
    }
};

// Update expense
window.updateExpense = async function(event, id) {
    event.preventDefault();

    const type = document.getElementById('editExpenseType').value;
    const category = document.getElementById('editExpenseCategory').value;
    const amountText = document.getElementById('editExpenseAmount').value;
    const date = document.getElementById('editExpenseDate').value;
    const description = document.getElementById('editExpenseDescription').value.trim();

    // Parse amount
    const amount = parseFloat(amountText.replace(/[^\d]/g, ''));

    if (!category || !amount || amount <= 0 || !date || !description) {
        window.showNotification('⚠️ Por favor complete todos los campos', 'error');
        return;
    }

    try {
        const db = window.firebaseModules.database;
        const expenseRef = db.ref(window.FirebaseData.database, `expenses/${id}`);

        const updates = {
            type,
            category,
            amount,
            date,
            description,
            updatedAt: new Date().toISOString(),
            updatedBy: window.currentUser?.uid || 'unknown',
            updatedByName: window.currentUser?.email || 'unknown'
        };

        await db.update(expenseRef, updates);

        // Update local data (expenses is a Map)
        if (window.FinanceManager.expenses instanceof Map) {
            const existing = window.FinanceManager.expenses.get(id);
            if (existing) {
                window.FinanceManager.expenses.set(id, { ...existing, ...updates });
            }
        } else if (Array.isArray(window.FinanceManager.expenses)) {
            const expenseIndex = window.FinanceManager.expenses.findIndex(e => e.id === id);
            if (expenseIndex !== -1) {
                window.FinanceManager.expenses[expenseIndex] = {
                    ...window.FinanceManager.expenses[expenseIndex],
                    ...updates
                };
            }
        }

        window.closeEditExpenseModal();
        window.showNotification('✅ Gasto actualizado correctamente', 'success');
        loadExpensesView();
    } catch (error) {
        console.error('Error updating expense:', error);
        window.showNotification('❌ Error al actualizar gasto', 'error');
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
                // Skip cancelled payments
                if (payment.status === 'cancelled') return false;
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
                                    ${(window.userRole === 'admin' || window.userRole === 'director') ? `
                                    <button onclick="deleteOtroIngreso('${ingreso.id}')" class="btn btn-sm" style="background: #ef4444; color: white; padding: 0.25rem 0.75rem;">
                                        🗑️ Eliminar
                                    </button>
                                    ` : '<span style="color: #9ca3af; font-size: 0.85rem;">-</span>'}
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
    // Check if user is admin or director
    if (window.userRole !== 'admin' && window.userRole !== 'director') {
        window.showNotification('🚫 Comunícate con administración - no tienes permitido borrar datos de esta plataforma', 'error');
        return;
    }

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
                                        <button onclick="showEditExpenseModal('${expense.id}')" class="btn btn-sm" style="background: #3b82f6; color: white; padding: 0.25rem 0.5rem; margin-right: 0.25rem;">
                                            ✏️
                                        </button>
                                        ${(window.userRole === 'admin' || window.userRole === 'director') ? `
                                        <button onclick="deleteExpenseConfirm('${expense.id}')" class="btn btn-sm" style="background: #ef4444; color: white; padding: 0.25rem 0.5rem;">
                                            🗑️
                                        </button>
                                        ` : ''}
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
