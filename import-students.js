// import-students.js - Robust Excel Import Utility for Students
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
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Get student sheet
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
        const headers = data[0];
        const students = [];
        
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row[0]) continue; // Skip empty rows
            
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
            
            // Process payment months
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
        
        for (let i = 0; i < students.length; i++) {
            try {
                // Check if student exists
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
        if (!numDoc) return false;
        
        const students = window.StudentManager.getStudents();
        return students.some(s => s.numDoc === numDoc);
    }
}

// Initialize Excel Importer
window.ExcelImporter = new ExcelImportManager();

// Robust Modal System - Prevent ALL navigation
window.showImportModal = function(event) {
    // Aggressive event prevention
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }
    
    console.log('📥 Opening import modal - Current URL:', window.location.href);
    
    // Store current hash to prevent navigation
    const currentHash = window.location.hash;
    
    // Remove any existing modal first
    const existingModal = document.getElementById('importModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal container
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
    
    // Prevent clicks on backdrop from navigating
    modalContainer.addEventListener('click', function(e) {
        if (e.target === modalContainer) {
            e.preventDefault();
            e.stopPropagation();
            window.closeImportModal();
        }
    });
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 8px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    
    modalContent.innerHTML = `
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
            <button id="cancelBtn" 
                    style="padding: 0.5rem 1rem; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Cancelar
            </button>
            <button id="importBtn" 
                    style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; opacity: 0.5;"
                    disabled>
                📥 Importar
            </button>
        </div>
    `;
    
    // Prevent all events from bubbling
    modalContent.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    modalContainer.appendChild(modalContent);
    document.body.appendChild(modalContainer);
    
    // Add event listeners with timeouts for Edge
    setTimeout(function() {
        const fileInput = document.getElementById('excelFile');
        const cancelBtn = document.getElementById('cancelBtn');
        const importBtn = document.getElementById('importBtn');
        
        if (fileInput) {
            fileInput.addEventListener('change', window.previewImport);
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function(e) {
                e.preventDefault();
                window.closeImportModal();
            });
        }
        
        if (importBtn) {
            importBtn.addEventListener('click', function(e) {
                e.preventDefault();
                window.startImport();
            });
        }
    }, 100);
    
    // Ensure we stay on the same page
    if (window.location.hash !== currentHash) {
        window.location.hash = currentHash;
    }
    
    return false;
};

// Close modal
window.closeImportModal = function() {
    const modal = document.getElementById('importModal');
    if (modal) {
        modal.remove();
    }
};

// Preview import
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

// Start import
window.startImport = async function() {
    if (!window.studentsToImport || !window.studentsToImport.length) return;
    
    const importBtn = document.getElementById('importBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const progressDiv = document.getElementById('importProgress');
    const preview = document.getElementById('importPreview');
    
    importBtn.disabled = true;
    cancelBtn.disabled = true;
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
        
        // Reload students tab
        if (window.loadStudentsTab) {
            window.loadStudentsTab();
        }
        
    } catch (error) {
        console.error('❌ Import error:', error);
        alert(`❌ Error durante la importación: ${error.message}`);
        cancelBtn.disabled = false;
    }
};

// Robust button addition function
window.addImportButtonToStudents = function() {
    console.log('🔍 Attempting to add import button...');
    
    // Don't add if already exists
    if (document.getElementById('importExcelBtn')) {
        console.log('✅ Import button already exists');
        return;
    }
    
    // Try multiple strategies to find where to add the button
    let buttonAdded = false;
    
    // Strategy 1: Find by the search input
    const searchInput = document.querySelector('#studentsContainer input[placeholder*="Buscar"], #studentsContainer input[type="search"]');
    if (searchInput && searchInput.parentElement) {
        const importBtn = createImportButton();
        searchInput.parentElement.insertBefore(importBtn, searchInput);
        buttonAdded = true;
        console.log('✅ Button added next to search input');
    }
    
    // Strategy 2: Find by the "Nuevo Estudiante" button
    if (!buttonAdded) {
        const newStudentBtn = document.querySelector('#studentsContainer button:not(#importExcelBtn)');
        if (newStudentBtn && newStudentBtn.textContent.includes('Nuevo Estudiante')) {
            const importBtn = createImportButton();
            newStudentBtn.parentElement.insertBefore(importBtn, newStudentBtn);
            buttonAdded = true;
            console.log('✅ Button added next to Nuevo Estudiante button');
        }
    }
    
    // Strategy 3: Find the header area
    if (!buttonAdded) {
        const header = document.querySelector('#studentsContainer h2');
        if (header && header.parentElement) {
            const controlsDiv = header.parentElement.querySelector('div') || 
                               header.parentElement;
            const importBtn = createImportButton();
            controlsDiv.appendChild(importBtn);
            buttonAdded = true;
            console.log('✅ Button added to header area');
        }
    }
    
    if (!buttonAdded) {
        console.log('⚠️ Could not find suitable location for button, retrying...');
        setTimeout(window.addImportButtonToStudents, 1000);
    }
};

// Create import button with all event handlers
function createImportButton() {
    const importBtn = document.createElement('button');
    importBtn.id = 'importExcelBtn';
    importBtn.className = 'btn btn-secondary';
    importBtn.textContent = '📥 Importar Excel';
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
        display: inline-block;
    `;
    
    // Multiple event prevention approaches
    importBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        window.showImportModal(e);
        return false;
    };
    
    importBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        window.showImportModal(e);
        return false;
    }, true);
    
    // Hover effect
    importBtn.addEventListener('mouseenter', function() {
        this.style.backgroundColor = '#4b5563';
    });
    
    importBtn.addEventListener('mouseleave', function() {
        this.style.backgroundColor = '#6b7280';
    });
    
    return importBtn;
}

// Multiple initialization strategies for cross-browser compatibility
function initializeImportFeature() {
    console.log('🚀 Initializing import feature');
    
    // Hook into loadStudentsTab
    if (window.loadStudentsTab) {
        const originalLoadStudentsTab = window.loadStudentsTab;
        
        window.loadStudentsTab = async function() {
            console.log('📋 Loading students tab with import button');
            
            // Call original function
            if (originalLoadStudentsTab) {
                await originalLoadStudentsTab.apply(this, arguments);
            }
            
            // Add button after a delay
            setTimeout(window.addImportButtonToStudents, 500);
        };
    }
    
    // Check if students tab is already visible
    const studentsTab = document.getElementById('students');
    const studentsContainer = document.getElementById('studentsContainer');
    
    if ((studentsTab && !studentsTab.classList.contains('hidden')) || 
        (studentsContainer && studentsContainer.style.display !== 'none')) {
        setTimeout(window.addImportButtonToStudents, 500);
    }
}

// Cross-browser initialization
console.log('🌐 Setting up cross-browser initialization');

// Method 1: DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeImportFeature);
} else {
    // DOM already loaded
    setTimeout(initializeImportFeature, 100);
}

// Method 2: Window load (for Edge/IE)
window.addEventListener('load', function() {
    console.log('🪟 Window loaded - checking for import button');
    setTimeout(function() {
        if (!document.getElementById('importExcelBtn')) {
            console.log('📌 Import button missing after load, reinitializing...');
            initializeImportFeature();
        }
    }, 2000);
});

// Method 3: MutationObserver for dynamic content
if (window.MutationObserver) {
    const observer = new MutationObserver(function(mutations) {
        // Check if students container becomes visible
        const studentsContainer = document.getElementById('studentsContainer');
        if (studentsContainer && !document.getElementById('importExcelBtn')) {
            console.log('👀 Students container detected via MutationObserver');
            setTimeout(window.addImportButtonToStudents, 500);
        }
    });
    
    // Start observing when body is available
    function startObserving() {
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        } else {
            setTimeout(startObserving, 100);
        }
    }
    
    startObserving();
}

// Load XLSX library
if (typeof XLSX === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = function() {
        console.log('✅ XLSX library loaded');
    };
    script.onerror = function() {
        console.error('❌ Failed to load XLSX library');
        // Retry once
        setTimeout(function() {
            const retryScript = document.createElement('script');
            retryScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            document.head.appendChild(retryScript);
        }, 2000);
    };
    document.head.appendChild(script);
}

console.log('✅ Excel import utility loaded with robust cross-browser support');
