import "dotenv/config";
import express from "express";
import { createThirdwebClient } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { facilitator, settlePayment } from "thirdweb/x402";

const {
  THIRDWEB_SECRET_KEY,
  SERVER_WALLET_ADDRESS,
  PORT = "3000",
} = process.env;

if (!THIRDWEB_SECRET_KEY || !SERVER_WALLET_ADDRESS) {
  console.error(
    "Missing THIRDWEB_SECRET_KEY or SERVER_WALLET_ADDRESS in .env",
  );
  process.exit(1);
}

const client = createThirdwebClient({ secretKey: THIRDWEB_SECRET_KEY });

const thirdwebFacilitator = facilitator({
  client,
  serverWalletAddress: SERVER_WALLET_ADDRESS,
  waitUntil: "simulated"
});

const app = express();
app.use(express.json());

// ── Free endpoint (health check) ──
app.get("/", (_req, res) => {
  res.json({
    service: "x402-agentic",
    network: "avalanche-fuji",
    endpoints: {
      free: "GET /",
      paid: "GET /api/premium",
      paid_joke: "GET /api/joke",
    },
  });
});

// ── Paid endpoint: premium content ($0.01 USDC on Avalanche Fuji) ──
app.get("/api/premium", async (req, res) => {
  const paymentData =
    req.headers["x-payment"] as string | undefined ??
    req.headers["payment-signature"] as string | undefined;

  const result = await settlePayment({
    resourceUrl: `http://localhost:${PORT}/api/premium`,
    method: "GET",
    paymentData: paymentData ?? null,
    payTo: SERVER_WALLET_ADDRESS,
    network: baseSepolia,
    price: "$0.01",
    facilitator: thirdwebFacilitator,
    routeConfig: {
      description: "Premium content - pay per request",
      mimeType: "application/json",
      maxTimeoutSeconds: 3600,
    },
  });

  if (result.status === 200) {
    res.json({
      data: "This is premium content unlocked via x402 payment on Avalanche!",
      receipt: result.paymentReceipt,
    });
  } else {
    res.status(result.status).set(result.responseHeaders).json(result.responseBody);
  }
});

// ── Paid endpoint: joke ($0.001 USDC, cheaper) ──
app.get("/api/joke", async (req, res) => {
  const paymentData =
    req.headers["x-payment"] as string | undefined ??
    req.headers["payment-signature"] as string | undefined;

  const result = await settlePayment({
    resourceUrl: `http://localhost:${PORT}/api/joke`,
    method: "GET",
    paymentData: paymentData ?? null,
    payTo: SERVER_WALLET_ADDRESS,
    network: baseSepolia,
    price: "$0.001",
    facilitator: thirdwebFacilitator,
    routeConfig: {
      description: "A paid joke",
      mimeType: "application/json",
      maxTimeoutSeconds: 3600,
    },
  });

  if (result.status === 200) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs.",
      "There are only 10 types of people: those who understand binary and those who don't.",
      "A SQL query walks into a bar, sees two tables, and asks... 'Can I JOIN you?'",
    ];
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    res.json({ joke, receipt: result.paymentReceipt });
  } else {
    res.status(result.status).set(result.responseHeaders).json(result.responseBody);
  }
});

app.listen(Number(PORT), () => {
  console.log(`\nx402 server running on http://localhost:${PORT}`);
  console.log(`Network: Avalanche Fuji (testnet)`);
  console.log(`Pay-to wallet: ${SERVER_WALLET_ADDRESS}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET /              - Free (service info)`);
  console.log(`  GET /api/premium   - $0.01 USDC`);
  console.log(`  GET /api/joke      - $0.001 USDC`);
  console.log(`\nTest with curl:`);
  console.log(`  curl http://localhost:${PORT}/`);
  console.log(`  curl -v http://localhost:${PORT}/api/premium`);
});
