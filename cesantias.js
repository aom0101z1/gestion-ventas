// ==================== CESANTIAS.JS ====================
// Pago por Cesantías: the guardian pays tuition with their cesantías fund
// (Porvenir/Protección/Colfondos/FNA). The school hands them the invoice +
// RUT copy, they file it with the fund, and IF approved the fund wires the
// money 1-3+ weeks later. Until then the payment is a receivable:
// - payments records carry cesantiasStatus:'pending' → excluded from cash
//   closure / revenue reports until received; month shows 📋 badge.
// - cesantias/{id}: tracking record (fund, docs delivered, weeks waiting).
//   Staff can create (append-only); resolving = admin/director only (rules).
// - Owner gets an immediate security alert on creation, a permanent badge,
//   and a weekly in-app reminder while anything is pending.
// =======================================================

class CesantiasManagerClass {
    constructor() {
        this.records = new Map();
        this.loaded = false;
    }

    isCesantiasAdmin() {
        const email = window.FirebaseData?.currentUser?.email;
        const role = window.userRole;
        return email === 'admin@ciudadbilingue.com' || role === 'admin' || role === 'director';
    }

    async load() {
        try {
            const db = window.firebaseModules.database;
            const snap = await db.get(db.ref(window.FirebaseData.database, 'cesantias'));
            this.records.clear();
            if (snap.exists()) {
                Object.entries(snap.val()).forEach(([id, r]) => this.records.set(id, { id, ...r }));
            }
            this.loaded = true;
        } catch (error) {
            console.error('❌ Error loading cesantías:', error);
        }
        return this.records;
    }

    pending() {
        return Array.from(this.records.values())
            .filter(r => r.status === 'pending')
            .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    }

    weeksWaiting(record) {
        const created = new Date(record.createdAt || Date.now());
        return Math.floor((Date.now() - created.getTime()) / (7 * 24 * 60 * 60 * 1000));
    }

    // Called from processPayment right after the invoice is generated.
    // Never throws — the payment itself already succeeded.
    async createFromPayment({ studentId, studentName, amount, fondo, invoiceNumber, paymentIds, monthsLabel, paymentType }) {
        try {
            const db = window.firebaseModules.database;
            const id = `CES-${Date.now()}`;
            const record = {
                id,
                studentId,
                studentName: studentName || null,
                amount: Number(amount) || 0,
                fondo: fondo || 'Otro',
                invoiceNumber: invoiceNumber || null,
                paymentIds: paymentIds || [],
                monthsLabel: monthsLabel || '',
                paymentType: paymentType || 'monthly',
                status: 'pending',
                facturaEntregada: false,
                rutEntregado: false,
                createdAt: new Date().toISOString(),
                createdBy: window.FirebaseData?.currentUser?.email || 'unknown',
                lastReminderAt: null
            };
            await db.set(db.ref(window.FirebaseData.database, `cesantias/${id}`), record);
            this.records.set(id, record);

            if (typeof window.logSecurityAlert === 'function') {
                await window.logSecurityAlert(
                    'cesantias-created',
                    `Factura por CESANTÍAS creada: ${record.studentName || studentId} - $${record.amount.toLocaleString('es-CO')} (${record.fondo})${invoiceNumber ? ` - Factura ${invoiceNumber}` : ''}. El dinero queda EN TRÁMITE hasta que el fondo consigne.`,
                    { studentId, studentName: record.studentName }
                );
            }
            if (typeof window.logAudit === 'function') {
                await window.logAudit('Pago por cesantías creado', 'cesantias', id,
                    `${record.studentName || studentId} - $${record.amount.toLocaleString('es-CO')} - ${record.fondo}`, { after: record });
            }
            this.refreshBadge();
        } catch (error) {
            console.error('❌ Error creating cesantías record:', error);
        }
    }

    async setDocDelivered(id, field, value) {
        if (!this.isCesantiasAdmin()) return;
        try {
            const db = window.firebaseModules.database;
            await db.update(db.ref(window.FirebaseData.database, `cesantias/${id}`), { [field]: value });
            const r = this.records.get(id);
            if (r) r[field] = value;
        } catch (error) {
            console.error('❌ Error updating cesantías doc flag:', error);
        }
    }

    async markReceived(id) {
        if (!this.isCesantiasAdmin()) return;
        const r = this.records.get(id);
        if (!r) return;
        const bank = prompt('¿A qué cuenta llegó el dinero? (Bancolombia / Nequi / Otro)', 'Bancolombia');
        if (bank === null) return;
        const date = prompt('Fecha en que llegó (YYYY-MM-DD):', window.getLocalDate());
        if (date === null) return;
        try {
            const db = window.firebaseModules.database;
            const updates = {
                status: 'received',
                receivedBank: bank || 'Otro',
                receivedDate: date || window.getLocalDate(),
                resolvedBy: window.FirebaseData?.currentUser?.email || 'unknown',
                resolvedAt: new Date().toISOString()
            };
            await db.update(db.ref(window.FirebaseData.database, `cesantias/${id}`), updates);
            Object.assign(r, updates);

            // Mark the payment records as real income (reports start counting them)
            for (const pid of (r.paymentIds || [])) {
                await db.update(db.ref(window.FirebaseData.database, `payments/${pid}`), { cesantiasStatus: 'received' });
                const p = window.PaymentManager?.payments?.get(pid);
                if (p) p.cesantiasStatus = 'received';
            }
            if (typeof window.logAudit === 'function') {
                await window.logAudit('Cesantías recibidas', 'cesantias', id,
                    `${r.studentName || r.studentId} - $${(r.amount || 0).toLocaleString('es-CO')} llegó a ${updates.receivedBank} el ${updates.receivedDate}`, { after: updates });
            }
            window.showNotification('✅ Cesantías marcadas como recibidas. Aparecerán en 🏦 Bancos para cruzar con el extracto.', 'success');
            this.showPanel();
            this.refreshBadge();
        } catch (error) {
            console.error('❌ Error marking cesantías received:', error);
            window.showNotification('❌ Error al marcar como recibido', 'error');
        }
    }

    async markRejected(id) {
        // Rejection voids payment records — payments rules only allow the
        // superadmin to do that, so gate it here too.
        const email = window.FirebaseData?.currentUser?.email;
        if (email !== 'admin@ciudadbilingue.com' && window.userRole !== 'admin') {
            window.showNotification('🚫 Solo el superadmin puede registrar un rechazo (anula los pagos asociados)', 'error');
            return;
        }
        const r = this.records.get(id);
        if (!r) return;
        if (!confirm(`¿El fondo RECHAZÓ las cesantías de ${r.studentName || r.studentId}?\n\nLos pagos asociados se ANULAN y los meses vuelven a quedar pendientes — el acudiente debe pagar por otro medio.`)) return;
        const reason = prompt('Motivo del rechazo:') || '';
        try {
            const db = window.firebaseModules.database;
            const updates = {
                status: 'rejected',
                rejectReason: reason,
                resolvedBy: window.FirebaseData?.currentUser?.email || 'unknown',
                resolvedAt: new Date().toISOString()
            };
            await db.update(db.ref(window.FirebaseData.database, `cesantias/${id}`), updates);
            Object.assign(r, updates);

            // Cancel the payment records so the months read as unpaid again
            for (const pid of (r.paymentIds || [])) {
                await db.update(db.ref(window.FirebaseData.database, `payments/${pid}`), {
                    status: 'cancelled', cesantiasStatus: 'rejected',
                    cancelReason: `Cesantías rechazadas: ${reason}`
                });
                window.PaymentManager?.payments?.delete(pid);
            }
            if (typeof window.logSecurityAlert === 'function') {
                await window.logSecurityAlert('cesantias-rejected',
                    `Cesantías RECHAZADAS: ${r.studentName || r.studentId} - $${(r.amount || 0).toLocaleString('es-CO')}. Pagos anulados, meses vuelven a pendiente. ${reason}`,
                    { studentId: r.studentId, studentName: r.studentName });
            }
            if (typeof window.logAudit === 'function') {
                await window.logAudit('Cesantías rechazadas', 'cesantias', id,
                    `${r.studentName || r.studentId} - ${reason}`, { after: updates });
            }
            window.showNotification('❌ Cesantías rechazadas. Los meses quedaron pendientes de pago.', 'warning');
            this.showPanel();
            this.refreshBadge();
        } catch (error) {
            console.error('❌ Error marking cesantías rejected:', error);
            window.showNotification('❌ Error al marcar rechazo', 'error');
        }
    }

    async refreshBadge() {
        if (!this.isCesantiasAdmin()) return;
        if (!this.loaded) await this.load();
        const btn = document.getElementById('cesantiasBtn');
        if (!btn) return;
        const n = this.pending().length;
        btn.innerHTML = n > 0
            ? `📋 Cesantías <span style="background:#fff;color:#7c3aed;border-radius:10px;padding:0 6px;font-weight:700;">${n}</span>`
            : '📋 Cesantías';
        btn.style.background = n > 0 ? '#7c3aed' : '#6b7280';
    }

    async showPanel() {
        if (!this.isCesantiasAdmin()) {
            window.showNotification('🚫 Solo administración puede ver las cesantías', 'error');
            return;
        }
        await this.load();
        const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-CO');

        const pendingRows = this.pending().map(r => {
            const weeks = this.weeksWaiting(r);
            const weekColor = weeks >= 3 ? '#dc2626' : weeks >= 2 ? '#f59e0b' : '#6b7280';
            return `
            <tr style="border-bottom: 1px solid #e5e7eb; ${weeks >= 3 ? 'background: #fef2f2;' : ''}">
                <td style="padding: 8px; white-space: nowrap; font-size: 0.8rem;">${(r.createdAt || '').slice(0, 10)}</td>
                <td style="padding: 8px;">${r.studentName || r.studentId}<br><small style="color:#6b7280;">${r.monthsLabel || ''}</small></td>
                <td style="padding: 8px;">${r.fondo || '—'}</td>
                <td style="padding: 8px; font-size: 0.8rem;">${r.invoiceNumber || '—'}</td>
                <td style="padding: 8px; text-align: right; font-weight: 600;">${fmt(r.amount)}</td>
                <td style="padding: 8px; text-align: center; color: ${weekColor}; font-weight: 700;">${weeks} sem</td>
                <td style="padding: 8px; white-space: nowrap; font-size: 0.8rem;">
                    <label style="display:block;"><input type="checkbox" ${r.facturaEntregada ? 'checked' : ''} onchange="window.CesantiasManager.setDocDelivered('${r.id}','facturaEntregada',this.checked)"> Factura</label>
                    <label style="display:block;"><input type="checkbox" ${r.rutEntregado ? 'checked' : ''} onchange="window.CesantiasManager.setDocDelivered('${r.id}','rutEntregado',this.checked)"> Copia RUT</label>
                </td>
                <td style="padding: 8px; white-space: nowrap;">
                    <button onclick="window.CesantiasManager.markReceived('${r.id}')" class="btn btn-sm" style="background:#16a34a;color:white;padding:2px 8px;font-size:0.7rem;">✅ Recibido</button>
                    <button onclick="window.CesantiasManager.markRejected('${r.id}')" class="btn btn-sm" style="background:#dc2626;color:white;padding:2px 8px;font-size:0.7rem;">❌ Rechazado</button>
                </td>
            </tr>`;
        }).join('') || '<tr><td colspan="8" style="padding:16px;text-align:center;color:#6b7280;">No hay cesantías en trámite 🎉</td></tr>';

        const resolved = Array.from(this.records.values())
            .filter(r => r.status !== 'pending')
            .sort((a, b) => (b.resolvedAt || '').localeCompare(a.resolvedAt || ''))
            .slice(0, 20)
            .map(r => `
            <tr style="border-bottom: 1px solid #e5e7eb; opacity: 0.7;">
                <td style="padding: 6px 8px; font-size: 0.8rem;">${(r.createdAt || '').slice(0, 10)}</td>
                <td style="padding: 6px 8px;">${r.studentName || r.studentId}</td>
                <td style="padding: 6px 8px; text-align: right;">${fmt(r.amount)}</td>
                <td style="padding: 6px 8px;">${r.status === 'received'
                    ? `<span style="color:#16a34a;">✅ Recibido ${r.receivedDate || ''} (${r.receivedBank || ''})</span>`
                    : `<span style="color:#dc2626;">❌ Rechazado</span> <small>${r.rejectReason || ''}</small>`}</td>
            </tr>`).join('');

        const totalPending = this.pending().reduce((s, r) => s + (Number(r.amount) || 0), 0);

        document.getElementById('cesantiasModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', `
            <div id="cesantiasModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div style="background: white; border-radius: 12px; max-width: 1000px; width: 100%; max-height: 92vh; overflow-y: auto; padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h3 style="margin: 0;">📋 Pagos por Cesantías</h3>
                        <button onclick="document.getElementById('cesantiasModal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">✕</button>
                    </div>
                    <p style="font-size: 0.85rem; color: #6b7280; margin-top: 0;">
                        Dinero facturado que el fondo de cesantías aún no ha consignado. Entregue al acudiente la <strong>factura</strong> y la <strong>copia del RUT</strong> y marque los checkboxes. Cuando la plata llegue a su cuenta use ✅ Recibido — pasará a 🏦 Bancos para cruzarla con el extracto.
                    </p>
                    <div style="background: #f5f3ff; border: 1px solid #8b5cf6; border-radius: 8px; padding: 0.6rem 1rem; margin-bottom: 1rem; display: inline-block;">
                        <strong style="color: #7c3aed;">En trámite: ${fmt(totalPending)}</strong> (${this.pending().length} facturas)
                    </div>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                            <thead>
                                <tr style="background: #f3f4f6; text-align: left;">
                                    <th style="padding: 8px;">Fecha</th><th style="padding: 8px;">Estudiante</th>
                                    <th style="padding: 8px;">Fondo</th><th style="padding: 8px;">Factura</th>
                                    <th style="padding: 8px; text-align: right;">Monto</th><th style="padding: 8px;">Espera</th>
                                    <th style="padding: 8px;">Docs</th><th style="padding: 8px;"></th>
                                </tr>
                            </thead>
                            <tbody>${pendingRows}</tbody>
                        </table>
                    </div>
                    ${resolved ? `
                    <h4 style="margin: 1.5rem 0 0.5rem;">Historial reciente</h4>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;"><tbody>${resolved}</tbody></table>
                    </div>` : ''}
                </div>
            </div>
        `);
    }

    // Weekly reminder: once per week per pending record, shown when the owner
    // logs in / opens the CRM. lastReminderAt is stamped so every admin
    // session doesn't re-nag.
    async weeklyReminderCheck() {
        if (!this.isCesantiasAdmin()) return;
        await this.load();
        const now = Date.now();
        const week = 7 * 24 * 60 * 60 * 1000;
        const due = this.pending().filter(r =>
            !r.lastReminderAt || (now - new Date(r.lastReminderAt).getTime()) >= week);
        if (due.length === 0) return;

        const lines = due.map(r =>
            `• ${r.studentName || r.studentId}: $${Number(r.amount || 0).toLocaleString('es-CO')} (${r.fondo}) — ${this.weeksWaiting(r)} semana(s) esperando`).join('<br>');
        document.getElementById('cesantiasReminderBanner')?.remove();
        document.body.insertAdjacentHTML('beforeend', `
            <div id="cesantiasReminderBanner" style="position: fixed; top: 70px; right: 16px; z-index: 9999; max-width: 420px; background: #f5f3ff; border: 2px solid #7c3aed; border-radius: 10px; padding: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: #7c3aed;">📋 Cesantías por cruzar</strong>
                    <button onclick="document.getElementById('cesantiasReminderBanner').remove()" style="background:none;border:none;font-size:1.1rem;cursor:pointer;">✕</button>
                </div>
                <div style="font-size: 0.85rem; margin: 0.5rem 0;">${lines}</div>
                <button onclick="document.getElementById('cesantiasReminderBanner').remove(); window.CesantiasManager.showPanel();" class="btn btn-sm" style="background:#7c3aed;color:white;padding:4px 12px;">Ver panel</button>
            </div>
        `);

        const db = window.firebaseModules.database;
        const stamp = new Date().toISOString();
        for (const r of due) {
            try {
                await db.update(db.ref(window.FirebaseData.database, `cesantias/${r.id}`), { lastReminderAt: stamp });
                r.lastReminderAt = stamp;
            } catch (e) { /* reminder stamping is best-effort */ }
        }
    }
}

window.CesantiasManager = new CesantiasManagerClass();

// Run the weekly reminder once the session is authenticated and the role is
// known (no hard login hook exists — poll briefly after load).
(function scheduleCesantiasReminder() {
    let tries = 0;
    const timer = setInterval(() => {
        tries++;
        if (window.FirebaseData?.currentUser && window.userRole) {
            clearInterval(timer);
            window.CesantiasManager.weeklyReminderCheck();
        } else if (tries > 40) {
            clearInterval(timer);
        }
    }, 3000);
})();

console.log('📋 Cesantías module loaded');
