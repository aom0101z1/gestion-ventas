// ===== CONTACTOS =====
async function addContact(event) {
    event.preventDefault();

    const contact = {
        name: document.getElementById('contactName').value,
        phone: document.getElementById('contactPhone').value,
        source: document.getElementById('contactSource').value,
        status: 'Nuevo',
        date: new Date().toLocaleDateString('es-CO')
    };

    const newContact = AdminData.addContact(contact);

    // === NUEVO BLOQUE: sincronizar con GitHub si está conectado ===
    if (window.GitHubData && window.GitHubData.getToken()) {
        try {
            await GitHubData.addContact(newContact);
            console.log('✅ Contacto subido a GitHub');
            showSyncNotification('✅ Contacto sincronizado con GitHub', 'success');
        } catch (err) {
            console.error('❌ Error al subir a GitHub:', err.message);
            showSyncNotification('❌ Error al subir contacto a GitHub', 'warning');
        }
    }

    // Limpia los campos del formulario
    document.getElementById('contactName').value = '';
    document.getElementById('contactPhone').value = '';
    document.getElementById('contactSource').value = '';

    // Recargar la tabla de contactos
    displayContacts(AdminData.getMyContacts());
}


// FUNCIÓN CORREGIDA para mostrar convenios
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

// ===== NUEVA FUNCIÓN: ELIMINAR LEAD INDIVIDUAL =====
function deleteLead(leadId) {
    if (!window.AdminData) {
        alert('❌ Sistema no disponible');
        return;
    }
    
    const allData = AdminData.getAllData();
    const lead = allData.find(l => l.id == leadId);
    if (!lead) {
        alert('❌ Lead no encontrado');
        return;
    }
    
    // Check permissions - salespeople can only delete their own leads
    if (currentUser.role !== 'director' && lead.salesperson !== currentUser.username) {
        alert('❌ Solo puedes eliminar tus propios leads');
        return;
    }
    
    if (confirm(`¿Estás seguro de eliminar el lead de "${lead.name}"?

📞 Teléfono: ${lead.phone}
📍 Fuente: ${lead.source}
👤 Vendedor: ${getUserDisplayName(lead.salesperson)}

Esta acción no se puede deshacer.`)) {
        
        const deleted = AdminData.deleteContact(leadId);
        if (deleted) {
            // También eliminar de GitHub si está configurado
            if (window.GitHubData && window.GitHubData.getToken()) {
                // Para GitHub necesitaríamos implementar delete, por ahora solo local
                console.log('⚠️ GitHub delete not implemented yet');
            }
            
            // Actualizar vistas
            updateAllViews();
            setTimeout(() => {
                updateLeadsTable();
                if (typeof refreshPipeline === 'function') refreshPipeline();
            }, 200);
            
            alert(`✅ Lead de "${lead.name}" eliminado correctamente`);
        } else {
            alert('❌ Error al eliminar el lead');
        }
    }
}

// ===== NUEVA FUNCIÓN: LIMPIAR DATOS DE PRUEBA =====
function clearTestData() {
    if (!window.AdminData) {
        alert('❌ Sistema no disponible');
        return;
    }
    
    const allData = AdminData.getAllData();
    const testDataNames = [
        'Carlos Rodríguez', 'Ana Martínez', 'Luis Gómez', 
        'Patricia López', 'Roberto Silva', 'Carmen Fernández',
        'Miguel Torres', 'Carlos Rodriguez'
    ];
    
    const testData = allData.filter(contact => 
        testDataNames.includes(contact.name) || 
        contact.phone === '3001234567' ||
        contact.phone === '3109876543' ||
        contact.phone === '3156789012' ||
        contact.phone === '3187654321' ||
        contact.phone === '3203456789' ||
        contact.phone === '3134567890' ||
        contact.phone === '3145678901'
    );
    
    if (testData.length === 0) {
        alert('ℹ️ No se encontraron datos de prueba para eliminar');
        return;
    }
    
    if (confirm(`🗑️ Se encontraron ${testData.length} registros de datos de prueba.

¿Quieres eliminar todos los datos de prueba?

Esto incluye contactos como:
${testData.slice(0, 3).map(d => `• ${d.name} (${d.phone})`).join('\n')}
${testData.length > 3 ? `\n... y ${testData.length - 3} más` : ''}

Esta acción no se puede deshacer.`)) {
        
        let deletedCount = 0;
        testData.forEach(data => {
            if (AdminData.deleteContact(data.id)) {
                deletedCount++;
            }
        });
        
        updateAllViews();
        setTimeout(() => {
            updateLeadsTable();
            if (typeof refreshPipeline === 'function') refreshPipeline();
        }, 200);
        
        alert(`✅ ${deletedCount} datos de prueba eliminados correctamente`);
    }
}

// ===== NUEVA FUNCIÓN: LIMPIAR MIS DATOS =====
function clearMyData() {
    if (!window.AdminData) {
        alert('❌ Sistema no disponible');
        return;
    }
    
    const myData = AdminData.getDataBySalesperson(currentUser.username);
    
    if (myData.length === 0) {
        alert('ℹ️ No tienes datos para eliminar');
        return;
    }
    
    if (confirm(`🗑️ ¿Estás seguro de eliminar TODOS tus ${myData.length} contactos?

Esto incluye:
${myData.slice(0, 3).map(d => `• ${d.name} (${d.phone})`).join('\n')}
${myData.length > 3 ? `\n... y ${myData.length - 3} más` : ''}

Esta acción NO se puede deshacer.`)) {
        
        let deletedCount = 0;
        myData.forEach(data => {
            if (AdminData.deleteContact(data.id)) {
                deletedCount++;
            }
        });
        
        updateAllViews();
        setTimeout(() => {
            updateLeadsTable();
            if (typeof refreshPipeline === 'function') refreshPipeline();
        }, 200);
        
        alert(`✅ ${deletedCount} de tus contactos eliminados correctamente`);
    }
}

// ===== LEADS TABLE =====
function updateLeadsTable() {
    console.log('📋 Updating leads table for user:', currentUser?.username, currentUser?.role);
    
    if (!window.AdminData) {
        console.log('❌ AdminData not available');
        const tbody = document.getElementById('leadsTable');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #dc2626; padding: 2rem;">❌ Sistema no disponible</td></tr>';
        }
        return;
    }
    
    if (currentUser.role === 'director') {
        const currentDataCount = AdminData.getAllData().length;
        console.log('👑 Director - verificando datos actuales:', currentDataCount);
        
        if (currentDataCount === 0) {
            console.log('⚠️ Director no tiene datos, forzando sincronización...');
            const syncedCount = AdminData.forceSyncFromStorage();
            console.log('🔄 Sincronizados', syncedCount, 'registros para el director');
        }
    }
    
    let data = getFilteredData();
    
    console.log('   - Base data:', data.length, 'records');
    
    // Apply director filters if director is logged in
    if (currentUser.role === 'director') {
        const salespersonFilter = document.getElementById('salespersonFilter');
        const statusFilter = document.getElementById('statusFilter');
        
        if (salespersonFilter && salespersonFilter.value) {
            data = data.filter(lead => lead.salesperson === salespersonFilter.value);
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
        const colSpan = currentUser.role === 'director' ? '7' : '6';
        const message = currentUser.role === 'director' 
            ? `No hay leads registrados por el equipo. <button onclick="diagnoseDirectorData()" style="background: #667eea; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; margin-left: 1rem; cursor: pointer;">🔍 Diagnosticar</button>`
            : 'No hay leads registrados';
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; color: #666; padding: 2rem;">${message}</td></tr>`;
        return;
    }
    
    // Sort by date (newest first)
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = data.map(lead => {
        const salespersonCell = currentUser.role === 'director' 
            ? `<td><span style="background: #667eea; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">${getUserDisplayName(lead.salesperson)}</span></td>`
            : '';
        
        // Check if user can delete this lead
        const canDelete = currentUser.role === 'director' || lead.salesperson === currentUser.username;
        
        return `
            <tr>
                <td style="font-weight: 500;">${lead.name}</td>
                <td>${lead.phone}</td>
                <td style="font-size: 0.9rem;">${lead.source}</td>
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
    }).join('');
    
    console.log('✅ Leads table updated with', data.length, 'records');
}

function showLeadDetails(leadId) {
    if (!window.AdminData) {
        alert('❌ Sistema no disponible');
        return;
    }
    
    const allData = AdminData.getAllData();
    const lead = allData.find(l => l.id == leadId);
    if (!lead) {
        alert('❌ Lead no encontrado');
        return;
    }
    
    alert(`📋 DETALLES DEL LEAD

👤 Nombre: ${lead.name}
📞 Teléfono: ${lead.phone}
📧 Email: ${lead.email || 'No proporcionado'}
📍 Fuente: ${lead.source}
🏘️ Ubicación: ${lead.location}
📝 Estado: ${lead.status}
👨‍💼 Vendedor: ${getUserDisplayName(lead.salesperson)}
📅 Fecha: ${formatDate(lead.date)}
⏰ Hora: ${lead.time}

💬 Notas:
${lead.notes || 'Sin notas'}

---
Para cambiar estado: Ve al Pipeline y arrastra la tarjeta
Para eliminar: Usa el botón 🗑️ en la tabla de leads`);
}

// ===== MONITORING (DIRECTOR) =====
function refreshMonitoring() {
    if (currentUser.role !== 'director') {
        alert('❌ Solo el director puede acceder al monitoreo');
        return;
    }
    
    if (!window.AdminData) {
        alert('❌ Sistema no disponible');
        return;
    }
    
    console.log('👀 Actualizando monitoreo del equipo con AdminData');
    updateTeamActivityOverview();
    updateIndividualSalespeopleActivity();
    updateRecentTeamActivity();
}

function updateTeamActivityOverview() {
    if (!window.AdminData) return;
    
    const teamStats = AdminData.getTeamStats();
    console.log('📊 Team stats from AdminData:', teamStats);
    
    const teamGoalProgress = teamStats.salespeople.length > 0 ? 
        (teamStats.salespeople.filter(sp => sp.stats.todayContacts >= 10).length / teamStats.salespeople.length * 100).toFixed(0) : 0;
    
    const container = document.getElementById('teamActivityOverview');
    if (!container) return;
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
            <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #667eea;">${teamStats.todayContacts}</div>
                <div style="font-size: 0.9rem; color: #666;">Contactos Hoy (Equipo)</div>
                <div style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">Meta: ${teamStats.salespeople.length * 10}</div>
            </div>
            
            <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${teamStats.activeLeads}</div>
                <div style="font-size: 0.9rem; color: #666;">Leads Activos</div>
                <div style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">En proceso</div>
            </div>
            
            <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">${teamStats.conversions}</div>
                <div style="font-size: 0.9rem; color: #666;">Conversiones Totales</div>
                <div style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">Este periodo</div>
            </div>
            
            <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #8b5cf6;">${teamGoalProgress}%</div>
                <div style="font-size: 0.9rem; color: #666;">Equipo en Meta</div>
                <div style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">${teamStats.salespeople.filter(sp => sp.stats.todayContacts >= 10).length}/${teamStats.salespeople.length} vendedores</div>
            </div>
        </div>
    `;
}

function updateIndividualSalespeopleActivity() {
    if (!window.AdminData) return;
    
    const teamStats = AdminData.getTeamStats();
    console.log('👥 Generating individual salesperson activity from AdminData');
    
    // Sort by today's contacts (most active first)
    const sortedSalespeople = teamStats.salespeople.sort((a, b) => b.stats.todayContacts - a.stats.todayContacts);
    
    const container = document.getElementById('individualSalespeopleActivity');
    if (!container) return;
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1rem;">
            ${sortedSalespeople.map(person => {
                const stats = person.stats;
                const statusColor = stats.todayContacts >= 10 ? '#10b981' : stats.todayContacts >= 5 ? '#f59e0b' : '#ef4444';
                
                // Calculate days since last activity
                const allData = AdminData.getAllData();
                const userData = allData.filter(d => d.salesperson === person.name);
                const lastActivity = userData.length > 0 ? Math.max(...userData.map(d => new Date(d.date).getTime())) : 0;
                const daysSinceLastActivity = lastActivity > 0 ? Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24)) : 999;
                
                const activityStatus = daysSinceLastActivity === 0 ? '🟢 Activo hoy' : 
                                     daysSinceLastActivity === 1 ? '🟡 Ayer' : 
                                     daysSinceLastActivity < 7 ? `🟠 Hace ${daysSinceLastActivity} días` : '🔴 Inactivo';
                
                const goalProgress = (stats.todayContacts / 10 * 100).toFixed(0);
                
                return `
                    <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 4px solid ${statusColor};">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h4 style="margin: 0; color: #333;">${person.displayName}</h4>
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
                        
                        <div style="display: flex; justify-content: between; gap: 1rem; font-size: 0.85rem; color: #666;">
                            <span>📊 Total: ${stats.totalContacts}</span>
                            <span>✅ Convertidos: ${stats.conversions}</span>
                            <span>📈 Tasa: ${stats.conversionRate}%</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function updateRecentTeamActivity() {
    if (!window.AdminData) return;
    
    // Get recent activities (last 20 activities)
    const allData = AdminData.getAllData();
    const recentData = [...allData]
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
        .slice(0, 20);
    
    console.log('🕒 Generating recent team activity from AdminData:', recentData.length, 'activities');
    
    const container = document.getElementById('recentTeamActivity');
    if (!container) return;
    
    container.innerHTML = `
        <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
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
                    ${recentData.map(activity => `
                        <tr>
                            <td style="font-size: 0.9rem;">${formatDate(activity.date)}</td>
                            <td><span style="background: #667eea; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">${getUserDisplayName(activity.salesperson)}</span></td>
                            <td style="font-weight: 500;">${activity.name}</td>
                            <td style="font-size: 0.9rem;">${activity.source}</td>
                            <td><span class="status-badge status-${activity.status.toLowerCase().replace(' ', '').replace('ó', 'o')}">${activity.status}</span></td>
                            <td>
                                <button onclick="showLeadDetails('${activity.id}')" class="btn btn-primary" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;">
                                    👁️ Ver
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${recentData.length === 0 ? '<p style="text-align: center; color: #666; padding: 2rem;">No hay actividad reciente</p>' : ''}
        </div>
    `;
}

// ===== STATS & REPORTS =====
function updateStats() {
    if (!window.AdminData) {
        console.log('❌ AdminData not available for stats');
        return;
    }
    
    console.log('📊 Updating stats with AdminData for user:', currentUser?.username, currentUser?.role);
    
    let stats;
    if (currentUser.role === 'director') {
        stats = AdminData.getTeamStats();
        console.log('👑 Director stats:', stats);
    } else {
        stats = AdminData.getSalespersonStats(currentUser.username);
        console.log('👤 Salesperson stats:', stats);
    }
    
    // Update stat cards
    const totalLeadsEl = document.getElementById('totalLeads');
    const activeLeadsEl = document.getElementById('activeLeads');
    const conversionsEl = document.getElementById('conversions');
    
    if (totalLeadsEl) totalLeadsEl.textContent = stats.totalContacts || 0;
    if (activeLeadsEl) activeLeadsEl.textContent = stats.activeLeads || 0;
    if (conversionsEl) conversionsEl.textContent = stats.conversions || 0;
    
    // Update progress circle
    const todayContacts = stats.todayContacts || 0;
    const progress = Math.min(todayContacts / 10, 1);
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (progress * circumference);
    
    const progressCircle = document.getElementById('progressCircle');
    const progressText = document.getElementById('progressText');
    
    if (progressCircle && progressText) {
        progressCircle.style.strokeDasharray = circumference;
        progressCircle.style.strokeDashoffset = offset;
        progressText.textContent = `${todayContacts}/10`;
        
        if (progress >= 1) {
            progressCircle.style.stroke = '#10b981';
        } else if (progress >= 0.7) {
            progressCircle.style.stroke = '#f59e0b';
        } else {
            progressCircle.style.stroke = '#ef4444';
        }
    }
    
    console.log('✅ Stats updated successfully');
}

function updateTodayContacts() {
    if (!window.AdminData) {
        console.log('❌ AdminData not available for today contacts');
        return;
    }
    
    const todayContacts = AdminData.getTodayContacts(
        currentUser.role === 'director' ? null : currentUser.username
    );
    
    console.log('📅 Updating today contacts with AdminData');
    console.log(`   - User: ${currentUser.username} (${currentUser.role})`);
    console.log(`   - Today contacts: ${todayContacts.length}`);
    
    const container = document.getElementById('todayContacts');
    if (!container) {
        console.log('❌ Today contacts container not found');
        return;
    }
    
    if (todayContacts.length === 0) {
        const message = currentUser.role === 'director' 
            ? 'No hay contactos registrados hoy por el equipo'
            : 'No hay contactos registrados hoy';
        container.innerHTML = `<p style="color: #666; text-align: center; padding: 2rem;">${message}</p>`;
        return;
    }
    
    // Sort by time (newest first)
    todayContacts.sort((a, b) => {
        const timeA = a.time || '00:00:00';
        const timeB = b.time || '00:00:00';
        return timeB.localeCompare(timeA);
    });
    
    container.innerHTML = todayContacts.map(contact => {
        const salespersonInfo = currentUser.role === 'director' 
            ? `<div style="color: #667eea; font-size: 0.8rem; font-weight: 600; margin-top: 0.25rem;">👤 ${getUserDisplayName(contact.salesperson)}</div>`
            : '';
        
        // Check if user can delete this contact
        const canDelete = currentUser.role === 'director' || contact.salesperson === currentUser.username;
        
        return `
            <div style="background: #f9fafb; padding: 1rem; border-radius: 5px; margin-bottom: 0.5rem; border: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #333;">${contact.name}</div>
                        <div style="color: #666; font-size: 0.9rem; margin-top: 0.25rem;">📞 ${contact.phone}</div>
                        <div style="color: #666; font-size: 0.9rem;">📍 ${contact.source}</div>
                        <div style="color: #888; font-size: 0.8rem; margin-top: 0.5rem;">⏰ ${contact.time}</div>
                        ${salespersonInfo}
                        ${contact.notes ? `<div style="color: #666; font-size: 0.8rem; background: #f0f9ff; padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem;">💬 ${contact.notes}</div>` : ''}
                    </div>
                    ${canDelete ? `<button onclick="deleteLead('${contact.id}')" style="background: #ef4444; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.7rem; cursor: pointer; margin-left: 0.5rem;">🗑️</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    console.log('✅ Today contacts updated with AdminData');
}

function updateReports() {
    if (currentUser.role === 'director') {
        document.getElementById('personalReports').classList.add('hidden');
        document.getElementById('directorReports').classList.remove('hidden');
        updateDirectorReports();
    } else {
        document.getElementById('personalReports').classList.remove('hidden');
        document.getElementById('directorReports').classList.add('hidden');
        updatePersonalReports();
    }
}

function updatePersonalReports() {
    if (!window.AdminData) return;
    
    const stats = AdminData.getSalespersonStats(currentUser.username);
    
    // Calculate weekly contacts
    const allData = AdminData.getDataBySalesperson(currentUser.username);
    const weeklyContacts = allData.filter(c => {
        const contactDate = new Date(c.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return contactDate >= weekAgo;
    }).length;
    
    const weeklyPerformanceEl = document.getElementById('weeklyPerformance');
    if (weeklyPerformanceEl) {
        weeklyPerformanceEl.innerHTML = `
            <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px;">
                <div style="font-size: 2rem; font-weight: bold; color: #667eea; text-align: center;">${weeklyContacts}</div>
                <div style="text-align: center; color: #666;">Contactos esta semana</div>
                <div style="margin-top: 1rem; text-align: center;">
                    <div style="font-size: 0.9rem; color: #666;">Meta semanal: 50 contactos</div>
                    <div style="background: #e5e7eb; height: 8px; border-radius: 4px; margin-top: 0.5rem;">
                        <div style="background: #667eea; height: 8px; border-radius: 4px; width: ${Math.min((weeklyContacts/50)*100, 100)}%;"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    const personalTargetsEl = document.getElementById('personalTargets');
    if (personalTargetsEl) {
        personalTargetsEl.innerHTML = `
            <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px;">
                <div style="margin-bottom: 1rem;">
                    <div style="font-weight: 600;">📊 Mis Estadísticas</div>
                    <div style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">
                        Total leads: ${stats.totalContacts}<br>
                        Conversiones: ${stats.conversions}<br>
                        Tasa de conversión: ${stats.conversionRate}%
                    </div>
                </div>
                <div style="margin-top: 1rem;">
                    <div style="font-weight: 600; color: ${stats.conversionRate >= 15 ? '#10b981' : stats.conversionRate >= 10 ? '#f59e0b' : '#ef4444'}">
                        ${stats.conversionRate >= 15 ? '🏆 ¡Excelente!' : stats.conversionRate >= 10 ? '📈 Buen trabajo' : '💪 Puedes mejorar'}
                    </div>
                </div>
            </div>
        `;
    }
}

function updateDirectorReports() {
    if (!window.AdminData) return;
    
    const teamStats = AdminData.getTeamStats();
    const today = new Date().toISOString().split('T')[0];
    
    const teamPerformanceEl = document.getElementById('teamPerformance');
    if (teamPerformanceEl) {
        teamPerformanceEl.innerHTML = `
            <div style="background: #f9fafb; padding: 1rem; border-radius: 8px;">
                ${teamStats.salespeople.map(person => {
                    const perf = person.stats;
                    return `
                        <div style="margin-bottom: 1rem; padding: 1rem; background: white; border-radius: 5px;">
                            <div style="font-weight: 600; margin-bottom: 0.5rem;">${person.displayName}</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
                                <div>Hoy: ${perf.todayContacts}/10</div>
                                <div>Total: ${perf.totalContacts}</div>
                                <div>Tasa: ${perf.conversionRate}%</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    const sortedTeam = [...teamStats.salespeople].sort((a, b) => b.stats.conversions - a.stats.conversions);
    
    const salesRankingEl = document.getElementById('salesRanking');
    if (salesRankingEl) {
        salesRankingEl.innerHTML = `
            <div style="background: #f9fafb; padding: 1rem; border-radius: 8px;">
                ${sortedTeam.map((person, index) => `
                    <div style="margin-bottom: 0.5rem; padding: 0.75rem; background: white; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-weight: bold; color: ${index === 0 ? '#f59e0b' : '#666'};">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '#' + (index + 1)}</span>
                            ${person.displayName}
                        </div>
                        <div style="font-weight: bold; color: #10b981;">${person.stats.conversions} ventas</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    const executiveSummaryEl = document.getElementById('executiveSummary');
    if (executiveSummaryEl) {
        executiveSummaryEl.innerHTML = `
            <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div style="background: white; padding: 1rem; border-radius: 5px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #667eea;">${teamStats.todayContacts}</div>
                        <div style="font-size: 0.9rem; color: #666;">Contactos Hoy</div>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 5px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">${teamStats.totalContacts}</div>
                        <div style="font-size: 0.9rem; color: #666;">Total Leads</div>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 5px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #f59e0b;">${teamStats.conversions}</div>
                        <div style="font-size: 0.9rem; color: #666;">Conversiones</div>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 5px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #8b5cf6;">${teamStats.conversionRate}%</div>
                        <div style="font-size: 0.9rem; color: #666;">Tasa Conversión</div>
                    </div>
                </div>
            </div>
        `;
    }
}

// ===== EXPORT =====
function exportTodayContacts() {
    const today = new Date().toISOString().split('T')[0];
    const filtered = getFilteredData();
    const todayContacts = filtered.filter(c => c.date === today);
    
    if (todayContacts.length === 0) {
        alert('📋 No hay contactos de hoy para exportar');
        return;
    }
    
    let csvData = "ID,Nombre,Teléfono,Email,Fuente,Ubicación,Notas,Vendedor,Fecha,Hora,Estado\n";
    
    todayContacts.forEach(contact => {
        csvData += `${contact.id},"${contact.name}","${contact.phone}","${contact.email}","${contact.source}","${contact.location}","${contact.notes}","${contact.salesperson}","${contact.date}","${contact.time}","${contact.status}"\n`;
    });
    
    // Crear archivo descargable
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = currentUser.role === 'director' 
        ? `contactos_equipo_${today}.csv`
        : `contactos_${today}_${currentUser.username}.csv`;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    
    // También mostrar datos para copy/paste
    const copyText = todayContacts.map(c => 
        `${c.id}\t${c.name}\t${c.phone}\t${c.email}\t${c.source}\t${c.location}\t${c.notes}\t${c.salesperson}\t${c.date}\t${c.time}\t${c.status}`
    ).join('\n');
    
    // Copiar al clipboard
    navigator.clipboard.writeText(copyText).then(() => {
        alert(`✅ Exportación completada!

📥 Archivo CSV descargado: ${filename}
📋 Datos copiados al clipboard - pégalos directamente en Google Sheets

Total contactos exportados: ${todayContacts.length}`);
    }).catch(() => {
        alert(`✅ Archivo CSV descargado!

📥 Archivo: ${filename}
Total contactos: ${todayContacts.length}

Para copy/paste manual:
${copyText}`);
    });
}
