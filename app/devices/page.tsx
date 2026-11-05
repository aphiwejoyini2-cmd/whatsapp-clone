import Link from "next/link";
import DevicesClient from "./DevicesClient";

export default function DevicesPage() {
  return <main style={{ maxWidth: 760, margin: "48px auto", padding: 24, fontFamily: "Arial, sans-serif" }}>
    <Link href="/">← Back to chats</Link>
    <h1>Messaging devices</h1>
    <p>Register this browser as a device. Private keys stay in this browser’s IndexedDB; only public keys are uploaded.</p>
    <DevicesClient />
  </main>;
}
