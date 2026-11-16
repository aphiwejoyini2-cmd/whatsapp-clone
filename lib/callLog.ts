export type CallLogEntry = {
  id: string;
  contactName: string;
  type: "voice" | "video";
  direction: "outgoing" | "incoming";
  status: "ended" | "failed" | "missed";
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
};

const CALL_LOG_KEY = "lingo:call-log:v1";

export function readCallLog(): CallLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(CALL_LOG_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed as CallLogEntry[] : [];
  } catch {
    return [];
  }
}

export function addCallLog(entry: CallLogEntry) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CALL_LOG_KEY, JSON.stringify([entry, ...readCallLog()]));
  } catch {
    // Keep call controls usable if local storage is unavailable.
  }
}
