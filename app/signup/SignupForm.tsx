"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const normalizedPhone = phone.trim().replace(/[\s()-]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setError("Enter a phone number in international format, for example +27821234567.");
      return;
    }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Use a password with at least 8 characters."); return; }

    setLoading(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { phone_e164: normalizedPhone } },
    });
    setLoading(false);
    if (signUpError) { setError(signUpError.message); return; }
    if (data.session) {
      router.replace("/messages");
      router.refresh();
    } else {
      setMessage("Account created. Check your email if Supabase asks you to confirm it, then log in. No SMS was sent.");
    }
  }

  return <main className="auth-page">
    <div className="auth-card">
      <header className="auth-heading">
        <Link href="/login" className="auth-heading-link">Log in</Link>
        <div className="auth-heading-brand"><span className="auth-logo" aria-hidden="true">💬</span><h1>Create account</h1></div>
        <span className="auth-heading-note">WhatsApp Clone</span>
      </header>
      <div className="auth-content">
        <p className="auth-subtitle">Use email and password to create an account. Your phone number is only used to find you in chats.</p>
        <form onSubmit={handleSignup} className="auth-form">
          <div className="form-group"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
          <div className="form-group"><label htmlFor="phone">Phone number for messaging</label><input id="phone" type="tel" autoComplete="tel" placeholder="+27821234567" value={phone} onChange={(event) => setPhone(event.target.value)} required /><small className="auth-field-hint">This number is not verified and no SMS is sent.</small></div>
          <div className="form-group"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></div>
          <div className="form-group"><label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div>
          {error && <div className="auth-message auth-error" role="alert">{error}</div>}
          {message && <div className="auth-message auth-success" role="status">{message}</div>}
          <button type="submit" className="auth-submit" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
        </form>
        <p className="auth-footer">Already have an account? <Link href="/login">Log in</Link></p>
      </div>
    </div>
  </main>;
}
