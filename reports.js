// reports.js - Comprehensive Reports System
// ===== REPORTS DATA AGGREGATION AND VISUALIZATION =====

class ReportsManager {
    constructor() {
        this.initialized = false;
        this.currentPeriod = 'monthly';
        this.currentDate = new Date();
        this.cachedData = {
            students: null,
            payments: null,
            contacts: null,
            invoices: null,
            lastUpdate: null
        };
    }

    async init() {
        if (this.initialized) return;
        
        console.log('📊 Initializing Reports Manager...');
        
        // Load Chart.js if not already loaded
        await this.loadChartJS();
        
        this.initialized = true;
        console.log('✅ Reports Manager initialized');
    }

    // Load Chart.js library for visualizations
    async loadChartJS() {
        if (window.Chart) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
            script.onload = () => {
                console.log('📈 Chart.js loaded');
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load Chart.js'));
            document.head.appendChild(script);
        });
    }

    // ===== DATA COLLECTION =====
    
    async refreshData() {
        try {
            console.log('🔄 Refreshing reports data...');
            const db = window.firebaseModules.database;

            // Fetch all data in parallel
            const [studentsSnapshot, paymentsSnapshot, contactsSnapshot, invoicesSnapshot, salesSnapshot, productsSnapshot] = await Promise.all([
                db.get(db.ref(window.FirebaseData.database, 'students')),
                db.get(db.ref(window.FirebaseData.database, 'payments')),
                db.get(db.ref(window.FirebaseData.database, 'contacts')),
                db.get(db.ref(window.FirebaseData.database, 'invoices')),
                db.get(db.ref(window.FirebaseData.database, 'sales')),
                db.get(db.ref(window.FirebaseData.database, 'products'))
            ]);

            // Process data
            this.cachedData = {
                students: this.processStudentsData(studentsSnapshot.val() || {}),
                payments: this.processPaymentsData(paymentsSnapshot.val() || {}),
                contacts: this.processContactsData(contactsSnapshot.val() || {}),
                invoices: this.processInvoicesData(invoicesSnapshot.val() || {}),
                sales: this.processSalesData(salesSnapshot.val() || {}),
                products: this.processProductsData(productsSnapshot.val() || {}),
                lastUpdate: new Date()
            };

            console.log('✅ Reports data refreshed:', {
                students: this.cachedData.students.length,
                payments: this.cachedData.payments.length,
                contacts: this.cachedData.contacts.length,
                invoices: this.cachedData.invoices.length,
                sales: this.cachedData.sales.length,
                products: this.cachedData.products.length
            });

        } catch (error) {
            console.error('❌ Error refreshing reports data:', error);
            throw error;
        }
    }

    processSalesData(rawData) {
        return Object.keys(rawData).map(id => ({
            id,
            ...rawData[id],
            date: new Date(rawData[id].date || Date.now()),
            total: parseFloat(rawData[id].total || 0)
        })).sort((a, b) => a.date - b.date);
    }

    processProductsData(rawData) {
        return Object.keys(rawData).map(id => ({
            id,
            ...rawData[id]
        }));
    }

    processStudentsData(rawData) {
        return Object.keys(rawData).map(id => ({
            id,
            ...rawData[id],
            createdAt: new Date(rawData[id].createdAt || Date.now()),
            updatedAt: new Date(rawData[id].updatedAt || rawData[id].createdAt || Date.now())
        })).sort((a, b) => a.createdAt - b.createdAt);
    }

    processPaymentsData(rawData) {
        return Object.keys(rawData).map(id => ({
            id,
            ...rawData[id],
            date: new Date(rawData[id].date || rawData[id].createdAt || Date.now()),
            amount: parseFloat(rawData[id].amount || 0)
        })).sort((a, b) => a.date - b.date);
    }

    processContactsData(rawData) {
        return Object.keys(rawData).map(id => ({
            id,
            ...rawData[id],
            date: new Date(rawData[id].date || rawData[id].createdAt || Date.now())
        })).sort((a, b) => a.date - b.date);
    }

    processInvoicesData(rawData) {
        return Object.keys(rawData).map(id => ({
            id,
            ...rawData[id],
            date: new Date(rawData[id].date || rawData[id].createdAt || Date.now()),
            total: parseFloat(rawData[id].total || 0)
        })).sort((a, b) => a.date - b.date);
    }

    // ===== PERIOD FILTERING =====

    getDateRange(period, customStart = null, customEnd = null) {
        const now = new Date();
        let start, end;

        switch (period) {
            case 'daily':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                break;
            case 'weekly':
                const weekStart = now.getDate() - now.getDay();
                start = new Date(now.getFullYear(), now.getMonth(), weekStart);
                end = new Date(now.getFullYear(), now.getMonth(), weekStart + 7);
                break;
            case 'monthly':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                break;
            case 'semester':
                const semester = now.getMonth() < 6 ? 1 : 2;
                start = new Date(now.getFullYear(), semester === 1 ? 0 : 6, 1);
                end = new Date(now.getFullYear(), semester === 1 ? 6 : 12, 1);
                break;
            case 'yearly':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear() + 1, 0, 1);
                break;
            case 'custom':
                start = customStart || new Date(now.getFullYear(), now.getMonth(), 1);
                end = customEnd || new Date(now.getFullYear(), now.getMonth() + 1, 1);
                break;
            default:
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }

        return { start, end };
    }

    filterByPeriod(data, period, dateField = 'date', customStart = null, customEnd = null) {
        const { start, end } = this.getDateRange(period, customStart, customEnd);
        return data.filter(item => {
            const itemDate = item[dateField];
            return itemDate >= start && itemDate < end;
        });
    }

    // ===== FINANCIAL REPORTS =====

    async getFinancialReport(period = 'monthly', customStart = null, customEnd = null) {
        if (!this.cachedData.payments) await this.refreshData();

        const payments = this.filterByPeriod(this.cachedData.payments, period, 'date', customStart, customEnd);
        const invoices = this.filterByPeriod(this.cachedData.invoices, period, 'date', customStart, customEnd);

        const totalIncome = payments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0);

        const pendingPayments = payments
            .filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + p.amount, 0);

        const paymentMethods = {};
        payments.filter(p => p.status === 'paid').forEach(p => {
            const method = p.method || 'No especificado';
            paymentMethods[method] = (paymentMethods[method] || 0) + p.amount;
        });

        const dailyIncome = this.groupByDay(payments.filter(p => p.status === 'paid'));

        return {
            totalIncome,
            pendingPayments,
            totalInvoices: invoices.length,
            paidInvoices: payments.filter(p => p.status === 'paid').length,
            paymentMethods,
            dailyIncome,
            avgPaymentAmount: totalIncome / (payments.filter(p => p.status === 'paid').length || 1),
            period,
            dateRange: this.getDateRange(period, customStart, customEnd)
        };
    }

    // ===== STUDENT ANALYTICS =====

    async getStudentReport(period = 'monthly', customStart = null, customEnd = null) {
        if (!this.cachedData.students) await this.refreshData();

        const allStudents = this.cachedData.students;
        const newStudents = this.filterByPeriod(allStudents, period, 'createdAt', customStart, customEnd);
        
        const activeStudents = allStudents.filter(s => s.status === 'active');
        const inactiveStudents = allStudents.filter(s => s.status === 'inactive');

        const courseEnrollment = {};
        activeStudents.forEach(s => {
            const course = s.curso || s.program || 'No especificado';
            courseEnrollment[course] = (courseEnrollment[course] || 0) + 1;
        });

        const locationDistribution = {};
        activeStudents.forEach(s => {
            const location = s.ciudad || s.location || 'No especificada';
            locationDistribution[location] = (locationDistribution[location] || 0) + 1;
        });

        const enrollmentTrend = this.groupByMonth(newStudents, 'createdAt');

        return {
            totalStudents: allStudents.length,
            activeStudents: activeStudents.length,
            inactiveStudents: inactiveStudents.length,
            newStudents: newStudents.length,
            courseEnrollment,
            locationDistribution,
            enrollmentTrend,
            retentionRate: activeStudents.length / (allStudents.length || 1) * 100,
            period,
            dateRange: this.getDateRange(period, customStart, customEnd)
        };
    }

    // ===== SALES & LEADS REPORTS =====

    async getSalesReport(period = 'monthly', customStart = null, customEnd = null) {
        if (!this.cachedData.contacts) await this.refreshData();

        const contacts = this.filterByPeriod(this.cachedData.contacts, period, 'date', customStart, customEnd);
        const students = this.cachedData.students;

        const leadSources = {};
        contacts.forEach(c => {
            const source = c.source || c.fuente || 'No especificado';
            leadSources[source] = (leadSources[source] || 0) + 1;
        });

        const contactsWithStudentStatus = contacts.map(contact => {
            const isStudent = students.some(s => 
                s.email === contact.email || 
                s.telefono === contact.phone ||
                s.nombre?.toLowerCase() === contact.name?.toLowerCase()
            );
            return { ...contact, converted: isStudent };
        });

        const conversions = contactsWithStudentStatus.filter(c => c.converted).length;
        const conversionRate = (conversions / (contacts.length || 1)) * 100;

        const dailyLeads = this.groupByDay(contacts);

        return {
            totalLeads: contacts.length,
            conversions,
            conversionRate,
            leadSources,
            dailyLeads,
            avgResponseTime: 24, // TODO: Calculate from actual data
            period,
            dateRange: this.getDateRange(period, customStart, customEnd)
        };
    }

    // ===== TIENDA (STORE) REPORTS =====

    async getTiendaReport(period = 'monthly', customStart = null, customEnd = null) {
        if (!this.cachedData.sales) await this.refreshData();

        const sales = this.filterByPeriod(this.cachedData.sales, period, 'date', customStart, customEnd);
        const products = this.cachedData.products || [];

        // Calculate revenue and costs
        let totalRevenue = 0;
        let totalCost = 0;
        let cashSales = 0;
        let transferSales = 0;
        const paymentMethods = {};
        const categoryRevenue = {};
        const productSales = {};
        const customerPurchases = {};
        const hourlySales = Array(24).fill(0);

        sales.forEach(sale => {
            totalRevenue += sale.total;

            // Payment methods
            const method = sale.paymentMethod || 'No especificado';
            paymentMethods[method] = (paymentMethods[method] || 0) + sale.total;

            if (method === 'Efectivo') {
                cashSales += sale.total;
            } else {
                transferSales += sale.total;
            }

            // Customer tracking
            if (sale.customerId) {
                if (!customerPurchases[sale.customerId]) {
                    customerPurchases[sale.customerId] = {
                        name: sale.customerName,
                        count: 0,
                        total: 0
                    };
                }
                customerPurchases[sale.customerId].count++;
                customerPurchases[sale.customerId].total += sale.total;
            }

            // Hourly sales
            const hour = sale.date.getHours();
            hourlySales[hour] += sale.total;

            // Product analysis
            sale.items?.forEach(item => {
                const product = products.find(p => p.id === item.productId);

                // Product sales tracking
                if (!productSales[item.productName]) {
                    productSales[item.productName] = {
                        quantity: 0,
                        revenue: 0,
                        cost: 0,
                        category: product?.category || 'Otros'
                    };
                }
                productSales[item.productName].quantity += item.quantity;
                productSales[item.productName].revenue += item.subtotal;

                if (product) {
                    const itemCost = product.cost * item.quantity;
                    productSales[item.productName].cost += itemCost;
                    totalCost += itemCost;

                    // Category revenue
                    const category = product.category || 'Otros';
                    categoryRevenue[category] = (categoryRevenue[category] || 0) + item.subtotal;
                }
            });
        });

        // Calculate profit and margins
        const grossProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        // Top products by revenue
        const topProducts = Object.entries(productSales)
            .map(([name, data]) => ({
                name,
                ...data,
                profit: data.revenue - data.cost,
                margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue * 100) : 0
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        // Top customers
        const topCustomers = Object.entries(customerPurchases)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        // Peak hours
        const peakHour = hourlySales.indexOf(Math.max(...hourlySales));

        // Daily trend
        const dailySales = this.groupByDay(sales);

        return {
            // Summary
            totalRevenue,
            totalCost,
            grossProfit,
            profitMargin,
            totalSales: sales.length,
            avgSaleAmount: totalRevenue / (sales.length || 1),

            // Payment breakdown
            cashSales,
            transferSales,
            paymentMethods,

            // Products
            topProducts,
            totalProductsSold: Object.values(productSales).reduce((sum, p) => sum + p.quantity, 0),
            uniqueProductsSold: Object.keys(productSales).length,

            // Categories
            categoryRevenue,
            topCategory: Object.entries(categoryRevenue).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',

            // Customers
            topCustomers,
            totalCustomers: Object.keys(customerPurchases).length,
            customerSalesPercentage: sales.length > 0 ? (sales.filter(s => s.customerId).length / sales.length * 100) : 0,

            // Time analysis
            hourlySales,
            peakHour,
            dailySales,

            // Period info
            period,
            dateRange: this.getDateRange(period, customStart, customEnd)
        };
    }

    // ===== INVOICES REPORT =====

    async getInvoicesReport() {
        if (!this.cachedData.invoices) await this.refreshData();

        const db = window.firebaseModules.database;

        // Fetch voided invoices
        let voidedInvoices = {};
        try {
            const voidedSnapshot = await db.get(db.ref(window.FirebaseData.database, 'voidedInvoices'));
            if (voidedSnapshot.exists()) {
                voidedSnapshot.forEach((childSnapshot) => {
                    const voidedData = childSnapshot.val();
                    voidedInvoices[voidedData.invoiceNumber] = voidedData;
                });
            }
        } catch (error) {
            console.warn('Could not fetch voided invoices:', error);
        }

        // Process all invoices with voided status
        const invoicesWithStatus = this.cachedData.invoices.map(invoice => {
            const isVoided = voidedInvoices[invoice.invoiceNumber] ||
                             invoice.status === 'ANULADA' ||
                             (invoice.invoiceNumber && voidedInvoices[invoice.invoiceNumber.toString()]);

            return {
                ...invoice,
                isVoided,
                voidedInfo: isVoided ? voidedInvoices[invoice.invoiceNumber] || voidedInvoices[invoice.invoiceNumber?.toString()] : null
            };
        }).sort((a, b) => b.date - a.date); // Sort by most recent first

        const totalActive = invoicesWithStatus.filter(i => !i.isVoided);
        const totalVoided = invoicesWithStatus.filter(i => i.isVoided);

        return {
            invoices: invoicesWithStatus,
            totalCount: invoicesWithStatus.length,
            voidedCount: totalVoided.length,
            activeCount: totalActive.length,
            totalActiveAmount: totalActive.reduce((sum, i) => sum + (i.total || 0), 0)
        };
    }

    // ===== HELPER FUNCTIONS =====

    groupByDay(data, dateField = 'date') {
        const groups = {};
        data.forEach(item => {
            const day = item[dateField].toISOString().split('T')[0];
            if (!groups[day]) groups[day] = [];
            groups[day].push(item);
        });
        return groups;
    }

    groupByMonth(data, dateField = 'date') {
        const groups = {};
        data.forEach(item => {
            const month = item[dateField].toISOString().substring(0, 7);
            if (!groups[month]) groups[month] = [];
            groups[month].push(item);
        });
        return groups;
    }

    // ===== CHART GENERATION =====

    createLineChart(canvasId, labels, datasets, title) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: title
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createPieChart(canvasId, labels, data, title) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        return new Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: title
                    }
                }
            }
        });
    }

    createBarChart(canvasId, labels, datasets, title) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: title
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // ===== EXPORT FUNCTIONALITY =====

    exportToCSV(data, filename) {
        const csvContent = this.arrayToCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    arrayToCSV(data) {
        if (!data.length) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        // Add headers
        csvRows.push(headers.join(','));
        
        // Add data
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }

    // ===== FORMAT HELPERS =====

    formatCurrency(amount) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    }

    formatPercent(value) {
        return `${Math.round(value * 100) / 100}%`;
    }

    formatDate(date) {
        return date.toLocaleDateString('es-CO');
    }

    formatDateRange(start, end) {
        return `${this.formatDate(start)} - ${this.formatDate(end)}`;
    }
}

// Initialize global reports manager
window.ReportsManager = new ReportsManager();

// Export functions for use in other modules
window.generateFinancialReport = async (period, customStart, customEnd) => {
    await window.ReportsManager.init();
    return await window.ReportsManager.getFinancialReport(period, customStart, customEnd);
};

window.generateStudentReport = async (period, customStart, customEnd) => {
    await window.ReportsManager.init();
    return await window.ReportsManager.getStudentReport(period, customStart, customEnd);
};

window.generateSalesReport = async (period, customStart, customEnd) => {
    await window.ReportsManager.init();
    return await window.ReportsManager.getSalesReport(period, customStart, customEnd);
};

window.generateTiendaReport = async (period, customStart, customEnd) => {
    await window.ReportsManager.init();
    return await window.ReportsManager.getTiendaReport(period, customStart, customEnd);
};

window.generateInvoicesReport = async () => {
    await window.ReportsManager.init();
    return await window.ReportsManager.getInvoicesReport();
};

console.log('📊 Reports module loaded');