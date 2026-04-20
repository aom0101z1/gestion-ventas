/**
 * TutorBox Admin — Web admin panel for TutorBox app user management.
 * Reads/writes to TutorBox Firebase (tutorbox-4d7c9) via window.tutorboxDb.
 *
 * Features:
 * - User list with search, filter, sort
 * - Per-user access control (languages, features, maxBooks)
 * - Grant All / Revoke All quick actions
 * - Analytics overview (total users, by tier, by language, active)
 * - B2B provisioning link
 */

// Firebase Realtime DB reference (initialized in index.html)
function getTutorboxRef(path) {
    if (!window.tutorboxDb) {
        console.error('❌ TutorBox Firebase not initialized');
        return null;
    }
    // Use the Firebase modular API
    const { ref } = window.firebaseModules || {};
    if (ref) return ref(window.tutorboxDb, path);
    // Fallback — try compat API
    return window.tutorboxDb.ref ? window.tutorboxDb.ref(path) : null;
}

// ====================================================================
// Constants
// ====================================================================

const TB_LANGUAGES = [
    { code: 'EN', flag: '🇬🇧', name: 'English' },
    { code: 'FR', flag: '🇫🇷', name: 'French' },
    { code: 'DE', flag: '🇩🇪', name: 'German' },
    { code: 'ES', flag: '🇪🇸', name: 'Spanish' },
    { code: 'IT', flag: '🇮🇹', name: 'Italian' },
    { code: 'PT', flag: '🇧🇷', name: 'Portuguese' },
    { code: 'JA', flag: '🇯🇵', name: 'Japanese' },
    { code: 'ZH', flag: '🇨🇳', name: 'Chinese' },
];

const TB_FEATURES = {
    smartLearning: 'Smart Learning',
    speakingPractice: 'Speaking Practice',
    callTutorbox: 'Call TutorBox',
    professionalEnglish: 'Professional English',
    kidsMode: 'Kids Mode',
    community: 'Community',
};

const TB_BOOK_OPTIONS = [0, 1, 3, 5, 10];

// ====================================================================
// State
// ====================================================================

let tbUsers = [];
let tbFilteredUsers = [];
let tbSelectedUser = null;
let tbSearchQuery = '';
let tbSortBy = 'name';
let tbFilterTier = 'all';

// ====================================================================
// Main Load Function
// ====================================================================

async function loadTutorBoxAdmin() {
    const container = document.getElementById('tutorboxAdmin');
    if (!container) return;

    container.innerHTML = `
        <div style="padding: 20px; max-width: 1200px; margin: 0 auto;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                <div>
                    <h2 style="margin: 0; color: #1f2937;">📱 TutorBox Admin</h2>
                    <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">Manage app users, access, and permissions</p>
                </div>
                <button onclick="tbRefreshUsers()" style="padding: 8px 16px; background: #7c3aed; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    🔄 Refresh
                </button>
            </div>

            <!-- Analytics Cards -->
            <div id="tbAnalytics" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px;">
                <div class="tb-stat-card">Loading...</div>
            </div>

            <!-- Search & Filters -->
            <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
                <input id="tbSearch" type="text" placeholder="Search by name or email..."
                    oninput="tbHandleSearch(this.value)"
                    style="flex: 1; min-width: 250px; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;">
                <select id="tbFilterTier" onchange="tbHandleFilterTier(this.value)"
                    style="padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; cursor: pointer;">
                    <option value="all">All Tiers</option>
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                    <option value="school">School</option>
                </select>
                <select id="tbSortBy" onchange="tbHandleSort(this.value)"
                    style="padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; cursor: pointer;">
                    <option value="name">Sort: Name</option>
                    <option value="recent">Sort: Recent</option>
                    <option value="email">Sort: Email</option>
                    <option value="tier">Sort: Tier</option>
                </select>
            </div>

            <!-- User List -->
            <div id="tbUserList" style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                <div style="padding: 40px; text-align: center; color: #9ca3af;">Loading users...</div>
            </div>

            <!-- User Detail Modal -->
            <div id="tbUserModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; overflow-y: auto;">
                <div id="tbUserModalContent" style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; padding: 24px; position: relative;">
                </div>
            </div>
        </div>
    `;

    await tbRefreshUsers();
}

// ====================================================================
// Data Loading
// ====================================================================

async function tbRefreshUsers() {
    try {
        const db = window.tutorboxDb;
        if (!db) {
            console.error('TutorBox DB not available');
            return;
        }

        const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
        const snapshot = await get(ref(db, 'users'));

        if (!snapshot.exists()) {
            tbUsers = [];
        } else {
            const data = snapshot.val();
            tbUsers = Object.entries(data).map(([uid, userData]) => ({
                uid,
                ...userData,
            }));
        }

        tbApplyFilters();
        tbRenderAnalytics();
        tbRenderUserList();

        console.log(`✅ Loaded ${tbUsers.length} TutorBox users`);
    } catch (error) {
        console.error('❌ Error loading TutorBox users:', error);
        document.getElementById('tbUserList').innerHTML = `
            <div style="padding: 40px; text-align: center; color: #ef4444;">
                Error loading users: ${error.message}
            </div>
        `;
    }
}

// ====================================================================
// Filtering & Sorting
// ====================================================================

function tbHandleSearch(query) {
    tbSearchQuery = query.toLowerCase().trim();
    tbApplyFilters();
    tbRenderUserList();
}

function tbHandleFilterTier(tier) {
    tbFilterTier = tier;
    tbApplyFilters();
    tbRenderUserList();
}

function tbHandleSort(sort) {
    tbSortBy = sort;
    tbApplyFilters();
    tbRenderUserList();
}

function tbApplyFilters() {
    let list = [...tbUsers];

    // Search
    if (tbSearchQuery) {
        list = list.filter(u =>
            (u.displayName || '').toLowerCase().includes(tbSearchQuery) ||
            (u.email || '').toLowerCase().includes(tbSearchQuery)
        );
    }

    // Tier filter
    if (tbFilterTier !== 'all') {
        list = list.filter(u => (u.tier || 'free') === tbFilterTier);
    }

    // Sort
    if (tbSortBy === 'name') {
        list.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
    } else if (tbSortBy === 'email') {
        list.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
    } else if (tbSortBy === 'recent') {
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (tbSortBy === 'tier') {
        list.sort((a, b) => (a.tier || 'free').localeCompare(b.tier || 'free'));
    }

    tbFilteredUsers = list;
}

// ====================================================================
// Analytics
// ====================================================================

function tbRenderAnalytics() {
    const container = document.getElementById('tbAnalytics');
    if (!container) return;

    const total = tbUsers.length;
    const byTier = { free: 0, premium: 0, school: 0 };
    const byRole = { user: 0, teacher: 0, superadmin: 0 };
    const withAccess = tbUsers.filter(u => (u.access?.languages || []).length > 0).length;
    const locked = total - withAccess;

    tbUsers.forEach(u => {
        byTier[u.tier || 'free'] = (byTier[u.tier || 'free'] || 0) + 1;
        byRole[u.role || 'user'] = (byRole[u.role || 'user'] || 0) + 1;
    });

    container.innerHTML = `
        <div class="tb-stat-card">
            <div class="tb-stat-value">${total}</div>
            <div class="tb-stat-label">Total Users</div>
        </div>
        <div class="tb-stat-card" style="border-left: 3px solid #10b981;">
            <div class="tb-stat-value" style="color: #10b981;">${withAccess}</div>
            <div class="tb-stat-label">With Access</div>
        </div>
        <div class="tb-stat-card" style="border-left: 3px solid #ef4444;">
            <div class="tb-stat-value" style="color: #ef4444;">${locked}</div>
            <div class="tb-stat-label">Locked</div>
        </div>
        <div class="tb-stat-card" style="border-left: 3px solid #3b82f6;">
            <div class="tb-stat-value" style="color: #3b82f6;">${byTier.school}</div>
            <div class="tb-stat-label">School (B2B)</div>
        </div>
        <div class="tb-stat-card" style="border-left: 3px solid #a855f7;">
            <div class="tb-stat-value" style="color: #a855f7;">${byTier.premium}</div>
            <div class="tb-stat-label">Premium</div>
        </div>
        <div class="tb-stat-card" style="border-left: 3px solid #eab308;">
            <div class="tb-stat-value" style="color: #eab308;">${byRole.superadmin}</div>
            <div class="tb-stat-label">Admins</div>
        </div>
    `;
}

// ====================================================================
// User List
// ====================================================================

function tbRenderUserList() {
    const container = document.getElementById('tbUserList');
    if (!container) return;

    if (tbFilteredUsers.length === 0) {
        container.innerHTML = `<div style="padding: 40px; text-align: center; color: #9ca3af;">No users found</div>`;
        return;
    }

    const rows = tbFilteredUsers.map(user => {
        const langs = (user.access?.languages || []).map(l => {
            const info = TB_LANGUAGES.find(x => x.code === l);
            return info ? info.flag : l;
        }).join(' ') || '<span style="color:#ef4444;">None</span>';

        const featureCount = Object.values(user.access?.features || {}).filter(Boolean).length;
        const tierColor = user.tier === 'premium' ? '#10b981' : user.tier === 'school' ? '#3b82f6' : '#9ca3af';
        const roleTag = user.role === 'superadmin' ? '<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:11px;margin-left:6px;">Admin</span>' : '';

        return `
            <div onclick="tbOpenUserDetail('${user.uid}')"
                style="display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background 0.15s;"
                onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                <div style="width: 40px; height: 40px; border-radius: 20px; background: linear-gradient(135deg, #7c3aed, #a855f7); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; flex-shrink: 0;">
                    ${(user.displayName || 'U').split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div style="flex: 1; margin-left: 12px; min-width: 0;">
                    <div style="font-weight: 600; color: #1f2937; font-size: 14px;">
                        ${user.displayName || 'Unknown'}${roleTag}
                    </div>
                    <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">${user.email || 'N/A'}</div>
                </div>
                <div style="text-align: center; min-width: 60px;">
                    <div style="font-size: 14px;">${langs}</div>
                    <div style="font-size: 10px; color: #9ca3af;">Languages</div>
                </div>
                <div style="text-align: center; min-width: 60px; margin-left: 8px;">
                    <div style="font-size: 14px; font-weight: 600; color: ${featureCount > 0 ? '#10b981' : '#ef4444'};">${featureCount}/6</div>
                    <div style="font-size: 10px; color: #9ca3af;">Features</div>
                </div>
                <div style="text-align: center; min-width: 50px; margin-left: 8px;">
                    <span style="background: ${tierColor}20; color: ${tierColor}; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;">
                        ${(user.tier || 'free').toUpperCase()}
                    </span>
                </div>
                <div style="margin-left: 8px; color: #d1d5db; font-size: 18px;">›</div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="background: #f9fafb; padding: 8px 16px; font-size: 12px; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb;">
            ${tbFilteredUsers.length} users ${tbSearchQuery ? '(filtered)' : ''}
        </div>
        ${rows}
    `;
}

// ====================================================================
// User Detail Modal
// ====================================================================

function tbOpenUserDetail(uid) {
    tbSelectedUser = tbUsers.find(u => u.uid === uid);
    if (!tbSelectedUser) return;

    const modal = document.getElementById('tbUserModal');
    const content = document.getElementById('tbUserModalContent');

    const user = tbSelectedUser;
    const access = user.access || { languages: [], features: {}, maxBooks: 0 };

    content.innerHTML = `
        <button onclick="tbCloseModal()" style="position: absolute; top: 12px; right: 16px; background: none; border: none; font-size: 22px; cursor: pointer; color: #9ca3af;">✕</button>

        <!-- Profile Header -->
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 64px; height: 64px; border-radius: 32px; background: linear-gradient(135deg, #7c3aed, #a855f7); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 22px; margin: 0 auto 10px;">
                ${(user.displayName || 'U').split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <h3 style="margin: 0; color: #1f2937;">${user.displayName || 'Unknown'}</h3>
            <p style="margin: 4px 0; color: #6b7280; font-size: 13px;">${user.email || 'N/A'}</p>
            <div style="display: flex; gap: 6px; justify-content: center; margin-top: 8px;">
                <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 8px; font-size: 11px; color: #6b7280;">${user.role || 'user'}</span>
                <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 8px; font-size: 11px; color: #6b7280;">${user.tier || 'free'}</span>
                <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 8px; font-size: 11px; color: #6b7280;">${user.accountChannel || 'b2c'}</span>
            </div>
            <p style="margin: 6px 0 0; color: #9ca3af; font-size: 11px;">UID: ${user.uid}</p>
        </div>

        <!-- Quick Actions -->
        <div style="display: flex; gap: 8px; margin-bottom: 20px;">
            <button onclick="tbGrantFullAccess()" style="flex: 1; padding: 10px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 13px;">
                ✅ Grant All Access
            </button>
            <button onclick="tbRevokeAllAccess()" style="flex: 1; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 13px;">
                🔒 Revoke All
            </button>
        </div>

        <!-- Languages -->
        <div style="margin-bottom: 16px;">
            <label style="font-weight: 700; font-size: 13px; color: #374151; display: block; margin-bottom: 8px;">Languages</label>
            <div id="tbModalLangs" style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${TB_LANGUAGES.map(l => {
                    const active = (access.languages || []).includes(l.code);
                    return `<button onclick="tbToggleLang('${l.code}')" id="tbLang_${l.code}"
                        style="padding: 6px 12px; border-radius: 16px; border: 1.5px solid ${active ? '#3b82f6' : '#e5e7eb'}; background: ${active ? '#dbeafe' : '#f9fafb'}; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                        <span>${l.flag}</span> <span style="color: ${active ? '#2563eb' : '#6b7280'}; font-weight: ${active ? '700' : '400'};">${l.code}</span>
                    </button>`;
                }).join('')}
            </div>
        </div>

        <!-- Features -->
        <div style="margin-bottom: 16px;">
            <label style="font-weight: 700; font-size: 13px; color: #374151; display: block; margin-bottom: 8px;">Features</label>
            <div id="tbModalFeatures">
                ${Object.entries(TB_FEATURES).map(([key, label]) => {
                    const on = access.features?.[key] || false;
                    return `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                        <span style="font-size: 14px; color: #374151;">${label}</span>
                        <button onclick="tbToggleFeature('${key}')" id="tbFeat_${key}"
                            style="padding: 4px 14px; border-radius: 12px; border: none; cursor: pointer; font-size: 12px; font-weight: 700; color: white; background: ${on ? '#10b981' : '#d1d5db'};">
                            ${on ? 'ON' : 'OFF'}
                        </button>
                    </div>`;
                }).join('')}
            </div>
        </div>

        <!-- Max Books -->
        <div style="margin-bottom: 20px;">
            <label style="font-weight: 700; font-size: 13px; color: #374151; display: block; margin-bottom: 8px;">Max Books</label>
            <div id="tbModalBooks" style="display: flex; gap: 6px;">
                ${TB_BOOK_OPTIONS.map(n => {
                    const active = (access.maxBooks || 0) === n;
                    return `<button onclick="tbSetMaxBooks(${n})" id="tbBook_${n}"
                        style="padding: 6px 14px; border-radius: 12px; border: 1.5px solid ${active ? '#3b82f6' : '#e5e7eb'}; background: ${active ? '#dbeafe' : '#f9fafb'}; cursor: pointer; font-size: 13px; font-weight: ${active ? '700' : '400'}; color: ${active ? '#2563eb' : '#6b7280'};">
                        ${n === 0 ? 'None' : n}
                    </button>`;
                }).join('')}
            </div>
        </div>

        <!-- Save -->
        <button onclick="tbSaveAccess()" style="width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 15px;">
            💾 Save Access Changes
        </button>

        <!-- Info -->
        ${access.grantedBy ? `<p style="text-align: center; margin-top: 10px; color: #9ca3af; font-size: 11px;">Last modified by ${access.grantedBy} on ${new Date(access.grantedAt).toLocaleDateString()}</p>` : ''}
    `;

    modal.style.display = 'block';
}

function tbCloseModal() {
    document.getElementById('tbUserModal').style.display = 'none';
    tbSelectedUser = null;
}

// ====================================================================
// Access Control Actions
// ====================================================================

function tbToggleLang(code) {
    if (!tbSelectedUser) return;
    const access = tbSelectedUser.access = tbSelectedUser.access || { languages: [], features: {}, maxBooks: 0 };
    const idx = access.languages.indexOf(code);
    if (idx >= 0) access.languages.splice(idx, 1);
    else access.languages.push(code);

    const btn = document.getElementById(`tbLang_${code}`);
    const active = access.languages.includes(code);
    btn.style.border = `1.5px solid ${active ? '#3b82f6' : '#e5e7eb'}`;
    btn.style.background = active ? '#dbeafe' : '#f9fafb';
    btn.querySelector('span:last-child').style.color = active ? '#2563eb' : '#6b7280';
    btn.querySelector('span:last-child').style.fontWeight = active ? '700' : '400';
}

function tbToggleFeature(key) {
    if (!tbSelectedUser) return;
    const access = tbSelectedUser.access = tbSelectedUser.access || { languages: [], features: {}, maxBooks: 0 };
    access.features = access.features || {};
    access.features[key] = !access.features[key];

    const btn = document.getElementById(`tbFeat_${key}`);
    const on = access.features[key];
    btn.style.background = on ? '#10b981' : '#d1d5db';
    btn.textContent = on ? 'ON' : 'OFF';
}

function tbSetMaxBooks(n) {
    if (!tbSelectedUser) return;
    const access = tbSelectedUser.access = tbSelectedUser.access || { languages: [], features: {}, maxBooks: 0 };
    access.maxBooks = n;

    TB_BOOK_OPTIONS.forEach(opt => {
        const btn = document.getElementById(`tbBook_${opt}`);
        const active = opt === n;
        btn.style.border = `1.5px solid ${active ? '#3b82f6' : '#e5e7eb'}`;
        btn.style.background = active ? '#dbeafe' : '#f9fafb';
        btn.style.fontWeight = active ? '700' : '400';
        btn.style.color = active ? '#2563eb' : '#6b7280';
    });
}

async function tbGrantFullAccess() {
    if (!tbSelectedUser) return;
    tbSelectedUser.access = {
        languages: TB_LANGUAGES.map(l => l.code),
        features: Object.fromEntries(Object.keys(TB_FEATURES).map(k => [k, true])),
        maxBooks: 10,
    };
    await tbSaveAccess();
    tbOpenUserDetail(tbSelectedUser.uid); // Refresh modal
}

async function tbRevokeAllAccess() {
    if (!tbSelectedUser) return;
    if (!confirm(`Revoke ALL access from ${tbSelectedUser.email}?`)) return;
    tbSelectedUser.access = {
        languages: [],
        features: Object.fromEntries(Object.keys(TB_FEATURES).map(k => [k, false])),
        maxBooks: 0,
    };
    await tbSaveAccess();
    tbOpenUserDetail(tbSelectedUser.uid); // Refresh modal
}

async function tbSaveAccess() {
    if (!tbSelectedUser) return;

    try {
        const { ref, update } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
        const db = window.tutorboxDb;
        const access = tbSelectedUser.access || {};

        const updates = {};
        updates['access/languages'] = access.languages || [];
        updates['access/features/smartLearning'] = access.features?.smartLearning || false;
        updates['access/features/speakingPractice'] = access.features?.speakingPractice || false;
        updates['access/features/callTutorbox'] = access.features?.callTutorbox || false;
        updates['access/features/professionalEnglish'] = access.features?.professionalEnglish || false;
        updates['access/features/kidsMode'] = access.features?.kidsMode || false;
        updates['access/features/community'] = access.features?.community || false;
        updates['access/maxBooks'] = access.maxBooks || 0;
        updates['access/grantedBy'] = 'admin@ciudadbilingue.com';
        updates['access/grantedAt'] = new Date().toISOString();

        await update(ref(db, `users/${tbSelectedUser.uid}`), updates);

        // Update local state
        const localUser = tbUsers.find(u => u.uid === tbSelectedUser.uid);
        if (localUser) {
            localUser.access = { ...access, grantedBy: 'admin@ciudadbilingue.com', grantedAt: new Date().toISOString() };
        }

        tbApplyFilters();
        tbRenderUserList();
        tbRenderAnalytics();

        alert(`✅ Access updated for ${tbSelectedUser.email}`);
    } catch (error) {
        console.error('Error saving access:', error);
        alert(`❌ Error: ${error.message}`);
    }
}

// ====================================================================
// Styles (injected into page)
// ====================================================================

(function injectTBStyles() {
    if (document.getElementById('tb-admin-styles')) return;
    const style = document.createElement('style');
    style.id = 'tb-admin-styles';
    style.textContent = `
        .tb-stat-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
        }
        .tb-stat-value {
            font-size: 24px;
            font-weight: 800;
            color: #1f2937;
        }
        .tb-stat-label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
            font-weight: 600;
        }
        #tbUserModal {
            display: none;
        }
    `;
    document.head.appendChild(style);
})();

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.id === 'tbUserModal') {
        tbCloseModal();
    }
});

console.log('✅ TutorBox Admin module loaded');
