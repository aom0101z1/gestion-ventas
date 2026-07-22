/**
 * cleanup-duplicates-browser.js
 *
 * Paste this ENTIRE script into the browser console while logged in as admin@ciudadbilingue.com
 * on crm.tutorbox.app
 *
 * It will:
 * 1. Verify the KEEP records exist and have payments
 * 2. Verify the DELETE records have NO payments
 * 3. Delete the duplicates and remove them from groups
 * 4. Log everything to audit
 */

(async function cleanupDuplicates() {
    // Safety: admin only
    if (window.FirebaseData?.currentUser?.email !== 'admin@ciudadbilingue.com') {
        console.error('❌ Must be logged in as admin@ciudadbilingue.com');
        return;
    }

    const db = window.firebaseModules.database;

    // IDs to KEEP (have payments/active data)
    const KEEP_IDS = [
        'STU-1772143894052', // Juan Manuel Granada Giraldo - 1 pago ($200k)
        'STU-1770843286132', // Juan Esteban Gómez Bedoya - 5 pagos ($1.1M), grupo 121
        'STU-1771103257120', // Emanuel Muñoz Salazar - 1 pago ($200k)
        'STU-1771346711925', // Joel Rojas Moreno - 1 pago ($200k)
    ];

    // IDs to DELETE (no payments, duplicates)
    const DELETE_IDS = [
        // Granada Giraldo - 8 duplicados sin pagos
        'STU-1772143896298',
        'STU-1772143903096',
        'STU-1772143904825',
        'STU-1772143905039',
        'STU-1772143905218',
        'STU-1772143905418',
        'STU-1772143905605',
        'STU-1772285560066',
        // Gómez Bedoya - 1 duplicado sin pagos
        'STU-1770843399499',
        // Muñoz Salazar - 1 duplicado con typo "Enmanuel"
        'STU-1770471264863',
        // Rojas Moreno - 1 duplicado sin pagos
        'STU-1771697964113',
    ];

    // Helper: get student
    async function getStudent(id) {
        const snap = await db.get(db.ref(window.FirebaseData.database, 'students/' + id));
        return snap.exists() ? snap.val() : null;
    }

    // Helper: count payments for student
    function countPayments(studentId) {
        return Array.from(window.PaymentManager.payments.values()).filter(function(p) {
            return p.studentId === studentId;
        });
    }

    console.log('🧹 === LIMPIEZA DE ESTUDIANTES DUPLICADOS ===');
    console.log('Registros a eliminar: ' + DELETE_IDS.length);
    console.log('Registros a conservar: ' + KEEP_IDS.length);

    // Step 1: Verify KEEP records exist and have payments
    console.log('\n📋 PASO 1: Verificando registros a CONSERVAR...');
    for (var i = 0; i < KEEP_IDS.length; i++) {
        var student = await getStudent(KEEP_IDS[i]);
        if (!student) {
            console.error('❌ ABORT: ' + KEEP_IDS[i] + ' NO ENCONTRADO!');
            return;
        }
        var payments = countPayments(KEEP_IDS[i]);
        console.log('  ✅ ' + KEEP_IDS[i] + ' - ' + student.nombre + ' - ' + payments.length + ' pago(s)');
    }

    // Step 2: Verify DELETE records have NO payments
    console.log('\n🔍 PASO 2: Verificando que duplicados NO tienen pagos...');
    for (var i = 0; i < DELETE_IDS.length; i++) {
        var student = await getStudent(DELETE_IDS[i]);
        if (!student) {
            console.log('  ⚠️  ' + DELETE_IDS[i] + ' - Ya no existe, se saltará');
            continue;
        }
        var payments = countPayments(DELETE_IDS[i]);
        if (payments.length > 0) {
            console.error('❌ ABORT: ' + DELETE_IDS[i] + ' (' + student.nombre + ') tiene ' + payments.length + ' pago(s)! No se puede eliminar.');
            return;
        }
        console.log('  ✅ ' + DELETE_IDS[i] + ' - ' + student.nombre + ' - sin pagos');
    }

    // Step 3: Delete duplicates
    console.log('\n🗑️  PASO 3: Eliminando duplicados...');
    var deleted = 0;
    var skipped = 0;

    for (var i = 0; i < DELETE_IDS.length; i++) {
        var id = DELETE_IDS[i];
        var student = await getStudent(id);
        if (!student) {
            console.log('  ⚠️  ' + id + ' - Ya no existe, saltando');
            skipped++;
            continue;
        }

        var nombre = student.nombre || 'Sin nombre';

        // Remove from groups
        var groupsSnap = await db.get(db.ref(window.FirebaseData.database, 'grupos2'));
        if (groupsSnap.exists()) {
            var groups = groupsSnap.val();
            for (var groupId in groups) {
                var group = groups[groupId];
                if (group.studentIds && Array.isArray(group.studentIds)) {
                    var idx = group.studentIds.indexOf(id);
                    if (idx !== -1) {
                        var newIds = group.studentIds.filter(function(sid) { return sid !== id; });
                        await db.set(db.ref(window.FirebaseData.database, 'grupos2/' + groupId + '/studentIds'), newIds);
                        console.log('    🔗 Eliminado del grupo ' + groupId);
                    }
                }
            }
        }

        // Delete student
        await db.remove(db.ref(window.FirebaseData.database, 'students/' + id));
        window.StudentManager.students.delete(id);
        console.log('  🗑️  ' + id + ' - ' + nombre + ' - ELIMINADO');

        // Audit log
        if (typeof window.logAudit === 'function') {
            await window.logAudit(
                'Eliminación de registro duplicado',
                'student',
                id,
                'Duplicado eliminado: ' + nombre + ' (' + id + ')',
                { before: { nombre: nombre, reason: 'Registro duplicado sin pagos' } }
            );
        }

        deleted++;
    }

    // Step 4: Final verification
    console.log('\n✅ PASO 4: Verificación final...');
    for (var i = 0; i < KEEP_IDS.length; i++) {
        var student = await getStudent(KEEP_IDS[i]);
        if (!student) {
            console.error('  ❌ ALERTA: ' + KEEP_IDS[i] + ' ya no existe!');
        } else {
            console.log('  ✅ ' + KEEP_IDS[i] + ' - ' + student.nombre + ' - intacto');
        }
    }

    for (var i = 0; i < DELETE_IDS.length; i++) {
        var student = await getStudent(DELETE_IDS[i]);
        if (student) {
            console.error('  ⚠️  ' + DELETE_IDS[i] + ' - AÚN EXISTE');
        } else {
            console.log('  ✅ ' + DELETE_IDS[i] + ' - eliminado correctamente');
        }
    }

    console.log('\n📊 Resultado: ' + deleted + ' eliminados, ' + skipped + ' saltados');
    console.log('🏁 Limpieza completada. Refresca la página para ver los cambios.');
    window.showNotification('✅ Limpieza completada: ' + deleted + ' duplicados eliminados', 'success');
})();
