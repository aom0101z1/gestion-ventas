/**
 * cleanup-duplicates.js
 *
 * Script temporal para eliminar registros duplicados de estudiantes.
 * Ejecutar con: node data/cleanup-duplicates.js
 *
 * Requiere: firebase-admin (npm install firebase-admin)
 * Requiere: Service account key en data/serviceAccountKey.json
 *
 * IMPORTANTE: Este script es de un solo uso. Eliminar después de ejecutar.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://ciudad-bilingue-crm-default-rtdb.firebaseio.com'
});

const db = admin.database();

// ============================================
// CONFIGURATION
// ============================================

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
    // Muñoz Salazar - 1 duplicado sin pagos (original con typo "Emnanuel")
    'STU-1770471264863',
    // Rojas Moreno - 1 duplicado sin pagos
    'STU-1771697964113',
];

// ============================================
// SAFETY CHECKS
// ============================================

async function verifyNoPayments(studentId) {
    const paymentsSnap = await db.ref('payments').orderByChild('studentId').equalTo(studentId).once('value');
    const payments = paymentsSnap.val();
    if (payments && Object.keys(payments).length > 0) {
        throw new Error(`ABORT: Student ${studentId} has ${Object.keys(payments).length} payment(s)! Cannot delete.`);
    }
    return true;
}

async function getStudentData(studentId) {
    const snap = await db.ref(`students/${studentId}`).once('value');
    return snap.val();
}

async function verifyKeptStudentsExist() {
    console.log('\n📋 Verificando que los registros a CONSERVAR existen...');
    for (const id of KEEP_IDS) {
        const student = await getStudentData(id);
        if (!student) {
            throw new Error(`ABORT: Student to KEEP (${id}) not found!`);
        }
        console.log(`  ✅ ${id} - ${student.nombre}`);
    }
}

// ============================================
// CLEANUP FUNCTIONS
// ============================================

async function removeFromGroups(studentId) {
    const groupsSnap = await db.ref('grupos2').once('value');
    const groups = groupsSnap.val();
    if (!groups) return;

    for (const [groupId, group] of Object.entries(groups)) {
        if (group.studentIds && Array.isArray(group.studentIds)) {
            const idx = group.studentIds.indexOf(studentId);
            if (idx !== -1) {
                const newStudentIds = group.studentIds.filter(id => id !== studentId);
                await db.ref(`grupos2/${groupId}/studentIds`).set(newStudentIds);
                console.log(`    🔗 Removed from grupo ${groupId} (studentIds)`);
            }
        }
    }
}

async function logDeletion(studentId, studentName) {
    const auditRef = db.ref('auditLog').push();
    await auditRef.set({
        timestamp: new Date().toISOString(),
        activityType: 'Eliminación de registro duplicado',
        entityType: 'student',
        entityId: studentId,
        description: `Eliminación de duplicado: ${studentName} (${studentId})`,
        user: 'admin@ciudadbilingue.com',
        details: {
            reason: 'Registro duplicado sin pagos ni movimientos',
            script: 'cleanup-duplicates.js'
        }
    });
}

async function deleteStudent(studentId) {
    // 1. Get student data for logging
    const student = await getStudentData(studentId);
    if (!student) {
        console.log(`  ⚠️  ${studentId} - Ya no existe, saltando...`);
        return false;
    }

    const studentName = student.nombre || 'Sin nombre';
    console.log(`\n  🗑️  Eliminando: ${studentId} - ${studentName}`);

    // 2. Safety check: verify NO payments
    await verifyNoPayments(studentId);
    console.log(`    ✅ Sin pagos - seguro para eliminar`);

    // 3. Remove from group studentIds
    await removeFromGroups(studentId);

    // 4. Delete student record
    await db.ref(`students/${studentId}`).remove();
    console.log(`    ✅ Registro eliminado de /students`);

    // 5. Audit log
    await logDeletion(studentId, studentName);
    console.log(`    ✅ Registrado en audit log`);

    return true;
}

// ============================================
// MAIN
// ============================================

async function main() {
    console.log('🧹 Limpieza de estudiantes duplicados');
    console.log('=====================================');
    console.log(`📊 Registros a eliminar: ${DELETE_IDS.length}`);
    console.log(`📊 Registros a conservar: ${KEEP_IDS.length}`);

    // Step 1: Verify kept students exist
    await verifyKeptStudentsExist();

    // Step 2: Double-check none of the delete targets have payments
    console.log('\n🔍 Verificando que ningún duplicado tiene pagos...');
    for (const id of DELETE_IDS) {
        await verifyNoPayments(id);
        console.log(`  ✅ ${id} - sin pagos`);
    }

    // Step 3: Delete duplicates
    console.log('\n🗑️  Eliminando duplicados...');
    let deleted = 0;
    let skipped = 0;

    for (const id of DELETE_IDS) {
        try {
            const wasDeleted = await deleteStudent(id);
            if (wasDeleted) deleted++;
            else skipped++;
        } catch (err) {
            console.error(`  ❌ ERROR con ${id}: ${err.message}`);
            console.error('  ⛔ Abortando por seguridad.');
            process.exit(1);
        }
    }

    // Step 4: Final verification
    console.log('\n✅ Verificación final...');
    for (const id of KEEP_IDS) {
        const student = await getStudentData(id);
        if (!student) {
            console.error(`  ❌ ALERTA: ¡Registro conservado ${id} ya no existe!`);
        } else {
            console.log(`  ✅ ${id} - ${student.nombre} - intacto`);
        }
    }

    for (const id of DELETE_IDS) {
        const student = await getStudentData(id);
        if (student) {
            console.error(`  ⚠️  ${id} - AÚN EXISTE (no se eliminó)`);
        } else {
            console.log(`  ✅ ${id} - eliminado correctamente`);
        }
    }

    console.log(`\n📊 Resultado: ${deleted} eliminados, ${skipped} saltados`);
    console.log('🏁 Limpieza completada.');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
