/**
 * migrate-user-roles-browser.js
 *
 * Paste this ENTIRE script into the browser console while logged in as
 * admin@ciudadbilingue.com on the web CRM.
 *
 * Purpose: some profiles have `role` (English), others have `rol` (Spanish).
 * The web app reads `role`, the mobile app reads `rol`, and the new Firebase
 * security rules check `role`. This script makes every profile have BOTH,
 * copying whichever one exists to the missing one. Same for `name`/`nombre`.
 *
 * - ADDITIVE ONLY: never overwrites an existing value, never deletes anything.
 * - Runs in DRY RUN mode first: shows what it WOULD change.
 *   To apply for real, change DRY_RUN to false and paste again.
 * - Ends with a table of every user's email + role so you can verify
 *   all accounts before deploying the new security rules.
 */

(async function migrateUserRoles() {
    const DRY_RUN = true; // <-- change to false to apply changes

    // Safety: admin only
    if (window.FirebaseData?.currentUser?.email !== 'admin@ciudadbilingue.com') {
        console.error('❌ Must be logged in as admin@ciudadbilingue.com');
        return;
    }

    const db = window.firebaseModules.database;
    const usersRef = db.ref(window.FirebaseData.database, 'users');
    const snapshot = await db.get(usersRef);

    if (!snapshot.exists()) {
        console.error('❌ No users found');
        return;
    }

    const users = snapshot.val();
    const report = [];
    const fixes = [];
    const noRole = [];

    for (const [uid, user] of Object.entries(users)) {
        const p = user.profile || {};
        const updates = {};

        // Mirror role <-> rol (fill the missing side only)
        if (p.role && !p.rol) updates[`users/${uid}/profile/rol`] = p.role;
        if (p.rol && !p.role) updates[`users/${uid}/profile/role`] = p.rol;

        // Mirror name <-> nombre (fill the missing side only)
        if (p.name && !p.nombre) updates[`users/${uid}/profile/nombre`] = p.name;
        if (p.nombre && !p.name) updates[`users/${uid}/profile/name`] = p.nombre;

        const effectiveRole = p.role || p.rol || null;
        if (!effectiveRole) noRole.push({ uid, email: p.email || '(sin email)' });

        report.push({
            email: p.email || '(sin email)',
            role: p.role || '-',
            rol: p.rol || '-',
            'role final': effectiveRole || '⚠️ NINGUNO',
            name: p.name || p.nombre || '-',
            cambios: Object.keys(updates).length
        });

        if (Object.keys(updates).length > 0) {
            fixes.push({ uid, email: p.email, updates });
        }
    }

    console.log(`\n👥 ${Object.keys(users).length} usuarios | ${fixes.length} necesitan cambios | ${noRole.length} SIN ROL\n`);
    console.table(report);

    if (noRole.length > 0) {
        console.warn('⚠️ Estos usuarios NO tienen rol. Asígnales uno en Centro Admin ANTES de desplegar las nuevas reglas:');
        console.table(noRole);
    }

    if (fixes.length === 0) {
        console.log('✅ Nada que migrar. Todos los perfiles ya tienen ambos campos.');
        return;
    }

    if (DRY_RUN) {
        console.log('🔍 DRY RUN — no se cambió nada. Cambios que se aplicarían:');
        fixes.forEach(f => console.log(`  ${f.email}:`, f.updates));
        console.log('\n👉 Para aplicar: cambia DRY_RUN a false y pega el script de nuevo.');
        return;
    }

    // Apply for real
    let applied = 0;
    for (const fix of fixes) {
        try {
            const rootRef = db.ref(window.FirebaseData.database);
            await db.update(rootRef, fix.updates);
            applied++;
            console.log(`✅ ${fix.email}`);
        } catch (e) {
            console.error(`❌ Error con ${fix.email}:`, e);
        }
    }

    // Audit log
    if (typeof window.logAudit === 'function') {
        await window.logAudit(
            'Migración de roles',
            'user',
            'bulk-migration',
            `Campos role/rol y name/nombre sincronizados en ${applied} perfiles (solo se añadieron campos faltantes)`,
            { after: { usuariosActualizados: applied } }
        );
    }

    console.log(`\n✅ Migración completa: ${applied}/${fixes.length} perfiles actualizados.`);
    console.log('👉 Verifica la tabla de arriba: cada empleado debe tener el rol correcto antes de desplegar las reglas nuevas.');
})();
