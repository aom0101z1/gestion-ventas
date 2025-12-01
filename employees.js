// employees.js - Employee Management System
// Manages employee records, integrates with tasks and payroll

console.log('👥 Loading Employee Management System...');

// ==================================================================================
// EMPLOYEE MANAGER CLASS
// ==================================================================================

class EmployeeManager {
    constructor() {
        this.employees = new Map();
        this.initialized = false;

        // Predefined departments
        this.departments = [
            'Administración',
            'Recepción',
            'Ventas',
            'Docencia',
            'Marketing',
            'Contabilidad',
            'Soporte',
            'Operaciones'
        ];

        // Predefined positions
        this.positions = [
            'Director',
            'Subdirector',
            'Coordinador',
            'Recepcionista',
            'Vendedor',
            'Profesor',
            'Asistente Administrativo',
            'Contador',
            'Auxiliar Contable',
            'Community Manager',
            'Desarrollador',
            'Otro'
        ];
    }

    // Initialize
    async init() {
        if (this.initialized) return;

        console.log('🚀 Initializing Employee Manager');
        await this.loadEmployees();
        this.initialized = true;
        console.log('✅ Employee Manager initialized');
    }

    // Load employees from Firebase
    async loadEmployees() {
        try {
            console.log('📂 Loading employees from Firebase...');

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'employees');
            const snapshot = await db.get(ref);

            if (snapshot.exists()) {
                const data = snapshot.val();
                console.log('✅ Employees data received:', Object.keys(data || {}).length, 'employees');

                this.employees.clear();
                Object.entries(data).forEach(([id, employee]) => {
                    this.employees.set(id, employee);
                });
            } else {
                console.log('⚠️ No employees exist in database');
            }

            console.log(`✅ Successfully loaded ${this.employees.size} employees`);

        } catch (error) {
            console.error('❌ Error loading employees:', error);
        }
    }

    // Create employee
    async createEmployee(employeeData) {
        try {
            const employeeId = 'emp' + Date.now();
            const now = new Date().toISOString();

            const employee = {
                id: employeeId,
                name: employeeData.name,
                email: employeeData.email.toLowerCase(),
                position: employeeData.position,
                department: employeeData.department,
                phone: employeeData.phone || '',
                hireDate: employeeData.hireDate || now.split('T')[0],
                status: employeeData.status || 'active',
                salary: parseFloat(employeeData.salary) || 0,
                photoURL: employeeData.photoURL || '',
                notes: employeeData.notes || '',
                createdAt: now,
                createdBy: window.FirebaseData.currentUser?.email || 'system',
                updatedAt: now
            };

            // Save to Firebase
            const db = window.firebaseModules.database;
            const empRef = db.ref(window.FirebaseData.database, `employees/${employeeId}`);
            await db.set(empRef, employee);

            // Add to local cache
            this.employees.set(employeeId, employee);

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Empleado creado',
                    'employee',
                    employeeId,
                    `${employee.name} - ${employee.position}`,
                    { after: employee }
                );
            }

            console.log('✅ Employee created:', employeeId);
            return employee;

        } catch (error) {
            console.error('❌ Error creating employee:', error);
            throw error;
        }
    }

    // Update employee
    async updateEmployee(employeeId, updates) {
        try {
            const employee = this.employees.get(employeeId);
            if (!employee) {
                throw new Error('Employee not found');
            }

            const now = new Date().toISOString();
            const updatedEmployee = {
                ...employee,
                ...updates,
                updatedAt: now,
                updatedBy: window.FirebaseData.currentUser?.email || 'system'
            };

            // Update in Firebase
            const db = window.firebaseModules.database;
            const empRef = db.ref(window.FirebaseData.database, `employees/${employeeId}`);
            await db.set(empRef, updatedEmployee);

            // Update local cache
            this.employees.set(employeeId, updatedEmployee);

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Empleado actualizado',
                    'employee',
                    employeeId,
                    `${updatedEmployee.name} - ${updatedEmployee.position}`,
                    { before: employee, after: updatedEmployee }
                );
            }

            console.log('✅ Employee updated:', employeeId);
            return updatedEmployee;

        } catch (error) {
            console.error('❌ Error updating employee:', error);
            throw error;
        }
    }

    // Delete employee (soft delete - mark as inactive)
    async deleteEmployee(employeeId) {
        try {
            const employee = this.employees.get(employeeId);
            if (!employee) {
                throw new Error('Employee not found');
            }

            // Soft delete - mark as inactive
            await this.updateEmployee(employeeId, { status: 'inactive' });

            console.log('✅ Employee deleted (marked inactive):', employeeId);

        } catch (error) {
            console.error('❌ Error deleting employee:', error);
            throw error;
        }
    }

    // Get active employees
    getActiveEmployees() {
        return Array.from(this.employees.values()).filter(emp => emp.status === 'active');
    }

    // Get employees by department
    getEmployeesByDepartment(department) {
        return Array.from(this.employees.values()).filter(emp =>
            emp.department === department && emp.status === 'active'
        );
    }

    // Get employee by email
    getEmployeeByEmail(email) {
        return Array.from(this.employees.values()).find(emp =>
            emp.email.toLowerCase() === email.toLowerCase()
        );
    }

    // Migrate from Firebase users
    async migrateFromFirebaseUsers() {
        try {
            console.log('🔄 Starting migration from Firebase users...');

            const db = window.firebaseModules.database;
            const usersRef = db.ref(window.FirebaseData.database, 'users');
            const snapshot = await db.get(usersRef);

            if (!snapshot.exists()) {
                console.log('⚠️ No users found to migrate');
                return;
            }

            const users = snapshot.val();
            const migrationResults = [];

            for (const [uid, userData] of Object.entries(users)) {
                const profile = userData.profile || {};
                const email = profile.email || '';

                // Skip if no email
                if (!email) continue;

                // Check if employee already exists
                const existingEmployee = this.getEmployeeByEmail(email);
                if (existingEmployee) {
                    console.log('⏭️ Skipping existing employee:', email);
                    migrationResults.push({ email, status: 'skipped', reason: 'already exists' });
                    continue;
                }

                // Create employee record
                const employeeData = {
                    name: profile.name || email.split('@')[0],
                    email: email,
                    position: this.mapRoleToPosition(profile.role),
                    department: this.mapRoleToDepartment(profile.role),
                    phone: profile.phone || '',
                    hireDate: profile.createdAt ? profile.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
                    status: 'active',
                    salary: 0, // To be filled in later
                    notes: `Migrated from Firebase users on ${new Date().toLocaleDateString('es-CO')}`
                };

                try {
                    await this.createEmployee(employeeData);
                    migrationResults.push({ email, status: 'migrated' });
                    console.log('✅ Migrated:', email);
                } catch (error) {
                    migrationResults.push({ email, status: 'error', error: error.message });
                    console.error('❌ Error migrating:', email, error);
                }
            }

            console.log('✅ Migration complete:', migrationResults);
            return migrationResults;

        } catch (error) {
            console.error('❌ Error during migration:', error);
            throw error;
        }
    }

    // Map Firebase role to position
    mapRoleToPosition(role) {
        const mapping = {
            'director': 'Director',
            'admin': 'Coordinador',
            'vendedor': 'Vendedor',
            'teacher': 'Profesor',
            'reception': 'Recepcionista'
        };
        return mapping[role] || 'Otro';
    }

    // Map Firebase role to department
    mapRoleToDepartment(role) {
        const mapping = {
            'director': 'Administración',
            'admin': 'Administración',
            'vendedor': 'Ventas',
            'teacher': 'Docencia',
            'reception': 'Recepción'
        };
        return mapping[role] || 'Operaciones';
    }

    // Get employee display name (for dropdowns)
    getEmployeeDisplayName(employee) {
        return `${employee.name} (${employee.position})`;
    }

    // Format employee for task assignment
    formatForTaskAssignment(employee) {
        return {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            position: employee.position,
            department: employee.department,
            displayName: this.getEmployeeDisplayName(employee)
        };
    }
}

// Create global instance
window.EmployeeManager = new EmployeeManager();

// ==================================================================================
// UI RENDERING FUNCTIONS
// ==================================================================================

// Main load function
window.loadEmployeesTab = async function() {
    console.log('👥 Loading Employees tab');

    // Try to find container inside schoolModuleView first (from floating panel)
    let container = document.querySelector('#schoolModuleView #employeesContainer');

    // If not found, try the main container
    if (!container) {
        container = document.getElementById('employeesContainer');
    }

    if (!container) {
        console.error('❌ employeesContainer not found!');
        return;
    }

    console.log('📦 Found container:', container);

    try {
        // Initialize if not already
        if (!window.EmployeeManager.initialized) {
            await window.EmployeeManager.init();
        }

        // Render view
        const html = await renderEmployeesView();
        console.log('📝 Generated HTML length:', html.length);
        container.innerHTML = html;
        console.log('✅ Employees tab loaded successfully');

    } catch (error) {
        console.error('❌ Error loading Employees tab:', error);
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #ef4444;">
                <p>❌ Error al cargar Empleados: ${error.message}</p>
                <button onclick="loadEmployeesTab()" class="btn btn-primary" style="margin-top: 1rem;">
                    Reintentar
                </button>
            </div>
        `;
    }
};

// Render employees view
async function renderEmployeesView() {
    const employees = Array.from(window.EmployeeManager.employees.values());
    const activeEmployees = employees.filter(e => e.status === 'active');
    const inactiveEmployees = employees.filter(e => e.status === 'inactive');

    // Group by department
    const byDepartment = {};
    activeEmployees.forEach(emp => {
        if (!byDepartment[emp.department]) {
            byDepartment[emp.department] = [];
        }
        byDepartment[emp.department].push(emp);
    });

    return `
        <div style="padding: 1.5rem;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.5rem; border-radius: 12px; color: white;">
                <div>
                    <h2 style="margin: 0 0 0.5rem 0; font-size: 1.75rem;">👥 Gestión de Empleados</h2>
                    <p style="margin: 0; opacity: 0.9; font-size: 0.9rem;">${activeEmployees.length} empleados activos</p>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button onclick="migrateEmployees()" class="btn" style="background: #f59e0b; color: white; font-weight: bold; padding: 0.75rem 1.5rem;">
                        🔄 Migrar Usuarios
                    </button>
                    <button onclick="openEmployeeModal()" class="btn" style="background: #10b981; color: white; font-weight: bold; padding: 0.75rem 1.5rem;">
                        ➕ Nuevo Empleado
                    </button>
                </div>
            </div>

            <!-- Stats Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                ${renderEmployeeStats(employees, byDepartment)}
            </div>

            <!-- Filters -->
            <div style="background: white; padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Departamento</label>
                        <select id="filterDepartment" onchange="filterEmployees()" style="width: 100%; padding: 0.5rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="all">Todos</option>
                            ${window.EmployeeManager.departments.map(dept =>
                                `<option value="${dept}">${dept}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Estado</label>
                        <select id="filterStatus" onchange="filterEmployees()" style="width: 100%; padding: 0.5rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="active">Activos</option>
                            <option value="inactive">Inactivos</option>
                            <option value="all">Todos</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Buscar</label>
                        <input type="text" id="searchEmployee" oninput="filterEmployees()" placeholder="Nombre, email, posición..." style="width: 100%; padding: 0.5rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                    </div>
                </div>
            </div>

            <!-- Employees Table -->
            <div id="employeesTableContainer">
                ${renderEmployeesTable(activeEmployees)}
            </div>
        </div>

        <!-- Employee Modal -->
        <div id="employeeModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center; overflow-y: auto;">
            <div style="background: white; border-radius: 12px; width: 90%; max-width: 600px; margin: 2rem auto; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                <div id="employeeModalContent"></div>
            </div>
        </div>
    `;
}

// Render employee stats
function renderEmployeeStats(allEmployees, byDepartment) {
    const active = allEmployees.filter(e => e.status === 'active').length;
    const departments = Object.keys(byDepartment).length;
    const totalSalary = allEmployees
        .filter(e => e.status === 'active')
        .reduce((sum, e) => sum + (e.salary || 0), 0);

    return `
        <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 1.25rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-size: 2rem; font-weight: bold; margin-bottom: 0.25rem;">${active}</div>
            <div style="font-size: 0.9rem; opacity: 0.95;">Empleados Activos</div>
        </div>

        <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 1.25rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-size: 2rem; font-weight: bold; margin-bottom: 0.25rem;">${departments}</div>
            <div style="font-size: 0.9rem; opacity: 0.95;">Departamentos</div>
        </div>

        <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 1.25rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.25rem;">$${totalSalary.toLocaleString('es-CO')}</div>
            <div style="font-size: 0.9rem; opacity: 0.95;">Nómina Total</div>
        </div>
    `;
}

// Render employees table
function renderEmployeesTable(employees) {
    if (employees.length === 0) {
        return `
            <div style="background: white; padding: 3rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
                <h3 style="color: #6b7280; margin: 0 0 0.5rem 0;">No hay empleados</h3>
                <p style="color: #9ca3af; margin: 0;">Agrega el primer empleado haciendo clic en "➕ Nuevo Empleado"</p>
            </div>
        `;
    }

    return `
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                    <tr>
                        <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151;">Empleado</th>
                        <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151;">Posición</th>
                        <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151;">Departamento</th>
                        <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151;">Contacto</th>
                        <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151;">Estado</th>
                        <th style="padding: 1rem; text-align: center; font-weight: 600; color: #374151;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${employees.map(emp => renderEmployeeRow(emp)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Render employee row
function renderEmployeeRow(employee) {
    const statusColor = employee.status === 'active' ? '#10b981' : '#6b7280';
    const statusText = employee.status === 'active' ? 'Activo' : 'Inactivo';

    return `
        <tr style="border-bottom: 1px solid #e5e7eb; transition: background 0.2s;"
            onmouseover="this.style.background='#f9fafb'"
            onmouseout="this.style.background='white'">
            <td style="padding: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    ${employee.photoURL ?
                        `<img src="${employee.photoURL}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` :
                        `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem;">
                            ${employee.name.charAt(0).toUpperCase()}
                        </div>`
                    }
                    <div>
                        <div style="font-weight: 600; color: #1f2937;">${employee.name}</div>
                        <div style="font-size: 0.85rem; color: #6b7280;">${employee.email}</div>
                    </div>
                </div>
            </td>
            <td style="padding: 1rem; color: #374151;">${employee.position}</td>
            <td style="padding: 1rem;">
                <span style="background: #e0e7ff; color: #3730a3; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 500;">
                    ${employee.department}
                </span>
            </td>
            <td style="padding: 1rem; color: #6b7280; font-size: 0.9rem;">
                ${employee.phone || 'N/A'}
            </td>
            <td style="padding: 1rem;">
                <span style="background: ${statusColor}20; color: ${statusColor}; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                    ${statusText}
                </span>
            </td>
            <td style="padding: 1rem; text-align: center;">
                <div style="display: flex; gap: 0.5rem; justify-content: center;">
                    <button onclick="viewEmployeeDetail('${employee.id}')" style="background: #3b82f6; color: white; border: none; padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;" title="Ver detalles">
                        👁️
                    </button>
                    <button onclick="editEmployee('${employee.id}')" style="background: #f59e0b; color: white; border: none; padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;" title="Editar">
                        ✏️
                    </button>
                    ${employee.status === 'active' ?
                        `<button onclick="deactivateEmployee('${employee.id}')" style="background: #ef4444; color: white; border: none; padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;" title="Desactivar">
                            🚫
                        </button>` :
                        `<button onclick="activateEmployee('${employee.id}')" style="background: #10b981; color: white; border: none; padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;" title="Activar">
                            ✅
                        </button>`
                    }
                </div>
            </td>
        </tr>
    `;
}

// Render employee form
function renderEmployeeForm(employee = null) {
    const isEdit = !!employee;

    return `
        <div style="padding: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; color: #1f2937;">${isEdit ? '✏️ Editar Empleado' : '➕ Nuevo Empleado'}</h3>
                <button onclick="closeEmployeeModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">×</button>
            </div>

            <form id="employeeForm" onsubmit="saveEmployee(event, ${isEdit ? `'${employee.id}'` : 'null'})">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div style="grid-column: 1 / -1;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Nombre Completo *</label>
                        <input type="text" id="empName" value="${employee?.name || ''}" placeholder="Ej: Juan Pérez" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;" required>
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Email *</label>
                        <input type="email" id="empEmail" value="${employee?.email || ''}" placeholder="email@example.com" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;" required>
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Teléfono</label>
                        <input type="tel" id="empPhone" value="${employee?.phone || ''}" placeholder="300 123 4567" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Posición *</label>
                        <select id="empPosition" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;" required>
                            <option value="">Seleccionar...</option>
                            ${window.EmployeeManager.positions.map(pos =>
                                `<option value="${pos}" ${employee?.position === pos ? 'selected' : ''}>${pos}</option>`
                            ).join('')}
                        </select>
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Departamento *</label>
                        <select id="empDepartment" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;" required>
                            <option value="">Seleccionar...</option>
                            ${window.EmployeeManager.departments.map(dept =>
                                `<option value="${dept}" ${employee?.department === dept ? 'selected' : ''}>${dept}</option>`
                            ).join('')}
                        </select>
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Fecha de Ingreso</label>
                        <input type="date" id="empHireDate" value="${employee?.hireDate || new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Salario Mensual</label>
                        <input type="number" id="empSalary" value="${employee?.salary || 0}" placeholder="0" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                        <small style="color: #6b7280; font-size: 0.85rem;">En pesos colombianos (COP)</small>
                    </div>

                    <div style="grid-column: 1 / -1;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">URL de Foto</label>
                        <input type="url" id="empPhotoURL" value="${employee?.photoURL || ''}" placeholder="https://..." style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                        <small style="color: #6b7280; font-size: 0.85rem;">Enlace a imagen de perfil (opcional)</small>
                    </div>

                    <div style="grid-column: 1 / -1;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Notas</label>
                        <textarea id="empNotes" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; height: 80px; resize: vertical;" placeholder="Notas adicionales sobre el empleado...">${employee?.notes || ''}</textarea>
                    </div>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb;">
                    <button type="button" onclick="closeEmployeeModal()" style="padding: 0.75rem 1.5rem; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Cancelar
                    </button>
                    <button type="submit" style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        💾 ${isEdit ? 'Actualizar' : 'Crear'} Empleado
                    </button>
                </div>
            </form>
        </div>
    `;
}

// ==================================================================================
// INTERACTION FUNCTIONS
// ==================================================================================

window.openEmployeeModal = function(employeeId = null) {
    const modal = document.getElementById('employeeModal');
    const content = document.getElementById('employeeModalContent');

    if (!modal || !content) return;

    const employee = employeeId ? window.EmployeeManager.employees.get(employeeId) : null;
    content.innerHTML = renderEmployeeForm(employee);
    modal.style.display = 'flex';
};

window.closeEmployeeModal = function() {
    const modal = document.getElementById('employeeModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.saveEmployee = async function(event, employeeId = null) {
    event.preventDefault();

    const employeeData = {
        name: document.getElementById('empName').value.trim(),
        email: document.getElementById('empEmail').value.trim(),
        phone: document.getElementById('empPhone').value.trim(),
        position: document.getElementById('empPosition').value,
        department: document.getElementById('empDepartment').value,
        hireDate: document.getElementById('empHireDate').value,
        salary: document.getElementById('empSalary').value,
        photoURL: document.getElementById('empPhotoURL').value.trim(),
        notes: document.getElementById('empNotes').value.trim()
    };

    if (!employeeData.name || !employeeData.email || !employeeData.position || !employeeData.department) {
        alert('⚠️ Por favor completa todos los campos obligatorios');
        return;
    }

    try {
        if (employeeId) {
            await window.EmployeeManager.updateEmployee(employeeId, employeeData);
            if (window.showNotification) {
                window.showNotification('✅ Empleado actualizado exitosamente', 'success');
            }
        } else {
            await window.EmployeeManager.createEmployee(employeeData);
            if (window.showNotification) {
                window.showNotification('✅ Empleado creado exitosamente', 'success');
            }
        }

        closeEmployeeModal();
        await loadEmployeesTab();

    } catch (error) {
        console.error('❌ Error saving employee:', error);
        alert('❌ Error al guardar empleado: ' + error.message);
    }
};

window.editEmployee = function(employeeId) {
    openEmployeeModal(employeeId);
};

window.deactivateEmployee = async function(employeeId) {
    const employee = window.EmployeeManager.employees.get(employeeId);
    if (!employee) return;

    if (!confirm(`¿Desactivar a ${employee.name}?\n\nEl empleado será marcado como inactivo pero sus datos se conservarán.`)) {
        return;
    }

    try {
        await window.EmployeeManager.deleteEmployee(employeeId);
        await loadEmployeesTab();

        if (window.showNotification) {
            window.showNotification('✅ Empleado desactivado', 'info');
        }
    } catch (error) {
        console.error('❌ Error deactivating employee:', error);
        alert('❌ Error al desactivar empleado');
    }
};

window.activateEmployee = async function(employeeId) {
    try {
        await window.EmployeeManager.updateEmployee(employeeId, { status: 'active' });
        await loadEmployeesTab();

        if (window.showNotification) {
            window.showNotification('✅ Empleado activado', 'success');
        }
    } catch (error) {
        console.error('❌ Error activating employee:', error);
        alert('❌ Error al activar empleado');
    }
};

window.viewEmployeeDetail = function(employeeId) {
    const employee = window.EmployeeManager.employees.get(employeeId);
    if (!employee) return;

    alert(`
📋 Detalles del Empleado

Nombre: ${employee.name}
Email: ${employee.email}
Posición: ${employee.position}
Departamento: ${employee.department}
Teléfono: ${employee.phone || 'N/A'}
Fecha de Ingreso: ${new Date(employee.hireDate).toLocaleDateString('es-CO')}
Salario: $${(employee.salary || 0).toLocaleString('es-CO')}
Estado: ${employee.status === 'active' ? 'Activo' : 'Inactivo'}
Creado: ${new Date(employee.createdAt).toLocaleDateString('es-CO')}

${employee.notes ? 'Notas:\n' + employee.notes : 'Sin notas adicionales'}
    `);
};

window.filterEmployees = function() {
    const departmentFilter = document.getElementById('filterDepartment')?.value || 'all';
    const statusFilter = document.getElementById('filterStatus')?.value || 'active';
    const searchQuery = document.getElementById('searchEmployee')?.value?.toLowerCase() || '';

    let filtered = Array.from(window.EmployeeManager.employees.values());

    // Filter by department
    if (departmentFilter !== 'all') {
        filtered = filtered.filter(emp => emp.department === departmentFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
        filtered = filtered.filter(emp => emp.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery) {
        filtered = filtered.filter(emp =>
            emp.name.toLowerCase().includes(searchQuery) ||
            emp.email.toLowerCase().includes(searchQuery) ||
            emp.position.toLowerCase().includes(searchQuery) ||
            emp.department.toLowerCase().includes(searchQuery)
        );
    }

    const container = document.getElementById('employeesTableContainer');
    if (container) {
        container.innerHTML = renderEmployeesTable(filtered);
    }
};

window.migrateEmployees = async function() {
    if (!confirm('¿Migrar usuarios de Firebase a empleados?\n\nEsto creará registros de empleados para todos los usuarios que aún no tengan uno.')) {
        return;
    }

    try {
        const results = await window.EmployeeManager.migrateFromFirebaseUsers();

        let message = '📊 Resultados de la Migración:\n\n';
        const migrated = results.filter(r => r.status === 'migrated').length;
        const skipped = results.filter(r => r.status === 'skipped').length;
        const errors = results.filter(r => r.status === 'error').length;

        message += `✅ Migrados: ${migrated}\n`;
        message += `⏭️ Omitidos (ya existían): ${skipped}\n`;
        message += `❌ Errores: ${errors}\n`;

        alert(message);

        await loadEmployeesTab();

    } catch (error) {
        console.error('❌ Error during migration:', error);
        alert('❌ Error en la migración: ' + error.message);
    }
};

// ==================================================================================
// QUICK ADD FUNCTION (for Admin Center or Tasks)
// ==================================================================================

window.quickAddEmployee = async function(employeeData) {
    try {
        // Initialize if needed
        if (!window.EmployeeManager.initialized) {
            await window.EmployeeManager.init();
        }

        const employee = await window.EmployeeManager.createEmployee(employeeData);
        return employee;
    } catch (error) {
        console.error('❌ Error in quickAddEmployee:', error);
        throw error;
    }
};

// ==================================================================================
// INITIALIZATION
// ==================================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('👥 Employees module DOM ready');
});

console.log('✅ Employee Management System loaded successfully!');
