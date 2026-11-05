"use client";

import { useEffect, useState } from "react";
import { getOrCreateDeviceKeys, getPublicDeviceBundle } from "@/lib/crypto/device-keys";

type Device = { device_id: string; updated_at: string };

export default function DevicesClient() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function refreshDevices() {
    const response = await fetch("/api/devices", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load devices.");
    setDevices(result.devices ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshDevices().catch((error: unknown) => setNotice(error instanceof Error ? error.message : "Could not load devices."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function registerDevice() {
    setBusy(true);
    setNotice("");
    try {
      const keys = await getOrCreateDeviceKeys();
      const bundle = await getPublicDeviceBundle(keys);
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bundle),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Device registration failed.");
      setNotice(`Registered this browser and uploaded ${result.uploadedPrekeys} public one-time prekeys.`);
      await refreshDevices();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Device registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return <section>
    <button type="button" onClick={registerDevice} disabled={busy} style={{ padding: "11px 16px", cursor: busy ? "wait" : "pointer" }}>
      {busy ? "Registering…" : "Register this browser"}
    </button>
    {notice && <p role="status">{notice}</p>}
    <h2>Your registered devices</h2>
    {devices.length ? <ul>{devices.map((device) => <li key={device.device_id}>
      <code>{device.device_id}</code> · updated {new Date(device.updated_at).toLocaleString()}
    </li>)}</ul> : <p>No devices registered yet.</p>}
    <p style={{ color: "#8a5b00" }}>Private keys stay in this browser. The current messaging demo uses a custom ECDH/AES-GCM construction; it is not Signal Protocol and is not ready for sensitive production use.</p>
  </section>;
}
