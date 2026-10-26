/* ============================================================================
 * 🖼️ cobros-card.js — the WhatsApp payment-reminder card (23 Oct 2026, noche)
 *
 * Ported 1:1 from the TutorBox portal tutorbox.app/admin/cobranza (page.tsx,
 * drawCard + wrap + roundRect, 2 Oct 2026): 1080×1350 canvas, dark indigo
 * gradient, "CIUDAD BILINGÜE" roundel, yellow pill, "Hola, {who} 👋", body,
 * 🗓️ box, WhatsApp box with the school number, footer and the octopus.
 *
 * Texts: one moment per cobros-engine.js bucket (remind · soon · today · late ·
 * suspend · prev · agreement), in the portal's voice. The plain WhatsApp text
 * still comes from CobrosEngine.buildText — the card is the "pretty" version.
 *
 * No Firebase, no writes. textFor() is pure and runs in Node:
 *   const C = require('./cobros-card.js'); C.textFor(row, 'Vanessa')
 * drawCard / loadOcto / toPngBlob need a browser (canvas, Image).
 * ========================================================================== */
(function (root, factory) {
    const api = factory(root);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof window !== 'undefined') window.CobrosCard = api;
    else if (root) root.CobrosCard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';

    const SCHOOL_WA = '324 297 3737';
    const PAY_WAYS = 'Nequi / Bancolombia o efectivo en la escuela';
    const OCTO_SRC = 'images/octopus.png';

    /** The engine (longDate, cop, firstNames, MONTHS) — window.CobrosEngine or require() in Node. */
    function eng() {
        if (root && root.CobrosEngine) return root.CobrosEngine;
        if (typeof require === 'function') {
            try { return require('./cobros-engine.js'); } catch (e) { /* browser without engine */ }
        }
        return null;
    }

    /** Moments of the card, keyed by cobros-engine.js bucket (same order as BUCKETS). */
    const MOMENTS = [
        { id: 'suspend',   label: '🔒 Cuenta suspendida',     pill: 'Cuenta suspendida' },
        { id: 'late',      label: '⛔ Vencido (1–7 días)',     pill: 'Pago pendiente' },
        { id: 'today',     label: '🔴 Hoy es su día de pago',  pill: 'Hoy es tu día de pago' },
        { id: 'soon',      label: '🟠 Vence en 1–2 días',      pill: 'Recordatorio de pago' },
        { id: 'remind',    label: '🟡 Recordar (3–5 días)',    pill: 'Recordatorio de pago' },
        { id: 'prev',      label: '⏪ Mes anterior pendiente', pill: 'Mensualidad pendiente' },
        { id: 'agreement', label: '📅 Acuerdo de pago',        pill: 'Acuerdo de pago' }
    ];
    const MOMENT = {};
    MOMENTS.forEach(m => { MOMENT[m.id] = m; });

    /**
     * textFor(row, sender, moment?) → { who, pill, body, headline, sub, sender }
     *   row     a CobrosEngine.computeRows row
     *   moment  optional override (a MOMENTS id); default = row.bucket
     * Bodies are kept to ≤ 3 lines at 760 px so the WhatsApp box never touches the octopus.
     */
    function textFor(row, sender, moment) {
        const E = eng();
        const r = row || {};
        const s = r.s || {};
        const m = MOMENT[moment] ? moment : (MOMENT[r.bucket] ? r.bucket : 'remind');
        const longDate = E ? E.longDate : (x) => String(x || '');
        const cop = E ? E.cop : (n) => '$' + Math.round(Number(n) || 0);
        const firstNames = E ? E.firstNames : (x) => String(x || '').trim().split(/\s+/).slice(0, 2).join(' ');
        const MONTHS = (E && E.MONTHS) || [];

        const who = firstNames(s.nombre || '') || 'Estudiante';
        const date = longDate(r.dueIso);
        // the month before the due date — only used when "prev" is forced on a row without prevOwed
        const prevMonthFallback = () => {
            const mm = /^\d{4}-(\d{2})/.exec(String(r.dueIso || ''));
            return mm && MONTHS.length ? MONTHS[(+mm[1] + 10) % 12] : 'el mes anterior';
        };
        const expected = Number(r.expected) || 0;
        const remaining = r.remaining !== undefined ? Number(r.remaining) || 0 : Math.max(0, expected - (Number(r.paidNow) || 0));

        let body = '', headline = '', amount = '';
        if (r.partial && remaining > 0) amount = `Te falta ${cop(remaining)} de tu mensualidad`;
        else if (expected > 0) amount = `Mensualidad ${cop(expected)}`;

        switch (m) {
            case 'remind':
                body = `Te recordamos que tu mensualidad vence el ${date}. Realiza tu pago desde ya para que sigas disfrutando de tus clases 😉`;
                headline = `Vence el ${date}`;
                break;
            case 'soon':
                body = r.diff === -1
                    ? `Tu mensualidad vence mañana, ${date}. Realiza tu pago para que sigas disfrutando de tus clases 😉`
                    : r.diff === -2
                        ? `Tu mensualidad vence en 2 días, el ${date}. Realiza tu pago para que sigas disfrutando de tus clases 😉`
                        : `Tu mensualidad vence el ${date}. Realiza tu pago para que sigas disfrutando de tus clases 😉`;
                headline = r.diff === -1 ? `Mañana · ${date}` : `Vence el ${date}`;
                break;
            case 'today':
                // "Hoy es tu día de pago" is the pill right above — the body continues it (3 lines max)
                body = 'Recuerda que para entrar a clase hoy debes realizar tu pago. ¡Tus clases en vivo, tu grupo, tus cristales y tu progreso en Tuto\'s World te esperan! 💎';
                headline = `Hoy · ${date}`;
                break;
            case 'late':
                body = `Tu mensualidad venció el ${date}. Realiza tu pago antes de tu próxima clase para que sigas disfrutando con normalidad 🙏`;
                headline = `Venció el ${date}`;
                break;
            case 'suspend':
                body = 'Tu cuenta está suspendida por falta de pago. Paga, envíanos el comprobante y recuperas tu cupo, tus cristales y todo lo ganado. ¡Te esperamos! 💙';
                headline = `Venció el ${date}`;
                break;
            case 'prev': {
                const month = (r.prevOwed && r.prevOwed.month) || r.prevMonthName || prevMonthFallback();
                body = `La mensualidad de ${month} quedó pendiente. Si ya la pagaste, envíanos el comprobante; si no, ponte al día para seguir disfrutando de tus clases 🙏`;
                headline = `Mensualidad de ${month}`;
                if (r.prevOwed) {
                    amount = r.prevOwed.partial ? `Te falta ${cop(r.prevOwed.remaining)} de ${month}` : `Mensualidad ${cop(r.prevOwed.remaining)}`;
                }
                break;
            }
            case 'agreement': {
                const h = r.agreement && r.agreement.hasta ? longDate(r.agreement.hasta) : date;
                body = `Según tu acuerdo con la academia, tienes plazo hasta el ${h} para ponerte al día. ¡Gracias por cumplirlo! 😉`;
                headline = `Hasta el ${h}`;
                break;
            }
        }
        const sub = amount ? `${amount} · ${PAY_WAYS}` : PAY_WAYS;
        return { who, pill: MOMENT[m].pill, body, headline, sub, sender: String(sender || '').trim() || 'Ciudad Bilingüe' };
    }

    /* ── canvas card (1080×1350) — 1:1 port of the portal ───────────────────── */
    function wrap(ctx, text, maxW) {
        const words = String(text || '').split(' ');
        const lines = [];
        let line = '';
        for (const w of words) {
            const t = line ? `${line} ${w}` : w;
            if (ctx.measureText(t).width > maxW && line) {
                lines.push(line);
                line = w;
            } else line = t;
        }
        if (line) lines.push(line);
        return lines;
    }
    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
    /** o = { who, pill, headline, sub, body, sender, octo: HTMLImageElement|null } */
    function drawCard(cv, o) {
        const W = 1080, H = 1350;
        cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        const F = '"Segoe UI", Inter, Roboto, Arial, sans-serif';
        // background
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#141c45'); g.addColorStop(0.6, '#0b1230'); g.addColorStop(1, '#070c22');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const r1 = ctx.createRadialGradient(160, 140, 10, 160, 140, 700); r1.addColorStop(0, 'rgba(76,29,149,.9)'); r1.addColorStop(1, 'rgba(76,29,149,0)');
        ctx.fillStyle = r1; ctx.fillRect(0, 0, W, H);
        const r2 = ctx.createRadialGradient(970, 1280, 10, 970, 1280, 650); r2.addColorStop(0, 'rgba(14,116,144,.9)'); r2.addColorStop(1, 'rgba(14,116,144,0)');
        ctx.fillStyle = r2; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,.08)';
        for (let y = 21; y < H; y += 42) for (let x = 21; x < W; x += 42) { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); }
        // card
        roundRect(ctx, 80, 120, W - 160, H - 240, 48);
        ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2; ctx.stroke();
        // roundel
        const cx = 156 + 59, cy = 192 + 59;
        ctx.beginPath(); ctx.arc(cx, cy, 59, 0, Math.PI * 2); ctx.fillStyle = '#e11d48'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, 47, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.fillStyle = '#1e3a8a'; ctx.fillRect(cx - 80, cy - 17, 160, 34);
        ctx.fillStyle = '#fff'; ctx.font = `900 14px ${F}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('CIUDAD BILINGÜE', cx, cy + 1);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#fff'; ctx.font = `900 34px ${F}`; ctx.fillText('Ciudad Bilingüe', 300, 248);
        ctx.fillStyle = '#c7d2fe'; ctx.font = `400 22px ${F}`; ctx.fillText('Clases en vivo con TutorBox', 300, 286);
        // pill
        ctx.font = `900 24px ${F}`;
        const pillText = `📅 ${String(o.pill || '').toUpperCase()}`;
        const pw = ctx.measureText(pillText).width + 52;
        const pg = ctx.createLinearGradient(158, 0, 158 + pw, 0); pg.addColorStop(0, '#f59e0b'); pg.addColorStop(1, '#f97316');
        roundRect(ctx, 158, 362, pw, 56, 28); ctx.fillStyle = pg; ctx.fill();
        ctx.fillStyle = '#1f1300'; ctx.fillText(pillText, 184, 400);
        // greeting
        ctx.font = `900 64px ${F}`;
        ctx.fillStyle = '#fff'; ctx.fillText('Hola, ', 158, 510);
        const hw = ctx.measureText('Hola, ').width;
        ctx.fillStyle = '#a5f3fc'; ctx.fillText(`${o.who} 👋`, 158 + hw, 510);
        // body
        ctx.fillStyle = '#e2e8f0'; ctx.font = `400 32px ${F}`;
        let y = 580;
        for (const ln of wrap(ctx, o.body, 760)) { ctx.fillText(ln, 158, y); y += 46; }
        // date box
        const by = y + 20;
        roundRect(ctx, 158, by, 764, 150, 28); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.stroke();
        ctx.font = `400 54px ${F}`; ctx.fillText('🗓️', 186, by + 96);
        // CRM-only guard: a long weekday + month ("miércoles 30 de septiembre") shrinks instead of overflowing the box
        let hs = 34;
        ctx.font = `900 ${hs}px ${F}`;
        while (hs > 24 && ctx.measureText(o.headline || '').width > 610) { hs -= 1; ctx.font = `900 ${hs}px ${F}`; }
        ctx.fillStyle = '#fff'; ctx.fillText(o.headline || '', 284, by + 66);
        ctx.fillStyle = '#c7d2fe'; ctx.font = `400 22px ${F}`;
        let sy = by + 102;
        for (const ln of wrap(ctx, o.sub, 610).slice(0, 2)) { ctx.fillText(ln, 284, sy); sy += 30; }
        // contact
        const cy2 = by + 190;
        roundRect(ctx, 158, cy2, 236, 60, 30); ctx.fillStyle = '#16a34a'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `900 28px ${F}`; ctx.fillText('💬 WhatsApp', 184, cy2 + 41);
        ctx.fillStyle = '#d9f99d'; ctx.font = `400 28px ${F}`; ctx.fillText('Envía tu comprobante al ', 410, cy2 + 41);
        const tw = ctx.measureText('Envía tu comprobante al ').width;
        ctx.font = `900 28px ${F}`; ctx.fillText(SCHOOL_WA, 410 + tw, cy2 + 41);
        // footer — 27 Oct 2026 (fundador): sigue al bloque de contacto en vez de estar fijo en y=1080;
        // con un cuerpo de 4 líneas (suspensión) el pie y el pulpo tapaban el número de WhatsApp.
        const fy = Math.min(cy2 + 60 + 64, H - 120 - 70);
        ctx.fillStyle = '#c7d2fe'; ctx.font = `400 24px ${F}`;
        ctx.fillText('Gracias por ser parte de Ciudad Bilingüe. ¡Nos vemos en clase!', 158, fy);
        ctx.fillStyle = '#fff'; ctx.font = `900 24px ${F}`; ctx.fillText(o.sender || '', 158, fy + 38);
        const sw = ctx.measureText(o.sender || '').width;
        ctx.fillStyle = '#c7d2fe'; ctx.font = `400 24px ${F}`; ctx.fillText(' · Dirección', 158 + sw, fy + 38);
        // Tuto en la esquina superior derecha de la tarjeta: nunca cruza texto (el título termina ~x=640)
        if (o.octo) {
            try { ctx.drawImage(o.octo, 800, 150, 140, 140 * (o.octo.height / o.octo.width)); } catch (e) { /* broken image: card without the octopus */ }
        }
    }

    /** The octopus (images/octopus.png), loaded once. Resolves null on any failure — never rejects. */
    let octoPromise = null;
    function loadOcto() {
        if (octoPromise) return octoPromise;
        octoPromise = new Promise((resolve) => {
            if (typeof Image === 'undefined') { resolve(null); return; }
            const img = new Image();
            const t = setTimeout(() => resolve(null), 6000);
            img.onload = () => { clearTimeout(t); resolve(img.naturalWidth ? img : null); };
            img.onerror = () => { clearTimeout(t); octoPromise = null; resolve(null); }; // retry next time
            img.src = OCTO_SRC;
        });
        return octoPromise;
    }

    /** canvas → PNG Blob. */
    function toPngBlob(canvas) {
        return new Promise((resolve, reject) => {
            if (canvas.toBlob) {
                canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob devolvió vacío'))), 'image/png');
                return;
            }
            try {
                const bin = atob(canvas.toDataURL('image/png').split(',')[1]);
                const u8 = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
                resolve(new Blob([u8], { type: 'image/png' }));
            } catch (e) { reject(e); }
        });
    }

    /** recordatorio-{nombre}-{YYYY-MM-DD}.png (same pattern as the portal: two first names, due date). */
    function fileName(row) {
        const E = eng();
        const full = (row && row.s && row.s.nombre) || 'estudiante';
        const name = (E ? E.firstNames(full) : full).toLowerCase().replace(/\s+/g, '-');
        return `recordatorio-${name}-${String((row && row.dueIso) || '').slice(0, 10) || 'fecha'}.png`;
    }

    return { MOMENTS, MOMENT, SCHOOL_WA, PAY_WAYS, textFor, drawCard, loadOcto, toPngBlob, fileName, wrap };
});
