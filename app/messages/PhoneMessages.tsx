"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
type Recipient = { user_id: string; phone_e164: string };

function normalizePhone(value: string) {
  const normalized = value.trim().replace(/[^+\d]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error("Enter the account phone number in international format, for example +27821234567.");
  }
  return normalized;
}

export default function PhoneMessages() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [hasRegisteredPhone, setHasRegisteredPhone] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const requestedPhone = new URLSearchParams(window.location.search).get("phone");
    if (requestedPhone) setLookupPhone(requestedPhone);

    let active = true;
    void (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) { if (active) setStatus(error.message); return; }
      if (!user) { if (active) setStatus("Sign in with your email and password to use messaging."); return; }
      if (!active) return;
      setUserId(user.id);
      let registeredPhone = typeof user.user_metadata.phone_e164 === "string" ? user.user_metadata.phone_e164 : "";
      if (!registeredPhone) {
        const { data: profilePhone, error: profileError } = await supabase.rpc("get_my_simple_messaging_phone");
        if (profileError) throw profileError;
        if (typeof profilePhone === "string") registeredPhone = profilePhone;
      }
      setAccountPhone(registeredPhone);
      setHasRegisteredPhone(Boolean(registeredPhone));
      setStatus(registeredPhone
        ? "Enter the other person’s account phone number to start a chat."
        : "This account has no phone number registered in Supabase.");
    })().catch((error: unknown) => {
      if (active) setStatus(error instanceof Error ? error.message : "Could not load your account.");
    });
    return () => { active = false; };
  }, [supabase]);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    const { data, error } = await supabase.from("simple_messages").select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200);
    if (error) { setStatus(error.message); return; }
    setMessages((data ?? []) as MessageRow[]);
  }, [conversationId, supabase]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`simple-messages:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "simple_messages", filter: `conversation_id=eq.${conversationId}`,
      }, () => { void loadMessages(); })
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === "CHANNEL_ERROR" || subscriptionStatus === "TIMED_OUT") {
          setStatus("Live updates are unavailable. Messages can still be refreshed from Supabase.");
        }
      });
    void loadMessages();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, loadMessages, supabase]);

  async function findRecipient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    setRecipient(null);
    setConversationId("");
    setMessages([]);
    try {
      if (!userId || !hasRegisteredPhone) throw new Error("Sign in to an account with a phone number registered in Supabase.");
      const phone = normalizePhone(lookupPhone);
      const { data, error } = await supabase.rpc("find_simple_message_recipient", { phone_value: phone });
      if (error) throw error;
      const match = (data ?? [])[0] as Recipient | undefined;
      if (!match) throw new Error("No other account with that phone number was found.");
      const conversation = await supabase.rpc("get_or_create_simple_conversation", { target_user_id: match.user_id });
      if (conversation.error) throw conversation.error;
      setRecipient(match);
      setConversationId(conversation.data as string);
      setStatus(`Chat ready with ${match.phone_e164}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not start this chat.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!conversationId || !userId || !body || busy) return;
    setBusy(true);
    setStatus("");
    const { error } = await supabase.from("simple_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      body,
    });
    if (error) {
      setStatus(error.message);
    } else {
      setDraft("");
      setStatus("Message sent.");
      await loadMessages();
    }
    setBusy(false);
  }

  const loginPath = `/login?next=${encodeURIComponent(`/messages${lookupPhone ? `?phone=${encodeURIComponent(lookupPhone)}` : ""}`)}`;

  return <section style={{ display: "grid", gap: 20 }}>
    <section style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
      <h2>Your account</h2>
      {userId
        ? <p>Signed in as <strong>{accountPhone}</strong>{hasRegisteredPhone ? " — number registered." : " — no phone number registered."}</p>
        : <p><Link href={loginPath}>Log in</Link> or <Link href="/signup">create an account</Link> with a phone number registered to the account.</p>}
    </section>

    <section style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
      <h2>Start a conversation</h2>
      <p>Enter the phone number registered to the other Supabase account. It is an unverified identifier; no verification code is sent. Messages are stored as plain text in Supabase.</p>
      <form onSubmit={findRecipient} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input aria-label="Other person’s account phone" type="tel" autoComplete="tel" value={lookupPhone}
          onChange={(event) => setLookupPhone(event.target.value)} placeholder="+27821234567" required />
        <button disabled={busy || !hasRegisteredPhone}>Find account</button>
      </form>
    </section>

    {conversationId && recipient && <section style={{ padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
      <h2>Chat with {recipient.phone_e164}</h2>
      <div aria-live="polite" style={{ minHeight: 180, maxHeight: 380, overflowY: "auto", padding: 12, background: "#f7f8f7", borderRadius: 8 }}>
        {messages.map((message) => <p key={message.id} style={{ textAlign: message.sender_id === userId ? "right" : "left" }}>
          <span style={{ display: "inline-block", padding: "9px 12px", background: message.sender_id === userId ? "#d7f3dc" : "white", borderRadius: 12 }}>
            {message.body}<br /><small>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
          </span>
        </p>)}
        {!messages.length && <p>No messages yet. Send the first one.</p>}
      </div>
      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input aria-label="Message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message" maxLength={4000} required />
        <button disabled={busy || !draft.trim()}>Send</button>
      </form>
      <button type="button" onClick={() => void loadMessages()} style={{ marginTop: 8 }}>Refresh messages</button>
    </section>}

    {status && <p role="status">{status}</p>}
    <p><Link href="/">Back to the app</Link></p>
  </section>;
}
