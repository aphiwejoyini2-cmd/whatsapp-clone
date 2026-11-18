"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import NavigationIcon from "./NavigationIcon";

export const EMOJI_CATEGORIES = {
  Smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥳", "😔", "😢", "😭", "😤", "😠", "🤯"],
  Gestures: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "👍", "👎", "✊", "👊", "👏", "🙌", "👐", "🤲", "🤝", "🙏"],
  Hearts: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟"],
  Objects: ["🎉", "🎊", "✨", "⭐", "🌟", "🔥", "💯", "✅", "🎵", "🎶", "📷", "🎁", "💡", "💬", "📱", "💻", "📚", "☕", "🍕", "🌍"],
} as const;
export type EmojiCategory = keyof typeof EMOJI_CATEGORIES;

const STATUS_KEY = "lingo:statuses:v1";
const SETTINGS_KEY = "lingo:settings:v1";
const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000;
type Status = { id: string; text: string; createdAt: string; mediaData?: string; mediaType?: string };

function sortStatuses(statuses: Status[]) {
  return [...statuses].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function removeExpiredStatuses(statuses: Status[], now = Date.now()) {
  return sortStatuses(statuses).filter((status) => {
    const createdAt = Date.parse(status.createdAt);
    return Number.isFinite(createdAt) && now - createdAt < STATUS_LIFETIME_MS;
  });
}

function readDarkMode(value?: string | null) {
  try {
    const stored = value ?? window.localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored).theme === "dark" : false;
  } catch {
    return false;
  }
}

function readStatuses(): Status[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STATUS_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    const activeStatuses = removeExpiredStatuses(value as Status[]);
    window.localStorage.setItem(STATUS_KEY, JSON.stringify(activeStatuses));
    return activeStatuses;
  } catch {
    return [];
  }
}

export default function StatusPage({ embedded = false }: { embedded?: boolean }) {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [draft, setDraft] = useState("");
  const [mediaData, setMediaData] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState<Status | null>(null);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  const [isStatusListOpen, setIsStatusListOpen] = useState(false);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [statusListMessage, setStatusListMessage] = useState("");
  const [error, setError] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<EmojiCategory>("Smileys");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStatuses(readStatuses());
    setIsDarkMode(readDarkMode());

    const expiryTimer = window.setInterval(() => {
      setStatuses(readStatuses());
    }, 60_000);

    function handleStorageChange(event: StorageEvent) {
      if (event.key === SETTINGS_KEY) setIsDarkMode(readDarkMode(event.newValue));
    }
    function handleSettingsChange() {
      setIsDarkMode(readDarkMode());
    }

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("lingo:settings-change", handleSettingsChange);
    return () => {
      window.clearInterval(expiryTimer);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("lingo:settings-change", handleSettingsChange);
    };
  }, []);

  useEffect(() => {
    if (!activeStatus) return;
    const timer = window.setTimeout(() => {
      const nextIndex = activeStatusIndex + 1;
      if (nextIndex < statuses.length) {
        setActiveStatusIndex(nextIndex);
        setActiveStatus(statuses[nextIndex]);
      } else {
        setActiveStatus(null);
        setActiveStatusIndex(0);
      }
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [activeStatus, activeStatusIndex, statuses]);

  useEffect(() => {
    if (activeStatus && !statuses.some((status) => status.id === activeStatus.id)) {
      setActiveStatus(null);
      setActiveStatusIndex(0);
    }
  }, [activeStatus, statuses]);

  function publishStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text && !mediaData) return;
    const next = sortStatuses([{ id: crypto.randomUUID(), text, createdAt: new Date().toISOString(), ...(mediaData ? { mediaData, mediaType } : {}) }, ...statuses]);
    try {
      window.localStorage.setItem(STATUS_KEY, JSON.stringify(next));
      setStatuses(next);
    } catch {
      setError("There isn’t enough browser storage for this media. Try a smaller file.");
      return;
    }
    setDraft("");
    setMediaData("");
    setMediaType("");
    setError("");
    setIsEmojiPickerOpen(false);
    setIsComposerOpen(false);
  }

  function chooseMedia(file?: File) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Choose an image or video file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Choose a file smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMediaData(String(reader.result ?? ""));
      setMediaType(file.type);
    };
    reader.onerror = () => setError("Couldn’t read that file. Please try another.");
    reader.readAsDataURL(file);
  }

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? draft.length;
    const end = textarea?.selectionEnd ?? draft.length;
    const nextDraft = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
    setDraft(nextDraft);
    setIsEmojiPickerOpen(false);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  function openStatuses() {
    if (!statuses.length) {
      setIsComposerOpen(true);
      return;
    }
    setIsStatusListOpen(true);
  }

  function viewStatus(status: Status) {
    const index = statuses.findIndex((item) => item.id === status.id);
    if (index < 0) return;
    setIsStatusListOpen(false);
    setActiveStatusIndex(index);
    setActiveStatus(status);
  }

  function deleteStatusFromList(statusId: string) {
    const nextStatuses = statuses.filter((status) => status.id !== statusId);
    window.localStorage.setItem(STATUS_KEY, JSON.stringify(nextStatuses));
    setStatuses(nextStatuses);
    setStatusMenuId(null);
    setStatusListMessage("Status deleted.");
  }

  async function shareStatusFromList(status: Status, action: "share" | "forward") {
    setStatusMenuId(null);
    setStatusListMessage("");
    const title = action === "forward" ? "Forward status" : "Share status";
    const shareData: ShareData = { title, text: status.text || "Status update" };
    try {
      if (status.mediaData) {
        const response = await fetch(status.mediaData);
        const blob = await response.blob();
        const extension = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "bin";
        const file = new File([blob], `status-${status.id}.${extension}`, { type: blob.type });
        if (navigator.canShare?.({ files: [file] })) shareData.files = [file];
      }
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(status.text || "Status update");
        setStatusListMessage("Status text copied to clipboard.");
      } else {
        setStatusListMessage("Sharing isn’t supported in this browser.");
      }
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") return;
      setStatusListMessage("Couldn’t share this status. Try again.");
    }
  }

  function navigateStatus(direction: -1 | 1) {
    const nextIndex = activeStatusIndex + direction;
    if (nextIndex < 0 || nextIndex >= statuses.length) return;
    setActiveStatusIndex(nextIndex);
    setActiveStatus(statuses[nextIndex]);
  }

  function navigateStatusByTap(event: React.MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, video, input")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    navigateStatus(event.clientX < bounds.left + bounds.width / 2 ? -1 : 1);
  }

  function deleteActiveStatus() {
    if (!activeStatus) return;
    const nextStatuses = sortStatuses(statuses.filter((status) => status.id !== activeStatus.id));
    setStatuses(nextStatuses);
    window.localStorage.setItem(STATUS_KEY, JSON.stringify(nextStatuses));

    if (nextStatuses.length === 0) {
      setActiveStatus(null);
      setActiveStatusIndex(0);
      return;
    }

    const nextIndex = Math.min(activeStatusIndex, nextStatuses.length - 1);
    setActiveStatusIndex(nextIndex);
    setActiveStatus(nextStatuses[nextIndex]);
  }

  const StatusContainer = embedded ? "section" : "main";
  return <StatusContainer className={`status-page ${embedded ? "status-page-embedded" : ""} ${isDarkMode ? "theme-dark" : ""}`}>
    {!embedded && (<aside className="status-nav" aria-label="Main navigation"><a className="status-brand-mark" href="/chat" aria-label="Home"><Image src="/lingo-logo.jpg" alt="" width={42} height={42} priority /></a><a className="status-nav-link" href="/chat" aria-label="Chats" title="Chats"><NavigationIcon name="chats"/></a><a className="status-nav-link" href="/chat?section=language" aria-label="Language exchange" title="Language exchange"><NavigationIcon name="language"/></a><a className="status-nav-link status-nav-link-active" href="/status" aria-label="Status" title="Status"><NavigationIcon name="status"/></a><a className="status-nav-link" href="/chat?section=community" aria-label="Community" title="Community"><Image className="community-rail-image" src="/community-icon.svg" alt="" width={28} height={28}/></a><a className="status-nav-link" href="/chat?section=call-log" aria-label="Call log" title="Call log"><NavigationIcon name="call-log"/></a><span className="status-nav-spacer"/><a className="status-nav-link" href="/chat?section=settings" aria-label="Settings" title="Settings"><NavigationIcon name="settings"/></a><span className="status-nav-profile">Y</span></aside>)}

    <section className="status-layout">
      <header className="status-heading"><div><span className="status-eyebrow">LITTLE MOMENTS, SHARED</span><h1>Status<span>.</span></h1><p>Share a quick update with your contacts.</p></div></header>
      <div className="status-content">
        <section className="status-list-panel" aria-label="Status updates">
          <div className="status-section-title"><h2>Recent updates</h2><span>{statuses.length}</span></div>
          <button className="my-status-row" onClick={openStatuses}><span className="status-avatar status-avatar-own">{statuses.length ? "Y" : "＋"}</span><span className="status-row-copy"><strong>My status</strong><small>{statuses.length ? `${statuses.length} update${statuses.length === 1 ? "" : "s"} · Tap to view` : "Share a photo or text update"}</small></span>{!statuses.length && <span className="status-row-add">Add</span>}</button>
          <div className="status-divider" />
          {statuses.length ? <button className="status-row" onClick={openStatuses}><span className="status-avatar status-avatar-ring">Y</span><span className="status-row-copy"><strong>Your updates</strong><small>Tap to view your status updates</small></span><span className="status-row-chevron">›</span></button> : <div className="status-empty-list"><span>✳</span><strong>No recent updates</strong><small>When your contacts share a status, it will appear here.</small></div>}
          <div className="status-privacy-note"><span>⌑</span><p>Status updates disappear after <strong>24 hours</strong> in WhatsApp. This prototype keeps updates in this browser.</p></div>
        </section>
        <section className="status-preview-panel status-add-panel" aria-label="Add a status">
          <button className="status-new-button status-new-button-centered" type="button" onClick={() => setIsComposerOpen(true)}>＋ <span>Add status</span></button>
        </section>
        
      </div>
    </section>
    {isComposerOpen && <div className="status-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setIsComposerOpen(false); setIsEmojiPickerOpen(false); setError(""); } }}><section className="status-compose-modal" role="dialog" aria-modal="true" aria-labelledby="status-compose-title"><header><div><span className="status-eyebrow">NEW UPDATE</span><h2 id="status-compose-title">Share a status</h2></div><button onClick={() => { setIsComposerOpen(false); setIsEmojiPickerOpen(false); setError(""); }} aria-label="Close">×</button></header><form onSubmit={publishStatus}><label htmlFor="status-text">{mediaData ? "Write a caption" : "What’s on your mind?"}</label><div className="status-textarea-wrap"><textarea ref={textareaRef} id="status-text" autoFocus maxLength={280} placeholder={mediaData ? "Add a caption to your photo or video…" : "Share a little moment…"} value={draft} onChange={(event) => setDraft(event.target.value)} /><div className="composer-wrap status-emoji-wrap">{isEmojiPickerOpen && <div className="emoji-picker" role="dialog" aria-label="Choose an emoji"><div className="emoji-picker-heading"><strong>Choose an emoji</strong><button type="button" onClick={() => setIsEmojiPickerOpen(false)} aria-label="Close emoji picker"><svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m18 6-12 12M6 6l12 12"/></svg></button></div><div className="emoji-category-tabs">{(Object.keys(EMOJI_CATEGORIES) as EmojiCategory[]).map((category) => <button type="button" key={category} className={emojiCategory === category ? "emoji-category-active" : ""} onClick={() => setEmojiCategory(category)}>{category}</button>)}</div><div className="emoji-grid">{EMOJI_CATEGORIES[emojiCategory].map((emoji, index) => <button type="button" key={`${emoji}-${index}`} aria-label={`Insert ${emoji}`} onClick={() => insertEmoji(emoji)}>{emoji}</button>)}</div></div>}<button className="composer-tool" type="button" aria-label="Choose an emoji" title="Choose an emoji" aria-expanded={isEmojiPickerOpen} onClick={() => setIsEmojiPickerOpen((open) => !open)}><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg></button></div></div><input ref={mediaInputRef} className="status-media-input" type="file" accept="image/*,video/*" onChange={(event) => chooseMedia(event.target.files?.[0])} /><div className="status-media-actions"><button className="status-emoji-toggle" type="button" onClick={() => mediaInputRef.current?.click()}>＋ Add photo or video</button>{mediaData && <button className="status-media-remove" type="button" onClick={() => { setMediaData(""); setMediaType(""); if (mediaInputRef.current) mediaInputRef.current.value = ""; }}>Remove media</button>}</div>{mediaData && <div className="status-media-preview">{mediaType.startsWith("video/") ? <video src={mediaData} controls /> : <img src={mediaData} alt="Status media preview" />}</div>}<div className="status-compose-meta"><span>{error || (mediaData ? "Your caption will appear with the media" : "Add text, media, or both")}</span><span>{draft.length}/280</span></div><button className="status-publish-button" disabled={!draft.trim() && !mediaData}>Share status</button></form></section></div>}
    {isStatusListOpen && <div className="status-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setIsStatusListOpen(false); setStatusMenuId(null); } }}><section className="status-list-modal" role="dialog" aria-modal="true" aria-labelledby="status-list-title"><header><div><span className="status-eyebrow">YOUR UPDATES</span><h2 id="status-list-title">My status</h2></div><button type="button" aria-label="Close status list" onClick={() => { setIsStatusListOpen(false); setStatusMenuId(null); }}>×</button></header>{statusListMessage && <p className="status-list-message" role="status">{statusListMessage}</p>}<div className="status-list-items">{[...statuses].reverse().map((status) => <div className="status-list-item-wrap" key={status.id}><button className="status-list-item" type="button" onClick={() => viewStatus(status)}>{status.mediaData ? status.mediaType?.startsWith("video/") ? <video src={status.mediaData} muted /> : <img src={status.mediaData} alt="" /> : <span className="status-list-text-preview">{status.text || "Text status"}</span>}<span className="status-list-item-copy"><strong>{status.text || (status.mediaType?.startsWith("video/") ? "Video status" : "Photo status")}</strong><small>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(status.createdAt))}</small></span></button><button className="status-list-menu-trigger" type="button" aria-label={`More options for status posted ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(status.createdAt))}`} aria-expanded={statusMenuId === status.id} onClick={() => setStatusMenuId((current) => current === status.id ? null : status.id)}><span/><span/><span/></button>{statusMenuId === status.id && <div className="status-list-action-menu" role="menu"><button type="button" role="menuitem" onClick={() => deleteStatusFromList(status.id)}>Delete</button><button type="button" role="menuitem" onClick={() => void shareStatusFromList(status, "forward")}>Forward</button><button type="button" role="menuitem" onClick={() => void shareStatusFromList(status, "share")}>Share</button></div>}</div>)}</div></section></div>}
    {activeStatus && <div className="status-modal-backdrop" onClick={() => setActiveStatus(null)}><section className={`status-viewer ${activeStatus.mediaData && !activeStatus.mediaType?.startsWith("video/") ? "status-viewer-has-image" : ""}`} role="dialog" aria-modal="true" aria-label="Status update" onClick={(event) => event.stopPropagation()} onPointerUp={navigateStatusByTap}><div className="status-viewer-progress"><i key={activeStatus.id}/></div><header><span className="status-avatar status-viewer-avatar">Y</span><span><strong>You</strong><small>{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(activeStatus.createdAt))} · {activeStatusIndex + 1} of {statuses.length}</small></span><button className="status-viewer-dismiss" type="button" aria-label="Close status" title="Close status" onPointerUp={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setActiveStatus(null); }}>×</button></header>{activeStatus.mediaData && (activeStatus.mediaType?.startsWith("video/") ? <video className="status-viewer-media" src={activeStatus.mediaData} controls autoPlay /> : <img className="status-viewer-media status-viewer-image" src={activeStatus.mediaData} alt="Status" />)}{activeStatus.text && <p>{activeStatus.text}</p>}</section></div>}
  </StatusContainer>;
}
