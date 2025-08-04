// import-students.js - Safe Recovery Version with Error Boundaries
console.log('📥 Loading Excel import utility (Safe Mode)...');

// Global safety flags
window.importInProgress = false;
window.importButtonAdded = false;

// Excel Import Manager with safety checks
class ExcelImportManager {
    constructor() {
        this.importedData = [];
        this.monthColumns = {
            'JULIO': 13, 'AGOSTO': 15, 'SEPTIEMBRE': 17,
            'OCTUBRE': 19, 'NOVIEMBRE': 21, 'DICIEMBRE': 23
        };
        this.abortController = null;
    }

    // Abort any ongoing import
    abortImport() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        window.importInProgress = false;
        console.log('🛑 Import aborted');
    }

    // Process Excel file with abort capability
    async processExcelFile(file) {
        // Prevent multiple imports
        if (window.importInProgress) {
            throw new Error('Import already in progress');
        }
        
        window.importInProgress = true;
        this.abortController = new AbortController();
        
        try {
            const data = await this.readExcelFile(file);
            
            // Check if aborted
            if (this.abortController.signal.aborted) {
                throw new Error('Import cancelled');
            }
            
            const students = this.parseStudentData(data);
            return students;
        } catch (error) {
            console.error('❌ Error processing Excel:', error);
            throw error;
        } finally {
            window.importInProgress = false;
        }
    }

    // Read Excel file with safety timeout
    readExcelFile(file) {
        return new Promise((resolve, reject) => {
            // Safety timeout - 10 seconds max
            const timeout = setTimeout(() => {
                reject(new Error('File read timeout - file might be too large'));
                window.importInProgress = false;
            }, 10000);
            
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                clearTimeout(timeout);
                try {
                    if (typeof XLSX === 'undefined') {
                        throw new Error('XLSX library not loaded');
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
            
            reader.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Error reading file'));
                window.importInProgress = false;
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    // Parse student data
    parseStudentData(data) {
        const students = [];
        const maxRows = Math.min(data.length, 1000); // Limit to 1000 rows for safety
        
        for (let i = 1; i < maxRows; i++) {
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

    // Safe import with batch processing
    async importToFirebase(students, progressCallback) {
        const errors = [];
        let imported = 0;
        const batchSize = 10; // Process in batches to avoid overwhelming
        
        try {
            for (let i = 0; i < students.length; i += batchSize) {
                // Check if aborted
                if (this.abortController && this.abortController.signal.aborted) {
                    throw new Error('Import cancelled by user');
                }
                
                const batch = students.slice(i, i + batchSize);
                
                for (const student of batch) {
                    try {
                        const existingStudent = await this.checkExistingStudent(student.numDoc);
                        if (!existingStudent) {
                            await window.StudentManager.saveStudent(student);
                            imported++;
                        }
                    } catch (error) {
                        errors.push({
                            student: student.nombre,
                            error: error.message
                        });
                    }
                }
                
                if (progressCallback) {
                    progressCallback(Math.min(i + batchSize, students.length), students.length);
                }
                
                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (error) {
            console.error('Import error:', error);
            throw error;
        } finally {
            window.importInProgress = false;
        }
        
        return { imported, total: students.length, errors };
    }

    async checkExistingStudent(numDoc) {
        if (!numDoc || !window.StudentManager) return false;
        
        try {
            const students = window.StudentManager.getStudents();
            return students.some(s => s.numDoc === numDoc);
        } catch (error) {
            return false;
        }
    }
}

// Initialize with safety
window.ExcelImporter = new ExcelImportManager();

// Safe modal show
window.showImportModal = function(event) {
    try {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        // Abort any ongoing import
        if (window.ExcelImporter) {
            window.ExcelImporter.abortImport();
        }
        
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
                
                <div style="background: #fffbeb; padding: 1rem; border-radius: 4px; margin: 1rem 0; border: 1px solid #fbbf24;">
                    <p style="margin: 0; color: #92400e;"><strong>⚠️ Límite de seguridad:</strong> Máximo 1000 estudiantes por importación</p>
                </div>
                
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
        
    } catch (error) {
        console.error('Error showing modal:', error);
        alert('Error al abrir el modal de importación');
    }
    
    return false;
};

window.closeImportModal = function() {
    // Abort any ongoing import
    if (window.ExcelImporter) {
        window.ExcelImporter.abortImport();
    }
    
    const modal = document.getElementById('importModal');
    if (modal) {
        modal.remove();
    }
    
    // Reset state
    window.studentsToImport = null;
    window.importInProgress = false;
};

window.previewImport = async function() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 10MB.');
        fileInput.value = '';
        return;
    }
    
    const preview = document.getElementById('importPreview');
    const importBtn = document.getElementById('importBtn');
    
    try {
        preview.innerHTML = '<div style="text-align: center;">⌛ Analizando archivo...</div>';
        
        const students = await window.ExcelImporter.processExcelFile(file);
        
        preview.innerHTML = `
            <div style="background: #d1fae5; padding: 1rem; border-radius: 4px;">
                <h4 style="margin: 0 0 0.5rem 0;">✅ Archivo válido</h4>
                <p style="margin: 0;">Se encontraron <strong>${students.length}</strong> estudiantes para importar</p>
                ${students.length > 1000 ? '<p style="color: #dc2626; margin: 0.5rem 0 0 0;">⚠️ Se importarán solo los primeros 1000 estudiantes</p>' : ''}
                
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
        window.studentsToImport = students.slice(0, 1000); // Limit to 1000
        
    } catch (error) {
        preview.innerHTML = `
            <div style="background: #fee2e2; padding: 1rem; border-radius: 4px;">
                <h4 style="margin: 0; color: #dc2626;">❌ Error al leer archivo</h4>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">${error.message}</p>
            </div>
        `;
        importBtn.disabled = true;
        importBtn.style.opacity = '0.5';
        window.importInProgress = false;
    }
};

window.startImport = async function() {
    if (!window.studentsToImport || window.importInProgress) return;
    
    const importBtn = document.getElementById('importBtn');
    const cancelBtn = document.querySelector('button[onclick*="closeImportModal"]');
    const progressDiv = document.getElementById('importProgress');
    const preview = document.getElementById('importPreview');
    
    importBtn.disabled = true;
    if (cancelBtn) cancelBtn.textContent = 'Cancelar Importación';
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
            result.errors.slice(0, 10).forEach(err => {
                message += `\n- ${err.student}: ${err.error}`;
            });
            if (result.errors.length > 10) {
                message += `\n... y ${result.errors.length - 10} errores más`;
            }
        }
        
        alert(message);
        closeImportModal();
        
        if (window.loadStudentsTab) {
            window.loadStudentsTab();
        }
        
    } catch (error) {
        console.error('❌ Import error:', error);
        alert(`❌ Error durante la importación: ${error.message}`);
    } finally {
        window.importInProgress = false;
        if (cancelBtn) cancelBtn.disabled = false;
    }
};

// Safe button addition
window.addImportButtonSafely = function() {
    try {
        if (window.importButtonAdded || document.getElementById('importExcelBtn')) {
            return;
        }
        
        const newStudentBtn = document.querySelector('#studentsContainer button[onclick*="showStudentModal"]');
        if (newStudentBtn && newStudentBtn.parentElement) {
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
            `;
            
            importBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.showImportModal(e);
                return false;
            };
            
            newStudentBtn.parentElement.insertBefore(importBtn, newStudentBtn);
            window.importButtonAdded = true;
            console.log('✅ Import button added');
        }
    } catch (error) {
        console.error('Error adding import button:', error);
    }
};

// Safe initialization
function initializeSafely() {
    try {
        if (window.loadStudentsTab && !window.importHookInstalled) {
            const originalLoadStudentsTab = window.loadStudentsTab;
            
            window.loadStudentsTab = async function() {
                const result = await originalLoadStudentsTab.apply(this, arguments);
                
                setTimeout(() => {
                    window.addImportButtonSafely();
                }, 1000);
                
                return result;
            };
            
            window.importHookInstalled = true;
        }
    } catch (error) {
        console.error('Error in initialization:', error);
    }
}

// Only initialize when everything is ready
if (document.readyState === 'complete') {
    setTimeout(initializeSafely, 1000);
} else {
    window.addEventListener('load', () => {
        setTimeout(initializeSafely, 1000);
    });
}

// Emergency abort function
window.emergencyAbortImport = function() {
    if (window.ExcelImporter) {
        window.ExcelImporter.abortImport();
    }
    window.closeImportModal();
    window.importInProgress = false;
    window.studentsToImport = null;
    console.log('🛑 Emergency abort completed');
};

// Load XLSX if needed
if (typeof XLSX === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    document.head.appendChild(script);
}

console.log('✅ Excel import utility loaded (Safe Recovery Mode)');
console.log('💡 If stuck, run: window.emergencyAbortImport()');
