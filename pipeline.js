// ===== MINIMAL FIX FOR HORIZONTAL LAYOUT =====

// Just change this line in your existing loadPipelineData function:
// FROM: grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))
// TO: grid-template-columns: repeat(6, 1fr)

async function loadPipelineData() {
    try {
        console.log('🎯 Loading pipeline data');
        
        const container = document.getElementById('pipelineContainer');
        if (!container) return;
        
        if (!window.FirebaseData || !window.FirebaseData.currentUser) {
            container.innerHTML = '<div style="text-align: center; color: #dc2626; padding: 2rem;">❌ Firebase no disponible</div>';
            return;
        }
        
        const allContacts = await window.FirebaseData.getFilteredContacts();
        
        if (allContacts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #666; padding: 2rem;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">🎯</div>
                    <h3>No hay leads en el pipeline</h3>
                    <p>Agrega contactos para verlos en el pipeline</p>
                    <button onclick="switchTab('contacts')" class="btn btn-primary" style="margin-top: 1rem;">➕ Agregar Contactos</button>
                </div>
            `;
            return;
        }
        
        // Group contacts by status
        const statusGroups = {
            'Nuevo': { leads: [], color: '#fbbf24', emoji: '🟡' },
            'Contactado': { leads: [], color: '#3b82f6', emoji: '🔵' },
            'Interesado': { leads: [], color: '#10b981', emoji: '🟢' },
            'Negociación': { leads: [], color: '#f97316', emoji: '🟠' },
            'Convertido': { leads: [], color: '#22c55e', emoji: '✅' },
            'Perdido': { leads: [], color: '#ef4444', emoji: '❌' }
        };
        
        allContacts.forEach(contact => {
            const status = contact.status || 'Nuevo';
            if (statusGroups[status]) {
                statusGroups[status].leads.push(contact);
            } else {
                statusGroups['Nuevo'].leads.push(contact);
            }
        });
        
        // THE ONLY CHANGE: Use fixed 6 columns instead of auto-fit
        container.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <h3>📊 Pipeline Overview</h3>
                <div style="display: flex; gap: 2rem; margin-bottom: 1rem;">
                    <span>Total: ${allContacts.length}</span>
                    <span>Conversiones: ${statusGroups['Convertido'].leads.length}</span>
                    <span>Activos: ${allContacts.length - statusGroups['Convertido'].leads.length - statusGroups['Perdido'].leads.length}</span>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 1rem;">
                ${Object.entries(statusGroups).map(([status, data]) => `
                    <div style="
                        background: linear-gradient(135deg, ${data.color}15, ${data.color}05);
                        border: 2px solid ${data.color}30;
                        border-radius: 12px;
                        overflow: hidden;
                        min-height: 500px;
                    ">
                        <div style="
                            background: ${data.color};
                            color: white;
                            padding: 1rem;
                            font-weight: 600;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        ">
                            <span>${data.emoji} ${status}</span>
                            <span style="
                                background: rgba(255,255,255,0.3);
                                padding: 0.4rem 0.8rem;
                                border-radius: 20px;
                                font-size: 0.9rem;
                            ">${data.leads.length}</span>
                        </div>
                        
                        <div style="padding: 0.5rem; max-height: 400px; overflow-y: auto;">
                            ${data.leads.length > 0 ? 
                                data.leads.map(lead => `
                                    <div style="
                                        background: white;
                                        border: 1px solid #e5e7eb;
                                        border-radius: 8px;
                                        padding: 0.75rem;
                                        margin-bottom: 0.5rem;
                                        cursor: pointer;
                                        transition: all 0.2s;
                                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                                        <h4 style="margin: 0 0 0.5rem 0; font-size: 0.95rem;">${lead.name}</h4>
                                        <div style="font-size: 0.8rem; color: #6b7280;">
                                            📞 ${lead.phone}<br>
                                            🏷️ ${(lead.source || 'No especificado').substring(0, 20)}<br>
                                            📅 ${lead.date}
                                        </div>
                                    </div>
                                `).join('') : 
                                `<div style="text-align: center; color: #9ca3af; padding: 2rem; font-style: italic;">
                                    Sin leads en esta etapa
                                </div>`
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        console.log('✅ Pipeline loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading pipeline:', error);
        document.getElementById('pipelineContainer').innerHTML = `<div style="text-align: center; color: #dc2626; padding: 2rem;">❌ Error: ${error.message}</div>`;
    }
}

// Make sure it's available globally
window.loadPipelineData = loadPipelineData;
