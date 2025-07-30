// sales.js - CONTACT MANAGEMENT MODULE - COMPLETE VERSION
// ===== CONTACT MANAGEMENT AND FORM HANDLING =====

// Global variables for sales module
let cachedConvenios = [];
let salesModuleInitialized = false;

// ===== MAIN CONTACT FORM HANDLER =====
async function handleAddContact(event) {
    event.preventDefault();
    
    if (!window.FirebaseData || !window.FirebaseData.currentUser) {
        alert('❌ Firebase no disponible o usuario no autenticado. Recarga la página.');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="loading-spinner" style="width: 12px; height: 12px; display: inline-block; margin-right: 0.5rem;"></div>Guardando...';
    
    try {
        let source = document.getElementById('contactSource').value;
        if (source === 'CONVENIO') {
            const convenio = document.getElementById('contactConvenio').value;
            if (!convenio) {
                alert('⚠️ Selecciona un convenio');
                return;
            }
            source = `CONVENIO: ${convenio}`;
        }
        
        const contact = {
            name: document.getElementById('contactName').value.trim(),
            phone: document.getElementById('contactPhone').value.trim(),
            email: document.getElementById('contactEmail').value.trim(),
            source: source,
            location: document.getElementById('contactLocation').value,
            notes: document.getElementById('contactNotes').value.trim(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
            status: 'Nuevo'
        };
        
        if (!contact.name || !contact.phone || !contact.source || !contact.location) {
            alert('⚠️ Completa todos los campos obligatorios');
            return;
        }
        
        console.log('📤 Saving contact to Firebase:', contact);
        
        const savedContact = await window.FirebaseData.addContact(contact);
        console.log('✅ Contact saved to Firebase:', savedContact);
        
        // Clear form
        clearContactForm(event.target);
        
        // Update views
        setTimeout(() => {
            if (typeof updateStats === 'function') updateStats();
            if (typeof updateLeadsTable === 'function') updateLeadsTable();
        }, 500);
        
        alert(`✅ ¡Contacto guardado en Firebase!

👤 ${savedContact.name}
📞 ${savedContact.phone}
🔥 Sistema funcionando correctamente`);
        
    } catch (error) {
        console.error('❌ Error saving to Firebase:', error);
        alert(`❌ Error al guardar en Firebase: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ===== SOURCE CHANGE HANDLER - FIXED VERSION =====
async function handleSourceChange() {
    console.log('🔄 Source changed');
    
    const sourceSelect = document.getElementById('contactSource');
    const convenioGroup = document.getElementById('convenioGroup');
    const convenioSelect = document.getElementById('contactConvenio');
    
    if (!sourceSelect || !convenioGroup || !convenioSelect) {
        console.error('❌ Required elements not found');
        return;
    }
    
    console.log('🔍 Source value:', sourceSelect.value);
    
    if (sourceSelect.value === 'CONVENIO') {
        console.log('✅ Showing convenio dropdown');
        
        // Show convenio group
        convenioGroup.classList.remove('hidden');
        convenioSelect.required = true;
        
        // Show loading state
        convenioSelect.innerHTML = '<option value="">Cargando convenios...</option>';
        
        try {
            // Load convenios from Firebase
            let convenios = cachedConvenios;
            if (!convenios || convenios.length === 0) {
                convenios = await window.FirebaseData.getConvenios();
                cachedConvenios = convenios || [];
            }
            
            console.log('📋 Loaded convenios for dropdown:', convenios);
            
            // Populate dropdown
            if (convenios && convenios.length > 0) {
                convenioSelect.innerHTML = '<option value="">Seleccionar convenio...</option>' +
                    convenios.map(conv => `<option value="${conv}">${conv}</option>`).join('');
                console.log('✅ Convenio dropdown populated');
            } else {
                convenioSelect.innerHTML = '<option value="">No hay convenios configurados</option>';
                alert('⚠️ No hay convenios configurados. Contacta al administrador.');
            }
        } catch (error) {
            console.error('❌ Error loading convenios:', error);
            convenioSelect.innerHTML = '<option value="">Error cargando convenios</option>';
            alert('❌ Error al cargar convenios');
        }
    } else {
        console.log('❌ Hiding convenio dropdown');
        convenioGroup.classList.add('hidden');
        convenioSelect.required = false;
        convenioSelect.value = '';
    }
}

// ===== FORM UTILITIES =====
function clearContactForm(form) {
    console.log('🧹 Clearing contact form');
    
    // Reset form
    form.reset();
    
    // Hide convenio group
    const convenioGroup = document.getElementById('convenioGroup');
    const convenioSelect = document.getElementById('contactConvenio');
    
    if (convenioGroup) {
        convenioGroup.classList.add('hidden');
    }
    
    if (convenioSelect) {
        convenioSelect.required = false;
        convenioSelect.value = '';
    }
    
    // Focus on first field
    const firstField = form.querySelector('input');
    if (firstField) {
        firstField.focus();
    }
}

// ===== CONVENIOS MANAGEMENT =====
async function loadConvenios() {
    try {
        console.log('🤝 Loading convenios for sales module');
        
        if (!window.FirebaseData) {
            console.log('⚠️ Firebase not ready');
            return;
        }
        
        const convenios = await window.FirebaseData.getConvenios();
        console.log('📋 Loaded convenios:', convenios);
        
        cachedConvenios = convenios || [];
        
        return cachedConvenios;
        
    } catch (error) {
        console.error('❌ Error loading convenios:', error);
        cachedConvenios = [];
        return [];
    }
}

async function refreshConveniosCache() {
    console.log('🔄 Refreshing convenios cache');
    cachedConvenios = [];
    return await loadConvenios();
}

// ===== CONTACT VALIDATION =====
function validateContactData(contact) {
    const errors = [];
    
    // Required field validation
    if (!contact.name || contact.name.trim().length < 2) {
        errors.push('Nombre debe tener al menos 2 caracteres');
    }
    
    if (!contact.phone || contact.phone.trim().length < 7) {
        errors.push('Teléfono debe tener al menos 7 caracteres');
    }
    
    // Phone format validation (Colombian numbers)
    const phoneRegex = /^[3][0-9]{9}$/;
    const cleanPhone = contact.phone ? contact.phone.replace(/\D/g, '') : '';
    if (cleanPhone && !phoneRegex.test(cleanPhone) && cleanPhone.length !== 10) {
        errors.push('Formato de teléfono inválido (debe ser celular colombiano)');
    }
    
    // Email validation if provided
    if (contact.email && contact.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contact.email.trim())) {
            errors.push('Formato de email inválido');
        }
    }
    
    // Source validation
    const validSources = ['Facebook', 'Instagram', 'Google', 'Referido', 'Volante', 'Pasando por la sede'];
    if (!contact.source || (!validSources.includes(contact.source) && !contact.source.includes('CONVENIO:'))) {
        errors.push('Fuente de contacto inválida');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// ===== CONTACT FORM ENHANCEMENTS =====
function addContactFormEnhancements() {
    console.log('🎨 Adding contact form enhancements');
    
    // Add real-time validation
    const nameField = document.getElementById('contactName');
    const phoneField = document.getElementById('contactPhone');
    const emailField = document.getElementById('contactEmail');
    
    if (nameField) {
        nameField.addEventListener('blur', function() {
            if (this.value.trim().length < 2) {
                this.style.borderColor = '#ef4444';
            } else {
                this.style.borderColor = '#10b981';
            }
        });
    }
    
    if (phoneField) {
        phoneField.addEventListener('input', function() {
            // Auto-format phone number
            let value = this.value.replace(/\D/g, '');
            if (value.length > 10) value = value.substring(0, 10);
            this.value = value;
            
            if (value.length === 10 && value.startsWith('3')) {
                this.style.borderColor = '#10b981';
            } else if (value.length > 0) {
                this.style.borderColor = '#f59e0b';
            } else {
                this.style.borderColor = '#e1e5e9';
            }
        });
    }
    
    if (emailField) {
        emailField.addEventListener('blur', function() {
            if (this.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value)) {
                this.style.borderColor = '#ef4444';
            } else if (this.value) {
                this.style.borderColor = '#10b981';
            } else {
                this.style.borderColor = '#e1e5e9';
            }
        });
    }
}

// ===== CONTACT STATISTICS =====
async function getContactStats() {
    try {
        if (!window.FirebaseData) return null;
        
        const contacts = await window.FirebaseData.getFilteredContacts();
        const today = new Date().toISOString().split('T')[0];
        
        return {
            total: contacts.length,
            today: contacts.filter(c => c.date === today).length,
            thisWeek: getThisWeekContacts(contacts).length,
            conversions: contacts.filter(c => c.status === 'Convertido').length,
            sources: getSourceBreakdown(contacts)
        };
    } catch (error) {
        console.error('❌ Error getting contact stats:', error);
        return null;
    }
}

function getThisWeekContacts(contacts) {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    return contacts.filter(c => {
        const contactDate = new Date(c.date);
        return contactDate >= weekStart;
    });
}

function getSourceBreakdown(contacts) {
    const breakdown = {};
    contacts.forEach(contact => {
        const source = contact.source || 'No especificado';
        breakdown[source] = (breakdown[source] || 0) + 1;
    });
    return breakdown;
}

// ===== CONTACT SEARCH AND FILTER =====
function searchContacts(query, contacts) {
    if (!query || !contacts) return contacts || [];
    
    const searchTerm = query.toLowerCase().trim();
    
    return contacts.filter(contact => 
        (contact.name || '').toLowerCase().includes(searchTerm) ||
        (contact.phone || '').includes(searchTerm) ||
        (contact.email || '').toLowerCase().includes(searchTerm) ||
        (contact.source || '').toLowerCase().includes(searchTerm) ||
        (contact.notes || '').toLowerCase().includes(searchTerm)
    );
}

// ===== EXPORT FUNCTIONALITY =====
function exportContactsToCSV(contacts) {
    if (!contacts || contacts.length === 0) {
        alert('⚠️ No hay contactos para exportar');
        return;
    }
    
    const headers = ['Nombre', 'Teléfono', 'Email', 'Fuente', 'Ubicación', 'Estado', 'Fecha', 'Hora', 'Notas'];
    const csvContent = [
        headers.join(','),
        ...contacts.map(contact => [
            `"${contact.name || ''}"`,
            contact.phone || '',
            contact.email || '',
            `"${contact.source || ''}"`,
            contact.location || '',
            contact.status || '',
            contact.date || '',
            contact.time || '',
            `"${(contact.notes || '').replace(/"/g, '""')}"`
        ].join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contactos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    console.log('📥 Contacts exported to CSV');
}

// ===== WHATSAPP INTEGRATION =====
function openWhatsApp(phone, name, customMessage = null) {
    if (!phone) {
        alert('⚠️ Número de teléfono no disponible');
        return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const message = customMessage || `Hola ${name || 'estimado cliente'}, te contacto desde Ciudad Bilingüe. ¿Cómo estás?`;
    const url = `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    console.log('📱 Opening WhatsApp for:', name, phone);
    
    window.open(url, '_blank');
    
    // Show confirmation
    if (typeof showNotification === 'function') {
        showNotification(`📱 Abriendo WhatsApp para ${name || 'contacto'}`, 'info', 2000);
    }
}

// ===== CONTACT PRIORITIES =====
function calculateContactPriority(contact) {
    let priority = 'Medium';
    
    // High priority conditions
    if (contact.source && contact.source.includes('CONVENIO:')) {
        priority = 'High';
    } else if (contact.source === 'Referido') {
        priority = 'High';
    } else if (contact.email && contact.email.includes('@')) {
        priority = 'Medium';
    } else {
        priority = 'Low';
    }
    
    return priority;
}

function calculateLeadScore(contact) {
    let score = 50; // Base score
    
    // Source scoring
    if (contact.source && contact.source.includes('CONVENIO:')) {
        score += 30;
    } else if (contact.source === 'Referido') {
        score += 25;
    } else if (contact.source === 'Google') {
        score += 20;
    } else if (['Facebook', 'Instagram'].includes(contact.source)) {
        score += 15;
    }
    
    // Email bonus
    if (contact.email && contact.email.includes('@')) {
        score += 10;
    }
    
    // Notes bonus
    if (contact.notes && contact.notes.length > 20) {
        score += 5;
    }
    
    // Location scoring (local gets higher score)
    if (['Pereira', 'Dosquebradas'].includes(contact.location)) {
        score += 10;
    }
    
    return Math.min(score, 100); // Cap at 100
}

// ===== QUICK ACTIONS =====
async function duplicateContact(contactId) {
    try {
        const allContacts = await window.FirebaseData.getAllContacts();
        const contact = allContacts.find(c => c.id === contactId);
        
        if (!contact) {
            alert('❌ Contacto no encontrado');
            return;
        }
        
        // Create duplicate with modified data
        const duplicate = {
            ...contact,
            name: contact.name + ' (Copia)',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
            status: 'Nuevo'
        };
        
        // Remove Firebase-specific fields
        delete duplicate.id;
        delete duplicate.createdAt;
        delete duplicate.salespersonId;
        delete duplicate.salespersonEmail;
        
        const saved = await window.FirebaseData.addContact(duplicate);
        console.log('✅ Contact duplicated:', saved);
        
        alert(`✅ Contacto duplicado: ${duplicate.name}`);
        
        // Refresh views
        if (typeof updateLeadsTable === 'function') updateLeadsTable();
        
    } catch (error) {
        console.error('❌ Error duplicating contact:', error);
        alert(`❌ Error al duplicar contacto: ${error.message}`);
    }
}

// ===== BULK OPERATIONS =====
async function bulkUpdateStatus(contactIds, newStatus) {
    if (!contactIds || contactIds.length === 0) {
        alert('⚠️ No se han seleccionado contactos');
        return;
    }
    
    const validStatuses = ['Nuevo', 'Contactado', 'Interesado', 'Negociación', 'Convertido', 'Perdido'];
    
    if (!validStatuses.includes(newStatus)) {
        alert('❌ Estado inválido');
        return;
    }
    
    try {
        let updated = 0;
        
        for (const id of contactIds) {
            try {
                await window.FirebaseData.updateContact(id, { status: newStatus });
                updated++;
            } catch (error) {
                console.error('❌ Error updating contact:', id, error);
            }
        }
        
        alert(`✅ ${updated} contactos actualizados a estado: ${newStatus}`);
        
        // Refresh views
        if (typeof updateLeadsTable === 'function') updateLeadsTable();
        if (typeof updateStats === 'function') updateStats();
        
    } catch (error) {
        console.error('❌ Error in bulk update:', error);
        alert(`❌ Error en actualización masiva: ${error.message}`);
    }
}

// ===== INITIALIZATION =====
function initializeSalesModule() {
    console.log('🚀 Initializing sales module');
    
    if (salesModuleInitialized) {
        console.log('⚠️ Sales module already initialized');
        return;
    }
    
    try {
        // Load convenios
        loadConvenios();
        
        // Add form enhancements
        addContactFormEnhancements();
        
        // Set flag
        salesModuleInitialized = true;
        
        console.log('✅ Sales module initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing sales module:', error);
    }
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 Sales module DOM ready');
    
    // Initialize when Firebase is ready
    if (window.FirebaseData) {
        initializeSalesModule();
    } else {
        window.addEventListener('firebaseReady', initializeSalesModule);
    }
});

// ===== EXPORT MODULE =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleAddContact,
        handleSourceChange,
        loadConvenios,
        validateContactData,
        getContactStats,
        searchContacts,
        exportContactsToCSV,
        openWhatsApp,
        calculateContactPriority,
        calculateLeadScore,
        duplicateContact,
        bulkUpdateStatus
    };
}

console.log('✅ Sales.js module loaded successfully');
