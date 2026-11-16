"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import NavigationIcon from "@/components/NavigationIcon";

type WalletAccount = { id: string; name: string; balance: number };
type WalletTransaction = { id: string; fromId: string; toId: string; amount: number; note: string; createdAt: string };
type WalletState = { accounts: WalletAccount[]; transactions: WalletTransaction[] };

const WALLET_KEY = "lingo:wallet-demo:v1";
const SETTINGS_KEY = "lingo:settings:v1";
const CHAT_KEY = "lingo:chats:v1";
const DEFAULT_ACCOUNTS: WalletAccount[] = [
  { id: "you", name: "You", balance: 2450.75 },
  { id: "amina", name: "Amina Dlamini", balance: 620.0 },
  { id: "leo", name: "Leo Martins", balance: 385.5 },
  { id: "zara", name: "Zara Patel", balance: 940.25 },
];

function seedWallet(): WalletState {
  const accounts = DEFAULT_ACCOUNTS.map((account) => ({ ...account }));
  try {
    const contacts = JSON.parse(localStorage.getItem(CHAT_KEY) ?? "[]") as { id?: string; name?: string }[];
    for (const contact of contacts) {
      if (contact.id && contact.name && !accounts.some((account) => account.id === `contact-${contact.id}`)) {
        accounts.push({ id: `contact-${contact.id}`, name: contact.name, balance: 0 });
      }
    }
  } catch { /* Use the demo contacts if local chat data is unavailable. */ }
  return { accounts, transactions: [] };
}

function readWallet(): WalletState {
  try {
    const saved = localStorage.getItem(WALLET_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as WalletState;
      if (Array.isArray(parsed.accounts) && parsed.accounts.length > 0 && Array.isArray(parsed.transactions)) return parsed;
    }
  } catch { /* Start a fresh demo wallet if saved data is unreadable. */ }
  return seedWallet();
}

const money = (amount: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(amount);

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletState>({ accounts: DEFAULT_ACCOUNTS, transactions: [] });
  const [activeAccountId, setActiveAccountId] = useState("you");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [recipientId, setRecipientId] = useState("amina");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const loadedWallet = readWallet();
    setWallet(loadedWallet);
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try { setTheme(JSON.parse(savedSettings).theme === "dark" ? "dark" : "light"); } catch { /* Keep light theme. */ }
    }
    const tabAccount = sessionStorage.getItem("lingo:wallet-demo:account");
    if (tabAccount && loadedWallet.accounts.some((account) => account.id === tabAccount)) setActiveAccountId(tabAccount);

    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(WALLET_KEY);
    const applyUpdate = (next: WalletState) => {
      if (!Array.isArray(next?.accounts) || !Array.isArray(next?.transactions)) return;
      setWallet(next);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === WALLET_KEY && event.newValue) {
        try { applyUpdate(JSON.parse(event.newValue) as WalletState); } catch { /* Ignore malformed cross-tab updates. */ }
      }
      if (event.key === SETTINGS_KEY && event.newValue) {
        try { setTheme(JSON.parse(event.newValue).theme === "dark" ? "dark" : "light"); } catch { /* Keep current theme. */ }
      }
    };
    const onMessage = (event: MessageEvent<WalletState>) => applyUpdate(event.data);
    channel?.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);
    return () => {
      channel?.removeEventListener("message", onMessage);
      channel?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const activeAccount = wallet.accounts.find((account) => account.id === activeAccountId) ?? wallet.accounts[0];
  const recipients = wallet.accounts.filter((account) => account.id !== activeAccountId);
  const visibleTransactions = useMemo(
    () => wallet.transactions.filter((transaction) => transaction.fromId === activeAccountId || transaction.toId === activeAccountId),
    [wallet.transactions, activeAccountId],
  );

  function persist(next: WalletState) {
    setWallet(next);
    localStorage.setItem(WALLET_KEY, JSON.stringify(next));
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(WALLET_KEY);
      channel.postMessage(next);
      channel.close();
    }
  }

  function sendMoney(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    const parsedAmount = Math.round(Number(amount) * 100) / 100;
    const recipient = wallet.accounts.find((account) => account.id === recipientId);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) { setNotice("Enter an amount greater than zero."); return; }
    if (parsedAmount > activeAccount.balance) { setNotice("There isn’t enough demo balance for this payment."); return; }
    if (!recipient) { setNotice("Choose a contact to receive this payment."); return; }

    const transaction: WalletTransaction = {
      id: crypto.randomUUID(), fromId: activeAccount.id, toId: recipient.id,
      amount: parsedAmount, note: note.trim(), createdAt: new Date().toISOString(),
    };
    const next: WalletState = {
      accounts: wallet.accounts.map((account) => account.id === activeAccount.id
        ? { ...account, balance: Math.round((account.balance - parsedAmount) * 100) / 100 }
        : account.id === recipient.id
          ? { ...account, balance: Math.round((account.balance + parsedAmount) * 100) / 100 }
          : account),
      transactions: [transaction, ...wallet.transactions],
    };
    persist(next);
    setNotice(`${money(parsedAmount)} sent to ${recipient.name}. Their wallet and history updated.`);
    setAmount("");
    setNote("");
  }

  return (
    <main className={`wallet-page ${theme === "dark" ? "wallet-theme-dark" : ""}`}>
      <header className="wallet-topbar">
        <Link className="wallet-back" href="/chat"><span className="wallet-back-icon"><NavigationIcon name="chats" size={18}/></span> Back to chats</Link>
        <div className="wallet-topbar-brand"><span className="wallet-brand-icon"><NavigationIcon name="wallet" size={19}/></span> WhatsApp Wallet <span className="wallet-demo-chip">DEMO</span></div>
        <div className="wallet-view-as"><label htmlFor="wallet-account">Viewing wallet</label><select id="wallet-account" value={activeAccountId} onChange={(event) => { setActiveAccountId(event.target.value); sessionStorage.setItem("lingo:wallet-demo:account", event.target.value); setRecipientId(wallet.accounts.find((account) => account.id !== event.target.value)?.id ?? ""); }}>
          {wallet.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select></div>
      </header>

      <div className="wallet-content">
        <section className="wallet-heading"><span className="eyebrow">PAYMENTS, MADE PERSONAL</span><h1>Your wallet<span className="heading-period">.</span></h1><p>Send money to people you know, right from your chats.</p></section>
        <div className="wallet-demo-notice"><span>◉</span><p><strong>Demo wallet</strong> · Sample balances only. Payments update this browser’s open tabs and do not move real money.</p><span className="wallet-live-indicator"><i/> Live demo</span></div>

        <div className="wallet-dashboard">
          <section className="wallet-balance-card">
            <div className="wallet-balance-card-top"><span>Available balance</span><span className="wallet-balance-lock"><NavigationIcon name="wallet" size={18}/></span></div>
            <strong>{money(activeAccount.balance)}</strong>
            <div className="wallet-account-caption"><span className="wallet-avatar">{activeAccount.name.slice(0, 1).toUpperCase()}</span><span><b>{activeAccount.name}</b><small>WhatsApp Wallet</small></span></div>
            <div className="wallet-balance-decoration" aria-hidden="true"/>
          </section>

          <section className="wallet-transfer-card">
            <div className="wallet-card-title"><span className="wallet-section-icon"><NavigationIcon name="send" size={18}/></span><div><h2>Send money</h2><p>Choose a contact and enter an amount.</p></div></div>
            <form className="wallet-transfer-form" onSubmit={sendMoney}>
              <label>To<select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} required>
                {recipients.length === 0 && <option value="">No contacts available</option>}
                {recipients.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select></label>
              <label>Amount<input type="number" min="0.01" step="0.01" max={activeAccount.balance} placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} required/><span className="wallet-currency-prefix">R</span></label>
              <label>Note <small>(optional)</small><input type="text" maxLength={70} placeholder="What’s it for?" value={note} onChange={(event) => setNote(event.target.value)}/></label>
              {notice && <p className={`wallet-notice ${notice.includes("sent to") ? "wallet-notice-success" : "wallet-notice-error"}`} role="status">{notice}</p>}
              <button className="wallet-send-button" type="submit" disabled={!recipients.length || !amount}><NavigationIcon name="send" size={16}/> Send payment</button>
            </form>
          </section>

          <section className="wallet-history-card">
            <div className="wallet-card-title wallet-history-title"><span className="wallet-section-icon"><span>↗</span></span><div><h2>Transaction history</h2><p>Payments sent and received by {activeAccount.name}.</p></div><span className="wallet-count-chip">{visibleTransactions.length}</span></div>
            {visibleTransactions.length ? <div className="wallet-transaction-list">{visibleTransactions.map((transaction) => {
              const isSent = transaction.fromId === activeAccountId;
              const other = wallet.accounts.find((account) => account.id === (isSent ? transaction.toId : transaction.fromId));
              return <article className="wallet-transaction" key={transaction.id}>
                <span className={`wallet-transaction-icon ${isSent ? "wallet-transaction-out" : "wallet-transaction-in"}`}>{isSent ? "↗" : "↙"}</span>
                <span className="wallet-transaction-copy"><b>{isSent ? `Sent to ${other?.name ?? "contact"}` : `Received from ${other?.name ?? "contact"}`}</b><small>{transaction.note || (isSent ? "Payment sent" : "Payment received")} · {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(transaction.createdAt))}</small></span>
                <strong className={isSent ? "wallet-amount-out" : "wallet-amount-in"}>{isSent ? "−" : "+"}{money(transaction.amount)}</strong>
              </article>;
            })}</div> : <div className="wallet-history-empty"><span>↗</span><b>No payments yet</b><small>Your sent and received demo payments will show here.</small></div>}
          </section>

          <aside className="wallet-realtime-card"><div className="wallet-realtime-heading"><span className="wallet-live-pulse"/><div><h2>Live activity</h2><p>Sender and recipient updates</p></div></div>
            {visibleTransactions.slice(0, 3).length ? visibleTransactions.slice(0, 3).map((transaction) => {
              const isSent = transaction.fromId === activeAccountId;
              const other = wallet.accounts.find((account) => account.id === (isSent ? transaction.toId : transaction.fromId));
              return <div className="wallet-live-event" key={transaction.id}><span className="wallet-live-avatar">{other?.name.slice(0, 1) ?? "?"}</span><p><b>{other?.name}</b> {isSent ? "received your payment" : "sent you a payment"}<small>{money(transaction.amount)} · just now</small></p><span className="wallet-event-check">✓</span></div>;
            }) : <p className="wallet-live-empty">Payments will appear here instantly in both wallets.</p>}
            <div className="wallet-sync-caption"><i/> This tab syncs with other open demo tabs</div>
          </aside>
        </div>
        <p className="wallet-footnote">Demo only · No bank account or payment service is connected.</p>
      </div>
    </main>
  );
}
