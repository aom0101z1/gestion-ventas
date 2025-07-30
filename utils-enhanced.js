// utils-enhanced.js - ENHANCED UTILITY FUNCTIONS
// ===== ADDITIONAL ENHANCED FUNCTIONS FOR CRM SYSTEM =====
// Modal systems, notifications, formatting, and convenio management
// ================================================================================

// ===== ENHANCED MODAL SYSTEM =====

// ===== FUNCIÓN EXTRA 1: SHOW CONFIRM DIALOG =====
function showConfirmDialog(options) {
    console.log('⚡ FUNCIÓN EXTRA 1: Show Confirm Dialog');
    
    return new Promise((resolve) => {
        const {
            title = '🤔 Confirmar Acción',
            message = '¿Estás seguro?',
            details = '',
            confirmText = 'Confirmar',
            cancelText = 'Cancelar',
            type = 'default'
        } = options;
        
        // Remove existing modals
        const existingModal = document.querySelector('.enhanced-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'enhanced-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const typeColors = {
            default: '#3b82f6',
            danger: '#ef4444',
            warning: '#f59e0b',
            success: '#10b981'
        };
        
        const color = typeColors[type] || typeColors.default;
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                border-radius: 12px;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                transform: translateY(20px);
                transition: transform 0.3s ease;
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid ${color};
                ">
                    <div style="
                        width: 48px;
                        height: 48px;
                        border-radius: 50%;
                        background: ${color};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.5rem;
                        color: white;
                    ">
                        ${type === 'danger' ? '⚠️' : type === 'warning' ? '🔔' : type === 'success' ? '✅' : '🤔'}
                    </div>
                    <h3 style="margin: 0; color: #1f2937; font-size: 1.25rem;">
                        ${title}
                    </h3>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <p style="
                        margin: 0 0 ${details ? '1rem' : '0'} 0;
                        color: #374151;
                        font-size: 1rem;
                        line-height: 1.5;
                    ">
                        ${message}
                    </p>
                    ${details ? `
                        <div style="
                            background: #f9fafb;
                            padding: 1rem;
                            border-radius: 8px;
                            font-family: monospace;
                            font-size: 0.9rem;
                            color: #6b7280;
                            white-space: pre-line;
                        ">
                            ${details}
                        </div>
                    ` : ''}
                </div>
                
                <div style="
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                ">
                    <button class="modal-cancel" style="
                        padding: 0.75rem 1.5rem;
                        border: 2px solid #e5e7eb;
                        background: white;
                        color: #6b7280;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.2s ease;
                    ">
                        ${cancelText}
                    </button>
                    <button class="modal-confirm" style="
                        padding: 0.75rem 1.5rem;
                        border: 2px solid ${color};
                        background: ${color};
                        color: white;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.2s ease;
                    ">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        const cancelBtn = modal.querySelector('.modal-cancel');
        const confirmBtn = modal.querySelector('.modal-confirm');
        
        cancelBtn.addEventListener('click', () => {
            closeModal(modal);
            resolve(false);
        });
        
        confirmBtn.addEventListener('click', () => {
            closeModal(modal);
            resolve(true);
        });
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
                resolve(false);
            }
        });
        
        // Close on escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal(modal);
                resolve(false);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // Add to DOM and animate
        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.style.opacity = '1';
            const content = modal.querySelector('.modal-content');
            content.style.transform = 'translateY(0)';
        }, 10);
        
        // Focus confirm button
        setTimeout(() => {
            confirmBtn.focus();
        }, 300);
    });
}

// ===== FUNCIÓN EXTRA 2: CLOSE MODAL =====
function closeModal(modal) {
    console.log('⚡ FUNCIÓN EXTRA 2: Close Modal');
    
    modal.style.opacity = '0';
    const content = modal.querySelector('.modal-content');
    content.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        modal.remove();
    }, 300);
}

// ===== FUNCIÓN EXTRA 3: SHOW LEAD DETAILS MODAL =====
async function showLeadDetailsModal(options) {
    console.log('⚡ FUNCIÓN EXTRA 3: Show Lead Details Modal');
    
    const { lead, salespersonName, actions = [] } = options;
    
    return new Promise((resolve) => {
        // Remove existing modals
        const existingModal = document.querySelector('.enhanced-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'enhanced-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
            overflow-y: auto;
            padding: 2rem;
        `;
        
        // Determine status color
        const statusColors = {
            'Nuevo': '#fbbf24',
            'Contactado': '#3b82f6',
            'Interesado': '#10b981',
            'Negociación': '#f97316',
            'Convertido': '#22c55e',
            'Perdido': '#ef4444'
        };
        
        const statusColor = statusColors[lead.status] || '#6b7280';
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                border-radius: 12px;
                max-width: 600px;
                width: 100%;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                transform: translateY(20px);
                transition: transform 0.3s ease;
                max-height: 90vh;
                overflow-y: auto;
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, ${statusColor}, ${statusColor}dd);
                    color: white;
                    padding: 2rem;
                    border-radius: 12px 12px 0 0;
                    position: relative;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem;">
                                👤 ${lead.name}
                            </h2>
                            <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                                <span style="
                                    background: rgba(255,255,255,0.2);
                                    padding: 0.25rem 0.75rem;
                                    border-radius: 20px;
                                    font-size: 0.9rem;
                                    font-weight: 500;
                                ">
                                    📊 ${lead.status}
                                </span>
                                ${lead.priority ? `
                                    <span style="
                                        background: rgba(255,255,255,0.2);
                                        padding: 0.25rem 0.75rem;
                                        border-radius: 20px;
                                        font-size: 0.9rem;
                                    ">
                                        ⭐ ${lead.priority}
                                    </span>
                                ` : ''}
                                ${lead.score ? `
                                    <span style="
                                        background: rgba(255,255,255,0.2);
                                        padding: 0.25rem 0.75rem;
                                        border-radius: 20px;
                                        font-size: 0.9rem;
                                    ">
                                        🎯 ${lead.score}/100
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                        <button onclick="this.closest('.enhanced-modal').remove()" style="
                            background: rgba(255,255,255,0.2);
                            border: none;
                            color: white;
                            border-radius: 50%;
                            width: 40px;
                            height: 40px;
                            cursor: pointer;
                            font-size: 1.2rem;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            ✕
                        </button>
                    </div>
                </div>
                
                <!-- Content -->
                <div style="padding: 2rem;">
                    <!-- Contact Information -->
                    <div style="margin-bottom: 2rem;">
                        <h3 style="
                            margin: 0 0 1rem 0;
                            color: #1f2937;
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                        ">
                            📞 Información de Contacto
                        </h3>
                        <div style="
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                            gap: 1rem;
                        ">
                            <div style="
                                background: #f9fafb;
                                padding: 1rem;
                                border-radius: 8px;
                                border-left: 4px solid #3b82f6;
                            ">
                                <div style="font-weight: 600; color: #6b7280; font-size: 0.8rem; margin-bottom: 0.25rem;">
                                    TELÉFONO
                                </div>
                                <div style="font-size: 1.1rem; color: #1f2937; display: flex; align-items: center; gap: 0.5rem;">
                                    ${lead.phone}
                                    <button onclick="openWhatsApp('${lead.phone}', '${lead.name}')" style="
                                        background: #25d366;
                                        border: none;
                                        border-radius: 50%;
                                        width: 28px;
                                        height: 28px;
                                        cursor: pointer;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        font-size: 0.8rem;
                                    " title="Abrir WhatsApp">
                                        💬
                                    </button>
                                </div>
                            </div>
                            
                            ${lead.email ? `
                                <div style="
                                    background: #f9fafb;
                                    padding: 1rem;
                                    border-radius: 8px;
                                    border-left: 4px solid #10b981;
                                ">
                                    <div style="font-weight: 600; color: #6b7280; font-size: 0.8rem; margin-bottom: 0.25rem;">
                                        EMAIL
                                    </div>
                                    <div style="font-size: 1rem; color: #1f2937;">
                                        ${lead.email}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div style="
                                background: #f9fafb;
                                padding: 1rem;
                                border-radius: 8px;
                                border-left: 4px solid #f59e0b;
                            ">
                                <div style="font-weight: 600; color: #6b7280; font-size: 0.8rem; margin-bottom: 0.25rem;">
                                    UBICACIÓN
                                </div>
                                <div style="font-size: 1rem; color: #1f2937;">
                                    📍 ${lead.location}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Source and Details -->
                    <div style="margin-bottom: 2rem;">
                        <h3 style="
                            margin: 0 0 1rem 0;
                            color: #1f2937;
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                        ">
                            📍 Origen y Detalles
                        </h3>
                        <div style="
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                            gap: 1rem;
                        ">
                            <div style="
                                background: #f9fafb;
                                padding: 1rem;
                                border-radius: 8px;
                                border-left: 4px solid #8b5cf6;
                            ">
                                <div style="font-weight: 600; color: #6b7280; font-size: 0.8rem; margin-bottom: 0.25rem;">
                                    FUENTE
                                </div>
                                <div style="font-size: 1rem; color: #1f2937;">
                                    ${lead.source.includes('CONVENIO:') ? 
                                        `🤝 ${lead.source.replace('CONVENIO: ', '')}` : 
                                        lead.source}
                                </div>
                            </div>
                            
                            <div style="
                                background: #f9fafb;
                                padding: 1rem;
                                border-radius: 8px;
                                border-left: 4px solid #ec4899;
                            ">
                                <div style="font-weight: 600; color: #6b7280; font-size: 0.8rem; margin-bottom: 0.25rem;">
                                    VENDEDOR
                                </div>
                                <div style="font-size: 1rem; color: #1f2937;">
                                    👨‍💼 ${salespersonName}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Timeline -->
                    <div style="margin-bottom: 2rem;">
                        <h3 style="
                            margin: 0 0 1rem 0;
                            color: #1f2937;
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                        ">
                            ⏰ Timeline
                        </h3>
                        <div style="
                            background: #f9fafb;
                            padding: 1rem;
                            border-radius: 8px;
                            border-left: 4px solid #6366f1;
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span style="font-weight: 600; color: #6b7280; font-size: 0.8rem;">CREADO</span>
                                <span style="color: #1f2937;">${formatDateEnhanced(lead.date, lead.time)}</span>
                            </div>
                            ${lead.updatedAt ? `
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 600; color: #6b7280; font-size: 0.8rem;">ACTUALIZADO</span>
                                    <span style="color: #1f2937;">${new Date(lead.updatedAt).toLocaleString('es-ES')}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Notes -->
                    ${lead.notes ? `
                        <div style="margin-bottom: 2rem;">
                            <h3 style="
                                margin: 0 0 1rem 0;
                                color: #1f2937;
                                display: flex;
                                align-items: center;
                                gap: 0.5rem;
                            ">
                                📝 Notas
                            </h3>
                            <div style="
                                background: #f9fafb;
                                padding: 1rem;
                                border-radius: 8px;
                                border-left: 4px solid #14b8a6;
                                color: #1f2937;
                                line-height: 1.5;
                            ">
                                ${lead.notes}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Firebase Info -->
                    <div style="margin-bottom: 2rem;">
                        <h3 style="
                            margin: 0 0 1rem 0;
                            color: #1f2937;
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                        ">
                            🔥 Información Firebase
                        </h3>
                        <div style="
                            background: #fff7ed;
                            padding: 1rem;
                            border-radius: 8px;
                            border-left: 4px solid #ff6b35;
                            font-family: monospace;
                            font-size: 0.9rem;
                            color: #9a3412;
                        ">
                            ID: ${lead.id}<br>
                            Salesperson ID: ${lead.salespersonId}<br>
                            ${lead.createdAt ? `Created: ${new Date(lead.createdAt).toLocaleString('es-ES')}` : ''}
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div style="
                        display: flex;
                        gap: 1rem;
                        justify-content: center;
                        flex-wrap: wrap;
                        padding-top: 1rem;
                        border-top: 1px solid #e5e7eb;
                    ">
                        ${actions.includes('edit') ? `
                            <button onclick="editLeadInline('${lead.id}'); this.closest('.enhanced-modal').remove();" style="
                                background: #f59e0b;
                                color: white;
                                border: none;
                                padding: 0.75rem 1.5rem;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: 600;
                                transition: all 0.2s ease;
                            ">
                                ✏️ Editar
                            </button>
                        ` : ''}
                        
                        ${actions.includes('whatsapp') ? `
                            <button onclick="openWhatsApp('${lead.phone}', '${lead.name}'); this.closest('.enhanced-modal').remove();" style="
                                background: #25d366;
                                color: white;
                                border: none;
                                padding: 0.75rem 1.5rem;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: 600;
                                transition: all 0.2s ease;
                            ">
                                💬 WhatsApp
                            </button>
                        ` : ''}
                        
                        ${actions.includes('pipeline') ? `
                            <button onclick="showTab('pipeline'); this.closest('.enhanced-modal').remove();" style="
                                background: #8b5cf6;
                                color: white;
                                border: none;
                                padding: 0.75rem 1.5rem;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: 600;
                                transition: all 0.2s ease;
                            ">
                                🎯 Ver en Pipeline
                            </button>
                        ` : ''}
                        
                        <button onclick="this.closest('.enhanced-modal').remove()" style="
                            background: #6b7280;
                            color: white;
                            border: none;
                            padding: 0.75rem 1.5rem;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.2s ease;
                        ">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
                resolve();
            }
        });
        
        // Close on escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal(modal);
                resolve();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // Add to DOM and animate
        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.style.opacity = '1';
            const content = modal.querySelector('.modal-content');
            content.style.transform = 'translateY(0)';
        }, 10);
    });
}

// ===== FUNCIÓN EXTRA 4: SHOW INLINE EDIT MODAL =====
async function showInlineEditModal(lead) {
    console.log('⚡ FUNCIÓN EXTRA 4: Show Inline Edit Modal');
    
    return new Promise((resolve) => {
        // Remove existing modals
        const existingModal = document.querySelector('.enhanced-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'enhanced-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
            padding: 2rem;
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                border-radius: 12px;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                transform: translateY(20px);
                transition: transform 0.3s ease;
                max-height: 90vh;
                overflow-y: auto;
            ">
                <div style="
                    background: linear-gradient(135deg, #3b82f6, #1e40af);
                    color: white;
                    padding: 1.5rem;
                    border-radius: 12px 12px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                        ✏️ Editar Lead
                    </h3>
                    <button onclick="this.closest('.enhanced-modal').remove()" style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        border-radius: 50%;
                        width: 32px;
                        height: 32px;
                        cursor: pointer;
                        font-size: 1rem;
                    ">✕</button>
                </div>
                
                <form id="editLeadForm" style="padding: 2rem;">
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                            Nombre:
                        </label>
                        <input type="text" id="editName" value="${lead.name}" style="
                            width: 100%;
                            padding: 0.75rem;
                            border: 2px solid #e5e7eb;
                            border-radius: 8px;
                            font-size: 1rem;
                            transition: border-color 0.3s ease;
                        " required>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                            Teléfono:
                        </label>
                        <input type="tel" id="editPhone" value="${lead.phone}" style="
                            width: 100%;
                            padding: 0.75rem;
                            border: 2px solid #e5e7eb;
                            border-radius: 8px;
                            font-size: 1rem;
                            transition: border-color 0.3s ease;
                        " required>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                            Email:
                        </label>
                        <input type="email" id="editEmail" value="${lead.email || ''}" style="
                            width: 100%;
                            padding: 0.75rem;
                            border: 2px solid #e5e7eb;
                            border-radius: 8px;
                            font-size: 1rem;
                            transition: border-color 0.3s ease;
                        ">
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                            Estado:
                        </label>
                        <select id="editStatus" style="
                            width: 100%;
                            padding: 0.75rem;
                            border: 2px solid #e5e7eb;
                            border-radius: 8px;
                            font-size: 1rem;
                            transition: border-color 0.3s ease;
                        ">
                            <option value="Nuevo" ${lead.status === 'Nuevo' ? 'selected' : ''}>🟡 Nuevo</option>
                            <option value="Contactado" ${lead.status === 'Contactado' ? 'selected' : ''}>🔵 Contactado</option>
                            <option value="Interesado" ${lead.status === 'Interesado' ? 'selected' : ''}>🟢 Interesado</option>
                            <option value="Negociación" ${lead.status === 'Negociación' ? 'selected' : ''}>🟠 Negociación</option>
                            <option value="Convertido" ${lead.status === 'Convertido' ? 'selected' : ''}>✅ Convertido</option>
                            <option value="Perdido" ${lead.status === 'Perdido' ? 'selected' : ''}>❌ Perdido</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                            Ubicación:
                        </label>
                        <select id="editLocation" style="
                            width: 100%;
                            padding: 0.75rem;
                            border: 2px solid #e5e7eb;
                            border-radius: 8px;
                            font-size: 1rem;
                            transition: border-color 0.3s ease;
                        ">
                            <option value="Pereira" ${lead.location === 'Pereira' ? 'selected' : ''}>📍 Pereira</option>
                            <option value="Dosquebradas" ${lead.location === 'Dosquebradas' ? 'selected' : ''}>📍 Dosquebradas</option>
                            <option value="La Virginia" ${lead.location === 'La Virginia' ? 'selected' : ''}>📍 La Virginia</option>
                            <option value="Santa Rosa" ${lead.location === 'Santa Rosa' ? 'selected' : ''}>📍 Santa Rosa</option>
                            <option value="Otro" ${lead.location === 'Otro' ? 'selected' : ''}>📍 Otro</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 2rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                            Notas:
                        </label>
                        <textarea id="editNotes" rows="3" style="
                            width: 100%;
                            padding: 0.75rem;
                            border: 2px solid #e5e7eb;
                            border-radius: 8px;
                            font-size: 1rem;
                            transition: border-color 0.3s ease;
                            resize: vertical;
                        ">${lead.notes || ''}</textarea>
                    </div>
                    
                    <div style="
                        display: flex;
                        gap: 1rem;
                        justify-content: flex-end;
                    ">
                        <button type="button" onclick="this.closest('.enhanced-modal').remove()" style="
                            padding: 0.75rem 1.5rem;
                            border: 2px solid #e5e7eb;
                            background: white;
                            color: #6b7280;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                        ">
                            Cancelar
                        </button>
                        <button type="submit" style="
                            padding: 0.75rem 1.5rem;
                            border: 2px solid #3b82f6;
                            background: #3b82f6;
                            color: white;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                        ">
                            💾 Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        // Add form submit handler
        const form = modal.querySelector('#editLeadForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="loading-spinner" style="width: 12px; height: 12px; display: inline-block; margin-right: 0.5rem;"></div>Guardando...';
            
            try {
                const updates = {
                    name: document.getElementById('editName').value.trim(),
                    phone: document.getElementById('editPhone').value.trim(),
                    email: document.getElementById('editEmail').value.trim(),
                    status: document.getElementById('editStatus').value,
                    location: document.getElementById('editLocation').value,
                    notes: document.getElementById('editNotes').value.trim()
                };
                
                await window.AdminData.updateContact(lead.id, updates);
                
                showNotification('✅ Lead actualizado correctamente', 'success');
                
                // Refresh views
                updateAllViews();
                
                closeModal(modal);
                resolve(true);
                
            } catch (error) {
                console.error('❌ Error updating lead:', error);
                showNotification('❌ Error al actualizar lead', 'error');
                resolve(false);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
        
        // Add event listeners
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
                resolve(false);
            }
        });
        
        // Close on escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal(modal);
                resolve(false);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // Add to DOM and animate
        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.style.opacity = '1';
            const content = modal.querySelector('.modal-content');
            content.style.transform = 'translateY(0)';
        }, 10);
        
        // Focus first input
        setTimeout(() => {
            document.getElementById('editName').focus();
        }, 300);
    });
}

// ===== ENHANCED DATE FORMATTING =====

// ===== FUNCIÓN EXTRA 5: FORMAT DATE ENHANCED =====
function formatDateEnhanced(dateString, timeString = null) {
    console.log('⚡ FUNCIÓN EXTRA 5: Format Date Enhanced');
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        
        if (isNaN(date.getTime())) {
            return timeString || dateString || 'Fecha inválida';
        }
        
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        // Today
        if (diffDays === 0) {
            const time = timeString ? 
                timeString.substring(0, 5) : 
                date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            
            if (diffMinutes < 1) {
                return `<span style="color: #10b981; font-weight: 600;">🟢 Ahora mismo</span>`;
            } else if (diffMinutes < 60) {
                return `<span style="color: #10b981;">🟢 Hace ${diffMinutes}m</span>`;
            } else if (diffHours < 24) {
                return `<span style="color: #3b82f6;">🔵 Hoy ${time}</span>`;
            }
        }
        
        // Yesterday
        if (diffDays === 1) {
            const time = timeString ? 
                timeString.substring(0, 5) : 
                date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            return `<span style="color: #f59e0b;">🟡 Ayer ${time}</span>`;
        }
        
        // This week
        if (diffDays < 7) {
            const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
            const time = timeString ? 
                timeString.substring(0, 5) : 
                date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            return `<span style="color: #8b5cf6;">🟣 ${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${time}</span>`;
        }
        
        // This month
        if (diffDays < 30) {
            return `<span style="color: #6b7280;">⚫ Hace ${diffDays} días</span>`;
        }
        
        // Older
        const formattedDate = date.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'short',
            year: diffDays > 365 ? 'numeric' : undefined
        });
        return `<span style="color: #6b7280;">📅 ${formattedDate}</span>`;
        
    } catch (error) {
        console.error('Error formatting date:', error);
        return timeString || dateString || 'Fecha inválida';
    }
}

// ===== FUNCIÓN EXTRA 6: GET TIME AGO =====
function getTimeAgo(dateString, timeString = null) {
    console.log('⚡ FUNCIÓN EXTRA 6: Get Time Ago');
    
    try {
        const fullDateTime = timeString ? `${dateString} ${timeString}` : dateString;
        const date = new Date(fullDateTime);
        const now = new Date();
        
        if (isNaN(date.getTime())) {
            return 'Fecha inválida';
        }
        
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Ahora mismo';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
        if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mes`;
        return `${Math.floor(diffInSeconds / 31536000)}año`;
        
    } catch (error) {
        console.error('Error getting time ago:', error);
        return 'Error';
    }
}

// ===== ENHANCED CONVENIOS MANAGEMENT =====

// ===== FUNCIÓN EXTRA 7: TEST CONVENIOS SYSTEM =====
async function testConveniosSystem() {
    console.log('⚡ FUNCIÓN EXTRA 7: Test Convenios System');
    
    try {
        const results = {
            firebaseAvailable: !!window.FirebaseData,
            conveniosFunction: typeof window.FirebaseData?.getConvenios === 'function',
            conveniosLoaded: 0,
            handleSourceChangeExists: typeof handleSourceChange === 'function',
            domElements: {
                sourceSelect: !!document.getElementById('contactSource'),
                convenioGroup: !!document.getElementById('convenioGroup'),
                convenioSelect: !!document.getElementById('contactConvenio')
            },
            currentConvenios: []
        };
        
        if (results.firebaseAvailable && results.conveniosFunction) {
            try {
                const convenios = await window.FirebaseData.getConvenios();
                results.conveniosLoaded = convenios ? convenios.length : 0;
                results.currentConvenios = convenios || [];
            } catch (error) {
                results.error = error.message;
            }
        }
        
        const allWorking = results.firebaseAvailable && 
                          results.conveniosFunction && 
                          results.handleSourceChangeExists && 
                          Object.values(results.domElements).every(v => v);
        
        const report = `🧪 CONVENIOS SYSTEM TEST RESULTS:

🔥 Firebase Available: ${results.firebaseAvailable ? '✅' : '❌'}
⚙️ Get Convenios Function: ${results.conveniosFunction ? '✅' : '❌'}
📋 Convenios Loaded: ${results.conveniosLoaded} convenios
🔧 Handle Source Change: ${results.handleSourceChangeExists ? '✅' : '❌'}

📋 DOM ELEMENTS:
- Source Select: ${results.domElements.sourceSelect ? '✅' : '❌'}
- Convenio Group: ${results.domElements.convenioGroup ? '✅' : '❌'}
- Convenio Select: ${results.domElements.convenioSelect ? '✅' : '❌'}

📝 CURRENT CONVENIOS:
${results.currentConvenios.length > 0 ? 
    results.currentConvenios.map((c, i) => `${i + 1}. ${c}`).join('\n') : 
    'No hay convenios configurados'}

🎯 OVERALL STATUS: ${allWorking ? '✅ FUNCIONANDO PERFECTAMENTE' : '⚠️ REVISAR ELEMENTOS FALTANTES'}

${results.error ? `❌ ERROR: ${results.error}` : ''}`;
        
        alert(report);
        console.log('🧪 Convenios test results:', results);
        
        return results;
        
    } catch (error) {
        console.error('❌ Error testing convenios system:', error);
        alert(`❌ Error testing convenios system: ${error.message}`);
        return { error: error.message };
    }
}

// ===== FUNCIÓN EXTRA 8: REFRESH CONVENIOS CACHE =====
async function refreshConveniosCache() {
    console.log('⚡ FUNCIÓN EXTRA 8: Refresh Convenios Cache');
    
    try {
        if (!window.FirebaseData) {
            throw new Error('Firebase not available');
        }
        
        const convenios = await window.FirebaseData.getConvenios();
        window.cachedConvenios = convenios || [];
        
        console.log('✅ Convenios cache refreshed:', window.cachedConvenios.length, 'items');
        
        // Update convenio select if visible
        const convenioSelect = document.getElementById('contactConvenio');
        const convenioGroup = document.getElementById('convenioGroup');
        
        if (convenioSelect && !convenioGroup.classList.contains('hidden')) {
            convenioSelect.innerHTML = '<option value="">Seleccionar convenio...</option>' +
                window.cachedConvenios.map(conv => `<option value="${conv}">${conv}</option>`).join('');
        }
        
        return window.cachedConvenios;
        
    } catch (error) {
        console.error('❌ Error refreshing convenios cache:', error);
        window.cachedConvenios = [];
        return [];
    }
}

// ===== PERFORMANCE AND UTILITY FUNCTIONS =====

// ===== FUNCIÓN EXTRA 9: DEBOUNCE UTILITY =====
function debounce(func, wait, immediate = false) {
    console.log('⚡ FUNCIÓN EXTRA 9: Debounce Utility');
    
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

// ===== FUNCIÓN EXTRA 10: THROTTLE UTILITY =====
function throttle(func, limit) {
    console.log('⚡ FUNCIÓN EXTRA 10: Throttle Utility');
    
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===== FUNCIÓN EXTRA 11: COPY TO CLIPBOARD =====
async function copyToClipboard(text) {
    console.log('⚡ FUNCIÓN EXTRA 11: Copy to Clipboard');
    
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            return new Promise((resolve, reject) => {
                document.execCommand('copy') ? resolve() : reject();
                textArea.remove();
            });
        }
        
        showNotification('📋 Copiado al portapapeles', 'success', 2000);
        return true;
    } catch (error) {
        console.error('❌ Error copying to clipboard:', error);
        showNotification('❌ Error al copiar', 'error');
        return false;
    }
}

// ===== FUNCIÓN EXTRA 12: GENERATE EXPORT DATA =====
function generateExportData(contacts, format = 'csv') {
    console.log('⚡ FUNCIÓN EXTRA 12: Generate Export Data');
    
    try {
        if (format === 'csv') {
            const headers = ['ID', 'Nombre', 'Teléfono', 'Email', 'Fuente', 'Convenio', 'Ubicación', 'Estado', 'Fecha', 'Hora', 'Notas', 'Vendedor'];
            const csvContent = [
                headers.join(','),
                ...contacts.map(contact => [
                    contact.id || '',
                    `"${contact.name || ''}"`,
                    contact.phone || '',
                    contact.email || '',
                    `"${contact.source || ''}"`,
                    `"${contact.convenio || ''}"`,
                    contact.location || '',
                    contact.status || '',
                    contact.date || '',
                    contact.time || '',
                    `"${(contact.notes || '').replace(/"/g, '""')}"`,
                    `"${contact.salespersonEmail || contact.salesperson || ''}"`
                ].join(','))
            ].join('\n');
            
            return csvContent;
        } else if (format === 'json') {
            return JSON.stringify({
                exportDate: new Date().toISOString(),
                totalContacts: contacts.length,
                contacts: contacts
            }, null, 2);
        }
        
        throw new Error('Unsupported format');
    } catch (error) {
        console.error('❌ Error generating export data:', error);
        throw error;
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Utils Enhanced loaded with 12 additional functions');
    
    // Add global styles for enhanced components
    if (!document.getElementById('utils-enhanced-styles')) {
        const style = document.createElement('style');
        style.id = 'utils-enhanced-styles';
        style.textContent = `
            .enhanced-modal input:focus,
            .enhanced-modal select:focus,
            .enhanced-modal textarea:focus {
                border-color: #3b82f6 !important;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
            }
            
            .enhanced-modal button:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }
            
            .enhanced-modal .modal-content {
                animation: modalFadeIn 0.3s ease-out;
            }
            
            @keyframes modalFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(30px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            .loading-spinner {
                border: 2px solid #f3f4f6;
                border-top: 2px solid currentColor;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
        `;
        document.head.appendChild(style);
    }
});

console.log('✅ Utils Enhanced module loaded with modal system, enhanced formatting, and utility functions');
