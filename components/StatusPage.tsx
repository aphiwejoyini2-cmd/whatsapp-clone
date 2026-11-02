"use client";

import { useEffect, useState } from "react";

const STATUS_KEY = "lingo:statuses:v1";
type Status = { id: string; text: string; createdAt: string };

function readStatuses(): Status[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STATUS_KEY) ?? "[]");
    return Array.isArray(value) ? value as Status[] : [];
  } catch {
    return [];
  }
}

export default function StatusPage() {
  const [statuses, setStatuses] = useState<Status[]>(() => typeof window === "undefined" ? [] : readStatuses());
  const [draft, setDraft] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState<Status | null>(null);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  const [error, setError] = useState("");

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

  function publishStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const next = [{ id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }, ...statuses];
    setStatuses(next);
    window.localStorage.setItem(STATUS_KEY, JSON.stringify(next));
    setDraft("");
    setError("");
    setIsComposerOpen(false);
  }

  function openStatuses() {
    if (!statuses.length) {
      setIsComposerOpen(true);
      return;
    }
    setActiveStatusIndex(0);
    setActiveStatus(statuses[0]);
  }

  return <main className="status-page">
    <aside className="status-nav" aria-label="Main navigation"><a className="status-brand-mark" href="/" aria-label="Home">L</a><a className="status-nav-link" href="/" aria-label="Chats" title="Chats">▤</a><a className="status-nav-link" href="/?section=language" aria-label="Language exchange" title="Language exchange">文</a><a className="status-nav-link status-nav-link-active" href="/status" aria-label="Status" title="Status">◉</a><span className="status-nav-spacer"/><a className="status-nav-link" href="/?section=settings" aria-label="Settings" title="Settings">⚙</a><span className="status-nav-profile">Y</span></aside>
    <section className="status-layout">
      <header className="status-heading"><div><span className="status-eyebrow">LITTLE MOMENTS, SHARED</span><h1>Status<span>.</span></h1><p>Share a quick update with your contacts.</p></div><button className="status-new-button" onClick={() => setIsComposerOpen(true)}>＋ <span>New status</span></button></header>
      <div className="status-content">
        <section className="status-list-panel" aria-label="Status updates">
          <div className="status-section-title"><h2>Recent updates</h2><span>{statuses.length}</span></div>
          <button className="my-status-row" onClick={openStatuses}><span className="status-avatar status-avatar-own">{statuses.length ? "Y" : "＋"}</span><span className="status-row-copy"><strong>My status</strong><small>{statuses.length ? `${statuses.length} update${statuses.length === 1 ? "" : "s"} · Tap to view` : "Share a photo or text update"}</small></span><span className="status-row-add">{statuses.length ? "View" : "Add"}</span></button>
          <div className="status-divider" />
          {statuses.length ? <button className="status-row" onClick={openStatuses}><span className="status-avatar status-avatar-ring">Y</span><span className="status-row-copy"><strong>Your updates</strong><small>{statuses.length} status{statuses.length === 1 ? "" : "es"} in your folder</small></span><span className="status-row-chevron">›</span></button> : <div className="status-empty-list"><span>✳</span><strong>No recent updates</strong><small>When your contacts share a status, it will appear here.</small></div>}
          <div className="status-privacy-note"><span>⌑</span><p>Status updates disappear after <strong>24 hours</strong> in WhatsApp. This prototype keeps updates in this browser.</p></div>
        </section>
        
      </div>
    </section>
    {isComposerOpen && <div className="status-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setIsComposerOpen(false); setError(""); } }}><section className="status-compose-modal" role="dialog" aria-modal="true" aria-labelledby="status-compose-title"><header><div><span className="status-eyebrow">NEW UPDATE</span><h2 id="status-compose-title">Share a status</h2></div><button onClick={() => { setIsComposerOpen(false); setError(""); }} aria-label="Close">×</button></header><form onSubmit={publishStatus}><label htmlFor="status-text">What’s on your mind?</label><textarea id="status-text" autoFocus maxLength={280} placeholder="Share a little moment…" value={draft} onChange={(event) => setDraft(event.target.value)} /><div className="status-compose-meta"><span>{error || "Text updates only for now"}</span><span>{draft.length}/280</span></div><button className="status-publish-button" disabled={!draft.trim()}>Share status</button></form></section></div>}
    {activeStatus && <div className="status-modal-backdrop" onClick={() => setActiveStatus(null)}><section className="status-viewer" role="dialog" aria-modal="true" aria-label="Status update" onClick={(event) => event.stopPropagation()}><div className="status-viewer-progress"><i key={activeStatus.id}/></div><header><span className="status-avatar status-viewer-avatar">Y</span><span><strong>You</strong><small>{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(activeStatus.createdAt))}</small></span><button onClick={() => setActiveStatus(null)} aria-label="Close status">×</button></header><p>{activeStatus.text}</p><button className="status-viewer-close" onClick={() => setActiveStatus(null)}>Close</button></section></div>}
  </main>;
}
