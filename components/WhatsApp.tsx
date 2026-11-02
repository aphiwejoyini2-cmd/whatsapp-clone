"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";

type Message = { id: string; text: string; sender: "me" | "them"; sentAt: string };
type Settings = { theme: "light" | "dark"; compactChats: boolean; showPreviews: boolean };
type Chat = {
  id: string;
  name: string;
  phone: string;
  username?: string;
  countryCode?: string;
  mobile?: string;
  syncToPhone?: boolean;
  about: string;
  nativeLanguage: string;
  learningLanguage: string;
  time: string;
  createdAt: string;
  pinned: boolean;
  unreadCount: number;
  messages: Message[];
};

const STORAGE_KEY = "lingo:chats:v1";
const SETTINGS_KEY = "lingo:settings:v1";
const DEFAULT_SETTINGS: Settings = { theme: "light", compactChats: false, showPreviews: true };
const LANGUAGES = ["Arabic", "English", "French", "Japanese", "Portuguese", "Spanish", "Other"];
const PHONE_COUNTRIES = [
  { name: "South Africa", code: "+27" }, { name: "United States", code: "+1" },
  { name: "United Kingdom", code: "+44" }, { name: "Kenya", code: "+254" },
  { name: "Nigeria", code: "+234" }, { name: "Australia", code: "+61" },
  { name: "India", code: "+91" }, { name: "France", code: "+33" },
  { name: "Japan", code: "+81" }, { name: "Brazil", code: "+55" },
];
const EMOJI_CATEGORIES = {
  Smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "😘", "😋", "😎", "🤓", "🤔", "🤗", "🤫", "😴", "😭", "😤", "😡", "🥳", "😇", "🤩", "🫶", "❤️", "💕", "💖", "✨", "💯"],
  People: ["👋", "🤚", "✋", "🖐️", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👍", "👎", "✊", "👊", "👏", "🙌", "👐", "🤲", "🙏", "💪", "🫂", "🤝", "🧑‍💻", "👀"],
  Nature: ["🐶", "🐱", "🐭", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐸", "🐵", "🐧", "🐦", "🦋", "🐝", "🐬", "🐳", "🌸", "🌻", "🌹", "🌈", "☀️", "🌙", "⭐", "🌍", "🍀", "🌿", "🌊", "🔥"],
  Food: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍒", "🍑", "🥭", "🍍", "🥑", "🍕", "🍔", "🍟", "🌮", "🍜", "🍣", "🍰", "🍩", "🍪", "☕", "🧋", "🥤", "🍿", "🎂", "🍫"],
  Activities: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🎱", "🏓", "🏸", "🥊", "🏆", "🥇", "🎯", "🎮", "🎲", "🎸", "🎹", "🎤", "🎧", "🎬", "🎨", "🎉", "🎊", "🎁", "🎈", "🪩"],
  Objects: ["⌚", "📱", "💻", "⌨️", "🖥️", "📷", "💡", "📚", "✏️", "📝", "📌", "✂️", "🔒", "🔑", "💌", "📦", "🚗", "🚲", "✈️", "🚀", "🏠", "🌟", "✅", "❣️", "💬"],
} as const;
type EmojiCategory = keyof typeof EMOJI_CATEGORIES;

function Icon({ name, size = 20 }: { name: "search" | "plus" | "smile" | "send" | "chat" | "language" | "back" | "close" | "more" | "pin" | "settings" | "phone" | "video"; size?: number }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    smile: <><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    chat: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5h.5a8.5 8.5 0 0 1 8 8z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></>,
    language: <><path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 20l-5-10-5 10M14 18h6"/></>,
    back: <><path d="m15 18-6-6 6-6"/><path d="M9 12h12"/></>,
    close: <path d="m18 6-12 12M6 6l12 12"/>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 8.9a16 16 0 0 0 6 6l.2-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.8 2.1z"/>,
    video: <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></>,
    pin: <><path d="m16 3 5 5-4 1-4 4 1 4-2 2-3-5-5-5 2-2 4 1 4-4z"/><path d="m2 22 7-7"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.3a1.7 1.7 0 1 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9h-.3a1.7 1.7 0 1 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2v-.3a1.7 1.7 0 1 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.3a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9z"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function getLastMessage(chat: Chat) {
  return chat.messages[chat.messages.length - 1];
}

function formatChatTime(chat: Chat) {
  const lastMessage = getLastMessage(chat);
  if (!lastMessage) return "";
  const date = new Date(lastMessage.sentAt);
  if (!Number.isFinite(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  if (sameDay) return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  const daysAgo = (now.getTime() - date.getTime()) / 86400000;
  if (daysAgo < 7) return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export default function WhatsApp() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [areSettingsLoaded, setAreSettingsLoaded] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<EmojiCategory>("Smileys");
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<"chats" | "language" | "settings">("chats");
  const [mobileOpenChat, setMobileOpenChat] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "pinned">("all");
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [confirmDeleteContactId, setConfirmDeleteContactId] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<"voice" | "video" | null>(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) setChats(parsed.map((chat, index) => ({
          ...chat,
          createdAt: chat.createdAt || new Date(Date.now() - index).toISOString(),
          pinned: Boolean(chat.pinned),
          unreadCount: Number(chat.unreadCount) || 0,
        })) as Chat[]);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    try {
      const storedSettings = window.localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
    } catch {
      window.localStorage.removeItem(SETTINGS_KEY);
    }
    setAreSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (areSettingsLoaded) window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings, areSettingsLoaded]);

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get("section");
    if (section === "language" || section === "settings") setActiveSection(section);
  }, []);

  useEffect(() => {
    if (isLoaded) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats, isLoaded]);

  const selectedChat = chats.find((chat) => chat.id === selectedChatId);
  const filteredChats = useMemo(() => chats
    .filter((chat) => `${chat.name} ${chat.phone}`.toLowerCase().includes(search.toLowerCase()))
    .filter((chat) => activeFilter === "all" || (activeFilter === "unread" ? chat.unreadCount > 0 : chat.pinned))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(getLastMessage(b)?.sentAt ?? b.createdAt).getTime() - new Date(getLastMessage(a)?.sentAt ?? a.createdAt).getTime()),
  [chats, search, activeFilter]);
  const languagePartners = useMemo(() => chats.filter((chat) => chat.learningLanguage && `${chat.name} ${chat.nativeLanguage} ${chat.learningLanguage}`.toLowerCase().includes(search.toLowerCase())), [chats, search]);
  const unreadChatsCount = chats.filter((chat) => chat.unreadCount > 0).length;
  const editingContact = chats.find((chat) => chat.id === editingContactId);
  const editingNameParts = editingContact?.name.trim().split(/\s+/) ?? [];
  const editingCountryCode = editingContact?.countryCode || PHONE_COUNTRIES.find((country) => editingContact?.phone.startsWith(country.code))?.code || "+27";
  const editingMobile = editingContact?.mobile ?? editingContact?.phone.replace(/^\+\d+\s*/, "") ?? "";

  function openAddContact() {
    setEditingContactId(null);
    setFormError("");
    setIsContactModalOpen(true);
  }

  function openEditContact(contactId: string) {
    setEditingContactId(contactId);
    setOpenMenuChatId(null);
    setFormError("");
    setIsContactModalOpen(true);
  }

  function closeContactModal() {
    setIsContactModalOpen(false);
    setEditingContactId(null);
    setFormError("");
  }

  function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const name = [firstName, lastName].filter(Boolean).join(" ");
    const countryCode = String(formData.get("countryCode") ?? "+27");
    const mobile = String(formData.get("mobile") ?? "").trim();
    const phone = `${countryCode} ${mobile}`.trim();
    const digits = phone.replace(/\D/g, "");
    if (!firstName || digits.length < 7) {
      setFormError("Enter a first name and a valid mobile number with at least 7 digits.");
      return;
    }
    if (chats.some((chat) => chat.id !== editingContactId && chat.phone.replace(/\D/g, "") === digits)) {
      setFormError("A contact with this phone number already exists.");
      return;
    }
    const contactFields = {
      name,
      phone,
      username: String(formData.get("username") ?? "").trim().replace(/^@/, ""),
      countryCode,
      mobile,
      about: String(formData.get("about") ?? "").trim(),
      nativeLanguage: String(formData.get("nativeLanguage") ?? ""),
      learningLanguage: String(formData.get("learningLanguage") ?? ""),
      syncToPhone: false,
    };
    if (editingContactId) {
      setChats((current) => current.map((chat) => chat.id === editingContactId ? { ...chat, ...contactFields } : chat));
    } else {
      const contact: Chat = { id: crypto.randomUUID(), ...contactFields, time: "New contact", createdAt: new Date().toISOString(), pinned: false, unreadCount: 0, messages: [] };
      setChats((current) => [contact, ...current]);
      setSelectedChatId(contact.id);
      setActiveSection("chats");
      setMobileOpenChat(true);
    }
    setIsContactModalOpen(false);
    setFormError("");
    setSearch("");
  }

  function deleteContact(contactId: string) {
    setChats((current) => current.filter((chat) => chat.id !== contactId));
    if (selectedChatId === contactId) {
      setSelectedChatId(null);
      setMobileOpenChat(false);
    }
    setConfirmDeleteContactId(null);
    setIsContactModalOpen(false);
    setEditingContactId(null);
  }

  function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const text = message.trim();
    if (!text || !selectedChatId) return;
    const sentAt = new Date().toISOString();
    setChats((current) => current.map((chat) => chat.id === selectedChatId ? { ...chat, time: "Now", unreadCount: 0, messages: [...chat.messages, { id: crypto.randomUUID(), text, sender: "me", sentAt }] } : chat));
    setMessage("");
    setIsEmojiPickerOpen(false);
  }

  function openChat(chatId: string) {
    setSelectedChatId(chatId);
    setChats((current) => current.map((chat) => chat.id === chatId ? { ...chat, unreadCount: 0 } : chat));
    setOpenMenuChatId(null);
    setActiveSection("chats");
    setMobileOpenChat(true);
  }

  function updateChat(chatId: string, updates: Partial<Pick<Chat, "pinned" | "unreadCount">>) {
    setChats((current) => current.map((chat) => chat.id === chatId ? { ...chat, ...updates } : chat));
    setOpenMenuChatId(null);
  }

  return (
    <main className={`messenger-shell ${settings.theme === "dark" ? "theme-dark" : ""}`}>
      <aside className="rail" aria-label="Main navigation">
        <a className="brand-mark" href="#chats" aria-label="Home"><Image src="/images.png" alt="" width={48} height={43} priority /></a>
        <button className={`rail-button ${activeSection === "chats" ? "rail-button-active" : ""}`} onClick={() => { setActiveSection("chats"); setMobileOpenChat(false); }} aria-label="Chats" title="Chats"><Icon name="chat"/></button>
        <button className={`rail-button ${activeSection === "language" ? "rail-button-active" : ""}`} onClick={() => { setActiveSection("language"); setSearch(""); }} aria-label="Language exchange" title="Language exchange"><Icon name="language"/></button>
        <a className="rail-button status-rail-link" href="/status" aria-label="Status" title="Status"><span aria-hidden="true">◉</span></a>
        <div className="rail-spacer" />
        <button className={`rail-button ${activeSection === "settings" ? "rail-button-active" : ""}`} onClick={() => { setActiveSection("settings"); setMobileOpenChat(false); }} aria-label="Settings" title="Settings"><Icon name="settings"/></button>
        <div className="rail-profile" aria-label="Your profile">Y</div>
      </aside>

      <div className={`dashboard-content ${settings.theme === "dark" ? "theme-dark" : ""} ${settings.compactChats ? "compact-chats" : ""}`}>
      {activeSection === "chats" ? <>
        <aside className={`inbox ${mobileOpenChat ? "inbox-mobile-hidden" : ""}`} id="chats">
          <header className="inbox-heading"><div><span className="eyebrow">YOUR CONVERSATIONS</span><h1>Messages<span className="heading-period">.</span></h1></div><button className="new-chat-button" onClick={openAddContact} aria-label="Add a contact" title="Add a contact"><Icon name="plus" size={21}/></button></header>
          <label className="search-field"><Icon name="search" size={18}/><input aria-label="Search contacts" placeholder="Search by name or number" value={search} onChange={(event) => setSearch(event.target.value)}/></label>
          <div className="filter-row" aria-label="Filter chats">
            <button className={`filter-chip ${activeFilter === "all" ? "filter-chip-active" : ""}`} onClick={() => setActiveFilter("all")}>All chats <span>{chats.length}</span></button>
            <button className={`filter-chip ${activeFilter === "unread" ? "filter-chip-active" : ""}`} onClick={() => setActiveFilter("unread")}>Unread <span>{unreadChatsCount}</span></button>
            <button className={`filter-chip ${activeFilter === "pinned" ? "filter-chip-active" : ""}`} onClick={() => setActiveFilter("pinned")}>Pinned <span>{chats.filter((chat) => chat.pinned).length}</span></button>
          </div>
          <div className="inbox-section-label"><span>{activeFilter === "unread" ? "UNREAD CHATS" : activeFilter === "pinned" ? "PINNED CHATS" : "RECENT CHATS"}</span><span>{filteredChats.length.toString().padStart(2, "0")}</span></div>
          <div className="conversation-list">
            {filteredChats.map((chat, index) => {
              const lastMessage = getLastMessage(chat);
              return <div className="conversation-entry" key={chat.id}>
                <button className={`conversation ${selectedChatId === chat.id ? "conversation-active" : ""} ${chat.unreadCount ? "conversation-unread" : ""}`} onClick={() => openChat(chat.id)}>
                  <span className={`person-avatar person-avatar-${index % 6}`}>{getInitials(chat.name)}</span>
                  <span className="conversation-copy"><span className="conversation-top"><strong>{chat.name}{chat.pinned && <Icon name="pin" size={12}/>}</strong><time>{formatChatTime(chat)}</time></span><span className="conversation-preview">{settings.showPreviews ? lastMessage ? <>{lastMessage.sender === "me" && <span className="read-check">✓✓ </span>}{lastMessage.text}</> : chat.about || "No messages yet" : "Open chat to view messages"}</span></span>
                  {chat.unreadCount > 0 && <span className="unread-count">{chat.unreadCount > 99 ? "99+" : chat.unreadCount}</span>}
                </button>
                <button className="conversation-menu-trigger" aria-label={`Chat options for ${chat.name}`} title="Chat options" onClick={() => setOpenMenuChatId((current) => current === chat.id ? null : chat.id)}><Icon name="more" size={17}/></button>
                {openMenuChatId === chat.id && <div className="conversation-menu" role="menu"><button role="menuitem" onClick={() => updateChat(chat.id, { pinned: !chat.pinned })}><Icon name="pin" size={15}/>{chat.pinned ? "Unpin chat" : "Pin chat"}</button><button role="menuitem" onClick={() => updateChat(chat.id, { unreadCount: chat.unreadCount ? 0 : 1 })}>{chat.unreadCount ? "Mark as read" : "Mark as unread"}</button><button role="menuitem" onClick={() => openEditContact(chat.id)}>Edit contact</button></div>}
              </div>;
            })}
            {filteredChats.length === 0 && <div className="empty-inbox"><span className="empty-spark">✳</span><h2>{search ? "No contacts found" : "Your chats start here"}</h2><p>{search ? "Try another name or phone number." : "Add a contact to start a conversation."}</p><button className="partner-message" onClick={openAddContact}><Icon name="plus" size={16}/> Add a contact</button></div>}
          </div>
        </aside>

        <section className={`conversation-panel ${mobileOpenChat ? "conversation-panel-mobile-open" : ""}`} aria-label="Conversation">
          {selectedChat ? <>
            <header className="conversation-header"><button className="mobile-back" onClick={() => setMobileOpenChat(false)} aria-label="Back to contacts"><Icon name="back"/></button><div className="contact-summary"><span className="person-avatar person-avatar-large">{getInitials(selectedChat.name)}</span><span><strong>{selectedChat.name}</strong><small>{selectedChat.phone}</small></span></div><div className="conversation-call-actions"><button className="call-action-button" onClick={() => setActiveCall("voice")} aria-label={`Voice call ${selectedChat.name}`} title="Voice call"><Icon name="phone" size={17}/></button><button className="call-action-button" onClick={() => setActiveCall("video")} aria-label={`Video call ${selectedChat.name}`} title="Video call"><Icon name="video" size={18}/></button><button className="edit-contact-button" onClick={() => openEditContact(selectedChat.id)}>Edit</button></div></header>
            <div className="chat-canvas"><div className="day-divider"><span>Today</span></div><div className="message-stack">
              {selectedChat.messages.map((msg) => <div key={msg.id} className={`message-row ${msg.sender === "me" ? "message-row-me" : ""}`}><div className={`message-bubble ${msg.sender === "me" ? "message-bubble-me" : "message-bubble-them"}`}><p>{msg.text}</p><span className="message-meta">{msg.sender === "me" ? "You · " : ""}{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(msg.sentAt))}<span className="message-check">{msg.sender === "me" ? "✓✓" : ""}</span></span></div></div>)}
              {selectedChat.messages.length === 0 && <div className="first-message"><span className="empty-spark">✳</span><p>This is the beginning of your conversation with <strong>{selectedChat.name}</strong>.</p><span>Send a message to say hello.</span></div>}
            </div></div>
            <form className="composer-wrap" onSubmit={sendMessage}>
              {isEmojiPickerOpen && <div className="emoji-picker" role="dialog" aria-label="Choose an emoji"><div className="emoji-picker-heading"><strong>Choose an emoji</strong><button type="button" onClick={() => setIsEmojiPickerOpen(false)} aria-label="Close emoji picker"><Icon name="close" size={15}/></button></div><div className="emoji-category-tabs">{(Object.keys(EMOJI_CATEGORIES) as EmojiCategory[]).map((category) => <button type="button" key={category} className={emojiCategory === category ? "emoji-category-active" : ""} onClick={() => setEmojiCategory(category)}>{category}</button>)}</div><div className="emoji-grid">{EMOJI_CATEGORIES[emojiCategory].map((emoji, index) => <button type="button" key={`${emoji}-${index}`} aria-label={`Insert ${emoji}`} onClick={() => { setMessage((current) => `${current}${emoji}`); setIsEmojiPickerOpen(false); }}>{emoji}</button>)}</div></div>}
              <div className="composer"><input aria-label="Type a message" placeholder="Write a message…" value={message} onChange={(event) => setMessage(event.target.value)}/><button className="composer-tool" type="button" aria-label="Choose an emoji" title="Choose an emoji" aria-expanded={isEmojiPickerOpen} onClick={() => setIsEmojiPickerOpen((current) => !current)}><Icon name="smile" size={19}/></button><button className="send-button" type="submit" aria-label="Send message" title="Send message" disabled={!message.trim()}><Icon name="send" size={18}/></button></div>
            </form>
          </> : <div className="empty-chat"><span className="empty-spark">✳</span><h2>Start a conversation</h2><p>Choose a contact or add someone new.</p><button className="partner-message" onClick={openAddContact}><Icon name="plus" size={16}/> Add a contact</button></div>}
        </section>
      </> : activeSection === "language" ? <section className="language-section">
        <header className="language-heading"><span className="eyebrow">MEET SOMEONE NEW</span><h1>Language exchange<span className="heading-period">.</span></h1><p>Practise a language through real conversations. Find a partner who is learning yours, too.</p></header>
        <div className="language-tools"><label className="search-field"><Icon name="search" size={18}/><input aria-label="Search language partners" placeholder="Search by name or language" value={search} onChange={(event) => setSearch(event.target.value)}/></label><button className="language-preference" onClick={openAddContact}><Icon name="language" size={17}/> Add your languages</button></div>
        <div className="language-section-label"><span>LANGUAGE PARTNERS</span><span>{languagePartners.length.toString().padStart(2, "0")}</span></div>
        {languagePartners.length ? <div className="partner-grid">{languagePartners.map((partner, index) => <article className="partner-card" key={partner.id}><div className="partner-card-top"><span className={`person-avatar person-avatar-${index % 6} partner-avatar`}>{getInitials(partner.name)}</span><span className="partner-status">{partner.nativeLanguage || "Language not set"}</span></div><h2>{partner.name}</h2><p className="partner-level">{partner.phone}</p><div className="partner-languages"><span><small>Speaks</small><strong>{partner.nativeLanguage || "Not set"}</strong></span><span className="partner-arrow">↔</span><span><small>Learning</small><strong>{partner.learningLanguage}</strong></span></div><button className="partner-message" onClick={() => openChat(partner.id)}><Icon name="chat" size={15}/> Open chat</button></article>)}</div> : <div className="empty-language"><span className="empty-spark"><Icon name="language" size={25}/></span><h2>No language partners yet</h2><p>Add a contact and include the language they speak and the one they are learning. They will appear here.</p><button className="partner-message" onClick={() => { openAddContact(); }}><Icon name="plus" size={16}/> Add a language partner</button></div>}
      </section> : <section className="settings-section"><header className="settings-heading"><h1>Settings<span className="heading-period">.</span></h1><p>Your preferences are saved in this browser.</p></header><div className="settings-card"><div className="settings-card-heading"><div><h2>Appearance</h2><p>Choose the look that feels right for you.</p></div><Icon name="settings" size={19}/></div><div className="theme-options"><button className={`theme-option ${settings.theme === "light" ? "theme-option-active" : ""}`} onClick={() => setSettings((current) => ({ ...current, theme: "light" }))}><span className="theme-preview theme-preview-light"><i/><i/></span><span>Light</span>{settings.theme === "light" && <span className="preference-check">✓</span>}</button><button className={`theme-option ${settings.theme === "dark" ? "theme-option-active" : ""}`} onClick={() => setSettings((current) => ({ ...current, theme: "dark" }))}><span className="theme-preview theme-preview-dark"><i/><i/></span><span>Dark</span>{settings.theme === "dark" && <span className="preference-check">✓</span>}</button></div></div><div className="settings-card"><div className="settings-card-heading"><div><h2>Chat list</h2><p>Adjust how conversations appear.</p></div><Icon name="chat" size={19}/></div><button className="setting-toggle-row" role="switch" aria-checked={settings.compactChats} onClick={() => setSettings((current) => ({ ...current, compactChats: !current.compactChats }))}><span><strong>Compact layout</strong><small>Show more chats in less space.</small></span><i className={`toggle-track ${settings.compactChats ? "toggle-track-on" : ""}`}><b/></i></button><button className="setting-toggle-row" role="switch" aria-checked={settings.showPreviews} onClick={() => setSettings((current) => ({ ...current, showPreviews: !current.showPreviews }))}><span><strong>Message previews</strong><small>Show the latest message in the chat list.</small></span><i className={`toggle-track ${settings.showPreviews ? "toggle-track-on" : ""}`}><b/></i></button></div></section>}
      </div>

      {isContactModalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeContactModal(); }}>
        <section className="contact-modal edit-contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
          <header className="contact-modal-heading"><button className="modal-cancel-link" onClick={closeContactModal}>Cancel</button><h2 id="contact-modal-title">{editingContact ? "Edit contact" : "Add contact"}</h2><button className="modal-done-link" type="submit" form="contact-details-form">Done</button></header>
          <form id="contact-details-form" className="contact-form" onSubmit={saveContact}>
            <div className="contact-name-fields"><label>First name<input autoFocus name="firstName" placeholder="First name" required maxLength={60} defaultValue={editingNameParts[0] ?? ""}/></label><label>Last name<input name="lastName" placeholder="Last name" maxLength={60} defaultValue={editingNameParts.slice(1).join(" ")}/></label></div>
            <label className="contact-username-label">Username<input name="username" placeholder="Username" maxLength={30} defaultValue={editingContact?.username ?? ""}/></label>
            <div className="contact-phone-fields"><label>Country<select name="countryCode" defaultValue={editingCountryCode}>{PHONE_COUNTRIES.map((country) => <option value={country.code} key={country.code}>{country.name} ({country.code})</option>)}</select></label><label>Mobile<input name="mobile" type="tel" placeholder="Mobile number" required minLength={7} autoComplete="tel-national" defaultValue={editingMobile}/></label></div>
            <div className="sync-phone-row"><span><strong>Sync contact to phone</strong><small>Device contact sync is not available in the browser.</small></span><input type="checkbox" role="switch" aria-label="Sync contact to phone" disabled checked={false} readOnly/></div>
            <details className="language-details" open={Boolean(editingContact?.nativeLanguage || editingContact?.learningLanguage)}><summary>Language exchange details <span>Optional</span></summary><div className="language-selects"><label>Speaks<select name="nativeLanguage" defaultValue={editingContact?.nativeLanguage ?? ""}><option value="">Select a language</option>{LANGUAGES.map((language) => <option key={language}>{language}</option>)}</select></label><label>Learning<select name="learningLanguage" defaultValue={editingContact?.learningLanguage ?? ""}><option value="">Select a language</option>{LANGUAGES.map((language) => <option key={language}>{language}</option>)}</select></label></div></details>
            {formError && <p className="form-error" role="alert">{formError}</p>}
          </form>
          {editingContact && <button className="delete-contact-button" onClick={() => setConfirmDeleteContactId(editingContact.id)}>Delete contact</button>}
        </section>
      </div>}
      {activeCall && selectedChat && <div className="modal-backdrop call-backdrop"><section className="call-screen" role="dialog" aria-modal="true" aria-labelledby="call-screen-title"><div className="call-screen-status">{activeCall === "video" ? "VIDEO CALL" : "VOICE CALL"}</div><span className="person-avatar call-avatar">{getInitials(selectedChat.name)}</span><h2 id="call-screen-title">{selectedChat.name}</h2><p>Calling is not connected yet</p><span className="call-screen-note">Set up a calling service to connect real calls.</span><button className="end-call-button" onClick={() => setActiveCall(null)} aria-label="End call"><Icon name="phone" size={20}/></button><button className="call-cancel-link" onClick={() => setActiveCall(null)}>Close</button></section></div>}
      {confirmDeleteContactId && <div className="modal-backdrop confirm-backdrop"><section className="delete-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-contact-title"><h2 id="delete-contact-title">Delete this contact?</h2><p>This will remove the contact and its chat from this browser. This action cannot be undone.</p><div><button className="cancel-button" onClick={() => setConfirmDeleteContactId(null)}>Cancel</button><button className="confirm-delete-button" onClick={() => deleteContact(confirmDeleteContactId)}>Delete contact</button></div></section></div>}
    </main>
  );
}
