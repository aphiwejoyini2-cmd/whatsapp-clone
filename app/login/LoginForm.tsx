"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidUsername, normalizeUsername, usernameAuthEmail } from "@/lib/auth/username";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const normalizedUsername = normalizeUsername(username);
    if (!isValidUsername(normalizedUsername)) {
      setLoading(false);
      setError("Enter a valid username (3–30 characters, starting and ending with a letter or number).");
      return;
    }
    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: usernameAuthEmail(normalizedUsername),
      password,
    });
    setLoading(false);
    if (loginError) { setError(loginError.message); return; }
    const requestedDestination = new URLSearchParams(window.location.search).get("next");
    const destination = requestedDestination?.startsWith("/") && !requestedDestination.startsWith("//") ? requestedDestination : "/chat";
    router.replace(destination);
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
          <p className="auth-subtitle">Log in with the username and password you used to register.</p>
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input id="username" autoComplete="username" placeholder="yourname" value={username}
                onChange={(event) => setUsername(event.target.value)} required />
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
