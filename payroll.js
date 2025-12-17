// payroll.js - Comprehensive Payroll Management Module
console.log('💰 Loading payroll module...');

// ==================================================================================
// SECTION 1: PAYROLL MANAGER CLASS
// ==================================================================================

class PayrollManager {
    constructor() {
        this.teachers = new Map();
        this.administrative = new Map();
        this.monthlyPayroll = new Map();
        this.operationalExpenses = new Map();
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        console.log('🚀 Initializing payroll manager');
        await this.loadAllData();
        this.initialized = true;
    }

    // Load all payroll data from Firebase
    async loadAllData() {
        try {
            const db = window.firebaseModules.database;

            // Load teachers
            const teachersRef = db.ref(window.FirebaseData.database, 'payroll/teachers');
            const teachersSnap = await db.get(teachersRef);
            if (teachersSnap.exists()) {
                Object.entries(teachersSnap.val()).forEach(([id, teacher]) => {
                    this.teachers.set(id, teacher);
                });
            }

            // Load administrative staff
            const adminRef = db.ref(window.FirebaseData.database, 'payroll/administrative');
            const adminSnap = await db.get(adminRef);
            if (adminSnap.exists()) {
                Object.entries(adminSnap.val()).forEach(([id, emp]) => {
                    this.administrative.set(id, emp);
                });
            }

            console.log(`✅ Loaded ${this.teachers.size} teachers, ${this.administrative.size} administrative staff`);
        } catch (error) {
            console.error('❌ Error loading payroll data:', error);
        }
    }

    // Save teacher to Firebase
    async saveTeacher(teacherData) {
        try {
            const id = teacherData.id || `TCH-${Date.now()}`;
            const teacher = {
                id,
                personalInfo: {
                    name: teacherData.name,
                    cedula: teacherData.cedula || '',
                    email: teacherData.email || '',
                    phone: teacherData.phone || ''
                },
                rates: {
                    cb: parseFloat(teacherData.rateCB) || 0,
                    coats: parseFloat(teacherData.rateCoats) || 0,
                    nazaret: parseFloat(teacherData.rateNazaret) || 0
                },
                bankInfo: {
                    account: teacherData.account || '',
                    bank: teacherData.bank || '',
                    method: teacherData.paymentMethod || 'Transferencia'
                },
                status: 'active',
                createdAt: teacherData.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `payroll/teachers/${id}`);
            await db.set(ref, teacher);

            this.teachers.set(id, teacher);
            console.log('✅ Teacher saved:', id);
            return teacher;
        } catch (error) {
            console.error('❌ Error saving teacher:', error);
            throw error;
        }
    }

    // Save administrative employee
    async saveAdministrative(employeeData) {
        try {
            const id = employeeData.id || `EMP-${Date.now()}`;
            const employee = {
                id,
                personalInfo: {
                    name: employeeData.name,
                    cedula: employeeData.cedula || '',
                    email: employeeData.email || '',
                    phone: employeeData.phone || '',
                    position: employeeData.position || ''
                },
                salary: {
                    amount: parseFloat(employeeData.salary) || 0,
                    frequency: employeeData.frequency || 'quincenal'
                },
                bankInfo: {
                    account: employeeData.account || '',
                    bank: employeeData.bank || '',
                    method: employeeData.paymentMethod || 'Transferencia'
                },
                status: 'active',
                createdAt: employeeData.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `payroll/administrative/${id}`);
            await db.set(ref, employee);

            this.administrative.set(id, employee);
            console.log('✅ Administrative employee saved:', id);
            return employee;
        } catch (error) {
            console.error('❌ Error saving administrative employee:', error);
            throw error;
        }
    }

    // Register class hours for a teacher
    async registerClass(classData) {
        try {
            const {teacherId, date, location, hours, rate, notes} = classData;

            const month = date.substring(0, 7); // "2025-11"
            const year = date.substring(0, 4);
            const monthNum = date.substring(5, 7);

            // Get or create monthly payroll entry
            const monthKey = `${year}/${monthNum}`;
            const db = window.firebaseModules.database;
            const payrollRef = db.ref(window.FirebaseData.database, `payroll/monthlyPayroll/${monthKey}/teachers/${teacherId}`);

            const snapshot = await db.get(payrollRef);
            let payrollData = snapshot.exists() ? snapshot.val() : {
                hours: {cb: 0, coats: 0, nazaret: 0},
                rates: {},
                classes: [],
                advances: [],
                subtotal: 0,
                total: 0,
                paid: false
            };

            // Add class record
            const classRecord = {
                id: `CLS-${Date.now()}`,
                date,
                location,
                hours: parseFloat(hours),
                rate: parseFloat(rate),
                subtotal: parseFloat(hours) * parseFloat(rate),
                notes: notes || '',
                registeredAt: new Date().toISOString(),
                registeredBy: window.FirebaseData.currentUser?.uid || 'admin'
            };

            payrollData.classes = payrollData.classes || [];
            payrollData.classes.push(classRecord);

            // Update totals
            payrollData.hours[location] = (payrollData.hours[location] || 0) + parseFloat(hours);
            payrollData.rates[location] = parseFloat(rate);

            // Recalculate subtotal
            payrollData.subtotal = payrollData.classes.reduce((sum, cls) => sum + cls.subtotal, 0);

            // Recalculate total (subtract advances)
            const totalAdvances = (payrollData.advances || []).reduce((sum, adv) => sum + adv.amount, 0);
            payrollData.total = payrollData.subtotal - totalAdvances;

            await db.set(payrollRef, payrollData);

            console.log('✅ Class registered:', classRecord.id);
            return classRecord;
        } catch (error) {
            console.error('❌ Error registering class:', error);
            throw error;
        }
    }

    // Register advance payment
    async registerAdvance(advanceData) {
        try {
            const {personId, personType, date, amount, notes, method} = advanceData;

            const month = date.substring(0, 7);
            const year = date.substring(0, 4);
            const monthNum = date.substring(5, 7);
            const monthKey = `${year}/${monthNum}`;

            const db = window.firebaseModules.database;
            const path = `payroll/monthlyPayroll/${monthKey}/${personType}/${personId}`;
            const payrollRef = db.ref(window.FirebaseData.database, path);

            const snapshot = await db.get(payrollRef);
            let payrollData = snapshot.exists() ? snapshot.val() : {
                advances: [],
                subtotal: 0,
                total: 0
            };

            const advance = {
                id: `ADV-${Date.now()}`,
                date,
                amount: parseFloat(amount),
                notes: notes || '',
                method: method || 'Transferencia',
                registeredAt: new Date().toISOString(),
                registeredBy: window.FirebaseData.currentUser?.uid || 'admin'
            };

            payrollData.advances = payrollData.advances || [];
            payrollData.advances.push(advance);

            // Recalculate total
            const totalAdvances = payrollData.advances.reduce((sum, adv) => sum + adv.amount, 0);
            payrollData.total = payrollData.subtotal - totalAdvances;

            await db.set(payrollRef, payrollData);

            console.log('✅ Advance registered:', advance.id);
            return advance;
        } catch (error) {
            console.error('❌ Error registering advance:', error);
            throw error;
        }
    }

    // Get monthly payroll for a specific month
    async getMonthlyPayroll(year, month) {
        try {
            const db = window.firebaseModules.database;
            const monthKey = `${year}/${String(month).padStart(2, '0')}`;
            const payrollRef = db.ref(window.FirebaseData.database, `payroll/monthlyPayroll/${monthKey}`);

            const snapshot = await db.get(payrollRef);
            return snapshot.exists() ? snapshot.val() : {teachers: {}, administrative: {}};
        } catch (error) {
            console.error('❌ Error loading monthly payroll:', error);
            return {teachers: {}, administrative: {}};
        }
    }

    // Save operational expense
    async saveOperationalExpense(expenseData) {
        try {
            const {year, month, name, amount, category, notes} = expenseData;
            const monthKey = `${year}/${String(month).padStart(2, '0')}`;

            const db = window.firebaseModules.database;
            const expenseId = `OPE-${Date.now()}`;
            const expenseRef = db.ref(window.FirebaseData.database, `payroll/operationalExpenses/${monthKey}/items/${expenseId}`);

            const expense = {
                id: expenseId,
                name,
                amount: parseFloat(amount),
                category: category || 'Otros',
                notes: notes || '',
                createdAt: new Date().toISOString(),
                createdBy: window.FirebaseData.currentUser?.uid || 'admin'
            };

            await db.set(expenseRef, expense);

            console.log('✅ Operational expense saved:', expenseId);
            return expense;
        } catch (error) {
            console.error('❌ Error saving operational expense:', error);
            throw error;
        }
    }

    // Get operational expenses for a month
    async getOperationalExpenses(year, month) {
        try {
            const db = window.firebaseModules.database;
            const monthKey = `${year}/${String(month).padStart(2, '0')}`;
            const expensesRef = db.ref(window.FirebaseData.database, `payroll/operationalExpenses/${monthKey}/items`);

            const snapshot = await db.get(expensesRef);
            if (snapshot.exists()) {
                return Object.values(snapshot.val());
            }
            return [];
        } catch (error) {
            console.error('❌ Error loading operational expenses:', error);
            return [];
        }
    }
}

// ==================================================================================
// SECTION 2: UI RENDERING FUNCTIONS
// ==================================================================================

// Main payroll tab loader
window.loadPayrollTab = async function() {
    console.log('💰 Loading payroll tab');

    const container = document.getElementById('payrollContainer');
    if (!container) {
        console.error('❌ Payroll container not found');
        return;
    }

    // Restrict access to admin@ciudadbilingue.com only
    const currentUserEmail = window.FirebaseData?.currentUser?.email || '';
    if (currentUserEmail !== 'admin@ciudadbilingue.com') {
        container.innerHTML = `
            <div style="padding: 3rem; text-align: center;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🔒</div>
                <h2 style="color: #ef4444; margin: 0 0 1rem 0;">Acceso Restringido</h2>
                <p style="color: #6b7280;">Este módulo está disponible solo para administradores.</p>
            </div>
        `;
        return;
    }

    await window.PayrollManager.init();

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    container.innerHTML = `
        <div style="padding: 1rem; min-height: 100vh; background: #f3f4f6;">
            <div style="max-width: 1400px; margin: 0 auto;">
                <!-- Header -->
                <div style="background: white; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0 0 0.5rem 0;">💰 Gestión de Nómina</h2>
                            <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">Administración de pagos a profesores y personal</p>
                        </div>
                        <div style="display: flex; gap: 1rem; align-items: center;">
                            <select id="payrollYear" onchange="loadPayrollForMonth()" style="padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                                ${Array.from({length: 5}, (_, i) => currentYear - i).map(y => `
                                    <option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>
                                `).join('')}
                            </select>
                            <select id="payrollMonth" onchange="loadPayrollForMonth()" style="padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                                ${Array.from({length: 12}, (_, i) => i + 1).map(m => `
                                    <option value="${m}" ${m === currentMonth ? 'selected' : ''}>
                                        ${new Date(2000, m - 1).toLocaleDateString('es-CO', {month: 'long'})}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Tabs -->
                <div style="background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                    <div style="display: flex; border-bottom: 2px solid #e5e7eb;">
                        <button onclick="switchPayrollTab('summary')" id="tabSummary" class="payroll-tab active" style="flex: 1; padding: 1rem; border: none; background: white; cursor: pointer; font-weight: 500; transition: all 0.2s;">
                            📊 Resumen Global
                        </button>
                        <button onclick="switchPayrollTab('teachers')" id="tabTeachers" class="payroll-tab" style="flex: 1; padding: 1rem; border: none; background: white; cursor: pointer; font-weight: 500; transition: all 0.2s;">
                            👩‍🏫 Profesores
                        </button>
                        <button onclick="switchPayrollTab('administrative')" id="tabAdministrative" class="payroll-tab" style="flex: 1; padding: 1rem; border: none; background: white; cursor: pointer; font-weight: 500; transition: all 0.2s;">
                            👔 Personal Administrativo
                        </button>
                        <button onclick="switchPayrollTab('operational')" id="tabOperational" class="payroll-tab" style="flex: 1; padding: 1rem; border: none; background: white; cursor: pointer; font-weight: 500; transition: all 0.2s;">
                            🏢 Gastos Operativos
                        </button>
                    </div>

                    <!-- Tab Content -->
                    <div id="payrollTabContent" style="padding: 2rem;">
                        <div style="text-align: center; padding: 3rem; color: #9ca3af;">
                            Cargando...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add CSS for tabs
    const style = document.createElement('style');
    style.textContent = `
        .payroll-tab {
            position: relative;
        }
        .payroll-tab.active {
            color: #3b82f6;
            background: #eff6ff !important;
        }
        .payroll-tab.active::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            right: 0;
            height: 2px;
            background: #3b82f6;
        }
        .payroll-tab:hover:not(.active) {
            background: #f9fafb !important;
        }
    `;
    document.head.appendChild(style);

    // Load default tab
    window.switchPayrollTab('summary');
};

// Switch between tabs
window.switchPayrollTab = function(tab) {
    // Update tab buttons
    document.querySelectorAll('.payroll-tab').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');

    // Load tab content
    switch(tab) {
        case 'summary':
            renderSummaryTab();
            break;
        case 'teachers':
            renderTeachersTab();
            break;
        case 'administrative':
            renderAdministrativeTab();
            break;
        case 'operational':
            renderOperationalTab();
            break;
    }
};

// Render summary tab - shows all employees and teachers together
async function renderSummaryTab() {
    const year = parseInt(document.getElementById('payrollYear').value);
    const month = parseInt(document.getElementById('payrollMonth').value);
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    // Load data from all sources
    // 1. From Employees 2.0 module
    let employees2 = [];
    if (window.EmployeeManager && window.EmployeeManager.employees) {
        await window.EmployeeManager.init();
        employees2 = Array.from(window.EmployeeManager.employees.values()).filter(e => e.status === 'active');
    }

    // 2. From Teachers 2.0 module
    let teachers2 = [];
    if (window.TeacherManager && window.TeacherManager.teachers) {
        await window.TeacherManager.init();
        teachers2 = Array.from(window.TeacherManager.teachers.values());
    }

    // 3. From Payroll module (legacy)
    const payrollTeachers = Array.from(window.PayrollManager.teachers.values());
    const payrollAdmin = Array.from(window.PayrollManager.administrative.values());
    const monthlyPayroll = await window.PayrollManager.getMonthlyPayroll(year, month);

    // Calculate totals
    let totalAdminSalary = 0;
    let totalContratistaSalary = 0;
    let totalTeachersSalary = 0;

    // Process Employees 2.0
    employees2.forEach(emp => {
        if (emp.employeeType === 'contratista') {
            totalContratistaSalary += parseFloat(emp.hourlyRate) || 0; // Note: This would need hours tracking
        } else {
            totalAdminSalary += parseFloat(emp.salary) || 0;
        }
    });

    // Process Teachers 2.0 (hourly)
    teachers2.forEach(teacher => {
        if (teacher.paymentType === 'salary') {
            totalTeachersSalary += parseFloat(teacher.monthlySalary) || 0;
        }
        // Hourly teachers need hours tracking
    });

    // Process Payroll legacy teachers
    payrollTeachers.forEach(teacher => {
        const payroll = monthlyPayroll.teachers?.[teacher.id];
        if (payroll) {
            totalTeachersSalary += payroll.total || 0;
        }
    });

    // Process Payroll legacy admin
    payrollAdmin.forEach(emp => {
        const payroll = monthlyPayroll.administrative?.[emp.id];
        totalAdminSalary += payroll?.total || emp.salary?.amount || 0;
    });

    const grandTotal = totalAdminSalary + totalContratistaSalary + totalTeachersSalary;

    const content = `
        <div>
            <div style="margin-bottom: 2rem;">
                <h3 style="margin: 0 0 0.5rem 0;">📊 Resumen Global de Nómina</h3>
                <p style="color: #6b7280; margin: 0;">${monthNames[month - 1]} ${year}</p>
            </div>

            <!-- Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 12px;">
                    <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">💼 Administrativos</div>
                    <div style="font-size: 1.75rem; font-weight: bold;">${formatCurrency(totalAdminSalary)}</div>
                    <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.5rem;">${employees2.filter(e => e.employeeType !== 'contratista').length + payrollAdmin.length} personas</div>
                </div>
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 1.5rem; border-radius: 12px;">
                    <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">⏰ Contratistas</div>
                    <div style="font-size: 1.75rem; font-weight: bold;">${formatCurrency(totalContratistaSalary)}</div>
                    <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.5rem;">${employees2.filter(e => e.employeeType === 'contratista').length} personas</div>
                </div>
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 1.5rem; border-radius: 12px;">
                    <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">👩‍🏫 Profesores</div>
                    <div style="font-size: 1.75rem; font-weight: bold;">${formatCurrency(totalTeachersSalary)}</div>
                    <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.5rem;">${teachers2.length + payrollTeachers.length} personas</div>
                </div>
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1.5rem; border-radius: 12px;">
                    <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">💰 TOTAL NÓMINA</div>
                    <div style="font-size: 1.75rem; font-weight: bold;">${formatCurrency(grandTotal)}</div>
                    <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.5rem;">Total mensual</div>
                </div>
            </div>

            <!-- Employees 2.0 Table -->
            ${employees2.length > 0 ? `
                <div style="margin-bottom: 2rem;">
                    <h4 style="margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="background: #667eea; color: white; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.875rem;">Empleados 2.0</span>
                        Personal desde módulo Empleados
                    </h4>
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #f9fafb;">
                                <tr>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Nombre</th>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Posición</th>
                                    <th style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">Tipo</th>
                                    <th style="padding: 0.75rem; text-align: right; border-bottom: 1px solid #e5e7eb;">Salario/Tarifa</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${employees2.map(emp => `
                                    <tr style="border-bottom: 1px solid #f3f4f6;">
                                        <td style="padding: 0.75rem;">
                                            <div style="font-weight: 500;">${emp.name}</div>
                                            <div style="font-size: 0.75rem; color: #6b7280;">${emp.email}</div>
                                        </td>
                                        <td style="padding: 0.75rem; color: #6b7280;">${emp.position}</td>
                                        <td style="padding: 0.75rem; text-align: center;">
                                            ${emp.employeeType === 'contratista' ? `
                                                <span style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">⏰ Contratista</span>
                                            ` : `
                                                <span style="background: #d1fae5; color: #065f46; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">💼 Administrativo</span>
                                            `}
                                        </td>
                                        <td style="padding: 0.75rem; text-align: right; font-weight: 600;">
                                            ${emp.employeeType === 'contratista'
                                                ? `${formatCurrency(emp.hourlyRate || 0)}/hora`
                                                : formatCurrency(emp.salary || 0)}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}

            <!-- Teachers 2.0 Table -->
            ${teachers2.length > 0 ? `
                <div style="margin-bottom: 2rem;">
                    <h4 style="margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="background: #3b82f6; color: white; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.875rem;">Profesores 2.0</span>
                        Profesores desde módulo Profesores
                    </h4>
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #f9fafb;">
                                <tr>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Nombre</th>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Contacto</th>
                                    <th style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">Tipo Pago</th>
                                    <th style="padding: 0.75rem; text-align: right; border-bottom: 1px solid #e5e7eb;">Tarifa/Salario</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${teachers2.map(teacher => `
                                    <tr style="border-bottom: 1px solid #f3f4f6;">
                                        <td style="padding: 0.75rem;">
                                            <div style="font-weight: 500;">${teacher.name}</div>
                                        </td>
                                        <td style="padding: 0.75rem; color: #6b7280;">
                                            ${teacher.phone || ''} ${teacher.email ? `• ${teacher.email}` : ''}
                                        </td>
                                        <td style="padding: 0.75rem; text-align: center;">
                                            ${teacher.paymentType === 'salary' ? `
                                                <span style="background: #d1fae5; color: #065f46; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">💼 Salario</span>
                                            ` : `
                                                <span style="background: #dbeafe; color: #1e40af; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">⏰ Por hora</span>
                                            `}
                                        </td>
                                        <td style="padding: 0.75rem; text-align: right; font-weight: 600;">
                                            ${teacher.paymentType === 'salary'
                                                ? formatCurrency(teacher.monthlySalary || 0)
                                                : `${formatCurrency(teacher.hourlyRate || 0)}/hora`}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}

            <!-- Payroll Legacy Teachers -->
            ${payrollTeachers.length > 0 ? `
                <div style="margin-bottom: 2rem;">
                    <h4 style="margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="background: #f59e0b; color: white; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.875rem;">Nómina</span>
                        Profesores desde módulo Nómina
                    </h4>
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #f9fafb;">
                                <tr>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Nombre</th>
                                    <th style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">Horas CB</th>
                                    <th style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">Horas COATS</th>
                                    <th style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">Horas Nazaret</th>
                                    <th style="padding: 0.75rem; text-align: right; border-bottom: 1px solid #e5e7eb;">Total a Pagar</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${payrollTeachers.map(teacher => {
                                    const payroll = monthlyPayroll.teachers?.[teacher.id] || { hours: {cb: 0, coats: 0, nazaret: 0}, total: 0 };
                                    return `
                                        <tr style="border-bottom: 1px solid #f3f4f6;">
                                            <td style="padding: 0.75rem;">
                                                <div style="font-weight: 500;">${teacher.personalInfo?.name || 'N/A'}</div>
                                                <div style="font-size: 0.75rem; color: #6b7280;">${teacher.personalInfo?.cedula || ''}</div>
                                            </td>
                                            <td style="padding: 0.75rem; text-align: center;">${payroll.hours?.cb || 0}h</td>
                                            <td style="padding: 0.75rem; text-align: center;">${payroll.hours?.coats || 0}h</td>
                                            <td style="padding: 0.75rem; text-align: center;">${payroll.hours?.nazaret || 0}h</td>
                                            <td style="padding: 0.75rem; text-align: right; font-weight: 600; color: #10b981;">
                                                ${formatCurrency(payroll.total || 0)}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}

            <!-- Payroll Legacy Admin -->
            ${payrollAdmin.length > 0 ? `
                <div style="margin-bottom: 2rem;">
                    <h4 style="margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="background: #8b5cf6; color: white; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.875rem;">Nómina</span>
                        Personal Administrativo desde módulo Nómina
                    </h4>
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #f9fafb;">
                                <tr>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Nombre</th>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Cargo</th>
                                    <th style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">Frecuencia</th>
                                    <th style="padding: 0.75rem; text-align: right; border-bottom: 1px solid #e5e7eb;">Salario</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${payrollAdmin.map(emp => `
                                    <tr style="border-bottom: 1px solid #f3f4f6;">
                                        <td style="padding: 0.75rem;">
                                            <div style="font-weight: 500;">${emp.personalInfo?.name || 'N/A'}</div>
                                            <div style="font-size: 0.75rem; color: #6b7280;">${emp.personalInfo?.cedula || ''}</div>
                                        </td>
                                        <td style="padding: 0.75rem; color: #6b7280;">${emp.personalInfo?.position || 'N/A'}</td>
                                        <td style="padding: 0.75rem; text-align: center;">
                                            <span style="background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">
                                                ${emp.salary?.frequency === 'quincenal' ? 'Quincenal' : 'Mensual'}
                                            </span>
                                        </td>
                                        <td style="padding: 0.75rem; text-align: right; font-weight: 600; color: #8b5cf6;">
                                            ${formatCurrency(emp.salary?.amount || 0)}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}

            ${employees2.length === 0 && teachers2.length === 0 && payrollTeachers.length === 0 && payrollAdmin.length === 0 ? `
                <div style="text-align: center; padding: 3rem; color: #9ca3af;">
                    <p style="font-size: 1.125rem; margin: 0;">No hay personal registrado</p>
                    <p style="margin: 0.5rem 0 0 0;">Agrega empleados en los módulos Empleados 2.0, Profesores 2.0 o en las pestañas de este módulo</p>
                </div>
            ` : ''}
        </div>
    `;

    document.getElementById('payrollTabContent').innerHTML = content;
}

// Render teachers tab
async function renderTeachersTab() {
    const year = parseInt(document.getElementById('payrollYear').value);
    const month = parseInt(document.getElementById('payrollMonth').value);

    const teachers = Array.from(window.PayrollManager.teachers.values());
    const monthlyPayroll = await window.PayrollManager.getMonthlyPayroll(year, month);

    let totalPayroll = 0;

    const content = `
        <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0;">👩‍🏫 Nómina de Profesores</h3>
                <div style="display: flex; gap: 1rem;">
                    <button onclick="showAddTeacherModal()" class="btn" style="background: #10b981; color: white; padding: 0.75rem 1.5rem;">
                        ➕ Nuevo Profesor
                    </button>
                    <button onclick="showRegisterClassModal()" class="btn" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem;">
                        📝 Registrar Clase
                    </button>
                    <button onclick="showImportPayrollModal()" class="btn" style="background: #f59e0b; color: white; padding: 0.75rem 1.5rem;">
                        📥 Importar Histórico
                    </button>
                </div>
            </div>

            ${teachers.length === 0 ? `
                <div style="text-align: center; padding: 3rem; color: #9ca3af;">
                    <p style="font-size: 1.125rem; margin: 0;">No hay profesores registrados</p>
                    <p style="margin: 0.5rem 0 0 0;">Agrega tu primer profesor para comenzar</p>
                </div>
            ` : `
                <div style="display: grid; gap: 1rem;">
                    ${teachers.map(teacher => {
                        const payroll = monthlyPayroll.teachers?.[teacher.id] || {
                            hours: {cb: 0, coats: 0, nazaret: 0},
                            rates: {},
                            subtotal: 0,
                            advances: [],
                            total: 0
                        };

                        totalPayroll += payroll.total || 0;

                        return renderTeacherCard(teacher, payroll, year, month);
                    }).join('')}
                </div>

                <!-- Summary -->
                <div style="margin-top: 2rem; padding: 1.5rem; background: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; font-size: 1.125rem;">TOTAL NÓMINA PROFESORES:</span>
                        <span style="font-size: 1.5rem; font-weight: bold; color: #3b82f6;">
                            ${formatCurrency(totalPayroll)}
                        </span>
                    </div>
                </div>
            `}
        </div>
    `;

    document.getElementById('payrollTabContent').innerHTML = content;
}

function renderTeacherCard(teacher, payroll, year, month) {
    // Ensure hours object exists with defaults
    const hours = payroll.hours || {cb: 0, coats: 0, nazaret: 0};
    const totalHours = (hours.cb || 0) + (hours.coats || 0) + (hours.nazaret || 0);
    const totalAdvances = (payroll.advances || []).reduce((sum, adv) => sum + adv.amount, 0);

    return `
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                    <h4 style="margin: 0 0 0.5rem 0; font-size: 1.125rem;">${teacher.personalInfo.name}</h4>
                    <div style="font-size: 0.875rem; color: #6b7280;">
                        ${teacher.personalInfo.cedula ? `CC: ${teacher.personalInfo.cedula} • ` : ''}
                        ${teacher.personalInfo.email || ''}
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="showRegisterAdvanceModal('${teacher.id}', 'teachers', '${teacher.personalInfo.name}')"
                            class="btn" style="background: #f59e0b; color: white; padding: 0.5rem 1rem; font-size: 0.875rem;">
                        💰 Adelanto
                    </button>
                    <button onclick="generatePaymentReceipt('${teacher.id}', 'teacher', ${year}, ${month})"
                            class="btn" style="background: #10b981; color: white; padding: 0.5rem 1rem; font-size: 0.875rem;">
                        📄 Comprobante
                    </button>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1rem;">
                <div style="text-align: center; padding: 1rem; background: #eff6ff; border-radius: 6px;">
                    <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem;">CB</div>
                    <div style="font-weight: bold; color: #3b82f6;">${hours.cb || 0}h</div>
                    <div style="font-size: 0.75rem; color: #6b7280;">${formatCurrency((hours.cb || 0) * (teacher.rates?.cb || 0))}</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: #fef3c7; border-radius: 6px;">
                    <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem;">COATS</div>
                    <div style="font-weight: bold; color: #f59e0b;">${hours.coats || 0}h</div>
                    <div style="font-size: 0.75rem; color: #6b7280;">${formatCurrency((hours.coats || 0) * (teacher.rates?.coats || 0))}</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: #f0fdf4; border-radius: 6px;">
                    <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem;">Nazaret</div>
                    <div style="font-weight: bold; color: #10b981;">${hours.nazaret || 0}h</div>
                    <div style="font-size: 0.75rem; color: #6b7280;">${formatCurrency((hours.nazaret || 0) * (teacher.rates?.nazaret || 0))}</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: #f3f4f6; border-radius: 6px;">
                    <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem;">Total Horas</div>
                    <div style="font-weight: bold; font-size: 1.25rem;">${totalHours}h</div>
                </div>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="color: #6b7280;">Subtotal Devengado:</span>
                    <span style="font-weight: 600;">${formatCurrency(payroll.subtotal || 0)}</span>
                </div>
                ${totalAdvances > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: #ef4444;">
                        <span>Adelantos (${(payroll.advances || []).length}):</span>
                        <span style="font-weight: 600;">-${formatCurrency(totalAdvances)}</span>
                    </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding-top: 0.5rem; border-top: 2px solid #e5e7eb;">
                    <span style="font-weight: 700; font-size: 1.125rem;">TOTAL A PAGAR:</span>
                    <span style="font-weight: 700; font-size: 1.25rem; color: #10b981;">
                        ${formatCurrency(payroll.total || 0)}
                    </span>
                </div>
            </div>
        </div>
    `;
}

// Render administrative tab
async function renderAdministrativeTab() {
    const year = parseInt(document.getElementById('payrollYear').value);
    const month = parseInt(document.getElementById('payrollMonth').value);

    const administrative = Array.from(window.PayrollManager.administrative.values());
    const monthlyPayroll = await window.PayrollManager.getMonthlyPayroll(year, month);

    let totalPayroll = 0;

    const content = `
        <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0;">👔 Personal Administrativo</h3>
                <button onclick="showAddAdministrativeModal()" class="btn" style="background: #10b981; color: white; padding: 0.75rem 1.5rem;">
                    ➕ Nuevo Empleado
                </button>
            </div>

            ${administrative.length === 0 ? `
                <div style="text-align: center; padding: 3rem; color: #9ca3af;">
                    <p style="font-size: 1.125rem; margin: 0;">No hay empleados administrativos registrados</p>
                    <p style="margin: 0.5rem 0 0 0;">Agrega tu primer empleado administrativo</p>
                </div>
            ` : `
                <div style="display: grid; gap: 1rem;">
                    ${administrative.map(emp => {
                        const payroll = monthlyPayroll.administrative?.[emp.id] || {
                            subtotal: emp.salary.amount,
                            advances: [],
                            total: emp.salary.amount
                        };

                        totalPayroll += payroll.total || 0;

                        return renderAdministrativeCard(emp, payroll, year, month);
                    }).join('')}
                </div>

                <!-- Summary -->
                <div style="margin-top: 2rem; padding: 1.5rem; background: #f9fafb; border-radius: 8px; border-left: 4px solid #8b5cf6;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; font-size: 1.125rem;">TOTAL NÓMINA ADMINISTRATIVA:</span>
                        <span style="font-size: 1.5rem; font-weight: bold; color: #8b5cf6;">
                            ${formatCurrency(totalPayroll)}
                        </span>
                    </div>
                </div>
            `}
        </div>
    `;

    document.getElementById('payrollTabContent').innerHTML = content;
}

function renderAdministrativeCard(employee, payroll, year, month) {
    const totalAdvances = (payroll.advances || []).reduce((sum, adv) => sum + adv.amount, 0);

    return `
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                    <h4 style="margin: 0 0 0.5rem 0; font-size: 1.125rem;">${employee.personalInfo.name}</h4>
                    <div style="font-size: 0.875rem; color: #6b7280;">
                        ${employee.personalInfo.position} •
                        ${employee.salary.frequency === 'quincenal' ? 'Pago Quincenal' : 'Pago Mensual'}
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="showRegisterAdvanceModal('${employee.id}', 'administrative', '${employee.personalInfo.name}')"
                            class="btn" style="background: #f59e0b; color: white; padding: 0.5rem 1rem; font-size: 0.875rem;">
                        💰 Adelanto
                    </button>
                    <button onclick="generatePaymentReceipt('${employee.id}', 'administrative', ${year}, ${month})"
                            class="btn" style="background: #10b981; color: white; padding: 0.5rem 1rem; font-size: 0.875rem;">
                        📄 Comprobante
                    </button>
                </div>
            </div>

            <div style="background: #f9fafb; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <div>
                        <div style="font-size: 0.75rem; color: #6b7280;">Salario Base</div>
                        <div style="font-weight: 600; font-size: 1.125rem; color: #8b5cf6;">
                            ${formatCurrency(employee.salary.amount)}
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: #6b7280;">Frecuencia</div>
                        <div style="font-weight: 600;">
                            ${employee.salary.frequency === 'quincenal' ? 'Quincenal' : 'Mensual'}
                        </div>
                    </div>
                </div>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="color: #6b7280;">Subtotal:</span>
                    <span style="font-weight: 600;">${formatCurrency(payroll.subtotal || employee.salary.amount)}</span>
                </div>
                ${totalAdvances > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: #ef4444;">
                        <span>Adelantos (${(payroll.advances || []).length}):</span>
                        <span style="font-weight: 600;">-${formatCurrency(totalAdvances)}</span>
                    </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding-top: 0.5rem; border-top: 2px solid #e5e7eb;">
                    <span style="font-weight: 700; font-size: 1.125rem;">TOTAL A PAGAR:</span>
                    <span style="font-weight: 700; font-size: 1.25rem; color: #10b981;">
                        ${formatCurrency(payroll.total || employee.salary.amount)}
                    </span>
                </div>
            </div>
        </div>
    `;
}

// Render operational expenses tab (admin only)
async function renderOperationalTab() {
    const userRole = window.userRole || 'vendedor';
    const isAdmin = userRole === 'admin' || userRole === 'director';

    if (!isAdmin) {
        document.getElementById('payrollTabContent').innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #ef4444;">
                <p style="font-size: 1.125rem; margin: 0;">❌ Solo administradores pueden acceder</p>
                <p style="margin: 0.5rem 0 0 0;">Esta sección es solo para admin y directores</p>
            </div>
        `;
        return;
    }

    const year = parseInt(document.getElementById('payrollYear').value);
    const month = parseInt(document.getElementById('payrollMonth').value);

    const expenses = await window.PayrollManager.getOperationalExpenses(year, month);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const content = `
        <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0;">🏢 Gastos Operativos</h3>
                <button onclick="showAddOperationalExpenseModal()" class="btn" style="background: #ef4444; color: white; padding: 0.75rem 1.5rem;">
                    ➕ Registrar Gasto
                </button>
            </div>

            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem;">
                <p style="margin: 0; color: #991b1b; font-size: 0.875rem;">
                    ⚠️ <strong>Nota:</strong> Los gastos operativos NO se suman a los gastos diarios del módulo Finance.
                    Se usan exclusivamente para cálculos de balance mensual.
                </p>
            </div>

            ${expenses.length === 0 ? `
                <div style="text-align: center; padding: 3rem; color: #9ca3af;">
                    <p style="font-size: 1.125rem; margin: 0;">No hay gastos operativos registrados</p>
                    <p style="margin: 0.5rem 0 0 0;">Agrega gastos como renta, servicios, etc.</p>
                </div>
            ` : `
                <div style="display: grid; gap: 0.5rem; margin-bottom: 2rem;">
                    ${expenses.map(expense => `
                        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 1rem; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 600;">${expense.name}</div>
                                <div style="font-size: 0.875rem; color: #6b7280;">
                                    ${expense.category}
                                    ${expense.notes ? ` • ${expense.notes}` : ''}
                                </div>
                            </div>
                            <div style="font-weight: 700; font-size: 1.125rem; color: #ef4444;">
                                ${formatCurrency(expense.amount)}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Summary -->
                <div style="padding: 1.5rem; background: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; font-size: 1.125rem;">TOTAL GASTOS OPERATIVOS:</span>
                        <span style="font-size: 1.5rem; font-weight: bold; color: #ef4444;">
                            ${formatCurrency(totalExpenses)}
                        </span>
                    </div>
                </div>
            `}
        </div>
    `;

    document.getElementById('payrollTabContent').innerHTML = content;
}

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0);
}

// Reload payroll when month/year changes
window.loadPayrollForMonth = function() {
    const activeTab = document.querySelector('.payroll-tab.active');
    if (activeTab) {
        const tabName = activeTab.id.replace('tab', '').toLowerCase();
        window.switchPayrollTab(tabName);
    }
};

// ==================================================================================
// SECTION 3: MODAL FUNCTIONS
// ==================================================================================

// Show Add Teacher Modal
window.showAddTeacherModal = function() {
    const modalHTML = `
        <div id="teacherModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001; overflow-y: auto;">
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 700px; width: 90%; margin: 2rem;">
                <h2 style="margin: 0 0 1.5rem 0;">👩‍🏫 Nuevo Profesor</h2>

                <form id="teacherForm" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div style="grid-column: 1/-1;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Nombre Completo*</label>
                        <input type="text" id="tchName" required style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    </div>

                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Cédula</label>
                        <input type="text" id="tchCedula" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    </div>

                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Teléfono</label>
                        <input type="tel" id="tchPhone" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    </div>

                    <div style="grid-column: 1/-1;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Correo</label>
                        <input type="email" id="tchEmail" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    </div>

                    <div style="grid-column: 1/-1; background: #f9fafb; padding: 1rem; border-radius: 6px; margin-top: 1rem;">
                        <h3 style="margin: 0 0 1rem 0; font-size: 1rem;">Tarifas por Ubicación</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #3b82f6;">Tarifa CB</label>
                                <input type="number" id="tchRateCB" placeholder="17500" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #f59e0b;">Tarifa COATS</label>
                                <input type="number" id="tchRateCoats" placeholder="20000" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #10b981;">Tarifa Nazaret</label>
                                <input type="number" id="tchRateNazaret" placeholder="17500" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                            </div>
                        </div>
                    </div>

                    <div style="grid-column: 1/-1; background: #f9fafb; padding: 1rem; border-radius: 6px; margin-top: 1rem;">
                        <h3 style="margin: 0 0 1rem 0; font-size: 1rem;">Información Bancaria</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Banco</label>
                                <select id="tchBank" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                                    <option value="Nequi">Nequi</option>
                                    <option value="Bancolombia">Bancolombia</option>
                                    <option value="Davivienda">Davivienda</option>
                                    <option value="Banco de Bogotá">Banco de Bogotá</option>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Número de Cuenta</label>
                                <input type="text" id="tchAccount" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Método de Pago</label>
                                <select id="tchPaymentMethod" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                                    <option value="Transferencia">Transferencia</option>
                                    <option value="Efectivo">Efectivo</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style="grid-column: 1/-1; display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                        <button type="button" onclick="closeTeacherModal()" class="btn" style="background: #6b7280; color: white; padding: 0.75rem 1.5rem;">
                            Cancelar
                        </button>
                        <button type="submit" class="btn" style="background: #10b981; color: white; padding: 0.75rem 1.5rem;">
                            Guardar Profesor
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('teacherForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveTeacher();
    };
};

window.closeTeacherModal = function() {
    const modal = document.getElementById('teacherModal');
    if (modal) modal.remove();
};

async function saveTeacher() {
    try {
        const teacherData = {
            name: document.getElementById('tchName').value,
            cedula: document.getElementById('tchCedula').value,
            email: document.getElementById('tchEmail').value,
            phone: document.getElementById('tchPhone').value,
            rateCB: document.getElementById('tchRateCB').value,
            rateCoats: document.getElementById('tchRateCoats').value,
            rateNazaret: document.getElementById('tchRateNazaret').value,
            account: document.getElementById('tchAccount').value,
            bank: document.getElementById('tchBank').value,
            paymentMethod: document.getElementById('tchPaymentMethod').value
        };

        await window.PayrollManager.saveTeacher(teacherData);

        alert('✅ Profesor guardado exitosamente');
        closeTeacherModal();
        renderTeachersTab();
    } catch (error) {
        console.error('Error saving teacher:', error);
        alert('❌ Error al guardar profesor');
    }
}

// Show Add Administrative Modal
window.showAddAdministrativeModal = function() {
    const modalHTML = `
        <div id="adminModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001;">
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 600px; width: 90%;">
                <h2 style="margin: 0 0 1.5rem 0;">👔 Nuevo Empleado Administrativo</h2>

                <form id="adminForm" style="display: grid; gap: 1rem;">
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Nombre Completo*</label>
                        <input type="text" id="empName" required style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Cédula</label>
                            <input type="text" id="empCedula" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Teléfono</label>
                            <input type="tel" id="empPhone" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                        </div>
                    </div>

                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Correo</label>
                        <input type="email" id="empEmail" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    </div>

                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Cargo/Posición*</label>
                        <input type="text" id="empPosition" required placeholder="Ej: Secretaria, Contador, etc." style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Salario*</label>
                            <input type="number" id="empSalary" required placeholder="1000000" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Frecuencia*</label>
                            <select id="empFrequency" required style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                                <option value="quincenal">Quincenal</option>
                                <option value="mensual">Mensual</option>
                            </select>
                        </div>
                    </div>

                    <div style="background: #f9fafb; padding: 1rem; border-radius: 6px;">
                        <h3 style="margin: 0 0 1rem 0; font-size: 1rem;">Información Bancaria</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Banco</label>
                                <select id="empBank" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                                    <option value="Nequi">Nequi</option>
                                    <option value="Bancolombia">Bancolombia</option>
                                    <option value="Davivienda">Davivienda</option>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Cuenta</label>
                                <input type="text" id="empAccount" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Método</label>
                                <select id="empPaymentMethod" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                                    <option value="Transferencia">Transferencia</option>
                                    <option value="Efectivo">Efectivo</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                        <button type="button" onclick="closeAdminModal()" class="btn" style="background: #6b7280; color: white; padding: 0.75rem 1.5rem;">
                            Cancelar
                        </button>
                        <button type="submit" class="btn" style="background: #8b5cf6; color: white; padding: 0.75rem 1.5rem;">
                            Guardar Empleado
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('adminForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveAdministrative();
    };
};

window.closeAdminModal = function() {
    const modal = document.getElementById('adminModal');
    if (modal) modal.remove();
};

async function saveAdministrative() {
    try {
        const employeeData = {
            name: document.getElementById('empName').value,
            cedula: document.getElementById('empCedula').value,
            email: document.getElementById('empEmail').value,
            phone: document.getElementById('empPhone').value,
            position: document.getElementById('empPosition').value,
            salary: document.getElementById('empSalary').value,
            frequency: document.getElementById('empFrequency').value,
            account: document.getElementById('empAccount').value,
            bank: document.getElementById('empBank').value,
            paymentMethod: document.getElementById('empPaymentMethod').value
        };

        await window.PayrollManager.saveAdministrative(employeeData);

        alert('✅ Empleado guardado exitosamente');
        closeAdminModal();
        renderAdministrativeTab();
    } catch (error) {
        console.error('Error saving employee:', error);
        alert('❌ Error al guardar empleado');
    }
}

// Show Register Class Modal
window.showRegisterClassModal = function() {
    const teachers = Array.from(window.PayrollManager.teachers.values());

    if (teachers.length === 0) {
        alert('⚠️ Primero debes agregar profesores');
        return;
    }

    const today = window.getTodayInColombia ? window.getTodayInColombia() : new Date().toISOString().split('T')[0];

    const modalHTML = `
        <div id="classModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001;">
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%;">
                <h2 style="margin: 0 0 1.5rem 0;">📝 Registrar Clase</h2>

                <form id="classForm" style="display: grid; gap: 1rem;">
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Profesor*</label>
                        <select id="clsTeacher" required onchange="updateClassRate()" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                            <option value="">Seleccionar...</option>
                            ${teachers.map(t => `
                                <option value="${t.id}"
                                        data-cb="${t.rates.cb}"
                                        data-coats="${t.rates.coats}"
                                        data-nazaret="${t.rates.nazaret}">
                                    ${t.personalInfo.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Fecha*</label>
                            <input type="date" id="clsDate" value="${today}" required style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Horas*</label>
                            <input type="number" id="clsHours" required step="0.5" min="0.5" placeholder="2" onchange="calculateClassSubtotal()" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                        </div>
                    </div>

                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Ubicación*</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem;">
                            <label style="padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 6px; cursor: pointer; text-align: center; transition: all 0.2s;">
                                <input type="radio" name="location" value="cb" required onchange="updateClassRate()" style="margin-right: 0.5rem;">
                                CB
                            </label>
                            <label style="padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 6px; cursor: pointer; text-align: center; transition: all 0.2s;">
                                <input type="radio" name="location" value="coats" required onchange="updateClassRate()" style="margin-right: 0.5rem;">
                                COATS
                            </label>
                            <label style="padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 6px; cursor: pointer; text-align: center; transition: all 0.2s;">
                                <input type="radio" name="location" value="nazaret" required onchange="updateClassRate()" style="margin-right: 0.5rem;">
                                Nazaret
                            </label>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Tarifa</label>
                            <input type="number" id="clsRate" readonly style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; background: #f9fafb;">
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Subtotal</label>
                            <input type="text" id="clsSubtotal" readonly style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; background: #f9fafb; font-weight: 700; color: #10b981;">
                        </div>
                    </div>

                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Notas (opcional)</label>
                        <textarea id="clsNotes" rows="2" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;"></textarea>
                    </div>

                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                        <button type="button" onclick="closeClassModal()" class="btn" style="background: #6b7280; color: white; padding: 0.75rem 1.5rem;">
                            Cancelar
                        </button>
                        <button type="submit" class="btn" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem;">
                            Registrar Clase
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('classForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveClass();
    };
};

window.updateClassRate = function() {
    const teacherSelect = document.getElementById('clsTeacher');
    const selectedOption = teacherSelect.options[teacherSelect.selectedIndex];
    const location = document.querySelector('input[name="location"]:checked')?.value;

    if (selectedOption && location) {
        const rate = selectedOption.getAttribute(`data-${location}`);
        document.getElementById('clsRate').value = rate || 0;
        calculateClassSubtotal();
    }
};

window.calculateClassSubtotal = function() {
    const hours = parseFloat(document.getElementById('clsHours').value) || 0;
    const rate = parseFloat(document.getElementById('clsRate').value) || 0;
    const subtotal = hours * rate;
    document.getElementById('clsSubtotal').value = formatCurrency(subtotal);
};

window.closeClassModal = function() {
    const modal = document.getElementById('classModal');
    if (modal) modal.remove();
};

async function saveClass() {
    try {
        const teacherId = document.getElementById('clsTeacher').value;
        const date = document.getElementById('clsDate').value;
        const hours = document.getElementById('clsHours').value;
        const location = document.querySelector('input[name="location"]:checked').value;
        const rate = document.getElementById('clsRate').value;
        const notes = document.getElementById('clsNotes').value;

        const classData = {
            teacherId,
            date,
            hours,
            location,
            rate,
            notes
        };

        await window.PayrollManager.registerClass(classData);

        alert('✅ Clase registrada exitosamente');
        closeClassModal();
        renderTeachersTab();
    } catch (error) {
        console.error('Error saving class:', error);
        alert('❌ Error al registrar clase');
    }
}

// ============================================================================
// SHOW REGISTER ADVANCE MODAL
// ============================================================================

window.showRegisterAdvanceModal = function(personId, personType, personName) {
    const today = window.getTodayInColombia ? window.getTodayInColombia() : new Date().toISOString().split('T')[0];

    const modalHTML = `
        <div id="advanceModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001;">
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%;">
                <h2 style="margin: 0 0 1.5rem 0;">💰 Registrar Adelanto</h2>
                <p style="margin: 0 0 1.5rem 0; color: #666;">
                    <strong>${personName}</strong>
                </p>

                <form id="advanceForm" style="display: grid; gap: 1rem;">
                    <!-- Date -->
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                            📅 Fecha
                        </label>
                        <input type="date" id="advanceDate" value="${today}" required
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;">
                    </div>

                    <!-- Amount -->
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                            💵 Monto
                        </label>
                        <input type="number" id="advanceAmount" min="0" step="1000" required
                            placeholder="Ej: 200000"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;">
                    </div>

                    <!-- Payment Method -->
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                            💳 Método de Pago
                        </label>
                        <select id="advanceMethod" required
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;">
                            <option value="">Seleccionar...</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="nequi">Nequi</option>
                        </select>
                    </div>

                    <!-- Notes -->
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                            📝 Notas (Opcional)
                        </label>
                        <textarea id="advanceNotes" rows="3"
                            placeholder="Notas adicionales..."
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; resize: vertical;"></textarea>
                    </div>

                    <!-- Buttons -->
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button type="button" onclick="closeAdvanceModal()"
                            style="flex: 1; padding: 0.75rem; background: #f5f5f5; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;">
                            Cancelar
                        </button>
                        <button type="submit"
                            style="flex: 1; padding: 0.75rem; background: #10b981; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 500;">
                            💾 Registrar Adelanto
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Form submit
    document.getElementById('advanceForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveAdvance(personId, personType);
    });
};

window.closeAdvanceModal = function() {
    const modal = document.getElementById('advanceModal');
    if (modal) modal.remove();
};

async function saveAdvance(personId, personType) {
    try {
        const date = document.getElementById('advanceDate').value;
        const amount = parseFloat(document.getElementById('advanceAmount').value);
        const method = document.getElementById('advanceMethod').value;
        const notes = document.getElementById('advanceNotes').value.trim();

        if (!date || !amount || !method) {
            alert('⚠️ Por favor completa todos los campos obligatorios');
            return;
        }

        const advanceData = {
            personId,
            personType, // 'teacher' or 'administrative'
            date,
            amount,
            method,
            notes,
            timestamp: Date.now()
        };

        await window.PayrollManager.registerAdvance(advanceData);

        closeAdvanceModal();

        // Refresh appropriate tab
        if (personType === 'teacher') {
            await renderTeachersTab();
        } else {
            await renderAdministrativeTab();
        }

        alert('✅ Adelanto registrado exitosamente');
    } catch (error) {
        console.error('Error saving advance:', error);
        alert('❌ Error al registrar adelanto');
    }
}

// ============================================================================
// SHOW ADD OPERATIONAL EXPENSE MODAL
// ============================================================================

window.showAddOperationalExpenseModal = function() {
    const today = window.getTodayInColombia ? window.getTodayInColombia() : new Date().toISOString().split('T')[0];

    const modalHTML = `
        <div id="operationalModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001;">
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%;">
                <h2 style="margin: 0 0 1.5rem 0;">🏢 Agregar Gasto Operativo</h2>

                <form id="operationalForm" style="display: grid; gap: 1rem;">
                    <!-- Category -->
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                            📂 Categoría
                        </label>
                        <select id="opCategory" required onchange="toggleOtherCategory()"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;">
                            <option value="">Seleccionar...</option>
                            <option value="renta_local">Renta Local</option>
                            <option value="renta_apto">Renta Apto</option>
                            <option value="energia">Energía Piso1 y Piso2</option>
                            <option value="agua">Agua Piso1 y Piso2</option>
                            <option value="unifianza">Unifianza</option>
                            <option value="servicios_google">Servicios de Google (E-mails)</option>
                            <option value="papeleria">Papelería</option>
                            <option value="impresora">Impresora</option>
                            <option value="abogados">Avanzar Abogados</option>
                            <option value="otro">Otro...</option>
                        </select>
                    </div>

                    <!-- Other category (hidden by default) -->
                    <div id="otherCategoryDiv" style="display: none;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                            Especificar Categoría
                        </label>
                        <input type="text" id="opCategoryOther"
                            placeholder="Nombre del gasto"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;">
                    </div>

                    <!-- Date -->
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                            📅 Fecha
                        </label>
                        <input type="date" id="opDate" value="${today}" required
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;">
                    </div>

                    <!-- Amount -->
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                            💵 Monto
                        </label>
                        <input type="number" id="opAmount" min="0" step="1000" required
                            placeholder="Ej: 1500000"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;">
                    </div>

                    <!-- Payment Method -->
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                            💳 Método de Pago
                        </label>
                        <select id="opMethod" required
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;">
                            <option value="">Seleccionar...</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia</option>
                        </select>
                    </div>

                    <!-- Notes -->
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                            📝 Notas (Opcional)
                        </label>
                        <textarea id="opNotes" rows="3"
                            placeholder="Notas adicionales..."
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; resize: vertical;"></textarea>
                    </div>

                    <!-- Buttons -->
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button type="button" onclick="closeOperationalModal()"
                            style="flex: 1; padding: 0.75rem; background: #f5f5f5; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;">
                            Cancelar
                        </button>
                        <button type="submit"
                            style="flex: 1; padding: 0.75rem; background: #10b981; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 500;">
                            💾 Guardar Gasto
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Form submit
    document.getElementById('operationalForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveOperationalExpense();
    });
};

window.toggleOtherCategory = function() {
    const category = document.getElementById('opCategory').value;
    const otherDiv = document.getElementById('otherCategoryDiv');
    const otherInput = document.getElementById('opCategoryOther');

    if (category === 'otro') {
        otherDiv.style.display = 'block';
        otherInput.required = true;
    } else {
        otherDiv.style.display = 'none';
        otherInput.required = false;
        otherInput.value = '';
    }
};

window.closeOperationalModal = function() {
    const modal = document.getElementById('operationalModal');
    if (modal) modal.remove();
};

async function saveOperationalExpense() {
    try {
        let category = document.getElementById('opCategory').value;
        const date = document.getElementById('opDate').value;
        const amount = parseFloat(document.getElementById('opAmount').value);
        const method = document.getElementById('opMethod').value;
        const notes = document.getElementById('opNotes').value.trim();

        if (!category || !date || !amount || !method) {
            alert('⚠️ Por favor completa todos los campos obligatorios');
            return;
        }

        // If "otro", use custom category
        if (category === 'otro') {
            const customCategory = document.getElementById('opCategoryOther').value.trim();
            if (!customCategory) {
                alert('⚠️ Por favor especifica el nombre del gasto');
                return;
            }
            category = customCategory;
        }

        const expenseData = {
            category,
            date,
            amount,
            method,
            notes,
            timestamp: Date.now()
        };

        await window.PayrollManager.saveOperationalExpense(expenseData);

        closeOperationalModal();
        await renderOperationalTab();

        alert('✅ Gasto operativo registrado exitosamente');
    } catch (error) {
        console.error('Error saving operational expense:', error);
        alert('❌ Error al guardar gasto operativo');
    }
}

// ============================================================================
// GENERATE PAYMENT RECEIPT
// ============================================================================

window.generatePaymentReceipt = function(personData, personType, month, year) {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const monthName = monthNames[month - 1];
    const currentDate = new Date().toLocaleDateString('es-CO');

    let detailsHTML = '';
    let totalAmount = 0;

    if (personType === 'teacher') {
        // Teacher receipt with hours breakdown
        const classes = personData.classes || [];
        const advances = personData.advances || [];

        let cbHours = 0, coatsHours = 0, nazaretHours = 0;
        let cbSubtotal = 0, coatsSubtotal = 0, nazaretSubtotal = 0;

        classes.forEach(cls => {
            if (cls.location === 'cb') {
                cbHours += cls.hours;
                cbSubtotal += cls.subtotal;
            } else if (cls.location === 'coats') {
                coatsHours += cls.hours;
                coatsSubtotal += cls.subtotal;
            } else if (cls.location === 'nazaret') {
                nazaretHours += cls.hours;
                nazaretSubtotal += cls.subtotal;
            }
        });

        const grossTotal = cbSubtotal + coatsSubtotal + nazaretSubtotal;
        const advancesTotal = advances.reduce((sum, adv) => sum + adv.amount, 0);
        totalAmount = grossTotal - advancesTotal;

        detailsHTML = `
            <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
                <thead>
                    <tr style="background: #f5f5f5;">
                        <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Ubicación</th>
                        <th style="padding: 0.75rem; text-align: center; border: 1px solid #ddd;">Horas</th>
                        <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">Tarifa/Hora</th>
                        <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${cbHours > 0 ? `
                        <tr>
                            <td style="padding: 0.75rem; border: 1px solid #ddd;">CB - Academia</td>
                            <td style="padding: 0.75rem; text-align: center; border: 1px solid #ddd;">${cbHours}</td>
                            <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">${formatCurrency(personData.rates?.cb || 0)}</td>
                            <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">${formatCurrency(cbSubtotal)}</td>
                        </tr>
                    ` : ''}
                    ${coatsHours > 0 ? `
                        <tr>
                            <td style="padding: 0.75rem; border: 1px solid #ddd;">COATS</td>
                            <td style="padding: 0.75rem; text-align: center; border: 1px solid #ddd;">${coatsHours}</td>
                            <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">${formatCurrency(personData.rates?.coats || 0)}</td>
                            <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">${formatCurrency(coatsSubtotal)}</td>
                        </tr>
                    ` : ''}
                    ${nazaretHours > 0 ? `
                        <tr>
                            <td style="padding: 0.75rem; border: 1px solid #ddd;">Nazaret</td>
                            <td style="padding: 0.75rem; text-align: center; border: 1px solid #ddd;">${nazaretHours}</td>
                            <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">${formatCurrency(personData.rates?.nazaret || 0)}</td>
                            <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">${formatCurrency(nazaretSubtotal)}</td>
                        </tr>
                    ` : ''}
                    <tr style="background: #f9f9f9; font-weight: 600;">
                        <td colspan="3" style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">Subtotal Bruto:</td>
                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">${formatCurrency(grossTotal)}</td>
                    </tr>
                    ${advancesTotal > 0 ? `
                        <tr style="color: #dc2626;">
                            <td colspan="3" style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">Adelantos:</td>
                            <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">-${formatCurrency(advancesTotal)}</td>
                        </tr>
                    ` : ''}
                    <tr style="background: #10b981; color: white; font-weight: 700; font-size: 1.1rem;">
                        <td colspan="3" style="padding: 1rem; text-align: right; border: 1px solid #059669;">TOTAL A PAGAR:</td>
                        <td style="padding: 1rem; text-align: right; border: 1px solid #059669;">${formatCurrency(totalAmount)}</td>
                    </tr>
                </tbody>
            </table>
        `;
    } else {
        // Administrative staff receipt
        const advances = personData.advances || [];
        const grossTotal = personData.salary || 0;
        const advancesTotal = advances.reduce((sum, adv) => sum + adv.amount, 0);
        totalAmount = grossTotal - advancesTotal;

        detailsHTML = `
            <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
                <tbody>
                    <tr style="background: #f9f9f9;">
                        <td style="padding: 0.75rem; border: 1px solid #ddd;"><strong>Cargo:</strong></td>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${personData.position || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.75rem; border: 1px solid #ddd;"><strong>Salario ${personData.frequency === 'quincenal' ? 'Quincenal' : 'Mensual'}:</strong></td>
                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">${formatCurrency(grossTotal)}</td>
                    </tr>
                    ${advancesTotal > 0 ? `
                        <tr style="color: #dc2626;">
                            <td style="padding: 0.75rem; border: 1px solid #ddd;"><strong>Adelantos:</strong></td>
                            <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">-${formatCurrency(advancesTotal)}</td>
                        </tr>
                    ` : ''}
                    <tr style="background: #10b981; color: white; font-weight: 700; font-size: 1.1rem;">
                        <td style="padding: 1rem; border: 1px solid #059669;"><strong>TOTAL A PAGAR:</strong></td>
                        <td style="padding: 1rem; text-align: right; border: 1px solid #059669;">${formatCurrency(totalAmount)}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    const receiptHTML = `
        <div id="paymentReceipt" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001; overflow-y: auto; padding: 2rem;">
            <div style="background: white; padding: 3rem; border-radius: 12px; max-width: 800px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                <!-- Header -->
                <div style="text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 1.5rem; margin-bottom: 2rem;">
                    <h1 style="margin: 0; color: #10b981; font-size: 2rem;">CIUDAD BILINGÜE</h1>
                    <p style="margin: 0.5rem 0 0 0; color: #666; font-size: 0.95rem;">Comprobante de Pago</p>
                </div>

                <!-- Period and Date -->
                <div style="display: flex; justify-content: space-between; margin-bottom: 2rem; padding: 1rem; background: #f9f9f9; border-radius: 8px;">
                    <div>
                        <strong>Período:</strong> ${monthName} ${year}
                    </div>
                    <div>
                        <strong>Fecha de Emisión:</strong> ${currentDate}
                    </div>
                </div>

                <!-- Person Info -->
                <div style="margin-bottom: 2rem;">
                    <h3 style="margin: 0 0 1rem 0; color: #333;">Datos del ${personType === 'teacher' ? 'Profesor' : 'Empleado'}</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="background: #f5f5f5;">
                            <td style="padding: 0.75rem; border: 1px solid #ddd; width: 30%;"><strong>Nombre:</strong></td>
                            <td style="padding: 0.75rem; border: 1px solid #ddd;">${personData.personalInfo?.name || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.75rem; border: 1px solid #ddd;"><strong>Cédula:</strong></td>
                            <td style="padding: 0.75rem; border: 1px solid #ddd;">${personData.personalInfo?.cedula || 'N/A'}</td>
                        </tr>
                        <tr style="background: #f5f5f5;">
                            <td style="padding: 0.75rem; border: 1px solid #ddd;"><strong>Email:</strong></td>
                            <td style="padding: 0.75rem; border: 1px solid #ddd;">${personData.personalInfo?.email || 'N/A'}</td>
                        </tr>
                    </table>
                </div>

                <!-- Details -->
                <div style="margin-bottom: 2rem;">
                    <h3 style="margin: 0 0 1rem 0; color: #333;">Detalle de Pago</h3>
                    ${detailsHTML}
                </div>

                <!-- Bank Info -->
                ${personData.bankInfo?.account ? `
                    <div style="margin-bottom: 2rem; padding: 1rem; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
                        <strong>💳 Información Bancaria:</strong><br>
                        <span style="color: #666;">
                            ${personData.bankInfo.bank || 'N/A'} -
                            Cuenta: ${personData.bankInfo.account} -
                            Método: ${personData.bankInfo.method || 'N/A'}
                        </span>
                    </div>
                ` : ''}

                <!-- Signature Section -->
                <div style="margin-top: 3rem; padding-top: 2rem; border-top: 2px solid #e5e7eb;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 3rem;">
                        <div style="text-align: center;">
                            <div style="border-top: 2px solid #333; padding-top: 0.5rem; margin-top: 4rem;">
                                <strong>Firma del ${personType === 'teacher' ? 'Profesor' : 'Empleado'}</strong><br>
                                <span style="color: #666; font-size: 0.9rem;">${personData.personalInfo?.name || ''}</span>
                            </div>
                        </div>
                        <div style="text-align: center;">
                            <div style="border-top: 2px solid #333; padding-top: 0.5rem; margin-top: 4rem;">
                                <strong>Firma Autorizada</strong><br>
                                <span style="color: #666; font-size: 0.9rem;">Ciudad Bilingüe</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Note -->
                <div style="margin-top: 2rem; padding: 1rem; background: #fef3c7; border-radius: 8px; text-align: center; font-size: 0.9rem; color: #92400e;">
                    ⚠️ Este documento es un comprobante de pago. Consérvelo para sus registros.
                </div>

                <!-- Buttons -->
                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button onclick="closePaymentReceipt()"
                        style="flex: 1; padding: 0.75rem; background: #f5f5f5; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;">
                        Cerrar
                    </button>
                    <button onclick="printPaymentReceipt()"
                        style="flex: 1; padding: 0.75rem; background: #10b981; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 500;">
                        🖨️ Imprimir / Guardar PDF
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', receiptHTML);
};

window.closePaymentReceipt = function() {
    const receipt = document.getElementById('paymentReceipt');
    if (receipt) receipt.remove();
};

window.printPaymentReceipt = function() {
    window.print();
};

// ============================================================================
// IMPORT PAYROLL DATA (Placeholder)
// ============================================================================

window.showImportPayrollModal = function() {
    alert('🚧 La función de importación de datos históricos se implementará en payroll-import.js\n\nEsta función permitirá importar los datos de Julio-Octubre desde archivos CSV.');
};

// Continue in next part...

console.log('✅ Payroll module loaded successfully');

// Global instance
window.PayrollManager = new PayrollManager();
