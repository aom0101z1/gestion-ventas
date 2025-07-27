// ===================================================================
// SALES.JS - Gestión de Ventas y Contactos
// ===================================================================

// ===================================================================
// MÓDULO PRINCIPAL DE VENTAS
// ===================================================================
const Sales = {
    convenios: JSON.parse(localStorage.getItem('convenios')) || [
        'Remigio',
        'Hogar Nazaret', 
        'Empresa de Energía',
        'Coats Cadena',
        'Efigas',
        'Cooperativa'
    ],

    // ===================================================================
    // GESTIÓN DE CONTACTOS
    // ===================================================================
    async addContact(event) {
        event.preventDefault();
        
        if (!App.isSystemConnected()) {
            Utils.showWarning('No hay conexión con Google Sheets. Contacta al director.');
            return;
        }
        
        // Determinar la fuente del contacto
        let source = document.getElementById('contactSource').value;
        if (source === 'CONVENIO') {
            const convenio = document.getElementById('contactConvenio').value;
            if (!convenio) {
                Utils.showWarning('Selecciona un convenio');
                return;
            }
            source = `CONVENIO: ${convenio}`;
        }
        
        const contact = {
            id: Utils.generateId(),
            name: document.getElementById('contactName').value,
            phone: document.getElementById('contactPhone').value,
            email: document.getElementById('contactEmail').value,
            source: source,
            location: document.getElementById('contactLocation').value,
            notes: document.getElementById('contactNotes').value,
            salesperson: App.getCurrentUser().username,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
            status: 'Nuevo'
        };
        
        // Simular adición local
        const allData = App.getData();
        allData.push(contact);
        App.setData(allData);
        
        // Limpiar formulario
        event.target.reset();
        document.getElementById('convenioGroup').style.display = 'none';
        document.getElementById('contactConvenio').required = false;
        
        // Actualizar vistas
        this.updateAllViews();
        
        // Notificar al usuario
        alert(`✅ Contacto registrado!\n\n📝 IMPORTANTE: Ve a Google Sheets y agrega manualmente:\n${contact.id} | ${contact.name} | ${contact.phone} | ${contact.email} | ${contact.source} | ${contact.location} | ${contact.notes} | ${contact.salesperson} | ${contact.date} | ${contact.time} | ${contact.status}`);
    },

    handleSourceChange() {
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
    },

    // ===================================================================
    // GESTIÓN DE LEADS
    // ===================================================================
    getFilteredData() {
        const currentUser = App.getCurrentUser();
        const allData = App.getData();
        
        if (currentUser.role === 'director') {
            return allData; // Director ve todo
        } else {
            return allData.filter(item => item.salesperson === currentUser.username);
        }
    },

    updateLeadStatus(leadId, newStatus) {
        const allData = App.getData();
        const leadIndex = allData.findIndex(lead => lead.id == leadId);
        
        if (leadIndex !== -1) {
            allData[leadIndex].status = newStatus;
            App.setData(allData);
            this.updateAllViews();
            Pipeline.refresh();
        }
    },

    // ===================================================================
    // CONVENIOS
    // ===================================================================
    loadConveniosInSelect() {
        const convenioSelect = document.getElementById('contactConvenio');
        if (!convenioSelect) return;
        
        convenioSelect.innerHTML = '<option value="">Seleccionar convenio...</option>';
        
        this.convenios.forEach(convenio => {
            const option = document.createElement('option');
            option.value = convenio;
            option.textContent = convenio;
            convenioSelect.appendChild(option);
        });
    },

    addConvenio() {
        const currentUser = App.getCurrentUser();
        if (currentUser.role !== 'director') {
            Utils.showError('Solo el director puede agregar convenios');
            return;
        }
        
        const convenioName = document.getElementById('newConvenio').value.trim();
        
        if (!convenioName) {
            Utils.showWarning('Ingresa el nombre del convenio');
            return;
        }
        
        if (this.convenios.includes(convenioName)) {
            Utils.showWarning('Este convenio ya existe');
            return;
        }
        
        this.convenios.push(convenioName);
        localStorage.setItem('convenios', JSON.stringify(this.convenios));
        
        document.getElementById('newConvenio').value = '';
        this.updateConveniosList();
        this.loadConveniosInSelect();
        
        Utils.showSuccess('Convenio agregado correctamente');
    },

    deleteConvenio(convenioName) {
        const currentUser = App.getCurrentUser();
        if (currentUser.role !== 'director') {
            Utils.showError('Solo el director puede eliminar convenios');
            return;
        }
        
        if (confirm(`¿Estás seguro de eliminar el convenio "${convenioName}"?`)) {
            this.convenios = this.convenios.filter(c => c !== convenioName);
            localStorage.setItem('convenios', JSON.stringify(this.convenios));
            
            this.updateConveniosList();
            this.loadConveniosInSelect();
            
            Utils.showSuccess('Convenio eliminado');
        }
    },

    updateConveniosList() {
        const container = document.getElementById('conveniosList');
        if (!container) return;
        
        container.innerHTML = this.convenios.map(convenio => `
            <div class="convenio-item">
                <span style="font-size: 0.9rem; font-weight: 500;">${convenio}</span>
                <button onclick="Sales.deleteConvenio('${convenio}')" class="btn btn-warning" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;">
                    🗑️
                </button>
            </div>
        `).join('');
    },

    // ===================================================================
    // USUARIOS
    // ===================================================================
    addUser() {
        const currentUser = App.getCurrentUser();
        if (currentUser.role !== 'director') {
            Utils.showError('Solo el director puede agregar usuarios');
            return;
        }
        
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const role = document.getElementById('newRole').value;
        
        if (!username || !password) {
            Utils.showWarning('Completa todos los campos');
            return;
        }
        
        const users = Auth.getUsers();
        if (users[username]) {
            Utils.showWarning('El usuario ya existe');
            return;
        }
        
        const name = username.split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ');
        Auth.addUser(username, password, role, name);
        
        // Limpiar formulario
        document.getElementById('newUsername').value = '';
        document.getElementById('newPassword').value = '';
        
        this.updateUsersList();
        Utils.showSuccess('Usuario agregado correctamente');
    },

    deleteUser(username) {
        if (username === 'director') {
            Utils.showError('No se puede eliminar al director principal');
            return;
        }
        
        const users = Auth.getUsers();
        if (confirm(`¿Estás seguro de eliminar al usuario ${users[username].name}?`)) {
            Auth.deleteUser(username);
            this.updateUsersList();
            Utils.showSuccess('Usuario eliminado');
        }
    },

    updateUsersList() {
        const container = document.getElementById('usersList');
        if (!container) return;
        
        const users = Auth.getUsers();
        container.innerHTML = Object.entries(users).map(([username, user]) => `
            <div class="user-card">
                <div>
                    <strong>${user.name}</strong>
                    <span style="color: #666; font-size: 0.9rem;">(${username})</span>
                    <span style="background: ${user.role === 'director' ? '#667eea' : '#10b981'}; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem; margin-left: 0.5rem;">
                        ${user.role === 'director' ? 'Director' : 'Vendedor'}
                    </span>
                </div>
                <button onclick="Sales.deleteUser('${username}')" class="btn btn-warning" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" ${username === 'director' ? 'disabled' : ''}>
                    🗑️ Eliminar
                </button>
            </div>
        `).join('');
    },

    // ===================================================================
    // ESTADÍSTICAS Y REPORTES
    // ===================================================================
    updateAllViews() {
        this.updateStats();
        this.updateTodayContacts();
        this.updateLeadsTable();
        this.updateReports();
    },

    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const data = this.getFilteredData();
        const allData = App.getData();
        const currentUser = App.getCurrentUser();
        
        let todayContacts, totalLeads, activeLeads, conversions;
        
        if (currentUser.role === 'director') {
            // Director: estadísticas globales
            todayContacts = allData.filter(c => c.date === today).length;
            totalLeads = allData.length;
            activeLeads = allData.filter(l => l.status !== 'Convertido').length;
            conversions = allData.filter(l => l.status === 'Convertido').length;
        } else {
            // Vendedor: solo sus datos
            todayContacts = data.filter(c => c.date === today).length;
            totalLeads = data.length;
            activeLeads = data.filter(l => l.status !== 'Convertido').length;
            conversions = data.filter(l => l.status === 'Convertido').length;
        }
        
        // Actualizar números
        document.getElementById('totalLeads').textContent = totalLeads;
        document.getElementById('activeLeads').textContent = activeLeads;
        document.getElementById('conversions').textContent = conversions;
        
        // Actualizar progreso circular
        const progress = Math.min(todayContacts / 10, 1);
        const circumference = 2 * Math.PI * 54;
        const offset = circumference - (progress * circumference);
        
        const progressCircle = document.getElementById('progressCircle');
        const progressText = document.getElementById('progressText');
        
        if (progressCircle && progressText) {
            progressCircle.style.strokeDasharray = circumference;
            progressCircle.style.strokeDashoffset = offset;
            progressText.textContent = `${todayContacts}/10`;
            
            // Cambiar color según progreso
            if (progress >= 1) {
                progressCircle.style.stroke = '#10b981';
            } else if (progress >= 0.7) {
                progressCircle.style.stroke = '#f59e0b';
            } else {
                progressCircle.style.stroke = '#ef4444';
            }
        }
    },

    updateTodayContacts() {
        const today = new Date().toISOString().split('T')[0];
        const data = this.getFilteredData();
        const todayContacts = data.filter(c => c.date === today);
        
        const container = document.getElementById('todayContacts');
        if (!container) return;
        
        if (todayContacts.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 2rem;">No hay contactos registrados hoy</p>';
            return;
        }
        
        container.innerHTML = todayContacts.map(contact => `
            <div style="background: #f9fafb; padding: 1rem; border-radius: 5px; margin-bottom: 0.5rem;">
                <div style="font-weight: 600;">${contact.name}</div>
                <div style="color: #666; font-size: 0.9rem;">${contact.phone} • ${contact.source}</div>
                <div style="color: #666; font-size: 0.9rem;">${contact.time}</div>
            </div>
        `).join('');
    },

    updateLeadsTable() {
        const data = this.getFilteredData();
        const tbody = document.getElementById('leadsTable');
        if (!tbody) return;
        
        tbody.innerHTML = data.map(lead => `
            <tr>
                <td>${lead.name}</td>
                <td>${lead.phone}</td>
                <td>${lead.source}</td>
                <td><span class="status-badge status-${lead.status.toLowerCase().replace(' ', '')}">${lead.status}</span></td>
                <td>${lead.date}</td>
                <td>
                    <button onclick="alert('Para cambiar estado, edita directamente en Google Sheets')" class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                        Editar
                    </button>
                </td>
            </tr>
        `).join('');
    },

    updateReports() {
        const currentUser = App.getCurrentUser();
        
        if (currentUser.role === 'director') {
            document.getElementById('personalReports').classList.add('hidden');
            document.getElementById('directorReports').classList.remove('hidden');
            this.updateDirectorReports();
        } else {
            document.getElementById('personalReports').classList.remove('hidden');
            document.getElementById('directorReports').classList.add('hidden');
            this.updatePersonalReports();
        }
    },

    updatePersonalReports() {
        const data = this.getFilteredData();
        const today = new Date().toISOString().split('T')[0];
        
        // Rendimiento semanal
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
        
        // Objetivos personales
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
    },

    updateDirectorReports() {
        const allData = App.getData();
        const today = new Date().toISOString().split('T')[0];
        const salespeople = [...new Set(allData.map(d => d.salesperson))].filter(s => s);
        
        // Rendimiento del equipo
        const teamPerf = salespeople.map(salesperson => {
            const userData = allData.filter(d => d.salesperson === salesperson);
            const todayContacts = userData.filter(c => c.date === today).length;
            const totalLeads = userData.length;
            const conversions = userData.filter(l => l.status === 'Convertido').length;
            const conversionRate = totalLeads > 0 ? (conversions / totalLeads * 100).toFixed(1) : 0;
            
            return {
                name: Utils.getUserDisplayName(salesperson),
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
        
        // Ranking de ventas
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
        
        // Resumen ejecutivo
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
    },

    // ===================================================================
    // UTILIDADES
    // ===================================================================
    refreshData() {
        if (App.isSystemConnected()) {
            Sheets.connect();
        } else {
            Utils.showWarning('No hay conexión con Google Sheets');
        }
    }
};

// ===================================================================
// INICIALIZACIÓN
// ===================================================================
console.log('✅ Sales.js cargado correctamente');