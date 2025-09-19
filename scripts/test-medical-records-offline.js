import 'dotenv/config';
import {
    Client,
    PrivateKey,
    AccountId,
    ContractCreateFlow,
    ContractFunctionParameters,
    Hbar,
    Status
} from "@hashgraph/sdk";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { compileAllContracts } from './compile.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Déployer tout le système médical sur Hedera
 */
async function deployCompleteSystem() {
    console.log("🏥 DÉPLOIEMENT COMPLET DU SYSTÈME MÉDICAL HEDERA");
    console.log("=" .repeat(60));
    
    try {
        // Configuration du client
        const operatorId = process.env.OPERATOR_ID;
        const operatorKey = process.env.OPERATOR_KEY;

        if (!operatorId || !operatorKey) {
            throw new Error("❌ Variables d'environnement manquantes!");
        }

        console.log(`✅ Operator ID: ${operatorId}`);

        const operatorPrivateKey = PrivateKey.fromStringECDSA(operatorKey);
        const client = Client.forTestnet()
            .setOperator(operatorId, operatorPrivateKey)
            .setDefaultMaxTransactionFee(new Hbar(30)); // Plus de budget pour déploiements multiples
        
        console.log("✅ Client Hedera connecté au testnet");

        // Vérifier le solde
        console.log("\n💰 Vérification du solde...");
        const balance = await new AccountId(operatorId).getBalance(client);
        console.log(`Solde actuel: ${balance.toString()}`);
        
        if (balance.toBigNumber().lt(50)) { // Moins de 50 HBAR
            console.warn("⚠️ Solde faible - le déploiement pourrait échouer");
            console.log("💡 Obtenez plus de HBAR sur: https://portal.hedera.com/faucet");
        }

        // Compilation de tous les contrats
        console.log("\n🔨 ÉTAPE 1/4: Compilation des contrats...");
        await compileAllContracts();
        console.log("✅ Tous les contrats compilés");

        // Structures pour stocker les informations de déploiement
        const deployedContracts = {};
        
        // DÉPLOIEMENT 1: PatientIdentityContract
        console.log("\n👤 ÉTAPE 2/4: Déploiement PatientIdentityContract...");
        const patientContractId = await deployPatientIdentityContract(client);
        deployedContracts.PatientIdentity = patientContractId;
        console.log(`✅ PatientIdentity déployé: ${patientContractId}`);

        // DÉPLOIEMENT 2: AccessControlContract
        console.log("\n🔐 ÉTAPE 3/4: Déploiement AccessControlContract...");
        const accessControlId = await deployAccessControlContract(client, patientContractId);
        deployedContracts.AccessControl = accessControlId;
        console.log(`✅ AccessControl déployé: ${accessControlId}`);

        // DÉPLOIEMENT 3: MedicalRecordsContract
        console.log("\n🏥 ÉTAPE 4/4: Déploiement MedicalRecordsContract...");
        const medicalRecordsId = await deployMedicalRecordsContract(client, patientContractId, accessControlId);
        deployedContracts.MedicalRecords = medicalRecordsId;
        console.log(`✅ MedicalRecords déployé: ${medicalRecordsId}`);

        // Sauvegarder la configuration complète du système
        console.log("\n📄 Sauvegarde de la configuration système...");
        const systemConfig = {
            systemName: "Hedera Medical Records System",
            deploymentDate: new Date().toISOString(),
            network: "testnet",
            operator: operatorId,
            contracts: {
                PatientIdentityContract: {
                    contractId: patientContractId.toString(),
                    description: "Gestion des identités patients",
                    explorerUrl: `https://hashscan.io/testnet/contract/${patientContractId}`
                },
                AccessControlContract: {
                    contractId: accessControlId.toString(),
                    description: "Contrôle d'accès et permissions",
                    explorerUrl: `https://hashscan.io/testnet/contract/${accessControlId}`,
                    dependencies: [patientContractId.toString()]
                },
                MedicalRecordsContract: {
                    contractId: medicalRecordsId.toString(),
                    description: "Dossiers médicaux et consultations",
                    explorerUrl: `https://hashscan.io/testnet/contract/${medicalRecordsId}`,
                    dependencies: [patientContractId.toString(), accessControlId.toString()]
                }
            },
            interactionGuide: {
                "1_RegisterPatient": `Utilisez PatientIdentity (${patientContractId})`,
                "2_SetupAccess": `Utilisez AccessControl (${accessControlId})`,
                "3_CreateRecords": `Utilisez MedicalRecords (${medicalRecordsId})`
            }
        };

        const systemConfigPath = path.join(__dirname, '..', 'contracts', 'deployed', 'system-config.json');
        fs.writeFileSync(systemConfigPath, JSON.stringify(systemConfig, null, 2));
        
        // SUCCÈS COMPLET
        console.log("\n" + "🎉".repeat(20));
        console.log("🏆 SYSTÈME MÉDICAL DÉPLOYÉ AVEC SUCCÈS!");
        console.log("🎉".repeat(20));
        
        console.log("\n📋 RÉCAPITULATIF DU DÉPLOIEMENT:");
        console.log(`👤 PatientIdentity:  ${patientContractId}`);
        console.log(`🔐 AccessControl:    ${accessControlId}`);
        console.log(`🏥 MedicalRecords:   ${medicalRecordsId}`);
        
        console.log("\n🌐 LIENS EXPLORER:");
        console.log(`👤 https://hashscan.io/testnet/contract/${patientContractId}`);
        console.log(`🔐 https://hashscan.io/testnet/contract/${accessControlId}`);
        console.log(`🏥 https://hashscan.io/testnet/contract/${medicalRecordsId}`);
        
        console.log("\n📄 Configuration sauvegardée:");
        console.log(`   ${systemConfigPath}`);
        
        console.log("\n🚀 PROCHAINES ÉTAPES:");
        console.log("1. Testez le système: node scripts/test-complete-system.js");
        console.log("2. Enregistrez des patients");
        console.log("3. Configurez des médecins");
        console.log("4. Créez des dossiers médicaux");
        
        const finalBalance = await new AccountId(operatorId).getBalance(client);
        const cost = balance.toBigNumber().minus(finalBalance.toBigNumber());
        console.log(`\n💰 Coût total du déploiement: ~${cost.dividedBy(100000000).toFixed(4)} HBAR`);
        
        client.close();
        return systemConfig;

    } catch (error) {
        console.error("\n❌ ERREUR DE DÉPLOIEMENT:", error.message);
        
        if (error.status) {
            console.error(`💡 Status Hedera: ${error.status}`);
        }
        
        if (error.transactionId) {
            console.error(`💡 Transaction ID: ${error.transactionId}`);
            console.error(`🔍 Explorer: https://hashscan.io/testnet/transaction/${error.transactionId}`);
        }
        
        console.log("\n💡 SOLUTIONS POSSIBLES:");
        console.log("- Vérifiez votre solde HBAR");
        console.log("- Vérifiez vos clés .env");
        console.log("- Réessayez dans quelques minutes");
        
        process.exit(1);
    }
}

/**
 * Déployer PatientIdentityContract
 */
async function deployPatientIdentityContract(client) {
    console.log("  📝 Lecture du bytecode PatientIdentity...");
    
    const contractData = getCompiledContract('PatientIdentityContract');
    const bytecode = contractData.bytecode;
    
    console.log(`  📊 Taille: ${bytecode.length / 2} bytes`);
    
    const constructorParams = new ContractFunctionParameters();
    
    const contractCreateTx = new ContractCreateFlow()
        .setBytecode(`0x${bytecode}`)
        .setGas(300000)
        .setConstructorParameters(constructorParams)
        .setMaxTransactionFee(new Hbar(20));

    console.log("  ⏳ Déploiement en cours...");
    const contractCreateSubmit = await contractCreateTx.execute(client);
    const contractCreateRx = await contractCreateSubmit.getReceipt(client);
    
    if (contractCreateRx.status !== Status.Success) {
        throw new Error(`Déploiement PatientIdentity échoué: ${contractCreateRx.status}`);
    }
    
    const contractId = contractCreateRx.contractId;
    
    // Sauvegarder les infos de déploiement
    saveDeploymentInfo('PatientIdentityContract', contractId, contractCreateSubmit.transactionId, contractData.abi);
    
    return contractId;
}

/**
 * Déployer AccessControlContract
 */
async function deployAccessControlContract(client, patientContractId) {
    console.log("  📝 Lecture du bytecode AccessControl...");
    
    const contractData = getCompiledContract('AccessControlContract');
    const bytecode = contractData.bytecode;
    
    console.log(`  📊 Taille: ${bytecode.length / 2} bytes`);
    console.log(`  🔗 Lien avec PatientIdentity: ${patientContractId}`);
    
    const constructorParams = new ContractFunctionParameters()
        .addAddress(patientContractId.toString());
    
    const contractCreateTx = new ContractCreateFlow()
        .setBytecode(`0x${bytecode}`)
        .setGas(400000)
        .setConstructorParameters(constructorParams)
        .setMaxTransactionFee(new Hbar(25));

    console.log("  ⏳ Déploiement en cours...");
    const contractCreateSubmit = await contractCreateTx.execute(client);
    const contractCreateRx = await contractCreateSubmit.getReceipt(client);
    
    if (contractCreateRx.status !== Status.Success) {
        throw new Error(`Déploiement AccessControl échoué: ${contractCreateRx.status}`);
    }
    
    const contractId = contractCreateRx.contractId;
    
    // Sauvegarder les infos
    saveDeploymentInfo('AccessControlContract', contractId, contractCreateSubmit.transactionId, contractData.abi, {
        patientIdentityContract: patientContractId.toString()
    });
    
    return contractId;
}

/**
 * Déployer MedicalRecordsContract
 */
async function deployMedicalRecordsContract(client, patientContractId, accessControlId) {
    console.log("  📝 Lecture du bytecode MedicalRecords...");
    
    const contractData = getCompiledContract('MedicalRecordsContract');
    const bytecode = contractData.bytecode;
    
    console.log(`  📊 Taille: ${bytecode.length / 2} bytes`);
    console.log(`  🔗 Lien avec PatientIdentity: ${patientContractId}`);
    console.log(`  🔗 Lien avec AccessControl: ${accessControlId}`);
    
    const constructorParams = new ContractFunctionParameters()
        .addAddress(patientContractId.toString())
        .addAddress(accessControlId.toString());
    
    const contractCreateTx = new ContractCreateFlow()
        .setBytecode(`0x${bytecode}`)
        .setGas(500000) // Plus de gas pour ce contrat complexe
        .setConstructorParameters(constructorParams)
        .setMaxTransactionFee(new Hbar(30));

    console.log("  ⏳ Déploiement en cours...");
    const contractCreateSubmit = await contractCreateTx.execute(client);
    const contractCreateRx = await contractCreateSubmit.getReceipt(client);
    
    if (contractCreateRx.status !== Status.Success) {
        throw new Error(`Déploiement MedicalRecords échoué: ${contractCreateRx.status}`);
    }
    
    const contractId = contractCreateRx.contractId;
    
    // Sauvegarder les infos
    saveDeploymentInfo('MedicalRecordsContract', contractId, contractCreateSubmit.transactionId, contractData.abi, {
        patientIdentityContract: patientContractId.toString(),
        accessControlContract: accessControlId.toString()
    });
    
    return contractId;
}

/**
 * Fonctions utilitaires
 */
function getCompiledContract(contractName) {
    const contractJsonPath = path.join(__dirname, '..', 'contracts', 'compiled', `${contractName}.json`);
    
    if (!fs.existsSync(contractJsonPath)) {
        throw new Error(`Contrat ${contractName} non compilé. Exécutez: node scripts/compile.js`);
    }
    
    return JSON.parse(fs.readFileSync(contractJsonPath, 'utf8'));
}

function saveDeploymentInfo(contractName, contractId, transactionId, abi, dependencies = {}) {
    const deploymentInfo = {
        contractName,
        contractId: contractId.toString(),
        transactionId: transactionId.toString(),
        deploymentDate: new Date().toISOString(),
        network: 'testnet',
        operatorId: process.env.OPERATOR_ID,
        dependencies,
        abi,
        explorerUrl: `https://hashscan.io/testnet/contract/${contractId}`
    };

    const deploymentPath = path.join(__dirname, '..', 'contracts', 'deployed', `${contractName}_deployment.json`);
    const deployedDir = path.dirname(deploymentPath);
    
    if (!fs.existsSync(deployedDir)) {
        fs.mkdirSync(deployedDir, { recursive: true });
    }
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    deployCompleteSystem().catch(console.error);
}

export { deployCompleteSystem };
