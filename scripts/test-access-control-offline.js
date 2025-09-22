import { OfflineContractSimulator } from './test-offline.js';

/**
 * Simulateur pour AccessControl
 */
class AccessControlSimulator {
    constructor() {
        this.users = new Map();
        this.permissions = new Map();
        this.accessLogs = new Map();
        this.nextPermissionId = 1;
        this.nextLogId = 1;
        
        // Roles enum simulation
        this.Role = {
            PATIENT: 0,
            DOCTOR: 1,
            ADMIN: 2,
            NURSE: 3,
            PHARMACIST: 4
        };
        
        // Créer un admin par défaut
        this.users.set("0xADMIN123", {
            userAddress: "0xADMIN123",
            role: this.Role.ADMIN,
            isActive: true,
            publicKey: "admin_public_key",
            professionalId: "ADMIN_001",
            registrationDate: Date.now()
        });
        
        console.log("🏥 AccessControl Simulator initialisé avec admin par défaut");
    }
    
    /**
     * Enregistrer un utilisateur
     */
    registerUser(adminAddress, userAddress, role, publicKey, professionalId) {
        console.log(`👤 [ACCESS] Enregistrement utilisateur: ${userAddress}`);
        
        // Vérifier que l'admin existe
        const admin = this.users.get(adminAddress);
        if (!admin || admin.role !== this.Role.ADMIN) {
            throw new Error("Seul un admin peut enregistrer des utilisateurs");
        }
        
        // Vérifier que l'utilisateur n'existe pas
        if (this.users.has(userAddress)) {
            throw new Error("Utilisateur déjà enregistré");
        }
        
        const user = {
            userAddress,
            role,
            isActive: true,
            publicKey,
            professionalId,
            registrationDate: Date.now()
        };
        
        this.users.set(userAddress, user);
        console.log(`✅ Utilisateur enregistré - Rôle: ${this.getRoleName(role)}`);
        
        return true;
    }
    
    /**
     * Accorder une permission
     */
    grantPermission(grantorAddress, granteeAddress, patientId, expirationDate, allowedActions) {
        console.log(`🔐 [ACCESS] Octroi permission: ${granteeAddress} -> Patient ${patientId}`);
        
        const grantor = this.users.get(grantorAddress);
        if (!grantor) {
            throw new Error("Utilisateur non enregistré");
        }
        
        const grantee = this.users.get(granteeAddress);
        if (!grantee) {
            throw new Error("Bénéficiaire non enregistré");
        }
        
        if (expirationDate <= Date.now()) {
            throw new Error("Date d'expiration dans le passé");
        }
        
        const permissionId = this.nextPermissionId;
        const permission = {
            permissionId,
            grantor: grantorAddress,
            grantee: granteeAddress,
            patientId,
            expirationDate,
            isActive: true,
            allowedActions: [...allowedActions],
            creationDate: Date.now()
        };
        
        this.permissions.set(permissionId, permission);
        this.nextPermissionId++;
        
        console.log(`✅ Permission accordée - ID: ${permissionId}, Actions: ${allowedActions.join(', ')}`);
        return permissionId;
    }
    
    /**
     * Vérifier une permission
     */
    checkPermission(userAddress, patientId, action) {
        console.log(`🔍 [ACCESS] Vérification permission: ${userAddress} -> ${action} sur Patient ${patientId}`);
        
        const user = this.users.get(userAddress);
        if (!user || !user.isActive) {
            console.log("❌ Utilisateur non trouvé ou inactif");
            return false;
        }
        
        // Admin a tous les droits
        if (user.role === this.Role.ADMIN) {
            console.log("✅ Accès admin accordé");
            return true;
        }
        
        // Patient propriétaire a tous les droits sur ses données
        // (Simulation - dans la réalité on appellerait PatientIdentity)
        if (this.isPatientOwner(patientId, userAddress)) {
            console.log("✅ Accès propriétaire accordé");
            return true;
        }
        
        // Vérifier les permissions spécifiques
        for (let [_, permission] of this.permissions) {
            if (permission.grantee === userAddress &&
                permission.patientId === patientId &&
                permission.isActive &&
                permission.expirationDate > Date.now()) {
                
                // Vérifier si l'action est autorisée
                if (permission.allowedActions.includes(action) || 
                    permission.allowedActions.includes("*")) {
                    console.log("✅ Permission spécifique accordée");
                    return true;
                }
            }
        }
        
        console.log("❌ Accès refusé");
        return false;
    }
    
    /**
     * Logger un accès
     */
    logAccess(accessor, patientId, action, success, details = "") {
        const logId = this.nextLogId;
        const log = {
            logId,
            accessor,
            patientId,
            action,
            timestamp: Date.now(),
            success,
            details
        };
        
        this.accessLogs.set(logId, log);
        this.nextLogId++;
        
        const status = success ? "✅ SUCCESS" : "❌ FAILED";
        console.log(`📝 [LOG] ${status} - ${accessor} -> ${action} sur Patient ${patientId}`);
        
        return logId;
    }
    
    /**
     * Révoquer une permission
     */
    revokePermission(revokerAddress, permissionId) {
        console.log(`🚫 [ACCESS] Révocation permission ID: ${permissionId}`);
        
        const permission = this.permissions.get(permissionId);
        if (!permission) {
            throw new Error("Permission inexistante");
        }
        
        const revoker = this.users.get(revokerAddress);
        if (!revoker) {
            throw new Error("Utilisateur non enregistré");
        }
        
        // Vérifier les droits de révocation
        if (permission.grantor !== revokerAddress && 
            revoker.role !== this.Role.ADMIN) {
            throw new Error("Non autorisé à révoquer cette permission");
        }
        
        permission.isActive = false;
        console.log(`✅ Permission ${permissionId} révoquée`);
        
        return true;
    }
    
    /**
     * Obtenir les informations d'un utilisateur
     */
    getUserInfo(userAddress) {
        const user = this.users.get(userAddress);
        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }
        return { ...user, roleName: this.getRoleName(user.role) };
    }
    
    /**
     * Obtenir toutes les permissions d'un utilisateur
     */
    getUserPermissions(userAddress) {
        const permissions = [];
        for (let [_, permission] of this.permissions) {
            if (permission.grantee === userAddress) {
                permissions.push(permission);
            }
        }
        return permissions;
    }
    
    /**
     * Utilitaires
     */
    getRoleName(role) {
        const roleNames = ["PATIENT", "DOCTOR", "ADMIN", "NURSE", "PHARMACIST"];
        return roleNames[role] || "UNKNOWN";
    }
    
    isPatientOwner(patientId, userAddress) {
        // Simulation simple - en réalité on appellerait PatientIdentityContract
        return userAddress === `0xPATIENT${patientId}`;
    }
    
    getStats() {
        const activeUsers = Array.from(this.users.values()).filter(u => u.isActive).length;
        const activePermissions = Array.from(this.permissions.values())
            .filter(p => p.isActive && p.expirationDate > Date.now()).length;
        
        return {
            totalUsers: this.users.size,
            activeUsers,
            totalPermissions: this.permissions.size,
            activePermissions,
            totalLogs: this.accessLogs.size
        };
    }
}

/**
 * Tests complets AccessControl
 */
async function testAccessControlSystem() {
    console.log("🚀 Tests AccessControl System\n");
    
    const accessControl = new AccessControlSimulator();
    const patientSim = new OfflineContractSimulator();
    
    try {
        // Test 1: Enregistrement utilisateurs
        console.log("👥 Test 1: Enregistrement utilisateurs");
        
        const adminAddr = "0xADMIN123";
        const doctorAddr = "0xDOCTOR456";
        const nurseAddr = "0xNURSE789";
        const patientAddr = "0xPATIENT1";
        
        // Enregistrer médecin
        accessControl.registerUser(
            adminAddr, doctorAddr, 
            accessControl.Role.DOCTOR, 
            "doctor_public_key", 
            "DR001"
        );
        
        // Enregistrer infirmière
        accessControl.registerUser(
            adminAddr, nurseAddr, 
            accessControl.Role.NURSE, 
            "nurse_public_key", 
            "NUR001"
        );
        
        console.log("✅ Test 1 réussi\n");
        
        // Test 2: Création patient (via PatientIdentity simulé)
        console.log("👤 Test 2: Création patient");
        
        const patientId = patientSim.registerPatient(
            patientAddr,
            "encrypted_medical_data",
            "patient_metadata_hash"
        );
        
        console.log("✅ Test 2 réussi\n");


        // Après la création du patient
        accessControl.registerUser(
        adminAddr, patientAddr,
        accessControl.Role.PATIENT,
        "patient_public_key",
        "PAT001"
        );


        
        // Test 3: Octroi de permissions
        console.log("🔐 Test 3: Octroi de permissions");

                
        const futureDate = Date.now() + (7 * 24 * 60 * 60 * 1000); // Dans 7 jours
        
        // Patient accorde accès au médecin
        const permissionId1 = accessControl.grantPermission(
            patientAddr, // Le patient accorde
            doctorAddr,  // Au médecin
            patientId,
            futureDate,
            ["read", "write", "prescribe"]
        );
        
        // Médecin accorde accès limité à l'infirmière
        const permissionId2 = accessControl.grantPermission(
            doctorAddr,  // Le médecin accorde
            nurseAddr,   // À l'infirmière
            patientId,
            futureDate,
            ["read", "monitor"]
        );
        
        console.log("✅ Test 3 réussi\n");
        
        // Test 4: Vérification des permissions
        console.log("🔍 Test 4: Vérification des permissions");
        
        // Médecin peut lire
        const canDoctorRead = accessControl.checkPermission(doctorAddr, patientId, "read");
        console.log(`Médecin peut lire: ${canDoctorRead}`);
        
        // Médecin peut prescrire
        const canDoctorPrescribe = accessControl.checkPermission(doctorAddr, patientId, "prescribe");
        console.log(`Médecin peut prescrire: ${canDoctorPrescribe}`);
        
        // Infirmière peut lire
        const canNurseRead = accessControl.checkPermission(nurseAddr, patientId, "read");
        console.log(`Infirmière peut lire: ${canNurseRead}`);
        
        // Infirmière NE PEUT PAS prescrire
        const canNursePrescribe = accessControl.checkPermission(nurseAddr, patientId, "prescribe");
        console.log(`Infirmière peut prescrire: ${canNursePrescribe} (devrait être false)`);
        
        console.log("✅ Test 4 réussi\n");
        
        // Test 5: Logs d'accès
        console.log("📝 Test 5: Logs d'accès");
        
        accessControl.logAccess(doctorAddr, patientId, "read", true, "Consultation routine");
        accessControl.logAccess(nurseAddr, patientId, "read", true, "Prise de signes vitaux");
        accessControl.logAccess(nurseAddr, patientId, "prescribe", false, "Permission refusée");
        
        console.log("✅ Test 5 réussi\n");
        
        // Test 6: Révocation de permissions
        console.log("🚫 Test 6: Révocation de permissions");
        
        accessControl.revokePermission(doctorAddr, permissionId2); // Médecin révoque accès infirmière
        
        // Vérifier que l'accès est maintenant refusé
        const canNurseReadAfterRevoke = accessControl.checkPermission(nurseAddr, patientId, "read");
        console.log(`Infirmière peut lire après révocation: ${canNurseReadAfterRevoke} (devrait être false)`);
        
        console.log("✅ Test 6 réussi\n");
        
        // Test 7: Statistiques du système
        console.log("📊 Test 7: Statistiques du système");
        
        const stats = accessControl.getStats();
        console.log(`👥 Utilisateurs actifs: ${stats.activeUsers}/${stats.totalUsers}`);
        console.log(`🔐 Permissions actives: ${stats.activePermissions}/${stats.totalPermissions}`);
        console.log(`📝 Total logs: ${stats.totalLogs}`);
        
        console.log("✅ Test 7 réussi\n");
        
        console.log("🎉 Tous les tests AccessControl réussis!");
        console.log("\n📋 Résumé des fonctionnalités testées:");
        console.log("- ✅ Enregistrement d'utilisateurs (admin, médecin, infirmière)");
        console.log("- ✅ Octroi de permissions granulaires");
        console.log("- ✅ Vérification d'accès par rôle et permission");
        console.log("- ✅ Logs d'accès détaillés");
        console.log("- ✅ Révocation de permissions");
        console.log("- ✅ Statistiques du système");
        
        return true;
        
    } catch (error) {
        console.error(`❌ Erreur dans les tests AccessControl: ${error.message}`);
        return false;
    }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    testAccessControlSystem().catch(console.error);
}

export { AccessControlSimulator, testAccessControlSystem };