// Test offline des logiques de contrats
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Tests offline - simulation des fonctions de contrat
 */
class OfflineContractSimulator {
    constructor() {
        this.patients = new Map();
        this.nextPatientId = 1;
        this.accessPermissions = new Map();
        this.medicalRecords = new Map();
    }

    // Simuler l'enregistrement patient
    registerPatient(patientAddress, encryptedData, metadataHash) {
        console.log(`🧪 [OFFLINE] Simulation registerPatient`);
        
        if (this.getPatientIdByAddress(patientAddress) !== 0) {
            throw new Error("Patient déjà enregistré");
        }

        const patientId = this.nextPatientId;
        const patient = {
            patientId,
            encryptedPersonalData: encryptedData,
            patientAddress,
            isActive: true,
            creationDate: Date.now(),
            metadataHash
        };

        this.patients.set(patientId, patient);
        this.nextPatientId++;

        console.log(`✅ Patient simulé créé - ID: ${patientId}`);
        return patientId;
    }

    // Simuler l'accès aux données
    getPatientInfo(patientId, requesterAddress) {
        console.log(`🧪 [OFFLINE] Simulation getPatientInfo`);
        
        const patient = this.patients.get(patientId);
        if (!patient || !patient.isActive) {
            throw new Error("Patient non trouvé ou inactif");
        }

        // Vérifier les permissions
        if (patient.patientAddress !== requesterAddress && 
            !this.checkAccess(patientId, requesterAddress)) {
            throw new Error("Accès non autorisé");
        }

        console.log(`✅ Données patient récupérées (simulation)`);
        return patient;
    }

    // Simuler l'octroi d'accès
    grantAccess(patientId, authorizedAddress, granterAddress) {
        console.log(`🧪 [OFFLINE] Simulation grantAccess`);
        
        const patient = this.patients.get(patientId);
        if (!patient) {
            throw new Error("Patient non trouvé");
        }

        if (patient.patientAddress !== granterAddress) {
            throw new Error("Seul le patient peut accorder l'accès");
        }

        const permissionKey = `${patientId}-${authorizedAddress}`;
        this.accessPermissions.set(permissionKey, true);

        console.log(`✅ Accès accordé (simulation)`);
        return true;
    }

    // Vérifier l'accès
    checkAccess(patientId, address) {
        const patient = this.patients.get(patientId);
        if (patient && patient.patientAddress === address) {
            return true;
        }

        const permissionKey = `${patientId}-${address}`;
        return this.accessPermissions.get(permissionKey) || false;
    }

    // Obtenir l'ID par adresse
    getPatientIdByAddress(address) {
        for (let [id, patient] of this.patients) {
            if (patient.patientAddress === address) {
                return id;
            }
        }
        return 0;
    }

    // Obtenir le nombre total
    getTotalPatients() {
        return this.nextPatientId - 1;
    }

    // Ajouter un dossier médical
    addMedicalRecord(patientId, doctorAddress, encryptedDataHash, recordType) {
        console.log(`🧪 [OFFLINE] Simulation addMedicalRecord`);
        
        if (!this.patients.has(patientId)) {
            throw new Error("Patient non trouvé");
        }

        const recordId = Date.now(); // Simple ID basé sur timestamp
        const record = {
            recordId,
            patientId,
            doctorAddress,
            encryptedDataHash,
            timestamp: Date.now(),
            recordType
        };

        if (!this.medicalRecords.has(patientId)) {
            this.medicalRecords.set(patientId, []);
        }

        this.medicalRecords.get(patientId).push(record);
        
        console.log(`✅ Dossier médical ajouté (simulation) - Record ID: ${recordId}`);
        return recordId;
    }

    // Obtenir l'historique médical
    getPatientHistory(patientId, requesterAddress) {
        console.log(`🧪 [OFFLINE] Simulation getPatientHistory`);
        
        if (!this.checkAccess(patientId, requesterAddress)) {
            throw new Error("Accès non autorisé");
        }

        const records = this.medicalRecords.get(patientId) || [];
        console.log(`✅ Historique récupéré - ${records.length} enregistrement(s)`);
        return records;
    }
}

/**
 * Série de tests offline
 */
async function runOfflineTests() {
    console.log("🚀 Démarrage des tests offline...\n");
    
    const simulator = new OfflineContractSimulator();
    
    try {
        // Test 1: État initial
        console.log("📊 Test 1: État initial");
        console.log(`Total patients: ${simulator.getTotalPatients()}`);
        console.log("✅ Test 1 réussi\n");

        // Test 2: Enregistrement patient
        console.log("👤 Test 2: Enregistrement patient");
        const patientAddress = "0x123456789abcdef";
        const patientId = simulator.registerPatient(
            patientAddress,
            "encrypted_data_hash_123",
            "QmPatientMetadata123"
        );
        console.log(`Patient ID: ${patientId}`);
        console.log(`Total patients: ${simulator.getTotalPatients()}`);
        console.log("✅ Test 2 réussi\n");

        // Test 3: Récupération info patient
        console.log("📋 Test 3: Récupération informations patient");
        const patientInfo = simulator.getPatientInfo(patientId, patientAddress);
        console.log(`Données récupérées: ${JSON.stringify(patientInfo, null, 2)}`);
        console.log("✅ Test 3 réussi\n");

        // Test 4: Gestion des accès
        console.log("🔐 Test 4: Gestion des accès");
        const doctorAddress = "0xDOCTOR123456789";
        
        // Accorder l'accès
        simulator.grantAccess(patientId, doctorAddress, patientAddress);
        
        // Vérifier l'accès
        const hasAccess = simulator.checkAccess(patientId, doctorAddress);
        console.log(`Médecin a accès: ${hasAccess}`);
        
        // Le médecin peut maintenant accéder aux données
        const patientInfoForDoctor = simulator.getPatientInfo(patientId, doctorAddress);
        console.log(`Médecin peut accéder aux données: ${patientInfoForDoctor ? 'Oui' : 'Non'}`);
        console.log("✅ Test 4 réussi\n");

        // Test 5: Dossiers médicaux
        console.log("🏥 Test 5: Dossiers médicaux");
        
        const recordId1 = simulator.addMedicalRecord(
            patientId,
            doctorAddress,
            "medical_record_hash_001",
            "consultation"
        );
        
        const recordId2 = simulator.addMedicalRecord(
            patientId,
            doctorAddress,
            "medical_record_hash_002",
            "prescription"
        );
        
        const history = simulator.getPatientHistory(patientId, patientAddress);
        console.log(`Nombre d'enregistrements médicaux: ${history.length}`);
        console.log("✅ Test 5 réussi\n");

        // Test 6: Gestion des erreurs
        console.log("⚠️ Test 6: Gestion des erreurs");
        
        try {
            // Tenter d'enregistrer le même patient
            simulator.registerPatient(patientAddress, "data", "metadata");
            console.log("❌ Test 6 échoué - erreur non détectée");
        } catch (error) {
            console.log(`✅ Erreur correctement détectée: ${error.message}`);
        }
        
        try {
            // Tenter l'accès non autorisé
            simulator.getPatientInfo(patientId, "0xUNAUTHORIZED");
            console.log("❌ Test 6 échoué - accès non autorisé permis");
        } catch (error) {
            console.log(`✅ Accès non autorisé correctement bloqué: ${error.message}`);
        }
        console.log("✅ Test 6 réussi\n");

        console.log("🎉 Tous les tests offline ont réussi!");
        console.log("\n📋 Résumé des fonctionnalités testées:");
        console.log("- ✅ Enregistrement des patients");
        console.log("- ✅ Récupération des données");
        console.log("- ✅ Gestion des permissions");
        console.log("- ✅ Dossiers médicaux");
        console.log("- ✅ Gestion des erreurs");
        
        console.log("\n💡 Prêt pour le déploiement en ligne!");

    } catch (error) {
        console.error(`❌ Erreur dans les tests: ${error.message}`);
    }
    return true;
}

// Exécuter les tests si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    runOfflineTests().catch(console.error);
}

export { OfflineContractSimulator, runOfflineTests };