// init-permissions.js - Run this ONCE to set up permissions

async function initializePermissionsSystem() {
    console.log('🚀 Initializing permissions system...');
    
    try {
        const auth = window.FirebaseData?.auth;
        if (!auth?.currentUser) {
            console.error('❌ Not authenticated');
            return;
        }
        
        const db = window.firebaseModules.database;
        const currentUserId = auth.currentUser.uid;
        const currentUserEmail = auth.currentUser.email;
        
        // Step 1: Create default roles
        console.log('📝 Creating default roles...');
        
        const defaultRoles = {
            admin: {
                name: 'Administrador',
                modules: ['*'],
                description: 'Acceso completo al sistema',
                canCreateRoles: true,
                canAssignPermissions: true
            },
            sales: {
                name: 'Ventas',
                modules: ['social', 'pipeline', 'tasks'],
                description: 'Gestión de ventas y contactos'
            },
            teacher: {
                name: 'Profesor',
                modules: ['students', 'groups', 'attendance'],
                description: 'Gestión académica'
            },
            accounting: {
                name: 'Contabilidad',
                modules: ['students', 'payments'],
                description: 'Gestión financiera'
            },
            reception: {
                name: 'Recepción',
                modules: ['students', 'social'],
                description: 'Atención al cliente'
            }
        };
        
        for (const [roleId, roleData] of Object.entries(defaultRoles)) {
            const roleRef = db.ref(window.FirebaseData.database, `permissions/roles/${roleId}`);
            await db.set(roleRef, roleData);
            console.log(`✅ Role created: ${roleId}`);
        }
        
        // Step 2: Assign admin role to current user if they're admin
        if (currentUserEmail === 'admin@ciudadbilingue.com') {
            console.log('👤 Assigning admin role to current user...');
            
            const userPermRef = db.ref(window.FirebaseData.database, `permissions/users/${currentUserId}`);
            await db.set(userPermRef, {
                role: 'admin',
                assignedAt: new Date().toISOString(),
                assignedBy: 'system'
            });
            
            console.log('✅ Admin permissions assigned');
        }
        
        // Step 3: Migrate existing users
        console.log('🔄 Checking for existing users to migrate...');
        
        const usersRef = db.ref(window.FirebaseData.database, 'users');
        const usersSnapshot = await db.get(usersRef);
        
        if (usersSnapshot.exists()) {
            const users = usersSnapshot.val();
            let migrated = 0;
            
            for (const [uid, userData] of Object.entries(users)) {
                const oldRole = userData.profile?.role;
                if (oldRole && !['admin', 'sales'].includes(oldRole)) {
                    continue; // Skip unknown roles
                }
                
                // Check if already has new permissions
                const permRef = db.ref(window.FirebaseData.database, `permissions/users/${uid}`);
                const permSnapshot = await db.get(permRef);
                
                if (!permSnapshot.exists() && oldRole) {
                    // Migrate old role
                    await db.set(permRef, {
                        role: oldRole === 'director' ? 'admin' : oldRole,
                        assignedAt: new Date().toISOString(),
                        assignedBy: 'migration',
                        migratedFrom: 'oldSystem'
                    });
                    migrated++;
                    console.log(`✅ Migrated user ${userData.email} with role ${oldRole}`);
                }
            }
            
            console.log(`✅ Migrated ${migrated} users`);
        }
        
        console.log('🎉 Permissions system initialized successfully!');
        
        // Show success message
        window.showNotification('✅ Sistema de permisos inicializado', 'success');
        
        // Reload to apply new permissions
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error initializing permissions:', error);
        window.showNotification('❌ Error: ' + error.message, 'error');
    }
}

// Add initialization button to page
function addInitButton() {
    const btn = document.createElement('button');
    btn.innerHTML = '🚀 Initialize Permissions System';
    btn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-weight: bold;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 9999;
    `;
    
    btn.onclick = async () => {
        if (confirm('This will initialize the permissions system. Continue?')) {
            btn.disabled = true;
            btn.innerHTML = '⏳ Initializing...';
            await initializePermissionsSystem();
            btn.remove();
        }
    };
    
    document.body.appendChild(btn);
}

// Auto-add button if admin
if (window.FirebaseData?.auth?.currentUser?.email === 'admin@ciudadbilingue.com') {
    setTimeout(addInitButton, 2000);
}

console.log('✅ Permission initializer ready');
