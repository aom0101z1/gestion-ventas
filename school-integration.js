// school-integration-fixed.js - Fixed version for your CRM
console.log('🏫 Loading school integration...');

// Wait for DOM and existing CRM to be ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addSchoolTabs, 3000); // Wait 3 seconds for your CRM to load
});

function addSchoolTabs() {
    console.log('➕ Adding school tabs to navigation');
    
    // Try multiple selectors to find the navigation
    let tabNav = document.querySelector('.tab-nav');
    
    // If not found, look for the actual tab container in your page
    if (!tabNav) {
        // Look for the area with existing tabs (Contactos, Leads, Pipeline, etc.)
        const existingTabs = document.querySelector('[onclick*="switchTab"]')?.parentElement;
        if (existingTabs) {
            tabNav = existingTabs;
        } else {
            // Try to find by the tab buttons
            const contactsTab = Array.from(document.querySelectorAll('button')).find(btn => 
                btn.textContent.includes('Contactos') || btn.textContent.includes('Leads')
            );
            if (contactsTab) {
                tabNav = contactsTab.parentElement;
            }
        }
    }
    
    if (!tabNav) {
        console.log('⚠️ Could not find tab navigation, trying alternative approach...');
        
        // Alternative: Add tabs after the existing tab row
        const mainHeader = document.querySelector('nav') || document.querySelector('header');
        if (mainHeader) {
            const schoolTabsContainer = document.createElement('div');
            schoolTabsContainer.style.cssText = `
                background: #f3f4f6;
                padding: 0.5rem 1rem;
                display: flex;
                gap: 0.5rem;
                border-top: 1px solid #e5e7eb;
                flex-wrap: wrap;
            `;
            schoolTabsContainer.innerHTML = `
                <div style="margin-right: 1rem; font-weight: bold; color: #6b7280;">
                    Módulos Escolares:
                </div>
                <button onclick="switchToStudentsTab()" class="tab-btn" style="
                    padding: 0.5rem 1rem;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 4px;
                    cursor: pointer;
                ">👥 Estudiantes</button>
                <button onclick="switchToPaymentsTab()" class="tab-btn" style="
                    padding: 0.5rem 1rem;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 4px;
                    cursor: pointer;
                ">💰 Pagos</button>
                <button onclick="switchToGroupsTab()" class="tab-btn" style="
                    padding: 0.5rem 1rem;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 4px;
                    cursor: pointer;
                ">📚 Grupos</button>
                <button onclick="switchToTeachersTab()" class="tab-btn" style="
                    padding: 0.5rem 1rem;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 4px;
                    cursor: pointer;
                ">👩‍🏫 Profesores</button>
                <button onclick="switchToAttendanceTab()" class="tab-btn" style="
                    padding: 0.5rem 1rem;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 4px;
                    cursor: pointer;
                ">📋 Asistencia</button>
            `;
            
            // Insert after the header
            mainHeader.parentNode.insertBefore(schoolTabsContainer, mainHeader.nextSibling);
            tabNav = schoolTabsContainer;
        }
    } else {
        // Add new tabs to existing navigation
        const newTabs = `
            <button onclick="switchToStudentsTab()" class="tab-btn">👥 Estudiantes</button>
            <button onclick="switchToPaymentsTab()" class="tab-btn">💰 Pagos</button>
            <button onclick="switchToGroupsTab()" class="tab-btn">📚 Grupos</button>
            <button onclick="switchToTeachersTab()" class="tab-btn">👩‍🏫 Profesores</button>
            <button onclick="switchToAttendanceTab()" class="tab-btn">📋 Asistencia</button>
        `;
        tabNav.insertAdjacentHTML('beforeend', newTabs);
    }

    // Add content containers
    const mainContent = document.querySelector('.main-content') || 
                       document.querySelector('main') || 
                       document.querySelector('#app') ||
                       document.body;
    
    if (mainContent) {
        // Check if containers already exist
        if (!document.getElementById('students')) {
            const newContainers = document.createElement('div');
            newContainers.innerHTML = `
                <div id="students" class="tab-content hidden" style="display: none;">
                    <div id="studentsContainer" style="padding: 1rem;">
                        <div style="text-align: center; padding: 3rem;">
                            <div class="loading-spinner"></div>
                            <p>Cargando módulo de estudiantes...</p>
                        </div>
                    </div>
                </div>
                
                <div id="payments" class="tab-content hidden" style="display: none;">
                    <div id="paymentsContainer" style="padding: 1rem;">
                        <div style="text-align: center; padding: 3rem;">
                            <div class="loading-spinner"></div>
                            <p>Cargando módulo de pagos...</p>
                        </div>
                    </div>
                </div>
                
                <div id="groups" class="tab-content hidden" style="display: none;">
                    <div id="groupsContainer" style="padding: 1rem;">
                        <div style="text-align: center; padding: 3rem;">
                            <div class="loading-spinner"></div>
                            <p>Cargando módulo de grupos...</p>
                        </div>
                    </div>
                </div>
                
                <div id="teachers" class="tab-content hidden" style="display: none;">
                    <div id="teachersContainer" style="padding: 1rem;">
                        <div style="text-align: center; padding: 3rem;">
                            <div class="loading-spinner"></div>
                            <p>Cargando módulo de profesores...</p>
                        </div>
                    </div>
                </div>
                
                <div id="attendance" class="tab-content hidden" style="display: none;">
                    <div id="attendanceContainer" style="padding: 1rem;">
                        <div style="text-align: center; padding: 3rem;">
                            <div class="loading-spinner"></div>
                            <p>Cargando módulo de asistencia...</p>
                        </div>
                    </div>
                </div>
            `;
            mainContent.appendChild(newContainers);
        }
    }

    console.log('✅ School tabs setup complete');
}

// Tab switching functions
window.switchToStudentsTab = async function() {
    console.log('🔄 Switching to students tab');
    
    // Hide all existing tabs
    const allTabs = document.querySelectorAll('.tab-content, [id*="Container"]');
    allTabs.forEach(tab => {
        if (tab.id !== 'studentsContainer' && tab.id !== 'students') {
            tab.style.display = 'none';
            tab.classList.add('hidden');
        }
    });
    
    // Show students tab
    const studentsDiv = document.getElementById('students');
    if (studentsDiv) {
        studentsDiv.style.display = 'block';
        studentsDiv.classList.remove('hidden');
    }
    
    // Load students data
    if (typeof window.loadStudentsTab === 'function') {
        await window.loadStudentsTab();
    } else {
        console.log('⚠️ Students module not loaded yet');
        document.getElementById('studentsContainer').innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <h2>⚠️ Módulo de Estudiantes</h2>
                <p>El módulo de estudiantes no está cargado.</p>
                <p>Asegúrate de que el archivo <code>students.js</code> existe.</p>
            </div>
        `;
    }
};

window.switchToPaymentsTab = async function() {
    console.log('🔄 Switching to payments tab');
    
    // Hide all existing tabs
    const allTabs = document.querySelectorAll('.tab-content, [id*="Container"]');
    allTabs.forEach(tab => {
        if (tab.id !== 'paymentsContainer' && tab.id !== 'payments') {
            tab.style.display = 'none';
            tab.classList.add('hidden');
        }
    });
    
    // Show payments tab
    const paymentsDiv = document.getElementById('payments');
    if (paymentsDiv) {
        paymentsDiv.style.display = 'block';
        paymentsDiv.classList.remove('hidden');
    }
    
    // Load payments data
    if (typeof window.loadPaymentsTab === 'function') {
        await window.loadPaymentsTab();
    } else {
        console.log('⚠️ Payments module not loaded yet');
        document.getElementById('paymentsContainer').innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <h2>⚠️ Módulo de Pagos</h2>
                <p>El módulo de pagos no está cargado.</p>
                <p>Asegúrate de que el archivo <code>payments.js</code> existe.</p>
            </div>
        `;
    }
};

window.switchToGroupsTab = async function() {
    console.log('🔄 Switching to groups tab');
    
    // Hide all existing tabs
    const allTabs = document.querySelectorAll('.tab-content, [id*="Container"]');
    allTabs.forEach(tab => {
        if (tab.id !== 'groupsContainer' && tab.id !== 'groups') {
            tab.style.display = 'none';
            tab.classList.add('hidden');
        }
    });
    
    // Show groups tab
    const groupsDiv = document.getElementById('groups');
    if (groupsDiv) {
        groupsDiv.style.display = 'block';
        groupsDiv.classList.remove('hidden');
    }
    
    // Load groups data
    if (typeof window.loadGroupsTab === 'function') {
        await window.loadGroupsTab();
    } else {
        console.log('⚠️ Groups module not loaded yet');
        document.getElementById('groupsContainer').innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <h2>⚠️ Módulo de Grupos</h2>
                <p>El módulo de grupos no está cargado.</p>
                <p>Asegúrate de que el archivo <code>groups.js</code> existe.</p>
            </div>
        `;
    }
};

window.switchToTeachersTab = async function() {
    console.log('🔄 Switching to teachers tab');
    
    // Hide all existing tabs
    const allTabs = document.querySelectorAll('.tab-content, [id*="Container"]');
    allTabs.forEach(tab => {
        if (tab.id !== 'teachersContainer' && tab.id !== 'teachers') {
            tab.style.display = 'none';
            tab.classList.add('hidden');
        }
    });
    
    // Show teachers tab
    const teachersDiv = document.getElementById('teachers');
    if (teachersDiv) {
        teachersDiv.style.display = 'block';
        teachersDiv.classList.remove('hidden');
    }
    
    // Load teachers data
    if (typeof window.loadTeachersTab === 'function') {
        await window.loadTeachersTab();
    } else {
        console.log('⚠️ Teachers module not loaded yet');
        document.getElementById('teachersContainer').innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <h2>⚠️ Módulo de Profesores</h2>
                <p>El módulo de profesores no está cargado.</p>
                <p>Asegúrate de que el archivo <code>teachers.js</code> existe.</p>
            </div>
        `;
    }
};

window.switchToAttendanceTab = async function() {
    console.log('🔄 Switching to attendance tab');
    
    // Hide all existing tabs
    const allTabs = document.querySelectorAll('.tab-content, [id*="Container"]');
    allTabs.forEach(tab => {
        if (tab.id !== 'attendanceContainer' && tab.id !== 'attendance') {
            tab.style.display = 'none';
            tab.classList.add('hidden');
        }
    });
    
    // Show attendance tab
    const attendanceDiv = document.getElementById('attendance');
    if (attendanceDiv) {
        attendanceDiv.style.display = 'block';
        attendanceDiv.classList.remove('hidden');
    }
    
    // Load attendance data
    if (typeof window.loadAttendanceTab === 'function') {
        await window.loadAttendanceTab();
    } else {
        console.log('⚠️ Attendance module not loaded yet');
        document.getElementById('attendanceContainer').innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <h2>⚠️ Módulo de Asistencia</h2>
                <p>El módulo de asistencia no está cargado.</p>
                <p>Asegúrate de que el archivo <code>attendance.js</code> existe.</p>
            </div>
        `;
    }
};

// Add CSS for new elements
const style = document.createElement('style');
style.textContent = `
    /* School module styles */
    .form-group {
        margin-bottom: 1rem;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 0.25rem;
        font-weight: 600;
        color: #374151;
    }
    
    .form-group input,
    .form-group select,
    .form-group textarea {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        font-size: 0.875rem;
    }
    
    .btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .btn-primary {
        background: #3b82f6;
        color: white;
    }
    
    .btn-secondary {
        background: #6b7280;
        color: white;
    }
    
    .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Initialize school modules when Firebase is ready
window.addEventListener('firebaseReady', function() {
    console.log('🔥 Firebase ready, initializing school modules');
    
    // Initialize managers if they exist
    if (window.StudentManager) {
        window.StudentManager.init().catch(console.error);
    }
    
    if (window.PaymentManager) {
        window.PaymentManager.init().catch(console.error);
    }
    
    if (window.GroupsManager) {
        window.GroupsManager.init().catch(console.error);
    }
    
    if (window.TeacherManager) {
        window.TeacherManager.init().catch(console.error);
    }
});

console.log('✅ School integration loaded successfully');
