// inbox.js — 💬 Mensajes de Facebook e Instagram dentro del CRM (28 Sep 2026, fundador)
//
// Replaces the never-finished browser-only social.js. The CRM never talks to
// Meta: every call goes to the TutorBox Cloud Function `socialInbox`
// (functions/crm/socialInbox.js in the TutorBox repo), which holds the page
// tokens, receives Meta's webhook and stores the conversations. The caller is
// identified by their CRM Firebase ID token and checked against the same
// `socialMedia` module permission this tab already uses.
//
// Every reply records who sent it and how long the customer waited; the
// Director's "📊 Control del equipo" shows it, including replies made outside
// the CRM (Business Suite / Instagram app), which Meta echoes back to us.

const INBOX_API = 'https://us-central1-tutorbox-4d7c9.cloudfunctions.net/socialInbox';
const INBOX_POLL_MS = 15000;      // while the tab is open
const INBOX_BADGE_MS = 60000;     // tab badge in the background
const INBOX_WINDOW_MS = 24 * 3600e3;

const Inbox = {
    threads: new Map(),
    pages: [],
    me: null,
    selected: null,
    messages: [],
    since: 0,
    filter: 'todos',   // todos | pendientes | fb | ig
    search: '',
    pollTimer: null,
    badgeTimer: null,
    loading: false,
    rendered: false
};

function inboxEsc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function inboxAgo(ms) {
    if (!ms) return '';
    const d = Date.now() - ms;
    if (d < 60e3) return 'ahora';
    if (d < 3600e3) return `hace ${Math.floor(d / 60e3)} min`;
    if (d < 86400e3) return `hace ${Math.floor(d / 3600e3)} h`;
    return `hace ${Math.floor(d / 86400e3)} d`;
}

function inboxDuration(ms) {
    if (ms == null) return '—';
    if (ms < 60e3) return `${Math.round(ms / 1e3)} s`;
    if (ms < 3600e3) return `${Math.round(ms / 60e3)} min`;
    if (ms < 86400e3) return `${(ms / 3600e3).toFixed(1)} h`;
    return `${(ms / 86400e3).toFixed(1)} d`;
}

function inboxTime(ms) {
    if (!ms) return '';
    const d = new Date(ms);
    const today = new Date().toDateString() === d.toDateString();
    return today
        ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function inboxApi(action, payload = {}) {
    const user = window.FirebaseData?.currentUser;
    if (!user) throw new Error('Inicia sesión en el CRM');
    const token = await user.getIdToken();
    const res = await fetch(INBOX_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, ...payload })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
        const err = new Error(data.error || `HTTP ${res.status}`);
        err.code = data.code;
        err.status = res.status;
        throw err;
    }
    return data;
}

function inboxCanUse() {
    return !!window.PermissionEnforcer?.hasPermission?.('socialMedia');
}

// ── data ───────────────────────────────────────────────────────────────────

async function inboxRefresh(full = false) {
    if (Inbox.loading) return;
    Inbox.loading = true;
    try {
        const data = await inboxApi('threads', full || !Inbox.since ? {} : { since: Inbox.since });
        if (full) Inbox.threads.clear();
        for (const t of data.threads || []) Inbox.threads.set(t.id, t);
        Inbox.pages = data.pages || [];
        Inbox.me = data.me || Inbox.me;
        Inbox.since = data.serverTime || Date.now();
        inboxUpdateBadge();
        if (inboxTabOpen()) {
            inboxRenderList();
            inboxRenderHeader();
            const sel = Inbox.selected && (data.threads || []).find(t => t.id === Inbox.selected);
            if (sel) await inboxLoadMessages(Inbox.selected, true);
        }
    } catch (err) {
        console.warn('inbox refresh:', err.message);
        if (inboxTabOpen() && err.status === 403) {
            document.getElementById('socialMediaContainer').innerHTML =
                `<div style="padding:2rem; color:#b91c1c;">🚫 ${inboxEsc(err.message)}</div>`;
            Inbox.rendered = false;
        }
    } finally {
        Inbox.loading = false;
    }
}

async function inboxLoadMessages(threadId, quiet = false) {
    try {
        const data = await inboxApi('messages', { threadId });
        if (Inbox.selected !== threadId) return;
        Inbox.messages = data.messages || [];
        if (data.thread) Inbox.threads.set(threadId, { id: threadId, ...Inbox.threads.get(threadId), ...data.thread });
        inboxRenderConversation();
        const t = Inbox.threads.get(threadId);
        if (t?.unread) {
            inboxApi('read', { threadId }).catch(() => {});
            t.unread = 0;
            inboxRenderList();
            inboxUpdateBadge();
        }
    } catch (err) {
        if (!quiet) window.showNotification?.('❌ ' + err.message, 'error');
    }
}

function inboxTabOpen() {
    const tab = document.getElementById('socialMedia');
    return !!tab && !tab.classList.contains('hidden') && tab.style.display !== 'none';
}

function inboxUpdateBadge() {
    const tabBtn = document.getElementById('socialMediaTab');
    if (!tabBtn) return;
    const pending = [...Inbox.threads.values()].filter(t => t.unanswered).length;
    tabBtn.innerHTML = `💬 Mensajes${pending ? ` <span style="background:#ef4444; color:white; border-radius:999px; padding:0 6px; font-size:0.75rem;">${pending}</span>` : ''}`;
}

// ── rendering ─────────────────────────────────────────────────────────────

function inboxRenderShell() {
    const c = document.getElementById('socialMediaContainer');
    if (!c) return;
    c.innerHTML = `
        <div id="inboxHeader" style="display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center; justify-content:space-between; margin-bottom:0.75rem;"></div>
        <div style="display:grid; grid-template-columns: minmax(260px, 340px) 1fr; gap:1rem; height: calc(100vh - 230px); min-height: 460px;">
            <div style="background:white; border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,0.08); display:flex; flex-direction:column; overflow:hidden;">
                <div style="padding:0.6rem; border-bottom:1px solid #f3f4f6;">
                    <input id="inboxSearch" type="text" placeholder="🔍 Buscar nombre o mensaje…" value="${inboxEsc(Inbox.search)}"
                           oninput="Inbox.search = this.value; inboxRenderList()"
                           style="width:100%; padding:0.45rem 0.6rem; border:1px solid #e5e7eb; border-radius:6px;">
                    <div id="inboxFilters" style="display:flex; gap:0.35rem; margin-top:0.5rem; flex-wrap:wrap;"></div>
                </div>
                <div id="inboxList" style="flex:1; overflow-y:auto;"></div>
            </div>
            <div id="inboxConversation" style="background:white; border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,0.08); display:flex; flex-direction:column; overflow:hidden;"></div>
        </div>`;
    Inbox.rendered = true;
    inboxRenderHeader();
    inboxRenderList();
    inboxRenderConversation();
}

function inboxRenderHeader() {
    const h = document.getElementById('inboxHeader');
    if (!h) return;
    const all = [...Inbox.threads.values()];
    const pending = all.filter(t => t.unanswered);
    const oldest = pending.reduce((m, t) => Math.min(m, t.waitingSince || Infinity), Infinity);
    const pagesTxt = Inbox.pages.length
        ? Inbox.pages.map(p => `${inboxEsc(p.name)}${p.igUsername ? ` · IG @${inboxEsc(p.igUsername)}` : ''}${p.subscribed === false ? ' ⚠️' : ''}`).join(' &nbsp;|&nbsp; ')
        : '<span style="color:#b45309;">Sin páginas conectadas</span>';
    h.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center;">
            <span style="background:${pending.length ? '#fee2e2' : '#dcfce7'}; color:${pending.length ? '#991b1b' : '#166534'}; padding:0.3rem 0.7rem; border-radius:999px; font-size:0.85rem; font-weight:600;">
                ${pending.length ? `⏳ ${pending.length} sin responder` : '✅ Todo respondido'}
            </span>
            ${pending.length ? `<span style="color:#6b7280; font-size:0.85rem;">el más antiguo espera ${inboxDuration(Date.now() - oldest)}</span>` : ''}
            <span style="color:#9ca3af; font-size:0.8rem;">${pagesTxt}</span>
        </div>
        <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-sm" onclick="inboxRefresh(true)" style="background:#e5e7eb;">🔄 Actualizar</button>
            ${Inbox.me?.isAdmin ? `
            <button class="btn btn-sm" onclick="inboxShowStats()" style="background:#4f46e5; color:white;">📊 Control del equipo</button>
            <button class="btn btn-sm" onclick="inboxShowConnect()" style="background:#0ea5e9; color:white;">🔌 Conectar páginas</button>` : ''}
        </div>`;
}

function inboxFilteredThreads() {
    const q = Inbox.search.trim().toLowerCase();
    return [...Inbox.threads.values()]
        .filter(t => Inbox.filter === 'todos'
            || (Inbox.filter === 'pendientes' && t.unanswered)
            || t.channel === Inbox.filter)
        .filter(t => !q || `${t.name || ''} ${t.username || ''} ${t.lastText || ''}`.toLowerCase().includes(q))
        .sort((a, b) => {
            // Waiting customers first (longest wait on top), then most recent.
            if (!!a.unanswered !== !!b.unanswered) return a.unanswered ? -1 : 1;
            if (a.unanswered) return (a.waitingSince || 0) - (b.waitingSince || 0);
            return (b.lastAt || 0) - (a.lastAt || 0);
        });
}

function inboxRenderList() {
    const f = document.getElementById('inboxFilters');
    if (f) {
        const all = [...Inbox.threads.values()];
        const chip = (id, label, n) => `<button onclick="Inbox.filter='${id}'; inboxRenderList()"
            style="border:1px solid ${Inbox.filter === id ? '#4f46e5' : '#e5e7eb'}; background:${Inbox.filter === id ? '#eef2ff' : 'white'};
                   border-radius:999px; padding:0.15rem 0.6rem; font-size:0.78rem; cursor:pointer;">${label}${n != null ? ` (${n})` : ''}</button>`;
        f.innerHTML = chip('todos', 'Todos', all.length)
            + chip('pendientes', '⏳ Sin responder', all.filter(t => t.unanswered).length)
            + chip('fb', '📘 Facebook', all.filter(t => t.channel === 'fb').length)
            + chip('ig', '📸 Instagram', all.filter(t => t.channel === 'ig').length);
    }
    const list = document.getElementById('inboxList');
    if (!list) return;
    const threads = inboxFilteredThreads();
    if (!threads.length) {
        list.innerHTML = `<div style="padding:1.5rem; color:#6b7280; font-size:0.9rem; text-align:center;">
            ${Inbox.threads.size ? 'Nada coincide con el filtro.' : (Inbox.pages.length ? 'Todavía no hay conversaciones. Aparecen aquí apenas alguien escriba a la página o al Instagram.' : 'El Director debe conectar las páginas con 🔌 Conectar páginas.')}
        </div>`;
        return;
    }
    list.innerHTML = threads.map(t => {
        const late = t.unanswered && t.waitingSince && Date.now() - t.waitingSince > 3600e3;
        const pic = t.pic
            ? `<img src="${inboxEsc(t.pic)}" referrerpolicy="no-referrer" style="width:38px; height:38px; border-radius:50%; object-fit:cover;" onerror="this.replaceWith(document.createTextNode('👤'))">`
            : '<span style="font-size:1.6rem;">👤</span>';
        return `
            <div onclick="inboxSelect('${inboxEsc(t.id)}')" style="display:flex; gap:0.6rem; padding:0.65rem 0.75rem; cursor:pointer; border-bottom:1px solid #f3f4f6;
                 background:${Inbox.selected === t.id ? '#eef2ff' : (t.unanswered ? '#fffbeb' : 'white')};">
                <div style="position:relative; width:38px; flex-shrink:0; text-align:center;">${pic}
                    <span style="position:absolute; right:-4px; bottom:-4px; font-size:0.8rem;">${t.channel === 'ig' ? '📸' : '📘'}</span>
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; justify-content:space-between; gap:0.5rem;">
                        <b style="font-size:0.88rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${inboxEsc(t.name || (t.username ? '@' + t.username : 'Cliente'))}</b>
                        <span style="color:#9ca3af; font-size:0.72rem; white-space:nowrap;">${inboxTime(t.lastAt)}</span>
                    </div>
                    <div style="color:#6b7280; font-size:0.8rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${t.lastDir === 'out' ? '↩️ ' : ''}${inboxEsc(t.lastText || '')}
                    </div>
                    ${t.unanswered ? `<div style="font-size:0.72rem; color:${late ? '#b91c1c' : '#b45309'}; font-weight:600;">⏳ espera ${inboxDuration(Date.now() - (t.waitingSince || t.lastAt))}</div>` : ''}
                </div>
                ${t.unread ? `<span style="align-self:center; background:#ef4444; color:white; border-radius:999px; padding:0 6px; font-size:0.72rem;">${t.unread}</span>` : ''}
            </div>`;
    }).join('');
}

function inboxRenderConversation() {
    const box = document.getElementById('inboxConversation');
    if (!box) return;
    const t = Inbox.selected && Inbox.threads.get(Inbox.selected);
    if (!t) {
        box.innerHTML = `<div style="margin:auto; text-align:center; color:#6b7280; padding:2rem;">
            <div style="font-size:3rem;">💬</div>
            <div style="font-weight:600;">Elige una conversación</div>
            <div style="font-size:0.85rem;">Las que esperan respuesta aparecen primero.</div></div>`;
        return;
    }
    const windowOpen = t.lastInboundAt && Date.now() - t.lastInboundAt < INBOX_WINDOW_MS;
    const msgs = Inbox.messages.map(m => {
        const out = m.dir === 'out';
        const att = (m.attachments || []).map(a => a.type === 'image' && a.url
            ? `<a href="${inboxEsc(a.url)}" target="_blank" rel="noopener"><img src="${inboxEsc(a.url)}" referrerpolicy="no-referrer" style="max-width:220px; border-radius:8px; display:block; margin-top:4px;"></a>`
            : `<a href="${inboxEsc(a.url)}" target="_blank" rel="noopener" style="display:block;">📎 ${inboxEsc(a.type)}</a>`).join('');
        const who = out ? (m.via === 'external' ? '📱 Respondido fuera del CRM' : `👤 ${inboxEsc(m.agentName || '')}`) : '';
        return `
            <div style="display:flex; justify-content:${out ? 'flex-end' : 'flex-start'}; margin:0.35rem 0;">
                <div style="max-width:70%; background:${out ? (m.via === 'external' ? '#e0f2fe' : '#4f46e5') : '#f3f4f6'}; color:${out && m.via !== 'external' ? 'white' : '#111827'};
                            padding:0.5rem 0.75rem; border-radius:12px; font-size:0.9rem; white-space:pre-wrap; word-wrap:break-word;">
                    ${inboxEsc(m.text || '')}${att}
                    <div style="font-size:0.68rem; opacity:0.75; margin-top:3px; text-align:right;">${who ? who + ' · ' : ''}${inboxTime(m.at)}</div>
                </div>
            </div>`;
    }).join('');
    box.innerHTML = `
        <div style="padding:0.7rem 1rem; border-bottom:1px solid #f3f4f6; display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
            <div>
                <b>${t.channel === 'ig' ? '📸' : '📘'} ${inboxEsc(t.name || (t.username ? '@' + t.username : 'Cliente'))}</b>
                ${t.username ? `<span style="color:#6b7280; font-size:0.85rem;"> @${inboxEsc(t.username)}</span>` : ''}
                <div style="color:#9ca3af; font-size:0.75rem;">${t.channel === 'ig' ? 'Instagram' : 'Facebook Messenger'}${t.lastAgent ? ` · última respuesta: ${inboxEsc(t.lastAgent)}` : ''}</div>
            </div>
            ${t.unanswered ? `<span style="background:#fee2e2; color:#991b1b; padding:0.2rem 0.6rem; border-radius:999px; font-size:0.78rem; font-weight:600;">⏳ espera ${inboxDuration(Date.now() - (t.waitingSince || t.lastAt))}</span>` : ''}
        </div>
        <div id="inboxMessages" style="flex:1; overflow-y:auto; padding:0.75rem 1rem;">${msgs || '<div style="color:#9ca3af;">Cargando…</div>'}</div>
        <div style="border-top:1px solid #f3f4f6; padding:0.6rem;">
            ${windowOpen ? `
            <div style="display:flex; gap:0.5rem;">
                <textarea id="inboxReply" rows="2" maxlength="1000" placeholder="Escribe la respuesta… (Enter envía, Shift+Enter nueva línea)"
                          onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); inboxSend();}"
                          style="flex:1; resize:vertical; padding:0.5rem; border:1px solid #e5e7eb; border-radius:8px; font-family:inherit;"></textarea>
                <button id="inboxSendBtn" class="btn btn-primary" onclick="inboxSend()">Enviar</button>
            </div>` : `
            <div style="background:#fff7ed; color:#9a3412; border-radius:8px; padding:0.6rem 0.8rem; font-size:0.85rem;">
                ⏰ Pasaron más de 24 horas desde el último mensaje del cliente. Meta no permite responder desde aquí:
                respóndele desde la app de ${t.channel === 'ig' ? 'Instagram' : 'Facebook / Business Suite'} o espera a que vuelva a escribir.
            </div>`}
        </div>`;
    const m = document.getElementById('inboxMessages');
    if (m) m.scrollTop = m.scrollHeight;
}

// ── actions ───────────────────────────────────────────────────────────────

window.inboxSelect = function(threadId) {
    Inbox.selected = threadId;
    Inbox.messages = [];
    inboxRenderList();
    inboxRenderConversation();
    inboxLoadMessages(threadId);
};

window.inboxSend = async function() {
    const input = document.getElementById('inboxReply');
    const btn = document.getElementById('inboxSendBtn');
    const text = (input?.value || '').trim();
    if (!text || !Inbox.selected || btn?.disabled) return;
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
    try {
        const { message } = await inboxApi('send', { threadId: Inbox.selected, text });
        Inbox.messages.push(message);
        const t = Inbox.threads.get(Inbox.selected);
        if (t) Object.assign(t, { lastText: text, lastAt: message.at, lastDir: 'out', unanswered: false, waitingSince: null, unread: 0, lastAgent: message.agentName });
        inboxRenderConversation();
        inboxRenderList();
        inboxRenderHeader();
        inboxUpdateBadge();
    } catch (err) {
        window.showNotification?.('❌ No se envió: ' + err.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Enviar'; }
    }
};

window.inboxShowStats = async function(days = 7) {
    document.getElementById('inboxStatsModal')?.remove();
    const c = document.getElementById('socialMediaContainer');
    c.insertAdjacentHTML('beforeend', `
        <div id="inboxStatsModal" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;">
            <div style="background:white; border-radius:10px; padding:1.5rem; width:92%; max-width:820px; max-height:88vh; overflow-y:auto;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0;">📊 Control del equipo</h3>
                    <button onclick="document.getElementById('inboxStatsModal').remove()" style="background:none; border:none; font-size:1.4rem; cursor:pointer;">✖</button>
                </div>
                <div style="margin:0.6rem 0; display:flex; gap:0.4rem;">
                    ${[1, 7, 30].map(d => `<button class="btn btn-sm" onclick="inboxShowStats(${d})" style="background:${d === days ? '#4f46e5' : '#e5e7eb'}; color:${d === days ? 'white' : '#111'};">${d === 1 ? 'Hoy (24 h)' : `${d} días`}</button>`).join('')}
                </div>
                <div id="inboxStatsBody" style="color:#6b7280;">Cargando…</div>
            </div>
        </div>`);
    try {
        const s = await inboxApi('stats', { days });
        const rows = s.agents.map(a => `
            <tr style="border-top:1px solid #f3f4f6;">
                <td style="padding:0.45rem;">${a.id === '__external' ? '📱 <i>Fuera del CRM</i> (app / Business Suite)' : '👤 ' + inboxEsc(a.name)}</td>
                <td style="padding:0.45rem; text-align:right;"><b>${a.replies}</b></td>
                <td style="padding:0.45rem; text-align:right;">${a.fb || 0} / ${a.ig || 0}</td>
                <td style="padding:0.45rem; text-align:right;">${inboxDuration(a.avgMs)}</td>
                <td style="padding:0.45rem; text-align:right;">${inboxDuration(a.maxMs || null)}</td>
                <td style="padding:0.45rem; text-align:right; color:#6b7280;">${inboxAgo(a.lastAt)}</td>
            </tr>`).join('');
        const waiting = s.waiting.map(w => `<li>${w.channel === 'ig' ? '📸' : '📘'} ${inboxEsc(w.name)} — espera <b>${inboxDuration(Date.now() - (w.waitingSince || Date.now()))}</b></li>`).join('');
        document.getElementById('inboxStatsBody').innerHTML = `
            <table style="width:100%; border-collapse:collapse; font-size:0.88rem; color:#111827;">
                <thead><tr style="background:#f9fafb; text-align:left;">
                    <th style="padding:0.45rem;">Quién</th><th style="padding:0.45rem; text-align:right;">Respuestas</th>
                    <th style="padding:0.45rem; text-align:right;">FB / IG</th><th style="padding:0.45rem; text-align:right;">Tiempo medio</th>
                    <th style="padding:0.45rem; text-align:right;">Peor espera</th><th style="padding:0.45rem; text-align:right;">Última</th>
                </tr></thead>
                <tbody>${rows || '<tr><td colspan="6" style="padding:0.8rem; color:#6b7280;">Nadie ha respondido en este periodo.</td></tr>'}</tbody>
            </table>
            <h4 style="margin:1.2rem 0 0.4rem;">⏳ Esperando respuesta ahora (${s.waiting.length})</h4>
            ${waiting ? `<ul style="margin:0; padding-left:1.2rem; color:#111827; font-size:0.88rem;">${waiting}</ul>` : '<div style="color:#166534;">✅ Ninguno.</div>'}
            <p style="font-size:0.78rem; color:#9ca3af; margin-top:1rem;">"Tiempo medio" = desde el primer mensaje sin responder del cliente hasta la respuesta. Las respuestas enviadas desde la app de Instagram o Business Suite cuentan como "Fuera del CRM" (Meta no dice quién las envió).</p>`;
    } catch (err) {
        document.getElementById('inboxStatsBody').innerHTML = `<div style="color:#b91c1c;">❌ ${inboxEsc(err.message)}</div>`;
    }
};

window.inboxShowConnect = function() {
    document.getElementById('inboxConnectModal')?.remove();
    const c = document.getElementById('socialMediaContainer');
    c.insertAdjacentHTML('beforeend', `
        <div id="inboxConnectModal" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;">
            <div style="background:white; border-radius:10px; padding:1.5rem; width:92%; max-width:640px; max-height:88vh; overflow-y:auto;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0;">🔌 Conectar Facebook e Instagram</h3>
                    <button onclick="document.getElementById('inboxConnectModal').remove()" style="background:none; border:none; font-size:1.4rem; cursor:pointer;">✖</button>
                </div>
                <ol style="font-size:0.88rem; color:#374151; line-height:1.5;">
                    <li>Abre <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener">Graph API Explorer</a> con tu Facebook personal.</li>
                    <li>App de Meta: <b>Ciudad Bilingue CRM</b>. Usuario o página: <b>Token de usuario</b>.</li>
                    <li>Permisos (agrégalos todos en "Permissions"): <code>pages_show_list, pages_messaging, pages_manage_metadata, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_manage_messages, instagram_content_publish, business_management</code>.</li>
                    <li><b>Generate Access Token</b> → elige las dos páginas (logo y C morada) y el Instagram → copia el token y pégalo aquí.</li>
                </ol>
                <textarea id="inboxUserToken" rows="3" placeholder="Pega aquí el token (empieza por EAA…)" style="width:100%; padding:0.5rem; border:1px solid #e5e7eb; border-radius:8px; font-family:monospace; font-size:0.8rem;"></textarea>
                <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.75rem;">
                    <button class="btn" onclick="document.getElementById('inboxConnectModal').remove()" style="background:#e5e7eb;">Cancelar</button>
                    <button class="btn btn-primary" id="inboxConnectBtn" onclick="inboxConnect()">Conectar</button>
                </div>
                <div id="inboxConnectResult" style="margin-top:0.75rem; font-size:0.88rem;"></div>
            </div>
        </div>`);
};

window.inboxConnect = async function() {
    const token = document.getElementById('inboxUserToken')?.value.trim();
    const btn = document.getElementById('inboxConnectBtn');
    const out = document.getElementById('inboxConnectResult');
    if (!token) {
        out.innerHTML = Inbox.pages.length
            ? '<div style="color:#166534;">✅ Ya están conectadas: ' + Inbox.pages.map(p => inboxEsc(p.name)).join(', ') + '. Solo pega un token nuevo si quieres volver a conectar.</div>'
            : '<div style="color:#b45309;">Pega primero el token de Graph API Explorer.</div>';
        return;
    }
    btn.disabled = true;
    btn.textContent = '⏳ Conectando…';
    try {
        const r = await inboxApi('connect', { userToken: token });
        document.getElementById('inboxUserToken').value = '';
        out.innerHTML = `<div style="color:#166534;">✅ Conectado:</div><ul>${r.pages.map(p =>
            `<li>${inboxEsc(p.name)}${p.igUsername ? ` + Instagram @${inboxEsc(p.igUsername)}` : ''} ${p.subscribed ? '✅' : `⚠️ ${inboxEsc(p.subscribeError || '')}`}</li>`).join('')}</ul>
            ${r.skipped?.length ? `<div style="color:#6b7280;">No se conectaron (no son del colegio): ${r.skipped.map(inboxEsc).join(', ')}</div>` : ''}
            <div style="color:#6b7280;">Webhook: Facebook ${inboxEsc(r.appSubscriptions?.page)} · Instagram ${inboxEsc(r.appSubscriptions?.instagram)}</div>`;
        inboxRefresh(true);
    } catch (err) {
        out.innerHTML = `<div style="color:#b91c1c;">❌ ${inboxEsc(err.message)}</div>`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Conectar';
    }
};

// ── hooks ─────────────────────────────────────────────────────────────────

// Called by core.js switchTab('socialMedia') (name kept from social.js).
async function loadSocialMediaData() {
    if (!Inbox.rendered || !document.getElementById('inboxList')) inboxRenderShell();
    await inboxRefresh(!Inbox.since);
    inboxRenderHeader();
    inboxRenderList();
    if (!Inbox.pollTimer) {
        Inbox.pollTimer = setInterval(() => {
            if (inboxTabOpen() && document.visibilityState === 'visible') inboxRefresh();
        }, INBOX_POLL_MS);
    }
}
window.loadSocialMediaData = loadSocialMediaData;

// Background: keep the tab badge ("💬 Mensajes 3") current for anyone allowed.
document.addEventListener('DOMContentLoaded', () => {
    const start = setInterval(() => {
        if (!window.FirebaseData?.currentUser || !window.PermissionEnforcer?.userRole) return;
        clearInterval(start);
        if (!inboxCanUse()) return;
        inboxUpdateBadge();
        inboxRefresh(true);
        Inbox.badgeTimer = setInterval(() => {
            if (!inboxTabOpen() && document.visibilityState === 'visible') inboxRefresh();
        }, INBOX_BADGE_MS);
    }, 2000);
});

console.log('✅ inbox.js loaded — 💬 Mensajes (Facebook + Instagram) via TutorBox socialInbox');
