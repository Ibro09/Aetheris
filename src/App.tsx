import { useEffect, useState, type FormEvent } from "react";
import { LogIn, LogOut, Menu, X } from "lucide-react";
import { Strategy } from "./types";
import { DEFAULT_ACTIVE_STRATEGY } from "./data";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import AiBuilder from "./components/AiBuilder";
import TokenAgents from "./components/TokenAgents";
import YieldVaults from "./components/YieldVaults";

type SolanaWallet = {
  isConnected?: boolean;
  publicKey?: {
    toBase58: () => string;
  };
  connect: () => Promise<{ publicKey?: { toBase58: () => string } }>;
  disconnect?: () => Promise<void>;
  signMessage?: (
    message: Uint8Array,
    display?: string,
  ) => Promise<{ signature: Uint8Array }>;
  signTransaction?: <T>(transaction: T) => Promise<T>;
  signAllTransactions?: <T>(transactions: T[]) => Promise<T[]>;
  request?: (args: {
    method: string;
  }) => Promise<{ publicKey?: { toBase58: () => string } }>;
  on?: (event: string, callback: () => void) => void;
};

declare global {
  interface Window {
    solana?: SolanaWallet;
    phantom?: {
      solana?: SolanaWallet;
    };
  }
}

type AppView =
  | "landing"
  | "dashboard"
  | "yield-vaults"
  | "ai-builder"
  | "referrals"
  | "token-agents";

const REFERRAL_PENDING_KEY = "aetheris-pending-referral";
const AUTH_SESSION_EMAIL_KEY = "aetheris-auth-session-email";

type AuthMode = "login" | "signup";

type UserAccount = {
  id: string;
  name: string;
  email: string;
  address: string;
  balances: Record<string, number>;
  referralEarningsUSD: number;
  referrer?: string;
  referralCount: number;
  referredWallets: string[];
};

type AuthForm = {
  name: string;
  email: string;
  password: string;
};

const setSessionEmail = (email: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_SESSION_EMAIL_KEY, email);
};

const getSessionEmail = () => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(AUTH_SESSION_EMAIL_KEY) || "";
};

const clearSessionEmail = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_SESSION_EMAIL_KEY);
};

const fetchWalletStatus = async (email: string) => {
  const response = await fetch(
    `/api/wallet/status?email=${encodeURIComponent(email)}`,
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error || "Could not fetch wallet status.");
    (error as any).shouldClearSession =
      response.status === 401 || response.status === 404;
    throw error;
  }

  if (!data?.success) {
    const error = new Error(data?.error || "Wallet status error.");
    (error as any).shouldClearSession =
      response.status === 401 || response.status === 404;
    throw error;
  }

  return data.wallet as UserAccount;
};

export default function App() {
  const [activeView, setActiveView] = useState<AppView>("landing");
  const [activeStrategy, setActiveStrategy] = useState<Strategy>(
    DEFAULT_ACTIVE_STRATEGY,
  );
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authForm, setAuthForm] = useState<AuthForm>({
    name: "",
    email: "",
    password: "",
  });
  const [authError, setAuthError] = useState("");
  const [pendingReferral, setPendingReferral] = useState("");
  const [referralNotice, setReferralNotice] = useState("");

  useEffect(() => {
    const savedPending =
      window.localStorage.getItem(REFERRAL_PENDING_KEY)?.trim() || "";
    const urlReferral =
      new URLSearchParams(window.location.search).get("ref")?.trim() || "";
    const nextPending = urlReferral || savedPending;

    if (nextPending) {
      window.localStorage.setItem(REFERRAL_PENDING_KEY, nextPending);
      setPendingReferral(nextPending);
      setReferralNotice("Referral saved. Sign up to apply it.");
    }

    const sessionEmail = getSessionEmail();
    if (sessionEmail) {
      fetchWalletStatus(sessionEmail)
        .then((wallet) => {
          setCurrentUser(wallet);
          setWalletAddress(wallet.address);
          setWalletConnected(true);
        })
        .catch((error: any) => {
          if (error?.shouldClearSession) {
            clearSessionEmail();
          }
        });
    }
  }, []);

  useEffect(() => {
    if (!currentUser?.email) return;

    const interval = window.setInterval(() => {
      fetchWalletStatus(currentUser.email)
        .then((wallet) => {
          setCurrentUser(wallet);
          setWalletAddress(wallet.address);
          setWalletConnected(true);
        })
        .catch(() => {
          // Ignore refresh failures.
        });
    }, 60000);

    return () => clearInterval(interval);
  }, [currentUser?.email]);

  const handleHomeNavigation = () => {
    setActiveView(walletConnected ? "dashboard" : "landing");
  };

  const persistSession = (email: string) => {
    setSessionEmail(email);
  };

  const clearSession = () => {
    clearSessionEmail();
    setCurrentUser(null);
    setWalletAddress(null);
    setWalletConnected(false);
  };

  const handleVaultBalanceChange = (nextBalance: number) => {
    setCurrentUser((currentUser) => {
      if (!currentUser) return currentUser;

      return {
        ...currentUser,
        balances: {
          ...currentUser.balances,
          SOL: Number(nextBalance.toFixed(9)),
        },
      };
    });
  };

  const connectWallet = async () => {
    if (walletConnected) {
      setActiveView("dashboard");
      return;
    }

    setAuthMode("login");
    setAuthError("");
    setAuthOpen(true);
  };

  const openSignup = () => {
    setAuthMode("signup");
    setAuthError("");
    setAuthOpen(true);
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");

    const email = authForm.email.trim().toLowerCase();
    const name = authForm.name.trim();
    const password = authForm.password;

    if (!email || !password || (authMode === "signup" && !name)) {
      setAuthError("Fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }

    try {
      const endpoint =
        authMode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body =
        authMode === "login"
          ? { email, password }
          : { name, email, password, referral: pendingReferral || undefined };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        setAuthError(data?.error || "Authentication failed.");
        return;
      }

      const wallet = data.account;
      setCurrentUser(wallet);
      setWalletAddress(wallet.address);
      setWalletConnected(true);
      persistSession(email);
      setAuthOpen(false);
      setAuthForm({ name: "", email: "", password: "" });
      setActiveView("dashboard");
      setReferralNotice("Logged in successfully.");
      setPendingReferral("");
      if (pendingReferral) {
        window.localStorage.removeItem(REFERRAL_PENDING_KEY);
      }
    } catch (error: any) {
      setAuthError(error?.message || "Could not complete authentication.");
    }
  };

  const disconnectWallet = async () => {
    clearSession();
    setActiveView("landing");
  };

  const referralLink =
    walletAddress && typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(walletAddress)}`
      : "";
  const currentReferrer = currentUser?.referrer ?? "";
  const referredWallets = currentUser?.referredWallets ?? [];

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-sans selection:bg-secondary-fixed selection:text-on-secondary-fixed-variant">
      {/* GLOBAL HEADER NAVIGATION */}
      <nav
        id="global-navbar"
        className="bg-surface/80 backdrop-blur-xl border-b border-black/5 fixed top-0 w-full z-50 transition-all duration-300"
      >
        <div className="flex justify-between items-center w-full px-6 lg:px-12 py-4 max-w-7xl mx-auto">
          {/* Logo / Brand */}
          <div
            id="brand-logo"
            onClick={() => setActiveView("landing")}
            className="font-display text-2xl font-black tracking-tighter text-primary cursor-pointer select-none hover:opacity-85 transition-opacity"
          >
            Aetheris
          </div>

          {/* Navigation Links (Public Anchor Links / View Switching) */}
          <div id="nav-links" className="hidden md:flex gap-8 items-center">
            <button
              onClick={handleHomeNavigation}
              className={`font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                activeView === "landing" ||
                (walletConnected && activeView === "dashboard")
                  ? "text-secondary border-b-2 border-secondary pb-1"
                  : "text-on-surface-variant/70 hover:text-primary"
              }`}
            >
              {walletConnected ? "Dashboard" : "Home"}
            </button>
            <button
              onClick={() => setActiveView("yield-vaults")}
              className={`font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                activeView === "yield-vaults"
                  ? "text-secondary border-b-2 border-secondary pb-1"
                  : "text-on-surface-variant/70 hover:text-primary"
              }`}
            >
              Yield Vaults
            </button>
            <button
              onClick={() => setActiveView("ai-builder")}
              className={`font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                activeView === "ai-builder"
                  ? "text-secondary border-b-2 border-secondary pb-1"
                  : "text-on-surface-variant/70 hover:text-primary"
              }`}
            >
              AI Builder
            </button>
            <button
              onClick={() => setActiveView("referrals")}
              className={`font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                activeView === "referrals"
                  ? "text-secondary border-b-2 border-secondary pb-1"
                  : "text-on-surface-variant/70 hover:text-primary"
              }`}
            >
              Referrals
            </button>
            <button
              onClick={() => setActiveView("token-agents")}
              className={`font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                activeView === "token-agents"
                  ? "text-secondary border-b-2 border-secondary pb-1"
                  : "text-on-surface-variant/70 hover:text-primary"
              }`}
            >
              Token Agents
            </button>
          </div>

          {/* CTA Action Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((s) => !s)}
              className="md:hidden rounded-md p-2 text-primary hover:bg-surface-container-low"
              aria-label="Open mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <button
              id="nav-btn-action"
              onClick={connectWallet}
              className="bg-primary text-white font-mono text-xs font-bold px-6 py-2.5 hover:scale-95 transition-all duration-200 uppercase tracking-widest rounded-xs"
            >
              {walletConnected
                ? walletAddress
                  ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
                  : "Connected"
                : "Login / Sign Up"}
            </button>
            {walletConnected ? (
              <button
                type="button"
                onClick={disconnectWallet}
                className="rounded-full border border-outline-variant/40 p-2 text-primary transition-all hover:bg-surface-container-low"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </nav>

      {/* Mobile drawer menu (small screens) */}
      <div className={`md:hidden ${mobileMenuOpen ? "block" : "hidden"}`}>
        <div className="bg-surface/95 backdrop-blur border-b border-black/5 fixed top-16 left-0 right-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3">
            <button
              onClick={() => {
                setActiveView(walletConnected ? "dashboard" : "landing");
                setMobileMenuOpen(false);
              }}
              className="text-left text-sm font-bold text-primary py-2"
            >
              {walletConnected ? "Dashboard" : "Home"}
            </button>
            <button
              onClick={() => {
                setActiveView("yield-vaults");
                setMobileMenuOpen(false);
              }}
              className="text-left text-sm font-bold text-primary py-2"
            >
              Yield Vaults
            </button>
            <button
              onClick={() => {
                setActiveView("ai-builder");
                setMobileMenuOpen(false);
              }}
              className="text-left text-sm font-bold text-primary py-2"
            >
              AI Builder
            </button>
            <button
              onClick={() => {
                setActiveView("referrals");
                setMobileMenuOpen(false);
              }}
              className="text-left text-sm font-bold text-primary py-2"
            >
              Referrals
            </button>
            <button
              onClick={() => {
                setActiveView("token-agents");
                setMobileMenuOpen(false);
              }}
              className="text-left text-sm font-bold text-primary py-2"
            >
              Token Agents
            </button>
          </div>
        </div>
      </div>

      {/* CORE VIEW ROUTER */}
      <main id="main-content-wrapper" className="flex-grow">
        {activeView === "landing" ? (
          <LandingPage
            onLaunchDashboard={connectWallet}
            onActivateStrategy={setActiveStrategy}
            activeStrategy={activeStrategy}
          />
        ) : activeView === "dashboard" ? (
          <Dashboard
            user={currentUser}
            activeStrategy={activeStrategy}
            onActivateStrategy={setActiveStrategy}
            onReturnToLander={() => setActiveView("landing")}
            onWalletUpdated={(wallet: any) => {
              setCurrentUser(wallet);
              setWalletAddress(wallet.address);
              setWalletConnected(true);
            }}
          />
        ) : activeView === "yield-vaults" ? (
          <YieldVaults
            walletAddress={walletAddress}
            walletConnected={walletConnected}
            initialBalance={currentUser?.balances?.SOL ?? 0}
            onBalanceChange={handleVaultBalanceChange}
            onConnectWallet={connectWallet}
          />
        ) : activeView === "referrals" ? (
          <section className="min-h-screen px-6 lg:px-12 pt-28 pb-16">
            <div className="mx-auto max-w-5xl">
              <div className="mb-8">
                <p className="mb-3 text-xs font-mono font-bold uppercase tracking-[0.3em] text-secondary">
                  Referral Network
                </p>
                <h1 className="font-display text-4xl font-black tracking-tight text-primary">
                  Referrals
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-on-surface-variant">
                  A referral is applied only when a new user signs up and their
                  wallet is generated. Existing accounts and already-referred
                  wallets cannot change referrers.
                </p>
              </div>

              <div className="grid gap-6">
                <section className="rounded-2xl border border-outline-variant/40 bg-surface/90 p-6 shadow-lg">
                  <h2 className="text-2xl font-black tracking-tight text-primary">
                    Your Referral Link
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                    {walletConnected
                      ? "Share this link before a new user signs up."
                      : "Log in or sign up to generate your referral link."}
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <input
                      value={referralLink || "Login to generate link"}
                      readOnly
                      className="min-h-[44px] flex-1 rounded-xl border border-outline-variant/40 bg-background px-4 text-sm text-on-background outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!referralLink) return;
                        navigator.clipboard?.writeText(referralLink);
                        setReferralNotice("Referral link copied.");
                      }}
                      disabled={!referralLink}
                      className="rounded-xl bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.25em] text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Copy
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-outline-variant/30 bg-background p-4">
                      <div className="text-xs font-mono uppercase tracking-[0.25em] text-on-surface-variant">
                        Wallet
                      </div>
                      <div className="mt-2 truncate text-sm font-bold text-primary">
                        {walletAddress ?? "Not logged in"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-outline-variant/30 bg-background p-4">
                      <div className="text-xs font-mono uppercase tracking-[0.25em] text-on-surface-variant">
                        Referred By
                      </div>
                      <div className="mt-2 truncate text-sm font-bold text-primary">
                        {currentReferrer || "None"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-outline-variant/30 bg-background p-4">
                      <div className="text-xs font-mono uppercase tracking-[0.25em] text-on-surface-variant">
                        Referrals
                      </div>
                      <div className="mt-2 text-sm font-bold text-primary">
                        {referredWallets.length}
                      </div>
                    </div>
                  </div>

                  {pendingReferral ? (
                    <p className="mt-5 rounded-xl border border-secondary/20 bg-secondary/5 p-4 text-xs leading-5 text-on-surface-variant">
                      Referral from link pending: {pendingReferral}
                    </p>
                  ) : null}
                  {referralNotice ? (
                    <p className="mt-3 rounded-xl border border-outline-variant/30 bg-background p-4 text-xs leading-5 text-on-surface-variant">
                      {referralNotice}
                    </p>
                  ) : null}
                </section>
              </div>
            </div>
          </section>
        ) : activeView === "ai-builder" ? (
          <AiBuilder
            chatIdentity={walletAddress ?? "guest"}
            isWalletConnected={walletConnected}
            onConnectWallet={connectWallet}
          />
        ) : activeView === "token-agents" ? (
          <TokenAgents
            walletAddress={walletAddress}
            walletConnected={walletConnected}
            onConnectWallet={connectWallet}
          />
        ) : (
          <section className="min-h-screen flex items-center justify-center px-6 lg:px-12 pt-24">
            <div className="max-w-3xl w-full rounded-2xl border border-outline-variant/30 bg-surface/80 p-10 shadow-2xl backdrop-blur">
              <p className="mb-4 text-xs font-mono font-bold uppercase tracking-[0.3em] text-secondary">
                {activeView === "yield-vaults"
                  ? "Yield Optimizer"
                  : "Token Agents"}
              </p>
              <h1 className="mb-4 font-display text-4xl font-black tracking-tight text-primary">
                {activeView === "yield-vaults"
                  ? "Yield Vaults"
                  : "Token Agents"}
              </h1>
              <p className="mb-8 text-base leading-relaxed text-on-surface-variant">
                {activeView === "yield-vaults"
                  ? "Explore curated vault strategies, rebalancing automation, and real-time yield opportunities tailored to your generated wallet."
                  : "Deploy autonomous token agents that track opportunities, rebalance portfolios, and react to market signals in real time."}
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={connectWallet}
                  className="rounded-sm bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white transition-all hover:bg-secondary"
                >
                  {walletConnected ? "Open Dashboard" : "Login / Sign Up"}
                </button>
                <button
                  onClick={() => setActiveView("landing")}
                  className="rounded-sm border border-outline-variant px-6 py-3 text-sm font-semibold uppercase tracking-widest text-primary transition-all hover:bg-surface-container-low"
                >
                  Back Home
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {authOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-outline-variant/40 bg-surface p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-mono font-bold uppercase tracking-[0.3em] text-secondary">
                  {authMode === "login" ? "Welcome Back" : "Create Account"}
                </p>
                <h2 className="font-display text-3xl font-black tracking-tight text-primary">
                  {authMode === "login" ? "Login" : "Sign Up"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {authMode === "login"
                    ? "Use your email and password to open your Aetheris account."
                    : "Add your name, email, and password. A wallet is generated when signup completes."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuthOpen(false)}
                className="rounded-full border border-outline-variant/40 px-3 py-1 text-sm font-bold text-primary transition hover:bg-surface-container-low"
                aria-label="Close auth dialog"
              >
                X
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-lg border border-outline-variant/40 bg-background p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
                className={`rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition ${
                  authMode === "login"
                    ? "bg-primary text-white"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={openSignup}
                className={`rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition ${
                  authMode === "signup"
                    ? "bg-primary text-white"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                Sign Up
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleAuthSubmit}>
              {authMode === "signup" ? (
                <label className="block">
                  <span className="mb-2 block text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                    Name
                  </span>
                  <input
                    value={authForm.name}
                    onChange={(event) =>
                      setAuthForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="min-h-[44px] w-full rounded-lg border border-outline-variant/40 bg-background px-4 text-sm text-on-background outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                    autoComplete="name"
                  />
                </label>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                  Email
                </span>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="min-h-[44px] w-full rounded-lg border border-outline-variant/40 bg-background px-4 text-sm text-on-background outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  autoComplete="email"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                  Password
                </span>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  className="min-h-[44px] w-full rounded-lg border border-outline-variant/40 bg-background px-4 text-sm text-on-background outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  autoComplete={
                    authMode === "login" ? "current-password" : "new-password"
                  }
                />
              </label>

              {pendingReferral && authMode === "signup" ? (
                <p className="rounded-lg border border-secondary/20 bg-secondary/5 p-3 text-xs leading-5 text-on-surface-variant">
                  Referral ready for signup: {pendingReferral}
                </p>
              ) : null}

              {authError ? (
                <p className="rounded-lg border border-error/30 bg-error-container/40 p-3 text-xs leading-5 text-on-surface-variant">
                  {authError}
                </p>
              ) : null}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.24em] text-white transition hover:bg-secondary"
              >
                <LogIn className="h-4 w-4" />
                {authMode === "login" ? "Login" : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* GLOBAL COMPLIANCE FOOTER */}
      <footer
        id="global-footer"
        className="bg-surface py-16 border-t border-black/5"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-6 space-y-4">
            <div className="font-display text-2xl font-black text-primary tracking-tighter">
              Aetheris
            </div>
            <p className="text-xs text-on-surface-variant/80 max-w-sm leading-relaxed font-light">
              The world's most advanced AI-orchestrated DeFi portfolio manager.
              Seamless capital allocation, sub-atomic compound frequencies, and
              mathematically validated security shields.
            </p>
            <div className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase pt-4">
              © 2026 Aetheris Quantum DeFi. All rights reserved.
            </div>
          </div>

          <div className="md:col-span-6 grid grid-cols-2 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h6 className="font-bold text-xs text-primary font-mono uppercase tracking-widest">
                Protocol
              </h6>
              <a
                href="#"
                className="block text-[10px] text-on-surface-variant/70 hover:text-secondary transition-colors font-mono uppercase tracking-wider"
              >
                Security Audit
              </a>
              <a
                href="#"
                className="block text-[10px] text-on-surface-variant/70 hover:text-secondary transition-colors font-mono uppercase tracking-wider"
              >
                Privacy Terms
              </a>
            </div>
            <div className="space-y-4">
              <h6 className="font-bold text-xs text-primary font-mono uppercase tracking-widest">
                Community
              </h6>
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className="block text-[10px] text-on-surface-variant/70 hover:text-secondary transition-colors font-mono uppercase tracking-wider"
              >
                Twitter
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="block text-[10px] text-on-surface-variant/70 hover:text-secondary transition-colors font-mono uppercase tracking-wider"
              >
                Github
              </a>
            </div>
            <div className="space-y-4">
              <h6 className="font-bold text-xs text-primary font-mono uppercase tracking-widest">
                Support
              </h6>
              <a
                href="#"
                className="block text-[10px] text-on-surface-variant/70 hover:text-secondary transition-colors font-mono uppercase tracking-wider"
              >
                Terms of Use
              </a>
              <a
                href="#"
                className="block text-[10px] text-on-surface-variant/70 hover:text-secondary transition-colors font-mono uppercase tracking-wider"
              >
                Docs Index
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
