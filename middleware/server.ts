/**
 * x402 test client for the OpenClaw webhook proxy.
 *
 * Automatically handles the 402 -> sign payment -> retry flow
 * using thirdweb's wrapFetchWithPayment.
 *
 * Usage:
 *   npm run client -- "your message here"
 *   npm run client -- --ping
 *
 * Requires CLIENT_PRIVATE_KEY in .env
 */
import "dotenv/config";
import { createThirdwebClient } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { privateKeyToAccount, createWalletAdapter } from "thirdweb/wallets";
import { wrapFetchWithPayment } from "thirdweb/x402";

const { THIRDWEB_SECRET_KEY, CLIENT_PRIVATE_KEY, PORT = "3456" } = process.env;

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
        onDisconnect: async () => { },
        switchChain: async () => { },
    });
    await wallet.connect({ client });

    const paidFetch = wrapFetchWithPayment(fetch, client, wallet);
    const baseUrl = `http://localhost:${PORT}`;

    const arg = process.argv[2] || "Hola, que puedes hacer?";

    console.log(`\nWallet: ${account.address}`);

    if (arg === "--ping") {
        console.log(`Requesting: GET ${baseUrl}/ping`);
        console.log("---");
        const res = await paidFetch(`${baseUrl}/ping`);
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log("Response:", JSON.stringify(data, null, 2));
        return;
    }

    console.log(`Requesting: POST ${baseUrl}/agent`);
    console.log(`Message: ${arg}`);
    console.log("---");

    const res = await paidFetch(`${baseUrl}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: arg }),
    });

    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));
}

main().catch((err) => {
    console.error("Error:", err.message ?? err);
    process.exit(1);
});
