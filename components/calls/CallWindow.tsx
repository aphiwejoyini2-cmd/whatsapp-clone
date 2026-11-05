"use client";

import useWebRTC from "@/hooks/useWebRTC";

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
        if (overlay && event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="call-window-card"
      >
        <header className="call-window-heading">
          {overlay ? <button type="button" onClick={() => { if (isCalling) endCall(); onClose?.(); }}>Cancel</button> : <span />}
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
            onClick={startCall}
            aria-label="Start voice call"
            title="Start voice call"
          >
            ☎
          </button>
        ) : (
          <button
            className="call-window-action call-window-action-end"
            onClick={endCall}
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
