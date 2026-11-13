"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import NavigationIcon from "@/components/NavigationIcon";
import { EMOJI_CATEGORIES, type EmojiCategory } from "@/lib/emojis";
import { createClient } from "@/lib/supabase/client";
import CallWindow from "@/components/calls/CallWindow";
import CommunityPage from "@/components/CommunityPage";
import CallLogPage from "@/components/CallLogPage";
import StatusPage from "@/components/StatusPage";

type Message = { id: string; text: string; sender: "me" | "them"; sentAt: string; audioData?: string; audioType?: string; mediaData?: string; mediaType?: string; mediaName?: string; sharedContact?: { name: string; phone: string }; edited?: boolean; forwarded?: boolean; replyTo?: { id: string; text: string; sender: "me" | "them" } };
type ChatTheme = "classic" | "sage" | "ocean" | "sunset" | "lavender" | "rose" | "mint" | "slate" | "amber" | "teal" | "sky" | "pink" | "yellow";
type Settings = { theme: "light" | "dark"; chatTheme: ChatTheme; compactChats: boolean; showPreviews: boolean };
type Chat = {
  id: string;
  name: string;
  phone: string;
  email?: string;
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
  archived: boolean;
  unreadCount: number;
  messages: Message[];
};

const STORAGE_KEY = "lingo:chats:v1";
const SETTINGS_KEY = "lingo:settings:v1";
const DEFAULT_SETTINGS: Settings = { theme: "light", chatTheme: "classic", compactChats: false, showPreviews: true };
const LANGUAGES = ["Arabic", "English", "French", "Japanese", "Portuguese", "Spanish", "Other"];
const PHONE_COUNTRIES = [
  { name: "South Africa", code: "+27" }, { name: "United States", code: "+1" },
  { name: "United Kingdom", code: "+44" }, { name: "Kenya", code: "+254" },
  { name: "Nigeria", code: "+234" }, { name: "Australia", code: "+61" },
  { name: "India", code: "+91" }, { name: "France", code: "+33" },
  { name: "Japan", code: "+81" }, { name: "Brazil", code: "+55" },
];
function Icon({ name, size = 20 }: { name: "search" | "plus" | "smile" | "send" | "chat" | "language" | "back" | "close" | "more" | "pin" | "settings" | "phone" | "video" | "mic" | "stop" | "attach" | "edit" | "archive" | "reply" | "copy" | "forward" | "trash"; size?: number }) {
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
    mic: <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2"/>,
    attach: <path d="m21.4 11.1-8.7 8.7a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7L9.9 17a2 2 0 0 1-2.8-2.8l8.5-8.5"/>,
    edit: <><path d="m15 5 4 4"/><path d="m4 20 4.5-1 10.8-10.8a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z"/></>,
    archive: <><path d="M3 4h18v4H3z"/><path d="M5 8v12h14V8M10 12h4"/></>,
    reply: <><path d="m10 17-5-5 5-5"/><path d="M5 12h8a6 6 0 0 1 6 6v1"/></>,
    copy: <><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    forward: <><path d="m14 5 7 7-7 7"/><path d="M21 12H10a6 6 0 0 0-6 6"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m4 4v7m6-7v7"/></>,
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

function getChatActivityTime(chat: Chat) {
  return chat.messages.reduce((latest, message) => Math.max(latest, Date.parse(message.sentAt) || 0), Date.parse(chat.createdAt) || 0);
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
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [areSettingsLoaded, setAreSettingsLoaded] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileUploading, setProfileUploading] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [messageMenuMoreId, setMessageMenuMoreId] = useState<string | null>(null);
  const [messageInfoId, setMessageInfoId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceNoteError, setVoiceNoteError] = useState("");
  const [chatMediaData, setChatMediaData] = useState("");
  const [chatMediaType, setChatMediaType] = useState("");
  const [chatMediaName, setChatMediaName] = useState("");
  const [chatMediaError, setChatMediaError] = useState("");
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isContactPickerOpen, setIsContactPickerOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<EmojiCategory>("Smileys");
  const [search, setSearch] = useState("");
  const [practiceWord, setPracticeWord] = useState<string | null>(null);
  const [savedPracticeWords, setSavedPracticeWords] = useState<string[]>([]);
  const [practiceText, setPracticeText] = useState("¿Quieres quedar para tomar un café mañana?");
  const [practiceLanguage, setPracticeLanguage] = useState("es");
  const [practiceMeaning, setPracticeMeaning] = useState("");
  const [practiceLookupBusy, setPracticeLookupBusy] = useState(false);
  const [activeSection, setActiveSection] = useState<"chats" | "language" | "community" | "call-log" | "status" | "settings">("chats");
  const [mobileOpenChat, setMobileOpenChat] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "pinned" | "archived">("all");
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [confirmDeleteContactId, setConfirmDeleteContactId] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<"voice" | "video" | null>(null);
  const [formError, setFormError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const cancelRecordingRef = useRef(false);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) setChats(parsed.map((chat, index) => ({
          ...chat,
          createdAt: chat.createdAt || new Date(Date.now() - index).toISOString(),
          pinned: Boolean(chat.pinned),
          archived: Boolean(chat.archived),
          unreadCount: Number(chat.unreadCount) || 0,
        })) as Chat[]);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const requestedSection = new URLSearchParams(window.location.search).get("section");
    if (requestedSection === "chats" || requestedSection === "language" || requestedSection === "community" || requestedSection === "call-log" || requestedSection === "status" || requestedSection === "settings") {
      setActiveSection(requestedSection);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("lingo:vocabulary:v1");
      if (saved) setSavedPracticeWords(JSON.parse(saved));
    } catch { window.localStorage.removeItem("lingo:vocabulary:v1"); }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("lingo:vocabulary:v1", JSON.stringify(savedPracticeWords));
  }, [savedPracticeWords]);

  useEffect(() => {
    if (!practiceWord) return;
    const controller = new AbortController();
    setPracticeLookupBusy(true);
    setPracticeMeaning("");
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/${practiceLanguage}/${encodeURIComponent(practiceWord)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("No definition found for this word.");
        const entries = await response.json();
        const definition = entries[0]?.meanings?.[0]?.definitions?.[0]?.definition;
        if (!definition) throw new Error("No definition found for this word.");
        setPracticeMeaning(definition);
      })
      .catch((error: unknown) => { if (error instanceof Error && error.name !== "AbortError") setPracticeMeaning(error.message); })
      .finally(() => setPracticeLookupBusy(false));
    return () => controller.abort();
  }, [practiceWord, practiceLanguage]);

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
    if (areSettingsLoaded) {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      window.dispatchEvent(new Event("lingo:settings-change"));
    }
  }, [settings, areSettingsLoaded]);

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get("section");
    if (section === "language" || section === "settings") setActiveSection(section);
  }, []);

  useEffect(() => {
    if (isLoaded) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats, isLoaded]);

  useEffect(() => {
    if (!isRecordingVoice) return;
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isRecordingVoice]);

  useEffect(() => {
    if (recordingSeconds >= 120 && isRecordingVoice) mediaRecorderRef.current?.stop();
  }, [recordingSeconds, isRecordingVoice]);

  useEffect(() => () => {
    cancelRecordingRef.current = true;
    mediaRecorderRef.current?.stop();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const selectedChat = chats.find((chat) => chat.id === selectedChatId);
  const filteredChats = useMemo(() => chats
    .filter((chat) => `${chat.name} ${chat.email ?? ""} ${chat.phone}`.toLowerCase().includes(search.toLowerCase()))
    .filter((chat) => activeFilter === "archived" ? chat.archived : !chat.archived && (activeFilter === "all" || (activeFilter === "unread" ? chat.unreadCount > 0 : chat.pinned)))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || getChatActivityTime(b) - getChatActivityTime(a)),
  [chats, search, activeFilter]);
  const languagePartners = useMemo(() => chats.filter((chat) => chat.learningLanguage && `${chat.name} ${chat.nativeLanguage} ${chat.learningLanguage}`.toLowerCase().includes(search.toLowerCase())), [chats, search]);
  const activeChats = chats.filter((chat) => !chat.archived);
  const unreadChatsCount = activeChats.filter((chat) => chat.unreadCount > 0).length;
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
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const countryCode = String(formData.get("countryCode") ?? "+27");
    const mobile = String(formData.get("mobile") ?? "").trim().replace(/\D/g, "").replace(/^0+/, "");
    const phone = mobile ? `${countryCode} ${mobile}`.trim() : "";
    const digits = phone.replace(/\D/g, "");
    if (!firstName || (!editingContactId && !email) || (mobile && digits.length < 7)) {
      setFormError("Enter a name and the email they use for this app. If you add a phone number, check that it has at least 7 digits.");
      return;
    }
    if (email && chats.some((chat) => chat.id !== editingContactId && chat.email?.toLowerCase() === email)) {
      setFormError("A contact with this email already exists.");
      return;
    }
    if (digits && chats.some((chat) => chat.id !== editingContactId && chat.phone.replace(/\D/g, "") === digits)) {
      setFormError("A contact with this phone number already exists.");
      return;
    }
    const contactFields = {
      name,
      phone,
      email,
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
      const contact: Chat = { id: crypto.randomUUID(), ...contactFields, time: "New contact", createdAt: new Date().toISOString(), pinned: false, archived: false, unreadCount: 0, messages: [] };
      const nextChats = [contact, ...chats];
      setChats(nextChats);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextChats));
      setSelectedChatId(contact.id);
      setActiveSection("chats");
      setMobileOpenChat(true);
    }
    setIsContactModalOpen(false);
    setFormError("");
    setSearch("");
    if (!editingContactId) router.push(`/messages?email=${encodeURIComponent(email)}`);
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

  function startVoiceRecording() {
    setVoiceNoteError("");
    if (!selectedChatId) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceNoteError("Voice recording isn’t supported in this browser.");
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      cancelRecordingRef.current = false;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : undefined;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => setVoiceNoteError("Recording failed. Please try again.");
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecordingVoice(false);
        if (cancelRecordingRef.current) {
          audioChunksRef.current = [];
          return;
        }
        if (blob.size === 0) {
          setVoiceNoteError("No audio was recorded. Please try again.");
          return;
        }
        if (blob.size > 1_500_000) {
          setVoiceNoteError("That recording is too large to save. Please record a shorter note.");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const audioData = String(reader.result ?? "");
          const sentAt = new Date().toISOString();
          const voiceMessage: Message = { id: crypto.randomUUID(), text: "", sender: "me", sentAt, audioData, audioType: blob.type };
          setChats((current) => current.map((chat) => chat.id === selectedChatId ? { ...chat, time: "Now", unreadCount: 0, messages: [...chat.messages, voiceMessage] } : chat));
          setVoiceNoteError("");
        };
        reader.onerror = () => setVoiceNoteError("Couldn’t save that recording. Please try again.");
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setRecordingSeconds(0);
      setIsRecordingVoice(true);
    }).catch(() => setVoiceNoteError("Allow microphone access to record a voice note."));
  }

  function stopVoiceRecording(cancel = false) {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    cancelRecordingRef.current = cancel;
    recorder.stop();
  }

  function beginEditMessage(msg: Message) {
    setOpenMessageMenuId(null);
    setMessageMenuMoreId(null);
    setEditingMessageId(msg.id);
    setEditingMessageText(msg.text);
  }

  function saveEditedMessage(event: FormEvent<HTMLFormElement>, messageId: string) {
    event.preventDefault();
    const text = editingMessageText.trim();
    if (!text || !selectedChatId) return;
    setChats((current) => current.map((chat) => chat.id === selectedChatId ? {
      ...chat,
      messages: chat.messages.map((msg) => msg.id === messageId ? { ...msg, text, edited: true } : msg),
    } : chat));
    setEditingMessageId(null);
    setEditingMessageText("");
  }

  function cancelEditMessage() {
    setEditingMessageId(null);
    setEditingMessageText("");
  }

  function deleteMessage(messageId: string) {
    if (!selectedChatId) return;
    setChats((current) => current.map((chat) => chat.id === selectedChatId
      ? { ...chat, messages: chat.messages.filter((msg) => msg.id !== messageId) }
      : chat));
    setOpenMessageMenuId(null);
    setMessageMenuMoreId(null);
    if (editingMessageId === messageId) cancelEditMessage();
  }

  function replyToMessage(msg: Message) {
    setReplyingTo(msg);
    setOpenMessageMenuId(null);
    setMessageMenuMoreId(null);
  }

  async function copyMessage(msg: Message) {
    const copyText = msg.text || msg.mediaName || (msg.audioData ? "Voice note" : "Media message");
    try { await navigator.clipboard.writeText(copyText); } catch { /* Clipboard may be unavailable in this browser context. */ }
    setOpenMessageMenuId(null);
  }

  function forwardMessageTo(chatId: string) {
    if (!forwardingMessage) return;
    const sentAt = new Date().toISOString();
    const forwarded: Message = { ...forwardingMessage, id: crypto.randomUUID(), sender: "me", sentAt, forwarded: true, edited: false, replyTo: undefined };
    setChats((current) => current.map((chat) => chat.id === chatId ? { ...chat, time: "Now", messages: [...chat.messages, forwarded] } : chat));
    setForwardingMessage(null);
    setOpenMessageMenuId(null);
  }

  function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const text = message.trim();
    if ((!text && !chatMediaData) || !selectedChatId) return;
    const sentAt = new Date().toISOString();
    const replyTo = replyingTo ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.sender } : undefined;
    setChats((current) => current.map((chat) => chat.id === selectedChatId ? { ...chat, time: "Now", unreadCount: 0, messages: [...chat.messages, { id: crypto.randomUUID(), text, sender: "me", sentAt, ...(replyTo ? { replyTo } : {}), ...(chatMediaData ? { mediaData: chatMediaData, mediaType: chatMediaType, mediaName: chatMediaName } : {}) }] } : chat));
    setMessage("");
    setReplyingTo(null);
    clearChatMedia();
    setIsEmojiPickerOpen(false);
  }

  function clearChatMedia() {
    setChatMediaData("");
    setChatMediaType("");
    setChatMediaName("");
    setChatMediaError("");
    if (documentInputRef.current) documentInputRef.current.value = "";
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (audioInputRef.current) audioInputRef.current.value = "";
  }

  function chooseChatMedia(file?: File, kind: "document" | "photo" | "video" | "audio" = "photo") {
    if (!file) return;
    const validType = kind === "photo" ? file.type.startsWith("image/")
      : kind === "video" ? file.type.startsWith("video/")
        : kind === "audio" ? file.type.startsWith("audio/")
          : /^(application|text)\//.test(file.type) || /\.(pdf|docx?|xlsx?|pptx?|txt|csv|rtf|odt|ods|odp)$/i.test(file.name);
    if (!validType) {
      setChatMediaError(`Choose a valid ${kind} file.`);
      return;
    }
    // Messages are stored in localStorage, so keep uploads small enough to avoid filling browser storage.
    if (file.size > 1024 * 1024) {
      setChatMediaError("Files must be 1 MB or smaller in this chat.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setChatMediaData(String(reader.result ?? ""));
      setChatMediaType(file.type || "application/octet-stream");
      setChatMediaName(file.name);
      setChatMediaError("");
    };
    reader.onerror = () => setChatMediaError("Couldn’t load that file. Please try again.");
    reader.readAsDataURL(file);
  }

  function shareContact(contact: Chat) {
    if (!selectedChatId) return;
    const sentAt = new Date().toISOString();
    setChats((current) => current.map((chat) => chat.id === selectedChatId ? {
      ...chat,
      time: "Now",
      unreadCount: 0,
      messages: [...chat.messages, { id: crypto.randomUUID(), text: "", sender: "me", sentAt, sharedContact: { name: contact.name, phone: contact.phone } }],
    } : chat));
    setIsContactPickerOpen(false);
    setIsAttachmentMenuOpen(false);
  }

  function openChat(chatId: string) {
    setSelectedChatId(chatId);
    setChats((current) => current.map((chat) => chat.id === chatId ? { ...chat, unreadCount: 0 } : chat));
    setOpenMenuChatId(null);
    setActiveSection("chats");
    setMobileOpenChat(true);
  }

  function updateChat(chatId: string, updates: Partial<Pick<Chat, "pinned" | "archived" | "unreadCount">>) {
    setChats((current) => current.map((chat) => chat.id === chatId ? { ...chat, ...updates } : chat));
    if (updates.archived && selectedChatId === chatId) {
      setSelectedChatId(null);
      setMobileOpenChat(false);
    }
    setOpenMenuChatId(null);
  }

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      const avatar = data.user?.user_metadata?.avatar_url;
      if (typeof avatar === "string") setProfileImage(avatar);
    });
  }, []);

  async function uploadProfilePicture(file?: File) {
    if (!file) return;
    setProfileMessage("");
    if (!file.type.startsWith("image/")) { setProfileMessage("Choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setProfileMessage("Choose an image smaller than 5 MB."); return; }
    setProfileUploading(true);
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) { setProfileMessage("Sign in before uploading a profile picture."); setProfileUploading(false); return; }
    const path = `${user.id}/profile`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      setProfileMessage(uploadError.message.includes("Bucket not found") ? "The Supabase Storage bucket named avatars has not been created yet." : uploadError.message);
      setProfileUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${publicUrl}?updated=${Date.now()}`;
    const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
    if (updateError) setProfileMessage(updateError.message);
    else { setProfileImage(avatarUrl); setProfileMessage("Profile picture updated."); }
    setProfileUploading(false);
  }

  return (
    <main className={`messenger-shell ${settings.theme === "dark" ? "theme-dark" : ""}`}>
      <aside className="rail" aria-label="Main navigation">
        <a className="brand-mark" href="#chats" aria-label="Home"><Image src="/lingo-logo.jpg" alt="" width={42} height={42} priority /></a>
        <button className={`rail-button ${activeSection === "chats" ? "rail-button-active" : ""}`} onClick={() => { setActiveSection("chats"); setMobileOpenChat(false); }} aria-label="Chats" title="Chats"><NavigationIcon name="chats"/></button>
        <button className={`rail-button ${activeSection === "language" ? "rail-button-active" : ""}`} onClick={() => { setActiveSection("language"); setSearch(""); }} aria-label="Language exchange" title="Language exchange"><NavigationIcon name="language"/></button>
        <button className={`rail-button ${activeSection === "status" ? "rail-button-active" : ""}`} onClick={() => { setActiveSection("status"); setMobileOpenChat(false); }} aria-label="Status" title="Status"><NavigationIcon name="status"/></button>
        <button className={`rail-button community-rail-button ${activeSection === "community" ? "rail-button-active" : ""}`} onClick={() => { setActiveSection("community"); setMobileOpenChat(false); }} aria-label="Community" title="Community"><Image className="community-rail-image" src="/community-icon.svg" alt="" width={28} height={28}/></button>
        <button className={`rail-button ${activeSection === "call-log" ? "rail-button-active" : ""}`} onClick={() => { setActiveSection("call-log"); setMobileOpenChat(false); }} aria-label="Call log" title="Call log"><NavigationIcon name="call-log"/></button>
        <a className="rail-button" href="/wallet" aria-label="Wallet" title="Wallet"><NavigationIcon name="wallet"/></a>
          <button className={`rail-button ${activeSection === "settings" ? "rail-button-active" : ""}`} onClick={() => { setActiveSection("settings"); setMobileOpenChat(false); }} aria-label="Settings" title="Settings"><NavigationIcon name="settings"/></button>
          <button className="rail-button" onClick={async () => { try { await createClient().auth.signOut(); } finally { router.replace("/signup"); router.refresh(); } }} aria-label="Log out" title="Log out"><NavigationIcon name="logout"/></button>
        <div className="rail-spacer" />
        <div className="rail-profile" aria-label="Your profile">{profileImage ? <img src={profileImage} alt=""/> : "Y"}</div>
      </aside>

      <div className={`dashboard-content ${settings.theme === "dark" ? "theme-dark" : ""} ${settings.compactChats ? "compact-chats" : ""}`}>
      {activeSection === "chats" ? <>
        <aside className={`inbox ${mobileOpenChat ? "inbox-mobile-hidden" : ""}`} id="chats">
          <header className="inbox-heading"><div><span className="eyebrow">YOUR CONVERSATIONS</span><h1>Messages<span className="heading-period">.</span></h1></div><button className="new-chat-button" onClick={openAddContact} aria-label="Add a contact" title="Add a contact"><Icon name="plus" size={21}/></button></header>
          <label className="search-field"><Icon name="search" size={18}/><input aria-label="Search contacts" placeholder="Search by name or number" value={search} onChange={(event) => setSearch(event.target.value)}/></label>
          <div className="filter-row" aria-label="Filter chats">
            <button className={`filter-chip ${activeFilter === "all" ? "filter-chip-active" : ""}`} onClick={() => setActiveFilter("all")}>All chats <span>{activeChats.length}</span></button>
            <button className={`filter-chip ${activeFilter === "unread" ? "filter-chip-active" : ""}`} onClick={() => setActiveFilter("unread")}>Unread <span>{unreadChatsCount}</span></button>
            <button className={`filter-chip ${activeFilter === "pinned" ? "filter-chip-active" : ""}`} onClick={() => setActiveFilter("pinned")}>Pinned <span>{activeChats.filter((chat) => chat.pinned).length}</span></button>
            <button className={`filter-chip ${activeFilter === "archived" ? "filter-chip-active" : ""}`} onClick={() => setActiveFilter("archived")}>Archived <span>{chats.filter((chat) => chat.archived).length}</span></button>
          </div>
          <div className="inbox-section-label"><span>{activeFilter === "unread" ? "UNREAD CHATS" : activeFilter === "pinned" ? "PINNED CHATS" : activeFilter === "archived" ? "ARCHIVED CHATS" : "RECENT CHATS"}</span><span>{filteredChats.length.toString().padStart(2, "0")}</span></div>
          <div className="conversation-list">
            {filteredChats.map((chat, index) => {
              const lastMessage = getLastMessage(chat);
              return <div className="conversation-entry" key={chat.id}>
                <button className={`conversation ${selectedChatId === chat.id ? "conversation-active" : ""} ${chat.unreadCount ? "conversation-unread" : ""}`} onClick={() => openChat(chat.id)}>
                  <span className={`person-avatar person-avatar-${index % 6}`}>{getInitials(chat.name)}</span>
                  <span className="conversation-copy"><span className="conversation-top"><strong>{chat.name}{chat.pinned && <Icon name="pin" size={12}/>}</strong><time>{formatChatTime(chat)}</time></span><span className="conversation-preview">{settings.showPreviews ? lastMessage ? <>{lastMessage.sender === "me" && <span className="read-check">✓ </span>}{lastMessage.sharedContact ? `Contact: ${lastMessage.sharedContact.name}` : lastMessage.mediaData ? lastMessage.mediaName || "Media" : lastMessage.audioData ? "Voice note" : lastMessage.text}</> : chat.about || "No messages yet" : "Open chat to view messages"}</span></span>
                  {chat.unreadCount > 0 && <span className="unread-count">{chat.unreadCount > 99 ? "99+" : chat.unreadCount}</span>}
                </button>
                <button className="conversation-menu-trigger" aria-label={`Chat options for ${chat.name}`} title="Chat options" onClick={() => setOpenMenuChatId((current) => current === chat.id ? null : chat.id)}><Icon name="more" size={17}/></button>
                {openMenuChatId === chat.id && <div className="conversation-menu" role="menu"><button role="menuitem" onClick={() => updateChat(chat.id, { archived: !chat.archived })}><Icon name="archive" size={15}/>{chat.archived ? "Unarchive chat" : "Archive chat"}</button><button role="menuitem" onClick={() => updateChat(chat.id, { pinned: !chat.pinned })}><Icon name="pin" size={15}/>{chat.pinned ? "Unpin chat" : "Pin chat"}</button><button role="menuitem" onClick={() => updateChat(chat.id, { unreadCount: chat.unreadCount ? 0 : 1 })}><Icon name="chat" size={15}/>{chat.unreadCount ? "Mark as read" : "Mark as unread"}</button></div>}
              </div>;
            })}
            {filteredChats.length === 0 && <div className="empty-inbox"><span className="empty-spark">✳</span><h2>{search ? "No contacts found" : activeFilter === "unread" ? "No unread chats" : activeFilter === "pinned" ? "No pinned chats" : activeFilter === "archived" ? "No archived chats" : "Your chats start here"}</h2><p>{search ? "Try another name or phone number." : activeFilter === "unread" ? "New unread messages will show up here." : activeFilter === "pinned" ? "Pin a chat to keep it easy to find." : activeFilter === "archived" ? "Chats you archive will appear here." : "Add a contact to start a conversation."}</p>{activeFilter === "all" && <button className="partner-message" onClick={openAddContact}><Icon name="plus" size={16}/> Add a contact</button>}</div>}
          </div>
        </aside>

        <section className={`conversation-panel ${mobileOpenChat ? "conversation-panel-mobile-open" : ""}`} aria-label="Conversation">
          {selectedChat ? <>
            <header className="conversation-header"><button className="mobile-back" onClick={() => setMobileOpenChat(false)} aria-label="Back to contacts"><Icon name="back"/></button><div className="contact-summary"><span className="person-avatar person-avatar-large">{getInitials(selectedChat.name)}</span><span><strong>{selectedChat.name}</strong><small>{selectedChat.phone}</small></span></div><div className="conversation-call-actions"><button className="call-action-button" onClick={() => setActiveCall("voice")} aria-label={`Voice call ${selectedChat.name}`} title="Voice call"><Icon name="phone" size={17}/></button><button className="call-action-button" onClick={() => setActiveCall("video")} aria-label={`Video call ${selectedChat.name}`} title="Video call"><Icon name="video" size={18}/></button><button className="edit-contact-button" onClick={() => openEditContact(selectedChat.id)}>Edit</button></div></header>
            <div className={`chat-canvas chat-theme-${settings.chatTheme}`} onClick={() => { setOpenMessageMenuId(null); setMessageMenuMoreId(null); setMessageInfoId(null); }}><div className="day-divider"><span>Today</span></div><div className="message-stack">
              {selectedChat.messages.map((msg) => <div key={msg.id} className={`message-row ${msg.sender === "me" ? "message-row-me" : ""}`}><div className={`message-bubble ${msg.sender === "me" ? "message-bubble-me" : "message-bubble-them"}`} tabIndex={0} aria-haspopup="menu" aria-expanded={openMessageMenuId === msg.id} onClick={(event) => { if ((event.target as HTMLElement).closest("button,a,input,textarea,audio,video")) return; event.stopPropagation(); setOpenMessageMenuId((current) => current === msg.id ? null : msg.id); setMessageMenuMoreId(null); setMessageInfoId(null); }} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpenMessageMenuId((current) => current === msg.id ? null : msg.id); } }}> 
                {msg.forwarded && <small className="message-forwarded-label">Forwarded</small>}{msg.replyTo && <div className="message-reply-quote"><strong>{msg.replyTo.sender === "me" ? "You" : selectedChat.name}</strong><span>{msg.replyTo.text || "Media message"}</span></div>}{msg.audioData && <div className="voice-note-content"><Icon name="mic" size={16}/><audio controls preload="metadata" src={msg.audioData} aria-label="Voice note playback" /></div>}
                {msg.sharedContact && <div className="shared-contact-card"><span className="shared-contact-avatar">{getInitials(msg.sharedContact.name)}</span><span><strong>{msg.sharedContact.name}</strong><small>{msg.sharedContact.phone}</small></span></div>}
                {msg.mediaData && !msg.mediaType?.startsWith("image/") && !msg.mediaType?.startsWith("video/") && !msg.mediaType?.startsWith("audio/") && <a className="shared-document-card" href={msg.mediaData} download={msg.mediaName || "shared-document"}><Icon name="attach" size={19}/><span><strong>{msg.mediaName || "Document"}</strong><small>Download file</small></span></a>}
                {msg.mediaData && msg.mediaType?.startsWith("image/") && <img className="chat-message-media" src={msg.mediaData} alt={msg.mediaName || "Shared image"} />}
                {msg.mediaData && msg.mediaType?.startsWith("video/") && <video className="chat-message-media" controls preload="metadata" src={msg.mediaData} aria-label={msg.mediaName || "Shared video"} />}
                {msg.mediaData && msg.mediaType?.startsWith("audio/") && <div className="voice-note-content"><Icon name="attach" size={16}/><audio controls preload="metadata" src={msg.mediaData} aria-label={msg.mediaName || "Shared audio"} /></div>}
                {msg.text && (editingMessageId === msg.id ? <form className="message-edit-form" onSubmit={(event) => saveEditedMessage(event, msg.id)}><textarea aria-label="Edit message text" maxLength={2000} autoFocus value={editingMessageText} onChange={(event) => setEditingMessageText(event.target.value)} /><div><button type="button" onClick={cancelEditMessage}>Cancel</button><button type="submit" disabled={!editingMessageText.trim()}>Save</button></div></form> : <p className={msg.sender === "me" ? "message-editable-text" : ""}>{msg.text}</p>)}
                <span className="message-meta">{msg.sender === "me" ? "You · " : ""}{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(msg.sentAt))}{msg.edited && <span>Edited</span>}{msg.sender === "me" && <span className="message-check">✓</span>}</span>
                {openMessageMenuId === msg.id && <div className="message-action-menu" role="menu" onClick={(event) => event.stopPropagation()}>{messageMenuMoreId === msg.id ? <><div className="message-action-menu-title"><button type="button" onClick={() => { setMessageMenuMoreId(null); setMessageInfoId(null); }}>‹</button><strong>More</strong></div><button role="menuitem" onClick={() => setMessageInfoId((current) => current === msg.id ? null : msg.id)}>Message info <Icon name="more" size={17}/></button>{messageInfoId === msg.id && <div className="message-info-details"><strong>{msg.sender === "me" ? "You" : selectedChat.name}</strong><span>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(msg.sentAt))}</span></div>}</> : <><button role="menuitem" onClick={() => replyToMessage(msg)}>Reply <Icon name="reply" size={19}/></button><button role="menuitem" onClick={() => { void copyMessage(msg); }}>Copy <Icon name="copy" size={19}/></button>{msg.sender === "me" && msg.text && <button role="menuitem" onClick={() => beginEditMessage(msg)}>Edit <Icon name="edit" size={18}/></button>}<button role="menuitem" onClick={() => { setForwardingMessage(msg); setOpenMessageMenuId(null); }}>Forward <Icon name="forward" size={19}/></button><button className="message-action-delete" role="menuitem" onClick={() => deleteMessage(msg.id)}>Delete <Icon name="trash" size={19}/></button><button role="menuitem" onClick={() => setMessageMenuMoreId(msg.id)}>More... <Icon name="more" size={19}/></button></>}</div>}
              </div></div>)}
              {selectedChat.messages.length === 0 && <div className="first-message"><span className="empty-spark">✳</span><p>This is the beginning of your conversation with <strong>{selectedChat.name}</strong>.</p><span>Send a message to say hello.</span></div>}
            </div></div>
            <form className="composer-wrap" onSubmit={sendMessage}>
              {replyingTo && <div className="reply-compose-preview"><span><strong>Replying to {replyingTo.sender === "me" ? "yourself" : selectedChat.name}</strong><small>{replyingTo.text || replyingTo.mediaName || "Media message"}</small></span><button type="button" aria-label="Cancel reply" onClick={() => setReplyingTo(null)}>×</button></div>}
              <input ref={documentInputRef} className="chat-attachment-input" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.*,text/*" aria-label="Choose a document" onChange={(event) => chooseChatMedia(event.target.files?.[0], "document")} />
              <input ref={photoInputRef} className="chat-attachment-input" type="file" accept="image/*" aria-label="Choose a photo" onChange={(event) => chooseChatMedia(event.target.files?.[0], "photo")} />
              <input ref={videoInputRef} className="chat-attachment-input" type="file" accept="video/*" aria-label="Choose a video" onChange={(event) => chooseChatMedia(event.target.files?.[0], "video")} />
              <input ref={audioInputRef} className="chat-attachment-input" type="file" accept="audio/*" aria-label="Choose an audio file" onChange={(event) => chooseChatMedia(event.target.files?.[0], "audio")} />
              {isEmojiPickerOpen && <div className="emoji-picker" role="dialog" aria-label="Choose an emoji"><div className="emoji-picker-heading"><strong>Choose an emoji</strong><button type="button" onClick={() => setIsEmojiPickerOpen(false)} aria-label="Close emoji picker"><Icon name="close" size={15}/></button></div><div className="emoji-category-tabs">{(Object.keys(EMOJI_CATEGORIES) as EmojiCategory[]).map((category) => <button type="button" key={category} className={emojiCategory === category ? "emoji-category-active" : ""} onClick={() => setEmojiCategory(category)}>{category}</button>)}</div><div className="emoji-grid">{EMOJI_CATEGORIES[emojiCategory].map((emoji, index) => <button type="button" key={`${emoji}-${index}`} aria-label={`Insert ${emoji}`} onClick={() => { setMessage((current) => `${current}${emoji}`); setIsEmojiPickerOpen(false); }}>{emoji}</button>)}</div></div>}
              {isAttachmentMenuOpen && <div className="chat-attachment-menu" role="menu" aria-label="Add to message">{isContactPickerOpen ? <><div className="chat-attachment-menu-heading"><button type="button" onClick={() => setIsContactPickerOpen(false)}>‹ Back</button><strong>Share a contact</strong></div><div className="chat-contact-picker">{chats.filter((contact) => contact.id !== selectedChatId).map((contact) => <button type="button" key={contact.id} role="menuitem" onClick={() => shareContact(contact)}><span className="shared-contact-avatar">{getInitials(contact.name)}</span><span><strong>{contact.name}</strong><small>{contact.phone}</small></span></button>)}{chats.filter((contact) => contact.id !== selectedChatId).length === 0 && <p>Add another saved contact before sharing one.</p>}</div></> : <><button type="button" role="menuitem" onClick={() => { setIsAttachmentMenuOpen(false); documentInputRef.current?.click(); }}>▤ <span><strong>Documents</strong><small>PDF, Word, spreadsheets, and more</small></span></button><button type="button" role="menuitem" onClick={() => { setIsAttachmentMenuOpen(false); photoInputRef.current?.click(); }}>▧ <span><strong>Photos</strong><small>Choose an image</small></span></button><button type="button" role="menuitem" onClick={() => { setIsAttachmentMenuOpen(false); videoInputRef.current?.click(); }}>▹ <span><strong>Videos</strong><small>Choose a video</small></span></button><button type="button" role="menuitem" onClick={() => { setIsAttachmentMenuOpen(false); audioInputRef.current?.click(); }}>♫ <span><strong>Audio</strong><small>Choose an audio file</small></span></button><button type="button" role="menuitem" onClick={() => setIsContactPickerOpen(true)}>♙ <span><strong>Contacts</strong><small>Share a saved contact</small></span></button></>}</div>}
              {chatMediaData && <div className="chat-media-preview">{chatMediaType.startsWith("image/") ? <img src={chatMediaData} alt="Attachment preview"/> : chatMediaType.startsWith("video/") ? <video src={chatMediaData} controls/> : <span className={chatMediaType.startsWith("audio/") ? "chat-media-audio" : "chat-media-document"}><Icon name="attach" size={17}/>{chatMediaName}</span>}<span className="chat-media-name">{chatMediaName}</span><button type="button" className="chat-media-remove" onClick={clearChatMedia} aria-label="Remove attachment">Remove</button></div>}
              <div className={`composer ${isRecordingVoice ? "composer-recording" : ""}`}><input aria-label="Type a message" placeholder={isRecordingVoice ? "Recording voice note…" : "Write a message…"} value={message} disabled={isRecordingVoice} onChange={(event) => setMessage(event.target.value)}/>{isRecordingVoice ? <><span className="recording-timer">● {Math.floor(recordingSeconds / 60).toString().padStart(2, "0")}:{(recordingSeconds % 60).toString().padStart(2, "0")}</span><button className="voice-note-cancel" type="button" aria-label="Cancel recording" title="Cancel recording" onClick={() => stopVoiceRecording(true)}><Icon name="close" size={17}/></button><button className="voice-note-button voice-note-recording" type="button" aria-label="Stop and send voice note" title="Stop and send voice note" onClick={() => stopVoiceRecording()}><Icon name="stop" size={17}/></button></> : <><button className="composer-tool" type="button" aria-label="Add attachment" title="Add attachment" aria-expanded={isAttachmentMenuOpen} onClick={() => { setIsAttachmentMenuOpen((current) => !current); setIsContactPickerOpen(false); }}><Icon name="attach" size={18}/></button><button className="composer-tool" type="button" aria-label="Choose an emoji" title="Choose an emoji" aria-expanded={isEmojiPickerOpen} onClick={() => setIsEmojiPickerOpen((current) => !current)}><Icon name="smile" size={19}/></button><button className="voice-note-button" type="button" aria-label="Record voice note" title="Record voice note" onClick={startVoiceRecording}><Icon name="mic" size={18}/></button><button className="send-button" type="submit" aria-label="Send message" title="Send message" disabled={!message.trim() && !chatMediaData}><Icon name="send" size={18}/></button></>}</div>{(voiceNoteError || chatMediaError) && <p className="voice-note-error" role="alert">{voiceNoteError || chatMediaError}</p>}
            </form>
          </> : <div className="empty-chat"><span className="empty-spark">✳</span><h2>Start a conversation</h2><p>Choose a contact or add someone new.</p><button className="partner-message" onClick={openAddContact}><Icon name="plus" size={16}/> Add a contact</button></div>}
        </section>
      </> : activeSection === "language" ? <section className="language-section">
        <header className="language-heading"><span className="eyebrow">MEET SOMEONE NEW</span><h1>Language exchange<span className="heading-period">.</span></h1><p>Practise a language through real conversations. Find a partner who is learning yours, too.</p></header>
        <div className="language-tools"><label className="search-field"><Icon name="search" size={18}/><input aria-label="Search language partners" placeholder="Search by name or language" value={search} onChange={(event) => setSearch(event.target.value)}/></label><button className="language-preference" onClick={openAddContact}><Icon name="language" size={17}/> Add your languages</button></div>
        <section className="practice-card" aria-labelledby="practice-title"><div className="practice-intro"><span className="eyebrow">PRACTICE STUDIO</span><h2 id="practice-title">Make a real phrase your next lesson.</h2><p>Choose the language, paste or write a phrase, then tap any word to look it up and save it.</p><label className="practice-select-label">I’m practising<select value={practiceLanguage} onChange={(event) => { setPracticeLanguage(event.target.value); setPracticeWord(null); }}><option value="es">Spanish</option><option value="en">English</option><option value="fr">French</option><option value="de">German</option><option value="pt">Portuguese</option><option value="it">Italian</option></select></label></div><div className="practice-demo"><div className="practice-demo-label"><span>YOUR PRACTICE PHRASE</span><span>Tap a word below</span></div><textarea className="practice-input" aria-label="Practice phrase" value={practiceText} onChange={(event) => { setPracticeText(event.target.value); setPracticeWord(null); }} placeholder="Write or paste a phrase…"/><div className="practice-token-row">{practiceText.match(/[\p{L}\p{M}'’-]+|[^\p{L}\p{M}'’-]+/gu)?.map((token, index) => /^[\p{L}\p{M}]/u.test(token) ? <button key={`${token}-${index}`} className={`practice-word ${practiceWord === token.replace(/[.,!?;:]+$/u, "") ? "practice-word-active" : ""}`} onClick={() => setPracticeWord(token.replace(/[.,!?;:]+$/u, ""))}>{token}</button> : <span key={`space-${index}`}>{token}</span>)}</div>{practiceWord && <div className="practice-definition"><div><small>{practiceLanguage.toUpperCase()} <span>→</span> ENGLISH</small><strong>{practiceWord}</strong><span>{practiceLookupBusy ? "Looking up definition…" : practiceMeaning || "No definition available."}</span></div><div className="practice-actions"><button aria-label="Play pronunciation" onClick={() => { if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(practiceWord); utterance.lang = practiceLanguage; window.speechSynthesis.speak(utterance); } }}>▶</button><button disabled={savedPracticeWords.includes(practiceWord)} onClick={() => setSavedPracticeWords((words) => words.includes(practiceWord) ? words : [...words, practiceWord])}>{savedPracticeWords.includes(practiceWord) ? "Saved ✓" : "+ Save word"}</button></div></div>}<div className="practice-demo-foot"><span>Definitions from Free Dictionary API · pronunciation from your browser</span><span className="saved-word-count">{savedPracticeWords.length} saved word{savedPracticeWords.length === 1 ? "" : "s"}{savedPracticeWords.length > 0 ? ` · ${savedPracticeWords.join(", ")}` : ""}</span></div></div></section>
        <div className="language-section-label"><span>LANGUAGE PARTNERS</span><span>{languagePartners.length.toString().padStart(2, "0")}</span></div>
        {languagePartners.length ? <div className="partner-grid">{languagePartners.map((partner, index) => <article className="partner-card" key={partner.id}><div className="partner-card-top"><span className={`person-avatar person-avatar-${index % 6} partner-avatar`}>{getInitials(partner.name)}</span><span className="partner-status">{partner.nativeLanguage || "Language not set"}</span></div><h2>{partner.name}</h2><p className="partner-level">{partner.phone}</p><div className="partner-languages"><span><small>Speaks</small><strong>{partner.nativeLanguage || "Not set"}</strong></span><span className="partner-arrow">↔</span><span><small>Learning</small><strong>{partner.learningLanguage}</strong></span></div><button className="partner-message" onClick={() => openChat(partner.id)}><Icon name="chat" size={15}/> Open chat</button></article>)}</div> : <div className="empty-language"><span className="empty-spark"><Icon name="language" size={25}/></span><h2>No language partners yet</h2><p>Add a contact and include the language they speak and the one they are learning. They will appear here.</p><button className="partner-message" onClick={() => { openAddContact(); }}><Icon name="plus" size={16}/> Add a language partner</button></div>}
      </section> : activeSection === "community" ? <CommunityPage contacts={chats.map(({ id, name }) => ({ id, name }))} /> : activeSection === "call-log" ? <CallLogPage /> : activeSection === "status" ? <StatusPage embedded /> : <section className="settings-section">
        <header className="settings-heading">
          <h1>Settings<span className="heading-period">.</span></h1>
          <p>Your preferences are saved in this browser.</p>
        </header>
        <div className="settings-card">
          <div className="settings-card-heading"><div><h2>Profile picture</h2><p>Add or change the photo shown on your profile.</p></div></div>
          <div className="profile-picture-controls"><span className="profile-picture-preview">{profileImage ? <img src={profileImage} alt="Your profile"/> : "Y"}</span><label className="profile-picture-upload">{profileUploading ? "Uploading…" : profileImage ? "Change picture" : "Choose picture"}<input type="file" accept="image/*" disabled={profileUploading} onChange={(event) => { void uploadProfilePicture(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }}/></label><small>Image up to 5 MB</small></div>
          {profileMessage && <p className="profile-picture-message" role="status">{profileMessage}</p>}
        </div>
        <div className="settings-card">
          <div className="settings-card-heading">
            <div><h2>Appearance</h2><p>Choose the look that feels right for you.</p></div>
            <Icon name="settings" size={19}/>
          </div>
          <div className="theme-options">
            <button className={`theme-option ${settings.theme === "light" ? "theme-option-active" : ""}`} onClick={() => setSettings((current) => ({ ...current, theme: "light" }))}>
              <span className="theme-preview theme-preview-light"><i/><i/></span><span>Light</span>
              {settings.theme === "light" && <span className="preference-check">✓</span>}
            </button>
            <button className={`theme-option ${settings.theme === "dark" ? "theme-option-active" : ""}`} onClick={() => setSettings((current) => ({ ...current, theme: "dark" }))}>
              <span className="theme-preview theme-preview-dark"><i/><i/></span><span>Dark</span>
              {settings.theme === "dark" && <span className="preference-check">✓</span>}
            </button>
          </div>
        </div>
        <div className="settings-card">
          <div className="settings-card-heading">
            <div><h2>Chat themes</h2><p>Choose colors for the conversation background and message bubbles.</p></div>
            <Icon name="chat" size={19}/>
          </div>
          <div className="chat-theme-options">
            {(["classic", "sage", "ocean", "sunset", "lavender", "rose", "mint", "slate", "amber", "teal", "sky", "pink", "yellow"] as ChatTheme[]).map((chatTheme) => (
              <button
                key={chatTheme}
                className={`chat-theme-option ${settings.chatTheme === chatTheme ? "chat-theme-option-active" : ""}`}
                aria-pressed={settings.chatTheme === chatTheme}
                onClick={() => setSettings((current) => ({ ...current, chatTheme }))}
              >
                <span className={`chat-theme-preview chat-theme-preview-${chatTheme}`}>
                  <i/><i/>
                </span>
                <span>{chatTheme === "sky" ? "Sky blue" : chatTheme === "yellow" ? "Light yellow" : chatTheme.charAt(0).toUpperCase() + chatTheme.slice(1)}</span>
                {settings.chatTheme === chatTheme && <span className="preference-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-card">
          <div className="settings-card-heading">
            <div><h2>Chat list</h2><p>Adjust how conversations appear.</p></div>
            <Icon name="chat" size={19}/>
          </div>
          <button className="setting-toggle-row" role="switch" aria-checked={settings.compactChats} onClick={() => setSettings((current) => ({ ...current, compactChats: !current.compactChats }))}>
            <span><strong>Compact layout</strong><small>Show more chats in less space.</small></span>
            <i className={`toggle-track ${settings.compactChats ? "toggle-track-on" : ""}`}><b/></i>
          </button>
          <button className="setting-toggle-row" role="switch" aria-checked={settings.showPreviews} onClick={() => setSettings((current) => ({ ...current, showPreviews: !current.showPreviews }))}>
            <span><strong>Message previews</strong><small>Show the latest message in the chat list.</small></span>
            <i className={`toggle-track ${settings.showPreviews ? "toggle-track-on" : ""}`}><b/></i>
          </button>
        </div>
      </section>}
      </div>

      {isContactModalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeContactModal(); }}>
        <section className="contact-modal edit-contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
          <header className="contact-modal-heading"><button className="modal-cancel-link" onClick={closeContactModal}>Cancel</button><h2 id="contact-modal-title">{editingContact ? "Edit contact" : "Add contact"}</h2><button className="modal-done-link" type="submit" form="contact-details-form">{editingContact ? "Save" : "Save & message"}</button></header>
          <form id="contact-details-form" className="contact-form" onSubmit={saveContact}>
            {!editingContact && <p className="contact-save-note">Enter the email they use to sign in. They need an account with a confirmed email. The phone number is optional contact information.</p>}
            <div className="contact-name-fields"><label>First name<input autoFocus name="firstName" placeholder="First name" required maxLength={60} defaultValue={editingNameParts[0] ?? ""}/></label><label>Last name<input name="lastName" placeholder="Last name" maxLength={60} defaultValue={editingNameParts.slice(1).join(" ")}/></label></div>
            <label className="contact-username-label">Account email<input name="email" type="email" placeholder="friend@example.com" required={!editingContact} defaultValue={editingContact?.email ?? ""}/></label>
            <label className="contact-username-label">Username<input name="username" placeholder="Username" maxLength={30} defaultValue={editingContact?.username ?? ""}/></label>
            {!editingContact && <p>Use the email they sign in with. They need an account and a confirmed email. Phone is optional.</p>}
            <div className="contact-phone-fields"><label>Country<select name="countryCode" defaultValue={editingCountryCode}>{PHONE_COUNTRIES.map((country) => <option value={country.code} key={country.code}>{country.name} ({country.code})</option>)}</select></label><label>Mobile (optional)<input name="mobile" type="tel" placeholder="Mobile number" minLength={7} autoComplete="tel-national" defaultValue={editingMobile}/></label></div>
            <div className="sync-phone-row"><span><strong>Sync contact to phone</strong><small>Device contact sync is not available in the browser.</small></span><input type="checkbox" role="switch" aria-label="Sync contact to phone" disabled checked={false} readOnly/></div>
            <details className="language-details" open={Boolean(editingContact?.nativeLanguage || editingContact?.learningLanguage)}><summary>Language exchange details <span>Optional</span></summary><div className="language-selects"><label>Speaks<select name="nativeLanguage" defaultValue={editingContact?.nativeLanguage ?? ""}><option value="">Select a language</option>{LANGUAGES.map((language) => <option key={language}>{language}</option>)}</select></label><label>Learning<select name="learningLanguage" defaultValue={editingContact?.learningLanguage ?? ""}><option value="">Select a language</option>{LANGUAGES.map((language) => <option key={language}>{language}</option>)}</select></label></div></details>
            {formError && <p className="form-error" role="alert">{formError}</p>}
          </form>
          {editingContact && <button className="delete-contact-button" onClick={() => setConfirmDeleteContactId(editingContact.id)}>Delete contact</button>}
        </section>
      </div>}
      {activeCall && selectedChat && <CallWindow overlay contactName={selectedChat.name} callType={activeCall} onClose={() => setActiveCall(null)} />}
      {confirmDeleteContactId && <div className="modal-backdrop confirm-backdrop"><section className="delete-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-contact-title"><h2 id="delete-contact-title">Delete this contact?</h2><p>This will remove the contact and its chat from this browser. This action cannot be undone.</p><div><button className="cancel-button" onClick={() => setConfirmDeleteContactId(null)}>Cancel</button><button className="confirm-delete-button" onClick={() => deleteContact(confirmDeleteContactId)}>Delete contact</button></div></section></div>}
    {forwardingMessage && <div className="message-forward-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setForwardingMessage(null); }}><section className="message-forward-dialog" role="dialog" aria-modal="true" aria-labelledby="forward-message-title"><header><div><span className="eyebrow">SHARE MESSAGE</span><h2 id="forward-message-title">Forward message</h2></div><button type="button" aria-label="Close" onClick={() => setForwardingMessage(null)}>×</button></header><p className="forward-message-preview">{forwardingMessage.text || forwardingMessage.mediaName || (forwardingMessage.audioData ? "Voice note" : "Media message")}</p><strong className="forward-recipient-label">Choose a chat</strong><div className="forward-recipient-list">{chats.map((chat) => <button type="button" key={chat.id} onClick={() => forwardMessageTo(chat.id)}><span className="person-avatar">{getInitials(chat.name)}</span><span><strong>{chat.name}</strong><small>{chat.phone}</small></span><Icon name="forward" size={17}/></button>)}</div></section></div>}
    </main>
  );
}
