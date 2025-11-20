// ============================================================================
// PAYROLL IMPORT MODULE
// One-time CSV import functionality for historical payroll data (July-October 2025)
// ============================================================================

console.log('📦 Loading payroll import module...');

// ============================================================================
// CSV PARSER
// ============================================================================

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const rows = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by semicolon
        const columns = line.split(';').map(col => col.trim());
        rows.push(columns);
    }

    return rows;
}

// ============================================================================
// DATA CLASSIFICATION
// ============================================================================

function classifyRow(row, headers) {
    const nombre = row[0] || '';

    // Skip empty rows or totals
    if (!nombre || nombre.toUpperCase().includes('TOTAL')) {
        return { type: 'skip' };
    }

    // Operational expenses (known categories)
    const operationalKeywords = [
        'renta local', 'renta apto', 'energía', 'energia', 'agua',
        'unifianza', 'servicios de google', 'papelería', 'papeleria',
        'impresora', 'abogados', 'jesús', 'jesus'
    ];

    const nombreLower = nombre.toLowerCase();
    if (operationalKeywords.some(keyword => nombreLower.includes(keyword))) {
        return { type: 'operational' };
    }

    // Administrative staff (specific names with fixed salaries, no hours breakdown)
    const administrativeNames = [
        'estefania franco', 'adriana vera', 'angélica', 'angelica'
    ];

    if (administrativeNames.some(name => nombreLower.includes(name))) {
        return { type: 'administrative' };
    }

    // Teacher - has hours in CB/COATS/Nazaret columns OR has hourly rates
    const cbHoursIdx = headers.findIndex(h => h.toUpperCase() === 'CB');
    const coatsHoursIdx = headers.findIndex(h => h.toUpperCase() === 'COATS');
    const nazaretHoursIdx = headers.findIndex(h => h.toUpperCase().includes('NAZARET'));

    const hasCBHours = cbHoursIdx >= 0 && row[cbHoursIdx] && parseFloat(row[cbHoursIdx]) > 0;
    const hasCOATSHours = coatsHoursIdx >= 0 && row[coatsHoursIdx] && parseFloat(row[coatsHoursIdx]) > 0;
    const hasNazaretHours = nazaretHoursIdx >= 0 && row[nazaretHoursIdx] && parseFloat(row[nazaretHoursIdx]) > 0;

    if (hasCBHours || hasCOATSHours || hasNazaretHours) {
        return { type: 'teacher' };
    }

    // Check for "Otros conceptos" - additional payments
    if (nombreLower.includes('otros conceptos')) {
        return { type: 'other_concept' };
    }

    // Default to teacher if has name and cedula/email
    const cedulaIdx = headers.findIndex(h => h.toLowerCase().includes('cedula'));
    const hasCedula = cedulaIdx >= 0 && row[cedulaIdx];

    if (hasCedula) {
        return { type: 'teacher' };
    }

    return { type: 'skip' };
}

// ============================================================================
// CURRENCY PARSER
// ============================================================================

function parseCurrency(value) {
    if (!value) return 0;

    // Remove currency symbols, spaces, dots (thousand separators)
    // Replace comma with dot for decimals
    const cleaned = value.toString()
        .replace(/[$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

// ============================================================================
// EXTRACT TEACHER DATA
// ============================================================================

function extractTeacherData(row, headers) {
    const getColumnValue = (columnName) => {
        const idx = headers.findIndex(h => h.toLowerCase().includes(columnName.toLowerCase()));
        return idx >= 0 ? row[idx] : '';
    };

    const nombre = row[0] || '';
    const cedula = getColumnValue('cedula');
    const correo = getColumnValue('correo');

    // Rates
    const valorHoraCB = parseCurrency(getColumnValue('valor/hora cb')) || parseCurrency(getColumnValue('cb'));
    const valorHoraCoats = parseCurrency(getColumnValue('valor hora coats')) || parseCurrency(getColumnValue('coats'));
    const valorHoraNazaret = parseCurrency(getColumnValue('nazaret'));

    // Hours
    const cbHours = parseFloat(getColumnValue('cb')) || 0;
    const coatsHours = parseFloat(getColumnValue('coats')) || 0;
    const nazaretHours = parseFloat(getColumnValue('h nazaret')) || parseFloat(getColumnValue('nazaret')) || 0;

    // Payment info
    const metodoPago = getColumnValue('metodo de pago');
    const honorarios = parseCurrency(getColumnValue('honorarios'));
    const abono = getColumnValue('abono');
    const cuenta = getColumnValue('columna 1');
    const banco = getColumnValue('columna 2');

    return {
        personalInfo: {
            name: nombre,
            cedula: cedula || '',
            email: correo || '',
            phone: ''
        },
        rates: {
            cb: valorHoraCB,
            coats: valorHoraCoats,
            nazaret: valorHoraNazaret
        },
        hours: {
            cb: cbHours,
            coats: coatsHours,
            nazaret: nazaretHours
        },
        bankInfo: {
            account: cuenta || '',
            bank: banco || '',
            method: metodoPago || ''
        },
        totalHonorarios: honorarios,
        notes: abono
    };
}

// ============================================================================
// EXTRACT ADMINISTRATIVE DATA
// ============================================================================

function extractAdministrativeData(row, headers) {
    const getColumnValue = (columnName) => {
        const idx = headers.findIndex(h => h.toLowerCase().includes(columnName.toLowerCase()));
        return idx >= 0 ? row[idx] : '';
    };

    const nombre = row[0] || '';
    const cedula = getColumnValue('cedula');
    const correo = getColumnValue('correo');
    const metodoPago = getColumnValue('metodo de pago');
    const honorarios = parseCurrency(getColumnValue('honorarios'));
    const cuenta = getColumnValue('columna 1');
    const banco = getColumnValue('columna 2');

    return {
        personalInfo: {
            name: nombre,
            cedula: cedula || '',
            email: correo || '',
            phone: ''
        },
        position: 'Administrativo',
        salary: honorarios,
        frequency: 'mensual',
        bankInfo: {
            account: cuenta || '',
            bank: banco || '',
            method: metodoPago || ''
        }
    };
}

// ============================================================================
// EXTRACT OPERATIONAL EXPENSE DATA
// ============================================================================

function extractOperationalData(row, headers) {
    const getColumnValue = (columnName) => {
        const idx = headers.findIndex(h => h.toLowerCase().includes(columnName.toLowerCase()));
        return idx >= 0 ? row[idx] : '';
    };

    const nombre = row[0] || '';
    const metodoPago = getColumnValue('metodo de pago');
    const honorarios = parseCurrency(getColumnValue('honorarios'));

    // Map category names
    let category = nombre.toLowerCase();
    if (category.includes('renta local')) category = 'renta_local';
    else if (category.includes('renta apto')) category = 'renta_apto';
    else if (category.includes('energía') || category.includes('energia')) category = 'energia';
    else if (category.includes('agua')) category = 'agua';
    else if (category.includes('unifianza')) category = 'unifianza';
    else if (category.includes('google')) category = 'servicios_google';
    else if (category.includes('papelería') || category.includes('papeleria')) category = 'papeleria';
    else if (category.includes('impresora')) category = 'impresora';
    else if (category.includes('abogados')) category = 'abogados';
    else category = nombre; // Keep original name

    return {
        category,
        amount: honorarios,
        method: metodoPago || 'transferencia',
        notes: ''
    };
}

// ============================================================================
// IMPORT SINGLE CSV FILE
// ============================================================================

async function importCSVFile(csvText, month, year) {
    console.log(`📂 Importing data for ${month}/${year}...`);

    const rows = parseCSV(csvText);
    if (rows.length === 0) {
        console.log('⚠️ No data found in CSV');
        return { success: false, error: 'No data found' };
    }

    const headers = rows[0];
    console.log('📋 Headers:', headers);

    const results = {
        teachers: [],
        administrative: [],
        operational: [],
        skipped: 0,
        errors: []
    };

    // Process each row (skip header)
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const classification = classifyRow(row, headers);

        try {
            if (classification.type === 'teacher') {
                const teacherData = extractTeacherData(row, headers);
                results.teachers.push(teacherData);
            } else if (classification.type === 'administrative') {
                const adminData = extractAdministrativeData(row, headers);
                results.administrative.push(adminData);
            } else if (classification.type === 'operational') {
                const opData = extractOperationalData(row, headers);
                results.operational.push(opData);
            } else {
                results.skipped++;
            }
        } catch (error) {
            console.error(`Error processing row ${i}:`, error);
            results.errors.push({ row: i, error: error.message });
        }
    }

    console.log('✅ Parsing complete:', {
        teachers: results.teachers.length,
        administrative: results.administrative.length,
        operational: results.operational.length,
        skipped: results.skipped,
        errors: results.errors.length
    });

    // Save to Firebase
    await saveImportedData(results, month, year);

    return { success: true, results };
}

// ============================================================================
// SAVE IMPORTED DATA TO FIREBASE
// ============================================================================

async function saveImportedData(results, month, year) {
    console.log('💾 Saving imported data to Firebase...');

    const database = window.firebaseModules.database;
    const db = window.firebaseModules.db;

    // 1. Save/update teachers
    for (const teacherData of results.teachers) {
        try {
            // Check if teacher already exists (by name or cedula)
            let teacherId = null;

            // Try to find existing teacher
            const teachersSnapshot = await window.firebaseModules.get(
                window.firebaseModules.ref(db, 'payroll/teachers')
            );

            if (teachersSnapshot.exists()) {
                const teachers = teachersSnapshot.val();
                for (const [id, teacher] of Object.entries(teachers)) {
                    if (teacher.personalInfo.name === teacherData.personalInfo.name ||
                        (teacher.personalInfo.cedula && teacher.personalInfo.cedula === teacherData.personalInfo.cedula)) {
                        teacherId = id;
                        console.log(`👤 Found existing teacher: ${teacherData.personalInfo.name}`);
                        break;
                    }
                }
            }

            // Create new teacher if not found
            if (!teacherId) {
                teacherId = `T${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                console.log(`✨ Creating new teacher: ${teacherData.personalInfo.name}`);

                await window.firebaseModules.set(
                    window.firebaseModules.ref(db, `payroll/teachers/${teacherId}`),
                    {
                        id: teacherId,
                        personalInfo: teacherData.personalInfo,
                        rates: teacherData.rates,
                        bankInfo: teacherData.bankInfo,
                        status: 'active',
                        createdAt: Date.now()
                    }
                );
            }

            // Create classes for this month if teacher has hours
            const classes = [];
            const firstDayOfMonth = new Date(year, month - 1, 1);

            if (teacherData.hours.cb > 0) {
                classes.push({
                    id: `C${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    teacherId,
                    location: 'cb',
                    date: firstDayOfMonth.toISOString().split('T')[0],
                    hours: teacherData.hours.cb,
                    rate: teacherData.rates.cb,
                    subtotal: teacherData.hours.cb * teacherData.rates.cb,
                    notes: 'Importado desde CSV',
                    timestamp: Date.now()
                });
            }

            if (teacherData.hours.coats > 0) {
                classes.push({
                    id: `C${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    teacherId,
                    location: 'coats',
                    date: firstDayOfMonth.toISOString().split('T')[0],
                    hours: teacherData.hours.coats,
                    rate: teacherData.rates.coats,
                    subtotal: teacherData.hours.coats * teacherData.rates.coats,
                    notes: 'Importado desde CSV',
                    timestamp: Date.now()
                });
            }

            if (teacherData.hours.nazaret > 0) {
                classes.push({
                    id: `C${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    teacherId,
                    location: 'nazaret',
                    date: firstDayOfMonth.toISOString().split('T')[0],
                    hours: teacherData.hours.nazaret,
                    rate: teacherData.rates.nazaret,
                    subtotal: teacherData.hours.nazaret * teacherData.rates.nazaret,
                    notes: 'Importado desde CSV',
                    timestamp: Date.now()
                });
            }

            // Save monthly payroll entry
            if (classes.length > 0) {
                await window.firebaseModules.set(
                    window.firebaseModules.ref(db, `payroll/monthlyPayroll/${year}/${month}/teachers/${teacherId}`),
                    {
                        teacherId,
                        classes,
                        advances: [],
                        totalHonorarios: teacherData.totalHonorarios
                    }
                );
            }

        } catch (error) {
            console.error(`Error saving teacher ${teacherData.personalInfo.name}:`, error);
        }
    }

    // 2. Save administrative staff
    for (const adminData of results.administrative) {
        try {
            // Check if employee already exists
            let employeeId = null;

            const adminSnapshot = await window.firebaseModules.get(
                window.firebaseModules.ref(db, 'payroll/administrative')
            );

            if (adminSnapshot.exists()) {
                const employees = adminSnapshot.val();
                for (const [id, employee] of Object.entries(employees)) {
                    if (employee.personalInfo.name === adminData.personalInfo.name) {
                        employeeId = id;
                        console.log(`👤 Found existing employee: ${adminData.personalInfo.name}`);
                        break;
                    }
                }
            }

            // Create new employee if not found
            if (!employeeId) {
                employeeId = `A${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                console.log(`✨ Creating new employee: ${adminData.personalInfo.name}`);

                await window.firebaseModules.set(
                    window.firebaseModules.ref(db, `payroll/administrative/${employeeId}`),
                    {
                        id: employeeId,
                        personalInfo: adminData.personalInfo,
                        position: adminData.position,
                        salary: adminData.salary,
                        frequency: adminData.frequency,
                        bankInfo: adminData.bankInfo,
                        status: 'active',
                        createdAt: Date.now()
                    }
                );
            }

            // Save monthly payroll entry
            await window.firebaseModules.set(
                window.firebaseModules.ref(db, `payroll/monthlyPayroll/${year}/${month}/administrative/${employeeId}`),
                {
                    employeeId,
                    salary: adminData.salary,
                    advances: []
                }
            );

        } catch (error) {
            console.error(`Error saving employee ${adminData.personalInfo.name}:`, error);
        }
    }

    // 3. Save operational expenses
    for (const opData of results.operational) {
        try {
            const expenseId = `OP${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const firstDayOfMonth = new Date(year, month - 1, 1);

            await window.firebaseModules.set(
                window.firebaseModules.ref(db, `payroll/operationalExpenses/${year}/${month}/${expenseId}`),
                {
                    id: expenseId,
                    category: opData.category,
                    date: firstDayOfMonth.toISOString().split('T')[0],
                    amount: opData.amount,
                    method: opData.method,
                    notes: 'Importado desde CSV',
                    timestamp: Date.now()
                }
            );

        } catch (error) {
            console.error(`Error saving operational expense:`, error);
        }
    }

    console.log('✅ Data saved to Firebase successfully');
}

// ============================================================================
// IMPORT MODAL UI
// ============================================================================

window.showImportPayrollModal = function() {
    const modalHTML = `
        <div id="importModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001; overflow-y: auto; padding: 2rem;">
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 700px; width: 90%;">
                <h2 style="margin: 0 0 1.5rem 0;">📥 Importar Datos Históricos de Nómina</h2>

                <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 1rem; margin-bottom: 1.5rem; border-radius: 4px;">
                    <strong>ℹ️ Información:</strong><br>
                    <span style="color: #666; font-size: 0.9rem;">
                        Esta función importará datos históricos desde archivos CSV (Julio-Octubre 2025).<br>
                        Los datos incluyen profesores, personal administrativo y gastos operativos.
                    </span>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                        📅 Seleccionar Mes
                    </label>
                    <select id="importMonth" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;">
                        <option value="">Seleccionar mes...</option>
                        <option value="7-2025">Julio 2025</option>
                        <option value="8-2025">Agosto 2025</option>
                        <option value="9-2025">Septiembre 2025</option>
                        <option value="10-2025">Octubre 2025</option>
                    </select>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                        📄 Archivo CSV
                    </label>
                    <input type="file" id="importFile" accept=".csv"
                        style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;">
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: #666;">
                        Formato esperado: NOMBRE;cedula;correo;...
                    </p>
                </div>

                <div id="importPreview" style="display: none; margin-bottom: 1.5rem; padding: 1rem; background: #f9f9f9; border-radius: 8px; max-height: 200px; overflow-y: auto;">
                    <h4 style="margin: 0 0 0.5rem 0;">Vista Previa:</h4>
                    <pre id="previewContent" style="margin: 0; font-size: 0.8rem; white-space: pre-wrap;"></pre>
                </div>

                <div id="importProgress" style="display: none; margin-bottom: 1.5rem;">
                    <div style="background: #e5e7eb; border-radius: 8px; height: 8px; overflow: hidden;">
                        <div id="progressBar" style="background: #10b981; height: 100%; width: 0%; transition: width 0.3s;"></div>
                    </div>
                    <p id="progressText" style="margin: 0.5rem 0 0 0; text-align: center; font-size: 0.9rem; color: #666;"></p>
                </div>

                <div style="display: flex; gap: 1rem;">
                    <button type="button" onclick="closeImportModal()"
                        style="flex: 1; padding: 0.75rem; background: #f5f5f5; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;">
                        Cancelar
                    </button>
                    <button type="button" onclick="processImport()" id="importBtn"
                        style="flex: 1; padding: 0.75rem; background: #10b981; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 500;">
                        📥 Importar Datos
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // File preview
    document.getElementById('importFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const preview = event.target.result.split('\n').slice(0, 5).join('\n');
                document.getElementById('previewContent').textContent = preview + '\n...';
                document.getElementById('importPreview').style.display = 'block';
            };
            reader.readAsText(file, 'UTF-8');
        }
    });
};

window.closeImportModal = function() {
    const modal = document.getElementById('importModal');
    if (modal) modal.remove();
};

window.processImport = async function() {
    const monthSelect = document.getElementById('importMonth').value;
    const fileInput = document.getElementById('importFile');

    if (!monthSelect) {
        alert('⚠️ Por favor selecciona un mes');
        return;
    }

    if (!fileInput.files[0]) {
        alert('⚠️ Por favor selecciona un archivo CSV');
        return;
    }

    const [month, year] = monthSelect.split('-');
    const file = fileInput.files[0];

    // Show progress
    document.getElementById('importProgress').style.display = 'block';
    document.getElementById('importBtn').disabled = true;
    document.getElementById('progressText').textContent = 'Leyendo archivo...';
    document.getElementById('progressBar').style.width = '20%';

    try {
        // Read file
        const csvText = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file, 'UTF-8');
        });

        document.getElementById('progressText').textContent = 'Procesando datos...';
        document.getElementById('progressBar').style.width = '50%';

        // Import data
        const result = await importCSVFile(csvText, parseInt(month), parseInt(year));

        document.getElementById('progressText').textContent = 'Guardando en Firebase...';
        document.getElementById('progressBar').style.width = '90%';

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 500));

        document.getElementById('progressBar').style.width = '100%';
        document.getElementById('progressText').textContent = '✅ Importación completada!';

        // Show summary
        const summary = result.results;
        alert(`✅ Importación completada!\n\n` +
              `Profesores: ${summary.teachers.length}\n` +
              `Personal Administrativo: ${summary.administrative.length}\n` +
              `Gastos Operativos: ${summary.operational.length}\n` +
              `Filas omitidas: ${summary.skipped}\n` +
              `Errores: ${summary.errors.length}`);

        // Reload payroll tab
        if (window.loadPayrollTab) {
            await window.loadPayrollTab();
        }

        closeImportModal();

    } catch (error) {
        console.error('Import error:', error);
        document.getElementById('progressText').textContent = '❌ Error en la importación';
        alert('❌ Error al importar datos: ' + error.message);
        document.getElementById('importBtn').disabled = false;
    }
};

// ============================================================================
// QUICK IMPORT FUNCTIONS (for pre-loaded CSV paths)
// ============================================================================

window.quickImportMonth = async function(month, year, csvPath) {
    console.log(`🚀 Quick import for ${month}/${year} from ${csvPath}`);

    try {
        const response = await fetch(csvPath);
        const csvText = await response.text();
        const result = await importCSVFile(csvText, month, year);

        console.log('✅ Quick import completed:', result);
        return result;
    } catch (error) {
        console.error('Quick import error:', error);
        throw error;
    }
};

// ============================================================================
// BATCH IMPORT ALL MONTHS
// ============================================================================

window.importAllHistoricalData = async function() {
    const confirm = window.confirm(
        '⚠️ ¿Estás seguro de importar TODOS los datos históricos?\n\n' +
        'Esto importará:\n' +
        '- Julio 2025\n' +
        '- Agosto 2025\n' +
        '- Septiembre 2025\n' +
        '- Octubre 2025\n\n' +
        'Este proceso puede tardar varios minutos.'
    );

    if (!confirm) return;

    alert('🚧 Para importar todos los meses, debes usar el importador individual.\n\n' +
          'Selecciona cada mes y su archivo CSV correspondiente en el importador.');

    showImportPayrollModal();
};

console.log('✅ Payroll import module loaded successfully');
console.log('💡 Use window.showImportPayrollModal() to import CSV data');
