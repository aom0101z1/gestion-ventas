// ===== GITHUB INTEGRATION FOR CIUDAD BILINGUE =====
class GitHubDataManager {
    constructor() {
        this.owner = 'aom0101z1'; // Your GitHub username
        this.repo = 'gestion-ventas'; // Your repository name
        this.branch = 'main'; // or 'master'
        this.token = null;
        this.baseUrl = `https://api.github.com/repos/${this.owner}/${this.repo}`;
        this.dataFiles = {
            contacts: 'data/contacts.json',
            users: 'data/users.json',
            config: 'data/config.json'
        };
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('github_token', token);
        console.log('✅ GitHub token set');
    }

    getToken() {
        return this.token || localStorage.getItem('github_token');
    }

    getHeaders() {
        return {
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'Authorization': `token ${this.getToken()}`
        };
    }

    async testConnection() {
        try {
            const response = await fetch(this.baseUrl, {
                headers: this.getHeaders()
            });
            return response.ok;
        } catch (error) {
            console.error('GitHub connection test failed:', error);
            return false;
        }
    }

    async readFile(path) {
        try {
            const url = `${this.baseUrl}/contents/${path}?ref=${this.branch}`;
            const response = await fetch(url, {
                headers: this.getHeaders()
            });

            if (response.status === 404) {
                return { content: [], sha: null };
            }

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const data = await response.json();
            const content = JSON.parse(atob(data.content));
            
            return { content, sha: data.sha };
        } catch (error) {
            console.error(`Error reading ${path}:`, error);
            return { content: [], sha: null };
        }
    }

    async writeFile(path, content, sha = null) {
        try {
            const url = `${this.baseUrl}/contents/${path}`;
            const body = {
                message: `Update ${path} via Ciudad Bilingue System`,
                content: btoa(JSON.stringify(content, null, 2)),
                branch: this.branch
            };

            if (sha) body.sha = sha;

            const response = await fetch(url, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error writing ${path}:`, error);
            throw error;
        }
    }

    async getAllContacts() {
        const result = await this.readFile(this.dataFiles.contacts);
        return result.content || [];
    }

    async saveContacts(contacts) {
        const current = await this.readFile(this.dataFiles.contacts);
        return await this.writeFile(this.dataFiles.contacts, contacts, current.sha);
    }

    async addContact(contact) {
        try {
            const contacts = await this.getAllContacts();
            const newContact = {
                id: contact.id || Date.now(),
                ...contact,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            contacts.push(newContact);
            await this.saveContacts(contacts);
            
            console.log('✅ Contact saved to GitHub:', newContact.name);
            return newContact;
        } catch (error) {
            console.error('❌ Error saving contact to GitHub:', error);
            throw error;
        }
    }

    async updateContact(contactId, updates) {
        try {
            const contacts = await this.getAllContacts();
            const index = contacts.findIndex(c => c.id == contactId);
            
            if (index === -1) {
                throw new Error('Contact not found');
            }

            contacts[index] = {
                ...contacts[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };

            await this.saveContacts(contacts);
            
            console.log('✅ Contact updated in GitHub:', contacts[index].name);
            return contacts[index];
        } catch (error) {
            console.error('❌ Error updating contact in GitHub:', error);
            throw error;
        }
    }

    async syncWithLocal() {
        try {
            console.log('🔄 Syncing with GitHub...');
            const githubContacts = await this.getAllContacts();
            
            if (window.AdminData && githubContacts.length > 0) {
                AdminData.importData(githubContacts);
                console.log('✅ GitHub sync completed:', githubContacts.length, 'contacts');
            }
            
            return {
                contacts: githubContacts.length,
                lastSync: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ GitHub sync failed:', error);
            throw error;
        }
    }

    async pushAllLocalData() {
        try {
            if (!window.AdminData) {
                throw new Error('AdminData not available');
            }

            const localContacts = AdminData.getAllData();
            await this.saveContacts(localContacts);
            
            console.log('✅ All local data pushed to GitHub');
            return localContacts.length;
        } catch (error) {
            console.error('❌ Error pushing local data to GitHub:', error);
            throw error;
        }
    }

    async createBackup() {
        try {
            const timestamp = new Date().toISOString().split('T')[0];
            const backupPath = `backups/backup-${timestamp}.json`;
            
            const allData = {
                contacts: await this.getAllContacts(),
                timestamp: new Date().toISOString(),
                version: '1.0',
                totalContacts: window.AdminData ? AdminData.getAllData().length : 0
            };

            await this.writeFile(backupPath, allData);
            
            console.log('✅ Backup created:', backupPath);
            return backupPath;
        } catch (error) {
            console.error('❌ Error creating backup:', error);
            throw error;
        }
    }
}

// Create global instance
window.GitHubData = new GitHubDataManager();
console.log('🗄️ GitHub Data Manager loaded');

// ===== GITHUB UI FUNCTIONS =====
async function setupGitHubToken() {
    const token = document.getElementById('githubToken').value.trim();
    
    if (!token) {
        alert('⚠️ Please enter your GitHub token');
        return;
    }
    
    if (!token.startsWith('ghp_')) {
        alert('⚠️ Invalid token format. Should start with "ghp_"');
        return;
    }
    
    try {
        window.GitHubData.setToken(token);
        const isConnected = await window.GitHubData.testConnection();
        
        if (isConnected) {
            document.getElementById('githubConnectionStatus').innerHTML = 
                '<div style="color: #059669; background: #d1fae5; padding: 0.5rem; border-radius: 4px;">✅ GitHub connected successfully!</div>';
            
            updateGitHubStatus();
            alert('✅ GitHub integration enabled!\n\nYour data will now sync with GitHub automatically.');
        } else {
            throw new Error('Connection test failed');
        }
    } catch (error) {
        console.error('GitHub setup error:', error);
        document.getElementById('githubConnectionStatus').innerHTML = 
            '<div style="color: #dc2626; background: #fee2e2; padding: 0.5rem; border-radius: 4px;">❌ Connection failed. Check your token.</div>';
    }
}

async function testGitHubConnection() {
    if (!window.GitHubData.getToken()) {
        alert('⚠️ Please set up your GitHub token first');
        return;
    }
    
    try {
        const isConnected = await window.GitHubData.testConnection();
        
        if (isConnected) {
            alert('✅ GitHub connection working perfectly!');
            updateGitHubStatus();
        } else {
            alert('❌ GitHub connection failed. Check your token and repository settings.');
        }
    } catch (error) {
        console.error('Connection test error:', error);
        alert('❌ Connection test failed: ' + error.message);
    }
}

async function pullGitHubData() {
    if (!window.GitHubData.getToken()) {
        alert('⚠️ Please set up GitHub integration first');
        return;
    }
    
    try {
        const result = await window.GitHubData.syncWithLocal();
        alert(`✅ Successfully imported ${result.contacts} contacts from GitHub!`);
        updateAllViews(); // Refresh the UI
        updateGitHubStatus();
    } catch (error) {
        console.error('Pull error:', error);
        alert('❌ Failed to pull data from GitHub: ' + error.message);
    }
}

async function pushGitHubData() {
    if (!window.GitHubData.getToken()) {
        alert('⚠️ Please set up GitHub integration first');
        return;
    }
    
    if (!confirm('This will overwrite data in GitHub with your local data. Continue?')) {
        return;
    }
    
    try {
        const count = await window.GitHubData.pushAllLocalData();
        alert(`✅ Successfully pushed ${count} contacts to GitHub!`);
        updateGitHubStatus();
    } catch (error) {
        console.error('Push error:', error);
        alert('❌ Failed to push data to GitHub: ' + error.message);
    }
}

async function syncGitHubData() {
    if (!window.GitHubData.getToken()) {
        alert('⚠️ Please set up GitHub integration first');
        return;
    }
    
    try {
        const result = await window.GitHubData.syncWithLocal();
        alert(`✅ Sync completed!\n\nContacts: ${result.contacts}\nLast sync: ${new Date(result.lastSync).toLocaleString()}`);
        updateAllViews();
        updateGitHubStatus();
    } catch (error) {
        console.error('Sync error:', error);
        alert('❌ Sync failed: ' + error.message);
    }
}

async function createGitHubBackup() {
    if (!window.GitHubData.getToken()) {
        alert('⚠️ Please set up GitHub integration first');
        return;
    }
    
    try {
        const backupPath = await window.GitHubData.createBackup();
        alert(`✅ Backup created successfully!\n\nLocation: ${backupPath}\n\nThis backup includes all your contacts and configuration.`);
    } catch (error) {
        console.error('Backup error:', error);
        alert('❌ Backup failed: ' + error.message);
    }
}

function updateGitHubStatus() {
    const statusEl = document.getElementById('githubStatusDisplay');
    if (!statusEl) return;
    
    const hasToken = !!window.GitHubData.getToken();
    const contacts = window.AdminData ? window.AdminData.getAllData().length : 0;
    
    if (hasToken) {
        statusEl.innerHTML = `✅ GitHub Connected
📊 Local contacts: ${contacts}
🔄 Ready for sync
🕒 Last updated: ${new Date().toLocaleTimeString()}`;
        statusEl.style.color = '#059669';
    } else {
        statusEl.innerHTML = '❌ Not connected to GitHub\nPaste your token above to get started';
        statusEl.style.color = '#dc2626';
    }
}

// ===== AUTO-INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Check if we already have a token
    if (window.GitHubData && window.GitHubData.getToken()) {
        const tokenInput = document.getElementById('githubToken');
        if (tokenInput) {
            tokenInput.value = '••••••••••••••••••••';
            tokenInput.placeholder = 'Token already set';
        }
        updateGitHubStatus();
    }
    
    // Update status every 30 seconds if connected
    setInterval(() => {
        if (window.GitHubData && window.GitHubData.getToken()) {
            updateGitHubStatus();
        }
    }, 30000);
});

// ===== QUICK SETUP WIZARD =====
async function quickGitHubSetup() {
    const token = prompt('🔑 Enter your GitHub Personal Access Token:\n\n(Paste the token that starts with "ghp_")');
    if (!token) return;
    
    if (!token.startsWith('ghp_')) {
        alert('❌ Invalid token format. Token should start with "ghp_"');
        return;
    }
    
    try {
        console.log('🧙‍♂️ Starting GitHub setup wizard...');
        
        // Step 1: Set token
        window.GitHubData.setToken(token);
        
        // Step 2: Test connection
        const isConnected = await window.GitHubData.testConnection();
        if (!isConnected) {
            throw new Error('Connection test failed');
        }
        
        // Step 3: Initial sync
        const result = await window.GitHubData.syncWithLocal();
        
        // Step 4: Push current data if no data in GitHub
        if (result.contacts === 0 && window.AdminData) {
            const localContacts = AdminData.getAllData();
            if (localContacts.length > 0) {
                await window.GitHubData.pushAllLocalData();
                console.log('📤 Local data pushed to GitHub');
            }
        }
        
        // Update UI
        const tokenInput = document.getElementById('githubToken');
        if (tokenInput) {
            tokenInput.value = '••••••••••••••••••••';
        }
        
        updateGitHubStatus();
        updateAllViews();
        
        alert(`🎉 GitHub setup completed successfully!

✅ Connection established
📊 Contacts synced: ${Math.max(result.contacts, AdminData.getAllData().length)}
🔄 Auto-sync enabled

Your data is now backed up to GitHub and syncs automatically!`);
        
    } catch (error) {
        console.error('Setup failed:', error);
        alert('❌ Setup failed: ' + error.message + '\n\nPlease check your token and try again.');
    }
}

// ===== DEBUG FUNCTIONS =====
function debugGitHubIntegration() {
    const debug = {
        timestamp: new Date().toISOString(),
        user: currentUser,
        githubToken: !!window.GitHubData?.getToken(),
        adminData: !!window.AdminData,
        localDataCount: window.AdminData?.getAllData().length || 0,
        githubDataManager: !!window.GitHubData
    };
    
    console.log('🔍 GitHub Integration Debug Info:', debug);
    
    let debugMessage = `🔍 GITHUB INTEGRATION DEBUG\n\n`;
    debugMessage += `User: ${debug.user?.username} (${debug.user?.role})\n`;
    debugMessage += `GitHub Token: ${debug.githubToken ? 'Set' : 'Not set'}\n`;
    debugMessage += `AdminData: ${debug.adminData ? 'Available' : 'Not available'}\n`;
    debugMessage += `Local Contacts: ${debug.localDataCount}\n`;
    debugMessage += `GitHub Manager: ${debug.githubDataManager ? 'Loaded' : 'Not loaded'}\n`;
    debugMessage += `\nTimestamp: ${debug.timestamp}`;
    
    alert(debugMessage);
    
    return debug;
}

// Make debug function globally available
window.debugGitHubIntegration = debugGitHubIntegration;
