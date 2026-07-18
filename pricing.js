// ==================== PRICING.JS ====================
// Official price list + promotions (anti-fraud Phase 2)
// - priceList/  : official prices (matricula, certificado) set by admin/director only
// - promotions/ : promo codes with validity windows, created by admin/director only
// Employees can no longer free-type Matrícula/Certificado prices; discounts
// require selecting an active promotion, and every payment stores listPrice
// vs charged price + promoId for later reporting.
// ====================================================

class PricingManagerClass {
    constructor() {
        this.priceList = {};
        this.promotions = new Map();
        this.loaded = false;
    }

    isPricingAdmin() {
        const email = window.FirebaseData?.currentUser?.email;
        const role = window.userRole;
        return email === 'admin@ciudadbilingue.com' || role === 'admin' || role === 'director';
    }

    async init() {
        try {
            const db = window.firebaseModules.database;

            const priceSnap = await db.get(db.ref(window.FirebaseData.database, 'priceList'));
            this.priceList = priceSnap.exists() ? priceSnap.val() : {};

            const promoSnap = await db.get(db.ref(window.FirebaseData.database, 'promotions'));
            this.promotions.clear();
            if (promoSnap.exists()) {
                Object.entries(promoSnap.val()).forEach(([id, promo]) => {
                    this.promotions.set(id, { id, ...promo });
                });
            }

            this.loaded = true;
            console.log(`💲 Pricing loaded: ${Object.keys(this.priceList).length} precios, ${this.promotions.size} promociones`);
        } catch (error) {
            console.error('❌ Error loading pricing:', error);
            // Do not block payments if pricing fails to load
            this.loaded = false;
        }
        return this.loaded;
    }

    // List price for a concept ('matricula' | 'certificado'), or null if not configured
    getListPrice(concept) {
        const value = Number(this.priceList?.[concept]) || 0;
        return value > 0 ? value : null;
    }

    // Active promotions applicable to a concept
    // appliesTo: 'matricula' | 'certificado' | 'mensualidad' | 'libro' | 'cualquiera'
    getActivePromos(appliesTo) {
        const today = window.getTodayInColombia ? window.getTodayInColombia() : new Date().toISOString().split('T')[0];
        const result = [];
        this.promotions.forEach(promo => {
            if (!promo.active) return;
            if (promo.appliesTo !== appliesTo && promo.appliesTo !== 'cualquiera') return;
            if (promo.validFrom && today < promo.validFrom) return;
            if (promo.validTo && today > promo.validTo) return;
            result.push(promo);
        });
        return result;
    }

    // Final price after applying a promo to a list price
    promoPrice(listPrice, promo) {
        if (!promo) return listPrice;
        if (promo.type === 'gratis') return 0;
        if (promo.type === 'porcentaje') return Math.round(listPrice * (100 - Number(promo.value)) / 100);
        if (promo.type === 'precio_fijo') return Number(promo.value) || 0;
        return listPrice;
    }

    promoLabel(promo) {
        if (promo.type === 'gratis') return `${promo.name} (GRATIS)`;
        if (promo.type === 'porcentaje') return `${promo.name} (-${promo.value}%)`;
        if (promo.type === 'precio_fijo') return `${promo.name} ($${Number(promo.value).toLocaleString('es-CO')})`;
        return promo.name;
    }

    // ============ PAYMENT FORM HOOKS ============

    // Called when Matrícula/Certificado checkbox toggles.
    // Fills the (readonly) amount from the official price and populates the promo select.
    onItemToggle(kind) {
        const check = document.getElementById(kind === 'matricula' ? 'includeMatricula' : 'includeCertificado');
        const input = document.getElementById(kind === 'matricula' ? 'matriculaAmount' : 'certificadoAmount');
        const select = document.getElementById(kind === 'matricula' ? 'matriculaPromoSelect' : 'certificadoPromoSelect');
        if (!check || !input) return;

        const listPrice = this.getListPrice(kind);

        if (check.checked) {
            if (listPrice !== null) {
                // Official price exists: lock the field
                input.readOnly = true;
                input.value = listPrice;
                if (select) {
                    select.style.display = 'block';
                    select.innerHTML = '<option value="">Sin promoción (precio de lista)</option>' +
                        this.getActivePromos(kind).map(p =>
                            `<option value="${p.id}">${this.promoLabel(p)}</option>`
                        ).join('');
                    select.value = '';
                }
            } else {
                // Price not configured yet: legacy free entry, flagged as unvalidated
                input.readOnly = false;
                if (select) select.style.display = 'none';
                window.showNotification(`⚠️ Precio oficial de ${kind} no configurado. Pídele al administrador configurarlo en 💲 Precios`, 'warning');
            }
        } else {
            if (select) { select.style.display = 'none'; select.value = ''; }
        }
    }

    // Called when a promo is selected for Matrícula/Certificado
    applyItemPromo(kind) {
        const input = document.getElementById(kind === 'matricula' ? 'matriculaAmount' : 'certificadoAmount');
        const select = document.getElementById(kind === 'matricula' ? 'matriculaPromoSelect' : 'certificadoPromoSelect');
        const listPrice = this.getListPrice(kind);
        if (!input || listPrice === null) return;

        const promo = select?.value ? this.promotions.get(select.value) : null;
        input.value = this.promoPrice(listPrice, promo);
        if (typeof window.updatePaymentTotal === 'function') window.updatePaymentTotal();
    }

    // Expected base tuition: student.valor × number of months (null if not computable)
    expectedBase(student, monthCount) {
        const valor = Number(student?.valor) || 0;
        if (valor <= 0 || monthCount <= 0) return null;
        return valor * monthCount;
    }

    // Auto-fill base amount from student.valor × months (called from updateMonthSelection)
    autoFillBase(student, monthCount) {
        const input = document.getElementById('payAmountBase');
        const hint = document.getElementById('basePriceHint');
        const select = document.getElementById('basePromoSelect');
        if (!input) return;

        const expected = this.expectedBase(student, monthCount);
        if (expected === null) {
            if (hint) hint.innerHTML = '⚠️ Este estudiante no tiene valor mensual configurado — el monto no será validado';
            return;
        }

        const promo = select?.value ? this.promotions.get(select.value) : null;
        const final = this.promoPrice(expected, promo);
        input.value = '$' + final.toLocaleString('es-CO');
        if (hint) {
            hint.innerHTML = promo
                ? `Precio lista: $${expected.toLocaleString('es-CO')} → con ${promo.name}: <strong>$${final.toLocaleString('es-CO')}</strong>`
                : `Precio lista: $${Number(student.valor).toLocaleString('es-CO')} × ${monthCount} mes(es) = <strong>$${expected.toLocaleString('es-CO')}</strong>`;
        }
        if (typeof window.updatePaymentTotal === 'function') window.updatePaymentTotal();
    }

    populateBasePromoSelect() {
        const select = document.getElementById('basePromoSelect');
        if (!select) return;
        select.innerHTML = '<option value="">Sin promoción</option>' +
            this.getActivePromos('mensualidad').map(p =>
                `<option value="${p.id}">${this.promoLabel(p)}</option>`
            ).join('');
    }

    applyBasePromo() {
        const student = window.StudentManager?.students.get(window.currentStudentId);
        const monthCount = document.querySelectorAll('.month-checkbox:checked').length;
        this.autoFillBase(student, monthCount);
    }

    // Validate amounts on submit and build the pricing metadata stored on the payment.
    // Returns { ok, error, meta }
    buildPricingMeta({ student, monthCount, baseAmount, matriculaChecked, matriculaAmount, certificadoChecked, certificadoAmount, otroChecked, otroConcepto, otroAmount }) {
        const meta = {
            validated: true,
            base: null,
            items: {},
            registeredByEmail: window.FirebaseData?.currentUser?.email || null
        };

        // --- Base tuition ---
        const expected = this.expectedBase(student, monthCount);
        const basePromoSelect = document.getElementById('basePromoSelect');
        const basePromo = basePromoSelect?.value ? this.promotions.get(basePromoSelect.value) : null;
        const partialCheck = document.getElementById('partialPaymentCheck');

        if (expected !== null) {
            const required = this.promoPrice(expected, basePromo);
            meta.base = {
                listTotal: expected,
                valorMensual: Number(student.valor),
                months: monthCount,
                charged: baseAmount,
                required: required,
                promoId: basePromo?.id || null,
                promoName: basePromo?.name || null,
                partial: false
            };
            if (baseAmount < required) {
                if (partialCheck?.checked) {
                    meta.base.partial = true;
                } else if (baseAmount > 0 || (!matriculaChecked && !certificadoChecked && !otroChecked)) {
                    const promoTxt = basePromo ? ` (con ${basePromo.name})` : '';
                    return {
                        ok: false,
                        error: `El monto es menor al precio de lista${promoTxt}: se esperaba $${required.toLocaleString('es-CO')}. Seleccione una promoción válida o marque "Abono / Pago parcial".`
                    };
                }
            }
        } else if (baseAmount > 0) {
            meta.validated = false; // no valor configured — cannot validate
            meta.base = { listTotal: null, months: monthCount, charged: baseAmount, promoId: basePromo?.id || null, promoName: basePromo?.name || null, partial: false };
        }

        // --- Matrícula / Certificado ---
        for (const kind of ['matricula', 'certificado']) {
            const checked = kind === 'matricula' ? matriculaChecked : certificadoChecked;
            const charged = kind === 'matricula' ? matriculaAmount : certificadoAmount;
            if (!checked) continue;

            const listPrice = this.getListPrice(kind);
            const select = document.getElementById(kind === 'matricula' ? 'matriculaPromoSelect' : 'certificadoPromoSelect');
            const promo = select?.value ? this.promotions.get(select.value) : null;

            if (listPrice !== null) {
                const allowed = this.promoPrice(listPrice, promo);
                if (charged !== allowed) {
                    const label = kind === 'matricula' ? 'Matrícula' : 'Certificado';
                    return {
                        ok: false,
                        error: `El valor de ${label} ($${charged.toLocaleString('es-CO')}) no coincide con el precio oficial${promo ? ' con la promoción seleccionada' : ''} ($${allowed.toLocaleString('es-CO')}).`
                    };
                }
                meta.items[kind] = { listPrice, charged, promoId: promo?.id || null, promoName: promo?.name || null };
            } else {
                meta.validated = false;
                meta.items[kind] = { listPrice: null, charged, promoId: null, promoName: null };
            }
        }

        // --- Otro (free concept, always flagged for review) ---
        if (otroChecked && otroAmount > 0) {
            meta.items.otro = { concepto: otroConcepto, charged: otroAmount, freeEntry: true };
        }

        return { ok: true, meta };
    }

    // ============ ADMIN UI ============

    async showAdminModal() {
        if (!this.isPricingAdmin()) {
            window.showNotification('🚫 Solo administración puede gestionar precios y promociones', 'error');
            return;
        }
        await this.init(); // refresh

        const promoRows = Array.from(this.promotions.values())
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
            .map(p => `
                <tr style="border-bottom: 1px solid #e5e7eb; ${!p.active ? 'opacity: 0.5;' : ''}">
                    <td style="padding: 6px;">${p.name}</td>
                    <td style="padding: 6px;">${p.appliesTo}</td>
                    <td style="padding: 6px;">${p.type === 'gratis' ? 'Gratis' : p.type === 'porcentaje' ? `-${p.value}%` : '$' + Number(p.value).toLocaleString('es-CO')}</td>
                    <td style="padding: 6px; font-size: 0.75rem;">${p.validFrom || '—'} → ${p.validTo || '—'}</td>
                    <td style="padding: 6px;">
                        <button onclick="window.PricingManager.togglePromo('${p.id}')" class="btn btn-sm" style="background: ${p.active ? '#ef4444' : '#10b981'}; color: white; padding: 2px 8px; font-size: 0.75rem;">
                            ${p.active ? 'Desactivar' : 'Activar'}
                        </button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="5" style="padding: 12px; text-align: center; color: #6b7280;">No hay promociones creadas</td></tr>';

        const html = `
            <div id="pricingAdminModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div style="background: white; border-radius: 12px; max-width: 720px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">💲 Precios Oficiales y Promociones</h3>
                        <button onclick="document.getElementById('pricingAdminModal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">✕</button>
                    </div>

                    <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <h4 style="margin: 0 0 0.75rem 0; color: #166534;">Precios de Lista</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div>
                                <label style="font-size: 0.875rem; font-weight: 500;">Matrícula</label>
                                <input type="number" id="plMatricula" value="${this.priceList.matricula || ''}" placeholder="Ej: 100000" min="0"
                                       style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="font-size: 0.875rem; font-weight: 500;">Certificado</label>
                                <input type="number" id="plCertificado" value="${this.priceList.certificado || ''}" placeholder="Ej: 50000" min="0"
                                       style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                            </div>
                        </div>
                        <button onclick="window.PricingManager.savePrices()" class="btn" style="background: #16a34a; color: white; margin-top: 0.75rem; padding: 0.5rem 1rem;">
                            💾 Guardar Precios
                        </button>
                        <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.5rem;">
                            La mensualidad se valida contra el "valor" configurado en la ficha de cada estudiante.
                        </div>
                    </div>

                    <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <h4 style="margin: 0 0 0.75rem 0; color: #92400e;">➕ Nueva Promoción</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                            <div style="grid-column: 1 / -1;">
                                <label style="font-size: 0.875rem;">Nombre (ej: "Matrícula gratis Julio 2026")</label>
                                <input type="text" id="promoName" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="font-size: 0.875rem;">Aplica a</label>
                                <select id="promoAppliesTo" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                                    <option value="matricula">Matrícula</option>
                                    <option value="mensualidad">Mensualidad</option>
                                    <option value="certificado">Certificado</option>
                                    <option value="libro">Libro</option>
                                    <option value="cualquiera">Cualquiera</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size: 0.875rem;">Tipo de descuento</label>
                                <select id="promoType" onchange="document.getElementById('promoValueWrap').style.display = this.value === 'gratis' ? 'none' : 'block'" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                                    <option value="gratis">Gratis (100%)</option>
                                    <option value="porcentaje">Porcentaje (%)</option>
                                    <option value="precio_fijo">Precio fijo ($)</option>
                                </select>
                            </div>
                            <div id="promoValueWrap" style="display: none;">
                                <label style="font-size: 0.875rem;">Valor (% o $)</label>
                                <input type="number" id="promoValue" min="0" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="font-size: 0.875rem;">Válida desde</label>
                                <input type="date" id="promoFrom" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="font-size: 0.875rem;">Válida hasta</label>
                                <input type="date" id="promoTo" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                            </div>
                        </div>
                        <button onclick="window.PricingManager.savePromo()" class="btn" style="background: #d97706; color: white; margin-top: 0.75rem; padding: 0.5rem 1rem;">
                            ➕ Crear Promoción
                        </button>
                    </div>

                    <h4 style="margin: 0 0 0.5rem 0;">Promociones Existentes</h4>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                            <thead>
                                <tr style="background: #f3f4f6; text-align: left;">
                                    <th style="padding: 6px;">Nombre</th>
                                    <th style="padding: 6px;">Aplica a</th>
                                    <th style="padding: 6px;">Descuento</th>
                                    <th style="padding: 6px;">Vigencia</th>
                                    <th style="padding: 6px;"></th>
                                </tr>
                            </thead>
                            <tbody>${promoRows}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pricingAdminModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', html);
    }

    async savePrices() {
        if (!this.isPricingAdmin()) return;
        try {
            const db = window.firebaseModules.database;
            const matricula = parseFloat(document.getElementById('plMatricula')?.value) || 0;
            const certificado = parseFloat(document.getElementById('plCertificado')?.value) || 0;

            await db.update(db.ref(window.FirebaseData.database, 'priceList'), {
                matricula,
                certificado,
                updatedAt: new Date().toISOString(),
                updatedBy: window.FirebaseData?.currentUser?.email || 'unknown'
            });

            this.priceList.matricula = matricula;
            this.priceList.certificado = certificado;

            if (typeof window.logAudit === 'function') {
                await window.logAudit('Precios actualizados', 'pricing', 'priceList',
                    `Matrícula: $${matricula.toLocaleString('es-CO')} | Certificado: $${certificado.toLocaleString('es-CO')}`,
                    { after: { matricula, certificado } });
            }
            window.showNotification('✅ Precios guardados', 'success');
        } catch (error) {
            console.error('❌ Error saving prices:', error);
            window.showNotification('❌ Error al guardar precios', 'error');
        }
    }

    async savePromo() {
        if (!this.isPricingAdmin()) return;
        const name = document.getElementById('promoName')?.value?.trim();
        const appliesTo = document.getElementById('promoAppliesTo')?.value;
        const type = document.getElementById('promoType')?.value;
        const value = parseFloat(document.getElementById('promoValue')?.value) || 0;
        const validFrom = document.getElementById('promoFrom')?.value || null;
        const validTo = document.getElementById('promoTo')?.value || null;

        if (!name) { window.showNotification('⚠️ Ingrese el nombre de la promoción', 'warning'); return; }
        if (type !== 'gratis' && value <= 0) { window.showNotification('⚠️ Ingrese el valor del descuento', 'warning'); return; }
        if (type === 'porcentaje' && value > 100) { window.showNotification('⚠️ El porcentaje no puede superar 100', 'warning'); return; }

        try {
            const db = window.firebaseModules.database;
            const id = `PROMO-${Date.now()}`;
            const promo = {
                name, appliesTo, type,
                value: type === 'gratis' ? 100 : value,
                validFrom, validTo,
                active: true,
                createdAt: new Date().toISOString(),
                createdBy: window.FirebaseData?.currentUser?.email || 'unknown'
            };
            await db.set(db.ref(window.FirebaseData.database, `promotions/${id}`), promo);
            this.promotions.set(id, { id, ...promo });

            if (typeof window.logAudit === 'function') {
                await window.logAudit('Promoción creada', 'pricing', id,
                    `${name} (${appliesTo}, ${type}${type !== 'gratis' ? ' ' + value : ''})`,
                    { after: promo });
            }
            window.showNotification('✅ Promoción creada', 'success');
            this.showAdminModal(); // re-render
        } catch (error) {
            console.error('❌ Error saving promo:', error);
            window.showNotification('❌ Error al crear promoción', 'error');
        }
    }

    async togglePromo(id) {
        if (!this.isPricingAdmin()) return;
        const promo = this.promotions.get(id);
        if (!promo) return;
        try {
            const db = window.firebaseModules.database;
            const newActive = !promo.active;
            await db.update(db.ref(window.FirebaseData.database, `promotions/${id}`), {
                active: newActive,
                updatedAt: new Date().toISOString(),
                updatedBy: window.FirebaseData?.currentUser?.email || 'unknown'
            });
            promo.active = newActive;

            if (typeof window.logAudit === 'function') {
                await window.logAudit(newActive ? 'Promoción activada' : 'Promoción desactivada', 'pricing', id, promo.name,
                    { after: { active: newActive } });
            }
            this.showAdminModal(); // re-render
        } catch (error) {
            console.error('❌ Error toggling promo:', error);
            window.showNotification('❌ Error al actualizar promoción', 'error');
        }
    }
}

window.PricingManager = new PricingManagerClass();
console.log('💲 Pricing module loaded');
