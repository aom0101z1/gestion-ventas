// config-integration.js - Add permission management to config menu

// Add permission management option to config menu
document.addEventListener('DOMContentLoaded', () => {
    // Wait for config to be available
    setTimeout(() => {
        addPermissionMenuOption();
    }, 2000);
});

function addPermissionMenuOption() {
    // Find the config menu
    const configMenu = document.querySelector('.config-menu');
    if (!configMenu) {
        console.log('Config menu not found, retrying...');
        setTimeout(addPermissionMenuOption, 1000);
        return;
    }
    
    // Check if already added
    if (document.getElementById('permissionManagementBtn')) {
        return;
    }
    
    // Create permission management button
    const permissionBtn = document.createElement('button');
    permissionBtn.id = 'permissionManagementBtn';
    permissionBtn.innerHTML = '🔐 Control de Acceso';
    permissionBtn.className = 'config-menu-item';
    permissionBtn.style.cssText = `
        width: 100%;
        padding: 0.75rem;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        cursor: pointer;
        text-align: left;
        margin-bottom: 0.5rem;
        transition: all 0.2s;
    `;
    
    permissionBtn.onmouseover = () => {
        permissionBtn.style.background = '#f3f4f6';
    };
    
    permissionBtn.onmouseout = () => {
        permissionBtn.style.background = 'white';
    };
    
    permissionBtn.onclick = () => {
        // Load permission management
        if (window.loadPermissionManagement) {
            window.loadPermissionManagement();
        }
    };
    
    // Add to menu
    configMenu.appendChild(permissionBtn);
    console.log('✅ Permission management added to config menu');
}

// Also override the config button in the nav to ensure our option is added
const originalConfigBtn = document.querySelector('button[onclick*="loadConfigData"]');
if (originalConfigBtn) {
    const originalOnclick = originalConfigBtn.onclick;
    originalConfigBtn.onclick = function() {
        if (originalOnclick) originalOnclick();
        setTimeout(addPermissionMenuOption, 500);
    };
}

console.log('✅ Config integration loaded');
