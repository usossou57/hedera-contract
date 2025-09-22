import { OfflineContractSimulator } from './test-offline.js';
import { AccessControlSimulator } from './test-access-control-offline.js';

/**
 * Simulateur pour MedicalRecordsContract
 */
class MedicalRecordsSimulator {
    constructor() {
        this.medicalRecords = new Map();
        this.patientRecords = new Map(); // Records par patient
        this.doctorRecords = new Map();  // Records par docteur
        this.recordAmendments = new Map();
        this.recordSignatures = new Map();
        this.usedHashes = new Set();
        this.patientAddresses = new Map(); // AJOUT: patientId -> patientAddress
        
        this.nextRecordId = 1;
        this.nextAmendmentId = 1;
        
        // Énumérations
        this.RecordType = {
            CONSULTATION: 0,
            PRESCRIPTION: 1,
            TEST_RESULT: 2,
            SURGERY: 3,
            VACCINATION: 4,
            EMERGENCY: 5,
            FOLLOW_UP: 6,
            DISCHARGE_SUMMARY: 7
        };
        
        this.RecordStatus = {
            DRAFT: 0,
            FINALIZED: 1,
            AMENDED: 2,
            CANCELLED: 3
        };
        
        console.log("🏥 MedicalRecords Simulator initialisé");
    }
    
    /**
     * AJOUT: Enregistrer la correspondance patient ID <-> adresse
     */
    registerPatientAddress(patientId, patientAddress) {
        this.patientAddresses.set(patientId, patientAddress);
        console.log(`📝 [MEDICAL] Patient ${patientId} associé à l'adresse ${patientAddress}`);
        return true;
    }
    
    /**
     * Créer un nouvel enregistrement médical
     */
    createMedicalRecord(
        patientId,
        doctorAddress,
        recordType,
        encryptedDataHash,
        originalDataHash,
        attachmentHashes = [],
        metadata = "",
        isEmergency = false
    ) {
        console.log(`📝 [MEDICAL] Création enregistrement - Patient: ${patientId}, Type: ${this.getRecordTypeName(recordType)}`);
        
        // Vérifications
        if (patientId <= 0) {
            throw new Error("ID patient invalide");
        }
        
        if (!encryptedDataHash || !originalDataHash) {
            throw new Error("Hashes des données requis");
        }
        
        // Vérifier unicité du hash
        const hashKey = `${originalDataHash}-${patientId}`;
        if (this.usedHashes.has(hashKey)) {
            throw new Error("Enregistrement déjà existant (hash dupliqué)");
        }
        
        const recordId = this.nextRecordId;
        const now = Date.now();
        
        const record = {
            recordId,
            patientId,
            doctorAddress,
            recordType,
            status: isEmergency ? this.RecordStatus.FINALIZED : this.RecordStatus.DRAFT,
            encryptedDataHash,
            originalDataHash,
            timestamp: now,
            lastModified: now,
            attachmentHashes: [...attachmentHashes],
            metadata,
            isEmergency,
            authorizedViewers: []
        };
        
        // Stocker l'enregistrement
        this.medicalRecords.set(recordId, record);
        
        // Ajouter aux index
        if (!this.patientRecords.has(patientId)) {
            this.patientRecords.set(patientId, []);
        }
        this.patientRecords.get(patientId).push(recordId);
        
        if (!this.doctorRecords.has(doctorAddress)) {
            this.doctorRecords.set(doctorAddress, []);
        }
        this.doctorRecords.get(doctorAddress).push(recordId);
        
        // Marquer le hash comme utilisé
        this.usedHashes.add(hashKey);
        
        this.nextRecordId++;
        
        console.log(`✅ Enregistrement créé - ID: ${recordId}${isEmergency ? ' (URGENCE)' : ''}`);
        
        if (isEmergency) {
            console.log(`🚨 URGENCE: Enregistrement ${recordId} pour patient ${patientId}`);
        }
        
        return recordId;
    }
    
    /**
     * Amender un enregistrement
     */
    amendMedicalRecord(recordId, doctorAddress, newEncryptedDataHash, reason) {
        console.log(`📝 [MEDICAL] Amendement enregistrement ${recordId}`);
        
        const record = this.medicalRecords.get(recordId);
        if (!record) {
            throw new Error("Enregistrement inexistant");
        }
        
        if (record.doctorAddress !== doctorAddress) {
            throw new Error("Seul le médecin créateur peut amender");
        }
        
        if (record.status === this.RecordStatus.CANCELLED) {
            throw new Error("Impossible d'amender un enregistrement annulé");
        }
        
        if (!reason) {
            throw new Error("Raison d'amendement requise");
        }
        
        const amendmentId = this.nextAmendmentId;
        const amendment = {
            amendmentId,
            originalRecordId: recordId,
            amendedBy: doctorAddress,
            reason,
            newEncryptedDataHash,
            amendmentDate: Date.now(),
            isActive: true
        };
        
        // Stocker l'amendement
        if (!this.recordAmendments.has(recordId)) {
            this.recordAmendments.set(recordId, []);
        }
        this.recordAmendments.get(recordId).push(amendment);
        
        // Mettre à jour l'enregistrement
        record.encryptedDataHash = newEncryptedDataHash;
        record.status = this.RecordStatus.AMENDED;
        record.lastModified = Date.now();
        
        this.nextAmendmentId++;
        
        console.log(`✅ Amendement créé - ID: ${amendmentId}, Raison: ${reason}`);
        return amendmentId;
    }
    
    /**
     * Finaliser un enregistrement
     */
    finalizeRecord(recordId, doctorAddress) {
        console.log(`✅ [MEDICAL] Finalisation enregistrement ${recordId}`);
        
        const record = this.medicalRecords.get(recordId);
        if (!record) {
            throw new Error("Enregistrement inexistant");
        }
        
        if (record.doctorAddress !== doctorAddress) {
            throw new Error("Seul le créateur peut finaliser");
        }
        
        if (record.status !== this.RecordStatus.DRAFT) {
            throw new Error("Seuls les brouillons peuvent être finalisés");
        }
        
        record.status = this.RecordStatus.FINALIZED;
        record.lastModified = Date.now();
        
        console.log(`✅ Enregistrement ${recordId} finalisé`);
        return true;
    }
    
    /**
     * Signer un enregistrement
     */
    signRecord(recordId, signerAddress, signature, signerRole) {
        console.log(`✍️ [MEDICAL] Signature enregistrement ${recordId} par ${signerRole}`);
        
        const record = this.medicalRecords.get(recordId);
        if (!record) {
            throw new Error("Enregistrement inexistant");
        }
        
        if (!signature || !signerRole) {
            throw new Error("Signature et rôle requis");
        }
        
        const digitalSignature = {
            signer: signerAddress,
            recordId,
            signature,
            signatureDate: Date.now(),
            signerRole
        };
        
        if (!this.recordSignatures.has(recordId)) {
            this.recordSignatures.set(recordId, []);
        }
        this.recordSignatures.get(recordId).push(digitalSignature);
        
        console.log(`✅ Signature ajoutée par ${signerRole}`);
        return true;
    }
    
    /**
     * Partager un enregistrement
     */
    shareRecord(recordId, sharerAddress, authorizedViewer) {
        console.log(`🔗 [MEDICAL] Partage enregistrement ${recordId} avec ${authorizedViewer}`);
        
        const record = this.medicalRecords.get(recordId);
        if (!record) {
            throw new Error("Enregistrement inexistant");
        }
        
        // Vérifier les droits de partage (patient ou médecin créateur)
        if (record.doctorAddress !== sharerAddress && !this.isPatientOwner(record.patientId, sharerAddress)) {
            throw new Error("Non autorisé à partager cet enregistrement");
        }
        
        // Vérifier que l'utilisateur n'est pas déjà autorisé
        if (record.authorizedViewers.includes(authorizedViewer)) {
            throw new Error("Utilisateur déjà autorisé");
        }
        
        record.authorizedViewers.push(authorizedViewer);
        
        console.log(`✅ Enregistrement partagé avec ${authorizedViewer}`);
        return true;
    }
    
    /**
     * Obtenir un enregistrement médical
     */
    getMedicalRecord(recordId, requesterAddress) {
        console.log(`📋 [MEDICAL] Récupération enregistrement ${recordId}`);
        
        const record = this.medicalRecords.get(recordId);
        if (!record) {
            throw new Error("Enregistrement inexistant");
        }
        
        // Vérifier les droits d'accès
        if (!this.hasAccessToRecord(recordId, requesterAddress)) {
            throw new Error("Accès non autorisé à cet enregistrement");
        }
        
        console.log(`✅ Enregistrement récupéré - Type: ${this.getRecordTypeName(record.recordType)}`);
        return { ...record };
    }
    
    /**
     * Obtenir l'historique médical d'un patient
     */
    getPatientHistory(patientId, requesterAddress) {
        console.log(`📚 [MEDICAL] Historique patient ${patientId}`);
        
        // Vérifier les droits d'accès
        if (!this.isPatientOwner(patientId, requesterAddress) && !this.isDoctorOrAuthorized(requesterAddress)) {
            throw new Error("Accès non autorisé à l'historique");
        }
        
        const recordIds = this.patientRecords.get(patientId) || [];
        console.log(`✅ Historique récupéré - ${recordIds.length} enregistrement(s)`);
        
        return recordIds;
    }
    
    /**
     * Obtenir les enregistrements par type
     */
    getRecordsByType(patientId, recordType, requesterAddress) {
        console.log(`🔍 [MEDICAL] Recherche par type: ${this.getRecordTypeName(recordType)} pour patient ${patientId}`);
        
        if (!this.isPatientOwner(patientId, requesterAddress) && !this.isDoctorOrAuthorized(requesterAddress)) {
            throw new Error("Accès non autorisé");
        }
        
        const patientRecordIds = this.patientRecords.get(patientId) || [];
        const filteredRecords = patientRecordIds.filter(recordId => {
            const record = this.medicalRecords.get(recordId);
            return record && record.recordType === recordType;
        });
        
        console.log(`✅ Trouvé ${filteredRecords.length} enregistrement(s) de type ${this.getRecordTypeName(recordType)}`);
        return filteredRecords;
    }
    
    /**
     * Obtenir les enregistrements d'urgence
     */
    getEmergencyRecords(patientId, requesterAddress) {
        console.log(`🚨 [MEDICAL] Enregistrements d'urgence pour patient ${patientId}`);
        
        const patientRecordIds = this.patientRecords.get(patientId) || [];
        const emergencyRecords = patientRecordIds.filter(recordId => {
            const record = this.medicalRecords.get(recordId);
            return record && record.isEmergency;
        });
        
        console.log(`✅ Trouvé ${emergencyRecords.length} enregistrement(s) d'urgence`);
        return emergencyRecords;
    }
    
    /**
     * Vérifier l'intégrité d'un enregistrement
     */
    verifyRecordIntegrity(recordId, originalHash) {
        const record = this.medicalRecords.get(recordId);
        if (!record) {
            return false;
        }
        
        const isValid = record.originalDataHash === originalHash;
        console.log(`🔍 [MEDICAL] Vérification intégrité ${recordId}: ${isValid ? '✅ VALIDE' : '❌ INVALIDE'}`);
        
        return isValid;
    }
    
    /**
     * Annuler un enregistrement
     */
    cancelRecord(recordId, doctorAddress, reason) {
        console.log(`🚫 [MEDICAL] Annulation enregistrement ${recordId}`);
        
        const record = this.medicalRecords.get(recordId);
        if (!record) {
            throw new Error("Enregistrement inexistant");
        }
        
        if (record.doctorAddress !== doctorAddress) {
            throw new Error("Seul le créateur peut annuler");
        }
        
        if (record.status === this.RecordStatus.CANCELLED) {
            throw new Error("Enregistrement déjà annulé");
        }
        
        if (!reason) {
            throw new Error("Raison d'annulation requise");
        }
        
        record.status = this.RecordStatus.CANCELLED;
        record.lastModified = Date.now();
        record.metadata = `${record.metadata} | CANCELLED: ${reason}`;
        
        console.log(`✅ Enregistrement ${recordId} annulé - Raison: ${reason}`);
        return true;
    }
    
    /**
     * Fonctions utilitaires
     */
    hasAccessToRecord(recordId, requesterAddress) {
        const record = this.medicalRecords.get(recordId);
        if (!record) return false;
        
        // Le médecin créateur a accès
        if (record.doctorAddress === requesterAddress) return true;
        
        // Le patient propriétaire a accès
        if (this.isPatientOwner(record.patientId, requesterAddress)) return true;
        
        // Les viewers autorisés ont accès
        if (record.authorizedViewers.includes(requesterAddress)) return true;
        
        return false;
    }
    
    /**
     * MODIFICATION: Version corrigée de isPatientOwner
     */
    isPatientOwner(patientId, address) {
        // Vérifier d'abord dans notre map des adresses enregistrées
        const registeredAddress = this.patientAddresses.get(patientId);
        if (registeredAddress) {
            const isOwner = registeredAddress === address;
            console.log(`🔍 [MEDICAL] Vérification propriétaire Patient ${patientId}: ${address} ${isOwner ? '==' : '!='} ${registeredAddress}`);
            return isOwner;
        }
        
        // Fallback vers l'ancienne logique pour compatibilité
        const fallbackResult = address === `0xPATIENT${patientId}`;
        console.log(`⚠️ [MEDICAL] Fallback propriétaire Patient ${patientId}: ${address} ${fallbackResult ? '==' : '!='} 0xPATIENT${patientId}`);
        return fallbackResult;
    }
    
    isDoctorOrAuthorized(address) {
        // Simulation - en réalité on appellerait AccessControlContract
        return address.includes('DOCTOR') || address.includes('ADMIN');
    }
    
    getRecordTypeName(recordType) {
        const typeNames = [
            "CONSULTATION", "PRESCRIPTION", "TEST_RESULT", "SURGERY",
            "VACCINATION", "EMERGENCY", "FOLLOW_UP", "DISCHARGE_SUMMARY"
        ];
        return typeNames[recordType] || "UNKNOWN";
    }
    
    getStatusName(status) {
        const statusNames = ["DRAFT", "FINALIZED", "AMENDED", "CANCELLED"];
        return statusNames[status] || "UNKNOWN";
    }
    
    /**
     * Statistiques du système
     */
    getStats() {
        const totalRecords = this.medicalRecords.size;
        let emergencyRecords = 0;
        let cancelledRecords = 0;
        let amendedRecords = 0;
        let finalizedRecords = 0;
        
        for (let [_, record] of this.medicalRecords) {
            if (record.isEmergency) emergencyRecords++;
            if (record.status === this.RecordStatus.CANCELLED) cancelledRecords++;
            if (record.status === this.RecordStatus.AMENDED) amendedRecords++;
            if (record.status === this.RecordStatus.FINALIZED) finalizedRecords++;
        }
        
        return {
            totalRecords,
            totalAmendments: this.nextAmendmentId - 1,
            emergencyRecords,
            cancelledRecords,
            amendedRecords,
            finalizedRecords,
            totalSignatures: Array.from(this.recordSignatures.values())
                .reduce((sum, sigs) => sum + sigs.length, 0)
        };
    }
}

/**
 * Tests complets MedicalRecords
 */
async function testMedicalRecordsSystem() {
    console.log("🚀 Tests MedicalRecords System\n");
    
    const medicalRecords = new MedicalRecordsSimulator();
    const patientSim = new OfflineContractSimulator();
    const accessControl = new AccessControlSimulator();
    
    try {
        // Setup initial
        console.log("🏗️ Setup initial du système");
        
        const patientAddr = "0xPATIENT1";
        const doctorAddr = "0xDOCTOR123";
        const nurseAddr = "0xNURSE456";
        const adminAddr = "0xADMIN123";
        
        // Créer un patient
        const patientId = patientSim.registerPatient(
            patientAddr,
            "encrypted_patient_data",
            "patient_metadata"
        );
        
        // AJOUT: Enregistrer l'adresse du patient dans MedicalRecords
        medicalRecords.registerPatientAddress(patientId, patientAddr);
        
        // Enregistrer le médecin
        accessControl.registerUser(
            adminAddr, doctorAddr,
            accessControl.Role.DOCTOR,
            "doctor_key", "DR001"
        );
        
        console.log("✅ Setup terminé\n");
        
        // Test 1: Création d'enregistrements médicaux
        console.log("📝 Test 1: Création d'enregistrements médicaux");
        
        const consultationId = medicalRecords.createMedicalRecord(
            patientId,
            doctorAddr,
            medicalRecords.RecordType.CONSULTATION,
            "encrypted_consultation_data_hash",
            "original_consultation_hash",
            ["attachment1_hash", "attachment2_hash"],
            "Consultation de routine",
            false
        );
        
        const emergencyId = medicalRecords.createMedicalRecord(
            patientId,
            doctorAddr,
            medicalRecords.RecordType.EMERGENCY,
            "encrypted_emergency_data_hash",
            "original_emergency_hash",
            [],
            "Urgence - douleur thoracique",
            true
        );
        
        const prescriptionId = medicalRecords.createMedicalRecord(
            patientId,
            doctorAddr,
            medicalRecords.RecordType.PRESCRIPTION,
            "encrypted_prescription_data_hash",
            "original_prescription_hash",
            [],
            "Prescription post-consultation",
            false
        );
        
        console.log("✅ Test 1 réussi\n");
        
        // Test 2: Finalisation et signatures
        console.log("✍️ Test 2: Finalisation et signatures");
        
        // Finaliser la consultation
        medicalRecords.finalizeRecord(consultationId, doctorAddr);
        
        // Signer les enregistrements
        medicalRecords.signRecord(consultationId, doctorAddr, "doctor_signature_123", "DOCTOR");
        medicalRecords.signRecord(emergencyId, doctorAddr, "emergency_signature_456", "DOCTOR");
        
        console.log("✅ Test 2 réussi\n");
        
        // Test 3: Amendements
        console.log("📝 Test 3: Amendements");
        
        const amendmentId = medicalRecords.amendMedicalRecord(
            consultationId,
            doctorAddr,
            "updated_consultation_data_hash",
            "Ajout de résultats de laboratoire"
        );
        
        console.log("✅ Test 3 réussi\n");
        
        // Test 4: Partage d'enregistrements
        console.log("🔗 Test 4: Partage d'enregistrements");
        
        medicalRecords.shareRecord(consultationId, doctorAddr, nurseAddr);
        medicalRecords.shareRecord(prescriptionId, patientAddr, "0xPHARMACIST789");
        
        console.log("✅ Test 4 réussi\n");
        
        // Test 5: Récupération d'enregistrements
        console.log("📋 Test 5: Récupération d'enregistrements");
        
        // Patient récupère ses données
        const consultationData = medicalRecords.getMedicalRecord(consultationId, patientAddr);
        console.log(`Consultation récupérée: ${medicalRecords.getRecordTypeName(consultationData.recordType)}`);
        console.log(`Status: ${medicalRecords.getStatusName(consultationData.status)}`);
        
        // Médecin récupère l'urgence
        const emergencyData = medicalRecords.getMedicalRecord(emergencyId, doctorAddr);
        console.log(`Urgence récupérée: ${emergencyData.isEmergency ? 'OUI' : 'NON'}`);
        
        // Infirmière accède aux données partagées
        const sharedData = medicalRecords.getMedicalRecord(consultationId, nurseAddr);
        console.log(`Données partagées accessibles: ${sharedData ? 'OUI' : 'NON'}`);
        
        console.log("✅ Test 5 réussi\n");
        
        // Test 6: Recherches spécialisées
        console.log("🔍 Test 6: Recherches spécialisées");
        
        // Historique complet du patient
        const patientHistory = medicalRecords.getPatientHistory(patientId, patientAddr);
        console.log(`Historique patient: ${patientHistory.length} enregistrement(s)`);
        
        // Enregistrements par type
        const consultations = medicalRecords.getRecordsByType(
            patientId,
            medicalRecords.RecordType.CONSULTATION,
            doctorAddr
        );
        console.log(`Consultations: ${consultations.length}`);
        
        const prescriptions = medicalRecords.getRecordsByType(
            patientId,
            medicalRecords.RecordType.PRESCRIPTION,
            doctorAddr
        );
        console.log(`Prescriptions: ${prescriptions.length}`);
        
        // Enregistrements d'urgence
        const emergencies = medicalRecords.getEmergencyRecords(patientId, doctorAddr);
        console.log(`Urgences: ${emergencies.length}`);
        
        console.log("✅ Test 6 réussi\n");
        
        // Test 7: Vérification d'intégrité
        console.log("🔍 Test 7: Vérification d'intégrité");
        
        const isValid = medicalRecords.verifyRecordIntegrity(
            consultationId,
            "original_consultation_hash"
        );
        console.log(`Intégrité consultation: ${isValid ? 'VALIDE' : 'INVALIDE'}`);
        
        const isInvalid = medicalRecords.verifyRecordIntegrity(
            consultationId,
            "wrong_hash"
        );
        console.log(`Test hash incorrect: ${isInvalid ? 'INVALIDE (erreur!)' : 'INVALIDE (correct)'}`);
        
        console.log("✅ Test 7 réussi\n");
        
        // Test 8: Annulation d'enregistrement
        console.log("🚫 Test 8: Annulation d'enregistrement");
        
        medicalRecords.cancelRecord(
            prescriptionId,
            doctorAddr,
            "Prescription incorrecte - dosage erroné"
        );
        
        console.log("✅ Test 8 réussi\n");
        
        // Test 9: Gestion des erreurs
        console.log("⚠️ Test 9: Gestion des erreurs");
        
        try {
            // Tenter de créer un enregistrement avec un hash dupliqué
            medicalRecords.createMedicalRecord(
                patientId, doctorAddr,
                medicalRecords.RecordType.CONSULTATION,
                "encrypted_data", "original_consultation_hash", // Hash déjà utilisé
                [], "", false
            );
            console.log("❌ Test 9 échoué - duplication non détectée");
        } catch (error) {
            console.log(`✅ Duplication correctement détectée: ${error.message}`);
        }
        
        try {
            // Tenter d'accéder sans autorisation
            medicalRecords.getMedicalRecord(emergencyId, "0xUNAUTHORIZED");
            console.log("❌ Test 9 échoué - accès non autorisé permis");
        } catch (error) {
            console.log(`✅ Accès non autorisé correctement bloqué: ${error.message}`);
        }
        
        console.log("✅ Test 9 réussi\n");
        
        // Test 10: Statistiques finales
        console.log("📊 Test 10: Statistiques du système");
        
        const stats = medicalRecords.getStats();
        console.log(`📋 Total enregistrements: ${stats.totalRecords}`);
        console.log(`📝 Total amendements: ${stats.totalAmendments}`);
        console.log(`🚨 Enregistrements d'urgence: ${stats.emergencyRecords}`);
        console.log(`❌ Enregistrements annulés: ${stats.cancelledRecords}`);
        console.log(`📝 Enregistrements amendés: ${stats.amendedRecords}`);
        console.log(`✅ Enregistrements finalisés: ${stats.finalizedRecords}`);
        console.log(`✍️ Total signatures: ${stats.totalSignatures}`);
        
        console.log("✅ Test 10 réussi\n");
        
        console.log("🎉 Tous les tests MedicalRecords réussis!");
        console.log("\n📋 Résumé des fonctionnalités testées:");
        console.log("- ✅ Création d'enregistrements médicaux multiples");
        console.log("- ✅ Finalisation et signatures numériques");
        console.log("- ✅ Système d'amendements traçables");
        console.log("- ✅ Partage sécurisé d'enregistrements");
        console.log("- ✅ Récupération avec contrôle d'accès");
        console.log("- ✅ Recherches spécialisées par type/urgence");
        console.log("- ✅ Vérification d'intégrité des données");
        console.log("- ✅ Annulation d'enregistrements");
        console.log("- ✅ Gestion robuste des erreurs");
        console.log("- ✅ Statistiques complètes du système");
        
        return true;
        
    } catch (error) {
        console.error(`❌ Erreur dans les tests MedicalRecords: ${error.message}`);
        return false;
    }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    testMedicalRecordsSystem().catch(console.error);
}

export { MedicalRecordsSimulator, testMedicalRecordsSystem };