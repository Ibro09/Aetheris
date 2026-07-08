import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BadgePlus,
  Coins,
  Flame,
  Rocket,
  Save,
  Send,
} from "lucide-react";
import {
  createUmi,
  generateSigner,
  percentAmount,
  publicKey,
  signerIdentity,
  transactionBuilder,
  type Signer,
  type Transaction,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { dataViewSerializer } from "@metaplex-foundation/umi-serializer-data-view";
import { defaultProgramRepository } from "@metaplex-foundation/umi-program-repository";
import { web3JsEddsa } from "@metaplex-foundation/umi-eddsa-web3js";
import { web3JsRpc } from "@metaplex-foundation/umi-rpc-web3js";
import { chunkGetAccountsRpc } from "@metaplex-foundation/umi-rpc-chunk-get-accounts";
import { web3JsTransactionFactory } from "@metaplex-foundation/umi-transaction-factory-web3js";
import {
  createFungible,
  mplTokenMetadata,
  updateV1,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  burnToken,
  createTokenIfMissing,
  findAssociatedTokenPda,
  mintTokensTo,
  mplToolbox,
  transferTokens,
} from "@metaplex-foundation/mpl-toolbox";
import {
  fromWeb3JsTransaction,
  toWeb3JsTransaction,
} from "@metaplex-foundation/umi-web3js-adapters";

type TokenAgentsProps = {
  walletAddress: string | null;
  walletConnected: boolean;
  onConnectWallet: () => Promise<void>;
};

type TokenAction =
  | "launch"
  | "create"
  | "mint"
  | "transfer"
  | "update"
  | "burn";

type WalletTransaction = ReturnType<typeof toWeb3JsTransaction>;

const DEFAULT_RPC = "https://api.devnet.solana.com";

const actionCards: Array<{
  id: TokenAction;
  title: string;
  description: string;
  icon: typeof Rocket;
}> = [
  {
    id: "launch",
    title: "Launch Token",
    description: "Plan a Genesis fair launch for a fungible Solana token.",
    icon: Rocket,
  },
  {
    id: "create",
    title: "Create A Token",
    description: "Create a fungible SPL token with Metaplex metadata.",
    icon: BadgePlus,
  },
  {
    id: "mint",
    title: "Mint Tokens",
    description: "Mint fungible supply to a wallet address.",
    icon: Coins,
  },
  {
    id: "transfer",
    title: "Transfer Tokens",
    description: "Transfer tokens between wallet addresses.",
    icon: ArrowRightLeft,
  },
  {
    id: "update",
    title: "Update A Token",
    description: "Update token name, symbol, or metadata URI.",
    icon: Save,
  },
  {
    id: "burn",
    title: "Burn Tokens",
    description: "Burn fungible tokens from circulation.",
    icon: Flame,
  },
];

const toBaseUnits = (value: string, decimals: number) => {
  const trimmed = value.trim();
  if (!trimmed || Number.isNaN(decimals) || decimals < 0) {
    throw new Error("Enter a valid amount and decimals.");
  }

  const [wholePart, fractionalPart = ""] = trimmed.split(".");
  if (!/^\d+$/.test(wholePart) || !/^\d*$/.test(fractionalPart)) {
    throw new Error("Amounts must be plain decimal numbers.");
  }
  if (fractionalPart.length > decimals) {
    throw new Error(`Amount has more than ${decimals} decimal places.`);
  }

  const paddedFraction = fractionalPart.padEnd(decimals, "0");
  return BigInt(`${wholePart}${paddedFraction}` || "0");
};

const shortAddress = (address: string) =>
  `${address.slice(0, 4)}...${address.slice(-4)}`;

const signatureToBase58 = (signature: Uint8Array) =>
  base58.deserialize(signature)[0];

const makeWalletSigner = (wallet: Window["solana"]): Signer => {
  if (!wallet?.publicKey) {
    throw new Error(
      "Login creates your Aetheris wallet, but token actions still need a browser Solana signer.",
    );
  }

  return {
    publicKey: publicKey(wallet.publicKey.toBase58()),
    signMessage: async (message: Uint8Array) => {
      if (!wallet.signMessage) {
        throw new Error("This wallet does not support message signing.");
      }

      const signed = await wallet.signMessage(message, "utf8");
      return signed.signature;
    },
    signTransaction: async (transaction: Transaction) => {
      if (!wallet.signTransaction) {
        throw new Error("This wallet does not support transaction signing.");
      }

      const signed = await wallet.signTransaction(
        toWeb3JsTransaction(transaction),
      );
      return fromWeb3JsTransaction(signed);
    },
    signAllTransactions: async (transactions: Transaction[]) => {
      if (!wallet.signAllTransactions) {
        const signed = await Promise.all(
          transactions.map((transaction) =>
            wallet.signTransaction?.(toWeb3JsTransaction(transaction)),
          ),
        );
        return signed.map((transaction) => {
          if (!transaction) {
            throw new Error("Wallet could not sign every transaction.");
          }
          return fromWeb3JsTransaction(transaction);
        });
      }

      const signed = await wallet.signAllTransactions(
        transactions.map((transaction) => toWeb3JsTransaction(transaction)),
      );
      return signed.map((transaction: WalletTransaction) =>
        fromWeb3JsTransaction(transaction),
      );
    },
  };
};

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <label className="block">
    <span className="mb-2 block text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-on-surface-variant">
      {label}
    </span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-h-[44px] w-full rounded-lg border border-outline-variant/40 bg-background px-4 text-sm text-on-background outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
    />
  </label>
);

export default function TokenAgents({
  walletAddress,
  walletConnected,
  onConnectWallet,
}: TokenAgentsProps) {
  const [activeAction, setActiveAction] = useState<TokenAction>("create");
  const [rpcEndpoint, setRpcEndpoint] = useState(DEFAULT_RPC);
  const [busyAction, setBusyAction] = useState<TokenAction | null>(null);
  const [notice, setNotice] = useState("");
  const [lastMint, setLastMint] = useState("");
  const [lastSignature, setLastSignature] = useState("");

  const [createForm, setCreateForm] = useState({
    name: "",
    symbol: "",
    uri: "",
    decimals: "9",
  });
  const [mintForm, setMintForm] = useState({
    mint: "",
    recipient: "",
    amount: "",
    decimals: "9",
  });
  const [transferForm, setTransferForm] = useState({
    mint: "",
    recipient: "",
    amount: "",
    decimals: "9",
  });
  const [updateForm, setUpdateForm] = useState({
    mint: "",
    name: "",
    symbol: "",
    uri: "",
  });
  const [burnForm, setBurnForm] = useState({
    mint: "",
    amount: "",
    decimals: "9",
  });
  const [launchForm, setLaunchForm] = useState({
    name: "",
    symbol: "",
    supply: "",
    price: "",
    startsAt: "",
  });

  const activeCard = useMemo(
    () => actionCards.find((card) => card.id === activeAction) ?? actionCards[0],
    [activeAction],
  );

  const updateCreate = (key: keyof typeof createForm, value: string) =>
    setCreateForm((current) => ({ ...current, [key]: value }));
  const updateMint = (key: keyof typeof mintForm, value: string) =>
    setMintForm((current) => ({ ...current, [key]: value }));
  const updateTransfer = (key: keyof typeof transferForm, value: string) =>
    setTransferForm((current) => ({ ...current, [key]: value }));
  const updateUpdate = (key: keyof typeof updateForm, value: string) =>
    setUpdateForm((current) => ({ ...current, [key]: value }));
  const updateBurn = (key: keyof typeof burnForm, value: string) =>
    setBurnForm((current) => ({ ...current, [key]: value }));
  const updateLaunch = (key: keyof typeof launchForm, value: string) =>
    setLaunchForm((current) => ({ ...current, [key]: value }));

  const getUmi = async () => {
    if (!walletConnected) {
      await onConnectWallet();
    }

    const wallet = window.solana ?? window.phantom?.solana;
    const signer = makeWalletSigner(wallet);
    return createUmi()
      .use(dataViewSerializer())
      .use(defaultProgramRepository())
      .use(web3JsEddsa())
      .use(web3JsRpc(rpcEndpoint))
      .use(chunkGetAccountsRpc())
      .use(web3JsTransactionFactory())
      .use(mplTokenMetadata())
      .use(mplToolbox())
      .use(signerIdentity(signer));
  };

  const runAction = async (action: TokenAction, work: () => Promise<void>) => {
    setBusyAction(action);
    setNotice("");

    try {
      await work();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Token action failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateToken = () =>
    runAction("create", async () => {
      const umi = await getUmi();
      const mint = generateSigner(umi);
      const decimals = Number(createForm.decimals);

      const { signature } = await createFungible(umi, {
        mint,
        name: createForm.name.trim(),
        symbol: createForm.symbol.trim(),
        uri: createForm.uri.trim(),
        sellerFeeBasisPoints: percentAmount(0),
        decimals,
        isMutable: true,
      }).sendAndConfirm(umi);

      setLastMint(mint.publicKey);
      setLastSignature(signatureToBase58(signature));
      setNotice("Token created. Use the mint address below for minting, transfers, updates, and burns.");
    });

  const handleMintTokens = () =>
    runAction("mint", async () => {
      const umi = await getUmi();
      const mint = publicKey(mintForm.mint.trim());
      const owner = publicKey((mintForm.recipient || walletAddress || "").trim());
      const token = findAssociatedTokenPda(umi, { mint, owner });
      const amount = toBaseUnits(mintForm.amount, Number(mintForm.decimals));

      const { signature } = await transactionBuilder()
        .add(createTokenIfMissing(umi, { mint, owner, token, ata: token }))
        .add(mintTokensTo(umi, { mint, token, amount }))
        .sendAndConfirm(umi);

      setLastSignature(signatureToBase58(signature));
      setNotice(`Minted ${mintForm.amount} tokens to ${owner}.`);
    });

  const handleTransferTokens = () =>
    runAction("transfer", async () => {
      if (!walletAddress) throw new Error("Connect your wallet first.");

      const umi = await getUmi();
      const mint = publicKey(transferForm.mint.trim());
      const owner = publicKey(walletAddress);
      const recipient = publicKey(transferForm.recipient.trim());
      const source = findAssociatedTokenPda(umi, { mint, owner });
      const destination = findAssociatedTokenPda(umi, { mint, owner: recipient });
      const amount = toBaseUnits(
        transferForm.amount,
        Number(transferForm.decimals),
      );

      const { signature } = await transactionBuilder()
        .add(
          createTokenIfMissing(umi, {
            mint,
            owner: recipient,
            token: destination,
            ata: destination,
          }),
        )
        .add(transferTokens(umi, { source, destination, amount }))
        .sendAndConfirm(umi);

      setLastSignature(signatureToBase58(signature));
      setNotice(`Transferred ${transferForm.amount} tokens to ${recipient}.`);
    });

  const handleUpdateToken = () =>
    runAction("update", async () => {
      const umi = await getUmi();
      const mint = publicKey(updateForm.mint.trim());

      const { signature } = await updateV1(umi, {
        mint,
        data: {
          name: updateForm.name.trim(),
          symbol: updateForm.symbol.trim(),
          uri: updateForm.uri.trim(),
          sellerFeeBasisPoints: 0,
          creators: null,
        },
      }).sendAndConfirm(umi);

      setLastSignature(signatureToBase58(signature));
      setNotice("Token metadata updated.");
    });

  const handleBurnTokens = () =>
    runAction("burn", async () => {
      if (!walletAddress) throw new Error("Connect your wallet first.");

      const umi = await getUmi();
      const mint = publicKey(burnForm.mint.trim());
      const owner = publicKey(walletAddress);
      const account = findAssociatedTokenPda(umi, { mint, owner });
      const amount = toBaseUnits(burnForm.amount, Number(burnForm.decimals));

      const { signature } = await burnToken(umi, {
        account,
        mint,
        amount,
      }).sendAndConfirm(umi);

      setLastSignature(signatureToBase58(signature));
      setNotice(`Burned ${burnForm.amount} tokens from your wallet.`);
    });

  const handleLaunchPlan = () =>
    runAction("launch", async () => {
      const config = {
        token: launchForm.name.trim(),
        symbol: launchForm.symbol.trim(),
        supply: launchForm.supply.trim(),
        price: launchForm.price.trim(),
        startsAt: launchForm.startsAt.trim(),
        launchMode: "Metaplex Genesis fair-launch checklist",
        steps: [
          "Create fungible token metadata",
          "Mint supply to sale treasury",
          "Configure sale wallet and distribution rules",
          "Open claims after sale finalization",
        ],
      };

      setNotice(JSON.stringify(config, null, 2));
    });

  const busy = busyAction === activeAction;

  return (
    <section className="min-h-screen px-6 pt-28 pb-16 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-xs font-mono font-bold uppercase tracking-[0.3em] text-secondary">
              Solana Tokens
            </p>
            <h1 className="font-display text-4xl font-black tracking-tight text-primary">
              Token Agents
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-on-surface-variant">
              Create, launch, and manage fungible tokens on Solana with
              Metaplex Token Metadata, Umi, and SPL token helpers.
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant/40 bg-surface/90 p-4">
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-on-surface-variant">
              Wallet
            </div>
            <div className="mt-2 text-sm font-bold text-primary">
              {walletAddress ? shortAddress(walletAddress) : "Not logged in"}
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {actionCards.map((card) => {
            const Icon = card.icon;
            const active = activeAction === card.id;

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveAction(card.id)}
                className={`min-h-[136px] rounded-lg border p-5 text-left transition ${
                  active
                    ? "border-secondary bg-secondary/10 shadow-lg"
                    : "border-outline-variant/40 bg-surface/90 hover:border-secondary/60"
                }`}
              >
                <Icon className="mb-4 h-5 w-5 text-secondary" />
                <h2 className="text-sm font-black text-primary">
                  {card.title}
                </h2>
                <p className="mt-3 text-xs leading-5 text-on-surface-variant">
                  {card.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="rounded-lg border border-outline-variant/40 bg-surface/90 p-6">
            <h2 className="text-xl font-black text-primary">
              {activeCard.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              {activeCard.description}
            </p>

            <div className="mt-6 space-y-4">
              <Field
                label="RPC Endpoint"
                value={rpcEndpoint}
                onChange={setRpcEndpoint}
              />
              <button
                type="button"
                onClick={onConnectWallet}
                className="w-full rounded-lg border border-outline-variant px-5 py-3 text-xs font-bold uppercase tracking-[0.24em] text-primary transition hover:bg-surface-container-low"
              >
                {walletConnected ? "Account Ready" : "Login / Sign Up"}
              </button>
            </div>

            {lastMint ? (
              <div className="mt-6 rounded-lg border border-outline-variant/30 bg-background p-4">
                <div className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                  Last Mint
                </div>
                <div className="mt-2 break-all text-xs font-bold text-primary">
                  {lastMint}
                </div>
              </div>
            ) : null}

            {lastSignature ? (
              <div className="mt-4 rounded-lg border border-outline-variant/30 bg-background p-4">
                <div className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                  Last Signature
                </div>
                <a
                  href={`https://explorer.solana.com/tx/${lastSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block break-all text-xs font-bold text-secondary"
                >
                  {lastSignature}
                </a>
              </div>
            ) : null}
          </aside>

          <div className="rounded-lg border border-outline-variant/40 bg-surface/90 p-6">
            {activeAction === "launch" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Token Name" value={launchForm.name} onChange={(value) => updateLaunch("name", value)} />
                <Field label="Symbol" value={launchForm.symbol} onChange={(value) => updateLaunch("symbol", value)} />
                <Field label="Sale Supply" value={launchForm.supply} onChange={(value) => updateLaunch("supply", value)} placeholder="1000000" />
                <Field label="Price" value={launchForm.price} onChange={(value) => updateLaunch("price", value)} placeholder="0.05 SOL" />
                <Field label="Starts At" value={launchForm.startsAt} onChange={(value) => updateLaunch("startsAt", value)} type="datetime-local" />
              </div>
            ) : null}

            {activeAction === "create" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Token Name" value={createForm.name} onChange={(value) => updateCreate("name", value)} />
                <Field label="Symbol" value={createForm.symbol} onChange={(value) => updateCreate("symbol", value)} />
                <Field label="Metadata URI" value={createForm.uri} onChange={(value) => updateCreate("uri", value)} placeholder="https://..." />
                <Field label="Decimals" value={createForm.decimals} onChange={(value) => updateCreate("decimals", value)} type="number" />
              </div>
            ) : null}

            {activeAction === "mint" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Mint Address" value={mintForm.mint} onChange={(value) => updateMint("mint", value)} />
                <Field label="Recipient Wallet" value={mintForm.recipient} onChange={(value) => updateMint("recipient", value)} placeholder={walletAddress ?? ""} />
                <Field label="Amount" value={mintForm.amount} onChange={(value) => updateMint("amount", value)} />
                <Field label="Decimals" value={mintForm.decimals} onChange={(value) => updateMint("decimals", value)} type="number" />
              </div>
            ) : null}

            {activeAction === "transfer" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Mint Address" value={transferForm.mint} onChange={(value) => updateTransfer("mint", value)} />
                <Field label="Recipient Wallet" value={transferForm.recipient} onChange={(value) => updateTransfer("recipient", value)} />
                <Field label="Amount" value={transferForm.amount} onChange={(value) => updateTransfer("amount", value)} />
                <Field label="Decimals" value={transferForm.decimals} onChange={(value) => updateTransfer("decimals", value)} type="number" />
              </div>
            ) : null}

            {activeAction === "update" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Mint Address" value={updateForm.mint} onChange={(value) => updateUpdate("mint", value)} />
                <Field label="Token Name" value={updateForm.name} onChange={(value) => updateUpdate("name", value)} />
                <Field label="Symbol" value={updateForm.symbol} onChange={(value) => updateUpdate("symbol", value)} />
                <Field label="Metadata URI" value={updateForm.uri} onChange={(value) => updateUpdate("uri", value)} placeholder="https://..." />
              </div>
            ) : null}

            {activeAction === "burn" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Mint Address" value={burnForm.mint} onChange={(value) => updateBurn("mint", value)} />
                <Field label="Amount" value={burnForm.amount} onChange={(value) => updateBurn("amount", value)} />
                <Field label="Decimals" value={burnForm.decimals} onChange={(value) => updateBurn("decimals", value)} type="number" />
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={
                  activeAction === "launch"
                    ? handleLaunchPlan
                    : activeAction === "create"
                      ? handleCreateToken
                      : activeAction === "mint"
                        ? handleMintTokens
                        : activeAction === "transfer"
                          ? handleTransferTokens
                          : activeAction === "update"
                            ? handleUpdateToken
                            : handleBurnTokens
                }
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.24em] text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {busy ? "Processing" : activeCard.title}
              </button>
            </div>

            {notice ? (
              <pre className="mt-6 max-h-72 overflow-auto rounded-lg border border-outline-variant/30 bg-background p-4 whitespace-pre-wrap text-xs leading-5 text-on-surface-variant">
                {notice}
              </pre>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
