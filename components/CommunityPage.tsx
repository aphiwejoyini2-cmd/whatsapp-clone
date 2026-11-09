"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Contact = { id: string; name: string };
type CommunityMessage = { id: string; sender: "me"; text: string; sentAt: string; edited?: boolean };
type Community = {
  id: string;
  name: string;
  topic: string;
  memberIds: string[];
  messages: CommunityMessage[];
};

const STORAGE_KEY = "lingo:communities:v1";

export default function CommunityPage({ contacts }: { contacts: Contact[] }) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setCommunities(parsed as Community[]);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(communities));
  }, [communities, loaded]);

  const selectedCommunity = communities.find((community) => community.id === selectedId) ?? null;
  const contactName = (id: string) => contacts.find((contact) => contact.id === id)?.name ?? "Removed contact";

  function createCommunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const community: Community = {
      id: crypto.randomUUID(),
      name: name.trim(),
      topic: topic.trim(),
      memberIds: selectedMembers,
      messages: [],
    };
    setCommunities((current) => [community, ...current]);
    setSelectedId(community.id);
    setName("");
    setTopic("");
    setSelectedMembers([]);
    setIsCreateOpen(false);
  }

  function addMembers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCommunity) return;
    setCommunities((current) => current.map((community) => community.id === selectedCommunity.id
      ? { ...community, memberIds: Array.from(new Set([...community.memberIds, ...selectedMembers])) }
      : community));
    setSelectedMembers([]);
    setIsMembersOpen(false);
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCommunity || !message.trim()) return;
    const nextMessage: CommunityMessage = { id: crypto.randomUUID(), sender: "me", text: message.trim(), sentAt: new Date().toISOString() };
    setCommunities((current) => current.map((community) => community.id === selectedCommunity.id
      ? { ...community, messages: [...community.messages, nextMessage] }
      : community));
    setMessage("");
  }

  function beginEditMessage(chatMessage: CommunityMessage) {
    setEditingMessageId(chatMessage.id);
    setEditingMessageText(chatMessage.text);
  }

  function cancelEditMessage() {
    setEditingMessageId(null);
    setEditingMessageText("");
  }

  function saveEditedMessage(event: FormEvent<HTMLFormElement>, messageId: string) {
    event.preventDefault();
    const text = editingMessageText.trim();
    if (!selectedCommunity || !text) return;
    setCommunities((current) => current.map((community) => community.id === selectedCommunity.id
      ? { ...community, messages: community.messages.map((chatMessage) => chatMessage.id === messageId
        ? { ...chatMessage, text, edited: true }
        : chatMessage) }
      : community));
    cancelEditMessage();
  }

  const memberChoices = contacts.filter((contact) => !selectedCommunity?.memberIds.includes(contact.id));

  return (
    <section className="community-section">
      <header className="community-heading">
        <div><span className="eyebrow">TALK ABOUT WHAT MATTERS</span><h1>Communities<span className="heading-period">.</span></h1><p>Bring people together around a topic and keep the conversation going.</p></div>
      </header>

      <div className="community-layout">
        <aside className="community-list-panel" aria-label="Your communities">
          <div className="community-panel-heading"><strong>Your communities</strong><span>{communities.length.toString().padStart(2, "0")}</span></div>
          {communities.length ? communities.map((community) => (
            <button key={community.id} className={`community-list-item ${community.id === selectedId ? "community-list-item-active" : ""}`} onClick={() => setSelectedId(community.id)}>
              <span className="community-list-avatar">{community.name.slice(0, 1).toUpperCase()}</span>
              <span className="community-list-copy"><strong>{community.name}</strong><small>{community.topic}</small></span>
              <span className="community-list-count">{community.memberIds.length}</span>
            </button>
          )) : <div className="community-list-empty"><span>✳</span><strong>No communities yet</strong><small>Create one to start a topic based chat.</small></div>}
        </aside>

        {selectedCommunity ? <section className="community-chat" aria-label={`${selectedCommunity.name} community chat`}>
          <header className="community-chat-heading"><div className="community-chat-title"><span className="community-list-avatar">{selectedCommunity.name.slice(0, 1).toUpperCase()}</span><span><strong>{selectedCommunity.name}</strong><small>{selectedCommunity.topic}</small></span></div><button className="community-manage-button" onClick={() => { setSelectedMembers([]); setIsMembersOpen(true); }}>＋ Add people</button></header>
          <div className="community-topic-banner"><span>TOPIC</span><p>{selectedCommunity.topic}</p><small>{selectedCommunity.memberIds.length} {selectedCommunity.memberIds.length === 1 ? "person" : "people"} in this community</small></div>
          <div className="community-members-row"><span className="eyebrow">PEOPLE</span><div>{selectedCommunity.memberIds.length ? selectedCommunity.memberIds.map((id) => <span className="community-member-chip" key={id}>{contactName(id)}</span>) : <span className="community-no-members">Invite people to get the conversation started.</span>}</div></div>
          <div className="community-messages" aria-live="polite">
            {selectedCommunity.messages.length ? selectedCommunity.messages.map((chatMessage) => <div className="community-message-row" key={chatMessage.id}><div className="community-message-bubble">{editingMessageId === chatMessage.id ? <form className="community-message-edit-form" onSubmit={(event) => saveEditedMessage(event, chatMessage.id)}><textarea aria-label="Edit community message" maxLength={2000} autoFocus value={editingMessageText} onChange={(event) => setEditingMessageText(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") cancelEditMessage(); }}/><div><button type="button" onClick={cancelEditMessage}>Cancel</button><button type="submit" disabled={!editingMessageText.trim()}>Save</button></div></form> : <><button className="community-message-edit-trigger" type="button" aria-label="Edit message" title="Edit message" onClick={() => beginEditMessage(chatMessage)}>✎</button><p>{chatMessage.text}</p><time>{chatMessage.edited && <span>Edited · </span>}{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(chatMessage.sentAt))}</time></>}</div></div>) : <div className="community-first-message"><span>✳</span><strong>Start the conversation</strong><p>Share a thought or question about “{selectedCommunity.topic}”.</p></div>}
          </div>
          <form className="community-composer" onSubmit={sendMessage}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={`Message ${selectedCommunity.name}…`} aria-label="Write a community message"/><button type="submit" disabled={!message.trim()} aria-label="Send message">➤</button></form>
        </section> : <div className="community-welcome"><span className="community-welcome-icon">◎</span><span className="eyebrow">A PLACE FOR EVERY INTEREST</span><h2>Find your people.</h2><p>Create a community around a topic and invite contacts to join the chat.</p><button className="community-create-button" onClick={() => { setSelectedMembers([]); setIsCreateOpen(true); }}>＋ <span>Create a community</span></button></div>}
      </div>

      {(isCreateOpen || isMembersOpen) && <div className="community-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setIsCreateOpen(false); setIsMembersOpen(false); } }}><section className="community-modal" role="dialog" aria-modal="true" aria-labelledby="community-modal-title">
        <header><button type="button" onClick={() => { setIsCreateOpen(false); setIsMembersOpen(false); }}>Cancel</button><h2 id="community-modal-title">{isCreateOpen ? "New community" : "Add people"}</h2><span>{isCreateOpen ? "Create" : "Invite"}</span></header>
        <form onSubmit={isCreateOpen ? createCommunity : addMembers}>
          {isCreateOpen && <><label className="community-field">Community name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Weekend hikers" maxLength={50} required /></label><label className="community-field">What’s the topic?<input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Local trails and hiking tips" maxLength={100} required /></label></>}
          <div className="community-picker-heading"><strong>{isCreateOpen ? "Invite people" : `Add people to ${selectedCommunity?.name ?? ""}`}</strong><small>Select saved contacts</small></div>
          <div className="community-contact-options">{(isCreateOpen ? contacts : memberChoices).length ? (isCreateOpen ? contacts : memberChoices).map((contact) => <label className="community-contact-option" key={contact.id}><input type="checkbox" checked={selectedMembers.includes(contact.id)} onChange={(event) => setSelectedMembers((current) => event.target.checked ? [...current, contact.id] : current.filter((id) => id !== contact.id))}/><span className="community-contact-avatar">{contact.name.slice(0, 1).toUpperCase()}</span><strong>{contact.name}</strong></label>) : <p className="community-no-contacts">{contacts.length ? "All saved contacts are already in this community." : "Add contacts in Messages before inviting people."}</p>}</div>
          <button className="community-modal-submit" type="submit" disabled={isCreateOpen ? !name.trim() || !topic.trim() : selectedMembers.length === 0}>{isCreateOpen ? "Create community" : "Add selected people"}</button>
        </form>
      </section></div>}
    </section>
  );
}
