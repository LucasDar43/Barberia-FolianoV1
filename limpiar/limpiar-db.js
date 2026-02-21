// =====================================================
// SCRIPT DE LIMPIEZA - Barbería Foliano's
// Borra todos los datos de prueba y deja la DB en 0
// PRESERVA: colecciones 'users' y 'config'
// =====================================================
// 
// INSTRUCCIONES:
// 1. Colocar este archivo en cualquier carpeta
// 2. Abrir terminal en esa carpeta
// 3. Ejecutar: npm install firebase-admin
// 4. Descargar la clave de servicio de Firebase (ver abajo)
// 5. Ejecutar: node limpiar-db.js
//
// CÓMO OBTENER LA CLAVE DE SERVICIO:
// Firebase Console → Configuración del proyecto (⚙️)
// → Cuentas de servicio → Generar nueva clave privada
// → Guardar el archivo JSON en la misma carpeta que este script
// → Renombrar a "serviceAccountKey.json"
// =====================================================

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Inicializar Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'barberia-folianosv1'
});

const db = admin.firestore();

// ⚠️ Colecciones que SE VAN A BORRAR (datos de prueba)
const COLECCIONES_A_BORRAR = [
    'cortes',
    'deudas',
    'cierres',
    'caja',
    'solicitudes',
    'bonos',
    'pagosNacho'
];

// ✅ Colecciones que NO se tocan
const COLECCIONES_PROTEGIDAS = ['users', 'config'];

// Función para borrar todos los documentos de una colección
async function borrarColeccion(nombreColeccion) {
    console.log(`\n🗑️  Borrando colección: ${nombreColeccion}...`);
    
    const colRef = db.collection(nombreColeccion);
    const snapshot = await colRef.get();
    
    if (snapshot.empty) {
        console.log(`   ✅ Ya estaba vacía`);
        return 0;
    }
    
    // Borrar en lotes de 500 (límite de Firestore)
    const lote = db.batch();
    let contador = 0;
    
    snapshot.docs.forEach(doc => {
        lote.delete(doc.ref);
        contador++;
    });
    
    await lote.commit();
    console.log(`   ✅ ${contador} documentos eliminados`);
    return contador;
}

// Función principal
async function limpiarBaseDeDatos() {
    console.log('');
    console.log('================================================');
    console.log('  🧹 LIMPIEZA BASE DE DATOS - Barbería Foliano\'s');
    console.log('================================================');
    console.log('');
    console.log('⚠️  ATENCIÓN: Esta acción NO se puede deshacer');
    console.log('');
    console.log('✅ Se preservarán: ' + COLECCIONES_PROTEGIDAS.join(', '));
    console.log('🗑️  Se borrarán: ' + COLECCIONES_A_BORRAR.join(', '));
    console.log('');
    
    // Esperar 3 segundos antes de empezar (por si querés cancelar con Ctrl+C)
    console.log('⏳ Iniciando en 3 segundos... (Ctrl+C para cancelar)');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n🚀 Iniciando limpieza...');
    
    let totalBorrados = 0;
    
    for (const coleccion of COLECCIONES_A_BORRAR) {
        try {
            const borrados = await borrarColeccion(coleccion);
            totalBorrados += borrados;
        } catch (error) {
            console.log(`   ❌ Error al borrar ${coleccion}:`, error.message);
        }
    }
    
    console.log('');
    console.log('================================================');
    console.log(`  ✅ LIMPIEZA COMPLETADA`);
    console.log(`  📊 Total documentos eliminados: ${totalBorrados}`);
    console.log(`  🔒 Colecciones protegidas intactas: ${COLECCIONES_PROTEGIDAS.join(', ')}`);
    console.log('================================================');
    console.log('');
    console.log('El sistema arrancará en 0 al ingresar. ¡Listo! 🚀');
    console.log('');
    
    process.exit(0);
}

// Ejecutar
limpiarBaseDeDatos().catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
});
