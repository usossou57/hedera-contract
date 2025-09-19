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
 * Déployer le contrat AccessControl sur Hedera
 */
async function deployAccessControlContract() {
    try {
        console.log("🚀 Démarrage du déploiement AccessControl sur Hedera Testnet...\n");

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
            .setDefaultMaxTransactionFee(new Hbar(20));
        
        console.log("✅ Client Hedera connecté au testnet");

        // Vérifier que PatientIdentity est déjà déployé
        console.log("\n🔍 Vérification des dépendances...");
        const patientDeploymentPath = path.join(__dirname, '..', 'contracts', 'deployed', 'PatientIdentityContract_deployment.json');
        
        if (!fs.existsSync(patientDeploymentPath)) {
            throw new Error(`❌ PatientIdentityContract doit être déployé en premier!
            Exécutez: node scripts/deploy-patient-contract.js`);
        }

        const patientDeployment = JSON.parse(fs.readFileSync(patientDeploymentPath, 'utf8'));
        const patientContractId = patientDeployment.contractId;
        console.log(`✅ PatientIdentity trouvé: ${patientContractId}`);

        // Compilation
        console.log("\n🔨 Vérification de la compilation...");
        const compiledDir = path.join(__dirname, '..', 'contracts', 'compiled');
        const contractJsonPath = path.join(compiledDir, 'AccessControlContract.json');

        if (!fs.existsSync(contractJsonPath)) {
            console.log("📝 Compilation des contrats...");
            await compileAllContracts();
        }

        // Lecture des données compilées
        if (!fs.existsSync(contractJsonPath)) {
            throw new Error(`❌ Fichier AccessControlContract.json non trouvé`);
        }

        const contractData = JSON.parse(fs.readFileSync(contractJsonPath, 'utf8'));
        const bytecode = contractData.bytecode;

        console.log(`✅ AccessControlContract compilé trouvé`);
        console.log(`📊 Taille du bytecode: ${bytecode.length / 2} bytes`);

        // Préparation du déploiement avec paramètre constructeur
        console.log("\n📤 Préparation du déploiement...");
        
        // Le constructeur prend l'adresse du contrat PatientIdentity
        const constructorParams = new ContractFunctionParameters()
            .addAddress(patientContractId); // Adresse du contrat Patient

        console.log(`🔗 Lien avec PatientContract: ${patientContractId}`);

        // Création du contrat
        console.log("⏳ Création du contrat AccessControl...");
        
        const contractCreateTx = new ContractCreateFlow()
            .setBytecode(`0x${bytecode}`)
            .setGas(400000) // Plus de gas pour ce contrat plus complexe
            .setConstructorParameters(constructorParams)
            .setMaxTransactionFee(new Hbar(25));

        // Exécution
        console.log("🔄 Exécution de la transaction de déploiement...");
        const contractCreateSubmit = await contractCreateTx.execute(client);
        
        console.log("⏳ Attente du receipt...");
        const contractCreateRx = await contractCreateSubmit.getReceipt(client);
        
        if (contractCreateRx.status === Status.Success) {
            const contractId = contractCreateRx.contractId;
            const transactionId = contractCreateSubmit.transactionId;
            
            console.log(`\n🎉 SUCCESS! AccessControlContract déployé!`);
            console.log(`📋 Contract ID: ${contractId}`);
            console.log(`📋 Transaction ID: ${transactionId}`);
            console.log(`🌐 Explorer: https://hashscan.io/testnet/contract/${contractId}`);

            // Sauvegarder les informations de déploiement
            const deploymentInfo = {
                contractName: 'AccessControlContract',
                contractId: contractId.toString(),
                transactionId: transactionId.toString(),
                deploymentDate: new Date().toISOString(),
                network: 'testnet',
                operatorId: operatorId,
                dependencies: {
                    patientIdentityContract: patientContractId
                },
                abi: contractData.abi,
                explorerUrl: `https://hashscan.io/testnet/contract/${contractId}`
            };

            const deploymentPath = path.join(__dirname, '..', 'contracts', 'deployed', 'AccessControlContract_deployment.json');
            fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
            console.log(`✅ Infos sauvegardées: ${deploymentPath}`);

            // Affichage des prochaines étapes
            console.log(`\n📋 Prochaines étapes:`);
            console.log(`1. Testez: node scripts/test-access-control.js`);
            console.log(`2. Enregistrez des utilisateurs (médecins, etc.)`);
            console.log(`3. Créez le contrat MedicalRecords (Jour 5)`);

            console.log(`\n📊 Architecture actuelle:`);
            console.log(`   PatientIdentity: ${patientContractId}`);
            console.log(`   AccessControl:   ${contractId}`);

            client.close();
            return contractId;

        } else {
            throw new Error(`❌ Déploiement échoué: ${contractCreateRx.status}`);
        }

    } catch (error) {
        console.error("\n❌ Erreur lors du déploiement:", error.message);
        
        if (error.status) {
            console.error(`💡 Status Hedera: ${error.status}`);
        }
        
        if (error.transactionId) {
            console.error(`💡 Transaction ID: ${error.transactionId}`);
            console.error(`🔍 Vérifiez: https://hashscan.io/testnet/transaction/${error.transactionId}`);
        }
        
        process.exit(1);
    }
}

// Déployer les deux contrats en séquence si nécessaire
async function deployBothContracts() {
    console.log("🏥 Déploiement complet du système médical Hedera\n");
    
    try {
        // Vérifier si PatientIdentity existe
        const patientDeploymentPath = path.join(__dirname, '..', 'contracts', 'deployed', 'PatientIdentityContract_deployment.json');
        
        if (!fs.existsSync(patientDeploymentPath)) {
            console.log("📝 PatientIdentity non trouvé, déploiement en cours...");
            const { deployPatientContract } = await import('./deploy-patient-contract.js');
            await deployPatientContract();
            console.log("✅ PatientIdentity déployé\n");
        }
        
        // Déployer AccessControl
        console.log("📝 Déploiement AccessControl...");
        await deployAccessControlContract();
        
        console.log("\n🎉 Système complet déployé!");
        
    } catch (error) {
        console.error("❌ Erreur déploiement complet:", error.message);
    }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    deployAccessControlContract().catch(console.error);
}

export { deployAccessControlContract, deployBothContracts };