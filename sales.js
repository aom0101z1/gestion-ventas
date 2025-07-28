// sales.js - FIREBASE INTEGRATED VERSION
// ===== FIREBASE CONTACTOS =====
async function addContact(event) {
    event.preventDefault();
    
    if (!window.FirebaseData || !window.FirebaseData.currentUser) {
        alert('❌ Firebase no disponible o usuario no autenticado. Recarga la página.');
        return;
    }
    
    // Disable submit button to prevent double submission
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
        
        // Validate required fields
        if (!contact.name || !contact.phone || !contact.source || !contact.location) {
            alert('⚠️ Completa todos los campos obligatorios');
            return;
        }
        
        console.log('📤 Saving contact to Firebase:', contact);
        
        // Save to Firebase
        const savedContact = await window.FirebaseData.addContact(contact);
        console.log('✅ Contact saved to Firebase:', savedContact);
        
        // Also save to AdminData if available (for compatibility)
        if (window.AdminData && window.AdminData.isReady) {
            try {
                await AdminData.addContact(savedContact);
                console.log('✅ Contact also saved to AdminData');
            } catch (error) {
                console.log('⚠️ AdminData save failed, but Firebase succeeded:', error);
            }
        }
        
        // Clear form
        event.target.reset();
        document.getElementById('convenioGroup').style.display = 'none';
        document.getElementById('contactConvenio').required = false;
        
        // Force immediate UI update
        setTimeout(async () => {
            await updateAllViews();
            
            setTimeout(() => {
                updateLeadsTable();
                if (typeof refreshPipeline === 'function') refreshPipeline();
            }, 200);
        }, 100);
        
        // Get user stats for success message
        const userProfile = await window.FirebaseData.loadUserProfile();
        const allContacts = await window.FirebaseData.getFilteredContacts();
        const todayContacts = allContacts.filter(c => c.date === new Date().toISOString().split('T')[0]);
        
        alert(`✅ ¡Contacto guardado en Firebase!

👤 ${savedContact.name}
📞 ${savedContact.phone}
🔥 Sincronizado en tiempo real
📊 Tus contactos totales: ${allContacts.length}
📋 Contactos hoy: ${todayContacts.length}

✨ Disponible inmediatamente para todo el equipo!`);
        
    } catch (error) {
        console.error('❌ Error saving to Firebase:', error);
        alert(`❌ Error al guardar en Firebase: ${error.message}`);
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// FUNCIÓN para mostrar convenios
function handleSourceChange() {
    const sourceSelect = document.getElementById('contactSource');
    const convenioGroup = document.getElementById('convenioGroup');
    const convenioSelect = document.getElementById('contactConvenio');
    
    console.log('🔍 Source changed to:', sourceSelect.value);
    
    if (sourceSelect.value === 'CONVENIO') {
        console.log('✅ Showing convenio dropdown');
        convenioGroup.style.display = 'block';
        convenioSelect.required = true;
    } else {
        console.log('❌ Hiding convenio dropdown');
        convenioGroup.style.display = 'none';
        convenioSelect.required = false;
        convenioSelect.value = '';
    }
}

// ===== ENHANCED FIREBASE LEAD DELETION =====
async function deleteLead(leadId) {
    if (!window.FirebaseData || !window.FirebaseData.currentUser) {
        alert('❌ Firebase no disponible');
        return;
    }
    
    try {
        // Get all contacts to find the lead
        const allContacts = await window.FirebaseData.getAllContacts();
        const lead = allContacts.find(l => l.id === leadId);
        
        if (!lead) {
            alert('❌ Lead no encontrado');
            return;
        }
        
        // Check permissions - salespeople can only delete their own leads
        const userProfile = await window.FirebaseData.loadUserProfile();
        if (userProfile.role !== 'director' && lead.salespersonId !== window.FirebaseData.currentUser.uid) {
            alert('❌ Solo puedes eliminar tus propios leads');
            return;
        }
        
        if (confirm(`¿Estás seguro de eliminar el lead de "${lead.name}"?

📞 Teléfono: ${lead.phone}
📍 Fuente: ${lead.source}
👤 Vendedor: ${getUserDisplayName(lead.salespersonId)}

Esta acción no se puede deshacer y se eliminará de Firebase.`)) {
            
            await window.FirebaseData.deleteContact(leadId);
            console.log('✅ Lead deleted from Firebase:', leadId);
            
            // Also delete from AdminData if available
            if (window.AdminData && window.AdminData.isReady) {
                try {
                    await AdminData.deleteContact(leadId);
                } catch (error) {
                    console.log('⚠️ AdminData delete failed, but Firebase succeeded');
                }
            }
            
            // Force immediate UI update
            setTimeout(async () => {
                await updateAllViews();
                setTimeout(() => {
                    updateLeadsTable();
                    if (typeof refreshPipeline === 'function') refreshPipeline();
                }, 200);
            }, 100);
            
            alert(`✅ Lead de "${lead.name}" eliminado de Firebase correctamente`);
        }
    } catch (error) {
        console.error('❌ Error deleting from Firebase:', error);
        alert(`❌ Error al eliminar de Firebase: ${error.message}`);
    }
}

// ===== FIREBASE DATA CLEANUP FUNCTIONS =====
async function clearTestData() {
    if (!window.FirebaseData || !window.FirebaseData.currentUser) {
        alert('❌ Firebase no disponible');
        return;
    }
    
    try {
        const userProfile = await window.FirebaseData.loadUserProfile();
        if (userProfile.role !== 'director') {
            alert('❌ Solo el director puede limpiar datos de prueba');
            return;
        }
        
        const allContacts = await window.FirebaseData.getAllContacts();
        const testDataNames = [
            'Carlos Rodríguez', 'Ana Martínez', 'Luis Gómez', 
            'Patricia López', 'Roberto Silva', 'Carmen Fernández',
            'Miguel Torres', 'Carlos Rodriguez', 'Test User', 'Usuario Prueba'
        ];
        
        const testDataPhones = [
            '3001234567', '3109876543', '3156789012', '3187654321', 
            '3203456789', '3134567890', '3145678901', '1234567890'
        ];
        
        const testData = allContacts.filter(contact => 
            testDataNames.includes(contact.name) || 
            testDataPhones.includes(contact.phone) ||
            contact.notes?.toLowerCase().includes('test') ||
            contact.notes?.toLowerCase().includes('prueba')
        );
        
        if (testData.length === 0) {
            alert('ℹ️ No se encontraron datos de prueba para eliminar en Firebase');
            return;
        }
        
        if (confirm(`🗑️ Se encontraron ${testData.length} registros de datos de prueba en Firebase.

¿Quieres eliminar todos los datos de prueba?

Esto incluye contactos como:
${testData.slice(0, 3).map(d => `• ${d.name} (${d.phone})`).join('\n')}
${testData.length > 3 ? `\n... y ${testData.length - 3} más` : ''}

Esta acción no se puede deshacer.`)) {
            
            let deletedCount = 0;
            for (const data of testData) {
                try {
                    await window.FirebaseData.deleteContact(data.id);
                    deletedCount++;
                } catch (error) {
                    console.error('Error deleting test data:', error);
                }
            }
            
            // Force UI update
            setTimeout(async () => {
                await updateAllViews();
                setTimeout(() => {
                    updateLeadsTable();
                    if (typeof refreshPipeline === 'function') refreshPipeline();
                }, 200);
            }, 100);
            
            alert(`✅ ${deletedCount} datos de prueba eliminados de Firebase correctamente`);
        }
    } catch (error) {
        console.error('❌ Error clearing test data:', error);
        alert(`❌ Error al limpiar datos de prueba: ${error.message}`);
    }
}

async function clearMyData() {
    if (!window.FirebaseData || !window.FirebaseData.currentUser) {
        alert('❌ Firebase no disponible');
        return;
    }
    
    try {
        const myContacts = await window.FirebaseData.getFilteredContacts();
        
        if (myContacts.length === 0) {
            alert('ℹ️ No tienes datos para eliminar en Firebase');
            return;
        }
        
        if (confirm(`🗑️ ¿Estás seguro de eliminar TODOS tus ${myContacts.length} contactos de Firebase?

Esto incluye:
${myContacts.slice(0, 3).map(d => `• ${d.name} (${d.phone})`).join('\n')}
${myContacts.length > 3 ? `\n... y ${myContacts.length - 3} más` : ''}

Esta acción NO se puede deshacer.`)) {
            
            let deletedCount = 0;
            for (const contact of myContacts) {
                try {
                    await window.FirebaseData.deleteContact(contact.id);
                    deletedCount++;
                } catch (error) {
                    console.error('Error deleting contact:', error);
                }
            }
            
            // Force UI update
            setTimeout(async () => {
                await updateAllViews();
                setTimeout(() => {
                    updateLeadsTable();
                    if (typeof refreshPipeline === 'function') refreshPipeline();
                }, 200);
            }, 100);
            
            alert(`✅ ${deletedCount} de tus contactos eliminados de Firebase correctamente`);
        }
    } catch (error) {
        console.error('❌ Error clearing my data:', error);
        alert(`❌ Error al eliminar tus datos: ${error.message}`);
    }
}

// ===== ENHANCED FIREBASE LEADS TABLE =====
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
        
        // Get filtered data from Firebase
        let data = await window.FirebaseData.getFilteredContacts();
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
                <button onclick="diagnoseDirectorData()" style="background: #667eea; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; margin-top: 1rem; cursor: pointer;">🔍 Diagnosticar Firebase</button>`;
            } else {
                message = 'No tienes leads registrados en Firebase. Agrega contactos en la pestaña "Mis Contactos".';
            }
            
            tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; color: #666; padding: 2rem;">${message}</td></tr>`;
            return;
        }
        
        // Sort by date (newest first)
        data.sort((a, b) => {
            const dateA = new Date(a.date + ' ' + (a.time || '00:00:00'));
            const dateB = new Date(b.date + ' ' + (b.time || '00:00:00'));
            return dateB - dateA;
        });
        
        tbody.innerHTML = await Promise.all(data.map(async (lead) => {
            const salespersonCell = userProfile.role === 'director' 
                ? `<td><span style="background: #667eea; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">${await getUserDisplayNameFirebase(lead.salespersonId)}</span></td>`
                : '';
            
            // Check if user can delete this lead
            const canDelete = userProfile.role === 'director' || lead.salespersonId === window.FirebaseData.currentUser.uid;
            
            return `
                <tr>
                    <td style="font-weight: 500;">${lead.name}</td>
                    <td>${lead.phone}</td>
                    <td style="font-size: 0.9rem;">${lead.source.length > 30 ? lead.source.substring(0, 30) + '...' : lead.source}</td>
                    <td><span class="status-badge status-${lead.status.toLowerCase().replace(' ', '').replace('ó', 'o')}">${lead.status}</span></td>
                    <td style="font-size: 0.9rem;">${formatDate(lead.date)}</td>
                    ${salespersonCell}
                    <td>
                        <button onclick="showLeadDetails('${lead.id}')" class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.25rem;">
                            📋 Ver
                        </button>
                        ${canDelete ? `<button onclick="deleteLead('${lead.id}')" class="btn btn-warning" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; background: #ef4444;">🗑️</button>` : ''}
                    </td>
                </tr>
            `;
        })).then(rows => rows.join(''));
        
        console.log('✅ Firebase leads table updated with', data.length, 'records');
        
    } catch (error) {
        console.error('❌ Error updating Firebase leads table:', error);
        const tbody = document.getElementById('leadsTable');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #dc2626; padding: 2rem;">❌ Error: ${error.message}</td></tr>`;
        }
    }
}

async function showLeadDetails(leadId) {
    if (!window.FirebaseData || !window.FirebaseData.currentUser) {
        alert('❌ Firebase no disponible');
        return;
    }
    
    try {
        const allContacts = await window.FirebaseData.getAllContacts();
        const lead = allContacts.find(l => l.id === leadId);
        
        if (!lead) {
            alert('❌ Lead no encontrado en Firebase');
            return;
        }
        
        const salespersonName = await getUserDisplayNameFirebase(lead.salespersonId);
        
        alert(`📋 DETALLES DEL LEAD (Firebase)

👤 Nombre: ${lead.name}
📞 Teléfono: ${lead.phone}
📧 Email: ${lead.email || 'No proporcionado'}
📍 Fuente: ${lead.source}
🏘️ Ubicación: ${lead.location}
📝 Estado: ${lead.status}
👨‍💼 Vendedor: ${salespersonName}
📅 Fecha: ${formatDate(lead.date)}
⏰ Hora: ${lead.time}
🔥 ID Firebase: ${lead.id}

💬 Notas:
${lead.notes || 'Sin notas'}

---
🔄 Para cambiar estado: Ve al Pipeline y arrastra la tarjeta
🗑️ Para eliminar: Usa el botón 🗑️ en la tabla de leads`);
    } catch (error) {
        console.error('❌ Error showing lead details:', error);
        alert(`❌ Error al mostrar detalles: ${error.message}`);
    }
}

// ===== FIREBASE MONITORING (DIRECTOR) =====
async function refreshMonitoring() {
    if (!window.FirebaseData || !window.FirebaseData.currentUser) {
        alert('❌ Firebase no disponible');
        return;
    }
    
    try {
        const userProfile = await window.FirebaseData.loadUserProfile();
        if (userProfile.role !== 'director') {
            alert('❌ Solo el director puede acceder al monitoreo');
            return;
        }
        
        console.log('👀 Actualizando monitoreo Firebase del equipo');
        
        await updateTeamActivityOverview();
        await updateIndividualSalespeopleActivity();
        await updateRecentTeamActivity();
    } catch (error) {
        console.error('❌ Error refreshing Firebase monitoring:', error);
        alert(`❌ Error al actualizar monitoreo: ${error.message}`);
    }
}

async function updateTeamActivityOverview() {
    if (!window.FirebaseData) return;
    
    try {
        const allContacts = await window.FirebaseData.getAllContacts();
        const allUsers = await window.FirebaseData.getAllUsers();
        const today = new Date().toISOString().split('T')[0];
        
        const todayContacts = allContacts.filter(c => c.date === today);
        const activeLeads = allContacts.filter(c => !['Convertido', 'Perdido'].includes(c.status));
        const conversions = allContacts.filter(c => c.status === 'Convertido');
        const salespeople = Object.values(allUsers).filter(u => u.role === 'vendedor');
        
        const teamGoalProgress = salespeople.length > 0 ? 
            (salespeople.filter(sp => {
                const userTodayContacts = todayContacts.filter(c => 
                    Object.keys(allUsers).find(uid => allUsers[uid].email === sp.email) && 
                    c.salespersonId === Object.keys(allUsers).find(uid => allUsers[uid].email === sp.email)
                );
                return userTodayContacts.length >= 10;
            }).length / salespeople.length * 100).toFixed(0) : 0;
        
        const container = document.getElementById('teamActivityOverview');
        if (!container) return;
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #667eea;">${todayContacts.length}</div>
                    <div style="font-size: 0.9rem; color: #666;">Contactos Hoy (Equipo)</div>
                    <div style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">Meta: ${salespeople.length * 10}</div>
                    <div style="font-size: 0.7rem; color: #ff6b35; margin-top: 0.25rem;">🔥 Firebase</div>
                </div>
                
                <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${activeLeads.length}</div>
                    <div style="font-size: 0.9rem; color: #666;">Leads Activos</div>
                    <div style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">En proceso</div>
                    <div style="font-size: 0.7rem; color: #ff6b35; margin-top: 0.25rem;">🔥 Tiempo Real</div>
                </div>
                
                <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">${conversions.length}</div>
                    <div style="font-size: 0.9rem; color: #666;">Conversiones Totales</div>
                    <div style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">Este periodo</div>
                    <div style="font-size: 0.7rem; color: #ff6b35; margin-top: 0.25rem;">🔥 Sincronizado</div>
                </div>
                
                <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #8b5cf6;">${teamGoalProgress}%</div>
                    <div style="font-size: 0.9rem; color: #666;">Equipo en Meta</div>
                    <div style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">${salespeople.length} vendedores</div>
                    <div style="font-size: 0.7rem; color: #ff6b35; margin-top: 0.25rem;">🔥 Firebase</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('❌ Error updating team activity overview:', error);
    }
}

async function updateIndividualSalespeopleActivity() {
    if (!window.FirebaseData) return;
    
    try {
        const allContacts = await window.FirebaseData.getAllContacts();
        const allUsers = await window.FirebaseData.getAllUsers();
        const today = new Date().toISOString().split('T')[0];
        
        // Get all salespeople
        const salespeople = Object.entries(allUsers)
            .filter(([uid, user]) => user.role === 'vendedor')
            .map(([uid, user]) => {
                const userContacts = allContacts.filter(c => c.salespersonId === uid);
                const todayContacts = userContacts.filter(c => c.date === today);
                const activeLeads = userContacts.filter(c => !['Convertido', 'Perdido'].includes(c.status));
                const conversions = userContacts.filter(c => c.status === 'Convertido');
                
                return {
                    uid,
                    name: user.name,
                    email: user.email,
                    stats: {
                        totalContacts: userContacts.length,
                        todayContacts: todayContacts.length,
                        activeLeads: activeLeads.length,
                        conversions: conversions.length,
                        conversionRate: userContacts.length > 0 ? (conversions.length / userContacts.length * 100).toFixed(1) : 0
                    }
                };
            });
        
        // Sort by today's contacts (most active first)
        salespeople.sort((a, b) => b.stats.todayContacts - a.stats.todayContacts);
        
        const container = document.getElementById('individualSalespeopleActivity');
        if (!container) return;
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1rem;">
                ${salespeople.map(person => {
                    const stats = person.stats;
                    const statusColor = stats.todayContacts >= 10 ? '#10b981' : stats.todayContacts >= 5 ? '#f59e0b' : '#ef4444';
                    
                    // Calculate days since last activity
                    const userData = allContacts.filter(d => d.salespersonId === person.uid);
                    const lastActivity = userData.length > 0 ? Math.max(...userData.map(d => new Date(d.date).getTime())) : 0;
                    const daysSinceLastActivity = lastActivity > 0 ? Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24)) : 999;
                    
                    const activityStatus = daysSinceLastActivity === 0 ? '🟢 Activo hoy' : 
                                         daysSinceLastActivity === 1 ? '🟡 Ayer' : 
                                         daysSinceLastActivity < 7 ? `🟠 Hace ${daysSinceLastActivity} días` : 
                                         userData.length === 0 ? '⚪ Sin datos' : '🔴 Inactivo';
                    
                    const goalProgress = (stats.todayContacts / 10 * 100).toFixed(0);
                    
                    return `
                        <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 4px solid ${statusColor};">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <h4 style="margin: 0; color: #333;">${person.name}</h4>
                                <span style="font-size: 0.8rem; color: #666;">${activityStatus}</span>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                                <div>
                                    <div style="font-size: 1.5rem; font-weight: bold; color: ${statusColor};">${stats.todayContacts}/10</div>
                                    <div style="font-size: 0.8rem; color: #666;">Contactos Hoy</div>
                                </div>
                                <div>
                                    <div style="font-size: 1.5rem; font-weight: bold; color: #667eea;">${stats.activeLeads}</div>
                                    <div style="font-size: 0.8rem; color: #666;">Leads Activos</div>
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 1rem;">
                                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666;">
                                    <span>Progreso Meta Diaria</span>
                                    <span>${goalProgress}%</span>
                                </div>
                                <div style="background: #e5e7eb; height: 6px; border-radius: 3px; margin-top: 0.25rem;">
                                    <div style="background: ${statusColor}; height: 6px; border-radius: 3px; width: ${Math.min(goalProgress, 100)}%;"></div>
                                </div>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; gap: 1rem; font-size: 0.85rem; color: #666;">
                                <span>📊 Total: ${stats.totalContacts}</span>
                                <span>✅ Convertidos: ${stats.conversions}</span>
                                <span>📈 Tasa: ${stats.conversionRate}%</span>
                            </div>
                            
                            <div style="font-size: 0.7rem; color: #ff6b35; margin-top: 0.5rem; text-align: center;">
                                🔥 Firebase Real-time
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (error) {
        console.error('❌ Error updating individual salespeople activity:', error);
    }
}

async function updateRecentTeamActivity() {
    if (!window.FirebaseData) return;
    
    try {
        // Get recent activities (last 20 activities)
        const allContacts = await window.FirebaseData.getAllContacts();
        const recentData = [...allContacts]
            .sort((a, b) => {
                const dateTimeA = new Date(a.date + ' ' + (a.time || '00:00:00'));
                const dateTimeB = new Date(b.date + ' ' + (b.time || '00:00:00'));
                return dateTimeB - dateTimeA;
            })
            .slice(0, 20);
        
        console.log('🕒 Generating recent team activity from Firebase:', recentData.length, 'activities');
        
        const container = document.getElementById('recentTeamActivity');
        if (!container) return;
        
        container.innerHTML = `
            <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="margin-bottom: 1rem; display: flex; justify-content: between; align-items: center;">
                    <h4 style="margin: 0;">🕒 Actividad Reciente del Equipo</h4>
                    <span style="font-size: 0.8rem; color: #ff6b35; background: #fff7ed; padding: 0.25rem 0.5rem; border-radius: 12px;">🔥 Firebase Real-time</span>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Vendedor</th>
                            <th>Cliente</th>
                            <th>Fuente</th>
                            <th>Estado</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${await Promise.all(recentData.map(async (activity) => `
                            <tr>
                                <td style="font-size: 0.9rem;">${formatDate(activity.date)}<br><small style="color: #666;">${activity.time || '00:00'}</small></td>
                                <td><span style="background: #667eea; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">${await getUserDisplayNameFirebase(activity.salespersonId)}</span></td>
                                <td style="font-weight: 500;">${activity.name}</td>
                                <td style="font-size: 0.9rem;">${activity.source.length > 20 ? activity.source.substring(0, 20) + '...' : activity.source}</td>
                                <td><span class="status-badge status-${activity.status.toLowerCase().replace(' ', '').replace('ó', 'o')}">${activity.status}</span></td>
                                <td>
                                    <button onclick="showLeadDetails('${activity.id}')" class="btn btn-primary" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;">
                                        👁️ Ver
                                    </button>
                                </td>
                            </tr>
                        `)).then(rows => rows.join(''))}
                    </tbody>
                </table>
                ${recentData.length === 0 ? '<p style="text-align: center; color: #666; padding: 2rem;">No hay actividad reciente del equipo en Firebase</p>' : ''}
            </div>
        `;
    } catch (error) {
        console.error('❌ Error updating recent team activity:', error);
    }
}

// ===== ENHANCED FIREBASE STATS & REPORTS =====
async function updateStats() {
    if (!window.FirebaseData || !window.FirebaseData.currentUser) {
        console.log('❌ Firebase not available for stats');
        return;
    }
    
    try {
        console.log('📊 Updating stats with Firebase');
        
        const userProfile = await window.FirebaseData.loadUserProfile();
        const allContacts = await window.FirebaseData.getFilteredContacts();
        const today = new Date().toISOString().split('T')[0];
        
        const todayContacts = allContacts.filter(c => c.date === today);
        const activeLeads = allContacts.filter(c => !['Convertido', 'Perdido'].includes(c.status));
        const conversions = allContacts.filter(c => c.status === 'Convertido');
        
        // Update stat cards
        const totalLeadsEl = document.getElementById('totalLeads');
        const activeLeadsEl = document.getElementById('activeLeads');
        const conversionsEl = document.getElementById('conversions');
        const todayContactsEl = document.getElementById('todayContacts');
        
        if (totalLeadsEl) totalLeadsEl.textContent = allContacts.length;
        if (activeLeadsEl) activeLeadsEl.textContent = activeLeads.length;
        if (conversionsEl) conversionsEl.textContent = conversions.length;
        if (todayContactsEl) todayContactsEl.textContent = todayContacts.length;
        
        console.log('✅ Firebase stats updated successfully');
        console.log(`   - Total: ${allContacts.length}, Active: ${activeLeads.length}, Conversions: ${conversions.length}, Today: ${todayContacts.length}`);
    } catch (error) {
        console.error('❌ Error updating Firebase stats:', error);
    }
}

async function updateTodayContacts() {
    if (!window.FirebaseData || !window.FirebaseData.currentUser) {
        console.log('❌ Firebase not available for today contacts');
        return;
    }
    
    try {
        const todayContacts = await window.FirebaseData.getFilteredContacts();
        const today = new Date().toISOString().split('T')[0];
        const todayFiltered = todayContacts.filter(c => c.date === today);
        
        console.log('📅 Updating today contacts with Firebase');
        console.log(`   - Today contacts: ${todayFiltered.length}`);
        
        const container = document.getElementById('todayContacts');
        if (!container) {
            console.log('❌ Today contacts container not found');
            return;
        }
        
        if (todayFiltered.length === 0) {
            const userProfile = await window.FirebaseData.loadUserProfile();
            let message;
            if (userProfile.role === 'director') {
                const allUsers = await window.FirebaseData.getAllUsers();
                message = `No hay contactos registrados hoy por el equipo en Firebase
                <div style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
                    👥 ${Object.keys(allUsers).length} usuarios en Firebase<br>
                    📊 ${todayContacts.length} contactos totales<br>
                    📅 0 contactos hoy<br>
                    🔥 Base de datos: Firebase Realtime Database
                </div>`;
            } else {
                message = 'No tienes contactos registrados hoy en Firebase. ¡Agrega algunos en el formulario de arriba!';
            }
            container.innerHTML = `<p style="color: #666; text-align: center; padding: 2rem;">${message}</p>`;
            return;
        }
        
        // Sort by time (newest first)
        todayFiltered.sort((a, b) => {
            const timeA = a.time || '00:00:00';
            const timeB = b.time || '00:00:00';
            return timeB.localeCompare(timeA);
        });
        
        container.innerHTML = await Promise.all(todayFiltered.map(async (contact) => {
            const userProfile = await window.FirebaseData.loadUserProfile();
            const salespersonInfo = userProfile.role === 'director' 
                ? `<div style="color: #667eea; font-size: 0.8rem; font-weight: 600; margin-top: 0.25rem;">👤 ${await getUserDisplayNameFirebase(contact.salespersonId)}</div>`
                : '';
            
            // Check if user can delete this contact
            const canDelete = userProfile.role === 'director' || contact.salespersonId === window.FirebaseData.currentUser.uid;
            
            return `
                <div style="background: #f9fafb; padding: 1rem; border-radius: 5px; margin-bottom: 0.5rem; border: 1px solid #e5e7eb; border-left: 3px solid #ff6b35;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #333;">${contact.name}</div>
                            <div style="color: #666; font-size: 0.9rem; margin-top: 0.25rem;">📞 ${contact.phone}</div>
                            <div style="color: #666; font-size: 0.9rem;">📍 ${contact.source}</div>
                            <div style="color: #888; font-size: 0.8rem; margin-top: 0.5rem;">⏰ ${contact.time}</div>
                            ${salespersonInfo}
                            ${contact.notes ? `<div style="color: #666; font-size: 0.8rem; background: #f0f9ff; padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem;">💬 ${contact.notes}</div>` : ''}
                            <div style="font-size: 0.7rem; color: #ff6b35; margin-top: 0.5rem;">🔥 Firebase: ${contact.id}</div>
                        </div>
                        ${canDelete ? `<button onclick="deleteLead('${contact.id}')" style="background: #ef4444; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.7rem; cursor: pointer; margin-left: 0.5rem;">🗑️</button>` : ''}
                    </div>
                </div>
            `;
        })).then(items => items.join(''));
        
        console.log('✅ Today contacts updated with Firebase');
    } catch (error) {
        console.error('❌ Error updating today contacts:', error);
        const container = document.getElementById('todayContacts');
        if (container) {
            container.innerHTML = `<p style="color: #dc2626; text-align: center; padding: 2rem;">❌ Error: ${error.message}</p>`;
        }
    }
}

async function updateReports() {
    try {
        const userProfile = await window.FirebaseData.loadUserProfile();
        if (userProfile.role === 'director') {
            document.getElementById('personalReports').classList.add('hidden');
            document.getElementById('directorReports').classList.remove('hidden');
            await updateDirectorReports();
        } else {
            document.getElementById('personalReports').classList.remove('hidden');
            document.getElementById('directorReports').classList.add('hidden');
            await updatePersonalReports();
        }
    } catch (error) {
        console.error('❌ Error updating Firebase reports:', error);
    }
}

async function updatePersonalReports() {
    if (!window.FirebaseData) return;
    
    try {
        const allContacts = await window.FirebaseData.getFilteredContacts();
        
        // Calculate weekly contacts
        const weeklyContacts = allContacts.filter(c => {
            const contactDate = new Date(c.date);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return contactDate >= weekAgo;
        }).length;
        
        const conversions = allContacts.filter(c => c.status === 'Convertido').length;
        const conversionRate = allContacts.length > 0 ? (conversions / allContacts.length * 100).toFixed(1) : 0;
        
        const weeklyPerformanceEl = document.getElementById('weeklyPerformance');
        if (weeklyPerformanceEl) {
            weeklyPerformanceEl.innerHTML = `
                <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; border-left: 3px solid #ff6b35;">
                    <div style="font-size: 2rem; font-weight: bold; color: #667eea; text-align: center;">${weeklyContacts}</div>
                    <div style="text-align: center; color: #666;">Contactos esta semana</div>
                    <div style="margin-top: 1rem; text-align: center;">
                        <div style="font-size: 0.9rem; color: #666;">Meta semanal: 50 contactos</div>
                        <div style="background: #e5e7eb; height: 8px; border-radius: 4px; margin-top: 0.5rem;">
                            <div style="background: #667eea; height: 8px; border-radius: 4px; width: ${Math.min((weeklyContacts/50)*100, 100)}%;"></div>
                        </div>
                    </div>
                    <div style="font-size: 0.7rem; color: #ff6b35; text-align: center; margin-top: 0.5rem;">🔥 Firebase Real-time</div>
                </div>
            `;
        }
        
        const personalTargetsEl = document.getElementById('personalTargets');
        if (personalTargetsEl) {
            personalTargetsEl.innerHTML = `
                <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; border-left: 3px solid #ff6b35;">
                    <div style="margin-bottom: 1rem;">
                        <div style="font-weight: 600;">📊 Mis Estadísticas Firebase</div>
                        <div style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">
                            Total leads: ${allContacts.length}<br>
                            Conversiones: ${conversions}<br>
                            Tasa de conversión: ${conversionRate}%
                        </div>
                    </div>
                    <div style="margin-top: 1rem;">
                        <div style="font-weight: 600; color: ${conversionRate >= 15 ? '#10b981' : conversionRate >= 10 ? '#f59e0b' : '#ef4444'}">
                            ${conversionRate >= 15 ? '🏆 ¡Excelente!' : conversionRate >= 10 ? '📈 Buen trabajo' : '💪 Puedes mejorar'}
                        </div>
                    </div>
                    <div style="font-size: 0.7rem; color: #ff6b35; text-align: center; margin-top: 1rem;">🔥 Sincronizado en tiempo real</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Error updating personal reports:', error);
    }
}

async function updateDirectorReports() {
    if (!window.FirebaseData) return;
    
    try {
        const allContacts = await window.FirebaseData.getAllContacts();
        const allUsers = await window.FirebaseData.getAllUsers();
        const today = new Date().toISOString().split('T')[0];
        
        // Team performance
        const salespeople = Object.entries(allUsers)
            .filter(([uid, user]) => user.role === 'vendedor')
            .map(([uid, user]) => {
                const userContacts = allContacts.filter(c => c.salespersonId === uid);
                const todayContacts = userContacts.filter(c => c.date === today);
                const conversions = userContacts.filter(c => c.status === 'Convertido');
                
                return {
                    uid,
                    name: user.name,
                    stats: {
                        totalContacts: userContacts.length,
                        todayContacts: todayContacts.length,
                        conversions: conversions.length,
                        conversionRate: userContacts.length > 0 ? (conversions.length / userContacts.length * 100).toFixed(1) : 0
                    }
                };
            });
        
        const teamPerformanceEl = document.getElementById('teamPerformance');
        if (teamPerformanceEl) {
            teamPerformanceEl.innerHTML = `
                <div style="background: #f9fafb; padding: 1rem; border-radius: 8px; border-left: 3px solid #ff6b35;">
                    <h4 style="margin: 0 0 1rem 0;">👥 Rendimiento del Equipo Firebase</h4>
                    ${salespeople.map(person => {
                        const perf = person.stats;
                        const statusColor = perf.todayContacts >= 10 ? '#10b981' : perf.todayContacts >= 5 ? '#f59e0b' : '#ef4444';
                        return `
                            <div style="margin-bottom: 1rem; padding: 1rem; background: white; border-radius: 5px; border-left: 3px solid ${statusColor};">
                                <div style="font-weight: 600; margin-bottom: 0.5rem;">${person.name}</div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
                                    <div>Hoy: ${perf.todayContacts}/10</div>
                                    <div>Total: ${perf.totalContacts}</div>
                                    <div>Tasa: ${perf.conversionRate}%</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                    ${salespeople.length === 0 ? '<p style="text-align: center; color: #666;">No hay vendedores registrados en Firebase</p>' : ''}
                    <div style="font-size: 0.7rem; color: #ff6b35; text-align: center; margin-top: 0.5rem;">🔥 Firebase Real-time</div>
                </div>
            `;
        }
        
        // Sales ranking
        const sortedTeam = [...salespeople].sort((a, b) => b.stats.conversions - a.stats.conversions);
        
        const salesRankingEl = document.getElementById('salesRanking');
        if (salesRankingEl) {
            salesRankingEl.innerHTML = `
                <div style="background: #f9fafb; padding: 1rem; border-radius: 8px; border-left: 3px solid #ff6b35;">
                    <h4 style="margin: 0 0 1rem 0;">🏆 Ranking de Ventas Firebase</h4>
                    ${sortedTeam.map((person, index) => `
                        <div style="margin-bottom: 0.5rem; padding: 0.75rem; background: white; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="font-weight: bold; color: ${index === 0 ? '#f59e0b' : '#666'};">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '#' + (index + 1)}</span>
                                ${person.name}
                            </div>
                            <div style="font-weight: bold; color: #10b981;">${person.stats.conversions} ventas</div>
                        </div>
                    `).join('')}
                    ${sortedTeam.length === 0 ? '<p style="text-align: center; color: #666;">No hay datos de ventas en Firebase</p>' : ''}
                    <div style="font-size: 0.7rem; color: #ff6b35; text-align: center; margin-top: 0.5rem;">🔥 Firebase Real-time</div>
                </div>
            `;
        }
        
        // Executive summary
        const totalContacts = allContacts.length;
        const todayContacts = allContacts.filter(c => c.date === today).length;
        const totalConversions = allContacts.filter(c => c.status === 'Convertido').length;
        const conversionRate = totalContacts > 0 ? (totalConversions / totalContacts * 100).toFixed(1) : 0;
        
        const executiveSummaryEl = document.getElementById('executiveSummary');
        if (executiveSummaryEl) {
            executiveSummaryEl.innerHTML = `
                <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; border-left: 3px solid #ff6b35;">
                    <h4 style="margin: 0 0 1rem 0;">📈 Resumen Ejecutivo Firebase</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem;">
                        <div style="background: white; padding: 1rem; border-radius: 5px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #667eea;">${todayContacts}</div>
                            <div style="font-size: 0.9rem; color: #666;">Contactos Hoy</div>
                        </div>
                        <div style="background: white; padding: 1rem; border-radius: 5px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">${totalContacts}</div>
                            <div style="font-size: 0.9rem; color: #666;">Total Leads</div>
                        </div>
                        <div style="background: white; padding: 1rem; border-radius: 5px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #f59e0b;">${totalConversions}</div>
                            <div style="font-size: 0.9rem; color: #666;">Conversiones</div>
                        </div>
                        <div style="background: white; padding: 1rem; border-radius: 5px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #8b5cf6;">${conversionRate}%</div>
                            <div style="font-size: 0.9rem; color: #666;">Tasa Conversión</div>
                        </div>
                    </div>
                    <div style="font-size: 0.7rem; color: #ff6b35; text-align: center; margin-top: 1rem;">🔥 Firebase Real-time Database</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Error updating director reports:', error);
    }
}

// ===== FIREBASE UTILITIES =====
async function getUserDisplayNameFirebase(userId) {
    try {
        if (!userId) return 'Unknown User';
        
        const allUsers = await window.FirebaseData.getAllUsers();
        const user = allUsers[userId];
        
        if (user && user.name) {
            return user.name;
        }
        
        // Fallback to email if available
        if (user && user.email) {
            return user.email.split('@')[0];
        }
        
        return 'Unknown User';
    } catch (error) {
        console.error('❌ Error getting user display name:', error);
        return 'Unknown User';
    }
}

// ===== FIREBASE EXPORT =====
async function exportTodayContacts() {
    if (!window.FirebaseData || !window.FirebaseData.currentUser) {
        alert('❌ Firebase no disponible');
        return;
    }
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const allContacts = await window.FirebaseData.getFilteredContacts();
        const todayContacts = allContacts.filter(c => c.date === today);
        
        if (todayContacts.length === 0) {
            alert('📋 No hay contactos de hoy para exportar desde Firebase');
            return;
        }
        
        let csvData = "ID,Nombre,Teléfono,Email,Fuente,Ubicación,Notas,Vendedor,Fecha,Hora,Estado\n";
        
        for (const contact of todayContacts) {
            const salespersonName = await getUserDisplayNameFirebase(contact.salespersonId);
            csvData += `${contact.id},"${contact.name}","${contact.phone}","${contact.email}","${contact.source}","${contact.location}","${contact.notes}","${salespersonName}","${contact.date}","${contact.time}","${contact.status}"\n`;
        }
        
        // Create downloadable file
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const userProfile = await window.FirebaseData.loadUserProfile();
        const filename = userProfile.role === 'director' 
            ? `contactos_equipo_firebase_${today}.csv`
            : `contactos_firebase_${today}_${userProfile.name.replace(/\s+/g, '_')}.csv`;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        
        // Also prepare data for copy/paste
        const copyText = await Promise.all(todayContacts.map(async (c) => {
            const salespersonName = await getUserDisplayNameFirebase(c.salespersonId);
            return `${c.id}\t${c.name}\t${c.phone}\t${c.email}\t${c.source}\t${c.location}\t${c.notes}\t${salespersonName}\t${c.date}\t${c.time}\t${c.status}`;
        })).then(rows => rows.join('\n'));
        
        // Copy to clipboard
        navigator.clipboard.writeText(copyText).then(() => {
            alert(`✅ Exportación Firebase completada!

📥 Archivo CSV descargado: ${filename}
📋 Datos copiados al clipboard - pégalos directamente en Google Sheets
🔥 Fuente: Firebase Realtime Database

Total contactos exportados: ${todayContacts.length}`);
        }).catch(() => {
            alert(`✅ Archivo CSV descargado desde Firebase!

📥 Archivo: ${filename}
Total contactos: ${todayContacts.length}
🔥 Fuente: Firebase Realtime Database

Para copy/paste manual:
${copyText}`);
        });
    } catch (error) {
        console.error('❌ Error exporting Firebase data:', error);
        alert(`❌ Error al exportar desde Firebase: ${error.message}`);
    }
}
