/**
 * x402 skill client — enhanced wrapper for the OpenClaw webhook proxy.
 *
 * Accepts the wallet private key via --key (instead of .env) and outputs
 * structured JSON so the agent can parse every outcome.
 *
 * Modes:
 *   --info                        Fetch service info (free, no wallet needed)
 *   --key <pk> "message"          Send a paid agent request
 *   --key <pk> --ping             Paid health-check
 *   --server <url>                Override server URL (default http://localhost:3456)
 *
 * Exit codes:
 *   0  success
 *   1  config error (missing key / secret)
 *   2  payment error (402 / insufficient balance)
 *   3  server or agent error (502+)
 *   4  network / connection error
 */
import "dotenv/config";
import { createThirdwebClient } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { privateKeyToAccount, createWalletAdapter } from "thirdweb/wallets";
import { wrapFetchWithPayment } from "thirdweb/x402";

interface OutputSuccess {
    status: "success";
    wallet: string;
    reply?: string;
    pong?: boolean;
    runId?: string;
    durationMs?: number;
    receipt?: unknown;
    httpStatus: number;
    raw: unknown;
}

interface OutputInfo {
    status: "success";
    service: string;
    price: string;
    network: string;
    walletAddress: string;
    agentId: string;
    endpoints: Record<string, string>;
}

interface OutputError {
    status: "config_error" | "payment_error" | "agent_error" | "network_error";
    message: string;
    wallet?: string;
    httpStatus?: number;
    detail?: unknown;
}

type Output = OutputSuccess | OutputInfo | OutputError;

function out(data: Output, exitCode: number): never {
    console.log(JSON.stringify(data, null, 2));
    process.exit(exitCode);
}

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
function parseArgs() {
    const args = process.argv.slice(2);
    let info = false;
    let ping = false;
    let key: string | undefined;
    let server = "http://localhost:3456";
    const positional: string[] = [];

    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === "--info") {
            info = true;
        } else if (a === "--ping") {
            ping = true;
        } else if (a === "--key" && i + 1 < args.length) {
            key = args[++i];
        } else if (a === "--server" && i + 1 < args.length) {
            server = args[++i];
        } else if (!a.startsWith("--")) {
            positional.push(a);
        }
    }

    return { info, ping, key, server, message: positional.join(" ") || undefined };
}

// ---------------------------------------------------------------------------
// Info mode — free endpoint
// ---------------------------------------------------------------------------
async function fetchInfo(serverUrl: string): Promise<void> {
    try {
        const res = await fetch(`${serverUrl}/`);
        const data = await res.json() as Record<string, unknown>;
        out(
            {
                status: "success",
                service: (data.service as string) ?? "unknown",
                price: (data.price as string) ?? "unknown",
                network: (data.network as string) ?? "unknown",
                walletAddress: (data.walletAddress as string) ?? "unknown",
                agentId: (data.agentId as string) ?? "unknown",
                endpoints: (data.endpoints as Record<string, string>) ?? {},
            },
            0,
        );
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
            out({ status: "network_error", message: `Cannot connect to server at ${serverUrl}. Is it running?` }, 4);
        }
        out({ status: "network_error", message: msg }, 4);
    }
}

// ---------------------------------------------------------------------------
// Paid request (agent or ping)
// ---------------------------------------------------------------------------
async function paidRequest(opts: {
    key: string;
    server: string;
    ping: boolean;
    message?: string;
}): Promise<void> {
    const { THIRDWEB_SECRET_KEY } = process.env;
    if (!THIRDWEB_SECRET_KEY) {
        out(
            { status: "config_error", message: "Missing THIRDWEB_SECRET_KEY in environment or .env" },
            1,
        );
    }

    const thirdweb = createThirdwebClient({ secretKey: THIRDWEB_SECRET_KEY! });
    const account = privateKeyToAccount({ client: thirdweb, privateKey: opts.key });

    const wallet = createWalletAdapter({
        adaptedAccount: account,
        chain: baseSepolia,
        client: thirdweb,
        onDisconnect: async () => { },
        switchChain: async () => { },
    });
    await wallet.connect({ client: thirdweb });

    const paidFetch = wrapFetchWithPayment(fetch, thirdweb, wallet);
    const walletAddr = account.address;

    try {
        if (opts.ping) {
            const res = await paidFetch(`${opts.server}/ping`);
            const data = await res.json() as Record<string, unknown>;

            if (res.status === 200) {
                out({
                    status: "success",
                    wallet: walletAddr,
                    pong: true,
                    receipt: data.receipt,
                    httpStatus: res.status,
                    raw: data,
                }, 0);
            }
            handleErrorStatus(res, data, walletAddr);
        }

        const message = opts.message ?? "Hola, que puedes hacer?";
        const res = await paidFetch(`${opts.server}/agent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });

        const data = await res.json() as Record<string, unknown>;

        if (res.status === 200) {
            out({
                status: "success",
                wallet: walletAddr,
                reply: (data.reply as string) ?? undefined,
                runId: (data.runId as string) ?? undefined,
                durationMs: (data.durationMs as number) ?? undefined,
                receipt: data.receipt,
                httpStatus: res.status,
                raw: data,
            }, 0);
        }

        handleErrorStatus(res, data, walletAddr);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
            out({ status: "network_error", message: `Cannot connect to server at ${opts.server}. Is it running?`, wallet: walletAddr }, 4);
        }
        if (msg.includes("insufficient") || msg.includes("balance") || msg.includes("402")) {
            out({ status: "payment_error", message: msg, wallet: walletAddr }, 2);
        }
        out({ status: "network_error", message: msg, wallet: walletAddr }, 4);
    }
}

function handleErrorStatus(res: Response, data: Record<string, unknown>, wallet: string): never {
    if (res.status === 402) {
        out({
            status: "payment_error",
            message: "Payment required — insufficient USDC balance on Base Sepolia.",
            wallet,
            httpStatus: 402,
            detail: data,
        }, 2);
    }
    if (res.status === 502) {
        out({
            status: "agent_error",
            message: "The remote agent failed to process the request.",
            wallet,
            httpStatus: 502,
            detail: data,
        }, 3);
    }
    out({
        status: "agent_error",
        message: `Server returned HTTP ${res.status}`,
        wallet,
        httpStatus: res.status,
        detail: data,
    }, 3);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const opts = parseArgs();

if (opts.info) {
    fetchInfo(opts.server);
} else if (!opts.key) {
    out({ status: "config_error", message: "Missing --key <private_key>. Provide the wallet private key." }, 1);
} else {
    paidRequest({ key: opts.key, server: opts.server, ping: opts.ping, message: opts.message });
}
