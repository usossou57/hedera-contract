import { Client, AccountBalanceQuery } from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

const client = Client.forTestnet();
client.setOperator(process.env.OPERATOR_ID, process.env.OPERATOR_KEY);

async function checkBalance() {
  const balance = await new AccountBalanceQuery()
    .setAccountId(process.env.OPERATOR_ID)
    .execute(client);
  console.log(`Solde HBAR: ${balance.hbars.toString()}`);
}

checkBalance();