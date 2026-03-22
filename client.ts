import "dotenv/config";
import { createThirdwebClient } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import {
  privateKeyToAccount,
  createWalletAdapter,
} from "thirdweb/wallets";
import { wrapFetchWithPayment } from "thirdweb/x402";

const { THIRDWEB_SECRET_KEY, CLIENT_PRIVATE_KEY, PORT = "3000" } = process.env;

if (!THIRDWEB_SECRET_KEY || !CLIENT_PRIVATE_KEY) {
  console.error("Missing THIRDWEB_SECRET_KEY or CLIENT_PRIVATE_KEY in .env");
  process.exit(1);
}

const client = createThirdwebClient({ secretKey: THIRDWEB_SECRET_KEY });
const account = privateKeyToAccount({ client, privateKey: CLIENT_PRIVATE_KEY });

async function main() {
  const wallet = createWalletAdapter({
    adaptedAccount: account,
    chain: baseSepolia,
    client,
    onDisconnect: async () => {},
    switchChain: async () => {},
  });
  await wallet.connect({ client });

  const paidFetch = wrapFetchWithPayment(fetch, client, wallet);

  const baseUrl = `http://localhost:${PORT}`;
  const endpoint = process.argv[2] || "/api/premium";
  const url = `${baseUrl}${endpoint}`;

  console.log(`\nWallet: ${account.address}`);
  console.log(`Requesting: ${url}`);
  console.log("---");

  try {
    const response = await paidFetch(url);
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error: any) {
    console.error("Error:", error.message ?? error);
  }
}

main();
