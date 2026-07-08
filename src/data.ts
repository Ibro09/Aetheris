import { Strategy, Agent, MarketOpportunity } from "./types";

export const INITIAL_AGENTS: Agent[] = [
  {
    name: "Yield Hunter",
    icon: "trending_up",
    description: "Focuses on maximum APY through dynamic liquid farming and auto-compounding.",
    status: "active",
    performance: "+4.2% APY Alpha"
  },
  {
    name: "Risk Guardian",
    icon: "shield",
    description: "Analyzes smart contract audits, oracle states, and liquidity depth 24/7.",
    status: "active",
    performance: "100% Safety Score"
  },
  {
    name: "Arb Master",
    icon: "swap_calls",
    description: "Executes atomic swaps across DEXs to capture cross-protocol price spreads.",
    status: "idle",
    performance: "0.2s Avg Latency"
  },
  {
    name: "Peg Balancer",
    icon: "balance",
    description: "Optimizes stablecoin allocations during market-wide volatility to preserve peg values.",
    status: "idle",
    performance: "1.0001 Peg Dev"
  },
  {
    name: "Alpha Scout",
    icon: "rocket_launch",
    description: "Scans on-chain social volume and contract creation logs to spot emerging pools.",
    status: "idle",
    performance: "4 new pools scanned"
  },
  {
    name: "Meta Engine",
    icon: "psychology",
    description: "Orchestrates all sub-agents to synchronize unified portfolio goals.",
    status: "active",
    performance: "3 agents aligned"
  }
];

export const INITIAL_MARKET_OPPORTUNITIES: MarketOpportunity[] = [
  {
    protocol: "Raydium",
    apy: 12.4,
    trend: "stable",
    liquidity: "$42.1M",
    assetPair: "SOL-USDC",
    logoColor: "bg-surface-variant text-on-surface-variant"
  },
  {
    protocol: "Orca",
    apy: 28.9,
    trend: "up",
    liquidity: "$114.5M",
    assetPair: "SOL-JUP",
    logoColor: "bg-primary text-on-primary"
  },
  {
    protocol: "Meteora",
    apy: 15.1,
    trend: "up",
    liquidity: "$28.3M",
    assetPair: "SOL-BONK",
    logoColor: "bg-surface-variant text-on-surface-variant"
  },
  {
    protocol: "Kamino",
    apy: 9.8,
    trend: "stable",
    liquidity: "$195.4M",
    assetPair: "USDC-USDT",
    logoColor: "bg-surface-variant text-on-surface-variant"
  }
];

export const MARKETPLACE_STRATEGIES: Strategy[] = [
  {
    strategyName: "Yield Hunter Pro",
    riskScore: "HIGH",
    riskValue: 78,
    projectedApy: 24.0,
    rebalanceInterval: "Every 4 Hours",
    estimatedGasFee: "0.0035 SOL",
    allocations: [
      { symbol: "SOL", percentage: 60, color: "#8D6E63" },
      { symbol: "BONK", percentage: 25, color: "#ffdbd0" },
      { symbol: "JUP", percentage: 15, color: "#c6c6c6" }
    ],
    securityReport: "Aggressive pool provisioning across Raydium and Orca. Secured by automatic withdrawal on 5% slippage spikes.",
    activeAgents: ["Yield Hunter", "Alpha Scout"],
    summaryPoints: [
      "Concentrated liquidity optimization for SOL pairs",
      "Auto-harvesting of trading fee margins",
      "Dynamic slippage protection tolerance"
    ]
  },
  {
    strategyName: "Risk Guardian Plus",
    riskScore: "LOW",
    riskValue: 10,
    projectedApy: 9.5,
    rebalanceInterval: "Every 48 Hours",
    estimatedGasFee: "0.0011 SOL",
    allocations: [
      { symbol: "USDC", percentage: 70, color: "#1b1b1b" },
      { symbol: "SOL", percentage: 20, color: "#8D6E63" },
      { symbol: "USDT", percentage: 10, color: "#c6c6c6" }
    ],
    securityReport: "Conservative strategy focused heavily on blue-chip stablecoin vaults and multi-signature security compliance.",
    activeAgents: ["Risk Guardian", "Peg Balancer"],
    summaryPoints: [
      "High stablecoin concentration for capital preservation",
      "Automated peg monitoring across liquidity pools",
      "Zero exposure to high-volatility meme-tokens"
    ]
  },
  {
    strategyName: "Arb Engine v2",
    riskScore: "MEDIUM",
    riskValue: 42,
    projectedApy: 16.8,
    rebalanceInterval: "Immediate (Volatility Driven)",
    estimatedGasFee: "0.0062 SOL",
    allocations: [
      { symbol: "SOL", percentage: 40, color: "#8D6E63" },
      { symbol: "USDC", percentage: 30, color: "#1b1b1b" },
      { symbol: "JUP", percentage: 30, color: "#c6c6c6" }
    ],
    securityReport: "Dual-dex atomic swaps across Orca, Raydium, and Meteora pools. High gas fee profile offset by arb spreads.",
    activeAgents: ["Arb Master", "Meta Engine"],
    summaryPoints: [
      "Flash-loan powered cross-dex arbitrage execution",
      "Captures high-frequency trading price spreads",
      "Requires constant on-chain RPC node monitoring"
    ]
  },
  {
    strategyName: "Alpha Seeker",
    riskScore: "HIGH",
    riskValue: 92,
    projectedApy: 45.5,
    rebalanceInterval: "Sub-Second (Dynamic)",
    estimatedGasFee: "0.0084 SOL",
    allocations: [
      { symbol: "BONK", percentage: 50, color: "#ffdbd0" },
      { symbol: "JUP", percentage: 30, color: "#c6c6c6" },
      { symbol: "SOL", percentage: 20, color: "#8D6E63" }
    ],
    securityReport: "Extreme high-risk profile. Executes micro-cap liquidity plays with automatic 10-second trailing stop-loss protection.",
    activeAgents: ["Yield Hunter", "Alpha Scout", "Arb Master"],
    summaryPoints: [
      "Harnesses meme-token volume trends for massive APY spikes",
      "High-speed trailing stop-loss guarding principal capital",
      "Recommended only for experienced high-risk capital"
    ]
  }
];

export const DEFAULT_ACTIVE_STRATEGY: Strategy = {
  strategyName: "Aetheris Balanced Core",
  riskScore: "MEDIUM",
  riskValue: 35,
  projectedApy: 14.2,
  rebalanceInterval: "Every 12 Hours",
  estimatedGasFee: "0.0022 SOL",
  allocations: [
    { symbol: "SOL", percentage: 50, color: "#8D6E63" },
    { symbol: "USDC", percentage: 30, color: "#1b1b1b" },
    { symbol: "JUP", percentage: 20, color: "#ffdbd0" }
  ],
  securityReport: "Orchestrated pool allocations with automated risk-level rebalancing. Protected against flashloan price manipulation.",
  activeAgents: ["Yield Hunter", "Risk Guardian", "Meta Engine"],
  summaryPoints: [
    "Optimized fee extraction on SOL-USDC liquidity pools",
    "Active contract monitoring to mitigate protocol hack risks",
    "Multi-chain rebalancing schedule aligned on high APY yield indices"
  ]
};

export const INITIAL_WALLET: { address: string; balances: { [symbol: string]: number } } = {
  address: "AeTh...8xQ9",
  balances: {
    SOL: 24.5,
    USDC: 1500.0,
    BONK: 15000000.0,
    JUP: 650.0,
    USDT: 450.0
  }
};
