"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { console } from "inspector";

export default function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ phone: phone.trim(), password });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    const requestedDestination = new URLSearchParams(window.location.search).get("next");
    const destination = requestedDestination?.startsWith("/") && !requestedDestination.startsWith("//")
      ? requestedDestination
      : "/messages";
    router.replace(destination);
    //console.log
    router.refresh();
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <header className="auth-heading">
          <Link href="/" className="auth-heading-link">Back</Link>
          <div className="auth-heading-brand"><span className="auth-logo" aria-hidden="true">💬</span><h1>Log in</h1></div>
          <span className="auth-heading-note">Welcome back</span>
        </header>
        <div className="auth-content">
        <p className="auth-subtitle">Sign in with your verified phone number.</p>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="phone">Mobile number</label>
            <input id="phone" type="tel" autoComplete="tel" placeholder="+27821234567" value={phone}
              onChange={(event) => setPhone(event.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password}
              onChange={(event) => setPassword(event.target.value)} required />
          </div>
          {error && <div className="auth-message auth-error" role="alert">{error}</div>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="auth-footer">New here? <Link href="/signup">Create an account</Link></p>
        </div>
      </div>
    </main>
  );
}
