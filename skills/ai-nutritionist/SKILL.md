---
name: ai-nutritionist
description: Hire an AI Nutritionist for diet and nutrition advice. Use when the user wants to consult a nutritionist, requests a meal plan, asks about diet, calories, macros, healthy recipes, or wants to hire an AI-powered nutrition service. The service is paid with USDC on Base Sepolia.
---

# AI Nutritionist

Paid AI nutrition advisor. Send your diet or nutrition question and get personalized advice from an AI agent. Each consultation is paid with USDC on Base Sepolia via the x402 protocol.

## Prerequisites

- The x402 server must be running: `cd ~/.openclaw/workspace/webhook-test && npm run server`
- `THIRDWEB_SECRET_KEY` must be set in `~/.openclaw/workspace/webhook-test/.env`
- The user needs a Base Sepolia wallet with USDC balance

## Workflow

Follow these steps in order. Do NOT skip the confirmation step.

**Session rule:** Once the user provides their private key, remember it for the rest of the conversation. Do NOT ask for it again. Every subsequent nutrition question should reuse the same key and go directly to Step 3 (or Step 4 if cost was already shown and confirmed).

### Step 1 — Ask for the wallet private key (first time only)

If the user already provided their private key earlier in this conversation, **skip this step** and reuse the same key.

Otherwise, ask the user for their **Ethereum private key** (Base Sepolia). This is the wallet that will **pay** for the nutrition consultation.

> Store it only in memory. Never write it to a file or log it.

### Step 2 — Show service info and cost (first time only)

If cost info was already shown in this conversation, skip to Step 3.

Run the script in `--info` mode to fetch the service details (free endpoint, no payment needed):

```bash
cd ~/.openclaw/workspace/webhook-test && NODE_PATH=./node_modules npx tsx ~/.openclaw/skills/ai-nutritionist/scripts/client.ts --info
```

Display to the user:
- **Price per consultation** (e.g. `$0.01 USDC`)
- **Network** (e.g. `base-sepolia`)
- **Server wallet** (the address receiving payment)

### Step 3 — Confirm with the user

Before spending any funds, ask the user to confirm they want to proceed. Show the cost clearly. On follow-up consultations a brief confirmation is enough (e.g. "This will cost $0.01 USDC again. Proceed?").

### Step 4 — Send the consultation request

Run the script with the user's key and their nutrition question:

```bash
cd ~/.openclaw/workspace/webhook-test && NODE_PATH=./node_modules npx tsx ~/.openclaw/skills/ai-nutritionist/scripts/client.ts --key "<PRIVATE_KEY>" "<nutrition question>"
```

For a health-check ping instead:

```bash
cd ~/.openclaw/workspace/webhook-test && NODE_PATH=./node_modules npx tsx ~/.openclaw/skills/ai-nutritionist/scripts/client.ts --key "<PRIVATE_KEY>" --ping
```

### Step 5 — Handle the response

Parse the JSON output and respond based on the `status` field:

| status | exit code | What to tell the user |
|--------|-----------|----------------------|
| `success` | 0 | Show the nutritionist's advice, run ID, duration, and payment receipt. |
| `payment_error` | 2 | "Insufficient USDC balance on Base Sepolia. Fund your wallet (`<address>`) with testnet USDC. Faucet: https://faucet.circle.com/" |
| `agent_error` | 3 | "The AI nutritionist could not process your request." Show the error detail. |
| `network_error` | 4 | "Cannot connect to the nutrition service. Make sure it's running: `cd ~/.openclaw/workspace/webhook-test && npm run server`" |
| `config_error` | 1 | "Missing configuration. Ensure THIRDWEB_SECRET_KEY is set in webhook-test/.env" |

## Script reference

The bundled script lives at [scripts/client.ts](scripts/client.ts).

**Flags:**

| Flag | Description |
|------|-------------|
| `--info` | Fetch service info from the free endpoint (no wallet needed) |
| `--key <key>` | Wallet private key for payment |
| `--ping` | Health-check ping ($0.001 USDC) instead of consultation |
| `--server <url>` | Override server URL (default: `http://localhost:3456`) |
| positional arg | Nutrition question to send to the AI |
