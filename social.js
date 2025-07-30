// social.js - MÓDULO DE INTEGRACIÓN DE REDES SOCIALES
// ===== FACEBOOK FANPAGE INTEGRATION MODULE =====
// Sistema independiente para manejo de conversaciones de Facebook
// ================================================================================

// ===== CONFIGURACIÓN GLOBAL =====
const FACEBOOK_CONFIG = {
    appId: '1125538789641684', // Reemplazar con tu App ID de Facebook
    apiVersion: 'v18.0',
    // In social.js, update line 9:
    permissions: ['pages_show_list', 'pages_read_engagement'], // Simplified for testing
    pageAccessToken: null,
    pageId: null
};

// ===== CLASE PRINCIPAL - SOCIAL MEDIA MANAGER =====
class SocialMediaManager {
    constructor() {
        this.initialized = false;
        this.currentUser = null;
        this.facebookSDKLoaded = false;
        this.conversations = new Map();
        this.unreadCount = 0;
        this.observers = [];
        this.autoRefreshInterval = null;
        
        console.log('🌐 Social Media Manager initialized');
    }

    // ===== INICIALIZACIÓN =====
    async initialize() {
        try {
            console.log('🚀 Initializing Social Media Integration...');
            
            // Verificar que el usuario esté autenticado en el CRM
            if (!window.FirebaseData || !window.FirebaseData.currentUser) {
                console.error('❌ Firebase not available or user not authenticated');
                return false;
            }
            
            // Cargar Facebook SDK
            await this.loadFacebookSDK();
            
            // Configurar UI
            this.setupUI();
            
            // Iniciar auto-refresh
            this.startAutoRefresh();
            
            this.initialized = true;
            console.log('✅ Social Media Integration ready');
            
            return true;
            
        } catch (error) {
            console.error('❌ Error initializing Social Media:', error);
            return false;
        }
    }

    // ===== FACEBOOK SDK LOADER =====
    async loadFacebookSDK() {
        return new Promise((resolve, reject) => {
            // Si ya está cargado, resolver inmediatamente
            if (window.FB) {
                this.facebookSDKLoaded = true;
                resolve();
                return;
            }
            
            // Cargar SDK
            window.fbAsyncInit = () => {
                FB.init({
                    appId: FACEBOOK_CONFIG.appId,
                    cookie: true,
                    xfbml: true,
                    version: FACEBOOK_CONFIG.apiVersion
                });
                
                this.facebookSDKLoaded = true;
                console.log('✅ Facebook SDK loaded');
                resolve();
            };
            
            // Inyectar script
            (function(d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s); 
                js.id = id;
                js.src = `https://connect.facebook.net/es_ES/sdk.js`;
                fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));
            
            // Timeout después de 10 segundos
            setTimeout(() => {
                if (!this.facebookSDKLoaded) {
                    reject(new Error('Facebook SDK loading timeout'));
                }
            }, 10000);
        });
    }

    // ===== AUTENTICACIÓN FACEBOOK =====
    async authenticateFacebook() {
        try {
            console.log('🔐 Starting Facebook authentication...');
            
            return new Promise((resolve, reject) => {
                FB.login((response) => {
                    if (response.authResponse) {
                        console.log('✅ Facebook login successful');
                        this.handleFacebookAuth(response.authResponse);
                        resolve(response.authResponse);
                    } else {
                        console.error('❌ Facebook login cancelled');
                        reject(new Error('Login cancelled'));
                    }
                }, {
                    scope: FACEBOOK_CONFIG.permissions.join(','),
                    auth_type: 'rerequest'
                });
            });
            
        } catch (error) {
            console.error('❌ Facebook authentication error:', error);
            throw error;
        }
    }

    // ===== MANEJO DE AUTENTICACIÓN =====
    async handleFacebookAuth(authResponse) {
        try {
            // Guardar token de usuario
            const userAccessToken = authResponse.accessToken;
            
            // Obtener páginas del usuario
            const pages = await this.getUserPages(userAccessToken);
            
            if (pages.length === 0) {
                throw new Error('No tienes páginas de Facebook asociadas');
            }
            
            // Por ahora, seleccionar la primera página
            // TODO: Agregar selector de página si hay múltiples
            const selectedPage = pages[0];
            
            FACEBOOK_CONFIG.pageAccessToken = selectedPage.access_token;
            FACEBOOK_CONFIG.pageId = selectedPage.id;
            
            // Guardar en localStorage para persistencia
            localStorage.setItem('fb_page_token', selectedPage.access_token);
            localStorage.setItem('fb_page_id', selectedPage.id);
            localStorage.setItem('fb_page_name', selectedPage.name);
            
            console.log('✅ Page selected:', selectedPage.name);
            
            // Actualizar UI
            this.updateConnectionStatus(true, selectedPage.name);
            
            // Cargar conversaciones
            await this.loadConversations();
            
        } catch (error) {
            console.error('❌ Error handling Facebook auth:', error);
            this.updateConnectionStatus(false);
        }
    }

    // ===== OBTENER PÁGINAS DEL USUARIO =====
    async getUserPages(accessToken) {
        return new Promise((resolve, reject) => {
            FB.api('/me/accounts', 'GET', {
                access_token: accessToken
            }, (response) => {
                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response.data || []);
                }
            });
        });
    }

    // ===== CARGAR CONVERSACIONES =====
    async loadConversations() {
        try {
            console.log('📥 Loading Facebook conversations...');
            
            if (!FACEBOOK_CONFIG.pageAccessToken || !FACEBOOK_CONFIG.pageId) {
                throw new Error('Facebook not authenticated');
            }
            
            // Obtener conversaciones recientes
            const conversations = await this.fetchConversations();
            
            // Actualizar mapa de conversaciones
            this.conversations.clear();
            this.unreadCount = 0;
            
            for (const conv of conversations) {
                // Obtener mensajes de cada conversación
                const messages = await this.fetchMessages(conv.id);
                
                const conversationData = {
                    id: conv.id,
                    participants: conv.participants.data,
                    snippet: conv.snippet,
                    updatedTime: conv.updated_time,
                    unreadCount: conv.unread_count || 0,
                    messages: messages,
                    isRead: conv.unread_count === 0
                };
                
                this.conversations.set(conv.id, conversationData);
                this.unreadCount += conv.unread_count || 0;
            }
            
            // Actualizar UI
            this.renderConversations();
            this.updateUnreadBadge();
            
            console.log(`✅ Loaded ${this.conversations.size} conversations`);
            
        } catch (error) {
            console.error('❌ Error loading conversations:', error);
            this.showError('Error al cargar conversaciones de Facebook');
        }
    }

    // ===== FETCH CONVERSACIONES =====
    async fetchConversations() {
        return new Promise((resolve, reject) => {
            FB.api(
                `/${FACEBOOK_CONFIG.pageId}/conversations`,
                'GET',
                {
                    access_token: FACEBOOK_CONFIG.pageAccessToken,
                    fields: 'id,snippet,updated_time,unread_count,participants'
                },
                (response) => {
                    if (response.error) {
                        reject(response.error);
                    } else {
                        resolve(response.data || []);
                    }
                }
            );
        });
    }

    // ===== FETCH MENSAJES =====
    async fetchMessages(conversationId) {
        return new Promise((resolve, reject) => {
            FB.api(
                `/${conversationId}/messages`,
                'GET',
                {
                    access_token: FACEBOOK_CONFIG.pageAccessToken,
                    fields: 'id,message,from,created_time,attachments'
                },
                (response) => {
                    if (response.error) {
                        reject(response.error);
                    } else {
                        resolve(response.data || []);
                    }
                }
            );
        });
    }

    // ===== ENVIAR MENSAJE =====
    async sendMessage(conversationId, message) {
        try {
            console.log('📤 Sending message to conversation:', conversationId);
            
            const conversation = this.conversations.get(conversationId);
            if (!conversation) {
                throw new Error('Conversación no encontrada');
            }
            
            // Obtener recipient ID (el participante que no es la página)
            const recipient = conversation.participants.find(p => p.id !== FACEBOOK_CONFIG.pageId);
            if (!recipient) {
                throw new Error('No se pudo identificar el destinatario');
            }
            
            // Enviar mensaje
            return new Promise((resolve, reject) => {
                FB.api(
                    `/${FACEBOOK_CONFIG.pageId}/messages`,
                    'POST',
                    {
                        access_token: FACEBOOK_CONFIG.pageAccessToken,
                        messaging_type: 'RESPONSE',
                        recipient: { id: recipient.id },
                        message: { text: message }
                    },
                    (response) => {
                        if (response.error) {
                            reject(response.error);
                        } else {
                            console.log('✅ Message sent successfully');
                            
                            // Actualizar conversación local
                            this.addLocalMessage(conversationId, message, true);
                            
                            resolve(response);
                        }
                    }
                );
            });
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            throw error;
        }
    }

    // ===== AGREGAR MENSAJE LOCAL =====
    addLocalMessage(conversationId, message, isFromPage = true) {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) return;
        
        // Agregar mensaje a la conversación
        const newMessage = {
            id: `local_${Date.now()}`,
            message: message,
            from: {
                id: isFromPage ? FACEBOOK_CONFIG.pageId : conversation.participants[0].id,
                name: isFromPage ? localStorage.getItem('fb_page_name') : conversation.participants[0].name
            },
            created_time: new Date().toISOString()
        };
        
        conversation.messages.unshift(newMessage);
        conversation.snippet = message;
        conversation.updatedTime = new Date().toISOString();
        
        // Re-renderizar
        this.renderConversations();
        this.renderMessages(conversationId);
    }

    // ===== CONVERTIR A LEAD =====
    async convertToLead(conversationId) {
        try {
            console.log('🔄 Converting conversation to lead:', conversationId);
            
            const conversation = this.conversations.get(conversationId);
            if (!conversation) {
                throw new Error('Conversación no encontrada');
            }
            
            // Obtener información del participante
            const participant = conversation.participants.find(p => p.id !== FACEBOOK_CONFIG.pageId);
            if (!participant) {
                throw new Error('No se pudo identificar el participante');
            }
            
            // Crear objeto de contacto
            const contact = {
                name: participant.name,
                phone: '', // Facebook no proporciona teléfono directamente
                email: participant.email || '',
                source: 'Facebook Fanpage',
                location: 'Por determinar',
                notes: `Conversación de Facebook iniciada el ${new Date(conversation.messages[conversation.messages.length - 1].created_time).toLocaleString()}\n\nÚltimo mensaje: ${conversation.snippet}`,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString(),
                status: 'Nuevo',
                metadata: {
                    facebookId: participant.id,
                    conversationId: conversationId
                }
            };
            
            // Usar la función existente del CRM para agregar el contacto
            if (window.FirebaseData && window.FirebaseData.addContact) {
                const savedContact = await window.FirebaseData.addContact(contact);
                
                console.log('✅ Lead created:', savedContact);
                
                // Marcar conversación como convertida
                conversation.convertedToLead = true;
                conversation.leadId = savedContact.id;
                
                // Actualizar UI
                this.renderConversations();
                
                // Mostrar notificación
                if (window.showNotification) {
                    window.showNotification('✅ Lead creado exitosamente', 'success');
                } else {
                    alert('✅ Lead creado exitosamente');
                }
                
                return savedContact;
                
            } else {
                throw new Error('Sistema de leads no disponible');
            }
            
        } catch (error) {
            console.error('❌ Error converting to lead:', error);
            if (window.showNotification) {
                window.showNotification(`❌ Error: ${error.message}`, 'error');
            } else {
                alert(`❌ Error: ${error.message}`);
            }
        }
    }

    // ===== UI SETUP =====
    setupUI() {
        // Crear contenedor principal si no existe
        let container = document.getElementById('socialMediaContainer');
        if (!container) {
            console.log('⚠️ Social media container not found in DOM');
            return;
        }
        
        // Establecer estructura inicial
        container.innerHTML = `
            <div class="social-media-wrapper" style="height: calc(100vh - 250px); display: flex; gap: 1rem;">
                <!-- Lista de Conversaciones -->
                <div id="conversationsList" style="
                    flex: 0 0 350px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                ">
                    <!-- Header -->
                    <div style="
                        padding: 1.5rem;
                        border-bottom: 2px solid #e5e7eb;
                        background: linear-gradient(135deg, #1877f2, #0e5fcd);
                        color: white;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                <span style="font-size: 1.3rem;">📘</span>
                                Facebook Messenger
                            </h3>
                            <button id="fbConnectBtn" onclick="window.SocialManager.handleConnectClick()" style="
                                background: white;
                                color: #1877f2;
                                border: none;
                                padding: 0.5rem 1rem;
                                border-radius: 20px;
                                cursor: pointer;
                                font-size: 0.8rem;
                                font-weight: 600;
                                transition: all 0.2s ease;
                            ">
                                🔗 Conectar
                            </button>
                        </div>
                        <div id="fbConnectionStatus" style="
                            font-size: 0.9rem;
                            opacity: 0.9;
                        ">
                            ⚪ No conectado
                        </div>
                    </div>
                    
                    <!-- Search -->
                    <div style="padding: 1rem; border-bottom: 1px solid #e5e7eb;">
                        <input type="text" 
                               id="conversationSearch" 
                               placeholder="🔍 Buscar conversaciones..."
                               onkeyup="window.SocialManager.filterConversations(this.value)"
                               style="
                                   width: 100%;
                                   padding: 0.75rem;
                                   border: 2px solid #e5e7eb;
                                   border-radius: 8px;
                                   font-size: 0.9rem;
                               ">
                    </div>
                    
                    <!-- Conversations List -->
                    <div id="conversationsContainer" style="
                        flex: 1;
                        overflow-y: auto;
                        padding: 1rem;
                    ">
                        <div style="text-align: center; color: #6b7280; padding: 3rem;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">💬</div>
                            <p>Conecta tu página de Facebook para ver las conversaciones</p>
                        </div>
                    </div>
                </div>
                
                <!-- Vista de Mensajes -->
                <div id="messageView" style="
                    flex: 1;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    display: flex;
                    flex-direction: column;
                ">
                    <!-- Sin conversación seleccionada -->
                    <div id="noConversationSelected" style="
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #6b7280;
                        text-align: center;
                        padding: 2rem;
                    ">
                        <div>
                            <div style="font-size: 4rem; margin-bottom: 1rem;">💌</div>
                            <h3 style="margin: 0 0 0.5rem 0;">Selecciona una conversación</h3>
                            <p style="margin: 0;">Elige una conversación de la lista para ver los mensajes</p>
                        </div>
                    </div>
                    
                    <!-- Conversation View (hidden by default) -->
                    <div id="conversationView" style="display: none; height: 100%; flex-direction: column;">
                        <!-- Header -->
                        <div id="conversationHeader" style="
                            padding: 1rem 1.5rem;
                            border-bottom: 2px solid #e5e7eb;
                            background: #f9fafb;
                        ">
                            <!-- Se llenará dinámicamente -->
                        </div>
                        
                        <!-- Messages -->
                        <div id="messagesContainer" style="
                            flex: 1;
                            overflow-y: auto;
                            padding: 1.5rem;
                            display: flex;
                            flex-direction: column-reverse;
                        ">
                            <!-- Se llenará dinámicamente -->
                        </div>
                        
                        <!-- Input -->
                        <div style="
                            padding: 1rem;
                            border-top: 2px solid #e5e7eb;
                            background: #f9fafb;
                        ">
                            <form onsubmit="window.SocialManager.handleSendMessage(event)" style="display: flex; gap: 1rem;">
                                <input type="text" 
                                       id="messageInput" 
                                       placeholder="Escribe un mensaje..."
                                       style="
                                           flex: 1;
                                           padding: 0.75rem;
                                           border: 2px solid #e5e7eb;
                                           border-radius: 8px;
                                           font-size: 1rem;
                                       " required>
                                <button type="submit" style="
                                    background: #1877f2;
                                    color: white;
                                    border: none;
                                    padding: 0.75rem 1.5rem;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    font-weight: 600;
                                    transition: all 0.2s ease;
                                ">
                                    📤 Enviar
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Quick Stats -->
            <div style="margin-top: 1rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div style="
                    background: white;
                    padding: 1.5rem;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    text-align: center;
                ">
                    <div id="totalConversationsCount" style="font-size: 2rem; font-weight: bold; color: #1877f2;">0</div>
                    <div style="color: #6b7280;">Total Conversaciones</div>
                </div>
                <div style="
                    background: white;
                    padding: 1.5rem;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    text-align: center;
                ">
                    <div id="unreadMessagesCount" style="font-size: 2rem; font-weight: bold; color: #ef4444;">0</div>
                    <div style="color: #6b7280;">Mensajes Sin Leer</div>
                </div>
                <div style="
                    background: white;
                    padding: 1.5rem;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    text-align: center;
                ">
                    <div id="convertedLeadsCount" style="font-size: 2rem; font-weight: bold; color: #10b981;">0</div>
                    <div style="color: #6b7280;">Leads Convertidos</div>
                </div>
            </div>
        `;
        
        // Verificar si hay token guardado
        const savedToken = localStorage.getItem('fb_page_token');
        const savedPageId = localStorage.getItem('fb_page_id');
        const savedPageName = localStorage.getItem('fb_page_name');
        
        if (savedToken && savedPageId) {
            FACEBOOK_CONFIG.pageAccessToken = savedToken;
            FACEBOOK_CONFIG.pageId = savedPageId;
            this.updateConnectionStatus(true, savedPageName);
            
            // Cargar conversaciones automáticamente
            setTimeout(() => this.loadConversations(), 1000);
        }
    }

    // ===== RENDER CONVERSACIONES =====
    renderConversations() {
        const container = document.getElementById('conversationsContainer');
        if (!container) return;
        
        if (this.conversations.size === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #6b7280; padding: 3rem;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">📭</div>
                    <p>No hay conversaciones disponibles</p>
                    <button onclick="window.SocialManager.loadConversations()" style="
                        margin-top: 1rem;
                        background: #1877f2;
                        color: white;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 8px;
                        cursor: pointer;
                    ">
                        🔄 Actualizar
                    </button>
                </div>
            `;
            return;
        }
        
        // Ordenar conversaciones por tiempo actualizado
        const sortedConversations = Array.from(this.conversations.values())
            .sort((a, b) => new Date(b.updatedTime) - new Date(a.updatedTime));
        
        container.innerHTML = sortedConversations.map(conv => {
            const participant = conv.participants.find(p => p.id !== FACEBOOK_CONFIG.pageId) || { name: 'Usuario' };
            const timeAgo = this.getTimeAgo(conv.updatedTime);
            
            return `
                <div class="conversation-item" 
                     onclick="window.SocialManager.selectConversation('${conv.id}')"
                     style="
                         padding: 1rem;
                         border-radius: 8px;
                         margin-bottom: 0.5rem;
                         cursor: pointer;
                         transition: all 0.2s ease;
                         border: 1px solid #e5e7eb;
                         ${conv.unreadCount > 0 ? 'background: #eff6ff;' : ''}
                     "
                     onmouseover="this.style.background='#f3f4f6'"
                     onmouseout="this.style.background='${conv.unreadCount > 0 ? '#eff6ff' : 'white'}'">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.5rem;">
                                ${participant.name}
                                ${conv.unreadCount > 0 ? `
                                    <span style="
                                        background: #ef4444;
                                        color: white;
                                        padding: 0.1rem 0.4rem;
                                        border-radius: 10px;
                                        font-size: 0.7rem;
                                    ">${conv.unreadCount}</span>
                                ` : ''}
                                ${conv.convertedToLead ? `
                                    <span style="
                                        background: #10b981;
                                        color: white;
                                        padding: 0.1rem 0.4rem;
                                        border-radius: 10px;
                                        font-size: 0.7rem;
                                    " title="Convertido a Lead">✓</span>
                                ` : ''}
                            </div>
                            <div style="
                                font-size: 0.9rem;
                                color: #6b7280;
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                            ">
                                ${conv.snippet}
                            </div>
                        </div>
                        <div style="font-size: 0.8rem; color: #6b7280; white-space: nowrap;">
                            ${timeAgo}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Actualizar estadísticas
        this.updateStats();
    }

    // ===== SELECCIONAR CONVERSACIÓN =====
    selectConversation(conversationId) {
        console.log('💬 Selecting conversation:', conversationId);
        
        // Mostrar vista de conversación
        document.getElementById('noConversationSelected').style.display = 'none';
        document.getElementById('conversationView').style.display = 'flex';
        
        // Marcar como leída
        const conversation = this.conversations.get(conversationId);
        if (conversation && conversation.unreadCount > 0) {
            conversation.unreadCount = 0;
            conversation.isRead = true;
            this.renderConversations();
        }
        
        // Renderizar header y mensajes
        this.renderConversationHeader(conversationId);
        this.renderMessages(conversationId);
        
        // Guardar conversación actual
        this.currentConversationId = conversationId;
    }

    // ===== RENDER HEADER DE CONVERSACIÓN =====
    renderConversationHeader(conversationId) {
        const header = document.getElementById('conversationHeader');
        if (!header) return;
        
        const conversation = this.conversations.get(conversationId);
        if (!conversation) return;
        
        const participant = conversation.participants.find(p => p.id !== FACEBOOK_CONFIG.pageId) || { name: 'Usuario' };
        
        header.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="margin: 0; color: #1f2937;">${participant.name}</h3>
                    <div style="font-size: 0.9rem; color: #6b7280;">Facebook Messenger</div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    ${!conversation.convertedToLead ? `
                        <button onclick="window.SocialManager.convertToLead('${conversationId}')" style="
                            background: #10b981;
                            color: white;
                            border: none;
                            padding: 0.5rem 1rem;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 0.9rem;
                            font-weight: 600;
                        " title="Convertir a Lead">
                            🎯 Convertir a Lead
                        </button>
                    ` : `
                        <span style="
                            background: #d1fae5;
                            color: #065f46;
                            padding: 0.5rem 1rem;
                            border-radius: 8px;
                            font-size: 0.9rem;
                            font-weight: 600;
                        ">
                            ✅ Lead Creado
                        </span>
                    `}
                    <button onclick="window.SocialManager.refreshConversation('${conversationId}')" style="
                        background: #f3f4f6;
                        color: #374151;
                        border: none;
                        padding: 0.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                    " title="Actualizar">
                        🔄
                    </button>
                </div>
            </div>
        `;
    }

    // ===== RENDER MENSAJES =====
    renderMessages(conversationId) {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        
        const conversation = this.conversations.get(conversationId);
        if (!conversation) return;
        
        // Renderizar mensajes (orden inverso para mostrar más recientes abajo)
        container.innerHTML = conversation.messages.map(msg => {
            const isFromPage = msg.from.id === FACEBOOK_CONFIG.pageId;
            const timeFormatted = new Date(msg.created_time).toLocaleString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: 'short'
            });
            
            return `
                <div style="
                    display: flex;
                    justify-content: ${isFromPage ? 'flex-end' : 'flex-start'};
                    margin-bottom: 1rem;
                ">
                    <div style="
                        max-width: 70%;
                        padding: 0.75rem 1rem;
                        border-radius: 18px;
                        ${isFromPage ? 
                            'background: #1877f2; color: white;' : 
                            'background: #f3f4f6; color: #1f2937;'}
                    ">
                        <div style="font-size: 0.95rem; word-wrap: break-word;">
                            ${msg.message || '[Archivo adjunto]'}
                        </div>
                        <div style="
                            font-size: 0.7rem;
                            margin-top: 0.25rem;
                            opacity: 0.7;
                        ">
                            ${timeFormatted}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Scroll al final
        container.scrollTop = container.scrollHeight;
    }

    // ===== MANEJAR ENVÍO DE MENSAJE =====
    async handleSendMessage(event) {
        event.preventDefault();
        
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message || !this.currentConversationId) return;
        
        // Deshabilitar input mientras se envía
        input.disabled = true;
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Enviando...';
        
        try {
            await this.sendMessage(this.currentConversationId, message);
            
            // Limpiar input
            input.value = '';
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            if (window.showNotification) {
                window.showNotification(`❌ Error al enviar mensaje: ${error.message}`, 'error');
            } else {
                alert(`❌ Error: ${error.message}`);
            }
        } finally {
            input.disabled = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            input.focus();
        }
    }

    // ===== ACTUALIZAR ESTADO DE CONEXIÓN =====
    updateConnectionStatus(connected, pageName = null) {
        const statusEl = document.getElementById('fbConnectionStatus');
        const btnEl = document.getElementById('fbConnectBtn');
        
        if (connected) {
            if (statusEl) {
                statusEl.innerHTML = `🟢 Conectado${pageName ? ` - ${pageName}` : ''}`;
            }
            if (btnEl) {
                btnEl.innerHTML = '🔄 Actualizar';
                btnEl.onclick = () => this.loadConversations();
            }
        } else {
            if (statusEl) {
                statusEl.innerHTML = '⚪ No conectado';
            }
            if (btnEl) {
                btnEl.innerHTML = '🔗 Conectar';
                btnEl.onclick = () => this.handleConnectClick();
            }
        }
    }

    // ===== MANEJAR CLICK EN CONECTAR =====
    async handleConnectClick() {
        try {
            if (!this.facebookSDKLoaded) {
                alert('⏳ Facebook SDK aún se está cargando. Intenta de nuevo en unos segundos.');
                return;
            }
            
            await this.authenticateFacebook();
            
        } catch (error) {
            console.error('❌ Connection error:', error);
            if (window.showNotification) {
                window.showNotification('❌ Error al conectar con Facebook', 'error');
            } else {
                alert('❌ Error al conectar con Facebook');
            }
        }
    }

    // ===== UTILIDADES =====
    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }

    filterConversations(searchTerm) {
        console.log('🔍 Filtering conversations:', searchTerm);
        // TODO: Implementar filtrado
    }

    updateStats() {
        // Total conversaciones
        const totalEl = document.getElementById('totalConversationsCount');
        if (totalEl) totalEl.textContent = this.conversations.size;
        
        // Mensajes sin leer
        let unreadTotal = 0;
        this.conversations.forEach(conv => {
            unreadTotal += conv.unreadCount || 0;
        });
        const unreadEl = document.getElementById('unreadMessagesCount');
        if (unreadEl) unreadEl.textContent = unreadTotal;
        
        // Leads convertidos
        let convertedCount = 0;
        this.conversations.forEach(conv => {
            if (conv.convertedToLead) convertedCount++;
        });
        const convertedEl = document.getElementById('convertedLeadsCount');
        if (convertedEl) convertedEl.textContent = convertedCount;
    }

    updateUnreadBadge() {
        // TODO: Actualizar badge en la pestaña principal si es necesario
    }

    refreshConversation(conversationId) {
        console.log('🔄 Refreshing conversation:', conversationId);
        // TODO: Implementar recarga de una conversación específica
    }

    startAutoRefresh() {
        // Actualizar cada 2 minutos
        this.autoRefreshInterval = setInterval(() => {
            if (FACEBOOK_CONFIG.pageAccessToken) {
                console.log('🔄 Auto-refreshing conversations...');
                this.loadConversations();
            }
        }, 120000);
    }

    showError(message) {
        if (window.showNotification) {
            window.showNotification(`❌ ${message}`, 'error');
        } else {
            alert(`❌ ${message}`);
        }
    }

    // ===== LIMPIEZA =====
    cleanup() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
    }
}

// ===== INSTANCIA GLOBAL =====
window.SocialManager = new SocialMediaManager();

// ===== FUNCIÓN PARA CARGAR DATOS (llamada desde core.js) =====
async function loadSocialMediaData() {
    console.log('📱 Loading social media data...');
    
    if (!window.SocialManager.initialized) {
        await window.SocialManager.initialize();
    }
    
    // Si ya está conectado, actualizar conversaciones
    if (FACEBOOK_CONFIG.pageAccessToken) {
        await window.SocialManager.loadConversations();
    }
}

// ===== AUTO-INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 Social Media module ready');
    
    // Esperar a que Firebase esté listo
    const checkReady = setInterval(() => {
        if (window.FirebaseData && window.FirebaseData.currentUser && document.getElementById('socialMediaContainer')) {
            clearInterval(checkReady);
            window.SocialManager.initialize();
        }
    }, 1000);
});

// ===== LIMPIEZA AL SALIR =====
window.addEventListener('beforeunload', () => {
    if (window.SocialManager) {
        window.SocialManager.cleanup();
    }
});

console.log('✅ Social.js module loaded - Facebook Fanpage Integration Ready');
