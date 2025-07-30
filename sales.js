// sales.js - FIREBASE INTEGRATED VERSION - ENHANCED WITH DYNAMIC CONVENIOS
// ================================================================================
// SECTION A: CONTACT MANAGEMENT FUNCTIONS
// ================================================================================

// ===== FUNCIÓN 1: ADD CONTACT =====
async function addContact(event) {
    event.preventDefault();
    
    if (!window.FirebaseData || !window.FirebaseData.currentUser) {
        showNotification('❌ Firebase no disponible o usuario no autenticado. Recarga la página.', 'error');
        return;
    }
    
    // Disable submit button to prevent double submission
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="loading-spinner" style="width: 12px; height: 12px; display: inline-block; margin-right: 0.5rem;"></div>Guardando...';
    
    try {
        let source = document.getElementById('contactSource').value;
        
        // Handle convenio selection
        if (source === 'CONVENIO') {
            const convenio = document.getElementById('contactConvenio').value;
            if (!convenio) {
                showNotification('⚠️ Selecciona un convenio específico', 'warning');
                return;
            }
            source = `CONVENIO: ${convenio}`;
        }
        
        const contact = {
            name: document.getElementById('contactName').value.trim(),
            phone: document.getElementById('contactPhone').value.trim(),
            email: document.getElementById('contactEmail').value.trim(),
            source: source,
            convenio: source.includes('CONVENIO:') ? source.replace('CONVENIO: ', '') : null,
            location: document.getElementById('contactLocation').value,
            notes: document.getElementById('contactNotes').value.trim(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
            status: 'Nuevo'
        };
        
        // Validate required fields
        if (!contact.name || !contact.phone || !contact.source || !contact.location) {
            showNotification('⚠️ Completa todos los campos obligatorios', 'warning');
            return;
        }
        
        console.log('📤 Saving contact to Firebase:', contact);
        
        // Save to Firebase ONLY
        const savedContact = await window.FirebaseData.addContact(contact);
        console.log('✅ Contact saved to Firebase:', savedContact);
        
        // Clear form with animation
        clearFormWithAnimation(event.target);
        
        // Update all views with debouncing
        debounceUpdateViews();
        
        // Get stats for success message
        const userProfile = await window.FirebaseData.loadUserProfile();
        const allContacts = await window.FirebaseData.getFilteredContacts();
        const todayContacts = allContacts.filter(c => c.date === new Date().toISOString().split('T')[0]);
        
        showNotification(`✅ ¡Contacto guardado exitosamente!

👤 ${savedContact.name}
📞 ${savedContact.phone}
${savedContact.convenio ? `🤝 Convenio: ${savedContact.convenio}` : ''}
🔥 Sincronizado en tiempo real
📊 Tus contactos totales: ${allContacts.length}
📋 Contactos hoy: ${todayContacts.length}`, 'success');
        
        // Auto-focus back to name field for next contact
        setTimeout(() => {
            document.getElementById('contactName').focus();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error saving to Firebase:', error);
        showNotification(`❌ Error al guardar en Firebase: ${error.message}`, 'error');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ===== FUNCIÓN 2: HANDLE SOURCE CHANGE - ENHANCED =====
async function handleSourceChange() {
    const sourceSelect = document.getElementById('contactSource');
    const convenioGroup = document.getElementById('convenioGroup');
    const convenioSelect = document.getElementById('contactConvenio');
    
    console.log('🔍 Source changed to:', sourceSelect.value);
    
    if (sourceSelect.value === 'CONVENIO') {
        console.log('✅ Loading convenios from Firebase...');
        
        // Show loading state
        convenioSelect.innerHTML = '<option value="">Cargando convenios...</option>';
        convenioGroup.style.display = 'block';
        convenioGroup.classList.add('slide-in');
        convenioSelect.required = true;
        
        try {
            // Load convenios from Firebase
            const convenios = await window.FirebaseData.getConvenios();
            console.log('📋 Loaded convenios:', convenios);
            
            // Populate dropdown
            if (convenios && convenios.length > 0) {
                convenioSelect.innerHTML = '<option value="">Seleccionar convenio...</option>' +
                    convenios.map(conv => `<option value="${conv}">${conv}</option>`).join('');
            } else {
                convenioSelect.innerHTML = '<option value="">No hay convenios configurados</option>';
                showNotification('⚠️ No hay convenios configurados. Contacta al administrador.', 'warning');
            }
        } catch (error) {
            console.error('❌ Error loading convenios:', error);
            convenioSelect.innerHTML = '<option value="">Error cargando convenios</option>';
            showNotification('❌ Error al cargar convenios', 'error');
        }
    } else {
        console.log('❌ Hiding convenio dropdown');
        convenioGroup.classList.remove('slide-in');
        convenioGroup.classList.add('slide-out');
        
        setTimeout(() => {
            convenioGroup.style.display = 'none';
            convenioGroup.classList.remove('slide-out');
        }, 300);
        
        convenioSelect.required = false;
        convenioSelect.value = '';
    }
}

// ===== FUNCIÓN 3: LOAD CONVENIOS ON PAGE LOAD =====
async function loadConveniosOnInit() {
    try {
        if (!window.FirebaseData) {
            console.log('⚠️ Firebase not ready for loading convenios');
            return;
        }
        
        const convenios = await window.FirebaseData.getConvenios();
        console.log('🔄 Pre-loaded convenios for faster access:', convenios?.length || 0);
        
        // Cache convenios for faster access
        window.cachedConvenios = convenios || [];
    } catch (error) {
        console.error('❌ Error pre-loading convenios:', error);
        window.cachedConvenios = [];
    }
}

// ================================================================================
// SECTION B: LEAD MANAGEMENT FUNCTIONS
// ================================================================================

// ===== FUNCIÓN 4: DELETE LEAD - ENHANCED =====
async function deleteLead(leadId) {
    if (!window.FirebaseData || !window.FirebaseData.currentUser) {
        showNotification('❌ Firebase no disponible', 'error');
        return;
    }
    
    try {
        // Get all contacts to find the lead
        const allContacts = await window.FirebaseData.getAllContacts();
        const lead = allContacts.find(l => l.id === leadId);
        
        if (!lead) {
            showNotification('❌ Lead no encontrado', 'error');
            return;
        }
        
        // Check permissions - salespeople can only delete their own leads
        const userProfile = await window.FirebaseData.loadUserProfile();
        if (userProfile.role !== 'director' && lead.salespersonId !== window.FirebaseData.currentUser.uid) {
            showNotification('❌ Solo puedes eliminar tus propios leads', 'error');
            return;
        }
        
        // Enhanced confirmation dialog
        const confirmResult = await showConfirmDialog({
            title: '🗑️ Confirmar Eliminación',
            message: `¿Estás seguro de eliminar el lead de "${lead.name}"?`,
            details: `📞 Teléfono: ${lead.phone}\n📍 Fuente: ${lead.source}\n👤 Vendedor: ${await getUserDisplayNameFirebase(lead.salespersonId)}`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            type: 'danger'
        });
        
        if (confirmResult) {
            await window.FirebaseData.deleteContact(leadId);
            console.log('✅ Lead deleted from Firebase:', leadId);
            
            // Animate removal and update views
            animateLeadRemoval(leadId);
            debounceUpdateViews();
            
            showNotification(`✅ Lead de "${lead.name}" eliminado correctamente`, 'success');
        }
    } catch (error) {
        console.error('❌ Error deleting from Firebase:', error);
        showNotification(`❌ Error al eliminar: ${error.message}`, 'error');
    }
}

// ===== FUNCIÓN 5: UPDATE LEADS TABLE - OPTIMIZED =====
async function updateLeadsTable() {
    console.log('📋 Updating Firebase leads table');
    
    if (!window.FirebaseData || !window.FirebaseData.currentUser) {
        console.log('❌ Firebase not available');
        const tbody = document.getElementById('leadsTable');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #dc2626; padding: 2rem;">❌ Firebase no disponible</td></tr>';
        }
        return;
    }
    
    try {
        const userProfile = await window.FirebaseData.loadUserProfile();
        if (!userProfile) {
            console.log('❌ No user profile available');
            return;
        }
        
        console.log('👤 User profile:', userProfile.role, userProfile.email);
        
        // Show loading state with skeleton
        showLeadsTableSkeleton();
        
        // Get filtered data from Firebase with caching
        let data = await getCachedFilteredContacts();
        console.log('   - Filtered Firebase data:', data.length, 'records');
        
        // Apply director filters if director is logged in
        if (userProfile.role === 'director') {
            const salespersonFilter = document.getElementById('salespersonFilter');
            const statusFilter = document.getElementById('statusFilter');
            
            if (salespersonFilter && salespersonFilter.value) {
                data = data.filter(lead => lead.salespersonId === salespersonFilter.value);
                console.log('   - Filtered by salesperson:', data.length, 'records');
            }
            if (statusFilter && statusFilter.value) {
                data = data.filter(lead => lead.status === statusFilter.value);
                console.log('   - Filtered by status:', data.length, 'records');
            }
        }
        
        const tbody = document.getElementById('leadsTable');
        if (!tbody) {
            console.log('❌ Leads table not found');
            return;
        }
        
        if (data.length === 0) {
            const colSpan = userProfile.role === 'director' ? '7' : '6';
            let message;
            
            if (userProfile.role === 'director') {
                const allUsers = await window.FirebaseData.getAllUsers();
                const salespeople = Object.values(allUsers).filter(u => u.role === 'vendedor').length;
                
                message = `No hay leads registrados por el equipo en Firebase.
                <div style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
                    👥 Usuarios en Firebase: ${Object.keys(allUsers).length} (${salespeople} vendedores)<br>
                    🔥 Base de datos: Firebase Realtime Database
                </div>
                <button onclick="diagnoseDirectorData()" class="btn btn-primary" style="margin-top: 1rem;">🔍 Diagnosticar Firebase</button>`;
            } else {
                message = `No tienes leads registrados en Firebase. 
                <div style="margin-top: 1rem;">
                    <button onclick="showTab('contacts')" class="btn btn-primary">➕ Agregar Contactos</button>
                </div>`;
            }
            
            tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; color: #666; padding: 2rem;">${message}</td></tr>`;
            return;
        }
        
        // Sort by date (newest first) with performance optimization
        data.sort((a, b) => {
            const dateA = new Date(a.date + ' ' + (a.time || '00:00:00'));
            const dateB = new Date(b.date + ' ' + (b.time || '00:00:00'));
            return dateB - dateA;
        });
        
        // Render table with virtual scrolling for large datasets
        tbody.innerHTML = await renderLeadsTableRows(data, userProfile);
        
        console.log('✅ Firebase leads table updated with', data.length, 'records');
        
        // Add table animations
        animateTableRows();
        
    } catch (error) {
        console.error('❌ Error updating Firebase leads table:', error);
        const tbody = document.getElementById('leadsTable');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #dc2626; padding: 2rem;">❌ Error: ${error.message}</td></tr>`;
        }
    }
}

// ===== FUNCIÓN 6: SHOW LEAD DETAILS - ENHANCED =====
async function showLeadDetails(leadId) {
    if (!window.FirebaseData || !window.FirebaseData.currentUser) {
        showNotification('❌ Firebase no disponible', 'error');
        return;
    }
    
    try {
        const allContacts = await window.FirebaseData.getAllContacts();
        const lead = allContacts.find(l => l.id === leadId);
        
        if (!lead) {
            showNotification('❌ Lead no encontrado en Firebase', 'error');
            return;
        }
        
        const salespersonName = await getUserDisplayNameFirebase(lead.salespersonId);
        
        // Enhanced lead details modal
        await showLeadDetailsModal({
            lead: lead,
            salespersonName: salespersonName,
            actions: ['edit', 'whatsapp', 'delete', 'pipeline']
        });
        
    } catch (error) {
        console.error('❌ Error showing lead details:', error);
        showNotification(`❌ Error al mostrar detalles: ${error.message}`, 'error');
    }
}

// ================================================================================
// SECTION C: UI/UX ENHANCEMENT FUNCTIONS
// ================================================================================

// ===== FUNCIÓN 7: SHOW NOTIFICATION - ENHANCED =====
function showNotification(message, type = 'info', duration = 5000) {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification-toast');
    existing.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        font-size: 0.9rem;
        line-height: 1.4;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        white-space: pre-line;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>${message}</div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; margin-left: 1rem; opacity: 0.8;">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// ===== FUNCIÓN 8: CLEAR FORM WITH ANIMATION =====
function clearFormWithAnimation(form) {
    // Animate form fields clearing
    const fields = form.querySelectorAll('input, select, textarea');
    
    fields.forEach((field, index) => {
        setTimeout(() => {
            field.style.transform = 'scale(0.95)';
            field.style.opacity = '0.7';
            
            setTimeout(() => {
                field.value = '';
                field.style.transform = 'scale(1)';
                field.style.opacity = '1';
            }, 150);
        }, index * 50);
    });
    
    // Reset convenio dropdown
    document.getElementById('convenioGroup').style.display = 'none';
    document.getElementById('contactConvenio').required = false;
}

// ===== FUNCIÓN 9: DEBOUNCE UPDATE VIEWS =====
let updateViewsTimeout;
function debounceUpdateViews() {
    clearTimeout(updateViewsTimeout);
    updateViewsTimeout = setTimeout(() => {
        updateAllViews();
    }, 300);
}

// ===== FUNCIÓN 10: SHOW LEADS TABLE SKELETON =====
function showLeadsTableSkeleton() {
    const tbody = document.getElementById('leadsTable');
    if (!tbody) return;
    
    const skeletonRows = Array.from({length: 5}, (_, i) => `
        <tr class="skeleton-row">
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
        </tr>
    `).join('');
    
    tbody.innerHTML = skeletonRows;
    
    // Add skeleton styles if not exists
    if (!document.getElementById('skeleton-styles')) {
        const style = document.createElement('style');
        style.id = 'skeleton-styles';
        style.textContent = `
            .skeleton-text {
                height: 16px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
                border-radius: 4px;
                width: 80%;
            }
            @keyframes skeleton-loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            .skeleton-row { opacity: 0.7; }
        `;
        document.head.appendChild(style);
    }
}

// ===== FUNCIÓN 11: RENDER LEADS TABLE ROWS - OPTIMIZED =====
async function renderLeadsTableRows(data, userProfile) {
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
    const rows = await Promise.all(data.map(async (lead) => {
        const salespersonCell = userProfile.role === 'director' 
            ? `<td><span class="salesperson-badge">${await getUserDisplayNameFirebase(lead.salespersonId)}</span></td>`
            : '';
        
        // Check if user can delete this lead
        const canDelete = userProfile.role === 'director' || lead.salespersonId === window.FirebaseData.currentUser.uid;
        
        // Enhanced source display with convenio highlighting
        let sourceDisplay = lead.source;
        if (lead.source.includes('CONVENIO:')) {
            const convenio = lead.source.replace('CONVENIO: ', '');
            sourceDisplay = `<span class="convenio-badge">🤝 ${convenio}</span>`;
        } else if (lead.source.length > 25) {
            sourceDisplay = `<span title="${lead.source}">${lead.source.substring(0, 25)}...</span>`;
        }
        
        return `
            <tr class="lead-row" data-lead-id="${lead.id}">
                <td class="lead-name">${lead.name}</td>
                <td class="lead-phone">
                    <div>${lead.phone}</div>
                    <button onclick="openWhatsApp('${lead.phone}', '${lead.name}')" class="whatsapp-mini-btn" title="Abrir WhatsApp">
                        💬
                    </button>
                </td>
                <td class="lead-source">${sourceDisplay}</td>
                <td><span class="status-badge status-${lead.status.toLowerCase().replace(' ', '').replace('ó', 'o')}">${lead.status}</span></td>
                <td class="lead-date">${formatDateEnhanced(lead.date, lead.time)}</td>
                ${salespersonCell}
                <td class="lead-actions">
                    <div class="action-buttons">
                        <button onclick="showLeadDetails('${lead.id}')" class="btn-action btn-view" title="Ver detalles">
                            📋
                        </button>
                        <button onclick="editLeadInline('${lead.id}')" class="btn-action btn-edit" title="Editar">
                            ✏️
                        </button>
                        ${canDelete ? `<button onclick="deleteLead('${lead.id}')" class="btn-action btn-delete" title="Eliminar">🗑️</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }));
    
    return rows.join('');
}

// ===== FUNCIÓN 12: ANIMATE TABLE ROWS =====
function animateTableRows() {
    const rows = document.querySelectorAll('.lead-row');
    rows.forEach((row, index) => {
        row.style.opacity = '0';
        row.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            row.style.transition = 'all 0.3s ease';
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

// ===== FUNCIÓN 13: ANIMATE LEAD REMOVAL =====
function animateLeadRemoval(leadId) {
    const row = document.querySelector(`[data-lead-id="${leadId}"]`);
    if (row) {
        row.style.transform = 'translateX(-100%)';
        row.style.opacity = '0';
        setTimeout(() => row.remove(), 300);
    }
}

// ================================================================================
// SECTION D: PERFORMANCE OPTIMIZATION FUNCTIONS
// ================================================================================

// ===== FUNCIÓN 14: GET CACHED FILTERED CONTACTS =====
let contactsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30000; // 30 seconds

async function getCachedFilteredContacts() {
    const now = Date.now();
    
    if (contactsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        console.log('📦 Using cached contacts data');
        return contactsCache;
    }
    
    console.log('🔄 Refreshing contacts cache');
    contactsCache = await window.FirebaseData.getFilteredContacts();
    cacheTimestamp = now;
    
    return contactsCache;
}

// ===== FUNCIÓN 15: INVALIDATE CACHE =====
function invalidateContactsCache() {
    contactsCache = null;
    cacheTimestamp = null;
    console.log('🗑️ Contacts cache invalidated');
}

// ===== FUNCIÓN 16: BATCH UPDATE VIEWS =====
let batchUpdateQueued = false;
function batchUpdateAllViews() {
    if (batchUpdateQueued) return;
    
    batchUpdateQueued = true;
    requestAnimationFrame(() => {
        updateAllViews();
        batchUpdateQueued = false;
    });
}

// ================================================================================
// SECTION E: UTILITY FUNCTIONS - ENHANCED
// ================================================================================

// ===== FUNCIÓN 17: OPEN WHATSAPP - ENHANCED =====
function openWhatsApp(phone, name, customMessage = null) {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = customMessage || `Hola ${name}, te contacto desde Ciudad Bilingüe. ¿Cómo estás?`;
    const url = `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    // Analytics tracking
    console.log('📱 Opening WhatsApp for:', name, phone);
    
    window.open(url, '_blank');
    
    // Show confirmation
    showNotification(`📱 Abriendo WhatsApp para ${name}`, 'info', 2000);
}

// ===== FUNCIÓN 18: EDIT LEAD INLINE =====
async function editLeadInline(leadId) {
    try {
        const allContacts = await window.FirebaseData.getAllContacts();
        const lead = allContacts.find(l => l.id === leadId);
        
        if (!lead) {
            showNotification('❌ Lead no encontrado', 'error');
            return;
        }
        
        // Check permissions
        const userProfile = await window.FirebaseData.loadUserProfile();
        if (userProfile.role !== 'director' && lead.salespersonId !== window.FirebaseData.currentUser.uid) {
            showNotification('❌ Solo puedes editar tus propios leads', 'error');
            return;
        }
        
        // Show inline edit modal
        await showInlineEditModal(lead);
        
    } catch (error) {
        console.error('❌ Error editing lead:', error);
        showNotification(`❌ Error al editar: ${error.message}`, 'error');
    }
}

// ===== FUNCIÓN 19: GET USER DISPLAY NAME FIREBASE - OPTIMIZED =====
const userNamesCache = new Map();

async function getUserDisplayNameFirebase(userId) {
    try {
        if (!userId) return 'Unknown User';
        
        // Check cache first
        if (userNamesCache.has(userId)) {
            return userNamesCache.get(userId);
        }
        
        const allUsers = await window.FirebaseData.getAllUsers();
        const user = allUsers[userId];
        
        let displayName = 'Unknown User';
        
        if (user && user.name) {
            displayName = user.name;
        } else if (user && user.email) {
            displayName = user.email.split('@')[0];
        }
        
        // Cache the result
        userNamesCache.set(userId, displayName);
        
        return displayName;
    } catch (error) {
        console.error('❌ Error getting user display name:', error);
        return 'Unknown User';
    }
}

// ===== FUNCIÓN 20: FORMAT DATE ENHANCED =====
function formatDateEnhanced(dateString, timeString = null) {
    try {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();
        
        let dateDisplay;
        if (isToday) {
            dateDisplay = 'Hoy';
        } else if (isYesterday) {
            dateDisplay = 'Ayer';
        } else {
            dateDisplay = date.toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'short' 
            });
        }
        
        const timeDisplay = timeString ? 
            timeString.substring(0, 5) : 
            date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="date-display">
                <div class="date-part">${dateDisplay}</div>
                <div class="time-part">${timeDisplay}</div>
            </div>
        `;
    } catch (error) {
        return dateString || 'Sin fecha';
    }
}

// ===== FUNCIÓN 21: UPDATE ALL VIEWS - OPTIMIZED =====
async function updateAllViews() {
    try {
        console.log('🔄 Updating all views...');
        
        // Invalidate cache to ensure fresh data
        invalidateContactsCache();
        
        // Update views concurrently for better performance
        const updatePromises = [
            updateStats(),
            updateLeadsTable()
        ];
        
        // Only update monitoring if user is director
        const userProfile = await window.FirebaseData.loadUserProfile();
        if (userProfile && userProfile.role === 'director') {
            updatePromises.push(refreshMonitoring());
        }
        
        await Promise.all(updatePromises);
        
        console.log('✅ All views updated successfully');
    } catch (error) {
        console.error('❌ Error updating views:', error);
        showNotification('⚠️ Error al actualizar vistas', 'warning');
    }
}

// ===== FUNCIÓN 22: INITIALIZE ENHANCED UI =====
function initializeEnhancedUI() {
    console.log('🎨 Initializing enhanced UI...');
    
    // Add custom CSS for enhanced UI
    addEnhancedStyles();
    
    // Load convenios on page load
    if (window.FirebaseData) {
        loadConveniosOnInit();
    } else {
        // Wait for Firebase to be ready
        window.addEventListener('firebaseReady', loadConveniosOnInit);
    }
    
    // Add keyboard shortcuts
    addKeyboardShortcuts();
    
    // Add performance monitoring
    monitorPerformance();
    
    console.log('✅ Enhanced UI initialized');
}

// ===== FUNCIÓN 23: ADD ENHANCED STYLES =====
function addEnhancedStyles() {
    if (document.getElementById('enhanced-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'enhanced-styles';
    style.textContent = `
        /* Enhanced animations */
        .slide-in {
            animation: slideIn 0.3s ease-out;
        }
        
        .slide-out {
            animation: slideOut 0.3s ease-in;
        }
        
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
        }
        
        /* Enhanced badges */
        .salesperson-badge {
            background: #667eea;
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        .convenio-badge {
            background: #10b981;
            color: white;
            padding: 0.2rem 0.6rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        /* Enhanced action buttons */
        .action-buttons {
            display: flex;
            gap: 0.25rem;
        }
        
        .btn-action {
            background: none;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 0.3rem 0.5rem;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.8rem;
        }
        
        .btn-action:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .btn-view:hover { background: #dbeafe; border-color: #3b82f6; }
        .btn-edit:hover { background: #fef3c7; border-color: #f59e0b; }
        .btn-delete:hover { background: #fee2e2; border-color: #ef4444; }
        
        /* Enhanced phone display */
        .lead-phone {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .whatsapp-mini-btn {
            background: #25d366;
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            cursor: pointer;
            font-size: 0.7rem;
            transition: transform 0.2s ease;
        }
        
        .whatsapp-mini-btn:hover {
            transform: scale(1.1);
        }
        
        /* Enhanced date display */
        .date-display {
            font-size: 0.85rem;
        }
        
        .date-part {
            font-weight: 500;
            color: #374151;
        }
        
        .time-part {
            color: #6b7280;
            font-size: 0.8rem;
        }
        
        /* Form enhancements */
        .form-group {
            position: relative;
        }
        
        .form-group input:focus + .form-label,
        .form-group select:focus + .form-label {
            color: #667eea;
        }
        
        /* Loading enhancements */
        .loading-spinner {
            border: 2px solid #f3f4f6;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        /* Responsive enhancements */
        @media (max-width: 768px) {
            .action-buttons {
                flex-direction: column;
                gap: 0.125rem;
            }
            
            .btn-action {
                padding: 0.4rem;
                font-size: 0.9rem;
            }
            
            .salesperson-badge {
                font-size: 0.7rem;
                padding: 0.1rem 0.4rem;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// ===== FUNCIÓN 24: ADD KEYBOARD SHORTCUTS =====
function addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to submit form
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const activeForm = document.querySelector('form:focus-within');
            if (activeForm) {
                e.preventDefault();
                activeForm.dispatchEvent(new Event('submit'));
            }
        }
        
        // Escape to clear form
        if (e.key === 'Escape') {
            const activeForm = document.querySelector('form:focus-within');
            if (activeForm) {
                activeForm.reset();
                clearFormWithAnimation(activeForm);
            }
        }
        
        // Ctrl/Cmd + R to refresh data
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            refreshData();
        }
    });
    
    console.log('⌨️ Keyboard shortcuts enabled');
}

// ===== FUNCIÓN 25: MONITOR PERFORMANCE =====
function monitorPerformance() {
    let loadTimes = [];
    
    window.addEventListener('beforeunload', () => {
        const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
        console.log('📊 Average operation time:', avgLoadTime.toFixed(2), 'ms');
    });
    
    // Override updateLeadsTable to monitor performance
    const originalUpdateLeadsTable = updateLeadsTable;
    updateLeadsTable = async function() {
        const start = performance.now();
        await originalUpdateLeadsTable();
        const end = performance.now();
        loadTimes.push(end - start);
        console.log('⚡ updateLeadsTable took:', (end - start).toFixed(2), 'ms');
    };
}

// ================================================================================
// INITIALIZATION
// ================================================================================

// Initialize enhanced UI when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEnhancedUI);
} else {
    initializeEnhancedUI();
}

// Initialize when Firebase is ready
window.addEventListener('firebaseReady', () => {
    console.log('🔥 Firebase ready - initializing sales module');
    loadConveniosOnInit();
});

console.log('✅ Enhanced Sales.js loaded with 25 optimized functions');
