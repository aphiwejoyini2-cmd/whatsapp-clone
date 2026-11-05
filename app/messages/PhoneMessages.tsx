"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { decryptMessage, encryptForDevice, getOrCreateDeviceKeys, getPublicDeviceBundle, type EncryptedMessage, type StoredKeys } from "@/lib/crypto/device-keys";

type Recipient = { user_id: string; device_id: string; identity_key: JsonWebKey; signed_prekey: JsonWebKey; signed_prekey_signature: string };
type StoredMessage = EncryptedMessage & {
  id: string; conversation_id: string; sender_id: string; recipient_id: string;
  sender_device_id: string; recipient_device_id: string; created_at: string;
};
type DisplayMessage = { id: string; sender_id: string; text: string; created_at: string; error?: string };

export default function PhoneMessages() {
  const supabase = createClient();
  const [userId, setUserId] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [keys, setKeys] = useState<StoredKeys | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const requestedEmail = new URLSearchParams(window.location.search).get("email");
        if (requestedEmail) setLookupEmail(requestedEmail);
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) { setStatus("Sign in to use messaging."); return; }
        if (!active) return;
        setUserId(user.id);
        setAccountEmail(user.email ?? "");
        setEmailConfirmed(Boolean(user.email_confirmed_at));
        const deviceKeys = await getOrCreateDeviceKeys();
        if (!active) return;
        setKeys(deviceKeys);
        const bundle = await getPublicDeviceBundle(deviceKeys);
        const registration = await fetch("/api/devices", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bundle),
        });
        const result = await registration.json();
        if (!registration.ok) throw new Error(result.error ?? "Could not register this browser.");
        setStatus("This browser is ready. Add a contact’s confirmed account email to start a chat.");
      } catch (error) {
        if (active) setStatus(error instanceof Error ? error.message : "Could not initialize messaging.");
      }
    })();
    return () => { active = false; };
  }, [supabase]);

  async function findRecipient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setStatus(""); setRecipient(null); setConversationId(""); setMessages([]);
    try {
      const normalized = lookupEmail.trim().toLowerCase();
      if (!normalized.includes("@")) throw new Error("Enter the email address they use to sign in.");
      const { data, error } = await supabase.rpc("find_messaging_recipient", { email_value: normalized });
      if (error) throw error;
      const match = (data ?? [])[0] as Recipient | undefined;
      if (!match) throw new Error("No other user with this confirmed email and a registered browser was found.");
      setRecipient(match);
      const result = await supabase.rpc("get_or_create_messaging_conversation", { target_user_id: match.user_id });
      if (result.error) throw result.error;
      setConversationId(result.data as string);
      setStatus(`Chat ready for ${normalized}.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not find that email address."); }
    finally { setBusy(false); }
  }

  const loadMessages = useCallback(async () => {
    if (!conversationId || !keys) return;
    const { data, error } = await supabase.from("messaging_messages").select("*")
      .eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200);
    if (error) { setStatus(error.message); return; }
    const decrypted = await Promise.all((data as StoredMessage[]).map(async (message) => {
      if (message.sender_id === userId) return { id: message.id, sender_id: message.sender_id, text: "Sent encrypted message", created_at: message.created_at };
      try {
        const { data: senderDevice, error: keyError } = await supabase.from("messaging_devices")
          .select("identity_key").eq("user_id", message.sender_id).eq("device_id", message.sender_device_id).single();
        if (keyError) throw keyError;
        const text = await decryptMessage(keys, message, senderDevice.identity_key as JsonWebKey);
        return { id: message.id, sender_id: message.sender_id, text, created_at: message.created_at };
      } catch (error) {
        return { id: message.id, sender_id: message.sender_id, text: "Could not decrypt this message", created_at: message.created_at,
          error: error instanceof Error ? error.message : "Decryption failed" };
      }
    }));
    setMessages(decrypted);
  }, [conversationId, keys, supabase, userId]);

  useEffect(() => {
    if (!conversationId || !keys) return;
    const channel = supabase.channel(`messages:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messaging_messages", filter: `conversation_id=eq.${conversationId}` }, () => {
        void loadMessages();
      }).subscribe();
    const initialLoad = window.setTimeout(() => { void loadMessages(); }, 0);
    return () => { window.clearTimeout(initialLoad); void supabase.removeChannel(channel); };
  }, [conversationId, keys, loadMessages, supabase]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recipient || !conversationId || !keys || !draft.trim()) return;
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/devices/claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: recipient.user_id, deviceId: recipient.device_id }),
      });
      const claimed = await response.json();
      if (!response.ok) throw new Error(claimed.error ?? "Could not get recipient prekeys.");
      const encrypted = await encryptForDevice(keys, claimed.bundle, {
        conversationId, senderId: userId, recipientId: recipient.user_id, text: draft.trim(),
      });
      const { error } = await supabase.from("messaging_messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        recipient_id: recipient.user_id,
        sender_device_id: keys.deviceId,
        recipient_device_id: recipient.device_id,
        ...encrypted.envelope,
        created_at: encrypted.sentAt,
      });
      if (error) throw error;
      setDraft("");
      await loadMessages();
      setStatus("Encrypted message sent.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Message could not be sent."); }
    finally { setBusy(false); }
  }

  return <section style={{ display: "grid", gap: 22 }}>
    <section style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
      <h2>1. Your account</h2>
      {!userId ? <p><Link href={`/login?next=${encodeURIComponent(`/messages${lookupEmail ? `?email=${encodeURIComponent(lookupEmail)}` : ""}`)}`}>Log in</Link> or <Link href="/signup">create an account</Link> with email. Confirm your email, then come back here.</p>
        : <p>Signed in as <strong>{accountEmail}</strong>{emailConfirmed ? " — email confirmed." : " — confirm this email before chatting."}</p>}
    </section>

    <section style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
      <h2>2. Find the person</h2>
      <p>Enter the email they use for this app. They need their own account, confirmed email, and a registered browser.</p>
      <form onSubmit={findRecipient} style={{ display: "flex", gap: 8 }}>
        <input aria-label="Recipient account email" type="email" value={lookupEmail} onChange={(event) => setLookupEmail(event.target.value)} placeholder="friend@example.com" required />
        <button disabled={busy || !emailConfirmed}>Find account</button>
      </form>
      {!emailConfirmed && <p>Confirm your email in Supabase Auth first. SMS verification is not used for this chat.</p>}
    </section>

    {conversationId && recipient && <section style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
      <h2>Encrypted prototype chat</h2>
      <div aria-live="polite" style={{ minHeight: 180, maxHeight: 340, overflow: "auto", padding: 12, background: "#f7f8f7", borderRadius: 8 }}>
        {messages.map((message) => <p key={message.id} title={message.error} style={{ textAlign: message.sender_id === userId ? "right" : "left" }}>
          <span style={{ display: "inline-block", padding: "9px 12px", background: message.sender_id === userId ? "#d7f3dc" : "white", borderRadius: 12 }}>{message.text}</span>
        </p>)}
        {!messages.length && <p>No messages yet. Send a message to begin.</p>}
      </div>
      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input aria-label="Message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type an encrypted message" required />
        <button disabled={busy}>Send</button>
      </form>
    </section>}
    {status && <p role="status">{status}</p>}
    {!userId && status.startsWith("Sign in") && <p><Link href="/login">Log in to your account</Link></p>}
    <p>Messages are stored encrypted in Supabase; the other signed-in user retrieves them here and can reply. Email finds the account. A saved phone number is just a contact detail. This encryption is a prototype, not the Signal Protocol.</p>
    <p><Link href="/devices">Manage this browser’s encryption keys</Link></p>
  </section>;
}
