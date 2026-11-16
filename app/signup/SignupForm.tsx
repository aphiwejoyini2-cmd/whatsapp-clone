"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidUsername, normalizeUsername, usernameAuthEmail } from "@/lib/auth/username";

export default function SignupForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedPhone = phone.trim().replace(/[\s()-]/g, "");
    const normalizedUsername = normalizeUsername(username);
    if (!isValidUsername(normalizedUsername)) {
      setError("Username must be 3–30 characters using letters, numbers, dots, or underscores. Start and end with a letter or number; do not use consecutive dots.");
      return;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setError("Enter the contact number in international format, for example +27821234567.");
      return;
    }
    if (password.length < 8) { setError("Use a password with at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normalizedUsername, phone: normalizedPhone, password }),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Could not create your account."); return; }

      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: usernameAuthEmail(normalizedUsername),
        password,
      });
      if (loginError) { setError(`Account created. Log in with your username and password: ${loginError.message}`); return; }
      router.replace("/chat");
      router.refresh();
    } catch {
      setError("Could not create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <header className="auth-heading">
          <Link href="/login" className="auth-heading-link">Log in</Link>
          <div className="auth-heading-brand"><span className="auth-logo" aria-hidden="true">💬</span><h1>Create account</h1></div>
          <span className="auth-heading-note">WhatsApp Clone</span>
        </header>
        <div className="auth-content">
          <p className="auth-subtitle">Create an account with a username, password, and contact number. No SMS verification is used.</p>
          <form onSubmit={handleSignup} className="auth-form">
            <div className="form-group"><label htmlFor="username">Username</label><input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="yourname" minLength={3} maxLength={30} required /></div>
            <div className="form-group"><label htmlFor="phone">Contact number</label><input id="phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+27821234567" required /><small className="auth-field-hint">Other registered accounts can use this number to find you and start a chat.</small></div>
            <div className="form-group"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></div>
            <div className="form-group"><label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div>
            {error && <div className="auth-message auth-error" role="alert">{error}</div>}
            <button type="submit" className="auth-submit" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
          </form>
          <p className="auth-footer">Already have an account? <Link href="/login">Log in</Link></p>
        </div>
      </div>
    </main>
  );
}
