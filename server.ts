import express from "express";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;
const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || "").trim();
const GITHUB_MODELS_ENDPOINT = "https://models.github.ai/inference";
const GITHUB_MODELS_MODEL = "openai/gpt-4o-mini";
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const SOLANA_RPC_URL =
  (process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com").trim();
const YIELD_ONCHAIN_NETWORK = (
  process.env.YIELD_ONCHAIN_NETWORK || "mainnet-beta"
).trim();
const ENABLE_SIMULATED_YIELD =
  (process.env.ENABLE_SIMULATED_YIELD || "").trim().toLowerCase() === "true";
const YIELD_PROTOCOL_POOLS: Record<VaultId, string> = {
  meteora: (process.env.METEORA_SOL_USDT_POOL || "").trim(),
  raydium: (process.env.RAYDIUM_SOL_USDT_POOL || "").trim(),
  orca: (process.env.ORCA_SOL_USDT_POOL || "").trim(),
};
const solanaConnection = new Connection(SOLANA_RPC_URL, "confirmed");

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "online",
    service: "aetheris-api",
    timestamp: new Date().toISOString(),
  });
});

type ChatHistoryMessage = {
  id?: string;
  sender?: "user" | "node";
  role?: "user" | "assistant";
  time?: string;
  timestamp?: string;
  text?: string;
};

// Helper to check and initialize GoogleGenAI client lazily
let aiClient: GoogleGenAI | null = null;
let openaiClient: OpenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY is not configured. Please add your key in Settings > Secrets.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

function getOpenAIClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured. Please add it to environment variables.");
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return openaiClient;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number | undefined) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function retryWithBackoff<T>(
  action: () => Promise<T>,
  maxAttempts = 4,
  baseDelay = 500,
) {
  let attempt = 0;
  while (true) {
    try {
      return await action();
    } catch (error: any) {
      const status =
        Number(error?.status || error?.response?.status || error?.statusCode) ||
        undefined;
      attempt += 1;
      if (attempt >= maxAttempts || !isRetryableStatus(status)) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`Retrying request after ${delay}ms due to status ${status}. attempt=${attempt}`);
      await sleep(delay);
    }
  }
}

async function getChatGPTResponse(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
) {
  const client = getOpenAIClient();
  return retryWithBackoff(async () => {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.4,
      max_tokens: 600,
    });
    const content = response.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : "";
  });
}

function buildUrl(baseUrl: string, pathName: string) {
  return `${baseUrl.replace(/\/$/, "")}/${pathName.replace(/^\//, "")}`;
}

const DB_FILE =
  process.env.SERVER_DATA_FILE ||
  path.join(process.env.NETLIFY ? "/tmp" : process.cwd(), "server-data.json");

const PRICE_TABLE: Record<string, number> = {
  SOL: 140,
  USDC: 1,
  USDT: 1,
  JUP: 1.15,
  BONK: 0.0000225,
};

type AccountRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  walletAddress: string;
  walletSecretKey: number[];
  createdAt: string;
  balances: Record<string, number>;
  referralEarningsUSD: number;
  referrer?: string;
  referredWallets: string[];
  initialDepositProcessed?: boolean;
  vaultPositions?: Record<string, number>;
};

type Database = {
  accounts: AccountRecord[];
  vaultAccounts?: Record<string, { address: string; secretKey: number[] }>;
};

const defaultDatabase: Database = {
  accounts: [],
  vaultAccounts: {},
};

type VaultId = "meteora" | "raydium" | "orca";

type VaultDefinition = {
  id: VaultId;
  protocol: "Meteora" | "Raydium" | "Orca";
  name: string;
  pair: "SOL/USDT";
  apy: number;
  risk: "Low" | "Medium";
  tvl: string;
  aiScore: number;
  liquidity: string;
  depositFee: string;
  withdrawalFee: string;
  history: number[];
};

const DEVNET_VAULTS: VaultDefinition[] = [
  {
    id: "meteora",
    protocol: "Meteora",
    name: "Meteora SOL Vault",
    pair: "SOL/USDT",
    apy: 19.2,
    risk: "Low",
    tvl: "$240M",
    aiScore: 96,
    liquidity: "Very strong",
    depositFee: "0.08%",
    withdrawalFee: "0.05%",
    history: [16.8, 17.2, 18.1, 18.6, 18.9, 19.0, 19.2],
  },
  {
    id: "raydium",
    protocol: "Raydium",
    name: "Raydium SOL Vault",
    pair: "SOL/USDT",
    apy: 18.4,
    risk: "Medium",
    tvl: "$110M",
    aiScore: 91,
    liquidity: "Strong",
    depositFee: "0.10%",
    withdrawalFee: "0.06%",
    history: [17.4, 17.8, 18.9, 18.1, 18.6, 18.2, 18.4],
  },
  {
    id: "orca",
    protocol: "Orca",
    name: "Orca SOL Vault",
    pair: "SOL/USDT",
    apy: 17.8,
    risk: "Low",
    tvl: "$180M",
    aiScore: 89,
    liquidity: "Strong",
    depositFee: "0.07%",
    withdrawalFee: "0.04%",
    history: [16.9, 17.1, 17.3, 17.4, 17.6, 17.7, 17.8],
  },
];

async function safeReadDb(): Promise<Database> {
  try {
    const contents = await fs.readFile(DB_FILE, "utf-8");
    const parsed = JSON.parse(contents) as Database;
    return {
      ...defaultDatabase,
      ...parsed,
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      vaultAccounts: parsed.vaultAccounts || {},
    };
  } catch (err) {
    await fs.writeFile(DB_FILE, JSON.stringify(defaultDatabase, null, 2));
    return defaultDatabase;
  }
}

async function safeWriteDb(db: Database) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function sanitizeAccount(account: AccountRecord) {
  const { passwordHash, walletSecretKey, ...rest } = account;
  return rest;
}

function walletResponse(account: AccountRecord, onChainSol?: number) {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    address: account.walletAddress,
    balances: {
      ...account.balances,
      SOL: Number((onChainSol ?? account.balances.SOL ?? 0).toFixed(9)),
    },
    referralEarningsUSD: account.referralEarningsUSD,
    referrer: account.referrer || "",
    referralCount: account.referredWallets.length,
    referredWallets: account.referredWallets,
    vaultPositions: account.vaultPositions || {},
  };
}

function toUsdAmount(amount: number, symbol: string) {
  return amount * (PRICE_TABLE[symbol] ?? 1);
}

function createGeneratedWallet() {
  const keypair = Keypair.generate();
  return {
    walletAddress: keypair.publicKey.toBase58(),
    walletSecretKey: Array.from(keypair.secretKey),
  };
}

function getVaultDefinition(vaultId: string) {
  return DEVNET_VAULTS.find((vault) => vault.id === vaultId);
}

function solToLamports(amountSol: number) {
  return Math.round(amountSol * LAMPORTS_PER_SOL);
}

function lamportsToSol(lamports: number) {
  return Number((lamports / LAMPORTS_PER_SOL).toFixed(9));
}

function accountKeypair(account: AccountRecord) {
  return Keypair.fromSecretKey(Uint8Array.from(account.walletSecretKey));
}

function publicKeyString(address: string) {
  return new PublicKey(address).toBase58();
}

async function findAccountByAddress(db: Database, address: string) {
  const normalizedAddress = publicKeyString(String(address || "").trim());
  return db.accounts.find((account) => account.walletAddress === normalizedAddress);
}

async function ensureVaultAccounts(db: Database) {
  let changed = false;
  db.vaultAccounts = db.vaultAccounts || {};

  for (const vault of DEVNET_VAULTS) {
    if (!db.vaultAccounts[vault.id]) {
      const keypair = Keypair.generate();
      db.vaultAccounts[vault.id] = {
        address: keypair.publicKey.toBase58(),
        secretKey: Array.from(keypair.secretKey),
      };
      changed = true;
    }
  }

  if (changed) {
    await safeWriteDb(db);
  }

  return db.vaultAccounts;
}

function getVaultKeypair(db: Database, vaultId: VaultId) {
  const record = db.vaultAccounts?.[vaultId];
  if (!record) throw new Error("Vault account is not initialized.");
  return Keypair.fromSecretKey(Uint8Array.from(record.secretKey));
}

async function getDevnetSolBalance(address: string) {
  const lamports = await solanaConnection.getBalance(new PublicKey(address), "confirmed");
  return lamportsToSol(lamports);
}

type PoolMetric = {
  protocol: "Raydium" | "Meteora" | "Orca";
  pair: "SOL/USDT";
  apy: number;
  tvl: number;
  tvlLabel: string;
  volume24h: number;
  ageDays: number;
  audited: boolean;
  riskScore: number;
  risk: "Low" | "Medium" | "High";
  aiScore: number;
  recommended?: boolean;
  source: string;
  riskDrivers: string[];
};

type RawPoolMetric = Omit<
  PoolMetric,
  "aiScore" | "recommended" | "riskScore" | "risk" | "riskDrivers"
>;

const SOL_SYMBOLS = new Set(["SOL", "WSOL", "SOLANA"]);
const USDT_SYMBOLS = new Set(["USDT", "USD TETHER"]);

function normalizeSymbol(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^W/, (prefix) => prefix);
}

function isSolSymbol(value: unknown) {
  return SOL_SYMBOLS.has(normalizeSymbol(value));
}

function isUsdtSymbol(value: unknown) {
  return USDT_SYMBOLS.has(normalizeSymbol(value));
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%\s,]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = asNumber(value, Number.NaN);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeApy(value: unknown) {
  const parsed = asNumber(value);
  const percent = parsed > 0 && parsed <= 1 ? parsed * 100 : parsed;
  return Number(percent.toFixed(2));
}

function roundMetric(value: number) {
  return Number(value.toFixed(2));
}

function getNestedValue(item: any, pathName: string) {
  return pathName.split(".").reduce((value, key) => value?.[key], item);
}

function readPoolArray(data: any, paths: string[]) {
  for (const pathName of paths) {
    const value = pathName ? getNestedValue(data, pathName) : data;
    if (Array.isArray(value)) return value;
  }
  return [];
}

function pairMatches(pool: any, symbolPaths: [string, string][]) {
  return symbolPaths.some(([leftPath, rightPath]) => {
    const left = getNestedValue(pool, leftPath);
    const right = getNestedValue(pool, rightPath);
    return (
      (isSolSymbol(left) && isUsdtSymbol(right)) ||
      (isUsdtSymbol(left) && isSolSymbol(right))
    );
  });
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`${url} returned ${response.status}`);
    }
    const contentType = response.headers.get("content-type") || "";
    const body = await response.text();
    const trimmedBody = body.trim();

    if (!trimmedBody) {
      throw new Error(`${url} returned an empty response`);
    }

    if (
      trimmedBody.startsWith("<") ||
      (!contentType.includes("json") &&
        !trimmedBody.startsWith("{") &&
        !trimmedBody.startsWith("["))
    ) {
      throw new Error(`${url} returned HTML instead of JSON`);
    }

    return JSON.parse(trimmedBody);
  } finally {
    clearTimeout(timeout);
  }
}

function calculateRiskScore(pool: RawPoolMetric) {
  const drivers: string[] = [];
  let score = 0;

  if (pool.tvl <= 0) {
    score += 25;
    drivers.push("missing TVL");
  } else if (pool.tvl < 1_000_000) {
    score += 35;
    drivers.push("very low TVL");
  } else if (pool.tvl < 10_000_000) {
    score += 25;
    drivers.push("low TVL");
  } else if (pool.tvl < 50_000_000) {
    score += 12;
    drivers.push("moderate TVL");
  }

  if (pool.apy <= 0) {
    score += 15;
    drivers.push("missing APY");
  } else if (pool.apy > 100) {
    score += 30;
    drivers.push("extreme APY");
  } else if (pool.apy > 50) {
    score += 18;
    drivers.push("elevated APY");
  } else if (pool.apy > 30) {
    score += 8;
    drivers.push("high APY");
  }

  if (pool.volume24h <= 0) {
    score += 12;
    drivers.push("missing volume");
  } else if (pool.volume24h < 250_000) {
    score += 20;
    drivers.push("thin daily volume");
  } else if (pool.volume24h < 1_000_000) {
    score += 12;
    drivers.push("light daily volume");
  }

  if (pool.ageDays < 30) {
    score += 20;
    drivers.push("new pool");
  } else if (pool.ageDays < 90) {
    score += 10;
    drivers.push("young pool");
  }

  if (!pool.audited) {
    score += 10;
    drivers.push("audit unknown");
  }

  return {
    score: Math.min(Math.round(score), 100),
    drivers: drivers.length ? drivers : ["deep liquidity", "established pool"],
  };
}

function aiScore(pool: RawPoolMetric, riskScoreValue: number) {
  const yieldScore = Math.min(pool.apy / 30, 1) * 30;
  const tvlScore = Math.min(pool.tvl / 100_000_000, 1) * 25;
  const volumeScore = Math.min(pool.volume24h / 10_000_000, 1) * 20;
  const safetyScore = (100 - riskScoreValue) * 0.25;
  return Math.max(0, Math.min(100, Math.round(yieldScore + tvlScore + volumeScore + safetyScore)));
}

function riskLabel(score: number): PoolMetric["risk"] {
  if (score <= 30) return "Low";
  if (score <= 60) return "Medium";
  return "High";
}

function formatPoolTvl(value: number) {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(0)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function scorePool(pool: RawPoolMetric): PoolMetric {
  const calculatedRisk = calculateRiskScore(pool);
  return {
    ...pool,
    apy: roundMetric(pool.apy),
    tvl: roundMetric(pool.tvl),
    volume24h: roundMetric(pool.volume24h),
    tvlLabel: formatPoolTvl(pool.tvl),
    riskScore: calculatedRisk.score,
    risk: riskLabel(calculatedRisk.score),
    riskDrivers: calculatedRisk.drivers,
    aiScore: aiScore(pool, calculatedRisk.score),
  };
}

async function fetchDefiLlamaMetrics() {
  const data = await fetchJson("https://yields.llama.fi/pools");
  const pools = readPoolArray(data, ["data"]);

  return (["Raydium", "Meteora", "Orca"] as const).map((protocol) => {
    const exactMatch = pools.find((pool: any) => {
      const project = String(pool.project || "").toLowerCase();
      const symbol = String(pool.symbol || "").toUpperCase().replace(/-/g, "/");
      return (
        project.includes(protocol.toLowerCase()) &&
        pool.chain === "Solana" &&
        (symbol === "SOL/USDT" || symbol === "USDT/SOL")
      );
    });

    const solStableMatch = pools.find((pool: any) => {
      const project = String(pool.project || "").toLowerCase();
      const symbol = String(pool.symbol || "").toUpperCase().replace(/-/g, "/");
      return (
        project.includes(protocol.toLowerCase()) &&
        pool.chain === "Solana" &&
        symbol.includes("SOL") &&
        (symbol.includes("USDT") || symbol.includes("USDC"))
      );
    });

    const match = exactMatch ?? solStableMatch;
    if (!match) return null;

    return {
      protocol,
      pair: "SOL/USDT" as const,
      apy: normalizeApy(match.apy),
      tvl: firstNumber(match.tvlUsd),
      tvlLabel: "",
      volume24h: 0,
      ageDays:
        protocol === "Meteora" ? 250 : protocol === "Raydium" ? 365 : 500,
      audited: true,
      source: `DefiLlama Yields API${exactMatch ? "" : " stable-pair fallback"}`,
    };
  });
}

async function fetchYieldPoolMetrics(): Promise<PoolMetric[]> {
  try {
    const [defiLlamaResult, raydiumResult, meteoraResult, orcaResult] = await Promise.allSettled([
      fetchDefiLlamaMetrics(),
      fetchJson("https://api-v3.raydium.io/pools/info/list"),
      fetchJson("https://app.meteora.ag/clmm-api/pair/all"),
      fetchJson("https://api.orca.so/v1/whirlpool/list"),
    ]);

    const defiLlamaPools =
      defiLlamaResult.status === "fulfilled" ? defiLlamaResult.value : [];
    const raydiumData = raydiumResult.status === "fulfilled" ? raydiumResult.value : null;
    const meteoraData = meteoraResult.status === "fulfilled" ? meteoraResult.value : null;
    const orcaData = orcaResult.status === "fulfilled" ? orcaResult.value : null;

    const raydiumPool = readPoolArray(raydiumData, ["data.data", "data", "pools"]).find(
      (pool: any) =>
        pairMatches(pool, [
          ["mintA.symbol", "mintB.symbol"],
          ["mintA.name", "mintB.name"],
          ["tokenA.symbol", "tokenB.symbol"],
        ]),
    );

    const meteoraPool = readPoolArray(meteoraData, ["", "data", "pairs"]).find(
      (pool: any) =>
        pairMatches(pool, [
          ["token_x_symbol", "token_y_symbol"],
          ["tokenX.symbol", "tokenY.symbol"],
          ["mint_x_symbol", "mint_y_symbol"],
        ]),
    );

    const orcaPool = readPoolArray(orcaData, ["", "data", "whirlpools"]).find(
      (pool: any) =>
        pairMatches(pool, [
          ["tokenA.symbol", "tokenB.symbol"],
          ["token_a.symbol", "token_b.symbol"],
          ["tokenMintA.symbol", "tokenMintB.symbol"],
        ]),
    );

    const protocolPools: RawPoolMetric[] = [
      {
        protocol: "Raydium",
        pair: "SOL/USDT",
        apy: normalizeApy(firstNumber(raydiumPool?.apy, raydiumPool?.apr, raydiumPool?.day?.apr)),
        tvl: firstNumber(raydiumPool?.tvl, raydiumPool?.tvlUsd, raydiumPool?.liquidity),
        tvlLabel: "",
        volume24h: firstNumber(raydiumPool?.day?.volume, raydiumPool?.volume24h, raydiumPool?.volume24hUsd),
        ageDays: 365,
        audited: true,
        source: "Raydium API",
      },
      {
        protocol: "Meteora",
        pair: "SOL/USDT",
        apy: normalizeApy(firstNumber(meteoraPool?.apy, meteoraPool?.apr, meteoraPool?.base_fee_percentage)),
        tvl: firstNumber(meteoraPool?.tvl, meteoraPool?.tvlUsd, meteoraPool?.liquidity),
        tvlLabel: "",
        volume24h: firstNumber(meteoraPool?.volume24h, meteoraPool?.trade_volume_24h, meteoraPool?.volume24hUsd),
        ageDays: 250,
        audited: true,
        source: "Meteora API",
      },
      {
        protocol: "Orca",
        pair: "SOL/USDT",
        apy: normalizeApy(firstNumber(orcaPool?.apy, orcaPool?.apr, orcaPool?.yieldOverTvl)),
        tvl: firstNumber(orcaPool?.tvl, orcaPool?.tvlUsd, orcaPool?.liquidity),
        tvlLabel: "",
        volume24h: firstNumber(orcaPool?.volume24h, orcaPool?.volume24hUsd, orcaPool?.volume?.day),
        ageDays: 500,
        audited: true,
        source: "Orca API",
      },
    ];

    const pools = protocolPools.map((pool, index) => {
      const fallback =
        defiLlamaPools.find((item) => item?.protocol === pool.protocol) ??
        null;
      const merged = fallback && (!pool.apy || !pool.tvl)
        ? {
            ...pool,
            apy: pool.apy || fallback.apy,
            tvl: pool.tvl || fallback.tvl,
            source: `${pool.source} + ${fallback.source}`,
          }
        : pool;
      return scorePool(merged);
    });

    const sorted = pools.sort((a, b) => b.aiScore - a.aiScore);
    if (sorted[0]) sorted[0].recommended = true;
    return sorted;
  } catch (error: any) {
    console.error("Failed to fetch pool metrics:", error?.message || error);
    const fallbackPools: PoolMetric[] = [
      {
        protocol: "Raydium",
        pair: "SOL/USDT",
        apy: 18.4,
        tvl: 110_000_000,
        tvlLabel: "$110M",
        volume24h: 4_000_000,
        ageDays: 365,
        audited: true,
        riskScore: 40,
        risk: "Medium",
        aiScore: 91,
        recommended: false,
        source: "static fallback",
        riskDrivers: ["fallback data"],
      },
      {
        protocol: "Meteora",
        pair: "SOL/USDT",
        apy: 19.2,
        tvl: 240_000_000,
        tvlLabel: "$240M",
        volume24h: 6_000_000,
        ageDays: 250,
        audited: true,
        riskScore: 35,
        risk: "Low",
        aiScore: 96,
        recommended: false,
        source: "static fallback",
        riskDrivers: ["fallback data"],
      },
      {
        protocol: "Orca",
        pair: "SOL/USDT",
        apy: 17.8,
        tvl: 180_000_000,
        tvlLabel: "$180M",
        volume24h: 3_000_000,
        ageDays: 500,
        audited: true,
        riskScore: 30,
        risk: "Low",
        aiScore: 89,
        recommended: false,
        source: "static fallback",
        riskDrivers: ["fallback data"],
      },
    ];

    return fallbackPools.sort((a, b) => b.aiScore - a.aiScore);
  }
}

async function refreshAccountSolBalance(account: AccountRecord) {
  const onChainSol = await getDevnetSolBalance(account.walletAddress);
  account.balances = {
    ...account.balances,
    SOL: Number(onChainSol.toFixed(9)),
  };
  return onChainSol;
}

async function buildVaultStatus(account: AccountRecord, db: Database) {
  const vaultAccounts = await ensureVaultAccounts(db);
  const walletBalanceSol = await getDevnetSolBalance(account.walletAddress);
  const positions = account.vaultPositions || {};
  const vaults = await Promise.all(
    DEVNET_VAULTS.map(async (vault) => {
      const vaultAccount = vaultAccounts[vault.id];
      const vaultBalanceSol = vaultAccount
        ? await getDevnetSolBalance(vaultAccount.address)
        : 0;
      return {
        ...vault,
        address: vaultAccount?.address || "",
        balanceSol: vaultBalanceSol,
        positionSol: positions[vault.id] || 0,
      };
    }),
  );

  return {
    network: "devnet",
    rpcUrl: SOLANA_RPC_URL,
    wallet: {
      address: account.walletAddress,
      balanceSol: walletBalanceSol,
    },
    positions,
    vaults,
  };
}

async function sendSolTransfer(from: Keypair, to: string, amountSol: number) {
  const lamports = solToLamports(amountSol);
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: new PublicKey(to),
      lamports,
    }),
  );

  return sendAndConfirmTransaction(solanaConnection, transaction, [from], {
    commitment: "confirmed",
  });
}

async function buildAndSendProtocolLiquidityDeposit({
  account,
  vault,
  solAmount,
}: {
  account: AccountRecord;
  vault: VaultDefinition;
  solAmount: number;
}) {
  const userKeypair = accountKeypair(account);
  const db = await safeReadDb();
  const vaultAccount = await ensureVaultAccounts(db);
  const destination = vaultAccount[vault.id]?.address;
  if (!destination) {
    throw new Error("Vault destination account not initialized.");
  }

  const signature = await sendSolTransfer(userKeypair, destination, solAmount);
  return signature;
}

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, referral } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required signup fields." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const db = await safeReadDb();
    if (db.accounts.some((account) => account.email === normalizedEmail)) {
      return res.status(409).json({ error: "An account already exists for this email." });
    }

    const wallet = createGeneratedWallet();
    const newAccount: AccountRecord = {
      id: crypto.randomUUID(),
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(String(password)),
      walletAddress: wallet.walletAddress,
      walletSecretKey: wallet.walletSecretKey,
      createdAt: new Date().toISOString(),
      balances: {
        SOL: 1.5,
        USDC: 400,
        JUP: 200,
        BONK: 50000,
        USDT: 100,
      },
      referralEarningsUSD: 0,
      referrer: referral ? String(referral).trim() : undefined,
      referredWallets: [],
      vaultPositions: {},
      initialDepositProcessed: false,
    };

    if (referral) {
      const referrerAccount = db.accounts.find(
        (account) => account.walletAddress === String(referral).trim(),
      );
      if (referrerAccount && referrerAccount.walletAddress !== newAccount.walletAddress) {
        referrerAccount.referredWallets = Array.from(
          new Set([...referrerAccount.referredWallets, newAccount.walletAddress]),
        );
      }
    }

    db.accounts.push(newAccount);
    await safeWriteDb(db);
    return res.json({ success: true, account: walletResponse(newAccount) });
  } catch (error: any) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Could not create account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Missing login credentials." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const db = await safeReadDb();
    const account = db.accounts.find((item) => item.email === normalizedEmail);
    if (!account || account.passwordHash !== hashPassword(String(password))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }

    return res.json({ success: true, account: walletResponse(account) });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed." });
  }
});

app.get("/api/wallet/status", async (req, res) => {
  try {
    const email = String(req.query.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "Missing email query." });
    }

    const db = await safeReadDb();
    const account = db.accounts.find((item) => item.email === email);
    if (!account) {
      return res.status(404).json({ error: "Account not found." });
    }

    await refreshAccountSolBalance(account);

    return res.json({ success: true, wallet: walletResponse(account, account.balances.SOL) });
  } catch (error: any) {
    console.error("Wallet status error:", error);
    return res.status(500).json({ error: "Could not load wallet status." });
  }
});

app.get("/api/yield-vaults/status", async (req, res) => {
  try {
    const address = String(req.query.address || "").trim();
    if (!address) {
      return res.status(400).json({ success: false, error: "Missing wallet address." });
    }

    const db = await safeReadDb();
    const account = await findAccountByAddress(db, address);
    if (!account) {
      return res.status(404).json({ success: false, error: "Account not found." });
    }

    const pools = await fetchYieldPoolMetrics();
    const status = await buildVaultStatus(account, db);
    return res.json({
      success: true,
      status: {
        ...status,
        pools,
        adapterMode: "protocol-sdk-required",
        adapterMessage:
          "Real balances are read from Solana devnet. Deposits require the matching protocol SDK and configured devnet pool IDs.",
      },
    });
  } catch (error: any) {
    console.error("Yield vault status error:", error);
    return res.status(500).json({ success: false, error: error.message || "Could not load vault status." });
  }
});

app.get("/api/yield-vaults/pools", async (req, res) => {
  try {
    const pools = await fetchYieldPoolMetrics();
    return res.json({ success: true, pools });
  } catch (error: any) {
    console.error("Yield pools error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Could not load yield pool metrics.",
    });
  }
});

app.get("/api/yield-vaults/onchain-config", (_req, res) => {
  const protocols = DEVNET_VAULTS.map((vault) => {
    const poolAddress = YIELD_PROTOCOL_POOLS[vault.id];
    return {
      id: vault.id,
      protocol: vault.protocol,
      poolAddress,
      configured: Boolean(poolAddress),
      requirements: [
        "Connect a browser Solana wallet such as Phantom.",
        "Use a mainnet RPC URL for real protocol liquidity.",
        "Hold both SOL and USDT, or add a swap/split route before LP deposit.",
        "Sign the protocol transaction in your wallet.",
      ],
    };
  });

  return res.json({
    success: true,
    mode: ENABLE_SIMULATED_YIELD ? "simulated-enabled" : "onchain-only",
    simulatedDepositsEnabled: ENABLE_SIMULATED_YIELD,
    network: YIELD_ONCHAIN_NETWORK,
    rpcUrl: SOLANA_RPC_URL,
    protocols,
  });
});

app.post("/api/yield-vaults/airdrop", async (req, res) => {
  try {
    const { address, amountSol } = req.body;
    const normalizedAddress = publicKeyString(String(address || "").trim());
    const amount = Math.min(Math.max(Number(amountSol) || 1, 0.1), 2);

    const signature = await solanaConnection.requestAirdrop(
      new PublicKey(normalizedAddress),
      solToLamports(amount),
    );
    const latestBlockhash = await solanaConnection.getLatestBlockhash();
    await solanaConnection.confirmTransaction(
      {
        signature,
        ...latestBlockhash,
      },
      "confirmed",
    );

    const balanceSol = await getDevnetSolBalance(normalizedAddress);
    return res.json({ success: true, signature, balanceSol });
  } catch (error: any) {
    console.error("Yield vault airdrop error:", error);
    return res.status(500).json({
      success: false,
      error:
        error?.message ||
        "Devnet airdrop failed. The public faucet may be rate limited.",
    });
  }
});

app.post("/api/yield-vaults/deposit", async (req, res) => {
  try {
    if (!ENABLE_SIMULATED_YIELD) {
      return res.status(501).json({
        success: false,
        error:
          "Simulated vault deposits are disabled. Configure protocol pool IDs and submit a wallet-signed Raydium/Orca/Meteora LP transaction.",
      });
    }

    const { address, vaultId, solAmount } = req.body;
    const amountSol = Number(solAmount);

    if (!address || !vaultId || Number.isNaN(amountSol) || amountSol <= 0) {
      return res.status(400).json({ success: false, error: "Invalid deposit request." });
    }

    const vault = getVaultDefinition(String(vaultId));
    if (!vault) {
      return res.status(404).json({ success: false, error: "Vault not found." });
    }

    const db = await safeReadDb();
    const account = await findAccountByAddress(db, String(address));
    if (!account) {
      return res.status(404).json({ success: false, error: "Account not found." });
    }

    const walletBalance = await getDevnetSolBalance(account.walletAddress);
    if (amountSol + 0.01 > walletBalance) {
      return res.status(400).json({
        success: false,
        error: `Insufficient devnet SOL. Wallet has ${walletBalance} SOL and needs deposit plus fees.`,
      });
    }

    const signature = await buildAndSendProtocolLiquidityDeposit({
      account,
      vault,
      solAmount: amountSol,
    });

    account.vaultPositions = account.vaultPositions || {};
    account.vaultPositions[vault.id] =
      (account.vaultPositions[vault.id] || 0) + amountSol;

    await refreshAccountSolBalance(account);
    await safeWriteDb(db);

    const status = await buildVaultStatus(account, db);
    return res.json({ success: true, result: signature, status, wallet: walletResponse(account, account.balances.SOL) });
  } catch (error: any) {
    console.error("Yield vault deposit error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Protocol deposit failed.",
    });
  }
});

app.post("/api/yield-vaults/move", async (req, res) => {
  try {
    const { address, fromVaultId, toVaultId, solAmount } = req.body;
    const amount = Number(solAmount);

    if (!address || !fromVaultId || !toVaultId || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid move request." });
    }

    if (fromVaultId === toVaultId) {
      return res.status(400).json({ success: false, error: "Select different source and target vaults." });
    }

    const fromVault = getVaultDefinition(String(fromVaultId));
    const toVault = getVaultDefinition(String(toVaultId));
    if (!fromVault || !toVault) {
      return res.status(404).json({ success: false, error: "One or both vaults are not found." });
    }

    const db = await safeReadDb();
    const account = await findAccountByAddress(db, String(address));
    if (!account) {
      return res.status(404).json({ success: false, error: "Account not found." });
    }

    account.vaultPositions = account.vaultPositions || {};
    const sourceBalance = account.vaultPositions[fromVault.id] || 0;
    if (amount > sourceBalance) {
      return res.status(400).json({ success: false, error: "Move amount exceeds your position in the source vault." });
    }

    const vaultAccounts = await ensureVaultAccounts(db);
    const sourceRecord = vaultAccounts[fromVault.id];
    const destinationRecord = vaultAccounts[toVault.id];
    if (!sourceRecord || !destinationRecord) {
      return res.status(500).json({ success: false, error: "Vault destination accounts are not initialized." });
    }

    const sourceKeypair = Keypair.fromSecretKey(Uint8Array.from(sourceRecord.secretKey));
    const txSignature = await sendSolTransfer(sourceKeypair, destinationRecord.address, amount);

    account.vaultPositions[fromVault.id] = Number((sourceBalance - amount).toFixed(9));
    account.vaultPositions[toVault.id] = Number(
      ((account.vaultPositions[toVault.id] || 0) + amount).toFixed(9),
    );

    await refreshAccountSolBalance(account);
    await safeWriteDb(db);

    const status = await buildVaultStatus(account, db);
    return res.json({
      success: true,
      signature: txSignature,
      status,
      wallet: walletResponse(account, account.balances.SOL),
    });
  } catch (error: any) {
    console.error("Yield vault move error:", error);
    return res.status(500).json({ success: false, error: error?.message || "Vault move failed." });
  }
});

app.post("/api/yield-vaults/ai-recommendation", async (req, res) => {
  try {
    const { address, vaults, positions, walletBalanceSol } = req.body;
    const prompt = [
      "You are Aetheris AI, a precise Solana DeFi vault analyst. Provide a concise recommendation.",
      `Wallet: ${address || "unknown"}`,
      `Devnet SOL balance: ${walletBalanceSol ?? "unknown"}`,
      `Vaults: ${JSON.stringify(vaults || DEVNET_VAULTS)}`,
      `Positions: ${JSON.stringify(positions || {})}`,
      "Choose the best vault, explain why, and list 3 short bullet points.",
    ].join("\n");

    let text = "";
    if (OPENAI_API_KEY) {
      try {
        text = await getChatGPTResponse([
          {
            role: "system",
            content:
              "You are Aetheris AI, a precise Solana DeFi vault analyst. Be direct and avoid hype.",
          },
          { role: "user", content: prompt },
        ]);
      } catch (error) {
        console.error("OpenAI recommendation failed:", error);
      }
    }

    if (!text && GITHUB_TOKEN) {
      try {
        text = await getGitHubModelsResponse(
          [
            {
              role: "system",
              content:
                "You are Aetheris AI, a precise Solana DeFi vault analyst. Be direct and avoid hype.",
            },
            { role: "user", content: prompt },
          ],
          0.4,
          600,
        );
      } catch (error) {
        console.error("Yield vault GitHub Models recommendation failed:", error);
      }
    }

    if (!text) {
      text =
        "Meteora is currently preferred because it has the highest AI score, strong liquidity, lower risk than Raydium, and the best risk-adjusted APY among the configured SOL/USDT vaults.";
    }

    return res.json({ success: true, recommendation: text });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/wallet/deposit", async (req, res) => {
  try {
    const { email, symbol, amount } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedSymbol = String(symbol || "").trim().toUpperCase();
    const depositAmount = Number(amount);

    if (!normalizedEmail || !normalizedSymbol || Number.isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ error: "Invalid deposit request." });
    }

    const db = await safeReadDb();
    const account = db.accounts.find((item) => item.email === normalizedEmail);
    if (!account) {
      return res.status(404).json({ error: "Account not found." });
    }

    account.balances[normalizedSymbol] = (account.balances[normalizedSymbol] || 0) + depositAmount;
    account.initialDepositProcessed = true;

    if (account.referrer) {
      const referrer = db.accounts.find((item) => item.walletAddress === account.referrer);
      if (referrer) {
        const usdValue = toUsdAmount(depositAmount, normalizedSymbol);
        referrer.referralEarningsUSD += usdValue * 0.05;
      }
    }

    await safeWriteDb(db);
    return res.json({ success: true, wallet: walletResponse(account) });
  } catch (error: any) {
    console.error("Deposit error:", error);
    return res.status(500).json({ error: "Deposit failed." });
  }
});

app.post("/api/wallet/harvest", async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ error: "Missing email." });
    }

    const db = await safeReadDb();
    const account = db.accounts.find((item) => item.email === normalizedEmail);
    if (!account) {
      return res.status(404).json({ error: "Account not found." });
    }

    const portfolioValue = Object.entries(account.balances).reduce(
      (sum, [symbol, value]) => sum + toUsdAmount(value, symbol),
      0,
    );
    const yieldAmount = Number((portfolioValue * 0.003).toFixed(2));
    account.balances.USDC = (account.balances.USDC || 0) + yieldAmount;

    await safeWriteDb(db);
    return res.json({ success: true, wallet: walletResponse(account), harvestedUSD: yieldAmount });
  } catch (error: any) {
    console.error("Harvest error:", error);
    return res.status(500).json({ error: "Harvest failed." });
  }
});

app.get("/api/advisor/recommendation", async (req, res) => {
  try {
    const pools = [
      {
        protocol: "Raydium",
        pair: "SOL-USDC",
        apy: 18.4,
        score: 86,
        reason: "Stable liquidity and strong trade volume make Raydium a reliable yield source.",
      },
      {
        protocol: "Meteora",
        pair: "SOL-JUP",
        apy: 21.9,
        score: 92,
        reason: "Meteora is currently offering high effective yield from JUP pair fees and LP rewards.",
      },
      {
        protocol: "JUP",
        pair: "JUP-USDC",
        apy: 24.1,
        score: 78,
        reason: "Direct JUP liquidity with stablecoin backing gives strong yield with moderate risk.",
      },
    ];
    const best = pools.reduce((winner, pool) => (pool.apy > winner.apy ? pool : winner), pools[0]);
    return res.json({ success: true, best, pools });
  } catch (error: any) {
    console.error("Advisor error:", error);
    return res.status(500).json({ error: "Could not fetch advisor recommendation." });
  }
});

async function getGitHubModelsResponse(
  messages: any[],
  temperature: number,
  maxTokens: number,
) {
  return retryWithBackoff(async () => {
    const response = await fetch(
      buildUrl(GITHUB_MODELS_ENDPOINT, "chat/completions"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GITHUB_TOKEN}`,
        },
        body: JSON.stringify({
          model: GITHUB_MODELS_MODEL,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      },
    );

    const responseBody = await response.text();
    let parsed: any = null;

    try {
      parsed = responseBody ? JSON.parse(responseBody) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const detail =
        parsed?.error?.message ||
        parsed?.message ||
        responseBody ||
        response.statusText;
      const error: any = new Error(`GitHub Models request failed (${response.status}): ${detail}`);
      error.status = response.status;
      throw error;
    }

    const content = parsed?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("GitHub Models returned an empty response.");
    }

    return content;
  });
}

function sanitizeChatHistory(history: unknown): ChatHistoryMessage[] {
  if (!Array.isArray(history)) return [];

  return history
    .filter((message): message is ChatHistoryMessage => {
      return (
        Boolean(message) &&
        typeof message === "object" &&
        typeof (message as ChatHistoryMessage).text === "string"
      );
    })
    .slice(-20);
}

function buildTranscriptFromHistory(history: ChatHistoryMessage[]) {
  return history
    .map((message) => {
      const speaker =
        message.sender === "node" || message.role === "assistant"
          ? "Assistant"
          : "User";
      return `${speaker}: ${message.text}`;
    })
    .join("\n");
}

function buildModelMessagesFromHistory(history: ChatHistoryMessage[]) {
  return history.map((message) => ({
    role:
      message.sender === "node" || message.role === "assistant"
        ? "assistant"
        : "user",
    content: message.text || "",
  }));
}

function generateFallbackChatResponse(message: string, history: ChatHistoryMessage[]) {
  const contextNote =
    history.length > 1
      ? "I kept the previous conversation context in view while drafting this."
      : "I can keep building on this thread as you refine it.";

  return `${contextNote}\n\nFor "${message}", I would start by clarifying the target assets, risk band, rebalance trigger, and execution constraints. Then I would turn that into an Aetheris strategy with allocation rules, safety checks, and monitoring agents before deployment.`;
}

app.post("/api/user/chat/respond", async (req, res) => {
  try {
    const { email, message, history, temperature, maxTokens } = req.body;

    if (!email || !message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Missing required chat parameters.",
      });
    }

    const previousHistory = sanitizeChatHistory(history);
    const priorModelMessages = buildModelMessagesFromHistory(previousHistory);
    const transcriptPrefix = buildTranscriptFromHistory(previousHistory);
    const tempVal = typeof temperature === "number" ? temperature : 0.7;
    const maxTkns = typeof maxTokens === "number" ? maxTokens : 2048;
    const startTime = Date.now();
    const systemCtx =
      "You are Aetheris AI Builder, a precise DeFi strategy assistant for Solana yield strategies, token agents, and portfolio optimization. Answer in clean Markdown without fake metadata headers.";

    let responseText = "";

    if (GITHUB_TOKEN) {
      try {
        responseText = await getGitHubModelsResponse(
          [
            { role: "system", content: systemCtx },
            ...priorModelMessages,
            { role: "user", content: message },
          ],
          tempVal,
          maxTkns,
        );
      } catch (githubErr: any) {
        console.error("GitHub Models chat inference failed. Trying Gemini fallback.", githubErr);
      }
    }

    if (!responseText) {
      try {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `${transcriptPrefix}\nUser: ${message}`.trim(),
          config: {
            systemInstruction: systemCtx,
            temperature: tempVal,
          },
        });

        responseText =
          response.text || "No inference response received from the model.";
      } catch (err: any) {
        console.warn("Chat inference unavailable. Using local fallback response.", err.message);
        responseText = generateFallbackChatResponse(message, previousHistory);
      }
    }

    const elapsedMs = Date.now() - startTime;
    const timeStr = new Date().toTimeString().split(" ")[0];

    const userMsg = {
      id: crypto.randomUUID(),
      sender: "user",
      time: timeStr,
      text: message,
    };

    const nodeMsg = {
      id: crypto.randomUUID(),
      sender: "node",
      nodeId: "NODE_GPT_COGNITIVE_SHARD",
      time: timeStr,
      text: responseText,
      latency: `${elapsedMs}ms`,
      gas: `$0.000${Math.floor(Math.random() * 6) + 1}`,
      hash:
        "0x" +
        Math.random().toString(16).slice(2, 10) +
        "..." +
        Math.random().toString(16).slice(2, 6),
    };

    res.json({
      success: true,
      userMessage: userMsg,
      nodeMessage: nodeMsg,
      chatHistory: [...previousHistory, userMsg, nodeMsg],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// REST API for DeFi Strategy NLP Parsing
app.post("/api/strategy/parse", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Please provide a valid strategy description." });
    }

    let ai: GoogleGenAI;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      console.warn("Gemini client initialization failed. Using high-quality mock fallback strategy.", err.message);
      // Fallback response for offline or unconfigured API keys
      const mockResponse = generateFallbackStrategy(prompt);
      return res.json({
        ...mockResponse,
        warning: "Running in offline mode with simulated intelligence (GEMINI_API_KEY not configured)."
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are an elite DeFi Yield Optimizer and AI Quant. The user wants to build a portfolio strategy based on the following natural language intent: "${prompt}".

Analyze this intent and structure a highly optimized, professional DeFi strategy in JSON format. Provide realistic allocations, risk scores, projected APYs, and active agent squads. Ensure the response matches the required schema perfectly.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategyName: {
              type: Type.STRING,
              description: "A short, professional, futuristic-sounding DeFi strategy name (e.g. 'Delta Neutral Sol-Core', 'Aggressive Yield-Spanner').",
            },
            riskScore: {
              type: Type.STRING,
              description: "Risk category: 'LOW', 'MEDIUM', or 'HIGH'.",
            },
            riskValue: {
              type: Type.INTEGER,
              description: "A risk rating score from 0 to 100 (0 is safest, 100 is extremely volatile).",
            },
            projectedApy: {
              type: Type.NUMBER,
              description: "An optimized projected APY as a percentage (e.g. 14.8, 28.5). Make it mathematically sound based on the user's risk intent.",
            },
            rebalanceInterval: {
              type: Type.STRING,
              description: "When the portfolio rebalances, e.g. 'Daily at 08:00 UTC', 'Every 12 hours', or 'Slippage triggered (> 0.5%)'.",
            },
            estimatedGasFee: {
              type: Type.STRING,
              description: "Estimated network gas fees for deployment, e.g., '0.0024 SOL', '0.005 SOL'.",
            },
            allocations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  symbol: { type: Type.STRING, description: "Token symbol (e.g. 'SOL', 'USDC', 'Jup', 'Bonk', 'ETH', 'USDT')." },
                  percentage: { type: Type.INTEGER, description: "Percentage allocation (integers adding up exactly to 100)." },
                  color: { type: Type.STRING, description: "Accent hex color matching this token (e.g. '#8D6E63', '#1b1b1b', '#000000', '#c6c6c6', '#ffdbd0')." },
                },
                required: ["symbol", "percentage", "color"],
              },
              description: "Array of asset allocations that sum up to exactly 100%.",
            },
            securityReport: {
              type: Type.STRING,
              description: "A short security audit assessment of this allocation, explaining risk mitigation features like formal verification, contract safety, and impermanent loss protection.",
            },
            activeAgents: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of deployed Aetheris sub-agents (e.g., 'Yield Hunter', 'Risk Guardian', 'Arb Master', 'Peg Balancer', 'Alpha Scout', 'Meta Engine') that fit this strategy.",
            },
            summaryPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 concise, punchy bullet points summarizing the advantages of this strategy.",
            },
          },
          required: [
            "strategyName",
            "riskScore",
            "riskValue",
            "projectedApy",
            "rebalanceInterval",
            "estimatedGasFee",
            "allocations",
            "securityReport",
            "activeAgents",
            "summaryPoints",
          ],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: "DeFi optimizer engine failed to process the strategy. Please try again." });
  }
});

// Fallback algorithm to generate highly tailored mock responses when GEMINI_API_KEY is not set
function generateFallbackStrategy(prompt: string) {
  const lowercase = prompt.toLowerCase();
  
  let name = "Custom AI Spanner";
  let risk = "MEDIUM";
  let riskValue = 45;
  let apy = 18.4;
  let rebalance = "Every 12 Hours";
  let gas = "0.0028 SOL";
  let allocations = [
    { symbol: "SOL", percentage: 50, color: "#8D6E63" },
    { symbol: "USDC", percentage: 30, color: "#1b1b1b" },
    { symbol: "JUP", percentage: 20, color: "#ffdbd0" }
  ];
  let report = "Audited via Aetheris Formal Verification. Liquidity concentration protected by automated price-slippage halts.";
  let agents = ["Yield Hunter", "Risk Guardian", "Meta Engine"];
  let summary = [
    "Orchestrates dynamic liquidity pools on Orca and Raydium",
    "Establishes a 30% stablecoin defensive hedge to absorb volatility",
    "Continuous sub-second rebalancing to minimize impermanent loss"
  ];

  if (lowercase.includes("high") || lowercase.includes("aggressive") || lowercase.includes("bonk") || lowercase.includes("meme")) {
    name = "Ethereal Alpha Spurt";
    risk = "HIGH";
    riskValue = 85;
    apy = 39.2;
    rebalance = "Slippage-Triggered (Immediate)";
    gas = "0.0052 SOL";
    allocations = [
      { symbol: "SOL", percentage: 40, color: "#8D6E63" },
      { symbol: "BONK", percentage: 30, color: "#ffdbd0" },
      { symbol: "JUP", percentage: 30, color: "#c6c6c6" }
    ];
    report = "Highly volatile asset mix. Monitored 24/7 by the Alpha Scout agent with custom auto-unstake liquidity triggers.";
    agents = ["Yield Hunter", "Alpha Scout", "Arb Master"];
    summary = [
      "Concentrated liquidity provisioning for maximum trading fee collection",
      "Dynamic slippage protection set to standard 0.5% tolerance limit",
      "Auto-harvests rewards every 60 seconds into SOL compound pools"
    ];
  } else if (lowercase.includes("low") || lowercase.includes("safe") || lowercase.includes("stable") || lowercase.includes("usdc")) {
    name = "Stellar Anchor Safe";
    risk = "LOW";
    riskValue = 12;
    apy = 8.9;
    rebalance = "Weekly at 00:00 UTC";
    gas = "0.0012 SOL";
    allocations = [
      { symbol: "USDC", percentage: 60, color: "#1b1b1b" },
      { symbol: "USDT", percentage: 30, color: "#c6c6c6" },
      { symbol: "SOL", percentage: 10, color: "#8D6E63" }
    ];
    report = "Defensive yield harvesting on triple-audited blue-chip stablecoin vaults with zero exposure to impermanent loss.";
    agents = ["Risk Guardian", "Peg Balancer", "Meta Engine"];
    summary = [
      "Maximum capital preservation with predictable multi-pool yield structures",
      "Peg Balancer dynamically shifts between USDC/USDT to capture micro-spreads",
      "90% of assets remain in certified, multi-signature cold vaults"
    ];
  }

  return {
    strategyName: name,
    riskScore: risk,
    riskValue,
    projectedApy: apy,
    rebalanceInterval: rebalance,
    estimatedGasFee: gas,
    allocations,
    securityReport: report,
    activeAgents: agents,
    summaryPoints: summary
  };
}

// Serve Vite dev server middleware in non-production, static assets in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Configuring Vite Development Middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving compiled static files in Production Mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Aetheris Full-Stack Server running on http://localhost:${PORT}`);
  });
}

const currentModulePath =
  typeof import.meta.url === "string" ? fileURLToPath(import.meta.url) : "";

const isMainModule =
  typeof process !== "undefined" &&
  typeof process.argv[1] === "string" &&
  ((currentModulePath &&
    path.resolve(process.argv[1]) === path.resolve(currentModulePath)) ||
    path.basename(process.argv[1]) === "server.cjs");

if (isMainModule) {
  void startServer();
}

export { app };
export default app;
