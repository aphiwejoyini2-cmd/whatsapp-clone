"use client";

import { useRef, useState } from "react";

export default function useWebRTC() {
  const [isCalling, setIsCalling] = useState(false);
  const [error, setError] = useState("");

  // Stores the user's microphone stream
  const localStream = useRef<MediaStream | null>(null);

  // Stores the WebRTC connection
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  // Start microphone
  async function startCall() {
    try {
      setError("");

      // Request microphone permission
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

      localStream.current = stream;

      // Create WebRTC connection
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
      });

      // Add microphone tracks to the connection
      stream.getTracks().forEach((track) => {
        peerConnection.current?.addTrack(track, stream);
      });

      setIsCalling(true);
      return true;

    } catch (err) {
      console.error("Microphone error:", err);

      setError(
        "Unable to access your microphone. Please check your browser permissions."
      );
      return false;
    }
  }

  // End call and release microphone
  function endCall() {
    localStream.current?.getTracks().forEach((track) => {
      track.stop();
    });

    peerConnection.current?.close();

    localStream.current = null;
    peerConnection.current = null;

    setIsCalling(false);
  }

  return {
    isCalling,
    error,
    startCall,
    endCall,
  };
}
