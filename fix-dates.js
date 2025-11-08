// ==================================================================================
// FIX-DATES.JS - Script para corregir fechas incorrectas por timezone issue
// ==================================================================================
//
// Este script corrige registros que se guardaron con fecha 2025-11-08
// cuando deberían haberse guardado con 2025-11-07 (problema de timezone UTC vs Colombia)
//
// USO: Ejecutar en la consola del navegador cuando estés en la app
// Instrucciones:
// 1. Abre la app en el navegador
// 2. Abre la consola (F12)
// 3. Ejecuta: fixDatesFromUTCtoColombia()
//
// ==================================================================================

/**
 * Función principal para corregir todas las fechas incorrectas
 */
async function fixDatesFromUTCtoColombia() {
    console.log('🔧 Iniciando corrección de fechas...');
    console.log('📅 Corrigiendo: 2025-11-08 → 2025-11-07');

    const wrongDate = '2025-11-08';
    const correctDate = '2025-11-07';

    let report = {
        payments: 0,
        sales: 0,
        reconciliations: 0,
        expenses: 0,
        inventoryMovements: 0,
        errors: []
    };

    try {
        // Verificar que Firebase está disponible
        if (!window.firebaseModules?.database) {
            throw new Error('❌ Firebase no está disponible. Asegúrate de estar en la app.');
        }

        const db = window.firebaseModules.database;

        // ============================================
        // 1. CORREGIR PAGOS (payments)
        // ============================================
        console.log('\n💰 Corrigiendo pagos...');
        try {
            const paymentsRef = db.ref(window.FirebaseData.database, 'payments');
            const paymentsSnapshot = await db.get(paymentsRef);

            if (paymentsSnapshot.exists()) {
                const payments = paymentsSnapshot.val();
                for (const [id, payment] of Object.entries(payments)) {
                    if (payment.date && payment.date.startsWith(wrongDate)) {
                        const newDate = payment.date.replace(wrongDate, correctDate);
                        const paymentRef = db.ref(window.FirebaseData.database, `payments/${id}`);
                        await db.update(paymentRef, { date: newDate });
                        report.payments++;
                        console.log(`  ✓ Pago ${id}: ${payment.date} → ${newDate}`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error corrigiendo pagos:', error);
            report.errors.push(`Pagos: ${error.message}`);
        }

        // ============================================
        // 2. CORREGIR VENTAS (sales)
        // ============================================
        console.log('\n🛒 Corrigiendo ventas...');
        try {
            const salesRef = db.ref(window.FirebaseData.database, 'sales');
            const salesSnapshot = await db.get(salesRef);

            if (salesSnapshot.exists()) {
                const sales = salesSnapshot.val();
                for (const [id, sale] of Object.entries(sales)) {
                    if (sale.date && sale.date.startsWith(wrongDate)) {
                        const newDate = sale.date.replace(wrongDate, correctDate);
                        const saleRef = db.ref(window.FirebaseData.database, `sales/${id}`);
                        await db.update(saleRef, { date: newDate });
                        report.sales++;
                        console.log(`  ✓ Venta ${id}: ${sale.date} → ${newDate}`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error corrigiendo ventas:', error);
            report.errors.push(`Ventas: ${error.message}`);
        }

        // ============================================
        // 3. CORREGIR RECONCILIACIONES (dailyReconciliations)
        // ============================================
        console.log('\n💵 Corrigiendo reconciliaciones de caja...');
        try {
            const reconciliationRef = db.ref(window.FirebaseData.database, `dailyReconciliations/${wrongDate}`);
            const reconciliationSnapshot = await db.get(reconciliationRef);

            if (reconciliationSnapshot.exists()) {
                const reconciliation = reconciliationSnapshot.val();

                // Actualizar la fecha dentro del objeto
                reconciliation.date = correctDate;

                // Guardar en la nueva ubicación (con la fecha correcta como key)
                const newRef = db.ref(window.FirebaseData.database, `dailyReconciliations/${correctDate}`);
                await db.set(newRef, reconciliation);

                // Eliminar el registro antiguo
                await db.remove(reconciliationRef);

                report.reconciliations++;
                console.log(`  ✓ Reconciliación: ${wrongDate} → ${correctDate}`);
            }
        } catch (error) {
            console.error('❌ Error corrigiendo reconciliaciones:', error);
            report.errors.push(`Reconciliaciones: ${error.message}`);
        }

        // ============================================
        // 4. CORREGIR GASTOS (expenses)
        // ============================================
        console.log('\n💸 Corrigiendo gastos...');
        try {
            const expensesRef = db.ref(window.FirebaseData.database, 'expenses');
            const expensesSnapshot = await db.get(expensesRef);

            if (expensesSnapshot.exists()) {
                const expenses = expensesSnapshot.val();
                for (const [id, expense] of Object.entries(expenses)) {
                    if (expense.date && expense.date === wrongDate) {
                        const expenseRef = db.ref(window.FirebaseData.database, `expenses/${id}`);
                        await db.update(expenseRef, { date: correctDate });
                        report.expenses++;
                        console.log(`  ✓ Gasto ${id}: ${wrongDate} → ${correctDate}`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error corrigiendo gastos:', error);
            report.errors.push(`Gastos: ${error.message}`);
        }

        // ============================================
        // 5. CORREGIR MOVIMIENTOS DE INVENTARIO (inventory-movements)
        // ============================================
        console.log('\n📦 Corrigiendo movimientos de inventario...');
        try {
            const movementsRef = db.ref(window.FirebaseData.database, 'inventory-movements');
            const movementsSnapshot = await db.get(movementsRef);

            if (movementsSnapshot.exists()) {
                const movements = movementsSnapshot.val();
                for (const [id, movement] of Object.entries(movements)) {
                    if (movement.date && movement.date.startsWith(wrongDate)) {
                        const newDate = movement.date.replace(wrongDate, correctDate);
                        const movementRef = db.ref(window.FirebaseData.database, `inventory-movements/${id}`);
                        await db.update(movementRef, { date: newDate });
                        report.inventoryMovements++;
                        console.log(`  ✓ Movimiento ${id}: ${movement.date} → ${newDate}`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error corrigiendo movimientos:', error);
            report.errors.push(`Movimientos: ${error.message}`);
        }

        // ============================================
        // REPORTE FINAL
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('✅ CORRECCIÓN COMPLETADA');
        console.log('='.repeat(60));
        console.log(`💰 Pagos corregidos:           ${report.payments}`);
        console.log(`🛒 Ventas corregidas:          ${report.sales}`);
        console.log(`💵 Reconciliaciones corregidas: ${report.reconciliations}`);
        console.log(`💸 Gastos corregidos:          ${report.expenses}`);
        console.log(`📦 Movimientos corregidos:     ${report.inventoryMovements}`);
        console.log('─'.repeat(60));
        console.log(`📊 TOTAL:                      ${report.payments + report.sales + report.reconciliations + report.expenses + report.inventoryMovements} registros corregidos`);

        if (report.errors.length > 0) {
            console.log('\n⚠️ ERRORES ENCONTRADOS:');
            report.errors.forEach(err => console.log(`  • ${err}`));
        }

        console.log('\n💡 Ahora recarga la página para ver los datos corregidos.');
        console.log('='.repeat(60));

        return report;

    } catch (error) {
        console.error('❌ Error general en la corrección:', error);
        throw error;
    }
}

// Exportar la función globalmente
window.fixDatesFromUTCtoColombia = fixDatesFromUTCtoColombia;

console.log('🔧 Script de corrección cargado.');
console.log('📝 Para ejecutar, escribe en la consola: fixDatesFromUTCtoColombia()');
