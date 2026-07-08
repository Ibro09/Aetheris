import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Info,
  LineChart,
  MoveRight,
  Shield,
  Sparkles,
  Wallet,
} from "lucide-react";

type YieldVaultsProps = {
  walletAddress: string | null;
  walletConnected: boolean;
  initialBalance?: number;
  onBalanceChange?: (nextBalance: number) => void;
  onConnectWallet: () => Promise<void>;
};

type RiskLevel = "Low" | "Medium" | "High";

type Vault = {
  id: "meteora" | "raydium" | "orca";
  protocol: "Meteora" | "Raydium" | "Orca";
  name: string;
  pair: "SOL/USDT";
  apy: number;
  risk: RiskLevel;
  tvl: string;
  tvlValue: number;
  aiScore: number;
  liquidity: number;
  liquidityLabel: string;
  safety: number;
  score: number;
  riskScore: number;
  riskDrivers: string[];
  source: string;
  depositFee: string;
  withdrawalFee: string;
  dailyYieldPerSol: number;
  color: string;
  history: number[];
  analysis: string;
};

type Position = {
  vaultId: Vault["id"];
  amount: number;
  principal?: number;
  accruedYield?: number;
  lastAccruedAt?: number;
  entryApy?: number;
};

type PoolMetric = {
  protocol: "Raydium" | "Meteora" | "Orca";
  pair: "SOL/USDT";
  apy: number;
  tvl: number;
  tvlLabel: string;
  volume24h: number;
  ageDays: number;
  audited: boolean;
  risk: "Low" | "Medium" | "High";
  riskScore: number;
  aiScore: number;
  recommended?: boolean;
  source?: string;
  riskDrivers?: string[];
};

type OnchainProtocolConfig = {
  id: Vault["id"];
  protocol: Vault["protocol"];
  poolAddress: string;
  configured: boolean;
  requirements: string[];
};

type OnchainConfig = {
  mode: "onchain-only" | "simulated-enabled";
  simulatedDepositsEnabled: boolean;
  network: string;
  rpcUrl: string;
  protocols: OnchainProtocolConfig[];
};

const STARTING_BALANCE = 0;
const POOL_REFRESH_MS = 30_000;
const ACCRUAL_REFRESH_MS = 1_000;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const STEPS = [
  "Wallet",
  "Smart Contract",
  "AI Verification",
  "Deposit into selected vault",
  "Dashboard updates",
];

const vaults: Vault[] = [
  {
    id: "meteora",
    protocol: "Meteora",
    name: "Meteora SOL Vault",
    pair: "SOL/USDT",
    apy: 19.2,
    risk: "Low",
    tvl: "$240M",
    tvlValue: 240,
    aiScore: 96,
    liquidity: 92,
    liquidityLabel: "Very strong",
    safety: 94,
    score: 0,
    riskScore: 30,
    riskDrivers: ["deep liquidity", "established pool"],
    source: "static fallback",
    depositFee: "0.08%",
    withdrawalFee: "0.05%",
    dailyYieldPerSol: 0.000526,
    color: "#006a60",
    history: [16.8, 17.2, 18.1, 18.6, 18.9, 19.0, 19.2],
    analysis:
      "Meteora has the strongest risk-adjusted SOL/USDT return today, backed by deep liquidity and stable 30-day APY behavior.",
  },
  {
    id: "raydium",
    protocol: "Raydium",
    name: "Raydium SOL Vault",
    pair: "SOL/USDT",
    apy: 18.4,
    risk: "Medium",
    tvl: "$110M",
    tvlValue: 110,
    aiScore: 91,
    liquidity: 80,
    liquidityLabel: "Strong",
    safety: 86,
    score: 0,
    riskScore: 40,
    riskDrivers: ["moderate TVL", "active liquidity"],
    source: "static fallback",
    depositFee: "0.10%",
    withdrawalFee: "0.06%",
    dailyYieldPerSol: 0.000504,
    color: "#77574d",
    history: [17.4, 17.8, 18.9, 18.1, 18.6, 18.2, 18.4],
    analysis:
      "Raydium is a strong SOL/USDT option when users want higher route activity, but volatility is slightly higher than Meteora.",
  },
  {
    id: "orca",
    protocol: "Orca",
    name: "Orca SOL Vault",
    pair: "SOL/USDT",
    apy: 17.8,
    risk: "Low",
    tvl: "$180M",
    tvlValue: 180,
    aiScore: 89,
    liquidity: 84,
    liquidityLabel: "Strong",
    safety: 90,
    score: 0,
    riskScore: 30,
    riskDrivers: ["deep liquidity", "established pool"],
    source: "static fallback",
    depositFee: "0.07%",
    withdrawalFee: "0.04%",
    dailyYieldPerSol: 0.000488,
    color: "#386a20",
    history: [16.9, 17.1, 17.3, 17.4, 17.6, 17.7, 17.8],
    analysis:
      "Orca provides the quietest SOL/USDT profile, with lower volatility and dependable liquidity, but lower expected yield.",
  },
];

const storageKey = (walletAddress: string | null, key: string) =>
  `aetheris-yield-vaults:${walletAddress ?? "guest"}:${key}`;

const readStored = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;

  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const writeStored = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const shortAddress = (address: string) =>
  `${address.slice(0, 4)}...${address.slice(-4)}`;

const formatSol = (value: number) =>
  `${value.toLocaleString(undefined, {
    maximumFractionDigits: 4,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })} SOL`;

const formatPreciseSol = (value: number) =>
  `${value.toLocaleString(undefined, {
    maximumFractionDigits: 8,
    minimumFractionDigits: value > 0 && value < 0.0001 ? 8 : 4,
  })} SOL`;

const getVault = (vaultId: Vault["id"]) =>
  vaults.find((vault) => vault.id === vaultId) ?? vaults[0];

const buildFallbackPoolMetrics = (): PoolMetric[] => {
  const volumes = [6_000_000, 4_000_000, 3_000_000];
  return vaults.map((vault, index) => ({
    protocol: vault.protocol as PoolMetric["protocol"],
    pair: "SOL/USDT",
    apy: vault.apy,
    tvl: vault.tvlValue * 1_000_000,
    tvlLabel: vault.tvl,
    volume24h: volumes[index] ?? 3_500_000,
    ageDays:
      vault.protocol === "Meteora"
        ? 250
        : vault.protocol === "Raydium"
          ? 365
          : 500,
    audited: true,
    risk: vault.risk === "Low" ? "Low" : "Medium",
    riskScore: vault.aiScore >= 94 ? 30 : vault.aiScore >= 90 ? 40 : 45,
    aiScore: vault.aiScore,
    recommended: vault.id === "meteora",
    source: vault.source,
    riskDrivers: vault.riskDrivers,
  }));
};

export default function YieldVaults({
  walletAddress,
  walletConnected,
  initialBalance = STARTING_BALANCE,
  onBalanceChange,
  onConnectWallet,
}: YieldVaultsProps) {
  const [walletBalance, setWalletBalance] = useState(initialBalance);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [detailVault, setDetailVault] = useState<Vault | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositStep, setDepositStep] = useState(-1);
  const [notice, setNotice] = useState("");
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendation, setRecommendation] = useState("");
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [moveFrom, setMoveFrom] = useState<Vault["id"] | "">("");
  const [moveTo, setMoveTo] = useState<Vault["id"]>("meteora");
  const [moveAmount, setMoveAmount] = useState("");
  const [marketVaults, setMarketVaults] = useState<Vault[]>(vaults);
  const [poolSource, setPoolSource] = useState("Loading live pool metrics...");
  const [onchainConfig, setOnchainConfig] = useState<OnchainConfig | null>(
    null,
  );

  const [recommendedVault, setRecommendedVault] = useState<Vault>(vaults[0]);

  const currentVaultFor = (vaultId: Vault["id"]) =>
    marketVaults.find((marketVault) => marketVault.id === vaultId) ??
    getVault(vaultId);

  const normalizePositions = (storedPositions: Position[] = []): Position[] => {
    const normalized: Position[] = [];

    for (const position of storedPositions) {
      const amount = Number(position.amount || 0);
      if (amount <= 0) continue;

      normalized.push({
        ...position,
        amount,
        principal: Number(position.principal ?? amount),
        accruedYield: Number(position.accruedYield ?? 0),
        lastAccruedAt: Number(position.lastAccruedAt ?? Date.now()),
        entryApy:
          Number(position.entryApy) || currentVaultFor(position.vaultId).apy,
      });
    }

    return normalized;
  };

  const accruePositions = (
    storedPositions: Position[] = [],
    now = Date.now(),
  ): Position[] =>
    normalizePositions(storedPositions).map((position) => {
      const vault = currentVaultFor(position.vaultId);
      const lastAccruedAt = position.lastAccruedAt ?? now;
      const elapsedMs = Math.max(0, now - lastAccruedAt);
      const yearlyRate = Math.max(0, vault.apy) / 100;
      const earned =
        elapsedMs > 0
          ? position.amount * yearlyRate * (elapsedMs / YEAR_MS)
          : 0;

      return {
        ...position,
        amount: Number((position.amount + earned).toFixed(9)),
        accruedYield: Number(
          ((position.accruedYield ?? 0) + earned).toFixed(9),
        ),
        lastAccruedAt: now,
      };
    });

  const savePositions = (nextPositions: Position[]) => {
    setPositions(nextPositions);
    writeStored(storageKey(walletAddress, "positions"), nextPositions);
  };

  const persistBalance = (nextBalance: number) => {
    setWalletBalance(nextBalance);
    writeStored(storageKey(walletAddress, "balance"), nextBalance);
    onBalanceChange?.(nextBalance);
  };

  const getOnchainProtocolConfig = (vaultId: Vault["id"]) =>
    onchainConfig?.protocols.find((protocol) => protocol.id === vaultId);

  const fetchOnchainConfig = async () => {
    try {
      const response = await fetch("/api/yield-vaults/onchain-config");
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load on-chain config.");
      }
      setOnchainConfig({
        mode: data.mode,
        simulatedDepositsEnabled: Boolean(data.simulatedDepositsEnabled),
        network: data.network,
        rpcUrl: data.rpcUrl,
        protocols: Array.isArray(data.protocols) ? data.protocols : [],
      });
    } catch (error: any) {
      setNotice(error?.message || "Unable to load on-chain deposit config.");
    }
  };

  const requireOnchainDepositReady = async (vault: Vault) => {
    if (onchainConfig?.simulatedDepositsEnabled) return;

    const browserWallet = window.solana ?? window.phantom?.solana;
    if (!browserWallet?.connect || !browserWallet?.signTransaction) {
      throw new Error(
        "Real LP deposits require a browser Solana wallet with transaction signing, such as Phantom.",
      );
    }

    const connected = await browserWallet.connect();
    const publicKey =
      connected.publicKey?.toBase58() ?? browserWallet.publicKey?.toBase58();
    if (!publicKey) {
      throw new Error(
        "Wallet connection failed. Connect your Solana wallet first.",
      );
    }

    const protocolConfig = getOnchainProtocolConfig(vault.id);
    if (!protocolConfig?.configured) {
      throw new Error(
        `${vault.protocol} is not configured for real LP deposits yet. Add ${vault.protocol.toUpperCase()}_SOL_USDT_POOL to the server environment.`,
      );
    }

    if (onchainConfig?.network !== "mainnet-beta") {
      throw new Error(
        `Real ${vault.protocol} LP deposits require YIELD_ONCHAIN_NETWORK=mainnet-beta. Current network: ${onchainConfig?.network || "unknown"}.`,
      );
    }

    throw new Error(
      `${vault.protocol} pool ${protocolConfig.poolAddress} is configured, but the wallet-signed SDK transaction builder is not enabled yet. This deposit was blocked so it does not fall back to simulated yield.`,
    );
  };

  const mapPoolMetricToVault = (pool: PoolMetric): Vault => {
    const id = pool.protocol.toLowerCase() as Vault["id"];
    const fallbackVault = vaults.find((vault) => vault.id === id) ?? vaults[0];
    const liquidityValue = Math.min(100, Math.round(pool.volume24h / 100000));
    const apy = Number(pool.apy.toFixed(2));
    const dailyYieldPerSol = Number((apy / 100 / 365).toFixed(8));
    return {
      id,
      protocol: pool.protocol,
      name: `${pool.protocol} SOL Vault`,
      pair: "SOL/USDT",
      apy,
      risk: pool.risk,
      tvl: pool.tvlLabel,
      tvlValue: pool.tvl,
      aiScore: pool.aiScore,
      liquidity: liquidityValue || fallbackVault.liquidity,
      liquidityLabel:
        pool.volume24h > 5000000
          ? "Very strong"
          : pool.volume24h > 2000000
            ? "Strong"
            : "Moderate",
      safety: Math.max(0, 100 - pool.riskScore),
      score: pool.aiScore,
      riskScore: pool.riskScore,
      riskDrivers: pool.riskDrivers ?? [],
      source: pool.source ?? "protocol API",
      depositFee: fallbackVault.depositFee,
      withdrawalFee: fallbackVault.withdrawalFee,
      dailyYieldPerSol,
      color: fallbackVault.color,
      history: fallbackVault.history
        .slice(0, -1)
        .concat(apy)
        .map((value) => Number(value.toFixed(2))),
      analysis: `${pool.protocol} is currently ranked ${pool.recommended ? "first" : "in the top 3"} for SOL/USDT based on live APY, TVL, 24h volume, and a ${pool.riskScore}/100 risk score.`,
    };
  };

  const getPools = async (): Promise<PoolMetric[]> => {
    try {
      const response = await fetch("/api/yield-vaults/pools");
      const data = await response.json();
      if (!response.ok || !data.success || !Array.isArray(data.pools)) {
        throw new Error(data.error || "Unable to load live pool metrics.");
      }
      return data.pools;
    } catch (error: any) {
      console.warn("getPools failed:", error?.message || error);
      setPoolSource("Using fallback metrics until protocol APIs respond.");
      return buildFallbackPoolMetrics();
    }
  };

  const chooseBestStrategy = async () => {
    const pools = await getPools();
    if (!pools.length) {
      return vaults[0];
    }

    const mappedPools = pools.map(mapPoolMetricToVault);
    setMarketVaults(mappedPools);
    setPoolSource(
      mappedPools.some((pool) => pool.source !== "static fallback")
        ? `Live metrics from ${Array.from(new Set(mappedPools.map((pool) => pool.source))).join(", ")}`
        : "Using fallback metrics until protocol APIs respond.",
    );
    const best = mappedPools.reduce(
      (winner, pool) => (pool.aiScore > winner.aiScore ? pool : winner),
      mappedPools[0],
    );
    return best;
  };

  const totalDeposited = positions.reduce(
    (sum, position) => sum + position.amount,
    0,
  );
  const totalAccruedYield = positions.reduce(
    (sum, position) => sum + (position.accruedYield ?? 0),
    0,
  );
  const expectedDailyYield = useMemo(
    () =>
      positions.reduce((sum, position) => {
        const vault =
          marketVaults.find(
            (marketVault) => marketVault.id === position.vaultId,
          ) ?? getVault(position.vaultId);
        return sum + position.amount * vault.dailyYieldPerSol;
      }, 0),
    [marketVaults, positions],
  );
  const selectedAmount = Number(depositAmount) || 0;
  const liveSelectedVault = selectedVault
    ? (marketVaults.find((vault) => vault.id === selectedVault.id) ??
      selectedVault)
    : null;
  const selectedDailyYield = liveSelectedVault
    ? selectedAmount * liveSelectedVault.dailyYieldPerSol
    : 0;

  const positionsWithVaults = useMemo(
    () =>
      positions.map((position) => ({
        ...position,
        vault: currentVaultFor(position.vaultId),
      })),
    [marketVaults, positions],
  );

  const mapServerPositions = (serverPositions: Record<string, number> = {}) =>
    Object.entries(serverPositions)
      .map(([vaultId, amount]) => ({
        vaultId: vaultId as Vault["id"],
        amount: Number(amount || 0),
      }))
      .filter((position) => position.amount > 0);

  const fetchVaultStatus = async (address: string) => {
    setStatusLoading(true);
    setStatusError("");

    try {
      const storedBalance = readStored(
        storageKey(address, "balance"),
        STARTING_BALANCE,
      );
      const storedPositions = accruePositions(
        readStored<Position[]>(storageKey(address, "positions"), []),
      );

      persistBalance(storedBalance);
      savePositions(storedPositions);
      setNotice("");

      if (showRecommendation) {
        await fetchRecommendation(address, storedBalance, {
          meteora:
            storedPositions.find((position) => position.vaultId === "meteora")
              ?.amount ?? 0,
          raydium:
            storedPositions.find((position) => position.vaultId === "raydium")
              ?.amount ?? 0,
          orca:
            storedPositions.find((position) => position.vaultId === "orca")
              ?.amount ?? 0,
        });
      }
    } catch (error: any) {
      setStatusError(error?.message || "Unable to load vault status.");
      setNotice(error?.message || "Unable to load vault status.");
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchRecommendation = async (
    address: string,
    balanceSol: number,
    positionsData: Record<string, number> = {},
  ) => {
    setRecommendationLoading(true);
    setRecommendation("");
    try {
      const bestVault = marketVaults.reduce(
        (winner, pool) => (pool.aiScore > winner.aiScore ? pool : winner),
        marketVaults[0] ?? vaults[0],
      );
      const message = [
        `${bestVault.protocol} is the strongest local fit for this wallet right now.`,
        `It combines ${bestVault.apy}% APY with a ${bestVault.risk.toLowerCase()} risk posture and ${bestVault.aiScore}/100 AI confidence.`,
        `Your current balance of ${formatSol(balanceSol)} and positions in ${Object.keys(positionsData).length ? Object.keys(positionsData).join(", ") : "no vaults"} support a simple stay-the-course allocation.`,
      ].join(" ");
      setRecommendation(message);
    } catch (error: any) {
      setRecommendation(
        error?.message || "Unable to load AI recommendation at this time.",
      );
    } finally {
      setRecommendationLoading(false);
    }
  };

  useEffect(() => {
    setWalletBalance(initialBalance);
  }, [initialBalance]);

  useEffect(() => {
    if (!walletAddress) {
      setWalletBalance(
        readStored(storageKey(walletAddress, "balance"), STARTING_BALANCE),
      );
      savePositions(
        accruePositions(readStored(storageKey(walletAddress, "positions"), [])),
      );
      setNotice("");
      setRecommendation("");
      return;
    }

    void fetchVaultStatus(walletAddress);
  }, [walletAddress]);

  useEffect(() => {
    void fetchOnchainConfig();
  }, []);

  useEffect(() => {
    let active = true;

    const refreshPools = async () => {
      const bestVault = await chooseBestStrategy();
      if (active) {
        setRecommendedVault(bestVault);
      }
    };

    void refreshPools();
    const interval = window.setInterval(refreshPools, POOL_REFRESH_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setRecommendedVault(
      (currentVault) =>
        marketVaults.find((vault) => vault.id === currentVault.id) ??
        currentVault,
    );
    setSelectedVault((currentVault) =>
      currentVault
        ? (marketVaults.find((vault) => vault.id === currentVault.id) ??
          currentVault)
        : null,
    );
    setDetailVault((currentVault) =>
      currentVault
        ? (marketVaults.find((vault) => vault.id === currentVault.id) ??
          currentVault)
        : null,
    );
    setPositions((currentPositions) => {
      const nextPositions = accruePositions(currentPositions);
      writeStored(storageKey(walletAddress, "positions"), nextPositions);
      return nextPositions;
    });
  }, [marketVaults]);

  useEffect(() => {
    if (!positions.length) return;

    const interval = window.setInterval(() => {
      setPositions((currentPositions) => {
        const nextPositions = accruePositions(currentPositions);
        writeStored(storageKey(walletAddress, "positions"), nextPositions);
        return nextPositions;
      });
    }, ACCRUAL_REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [marketVaults, positions.length, walletAddress]);

  useEffect(() => {
    // Prevent background scroll when a modal/bottom-sheet is open
    if (typeof document === "undefined") return;

    const prev = document.body.style.overflow;
    if (selectedVault || detailVault) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev;
    }

    return () => {
      document.body.style.overflow = prev;
    };
  }, [selectedVault, detailVault]);

  const openDeposit = async (vault: Vault) => {
    if (!walletConnected) {
      await onConnectWallet();
      return;
    }

    setSelectedVault(vault);
    setDepositAmount("");
    setDepositStep(-1);
    setNotice("");
  };

  const confirmDeposit = async () => {
    const depositVault = liveSelectedVault ?? selectedVault;

    if (!depositVault || selectedAmount <= 0) {
      setNotice("Enter a valid SOL amount.");
      return;
    }

    try {
      await requireOnchainDepositReady(depositVault);
    } catch (error: any) {
      setNotice(error?.message || "On-chain deposit is not ready.");
      return;
    }

    if (selectedAmount > walletBalance) {
      setNotice("Amount is higher than your wallet balance.");
      return;
    }

    setIsDepositing(true);
    setNotice("");
    setDepositStep(0);

    STEPS.forEach((_, index) => {
      window.setTimeout(() => {
        setDepositStep(index);
      }, 300 * index);
    });

    try {
      const key = storageKey(walletAddress, "positions");
      const now = Date.now();
      const storedPositions = accruePositions(
        readStored<Position[]>(key, []),
        now,
      );
      const existing = storedPositions.find(
        (position) => position.vaultId === depositVault.id,
      );
      const nextPositions = existing
        ? storedPositions.map((position) =>
            position.vaultId === depositVault.id
              ? {
                  ...position,
                  amount: Number((position.amount + selectedAmount).toFixed(9)),
                  principal: Number(
                    (
                      (position.principal ?? position.amount) + selectedAmount
                    ).toFixed(9),
                  ),
                  entryApy: depositVault.apy,
                  lastAccruedAt: now,
                }
              : position,
          )
        : [
            ...storedPositions,
            {
              vaultId: depositVault.id,
              amount: selectedAmount,
              principal: selectedAmount,
              accruedYield: 0,
              lastAccruedAt: now,
              entryApy: depositVault.apy,
            },
          ];
      const nextBalance = Number((walletBalance - selectedAmount).toFixed(9));

      persistBalance(nextBalance);
      savePositions(nextPositions);
      setNotice(
        `${formatSol(selectedAmount)} deposited into ${depositVault.name}. Yield is now accruing from live APY.`,
      );
      setSelectedVault(null);
      setShowRecommendation(false);
    } catch (error: any) {
      setNotice(error?.message || "Deposit failed.");
    } finally {
      setIsDepositing(false);
      setDepositStep(-1);
    }
  };

  const moveFunds = async () => {
    const amount = Number(moveAmount) || 0;
    if (!walletAddress) {
      setNotice("Connect your wallet before moving funds.");
      return;
    }

    if (!moveFrom || moveFrom === moveTo || amount <= 0) {
      setNotice("Choose two different vaults and enter a valid SOL amount.");
      return;
    }

    const currentPositions = accruePositions(positions);
    const fromPosition = currentPositions.find(
      (position) => position.vaultId === moveFrom,
    );
    if (!fromPosition || amount > fromPosition.amount) {
      setNotice("Move amount is higher than the selected vault balance.");
      return;
    }

    setNotice("Submitting move transaction...");

    try {
      const now = Date.now();
      const nextPositions = currentPositions
        .map((position) => {
          if (position.vaultId === moveFrom) {
            const remainingAmount = position.amount - amount;
            const movedShare = amount / position.amount;
            return {
              ...position,
              amount: Number(remainingAmount.toFixed(9)),
              principal: Number(
                (
                  (position.principal ?? position.amount) *
                  (1 - movedShare)
                ).toFixed(9),
              ),
              accruedYield: Number(
                ((position.accruedYield ?? 0) * (1 - movedShare)).toFixed(9),
              ),
              lastAccruedAt: now,
            };
          }
          if (position.vaultId === moveTo) {
            return {
              ...position,
              amount: Number((position.amount + amount).toFixed(9)),
              principal: Number(
                ((position.principal ?? position.amount) + amount).toFixed(9),
              ),
              lastAccruedAt: now,
              entryApy: currentVaultFor(moveTo).apy,
            };
          }
          return position;
        })
        .filter((position) => position.amount > 0);

      const targetExists = nextPositions.some(
        (position) => position.vaultId === moveTo,
      );
      const finalPositions = targetExists
        ? nextPositions
        : [
            ...nextPositions,
            {
              vaultId: moveTo,
              amount,
              principal: amount,
              accruedYield: 0,
              lastAccruedAt: now,
              entryApy: currentVaultFor(moveTo).apy,
            },
          ];

      savePositions(finalPositions);
      setNotice(
        `${formatSol(amount)} moved from ${getVault(moveFrom).protocol} to ${getVault(moveTo).protocol}.`,
      );
      setMoveAmount("");
      setShowRecommendation(false);
    } catch (error: any) {
      setNotice(error?.message || "Move failed.");
    }
  };

  const withdrawAllToBalance = () => {
    const accruedPositions = accruePositions(positions);
    const withdrawAmount = accruedPositions.reduce(
      (sum, position) => sum + position.amount,
      0,
    );

    if (!withdrawAmount) {
      setNotice("No vault funds are available to withdraw right now.");
      return;
    }

    const nextBalance = Number((walletBalance + withdrawAmount).toFixed(9));

    persistBalance(nextBalance);
    savePositions([]);
    setNotice(
      `${formatPreciseSol(withdrawAmount)} withdrawn from vaults to wallet balance.`,
    );
  };

  const harvestYield = () => {
    const accruedPositions = accruePositions(positions);
    const harvestAmount = accruedPositions.reduce(
      (sum, position) => sum + (position.accruedYield ?? 0),
      0,
    );

    if (!harvestAmount) {
      setNotice("No accrued yield is ready to harvest yet.");
      return;
    }

    const nextBalance = Number((walletBalance + harvestAmount).toFixed(9));
    const nextPositions = accruedPositions.map((position) => ({
      ...position,
      principal: position.amount,
      accruedYield: 0,
      lastAccruedAt: Date.now(),
    }));

    persistBalance(nextBalance);
    savePositions(nextPositions);
    setNotice(
      `${formatPreciseSol(harvestAmount)} harvested to wallet balance.`,
    );
  };

  return (
    <section className="min-h-screen px-6 pt-28 pb-16 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-xs font-mono font-bold uppercase tracking-[0.3em] text-secondary">
              Yield Vaults
            </p>
            <h1 className="font-display text-4xl font-black tracking-tight text-primary">
              SOL/USDT Vault Marketplace
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-on-surface-variant">
              Discover SOL/USDT vaults, deposit SOL, and move funds between
              Meteora, Raydium, and Orca from one portfolio screen.
            </p>
          </div>

          <div className="rounded-lg border border-outline-variant/40 bg-surface/90 p-4">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-on-surface-variant">
              <Wallet className="h-4 w-4" />
              Wallet
            </div>
            <div className="mt-2 text-sm font-bold text-primary">
              {walletAddress ? shortAddress(walletAddress) : "Not logged in"}
            </div>
            <div className="mt-1 text-xs text-on-surface-variant">
              Balance: {formatPreciseSol(walletBalance)}
            </div>
          </div>
        </div>

        <section className="mb-8 overflow-hidden rounded-lg border border-outline-variant/40 bg-primary text-white">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em]">
                <Sparkles className="h-4 w-4" />
                AI Recommendation
              </div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/70">
                Best Vault Today
              </p>
              <h2 className="mt-3 font-display text-4xl font-black tracking-tight">
                {recommendedVault.name}
              </h2>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
                <span className="rounded-full bg-white px-4 py-2 text-primary">
                  {recommendedVault.apy}% APY
                </span>
                <span className="rounded-full bg-white/10 px-4 py-2">
                  {recommendedVault.risk} Risk
                </span>
                <span className="rounded-full bg-white/10 px-4 py-2">
                  AI Score {recommendedVault.aiScore}/100
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-end gap-3">
              <button
                type="button"
                onClick={() => openDeposit(recommendedVault)}
                className="w-full sm:inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-4 text-sm font-bold uppercase tracking-[0.24em] text-primary transition hover:bg-secondary-fixed"
              >
                Deposit Now
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextValue = !showRecommendation;
                  setShowRecommendation(nextValue);
                  if (nextValue && walletAddress) {
                    void fetchRecommendation(walletAddress, walletBalance, {
                      meteora:
                        positions.find(
                          (position) => position.vaultId === "meteora",
                        )?.amount ?? 0,
                      raydium:
                        positions.find(
                          (position) => position.vaultId === "raydium",
                        )?.amount ?? 0,
                      orca:
                        positions.find(
                          (position) => position.vaultId === "orca",
                        )?.amount ?? 0,
                    });
                  }
                }}
                className="w-full sm:inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 px-6 py-4 text-sm font-bold uppercase tracking-[0.24em] text-white transition hover:bg-white/10"
              >
                Why Recommended?
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showRecommendation ? (
            <div className="border-t border-white/10 px-6 py-5 text-sm leading-6 text-white/85 lg:px-8">
              <p className="font-bold text-white">
                Why {recommendedVault.protocol}?
              </p>
              {recommendationLoading ? (
                <p className="mt-2">Loading recommendation...</p>
              ) : (
                <p className="mt-2 whitespace-pre-line text-white/90">
                  {recommendation ||
                    "Fetching a tailored AI recommendation for the selected vaults..."}
                </p>
              )}
            </div>
          ) : null}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-mono font-bold uppercase tracking-[0.3em] text-secondary">
                    Marketplace
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-primary">
                    SOL/USDT Vault Cards
                  </h2>
                  <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                    {poolSource}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                    Deposit mode:{" "}
                    {onchainConfig?.simulatedDepositsEnabled
                      ? "simulated yield enabled"
                      : "real on-chain LP only"}
                    {onchainConfig?.network
                      ? ` on ${onchainConfig.network}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                {marketVaults.map((vault) => (
                  <article
                    key={vault.id}
                    className="rounded-lg border border-outline-variant/40 bg-surface/90 p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-primary">
                          {vault.name}
                        </h3>
                        <p className="mt-1 text-xs font-mono uppercase tracking-[0.24em] text-on-surface-variant">
                          {vault.pair}
                        </p>
                      </div>
                      {vault.id === recommendedVault.id ? (
                        <span className="rounded-full bg-secondary-fixed px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-secondary-fixed-variant">
                          AI Recommended
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">APY</span>
                        <span className="font-bold text-primary">
                          {vault.apy}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Risk</span>
                        <span className="font-bold text-primary">
                          {vault.risk} ({vault.riskScore}/100)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">TVL</span>
                        <span className="font-bold text-primary">
                          {vault.tvl}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">
                          AI Score
                        </span>
                        <span className="font-bold text-primary">
                          {vault.aiScore}/100
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-on-surface-variant">Source</span>
                        <span className="text-right font-bold text-primary">
                          {vault.source}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-on-surface-variant">LP Pool</span>
                        <span className="text-right font-bold text-primary">
                          {getOnchainProtocolConfig(vault.id)?.configured
                            ? "Configured"
                            : "Missing"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-2">
                      <button
                        type="button"
                        onClick={() => openDeposit(vault)}
                        className="w-full rounded-lg bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white transition hover:bg-secondary"
                      >
                        Deposit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailVault(vault)}
                        className="w-full rounded-lg border border-outline-variant/60 px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-primary transition hover:bg-surface-container-low"
                      >
                        View Details
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-outline-variant/40 bg-surface/90 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-secondary" />
                <h2 className="text-2xl font-black text-primary">
                  Compare Vaults
                </h2>
              </div>
              <div>
                {/* Mobile: stacked vault compare cards */}
                <div className="md:hidden space-y-3">
                  {marketVaults.map((vault) => (
                    <div
                      key={`${vault.id}-mobile-compare`}
                      className="rounded-lg border border-outline-variant/30 bg-background p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-primary">
                            {vault.protocol}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {vault.pair}
                          </p>
                        </div>
                        <div className="text-sm font-semibold text-primary">
                          {vault.apy}%
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                        <span>Risk: {vault.risk}</span>
                        <span>Risk score: {vault.riskScore}</span>
                        <span>TVL: {vault.tvl}</span>
                        <span>AI: {vault.aiScore}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop/tablet: original table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-outline-variant/50 text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                      <tr>
                        <th className="py-3 pr-4">Vault</th>
                        <th className="py-3 pr-4">APY</th>
                        <th className="py-3 pr-4">Risk</th>
                        <th className="py-3 pr-4">Risk Score</th>
                        <th className="py-3 pr-4">TVL</th>
                        <th className="py-3 pr-4">AI Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketVaults.map((vault) => (
                        <tr
                          key={`${vault.id}-compare`}
                          className="border-b border-outline-variant/30 last:border-0"
                        >
                          <td className="py-4 pr-4 font-bold text-primary">
                            {vault.protocol}
                          </td>
                          <td className="py-4 pr-4">{vault.apy}%</td>
                          <td className="py-4 pr-4">{vault.risk}</td>
                          <td className="py-4 pr-4">{vault.riskScore}/100</td>
                          <td className="py-4 pr-4">{vault.tvl}</td>
                          <td className="py-4 pr-4">{vault.aiScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-lg border border-outline-variant/40 bg-surface/90 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-secondary" />
                <h2 className="text-xl font-black text-primary">
                  Vault Dashboard
                </h2>
              </div>
              <div className="grid gap-3">
                <div className="rounded-lg bg-background p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-on-surface-variant">
                    Wallet Balance
                  </p>
                  <p className="mt-2 text-2xl font-black text-primary">
                    {formatPreciseSol(walletBalance)}
                  </p>
                </div>
                <div className="rounded-lg bg-background p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-on-surface-variant">
                    Vault Value
                  </p>
                  <p className="mt-2 text-2xl font-black text-primary">
                    {formatPreciseSol(totalDeposited)}
                  </p>
                </div>
                <div className="rounded-lg bg-background p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-on-surface-variant">
                    Yield Earned
                  </p>
                  <p className="mt-2 text-2xl font-black text-primary">
                    {formatPreciseSol(totalAccruedYield)}
                  </p>
                </div>
                <div className="rounded-lg bg-background p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-on-surface-variant">
                    Expected Daily Yield
                  </p>
                  <p className="mt-2 text-2xl font-black text-primary">
                    {formatPreciseSol(expectedDailyYield)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <p className="text-[11px] leading-5 text-on-surface-variant">
                  Move every vault deposit and accrued yield back into your
                  wallet balance in one tap.
                </p>
                <button
                  type="button"
                  onClick={harvestYield}
                  disabled={totalAccruedYield <= 0}
                  className="w-full rounded-lg border border-outline-variant/60 px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-primary transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Harvest Yield to Wallet
                </button>
                <button
                  type="button"
                  onClick={withdrawAllToBalance}
                  disabled={totalDeposited <= 0}
                  className="w-full rounded-lg bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Move All to Balance
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {positionsWithVaults.length ? (
                  positionsWithVaults.map((position) => (
                    <div
                      key={`${position.vaultId}-position`}
                      className="rounded-lg border border-outline-variant/30 bg-background p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-primary">
                            {position.vault.protocol}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {position.vault.pair}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-primary">
                            {formatPreciseSol(position.amount)}
                          </p>
                          <p className="text-[11px] text-on-surface-variant">
                            +{formatPreciseSol(position.accruedYield ?? 0)}{" "}
                            yield
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-on-surface-variant">
                        <span>
                          Principal:{" "}
                          {formatPreciseSol(
                            position.principal ?? position.amount,
                          )}
                        </span>
                        <span>Live APY: {position.vault.apy}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-outline-variant/30 bg-background p-4 text-sm leading-6 text-on-surface-variant">
                    No active vault deposits yet.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-outline-variant/40 bg-surface/90 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <MoveRight className="h-5 w-5 text-secondary" />
                <h2 className="text-xl font-black text-primary">Move Funds</h2>
              </div>
              <div className="space-y-3">
                <select
                  value={moveFrom}
                  onChange={(event) =>
                    setMoveFrom(event.target.value as Vault["id"] | "")
                  }
                  className="min-h-[44px] w-full rounded-lg border border-outline-variant/40 bg-background px-4 text-sm outline-none focus:border-secondary"
                >
                  <option value="">From vault</option>
                  {positionsWithVaults.map((position) => (
                    <option key={position.vaultId} value={position.vaultId}>
                      {position.vault.protocol} - {formatSol(position.amount)}
                    </option>
                  ))}
                </select>
                <select
                  value={moveTo}
                  onChange={(event) =>
                    setMoveTo(event.target.value as Vault["id"])
                  }
                  className="min-h-[44px] w-full rounded-lg border border-outline-variant/40 bg-background px-4 text-sm outline-none focus:border-secondary"
                >
                  {marketVaults.map((vault) => (
                    <option key={vault.id} value={vault.id}>
                      To {vault.protocol}
                    </option>
                  ))}
                </select>
                <input
                  value={moveAmount}
                  onChange={(event) => setMoveAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="Amount in SOL"
                  className="min-h-[44px] w-full rounded-lg border border-outline-variant/40 bg-background px-4 text-sm outline-none focus:border-secondary"
                />
                <button
                  type="button"
                  onClick={moveFunds}
                  className="w-full rounded-lg bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!positionsWithVaults.length}
                >
                  Move Between Vaults
                </button>
              </div>
            </section>

            {notice ? (
              <p className="rounded-lg border border-secondary/20 bg-secondary/5 p-4 text-sm leading-6 text-on-surface-variant">
                {notice}
              </p>
            ) : null}
          </aside>
        </div>
      </div>

      {selectedVault ? (
        <div className="fixed inset-0 z-[80] bg-black/50 px-4">
          <div className="absolute inset-0 flex items-end sm:items-center justify-center">
            <div className="w-full sm:max-w-lg max-h-[90vh] sm:h-auto rounded-t-xl sm:rounded-lg border border-outline-variant/40 bg-surface p-4 sm:p-6 shadow-2xl overflow-auto">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-mono font-bold uppercase tracking-[0.28em] text-secondary">
                    Deposit SOL
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-primary">
                    {selectedVault.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => (isDepositing ? null : setSelectedVault(null))}
                  className="rounded-full border border-outline-variant/50 px-3 py-1 text-sm font-bold text-primary"
                >
                  X
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-background p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">
                    Wallet Balance
                  </p>
                  <p className="mt-2 text-xl font-black text-primary">
                    {formatPreciseSol(walletBalance)}
                  </p>
                </div>
                <div className="rounded-lg bg-background p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">
                    Estimated APY
                  </p>
                  <p className="mt-2 text-xl font-black text-primary">
                    {selectedVault.apy}%
                  </p>
                </div>
                <div className="rounded-lg bg-background p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">
                    AI Score
                  </p>
                  <p className="mt-2 text-xl font-black text-primary">
                    {selectedVault.aiScore}
                  </p>
                </div>
                <div className="rounded-lg bg-background p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">
                    Expected Daily Yield
                  </p>
                  <p className="mt-2 text-xl font-black text-primary">
                    {formatPreciseSol(selectedDailyYield)}
                  </p>
                </div>
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                  Amount
                </span>
                <input
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  disabled={isDepositing}
                  className="min-h-[48px] w-full rounded-lg border border-outline-variant/40 bg-background px-4 text-sm outline-none focus:border-secondary disabled:opacity-60"
                />
              </label>

              {isDepositing ? (
                <div className="mt-5 space-y-3">
                  {STEPS.map((step, index) => (
                    <div
                      key={step}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${
                        index <= depositStep
                          ? "border-secondary/30 bg-secondary/5 text-primary"
                          : "border-outline-variant/30 bg-background text-on-surface-variant"
                      }`}
                    >
                      {index < depositStep ? (
                        <Check className="h-4 w-4 text-secondary" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {step}
                    </div>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                onClick={confirmDeposit}
                disabled={isDepositing}
                className="mt-6 w-full rounded-lg bg-primary px-5 py-4 text-xs font-bold uppercase tracking-[0.24em] text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDepositing ? "Depositing" : "Deposit"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailVault ? (
        <div className="fixed inset-0 z-[80] bg-black/50 px-4 py-6">
          <div className="absolute inset-0 flex items-start sm:items-center justify-center overflow-auto">
            <div className="w-full sm:max-w-3xl mt-8 sm:mt-0 max-h-[90vh] sm:rounded-lg rounded-t-xl border border-outline-variant/40 bg-surface p-4 sm:p-6 shadow-2xl overflow-auto">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-mono font-bold uppercase tracking-[0.28em] text-secondary">
                    Vault Details
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-primary">
                    {detailVault.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailVault(null)}
                  className="rounded-full border border-outline-variant/50 px-3 py-1 text-sm font-bold text-primary"
                >
                  X
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Current APY", `${detailVault.apy}%`],
                  ["TVL", detailVault.tvl],
                  ["Risk Level", detailVault.risk],
                  ["Risk Score", `${detailVault.riskScore}/100`],
                  ["Liquidity", detailVault.liquidity],
                  ["Deposit Fee", detailVault.depositFee],
                  ["Withdrawal Fee", detailVault.withdrawalFee],
                  ["Data Source", detailVault.source],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-background p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">
                      {label}
                    </p>
                    <p className="mt-2 text-lg font-black text-primary">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-lg border border-outline-variant/40 bg-background p-5">
                <div className="mb-4 flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-secondary" />
                  <h3 className="text-xl font-black text-primary">
                    Historical APY Chart
                  </h3>
                </div>
                <div className="flex h-40 items-end gap-3">
                  {detailVault.history.map((value, index) => (
                    <div
                      key={`${detailVault.id}-${index}`}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <div
                        className="w-full rounded-t-md bg-secondary"
                        style={{ height: `${Math.max(18, value * 5)}%` }}
                      />
                      <span className="text-[10px] text-on-surface-variant">
                        {value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-outline-variant/40 bg-background p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-secondary" />
                  <h3 className="text-xl font-black text-primary">
                    AI Analysis
                  </h3>
                </div>
                <p className="text-sm leading-6 text-on-surface-variant">
                  {detailVault.analysis}
                </p>
                <p className="mt-3 text-xs leading-5 text-on-surface-variant">
                  Risk drivers: {detailVault.riskDrivers.join(", ")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDetailVault(null);
                  openDeposit(detailVault);
                }}
                className="mt-6 w-full rounded-lg bg-primary px-5 py-4 text-xs font-bold uppercase tracking-[0.24em] text-white transition hover:bg-secondary"
              >
                Deposit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
