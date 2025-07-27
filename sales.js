// ===== CONTACTOS =====
async function addContact(event) {
    event.preventDefault();
    
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
        id: Date.now(),
        name: document.getElementById('contactName').value,
        phone: document.getElementById('contactPhone').value,
        email: document.getElementById('contactEmail').value,
        source: source,
        location: document.getElementById('contactLocation').value,
        notes: document.getElementById('contactNotes').value,
        salesperson: currentUser.username,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        status: 'Nuevo'
    };
    
    console.log('📝 Agregando contacto:', contact);
    
    // AGREGAR A LA LISTA GLOBAL
    allData.push(contact);
    
    // GUARDAR LOCALMENTE INMEDIATAMENTE
    saveLocalData();
    
    // LIMPIAR FORMULARIO
    event.target.reset();
    document.getElementById('convenioGroup').style.display = 'none';
    document.getElementById('contactConvenio').required = false;
    
    // ACTUALIZAR TODAS LAS VISTAS INMEDIATAMENTE
    updateAllViews();
    if (typeof refreshPipeline === 'function') refreshPipeline();
    
    console.log('✅ Contacto agregado. Total contactos:', allData.length);
    
    alert(`✅ Contacto registrado y guardado localmente!

📊 Total contactos en sistema: ${allData.length}
👤 Agregado por: ${currentUser.name}
📅 Fecha: ${contact.date}

📝 NOTA: Para backup permanente, usa el botón "📋 Exportar" y pega en Google Sheets`);
}

function handleSourceChange() {
    const sourceSelect = document.getElementById('contactSource');
    const convenioGroup = document.getElementById('convenioGroup');
    
    if (sourceSelect.value === 'CONVENIO') {
        convenioGroup.style.display = 'block';
        document.getElementById('contactConvenio').required = true;
    } else {
        convenioGroup.style.display = 'none';
        document.getElementById('contactConvenio').required = false;
        document.getElementById('contactConvenio').value = '';
    }
}

// ===== LEADS TABLE =====
function updateLeadsTable() {
    let data = getFilteredData();
    
    console.log('📋 Actualizando tabla de leads');
    console.log('   - Datos base:', data.length);
    
    // Apply director filters if director is logged in
    if (currentUser.role === 'director') {
        const salespersonFilter = document.getElementById('salespersonFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        
        if (salespersonFilter) {
            data = data.filter(lead => lead.salesperson === salespersonFilter);
            console.log('   - Filtrado por vendedor:', data.length);
        }
        if (statusFilter) {
            data = data.filter(lead => lead.status === statusFilter);
            console.log('   - Filtrado por estado:', data.length);
        }
    }
    
    const tbody = document.getElementById('leadsTable');
    if (!tbody) {
        console.log('❌ Tabla de leads no encontrada');
        return;
    }
    
    if (data.length === 0) {
        const colSpan = currentUser.role === 'director' ? '7' : '6';
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; color: #666; padding: 2rem;">No hay leads registrados</td></tr>`;
        return;
    }
    
    tbody.innerHTML = data.map(lead => {
        const salespersonCell = currentUser.role === 'director' 
            ? `<td><span style="background: #667eea; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">${getUserDisplayName(lead.salesperson)}</span></td>`
            : '';
        
        return `
            <tr>
                <td style="font-weight: 500;">${lead.name}</td>
                <td>${lead.phone}</td>
                <td>${lead.source}</td>
                <td><span class="status-badge status-${lead.status.toLowerCase().replace(' ', '')}">${lead.status}</span></td>
                <td>${lead.date}</td>
                ${salespersonCell}
                <td>
                    <button onclick="showLeadDetails('${lead.id}')" class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                        📋 Ver
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    console.log('✅ Tabla de leads actualizada con', data.length, 'registros');
}

function showLeadDetails(leadId) {
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
Para cambiar estado: Ve al Pipeline y arrastra la tarjeta`);
}

// ===== MONITORING (DIRECTOR) =====
function refreshMonitoring() {
    if (currentUser.role !== 'director') {
        alert('❌ Solo el director puede acceder al monitoreo');
        return;
    }
    
    console.log('👀 Actualizando monitoreo del equipo');
    updateTeamActivityOverview();
    updateIndividualSalespeopleActivity();
    updateRecentTeamActivity();
}

function updateTeamActivityOverview() {
    const today = new Date().toISOString().split('T')[0];
    const salespeople = [...new Set(allData.map(d => d.salesperson))].filter(s => s);
    
    console.log('📊 Generando resumen de actividad del equipo');
    console.log('   - Vendedores encontrados:', salespeople);
    
    let totalTodayContacts = 0;
    let totalActiveLeads = 0;
    let totalConversions = 0;
    let salespeopleMetGoal = 0;
    
    salespeople.forEach(salesperson => {
        const userData = allData.filter(d => d.salesperson === salesperson);
        const todayContacts = userData.filter(c => c.date === today).length;
        const activeLeads = userData.filter(l => l.status !== 'Convertido' && l.status !== 'Perdido').length;
        const conversions = userData.filter(l => l.status === 'Convertido').length;
        
        totalTodayContacts += todayContacts;
        totalActiveLeads += activeLeads;
        totalConversions += conversions;
        
        if (todayContacts >= 10) salespeopleMetGoal++;
        
        console.log(`   - ${getUserDisplayName(salesperson)}: ${todayContacts} contactos hoy, ${activeLeads} activos, ${conversions} conversiones`);
    });
    
    const teamGoalProgress = salespeople.length > 0 ? (salespeopleMetGoal / salespeople.length * 100).toFixed(0) : 0;
    
    document.getElementById('teamActivityOverview').innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
            <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #667eea;">${totalTodayContacts}</div>
                <div style="font-size: 0.9rem; color: #666;">Contactos Hoy (Equipo)</div>
                <div style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">Meta: ${salespeople.length * 10}</div>
            </div>
            
            <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${totalActiveLeads}</div>
                <div style="font-size: 0.9rem; color: #666;">Leads Activos</div>
                <div style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">En proceso</div>
            </div>
            
            <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">${totalConversions}</div>
                <div style="font-size: 0.9rem; color: #666;">Conversiones Totales</div>
                <div style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">Este periodo</div>
            </div>
            
            <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #8b5cf6;">${teamGoalProgress}%</div>
                <div style="font-size: 0.9rem; color: #666;">Equipo en Meta</div>
                <div style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">${salespeopleMetGoal}/${salespeople.length} vendedores</div>
            </div>
        </div>
    `;
}

function updateIndividualSalespeopleActivity() {
    const today = new Date().toISOString().split('T')[0];
    const salespeople = [...new Set(allData.map(d => d.salesperson))].filter(s => s);
    
    console.log('👥 Generando actividad individual por vendedor');
    
    const salespeopleData = salespeople.map(salesperson => {
        const userData = allData.filter(d => d.salesperson === salesperson);
        const todayContacts = userData.filter(c => c.date === today).length;
        const totalLeads = userData.length;
        const activeLeads = userData.filter(l => l.status !== 'Convertido' && l.status !== 'Perdido').length;
        const conversions = userData.filter(l => l.status === 'Convertido').length;
        const conversionRate = totalLeads > 0 ? (conversions / totalLeads * 100).toFixed(1) : 0;
        const lastActivity = userData.length > 0 ? Math.max(...userData.map(d => new Date(d.date).getTime())) : 0;
        const daysSinceLastActivity = lastActivity > 0 ? Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24)) : 999;
        
        return {
            username: salesperson,
            name: getUserDisplayName(salesperson),
            todayContacts,
            totalLeads,
            activeLeads,
            conversions,
            conversionRate: parseFloat(conversionRate),
            daysSinceLastActivity,
            goalProgress: (todayContacts / 10 * 100).toFixed(0)
        };
    });
    
    // Sort by today's contacts (most active first)
    salespeopleData.sort((a, b) => b.todayContacts - a.todayContacts);
    
    document.getElementById('individualSalespeopleActivity').innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1rem;">
            ${salespeopleData.map(person => {
                const statusColor = person.todayContacts >= 10 ? '#10b981' : person.todayContacts >= 5 ? '#f59e0b' : '#ef4444';
                const activityStatus = person.daysSinceLastActivity === 0 ? '🟢 Activo hoy' : 
                                     person.daysSinceLastActivity === 1 ? '🟡 Ayer' : 
                                     person.daysSinceLastActivity < 7 ? `🟠 Hace ${person.daysSinceLastActivity} días` : '🔴 Inactivo';
                
                return `
                    <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 4px solid ${statusColor};">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h4 style="margin: 0; color: #333;">${person.name}</h4>
                            <span style="font-size: 0.8rem; color: #666;">${activityStatus}</span>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div>
                                <div style="font-size: 1.5rem; font-weight: bold; color: ${statusColor};">${person.todayContacts}/10</div>
                                <div style="font-size: 0.8rem; color: #666;">Contactos Hoy</div>
                            </div>
                            <div>
                                <div style="font-size: 1.5rem; font-weight: bold; color: #667eea;">${person.activeLeads}</div>
                                <div style="font-size: 0.8rem; color: #666;">Leads Activos</div>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666;">
                                <span>Progreso Meta Diaria</span>
                                <span>${person.goalProgress}%</span>
                            </div>
                            <div style="background: #e5e7eb; height: 6px; border-radius: 3px; margin-top: 0.25rem;">
                                <div style="background: ${statusColor}; height: 6px; border-radius: 3px; width: ${Math.min(person.goalProgress, 100)}%;"></div>
                            </div>
                        </div>
                        
                        <div style="display: flex; justify-content: between; gap: 1rem; font-size: 0.85rem; color: #666;">
                            <span>📊 Total: ${person.totalLeads}</span>
                            <span>✅ Convertidos: ${person.conversions}</span>
                            <span>📈 Tasa: ${person.conversionRate}%</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function updateRecentTeamActivity() {
    // Get recent activities (last 20 activities)
    const recentData = [...allData]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 20);
    
    console.log('🕒 Generando actividad reciente del equipo:', recentData.length, 'actividades');
    
    document.getElementById('recentTeamActivity').innerHTML = `
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
                            <td><span class="status-badge status-${activity.status.toLowerCase().replace(' ', '')}">${activity.status}</span></td>
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
    const today = new Date().toISOString().split('T')[0];
    const data = getFilteredData();
    
    let todayContacts, totalLeads, activeLeads, conversions;
    
    if (currentUser.role === 'director') {
        console.log('📊 Calculando estadísticas del DIRECTOR');
        todayContacts = allData.filter(c => c.date === today).length;
        totalLeads = allData.length;
        activeLeads = allData.filter(l => l.status !== 'Convertido' && l.status !== 'Perdido').length;
        conversions = allData.filter(l => l.status === 'Convertido').length;
    } else {
        console.log('📊 Calculando estadísticas del VENDEDOR');
        todayContacts = data.filter(c => c.date === today).length;
        totalLeads = data.length;
        activeLeads = data.filter(l => l.status !== 'Convertido' && l.status !== 'Perdido').length;
        conversions = data.filter(l => l.status === 'Convertido').length;
    }
    
    console.log(`   - Contactos hoy: ${todayContacts}`);
    console.log(`   - Total leads: ${totalLeads}`);
    console.log(`   - Leads activos: ${activeLeads}`);
    console.log(`   - Conversiones: ${conversions}`);
    
    document.getElementById('totalLeads').textContent = totalLeads;
    document.getElementById('activeLeads').textContent = activeLeads;
    document.getElementById('conversions').textContent = conversions;
    
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
}

function updateTodayContacts() {
    const today = new Date().toISOString().split('T')[0];
    const data = getFilteredData();
    const todayContacts = data.filter(c => c.date === today);
    
    console.log('📅 Actualizando contactos de hoy');
    console.log(`   - Usuario: ${currentUser.username} (${currentUser.role})`);
    console.log(`   - Fecha: ${today}`);
    console.log(`   - Datos filtrados: ${data.length}`);
    console.log(`   - Contactos de hoy: ${todayContacts.length}`);
    
    const container = document.getElementById('todayContacts');
    if (!container) {
        console.log('❌ Contenedor de contactos de hoy no encontrado');
        return;
    }
    
    if (todayContacts.length === 0) {
        const message = currentUser.role === 'director' 
            ? 'No hay contactos registrados hoy por el equipo'
            : 'No hay contactos registrados hoy';
        container.innerHTML = `<p style="color: #666; text-align: center; padding: 2rem;">${message}</p>`;
        return;
    }
    
    container.innerHTML = todayContacts.map(contact => {
        const salespersonInfo = currentUser.role === 'director' 
            ? `<div style="color: #667eea; font-size: 0.8rem; font-weight: 600; margin-top: 0.25rem;">👤 ${getUserDisplayName(contact.salesperson)}</div>`
            : '';
        
        return `
            <div style="background: #f9fafb; padding: 1rem; border-radius: 5px; margin-bottom: 0.5rem; border: 1px solid #e5e7eb;">
                <div style="font-weight: 600; color: #333;">${contact.name}</div>
                <div style="color: #666; font-size: 0.9rem; margin-top: 0.25rem;">📞 ${contact.phone}</div>
                <div style="color: #666; font-size: 0.9rem;">📍 ${contact.source}</div>
                <div style="color: #888; font-size: 0.8rem; margin-top: 0.5rem;">⏰ ${contact.time}</div>
                ${salespersonInfo}
                ${contact.notes ? `<div style="color: #666; font-size: 0.8rem; background: #f0f9ff; padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem;">💬 ${contact.notes}</div>` : ''}
            </div>
        `;
    }).join('');
    
    console.log('✅ Contactos de hoy actualizados');
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
    const data = getFilteredData();
    
    const weeklyContacts = data.filter(c => {
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
    
    const conversions = data.filter(l => l.status === 'Convertido').length;
    const conversionRate = data.length > 0 ? (conversions / data.length * 100).toFixed(1) : 0;
    
    const personalTargetsEl = document.getElementById('personalTargets');
    if (personalTargetsEl) {
        personalTargetsEl.innerHTML = `
            <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px;">
                <div style="margin-bottom: 1rem;">
                    <div style="font-weight: 600;">📊 Mis Estadísticas</div>
                    <div style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">
                        Total leads: ${data.length}<br>
                        Conversiones: ${conversions}<br>
                        Tasa de conversión: ${conversionRate}%
                    </div>
                </div>
                <div style="margin-top: 1rem;">
                    <div style="font-weight: 600; color: ${conversionRate >= 15 ? '#10b981' : conversionRate >= 10 ? '#f59e0b' : '#ef4444'}">
                        ${conversionRate >= 15 ? '🏆 ¡Excelente!' : conversionRate >= 10 ? '📈 Buen trabajo' : '💪 Puedes mejorar'}
                    </div>
                </div>
            </div>
        `;
    }
}

function updateDirectorReports() {
    const today = new Date().toISOString().split('T')[0];
    const salespeople = [...new Set(allData.map(d => d.salesperson))].filter(s => s);
    
    const teamPerf = salespeople.map(salesperson => {
        const userData = allData.filter(d => d.salesperson === salesperson);
        const todayContacts = userData.filter(c => c.date === today).length;
        const totalLeads = userData.length;
        const conversions = userData.filter(l => l.status === 'Convertido').length;
        const conversionRate = totalLeads > 0 ? (conversions / totalLeads * 100).toFixed(1) : 0;
        
        return {
            name: getUserDisplayName(salesperson),
            todayContacts,
            totalLeads,
            conversions,
            conversionRate: parseFloat(conversionRate)
        };
    });
    
    const teamPerformanceEl = document.getElementById('teamPerformance');
    if (teamPerformanceEl) {
        teamPerformanceEl.innerHTML = `
            <div style="background: #f9fafb; padding: 1rem; border-radius: 8px;">
                ${teamPerf.map(perf => `
                    <div style="margin-bottom: 1rem; padding: 1rem; background: white; border-radius: 5px;">
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">${perf.name}</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
                            <div>Hoy: ${perf.todayContacts}/10</div>
                            <div>Total: ${perf.totalLeads}</div>
                            <div>Tasa: ${perf.conversionRate}%</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    const sortedTeam = [...teamPerf].sort((a, b) => b.conversions - a.conversions);
    
    const salesRankingEl = document.getElementById('salesRanking');
    if (salesRankingEl) {
        salesRankingEl.innerHTML = `
            <div style="background: #f9fafb; padding: 1rem; border-radius: 8px;">
                ${sortedTeam.map((perf, index) => `
                    <div style="margin-bottom: 0.5rem; padding: 0.75rem; background: white; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-weight: bold; color: ${index === 0 ? '#f59e0b' : '#666'};">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '#' + (index + 1)}</span>
                            ${perf.name}
                        </div>
                        <div style="font-weight: bold; color: #10b981;">${perf.conversions} ventas</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    const totalTeamLeads = allData.length;
    const totalTeamConversions = allData.filter(l => l.status === 'Convertido').length;
    const teamConversionRate = totalTeamLeads > 0 ? (totalTeamConversions / totalTeamLeads * 100).toFixed(1) : 0;
    const todayTotalContacts = allData.filter(c => c.date === today).length;
    
    const executiveSummaryEl = document.getElementById('executiveSummary');
    if (executiveSummaryEl) {
        executiveSummaryEl.innerHTML = `
            <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div style="background: white; padding: 1rem; border-radius: 5px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #667eea;">${todayTotalContacts}</div>
                        <div style="font-size: 0.9rem; color: #666;">Contactos Hoy</div>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 5px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">${totalTeamLeads}</div>
                        <div style="font-size: 0.9rem; color: #666;">Total Leads</div>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 5px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #f59e0b;">${totalTeamConversions}</div>
                        <div style="font-size: 0.9rem; color: #666;">Conversiones</div>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 5px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #8b5cf6;">${teamConversionRate}%</div>
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
