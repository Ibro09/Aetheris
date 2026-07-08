import { useState, useEffect } from "react";
import {
  Sparkles,
  Shield,
  TrendingUp,
  Cpu,
  Layers,
  Copy,
  ChevronDown,
  Check,
  ArrowRight,
  Zap,
  RefreshCw,
  ArrowLeft,
  Play,
  Info,
  AlertCircle,
  Compass,
  HelpCircle,
  Database,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { Strategy, Agent, MarketOpportunity } from "../types";
import {
  INITIAL_AGENTS,
  INITIAL_MARKET_OPPORTUNITIES,
  MARKETPLACE_STRATEGIES,
} from "../data";
import QuantumCanvas from "./QuantumCanvas";

interface LandingPageProps {
  onLaunchDashboard: () => void;
  onActivateStrategy: (strategy: Strategy) => void;
  activeStrategy: Strategy;
}

export default function LandingPage({
  onLaunchDashboard,
  onActivateStrategy,
  activeStrategy,
}: LandingPageProps) {
  // Stat Counter Increments
  const [tvl, setTvl] = useState(0);
  const [users, setUsers] = useState(0);
  const [latency, setLatency] = useState(0);
  const [apy, setApy] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const interval = 20; // 20ms steps
    const steps = duration / interval;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      setTvl(Math.min(Math.floor((287 / steps) * step), 287));
      setUsers(Math.min(Math.floor((83000 / steps) * step), 83000));
      setLatency(Math.min(Number(((1.4 / steps) * step).toFixed(1)), 1.4));
      setApy(Math.min(Math.floor((42 / steps) * step), 42));

      if (step >= steps) {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  // Deployment Loop stepper state
  const [activeStep, setActiveStep] = useState(0);
  const stepsData = [
    {
      title: "Connect Multi-Chain Wallets",
      desc: "Sync your digital assets across multiple networks with full cryptographic encryption. Zero private key exposure.",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBtdlWK0gHxikbTNImoPG0D83Q9Q-1hF1RkHzuI9XWEMVwfxZwqRP35-IYw6pU9rQGJNtEzWqbFhWrhPfxyasKAgPuoRlJnkFvTfGqKJTMrnpWm1IlnslRkOYILew3NZFfzm9Pl1luq6c8KzbuDsoIaqnQd8vAwu0FhYpcT1KETYQ7jvPFo9XzPemHa0Sy0GJLM9fnsUd5A1zBtlEwe5UDyud12h03tkHusScsrQ4-uNcAn6DXxMNAzbbq7Wy5eEk9lYJtIn7m-SLs",
    },
    {
      title: "Scanning Pool Intelligence",
      desc: "Aetheris AI continuously scans 1,000+ pools across Sol-DEXs (Orca, Raydium, Meteora) to locate maximum yield.",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBnO1JDcAX4lxbk5E56_pjDJCaunsw1J5awya0robxMW2lgZDVnVhZVrklMnBzn_CzbCdpHZZYkinGTOdCrZavzWk3hyZQSzRDv6-Qt6Yd0Mo16rHWwcuxv5FhAZB05XWGIBxtIhgGl_nQ1v_GdHf3zJX0FMStrIsnCzLlPNVGLVDYDnkZyhi9aajdqvIB8k984QP2JaXPFYoITUXmLaMI2QfS9akMa5qJpxHH-04wZ2DqMqDpLB08ULKQ7GOJQoUq0NOmNtC6vMtc",
    },
    {
      title: "Optimized Dynamic Deployment",
      desc: "Sub-atomic quants deploy assets with fractional gas optimization, avoiding front-running and MEV bot exploits.",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuC7Z_yrcaY7tyCjyfUGxukoE8zKjPd52BOAgPkWekInoeP-hwAMjUixE4mmUAzo2-L_3rpLgw_wuewMa4LpMp5L3BIiOrqKm_IC2ZH_uEEz3gcSG41hSRw3SSDFsDsdWIl61kfEUtJ6_PqMdY3Ym8SykqBrIKSsiTEIROVbHFTdHIkN92SANWxyK5tqLtv6Mv-05ukO2nZ4yn5TMzIhD1tM_0TCx9BeHvuRsmIGIcYGczKVaFjNhXrrWplpdxBxNArSzYnbyracJ2s",
    },
  ];

  // Neural Core Visual State Toggles
  const [sentimentHovered, setSentimentHovered] = useState<number | null>(null);
  const [riskValue, setRiskValue] = useState(35);
  const [heatmapCell, setHeatmapCell] = useState<string | null>(null);

  // Elite Agent Selector
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const toggleAgentStatus = (index: number) => {
    const updated = [...agents];
    updated[index].status =
      updated[index].status === "active" ? "idle" : "active";
    setAgents(updated);
  };

  // Live Yield Pool Executor Workflow
  const [executingPool, setExecutingPool] = useState<MarketOpportunity | null>(
    null,
  );
  const [executionStep, setExecutionStep] = useState(0);

  const startPoolExecution = (pool: MarketOpportunity) => {
    setExecutingPool(pool);
    setExecutionStep(1);

    // Simulate multi-stage transaction execution
    const interval = setInterval(() => {
      setExecutionStep((prev) => {
        if (prev >= 4) {
          clearInterval(interval);
          return 4;
        }
        return prev + 1;
      });
    }, 1200);
  };

  // FAQ states
  const [faqOpen, setFaqOpen] = useState<{ [key: number]: boolean }>({
    0: false,
    1: false,
    2: false,
    3: false,
  });
  const toggleFaq = (idx: number) => {
    setFaqOpen((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // SDK copy feedback
  const [copied, setCopied] = useState(false);
  const handleCopyCode = () => {
    const code = `import { AetherisClient } from '@aetheris/sdk';\n\nconst client = new AetherisClient({ apiKey: 'YOUR_KEY' });\nconst strategy = await client.optimize({\n  assets: ['SOL', 'USDC'],\n  riskTolerance: 'low',\n  duration: '30d'\n});\n\nstrategy.execute();`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // SVG Chart interactive states
  const [chartHoverIndex, setChartHoverIndex] = useState<number | null>(null);
  const chartPoints = [
    {
      year: "Year 1",
      value: 10000,
      yield: "+12.4%",
      desc: "Base Allocation Setup",
    },
    {
      year: "Year 2",
      value: 14200,
      yield: "+42%",
      desc: "DEX Rebalancing Deployed",
    },
    {
      year: "Year 3",
      value: 21500,
      yield: "+112%",
      desc: "Quantum APY Tuning",
    },
    {
      year: "Year 4",
      value: 31200,
      yield: "+212%",
      desc: "Sub-atomic Hedging Active",
    },
    {
      year: "Year 5",
      value: 41200,
      yield: "+312%",
      desc: "Peak Optimization Matrix",
    },
  ];

  return (
    <div className="bg-background text-on-background overflow-x-hidden">
      {/* HERO SECTION */}
      <header
        id="hero-section"
        className="relative min-h-screen flex items-center pt-24 overflow-hidden px-6 lg:px-12 border-b border-black/5 bg-radial from-secondary-fixed/10 to-transparent"
      >
        {/* Animated grid network canvas background */}
        <QuantumCanvas />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10 w-full py-12">
          <div className="flex flex-col justify-center lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-fixed text-on-secondary-fixed-variant text-xs font-mono tracking-wider uppercase w-fit mb-6 rounded-xs">
              <span className="w-2 h-2 bg-on-secondary-fixed-variant rounded-full animate-pulse"></span>
              AI × Quantum-Powered DeFi
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight text-primary leading-none mb-6">
              Your AI-Powered DeFi Portfolio Manager
            </h1>
            <p className="text-on-surface-variant text-lg md:text-xl mb-10 max-w-xl font-sans font-light leading-relaxed">
              Optimize yield, automate multi-protocol risk, and execute complex
              liquidity strategies through Aetheris—the world's first
              quantum-inspired AI optimizer.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                id="btn-hero-launch"
                onClick={onLaunchDashboard}
                className="bg-primary text-white font-medium px-8 py-4 hover:bg-secondary transition-all duration-300 text-center rounded-sm flex items-center justify-center gap-2 group shadow-lg"
              >
                Login / Sign Up
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#deployment-loop"
                className="border border-outline-variant text-primary font-medium px-8 py-4 hover:bg-surface-container-low transition-all duration-300 text-center rounded-sm"
              >
                Explore How It Works
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 flex items-center justify-center relative min-h-[400px]">
            {/* Interactive Futuristic Visual Card */}
            <div className="w-full glass rounded-xl p-6 relative shadow-2xl overflow-hidden group hover:scale-[1.02] transition-transform duration-500 max-w-md border border-outline-variant/30">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-secondary-fixed via-secondary to-on-secondary-fixed-variant"></div>

              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-secondary animate-spin-slow" />
                  <span className="text-xs font-mono font-bold tracking-wider text-secondary">
                    AETHERIS ORCHESTRATOR
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-black text-white rounded">
                  LIVE AGENTS ACTIVE
                </span>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white/50 rounded-lg border border-black/5 shadow-inner">
                  <div className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                    ACTIVE STRATEGY
                  </div>
                  <div className="text-lg font-bold font-display text-primary">
                    {activeStrategy.strategyName}
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-black/5">
                    <span className="text-xs font-mono text-on-surface-variant">
                      Projected APY:
                    </span>
                    <span className="text-sm font-mono font-bold text-secondary animate-pulse">
                      {activeStrategy.projectedApy}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/40 rounded border border-black/5">
                    <div className="text-[9px] font-mono text-on-surface-variant">
                      RISK INDEX
                    </div>
                    <div className="text-sm font-mono font-bold flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-secondary"></span>
                      {activeStrategy.riskScore}
                    </div>
                  </div>
                  <div className="p-3 bg-white/40 rounded border border-black/5">
                    <div className="text-[9px] font-mono text-on-surface-variant">
                      REBALANCE INTERVAL
                    </div>
                    <div className="text-sm font-mono font-bold mt-0.5 text-ellipsis overflow-hidden whitespace-nowrap">
                      {activeStrategy.rebalanceInterval}
                    </div>
                  </div>
                </div>

                {/* Animated Simulated Operations */}
                <div className="p-4 bg-black text-white/90 rounded-lg font-mono text-xs overflow-hidden h-28 space-y-1 shadow-inner relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 pointer-events-none"></div>
                  <div className="text-secondary-fixed-dim text-[10px] pb-1 border-b border-white/10 uppercase tracking-widest flex justify-between">
                    <span>Agent Operations</span>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                  </div>
                  <div className="animate-pulse text-[10px] text-green-400 mt-2">
                    &gt; [11:54:02] Yield Hunter scan init...
                  </div>
                  <div className="text-[10px] text-zinc-300">
                    &gt; [11:54:05] Checking Raydium SOL-USDC
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    &gt; [11:54:11] Allocations balanced (100%)
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    &gt; [11:54:15] Security state: 100% Verified
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

     

      {/* PROBLEM vs SOLUTION */}
      <section
        id="problem-solution"
        className="py-24 px-6 lg:px-12 bg-surface-container-low border-b border-black/5"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary tracking-tight">
              The Friction and Risk of Manual Yield Farming
            </h2>
            <p className="text-on-surface-variant font-sans font-light">
              Liquidity is scattered across hundreds of isolated protocols,
              demanding intensive constant monitoring and manual gas
              calculations just to break even.
            </p>
            <div className="space-y-4">
              <div className="p-4 bg-white border border-outline-variant/40 flex gap-4 items-start rounded-sm">
                <span className="p-2 bg-red-50 text-error rounded-full shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-bold text-primary text-sm">
                    Fragmented Capital Allocation
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Splitting liquidity manually across 50+ pools triggers
                    massive gas fee overhead and slippage.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-white border border-outline-variant/40 flex gap-4 items-start rounded-sm">
                <span className="p-2 bg-red-50 text-error rounded-full shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-bold text-primary text-sm">
                    Exhausting Manual Rebalancing
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Requires active rebalancing every few hours to capture
                    short-lived APR spikes before they crash.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-secondary tracking-tight">
              The Elegant Aetheris Optimization Solution
            </h2>
            <p className="text-on-surface-variant font-sans font-light">
              One dashboard integrates AI agents to automatically cycle,
              compounding yields with automated security defenses against
              impermanent loss.
            </p>
            <div className="space-y-4">
              <div className="p-5 bg-primary text-white shadow-xl flex gap-4 items-start rounded-sm transform scale-102 transition-transform">
                <span className="p-2 bg-white/10 text-secondary-fixed rounded-full shrink-0">
                  <Sparkles className="w-5 h-5 text-secondary-fixed" />
                </span>
                <div>
                  <h4 className="font-bold text-sm">
                    Neural-Automated Yield Compounding
                  </h4>
                  <p className="text-xs text-white/80 mt-1">
                    AI monitors, harvests, and bundles rewards globally,
                    compounding returns silently without manual action.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-white border-2 border-secondary flex gap-4 items-start rounded-sm">
                <span className="p-2 bg-secondary/10 text-secondary rounded-full shrink-0">
                  <Shield className="w-5 h-5 text-secondary" />
                </span>
                <div>
                  <h4 className="font-bold text-primary text-sm">
                    Quantum Impermanent Loss Protection
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Sub-atomic risk quants trigger instant liquidity withdrawals
                    when pool depth volatility exceeds safe limits.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS: THE DEPLOYMENT LOOP */}
      <section
        id="deployment-loop"
        className="py-24 px-6 lg:px-12 bg-white border-b border-black/5"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary tracking-tight">
              The Deployment Loop
            </h2>
            <p className="text-on-surface-variant font-sans font-light mt-4">
              Three seamless operational phases driving persistent portfolio
              yield optimization.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Steps text triggers */}
            <div className="lg:col-span-5 space-y-6">
              {stepsData.map((step, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`p-6 border cursor-pointer transition-all duration-300 rounded-sm flex gap-4 ${
                    activeStep === idx
                      ? "border-secondary bg-secondary-fixed/5 shadow-md transform translate-x-1"
                      : "border-outline-variant/40 hover:border-outline hover:bg-surface-container-low"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold shrink-0 text-sm ${
                      activeStep === idx
                        ? "bg-secondary text-white"
                        : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    0{idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-primary text-md">
                      {step.title}
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stepper active image display */}
            <div className="lg:col-span-7 flex justify-center relative bg-surface-container-low p-4 rounded-xl border border-black/5">
              <img
                src={stepsData[activeStep].image}
                alt={stepsData[activeStep].title}
                className="w-full h-80 object-cover rounded-lg border border-outline-variant/30 shadow-lg"
              />
              <div className="absolute bottom-6 right-6 bg-primary text-white font-mono text-[10px] px-3 py-1.5 rounded-xs shadow">
                STAGE 0{activeStep + 1} CONFIRMED
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEURAL CORE SECTION */}
      <section
        id="neural-core"
        className="py-24 px-6 lg:px-12 bg-surface-container border-b border-black/5"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary tracking-tight">
              The Neural Decision Core
            </h2>
            <p className="text-on-surface-variant font-sans font-light mt-4">
              Real-time multi-dimensional risk gauges, sentiment analysis, and
              liquidity heatmaps fueling Aetheris AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Market Sentiment */}
            <div className="glass p-8 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                  <span className="text-xs font-mono font-bold uppercase text-on-surface-variant">
                    Market Sentiment Index
                  </span>
                </div>

                {/* Visual Sentiment bar chart */}
                <div className="h-44 flex items-end gap-3 pb-2 border-b border-black/5">
                  {[35, 55, 45, 90, 75, 60].map((h, idx) => (
                    <div
                      key={idx}
                      onMouseEnter={() => setSentimentHovered(idx)}
                      onMouseLeave={() => setSentimentHovered(null)}
                      className={`flex-1 rounded-xs transition-all duration-300 relative cursor-pointer ${
                        idx === 3
                          ? "bg-secondary"
                          : sentimentHovered === idx
                            ? "bg-secondary/70"
                            : "bg-black/10"
                      }`}
                      style={{ height: `${h}%` }}
                    >
                      {sentimentHovered === idx && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-mono px-2 py-1 rounded shadow whitespace-nowrap z-20">
                          Vol: {h}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-6">
                <div className="text-2xl font-display font-bold text-secondary flex items-center gap-2">
                  Bullish Optima
                  <span className="text-xs font-mono bg-secondary-fixed text-on-secondary-fixed-variant px-2 py-0.5 uppercase">
                    SOL High
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-2">
                  DEX trading volume is accelerating; yield multipliers deployed
                  on volatile pools.
                </p>
              </div>
            </div>

            {/* Card 2: Interactive Risk Dial */}
            <div className="glass p-8 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-secondary" />
                  <span className="text-xs font-mono font-bold uppercase text-on-surface-variant">
                    Risk Meter Dial
                  </span>
                </div>

                {/* SVG Dial Gauge */}
                <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="88"
                      cy="88"
                      r="68"
                      fill="transparent"
                      stroke="#eeeeee"
                      strokeWidth="8"
                    />
                    <circle
                      cx="88"
                      cy="88"
                      r="68"
                      fill="transparent"
                      stroke="#77574d"
                      strokeWidth="10"
                      strokeDasharray="427"
                      strokeDashoffset={427 - (427 * riskValue) / 100}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-display font-extrabold text-primary">
                      {riskValue < 30
                        ? "LOW"
                        : riskValue < 70
                          ? "MEDIUM"
                          : "HIGH"}
                    </span>
                    <span className="text-[10px] font-mono text-on-surface-variant/70 mt-1">
                      Score: {riskValue}
                    </span>
                  </div>
                </div>

                {/* Slider to interact */}
                <div className="mt-4 px-2">
                  <input
                    type="range"
                    min="10"
                    max="95"
                    value={riskValue}
                    onChange={(e) => setRiskValue(Number(e.target.value))}
                    className="w-full accent-secondary h-1.5 bg-black/10 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-on-surface-variant mt-1.5">
                    <span>Safest (10)</span>
                    <span>Aggressive (95)</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-black/5 mt-4">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Adjusting risk triggers rebalancing strategies. Yield
                  algorithms automatically adapt asset parameters.
                </p>
              </div>
            </div>

            {/* Card 3: Interactive Liquidity Heatmap */}
            <div className="glass p-8 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Layers className="w-5 h-5 text-secondary" />
                  <span className="text-xs font-mono font-bold uppercase text-on-surface-variant">
                    Liquidity Heatmap Grid
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2.5 h-44">
                  {[
                    {
                      id: "C1",
                      bg: "bg-secondary-fixed-dim",
                      desc: "Raydium SOL-USDC Deep Pool",
                      scale: "Low Vol",
                    },
                    {
                      id: "C2",
                      bg: "bg-secondary",
                      desc: "Orca SOL-USDC High APR",
                      scale: "Med Vol",
                    },
                    {
                      id: "C3",
                      bg: "bg-primary",
                      desc: "Meteora SOL-BONK Concentrated",
                      scale: "Extreme Vol",
                    },
                    {
                      id: "C4",
                      bg: "bg-zinc-200",
                      desc: "Kamino USDC-USDT Delta Stable",
                      scale: "Zero Vol",
                    },
                    {
                      id: "C5",
                      bg: "bg-primary",
                      desc: "Orca JUP-SOL High Yield",
                      scale: "High Vol",
                    },
                    {
                      id: "C6",
                      bg: "bg-secondary",
                      desc: "Raydium JUP-USDC Constant",
                      scale: "Med Vol",
                    },
                    {
                      id: "C7",
                      bg: "bg-secondary-fixed",
                      desc: "Meteora SOL-USDC Dynamic",
                      scale: "Low Vol",
                    },
                    {
                      id: "C8",
                      bg: "bg-primary",
                      desc: "Orca BONK-USDC Wild Farming",
                      scale: "Extreme Vol",
                    },
                  ].map((cell, idx) => (
                    <div
                      key={idx}
                      onMouseEnter={() => setHeatmapCell(cell.desc)}
                      onMouseLeave={() => setHeatmapCell(null)}
                      className={`${cell.bg} rounded-xs cursor-pointer transition-all duration-200 hover:scale-[1.1] hover:z-10 shadow-sm relative`}
                    />
                  ))}
                </div>
              </div>
              <div className="pt-6">
                <div className="text-xs font-mono text-primary font-bold min-h-10 leading-relaxed bg-white/50 p-2.5 rounded border border-black/5">
                  {heatmapCell ? (
                    <span className="text-secondary animate-pulse">
                      {heatmapCell}
                    </span>
                  ) : (
                    "Hover cells above to scan real-time pool metrics..."
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUANTUM BALANCER */}
      <section
        id="quantum-balancer"
        className="py-24 px-6 lg:px-12 bg-black text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(119,87,77,0.15),transparent_60%)]"></div>
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-secondary-fixed-dim text-xs font-mono tracking-wider uppercase rounded-xs">
              <Sparkles className="w-3 h-3 text-secondary-fixed-dim animate-pulse" />
              Sub-atomic Compute Engine
            </div>
            <h2 className="text-4xl md:text-6xl font-display font-extrabold text-white leading-none">
              Quantum Balancer Matrix
            </h2>
            <p className="text-zinc-400 text-lg font-light leading-relaxed">
              We mathematically resolve the DeFi trilemma in real-time. Capital
              yield, system risk indices, and multi-pool liquidity values are
              seamlessly harmonized through our non-linear simulation model.
            </p>
            <ul className="space-y-4 pt-4">
              <li className="flex gap-3 items-center">
                <span className="p-1 bg-white/10 text-secondary-fixed-dim rounded-full shrink-0">
                  <Check className="w-4 h-4 text-secondary-fixed" />
                </span>
                <span className="text-sm text-zinc-300">
                  Predictive risk mitigation using dynamic Monte Carlo pathing
                </span>
              </li>
              <li className="flex gap-3 items-center">
                <span className="p-1 bg-white/10 text-secondary-fixed-dim rounded-full shrink-0">
                  <Check className="w-4 h-4 text-secondary-fixed" />
                </span>
                <span className="text-sm text-zinc-300">
                  0.0001ms computational latency executing atomic on-chain swaps
                </span>
              </li>
            </ul>
          </div>

          {/* Glowing Neural Node Diagram representation */}
          <div className="flex items-center justify-center min-h-[350px] relative">
            <div className="w-72 h-72 rounded-full border-2 border-dashed border-zinc-800 flex items-center justify-center relative animate-[spin_40s_linear_infinite]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-8 h-8 rounded-full bg-secondary-fixed text-primary flex items-center justify-center font-bold text-xs shadow-lg">
                01
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 w-8 h-8 rounded-full bg-secondary-fixed text-primary flex items-center justify-center font-bold text-xs shadow-lg">
                02
              </div>
              <div className="absolute left-0 top-1/2 -translate-x-4 -translate-y-1/2 w-8 h-8 rounded-full bg-secondary-fixed text-primary flex items-center justify-center font-bold text-xs shadow-lg">
                03
              </div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-secondary text-white font-mono font-bold flex flex-col items-center justify-center shadow-2xl relative border-4 border-black group cursor-pointer hover:scale-105 transition-transform">
                <Cpu className="w-6 h-6 mb-1 animate-pulse" />
                <span className="text-[9px] tracking-widest uppercase">
                  CORE
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE YIELD OPPORTUNITIES */}
      <section
        id="live-yields"
        className="py-24 px-6 lg:px-12 bg-white border-b border-black/5"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-primary tracking-tight">
                Live Yield Opportunities
              </h2>
              <p className="text-on-surface-variant font-sans font-light mt-2">
                Compare real-time yields and deploy strategies across mainnet
                DEXs.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-mono bg-zinc-100 text-zinc-600 px-3 py-1.5 rounded uppercase tracking-wider font-semibold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-secondary" />
              UPDATED 2s AGO
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {INITIAL_MARKET_OPPORTUNITIES.map((pool, idx) => (
              <div
                key={idx}
                className={`border p-8 rounded-sm relative flex flex-col justify-between transition-all duration-300 ${
                  pool.protocol === "Orca"
                    ? "border-2 border-secondary bg-white shadow-xl transform md:-translate-y-3"
                    : "border-outline-variant/50 hover:bg-surface-container-low"
                }`}
              >
                {pool.protocol === "Orca" && (
                  <span className="absolute -top-3.5 right-6 bg-secondary text-white font-mono text-[9px] font-bold tracking-widest px-3 py-1 shadow">
                    AI OPTIMAL PICK
                  </span>
                )}

                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-mono text-xs font-bold text-secondary uppercase tracking-widest">
                      {pool.protocol}
                    </span>
                    <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded font-mono font-medium text-zinc-600">
                      {pool.assetPair}
                    </span>
                  </div>

                  <div className="mb-6">
                    <p className="text-on-surface-variant text-xs">
                      Projected APY
                    </p>
                    <h4 className="text-4xl font-display font-black text-primary mt-1">
                      {pool.apy}%
                    </h4>
                  </div>

                  <div className="space-y-2 mb-8">
                    <div className="flex justify-between text-xs font-mono text-on-surface-variant/70">
                      <span>Liquidity Depth:</span>
                      <span className="font-medium text-primary">
                        {pool.liquidity}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-mono text-on-surface-variant/70">
                      <span>Trend Metrics:</span>
                      <span className="font-medium text-secondary flex items-center gap-1 uppercase text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        {pool.trend}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => startPoolExecution(pool)}
                  className={`w-full py-3.5 font-bold font-mono text-xs tracking-wider uppercase rounded-xs transition-all duration-300 ${
                    pool.protocol === "Orca"
                      ? "bg-secondary text-white hover:bg-primary shadow"
                      : "border border-primary text-primary hover:bg-primary hover:text-white"
                  }`}
                >
                  {pool.protocol === "Orca"
                    ? "Execute AI Strategy"
                    : "Inspect Pool"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic transaction loader modal overlay */}
        {executingPool && (
          <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 p-6 backdrop-blur-sm">
            <div className="bg-white max-w-md w-full rounded-xl p-8 border border-zinc-100 shadow-2xl relative">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-secondary animate-pulse" />
                  <span className="font-mono font-bold text-xs tracking-wider text-primary">
                    STRATEGY EXECUTION
                  </span>
                </div>
                <button
                  onClick={() => setExecutingPool(null)}
                  className="p-1 text-zinc-400 hover:text-primary transition-colors text-xs font-mono hover:underline"
                >
                  CLOSE
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-zinc-50 rounded border border-zinc-100">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">
                    Selected Vault
                  </div>
                  <div className="text-lg font-bold text-zinc-800">
                    {executingPool.protocol} ({executingPool.assetPair})
                  </div>
                  <div className="text-xs font-mono text-secondary font-bold mt-1">
                    Est. Compound APY: {executingPool.apy}%
                  </div>
                </div>

                {/* Simulated stepper log */}
                <div className="space-y-4">
                  {[
                    "Orchestrating multi-pool route parameters",
                    "Simulating slippage and contract security audit",
                    "Signing and authorizing simulated transaction",
                    "Vault deposits confirmed! Harvesting yield.",
                  ].map((stepDesc, idx) => {
                    const stepNum = idx + 1;
                    let stepStatus: "pending" | "current" | "done" = "pending";
                    if (executionStep > stepNum) stepStatus = "done";
                    else if (executionStep === stepNum) stepStatus = "current";

                    return (
                      <div key={idx} className="flex gap-3 items-start">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-mono text-[9px] font-bold ${
                            stepStatus === "done"
                              ? "bg-secondary text-white"
                              : stepStatus === "current"
                                ? "bg-primary text-white animate-pulse"
                                : "bg-zinc-100 text-zinc-400"
                          }`}
                        >
                          {stepStatus === "done" ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            stepNum
                          )}
                        </div>
                        <span
                          className={`text-xs ${
                            stepStatus === "done"
                              ? "text-zinc-500 line-through"
                              : stepStatus === "current"
                                ? "text-primary font-bold"
                                : "text-zinc-400"
                          }`}
                        >
                          {stepDesc}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {executionStep >= 4 ? (
                  <div className="pt-4 border-t border-zinc-100">
                    <div className="bg-green-50 text-green-700 p-4 rounded text-xs leading-relaxed border border-green-100 font-sans flex items-start gap-2">
                      <Check className="w-5 h-5 shrink-0 text-green-600 mt-0.5" />
                      <div>
                        <strong>Allocation Active!</strong> The simulated yield
                        strategy has been successfully integrated. You can track
                        dynamic logs in the main dashboard.
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // Activate Orca Strategy parameters
                        onActivateStrategy({
                          strategyName: `Quantum ${executingPool.protocol} Optimize`,
                          riskScore: "HIGH",
                          riskValue: 72,
                          projectedApy: executingPool.apy,
                          rebalanceInterval: "Volatility-triggered (<0.5%)",
                          estimatedGasFee: "0.0031 SOL",
                          allocations: [
                            { symbol: "SOL", percentage: 70, color: "#8D6E63" },
                            {
                              symbol: "BONK",
                              percentage: 20,
                              color: "#ffdbd0",
                            },
                            { symbol: "JUP", percentage: 10, color: "#c6c6c6" },
                          ],
                          securityReport:
                            "Orchestrated pool setup on high-yield DEX routes with built-in capital protection overrides.",
                          activeAgents: ["Yield Hunter", "Risk Guardian"],
                          summaryPoints: [
                            "Optimized single-asset routing protocols",
                            "Auto-compounds rewards directly into vault liquidity",
                            "Active risk monitoring prevents dynamic oracle failures",
                          ],
                        });
                        setExecutingPool(null);
                        onLaunchDashboard();
                      }}
                      className="w-full mt-4 py-3 bg-primary text-white font-mono font-bold text-xs uppercase tracking-wider hover:bg-secondary rounded-xs transition-colors"
                    >
                      Go to Portfolio Dashboard
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-dashed border-secondary rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* REBALANCING TRANSITION SCHEME */}
      <section
        id="rebalance-loop"
        className="py-20 px-6 lg:px-12 bg-surface-container-low border-b border-black/5"
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-mono uppercase font-bold text-zinc-500 text-center tracking-widest mb-12">
            Dynamic Continuous Rebalancing
          </h2>
          <div className="relative h-24 flex items-center max-w-4xl mx-auto">
            <div className="absolute inset-x-0 bg-outline-variant/60 h-0.5 my-auto"></div>
            <div className="relative flex justify-between w-full">
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-primary mb-3 shadow z-10 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-mono font-bold text-primary">
                  08:00 Raydium
                </span>
                <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  Allocation Balanced
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-secondary animate-ping mb-3 shadow z-10 flex items-center justify-center">
                  <RefreshCw className="w-3 h-3 text-white animate-spin-slow" />
                </div>
                <span className="text-xs font-mono font-bold text-secondary">
                  14:30 Orca Vault
                </span>
                <span className="text-[10px] text-secondary font-mono mt-0.5">
                  Shifting Capital
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-zinc-300 mb-3 shadow z-10"></div>
                <span className="text-xs font-mono font-bold text-zinc-500">
                  22:00 Meteora
                </span>
                <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  Scheduled Sweep
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ELITE AGENT SQUAD */}
      <section
        id="agent-squad"
        className="py-24 px-6 lg:px-12 bg-white border-b border-black/5"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary tracking-tight">
              Your Elite Agent Squad
            </h2>
            <p className="text-on-surface-variant font-sans font-light mt-4">
              Deploy specialized, autonomous AI sub-processes to monitor
              distinct parameters of your DeFi holdings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {agents.map((agent, idx) => (
              <div
                key={idx}
                onClick={() => toggleAgentStatus(idx)}
                className={`p-8 border rounded-sm cursor-pointer transition-all duration-300 group ${
                  agent.status === "active"
                    ? "border-secondary bg-secondary-fixed/5 shadow-md"
                    : "border-outline-variant/40 hover:border-outline hover:bg-surface-container-low"
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div
                    className={`p-3 rounded-full ${
                      agent.status === "active"
                        ? "bg-secondary text-white"
                        : "bg-zinc-100 text-zinc-500 group-hover:bg-secondary/10 group-hover:text-secondary"
                    } transition-colors duration-300`}
                  >
                    <Cpu className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-sm uppercase font-bold tracking-wider ${
                      agent.status === "active"
                        ? "bg-secondary text-white animate-pulse"
                        : "bg-zinc-100 text-zinc-400"
                    }`}
                  >
                    {agent.status === "active" ? "DEPLOYED" : "STANDBY"}
                  </span>
                </div>

                <h4 className="text-lg font-bold text-primary mb-2 font-display">
                  {agent.name}
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-6 h-12 overflow-hidden">
                  {agent.description}
                </p>

                <div className="flex justify-between items-center pt-4 border-t border-black/5 text-xs font-mono">
                  <span className="text-on-surface-variant/70">
                    Performance index:
                  </span>
                  <span
                    className={`font-bold ${agent.status === "active" ? "text-secondary" : "text-zinc-400"}`}
                  >
                    {agent.performance}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STRATEGY MARKETPLACE */}
      <section
        id="marketplace"
        className="py-24 px-6 lg:px-12 bg-surface-container-low border-b border-black/5"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary tracking-tight">
              Pre-made Strategy Marketplace
            </h2>
            <p className="text-on-surface-variant font-sans font-light mt-4">
              Instantly subscribe to top-performing quant-curated models
              designed for specific asset structures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {MARKETPLACE_STRATEGIES.map((strat, idx) => (
              <div
                key={idx}
                className="bg-white p-6 rounded-xl border border-outline-variant/40 hover:border-secondary transition-all duration-300 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="font-bold text-primary text-sm font-display">
                      {strat.strategyName}
                    </h5>
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        strat.riskScore === "LOW"
                          ? "bg-green-100 text-green-700"
                          : strat.riskScore === "MEDIUM"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {strat.riskScore}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant/80 mb-6 line-clamp-2 h-8 leading-relaxed">
                    {strat.securityReport}
                  </p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-black/5">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      PROJECTED APR
                    </span>
                    <div className="text-lg font-mono font-bold text-secondary">
                      {strat.projectedApy}% APY
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onActivateStrategy(strat);
                      onLaunchDashboard();
                    }}
                    className="bg-primary text-white text-xs font-mono font-bold px-4 py-2 hover:bg-secondary transition-colors uppercase tracking-wider rounded-xs"
                  >
                    Deploy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FORTIFIED INTELLIGENCE */}
      <section
        id="security-assurance"
        className="py-24 px-6 lg:px-12 bg-white border-b border-black/5"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5 flex items-center justify-center relative min-h-[300px]">
            <div className="w-56 h-56 rounded-full border-4 border-secondary-fixed flex items-center justify-center relative">
              <span className="w-48 h-48 rounded-full bg-secondary-fixed/30 flex items-center justify-center">
                <Shield className="w-24 h-24 text-secondary animate-pulse" />
              </span>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <h2 className="text-3xl md:text-5xl font-display font-extrabold text-primary tracking-tight leading-none">
              Fortified Security Architecture
            </h2>
            <p className="text-on-surface-variant font-sans font-light text-md leading-relaxed">
              We never compromise on security. AI operations execute transaction
              layers backed by triple-audit smart contracts, ensuring secure and
              private fund routing.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="space-y-1">
                <h6 className="font-bold text-primary flex items-center gap-1.5 text-sm">
                  <Check className="w-4 h-4 text-secondary" /> Formal
                  Verification
                </h6>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Mathematical proofs confirm that pool routing code contains
                  zero logical vulnerabilities.
                </p>
              </div>
              <div className="space-y-1">
                <h6 className="font-bold text-primary flex items-center gap-1.5 text-sm">
                  <Check className="w-4 h-4 text-secondary" /> 24/7 Security
                  Auditing
                </h6>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Continuous checking of protocol oracle and pool stability
                  matrices stops exploit vectors before execution.
                </p>
              </div>
              <div className="space-y-1">
                <h6 className="font-bold text-primary flex items-center gap-1.5 text-sm">
                  <Check className="w-4 h-4 text-secondary" /> Cold Vault Shield
                </h6>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Governance capital is stored on cold, physical hardware keys
                  requiring multi-signature confirmations.
                </p>
              </div>
              <div className="space-y-1">
                <h6 className="font-bold text-primary flex items-center gap-1.5 text-sm">
                  <Check className="w-4 h-4 text-secondary" /> Oracle Flashloan
                  Stops
                </h6>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Dynamic slippage calculations block rapid price deviations
                  caused by flashloan arbitrage exploits.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    

      {/* DEVELOPER PLATFORM */}
      <section
        id="developer-platform"
        className="py-24 px-6 lg:px-12 bg-white border-b border-black/5"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-display font-extrabold text-primary tracking-tight mb-6">
              Built for Builders
            </h2>
            <p className="text-on-surface-variant font-sans font-light leading-relaxed mb-8">
              Access Aetheris optimization engine directly inside your
              decentralized application. Integrate smart-balancer strategies
              with less than 10 lines of code.
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="bg-primary text-white text-xs font-mono font-bold px-6 py-3.5 hover:bg-secondary transition-colors uppercase tracking-wider rounded-xs"
              >
                Read SDK Docs
              </a>
            </div>
          </div>

          <div className="bg-[#1b1b1b] rounded-xl p-6 font-mono text-xs text-green-400 overflow-x-auto shadow-2xl relative border border-white/5">
            <button
              onClick={handleCopyCode}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded transition-colors"
              title="Copy Code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <p className="text-zinc-500">
              // Initializing Aetheris Optimization Client
            </p>
            <p className="text-white">
              import {"{"} AetherisClient {"}"} from '@aetheris/sdk';
            </p>
            <br />
            <p className="text-amber-300">
              const client = new AetherisClient({"{"} apiKey: 'YOUR_KEY' {"}"});
            </p>
            <br />
            <p className="text-white">
              const strategy = await client.optimize({"{"}
            </p>
            <p className="pl-4 text-zinc-300">assets: ['SOL', 'USDC'],</p>
            <p className="pl-4 text-zinc-300">riskTolerance: 'low',</p>
            <p className="pl-4 text-zinc-300">duration: '30d'</p>
            <p className="text-white">{"}"});</p>
            <br />
            <p className="text-green-300">await strategy.execute();</p>
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section
        id="roadmap"
        className="py-24 px-6 lg:px-12 bg-surface-container border-b border-black/5"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary tracking-tight">
              Ecosystem Roadmap
            </h2>
            <p className="text-on-surface-variant font-sans font-light mt-4">
              Follow our dynamic roadmap phases establishing persistent DeFi
              integrations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                phase: "PHASE 01",
                title: "Core Launch",
                desc: "Mainnet deployment of the decentralized Aetheris optimizer client on Solana.",
                status: "Complete",
                statusColor: "text-green-600",
              },
              {
                phase: "PHASE 02",
                title: "Multi-Chain Bridge",
                desc: "Integrate Arbitrum, Optimism, and Base pools with atomic cross-chain routing.",
                status: "In Progress",
                statusColor: "text-secondary",
              },
              {
                phase: "PHASE 03",
                title: "Sub-Atomic V2",
                desc: "Introduce advanced machine-learning predictors estimating impermanent loss metrics.",
                status: "Q4 2026",
                statusColor: "text-zinc-400",
              },
              {
                phase: "PHASE 04",
                title: "DAO Token Integration",
                desc: "Delegate optimization variables and pool validation parameter controls to governance holders.",
                status: "Q1 2027",
                statusColor: "text-zinc-400",
              },
            ].map((node, idx) => (
              <div
                key={idx}
                className="bg-white p-8 border border-outline-variant/30 rounded-sm shadow-sm flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-mono text-secondary font-bold tracking-wider">
                    {node.phase}
                  </span>
                  <h4 className="font-bold text-primary font-display text-md mt-2 mb-3">
                    {node.title}
                  </h4>
                  <p className="text-xs text-on-surface-variant/80 leading-relaxed">
                    {node.desc}
                  </p>
                </div>
                <div
                  className={`mt-6 pt-4 border-t border-black/5 font-mono text-xs font-bold ${node.statusColor}`}
                >
                  {node.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

   

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section
        id="faq-section"
        className="py-24 px-6 lg:px-12 bg-surface-container-low"
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary tracking-tight text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "What makes this 'Quantum'?",
                a: "We utilize quantum-inspired heuristic optimization models that resolve multi-variable constraints (such as APY limits, transaction fee weights, and slippage) significantly faster than traditional linear programs, preventing latency-driven price slippage.",
              },
              {
                q: "Is my capital insured or locked?",
                a: "Capital is never locked and can be withdrawn from vaults at any moment. While Aetheris does not provide centralized insurance, our Risk Guardian agent actively coordinates safety margins to withdraw funds immediately to your wallet in milliseconds upon pool anomalies.",
              },
              {
                q: "Do I pay gas fees on every single compound?",
                a: "No! Gas fees are heavily optimized because our smart pool engines bundle rebalance transactions across thousands of protocol users simultaneously, distributing operational network gas costs to a fraction of a cent per user.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="border-b border-outline-variant/40 pb-4"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex justify-between items-center py-4 font-bold text-primary hover:text-secondary text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-secondary" />
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-zinc-400 transition-transform ${faqOpen[idx] ? "rotate-180" : ""}`}
                  />
                </button>
                {faqOpen[idx] && (
                  <p className="text-xs text-on-surface-variant leading-relaxed pl-6 animate-fadeIn">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section
        id="cta-section"
        className="py-24 px-6 lg:px-12 bg-primary text-white text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,219,208,0.1),transparent_50%)]"></div>
        <div className="relative z-10 max-w-2xl mx-auto space-y-8">
          <h2 className="text-4xl md:text-6xl font-display font-extrabold text-white leading-tight">
            Ready to Transcend?
          </h2>
          <p className="text-zinc-400 text-lg font-light leading-relaxed">
            Join thousands of decentralized nodes automatically optimizing their
            digital assets with high-frequency AI algorithms.
          </p>
          <button
            onClick={onLaunchDashboard}
            className="bg-white text-primary font-bold px-12 py-5 hover:bg-secondary-fixed transition-colors text-lg uppercase tracking-wider rounded-xs shadow-lg inline-flex items-center gap-2 group"
          >
            Launch Active App
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>
    </div>
  );
}
