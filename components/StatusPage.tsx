"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import NavigationIcon from "./NavigationIcon";
import { createClient } from "@/lib/supabase/client";


const STATUS_KEY = "lingo:statuses:v1";
const SETTINGS_KEY = "lingo:settings:v1";
const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000;
type Status = { id: string; text: string; createdAt: string; mediaData?: string; mediaType?: string; ownerId?: string; viewCount?: number };

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

export default function StatusPage({ embedded = false, hidden = false }: { embedded?: boolean; hidden?: boolean }) {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [contactStatuses, setContactStatuses] = useState<Status[]>([]);
  const [viewingStatuses, setViewingStatuses] = useState<Status[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [draft, setDraft] = useState("");
  const [mediaData, setMediaData] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState<Status | null>(null);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  const [isStatusListOpen, setIsStatusListOpen] = useState(false);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [statusListMessage, setStatusListMessage] = useState("");
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const localStatuses = readStatuses();
    setStatuses(localStatuses);
    setIsDarkMode(readDarkMode());
    let cancelled = false;
    const supabase = createClient();
    const refreshStatuses = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user || userError) {
        setCurrentUserId(null);
        setStatuses(readStatuses());
        setContactStatuses([]);
        return;
      }
      setCurrentUserId(user.id);

      const localToMigrate = readStatuses();
      if (localToMigrate.length) {
        const { error: migrationError } = await supabase.from("status_updates").upsert(
          localToMigrate.map((status) => ({
            id: status.id,
            owner_id: user.id,
            text: status.text,
            media_data: status.mediaData ?? null,
            media_type: status.mediaType ?? null,
            created_at: status.createdAt,
          })),
          { onConflict: "id", ignoreDuplicates: true },
        );
        if (!migrationError) window.localStorage.removeItem(STATUS_KEY);
      }

      const expiryCutoff = new Date(Date.now() - STATUS_LIFETIME_MS).toISOString();
      await supabase.from("status_updates").delete().eq("owner_id", user.id).lt("created_at", expiryCutoff);
      const { data, error: statusError } = await supabase.from("status_updates")
        .select("id, owner_id, text, media_data, media_type, created_at")
        .gte("created_at", expiryCutoff)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (statusError) {
        setStatusListMessage("Apply the status tracking migration to enable shared statuses and view counts.");
        return;
      }
      const rows = (data ?? []) as { id: string; owner_id: string; text: string; media_data: string | null; media_type: string | null; created_at: string }[];
      const ownIds = rows.filter((row) => row.owner_id === user.id).map((row) => row.id);
      const viewCounts = new Map<string, number>();
      if (ownIds.length) {
        const { data: views } = await supabase.from("status_update_views").select("status_id").in("status_id", ownIds);
        for (const view of views ?? []) viewCounts.set(view.status_id, (viewCounts.get(view.status_id) ?? 0) + 1);
      }
      if (cancelled) return;
      const toStatus = (row: typeof rows[number]): Status => ({
        id: row.id,
        ownerId: row.owner_id,
        text: row.text,
        createdAt: row.created_at,
        ...(row.media_data ? { mediaData: row.media_data, mediaType: row.media_type ?? undefined } : {}),
        ...(row.owner_id === user.id ? { viewCount: viewCounts.get(row.id) ?? 0 } : {}),
      });
      setStatuses(rows.filter((row) => row.owner_id === user.id).map(toStatus));
      setContactStatuses(rows.filter((row) => row.owner_id !== user.id).map(toStatus));
    };
    void refreshStatuses();
    const expiryTimer = window.setInterval(() => { void refreshStatuses(); }, 60_000);

    function handleStorageChange(event: StorageEvent) {
      if (event.key === SETTINGS_KEY) setIsDarkMode(readDarkMode(event.newValue));
    }
    function handleSettingsChange() {
      setIsDarkMode(readDarkMode());
    }

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("lingo:settings-change", handleSettingsChange);
    return () => {
      cancelled = true;
      window.clearInterval(expiryTimer);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("lingo:settings-change", handleSettingsChange);
    };
  }, []);

  useEffect(() => {
    if (!activeStatus) return;
    const timer = window.setTimeout(() => {
      const nextIndex = activeStatusIndex + 1;
      if (nextIndex < viewingStatuses.length) {
        setActiveStatusIndex(nextIndex);
        setActiveStatus(viewingStatuses[nextIndex]);
      } else {
        setActiveStatus(null);
        setActiveStatusIndex(0);
      }
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [activeStatus, activeStatusIndex, viewingStatuses]);

  useEffect(() => {
    if (activeStatus && !viewingStatuses.some((status) => status.id === activeStatus.id)) {
      setActiveStatus(null);
      setActiveStatusIndex(0);
    }
  }, [activeStatus, viewingStatuses]);

  async function publishStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPublishing) return;

    const text = draft.trim();
    if (!text && !mediaData) {
      setError("Add text or a photo/video before sharing.");
      textareaRef.current?.focus();
      return;
    }

    setIsPublishing(true);
    setError("");
    const nextStatus: Status = {
      id: crypto.randomUUID(),
      text,
      createdAt: new Date().toISOString(),
      ...(mediaData ? { mediaData, mediaType } : {}),
    };

    try {
      if (currentUserId) {
        const { error: publishError } = await createClient().from("status_updates").insert({
          id: nextStatus.id,
          owner_id: currentUserId,
          text: nextStatus.text,
          media_data: nextStatus.mediaData ?? null,
          media_type: nextStatus.mediaType ?? null,
          created_at: nextStatus.createdAt,
        });
        if (publishError) {
          setError(`Couldn’t share status: ${publishError.message}`);
          return;
        }
        setStatuses((current) => sortStatuses([...current, { ...nextStatus, ownerId: currentUserId, viewCount: 0 }]));
      } else {
        const next = sortStatuses([nextStatus, ...readStatuses()]);
        window.localStorage.setItem(STATUS_KEY, JSON.stringify(next));
        setStatuses(next);
      }

      setDraft("");
      setMediaData("");
      setMediaType("");
      
      setIsComposerOpen(false);
    } catch (publishError) {
      setError(publishError instanceof Error
        ? `Couldn’t share status: ${publishError.message}`
        : "Couldn’t share the status. Check your connection and try again.");
    } finally {
      setIsPublishing(false);
    }
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

  function viewOwnStatuses() {
    if (!statuses.length) { setIsComposerOpen(true); return; }
    viewStatus(statuses[0]);
  }

  function openStatuses() {
    if (!statuses.length) {
      setIsComposerOpen(true);
      return;
    }
    setIsStatusListOpen(true);
  }

  function viewStatus(status: Status) {
    const ownerIsSelf = !status.ownerId || status.ownerId === currentUserId;
    const queue = ownerIsSelf ? statuses : contactStatuses;
    const index = queue.findIndex((item) => item.id === status.id);
    if (index < 0) return;
    setIsStatusListOpen(false);
    setViewingStatuses(queue);
    setActiveStatusIndex(index);
    setActiveStatus(status);
    if (!ownerIsSelf && currentUserId) {
      void createClient().from("status_update_views").upsert(
        { status_id: status.id, viewer_id: currentUserId },
        { onConflict: "status_id,viewer_id", ignoreDuplicates: true },
      );
    }
  }

  async function deleteStatusFromList(statusId: string) {
    const nextStatuses = statuses.filter((status) => status.id !== statusId);
    if (currentUserId) {
      const { error: deleteError } = await createClient().from("status_updates").delete().eq("id", statusId).eq("owner_id", currentUserId);
      if (deleteError) {
        setStatusListMessage("Couldn’t delete this status. Try again.");
        return;
      }
    } else {
      window.localStorage.setItem(STATUS_KEY, JSON.stringify(nextStatuses));
    }
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
    if (nextIndex < 0 || nextIndex >= viewingStatuses.length) return;
    setActiveStatusIndex(nextIndex);
    setActiveStatus(viewingStatuses[nextIndex]);
  }

  function navigateStatusByTap(event: React.MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, video, input")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    navigateStatus(event.clientX < bounds.left + bounds.width / 2 ? -1 : 1);
  }

  async function deleteActiveStatus() {
    if (!activeStatus) return;
    const nextStatuses = sortStatuses(statuses.filter((status) => status.id !== activeStatus.id));
    setStatuses(nextStatuses);
    if (currentUserId) await createClient().from("status_updates").delete().eq("id", activeStatus.id).eq("owner_id", currentUserId);
    else window.localStorage.setItem(STATUS_KEY, JSON.stringify(nextStatuses));

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
  return <StatusContainer hidden={hidden} className={`status-page ${embedded ? "status-page-embedded" : ""} ${isDarkMode ? "theme-dark" : ""}`}>
    {!embedded && (<aside className="status-nav" aria-label="Main navigation"><a className="status-brand-mark" href="/chat" aria-label="Home"><Image src="/lingo-logo.jpg" alt="" width={42} height={42} priority /></a><a className="status-nav-link" href="/chat" aria-label="Chats" title="Chats"><NavigationIcon name="chats"/></a><a className="status-nav-link" href="/chat?section=language" aria-label="Language exchange" title="Language exchange"><NavigationIcon name="language"/></a><a className="status-nav-link status-nav-link-active" href="/status" aria-label="Status" title="Status"><NavigationIcon name="status"/></a><a className="status-nav-link" href="/chat?section=community" aria-label="Community" title="Community"><Image className="community-rail-image" src="/community-icon.svg" alt="" width={28} height={28}/></a><a className="status-nav-link" href="/chat?section=call-log" aria-label="Call log" title="Call log"><NavigationIcon name="call-log"/></a><span className="status-nav-spacer"/><a className="status-nav-link" href="/chat?section=settings" aria-label="Settings" title="Settings"><NavigationIcon name="settings"/></a><span className="status-nav-profile">Y</span></aside>)}

    <section className="status-layout">
      <header className="status-heading"><div><span className="status-eyebrow">LITTLE MOMENTS, SHARED</span><h1>Status<span>.</span></h1><p>Share a quick update with your contacts.</p></div></header>
      <div className="status-content">
        <section className="status-list-panel" aria-label="Status updates">
          <div className="status-section-title"><h2>Recent updates</h2><span>{statuses.length + contactStatuses.length}</span></div>
          <button className="my-status-row" onClick={openStatuses}><span className="status-avatar status-avatar-own">{statuses.length ? "Y" : "＋"}</span><span className="status-row-copy"><strong>My status</strong><small>{statuses.length ? `${statuses.length} update${statuses.length === 1 ? "" : "s"} · Tap to view` : "Share a photo or text update"}</small></span>{!statuses.length && <span className="status-row-add">Add</span>}</button>
          {statusListMessage && !isStatusListOpen && <p className="status-list-message" role="status">{statusListMessage}</p>}
          {contactStatuses.map((status) => <button className="status-row" key={status.id} onClick={() => viewStatus(status)}><span className="status-avatar status-avatar-ring">•</span><span className="status-row-copy"><strong>{status.text || (status.mediaType?.startsWith("video/") ? "Contact video status" : "Contact photo status")}</strong><small>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(status.createdAt))}</small></span><span className="status-row-chevron">›</span></button>)}
          <div className="status-divider" />
          {statuses.length ? <button className="status-row" onClick={viewOwnStatuses}><span className="status-avatar status-avatar-ring">Y</span><span className="status-row-copy"><strong>Your updates</strong><small>Tap to view your status updates</small></span><span className="status-row-chevron">›</span></button> : <div className="status-empty-list"><span>✳</span><strong>No recent updates</strong><small>When your contacts share a status, it will appear here.</small></div>}
          <div className="status-privacy-note"><span>⌑</span><p>Status updates disappear after <strong>24 hours</strong> in WhatsApp. This prototype keeps updates in this browser.</p></div>
        </section>
        <section className="status-preview-panel status-add-panel" aria-label="Add a status">
          <button className="status-new-button status-new-button-centered" type="button" onClick={() => setIsComposerOpen(true)}>＋ <span>Add status</span></button>
        </section>
        
      </div>
    </section>
    {isComposerOpen && <div className="status-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setIsComposerOpen(false); setError(""); } }}><section className="status-compose-modal" role="dialog" aria-modal="true" aria-labelledby="status-compose-title"><header><div><span className="status-eyebrow">NEW UPDATE</span><h2 id="status-compose-title">Share a status</h2></div><button onClick={() => { setIsComposerOpen(false); setError(""); }} aria-label="Close">×</button></header><form onSubmit={publishStatus}><label htmlFor="status-text">{mediaData ? "Write a caption" : "What’s on your mind?"}</label><div className="status-textarea-wrap"><textarea ref={textareaRef} id="status-text" autoFocus maxLength={280} placeholder={mediaData ? "Add a caption to your photo or video…" : "Share a little moment…"} value={draft} onChange={(event) => setDraft(event.target.value)} /></div><input ref={mediaInputRef} className="status-media-input" type="file" accept="image/*,video/*" onChange={(event) => chooseMedia(event.target.files?.[0])} /><div className="status-media-actions"><button className="status-emoji-toggle" type="button" onClick={() => mediaInputRef.current?.click()}>＋ Add photo or video</button>{mediaData && <button className="status-media-remove" type="button" onClick={() => { setMediaData(""); setMediaType(""); if (mediaInputRef.current) mediaInputRef.current.value = ""; }}>Remove media</button>}</div>{mediaData && <div className="status-media-preview">{mediaType.startsWith("video/") ? <video src={mediaData} controls /> : <img src={mediaData} alt="Status media preview" />}</div>}<div className="status-compose-meta"><span>{error || (mediaData ? "Your caption will appear with the media" : "Add text, media, or both")}</span><span>{draft.length}/280</span></div><button className="status-publish-button" type="submit" disabled={isPublishing}>{isPublishing ? "Sharing…" : "Share status"}</button></form></section></div>}
    {isStatusListOpen && <div className="status-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setIsStatusListOpen(false); setStatusMenuId(null); } }}><section className="status-list-modal" role="dialog" aria-modal="true" aria-labelledby="status-list-title"><header><div><span className="status-eyebrow">YOUR UPDATES</span><h2 id="status-list-title">My status</h2></div><button type="button" aria-label="Close status list" onClick={() => { setIsStatusListOpen(false); setStatusMenuId(null); }}>×</button></header>{statusListMessage && <p className="status-list-message" role="status">{statusListMessage}</p>}<div className="status-list-items">{[...statuses].reverse().map((status) => <div className="status-list-item-wrap" key={status.id}><button className="status-list-item" type="button" onClick={() => viewStatus(status)}>{status.mediaData ? status.mediaType?.startsWith("video/") ? <video src={status.mediaData} muted /> : <img src={status.mediaData} alt="" /> : <span className="status-list-text-preview">{status.text || "Text status"}</span>}<span className="status-list-item-copy"><strong>{status.text || (status.mediaType?.startsWith("video/") ? "Video status" : "Photo status")}</strong><small>{status.viewCount ?? 0} {status.viewCount === 1 ? "view" : "views"} · {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(status.createdAt))}</small></span></button><button className="status-list-menu-trigger" type="button" aria-label={`More options for status posted ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(status.createdAt))}`} aria-expanded={statusMenuId === status.id} onClick={() => setStatusMenuId((current) => current === status.id ? null : status.id)}><span/><span/><span/></button>{statusMenuId === status.id && <div className="status-list-action-menu" role="menu"><button type="button" role="menuitem" onClick={() => void deleteStatusFromList(status.id)}>Delete</button><button type="button" role="menuitem" onClick={() => void shareStatusFromList(status, "forward")}>Forward</button><button type="button" role="menuitem" onClick={() => void shareStatusFromList(status, "share")}>Share</button></div>}</div>)}</div></section></div>}
    {activeStatus && <div className="status-modal-backdrop" onClick={() => setActiveStatus(null)}><section className={`status-viewer ${activeStatus.mediaData && !activeStatus.mediaType?.startsWith("video/") ? "status-viewer-has-image" : ""}`} role="dialog" aria-modal="true" aria-label="Status update" onClick={(event) => event.stopPropagation()} onPointerUp={navigateStatusByTap}><div className="status-viewer-progress"><i key={activeStatus.id}/></div><header><span className="status-avatar status-viewer-avatar">Y</span><span><strong>{activeStatus.ownerId && activeStatus.ownerId !== currentUserId ? "Contact" : "You"}</strong><small>{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(activeStatus.createdAt))} · {activeStatusIndex + 1} of {viewingStatuses.length}</small></span><button className="status-viewer-dismiss" type="button" aria-label="Close status" title="Close status" onPointerUp={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setActiveStatus(null); }}>×</button></header>{activeStatus.mediaData && (activeStatus.mediaType?.startsWith("video/") ? <video className="status-viewer-media" src={activeStatus.mediaData} controls autoPlay /> : <img className="status-viewer-media status-viewer-image" src={activeStatus.mediaData} alt="Status" />)}{activeStatus.text && <p>{activeStatus.text}</p>}</section></div>}
  </StatusContainer>;
}
