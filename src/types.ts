export interface TokenAllocation {
  symbol: string;
  percentage: number;
  color: string;
}

export interface Strategy {
  strategyName: string;
  riskScore: "LOW" | "MEDIUM" | "HIGH";
  riskValue: number; // 0 to 100
  projectedApy: number;
  rebalanceInterval: string;
  estimatedGasFee: string;
  allocations: TokenAllocation[];
  securityReport: string;
  activeAgents: string[];
  summaryPoints: string[];
  warning?: string;
}

export interface UserWallet {
  connected: boolean;
  address: string;
  balances: { [symbol: string]: number };
}

export interface Agent {
  name: string;
  icon: string;
  description: string;
  status: "idle" | "scanning" | "optimizing" | "active";
  performance: string;
}

export interface MarketOpportunity {
  protocol: string;
  apy: number;
  trend: "up" | "down" | "stable";
  liquidity: string;
  assetPair: string;
  logoColor: string;
}

export interface RebalanceLog {
  time: string;
  type: string;
  details: string;
  status: "success" | "pending";
}
