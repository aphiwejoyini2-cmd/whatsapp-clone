import Link from "next/link";
import PhoneMessages from "./PhoneMessages";

export default function MessagesPage() {
  return <main style={{ maxWidth: 920, margin: "32px auto", padding: 20, fontFamily: "Arial, sans-serif" }}>
    <Link href="/">← Back to the clone</Link>
    <h1>Messages</h1>
    <p>Start a one-to-one chat with another account using its unverified phone identifier. Messages are saved in Supabase and delivered through Realtime.</p>
    <PhoneMessages />
  </main>;
}
