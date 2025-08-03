// import-students.js - Excel Import Utility for Students
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
                telefono: this.cleanPhone(row[4]),
                correo: row[5] || '',
                acudiente: row[6] || '',
                docAcudiente: row[7] || '',
                fechaInicio: this.parseDate(row[8]),
                grupo: row[9] || '',
                tipoPago: this.cleanPaymentType(row[10]),
                valor: this.parseAmount(row[11]),
                diaPago: this.extractPaymentDay(row[12]),
                pagos: this.extractPayments(row),
                createdAt: new Date().toISOString(),
                importedFromExcel: true
            };
            
            students.push(student);
        }
        
        return students;
    }

    // Clean phone number
    cleanPhone(phone) {
        if (!phone) return '';
        return String(phone).replace(/\D/g, '').trim();
    }

    // Clean payment type
    cleanPaymentType(type) {
        if (!type) return 'MENSUAL';
        const cleaned = String(type).trim().toUpperCase();
        return cleaned.includes('SEMESTRAL') ? 'SEMESTRAL' : 'MENSUAL';
    }

    // Parse amount
    parseAmount(amount) {
        if (!amount) return 0;
        return parseInt(String(amount).replace(/\D/g, '')) || 0;
    }

    // Parse date
    parseDate(date) {
        if (!date) return '';
        
        // If it's already a Date object
        if (date instanceof Date) {
            return date.toISOString().split('T')[0];
        }
        
        // Try to parse string date
        try {
            const parsed = new Date(date);
            if (!isNaN(parsed.getTime())) {
                return parsed.toISOString().split('T')[0];
            }
        } catch (e) {
            console.warn('Could not parse date:', date);
        }
        
        return '';
    }

    // Extract payment day from date
    extractPaymentDay(date) {
        const parsed = this.parseDate(date);
        if (parsed) {
            return new Date(parsed).getDate();
        }
        return 1;
    }

    // Extract payment records
    extractPayments(row) {
        const payments = {};
        
        Object.entries(this.monthColumns).forEach(([month, col]) => {
            if (row[col]) {
                payments[month.toLowerCase()] = {
                    status: String(row[col]),
                    amount: this.parseAmount(row[col + 1])
                };
            }
        });
        
        return payments;
    }

    // Import students to Firebase
    async importToFirebase(students, onProgress) {
        const total = students.length;
        let imported = 0;
        const errors = [];
        
        for (const student of students) {
            try {
                await window.StudentManager.saveStudent(student);
                imported++;
                
                if (onProgress) {
                    onProgress(imported, total);
                }
            } catch (error) {
                console.error('Error importing student:', student.nombre, error);
                errors.push({ student: student.nombre, error: error.message });
            }
        }
        
        return { imported, total, errors };
    }
}

// UI Functions
function renderImportModal() {
    return `
        <div id="importModal" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; 
                        max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h2>📥 Importar Estudiantes desde Excel</h2>
                
                <div style="background: #e0f2fe; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
                    <p style="margin: 0 0 0.5rem 0;"><strong>Instrucciones:</strong></p>
                    <ul style="margin: 0; padding-left: 1.5rem;">
                        <li>Selecciona tu archivo Excel con la lista de estudiantes</li>
                        <li>El archivo debe tener una hoja llamada "Lista Estudiantes"</li>
                        <li>Se importarán todos los campos disponibles</li>
                        <li>Los estudiantes existentes NO se duplicarán</li>
                    </ul>
                </div>
                
                <div class="form-group">
                    <label>Archivo Excel:</label>
                    <input type="file" id="excelFile" accept=".xlsx,.xls" 
                           onchange="previewImport()" style="width: 100%;">
                </div>
                
                <div id="importPreview" style="margin: 1rem 0;"></div>
                
                <div id="importProgress" style="display: none; margin: 1rem 0;">
                    <div style="background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden;">
                        <div id="progressBar" style="background: #3b82f6; height: 100%; width: 0%; 
                                                     transition: width 0.3s ease;"></div>
                    </div>
                    <p id="progressText" style="text-align: center; margin-top: 0.5rem;">0%</p>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button onclick="closeImportModal()" class="btn btn-secondary">
                        Cancelar
                    </button>
                    <button id="importBtn" onclick="startImport()" class="btn btn-primary" 
                            disabled>
                        📥 Importar
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Global functions
window.ExcelImporter = new ExcelImportManager();

window.showImportModal = function() {
    const modal = document.createElement('div');
    modal.innerHTML = renderImportModal();
    document.body.appendChild(modal);
};

window.closeImportModal = function() {
    document.getElementById('importModal')?.remove();
};

window.previewImport = async function() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    const preview = document.getElementById('importPreview');
    const importBtn = document.getElementById('importBtn');
    
    try {
        preview.innerHTML = '<div class="loading-spinner"></div> Analizando archivo...';
        
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
        window.studentsToImport = students;
        
    } catch (error) {
        preview.innerHTML = `
            <div style="background: #fee2e2; padding: 1rem; border-radius: 4px;">
                <h4 style="margin: 0; color: #dc2626;">❌ Error al leer archivo</h4>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">${error.message}</p>
            </div>
        `;
        importBtn.disabled = true;
    }
};

window.startImport = async function() {
    if (!window.studentsToImport || !window.studentsToImport.length) return;
    
    const importBtn = document.getElementById('importBtn');
    const progressDiv = document.getElementById('importProgress');
    const preview = document.getElementById('importPreview');
    
    importBtn.disabled = true;
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
        
        // Reload students tab if open
        if (document.getElementById('students').classList.contains('hidden') === false) {
            window.loadStudentsTab();
        }
        
    } catch (error) {
        console.error('❌ Import error:', error);
        alert(`❌ Error durante la importación: ${error.message}`);
    }
};

// Add import button to students tab
window.addEventListener('DOMContentLoaded', function() {
    // Override the loadStudentsTab function to add import button
    setTimeout(() => {
        const originalLoadStudentsTab = window.loadStudentsTab;
        window.loadStudentsTab = async function() {
            // Call the original function
            if (originalLoadStudentsTab) {
                await originalLoadStudentsTab();
            }
            
            // Wait a moment for the tab to render
            setTimeout(() => {
                // Check if import button exists
                if (!document.getElementById('importExcelBtn')) {
                    const studentsHeader = document.querySelector('#studentsContainer h2')?.parentElement;
                    if (studentsHeader) {
                        const btnContainer = studentsHeader.querySelector('div');
                        if (btnContainer) {
                            const importBtn = document.createElement('button');
                            importBtn.id = 'importExcelBtn';
                            importBtn.className = 'btn btn-secondary';
                            importBtn.innerHTML = '📥 Importar Excel';
                            importBtn.style.cssText = 'padding: 0.5rem 1rem; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;';
                          importBtn.addEventListener('click', function() {
                                if (window.showImportModal) {
                                    window.showImportModal();
                                } else {
                                    alert('Import function not found!');
                                }
                            };
                            btnContainer.insertBefore(importBtn, btnContainer.firstChild);
                            console.log('✅ Import button added!');
                        }
                    }
                }
            }, 500);
        };
        console.log('✅ Import button auto-add configured');
    }, 3000); // Wait 3 seconds for everything to load
});

// Add XLSX library if not already loaded
if (typeof XLSX === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    document.head.appendChild(script);
}

console.log('✅ Excel import utility loaded');
