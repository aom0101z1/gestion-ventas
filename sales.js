// ===== SOLUCIÓN: FLUJO DE DATOS UNIFICADO =====

// 1. REEMPLAZAR la función addContact en sales.js
async function addContact(event) {
    event.preventDefault();
    
    console.log('🚀 INICIANDO PROCESO DE AGREGAR CONTACTO REAL...');
    console.log('   - Usuario actual:', currentUser.username, '(' + currentUser.role + ')');
    
    if (!window.AdminData) {
        console.error('❌ AdminData no disponible');
        alert('❌ Sistema no disponible. Recarga la página.');
        return;
    }
    
    // Verificar estado de AdminData antes de agregar
    const datosAntes = AdminData.getAllData().length;
    console.log('📊 Datos en AdminData ANTES de agregar:', datosAntes);
    
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
    
    console.log('📝 Contacto a agregar:', contact);
    
    try {
        console.log('➕ Agregando contacto a AdminData...');
        const savedContact = AdminData.addContact(contact);
        
        const datosDespues = AdminData.getAllData().length;
        console.log('📊 Datos en AdminData DESPUÉS de agregar:', datosDespues);
        console.log('✅ Incremento de datos:', datosDespues - datosAntes);
        
        if (!savedContact) {
            throw new Error('AdminData.addContact devolvió null');
        }
        
        console.log('✅ Contacto guardado en AdminData con ID:', savedContact.id);
        
        const verification = AdminData.getAllData().find(c => c.id === savedContact.id);
        if (!verification) {
            throw new Error('Contacto no encontrado en verificación');
        }
        console.log('✅ Verificación exitosa: contacto existe en AdminData');
        
        if (window.GitHubData && window.GitHubData.getToken()) {
            try {
                await window.GitHubData.addContact(savedContact);
                console.log('✅ Contacto también guardado en GitHub');
            } catch (error) {
                console.log('⚠️ GitHub save failed, pero contacto guardado localmente:', error.message);
            }
        }
        
        event.target.reset();
        document.getElementById('convenioGroup').style.display = 'none';
        document.getElementById('contactConvenio').required = false;
        
        console.log('🔄 INICIANDO ACTUALIZACIÓN DE VISTAS...');
        
        setTimeout(() => {
            console.log('🎯 Actualizando todas las vistas...');
            updateAllViews();
            
            if (typeof refreshPipeline === 'function') {
                refreshPipeline();
            }
            
            setTimeout(() => {
                updateLeadsTable();
                console.log('✅ Vista de leads actualizada');
            }, 200);
            
        }, 100);
        
        const stats = AdminData.getSalespersonStats(currentUser.username);
        const teamStats = AdminData.getTeamStats();
        
        console.log('📊 Stats actualizados:', stats);
        console.log('🏢 Team stats:', teamStats);
        
        alert(`✅ ¡Contacto registrado exitosamente!

👤 Contacto: ${savedContact.name}
🆔 ID: ${savedContact.id}
📊 Tus estadísticas:
   • Total contactos: ${stats.totalContacts}
   • Contactos hoy: ${stats.todayContacts}
   • Conversiones: ${stats.conversions}

🏢 Sistema total: ${teamStats.totalContacts} contactos

✨ Los datos están disponibles INMEDIATAMENTE para el director!

🔍 DEBUG INFO:
   • AdminData: ${AdminData.getAllData().length} registros
   • Fecha: ${savedContact.date}
   • Hora: ${savedContact.time}`);
        
    } catch (error) {
        console.error('❌ ERROR AL AGREGAR CONTACTO:', error);
        alert(`❌ Error al guardar contacto: ${error.message}

🔍 Para debug:
1. Abre la consola del navegador (F12)
2. Mira los logs detallados
3. Verifica que AdminData esté funcionando`);
    }
}

// 2. NUEVA FUNCIÓN: Verificador de Integridad de Datos
function verifyDataIntegrity() {
    if (!window.AdminData) {
        console.error('❌ AdminData no disponible');
        return false;
    }
    
    console.log('🔍 VERIFICANDO INTEGRIDAD DE DATOS...');
    
    const adminData = AdminData.getAllData();
    const localStorage = JSON.parse(window.localStorage.getItem('ciudad_bilingue_sales_data') || '[]');
    
    console.log('📊 AdminData:', adminData.length, 'registros');
    console.log('📊 localStorage:', localStorage.length, 'registros');
    
    if (adminData.length !== localStorage.length) {
        console.warn('⚠️ Desincronización detectada');
        return false;
    }
    
    if (adminData.length > 0 && localStorage.length > 0) {
        const lastAdminId = Math.max(...adminData.map(d => d.id));
        const lastLocalId = Math.max(...localStorage.map(d => d.id));
        
        console.log('🆔 Último ID AdminData:', lastAdminId);
        console.log('🆔 Último ID localStorage:', lastLocalId);
        
        if (lastAdminId !== lastLocalId) {
            console.warn('⚠️ IDs no coinciden');
            return false;
        }
    }
    
    console.log('✅ Integridad de datos verificada');
    return true;
}

// 3. MEJORAR la función generateTestData para usar el mismo flujo
function generateTestData() {
    console.log('🧪 Generating test data...');
    
    if (!window.AdminData) {
        alert('❌ AdminData not available. Please refresh the page.');
        return;
    }
    
    verifyDataIntegrity();
    
    const testContacts = [
        { name: "Carlos Rodríguez", phone: "3001234567", email: "carlos.rodriguez@email.com", source: "Facebook", location: "Pereira", notes: "Interesado en curso de inglés intensivo", salesperson: "maria.garcia", status: "Contactado" },
        { name: "Ana Martínez", phone: "3109876543", email: "ana.martinez@gmail.com", source: "Instagram", location: "Dosquebradas", notes: "Quiere clases para su hijo de 12 años", salesperson: "maria.garcia", status: "Interesado" },
        { name: "Luis Gómez", phone: "3156789012", email: "luis.gomez@hotmail.com", source: "Google", location: "La Virginia", notes: "Necesita certificación para trabajo", salesperson: "maria.garcia", date: getYesterdayDate(), status: "Convertido" },
        { name: "Patricia López", phone: "3187654321", email: "patricia.lopez@empresa.com", source: "CONVENIO: Empresa de Energía", location: "Pereira", notes: "Curso corporativo para 5 empleados", salesperson: "juan.perez", status: "Negociación" },
        { name: "Roberto Silva", phone: "3203456789", email: "roberto.silva@yahoo.com", source: "Referido", location: "Santa Rosa", notes: "Recomendado por Ana Martínez", salesperson: "juan.perez", status: "Nuevo" },
        { name: "Carmen Fernández", phone: "3134567890", email: "carmen.fernandez@gmail.com", source: "Volante", location: "Dosquebradas", notes: "Interesada en clases nocturnas", salesperson: "juan.perez", date: getYesterdayDate(), status: "Contactado" }
    ];
    
    console.log('➕ Agregando datos de prueba usando AdminData.addContact()...');
    
    let addedCount = 0;
    testContacts.forEach(contact => {
        try {
            const savedContact = AdminData.addContact(contact);
            if (savedContact) {
                addedCount++;
                console.log(`✅ Dato de prueba agregado: ${savedContact.name} (ID: ${savedContact.id})`);
            }
        } catch (error) {
            console.error('❌ Error agregando dato de prueba:', contact.name, error);
        }
    });
    
    console.log(`✅ ${addedCount} datos de prueba agregados usando AdminData.addContact()`);
    
    setTimeout(() => {
        updateAllViews();
        if (typeof refreshPipeline === 'function') refreshPipeline();
        
        setTimeout(() => {
            const isIntegre = verifyDataIntegrity();
            console.log('🔍 Integridad post-test data:', isIntegre);
        }, 500);
        
    }, 100);
    
    const teamStats = AdminData.getTeamStats();
    
    alert(`🧪 ¡Test data generated successfully!

✅ Added ${addedCount} sample contacts usando AdminData.addContact()
   • María García: ${testContacts.filter(c => c.salesperson === 'maria.garcia').length} contacts
   • Juan Pérez: ${testContacts.filter(c => c.salesperson === 'juan.perez').length} contacts

📊 Total in system: ${teamStats.totalContacts} contacts

🎯 IMPORTANTE: Datos de prueba y datos reales ahora usan EXACTAMENTE el mismo flujo!

✨ El director puede ver todos los datos inmediatamente!`);
}

// 4. FUNCIÓN DE DEBUG EN TIEMPO REAL
function realTimeDataDebug() {
    console.log('🔴 INICIANDO DEBUG EN TIEMPO REAL...');
    
    if (!window.AdminData) {
        alert('❌ AdminData no disponible');
        return;
    }
    
    const currentData = AdminData.getAllData();
    const localStorage = JSON.parse(window.localStorage.getItem('ciudad_bilingue_sales_data') || '[]');
    
    let debugInfo = `🔍 DEBUG EN TIEMPO REAL - ${new Date().toLocaleTimeString()}\n\n`;
    debugInfo += `👤 Usuario: ${currentUser.username} (${currentUser.role})\n`;
    debugInfo += `📊 AdminData: ${currentData.length} registros\n`;
    debugInfo += `📊 localStorage: ${localStorage.length} registros\n`;
    debugInfo += `🔄 Sincronización: ${currentData.length === localStorage.length ? '✅ OK' : '❌ ERROR'}\n\n`;
    
    if (currentUser.role === 'director') {
        debugInfo += `👑 VISTA DEL DIRECTOR:\n`;
        const teamStats = AdminData.getTeamStats();
        debugInfo += `   - Vendedores: ${teamStats.salespeople.length}\n`;
        teamStats.salespeople.forEach(sp => {
            debugInfo += `   - ${sp.displayName}: ${sp.stats.totalContacts} contactos\n`;
        });
    } else {
        const myData = AdminData.getDataBySalesperson(currentUser.username);
        debugInfo += `👤 MIS DATOS:\n`;
        debugInfo += `   - Mis contactos: ${myData.length}\n`;
        debugInfo += `   - Contactos hoy: ${myData.filter(c => c.date === new Date().toISOString().split('T')[0]).length}\n`;
    }
    
    const recentContacts = [...currentData]
        .sort((a, b) => b.id - a.id)
        .slice(0, 3);
    
    debugInfo += `\n📋 ÚLTIMOS 3 CONTACTOS:\n`;
    recentContacts.forEach((contact, index) => {
        debugInfo += `   ${index + 1}. ${contact.name} (${contact.salesperson}) - ID: ${contact.id}\n`;
    });
    
    alert(debugInfo);
    
    console.log('📊 AdminData completo:', currentData);
    console.log('📊 localStorage completo:', localStorage);
    
    return {
        adminDataCount: currentData.length,
        localStorageCount: localStorage.length,
        synchronized: currentData.length === localStorage.length,
        user: currentUser,
        timestamp: new Date().toISOString()
    };
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
    
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = data.map(lead => {
        const salespersonCell = currentUser.role === 'director' 
            ? `<td><span style="background: #667eea; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">${getUserDisplayName(lead.salesperson)}</span></td>`
            : '';
        
        return `
            <tr>
                <td style="font-weight: 500;">${lead.name}</td>
                <td>${lead.phone}</td>
                <td style="font-size: 0.9rem;">${lead.source}</td>
                <td><span class="status-badge status-${lead.status.toLowerCase().replace(' ', '').replace('ó', 'o')}">${lead.status}</span></td>
                <td style="font-size: 0.9rem;">${formatDate(lead.date)}</td>
                ${salespersonCell}
                <td>
                    <button onclick="showLeadDetails('${lead.id}')" class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                        📋 Ver
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    console.log('✅ Leads table updated with', data.length, 'records');
}

// ===== LEAD DETAILS =====
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
Para cambiar estado: Ve al Pipeline y arrastra la tarjeta`);
}

// ===== MONITORING (DIRECTOR) =====
function refreshMonitoring() {
   
