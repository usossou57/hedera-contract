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
 * Déployer le contrat PatientIdentity sur Hedera
 */
async function deployPatientContract() {
    try {
        console.log("🚀 Démarrage du déploiement sur Hedera Testnet...\n");

        // Vérification des variables d'environnement
        const operatorId = process.env.OPERATOR_ID;
        const operatorKey = process.env.OPERATOR_KEY;

        if (!operatorId || !operatorKey) {
            throw new Error("❌ Variables d'environnement manquantes (OPERATOR_ID ou OPERATOR_KEY)!");
        }

        console.log(`✅ Operator ID: ${operatorId}`);

        // Configuration du client Hedera
        const operatorPrivateKey = PrivateKey.fromStringECDSA(operatorKey);
        const client = Client.forTestnet()
            .setOperator(operatorId, operatorPrivateKey)
            .setDefaultMaxTransactionFee(new Hbar(20)); // Augmenté pour les smart contracts
        
        console.log("✅ Client Hedera connecté au testnet");

        // Compilation du contrat si nécessaire
        console.log("\n🔨 Vérification de la compilation...");
        const compiledDir = path.join(__dirname, '..', 'contracts', 'compiled');
        const contractJsonPath = path.join(compiledDir, 'PatientIdentityContract.json');
        const bytecodePath = path.join(compiledDir, 'PatientIdentityContract_bytecode.bin');

        if (!fs.existsSync(contractJsonPath) || !fs.existsSync(bytecodePath)) {
            console.log("📝 Compilation des contrats...");
            await compileAllContracts();
        }

        // Lecture des données compilées
        if (!fs.existsSync(contractJsonPath)) {
            throw new Error(`❌ Fichier de contrat compilé non trouvé: ${contractJsonPath}`);
        }

        const contractData = JSON.parse(fs.readFileSync(contractJsonPath, 'utf8'));
        const bytecode = contractData.bytecode;

        if (!bytecode || bytecode.length === 0) {
            throw new Error("❌ Bytecode vide ou invalide");
        }

        console.log(`✅ Contrat compilé trouvé`);
        console.log(`📊 Taille du bytecode: ${bytecode.length / 2} bytes`);

        // Préparation du déploiement
        console.log("\n📤 Préparation du déploiement...");
        
        // Paramètres du constructeur (aucun pour ce contrat)
        const constructorParams = new ContractFunctionParameters();

        // Création du contrat
        console.log("⏳ Création du contrat sur Hedera...");
        
        const contractCreateTx = new ContractCreateFlow()
            .setBytecode(`0x${bytecode}`)
            .setGas(5000000) // Gas suffisant pour le déploiement
            .setConstructorParameters(constructorParams)
            .setMaxTransactionFee(new Hbar(20));

        // Exécution de la transaction
        console.log("🔄 Exécution de la transaction de déploiement...");
        const contractCreateSubmit = await contractCreateTx.execute(client);
        
        console.log("⏳ Attente du receipt...");
        const contractCreateRx = await contractCreateSubmit.getReceipt(client);
        
        if (contractCreateRx.status === Status.Success) {
            const contractId = contractCreateRx.contractId;
            const transactionId = contractCreateSubmit.transactionId;
            
            console.log(`\n🎉 SUCCESS! Contrat déployé avec succès!`);
            console.log(`📋 Contract ID: ${contractId}`);
            console.log(`📋 Transaction ID: ${transactionId}`);
            console.log(`🌐 Explorer: https://hashscan.io/testnet/contract/${contractId}`);

            // Sauvegarder les informations de déploiement
            const deploymentInfo = {
                contractName: 'PatientIdentityContract',
                contractId: contractId.toString(),
                transactionId: transactionId.toString(),
                deploymentDate: new Date().toISOString(),
                network: 'testnet',
                operatorId: operatorId,
                abi: contractData.abi,
                explorerUrl: `https://hashscan.io/testnet/contract/${contractId}`
            };

            const deploymentPath = path.join(__dirname, '..', 'contracts', 'deployed', 'PatientIdentityContract_deployment.json');
            const deployedDir = path.dirname(deploymentPath);
            
            if (!fs.existsSync(deployedDir)) {
                fs.mkdirSync(deployedDir, { recursive: true });
            }
            
            fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
            console.log(`✅ Informations de déploiement sauvegardées: ${deploymentPath}`);

            // Affichage des prochaines étapes
            console.log(`\n📋 Prochaines étapes:`);
            console.log(`1. Testez le contrat avec: node scripts/test-patient-contract.js`);
            console.log(`2. Créez le contrat AccessControl`);
            console.log(`3. Créez le contrat MedicalRecords`);

            client.close();
            return contractId;

        } else {
            throw new Error(`❌ Déploiement échoué avec status: ${contractCreateRx.status}`);
        }

    } catch (error) {
        console.error("\n❌ Erreur lors du déploiement:", error.message);
        
        if (error.status) {
            console.error(`💡 Status Hedera: ${error.status}`);
        }
        
        if (error.transactionId) {
            console.error(`💡 Transaction ID: ${error.transactionId}`);
            console.error(`🔍 Vérifiez sur: https://hashscan.io/testnet/transaction/${error.transactionId}`);
        }
        
        process.exit(1);
    }
}

// Fonction utilitaire pour vérifier le solde
async function checkBalance() {
    try {
        const operatorId = process.env.OPERATOR_ID;
        const operatorKey = process.env.OPERATOR_KEY;
        
        const operatorPrivateKey = PrivateKey.fromStringECDSA(operatorKey);
        const client = Client.forTestnet().setOperator(operatorId, operatorPrivateKey);
        
        const balance = await new AccountId(operatorId).getBalance(client);
        console.log(`💰 Solde actuel: ${balance.toString()}`);
        
        client.close();
        return balance;
    } catch (error) {
        console.error("❌ Erreur lors de la vérification du solde:", error.message);
    }
}

// Exécuter le déploiement si ce script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log("🏥 Déploiement du système médical Hedera\n");
    
    // Vérifier d'abord le solde
    await checkBalance();
    
    deployPatientContract().catch(console.error);
}

export { deployPatientContract, checkBalance };