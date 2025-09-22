import { OfflineContractSimulator, runOfflineTests } from './test-offline.js';
import { AccessControlSimulator, testAccessControlSystem } from './test-access-control-offline.js';
import { MedicalRecordsSimulator, testMedicalRecordsSystem } from './test-medical-records-offline.js';

/**
 * Test complet du système médical intégré
 */
async function testCompleteSystemOffline() {
    console.log("🏥 TEST COMPLET DU SYSTÈME MÉDICAL HEDERA");
    console.log("=".repeat(60));
    console.log("🧪 Mode OFFLINE - Simulation complète\n");
    
    const startTime = Date.now();
    let allTestsPassed = true;
    
    try {
        // PHASE 1: Test PatientIdentity
        console.log("👤 PHASE 1/4: Test PatientIdentityContract");
        console.log("-".repeat(40));
        
        const patientTestResult = await runOfflineTests();
        if (!patientTestResult) {
            allTestsPassed = false;
            console.log("❌ PHASE 1 ÉCHOUÉE\n");
        } else {
            console.log("✅ PHASE 1 RÉUSSIE\n");
        }
        
        // PHASE 2: Test AccessControl
        console.log("🔐 PHASE 2/4: Test AccessControlContract");
        console.log("-".repeat(40));
        
        const accessTestResult = await testAccessControlSystem();
        if (!accessTestResult) {
            allTestsPassed = false;
            console.log("❌ PHASE 2 ÉCHOUÉE\n");
        } else {
            console.log("✅ PHASE 2 RÉUSSIE\n");
        }
        
        // PHASE 3: Test MedicalRecords
        console.log("🏥 PHASE 3/4: Test MedicalRecordsContract");
        console.log("-".repeat(40));
        
        const medicalTestResult = await testMedicalRecordsSystem();
        if (!medicalTestResult) {
            allTestsPassed = false;
            console.log("❌ PHASE 3 ÉCHOUÉE\n");
        } else {
            console.log("✅ PHASE 3 RÉUSSIE\n");
        }
        
        // PHASE 4: Test d'intégration complète
        console.log("🔗 PHASE 4/4: Test d'intégration système complet");
        console.log("-".repeat(40));
        
        const integrationTestResult = await testSystemIntegration();
        if (!integrationTestResult) {
            allTestsPassed = false;
            console.log("❌ PHASE 4 ÉCHOUÉE\n");
        } else {
            console.log("✅ PHASE 4 RÉUSSIE\n");
        }
        
        // RÉSULTATS FINAUX
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log("🏁 RÉSULTATS FINAUX");
        console.log("=".repeat(60));
        
        if (allTestsPassed) {
            console.log("🎉 TOUS LES TESTS RÉUSSIS!");
            console.log("✅ Système médical complet validé");
            console.log("✅ Prêt pour le déploiement sur Hedera Testnet");
        } else {
            console.log("❌ CERTAINS TESTS ONT ÉCHOUÉ");
            console.log("⚠️ Vérifiez les erreurs ci-dessus");
            console.log("💡 Corrigez les problèmes avant le déploiement");
        }
        
        console.log(`⏱️ Durée totale des tests: ${duration}s`);
        
        // Statistiques générales
        console.log("\n📊 STATISTIQUES GÉNÉRALES:");
        console.log(`👤 PatientIdentity: ${allTestsPassed ? '✅' : '❌'} Testé`);
        console.log(`🔐 AccessControl: ${allTestsPassed ? '✅' : '❌'} Testé`);
        console.log(`🏥 MedicalRecords: ${allTestsPassed ? '✅' : '❌'} Testé`);
        console.log(`🔗 Intégration: ${allTestsPassed ? '✅' : '❌'} Testée`);
        
        console.log("\n🚀 PROCHAINES ÉTAPES:");
        if (allTestsPassed) {
            console.log("1. Compiler tous les contrats: node scripts/compile.js");
            console.log("2. Déployer le système complet: node scripts/deploy-complete-system.js");
            console.log("3. Tester sur Hedera Testnet");
            console.log("4. Configurer les utilisateurs et permissions");
        } else {
            console.log("1. Corriger les erreurs détectées");
            console.log("2. Relancer les tests: node scripts/test-complete-system-offline.js");
            console.log("3. Une fois tous les tests verts, procéder au déploiement");
        }
        
        return allTestsPassed;
        
    } catch (error) {
        console.error(`❌ ERREUR CRITIQUE dans les tests du système: ${error.message}`);
        console.error(error.stack);
        return false;
    }
}

/**
 * Test d'intégration entre tous les contrats
 */
async function testSystemIntegration() {
    console.log("🔗 Test d'intégration système complet\n");
    
    try {
        // Initialiser tous les simulateurs
        const patientSim = new OfflineContractSimulator();
        const accessSim = new AccessControlSimulator();
        const medicalSim = new MedicalRecordsSimulator();
        
        // Acteurs du système
        const adminAddr = "0xADMIN123";
        const doctorAddr = "0xDOCTOR456";
        const nurseAddr = "0xNURSE789";
        const pharmacistAddr = "0xPHARMACIST012";
        const patientAddr = "0xPATIENT1";
        const patient2Addr = "0xPATIENT678";
        
        console.log("🏗️ Scénario d'intégration: Parcours patient complet");
        
        // ÉTAPE 1: Configuration du système
        console.log("\n1️⃣ Configuration du système et utilisateurs");
        
        // Enregistrer les professionnels
        accessSim.registerUser(adminAddr, doctorAddr, accessSim.Role.DOCTOR, "doctor_key", "DR001");
        accessSim.registerUser(adminAddr, nurseAddr, accessSim.Role.NURSE, "nurse_key", "NUR001");
        accessSim.registerUser(adminAddr, pharmacistAddr, accessSim.Role.PHARMACIST, "pharm_key", "PH001");
        
        console.log("✅ Professionnels enregistrés");
        
        // ÉTAPE 2: Enregistrement patients
        console.log("\n2️⃣ Enregistrement des patients");
        
        const patient1Id = patientSim.registerPatient(
            patientAddr,
            "encrypted_patient1_data",
            "patient1_metadata"
        );
        
        const patient2Id = patientSim.registerPatient(
            patient2Addr,
            "encrypted_patient2_data", 
            "patient2_metadata"
        );
        
        console.log(`✅ Patients enregistrés - IDs: ${patient1Id}, ${patient2Id}`);
        
        // ÉTAPE 3: Gestion des permissions
        console.log("\n3️⃣ Configuration des permissions d'accès");
        
        const futureDate = Date.now() + (30 * 24 * 60 * 60 * 1000); // Dans 30 jours
        
        // CORRECTION: Enregistrer les patients comme utilisateurs dans AccessControl d'abord
        accessSim.registerUser(adminAddr, patientAddr, accessSim.Role.PATIENT, "patient1_key", "PAT001");
        accessSim.registerUser(adminAddr, patient2Addr, accessSim.Role.PATIENT, "patient2_key", "PAT002");
        
        console.log("✅ Patients enregistrés dans AccessControl");
        
        // Maintenant les patients peuvent accorder des permissions
        const permission1 = accessSim.grantPermission(
            patientAddr, doctorAddr, patient1Id, futureDate,
            ["read", "write", "prescribe", "diagnose"]
        );
        
        // Médecin accorde accès limité à l'infirmière
        const permission2 = accessSim.grantPermission(
            doctorAddr, nurseAddr, patient1Id, futureDate,
            ["read", "monitor", "vitals"]
        );
        
        // Patient 1 accorde accès au pharmacien pour prescriptions
        const permission3 = accessSim.grantPermission(
            patientAddr, pharmacistAddr, patient1Id, futureDate,
            ["read_prescriptions", "dispense"]
        );
        
        console.log(`✅ Permissions configurées - IDs: ${permission1}, ${permission2}, ${permission3}`);
        
        // ÉTAPE 4: Consultation médicale complète
        console.log("\n4️⃣ Consultation médicale complète");
        
        // Consultation initiale
        const consultationId = medicalSim.createMedicalRecord(
            patient1Id, doctorAddr,
            medicalSim.RecordType.CONSULTATION,
            "encrypted_consultation_data",
            "consultation_hash_001",
            ["xray_hash", "blood_test_hash"],
            "Consultation - douleur abdominale",
            false
        );
        
        // Résultats de tests
        const testResultId = medicalSim.createMedicalRecord(
            patient1Id, doctorAddr,
            medicalSim.RecordType.TEST_RESULT,
            "encrypted_test_data",
            "test_hash_001",
            ["lab_report_hash"],
            "Résultats analyses sanguines",
            false
        );
        
        // Prescription
        const prescriptionId = medicalSim.createMedicalRecord(
            patient1Id, doctorAddr,
            medicalSim.RecordType.PRESCRIPTION,
            "encrypted_prescription_data",
            "prescription_hash_001",
            [],
            "Prescription - antibiotiques",
            false
        );
        
        console.log(`✅ Dossiers créés - Consultation: ${consultationId}, Test: ${testResultId}, Prescription: ${prescriptionId}`);
        
        // ÉTAPE 5: Workflow de finalisation
        console.log("\n5️⃣ Workflow de finalisation et signatures");
        
        // Finaliser les enregistrements
        medicalSim.finalizeRecord(consultationId, doctorAddr);
        medicalSim.finalizeRecord(testResultId, doctorAddr);
        medicalSim.finalizeRecord(prescriptionId, doctorAddr);
        
        // Signatures numériques
        medicalSim.signRecord(consultationId, doctorAddr, "doctor_signature_consultation", "MEDICAL_DOCTOR");
        medicalSim.signRecord(prescriptionId, doctorAddr, "doctor_signature_prescription", "PRESCRIBING_DOCTOR");
        
        console.log("✅ Enregistrements finalisés et signés");
        
        // ÉTAPE 6: Partage et accès multi-utilisateurs
        console.log("\n6️⃣ Partage et accès multi-utilisateurs");
        
        // Partager la consultation avec l'infirmière
        medicalSim.shareRecord(consultationId, doctorAddr, nurseAddr);
        
        // Partager la prescription avec le pharmacien
        medicalSim.shareRecord(prescriptionId, patientAddr, pharmacistAddr);
        
        // Tests d'accès
        const nurseCanRead = accessSim.checkPermission(nurseAddr, patient1Id, "read");
        const pharmacistCanDispense = accessSim.checkPermission(pharmacistAddr, patient1Id, "read_prescriptions");
        const unauthorizedAccess = accessSim.checkPermission("0xUNKNOWN", patient1Id, "read");
        
        console.log(`Infirmière peut lire: ${nurseCanRead}`);
        console.log(`Pharmacien peut dispenser: ${pharmacistCanDispense}`);
        console.log(`Accès non autorisé bloqué: ${!unauthorizedAccess}`);
        
        if (!nurseCanRead || !pharmacistCanDispense || unauthorizedAccess) {
            throw new Error("Problème dans la gestion des accès");
        }
        
        console.log("✅ Partage et contrôle d'accès fonctionnels");
        
        // ÉTAPE 7: Suivi et amendements
        console.log("\n7️⃣ Suivi médical et amendements");
        
        // Suivi médical
        const followUpId = medicalSim.createMedicalRecord(
            patient1Id, doctorAddr,
            medicalSim.RecordType.FOLLOW_UP,
            "encrypted_followup_data",
            "followup_hash_001",
            [],
            "Suivi post-traitement",
            false
        );
        
        // Amendement de la consultation (ajout d'informations)
        const amendmentId = medicalSim.amendMedicalRecord(
            consultationId, doctorAddr,
            "updated_consultation_data",
            "Ajout diagnostic différentiel"
        );
        
        console.log(`✅ Suivi créé: ${followUpId}, Amendement: ${amendmentId}`);
        
        // ÉTAPE 8: Situation d'urgence
        console.log("\n8️⃣ Gestion situation d'urgence");
        
        // Enregistrement d'urgence pour patient 2
        const emergencyId = medicalSim.createMedicalRecord(
            patient2Id, doctorAddr,
            medicalSim.RecordType.EMERGENCY,
            "encrypted_emergency_data",
            "emergency_hash_001",
            ["ecg_hash", "xray_emergency_hash"],
            "Urgence - infarctus suspecté",
            true // Urgence = auto-finalisé
        );
        
        // Log d'accès d'urgence
        accessSim.logAccess(doctorAddr, patient2Id, "emergency_access", true, "Accès urgence - infarctus");
        
        console.log(`✅ Urgence gérée: ${emergencyId}`);
        
        // ÉTAPE 9: Recherches et historiques
        console.log("\n9️⃣ Recherches et historiques médicaux");
        
        // Historique patient 1
        const patient1History = medicalSim.getPatientHistory(patient1Id, patientAddr);
        console.log(`Historique patient 1: ${patient1History.length} enregistrements`);
        
        // Recherches spécialisées
        const consultations = medicalSim.getRecordsByType(patient1Id, medicalSim.RecordType.CONSULTATION, doctorAddr);
        const prescriptions = medicalSim.getRecordsByType(patient1Id, medicalSim.RecordType.PRESCRIPTION, doctorAddr);
        const emergencies = medicalSim.getEmergencyRecords(patient2Id, doctorAddr);
        
        console.log(`Consultations patient 1: ${consultations.length}`);
        console.log(`Prescriptions patient 1: ${prescriptions.length}`);
        console.log(`Urgences patient 2: ${emergencies.length}`);
        
        console.log("✅ Recherches et historiques fonctionnels");
        
        // ÉTAPE 10: Vérifications d'intégrité
        console.log("\n🔟 Vérifications d'intégrité et audit");
        
        // Vérifier l'intégrité des enregistrements
        const consultationIntegrity = medicalSim.verifyRecordIntegrity(consultationId, "consultation_hash_001");
        const prescriptionIntegrity = medicalSim.verifyRecordIntegrity(prescriptionId, "prescription_hash_001");
        
        console.log(`Intégrité consultation: ${consultationIntegrity ? 'VALIDE' : 'INVALIDE'}`);
        console.log(`Intégrité prescription: ${prescriptionIntegrity ? 'VALIDE' : 'INVALIDE'}`);
        
        if (!consultationIntegrity || !prescriptionIntegrity) {
            throw new Error("Problème d'intégrité des données");
        }
        
        // Statistiques finales
        const patientStats = patientSim.getTotalPatients();
        const accessStats = accessSim.getStats();
        const medicalStats = medicalSim.getStats();
        
        console.log("\n📊 Statistiques finales du système:");
        console.log(`👥 Patients enregistrés: ${patientStats}`);
        console.log(`👤 Utilisateurs actifs: ${accessStats.activeUsers}`);
        console.log(`🔐 Permissions actives: ${accessStats.activePermissions}`);
        console.log(`📋 Dossiers médicaux: ${medicalStats.totalRecords}`);
        console.log(`🚨 Dossiers d'urgence: ${medicalStats.emergencyRecords}`);
        console.log(`✍️ Signatures totales: ${medicalStats.totalSignatures}`);
        console.log(`📝 Amendements: ${medicalStats.totalAmendments}`);
        console.log(`📊 Logs d'accès: ${accessStats.totalLogs}`);
        
        console.log("\n✅ Test d'intégration RÉUSSI!");
        console.log("🎉 Système médical complet validé!");
        
        // Tests de cohérence finale
        if (patientStats < 2) throw new Error("Nombre de patients incorrect");
        if (medicalStats.totalRecords < 5) throw new Error("Nombre d'enregistrements incorrect");
        if (accessStats.activePermissions < 3) throw new Error("Nombre de permissions incorrect");
        if (medicalStats.emergencyRecords < 1) throw new Error("Enregistrements d'urgence manquants");
        
        console.log("✅ Tous les tests de cohérence réussis!");
        
        return true;
        
    } catch (error) {
        console.error(`❌ Erreur dans le test d'intégration: ${error.message}`);
        return false;
    }
}

/**
 * Test de performance (simulation)
 */
async function testSystemPerformance() {
    console.log("\n⚡ Test de performance du système");
    
    const medicalSim = new MedicalRecordsSimulator();
    const patientSim = new OfflineContractSimulator();
    
    // Créer plusieurs patients
    console.log("📈 Création de données de test en masse...");
    
    const startTime = Date.now();
    const patientsCount = 100;
    const recordsPerPatient = 10;
    
    for (let i = 1; i <= patientsCount; i++) {
        const patientAddr = `0xPATIENT${i.toString().padStart(3, '0')}`;
        const patientId = patientSim.registerPatient(
            patientAddr,
            `encrypted_data_${i}`,
            `metadata_${i}`
        );
        
        // Créer plusieurs enregistrements par patient
        for (let j = 1; j <= recordsPerPatient; j++) {
            medicalSim.createMedicalRecord(
                patientId,
                "0xDOCTOR001",
                j % 4, // Rotation des types
                `encrypted_${i}_${j}`,
                `hash_${i}_${j}`,
                [],
                `Record ${j} for patient ${i}`,
                j % 10 === 0 // 10% d'urgences
            );
        }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const totalRecords = patientsCount * recordsPerPatient;
    
    console.log(`✅ Performance test terminé:`);
    console.log(`   👥 ${patientsCount} patients créés`);
    console.log(`   📋 ${totalRecords} enregistrements créés`);
    console.log(`   ⏱️ Durée: ${duration}ms`);
    console.log(`   🚀 ${Math.round(totalRecords / (duration / 1000))} enregistrements/seconde`);
    
    return true;
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    testCompleteSystemOffline().catch(console.error);
}

export { testCompleteSystemOffline, testSystemIntegration, testSystemPerformance };
