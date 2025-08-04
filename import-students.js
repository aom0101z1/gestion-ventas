// import-students.js - Wait for module to load before adding button
console.log('📥 Loading Excel import utility...');

// Excel Import Manager
class ExcelImportManager {
    constructor() {
        this.importedData = [];
        this.monthColumns = {
            'JULIO': 13, 'AGOSTO': 15, 'SEPTIEMBRE': 17,
            'OCTUBRE': 19, 'NOVIEMBRE': 21, 'DICIEMBRE': 23
        };
    }

    // Process Excel file
    async processExcelFile(file) {
        try {
            const data = await this.readExcelFile(file);
            const students = this.parseStudentData(data);
            return students;
        } catch (error) {
            console.error('❌ Error processing Excel:', error);
            throw error;
        }
    }

    // Read Excel file
    readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    if (typeof XLSX === 'undefined') {
                        throw new Error('XLSX library not loaded. Please refresh the page.');
                    }
                    
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    const sheet = workbook.Sheets['Lista Estudiantes'];
                    if (!sheet) {
                        throw new Error('Hoja "Lista Estudiantes" no encontrada');
                    }
                    
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Error leyendo archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    // Parse student data from Excel
    parseStudentData(data) {
        const students = [];
        
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row[0]) continue;
            
            const student = {
                id: `STU-${Date.now()}-${i}`,
                nombre: row[0] || '',
                tipoDoc: row[1] || 'C.C',
                edad: row[2] || '',
                numDoc: row[3] || '',
                telefono: row[4] || '',
                correo: row[5] || '',
                acudiente: row[6] || '',
                docAcudiente: row[7] || '',
                fechaInicio: row[8] || '',
                grupo: row[9] || '',
                tipoPago: row[10] || 'MENSUAL',
                valor: row[11] || '',
                fechaPago: row[12] || '',
                pagos: {}
            };
            
            Object.entries(this.monthColumns).forEach(([month, col]) => {
                if (row[col]) {
                    student.pagos[month] = {
                        valor: row[col],
                        fecha: row[col + 1] || ''
                    };
                }
            });
            
            students.push(student);
        }
        
        return students;
    }

    // Import to Firebase
    async importToFirebase(students, progressCallback) {
        const errors = [];
        let imported = 0;
        
        if (!window.StudentManager) {
            throw new Error('StudentManager not initialized. Please refresh the page.');
        }
        
        for (let i = 0; i < students.length; i++) {
            try {
                const existingStudent = await this.checkExistingStudent(students[i].numDoc);
                if (!existingStudent) {
                    await window.StudentManager.saveStudent(students[i]);
                    imported++;
                }
                
                if (progressCallback) {
                    progressCallback(i + 1, students.length);
                }
            } catch (error) {
                errors.push({
                    student: students[i].nombre,
                    error: error.message
                });
            }
        }
        
        return { imported, total: students.length, errors };
    }

    // Check if student exists
    async checkExistingStudent(numDoc) {
        if (!numDoc || !window.StudentManager) return false;
        
        try {
            const students = window.StudentManager.getStudents();
            return students.some(s => s.numDoc === numDoc);
        } catch (error) {
            console.error('Error checking existing student:', error);
            return false;
        }
    }
}

// Initialize Excel Importer
window.ExcelImporter = new ExcelImportManager();

// Modal functions
window.showImportModal = function(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    console.log('📥 Opening import modal');
    
    const existingModal = document.getElementById('importModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalContainer = document.createElement('div');
    modalContainer.id = 'importModal';
    modalContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
    `;
    
    modalContainer.innerHTML = `
        <div style="
            background: white;
            padding: 2rem;
            border-radius: 8px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        " onclick="event.stopPropagation()">
            <h2 style="margin: 0 0 1rem 0;">📥 Importar Estudiantes desde Excel</h2>
            
            <div style="background: #e0f2fe; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
                <p style="margin: 0 0 0.5rem 0;"><strong>Instrucciones:</strong></p>
                <ul style="margin: 0; padding-left: 1.5rem;">
                    <li>Selecciona tu archivo Excel con la lista de estudiantes</li>
                    <li>El archivo debe tener una hoja llamada "Lista Estudiantes"</li>
                    <li>Se importarán todos los campos disponibles</li>
                    <li>Los estudiantes existentes NO se duplicarán</li>
                </ul>
            </div>
            
            <div class="form-group" style="margin: 1rem 0;">
                <label style="display: block; margin-bottom: 0.5rem;">Archivo Excel:</label>
                <input type="file" 
                       id="excelFile" 
                       accept=".xlsx,.xls" 
                       style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
            </div>
            
            <div id="importPreview" style="margin: 1rem 0;"></div>
            
            <div id="importProgress" style="display: none; margin: 1rem 0;">
                <div style="background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden;">
                    <div id="progressBar" style="background: #3b82f6; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                </div>
                <p id="progressText" style="text-align: center; margin-top: 0.5rem;">0%</p>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                <button onclick="window.closeImportModal()" 
                        style="padding: 0.5rem 1rem; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Cancelar
                </button>
                <button id="importBtn" 
                        onclick="window.startImport()"
                        style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; opacity: 0.5;"
                        disabled>
                    📥 Importar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalContainer);
    
    setTimeout(() => {
        const fileInput = document.getElementById('excelFile');
        if (fileInput) {
            fileInput.addEventListener('change', window.previewImport);
        }
    }, 100);
    
    return false;
};

window.closeImportModal = function() {
    const modal = document.getElementById('importModal');
    if (modal) {
        modal.remove();
    }
};

window.previewImport = async function() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    const preview = document.getElementById('importPreview');
    const importBtn = document.getElementById('importBtn');
    
    try {
        preview.innerHTML = '<div style="text-align: center;">⌛ Analizando archivo...</div>';
        
        const students = await window.ExcelImporter.processExcelFile(file);
        
        preview.innerHTML = `
            <div style="background: #d1fae5; padding: 1rem; border-radius: 4px;">
                <h4 style="margin: 0 0 0.5rem 0;">✅ Archivo válido</h4>
                <p style="margin: 0;">Se encontraron <strong>${students.length}</strong> estudiantes para importar</p>
                
                <details style="margin-top: 0.5rem;">
                    <summary style="cursor: pointer;">Ver primeros 5 estudiantes</summary>
                    <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem; font-size: 0.875rem;">
                        ${students.slice(0, 5).map(s => 
                            `<li>${s.nombre} - ${s.numDoc} - ${s.grupo || 'Sin grupo'}</li>`
                        ).join('')}
                    </ul>
                </details>
            </div>
        `;
        
        importBtn.disabled = false;
        importBtn.style.opacity = '1';
        window.studentsToImport = students;
        
    } catch (error) {
        preview.innerHTML = `
            <div style="background: #fee2e2; padding: 1rem; border-radius: 4px;">
                <h4 style="margin: 0; color: #dc2626;">❌ Error al leer archivo</h4>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">${error.message}</p>
            </div>
        `;
        importBtn.disabled = true;
        importBtn.style.opacity = '0.5';
    }
};

window.startImport = async function() {
    if (!window.studentsToImport || !window.studentsToImport.length) return;
    
    const importBtn = document.getElementById('importBtn');
    const cancelBtn = document.querySelector('button[onclick*="closeImportModal"]');
    const progressDiv = document.getElementById('importProgress');
    const preview = document.getElementById('importPreview');
    
    importBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    progressDiv.style.display = 'block';
    preview.style.display = 'none';
    
    try {
        const result = await window.ExcelImporter.importToFirebase(
            window.studentsToImport,
            (current, total) => {
                const percentage = Math.round((current / total) * 100);
                document.getElementById('progressBar').style.width = `${percentage}%`;
                document.getElementById('progressText').textContent = 
                    `${percentage}% - ${current}/${total} estudiantes`;
            }
        );
        
        let message = `✅ Importación completada\n\n`;
        message += `Importados: ${result.imported}/${result.total}`;
        
        if (result.errors.length > 0) {
            message += `\n\nErrores (${result.errors.length}):`;
            result.errors.forEach(err => {
                message += `\n- ${err.student}: ${err.error}`;
            });
        }
        
        alert(message);
        closeImportModal();
        
        if (window.loadStudentsTab) {
            window.loadStudentsTab();
        }
        
    } catch (error) {
        console.error('❌ Import error:', error);
        alert(`❌ Error durante la importación: ${error.message}`);
        if (cancelBtn) cancelBtn.disabled = false;
    }
};

// Wait for students module to be fully loaded
window.waitForStudentsModule = function(callback) {
    let checkCount = 0;
    const maxChecks = 30; // 30 seconds max wait
    
    const checkInterval = setInterval(() => {
        checkCount++;
        
        // Check if students table exists
        const studentsTable = document.querySelector('#studentsContainer table');
        const loadingIndicator = document.querySelector('.loading-spinner') || 
                               document.querySelector('[style*="Cargando"]');
        
        if (studentsTable && !loadingIndicator) {
            console.log('✅ Students module loaded successfully');
            clearInterval(checkInterval);
            callback();
        } else if (checkCount >= maxChecks) {
            console.error('❌ Timeout waiting for students module to load');
            clearInterval(checkInterval);
        } else {
            console.log(`⏳ Waiting for students module... (${checkCount}/${maxChecks})`);
        }
    }, 1000);
};

// Add import button only after module is loaded
window.addImportButtonSafely = function() {
    // Don't add if already exists
    if (document.getElementById('importExcelBtn')) {
        console.log('✅ Import button already exists');
        return;
    }
    
    console.log('🔍 Looking for place to add import button...');
    
    // Find the header area with buttons
    const studentsContainer = document.getElementById('studentsContainer');
    if (!studentsContainer) {
        console.error('❌ Students container not found');
        return;
    }
    
    // Look for existing buttons in the header
    const headerButtons = studentsContainer.querySelectorAll('button');
    let targetButton = null;
    
    for (let button of headerButtons) {
        if (button.textContent.includes('Nuevo Estudiante') || 
            button.textContent.includes('New Student')) {
            targetButton = button;
            break;
        }
    }
    
    if (targetButton && targetButton.parentElement) {
        const importBtn = document.createElement('button');
        importBtn.id = 'importExcelBtn';
        importBtn.className = 'btn btn-secondary';
        importBtn.innerHTML = '📥 Importar Excel';
        importBtn.style.cssText = `
            padding: 0.5rem 1rem;
            background-color: #6b7280;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 0.5rem;
            font-family: inherit;
            font-size: inherit;
        `;
        
        importBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.showImportModal(e);
            return false;
        };
        
        targetButton.parentElement.insertBefore(importBtn, targetButton);
        console.log('✅ Import button added successfully');
    } else {
        console.error('❌ Could not find suitable location for import button');
    }
};

// Initialize - DO NOT interfere with module loading
function initializeImportFeature() {
    console.log('🚀 Import feature initialization started');
    
    // Only hook into loadStudentsTab, don't call it
    if (window.loadStudentsTab) {
        const originalLoadStudentsTab = window.loadStudentsTab;
        
        window.loadStudentsTab = async function() {
            console.log('📋 Students tab loading...');
            
            // Call original function first
            const result = await originalLoadStudentsTab.apply(this, arguments);
            
            // Wait for module to be fully loaded before adding button
            window.waitForStudentsModule(() => {
                window.addImportButtonSafely();
            });
            
            return result;
        };
        
        console.log('✅ Hooked into loadStudentsTab');
    }
}

// Initialize only when ready
if (document.readyState === 'complete') {
    initializeImportFeature();
} else {
    window.addEventListener('load', initializeImportFeature);
}

// Load XLSX library
if (typeof XLSX === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => console.log('✅ XLSX library loaded');
    script.onerror = () => console.error('❌ Failed to load XLSX library');
    document.head.appendChild(script);
}

console.log('✅ Excel import utility loaded - waiting for students module');
