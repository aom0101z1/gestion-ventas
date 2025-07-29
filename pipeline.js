<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pipeline CSS + JS Fixes</title>
    <style>
        /* ===== PIPELINE STYLES ===== */
        #pipelineContainer {
            display: flex;
            gap: 1rem;
            padding: 1rem;
            overflow-x: auto;
            min-height: 70vh;
            background: #f8fafc;
        }

        .pipeline-column {
            min-width: 280px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            transition: all 0.3s ease;
            flex-shrink: 0;
        }

        .pipeline-column.drag-over {
            transform: scale(1.02);
            box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
            border: 2px dashed #3b82f6;
        }

        .pipeline-header {
            padding: 1rem;
            border-radius: 12px 12px 0 0;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .pipeline-cards {
            padding: 0.5rem;
            min-height: 400px;
            max-height: 60vh;
            overflow-y: auto;
        }

        .pipeline-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 0.75rem;
            cursor: move;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .pipeline-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-color: #3b82f6;
        }

        .pipeline-card.dragging {
            opacity: 0.5;
            transform: rotate(5deg);
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }

        .pipeline-card:last-child {
            margin-bottom: 0;
        }

        /* ===== LOADING SPINNER ===== */
        .loading-spinner {
            border: 3px solid #f3f4f6;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* ===== RESPONSIVE DESIGN ===== */
        @media (max-width: 768px) {
            #pipelineContainer {
                flex-direction: column;
                gap: 0.5rem;
            }

            .pipeline-column {
                min-width: 100%;
                max-height: 300px;
            }

            .pipeline-cards {
                max-height: 200px;
            }
        }

        /* ===== BUTTONS IN CARDS ===== */
        .pipeline-card button {
            transition: all 0.2s ease;
        }

        .pipeline-card button:hover {
            transform: scale(1.1);
        }

        /* ===== STATUS SPECIFIC STYLING ===== */
        .pipeline-column[data-stage="nuevo"] .pipeline-card {
            border-left: 4px solid #fbbf24;
        }

        .pipeline-column[data-stage="contactado"] .pipeline-card {
            border-left: 4px solid #3b82f6;
        }

        .pipeline-column[data-stage="interesado"] .pipeline-card {
            border-left: 4px solid #10b981;
        }

        .pipeline-column[data-stage="negociacion"] .pipeline-card {
            border-left: 4px solid #f97316;
        }

        .pipeline-column[data-stage="convertido"] .pipeline-card {
            border-left: 4px solid #22c55e;
        }

        .pipeline-column[data-stage="perdido"] .pipeline-card {
            border-left: 4px solid #ef4444;
        }
    </style>
</head>
<body>
    <div id="pipelineContainer">
        <!-- Pipeline will be rendered here -->
    </div>

    <script>
        // ===== ENHANCED getSalespersonName FUNCTION =====
        function getSalespersonName(salespersonId) {
            try {
                // Try to get from Firebase user data
                if (window.FirebaseData && window.FirebaseData.usersData) {
                    const user = window.FirebaseData.usersData[salespersonId];
                    if (user && user.profile && user.profile.name) {
                        return user.profile.name;
                    }
                }
                
                // Fallback to localStorage cached data
                const cachedUsers = localStorage.getItem('cachedUsers');
                if (cachedUsers) {
                    const users = JSON.parse(cachedUsers);
                    const user = users[salespersonId];
                    if (user && user.name) {
                        return user.name;
                    }
                }
                
                // Default fallback
                return 'Vendedor';
                
            } catch (error) {
                console.log('Error getting salesperson name:', error);
                return 'Vendedor';
            }
        }

        // ===== ENHANCED CONTACT DETAILS FUNCTION =====
        async function showContactDetails(contactId) {
            try {
                const contact = pipelineData.find(c => c.id === contactId);
                if (!contact) {
                    alert('❌ Contacto no encontrado');
                    return;
                }
                
                const salespersonName = isDirector ? getSalespersonName(contact.salespersonId) : 'Tu contacto';
                
                // Create a nice modal-style alert
                const details = `📋 DETALLES DEL CONTACTO

👤 Nombre: ${contact.name}
📞 Teléfono: ${contact.phone}
📧 Email: ${contact.email || 'No proporcionado'}
📍 Fuente: ${contact.source}
🏘️ Ubicación: ${contact.location || 'No especificada'}
📝 Estado: ${contact.status}
${isDirector ? `👨‍💼 Vendedor: ${salespersonName}` : ''}
📅 Fecha: ${new Date(contact.date || contact.createdAt).toLocaleDateString('es-ES')}
⏰ Última actualización: ${contact.updatedAt ? new Date(contact.updatedAt).toLocaleString('es-ES') : 'N/A'}

💬 Notas:
${contact.notes || 'Sin notas'}

💡 Tip: Arrastra la tarjeta a otra columna para cambiar el estado
📝 Tip: Haz clic en "✏️" para editar o "💬" para WhatsApp`;

                alert(details);
                
            } catch (error) {
                console.error('❌ Error showing contact details:', error);
                alert(`❌ Error al mostrar detalles: ${error.message}`);
            }
        }

        // ===== ENHANCED EDIT FUNCTION =====
        function editContactInPipeline(contactId) {
            const contact = pipelineData.find(c => c.id === contactId);
            if (!contact) {
                alert('❌ Contacto no encontrado');
                return;
            }

            // Try to switch to leads tab and highlight the contact
            if (typeof showSection === 'function') {
                showSection('leads');
                
                // Give time for the section to load, then try to find and highlight the contact
                setTimeout(() => {
                    const contactRow = document.querySelector(`tr[data-contact-id="${contactId}"]`);
                    if (contactRow) {
                        contactRow.style.background = '#fef3c7';
                        contactRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        // Remove highlight after 3 seconds
                        setTimeout(() => {
                            contactRow.style.background = '';
                        }, 3000);
                    }
                }, 500);
            } else {
                // Fallback alert
                alert(`✏️ Para editar: ${contact.name}
                
ID: ${contactId}
Teléfono: ${contact.phone}

💡 Ve a la pestaña "Leads" para editar este contacto o usa el panel de administración.`);
            }
        }

        // ===== ENHANCED WHATSAPP FUNCTION =====
        function openWhatsAppFromPipeline(phone, name) {
            try {
                const cleanPhone = phone.replace(/\D/g, '');
                let finalPhone = cleanPhone;
                
                // Add Colombia country code if not present
                if (!cleanPhone.startsWith('57') && cleanPhone.length === 10) {
                    finalPhone = '57' + cleanPhone;
                }
                
                const message = `Hola ${name}, te contacto desde Ciudad Bilingüe 🎓
                
¿Cómo va todo? Quería seguir con la información sobre nuestros cursos de inglés.

¿Tienes alguna pregunta o te gustaría agendar una reunión? 😊`;
                
                const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
                
                // Optional: Log the WhatsApp interaction
                if (window.FirebaseData && window.FirebaseData.logInteraction) {
                    window.FirebaseData.logInteraction(contactId, 'whatsapp_clicked', {
                        timestamp: new Date().toISOString(),
                        platform: 'pipeline'
                    });
                }
                
            } catch (error) {
                console.error('Error opening WhatsApp:', error);
                alert('❌ Error al abrir WhatsApp. Verifica el número de teléfono.');
            }
        }

        // ===== PIPELINE STATISTICS =====
        function getPipelineStats() {
            const stats = {
                total: pipelineData.length,
                byStatus: {},
                conversionRate: 0,
                todayContacts: 0
            };

            PIPELINE_STAGES.forEach(stage => {
                const count = pipelineData.filter(contact => 
                    normalizeStatus(contact.status) === stage.id
                ).length;
                stats.byStatus[stage.id] = count;
            });

            // Calculate conversion rate
            const converted = stats.byStatus.convertido || 0;
            stats.conversionRate = stats.total > 0 ? ((converted / stats.total) * 100).toFixed(1) : 0;

            // Count today's contacts
            const today = new Date().toDateString();
            stats.todayContacts = pipelineData.filter(contact => {
                const contactDate = new Date(contact.date || contact.createdAt).toDateString();
                return contactDate === today;
            }).length;

            return stats;
        }

        // ===== ENHANCED DEBUG FUNCTION =====
        function showPipelineDebug() {
            const stats = getPipelineStats();
            
            const debugInfo = `🔍 PIPELINE DEBUG INFO:

📊 Estadísticas:
- Total contactos: ${stats.total}
- Contactos de hoy: ${stats.todayContacts}
- Tasa de conversión: ${stats.conversionRate}%

📋 Distribución por estado:
${PIPELINE_STAGES.map(stage => 
    `- ${stage.icon} ${stage.name}: ${stats.byStatus[stage.id] || 0} contactos`
).join('\n')}

👤 Usuario:
- Nombre: ${currentUserProfile?.name || 'No disponible'}
- Email: ${currentUserProfile?.email || 'No disponible'}
- Rol: ${currentUserProfile?.role || 'No disponible'}
- Es Director: ${isDirector ? 'SÍ' : 'NO'}

🔥 Firebase:
- FirebaseData disponible: ${window.FirebaseData ? 'SÍ' : 'NO'}
- Usuario autenticado: ${window.FirebaseData?.currentUser ? 'SÍ' : 'NO'}
- Contacts loaded: ${window.FirebaseData?.contacts ? Object.keys(window.FirebaseData.contacts).length : 0}

🎯 Pipeline DOM:
- Columnas renderizadas: ${document.querySelectorAll('.pipeline-column').length}
- Cards arrastrables: ${document.querySelectorAll('.pipeline-card[draggable="true"]').length}
- Eventos drag configurados: ${document.querySelectorAll('.pipeline-card[draggable="true"]').length > 0 ? 'SÍ' : 'NO'}

🐛 Problemas potenciales:
${stats.total === 0 ? '⚠️ No hay contactos cargados\n' : ''}
${!window.FirebaseData ? '⚠️ Firebase no disponible\n' : ''}
${document.querySelectorAll('.pipeline-column').length === 0 ? '⚠️ Pipeline no renderizado\n' : ''}`;

            alert(debugInfo);
        }

        // Make functions globally available
        window.getSalespersonName = getSalespersonName;
        window.showContactDetails = showContactDetails;
        window.editContactInPipeline = editContactInPipeline;
        window.openWhatsAppFromPipeline = openWhatsAppFromPipeline;
        window.getPipelineStats = getPipelineStats;
        window.showPipelineDebug = showPipelineDebug;

        console.log('✅ Pipeline enhancements loaded successfully');
    </script>
</body>
</html>
