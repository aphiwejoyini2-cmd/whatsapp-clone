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
  const [filter, setFilter] = useState<"all" | "outgoing" | "incoming" | "missed" | "failed">("all");

  useEffect(() => setCalls(readCallLog()), []);

  const visibleCalls = useMemo(() => {
    if (filter === "all") return calls;
    if (filter === "outgoing" || filter === "incoming") return calls.filter((call) => call.direction === filter);
    if (filter === "missed") return calls.filter((call) => call.status === "missed");
    return calls.filter((call) => call.status === "failed");
  }, [calls, filter]);

  const filterLabels = { all: "All", outgoing: "Outgoing", incoming: "Incoming", missed: "Missed", failed: "Unsuccessful" } as const;

  return (
    <section className="call-log-section">
      <header className="call-log-heading"><div><span className="eyebrow">YOUR RECENT CALLS</span><h1>Call log<span className="heading-period">.</span></h1><p>Review your voice and video call history.</p></div><span className="call-log-total">{calls.length.toString().padStart(2, "0")} calls</span></header>
      <div className="call-log-panel">
        <div className="call-log-toolbar"><div><strong>{filter === "all" ? "All call history" : `${filterLabels[filter]} calls`}</strong><span>{visibleCalls.length}</span></div><div className="call-log-filters" role="group" aria-label="Filter calls">{(Object.keys(filterLabels) as (keyof typeof filterLabels)[]).map((key) => <button key={key} aria-pressed={filter === key} className={filter === key ? "call-log-filter-active" : ""} onClick={() => setFilter(key)}>{filterLabels[key]}</button>)}</div></div>
        {visibleCalls.length ? <div className="call-log-list">{visibleCalls.map((call) => <article className="call-log-entry" key={call.id}>
          <span className="call-log-avatar">{initials(call.contactName)}</span>
          <div className="call-log-copy"><strong>{call.contactName}</strong><span className={call.status !== "ended" ? "call-log-failed" : ""}><span aria-hidden="true">{call.direction === "outgoing" ? "↗" : "↙"}</span> {call.status === "failed" ? "Unsuccessful" : call.status === "missed" ? "Missed" : call.direction === "outgoing" ? "Outgoing" : "Incoming"} {call.type} call</span></div>
          <div className="call-log-meta"><time dateTime={call.startedAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(call.startedAt))}</time><small>{call.status === "ended" ? duration(call.durationSeconds) : call.status === "missed" ? "Missed call" : "No connection"}</small></div>
          <span className="call-log-type" aria-label={`${call.type} call`}>{call.type === "video" ? "▣" : "☎"}</span>
        </article>)}</div> : <div className="call-log-empty"><span className="call-log-empty-icon">◷</span><h2>{calls.length ? `No ${filterLabels[filter].toLowerCase()} calls` : "No calls yet"}</h2><p>{calls.length ? "Calls matching this filter will appear here." : "Calls you start will show up here with their time and duration."}</p></div>}
      </div>
    </section>
  );
}
