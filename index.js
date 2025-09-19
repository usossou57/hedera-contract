const {Client, PrivateKey, AccountCreateTransaction, AccountBalanceQuery, Hbar, TransfertTransaction} = require("@hashgraph/sdk");
require("dotenv").config();

async function environmentSetup() {
    const myAccountId = process.env.OPERATOR_ID;
    const myPrivateKey = process.env.OPERATOR_KEY;

    const client = Client.forTestnet();
    client.setOperator(myAccountId, myPrivateKey);
    client.setDefaultMaxTransactionFee(new Hbar(100));
    client.setMaxQueryPayment(new Hbar(50));

    if (!myAccountId || !myPrivateKey) {
        throw new Error("Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present");
    }
}
environmentSetup();



