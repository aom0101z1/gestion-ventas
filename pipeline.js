// ===================================================================
// PIPELINE.JS - Pipeline Visual de Ventas
// ===================================================================

// ===================================================================
// MÓDULO DE PIPELINE VISUAL
// ===================================================================
const Pipeline = {
    stages: [
        { id: 'nuevo', name: 'Nuevo', color: '#f59e0b' },
        { id: 'contactado', name: 'Contactado', color: '#3b82f6' },
        { id: 'interesado', name: 'Interesado', color: '#8b5cf6' },
        { id: 'negociacion', name: 'Negociación', color: '#f97316' },
        { id: 'convertido', name: 'Convertido', color: '#10b981' },
        { id: 'perdido', name: 'Perdido', color: '#ef4444' }
    ],

    draggedElement: null,

    // ===================================================================
    // INICIALIZACIÓN DEL PIPELINE
    // ===================================================================
    init() {
        console.log('🎯 Inicializando Pipeline Visual...');
        this.createPipelineBoard();
        this.setupDragAndDrop();
    },

    // ===================================================================
    // CREAR TABLERO VISUAL
    // ===================================================================
    createPipelineBoard() {
        const container = document.getElementById('pipelineContainer');
        if (!container) return;

        container.innerHTML = this.stages.map(stage => `
            <div class="pipeline-column" id="column-${stage.id}" data-stage="${stage.id}">
                <div class="pipeline-header" style="border-left: 4px solid ${stage.color};">
                    <strong>${stage.name}</strong>
                    <span id="count-${stage.id}" style="background: ${stage.color}; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem; margin-left: 0.5rem;">0</span>
                </div>
                <div class="pipeline-cards" id="cards-${stage.id}">
                    <!-- Las tarjetas se cargan aquí -->
                </div>
            </div>
        `).join('');
    },

    // ===================================================================
    // CARGAR DATOS EN EL PIPELINE
    // ===================================================================
    refresh() {
        const data = Sales.getFilteredData();
        
        // Limpiar todas las columnas
        this.stages.forEach(stage => {
            const container = document.getElementById(`cards-${stage.id}`);
            if (container) {
                container.innerHTML = '';
            }
        });

        // Distribuir leads por etapa
        data.forEach(lead => {
            this.addLeadToStage(lead);
        });

        // Actualizar contadores
        this.updateCounters();
    },

    // ===================================================================
    // AGREGAR LEAD A UNA ETAPA
    // ===================================================================
    addLeadToStage(lead) {
        const stageId = this.getStageIdFromStatus(lead.status);
        const container = document.getElementById(`cards-${stageId}`);
        
        if (!container) return;

        const card = this.createLeadCard(lead);
        container.appendChild(card);
    },

    // ===================================================================
    // CREAR TARJETA DE LEAD
    // ===================================================================
    createLeadCard(lead) {
        const card = document.createElement('div');
        card.className = 'pipeline-card';
        card.draggable = true;
        card.dataset.leadId = lead.id;
        
        // Determinar tiempo desde último contacto
        const daysSinceContact = this.getDaysSinceContact(lead.date);
        const urgencyColor = daysSinceContact > 3 ? '#ef4444' : daysSinceContact > 1 ? '#f59e0b' : '#10b981';
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <strong style="font-size: 0.9rem; line-height: 1.2;">${lead.name}</strong>
                <span style="background: ${urgencyColor}; color: white; padding: 0.1rem 0.3rem; border-radius: 8px; font-size: 0.7rem;">
                    ${daysSinceContact}d
                </span>
            </div>
            
            <div style="font-size: 0.8rem; color: #666; margin-bottom: 0.5rem;">
                📞 ${lead.phone}
            </div>
            
            <div style="font-size: 0.8rem; color: #666; margin-bottom: 0.5rem;">
                📍 ${lead.source}
            </div>
            
            ${lead.notes ? `
                <div style="font-size: 0.75rem; color: #888; background: #f9fafb; padding: 0.3rem; border-radius: 4px; margin-top: 0.5rem;">
                    💬 ${lead.notes.substring(0, 50)}${lead.notes.length > 50 ? '...' : ''}
                </div>
            ` : ''}
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.7rem; color: #888;">
                <span>👤 ${Utils.getUserDisplayName(lead.salesperson)}</span>
                <span>${Utils.formatDate(lead.date)}</span>
            </div>
            
            <div style="margin-top: 0.5rem;">
                <button onclick="Pipeline.openLeadDetails(${lead.id})" class="btn btn-primary" style="width: 100%; padding: 0.3rem; font-size: 0.7rem;">
                    📋 Ver Detalles
                </button>
            </div>
        `;

        return card;
    },

    // ===================================================================
    // DRAG AND DROP
    // ===================================================================
    setupDragAndDrop() {
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('pipeline-card')) {
                this.draggedElement = e.target;
                e.target.classList.add('dragging');
            }
        });

        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('pipeline-card')) {
                e.target.classList.remove('dragging');
                this.draggedElement = null;
            }
        });

        // Configurar zonas de drop
        this.stages.forEach(stage => {
            const column = document.getElementById(`column-${stage.id}`);
            if (!column) return;

            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.style.background = '#e0f2fe';
            });

            column.addEventListener('dragleave', (e) => {
                e.preventDefault();
                column.style.background = '#f8fafc';
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.style.background = '#f8fafc';
                
                if (this.draggedElement) {
                    this.moveLeadToStage(this.draggedElement, stage.id);
                }
            });
        });
    },

    // ===================================================================
    // MOVER LEAD ENTRE ETAPAS
    // ===================================================================
    moveLeadToStage(cardElement, newStageId) {
        const leadId = parseInt(cardElement.dataset.leadId);
        const newStatus = this.getStatusFromStageId(newStageId);
        
        // Actualizar en los datos
        Sales.updateLeadStatus(leadId, newStatus);
        
        // Mover visualmente
        const newContainer = document.getElementById(`cards-${newStageId}`);
        if (newContainer) {
            newContainer.appendChild(cardElement);
        }
        
        // Actualizar contadores
        this.updateCounters();
        
        // Actualizar estadísticas generales
        Sales.updateStats();
        
        // Mostrar confirmación
        const stageName = this.stages.find(s => s.id === newStageId)?.name;
        Utils.showSuccess(`Lead movido a ${stageName}`);
    },

    // ===================================================================
    // UTILIDADES DE MAPEO
    // ===================================================================
    getStageIdFromStatus(status) {
        const mapping = {
            'Nuevo': 'nuevo',
            'Contactado': 'contactado',
            'Interesado': 'interesado',
            'Negociación': 'negociacion',
            'Convertido': 'convertido',
            'Perdido': 'perdido'
        };
        return mapping[status] || 'nuevo';
    },

    getStatusFromStageId(stageId) {
        const mapping = {
            'nuevo': 'Nuevo',
            'contactado': 'Contactado',
            'interesado': 'Interesado',
            'negociacion': 'Negociación',
            'convertido': 'Convertido',
            'perdido': 'Perdido'
        };
        return mapping[stageId] || 'Nuevo';
    },

    // ===================================================================
    // CÁLCULOS Y ESTADÍSTICAS
    // ===================================================================
    getDaysSinceContact(dateString) {
        const contactDate = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(today - contactDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    updateCounters() {
        this.stages.forEach(stage => {
            const container = document.getElementById(`cards-${stage.id}`);
            const counter = document.getElementById(`count-${stage.id}`);
            
            if (container && counter) {
                const count = container.children.length;
                counter.textContent = count;
            }
        });
    },

    // ===================================================================
    // DETALLES DEL LEAD
    // ===================================================================
    openLeadDetails(leadId) {
        const allData = App.getData();
        const lead = allData.find(l => l.id == leadId);
        
        if (!lead) {
            Utils.showError('Lead no encontrado');
            return;
        }

        const detailsModal = `
        🏷️ DETALLES DEL LEAD
        
        👤 Nombre: ${lead.name}
        📞 Teléfono: ${lead.phone}
        📧 Email: ${lead.email || 'No proporcionado'}
        📍 Fuente: ${lead.source}
        🏘️ Ubicación: ${lead.location}
        📝 Estado: ${lead.status}
        👨‍💼 Vendedor: ${Utils.getUserDisplayName(lead.salesperson)}
        📅 Fecha: ${Utils.formatDate(lead.date)}
        ⏰ Hora: ${lead.time}
        
        💬 Notas:
        ${lead.notes || 'Sin notas'}
        
        ---
        🔄 Para cambiar estado: Arrastra la tarjeta a otra columna
        📝 Para editar: Ve a la pestaña "Mis Leads"
        `;

        alert(detailsModal);
    },

    // ===================================================================
    // ANÁLISIS DEL PIPELINE
    // ===================================================================
    getConversionRate() {
        const data = Sales.getFilteredData();
        const total = data.length;
        const converted = data.filter(l => l.status === 'Convertido').length;
        
        return total > 0 ? ((converted / total) * 100).toFixed(1) : 0;
    },

    getAverageTimeToConvert() {
        const data = Sales.getFilteredData();
        const converted = data.filter(l => l.status === 'Convertido');
        
        if (converted.length === 0) return 0;
        
        const totalDays = converted.reduce((sum, lead) => {
            return sum + this.getDaysSinceContact(lead.date);
        }, 0);
        
        return Math.round(totalDays / converted.length);
    },

    getBottleneckStage() {
        const counts = {};
        
        this.stages.forEach(stage => {
            const container = document.getElementById(`cards-${stage.id}`);
            counts[stage.name] = container ? container.children.length : 0;
        });
        
        // Encontrar la etapa con más leads (excluyendo Convertido y Perdido)
        const workingStages = ['Nuevo', 'Contactado', 'Interesado', 'Negociación'];
        let maxCount = 0;
        let bottleneck = null;
        
        workingStages.forEach(stage => {
            if (counts[stage] > maxCount) {
                maxCount = counts[stage];
                bottleneck = stage;
            }
        });
        
        return { stage: bottleneck, count: maxCount };
    },

    // ===================================================================
    // REPORTES DEL PIPELINE
    // ===================================================================
    generatePipelineReport() {
        const conversionRate = this.getConversionRate();
        const avgTimeToConvert = this.getAverageTimeToConvert();
        const bottleneck = this.getBottleneckStage();
        
        return {
            conversionRate,
            avgTimeToConvert,
            bottleneck,
            totalLeads: Sales.getFilteredData().length
        };
    }
};

// ===================================================================
// AUTO-INICIALIZACIÓN CUANDO SE MUESTRA EL TAB
// ===================================================================
document.addEventListener('DOMContentLoaded', function() {
    // Observar cuando se muestra el tab de pipeline
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const pipelineTab = document.getElementById('pipeline');
                if (pipelineTab && !pipelineTab.classList.contains('hidden')) {
                    Pipeline.init();
                    Pipeline.refresh();
                }
            }
        });
    });

    const pipelineTab = document.getElementById('pipeline');
    if (pipelineTab) {
        observer.observe(pipelineTab, { attributes: true });
    }
});

// ===================================================================
// INICIALIZACIÓN
// ===================================================================
console.log('✅ Pipeline.js cargado correctamente');