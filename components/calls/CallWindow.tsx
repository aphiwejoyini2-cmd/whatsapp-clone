"use client";

import { useRef } from "react";
import useWebRTC from "@/hooks/useWebRTC";
import { addCallLog } from "@/lib/callLog";

type CallWindowProps = {
  overlay?: boolean;
  contactName?: string;
  callType?: "voice" | "video";
  onClose?: () => void;
};

export default function CallWindow({
  overlay = false,
  contactName = "John",
  callType = "voice",
  onClose,
}: CallWindowProps) {
  const {
    isCalling,
    error,
    startCall,
    endCall,
  } = useWebRTC();
  const callStartedAt = useRef<string | null>(null);

  async function handleStartCall() {
    const startedAt = new Date().toISOString();
    const started = await startCall();
    if (started) {
      callStartedAt.current = startedAt;
      return;
    }
    addCallLog({ id: crypto.randomUUID(), contactName, type: callType, direction: "outgoing", status: "failed", startedAt, endedAt: new Date().toISOString(), durationSeconds: 0 });
  }

  function handleEndCall() {
    const startedAt = callStartedAt.current;
    if (startedAt) {
      const endedAt = new Date();
      addCallLog({ id: crypto.randomUUID(), contactName, type: callType, direction: "outgoing", status: "ended", startedAt, endedAt: endedAt.toISOString(), durationSeconds: Math.max(0, Math.floor((endedAt.getTime() - new Date(startedAt).getTime()) / 1000)) });
      callStartedAt.current = null;
    }
    endCall();
  }

  function closeCallWindow() {
    if (isCalling) handleEndCall();
    onClose?.();
  }

  return (
    <main
      className={overlay ? "call-overlay" : undefined}
      style={{
        position: overlay ? "fixed" : undefined,
        inset: overlay ? 0 : undefined,
        zIndex: overlay ? 50 : undefined,
        minHeight: overlay ? "100dvh" : "100vh",
        backgroundColor: overlay ? "rgba(18, 28, 21, 0.48)" : "#075e54",
        backdropFilter: overlay ? "blur(2px)" : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onMouseDown={(event) => {
        if (overlay && event.target === event.currentTarget) closeCallWindow();
      }}
    >
      <div
        className="call-window-card"
      >
        <header className="call-window-heading">
          {overlay ? <button type="button" onClick={closeCallWindow}>Cancel</button> : <span />}
          <h1>{callType === "video" ? "Video call" : "Voice call"}</h1>
          <span className="call-window-ready">{isCalling ? "Active" : "Ready"}</span>
        </header>
        <div className="call-window-content">
          <span className="call-window-avatar">{contactName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
          <h2>{contactName}</h2>
          <p>{isCalling ? "Microphone is active" : "Ready to make a call"}</p>

        {error && (
          <p className="call-window-error">
            {error}
          </p>
        )}

        {!isCalling ? (
          <button
            className="call-window-action"
            onClick={() => void handleStartCall()}
            aria-label="Start voice call"
            title="Start voice call"
          >
            ☎
          </button>
        ) : (
          <button
            className="call-window-action call-window-action-end"
            onClick={handleEndCall}
            aria-label="End call"
            title="End call"
          >
            ☎
          </button>
        )}
        <small className="call-window-hint">{isCalling ? "Tap the red button to end" : "Start a call with this contact"}</small>
        </div>
      </div>
    </main>
  );
}
