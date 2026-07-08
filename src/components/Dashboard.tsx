import { useState, useEffect, useRef, FormEvent } from "react";
import {
  Cpu,
  TrendingUp,
  Sparkles,
  Check,
  RefreshCw,
  Wallet,
  Info,
  Send,
  ArrowRight,
} from "lucide-react";
import { Strategy } from "../types";
import { DEFAULT_ACTIVE_STRATEGY, INITIAL_WALLET } from "../data";

interface DashboardUser {
  id: string;
  name: string;
  email: string;
  address: string;
  balances: Record<string, number>;
  referralEarningsUSD: number;
  referrer?: string;
  referralCount: number;
  referredWallets: string[];
}

interface DashboardProps {
  user: DashboardUser | null;
  activeStrategy: Strategy;
  onActivateStrategy: (strategy: Strategy) => void;
  onReturnToLander: () => void;
  onWalletUpdated: (wallet: DashboardUser) => void;
}

// Simulated Token prices
const PRICES: { [symbol: string]: number } = {
  SOL: 142.5,
  USDC: 1.0,
  BONK: 0.0000225,
  JUP: 1.15,
  USDT: 1.0,
};

const SOL_PRICE = PRICES.SOL;

export default function Dashboard({
  user,
  activeStrategy,
  onActivateStrategy,
  onReturnToLander,
  onWalletUpdated,
}: DashboardProps) {
  const [wallet, setWallet] = useState({
    address: user?.address ?? INITIAL_WALLET.address,
    balances: user?.balances ?? INITIAL_WALLET.balances,
  });
  const [fundSymbol, setFundSymbol] = useState("SOL");
  const [fundAmount, setFundAmount] = useState("500");
  const [depositLoading, setDepositLoading] = useState(false);
  const [harvestLoading, setHarvestLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState("Copy Address");
  const [actionMessage, setActionMessage] = useState("");
  const [accumulatedYield, setAccumulatedYield] = useState(12.45);
  const [nlpPrompt, setNlpPrompt] = useState(
    "Allocate 60% SOL to Raydium, hedge with 30% stables, and buy some JUP with the rest.",
  );
  const [performanceHistory, setPerformanceHistory] = useState<number[]>(() =>
    Array.from({ length: 14 }, () => 0),
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingMessage, setAiLoadingMessage] = useState("");
  const [parsedAiStrategy, setParsedAiStrategy] = useState<Strategy | null>(
    null,
  );

  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[11:45:00] Aetheris Core: Initialization protocol complete.",
    "[11:45:02] Meta Engine: Aligning sub-agents to strategy: " +
      activeStrategy.strategyName,
    "[11:45:10] Risk Guardian: Scanning smart contract parameters... 100% secure.",
    "[11:45:15] Yield Hunter: Commencing multi-DEX liquidity scans...",
  ]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const formatSol = (value: number) =>
    `${value.toLocaleString(undefined, {
      maximumFractionDigits: 4,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    })} SOL`;

  const portfolioSolValue = Object.entries(wallet.balances).reduce(
    (sum, [symbol, amount]) =>
      sum + (amount * (PRICES[symbol] || 0)) / SOL_PRICE,
    0,
  );

  const stableSolBalance =
    ((wallet.balances.USDC || 0) + (wallet.balances.USDT || 0)) / SOL_PRICE;
  const investedBalance = Math.max(0, portfolioSolValue - stableSolBalance);
  const totalDeposited = Math.max(0, portfolioSolValue - accumulatedYield);
  const availableBalance = stableSolBalance;
  const activeInvestments = activeStrategy.allocations.map((alloc) => ({
    ...alloc,
    value: formatSol(
      ((wallet.balances[alloc.symbol] || 0) * PRICES[alloc.symbol]) / SOL_PRICE,
    ),
  }));

  useEffect(() => {
    if (user) {
      setWallet({
        address: user.address,
        balances: user.balances,
      });
    }
  }, [user]);

  useEffect(() => {
    // Try to fetch latest wallet status from devnet API
    const fetchStatus = async () => {
      if (!user?.email) return;
      try {
        const res = await fetch(
          `/api/wallet/status?email=${encodeURIComponent(user.email)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.wallet) {
          setWallet({
            address: data.wallet.address,
            balances: data.wallet.balances,
          });
          onWalletUpdated?.(data.wallet as any);
        }
      } catch (err) {
        // ignore errors in dev environment
      }
    };

    fetchStatus();
  }, [user, onWalletUpdated]);

  useEffect(() => {
    const yieldInterval = setInterval(() => {
      setAccumulatedYield((prev) => prev + 0.0087);
    }, 2400);
    return () => clearInterval(yieldInterval);
  }, []);

  useEffect(() => {
    const logInterval = setInterval(() => {
      const actions = [
        "Rebalancing target weights across Raydium and Jupiter.",
        "Verifying stake liquidity with on-chain oracle feeds.",
        "Scanning pending vault exits for profit capture.",
        "Deploying micro-compounds to the live SOL-USDC pool.",
        "Running anti-slip safety checks before execution.",
      ];
      const next = actions[Math.floor(Math.random() * actions.length)];
      setTerminalLogs((prev) =>
        [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Yield Agent: ${next}`,
        ].slice(-10),
      );
    }, 5200);
    return () => clearInterval(logInterval);
  }, [activeStrategy]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  useEffect(() => {
    setPerformanceHistory((prev) => {
      const next = [...prev.slice(-13), Number(portfolioSolValue.toFixed(2))];
      return next.length ? next : prev;
    });
  }, [portfolioSolValue]);

  const handleDeposit = async () => {
    if (!user) return;

    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      setActionMessage("Enter a valid deposit amount.");
      return;
    }

    setDepositLoading(true);
    setActionMessage("");
    try {
      const response = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          symbol: fundSymbol,
          amount,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Deposit failed.");
      }

      setWallet({
        address: data.wallet.address,
        balances: data.wallet.balances,
      });
      onWalletUpdated(data.wallet);
      setActionMessage(`Deposited ${amount} ${fundSymbol} successfully.`);
    } catch (err: any) {
      setActionMessage(err?.message || "Deposit request failed.");
    } finally {
      setDepositLoading(false);
    }
  };

  const handleHarvest = async () => {
    if (!user) return;

    setHarvestLoading(true);
    setActionMessage("");
    try {
      const response = await fetch("/api/wallet/harvest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Harvest failed.");
      }

      setWallet({
        address: data.wallet.address,
        balances: data.wallet.balances,
      });
      onWalletUpdated(data.wallet);
      setActionMessage(`Harvested ${data.harvestedUSD ?? 0} USDC yield.`);
    } catch (err: any) {
      setActionMessage(err?.message || "Harvest request failed.");
    } finally {
      setHarvestLoading(false);
    }
  };

  const handleCopyAddress = () => {
    if (!wallet.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopyStatus("Copied");
    setActionMessage("Wallet address copied.");

    window.setTimeout(() => {
      setCopyStatus("Copy Address");
    }, 2000);
  };

  const handleNlpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nlpPrompt.trim()) return;

    setAiLoading(true);
    setParsedAiStrategy(null);

    const messages = [
      "Connecting to Gemini NLP neural matrix...",
      "Analyzing user investment preferences...",
      "Simulating historical yield indices...",
      "Optimizing allocation constraints...",
      "Finalizing risk security report...",
    ];

    let msgIdx = 0;
    setAiLoadingMessage(messages[0]);
    const msgInterval = setInterval(() => {
      msgIdx++;
      if (msgIdx < messages.length) {
        setAiLoadingMessage(messages[msgIdx]);
      }
    }, 1200);

    try {
      const response = await fetch("/api/strategy/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: nlpPrompt }),
      });

      if (!response.ok) {
        throw new Error("Server strategy parse failed.");
      }

      const data: Strategy = await response.json();
      setParsedAiStrategy(data);
    } catch (err) {
      console.error(err);
      setTerminalLogs((prev) =>
        [
          ...prev,
          `[${new Date().toLocaleTimeString()}] AI ERROR: Strategy generation engine failed. Please try again.`,
        ].slice(-10),
      );
    } finally {
      clearInterval(msgInterval);
      setAiLoading(false);
    }
  };

  return (
    <div className="bg-surface-container-low min-h-screen pt-24 pb-12 px-6 lg:px-12 font-sans text-on-background">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER TOOLBAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-black/5 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
              <span className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">
                Portfolio Overview
              </span>
            </div>
            <h1 className="text-2xl font-display font-extrabold text-primary mt-1">
              Quantum Portfolio Dashboard
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant max-w-2xl">
              Monitor your current holdings, harvest yield, and keep your
              AI-driven strategy aligned with live portfolio performance.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="bg-primary text-white font-mono text-xs font-bold px-4 py-2.5 rounded-xs flex items-center gap-2 shadow border border-zinc-700 select-none">
              <Wallet className="w-4 h-4" />
              <span>CONNECTED</span>
            </div>
            <button
              type="button"
              onClick={handleCopyAddress}
              className="rounded-xs border border-white/20 bg-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-primary/70"
            >
              {copyStatus}
            </button>
          </div>
        </div>

        {/* PORTFOLIO SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-black/5 shadow-sm md:col-span-2">
            <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
              Portfolio Summary
            </p>
            <h2 className="text-2xl font-display font-extrabold text-primary mt-2">
              Your invested assets
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="p-3 bg-surface rounded-lg">
                <p className="text-xs text-on-surface-variant">
                  Total Portfolio Value
                </p>
                <div className="text-lg font-black text-primary">
                  {formatSol(portfolioSolValue)}
                </div>
              </div>
              <div className="p-3 bg-surface rounded-lg">
                <p className="text-xs text-on-surface-variant">
                  Total Deposited
                </p>
                <div className="text-lg font-black text-primary">
                  {formatSol(totalDeposited)}
                </div>
              </div>
              <div className="p-3 bg-surface rounded-lg">
                <p className="text-xs text-on-surface-variant">
                  Total Yield Earned
                </p>
                <div className="text-lg font-black text-primary">
                  {formatSol(accumulatedYield)}
                </div>
              </div>
              <div className="p-3 bg-surface rounded-lg">
                <p className="text-xs text-on-surface-variant">
                  Available Balance
                </p>
                <div className="text-lg font-black text-primary">
                  {formatSol(availableBalance)}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-6">
              <div>
                <p className="text-xs text-on-surface-variant">Current APY</p>
                <div className="text-lg font-black text-primary">
                  {activeStrategy.projectedApy}%
                </div>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Current Vault</p>
                <div className="text-lg font-black text-primary">
                  {activeInvestments[0]?.symbol ?? "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-black/5 shadow-sm">
            <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
              Performance
            </p>
            <h2 className="text-xl font-bold text-primary mt-2">
              Portfolio growth
            </h2>
            <div className="mt-4">
              <div className="flex items-end gap-1 h-20">
                {performanceHistory.map((val, idx) => {
                  const max = Math.max(...performanceHistory, 1);
                  const height = max > 0 ? Math.max(4, (val / max) * 100) : 4;
                  return (
                    <div
                      key={idx}
                      className="flex-1 bg-zinc-100 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-on-surface-variant">
                <div>
                  <p className="text-xs uppercase">Daily</p>
                  <div className="font-bold text-primary">
                    ${(accumulatedYield / 30).toFixed(2)}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase">Weekly</p>
                  <div className="font-bold text-primary">
                    ${((accumulatedYield / 30) * 7).toFixed(2)}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase">Monthly</p>
                  <div className="font-bold text-primary">
                    ${accumulatedYield.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-xl border border-black/5 shadow-sm p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
                    Portfolio Operations
                  </p>
                  <h2 className="text-xl font-bold text-primary mt-2">
                    Deposit, manage, and harvest funds
                  </h2>
                </div>
                <span className="rounded-full bg-secondary/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.3em] text-secondary">
                  {wallet.address ? "Wallet Active" : "No Wallet"}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500">
                    Deposit asset
                  </span>
                  <select
                    value={fundSymbol}
                    onChange={(e) => setFundSymbol(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-outline-variant/60 bg-surface px-4 py-3 text-sm font-semibold text-primary outline-none"
                  >
                    <option value="SOL">SOL</option>
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="JUP">JUP</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500">
                    Amount
                  </span>
                  <input
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    type="number"
                    min="0"
                    step="1"
                    className="mt-2 w-full rounded-2xl border border-outline-variant/60 bg-surface px-4 py-3 text-sm text-primary outline-none"
                  />
                </label>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleDeposit}
                    disabled={depositLoading}
                    className="inline-flex items-center justify-center rounded-2xl bg-secondary px-5 py-3 text-sm font-bold uppercase tracking-[0.25em] text-white transition hover:bg-secondary/90 disabled:opacity-60"
                  >
                    {depositLoading ? "Depositing..." : "Deposit funds"}
                  </button>
                  <button
                    type="button"
                    onClick={handleHarvest}
                    disabled={harvestLoading}
                    className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/70 bg-background px-5 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-primary transition hover:bg-surface-container-low disabled:opacity-60"
                  >
                    {harvestLoading ? "Harvesting..." : "Harvest yield"}
                  </button>
                </div>
              </div>

              {actionMessage ? (
                <div className="mt-5 rounded-2xl bg-secondary/5 border border-secondary/20 py-3 px-4 text-sm text-secondary">
                  {actionMessage}
                </div>
              ) : null}
            </div>

            <div className="bg-white rounded-xl border border-black/5 shadow-sm p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
                    Active Investments
                  </p>
                  <h2 className="text-xl font-bold text-primary mt-2">
                    Current allocation
                  </h2>
                </div>
                <div className="text-right text-xs uppercase tracking-[0.3em] text-on-surface-variant">
                  {activeInvestments.length} positions
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {activeInvestments.map((position) => (
                  <div
                    key={position.symbol}
                    className="rounded-3xl border border-outline-variant/40 bg-surface p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-primary">
                          {position.symbol}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          Allocation {position.percentage}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">
                          {position.value}
                        </p>
                        <p className="text-[11px] uppercase text-zinc-500">
                          estimated value
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className="h-full bg-secondary"
                        style={{ width: `${position.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-3xl bg-surface p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                    Invested balance
                  </p>
                  <p className="mt-2 text-xl font-bold text-primary">
                    {formatSol(investedBalance)}
                  </p>
                </div>
                <div className="rounded-3xl bg-surface p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                    Strategy risk
                  </p>
                  <p className="mt-2 text-xl font-bold text-primary">
                    {activeStrategy.riskScore}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl border border-black/5 shadow-sm p-6">
              <div className="flex items-center gap-3">
                <Cpu className="h-5 w-5 text-secondary" />
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
                    AI strategy advisor
                  </p>
                  <h2 className="text-lg font-bold text-primary mt-2">
                    Advisor status
                  </h2>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl bg-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                      Active strategy
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-secondary">
                      {activeStrategy.projectedApy}% APY
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-primary">
                    {activeStrategy.strategyName}
                  </p>
                </div>
                <div className="rounded-3xl bg-surface p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                    Agents online
                  </p>
                  <p className="mt-2 text-sm text-primary">
                    {activeStrategy.activeAgents.join(" • ")}
                  </p>
                </div>
                <div className="rounded-3xl bg-surface p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                    Security summary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {activeStrategy.securityReport}
                  </p>
                </div>
                <div className="rounded-3xl bg-surface p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                    Portfolio momentum
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {activeStrategy.summaryPoints.slice(0, 2).join(" ")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-black/5 shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-2 border-b border-black/5 pb-3">
                <Sparkles className="w-5 h-5 text-secondary animate-pulse" />
                <h3 className="font-bold text-sm text-primary uppercase tracking-wider font-display">
                  Gemini AI Strategy Builder
                </h3>
              </div>

              <form onSubmit={handleNlpSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                    Describe your next risk profile
                  </label>
                  <textarea
                    value={nlpPrompt}
                    onChange={(e) => setNlpPrompt(e.target.value)}
                    placeholder="e.g. Protect with stables and deploy SOL if price stabilizes"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded p-3 text-xs font-sans h-24 focus:outline-none focus:border-secondary resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={aiLoading}
                  className="w-full bg-primary hover:bg-secondary text-white text-xs font-mono font-bold py-3.5 px-4 rounded-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />{" "}
                      {aiLoadingMessage}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-secondary" /> Build AI
                      strategy
                    </>
                  )}
                </button>
              </form>

              {parsedAiStrategy && (
                <div className="p-4 bg-secondary/10 border border-secondary/30 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-primary">
                      {parsedAiStrategy.strategyName}
                    </p>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-secondary">
                      {parsedAiStrategy.riskScore}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-on-surface-variant">
                    <div className="flex justify-between">
                      <span>Projected APY</span>
                      <strong>{parsedAiStrategy.projectedApy}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Rebalance</span>
                      <strong>{parsedAiStrategy.rebalanceInterval}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onActivateStrategy(parsedAiStrategy);
                      setParsedAiStrategy(null);
                    }}
                    className="w-full rounded-xl bg-secondary px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-white"
                  >
                    Activate AI strategy
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
