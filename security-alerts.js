// ==================== SECURITY-ALERTS.JS ====================
// In-app fraud alerts for the owner (anti-fraud Phase 4)
// - securityAlerts/{id}: write-once record of a blocked/suspicious action
//   (e.g. an employee tried to register a future-month payment or skip an
//   unpaid month). Staff clients create alerts; only admin/director read them.
// - A red badge + "🚨 Alertas" panel surfaces unseen alerts when the owner
//   logs in. Owner marks them reviewed (admin/director only).
// ============================================================

class SecurityAlertsManagerClass {
    constructor() {
        this.alerts = new Map();
        this.loaded = false;
    }

    isAlertsAdmin() {
        const email = window.FirebaseData?.currentUser?.email;
        const role = window.userRole;
        return email === 'admin@ciudadbilingue.com' || role === 'admin' || role === 'director';
    }

    // Record a blocked/suspicious action. Never throws — must not break the
    // action that triggered it.
    async log(type, message, context = {}) {
        try {
            const db = window.firebaseModules.database;
            const id = `ALERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const alert = {
                type,                       // 'future-month' | 'skip-month' | 'valor-change' | 'other'
                message,
                studentId: context.studentId || null,
                studentName: context.studentName || null,
                attemptedMonth: context.attemptedMonth || null,
                attemptedYear: context.attemptedYear || null,
                pendingMonth: context.pendingMonth || null,
                pendingMonthName: context.pendingMonthName || null,
                pendingMonthIndex: context.pendingMonthIndex !== undefined ? context.pendingMonthIndex : null,
                pendingYear: context.pendingYear || null,
                byUid: window.FirebaseData?.currentUser?.uid || null,
                byEmail: window.FirebaseData?.currentUser?.email || null,
                createdAt: new Date().toISOString(),
                seen: false
            };
            await db.set(db.ref(window.FirebaseData.database, `securityAlerts/${id}`), alert);
            console.warn('🚨 Security alert logged:', type, message);

            // Also mirror into the immutable audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit('Alerta de seguridad', 'security', id, message, { after: alert });
            }
        } catch (error) {
            console.error('❌ Could not log security alert:', error);
        }
    }

    async loadAlerts() {
        try {
            const db = window.firebaseModules.database;
            const snap = await db.get(db.ref(window.FirebaseData.database, 'securityAlerts'));
            this.alerts.clear();
            if (snap.exists()) {
                Object.entries(snap.val()).forEach(([id, a]) => this.alerts.set(id, { id, ...a }));
            }
            this.loaded = true;
        } catch (error) {
            console.error('❌ Error loading security alerts:', error);
        }
        return this.alerts;
    }

    unseenCount() {
        let n = 0;
        this.alerts.forEach(a => { if (!a.seen) n++; });
        return n;
    }

    // Show a red badge on the Pagos "Alertas" button by refreshing count
    async refreshBadge() {
        if (!this.isAlertsAdmin()) return;
        await this.loadAlerts();
        const btn = document.getElementById('securityAlertsBtn');
        if (!btn) return;
        const count = this.unseenCount();
        btn.innerHTML = count > 0
            ? `🚨 Alertas <span style="background:#fff;color:#dc2626;border-radius:10px;padding:0 6px;font-weight:700;">${count}</span>`
            : '🚨 Alertas';
        btn.style.background = count > 0 ? '#dc2626' : '#6b7280';
    }

    async showPanel() {
        if (!this.isAlertsAdmin()) {
            window.showNotification('🚫 Solo administración puede ver las alertas', 'error');
            return;
        }
        await this.loadAlerts();
        if (window.PaymentExceptionsManager) await window.PaymentExceptionsManager.load();

        const TYPE_LABEL = {
            'future-month': '📅 Pago de mes futuro',
            'skip-month': '⏭️ Saltó un mes pendiente',
            'valor-change': '💲 Cambio de valor',
            'bank-mismatch': '🏦 Consignación no encontrada',
            'cesantias-created': '📋 Factura por cesantías',
            'cesantias-rejected': '📋 Cesantías rechazadas',
            'other': '⚠️ Otro'
        };

        const alerts = Array.from(this.alerts.values())
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        const rows = alerts.map(a => `
            <tr style="border-bottom: 1px solid #e5e7eb; ${a.seen ? 'opacity: 0.55;' : 'background: #fef2f2;'}">
                <td style="padding: 8px; white-space: nowrap; font-size: 0.75rem;">${(a.createdAt || '').replace('T', ' ').slice(0, 16)}</td>
                <td style="padding: 8px;">${TYPE_LABEL[a.type] || a.type}</td>
                <td style="padding: 8px;">${a.studentName || a.studentId || '—'}</td>
                <td style="padding: 8px; font-size: 0.85rem;">${a.message}</td>
                <td style="padding: 8px; font-size: 0.75rem; color: #6b7280;">${a.byEmail || '—'}</td>
                <td style="padding: 8px; white-space: nowrap;">
                    ${a.seen ? '<span style="color:#16a34a;">✓ Revisada</span>'
                        : `${a.type === 'skip-month' && this.pendingMonthOf(a) && a.studentId
                            ? `<button onclick="window.SecurityAlertsManager.authorizeFromAlert('${a.id}')" class="btn btn-sm" style="background:#2563eb;color:white;padding:2px 8px;font-size:0.7rem;" title="Exonerar el mes pendiente para que los empleados puedan registrar el pago">✅ Autorizar</button> `
                            : ''}<button onclick="window.SecurityAlertsManager.markSeen('${a.id}')" class="btn btn-sm" style="background:#16a34a;color:white;padding:2px 8px;font-size:0.7rem;">Marcar revisada</button>`}
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="padding:16px;text-align:center;color:#6b7280;">No hay alertas 🎉</td></tr>';

        const html = `
            <div id="securityAlertsModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div style="background: white; border-radius: 12px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">🚨 Alertas de Seguridad</h3>
                        <button onclick="document.getElementById('securityAlertsModal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">✕</button>
                    </div>
                    <p style="font-size: 0.85rem; color: #6b7280; margin-top: 0;">
                        Intentos bloqueados por el sistema: pagos de meses futuros o pagos que saltan un mes pendiente. Revisa cada uno con el empleado que lo intentó.
                    </p>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                            <thead>
                                <tr style="background: #f3f4f6; text-align: left;">
                                    <th style="padding: 8px;">Fecha</th>
                                    <th style="padding: 8px;">Tipo</th>
                                    <th style="padding: 8px;">Estudiante</th>
                                    <th style="padding: 8px;">Detalle</th>
                                    <th style="padding: 8px;">Empleado</th>
                                    <th style="padding: 8px;"></th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                    ${this.renderExceptionsSection()}
                </div>
            </div>
        `;

        document.getElementById('securityAlertsModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', html);
    }

    // Active skip-month exceptions, shown below the alerts so the owner can
    // review/revoke what has been exonerated.
    renderExceptionsSection() {
        const pem = window.PaymentExceptionsManager;
        if (!pem || pem.map.size === 0) return '';
        const rows = Array.from(pem.map.values())
            .sort((a, b) => (b.grantedAt || '').localeCompare(a.grantedAt || ''))
            .map(ex => {
                const name = ex.studentName || window.StudentManager?.students?.get(ex.studentId)?.nombre || ex.studentId;
                return `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 6px 8px;">${name}</td>
                    <td style="padding: 6px 8px;">${ex.month} ${ex.year}</td>
                    <td style="padding: 6px 8px; font-size: 0.8rem;">${ex.reason || '—'}</td>
                    <td style="padding: 6px 8px; font-size: 0.75rem; color: #6b7280;">${ex.grantedBy || '—'} · ${(ex.grantedAt || '').slice(0, 10)}</td>
                    <td style="padding: 6px 8px;">
                        <button onclick="window.SecurityAlertsManager.revokeException('${ex.studentId}', '${ex.key}')" class="btn btn-sm" style="background:#dc2626;color:white;padding:2px 8px;font-size:0.7rem;">Revocar</button>
                    </td>
                </tr>`;
            }).join('');
        return `
            <h4 style="margin: 1.5rem 0 0.5rem;">✅ Excepciones activas (meses exonerados)</h4>
            <p style="font-size: 0.8rem; color: #6b7280; margin-top: 0;">
                Estos meses no cuentan como pendientes: los empleados pueden registrar pagos de meses siguientes para estos estudiantes.
            </p>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                    <thead>
                        <tr style="background: #f3f4f6; text-align: left;">
                            <th style="padding: 6px 8px;">Estudiante</th>
                            <th style="padding: 6px 8px;">Mes exonerado</th>
                            <th style="padding: 6px 8px;">Motivo</th>
                            <th style="padding: 6px 8px;">Autorizó</th>
                            <th style="padding: 6px 8px;"></th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    // Resolve the pending month of a skip-month alert to {monthIndex, year,
    // monthName}. Older alerts only stored the "abril 2026" display string.
    pendingMonthOf(alert) {
        if (alert.pendingMonthIndex !== null && alert.pendingMonthIndex !== undefined && alert.pendingYear) {
            return { monthIndex: alert.pendingMonthIndex, year: alert.pendingYear, monthName: alert.pendingMonthName };
        }
        const MONTHS = ['enero','febrero','marzo','abril','mayo','junio',
                        'julio','agosto','septiembre','octubre','noviembre','diciembre'];
        const m = String(alert.pendingMonth || '').trim().toLowerCase().match(/^([a-zñ]+)\s+(\d{4})$/);
        if (!m) return null;
        const idx = MONTHS.indexOf(m[1]);
        if (idx === -1) return null;
        return { monthIndex: idx, year: Number(m[2]), monthName: m[1] };
    }

    // "Autorizar" on a skip-month alert: exonerate the pending month for that
    // student so staff can register later months.
    async authorizeFromAlert(alertId) {
        const alert = this.alerts.get(alertId);
        const pem = window.PaymentExceptionsManager;
        if (!alert || !pem) return;
        const pending = this.pendingMonthOf(alert);
        if (!pending || !alert.studentId) {
            window.showNotification('❌ No se pudo identificar el mes pendiente de esta alerta', 'error');
            return;
        }
        if (!confirm(`¿Exonerar ${pending.monthName} ${pending.year} para ${alert.studentName || alert.studentId}?\n\nLos empleados podrán registrar pagos de meses siguientes.`)) return;
        const reason = prompt('Motivo de la excepción:') || '';
        const granted = await pem.grant(alert.studentId, pending.monthIndex, pending.year, pending.monthName, reason);
        if (granted) await this.markSeen(alertId);
    }

    async revokeException(studentId, key) {
        const pem = window.PaymentExceptionsManager;
        if (!pem) return;
        if (!confirm('¿Revocar esta excepción? El mes volverá a contar como pendiente.')) return;
        await pem.revoke(studentId, key);
        this.showPanel();
    }

    async markSeen(alertId) {
        if (!this.isAlertsAdmin()) return;
        try {
            const db = window.firebaseModules.database;
            await db.update(db.ref(window.FirebaseData.database, `securityAlerts/${alertId}`), {
                seen: true,
                seenBy: window.FirebaseData?.currentUser?.email || 'unknown',
                seenAt: new Date().toISOString()
            });
            const a = this.alerts.get(alertId);
            if (a) a.seen = true;
            this.showPanel();
            this.refreshBadge();
        } catch (error) {
            console.error('❌ Error marking alert seen:', error);
        }
    }
}

window.SecurityAlertsManager = new SecurityAlertsManagerClass();
window.logSecurityAlert = (type, message, context) => window.SecurityAlertsManager.log(type, message, context);
console.log('🚨 Security alerts module loaded');
