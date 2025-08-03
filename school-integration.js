// school-integration.js - Integration script for new school modules
// Add this script to index.html after all other scripts

console.log('🏫 Loading school integration...');

// Wait for DOM and Firebase to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Add new tabs to navigation
    setTimeout(addSchoolTabs, 2000);
});

function addSchoolTabs() {
    console.log('➕ Adding school tabs to navigation');
    
    // Find the tab navigation
    const tabNav = document.querySelector('.tab-nav');
    if (!tabNav) {
        console.error('❌ Tab navigation not found');
        setTimeout(addSchoolTabs, 1000);
        return;
    }

    // Check if tabs already exist
    if (document.getElementById('studentsTab')) {
        console.log('✅ School tabs already added');
        return;
    }

    // Add new tab buttons
    const newTabs = `
        <button id="studentsTab" onclick="switchToStudentsTab()" class="tab-btn">
            👥 Estudiantes
        </button>
        <button id="paymentsTab" onclick="switchToPaymentsTab()" class="tab-btn">
            💰 Pagos
        </button>
        <button id="groupsTab" onclick="switchToGroupsTab()" class="tab-btn">
            📚 Grupos
        </button>
        <button id="teachersTab" onclick="switchToTeachersTab()" class="tab-btn">
            👩‍🏫 Profesores
        </button>
        <button id="attendanceTab" onclick="switchToAttendanceTab()" class="tab-btn">
            📋 Asistencia
        </button>
    `;
    
    // Insert before config tab
    const configTab = tabNav.querySelector('[onclick*="config"]');
    if (configTab) {
        configTab.insertAdjacentHTML('beforebegin', newTabs);
    } else {
        tabNav.insertAdjacentHTML('beforeend', newTabs);
    }

    // Add content containers
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        const newContainers = `
            <div id="students" class="tab-content hidden">
                <div id="studentsContainer">
                    <div style="text-align: center; padding: 3rem;">
                        <div class="loading-spinner"></div>
                        <p>Cargando módulo de estudiantes...</p>
                    </div>
                </div>
            </div>
            
            <div id="payments" class="tab-content hidden">
                <div id="paymentsContainer">
                    <div style="text-align: center; padding: 3rem;">
                        <div class="loading-spinner"></div>
                        <p>Cargando módulo de pagos...</p>
                    </div>
                </div>
            </div>
            
            <div id="groups" class="tab-content hidden">
                <div id="groupsContainer">
                    <div style="text-align: center; padding: 3rem;">
                        <div class="loading-spinner"></div>
                        <p>Cargando módulo de grupos...</p>
                    </div>
                </div>
            </div>
            
            <div id="teachers" class="tab-content hidden">
                <div id="teachersContainer">
                    <div style="text-align: center; padding: 3rem;">
                        <div class="loading-spinner"></div>
                        <p>Cargando módulo de profesores...</p>
                    </div>
                </div>
            </div>
            
            <div id="attendance" class="tab-content hidden">
                <div id="attendanceContainer">
                    <div style="text-align: center; padding: 3rem;">
                        <div class="loading-spinner"></div>
                        <p>Cargando módulo de asistencia...</p>
                    </div>
                </div>
            </div>
        `;
        
        mainContent.insertAdjacentHTML('beforeend', newContainers);
    }

    console.log('✅ School tabs added successfully');
}

// Tab switching functions
window.switchToStudentsTab = async function() {
    console.log('🔄 Switching to students tab');
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show students tab
    document.getElementById('students').classList.remove('hidden');
    document.getElementById('studentsTab').classList.add('active');
    
    // Load students data if function exists
    if (typeof window.loadStudentsTab === 'function') {
        await window.loadStudentsTab();
    } else {
        console.error('❌ loadStudentsTab function not found');
    }
};

window.switchToPaymentsTab = async function() {
    console.log('🔄 Switching to payments tab');
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show payments tab
    document.getElementById('payments').classList.remove('hidden');
    document.getElementById('paymentsTab').classList.add('active');
    
    // Load payments data if function exists
    if (typeof window.loadPaymentsTab === 'function') {
        await window.loadPaymentsTab();
    } else {
        console.error('❌ loadPaymentsTab function not found');
    }
};

window.switchToGroupsTab = async function() {
    console.log('🔄 Switching to groups tab');
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show groups tab
    document.getElementById('groups').classList.remove('hidden');
    document.getElementById('groupsTab').classList.add('active');
    
    // Load groups data if function exists
    if (typeof window.loadGroupsTab === 'function') {
        await window.loadGroupsTab();
    } else {
        console.error('❌ loadGroupsTab function not found');
    }
};

window.switchToTeachersTab = async function() {
    console.log('🔄 Switching to teachers tab');
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show teachers tab
    document.getElementById('teachers').classList.remove('hidden');
    document.getElementById('teachersTab').classList.add('active');
    
    // Load teachers data if function exists
    if (typeof window.loadTeachersTab === 'function') {
        await window.loadTeachersTab();
    } else {
        console.error('❌ loadTeachersTab function not found');
    }
};

window.switchToAttendanceTab = async function() {
    console.log('🔄 Switching to attendance tab');
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show attendance tab
    document.getElementById('attendance').classList.remove('hidden');
    document.getElementById('attendanceTab').classList.add('active');
    
    // Load attendance data if function exists
    if (typeof window.loadAttendanceTab === 'function') {
        await window.loadAttendanceTab();
    } else {
        console.error('❌ loadAttendanceTab function not found');
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
    
    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
    
    .btn:active {
        transform: translateY(0);
    }
    
    .btn-primary {
        background: #3b82f6;
        color: white;
    }
    
    .btn-primary:hover {
        background: #2563eb;
    }
    
    .btn-secondary {
        background: #6b7280;
        color: white;
    }
    
    .btn-secondary:hover {
        background: #4b5563;
    }
    
    .btn-sm {
        padding: 0.25rem 0.5rem;
        font-size: 0.875rem;
    }
    
    /* Table styles */
    table {
        border-collapse: collapse;
    }
    
    table th {
        font-weight: 600;
        text-align: left;
        color: #374151;
    }
    
    table td {
        color: #1f2937;
    }
    
    /* Loading spinner */
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
    
    // Initialize managers
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

// Instructions for adding to index.html:
/*
To integrate these modules into your existing index.html:

1. Add these script tags at the end of your index.html, just before </body>:

<script src="students.js"></script>
<script src="payments.js"></script>
<script src="groups.js"></script>
<script src="teachers.js"></script>
<script src="attendance.js"></script>
<script src="import-students.js"></script>
<script src="school-integration.js"></script>

2. That's it! The integration script will automatically:
   - Add new tabs to your navigation
   - Create the necessary containers
   - Handle tab switching
   - Initialize the modules when Firebase is ready

The modules are completely separate and won't interfere with your existing code.
*/
