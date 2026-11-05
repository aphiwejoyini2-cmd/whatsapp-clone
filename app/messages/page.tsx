import Link from "next/link";
import PhoneMessages from "./PhoneMessages";

export default function MessagesPage() {
  return <main style={{ maxWidth: 920, margin: "32px auto", padding: 20, fontFamily: "Arial, sans-serif" }}>
    <Link href="/">← Back to the clone</Link>
    <h1>Email messaging</h1>
    <p>Sign in with a confirmed email, find another account by email, and exchange messages through Supabase. SMS is not required.</p>
    <PhoneMessages />
  </main>;
}
