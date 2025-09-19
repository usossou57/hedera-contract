import 'dotenv/config';
import {
    Client,
    PrivateKey,
    AccountCreateTransaction,
    Hbar,
    Status
} from "@hashgraph/sdk";

async function createAccount() {
    try {
        console.log("🚀 Démarrage de la création de compte Hedera...\n");

        const operatorId = process.env.OPERATOR_ID;
        const operatorKey = process.env.OPERATOR_KEY;

        if (!operatorId || !operatorKey) {
            throw new Error("❌ Variables d'environnement manquantes!");
        }

        console.log(`✅ Operator ID: ${operatorId}`);

        // Créer la clé privée depuis le format hex
        const operatorPrivateKey = PrivateKey.fromStringECDSA(operatorKey);

        const client = Client.forTestnet()
            .setOperator(operatorId, operatorPrivateKey)
            .setDefaultMaxTransactionFee(new Hbar(10));
        
        console.log("✅ Client Hedera connecté au testnet\n");

        const newPrivateKey = PrivateKey.generateECDSA();
        const newPublicKey = newPrivateKey.publicKey;

        console.log("🔑 Nouvelle paire de clés générée");

        console.log("⏳ Synchronisation temporelle...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log("📝 Construction de la transaction...");
        
        const transaction = new AccountCreateTransaction()
            .setKey(newPublicKey)
            .setInitialBalance(new Hbar(1))
            .setMaxTransactionFee(new Hbar(5));

        console.log("⏳ Exécution de la transaction...");
        
        const txResponse = await transaction.execute(client);
        const receipt = await txResponse.getReceipt(client);
        
        if (receipt.status === Status.Success) {
            const newAccountId = receipt.accountId;
            console.log(`\n🎉 SUCCESS! Nouveau compte créé: ${newAccountId}`);
            console.log(`📋 Clé privée: ${newPrivateKey.toString()}`);
            console.log(`📋 Clé publique: ${newPublicKey.toString()}\n`);
        }

        client.close();

    } catch (error) {
        console.error("❌ Erreur:", error.message || error);
        
        if (error.status) {
            console.log(`💡 Status code: ${error.status}`);
        }
    }
}

createAccount();