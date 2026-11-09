"use client";

import { useEffect, useMemo, useState } from "react";
import { readCallLog, type CallLogEntry } from "@/lib/callLog";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export default function CallLogPage() {
  const [calls, setCalls] = useState<CallLogEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "failed">("all");

  useEffect(() => setCalls(readCallLog()), []);

  const visibleCalls = useMemo(
    () => filter === "all" ? calls : calls.filter((call) => call.status === "failed"),
    [calls, filter],
  );

  return (
    <section className="call-log-section">
      <header className="call-log-heading"><div><span className="eyebrow">YOUR RECENT CALLS</span><h1>Call log<span className="heading-period">.</span></h1><p>Review your voice and video call history.</p></div><span className="call-log-total">{calls.length.toString().padStart(2, "0")} calls</span></header>
      <div className="call-log-panel">
        <div className="call-log-toolbar"><div><strong>All call history</strong><span>{visibleCalls.length}</span></div><div className="call-log-filters"><button className={filter === "all" ? "call-log-filter-active" : ""} onClick={() => setFilter("all")}>All</button><button className={filter === "failed" ? "call-log-filter-active" : ""} onClick={() => setFilter("failed")}>Unsuccessful</button></div></div>
        {visibleCalls.length ? <div className="call-log-list">{visibleCalls.map((call) => <article className="call-log-entry" key={call.id}>
          <span className="call-log-avatar">{initials(call.contactName)}</span>
          <div className="call-log-copy"><strong>{call.contactName}</strong><span className={call.status === "failed" ? "call-log-failed" : ""}><span aria-hidden="true">{call.direction === "outgoing" ? "↗" : "↙"}</span> {call.status === "failed" ? "Unsuccessful" : "Outgoing"} {call.type} call</span></div>
          <div className="call-log-meta"><time dateTime={call.startedAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(call.startedAt))}</time><small>{call.status === "ended" ? duration(call.durationSeconds) : "No connection"}</small></div>
          <span className="call-log-type" aria-label={`${call.type} call`}>{call.type === "video" ? "▣" : "☎"}</span>
        </article>)}</div> : <div className="call-log-empty"><span className="call-log-empty-icon">◷</span><h2>{calls.length ? "No unsuccessful calls" : "No calls yet"}</h2><p>{calls.length ? "Your completed calls will appear when you switch to All." : "Calls you start will show up here with their time and duration."}</p></div>}
      </div>
    </section>
  );
}
