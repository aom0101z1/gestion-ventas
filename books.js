// ==================== BOOKS.JS ====================
// Book catalog + per-student book ledger (anti-fraud Phase 3)
// - bookCatalog/books/{bookId} : official book list with prices
//   (admin/director manage via "Catálogo Libros" modal)
// - studentBooks/{studentId}/{bookId} : ledger of what each student
//   owes / paid / got included. Statuses:
//     'owed'     - student needs this book and has not paid
//     'paid'     - paid, linked to invoice/payment
//     'promo'    - obtained free/discounted via a promotion (promoId stored)
//     'included' - covered by a semester/annual tuition payment
//     'waived'   - manually exonerated by admin/director (reason stored)
// - Auto-owed: when a group's book advances (grupos2 / class progress),
//   every student in the group gets the new book marked 'owed' unless
//   they have active semester coverage ('included') or already have it.
// ==================================================

const BOOK_LANGUAGES = {
    english: 'Inglés',
    french: 'Francés',
    german: 'Alemán',
    spanish: 'Español',
    professional: 'Inglés Profesional'
};

// Payment types whose tuition includes books (business rule)
const BOOKS_INCLUDED_PAYMENT_TYPES = ['academicSemester', 'twoSemesters', 'annual'];

class BookManagerClass {
    constructor() {
        this.catalog = new Map();
        this.loaded = false;
    }

    isBooksAdmin() {
        const email = window.FirebaseData?.currentUser?.email;
        const role = window.userRole;
        return email === 'admin@ciudadbilingue.com' || role === 'admin' || role === 'director';
    }

    async init() {
        try {
            const db = window.firebaseModules.database;
            const snap = await db.get(db.ref(window.FirebaseData.database, 'bookCatalog/books'));
            this.catalog.clear();
            if (snap.exists()) {
                Object.entries(snap.val()).forEach(([id, book]) => {
                    this.catalog.set(id, { id, ...book });
                });
            }
            this.loaded = true;
            console.log(`📚 Book catalog loaded: ${this.catalog.size} libros`);
        } catch (error) {
            console.error('❌ Error loading book catalog:', error);
            this.loaded = false;
        }
        return this.loaded;
    }

    getActiveBooks() {
        return Array.from(this.catalog.values())
            .filter(b => b.active !== false)
            .sort((a, b) => (a.language || '').localeCompare(b.language || '') || (a.number || 0) - (b.number || 0));
    }

    getBook(id) {
        return this.catalog.get(id) || null;
    }

    bookLabel(book) {
        return book.name || `${BOOK_LANGUAGES[book.language] || book.language} - Libro ${book.number}`;
    }

    // ============ STUDENT LEDGER ============

    async getStudentBooks(studentId) {
        try {
            const db = window.firebaseModules.database;
            const snap = await db.get(db.ref(window.FirebaseData.database, `studentBooks/${studentId}`));
            return snap.exists() ? snap.val() : {};
        } catch (error) {
            console.error('❌ Error loading student books:', error);
            return {};
        }
    }

    // Write/overwrite a ledger entry. Never downgrades paid/promo/included/waived to owed.
    async setBookStatus(studentId, bookId, status, extra = {}) {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `studentBooks/${studentId}/${bookId}`);

        const existingSnap = await db.get(ref);
        const existing = existingSnap.exists() ? existingSnap.val() : null;

        // Protect resolved states: an 'owed' write never overwrites paid/promo/included/waived
        if (status === 'owed' && existing && existing.status !== 'owed') {
            return { skipped: true, existing };
        }

        const book = this.getBook(bookId);
        const entry = {
            ...(existing || {}),
            status,
            bookName: book ? this.bookLabel(book) : (existing?.bookName || bookId),
            listPrice: book?.price ?? existing?.listPrice ?? null,
            updatedAt: new Date().toISOString(),
            updatedBy: window.FirebaseData?.currentUser?.email || 'unknown',
            ...extra
        };
        if (!existing) entry.createdAt = entry.updatedAt;

        await db.set(ref, entry);
        return { skipped: false, entry };
    }

    // Does this student have an active (non-cancelled) semester/annual payment
    // covering the given month/year? Used to mark advancing books as 'included'.
    hasSemesterCoverage(studentId, month, year) {
        if (!window.PaymentManager?.payments) return false;
        const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        const targetMonth = (month || monthNames[new Date().getMonth()]).toLowerCase();
        const targetYear = year || new Date().getFullYear();

        for (const payment of window.PaymentManager.payments.values()) {
            if (payment.studentId !== studentId) continue;
            if (payment.status === 'cancelled') continue;
            if (!BOOKS_INCLUDED_PAYMENT_TYPES.includes(payment.paymentType)) continue;
            if (payment.month === targetMonth && Number(payment.year) === Number(targetYear)) return true;
        }
        return false;
    }

    // ============ GROUP ADVANCE HOOK ============
    // Called from GroupsManager2.saveGroup when a group's book number changes.
    // Marks the new book as owed (or included) for every student in the group.
    async onGroupBookAdvance(groupData, oldBook) {
        try {
            const newBook = Number(groupData.book);
            if (!newBook || newBook === Number(oldBook)) return;
            if (!groupData.studentIds || groupData.studentIds.length === 0) return;

            if (!this.loaded) await this.init();

            // v1: groups map to the English catalog (other languages: manual for now)
            const bookId = `english-${newBook}`;
            const book = this.getBook(bookId);
            if (!book || book.active === false) {
                console.log(`📚 Group ${groupData.groupId} advanced to Book ${newBook} but '${bookId}' is not in the catalog — no ledger entries created`);
                return;
            }

            // Ensure payments are available for semester-coverage checks
            try { await window.PaymentManager?.init(); } catch (e) { /* coverage check degrades gracefully */ }

            let owedCount = 0, includedCount = 0;
            for (const studentId of groupData.studentIds) {
                const covered = this.hasSemesterCoverage(studentId);
                const result = await this.setBookStatus(studentId, bookId, covered ? 'included' : 'owed', {
                    reason: 'group-advance',
                    groupId: groupData.groupId,
                    ...(covered ? { includedBy: 'semester-coverage' } : {})
                });
                if (!result.skipped) covered ? includedCount++ : owedCount++;
            }

            if (typeof window.logAudit === 'function') {
                await window.logAudit('Libros asignados por avance de grupo', 'books', String(groupData.groupId),
                    `Grupo ${groupData.displayName || groupData.groupId} avanzó a ${this.bookLabel(book)}: ${owedCount} adeudado(s), ${includedCount} incluido(s)`,
                    { after: { libro: bookId, adeudados: owedCount, incluidos: includedCount } });
            }
            console.log(`📚 Group advance: ${bookId} → ${owedCount} owed, ${includedCount} included`);
        } catch (error) {
            // Never break group saving because of the book ledger
            console.error('❌ Error in onGroupBookAdvance:', error);
        }
    }

    // ============ PAYMENT FORM HOOKS ============

    async onBookToggle() {
        const check = document.getElementById('includeLibro');
        const select = document.getElementById('libroSelect');
        const promoSelect = document.getElementById('libroPromoSelect');
        const input = document.getElementById('libroAmount');
        if (!check || !select || !input) return;

        if (!check.checked) {
            select.style.display = 'none';
            if (promoSelect) { promoSelect.style.display = 'none'; promoSelect.value = ''; }
            return;
        }

        if (!this.loaded) await this.init();
        const books = this.getActiveBooks();
        if (books.length === 0) {
            window.showNotification('⚠️ No hay libros en el catálogo. Pídele al administrador crearlo en 📚 Catálogo Libros', 'warning');
            check.checked = false;
            return;
        }

        // Owed books for this student go first, marked PENDIENTE
        const studentId = window.currentStudentId;
        const ledger = studentId ? await this.getStudentBooks(studentId) : {};
        const owedIds = Object.entries(ledger).filter(([, e]) => e.status === 'owed').map(([id]) => id);

        const owedOptions = books.filter(b => owedIds.includes(b.id))
            .map(b => `<option value="${b.id}">⚠️ ${this.bookLabel(b)} (PENDIENTE) - $${Number(b.price).toLocaleString('es-CO')}</option>`);
        const otherOptions = books.filter(b => !owedIds.includes(b.id))
            .map(b => `<option value="${b.id}">${this.bookLabel(b)} - $${Number(b.price).toLocaleString('es-CO')}</option>`);

        select.innerHTML = '<option value="">Seleccionar libro...</option>' + owedOptions.join('') + otherOptions.join('');
        select.style.display = 'block';
        input.value = 0;

        if (promoSelect && window.PricingManager?.loaded) {
            promoSelect.innerHTML = '<option value="">Sin promoción (precio de lista)</option>' +
                window.PricingManager.getActivePromos('libro').map(p =>
                    `<option value="${p.id}">${window.PricingManager.promoLabel(p)}</option>`
                ).join('');
            promoSelect.style.display = 'block';
            promoSelect.value = '';
        }
    }

    onBookSelected() {
        const select = document.getElementById('libroSelect');
        const promoSelect = document.getElementById('libroPromoSelect');
        const input = document.getElementById('libroAmount');
        if (!select || !input) return;

        const book = this.getBook(select.value);
        if (!book) { input.value = 0; if (typeof window.updatePaymentTotal === 'function') window.updatePaymentTotal(); return; }

        const promo = (promoSelect?.value && window.PricingManager) ? window.PricingManager.promotions.get(promoSelect.value) : null;
        const listPrice = Number(book.price) || 0;
        input.value = (promo && window.PricingManager) ? window.PricingManager.promoPrice(listPrice, promo) : listPrice;
        if (typeof window.updatePaymentTotal === 'function') window.updatePaymentTotal();
    }

    // Validate the selected book against catalog price + promo. Returns {ok, error, item}
    validateBookItem() {
        const check = document.getElementById('includeLibro');
        if (!check?.checked) return { ok: true, item: null };

        const select = document.getElementById('libroSelect');
        const promoSelect = document.getElementById('libroPromoSelect');
        const charged = parseFloat(document.getElementById('libroAmount')?.value) || 0;

        const book = this.getBook(select?.value);
        if (!book) return { ok: false, error: 'Seleccione el libro que se está vendiendo.' };

        const listPrice = Number(book.price) || 0;
        const promo = (promoSelect?.value && window.PricingManager) ? window.PricingManager.promotions.get(promoSelect.value) : null;
        const allowed = (promo && window.PricingManager) ? window.PricingManager.promoPrice(listPrice, promo) : listPrice;

        if (charged !== allowed) {
            return {
                ok: false,
                error: `El valor del libro ($${charged.toLocaleString('es-CO')}) no coincide con el precio oficial${promo ? ' con la promoción seleccionada' : ''} ($${allowed.toLocaleString('es-CO')}).`
            };
        }

        return {
            ok: true,
            item: {
                bookId: book.id,
                bookName: this.bookLabel(book),
                listPrice,
                charged,
                promoId: promo?.id || null,
                promoName: promo?.name || null
            }
        };
    }

    // Called after a payment that sold a book is recorded successfully
    async onBookPaid(studentId, bookItem, referenceInfo = {}) {
        try {
            const status = bookItem.charged === 0 && bookItem.promoId ? 'promo' : 'paid';
            await this.setBookStatus(studentId, bookItem.bookId, status, {
                paidAt: new Date().toISOString(),
                charged: bookItem.charged,
                promoId: bookItem.promoId,
                promoName: bookItem.promoName,
                invoiceNumber: referenceInfo.invoiceNumber || null
            });

            if (typeof window.logAudit === 'function') {
                const student = window.StudentManager?.students.get(studentId);
                await window.logAudit('Libro pagado', 'books', `${studentId}/${bookItem.bookId}`,
                    `${student?.nombre || studentId} - ${bookItem.bookName} - $${bookItem.charged.toLocaleString('es-CO')}${bookItem.promoName ? ' (' + bookItem.promoName + ')' : ''}`,
                    { after: bookItem });
            }
        } catch (error) {
            console.error('❌ Error marking book as paid:', error);
        }
    }

    // Called after a semester/annual payment: mark the group's current book as included
    async onSemesterPaymentRecorded(studentId, referenceInfo = {}) {
        try {
            if (!this.loaded) await this.init();
            const student = window.StudentManager?.students.get(studentId);
            if (!student) return;

            // Find the student's group and its current book
            let currentBook = null, groupId = null;
            if (window.GroupsManager2?.groups) {
                for (const group of window.GroupsManager2.groups.values()) {
                    if (group.studentIds?.includes(studentId)) {
                        currentBook = Number(group.book) || null;
                        groupId = group.groupId;
                        break;
                    }
                }
            }
            if (!currentBook) return;

            const bookId = `english-${currentBook}`;
            if (!this.getBook(bookId)) return;

            const result = await this.setBookStatus(studentId, bookId, 'included', {
                reason: 'semester-payment',
                includedBy: 'semester-payment',
                invoiceNumber: referenceInfo.invoiceNumber || null,
                groupId
            });

            if (!result.skipped && typeof window.logAudit === 'function') {
                await window.logAudit('Libro incluido por pago de semestre', 'books', `${studentId}/${bookId}`,
                    `${student.nombre} - libro incluido con pago de semestre`, { after: { bookId } });
            }
        } catch (error) {
            console.error('❌ Error marking semester book included:', error);
        }
    }

    // ============ REPORTS UI ============

    async showBooksReport() {
        if (!this.loaded) await this.init();
        try { await window.StudentManager?.init(); } catch (e) {}

        const db = window.firebaseModules.database;
        const snap = await db.get(db.ref(window.FirebaseData.database, 'studentBooks'));
        const allLedgers = snap.exists() ? snap.val() : {};

        const rows = [];
        let totalOwed = 0, totalOwedAmount = 0;

        Object.entries(allLedgers).forEach(([studentId, ledger]) => {
            const student = window.StudentManager?.students.get(studentId);
            const owed = Object.entries(ledger).filter(([, e]) => e.status === 'owed');
            const paid = Object.values(ledger).filter(e => e.status === 'paid' || e.status === 'promo').length;
            const included = Object.values(ledger).filter(e => e.status === 'included' || e.status === 'waived').length;
            if (owed.length === 0 && paid === 0 && included === 0) return;

            const owedAmount = owed.reduce((sum, [, e]) => sum + (Number(e.listPrice) || 0), 0);
            totalOwed += owed.length;
            totalOwedAmount += owedAmount;

            rows.push({
                studentId,
                name: student?.nombre || `(${studentId})`,
                active: student ? (student.status !== 'inactive') : false,
                owed, paid, included, owedAmount
            });
        });

        rows.sort((a, b) => b.owed.length - a.owed.length || a.name.localeCompare(b.name));

        const tableRows = rows.map(r => `
            <tr style="border-bottom: 1px solid #e5e7eb; cursor: pointer; ${!r.active ? 'opacity: 0.5;' : ''}"
                onclick="window.BookManager.showStudentBooksModal('${r.studentId}')">
                <td style="padding: 8px;">${r.name}${!r.active ? ' <span style="font-size:0.7rem;">(inactivo)</span>' : ''}</td>
                <td style="padding: 8px; text-align: center;">
                    ${r.owed.length > 0
                        ? `<span style="background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 10px; font-weight: 600;">${r.owed.length}</span>`
                        : '<span style="color: #16a34a;">✓</span>'}
                </td>
                <td style="padding: 8px; font-size: 0.8rem; color: #b91c1c;">
                    ${r.owed.map(([, e]) => e.bookName).join(', ') || '—'}
                </td>
                <td style="padding: 8px; text-align: right; color: #b91c1c; font-weight: 600;">
                    ${r.owedAmount > 0 ? '$' + r.owedAmount.toLocaleString('es-CO') : '—'}
                </td>
                <td style="padding: 8px; text-align: center; color: #16a34a;">${r.paid}</td>
                <td style="padding: 8px; text-align: center; color: #2563eb;">${r.included}</td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="padding: 16px; text-align: center; color: #6b7280;">No hay registros de libros todavía</td></tr>';

        const html = `
            <div id="booksReportModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div style="background: white; border-radius: 12px; max-width: 860px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h3 style="margin: 0;">📚 Control de Libros</h3>
                        <button onclick="document.getElementById('booksReportModal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">✕</button>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                        <div style="background: #fee2e2; border-radius: 8px; padding: 0.75rem 1rem;">
                            <div style="font-size: 1.25rem; font-weight: 700; color: #b91c1c;">${totalOwed}</div>
                            <div style="font-size: 0.75rem; color: #7f1d1d;">Libros pendientes de pago</div>
                        </div>
                        <div style="background: #fef3c7; border-radius: 8px; padding: 0.75rem 1rem;">
                            <div style="font-size: 1.25rem; font-weight: 700; color: #92400e;">$${totalOwedAmount.toLocaleString('es-CO')}</div>
                            <div style="font-size: 0.75rem; color: #78350f;">Dinero pendiente por libros</div>
                        </div>
                    </div>
                    <input type="text" placeholder="🔍 Buscar estudiante..." oninput="
                        const q = this.value.toLowerCase();
                        document.querySelectorAll('#booksReportTable tbody tr').forEach(tr => {
                            tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
                        });"
                        style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 0.75rem;">
                    <div style="overflow-x: auto;">
                        <table id="booksReportTable" style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                            <thead>
                                <tr style="background: #f3f4f6; text-align: left;">
                                    <th style="padding: 8px;">Estudiante</th>
                                    <th style="padding: 8px; text-align: center;">Pendientes</th>
                                    <th style="padding: 8px;">Libros adeudados</th>
                                    <th style="padding: 8px; text-align: right;">Valor</th>
                                    <th style="padding: 8px; text-align: center;">Pagados</th>
                                    <th style="padding: 8px; text-align: center;">Incluidos</th>
                                </tr>
                            </thead>
                            <tbody>${tableRows}</tbody>
                        </table>
                    </div>
                    <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.75rem;">
                        Haz clic en un estudiante para ver su historial completo de libros.
                    </div>
                </div>
            </div>
        `;

        document.getElementById('booksReportModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', html);
    }

    async showStudentBooksModal(studentId) {
        if (!this.loaded) await this.init();
        const student = window.StudentManager?.students.get(studentId);
        const ledger = await this.getStudentBooks(studentId);
        const isAdmin = this.isBooksAdmin();

        const STATUS_BADGES = {
            owed: '<span style="background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 10px;">⚠️ Adeudado</span>',
            paid: '<span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 10px;">✅ Pagado</span>',
            promo: '<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 10px;">🎁 Promoción</span>',
            included: '<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 10px;">📦 Incluido</span>',
            waived: '<span style="background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 10px;">Exonerado</span>'
        };

        const entries = Object.entries(ledger).sort(([a], [b]) => a.localeCompare(b));
        const rows = entries.map(([bookId, e]) => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px;">${e.bookName || bookId}</td>
                <td style="padding: 8px;">${STATUS_BADGES[e.status] || e.status}</td>
                <td style="padding: 8px; text-align: right;">${e.status === 'paid' ? '$' + Number(e.charged || 0).toLocaleString('es-CO') : (e.listPrice ? '$' + Number(e.listPrice).toLocaleString('es-CO') : '—')}</td>
                <td style="padding: 8px; font-size: 0.75rem; color: #6b7280;">
                    ${e.promoName ? '🎟️ ' + e.promoName + '<br>' : ''}
                    ${e.invoiceNumber ? '🧾 ' + e.invoiceNumber + '<br>' : ''}
                    ${(e.updatedAt || '').split('T')[0]} ${e.updatedBy ? '· ' + e.updatedBy : ''}
                </td>
                ${isAdmin ? `<td style="padding: 8px;">
                    ${e.status === 'owed' ? `<button onclick="window.BookManager.waiveBook('${studentId}', '${bookId}')" class="btn btn-sm" style="background: #6b7280; color: white; padding: 2px 8px; font-size: 0.7rem;">Exonerar</button>` : ''}
                </td>` : ''}
            </tr>
        `).join('') || `<tr><td colspan="${isAdmin ? 5 : 4}" style="padding: 16px; text-align: center; color: #6b7280;">Sin registros de libros</td></tr>`;

        const bookOptions = this.getActiveBooks()
            .filter(b => !ledger[b.id])
            .map(b => `<option value="${b.id}">${this.bookLabel(b)}</option>`).join('');

        const html = `
            <div id="studentBooksModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div style="background: white; border-radius: 12px; max-width: 640px; width: 100%; max-height: 85vh; overflow-y: auto; padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">📚 Libros de ${student?.nombre || studentId}</h3>
                        <button onclick="document.getElementById('studentBooksModal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">✕</button>
                    </div>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                            <thead>
                                <tr style="background: #f3f4f6; text-align: left;">
                                    <th style="padding: 8px;">Libro</th>
                                    <th style="padding: 8px;">Estado</th>
                                    <th style="padding: 8px; text-align: right;">Valor</th>
                                    <th style="padding: 8px;">Detalle</th>
                                    ${isAdmin ? '<th style="padding: 8px;"></th>' : ''}
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                    <div style="background: #f9fafb; border-radius: 8px; padding: 0.75rem; margin-top: 1rem;">
                        <div style="font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem;">➕ Marcar libro como adeudado (manual)</div>
                        <div style="display: flex; gap: 0.5rem;">
                            <select id="manualOwedBookSelect" style="flex: 1; padding: 6px; border: 1px solid #d1d5db; border-radius: 6px;">
                                <option value="">Seleccionar libro...</option>
                                ${bookOptions}
                            </select>
                            <button onclick="window.BookManager.markOwedManually('${studentId}')" class="btn btn-sm" style="background: #dc2626; color: white; padding: 6px 12px;">Marcar</button>
                        </div>
                        <div style="font-size: 0.7rem; color: #6b7280; margin-top: 4px;">Para vender un libro: regístralo desde 💰 Pagos con el artículo "Libro".</div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('studentBooksModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', html);
    }

    async markOwedManually(studentId) {
        const select = document.getElementById('manualOwedBookSelect');
        const bookId = select?.value;
        if (!bookId) { window.showNotification('⚠️ Seleccione un libro', 'warning'); return; }

        const result = await this.setBookStatus(studentId, bookId, 'owed', { reason: 'manual' });
        if (result.skipped) {
            window.showNotification('⚠️ Este libro ya tiene un estado registrado', 'warning');
            return;
        }
        if (typeof window.logAudit === 'function') {
            const student = window.StudentManager?.students.get(studentId);
            await window.logAudit('Libro marcado adeudado (manual)', 'books', `${studentId}/${bookId}`,
                `${student?.nombre || studentId} - ${result.entry.bookName}`, { after: result.entry });
        }
        window.showNotification('✅ Libro marcado como adeudado', 'success');
        this.showStudentBooksModal(studentId);
    }

    async waiveBook(studentId, bookId) {
        if (!this.isBooksAdmin()) {
            window.showNotification('🚫 Solo administración puede exonerar libros', 'error');
            return;
        }
        const reason = prompt('Motivo de la exoneración (obligatorio):');
        if (!reason || !reason.trim()) return;

        await this.setBookStatus(studentId, bookId, 'waived', { waiveReason: reason.trim() });
        if (typeof window.logAudit === 'function') {
            const student = window.StudentManager?.students.get(studentId);
            await window.logAudit('Libro exonerado', 'books', `${studentId}/${bookId}`,
                `${student?.nombre || studentId} - ${bookId} - Motivo: ${reason.trim()}`, { after: { bookId, reason: reason.trim() } });
        }
        window.showNotification('✅ Libro exonerado', 'success');
        this.showStudentBooksModal(studentId);
    }

    // ============ CATALOG ADMIN ============

    async showCatalogModal() {
        if (!this.isBooksAdmin()) {
            window.showNotification('🚫 Solo administración puede gestionar el catálogo de libros', 'error');
            return;
        }
        await this.init();

        const books = Array.from(this.catalog.values())
            .sort((a, b) => (a.language || '').localeCompare(b.language || '') || (a.number || 0) - (b.number || 0));

        const rows = books.map(b => `
            <tr style="border-bottom: 1px solid #e5e7eb; ${b.active === false ? 'opacity: 0.5;' : ''}">
                <td style="padding: 6px;">${this.bookLabel(b)}</td>
                <td style="padding: 6px;">${BOOK_LANGUAGES[b.language] || b.language}</td>
                <td style="padding: 6px;">
                    <input type="number" id="bookPrice_${b.id}" value="${b.price || 0}" min="0"
                           style="width: 110px; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px;">
                </td>
                <td style="padding: 6px;">
                    <button onclick="window.BookManager.updateBookPrice('${b.id}')" class="btn btn-sm" style="background: #16a34a; color: white; padding: 2px 8px; font-size: 0.7rem;">💾</button>
                    <button onclick="window.BookManager.toggleBookActive('${b.id}')" class="btn btn-sm" style="background: ${b.active === false ? '#10b981' : '#ef4444'}; color: white; padding: 2px 8px; font-size: 0.7rem;">
                        ${b.active === false ? 'Activar' : 'Desactivar'}
                    </button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="padding: 12px; text-align: center; color: #6b7280;">Catálogo vacío</td></tr>';

        const html = `
            <div id="bookCatalogModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div style="background: white; border-radius: 12px; max-width: 680px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">📚 Catálogo de Libros</h3>
                        <button onclick="document.getElementById('bookCatalogModal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">✕</button>
                    </div>

                    <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #1e40af;">⚡ Crear serie completa (10 libros)</h4>
                        <div style="display: flex; gap: 0.5rem; align-items: end; flex-wrap: wrap;">
                            <div>
                                <label style="font-size: 0.8rem;">Idioma</label><br>
                                <select id="seedLanguage" style="padding: 6px; border: 1px solid #d1d5db; border-radius: 6px;">
                                    ${Object.entries(BOOK_LANGUAGES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="font-size: 0.8rem;">Precio por libro</label><br>
                                <input type="number" id="seedPrice" min="0" placeholder="Ej: 80000" style="padding: 6px; border: 1px solid #d1d5db; border-radius: 6px; width: 130px;">
                            </div>
                            <button onclick="window.BookManager.seedSeries()" class="btn" style="background: #2563eb; color: white; padding: 6px 12px;">Crear Libros 1-10</button>
                        </div>
                        <div style="font-size: 0.7rem; color: #6b7280; margin-top: 4px;">Crea los libros 1 a 10 del idioma. Los que ya existen no se modifican.</div>
                    </div>

                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                            <thead>
                                <tr style="background: #f3f4f6; text-align: left;">
                                    <th style="padding: 6px;">Libro</th>
                                    <th style="padding: 6px;">Idioma</th>
                                    <th style="padding: 6px;">Precio</th>
                                    <th style="padding: 6px;"></th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('bookCatalogModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', html);
    }

    async seedSeries() {
        if (!this.isBooksAdmin()) return;
        const language = document.getElementById('seedLanguage')?.value;
        const price = parseFloat(document.getElementById('seedPrice')?.value) || 0;
        if (!language) return;
        if (price <= 0) { window.showNotification('⚠️ Ingrese el precio por libro', 'warning'); return; }

        try {
            const db = window.firebaseModules.database;
            let created = 0;
            for (let n = 1; n <= 10; n++) {
                const id = `${language}-${n}`;
                if (this.catalog.has(id)) continue;
                const book = {
                    language,
                    number: n,
                    name: `${BOOK_LANGUAGES[language]} - Libro ${n}`,
                    price,
                    active: true,
                    createdAt: new Date().toISOString(),
                    createdBy: window.FirebaseData?.currentUser?.email || 'unknown'
                };
                await db.set(db.ref(window.FirebaseData.database, `bookCatalog/books/${id}`), book);
                this.catalog.set(id, { id, ...book });
                created++;
            }

            if (typeof window.logAudit === 'function') {
                await window.logAudit('Catálogo de libros creado', 'books', language,
                    `${BOOK_LANGUAGES[language]}: ${created} libros creados a $${price.toLocaleString('es-CO')}`,
                    { after: { language, created, price } });
            }
            window.showNotification(`✅ ${created} libros creados`, 'success');
            this.showCatalogModal();
        } catch (error) {
            console.error('❌ Error seeding books:', error);
            window.showNotification('❌ Error al crear libros', 'error');
        }
    }

    async updateBookPrice(bookId) {
        if (!this.isBooksAdmin()) return;
        const price = parseFloat(document.getElementById(`bookPrice_${bookId}`)?.value) || 0;
        if (price <= 0) { window.showNotification('⚠️ Precio inválido', 'warning'); return; }

        try {
            const db = window.firebaseModules.database;
            const book = this.catalog.get(bookId);
            const oldPrice = book?.price;
            await db.update(db.ref(window.FirebaseData.database, `bookCatalog/books/${bookId}`), {
                price,
                updatedAt: new Date().toISOString(),
                updatedBy: window.FirebaseData?.currentUser?.email || 'unknown'
            });
            if (book) book.price = price;

            if (typeof window.logAudit === 'function') {
                await window.logAudit('Precio de libro actualizado', 'books', bookId,
                    `${book ? this.bookLabel(book) : bookId}: $${Number(oldPrice || 0).toLocaleString('es-CO')} → $${price.toLocaleString('es-CO')}`,
                    { before: { price: oldPrice }, after: { price } });
            }
            window.showNotification('✅ Precio actualizado', 'success');
        } catch (error) {
            console.error('❌ Error updating book price:', error);
            window.showNotification('❌ Error al actualizar precio', 'error');
        }
    }

    async toggleBookActive(bookId) {
        if (!this.isBooksAdmin()) return;
        const book = this.catalog.get(bookId);
        if (!book) return;
        try {
            const db = window.firebaseModules.database;
            const newActive = book.active === false;
            await db.update(db.ref(window.FirebaseData.database, `bookCatalog/books/${bookId}`), {
                active: newActive,
                updatedAt: new Date().toISOString(),
                updatedBy: window.FirebaseData?.currentUser?.email || 'unknown'
            });
            book.active = newActive;

            if (typeof window.logAudit === 'function') {
                await window.logAudit(newActive ? 'Libro activado' : 'Libro desactivado', 'books', bookId, this.bookLabel(book),
                    { after: { active: newActive } });
            }
            this.showCatalogModal();
        } catch (error) {
            console.error('❌ Error toggling book:', error);
        }
    }
}

window.BookManager = new BookManagerClass();
console.log('📚 Books module loaded');
