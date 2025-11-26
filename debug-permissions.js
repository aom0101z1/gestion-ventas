// Debug script to check Firebase authentication and permissions
console.log('🔍 Starting permission diagnostics...');

async function checkPermissions() {
    try {
        const auth = window.firebaseModules.auth;
        const db = window.firebaseModules.database;

        // Check authentication
        const currentUser = auth.currentUser;
        console.log('👤 Current User:', currentUser ? currentUser.email : 'NOT LOGGED IN');
        console.log('🆔 User UID:', currentUser ? currentUser.uid : 'N/A');

        if (!currentUser) {
            console.error('❌ You are not logged in! Please log in first.');
            return;
        }

        // Try to read the user's own record
        console.log('📂 Attempting to read user record from /users/' + currentUser.uid);
        const userRef = db.ref(window.FirebaseData.database, 'users/' + currentUser.uid);
        const userSnapshot = await db.get(userRef);

        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            console.log('✅ User data found:', userData);
            console.log('🎭 Your role:', userData.role || 'NO ROLE SET');

            if (!userData.role) {
                console.error('❌ PROBLEM FOUND: Your user record has no "role" field!');
                console.log('💡 Solution: You need to add a role field to your user record in Firebase');
                console.log('   Path: /users/' + currentUser.uid + '/role');
                console.log('   Value: "admin" or "director"');
            } else if (userData.role !== 'admin' && userData.role !== 'director') {
                console.error('❌ PROBLEM FOUND: Your role is "' + userData.role + '" but needs to be "admin" or "director"');
            } else {
                console.log('✅ Role is correct:', userData.role);
            }
        } else {
            console.error('❌ PROBLEM FOUND: No user record found at /users/' + currentUser.uid);
            console.log('💡 Solution: Create a user record in Firebase Database');
        }

        // Try to read employees
        console.log('\n📂 Attempting to read /employees path...');
        const employeesRef = db.ref(window.FirebaseData.database, 'employees');
        const employeesSnapshot = await db.get(employeesRef);

        if (employeesSnapshot.exists()) {
            console.log('✅ Employees data accessible! Found:', Object.keys(employeesSnapshot.val()).length, 'employees');
        } else {
            console.log('⚠️ No employees data exists (this is OK if you haven\'t created any yet)');
        }

    } catch (error) {
        console.error('❌ Permission check failed:', error);
        console.error('Error details:', error.message);

        if (error.message.includes('Permission denied')) {
            console.log('\n💡 DIAGNOSIS:');
            console.log('   The Firebase rules are blocking access.');
            console.log('   This usually means:');
            console.log('   1. Your user record in /users/{uid} doesn\'t exist, OR');
            console.log('   2. Your user record exists but has no "role" field, OR');
            console.log('   3. Your role is not "admin" or "director"');
            console.log('\n📝 TO FIX IN FIREBASE CONSOLE:');
            console.log('   1. Go to Firebase Console → Realtime Database');
            console.log('   2. Navigate to: users → [your-uid] → role');
            console.log('   3. Set role to: "admin"');
        }
    }
}

// Run diagnostics when called
window.debugPermissions = checkPermissions;
console.log('✅ Debug script loaded. Run: debugPermissions()');
